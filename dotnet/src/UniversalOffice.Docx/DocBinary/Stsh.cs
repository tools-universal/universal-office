namespace UniversalOffice.DocBinary;

internal sealed class Stshif
{
    public int Cstd;
    public int CbSTDBaseInFile = 10;
    public bool StdStylenamesWritten = true;
    public int StiMaxWhenSaved;
    public int FtcAsci, FtcFE, FtcOther;
    /// <summary>Fonte padrão de scripts complexos (Stshi.ftcBi, logo após o Stshif).</summary>
    public int FtcBi;
}

internal sealed class DocStyle
{
    public int Istd;
    public int Sti;
    /// <summary>1 parágrafo, 2 caractere, 3 tabela, 4 numeração.</summary>
    public int Stk;
    public int IstdBase;
    public int IstdNext;
    public int? IstdLink;
    public string Name = "";
    public string? Aliases;
    public bool AutoRedef, Hidden, SemiHidden, Locked, UnhideWhenUsed, QFormat;
    public int? Priority;
    public Bytes? Papx, Chpx, Tapx;
}

internal sealed class StyleSheet
{
    public Stshif Stshif = new();
    public List<DocStyle?> Styles = new();

    public DocStyle? At(long istd) => istd >= 0 && istd < Styles.Count ? Styles[(int)istd] : null;
}

/// <summary>Folha de estilos ([MS-DOC] STSH) — porta de stsh.ts.</summary>
internal static class Stsh
{
    public const int ISTD_NIL = 0x0fff;

    public static StyleSheet Read(Fib fib, Bytes table)
    {
        var (fc, lcb) = fib.FcLcb(FC.Stshf);
        if (lcb == 0 || fc + lcb > table.Length) return new StyleSheet();
        var r = new ByteReader(table);
        long end = fc + lcb;
        int cbStshi = r.U16(fc);
        long s = fc + 2;
        int cbBase = r.U16(s + 2);
        var stshif = new Stshif
        {
            Cstd = r.U16(s),
            CbSTDBaseInFile = cbBase != 0 ? cbBase : 10,
            StdStylenamesWritten = (r.U16(s + 4) & 1) != 0,
            StiMaxWhenSaved = r.U16(s + 6),
            FtcAsci = r.U16(s + 12),
            FtcFE = r.U16(s + 14),
            FtcOther = r.U16(s + 16),
            FtcBi = cbStshi >= 20 ? r.U16(s + 18) : 0,
        };
        long off = s + cbStshi;
        var styles = new List<DocStyle?>();
        for (int istd = 0; istd < stshif.Cstd && off + 2 <= end; istd++)
        {
            int cbStd = r.U16(off);
            long std = off + 2;
            off = std + cbStd;
            if (((off - fc) & 1) != 0) off++; // LPStd em fronteira par
            if (cbStd == 0) { styles.Add(null); continue; }
            long stdEnd = Math.Min(std + cbStd, end);
            int w0 = r.U16(std), w1 = r.U16(std + 2), w2 = r.U16(std + 4);
            int grf = r.U16(std + 8);
            var st = new DocStyle
            {
                Istd = istd,
                Sti = w0 & 0x0fff,
                Stk = w1 & 0x0f,
                IstdBase = (w1 >> 4) & 0x0fff,
                IstdNext = (w2 >> 4) & 0x0fff,
                Name = "",
                AutoRedef = (grf & 0x0001) != 0,
                Hidden = (grf & 0x0002) != 0,
                SemiHidden = (grf & 0x0100) != 0,
                Locked = (grf & 0x0200) != 0,
                UnhideWhenUsed = (grf & 0x0800) != 0,
                QFormat = (grf & 0x1000) != 0,
            };
            int cupx = w2 & 0x0f;
            if (stshif.CbSTDBaseInFile >= 18)
            {
                int link = r.U16(std + 10) & 0x0fff;
                if (link != 0 && link != ISTD_NIL) st.IstdLink = link;
                st.Priority = (r.U16(std + 16) >> 4) & 0x0fff;
            }
            // nome: Xstz (cch u16 + UTF-16 + terminador)
            long o = std + stshif.CbSTDBaseInFile;
            int cch = r.U16(o);
            string full = r.Utf16(o + 2, cch);
            o += 2 + cch * 2 + 2;
            int comma = full.IndexOf(',');
            st.Name = comma >= 0 ? full[..comma] : full;
            if (comma >= 0) st.Aliases = full[(comma + 1)..];
            // UPXs, cada um com cbUpx (u16) e alinhado em fronteira par
            var upxs = new List<Bytes>();
            for (int k = 0; k < cupx && o + 2 <= stdEnd; k++)
            {
                int cbUpx = r.U16(o);
                upxs.Add(r.Sub(o + 2, Math.Min(o + 2 + cbUpx, stdEnd)));
                o += 2 + cbUpx;
                if (((o - std) & 1) != 0) o++;
            }
            // UpxPapx começa com istd (u16)
            Bytes? PapxOf(int i) => i < upxs.Count && upxs[i].Length >= 2 ? upxs[i].Sub(2) : null;
            Bytes? Upx(int i) => i < upxs.Count ? upxs[i] : null;
            if (st.Stk == 1) { st.Papx = PapxOf(0); st.Chpx = Upx(1); }
            else if (st.Stk == 2) { st.Chpx = Upx(0); }
            else if (st.Stk == 3) { st.Tapx = Upx(0); st.Papx = PapxOf(1); st.Chpx = Upx(2); }
            else if (st.Stk == 4) { st.Papx = PapxOf(0); }
            styles.Add(st);
        }
        return new StyleSheet { Stshif = stshif, Styles = styles };
    }
}

