using System.Text.RegularExpressions;
using UniversalOffice.Xlsx;

namespace UniversalOffice.Export;

/// <summary>
/// Export Markdown (GFM) — porta de sheet/packages/sheet-core/src/export/markdown.ts:
/// `## nome` + tabela por planilha, primeira linha usada = header, coluna com
/// maioria numérica alinha à direita, `|` escapado e quebras viram &lt;br&gt;.
/// </summary>
public static class XlsxMarkdown
{
    private static readonly Regex NewlineRe = new(@"\r\n|\r|\n", RegexOptions.CultureInvariant);

    private static string MdEscape(string text) =>
        NewlineRe.Replace(text.Replace("|", "\\|"), "<br>");

    private static string CellText(SheetGrid grid, int r, int c)
    {
        var merge = grid.MergeAt(r, c);
        if (merge is not null && (merge.R0 != r || merge.C0 != c)) return "";
        return MdEscape(grid.Cells[r - 1][c - 1]?.Text ?? "");
    }

    private static string SheetToMarkdown(SheetGrid grid)
    {
        var outp = new List<string> { $"## {grid.Name}" };
        if (grid.RowCount == 0) return string.Join("\n", outp);

        int headerRow = 1;
        for (int r = 1; r <= grid.RowCount; r++)
        {
            if (grid.Cells[r - 1].Any(c => c is not null)) { headerRow = r; break; }
        }

        var aligns = new List<string>();
        for (int c = 1; c <= grid.ColCount; c++)
        {
            int numeric = 0, nonEmpty = 0;
            for (int r = headerRow + 1; r <= grid.RowCount; r++)
            {
                var gc = grid.Cells[r - 1][c - 1];
                if (gc is null || gc.Text.Length == 0) continue;
                nonEmpty++;
                if (gc.Numeric) numeric++;
            }
            aligns.Add(nonEmpty > 0 && numeric * 2 > nonEmpty ? "---:" : "---");
        }

        string RowLine(int r)
        {
            var fields = new List<string>();
            for (int c = 1; c <= grid.ColCount; c++) fields.Add(CellText(grid, r, c));
            return $"| {string.Join(" | ", fields)} |";
        }

        outp.Add("");
        outp.Add(RowLine(headerRow));
        outp.Add($"| {string.Join(" | ", aligns)} |");
        for (int r = headerRow + 1; r <= grid.RowCount; r++) outp.Add(RowLine(r));
        return string.Join("\n", outp);
    }

    /// <summary>Exporta para Markdown. Default: todas as planilhas visíveis.</summary>
    public static string ToMarkdown(byte[] bytes, SheetExportOptions? opts = null)
    {
        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts?.Locale ?? Format.PtBr;
        var sheets = SheetModelOps.SelectSheets(model, opts, "all");
        return string.Join("\n\n", sheets.Select(sel =>
            SheetToMarkdown(SheetModelOps.BuildGrid(model, sel, loc)))) + "\n";
    }
}
