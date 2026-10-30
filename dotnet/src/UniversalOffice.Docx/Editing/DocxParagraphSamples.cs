using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Parágrafos-amostra de um modelo: parágrafos que contêm um marcador <c>#{Nome}</c>
/// (ex.: <c>#{Heading1}</c>, <c>#{BulletList}</c>) e cuja formatação (estilo, numeração,
/// espaçamento) serve de molde para o conteúdo escrito com <see cref="DocxBodyWriter"/>.
/// </summary>
public static class DocxParagraphSamples
{
    /// <summary>O documento tem o marcador <c>#{name}</c> (palavra inteira, diferenciando maiúsculas)?</summary>
    public static bool Contains(DocxDocument document, string name)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(name);
        return DocxText.Contains(document, DocxText.Parameter(name), caseSensitive: true, wholeWord: true);
    }

    /// <summary>
    /// Lê e REMOVE as amostras: para cada nome, guarda as propriedades do PRIMEIRO
    /// parágrafo com o marcador <c>#{nome}</c> (palavra inteira, diferenciando maiúsculas,
    /// em corpo, caixas de texto, cabeçalhos, rodapés e notas) e apaga todos os
    /// parágrafos que o contêm. Nomes sem amostra ficam fora do resultado.
    /// </summary>
    public static IReadOnlyDictionary<string, DocxParagraphProperties> Extract(DocxDocument document, IEnumerable<string> names)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(names);
        var samples = new Dictionary<string, DocxParagraphProperties>(StringComparer.Ordinal);
        bool removed = false;
        foreach (var name in names)
        {
            if (samples.ContainsKey(name)) continue;
            var paragraphs = DocxText.FindParagraphs(document, DocxText.Parameter(name), caseSensitive: true, wholeWord: true, DocxTextScope.Document).ToList();
            if (paragraphs.Count == 0) continue;
            var pPr = paragraphs[0].Element(W.pPr) is { } found ? new XElement(found) : new XElement(W.pPr);
            pPr.Elements(W.sectPr).Remove();
            pPr.Elements(Ns.W + "pPrChange").Remove();
            samples[name] = new DocxParagraphProperties(pPr);
            foreach (var p in paragraphs) DocxText.RemoveParagraph(p);
            removed = true;
        }
        if (removed) document.MarkChanged();
        return samples;
    }
}
