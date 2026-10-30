using System.Xml.Linq;
using UniversalOffice.Docx.Editing;
using Xunit;
using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>Parâmetros <c>#{...}</c>, busca/substituição, histórico em tabela e texto puro.</summary>
public class DocxTextTests
{
    [Fact]
    public void Parametro_Quebrado_Em_Varios_Runs_E_Trocado_Com_A_Formatacao_Do_Primeiro()
    {
        // como o Word grava o #{TitleWithCode} do modelo padrão: "#{" / "TitleWithCode" / "}" em runs diferentes
        var docx = new DocxBuilder().WithBody(Paragraph(
            Run("#{", "<w:sz w:val=\"40\"/>") + Run("TitleWithCode", "<w:rFonts w:cs=\"Arial\"/>") + Run("}", "<w:sz w:val=\"40\"/>"))).Build();
        var doc = DocxDocument.Open(docx);

        int count = DocxText.ReplaceParameter(doc, "TitleWithCode", "POL-001 - Código de Conduta");
        var saved = doc.Save();
        var runs = Xml(saved).Descendants(W + "r").ToList();

        Assert.Equal(1, count);
        Assert.Equal("POL-001 - Código de Conduta", BodyText(saved));
        var run = Assert.Single(runs);
        Assert.Equal("40", (string?)run.Element(W + "rPr")!.Element(W + "sz")!.Attribute(W + "val"));
    }

