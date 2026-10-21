using System.Globalization;
using System.Text.RegularExpressions;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Cascata de propriedades do Word (ECMA-376 §17.7.2) — porta de
/// docx-layout/src/resolve.ts:
///   parágrafo: docDefaults → estilo de tabela (+condicionais) → estilo de
///              parágrafo (cadeia basedOn) → nível de numeração → direto
///   run:       docDefaults → estilo de tabela → estilo de parágrafo → estilo
///              de caractere → direto
/// Propriedades ALTERNÁVEIS (b, i, caps…) entre TIPOS de estilo combinam por
/// XOR (§17.7.3); a formatação direta é absoluta.
/// </summary>
public static class Resolve
{
    // ───────────────────────── merges ─────────────────────────

    /// <summary>rFonts: cada SLOT (ascii/hAnsi/eastAsia/cs) é um par nome|tema; o nível
    /// de cima que define qualquer dos dois substitui o slot inteiro.</summary>
    public static RFonts? MergeRFonts(RFonts? b, RFonts? over)
    {
        if (over is null) return b;
        if (b is null) return over.Clone();
        var o = b.Clone();
        if (over.Ascii is not null || over.AsciiTheme is not null) { o.Ascii = over.Ascii; o.AsciiTheme = over.AsciiTheme; }
        if (over.HAnsi is not null || over.HAnsiTheme is not null) { o.HAnsi = over.HAnsi; o.HAnsiTheme = over.HAnsiTheme; }
        if (over.EastAsia is not null || over.EastAsiaTheme is not null) { o.EastAsia = over.EastAsia; o.EastAsiaTheme = over.EastAsiaTheme; }
        if (over.Cs is not null || over.CsTheme is not null) { o.Cs = over.Cs; o.CsTheme = over.CsTheme; }
        if (over.Hint is not null) o.Hint = over.Hint;
        return o;
    }

    public static RPr MergeRPr(RPr? b, RPr? over)
    {
        if (over is null) return b?.Clone() ?? new RPr();
        if (b is null) return over.Clone();
        var o = b.With(over);
        var f = MergeRFonts(b.RFonts, over.RFonts);
        if (f is not null) o.RFonts = f;
        if (b.Lang is not null && over.Lang is not null) o.Lang = b.Lang.With(over.Lang);
        return o;
    }

    private static List<TabSpec>? MergeTabs(List<TabSpec>? b, List<TabSpec>? over)
    {
        if (over is null) return b;
        // Map por posição (inserção preservada; set em chave existente mantém a posição)
        var keys = new List<double>();
        var map = new Dictionary<double, TabSpec>();
        void Set(TabSpec t)
        {
            if (!map.ContainsKey(t.Pos)) keys.Add(t.Pos);
            map[t.Pos] = t;
        }
        foreach (var t in b ?? new List<TabSpec>()) Set(t);
        foreach (var t in over)
        {
            if (t.Val == "clear") { if (map.Remove(t.Pos)) keys.RemoveAll(k => k.Equals(t.Pos)); }
            else Set(t);
        }
        return keys.Select(k => map[k]).OrderBy(t => t.Pos, JsNumberComparer.Instance).ToList();
    }

    public static PPr MergePPr(PPr? b, PPr? over)
    {
        if (over is null) return b?.Clone() ?? new PPr();
        if (b is null)
        {
            var c = over.Clone();
            if (over.Tabs is not null) c.Tabs = over.Tabs.Where(t => t.Val != "clear").ToList();
            return c;
        }
        var o = b.With(over);
        if (b.Spacing is not null || over.Spacing is not null) o.Spacing = (b.Spacing ?? new SpacingSpec()).With(over.Spacing);
        if (b.Ind is not null || over.Ind is not null)
        {
            var ind = (b.Ind ?? new IndSpec()).With(over.Ind);
            // firstLine × hanging são o mesmo "slot"
            if (over.Ind?.Hanging is not null && over.Ind.FirstLine is null) ind.FirstLine = null;
            if (over.Ind?.FirstLine is not null && over.Ind.Hanging is null) ind.Hanging = null;
            if (over.Ind?.HangingChars is not null) ind.FirstLineChars = null;
            if (over.Ind?.FirstLineChars is not null) ind.HangingChars = null;
            o.Ind = ind;
        }
        if (b.PBdr is not null || over.PBdr is not null) o.PBdr = (b.PBdr ?? new PBdr()).With(over.PBdr);
        if (b.NumPr is not null || over.NumPr is not null) o.NumPr = (b.NumPr ?? new NumPr()).With(over.NumPr);
        var tabs = MergeTabs(b.Tabs, over.Tabs);
        o.Tabs = tabs; // {…base, …over}.tabs é sobrescrito pelo merge (ou volta a base.tabs)
        if (b.RPr is not null || over.RPr is not null) o.RPr = MergeRPr(b.RPr, over.RPr);
        if (b.FramePr is not null || over.FramePr is not null) o.FramePr = (b.FramePr ?? new FramePr()).With(over.FramePr);
        return o;
    }

