using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Como <see cref="DocxTemplate.ApplyContent"/> aplica o conteúdo no modelo.</summary>
public sealed record DocxApplyContentOptions
{
    /// <summary>
    /// Textos que marcam parágrafos de amostra do modelo (ex.: <c>#{Heading1}</c>),
    /// removidos antes da importação. Busca diferenciando maiúsculas, palavra inteira.
    /// </summary>
    public IReadOnlyCollection<string> SampleMarkers { get; init; } = [];

    /// <summary>Reduz as imagens do corpo que não cabem na página (ou na coluna) do modelo.</summary>
    public bool FitPictures { get; init; } = true;

    /// <summary>
    /// Mantém as seções do conteúdo (quebras de seção e colunas) em vez de achatá-las
    /// na última seção do modelo. Cada seção do conteúdo fica com as propriedades da
    /// última seção do modelo (tamanho, margens, cabeçalhos, rodapés) e só as colunas e
    /// o tipo de início vêm do conteúdo. Quando o modelo tem blocos antes do conteúdo
    /// na última seção, eles ganham uma quebra de seção com as propriedades originais e
    /// a primeira seção do conteúdo começa em seguida (contínua). Conteúdo de uma seção
    /// só, com as mesmas colunas do modelo, entra como sem esta opção.
    /// </summary>
    public bool PreserveSections { get; init; }
}

/// <summary>
/// Modelos (.docx de cabeçalho/capa/estilos) e aplicação de conteúdo: esvaziar o
/// modelo e importar o corpo de outro .docx nele.
/// </summary>
public static class DocxTemplate
{
    /// <summary>
    /// Esvazia o modelo para edição: o corpo fica com um único parágrafo vazio no
    /// estilo Normal, sob as propriedades da ÚLTIMA seção (tamanho, margens, colunas),
    /// sem referências de cabeçalho/rodapé; aceita revisões, remove comentários,
    /// macros, proteção, modelo anexado e metadados pessoais. Estilos, numeração,
    /// tema, configurações e fontes (inclusive embutidas) ficam.
    /// </summary>
    public static void Empty(DocxDocument doc)
    {
        var body = doc.Body;
        var sectPr = doc.LastSectionProperties;
        foreach (var child in body.Nodes().ToList())
            if (child != sectPr) child.Remove();
        var paragraph = NormalParagraph(doc);
        if (sectPr is not null) sectPr.AddBeforeSelf(paragraph);
        else body.Add(paragraph);
        sectPr?.Elements().Where(e => e.Name == W.headerReference || e.Name == W.footerReference).Remove();

        DocxReview.AcceptAllRevisions(doc);
        DocxReview.DisableTrackChanges(doc);
        DocxReview.RemoveComments(doc);
        DocxReview.RemoveMacros(doc);
        DocxReview.RemoveProtection(doc);
        DocxReview.RemoveAttachedTemplate(doc);
        doc.Properties.RemovePersonalMetadata();
        RemoveUnreferencedNotes(doc);
        doc.MarkChanged();
    }

    /// <summary>
    /// Aplica o conteúdo (outro .docx) no modelo: tira as
    /// amostras, aceita revisões e remove comentários do conteúdo, importa o corpo dele
    /// no fim da ÚLTIMA seção com os estilos do modelo (seções do conteúdo achatadas),
    /// descarta o parágrafo vazio final do modelo e o parágrafo vazio final que sobrar,
    /// e reduz as imagens que não cabem na página. O conteúdo é aberto com os tetos
    /// do modelo (<see cref="DocxDocument.Limits"/>).
    /// </summary>
    public static void ApplyContent(DocxDocument template, byte[] contentDocx, DocxApplyContentOptions? options = null)
    {
        options ??= new DocxApplyContentOptions();
        if (options.SampleMarkers.Count > 0)
            DocxText.RemoveParagraphsContaining(template, options.SampleMarkers, caseSensitive: true, wholeWord: true);

        var trailing = BodyBlocks(template).LastOrDefault() is { } last && IsEmptyParagraph(last) && DocxSections.BreakOf(last) is null ? last : null;

        var content = DocxDocument.Open(contentDocx, template.Limits);
        DocxReview.AcceptAllRevisions(content);
        DocxReview.RemoveComments(content);

        var templateSection = template.LastSectionProperties;
        if (options.PreserveSections && templateSection is not null && HasOwnSections(content, templateSection))
            trailing = ImportWithSections(template, content, templateSection, trailing);
        else
            new DocxImporter(template, content).ImportBody();

        DocxReview.AcceptAllRevisions(template);
        DocxReview.RemoveComments(template);

        if (trailing is not null && trailing.Parent is not null && BodyBlocks(template).Count > 1)
            trailing.Remove();
        var blocks = BodyBlocks(template);
        if (blocks.Count >= 2 && IsEmptyParagraph(blocks[^1]) && DocxSections.BreakOf(blocks[^1]) is null && blocks[^2].Name == W.p)
            blocks[^1].Remove();

        if (options.FitPictures) DocxPictures.FitToPage(template);
    }

