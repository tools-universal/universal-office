using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Core;

namespace OfficeNext.Xlsx;

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
    /// <summary>Overrides dos builtins dependentes de locale (numFmtId sem &lt;numFmt&gt;).</summary>
    public Dictionary<int, string>? Builtins { get; init; }
    /// <summary>Data longa do sistema (<c>[$-F800]</c>) e hora do sistema (<c>[$-F400]</c>).</summary>
    public string? SysDate { get; init; }
    public string? SysTime { get; init; }
}

public readonly record struct FormatResult(string Text, string? Color);

public sealed class FormatOptions
{
    public FormatLocale? Locale { get; init; }
    /// <summary>Largura da coluna em caracteres — <c>*x</c> repete x até completá-la (sem ela, 1 vez).</summary>
    public int? ColWidthChars { get; init; }
    /// <summary>Sistema de data 1904 (Mac legacy): epoch em 1904-01-01 (serial +1462).</summary>
    public bool Date1904 { get; init; }
    /// <summary><c>&lt;sheetView showZeros="0"&gt;</c>: zero sem seção própria de zero sai vazio.</summary>
    public bool ShowZeros { get; init; } = true;
}

/// <summary>Pedaço do texto formatado (espelho de FmtPart do JS).</summary>
public abstract record FmtPart;
/// <summary>Texto literal/dígitos.</summary>
public sealed record TextPart(string S) : FmtPart;
/// <summary><c>_x</c>: espaço da largura de x.</summary>
public sealed record SkipPart(string Ch) : FmtPart;
/// <summary><c>*x</c>: repete x até preencher a coluna.</summary>
public sealed record FillPart(string Ch) : FmtPart;
/// <summary>Número no formato Geral (precisão pela largura da coluna).</summary>
public sealed record GeneralPart(double V) : FmtPart;

/// <summary>Resultado em partes: Overflow = sem seção aplicável/data fora da faixa ("####").</summary>
public sealed record FormatParts(List<FmtPart> Parts, string? Color, bool Overflow);

/// <summary>
/// Motor de formatação numérica/data fiel ao Excel (numFmt formatCode) — PORTA
/// FIEL de shared/charts/src/numfmt.ts: formatCode tokenizado (cache), seções
/// emitidas token a token (literais entre placeholders, 15 significativos,
/// vírgulas de grupo/escala, condições e sinal medidos, locale [$-409],
/// [$-F800]/[$-F400], hora arredondada ao segundo, bug de 1900, builtins pt-BR).
/// Regras medidas no Excel 365 pt-BR (Range.Text) — lab do Sheet.
/// </summary>
public static class Format
{
    /// <summary>Locale padrão pt-BR (o Excel pt-BR usa nomes minúsculos).</summary>
    public static readonly FormatLocale PtBr = new()
    {
        Decimal = ",",
        Group = ".",
        MonthsShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
        MonthsLong = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
        DaysShort = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
        DaysLong = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
        Ampm = ["AM", "PM"],
        // numFmtId builtin SEM <numFmt> → formato do locale (medido no Excel 365 pt-BR, lab e9)
        Builtins = new()
        {
            [5] = "\"R$ \"#,##0;\\-\"R$ \"#,##0", [6] = "\"R$ \"#,##0;[Red]\\-\"R$ \"#,##0",
            [7] = "\"R$ \"#,##0.00;\\-\"R$ \"#,##0.00", [8] = "\"R$ \"#,##0.00;[Red]\\-\"R$ \"#,##0.00",
            [14] = "dd/mm/yyyy", [15] = "dd/mmm/yy", [16] = "dd/mmm", [17] = "mmm/yy",
            [20] = "hh:mm", [21] = "hh:mm:ss", [22] = "dd/mm/yyyy hh:mm",
            [23] = "General", [24] = "General", [25] = "General", [26] = "General",
            [27] = "dd/mm/yyyy", [28] = "dd/mm/yyyy", [29] = "dd/mm/yyyy", [30] = "dd/mm/yyyy", [31] = "dd/mm/yyyy",
            [32] = "hh:mm:ss", [33] = "hh:mm:ss", [34] = "hh:mm:ss", [35] = "hh:mm:ss", [36] = "dd/mm/yyyy",
            [37] = "#,##0;\\-#,##0", [38] = "#,##0;[Red]\\-#,##0", [39] = "#,##0.00;\\-#,##0.00", [40] = "#,##0.00;[Red]\\-#,##0.00",
            [41] = "_-* #,##0_-;\\-* #,##0_-;_-* \"-\"_-;_-@_-",
            [42] = "_-\"R$ \"* #,##0_-;\\-\"R$ \"* #,##0_-;_-\"R$ \"* \"-\"_-;_-@_-",
            [43] = "_-* #,##0.00_-;\\-* #,##0.00_-;_-* \"-\"??_-;_-@_-",
            [44] = "_-\"R$ \"* #,##0.00_-;\\-\"R$ \"* #,##0.00_-;_-\"R$ \"* \"-\"??_-;_-@_-",
            [50] = "dd/mm/yyyy", [51] = "dd/mm/yyyy", [52] = "dd/mm/yyyy", [53] = "dd/mm/yyyy", [54] = "dd/mm/yyyy",
            [55] = "dd/mm/yyyy", [56] = "dd/mm/yyyy", [57] = "dd/mm/yyyy", [58] = "dd/mm/yyyy",
            [59] = "0", [60] = "0.00", [61] = "#,##0", [62] = "#,##0.00",
            [63] = "\"R$ \"#,##0;\\-\"R$ \"#,##0", [64] = "\"R$ \"#,##0;[Red]\\-\"R$ \"#,##0",
            [65] = "\"R$ \"#,##0.00;\\-\"R$ \"#,##0.00", [66] = "\"R$ \"#,##0.00;[Red]\\-\"R$ \"#,##0.00",
            [67] = "0%", [68] = "0.00%", [69] = "# ?/?", [70] = "# ??/??", [71] = "dd/mm/yyyy", [72] = "dd/mm/yyyy",
            [73] = "dd/mmm/yy", [74] = "dd/mmm", [75] = "mmm/yy", [76] = "hh:mm", [77] = "hh:mm:ss",
            [78] = "dd/mm/yyyy hh:mm", [79] = "mm:ss", [80] = "[h]:mm:ss", [81] = "mm:ss.0",
        },
        SysDate = "dddd, d\" de \"mmmm\" de \"yyyy",
        SysTime = "hh:mm:ss",
    };

    private sealed record LangNames(string[] MonthsShort, string[] MonthsLong, string[] DaysShort, string[] DaysLong, string[]? Ampm);

