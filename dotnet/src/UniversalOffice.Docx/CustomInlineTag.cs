using System.Text.Json;
using System.Text.RegularExpressions;

namespace UniversalOffice.Docx;

/// <summary>
/// Contrato do inline de plugin no .docx (porta de docx-core/src/serialize.ts e
/// document.ts): um w:sdt cujo w:tag é <c>wordnext:inline:&lt;tipo&gt;:&lt;json com
/// encodeURIComponent&gt;</c> e cujo conteúdo é o texto de reserva. Público para
/// quem lê ou grava esses controles por outra biblioteca (o hospedeiro no
/// servidor) sem repetir o formato.
/// </summary>
public static class CustomInlineTag
{
    public const string Prefix = "wordnext:inline:";
    private static readonly Regex TypeRe = new(@"^[a-zA-Z0-9._-]+\z", RegexOptions.CultureInvariant);

    /// <summary>Tipo e JSON do payload, ou falso se o w:tag não é de inline de plugin (ou o JSON não é válido).</summary>
    public static bool TryParse(string? tag, out string type, out string json)
    {
        type = json = "";
        if (tag is null || !tag.StartsWith(Prefix, StringComparison.Ordinal)) return false;
        string payload = tag[Prefix.Length..];
        int split = payload.IndexOf(':');
        if (split <= 0 || !TypeRe.IsMatch(payload[..split])) return false;
        try
        {
            string decoded = Uri.UnescapeDataString(payload[(split + 1)..]);
            using var _ = JsonDocument.Parse(decoded);
            type = payload[..split];
            json = decoded;
            return true;
        }
        catch (Exception e) when (e is JsonException or UriFormatException)
        {
            return false;
        }
    }

    /// <summary>w:tag de um inline do tipo <paramref name="type"/> com o payload JSON <paramref name="json"/>.</summary>
    public static string Format(string type, string json)
    {
        if (!TypeRe.IsMatch(type)) throw new ArgumentException($"tipo de inline inválido: {type}", nameof(type));
        using var _ = JsonDocument.Parse(json);
        return Prefix + type + ":" + Uri.EscapeDataString(json);
    }
}
