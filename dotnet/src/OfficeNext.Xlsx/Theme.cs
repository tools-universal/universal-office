using System.Globalization;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Xlsx;

/// <summary>Tema do workbook (xl/theme/theme1.xml) + paleta indexada legada —
/// porta de sheet-core/src/theme.ts (índices 0/1 e 2/3 trocados claro/escuro).</summary>
public sealed class Theme
{
    /// <summary>Paleta indexável pelo atributo theme="N" (ordem trocada).</summary>
    public List<string> Colors = new();
    /// <summary>Cores por nome do slot do clrScheme (dk1, lt1, accent1, …).</summary>
    public Dictionary<string, string> ByName = new(StringComparer.Ordinal);
}

/// <summary>Contexto de resolução de cor: paleta do tema + tabela indexada efetiva.</summary>
public sealed class ColorContext
{
    public required Theme Theme { get; init; }
    public required List<string> Indexed { get; init; }
}

public static class ThemeReader
{
    /// <summary>Paleta Office padrão — fallback quando o pacote não traz theme1.xml.</summary>
    public static readonly string[] DefaultThemeColors =
    [
        "#FFFFFF", // 0 lt1 (background1)
        "#000000", // 1 dk1 (text1)
        "#E7E6E6", // 2 lt2
        "#44546A", // 3 dk2
        "#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", // 4-9 accent1-6
        "#0563C1", // 10 hyperlink
        "#954F72", // 11 followedHyperlink
    ];

    private static readonly (string Slot, int Idx)[] SlotToIndex =
    [
        ("lt1", 0), ("dk1", 1), ("lt2", 2), ("dk2", 3),
        ("accent1", 4), ("accent2", 5), ("accent3", 6), ("accent4", 7), ("accent5", 8), ("accent6", 9),
        ("hlink", 10), ("folHlink", 11),
    ];

    private static Theme DefaultTheme()
    {
        var theme = new Theme { Colors = new List<string>(DefaultThemeColors) };
        foreach (var (slot, idx) in SlotToIndex) theme.ByName[slot] = theme.Colors[idx];
        return theme;
    }

    private static string? SchemeSlotColor(XmlElement slot)
    {
        foreach (var c in ChildElements(slot))
        {
            if (c.Name == "a:srgbClr")
            {
                string val = c.Attr("val") ?? "000000";
                return "#" + Last6(val).ToUpperInvariant();
            }
            if (c.Name == "a:sysClr")
            {
                string? last = c.Attr("lastClr");
                if (last is not null) return "#" + Last6(last).ToUpperInvariant();
                return c.Attr("val") == "window" ? "#FFFFFF" : "#000000";
            }
        }
        return null;
    }

    private static string Last6(string s) => s.Length <= 6 ? s : s[^6..];

    /// <summary>Lê xl/theme/theme1.xml → paleta do tema (fallback: paleta Office).</summary>
    public static Theme ReadTheme(OpcPackage pkg)
    {
        string? xml = pkg.GetPartText(ThemePath(pkg));
        if (xml is null) return DefaultTheme();
        XmlElement root;
        try { root = Parse(xml); }
        catch { return DefaultTheme(); }
        var themeEls = FirstChild(root, "a:themeElements");
        var scheme = themeEls is not null ? FirstChild(themeEls, "a:clrScheme") : null;
        if (scheme is null) return DefaultTheme();
        var theme = DefaultTheme();
        foreach (var slot in ChildElements(scheme))
        {
            string name = slot.Name.StartsWith("a:", StringComparison.Ordinal) ? slot.Name[2..] : slot.Name;
            int? idx = null;
            foreach (var (s, i) in SlotToIndex) if (s == name) { idx = i; break; }
            string? color = SchemeSlotColor(slot);
            if (color is null) continue;
            theme.ByName[name] = color;
            if (idx is int ii) theme.Colors[ii] = color;
        }
        return theme;
    }

    private static string ThemePath(OpcPackage pkg)
    {
        if (pkg.GetPart("xl/theme/theme1.xml") is not null) return "xl/theme/theme1.xml";
        string? rels = pkg.GetPartText("xl/_rels/workbook.xml.rels");
        if (rels is not null)
        {
            try
            {
                var root = Parse(rels);
                foreach (var rel in ChildElements(root, "Relationship"))
                {
                    if ((rel.Attr("Type") ?? "").EndsWith("/theme", StringComparison.Ordinal) && rel.Attr("Target") is string t)
                        return pkg.ResolveRelTarget("xl/workbook.xml", t);
                }
            }
            catch { /* rels inválido: cai no canônico */ }
        }
        return "xl/theme/theme1.xml";
    }

    // ───────────────────────── Cores indexadas legadas ─────────────────────────

