using System.Text;
using UniversalOffice.Docx;
using UniversalOffice.DocxLayout;
using UniversalOffice.Pdf;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// Navegação no PDF: links clicáveis (anotações /Link com /URI ou destino na
/// página) e marcadores pelos títulos (/Outlines) — como o PDF que o Word grava
/// com "Criar indicadores usando títulos". Mesma localização dos runs do viewer
/// (runBoxes em docx-layout/src/run-boxes.ts).
/// </summary>
public class PdfNavigationTests
{
    private static Run Text(string text, string? link = null) => new() { Text = text, Props = new RunProps { Link = link } };

    private static LaidOutLine Line(string @ref, int start, int end, double y) => new()
    {
        Ref = @ref, Start = start, End = end, X = 1000, Y = y, Height = 300, Baseline = y + 240, Width = (end - start) * 100,
        Chars = Enumerable.Range(0, end - start).Select(i => new LineChar(start + i, 1000 + i * 100, 100)).ToList(),
    };

    private static LayoutResult Layout(params List<LaidOutLine>[] pages) => new()
    {
        Pages = pages.Select(lines => new LayoutPage { WidthTw = 11906, HeightTw = 16838, Lines = lines }).ToList(),
    };

    [Fact]
    public void RunBoxes_Localiza_Os_Links_Nas_Linhas()
    {
        var full = new FullDocument
        {
            Blocks = [new ParagraphBlock { Paragraph = new Paragraph { Runs = [Text("Veja "), Text("o site", "https://a.test"), Text(" e "), Text("aqui", "#cap")] } }],
        };
        var boxes = RunBoxes.Collect(full, Layout([Line("b0", 0, 8, 500)], [Line("b0", 8, 18, 200)]), r => r.Props.Link);
        Assert.Equal(
            [(0, 1500.0, 300.0, "https://a.test"), (1, 1000.0, 300.0, "https://a.test"), (1, 1600.0, 400.0, "#cap")],
            boxes.Select(b => (b.Page, b.X, b.W, b.Value)).ToList());
    }

    [Fact]
    public void RunBoxes_Junta_O_Texto_De_Reserva_Do_Inline_E_Acha_O_Run_Seguinte()
    {
        var link = new Run { Text = "￼", Props = new RunProps(), Custom = new CustomInline { Type = "acme.link", DataJson = "{}", FallbackText = "Integridade" } };
        var full = new FullDocument { Blocks = [new ParagraphBlock { Paragraph = new Paragraph { Runs = [Text("Veja "), link, Text("x", "https://x.test")] } }] };
        var line = new LaidOutLine
        {
            Ref = "b0", Start = 0, End = 7, X = 1000, Y = 500, Height = 300, Baseline = 740, Width = 1700,
            Chars = [
                .. Enumerable.Range(0, 5).Select(i => new LineChar(i, 1000 + i * 100, 100)),
                .. Enumerable.Range(0, 11).Select(i => new LineChar(5 + i, 1500 + i * 100, 100)),
                new LineChar(6, 2600, 100),
            ],
        };
        var layout = Layout([line]);
        Assert.Equal([(1500.0, 1100.0)], RunBoxes.Collect(full, layout, r => r.Custom).Select(b => (b.X, b.W)).ToList());
        Assert.Equal([(2600.0, 100.0)], RunBoxes.Collect(full, layout, r => r.Custom is null ? r.Props.Link : null).Select(b => (b.X, b.W)).ToList());
    }

    [Fact]
    public void RunBoxes_Ignora_Cabecalho_E_Refs_Desconhecidas()
    {
        var full = new FullDocument { Blocks = [new ParagraphBlock { Paragraph = new Paragraph { Runs = [Text("x", "https://a.test")] } }] };
        Assert.Empty(RunBoxes.Collect(full, Layout([Line("hdr:default/b0", 0, 1, 100), Line("b9", 0, 1, 100)]), r => r.Props.Link));
    }

    [Fact]
    public void PdfDocument_Grava_Anotacoes_De_Link_E_Marcadores()
    {
        var doc = new PdfDocument(compress: false);
        var p1 = doc.AddPage(595, 842);
        doc.AddPage(595, 842);
        p1.AddLink(new PdfLink(72, 100, 120, 14, Uri: "https://exemplo.test/a b"));
        p1.AddLink(new PdfLink(72, 130, 50, 14, Uri: null, PageIndex: 1, DestTopPt: 40));
        p1.AddLink(new PdfLink(72, 160, 50, 14, Uri: "javascript:alert(1)"));
        doc.AddOutline(new PdfOutlineItem("Introdução", 1, 0, 50));
        doc.AddOutline(new PdfOutlineItem("Escopo", 2, 0, 300));
        doc.AddOutline(new PdfOutlineItem("Responsabilidades", 1, 1, 60));
        string pdf = Encoding.Latin1.GetString(doc.Build());

        Assert.Equal(2, Count(pdf, "/Subtype /Link"));
        Assert.Contains("/URI (https://exemplo.test/a%20b)", pdf);
        Assert.DoesNotContain("javascript", pdf);
        Assert.Contains("/Annots [", pdf);
        Assert.Contains("/Outlines ", pdf);
        Assert.Contains("/Title <FEFF0049006E00740072006F0064007500E700E3006F>", pdf); // Introdução em UTF-16BE
        Assert.Equal(3, Count(pdf, "/Title "));
        Assert.Matches(@"/Dest \[\d+ 0 R /XYZ 0 802 null\]", pdf); // 842 − 40 (topo do destino)
    }

