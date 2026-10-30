namespace UniversalOffice.DocBinary;

/// <summary>Borda ([MS-DOC] Brc80/Brc).</summary>
internal sealed class Brc
{
    /// <summary>0xRRGGBB ou AUTO (-1).</summary>
    public int Color;
    /// <summary>Largura em 1/8 pt.</summary>
    public int Width;
    /// <summary>BrcType. 0 = nenhuma; 0xFF = nil.</summary>
    public int Type;
    /// <summary>Distância ao texto, em pontos.</summary>
    public int Space;
    public bool Shadow;
    public bool Frame;
    /// <summary>
    /// Origem (Brc de 8 bytes × Brc80): no JS as chaves do objeto saem em ordem
    /// diferente e o JSON.stringify das comparações distingue as duas.
    /// </summary>
    public bool IsNew;

    public bool JsonEquals(Brc? o) =>
        o is not null && o.IsNew == IsNew && o.Color == Color && o.Width == Width && o.Type == Type &&
        o.Space == Space && o.Shadow == Shadow && o.Frame == Frame;
}

/// <summary>Sombreamento (SHD80/SHD).</summary>
internal sealed class Shd
{
    public int Fore;
    public int Back;
    /// <summary>Ipat. 0xFFFF = nil.</summary>
    public int Pat;

    public bool JsonEquals(Shd? o) => o is not null && o.Fore == Fore && o.Back == Back && o.Pat == Pat;
}

internal sealed class SymbolChar
{
    public int Ftc;
    public int Xchar;
}

internal sealed class TabStop
{
    public int Pos;
    /// <summary>0 esquerda, 1 centro, 2 direita, 3 decimal, 4 barra, 6 lista.</summary>
    public int Jc;
    /// <summary>0 nenhum, 1 pontos, 2 hífens, 3 linha, 4 grossa, 5 ponto médio.</summary>
    public int Tlc;
}

internal sealed class LineSpacing
{
    public int Line;
    public bool Mult;
}

internal static class PropUtil
{
    /// <summary>Cor automática.</summary>
    public const int AUTO = -1;

    /// <summary>Ico ([MS-DOC] 2.9.119) → cor.</summary>
    private static readonly int[] IcoRgb =
    {
        AUTO, 0x000000, 0x0000ff, 0x00ffff, 0x00ff00, 0xff00ff, 0xff0000, 0xffff00,
        0xffffff, 0x000080, 0x008080, 0x008000, 0x800080, 0x800000, 0x808000, 0x808080, 0xc0c0c0,
    };

    public static int IcoColor(int ico) => ico >= 0 && ico < IcoRgb.Length ? IcoRgb[ico] : AUTO;

    /// <summary>COLORREF (r, g, b, fAuto) → cor.</summary>
    public static int ColorRef(long v)
    {
        if ((v >> 24) == 0xff) return AUTO;
        long r = v & 0xff, g = (v >> 8) & 0xff, b = (v >> 16) & 0xff;
        return (int)((r << 16) | (g << 8) | b);
    }

    /// <summary>Brc80 (4 bytes). 0xFFFFFFFF = nil.</summary>
    public static Brc? Brc80(ByteReader r, long off)
    {
        long v = r.U32(off);
        if (v == 0xffffffff) return null;
        int flags = r.U8(off + 3);
        return new Brc
        {
            Width = r.U8(off), Type = r.U8(off + 1), Color = IcoColor(r.U8(off + 2)),
            Space = flags & 0x1f, Shadow = (flags & 0x20) != 0, Frame = (flags & 0x40) != 0, IsNew = false,
        };
    }

    /// <summary>Brc (8 bytes): cv, dptLineWidth, brcType, dptSpace/flags.</summary>
    public static Brc? BrcNew(ByteReader r, long off)
    {
        if (r.U32(off) == 0xffffffff && r.U32(off + 4) == 0xffffffff) return null;
        int flags = r.U16(off + 6);
        return new Brc
        {
            Color = ColorRef(r.U32(off)), Width = r.U8(off + 4), Type = r.U8(off + 5),
            Space = flags & 0x1f, Shadow = (flags & 0x20) != 0, Frame = (flags & 0x40) != 0, IsNew = true,
        };
    }

    /// <summary>SHD80 (u16): icoFore 5 bits, icoBack 5 bits, ipat 6 bits.</summary>
    public static Shd Shd80(int v)
    {
        int pat = (v >> 10) & 0x3f;
        return new Shd { Fore = IcoColor(v & 0x1f), Back = IcoColor((v >> 5) & 0x1f), Pat = pat == 0x3f ? 0xffff : pat };
    }

    /// <summary>SHD (10 bytes): cvFore, cvBack, ipat.</summary>
    public static Shd ShdNew(ByteReader r, long off) =>
        new() { Fore = ColorRef(r.U32(off)), Back = ColorRef(r.U32(off + 4)), Pat = r.U16(off + 8) };

    /// <summary>Borda "nenhuma" (ausente, brcType 0 ou nil).</summary>
    public static bool BrcNone(Brc? b) => b is null || b.Type == 0 || b.Type == 0xff;

    /// <summary>Igualdade "JSON.stringify(a) === JSON.stringify(b)" dos valores de propriedade.</summary>
    public static bool JsonEq(object? a, object? b)
    {
        if (a is null || b is null) return a is null && b is null;
        return a switch
        {
            bool x => b is bool y && x == y,
            int x => (b is int y && x == y) || (b is long z && x == z),
            long x => (b is long y && x == y) || (b is int z && x == z),
            Brc x => b is Brc y && x.JsonEquals(y),
            Shd x => b is Shd y && x.JsonEquals(y),
            SymbolChar x => b is SymbolChar y && x.Ftc == y.Ftc && x.Xchar == y.Xchar,
            _ => Equals(a, b),
        };
    }
}

// ───────────────────────────── caractere ─────────────────────────────

internal enum ChpKey
{
    Bold, Italic, Strike, Dstrike, Outline, Shadow, Emboss, Imprint, SmallCaps, Caps, Vanish, SpecVanish, WebHidden,
    BoldBi, ItalicBi, Rtl, Cs, NoProof, Kul, CvUl, Hps, HpsBi, HpsPos, HpsKern, Ico, Cv, Highlight, Iss, DxaSpace,
    CharScale, Kcd, FtcAscii, FtcFE, FtcOther, FtcBi, Lid, LidFE, LidBi, Istd, FSpec, FData, FOle2, FObj,
    PicLocation, Symbol, Shd, Brc, RmarkDel, RmarkIns, IbstRMark, DttmRMark, IbstRMarkDel, DttmRMarkDel,
    FldVanish, IdctHint, SfxText,
}

/// <summary>
/// CHP — porta do objeto Chp do JS: cada chave pode estar ausente (null). Os
/// valores ficam num vetor por chave (bool/int/long/Brc/Shd/SymbolChar).
/// </summary>
internal sealed class Chp
{
    private const int Count = (int)ChpKey.SfxText + 1;
    private object?[] _v = new object?[Count];