    [Fact]
    public void Parametro_Sem_Diferenciar_Maiusculas_E_Sem_Pegar_Prefixo_De_Outro()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(
            Paragraph(Run("Título: #{title} / #{TitleWithCode}")),
            Paragraph(Run("Valor: #{Title}x"))).Build());

        DocxText.ReplaceParameter(doc, "Title", "Código");
        var paragraphs = BodyParagraphs(doc.Save());

        Assert.Equal("Título: Código / #{TitleWithCode}", Text(paragraphs[0]));
        Assert.Equal("Valor: Códigox", Text(paragraphs[1]));
    }

    [Fact]
    public void Palavra_Inteira_Respeita_Letras_Coladas_So_Nas_Pontas_De_Letra()
    {
        Assert.True(Find("HistoryVersion", "#{HistoryVersion}"));
        Assert.False(Find("HistoryVersion", "#{HistoryVersionX}"));
        Assert.False(Find("History", "#{HistoryVersion}"));
        Assert.True(Find("#{Title}", "abc#{Title}def"));

        static bool Find(string needle, string text) =>
            DocxText.Contains(DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run(text))).Build()), needle, caseSensitive: true, wholeWord: true);
    }

    [Fact]
    public void Valor_Com_Quebras_De_Linha_E_Tabulacao_Vira_Br_E_Tab()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("Descrição: #{Description}."))).Build());

        DocxText.ReplaceParameter(doc, "Description", "linha 1\r\nlinha 2\tfim");
        var paragraph = Assert.Single(BodyParagraphs(doc.Save()));

        Assert.Equal("Descrição: linha 1linha 2fim.", Text(paragraph));
        Assert.Single(paragraph.Descendants(W + "br"));
        Assert.Single(paragraph.Descendants(W + "tab"));
        Assert.Equal("Descrição: linha 1\nlinha 2\tfim.", DocxText.GetPlainText(DocxDocument.Open(doc.Save())));
    }

    [Fact]
    public void Parametro_Em_Caixa_De_Texto_Cabecalho_E_Rodape_Tambem_E_Trocado()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithBody(Paragraph(TextBox(Paragraph(Run("#{Code}")))))
            .WithHeader("rIdH", $$"""<w:hdr xmlns:w="{{WordNs}}"><w:p><w:r><w:t>#{Code}</w:t></w:r></w:p></w:hdr>""")
            .WithSectionProperties("""<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/></w:sectPr>""")
            .Build());

        int count = DocxText.ReplaceParameter(doc, "Code", "POL-1");
        var saved = doc.Save();

        Assert.Equal(3, count); // mc:Choice, mc:Fallback e cabeçalho
        Assert.DoesNotContain("#{Code}", AllXml(saved));
        Assert.Contains("POL-1", ReadPart(saved, "word/header1.xml"));
    }

    [Fact]
    public void Texto_Do_Conteudo_Aplicado_Depois_Nao_E_Trocado()
    {
        // a ordem recomendada: parâmetros no modelo ANTES de importar o conteúdo
        var template = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("Título: #{Title}"))).Build());
        var content = new DocxBuilder().WithBody(Paragraph(Run("Use #{Title} no modelo"))).Build();

        DocxText.ReplaceParameter(template, "Title", "Código de Conduta");
        DocxTemplate.ApplyContent(template, content);
        var texts = BodyParagraphs(template.Save()).Select(Text).ToList();

        Assert.Contains("Título: Código de Conduta", texts);
        Assert.Contains("Use #{Title} no modelo", texts);
    }

    [Fact]
    public void Remove_Paragrafos_De_Amostra_E_Esvazia_O_Unico_Da_Celula()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(
            Paragraph(Run("#{") + Run("Heading1") + Run("}")),
            Paragraph(Run("fica")),
            Table(Paragraph(Run("#{Normal}")))).Build());

        int removed = DocxText.RemoveParagraphsContaining(doc, ["#{Heading1}", "#{Normal}"]);
        var saved = doc.Save();

        Assert.Equal(2, removed);
        Assert.Equal("fica", BodyText(saved));
        Assert.Single(Xml(saved).Descendants(W + "tc").Single().Elements(W + "p"));
    }

    [Fact]
    public void Expressao_Regular_Apaga_Parametros_Que_Sobraram()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("a #{") + Run("Sobra1} b #{Outra}"))).Build());

        DocxText.Replace(doc, DocxText.AnyParameter, "");

        Assert.Equal("a  b ", BodyText(doc.Save()));
    }

    [Fact]
    public void Texto_Puro_Do_Corpo_Com_Tabela_Inlines_E_Campos()
    {
        var doc = DocxDocument.Open(new DocxBuilder()
            .WithBody(
                Paragraph(Run("Primeiro parágrafo")),
                Table(Paragraph(Run("Célula"))),
                Paragraph(Run("Olá ") + TagInline("userEmail", "@E-mail") + Run(", veja ") + ItemLinkInline("document", 3, "Manual")),
                Paragraph(Field(" PAGE ", "7") + "<w:del w:id=\"1\" w:author=\"a\"><w:r><w:delText>apagado</w:delText></w:r></w:del>"),
                Paragraph(Run("Último")))
            .WithHeader("rIdH", $"""<w:hdr xmlns:w="{WordNs}"><w:p><w:r><w:t>cabeçalho</w:t></w:r></w:p></w:hdr>""")
            .WithSectionProperties("""<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/></w:sectPr>""")
            .Build());

        string text = DocxText.GetPlainText(doc);

        Assert.Equal("Primeiro parágrafo\r\nCélula\r\nOlá @E-mail, veja Manual\r\n7\r\nÚltimo", text);
        Assert.Contains("cabeçalho", DocxText.GetPlainText(doc, includeHeadersAndFooters: true));
    }

    [Fact]
    public void Texto_Puro_Da_Caixa_De_Texto_Entra_Uma_Vez()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Paragraph(Run("fora") + TextBox(Paragraph(Run("dentro"))))).Build());

        Assert.Equal("fora\r\ndentro", DocxText.GetPlainText(doc));
    }

    [Fact]
    public void Linha_Modelo_Do_Historico_Gera_Uma_Linha_Por_Versao()
    {
        var header = new[] { Paragraph(Run("Versão")), Paragraph(Run("Notas")), Paragraph(Run("Aprovadores")) };
        var template = new[] { Paragraph(Run("#{HistoryVersion}")), Paragraph(Run("#{HistoryNotes} #{Campo1}")), Paragraph(Run("#{HistoryApprovers}#{Desconhecido}")) };
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Rows(header, template), Paragraph(Run("depois"))).Build());

        var row = DocxTableRowTemplate.Take(doc, "HistoryVersion");
        Assert.NotNull(row);
        row.Append([new("HistoryVersion", "1.0"), new("HistoryNotes", "Primeira"), new("HistoryApprovers", "Ana"), new("Campo1", "x")]);
        row.Append([new("HistoryVersion", "*.*"), new("HistoryNotes", null), new("HistoryApprovers", "********")]);
        var saved = doc.Save();
        var rows = Xml(saved).Descendants(W + "tr").Select(tr => tr.Elements(W + "tc").Select(Text).ToList()).ToList();

        Assert.Equal(3, rows.Count);
        Assert.Equal(["Versão", "Notas", "Aprovadores"], rows[0]);
        Assert.Equal(["1.0", "Primeira x", "Ana"], rows[1]);
        Assert.Equal(["*.*", " ", "********"], rows[2]);
    }

    [Fact]
    public void Tabela_Que_So_Tinha_A_Linha_Modelo_E_Ficou_Sem_Linhas_Sai()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Table(Paragraph(Run("#{HistoryVersion}"))), Paragraph(Run("fim"))).Build());

        Assert.NotNull(DocxTableRowTemplate.Take(doc, "HistoryVersion"));
        var saved = doc.Save();

        Assert.Empty(Xml(saved).Descendants(W + "tbl"));
        Assert.Null(DocxTableRowTemplate.Take(DocxDocument.Open(saved), "HistoryVersion"));
    }

    [Fact]
    public void Celula_Que_Termina_Em_Tabela_Ganha_Paragrafo_Ao_Salvar()
    {
        var doc = DocxDocument.Open(new DocxBuilder().WithBody(Table(Paragraph(Run("#{X}")) + Table(Paragraph(Run("interna"))))).Build());

        DocxText.ReplaceParameter(doc, "X", "y");
        var cell = Xml(doc.Save()).Descendants(W + "tc").First();

        Assert.Equal(W + "p", cell.Elements().Last().Name);
    }
}
