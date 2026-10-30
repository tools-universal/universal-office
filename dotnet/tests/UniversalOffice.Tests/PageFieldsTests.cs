using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using UniversalOffice.DocxLayout;
using UniversalOffice.Tests.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests;

/// <summary>
/// Campos de página no rodapé, como o Word 365 pt-BR os mostra no PDF (lab numpages:
/// capa + 3 páginas, w:titlePg, w:pgNumType w:start="0") — espelho de
/// write/packages/docx-layout/test/page-fields.test.ts. NUMPAGES conta a capa ("1 de
/// 4"); SECTIONPAGES conta só a seção da página; { = { NUMPAGES } - 1 } dá o total sem a
/// capa ("3").
/// </summary>
public class PageFieldsTests
{
    private const string Ns = $"xmlns:w=\"{WordNs}\" xmlns:r=\"{RelNs}\"";
    private const string PageBreak = "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>";
    private const string Geometry = "<w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1417\" w:right=\"1701\" w:bottom=\"1417\" w:left=\"1701\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>";
    private const string CoverSect = $"<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>{Geometry}<w:pgNumType w:start=\"0\"/><w:titlePg/></w:sectPr>";

    private static string Fld(string instr, string cached = "9") =>
        $"<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> {instr} </w:instrText></w:r>"
        + $"<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>{cached}</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";

    /// <summary>{ = { inner } op } — fórmula com um campo aninhado no código.</summary>
    private static string Formula(string inner, string op, string cached = "9") =>
        "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> = </w:instrText></w:r>" + Fld(inner)
        + $"<w:r><w:instrText xml:space=\"preserve\"> {op} </w:instrText></w:r><w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>"
        + $"<w:r><w:t>{cached}</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";

    private static readonly string Footer = $"<w:ftr {Ns}>" + Paragraph(Run("P=") + Fld("PAGE \\* Arabic \\* MERGEFORMAT") + Run(" de N=") + Fld("NUMPAGES \\* Arabic \\* MERGEFORMAT")
        + Run(" S=") + Fld("SECTIONPAGES \\* Arabic \\* MERGEFORMAT") + Run(" C=") + Formula("NUMPAGES \\* Arabic \\* MERGEFORMAT", "- 1")
        + Run(" CS=") + Formula("SECTIONPAGES", "- 1") + Run(" END")) + "</w:ftr>";

    private static LayoutResult Layout(string[] body, string sect, string? footer = null) =>
        DocxLayoutPipeline.Layout(new DocxBuilder().WithFooter("rIdFtr", footer ?? Footer).WithBody(body).WithSectionProperties(sect).Build(), EngineRulesTests.Carlito.Value);

    private static string NoSpaces(string s) => s.Replace(" ", "", StringComparison.Ordinal);

    /// <summary>Texto da metade de baixo (rodapé) ou de cima (corpo) de cada página, sem espaços.</summary>
    private static List<string> Texts(LayoutResult res, bool bottom) => res.Pages.Select(pg => string.Concat(pg.Items.OfType<GlyphRunItem>()
        .Where(g => bottom ? g.Y > pg.HeightTw / 2 : g.Y < pg.HeightTw / 2)
        .OrderBy(g => g.Y).ThenBy(g => g.Glyphs.Count > 0 ? g.Glyphs[0].X : 0).Select(g => g.Text))).ToList();

    [Fact]
    public void Uma_Secao_Capa_Sem_Rodape_Page_Comeca_Em_1_E_Numpages_Conta_A_Capa()
    {
        var res = Layout([Paragraph(Run("CAPA")), PageBreak, Paragraph(Run("Corpo 1")), PageBreak, Paragraph(Run("Corpo 2")), PageBreak, Paragraph(Run("Corpo 3"))], CoverSect);
        Assert.Equal(new[]
        {
            "",
            "P=1 de N=4 S=4 C=3 CS=3 END",
            "P=2 de N=4 S=4 C=3 CS=3 END",
            "P=3 de N=4 S=4 C=3 CS=3 END",
        }.Select(NoSpaces), Texts(res, bottom: true));
    }

