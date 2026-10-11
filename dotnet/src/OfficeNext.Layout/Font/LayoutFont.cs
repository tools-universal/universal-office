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
    /// <summary>OS/2 ulCodePageRange1 (bits 17–21 = páginas de código do Leste Asiático).</summary>
    public long CodePageRange1;
    /// <summary>OS/2 ySuperscriptYOffset (deslocamento do sobrescrito, unidades da fonte); nulo sem o campo.</summary>
    public double? YSuperscriptYOffset;
    /// <summary>OS/2 xAvgCharWidth (largura média dos caracteres, unidades da fonte) — a
    /// compressão de espaços do layout asiático dos modos ≤ 14 (docx-layout).</summary>
    public double? XAvgCharWidth;
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
    /// <summary>Kerning do par de glifos (g1 → g2) em TWIPS (pares com glifo de ligadura);
    /// opcional no JS (kernGlyphsTwips?) — sem ele, 0.</summary>
    double KernGlyphsTwips(long g1, long g2, double sizePt) => 0;
    /// <summary>Ligaduras OpenType (GSUB) das features pedidas: grupos {glifo, nº de glifos de
    /// entrada}; nulo se a fonte não tem nenhuma (opcional no JS: ligate?).</summary>
    IReadOnlyList<(int Gid, int Len)>? Ligate(IReadOnlyList<int> gids, IReadOnlyList<string> features) => null;
    int GlyphId(int codePoint);
    /// <summary>Advance width do glifo em unidades da fonte.</summary>
    double AdvanceWidth(int glyphId);
    /// <summary>Contorno do glifo (unidades da fonte, y para cima) — texto como curvas;
    /// nulo se a fonte não dá contornos (opcional no JS: glyphOutline?).</summary>
    IReadOnlyList<GlyphOutlineCmd>? GlyphOutline(int glyphId) => null;
    /// <summary>Fonte com glifos coloridos (COLR)? — consulta barata antes de ColorLayers.</summary>
    bool HasColorGlyphs() => false;
    /// <summary>Camadas de um glifo colorido (COLR v0 + CPAL, paleta 0), na ordem de
    /// pintura; nulo se o glifo não é colorido.</summary>
    IReadOnlyList<ColorLayer>? ColorLayers(int glyphId) => null;
}
