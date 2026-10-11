using System.Globalization;
using System.Text.RegularExpressions;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Parágrafo pronto para quebrar em linhas (porta de docx-layout/src/para.ts):
/// propriedades resolvidas (cascata completa), glifos medidos (fonte por slot
/// ascii/hAnsi/eastAsia/cs, kerning só com w:kern, caps/versalete,
/// sobrescrito) e o marcador de numeração.
/// </summary>
public sealed class UnderlineStyle
{
    public string Val = "single";
    public string? Color;
}

public sealed class RunStyle
{
    public RPr Rpr = null!;
    public double SizePt;
    public string Color = "000000";
    /// <summary>cor automática (preto, ou branco sobre fundo escuro)</summary>
    public bool AutoColor;
    public bool Bold;
    public bool Italic;
    public UnderlineStyle? Underline;
    public bool Strike;
    public bool Dstrike;
    public string? Highlight;
    public string? Shading;
    /// <summary>deslocamento vertical (twips, + sobe) — w:position + sobrescrito</summary>
    public double Shift;
    public bool Hidden;
    public string? Link;
    /// <summary>opacidade do texto (w14:textFill)</summary>
    public double? Alpha;
    /// <summary>contorno visível (w14:textOutline com preenchimento)</summary>
    public bool Outline;
}

public enum GlyphKind { Char, Space, Nbsp, Tab, Lb, Pb, Cb, Obj, Shy, Box }

public sealed class BoxInfo
{
    public double Side;
    public bool Checked;
}

public sealed class Glyph
{
    public GlyphKind Kind;
    public string Ch = "";
    public int Cp;
    public FontFace Face = null!;
    public RunStyle Style = null!;
    /// <summary>largura (twips) — tabs são calculados na quebra</summary>
    public double Adv;
    /// <summary>ascendente/descendente na linha (twips)</summary>
    public double Asc;
    public double Desc;
    /// <summary>texto deslocado (w:position): ascendente/descendente SEM o deslocamento —
    /// a entrelinha múltipla vale sobre elas (oráculo position)</summary>
    public double? NAsc;
    public double? NDesc;
    /// <summary>offset no texto do parágrafo (run.text concatenado)</summary>
    public double Offset;
    public int RunIdx;
    /// <summary>quebra possível DEPOIS deste glifo</summary>
    public bool BreakAfter;
    /// <summary>objeto inline (imagem/forma/grupo/caixa)</summary>
    public Run? Obj;
    /// <summary>w:ptab</summary>
    public PtabInfo? Ptab;
    /// <summary>tamanho efetivo do glifo (sobrescrito reduz)</summary>
    public double SizePt;
    /// <summary>caixa de seleção (FORMCHECKBOX): lado em twips e se está marcada</summary>
    public BoxInfo? Box;
    /// <summary>referência de nota de rodapé (id da nota)</summary>
    public double? NoteId;
    /// <summary>quebra de linha com w:clear: a linha seguinte desce para baixo dos flutuantes</summary>
    public bool Clear;
    /// <summary>linha horizontal VML (o:hr): altura do traço (twips) — fica sozinha na linha</summary>
    public double? Hr;
    /// <summary>espaço que comprime (modos ≤ 14 com layout asiático e characterSpacingControl ≠
    /// doNotCompress): twips que pode perder</summary>
    public double? FeShrink;
    /// <summary>espaço de largura fixa: não comprime nem expande no justificado</summary>
    public bool Fixed;
    /// <summary>kerning somado ao avanço (par com o caractere seguinte do run); nulo = sem kerning</summary>
    public double? KernAdj;
    /// <summary>glifo da ligadura que este caractere abre/fecha (kerning com os vizinhos)</summary>
    public int? LigStart;
    public int? LigEnd;
    /// <summary>pontuação que pode pendurar além da margem no fim da linha</summary>
    public bool Hang;
}

public sealed class ParaMarker
{
    public string Text = "";
    public List<Glyph> Glyphs = new();
    public double Width;
    public NumLevel Level = null!;
    /// <summary>tab | space | nothing</summary>
    public string Suff = "tab";
    public string Jc = "left";
}

public sealed class PreparedPara
{
    public Paragraph Para = null!;
    public PPr Ppr = null!;
    public string? StyleId;
    public RunStyle MarkStyle = null!;
    public FontFace MarkFace = null!;
    public List<Glyph> Glyphs = new();
    public ParaMarker? Marker;
    /// <summary>recuos (twips)</summary>
    public double IndLeft;
    public double IndRight;
    /// <summary>&gt;0 primeira linha recuada; &lt;0 deslocamento (hanging)</summary>
    public double FirstLine;
    public string Jc = "left";
    public List<TabSpec> Tabs = new();
    /// <summary>propriedades de fluxo</summary>
    public double SpaceBefore;
    public double SpaceAfter;
    public bool BeforeAuto;
    public bool AfterAuto;
    /// <summary>auto | exact | atLeast</summary>
    public string LineRule = "auto";
    public double Line;
    public bool Contextual;
    public bool KeepNext;
    public bool KeepLines;
    public bool WidowControl;
    public bool PageBreakBefore;
    /// <summary>só contém quebra de página/seção (parágrafo "vazio" de quebra)</summary>
    public bool Empty;
}

public sealed class ParaEnv
{
    /// <summary>pPr/rPr do estilo de tabela (condicionais já mesclados) para parágrafos em células</summary>
    public PPr? TablePPr;
    public RPr? TableRPr;
    /// <summary>valor dos campos dinâmicos (PAGE, NUMPAGES…)</summary>
    public Func<string, string?, string?>? Field;
    /// <summary>numerar (false no cabeçalho reaproveitado em cada página)</summary>
    public bool? Numbering;
    /// <summary>cor de fundo escura (cor automática vira branco)</summary>
    public bool DarkBackground;
    /// <summary>fluxo sem paginação (célula, cabeçalho/rodapé, caixa): quebras de página/coluna não quebram</summary>
    public bool NoPageBreaks;

    public ParaEnv Clone() => (ParaEnv)MemberwiseClone();
}

