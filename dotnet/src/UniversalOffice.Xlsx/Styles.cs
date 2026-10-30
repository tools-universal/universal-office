using UniversalOffice.Core;
using static UniversalOffice.Core.MiniXml;

namespace UniversalOffice.Xlsx;

/// <summary>Leitura de xl/styles.xml — porta de sheet-core/src/styles.ts.</summary>
public sealed class Font
{
    public bool Bold;
    public bool Italic;
    public bool Underline;
    public bool Strike;
    public double? Size;
    public string? Color;
    public string? Name;
}

public sealed class GradientStop
{
    public double Position;
    public string Color = "#FFFFFF";
}

public sealed class Gradient
{
    public double Degree;
    public List<GradientStop> Stops = new();
}

public sealed class Fill
{
    /// <summary>Solid: cor de fundo (fgColor); padrões legados: cor do PADRÃO.</summary>
    public string? FgColor;
    public string? BgColor;
    public string? Pattern;
    public Gradient? Gradient;
}

public sealed class BorderEdge
{
    public string? Style;
    public string? Color;
}

public sealed class Border
{
    public BorderEdge? Left;
    public BorderEdge? Right;
    public BorderEdge? Top;
    public BorderEdge? Bottom;
    public BorderEdge? Diagonal;
}

public sealed class CellXf
{
    public int NumFmtId;
    public int FontId;
    public int FillId;
    public int BorderId;
    public int XfId;
    public bool ApplyNumberFormat;
    public bool ApplyFont;
    public bool ApplyFill;
    public bool ApplyBorder;
    public bool ApplyAlignment;
    public string? Horizontal;
    public string? Vertical;
    public bool WrapText;
    public int? Indent;
}

public sealed class Dxf
{
    public string? FillColor;
    public string? FontColor;
    public bool Bold;
    public bool Italic;
}

public sealed class Styles
{
    public Dictionary<int, string> NumFmts = new();
    public List<CellXf> CellXfs = new();
    public List<Font> Fonts = new();
    public List<Fill> Fills = new();
    public List<Border> Borders = new();
    public List<Dxf> Dxfs = new();
}

