using UniversalOffice.DocxLayout;
using UniversalOffice.Fonts;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Espaços entre palavras gravados no PDF (texto extraível) — paridade com docx-layout/test/pdf-word-spaces.test.ts.</summary>
public class PdfWordSpacesTests
{
    private sealed class MonoFont(bool hasSpace = true) : ILayoutFont
    {
        public FontMetrics Metrics => new();
        public double AdvanceTwips(int codePoint, double sizePt) => 100;
        public double KernTwips(int prevCodePoint, int codePoint, double sizePt) => 0;
        public int GlyphId(int codePoint) => codePoint == 32 && !hasSpace ? 0 : codePoint;
        public double AdvanceWidth(int glyphId) => 100;
    }

    private static List<GlyphPos> Glyphs(params (char C, double X)[] xs) => xs.Select(g => new GlyphPos(g.C, g.X)).ToList();
    private static string Text(IEnumerable<GlyphPos> gs) => string.Concat(gs.Select(g => (char)g.Cp));

    [Fact]
    public void Grava_O_Espaco_Na_Lacuna_De_Uma_Palavra()
    {
        var outp = PdfWordSpaces.WithWordSpaces(Glyphs(('a', 0), ('b', 100), ('c', 300), ('d', 400)), new MonoFont(), 11, 1, 1000, new WordSpaceCursor());
        Assert.Equal("ab cd", Text(outp));
        Assert.Equal(new GlyphPos(32, 200), outp[2]);
    }

    [Fact]
    public void Lacuna_Menor_Que_Meio_Espaco_Nao_Vira_Espaco() =>
        Assert.Equal("ab", Text(PdfWordSpaces.WithWordSpaces(Glyphs(('a', 0), ('b', 140)), new MonoFont(), 11, 1, 1000, new WordSpaceCursor())));

    [Fact]
    public void Entre_Corridas_Da_Mesma_Linha_O_Espaco_Vai_No_Comeco_Da_Seguinte()
    {
        var cursor = new WordSpaceCursor();
        PdfWordSpaces.WithWordSpaces(Glyphs(('a', 0), ('b', 100)), new MonoFont(), 11, 1, 1000, cursor);
        Assert.Equal(" c", Text(PdfWordSpaces.WithWordSpaces(Glyphs(('c', 300)), new MonoFont(), 11, 1, 1000, cursor)));
        Assert.Equal("d", Text(PdfWordSpaces.WithWordSpaces(Glyphs(('d', 2000)), new MonoFont(), 11, 1, 1300, cursor)));
    }

    [Fact]
    public void Fonte_Sem_Glifo_De_Espaco_Fica_Como_Esta() =>
        Assert.Equal("ab", Text(PdfWordSpaces.WithWordSpaces(Glyphs(('a', 0), ('b', 500)), new MonoFont(false), 11, 1, 1000, new WordSpaceCursor())));
}
