using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Campo de fórmula (= …) recalculado na diagramação — espelho de
/// write/packages/docx-layout/src/field-formula.ts. Aritmética sobre os campos de
/// página aninhados: { = { NUMPAGES } - 1 }, o "total sem a capa". Medido no Word 365
/// pt-BR (lab numpages: capa + 3 páginas, titlePg, start=0): no cabeçalho/rodapé o Word
/// recalcula toda fórmula a cada página; no corpo, só a que tem campo aninhado.
/// Resultado sem formato: casas até 2 com vírgula ("1,33"); \# "00" = imagem numérica;
/// \* roman etc. = formato de número. A avaliação é segura e pequena de propósito:
/// números, + - * /, parênteses e sinal — nada de funções, indicadores ou células (o que
/// não cabe nisso mantém o resultado em cache).
/// </summary>
public static class FieldFormula
{
    private static readonly Regex NestedRe = new(@"\{([^{}]*)\}", RegexOptions.CultureInvariant);
    private static readonly Regex FormulaRe = new(@"^\s*=([^\\]*)((?:\\[\s\S]*)?)$", RegexOptions.CultureInvariant);
    private static readonly Regex PictureRe = new(@"\\#\s*(?:""([^""]*)""|(\S+))", RegexOptions.CultureInvariant);
    private static readonly Regex GeneralRe = new(@"\\\*\s*(\w+)", RegexOptions.CultureInvariant);
    private static readonly Regex NumberRe = new(@"^([-+]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$", RegexOptions.CultureInvariant);
    private static readonly Regex TokenRe = new(@"\G\s*(\d[\d.]*(?:,\d+)?|[-+*/()])", RegexOptions.CultureInvariant);
    private static readonly Regex DecimalsRe = new(@",(\d+)$", RegexOptions.CultureInvariant);

    /// <summary>Formatos gerais (\* …) aceitos no resultado da fórmula.</summary>
    private static string? General(string f) => f switch
    {
        "roman" => "lowerRoman",
        "alphabetic" => "lowerLetter",
        _ => f.ToUpperInvariant() switch
        {
            "ARABIC" => "decimal",
            "ROMAN" => "upperRoman",
            "ALPHABETIC" => "upperLetter",
            _ => null,
        },
    };

    /// <summary>Nome do campo (1ª palavra, maiúscula); "=4-1" → "=".</summary>
    public static string FieldName(string instr)
    {
        string t = instr.Trim();
        if (t.StartsWith('=')) return "=";
        int end = 0;
        while (end < t.Length && !char.IsWhiteSpace(t[end])) end++;
        return t[..end].ToUpperInvariant();
    }

    /// <summary>O código tem campo aninhado (FieldCode com chaves)?</summary>
    public static bool HasNestedField(string? code) => code is not null && NestedRe.IsMatch(code);

    /// <summary>
    /// Resultado de uma fórmula <c>= …</c> (código com os campos aninhados entre chaves,
    /// <c>Run.FieldCode</c>, ou a instrução simples). null = não dá para calcular (campo
    /// aninhado sem valor numérico, função, indicador, erro de sintaxe ou divisão por
    /// zero) — quem chama mantém o resultado em cache.
    /// </summary>
    public static string? Evaluate(string code, Func<string, string, string?> value) => Evaluate(code, value, 0);

    private static string? Evaluate(string code, Func<string, string, string?> value, int depth)
    {
        string? flat = SubstituteNested(code, value, depth);
        if (flat is null) return null;
        var m = FormulaRe.Match(flat);
        if (!m.Success) return null;
        if (!TryParseArithmetic(m.Groups[1].Value, out double v, out int decimals)) return null;
        string switches = m.Groups[2].Value;
        var picture = PictureRe.Match(switches);
        if (picture.Success) return FormatPicture(v, picture.Groups[1].Success ? picture.Groups[1].Value : picture.Groups[2].Value);
        foreach (Match g in GeneralRe.Matches(switches))
        {
            string f = g.Groups[1].Value;
            if (f.Equals("MERGEFORMAT", StringComparison.OrdinalIgnoreCase) || f.Equals("CHARFORMAT", StringComparison.OrdinalIgnoreCase)) continue;
            // o Word só converte inteiro positivo; o resto fica como número
            if (General(f) is { } fmt && v == Math.Floor(v) && v > 0) return NumberFormat.FormatNumber(v, fmt);
            break;
        }
        return FormatResult(v, decimals);
    }

