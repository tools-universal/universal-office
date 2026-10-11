namespace OfficeNext.Layout;

/// <summary>
/// Métricas de uma face SFNT (porta de FontMetrics em layout/src/font/sfnt.ts).
/// Valores em unidades da fonte, como lidos das tabelas (double para não haver
/// divisão inteira nas contas do motor — no JS tudo é number).
/// </summary>
public sealed class FontMetrics
{
    public double UnitsPerEm;
    /// <summary>hhea</summary>
    public double Ascender;
    /// <summary>hhea (negativo)</summary>
    public double Descender;
    public double LineGap;
    /// <summary>OS/2</summary>
    public double UsWinAscent;
    /// <summary>OS/2 (positivo)</summary>
    public double UsWinDescent;
    public double STypoAscender;
    public double STypoDescender;
    public double STypoLineGap;
    /// <summary>OS/2 fsSelection (bit 7 = USE_TYPO_METRICS).</summary>
    public int FsSelection;
    /// <summary>post: posição (negativa = abaixo da baseline) e espessura do sublinhado.</summary>
    public double UnderlinePosition;
    public double UnderlineThickness;
}

/// <summary>Fonte usada pelo layout (porta de LayoutFont em layout/src/font/layout-font.ts).</summary>
public interface ILayoutFont
{
    FontMetrics Metrics { get; }
    /// <summary>Advance de um code point em TWIPS para um tamanho em pontos.</summary>
    double AdvanceTwips(int codePoint, double sizePt);
    /// <summary>Ajuste de kerning do par (prev → cur) em TWIPS.</summary>
    double KernTwips(int prevCodePoint, int codePoint, double sizePt);
    int GlyphId(int codePoint);
    /// <summary>Advance width do glifo em unidades da fonte.</summary>
    double AdvanceWidth(int glyphId);
}
