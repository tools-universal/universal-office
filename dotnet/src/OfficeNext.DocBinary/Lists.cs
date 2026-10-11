namespace OfficeNext.DocBinary;

internal sealed class Lvl
{
    public int Start;
    public int Nfc;
    public int Jc;
    public bool Legal;
    public bool NoRestart;
    public int IlvlRestartLim;
    /// <summary>0 tab, 1 espaço, 2 nada.</summary>
    public int Follow;
    /// <summary>Texto do número: códigos 0-8 = marcador do nível N.</summary>
    public string Xst = "";
    /// <summary>Posições 1-based dos marcadores em xst.</summary>
    public List<int> RgbxchNums = new();
    public Bytes GrpprlPapx;
    public Bytes GrpprlChpx;
    public bool Tentative;
}

internal sealed class Lst
{
    public int Lsid;
    public int Tplc;
    public bool Simple;
    public bool Hybrid;
    /// <summary>istd do estilo vinculado a cada nível (0xFFF = nenhum).</summary>
    public List<int> RgistdPara = new();
    public List<Lvl> Levels = new();
}

internal sealed class LfoLvl
{
    public int Ilvl;
    public int? StartAt;
    public Lvl? Lvl;
}

internal sealed class Lfo
{
    public int Lsid;
    public List<LfoLvl> Overrides = new();
}

internal sealed class DocLists
{
    public List<Lst> Lsts = new();
    public List<Lfo> Lfos = new();
}

/// <summary>Listas ([MS-DOC] PlfLst/LSTF/LVL + PlfLfo/LFO/LFOData/LFOLVL) — porta de lists.ts.</summary>
internal static class Lists
{
    private static (Lvl Lvl, long Next) ReadLvl(ByteReader r, long off, long end)
    {
        int flags = r.U8(off + 5);
        var nums = new List<int>();
        for (int i = 0; i < 9; i++)
        {
            int v = r.U8(off + 6 + i);
            if (v == 0) break;
            nums.Add(v);
        }
        int cbChpx = r.U8(off + 24);
        int cbPapx = r.U8(off + 25);
        long o = off + 28;
        var grpprlPapx = r.Sub(o, Math.Min(o + cbPapx, end)); o += cbPapx;
        var grpprlChpx = r.Sub(o, Math.Min(o + cbChpx, end)); o += cbChpx;
        int cch = r.U16(o);
        string xst = r.Utf16(o + 2, Math.Min(cch, 0x100));
        o += 2 + cch * 2;
        return (new Lvl
        {
            Start = r.I32(off),
            Nfc = r.U8(off + 4),
            Jc = flags & 3,
            Legal = (flags & 4) != 0,
            NoRestart = (flags & 8) != 0,
            Tentative = (flags & 0x80) != 0,
            RgbxchNums = nums,
            Follow = r.U8(off + 15),
            IlvlRestartLim = r.U8(off + 26),
            GrpprlPapx = grpprlPapx,
            GrpprlChpx = grpprlChpx,
            Xst = xst,
        }, o);
    }

    public static DocLists Read(Fib fib, Bytes table)
    {
        var r = new ByteReader(table);
        var res = new DocLists();
        var lst = fib.FcLcb(FC.PlfLst);
        if (lst.Lcb != 0 && lst.Fc + lst.Lcb <= table.Length)
        {
            int cLst = r.I16(lst.Fc);
            long o = lst.Fc + 2;
            for (int i = 0; i < cLst; i++)
            {
                var rgistd = new List<int>();
                for (int k = 0; k < 9; k++) rgistd.Add(r.U16(o + 8 + k * 2));
                int flags = r.U8(o + 26);
                res.Lsts.Add(new Lst
                {
                    Lsid = r.I32(o), Tplc = r.I32(o + 4), RgistdPara = rgistd,
                    Simple = (flags & 1) != 0, Hybrid = (flags & 0x10) != 0,
                });
                o += 28;
            }
            // LVLs logo após o PlfLst (fora do lcb declarado)
            long lo = lst.Fc + lst.Lcb;
            foreach (var l in res.Lsts)
            {
                int n = l.Simple ? 1 : 9;
                for (int k = 0; k < n && lo + 28 <= table.Length; k++)
                {
                    var (lvl, next) = ReadLvl(r, lo, table.Length);
                    l.Levels.Add(lvl);
                    lo = next;
                }
            }
        }
        var lfo = fib.FcLcb(FC.PlfLfo);
        if (lfo.Lcb != 0 && lfo.Fc + lfo.Lcb <= table.Length)
        {
            long end = lfo.Fc + lfo.Lcb;
            long mac = r.U32(lfo.Fc);
            long o = lfo.Fc + 4;
            var counts = new List<int>();
            for (long i = 0; i < mac && o + 16 <= end; i++)
            {
                res.Lfos.Add(new Lfo { Lsid = r.I32(o) });
                counts.Add(r.U8(o + 12));
                o += 16;
            }
            // LFOData: cp (u32) + LFOLVL[clfolvl]
            for (int i = 0; i < res.Lfos.Count && o + 4 <= end; i++)
            {
                o += 4;
                for (int k = 0; k < counts[i]; k++)
                {
                    int iStartAt = r.I32(o);
                    long bits = r.U32(o + 4);
                    o += 8;
                    var ov = new LfoLvl { Ilvl = (int)(bits & 0xf) };
                    bool fStartAt = (bits & 0x10) != 0;
                    bool fFormatting = (bits & 0x20) != 0;
                    if (fStartAt && !fFormatting) ov.StartAt = iStartAt;
                    if (fFormatting)
                    {
                        var (lvl, next) = ReadLvl(r, o, end);
                        ov.Lvl = lvl;
                        if (fStartAt) ov.StartAt = lvl.Start;
                        o = next;
                    }
                    res.Lfos[i].Overrides.Add(ov);
                }
            }
        }
        return res;
    }
}
