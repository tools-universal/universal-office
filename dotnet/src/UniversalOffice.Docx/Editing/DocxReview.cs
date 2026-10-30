using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Revisão do documento: aceitar alterações controladas, remover comentários,
/// desligar o controle de alterações e a proteção, tirar macros e o modelo anexado.
/// </summary>
public static class DocxReview
{
    private static readonly HashSet<XName> PropertyChanges =
    [
        Ns.W + "rPrChange", Ns.W + "pPrChange", Ns.W + "sectPrChange", Ns.W + "tblPrChange", Ns.W + "tblPrExChange",
        Ns.W + "trPrChange", Ns.W + "tcPrChange", Ns.W + "tblGridChange", Ns.W + "numberingChange",
    ];

    private static readonly HashSet<XName> RangeMarkers =
    [
        Ns.W + "moveFromRangeStart", Ns.W + "moveFromRangeEnd", Ns.W + "moveToRangeStart", Ns.W + "moveToRangeEnd",
        Ns.W + "customXmlInsRangeStart", Ns.W + "customXmlInsRangeEnd", Ns.W + "customXmlDelRangeStart",
        Ns.W + "customXmlDelRangeEnd", Ns.W + "customXmlMoveFromRangeStart", Ns.W + "customXmlMoveFromRangeEnd",
        Ns.W + "customXmlMoveToRangeStart", Ns.W + "customXmlMoveToRangeEnd",
    ];

    /// <summary>Elementos cujo w:ins/w:del filho é MARCA de revisão (não conteúdo).</summary>
    private static readonly HashSet<XName> MarkerParents = [W.rPr, W.trPr, W.numPr, W.tcPr];

    /// <summary>
    /// Aceita todas as alterações controladas em todas as partes com texto (e nas
    /// mudanças de propriedade de estilos/numeração): inserções ficam, exclusões
    /// saem, parágrafo com marca ¶ excluída se junta ao seguinte, linha excluída sai.
    /// </summary>
    public static void AcceptAllRevisions(DocxDocument doc)
    {
        foreach (var (_, root) in doc.Stories())
            AcceptRevisions(root);
        foreach (var suffix in new[] { "styles", "numbering" })
        {
            var part = doc.MainRelatedPart(suffix);
            var root = part is null ? null : doc.TryXml(part)?.Root;
            if (root is not null) RemoveAll(root, e => PropertyChanges.Contains(e.Name));
        }
    }

    internal static void AcceptRevisions(XElement root)
    {
        // linhas de tabela excluídas
        foreach (var tr in root.Descendants(W.tr).Where(tr => tr.Element(W.trPr)?.Element(W.del) is not null).ToList())
            tr.Remove();

        // marca de parágrafo excluída: o conteúdo junta ao parágrafo seguinte (que manda nas propriedades)
        foreach (var p in root.Descendants(W.p).Reverse().ToList())
        {
            if (p.Element(W.pPr)?.Element(W.rPr)?.Element(W.del) is null) continue;
            if (p.ElementsAfterSelf().FirstOrDefault() is not { } next || next.Name != W.p) continue;
            var content = p.Elements().Where(e => e.Name != W.pPr).ToList();
            foreach (var c in content) c.Remove();
            var nextPPr = next.Element(W.pPr);
            if (nextPPr is null) next.AddFirst(content);
            else nextPPr.AddAfterSelf(content);
            p.Remove();
        }

        // conteúdo excluído / movido de
        RemoveAll(root, e => (e.Name == W.del || e.Name == W.moveFrom) && !MarkerParents.Contains(e.Parent!.Name));
        // conteúdo inserido / movido para: fica, sem o invólucro
        foreach (var e in root.Descendants().Where(e => (e.Name == W.ins || e.Name == W.moveTo) && !MarkerParents.Contains(e.Parent!.Name)).Reverse().ToList())
            e.ReplaceWith(e.Nodes());
        // marcas, mudanças de propriedade e faixas
        RemoveAll(root, e =>
            (MarkerParents.Contains(e.Parent?.Name ?? W.p) && (e.Name == W.ins || e.Name == W.del || e.Name == W.moveFrom || e.Name == W.moveTo))
            || e.Name == Ns.W + "cellIns" || e.Name == Ns.W + "cellDel" || e.Name == Ns.W + "cellMerge"
            || PropertyChanges.Contains(e.Name) || RangeMarkers.Contains(e.Name));
        // resto de texto excluído fora de w:del (gerador fora do padrão)
        foreach (var dt in root.Descendants().Where(e => e.Name == W.delText || e.Name == W.delInstrText).ToList())
        {
            var run = dt.Parent;
            dt.Remove();
            if (run is not null) ParagraphText.RemoveIfEmpty(run);
        }
    }

