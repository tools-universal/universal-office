using System.Globalization;
using System.Text;

namespace OfficeNext.Layout;

/// <summary>
/// Erro equivalente ao RangeError do JS (leitura fora dos limites de um DataView/
/// Buffer, String.fromCodePoint inválido…). Os try/catch portados do TS pegam
/// QUALQUER erro, então o tipo só importa para quem quiser diagnosticar.
/// </summary>
public sealed class JsRangeError : Exception
{
    public JsRangeError(string message) : base(message) { }
}

/// <summary>
/// Semântica ECMAScript usada pelo parser de fontes e pelo índice de fontes do
/// sistema: Math.round, Number::toString, String.fromCodePoint,
/// String.prototype.toLowerCase/trim. Cópia mínima de OfficeNext.Core.JsNumber
/// (sem referência de projeto) + o que é de texto.
/// </summary>
internal static class JsCompat
{
    // ─────────────────────────── Math.round ───────────────────────────

    /// <summary>Math.round do JS: metade vai para +∞; (-0.5, 0) → -0.</summary>
    public static double MathRound(double x)
    {
        double floor = Math.Floor(x);
        double frac = x - floor;
        double r = frac < 0.5 ? floor : floor + 1; // NaN/±∞: frac = NaN → floor + 1 (= x)
        if (r == 0 && (x < 0 || double.IsNegative(x))) return -0.0;
        return r;
    }

    // ─────────────────────────── Number::toString ───────────────────────────

    /// <summary>Number::toString(10) do ECMAScript (shortest round-trip) — usado
    /// em `String(sizePt)` (chave da tabela empírica de advances).</summary>
    public static string NumberToString(double x)
    {
        if (double.IsNaN(x)) return "NaN";
        if (x == 0) return "0";
        if (double.IsPositiveInfinity(x)) return "Infinity";
        if (double.IsNegativeInfinity(x)) return "-Infinity";
        string sign = x < 0 ? "-" : "";
        double a = Math.Abs(x);
        // .NET Core 3.0+: "R" = menor representação com round-trip (mesmos dígitos
        // que o JS escolhe); só o formato difere — normalizado abaixo.
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

    /// <summary>Saída "R" do .NET → (dígitos sem zeros nas pontas, n), valor = 0.dígitos × 10^n.</summary>
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
        int lead = 0;
        while (lead < digits.Length - 1 && digits[lead] == '0') lead++;
        n -= lead;
        digits = digits[lead..].TrimEnd('0');
        if (digits.Length == 0) { digits = "0"; n = 1; }
        return (digits, n);
    }

    // ─────────────────────────── String.fromCodePoint ───────────────────────────

    /// <summary>String.fromCodePoint: RangeError fora de 0..0x10FFFF; surrogates
    /// isolados viram um code unit (char.ConvertFromUtf32 lançaria).</summary>
    public static string FromCodePoint(int cp)
    {
        if (cp < 0 || cp > 0x10FFFF) throw new JsRangeError($"Invalid code point {cp}");
        if (cp <= 0xFFFF) return ((char)cp).ToString();
        int v = cp - 0x10000;
        return new string([(char)(0xD800 + (v >> 10)), (char)(0xDC00 + (v & 0x3FF))]);
    }

    // ─────────────────────────── String.prototype.trim ───────────────────────────

    /// <summary>WhiteSpace + LineTerminator do ECMAScript (≠ char.IsWhiteSpace:
    /// o JS inclui U+FEFF e não inclui U+0085).</summary>
    public static bool IsJsSpace(char c) =>
        c is '\t' or '\n' or '\v' or '\f' or '\r' or ' ' or '\u00A0' or '\u1680'
            or '\u2028' or '\u2029' or '\u202F' or '\u205F' or '\u3000' or '\uFEFF'
        || (c >= '\u2000' && c <= '\u200A');

    public static string Trim(string s)
    {
        int a = 0, b = s.Length;
        while (a < b && IsJsSpace(s[a])) a++;
        while (b > a && IsJsSpace(s[b - 1])) b--;
        return a == 0 && b == s.Length ? s : s[a..b];
    }

    // ─────────────────────────── String.prototype.toLowerCase ───────────────────────────

    /// <summary>
    /// toLowerCase do JS (independente de locale): mapeamento simples do Unicode +
    /// os dois casos especiais incondicionais/independentes de idioma do
    /// SpecialCasing — U+0130 → "i̇" e o sigma final (Σ → ς no fim de palavra).
    /// </summary>
    public static string ToLowerCase(string s)
    {
        bool ascii = true;
        foreach (char c in s) if (c >= 0x80) { ascii = false; break; }
        if (ascii) return s.ToLowerInvariant();
        var sb = new StringBuilder(s.Length);
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if (c == '\u0130') { sb.Append("i\u0307"); continue; }
            if (c == '\u03A3') { sb.Append(IsFinalSigma(s, i) ? '\u03C2' : '\u03C3'); continue; }
            if (char.IsHighSurrogate(c) && i + 1 < s.Length && char.IsLowSurrogate(s[i + 1]))
            {
                sb.Append(s.Substring(i, 2).ToLowerInvariant());
                i++;
                continue;
            }
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }

