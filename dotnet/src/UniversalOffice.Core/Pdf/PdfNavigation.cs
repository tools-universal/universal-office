using System.Text;

namespace UniversalOffice.Pdf;

/// <summary>
/// Área clicável de uma página (anotação /Link). Coordenadas em pt com a origem
/// no TOPO da página, como o resto da API de desenho. Alvo: <paramref name="Uri"/>
/// (só http, https e mailto — o resto é descartado) ou um destino interno
/// (<paramref name="PageIndex"/>, topo <paramref name="DestTopPt"/>).
/// </summary>
public sealed record PdfLink(double XPt, double YTopPt, double WPt, double HPt, string? Uri = null, int? PageIndex = null, double DestTopPt = 0);

/// <summary>Marcador do painel de navegação (/Outlines): título, nível (1 = raiz), página e topo (pt).</summary>
public sealed record PdfOutlineItem(string Title, int Level, int PageIndex, double TopPt);

/// <summary>Cadeias e endereços dos objetos de navegação (ISO 32000-1 §7.9.2, §12.3.3, §12.6.4.7).</summary>
internal static class PdfNavigationText
{
    /// <summary>Endereço aceito no /URI: http(s) e mailto, com espaço e não-ASCII em %XX; nulo se outro esquema.</summary>
    public static string? SafeUri(string? uri)
    {
        if (string.IsNullOrWhiteSpace(uri)) return null;
        string u = uri.Trim();
        if (!(u.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || u.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase))) return null;
        var sb = new StringBuilder(u.Length);
        foreach (byte b in Encoding.UTF8.GetBytes(u))
        {
            if (b <= 0x20 || b >= 0x7F || b == (byte)'"' || b == (byte)'<' || b == (byte)'>') sb.Append('%').Append(b.ToString("X2"));
            else if (b == (byte)'(' || b == (byte)')' || b == (byte)'\\') sb.Append('\\').Append((char)b);
            else sb.Append((char)b);
        }
        return sb.ToString();
    }

    /// <summary>Cadeia de texto em UTF-16BE com BOM, em hexadecimal (qualquer caractere, sem escapes).</summary>
    public static string TextString(string s)
    {
        var sb = new StringBuilder("<FEFF", 6 + s.Length * 4);
        foreach (char c in s) sb.Append(((int)c).ToString("X4"));
        return sb.Append('>').ToString();
    }
}
