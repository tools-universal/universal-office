using System.IO.Compression;
using System.Text;
using OfficeNext.Core;
using OfficeNext.Xlsx;

namespace OfficeNext.Export;

/// <summary>
/// Export OpenDocument Spreadsheet (.ods) — porta de sheet/packages/sheet-core/src/export/ods.ts.
/// content.xml com valores TIPADOS + texto exibido (FormatValue pt-BR); estilos
/// básicos por célula; larguras/alturas; merges. ZIP: "mimetype" PRIMEIRA e STORED.
/// </summary>
public static class XlsxOds
{
    private static string Esc(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string EscA(string s) => Esc(s).Replace("\"", "&quot;");

    private const string Mimetype = "application/vnd.oasis.opendocument.spreadsheet";

    private const string OfficeNs =
        "xmlns:office=\"urn:oasis:names:tc:opendocument:xmlns:office:1.0\" " +
        "xmlns:table=\"urn:oasis:names:tc:opendocument:xmlns:table:1.0\" " +
        "xmlns:text=\"urn:oasis:names:tc:opendocument:xmlns:text:1.0\" " +
        "xmlns:style=\"urn:oasis:names:tc:opendocument:xmlns:style:1.0\" " +
        "xmlns:fo=\"urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0\" " +
        "xmlns:of=\"urn:oasis:names:tc:opendocument:xmlns:of:1.2\" " +
        "office:version=\"1.2\"";

    /// <summary>px (MDW) → atributo de largura ODF em polegadas.</summary>
    private static string PxToIn(int px) => JsNumber.ToFixed(px / 96.0, 4) + "in";

    /// <summary>Gera só o content.xml (útil para paridade byte a byte).</summary>
    public static string BuildContentXml(byte[] bytes, SheetExportOptions? opts = null)
    {
        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts?.Locale ?? Format.PtBr;
        var sheets = SheetModelOps.SelectSheets(model, opts, "all");

        // ── estilos automáticos (colunas/linhas/células) ──
        var auto = new List<string>();
        var cellStyleIds = new Dictionary<string, string>(StringComparer.Ordinal);

        string? CellStyleFor(int? styleIdx)
        {
            if (styleIdx is not int si) return null;
            var xf = si >= 0 && si < model.Styles.CellXfs.Count ? model.Styles.CellXfs[si] : null;
            if (xf is null) return null;
            var font = xf.FontId >= 0 && xf.FontId < model.Styles.Fonts.Count ? model.Styles.Fonts[xf.FontId] : null;
            var fill = xf.FillId >= 0 && xf.FillId < model.Styles.Fills.Count ? model.Styles.Fills[xf.FillId] : null;
            bool? bold = font?.Bold;
            bool? italic = font?.Italic;
            double? size = font?.Size;
            string? color = font?.Color;
            string? bg = fill?.Pattern == "solid" ? fill.FgColor : null;
            if (bold != true && italic != true && (size is null or 0) && string.IsNullOrEmpty(color) && string.IsNullOrEmpty(bg))
                return null;
            string k = $"{bold}|{italic}|{(size is double sd ? JsNumber.ToString(sd) : "")}|{color}|{bg}";
            if (!cellStyleIds.TryGetValue(k, out var id))
            {
                id = $"ce{cellStyleIds.Count + 1}";
                cellStyleIds[k] = id;
                var txt = new List<string>();
                if (bold == true) txt.Add("fo:font-weight=\"bold\"");
                if (italic == true) txt.Add("fo:font-style=\"italic\"");
                if (size is double s && s != 0) txt.Add($"fo:font-size=\"{JsNumber.ToString(s)}pt\"");
                if (!string.IsNullOrEmpty(color)) txt.Add($"fo:color=\"{color}\"");
                string cellProps = !string.IsNullOrEmpty(bg)
                    ? $"<style:table-cell-properties fo:background-color=\"{bg}\"/>" : "";
                auto.Add(
                    $"<style:style style:name=\"{id}\" style:family=\"table-cell\">" +
                    cellProps +
                    (txt.Count > 0 ? $"<style:text-properties {string.Join(" ", txt)}/>" : "") +
                    "</style:style>");
            }
            return id;
        }

        // ── tabelas ──
        var tables = new List<string>();
        int styleSeq = 0;
        foreach (var sel in sheets)
        {
            string name = sel.Name;
            var ws = sel.Ws;
            int maxCol = 0, maxRow = 0;
            foreach (var r in ws.Rows)
            {
                if (r.R > maxRow) maxRow = r.R;
                foreach (var c in r.Cells)
                {
                    var (col, _) = A1.RefToRowCol(c.Ref);
                    if (col > maxCol) maxCol = col;
                }
            }
            var spanAt = new Dictionary<(int C, int R), (int Cols, int Rows)>();
            var covered = new HashSet<(int C, int R)>();
            foreach (var range in ws.Merges ?? new List<string>())
            {
                var parts = range.Split(':');
                if (parts.Length < 2 || parts[0].Length == 0 || parts[1].Length == 0) continue;
                var s = A1.RefToRowCol(parts[0]);
                var e = A1.RefToRowCol(parts[1]);
                spanAt[(s.Col, s.Row)] = (e.Col - s.Col + 1, e.Row - s.Row + 1);
                if (e.Col > maxCol) maxCol = e.Col;
                if (e.Row > maxRow) maxRow = e.Row;
                for (int rr = s.Row; rr <= e.Row; rr++)
                    for (int cc = s.Col; cc <= e.Col; cc++)
                        if (rr != s.Row || cc != s.Col) covered.Add((cc, rr));
            }
            if (maxCol == 0) maxCol = 1;
            if (maxRow == 0) maxRow = 1;

            var colXml = new List<string>();
            int? WidthOf(int col)
            {
                foreach (var cd in ws.Cols ?? new List<ColDef>())
                {
                    if (col >= cd.Min && col <= cd.Max && cd.Width is double w)
                        return SheetModelOps.ColWidthPx(w);
                }
                return null;
            }
            for (int c = 1; c <= maxCol; c++)
            {
                int? px = WidthOf(c);
                if (px is int pxi)
                {
                    string id = $"co{++styleSeq}";
                    auto.Add(
                        $"<style:style style:name=\"{id}\" style:family=\"table-column\">" +
                        $"<style:table-column-properties style:column-width=\"{PxToIn(pxi)}\"/></style:style>");
                    colXml.Add($"<table:table-column table:style-name=\"{id}\"/>");
                }
                else colXml.Add("<table:table-column/>");
            }

            var rowByNum = new Dictionary<int, Row>();
            foreach (var r in ws.Rows) rowByNum[r.R] = r;

            var rowsXml = new List<string>();
            for (int rnum = 1; rnum <= maxRow; rnum++)
            {
                rowByNum.TryGetValue(rnum, out var row);
                string rowAttr = "";
                if (row?.Height is double rh)
                {
                    string id = $"ro{++styleSeq}";
                    auto.Add(
                        $"<style:style style:name=\"{id}\" style:family=\"table-row\">" +
                        $"<style:table-row-properties style:row-height=\"{JsNumber.ToString(rh)}pt\" style:use-optimal-row-height=\"false\"/></style:style>");
                    rowAttr = $" table:style-name=\"{id}\"";
                }
                var cellByCol = new Dictionary<int, Cell>();
                foreach (var c in row?.Cells ?? new List<Cell>()) cellByCol[A1.RefToRowCol(c.Ref).Col] = c;

                var cells = new List<string>();
                for (int cnum = 1; cnum <= maxCol; cnum++)
                {
                    if (covered.Contains((cnum, rnum))) { cells.Add("<table:covered-table-cell/>"); continue; }
                    cellByCol.TryGetValue(cnum, out var cell);
                    var tv = CellValueOps.GetTypedValue(cell, model, loc);
                    var attrs = new StringBuilder();
                    if (spanAt.TryGetValue((cnum, rnum), out var span))
                        attrs.Append($" table:number-columns-spanned=\"{span.Cols}\" table:number-rows-spanned=\"{span.Rows}\"");
                    string? styleId = cell is not null ? CellStyleFor(cell.Style) : null;
                    if (styleId is not null) attrs.Append($" table:style-name=\"{styleId}\"");
                    if (tv.Formula is not null) attrs.Append($" table:formula=\"of:={EscA(tv.Formula)}\"");

                    string text = "";
                    if (cell is not null)
                    {
                        if (tv.Kind is "number" or "date" or "time")
                        {
                            text = Format.FormatValue(tv.Num!.Value, CellValueOps.EffectiveCode(cell, model, loc),
                                new FormatOptions { Locale = loc, Date1904 = model.Workbook.Date1904 }).Text;
                        }
                        else if (tv.Kind == "boolean") text = tv.Bool == true ? "VERDADEIRO" : "FALSO";
                        else text = tv.Str ?? "";
                    }

                    switch (tv.Kind)
                    {
                        case "number":
                            attrs.Append($" office:value-type=\"float\" office:value=\"{JsNumber.ToString(tv.Num!.Value)}\"");
                            break;
                        case "date":
                            attrs.Append($" office:value-type=\"date\" office:date-value=\"{(tv.Num!.Value % 1 != 0 ? CellValueOps.IsoDateTime(tv.Date!.Value) : CellValueOps.IsoDate(tv.Date!.Value))}\"");
                            break;
                        case "time":
                            attrs.Append($" office:value-type=\"time\" office:time-value=\"{CellValueOps.IsoDuration(tv.Num!.Value)}\"");
                            break;
                        case "boolean":
                            attrs.Append($" office:value-type=\"boolean\" office:boolean-value=\"{(tv.Bool == true ? "true" : "false")}\"");
                            break;
                        case "string":
                        case "error":
                            if (text.Length > 0) attrs.Append(" office:value-type=\"string\"");
                            break;
                    }
                    cells.Add(text.Length > 0
                        ? $"<table:table-cell{attrs}><text:p>{Esc(text)}</text:p></table:table-cell>"
                        : $"<table:table-cell{attrs}/>");
                }
                rowsXml.Add($"<table:table-row{rowAttr}>{string.Concat(cells)}</table:table-row>");
            }

            tables.Add($"<table:table table:name=\"{EscA(name)}\">{string.Concat(colXml)}{string.Concat(rowsXml)}</table:table>");
        }

        return
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            $"<office:document-content {OfficeNs}>" +
            $"<office:automatic-styles>{string.Concat(auto)}</office:automatic-styles>" +
            $"<office:body><office:spreadsheet>{string.Concat(tables)}</office:spreadsheet></office:body>" +
            "</office:document-content>";
    }

    /// <summary>Exporta a pasta para .ods (mimetype PRIMEIRO e sem compressão).</summary>
    public static byte[] ToOds(byte[] bytes, SheetExportOptions? opts = null)
    {
        string content = BuildContentXml(bytes, opts);

        string stylesXml =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            $"<office:document-styles {OfficeNs}><office:styles/></office:document-styles>";

        string manifest =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<manifest:manifest xmlns:manifest=\"urn:oasis:names:tc:opendocument:xmlns:manifest:1.0\" manifest:version=\"1.2\">" +
            $"<manifest:file-entry manifest:full-path=\"/\" manifest:media-type=\"{Mimetype}\"/>" +
            "<manifest:file-entry manifest:full-path=\"content.xml\" manifest:media-type=\"text/xml\"/>" +
            "<manifest:file-entry manifest:full-path=\"styles.xml\" manifest:media-type=\"text/xml\"/>" +
            "</manifest:manifest>";

        var utf8 = new UTF8Encoding(false);
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            void Add(string name, byte[] data, CompressionLevel level)
            {
                var entry = zip.CreateEntry(name, level);
                using var s = entry.Open();
                s.Write(data);
            }
            Add("mimetype", utf8.GetBytes(Mimetype), CompressionLevel.NoCompression);
            Add("content.xml", utf8.GetBytes(content), CompressionLevel.Optimal);
            Add("styles.xml", utf8.GetBytes(stylesXml), CompressionLevel.Optimal);
            Add("META-INF/manifest.xml", utf8.GetBytes(manifest), CompressionLevel.Optimal);
        }
        return ms.ToArray();
    }
}
