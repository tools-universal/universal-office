using UniversalOffice.Docx;
using UniversalOffice.Pptx;
using UniversalOffice.Xlsx;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Manipulação básica (espelho do JS): docx insert/delete/props,
/// xlsx SetCellValue, pptx SetRunText.</summary>
public class ManipulationTests
{
    private static DocumentModel LoadSynthetic(out DocxPackage pkg)
    {
        pkg = DocxPackage.Load(Fixtures.InputBytes("synthetic.docx"));
        return DocumentReader.ReadDocument(pkg);
    }

    [Fact]
    public void Docx_InsertText_HerdaPropsDoCaractereAnterior()
    {
        var model = LoadSynthetic(out _);
        // parágrafo 2 = "Texto com negrito, itálico e ambos juntos."
        string before = ModelOps.ParaText(model.Paragraphs[2]);
        Assert.StartsWith("Texto com negrito", before);
        // insere DENTRO do run em negrito ("negrito" começa no offset 10)
        var pos = ModelOps.InsertText(model, new DocPosition(2, 13), "XY");
        Assert.Equal(new DocPosition(2, 15), pos);
        string after = ModelOps.ParaText(model.Paragraphs[2]);
        Assert.Equal(before.Length + 2, after.Length);
        Assert.Contains("negXYrito", after);
        // herdou bold do caractere anterior
        var runs = model.Paragraphs[2].Runs;
        var negRun = runs.First(r => r.Text.Contains("negXYrito"));
        Assert.True(negRun.Props.Bold);
    }

    [Fact]
    public void Docx_DeleteRange_MultiParagrafo_HerdaPropsDoSegundo()
    {
        var model = LoadSynthetic(out _);
        int paraCount = model.Paragraphs.Count;
        string p3Style = model.Paragraphs[3].Props.StyleId ?? "";
        var start = new DocPosition(2, 5);
        var end = new DocPosition(3, 7);
        string tail = ModelOps.ParaText(model.Paragraphs[3])[7..];
        ModelOps.DeleteRange(model, new DocRange(start, end));
        Assert.Equal(paraCount - 1, model.Paragraphs.Count);
        Assert.Equal("Texto" + tail, ModelOps.ParaText(model.Paragraphs[2]));
        Assert.Equal(p3Style, model.Paragraphs[2].Props.StyleId ?? "");
    }

    [Fact]
    public void Docx_ApplyRunProps_DivideRunsNoLimiteExato()
    {
        var model = LoadSynthetic(out _);
        ModelOps.ApplyRunProps(model, new DocRange(new DocPosition(1, 0), new DocPosition(1, 9)),
            new RunPropsPatch { Italic = true });
        var p = model.Paragraphs[1];
        Assert.True(p.Runs[0].Props.Italic);
        Assert.Equal(9, p.Runs[0].Text.Length);
        Assert.False(p.Runs[1].Props.Italic);
    }

    [Fact]
    public void Docx_Serialize_RoundTripDoSubset()
    {
        var model = LoadSynthetic(out var pkg);
        ModelOps.InsertText(model, new DocPosition(12, 0), "Editado: ");
        DocxSerialize.WriteDocument(pkg, model);
        var model2 = DocumentReader.ReadDocument(DocxPackage.Load(pkg.Save()));
        Assert.StartsWith("Editado: ", ModelOps.ParaText(model2.Paragraphs[12]));
        // numbering sobrevive à serialização
        Assert.Equal("bullet", model2.Paragraphs[5].Props.Numbering?.Kind);
        Assert.Equal(1, model2.Paragraphs[6].Props.Numbering?.Ilvl);
        Assert.Equal("decimal", model2.Paragraphs[9].Props.Numbering?.Kind);
    }

    [Fact]
    public void Xlsx_SetCellValue_TiposBasicos()
    {
        var pkg = XlsxPackage.Load(Fixtures.InputBytes("gaps-smoke.xlsx"));
        var wb = XlsxReader.ReadWorkbook(pkg);
        string sheetPath = wb.Sheets[0].Target!;
        var ws = XlsxReader.ReadWorksheet(pkg, sheetPath);

        XlsxSerialize.SetCellNumber(ws, "Z1", 42);
        XlsxSerialize.SetCellInlineText(ws, "Z2", "olá <mundo>");
        XlsxSerialize.SetCellSharedText(pkg, ws, "Z3", "texto compartilhado");
        XlsxSerialize.SetCellFormula(ws, "Z4", "SUM(A1:A3)");

        pkg.SetPartText(sheetPath, XlsxSerialize.UpdateWorksheetXml(pkg.GetPartText(sheetPath)!, ws));
        var pkg2 = XlsxPackage.Load(pkg.Save());
        var ws2 = XlsxReader.ReadWorksheet(pkg2, sheetPath);
        var sst = XlsxReader.ReadSharedStrings(pkg2);

        Cell CellAt(string cellRef) => ws2.Rows.SelectMany(r => r.Cells).First(c => c.Ref == cellRef);
        Assert.Equal("42", CellAt("Z1").Value);
        Assert.Equal("olá <mundo>", CellAt("Z2").InlineString?.Text);
        var z3 = CellAt("Z3");
        Assert.Equal("s", z3.Type);
        Assert.Equal("texto compartilhado", sst[int.Parse(z3.Value!)].Text);
        var z4 = CellAt("Z4");
        Assert.Equal("SUM(A1:A3)", z4.Formula);
        // cache vazio: o <v> não é emitido (mesma regra do serialize.ts JS)
        Assert.Null(z4.Value);
    }

    [Fact]
    public void Pptx_SetRunText_CirurgiaMinima()
    {
        var pkg = PptxPackage.Load(Fixtures.InputBytes("reference.pptx"));
        var pres = PptxReader.ReadPresentation(pkg);
        string slidePath = pres.Slides[0].Target!;
        string before = pkg.GetPartText(slidePath)!;
        var partsBefore = pkg.PartNames().ToDictionary(n => n, n => pkg.GetPart(n)!.ToArray());

        PptxManipulate.SetRunText(pkg, slidePath, 0, "Título <editado> & novo");

        // só a parte do slide mudou
        foreach (var name in partsBefore.Keys)
        {
            bool same = partsBefore[name].AsSpan().SequenceEqual(pkg.GetPart(name)!);
            Assert.True(name == slidePath ? !same : same, $"parte inesperadamente alterada: {name}");
        }
        // o novo texto aparece no modelo relido
        var slide = PptxReader.ReadSlide(pkg, slidePath);
        var texts = slide.Shapes.Where(s => s.TxBody is not null)
            .SelectMany(s => s.TxBody!.Paragraphs).SelectMany(p => p.Runs).Select(r => r.Text);
        Assert.Contains("Título <editado> & novo", texts);
        // cirurgia mínima: o restante do XML é idêntico fora do <a:t> alvo
        string after = pkg.GetPartText(slidePath)!;
        Assert.Equal(before[..before.IndexOf("<a:t", StringComparison.Ordinal)],
            after[..after.IndexOf("<a:t", StringComparison.Ordinal)]);
    }
}