    /// <summary>Final_Sigma: precedido por letra "cased" (pulando case-ignorable) e
    /// NÃO seguido por letra "cased" (idem). Cased/Case_Ignorable aproximados pela
    /// categoria geral (Lu/Ll/Lt; Mn/Me/Cf/Lm/Sk + MidLetter) — basta para nomes de
    /// família; o ICU do V8 usa as propriedades completas.</summary>
    private static bool IsFinalSigma(string s, int i)
    {
        int j = i - 1;
        while (j >= 0 && IsCaseIgnorable(s, j)) j--;
        if (j < 0 || !IsCased(s, j)) return false;
        int k = i + 1;
        while (k < s.Length && IsCaseIgnorable(s, k)) k++;
        return k >= s.Length || !IsCased(s, k);
    }

    private static bool IsCased(string s, int i)
    {
        var cat = CharUnicodeInfo.GetUnicodeCategory(s, i);
        return cat is UnicodeCategory.UppercaseLetter or UnicodeCategory.LowercaseLetter
            or UnicodeCategory.TitlecaseLetter;
    }

    private static bool IsCaseIgnorable(string s, int i)
    {
        char c = s[i];
        // Word_Break MidLetter/MidNumLet/Single_Quote (case-ignorable por definição)
        if (c is '\'' or '.' or ':' or '\u00B7' or '\u0387' or '\u05F4' or '\u2018' or '\u2019'
            or '\u2024' or '\u2027' or '\uFE13' or '\uFE52' or '\uFE55' or '\uFF07' or '\uFF0E' or '\uFF1A')
            return true;
        var cat = CharUnicodeInfo.GetUnicodeCategory(s, i);
        return cat is UnicodeCategory.NonSpacingMark or UnicodeCategory.EnclosingMark
            or UnicodeCategory.Format or UnicodeCategory.ModifierLetter or UnicodeCategory.ModifierSymbol;
    }

    // ─────────────────────────── RegExp (ASCII, /i sem /u) ───────────────────────────

    /// <summary>\w do JS sem a flag u: [A-Za-z0-9_].</summary>
    public static bool IsAsciiWordChar(char c) =>
        (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';

    /// <summary>Compara s[at..] com <paramref name="lower"/> (minúsculas ASCII) sem
    /// diferenciar caixa — o /i do JS sem /u não casa não-ASCII com ASCII.</summary>
    public static bool MatchAsciiCI(string s, int at, string lower)
    {
        if (at < 0 || at + lower.Length > s.Length) return false;
        for (int k = 0; k < lower.Length; k++)
        {
            char c = s[at + k];
            if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
            if (c != lower[k]) return false;
        }
        return true;
    }

    /// <summary>/needle/i.test(s) para needle ASCII em minúsculas.</summary>
    public static bool ContainsAsciiCI(string s, string lower)
    {
        for (int i = 0; i + lower.Length <= s.Length; i++)
            if (MatchAsciiCI(s, i, lower)) return true;
        return false;
    }

    /// <summary>/\bword\b/i.test(s) para word ASCII de caracteres de palavra.</summary>
    public static bool ContainsWordAsciiCI(string s, string lower)
    {
        for (int i = 0; i + lower.Length <= s.Length; i++)
        {
            if (!MatchAsciiCI(s, i, lower)) continue;
            bool before = i == 0 || !IsAsciiWordChar(s[i - 1]);
            int end = i + lower.Length;
            bool after = end == s.Length || !IsAsciiWordChar(s[end]);
            if (before && after) return true;
        }
        return false;
    }
}

/// <summary>
/// path.win32.join/normalize do Node (lib/path.js) — os caminhos entram na chave
/// das faces (`…|C:\WINDOWS\Fonts\arial.ttf#0`), então têm de sair idênticos.
/// </summary>
internal static class JsPath
{
    private static bool IsSep(char c) => c == '/' || c == '\\';
    private static bool IsDeviceRoot(char c) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');

    public static string Join(params string[] args)
    {
        if (args.Length == 0) return ".";
        string? joined = null;
        string? firstPart = null;
        foreach (string arg in args)
        {
            if (arg.Length > 0)
            {
                if (joined == null) joined = firstPart = arg;
                else joined += "\\" + arg;
            }
        }
        if (joined == null || firstPart == null) return ".";

        // não deixar o caminho começar com duas barras (normalize() acharia que é
        // UNC), salvo se a 1ª parte for claramente UNC (2 barras + não-barra)
        bool needsReplace = true;
        int slashCount = 0;
        if (IsSep(firstPart[0]))
        {
            ++slashCount;
            int firstLen = firstPart.Length;
            if (firstLen > 1 && IsSep(firstPart[1]))
            {
                ++slashCount;
                if (firstLen > 2)
                {
                    if (IsSep(firstPart[2])) ++slashCount;
                    else needsReplace = false;
                }
            }
        }
        if (needsReplace)
        {
            while (slashCount < joined.Length && IsSep(joined[slashCount])) slashCount++;
            if (slashCount >= 2) joined = "\\" + joined[slashCount..];
        }
        return Normalize(joined);
    }

