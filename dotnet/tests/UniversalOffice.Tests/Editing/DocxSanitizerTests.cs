using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Saneamento de conteúdo recebido e de documento gerado (revisões, comentários,
/// metadados, campos, OLE, macros, proteção…).
/// </summary>
public class DocxSanitizerTests
{
    private const string SectionBreak = """<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>""";

    private static byte[] Clean(byte[] docx, DocxSanitizeOptions? options = null)
    {
        var doc = DocxDocument.Open(docx);
        DocxSanitizer.Sanitize(doc, options ?? DocxSanitizeOptions.Content);
        return doc.Save();
    }

    [Fact]
    public void Aceita_Revisoes()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(
            "<w:ins w:id=\"1\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:t>novo</w:t></w:r></w:ins>" +
            "<w:del w:id=\"2\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:delText>velho</w:delText></w:r></w:del>")).Build();

        var cleaned = Clean(docx);

        Assert.Equal("novo", BodyText(cleaned));
        Assert.Empty(Xml(cleaned).Descendants(W + "ins"));
        Assert.Empty(Xml(cleaned).Descendants(W + "del"));
    }

    [Fact]
    public void Marca_De_Paragrafo_Excluida_Junta_Ao_Seguinte_E_Linha_Excluida_Sai()
    {
        var docx = new DocxBuilder().WithBody(
            Paragraph(Run("começo "), "<w:rPr><w:del w:id=\"5\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"/></w:rPr>"),
            Paragraph(Run("fim"), "<w:jc w:val=\"center\"/>"),
            "<w:tbl><w:tblGrid><w:gridCol w:w=\"100\"/></w:tblGrid>" +
            "<w:tr><w:trPr><w:del w:id=\"6\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"/></w:trPr><w:tc><w:p><w:r><w:t>linha excluída</w:t></w:r></w:p></w:tc></w:tr>" +
            "<w:tr><w:tc><w:p><w:r><w:t>linha mantida</w:t></w:r></w:p></w:tc></w:tr></w:tbl>",
            Paragraph("<w:moveFrom w:id=\"7\" w:author=\"A\"><w:r><w:t>origem</w:t></w:r></w:moveFrom><w:moveTo w:id=\"8\" w:author=\"A\"><w:r><w:t>destino</w:t></w:r></w:moveTo>"),
            Paragraph(Run("formatado", "<w:b/><w:rPrChange w:id=\"9\" w:author=\"A\"><w:rPr/></w:rPrChange>"))).Build();

        var cleaned = Clean(docx);
        var paragraphs = BodyParagraphs(cleaned);

        Assert.Equal("começo fim", Text(paragraphs[0]));
        Assert.Equal("center", (string?)paragraphs[0].Element(W + "pPr")!.Element(W + "jc")!.Attribute(W + "val"));
        Assert.DoesNotContain("linha excluída", BodyText(cleaned));
        Assert.Contains("linha mantida", BodyText(cleaned));
        Assert.Contains("destino", BodyText(cleaned));
        Assert.DoesNotContain("origem", BodyText(cleaned));
        Assert.Empty(Xml(cleaned).Descendants(W + "rPrChange"));
        Assert.Empty(Xml(cleaned).Descendants(W + "moveTo"));
    }

    [Fact]
    public void Remove_Comentarios()
    {
        var docx = new DocxBuilder()
            .WithComments($"""<w:comments xmlns:w="{WordNs}"><w:comment w:id="0" w:author="A"><w:p><w:r><w:t>comentário</w:t></w:r></w:p></w:comment></w:comments>""")
            .WithBody(Paragraph("<w:commentRangeStart w:id=\"0\"/><w:r><w:t>texto</w:t></w:r><w:commentRangeEnd w:id=\"0\"/><w:r><w:commentReference w:id=\"0\"/></w:r>"))
            .Build();

        var cleaned = Clean(docx);

        Assert.Empty(Xml(cleaned).Descendants(W + "commentReference"));
        Assert.Empty(Xml(cleaned).Descendants(W + "commentRangeStart"));
        Assert.DoesNotContain("comentário", AllXml(cleaned));
        Assert.False(HasPart(cleaned, "word/comments.xml"));
        Assert.DoesNotContain("comments", ReadPart(cleaned, "[Content_Types].xml"));
        Assert.Equal("texto", BodyText(cleaned));
    }

    [Fact]
    public void Varias_Secoes_Viram_Uma_Com_Todo_O_Conteudo()
    {
        var docx = new DocxBuilder().WithBody(
            Paragraph(Run("primeira"), SectionBreak),
            Paragraph(Run("segunda"))).Build();

        var cleaned = Clean(docx);

        Assert.Single(Xml(cleaned).Descendants(W + "sectPr"));
        Assert.Equal("primeirasegunda", BodyText(cleaned));
    }

    [Fact]
    public void Remove_Cabecalho_E_Rodape()
    {
        var docx = new DocxBuilder()
            .WithHeader("rIdHeader", $"""<w:hdr xmlns:w="{WordNs}"><w:p><w:r><w:t>cabeçalho secreto</w:t></w:r></w:p></w:hdr>""")
            .WithFooter("rIdFooter", $"""<w:ftr xmlns:w="{WordNs}"><w:p><w:r><w:t>rodapé secreto</w:t></w:r></w:p></w:ftr>""")
            .WithSectionProperties("""<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>""")
            .Build();

        var cleaned = Clean(docx);

        Assert.DoesNotContain("cabeçalho secreto", AllXml(cleaned));
        Assert.DoesNotContain("rodapé secreto", AllXml(cleaned));
        Assert.False(HasPart(cleaned, "word/header1.xml"));
        Assert.Empty(Xml(cleaned).Descendants(W + "headerReference"));
    }

    [Fact]
    public void Campo_Fora_Da_Lista_Vira_O_Resultado_Em_Cache()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Field(" DATE \\@ \"dd/MM/yyyy\" ", "01/01/2020") + Field(" PAGE ", "1"))).Build();

        var cleaned = Clean(docx);
        var instructions = string.Concat(Xml(cleaned).Descendants(W + "instrText").Select(i => i.Value));

        Assert.DoesNotContain("DATE", instructions);
        Assert.Contains("PAGE", instructions);
        Assert.Equal("01/01/20201", BodyText(cleaned));
    }

    [Fact]
    public void IncludeText_Mantem_O_Resultado_Sem_Avaliar()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Run("a ") + Field(" INCLUDETEXT \"C:\\\\Windows\\\\win.ini\" ", "resultado guardado") + Run(" b"))).Build();

        var cleaned = Clean(docx);

        Assert.Equal("a resultado guardado b", BodyText(cleaned));
        Assert.DoesNotContain("INCLUDETEXT", AllXml(cleaned));
        Assert.Empty(Xml(cleaned).Descendants(W + "fldChar"));
    }

    [Fact]
    public void Campo_Aninhado_No_Codigo_Sai_Com_O_Externo()
    {
        // { IF { DATE } = "x" "sim" "não" } → resultado "não"
        string nested =
            "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> IF </w:instrText></w:r>" +
            Field(" DATE ", "hoje") +
            "<w:r><w:instrText xml:space=\"preserve\"> = \"x\" \"sim\" \"não\" </w:instrText></w:r>" +
            "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>" + Run("não") + "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";
        var docx = new DocxBuilder().WithBody(Paragraph(nested)).Build();

        var cleaned = Clean(docx);

        Assert.Equal("não", BodyText(cleaned));
        Assert.Empty(Xml(cleaned).Descendants(W + "fldChar"));
    }

    [Fact]
    public void Campo_Simples_Fora_Da_Lista_Vira_Resultado()
    {
        var docx = new DocxBuilder().WithBody(Paragraph("<w:fldSimple w:instr=\" AUTHOR \">" + Run("Fulano") + "</w:fldSimple><w:fldSimple w:instr=\" PAGE \">" + Run("3") + "</w:fldSimple>")).Build();

        var cleaned = Clean(docx);

        Assert.Equal("Fulano3", BodyText(cleaned));
        Assert.Single(Xml(cleaned).Descendants(W + "fldSimple"));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("file:///C:/Windows/win.ini")]
    public void Hiperlink_Fora_Dos_Esquemas_Vira_Texto(string url)
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Field($" HYPERLINK \"{url}\" ", "clique"))).Build();

        var cleaned = Clean(docx);

        Assert.DoesNotContain(url, AllXml(cleaned));
        Assert.Contains("clique", BodyText(cleaned));
    }

    [Fact]
    public void Hiperlink_Https_Fica_E_Vira_Hiperlink_Nativo()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Run("Ver ") + Field(" HYPERLINK \"https://example.com/politica\" ", "política") + Run(" fim"))).Build();

        var cleaned = Clean(docx);
        var hyperlink = Assert.Single(Xml(cleaned).Descendants(W + "hyperlink"));

        Assert.Equal("https://example.com/politica", RelTarget(cleaned, (string)hyperlink.Attribute(R + "id")!));
        Assert.Equal("política", string.Concat(hyperlink.Descendants(W + "t").Select(t => t.Value)));
        Assert.Empty(Xml(cleaned).Descendants(W + "fldChar"));
        Assert.Equal("Ver política fim", BodyText(cleaned));
    }

    [Fact]
    public void Hiperlink_Externo_Com_Esquema_Proibido_Vira_Texto()
    {
        var docx = new DocxBuilder()
            .WithBody(Paragraph("<w:hyperlink r:id=\"rIdBad\"><w:r><w:t>perigo</w:t></w:r></w:hyperlink><w:hyperlink r:id=\"rIdOk\"><w:r><w:t>ok</w:t></w:r></w:hyperlink>"))
            .WithDocumentRelationship("rIdBad", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", "javascript:alert(1)", true)
            .WithDocumentRelationship("rIdOk", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", "https://example.com/", true)
            .Build();

        var cleaned = Clean(docx);

        Assert.DoesNotContain("javascript", AllXml(cleaned));
        Assert.Single(Xml(cleaned).Descendants(W + "hyperlink"));
        Assert.Equal("perigook", BodyText(cleaned));
    }

    [Fact]
    public void Inline_Do_Hospedeiro_Invalido_Fica_So_O_Texto_De_Reserva()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(
            CustomInline("sample.tag", """{"v":1,"name":"userPassword"}""", "@Senha") +
            CustomInline("sample.item-link", """{"v":1,"type":"document","id":0,"title":"X"}""", "Quebrado") +
            CustomInline("sample.other", """{"v":1}""", "Outro"))).Build();

        var cleaned = Clean(docx, DocxSanitizeOptions.Content with { IsCustomInlineValid = SampleInlines.IsValid });

        Assert.Empty(Xml(cleaned).Descendants(W + "sdt"));
        Assert.Equal("@SenhaQuebradoOutro", BodyText(cleaned));
    }

    [Fact]
    public void Inlines_Validos_E_De_Outros_Plugins_Ficam()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(
            TagInline("userEmail", "@E-mail") +
            ItemLinkInline("form", 3, "Formulário") +
            CustomInline("mention", """{"id":1}""", "@Ana"))).Build();

        var cleaned = Clean(docx, DocxSanitizeOptions.Content with { IsCustomInlineValid = SampleInlines.IsValid });
        var tags = Xml(cleaned).Descendants(W + "sdt").Select(s => (string)s.Element(W + "sdtPr")!.Element(W + "tag")!.Attribute(W + "val")!).ToList();

        Assert.Equal(3, tags.Count);
        Assert.Contains(tags, t => t.StartsWith("wordnext:inline:sample.tag:", StringComparison.Ordinal));
        Assert.Contains(tags, t => t.StartsWith("wordnext:inline:sample.item-link:", StringComparison.Ordinal));
        Assert.Contains(tags, t => t.StartsWith("wordnext:inline:mention:", StringComparison.Ordinal));
    }

    [Fact]
    public void Remove_CustomXml()
    {
        var docx = new DocxBuilder()
            .WithEntry("customXml/item1.xml", "<segredo>valor</segredo>", "application/xml")
            .WithEntry("customXml/itemProps1.xml", "<ds:datastoreItem xmlns:ds=\"http://schemas.openxmlformats.org/officeDocument/2006/customXml\" ds:itemID=\"{1}\"/>", "application/vnd.openxmlformats-officedocument.customXmlProperties+xml")
            .WithPartRelationships("customXml/item1.xml", Rel("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps", "itemProps1.xml"))
            .WithDocumentRelationship("rIdCustom", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml", "../customXml/item1.xml")
            .Build();

        var cleaned = Clean(docx);

        Assert.DoesNotContain(PartNames(cleaned), n => n.StartsWith("customXml/", StringComparison.Ordinal));
        Assert.DoesNotContain("customXml", ReadPart(cleaned, "word/_rels/document.xml.rels"));
        Assert.DoesNotContain("customXml", ReadPart(cleaned, "[Content_Types].xml"));
    }

    [Fact]
    public void Remove_Ole_Controles_AltChunk_E_Suas_Partes()
    {
        var docx = new DocxBuilder()
            .WithBody(
                Paragraph(Run("antes") + "<w:r><w:object><v:shape id=\"o1\" style=\"width:10pt;height:10pt\"><v:imagedata r:id=\"rIdPreview\"/></v:shape><o:OLEObject Type=\"Embed\" ProgID=\"Package\" ShapeID=\"o1\" r:id=\"rIdOle\"/></w:object></w:r>" + Run("depois")),
                Paragraph("<w:r><w:pict><v:shape id=\"c1\"/><w:control r:id=\"rIdCtl\" w:name=\"CheckBox1\"/></w:pict></w:r>"),
                "<w:altChunk r:id=\"rIdChunk\"/>")
            .WithEntry("word/embeddings/oleObject1.bin", [1, 2, 3], "application/vnd.openxmlformats-officedocument.oleObject")
            .WithEntry("word/media/preview.png", OnePixelPng)
            .WithEntry("word/activeX/activeX1.xml", "<ax:ocx xmlns:ax=\"http://schemas.microsoft.com/office/2006/activeX\"/>", "application/vnd.ms-office.activeX+xml")
            .WithEntry("word/chunk.html", "<html><body>injetado</body></html>", "text/html")
            .WithDocumentRelationship("rIdOle", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject", "embeddings/oleObject1.bin")
            .WithDocumentRelationship("rIdPreview", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/preview.png")
            .WithDocumentRelationship("rIdCtl", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/control", "activeX/activeX1.xml")
            .WithDocumentRelationship("rIdChunk", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk", "chunk.html")
            .Build();

        var cleaned = Clean(docx);
        var names = PartNames(cleaned);

        Assert.Empty(Xml(cleaned).Descendants(W + "object"));
        Assert.Empty(Xml(cleaned).Descendants(W + "control"));
        Assert.Empty(Xml(cleaned).Descendants(W + "altChunk"));
        Assert.DoesNotContain("word/embeddings/oleObject1.bin", names);
        Assert.DoesNotContain("word/media/preview.png", names);
        Assert.DoesNotContain("word/activeX/activeX1.xml", names);
        Assert.DoesNotContain("word/chunk.html", names);
        Assert.Equal("antesdepois", BodyText(cleaned));
        var rels = ReadPart(cleaned, "word/_rels/document.xml.rels");
        Assert.DoesNotContain("oleObject", rels);
        Assert.DoesNotContain("aFChunk", rels);
    }

    [Fact]
    public void Imagem_Vinculada_Externa_Perde_O_Vinculo_E_Imagem_Embutida_Fica()
    {
        var docx = new DocxBuilder()
            .WithBody(Paragraph(Picture("rIdImg", 914400, 914400) +
                "<w:r><w:drawing><wp:inline><wp:extent cx=\"10\" cy=\"10\"/><wp:docPr id=\"2\" name=\"x\"/><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><pic:pic><pic:blipFill><a:blip r:link=\"rIdExt\"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"))
            .WithImage("rIdImg", "image1.png", OnePixelPng)
            .WithDocumentRelationship("rIdExt", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "http://rastreador.example/pixel.png", true)
            .Build();

        var cleaned = Clean(docx);

        Assert.DoesNotContain("rastreador", AllXml(cleaned));
        Assert.True(HasPart(cleaned, "word/media/image1.png"));
        Assert.Contains("rIdImg", ReadPart(cleaned, "word/_rels/document.xml.rels"));
    }

    [Fact]
    public void Remove_Macros_Protecao_Modelo_Anexado_E_Controle_De_Alteracoes()
    {
        var docx = new DocxBuilder()
            .WithMainContentType("application/vnd.ms-word.document.macroEnabled.main+xml")
            .WithSettings($"""<w:settings xmlns:w="{WordNs}" xmlns:r="{RelNs}"><w:writeProtection w:recommended="1"/><w:attachedTemplate r:id="rIdTpl"/><w:trackRevisions/><w:documentProtection w:edit="readOnly" w:enforcement="1"/></w:settings>""")
            .WithPartRelationships("word/settings.xml", Rel("rIdTpl", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate", "file:///C:/modelos/Normal.dotm", external: true))
            .WithEntry("word/vbaProject.bin", [9, 9, 9], "application/vnd.ms-office.vbaProject")
            .WithDocumentRelationship("rIdVba", "http://schemas.microsoft.com/office/2006/relationships/vbaProject", "vbaProject.bin")
            .Build();

        var cleaned = Clean(docx);
        var settings = Xml(cleaned, "word/settings.xml");

        Assert.False(HasPart(cleaned, "word/vbaProject.bin"));
        Assert.Contains("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml", ReadPart(cleaned, "[Content_Types].xml"));
        Assert.DoesNotContain("macroEnabled", ReadPart(cleaned, "[Content_Types].xml"));
        Assert.Empty(settings.Descendants(W + "trackRevisions"));
        Assert.Empty(settings.Descendants(W + "documentProtection"));
        Assert.Empty(settings.Descendants(W + "writeProtection"));
        Assert.Empty(settings.Descendants(W + "attachedTemplate"));
        Assert.DoesNotContain("Normal.dotm", AllXml(cleaned));
    }

    [Fact]
    public void Limpa_Metadados_E_Propriedades_Personalizadas()
    {
        var doc = DocxDocument.Open(new DocxBuilder().Build());
        doc.Properties.Author = "Autora";
        doc.Properties.Company = "Acme";
        doc.Properties.Title = "Título";
        doc.Properties.SetCustomProperty("Segredo", "valor");
        var withProps = doc.Save();
        Assert.Contains("Acme", AllXml(withProps));

        var cleaned = Clean(withProps);
        var reopened = DocxDocument.Open(cleaned);

        Assert.Null(reopened.Properties.Author);
        Assert.Null(reopened.Properties.Company);
        Assert.Null(reopened.Properties.Title);
        Assert.Empty(reopened.Properties.CustomPropertyNames);
        Assert.DoesNotContain("Segredo", AllXml(cleaned));
    }

    [Fact]
    public void Output_Mantem_Cabecalho_Secoes_E_Metadados()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithHeader("rIdHeader", $"""<w:hdr xmlns:w="{WordNs}"><w:p><w:r><w:t>cabeçalho</w:t></w:r></w:p></w:hdr>""")
            .WithBody(Paragraph(Run("a"), SectionBreak), Paragraph(Run("b") + Field(" DATE ", "hoje")))
            .WithSectionProperties("""<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>""")
            .Build());
        doc.Properties.Company = "Acme";

        DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Output);
        var saved = doc.Save();

        Assert.Contains("cabeçalho", ReadPart(saved, "word/header1.xml"));
        Assert.Equal(2, Xml(saved).Descendants(W + "sectPr").Count());
        Assert.Equal("Acme", DocxDocument.Open(saved).Properties.Company);
        Assert.Equal("abhoje", BodyText(saved));
        Assert.Contains("DATE", string.Concat(Xml(saved).Descendants(W + "instrText").Select(i => i.Value)));

        // o mesmo campo no conteúdo recebido vira texto
        var input = DocxDocument.Open(saved);
        DocxSanitizer.Sanitize(input, DocxSanitizeOptions.Content);
        Assert.Empty(Xml(input.Save()).Descendants(W + "instrText"));
    }

    [Fact]
    public void Remove_Cabecalhos_Mantem_Imagem_Do_Corpo_E_Remove_A_Do_Cabecalho()
    {
        var docx = new DocxBuilder()
            .WithHeader("rIdHeader", $"""<w:hdr xmlns:w="{WordNs}" xmlns:r="{RelNs}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:p>{Picture("rIdLogo", 100, 100)}</w:p></w:hdr>""")
            .WithPartRelationships("word/header1.xml", Rel("rIdLogo", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/logo.png"))
            .WithEntry("word/media/logo.png", OnePixelPng)
            .WithImage("rIdBody", "corpo.png", OnePixelPng)
            .WithBody(Paragraph(Picture("rIdBody", 100, 100, 7)))
            .WithSectionProperties("""<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/></w:sectPr>""")
            .Build();

        var cleaned = Clean(docx);

        Assert.False(HasPart(cleaned, "word/media/logo.png"));
        Assert.True(HasPart(cleaned, "word/media/corpo.png"));
    }
}
