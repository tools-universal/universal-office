using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

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
            // número de página "- 1 -" (w:pgNumType fmt — oráculo hfopts fmt-dash)
            case "numberInDash": return $"- {Js.Str(n)} -";
            // notas "símbolos": *, †, ‡, § e depois repetidos (**, ††…) — oráculo notefmt, fmt-chicago
            case "chicago": return n <= 0 ? Js.Str(n) : new string("*†‡§"[(int)((n - 1) % 4)], (int)Math.Floor((n - 1) / 4) + 1);
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
    /// <summary>contexto completo (REF \w): os textos dos níveis acima que o do item não cita,
    /// de fora para dentro, e o do item por último (oráculo refs-lab, rn-letter: "2." + "b)")</summary>
    public List<string>? Parts;
    /// <summary>só os números do marcador (do 1º ao último %n do texto do nível) — o
    /// número de capítulo do campo PAGE (w:chapStyle) e o STYLEREF \s.</summary>
    public string? Chapter;
}

public sealed class NumberingState
{
    /// <summary>
    /// Contador de um nível. Real = algum parágrafo DESTE nível já foi numerado;
    /// senão o valor só existe porque um nível mais fundo o exigiu (pai "virtual"):
    /// conta para o próximo parágrafo do nível, mas aparece como o início do nível.
    /// </summary>
    private struct LevelCount { public double V; public bool Real; }

