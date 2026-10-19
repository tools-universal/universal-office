using OfficeNext.Core;
using OfficeNext.Xlsx;

namespace OfficeNext.Export;

/// <summary>
/// Base compartilhada pelos exportadores de sheet — porta de
/// sheet/packages/sheet-core/src/export/model.ts: modelo, seleção de planilhas, grade
/// densa com valores FORMATADOS (FormatValue + PT_BR) e métrica MDW.
/// </summary>
public sealed class SheetModel
{
    public required XlsxPackage Pkg { get; init; }
    public required Workbook Workbook { get; init; }
    public required Styles Styles { get; init; }
    public required List<SharedString> SharedStrings { get; init; }
    /// <summary>ColorContext do tema, resolvido uma vez no LoadModel (read-only).</summary>
    public ColorContext? Cx { get; init; }
}

public class SheetExportOptions
{
    /// <summary>Índice (0-based) da planilha; null = default do formato.</summary>
    public int? SheetIndex;
    /// <summary>Nome da planilha (alternativa ao índice).</summary>
    public string? SheetName;
    public FormatLocale? Locale;
}

public sealed class SelectedSheet
{
    public string Name = "";
    public Worksheet Ws = new();
}

public sealed class DisplayValue
{
    public string Text = "";
    public string? Color;
    public bool Numeric;
}

public sealed class GridCell
{
    public string Text = "";
    public string? Color;
    public bool Numeric;
    /// <summary>Índice em styles.cellXfs (atributo `s` da célula), se houver.</summary>
    public int? Xf;
}

public sealed class GridMerge
{
    public int R0;
    public int C0;
    public int R1;
    public int C1;
}

public sealed class SheetGrid
{
    public string Name = "";
    public Worksheet Ws = new();
    public int RowCount;
    public int ColCount;
    /// <summary>Cells[r-1][c-1] — null = célula ausente.</summary>
    public GridCell?[][] Cells = [];
    public List<GridMerge> Merges = new();
    private Dictionary<(int R, int C), GridMerge> _mergeMap = new();

    public GridMerge? MergeAt(int r, int c) => _mergeMap.TryGetValue((r, c), out var m) ? m : null;

    internal void BuildMergeMap()
    {
        _mergeMap = new Dictionary<(int, int), GridMerge>();
        foreach (var g in Merges)
            for (int r = g.R0; r <= g.R1; r++)
                for (int c = g.C0; c <= g.C1; c++)
                    _mergeMap[(r, c)] = g;
    }
}

public static class SheetModelOps
{
    /// <summary>Carrega o modelo a partir de bytes.</summary>
    public static SheetModel LoadModel(byte[] bytes)
    {
        var pkg = XlsxPackage.Load(bytes);
        var cx = ThemeReader.BuildColorContext(pkg);
        return new SheetModel
        {
            Pkg = pkg,
            Workbook = XlsxReader.ReadWorkbook(pkg),
            Styles = StylesReader.ReadStyles(pkg, cx),
            SharedStrings = XlsxReader.ReadSharedStrings(pkg, cx),
            Cx = cx,
        };
    }

    /// <summary>Refs das planilhas a exportar, sem ler o sheetData ainda.</summary>
    public static List<SheetRef> SelectSheetRefs(SheetModel model, SheetExportOptions? opts, string defaultScope)
    {
        var workbook = model.Workbook;
        if (opts?.SheetIndex is int idx)
        {
            if (idx < 0 || idx >= workbook.Sheets.Count)
                throw new ArgumentOutOfRangeException(nameof(opts),
                    $"Índice de planilha fora do intervalo: {idx} (0..{workbook.Sheets.Count - 1})");
            return [workbook.Sheets[idx]];
        }
        if (opts?.SheetName is string name)
        {
            var sref = workbook.Sheets.FirstOrDefault(s => s.Name == name)
                ?? throw new KeyNotFoundException($"Planilha não encontrada: \"{name}\"");
            return [sref];
        }
        if (workbook.Sheets.Count == 0) throw new InvalidDataException("Pasta de trabalho sem planilhas");
        if (defaultScope == "active")
        {
            int at = workbook.ActiveTab ?? 0;
            return [at >= 0 && at < workbook.Sheets.Count ? workbook.Sheets[at] : workbook.Sheets[0]];
        }
        var visible = workbook.Sheets.Where(s => s.State is null || s.State == "visible").ToList();
        return visible.Count > 0 ? visible : workbook.Sheets;
    }

