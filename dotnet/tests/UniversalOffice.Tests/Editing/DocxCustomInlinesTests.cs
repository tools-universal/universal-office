using System.Xml.Linq;
using UniversalOffice.Docx;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Inlines de plugin (w:sdt wordnext:inline:*): procurar, trocar por texto ou
/// hiperlink, desembrulhar e trocar marcadores de texto pelo inline.
/// </summary>
public class DocxCustomInlinesTests
{
    private const string TagJson = """{"v":1,"name":"userEmail"}""";

    private static DocxDocument Doc(params string[] paragraphContent) =>
        DocxDocument.Open(new DocxBuilder().WithBody(paragraphContent.Select(c => Paragraph(c)).ToArray()).Build());

    [Fact]
    public void Encontra_Por_Tipo_Com_Json_Titulo_E_Texto()
    {
        var doc = Doc(Run("antes") + TagInline("userEmail", "@E-mail") + ItemLinkInline("document", 3, "Manual", 2) + CustomInline("mention", """{"id":1}""", "@Ana"));

        var all = DocxCustomInlines.Find(doc);
        var tags = DocxCustomInlines.Find(doc, "sample.tag");

        Assert.Equal(["sample.tag", "sample.item-link", "mention"], all.Select(i => i.Type).ToList());
        var tag = Assert.Single(tags);
        Assert.Equal(TagJson, tag.Json);
        Assert.Equal("@E-mail", tag.Title);
        Assert.Equal("@E-mail", tag.Text);
        Assert.Equal("word/document.xml", tag.PartPath);
    }

    [Fact]
    public void Tag_Com_Json_Invalido_Nao_E_Inline()
    {
        var doc = Doc("<w:sdt><w:sdtPr><w:tag w:val=\"wordnext:inline:x:nao-json\"/></w:sdtPr><w:sdtContent>" + Run("x") + "</w:sdtContent></w:sdt>");

        Assert.Empty(DocxCustomInlines.Find(doc));
    }

    [Fact]
    public void Troca_Por_Texto_Mantendo_A_Formatacao_Do_Run()
    {
        var doc = Doc(Run("Olá ") + TagInline("userDisplayName", "@Nome", "<w:b/><w:color w:val=\"FF0000\"/>"));

        DocxCustomInlines.Find(doc).Single().ReplaceWithText("Valor congelado");
        var saved = doc.Save();
        var run = Xml(saved).Descendants(W + "r").Single(r => r.Element(W + "t")?.Value == "Valor congelado");

        Assert.Empty(Xml(saved).Descendants(W + "sdt"));
        Assert.Equal("Olá Valor congelado", BodyText(saved));
        Assert.NotNull(run.Element(W + "rPr")!.Element(W + "b"));
        Assert.Equal("FF0000", (string?)run.Element(W + "rPr")!.Element(W + "color")!.Attribute(W + "val"));
    }