    private static TblBorders? MergeBorders(TblBorders? b, TblBorders? over)
    {
        if (over is null) return b;
        if (b is null) return new TblBorders().With(over);
        return b.With(over);
    }

    private static CellMargins? MergeMargins(CellMargins? b, CellMargins? over)
    {
        if (over is null) return b;
        if (b is null) return new CellMargins().With(over);
        return b.With(over);
    }

    public static TblPr MergeTblPr(TblPr? b, TblPr? over)
    {
        if (over is null) return b?.Clone() ?? new TblPr();
        if (b is null) return over.Clone();
        var o = b.With(over);
        var bd = MergeBorders(b.TblBorders, over.TblBorders);
        if (bd is not null) o.TblBorders = bd;
        var m = MergeMargins(b.TblCellMar, over.TblCellMar);
        if (m is not null) o.TblCellMar = m;
        if (b.TblLook is not null || over.TblLook is not null) o.TblLook = (b.TblLook ?? new TblLook()).With(over.TblLook);
        return o;
    }

    public static TrPr MergeTrPr(TrPr? b, TrPr? over) => (b ?? new TrPr()).With(over);

    public static TcPr MergeTcPr(TcPr? b, TcPr? over)
    {
        if (over is null) return b?.Clone() ?? new TcPr();
        if (b is null) return over.Clone();
        var o = b.With(over);
        var bd = MergeBorders(b.TcBorders, over.TcBorders);
        if (bd is not null) o.TcBorders = bd;
        var m = MergeMargins(b.TcMar, over.TcMar);
        if (m is not null) o.TcMar = m;
        return o;
    }

    /// <summary>
    /// Combina os níveis de run com a semântica do Word: níveis de ESTILO
    /// (tabela, parágrafo, caractere) — cada um já resolvido na sua cadeia basedOn —
    /// aplicam as alternáveis por XOR; docDefaults é a base; o direto é absoluto.
    /// </summary>
    public static RPr CascadeRPr(RPr? docDefaults, IEnumerable<RPr?> styleLevels, RPr? direct)
    {
        var outp = docDefaults?.Clone() ?? new RPr();
        var toggled = new bool?[RPr.ToggleCount];
        foreach (var lvl in styleLevels)
        {
            if (lvl is null) continue;
            var rest = lvl.Clone();
            for (int k = 0; k < RPr.ToggleCount; k++)
            {
                var v = lvl.GetToggle(k);
                if (v is null) continue;
                rest.SetToggle(k, null);
                if (v.Value) toggled[k] = !(toggled[k] ?? false);
                else toggled[k] ??= false;
            }
            outp = MergeRPr(outp, rest);
        }
        for (int k = 0; k < RPr.ToggleCount; k++)
        {
            var t = toggled[k];
            if (t is null) continue;
            bool b = docDefaults?.GetToggle(k) ?? false;
            outp.SetToggle(k, t.Value ? !b : b);
        }
        return MergeRPr(outp, direct);
    }

    // ───────────────────────── fontes de tema ─────────────────────────

    /// <summary>Nome de fonte de um slot rFonts (tema tem prioridade sobre o nome).
    /// slot: ascii | hAnsi | eastAsia | cs</summary>
    public static string? FontOfSlot(RFonts? rf, string slot, Theme theme)
    {
        if (rf is null) return null;
        string? t = slot switch
        {
            "cs" => rf.CsTheme,
            "ascii" => rf.AsciiTheme,
            "hAnsi" => rf.HAnsiTheme,
            _ => rf.EastAsiaTheme,
        };
        if (!string.IsNullOrEmpty(t))
        {
            var set = t.StartsWith("major", StringComparison.Ordinal) ? theme.Major : theme.Minor;
            string? name = t.EndsWith("EastAsia", StringComparison.Ordinal) ? set.Ea : t.EndsWith("Bidi", StringComparison.Ordinal) ? set.Cs : set.Latin;
            if (!string.IsNullOrEmpty(name)) return name;
        }
        return slot switch
        {
            "cs" => rf.Cs,
            "ascii" => rf.Ascii,
            "hAnsi" => rf.HAnsi,
            _ => rf.EastAsia,
        };
    }

