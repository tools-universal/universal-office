using System.Globalization;
using System.Numerics;
using System.Text;

namespace OfficeNext.Core;

/// <summary>
/// Conversões número↔texto com semântica ECMAScript (Number::toString,
/// Number.prototype.toFixed, toPrecision, Math.round, parseFloat, parseInt).
/// A paridade byte-idêntica com o JS depende disso: interpolações como
/// `${num}` no JS usam o algoritmo "shortest round-trip" com regras próprias
/// de notação (expoente só fora de 1e-6..1e21), diferentes do ToString do .NET.
/// </summary>
public static class JsNumber
{
    // ───────────────────── expansão decimal EXATA de um double ─────────────────────

    /// <summary>
    /// Decompõe |x| (finito, não-zero) em (digits, exp10) tais que
    /// |x| == BigInteger(digits) × 10^exp10 — expansão decimal EXATA do binário.
    /// </summary>
    private static (string Digits, int Exp10) ExactDigits(double abs)
    {
        long bits = BitConverter.DoubleToInt64Bits(abs);
        int exp = (int)((bits >> 52) & 0x7FF);
        long frac = bits & 0xF_FFFF_FFFF_FFFFL;
        BigInteger m;
        int e2;
        if (exp == 0) { m = frac; e2 = -1074; }               // subnormal
        else { m = frac | (1L << 52); e2 = exp - 1075; }
        if (m.IsZero) return ("0", 0);
        if (e2 >= 0)
        {
            BigInteger v = m << e2;
            return (v.ToString(CultureInfo.InvariantCulture), 0);
        }
        // m × 2^e2 = m × 5^(-e2) × 10^(e2)
        BigInteger num = m * BigInteger.Pow(5, -e2);
        return (num.ToString(CultureInfo.InvariantCulture), e2);
    }

    /// <summary>Arredonda "metade para cima" (regra do toFixed/toPrecision do JS:
    /// empate escolhe o n MAIOR em magnitude). Retorna os dígitos mantidos.</summary>
    private static string RoundDigitsHalfUp(string digits, int keep)
    {
        // keep pode ser <= 0: tudo descartado — decide só pelo primeiro descartado
        string kept = keep <= 0 ? "0" : digits[..keep];
        char first = keep >= digits.Length ? '0'
            : keep < 0 ? '0'
            : digits[Math.Max(keep, 0)];
        if (keep < 0)
        {
            // posição de arredondamento à esquerda do primeiro dígito: só pode
            // arredondar para 1×10^k se keep == 0 e digits[0] >= '5' (tratado acima);
            // keep < 0 ⇒ resultado 0.
            return "0";
        }
        bool roundUp = first >= '5';
        if (!roundUp) return kept == "" ? "0" : kept;
        BigInteger n = BigInteger.Parse(kept == "" ? "0" : kept, CultureInfo.InvariantCulture) + 1;
        return n.ToString(CultureInfo.InvariantCulture);
    }

    // ───────────────────────────── toString ─────────────────────────────

    /// <summary>Number::toString(10) do ECMAScript (shortest round-trip).</summary>
    public static string ToString(double x)
    {
        if (double.IsNaN(x)) return "NaN";
        if (x == 0) return "0";
        if (double.IsPositiveInfinity(x)) return "Infinity";
        if (double.IsNegativeInfinity(x)) return "-Infinity";
        string sign = x < 0 ? "-" : "";
        double a = Math.Abs(x);
        // .NET Core 3.0+: "R" = menor representação que faz round-trip (mesmos
        // dígitos que o JS escolhe). Só o FORMATO difere — normalizamos abaixo.
        string r = a.ToString("R", CultureInfo.InvariantCulture);
        (string digits, int n) = SplitShortest(r);
        int k = digits.Length;
        string body;
        if (k <= n && n <= 21) body = digits + new string('0', n - k);
        else if (0 < n && n <= 21) body = digits[..n] + "." + digits[n..];
        else if (-6 < n && n <= 0) body = "0." + new string('0', -n) + digits;
        else
        {
            int e = n - 1;
            string mant = k == 1 ? digits : digits[..1] + "." + digits[1..];
            body = mant + "e" + (e >= 0 ? "+" : "-") + Math.Abs(e).ToString(CultureInfo.InvariantCulture);
        }
        return sign + body;
    }

