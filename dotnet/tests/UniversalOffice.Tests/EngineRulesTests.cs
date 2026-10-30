using System.IO.Compression;
using System.Text;
using UniversalOffice.DocxLayout;
using UniversalOffice.Export;
using UniversalOffice.Pdf;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// Regras do motor portado que não dependem das fontes instaladas (espelho de
/// write/packages/docx-layout/test/engine.test.ts): documentos sintéticos
/// montados aqui e a fonte ABERTA versionada (Carlito, shared/fonts/files).
/// </summary>
public class EngineRulesTests
{
    internal static readonly Lazy<IFontProvider> Carlito = new(() =>
    {
        string dir = Path.Combine(LayoutParityTests.RepoRoot.Value, "shared", "fonts", "files");
        PdfFontSource Src(string f, bool b, bool i) => new() { Bytes = File.ReadAllBytes(Path.Combine(dir, f)), Bold = b, Italic = i, Name = "Carlito" };
        return new DocxPdf.FixedFontProvider(new[]
        {
            Src("carlito-regular.ttf", false, false), Src("carlito-bold.ttf", true, false),
            Src("carlito-italic.ttf", false, true), Src("carlito-bolditalic.ttf", true, true),
        });
    });

    private const string W = "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"";

    internal static string P(string runs = "", string pPr = "") => $"<w:p>{(pPr.Length > 0 ? $"<w:pPr>{pPr}</w:pPr>" : "")}{runs}</w:p>";
    internal static string R(string text, string rPr = "") => $"<w:r>{(rPr.Length > 0 ? $"<w:rPr>{rPr}</w:rPr>" : "")}<w:t xml:space=\"preserve\">{System.Security.SecurityElement.Escape(text)}</w:t></w:r>";

    /// <summary>.docx mínimo: corpo, rodapé e numeração opcionais (Carlito 11 nos padrões).</summary>
    internal static byte[] Docx(string body, string? footer = null, string? numbering = null, string styles = "", string defaultsPPr = "<w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/>")
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            void Add(string name, string xml)
            {
                using var s = zip.CreateEntry(name).Open();
                var b = Encoding.UTF8.GetBytes(xml);
                s.Write(b, 0, b.Length);
            }
            string ct = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                + "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>"
                + "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>"
                + (numbering is not null ? "<Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/>" : "")
                + (footer is not null ? "<Override PartName=\"/word/footer1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml\"/>" : "")
                + "</Types>";
            Add("[Content_Types].xml", ct);
            Add("_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>");
            string rels = "<Relationship Id=\"rIdStyles\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>"
                + (numbering is not null ? "<Relationship Id=\"rIdNum\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering\" Target=\"numbering.xml\"/>" : "")
                + (footer is not null ? "<Relationship Id=\"rIdFtr\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer\" Target=\"footer1.xml\"/>" : "");
            Add("word/_rels/document.xml.rels", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">{rels}</Relationships>");
            Add("word/styles.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:styles {W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii=\"Carlito\" w:hAnsi=\"Carlito\" w:cs=\"Carlito\"/><w:sz w:val=\"22\"/><w:szCs w:val=\"22\"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>{defaultsPPr}</w:pPr></w:pPrDefault></w:docDefaults>"
                + "<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/></w:style>"
                + "<w:style w:type=\"character\" w:default=\"1\" w:styleId=\"DefaultParagraphFont\"><w:name w:val=\"Default Paragraph Font\"/></w:style>"
                + $"<w:style w:type=\"table\" w:default=\"1\" w:styleId=\"TableNormal\"><w:name w:val=\"Normal Table\"/><w:tblPr><w:tblCellMar><w:left w:w=\"108\" w:type=\"dxa\"/><w:right w:w=\"108\" w:type=\"dxa\"/></w:tblCellMar></w:tblPr></w:style>{styles}</w:styles>");
            if (numbering is not null) Add("word/numbering.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:numbering {W}>{numbering}</w:numbering>");
            if (footer is not null) Add("word/footer1.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:ftr {W}>{footer}</w:ftr>");
            string sect = "<w:sectPr>" + (footer is not null ? "<w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>" : "")
                + "<w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1417\" w:right=\"1701\" w:bottom=\"1417\" w:left=\"1701\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/></w:sectPr>";
            Add("word/document.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document {W}><w:body>{body}{sect}</w:body></w:document>");
        }
        return ms.ToArray();
    }

    internal static LayoutResult Run(byte[] docx) => DocxLayoutPipeline.Layout(docx, Carlito.Value);

    internal static List<string> Texts(LayoutResult res) =>
        res.Pages.SelectMany(p => p.Items).OfType<GlyphRunItem>().Select(g => g.Text).ToList();

    // ───────────── medições sem efeito colateral (listas, SEQ, notas) ─────────────

    private const string Num = "<w:abstractNum w:abstractNumId=\"0\"><w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId=\"1\"><w:abstractNumId w:val=\"0\"/></w:num>";
    private static string Numbered(string t) => P(R(t), "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr>");
    private static string Seq(string id) => $"<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> SEQ {id} </w:instrText></w:r><w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>9</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";

    [Fact]
    public void Medicoes_Do_Rodape_Nao_Avancam_O_Seq()
    {
        var res = Run(Docx(P(R("Corpo")), footer: P(R("Fig ") + Seq("Fig"))));
        Assert.Contains("Fig1", Texts(res));
    }

    [Fact]
    public void Medicoes_Do_Texto_Vertical_Nao_Avancam_A_Lista()
    {
        string cell = $"<w:tc><w:tcPr><w:tcW w:w=\"1500\" w:type=\"dxa\"/><w:textDirection w:val=\"btLr\"/></w:tcPr>{Numbered("Vertical")}</w:tc>";
        string tbl = $"<w:tbl><w:tblPr><w:tblW w:w=\"1500\" w:type=\"dxa\"/></w:tblPr><w:tblGrid><w:gridCol w:w=\"1500\"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val=\"1500\"/></w:trPr>{cell}</w:tr></w:tbl>";
        var res = Run(Docx(tbl + Numbered("Depois"), numbering: Num));
        Assert.Equal(new[] { "1.Vertical", "2.Depois" }, Texts(res));
    }

    [Fact]
    public void Previa_De_Manter_Com_O_Proximo_Nao_Avanca_Lista_Nem_Seq()
    {
        var res = Run(Docx(P(R("Titulo"), "<w:keepNext/>") + Numbered("Um") + Numbered("Dois") + P(R("Tab ") + Seq("Tab")), numbering: Num));
        Assert.Equal(new[] { "Titulo", "1.Um", "2.Dois", "Tab1" }, Texts(res));
    }
}
