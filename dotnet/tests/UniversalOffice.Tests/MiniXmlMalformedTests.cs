using UniversalOffice.Core;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>XML malformado (conteúdo não confiável) lança em vez de entrar em laço ou estourar a pilha.</summary>
public class MiniXmlMalformedTests
{
    [Theory(Timeout = 5000)]
    [InlineData("<a><b/><!-- sem fim")]
    [InlineData("<a><b>x</b")]
    [InlineData("<a><![CDATA[ sem fim")]
    public async Task Token_Sem_Fechamento_Lanca(string xml)
    {
        var ex = await Task.Run(() => Record.Exception(() => MiniXml.Parse(xml)));
        Assert.IsType<FormatException>(ex);
        Assert.Contains("não fechado", ex.Message);
    }

    [Fact]
    public void Aninhamento_Alem_Do_Limite_E_Recusado()
    {
        int n = MiniXml.MaxDepth + 1;
        var ex = Assert.Throws<FormatException>(() => MiniXml.Parse(string.Concat(Enumerable.Repeat("<a>", n)) + string.Concat(Enumerable.Repeat("</a>", n))));
        Assert.Contains("aninhamento excessivo", ex.Message);
    }

    [Fact]
    public void Xml_No_Limite_Continua_Lido()
    {
        int n = MiniXml.MaxDepth;
        Assert.Equal("a", MiniXml.Parse(string.Concat(Enumerable.Repeat("<a>", n)) + "x" + string.Concat(Enumerable.Repeat("</a>", n))).Name);
        Assert.Equal(2, MiniXml.Parse("<r><!-- c --><s>t</s><![CDATA[d]]></r>").Children.Count);
    }
}