    /// <summary>Normaliza a saída "R" do .NET para (dígitos sem zeros nas pontas, n)
    /// onde valor = 0.digits × 10^n.</summary>
    private static (string Digits, int N) SplitShortest(string r)
    {
        int expVal = 0;
        int ePos = r.IndexOfAny(['E', 'e']);
        string mant = r;
        if (ePos >= 0)
        {
            expVal = int.Parse(r[(ePos + 1)..], CultureInfo.InvariantCulture);
            mant = r[..ePos];
        }
        int dot = mant.IndexOf('.');
        string digits;
        int intLen;
        if (dot >= 0) { digits = mant[..dot] + mant[(dot + 1)..]; intLen = dot; }
        else { digits = mant; intLen = mant.Length; }
        int n = intLen + expVal;
        // remove zeros à esquerda (ajusta n) e à direita (não ajusta)
        int lead = 0;
        while (lead < digits.Length - 1 && digits[lead] == '0') lead++;
        n -= lead;
        digits = digits[lead..];
        digits = digits.TrimEnd('0');
        if (digits.Length == 0) { digits = "0"; n = 1; }
        return (digits, n);
    }

    // ───────────────────────────── toFixed ─────────────────────────────

    /// <summary>Number.prototype.toFixed(f) do ECMAScript (empates para CIMA).</summary>
    public static string ToFixed(double x, int f)
    {
        if (double.IsNaN(x)) return "NaN";
        string sign = "";
        if (x < 0) { sign = "-"; x = -x; }
        if (x >= 1e21) return sign + ToString(x);
        string m;
        if (x == 0) m = "0";
        else
        {
            (string digits, int e10) = ExactDigits(x);
            int shift = e10 + f;   // n = digits × 10^shift, arredondado a inteiro
            string nStr;
            if (shift >= 0) nStr = digits + new string('0', shift);
            else
            {
                int cut = -shift;
                if (cut >= digits.Length)
                {
                    // tudo fracionário: mantém "" e olha o primeiro descartado
                    string padded = digits.PadLeft(cut, '0');
                    nStr = RoundDigitsHalfUp(padded, padded.Length - cut);
                }
                else nStr = RoundDigitsHalfUp(digits, digits.Length - cut);
            }
            m = nStr.TrimStart('0');
            if (m.Length == 0) m = "0";
        }
        if (f == 0) return sign + m;
        if (m.Length <= f) m = m.PadLeft(f + 1, '0');
        return sign + m[..^f] + "." + m[^f..];
    }

    // ─────────────────────────── toPrecision ───────────────────────────

    /// <summary>Equivalente a `Number(x.toPrecision(p))` para x finito &gt; 0:
    /// arredonda para p dígitos significativos (empate para cima) e devolve o double.</summary>
    public static double RoundToSigDigits(double x, int p)
    {
        if (x == 0 || !double.IsFinite(x)) return x;
        bool neg = x < 0;
        double a = Math.Abs(x);
        (string digits, int e10) = ExactDigits(a);
        if (digits.Length <= p) return x;
        int drop = digits.Length - p;
        string rounded = RoundDigitsHalfUp(digits, p);
        double result = double.Parse(rounded + "E" + (e10 + drop).ToString(CultureInfo.InvariantCulture),
            NumberStyles.Float, CultureInfo.InvariantCulture);
        return neg ? -result : result;
    }

    // ─────────────────────────── Math.round ───────────────────────────

