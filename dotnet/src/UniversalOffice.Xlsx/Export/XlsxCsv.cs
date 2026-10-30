using System.Text;
using UniversalOffice.Xlsx;

namespace UniversalOffice.Export;

/// <summary>
/// Export CSV/TSV — paridade com "Salvar como CSV" do Excel pt-BR (porta de
/// sheet/packages/sheet-core/src/export/csv.ts): valor FORMATADO, delimitador `;`,
/// CRLF entre linhas + CRLF final, quoting RFC 4180.
/// </summary>
public static class XlsxCsv
{
    /// <summary>Escapa um campo segundo RFC 4180.</summary>
    private static string CsvField(string text, string delimiter)
    {
        if (text.Length == 0) return "";
        if (text.Contains(delimiter, StringComparison.Ordinal) || text.Contains('"')
            || text.Contains('\n') || text.Contains('\r'))
            return "\"" + text.Replace("\"", "\"\"") + "\"";
        return text;
    }

    /// <summary>Exporta UMA planilha (default: a ativa) para CSV (grade densa).</summary>
    public static string ToCsv(byte[] bytes, SheetExportOptions? opts = null, string? delimiter = null)
    {
        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts?.Locale ?? Format.PtBr;
        string delim = delimiter ?? ";";
        var sel = SheetModelOps.SelectSheets(model, opts, "active")[0];
        var grid = SheetModelOps.BuildGrid(model, sel, loc);
        var lines = new List<string>();
        for (int r = 1; r <= grid.RowCount; r++)
        {
            var fields = new List<string>();
            for (int c = 1; c <= grid.ColCount; c++)
                fields.Add(CsvField(grid.Cells[r - 1][c - 1]?.Text ?? "", delim));
            lines.Add(string.Join(delim, fields));
        }
        // Excel termina o arquivo com CRLF após a última linha
        return lines.Count > 0 ? string.Join("\r\n", lines) + "\r\n" : "";
    }

    /// <summary>Atalho: CSV com delimitador tab (mesmo quoting).</summary>
    public static string ToTsv(byte[] bytes, SheetExportOptions? opts = null) =>
        ToCsv(bytes, opts, "\t");
}
