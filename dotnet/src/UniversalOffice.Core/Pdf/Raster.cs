using System.Buffers.Binary;
using System.IO.Compression;

namespace UniversalOffice.Pdf;

/// <summary>PNG decodificado para RGBA cru.</summary>
public sealed class DecodedPng
{
    public int Width;
    public int Height;
    /// <summary>Pixels RGBA (4 bytes por pixel, linha a linha).</summary>
    public byte[] Rgba = [];
}

/// <summary>
/// Decodificação mínima de rasters para o export PDF — porta de
/// slides/packages/slides-core/src/export/raster.ts:
/// - DecodePng: PNG → RGBA cru (inflate dos IDAT + unfilter das scanlines).
///   Suporta bit depth 8 nos color types 0/2/3(+tRNS)/4/6, sem entrelaçamento
///   (Adam7 → null, vira placeholder no PDF).
/// - JpegSize: varre os marcadores SOFn de um JPEG para largura/altura
///   (o JPEG em si embute direto via DCTDecode).
/// </summary>
public static class Raster
{
    private static readonly byte[] PngSig = { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a };

    /// <summary>Decodifica um PNG para RGBA. null quando o formato não é suportado.</summary>
    public static DecodedPng? DecodePng(byte[] bytes)
    {
        if (bytes.Length < 8 || !bytes.AsSpan(0, 8).SequenceEqual(PngSig)) return null;

        int width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
        (int Off, int Len)? palette = null;
        (int Off, int Len)? trns = null;
        var idat = new List<(int Off, int Len)>();

        int p = 8;
        while (p + 8 <= bytes.Length)
        {
            // length é uint no formato: um valor > int.MaxValue viraria negativo
            // no cast e travaria o loop (p nunca avança) — guarda explícita
            uint lenU = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(p));
            if (lenU > int.MaxValue - 12) return null;
            int len = (int)lenU;
            int dataStart = p + 8;
            if (dataStart + len > bytes.Length) return null;
            string type = $"{(char)bytes[p + 4]}{(char)bytes[p + 5]}{(char)bytes[p + 6]}{(char)bytes[p + 7]}";
            if (type == "IHDR")
            {
                width = (int)BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(dataStart));
                height = (int)BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(dataStart + 4));
                bitDepth = bytes[dataStart + 8];
                colorType = bytes[dataStart + 9];
                interlace = bytes[dataStart + 12];
            }
            else if (type == "PLTE") palette = (dataStart, len);
            else if (type == "tRNS") trns = (dataStart, len);
            else if (type == "IDAT") idat.Add((dataStart, len));
            else if (type == "IEND") break;
            p = dataStart + len + 4; // pula CRC
        }
        if (width == 0 || height == 0 || interlace != 0 || bitDepth != 8) return null;

        // canais por color type (8 bits cada)
        int channels = colorType switch { 0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4, _ => 0 };
        if (channels == 0) return null;
        if (colorType == 3 && palette is null) return null;

        // concatena IDAT e inflate (IDAT é zlib, RFC 1950)
        byte[] raw;
        try
        {
            int total = idat.Sum(c => c.Len);
            var zdata = new byte[total];
            int off = 0;
            foreach (var (o, l) in idat) { Buffer.BlockCopy(bytes, o, zdata, off, l); off += l; }
            raw = PdfWriter.Unzlib(zdata);
        }
        catch { return null; }

        int bpp = channels; // bytes por pixel (bit depth 8)
        int stride = width * bpp;
        if (raw.Length < (stride + 1) * height) return null;

        // unfilter das scanlines (filtros 0..4 do PNG) — loops especializados
        // por filtro (hot path: era o gargalo do PptxToPdf com decks de imagem)
        var img = new byte[stride * height];
        for (int y = 0; y < height; y++)
        {
            byte filter = raw[y * (stride + 1)];
            int src = y * (stride + 1) + 1;
            int dst = y * stride;
            int prev = dst - stride;
            switch (filter)
            {
                case 0:
                    Buffer.BlockCopy(raw, src, img, dst, stride);
                    break;
                case 1: // Sub
                {
                    int n = Math.Min(bpp, stride);
                    Buffer.BlockCopy(raw, src, img, dst, n);
                    for (int x = bpp; x < stride; x++)
                        img[dst + x] = (byte)(raw[src + x] + img[dst + x - bpp]);
                    break;
                }
                case 2: // Up
                    if (y == 0) Buffer.BlockCopy(raw, src, img, dst, stride);
                    else
                        for (int x = 0; x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + img[prev + x]);
                    break;
                case 3: // Average
                    if (y == 0)
                    {
                        for (int x = 0; x < bpp && x < stride; x++) img[dst + x] = raw[src + x];
                        for (int x = bpp; x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + (img[dst + x - bpp] >> 1));
                    }
                    else
                    {
                        for (int x = 0; x < bpp && x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + (img[prev + x] >> 1));
                        for (int x = bpp; x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + ((img[dst + x - bpp] + img[prev + x]) >> 1));
                    }
                    break;
                case 4: // Paeth
                    if (y == 0)
                    {
                        for (int x = 0; x < bpp && x < stride; x++) img[dst + x] = raw[src + x];
                        for (int x = bpp; x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + img[dst + x - bpp]); // b=c=0 → predictor = a
                    }
                    else
                    {
                        for (int x = 0; x < bpp && x < stride; x++)
                            img[dst + x] = (byte)(raw[src + x] + img[prev + x]); // a=c=0 → predictor = b
                        for (int x = bpp; x < stride; x++)
                        {
                            int a = img[dst + x - bpp];
                            int b = img[prev + x];
                            int c = img[prev + x - bpp];
                            int pp = a + b - c;
                            int pa = Math.Abs(pp - a), pb = Math.Abs(pp - b), pc = Math.Abs(pp - c);
                            img[dst + x] = (byte)(raw[src + x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c));
                        }
                    }
                    break;
                default: return null;
            }
        }

        // expande para RGBA
        var rgba = new byte[width * height * 4];
        for (int i = 0, o = 0; i < width * height; i++, o += 4)
        {
            int s = i * bpp;
            switch (colorType)
            {
                case 0:
                {
                    byte g = img[s];
                    rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = 255;
                    break;
                }
                case 2:
                    rgba[o] = img[s]; rgba[o + 1] = img[s + 1]; rgba[o + 2] = img[s + 2]; rgba[o + 3] = 255;
                    break;
                case 3:
                {
                    int idx = img[s];
                    var (po, pl) = palette!.Value;
                    rgba[o] = idx * 3 < pl ? bytes[po + idx * 3] : (byte)0;
                    rgba[o + 1] = idx * 3 + 1 < pl ? bytes[po + idx * 3 + 1] : (byte)0;
                    rgba[o + 2] = idx * 3 + 2 < pl ? bytes[po + idx * 3 + 2] : (byte)0;
                    rgba[o + 3] = trns is { } t ? (idx < t.Len ? bytes[t.Off + idx] : (byte)255) : (byte)255;
                    break;
                }
                case 4:
                {
                    byte g = img[s];
                    rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = img[s + 1];
                    break;
                }
                default:
                    rgba[o] = img[s]; rgba[o + 1] = img[s + 1]; rgba[o + 2] = img[s + 2]; rgba[o + 3] = img[s + 3];
                    break;
            }
        }
        return new DecodedPng { Width = width, Height = height, Rgba = rgba };
    }

    /// <summary>Largura/altura de um JPEG (marcadores SOF0..SOF15, exceto DHT/JPG/DAC).</summary>
    public static (int Width, int Height)? JpegSize(byte[] bytes)
    {
        if (bytes.Length < 4 || bytes[0] != 0xff || bytes[1] != 0xd8) return null;
        int p = 2;
        while (p + 4 <= bytes.Length)
        {
            if (bytes[p] != 0xff) { p++; continue; }
            byte marker = bytes[p + 1];
            if (marker == 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { p += 2; continue; }
            int len = BinaryPrimitives.ReadUInt16BigEndian(bytes.AsSpan(p + 2));
            // SOF0..SOF15 exceto DHT (C4), JPG (C8) e DAC (CC)
            if (marker >= 0xc0 && marker <= 0xcf && marker != 0xc4 && marker != 0xc8 && marker != 0xcc)
            {
                if (p + 9 > bytes.Length) return null;
                return (BinaryPrimitives.ReadUInt16BigEndian(bytes.AsSpan(p + 7)),
                        BinaryPrimitives.ReadUInt16BigEndian(bytes.AsSpan(p + 5)));
            }
            p += 2 + len;
        }
        return null;
    }
}
