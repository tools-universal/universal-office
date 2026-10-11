using System.Text;
using OfficeNext.DocxLayout;
using OfficeNext.Export;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// Ponto de entrada do export docx→PDF (OfficeNext.Export.DocxPdf) sobre o motor
/// de layout portado: .docx e .doc (via OfficeNext.DocBinary) com as fontes
/// instaladas; a API v1 (fontes fixas) é coberta por PdfParityTests.
/// </summary>
public class DocxPdfEngineTests
{
    private static string DocFixtures => Path.Combine(LayoutParityTests.RepoRoot.Value, "write", "packages", "docx-core", "test", "fixtures", "doc");

    public static IEnumerable<object[]> DocCases() =>
        Directory.Exists(DocFixtures)
            ? Directory.EnumerateFiles(DocFixtures, "*.doc").OrderBy(f => f, StringComparer.Ordinal).Select(f => new object[] { Path.GetFileName(f) })
            : Enumerable.Empty<object[]>();

    private static void AssertPdf(byte[] pdf)
    {
        Assert.True(pdf.Length > 8, "PDF vazio");
        Assert.Equal("%PDF-1.7", Encoding.ASCII.GetString(pdf, 0, 8));
        Assert.Contains("%%EOF", Encoding.Latin1.GetString(pdf, pdf.Length - 32, 32));
        Assert.Contains("/Type /Page ", Encoding.Latin1.GetString(pdf));
    }

    [Theory]
    [MemberData(nameof(DocCases))]
    public void Doc_Binario_Vira_Pdf(string file)
    {
        if (!LayoutParityTests.HasFonts.Value) return; // sem as fontes da máquina: não avalia
        AssertPdf(DocxPdf.ToPdf(File.ReadAllBytes(Path.Combine(DocFixtures, file))));
    }

    [Fact]
    public void Docx_Com_Fontes_Do_Sistema()
    {
        if (!LayoutParityTests.HasFonts.Value) return;
        string any = Directory.EnumerateFiles(LayoutParityTests.OracleDir, "*.docx", SearchOption.AllDirectories).OrderBy(f => f, StringComparer.Ordinal).First();
        byte[] docx = File.ReadAllBytes(any);
        byte[] pdf = DocxPdf.ToPdf(docx);
        AssertPdf(pdf);
        // o mesmo caminho do corpus lab: o nº de páginas do PDF = o do layout
        var res = DocxLayoutPipeline.Layout(docx, SystemFontProvider.Shared);
        Assert.Contains($"/Type /Pages /Count {res.Pages.Count} ", Encoding.Latin1.GetString(pdf));
    }
}