    /// <summary>Troca cada campo aninhado { … } (do mais interno para fora) pelo valor numérico.</summary>
    private static string? SubstituteNested(string code, Func<string, string, string?> value, int depth)
    {
        if (depth > 20) return null;
        string outp = code;
        for (int guard = 0; guard < 200; guard++)
        {
            var m = NestedRe.Match(outp);
            if (!m.Success) return outp;
            string inner = m.Groups[1].Value;
            string name = FieldName(inner);
            string? v = name == "=" ? Evaluate(inner, value, depth + 1) : value(name, $" {inner.Trim()} ");
            if (v is null || ParseNumber(v.Trim()) is not { } n) return null;
            // o número entra na fórmula na notação do pt-BR (vírgula decimal)
            string text = n.ToString("R", CultureInfo.InvariantCulture).Replace('.', ',');
            outp = outp[..m.Index] + $" {text} " + outp[(m.Index + m.Length)..];
        }
        return null;
    }

    /// <summary>Número exibido por um campo ("4", "-2", "1,5", "1.000").</summary>
    private static double? ParseNumber(string s)
    {
        var m = NumberRe.Match(s);
        if (!m.Success) return null;
        string digits = m.Groups[2].Value.Replace(".", "") + (m.Groups[3].Success ? "." + m.Groups[3].Value : "");
        double n = double.Parse(digits, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
        return m.Groups[1].Value == "-" ? -n : n;
    }

    /// <summary>Aritmética: números (pt-BR), + - * /, parênteses e sinal. Casas = as dos literais.</summary>
    private static bool TryParseArithmetic(string src, out double value, out int decimals)
    {
        value = 0;
        decimals = 0;
        var toks = new List<string>();
        int at = 0;
        for (var m = TokenRe.Match(src, 0); m.Success; m = TokenRe.Match(src, at))
        {
            toks.Add(m.Groups[1].Value);
            at = m.Index + m.Length;
        }
        if (src[at..].Trim().Length > 0 || toks.Count == 0) return false;
        int i = 0, dec = 0;
        bool ok = true;
        double Expr()
        {
            double a = Term();
            while (ok && i < toks.Count && toks[i] is "+" or "-")
            {
                string op = toks[i++];
                double b = Term();
                a = op == "+" ? a + b : a - b;
            }
            return a;
        }
        double Term()
        {
            double a = Unary();
            while (ok && i < toks.Count && toks[i] is "*" or "/")
            {
                string op = toks[i++];
                double b = Unary();
                if (op == "/" && b == 0) { ok = false; return 0; }
                a = op == "*" ? a * b : a / b;
            }
            return a;
        }
        double Unary()
        {
            if (i < toks.Count && toks[i] == "-") { i++; return -Unary(); }
            if (i < toks.Count && toks[i] == "+") { i++; return Unary(); }
            return Primary();
        }
        double Primary()
        {
            if (!ok || i >= toks.Count) { ok = false; return 0; }
            string t = toks[i++];
            if (t == "(")
            {
                double v = Expr();
                if (i >= toks.Count || toks[i++] != ")") ok = false;
                return v;
            }
            if (ParseNumber(t) is not { } n) { ok = false; return 0; }
            var d = DecimalsRe.Match(t);
            if (d.Success) dec = Math.Max(dec, d.Groups[1].Value.Length);
            return n;
        }
        double result = Expr();
        if (!ok || i != toks.Count || !double.IsFinite(result)) return false;
        value = result;
        decimals = dec;
        return true;
    }

    /// <summary>Arredonda longe do zero (o Word).</summary>
    private static double RoundAway(double v, int d)
    {
        double p = Math.Pow(10, d);
        return Math.Sign(v) * Math.Round(Math.Abs(v) * p + 1e-9, MidpointRounding.AwayFromZero) / p;
    }

    /// <summary>Resultado sem \#: casas necessárias até max(2, casas dos literais), vírgula decimal.</summary>
    private static string FormatResult(double v, int decimals)
    {
        int cap = Math.Max(2, decimals);
        int d = 0;
        while (d < cap && Math.Abs(RoundAway(v, d) - v) > 1e-9) d++;
        double r = RoundAway(v, d);
        string body = Math.Abs(r).ToString("F" + d, CultureInfo.InvariantCulture).Replace('.', ',');
        return (r < 0 ? "-" : "") + body;
    }

    private static string Group(string digits) => Regex.Replace(digits, @"\B(?=(\d{3})+(?!\d))", ".");

    /// <summary>
    /// Imagem numérica \# do Word com os separadores do pt-BR ("." milhar, "," decimal):
    /// 0 = algarismo, # = algarismo ou espaço, x corta, seções positivo;negativo;zero, o
    /// resto é texto — espelho de formatPicture (docx-core/src/table-formula.ts).
    /// </summary>
    public static string FormatPicture(double v, string picture)
    {
        var secs = SplitSections(picture);
        string pic = secs[0];
        double x = v;
        if (v < 0 && secs.Count > 1) { pic = secs[1]; x = -v; }
        else if (v == 0 && secs.Count > 2) pic = secs[2];
        if (pic.Length >= 2 && pic[0] == '\'' && pic[^1] == '\'') pic = pic[1..^1];
        int comma = pic.IndexOf(',');
        string intPic = comma >= 0 ? pic[..comma] : pic;
        string decPic = comma >= 0 ? pic[(comma + 1)..] : "";
        int nDec = decPic.Count(ch => ch is '0' or '#' or 'x');
        double r = RoundAway(Math.Abs(x), nDec);
        string[] fixedParts = r.ToString("F" + nDec, CultureInfo.InvariantCulture).Split('.');
        string ip = fixedParts[0], dp = fixedParts.Length > 1 ? fixedParts[1] : "";
        string digits = ip == "0" && intPic.Contains('#') && !intPic.Contains('0') ? "" : ip;
        var outp = new List<string>();
        int firstPh = intPic.IndexOfAny(['0', '#', 'x']);
        bool grouping = Regex.IsMatch(intPic, @"[0#x]\.[0#x]");
        for (int k = intPic.Length - 1; k >= 0; k--)
        {
            char ch = intPic[k];
            if (ch is '0' or '#' or 'x')
            {
                string? d = digits.Length > 0 ? digits[^1].ToString() : null;
                digits = digits.Length > 0 ? digits[..^1] : "";
                // algarismos que sobram vão todos no 1º marcador (agrupados de 3 em 3 se a imagem agrupa)
                if (k == firstPh && digits.Length > 0)
                {
                    string all = digits + (d ?? "");
                    outp.Insert(0, grouping ? Group(all) : all);
                    digits = "";
                    continue;
                }
                outp.Insert(0, d ?? (ch == '0' ? "0" : ch == '#' ? " " : ""));
            }
            else if (ch == '.')
            {
                // separador de milhar: só com algarismo à esquerda
                if (digits.Length > 0) outp.Insert(0, ".");
            }
            else outp.Insert(0, ch.ToString());
        }
        var dec = new StringBuilder();
        int di = 0;
        foreach (char ch in decPic)
        {
            if (ch is '0' or '#' or 'x') { dec.Append(di < dp.Length ? dp[di] : ch == '0' ? '0' : ' '); di++; }
            else dec.Append(ch);
        }
        string neg = x < 0 && secs.Count < 2 ? "-" : "";
        return neg + string.Concat(outp) + (comma >= 0 ? "," + dec : "");
    }

    private static List<string> SplitSections(string p)
    {
        var outp = new List<string>();
        var cur = new StringBuilder();
        bool q = false;
        foreach (char ch in p)
        {
            if (ch == '\'') q = !q;
            if (ch == ';' && !q) { outp.Add(cur.ToString()); cur.Clear(); }
            else cur.Append(ch);
        }
        outp.Add(cur.ToString());
        return outp;
    }
}
