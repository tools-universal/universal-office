using System.Globalization;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Cor da Página (w:background): leitura do efeito VML (v:background/v:fill) e a cor 2
/// do gradiente de uma cor — port de write/packages/docx-core/src/page-background.ts
/// (a gravação é só do editor JS).
/// </summary>
public static class PageBackgroundReader
{
    private static double? Pct(string? v)
    {
        if (v is null || v.Length == 0) return null;
        string s = v.Trim();
        if (s.EndsWith('%')) return Js.ParseFloat(s);
        if (s.EndsWith('f')) return JsNumber.ParseInt(s, 10) / 65536 * 100;
        double n = Js.ParseFloat(s);
        return double.IsFinite(n) ? n * 100 : null;
    }

    private static double Frac(string v) => v.EndsWith('f') ? JsNumber.ParseInt(v, 10) / 65536 : Js.ParseFloat(v);

    /// <summary>w:background lido (com o efeito VML e a imagem dele resolvida pelo r:id).</summary>
    public static PageBackground? Read(XmlElement bg, Func<string, (byte[] Data, string Ext)?> resolveImage)
    {
        string? V(string k) { string? v = bg.Attr("w:" + k); return Js.Truthy(v) ? v : null; }
        var outp = new PageBackground { Color = V("color"), ThemeColor = V("themeColor"), ThemeTint = V("themeTint"), ThemeShade = V("themeShade") };
        var vbg = FirstChild(bg, "v:background");
        var vf = vbg is null ? null : FirstChild(vbg, "v:fill");
        string? type = vf?.Attr("type");
        if (vbg is not null && vf is not null && type is "gradient" or "gradientRadial" or "pattern" or "frame" or "tile")
        {
            var f = new PageFill { Type = type };
            f.Color = DrawingReader.VmlColor(vbg.Attr("fillcolor"));
            if (vf.Attr("color2") is { } c2) f.Color2 = c2;
            if (Js.Truthy(vf.Attr("angle"))) f.Angle = Js.ParseFloat(vf.Attr("angle")!);
            if (Pct(vf.Attr("focus")) is { } fo) f.Focus = fo;
            string? fp = vf.Attr("focusposition");
            if (fp is not null && fp.Length > 0)
            {
                var parts = fp.Split(',');
                string xs = parts[0].Trim(), ys = parts.Length > 1 ? parts[1].Trim() : "";
                f.FocusPosition = (xs.Length > 0 ? Frac(xs) : 0, ys.Length > 0 ? Frac(ys) : 0);
            }
            var of = FirstChild(vf, "o:fill");
            if (of?.Attr("type") == "gradientCenter") f.GradientCenter = true;
            string? colors = vf.Attr("colors");
            if (Js.Truthy(colors))
            {
                var stops = new List<(double, string)>();
                foreach (var seg in colors!.Split(';'))
                {
                    var p = seg.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
                    if (p.Length < 2) continue;
                    stops.Add((Frac(p[0]), DrawingReader.VmlColor(p[1]) ?? "000000"));
                }
                if (stops.Count > 0) f.Colors = stops;
            }
            if (Js.Truthy(vf.Attr("method"))) f.Method = vf.Attr("method");
            if (vf.Attr("o:title") is { } t) f.Title = t;
            string? rid = vf.Attr("r:id");
            if (Js.Truthy(rid) && resolveImage(rid!) is { } img) f.Image = img;
            if (Js.Truthy(vbg.Attr("o:targetscreensize"))) f.TargetScreen = true;
            outp.Fill = f;
        }
        return outp.Color is null && outp.ThemeColor is null && outp.ThemeTint is null && outp.ThemeShade is null && outp.Fill is null ? null : outp;
    }

    private static readonly System.Text.RegularExpressions.Regex FillRe = new(@"^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>Cor 2 do VML resolvida contra a cor 1 ("fill darken(n)", "fill lighten(n)", "fill", cor).
    /// Truncado como o Word: darken = ⌊c·n/255⌋, lighten = 255 − ⌊(255−c)·n/255⌋.</summary>
    public static string ResolveColor2(string? color2, string color1)
    {
        if (color2 is null || color2.Length == 0) return "FFFFFF";
        var m = FillRe.Match(color2);
        if (!m.Success) return DrawingReader.VmlColor(color2) ?? "FFFFFF";
        if (!m.Groups[1].Success) return color1;
        int n = Math.Max(0, Math.Min(255, int.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture)));
        bool dark = m.Groups[1].Value.Equals("darken", StringComparison.OrdinalIgnoreCase);
        var sb = new System.Text.StringBuilder(6);
        for (int i = 0; i < 6; i += 2)
        {
            int c = i + 2 <= color1.Length ? int.Parse(color1.Substring(i, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) : 0;
            int v = dark ? c * n / 255 : 255 - (255 - c) * n / 255;
            sb.Append(v.ToString("X2", CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }
}
