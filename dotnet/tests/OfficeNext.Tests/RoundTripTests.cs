using OfficeNext.Core;
using OfficeNext.Docx;
using OfficeNext.Pptx;
using OfficeNext.Xlsx;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// REGRA DE OURO: round-trip lossless do OpcPackage — partes não tocadas ficam
/// byte-idênticas e a ordem das partes é preservada.
/// </summary>
public class RoundTripTests
{
    private static void AssertLossless(IReadOnlyList<string> namesBefore, Func<string, byte[]?> getBefore,
        IReadOnlyList<string> namesAfter, Func<string, byte[]?> getAfter)
    {
        Assert.Equal(namesBefore, namesAfter); // mesmas partes, MESMA ordem
        foreach (var name in namesBefore)
            Assert.True(getBefore(name)!.AsSpan().SequenceEqual(getAfter(name)!), $"parte alterada: {name}");
    }

    [Theory]
    [InlineData("showcase.xlsx")]
    [InlineData("gaps-smoke.xlsx")]
    public void Xlsx_SaveSemEdicao_PreservaTudo(string name)
    {
        var pkg = XlsxPackage.Load(Fixtures.InputBytes(name));
        var saved = XlsxPackage.Load(pkg.Save());
        AssertLossless(pkg.PartNames(), pkg.GetPart, saved.PartNames(), saved.GetPart);
    }

    [Fact]
    public void Docx_SaveSemEdicao_PreservaTudo()
    {
        var pkg = DocxPackage.Load(Fixtures.InputBytes("synthetic.docx"));
        var saved = DocxPackage.Load(pkg.Save());
        AssertLossless(pkg.PartNames(), pkg.GetPart, saved.PartNames(), saved.GetPart);
    }

    [Theory]
    [InlineData("reference.pptx")]
    [InlineData("gaps-smoke.pptx")]
    public void Pptx_SaveSemEdicao_PreservaTudo(string name)
    {
        var pkg = PptxPackage.Load(Fixtures.InputBytes(name));
        var saved = PptxPackage.Load(pkg.Save());
        AssertLossless(pkg.PartNames(), pkg.GetPart, saved.PartNames(), saved.GetPart);
    }

    [Fact]
    public void Xlsx_EdicaoDeCelula_SoMexeNaWorksheetEditada()
    {
        var pkg = XlsxPackage.Load(Fixtures.InputBytes("showcase.xlsx"));
        var wb = XlsxReader.ReadWorkbook(pkg);
        string sheetPath = wb.Sheets[0].Target!;
        var before = pkg.PartNames().ToDictionary(n => n, n => pkg.GetPart(n)!.ToArray());

        var ws = XlsxReader.ReadWorksheet(pkg, sheetPath);
        XlsxSerialize.SetCellNumber(ws, "A1", 123.45);
        pkg.SetPartText(sheetPath, XlsxSerialize.UpdateWorksheetXml(pkg.GetPartText(sheetPath)!, ws));

        var reloaded = XlsxPackage.Load(pkg.Save());
        Assert.Equal(pkg.PartNames(), reloaded.PartNames());
        foreach (var name in before.Keys)
        {
            if (name == sheetPath) continue; // única parte que PODE mudar
            Assert.True(before[name].AsSpan().SequenceEqual(reloaded.GetPart(name)!),
                $"parte não editada mudou: {name}");
        }
        var ws2 = XlsxReader.ReadWorksheet(reloaded, sheetPath);
        var cell = ws2.Rows.First(r => r.R == 1).Cells.First(c => c.Ref == "A1");
        Assert.Equal("123.45", cell.Value);
        Assert.Null(cell.Type);
    }
}
