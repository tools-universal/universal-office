using UniversalOffice.Docx;

namespace UniversalOffice.Export;

/// <summary>Caminho standalone: bytes .docx → ExportDoc → Markdown/HTML —
/// porta de write/packages/docx-core/src/export/from-docx.ts.</summary>
public static class FromDocx
{
    /// <summary>Converte o FullDocument para a entrada dos exportadores (tabelas
    /// viram âncoras "antes do parágrafo N"). Title NÃO é preenchido.</summary>
    public static ExportDoc ExportDocFromFullDocument(FullDocument full)
    {
        var paragraphs = new List<Paragraph>();
        var tableAnchors = new List<(int, TableBlock)>();
        foreach (var b in full.Blocks)
        {
            if (b is ParagraphBlock pb) paragraphs.Add(pb.Paragraph);
            else tableAnchors.Add((paragraphs.Count, (TableBlock)b));
        }
        return new ExportDoc
        {
            Paragraphs = paragraphs,
            TableAnchors = tableAnchors,
            Comments = full.Comments,
            Footnotes = full.Footnotes,
            Endnotes = full.Endnotes,
            SectPr = full.Sections.Count > 0 ? full.Sections[0].SectPr : null,
        };
    }

    /// <summary>Exporta bytes de um .docx diretamente para Markdown (GFM).</summary>
    public static string DocxToMarkdown(byte[] bytes, DocxMarkdownOptions? opts = null)
    {
        var pkg = DocxPackage.Load(bytes);
        return DocxMarkdown.ToMarkdown(ExportDocFromFullDocument(FullDocReader.ReadFullDocument(pkg)), opts);
    }

    /// <summary>Exporta bytes de um .docx diretamente para HTML.</summary>
    public static string DocxToHtml(byte[] bytes, DocxHtmlOptions? opts = null)
    {
        var pkg = DocxPackage.Load(bytes);
        return DocxHtml.ToHtml(ExportDocFromFullDocument(FullDocReader.ReadFullDocument(pkg)), opts);
    }
}
