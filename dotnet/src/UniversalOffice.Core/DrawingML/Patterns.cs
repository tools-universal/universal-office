using System.Globalization;

namespace UniversalOffice.DrawingML;

/// <summary>
/// Padrões predefinidos do DrawingML (<c>&lt;a:pattFill prst&gt;</c>, ST_PresetPatternVal) —
/// porta de shared/drawingml/src/patterns.ts: bitmap 8×8 (bit 7 = coluna 0; 1 = cor de
/// frente) de cada um, EXTRAÍDO do app de referência (render a 96 dpi: 1 pixel do padrão =
/// 1/96 pol, escala com o zoom). A tabela (hex, chave = predefinição) é lida do PRÓPRIO
/// patterns.ts embutido como recurso.
/// </summary>
public static class Patterns
{
    private static readonly Lazy<Dictionary<string, string>> Table = new(() => TsResource.StringTable("patterns.ts"));

    /// <summary>Predefinição → 16 dígitos hex (8 linhas de 1 byte).</summary>
    public static IReadOnlyDictionary<string, string> PresetPatterns => Table.Value;

    /// <summary>Fração de pixels de frente do padrão (cor média de fallback).</summary>
    public static double PatternDensity(string prst)
    {
        if (!Table.Value.TryGetValue(prst, out var hex)) return 0.5;
        int n = 0;
        for (int i = 0; i < 16; i += 2)
        {
            int b = int.Parse(hex.AsSpan(i, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            while (b != 0) { n += b & 1; b >>= 1; }
        }
        return n / 64.0;
    }

    /// <summary>Linhas do padrão (8 bytes); nulo = predefinição desconhecida.</summary>
    public static int[]? PatternRows(string prst)
    {
        if (!Table.Value.TryGetValue(prst, out var hex)) return null;
        var outp = new int[8];
        for (int i = 0; i < 8; i++) outp[i] = int.Parse(hex.AsSpan(i * 2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        return outp;
    }
}
