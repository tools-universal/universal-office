using System.Text;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>Campos (HYPERLINK → w:hyperlink nativo) e abrir/salvar sem perdas.</summary>
public class DocxFieldsAndRoundTripTests
{
    private static byte[] ConvertHyperlinks(byte[] docx)
    {
        var doc = DocxDocument.Open(docx);
        DocxFields.ConvertHyperlinkFields(doc);
        return doc.Save();
    }

    [Fact]
    public void Campo_Hyperlink_Vira_Hiperlink_Nativo_Com_Relacionamento()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Run("Ver ") + Field(" HYPERLINK \"https://example.com/a?b=1&c=2\" ", "site") + Run(" fim"))).Build();

        var normalized = ConvertHyperlinks(docx);
        var hyperlink = Assert.Single(Xml(normalized).Descendants(W + "hyperlink"));
        var rels = Xml(normalized, "word/_rels/document.xml.rels").Root!.Elements().Single(e => (string?)e.Attribute("Id") == (string)hyperlink.Attribute(R + "id")!);

        Assert.Equal("https://example.com/a?b=1&c=2", (string?)rels.Attribute("Target"));
        Assert.Equal("External", (string?)rels.Attribute("TargetMode"));
        Assert.Equal("site", Text(hyperlink));
        Assert.Empty(Xml(normalized).Descendants(W + "fldChar"));
        Assert.Equal("Ver site fim", BodyText(normalized));
    }

    [Fact]
    public void Campo_Hyperlink_De_Ancora_Vira_W_Anchor()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Field(" HYPERLINK \\l \"secao_2\" ", "seção 2"))).Build();

        var hyperlink = Assert.Single(Xml(ConvertHyperlinks(docx)).Descendants(W + "hyperlink"));

        Assert.Equal("secao_2", (string?)hyperlink.Attribute(W + "anchor"));
    }

    [Fact]
    public void Campo_Hyperlink_Com_Esquema_Proibido_Continua_Campo()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Field(" HYPERLINK \"file:///C:/x.txt\" ", "arquivo"))).Build();

        var normalized = ConvertHyperlinks(docx);

        Assert.Empty(Xml(normalized).Descendants(W + "hyperlink"));
        Assert.NotEmpty(Xml(normalized).Descendants(W + "fldChar"));
    }

    [Fact]
    public void Instrucao_Hyperlink_Com_Chaves_E_Sem_Aspas()
    {
        Assert.True(DocxFields.TryParseHyperlink(" HYPERLINK \"https://a.com/\" \\o \"dica\" \\t \"_blank\" ", DocxFields.DefaultAllowedSchemes, out var url, out var anchor));
        Assert.Equal("https://a.com/", url);
        Assert.Null(anchor);
        Assert.True(DocxFields.TryParseHyperlink("HYPERLINK https://b.com/x", DocxFields.DefaultAllowedSchemes, out url, out _));
        Assert.Equal("https://b.com/x", url);
        Assert.True(DocxFields.TryParseHyperlink("HYPERLINK \"https://c.com/\" \\l \"parte\"", DocxFields.DefaultAllowedSchemes, out url, out _));
        Assert.Equal("https://c.com/#parte", url);
        Assert.False(DocxFields.TryParseHyperlink("HYPERLINK \"vbscript:x\"", DocxFields.DefaultAllowedSchemes, out _, out _));
        Assert.False(DocxFields.TryParseHyperlink("PAGE", DocxFields.DefaultAllowedSchemes, out _, out _));
    }

    [Fact]
    public void Abrir_E_Salvar_Sem_Mudanca_Preserva_Todas_As_Partes()
    {
        var docx = new DocxBuilder()
            .WithStyles($"""<w:styles xmlns:w="{WordNs}"><!-- comentário --><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>""")
            .WithBody(Paragraph(Run("Olá") + TagInline("userEmail", "@E-mail")))
            .Build();

        var saved = DocxDocument.Open(docx).Save();

        Assert.Equal(PartNames(docx), PartNames(saved));
        foreach (var name in PartNames(docx))
            Assert.Equal(ReadBytes(docx, name), ReadBytes(saved, name));
    }

    [Fact]
    public void Editar_Uma_Parte_Mantem_As_Outras_Byte_A_Byte_E_O_Xml_Desconhecido()
    {
        var docx = new DocxBuilder()
            .WithStyles($"""<w:styles xmlns:w="{WordNs}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>""")
            .WithBody(Paragraph(Run("#{Title}") + "<w14:customTag xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" w14:x=\"1\"/>", "<w:jc w:val=\"center\"/>"))
            .Build();
        var doc = DocxDocument.Open(docx);

        DocxText.ReplaceParameter(doc, "Title", "Código de Conduta");
        var saved = doc.Save();

        Assert.Equal(ReadBytes(docx, "word/styles.xml"), ReadBytes(saved, "word/styles.xml"));
        Assert.Equal(PartNames(docx), PartNames(saved));
        Assert.Equal("Código de Conduta", BodyText(saved));
        Assert.Contains("w14:customTag", ReadPart(saved, "word/document.xml"));
        Assert.Contains("mc:Ignorable=\"w14\"", ReadPart(saved, "word/document.xml"));
    }

    [Fact]
    public void Recusa_Dtd_E_Pacote_Que_Nao_E_Docx()
    {
        Assert.ThrowsAny<Exception>(() => DocxDocument.Open("não é um docx"u8.ToArray()));
        var withDtd = new DocxBuilder().WithStyles("<!DOCTYPE x [<!ENTITY a \"aaaa\">]><w:styles xmlns:w=\"" + WordNs + "\">&a;</w:styles>").Build();
        var doc = DocxDocument.Open(withDtd);
        Assert.ThrowsAny<System.Xml.XmlException>(() => DocxStyles.ParagraphStyleName(doc, new System.Xml.Linq.XElement(W + "p")));
    }

    [Fact]
    public void Texto_Com_Caracteres_Invalidos_Em_Xml_E_Limpo()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("#{X}"))).Build());

        DocxText.ReplaceParameter(doc, "X", "a" + (char)1 + "b" + (char)0xFFFE + "c");

        Assert.Equal("abc", BodyText(doc.Save()));
    }

    [Fact]
    public void Coleta_Remove_Partes_Orfas_So_Quando_Ha_Alteracao()
    {
        var docx = new DocxBuilder()
            .WithBody(Paragraph(Picture("rIdImg", 100, 100) + Run("#{X}")))
            .WithImage("rIdImg", "image1.png", OnePixelPng)
            .Build();
        var doc = DocxDocument.Open(docx);

        DocxText.ReplaceParameter(doc, "X", "y");
        var saved = doc.Save();

        Assert.True(HasPart(saved, "word/media/image1.png"));
        Assert.Equal(Encoding.UTF8.GetString(ReadBytes(docx, "[Content_Types].xml")), Encoding.UTF8.GetString(ReadBytes(saved, "[Content_Types].xml")));
    }
}