    // ───────────────────────── cores ─────────────────────────

    private static readonly Dictionary<string, string> Highlight = new(StringComparer.Ordinal)
    {
        ["yellow"] = "FFFF00", ["green"] = "00FF00", ["cyan"] = "00FFFF", ["magenta"] = "FF00FF", ["blue"] = "0000FF", ["red"] = "FF0000",
        ["darkBlue"] = "000080", ["darkCyan"] = "008080", ["darkGreen"] = "008000", ["darkMagenta"] = "800080", ["darkRed"] = "800000",
        ["darkYellow"] = "808000", ["darkGray"] = "808080", ["lightGray"] = "C0C0C0", ["black"] = "000000", ["white"] = "FFFFFF",
    };

    public static string? HighlightHex(string? name) =>
        !string.IsNullOrEmpty(name) && Highlight.TryGetValue(name, out var h) ? h : null;

    internal static readonly Dictionary<string, string> ThemeAlias = new(StringComparer.Ordinal)
    {
        ["text1"] = "dk1", ["background1"] = "lt1", ["text2"] = "dk2", ["background2"] = "lt2", ["dark1"] = "dk1", ["light1"] = "lt1", ["dark2"] = "dk2", ["light2"] = "lt2",
        ["hyperlink"] = "hlink", ["followedHyperlink"] = "folHlink", ["tx1"] = "dk1", ["bg1"] = "lt1", ["tx2"] = "dk2", ["bg2"] = "lt2",
    };

    private static double Hex2(string hex, int at) =>
        OfficeNext.Core.JsNumber.ParseInt(at < hex.Length ? hex.Substring(at, Math.Min(2, hex.Length - at)) : "", 16);

    private static (double R, double G, double B) Rgb(string hex) => (Hex2(hex, 0), Hex2(hex, 2), Hex2(hex, 4));

    private static string C2(double v)
    {
        double c = Math.Max(0, Math.Min(255, Js.Round(v)));
        if (double.IsNaN(v)) return "NaN";
        string s = ((int)c).ToString("x", CultureInfo.InvariantCulture);
        return s.Length < 2 ? "0" + s : s;
    }

    internal static string ToHex(double r, double g, double b) => (C2(r) + C2(g) + C2(b)).ToUpperInvariant();

