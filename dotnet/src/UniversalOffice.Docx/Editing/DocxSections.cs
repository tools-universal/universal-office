using System.Globalization;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Seções do corpo: a quebra de seção é o <c>w:sectPr</c> no <c>w:pPr</c> do último
/// parágrafo da seção; a última seção é o <c>w:sectPr</c> filho do <c>w:body</c>.
/// </summary>
internal static class DocxSections
{
    /// <summary>Propriedades da quebra de seção do parágrafo (null se ele não fecha uma seção).</summary>
    public static XElement? BreakOf(XElement block) =>
        block.Name == W.p ? block.Element(W.pPr)?.Element(W.sectPr) : null;

    /// <summary>sectPr da seção a que o elemento do corpo pertence (o da última seção fora do corpo).</summary>
    public static XElement? SectionOf(DocxDocument doc, XElement element)
    {
        var block = element.AncestorsAndSelf().FirstOrDefault(e => e.Parent?.Name == W.body);
        if (block is null || block.Parent != doc.Body) return doc.LastSectionProperties;
        if (BreakOf(block) is { } own) return own;
        foreach (var next in block.ElementsAfterSelf())
            if (BreakOf(next) is { } found) return found;
        return doc.LastSectionProperties;
    }

    /// <summary>Número de colunas da seção (1 quando não há <c>w:cols</c>).</summary>
    public static int ColumnCount(XElement? sectPr)
    {
        var cols = sectPr?.Element(W.cols);
        if (cols is null) return 1;
        var explicitColumns = cols.Elements(W.col).Count();
        if (explicitColumns > 0 && !IsEqualWidth(cols)) return explicitColumns;
        return int.TryParse((string?)cols.Attribute(W.num), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) && n > 1 ? n : 1;
    }

    /// <summary>Largura (twips) da coluna mais larga da seção, dada a largura útil da página.</summary>
    public static int ColumnWidth(XElement? sectPr, int clientWidth)
    {
        var cols = sectPr?.Element(W.cols);
        int count = ColumnCount(sectPr);
        if (cols is null || count <= 1) return clientWidth;
        if (!IsEqualWidth(cols))
        {
            var widths = cols.Elements(W.col)
                .Select(c => int.TryParse((string?)c.Attribute(W.w), NumberStyles.Integer, CultureInfo.InvariantCulture, out var w) ? w : 0)
                .ToList();
            if (widths.Any(w => w > 0)) return Math.Min(clientWidth, widths.Max());
        }
        int space = int.TryParse((string?)cols.Attribute(W.space), NumberStyles.Integer, CultureInfo.InvariantCulture, out var s) ? Math.Max(0, s) : 720;
        return Math.Max(0, (clientWidth - space * (count - 1)) / count);
    }

    /// <summary>As duas seções têm a mesma disposição de colunas (uma coluna, com ou sem <c>w:cols</c>, conta como igual).</summary>
    public static bool HaveSameColumns(XElement? a, XElement? b)
    {
        if (ColumnCount(a) <= 1 && ColumnCount(b) <= 1) return true;
        var colsA = a?.Element(W.cols);
        var colsB = b?.Element(W.cols);
        return colsA is not null && colsB is not null && XNode.DeepEquals(Normalize(colsA), Normalize(colsB));
    }

    /// <summary>
    /// Propriedades de uma seção do conteúdo aplicada num modelo: tudo da seção do
    /// modelo (tamanho, margens, cabeçalhos, rodapés, grade) com as colunas e o tipo de
    /// início da seção do conteúdo. Fora da primeira seção do documento saem a página
    /// de rosto diferente e o reinício da numeração de páginas.
    /// </summary>
    public static XElement Merge(XElement templateSection, XElement? contentSection, string? startType, bool firstOfDocument)
    {
        var merged = new XElement(templateSection);
        merged.Elements(W.sectPrChange).Remove();
        merged.Elements(W.cols).Remove();
        merged.Elements(W.type).Remove();
        if (contentSection?.Element(W.cols) is { } cols) XmlOrder.Set(merged, new XElement(cols), XmlOrder.SectPr);
        if (startType is not null) XmlOrder.Set(merged, new XElement(W.type, new XAttribute(W.val, startType)), XmlOrder.SectPr);
        if (!firstOfDocument)
        {
            merged.Elements(W.titlePg).Remove();
            merged.Element(W.pgNumType)?.Attribute(W.start)?.Remove();
        }
        return merged;
    }

    /// <summary>Tipo de início da seção (<c>w:type</c>); null = próxima página, o padrão.</summary>
    public static string? StartType(XElement? sectPr) => (string?)sectPr?.Element(W.type)?.Attribute(W.val);

    private static bool IsEqualWidth(XElement cols) =>
        (string?)cols.Attribute(W.equalWidth) is not ("0" or "false" or "off");

    private static XElement Normalize(XElement cols)
    {
        var copy = new XElement(cols);
        foreach (var a in copy.DescendantsAndSelf().SelectMany(e => e.Attributes()).Where(a => a.IsNamespaceDeclaration).ToList()) a.Remove();
        return copy;
    }
}
