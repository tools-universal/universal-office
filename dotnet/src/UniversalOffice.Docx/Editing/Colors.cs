using System.Globalization;
using System.Text.RegularExpressions;

namespace UniversalOffice.Docx.Editing;

/// <summary>Cores CSS (hex, rgb(), nomes básicos) → "RRGGBB" do OOXML.</summary>
internal static class Colors
{
    private static readonly Regex Rgb = new(@"^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[0-9.]+\s*)?\)$", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private static readonly Dictionary<string, string> Named = new(StringComparer.OrdinalIgnoreCase)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "008000", ["blue"] = "0000FF",
        ["yellow"] = "FFFF00", ["orange"] = "FFA500", ["purple"] = "800080", ["gray"] = "808080", ["grey"] = "808080",
        ["silver"] = "C0C0C0", ["maroon"] = "800000", ["olive"] = "808000", ["lime"] = "00FF00", ["aqua"] = "00FFFF",
        ["cyan"] = "00FFFF", ["teal"] = "008080", ["navy"] = "000080", ["fuchsia"] = "FF00FF", ["magenta"] = "FF00FF",
    };

    /// <summary>"RRGGBB" maiúsculo, ou null se não for uma cor reconhecida.</summary>
    public static string? NormalizeHex(string? css)
    {
        if (string.IsNullOrWhiteSpace(css)) return null;
        string v = css.Trim();
        if (Named.TryGetValue(v, out var named)) return named;
        var m = Rgb.Match(v);
        if (m.Success)
        {
            var parts = new[] { m.Groups[1].Value, m.Groups[2].Value, m.Groups[3].Value }
                .Select(x => Math.Clamp(int.Parse(x, CultureInfo.InvariantCulture), 0, 255).ToString("X2", CultureInfo.InvariantCulture));
            return string.Concat(parts);
        }
        if (v.StartsWith('#')) v = v[1..];
        if (v.Length == 3 && v.All(Uri.IsHexDigit)) return string.Concat(v.Select(c => new string(char.ToUpperInvariant(c), 2)));
        if (v.Length == 6 && v.All(Uri.IsHexDigit)) return v.ToUpperInvariant();
        return null;
    }
}
