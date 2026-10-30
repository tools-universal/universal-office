using UniversalOffice.Core;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Resolução de alvo de relacionamento (regra única do OPC, compartilhada com validadores).</summary>
public class OpcPartNameTests
{
    [Theory]
    [InlineData("word/document.xml", "styles.xml", "word/styles.xml")]
    [InlineData("word/document.xml", "media/image1.png", "word/media/image1.png")]
    [InlineData("word/document.xml", "/word/styles.xml", "word/styles.xml")]
    [InlineData("/word/document.xml", "styles.xml", "word/styles.xml")]
    [InlineData("", "word/document.xml", "word/document.xml")]
    [InlineData("", "/word/document.xml", "word/document.xml")]
    [InlineData("word/document.xml", "../customXml/item1.xml", "customXml/item1.xml")]
    [InlineData("word/glossary/document.xml", "../media/a.png", "word/media/a.png")]
    [InlineData("word/document.xml", "./theme//theme1.xml", "word/theme/theme1.xml")]
    [InlineData("word/document.xml", "styles.xml#parte", "word/styles.xml")]
    [InlineData("word/document.xml", "media/image%201.png", "word/media/image 1.png")]
    [InlineData("word/document.xml", "m%C3%ADdia/a%C3%A7%C3%A3o.png", "word/mídia/ação.png")]
    [InlineData("word/document.xml", "a+b(1).png", "word/a+b(1).png")]
    public void Resolve_Alvo_Relativo_Absoluto_E_Escapado(string source, string target, string expected) =>
        Assert.Equal(expected, OpcPartName.ResolveRelationshipTarget(source, target));

    [Theory]
    [InlineData("fn%2531.xml", "word/fn%31.xml")]
    [InlineData("fn%252531.xml", "word/fn%2531.xml")]
    [InlineData("%25", "word/%")]
    public void Desescapa_Uma_Vez_So(string target, string expected) =>
        Assert.Equal(expected, OpcPartName.ResolveRelationshipTarget("word/document.xml", target));

    [Theory]
    [InlineData("")]
    [InlineData("#so-fragmento")]
    [InlineData("/")]
    [InlineData("../../fora.xml")]
    [InlineData("/../fora.xml")]
    [InlineData("http://example.com/a.xml")]
    [InlineData("file:///c:/a.xml")]
    [InlineData("c:a.xml")]
    [InlineData("a.xml?x=1")]
    [InlineData("media\\a.png")]
    [InlineData("a%2Fb.xml")]
    [InlineData("a%5Cb.xml")]
    [InlineData("%2e%2e/a.xml")]
    [InlineData("%2E/a.xml")]
    [InlineData("a%zz.xml")]
    [InlineData("a%2.xml")]
    [InlineData("a%.xml")]
    [InlineData("a%00.xml")]
    public void Alvo_Que_Nao_Nomeia_Parte_Devolve_Null(string target) =>
        Assert.Null(OpcPartName.ResolveRelationshipTarget("word/document.xml", target));

    [Fact]
    public void Origem_Com_Segmento_Ponto_Devolve_Null() =>
        Assert.Null(OpcPartName.ResolveRelationshipTarget("word/../document.xml", "a.xml"));

    [Theory]
    [InlineData("image1.png")]
    [InlineData("fn%31.xml")]
    [InlineData("image 1.png")]
    [InlineData("ação #1?.xml")]
    [InlineData("100%.png")]
    public void Escapar_E_Resolver_Devolve_O_Nome_Original(string name)
    {
        var target = "media/" + OpcPartName.EscapeSegment(name);

        Assert.Equal("word/media/" + name, OpcPartName.ResolveRelationshipTarget("word/document.xml", target));
    }
}
