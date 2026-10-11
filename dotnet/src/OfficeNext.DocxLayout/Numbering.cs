using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Numeração do Word (porta de docx-layout/src/numbering.ts): contadores por
/// lista, reinício de níveis, lvlText com %1..%9 (cada nível no SEU formato;
/// isLgl força decimal) e formatos.
/// </summary>
public static class NumberFormat
{
    private static readonly (int V, string S)[] Roman =
    {
        (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"), (100, "c"), (90, "xc"),
        (50, "l"), (40, "xl"), (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i"),
    };

    private static string RomanOf(double n)
    {
        if (n <= 0) return Js.Str(n);
        var sb = new StringBuilder();
        foreach (var (v, s) in Roman) while (n >= v) { sb.Append(s); n -= v; }
        return sb.ToString();
    }

    private static string Letters(double n)
    {
        if (n <= 0) return Js.Str(n);
        if (double.IsNaN(n)) return "";
        // Word: a..z, aa..zz, aaa… (repete a letra)
        double idx = (n - 1) % 26;
        char ch = (char)((int)(97 + idx) & 0xFFFF);
        int rep = (int)Math.Floor((n - 1) / 26) + 1;
        return new string(ch, Math.Max(0, rep));
    }

    private static readonly string[] UnitsPt = { "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
        "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove" };
    private static readonly string[] TensPt = { "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa" };

    private static string CardinalPt(double n)
    {
        if (n < 20) return n >= 0 && n == Math.Floor(n) ? UnitsPt[(int)n] : Js.Str(n);
        if (n < 100)
        {
            int t = (int)Math.Floor(n / 10);
            double u = n % 10;
            return TensPt[t] + (u != 0 && !double.IsNaN(u) ? $" e {(u == Math.Floor(u) ? UnitsPt[(int)u] : "undefined")}" : "");
        }
        return Js.Str(n);
    }

    private static string Hex(double n)
    {
        if (n == Math.Floor(n) && Math.Abs(n) < 9e15)
        {
            long v = (long)n;
            return (v < 0 ? "-" + Convert.ToString(-v, 16) : Convert.ToString(v, 16)).ToUpperInvariant();
        }
        return Js.Str(n).ToUpperInvariant();
    }

    public static string FormatNumber(double n, string? fmt, string lang = "pt-BR")
    {
        switch (fmt)
        {
            case null:
            case "decimal": return Js.Str(n);
            case "decimalZero": return n < 10 && n >= 0 ? $"0{Js.Str(n)}" : Js.Str(n);
            case "upperRoman": return RomanOf(n).ToUpperInvariant();
            case "lowerRoman": return RomanOf(n);
            case "upperLetter": return Letters(n).ToUpperInvariant();
            case "lowerLetter": return Letters(n);
            case "ordinal":
                {
                    if (lang.StartsWith("pt", StringComparison.Ordinal)) return $"{Js.Str(n)}º";
                    string[] suf = { "th", "st", "nd", "rd" };
                    double m100 = n % 100;
                    double idx = (m100 > 10 && m100 < 14) ? 0 : Math.Min(n % 10, 4) % 4;
                    string s = idx >= 0 && idx < 4 && idx == Math.Floor(idx) ? suf[(int)idx] : "th";
                    return $"{Js.Str(n)}{s}";
                }
            case "cardinalText":
                {
                    string s = CardinalPt(n);
                    return s.Length == 0 ? s : char.ToUpperInvariant(s[0]) + s[1..];
                }
            case "ordinalText": return $"{Js.Str(n)}º";
            case "hex": return Hex(n);
            case "decimalEnclosedCircle": return n >= 1 && n <= 20 ? Js.FromCodePoint((int)(0x2460 + n - 1)) : Js.Str(n);
            case "decimalEnclosedParen": return $"({Js.Str(n)})";
            case "decimalEnclosedFullstop": return $"{Js.Str(n)}.";
            case "none": return "";
            case "bullet": return "";
            default: return Js.Str(n);
        }
    }
}

public sealed class NumberMarker
{
    public string Text = "";
    public NumLevel Level = null!;
    public double NumId;
    public double Ilvl;
    /// <summary>id da lista (contador) — p/ depuração.</summary>
    public string ListKey = "";
}

public sealed class NumberingState
{
    /// <summary>contadores por lista: índices 0..8 (escritas fora disso nunca são lidas).</summary>
    private Dictionary<string, double?[]> _counters = new(StringComparer.Ordinal);
    private HashSet<double> _seenNums = new();
    private readonly Numbering _numbering;
    private readonly JsRecord<StyleDef> _styles;
    private readonly string _lang;

    public NumberingState(Numbering numbering, JsRecord<StyleDef> styles, string lang = "pt-BR")
    {
        _numbering = numbering;
        _styles = styles;
        _lang = lang;
    }

    /// <summary>Cópia do estado (a prévia de keepNext não pode avançar contadores).</summary>
    public NumberingState Clone()
    {
        var c = new NumberingState(_numbering, _styles, _lang)
        {
            _counters = _counters.ToDictionary(kv => kv.Key, kv => (double?[])kv.Value.Clone(), StringComparer.Ordinal),
            _seenNums = new HashSet<double>(_seenNums),
        };
        return c;
    }

    /// <summary>abstractNum efetivo (segue numStyleLink → estilo de numeração → numId).</summary>
    private double? AbstractFor(double numId, int depth = 0)
    {
        if (!_numbering.Nums.TryGetValue(numId, out var inst)) return null;
        if (!_numbering.AbstractNums.TryGetValue(inst.AbstractNumId, out var abs)) return null;
        if (!string.IsNullOrEmpty(abs.NumStyleLink) && depth < 4)
        {
            var st = _styles[abs.NumStyleLink];
            var linked = st?.PPr?.NumPr?.NumId;
            if (linked is not null && !linked.Value.Equals(numId))
            {
                var r = AbstractFor(linked.Value, depth + 1);
                if (r is not null) return r;
            }
        }
        return abs.AbstractNumId;
    }

    /// <summary>Nível efetivo (override da instância > abstractNum).</summary>
    public NumLevel? Level(double numId, double ilvl)
    {
        if (!_numbering.Nums.TryGetValue(numId, out var inst)) return null;
        var ov = inst.Overrides.TryGetValue(ilvl, out var o) ? o.Lvl : null;
        if (ov is not null && (ov.LvlText is not null || ov.NumFmt is not null)) return ov;
        var a = AbstractFor(numId);
        AbstractNum? abs = null;
        if (a is not null) _numbering.AbstractNums.TryGetValue(a.Value, out abs);
        return abs is not null && abs.Levels.TryGetValue(ilvl, out var lvl) ? lvl : null;
    }

    private static readonly Regex PctRe = new(@"%([1-9])", RegexOptions.CultureInvariant);

    /// <summary>Avança o contador e devolve o marcador do parágrafo (nulo = sem numeração).</summary>
    public NumberMarker? Next(double numId, double ilvl)
    {
        if (numId == 0 || double.IsNaN(numId)) return null;
        if (!_numbering.Nums.TryGetValue(numId, out var inst)) return null;
        var a = AbstractFor(numId);
        if (a is null) return null;
        ilvl = Math.Max(0, Math.Min(8, ilvl));
        var lvl = Level(numId, ilvl);
        if (lvl is null) return null;
        bool hasOverride = inst.Overrides.Values.Any(o => o.StartOverride is not null);
        string key = hasOverride ? $"n{Js.Str(numId)}" : $"a{Js.Str(a.Value)}";
        if (!_counters.TryGetValue(key, out var c)) { c = new double?[9]; _counters[key] = c; }
        if (hasOverride && !_seenNums.Contains(numId))
        {
            _seenNums.Add(numId);
            foreach (var (lv, o) in inst.Overrides)
            {
                if (o.StartOverride is not null && lv >= 0 && lv < 9 && lv == Math.Floor(lv)) c[(int)lv] = o.StartOverride - 1;
            }
        }
        double StartOf(double l)
        {
            if (inst.Overrides.TryGetValue(l, out var ov) && ov.StartOverride is not null) return ov.StartOverride.Value;
            return Level(numId, l)?.Start ?? 0;
        }
        int il = (int)ilvl;
        c[il] = c[il] is null ? StartOf(ilvl) : c[il] + 1;
        // níveis mais fundos reiniciam (salvo lvlRestart)
        for (int d = il + 1; d < 9; d++)
        {
            var r = Level(numId, d)?.LvlRestart;
            if (r == 0) continue;
            if (r is null || ilvl < r) c[d] = null;
        }
        string lvlText = lvl.LvlTextNull == true ? "" : (lvl.LvlText ?? "");
        string text;
        if (lvl.NumFmt == "bullet") text = lvlText;
        else
        {
            text = PctRe.Replace(lvlText, m =>
            {
                int l = m.Groups[1].Value[0] - '1';
                double v = c[l] ?? StartOf(l);
                string fmt = lvl.IsLgl == true && l != il ? "decimal" : (Level(numId, l)?.NumFmt ?? "decimal");
                return NumberFormat.FormatNumber(v, fmt == "bullet" ? "decimal" : fmt, _lang);
            });
        }
        return new NumberMarker { Text = text, Level = lvl, NumId = numId, Ilvl = ilvl, ListKey = key };
    }
}
