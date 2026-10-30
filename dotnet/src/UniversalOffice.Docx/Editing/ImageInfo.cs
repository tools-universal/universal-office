using System.Buffers.Binary;

namespace UniversalOffice.Docx.Editing;

/// <summary>Formato, tamanho em pixels e resolução lidos do cabeçalho da imagem (sem decodificar).</summary>
public sealed record ImageInfo(string Extension, string ContentType, int WidthPx, int HeightPx, double DpiX, double DpiY)
{
    /// <summary>Largura física em EMU (pela resolução da imagem; 96 dpi quando ela não diz).</summary>
    public long WidthEmu => (long)Math.Round(WidthPx * 914400.0 / DpiX);

    /// <summary>Altura física em EMU.</summary>
    public long HeightEmu => (long)Math.Round(HeightPx * 914400.0 / DpiY);

    /// <summary>PNG, JPEG, GIF ou BMP; null para outro formato ou cabeçalho inválido.</summary>
    public static ImageInfo? TryRead(ReadOnlySpan<byte> data)
    {
        try
        {
            if (data.Length >= 24 && data[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return Png(data);
            if (data.Length >= 4 && data[0] == 0xFF && data[1] == 0xD8) return Jpeg(data);
            if (data.Length >= 10 && data[0] == (byte)'G' && data[1] == (byte)'I' && data[2] == (byte)'F')
                return Valid(new ImageInfo("gif", "image/gif", BinaryPrimitives.ReadUInt16LittleEndian(data[6..]), BinaryPrimitives.ReadUInt16LittleEndian(data[8..]), 96, 96));
            if (data.Length >= 26 && data[0] == (byte)'B' && data[1] == (byte)'M') return Bmp(data);
        }
        catch (ArgumentOutOfRangeException)
        {
        }
        return null;
    }

    private static ImageInfo? Valid(ImageInfo info) =>
        info.WidthPx > 0 && info.HeightPx > 0 && info.DpiX > 0 && info.DpiY > 0 ? info : null;

    private static ImageInfo? Png(ReadOnlySpan<byte> d)
    {
        int width = BinaryPrimitives.ReadInt32BigEndian(d[16..]);
        int height = BinaryPrimitives.ReadInt32BigEndian(d[20..]);
        double dpiX = 96, dpiY = 96;
        int pos = 8;
        while (pos + 8 <= d.Length)
        {
            int length = BinaryPrimitives.ReadInt32BigEndian(d[pos..]);
            if (length < 0) break;
            var type = d.Slice(pos + 4, 4);
            if (type.SequenceEqual("pHYs"u8) && pos + 8 + 9 <= d.Length)
            {
                uint ppuX = BinaryPrimitives.ReadUInt32BigEndian(d[(pos + 8)..]);
                uint ppuY = BinaryPrimitives.ReadUInt32BigEndian(d[(pos + 12)..]);
                if (d[pos + 16] == 1 && ppuX > 0 && ppuY > 0)
                {
                    dpiX = ppuX * 0.0254;
                    dpiY = ppuY * 0.0254;
                }
                break;
            }
            if (type.SequenceEqual("IDAT"u8) || type.SequenceEqual("IEND"u8)) break;
            pos += 12 + length;
        }
        return Valid(new ImageInfo("png", "image/png", width, height, dpiX, dpiY));
    }

    private static ImageInfo? Jpeg(ReadOnlySpan<byte> d)
    {
        double dpiX = 96, dpiY = 96;
        int pos = 2;
        while (pos + 4 <= d.Length)
        {
            if (d[pos] != 0xFF) { pos++; continue; }
            byte marker = d[pos + 1];
            if (marker == 0xFF) { pos++; continue; }
            if (marker is 0xD8 or 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { pos += 2; continue; }
            int length = BinaryPrimitives.ReadUInt16BigEndian(d[(pos + 2)..]);
            if (marker == 0xE0 && pos + 4 + 12 <= d.Length && d.Slice(pos + 4, 5).SequenceEqual("JFIF\0"u8))
            {
                byte units = d[pos + 11];
                int x = BinaryPrimitives.ReadUInt16BigEndian(d[(pos + 12)..]);
                int y = BinaryPrimitives.ReadUInt16BigEndian(d[(pos + 14)..]);
                if (x > 0 && y > 0 && units is 1 or 2)
                {
                    dpiX = units == 1 ? x : x * 2.54;
                    dpiY = units == 1 ? y : y * 2.54;
                }
            }
            bool sof = marker >= 0xC0 && marker <= 0xCF && marker is not 0xC4 and not 0xC8 and not 0xCC;
            if (sof && pos + 9 <= d.Length)
            {
                int height = BinaryPrimitives.ReadUInt16BigEndian(d[(pos + 5)..]);
                int width = BinaryPrimitives.ReadUInt16BigEndian(d[(pos + 7)..]);
                return Valid(new ImageInfo("jpeg", "image/jpeg", width, height, dpiX, dpiY));
            }
            if (length < 2) break;
            pos += 2 + length;
        }
        return null;
    }

    private static ImageInfo? Bmp(ReadOnlySpan<byte> d)
    {
        int headerSize = BinaryPrimitives.ReadInt32LittleEndian(d[14..]);
        int width, height;
        double dpiX = 96, dpiY = 96;
        if (headerSize == 12)
        {
            width = BinaryPrimitives.ReadUInt16LittleEndian(d[18..]);
            height = BinaryPrimitives.ReadUInt16LittleEndian(d[20..]);
        }
        else
        {
            width = BinaryPrimitives.ReadInt32LittleEndian(d[18..]);
            height = Math.Abs(BinaryPrimitives.ReadInt32LittleEndian(d[22..]));
            if (d.Length >= 46)
            {
                int ppmX = BinaryPrimitives.ReadInt32LittleEndian(d[38..]);
                int ppmY = BinaryPrimitives.ReadInt32LittleEndian(d[42..]);
                if (ppmX > 0 && ppmY > 0)
                {
                    dpiX = ppmX * 0.0254;
                    dpiY = ppmY * 0.0254;
                }
            }
        }
        return Valid(new ImageInfo("bmp", "image/bmp", width, height, dpiX, dpiY));
    }
}