    /// <summary>themeTint/themeShade do WordprocessingML (aplicados em RGB, como o Word).</summary>
    /// <summary>themeTint/themeShade: luminosidade em HSL a partir da cor do tema
    /// (shade: L·s; tint: L·t + 1 − t), canais truncados — medido no PDF do Word.</summary>
    public static string ApplyTintShade(string hex, string? tint, string? shade)
    {
        if (string.IsNullOrEmpty(tint) && string.IsNullOrEmpty(shade)) return hex.ToUpperInvariant();
        var (r0, g0, b0) = Rgb(hex);
        double r = r0 / 255, g = g0 / 255, b = b0 / 255;
        double mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
        double l = (mx + mn) / 2, h = 0, s = 0;
        if (mx != mn)
        {
            double d = mx - mn;
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            h = (mx == r ? (g - b) / d + (g < b ? 6 : 0) : mx == g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
        }
        if (!string.IsNullOrEmpty(shade)) l *= OfficeNext.Core.JsNumber.ParseInt(shade, 16) / 255;
        if (!string.IsNullOrEmpty(tint)) { double t = OfficeNext.Core.JsNumber.ParseInt(tint, 16) / 255; l = l * t + 1 - t; }
        double q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        double Ch(double x)
        {
            if (x < 0) x += 1;
            if (x > 1) x -= 1;
            double v = x < 1.0 / 6 ? p + (q - p) * 6 * x : x < 1.0 / 2 ? q : x < 2.0 / 3 ? p + (q - p) * (2.0 / 3 - x) * 6 : p;
            return Math.Floor(v * 255);
        }
        return ToHex(Ch(h + 1.0 / 3), Ch(h), Ch(h - 1.0 / 3));
    }

    private static readonly Regex Hex6 = new(@"^[0-9a-fA-F]{6}\z", RegexOptions.CultureInvariant);

    public static bool IsHex6(string? s) => s is not null && Hex6.IsMatch(s);

    /// <summary>Cor efetiva (RRGGBB) de val/themeColor/tint/shade; nulo = automática.</summary>
    public static string? ResolveColor(string? val, string? themeColor, string? themeTint, string? themeShade, Theme theme)
    {
        if (!string.IsNullOrEmpty(themeColor))
        {
            string key = ThemeAlias.TryGetValue(themeColor, out var k) ? k : themeColor;
            if (theme.Colors.TryGetValue(key, out var b) && !string.IsNullOrEmpty(b)) return ApplyTintShade(b, themeTint, themeShade);
        }
        string? v = val;
        if (string.IsNullOrEmpty(v) || v == "auto") return null;
        return Hex6.IsMatch(v) ? v.ToUpperInvariant() : null;
    }

    public static string? ResolveColor(ColorSpec? spec, Theme theme) =>
        spec is null ? null : ResolveColor(spec.Val, spec.ThemeColor, spec.ThemeTint, spec.ThemeShade, theme);

    /// <summary>Cobertura da cor do padrão em cada w:shd (ladrilho 8×8 de 0,96 pt do PDF do Word): o padrão sai
    /// como a MISTURA da cor do padrão sobre o preenchimento — porta de resolve.ts SHD_COVER.</summary>
    private static readonly Dictionary<string, double> ShdCover = new()
    {
        ["horzStripe"] = 0.5, ["vertStripe"] = 0.5, ["reverseDiagStripe"] = 0.5, ["diagStripe"] = 0.5, ["horzCross"] = 0.5, ["diagCross"] = 0.75,
        ["thinHorzStripe"] = 0.25, ["thinVertStripe"] = 0.25, ["thinReverseDiagStripe"] = 0.25, ["thinDiagStripe"] = 0.25,
        ["thinHorzCross"] = 0.4375, ["thinDiagCross"] = 0.4375, ["pct12"] = 0.125, ["pct37"] = 0.375, ["pct62"] = 0.625, ["pct87"] = 0.875,
    };
    private static readonly Regex PctShd = new(@"^pct\d+\z", RegexOptions.CultureInvariant);

    /// <summary>Cor efetiva de um w:shd (célula, parágrafo, run): preenchimento, sólido ou a mistura do padrão; nulo = nenhum.</summary>
    public static string? ShadingFill(ShadingSpec? shd, Theme theme)
    {
        if (shd is null || shd.Val == "nil") return null;
        string Fg() => ResolveColor(shd.Color, shd.ThemeColor, null, null, theme) ?? "000000";
        if (shd.Val == "solid") return Fg();
        string? fill = Js.Truthy(shd.ThemeFill)
            ? ResolveColor(null, shd.ThemeFill, shd.ThemeFillTint, shd.ThemeFillShade, theme)
            : Js.Truthy(shd.Fill) && shd.Fill != "auto" ? Js.ToUpper(shd.Fill!) : null;
        string v = shd.Val ?? "clear";
        double cover;
        if (ShdCover.TryGetValue(v, out var cv)) cover = cv;
        else if (PctShd.IsMatch(v)) cover = Js.ParseInt(v[3..]) / 100;
        else return fill;
        string f = Fg(), bg = fill ?? "FFFFFF";
        double Hex2(string s, int i) => OfficeNext.Core.JsNumber.ParseInt(i < s.Length ? s.Substring(i, Math.Min(2, s.Length - i)) : "", 16);
        string Part(int i)
        {
            double x = Js.Round(Hex2(bg, i) * (1 - cover) + Hex2(f, i) * cover);
            if (double.IsNaN(x)) return "NaN";
            string s = ((long)x).ToString("x", CultureInfo.InvariantCulture);
            return s.Length < 2 ? "0" + s : s;
        }
        return (Part(0) + Part(2) + Part(4)).ToUpperInvariant();
    }

    /// <summary>Cor de DrawingML com modificadores ("RRGGBB|lumMod=75000,lumOff=…" ou "@accent1|…").</summary>
    public static string? ResolveDrawingColor(string? spec, Theme theme)
    {
        if (string.IsNullOrEmpty(spec)) return null;
        var parts = spec.Split('|');
        string head = parts[0];
        string? mods = parts.Length > 1 ? parts[1] : null;
        string? hex;
        if (head.StartsWith('@'))
        {
            string k = head[1..];
            string key = ThemeAlias.TryGetValue(k, out var a) ? a : k;
            hex = theme.Colors.TryGetValue(key, out var c) ? c : null;
        }
        else hex = head;
        if (string.IsNullOrEmpty(hex) || !Hex6.IsMatch(hex)) return null;
        if (string.IsNullOrEmpty(mods)) return hex.ToUpperInvariant();
        var (r0, g0, b0) = Rgb(hex);
        double r = r0 / 255, g = g0 / 255, bl = b0 / 255;
        // HSL p/ lumMod/lumOff
        (double, double, double) ToHsl()
        {
            double mx = Math.Max(Math.Max(r, g), bl), mn = Math.Min(Math.Min(r, g), bl);
            double l = (mx + mn) / 2;
            if (mx == mn) return (0, 0, l);
            double d = mx - mn;
            double s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            double h = mx == r ? (g - bl) / d + (g < bl ? 6 : 0) : mx == g ? (bl - r) / d + 2 : (r - g) / d + 4;
            return (h / 6, s, l);
        }
        void FromHsl(double h, double s, double l)
        {
            if (s == 0) { r = g = bl = l; return; }
            double q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            double p = 2 * l - q;
            double F(double t)
            {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1.0 / 6) return p + (q - p) * 6 * t;
                if (t < 1.0 / 2) return q;
                if (t < 2.0 / 3) return p + (q - p) * (2.0 / 3 - t) * 6;
                return p;
            }
            r = F(h + 1.0 / 3); g = F(h); bl = F(h - 1.0 / 3);
        }
        foreach (var m in mods.Split(','))
        {
            var kv = m.Split('=');
            string k = kv[0];
            double v = OfficeNext.Core.JsNumber.ParseInt(kv.Length > 1 ? kv[1] : "0", 10) / 100000;
            if (k == "lumMod" || k == "lumOff")
            {
                var (h, s, l) = ToHsl();
                FromHsl(h, s, k == "lumMod" ? Math.Min(1, l * v) : Math.Min(1, l + v));
            }
            else if (k == "tint")
            {
                r = 1 - (1 - r) * v; g = 1 - (1 - g) * v; bl = 1 - (1 - bl) * v;
            }
            else if (k == "shade")
            {
                r *= v; g *= v; bl *= v;
            }
        }
        return ToHex(r * 255, g * 255, bl * 255);
    }
}