    /// <summary>Math.round do JS: floor(x + 0.5) — metade vai para +∞.</summary>
    public static double Round(double x)
    {
        // Cuidado com o caso 0.49999999999999994 (floor(x+0.5) daria 1; JS dá 0):
        // o JS especifica floor(x+0.5) MAS motores implementam o correto — a soma
        // x+0.5 em double para esse valor dá exatamente 1.0 e o JS REALMENTE
        // retorna 1? Não: V8 retorna 0. A regra efetiva: se a parte fracionária
        // é exatamente 0.5 → ceil; senão arredonda ao mais próximo.
        double floor = Math.Floor(x);
        double frac = x - floor;
        if (frac > 0.5) return floor + 1;
        if (frac < 0.5) return floor;
        return floor + 1;
    }

    // ─────────────────────────── parseFloat / parseInt ───────────────────────────

    private static bool IsJsSpace(char c) =>
        c is ' ' or '\t' or '\n' or '\r' or '\v' or '\f' or ' ' or '﻿'
        || char.GetUnicodeCategory(c) == UnicodeCategory.SpaceSeparator;

    /// <summary>parseFloat do JS: prefixo numérico; NaN quando não há dígitos.</summary>
    public static double ParseFloat(string? s)
    {
        if (s is null) return double.NaN;
        int i = 0;
        while (i < s.Length && IsJsSpace(s[i])) i++;
        int start = i;
        if (i < s.Length && (s[i] == '+' || s[i] == '-')) i++;
        // JS aceita o literal Infinity (com sinal) no parseFloat
        if (s.AsSpan(i).StartsWith("Infinity", StringComparison.Ordinal))
        {
            return i > start && s[start] == '-' ? double.NegativeInfinity : double.PositiveInfinity;
        }
        int digitsInt = 0;
        while (i < s.Length && char.IsAsciiDigit(s[i])) { i++; digitsInt++; }
        int digitsFrac = 0;
        if (i < s.Length && s[i] == '.')
        {
            i++;
            while (i < s.Length && char.IsAsciiDigit(s[i])) { i++; digitsFrac++; }
        }
        if (digitsInt + digitsFrac == 0) return double.NaN;
        int endMantissa = i;
        if (i < s.Length && (s[i] == 'e' || s[i] == 'E'))
        {
            int j = i + 1;
            if (j < s.Length && (s[j] == '+' || s[j] == '-')) j++;
            int expDigits = 0;
            while (j < s.Length && char.IsAsciiDigit(s[j])) { j++; expDigits++; }
            if (expDigits > 0) endMantissa = j;
        }
        string token = s[start..endMantissa];
        return double.Parse(token, NumberStyles.Float, CultureInfo.InvariantCulture);
    }

    /// <summary>parseInt(s, 10) do JS com fallback quando NaN.</summary>
    public static int ParseIntOr(string? s, int dflt)
    {
        if (s is null) return dflt;
        int i = 0;
        while (i < s.Length && IsJsSpace(s[i])) i++;
        int sign = 1;
        if (i < s.Length && (s[i] == '+' || s[i] == '-')) { if (s[i] == '-') sign = -1; i++; }
        long v = 0;
        int digits = 0;
        while (i < s.Length && char.IsAsciiDigit(s[i]))
        {
            // clampa APÓS aplicar o sinal — senão "-3000000000" viraria
            // −int.MaxValue em vez de int.MinValue (achado da revisão)
            if (v <= int.MaxValue) v = v * 10 + (s[i] - '0');
            i++; digits++;
        }
        if (digits == 0) return dflt;
        long signed = sign * v;
        if (signed > int.MaxValue) return int.MaxValue;
        if (signed < int.MinValue) return int.MinValue;
        return (int)signed;
    }

    /// <summary>String(int) — atalho para inteiros.</summary>
    public static string IntToString(int v) => v.ToString(CultureInfo.InvariantCulture);

    /// <summary>String(long).</summary>
    public static string LongToString(long v) => v.ToString(CultureInfo.InvariantCulture);
}