public static class StylesReader
{
    public static Styles ReadStyles(OpcPackage pkg, ColorContext? cx = null)
    {
        string? xml = pkg.GetPartText("xl/styles.xml");
        var styles = new Styles();
        if (xml is null) return styles;
        var ctx = cx ?? ThemeReader.BuildColorContext(pkg);
        var root = Parse(xml);

        var fontsEl = FirstChild(root, "fonts");
        if (fontsEl is not null)
        {
            foreach (var f in ChildElements(fontsEl, "font"))
            {
                var font = new Font();
                if (FirstChild(f, "b") is not null) font.Bold = true;
                if (FirstChild(f, "i") is not null) font.Italic = true;
                if (FirstChild(f, "u") is not null) font.Underline = true;
                if (FirstChild(f, "strike") is not null) font.Strike = true;
                var sz = FirstChild(f, "sz");
                if (sz?.Attr("val") is string szVal) font.Size = JsNumber.ParseFloat(szVal);
                font.Color = ReadColor(f, ctx);
                var name = FirstChild(f, "name");
                if (name?.Attr("val") is string nm) font.Name = nm;
                styles.Fonts.Add(font);
            }
        }

        var fillsEl = FirstChild(root, "fills");
        if (fillsEl is not null)
            foreach (var fl in ChildElements(fillsEl, "fill"))
                styles.Fills.Add(ReadFill(fl, ctx));

        var bordersEl = FirstChild(root, "borders");
        if (bordersEl is not null)
        {
            foreach (var bd in ChildElements(bordersEl, "border"))
            {
                var border = new Border();
                foreach (string side in (string[])["left", "right", "top", "bottom", "diagonal"])
                {
                    var e = FirstChild(bd, side);
                    if (e is not null && !string.IsNullOrEmpty(e.Attr("style")) && e.Attr("style") != "none")
                    {
                        var colEl = FirstChild(e, "color");
                        var edge = new BorderEdge
                        {
                            Style = e.Attr("style"),
                            Color = colEl is not null ? ThemeReader.ResolveColorEl(colEl, ctx) : "#000000",
                        };
                        switch (side)
                        {
                            case "left": border.Left = edge; break;
                            case "right": border.Right = edge; break;
                            case "top": border.Top = edge; break;
                            case "bottom": border.Bottom = edge; break;
                            case "diagonal": border.Diagonal = edge; break;
                        }
                    }
                }
                styles.Borders.Add(border);
            }
        }

        var dxfsEl = FirstChild(root, "dxfs");
        if (dxfsEl is not null)
        {
            foreach (var d in ChildElements(dxfsEl, "dxf"))
            {
                var dxf = new Dxf();
                var fill = FirstChild(d, "fill");
                var pf = fill is not null ? FirstChild(fill, "patternFill") : null;
                var bg = pf is not null ? FirstChild(pf, "bgColor") : null;
                if (bg is not null) dxf.FillColor = ThemeReader.ResolveColorEl(bg, ctx);
                var font = FirstChild(d, "font");
                if (font is not null)
                {
                    if (FirstChild(font, "b") is not null) dxf.Bold = true;
                    if (FirstChild(font, "i") is not null) dxf.Italic = true;
                    var colEl = FirstChild(font, "color");
                    if (colEl is not null) dxf.FontColor = ThemeReader.ResolveColorEl(colEl, ctx);
                }
                styles.Dxfs.Add(dxf);
            }
        }

        var numFmtsEl = FirstChild(root, "numFmts");
        if (numFmtsEl is not null)
        {
            foreach (var nf in ChildElements(numFmtsEl, "numFmt"))
            {
                string? id = nf.Attr("numFmtId");
                string? code = nf.Attr("formatCode");
                if (id is not null && code is not null) styles.NumFmts[JsNumber.ParseIntOr(id, 0)] = code;
            }
        }

        var cellXfsEl = FirstChild(root, "cellXfs");
        if (cellXfsEl is not null)
        {
            foreach (var xf in ChildElements(cellXfsEl, "xf"))
            {
                var rec = new CellXf
                {
                    NumFmtId = JsNumber.ParseIntOr(xf.Attr("numFmtId") ?? "0", 0),
                    FontId = JsNumber.ParseIntOr(xf.Attr("fontId") ?? "0", 0),
                    FillId = JsNumber.ParseIntOr(xf.Attr("fillId") ?? "0", 0),
                    BorderId = JsNumber.ParseIntOr(xf.Attr("borderId") ?? "0", 0),
                    XfId = JsNumber.ParseIntOr(xf.Attr("xfId") ?? "0", 0),
                };
                if (xf.Attr("applyNumberFormat") == "1") rec.ApplyNumberFormat = true;
                if (xf.Attr("applyFont") == "1") rec.ApplyFont = true;
                if (xf.Attr("applyFill") == "1") rec.ApplyFill = true;
                if (xf.Attr("applyBorder") == "1") rec.ApplyBorder = true;
                if (xf.Attr("applyAlignment") == "1") rec.ApplyAlignment = true;
                var al = FirstChild(xf, "alignment");
                if (al is not null)
                {
                    if (al.Attr("horizontal") is string h) rec.Horizontal = h;
                    if (al.Attr("vertical") is string v) rec.Vertical = v;
                    if (al.Attr("wrapText") == "1") rec.WrapText = true;
                    if (al.Attr("indent") is string ind) rec.Indent = JsNumber.ParseIntOr(ind, 0);
                }
                styles.CellXfs.Add(rec);
            }
        }

        return styles;
    }

    private static Fill ReadFill(XmlElement fl, ColorContext ctx)
    {
        var fill = new Fill();
        var pf = FirstChild(fl, "patternFill");
        if (pf is not null)
        {
            fill.Pattern = pf.Attr("patternType");
            var fg = FirstChild(pf, "fgColor");
            var bg = FirstChild(pf, "bgColor");
            if (pf.Attr("patternType") == "solid")
                fill.FgColor = fg is not null ? ThemeReader.ResolveColorEl(fg, ctx) : null;
            else if (pf.Attr("patternType") is not null && pf.Attr("patternType") != "none")
            {
                if (fg is not null) fill.FgColor = ThemeReader.ResolveColorEl(fg, ctx);
                if (bg is not null) fill.BgColor = ThemeReader.ResolveColorEl(bg, ctx);
            }
            return fill;
        }
        var gf = FirstChild(fl, "gradientFill");
        if (gf is not null)
        {
            var stops = new List<GradientStop>();
            foreach (var stop in ChildElements(gf, "stop"))
            {
                var colEl = FirstChild(stop, "color");
                stops.Add(new GradientStop
                {
                    Position = JsNumber.ParseFloat(stop.Attr("position") ?? "0"),
                    Color = (colEl is not null ? ThemeReader.ResolveColorEl(colEl, ctx) : null) ?? "#FFFFFF",
                });
            }
            fill.Gradient = new Gradient { Degree = JsNumber.ParseFloat(gf.Attr("degree") ?? "0"), Stops = stops };
        }
        return fill;
    }

    private static string? ReadColor(XmlElement el, ColorContext ctx)
    {
        var c = FirstChild(el, "color");
        return c is not null ? ThemeReader.ResolveColorEl(c, ctx) : null;
    }
}