    public object? Get(ChpKey k) => _v[(int)k];
    public void Set(ChpKey k, object? v) => _v[(int)k] = v;
    public void Delete(ChpKey k) => _v[(int)k] = null;

    public Chp Clone() => new() { _v = (object?[])_v.Clone() };

    /// <summary>Esvazia e copia `src` (setAll do JS).</summary>
    public void CopyFrom(Chp src) => _v = (object?[])src._v.Clone();

    public bool? B(ChpKey k) => (bool?)_v[(int)k];
    public int? I(ChpKey k) => _v[(int)k] is int i ? i : null;
    public long? L(ChpKey k) => _v[(int)k] switch { long l => l, int i => i, _ => null };

    public bool? Bold => B(ChpKey.Bold);
    public bool? Vanish => B(ChpKey.Vanish);
    public bool? FSpec => B(ChpKey.FSpec);
    public bool? FData => B(ChpKey.FData);
    public bool? FOle2 => B(ChpKey.FOle2);
    public bool? RmarkIns => B(ChpKey.RmarkIns);
    public bool? RmarkDel => B(ChpKey.RmarkDel);
    public int? Istd { get => I(ChpKey.Istd); set => _v[(int)ChpKey.Istd] = value; }
    public int? PicLocation => I(ChpKey.PicLocation);
    public SymbolChar? Symbol => (SymbolChar?)_v[(int)ChpKey.Symbol];
    public Brc? Brc => (Brc?)_v[(int)ChpKey.Brc];
    public Shd? Shd => (Shd?)_v[(int)ChpKey.Shd];
    public int? IbstRMark => I(ChpKey.IbstRMark);
    public long? DttmRMark => L(ChpKey.DttmRMark);
    public int? IbstRMarkDel => I(ChpKey.IbstRMarkDel);
    public long? DttmRMarkDel => L(ChpKey.DttmRMarkDel);

    /// <summary>CHP padrão de um documento (antes de qualquer estilo).</summary>
    public static Chp Default(int ftcAscii, int ftcFE, int ftcOther)
    {
        var c = new Chp();
        c.Set(ChpKey.Hps, 20); c.Set(ChpKey.HpsBi, 20);
        c.Set(ChpKey.FtcAscii, ftcAscii); c.Set(ChpKey.FtcFE, ftcFE); c.Set(ChpKey.FtcOther, ftcOther);
        c.Set(ChpKey.FtcBi, 0);
        c.Set(ChpKey.Lid, 0x0400); c.Set(ChpKey.LidFE, 0x0400); c.Set(ChpKey.LidBi, 0x0400);
        c.Set(ChpKey.Istd, 10);
        return c;
    }
}

/// <summary>Contexto de aplicação de sprms de caractere.</summary>
internal sealed class ChpCtx
{
    /// <summary>Valores do estilo (para toggles 0x80/0x81).</summary>
    public Chp Base = new();
    /// <summary>sprmCIstd: devolve o CHP do estilo de caractere aplicado sobre o do parágrafo.</summary>
    public Func<int, Chp>? ApplyCharStyle;
    /// <summary>sprmCPlain: CHP do estilo de parágrafo.</summary>
    public Chp? ParaStyle;
}

internal static class ChpApply
{
    private static readonly Dictionary<int, ChpKey> Toggles = new()
    {
        [0x0835] = ChpKey.Bold, [0x0836] = ChpKey.Italic, [0x0837] = ChpKey.Strike, [0x0838] = ChpKey.Outline,
        [0x0839] = ChpKey.Shadow, [0x083a] = ChpKey.SmallCaps, [0x083b] = ChpKey.Caps, [0x083c] = ChpKey.Vanish,
        [0x0858] = ChpKey.Emboss, [0x0854] = ChpKey.Imprint, [0x085c] = ChpKey.BoldBi, [0x085d] = ChpKey.ItalicBi,
    };

