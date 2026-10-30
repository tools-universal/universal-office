using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Regras estruturais que o Word exige e que as edições podem quebrar (corrigidas
/// ao salvar): tabela sem linha sai; linha sem célula sai; célula termina em
/// parágrafo; cabeçalho/rodapé/nota/caixa de texto/corpo têm ao menos um parágrafo.
/// </summary>
internal static class DocxStructure
{
    private static readonly HashSet<XName> BlockContainers = [W.txbxContent, W.hdr, W.ftr, W.footnote, W.endnote, W.comment];

    public static void Normalize(DocxDocument doc)
    {
        foreach (var (_, root) in doc.Stories())
            Normalize(root);
    }

    public static void Normalize(XElement root)
    {
        foreach (var tr in root.Descendants(W.tr).Where(tr => !tr.Elements(W.tc).Any() && !tr.Descendants(W.tc).Any()).ToList())
            tr.Remove();
        foreach (var tbl in root.Descendants(W.tbl).Where(t => !t.Descendants(W.tr).Any()).ToList())
            tbl.Remove();
        foreach (var tc in root.Descendants(W.tc).ToList())
        {
            var last = tc.Elements().LastOrDefault(e => e.Name != W.tcPr);
            if (last is null || last.Name == W.tbl) tc.Add(new XElement(W.p));
        }
        foreach (var container in root.DescendantsAndSelf().Where(e => BlockContainers.Contains(e.Name)).ToList())
        {
            if (!container.Elements().Any(IsBlock)) container.Add(new XElement(W.p));
        }
        var body = root.Element(W.body);
        if (body is not null && !body.Elements().Any(IsBlock))
        {
            var sectPr = body.Elements(W.sectPr).LastOrDefault();
            if (sectPr is null) body.Add(new XElement(W.p));
            else sectPr.AddBeforeSelf(new XElement(W.p));
        }
    }

    /// <summary>Elemento de nível de bloco (conta como conteúdo de célula/corpo).</summary>
    public static bool IsBlock(XElement e) =>
        e.Name == W.p || e.Name == W.tbl || e.Name == W.sdt || e.Name == W.customXml || e.Name == W.altChunk;
}
