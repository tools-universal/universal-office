using System.Collections.Concurrent;
using System.Text.Json;

namespace OfficeNext.Layout;

/// <summary>
/// Hifenização automática: padrões de Liang por idioma, gerados de hyph-utf8 (ver
/// Hyphen/patterns/THIRD-PARTY-NOTICES.md) e embutidos como recurso — carregados na
/// 1ª vez que um idioma é pedido (o JS carrega sob demanda com import dinâmico antes
/// de diagramar; aqui a leitura é síncrona). Porta de write/packages/layout/src/hyphen/index.ts.
/// </summary>
public static class Hyphenation
{
    /// <summary>Todos os ids com padrões disponíveis.</summary>
    public static readonly IReadOnlyList<string> PatternIds = new[] { "pt", "en-us", "es", "fr", "de-1996", "it", "nl" };

    private static readonly ConcurrentDictionary<string, Hyphenator?> Loaded = new(StringComparer.Ordinal);

    /// <summary>
    /// Padrões para uma etiqueta de idioma (BCP 47, como em w:lang): 'pt-BR' → 'pt'. Todo
    /// inglês usa os americanos: o Word hifeniza en-US, en-GB e en-AU com os MESMOS pontos.
    /// </summary>
    public static string? PatternId(string? lang)
    {
        if (string.IsNullOrEmpty(lang)) return null;
        string b = lang.ToLowerInvariant().Split('-', '_')[0];
        return b switch
        {
            "pt" => "pt",
            "es" => "es",
            "fr" => "fr",
            "de" => "de-1996",
            "it" => "it",
            "nl" => "nl",
            "en" => "en-us",
            _ => null,
        };
    }

    /// <summary>Registra padrões já em memória (testes).</summary>
    public static Hyphenator Register(HyphenationPatterns data)
    {
        var h = new Hyphenator(data);
        Loaded[data.Id] = h;
        return h;
    }

    /// <summary>Hifenizador do idioma (null sem padrões).</summary>
    public static Hyphenator? For(string? lang)
    {
        string? id = PatternId(lang);
        return id is null ? null : Loaded.GetOrAdd(id, Load);
    }

    private static Hyphenator? Load(string id)
    {
        using var s = typeof(Hyphenation).Assembly.GetManifestResourceStream($"hyphen.{id}.json");
        if (s is null) return null;
        using var doc = JsonDocument.Parse(s);
        var r = doc.RootElement;
        return new Hyphenator(new HyphenationPatterns
        {
            Id = r.GetProperty("id").GetString() ?? id,
            Left = r.GetProperty("left").GetInt32(),
            Right = r.GetProperty("right").GetInt32(),
            Patterns = r.GetProperty("patterns").GetString() ?? "",
            Exceptions = r.TryGetProperty("exceptions", out var ex) ? ex.GetString() ?? "" : "",
        });
    }
}