    /// <summary>Aplica um Prl de caractere (sprms de outras classes são ignorados).</summary>
    public static void Apply(Chp chp, Prl p, ChpCtx ctx, HashSet<ChpKey> touched)
    {
        void T(ChpKey k) => touched.Add(k);
        if (Toggles.TryGetValue(p.Sprm, out var tog))
        {
            int v = p.U8;
            bool baseV = ctx.Base.Get(tog) is bool bb && bb;
            chp.Set(tog, v == 0x80 ? baseV : v == 0x81 ? !baseV : v != 0);
            T(tog);
            return;
        }
        switch (p.Sprm)
        {
            case 0x0800: chp.Set(ChpKey.RmarkDel, p.U8 != 0); T(ChpKey.RmarkDel); break;
            case 0x0801: chp.Set(ChpKey.RmarkIns, p.U8 != 0); T(ChpKey.RmarkIns); break;
            case 0x0802: chp.Set(ChpKey.FldVanish, p.U8 != 0); T(ChpKey.FldVanish); break;
            case 0x6a03: chp.Set(ChpKey.PicLocation, p.I32); T(ChpKey.PicLocation); break;
            case 0x4804: chp.Set(ChpKey.IbstRMark, p.U16); break;
            case 0x6805: chp.Set(ChpKey.DttmRMark, p.U32); break;
            case 0x0806: chp.Set(ChpKey.FData, p.U8 != 0); T(ChpKey.FData); break;
            case 0x6a09: chp.Set(ChpKey.Symbol, new SymbolChar { Ftc = p.R.U16(p.Op), Xchar = p.R.U16(p.Op + 2) }); T(ChpKey.Symbol); break;
            case 0x080a: chp.Set(ChpKey.FOle2, p.U8 != 0); T(ChpKey.FOle2); break;
            case 0x2a0c: chp.Set(ChpKey.Highlight, p.U8); T(ChpKey.Highlight); break;
            case 0x0811: chp.Set(ChpKey.WebHidden, p.U8 != 0); T(ChpKey.WebHidden); break;
            case 0x0818: chp.Set(ChpKey.SpecVanish, p.U8 != 0); T(ChpKey.SpecVanish); break;
            case 0x4a30: // sprmCIstd
            {
                int istd = p.U16;
                if (ctx.ApplyCharStyle is not null)
                {
                    var st = ctx.ApplyCharStyle(istd);
                    chp.CopyFrom(st);
                    ctx.Base = st.Clone();
                    touched.Clear();
                }
                chp.Istd = istd;
                T(ChpKey.Istd);
                break;
            }
            case 0x2a33: // sprmCPlain
                if (ctx.ParaStyle is not null)
                {
                    chp.CopyFrom(ctx.ParaStyle);
                    ctx.Base = ctx.ParaStyle.Clone();
                    touched.Clear();
                }
                break;
            case 0x2a34: chp.Set(ChpKey.Kcd, p.U8); T(ChpKey.Kcd); break;
            case 0x2a3e: chp.Set(ChpKey.Kul, p.U8); T(ChpKey.Kul); break;
            case 0x8840: chp.Set(ChpKey.DxaSpace, p.I16); T(ChpKey.DxaSpace); break;
            case 0x2a42: chp.Set(ChpKey.Ico, p.U8); chp.Delete(ChpKey.Cv); T(ChpKey.Ico); touched.Remove(ChpKey.Cv); break;
            case 0x4a43: chp.Set(ChpKey.Hps, p.U16); T(ChpKey.Hps); break;
            case 0x2a44: chp.Set(ChpKey.Hps, Math.Max(2, (chp.I(ChpKey.Hps) ?? 20) + p.R.I8(p.Op) * 2)); T(ChpKey.Hps); break;
            case 0x4845: chp.Set(ChpKey.HpsPos, p.I16); T(ChpKey.HpsPos); break;
            case 0x2a48: chp.Set(ChpKey.Iss, p.U8); T(ChpKey.Iss); break;
            case 0x484b: chp.Set(ChpKey.HpsKern, p.U16); T(ChpKey.HpsKern); break;
            case 0x4a4f: chp.Set(ChpKey.FtcAscii, p.U16); T(ChpKey.FtcAscii); break;
            case 0x4a50: chp.Set(ChpKey.FtcFE, p.U16); T(ChpKey.FtcFE); break;
            case 0x4a51: chp.Set(ChpKey.FtcOther, p.U16); T(ChpKey.FtcOther); break;
            case 0x4852: chp.Set(ChpKey.CharScale, p.U16); T(ChpKey.CharScale); break;
            case 0x2a53: chp.Set(ChpKey.Dstrike, p.U8 != 0); T(ChpKey.Dstrike); break;
            case 0x0855: chp.Set(ChpKey.FSpec, p.U8 != 0); T(ChpKey.FSpec); break;
            case 0x0856: chp.Set(ChpKey.FObj, p.U8 != 0); T(ChpKey.FObj); break;
            case 0x2859: chp.Set(ChpKey.SfxText, p.U8); T(ChpKey.SfxText); break;
            case 0x085a: chp.Set(ChpKey.Rtl, p.U8 != 0); T(ChpKey.Rtl); break;
            case 0x4a5e: chp.Set(ChpKey.FtcBi, p.U16); T(ChpKey.FtcBi); break;
            case 0x485f: chp.Set(ChpKey.LidBi, p.U16); T(ChpKey.LidBi); break;
            case 0x4a60: break; // sprmCIcoBi
            case 0x4a61: chp.Set(ChpKey.HpsBi, p.U16); T(ChpKey.HpsBi); break;
            case 0x4863: chp.Set(ChpKey.IbstRMarkDel, p.U16); break;
            case 0x6864: chp.Set(ChpKey.DttmRMarkDel, p.U32); break;
            case 0x6865: { var b = PropUtil.Brc80(p.R, p.Op); if (b is not null) chp.Set(ChpKey.Brc, b); else chp.Delete(ChpKey.Brc); T(ChpKey.Brc); break; }
            case 0x4866: chp.Set(ChpKey.Shd, PropUtil.Shd80(p.U16)); T(ChpKey.Shd); break;
            case 0x286f: chp.Set(ChpKey.IdctHint, p.U8); T(ChpKey.IdctHint); break;
            case 0x6870:
            {
                // cvAuto depois de sprmCIco: o Word mantém a cor do ico (medido no Word)
                int cv = PropUtil.ColorRef(p.U32);
                if (cv == PropUtil.AUTO)
                {
                    chp.Delete(ChpKey.Cv);
                    touched.Remove(ChpKey.Cv);
                    if (!touched.Contains(ChpKey.Ico)) { chp.Set(ChpKey.Ico, 0); T(ChpKey.Ico); }
                }
                else { chp.Set(ChpKey.Cv, cv); T(ChpKey.Cv); }
                break;
            }
            case 0xca71: chp.Set(ChpKey.Shd, PropUtil.ShdNew(p.R, p.Op)); T(ChpKey.Shd); break;
            case 0xca72: { var b = PropUtil.BrcNew(p.R, p.Op); if (b is not null) chp.Set(ChpKey.Brc, b); else chp.Delete(ChpKey.Brc); T(ChpKey.Brc); break; }
            case 0x486d: case 0x4873: chp.Set(ChpKey.Lid, p.U16); T(ChpKey.Lid); break;
            case 0x486e: case 0x4874: chp.Set(ChpKey.LidFE, p.U16); T(ChpKey.LidFE); break;
            case 0x0875: chp.Set(ChpKey.NoProof, p.U8 != 0); T(ChpKey.NoProof); break;
            case 0x6877: chp.Set(ChpKey.CvUl, PropUtil.ColorRef(p.U32)); T(ChpKey.CvUl); break;
            case 0x0882: chp.Set(ChpKey.Cs, p.U8 != 0); T(ChpKey.Cs); break;
            case 0xca47: // sprmCMajority: propriedades iguais às do grpprl voltam ao estilo
            {
                if (ctx.ParaStyle is null) break;
                var probe = new Chp();
                var sub = p.R.Sub(p.Op, p.Op + p.Len);
                // HashSet preserva a ordem de inserção sem remoções; aqui a ordem não importa
                var dummy = new HashSet<ChpKey>();
                foreach (var q in Sprms.Prls(sub)) Apply(probe, q, new ChpCtx { Base = new Chp() }, dummy);
                foreach (var k in dummy)
                {
                    if (PropUtil.JsonEq(chp.Get(k), probe.Get(k)))
                    {
                        chp.Set(k, ctx.ParaStyle.Get(k));
                        touched.Remove(k);
                    }
                }
                break;
            }
        }
    }
}

// ───────────────────────────── parágrafo ─────────────────────────────

internal enum PapKey
{
    Istd, Jc, DxaLeft, DxaRight, DxaLeft1, DxcLeft, DxcRight, DxcLeft1, DyaBefore, DyaAfter, BeforeAuto, AfterAuto,
    DylBefore, DylAfter, LineSpacing, Keep, KeepFollow, PageBreakBefore, WidowControl, NoLineNumb, NoAutoHyph,
    ContextualSpacing, MirrorIndents, Kinsoku, WordWrap, OverflowPunct, TopLinePunct, AutoSpaceDE, AutoSpaceDN,
    Bidi, AdjustRight, UsePgsuSettings, WAlignFont, Ilfo, Ilvl, OutLvl, Tabs, TabsCleared, BrcTop, BrcLeft,
    BrcBottom, BrcRight, BrcBetween, BrcBar, Shd, InTable, Ttp, Itap, InnerTableCell, InnerTtp, DxaAbs, DyaAbs,
    DxaWidth, Pc, Wr, WHeightAbs, DyaFromText, DxaFromText, FrameLocked, Dcs,
}

/// <summary>PAP — porta do objeto Pap do JS (chaves opcionais num vetor).</summary>
internal sealed class Pap
{
    private const int Count = (int)PapKey.Dcs + 1;
    private object?[] _v = new object?[Count];

    public Pap() { _v[(int)PapKey.Istd] = 0; }

    public object? Get(PapKey k) => _v[(int)k];
    public void Set(PapKey k, object? v) => _v[(int)k] = v;
    public void Delete(PapKey k) => _v[(int)k] = null;
    public Pap Clone() => new() { _v = (object?[])_v.Clone() };