/// <summary>Comparação numérica estilo (a, b) => a - b do sort do JS (NaN = empate).</summary>
public sealed class JsNumberComparer : IComparer<double>
{
    public static readonly JsNumberComparer Instance = new();
    public int Compare(double a, double b)
    {
        double d = a - b;
        return d < 0 ? -1 : d > 0 ? 1 : 0;
    }
}

public sealed class ResolvedParaStyle
{
    public PPr PPr = new();
    public RPr RPr = new();
}

public sealed class ResolvedTableStyle
{
    public TblPr TblPr = new();
    public TrPr TrPr = new();
    public TcPr TcPr = new();
    public PPr PPr = new();
    public RPr RPr = new();
    public Dictionary<string, TblStylePart> Cond = new(StringComparer.Ordinal);
    /// <summary>há estilo de tabela (próprio ou o padrão do documento): sem margens de célula
    /// nele, elas são 0 — o Word não usa os 108 twips embutidos (oráculo tblstyletr)</summary>
    public bool HasStyle;
}

public sealed class StyleResolver
{
    private readonly Dictionary<string, ResolvedParaStyle> _paraCache = new(StringComparer.Ordinal);
    private readonly Dictionary<string, RPr> _charCache = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ResolvedTableStyle> _tableCache = new(StringComparer.Ordinal);
    public readonly JsRecord<StyleDef> Styles;
    public readonly DocDefaults DocDefaults;
    public readonly StyleDefaults Defaults;
    public readonly DocFormatting Fmt;

