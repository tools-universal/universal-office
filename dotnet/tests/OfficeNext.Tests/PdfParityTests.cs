using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using OfficeNext.Export;
using OfficeNext.Pdf;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// Paridade ESTRUTURAL dos PDFs .NET vs JS (fase 2): mesmo nº de páginas,
/// MediaBox igual (±0.01pt), header %PDF válido e texto extraível (operadores
/// Tj nos content streams descomprimidos). As fixtures esperadas vêm de
/// tools/gen-parity-pdf.mjs (*.pdf.meta.json).
/// </summary>
public class PdfParityTests
{
    private static byte[] Font(string relative) =>
        File.ReadAllBytes(Path.Combine(RepoRoot.Value, relative.Replace('/', Path.DirectorySeparatorChar)));

    private static readonly Lazy<string> RepoRoot = new(() =>
    {
        var dir = new DirectoryInfo(Fixtures.Dir); // dotnet/tests/fixtures
        return dir.Parent!.Parent!.Parent!.FullName;
    });

    private static List<PdfFontSource> NarrowFonts() => new()
    {
        new PdfFontSource { Bytes = Font("sheet/packages/sheet/demo/fonts/aptos-narrow-regular.ttf") },
        new PdfFontSource { Bytes = Font("sheet/packages/sheet/demo/fonts/aptos-narrow-bold.ttf"), Bold = true },
        new PdfFontSource { Bytes = Font("sheet/packages/sheet/demo/fonts/aptos-narrow-italic.ttf"), Italic = true },
        new PdfFontSource { Bytes = Font("sheet/packages/sheet/demo/fonts/aptos-narrow-bolditalic.ttf"), Bold = true, Italic = true },
    };

    private static List<PdfFontSource> AptosFonts() => new()
    {
        new PdfFontSource { Bytes = Font("write/tools/word-lab/fonts/aptos-regular.ttf") },
        new PdfFontSource { Bytes = Font("write/tools/word-lab/fonts/aptos-bold.ttf"), Bold = true },
        new PdfFontSource { Bytes = Font("write/tools/word-lab/fonts/aptos-italic.ttf"), Italic = true },
        new PdfFontSource { Bytes = Font("write/tools/word-lab/fonts/aptos-bolditalic.ttf"), Bold = true, Italic = true },
    };

    private sealed record Meta(int Pages, List<double[]> MediaBoxes, int TjCount);

    private static Meta ExpectedMeta(string name)
    {
        string path = Path.Combine(Fixtures.Dir, "expected", $"{name}.pdf.meta.json");
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var root = doc.RootElement;
        return new Meta(
            root.GetProperty("pages").GetInt32(),
            root.GetProperty("mediaBoxes").EnumerateArray()
                .Select(b => b.EnumerateArray().Select(v => v.GetDouble()).ToArray()).ToList(),
            root.GetProperty("tjCount").GetInt32());
    }

    // ───────────── extração estrutural do PDF .NET (espelho do meta JS) ─────────────