    public static string Normalize(string path)
    {
        int len = path.Length;
        if (len == 0) return ".";
        int rootEnd = 0;
        string? device = null;
        bool isAbsolute = false;
        char code = path[0];

        if (len == 1) return code == '/' ? "\\" : path;
        if (IsSep(code))
        {
            // possível raiz UNC; começa com separador ⇒ absoluto de algum tipo
            isAbsolute = true;
            if (IsSep(path[1]))
            {
                int j = 2;
                int last = j;
                while (j < len && !IsSep(path[j])) j++;
                if (j < len && j != last)
                {
                    string firstPart = path[last..j];
                    last = j;
                    while (j < len && IsSep(path[j])) j++;
                    if (j < len && j != last)
                    {
                        last = j;
                        while (j < len && !IsSep(path[j])) j++;
                        if (j == len || j != last)
                        {
                            if (firstPart == "." || firstPart == "?")
                            {
                                device = "\\\\" + firstPart; // raiz de dispositivo (\\.\X)
                                rootEnd = 4;
                            }
                            else if (j == len)
                            {
                                // só a raiz UNC: nada mais a processar
                                return "\\\\" + firstPart + "\\" + path[last..] + "\\";
                            }
                            else
                            {
                                device = "\\\\" + firstPart + "\\" + path[last..j];
                                rootEnd = j;
                            }
                        }
                    }
                }
            }
            else rootEnd = 1;
        }
        else if (IsDeviceRoot(code) && path[1] == ':')
        {
            device = path[..2];
            rootEnd = 2;
            if (len > 2 && IsSep(path[2]))
            {
                isAbsolute = true;
                rootEnd = 3;
            }
        }

        string tail = rootEnd < len ? NormalizeString(path[rootEnd..], !isAbsolute) : "";
        if (tail.Length == 0 && !isAbsolute) tail = ".";
        if (tail.Length > 0 && IsSep(path[len - 1])) tail += "\\";
        if (!isAbsolute && device == null && path.Contains(':'))
        {
            // CVE-2024-36139: o tail relativo não pode virar algo que o Windows leia como absoluto
            if (tail.Length >= 2 && IsDeviceRoot(tail[0]) && tail[1] == ':') return ".\\" + tail;
            int index = path.IndexOf(':');
            do
            {
                if (index == len - 1 || IsSep(path[index + 1])) return ".\\" + tail;
            } while ((index = path.IndexOf(':', index + 1)) != -1);
        }
        if (device == null) return isAbsolute ? "\\" + tail : tail;
        return isAbsolute ? device + "\\" + tail : device + tail;
    }

    /// <summary>normalizeString do Node: resolve '.'/'..' e colapsa separadores.</summary>
    private static string NormalizeString(string path, bool allowAboveRoot)
    {
        const char separator = '\\';
        string res = "";
        int lastSegmentLength = 0;
        int lastSlash = -1;
        int dots = 0;
        char code = '\0';
        for (int i = 0; i <= path.Length; ++i)
        {
            if (i < path.Length) code = path[i];
            else if (IsSep(code)) break;
            else code = '/';

            if (IsSep(code))
            {
                if (lastSlash == i - 1 || dots == 1)
                {
                    // NOOP
                }
                else if (dots == 2)
                {
                    if (res.Length < 2 || lastSegmentLength != 2 || res[^1] != '.' || res[^2] != '.')
                    {
                        if (res.Length > 2)
                        {
                            int lastSlashIndex = res.LastIndexOf(separator);
                            if (lastSlashIndex == -1)
                            {
                                res = "";
                                lastSegmentLength = 0;
                            }
                            else
                            {
                                res = res[..lastSlashIndex];
                                lastSegmentLength = res.Length - 1 - res.LastIndexOf(separator);
                            }
                            lastSlash = i;
                            dots = 0;
                            continue;
                        }
                        else if (res.Length != 0)
                        {
                            res = "";
                            lastSegmentLength = 0;
                            lastSlash = i;
                            dots = 0;
                            continue;
                        }
                    }
                    if (allowAboveRoot)
                    {
                        res += res.Length > 0 ? separator + ".." : "..";
                        lastSegmentLength = 2;
                    }
                }
                else
                {
                    if (res.Length > 0) res += separator + path[(lastSlash + 1)..i];
                    else res = path[(lastSlash + 1)..i];
                    lastSegmentLength = i - lastSlash - 1;
                }
                lastSlash = i;
                dots = 0;
            }
            else if (code == '.' && dots != -1)
            {
                ++dots;
            }
            else
            {
                dots = -1;
            }
        }
        return res;
    }
}
