namespace OfficeNext.DrawingML;

/// <summary>Subcaminhos de uma forma: preenchido (false = só traço) e traçado, por subcaminho.</summary>
public sealed class Outline
{
    public List<List<PathSeg>> Subs { get; init; } = new();
    public List<bool> Fill { get; init; } = new();
    public List<bool> Stroke { get; init; } = new();
}

/// <summary>
/// Contorno de uma forma predefinida pelas definições OFICIAIS
/// (presetShapeDefinitions.xml) — para recortar imagem (Cortar para Forma), o
/// contorno da imagem e a silhueta dos efeitos. Porta de shared/drawingml/src/outline.ts.
/// </summary>
public static class PresetOutline
{
    private static Outline Rect(double w, double h) => new()
    {
        Subs = { new List<PathSeg> { PathSeg.M(0, 0), PathSeg.L(w, 0), PathSeg.L(w, h), PathSeg.L(0, h), PathSeg.Z } },
        Fill = { true },
        Stroke = { true },
    };

    /// <summary>Subcaminhos da forma <paramref name="prst"/> no retângulo w×h (unidades do
    /// chamador). Ajustes pelo nome (a:gd).</summary>
    public static Outline Of(string? prst, double w, double h, IReadOnlyDictionary<string, double>? adj = null)
    {
        if (string.IsNullOrEmpty(prst) || prst == "rect") return Rect(w, h);
        var names = adj?.Keys.ToList();
        var g = PresetEngine.EvalPreset(prst, w, h, names?.Select(n => adj![n]).ToList(), names);
        if (g is null || g.Subs.Count == 0) return Rect(w, h);
        return new Outline { Subs = g.Subs, Fill = g.Fill.Select(f => f is not null).ToList(), Stroke = g.Stroke };
    }
}
