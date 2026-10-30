using UniversalOffice.Docx;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Contrato do w:tag dos inlines de plugin (o mesmo que o editor JS grava).</summary>
public class CustomInlineTagTests
{
    [Fact]
    public void Le_O_Tag_Gravado_Pelo_Editor()
    {
        // encodeURIComponent(JSON.stringify({ id: '42', label: 'Ada Lovelace' })) do serialize.ts
        Assert.True(CustomInlineTag.TryParse("wordnext:inline:mention:%7B%22id%22%3A%2242%22%2C%22label%22%3A%22Ada%20Lovelace%22%7D", out var type, out var json));
        Assert.Equal("mention", type);
        Assert.Equal("{\"id\":\"42\",\"label\":\"Ada Lovelace\"}", json);
    }

    [Fact]
    public void Format_E_TryParse_Fazem_Ida_E_Volta()
    {
        string tag = CustomInlineTag.Format("sample.tag", "{\"v\":1,\"name\":\"userDisplayName\"}");
        Assert.StartsWith(CustomInlineTag.Prefix + "sample.tag:", tag);
        Assert.True(CustomInlineTag.TryParse(tag, out var type, out var json));
        Assert.Equal(("sample.tag", "{\"v\":1,\"name\":\"userDisplayName\"}"), (type, json));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("outro:tag")]
    [InlineData("wordnext:inline:tipo inválido:%7B%7D")]
    [InlineData("wordnext:inline:ok:nao-e-json")]
    [InlineData("wordnext:inline::%7B%7D")]
    public void Tag_Que_Nao_E_De_Inline_Nao_E_Lido(string? tag) => Assert.False(CustomInlineTag.TryParse(tag, out _, out _));

    [Fact]
    public void Format_Recusa_Tipo_Ou_Json_Invalidos()
    {
        Assert.Throws<ArgumentException>(() => CustomInlineTag.Format("com espaço", "{}"));
        Assert.ThrowsAny<System.Text.Json.JsonException>(() => CustomInlineTag.Format("ok", "{"));
    }
}