    public bool? B(PapKey k) => (bool?)_v[(int)k];
    public int? I(PapKey k) => _v[(int)k] is int i ? i : null;

    public int Istd { get => (int)_v[(int)PapKey.Istd]!; set => _v[(int)PapKey.Istd] = value; }
    public List<TabStop>? Tabs { get => (List<TabStop>?)_v[(int)PapKey.Tabs]; set => _v[(int)PapKey.Tabs] = value; }
    public List<int>? TabsCleared { get => (List<int>?)_v[(int)PapKey.TabsCleared]; set => _v[(int)PapKey.TabsCleared] = value; }
    public LineSpacing? LineSpacing => (LineSpacing?)_v[(int)PapKey.LineSpacing];
    public Shd? Shd => (Shd?)_v[(int)PapKey.Shd];
    public Brc? BrcOf(PapKey k) => (Brc?)_v[(int)k];
    public bool? InTable => B(PapKey.InTable);
    public bool? Ttp => B(PapKey.Ttp);
    public int? Itap => I(PapKey.Itap);
    public bool? InnerTableCell => B(PapKey.InnerTableCell);
    public bool? InnerTtp => B(PapKey.InnerTtp);
    public int? OutLvl => I(PapKey.OutLvl);
}

internal static class PapApply
{
    /// <summary>Aplica sprmPChgTabs/sprmPChgTabsPapx: remove posições e acrescenta tabs.</summary>
    private static void ChgTabs(Pap pap, Prl p, bool withClose)
    {
        var r = p.R;
        long o = p.Op;
        int cDel = r.U8(o); o += 1;
        var dels = new List<int>();
        for (int i = 0; i < cDel; i++) dels.Add(r.I16(o + i * 2));
        // sprmPChgTabs: rgdxaClose (tolerância) segue os deletes
        var closes = new List<int>();
        if (withClose) for (int i = 0; i < cDel; i++) closes.Add(r.I16(o + cDel * 2 + i * 2));
        o += cDel * 2 * (withClose ? 2 : 1);
        int cAdd = r.U8(o); o += 1;
        var adds = new List<TabStop>();
        for (int i = 0; i < cAdd; i++)
        {
            int tbd = r.U8(o + cAdd * 2 + i);
            adds.Add(new TabStop { Pos = r.I16(o + i * 2), Jc = tbd & 7, Tlc = (tbd >> 3) & 7 });
        }
        var tabs = pap.Tabs is not null ? new List<TabStop>(pap.Tabs) : new List<TabStop>();
        // Set do JS: ordem de inserção (re-inserção de um removido vai para o fim)
        var cleared = new List<int>();
        foreach (int c in pap.TabsCleared ?? new List<int>()) if (!cleared.Contains(c)) cleared.Add(c);
        for (int i = 0; i < dels.Count; i++)
        {
            int d = dels[i];
            int tol = withClose ? Math.Abs(i < closes.Count ? closes[i] : 0) : 0;
            int before = tabs.Count;
            tabs = tabs.Where(tb => Math.Abs(tb.Pos - d) > tol).ToList();
            if (tabs.Count != before || !withClose) { if (!cleared.Contains(d)) cleared.Add(d); }
        }
        foreach (var a in adds)
        {
            tabs = tabs.Where(tb => tb.Pos != a.Pos).ToList();
            tabs.Add(a);
            cleared.Remove(a.Pos);
        }
        // a ordem gravada é mantida (o Word não reordena ao converter)
        pap.Tabs = tabs;
        pap.TabsCleared = cleared;
    }

    private static LineSpacing Lspd(Prl p) => new() { Line = p.R.I16(p.Op), Mult = p.R.I16(p.Op + 2) != 0 };

    private static void SetBrc(Pap pap, PapKey k, Brc? b)
    {
        if (b is not null) pap.Set(k, b); else pap.Delete(k);
    }