    private static string Latin1(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length);
        foreach (byte b in bytes) sb.Append((char)b);
        return sb.ToString();
    }

    private static readonly Regex PageRe =
        new(@"/Type /Page(?!s)[^>]*?/MediaBox \[0 0 ([0-9.]+) ([0-9.]+)\]", RegexOptions.CultureInvariant);
    private static readonly Regex CountRe = new(@"/Type /Pages /Count (\d+)", RegexOptions.CultureInvariant);
    private static readonly Regex StreamRe = new(@"<<([^>]*)>>\nstream\n", RegexOptions.CultureInvariant);
    private static readonly Regex LenRe = new(@"/Length (\d+)", RegexOptions.CultureInvariant);
    // operadores de texto: Tj (um glifo) e TJ (corrida de glifos — docx-layout, como o Word)
    private static readonly Regex TjRe = new(@"(?:> Tj|\] TJ)\n", RegexOptions.CultureInvariant);

    private static (int Pages, List<double[]> MediaBoxes, int TjCount) ActualMeta(byte[] pdf)
    {
        string latin1 = Latin1(pdf);
        var mediaBoxes = PageRe.Matches(latin1)
            .Select(m => new[]
            {
                double.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture),
                double.Parse(m.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture),
            })
            .ToList();
        var countM = CountRe.Match(latin1);
        int pages = countM.Success ? int.Parse(countM.Groups[1].Value) : mediaBoxes.Count;

        int tjCount = 0;
        foreach (Match m in StreamRe.Matches(latin1))
        {
            string dict = m.Groups[1].Value;
            var lenM = LenRe.Match(dict);
            if (!lenM.Success) continue;
            int start = m.Index + m.Length;
            int len = int.Parse(lenM.Groups[1].Value);
            if (dict.Contains("/Image") || dict.Contains("/Length1")) continue; // imagem/fonte
            byte[] data = pdf.AsSpan(start, len).ToArray();
            if (dict.Contains("/FlateDecode"))
            {
                try { data = PdfWriter.Unzlib(data); }
                catch { continue; }
            }
            tjCount += TjRe.Matches(Latin1(data)).Count;
        }
        return (pages, mediaBoxes, tjCount);
    }

    private static void AssertStructuralParity(string fixtureName, byte[] pdf)
    {
        // %PDF válido + EOF
        Assert.True(pdf.Length > 8, "PDF vazio");
        Assert.Equal("%PDF-1.7", Encoding.ASCII.GetString(pdf, 0, 8));
        Assert.Contains("%%EOF", Latin1(pdf[^32..]));

        var expected = ExpectedMeta(fixtureName);
        var actual = ActualMeta(pdf);

        Assert.Equal(expected.Pages, actual.Pages);
        Assert.Equal(expected.MediaBoxes.Count, actual.MediaBoxes.Count);
        for (int i = 0; i < expected.MediaBoxes.Count; i++)
        {
            Assert.True(Math.Abs(expected.MediaBoxes[i][0] - actual.MediaBoxes[i][0]) <= 0.01,
                $"MediaBox[{i}].w: esperado {expected.MediaBoxes[i][0]}, obtido {actual.MediaBoxes[i][0]}");
            Assert.True(Math.Abs(expected.MediaBoxes[i][1] - actual.MediaBoxes[i][1]) <= 0.01,
                $"MediaBox[{i}].h: esperado {expected.MediaBoxes[i][1]}, obtido {actual.MediaBoxes[i][1]}");
        }

        // texto extraível: operadores Tj presentes e na MESMA contagem do JS
        // (layout portado 1:1 → mesmos glifos posicionados)
        Assert.True(actual.TjCount > 0, "nenhum operador Tj nos content streams");
        Assert.Equal(expected.TjCount, actual.TjCount);
    }

    [Fact]
    public void Showcase_Xlsx_Pdf_Estrutural()
    {
        byte[] pdf = XlsxPdf.ToPdf(Fixtures.InputBytes("showcase.xlsx"), new SheetPdfOptions { Fonts = NarrowFonts() });
        AssertStructuralParity("showcase.xlsx", pdf);
    }

    [Fact]
    public void Reference_Pptx_Pdf_Estrutural()
    {
        byte[] pdf = PptxPdf.ToPdf(Fixtures.InputBytes("reference.pptx"), new SlidesPdfOptions { Fonts = AptosFonts() });
        AssertStructuralParity("reference.pptx", pdf);
    }

    [Fact]
    public void GapsSmoke_Pptx_Pdf_Estrutural()
    {
        byte[] pdf = PptxPdf.ToPdf(Fixtures.InputBytes("gaps-smoke.pptx"), new SlidesPdfOptions { Fonts = AptosFonts() });
        AssertStructuralParity("gaps-smoke.pptx", pdf);
    }

    [Fact]
    public void Synthetic_Docx_Pdf_Estrutural()
    {
        byte[] pdf = DocxPdf.ToPdf(Fixtures.InputBytes("synthetic.docx"), AptosFonts());
        AssertStructuralParity("synthetic.docx", pdf);
    }

    // ───────────── unidade: writer/subset ─────────────

    [Fact]
    public void PdfWriter_XrefEValido()
    {
        var w = new PdfWriter();
        int catalog = w.Alloc();
        int pages = w.AddDict("<< /Type /Pages /Count 0 /Kids [] >>");
        w.Define(catalog, $"<< /Type /Catalog /Pages {pages} 0 R >>");
        byte[] pdf = w.Build(catalog);
        string text = Latin1(pdf);
        Assert.StartsWith("%PDF-1.7\n", text);
        Assert.Contains("xref\n0 3\n", text);
        Assert.Contains("trailer\n<< /Size 3 /Root 1 0 R >>", text);
        // offsets do xref apontam para "N 0 obj"
        var m = Regex.Match(text, @"(\d{10}) 00000 n ");
        Assert.True(m.Success);
        int off = int.Parse(m.Groups[1].Value);
        Assert.Equal("1 0 obj", text.Substring(off, 7));
    }

    [Fact]
    public void SubsetTrueType_PreservaIndicesEEncolhe()
    {
        byte[] full = Font("write/tools/word-lab/fonts/aptos-regular.ttf");
        var program = new TtfProgram(full);
        int gidA = program.GlyphId('A');
        int gidZ = program.GlyphId('z');
        byte[] subset = OfficeNext.Pdf.SubsetTrueType.Subset(full, new[] { gidA, gidZ });
        Assert.True(subset.Length < full.Length / 4,
            $"subset deveria encolher bem (obtido {subset.Length} de {full.Length})");
        // subset continua parseável e com os MESMOS gids/advances (CID = GID)
        var sub = new TtfProgram(subset);
        Assert.Equal(gidA, sub.GlyphId('A'));
        Assert.Equal(program.AdvanceWidth(gidA), sub.AdvanceWidth(gidA));
        Assert.Equal(program.UnitsPerEm, sub.UnitsPerEm);
    }

    [Fact]
    public void Raster_DecodePng_Basico()
    {
        // PNG 2x1 RGB (vermelho/verde) construído aqui mesmo (IHDR+IDAT+IEND com CRC)
        byte[] png = BuildTestPng();
        var decoded = Raster.DecodePng(png);
        Assert.NotNull(decoded);
        Assert.Equal(2, decoded!.Width);
        Assert.Equal(1, decoded.Height);
        Assert.Equal(new byte[] { 255, 0, 0, 255, 0, 255, 0, 255 }, decoded.Rgba);
    }

    private static byte[] BuildTestPng()
    {
        static uint Crc32(byte[] data)
        {
            uint crc = 0xffffffff;
            foreach (byte b in data)
            {
                crc ^= b;
                for (int k = 0; k < 8; k++) crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xedb88320 : crc >> 1;
            }
            return crc ^ 0xffffffff;
        }
        static byte[] Chunk(string type, byte[] data)
        {
            var payload = Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
            var outp = new List<byte>();
            outp.AddRange(new[] { (byte)(data.Length >> 24), (byte)(data.Length >> 16), (byte)(data.Length >> 8), (byte)data.Length });
            outp.AddRange(payload);
            uint crc = Crc32(payload);
            outp.AddRange(new[] { (byte)(crc >> 24), (byte)(crc >> 16), (byte)(crc >> 8), (byte)crc });
            return outp.ToArray();
        }
        var ihdr = new byte[] { 0, 0, 0, 2, 0, 0, 0, 1, 8, 2, 0, 0, 0 }; // 2x1, depth 8, RGB
        var scanline = new byte[] { 0, 255, 0, 0, 0, 255, 0 }; // filtro 0 + 2 pixels
        byte[] idat;
        using (var ms = new MemoryStream())
        {
            using (var z = new System.IO.Compression.ZLibStream(ms, System.IO.Compression.CompressionLevel.Fastest, true))
                z.Write(scanline);
            idat = ms.ToArray();
        }
        return new byte[] { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a }
            .Concat(Chunk("IHDR", ihdr))
            .Concat(Chunk("IDAT", idat))
            .Concat(Chunk("IEND", Array.Empty<byte>()))
            .ToArray();
    }
}
