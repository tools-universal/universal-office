using System.IO.Compression;
using System.Text;
using UniversalOffice.Export;
using ExternalFromDocx = UniversalOffice.Converter.FromDocx;
using ExternalXlsxMarkdown = UniversalOffice.Converter.XlsxMarkdown;
using ExternalXlsxHtml = UniversalOffice.Converter.XlsxHtml;
using ExternalPptxMarkdown = UniversalOffice.Converter.PptxMarkdown;
using ExternalPptxHtml = UniversalOffice.Converter.PptxHtml;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// Paridade BYTE A BYTE (string ordinal) entre os exportadores .NET e as
/// saídas do JS geradas por tools/gen-parity-fixtures.mjs. Encoding UTF-8 sem
/// BOM; fins de linha idênticos aos do JS (CSV CRLF; md/html/xml LF).
/// </summary>
public class ParityTests
{
    // ─────────────────────────── docx ───────────────────────────

    [Fact]
    public void Docx_Markdown_Synthetic()
    {
        var bytes = Fixtures.InputBytes("synthetic.docx");
        Fixtures.AssertParity(Fixtures.Expected("synthetic.docx.md"),
            ExternalFromDocx.DocxToMarkdown(bytes), "synthetic.docx.md");
    }

    [Fact]
    public void Docx_Html_Synthetic()
    {
        var bytes = Fixtures.InputBytes("synthetic.docx");
        Fixtures.AssertParity(Fixtures.Expected("synthetic.docx.html"),
            ExternalFromDocx.DocxToHtml(bytes), "synthetic.docx.html");
    }

    // ─────────────────────────── xlsx ───────────────────────────

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Csv(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.csv"),
            XlsxCsv.ToCsv(bytes), $"{name}.xlsx.csv");
    }

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Tsv(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.tsv"),
            XlsxCsv.ToTsv(bytes), $"{name}.xlsx.tsv");
    }

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Markdown(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.md"),
            ExternalXlsxMarkdown.ToMarkdown(bytes), $"{name}.xlsx.md");
    }

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Html(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.html"),
            ExternalXlsxHtml.ToHtml(bytes), $"{name}.xlsx.html");
    }

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Xml2003(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.xml2003.xml"),
            XlsxXml2003.ToXml2003(bytes), $"{name}.xlsx.xml2003.xml");
    }

    [Theory]
    [InlineData("showcase")]
    [InlineData("gaps-smoke")]
    public void Xlsx_Ods_ContentXml(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.xlsx");
        // paridade direta do content.xml gerado
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.ods.content.xml"),
            XlsxOds.BuildContentXml(bytes), $"{name}.xlsx.ods.content.xml");
        // e o .ods completo precisa ser um zip com mimetype STORED na frente
        byte[] ods = XlsxOds.ToOds(bytes);
        using var zip = new ZipArchive(new MemoryStream(ods), ZipArchiveMode.Read);
        Assert.Equal("mimetype", zip.Entries[0].FullName);
        using var reader = new StreamReader(zip.GetEntry("content.xml")!.Open(), Encoding.UTF8);
        Fixtures.AssertParity(Fixtures.Expected($"{name}.xlsx.ods.content.xml"),
            reader.ReadToEnd(), $"{name}.ods (content.xml dentro do zip)");
    }

    // ─────────────────────────── pptx ───────────────────────────

    [Theory]
    [InlineData("reference")]
    [InlineData("gaps-smoke")]
    public void Pptx_Markdown(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.pptx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.pptx.md"),
            ExternalPptxMarkdown.ToMarkdown(bytes), $"{name}.pptx.md");
    }

    [Theory]
    [InlineData("reference")]
    [InlineData("gaps-smoke")]
    public void Pptx_Html(string name)
    {
        var bytes = Fixtures.InputBytes($"{name}.pptx");
        Fixtures.AssertParity(Fixtures.Expected($"{name}.pptx.html"),
            ExternalPptxHtml.ToHtml(bytes), $"{name}.pptx.html");
    }
}
