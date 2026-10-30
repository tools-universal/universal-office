using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>O que o saneamento faz. Use os conjuntos prontos <see cref="Content"/> e <see cref="Output"/>.</summary>
public sealed record DocxSanitizeOptions
{
    /// <summary>Aceita as alterações controladas e desliga o controle de alterações.</summary>
    public bool AcceptRevisions { get; init; } = true;

    /// <summary>Remove comentários (marcas, referências e partes).</summary>
    public bool RemoveComments { get; init; } = true;

    /// <summary>Remove macros/VBA e grava como .docx comum.</summary>
    public bool RemoveMacros { get; init; } = true;

    /// <summary>Remove a proteção do documento e o modelo anexado.</summary>
    public bool RemoveProtectionAndAttachedTemplate { get; init; } = true;

    /// <summary>Limpa autor, empresa, título… e as propriedades personalizadas.</summary>
    public bool RemovePersonalMetadata { get; init; }

    /// <summary>Remove cabeçalhos e rodapés (referências e partes).</summary>
    public bool RemoveHeadersAndFooters { get; init; }

    /// <summary>Junta todas as seções na última (some com as quebras de seção).</summary>
    public bool MergeSections { get; init; }

    /// <summary>Remove as partes customXml/ (dados XML personalizados do pacote).</summary>
    public bool RemoveCustomXml { get; init; }

    /// <summary>
    /// Remove conteúdo ativo/externo: objetos OLE, controles ActiveX, altChunk,
    /// subdocumentos, quadros e relacionamentos externos que não sejam hiperlink
    /// para um esquema permitido (hiperlinks com outro esquema viram texto).
    /// </summary>
    public bool RemoveUnsafeContent { get; init; } = true;

    /// <summary>Campos mantidos; os demais viram o resultado em cache (sem avaliar). Null = não mexe em campos.</summary>
    public IReadOnlyCollection<string>? AllowedFields { get; init; } = DocxFields.DefaultAllowedFields.ToArray();

    /// <summary>Esquemas aceitos em hiperlinks (campos e relacionamentos externos).</summary>
    public IReadOnlyCollection<string> AllowedHyperlinkSchemes { get; init; } = DocxFields.DefaultAllowedSchemes.ToArray();

    /// <summary>Converte campos HYPERLINK em w:hyperlink nativo (dispensa normalização posterior).</summary>
    public bool ConvertHyperlinkFields { get; init; } = true;

    /// <summary>
    /// Validação dos inlines de plugin (tipo, JSON): os que devolvem falso são
    /// desembrulhados (fica o texto de reserva). Null = não valida.
    /// </summary>
    public Func<string, string, bool>? IsCustomInlineValid { get; init; }

    /// <summary>
    /// Saneamento de conteúdo recebido (enviado por usuário, a guardar ou aplicar num
    /// modelo): revisão, metadados, cabeçalhos/rodapés, seções, conteúdo inseguro,
    /// campos e customXml.
    /// </summary>
    public static DocxSanitizeOptions Content { get; } = new()
    {
        RemovePersonalMetadata = true,
        RemoveHeadersAndFooters = true,
        MergeSections = true,
        RemoveCustomXml = true,
    };

    /// <summary>
    /// Saneamento do documento gerado a partir de um modelo (o <c>CleanOutput</c>):
    /// revisão, conteúdo inseguro e campos (lista ampliada com datas, seção e
    /// NOTEREF — <see cref="DocxFields.DefaultOutputAllowedFields"/>); mantém
    /// cabeçalhos, seções e metadados.
    /// </summary>
    public static DocxSanitizeOptions Output { get; } = new() { AllowedFields = DocxFields.DefaultOutputAllowedFields.ToArray() };
}