    public static void Apply(Pap pap, Prl p, HashSet<PapKey> touched)
    {
        void T(PapKey k) => touched.Add(k);
        bool B8() => p.U8 != 0;
        switch (p.Sprm)
        {
            case 0x4600: pap.Istd = p.U16; break;
            case 0x2602: // sprmPIncLvl
            {
                int d = p.R.I8(p.Op);
                if (pap.Istd >= 1 && pap.Istd <= 9) pap.Istd = Math.Min(9, Math.Max(1, pap.Istd + d));
                else if ((pap.OutLvl ?? 9) != 9) { pap.Set(PapKey.OutLvl, Math.Min(9, Math.Max(0, (pap.OutLvl ?? 9) + d))); T(PapKey.OutLvl); }
                break;
            }
            case 0x2403: if (!touched.Contains(PapKey.Jc) || pap.Get(PapKey.Jc) is null) { pap.Set(PapKey.Jc, p.U8); T(PapKey.Jc); } break;
            case 0x2461: pap.Set(PapKey.Jc, p.U8); T(PapKey.Jc); break;
            case 0x2405: pap.Set(PapKey.Keep, B8()); T(PapKey.Keep); break;
            case 0x2406: pap.Set(PapKey.KeepFollow, B8()); T(PapKey.KeepFollow); break;
            case 0x2407: pap.Set(PapKey.PageBreakBefore, B8()); T(PapKey.PageBreakBefore); break;
            case 0x260a: pap.Set(PapKey.Ilvl, p.U8); T(PapKey.Ilvl); break;
            case 0x460b: pap.Set(PapKey.Ilfo, p.I16); T(PapKey.Ilfo); break;
            case 0x240c: pap.Set(PapKey.NoLineNumb, B8()); T(PapKey.NoLineNumb); break;
            case 0xc60d: ChgTabs(pap, p, false); T(PapKey.Tabs); break;
            case 0xc615: ChgTabs(pap, p, true); T(PapKey.Tabs); break;
            case 0x840e: case 0x845d: pap.Set(PapKey.DxaRight, p.I16); T(PapKey.DxaRight); pap.Delete(PapKey.DxcRight); break;
            case 0x840f: case 0x845e: pap.Set(PapKey.DxaLeft, p.I16); T(PapKey.DxaLeft); pap.Delete(PapKey.DxcLeft); break;
            case 0x4610: case 0x465f: pap.Set(PapKey.DxaLeft, (pap.I(PapKey.DxaLeft) ?? 0) + p.I16); T(PapKey.DxaLeft); break;
            case 0x8411: case 0x8460: pap.Set(PapKey.DxaLeft1, p.I16); T(PapKey.DxaLeft1); pap.Delete(PapKey.DxcLeft1); break;
            case 0x4456: pap.Set(PapKey.DxcLeft, p.I16); T(PapKey.DxcLeft); break;
            case 0x4455: pap.Set(PapKey.DxcRight, p.I16); T(PapKey.DxcRight); break;
            case 0x4457: pap.Set(PapKey.DxcLeft1, p.I16); T(PapKey.DxcLeft1); break;
            case 0x6412: pap.Set(PapKey.LineSpacing, Lspd(p)); T(PapKey.LineSpacing); break;
            case 0xa413: pap.Set(PapKey.DyaBefore, p.U16); T(PapKey.DyaBefore); break;
            case 0xa414: pap.Set(PapKey.DyaAfter, p.U16); T(PapKey.DyaAfter); break;
            case 0x4458: pap.Set(PapKey.DylBefore, p.I16); T(PapKey.DylBefore); break;
            case 0x4459: pap.Set(PapKey.DylAfter, p.I16); T(PapKey.DylAfter); break;
            case 0x245b: pap.Set(PapKey.BeforeAuto, B8()); T(PapKey.BeforeAuto); break;
            case 0x245c: pap.Set(PapKey.AfterAuto, B8()); T(PapKey.AfterAuto); break;
            case 0x2416: pap.Set(PapKey.InTable, B8()); break;
            case 0x2417: pap.Set(PapKey.Ttp, B8()); break;
            case 0x6649: pap.Set(PapKey.Itap, p.I32); break;
            case 0x664a: pap.Set(PapKey.Itap, (int)Math.Max(0, (long)(pap.Itap ?? 0) + p.I32)); break;
            case 0x244b: pap.Set(PapKey.InnerTableCell, B8()); break;
            case 0x244c: pap.Set(PapKey.InnerTtp, B8()); break;
            case 0x8418: pap.Set(PapKey.DxaAbs, p.I16); T(PapKey.DxaAbs); break;
            case 0x8419: pap.Set(PapKey.DyaAbs, p.I16); T(PapKey.DyaAbs); break;
            case 0x841a: pap.Set(PapKey.DxaWidth, p.I16); T(PapKey.DxaWidth); break;
            case 0x261b: pap.Set(PapKey.Pc, p.U8); T(PapKey.Pc); break;
            case 0x2423: pap.Set(PapKey.Wr, p.U8); T(PapKey.Wr); break;
            case 0x442b: pap.Set(PapKey.WHeightAbs, p.U16); T(PapKey.WHeightAbs); break;
            case 0x442c: pap.Set(PapKey.Dcs, p.U16); T(PapKey.Dcs); break;
            case 0x842e: pap.Set(PapKey.DyaFromText, p.I16); T(PapKey.DyaFromText); break;
            case 0x842f: pap.Set(PapKey.DxaFromText, p.I16); T(PapKey.DxaFromText); break;
            case 0x2430: pap.Set(PapKey.FrameLocked, B8()); T(PapKey.FrameLocked); break;
            case 0x6424: SetBrc(pap, PapKey.BrcTop, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcTop); break;
            case 0x6425: SetBrc(pap, PapKey.BrcLeft, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcLeft); break;
            case 0x6426: SetBrc(pap, PapKey.BrcBottom, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcBottom); break;
            case 0x6427: SetBrc(pap, PapKey.BrcRight, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcRight); break;
            case 0x6428: SetBrc(pap, PapKey.BrcBetween, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcBetween); break;
            case 0x6629: SetBrc(pap, PapKey.BrcBar, PropUtil.Brc80(p.R, p.Op)); T(PapKey.BrcBar); break;
            case 0xc64e: SetBrc(pap, PapKey.BrcTop, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcTop); break;
            case 0xc64f: SetBrc(pap, PapKey.BrcLeft, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcLeft); break;
            case 0xc650: SetBrc(pap, PapKey.BrcBottom, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcBottom); break;
            case 0xc651: SetBrc(pap, PapKey.BrcRight, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcRight); break;
            case 0xc652: SetBrc(pap, PapKey.BrcBetween, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcBetween); break;
            case 0xc653: SetBrc(pap, PapKey.BrcBar, PropUtil.BrcNew(p.R, p.Op)); T(PapKey.BrcBar); break;
            case 0x242a: pap.Set(PapKey.NoAutoHyph, B8()); T(PapKey.NoAutoHyph); break;
            case 0x442d: pap.Set(PapKey.Shd, PropUtil.Shd80(p.U16)); T(PapKey.Shd); break;
            case 0xc64d: pap.Set(PapKey.Shd, PropUtil.ShdNew(p.R, p.Op)); T(PapKey.Shd); break;
            case 0x2431: pap.Set(PapKey.WidowControl, B8()); T(PapKey.WidowControl); break;
            case 0x2433: pap.Set(PapKey.Kinsoku, B8()); T(PapKey.Kinsoku); break;
            case 0x2434: pap.Set(PapKey.WordWrap, B8()); T(PapKey.WordWrap); break;
            case 0x2435: pap.Set(PapKey.OverflowPunct, B8()); T(PapKey.OverflowPunct); break;
            case 0x2436: pap.Set(PapKey.TopLinePunct, B8()); T(PapKey.TopLinePunct); break;
            case 0x2437: pap.Set(PapKey.AutoSpaceDE, B8()); T(PapKey.AutoSpaceDE); break;
            case 0x2438: pap.Set(PapKey.AutoSpaceDN, B8()); T(PapKey.AutoSpaceDN); break;
            case 0x4439: pap.Set(PapKey.WAlignFont, p.U16); T(PapKey.WAlignFont); break;
            case 0x2640: pap.Set(PapKey.OutLvl, p.U8); T(PapKey.OutLvl); break;
            case 0x2441: pap.Set(PapKey.Bidi, B8()); T(PapKey.Bidi); break;
            case 0x2447: pap.Set(PapKey.UsePgsuSettings, B8()); T(PapKey.UsePgsuSettings); break;
            case 0x2448: pap.Set(PapKey.AdjustRight, B8()); T(PapKey.AdjustRight); break;
            case 0x246d: pap.Set(PapKey.ContextualSpacing, B8()); T(PapKey.ContextualSpacing); break;
            case 0x2470: pap.Set(PapKey.MirrorIndents, B8()); T(PapKey.MirrorIndents); break;
        }
    }

    private static readonly PapKey[] BorderKeys = { PapKey.BrcTop, PapKey.BrcLeft, PapKey.BrcBottom, PapKey.BrcRight, PapKey.BrcBetween, PapKey.BrcBar };

    /// <summary>Bordas de parágrafo "nenhuma" sobre base também sem borda não são gravadas (como o Word).</summary>
    public static void PruneNoneBorders(Pap pap, Pap @base, HashSet<PapKey> touched)
    {
        foreach (var k in BorderKeys)
            if (touched.Contains(k) && PropUtil.BrcNone(pap.BrcOf(k)) && PropUtil.BrcNone(@base.BrcOf(k))) touched.Remove(k);
    }
}

// ───────────────────────────── tabela ─────────────────────────────

internal sealed class Margins
{
    public int? Top, Left, Bottom, Right;
}

internal sealed class Tc
{
    public int HorzMerge, VertMerge, VertAlign, TextFlow, FtsWidth, WWidth;
    public bool FitText, NoWrap, HideMark;
    public Brc? BrcTop, BrcLeft, BrcBottom, BrcRight;
    /// <summary>Bordas definidas explicitamente (TC80 não-nil ou sprmTSetBrc).</summary>
    public bool SetTop, SetLeft, SetBottom, SetRight;
    public Shd? Shd;
    /// <summary>Margens da célula (sprmTCellPadding), twips.</summary>
    public Margins Mar = new();
}

