using System.Text;

namespace OfficeNext.DocBinary;

/// <summary>Peça da tabela de peças ([MS-DOC] 2.4.1).</summary>
internal sealed class Piece
{
    public long CpStart;
    public long CpEnd;
    /// <summary>Offset em bytes no WordDocument do 1º caractere (no JS pode ser fracionário: fc/2 ímpar).</summary>
    public double Fc;
    public bool Compressed;
    /// <summary>Prm (u16): sprm único (fComplex=0) ou índice de Prc (fComplex=1).</summary>
    public int Prm;
}

internal sealed class PieceTable
{
    public readonly List<Piece> Pieces = new();
    /// <summary>grpprls dos Prc do Clx (índice = igrpprl).</summary>
    public readonly List<Bytes> Prcs = new();
}

/// <summary>
/// Texto do .doc — porta de text.ts: tabela de peças (Clx → Pcdt → PlcPcd),
/// peças "comprimidas" (cp1252 com o mapeamento de 0x80-0x9F) ou UTF-16LE.
/// </summary>
internal static class DocText
{
    /// <summary>Mapeamento dos bytes "comprimidos" 0x80-0x9F ([MS-DOC] 2.4.1).</summary>
    private static readonly Dictionary<int, int> Cp1252High = new()
    {
        [0x82] = 0x201a, [0x83] = 0x0192, [0x84] = 0x201e, [0x85] = 0x2026, [0x86] = 0x2020, [0x87] = 0x2021,
        [0x88] = 0x02c6, [0x89] = 0x2030, [0x8a] = 0x0160, [0x8b] = 0x2039, [0x8c] = 0x0152, [0x91] = 0x2018,
        [0x92] = 0x2019, [0x93] = 0x201c, [0x94] = 0x201d, [0x95] = 0x2022, [0x96] = 0x2013, [0x97] = 0x2014,
        [0x98] = 0x02dc, [0x99] = 0x2122, [0x9a] = 0x0161, [0x9b] = 0x203a, [0x9c] = 0x0153, [0x9f] = 0x0178,
    };

    /// <summary>Byte de peça comprimida → caractere Unicode.</summary>
    public static int CompressedChar(int b) => Cp1252High.TryGetValue(b, out int c) ? c : b;

    public static PieceTable ReadPieceTable(Fib fib, Bytes table)
    {
        var (fc, lcb) = fib.FcLcb(FC.Clx);
        if (lcb == 0 || fc + lcb > table.Length)
            throw new DocFormatException("Arquivo .doc corrompido: tabela de peças (Clx) ausente.");
        var r = new ByteReader(table);
        long end = fc + lcb;
        long off = fc;
        var pt = new PieceTable();
        while (off < end && r.U8(off) == 0x01)
        {
            int cb = r.I16(off + 1);
            pt.Prcs.Add(r.Sub(off + 3, off + 3 + Math.Max(0, cb)));
            off += 3 + Math.Max(0, cb);
        }
        if (r.U8(off) != 0x02) throw new DocFormatException("Arquivo .doc corrompido: Pcdt ausente no Clx.");
        long lcbPlc = r.U32(off + 1);
        long plc = off + 5;
        long n = (long)Math.Floor((lcbPlc - 4) / 12.0);
        if (n <= 0) throw new DocFormatException("Arquivo .doc corrompido: tabela de peças vazia.");
        for (long i = 0; i < n; i++)
        {
            long cpStart = r.U32(plc + i * 4);
            long cpEnd = r.U32(plc + (i + 1) * 4);
            long pcd = plc + (n + 1) * 4 + i * 8;
            long fcRaw = r.U32(pcd + 2);
            bool compressed = (fcRaw & 0x40000000) != 0;
            long fcVal = fcRaw & 0x3fffffff;
            if (cpEnd <= cpStart) continue;
            pt.Pieces.Add(new Piece
            {
                CpStart = cpStart, CpEnd = cpEnd,
                Fc = compressed ? fcVal / 2.0 : fcVal,
                Compressed = compressed,
                Prm = r.U16(pcd + 6),
            });
        }
        return pt;
    }

    /// <summary>
    /// u8 no offset "do JS": offset fracionário lê undefined → caractere 0
    /// (String.fromCharCode(undefined)).
    /// </summary>
    private static int CharAt(ByteReader r, Piece p, long i)
    {
        if (p.Compressed)
        {
            double off = p.Fc + i;
            if (off != Math.Floor(off)) return 0;
            long o = (long)off;
            // JS: bytes[off] fora dos limites = 0 (u8 protege)
            return CompressedChar(r.U8(o));
        }
        double off2 = p.Fc + i * 2;
        if (off2 != Math.Floor(off2)) return 0;
        return r.U16((long)off2);
    }

    /// <summary>Texto completo (todas as histórias) como string indexada por CP.</summary>
    public static string DecodeText(PieceTable pt, Bytes word, long totalCp)
    {
        var r = new ByteReader(word);
        var sb = new StringBuilder();
        long cp = 0;
        foreach (var p in pt.Pieces)
        {
            if (p.CpStart >= totalCp) break;
            // lacunas na tabela de peças (corrompido): preenche com espaço
            while (cp < p.CpStart) { sb.Append(' '); cp++; }
            long end = Math.Min(p.CpEnd, totalCp);
            for (long c = p.CpStart; c < end; c++) sb.Append((char)CharAt(r, p, c - p.CpStart));
            cp = Math.Max(cp, end);
        }
        while (cp < totalCp) { sb.Append('\r'); cp++; }
        return sb.ToString();
    }

    /// <summary>Índice da peça que contém o CP (busca binária); -1 se fora.</summary>
    public static int PieceAt(List<Piece> pieces, long cp)
    {
        int lo = 0, hi = pieces.Count - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            var p = pieces[mid];
            if (cp < p.CpStart) hi = mid - 1;
            else if (cp >= p.CpEnd) lo = mid + 1;
            else return mid;
        }
        return -1;
    }
}