    private static string[] JaMonths() { var a = new string[12]; for (int i = 0; i < 12; i++) a[i] = (i + 1).ToString(CultureInfo.InvariantCulture) + "月"; return a; }

    /// <summary>Nomes de mês/dia por idioma primário do LCID (<c>[$-409]</c> → inglês). Medidos no Excel.</summary>
    private static readonly Dictionary<int, LangNames> Langs = new()
    {
        [0x09] = new(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], null),
        [0x0c] = new(["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
            ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
            ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
            ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"], null),
        [0x07] = new(["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
            ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
            ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"], null),
        [0x0a] = new(["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
            ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
            ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
            ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], null),
        [0x10] = new(["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
            ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
            ["dom", "lun", "mar", "mer", "gio", "ven", "sab"],
            ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"], null),
        [0x11] = new(JaMonths(), JaMonths(),
            ["日", "月", "火", "水", "木", "金", "土"],
            ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"], ["午前", "午後"]),
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

    /// <summary>Resolve o formatCode de um numFmtId builtin honrando o locale.</summary>
    public static string? BuiltinFormatCode(int id, FormatLocale? locale = null)
    {
        locale ??= PtBr;
        if (locale.Builtins is not null && locale.Builtins.TryGetValue(id, out var code)) return code;
        return BuiltinFormats.TryGetValue(id, out var b) ? b : null;
    }

    private static readonly Dictionary<string, string> ColorNames = new(StringComparer.Ordinal)
    {
        ["black"] = "#000000", ["blue"] = "#0000FF", ["cyan"] = "#00FFFF", ["green"] = "#00FF00",
        ["magenta"] = "#FF00FF", ["red"] = "#FF0000", ["white"] = "#FFFFFF", ["yellow"] = "#FFFF00",
    };

    /// <summary><c>[ColorN]</c> (1..56) = paleta indexada padrão do Excel (índices 8..63).</summary>
    private static readonly string[] ColorN =
    [
        "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "800000", "008000", "000080", "808000",
        "800080", "008080", "C0C0C0", "808080", "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
        "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF", "00CCFF", "CCFFFF", "CCFFCC", "FFFF99",
        "99CCFF", "FF99CC", "CC99FF", "FFCC99", "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696",
        "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333",
    ];

    private static string Itos(long v) => v.ToString(CultureInfo.InvariantCulture);

    // ──────────────────────────── Dígitos ────────────────────────────

    /// <summary>
    /// Dígitos de v (≥ 0) com nFrac casas, como o Excel: só 15 algarismos
    /// significativos e arredondamento decimal "metade para longe de zero".
    /// Parte inteira SEM zeros à esquerda ("" para 0), fracionária com nFrac dígitos.
    /// </summary>
    public static (string Int, string Frac) DecimalDigits(double v, int nFrac)
    {
        if (!(v > 0) || !double.IsFinite(v)) return ("", new string('0', nFrac));
        var (digits, point) = JsNumber.PrecisionDigits(v, 15);
        int cut = point + nFrac;
        if (cut < 0) return ("", new string('0', nFrac));
        if (cut < digits.Length)
        {
            bool up = digits[cut] >= '5';
            digits = digits[..cut];
            if (up)
            {
                var arr = digits.ToCharArray();
                int i = arr.Length - 1;
                while (i >= 0 && arr[i] == '9') { arr[i] = '0'; i--; }
                if (i >= 0) { arr[i] = (char)(arr[i] + 1); digits = new string(arr); }
                else { digits = "1" + new string(arr); point++; }
            }
        }
        int total = point + nFrac;
        if (digits.Length < total) digits = digits.PadRight(total, '0');
        string intStr, fracStr;
        if (point > 0)
        {
            intStr = digits[..point];
            fracStr = digits.Substring(point, Math.Min(nFrac, Math.Max(0, digits.Length - point)));
        }
        else
        {
            intStr = "";
            string f = new string('0', -point) + digits;
            fracStr = f[..Math.Min(nFrac, f.Length)];
        }
        intStr = intStr.TrimStart('0');
        return (intStr, fracStr.PadRight(nFrac, '0'));
    }

    // ──────────────────────────── General ────────────────────────────

    /// <summary>
    /// Formato Geral com <paramref name="budget"/> caracteres (sinal não conta; 11 numa
    /// coluna larga). Devolve "" quando nem o científico mínimo cabe.
    /// </summary>
    public static string FormatGeneral(double x, FormatLocale? loc = null, int budget = 11)
    {
        loc ??= PtBr;
        if (x == 0) return "0";
        if (!double.IsFinite(x)) return "";
        bool neg = x < 0;
        string body = GeneralBody(Math.Abs(x), loc, budget);
        return body == "" ? "" : (neg ? "-" : "") + body;
    }

    private static string GeneralBody(double a, FormatLocale loc, int budget)
    {
        var (ip, _) = DecimalDigits(a, 0);
        int intLen = Math.Max(1, ip.Length);
        if (intLen > budget) return SciGeneral(a, loc, budget);
        int avail = budget - intLen;
        int decimals = avail > 1 ? avail - 1 : 0;
        var (i, f) = DecimalDigits(a, decimals);
        string frac = f.TrimEnd('0');
        if ((i == "" || i == "0") && frac == "")
        {
            string sci0 = SciGeneral(a, loc, budget);
            return sci0 != "" ? sci0 : "0";
        }
        if (i.Length > budget) return SciGeneral(a, loc, budget);
        string dec = (i == "" ? "0" : i) + (frac != "" ? loc.Decimal + frac : "");
        if (a < 1)
        {
            // coluna estreita: o científico vence se representa o valor MELHOR
            string sci = SciGeneral(a, loc, budget);
            if (sci != "")
            {
                double Err(string s) => Math.Abs(JsNumber.ParseFloat(s.Replace(loc.Decimal, ".")) - a);
                double es = Err(sci), ed = Err(dec);
                if (es < ed * (1 - 1e-9) || (a < 1e-4 && ed > a * 1e-12 && es <= ed * (1 + 1e-9))) return sci;
            }
        }
        return dec;
    }

    private static string SciGeneral(double a, FormatLocale loc, int budget)
    {
        int e = (int)Math.Floor(Math.Log10(a));
        for (int pass = 0; pass < 2; pass++)
        {
            string expStr = "E" + (e < 0 ? "-" : "+") + Itos(Math.Abs(e)).PadLeft(2, '0');
            int room = budget - expStr.Length;
            if (room < 1) return "";
            int dec = room >= 3 ? room - 2 : 0;
            var (i, f) = DecimalDigits(a / Math.Pow(10, e), dec);
            if (i.Length > 1) { e++; continue; }
            string frac = f.TrimEnd('0');
            return (i == "" ? "0" : i) + (frac != "" ? loc.Decimal + frac : "") + expStr;
        }
        return "";
    }

    // ──────────────────────────── Parse ────────────────────────────

    private enum K { Lit, Dig, Pt, Comma, Pct, Slash, At, Gen, Exp, Skip, Fill, Dt, El, AmPm, Subsec }

    private sealed class Tok
    {
        public K K;
        public string S = "";      // Lit / Skip / Fill (caractere)
        public char C;             // Dig: 0 # ?; Dt: y M m d h s e g b a; El: h m s
        public int N;              // Dt/El/Subsec: repetições
        public bool Plus;          // Exp
        public bool Full, Lower;   // AmPm
        public static Tok Lit_(string s) => new() { K = K.Lit, S = s };
    }

    private sealed record Cond(string Op, double V);

    private sealed class Section
    {
        public List<Tok> Toks = [];
        public Cond? Cond;
        public string? Color;
        public int? Lcid;
        public string Kind = "lit"; // num | date | gen | text | lit | empty
        public double Scale = 1;
        public bool Group;
        public int NInt, NFrac;
        public bool Exp;
        public FracInfo? Frac;
    }

    private sealed record FracInfo(List<int> NumIdx, List<int> DenIdx, int FixedDen, List<int> IntIdx);

    private sealed class Parsed
    {
        public List<Section> Secs = [];
        public Section? Text;
        public List<Section> Nums = [];
        public bool HasCond;
    }

    private static readonly Dictionary<string, Parsed> Cache = new(StringComparer.Ordinal);
    private static readonly object CacheLock = new();

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
                cur.Append(code, i, Math.Min(j + 1, code.Length) - i);
                i = j; continue;
            }
            if (ch == '[')
            {
                int end = code.IndexOf(']', i + 1);
                int j = end < 0 ? code.Length : end;
                cur.Append(code, i, Math.Min(j + 1, code.Length) - i);
                i = j; continue;
            }
            if (ch is '\\' or '_' or '*') { cur.Append(code, i, Math.Min(i + 2, code.Length) - i); i++; continue; }
            if (ch == ';') { outp.Add(cur.ToString()); cur.Clear(); continue; }
            cur.Append(ch);
        }
        outp.Add(cur.ToString());
        return outp;
    }

    private static Parsed Parse(string code)
    {
        lock (CacheLock) { if (Cache.TryGetValue(code, out var hit)) return hit; }
        var raws = SplitSections(code);
        var p = new Parsed();
        foreach (var r in raws) p.Secs.Add(ParseSection(r));
        p.Nums = p.Secs.Take(3).ToList();
        if (p.Secs.Count >= 4) p.Text = p.Secs[3];
        else
        {
            int ti = p.Secs.FindIndex(s => s.Kind == "text");
            if (ti >= 0) { p.Text = p.Secs[ti]; p.Nums = p.Secs.Where((_, i) => i != ti).ToList(); }
        }
        p.HasCond = p.Nums.Any(s => s.Cond is not null);
        lock (CacheLock)
        {
            if (Cache.Count > 2000) Cache.Clear();
            Cache[code] = p;
        }
        return p;
    }

    private static readonly Regex BareRe = new("\"[^\"]*\"|\\\\.|_.|\\*.|\\[[^\\]]*\\]", RegexOptions.CultureInvariant);
    private static readonly Regex GeneralWordRe = new("general", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex ExpSignRe = new("e[+-]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex DateLikeRe = new(@"[ymdhs]|am/pm|a/p", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex SubsecRe = new(@"\.0+", RegexOptions.CultureInvariant);
    private static readonly Regex DigitRe = new("[0#?]", RegexOptions.CultureInvariant);
    private static readonly Regex ElapsedRe = new(@"^(h+|m+|s+)$", RegexOptions.CultureInvariant);
    private static readonly Regex ColorNRe = new(@"^color\s*(\d+)$", RegexOptions.CultureInvariant);
    private static readonly Regex CondRe = new(@"^(<=|>=|<>|<|>|=)\s*([-+]?[\d.]+(?:e[-+]?\d+)?)$", RegexOptions.CultureInvariant);
    private static readonly Regex HexRe = new("^[0-9a-f]+$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex FixedDenRe = new("^[1-9][0-9]*", RegexOptions.CultureInvariant);
    private static readonly Regex LeadDigitsRe = new(@"^\d+", RegexOptions.CultureInvariant);

    private static bool IsDateCh(char c) => "ymdhsegbaYMDHSEGBA".IndexOf(c) >= 0;

    private static Section ParseSection(string raw)
    {
        var toks = new List<Tok>();
        Cond? cond = null; string? color = null; int? lcid = null;
        string bare = BareRe.Replace(raw, "");
        bool dateLike = DateLikeRe.IsMatch(ExpSignRe.Replace(GeneralWordRe.Replace(bare, ""), ""));
        bool hasDigit = DigitRe.IsMatch(dateLike ? SubsecRe.Replace(bare, "") : bare);
        void Lit(string s)
        {
            if (toks.Count > 0 && toks[^1].K == K.Lit) toks[^1].S += s; else toks.Add(Tok.Lit_(s));
        }
        for (int i = 0; i < raw.Length; i++)
        {
            char ch = raw[i];
            if (ch == '"') { int end = raw.IndexOf('"', i + 1); int j = end < 0 ? raw.Length : end; Lit(raw[(i + 1)..j]); i = j; continue; }
            if (ch == '\\') { if (i + 1 < raw.Length) Lit(raw[i + 1].ToString()); i++; continue; }
            if (ch == '_') { toks.Add(new Tok { K = K.Skip, S = i + 1 < raw.Length ? raw[i + 1].ToString() : " " }); i++; continue; }
            if (ch == '*') { toks.Add(new Tok { K = K.Fill, S = i + 1 < raw.Length ? raw[i + 1].ToString() : " " }); i++; continue; }
            if (ch == '[')
            {
                int end = raw.IndexOf(']', i + 1); int j = end < 0 ? raw.Length : end;
                string inner = raw[(i + 1)..j]; i = j;
                string low = inner.ToLowerInvariant();
                Match m;
                if (ElapsedRe.IsMatch(low)) { toks.Add(new Tok { K = K.El, C = low[0], N = low.Length }); continue; }
                if (ColorNames.TryGetValue(low, out var cn)) { color ??= cn; continue; }
                if ((m = ColorNRe.Match(low)).Success) { int n = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture); if (n >= 1 && n <= 56) color ??= "#" + ColorN[n - 1]; continue; }
                if ((m = CondRe.Match(low)).Success) { cond = new Cond(m.Groups[1].Value, JsNumber.ParseFloat(m.Groups[2].Value)); continue; }
                if (inner.StartsWith('$'))
                {
                    string body = inner[1..];
                    int dash = body.LastIndexOf('-');
                    string sym = dash >= 0 ? body[..dash] : body;
                    string lc = dash >= 0 ? body[(dash + 1)..] : "";
                    if (sym != "") Lit(sym);
                    if (string.Equals(lc, "x-sysdate", StringComparison.OrdinalIgnoreCase)) lcid = 0xf800;
                    else if (string.Equals(lc, "x-systime", StringComparison.OrdinalIgnoreCase)) lcid = 0xf400;
                    else if (HexRe.IsMatch(lc)) lcid = (int)(long.Parse(lc.Length > 8 ? lc[^8..] : lc, NumberStyles.HexNumber, CultureInfo.InvariantCulture) & 0xffff);
                    continue;
                }
                continue; // [DBNum1]… ignorados
            }
            if ((ch == 'E' || ch == 'e') && i + 1 < raw.Length && (raw[i + 1] == '+' || raw[i + 1] == '-') && hasDigit)
            { toks.Add(new Tok { K = K.Exp, Plus = raw[i + 1] == '+' }); i++; continue; }
            if (ch is '0' or '#' or '?') { toks.Add(new Tok { K = K.Dig, C = ch }); continue; }
            if (ch == '.')
            {
                var prev = toks.Count > 0 ? toks[^1] : null;
                int n = 0; while (i + 1 + n < raw.Length && raw[i + 1 + n] == '0') n++;
                if (n > 0 && dateLike && prev is not null && ((prev.K == K.Dt && char.ToLowerInvariant(prev.C) == 's') || (prev.K == K.El && prev.C == 's')))
                { toks.Add(new Tok { K = K.Subsec, N = n }); i += n; continue; }
                toks.Add(new Tok { K = K.Pt }); continue;
            }
            if (ch == ',') { toks.Add(new Tok { K = K.Comma }); continue; }
            if (ch == '%') { toks.Add(new Tok { K = K.Pct }); continue; }
            if (ch == '/')
            {
                toks.Add(new Tok { K = K.Slash });
                var fm = FixedDenRe.Match(raw[(i + 1)..]);
                if (fm.Success && hasDigit) { toks.Add(Tok.Lit_(fm.Value)); i += fm.Value.Length; }
                continue;
            }
            if (ch == '@') { toks.Add(new Tok { K = K.At }); continue; }
            if ((ch == 'G' || ch == 'g') && i + 7 <= raw.Length && string.Equals(raw.Substring(i, 7), "general", StringComparison.OrdinalIgnoreCase))
            { toks.Add(new Tok { K = K.Gen }); i += 6; continue; }
            if (i + 5 <= raw.Length && string.Equals(raw.Substring(i, 5), "am/pm", StringComparison.OrdinalIgnoreCase))
            { toks.Add(new Tok { K = K.AmPm, Full = true }); i += 4; continue; }
            if (i + 3 <= raw.Length && string.Equals(raw.Substring(i, 3), "a/p", StringComparison.OrdinalIgnoreCase))
            { toks.Add(new Tok { K = K.AmPm, Full = false, Lower = ch == 'a' }); i += 2; continue; }
            if (IsDateCh(ch))
            {
                char lc = char.ToLowerInvariant(ch);
                int n = 1;
                while (i + n < raw.Length && char.ToLowerInvariant(raw[i + n]) == lc) n++;
                if (lc == 'a' && n < 3) { Lit(raw.Substring(i, n)); i += n - 1; continue; }
                toks.Add(new Tok { K = K.Dt, C = lc == 'm' ? 'M' : lc, N = n });
                i += n - 1;
                continue;
            }
            Lit(ch.ToString());
        }
        var sec = new Section { Toks = toks, Cond = cond, Color = color, Lcid = lcid };
        bool Has(K k) => toks.Any(t => t.K == k);
        if (toks.Count == 0)
        {
            // só cor/condição ("[Red][<=100]") = Geral; seção vazia de verdade = nada
            if (raw.Contains('[')) { toks.Add(new Tok { K = K.Gen }); sec.Kind = "gen"; } else sec.Kind = "empty";
        }
        else if (Has(K.Dt) || Has(K.El) || Has(K.AmPm) || Has(K.Subsec)) sec.Kind = "date";
        else if (Has(K.Gen)) sec.Kind = "gen";
        else if (Has(K.Dig)) { sec.Kind = "num"; AnalyzeNumber(sec); }
        else if (Has(K.At)) sec.Kind = "text";
        if (sec.Kind == "date") ResolveMinutes(toks);
        if (sec.Kind != "num")
        {
            for (int i = 0; i < toks.Count; i++)
            {
                var t = toks[i];
                string? s = t.K switch
                {
                    K.Pt => ".", K.Comma => ",", K.Slash => "/", K.Pct => "%", K.Dig => t.C.ToString(),
                    K.Exp => t.Plus ? "E+" : "E-", _ => null,
                };
                if (s is not null) toks[i] = Tok.Lit_(s);
            }
        }
        return sec;
    }

    /// <summary>m/mm depois de h (ou [h]) ou antes de s = minuto ('m'); senão mês ('M').</summary>
    private static void ResolveMinutes(List<Tok> toks)
    {
        bool afterH = false;
        for (int i = 0; i < toks.Count; i++)
        {
            var t = toks[i];
            if ((t.K == K.Dt && t.C == 'h') || (t.K == K.El && t.C == 'h')) { afterH = true; continue; }
            if (t.K == K.Dt && t.C == 'M')
            {
                bool beforeS = false;
                for (int j = i + 1; j < toks.Count; j++)
                {
                    var u = toks[j];
                    if (u.K == K.Lit || u.K == K.Skip) continue;
                    beforeS = (u.K == K.Dt && u.C == 's') || (u.K == K.El && u.C == 's');
                    break;
                }
                if ((afterH || beforeS) && t.N <= 2) { t.C = 'm'; afterH = false; }
                continue;
            }
            if (t.K == K.Dt || t.K == K.AmPm) afterH = false;
        }
    }

    private static void AnalyzeNumber(Section sec)
    {
        var toks = sec.Toks;
        int expAt = toks.FindIndex(t => t.K == K.Exp);
        sec.Exp = expAt >= 0;
        int end = sec.Exp ? expAt : toks.Count;
        int ptAt = -1;
        for (int i = 0; i < end; i++)
        {
            if (toks[i].K != K.Pt) continue;
            if (ptAt < 0) ptAt = i; else toks[i] = Tok.Lit_(".");
        }
        int intEnd = ptAt >= 0 ? ptAt : end;
        int slashAt = !sec.Exp && ptAt < 0 ? toks.FindIndex(t => t.K == K.Slash) : -1;
        if (slashAt > 0)
        {
            var numIdx = new List<int>();
            for (int j = slashAt - 1; j >= 0 && toks[j].K == K.Dig; j--) numIdx.Insert(0, j);
            var denIdx = new List<int>();
            int fixedDen = 0;
            int jj = slashAt + 1;
            for (; jj < toks.Count && toks[jj].K == K.Dig; jj++) denIdx.Add(jj);
            if (denIdx.Count == 0 && jj < toks.Count && toks[jj].K == K.Lit)
            {
                var m = LeadDigitsRe.Match(toks[jj].S);
                if (m.Success)
                {
                    fixedDen = int.Parse(m.Value, CultureInfo.InvariantCulture);
                    string rest = toks[jj].S[m.Value.Length..];
                    toks.RemoveAt(jj);
                    toks.Insert(jj, Tok.Lit_(""));
                    if (rest != "") toks.Insert(jj + 1, Tok.Lit_(rest));
                    denIdx.Add(jj);
                }
            }
            if (numIdx.Count > 0 && denIdx.Count > 0)
            {
                var intIdx = new List<int>();
                for (int k = 0; k < numIdx[0]; k++) if (toks[k].K == K.Dig) intIdx.Add(k);
                sec.Frac = new FracInfo(numIdx, denIdx, fixedDen, intIdx);
            }
            else toks[slashAt] = Tok.Lit_("/");
        }
        else if (slashAt == 0) toks[0] = Tok.Lit_("/");
        for (int i = 0; i < toks.Count; i++) if (toks[i].K == K.Slash && i != slashAt) toks[i] = Tok.Lit_("/");
        bool DigAt(int from, int to) { for (int k = from; k < to; k++) if (toks[k].K == K.Dig) return true; return false; }
        int lastDig = -1;
        for (int i = 0; i < toks.Count; i++) if (toks[i].K == K.Dig && (!sec.Exp || i < expAt)) lastDig = i;
        double scale = 1;
        var kind = new Dictionary<int, string>();
        for (int i = 0; i < toks.Count; i++)
        {
            if (toks[i].K != K.Comma) continue;
            if (i < intEnd && DigAt(0, i) && DigAt(i + 1, intEnd)) { kind[i] = "group"; continue; }
            int k = i - 1;
            while (k >= 0 && toks[k].K == K.Comma) k--;
            bool afterDigit = k >= 0 && toks[k].K == K.Dig;
            int n = i + 1;
            while (n < toks.Count && toks[n].K == K.Comma) n++;
            bool nextDig = n < toks.Count && toks[n].K == K.Dig;
            if (afterDigit && !nextDig && (i > lastDig || (n < toks.Count && toks[n].K == K.Pt))) kind[i] = "scale";
            else if (sec.Exp && i < expAt) kind[i] = "drop";
            else kind[i] = "lit";
        }
        foreach (var (i, kd) in kind)
        {
            if (kd == "group") sec.Group = true;
            if (kd == "scale") scale /= 1000;
            toks[i] = Tok.Lit_(kd == "lit" ? "," : "");
        }
        foreach (var t in toks) if (t.K == K.Pct) scale *= 100;
        sec.Scale = scale;
        for (int i = 0; i < (sec.Exp ? expAt : toks.Count); i++)
        {
            if (toks[i].K != K.Dig) continue;
            if (sec.Frac is not null && (sec.Frac.NumIdx.Contains(i) || sec.Frac.DenIdx.Contains(i))) continue;
            if (i < intEnd) sec.NInt++; else sec.NFrac++;
        }
    }

    // ──────────────────────────── Entrada ────────────────────────────

    /// <summary>Formata em PARTES (texto, <c>_x</c>, <c>*x</c>, Geral) — para quem conhece a largura.</summary>
    public static FormatParts FormatValueParts(string value, string? code, FormatOptions? opts = null)
    {
        if (string.IsNullOrEmpty(code) || string.Equals(code, "general", StringComparison.OrdinalIgnoreCase))
            return new FormatParts([new TextPart(value)], null, false);
        var p = Parse(code);
        if (p.Text is null) return new FormatParts([new TextPart(value)], null, false);
        return new FormatParts(EmitText(p.Text, value), p.Text.Color, false);
    }

    /// <summary>Formata em PARTES um valor numérico/data.</summary>
    public static FormatParts FormatValueParts(double x, string? code, FormatOptions? opts = null)
    {
        opts ??= new FormatOptions();
        var loc = opts.Locale ?? PtBr;
        if (!double.IsFinite(x)) return new FormatParts([], null, true);
        if (string.IsNullOrEmpty(code) || string.Equals(code, "general", StringComparison.OrdinalIgnoreCase))
        {
            if (x == 0 && !opts.ShowZeros) return new FormatParts([], null, false);
            return new FormatParts([new GeneralPart(x)], null, false);
        }
        var p = Parse(code);
        var pick = PickSection(p, x);
        if (!opts.ShowZeros && x == 0 && !(p.Nums.Count >= 3 && pick.Sec == p.Nums[2])) return new FormatParts([], null, false);
        if (pick.Sec is null)
        {
            if (pick.Overflow) return new FormatParts([], null, true);
            return new FormatParts([new GeneralPart(pick.General ?? x)], null, false);
        }
        var sec = pick.Sec;
        double v = pick.Abs ? Math.Abs(x) : x;
        bool neg = v < 0;
        var outp = new List<FmtPart>();
        bool overflow = false, nonzero = false;
        switch (sec.Kind)
        {
            case "empty": break;
            case "text": outp.Add(new GeneralPart(v)); break;
            case "gen": foreach (var t in sec.Toks) { if (t.K == K.Gen) outp.Add(new GeneralPart(v)); else PushDecor(t, outp); } break;
            case "lit": foreach (var t in sec.Toks) PushDecor(t, outp); break;
            case "date":
                {
                    var r = EmitDate(sec, Math.Abs(v), loc, opts.Date1904, neg);
                    if (r is null) overflow = true; else outp.AddRange(r);
                    break;
                }
            case "num": nonzero = EmitNumber(sec, Math.Abs(v), loc, outp); break;
        }
        if (overflow) return new FormatParts([], sec.Color, true);
        if (neg && sec.Kind == "num" && nonzero) outp.Insert(0, new TextPart("-"));
        return new FormatParts(MergeParts(LastFillOnly(outp)), sec.Color, false);
    }

    private sealed record SectionPick(Section? Sec, bool Abs, bool Overflow = false, double? General = null);

    private static SectionPick PickSection(Parsed p, double x)
    {
        var n = p.Nums;
        if (n.Count == 0) return new SectionPick(null, false, false, x);
        if (!p.HasCond)
        {
            if (n.Count == 1) return new SectionPick(n[0], false);
            if (n.Count == 2) return x < 0 ? new SectionPick(n[1], true) : new SectionPick(n[0], false);
            return x > 0 ? new SectionPick(n[0], false) : x < 0 ? new SectionPick(n[1], true) : new SectionPick(n[2], false);
        }
        var c0 = n[0].Cond ?? new Cond(">", 0);
        if (Test(c0, x)) return new SectionPick(n[0], n[0].Cond is not null && NegOnly(c0));
        bool elseSign = n[0].Cond is not null && (c0.Op == "=" || ((c0.Op == ">" || c0.Op == ">=") && c0.V > 0));
        if (n.Count == 1) return new SectionPick(null, !elseSign, false, elseSign ? x : Math.Abs(x));
        var c1 = n[1].Cond;
        if (c1 is not null ? Test(c1, x) : n.Count == 2 || x < 0)
            return new SectionPick(n[1], c1 is not null ? NegOnly(c1) : n.Count >= 3 || !elseSign);
        if (n.Count >= 3) return new SectionPick(n[2], false);
        return new SectionPick(null, false, true);
    }

    private static bool Test(Cond c, double x) => c.Op switch
    {
        "<" => x < c.V, ">" => x > c.V, "=" => x == c.V, "<=" => x <= c.V, ">=" => x >= c.V, "<>" => x != c.V, _ => false,
    };

    private static bool NegOnly(Cond c) => (c.Op == "<" && c.V <= 0) || (c.Op == "<=" && c.V < 0) || (c.Op == "=" && c.V < 0);

    private static List<FmtPart> LastFillOnly(List<FmtPart> outp)
    {
        int last = outp.FindLastIndex(q => q is FillPart);
        if (last < 0) return outp;
        return outp.Where((q, i) => q is not FillPart || i == last).ToList();
    }

    private static List<FmtPart> MergeParts(List<FmtPart> outp)
    {
        var r = new List<FmtPart>();
        foreach (var q in outp)
        {
            if (q is TextPart tp)
            {
                if (tp.S == "") continue;
                if (r.Count > 0 && r[^1] is TextPart prev) { r[^1] = new TextPart(prev.S + tp.S); continue; }
            }
            r.Add(q);
        }
        return r;
    }

    private static List<FmtPart> EmitText(Section sec, string text)
    {
        var outp = new List<FmtPart>();
        foreach (var t in sec.Toks)
        {
            if (t.K == K.At) outp.Add(new TextPart(text)); else PushDecor(t, outp);
        }
        return MergeParts(LastFillOnly(outp));
    }

    private static void PushDecor(Tok t, List<FmtPart> outp)
    {
        if (t.K == K.Lit) outp.Add(new TextPart(t.S));
        else if (t.K == K.Skip) outp.Add(new SkipPart(t.S));
        else if (t.K == K.Fill) outp.Add(new FillPart(t.S));
    }

    /// <summary>Formata um valor TEXTO (texto + cor).</summary>
    public static FormatResult FormatValue(string value, string? code, FormatOptions? opts = null) =>
        Join(FormatValueParts(value, code, opts), opts);

    /// <summary>
    /// Formata um valor numérico/data (texto + cor). <c>*x</c> repete x até ColWidthChars
    /// (sem ela, 1 vez) e <c>_x</c> vira um espaço.
    /// </summary>
    public static FormatResult FormatValue(double value, string? code, FormatOptions? opts = null) =>
        Join(FormatValueParts(value, code, opts), opts);

    private static FormatResult Join(FormatParts r, FormatOptions? opts)
    {
        var loc = opts?.Locale ?? PtBr;
        if (r.Overflow) return new FormatResult("#", r.Color);
        var sb = new StringBuilder();
        int fillAt = -1; string fillCh = "";
        foreach (var q in r.Parts)
        {
            switch (q)
            {
                case TextPart t: sb.Append(t.S); break;
                case SkipPart: sb.Append(' '); break;
                case GeneralPart g: sb.Append(FormatGeneral(g.V, loc)); break;
                case FillPart f: fillAt = sb.Length; fillCh = f.Ch; break;
            }
        }
        string outs = sb.ToString();
        if (fillAt >= 0)
        {
            int reps = opts?.ColWidthChars is int w ? Math.Max(0, w - outs.Length) : 1;
            var rep = new StringBuilder();
            for (int i = 0; i < reps; i++) rep.Append(fillCh);
            outs = outs[..fillAt] + rep + outs[fillAt..];
        }
        return new FormatResult(outs, r.Color);
    }

    // ──────────────────────── Seção numérica ────────────────────────

    private static bool EmitNumber(Section sec, double a, FormatLocale loc, List<FmtPart> outp)
    {
        double v = a * sec.Scale;
        if (sec.Exp) { EmitScientific(sec, v, loc, outp); return v > 0; }
        if (sec.Frac is not null) return EmitFraction(sec, v, outp);
        var (intStr, fracStr) = DecimalDigits(v, sec.NFrac);
        EmitDigits(sec, intStr, fracStr, loc, outp, sec.Toks.Count);
        return intStr != "" || fracStr.Any(c => c != '0');
    }

    private static void EmitDigits(Section sec, string intStr, string fracStr, FormatLocale loc, List<FmtPart> outp, int end)
    {
        var toks = sec.Toks;
        int n = sec.NInt;
        int len = intStr.Length;
        int extra = Math.Max(0, len - n);
        int intSeen = 0, fracSeen = 0;
        bool afterPt = false;
        int lastSig = -1;
        for (int i = 0; i < fracStr.Length; i++) if (fracStr[i] != '0') lastSig = i;
        string SepAfter(int pos) => sec.Group && pos > 0 && pos % 3 == 0 ? loc.Group : "";
        bool hasPt = toks.Any(t => t.K == K.Pt);
        for (int i = 0; i < end; i++)
        {
            var t = toks[i];
            if (t.K == K.Pt)
            {
                if (n == 0 && len > 0) outp.Add(new TextPart(intStr));
                outp.Add(new TextPart(loc.Decimal));
                afterPt = true;
                continue;
            }
            if (t.K == K.Dig)
            {
                if (!afterPt)
                {
                    int j = intSeen++;
                    int pos = n - 1 - j;
                    string s = "";
                    if (j == 0 && extra > 0)
                    {
                        var sb = new StringBuilder();
                        for (int q = 0; q <= extra; q++) { int p2 = len - 1 - q; sb.Append(intStr[q]).Append(SepAfter(p2)); }
                        s = sb.ToString();
                    }
                    else
                    {
                        int k = len - 1 - pos;
                        if (k >= 0) s = intStr[k] + SepAfter(pos);
                        else if (t.C == '0') s = "0" + SepAfter(pos);
                        else if (t.C == '?') s = " " + (SepAfter(pos) != "" ? " " : "");
                    }
                    outp.Add(new TextPart(s));
                }
                else
                {
                    int j = fracSeen++;
                    char d = j < fracStr.Length ? fracStr[j] : '0';
                    outp.Add(new TextPart(j <= lastSig ? d.ToString() : t.C == '0' ? "0" : t.C == '?' ? " " : ""));
                }
                continue;
            }
            if (t.K == K.Pct) { outp.Add(new TextPart("%")); continue; }
            PushDecor(t, outp);
        }
        if (n == 0 && !hasPt && len > 0) outp.Add(new TextPart(intStr));
    }

    private static void EmitScientific(Section sec, double a, FormatLocale loc, List<FmtPart> outp)
    {
        var toks = sec.Toks;
        int expAt = toks.FindIndex(t => t.K == K.Exp);
        bool plus = toks[expAt].Plus;
        int nInt = Math.Max(1, sec.NInt);
        int e = 0;
        double mant = 0;
        if (a > 0)
        {
            e = (int)Math.Floor(Math.Log10(a));
            if (nInt > 1) e = (int)Math.Floor(e / (double)nInt) * nInt;
            mant = a / Math.Pow(10, e);
            var (ip, _) = DecimalDigits(mant, sec.NFrac);
            if (ip.Length > nInt) { e += nInt > 1 ? nInt : 1; mant = a / Math.Pow(10, e); }
            else if (nInt == 1 && ip.Length > 1) { e += 1; mant = a / Math.Pow(10, e); }
        }
        var (intStr, fracStr) = DecimalDigits(mant, sec.NFrac);
        // zero: todos os placeholders inteiros viram 0 ("##0.0E+0" c/ 0 → "000,0E+0")
        EmitDigits(sec, a > 0 ? intStr : new string('0', Math.Max(1, sec.NInt)), fracStr, loc, outp, expAt);
        outp.Add(new TextPart("E" + (e < 0 ? "-" : plus ? "+" : "")));
        var expToks = toks.Skip(expAt + 1).ToList();
        int minExp = expToks.Count(t => t.K == K.Dig && t.C == '0');
        string es = Itos(Math.Abs(e)).PadLeft(minExp, '0');
        bool done = false;
        foreach (var t in expToks)
        {
            if (t.K == K.Dig) { if (!done) { outp.Add(new TextPart(es)); done = true; } continue; }
            PushDecor(t, outp);
        }
    }

    private static bool EmitFraction(Section sec, double a, List<FmtPart> outp)
    {
        var f = sec.Frac!;
        var toks = sec.Toks;
        bool hasInt = f.IntIdx.Count > 0;
        double whole = hasInt ? Math.Floor(a) : 0;
        double frac = a - whole;
        int denDigits = f.FixedDen != 0 ? 0 : f.DenIdx.Count;
        double maxDen = f.FixedDen != 0 ? f.FixedDen : Math.Pow(10, denDigits) - 1;
        double bestN = 0, bestD = 1;
        if (f.FixedDen != 0) { bestD = f.FixedDen; bestN = JsNumber.Round(frac * f.FixedDen); }
        else
        {
            double bestErr = double.PositiveInfinity;
            double target = frac;
            foreach (var (cn, cd) in new[] { (Math.Floor(target), 1.0), (Math.Ceiling(target), 1.0) })
            {
                double err = Math.Abs(cn / cd - target);
                if (err < bestErr) { bestErr = err; bestN = cn; bestD = cd; }
            }
            (double N, double D) lo = (Math.Floor(target), 1), hi = (Math.Floor(target) + 1, 1);
            for (int it = 0; it < 200; it++)
            {
                (double N, double D) med = (lo.N + hi.N, lo.D + hi.D);
                if (med.D > maxDen) break;
                double val = med.N / med.D;
                double err = Math.Abs(val - target);
                if (err < bestErr - 1e-15) { bestErr = err; bestN = med.N; bestD = med.D; }
                if (val < target) lo = med; else if (val > target) hi = med; else break;
            }
        }
        if (hasInt && bestN >= bestD && bestD > 0) { whole += Math.Floor(bestN / bestD); bestN %= bestD; }
        bool zeroFrac = bestN == 0;
        string intStr = whole > 0 ? JsNumber.ToString(whole) : "";
        string numStr = JsNumber.ToString(bestN), denStr = JsNumber.ToString(f.FixedDen != 0 ? f.FixedDen : bestD);
        int lastInt = f.IntIdx.Count > 0 ? f.IntIdx[^1] : -1;
        int fracFrom = Math.Min(lastInt + 1, f.NumIdx[0]);
        int fracTo = f.DenIdx[^1];
        static string Pad(char c) => c == '0' ? "0" : c == '?' ? " " : "";
        for (int i = 0; i < toks.Count; i++)
        {
            var t = toks[i];
            if (zeroFrac && hasInt && i >= fracFrom && i <= fracTo)
            {
                if (t.K == K.Dig || t.K == K.Slash) outp.Add(new TextPart(" "));
                else if (t.K == K.Lit) outp.Add(new TextPart(new string(' ', f.FixedDen != 0 && f.DenIdx.Contains(i) ? denStr.Length : t.S.Length)));
                else PushDecor(t, outp);
                continue;
            }
            if (t.K == K.Dig && f.IntIdx.Contains(i))
            {
                int j = f.IntIdx.IndexOf(i), n = f.IntIdx.Count, len = intStr.Length;
                string s;
                if (j == 0 && len > n) s = intStr[..(len - n + 1)];
                else { int k = len - n + j; s = k >= 0 ? intStr[k].ToString() : Pad(t.C); }
                if (zeroFrac && whole == 0 && j == n - 1 && s == "") s = "0";
                outp.Add(new TextPart(s));
                continue;
            }
            if (t.K == K.Dig && f.NumIdx.Contains(i))
            {
                int j = f.NumIdx.IndexOf(i), n = f.NumIdx.Count, len = numStr.Length;
                string s;
                if (j == 0 && len > n) s = numStr[..(len - n + 1)];
                else { int k = len - n + j; s = k >= 0 ? numStr[k].ToString() : Pad(t.C); }
                outp.Add(new TextPart(s));
                continue;
            }
            if (t.K == K.Slash) { outp.Add(new TextPart("/")); continue; }
            if (f.DenIdx.Contains(i))
            {
                if (f.FixedDen != 0) { outp.Add(new TextPart(denStr)); continue; }
                int j = f.DenIdx.IndexOf(i), n = f.DenIdx.Count;
                string s = j == n - 1
                    ? (j < denStr.Length && denStr[j..] != "" ? denStr[j..] : Pad(t.C))
                    : (j < denStr.Length ? denStr[j].ToString() : Pad(t.C));
                outp.Add(new TextPart(s));
                continue;
            }
            if (t.K == K.Pct) { outp.Add(new TextPart("%")); continue; }
            if (t.K == K.Dig) { outp.Add(new TextPart(Pad(t.C))); continue; }
            PushDecor(t, outp);
        }
        return whole > 0 || bestN > 0;
    }

    // ──────────────────────── Seção data/hora ────────────────────────

    private static readonly DateTime Epoch1899 = new(1899, 12, 30, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>
    /// Serial OLE (dias desde 1899-12-30) → DateTime UTC. Seriais fora do domínio
    /// representável são SATURADOS em DateTime.Min/MaxValue (nunca lança).
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

    private const double MaxSerial = 2958465; // 31/12/9999

    private static FormatLocale LocaleFor(Section sec, FormatLocale loc)
    {
        if (sec.Lcid is not int lcid) return loc;
        if (!Langs.TryGetValue(lcid & 0x3ff, out var names)) return loc;
        return new FormatLocale
        {
            Decimal = loc.Decimal, Group = loc.Group, Builtins = loc.Builtins, SysDate = loc.SysDate, SysTime = loc.SysTime,
            MonthsShort = names.MonthsShort, MonthsLong = names.MonthsLong, DaysShort = names.DaysShort, DaysLong = names.DaysLong,
            Ampm = names.Ampm ?? loc.Ampm,
        };
    }

    /// <summary>null = fora da faixa (data negativa ou além de 9999) → "####".</summary>
    private static List<FmtPart>? EmitDate(Section sec0, double serial, FormatLocale loc0, bool date1904, bool neg)
    {
        var sec = sec0;
        if (sec.Lcid is 0xf800 or 0xf400)
        {
            string sys = sec.Lcid == 0xf800 ? loc0.SysDate ?? "dddd, mmmm d, yyyy" : loc0.SysTime ?? "h:mm:ss AM/PM";
            var s2 = ParseSection(sys);
            s2.Color = sec.Color;
            sec = s2;
        }
        var loc = LocaleFor(sec, loc0);
        if (neg) return null;
        int sub = 0;
        foreach (var t in sec.Toks) if (t.K == K.Subsec) sub = Math.Max(sub, Math.Min(3, t.N));
        double unit = Math.Pow(10, sub);
        // arredonda ao segundo (ou à fração pedida), sobre 15 algarismos
        var (ti, _) = DecimalDigits(serial * 86400 * unit, 0);
        double ticks = ti == "" ? 0 : double.Parse(ti, CultureInfo.InvariantCulture);
        double perDay = 86400 * unit;
        double dayN = Math.Floor(ticks / perDay);
        double sodTicks = ticks - dayN * perDay;
        if (dayN > MaxSerial + (date1904 ? -1462 : 0) || serial < 0) return null;
        int yr, mo, day, wd;
        if (date1904)
        {
            var d = new DateTime(1904, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayN);
            yr = d.Year; mo = d.Month - 1; day = d.Day; wd = (int)d.DayOfWeek;
        }
        else if (dayN == 0) { yr = 1900; mo = 0; day = 0; wd = 6; }
        else if (dayN == 60) { yr = 1900; mo = 1; day = 29; wd = 3; }
        else
        {
            var d = new DateTime(1899, 12, dayN < 60 ? 31 : 30, 0, 0, 0, DateTimeKind.Utc).AddDays(dayN);
            yr = d.Year; mo = d.Month - 1; day = d.Day; wd = (int)d.DayOfWeek;
            if (dayN < 60) wd = (wd + 6) % 7;
        }
        long sod = (long)Math.Floor(sodTicks / unit);
        long subVal = (long)(sodTicks - sod * unit);
        long h24 = sod / 3600, min = sod % 3600 / 60, sec2 = sod % 60;
        bool has12 = sec.Toks.Any(t => t.K == K.AmPm);
        long h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        long totalSec = (long)Math.Floor(ticks / unit);
        static string P(long v, int n) => Itos(v).PadLeft(n, '0');
        var outp = new List<FmtPart>();
        foreach (var t in sec.Toks)
        {
            switch (t.K)
            {
                case K.Dt:
                    {
                        int n = t.N;
                        string s = "";
                        switch (t.C)
                        {
                            case 'y': s = n <= 2 ? P(yr % 100, 2) : Itos(yr); break;
                            case 'e': s = Itos(yr); break;
                            case 'g': s = ""; break;
                            case 'b': s = n <= 2 ? P((yr + 543) % 100, 2) : Itos(yr + 543); break;
                            case 'M': s = n == 1 ? Itos(mo + 1) : n == 2 ? P(mo + 1, 2) : n == 3 ? loc.MonthsShort[mo] : n == 4 ? loc.MonthsLong[mo] : loc.MonthsLong[mo][..1]; break;
                            case 'm': s = n >= 2 ? P(min, 2) : Itos(min); break;
                            case 'd': s = n == 1 ? Itos(day) : n == 2 ? P(day, 2) : n == 3 ? loc.DaysShort[wd] : loc.DaysLong[wd]; break;
                            case 'a': s = n == 3 ? loc.DaysShort[wd] : loc.DaysLong[wd]; break;
                            case 'h': { long hv = has12 ? h12 : h24; s = n >= 2 ? P(hv, 2) : Itos(hv); break; }
                            case 's': s = n >= 2 ? P(sec2, 2) : Itos(sec2); break;
                        }
                        if (t.C != 'g') outp.Add(new TextPart(s));
                        break;
                    }
                case K.El:
                    {
                        long val = t.C == 'h' ? totalSec / 3600 : t.C == 'm' ? totalSec / 60 : totalSec;
                        outp.Add(new TextPart(P(val, t.N)));
                        break;
                    }
                case K.Subsec:
                    {
                        string digits = P(subVal, sub);
                        digits = digits[..Math.Min(t.N, digits.Length)].PadRight(t.N, '0');
                        outp.Add(new TextPart(loc.Decimal + digits));
                        break;
                    }
                case K.AmPm:
                    {
                        string s = h24 < 12 ? loc.Ampm[0] : loc.Ampm[1];
                        outp.Add(new TextPart(t.Full ? s : t.Lower ? s[..1].ToLowerInvariant() : s[..1].ToUpperInvariant()));
                        break;
                    }
                default: PushDecor(t, outp); break;
            }
        }
        return outp;
    }
}
