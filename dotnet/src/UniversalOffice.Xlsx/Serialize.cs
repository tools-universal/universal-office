using System.Text;
using System.Text.RegularExpressions;
using UniversalOffice.Core;

namespace UniversalOffice.Xlsx;

/// <summary>
/// Serialização MÍNIMA de worksheet — cirurgia no XML original (porta de
/// sheet-core/src/serialize.ts). Só os blocos &lt;sheetData&gt; e &lt;cols&gt;
/// são regenerados; todo o resto flui byte a byte.
/// </summary>
public static class XlsxSerialize
{
    private static string EscXml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string EscAttr(string s) => EscXml(s).Replace("\"", "&quot;");

    private static string CellXml(Cell c)
    {
        var attrs = new StringBuilder();
        attrs.Append($" r=\"{EscAttr(c.Ref)}\"");
        if (c.Style is int st) attrs.Append($" s=\"{st}\"");
        if (!string.IsNullOrEmpty(c.Type)) attrs.Append($" t=\"{c.Type}\"");
        var inner = new StringBuilder();
        if (c.Formula is not null) inner.Append($"<f>{EscXml(c.Formula)}</f>");
        if (c.InlineString is not null)
        {
            string t = c.InlineString.Text
                ?? (c.InlineString.Runs is not null ? string.Concat(c.InlineString.Runs.Select(r => r.Text)) : "");
            string sp = Regex.IsMatch(t, @"^\s|\s$") ? " xml:space=\"preserve\"" : "";
            inner.Append($"<is><t{sp}>{EscXml(t)}</t></is>");
        }
        else if (c.Value is not null && (c.Value != "" || c.Formula is null))
        {
            inner.Append($"<v>{EscXml(c.Value)}</v>");
        }
        return inner.Length > 0 ? $"<c{attrs}>{inner}</c>" : $"<c{attrs}/>";
    }

    private static string RowXml(Row r)
    {
        var attrs = new StringBuilder();
        attrs.Append($" r=\"{r.R}\"");
        if (r.Cells.Count > 0)
        {
            var colNums = r.Cells.Select(c => A1.RefToRowCol(c.Ref).Col).ToList();
            attrs.Append($" spans=\"{colNums.Min()}:{colNums.Max()}\"");
        }
        if (r.Style is int st) attrs.Append($" s=\"{st}\" customFormat=\"1\"");
        if (r.Height is double h) attrs.Append($" ht=\"{JsNumber.ToString(h)}\"");
        if (r.Hidden) attrs.Append(" hidden=\"1\"");
        if (r.CustomHeight) attrs.Append(" customHeight=\"1\"");
        string cells = string.Concat(r.Cells.Select(CellXml));
        return cells.Length > 0 ? $"<row{attrs}>{cells}</row>" : $"<row{attrs}/>";
    }

    /// <summary>Serializa o bloco &lt;sheetData&gt; a partir do modelo (linhas ordenadas).</summary>
    public static string SerializeSheetData(List<Row> rows)
    {
        var sorted = rows.OrderBy(r => r.R).ToList();
        string body = string.Concat(sorted
            .Where(r => r.Cells.Count > 0 || r.Height is not null || r.Hidden || r.Style is not null)
            .Select(RowXml));
        return body.Length > 0 ? $"<sheetData>{body}</sheetData>" : "<sheetData/>";
    }

    /// <summary>Serializa o bloco &lt;cols&gt; (vazio → "").</summary>
    public static string SerializeCols(List<ColDef>? cols)
    {
        if (cols is null || cols.Count == 0) return "";
        var body = new StringBuilder();
        foreach (var c in cols)
        {
            var a = new StringBuilder();
            a.Append($" min=\"{c.Min}\" max=\"{c.Max}\"");
            if (c.Width is double w) a.Append($" width=\"{JsNumber.ToString(w)}\"");
            if (c.CustomWidth) a.Append(" customWidth=\"1\"");
            if (c.Hidden) a.Append(" hidden=\"1\"");
            if (c.Style is int st) a.Append($" style=\"{st}\"");
            body.Append($"<col{a}/>");
        }
        return $"<cols>{body}</cols>";
    }

    private static readonly Regex SheetDataOpenRe = new(@"<sheetData[\s/>]", RegexOptions.CultureInvariant);
    private static readonly Regex SheetDataSelfCloseRe = new(@"^<sheetData\s*/>", RegexOptions.CultureInvariant);
    private static readonly Regex ColsOpenRe = new(@"<cols[\s>]", RegexOptions.CultureInvariant);

    /// <summary>Atualiza o XML original trocando SÓ &lt;sheetData&gt; (e &lt;cols&gt;).</summary>
    public static string UpdateWorksheetXml(string originalXml, Worksheet ws)
    {
        string xml = originalXml;

        string sheetData = SerializeSheetData(ws.Rows);
        var sdOpenM = SheetDataOpenRe.Match(xml);
        if (!sdOpenM.Success) throw new InvalidDataException("worksheet sem <sheetData>");
        int sdOpen = sdOpenM.Index;
        var selfCloseM = SheetDataSelfCloseRe.Match(xml[sdOpen..]);
        int sdEnd = selfCloseM.Success
            ? sdOpen + selfCloseM.Value.Length
            : xml.IndexOf("</sheetData>", sdOpen, StringComparison.Ordinal) + "</sheetData>".Length;
        xml = xml[..sdOpen] + sheetData + xml[sdEnd..];

        string cols = SerializeCols(ws.Cols);
        var colsOpenM = ColsOpenRe.Match(xml);
        if (colsOpenM.Success)
        {
            int colsOpen = colsOpenM.Index;
            int colsEnd = xml.IndexOf("</cols>", colsOpen, StringComparison.Ordinal) + "</cols>".Length;
            xml = xml[..colsOpen] + cols + xml[colsEnd..];
        }
        else if (cols.Length > 0)
        {
            int at = SheetDataOpenRe.Match(xml).Index;
            xml = xml[..at] + cols + xml[at..];
        }
        return xml;
    }