internal sealed class TableBorders
{
    public Brc? Top, Left, Bottom, Right, InsideH, InsideV;

    public Brc? Side(int i) => i switch { 0 => Top, 1 => Left, 2 => Bottom, 3 => Right, 4 => InsideH, _ => InsideV };

    public void SetSide(int i, Brc? b)
    {
        switch (i)
        {
            case 0: Top = b; break;
            case 1: Left = b; break;
            case 2: Bottom = b; break;
            case 3: Right = b; break;
            case 4: InsideH = b; break;
            default: InsideV = b; break;
        }
    }

    /// <summary>JSON.stringify(a) === JSON.stringify(b).</summary>
    public bool JsonEquals(TableBorders o)
    {
        for (int i = 0; i < 6; i++)
        {
            var a = Side(i);
            var b = o.Side(i);
            if (a is null != b is null) return false;
            if (a is not null && !a.JsonEquals(b)) return false;
        }
        return true;
    }
}

internal sealed class FtsWidth
{
    public int Fts;
    public int W;
}

internal sealed class Tap
{
    public int? Jc, DxaLeft, DxaGapHalf, RowHeight;
    public bool? CantSplit, Header;
    public TableBorders Borders = new();
    public bool BordersSet;
    public List<int> Centers = new();
    public List<Tc> Tcs = new();
    public FtsWidth? TableWidth, WidthBefore, WidthAfter, WidthIndent;
    public bool? Autofit;
    public Margins Padding = new();
    public int? Spacing;
    public int? Istd;
    public (int Itl, int Grfatl)? Tlp;
    public Shd? ShdTable;
    public bool? Bidi;
    /// <summary>posicionamento flutuante</summary>
    public int? Pc, DxaAbs, DyaAbs, DxaFromText, DyaFromText, DxaFromTextRight, DyaFromTextBottom;
    public bool? NoAllowOverlap;
    /// <summary>Células criadas só por sprmTInsert (sem sprmTDefTable).</summary>
    public bool? InsertBuilt;
    /// <summary>Sombreamentos por célula (sprmTDefTableShd*, na ordem de prioridade).</summary>
    public List<Shd?>? ShdRaw, ShdDef, Shd80;
}

internal static class TapApply
{
    public static Tc NewTc() => new();

    public static Tap NewTap() => new();

    private static Tc ReadTc80(ByteReader r, long o)
    {
        var tc = NewTc();
        int grf = r.U16(o);
        tc.HorzMerge = grf & 3;
        tc.TextFlow = (grf >> 2) & 7;
        tc.VertMerge = (grf >> 5) & 3;
        tc.VertAlign = (grf >> 7) & 3;
        tc.FtsWidth = (grf >> 9) & 7;
        tc.FitText = (grf & 0x1000) != 0;
        tc.NoWrap = (grf & 0x2000) != 0;
        tc.HideMark = (grf & 0x4000) != 0;
        tc.WWidth = r.I16(o + 2);
        // brcType 0 no TC80 = herda as bordas da linha/tabela (o Word 2000+ grava assim)
        for (int i = 0; i < 4; i++)
        {
            var b = PropUtil.Brc80(r, o + 4 + i * 4);
            if (b is not null && b.Type != 0)
            {
                switch (i)
                {
                    case 0: tc.BrcTop = b; tc.SetTop = true; break;
                    case 1: tc.BrcLeft = b; tc.SetLeft = true; break;
                    case 2: tc.BrcBottom = b; tc.SetBottom = true; break;
                    default: tc.BrcRight = b; tc.SetRight = true; break;
                }
            }
        }
        return tc;
    }

    /// <summary>Itera itcFirst..itcLim limitado ao número de células.</summary>
    private static void ForCells(Tap tap, int first, int lim, Action<Tc, int> fn)
    {
        for (int i = first; i < Math.Min(lim, tap.Tcs.Count); i++) fn(tap.Tcs[i], i);
    }

    private static List<Shd?> ShdArray(Prl p, int size, Func<long, Shd> read)
    {
        var out_ = new List<Shd?>();
        for (long o = p.Op; o + size <= p.Op + p.Len; o += size) out_.Add(read(o));
        return out_;
    }

    private static List<Shd?> Concat(List<Shd?>? prev, int keep, List<Shd?> add)
    {
        var out_ = new List<Shd?>();
        if (prev is not null) out_.AddRange(prev.Take(keep));
        out_.AddRange(add);
        return out_;
    }

    /// <summary>Fecha a TAP: linhas montadas por sprmTInsert começam em dxaLeft - dxaGapHalf.</summary>
    public static void FinishTap(Tap tap)
    {
        if (tap.InsertBuilt == true && tap.Centers.Count > 0)
        {
            int shift = (tap.DxaLeft ?? 0) - (tap.DxaGapHalf ?? 0) - tap.Centers[0];
            if (shift != 0) tap.Centers = tap.Centers.Select(c => c + shift).ToList();
        }
    }

