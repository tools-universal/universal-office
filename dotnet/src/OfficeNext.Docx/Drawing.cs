using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Geometria/posicionamento de objetos de desenho (DrawingML wp:anchor e VML
/// position:absolute) normalizados para TWIPS — porta de docx-core/src/drawing.ts.
/// </summary>
public sealed class AnchorPos
{
    /// <summary>page | margin | column | character | paragraph | line | leftMargin |
    /// rightMargin | insideMargin | outsideMargin | topMargin | bottomMargin</summary>
    public string RelativeFrom = "column";
    /// <summary>left | center | right | inside | outside | top | bottom</summary>
    public string? Align;
    /// <summary>deslocamento em twips (posOffset).</summary>
    public double? Offset;
    /// <summary>wp14:pctPosHOffset/pctPosVOffset (milésimos de %).</summary>
    public double? Pct;
}

public sealed class PointTw
{
    public double X;
    public double Y;
}

public sealed class RectTw
{
    public double L;
    public double T;
    public double R;
    public double B;
}

public sealed class DrawingAnchor
{
    /// <summary>inline | none | square | tight | through | topAndBottom</summary>
    public string Wrap = "none";
    /// <summary>bothSides | left | right | largest</summary>
    public string? WrapText;
    public bool? BehindDoc;
    /// <summary>distâncias do texto (twips).</summary>
    public double? DistT;
    public double? DistB;
    public double? DistL;
    public double? DistR;
    /// <summary>wp:simplePos (twips, relativo à página) quando simplePos="1".</summary>
    public PointTw? SimplePos;
    public AnchorPos PosH = new();
    public AnchorPos PosV = new() { RelativeFrom = "paragraph" };
    public double? RelativeHeight;
    public bool? LayoutInCell;
    public bool? AllowOverlap;
    /// <summary>wp:effectExtent (twips) — sombra/brilho fora do extent.</summary>
    public RectTw? EffectExtent;
}

public sealed class ShapeLine
{
    public string Color = "000000";
    public double WidthPt;
    public string? Dash;
    public double? Alpha;
}

public sealed class ShapeGradient
{
    public string From = "";
    public string To = "";
    public double AngleDeg;
}

/// <summary>Aparência de uma forma (preenchimento/contorno).</summary>
public sealed class ShapeStyle
{
    /// <summary>preset geometry (rect, roundRect, ellipse, line, …) ou 'custom'.</summary>
    public string Geom = "rect";
    /// <summary>RRGGBB (pode trazer "|mods" ou "@tema"); nulo = sem preenchimento.</summary>
    public string? Fill;
    public double? FillAlpha;
    /// <summary>contorno; nulo = sem linha.</summary>
    public ShapeLine? Line;
    /// <summary>graus, horário.</summary>
    public double? Rot;
    public bool? FlipH;
    public bool? FlipV;
    /// <summary>gradiente simplificado (1ª e última paradas) quando há a:gradFill.</summary>
    public ShapeGradient? Gradient;
}

public static class DrawingReader
{
    public const double EmuPerTwipD = 635;

    private static double? EmuTw(string? v)
    {
        if (v is null || v == "") return null;
        double n = Js.ParseInt(v);
        return double.IsFinite(n) ? n / EmuPerTwipD : null;
    }

    public static XmlElement? FindDeep(XmlElement el, string name)
    {
        foreach (var c in ChildElements(el))
        {
            if (c.Name == name) return c;
            var f = FindDeep(c, name);
            if (f is not null) return f;
        }
        return null;
    }

    public static string TextOf(XmlElement el) => TextContent(el);

    private static AnchorPos ReadPos(XmlElement? el, string defFrom)
    {
        var pos = new AnchorPos { RelativeFrom = el?.Attr("relativeFrom") ?? defFrom };
        if (el is null) return pos;
        var align = FirstChild(el, "wp:align");
        if (align is not null) pos.Align = TextOf(align).Trim();
        var off = FirstChild(el, "wp:posOffset");
        if (off is not null) pos.Offset = Js.IntOr0(TextOf(off).Trim()) / EmuPerTwipD;
        var pct = FirstChild(el, "wp14:pctPosHOffset") ?? FirstChild(el, "wp14:pctPosVOffset");
        if (pct is not null) pos.Pct = Js.IntOr0(TextOf(pct).Trim());
        return pos;
    }

    /// <summary>Âncora de um wp:anchor (nulo para wp:inline).</summary>
    public static DrawingAnchor? ReadWpAnchor(XmlElement? anchor)
    {
        if (anchor is null) return null;
        string wrap = "none";
        string? wrapText = null;
        foreach (var c in ChildElements(anchor))
        {
            switch (c.Name)
            {
                case "wp:wrapNone": wrap = "none"; break;
                case "wp:wrapSquare": wrap = "square"; wrapText = c.Attr("wrapText"); break;
                case "wp:wrapTight": wrap = "tight"; wrapText = c.Attr("wrapText"); break;
                case "wp:wrapThrough": wrap = "through"; wrapText = c.Attr("wrapText"); break;
                case "wp:wrapTopAndBottom": wrap = "topAndBottom"; break;
            }
        }
        var outp = new DrawingAnchor
        {
            Wrap = wrap,
            PosH = ReadPos(FirstChild(anchor, "wp:positionH"), "column"),
            PosV = ReadPos(FirstChild(anchor, "wp:positionV"), "paragraph"),
        };
        if (Js.Truthy(wrapText)) outp.WrapText = wrapText;
        if (anchor.Attr("behindDoc") is "1" or "true") outp.BehindDoc = true;
        outp.DistT = EmuTw(anchor.Attr("distT"));
        outp.DistB = EmuTw(anchor.Attr("distB"));
        outp.DistL = EmuTw(anchor.Attr("distL"));
        outp.DistR = EmuTw(anchor.Attr("distR"));
        if (anchor.Attr("simplePos") is "1" or "true")
        {
            var sp = FirstChild(anchor, "wp:simplePos");
            outp.SimplePos = new PointTw { X = EmuTw(sp?.Attr("x")) ?? 0, Y = EmuTw(sp?.Attr("y")) ?? 0 };
        }
        if (Js.Truthy(anchor.Attr("relativeHeight"))) outp.RelativeHeight = Js.IntOr0(anchor.Attr("relativeHeight"));
        if (anchor.Attr("layoutInCell") is { } lic) outp.LayoutInCell = lic is "1" or "true";
        if (anchor.Attr("allowOverlap") is { } ao) outp.AllowOverlap = ao is "1" or "true";
        var ee = FirstChild(anchor, "wp:effectExtent");
        if (ee is not null)
        {
            outp.EffectExtent = new RectTw
            {
                L = EmuTw(ee.Attr("l")) ?? 0, T = EmuTw(ee.Attr("t")) ?? 0,
                R = EmuTw(ee.Attr("r")) ?? 0, B = EmuTw(ee.Attr("b")) ?? 0,
            };
        }
        return outp;
    }

    private static readonly Dictionary<string, string> SchemeMap = new(StringComparer.Ordinal)
        { ["tx1"] = "dk1", ["bg1"] = "lt1", ["tx2"] = "dk2", ["bg2"] = "lt2" };
    private static readonly Dictionary<string, string> NamedPrst = new(StringComparer.Ordinal)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "00FF00",
        ["blue"] = "0000FF", ["yellow"] = "FFFF00", ["gray"] = "808080",
    };

    private static (string Hex, double? Alpha)? SrgbOf(XmlElement? el, Dictionary<string, string>? theme = null)
    {
        if (el is null) return null;
        var c = FirstChild(el, "a:srgbClr") ?? FirstChild(el, "a:schemeClr") ?? FirstChild(el, "a:sysClr") ?? FirstChild(el, "a:prstClr");
        if (c is null) return null;
        string? hex = null;
        if (c.Name == "a:srgbClr") hex = c.Attr("val");
        else if (c.Name == "a:sysClr") hex = c.Attr("lastClr") ?? (c.Attr("val") == "window" ? "FFFFFF" : "000000");
        else if (c.Name == "a:schemeClr")
        {
            string key = c.Attr("val") ?? "";
            string mk = SchemeMap.TryGetValue(key, out var m) ? m : key;
            hex = theme is not null && theme.TryGetValue(mk, out var th) ? th : "@" + key;
        }
        else if (c.Name == "a:prstClr")
            hex = NamedPrst.TryGetValue(c.Attr("val") ?? "", out var nh) ? nh : "000000";
        if (!Js.Truthy(hex)) return null;
        var alphaEl = FirstChild(c, "a:alpha");
        string outHex = Js.ToUpper(hex!);
        double? alpha = null;
        if (alphaEl is not null) alpha = Js.IntOr0(alphaEl.Attr("val") ?? "100000") / 100000;
        // lumMod/lumOff/tint/shade ficam com o motor (precisa do tema); registramos cru
        var mods = ChildElements(c).Where(m => m.Name != "a:alpha")
            .Select(m => $"{(m.Name.Length > 2 ? m.Name[2..] : "")}={m.Attr("val") ?? "undefined"}").ToList();
        if (mods.Count > 0) outHex = $"{outHex}|{string.Join(",", mods)}";
        return (outHex, alpha);
    }

    /// <summary>Estilo de forma de um wps:spPr / pic:spPr (preenchimento, contorno, geometria).</summary>
    public static ShapeStyle ReadSpPr(XmlElement? spPr, XmlElement? styleEl = null)
    {
        var st = new ShapeStyle { Geom = "rect" };
        if (spPr is null) return st;
        string? prst = FirstChild(spPr, "a:prstGeom")?.Attr("prst");
        if (Js.Truthy(prst)) st.Geom = prst!;
        else if (FirstChild(spPr, "a:custGeom") is not null) st.Geom = "custom";
        var xfrm = FirstChild(spPr, "a:xfrm");
        if (xfrm is not null)
        {
            double rot = Js.ParseInt(xfrm.Attr("rot") ?? "0");
            if (rot != 0 && !double.IsNaN(rot)) st.Rot = rot / 60000;
            if (xfrm.Attr("flipH") == "1") st.FlipH = true;
            if (xfrm.Attr("flipV") == "1") st.FlipV = true;
        }
        if (FirstChild(spPr, "a:noFill") is not null) { /* sem preenchimento */ }
        else if (FirstChild(spPr, "a:solidFill") is not null)
        {
            var c = SrgbOf(FirstChild(spPr, "a:solidFill"));
            if (c is { } cc) { st.Fill = cc.Hex; if (cc.Alpha is not null) st.FillAlpha = cc.Alpha; }
        }
        else if (FirstChild(spPr, "a:gradFill") is { } grad)
        {
            var gs = FindDeep(grad, "a:gsLst");
            var stops = gs is not null ? ChildElements(gs, "a:gs").ToList() : new List<XmlElement>();
            var from = stops.Count > 0 ? SrgbOf(stops[0]) : null;
            var to = stops.Count > 0 ? SrgbOf(stops[^1]) : null;
            var lin = FindDeep(grad, "a:lin");
            if (from is not null && to is not null)
            {
                st.Gradient = new ShapeGradient { From = from.Value.Hex, To = to.Value.Hex, AngleDeg = Js.IntOr0(lin?.Attr("ang") ?? "0") / 60000 };
                st.Fill = from.Value.Hex;
            }
        }
        else if (styleEl is not null)
        {
            // sem fill explícito: wps:style/a:fillRef (cor do tema)
            var fillRef = FirstChild(styleEl, "a:fillRef");
            if (fillRef is not null && fillRef.Attr("idx") != "0")
            {
                var c = SrgbOf(fillRef);
                if (c is not null) st.Fill = c.Value.Hex;
            }
        }
        var ln = FirstChild(spPr, "a:ln");
        var lnRef = styleEl is not null ? FirstChild(styleEl, "a:lnRef") : null;
        if (ln is not null && FirstChild(ln, "a:noFill") is not null) { /* sem linha */ }
        else if (ln is not null && FirstChild(ln, "a:solidFill") is not null)
        {
            var c = SrgbOf(FirstChild(ln, "a:solidFill"));
            if (c is { } cc)
            {
                st.Line = new ShapeLine { Color = cc.Hex, WidthPt = Js.Truthy(ln.Attr("w")) ? Js.ParseInt(ln.Attr("w")) / 12700 : 0.75 };
                if (cc.Alpha is not null) st.Line.Alpha = cc.Alpha;
                string? dash = FirstChild(ln, "a:prstDash")?.Attr("val");
                if (Js.Truthy(dash) && dash != "solid") st.Line.Dash = dash;
            }
        }
        else if (lnRef is not null && lnRef.Attr("idx") != "0")
        {
            var c = SrgbOf(lnRef);
            if (c is not null) st.Line = new ShapeLine { Color = c.Value.Hex, WidthPt = Js.Truthy(ln?.Attr("w")) ? Js.ParseInt(ln!.Attr("w")) / 12700 : 0.75 };
        }
        return st;
    }

    // ───────────────────────── VML ─────────────────────────

    private static readonly Regex VmlLenRe = new(@"^(-?[0-9.]+)\s*(pt|in|px|cm|mm|pc|em)?\z", RegexOptions.CultureInvariant);

    /// <summary>Converte um comprimento CSS do VML (pt, in, px, cm, mm, em sem unidade = px).</summary>
    public static double? VmlLenTwips(string? v)
    {
        if (!Js.Truthy(v)) return null;
        var m = VmlLenRe.Match(v!.Trim());
        if (!m.Success) return null;
        double n = Js.ParseFloat(m.Groups[1].Value);
        if (!m.Groups[2].Success) return n * 15; // px (96 dpi) = 15 twips
        return m.Groups[2].Value switch
        {
            "pt" => n * 20,
            "in" => n * 1440,
            "cm" => (n / 2.54) * 1440,
            "mm" => (n / 25.4) * 1440,
            "pc" => n * 240,
            "em" => n * 240,
            _ => n * 15,
        };
    }

    public static Dictionary<string, string> ParseVmlStyle(string? style)
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var decl in (style ?? "").Split(';'))
        {
            int i = decl.IndexOf(':');
            if (i < 0) continue;
            outp[Js.ToLower(decl[..i].Trim())] = decl[(i + 1)..].Trim();
        }
        return outp;
    }

    private static string? Get(Dictionary<string, string> d, string k) => d.TryGetValue(k, out var v) ? v : null;

    private static readonly Dictionary<string, string> RelMap = new(StringComparer.Ordinal)
    {
        ["text"] = "column", ["page"] = "page", ["margin"] = "margin", ["char"] = "character", ["line"] = "line",
        ["left-margin-area"] = "leftMargin", ["right-margin-area"] = "rightMargin",
        ["top-margin-area"] = "topMargin", ["bottom-margin-area"] = "bottomMargin",
        ["inner-margin-area"] = "insideMargin", ["outer-margin-area"] = "outsideMargin",
    };

    /// <summary>Âncora a partir do style do VML (position:absolute + mso-position-*).</summary>
    public static DrawingAnchor? VmlAnchor(Dictionary<string, string> style, XmlElement? wrapEl = null)
    {
        if (Get(style, "position") != "absolute") return null;
        string hRel = Get(style, "mso-position-horizontal-relative") ?? "text";
        string vRel = Get(style, "mso-position-vertical-relative") ?? "text";
        var posH = new AnchorPos { RelativeFrom = RelMap.TryGetValue(hRel, out var h) ? h : "column" };
        var posV = new AnchorPos { RelativeFrom = vRel == "text" ? "paragraph" : RelMap.TryGetValue(vRel, out var v) ? v : "paragraph" };
        string? hAlign = Get(style, "mso-position-horizontal");
        if (Js.Truthy(hAlign) && hAlign != "absolute") posH.Align = hAlign;
        else posH.Offset = (VmlLenTwips(Get(style, "margin-left")) ?? 0) + (VmlLenTwips(Get(style, "left")) ?? 0);
        string? vAlign = Get(style, "mso-position-vertical");
        if (Js.Truthy(vAlign) && vAlign != "absolute") posV.Align = vAlign;
        else posV.Offset = (VmlLenTwips(Get(style, "margin-top")) ?? 0) + (VmlLenTwips(Get(style, "top")) ?? 0);
        double z = Js.IntOr0(Get(style, "z-index") ?? "0");
        string? wrapType = wrapEl?.Attr("type");
        var anchor = new DrawingAnchor
        {
            Wrap = wrapType == "square" ? "square" : wrapType == "tight" ? "tight" : wrapType == "through" ? "through"
                : wrapType == "topAndBottom" ? "topAndBottom" : "none",
            PosH = posH,
            PosV = posV,
            RelativeHeight = z,
        };
        if (z < 0) anchor.BehindDoc = true;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-left")) is { } dl) anchor.DistL = dl;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-right")) is { } dr) anchor.DistR = dr;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-top")) is { } dt) anchor.DistT = dt;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-bottom")) is { } db) anchor.DistB = db;
        return anchor;
    }

    private static readonly Dictionary<string, string> VmlColors = new(StringComparer.Ordinal)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "008000", ["blue"] = "0000FF", ["yellow"] = "FFFF00",
        ["gray"] = "808080", ["grey"] = "808080", ["silver"] = "C0C0C0", ["navy"] = "000080", ["maroon"] = "800000", ["teal"] = "008080",
        ["olive"] = "808000", ["purple"] = "800080", ["fuchsia"] = "FF00FF", ["aqua"] = "00FFFF", ["lime"] = "00FF00", ["window"] = "FFFFFF",
    };

    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>Cor VML ("#rrggbb", "#rgb", nome, "#xxxxxx [n]") → RRGGBB.</summary>
    public static string? VmlColor(string? v)
    {
        if (!Js.Truthy(v)) return null;
        string s = Js.ToLower(WsRe.Split(v!.Trim())[0]);
        if (s.StartsWith('#'))
        {
            string hh = s[1..];
            if (hh.Length == 3) return Js.ToUpper(string.Concat(hh.Select(c => $"{c}{c}")));
            if (hh.Length >= 6) return Js.ToUpper(hh[..6]);
        }
        return VmlColors.TryGetValue(s, out var nc) ? nc : null;
    }

    private static readonly Regex EndsLetterRe = new(@"[a-z]\z", RegexOptions.CultureInvariant);

    /// <summary>Estilo de forma VML (fill/stroke por atributos e filhos v:fill / v:stroke).</summary>
    public static ShapeStyle VmlShapeStyle(XmlElement el, string geom)
    {
        var st = new ShapeStyle { Geom = geom };
        var fillEl = FirstChild(el, "v:fill");
        var strokeEl = FirstChild(el, "v:stroke");
        string? filled = el.Attr("filled") ?? fillEl?.Attr("on");
        if (filled != "f" && filled != "false")
        {
            string? fc = VmlColor(fillEl?.Attr("color") ?? el.Attr("fillcolor"))
                ?? (el.Attr("fillcolor") is null && fillEl is null ? "FFFFFF" : null);
            if (Js.Truthy(fc)) st.Fill = fc;
            string? op = fillEl?.Attr("opacity");
            if (Js.Truthy(op)) st.FillAlpha = op!.EndsWith('f') ? Js.ParseInt(op) / 65536 : Js.ParseFloat(op);
        }
        string? stroked = el.Attr("stroked") ?? strokeEl?.Attr("on");
        if (stroked != "f" && stroked != "false")
        {
            string sc = VmlColor(strokeEl?.Attr("color") ?? el.Attr("strokecolor")) ?? "000000";
            string? sw = el.Attr("strokeweight") ?? strokeEl?.Attr("weight");
            st.Line = new ShapeLine
            {
                Color = sc,
                WidthPt = Js.Truthy(sw) ? (VmlLenTwips(sw!.EndsWith('t') || EndsLetterRe.IsMatch(sw) ? sw : sw + "pt") ?? 15) / 20 : 0.75,
            };
            string? dash = strokeEl?.Attr("dashstyle");
            if (Js.Truthy(dash) && dash != "solid") st.Line.Dash = dash;
        }
        double rot = Js.ParseFloat(Get(ParseVmlStyle(el.Attr("style")), "rotation") ?? "0");
        if (rot != 0 && !double.IsNaN(rot)) st.Rot = rot;
        string flip = Get(ParseVmlStyle(el.Attr("style")), "flip") ?? "";
        if (flip.Contains('x')) st.FlipH = true;
        if (flip.Contains('y')) st.FlipV = true;
        return st;
    }
}
