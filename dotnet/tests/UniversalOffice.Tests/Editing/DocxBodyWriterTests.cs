using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Amostras do modelo (<see cref="DocxParagraphSamples"/>) e conteúdo formatado escrito
/// no fim do corpo (<see cref="DocxBodyWriter"/>): estilos e listas das amostras,
/// formatação de caractere, links, imagens e o parágrafo vazio do modelo.
/// </summary>
public class DocxBodyWriterTests
{
    private const string LinkColor = "2196F3";

    private static readonly DocxBodyWriterOptions Colored = new() { LinkColor = LinkColor };

    /// <summary>Modelo de exemplo com as amostras já lidas (e removidas).</summary>
    private static (DocxDocument Doc, IReadOnlyDictionary<string, DocxParagraphProperties> Samples) Template()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        return (doc, DocxParagraphSamples.Extract(doc, SampleTemplate.SampleNames));
    }

    /// <summary>Escreve no modelo de exemplo e salva.</summary>
    private static byte[] Write(Action<DocxBodyWriter, IReadOnlyDictionary<string, DocxParagraphProperties>> write, DocxBodyWriterOptions? options = null)
    {
        var (doc, samples) = Template();
        var writer = new DocxBodyWriter(doc, options ?? Colored);
        write(writer, samples);
        writer.Finish();
        return doc.Save();
    }

    private static DocxParagraphFormat Heading(IReadOnlyDictionary<string, DocxParagraphProperties> samples, string name) =>
        new() { StyleId = samples[name].StyleId, KeepWithNext = true };

    private static DocxParagraphFormat ListItem(DocxParagraphProperties sample, string? numId, int level = 0) =>
        new() { Base = sample, ListNumId = numId, ListLevel = level, Alignment = "left" };

    private static void Line(DocxBodyWriter writer, string text, DocxParagraphFormat format)
    {
        writer.AddText(text, DocxRunFormat.None);
        writer.EndParagraph(format);
    }

    private static XElement Para(byte[] saved, string text)
    {
        var paragraphs = BodyParagraphs(saved);
        return paragraphs.SingleOrDefault(p => Text(p) == text) ?? paragraphs.Single(p => Text(p).Contains(text, StringComparison.Ordinal));
    }

    private static string? NumId(XElement p) => (string?)p.Descendants(W + "numId").SingleOrDefault()?.Attribute(W + "val");

    private static string? Ilvl(XElement p) => (string?)p.Descendants(W + "ilvl").SingleOrDefault()?.Attribute(W + "val");

    private static string? RunColor(XElement p, string text) =>
        (string?)p.Descendants(W + "r").Single(r => Text(r) == text).Element(W + "rPr")?.Element(W + "color")?.Attribute(W + "val");

    // ─────────────────────────────── amostras ───────────────────────────────

    [Fact]
    public void Amostras_Sao_Lidas_E_Removidas()
    {
        var doc = DocxDocument.Open(SampleTemplate.Build());
        Assert.True(DocxParagraphSamples.Contains(doc, "Heading1"));
        Assert.False(DocxParagraphSamples.Contains(doc, "heading1"));

        var samples = DocxParagraphSamples.Extract(doc, SampleTemplate.SampleNames);
        var saved = doc.Save();

        Assert.Equal("Ttulo1", samples["Heading1"].StyleId);
        Assert.Equal("PargrafodaLista", samples["NumberedList"].StyleId);
        Assert.Equal("7", samples["NumberedList"].NumId);
        Assert.Null(samples["Heading1"].NumId);
        Assert.False(samples.ContainsKey("UpperRomanList"));
        Assert.DoesNotContain("#{Heading1}", BodyText(saved));
        Assert.DoesNotContain("#{BulletList}", BodyText(saved));
        Assert.Contains("#{TitleWithCode}", BodyText(saved));
        Assert.False(DocxParagraphSamples.Contains(DocxDocument.Open(saved), "Heading1"));
    }

    [Fact]
    public void Modelo_Sem_Amostras_Devolve_Vazio_E_Nao_Muda()
    {
        var bytes = SampleTemplate.Build(withSamples: false);
        var doc = DocxDocument.Open(bytes);

        Assert.False(DocxParagraphSamples.Contains(doc, "Heading1"));
        Assert.Empty(DocxParagraphSamples.Extract(doc, SampleTemplate.SampleNames));
        Assert.Equal(ReadPart(bytes, "word/document.xml"), ReadPart(doc.Save(), "word/document.xml"));
    }

    // ─────────────────────────────── parágrafos ───────────────────────────────

    [Fact]
    public void Titulo_Usa_O_Estilo_Da_Amostra_E_Estilo_Padrao_E_Omitido()
    {
        var saved = Write((w, s) =>
        {
            Line(w, "Objetivo", Heading(s, "Heading1"));
            Line(w, "Texto do corpo", new DocxParagraphFormat { StyleId = s["Normal"].StyleId });
        });

        var heading = Para(saved, "Objetivo");
        var body = Para(saved, "Texto do corpo");

        Assert.Equal("Ttulo1", StyleOf(heading));
        Assert.NotNull(heading.Element(W + "pPr")!.Element(W + "keepNext"));
        Assert.Null(body.Element(W + "pPr"));
        Assert.Equal("Texto do corpo", Text(BodyParagraphs(saved)[^1]));
    }

    [Fact]
    public void Primeira_Linha_Reaproveita_O_Paragrafo_Vazio_Do_Modelo()
    {
        var saved = Write((w, _) =>
        {
            Line(w, "Primeira", DocxParagraphFormat.None);
            Line(w, "Segunda", DocxParagraphFormat.None);
        });
        var paragraphs = BodyParagraphs(saved);

        // capa, título, versão, [vazio reaproveitado] → Primeira, Segunda
        Assert.Equal(["Capa da política", "#{TitleWithCode}", "Versão #{Version} — #{Area}", "Primeira", "Segunda"], paragraphs.Select(Text).Select(t => t.Replace("#{Logo}", "")).ToList());
        Assert.Null(StyleOf(paragraphs[3]));
    }

    [Fact]
    public void Sem_Reaproveitar_E_Sem_Aparar_O_Paragrafo_Vazio_Fica()
    {
        var saved = Write((w, _) =>
        {
            Line(w, "Primeira", DocxParagraphFormat.None);
            w.EndParagraph(DocxParagraphFormat.None);
        }, new DocxBodyWriterOptions { ReuseEmptyLastParagraph = false, TrimTrailingEmptyParagraph = false });
        var texts = BodyParagraphs(saved).Select(Text).ToList();

        Assert.Equal(["", "Primeira", ""], texts[^3..]);
    }

    [Fact]
    public void Lista_Com_Nivel_Usa_A_Amostra_E_A_Numeracao_Dela()
    {
        var saved = Write((w, s) =>
        {
            Line(w, "Primeiro", ListItem(s["NumberedList"], s["NumberedList"].NumId));
            Line(w, "Segundo", ListItem(s["NumberedList"], s["NumberedList"].NumId, level: 1));
            Line(w, "Fundo", ListItem(s["NumberedList"], s["NumberedList"].NumId, level: 20));
        });

        var first = Para(saved, "Primeiro");
        var second = Para(saved, "Segundo");

        Assert.Equal("7", NumId(first));
        Assert.Equal("0", Ilvl(first));
        Assert.Equal("7", NumId(second));
        Assert.Equal("1", Ilvl(second));
        Assert.Equal("8", Ilvl(Para(saved, "Fundo")));
        Assert.Equal("PargrafodaLista", StyleOf(first));
        Assert.Equal("left", (string?)first.Element(W + "pPr")!.Element(W + "jc")!.Attribute(W + "val"));
        Assert.Equal("360", (string?)first.Element(W + "pPr")!.Element(W + "spacing")!.Attribute(W + "after"));
        Assert.Equal(["pStyle", "numPr", "spacing", "jc"], first.Element(W + "pPr")!.Elements().Select(e => e.Name.LocalName).ToList());
    }

    [Fact]
    public void Lista_Reiniciada_E_Tipo_Sem_Amostra_Usam_Instancias_Novas()
    {
        var (doc, samples) = Template();
        var numbered = samples["NumberedList"];
        var writer = new DocxBodyWriter(doc);
        Line(writer, "A1", ListItem(numbered, numbered.NumId));
        Line(writer, "A2", ListItem(numbered, numbered.NumId));
        Line(writer, "meio", DocxParagraphFormat.None);
        string restarted = DocxNumbering.AddRestartedInstance(doc, numbered.NumId!)!;
        Line(writer, "B1", ListItem(numbered, restarted));
        Line(writer, "B2", ListItem(numbered, restarted));
        Line(writer, "R1", ListItem(samples["RomanList"], samples["RomanList"].NumId));
        // tipo sem amostra: a numerada, numa instância reiniciada própria
        Line(writer, "L1", ListItem(numbered, DocxNumbering.AddRestartedInstance(doc, numbered.NumId!)));
        Line(writer, "M1", ListItem(samples["BulletList"], samples["BulletList"].NumId));
        writer.Finish();
        var saved = doc.Save();
        var numbering = Xml(saved, "word/numbering.xml");

        Assert.Equal(NumId(Para(saved, "A1")), NumId(Para(saved, "A2")));
        Assert.NotEqual(NumId(Para(saved, "A1")), NumId(Para(saved, "B1")));
        Assert.Equal(NumId(Para(saved, "B1")), NumId(Para(saved, "B2")));
        Assert.Equal("10", NumId(Para(saved, "R1")));
        Assert.Equal("8", NumId(Para(saved, "M1")));
        var restartedNum = numbering.Descendants(W + "num").Single(n => (string?)n.Attribute(W + "numId") == NumId(Para(saved, "B1")));
        Assert.Equal("0", (string?)restartedNum.Element(W + "abstractNumId")!.Attribute(W + "val"));
        Assert.Equal("1", (string?)restartedNum.Descendants(W + "startOverride").First().Attribute(W + "val"));
        var latin = numbering.Descendants(W + "num").Single(n => (string?)n.Attribute(W + "numId") == NumId(Para(saved, "L1")));
        Assert.Equal("0", (string?)latin.Element(W + "abstractNumId")!.Attribute(W + "val"));
        Assert.NotEqual("7", NumId(Para(saved, "L1")));
        Assert.NotEqual(NumId(Para(saved, "B1")), NumId(Para(saved, "L1")));
    }

    [Fact]
    public void Recuo_E_Alinhamento_Do_Paragrafo()
    {
        var saved = Write((w, s) =>
        {
            Line(w, "recuado", new DocxParagraphFormat { LeftIndentTwips = 1440, Alignment = "both" });
            Line(w, "centro", Heading(s, "Heading2") with { Alignment = "center" });
        });
        var p = Para(saved, "recuado");
        var centered = Para(saved, "centro");

        Assert.Equal("both", (string?)p.Element(W + "pPr")!.Element(W + "jc")!.Attribute(W + "val"));
        Assert.Equal("1440", (string?)p.Element(W + "pPr")!.Element(W + "ind")!.Attribute(W + "left"));
        Assert.Equal("Ttulo2", StyleOf(centered));
        Assert.Equal(["pStyle", "keepNext", "jc"], centered.Element(W + "pPr")!.Elements().Select(e => e.Name.LocalName).ToList());
    }

    [Fact]
    public void Alinhamento_Invalido_Lanca_Sem_Escrever()
    {
        var (doc, _) = Template();
        var writer = new DocxBodyWriter(doc);
        writer.AddText("x", DocxRunFormat.None);

        Assert.Throws<ArgumentException>(() => writer.EndParagraph(new DocxParagraphFormat { Alignment = "justify" }));
        Assert.False(writer.LineIsEmpty);
    }

    [Fact]
    public void Ultimo_Paragrafo_Vazio_Sai()
    {
        var saved = Write((w, s) =>
        {
            Line(w, "Última linha", ListItem(s["NumberedList"], s["NumberedList"].NumId));
            w.AddText("  ", DocxRunFormat.None);
            w.EndParagraph(DocxParagraphFormat.None);
        });

        Assert.Equal("Última linha", Text(BodyParagraphs(saved)[^1]));
        Assert.Equal("7", NumId(BodyParagraphs(saved)[^1]));
    }

    [Fact]
    public void Linha_Pendente_Fecha_No_Finish()
    {
        var saved = Write((w, _) => w.AddText("sem fim de parágrafo", DocxRunFormat.None));

        Assert.Equal("sem fim de parágrafo", Text(BodyParagraphs(saved)[^1]));
    }

    // ─────────────────────────────── caractere ───────────────────────────────

    [Fact]
    public void Formatacao_De_Caractere()
    {
        var saved = Write((w, _) =>
        {
            w.AddText("negrito", new DocxRunFormat { Bold = true });
            w.AddText(" itálico", new DocxRunFormat { Italic = true, Underline = true });
            w.AddText(" riscado", new DocxRunFormat { Strike = true, Color = "rgb(255, 0, 0)", Background = "#ff0" });
            w.AddText(" x2", new DocxRunFormat { VerticalAlign = DocxVerticalAlign.Superscript });
            w.AddText(" i", new DocxRunFormat { VerticalAlign = DocxVerticalAlign.Subscript, Color = "não é cor" });
            w.AddText("", new DocxRunFormat { Bold = true });
            w.EndParagraph(DocxParagraphFormat.None);
        });
        var p = Para(saved, "negrito");
        XElement RPr(string text) => p.Descendants(W + "r").Single(r => Text(r) == text).Element(W + "rPr")!;

        Assert.NotNull(RPr("negrito").Element(W + "b"));
        Assert.NotNull(RPr(" itálico").Element(W + "i"));
        Assert.Equal("single", (string?)RPr(" itálico").Element(W + "u")!.Attribute(W + "val"));
        Assert.NotNull(RPr(" riscado").Element(W + "strike"));
        Assert.Equal("FF0000", (string?)RPr(" riscado").Element(W + "color")!.Attribute(W + "val"));
        Assert.Equal("FFFF00", (string?)RPr(" riscado").Element(W + "shd")!.Attribute(W + "fill"));
        Assert.Equal(["strike", "color", "shd"], RPr(" riscado").Elements().Select(e => e.Name.LocalName).ToList());
        Assert.Equal("superscript", (string?)RPr(" x2").Element(W + "vertAlign")!.Attribute(W + "val"));
        Assert.Equal(["vertAlign"], RPr(" i").Elements().Select(e => e.Name.LocalName).ToList());
        Assert.Equal("subscript", (string?)RPr(" i").Element(W + "vertAlign")!.Attribute(W + "val"));
        Assert.Equal(5, p.Descendants(W + "r").Count());
    }

    [Fact]
    public void Texto_Colorido_Tabulacao_E_Quebra()
    {
        var saved = Write((w, _) =>
        {
            w.AddText("Olá ", DocxRunFormat.None);
            w.AddText("@E-mail", new DocxRunFormat { Color = "#22ae86" });
            w.AddText("\tcoluna", DocxRunFormat.None);
            w.AddBreak();
            w.AddText("linha 2", DocxRunFormat.None);
            w.EndParagraph(DocxParagraphFormat.None);
        });
        var p = Para(saved, "Olá");

        Assert.Equal("22AE86", RunColor(p, "@E-mail"));
        Assert.Single(p.Descendants(W + "tab"));
        Assert.Single(p.Descendants(W + "br"));
        Assert.Equal("Olá @E-mailcolunalinha 2", Text(p));
    }

    [Fact]
    public void Link_Vira_Hiperlink_Nativo_Na_Cor_Configurada()
    {
        var saved = Write((w, _) =>
        {
            w.AddText("site", new DocxRunFormat { Link = "https://example.com/x", Color = "#000000" });
            w.AddText(" e ", DocxRunFormat.None);
            w.AddText("www", new DocxRunFormat { Link = "www.example.org" });
            w.AddText(" e ", DocxRunFormat.None);
            w.AddText("hash", new DocxRunFormat { Link = "#document-12" });
            w.AddText(" e ", DocxRunFormat.None);
            w.AddText("js", new DocxRunFormat { Link = "javascript:alert(1)" });
            w.AddText(" e ", DocxRunFormat.None);
            w.AddText("sub", new DocxRunFormat { Link = "https://example.com/y", Underline = true });
            w.EndParagraph(DocxParagraphFormat.None);
        });
        var p = Para(saved, "site");
        var links = p.Elements(W + "hyperlink").ToList();

        Assert.Equal(3, links.Count);
        Assert.Equal("https://example.com/x", RelTarget(saved, (string)links[0].Attribute(R + "id")!));
        Assert.Equal("http://www.example.org", RelTarget(saved, (string)links[1].Attribute(R + "id")!));
        Assert.Equal(LinkColor, (string?)links[0].Descendants(W + "color").Single().Attribute(W + "val"));
        Assert.Equal("none", (string?)links[0].Descendants(W + "u").Single().Attribute(W + "val"));
        Assert.Equal("single", (string?)links[2].Descendants(W + "u").Single().Attribute(W + "val"));
        Assert.Equal("site e www e hash e js e sub", Text(p));
        Assert.Empty(Xml(saved).Descendants(W + "instrText"));
        Assert.DoesNotContain("javascript", ReadPart(saved, "word/_rels/document.xml.rels"));
    }

    [Fact]
    public void Link_Sem_Cor_Configurada_Usa_O_Estilo_Hyperlink()
    {
        var saved = Write((w, _) =>
        {
            w.AddText("site", new DocxRunFormat { Link = "https://example.com/" });
            w.EndParagraph(DocxParagraphFormat.None);
        }, new DocxBodyWriterOptions());

        string styleId = (string)Xml(saved).Descendants(W + "hyperlink").Single().Descendants(W + "rStyle").Single().Attribute(W + "val")!;
        Assert.Contains(Xml(saved, "word/styles.xml").Descendants(W + "style"), s => (string?)s.Attribute(W + "styleId") == styleId && (string?)s.Element(W + "name")!.Attribute(W + "val") == "Hyperlink");
    }

    [Fact]
    public void Esquemas_De_Link_Configuraveis()
    {
        var saved = Write((w, _) =>
        {
            w.AddText("ftp", new DocxRunFormat { Link = "ftp://example.com/a" });
            w.AddText(" web", new DocxRunFormat { Link = "https://example.com/" });
            w.EndParagraph(DocxParagraphFormat.None);
        }, new DocxBodyWriterOptions { AllowedLinkSchemes = ["ftp"] });

        var link = Xml(saved).Descendants(W + "hyperlink").Single();
        Assert.Equal("ftp://example.com/a", RelTarget(saved, (string)link.Attribute(R + "id")!));
    }

    // ─────────────────────────────── imagens ───────────────────────────────

    [Fact]
    public void Imagem_Entra_E_E_Reduzida_Para_A_Pagina()
    {
        bool added = false, rejected = true;
        var saved = Write((w, _) =>
        {
            w.AddText("Imagem: ", DocxRunFormat.None);
            added = w.AddImage(PngOfSize(4000, 400));
            rejected = w.AddImage("<svg/>"u8.ToArray(), "https://example.com/");
            w.EndParagraph(DocxParagraphFormat.None);
        });
        var extent = Xml(saved).Descendants(XName.Get("extent", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing")).Last();
        var area = DocxPageArea.From(Xml(saved).Descendants(W + "sectPr").Last());
        long cx = (long)extent.Attribute("cx")!, cy = (long)extent.Attribute("cy")!;

        Assert.True(added);
        Assert.False(rejected);
        Assert.True(cx <= area.ClientWidth * 635L);
        Assert.Equal(10.0, (double)cx / cy, 1);
        Assert.Single(PartNames(saved), n => n.StartsWith("word/media/", StringComparison.Ordinal));
        Assert.Empty(Xml(saved).Descendants(W + "hyperlink"));
    }

    [Fact]
    public void Imagem_Com_Link_E_Ids_Unicos()
    {
        var saved = Write((w, _) =>
        {
            w.AddImage(OnePixelPng, "https://example.com/");
            w.AddImage(OnePixelPng);
            w.EndParagraph(DocxParagraphFormat.None);
        });
        XNamespace wp = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
        var docPrIds = Xml(saved).Descendants(wp + "docPr").Select(d => (string)d.Attribute("id")!).ToList();

        Assert.Single(Xml(saved).Descendants(W + "hyperlink").Descendants(W + "drawing"));
        Assert.Equal(2, Xml(saved).Descendants(wp + "inline").Count());
        Assert.Equal(3, docPrIds.Count); // + a caixa de texto do #{Logo}
        Assert.Equal(docPrIds.Count, docPrIds.Distinct().Count());
    }

    [Fact]
    public void Imagem_Sozinha_No_Ultimo_Paragrafo_Nao_E_Aparada()
    {
        var saved = Write((w, _) =>
        {
            w.AddImage(OnePixelPng);
            w.EndParagraph(DocxParagraphFormat.None);
        });

        Assert.Single(BodyParagraphs(saved)[^1].Descendants(W + "drawing"));
    }

    [Fact]
    public void Resultado_Passa_Pela_Leitura_Do_Motor_De_Layout()
    {
        var saved = Write((w, s) =>
        {
            Line(w, "Objetivo", Heading(s, "Heading1"));
            Line(w, "Item", ListItem(s["BulletList"], s["BulletList"].NumId));
            Line(w, "Fim", DocxParagraphFormat.None);
        });

        var model = Docx.DocumentReader.ReadDocument(Docx.DocxPackage.Load(saved));
        Assert.Contains(model.Paragraphs, p => Docx.ModelOps.ParaText(p) == "Objetivo");
        Assert.Contains(model.Paragraphs, p => Docx.ModelOps.ParaText(p) == "Item");
    }
}
