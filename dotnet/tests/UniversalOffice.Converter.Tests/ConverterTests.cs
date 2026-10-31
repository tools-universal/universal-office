using System.Text;
using UniversalOffice.Converter;
using Xunit;

namespace OfficeConverter.Tests;

public sealed class ConverterTests
{
    private static byte[] Fixture(string name) => File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "fixtures", name));

    [Theory]
    [InlineData("synthetic.docx", DocumentFormat.Docx)]
    [InlineData("showcase.xlsx", DocumentFormat.Xlsx)]
    [InlineData("reference.pptx", DocumentFormat.Pptx)]
    public void DetectsOoxml(string name, DocumentFormat expected) => Assert.Equal(expected, FormatDetector.Detect(Fixture(name)));

    [Fact]
    public void ConvertsOoxml()
    {
        Assert.Contains("Documento sintético", Converter.ToMarkdown(Fixture("synthetic.docx")));
        Assert.Contains("##", Converter.ToMarkdown(Fixture("showcase.xlsx")));
        Assert.Contains("## Slide 1", Converter.ToMarkdown(Fixture("reference.pptx")));
    }

    [Fact]
    public void ConvertsPdf()
    {
        byte[] pdf = SimplePdf();
        Assert.Equal(DocumentFormat.Pdf, FormatDetector.Detect(pdf));
        string markdown = Converter.ToMarkdown(pdf);
        Assert.Contains("PDF heading", markdown);
        Assert.Contains("Hello PDF", markdown);
        Assert.Contains("<!doctype html>", Converter.Convert(pdf, new ConversionRequest("html")).Text);
        Assert.Equal(pdf, Converter.Convert(pdf, new ConversionRequest("pdf")).Bytes);
    }

    [Fact]
    public async Task RegistryIsExtensible()
    {
        var converter = UniversalOffice.Converter.OfficeConverter.CreateDefault().Register("docx", "text", (_, _, _) =>
            ValueTask.FromResult(new ConversionResult("text/plain", Text: "plain text")));
        Assert.True(converter.CanConvert("docx", "text"));
        var result = await converter.ConvertAsync(Fixture("synthetic.docx"), new ConversionRequest("text"));
        Assert.Equal("plain text", result.Text);
    }

    private static byte[] SimplePdf()
    {
        string[] objects =
        [
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            "<< /Length 74 >>\nstream\nBT /F1 24 Tf 72 720 Td (PDF heading) Tj 0 -40 Td /F1 12 Tf (Hello PDF) Tj ET\nendstream",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ];
        var output = new StringBuilder("%PDF-1.4\n");
        var offsets = new List<int> { 0 };
        for (int index = 0; index < objects.Length; index++)
        {
            offsets.Add(Encoding.ASCII.GetByteCount(output.ToString()));
            output.Append($"{index + 1} 0 obj\n{objects[index]}\nendobj\n");
        }
        int xref = Encoding.ASCII.GetByteCount(output.ToString());
        output.Append($"xref\n0 {objects.Length + 1}\n0000000000 65535 f \n");
        foreach (int offset in offsets.Skip(1)) output.Append($"{offset:0000000000} 00000 n \n");
        output.Append($"trailer\n<< /Size {objects.Length + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        return Encoding.ASCII.GetBytes(output.ToString());
    }
}