    [Fact]
    public void Capa_Em_Secao_Propria_Sectionpages_Conta_So_A_Secao_Da_Pagina()
    {
        string last = $"<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/><w:type w:val=\"nextPage\"/>{Geometry}</w:sectPr>";
        var res = Layout([Paragraph(Run("CAPA"), CoverSect), Paragraph(Run("Corpo 1")), PageBreak, Paragraph(Run("Corpo 2")), PageBreak, Paragraph(Run("Corpo 3"))], last);
        Assert.Equal(new[]
        {
            "P=1 de N=4 S=3 C=3 CS=2 END",
            "P=2 de N=4 S=3 C=3 CS=2 END",
            "P=3 de N=4 S=3 C=3 CS=2 END",
        }.Select(NoSpaces), Texts(res, bottom: true).Skip(1));
    }

    [Fact]
    public void Formula_Sem_Campo_Aninhado_Recalculada_No_Rodape_Cache_No_Corpo()
    {
        string simple = "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> = 2 + 2 </w:instrText></w:r>"
            + "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>9</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";
        string body = Paragraph(Run("B1=") + Formula("NUMPAGES", "- 1") + Run(" B2=") + simple + Run(" B3=") + Fld("NUMPAGES") + Run(" FIM"));
        var res = Layout([body, PageBreak, Paragraph(Run("Dois"))], $"<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>{Geometry}</w:sectPr>",
            $"<w:ftr {Ns}>{Paragraph(Run("F1=") + simple + Run(" END"))}</w:ftr>");
        Assert.Equal(NoSpaces("B1=1 B2=9 B3=2 FIM"), Texts(res, bottom: false)[0]);
        Assert.Equal(new[] { "F1=4END", "F1=4END" }, Texts(res, bottom: true));
    }

