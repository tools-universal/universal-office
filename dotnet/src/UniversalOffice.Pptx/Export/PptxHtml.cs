using System.Globalization;
using System.Text.RegularExpressions;
using UniversalOffice.Core;
using UniversalOffice.Pptx;
using static UniversalOffice.Export.SlidesModelOps;

namespace UniversalOffice.Export;

/// <summary>
/// Export HTML estático de .pptx — porta de slides/packages/slides-core/src/export/html.ts:
/// um &lt;section class="slide"&gt; por slide, shapes absolutas (EMU→%), fills/
/// bordas/texto inline, imagens data URI, tabelas HTML.
/// </summary>
public static class PptxHtml
{
    public sealed class Options
    {
        /// <summary>'data' (default) = data URI; 'omit' = sem imagens.</summary>
        public string Images = "data";
        public bool FullDocument;
    }

    private static string EscapeHtml(string text) =>
        text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    private static readonly Regex TrailZerosRe = new(@"\.?0+$", RegexOptions.CultureInvariant);

    /// <summary>Percentual relativo ao slide (4 casas — estável p/ snapshot).</summary>
    private static string Pct(double v, double total) =>
        TrailZerosRe.Replace(JsNumber.ToFixed(v / total * 100, 4), "") + "%";

    private static string? FillCss(Fill? fill, double? fillAlpha)
    {
        if (fill is null || fill.Type == "none") return null;
        if (fill.Type == "gradient" && fill.Stops is { Count: >= 2 })
        {
            double ang = 90 + (fill.AngleDeg ?? 0);
            string stops = string.Join(", ", fill.Stops.Select(s =>
                $"{s.Color} {JsNumber.ToString(JsNumber.Round(s.Pos * 100))}%"));
            return $"background:linear-gradient({JsNumber.ToString(ang)}deg, {stops})";
        }
        if (fill.Type == "solid" && fill.Color is not null)
        {
            if (fillAlpha is double fa && fa < 1)
            {
                string h = fill.Color.Replace("#", "");
                int r = int.Parse(h[..2], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                int g = int.Parse(h[2..4], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                int b = int.Parse(h[4..6], NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                return $"background-color:rgba({r},{g},{b},{JsNumber.ToString(JsNumber.Round(fa * 1000) / 1000)})";
            }
            return $"background-color:{fill.Color}";
        }
        return null;
    }

    private static string? RadiusCss(string? geom)
    {
        if (geom == "ellipse") return "border-radius:50%";
        if (geom == "roundRect") return "border-radius:8px";
        return null;
    }

    private static string? TransformCss(Shape sh)
    {
        var x = sh.Xfrm;
        if (x is null || ((x.Rot ?? 0) == 0 && x.FlipH != true && x.FlipV != true)) return null;
        var parts = new List<string>();
        if ((x.Rot ?? 0) != 0)
            parts.Add($"rotate({JsNumber.ToString(JsNumber.Round(x.Rot!.Value / 60000 * 100) / 100)}deg)");
        if (x.FlipH == true) parts.Add("scaleX(-1)");
        if (x.FlipV == true) parts.Add("scaleY(-1)");
        return $"transform:{string.Join(" ", parts)}";
    }

    private static string RunHtml(Run r, double defaultSzPt)
    {
        var css = new List<string>
        {
            $"font-size:{JsNumber.ToString(r.Sz ?? defaultSzPt)}pt",
        };
        if (r.Bold == true) css.Add("font-weight:700");
        if (r.Italic == true) css.Add("font-style:italic");
        if (r.Underline == true) css.Add("text-decoration:underline");
        if (r.Color is not null) css.Add($"color:{r.Color}");
        if (r.Font is not null) css.Add($"font-family:'{r.Font}'");
        string inner = EscapeHtml(r.Text).Replace("\n", "<br>");
        string span = $"<span style=\"{string.Join(";", css)}\">{inner}</span>";
        return r.Hyperlink is not null ? $"<a href=\"{EscapeHtml(r.Hyperlink)}\">{span}</a>" : span;
    }

    private static string BodyHtml(TextBody tb, bool isTitle)
    {
        double defaultSzPt = isTitle ? 40 : 18;
        var outp = new List<string>();
        var counters = new int[9];
        foreach (var p in tb.Paragraphs)
        {
            int level = Math.Min(p.Level ?? 0, 8);
            string align = p.Align == "ctr" ? "center" : p.Align == "r" ? "right" : p.Align == "just" ? "justify" : "left";
            var css = new List<string> { "margin:0", $"text-align:{align}" };
            if (level > 0) css.Add($"padding-left:{level * 24}px");
            string bullet = "";
            if (p.Bullet == true)
            {
                for (int l = level + 1; l < 9; l++) counters[l] = 0;
                if (p.BulletAutoNum is not null)
                {
                    counters[level]++;
                    bullet = $"{TextLayoutOps.FormatAutoNum(p.BulletAutoNum, counters[level])} ";
                }
                else bullet = $"{p.BulletChar ?? "•"} ";
            }
            string runs = string.Concat(p.Runs.Select(r => RunHtml(r, defaultSzPt)));
            var first = p.Runs.FirstOrDefault();
            string bulletSpan = bullet.Length > 0
                ? $"<span style=\"font-size:{JsNumber.ToString(first?.Sz ?? defaultSzPt)}pt{(first?.Color is not null ? $";color:{first.Color}" : "")}\">{EscapeHtml(bullet)}</span>"
                : "";
            outp.Add($"<p style=\"{string.Join(";", css)}\">{bulletSpan}{(runs.Length > 0 ? runs : "&nbsp;")}</p>");
        }
        return string.Concat(outp);
    }

    private static string TableHtml(Table t, string posCss)
    {
        double totalW = t.ColWidthsEmu.Sum();
        if (totalW == 0) totalW = 1;
        string cols = string.Concat(t.ColWidthsEmu.Select(w =>
            $"<col style=\"width:{JsNumber.ToFixed(w / totalW * 100, 2)}%\">"));
        var rows = new List<string>();
        foreach (var row in t.Rows)
        {
            var cells = new List<string>();
            foreach (var cell in row.Cells)
            {
                if (cell.HMerge || cell.VMerge) continue;
                var attrs = new List<string>();
                if (cell.GridSpan is > 1) attrs.Add($"colspan=\"{cell.GridSpan}\"");
                if (cell.RowSpan is > 1) attrs.Add($"rowspan=\"{cell.RowSpan}\"");
                var css = new List<string> { "padding:2px 6px", $"border:1px solid {cell.BorderColor ?? "#CBD5E1"}" };
                if (cell.FillColor is not null) css.Add($"background-color:{cell.FillColor}");
                if (cell.Anchor == "ctr") css.Add("vertical-align:middle");
                else if (cell.Anchor == "b") css.Add("vertical-align:bottom");
                string body = cell.TxBody is not null ? BodyHtml(cell.TxBody, false) : "";
                cells.Add($"<td {string.Join(" ", attrs)} style=\"{string.Join(";", css)}\">{body}</td>");
            }
            rows.Add($"<tr>{string.Concat(cells)}</tr>");
        }
        return $"<table style=\"{posCss};border-collapse:collapse;table-layout:fixed\">{cols}{string.Concat(rows)}</table>";
    }

    private static string? ShapeHtml(Shape sh, Presentation pres, Options opts)
    {
        if (sh.Xfrm is null) return null; // sem posição confiável → pula
        string pos =
            $"position:absolute;left:{Pct(sh.Xfrm.X, pres.SlideW)};top:{Pct(sh.Xfrm.Y, pres.SlideH)};" +
            $"width:{Pct(sh.Xfrm.Cx, pres.SlideW)};height:{Pct(sh.Xfrm.Cy, pres.SlideH)};box-sizing:border-box";
        string? xform = TransformCss(sh);

        if (sh.Table is not null) return TableHtml(sh.Table, pos + (xform is not null ? $";{xform}" : ""));
        if (sh.ChartXml is not null)
            return $"<div style=\"{pos};border:1px dashed #94A3B8;color:#64748B;display:flex;align-items:center;justify-content:center;font-size:12px\">[gráfico]</div>";
        if (sh.Image is not null)
        {
            if (opts.Images == "omit") return null;
            var cssImg = new List<string> { pos, "object-fit:fill" };
            if (xform is not null) cssImg.Add(xform);
            if (sh.Alpha is double al && al < 1) cssImg.Add($"opacity:{JsNumber.ToString(al)}");
            return $"<img src=\"{DataUri(sh.Image)}\" alt=\"{EscapeHtml(sh.Name)}\" style=\"{string.Join(";", cssImg)}\">";
        }

        var css = new List<string> { pos };
        if (xform is not null) css.Add(xform);
        string? bg = FillCss(sh.Fill, sh.FillAlpha);
        if (bg is not null) css.Add(bg);
        if (sh.FillImage is not null && opts.Images != "omit")
        {
            css.Add($"background-image:url({DataUri(sh.FillImage)})");
            css.Add("background-size:100% 100%");
        }
        if (sh.LineColor is not null)
        {
            double wpx = Math.Max(1, JsNumber.Round((sh.LineWidth ?? 9525) / Emu.PerPx));
            string style = sh.LineDash is not null
                ? (sh.LineDash.Contains("ot", StringComparison.Ordinal) ? "dotted" : "dashed")
                : "solid";
            css.Add($"border:{JsNumber.ToString(wpx)}px {style} {sh.LineColor}");
        }
        string? radius = RadiusCss(sh.Geom);
        if (radius is not null) css.Add(radius);

        string inner = "";
        if (sh.TxBody is not null)
        {
            string anchor = sh.TxBody.Anchor ?? ((sh.PhType is "title" or "ctrTitle") ? "ctr" : "t");
            string justify = anchor == "ctr" ? "center" : anchor == "b" ? "flex-end" : "flex-start";
            css.Add("display:flex");
            css.Add("flex-direction:column");
            css.Add($"justify-content:{justify}");
            css.Add("overflow:hidden");
            css.Add("padding:4.8px 9.6px");
            inner = BodyHtml(sh.TxBody, sh.PhType is "title" or "ctrTitle");
        }
        if (inner.Length == 0 && bg is null && sh.LineColor is null && sh.FillImage is null) return null;
        return $"<div style=\"{string.Join(";", css)}\">{inner}</div>";
    }

    private static string SlideHtml(Slide slide, Presentation pres, Options opts)
    {
        double wPx = JsNumber.Round(pres.SlideW / Emu.PerPx);
        var css = new List<string>
        {
            "position:relative",
            $"width:{JsNumber.ToString(wPx)}px",
            $"aspect-ratio:{pres.SlideW.ToString(CultureInfo.InvariantCulture)}/{pres.SlideH.ToString(CultureInfo.InvariantCulture)}",
            "overflow:hidden",
            $"background-color:{slide.Bg?.Color ?? "#ffffff"}",
            "font-family:'Aptos',Calibri,Arial,sans-serif",
        };
        if (slide.BgImage is not null && opts.Images != "omit")
        {
            css.Add($"background-image:url({DataUri(slide.BgImage)})");
            css.Add("background-size:100% 100%");
        }
        var shapes = slide.Shapes
            .Select(sh => ShapeHtml(sh, pres, opts))
            .Where(s => s is not null)
            .Cast<string>()
            .ToList();
        return $"<section class=\"slide\" style=\"{string.Join(";", css)}\">\n{string.Join("\n", shapes)}\n</section>";
    }

    /// <summary>Exporta o .pptx inteiro para HTML estático (um &lt;section&gt; por slide).</summary>
    public static string ToHtml(byte[] bytes, Options? opts = null)
    {
        opts ??= new Options();
        var deck = LoadDeck(bytes);
        string body = string.Join("\n", deck.Slides.Select(ds => SlideHtml(ds.Slide, deck.Pres, opts)));
        if (!opts.FullDocument) return body;
        return $"<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Apresentação</title>\n</head>\n<body>\n{body}\n</body>\n</html>\n";
    }
}