    public static void Apply(Tap tap, Prl p)
    {
        var r = p.R;
        switch (p.Sprm)
        {
            case 0x5400: case 0x548a: tap.Jc = p.U16; break;
            case 0x9601: tap.DxaLeft = p.I16; break;
            case 0x9602: tap.DxaGapHalf = p.I16; break;
            // sprmTFCantSplit90 (0x3403) deve ser ignorado em favor de sprmTFCantSplit (medido no Word)
            case 0x3466: tap.CantSplit = p.U8 != 0; break;
            case 0x3404: tap.Header = p.U8 != 0; break;
            case 0xd605: // sprmTTableBorders80: 6 × Brc80
                for (int i = 0; i < 6; i++) tap.Borders.SetSide(i, PropUtil.Brc80(r, p.Op + i * 4));
                tap.BordersSet = true;
                break;
            case 0xd613:
                for (int i = 0; i < 6; i++) tap.Borders.SetSide(i, PropUtil.BrcNew(r, p.Op + i * 8));
                tap.BordersSet = true;
                break;
            case 0x9407: tap.RowHeight = p.I16; break;
            case 0xd608: case 0xd606: // sprmTDefTable
            {
                int n = r.U8(p.Op);
                var centers = new List<int>();
                for (int i = 0; i <= n; i++) centers.Add(r.I16(p.Op + 1 + i * 2));
                long tcStart = p.Op + 1 + (n + 1) * 2;
                var tcs = new List<Tc>();
                for (int i = 0; i < n; i++)
                {
                    long o = tcStart + i * 20;
                    tcs.Add(o + 20 <= p.Op + p.Len ? ReadTc80(r, o) : NewTc());
                }
                tap.Centers = centers;
                tap.Tcs = tcs;
                tap.InsertBuilt = false;
                break;
            }
            case 0xd609: tap.Shd80 = ShdArray(p, 2, o => PropUtil.Shd80(r.U16(o))); break;
            case 0xd612: tap.ShdDef = ShdArray(p, 10, o => PropUtil.ShdNew(r, o)); break;
            case 0xd616: tap.ShdDef = Concat(tap.ShdDef, 22, ShdArray(p, 10, o => PropUtil.ShdNew(r, o))); break;
            case 0xd60c: tap.ShdDef = Concat(tap.ShdDef, 44, ShdArray(p, 10, o => PropUtil.ShdNew(r, o))); break;
            case 0xd670: tap.ShdRaw = ShdArray(p, 10, o => PropUtil.ShdNew(r, o)); break;
            case 0xd671: tap.ShdRaw = Concat(tap.ShdRaw, 22, ShdArray(p, 10, o => PropUtil.ShdNew(r, o))); break;
            case 0xd672: tap.ShdRaw = Concat(tap.ShdRaw, 44, ShdArray(p, 10, o => PropUtil.ShdNew(r, o))); break;
            case 0x740a: tap.Tlp = (r.I16(p.Op), r.U16(p.Op + 2)); break;
            case 0x560b: case 0x5664: tap.Bidi = p.U16 != 0; break;
            case 0x360d: tap.Pc = p.U8; break;
            case 0x940e: tap.DxaAbs = p.I16; break;
            case 0x940f: tap.DyaAbs = p.I16; break;
            case 0x9410: tap.DxaFromText = p.I16; break;
            case 0x9411: tap.DyaFromText = p.I16; break;
            case 0x941e: tap.DxaFromTextRight = p.I16; break;
            case 0x941f: tap.DyaFromTextBottom = p.I16; break;
            case 0x3465: tap.NoAllowOverlap = p.U8 != 0; break;
            case 0xf614: tap.TableWidth = new FtsWidth { Fts = r.U8(p.Op), W = r.I16(p.Op + 1) }; break;
            case 0xf617: tap.WidthBefore = new FtsWidth { Fts = r.U8(p.Op), W = r.I16(p.Op + 1) }; break;
            case 0xf618: tap.WidthAfter = new FtsWidth { Fts = r.U8(p.Op), W = r.I16(p.Op + 1) }; break;
            case 0xf661: tap.WidthIndent = new FtsWidth { Fts = r.U8(p.Op), W = r.I16(p.Op + 1) }; break;
            case 0x3615: tap.Autofit = p.U8 != 0; break;
            case 0x563a: tap.Istd = p.U16; break;
            case 0xd660: tap.ShdTable = PropUtil.ShdNew(r, p.Op); break;
            case 0x7621: // sprmTInsert: itcInsert, ctc, dxaCol
            {
                int itc = r.U8(p.Op), ctc = r.U8(p.Op + 1), dxa = r.I16(p.Op + 2);
                if (tap.Centers.Count == 0) { tap.Centers = new List<int> { 0 }; tap.InsertBuilt = true; }
                for (int k = 0; k < ctc; k++)
                {
                    int at = Math.Min(itc + k, tap.Tcs.Count);
                    tap.Tcs.Insert(at, NewTc());
                    int left = at < tap.Centers.Count ? tap.Centers[at] : tap.Centers[^1];
                    // splice(at + 1, 0, x) com at + 1 além do fim acrescenta no fim
                    tap.Centers.Insert(Math.Min(at + 1, tap.Centers.Count), left + dxa);
                    for (int j = at + 2; j < tap.Centers.Count; j++) tap.Centers[j] += dxa;
                }
                break;
            }
            case 0x5622: // sprmTDelete
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1);
                int cnt = Math.Max(0, Math.Min(lim, tap.Tcs.Count) - first);
                if (cnt > 0 && tap.Tcs.Count - cnt >= 1)
                {
                    int cEnd = first + cnt < tap.Centers.Count ? tap.Centers[first + cnt] : 0;
                    int cStart = first < tap.Centers.Count ? tap.Centers[first] : 0;
                    int w = cEnd - cStart;
                    tap.Tcs.RemoveRange(first, cnt);
                    // splice(first + 1, cnt): remove o que existir
                    if (first + 1 < tap.Centers.Count) tap.Centers.RemoveRange(first + 1, Math.Min(cnt, tap.Centers.Count - (first + 1)));
                    for (int j = first + 1; j < tap.Centers.Count; j++) tap.Centers[j] -= w;
                }
                break;
            }
            case 0x7623: // sprmTDxaCol: itcFirst, itcLim, dxaCol
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), dxa = r.I16(p.Op + 2);
                for (int i = first; i < Math.Min(lim, tap.Tcs.Count); i++)
                {
                    int c1 = i + 1 < tap.Centers.Count ? tap.Centers[i + 1] : 0;
                    int c0 = i < tap.Centers.Count ? tap.Centers[i] : 0;
                    int delta = dxa - (c1 - c0);
                    for (int j = i + 1; j < tap.Centers.Count; j++) tap.Centers[j] += delta;
                }
                break;
            }
            case 0x5624: // sprmTMerge
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1);
                ForCells(tap, first, lim, (tc, i) => { tc.HorzMerge = i == first ? 3 : 1; });
                break;
            }
            case 0x5625:
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1);
                ForCells(tap, first, lim, (tc, _) => { tc.HorzMerge = 0; });
                break;
            }
            case 0xd620: case 0xd62f: // sprmTSetBrc80 / sprmTSetBrc
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), which = r.U8(p.Op + 2);
                var b = p.Sprm == 0xd620 ? PropUtil.Brc80(r, p.Op + 3) : PropUtil.BrcNew(r, p.Op + 3);
                ForCells(tap, first, lim, (tc, _) =>
                {
                    if ((which & 1) != 0) { tc.BrcTop = b; tc.SetTop = true; }
                    if ((which & 2) != 0) { tc.BrcLeft = b; tc.SetLeft = true; }
                    if ((which & 4) != 0) { tc.BrcBottom = b; tc.SetBottom = true; }
                    if ((which & 8) != 0) { tc.BrcRight = b; tc.SetRight = true; }
                });
                break;
            }
            case 0x7629: // sprmTTextFlow
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), flow = r.U16(p.Op + 2);
                ForCells(tap, first, lim, (tc, _) => { tc.TextFlow = flow & 7; });
                break;
            }
            case 0xd62b: // sprmTVertMerge
            {
                int itc = r.U8(p.Op), v = r.U8(p.Op + 1);
                if (itc < tap.Tcs.Count) tap.Tcs[itc].VertMerge = v;
                break;
            }
            case 0xd62c: // sprmTVertAlign
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), va = r.U8(p.Op + 2);
                ForCells(tap, first, lim, (tc, _) => { tc.VertAlign = va; });
                break;
            }
            case 0xd62d: case 0xd62e: // sprmTSetShd/Odd
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1);
                var s = PropUtil.ShdNew(r, p.Op + 2);
                ForCells(tap, first, lim, (tc, i) => { if (p.Sprm == 0xd62d || (i - first) % 2 == 0) tc.Shd = s; });
                break;
            }
            case 0xd632: case 0xd634: case 0xd633: // CSSA: itcFirst, itcLim, grfbrc, ftsWidth, wWidth
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), grf = r.U8(p.Op + 2), fts = r.U8(p.Op + 3), w = r.I16(p.Op + 4);
                if (p.Sprm == 0xd633) { if (fts == 3 || fts == 0x13) tap.Spacing = w; break; }
                void SetM(Margins m)
                {
                    // ftsNil com largura 0 = margem zero (o Word grava 0 no .docx)
                    if ((grf & 1) != 0) m.Top = w;
                    if ((grf & 2) != 0) m.Left = w;
                    if ((grf & 4) != 0) m.Bottom = w;
                    if ((grf & 8) != 0) m.Right = w;
                }
                if (p.Sprm == 0xd634) SetM(tap.Padding);
                else ForCells(tap, first, lim, (tc, _) => SetM(tc.Mar));
                break;
            }
            case 0xd635: // sprmTCellWidth
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), fts = r.U8(p.Op + 2), w = r.I16(p.Op + 3);
                ForCells(tap, first, lim, (tc, _) => { tc.FtsWidth = fts; tc.WWidth = w; });
                break;
            }
            case 0xd642: // sprmTCellFHideMark
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), v = r.U8(p.Op + 2);
                ForCells(tap, first, lim, (tc, _) => { tc.HideMark = v != 0; });
                break;
            }
            case 0xd639: // sprmTFCellNoWrap
            {
                int first = r.U8(p.Op), lim = r.U8(p.Op + 1), v = r.U8(p.Op + 2);
                ForCells(tap, first, lim, (tc, _) => { tc.NoWrap = v != 0; });
                break;
            }
        }
    }
}

