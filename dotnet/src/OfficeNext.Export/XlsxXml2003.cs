using System.Text;
using OfficeNext.Core;
using OfficeNext.Xlsx;

namespace OfficeNext.Export;

/// <summary>
/// Export SpreadsheetML 2003 (.xml) — porta de sheet/packages/export/src/xml2003.ts.
/// Valores tipados (ss:Type), ss:Format com o formatCode OOXML, estilos básicos,
/// larguras/alturas em pontos, merges. Fórmulas NÃO são emitidas (R1C1 fora do v1).
/// </summary>
public static class XlsxXml2003
{
    private static string Esc(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string EscA(string s) => Esc(s).Replace("\"", "&quot;");

    /// <summary>SpreadsheetML usa PONTOS (px da fórmula MDW × 72/96, 2 casas).</summary>
    private static double ColWidthPt(double width) =>
        JsNumber.Round(SheetModelOps.ColWidthPx(width) * 72.0 / 96 * 100) / 100;

    public static string ToXml2003(byte[] bytes, SheetExportOptions? opts = null)
    {
        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts?.Locale ?? Format.PtBr;
        var sheets = SheetModelOps.SelectSheets(model, opts, "all");

        // ── estilos: um <Style> por cellXf usado ──
        var usedStyles = new HashSet<int>();
        foreach (var sel in sheets)
            foreach (var r in sel.Ws.Rows)
                foreach (var c in r.Cells)
                    if (c.Style is int st) usedStyles.Add(st);
        var styleXml = new List<string>();
        foreach (var idx in usedStyles.OrderBy(x => x))
        {
            var xf = idx >= 0 && idx < model.Styles.CellXfs.Count ? model.Styles.CellXfs[idx] : null;
            if (xf is null) continue;
            var font = xf.FontId >= 0 && xf.FontId < model.Styles.Fonts.Count ? model.Styles.Fonts[xf.FontId] : null;
            var fill = xf.FillId >= 0 && xf.FillId < model.Styles.Fills.Count ? model.Styles.Fills[xf.FillId] : null;
            model.Styles.NumFmts.TryGetValue(xf.NumFmtId, out var code);
            var parts = new List<string>();
            if (font is not null)
            {
                var fa = new List<string>();
                if (font.Bold) fa.Add("ss:Bold=\"1\"");
                if (font.Italic) fa.Add("ss:Italic=\"1\"");
                if (font.Underline) fa.Add("ss:Underline=\"Single\"");
                if (font.Size is double sz && sz != 0) fa.Add($"ss:Size=\"{JsNumber.ToString(sz)}\"");
                if (!string.IsNullOrEmpty(font.Color)) fa.Add($"ss:Color=\"{font.Color}\"");
                if (!string.IsNullOrEmpty(font.Name)) fa.Add($"ss:FontName=\"{EscA(font.Name!)}\"");
                if (fa.Count > 0) parts.Add($"<Font {string.Join(" ", fa)}/>");
            }
            if (fill?.Pattern == "solid" && !string.IsNullOrEmpty(fill.FgColor))
                parts.Add($"<Interior ss:Color=\"{fill.FgColor}\" ss:Pattern=\"Solid\"/>");
            if (!string.IsNullOrEmpty(xf.Horizontal) || !string.IsNullOrEmpty(xf.Vertical))
            {
                var aa = new List<string>();
                if (!string.IsNullOrEmpty(xf.Horizontal))
                    aa.Add($"ss:Horizontal=\"{char.ToUpperInvariant(xf.Horizontal![0])}{xf.Horizontal[1..]}\"");
                if (!string.IsNullOrEmpty(xf.Vertical))
                    aa.Add($"ss:Vertical=\"{char.ToUpperInvariant(xf.Vertical![0])}{xf.Vertical[1..]}\"");
                parts.Add($"<Alignment {string.Join(" ", aa)}/>");
            }
            if (!string.IsNullOrEmpty(code)) parts.Add($"<NumberFormat ss:Format=\"{EscA(code!)}\"/>");
            styleXml.Add($"<Style ss:ID=\"s{idx}\">{string.Concat(parts)}</Style>");
        }

        // estilos de data implícitos (célula sem estilo próprio), dedup por código
        var dateStyleByCode = new Dictionary<string, string>(StringComparer.Ordinal);

        // ── worksheets ──
        var wsXml = new List<string>();
        foreach (var sel in sheets)
        {
            string name = sel.Name;
            var ws = sel.Ws;
            var spanAt = new Dictionary<(int C, int R), (int Across, int Down)>();
            var covered = new HashSet<(int C, int R)>();
            foreach (var range in ws.Merges ?? new List<string>())
            {
                var parts2 = range.Split(':');
                if (parts2.Length < 2 || parts2[0].Length == 0 || parts2[1].Length == 0) continue;
                var s = A1.RefToRowCol(parts2[0]);
                var e = A1.RefToRowCol(parts2[1]);
                spanAt[(s.Col, s.Row)] = (e.Col - s.Col, e.Row - s.Row);
                for (int rr = s.Row; rr <= e.Row; rr++)
                    for (int cc = s.Col; cc <= e.Col; cc++)
                        if (rr != s.Row || cc != s.Col) covered.Add((cc, rr));
            }

            var cols = new List<string>();
            foreach (var cd in ws.Cols ?? new List<ColDef>())
            {
                if (cd.Width is not double w) continue;
                cols.Add(
                    $"<Column ss:Index=\"{cd.Min}\"" +
                    (cd.Max > cd.Min ? $" ss:Span=\"{cd.Max - cd.Min}\"" : "") +
                    $" ss:Width=\"{JsNumber.ToString(ColWidthPt(w))}\" ss:AutoFitWidth=\"0\"/>");
            }

            var rows = new List<string>();
            int lastRow = 0;
            foreach (var r in ws.Rows.OrderBy(x => x.R))
            {
                var rAttr = new StringBuilder();
                if (r.R != lastRow + 1) rAttr.Append($" ss:Index=\"{r.R}\"");
                lastRow = r.R;
                if (r.Height is double rh) rAttr.Append($" ss:Height=\"{JsNumber.ToString(rh)}\" ss:AutoFitHeight=\"0\"");
                var cells = new List<string>();
                int lastCol = 0;
                foreach (var c in r.Cells)
                {
                    var (col, _) = A1.RefToRowCol(c.Ref);
                    if (covered.Contains((col, r.R))) continue;
                    var tv = CellValueOps.GetTypedValue(c, model, loc);
                    var cAttr = new StringBuilder();
                    if (col != lastCol + 1) cAttr.Append($" ss:Index=\"{col}\"");
                    lastCol = col;
                    if (spanAt.TryGetValue((col, r.R), out var span))
                    {
                        if (span.Across != 0) cAttr.Append($" ss:MergeAcross=\"{span.Across}\"");
                        if (span.Down != 0) cAttr.Append($" ss:MergeDown=\"{span.Down}\"");
                    }
                    if (c.Style is int cst && usedStyles.Contains(cst)) cAttr.Append($" ss:StyleID=\"s{cst}\"");

                    string data = "";
                    switch (tv.Kind)
                    {
                        case "number":
                            data = $"<Data ss:Type=\"Number\">{JsNumber.ToString(tv.Num!.Value)}</Data>";
                            break;
                        case "date":
                        case "time":
                        {
                            data = $"<Data ss:Type=\"DateTime\">{CellValueOps.IsoDateTime(tv.Date!.Value)}.000</Data>";
                            // DateTime sem NumberFormat vira serial na exibição — garante um
                            if (!cAttr.ToString().Contains("ss:StyleID", StringComparison.Ordinal))
                            {
                                string code = CellValueOps.EffectiveCode(c, model, loc);
                                if (!dateStyleByCode.TryGetValue(code, out var sid))
                                {
                                    sid = $"d{dateStyleByCode.Count + 1}";
                                    dateStyleByCode[code] = sid;
                                    styleXml.Add($"<Style ss:ID=\"{sid}\"><NumberFormat ss:Format=\"{EscA(code)}\"/></Style>");
                                }
                                cAttr.Append($" ss:StyleID=\"{sid}\"");
                            }
                            break;
                        }
                        case "boolean":
                            data = $"<Data ss:Type=\"Boolean\">{(tv.Bool == true ? 1 : 0)}</Data>";
                            break;
                        case "error":
                            data = $"<Data ss:Type=\"Error\">{Esc(tv.Str ?? "")}</Data>";
                            break;
                        case "string":
                            data = $"<Data ss:Type=\"String\">{Esc(tv.Str ?? "")}</Data>";
                            break;
                    }
                    cells.Add($"<Cell{cAttr}>{data}</Cell>");
                }
                rows.Add($"<Row{rAttr}>{string.Concat(cells)}</Row>");
            }

            wsXml.Add($"<Worksheet ss:Name=\"{EscA(name)}\"><Table>{string.Concat(cols)}{string.Concat(rows)}</Table></Worksheet>");
        }

        return
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<?mso-application progid=\"Excel.Sheet\"?>\n" +
            "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" " +
            "xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
            "xmlns:x=\"urn:schemas-microsoft-com:office:excel\" " +
            "xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\" " +
            "xmlns:html=\"http://www.w3.org/TR/REC-html40\">" +
            $"<Styles><Style ss:ID=\"Default\" ss:Name=\"Normal\"/>{string.Concat(styleXml)}</Styles>" +
            string.Concat(wsXml) +
            "</Workbook>";
    }
}
