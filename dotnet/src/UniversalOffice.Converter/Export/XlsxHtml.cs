using System.Text.RegularExpressions;
using UniversalOffice.Converter.Processing.Sheets.Core;
using UniversalOffice.Converter.Processing.Sheets.Xlsx;

namespace UniversalOffice.Converter;

/// <summary>
/// Export HTML — porta de sheet/packages/export/src/html.ts: uma &lt;table&gt;
/// por planilha com estilos inline (fills, bordas, fonte, alinhamento, merges
/// via colspan/rowspan, larguras MDW).
/// </summary>
public static class XlsxHtml
{
    private static string EscapeHtml(string text) =>
        text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    private static readonly Regex NewlineRe = new(@"\r\n|\r|\n", RegexOptions.CultureInvariant);

    private static string HtmlText(string text) => NewlineRe.Replace(EscapeHtml(text), "<br>");

    private static readonly Dictionary<string, string> BorderMap = new(StringComparer.Ordinal)
    {
        ["thin"] = "1px solid", ["hair"] = "1px solid", ["dotted"] = "1px dotted", ["dashed"] = "1px dashed",
        ["dashDot"] = "1px dashed", ["dashDotDot"] = "1px dashed",
        ["medium"] = "2px solid", ["mediumDashed"] = "2px dashed", ["mediumDashDot"] = "2px dashed",
        ["mediumDashDotDot"] = "2px dashed", ["slantDashDot"] = "2px dashed",
        ["thick"] = "3px solid", ["double"] = "3px double",
    };

    private static string BorderCss(BorderEdge edge)
    {
        string style = edge.Style ?? "thin";
        string css = BorderMap.TryGetValue(style, out var v) ? v : "1px solid";
        return $"{css} {edge.Color ?? "#000000"}";
    }

    private static string CellCss(GridCell? gc, Styles styles)
    {
        var parts = new List<string>();
        CellXf? xf = gc?.Xf is int xi && xi >= 0 && xi < styles.CellXfs.Count ? styles.CellXfs[xi] : null;
        var font = xf is not null && xf.FontId >= 0 && xf.FontId < styles.Fonts.Count ? styles.Fonts[xf.FontId] : null;
        var bg = SheetModelOps.FillColor(xf is not null && xf.FillId >= 0 && xf.FillId < styles.Fills.Count ? styles.Fills[xf.FillId] : null);
        if (bg is not null) parts.Add($"background-color:{bg}");
        var border = xf is not null && xf.BorderId >= 0 && xf.BorderId < styles.Borders.Count ? styles.Borders[xf.BorderId] : null;
        if (border?.Top is not null) parts.Add($"border-top:{BorderCss(border.Top)}");
        if (border?.Right is not null) parts.Add($"border-right:{BorderCss(border.Right)}");
        if (border?.Bottom is not null) parts.Add($"border-bottom:{BorderCss(border.Bottom)}");
        if (border?.Left is not null) parts.Add($"border-left:{BorderCss(border.Left)}");
        if (font?.Bold == true) parts.Add("font-weight:700");
        if (font?.Italic == true) parts.Add("font-style:italic");
        if (font?.Size is double sz) parts.Add($"font-size:{JsNumber.ToString(sz)}pt");
        if (!string.IsNullOrEmpty(font?.Name)) parts.Add($"font-family:'{font!.Name}'");
        var deco = new List<string>();
        if (font?.Underline == true) deco.Add("underline");
        if (font?.Strike == true) deco.Add("line-through");
        if (deco.Count > 0) parts.Add($"text-decoration:{string.Join(" ", deco)}");
        // cor do numFmt (ex.: [Red] em negativos) tem prioridade sobre a da fonte
        string? color = gc?.Color ?? font?.Color;
        if (color is not null) parts.Add($"color:{color}");
        string? ha = xf?.Horizontal;
        if (ha == "general") ha = null;
        if (ha == "centerContinuous") ha = "center";
        if (ha == "fill") ha = "left";
        if (ha is null && gc?.Numeric == true) ha = "right";
        if (ha is not null) parts.Add($"text-align:{ha}");
        if (xf?.Vertical == "top") parts.Add("vertical-align:top");
        else if (xf?.Vertical == "center") parts.Add("vertical-align:middle");
        if (xf?.WrapText == true) parts.Add("white-space:pre-wrap");
        return string.Join(";", parts);
    }

    private static string SheetToHtml(SheetModel model, SheetGrid grid, bool heading)
    {
        var outp = new List<string>();
        if (heading) outp.Add($"<h2>{EscapeHtml(grid.Name)}</h2>");
        outp.Add("<table style=\"border-collapse:collapse;font-family:'Aptos Narrow',Calibri,sans-serif;font-size:11pt\">");
        if (grid.ColCount > 0)
        {
            var widths = SheetModelOps.ColWidthsPx(grid.Ws, grid.ColCount);
            outp.Add($"<colgroup>{string.Concat(widths.Select(w => $"<col style=\"width:{w}px\">"))}</colgroup>");
        }
        var heights = SheetModelOps.RowHeightsPt(grid.Ws, grid.RowCount);
        outp.Add("<tbody>");
        for (int r = 1; r <= grid.RowCount; r++)
        {
            var tds = new List<string>();
            for (int c = 1; c <= grid.ColCount; c++)
            {
                var merge = grid.MergeAt(r, c);
                if (merge is not null && (merge.R0 != r || merge.C0 != c)) continue; // absorvida
                var gc = grid.Cells[r - 1][c - 1];
                var attrs = new List<string>();
                if (merge is not null)
                {
                    int colspan = merge.C1 - merge.C0 + 1;
                    int rowspan = merge.R1 - merge.R0 + 1;
                    if (colspan > 1) attrs.Add($"colspan=\"{colspan}\"");
                    if (rowspan > 1) attrs.Add($"rowspan=\"{rowspan}\"");
                }
                string css = CellCss(gc, model.Styles);
                if (css.Length > 0) attrs.Add($"style=\"{css}\"");
                tds.Add($"<td{(attrs.Count > 0 ? " " + string.Join(" ", attrs) : "")}>{HtmlText(gc?.Text ?? "")}</td>");
            }
            outp.Add($"<tr style=\"height:{JsNumber.ToString(heights[r - 1])}pt\">{string.Concat(tds)}</tr>");
        }
        outp.Add("</tbody>");
        outp.Add("</table>");
        return string.Join("\n", outp);
    }

    /// <summary>Exporta para HTML. Default: todas as planilhas visíveis.</summary>
    public static string ToHtml(byte[] bytes, SheetExportOptions? opts = null, bool fullDocument = false)
    {
        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts?.Locale ?? Format.PtBr;
        var sheets = SheetModelOps.SelectSheets(model, opts, "all");
        bool heading = sheets.Count > 1;
        string body = string.Join("\n", sheets.Select(sel =>
            SheetToHtml(model, SheetModelOps.BuildGrid(model, sel, loc), heading)));
        if (!fullDocument) return body;
        return string.Join("\n",
        [
            "<!DOCTYPE html>",
            "<html lang=\"pt-BR\">",
            "<head><meta charset=\"utf-8\"><title>Planilha</title></head>",
            "<body>",
            body,
            "</body>",
            "</html>",
        ]);
    }
}
