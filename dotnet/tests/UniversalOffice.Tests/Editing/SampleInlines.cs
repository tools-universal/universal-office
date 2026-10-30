using System.Text.Json;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Validação dos inlines de um aplicativo de exemplo (<c>sample.tag</c>, etiqueta de
/// dados do usuário, e <c>sample.item-link</c>, link para outro item), no formato que um
/// hospedeiro passa ao saneamento em <c>IsCustomInlineValid</c>. Tipos de outros
/// plugins passam.
/// </summary>
internal static class SampleInlines
{
    private static readonly HashSet<string> Tags = ["userDisplayName", "userDepartment", "userEmail", "userManager"];
    private static readonly HashSet<string> ItemTypes = ["document", "form", "training"];

    public static bool IsValid(string type, string json)
    {
        if (!type.StartsWith("sample.", StringComparison.Ordinal)) return true;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("v", out var v) || v.ValueKind != JsonValueKind.Number || v.GetInt32() != 1) return false;
            return type switch
            {
                "sample.tag" => root.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String && Tags.Contains(n.GetString()!),
                "sample.item-link" =>
                    root.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String && ItemTypes.Contains(t.GetString()!)
                    && root.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.Number && id.TryGetInt32(out var i) && i > 0
                    && root.TryGetProperty("title", out var title) && title.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(title.GetString())
                    && (!root.TryGetProperty("page", out var page) || page.ValueKind == JsonValueKind.Null || (page.TryGetInt32(out var p) && p > 0)),
                _ => false,
            };
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