    // ──────────────────── Manipulação básica (SetCellValue) ────────────────────

    /// <summary>Localiza (ou cria, ordenada) a célula `ref` no modelo da worksheet.</summary>
    private static Cell GetOrCreateCell(Worksheet ws, string cellRef)
    {
        var (col, rowNum) = A1.RefToRowCol(cellRef);
        var row = ws.Rows.FirstOrDefault(r => r.R == rowNum);
        if (row is null)
        {
            row = new Row { R = rowNum };
            int at = ws.Rows.FindIndex(r => r.R > rowNum);
            if (at < 0) ws.Rows.Add(row); else ws.Rows.Insert(at, row);
        }
        var cell = row.Cells.FirstOrDefault(c => c.Ref == cellRef);
        if (cell is null)
        {
            cell = new Cell { Ref = cellRef };
            int at = row.Cells.FindIndex(c => A1.RefToRowCol(c.Ref).Col > col);
            if (at < 0) row.Cells.Add(cell); else row.Cells.Insert(at, cell);
        }
        return cell;
    }

    /// <summary>Set de valor numérico (t ausente = "n").</summary>
    public static void SetCellNumber(Worksheet ws, string cellRef, double value)
    {
        var cell = GetOrCreateCell(ws, cellRef);
        cell.Type = null;
        cell.Value = JsNumber.ToString(value);
        cell.Formula = null;
        cell.InlineString = null;
    }

    /// <summary>Set de texto como inlineStr (não mexe em sharedStrings).</summary>
    public static void SetCellInlineText(Worksheet ws, string cellRef, string text)
    {
        var cell = GetOrCreateCell(ws, cellRef);
        cell.Type = "inlineStr";
        cell.Value = null;
        cell.Formula = null;
        cell.InlineString = new SharedString { Text = text };
    }

    /// <summary>
    /// Set de texto como shared string (t="s"): acrescenta (ou reusa) a entrada em
    /// xl/sharedStrings.xml e grava o índice na célula. Cria a parte quando ausente.
    /// </summary>
    public static void SetCellSharedText(XlsxPackage pkg, Worksheet ws, string cellRef, string text)
    {
        int index = AppendSharedString(pkg, text);
        var cell = GetOrCreateCell(ws, cellRef);
        cell.Type = "s";
        cell.Value = JsNumber.IntToString(index);
        cell.Formula = null;
        cell.InlineString = null;
    }

    /// <summary>Set de fórmula (sem recálculo — cache vazio).</summary>
    public static void SetCellFormula(Worksheet ws, string cellRef, string formula)
    {
        var cell = GetOrCreateCell(ws, cellRef);
        cell.Type = null;
        cell.Formula = formula;
        cell.Value = "";
        cell.InlineString = null;
    }

    private static readonly Regex SiRe = new(@"<si>(?:<t(?:\s[^>]*)?>)([\s\S]*?)</t></si>", RegexOptions.CultureInvariant);

    /// <summary>Acrescenta uma &lt;si&gt; simples ao sharedStrings (reusa idêntica); retorna o índice.</summary>
    private static int AppendSharedString(XlsxPackage pkg, string text)
    {
        string? xml = pkg.GetPartText("xl/sharedStrings.xml");
        var strings = xml is not null ? XlsxReader.ReadSharedStrings(pkg) : new List<SharedString>();
        for (int i = 0; i < strings.Count; i++)
            if (strings[i].Runs is null && strings[i].Text == text) return i;

        string sp = Regex.IsMatch(text, @"^\s|\s$") ? " xml:space=\"preserve\"" : "";
        string entry = $"<si><t{sp}>{EscXml(text)}</t></si>";
        if (xml is null)
        {
            string fresh =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"1\" uniqueCount=\"1\">" +
                entry + "</sst>";
            pkg.SetPartText("xl/sharedStrings.xml", fresh);
            EnsureSharedStringsWired(pkg);
            return 0;
        }
        // cirurgia: injeta antes de </sst> (conta/uniqueCount ficam desatualizados
        // de propósito — o Excel os recalcula; regra de ouro: mexer no mínimo)
        int at = xml.LastIndexOf("</sst>", StringComparison.Ordinal);
        if (at < 0) throw new InvalidDataException("sharedStrings.xml sem </sst>");
        pkg.SetPartText("xl/sharedStrings.xml", xml[..at] + entry + xml[at..]);
        return strings.Count;
    }

    /// <summary>Garante rel + content-type do sharedStrings quando a parte é criada.</summary>
    private static void EnsureSharedStringsWired(XlsxPackage pkg)
    {
        const string relsPath = "xl/_rels/workbook.xml.rels";
        string rels = pkg.GetPartText(relsPath) ??
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"></Relationships>";
        if (!rels.Contains("sharedStrings.xml"))
        {
            rels = rels.Replace("</Relationships>",
                "<Relationship Id=\"rIdOnSst\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/></Relationships>");
            pkg.SetPartText(relsPath, rels);
        }
        string? ct = pkg.GetPartText("[Content_Types].xml");
        if (ct is not null && !ct.Contains("sharedStrings+xml"))
        {
            ct = ct.Replace("</Types>",
                "<Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\"/></Types>");
            pkg.SetPartText("[Content_Types].xml", ct);
        }
    }
}