// ───────────────────────────── seção ─────────────────────────────

internal sealed class Sep
{
    public int Bkc = 2;
    public bool TitlePage;
    public int CcolM1;
    public int DxaColumns = 720;
    public bool EvenlySpaced = true;
    /// <summary>Vetores esparsos do JS (colWidths[i] = …).</summary>
    public Dictionary<int, int> ColWidths = new();
    public Dictionary<int, int> ColSpacings = new();
    public bool LBetween;
    public int XaPage = 12240;
    public int YaPage = 15840;
    /// <summary>1 retrato, 2 paisagem.</summary>
    public int Orientation = 1;
    public int DxaLeft = 1800, DxaRight = 1800, DyaTop = 1440, DyaBottom = 1440, DzaGutter;
    public int DyaHdrTop = 720, DyaHdrBottom = 720;
    public int NfcPgn;
    public bool PgnRestart;
    public long PgnStart = 1;
    public int Vjc, LnnMod, DxaLnn, Lnc, LnnMin;
    public Brc? BrcTop, BrcLeft, BrcBottom, BrcRight;
    public int PgbProp, Clm;
    public int? DyaLinePitch;
    public int DxtCharSpace, TextFlow;
    public bool Bidi, RtlGutter;
    public int? Fpc, RncFtn, NFtn, NfcFtnRef, RncEdn, NEdn, NfcEdnRef;
    public bool FEndnote = true;
    public int DmBinFirst, DmBinOther;
    public int? DmPaperReq;
    public bool? ProtectedSec;
    public int? CnsPgn, HeadingPgn;

    public static void Apply(Sep sep, Prl p)
    {
        var r = p.R;
        switch (p.Sprm)
        {
            case 0x3000: sep.CnsPgn = p.U8; break;
            case 0x3001: sep.HeadingPgn = p.U8; break;
            case 0xf203: { int i = r.U8(p.Op); sep.ColWidths[i] = r.I16(p.Op + 1); break; }
            case 0xf204: { int i = r.U8(p.Op); sep.ColSpacings[i] = r.I16(p.Op + 1); break; }
            case 0x3005: sep.EvenlySpaced = p.U8 != 0; break;
            case 0x3006: sep.ProtectedSec = p.U8 != 0; break;
            case 0x5007: sep.DmBinFirst = p.U16; break;
            case 0x5008: sep.DmBinOther = p.U16; break;
            case 0x5026: sep.DmPaperReq = p.U16; break;
            case 0x3009: sep.Bkc = p.U8; break;
            case 0x300a: sep.TitlePage = p.U8 != 0; break;
            case 0x500b: sep.CcolM1 = p.U16; break;
            case 0x900c: sep.DxaColumns = p.I16; break;
            case 0x300e: sep.NfcPgn = p.U8; break;
            case 0x3011: sep.PgnRestart = p.U8 != 0; break;
            case 0x3012: sep.FEndnote = p.U8 != 0; break;
            case 0x3013: sep.Lnc = p.U8; break;
            case 0x5015: sep.LnnMod = p.U16; break;
            case 0x9016: sep.DxaLnn = p.I16; break;
            case 0xb017: sep.DyaHdrTop = p.U16; break;
            case 0xb018: sep.DyaHdrBottom = p.U16; break;
            case 0x3019: sep.LBetween = p.U8 != 0; break;
            case 0x301a: sep.Vjc = p.U8; break;
            case 0x501b: sep.LnnMin = p.U16; break;
            case 0x501c: sep.PgnStart = p.U16; break;
            case 0x7044: sep.PgnStart = p.U32; break;
            case 0x301d: sep.Orientation = p.U8; break;
            case 0xb01f: sep.XaPage = p.U16; break;
            case 0xb020: sep.YaPage = p.U16; break;
            case 0xb021: sep.DxaLeft = p.U16; break;
            case 0xb022: sep.DxaRight = p.U16; break;
            case 0x9023: sep.DyaTop = p.I16; break;
            case 0x9024: sep.DyaBottom = p.I16; break;
            case 0xb025: sep.DzaGutter = p.U16; break;
            case 0x3228: sep.Bidi = p.U8 != 0; break;
            case 0x322a: sep.RtlGutter = p.U8 != 0; break;
            case 0x702b: sep.BrcTop = PropUtil.Brc80(r, p.Op); break;
            case 0x702c: sep.BrcLeft = PropUtil.Brc80(r, p.Op); break;
            case 0x702d: sep.BrcBottom = PropUtil.Brc80(r, p.Op); break;
            case 0x702e: sep.BrcRight = PropUtil.Brc80(r, p.Op); break;
            case 0xd234: sep.BrcTop = PropUtil.BrcNew(r, p.Op); break;
            case 0xd235: sep.BrcLeft = PropUtil.BrcNew(r, p.Op); break;
            case 0xd236: sep.BrcBottom = PropUtil.BrcNew(r, p.Op); break;
            case 0xd237: sep.BrcRight = PropUtil.BrcNew(r, p.Op); break;
            case 0x522f: sep.PgbProp = p.U16; break;
            case 0x7030: sep.DxtCharSpace = p.I32; break;
            case 0x9031: sep.DyaLinePitch = p.I16; break;
            case 0x5032: sep.Clm = p.U16; break;
            case 0x5033: sep.TextFlow = p.U16; break;
            case 0x303b: sep.Fpc = p.U8; break;
            case 0x303c: sep.RncFtn = p.U8; break;
            case 0x303e: sep.RncEdn = p.U8; break;
            case 0x503f: sep.NFtn = p.U16; break;
            case 0x5040: sep.NfcFtnRef = p.U16; break;
            case 0x5041: sep.NEdn = p.U16; break;
            case 0x5042: sep.NfcEdnRef = p.U16; break;
        }
    }
}
