using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Esvaziar o modelo e aplicar conteúdo (estilos, numeração, imagens, notas,
/// amostras e ida e volta).
/// </summary>
public class DocxTemplateTests
{
    private const string SectionBreak = """<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>""";

    private static byte[] Content(params string[] blocks) => new DocxBuilder().WithBody(blocks).Build();

    private static DocxDocument EmptyTemplate() => DocxDocument.Open(new DocxBuilder().WithBody(Paragraph("")).Build());

    private static DocxApplyContentOptions Samples => new() { SampleMarkers = SampleTemplate.SampleMarkers.ToList() };

    // ─────────────────────────────── esvaziar ───────────────────────────────

    [Fact]
    public void Esvaziar_Deixa_Um_Paragrafo_Vazio_Normal_Numa_Secao_So()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.Empty(doc);
        var saved = doc.Save();
        var body = Xml(saved).Descendants(W + "body").Single();

        var paragraph = Assert.Single(body.Elements(W + "p"));
        Assert.Equal("", Text(paragraph));
        Assert.Null(StyleOf(paragraph));
        Assert.Equal("Normal", DocxStyles.ParagraphStyleName(DocxDocument.Open(saved), paragraph));
        Assert.Single(body.Descendants(W + "sectPr"));
        Assert.Empty(body.Descendants(W + "drawing"));
        Assert.DoesNotContain("#{", BodyText(saved));
    }

    [Fact]
    public void Esvaziar_Mantem_A_Pagina_Da_Ultima_Secao()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithBody(
                Paragraph(Run("capa"), """<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="100" w:right="100" w:bottom="100" w:left="100" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>"""),
                Paragraph(Run("corpo")))
            .WithSectionProperties("""<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="1440" w:header="0" w:footer="283" w:gutter="0"/></w:sectPr>""")
            .Build());

        DocxTemplate.Empty(doc);
        var sectPr = Assert.Single(Xml(doc.Save()).Descendants(W + "sectPr"));

        Assert.Equal("11906", (string?)sectPr.Element(W + "pgSz")!.Attribute(W + "w"));
        Assert.Equal("1440", (string?)sectPr.Element(W + "pgMar")!.Attribute(W + "left"));
        Assert.Equal("720", (string?)sectPr.Element(W + "pgMar")!.Attribute(W + "top"));
    }

    [Fact]
    public void Esvaziar_Remove_Cabecalhos_E_Rodapes()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.Empty(doc);
        var saved = doc.Save();

        Assert.DoesNotContain(PartNames(saved), n => n.StartsWith("word/footer", StringComparison.Ordinal) || n.StartsWith("word/header", StringComparison.Ordinal));
        Assert.Empty(Xml(saved).Descendants(W + "footerReference"));
        Assert.DoesNotContain("footer", ReadPart(saved, "word/_rels/document.xml.rels"));
    }

    [Fact]
    public void Esvaziar_Desliga_Controle_De_Alteracoes_Protecao_E_Comentarios()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithSettings($"""<w:settings xmlns:w="{WordNs}"><w:trackRevisions/><w:documentProtection w:edit="readOnly" w:enforcement="1"/></w:settings>""")
            .WithComments($"""<w:comments xmlns:w="{WordNs}"><w:comment w:id="0" w:author="A"><w:p><w:r><w:t>nota</w:t></w:r></w:p></w:comment></w:comments>""")
            .WithBody(Paragraph("<w:commentRangeStart w:id=\"0\"/><w:r><w:t>x</w:t></w:r><w:commentRangeEnd w:id=\"0\"/><w:r><w:commentReference w:id=\"0\"/></w:r>"))
            .Build());

        DocxTemplate.Empty(doc);
        var saved = doc.Save();
        var settings = Xml(saved, "word/settings.xml");

        Assert.Empty(settings.Descendants(W + "trackRevisions"));
        Assert.Empty(settings.Descendants(W + "documentProtection"));
        Assert.False(HasPart(saved, "word/comments.xml"));
    }

    [Fact]
    public void Esvaziar_Mantem_Estilos_Numeracao_Tema_E_Configuracoes()
    {
        var template = SampleTemplate.Build();
        var doc = DocxDocument.Open(template);

        DocxTemplate.Empty(doc);
        var saved = doc.Save();

        foreach (var part in new[] { "word/styles.xml", "word/numbering.xml", "word/theme/theme1.xml", "word/settings.xml" })
            Assert.Equal(ReadBytes(template, part), ReadBytes(saved, part));
    }

    [Fact]
    public void Esvaziar_Limpa_As_Propriedades()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        doc.Properties.Company = "Acme";
        doc.Properties.Author = "Autor";
        doc.Properties.SetCustomProperty("Segredo", "valor");

        DocxTemplate.Empty(doc);

        Assert.Null(doc.Properties.Company);
        Assert.Null(doc.Properties.Author);
        Assert.Empty(doc.Properties.CustomPropertyNames);
    }

    [Fact]
    public void Esvaziar_Mantem_Fontes_Embutidas()
    {
        var font = Enumerable.Range(0, 4096).Select(i => (byte)(i % 251)).ToArray();
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithFontTable($$"""<w:fonts xmlns:w="{{WordNs}}" xmlns:r="{{RelNs}}"><w:font w:name="Carlito"><w:embedRegular r:id="rIdFont1" w:fontKey="{6C2B6E7D-4C0E-4F55-9F0B-8A1E3F2C6D11}"/></w:font></w:fonts>""", ("rIdFont1", "font1.odttf", font))
            .WithBody(Paragraph(Run("Texto", "<w:rFonts w:ascii=\"Carlito\" w:hAnsi=\"Carlito\"/>")))
            .Build());

        DocxTemplate.Empty(doc);
        var saved = doc.Save();

        Assert.NotNull(Xml(saved, "word/fontTable.xml").Descendants(W + "embedRegular").SingleOrDefault());
        Assert.Equal(font, ReadBytes(saved, "word/fonts/font1.odttf"));
    }

    [Fact]
    public void Esvaziar_Remove_Notas_Que_Ninguem_Referencia()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithFootnotes($"""<w:footnotes xmlns:w="{WordNs}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:id="1"><w:p><w:r><w:t>nota antiga</w:t></w:r></w:p></w:footnote></w:footnotes>""")
            .WithBody(Paragraph(Run("x") + "<w:r><w:footnoteReference w:id=\"1\"/></w:r>"))
            .Build());

        DocxTemplate.Empty(doc);
        var saved = doc.Save();

        Assert.DoesNotContain("nota antiga", ReadPart(saved, "word/footnotes.xml"));
        Assert.Contains("separator", ReadPart(saved, "word/footnotes.xml"));
    }

    // ─────────────────────────────── aplicar conteúdo ───────────────────────────────

    [Fact]
    public void Aplicar_Poe_O_Conteudo_Na_Ultima_Secao()
    {
        var template = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("Capa"), SectionBreak), Paragraph(Run("Início do corpo"))).Build());

        DocxTemplate.ApplyContent(template, Content(Paragraph(Run("Conteúdo"))));
        var paragraphs = BodyParagraphs(template.Save());

        Assert.Equal(["Capa", "Início do corpo", "Conteúdo"], paragraphs.Select(Text).ToList());
        Assert.NotNull(paragraphs[0].Element(W + "pPr")?.Element(W + "sectPr"));
    }

    [Fact]
    public void Aplicar_Achata_As_Secoes_Do_Conteudo()
    {
        var template = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("Template"))).Build());

        DocxTemplate.ApplyContent(template, Content(
            Paragraph(Run("Seção 1"), SectionBreak),
            Paragraph(Run("Seção 2"), SectionBreak),
            Paragraph(Run("Seção 3"))));
        var saved = template.Save();

        Assert.Single(Xml(saved).Descendants(W + "sectPr"));
        Assert.Equal(["Template", "Seção 1", "Seção 2", "Seção 3"], BodyParagraphs(saved).Select(Text).ToList());
    }

    [Fact]
    public void Aplicar_Usa_O_Estilo_Do_Destino_Pelo_Nome()
    {
        var template = DocxDocument.Open(SampleTemplate.Build());
        var content = new DocxBuilder()
            .WithStyles($"""
                <w:styles xmlns:w="{WordNs}">
                  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
                  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="0000FF"/></w:rPr></w:style>
                </w:styles>
                """)
            .WithBody(Paragraph(Run("Título"), "<w:pStyle w:val=\"Heading1\"/>"))
            .Build();

        DocxTemplate.ApplyContent(template, content, Samples);
        var saved = template.Save();
        var heading = BodyParagraphs(saved).Single(p => Text(p) == "Título");
        var headingStyles = Xml(saved, "word/styles.xml").Descendants(W + "style").Where(s => (string?)s.Element(W + "name")?.Attribute(W + "val") == "heading 1").ToList();

        Assert.Equal("Ttulo1", StyleOf(heading));
        Assert.Single(headingStyles);
        Assert.Contains(SampleTemplate.HeadingColor, headingStyles[0].ToString());
    }

    [Fact]
    public void Aplicar_Importa_Estilo_Que_Falta_Com_Id_Livre_E_A_Lista_Dele()
    {
        var template = DocxDocument.Open(new DocxBuilder()
            .WithStyles($"""<w:styles xmlns:w="{WordNs}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Destaque"><w:name w:val="Outro nome"/></w:style></w:styles>""")
            .WithBody(Paragraph("")).Build());
        var content = new DocxBuilder()
            .WithStyles($"""<w:styles xmlns:w="{WordNs}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Destaque"><w:name w:val="Destaque da Empresa"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="3"/></w:numPr></w:pPr><w:rPr><w:rFonts w:ascii="Fonte Especial"/></w:rPr></w:style></w:styles>""")
            .WithNumbering($"""<w:numbering xmlns:w="{WordNs}"><w:abstractNum w:abstractNumId="0"><w:nsid w:val="AAAAAAAA"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:num w:numId="3"><w:abstractNumId w:val="0"/></w:num></w:numbering>""")
            .WithBody(Paragraph(Run("Item"), "<w:pStyle w:val=\"Destaque\"/>"))
            .Build();

        DocxTemplate.ApplyContent(template, content);
        var saved = template.Save();
        var styles = Xml(saved, "word/styles.xml").Descendants(W + "style").ToList();
        var imported = styles.Single(s => (string?)s.Element(W + "name")!.Attribute(W + "val") == "Destaque da Empresa");
        var numbering = Xml(saved, "word/numbering.xml");

        Assert.NotEqual("Destaque", (string?)imported.Attribute(W + "styleId"));
        Assert.Equal((string?)imported.Attribute(W + "styleId"), StyleOf(BodyParagraphs(saved).Single()));
        string numId = (string)imported.Descendants(W + "numId").Single().Attribute(W + "val")!;
        var num = numbering.Descendants(W + "num").Single(n => (string?)n.Attribute(W + "numId") == numId);
        var abstractNum = numbering.Descendants(W + "abstractNum").Single(a => (string?)a.Attribute(W + "abstractNumId") == (string?)num.Element(W + "abstractNumId")!.Attribute(W + "val"));
        Assert.Contains("upperRoman", abstractNum.ToString());
        Assert.NotEqual("AAAAAAAA", (string?)abstractNum.Element(W + "nsid")!.Attribute(W + "val"));
        Assert.True(HasPart(saved, "word/numbering.xml"));
        Assert.Contains("numbering", ReadPart(saved, "[Content_Types].xml"));
    }

    [Fact]
    public void Aplicar_Sem_Amostras_Importa_O_Conteudo()
    {
        var template = EmptyTemplate();

        DocxTemplate.ApplyContent(template, Content(Paragraph(Run("Conteúdo"))));

        Assert.Equal(["Conteúdo"], BodyParagraphs(template.Save()).Select(Text).ToList());
    }

    [Fact]
    public void Aplicar_Remove_As_Amostras_Do_Modelo()
    {
        var template = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(template, Content(Paragraph(Run("Conteúdo"))), Samples);
        var saved = template.Save();

        Assert.DoesNotContain("#{Normal}", BodyText(saved));
        Assert.DoesNotContain("#{Heading1}", AllXml(saved));
        Assert.Equal("Conteúdo", Text(BodyParagraphs(saved)[^1]));
        Assert.Contains("#{TitleWithCode}", BodyText(saved));
    }

    [Fact]
    public void Aplicar_Aceita_Revisoes_E_Remove_Comentarios_Do_Conteudo()
    {
        var content = new DocxBuilder()
            .WithComments($"""<w:comments xmlns:w="{WordNs}"><w:comment w:id="0" w:author="A"><w:p><w:r><w:t>nota</w:t></w:r></w:p></w:comment></w:comments>""")
            .WithBody(Paragraph(
                "<w:commentRangeStart w:id=\"0\"/><w:ins w:id=\"1\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:t>novo</w:t></w:r></w:ins><w:commentRangeEnd w:id=\"0\"/><w:r><w:commentReference w:id=\"0\"/></w:r>" +
                "<w:del w:id=\"2\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:delText>velho</w:delText></w:r></w:del>"))
            .Build();
        var template = EmptyTemplate();

        DocxTemplate.ApplyContent(template, content);
        var saved = template.Save();

        Assert.Equal("novo", BodyText(saved));
        Assert.Empty(Xml(saved).Descendants(W + "ins"));
        Assert.Empty(Xml(saved).Descendants(W + "commentReference"));
        Assert.DoesNotContain("nota", AllXml(saved));
    }

    [Fact]
    public void Aplicar_Copia_Imagens_E_Reduz_As_Largas()
    {
        var content = new DocxBuilder()
            .WithImage("rIdImg", "image1.png", OnePixelPng)
            .WithBody(Paragraph(Picture("rIdImg", 2000 * 12700L, 100 * 12700L)))
            .Build();
        var template = DocxDocument.Open(new DocxBuilder()
            .WithImage("rIdLogo", "image1.png", PngOfSize(3, 3))
            .WithBody(Paragraph(Picture("rIdLogo", 12700, 12700))).Build());

        DocxTemplate.ApplyContent(template, content);
        var saved = template.Save();
        var extents = Xml(saved).Descendants(XName.Get("extent", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")).ToList();
        var area = DocxPageArea.From(Xml(saved).Descendants(W + "sectPr").Single());
        var imported = extents.Last();
        long cx = (long)imported.Attribute("cx")!, cy = (long)imported.Attribute("cy")!;
        var blips = Xml(saved).Descendants(XName.Get("blip", "http://schemas.openxmlformats.org/drawingml/2006/main")).Select(b => (string)b.Attribute(R + "embed")!).ToList();
        var targets = blips.Select(id => RelTarget(saved, id)).ToList();

        Assert.True(cx <= area.ClientWidth * 635L + 1);
        Assert.Equal(20.0, (double)cx / cy, 1);
        Assert.Equal(2, targets.Distinct().Count());
        Assert.Equal(OnePixelPng, ReadBytes(saved, "word/" + targets[1]));
        Assert.Equal(PngOfSize(3, 3), ReadBytes(saved, "word/media/image1.png"));
        var docPrIds = Xml(saved).Descendants(XName.Get("docPr", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")).Select(d => (string)d.Attribute("id")!).ToList();
        Assert.Equal(docPrIds.Count, docPrIds.Distinct().Count());
    }

    [Fact]
    public void Aplicar_Mantem_Listas_Numeradas_Separadas()
    {
        var numbering = $"""
            <w:numbering xmlns:w="{WordNs}">
              <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
              <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1)"/></w:lvl></w:abstractNum>
              <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
              <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
            </w:numbering>
            """;
        var content = new DocxBuilder().WithNumbering(numbering).WithBody(
            Paragraph(Run("A1"), "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr>"),
            Paragraph(Run("A2"), "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr>"),
            Paragraph(Run("meio")),
            Paragraph(Run("B1"), "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"2\"/></w:numPr>")).Build();
        var template = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(template, content, Samples);
        var saved = template.Save();
        var paragraphs = BodyParagraphs(saved).Where(p => Text(p) is "A1" or "A2" or "B1").ToDictionary(Text);
        string NumId(string text) => (string)paragraphs[text].Descendants(W + "numId").Single().Attribute(W + "val")!;
        var templateNums = new[] { "7", "8", "10" };

        Assert.Equal(NumId("A1"), NumId("A2"));
        Assert.NotEqual(NumId("A1"), NumId("B1"));
        Assert.DoesNotContain(NumId("A1"), templateNums);
        Assert.DoesNotContain(NumId("B1"), templateNums);
    }

    [Fact]
    public void Aplicar_Conteudo_Que_Termina_Em_Tabela_Mantem_O_Paragrafo_Final()
    {
        var template = EmptyTemplate();

        DocxTemplate.ApplyContent(template, Content(Paragraph(Run("Antes")), Table(Paragraph(Run("célula")))));
        var blocks = Xml(template.Save()).Descendants(W + "body").Single().Elements().Where(e => e.Name != W + "sectPr").ToList();

        Assert.Contains(blocks, b => b.Name == W + "tbl");
        Assert.Equal("Antes", Text(blocks[0]));
    }

    [Fact]
    public void Aplicar_Mantem_Inlines_De_Plugin()
    {
        var template = DocxDocument.Open(SampleTemplate.Build());

        DocxTemplate.ApplyContent(template, Content(Paragraph(Run("Olá ") + TagInline("userEmail", "@E-mail"))), Samples);

        Assert.Single(DocxCustomInlines.Find(template));
    }

    [Fact]
    public void Aplicar_Copia_Notas_De_Rodape_Hiperlinks_Indicadores_E_Fontes_Embutidas()
    {
        var font = Enumerable.Range(0, 1024).Select(i => (byte)i).ToArray();
        var content = new DocxBuilder()
            .WithFootnotes($"""<w:footnotes xmlns:w="{WordNs}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:id="1"><w:p><w:r><w:t>nota do conteúdo</w:t></w:r></w:p></w:footnote></w:footnotes>""")
            .WithFontTable($$"""<w:fonts xmlns:w="{{WordNs}}" xmlns:r="{{RelNs}}"><w:font w:name="Carlito"><w:embedRegular r:id="rIdF" w:fontKey="{00000000-0000-0000-0000-000000000001}"/></w:font><w:font w:name="NaoUsada"/></w:fonts>""", ("rIdF", "font1.odttf", font))
            .WithDocumentRelationship("rIdLink", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", "https://example.com/", true)
            .WithBody(
                Paragraph("<w:bookmarkStart w:id=\"0\" w:name=\"secao\"/>" + Run("Seção", "<w:rFonts w:ascii=\"Carlito\"/>") + "<w:bookmarkEnd w:id=\"0\"/>" + "<w:r><w:footnoteReference w:id=\"1\"/></w:r>"),
                Paragraph("<w:hyperlink r:id=\"rIdLink\"><w:r><w:t>site</w:t></w:r></w:hyperlink><w:hyperlink w:anchor=\"secao\"><w:r><w:t>ir</w:t></w:r></w:hyperlink>"))
            .Build();
        var template = DocxDocument.Open(new DocxBuilder()
            .WithSettings($"""<w:settings xmlns:w="{WordNs}"><w:zoom w:percent="100"/></w:settings>""")
            .WithBody(Paragraph("<w:bookmarkStart w:id=\"0\" w:name=\"secao\"/>" + Run("modelo") + "<w:bookmarkEnd w:id=\"0\"/>")).Build());

        DocxTemplate.ApplyContent(template, content);
        var saved = template.Save();
        var body = Xml(saved);
        var footnoteRef = body.Descendants(W + "footnoteReference").Single();
        var footnotes = Xml(saved, "word/footnotes.xml");
        var external = body.Descendants(W + "hyperlink").Single(h => h.Attribute(R + "id") is not null);
        var bookmarks = body.Descendants(W + "bookmarkStart").ToList();

        Assert.Contains("nota do conteúdo", footnotes.Descendants(W + "footnote").Single(f => (string?)f.Attribute(W + "id") == (string?)footnoteRef.Attribute(W + "id")).ToString());
        Assert.Contains(footnotes.Descendants(W + "footnote"), f => (string?)f.Attribute(W + "id") == "-1");
        Assert.Equal("https://example.com/", RelTarget(saved, (string)external.Attribute(R + "id")!));
        Assert.Equal(2, bookmarks.Select(b => (string?)b.Attribute(W + "id")).Distinct().Count());
        Assert.Equal(2, bookmarks.Select(b => (string?)b.Attribute(W + "name")).Distinct().Count());
        string renamed = (string)bookmarks.Last().Attribute(W + "name")!;
        Assert.Equal(renamed, (string?)body.Descendants(W + "hyperlink").Single(h => h.Attribute(W + "anchor") is not null).Attribute(W + "anchor"));
        var fontTable = Xml(saved, "word/fontTable.xml");
        Assert.NotNull(fontTable.Descendants(W + "font").Single(f => (string?)f.Attribute(W + "name") == "Carlito").Element(W + "embedRegular"));
        Assert.DoesNotContain(fontTable.Descendants(W + "font"), f => (string?)f.Attribute(W + "name") == "NaoUsada");
        Assert.Contains(PartNames(saved), n => n.StartsWith("word/fonts/", StringComparison.Ordinal));
        Assert.NotEmpty(Xml(saved, "word/settings.xml").Descendants(W + "embedTrueTypeFonts"));
        Assert.Contains("footnotes", ReadPart(saved, "[Content_Types].xml"));
    }

    [Fact]
    public void Aplicar_Duas_Vezes_E_Idempotente()
    {
        var content = Content(Paragraph(Run("Objetivo"), "<w:pStyle w:val=\"Heading1\"/>"), Paragraph(Run("Olá ") + TagInline("userEmail", "@E-mail")));
        var first = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(first);
        DocxTemplate.ApplyContent(first, content);
        var firstBytes = first.Save();

        var second = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(second);
        DocxTemplate.ApplyContent(second, firstBytes);
        var secondBytes = second.Save();

        static List<string> Shape(byte[] d) => BodyParagraphs(d).Select(p => $"{StyleOf(p)}:{Text(p)}").ToList();
        Assert.Equal(Shape(firstBytes), Shape(secondBytes));
        Assert.Equal(
            DocxCustomInlines.Find(DocxDocument.Open(firstBytes)).Select(i => i.Json),
            DocxCustomInlines.Find(DocxDocument.Open(secondBytes)).Select(i => i.Json));
    }
}
