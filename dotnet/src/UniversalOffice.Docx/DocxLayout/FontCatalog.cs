using System.Reflection;
using System.Text.RegularExpressions;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Catálogo de fontes da suíte lido do PRÓPRIO shared/fonts/src/catalog.ts
/// (recurso embutido, como o DrawingML faz com as tabelas dele): a fonte padrão
/// (DEFAULT_FAMILY) e as substitutas métrico-compatíveis (METRIC_SUBSTITUTES) —
/// uma fonte só para os web components e o servidor.
/// </summary>
public static class FontCatalog
{
    private const string ResourceName = "fonts-catalog.ts";
    private static readonly Regex Entry = new(@"^\s+'?([^':]+?)'?:\s*'([^']+)',?\s*(//.*)?$", RegexOptions.CultureInvariant);
    private static readonly Regex Default = new(@"^export const DEFAULT_FAMILY = '([^']+)';", RegexOptions.CultureInvariant);
    private static readonly Lazy<(string Default, Dictionary<string, string> Substitutes)> Data = new(Read);

    /// <summary>Fonte padrão (fallback final): aberta e métrico-compatível com a Arial.</summary>
    public static string DefaultFamily => Data.Value.Default;

    /// <summary>Substituta métrico-compatível da família (ou nulo): Calibri → Carlito…</summary>
    public static string? MetricSubstitute(string family) =>
        Data.Value.Substitutes.TryGetValue(family.Trim().ToLowerInvariant(), out var sub) ? sub : null;

    private static (string, Dictionary<string, string>) Read()
    {
        using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"{ResourceName} não embutido em UniversalOffice.Docx");
        using var rd = new StreamReader(s);
        var subs = new Dictionary<string, string>(StringComparer.Ordinal);
        string def = "Liberation Sans";
        bool inSubs = false;
        string? line;
        while ((line = rd.ReadLine()) is not null)
        {
            if (Default.Match(line) is { Success: true } d) def = d.Groups[1].Value;
            if (line.StartsWith("export const METRIC_SUBSTITUTES", StringComparison.Ordinal)) { inSubs = true; continue; }
            if (!inSubs) continue;
            if (line.StartsWith("};", StringComparison.Ordinal)) break;
            if (Entry.Match(line) is { Success: true } m) subs[m.Groups[1].Value.ToLowerInvariant()] = m.Groups[2].Value;
        }
        return (def, subs);
    }
}