public static class Para
{
    private static bool Cjk(int cp) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xffef) || (cp >= 0x3000 && cp <= 0x303f);
    private static bool Cs(int cp) => (cp >= 0x0590 && cp <= 0x08ff) || (cp >= 0xfb1d && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);

    /// <summary>Código da área privada desenhado como .notdef (fonte comum, sem mapeamento de símbolo).</summary>
    private static bool NotdefPua(FontFace face, int cp) => cp >= 0xf000 && cp <= 0xf0ff && face.Font.GlyphId(cp) == 0 && !Fonts.IsSymbolFont(face.Font);

    private static readonly string[] FallbackFamilies = { "Segoe UI Symbol", "Segoe UI Emoji", "Arial Unicode MS", "MS Gothic", "Cambria Math", "Segoe UI", "Arial" };

    public static RunStyle ResolveRunStyle(DocContext ctx, RPr rpr, ParaEnv env, string? link = null)
    {
        var theme = ctx.Fmt.Theme;
        double sz = (rpr.Sz ?? 20) / 2;
        string? va = rpr.VertAlign;
        // sobrescrito/subscrito: ySuperscriptYSize (1331/2048 nas fontes comuns, não 0,65) do
        // corpo, em meios pontos — 15pt → 9,5pt (oráculo supraise, corpo do PDF do Word)
        double sizePt = va is "superscript" or "subscript" ? Js.Round((sz * 2 * 1331) / 2048) / 2 : sz;
        // o deslocamento do sobrescrito/subscrito vem da fonte do run (calculado abaixo, com a face)
        double shift = (rpr.Position ?? 0) * 10; // half-points → twips
        // w14:textFill (Word 2010+) manda sobre w:color e traz a opacidade
        var tf = rpr.TextFill;
        string? color = (tf is not null ? (tf.Color ?? (Js.Truthy(tf.ThemeColor) ? Resolve.ResolveColor(null, tf.ThemeColor, null, null, theme) : null)) : null)
            ?? Resolve.ResolveColor(rpr.Color, theme);
        UnderlineStyle? u = rpr.U is not null && rpr.U.Val != "none" && rpr.U.Val != ""
            ? new UnderlineStyle { Val = rpr.U.Val, Color = Js.Truthy(rpr.U.Color) && rpr.U.Color != "auto" ? rpr.U.Color : null }
            : null;
        string? shd = Js.Truthy(rpr.Shd?.Fill) && rpr.Shd!.Fill != "auto" ? rpr.Shd.Fill : null;
        var style = new RunStyle
        {
            Rpr = rpr,
            SizePt = sizePt,
            Color = color ?? (env.DarkBackground ? "FFFFFF" : "000000"),
            AutoColor = color is null,
            Bold = rpr.B == true,
            Italic = rpr.I == true,
            Underline = u,
            Strike = rpr.Strike == true,
            Dstrike = rpr.Dstrike == true,
            Highlight = Resolve.HighlightHex(rpr.Highlight),
            Shading = shd,
            Shift = shift,
            Hidden = rpr.Vanish == true || rpr.SpecVanish == true,
            Alpha = tf?.Alpha is { } ta && ta < 1 ? ta : null,
            Outline = rpr.TextOutline == true,
            Link = Js.Truthy(link) ? link : null,
        };
        if (va is "superscript" or "subscript")
        {
            // medido no Word (oráculo supraise): elevação/queda pela fonte do PRÓPRIO run
            var face = FaceFor(ctx, rpr, 0x41, style);
            style.Shift += va == "superscript" ? Fonts.SuperscriptRaiseFor(face.Family, Fonts.FaceMetrics(face.Font), sz, sizePt) * 20 : -Fonts.SubscriptDropPt(face.Family, sz) * 20;
        }
        return style;
    }

    /// <summary>Face do caractere (slot por faixa Unicode) com fallback de glifo ausente.</summary>
    private static FontFace FaceFor(DocContext ctx, RPr rpr, int cp, RunStyle style, string? symFont = null)
    {
        var theme = ctx.Fmt.Theme;
        string? family;
        bool bold = style.Bold, italic = style.Italic;
        if (Js.Truthy(symFont) && cp >= 0xf000 && cp <= 0xf0ff) family = symFont;
        else if (Cjk(cp)) family = Resolve.FontOfSlot(rpr.RFonts, "eastAsia", theme) ?? Resolve.FontOfSlot(rpr.RFonts, "ascii", theme);
        else if (Cs(cp) || rpr.Cs == true || rpr.Rtl == true)
        {
            family = Resolve.FontOfSlot(rpr.RFonts, "cs", theme) ?? Resolve.FontOfSlot(rpr.RFonts, "ascii", theme);
            bold = rpr.BCs == true; italic = rpr.ICs == true;
        }
        else if (cp < 0x80) family = Resolve.FontOfSlot(rpr.RFonts, "ascii", theme);
        else
        {
            family = rpr.RFonts?.Hint == "eastAsia" && (cp == 0x201c || cp == 0x201d || cp == 0x2018 || cp == 0x2019)
                ? Resolve.FontOfSlot(rpr.RFonts, "eastAsia", theme)
                : Resolve.FontOfSlot(rpr.RFonts, "hAnsi", theme) ?? Resolve.FontOfSlot(rpr.RFonts, "ascii", theme);
        }
        var face = ctx.Faces.Get(family, bold, italic);
        // espaços tipográficos ausentes na fonte NÃO trocam de fonte (a altura da
        // linha segue a fonte do run — ex.: U+2002)
        if (cp <= 32 || SpaceWidths.ContainsKey(cp) || face.Font.GlyphId(cp) != 0) return face;
        // símbolo legado (F0xx) numa fonte que mapeia em 0x00xx (Symbol/Wingdings antigos)
        // código da área privada (w:sym, marcador) que a fonte não tem: fonte de SÍMBOLO que o
        // mapeia em 0x00xx fica com ele; fonte comum (Arial, Times…) não — o Word desenha o glifo
        // ausente (.notdef) da Calibri, qualquer que seja a fonte do run ou do tema (oráculo symnotdef)
        if (cp >= 0xf000 && cp <= 0xf0ff)
        {
            if (Fonts.IsSymbolFont(face.Font) && face.Font.GlyphId(cp - 0xf000) != 0) return face;
            return ctx.Faces.Get("Calibri", false, false);
        }
        foreach (var fb in FallbackFamilies)
        {
            var f = ctx.Faces.Get(fb, bold, italic);
            if (f.Font.GlyphId(cp) != 0) return f;
        }
        return face;
    }

    private static (double Asc, double Desc, double? NAsc, double? NDesc) VMetrics(FaceMetrics m, RunStyle style)
    {
        string? va = style.Rpr.VertAlign;
        if (va is "superscript" or "subscript")
        {
            double b = (style.Rpr.Sz ?? 20) / 2;
            return (m.Ascent * b * 20, m.Descent * b * 20, null, null);
        }
        // w:position desloca a caixa do glifo: elevado, a descendente encolhe (até 0);
        // rebaixado, a ascendente (oráculo position)
        var (sa, sd) = ShadowExtent(style);
        double a = m.Ascent * style.SizePt * 20 + sa, d = m.Descent * style.SizePt * 20 + sd;
        if (style.Shift == 0 || double.IsNaN(style.Shift)) return (a, d, null, null);
        return (Math.Max(0, a + style.Shift), Math.Max(0, d - style.Shift), a, d);
    }

    private static bool IsHyperlinkStyle(DocContext ctx, string id)
    {
        var st = ctx.Resolver.Styles[id];
        return id == "Hyperlink" || (st?.Name is { } n && Js.ToLower(n) == "hyperlink");
    }

    public static double AdvanceTwips(DocContext ctx, FontFace face, int cp, double sizePt)
    {
        var f = face.Font;
        int gid = f.GlyphId(cp);
        // área privada: fonte de símbolo mapeia em 0x00xx; nas demais fica o .notdef, e o Word
        // ainda avança um espaço da fonte depois dele (oráculo symnotdef)
        double extra = 0;
        if (gid == 0 && cp >= 0xf000 && cp <= 0xf0ff)
        {
            if (Fonts.IsSymbolFont(f)) gid = f.GlyphId(cp - 0xf000);
            else extra = f.AdvanceWidth(f.GlyphId(0x20));
        }
        if (gid == 0 && SpaceWidths.TryGetValue(cp, out var sw))
        {
            if (sw.Ch is not null) return AdvanceTwips(ctx, face, sw.Ch.Value, sizePt) * (cp == 0x202f ? 0.5 : 1);
            return sw.Em * sizePt * 20;
        }
        // espaços "en", "em" e de quatro por em (U+2002, U+2003, U+2005 — os que quebram): o Word
        // mede pelo TRAVESSÃO da própria fonte — en dash, em dash, em dash/4 —, não pelo glifo do
        // espaço (oráculo enspace: Arial "en" = 0,556 em, Calibri "em" = 0,905 em)
        double frac = 1;
        if (gid != 0 && (cp == 0x2002 || cp == 0x2003 || cp == 0x2005))
        {
            int dg = f.GlyphId(cp == 0x2002 ? 0x2013 : 0x2014);
            if (dg != 0) { gid = dg; frac = cp == 0x2005 ? 1.0 / 4 : 1; }
        }
        double units = f.AdvanceWidth(gid) * frac + extra;
        double em = ctx.Opts.AdvanceEm == "device" ? Fonts.DeviceEmPt(sizePt) : sizePt;
        double tw = (units * em * 20) / f.Metrics.UnitsPerEm;
        return ctx.Opts.AdvanceRound switch
        {
            "twip" => Js.Round(tw),
            "twipFloor" => Math.Floor(tw),
            "twipCeil" => Math.Ceiling(tw),
            "dev600" => Js.Round(tw / 2.4) * 2.4,
            "half" => Js.Round(tw * 2) / 2,
            _ => tw,
        };
    }

    /// <summary>Kerning de um par de GLIFOS (com glifo de ligadura), na mesma escala de KernTwips.</summary>
    private static double KernGlyphs(DocContext ctx, FontFace face, long g1, long g2, double sizePt)
    {
        double k = face.Font.KernGlyphsTwips(g1, g2, sizePt);
        if (k == 0 || double.IsNaN(k)) return 0;
        if (ctx.Opts.AdvanceEm == "device") return k;
        return (k * sizePt) / Fonts.DeviceEmPt(sizePt);
    }

    /// <summary>Avanço de um GLIFO (de ligadura) em twips, na mesma escala de AdvanceTwips.</summary>
    private static double GlyphAdvTwips(DocContext ctx, FontFace face, int gid, double sizePt)
    {
        var f = face.Font;
        double em = ctx.Opts.AdvanceEm == "device" ? Fonts.DeviceEmPt(sizePt) : sizePt;
        double tw = (f.AdvanceWidth(gid) * em * 20) / f.Metrics.UnitsPerEm;
        return ctx.Opts.AdvanceRound switch
        {
            "twip" => Js.Round(tw),
            "twipFloor" => Math.Floor(tw),
            "twipCeil" => Math.Ceiling(tw),
            "dev600" => Js.Round(tw / 2.4) * 2.4,
            "half" => Js.Round(tw * 2) / 2,
            _ => tw,
        };
    }

    private static readonly Regex LigStandardRe = new("standard", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex LigContextualRe = new("contextual", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex LigHistoricalRe = new("historical", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex LigDiscretionalRe = new("discretional", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    /// <summary>Features GSUB de ligadura ligadas por w14:ligatures (none, standard, contextual,
    /// historical, discretional, combinações e all).</summary>
    private static List<string> LigFeatures(string? v)
    {
        if (string.IsNullOrEmpty(v) || v == "none") return new List<string>();
        if (v == "all") return new List<string> { "liga", "clig", "hlig", "dlig" };
        var outp = new List<string>();
        if (LigStandardRe.IsMatch(v)) outp.Add("liga");
        if (LigContextualRe.IsMatch(v)) outp.Add("clig");
        if (LigHistoricalRe.IsMatch(v)) outp.Add("hlig");
        if (LigDiscretionalRe.IsMatch(v)) outp.Add("dlig");
        return outp;
    }

    /// <summary>
    /// Ligaduras OpenType (w14:ligatures): o Word mede o glifo da ligadura (GSUB do script
    /// latino), não a soma das letras — Calibri "tt" −73/2048 em, "ti" −15, "fi" −11; dentro
    /// dela não há kerning e o par com o vizinho é o do glifo da ligadura (oráculo ligwidth).
    /// Trechos de letras com a mesma face e corpo, também entre runs (com cor diferente,
    /// inclusive). A diferença de largura vai para o último caractere da ligadura
    /// (cada letra continua desenhada com o seu glifo).
    /// </summary>
    private static void ApplyLigatures(DocContext ctx, List<Glyph> glyphs)
    {
        // runs que ligam entre si: mesma face e corpo (testados abaixo), idioma, escala,
        // posição e ligaduras — cor, sublinhado, estilo não importam (como no kerning)
        static (string, double, double, string, double) KeyOf(Glyph g)
        {
            var r = g.Style.Rpr;
            return (r.Lang?.Val ?? "", r.W ?? 100, g.Style.Shift, r.Ligatures ?? "", r.Spacing ?? 0);
        }
        for (int k = 0; k < glyphs.Count;)
        {
            var g0 = glyphs[k];
            var rpr = g0.Style.Rpr;
            var feats = g0.Kind == GlyphKind.Char && !(rpr.Spacing is { } sp0 && sp0 != 0 && !double.IsNaN(sp0)) ? LigFeatures(rpr.Ligatures) : new List<string>();
            if (feats.Count == 0) { k++; continue; }
            var key = KeyOf(g0);
            int e = k + 1;
            while (e < glyphs.Count)
            {
                var q = glyphs[e];
                if (q.Kind != GlyphKind.Char || !ReferenceEquals(q.Face, g0.Face) || q.SizePt != g0.SizePt || (q.RunIdx != g0.RunIdx && !KeyOf(q).Equals(key))) break;
                e++;
            }
            if (e - k >= 2)
            {
                var f = g0.Face.Font;
                var groups = f.Ligate(glyphs.GetRange(k, e - k).Select(q => f.GlyphId(q.Cp)).ToList(), feats);
                int pos = k;
                foreach (var grp in groups ?? new List<(int Gid, int Len)>())
                {
                    if (grp.Len > 1)
                    {
                        var first = glyphs[pos];
                        var last = glyphs[pos + grp.Len - 1];
                        double sum = 0;
                        for (int j = pos; j < pos + grp.Len; j++) sum += GlyphAdvTwips(ctx, first.Face, f.GlyphId(glyphs[j].Cp), first.SizePt);
                        double w = rpr.W is { } rw && rw != 0 && !double.IsNaN(rw) && rw != 100 ? rw / 100 : 1;
                        double delta = (GlyphAdvTwips(ctx, first.Face, grp.Gid, first.SizePt) - sum) * w;
                        if (first.Face.SynthBold) delta -= ((grp.Len - 1) * first.SizePt * 20) / 2048;
                        // sem kerning dentro da ligadura
                        for (int j = pos; j < pos + grp.Len - 1; j++)
                        {
                            var q = glyphs[j];
                            if (q.KernAdj is { } ka && ka != 0 && !double.IsNaN(ka)) { q.Adv -= ka; q.KernAdj = 0; }
                        }
                        // o par com o vizinho é o do glifo da ligadura
                        var nx = pos + grp.Len < glyphs.Count ? glyphs[pos + grp.Len] : null;
                        if (last.KernAdj is { } lka && nx is not null && nx.RunIdx == last.RunIdx)
                        {
                            double nk = KernGlyphs(ctx, first.Face, grp.Gid, nx.LigStart ?? f.GlyphId(nx.Cp), first.SizePt);
                            last.Adv += nk - lka;
                            last.KernAdj = nk;
                        }
                        var pv = pos - 1 >= 0 ? glyphs[pos - 1] : null;
                        if (pv is not null && pv.KernAdj is { } pka && pv.RunIdx == first.RunIdx && ReferenceEquals(pv.Face, first.Face))
                        {
                            double nk = KernGlyphs(ctx, first.Face, pv.LigEnd ?? f.GlyphId(pv.Cp), grp.Gid, first.SizePt);
                            pv.Adv += nk - pka;
                            pv.KernAdj = nk;
                        }
                        last.Adv += delta;
                        first.LigStart = grp.Gid;
                        last.LigEnd = grp.Gid;
                    }
                    pos += grp.Len;
                }
            }
            k = e;
        }
    }

    private static double KernTwips(DocContext ctx, FontFace face, int cp, int next, double sizePt)
    {
        double k = face.Font.KernTwips(cp, next, sizePt);
        if (k == 0 || double.IsNaN(k)) return 0;
        if (ctx.Opts.AdvanceEm == "device") return k;
        return (k * sizePt) / Fonts.DeviceEmPt(sizePt);
    }

    /// <summary>
    /// Quanto a sombra do texto (w14:shadow) estende a caixa do glifo acima e abaixo
    /// (twips), medido no Word (oráculo shadowh): k·máx(0, desfoque ∓ dy), dy = dist·sen(dir)
    /// (para baixo positivo), k = (corpo/72)^0,7 — independe da fonte; vale também na
    /// marca de parágrafo e escala com a entrelinha múltipla; a exata não muda.
    /// </summary>
    public static (double Asc, double Desc) ShadowExtent(RunStyle style)
    {
        var sh = style.Rpr.TextShadow;
        if (sh is null || (!(sh.Blur != 0 && !double.IsNaN(sh.Blur)) && !(sh.Dist != 0 && !double.IsNaN(sh.Dist)))) return (0, 0);
        double k = Math.Pow(style.SizePt / 72, 0.7);
        double dy = sh.Dist * Math.Sin((sh.Dir * Math.PI) / 180);
        return (k * Math.Max(0, sh.Blur - dy) * 20, k * Math.Max(0, sh.Blur + dy) * 20);
    }

    /// <summary>Depois de hífen/travessão NÃO há quebra se vem espaço (quebra no espaço), NBSP
    /// (cola), tab ou quebra de linha; com qualquer outro caractere há (oráculo dashsym).
    /// Porta da classe /^[\s NBSP NNBSP U+2000-U+200B U+3000 BOM SHY]$/u do JS.</summary>
    private static bool NoBreakAfterDash(string ch)
    {
        if (ch.Length != 1) return false;
        char c = ch[0];
        // \s do JS: \t \n \v \f \r, espaço, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF
        return c is '\t' or '\n' or '\v' or '\f' or '\r' or ' ' or '\u00a0' or '\u1680' or '\u2028' or '\u2029' or '\u202f' or '\u205f'
            or '\u3000' or '\ufeff' or '\u00ad' || (c >= '\u2000' && c <= '\u200b');
    }

    /// <summary>Kinsoku: caracteres que não podem terminar a linha (listas padrão do Word para
    /// japonês/chinês/coreano, união).</summary>
    private const string NoLineEnd = "$([{\u00a3\u00a5\u2018\u201c\u3008\u300a\u300c\u300e\u3010\u3014\u3016\u301d\ufe59\ufe5b\ufe5d\uff04\uff08\uff3b\uff5b\uff62\uffe1\uffe5\uffe6";

    /// <summary>Fonte do Leste Asiático (CJK): pelo conjunto de caracteres do fontTable, pelo nome
    /// conhecido ou instalada com glifos CJK.</summary>
    private static readonly Regex CjkFontName = new("^(ms (p|ui )?(gothic|mincho)|yu (gothic|mincho)|meiryo|hg.*(gothic|mincho)|(p)?mingliu|n?simsun|simhei|kaiti|fangsong|microsoft (yahei|jhenghei)|dengxian|(batang|gulim|dotum|gungsuh)(che)?|malgun gothic|nanum)|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    public static bool IsCjkFont(DocContext ctx, string? name)
    {
        if (string.IsNullOrEmpty(name)) return false;
        // o fontTable do documento manda: conjunto de caracteres japonês/coreano/chinês
        string? cs = ctx.Fmt.FontTable.TryGetValue(name, out var fi) ? fi.Charset?.ToUpperInvariant() : null;
        if (!string.IsNullOrEmpty(cs)) return cs is "80" or "81" or "82" or "86" or "88";
        if (CjkFontName.IsMatch(name)) return true;
        var f = ctx.Faces.Get(name, false, false);
        return f.Family.ToLowerInvariant() == name.ToLowerInvariant() && (f.Font.GlyphId(0x4e00) != 0 || f.Font.GlyphId(0xac00) != 0);
    }

    private static readonly Regex CjkLangRe = new(@"^(ja|zh|ko)\b", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    /// <summary>A fonte PADRÃO do documento para texto asiático (docDefaults, eastAsia) é do
    /// Leste Asiático? Nos modos ≤ 14 é ela — e não a fonte eastAsia do run — que liga
    /// o layout asiático (kinsoku, pontuação pendurada, compressão: oráculos kinsoku, fecompress)</summary>
    private static bool DocEastAsiaCjk(DocContext ctx)
    {
        var rf = ctx.Resolver.DocDefaults.RPr?.RFonts;
        string? name = Resolve.FontOfSlot(rf, "eastAsia", ctx.Fmt.Theme);
        if (!string.IsNullOrEmpty(name)) return IsCjkFont(ctx, name);
        // fonte do tema sem "ea": o Word usa a da escrita do idioma do tema (themeFontLang)
        return Js.Truthy(rf?.EastAsiaTheme) && CjkLangRe.IsMatch(ctx.Fmt.Settings.ThemeFontLang?.EastAsia ?? "");
    }

    private static bool IsCjkLang(RPr rpr) => CjkLangRe.IsMatch(rpr.Lang?.EastAsia ?? "");

    /// <summary>As regras de quebra do Leste Asiático valem para o texto deste run? Idioma
    /// eastAsia ja/zh/ko; nos modos ≤ 14, também a fonte asiática padrão do documento
    /// (oráculo kinsoku)</summary>
    private static bool EastAsianBreakRules(DocContext ctx, RPr rpr)
    {
        if (!IsCjkLang(rpr)) return false;
        return ctx.Fmt.Settings.CompatibilityMode >= 15 || DocEastAsiaCjk(ctx);
    }

    /// <summary>Pontuação que pode pendurar além da margem direita (w:overflowPunct, layout asiático),
    /// conforme o idioma eastAsia do texto — japonês só vírgula, ponto e aspas de fecho;
    /// chinês/coreano também ) ; : ! ? ] } (e % fora do chinês tradicional) — oráculo hang15.
    /// Com o conjunto alternativo de regras (useAltKinsokuLineBreakRules, só nos modos ≤ 14)
    /// as aspas e o % não penduram e o coreano fica como o japonês (oráculo hangalt)</summary>
    private const string HangBase = ",.\u3001\u3002\uff0c\uff0e";
    private const string HangClose = ");:!?]}\uff1a\uff1b\uff1f\uff01\uff09\uff3d\uff5d";
    private const string HangQuotes = "\u201d\u2019";
    private static readonly Regex JaLangRe = new("^ja", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex KoLangRe = new("^ko", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex ZhTradRe = new("^zh-(tw|hk|mo)", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static string HangPunct(RPr rpr, bool alt)
    {
        string ea = rpr.Lang?.EastAsia ?? "";
        if (JaLangRe.IsMatch(ea)) return alt ? HangBase : HangBase + HangQuotes;
        if (alt) return KoLangRe.IsMatch(ea) ? HangBase : HangBase + HangClose;
        return HangBase + HangClose + HangQuotes + (ZhTradRe.IsMatch(ea) ? "" : "%");
    }

    private static readonly string[] DynFields = { "PAGE", "NUMPAGES", "SECTIONPAGES", "SECTION", "PAGEREF", "SEQ", "REF", "DATE", "TIME", "SAVEDATE", "CREATEDATE", "PRINTDATE" };
    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);
    private static readonly Regex FormTextRe = new(@"^\s*FORMTEXT(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    /// <summary>Texto exibido de um campo (resultado em cache ou valor dinâmico).</summary>
    private static List<Run>? FieldRuns(Run run, ParaEnv env)
    {
        string instr = (run.Field ?? "").Trim();
        string name = Js.ToUpper(WsRe.Split(instr)[0]);
        // o Word recalcula estes campos ao imprimir/exportar (oráculo fields)
        if (DynFields.Contains(name) || name.EndsWith("_MARK", StringComparison.Ordinal))
        {
            string? v = env.Field?.Invoke(name, instr);
            if (v is not null)
            {
                var b = run.FieldResult?.FirstOrDefault(r => r.Image is null && r.Textbox is null) ?? run;
                var c = b.ShallowClone();
                c.Text = v;
                c.Field = null;
                c.FieldResult = null;
                return new List<Run> { c };
            }
        }
        if (run.FieldResult is { Count: > 0 })
        {
            // campos aninhados no resultado (PAGEREF dentro do TOC) também são avaliados
            if (!run.FieldResult.Any(r => r.Field is not null)) return run.FieldResult;
            return run.FieldResult.SelectMany(r => r.Field is not null
                ? (FieldRuns(r, env) ?? (r.Text.Length > 0 ? new List<Run> { r } : new List<Run>()))
                : new List<Run> { r }).ToList();
        }
        return null;
    }

    /// <summary>Expande runs de campo no conteúdo exibido.</summary>
    private static List<(Run Run, int Idx, double Offset)> DisplayRuns(Paragraph para, ParaEnv env)
    {
        var outp = new List<(Run, int, double)>();
        double offset = 0;
        for (int idx = 0; idx < para.Runs.Count; idx++)
        {
            var run = para.Runs[idx];
            if (run.FormField?.Type == "checkBox") outp.Add((run, idx, offset));
            else if (run.FormField?.Type == "dropDown" && run.FormField.Entries is { } entries)
            {
                // FORMDROPDOWN: o Word mostra a entrada escolhida com a formatação do
                // fldChar begin — o resultado em cache é ignorado (oráculo hidetext/ff-dropdown)
                int sel = run.FormField.Selected ?? 0;
                string text = sel >= 0 && sel < entries.Count ? entries[sel] : "";
                if (text.Length > 0)
                {
                    var c = run.ShallowClone();
                    c.Text = text;
                    c.Field = null;
                    c.FieldResult = null;
                    c.FormField = null;
                    outp.Add((c, idx, offset));
                }
            }
            else if (run.Field is not null)
            {
                var fr = FieldRuns(run, env);
                if (fr is not null) { foreach (var r in fr) outp.Add((r, idx, offset)); }
                else if (run.Text.Length > 0) outp.Add((run, idx, offset));
            }
            else outp.Add((run, idx, offset));
            offset += run.Text.Length;
        }
        return outp;
    }

    /// <summary>Larguras-padrão (frações do em, ou a largura de outro caractere) dos espaços tipográficos sem glifo na fonte.</summary>
    private static readonly Dictionary<int, (double Em, int? Ch)> SpaceWidths = new()
    {
        [0x2000] = (0.5, null), [0x2001] = (1, null), [0x2002] = (0.5, null), [0x2003] = (1, null), [0x2004] = (1.0 / 3, null),
        [0x2005] = (0.25, null), [0x2006] = (1.0 / 6, null), [0x2007] = (0, 0x30), [0x2008] = (0, 0x2e), [0x2009] = (0.2, null),
        [0x200a] = (0.1, null), [0x200b] = (0, null), [0x202f] = (0, 0x20), [0x205f] = (4.0 / 18, null),
    };

    private static readonly Regex Hex6Prefix = new("^[0-9A-Fa-f]{6}", RegexOptions.CultureInvariant);

    /// <summary>Fundo escuro (o texto de cor automática vira branco).</summary>
    public static bool IsDark(string? hex)
    {
        if (string.IsNullOrEmpty(hex) || !Hex6Prefix.IsMatch(hex)) return false;
        double r = OfficeNext.Core.JsNumber.ParseInt(hex.Substring(0, 2), 16);
        double g = OfficeNext.Core.JsNumber.ParseInt(hex.Substring(2, 2), 16);
        double b = OfficeNext.Core.JsNumber.ParseInt(hex.Substring(4, 2), 16);
        return 0.299 * r + 0.587 * g + 0.114 * b < 80;
    }

    /// <summary>Espaços que são oportunidade de quebra no Word: o comum, "en", "em", o de quatro por em,
    /// o de largura zero e o ideográfico — os demais (quads, três e seis por em, figura,
    /// pontuação, fino, finíssimo, matemático) colam como caracteres (oráculo enspace)</summary>
    private static bool SpaceLike(int cp) => cp is 0x20 or 0x2002 or 0x2003 or 0x2005 or 0x200b or 0x3000;

    /// <summary>/\p{L}|\p{N}/u</summary>
    private static bool IsLetterOrNumber(string s)
    {
        var cat = CharUnicodeInfo.GetUnicodeCategory(s, 0);
        return cat is UnicodeCategory.UppercaseLetter or UnicodeCategory.LowercaseLetter or UnicodeCategory.TitlecaseLetter
            or UnicodeCategory.ModifierLetter or UnicodeCategory.OtherLetter
            or UnicodeCategory.DecimalDigitNumber or UnicodeCategory.LetterNumber or UnicodeCategory.OtherNumber;
    }

    /// <summary>Resolve o pPr final do parágrafo (docDefaults → tabela → estilo → numeração → direto).</summary>
    public static (PPr Ppr, string? StyleId, RPr StyleRPr) ResolvePPr(DocContext ctx, Paragraph para, ParaEnv env)
    {
        var dd = ctx.Resolver.DocDefaults;
        var direct = DocContext.DirectPPr(para);
        string? styleId = ctx.Resolver.ParaStyleId(direct.PStyle);
        var st = ctx.Resolver.ParaStyle(styleId);
        var ppr = Resolve.MergePPr(dd.PPr, env.TablePPr);
        // numeração: o pPr do nível entra no nível de quem a define — direta: entre o
        // estilo e o direto; do estilo: logo ANTES do estilo que traz o numId (o recuo
        // dele e dos derivados manda; o dos pais, não — oráculo numstyind)
        var numPr = (st.PPr.NumPr ?? new NumPr()).With(direct.NumPr);
        bool hasNum = numPr.NumId is { } nid && nid != 0 && !double.IsNaN(nid);
        var lvl = hasNum ? ctx.Numbering.Level(numPr.NumId!.Value, numPr.Ilvl ?? 0) : null;
        void AddLvl()
        {
            if (lvl?.PPr is not null)
            {
                var lp = lvl.PPr.Clone();
                lp.Tabs = null;
                ppr = Resolve.MergePPr(ppr, lp);
            }
            if (lvl?.PPr?.Tabs is not null) ppr = Resolve.MergePPr(ppr, new PPr { Tabs = lvl.PPr.Tabs });
        }
        if (hasNum && direct.NumPr?.NumId is null)
        {
            var chain = ctx.Resolver.ParaChain(styleId);
            int at = -1;
            for (int i = 0; i < chain.Count; i++) if (chain[i].PPr?.NumPr?.NumId is not null) at = i;
            for (int i = 0; i < chain.Count; i++)
            {
                if (i == at) AddLvl();
                ppr = Resolve.MergePPr(ppr, chain[i].PPr);
            }
            if (at < 0) AddLvl();
        }
        else
        {
            ppr = Resolve.MergePPr(ppr, st.PPr);
            if (hasNum) AddLvl();
        }
        ppr = Resolve.MergePPr(ppr, direct);
        ppr.NumPr = numPr;
        return (ppr, styleId, st.RPr);
    }

    /// <summary>
    /// Texto oculto (w:vanish) sem diagramar e sem efeitos colaterais (numeração):
    /// a marca do parágrafo está oculta? há algum run visível com conteúdo?
    /// </summary>
    public static (bool MarkHidden, bool Visible) ParaVisibility(DocContext ctx, Paragraph para, ParaEnv env)
    {
        var (ppr, _, styleRPr) = ResolvePPr(ctx, para, env);
        var dd = ctx.Resolver.DocDefaults;
        RPr RunRPr(RPr rpr) => Resolve.CascadeRPr(dd.RPr, new[] { env.TableRPr, styleRPr, ctx.Resolver.CharStyle(rpr.RStyle) }, rpr);
        static bool Hidden(RPr rpr) => rpr.Vanish == true || rpr.SpecVanish == true;
        bool markHidden = Hidden(RunRPr(ppr.RPr ?? new RPr()));
        bool visible = DisplayRuns(para, env).Any(d =>
            (d.Run.Text.Length > 0 || d.Run.Image is not null || d.Run.Shape is not null || d.Run.Group is not null || d.Run.Textbox is not null
             || d.Run.FormField?.Type == "checkBox" || d.Run.Custom is not null || d.Run.Ptab is not null || d.Run.NoteRef is not null)
            && !Hidden(RunRPr(DocContext.DirectRPr(d.Run))));
        return (markHidden, visible);
    }

    public static PreparedPara PrepareParagraph(DocContext ctx, Paragraph para, ParaEnv env0)
    {
        var (ppr, styleId, styleRPr) = ResolvePPr(ctx, para, env0);
        // sombreamento escuro no parágrafo: o texto de cor automática vira branco
        var pshd = ppr.Shd;
        string? paraFill = Js.Truthy(pshd?.Fill) && pshd!.Fill != "auto" ? pshd.Fill
            : Js.Truthy(pshd?.ThemeFill) ? Resolve.ResolveColor(null, pshd!.ThemeFill, pshd.ThemeFillTint, pshd.ThemeFillShade, ctx.Fmt.Theme) : null;
        ParaEnv env = env0;
        if (paraFill is not null && IsDark(paraFill) && !env0.DarkBackground) { env = env0.Clone(); env.DarkBackground = true; }
        var dd = ctx.Resolver.DocDefaults;
        // rPr de um run: docDefaults → tabela → estilo de parágrafo → estilo de caractere → direto
        RPr RunRPr(RPr rpr) => Resolve.CascadeRPr(dd.RPr, new[] { env.TableRPr, styleRPr, ctx.Resolver.CharStyle(rpr.RStyle) }, rpr);
        bool yenBackslash = ctx.Fmt.Settings.Compat.TryGetValue("doNotLeaveBackslashAlone", out var nlb) && nlb && DocEastAsiaCjk(ctx);
        var markRpr = RunRPr(ppr.RPr ?? new RPr());
        var markStyle = ResolveRunStyle(ctx, markRpr, env);
        var markFace = FaceFor(ctx, markRpr, 0x20, markStyle);

        var glyphs = new List<Glyph>();
        void PushChars(string text, Run run, RPr rpr, RunStyle style, double offset0, int runIdx, bool formText = false)
        {
            string t = text;
            if (rpr.Caps == true) t = Js.ToUpper(t);
            var chars = Js.CodePoints(t);
            double off = offset0;
            for (int i = 0; i < chars.Count; i++)
            {
                string ch = chars[i];
                int cp = Js.CodePointAt0(ch);
                // invisíveis de largura zero (BOM/ZWNBSP, ZWJ/ZWNJ): o Word não
                // os desenha nem busca fonte para eles — não mexem na altura da linha; o
                // ZWNBSP ainda cola no anterior: o espaço logo antes deixa de quebrar (invischars)
                if (cp == 0xfeff || cp == 0x200c || cp == 0x200d)
                {
                    var prevG = glyphs.Count > 0 ? glyphs[^1] : null;
                    if (cp == 0xfeff && prevG?.Kind == GlyphKind.Space) { prevG.Kind = GlyphKind.Nbsp; prevG.BreakAfter = false; }
                    off += ch.Length;
                    continue;
                }
                GlyphKind kind = GlyphKind.Char;
                if (ch == "\t") kind = GlyphKind.Tab;
                else if (ch == "\n" || ch == "\r" || ch == "\u2028") kind = GlyphKind.Lb;
                else if (ch == "\f" || ch == "\u000B")
                {
                    // quebra de página/coluna em célula, cabeçalho ou caixa de texto: o Word ignora
                    if (env.NoPageBreaks) { off += ch.Length; continue; }
                    kind = ch == "\f" ? GlyphKind.Pb : GlyphKind.Cb;
                }
                else if (cp == 0xa0 || cp == 0x202f) kind = GlyphKind.Nbsp;
                else if (cp == 0xad) kind = GlyphKind.Shy;
                // no resultado de campo FORMTEXT os espaços especiais ("en" do campo vazio)
                // são caracteres comuns: nem quebram nem penduram (oráculo formtext, ft-margem)
                else if (SpaceLike(cp) && !(cp != 0x20 && formText)) kind = GlyphKind.Space;
                // versalete: minúsculas viram maiúsculas menores
                double size = style.SizePt;
                string shownCh = ch;
                int shownCp = cp;
                // hífen incondicional (w:noBreakHyphen / U+00AD literal): o Word desenha o
                // HÍFEN da própria fonte (U+002D, mesmo avanço), sem quebra depois (oráculo
                // hidetext/nbh-*) — as fontes comuns nem têm U+2011
                if (cp == 0x2011) shownCp = 0x2d;
                // doNotLeaveBackslashAlone: no texto de idioma eastAsia japonês (com a fonte
                // asiática padrão do documento do Leste Asiático), a barra invertida sai como o
                // iene "¥" (U+00A5) da própria fonte do run (oráculo fejust)
                if (cp == 0x5c && yenBackslash && JaLangRe.IsMatch(rpr.Lang?.EastAsia ?? "")) { shownCh = "\u00a5"; shownCp = 0xa5; }
                if (rpr.SmallCaps == true && rpr.Caps != true && Js.ToLower(ch) == ch && Js.ToUpper(ch) != ch)
                {
                    shownCh = Js.ToUpper(ch);
                    shownCp = Js.CodePointAt0(shownCh);
                    size = Js.Round(style.SizePt * 2 * 0.8) / 2;
                }
                else if (rpr.SmallCaps == true && rpr.Caps != true && cp == 0x20)
                {
                    // versalete: o ESPAÇO também sai no tamanho reduzido; a pontuação não (oráculo scapskern)
                    size = Js.Round(style.SizePt * 2 * 0.8) / 2;
                }
                // quebras (inclusive a U+2028 do w:clear) medem com a fonte do run, sem substituta
                var face = FaceFor(ctx, rpr, kind == GlyphKind.Lb ? 0x20 : shownCp, style, run.SymFont);
                // .notdef da Calibri no lugar do código privado: a altura da linha segue a fonte do run
                var m = Fonts.FaceMetrics(NotdefPua(face, shownCp) ? FaceFor(ctx, rpr, 0x41, style).Font : face.Font);
                double adv = 0;
                double? kernAdj = null;
                if (kind is GlyphKind.Char or GlyphKind.Space or GlyphKind.Nbsp)
                {
                    adv = AdvanceTwips(ctx, face, shownCp, size);
                    // negrito sintético (sem face negrita): +1/2048 em por glifo (oráculo synthbold)
                    if (face.SynthBold) adv += (size * 20) / 2048;
                    if (rpr.W is { } w && w != 0 && !double.IsNaN(w) && w != 100) adv *= w / 100;
                    string? next = i + 1 < chars.Count ? chars[i + 1] : null;
                    // o espaço também kerneia (Arial: " T", " Y", " A" — oráculo kern). Com ligaduras
                    // OpenType (w14:ligatures ≠ none) o Word só usa o 'kern' do script latino do GPOS:
                    // fonte que o registra só em outros scripts (Tahoma, Open Sans) não kerneia (oráculo kernlig)
                    string? lig = rpr.Ligatures;
                    bool kernOff = !string.IsNullOrEmpty(lig) && lig != "none" && face.Font is OfficeNext.Layout.SfntFont { KernInLatin: false };
                    if (next is not null && (kind is GlyphKind.Char or GlyphKind.Space) && rpr.Kern is { } kern && kern != 0 && !double.IsNaN(kern) && style.SizePt * 2 >= kern && !kernOff)
                    {
                        // versalete: o par é o dos glifos DESENHADOS — a minúscula seguinte também vira
                        // maiúscula (oráculo sckern2)
                        string nextShown = rpr.SmallCaps == true && rpr.Caps != true && Js.ToLower(next) == next && Js.ToUpper(next) != next && Js.ToUpper(next).Length == 1 ? Js.ToUpper(next) : next;
                        kernAdj = KernTwips(ctx, face, shownCp, Js.CodePointAt0(nextShown), size);
                        adv += kernAdj.Value;
                    }
                    if (rpr.Spacing is { } sp && sp != 0 && !double.IsNaN(sp)) adv += sp;
                    // seletor de variação (U+FE00–FE0F, ex.: emoji "⚠️"): largura zero (oráculo hidetext/emoji)
                    if (cp >= 0xfe00 && cp <= 0xfe0f) adv = 0;
                }
                // hífen/travessão: quebra depois se o caractere seguinte não é espaço — letra,
                // dígito, pontuação ou símbolo ("abc-_def", "abc–(def": oráculo dashsym)
                bool breakAfter = kind is GlyphKind.Space or GlyphKind.Tab or GlyphKind.Shy
                    || ((cp == 0x2d || cp == 0x2013 || cp == 0x2014) && i + 1 < chars.Count && !NoBreakAfterDash(chars[i + 1]))
                    || Cjk(cp);
                // sobrescrito/subscrito não mudam a altura da linha (medido no Word):
                // a linha mede como se o texto estivesse no corpo original; w:position mede
                var (asc, desc, nAsc, nDesc) = VMetrics(m, style);
                glyphs.Add(new Glyph
                {
                    Kind = kind, Ch = shownCh, Cp = shownCp, Face = face, Style = style, Adv = adv,
                    Asc = asc, Desc = desc, NAsc = nAsc, NDesc = nDesc,
                    Offset = off, RunIdx = runIdx, BreakAfter = breakAfter, SizePt = size,
                    Clear = cp == 0x2028,
                    KernAdj = kernAdj,
                });
                off += ch.Length;
            }
        }

        foreach (var (run, idx, offset) in DisplayRuns(para, env))
        {
            var direct = DocContext.DirectRPr(run);
            // referência de nota: o leitor põe sobrescrito nas props (editor); no layout vale a
            // formatação do documento — estilo do caractere ou rPr direto (oráculo fnrefsup)
            if (run.NoteRef is not null && run.Rpr?.VertAlign is null) direct.VertAlign = null;
            // entradas de sumário (TOC): o Word não aplica o estilo Hyperlink
            if (run.InToc && Js.Truthy(direct.RStyle) && IsHyperlinkStyle(ctx, direct.RStyle!)) direct.RStyle = null;
            var rpr = RunRPr(direct);
            var style = ResolveRunStyle(ctx, rpr, env, run.Props.Link);
            if (style.Hidden) continue;
            if (run.Image is not null || run.Shape is not null || run.Group is not null || run.Textbox is not null)
            {
                bool floating = (run.Image?.Floating ?? run.Shape?.Floating ?? run.Group?.Floating ?? run.Textbox?.Floating) == true;
                var face = FaceFor(ctx, rpr, 0x20, style);
                if (floating)
                {
                    // âncora: ocupa 0 no fluxo, registra o objeto no parágrafo
                    glyphs.Add(new Glyph { Kind = GlyphKind.Obj, Ch = "", Cp = 0xfffc, Face = face, Style = style, Adv = 0, Asc = 0, Desc = 0, Offset = offset, RunIdx = idx, BreakAfter = false, Obj = run, SizePt = style.SizePt });
                    continue;
                }
                // margem de efeitos em linha: soma ao avanço (l/r) e à altura (t/b) — oráculo effext
                var ie = run.Image?.InlineEffect ?? run.Shape?.InlineEffect;
                double w = (run.Image?.WidthTwips ?? run.Shape?.WidthTwips ?? run.Group?.WidthTwips ?? run.Textbox?.WidthTwips ?? 0) + (ie is not null ? ie.L + ie.R : 0);
                double h = (run.Image?.HeightTwips ?? run.Shape?.HeightTwips ?? run.Group?.HeightTwips ?? run.Textbox?.HeightTwips ?? 0) + (ie is not null ? ie.T + ie.B : 0);
                // linha horizontal VML (o:hr): sem largura no fluxo, sozinha na linha (oráculo vmlhr)
                if (run.Shape?.Hr == true)
                {
                    glyphs.Add(new Glyph { Kind = GlyphKind.Obj, Ch = "￼", Cp = 0xfffc, Face = face, Style = style, Adv = 0, Asc = 0, Desc = 0, Offset = offset, RunIdx = idx, BreakAfter = true, Obj = run, SizePt = style.SizePt, Hr = h });
                    continue;
                }
                glyphs.Add(new Glyph
                {
                    Kind = GlyphKind.Obj, Ch = "￼", Cp = 0xfffc, Face = face, Style = style, Adv = w,
                    Asc = Math.Max(0, h + style.Shift), Desc = Math.Max(0, -style.Shift), // a imagem fica na baseline: sem descendente (medido)
                    Offset = offset, RunIdx = idx, BreakAfter = true, Obj = run, SizePt = style.SizePt,
                });
                continue;
            }
            if (run.FormField?.Type == "checkBox")
            {
                // caixa de seleção legada (medido no Word: lado ≈ 1,07 × corpo; avanço = lado + 0,9pt)
                var face = FaceFor(ctx, rpr, 0x20, style);
                double size = run.FormField.SizeAuto || !(run.FormField.SizeHalfPt is { } shp && shp != 0 && !double.IsNaN(shp))
                    ? style.SizePt : run.FormField.SizeHalfPt!.Value / 2;
                double side = 1.07 * size * 20;
                // na linha, a caixa mede como um caractere da fonte do run no tamanho da caixa
                var fm = Fonts.FaceMetrics(face.Font);
                glyphs.Add(new Glyph
                {
                    Kind = GlyphKind.Box, Ch = "☐", Cp = 0x2610, Face = face, Style = style, Adv = side + 18,
                    Asc = fm.Ascent * size * 20, Desc = fm.Descent * size * 20,
                    Offset = offset, RunIdx = idx, BreakAfter = false, SizePt = style.SizePt, Box = new BoxInfo { Side = side, Checked = run.FormField.Checked == true },
                });
                continue;
            }
            if (run.Custom is not null)
            {
                FaceFor(ctx, rpr, 0x20, style);
                string text = run.Custom.FallbackText.Length > 0 ? run.Custom.FallbackText : " ";
                PushChars(text, run, rpr, style, offset, idx);
                continue;
            }
            if (run.Ptab is not null)
            {
                var face = FaceFor(ctx, rpr, 0x20, style);
                glyphs.Add(new Glyph { Kind = GlyphKind.Tab, Ch = "\t", Cp = 9, Face = face, Style = style, Adv = 0, Asc = 0, Desc = 0, Offset = offset, RunIdx = idx, BreakAfter = true, Ptab = run.Ptab, SizePt = style.SizePt });
                continue;
            }
            if (run.NoteRef is not null && run.Text.Length == 0)
            {
                // número exibido = ordem de referência no documento (não o id)
                double num = run.NoteRef.Kind == "footnote" ? ctx.FootnoteNumber(run.NoteRef.Id) : ctx.EndnoteNumber(run.NoteRef.Id);
                int before = glyphs.Count;
                PushChars(Js.Str(num), run, rpr, style, offset, idx);
                if (run.NoteRef.Kind == "footnote") for (int k = before; k < glyphs.Count; k++) glyphs[k].NoteId = run.NoteRef.Id;
                continue;
            }
            PushChars(run.Text, run, rpr, style, offset, idx, idx >= 0 && idx < para.Runs.Count && FormTextRe.IsMatch(para.Runs[idx].Field ?? ""));
        }
        // objeto inline (imagem, forma…) colado ao texto: pode quebrar ANTES dele (o
        // objeto desce sozinho), salvo depois de NBSP (oráculo imgbreak)
        for (int k = 1; k < glyphs.Count; k++)
        {
            if (glyphs[k].Kind != GlyphKind.Obj || !(glyphs[k].Adv > 0)) continue;
            int j = k - 1;
            while (j > 0 && glyphs[j].Kind == GlyphKind.Obj && glyphs[j].Adv == 0) j--; // âncoras de flutuantes não contam
            var pv = glyphs[j];
            if (!pv.BreakAfter && pv.Kind != GlyphKind.Nbsp && !(pv.Kind == GlyphKind.Obj && pv.Adv == 0)) pv.BreakAfter = true;
        }
        // hífen/travessão no FIM de um run: a quebra depois dele depende do caractere
        // seguinte no parágrafo, ainda que em outro run (oráculo breakopp)
        for (int k = 0; k + 1 < glyphs.Count; k++)
        {
            var g = glyphs[k]; var nx = glyphs[k + 1];
            if (!g.BreakAfter && g.Kind == GlyphKind.Char && (g.Cp == 0x2d || g.Cp == 0x2013 || g.Cp == 0x2014) && g.Ch != "\u2011"
                && g.RunIdx != nx.RunIdx && nx.Kind == GlyphKind.Char && !NoBreakAfterDash(nx.Ch)) g.BreakAfter = true;
        }
        ApplyLigatures(ctx, glyphs);
        // kerning na fronteira de dois runs: o par kerneia se a face, o corpo, o idioma e o
        // kerning dos dois batem — cor, sublinhado, estilo de caractere não importam (oráculo kernrun)
        for (int k = 0; k + 1 < glyphs.Count; k++)
        {
            var g = glyphs[k]; var nx = glyphs[k + 1];
            if (g.RunIdx == nx.RunIdx || (g.Kind != GlyphKind.Char && g.Kind != GlyphKind.Space) || (nx.Kind != GlyphKind.Char && nx.Kind != GlyphKind.Space)) continue;
            var a = g.Style.Rpr; var b = nx.Style.Rpr;
            if (!ReferenceEquals(g.Face, nx.Face) || g.SizePt != nx.SizePt || g.Style.SizePt != nx.Style.SizePt || g.Style.Shift != nx.Style.Shift) continue;
            if (!(a.Kern is { } ak && ak != 0 && !double.IsNaN(ak)) || !(b.Kern is { } bk && bk != 0 && !double.IsNaN(bk)) || g.Style.SizePt * 2 < ak || nx.Style.SizePt * 2 < bk) continue;
            if ((a.Lang?.Val ?? "") != (b.Lang?.Val ?? "") || (a.W ?? 100) != (b.W ?? 100)) continue;
            string? lig = a.Ligatures;
            if (!string.IsNullOrEmpty(lig) && lig != "none" && g.Face.Font is OfficeNext.Layout.SfntFont { KernInLatin: false }) continue;
            g.Adv += g.LigEnd is not null || nx.LigStart is not null
                ? KernGlyphs(ctx, g.Face, g.LigEnd ?? g.Face.Font.GlyphId(g.Cp), nx.LigStart ?? g.Face.Font.GlyphId(nx.Cp), g.SizePt)
                : KernTwips(ctx, g.Face, g.Cp, nx.Cp, g.SizePt);
        }
        // espaços comuns encostados num NBSP (antes ou depois — a sequência inteira de
        // espaços): não quebram, a palavra de cada lado fica junta (oráculo nbspglue)
        for (int k = 0; k < glyphs.Count; k++)
        {
            if (glyphs[k].Kind != GlyphKind.Space) continue;
            int e = k;
            while (e + 1 < glyphs.Count && glyphs[e + 1].Kind == GlyphKind.Space) e++;
            if ((k > 0 && glyphs[k - 1].Kind == GlyphKind.Nbsp) || (e + 1 < glyphs.Count && glyphs[e + 1].Kind == GlyphKind.Nbsp))
                for (int j = k; j <= e; j++) glyphs[j].BreakAfter = false;
            k = e;
        }
        // kinsoku (regras de quebra do Leste Asiático): a linha não termina em "$", "(",
        // "“", "£"… — o espaço depois deles não quebra ("R$ 100" desce junto). Vale
        // com idioma eastAsia ja/zh/ko no run; no modo ≤ 14, só se a fonte asiática
        // padrão do documento também for do Leste Asiático; w:kinsoku desligado no
        // parágrafo tira (doNotUseEastAsianBreakRules não — oráculo kinsoku)
        if (ppr.Kinsoku != false)
        {
            for (int k = 1; k < glyphs.Count; k++)
            {
                if (glyphs[k].Kind != GlyphKind.Space || glyphs[k - 1].Kind != GlyphKind.Char) continue;
                var pv = glyphs[k - 1];
                if (!NoLineEnd.Contains(pv.Ch, StringComparison.Ordinal) || !EastAsianBreakRules(ctx, pv.Style.Rpr)) continue;
                for (int j = k; j < glyphs.Count && glyphs[j].Kind == GlyphKind.Space; j++) glyphs[j].BreakAfter = false;
            }
        }
        // layout asiático dos modos ≤ 14 (fonte asiática padrão do documento CJK — oráculo
        // fecompress): com characterSpacingControl ≠ doNotCompress, o espaço comprime até
        // METADE da largura média (OS/2 xAvgCharWidth) da sua fonte — com
        // balanceSingleByteDoubleByteWidth, até ¼ de em —, para a palavra caber, também no
        // alinhado à esquerda; com idioma eastAsia ja/zh/ko, a pontuação final (",", ".",
        // ")"…) pode pendurar além da margem (w:overflowPunct) — no modo 15, só no
        // justificado, somando-se aos 25% de compressão (oráculo hang15)
        var settings = ctx.Fmt.Settings;
        if (DocEastAsiaCjk(ctx))
        {
            bool compress = settings.CompatibilityMode < 15 && Js.Truthy(settings.CharacterSpacingControl) && settings.CharacterSpacingControl != "doNotCompress";
            bool balance = settings.Compat.TryGetValue("balanceSingleByteDoubleByteWidth", out var bal) && bal;
            bool altKinsoku = settings.CompatibilityMode < 15 && settings.Compat.TryGetValue("useAltKinsokuLineBreakRules", out var altK) && altK;
            // com balanceSingleByteDoubleByteWidth, espaços comuns SEGUIDOS (dois ou mais)
            // medem meio em cada — dois valem um caractere de largura dupla — e não comprimem
            // nem expandem no justificado; o espaço isolado fica com a largura da fonte. Nos
            // modos 14 e 15, qualquer que seja a fonte asiática (oráculo fejust)
            if (balance)
            {
                for (int k = 0; k < glyphs.Count; k++)
                {
                    if (glyphs[k].Kind != GlyphKind.Space || glyphs[k].Cp != 0x20) continue;
                    int e = k;
                    while (e + 1 < glyphs.Count && glyphs[e + 1].Kind == GlyphKind.Space && glyphs[e + 1].Cp == 0x20) e++;
                    if (e > k)
                    {
                        for (int j = k; j <= e; j++)
                        {
                            var g = glyphs[j];
                            g.Adv = g.SizePt * 10 + (g.Style.Rpr.Spacing ?? 0);
                            g.Fixed = true;
                        }
                    }
                    k = e;
                }
            }
            // modos ≤ 14 com compressão: o hífen e o travessão não são oportunidade de quebra; o
            // meia-risca é no modo 14, não nos ≤ 12 (oráculo fejust)
            if (compress)
            {
                foreach (var g in glyphs)
                    if (g.Kind == GlyphKind.Char && (g.Cp == 0x2d || g.Cp == 0x2014 || (g.Cp == 0x2013 && settings.CompatibilityMode < 14))) g.BreakAfter = false;
            }
            foreach (var g in glyphs)
            {
                if (compress && g.Kind == GlyphKind.Space && g.Cp == 0x20 && !g.Fixed)
                {
                    double? xAvg = g.Face.Font.Metrics.XAvgCharWidth;
                    double? minSp = balance ? g.SizePt * 20 / 4 : xAvg is { } xa && xa != 0 && !double.IsNaN(xa) ? (xa * g.SizePt * 20) / g.Face.Font.Metrics.UnitsPerEm / 2 : null;
                    if (minSp is { } ms) g.FeShrink = Math.Max(0, g.Adv - ms);
                }
                else if (g.Kind == GlyphKind.Char && ppr.OverflowPunct != false && IsCjkLang(g.Style.Rpr) && g.Ch.Length > 0 && HangPunct(g.Style.Rpr, altKinsoku).Contains(g.Ch, StringComparison.Ordinal)) g.Hang = true;
            }
        }

        // marcador de numeração
        ParaMarker? marker = null;
        double? numId = ppr.NumPr?.NumId;
        if (numId is { } nid && nid != 0 && !double.IsNaN(nid) && env.Numbering != false)
        {
            var nm = ctx.Numbering.Next(nid, ppr.NumPr?.Ilvl ?? 0);
            if (nm is null && (nid == 1001 || nid == 1002))
            {
                // lista criada pelo editor (numId sintético): marcador padrão
                double ilvl = ppr.NumPr?.Ilvl ?? 0;
                string[] bullets = { "•", "o", "▪" };
                double mod = ilvl % 3;
                nm = new NumberMarker
                {
                    Text = nid == 1001 ? (mod >= 0 && mod < 3 && mod == Math.Floor(mod) ? bullets[(int)mod] : "undefined") : "1.",
                    Level = new NumLevel { Ilvl = ilvl, NumFmt = nid == 1001 ? "bullet" : "decimal", Suff = "tab" },
                    NumId = nid, Ilvl = ilvl, ListKey = "synthetic",
                };
            }
            if (nm is not null && (nm.Text.Length > 0 || nm.Level.LvlPicBulletId is not null))
            {
                // rPr do marcador: marca do parágrafo + rPr do nível (sem sublinhado herdado do texto)
                var lvlRpr = nm.Level.RPr ?? new RPr();
                var mrpr = Resolve.MergeRPr(markRpr, lvlRpr);
                var ms = ResolveRunStyle(ctx, mrpr, env);
                var mg = new List<Glyph>();
                double w = 0;
                foreach (var ch in Js.CodePoints(nm.Text))
                {
                    int cp = Js.CodePointAt0(ch);
                    var face = FaceFor(ctx, mrpr, cp, ms);
                    var m = Fonts.FaceMetrics(NotdefPua(face, cp) ? FaceFor(ctx, mrpr, 0x41, ms).Font : face.Font);
                    double adv = AdvanceTwips(ctx, face, cp, ms.SizePt);
                    // escala (w:w) e espaçamento (w:spacing) do rPr do nível também valem no número (oráculo numrpr)
                    if (mrpr.W is { } mw && mw != 0 && !double.IsNaN(mw) && mw != 100) adv *= mw / 100;
                    if (mrpr.Spacing is { } msp && msp != 0 && !double.IsNaN(msp)) adv += msp;
                    mg.Add(new Glyph { Kind = GlyphKind.Char, Ch = ch, Cp = cp, Face = face, Style = ms, Adv = adv, Asc = m.Ascent * ms.SizePt * 20, Desc = m.Descent * ms.SizePt * 20, Offset = -1, RunIdx = -1, BreakAfter = false, SizePt = ms.SizePt });
                    w += adv;
                }
                marker = new ParaMarker { Text = nm.Text, Glyphs = mg, Width = w, Level = nm.Level, Suff = nm.Level.Suff ?? "tab", Jc = nm.Level.LvlJc ?? "left" };
            }
        }

        var ind = ppr.Ind ?? new IndSpec();
        var spc = ppr.Spacing ?? new SpacingSpec();
        string jc = ppr.Jc ?? "left";
        if (jc == "start") jc = "left";
        if (jc == "end") jc = "right";
        double firstLine = ind.Hanging is { } hg ? -hg : (ind.FirstLine ?? 0);
        return new PreparedPara
        {
            Para = para, Ppr = ppr, StyleId = styleId, MarkStyle = markStyle, MarkFace = markFace, Glyphs = glyphs, Marker = marker,
            IndLeft = ind.Left ?? 0,
            IndRight = ind.Right ?? 0,
            FirstLine = firstLine,
            Jc = jc,
            Tabs = (ppr.Tabs ?? new List<TabSpec>()).Where(t => t.Val != "clear").ToList(),
            SpaceBefore = spc.Before ?? 0,
            SpaceAfter = spc.After ?? 0,
            BeforeAuto = spc.BeforeAutospacing == true,
            AfterAuto = spc.AfterAutospacing == true,
            LineRule = spc.LineRule ?? "auto",
            Line = spc.Line ?? 240,
            Contextual = ppr.ContextualSpacing == true,
            KeepNext = ppr.KeepNext == true,
            KeepLines = ppr.KeepLines == true,
            WidowControl = ppr.WidowControl ?? false,
            PageBreakBefore = ppr.PageBreakBefore == true,
            Empty = glyphs.All(g => g.Kind == GlyphKind.Pb || (g.Kind == GlyphKind.Obj && g.Obj is not null
                && (g.Obj.Image?.Floating == true || g.Obj.Shape?.Floating == true || g.Obj.Group?.Floating == true || g.Obj.Textbox?.Floating == true))),
        };
    }
}
