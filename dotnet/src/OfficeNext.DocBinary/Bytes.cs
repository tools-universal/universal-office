namespace OfficeNext.DocBinary;

/// <summary>
/// Vista sobre um trecho de um byte[] — o equivalente do Uint8Array/subarray do
/// JS (bytes.ts). Não copia: subvistas apontam para o mesmo array.
/// </summary>
internal readonly struct Bytes
{
    public readonly byte[] A;
    public readonly int O;
    public readonly int N;

    public static readonly Bytes Empty = new(Array.Empty<byte>());

    public Bytes(byte[] a) : this(a, 0, a.Length) { }

    public Bytes(byte[] a, int o, int n)
    {
        A = a;
        O = o;
        N = n;
    }

    public int Length => N;

    public byte this[int i] => A[O + i];

    /// <summary>subarray(start, end) do JS com os limites presos ao tamanho.</summary>
    public Bytes Sub(long start, long end)
    {
        long s = Math.Max(0, Math.Min(start, N));
        long e = Math.Max(0, Math.Min(N, end));
        if (e < s) e = s;
        return new Bytes(A, O + (int)s, (int)(e - s));
    }

    public Bytes Sub(long start) => Sub(start, N);

    public byte[] ToArray()
    {
        var out_ = new byte[N];
        Buffer.BlockCopy(A, O, out_, 0, N);
        return out_;
    }

    /// <summary>Conteúdo idêntico (para chaves de cache por conteúdo).</summary>
    public string ContentKey() => Convert.ToHexString(A, O, N);
}

/// <summary>
/// Leitura binária little-endian com verificação de limites (porta de
/// bytes.ts). Fora dos limites lê 0 — arquivos truncados não explodem.
/// Offsets são long: no JS são números (fc/lcb chegam a 2^32).
/// </summary>
internal sealed class ByteReader
{
    public readonly Bytes B;

    public ByteReader(Bytes b) { B = b; }

    public ByteReader(byte[] a) { B = new Bytes(a); }

    public long Length => B.N;

    public int U8(long off) => off >= 0 && off < B.N ? B.A[B.O + off] : 0;

    public int I8(long off)
    {
        int v = U8(off);
        return v > 127 ? v - 256 : v;
    }

    public int U16(long off) =>
        off >= 0 && off + 2 <= B.N ? B.A[B.O + off] | (B.A[B.O + off + 1] << 8) : 0;

    public int I16(long off) =>
        off >= 0 && off + 2 <= B.N ? (short)(B.A[B.O + off] | (B.A[B.O + off + 1] << 8)) : 0;

    /// <summary>u32 como número não negativo (o getUint32 do JS).</summary>
    public long U32(long off) =>
        off >= 0 && off + 4 <= B.N
            ? (uint)(B.A[B.O + off] | (B.A[B.O + off + 1] << 8) | (B.A[B.O + off + 2] << 16) | (B.A[B.O + off + 3] << 24))
            : 0;

    public int I32(long off) =>
        off >= 0 && off + 4 <= B.N
            ? B.A[B.O + off] | (B.A[B.O + off + 1] << 8) | (B.A[B.O + off + 2] << 16) | (B.A[B.O + off + 3] << 24)
            : 0;

    public Bytes Sub(long start, long end) => B.Sub(start, end);

    /// <summary>UTF-16LE de `count` unidades a partir de `off`.</summary>
    public string Utf16(long off, long count)
    {
        var sb = new System.Text.StringBuilder();
        for (long i = 0; i < count && off + i * 2 + 1 < B.N; i++) sb.Append((char)U16(off + i * 2));
        return sb.ToString();
    }
}

/// <summary>Registro OfficeArt já delimitado: cabeçalho + faixa [Start, End) dos dados.</summary>
internal sealed class Rec
{
    public int Ver;
    public int Inst;
    public int Type;
    public long Len;
    public long Hdr;
    public long Start;
    public long End;
    public ByteReader R = null!;
}

/// <summary>Registros OfficeArt ([MS-ODRAW] 2.1.1): cabeçalho de 8 bytes.</summary>
internal static class Records
{
    public static Rec? ReadRec(ByteReader r, long off, long? limitOpt = null)
    {
        long limit = limitOpt ?? r.Length;
        if (off + 8 > limit) return null;
        int vi = r.U16(off);
        long len = r.U32(off + 4);
        long start = off + 8;
        return new Rec
        {
            Ver = vi & 0xf, Inst = vi >> 4, Type = r.U16(off + 2), Len = len, Hdr = off,
            Start = start, End = Math.Min(limit, start + len), R = r,
        };
    }

    /// <summary>Registros consecutivos em [start, end). Para no primeiro cabeçalho inválido.</summary>
    public static List<Rec> RecsIn(ByteReader r, long start, long end)
    {
        var out_ = new List<Rec>();
        long off = start;
        while (off + 8 <= end)
        {
            var rec = ReadRec(r, off, end);
            if (rec is null) break;
            out_.Add(rec);
            if (rec.Start + rec.Len > end) break;
            off = rec.Start + rec.Len;
        }
        return out_;
    }

    public static List<Rec> Children(Rec rec) => RecsIn(rec.R, rec.Start, rec.End);
}

/// <summary>Tipos de registro OfficeArt usados aqui ([MS-ODRAW] 2.2).</summary>
internal static class OA
{
    public const int DggContainer = 0xf000;
    public const int BStoreContainer = 0xf001;
    public const int DgContainer = 0xf002;
    public const int SpgrContainer = 0xf003;
    public const int SpContainer = 0xf004;
    public const int FDGG = 0xf006;
    public const int FBSE = 0xf007;
    public const int FDG = 0xf008;
    public const int FSPGR = 0xf009;
    public const int FSP = 0xf00a;
    public const int FOPT = 0xf00b;
    public const int ChildAnchor = 0xf00f;
    public const int ClientAnchor = 0xf010;
    public const int ClientData = 0xf011;
    public const int ClientTextbox = 0xf00d;
    public const int SecondaryFOPT = 0xf121;
    public const int TertiaryFOPT = 0xf122;
    public const int BlipEMF = 0xf01a;
    public const int BlipWMF = 0xf01b;
    public const int BlipPICT = 0xf01c;
    public const int BlipJPEG = 0xf01d;
    public const int BlipPNG = 0xf01e;
    public const int BlipDIB = 0xf01f;
    public const int BlipTIFF = 0xf029;
    public const int BlipJPEGCMYK = 0xf02a;
}