    /// <summary>Lê o sheetData de uma ref (ColorContext do modelo é read-only/thread-safe).</summary>
    public static SelectedSheet ReadSelected(SheetModel model, SheetRef sref)
    {
        if (sref.Target is null)
            throw new InvalidDataException($"Planilha \"{sref.Name}\" sem parte resolvida no pacote");
        var cx = model.Cx ?? ThemeReader.BuildColorContext(model.Pkg);
        return new SelectedSheet { Name = sref.Name, Ws = XlsxReader.ReadWorksheet(model.Pkg, sref.Target, cx) };
    }

    /// <summary>Resolve quais planilhas exportar ('active' = csv/tsv, 'all' = md/html).</summary>
    public static List<SelectedSheet> SelectSheets(SheetModel model, SheetExportOptions? opts, string defaultScope)
    {
        var refs = SelectSheetRefs(model, opts, defaultScope);
        // hot path: parse do sheetData é independente por planilha — paralelo,
        // preservando a ordem (partes do OpcPackage são read-only pós-Load)
        var outp = new SelectedSheet[refs.Count];
        if (refs.Count > 1)
            Parallel.For(0, refs.Count, i => outp[i] = ReadSelected(model, refs[i]));
        else
            for (int i = 0; i < refs.Count; i++) outp[i] = ReadSelected(model, refs[i]);
        return outp.ToList();
    }

    // ──────────────────────── Valor exibido ────────────────────────

    /// <summary>Texto exibido de uma célula (boolean → VERDADEIRO/FALSO, erro → literal,
    /// fórmula → valor cacheado formatado).</summary>
    public static DisplayValue GetDisplayValue(Cell cell, SheetModel model, FormatLocale loc)
    {
        if (cell.Type == "s" && cell.Value is not null)
        {
            int idx = JsNumber.ParseIntOr(cell.Value, -1);
            string text = idx >= 0 && idx < model.SharedStrings.Count ? model.SharedStrings[idx].Text ?? "" : "";
            return new DisplayValue { Text = text, Numeric = false };
        }
        if (cell.Type == "inlineStr")
            return new DisplayValue { Text = cell.InlineString?.Text ?? "", Numeric = false };
        if (cell.Type == "b")
            return new DisplayValue { Text = cell.Value == "1" ? "VERDADEIRO" : "FALSO", Numeric = false };
        if (cell.Type == "e")
            return new DisplayValue { Text = cell.Value ?? "", Numeric = false };
        if (cell.Value is null) return new DisplayValue { Text = "", Numeric = false };
        if (cell.Type == "str") return new DisplayValue { Text = cell.Value, Numeric = false };
        double n = JsNumber.ParseFloat(cell.Value);
        if (double.IsNaN(n)) return new DisplayValue { Text = cell.Value, Numeric = false };
        int styleIdx = cell.Style ?? 0;
        var xf = styleIdx >= 0 && styleIdx < model.Styles.CellXfs.Count ? model.Styles.CellXfs[styleIdx] : null;
        int numFmtId = xf?.NumFmtId ?? 0;
        string code = model.Styles.NumFmts.TryGetValue(numFmtId, out var custom)
            ? custom
            : Format.BuiltinFormatCode(numFmtId, loc) ?? "General";
        var r = Format.FormatValue(n, code, new FormatOptions { Locale = loc, Date1904 = model.Workbook.Date1904 });
        return new DisplayValue { Text = r.Text, Color = r.Color, Numeric = true };
    }

    // ──────────────────────── Grade densa ────────────────────────

