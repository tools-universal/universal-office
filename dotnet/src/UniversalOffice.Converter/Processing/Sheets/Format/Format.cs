using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using UniversalOffice.Converter.Processing.Sheets.Core;

namespace UniversalOffice.Converter.Processing.Sheets.Xlsx;

/// <summary>Locale de exibição do motor de formatação (espelho de FormatLocale do JS).</summary>
public sealed class FormatLocale
{
    public required string Decimal { get; init; }
    public required string Group { get; init; }
    public required string[] MonthsShort { get; init; }
    public required string[] MonthsLong { get; init; }
    public required string[] DaysShort { get; init; }
    public required string[] DaysLong { get; init; }
    public required string[] Ampm { get; init; }
    /// <summary>Overrides dos builtins dependentes de locale (ids 14–22).</summary>
    public Dictionary<int, string>? Builtins { get; init; }
}

public readonly record struct FormatResult(string Text, string? Color);

public sealed class FormatOptions
{
    public FormatLocale? Locale { get; init; }
    /// <summary>Largura da coluna em caracteres — habilita o preenchimento `*x`.</summary>
    public int? ColWidthChars { get; init; }
    /// <summary>Sistema de data 1904 (Mac legacy): epoch em 1904-01-01 (serial +1462).</summary>
    public bool Date1904 { get; init; }
}

/// <summary>
/// Motor de formatação numérica/data fiel ao oráculo (numFmt formatCode) —
/// PORTA FIEL de sheet/packages/sheet-core/src/format.ts. Cada regra é fixada
/// pelo oráculo real (Excel 16.0 pt-BR) em tools/excel-lab/results/oracle-format.json.
/// </summary>
public static class Format
{
    /// <summary>Locale padrão pt-BR (o app de referência usa nomes minúsculos).</summary>
    public static readonly FormatLocale PtBr = new()
    {
        Decimal = ",",
        Group = ".",
        MonthsShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
        MonthsLong = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
        DaysShort = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
        DaysLong = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
        Ampm = ["AM", "PM"],
        // Oráculo COM 2026-07-01 (builtin-probe.xlsx)
        Builtins = new()
        {
            [14] = "dd/mm/yyyy", [15] = "dd/mmm/yy", [16] = "dd/mmm", [17] = "mmm/yy",
            [20] = "hh:mm", [21] = "hh:mm:ss", [22] = "dd/mm/yyyy hh:mm",
        },
    };

    /// <summary>Built-ins (numFmtId → formatCode) presentes em todo styles.xml.</summary>
    public static readonly Dictionary<int, string> BuiltinFormats = new()
    {
        [0] = "General", [1] = "0", [2] = "0.00", [3] = "#,##0", [4] = "#,##0.00",
        [5] = "\"$\"#,##0_);(\"$\"#,##0)", [6] = "\"$\"#,##0_);[Red](\"$\"#,##0)",
        [7] = "\"$\"#,##0.00_);(\"$\"#,##0.00)", [8] = "\"$\"#,##0.00_);[Red](\"$\"#,##0.00)",
        [9] = "0%", [10] = "0.00%", [11] = "0.00E+00", [12] = "# ?/?", [13] = "# ??/??",
        [14] = "m/d/yyyy", [15] = "d-mmm-yy", [16] = "d-mmm", [17] = "mmm-yy",
        [18] = "h:mm AM/PM", [19] = "h:mm:ss AM/PM", [20] = "h:mm", [21] = "h:mm:ss",
        [22] = "m/d/yyyy h:mm",
        [37] = "#,##0_);(#,##0)", [38] = "#,##0_);[Red](#,##0)",
        [39] = "#,##0.00_);(#,##0.00)", [40] = "#,##0.00_);[Red](#,##0.00)",
        [45] = "mm:ss", [46] = "[h]:mm:ss", [47] = "mm:ss.0", [48] = "##0.0E+0", [49] = "@",
    };

    /// <summary>Resolve o formatCode de um numFmtId builtin honrando o locale (ids 14–22).</summary>
    public static string? BuiltinFormatCode(int id, FormatLocale? locale = null)
    {
        locale ??= PtBr;
        if (locale.Builtins is not null && locale.Builtins.TryGetValue(id, out var code)) return code;
        return BuiltinFormats.TryGetValue(id, out var b) ? b : null;
    }