    [Fact]
    public void Texto_Vazio_Remove_O_Controle_E_Troca_Em_Celula()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Table(Paragraph(TagInline("userEmail", "@E-mail") + TagInline("userManager", "@Gestor"))), Paragraph("")).Build());
        var inlines = DocxCustomInlines.Find(doc);

        inlines[0].ReplaceWithText("joao@acme.com");
        inlines[1].ReplaceWithText("");
        var saved = doc.Save();

        Assert.Equal("joao@acme.com", Text(Xml(saved).Descendants(W + "tc").Single().Element(W + "p")!));
        Assert.Throws<InvalidOperationException>(() => inlines[0].ReplaceWithText("de novo"));
    }

    [Fact]
    public void Desembrulha_Mantendo_O_Texto_De_Reserva()
    {
        var doc = Doc(CustomInline("sample.tag", """{"v":1,"name":"userPassword"}""", "@Senha"));

        DocxCustomInlines.Find(doc).Single().Unwrap();
        var saved = doc.Save();

        Assert.Empty(Xml(saved).Descendants(W + "sdt"));
        Assert.Equal("@Senha", BodyText(saved));
    }

    [Fact]
    public void Troca_Por_Hiperlink_Nativo_Sem_Campo()
    {
        var doc = Doc(Run("Ver ") + ItemLinkInline("document", 3, "Manual") + Run(" agora"));

        Assert.True(DocxCustomInlines.Find(doc).Single().ReplaceWithHyperlink("https://example.com/portal/documents/3", "Manual"));
        var saved = doc.Save();
        var hyperlink = Assert.Single(Xml(saved).Descendants(W + "hyperlink"));

        Assert.Empty(Xml(saved).Descendants(W + "sdt"));
        Assert.Empty(Xml(saved).Descendants(W + "fldChar"));
        Assert.Equal("https://example.com/portal/documents/3", RelTarget(saved, (string)hyperlink.Attribute(R + "id")!));
        Assert.Equal("Ver Manual agora", BodyText(saved));
        string styleId = (string)hyperlink.Descendants(W + "rStyle").Single().Attribute(W + "val")!;
        var style = Xml(saved, "word/styles.xml").Descendants(W + "style").Single(s => (string?)s.Attribute(W + "styleId") == styleId);
        Assert.Equal("Hyperlink", (string?)style.Element(W + "name")!.Attribute(W + "val"));
        Assert.Equal("character", (string?)style.Attribute(W + "type"));
    }

    [Fact]
    public void Hiperlink_Com_Url_Proibida_Vira_Texto()
    {
        var doc = Doc(ItemLinkInline("document", 3, "Manual"));

        Assert.False(DocxCustomInlines.Find(doc).Single().ReplaceWithHyperlink("javascript:alert(1)", "Manual"));
        var saved = doc.Save();

        Assert.Empty(Xml(saved).Descendants(W + "hyperlink"));
        Assert.Equal("Manual", BodyText(saved));
        Assert.DoesNotContain("javascript", AllXml(saved));
    }

    [Fact]
    public void Marcador_Vira_Controle_Com_Reserva_Formatacao_E_Contrato_Do_Editor()
    {
        string marker = Marker(0);
        var doc = Doc(Run("Olá ") + Run(marker, "<w:b/>") + Run("!"));

        int count = DocxCustomInlines.ReplaceText(doc, marker, "sample.tag", TagJson, "@E-mail");
        var saved = doc.Save();
        var sdt = Assert.Single(Xml(saved).Descendants(W + "sdt"));
        var properties = sdt.Element(W + "sdtPr")!;

        Assert.Equal(1, count);
        Assert.Equal($"wordnext:inline:sample.tag:{Uri.EscapeDataString(TagJson)}", (string?)properties.Element(W + "tag")!.Attribute(W + "val"));
        Assert.Equal("@E-mail", (string?)properties.Element(W + "alias")!.Attribute(W + "val"));
        Assert.Equal("sdtLocked", (string?)properties.Element(W + "lock")!.Attribute(W + "val"));
        Assert.Equal(["alias", "tag", "lock"], properties.Elements().Select(e => e.Name.LocalName).ToList());
        Assert.NotNull(sdt.Descendants(W + "b").FirstOrDefault());
        Assert.Equal("Olá @E-mail!", BodyText(saved));
        Assert.True(CustomInlineTag.TryParse((string)properties.Element(W + "tag")!.Attribute(W + "val")!, out _, out var json));
        Assert.Equal(TagJson, json);
    }

    [Fact]
    public void Marcador_Quebrado_Em_Runs_Vira_Um_Controle()
    {
        string marker = Marker(12);
        var doc = Doc(Run(marker[..2]) + Run(marker[2..], "<w:i/>"));

        DocxCustomInlines.ReplaceText(doc, marker, "sample.tag", TagJson, "@E-mail");
        var reopened = DocxDocument.Open(doc.Save());

        var inline = Assert.Single(DocxCustomInlines.Find(reopened));
        Assert.Equal(TagJson, inline.Json);
        Assert.Equal("@E-mail", DocxText.GetPlainText(reopened));
    }

    [Fact]
    public async Task Reserva_Que_Contem_O_Marcador_Troca_Uma_Vez_E_Termina()
    {
        string marker = Marker(0);
        var doc = Doc(Run(marker));

        await Task.Run(() => DocxCustomInlines.ReplaceText(doc, marker, "sample.tag", TagJson, marker)).WaitAsync(TimeSpan.FromSeconds(30));

        Assert.Single(DocxCustomInlines.Find(doc));
    }

    [Fact]
    public void Marcador_Repetido_No_Mesmo_Run_E_Em_Paragrafos()
    {
        string marker = Marker(3);
        var doc = Doc(Run($"a{marker}b{marker}c"), Run(marker));

        int count = DocxCustomInlines.ReplaceText(doc, marker, "sample.tag", TagJson, "@E-mail");
        var saved = DocxDocument.Open(doc.Save());

        Assert.Equal(3, count);
        Assert.Equal(3, DocxCustomInlines.Find(saved).Count);
        Assert.Equal("a@E-mailb@E-mailc\r\n@E-mail", DocxText.GetPlainText(saved));
    }

    [Fact]
    public void Controle_Do_Editor_Sobrevive_Abrir_E_Salvar_Com_Edicao()
    {
        const string title = "Política de Privacidade (versão 2) — anexo \"A\" & regras";
        string json = $$"""{"v":1,"type":"document","id":42,"page":3,"title":"{{title.Replace("\"", "\\\"")}}"}""";
        var doc = Doc(Run("#{X} ") + CustomInline("sample.item-link", json, title, "<w:b/>"));

        DocxText.ReplaceParameter(doc, "X", "Ver");
        var saved = doc.Save();
        var sdt = Assert.Single(Xml(saved).Descendants(W + "sdt"));

        Assert.Equal("wordnext:inline:sample.item-link:" + Uri.EscapeDataString(json), (string?)sdt.Element(W + "sdtPr")!.Element(W + "tag")!.Attribute(W + "val"));
        Assert.Equal(title, (string?)sdt.Element(W + "sdtPr")!.Element(W + "alias")!.Attribute(W + "val"));
        Assert.Equal(title, Text(sdt));
    }

    /// <summary>Marcador de exemplo do hospedeiro: U+E000 + índice + U+E001.</summary>
    private static string Marker(int index) => (char)0xE000 + index.ToString(System.Globalization.CultureInfo.InvariantCulture) + (char)0xE001;
}
