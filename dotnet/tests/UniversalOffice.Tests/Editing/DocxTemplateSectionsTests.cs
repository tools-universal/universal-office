using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using UniversalOffice.DocxLayout;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Seções do conteúdo ao aplicar num modelo (<see cref="DocxApplyContentOptions.PreserveSections"/>):
/// as colunas e quebras de seção do editor sobrevivem, com a página, os cabeçalhos e os
/// rodapés da última seção do modelo.
/// </summary>
public class DocxTemplateSectionsTests
{
    private const string ContentPage = """<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>""";

    private static readonly DocxApplyContentOptions Preserving = new() { SampleMarkers = SampleTemplate.SampleMarkers, PreserveSections = true };

    private static string Break(string cols, string? type = null) =>
        $"<w:sectPr>{(type is null ? "" : $"<w:type w:val=\"{type}\"/>")}{ContentPage}{cols}</w:sectPr>";

    private static byte[] TwoSectionContent() =>
        new DocxBuilder()
            .WithBody(
                Paragraph(Run("uma coluna")),
                Paragraph(Run("fim da primeira"), Break("<w:cols w:space=\"708\"/>", "continuous")),
                Paragraph(Run("duas colunas")))
            .WithSectionProperties(Break("<w:cols w:num=\"2\" w:space=\"400\"/>", "nextPage"))
            .Build();

    private static List<XElement> Sections(byte[] docx)
    {
        var body = Xml(docx).Descendants(W + "body").Single();
        return [.. body.Elements(W + "p").Select(p => p.Element(W + "pPr")?.Element(W + "sectPr")).OfType<XElement>(), body.Element(W + "sectPr")!];
    }

    private static string? Attr(XElement? e, string name) => (string?)e?.Attribute(W + name);

    [Fact]
    public void Sem_A_Opcao_As_Secoes_Do_Conteudo_Sao_Achatadas()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), new() { SampleMarkers = SampleTemplate.SampleMarkers });
        var sections = Sections(doc.Save());

        Assert.Equal(2, sections.Count);
        Assert.Null(sections[^1].Element(W + "cols")!.Attribute(W + "num"));
    }

    [Fact]
    public void Com_A_Opcao_Mantem_As_Secoes_Com_A_Pagina_E_O_Rodape_Do_Modelo()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var saved = doc.Save();
        var sections = Sections(saved);

        Assert.Equal(4, sections.Count);
        var (capa, modelo, primeira, ultima) = (sections[0], sections[1], sections[2], sections[3]);
        Assert.Equal("0", Attr(capa.Element(W + "pgMar"), "footer"));
        Assert.Null(modelo.Element(W + "type"));
        Assert.Equal("continuous", Attr(primeira.Element(W + "type"), "val"));
        Assert.Equal("nextPage", Attr(ultima.Element(W + "type"), "val"));
        Assert.Equal("2", Attr(ultima.Element(W + "cols"), "num"));
        Assert.Equal("400", Attr(ultima.Element(W + "cols"), "space"));
        Assert.All(sections.Skip(1), s =>
        {
            Assert.Equal("11906", Attr(s.Element(W + "pgSz"), "w"));
            Assert.Equal("720", Attr(s.Element(W + "pgMar"), "left"));
            Assert.Equal("rId8", (string?)s.Element(W + "footerReference")!.Attribute(R + "id"));
        });
        Assert.Equal(["Capa da política", "Versão #{Version} — #{Area}", "uma coluna", "fim da primeira", "duas colunas"], BodyParagraphs(saved).Select(Text).Where(t => !t.Contains("#{Logo}", StringComparison.Ordinal)).ToList());
    }

    [Fact]
    public void A_Quebra_Do_Modelo_Fica_No_Ultimo_Paragrafo_Dele()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var paragraphs = BodyParagraphs(doc.Save());
        var carrier = paragraphs.Single(p => Text(p) == "Versão #{Version} — #{Area}");

        Assert.NotNull(carrier.Element(W + "pPr")?.Element(W + "sectPr"));
        Assert.Equal("uma coluna", Text(paragraphs[paragraphs.IndexOf(carrier) + 1]));
    }

    [Fact]
    public void Modelo_Terminado_Em_Tabela_Ganha_Paragrafo_Para_A_Quebra()
    {
        var template = new DocxBuilder()
            .WithBody(Table(Paragraph(Run("célula"))), Paragraph(""))
            .WithSectionProperties(Break("<w:cols w:space=\"708\"/>"))
            .Build();
        var doc = DocxDocument.Open(template);

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var body = Xml(doc.Save()).Descendants(W + "body").Single();
        var afterTable = body.Element(W + "tbl")!.ElementsAfterSelf().First();

        Assert.Equal(W + "p", afterTable.Name);
        Assert.NotNull(afterTable.Element(W + "pPr")?.Element(W + "sectPr"));
        Assert.Equal("", Text(afterTable));
        Assert.Equal(3, Sections(doc.Save()).Count);
    }

    [Fact]
    public void Modelo_Esvaziado_Recebe_As_Secoes_Sem_Quebra_Extra()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(doc);

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), new() { PreserveSections = true });
        var saved = doc.Save();
        var sections = Sections(saved);

        Assert.Equal(2, sections.Count);
        Assert.Equal("continuous", Attr(sections[0].Element(W + "type"), "val"));
        Assert.Equal("2", Attr(sections[1].Element(W + "cols"), "num"));
        Assert.All(sections, s => Assert.Equal("11906", Attr(s.Element(W + "pgSz"), "w")));
        Assert.Empty(Xml(saved).Descendants(W + "footerReference"));
        Assert.Equal(["uma coluna", "fim da primeira", "duas colunas"], BodyParagraphs(saved).Select(Text).ToList());
    }

    [Fact]
    public void Conteudo_De_Uma_Secao_Com_As_Colunas_Do_Modelo_Entra_Igual_A_Sem_A_Opcao()
    {
        var content = new DocxBuilder()
            .WithBody(Paragraph(Run("texto")))
            .WithSectionProperties(Break("<w:cols w:space=\"720\"/>"))
            .Build();
        var preserved = DocxDocument.Open(SampleTemplate.Build());
        var flattened = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(preserved, content, Preserving);
        DocxTemplate.ApplyContent(flattened, content, new() { SampleMarkers = SampleTemplate.SampleMarkers });

        Assert.Equal(ReadPart(flattened.Save(), "word/document.xml"), ReadPart(preserved.Save(), "word/document.xml"));
    }

    [Fact]
    public void Conteudo_De_Uma_Secao_Em_Duas_Colunas_Ganha_Secao_Propria()
    {
        var content = new DocxBuilder()
            .WithBody(Paragraph(Run("texto em colunas")))
            .WithSectionProperties(Break("<w:cols w:num=\"2\" w:space=\"720\"/>"))
            .Build();
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, content, Preserving);
        var sections = Sections(doc.Save());

        Assert.Equal(3, sections.Count);
        Assert.Null(sections[1].Element(W + "cols")!.Attribute(W + "num"));
        Assert.Equal("continuous", Attr(sections[2].Element(W + "type"), "val"));
        Assert.Equal("2", Attr(sections[2].Element(W + "cols"), "num"));
    }

    [Fact]
    public void Secoes_Do_Conteudo_Nao_Reiniciam_A_Numeracao_Nem_Usam_A_Pagina_De_Rosto()
    {
        var template = new DocxBuilder()
            .WithBody(Paragraph(Run("modelo")))
            .WithSectionProperties($"<w:sectPr>{ContentPage}<w:pgNumType w:fmt=\"lowerRoman\" w:start=\"3\"/><w:titlePg/></w:sectPr>")
            .Build();
        var doc = DocxDocument.Open(template);

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var sections = Sections(doc.Save());

        Assert.Equal("3", Attr(sections[0].Element(W + "pgNumType"), "start"));
        Assert.NotNull(sections[0].Element(W + "titlePg"));
        Assert.All(sections.Skip(1), s =>
        {
            Assert.Null(s.Element(W + "titlePg"));
            Assert.Null(s.Element(W + "pgNumType")!.Attribute(W + "start"));
            Assert.Equal("lowerRoman", Attr(s.Element(W + "pgNumType"), "fmt"));
        });
    }

    [Fact]
    public void Propriedades_Da_Secao_Saem_Na_Ordem_Do_Schema()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var order = Sections(doc.Save())[^1].Elements().Select(e => e.Name.LocalName).ToList();

        Assert.Equal(["footerReference", "type", "pgSz", "pgMar", "cols"], order);
    }

    [Fact]
    public void Imagem_Em_Secao_De_Duas_Colunas_Cabe_Na_Coluna()
    {
        var content = new DocxBuilder()
            .WithImage("rIdImg", "image1.png", PngOfSize(2000, 500))
            .WithBody(Paragraph(Picture("rIdImg", 2000 * 9525L, 500 * 9525L)))
            .WithSectionProperties(Break("<w:cols w:num=\"2\" w:space=\"720\"/>"))
            .Build();
        var doc = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(doc);

        DocxTemplate.ApplyContent(doc, content, new() { PreserveSections = true });
        long cx = (long)Xml(doc.Save()).Descendants(XName.Get("extent", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")).Single().Attribute("cx")!;

        Assert.Equal((11906 - 720 - 720 - 720) / 2 * DocxPictures.EmuPerTwip, cx);
    }

    [Fact]
    public void Saneamento_Sem_Juntar_Secoes_Mantem_As_Quebras_Sem_Cabecalhos()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithHeader("rIdH", $"<w:hdr xmlns:w=\"{WordNs}\"><w:p><w:r><w:t>cabeçalho</w:t></w:r></w:p></w:hdr>")
            .WithBody(
                Paragraph(Run("a"), $"<w:sectPr><w:headerReference w:type=\"default\" r:id=\"rIdH\"/>{ContentPage}<w:cols w:num=\"2\"/></w:sectPr>"),
                Paragraph(Run("b")))
            .WithSectionProperties($"<w:sectPr><w:headerReference w:type=\"default\" r:id=\"rIdH\"/>{ContentPage}</w:sectPr>")
            .Build());

        DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { MergeSections = false });
        var saved = doc.Save();
        var sections = Sections(saved);

        Assert.Equal(2, sections.Count);
        Assert.Equal("2", Attr(sections[0].Element(W + "cols"), "num"));
        Assert.Empty(Xml(saved).Descendants(W + "headerReference"));
        Assert.DoesNotContain(PartNames(saved), n => n.StartsWith("word/header", StringComparison.Ordinal));
    }

    [Fact]
    public void Pdf_Do_Conteudo_Com_Secoes_E_Colunas()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(doc, TwoSectionContent(), Preserving);
        var pdf = DocxLayoutPipeline.ToPdf(doc.Save(), SubstituteFontProvider.Shared);

        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf, 0, 4));
    }
}
