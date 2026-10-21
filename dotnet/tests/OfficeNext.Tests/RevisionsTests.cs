using OfficeNext.Docx;
using OfficeNext.DocxLayout;
using OfficeNext.Export;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// Controle de alterações no port .NET (espelho da parte de leitura de
/// docx-core/test/revisions.test.ts): o texto excluído fica no modelo marcado,
/// as exportações usam a visão final e o salvar grava as revisões de volta.
/// </summary>
public class RevisionsTests
{
    private const string Body =
        "<w:p><w:r><w:t xml:space=\"preserve\">Início </w:t></w:r>" +
        "<w:del w:id=\"1\" w:author=\"Ana\" w:date=\"2026-01-01T10:00:00Z\"><w:r><w:delText xml:space=\"preserve\">velho </w:delText></w:r></w:del>" +
        "<w:ins w:id=\"2\" w:author=\"Bia\" w:date=\"2026-01-01T10:05:00Z\"><w:r><w:t>novo</w:t></w:r></w:ins></w:p>" +
        "<w:p><w:pPr><w:rPr><w:del w:id=\"3\" w:author=\"Ana\"/></w:rPr></w:pPr><w:r><w:t xml:space=\"preserve\">junta </w:t></w:r></w:p>" +
        "<w:p><w:r><w:rPr><w:b/><w:rPrChange w:id=\"4\" w:author=\"Bia\"><w:rPr/></w:rPrChange></w:rPr><w:t>fim</w:t></w:r></w:p>";

    private static DocxPackage Package()
    {
        var pkg = DocxPackage.Empty();
        pkg.SetPartText("word/document.xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>" + Body + "</w:body></w:document>");
        return DocxPackage.Load(pkg.Save());
    }

    [Fact]
    public void Leitura_Guarda_O_Texto_Excluido_Marcado()
    {
        var model = DocumentReader.ReadDocument(Package());
        var runs = model.Paragraphs[0].Runs;
        Assert.Equal("Início velho novo", ModelOps.ParaText(model.Paragraphs[0]));
        var del = runs.Single(r => r.Text == "velho ");
        Assert.Equal("Ana", del.Props.Del?.Author);
        Assert.Equal("2026-01-01T10:00:00Z", del.Props.Del?.Date);
        Assert.Equal("Bia", runs.Single(r => r.Text == "novo").Props.Ins?.Author);
        Assert.Equal("Ana", model.Paragraphs[1].Props.MarkDel?.Author);
        var fim = model.Paragraphs[2].Runs[0];
        Assert.Equal("Bia", fim.Props.Fmt?.Author);
        Assert.False(fim.Props.Fmt?.Old.Bold);
    }

    [Fact]
    public void Visao_Final_E_Autores()
    {
        var full = FullDocReader.ReadFullDocument(Package());
        var paras = full.Blocks.OfType<ParagraphBlock>().Select(b => b.Paragraph).ToList();
        var (fin, index) = Revisions.FinalParagraphs(paras);
        Assert.Equal(new[] { "Início novo", "junta fim" }, fin.Select(ModelOps.ParaText));
        Assert.Equal(new[] { 0, 1, 1 }, index);
        Assert.Equal(new[] { "Ana", "Bia" }, Revisions.RevisionAuthors(full));
    }

    [Fact]
    public void Exportacoes_Usam_A_Visao_Final()
    {
        byte[] bytes = Package().Save();
        string md = FromDocx.DocxToMarkdown(bytes);
        Assert.Contains("Início novo", md);
        Assert.Contains("junta", md);
        Assert.DoesNotContain("velho", md);
        string html = FromDocx.DocxToHtml(bytes);
        Assert.DoesNotContain("velho", html);
    }

    [Fact]
    public void Salvar_Grava_As_Revisoes()
    {
        var pkg = Package();
        var model = DocumentReader.ReadDocument(pkg);
        DocxSerialize.WriteDocument(pkg, model);
        string xml = pkg.DocumentXml();
        Assert.Contains("<w:delText xml:space=\"preserve\">velho </w:delText>", xml);
        // ids novos acima dos que o pacote já usava (1–4)
        Assert.DoesNotContain("w:id=\"1\"", xml);
        var again = DocumentReader.ReadDocument(DocxPackage.Load(pkg.Save()));
        Assert.Equal("Ana", again.Paragraphs[0].Runs.Single(r => r.Text == "velho ").Props.Del?.Author);
        Assert.Equal("Bia", again.Paragraphs[0].Runs.Single(r => r.Text == "novo").Props.Ins?.Author);
        Assert.Equal("Ana", again.Paragraphs[1].Props.MarkDel?.Author);
        Assert.Equal("Bia", again.Paragraphs[2].Runs[0].Props.Fmt?.Author);
    }

    [Fact]
    public void Motor_Esconde_O_Excluido_Na_Visao_Final_E_Marca_Em_Todas()
    {
        var full = FullDocReader.ReadFullDocument(Package());
        var fin = LayoutEngine.LayoutDocument(full, EngineRulesTests.Carlito.Value);
        string Text(LayoutResult r) => string.Concat(r.Pages.SelectMany(p => p.Items).OfType<GlyphRunItem>().Select(g => g.Text));
        Assert.DoesNotContain("velho", Text(fin));
        Assert.DoesNotContain(fin.Pages.SelectMany(p => p.Lines), l => l.Rev is not null);
        var all = LayoutEngine.LayoutDocument(full, EngineRulesTests.Carlito.Value, new LayoutOptions { Revisions = new RevisionView { Mode = "all" } });
        var del = all.Pages.SelectMany(p => p.Items).OfType<GlyphRunItem>().First(g => g.Text.Contains("velho"));
        // cor do 1º autor na ordem de leitura (Ana): 1ª da paleta do Word
        Assert.Equal("D13438", del.Color);
        // barras de alteração na margem esquerda (margem padrão 1701 − 720)
        Assert.Contains(all.Pages[0].Items.OfType<RectItem>(), r => r.X == 981 && r.Fill == "000000");
    }
}