/// <summary>Estilo de parágrafo resolvido com a herança.</summary>
internal sealed class ResolvedStyle
{
    public Pap Pap = null!;
    public Chp Chp = null!;
    /// <summary>Delta próprio (o que o UPX do estilo toca), com valores finais.</summary>
    public HashSet<PapKey> OwnPap = new();
    public HashSet<ChpKey> OwnChp = new();
}

/// <summary>Resolução da herança de estilos (basedOn) — StyleResolver do stsh.ts.</summary>
internal sealed class StyleResolver
{
    public readonly StyleSheet Sheet;
    private readonly Dictionary<int, ResolvedStyle> _memo = new();
    private readonly Dictionary<int, List<Bytes>> _charMemo = new();
    public readonly Chp RootChp;

    public StyleResolver(StyleSheet sheet)
    {
        Sheet = sheet;
        var f = sheet.Stshif;
        RootChp = Chp.Default(f.FtcAsci, f.FtcFE, f.FtcOther);
        RootChp.Set(ChpKey.FtcBi, f.FtcBi);
    }

    public DocStyle? Style(long istd) => Sheet.At(istd);

    public ResolvedStyle Resolve(int istd, int depth = 0)
    {
        if (_memo.TryGetValue(istd, out var hit)) return hit;
        var st = Style(istd);
        ResolvedStyle parent;
        if (st is not null && st.IstdBase != Stsh.ISTD_NIL && st.IstdBase != istd && depth < 32 && Style(st.IstdBase) is not null)
        {
            parent = Resolve(st.IstdBase, depth + 1);
        }
        else
        {
            var pp = new Pap { Istd = istd };
            pp.Set(PapKey.WidowControl, true);
            parent = new ResolvedStyle { Pap = pp, Chp = RootChp.Clone() };
        }
        var pap = parent.Pap.Clone();
        pap.Istd = istd;
        pap.TabsCleared = new List<int>();
        var chp = parent.Chp.Clone();
        var ownPap = new HashSet<PapKey>();
        var ownChp = new HashSet<ChpKey>();
        if (st?.Papx is not null) foreach (var p in Sprms.Prls(st.Papx.Value)) PapApply.Apply(pap, p, ownPap);
        PapApply.PruneNoneBorders(pap, parent.Pap, ownPap);
        if (st?.Chpx is not null)
        {
            var ctx = new ChpCtx { Base = parent.Chp.Clone() };
            foreach (var p in Sprms.Prls(st.Chpx.Value)) if (p.Sprm != 0x4a30) ChpApply.Apply(chp, p, ctx, ownChp);
        }
        var res = new ResolvedStyle { Pap = pap, Chp = chp, OwnPap = ownPap, OwnChp = ownChp };
        _memo[istd] = res;
        return res;
    }

    /// <summary>grpprls da cadeia de um estilo de caractere (raiz → folha).</summary>
    private List<Bytes> CharChain(int istd)
    {
        if (_charMemo.TryGetValue(istd, out var hit)) return hit;
        var chain = new List<Bytes>();
        var seen = new HashSet<int>();
        int cur = istd;
        while (cur != Stsh.ISTD_NIL && !seen.Contains(cur) && chain.Count < 32)
        {
            seen.Add(cur);
            var st = Style(cur);
            if (st is null || st.Stk != 2) break;
            if (st.Chpx is not null) chain.Insert(0, st.Chpx.Value);
            cur = st.IstdBase;
        }
        _charMemo[istd] = chain;
        return chain;
    }

    /// <summary>CHP de um estilo de caractere aplicado sobre o CHP do parágrafo.</summary>
    public Chp ApplyCharStyle(int istd, Chp onTop)
    {
        var chp = onTop.Clone();
        foreach (var g in CharChain(istd))
        {
            var ctx = new ChpCtx { Base = chp.Clone() };
            var dummy = new HashSet<ChpKey>();
            foreach (var p in Sprms.Prls(g)) if (p.Sprm != 0x4a30) ChpApply.Apply(chp, p, ctx, dummy);
        }
        chp.Istd = istd;
        return chp;
    }

    /// <summary>Delta próprio de um estilo de caractere (contra o pai na cadeia).</summary>
    public (Chp Chp, HashSet<ChpKey> Own) ResolveChar(int istd)
    {
        var st = Style(istd);
        var parentChp = st is not null && st.IstdBase != Stsh.ISTD_NIL && st.IstdBase != istd
            ? ApplyCharStyle(st.IstdBase, RootChp)
            : RootChp.Clone();
        var chp = parentChp.Clone();
        var own = new HashSet<ChpKey>();
        if (st?.Chpx is not null)
        {
            var ctx = new ChpCtx { Base = parentChp.Clone() };
            foreach (var p in Sprms.Prls(st.Chpx.Value)) if (p.Sprm != 0x4a30) ChpApply.Apply(chp, p, ctx, own);
        }
        return (chp, own);
    }
}