    /// <summary>Remove os comentários: marcas de intervalo, referências e as partes de comentários.</summary>
    public static void RemoveComments(DocxDocument doc)
    {
        foreach (var (_, root) in doc.Stories())
        {
            RemoveAll(root, e => e.Name == W.commentRangeStart || e.Name == W.commentRangeEnd);
            foreach (var reference in root.Descendants(W.commentReference).ToList())
            {
                var run = reference.Parent;
                reference.Remove();
                if (run is not null) ParagraphText.RemoveIfEmpty(run);
            }
        }
        foreach (var rel in doc.GetRelationships(doc.MainPartPath).ToList())
        {
            string last = RelTypes.Last(rel.Type);
            if (last is "comments" or "commentsExtended" or "commentsIds" or "commentsExtensible" or "people")
                doc.RemoveRelationship(doc.MainPartPath, rel.Id);
        }
        doc.MarkChanged();
    }

    /// <summary>Desliga o controle de alterações (w:trackRevisions).</summary>
    public static void DisableTrackChanges(DocxDocument doc) =>
        SettingsRoot(doc)?.Elements(Ns.W + "trackRevisions").Remove();

    /// <summary>Remove a proteção do documento (w:documentProtection e w:writeProtection).</summary>
    public static void RemoveProtection(DocxDocument doc) =>
        SettingsRoot(doc)?.Elements().Where(e => e.Name == Ns.W + "documentProtection" || e.Name == Ns.W + "writeProtection").Remove();

    /// <summary>Remove o modelo anexado (w:attachedTemplate e o relacionamento dele).</summary>
    public static void RemoveAttachedTemplate(DocxDocument doc)
    {
        var settingsPart = doc.MainRelatedPart("settings");
        if (settingsPart is null) return;
        doc.Xml(settingsPart).Root?.Elements(Ns.W + "attachedTemplate").Remove();
        foreach (var rel in doc.GetRelationships(settingsPart).Where(r => RelTypes.Is(r.Type, "attachedTemplate")).ToList())
            doc.RemoveRelationship(settingsPart, rel.Id);
    }

    /// <summary>
    /// Remove macros e personalizações VBA (vbaProject, vbaData, keyMap, barras) e
    /// grava a parte principal como documento comum (.docx), não habilitado para macro
    /// nem modelo.
    /// </summary>
    public static void RemoveMacros(DocxDocument doc)
    {
        foreach (var rel in doc.GetRelationships(doc.MainPartPath).ToList())
        {
            string last = RelTypes.Last(rel.Type);
            if (last is "vbaProject" or "keyMapCustomizations" or "attachedToolbars" or "wordVbaData")
                doc.RemoveRelationship(doc.MainPartPath, rel.Id);
        }
        string? ct = doc.GetContentType(doc.MainPartPath);
        if (!string.Equals(ct, ContentTypes.MainDocument, StringComparison.OrdinalIgnoreCase))
            doc.SetContentType(doc.MainPartPath, ContentTypes.MainDocument);
        doc.MarkChanged();
    }

    internal static XElement? SettingsRoot(DocxDocument doc)
    {
        var part = doc.MainRelatedPart("settings");
        return part is null ? null : doc.TryXml(part)?.Root;
    }

    internal static void RemoveAll(XElement root, Func<XElement, bool> predicate)
    {
        foreach (var e in root.Descendants().Where(predicate).ToList())
            if (e.Parent is not null) e.Remove();
    }
}