/// <summary>Saneamento de .docx antes de guardar conteúdo recebido ou de entregar um documento gerado.</summary>
public static class DocxSanitizer
{
    private static readonly HashSet<string> UnsafeRelationshipTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "oleObject", "package", "aFChunk", "control", "subDocument", "attachedTemplate", "frame",
        "vbaProject", "activeXControlBinary", "activeXControl",
    };

    /// <summary>Aplica as etapas pedidas, nesta ordem: revisão → metadados → cabeçalhos → seções → conteúdo inseguro → campos → inlines → customXml.</summary>
    public static void Sanitize(DocxDocument doc, DocxSanitizeOptions options)
    {
        ArgumentNullException.ThrowIfNull(doc);
        ArgumentNullException.ThrowIfNull(options);

        if (options.AcceptRevisions)
        {
            DocxReview.AcceptAllRevisions(doc);
            DocxReview.DisableTrackChanges(doc);
        }
        if (options.RemoveComments) DocxReview.RemoveComments(doc);
        if (options.RemoveMacros) DocxReview.RemoveMacros(doc);
        if (options.RemoveProtectionAndAttachedTemplate)
        {
            DocxReview.RemoveProtection(doc);
            DocxReview.RemoveAttachedTemplate(doc);
        }
        if (options.RemovePersonalMetadata) doc.Properties.RemovePersonalMetadata();
        if (options.RemoveHeadersAndFooters) RemoveHeadersAndFooters(doc);
        if (options.MergeSections) MergeSections(doc);
        if (options.RemoveUnsafeContent) RemoveUnsafeContent(doc, options.AllowedHyperlinkSchemes);
        if (options.AllowedFields is not null) DocxFields.ReplaceDisallowedWithResult(doc, options.AllowedFields, options.AllowedHyperlinkSchemes);
        if (options.ConvertHyperlinkFields) DocxFields.ConvertHyperlinkFields(doc, options.AllowedHyperlinkSchemes);
        if (options.IsCustomInlineValid is not null) DocxCustomInlines.UnwrapInvalid(doc, options.IsCustomInlineValid);
        if (options.RemoveCustomXml) RemoveCustomXml(doc);
        doc.MarkChanged();
    }

    /// <summary>Remove cabeçalhos e rodapés de todas as seções (referências e partes).</summary>
    public static void RemoveHeadersAndFooters(DocxDocument doc)
    {
        foreach (var sectPr in doc.MainRoot.Descendants(W.sectPr).ToList())
            sectPr.Elements().Where(e => e.Name == W.headerReference || e.Name == W.footerReference).Remove();
        doc.MarkChanged();
    }

    /// <summary>
    /// Junta todas as seções na última: as quebras de seção (w:sectPr dentro de
    /// parágrafos) saem e o conteúdo fica, na ordem, sob as propriedades da última.
    /// </summary>
    public static void MergeSections(DocxDocument doc)
    {
        foreach (var sectPr in doc.Body.Descendants(W.sectPr).Where(s => s.Parent?.Name == W.pPr).ToList())
            sectPr.Remove();
        doc.MarkChanged();
    }

    /// <summary>Remove os dados XML personalizados (customXml/) e os relacionamentos para eles.</summary>
    public static void RemoveCustomXml(DocxDocument doc)
    {
        foreach (var part in doc.PartNames.ToList())
        {
            if (part.StartsWith("customXml/", StringComparison.OrdinalIgnoreCase) && !part.EndsWith(".rels", StringComparison.OrdinalIgnoreCase))
                doc.DeletePart(part);
        }
        foreach (var part in doc.PartNames.Where(p => p.EndsWith(".rels", StringComparison.OrdinalIgnoreCase)).ToList())
        {
            var relsDoc = doc.TryXml(part);
            relsDoc?.Root?.Elements(Ns.PackageRels + "Relationship")
                .Where(r => RelTypes.Is((string?)r.Attribute("Type") ?? "", "customXml")
                            || (((string?)r.Attribute("Target")) ?? "").Contains("customXml/", StringComparison.OrdinalIgnoreCase))
                .Remove();
        }
        doc.MarkChanged();
    }

    /// <summary>
    /// Remove objetos OLE (w:object), controles ActiveX, altChunk, subdocumentos,
    /// quadros, e os relacionamentos desses tipos; relacionamentos externos só ficam se
    /// forem hiperlink para esquema permitido — hiperlink proibido vira texto e as
    /// demais referências externas (imagem vinculada, fonte de mala direta…) saem.
    /// </summary>
    public static void RemoveUnsafeContent(DocxDocument doc, IEnumerable<string>? allowedSchemes = null)
    {
        var schemes = (allowedSchemes ?? DocxFields.DefaultAllowedSchemes).ToList();
        foreach (var (_, root) in doc.Stories())
        {
            foreach (var e in root.Descendants().Where(IsUnsafeElement).ToList())
            {
                if (e.Parent is null) continue;
                var run = e.Parent;
                // VML de objeto/controle: sai o w:pict inteiro (a imagem de prévia junto)
                var target = e.Name.Namespace == Ns.O || (e.Name == W.control && run.Name == W.pict) ? run : e;
                var container = target.Parent;
                target.Remove();
                if (container is not null) ParagraphText.RemoveIfEmpty(container);
            }
        }
        var webSettings = doc.MainRelatedPart("webSettings");
        if (webSettings is not null) doc.Xml(webSettings).Root?.Elements(Ns.W + "frameset").Remove();

        foreach (var part in doc.PartNames.ToList())
        {
            if (part.EndsWith(".rels", StringComparison.OrdinalIgnoreCase) || part == "[Content_Types].xml") continue;
            var rels = doc.GetRelationships(part);
            var removed = new HashSet<string>(StringComparer.Ordinal);
            foreach (var rel in rels)
            {
                bool unsafeType = UnsafeRelationshipTypes.Contains(RelTypes.Last(rel.Type));
                bool externalNotAllowed = rel.External && !(RelTypes.Is(rel.Type, "hyperlink") && DocxFields.IsAllowedUrl(rel.Target, schemes));
                if (!unsafeType && !externalNotAllowed) continue;
                doc.RemoveRelationship(part, rel.Id);
                removed.Add(rel.Id);
            }
            if (removed.Count > 0) DropReferences(doc, part, removed);
        }
        doc.MarkChanged();
    }

    private static bool IsUnsafeElement(XElement e) =>
        e.Name == W.@object || e.Name == W.control || e.Name == W.altChunk || e.Name == W.subDoc
        || (e.Name == Ns.O + "OLEObject" && e.Parent?.Name == W.pict);

    /// <summary>Tira do XML da parte o que apontava para relacionamentos removidos.</summary>
    private static void DropReferences(DocxDocument doc, string part, HashSet<string> removed)
    {
        XDocument xml;
        try { xml = doc.Xml(part); }
        catch (System.Xml.XmlException) { return; }
        var root = xml.Root;
        if (root is null) return;
        foreach (var h in root.Descendants(W.hyperlink).Where(h => removed.Contains((string?)h.Attribute(Ns.R + "id") ?? "")).ToList())
            h.ReplaceWith(h.Nodes());
        foreach (var e in root.Descendants().Where(e => e.Name.LocalName is "hlinkClick" or "hlinkHover" && removed.Contains((string?)e.Attribute(Ns.R + "id") ?? "")).ToList())
            e.Remove();
        // configurações que só existem com o relacionamento (modelo anexado, mala direta)
        foreach (var e in root.Descendants().Where(e => (e.Name == Ns.W + "attachedTemplate" || e.Name == Ns.W + "dataSource" || e.Name == Ns.W + "headerSource")
                                                       && removed.Contains((string?)e.Attribute(Ns.R + "id") ?? "")).ToList())
        {
            var mailMerge = e.Ancestors(Ns.W + "mailMerge").FirstOrDefault();
            (mailMerge ?? e).Remove();
        }
        foreach (var el in root.Descendants().ToList())
        {
            foreach (var a in el.Attributes().Where(a => (a.Name.Namespace == Ns.R || a.Name == Ns.O + "relid") && removed.Contains(a.Value)).ToList())
                a.Remove();
        }
    }
}