    /// <summary>Folha de rosto da galeria: sdt de bloco com docPartGallery (padrão "Cover Pages").</summary>
    private static string CoverSdt(string gallery = "Cover Pages") =>
        $"<w:sdt><w:sdtPr><w:id w:val=\"1\"/><w:docPartObj><w:docPartGallery w:val=\"{gallery}\"/><w:docPartUnique/></w:docPartObj></w:sdtPr>"
        + $"<w:sdtContent>{Paragraph(Run("CAPA") + "<w:r><w:br w:type=\"page\"/></w:r>")}</w:sdtContent></w:sdt>";

    private static readonly string[] Body3 = [Paragraph(Run("Corpo 1")), PageBreak, Paragraph(Run("Corpo 2")), PageBreak, Paragraph(Run("Corpo 3"))];
    private const string NoStartSect = $"<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>{Geometry}<w:titlePg/></w:sectPr>";

    private static string[] Doc(params string[] head) => [.. head, .. Body3];

    // NUMPAGES com folha de rosto da galeria (etica.docx, Word 365 — NumPages.Shown)

    [Fact]
    public void Folha_De_Rosto_Da_Galeria_E_Start_0_Na_1a_Secao_Numpages_Desconta_A_Capa_E_A_Formula_Tambem()
    {
        var res = Layout(Doc(CoverSdt()), CoverSect);
        Assert.Equal(new[]
        {
            "",
            "P=1 de N=3 S=4 C=2 CS=3 END",
            "P=2 de N=3 S=4 C=2 CS=3 END",
            "P=3 de N=3 S=4 C=2 CS=3 END",
        }.Select(NoSpaces), Texts(res, bottom: true));
    }

    [Fact]
    public void Folha_De_Rosto_De_Outra_Galeria_Paginas_Fisicas()
    {
        var res = Layout(Doc(CoverSdt("Quick Parts")), CoverSect);
        Assert.Equal(new[] { "P=1 de N=4 S=4 C=3 CS=3 END", "P=2 de N=4 S=4 C=3 CS=3 END", "P=3 de N=4 S=4 C=3 CS=3 END" }.Select(NoSpaces),
            Texts(res, bottom: true).Skip(1));
    }

    [Fact]
    public void Folha_De_Rosto_Sem_Start_0_Paginas_Fisicas()
    {
        var res = Layout(Doc(CoverSdt()), NoStartSect);
        Assert.Equal(new[] { "P=2 de N=4 S=4 C=3 CS=3 END", "P=3 de N=4 S=4 C=3 CS=3 END", "P=4 de N=4 S=4 C=3 CS=3 END" }.Select(NoSpaces),
            Texts(res, bottom: true).Skip(1));
    }

    [Fact]
    public void Folha_De_Rosto_Fora_Da_1a_Pagina_O_Desconto_Continua()
    {
        var res = Layout(Doc(Paragraph(Run("Antes") + "<w:r><w:br w:type=\"page\"/></w:r>"), CoverSdt()), CoverSect);
        Assert.Equal(new[]
        {
            "P=1 de N=4 S=5 C=3 CS=4 END",
            "P=2 de N=4 S=5 C=3 CS=4 END",
            "P=3 de N=4 S=5 C=3 CS=4 END",
            "P=4 de N=4 S=5 C=3 CS=4 END",
        }.Select(NoSpaces), Texts(res, bottom: true).Skip(1));
    }

    [Fact]
    public void Duas_Secoes_A_2a_Reiniciando_Em_1_Numpages_Desconta_A_Capa_Sectionpages_Nao()
    {
        string last = $"<w:sectPr><w:type w:val=\"nextPage\"/>{Geometry}<w:pgNumType w:start=\"1\"/></w:sectPr>";
        var res = Layout([CoverSdt(), Paragraph(Run("Corpo 1")), Paragraph("", CoverSect), Paragraph(Run("Corpo 2")), PageBreak, Paragraph(Run("Corpo 3"))], last);
        Assert.Equal(new[]
        {
            "",
            "P=1 de N=3 S=2 C=2 CS=1 END",
            "P=1 de N=3 S=2 C=2 CS=1 END",
            "P=2 de N=3 S=2 C=2 CS=1 END",
        }.Select(NoSpaces), Texts(res, bottom: true));
    }

    [Fact]
    public void Start_0_So_Na_2a_Secao_A_Que_Abre_Na_Capa_Paginas_Fisicas()
    {
        string first = $"<w:sectPr><w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>{Geometry}</w:sectPr>";
        var res = Layout(Doc(Paragraph(Run("Antes")), Paragraph("", first), CoverSdt()), CoverSect);
        Assert.Equal(new[]
        {
            "P=1 de N=5 S=1 C=4 CS=0 END",
            "",
            "P=1 de N=5 S=4 C=4 CS=3 END",
            "P=2 de N=5 S=4 C=4 CS=3 END",
            "P=3 de N=5 S=4 C=4 CS=3 END",
        }.Select(NoSpaces), Texts(res, bottom: true));
    }

    [Fact]
    public void Leitura_Marca_Os_Paragrafos_Da_Folha_De_Rosto_Com_A_Galeria()
    {
        var docx = new DocxBuilder().WithFooter("rIdFtr", Footer).WithBody(Doc(CoverSdt())).WithSectionProperties(CoverSect).Build();
        var full = UniversalOffice.Docx.FullDocReader.ReadFullDocument(UniversalOffice.Docx.DocxPackage.Load(docx));
        var paras = full.Blocks.OfType<UniversalOffice.Docx.ParagraphBlock>().Select(b => b.Paragraph).ToList();
        Assert.Equal(NumPages.CoverPagesGallery, paras[0].Props.BlockSdt?.Gallery);
        Assert.Null(paras[1].Props.BlockSdt);
        Assert.True(NumPages.HasCoverPage(paras));
    }

    private static string? Eval(string code, string numPages = "4", string page = "2", string sectionPages = "3") =>
        FieldFormula.Evaluate(code, (name, _) => name switch { "NUMPAGES" => numPages, "PAGE" => page, "SECTIONPAGES" => sectionPages, _ => null });

    [Theory]
    [InlineData("= { NUMPAGES } - 1", "3")]
    [InlineData("= { NUMPAGES } -1", "3")]
    [InlineData("={ NUMPAGES }-1", "3")]
    [InlineData("= { NUMPAGES } / 3", "1,33")]
    [InlineData("= { PAGE } * 2 \\# \"00\"", "04")]
    [InlineData("= { NUMPAGES } - 1 \\* roman", "iii")]
    [InlineData("= { NUMPAGES } - 1 \\* Arabic \\* MERGEFORMAT", "3")]
    [InlineData("= { SECTIONPAGES } * 10 + 0,5", "30,5")]
    [InlineData("= ({ NUMPAGES } + 2) * 2", "12")]
    [InlineData("= -{ PAGE } + 10", "8")]
    [InlineData("= { = { NUMPAGES } - 1 } * 2", "6")]
    [InlineData("= 2 + 2", "4")]
    public void Formula_Formatos_Medidos_No_Word(string code, string expected) => Assert.Equal(expected, Eval(code));

    [Theory]
    [InlineData("= { NUMPAGES } / 0")]
    [InlineData("= SUM(ABOVE)")]
    [InlineData("= { NUMPAGES } - x")]
    [InlineData("= { AUTHOR } - 1")]
    [InlineData("= { NUMPAGES } -")]
    [InlineData("= ( { NUMPAGES } - 1")]
    [InlineData("= Math.max(1)")]
    public void Formula_Fora_Do_Subconjunto_Seguro_Mantem_O_Cache(string code) => Assert.Null(Eval(code));

    [Fact]
    public void Formula_Com_Page_Em_Romanos_Mantem_O_Cache() => Assert.Null(Eval("= { PAGE } - 1", page: "iv"));

    [Fact]
    public void Leitura_Guarda_O_Codigo_Com_O_Campo_Aninhado_Entre_Chaves()
    {
        var docx = new DocxBuilder().WithFooter("rIdFtr", Footer).WithBody(Paragraph(Run("x"))).WithSectionProperties(CoverSect).Build();
        var full = UniversalOffice.Docx.FullDocReader.ReadFullDocument(UniversalOffice.Docx.DocxPackage.Load(docx));
        var runs = full.Sections[0].Footers.Default!.SelectMany(p => p.Runs).Where(r => r.Field is not null).ToList();
        var formula = runs.First(r => r.Field!.Trim().StartsWith('='));
        Assert.Equal(" = 9 - 1 ", formula.Field);
        Assert.Equal(" = { NUMPAGES \\* Arabic \\* MERGEFORMAT } - 1 ", formula.FieldCode);
        Assert.Null(runs.First(r => r.Field!.Trim().StartsWith("PAGE", StringComparison.Ordinal)).FieldCode);
    }

    [Fact]
    public void Saneamento_Do_Documento_Gerado_Mantem_A_Formula_E_O_Conteudo_Recebido_Nao()
    {
        string footer = $"<w:ftr {Ns}>{Paragraph(Run("Página ") + Fld("PAGE", "1") + Run(" de ") + Formula("NUMPAGES", "- 1", "3"))}</w:ftr>";
        var docx = new DocxBuilder().WithFooter("rIdFtr", footer).WithBody(Paragraph(Run("a") + Formula("NUMPAGES", "- 1", "3"))).WithSectionProperties(CoverSect).Build();

        var output = DocxDocument.Open(docx);
        DocxSanitizer.Sanitize(output, DocxSanitizeOptions.Output);
        var saved = output.Save();
        string Instr(string part) => string.Concat(XDocument.Parse(ReadPart(saved, part)).Descendants(W + "instrText").Select(i => i.Value));
        Assert.Contains("=", Instr("word/footer1.xml"));
        Assert.Contains("NUMPAGES", Instr("word/footer1.xml"));
        Assert.Contains("=", Instr("word/document.xml"));

        // no conteúdo recebido a fórmula do corpo vira o resultado em cache
        var input = DocxDocument.Open(docx);
        DocxSanitizer.Sanitize(input, DocxSanitizeOptions.Content with { RemoveHeadersAndFooters = false });
        var cleaned = input.Save();
        Assert.DoesNotContain("=", string.Concat(XDocument.Parse(ReadPart(cleaned, "word/document.xml")).Descendants(W + "instrText").Select(i => i.Value)));
    }
}