    public static readonly string[] IndexedColorsDefault =
    [
        "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", // 0-7
        "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", // 8-15
        "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080", // 16-23
        "#9999FF", "#993366", "#FFFFCC", "#CCFFFF", "#660066", "#FF8080", "#0066CC", "#CCCCFF", // 24-31
        "#000080", "#FF00FF", "#FFFF00", "#00FFFF", "#800080", "#800000", "#008080", "#0000FF", // 32-39
        "#00CCFF", "#CCFFFF", "#CCFFCC", "#FFFF99", "#99CCFF", "#FF99CC", "#CC99FF", "#FFCC99", // 40-47
        "#3366FF", "#33CCCC", "#99CC00", "#FFCC00", "#FF9900", "#FF6600", "#666699", "#969696", // 48-55
        "#003366", "#339966", "#003300", "#333300", "#993300", "#993366", "#333399", "#333333", // 56-63
        "#000000", // 64 system foreground
        "#FFFFFF", // 65 system background
    ];

    public static List<string> ReadIndexedColors(OpcPackage pkg)
    {
        var outp = new List<string>(IndexedColorsDefault);
        string? xml = pkg.GetPartText("xl/styles.xml");
        if (xml is null) return outp;
        XmlElement root;
        try { root = Parse(xml); }
        catch { return outp; }
        var colorsEl = FirstChild(root, "colors");
        var idxEl = colorsEl is not null ? FirstChild(colorsEl, "indexedColors") : null;
        if (idxEl is null) return outp;
        int i = 0;
        foreach (var rc in ChildElements(idxEl, "rgbColor"))
        {
            string? rgb = rc.Attr("rgb");
            if (rgb is not null)
            {
                while (outp.Count <= i) outp.Add("#000000");
                outp[i] = "#" + Last6(rgb).ToUpperInvariant();
            }
            i++;
        }
        return outp;
    }

    // ───────────────────────── Resolução de cor ─────────────────────────

    public static ColorContext BuildColorContext(OpcPackage pkg) =>
        new() { Theme = ReadTheme(pkg), Indexed = ReadIndexedColors(pkg) };

    public static ColorContext DefaultColorContext() =>
        new() { Theme = DefaultTheme(), Indexed = new List<string>(IndexedColorsDefault) };

    /// <summary>Resolve um &lt;color&gt;/&lt;fgColor&gt;/&lt;bgColor&gt; → #RRGGBB (tint aplicado).</summary>
    public static string? ResolveColorEl(XmlElement c, ColorContext? cx)
    {
        var ctx = cx ?? DefaultColorContext();
        string? baseColor = null;
        string? rgb = c.Attr("rgb");
        string? theme = c.Attr("theme");
        string? indexed = c.Attr("indexed");
        if (rgb is not null) baseColor = "#" + Last6(rgb);
        else if (theme is not null)
        {
            int ti = JsNumber.ParseIntOr(theme, -1);
            baseColor = ti >= 0 && ti < ctx.Theme.Colors.Count ? ctx.Theme.Colors[ti] : "#000000";
        }
        else if (indexed is not null)
        {
            int ii = JsNumber.ParseIntOr(indexed, -1);
            baseColor = ii >= 0 && ii < ctx.Indexed.Count ? ctx.Indexed[ii] : "#000000";
        }
        else if (c.Attr("auto") is "1" or "true") baseColor = "#000000";
        if (baseColor is null) return null;
        string? tint = c.Attr("tint");
        return tint is not null ? ApplyTint(baseColor, JsNumber.ParseFloat(tint)) : baseColor;
    }

    /// <summary>Aplica `tint` (-1..1) na LUMINOSIDADE em HSL — fórmula validada no excel-lab.</summary>
    public static string ApplyTint(string hex, double tint)
    {
        if (tint == 0 || double.IsNaN(tint)) return hex;
        var m = System.Text.RegularExpressions.Regex.Match(hex, "#?([0-9a-fA-F]{6})");
        if (!m.Success) return hex;
        int n = int.Parse(m.Groups[1].Value, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        double rf = ((n >> 16) & 255) / 255.0, gf = ((n >> 8) & 255) / 255.0, bf = (n & 255) / 255.0;
        double max = Math.Max(rf, Math.Max(gf, bf)), min = Math.Min(rf, Math.Min(gf, bf)), d = max - min;
        double hh = 0, s = 0, l = (max + min) / 2;
        if (d != 0)
        {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max == rf) hh = ((gf - bf) / d) % 6;
            else if (max == gf) hh = (bf - rf) / d + 2;
            else hh = (rf - gf) / d + 4;
            hh /= 6;
            if (hh < 0) hh += 1;
        }
        l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
        double Hue2Rgb(double p, double q, double t)
        {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1.0 / 6) return p + (q - p) * 6 * t;
            if (t < 1.0 / 2) return q;
            if (t < 2.0 / 3) return p + (q - p) * (2.0 / 3 - t) * 6;
            return p;
        }
        double R, G, B;
        if (s == 0) { R = G = B = l; }
        else
        {
            double q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            double p = 2 * l - q;
            R = Hue2Rgb(p, q, hh + 1.0 / 3);
            G = Hue2Rgb(p, q, hh);
            B = Hue2Rgb(p, q, hh - 1.0 / 3);
        }
        string To(double x) => ((int)JsNumber.Round(Math.Min(1, Math.Max(0, x)) * 255))
            .ToString("x", CultureInfo.InvariantCulture).PadLeft(2, '0');
        return "#" + To(R) + To(G) + To(B);
    }
}
