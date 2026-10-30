using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Campos DATE/TIME do Word: imagem de data/hora (\@ "…") e formatos de texto
/// (\* Upper/Lower/FirstCap/Caps) — porta de docx-layout/src/datefmt.ts. O Word
/// recalcula DATE e TIME ao exportar/imprimir — o valor é o "agora" desse
/// momento (LayoutOptions.Now).
/// </summary>
public static class DateFmt
{
    private sealed record Names(string[] Months, string[] MonthsShort, string[] Days, string[] DaysShort, string Date, string Time);

    private static readonly Names PT = new(
        new[] { "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" },
        new[] { "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez" },
        new[] { "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado" },
        new[] { "dom", "seg", "ter", "qua", "qui", "sex", "sáb" },
        "dd/MM/yyyy", "HH:mm");

    private static readonly Names EN = new(
        new[] { "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" },
        new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" },
        new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" },
        new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" },
        "M/d/yyyy", "h:mm am/pm");

    private static Names For(string lang) => lang.ToLowerInvariant().StartsWith("en", StringComparison.Ordinal) ? EN : PT;

    private static string Pad(int n, int w) => n.ToString(CultureInfo.InvariantCulture).PadLeft(w, '0');
    private static string S(int n) => n.ToString(CultureInfo.InvariantCulture);

    /// <summary>Formata `d` com a imagem de data/hora do Word.</summary>
    public static string FormatWordDate(DateTime d, string picture, string lang = "pt-BR")
    {
        var L = For(lang);
        var outp = new StringBuilder();
        int i = 0;
        int Run(char ch) { int n = 0; while (i + n < picture.Length && picture[i + n] == ch) n++; return n; }
        while (i < picture.Length)
        {
            char c = picture[i];
            if (c == '\'')
            {
                int j = picture.IndexOf('\'', i + 1);
                outp.Append(j < 0 ? picture[(i + 1)..] : picture[(i + 1)..j]);
                i = j < 0 ? picture.Length : j + 1;
                continue;
            }
            string lower = picture.Substring(i, Math.Min(5, picture.Length - i)).ToLowerInvariant();
            if (lower == "am/pm")
            {
                // o designador do idioma, em qualquer caixa da imagem: "PM" em inglês,
                // vazio em pt-BR (o Windows não tem AM/PM no pt-BR) — oráculo hf-lab
                outp.Append(ReferenceEquals(L, EN) ? (d.Hour >= 12 ? "PM" : "AM") : "");
                i += 5;
                continue;
            }
            int day = (int)d.DayOfWeek;
            if (c is 'd' or 'D')
            {
                int n = Run(c);
                outp.Append(n >= 4 ? L.Days[day] : n == 3 ? L.DaysShort[day] : n == 2 ? Pad(d.Day, 2) : S(d.Day));
                i += n; continue;
            }
            if (c == 'M')
            {
                int n = Run(c);
                outp.Append(n >= 4 ? L.Months[d.Month - 1] : n == 3 ? L.MonthsShort[d.Month - 1] : n == 2 ? Pad(d.Month, 2) : S(d.Month));
                i += n; continue;
            }
            if (c is 'y' or 'Y')
            {
                int n = Run(c);
                outp.Append(n >= 3 ? S(d.Year) : Pad(d.Year % 100, 2));
                i += n; continue;
            }
            if (c == 'H')
            {
                int n = Run(c);
                outp.Append(n >= 2 ? Pad(d.Hour, 2) : S(d.Hour));
                i += n; continue;
            }
            if (c == 'h')
            {
                int n = Run(c);
                int h = d.Hour % 12 == 0 ? 12 : d.Hour % 12;
                outp.Append(n >= 2 ? Pad(h, 2) : S(h));
                i += n; continue;
            }
            if (c == 'm')
            {
                int n = Run(c);
                outp.Append(n >= 2 ? Pad(d.Minute, 2) : S(d.Minute));
                i += n; continue;
            }
            if (c is 's' or 'S')
            {
                int n = Run(c);
                outp.Append(n >= 2 ? Pad(d.Second, 2) : S(d.Second));
                i += n; continue;
            }
            outp.Append(c);
            i++;
        }
        return outp.ToString();
    }

    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);
    private static readonly Regex PictureRe = new(@"\\@\s*(?:""([^""]*)""|(\S+))", RegexOptions.CultureInvariant);
    private static readonly Regex FormatRe = new(@"\\\*\s*([A-Za-z0-9_]+)", RegexOptions.CultureInvariant);
    private static readonly Regex CapsRe = new(@"(^|\s)(\S)", RegexOptions.CultureInvariant);

    /// <summary>Valor de um campo DATE/TIME (instrução completa) no instante `now`.</summary>
    public static string DateFieldValue(string instr, DateTime now, string lang = "pt-BR")
    {
        string name = Js.ToUpper(WsRe.Split(instr.Trim())[0]);
        var L = For(lang);
        var m = PictureRe.Match(instr);
        string picture = m.Success ? (m.Groups[1].Success ? m.Groups[1].Value : m.Groups[2].Success ? m.Groups[2].Value : "") : name == "TIME" ? L.Time : L.Date;
        string v = FormatWordDate(now, picture, lang);
        foreach (Match f in FormatRe.Matches(instr))
        {
            string k = f.Groups[1].Value.ToLowerInvariant();
            if (k == "upper") v = Js.ToUpper(v);
            else if (k == "lower") v = Js.ToLower(v);
            else if (k == "firstcap") v = v.Length > 0 ? Js.ToUpper(v[..1]) + v[1..] : v;
            else if (k == "caps") v = CapsRe.Replace(v, mm => mm.Groups[1].Value + Js.ToUpper(mm.Groups[2].Value));
        }
        return v;
    }

    private static readonly Regex DateOnlyRe = new(@"^[+-]?\d{4,6}(-\d{2}(-\d{2})?)?$", RegexOptions.CultureInvariant);

    /// <summary>new Date(iso) do JS → hora local; nulo se inválida. Só data = UTC; data e
    /// hora sem fuso = hora local (regra do Date.parse para ISO).</summary>
    public static DateTime? ParseIsoLocal(string? iso)
    {
        if (string.IsNullOrEmpty(iso)) return null;
        var style = DateOnlyRe.IsMatch(iso) ? DateTimeStyles.AssumeUniversal : DateTimeStyles.AssumeLocal;
        if (!DateTimeOffset.TryParse(iso, CultureInfo.InvariantCulture, style, out var dto)) return null;
        return dto.LocalDateTime;
    }
}
