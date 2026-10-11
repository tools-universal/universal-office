namespace OfficeNext.DocBinary;

/// <summary>Faixa de FC com o grpprl de formatação direta (CHPX/PAPX).</summary>
internal sealed class FcRun
{
    public long FcStart;
    public long FcEnd;
    /// <summary>grpprl (sem o istd).</summary>
    public Bytes Grpprl;
    /// <summary>PAPX: estilo de parágrafo.</summary>
    public int Istd;
}

/// <summary>PLC genérico: (n+1) u32 + n estruturas de `cbData` bytes.</summary>
internal sealed class Plc
{
    public readonly List<long> Cps = new();
    public long N;
    public ByteReader R = null!;
    private long _base;
    private long _cbData;

    /// <summary>Offset (no buffer) da i-ésima estrutura.</summary>
    public long DataAt(long i) => _base + i * _cbData;

    /// <summary>cps[i] do JS: undefined fora da lista.</summary>
    public long? Cp(long i) => i >= 0 && i < Cps.Count ? Cps[(int)i] : null;

    public static Plc? Read(Bytes buf, long fc, long lcb, long cbData)
    {
        if (lcb == 0 || fc + lcb > buf.Length) return null;
        long n = cbData > 0 ? (long)Math.Floor((lcb - 4) / (double)(4 + cbData)) : (long)Math.Floor(lcb / 4.0) - 1;
        if (n < 0) return null;
        var r = new ByteReader(buf);
        var plc = new Plc { N = n, R = r, _base = fc + (n + 1) * 4, _cbData = cbData };
        for (long i = 0; i <= n; i++) plc.Cps.Add(r.U32(fc + i * 4));
        return plc;
    }
}

/// <summary>
/// Formatação direta ([MS-DOC] 2.4.6) — porta de fkp.ts: PlcBteChpx/PlcBtePapx
/// apontam para FKPs de 512 bytes; tudo vira uma lista plana ordenada por FC.
/// </summary>
internal static class Fkp
{
    /// <summary>Ordenação ESTÁVEL por fcStart (o sort do JS é estável).</summary>
    private static List<FcRun> SortRuns(List<FcRun> runs)
    {
        var sorted = runs.Select((r, i) => (r, i)).OrderBy(x => x.r.FcStart).ThenBy(x => x.i).Select(x => x.r).ToList();
        return sorted;
    }

    public static List<FcRun> ReadChpxRuns(Fib fib, Bytes table, Bytes word)
    {
        var (fc, lcb) = fib.FcLcb(FC.PlcfBteChpx);
        var plc = Plc.Read(table, fc, lcb, 4);
        if (plc is null) return new List<FcRun>();
        var w = new ByteReader(word);
        var runs = new List<FcRun>();
        var seen = new HashSet<long>();
        for (long i = 0; i < plc.N; i++)
        {
            long pn = plc.R.U32(plc.DataAt(i)) & 0x3fffff;
            if (!seen.Add(pn)) continue;
            long page = pn * 512;
            if (page + 512 > word.Length) continue;
            int crun = w.U8(page + 511);
            for (int k = 0; k < crun; k++)
            {
                long fcStart = w.U32(page + k * 4);
                long fcEnd = w.U32(page + (k + 1) * 4);
                int b = w.U8(page + (crun + 1) * 4 + k);
                Bytes grpprl = Bytes.Empty;
                if (b != 0)
                {
                    long at = page + b * 2;
                    int cb = w.U8(at);
                    grpprl = w.Sub(at + 1, Math.Min(at + 1 + cb, page + 511));
                }
                if (fcEnd > fcStart) runs.Add(new FcRun { FcStart = fcStart, FcEnd = fcEnd, Grpprl = grpprl, Istd = 0 });
            }
        }
        return SortRuns(runs);
    }

    /// <summary>PrcData no Data stream (sprmPHugePapx / sprmPTableProps): cbGrpprl (i16) + grpprl.</summary>
    private static Bytes PrcData(Bytes? data, long off)
    {
        if (data is null || off + 2 > data.Value.Length) return Bytes.Empty;
        var r = new ByteReader(data.Value);
        int cb = r.I16(off);
        return r.Sub(off + 2, off + 2 + Math.Max(0, cb));
    }

    /// <summary>Expande sprmPHugePapx (o grpprl real mora no Data stream).</summary>
    public static Bytes ExpandHugePapx(Bytes grpprl, Bytes? data)
    {
        foreach (var p in Sprms.Prls(grpprl))
        {
            if (p.Sprm == 0x6646 && data is not null)
            {
                var huge = PrcData(data, p.R.U32(p.Op));
                return huge.Length > 0 ? huge : grpprl;
            }
            break;
        }
        return grpprl;
    }

    public static List<FcRun> ReadPapxRuns(Fib fib, Bytes table, Bytes word, Bytes? data)
    {
        var (fc, lcb) = fib.FcLcb(FC.PlcfBtePapx);
        var plc = Plc.Read(table, fc, lcb, 4);
        if (plc is null) return new List<FcRun>();
        var w = new ByteReader(word);
        var runs = new List<FcRun>();
        var seen = new HashSet<long>();
        for (long i = 0; i < plc.N; i++)
        {
            long pn = plc.R.U32(plc.DataAt(i)) & 0x3fffff;
            if (!seen.Add(pn)) continue;
            long page = pn * 512;
            if (page + 512 > word.Length) continue;
            int cpara = w.U8(page + 511);
            for (int k = 0; k < cpara; k++)
            {
                long fcStart = w.U32(page + k * 4);
                long fcEnd = w.U32(page + (k + 1) * 4);
                int bOffset = w.U8(page + (cpara + 1) * 4 + k * 13);
                int istd = 0;
                Bytes grpprl = Bytes.Empty;
                if (bOffset != 0)
                {
                    long at = page + bOffset * 2;
                    int cb = w.U8(at);
                    long start = at + 1;
                    long size;
                    if (cb == 0) { cb = w.U8(at + 1); start = at + 2; size = cb * 2; } else size = cb * 2 - 1;
                    long end = Math.Min(start + size, page + 511);
                    istd = w.U16(start);
                    grpprl = ExpandHugePapx(w.Sub(start + 2, end), data);
                }
                if (fcEnd > fcStart) runs.Add(new FcRun { FcStart = fcStart, FcEnd = fcEnd, Grpprl = grpprl, Istd = istd });
            }
        }
        return SortRuns(runs);
    }

    /// <summary>Faixa que contém o FC (busca binária); null se nenhuma.</summary>
    public static FcRun? RunAt(List<FcRun> runs, double fc)
    {
        int lo = 0, hi = runs.Count - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            var r = runs[mid];
            if (fc < r.FcStart) hi = mid - 1;
            else if (fc >= r.FcEnd) lo = mid + 1;
            else return r;
        }
        return null;
    }

    /// <summary>Índice da primeira faixa com fcEnd &gt; fc.</summary>
    public static int RunIndexFrom(List<FcRun> runs, double fc)
    {
        int lo = 0, hi = runs.Count;
        while (lo < hi)
        {
            int mid = (lo + hi) >> 1;
            if (runs[mid].FcEnd <= fc) lo = mid + 1; else hi = mid;
        }
        return lo;
    }
}