    [Fact]
    public void Pdf_Sem_Links_Nem_Titulos_Nao_Tem_Anotacoes_Nem_Marcadores()
    {
        var doc = new PdfDocument(compress: false);
        doc.AddPage(595, 842);
        string pdf = Encoding.Latin1.GetString(doc.Build());
        Assert.DoesNotContain("/Annots", pdf);
        Assert.DoesNotContain("/Outlines", pdf);
    }

    [Fact]
    public void Docx_Com_Hiperlink_E_Titulos_Gera_Pdf_Navegavel()
    {
        if (!LayoutParityTests.HasFonts.Value) return; // sem as fontes da máquina: não avalia
        var pkg = DocxPackage.Empty();
        pkg.SetPartText("word/_rels/document.xml.rels",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rId7\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink\" Target=\"https://exemplo.test/politica\" TargetMode=\"External\"/>" +
            "</Relationships>");
        pkg.SetPartText("word/document.xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><w:body>" +
            "<w:p><w:pPr><w:outlineLvl w:val=\"0\"/></w:pPr><w:r><w:t>Objetivo</w:t></w:r></w:p>" +
            "<w:p><w:r><w:t xml:space=\"preserve\">Leia a </w:t></w:r><w:hyperlink r:id=\"rId7\"><w:r><w:t>política</w:t></w:r></w:hyperlink></w:p>" +
            "<w:p><w:pPr><w:outlineLvl w:val=\"1\"/></w:pPr><w:r><w:t>Escopo</w:t></w:r></w:p>" +
            "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1417\" w:right=\"1701\" w:bottom=\"1417\" w:left=\"1701\"/></w:sectPr>" +
            "</w:body></w:document>");
        string pdf = Encoding.Latin1.GetString(DocxLayoutPipeline.ToPdf(pkg.Save(), SubstituteFontProvider.Shared, null, new PdfRenderOptions { Compress = false }));
        Assert.Contains("/URI (https://exemplo.test/politica)", pdf);
        Assert.Equal(2, Count(pdf, "/Title "));
    }

    /// <summary>.docx com um título e um hiperlink externo (o alvo muda por documento).</summary>
    private static byte[] DocxWithLink(string heading, string url)
    {
        var pkg = DocxPackage.Empty();
        pkg.SetPartText("word/_rels/document.xml.rels",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            $"<Relationship Id=\"rId7\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink\" Target=\"{url}\" TargetMode=\"External\"/>" +
            "</Relationships>");
        pkg.SetPartText("word/document.xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><w:body>" +
            $"<w:p><w:pPr><w:outlineLvl w:val=\"0\"/></w:pPr><w:r><w:t>{heading}</w:t></w:r></w:p>" +
            "<w:p><w:hyperlink r:id=\"rId7\"><w:r><w:t>link</w:t></w:r></w:hyperlink></w:p>" +
            "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1417\" w:right=\"1701\" w:bottom=\"1417\" w:left=\"1701\"/></w:sectPr>" +
            "</w:body></w:document>");
        return pkg.Save();
    }

    [Fact]
    public void ToPdf_Nao_Altera_As_Opcoes_E_A_Mesma_Instancia_Serve_A_Varios_Documentos()
    {
        // fonte ABERTA versionada (Carlito) para qualquer família: roda sem as fontes da máquina
        string ttf = Path.Combine(Fixtures.Dir, "..", "..", "..", "shared", "fonts", "files", "carlito-regular.ttf");
        var provider = new UniversalOffice.Export.DocxPdf.FixedFontProvider([new UniversalOffice.Pdf.PdfFontSource { Bytes = File.ReadAllBytes(ttf) }]);
        var opts = new PdfRenderOptions { Compress = false };

        string first = Encoding.Latin1.GetString(DocxLayoutPipeline.ToPdf(DocxWithLink("Primeiro", "https://a.test/um"), provider, null, opts));
        Assert.Null(opts.Navigation);
        string second = Encoding.Latin1.GetString(DocxLayoutPipeline.ToPdf(DocxWithLink("Segundo", "https://b.test/dois"), provider, null, opts));
        Assert.Null(opts.Navigation);

        Assert.Contains("/URI (https://a.test/um)", first);
        Assert.Contains("/URI (https://b.test/dois)", second);
        Assert.DoesNotContain("https://a.test/um", second);
        Assert.Equal(1, Count(second, "/Subtype /Link"));
        Assert.Equal(1, Count(second, "/Title "));
    }

    [Fact]
    public void ToPdf_Usa_A_Navegacao_Dada_Nas_Opcoes()
    {
        string ttf = Path.Combine(Fixtures.Dir, "..", "..", "..", "shared", "fonts", "files", "carlito-regular.ttf");
        var provider = new UniversalOffice.Export.DocxPdf.FixedFontProvider([new UniversalOffice.Pdf.PdfFontSource { Bytes = File.ReadAllBytes(ttf) }]);
        var nav = new PdfNavigation();
        nav.Links.Add((0, new PdfLink(72, 72, 100, 14, Uri: "https://dado.test/")));
        var opts = new PdfRenderOptions { Compress = false, Navigation = nav };

        string pdf = Encoding.Latin1.GetString(DocxLayoutPipeline.ToPdf(DocxWithLink("Título", "https://doc.test/"), provider, null, opts));

        Assert.Same(nav, opts.Navigation);
        Assert.Contains("/URI (https://dado.test/)", pdf);
        Assert.DoesNotContain("https://doc.test/", pdf);
        Assert.DoesNotContain("/Outlines", pdf);
    }

    private static int Count(string s, string what)
    {
        int n = 0;
        for (int i = s.IndexOf(what, StringComparison.Ordinal); i >= 0; i = s.IndexOf(what, i + what.Length, StringComparison.Ordinal)) n++;
        return n;
    }
}