    /// <summary>Ordem de aplicação das formatações condicionais (a última vence).</summary>
    public static readonly string[] CondOrder =
    {
        "wholeTable", "band1Vert", "band2Vert", "band1Horz", "band2Horz",
        "firstCol", "lastCol", "firstRow", "lastRow", "nwCell", "neCell", "swCell", "seCell",
    };

    public StyleResolver(DocFormatting fmt)
    {
        Fmt = fmt;
        Styles = fmt.Styles.Styles;
        DocDefaults = fmt.Styles.DocDefaults;
        Defaults = fmt.Styles.Defaults;
    }

    private List<StyleDef> Chain(string? id, string type)
    {
        var outp = new List<StyleDef>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var cur = !string.IsNullOrEmpty(id) ? Styles[id] : null;
        while (cur is not null && !seen.Contains(cur.StyleId) && outp.Count < 32)
        {
            if (cur.Type != type) break;
            seen.Add(cur.StyleId);
            outp.Insert(0, cur);
            cur = !string.IsNullOrEmpty(cur.BasedOn) ? Styles[cur.BasedOn] : null;
        }
        return outp;
    }

    /// <summary>Cadeia basedOn de um estilo de parágrafo (raiz primeiro).</summary>
    public List<StyleDef> ParaChain(string? id) => Chain(ParaStyleId(id) ?? "", "paragraph");

    /// <summary>Estilo de parágrafo efetivo (ausente/inexistente → estilo padrão).</summary>
    public string? ParaStyleId(string? id)
    {
        if (!string.IsNullOrEmpty(id) && Styles[id]?.Type == "paragraph") return id;
        return Defaults.Paragraph;
    }

    public ResolvedParaStyle ParaStyle(string? id)
    {
        string key = ParaStyleId(id) ?? "";
        if (!_paraCache.TryGetValue(key, out var r))
        {
            var pPr = new PPr();
            var rPr = new RPr();
            foreach (var s in Chain(key, "paragraph"))
            {
                pPr = Resolve.MergePPr(pPr, s.PPr);
                rPr = Resolve.MergeRPr(rPr, s.RPr);
            }
            r = new ResolvedParaStyle { PPr = pPr, RPr = rPr };
            _paraCache[key] = r;
        }
        return r;
    }

    public RPr CharStyle(string? id)
    {
        if (string.IsNullOrEmpty(id)) return new RPr();
        if (!_charCache.TryGetValue(id, out var r))
        {
            r = new RPr();
            foreach (var s in Chain(id, "character")) r = Resolve.MergeRPr(r, s.RPr);
            // estilo "vinculado" usado como rStyle: vale o rPr do estilo de parágrafo
            if (Chain(id, "character").Count == 0 && Styles[id]?.Type == "paragraph") r = ParaStyle(id).RPr;
            _charCache[id] = r;
        }
        return r;
    }

    public ResolvedTableStyle TableStyle(string? id)
    {
        string key = !string.IsNullOrEmpty(id) && Styles[id]?.Type == "table" ? id : (Defaults.Table ?? "");
        if (!_tableCache.TryGetValue(key, out var r))
        {
            r = new ResolvedTableStyle();
            if (Chain(key, "table").Count > 0) r.HasStyle = true;
            foreach (var s in Chain(key, "table"))
            {
                r.TblPr = Resolve.MergeTblPr(r.TblPr, s.TblPr);
                r.TrPr = Resolve.MergeTrPr(r.TrPr, s.TrPr);
                r.TcPr = Resolve.MergeTcPr(r.TcPr, s.TcPr);
                r.PPr = Resolve.MergePPr(r.PPr, s.PPr);
                r.RPr = Resolve.MergeRPr(r.RPr, s.RPr);
                if (s.TblStylePr is not null)
                {
                    foreach (var (t, part) in s.TblStylePr)
                    {
                        r.Cond.TryGetValue(t, out var prev);
                        prev ??= new TblStylePart();
                        r.Cond[t] = new TblStylePart
                        {
                            PPr = Resolve.MergePPr(prev.PPr, part.PPr),
                            RPr = Resolve.MergeRPr(prev.RPr, part.RPr),
                            TblPr = Resolve.MergeTblPr(prev.TblPr, part.TblPr),
                            TrPr = Resolve.MergeTrPr(prev.TrPr, part.TrPr),
                            TcPr = Resolve.MergeTcPr(prev.TcPr, part.TcPr),
                        };
                    }
                }
            }
            _tableCache[key] = r;
        }
        return r;
    }
}
