using System.Text.RegularExpressions;

namespace UniversalOffice.Xlsx;

/// <summary>
/// Modelo de dados que espelha o SpreadsheetML (OOXML) literalmente —
/// porta de sheet/packages/sheet-core/src/model.ts.
/// </summary>
public sealed class SheetRef
{
    public string Name = "";
    public string SheetId = "";
    public string RId = "";
    public string? State;        // visible | hidden | veryHidden
    /// <summary>Caminho resolvido dentro do pacote (ex.: "xl/worksheets/sheet1.xml").</summary>
    public string? Target;
}

public sealed class Workbook
{
    public List<SheetRef> Sheets = new();
    public int? ActiveTab;
    /// <summary>Sistema de data 1904 (Mac legacy): desloca o epoch em 1462 dias.</summary>
    public bool Date1904;
}

/// <summary>Propriedades de fonte de um run rico (&lt;rPr&gt; parseado).</summary>
public sealed class RichRunProps
{
    public bool? Bold;
    public bool? Italic;
    public bool? Underline;
    public bool? Strike;
    public double? Size;
    public string? Color;
    public string? Font;

    public bool Any => Bold is not null || Italic is not null || Underline is not null
        || Strike is not null || Size is not null || Color is not null || Font is not null;
}

/// <summary>Run de texto rico dentro de um shared/inline string.</summary>
public sealed class RichRun
{
    public string Text = "";
    public Dictionary<string, string>? RPr;
    public RichRunProps? Props;
}

/// <summary>Entrada em xl/sharedStrings.xml (&lt;si&gt;) ou string inline (&lt;is&gt;).</summary>
public sealed class SharedString
{
    public string? Text;
    public List<RichRun>? Runs;
}

/// <summary>Célula — elemento &lt;c&gt;.</summary>
public sealed class Cell
{
    public string Ref = "";
    /// <summary>Tipo (atributo t): b/n/e/s/str/inlineStr/d. Null = número.</summary>
    public string? Type;
    public int? Style;
    public string? Value;
    public string? Formula;
    public SharedString? InlineString;
}

public sealed class Row
{
    public int R;
    public string? Spans;
    public double? Height;
    public bool CustomHeight;
    public bool Hidden;
    public int? Style;
    public List<Cell> Cells = new();
}

public sealed class ColDef
{
    public int Min = 1;
    public int Max = 1;
    public double? Width;
    public bool CustomWidth;
    public bool Hidden;
    public int? Style;
}

public sealed class PaneInfo
{
    public int XSplit;
    public int YSplit;
    public string? TopLeftCell;
    public string State = "split";
}

public sealed class Hyperlink
{
    public string Ref = "";
    public string? Target;
    public string? Location;
    public string? Display;
    public string? Tooltip;
}

public sealed class SheetFormatPr
{
    public double? DefaultColWidth;
    public double? BaseColWidth;
    public double? DefaultRowHeight;
    public bool CustomHeight;
}

public sealed class ColorStop
{
    public string Type = "min";
    public double? Value;
    public string Color = "#808080";
}

public sealed class CondRule
{
    public string Type = "";     // colorScale | dataBar | cellIs | expression
    public int Priority;
    public List<ColorStop>? Stops;
    public string? BarColor;
    public string? Operator;
    public List<string>? Formula;
    public int? DxfId;
}

public sealed class CondFormat
{
    public string Sqref = "";
    public List<CondRule> Rules = new();
}

public sealed class Comment
{
    public string Ref = "";
    public string Text = "";
    public string? Author;
}

public sealed class DrawingAnchorPoint
{
    public int Col;
    public int Row;
    public int ColOff;
    public int RowOff;
}

public sealed class DrawingAnchor
{
    public DrawingAnchorPoint From = new();
    public DrawingAnchorPoint To = new();
}

public sealed class DrawingChart
{
    public DrawingAnchor Anchor = new();
    public string ChartXml = "";
}

/// <summary>Planilha — conteúdo de xl/worksheets/sheetN.xml.</summary>
public sealed class Worksheet
{
    public List<Row> Rows = new();
    public List<string>? Merges;
    public List<ColDef>? Cols;
    public PaneInfo? Pane;
    public bool? ShowGridLines;
    public List<CondFormat>? CondFormats;
    public Dictionary<string, string>? MergedAreas;
    public List<Comment>? Comments;
    public List<DrawingChart>? Charts;
    public List<Hyperlink>? Hyperlinks;
    public SheetFormatPr? SheetFormatPr;
}

/// <summary>Helpers de referência A1 (matemática determinística).</summary>
public static class A1
{
    private static readonly Regex ColRe = new("([A-Z]+)(\\d+)", RegexOptions.CultureInvariant);

    /// <summary>"A1" → (col 1-based, row 1-based).</summary>
    public static (int Col, int Row) RefToRowCol(string cellRef)
    {
        var m = ColRe.Match(cellRef);
        if (!m.Success) throw new FormatException($"Referência de célula inválida: {cellRef}");
        int col = 0;
        foreach (char ch in m.Groups[1].Value) col = col * 26 + (ch - 64);
        return (col, int.Parse(m.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture));
    }

    /// <summary>(col 1, row 1) → "A1".</summary>
    public static string RowColToRef(int col, int row)
    {
        int c = col;
        string letters = "";
        while (c > 0)
        {
            int rem = (c - 1) % 26;
            letters = (char)(65 + rem) + letters;
            c = (c - 1) / 26;
        }
        return letters + row.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}
