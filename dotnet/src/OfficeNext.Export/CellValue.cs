using System.Text.RegularExpressions;
using OfficeNext.Core;
using OfficeNext.Xlsx;

namespace OfficeNext.Export;

/// <summary>
/// Classificação de valor de célula para exportadores TIPADOS (ODS/XML 2003) —
/// porta de sheet/packages/export/src/cellvalue.ts.
/// </summary>
public sealed class TypedValue
{
    public string Kind = "empty"; // number | date | time | boolean | string | error | empty
    public double? Num;
    public string? Str;
    public bool? Bool;
    public DateTime? Date;
    public string? Code;
    public string? Formula;
}

public static class CellValueOps
{
    private static readonly Regex QuotedRe = new("\"[^\"]*\"", RegexOptions.CultureInvariant);
    private static readonly Regex EscRe = new(@"\\.", RegexOptions.CultureInvariant);
    private static readonly Regex NonElapsedBracketRe = new(@"\[(?![hms])[^\]]*\]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex AnyBracketRe = new(@"\[[^\]]*\]", RegexOptions.CultureInvariant);
    private static readonly Regex TimeTokenRe = new("[hs]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex AmPmRe = new("am/pm", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex DateTokenRe = new("[yd]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex MonthTokenRe = new("m", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>O formatCode contém tokens de data/hora fora de literais?</summary>
    public static (bool Date, bool Time) IsDateTimeCode(string code)
    {
        string bare = NonElapsedBracketRe.Replace(EscRe.Replace(QuotedRe.Replace(code, ""), ""), "");
        string stripped = AnyBracketRe.Replace(bare, "");
        bool time = TimeTokenRe.IsMatch(bare) || AmPmRe.IsMatch(bare);
        bool date = DateTokenRe.IsMatch(stripped) || (MonthTokenRe.IsMatch(stripped) && !time);
        return (date, time);
    }

    /// <summary>formatCode efetivo (numFmt custom &gt; builtin do locale &gt; General).</summary>
    public static string EffectiveCode(Cell cell, SheetModel model, FormatLocale loc)
    {
        int styleIdx = cell.Style ?? 0;
        var xf = styleIdx >= 0 && styleIdx < model.Styles.CellXfs.Count ? model.Styles.CellXfs[styleIdx] : null;
        int id = xf?.NumFmtId ?? 0;
        return model.Styles.NumFmts.TryGetValue(id, out var custom)
            ? custom
            : Format.BuiltinFormatCode(id, loc) ?? "General";
    }

    /// <summary>Classifica a célula em valor tipado (para ODS/XML2003).</summary>
    public static TypedValue GetTypedValue(Cell? cell, SheetModel model, FormatLocale loc)
    {
        if (cell is null) return new TypedValue { Kind = "empty" };
        string? formula = cell.Formula;
        if (cell.Type == "s" && cell.Value is not null)
        {
            int idx = JsNumber.ParseIntOr(cell.Value, -1);
            var ss = idx >= 0 && idx < model.SharedStrings.Count ? model.SharedStrings[idx] : null;
            string str = ss?.Text
                ?? (ss?.Runs is not null ? string.Concat(ss.Runs.Select(r => r.Text)) : "");
            return new TypedValue { Kind = "string", Str = str, Formula = formula };
        }
        if (cell.Type == "inlineStr")
        {
            string str = cell.InlineString?.Text
                ?? (cell.InlineString?.Runs is not null ? string.Concat(cell.InlineString.Runs.Select(r => r.Text)) : "");
            return new TypedValue { Kind = "string", Str = str, Formula = formula };
        }
        if (cell.Type == "b") return new TypedValue { Kind = "boolean", Bool = cell.Value == "1", Formula = formula };
        if (cell.Type == "e") return new TypedValue { Kind = "error", Str = cell.Value ?? "", Formula = formula };
        if (cell.Value is null) return new TypedValue { Kind = "empty", Formula = formula };
        if (cell.Type == "str") return new TypedValue { Kind = "string", Str = cell.Value, Formula = formula };
        double n = JsNumber.ParseFloat(cell.Value);
        if (double.IsNaN(n)) return new TypedValue { Kind = "string", Str = cell.Value, Formula = formula };
        string code = EffectiveCode(cell, model, loc);
        var dt = IsDateTimeCode(code);
        double serial = model.Workbook.Date1904 ? n + 1462 : n;
        if (dt.Date) return new TypedValue { Kind = "date", Num = n, Date = Format.SerialToDate(serial), Code = code, Formula = formula };
        if (dt.Time) return new TypedValue { Kind = "time", Num = n, Date = Format.SerialToDate(serial), Code = code, Formula = formula };
        return new TypedValue { Kind = "number", Num = n, Code = code, Formula = formula };
    }

    private static string P2(long x) => x.ToString(System.Globalization.CultureInfo.InvariantCulture).PadLeft(2, '0');

    /// <summary>Date → "YYYY-MM-DD" (UTC).</summary>
    public static string IsoDate(DateTime d) =>
        $"{d.Year.ToString(System.Globalization.CultureInfo.InvariantCulture)}-{P2(d.Month)}-{P2(d.Day)}";

    /// <summary>Date → "YYYY-MM-DDTHH:MM:SS".</summary>
    public static string IsoDateTime(DateTime d) =>
        $"{IsoDate(d)}T{P2(d.Hour)}:{P2(d.Minute)}:{P2(d.Second)}";

    /// <summary>Fração de dia → duração ISO "PTxxHxxMxxS" (office:time-value do ODS).</summary>
    public static string IsoDuration(double serial)
    {
        double mod = serial % 1;
        double frac = mod < 0 ? 1 + mod : mod;
        long totalSec = (long)JsNumber.Round(frac * 86400);
        long h = totalSec / 3600 + (long)Math.Floor(serial) * 24;
        long m = totalSec % 3600 / 60;
        long s = totalSec % 60;
        return $"PT{P2(h)}H{P2(m)}M{P2(s)}S";
    }
}
