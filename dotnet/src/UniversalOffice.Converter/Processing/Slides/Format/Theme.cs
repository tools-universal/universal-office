using System.Globalization;
using UniversalOffice.Converter.Processing.Slides.Core;
using static UniversalOffice.Converter.Processing.Slides.Core.MiniXml;

namespace UniversalOffice.Converter.Processing.Slides.Pptx;

/// <summary>Tema (clrScheme + fontScheme) e resolução de cor DrawingML —
/// porta de slides-core/src/theme.ts.</summary>
public static class PptxTheme
{
    /// <summary>clrMap padrão (master): aliases tx/bg → dk/lt.</summary>
    private static readonly Dictionary<string, string> StdMap = new(StringComparer.Ordinal)
    {
        ["tx1"] = "dk1", ["bg1"] = "lt1", ["tx2"] = "dk2", ["bg2"] = "lt2",
    };

    private static readonly Dictionary<string, string> Preset = new(StringComparer.Ordinal)
    {
        ["black"] = "#000000", ["white"] = "#FFFFFF", ["red"] = "#FF0000", ["green"] = "#008000",
        ["blue"] = "#0000FF", ["yellow"] = "#FFFF00", ["gray"] = "#808080", ["grey"] = "#808080",
    };

    /// <summary>Lê ppt/theme/themeN.xml → mapa de cores + fontes do tema.</summary>
    public static Theme ReadTheme(PptxPackage pkg, string themePath)
    {
        var theme = new Theme();
        string? xml = pkg.GetPartText(themePath);
        if (xml is null) return theme;
        var root = Parse(xml);
        var themeEls = FirstChild(root, "a:themeElements");
        var scheme = themeEls is not null ? FirstChild(themeEls, "a:clrScheme") : null;
        if (scheme is not null)
        {
            foreach (var el in ChildElements(scheme))
            {
                string key = el.Name.StartsWith("a:", StringComparison.Ordinal) ? el.Name[2..] : el.Name;
                var c = ColorFromDml(ChildElements(el).FirstOrDefault(), theme);
                if (c is not null) theme.Colors[key] = c;
            }
        }
        foreach (var (alias, src) in StdMap)
            if (theme.Colors.TryGetValue(src, out var v)) theme.Colors[alias] = v;
        var fontScheme = themeEls is not null ? FirstChild(themeEls, "a:fontScheme") : null;
        if (fontScheme is not null)
        {
            var majLatin = FirstChild(fontScheme, "a:majorFont");
            var minLatin = FirstChild(fontScheme, "a:minorFont");
            theme.FontMajor = majLatin is not null ? FirstChild(majLatin, "a:latin")?.Attr("typeface") : null;
            theme.FontMinor = minLatin is not null ? FirstChild(minLatin, "a:latin")?.Attr("typeface") : null;
        }
        return theme;
    }

    /// <summary>Resolve um elemento de cor DrawingML (srgbClr/schemeClr/sysClr/prstClr) → #RRGGBB.</summary>
    public static string? ColorFromDml(XmlElement? el, Theme theme)
    {
        if (el is null) return null;
        string? baseColor = null;
        if (el.Name == "a:srgbClr") baseColor = "#" + (el.Attr("val") ?? "000000");
        else if (el.Name == "a:sysClr") baseColor = "#" + (el.Attr("lastClr") ?? "000000");
        else if (el.Name == "a:prstClr")
            baseColor = Preset.TryGetValue(el.Attr("val") ?? "black", out var pc) ? pc : "#000000";
        else if (el.Name == "a:schemeClr")
        {
            string v = el.Attr("val") ?? "";
            if (theme.Colors.TryGetValue(v, out var direct)) baseColor = direct;
            else if (StdMap.TryGetValue(v, out var alias) && theme.Colors.TryGetValue(alias, out var ali)) baseColor = ali;
            else baseColor = "#000000";
        }
        if (baseColor is null) return null;
        foreach (var mod in ChildElements(el))
        {
            string? valAttr = mod.Attr("val");
            if (valAttr is null) continue;
            double val = JsNumber.ParseIntOr(valAttr, 0) / 100000.0;
            if (mod.Name == "a:shade") baseColor = ScaleLum(baseColor, val);
            else if (mod.Name == "a:tint") baseColor = MixWhite(baseColor, val);
            else if (mod.Name == "a:lumMod") baseColor = ScaleLum(baseColor, val);
            else if (mod.Name == "a:lumOff") baseColor = OffsetLum(baseColor, val);
        }
        return baseColor;
    }

    /// <summary>Acha &lt;a:solidFill&gt; dentro de `parent` e resolve a cor.</summary>
    public static string? SolidFillColor(XmlElement parent, Theme theme)
    {
        var sf = FirstChild(parent, "a:solidFill");
        if (sf is null) return null;
        return ColorFromDml(ChildElements(sf).FirstOrDefault(), theme);
    }

    private static (int R, int G, int B) Rgb(string hex)
    {
        var m = System.Text.RegularExpressions.Regex.Match(hex, "#?([0-9a-fA-F]{6})");
        if (!m.Success) return (0, 0, 0);
        int n = int.Parse(m.Groups[1].Value, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        return ((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }

    private static string Hex(double r, double g, double b)
    {
        static string C(double x) => ((int)JsNumber.Round(Math.Min(255, Math.Max(0, x))))
            .ToString("x", CultureInfo.InvariantCulture).PadLeft(2, '0');
        return "#" + C(r) + C(g) + C(b);
    }

    private static string ScaleLum(string h, double f) { var (r, g, b) = Rgb(h); return Hex(r * f, g * f, b * f); }
    private static string OffsetLum(string h, double f) { var (r, g, b) = Rgb(h); return Hex(r + 255 * f, g + 255 * f, b + 255 * f); }
    private static string MixWhite(string h, double f) { var (r, g, b) = Rgb(h); return Hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); }
}
