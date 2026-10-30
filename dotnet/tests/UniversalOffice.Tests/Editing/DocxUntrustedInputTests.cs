using System.Diagnostics;
using System.Text;
using UniversalOffice.Core;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Entrada hostil (achados de uma revisão de segurança): alvo com escape duplo,
/// XML profundo, tamanho declarado mentiroso no ZIP e campos sem fim.
/// </summary>
public class DocxUntrustedInputTests
{
    private const string RelBase = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
    private const string FontCt = "application/vnd.openxmlformats-officedocument.obfuscatedFont";
    private const string FontTableCt = "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml";
    private const string FootnotesCt = "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml";

    private static string Nested(int depth)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < depth; i++) sb.Append("<x:a>");
        for (int i = 0; i < depth; i++) sb.Append("</x:a>");
        return sb.ToString();
    }

    private static string Footnotes(int depth) =>
        $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="{WordNs}" xmlns:x="urn:x"><w:footnote w:id="1"><w:p><w:r><w:t>nota</w:t></w:r>{Nested(depth)}</w:p></w:footnote></w:footnotes>""";

    private static readonly string FootnoteReference = Paragraph(Run("texto") + "<w:r><w:footnoteReference w:id=\"1\"/></w:r>");

    private static DocxDocument Template() => DocxDocument.Open(new DocxBuilder().WithBody(Paragraph("")).Build());

    private static byte[] Clean(byte[] docx, DocxLimits? limits = null)
    {
        var doc = DocxDocument.Open(docx, limits ?? DocxLimits.Default);
        DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content);
        return doc.Save();
    }

    /// <summary>
    /// O pacote do harness "deepnote": notas apontadas por <c>fn%2531.xml</c> (escape
    /// duplo) e a parte real <c>fn1.xml</c> declarada como fonte da tabela de fontes.
    /// </summary>
    private static byte[] DoubleEscapedNotes(int depth) =>
        new DocxBuilder()
            .WithBody(FootnoteReference)
            .WithEntry("word/fontTable.xml", $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="{WordNs}" xmlns:r="{RelNs}"><w:font w:name="X"><w:embedRegular r:id="rId1" w:fontKey="00000000-0000-0000-0000-000000000000"/></w:font></w:fonts>""", FontTableCt)
            .WithEntry("word/fn1.xml", Footnotes(depth), FontCt)
            .WithPartRelationships("word/fontTable.xml", Rel("rId1", RelBase + "font", "fn1.xml"))
            .WithDocumentRelationship("rId7", RelBase + "footnotes", "fn%2531.xml")
            .WithDocumentRelationship("rId8", RelBase + "fontTable", "fontTable.xml")
            .Build();

    // ─────────────────────────────── achado 1: alvo e profundidade ───────────────────────────────

    [Fact]
    public void Alvo_Com_Escape_Duplo_Nao_Alcanca_A_Parte_Desescapada_Duas_Vezes()
    {
        var doc = DocxDocument.Open(DoubleEscapedNotes(5));

        Assert.True(doc.HasPart("word/fn1.xml"));
        Assert.False(doc.HasPart("word/fn%2531.xml"));
        Assert.False(doc.HasPart("word/fn%31.xml"));
        Assert.Equal("word/fn%31.xml", OpcPartName.ResolveRelationshipTarget(doc.MainPartPath, "fn%2531.xml"));
    }

    [Fact]
    public void Harness_Deepnote_Limpa_E_Aplica_No_Modelo_Sem_Abrir_A_Parte_De_Fonte_Como_Nota()
    {
        var cleaned = Clean(DoubleEscapedNotes(100_000));
        var template = Template();

        DocxTemplate.ApplyContent(template, cleaned);
        var result = template.Save();

        Assert.False(HasPart(result, "word/footnotes.xml"));
        Assert.Contains("texto", BodyText(result));
    }

    [Fact]
    public void Alvo_Com_Escape_Simples_Ainda_Resolve()
    {
        var docx = new DocxBuilder()
            .WithBody(FootnoteReference)
            .WithEntry("word/notas de rodapé.xml", Footnotes(3), FootnotesCt)
            .WithDocumentRelationship("rId7", RelBase + "footnotes", "notas%20de%20rodap%C3%A9.xml")
            .Build();
        var template = Template();

        DocxTemplate.ApplyContent(template, docx);

        Assert.Contains("nota", AllXml(template.Save()));
    }

    [Fact]
    public void Xml_Profundo_No_Corpo_Lanca_Ao_Abrir()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Run("t") + $"<x:a xmlns:x=\"urn:x\">{Nested(400)}</x:a>")).Build();

        var ex = Assert.Throws<OfficeLimitExceededException>(() => DocxDocument.Open(docx));

        Assert.Equal(OfficeLimit.XmlDepth, ex.Limit);
        Assert.Equal(256, ex.Maximum);
        Assert.Equal("word/document.xml", ex.PartName);
    }

    [Fact]
    public void Profundidade_No_Teto_Abre_E_Um_Acima_Lanca()
    {
        // w:document = 0, w:body = 1, w:p = 2; o x:a mais interno fica em 2 + n
        static byte[] Body(int n) =>
            new DocxBuilder().WithBody($"<w:p xmlns:x=\"urn:x\">{Nested(n)}</w:p>").WithSectionProperties(null).Build();

        DocxDocument.Open(Body(254));
        Assert.Throws<OfficeLimitExceededException>(() => DocxDocument.Open(Body(255)));
        DocxDocument.Open(Body(255), new DocxLimits { MaxXmlDepth = 257 });
    }

    [Fact]
    public void Nota_Profunda_Lanca_Ao_Importar_No_Modelo()
    {
        var docx = new DocxBuilder().WithBody(FootnoteReference).WithFootnotes(Footnotes(100_000)).Build();

        var ex = Assert.Throws<OfficeLimitExceededException>(() => DocxTemplate.ApplyContent(Template(), docx));

        Assert.Equal(OfficeLimit.XmlDepth, ex.Limit);
        Assert.Equal("word/footnotes.xml", ex.PartName);
    }

    [Fact]
    public void Importacao_Copia_Xml_Profundo_Sem_Estourar_A_Pilha_Quando_O_Teto_E_Alto()
    {
        var limits = new DocxLimits { MaxXmlDepth = 200_000 };
        var docx = new DocxBuilder().WithBody(FootnoteReference).WithFootnotes(Footnotes(50_000)).Build();
        var template = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph("")).Build(), limits);

        DocxTemplate.ApplyContent(template, docx);

        Assert.Contains("nota", ReadPart(template.Save(), "word/footnotes.xml"));
    }

    [Fact]
    public void Importacao_Preserva_Forma_Vazia_Comentario_Cdata_E_Instrucao()
    {
        var docx = new DocxBuilder().WithBody(
            "<w:p xmlns:x=\"urn:x\"><w:r><w:t>a</w:t></w:r><x:vazio/><x:aberto></x:aberto><!--comentário--><?pi dados?><x:c><![CDATA[<cdata>]]></x:c></w:p>").Build();
        var template = Template();

        DocxTemplate.ApplyContent(template, docx);
        var xml = ReadPart(template.Save(), "word/document.xml");

        Assert.Matches("<[a-z0-9]+:vazio ?/>", xml);
        Assert.Matches("<([a-z0-9]+):aberto></\\1:aberto>", xml);
        Assert.Contains("<!--comentário-->", xml);
        Assert.Contains("<?pi dados?>", xml);
        Assert.Contains("<![CDATA[<cdata>]]>", xml);
    }

    // ─────────────────────────────── achado 2: tamanho declarado ───────────────────────────────

    [Fact]
    public void Harness_Sizelie_Abre_Sem_Reservar_O_Tamanho_Declarado()
    {
        var docx = new DocxBuilder();
        for (int k = 0; k < 20; k++) docx.WithEntry($"docProps/c{k}.xml", "<?xml version=\"1.0\"?><r/>");
        var lying = OpcPackageLimitsTests.LieAboutSize(docx.Build(), "docProps/c", 2_000_000_000);

        long before = GC.GetAllocatedBytesForCurrentThread();
        var doc = DocxDocument.Open(lying);
        long allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.True(allocated < 64L * 1024 * 1024, $"alocou {allocated / 1048576} MB");
        Assert.Contains("docProps/c19.xml", doc.PartNames);
    }

    [Fact]
    public void Limites_De_Pacote_Valem_No_Open()
    {
        var docx = new DocxBuilder().WithEntry("word/media/grande.bin", new byte[2 * 1024 * 1024]).Build();

        var ex = Assert.Throws<OfficeLimitExceededException>(() =>
            DocxDocument.Open(docx, new DocxLimits { Package = new OpcPackageLimits { MaxPartBytes = 1024 * 1024 } }));

        Assert.Equal(OfficeLimit.PartBytes, ex.Limit);
        Assert.Equal("word/media/grande.bin", ex.PartName);
    }

    // ─────────────────────────────── achado 3: campos ───────────────────────────────

    private static string Begins(int n) =>
        string.Concat(Enumerable.Repeat("<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r>", n));

    [Fact]
    public void Harness_Fields_Campos_Sem_Fim_Param_No_Teto_De_Aninhamento()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Begins(20_000) + Run("x"))).Build();

        var sw = Stopwatch.StartNew();
        var ex = Assert.Throws<OfficeLimitExceededException>(() => Clean(docx));

        Assert.Equal(OfficeLimit.FieldNesting, ex.Limit);
        Assert.Equal(64, ex.Maximum);
        Assert.True(sw.ElapsedMilliseconds < 5000, $"{sw.ElapsedMilliseconds} ms");
    }

    [Fact]
    public void Campos_Sem_Fim_Sao_Ignorados_Em_Tempo_Linear()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(Run("a") + Begins(50_000) + Run("x"))).Build();
        var limits = new DocxLimits { MaxFieldNesting = 100_000 };

        var sw = Stopwatch.StartNew();
        var cleaned = Clean(docx, limits);

        Assert.True(sw.ElapsedMilliseconds < 5000, $"{sw.ElapsedMilliseconds} ms");
        Assert.Equal("ax", BodyText(cleaned));
        Assert.Equal(50_000, Xml(cleaned).Descendants(W + "fldChar").Count());
    }

    [Fact]
    public void Muitos_Campos_Fechados_No_Mesmo_Paragrafo_Em_Tempo_Linear()
    {
        var fields = new StringBuilder();
        for (int i = 0; i < 5_000; i++)
        {
            fields.Append(Field(" AUTHOR ", "autor"));
            fields.Append(Field($" HYPERLINK \"https://example.com/{i}\" ", "link"));
        }
        var docx = new DocxBuilder().WithBody(Paragraph(fields.ToString())).Build();

        var sw = Stopwatch.StartNew();
        var cleaned = Clean(docx);

        Assert.True(sw.ElapsedMilliseconds < 10_000, $"{sw.ElapsedMilliseconds} ms");
        Assert.Empty(Xml(cleaned).Descendants(W + "fldChar"));
        Assert.Equal(5_000, Xml(cleaned).Descendants(W + "hyperlink").Count());
        Assert.Equal(string.Concat(Enumerable.Repeat("autorlink", 5_000)), BodyText(cleaned));
    }

    [Fact]
    public void Teto_De_Campos_Por_Historia()
    {
        var docx = new DocxBuilder().WithBody(Paragraph(string.Concat(Enumerable.Repeat(Field(" PAGE ", "1"), 11)))).Build();

        Clean(docx, new DocxLimits { MaxFieldsPerStory = 11 });
        var ex = Assert.Throws<OfficeLimitExceededException>(() => Clean(docx, new DocxLimits { MaxFieldsPerStory = 10 }));

        Assert.Equal(OfficeLimit.FieldsPerStory, ex.Limit);
        Assert.Equal("word/document.xml", ex.PartName);
    }

    [Fact]
    public void Campo_Aninhado_No_Codigo_E_No_Resultado_Continua_Igual()
    {
        // { IF { DATE } = "x" "sim" { PAGE } } — DATE no código, PAGE no resultado
        string nested =
            "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> IF </w:instrText></w:r>" +
            Field(" DATE ", "hoje") +
            "<w:r><w:instrText xml:space=\"preserve\"> = \"x\" \"sim\" </w:instrText></w:r>" +
            "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>" + Run("pág. ") + Field(" PAGE ", "3") + "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";
        var docx = new DocxBuilder().WithBody(Paragraph(nested)).Build();

        var cleaned = Clean(docx);

        Assert.Equal("pág. 3", BodyText(cleaned));
        var instructions = DocxFields.GetInstructions(DocxDocument.Open(cleaned));
        Assert.Equal("PAGE", Assert.Single(instructions).Name);
    }
}
