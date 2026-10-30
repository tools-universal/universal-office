using UniversalOffice.Fonts;

namespace UniversalOffice.DocxLayout;

/// <summary>Fim (twips) do último glifo gravado na página e a baseline dele — o espaço entre corridas de estilos diferentes.</summary>
public sealed class WordSpaceCursor
{
    public (double Y, double XEnd)? Last;
}

/// <summary>
/// O layout não pinta os espaços (só posiciona as palavras): sem eles o texto extraído do
/// PDF sai colado, o que estraga a busca e a cópia. Grava o glifo de espaço onde a distância
/// até o glifo seguinte na mesma baseline passa de meio espaço da fonte — dentro da corrida
/// e entre corridas. Só o PDF: o layout não muda (porta de docx-layout/src/pdf-word-spaces.ts).
/// </summary>
public static class PdfWordSpaces
{
    public static List<GlyphPos> WithWordSpaces(IReadOnlyList<GlyphPos> glyphs, ILayoutFont font, double sizePt, double scaleX, double y, WordSpaceCursor cursor)
    {
        if (glyphs.Count == 0) return [.. glyphs];
        double Adv(int cp) => font.AdvanceTwips(cp, sizePt) * scaleX;
        var last = glyphs[^1];
        (double Y, double XEnd) end = (y, last.X + Adv(last.Cp));
        if (font.GlyphId(32) == 0)
        {
            cursor.Last = end;
            return [.. glyphs];
        }
        double min = Adv(32) * 0.5;
        var outp = new List<GlyphPos>(glyphs.Count + 8);
        for (int i = 0; i < glyphs.Count; i++)
        {
            var g = glyphs[i];
            GlyphPos? prev = i > 0 ? glyphs[i - 1] : null;
            double? prevEnd = prev is { } p ? p.X + Adv(p.Cp)
                : cursor.Last is { } l && Math.Abs(l.Y - y) < 1 ? l.XEnd : null;
            if (prevEnd is { } pe && g.Cp != 32 && prev?.Cp != 32 && g.X - pe > min)
                outp.Add(new GlyphPos(32, pe));
            outp.Add(g);
        }
        cursor.Last = end;
        return outp;
    }
}
