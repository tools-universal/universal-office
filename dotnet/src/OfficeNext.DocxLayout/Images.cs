using System.IO.Compression;
using OfficeNext.Layout;

namespace OfficeNext.DocxLayout;

/// <summary>Imagem decodificada.</summary>
public sealed class Rgba
{
    public int Width { get; }
    public int Height { get; }
    /// <summary>RGBA 8 bits, linha a linha</summary>
    public byte[] Data { get; }

    public Rgba(int width, int height, byte[] data)
    {
        Width = width;
        Height = height;
        Data = data;
    }
}

/// <summary>
/// Cabeçalho de um JPEG (SOF truncado: <see cref="Images.JpegInfo"/> devolve null).
/// <see cref="Components"/> continua anulável por compatibilidade (o chamador faz
/// <c>Components ?? 3</c>, o default do <c>embedJpeg</c>).
/// </summary>
/// <param name="Adobe">marcador APP14 da Adobe (CMYK invertido)</param>
public sealed record JpegInfo(int Width, int Height, int? Components, bool Adobe);

/// <summary>
/// Decodificação de imagens SEM DOM — porta de @universal-office/docx-layout images.ts:
/// PNG (todas as profundidades/tipos, Adam7), GIF (1º quadro), BMP, TIFF (baseline);
/// JPEG só tem o cabeçalho lido (o PDF embute o JPEG direto via DCTDecode).
///
/// Mesma estrutura e ordem do TS. A semântica do JS é reproduzida inclusive nos casos
/// de borda: leitura fora dos limites de um typed array dá <c>undefined</c> (vira 0 em
/// operações de bits, NaN na aritmética — e NaN gravado num Uint8Array vira 0),
/// escrita fora dos limites é ignorada, e leitura fora dos limites de um DataView
/// LANÇA (<see cref="JsRangeError"/>; quem chama decide se pega). Diferenças
/// residuais: ver <see cref="UnzlibSync"/> e as notas em <see cref="DecodeTiff"/>.
/// </summary>
public static class Images
{
    public static JpegInfo? JpegInfo(byte[] b)
    {
        if (ByteOrUndef(b, 0) != 0xff || ByteOrUndef(b, 1) != 0xd8) return null;
        int i = 2;
        bool adobe = false;
        while (i + 4 < b.Length)
        {
            if (b[i] != 0xff) { i++; continue; }
            int m = b[i + 1];
            // 0xFF repetido = preenchimento antes do marcador
            if (m == 0xff) { i++; continue; }
            if (m == 0xd8 || m == 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
            int len = (b[i + 2] << 8) | b[i + 3];
            if (m == 0xee && b[i + 4] == 0x41 && ByteOrUndef(b, i + 5) == 0x64) adobe = true; // "Adobe"
            if ((m >= 0xc0 && m <= 0xcf) && m != 0xc4 && m != 0xc8 && m != 0xcc)
            {
                if (i + 9 >= b.Length) return null; // SOF truncado
                int height = (ByteOr0(b, i + 5) << 8) | ByteOr0(b, i + 6);
                int width = (ByteOr0(b, i + 7) << 8) | ByteOr0(b, i + 8);
                int? components = i + 9 < b.Length ? b[i + 9] : null;
                return new JpegInfo(width, height, components, adobe);
            }
            i += 2 + len;
        }
        return null;
    }

    private static readonly byte[] PngSig = { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a };

    public static Rgba? DecodePng(byte[] b)
    {
        for (int k = 0; k < 8; k++) if (ByteOrUndef(b, k) != PngSig[k]) return null;
        long pos = 8;
        long width = 0, height = 0;
        int depth = 8, ctype = 0, interlace = 0;
        // IHDR cortado pelo fim do arquivo: depth/ctype/interlace ficam undefined no JS.
        // ctype undefined não casa com nenhum === (→ -1: 4 canais, ramo RGBA) e
        // interlace undefined é falsy (→ 0); depth undefined é tratado à parte.
        bool depthUndef = false;
        ArraySegment<byte>? palette = null;
        ArraySegment<byte>? trns = null;
        var idat = new List<ArraySegment<byte>>();
        while (pos + 8 <= b.Length)
        {
            long len = DvUint32(b, pos, false);
            var data = Subarray(b, pos + 8, pos + 8 + len);
            int p = (int)pos;
            if (ChunkIs(b, p, "IHDR"))
            {
                width = DvUint32(b, pos + 8, false); height = DvUint32(b, pos + 12, false);
                depthUndef = pos + 16 >= b.Length;
                depth = depthUndef ? 0 : b[pos + 16];
                ctype = ByteOrUndef(b, pos + 17);
                interlace = Math.Max(0, ByteOrUndef(b, pos + 20));
            }
            else if (ChunkIs(b, p, "PLTE")) palette = data;
            else if (ChunkIs(b, p, "tRNS")) trns = data;
            else if (ChunkIs(b, p, "IDAT")) idat.Add(data);
            else if (ChunkIs(b, p, "IEND")) break;
            pos += 12 + len;
        }
        if (width == 0 || height == 0) return null;
        long total = 0;
        foreach (var c in idat) total += c.Count;
        var z = new byte[total];
        int o = 0;
        foreach (var c in idat) { c.AsSpan().CopyTo(z.AsSpan(o)); o += c.Count; }
        byte[] raw;
        try { raw = UnzlibSync(z); } catch { return null; }
        int channels = ctype == 0 ? 1 : ctype == 2 ? 3 : ctype == 3 ? 1 : ctype == 4 ? 2 : 4;
        int bitsPP = channels * depth;
        int bpp = Math.Max(1, bitsPP >> 3);
        var outp = NewUint8Array((double)width * height * 4);
        // depth undefined (só acontece com o IHDR no fim do arquivo, logo ctype também
        // undefined): stride = NaN → linhas vazias, toda amostra vira round(0/0) = NaN e
        // o Uint8Array grava 0 — a saída é toda zero.
        if (depthUndef) return new Rgba((int)width, (int)height, outp);

        long Pass(long rp, long w, long h, long ox, long oy, long dx, long dy)
        {
            if (w == 0 || h == 0) return rp;
            long stride = (w * bitsPP + 7) / 8; // Math.ceil((w * bitsPP) / 8)
            // JS: prev = new Uint8Array(stride) e line = raw.slice(rp, rp + stride) a cada
            // linha (mais curta quando raw acaba). Aqui: dois buffers alternados + o
            // comprimento da linha. Só se lê prev[i] com i < lineLen, e prev nunca é mais
            // curta que a linha seguinte (as linhas só encurtam quando raw acaba).
            int cap = (int)Math.Min(stride, raw.Length);
            var prev = new byte[cap];
            var line = new byte[cap];
            int lineLen = 0;

            double Sample(long x, int ch)
            {
                if (depth == 8) { long ix = x * channels + ch; return ix < lineLen ? line[ix] : double.NaN; }
                if (depth == 16) { long ix = (x * channels + ch) * 2; return ix < lineLen ? line[ix] : double.NaN; }
                int bit = unchecked((int)((x * channels + ch) * depth)); // ToInt32 de `bit >> 3` / `bit & 7`
                int bi = bit >> 3;
                int by = bi >= 0 && bi < lineLen ? line[bi] : 0;
                int shift = 8 - depth - (bit & 7);
                int v = (by >> shift) & ((1 << depth) - 1);
                return ctype == 3 ? v : JsRound(v * 255.0 / ((double)(1 << depth) - 1));
            }

            int LineOr0(long ix) => ix < lineLen ? line[ix] : 0;

            // valor cru da amostra (16 bits inteiros; < 8 bits sem escala) — chave do tRNS
            double RawSample(long x, int ch)
            {
                if (depth == 8) { long ix = x * channels + ch; return ix < lineLen ? line[ix] : double.NaN; }
                if (depth == 16) { long ix = (x * channels + ch) * 2; return (LineOr0(ix) << 8) | LineOr0(ix + 1); }
                int bit = unchecked((int)((x * channels + ch) * depth));
                int bi = bit >> 3;
                int by = bi >= 0 && bi < lineLen ? line[bi] : 0;
                int shift = 8 - depth - (bit & 7);
                return (by >> shift) & ((1 << depth) - 1);
            }
            int Key(ArraySegment<byte> t, int k) => (SegOr0(t, k * 2) << 8) | SegOr0(t, k * 2 + 1);

            for (long y = 0; y < h; y++)
            {
                int ft = rp < raw.Length ? raw[rp] : -1; // undefined: nenhum filtro casa
                rp++;
                long s0 = Math.Min(rp, raw.Length), s1 = Math.Min(rp + stride, raw.Length);
                lineLen = (int)Math.Max(0, s1 - s0);
                Buffer.BlockCopy(raw, (int)s0, line, 0, lineLen);
                rp += stride;
                // i ≥ lineLen: no JS a escrita é ignorada e nada mais muda
                for (int i = 0; i < lineLen; i++)
                {
                    int a = i >= bpp ? line[i - bpp] : 0;
                    int up = prev[i];
                    int c = i >= bpp ? prev[i - bpp] : 0;
                    int v = line[i];
                    if (ft == 1) v += a;
                    else if (ft == 2) v += up;
                    else if (ft == 3) v += (a + up) >> 1;
                    else if (ft == 4)
                    {
                        int pp = a + up - c;
                        int pa = Math.Abs(pp - a), pb = Math.Abs(pp - up), pc = Math.Abs(pp - c);
                        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
                    }
                    line[i] = (byte)(v & 0xff);
                }
                if (depth == 8 && lineLen == stride && (ctype == 6 || (ctype == 2 && trns is null)))
                {
                    // caminho rápido (mesmo resultado): linha completa, toda amostra de 8 bits existe
                    long rowK = ((oy + y * dy) * width + ox) * 4, stepK = dx * 4;
                    for (long x = 0; x < w; x++)
                    {
                        long k = rowK + x * stepK;
                        int s = (int)(x * channels);
                        outp[k] = line[s]; outp[k + 1] = line[s + 1]; outp[k + 2] = line[s + 2];
                        outp[k + 3] = ctype == 6 ? line[s + 3] : (byte)255;
                    }
                    (prev, line) = (line, prev);
                    continue;
                }
                for (long x = 0; x < w; x++)
                {
                    double p0, p1, p2, p3;
                    if (ctype == 0)
                    {
                        double g = Sample(x, 0);
                        bool transparent = trns is { } t && t.Count >= 2 && Key(t, 0) == RawSample(x, 0);
                        p0 = p1 = p2 = g; p3 = transparent ? 0 : 255;
                    }
                    else if (ctype == 2)
                    {
                        bool transparent = trns is { } t && t.Count >= 6 && Key(t, 0) == RawSample(x, 0) && Key(t, 1) == RawSample(x, 1) && Key(t, 2) == RawSample(x, 2);
                        p0 = Sample(x, 0); p1 = Sample(x, 1); p2 = Sample(x, 2); p3 = transparent ? 0 : 255;
                    }
                    else if (ctype == 3)
                    {
                        double i = Sample(x, 0);
                        if (palette is { } pal)
                        {
                            p0 = SegOr0(pal, i * 3); p1 = SegOr0(pal, i * 3 + 1); p2 = SegOr0(pal, i * 3 + 2);
                            p3 = trns is { } t && i < t.Count ? t[(int)i] : 255;
                        }
                        else { p0 = p1 = p2 = 0; p3 = 255; }
                    }
                    else if (ctype == 4) { double g = Sample(x, 0); p0 = p1 = p2 = g; p3 = Sample(x, 1); }
                    else { p0 = Sample(x, 0); p1 = Sample(x, 1); p2 = Sample(x, 2); p3 = Sample(x, 3); }
                    long X = ox + x * dx, Y = oy + y * dy;
                    long k = (Y * width + X) * 4;
                    outp[k] = ToUint8(p0); outp[k + 1] = ToUint8(p1); outp[k + 2] = ToUint8(p2); outp[k + 3] = ToUint8(p3);
                }
                (prev, line) = (line, prev);
            }
            return rp;
        }

        if (interlace == 0) Pass(0, width, height, 0, 0, 1, 1);
        else
        {
            int[][] passes = { new[] { 0, 0, 8, 8 }, new[] { 4, 0, 8, 8 }, new[] { 0, 4, 4, 8 }, new[] { 2, 0, 4, 4 }, new[] { 0, 2, 2, 4 }, new[] { 1, 0, 2, 2 }, new[] { 0, 1, 1, 2 } };
            long rp = 0;
            foreach (var ps in passes)
            {
                int ox = ps[0], oy = ps[1], dx = ps[2], dy = ps[3];
                double w = Math.Ceiling((double)(width - ox) / dx), h = Math.Ceiling((double)(height - oy) / dy);
                rp = Pass(rp, w > 0 ? (long)w : 0, h > 0 ? (long)h : 0, ox, oy, dx, dy);
            }
        }
        return new Rgba((int)width, (int)height, outp);
    }

    public static Rgba? DecodeGif(byte[] b)
    {
        if (ByteOrUndef(b, 0) != 0x47 || ByteOrUndef(b, 1) != 0x49 || ByteOrUndef(b, 2) != 0x46) return null;
        int width = ByteOr0(b, 6) | (ByteOr0(b, 7) << 8), height = ByteOr0(b, 8) | (ByteOr0(b, 9) << 8);
        int flags = ByteOr0(b, 10);
        long pos = 13;
        ArraySegment<byte>? gct = null;
        if ((flags & 0x80) != 0) { int n = 3 * (1 << ((flags & 7) + 1)); gct = Subarray(b, pos, pos + n); pos += n; }
        // índice transparente; undefined (GCE cortado) também nunca casa com um índice
        int transparent = -1;
        var outp = NewUint8Array((double)width * height * 4);
        while (pos < b.Length)
        {
            int t = b[pos++];
            if (t == 0x21)
            {
                int label = ByteOrUndef(b, pos++);
                if (label == 0xf9 && (ByteOr0(b, pos + 1) & 1) != 0) transparent = ByteOrUndef(b, pos + 4);
                while (pos < b.Length && b[pos] != 0) pos += b[pos] + 1;
                pos++;
            }
            else if (t == 0x2c)
            {
                int ix = ByteOr0(b, pos) | (ByteOr0(b, pos + 1) << 8), iy = ByteOr0(b, pos + 2) | (ByteOr0(b, pos + 3) << 8);
                int iw = ByteOr0(b, pos + 4) | (ByteOr0(b, pos + 5) << 8), ih = ByteOr0(b, pos + 6) | (ByteOr0(b, pos + 7) << 8);
                int lf = ByteOr0(b, pos + 8);
                pos += 9;
                var ct = gct;
                if ((lf & 0x80) != 0) { int n = 3 * (1 << ((lf & 7) + 1)); ct = Subarray(b, pos, pos + n); pos += n; }
                bool interlaced = (lf & 0x40) != 0;
                int minCode = ByteOrUndef(b, pos++);
                // tamanho mínimo de código fora de 1..11: arquivo inválido (o dicionário teria 2^n entradas)
                if (!(minCode >= 1 && minCode <= 11)) return null;
                var chunks = new MemoryStream();
                // byte além do fim: undefined → Uint8Array.from grava 0
                while (pos < b.Length && b[pos] != 0) { int n = b[pos]; for (int k = 1; k <= n; k++) chunks.WriteByte((byte)ByteOr0(b, pos + k)); pos += n + 1; }
                pos++;
                var idx = Lzw(chunks.ToArray(), minCode, (long)iw * ih);
                var rows = new int[ih];
                if (interlaced)
                {
                    int ri = 0;
                    foreach (var (s, st) in new[] { (0, 8), (4, 8), (2, 4), (1, 2) }) for (int r = s; r < ih; r += st) rows[ri++] = r;
                }
                else for (int r = 0; r < ih; r++) rows[r] = r;
                for (int r = 0; r < ih; r++)
                {
                    long yy = iy + rows[r];
                    if (yy >= height) continue;
                    for (int x = 0; x < iw; x++)
                    {
                        if (ix + x >= width) break; // quadro maior que a tela: recorta
                        int ci = idx[(long)r * iw + x];
                        // o quadro pode passar da tela: no JS a escrita fora do array é ignorada
                        long k = (yy * width + ix + x) * 4;
                        if (k >= outp.Length) continue;
                        if (ci == transparent || ct is not { } c) { outp[k + 3] = 0; continue; }
                        outp[k] = (byte)SegOr0(c, ci * 3); outp[k + 1] = (byte)SegOr0(c, ci * 3 + 1); outp[k + 2] = (byte)SegOr0(c, ci * 3 + 2); outp[k + 3] = 255;
                    }
                }
                return new Rgba(width, height, outp);
            }
            else break;
        }
        return null;
    }

    private static byte[] Lzw(byte[] data, int minCode, long n)
    {
        var outp = NewUint8Array(n);
        // minCode undefined (arquivo acaba antes): size = NaN → nenhum bit é lido, todo
        // código vale 0 (= [0]) e o JS grava n zeros — exatamente o array recém-criado
        if (minCode < 0) return outp;
        // 1 << m usa m & 31 como no JS (m ≡ 31 dá clear negativo: o dicionário começa vazio)
        int clear = 1 << minCode, eoi = clear + 1;
        int size = minCode + 1;
        var dict = new LzwTable(clear > 0 ? clear : 0, clear > 0 ? clear + 2 : 0);
        long bit = 0, o = 0;
        int prev = -1; // null
        while (o < n)
        {
            int code = 0;
            for (int k = 0; k < size; k++) { if (((ByteOr0(data, (bit + k) >> 3) >> (int)((bit + k) & 7)) & 1) != 0) code |= 1 << k; }
            bit += size;
            if (bit > (long)data.Length * 8) break;
            if (code == clear) { dict.Reset(); size = minCode + 1; prev = -1; continue; }
            if (code == eoi) break;
            int entry;
            bool pushed = false;
            if (dict.Has(code)) entry = code;
            // [...prev, prev[0]]: o push de [...prev, entry[0]] abaixo grava a mesma sequência
            else if (prev >= 0) { entry = dict.Push(prev, dict.First(prev)); pushed = true; }
            else break;
            long count = Math.Min(dict.Len(entry), n - o);
            dict.Write(entry, outp, o, count);
            o += count;
            if (prev >= 0 && !pushed) dict.Push(prev, dict.First(entry));
            prev = entry;
            if (dict.Count >= (1 << size) && size < 12) size++;
        }
        return outp;
    }

    public static Rgba? DecodeBmp(byte[] b)
    {
        if (ByteOrUndef(b, 0) != 0x42 || ByteOrUndef(b, 1) != 0x4d) return null;
        long off = DvUint32(b, 10, true);
        int width = DvInt32(b, 18, true);
        long height = DvInt32(b, 22, true);
        int bpp = DvUint16(b, 28, true);
        long comp = DvUint32(b, 30, true);
        if (comp != 0 && comp != 3) return null;
        if (width <= 0 || height == 0) return null;
        bool topDown = height < 0;
        height = Math.Abs(height);
        long stride = (long)Math.Ceiling((double)width * bpp / 32) * 4;
        long hdr = DvUint32(b, 14, true);
        long palOff = 14 + hdr;
        // 16/32 bpp: canais por máscara (BITFIELDS: depois do cabeçalho de 40 bytes ou
        // dentro do V4/V5; sem BITFIELDS: 5-5-5 / 8-8-8, sem alfa)
        uint[] masks = bpp == 16 ? new uint[] { 0x7c00, 0x3e0, 0x1f, 0 } : new uint[] { 0xff0000, 0xff00, 0xff, 0 };
        if (comp == 3 && (bpp == 16 || bpp == 32))
            masks = new[] { (uint)DvUint32(b, 54, true), (uint)DvUint32(b, 58, true), (uint)DvUint32(b, 62, true), hdr >= 56 ? (uint)DvUint32(b, 66, true) : 0u };
        static byte Chan(uint v, uint m, byte dflt)
        {
            if (m == 0) return dflt;
            int shift = System.Numerics.BitOperations.TrailingZeroCount(m);
            int bits = 32 - System.Numerics.BitOperations.LeadingZeroCount(m >> shift);
            return (byte)JsRound(((v & m) >> shift) * 255.0 / (Math.Pow(2, bits) - 1));
        }
        var outp = NewUint8Array((double)width * height * 4);
        {
            for (long y = 0; y < height; y++)
            {
                long row = off + (topDown ? y : height - 1 - y) * stride;
                for (long x = 0; x < width; x++)
                {
                    long k = (y * width + x) * 4;
                    if (bpp == 24)
                    {
                        long p = row + x * 3;
                        outp[k] = (byte)ByteOr0(b, p + 2); outp[k + 1] = (byte)ByteOr0(b, p + 1); outp[k + 2] = (byte)ByteOr0(b, p); outp[k + 3] = 255;
                    }
                    else if (bpp == 16 || bpp == 32)
                    {
                        long p = row + x * (bpp / 8);
                        uint v = bpp == 16 ? (uint)(ByteOr0(b, p) | (ByteOr0(b, p + 1) << 8))
                            : unchecked((uint)(ByteOr0(b, p) | (ByteOr0(b, p + 1) << 8) | (ByteOr0(b, p + 2) << 16) | (ByteOr0(b, p + 3) << 24)));
                        outp[k] = Chan(v, masks[0], 0); outp[k + 1] = Chan(v, masks[1], 0); outp[k + 2] = Chan(v, masks[2], 0); outp[k + 3] = Chan(v, masks[3], 255);
                    }
                    else if (bpp <= 8)
                    {
                        int bit = unchecked((int)(x * bpp)); // ToInt32 de `bit >> 3` / `bit & 7`
                        // byte ausente: undefined >> n = 0 → índice 0 da paleta (não preto)
                        int v = (ByteOr0(b, row + (bit >> 3)) >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
                        long p = palOff + (long)v * 4;
                        outp[k] = (byte)ByteOr0(b, p + 2); outp[k + 1] = (byte)ByteOr0(b, p + 1); outp[k + 2] = (byte)ByteOr0(b, p); outp[k + 3] = 255;
                    }
                }
            }
        }
        return new Rgba(width, (int)Math.Min(height, int.MaxValue), outp);
    }

    /// <summary>Decodifica qualquer formato raster suportado (exceto JPEG, que é embutido direto).</summary>
    public static Rgba? DecodeRaster(byte[] b) => DecodePng(b) ?? DecodeGif(b) ?? DecodeBmp(b) ?? DecodeTiff(b);

    // ───────────────────────── TIFF (baseline) ─────────────────────────

    private static byte[] TiffLzw(ArraySegment<byte> data, double expected)
    {
        var outp = NewUint8Array(expected);
        long o = 0;
        var dict = new LzwTable(256, 258);
        long bitPos = 0;
        int width = 9;
        int prev = -1; // null

        int Read()
        {
            int v = 0;
            for (int k = 0; k < width; k++)
            {
                long bi = (bitPos + k) >> 3;
                if (bi >= data.Count) return 257; // byte undefined: fim (sem avançar bitPos)
                int by = data[(int)bi];
                v = (v << 1) | ((by >> (int)(7 - ((bitPos + k) & 7))) & 1);
            }
            bitPos += width;
            return v;
        }

        while (o < expected)
        {
            int code = Read();
            if (code == 257) break;
            if (code == 256) { dict.Reset(); width = 9; prev = -1; continue; }
            int entry;
            bool pushed = false;
            if (code < dict.Count) entry = code;
            else if (prev >= 0) { entry = dict.Push(prev, dict.First(prev)); pushed = true; }
            else break;
            // grava enquanto o < expected (escrita além do array — expected fracionário — é ignorada)
            long count = (long)Math.Min(dict.Len(entry), Math.Ceiling(expected - o));
            dict.Write(entry, outp, o, count);
            o += count;
            if (prev >= 0 && !pushed) dict.Push(prev, dict.First(entry));
            prev = entry;
            // "early change": aumenta a largura um código antes
            if (dict.Count + 1 >= (1 << width) && width < 12) width++;
        }
        return outp;
    }

    private static byte[] PackBits(ArraySegment<byte> data, double expected)
    {
        var outp = NewUint8Array(expected);
        long i = 0, o = 0;
        while (i < data.Count && o < expected)
        {
            int n = (sbyte)data[(int)i++];
            if (n >= 0) { for (int k = 0; k <= n && o < expected; k++) StoreAt(outp, o++, SegOr0(data, i++)); }
            else if (n != -128) { int v = SegOr0(data, i++); for (int k = 0; k < 1 - n && o < expected; k++) StoreAt(outp, o++, v); }
        }
        return outp;
    }

    /// <summary>
    /// TIFF baseline. Os valores das tags são number no JS (RATIONAL dá fração), então
    /// toda a aritmética derivada é em double, com índices de typed array validados
    /// como no JS (índice fracionário/negativo/fora: leitura undefined, escrita ignorada).
    /// Única diferença: <see cref="Rgba.Width"/>/<see cref="Rgba.Height"/> são int — uma
    /// dimensão fracionária (RATIONAL) é truncada no retorno (os pixels saem iguais ao JS).
    /// </summary>
    public static Rgba? DecodeTiff(byte[] b)
    {
        bool le = ByteOrUndef(b, 0) == 0x49 && ByteOrUndef(b, 1) == 0x49;
        bool be = ByteOrUndef(b, 0) == 0x4d && ByteOrUndef(b, 1) == 0x4d;
        if (!le && !be) return null;
        int U16(long o) => DvUint16(b, o, le);
        long U32(long o) => DvUint32(b, o, le);
        if (U16(2) != 42) return null;
        long ifd = U32(4);
        int n = U16(ifd);
        // valores: undefined (byte além do fim, tipos 1/7) vira NaN — os valores
        // legítimos são sempre finitos, então NaN só significa undefined (p/ o `??`)
        var tags = new Dictionary<int, double[]>();
        for (int i = 0; i < n; i++)
        {
            long e = ifd + 2 + i * 12L;
            int tag = U16(e), type = U16(e + 2);
            long count = U32(e + 4);
            double size = (type == 3 ? 2 : type == 4 ? 4 : type == 5 ? 8 : 1) * (double)count; // SIZES[type] ?? 1
            long @base = size <= 4 ? e + 8 : U32(e + 8);
            var vals = new List<double>();
            long lim = Math.Min(count, 1 << 20);
            // os demais tipos não empurram nada (o laço do JS roda vazio)
            if (type is 1 or 3 or 4 or 5 or 7)
            {
                for (long k = 0; k < lim; k++)
                {
                    if (type == 3) vals.Add(U16(@base + k * 2));
                    else if (type == 4) vals.Add(U32(@base + k * 4));
                    else if (type == 1 || type == 7) vals.Add(ByteOrNaN(b, @base + k));
                    else if (type == 5)
                    {
                        double num = U32(@base + k * 8), den = U32(@base + k * 8 + 4);
                        vals.Add(num / (den != 0 ? den : 1));
                    }
                }
            }
            tags[tag] = vals.ToArray();
        }
        double T(int k, double d = 0) => tags.TryGetValue(k, out var v) && v.Length > 0 && !double.IsNaN(v[0]) ? v[0] : d;
        double width = T(256), height = T(257);
        double[] bps = tags.TryGetValue(258, out var bv) ? bv : new double[] { 1 };
        double comp = T(259, 1);
        double photo = T(262, 1);
        double spp = T(277, 1);
        double predictor = T(317, 1);
        double planar = T(284, 1);
        if (width == 0 || height == 0 || planar != 1 || !(comp is 1 or 5 or 8 or 32946 or 32773)) return null;
        double bits = bps.Length > 0 && !double.IsNaN(bps[0]) ? bps[0] : 8;
        ArraySegment<byte> Decode0(ArraySegment<byte> chunk, double expected)
        {
            if (comp == 1) return chunk;
            if (comp == 5) return TiffLzw(chunk, expected);
            if (comp == 32773) return PackBits(chunk, expected);
            try { return UnzlibSync(chunk); } catch { return NewUint8Array(expected); }
        }
        // YCbCr (fotométrica 6) com subamostragem: unidades de h×v amostras de Y + Cb + Cr
        bool ycc = photo == 6 && bits == 8 && spp == 3;
        double[] sub = tags.TryGetValue(530, out var sbv) ? sbv : new double[] { 2, 2 };
        double sh = ycc ? Math.Max(1, sub.Length > 0 && !double.IsNaN(sub[0]) ? sub[0] : 2) : 1;
        double sv = ycc ? Math.Max(1, sub.Length > 1 && !double.IsNaN(sub[1]) ? sub[1] : 2) : 1;
        double[] coef = tags.TryGetValue(529, out var cfv) ? cfv : new[] { 0.299, 0.587, 0.114 };
        (double R, double G, double B) ToRgb(double Y, double cb, double cr)
        {
            double lr = coef.Length > 0 && !double.IsNaN(coef[0]) ? coef[0] : 0.299;
            double lg = coef.Length > 1 && !double.IsNaN(coef[1]) ? coef[1] : 0.587;
            double lb = coef.Length > 2 && !double.IsNaN(coef[2]) ? coef[2] : 0.114;
            double R = Y + (cr - 128) * (2 - 2 * lr), B = Y + (cb - 128) * (2 - 2 * lb);
            double G = (Y - lb * B - lr * R) / lg;
            static double C(double v) => Math.Max(0, Math.Min(255, JsRound(v)));
            return (C(R), C(G), C(B));
        }
        if (ycc && (sh > 1 || sv > 1))
        {
            if (tags.ContainsKey(322)) return null; // ladrilhos YCbCr subamostrados: não suportado
            double across = Math.Ceiling(width / sh), unit = sh * sv + 2, blockRow = across * unit, blockRows = Math.Ceiling(height / sv);
            var ydata = NewUint8Array(blockRow * blockRows);
            double yrps = T(278, height);
            double yo = 0;
            double[] soffs = tags.TryGetValue(273, out var sov) ? sov : Array.Empty<double>();
            double[] scnts = tags.TryGetValue(279, out var scv) ? scv : Array.Empty<double>();
            for (int i = 0; i < soffs.Length; i++)
            {
                if (yo >= ydata.Length) continue;
                double off = soffs[i];
                double rows = Math.Min(yrps, height - i * yrps);
                double exp = Math.Ceiling(rows / sv) * blockRow;
                var d = Decode0(Subarray(b, off, off + (i < scnts.Length && !double.IsNaN(scnts[i]) ? scnts[i] : 0)), exp);
                TypedSet(ydata, Subarray(d, 0, Math.Min(d.Count, ydata.Length - yo)), yo);
                yo += exp;
            }
            var yout = NewUint8Array(width * height * 4);
            for (double by = 0; by < blockRows; by++)
            {
                for (double bx = 0; bx < across; bx++)
                {
                    double u = by * blockRow + bx * unit;
                    double cb = Get(ydata, u + sh * sv), cr = Get(ydata, u + sh * sv + 1);
                    for (double j = 0; j < sv; j++)
                    {
                        for (double i = 0; i < sh; i++)
                        {
                            double x = bx * sh + i, y = by * sv + j;
                            if (x >= width || y >= height) continue;
                            var (R, G, B) = ToRgb(Get(ydata, u + j * sh + i), cb, cr);
                            double k = (y * width + x) * 4;
                            Put(yout, k, R); Put(yout, k + 1, G); Put(yout, k + 2, B); Put(yout, k + 3, 255);
                        }
                    }
                }
            }
            return new Rgba(Dim(width), Dim(height), yout);
        }
        double rowBytes = Math.Ceiling(width * spp * bits / 8);
        var raw = NewUint8Array(rowBytes * height);
        bool tiled = tags.ContainsKey(322);
        double[] offs = tags.TryGetValue(tiled ? 324 : 273, out var ov) ? ov : Array.Empty<double>();
        double[] counts = tags.TryGetValue(tiled ? 325 : 279, out var cv) ? cv : Array.Empty<double>();
        double CountAt(int i) => i < counts.Length && !double.IsNaN(counts[i]) ? counts[i] : 0; // counts[i] ?? 0

        ArraySegment<byte> Decode(ArraySegment<byte> chunk, double expected) => Decode0(chunk, expected);

        if (!tiled)
        {
            double rps = T(278, height);
            double o = 0;
            for (int i = 0; i < offs.Length; i++)
            {
                if (o >= raw.Length) continue; // faixas além da imagem
                double off = offs[i];
                double rows = Math.Min(rps, height - i * rps);
                var d = Decode(Subarray(b, off, off + CountAt(i)), rows * rowBytes);
                TypedSet(raw, Subarray(d, 0, Math.Min(d.Count, raw.Length - o)), o);
                o += rows * rowBytes;
            }
        }
        else
        {
            double tw = T(322), th = T(323);
            double tilesAcross = Math.Ceiling(width / tw);
            double tileRow = Math.Ceiling(tw * spp * bits / 8);
            for (int i = 0; i < offs.Length; i++)
            {
                double off = offs[i];
                var d = Decode(Subarray(b, off, off + CountAt(i)), tileRow * th);
                double tx = (i % tilesAcross) * tw, ty = Math.Floor(i / tilesAcross) * th;
                for (double y = 0; y < th && ty + y < height; y++)
                {
                    double dst = (ty + y) * rowBytes + Math.Floor(tx * spp * bits / 8);
                    double len = Math.Min(tileRow, rowBytes - Math.Floor(tx * spp * bits / 8));
                    TypedSet(raw, Subarray(d, y * tileRow, y * tileRow + len), dst);
                }
            }
        }
        // preditor horizontal (amostras de 8 ou 16 bits, na ordem de bytes do arquivo)
        if (predictor == 2 && bits == 8)
        {
            for (double y = 0; y < height; y++)
            {
                for (double x = spp; x < width * spp; x++)
                    Put(raw, y * rowBytes + x, ToInt32(Get(raw, y * rowBytes + x) + Get(raw, y * rowBytes + x - spp)) & 0xff);
            }
        }
        else if (predictor == 2 && bits == 16)
        {
            int Get16(double o) => le ? ToInt32(Get(raw, o)) | (ToInt32(Get(raw, o + 1)) << 8) : (ToInt32(Get(raw, o)) << 8) | ToInt32(Get(raw, o + 1));
            void Set16(double o, int v)
            {
                if (le) { Put(raw, o, v & 0xff); Put(raw, o + 1, v >> 8); }
                else { Put(raw, o, v >> 8); Put(raw, o + 1, v & 0xff); }
            }
            for (double y = 0; y < height; y++)
            {
                for (double s = spp; s < width * spp; s++)
                {
                    double o = y * rowBytes + s * 2;
                    Set16(o, (Get16(o) + Get16(o - spp * 2)) & 0xffff);
                }
            }
        }
        var outp = NewUint8Array(width * height * 4);
        tags.TryGetValue(320, out var cmap);
        int bitsI = ToInt32(bits);
        for (double y = 0; y < height; y++)
        {
            for (double x = 0; x < width; x++)
            {
                double k = (y * width + x) * 4;
                double Sample(int c)
                {
                    if (bits == 8) return Get(raw, y * rowBytes + x * spp + c);
                    if (bits == 16) return Get(raw, y * rowBytes + (x * spp + c) * 2 + (le ? 1 : 0));
                    double bit = (x * spp + c) * bits;
                    int bitI = ToInt32(bit);
                    int v = (ToInt32(Get(raw, y * rowBytes + (bitI >> 3))) >> (ToInt32(8 - bits - (bitI & 7)) & 31)) & ((1 << bitsI) - 1);
                    return v;
                }
                if (ycc)
                {
                    var (R, G, B) = ToRgb(Sample(0), Sample(1), Sample(2));
                    Put(outp, k, R); Put(outp, k + 1, G); Put(outp, k + 2, B); Put(outp, k + 3, 255);
                }
                else if (photo == 2 || photo == 6)
                {
                    Put(outp, k, Sample(0)); Put(outp, k + 1, Sample(1)); Put(outp, k + 2, Sample(2));
                    Put(outp, k + 3, spp >= 4 ? Sample(3) : 255);
                }
                else if (photo == 3 && cmap is not null)
                {
                    double i = Sample(0), nColors = 1 << bitsI;
                    Put(outp, k, ToInt32(Get(cmap, i)) >> 8); Put(outp, k + 1, ToInt32(Get(cmap, nColors + i)) >> 8);
                    Put(outp, k + 2, ToInt32(Get(cmap, 2 * nColors + i)) >> 8); Put(outp, k + 3, 255);
                }
                else if (photo == 5)
                {
                    double c = Sample(0), m = Sample(1), yy = Sample(2), kk = Sample(3);
                    Put(outp, k, 255 - Math.Min(255, c + kk)); Put(outp, k + 1, 255 - Math.Min(255, m + kk));
                    Put(outp, k + 2, 255 - Math.Min(255, yy + kk)); Put(outp, k + 3, 255);
                }
                else
                {
                    double max = bits >= 8 ? 255 : (double)(1 << bitsI) - 1;
                    double g = JsRound(Sample(0) * 255 / max);
                    if (photo == 0) g = 255 - g;
                    Put(outp, k, g); Put(outp, k + 1, g); Put(outp, k + 2, g); Put(outp, k + 3, spp >= 2 ? Sample(1) : 255);
                }
            }
        }
        return new Rgba(Dim(width), Dim(height), outp);
    }

    // ───────────────────────── fflate.unzlibSync ─────────────────────────

    /// <summary>
    /// Emula o <c>unzlibSync</c> do fflate com o inflate nativo: valida o cabeçalho
    /// zlib como o fflate (método 8, janela ≤ 32K, FCHECK, sem dicionário), descomprime
    /// <c>data.subarray(2, -4)</c> como deflate cru SEM conferir o adler32 (o fflate não
    /// confere; um corpo vazio dá saída vazia) e LANÇA quando o fluxo acaba antes do
    /// bloco final — o DeflateStream do .NET 8 devolveria o pedaço em silêncio, por isso
    /// a sonda de fim de entrada. Diferença residual (só em dados corrompidos): o zlib
    /// rejeita o que o fflate aceita sem validar — LEN/NLEN de bloco armazenado
    /// inconsistentes, árvores Huffman super/subassinadas, contagens de símbolos
    /// inválidas, repetição de comprimento sem anterior — onde o fflate segue
    /// decodificando (lixo) ou falha em outro ponto.
    /// </summary>
    private static byte[] UnzlibSync(ArraySegment<byte> d)
    {
        int d0 = SegOr0(d, 0), d1 = SegOr0(d, 1); // undefined → 0 nas operações de bits
        if ((d0 & 15) != 8 || (d0 >> 4) > 7 || ((d0 << 8) | d1) % 31 != 0) throw new InvalidDataException("invalid zlib data");
        if (((d1 >> 5) & 1) == 1) throw new InvalidDataException("invalid zlib data: need dictionary");
        int start = Math.Min(2, d.Count), end = Math.Max(d.Count - 4, 0);
        int sl = Math.Max(end - start, 0);
        if (sl == 0) return Array.Empty<byte>();
        var src = new EofProbe(d.Array!, d.Offset + start, sl);
        using var z = new DeflateStream(src, CompressionMode.Decompress);
        using var ms = new MemoryStream(sl * 3);
        // laço de Read (não CopyTo: o CopyTo do DeflateStream drena a fonte até o fim)
        var buf = new byte[65536];
        int r;
        while ((r = z.Read(buf, 0, buf.Length)) > 0) ms.Write(buf, 0, r);
        if (src.HitEof) throw new InvalidDataException("unexpected EOF");
        return ms.ToArray();
    }

    /// <summary>Fonte do inflate que registra se ele pediu bytes além do fim (fluxo truncado).</summary>
    private sealed class EofProbe : Stream
    {
        private readonly byte[] _b;
        private int _pos;
        private readonly int _end;
        public bool HitEof;

        public EofProbe(byte[] b, int offset, int count) { _b = b; _pos = offset; _end = offset + count; }

        public override int Read(byte[] buffer, int offset, int count) => Read(buffer.AsSpan(offset, count));

        public override int Read(Span<byte> buffer)
        {
            int n = Math.Min(buffer.Length, _end - _pos);
            if (n <= 0) { if (buffer.Length > 0) HitEof = true; return 0; }
            _b.AsSpan(_pos, n).CopyTo(buffer);
            _pos += n;
            return n;
        }

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    // ───────────────────────── dicionário LZW (GIF e TIFF) ─────────────────────────

    /// <summary>
    /// O dicionário do JS é um array de arrays (<c>[...prev, x]</c> copia a cada
    /// entrada); aqui cada entrada empurrada é (prefixo, último valor) — mesma
    /// sequência, sem as cópias. Códigos &lt; roots são as raízes [código]; [roots, base)
    /// são clear/eoi (vazios, interceptados antes da consulta); ≥ base, as empurradas.
    /// Como no JS, o dicionário continua crescendo além de 4096 (nunca referenciado).
    /// </summary>
    private sealed class LzwTable
    {
        private readonly int _roots;
        private readonly int _base;
        private int[] _pfx = new int[512], _sfx = new int[512], _len = new int[512], _first = new int[512];

        /// <summary>dict.length</summary>
        public int Count;

        public LzwTable(int roots, int @base)
        {
            _roots = roots;
            _base = @base;
            Count = @base;
        }

        public void Reset() => Count = _base;

        public bool Has(int code) => code >= 0 && code < Count;

        public int Len(int e) => e < _roots ? 1 : _len[e - _base];

        public int First(int e) => e < _roots ? e : _first[e - _base];

        /// <summary>dict.push([...prefixo, sufixo]); devolve o índice.</summary>
        public int Push(int prefix, int suffix)
        {
            int i = Count - _base;
            if (i == _pfx.Length)
            {
                int n = i * 2;
                Array.Resize(ref _pfx, n); Array.Resize(ref _sfx, n); Array.Resize(ref _len, n); Array.Resize(ref _first, n);
            }
            _pfx[i] = prefix;
            _sfx[i] = suffix;
            _len[i] = Len(prefix) + 1;
            _first[i] = First(prefix);
            return Count++;
        }

        /// <summary>Grava os <paramref name="count"/> primeiros valores da entrada em
        /// outp[o..] (Uint8Array: valor &amp; 255; índice além do array é ignorado).</summary>
        public void Write(int e, byte[] outp, long o, long count)
        {
            long j = Len(e) - 1;
            int cur = e;
            while (true)
            {
                if (cur < _roots)
                {
                    if (j < count && o + j < outp.Length) outp[o + j] = unchecked((byte)cur);
                    return;
                }
                int p = cur - _base;
                if (j < count && o + j < outp.Length) outp[o + j] = unchecked((byte)_sfx[p]);
                j--;
                cur = _pfx[p];
            }
        }
    }

    // ───────────────────────── semântica do JS ─────────────────────────

    /// <summary>b[i] ou -1 (undefined: não casa com nenhum === de byte).</summary>
    private static int ByteOrUndef(byte[] b, long i) => i >= 0 && i < b.Length ? b[i] : -1;

    /// <summary>b[i] ou 0 (undefined em |, &amp;, &lt;&lt;, &gt;&gt; e gravado num Uint8Array vale 0).</summary>
    private static int ByteOr0(byte[] b, long i) => i >= 0 && i < b.Length ? b[i] : 0;

    /// <summary>b[i] ou NaN (undefined na aritmética).</summary>
    private static double ByteOrNaN(byte[] b, long i) => i >= 0 && i < b.Length ? b[i] : double.NaN;

    private static int SegOr0(ArraySegment<byte> s, long i) => i >= 0 && i < s.Count ? s[(int)i] : 0;

    /// <summary>seg[i] ?? 0 com i number (NaN/fracionário/fora → 0).</summary>
    private static int SegOr0(ArraySegment<byte> s, double i) =>
        i >= 0 && i < s.Count && i == Math.Floor(i) ? s[(int)i] : 0;

    private static void StoreAt(byte[] a, long i, int v)
    {
        if (i < a.Length) a[i] = unchecked((byte)v);
    }

    private static bool ChunkIs(byte[] b, int p, string type) =>
        b[p + 4] == type[0] && b[p + 5] == type[1] && b[p + 6] == type[2] && b[p + 7] == type[3];

    /// <summary>Leitura de typed array/Array com índice number: só índice inteiro dentro
    /// dos limites existe; senão undefined (NaN).</summary>
    private static double Get(byte[] a, double i) => i >= 0 && i < a.Length && i == Math.Floor(i) ? a[(int)i] : double.NaN;

    private static double Get(double[] a, double i) => i >= 0 && i < a.Length && i == Math.Floor(i) ? a[(int)i] : double.NaN;

    /// <summary>Escrita em Uint8Array com índice number: fora/fracionário é ignorada; o
    /// valor passa por ToUint8.</summary>
    private static void Put(byte[] a, double i, double v)
    {
        if (i >= 0 && i < a.Length && i == Math.Floor(i)) a[(int)i] = ToUint8(v);
    }

    /// <summary>ToUint8: NaN/±∞ → 0; senão trunca e reduz módulo 256.</summary>
    private static byte ToUint8(double v)
    {
        if (v >= 0 && v < 256) return (byte)v; // caso comum (trunca)
        if (!double.IsFinite(v)) return 0;
        double m = Math.Truncate(v) % 256;
        if (m < 0) m += 256;
        return (byte)m;
    }

    /// <summary>ToInt32: NaN/±∞ → 0; senão trunca e reduz módulo 2^32 (com sinal).</summary>
    private static int ToInt32(double v)
    {
        if (v > -2147483649.0 && v < 2147483648.0) return (int)v; // caso comum (trunca)
        if (!double.IsFinite(v)) return 0;
        double m = Math.Truncate(v) % 4294967296.0;
        if (m < 0) m += 4294967296.0;
        return unchecked((int)(uint)m);
    }

    /// <summary>ToIntegerOrInfinity: NaN → 0, senão trunca.</summary>
    private static double ToIntegerOrInfinity(double v) => double.IsNaN(v) ? 0 : Math.Truncate(v) + 0.0;

    /// <summary>Math.round do JS (empate vai para +∞), como o V8.</summary>
    private static double JsRound(double x)
    {
        double c = Math.Ceiling(x);
        return c - 0.5 > x ? c - 1 : c;
    }

    private static int Dim(double v) => (int)Math.Clamp(Math.Truncate(v), int.MinValue, int.MaxValue);

    /// <summary>new Uint8Array(len): ToIndex (fração trunca; &lt; 0 lança) e alocação.</summary>
    private static byte[] NewUint8Array(double len)
    {
        double n = ToIntegerOrInfinity(len);
        if (n < 0 || n > 9007199254740991.0) throw new JsRangeError($"Invalid typed array length: {len}");
        if (n > Array.MaxLength) throw new JsRangeError("Array buffer allocation failed");
        return new byte[(int)n];
    }

    /// <summary>TypedArray.prototype.subarray com begin/end number (negativo conta do fim).</summary>
    private static ArraySegment<byte> Subarray(ArraySegment<byte> a, double begin, double end)
    {
        long s = RelativeIndex(begin, a.Count), e = RelativeIndex(end, a.Count);
        return new ArraySegment<byte>(a.Array!, a.Offset + (int)s, (int)Math.Max(e - s, 0));
    }

    private static ArraySegment<byte> Subarray(byte[] a, double begin, double end) =>
        Subarray(new ArraySegment<byte>(a), begin, end);

    private static long RelativeIndex(double v, int len)
    {
        double r = ToIntegerOrInfinity(v);
        if (r < 0) return (long)Math.Max(len + r, 0);
        return (long)Math.Min(r, len);
    }

    /// <summary>TypedArray.prototype.set(src, offset): offset &lt; 0 ou src além do fim LANÇA.</summary>
    private static void TypedSet(byte[] target, ArraySegment<byte> src, double offset)
    {
        double t = ToIntegerOrInfinity(offset);
        if (t < 0 || src.Count + t > target.Length) throw new JsRangeError("offset is out of bounds");
        src.AsSpan().CopyTo(target.AsSpan((int)t));
    }

    private static void ThrowDv(long o) => throw new JsRangeError($"Offset is outside the bounds of the DataView ({o})");

    private static long DvUint32(byte[] b, long o, bool le)
    {
        if (o < 0 || o + 4 > b.Length) ThrowDv(o);
        int p = (int)o;
        return le
            ? b[p] | ((long)b[p + 1] << 8) | ((long)b[p + 2] << 16) | ((long)b[p + 3] << 24)
            : ((long)b[p] << 24) | ((long)b[p + 1] << 16) | ((long)b[p + 2] << 8) | b[p + 3];
    }

    private static int DvInt32(byte[] b, long o, bool le) => unchecked((int)DvUint32(b, o, le));

    private static int DvUint16(byte[] b, long o, bool le)
    {
        if (o < 0 || o + 2 > b.Length) ThrowDv(o);
        int p = (int)o;
        return le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1];
    }

    // ───────────────────────── ajustes de cor (Word) ─────────────────────────

    /// <summary>Brilho/contraste como reta por canal (0..1): x' = x·slope + off.</summary>
    public static (double Slope, double Off)? EffectLine(OfficeNext.Docx.ImageEffects fx)
    {
        if (fx.Gain is null && !(fx.Bright is { } b0 && b0 != 0 && !double.IsNaN(b0))) return null;
        double s = fx.Gain ?? 1, b = fx.Bright ?? 0;
        return (s, 0.5 - 0.5 * s + (b / 2) * (1 + s));
    }

    /// <summary>
    /// Aplica os ajustes aos pixels (RGBA, no lugar), na ordem do Word: cinza
    /// (Rec. 709), brilho/contraste, preto e branco (oráculo imgfx: o PDF do
    /// Word traz a imagem já ajustada).
    /// </summary>
    public static void ApplyImageEffects(byte[] rgba, OfficeNext.Docx.ImageEffects fx)
    {
        var ln = EffectLine(fx);
        var map = new byte[256];
        for (int v = 0; v < 256; v++)
        {
            double y = ln is { } l ? (v / 255.0 * l.Slope + l.Off) * 255 : v;
            double q = fx.Floor ? Math.Floor(y + 1e-9) : OfficeNext.Core.JsNumber.Round(y);
            map[v] = (byte)Math.Max(0, Math.Min(255, q));
        }
        double thr = fx.BiLevel is { } bl ? bl * 255 : -1;
        for (int i = 0; i + 3 < rgba.Length; i += 4)
        {
            int r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
            if (fx.Gray) r = g = b = (int)OfficeNext.Core.JsNumber.Round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            r = map[r]; g = map[g]; b = map[b];
            if (thr >= 0) r = g = b = 0.2126 * r + 0.7152 * g + 0.0722 * b >= thr ? 255 : 0;
            rgba[i] = (byte)r; rgba[i + 1] = (byte)g; rgba[i + 2] = (byte)b;
        }
    }

    /// <summary>
    /// /Decode do PDF que faz o brilho/contraste num JPEG sem decodificá-lo
    /// (componentes RGB ou cinza); null se o ajuste exige os pixels (cinza,
    /// preto e branco, CMYK).
    /// </summary>
    public static double[]? EffectDecode(OfficeNext.Docx.ImageEffects fx, int components)
    {
        if (fx.Gray || fx.BiLevel is not null || components == 4) return null;
        if (EffectLine(fx) is not { } ln) return null;
        double[] d = { ln.Off, ln.Off + ln.Slope };
        return components == 1 ? d : new[] { d[0], d[1], d[0], d[1], d[0], d[1] };
    }

    /// <summary>Valor gravado num Uint8Array do JS (inteiro já arredondado; NaN → 0).</summary>
    private static byte U8(double v) => double.IsNaN(v) ? (byte)0 : (byte)((long)v & 0xFF);

    /// <summary>
    /// Ajustes do a:blip que o Word aplica aos pixels além de a:lum/cinza/preto e
    /// branco (RGBA, no lugar): cor transparente (a:clrChange: a cor exata, com a
    /// folga do arredondamento do JPEG), tom duplo (luminância Rec. 709 entre as duas
    /// cores) e transparência (a:alphaModFix) — porta de applyPictureAdjust (images.ts).
    /// </summary>
    public static void ApplyPictureAdjust(byte[] d, double? alpha, (string A, string B)? duotone, PicClrChangeLook? clrChange)
    {
        static (double, double, double) Hex(string s) => (
            OfficeNext.Core.JsNumber.ParseInt(s.Length >= 2 ? s[..2] : s, 16),
            OfficeNext.Core.JsNumber.ParseInt(s.Length >= 4 ? s[2..4] : s.Length > 2 ? s[2..] : "", 16),
            OfficeNext.Core.JsNumber.ParseInt(s.Length >= 6 ? s[4..6] : s.Length > 4 ? s[4..] : "", 16));
        if (clrChange is not null)
        {
            var (fr, fg, fb) = Hex(clrChange.From);
            var (tr, tg, tb) = Hex(clrChange.To);
            double ta = OfficeNext.Core.JsNumber.Round(clrChange.ToAlpha * 255);
            for (int i = 0; i + 3 < d.Length; i += 4)
            {
                if (Math.Abs(d[i] - fr) <= 2 && Math.Abs(d[i + 1] - fg) <= 2 && Math.Abs(d[i + 2] - fb) <= 2)
                {
                    d[i] = U8(tr); d[i + 1] = U8(tg); d[i + 2] = U8(tb);
                    d[i + 3] = U8(OfficeNext.Core.JsNumber.Round((d[i + 3] * ta) / 255));
                }
            }
        }
        if (duotone is { } du)
        {
            var (a0, a1, a2) = Hex(du.A);
            var (b0, b1, b2) = Hex(du.B);
            for (int i = 0; i + 3 < d.Length; i += 4)
            {
                double t = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
                d[i] = U8(OfficeNext.Core.JsNumber.Round(a0 + (b0 - a0) * t));
                d[i + 1] = U8(OfficeNext.Core.JsNumber.Round(a1 + (b1 - a1) * t));
                d[i + 2] = U8(OfficeNext.Core.JsNumber.Round(a2 + (b2 - a2) * t));
            }
        }
        if (alpha is { } al)
            for (int i = 3; i < d.Length; i += 4) d[i] = U8(OfficeNext.Core.JsNumber.Round(d[i] * al));
    }

    /// <summary><see cref="ApplyPictureAdjust(byte[], double?, (string, string)?, PicClrChangeLook?)"/> com a aparência da imagem.</summary>
    public static void ApplyPictureAdjust(byte[] d, PictureLook look) => ApplyPictureAdjust(d, look.Alpha, look.Duotone, look.ClrChange);
}