    /// <summary>Densifica a planilha (linhas/colunas até a última usada; merges estendem).</summary>
    public static SheetGrid BuildGrid(SheetModel model, SelectedSheet sel, FormatLocale loc)
    {
        var ws = sel.Ws;
        int rowCount = 0, colCount = 0;
        foreach (var row in ws.Rows)
        {
            if (row.Cells.Count == 0) continue;
            if (row.R > rowCount) rowCount = row.R;
            foreach (var c in row.Cells)
            {
                var (col, _) = A1.RefToRowCol(c.Ref);
                if (col > colCount) colCount = col;
            }
        }
        var merges = new List<GridMerge>();
        foreach (var m in ws.Merges ?? new List<string>())
        {
            var parts = m.Split(':');
            if (parts.Length == 0 || parts[0].Length == 0) continue;
            try
            {
                var s = A1.RefToRowCol(parts[0]);
                var e = parts.Length > 1 ? A1.RefToRowCol(parts[1]) : s;
                var g = new GridMerge
                {
                    R0 = Math.Min(s.Row, e.Row), C0 = Math.Min(s.Col, e.Col),
                    R1 = Math.Max(s.Row, e.Row), C1 = Math.Max(s.Col, e.Col),
                };
                merges.Add(g);
                if (g.R1 > rowCount) rowCount = g.R1;
                if (g.C1 > colCount) colCount = g.C1;
            }
            catch { /* ref inválida: ignora o merge */ }
        }

        var cells = new GridCell?[rowCount][];
        for (int r = 0; r < rowCount; r++) cells[r] = new GridCell?[colCount];
        foreach (var row in ws.Rows)
        {
            foreach (var c in row.Cells)
            {
                var (col, r) = A1.RefToRowCol(c.Ref);
                if (r < 1 || r > rowCount || col < 1 || col > colCount) continue;
                var dv = GetDisplayValue(c, model, loc);
                var gc = new GridCell { Text = dv.Text, Color = dv.Color, Numeric = dv.Numeric };
                if (c.Style is int st) gc.Xf = st;
                cells[r - 1][col - 1] = gc;
            }
        }

        var grid = new SheetGrid
        {
            Name = sel.Name, Ws = ws, RowCount = rowCount, ColCount = colCount,
            Cells = cells, Merges = merges,
        };
        grid.BuildMergeMap();
        return grid;
    }

    // ──────────────────── Métricas (larguras/alturas) ────────────────────

    /// <summary>Largura de coluna (unidades MDW) → px @96dpi (fórmula OOXML, MDW=7).</summary>
    public static int ColWidthPx(double width)
    {
        const int MDW = 7;
        return (int)Math.Floor((256 * width + Math.Floor(128.0 / MDW)) / 256 * MDW);
    }

    private const int DefaultColWPx = 64;
    private const double DefaultRowHPt = 15;

    /// <summary>Largura em px de cada coluna 1..colCount.</summary>
    public static int[] ColWidthsPx(Worksheet ws, int colCount)
    {
        var sfp = ws.SheetFormatPr;
        int defPx = sfp?.DefaultColWidth is double dcw
            ? ColWidthPx(dcw)
            : sfp?.BaseColWidth is double bcw
                ? ColWidthPx(bcw + 5.0 / 7)
                : DefaultColWPx;
        var outp = new int[colCount];
        Array.Fill(outp, defPx);
        foreach (var cd in ws.Cols ?? new List<ColDef>())
        {
            if (cd.Width is not double w) continue;
            for (int c = Math.Max(1, cd.Min); c <= Math.Min(colCount, cd.Max); c++)
                outp[c - 1] = ColWidthPx(w);
        }
        return outp;
    }

    /// <summary>Altura em pontos de cada linha 1..rowCount.</summary>
    public static double[] RowHeightsPt(Worksheet ws, int rowCount)
    {
        double def = ws.SheetFormatPr?.DefaultRowHeight ?? DefaultRowHPt;
        var outp = new double[rowCount];
        Array.Fill(outp, def);
        foreach (var row in ws.Rows)
            if (row.Height is double h && row.R >= 1 && row.R <= rowCount) outp[row.R - 1] = h;
        return outp;
    }

    /// <summary>Colunas ocultas (1-based) — usadas pelo PDF (impressão pula ocultas).</summary>
    public static HashSet<int> HiddenCols(Worksheet ws, int colCount)
    {
        var outp = new HashSet<int>();
        foreach (var cd in ws.Cols ?? new List<ColDef>())
        {
            if (!cd.Hidden) continue;
            for (int c = Math.Max(1, cd.Min); c <= Math.Min(colCount, cd.Max); c++) outp.Add(c);
        }
        return outp;
    }

    /// <summary>Linhas ocultas (1-based).</summary>
    public static HashSet<int> HiddenRows(Worksheet ws)
    {
        var outp = new HashSet<int>();
        foreach (var row in ws.Rows) if (row.Hidden) outp.Add(row.R);
        return outp;
    }

    /// <summary>Cor de fundo efetiva de um fill para export "chapado".</summary>
    public static string? FillColor(Fill? fill)
    {
        if (fill is null) return null;
        if (fill.Pattern == "solid") return fill.FgColor;
        if (fill.Gradient is not null) return fill.Gradient.Stops.FirstOrDefault()?.Color;
        if (!string.IsNullOrEmpty(fill.Pattern) && fill.Pattern != "none") return fill.FgColor ?? fill.BgColor;
        return null;
    }
}
