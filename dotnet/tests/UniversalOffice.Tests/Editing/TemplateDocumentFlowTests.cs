using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using UniversalOffice.DocxLayout;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Formas, cabeçalho/rodapé, propriedades e os fluxos completos de um aplicativo que
/// gera documentos a partir de um modelo (logotipo, rodapé com a cor da empresa,
/// metadados, parâmetros, conteúdo .docx ou escrito com <see cref="DocxBodyWriter"/>,
/// saneamento, texto puro), terminando no PDF do motor de layout.
/// </summary>
public class TemplateDocumentFlowTests
{
    private static readonly XNamespace A = "http://schemas.openxmlformats.org/drawingml/2006/main";
    private static readonly XNamespace Wp = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
    private static readonly XNamespace V = "urn:schemas-microsoft-com:vml";

    // ─────────────────────────────── formas e rodapé ───────────────────────────────

    [Fact]
    public void Logo_Entra_No_Lugar_Do_Parametro_Limitado_A_200x75_Pt()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        int count = DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", PngOfSize(800, 200), 200, 75);
        var saved = doc.Save();
        var inline = Xml(saved).Descendants(Wp + "inline").ToList();

        Assert.Equal(2, count); // mc:Choice e mc:Fallback
        Assert.Equal(2, inline.Count);
        long cx = (long)inline[0].Element(Wp + "extent")!.Attribute("cx")!, cy = (long)inline[0].Element(Wp + "extent")!.Attribute("cy")!;
        Assert.Equal(200 * 12700L, cx);
        Assert.Equal(50 * 12700L, cy);
        Assert.Single(PartNames(saved), n => n.StartsWith("word/media/", StringComparison.Ordinal));
        Assert.DoesNotContain("#{Logo}", AllXml(saved));
        var docPrIds = Xml(saved).Descendants(Wp + "docPr").Select(d => (string)d.Attribute("id")!).ToList();
        Assert.Equal(docPrIds.Count, docPrIds.Distinct().Count());
    }

    [Fact]
    public void Sem_Logo_A_Caixa_De_Texto_Sai()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        Assert.Equal(1, DocxShapes.RemoveContaining(doc, "#{Logo}"));
        var saved = doc.Save();

        Assert.DoesNotContain("#{Logo}", AllXml(saved));
        Assert.Contains("#{TitleWithCode}", BodyText(saved));
        Assert.Empty(Xml(saved).Descendants(W + "drawing"));
    }

    [Fact]
    public void Rodape_Com_Cor_Da_Empresa_E_Texto_Branco()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        var shape = DocxShapes.FirstShapeIn(doc, footer: true);
        Assert.NotNull(shape);
        shape.SetFillColor("#123456");
        shape.SetTextColor("FFFFFF");
        var footer = Xml(doc.Save(), "word/footer1.xml");

        Assert.Equal("123456", (string?)footer.Descendants(A + "spPr").Concat(footer.Descendants(XName.Get("spPr", "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"))).Descendants(A + "srgbClr").Single().Attribute("val"));
        Assert.Empty(footer.Descendants(A + "schemeClr"));
        Assert.Equal("#123456", (string?)footer.Descendants(V + "shape").Single().Attribute("fillcolor"));
        var runs = footer.Descendants(W + "txbxContent").SelectMany(t => t.Descendants(W + "r")).ToList();
        Assert.All(runs, r => Assert.Equal("FFFFFF", (string?)r.Element(W + "rPr")!.Element(W + "color")!.Attribute(W + "val")));
        Assert.Contains("PAGE", footer.ToString());
    }

    [Fact]
    public void Rodape_Sem_Numero_De_Pagina_E_Sem_Cor()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        var shape = DocxShapes.FirstShapeIn(doc, footer: true)!;
        shape.ClearText();
        shape.SetFillTransparent();
        var footer = Xml(doc.Save(), "word/footer1.xml");

        Assert.Empty(footer.Descendants(W + "fldChar"));
        Assert.Contains(footer.Descendants(A + "noFill"), n => n.Parent!.Name.LocalName == "spPr" && n.Parent.Name.NamespaceName.Contains("wordprocessingShape"));
        Assert.Equal("f", (string?)footer.Descendants(V + "shape").Single().Attribute("filled"));
        Assert.All(footer.Descendants(W + "txbxContent"), t => Assert.Single(t.Elements(W + "p")));
    }

    [Fact]
    public void Rodape_Esvaziado_Fica_Com_Um_Paragrafo()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        Assert.True(DocxShapes.ClearHeaderFooter(doc, footer: true));
        Assert.False(DocxShapes.ClearHeaderFooter(doc, footer: false));
        var footer = Xml(doc.Save(), "word/footer1.xml");

        Assert.Single(footer.Root!.Elements());
        Assert.Empty(footer.Descendants(W + "drawing"));
        Assert.Null(DocxShapes.FirstShapeIn(DocxDocument.Open(doc.Save()), footer: true));
    }

    [Fact]
    public void Propriedades_Do_Documento()
    {
        var doc = DocxDocument.Open(new DocxBuilder().Build());
        var when = new DateTime(2026, 10, 29, 12, 30, 0, DateTimeKind.Utc);

        doc.Properties.Title = "POL-001 - Código";
        doc.Properties.Author = "Autora";
        doc.Properties.LastAuthor = "Revisor";
        doc.Properties.Company = "Acme";
        doc.Properties.Category = "Políticas";
        doc.Properties.Subject = "Políticas";
        doc.Properties.ApplicationName = "Sample App";
        doc.Properties.LastSaveDate = when;
        var reopened = DocxDocument.Open(doc.Save());

        Assert.Equal("POL-001 - Código", reopened.Properties.Title);
        Assert.Equal("Autora", reopened.Properties.Author);
        Assert.Equal("Revisor", reopened.Properties.LastAuthor);
        Assert.Equal("Acme", reopened.Properties.Company);
        Assert.Equal("Políticas", reopened.Properties.Category);
        Assert.Equal("Sample App", reopened.Properties.ApplicationName);
        Assert.Equal(when, reopened.Properties.LastSaveDate);
        Assert.Contains("docProps/core.xml", PartNames(doc.Save()));
        Assert.Contains("core-properties", ReadPart(doc.Save(), "[Content_Types].xml"));
    }

    [Fact]
    public void Leitor_De_Imagem()
    {
        var png = ImageInfo.TryRead(PngOfSize(300, 150))!;
        Assert.Equal(("png", 300, 150), (png.Extension, png.WidthPx, png.HeightPx));
        Assert.Equal(300 * 9525L, png.WidthEmu);

        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, (byte)'J', (byte)'F', (byte)'I', (byte)'F', 0, 1, 1, 1, 0, 72, 0, 72, 0, 0, 0xFF, 0xC0, 0, 17, 8, 0, 50, 0, 100, 3];
        var jpg = ImageInfo.TryRead(jpeg)!;
        Assert.Equal(("jpeg", 100, 50, 72.0), (jpg.Extension, jpg.WidthPx, jpg.HeightPx, jpg.DpiX));
        Assert.Equal(100 * 12700L, jpg.WidthEmu);

        byte[] gif = [(byte)'G', (byte)'I', (byte)'F', (byte)'8', (byte)'9', (byte)'a', 10, 0, 20, 0];
        Assert.Equal((10, 20), (ImageInfo.TryRead(gif)!.WidthPx, ImageInfo.TryRead(gif)!.HeightPx));
        Assert.Null(ImageInfo.TryRead("<svg/>"u8));
        Assert.Null(ImageInfo.TryRead([0xFF, 0xD8, 0xFF]));
    }

    // ─────────────────────────────── fluxos completos ───────────────────────────────

    private static readonly IReadOnlyList<string> Samples = SampleTemplate.SampleMarkers;

    private static readonly DocxSanitizeOptions OutputOptions = DocxSanitizeOptions.Output with { IsCustomInlineValid = SampleInlines.IsValid };

    /// <summary>
    /// PDF de documento com conteúdo .docx no modelo do sistema: logo, rodapé, metadados,
    /// parâmetros, histórico, conteúdo, saneamento de saída, PDF.
    /// </summary>
    [Fact]
    public void Fluxo_Do_Modelo_Do_Sistema_Com_Conteudo_Docx_Ate_O_Pdf()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        // identidade visual: logotipo e rodapé
        DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", PngOfSize(400, 100), 200, 75);
        var footer = DocxShapes.FirstShapeIn(doc, footer: true)!;
        footer.SetFillColor("0B5394");
        footer.SetTextColor("FFFFFF");
        // metadados e parâmetros (ANTES do conteúdo)
        doc.Properties.ApplicationName = "Sample App";
        doc.Properties.Title = "POL-001 - Código de Conduta - 2.0";
        DocxText.ReplaceParameters(doc, [new("Code", "POL-001"), new("TitleWithCode", "POL-001 - Código de Conduta"), new("Version", "2.0"), new("Area", "Compliance")]);
        var content = new DocxBuilder().WithBody(
            Paragraph(Run("Objetivo"), "<w:pStyle w:val=\"Heading1\"/>"),
            Paragraph(Run("Olá ") + TagInline("userEmail", "@E-mail") + Run(" #{Title}")),
            Paragraph(Field(" DATE ", "29/10/2026"))).Build();
        // o conteúdo guardado já passou pelo saneamento de entrada
        var stored = DocxDocument.Open(content);
        DocxSanitizer.Sanitize(stored, DocxSanitizeOptions.Content with { IsCustomInlineValid = SampleInlines.IsValid });
        content = stored.Save();
        DocxTemplate.ApplyContent(doc, content, new DocxApplyContentOptions { SampleMarkers = Samples });
        DocxSanitizer.Sanitize(doc, OutputOptions);
        var docx = doc.Save();

        string text = DocxText.GetPlainText(DocxDocument.Open(docx));
        Assert.Contains("POL-001 - Código de Conduta", text);
        Assert.Contains("Versão 2.0 — Compliance", text);
        Assert.Contains("Olá @E-mail #{Title}", text);
        Assert.Contains("29/10/2026", text);
        Assert.DoesNotContain("#{Heading1}", text);
        Assert.Empty(Xml(docx).Descendants(W + "instrText"));
        Assert.Single(DocxCustomInlines.Find(DocxDocument.Open(docx)));

        byte[] pdf = DocxLayoutPipeline.ToPdf(docx, SubstituteFontProvider.Shared, new LayoutOptions { HyphenationLanguages = ["pt-BR"] });
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf, 0, 4));
    }

    /// <summary>Edição: modelo esvaziado + conteúdo .docx, saneado como conteúdo recebido.</summary>
    [Fact]
    public void Fluxo_De_Rebase_Com_Docx()
    {
        var content = new DocxBuilder().WithBody(
            Paragraph(Run("Objetivo"), "<w:pStyle w:val=\"Heading1\"/>"),
            Paragraph(TagInline("userEmail", "@E-mail") + ItemLinkInline("document", 3, "Manual", 2))).Build();

        var doc = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(doc);
        DocxTemplate.ApplyContent(doc, content);
        DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { IsCustomInlineValid = SampleInlines.IsValid });
        var result = doc.Save();

        Assert.Equal(["Objetivo", "@E-mailManual"], BodyParagraphs(result).Select(Text).ToList());
        Assert.Equal("Ttulo1", StyleOf(BodyParagraphs(result)[0]));
        Assert.Equal(["sample.tag", "sample.item-link"], DocxCustomInlines.Find(DocxDocument.Open(result)).Select(i => i.Type).ToList());
        Assert.DoesNotContain(PartNames(result), n => n.StartsWith("customXml/", StringComparison.Ordinal) || n.StartsWith("word/footer", StringComparison.Ordinal));
        Assert.Single(Xml(result).Descendants(W + "sectPr"));
    }

    /// <summary>
    /// Edição de conteúdo vindo de outro editor: amostras → esvaziar → escrever com
    /// <see cref="DocxBodyWriter"/> na formatação das amostras → marcadores viram
    /// inlines → saneamento. O marcador (U+E000 n U+E001) é o que o hospedeiro põe no
    /// lugar dos objetos do outro editor.
    /// </summary>
    [Fact]
    public void Fluxo_De_Rebase_Com_Conteudo_Escrito()
    {
        string marker = (char)0xE000 + "0" + (char)0xE001;

        var doc = DocxDocument.Open(SampleTemplate.Build());
        var samples = DocxParagraphSamples.Extract(doc, SampleTemplate.SampleNames);
        DocxTemplate.Empty(doc);
        var writer = new DocxBodyWriter(doc, new DocxBodyWriterOptions { LinkColor = "2196F3" });
        writer.AddText("Objetivo", DocxRunFormat.None);
        writer.EndParagraph(new DocxParagraphFormat { StyleId = samples["Heading1"].StyleId, KeepWithNext = true });
        writer.AddText("Olá ", DocxRunFormat.None);
        writer.AddText(marker, DocxRunFormat.None);
        writer.EndParagraph(new DocxParagraphFormat { StyleId = samples["Normal"].StyleId });
        writer.Finish();
        DocxCustomInlines.ReplaceText(doc, marker, "sample.tag", """{"v":1,"name":"userEmail"}""", "@E-mail");
        DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { IsCustomInlineValid = SampleInlines.IsValid });
        var result = doc.Save();
        var paragraphs = BodyParagraphs(result);

        Assert.Equal(["Objetivo", "Olá @E-mail"], paragraphs.Select(Text).ToList());
        Assert.Equal("Ttulo1", StyleOf(paragraphs[0]));
        Assert.Single(DocxCustomInlines.Find(DocxDocument.Open(result)));
        Assert.DoesNotContain(Text(paragraphs[1]), c => c is (char)0xE000 or (char)0xE001);

        // rebase do resultado (agora .docx) dá o mesmo corpo
        var again = DocxDocument.Open(SampleTemplate.Build());
        DocxTemplate.Empty(again);
        DocxTemplate.ApplyContent(again, result);
        var second = again.Save();
        Assert.Equal(paragraphs.Select(p => StyleOf(p) + ":" + Text(p)), BodyParagraphs(second).Select(p => StyleOf(p) + ":" + Text(p)));
    }

    /// <summary>PDF de conteúdo escrito no modelo, sem esvaziar: capa e parâmetros ficam.</summary>
    [Fact]
    public void Fluxo_Do_Modelo_Com_Conteudo_Escrito_Ate_O_Pdf()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        DocxShapes.RemoveContaining(doc, "#{Logo}");
        DocxText.ReplaceParameter(doc, "TitleWithCode", "Manual");
        var samples = DocxParagraphSamples.Extract(doc, SampleTemplate.SampleNames);
        var writer = new DocxBodyWriter(doc, new DocxBodyWriterOptions { LinkColor = "2196F3" });
        writer.AddText("Introdução", DocxRunFormat.None);
        writer.EndParagraph(new DocxParagraphFormat { StyleId = samples["Heading1"].StyleId, KeepWithNext = true });
        writer.AddText("Texto ", DocxRunFormat.None);
        writer.AddText("forte", new DocxRunFormat { Bold = true });
        writer.AddText(".", DocxRunFormat.None);
        writer.EndParagraph(DocxParagraphFormat.None);
        writer.AddText("item", DocxRunFormat.None);
        writer.EndParagraph(new DocxParagraphFormat { Base = samples["BulletList"], ListNumId = samples["BulletList"].NumId, Alignment = "left" });
        writer.EndParagraph(DocxParagraphFormat.None);
        writer.Finish();
        DocxSanitizer.Sanitize(doc, OutputOptions);
        var docx = doc.Save();
        var paragraphs = BodyParagraphs(docx).Select(Text).ToList();

        Assert.Equal(["Capa da política", "Manual", "Versão #{Version} — #{Area}", "Introdução", "Texto forte.", "item"], paragraphs);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(DocxLayoutPipeline.ToPdf(docx, SubstituteFontProvider.Shared), 0, 4));
    }

    /// <summary>Texto puro para busca/IA: corpo sem cabeçalho/rodapé.</summary>
    [Fact]
    public void Texto_Puro_Do_Documento_Sem_Rodape()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());

        string text = DocxText.GetPlainText(doc);

        Assert.Contains("Capa da política", text);
        Assert.DoesNotContain("1 / 2", text);
    }
}