    /// <summary>contadores por abstractNum (compartilhados por todos os w:num dele): índices 0..8.</summary>
    private Dictionary<string, LevelCount?[]> _counters = new(StringComparer.Ordinal);
    /// <summary>w:num já usados (o startOverride só reinicia no 1º uso).</summary>
    private HashSet<double> _seenNums = new();
    /// <summary>"numId:ilvl" com startOverride adiado (nível pai ainda sem uso no 1º uso do w:num).</summary>
    private HashSet<string> _deferred = new(StringComparer.Ordinal);
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
            _counters = _counters.ToDictionary(kv => kv.Key, kv => (LevelCount?[])kv.Value.Clone(), StringComparer.Ordinal),
            _seenNums = new HashSet<double>(_seenNums),
            _deferred = new HashSet<string>(_deferred, StringComparer.Ordinal),
        };
        return c;
    }

    /// <summary>abstractNum efetivo (segue numStyleLink → estilo de numeração → numId).</summary>
    /// <summary>Lista (abstractNum efetivo) de um w:num — espaçamento automático entre itens.</summary>
    public string? ListKey(double numId)
    {
        double? a = numId != 0 && !double.IsNaN(numId) ? AbstractFor(numId) : null;
        return a is { } v ? $"a{Js.Str(v)}" : null;
    }

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

    /// <summary>
    /// Avança o contador e devolve o marcador do parágrafo (nulo = sem numeração).
    /// Regras medidas no Word (oráculo numbering2) — espelho de numbering.ts:
    /// contador do abstractNum compartilhado pelos w:num; startOverride só no 1º
    /// uso do w:num (níveis do parágrafo para baixo reiniciam; pai com override
    /// ainda sem uso fica com o valor do override e reinicia no 1º parágrafo deste
    /// w:num naquele nível; pai já usado ignora); início do nível do w:num = seu
    /// startOverride; pai nunca usado aparece com o início do nível e passa a contar.
    /// </summary>
    public NumberMarker? Next(double numId, double ilvl)
    {
        if (numId == 0 || double.IsNaN(numId)) return null;
        if (!_numbering.Nums.TryGetValue(numId, out var inst)) return null;
        var a = AbstractFor(numId);
        if (a is null) return null;
        ilvl = Math.Max(0, Math.Min(8, ilvl));
        var lvl = Level(numId, ilvl);
        if (lvl is null) return null;
        string key = $"a{Js.Str(a.Value)}";
        if (!_counters.TryGetValue(key, out var c)) { c = new LevelCount?[9]; _counters[key] = c; }
        double? OvStart(double l) => inst.Overrides.TryGetValue(l, out var ov) ? ov.StartOverride : null;
        // início do nível (definição do nível — o que aparece no pai virtual)
        double LvlStart(double l) => Level(numId, l)?.Start ?? 0;
        // início do nível NESTE w:num (o startOverride, se houver)
        double StartOf(double l) => OvStart(l) ?? LvlStart(l);
        if (!_seenNums.Contains(numId))
        {
            _seenNums.Add(numId);
            for (int l = 0; l < 9; l++)
            {
                var s = OvStart(l);
                if (s is null) continue;
                if (l >= ilvl) c[l] = null;
                else if (c[l] is not { Real: true }) { c[l] = new LevelCount { V = s.Value, Real = false }; _deferred.Add($"{Js.Str(numId)}:{Js.Str(l)}"); }
            }
        }
        int il = (int)ilvl;
        var cur = c[il];
        if (_deferred.Remove($"{Js.Str(numId)}:{Js.Str(ilvl)}") || cur is null) c[il] = new LevelCount { V = StartOf(ilvl), Real = true };
        else c[il] = new LevelCount { V = cur.Value.V + 1, Real = true };
        // pais nunca usados passam a contar (com o início do nível)
        for (int l = 0; l < ilvl; l++) if (c[l] is null) c[l] = new LevelCount { V = StartOf(l), Real = false };
        // níveis mais fundos reiniciam (salvo lvlRestart)
        for (int d = il + 1; d < 9; d++)
        {
            var r = Level(numId, d)?.LvlRestart;
            if (r == 0) continue;
            if (r is null || ilvl < r) c[d] = null;
        }
        string lvlText = lvl.LvlTextNull == true ? "" : (lvl.LvlText ?? "");
        string Fill(string t, NumLevel own) => PctRe.Replace(t, m =>
        {
            int l = m.Groups[1].Value[0] - '1';
            var n = c[l];
            double v = n is { Real: true } ? n.Value.V : LvlStart(l);
            string fmt = own.IsLgl == true && l != il ? "decimal" : (Level(numId, l)?.NumFmt ?? "decimal");
            return NumberFormat.FormatNumber(v, fmt == "bullet" ? "decimal" : fmt, _lang);
        });
        string text;
        string? chapter = null;
        if (lvl.NumFmt == "bullet") text = lvlText;
        else
        {
            text = Fill(lvlText, lvl);
            // número de capítulo (PAGE com w:chapStyle) e STYLEREF \s: do 1º ao último
            // espaço reservado do texto do nível — "Capítulo %1" → "I", "%1.%2" → "1.1"
            // (oráculos hfopts e refs-lab)
            var first = PctRe.Match(lvlText);
            int b = lvlText.LastIndexOf('%');
            if (first.Success && b >= first.Index) chapter = Fill(lvlText.Substring(first.Index, Math.Min(lvlText.Length, b + 2) - first.Index), lvl);
        }
        var outp = new NumberMarker { Text = text, Level = lvl, NumId = numId, Ilvl = ilvl, ListKey = key, Chapter = chapter };
        if (lvl.NumFmt != "bullet")
        {
            List<int> Refs(string t) => PctRe.Matches(t).Select(m => m.Groups[1].Value[0] - '1').ToList();
            var parts = new List<string> { text };
            var cited = new HashSet<int>(Refs(lvlText));
            for (int l = il - 1; l >= 0 && !cited.Contains(l); l--)
            {
                var pl = Level(numId, l);
                if (pl is null || pl.NumFmt == "bullet") break;
                string pt = pl.LvlTextNull == true ? "" : (pl.LvlText ?? "");
                parts.Insert(0, Fill(pt, pl));
                foreach (var x in Refs(pt)) cited.Add(x);
            }
            outp.Parts = parts;
        }
        return outp;
    }
}