    private static readonly Dictionary<string, string> ColorNames = new(StringComparer.Ordinal)
    {
        ["black"] = "#000000", ["blue"] = "#0000FF", ["cyan"] = "#00FFFF", ["green"] = "#008000",
        ["magenta"] = "#FF00FF", ["red"] = "#FF0000", ["white"] = "#FFFFFF", ["yellow"] = "#FFFF00",
    };

    /// <summary>Arredonda `a` para `d` casas como o Excel (metade para longe de zero).</summary>
    private static double ExcelRound(double a, int d)
    {
        if (!double.IsFinite(a) || a == 0) return a;
        bool neg = a < 0;
        double f = Math.Pow(10, d);
        // toPrecision(15) remove o ruído binário (0.005*100 = 0.5000…01 → 0.5)
        double scaled = JsNumber.RoundToSigDigits(Math.Abs(a) * f, 15);
        return (neg ? -1 : 1) * JsNumber.Round(scaled) / f;
    }

    /// <summary>Insere separador de milhar em uma string de dígitos inteiros (sem sinal).</summary>
    private static string GroupInt(string digits, string sep)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < digits.Length; i++)
        {
            if (i > 0 && (digits.Length - i) % 3 == 0) sb.Append(sep);
            sb.Append(digits[i]);
        }
        return sb.ToString();
    }

    // ──────────────────────────── General ────────────────────────────

    /// <summary>Formato General: cabe em ~11 caracteres; estoura para científico.</summary>
    public static string FormatGeneral(double x, FormatLocale? loc = null)
    {
        loc ??= PtBr;
        if (x == 0) return "0";
        if (!double.IsFinite(x)) return "";
        bool neg = x < 0;
        double a = Math.Abs(x);
        const int BUDGET = 11; // caracteres da parte numérica (separador conta, sinal não)
        int intLen = a >= 1 ? (int)Math.Floor(Math.Log10(a)) + 1 : 1;

        string body;
        if (intLen > BUDGET) body = SciGeneral(a, loc, BUDGET);
        else
        {
            int avail = BUDGET - intLen;
            int decimals = avail > 1 ? avail - 1 : 0;
            double rounded = ExcelRound(a, decimals);
            string s = JsNumber.ToFixed(rounded, decimals);
            if (s.Contains('.')) { s = s.TrimEnd('0'); if (s.EndsWith('.')) s = s[..^1]; }
            if (decimals > 0 && (s == "0" || s == ""))
                body = SciGeneral(a, loc, BUDGET); // decimal arredondou a zero
            else
                body = s.Replace(".", loc.Decimal);
        }
        return neg ? "-" + body : body;
    }

    private static string SciGeneral(double a, FormatLocale loc, int budget)
    {
        long e = (long)Math.Floor(Math.Log10(a));
        double mant = a / Math.Pow(10, e);
        int expDigits = Math.Max(2, Math.Abs(e).ToString(CultureInfo.InvariantCulture).Length);
        string expStr = "E" + (e < 0 ? "-" : "+") + Math.Abs(e).ToString(CultureInfo.InvariantCulture).PadLeft(expDigits, '0');
        int mantDecimals = Math.Max(0, budget - expStr.Length - 2);
        string m = JsNumber.ToFixed(mant, mantDecimals);
        if (JsNumber.ParseFloat(m) >= 10)
        {
            e += 1;
            mant = a / Math.Pow(10, e);
            int ed = Math.Max(2, Math.Abs(e).ToString(CultureInfo.InvariantCulture).Length);
            expStr = "E" + (e < 0 ? "-" : "+") + Math.Abs(e).ToString(CultureInfo.InvariantCulture).PadLeft(ed, '0');
            mantDecimals = Math.Max(0, budget - expStr.Length - 2);
            m = JsNumber.ToFixed(mant, mantDecimals);
        }
        if (m.Contains('.')) { m = m.TrimEnd('0'); if (m.EndsWith('.')) m = m[..^1]; }
        return m.Replace(".", loc.Decimal) + expStr;
    }

    // ──────────────────────────── Seções ────────────────────────────

    /// <summary>Divide o formatCode em seções por `;` respeitando aspas/colchetes/escape.</summary>
    private static List<string> SplitSections(string code)
    {
        var outp = new List<string>();
        var cur = new StringBuilder();
        for (int i = 0; i < code.Length; i++)
        {
            char ch = code[i];
            if (ch == '"')
            {
                int end = code.IndexOf('"', i + 1);
                int j = end < 0 ? code.Length : end;
                cur.Append(code[i..Math.Min(j + 1, code.Length)]);
                i = j; continue;
            }
            if (ch == '[')
            {
                int end = code.IndexOf(']', i + 1);
                int j = end < 0 ? code.Length : end;
                cur.Append(code[i..Math.Min(j + 1, code.Length)]);
                i = j; continue;
            }
            if (ch == '\\')
            {
                cur.Append(code[i..Math.Min(i + 2, code.Length)]);
                i++; continue;
            }
            if (ch == ';') { outp.Add(cur.ToString()); cur.Clear(); continue; }
            cur.Append(ch);
        }
        outp.Add(cur.ToString());
        return outp;
    }

    /// <summary>Remove literais/escape/colchetes — sobra só a "gramática" da seção.</summary>
    private static string StripDecor(string section)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < section.Length; i++)
        {
            char ch = section[i];
            if (ch == '"') { int end = section.IndexOf('"', i + 1); i = end < 0 ? section.Length : end; continue; }
            if (ch == '[') { int end = section.IndexOf(']', i + 1); i = end < 0 ? section.Length : end; continue; }
            if (ch == '\\') { i++; continue; }
            if (ch == '_') { i++; continue; }
            sb.Append(ch);
        }
        return sb.ToString();
    }

    private static readonly Regex ElapsedRe = new(@"\[(hh?|mm?|ss?)\]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex AmPmRe = new(@"AM/PM", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex ApRe = new(@"A/P", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex YmdhsRe = new(@"[ymdhs]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static bool IsDateSection(string section)
    {
        if (ElapsedRe.IsMatch(section)) return true;
        string bare = ApRe.Replace(AmPmRe.Replace(StripDecor(section), ""), "");
        return YmdhsRe.IsMatch(bare);
    }

    // ──────────────────────────── Entrada ────────────────────────────

    /// <summary>Formata um valor de célula TEXTO segundo o formatCode OOXML.</summary>
    public static FormatResult FormatValue(string value, string? code, FormatOptions? opts = null)
    {
        if (string.IsNullOrEmpty(code) || code == "General") return new FormatResult(value, null);
        var sections = SplitSections(code);
        // Texto: usa a 4ª seção se existir; senão devolve cru.
        if (sections.Count > 3 && sections[3].Contains('@')) return ApplyTextSection(sections[3], value);
        return new FormatResult(value, null);
    }

    /// <summary>Formata um valor de célula NUMÉRICO/data segundo o formatCode OOXML.</summary>
    public static FormatResult FormatValue(double value, string? code, FormatOptions? opts = null)
    {
        opts ??= new FormatOptions();
        var loc = opts.Locale ?? PtBr;

        if (string.IsNullOrEmpty(code) || code == "General")
            return new FormatResult(FormatGeneral(value, loc), null);

        var sections = SplitSections(code);
        double num = value;
        string section;
        bool useAbs = false;
        if (num > 0) section = sections[0];
        else if (num < 0)
        {
            if (sections.Count >= 2) { section = sections[1]; useAbs = true; }
            else section = sections[0]; // 1 seção → sinal automático
        }
        else section = sections.Count >= 3 ? sections[2] : sections[0];

        var (color, body) = ExtractColor(section);
        double magnitude = useAbs ? Math.Abs(num) : num;

        if (IsDateSection(body))
            return new FormatResult(FormatDateSection(magnitude, body, loc, opts.Date1904), color);

        bool autoNeg = num < 0 && sections.Count < 2;
        string r = FormatNumberSection(Math.Abs(num), body, loc, opts);
        return new FormatResult((autoNeg ? "-" : "") + r, color);
    }

    private static FormatResult ApplyTextSection(string section, string text)
    {
        var (color, body) = ExtractColor(section);
        var sb = new StringBuilder();
        for (int i = 0; i < body.Length; i++)
        {
            char ch = body[i];
            if (ch == '"')
            {
                int end = body.IndexOf('"', i + 1);
                int j = end < 0 ? body.Length : end;
                sb.Append(body[(i + 1)..j]);
                i = j; continue;
            }
            if (ch == '\\') { if (i + 1 < body.Length) sb.Append(body[i + 1]); i++; continue; }
            if (ch == '@') { sb.Append(text); continue; }
            if (ch == '_') { sb.Append(' '); i++; continue; }
            if (ch == '*') { i++; continue; }
            sb.Append(ch);
        }
        return new FormatResult(sb.ToString(), color);
    }

    private static readonly Regex ElapsedInnerRe = new(@"^(hh?|mm?|ss?)$", RegexOptions.CultureInvariant);
    private static readonly Regex ColorNRe = new(@"^color\s*\d+$", RegexOptions.CultureInvariant);

    /// <summary>Extrai a 1ª cor `[Red]`/`[Color12]` e remove TODOS os colchetes não-decorridos.</summary>
    private static (string? Color, string Body) ExtractColor(string section)
    {
        string? color = null;
        var body = new StringBuilder();
        for (int i = 0; i < section.Length; i++)
        {
            char ch = section[i];
            if (ch == '[')
            {
                int end = section.IndexOf(']', i + 1);
                int j = end < 0 ? section.Length : end;
                string inner = section[(i + 1)..j];
                string low = inner.ToLowerInvariant();
                if (ElapsedInnerRe.IsMatch(low))
                {
                    body.Append(section[i..Math.Min(j + 1, section.Length)]);
                    i = j; continue; // tempo decorrido: preserva
                }
                if (ColorNames.TryGetValue(low, out var named) && color is null) color = named;
                else if (ColorNRe.IsMatch(low) && color is null) color = "#000000";
                i = j; continue;
            }
            body.Append(ch);
        }
        return (color, body.ToString());
    }

    // ──────────────────────── Seção numérica ────────────────────────

    private static readonly Regex FractionRe1 = new(@"[?#0]+\s*/\s*[?#0]+", RegexOptions.CultureInvariant);
    private static readonly Regex FractionRe2 = new(@"/[?#0]", RegexOptions.CultureInvariant);
    private static readonly Regex SciTokenRe = new(@"[eE][+-]", RegexOptions.CultureInvariant);
    private static readonly Regex NumSpecRe = new(@"[#0?][#0?,.%]*", RegexOptions.CultureInvariant);
    private static readonly Regex TrailingCommasRe = new(@",+$", RegexOptions.CultureInvariant);
    private static readonly Regex NonPlaceholderRe = new(@"[^0#?]", RegexOptions.CultureInvariant);
    private static readonly Regex GroupedRe = new(@"[#0?],[#0?]", RegexOptions.CultureInvariant);

    private static string FormatNumberSection(double a, string section, FormatLocale loc, FormatOptions opts)
    {
        // `@` numa seção numérica = valor como texto (representação General).
        if (section.Contains('@')) return ApplyTextSection(section, FormatGeneral(a, loc)).Text;
        // Fração: "?/?" ou "0/0".
        if (FractionRe1.IsMatch(section) || FractionRe2.IsMatch(section))
            return FormatFraction(a, section, loc);
        // Notação científica: token E+/E-.
        if (SciTokenRe.IsMatch(section))
            return FormatScientificSection(a, section, loc);

        var specMatch = NumSpecRe.Match(section);
        string numSpec = specMatch.Success ? specMatch.Value : "";
        // Seção só-literal — sem placeholder numérico: não injeta número.
        if (numSpec.Length == 0) return EmitSection(section, "", "", opts);

        double scaled = a;
        int pctCount = numSpec.Count(c => c == '%');
        if (pctCount > 0) scaled *= Math.Pow(100, pctCount);
        string intSpecRaw = numSpec.Split('.')[0];
        var tcm = TrailingCommasRe.Match(intSpecRaw);
        int trailingCommas = tcm.Success ? tcm.Value.Length : 0;
        if (trailingCommas > 0) scaled /= Math.Pow(1000, trailingCommas);

        int dotIdx = numSpec.IndexOf('.');
        string fracSpec = dotIdx >= 0 ? NonPlaceholderRe.Replace(numSpec[(dotIdx + 1)..], "") : "";
        string intSpec = NonPlaceholderRe.Replace(dotIdx >= 0 ? numSpec[..dotIdx] : numSpec, "");
        bool grouped = GroupedRe.IsMatch(numSpec.Split('.')[0]);

        int decimals = fracSpec.Length;
        double rounded = ExcelRound(scaled, decimals);
        string fixedStr = JsNumber.ToFixed(rounded, decimals);
        string[] fixedParts = fixedStr.Split('.');
        string intDigits = fixedParts[0].Replace("-", "");
        string? fracDigits = fixedParts.Length > 1 ? fixedParts[1] : null;

        int minInt = intSpec.Count(c => c == '0');
        string intOut = intDigits.TrimStart('0');
        if (intOut.Length < minInt) intOut = intOut.PadLeft(minInt, '0');
        if (intOut == "" && (minInt > 0 || decimals == 0)) intOut = "0";
        if (grouped && intOut != "") intOut = GroupInt(intOut, loc.Group);

        string fracOut = "";
        if (decimals > 0)
        {
            string fd = (fracDigits ?? "").PadRight(decimals, '0');
            var chars = new LinkedList<char>();
            bool sigAfter = false;
            for (int i = decimals - 1; i >= 0; i--)
            {
                char ph = i < fracSpec.Length ? fracSpec[i] : '#';
                char dig = i < fd.Length ? fd[i] : '0';
                if (dig != '0') { chars.AddFirst(dig); sigAfter = true; }
                else if (ph == '0') chars.AddFirst('0');
                else if (ph == '?') chars.AddFirst(' ');
                else { if (sigAfter) chars.AddFirst('0'); } // '#': zero insignificante suprimido
            }
            fracOut = new string(chars.ToArray());
        }

        string numberText = intOut + (fracOut != "" || (decimals > 0 && fracSpec.Contains('0'))
            ? loc.Decimal + fracOut : "");
        if (pctCount > 0) numberText += new string('%', pctCount);

        return EmitSection(section, numSpec, numberText, opts);
    }

    /// <summary>Caminha pela seção emitindo literais e injetando o número no lugar do spec.</summary>
    private static string EmitSection(string section, string numSpec, string numberText, FormatOptions opts)
    {
        var sb = new StringBuilder();
        bool emitted = false;
        for (int i = 0; i < section.Length; i++)
        {
            char ch = section[i];
            if (!emitted && numSpec.Length > 0 && StartsWithAt(section, numSpec, i))
            {
                sb.Append(numberText);
                i += numSpec.Length - 1;
                emitted = true;
                continue;
            }
            if (ch == '"')
            {
                int end = section.IndexOf('"', i + 1);
                int j = end < 0 ? section.Length : end;
                sb.Append(section[(i + 1)..j]);
                i = j; continue;
            }
            if (ch == '\\') { if (i + 1 < section.Length) sb.Append(section[i + 1]); i++; continue; }
            if (ch == '_') { sb.Append(' '); i++; continue; }
            if (ch == '*')
            {
                char fill = i + 1 < section.Length ? section[i + 1] : ' ';
                int reps = opts.ColWidthChars is int w ? Math.Max(0, w - sb.Length) : 1;
                sb.Append(fill, reps);
                i++; continue;
            }
            if ("#0?,.%".Contains(ch)) continue; // restos do spec já consumidos
            if (ch == '[') { int end = section.IndexOf(']', i + 1); i = end < 0 ? section.Length : end; continue; }
            sb.Append(ch);
        }
        if (!emitted && numberText != "") sb.Append(numberText);
        return sb.ToString();
    }

    private static bool StartsWithAt(string s, string token, int at) =>
        at + token.Length <= s.Length && string.CompareOrdinal(s, at, token, 0, token.Length) == 0;

    private static readonly Regex SciSpecRe = new(@"([#0?][#0?,]*(?:\.[#0?]*)?)?[eE]([+-])([0#]+)", RegexOptions.CultureInvariant);

    private static string FormatScientificSection(double a, string section, FormatLocale loc)
    {
        var m = SciSpecRe.Match(section);
        if (!m.Success) return FormatGeneral(a, loc);
        string mantSpec = m.Groups[1].Success ? m.Groups[1].Value : "0";
        string sign = m.Groups[2].Value;
        string expSpec = m.Groups[3].Success ? m.Groups[3].Value : "0";
        string[] mantParts = mantSpec.Split('.');
        int mantDecimals = NonPlaceholderRe.Replace(mantParts.Length > 1 ? mantParts[1] : "", "").Length;
        string mantInt = NonPlaceholderRe.Replace(mantParts[0].Length > 0 ? mantParts[0] : "0", "");
        int intDigits = Math.Max(1, mantInt.Length); // #,000E+00 → engenharia
        int minInt = mantInt.Count(c => c == '0');

        string PadInt(string s)
        {
            bool neg = s.StartsWith('-');
            string body = s.Replace("-", "");
            string[] parts = body.Split('.');
            string ip = parts[0];
            string? fp = parts.Length > 1 ? parts[1] : null;
            string padded = ip.Length < minInt ? ip.PadLeft(minInt, '0') : ip;
            return (neg ? "-" : "") + padded + (fp is not null ? "." + fp : "");
        }

        if (a == 0)
        {
            string mant0 = PadInt(JsNumber.ToFixed(0, mantDecimals)).Replace(".", loc.Decimal);
            return $"{mant0}E+{new string('0', 0).PadLeft(0)}{"0".PadLeft(expSpec.Length, '0')}";
        }
        long e = (long)Math.Floor(Math.Log10(Math.Abs(a)));
        long e2 = intDigits > 1 ? (long)Math.Floor((double)e / intDigits) * intDigits : e;
        double mant = a / Math.Pow(10, e2);
        string mantStr = JsNumber.ToFixed(ExcelRound(mant, mantDecimals), mantDecimals);
        if (Math.Abs(JsNumber.ParseFloat(mantStr)) >= Math.Pow(10, intDigits))
        {
            e2 += intDigits;
            mant = a / Math.Pow(10, e2);
            mantStr = JsNumber.ToFixed(ExcelRound(mant, mantDecimals), mantDecimals);
        }
        int zeroCount = expSpec.Count(c => c == '0');
        int expDigits = zeroCount != 0 ? zeroCount : expSpec.Length;
        string expOut = Math.Abs(e2).ToString(CultureInfo.InvariantCulture).PadLeft(expDigits, '0');
        string expSign = e2 < 0 ? "-" : "+";
        return $"{PadInt(mantStr).Replace(".", loc.Decimal)}E{expSign}{expOut}";
    }

    private static readonly Regex FracSpecRe = new(@"([#0?]+)\s*/\s*([#0?]+|\d+)", RegexOptions.CultureInvariant);
    private static readonly Regex AllDigitsRe = new(@"^\d+$", RegexOptions.CultureInvariant);
    private static readonly Regex IntPhRe = new(@"^([#0?,]+)", RegexOptions.CultureInvariant);
    private static readonly Regex AnyPhRe = new(@"[#0?]", RegexOptions.CultureInvariant);

    /// <summary>Aproxima `a` por fração com denominador limitado (Stern-Brocot).</summary>
    private static string FormatFraction(double a, string section, FormatLocale loc)
    {
        var m = FracSpecRe.Match(section);
        if (!m.Success) return FormatGeneral(a, loc);
        string numPh = m.Groups[1].Value;
        string denPh = m.Groups[2].Value;
        double whole = Math.Floor(a);
        double frac = a - whole;
        int fixedDen = AllDigitsRe.IsMatch(denPh) ? JsNumber.ParseIntOr(denPh, 0) : 0;
        double maxDen = fixedDen != 0 ? fixedDen : Math.Pow(10, denPh.Length) - 1;

        long bestN = 0, bestD = 1;
        double bestErr = double.PositiveInfinity;
        if (fixedDen != 0)
        {
            bestD = fixedDen;
            bestN = (long)JsNumber.Round(frac * fixedDen);
            bestErr = 0;
        }
        else
        {
            long[] lo = [0, 1];
            long[] hi = [1, 1];
            for (int it = 0; it < 64; it++)
            {
                long[] med = [lo[0] + hi[0], lo[1] + hi[1]];
                if (med[1] > maxDen) break;
                double val = (double)med[0] / med[1];
                if (Math.Abs(val - frac) < bestErr) { bestErr = Math.Abs(val - frac); bestN = med[0]; bestD = med[1]; }
                if (val < frac) lo = med; else hi = med;
            }
            foreach (var cand in new[] { lo, hi })
            {
                if (cand[1] <= maxDen)
                {
                    double err = Math.Abs((double)cand[0] / cand[1] - frac);
                    if (err < bestErr) { bestErr = err; bestN = cand[0]; bestD = cand[1]; }
                }
            }
        }
        double wholeOut = whole;
        if (bestN >= bestD && bestD > 0) { wholeOut += Math.Floor((double)bestN / bestD); bestN %= bestD; }

        var intPhM = IntPhRe.Match(section);
        string intPh = intPhM.Success ? intPhM.Groups[1].Value : "";
        bool hasWholePh = AnyPhRe.IsMatch(intPh) || section.Contains(' ');
        if (bestN == 0) return JsDoubleIntString(wholeOut);
        string numStr = bestN.ToString(CultureInfo.InvariantCulture).PadLeft(numPh.Length, ' ');
        string denStr = (fixedDen != 0 ? fixedDen.ToString(CultureInfo.InvariantCulture) : bestD.ToString(CultureInfo.InvariantCulture)).PadRight(denPh.Length, ' ');
        string wholeStr = wholeOut == 0 ? "" : JsDoubleIntString(wholeOut);
        string sep = section.Contains(' ') ? " " : "";
        return $"{wholeStr}{sep}{numStr}/{denStr}";
    }

    /// <summary>String(x) para doubles com valor inteiro (frações/datas).</summary>
    private static string JsDoubleIntString(double x) => JsNumber.ToString(x);

    // ──────────────────────── Seção data/hora ────────────────────────

    private static readonly DateTime Epoch1899 = new(1899, 12, 30, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>
    /// Serial OLE (dias desde 1899-12-30) → DateTime UTC.
    /// Seriais fora do domínio representável são SATURADOS em
    /// DateTime.Min/MaxValue — o JS degrada para texto inválido sem lançar;
    /// aqui nunca lançamos nem deixamos o cast de long estourar em silêncio
    /// (achado da revisão: fuzz com serial ±1e12 crashava/produzia data falsa).
    /// </summary>
    public static DateTime SerialToDate(double serial)
    {
        double ms = JsNumber.Round(serial * 86400000);
        double ticks = ms * 10000.0;
        double min = (DateTime.MinValue - Epoch1899).Ticks;
        double max = (DateTime.MaxValue - Epoch1899).Ticks;
        if (double.IsNaN(ticks)) return Epoch1899;
        if (ticks <= min) return DateTime.MinValue;
        if (ticks >= max) return DateTime.MaxValue;
        return Epoch1899.AddTicks((long)ticks);
    }

    private static string FormatDateSection(double serial, string code, FormatLocale loc, bool date1904)
    {
        var d = SerialToDate(date1904 ? serial + 1462 : serial);
        int yr = d.Year, mo = d.Month - 1, day = d.Day, wd = (int)d.DayOfWeek;
        int h24 = d.Hour, min = d.Minute, sec = d.Second;
        bool has12 = AmPmRe.IsMatch(code) || ApRe.IsMatch(code);
        int h12 = h24 % 12 == 0 ? 12 : h24 % 12;

        var sb = new StringBuilder();
        bool prevTime = false;
        for (int i = 0; i < code.Length; i++)
        {
            char ch = code[i];
            if (ch == '"')
            {
                int end = code.IndexOf('"', i + 1);
                int j = end < 0 ? code.Length : end;
                sb.Append(code[(i + 1)..j]);
                i = j; continue;
            }
            if (ch == '\\') { if (i + 1 < code.Length) sb.Append(code[i + 1]); i++; continue; }
            if (ch == '[')
            {
                int end = code.IndexOf(']', i + 1);
                int j = end < 0 ? code.Length : end;
                string inner = code[(i + 1)..j].ToLowerInvariant();
                i = j;
                if (inner.Length > 0 && inner[0] == 'h')
                    sb.Append(((long)Math.Floor(serial * 24)).ToString(CultureInfo.InvariantCulture).PadLeft(inner.Length, '0'));
                else if (inner.Length > 0 && inner[0] == 'm')
                    sb.Append(((long)Math.Floor(serial * 1440)).ToString(CultureInfo.InvariantCulture).PadLeft(inner.Length, '0'));
                else if (inner.Length > 0 && inner[0] == 's')
                    sb.Append(((long)Math.Floor(serial * 86400)).ToString(CultureInfo.InvariantCulture).PadLeft(inner.Length, '0'));
                prevTime = true;
                continue;
            }
            if (i + 5 <= code.Length && string.Equals(code.Substring(i, 5), "AM/PM", StringComparison.OrdinalIgnoreCase))
            {
                sb.Append(h24 < 12 ? loc.Ampm[0] : loc.Ampm[1]);
                i += 4; prevTime = false; continue;
            }
            if (i + 3 <= code.Length && string.Equals(code.Substring(i, 3), "A/P", StringComparison.OrdinalIgnoreCase))
            {
                sb.Append((h24 < 12 ? loc.Ampm[0] : loc.Ampm[1])[..1]);
                i += 2; prevTime = false; continue;
            }
            char lower = char.ToLowerInvariant(ch);
            if (lower is 'y' or 'm' or 'd' or 'h' or 's')
            {
                int runLen = 0;
                while (i < code.Length && char.ToLowerInvariant(code[i]) == lower) { runLen++; i++; }
                i--;
                int L = runLen;
                if (lower == 'y')
                    sb.Append(L >= 3
                        ? yr.ToString(CultureInfo.InvariantCulture)
                        : Last2(yr).PadLeft(2, '0'));
                else if (lower == 'd')
                {
                    if (L >= 4) sb.Append(loc.DaysLong[wd]);
                    else if (L == 3) sb.Append(loc.DaysShort[wd]);
                    else sb.Append(L == 2 ? day.ToString(CultureInfo.InvariantCulture).PadLeft(2, '0') : day.ToString(CultureInfo.InvariantCulture));
                }
                else if (lower == 'h')
                {
                    int hv = has12 ? h12 : h24;
                    sb.Append(L >= 2 ? hv.ToString(CultureInfo.InvariantCulture).PadLeft(2, '0') : hv.ToString(CultureInfo.InvariantCulture));
                    prevTime = true;
                }
                else if (lower == 's')
                {
                    sb.Append(L >= 2 ? sec.ToString(CultureInfo.InvariantCulture).PadLeft(2, '0') : sec.ToString(CultureInfo.InvariantCulture));
                    prevTime = true;
                }
                else // 'm': minuto se vizinho de hora/segundo; senão mês
                {
                    bool isMinute = prevTime || NextIsSecond(code, i + 1);
                    if (isMinute)
                    {
                        sb.Append(L >= 2 ? min.ToString(CultureInfo.InvariantCulture).PadLeft(2, '0') : min.ToString(CultureInfo.InvariantCulture));
                        prevTime = false;
                    }
                    else if (L >= 4) sb.Append(loc.MonthsLong[mo]);
                    else if (L == 3) sb.Append(loc.MonthsShort[mo]);
                    else sb.Append(L == 2 ? (mo + 1).ToString(CultureInfo.InvariantCulture).PadLeft(2, '0') : (mo + 1).ToString(CultureInfo.InvariantCulture));
                }
                continue;
            }
            if (ch == '_') { sb.Append(' '); i++; continue; }
            if (ch == '*') { i++; continue; }
            sb.Append(ch);
        }
        return sb.ToString();
    }

    /// <summary>String(yr).slice(-2) do JS.</summary>
    private static string Last2(int yr)
    {
        string s = yr.ToString(CultureInfo.InvariantCulture);
        return s.Length <= 2 ? s : s[^2..];
    }

    private static readonly Regex NextSecondRe = new(@"^[\s:.]*s", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static bool NextIsSecond(string code, int from) =>
        from <= code.Length && NextSecondRe.IsMatch(code[Math.Min(from, code.Length)..]);
}
