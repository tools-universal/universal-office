using UniversalOffice.DocxLayout;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// Substitutas métrico-compatíveis do servidor: a MESMA tabela dos web
/// components (shared/fonts/src/catalog.ts, lida como recurso) — o PDF do .NET
/// cai nas mesmas fontes que o editor usa na tela.
/// </summary>
public class FontSubstitutionTests
{
    private sealed class FakeProvider(params string[] families) : IFontProvider
    {
        public List<string> Asked { get; } = [];

        public FontFace? Face(string family, bool bold, bool italic)
        {
            Asked.Add(family);
            return families.Contains(family, StringComparer.OrdinalIgnoreCase)
                ? new FontFace { Key = $"{family}|{bold}|{italic}", Family = family, Bold = bold, Italic = italic }
                : null;
        }
    }

    [Fact]
    public void Catalogo_Le_As_Substitutas_E_A_Padrao_Do_Catalogo_Do_Js()
    {
        Assert.Equal("Carlito", FontCatalog.MetricSubstitute("Calibri"));
        Assert.Equal("Caladea", FontCatalog.MetricSubstitute("cambria"));
        Assert.Equal("Liberation Sans", FontCatalog.MetricSubstitute("Arial MT"));
        Assert.Equal("Liberation Serif", FontCatalog.MetricSubstitute("Times New Roman"));
        Assert.Equal("Liberation Mono", FontCatalog.MetricSubstitute("Courier New"));
        Assert.Null(FontCatalog.MetricSubstitute("Aptos"));
        Assert.Equal("Liberation Sans", FontCatalog.DefaultFamily);
    }

    [Fact]
    public void Familia_Instalada_Nao_E_Substituida()
    {
        var inner = new FakeProvider("Calibri", "Carlito");
        var face = new SubstituteFontProvider(inner).Face("Calibri", false, false);
        Assert.Equal("Calibri", face?.Family);
        Assert.Equal(["Calibri"], inner.Asked);
    }

    [Fact]
    public void Familia_Ausente_Cai_Na_Substituta_Metrica()
    {
        var provider = new SubstituteFontProvider(new FakeProvider("Carlito", "Liberation Sans"));
        Assert.Equal("Carlito", provider.Face("Calibri", true, false)?.Family);
        Assert.Equal("Liberation Sans", provider.Face("Helvetica", false, true)?.Family);
    }

    [Fact]
    public void Substituta_Vem_Marcada_Como_StandIn_E_A_Instalada_Nao()
    {
        var provider = new SubstituteFontProvider(new FakeProvider("Carlito"));
        Assert.True(provider.Face("Calibri", false, false)!.StandIn);
        Assert.False(provider.Face("Carlito", false, false)!.StandIn);
    }

    [Fact]
    public void Fonte_Mapeada_Pelo_Word_Vence_A_Substituta()
    {
        // "Arial MT" (nome PostScript da Arial) → o Word usa a Arial instalada antes da substituta
        var resolver = new FaceResolver(new SubstituteFontProvider(new FakeProvider("Arial", "Liberation Sans")));
        Assert.Equal("Arial", resolver.Get("ArialMT", false, false).Family);
    }

    [Fact]
    public void Familia_Sem_Substituta_Fica_Para_O_FaceResolver()
    {
        var provider = new SubstituteFontProvider(new FakeProvider("Liberation Sans"));
        Assert.Null(provider.Face("Aptos", false, false));
    }

    [Fact]
    public void FaceResolver_Nunca_Fica_Sem_Fonte_Se_A_Padrao_Existe()
    {
        var resolver = new FaceResolver(new SubstituteFontProvider(new FakeProvider("Liberation Sans")));
        Assert.Equal("Liberation Sans", resolver.Get("Familia Que Nao Existe", false, false).Family);
    }
}