    /// <summary>O conteúdo tem quebras de seção ou colunas diferentes das da última seção do modelo.</summary>
    private static bool HasOwnSections(DocxDocument content, XElement templateSection) =>
        content.Body.Elements().Any(b => DocxSections.BreakOf(b) is not null)
        || !DocxSections.HaveSameColumns(content.LastSectionProperties, templateSection);

    /// <summary>
    /// Importa o conteúdo com as seções dele (ver <see cref="DocxApplyContentOptions.PreserveSections"/>).
    /// Devolve o parágrafo vazio final do modelo que ainda pode sair (null se virou a quebra de seção do modelo).
    /// </summary>
    private static XElement? ImportWithSections(DocxDocument template, DocxDocument content, XElement templateSection, XElement? trailing)
    {
        var templateBlocks = BodyBlocks(template);
        int lastBreak = templateBlocks.FindLastIndex(b => DocxSections.BreakOf(b) is not null);
        var templatePart = templateBlocks.Skip(lastBreak + 1).Where(b => b != trailing).ToList();
        bool hasTemplatePart = templatePart.Count > 0;
        var originalSection = new XElement(templateSection);

        int index = 0;
        new DocxImporter(template, content).ImportBody(sourceBreak =>
        {
            bool first = index++ == 0;
            string? type = first && hasTemplatePart ? "continuous" : DocxSections.StartType(sourceBreak);
            return DocxSections.Merge(originalSection, sourceBreak, type, first && !hasTemplatePart && lastBreak < 0);
        });

        var contentSection = content.LastSectionProperties;
        bool finalIsFirst = index == 0;
        string? finalType = finalIsFirst && hasTemplatePart ? "continuous" : DocxSections.StartType(contentSection);
        templateSection.ReplaceWith(DocxSections.Merge(originalSection, contentSection, finalType, finalIsFirst && !hasTemplatePart && lastBreak < 0));

        if (!hasTemplatePart) return trailing;

        var carrier = templatePart[^1].Name == W.p ? templatePart[^1] : trailing;
        if (carrier is null)
        {
            carrier = new XElement(W.p);
            templatePart[^1].AddAfterSelf(carrier);
        }
        XmlOrder.Set(XmlOrder.EnsurePPr(carrier), originalSection, XmlOrder.PPr);
        return carrier == trailing ? null : trailing;
    }

    /// <summary>
    /// Importa o corpo de <paramref name="source"/> no fim da última seção de
    /// <paramref name="target"/> com os estilos do destino (sem as etapas de
    /// <see cref="ApplyContent"/>). Comentários não são importados.
    /// </summary>
    public static void ImportBody(DocxDocument target, DocxDocument source) =>
        new DocxImporter(target, source).ImportBody();

    /// <summary>Blocos do corpo (sem o w:sectPr final).</summary>
    internal static List<XElement> BodyBlocks(DocxDocument doc) =>
        doc.Body.Elements().Where(e => e.Name != W.sectPr).ToList();

    /// <summary>Parágrafo sem conteúdo (só propriedades, indicadores, marcas de revisão ortográfica).</summary>
    internal static bool IsEmptyParagraph(XElement e) =>
        e.Name == W.p && e.Elements().All(c =>
            c.Name == W.pPr || c.Name == W.bookmarkStart || c.Name == W.bookmarkEnd || c.Name == W.proofErr
            || c.Name == W.permStart || c.Name == W.permEnd
            || (c.Name == W.r && c.Elements().All(rc => rc.Name == W.rPr || rc.Name == W.lastRenderedPageBreak)));

    /// <summary>Parágrafo vazio no estilo Normal (sem w:pStyle quando Normal é o padrão).</summary>
    internal static XElement NormalParagraph(DocxDocument doc)
    {
        var styles = DocxStyles.Root(doc);
        var normal = DocxStyles.ByName(styles, "Normal", "paragraph");
        string? normalId = normal is null ? null : DocxStyles.Id(normal);
        string? defaultId = DocxStyles.DefaultParagraphStyleId(styles);
        if (normalId is null || normalId == defaultId) return new XElement(W.p);
        return new XElement(W.p, new XElement(W.pPr, new XElement(W.pStyle, new XAttribute(W.val, normalId))));
    }

    /// <summary>Notas de rodapé/fim que ninguém referencia mais (mantém os separadores).</summary>
    internal static void RemoveUnreferencedNotes(DocxDocument doc)
    {
        foreach (var (kind, noteName, refName) in new[] { ("footnotes", W.footnote, W.footnoteReference), ("endnotes", W.endnote, W.endnoteReference) })
        {
            var part = doc.MainRelatedPart(kind);
            var root = part is null ? null : doc.TryXml(part)?.Root;
            if (root is null) continue;
            var used = new HashSet<string>(doc.Stories().Where(s => !string.Equals(s.Part, part, StringComparison.OrdinalIgnoreCase))
                .SelectMany(s => s.Root.Descendants(refName)).Select(r => (string?)r.Attribute(W.id) ?? ""), StringComparer.Ordinal);
            foreach (var note in root.Elements(noteName).ToList())
            {
                string? type = (string?)note.Attribute(W.type);
                if (type is "separator" or "continuationSeparator" or "continuationNotice") continue;
                if (!used.Contains((string?)note.Attribute(W.id) ?? "")) note.Remove();
            }
        }
    }
}
