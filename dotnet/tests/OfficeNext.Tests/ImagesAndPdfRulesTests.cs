using System.IO.Compression;
using System.Text;
using OfficeNext.Docx;
using OfficeNext.DocxLayout;
using OfficeNext.Pdf;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// Decodificadores de imagem, números do PDF, ids de glifo, hiperlinks, WordArt e
/// nomes vindos do arquivo — espelho de images.test.ts / engine.test.ts /
/// pdf writer.test.ts (arquivos sintéticos mínimos, sem dados de cliente).
/// </summary>
public class ImagesAndPdfRulesTests
{
    private static byte[] Px(Rgba img, int x, int y) => img.Data.Skip((y * img.Width + x) * 4).Take(4).ToArray();

    // ── PNG ──
    private static readonly uint[] CrcTable = Enumerable.Range(0, 256).Select(n =>
    {
        uint c = (uint)n;
        for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xedb88320 ^ (c >> 1) : c >> 1;
        return c;
    }).ToArray();
    private static uint Crc(IEnumerable<byte> b) { uint c = 0xffffffff; foreach (var v in b) c = CrcTable[(c ^ v) & 0xff] ^ (c >> 8); return c ^ 0xffffffff; }
    private static byte[] Be32(uint n) => new[] { (byte)(n >> 24), (byte)(n >> 16), (byte)(n >> 8), (byte)n };
    private static byte[] Chunk(string type, byte[] data)
    {
        var td = Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
        return Be32((uint)data.Length).Concat(td).Concat(Be32(Crc(td))).ToArray();
    }
    private static byte[] Zlib(byte[] raw)
    {
        var ms = new MemoryStream();
        using (var z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(raw);
        return ms.ToArray();
    }
    private static byte[] Png(int w, int h, int depth, int ctype, byte[][] rows, byte[]? extra = null)
    {
        var raw = rows.SelectMany(r => new byte[] { 0 }.Concat(r)).ToArray();
        return new byte[] { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a }
            .Concat(Chunk("IHDR", Be32((uint)w).Concat(Be32((uint)h)).Concat(new byte[] { (byte)depth, (byte)ctype, 0, 0, 0 }).ToArray()))
            .Concat(extra ?? Array.Empty<byte>()).Concat(Chunk("IDAT", Zlib(raw))).Concat(Chunk("IEND", Array.Empty<byte>())).ToArray();
    }

    [Fact]
    public void Gif_Com_Tamanho_De_Codigo_Invalido_Devolve_Null()
    {
        byte[] gif = { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255,
            0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 30, 2, 0x44, 0x01, 0, 0x3b };
        Assert.Null(Images.DecodeGif(gif));
    }

    [Fact]
    public void Png_Cinza_2_Bits_Trns_Compara_O_Valor_Cru()
    {
        var img = Images.DecodePng(Png(2, 1, 2, 0, new[] { new byte[] { 0b01100000 } }, Chunk("tRNS", new byte[] { 0, 1 })))!;
        Assert.Equal(0, Px(img, 0, 0)[3]);
        Assert.Equal(new byte[] { 170, 170, 170, 255 }, Px(img, 1, 0));
    }

    [Fact]
    public void Png_Rgb_Trns_Torna_A_Cor_Chave_Transparente()
    {
        var img = Images.DecodePng(Png(2, 1, 8, 2, new[] { new byte[] { 255, 0, 0, 0, 0, 255 } }, Chunk("tRNS", new byte[] { 0, 255, 0, 0, 0, 0 })))!;
        Assert.Equal(new byte[] { 255, 0, 0, 0 }, Px(img, 0, 0));
        Assert.Equal(new byte[] { 0, 0, 255, 255 }, Px(img, 1, 0));
    }

    private static byte[] Bmp(int bpp, int comp, uint[] masks, byte[] pixels)
    {
        int hdr = 40 + masks.Length * 4, off = 14 + hdr;
        byte[] Le32(long v) => BitConverter.GetBytes((uint)v);
        byte[] Le16(int v) => BitConverter.GetBytes((ushort)v);
        return new byte[] { 0x42, 0x4d }.Concat(Le32(off + pixels.Length)).Concat(new byte[4]).Concat(Le32(off))
            .Concat(Le32(40)).Concat(Le32(2)).Concat(Le32(1)).Concat(Le16(1)).Concat(Le16(bpp)).Concat(Le32(comp)).Concat(Le32(pixels.Length)).Concat(new byte[16])
            .Concat(masks.SelectMany(m => Le32(m))).Concat(pixels).ToArray();
    }

    [Fact]
    public void Bmp_16_Bits_555()
    {
        var img = Images.DecodeBmp(Bmp(16, 0, Array.Empty<uint>(), new byte[] { 0x00, 0x7c, 0x1f, 0x00 }))!;
        Assert.Equal(new byte[] { 255, 0, 0, 255 }, Px(img, 0, 0));
        Assert.Equal(new byte[] { 0, 0, 255, 255 }, Px(img, 1, 0));
    }

    [Fact]
    public void Bmp_32_Bits_Bitfields_Segue_As_Mascaras()
    {
        var img = Images.DecodeBmp(Bmp(32, 3, new uint[] { 0x00ff0000, 0x0000ff00, 0x000000ff }, new byte[] { 10, 20, 30, 0, 40, 50, 60, 0 }))!;
        Assert.Equal(new byte[] { 30, 20, 10, 255 }, Px(img, 0, 0));
        Assert.Equal(new byte[] { 60, 50, 40, 255 }, Px(img, 1, 0));
    }

    /// <summary>TIFF little endian de uma faixa: (tag, tipo, valores) + pixels.</summary>
    private static byte[] Tiff((int Tag, int Type, int[] Vals)[] entries, byte[] pixels)
    {
        int n = entries.Length;
        int dataOff = 8 + 2 + n * 12 + 4;
        var extra = new List<byte>();
        var ent = new List<byte>();
        var fix = new List<int>();
        byte[] Le16(int v) => BitConverter.GetBytes((ushort)v);
        byte[] Le32(int v) => BitConverter.GetBytes(v);
        foreach (var (tag, type, vals) in entries)
        {
            int size = (type == 3 ? 2 : 4) * vals.Length;
            ent.AddRange(Le16(tag)); ent.AddRange(Le16(type)); ent.AddRange(Le32(vals.Length));
            if (tag == 273) { fix.Add(ent.Count); ent.AddRange(new byte[4]); continue; }
            if (size <= 4)
            {
                var v = vals.SelectMany(x => type == 3 ? Le16(x) : Le32(x)).ToList();
                while (v.Count < 4) v.Add(0);
                ent.AddRange(v);
            }
            else
            {
                ent.AddRange(Le32(dataOff + extra.Count));
                extra.AddRange(vals.SelectMany(x => type == 3 ? Le16(x) : Le32(x)));
            }
        }
        int pix = dataOff + extra.Count;
        foreach (int f in fix) { var b = Le32(pix); for (int i = 0; i < 4; i++) ent[f + i] = b[i]; }
        return new byte[] { 0x49, 0x49, 42, 0, 8, 0, 0, 0 }.Concat(Le16(n)).Concat(ent).Concat(new byte[4]).Concat(extra).Concat(pixels).ToArray();
    }

    [Fact]
    public void Tiff_YCbCr_Subamostrado_Vira_Rgb()
    {
        var t = Tiff(new[] { (256, 3, new[] { 2 }), (257, 3, new[] { 2 }), (258, 3, new[] { 8, 8, 8 }), (259, 3, new[] { 1 }), (262, 3, new[] { 6 }), (273, 4, new[] { 0 }),
            (277, 3, new[] { 3 }), (278, 3, new[] { 2 }), (279, 4, new[] { 6 }), (284, 3, new[] { 1 }), (530, 3, new[] { 2, 2 }) }, new byte[] { 76, 76, 76, 76, 85, 255 });
        var img = Images.DecodeTiff(t)!;
        foreach (var (x, y) in new[] { (0, 0), (1, 0), (0, 1), (1, 1) })
        {
            var p = Px(img, x, y);
            Assert.True(p[0] > 245 && p[1] < 10 && p[2] < 10 && p[3] == 255, string.Join(",", p));
        }
    }

    [Fact]
    public void Tiff_16_Bits_Com_Preditor_Desfaz_A_Diferenca()
    {
        var t = Tiff(new[] { (256, 3, new[] { 2 }), (257, 3, new[] { 1 }), (258, 3, new[] { 16 }), (259, 3, new[] { 1 }), (262, 3, new[] { 1 }), (273, 4, new[] { 0 }),
            (277, 3, new[] { 1 }), (278, 3, new[] { 1 }), (279, 4, new[] { 4 }), (284, 3, new[] { 1 }), (317, 3, new[] { 2 }) }, new byte[] { 0x00, 0x10, 0x00, 0x01 });
        var img = Images.DecodeTiff(t)!;
        Assert.Equal(0x10, Px(img, 0, 0)[0]);
        Assert.Equal(0x11, Px(img, 1, 0)[0]);
    }

    [Fact]
    public void Jpeg_Preenchimento_E_Sof_Truncado()
    {
        Assert.Equal(new JpegInfo(3, 4, 3, false), Images.JpegInfo(new byte[] { 0xff, 0xd8, 0xff, 0xff, 0xc0, 0, 11, 8, 0, 4, 0, 3, 3, 0, 0, 0, 0 }));
        Assert.Null(Images.JpegInfo(new byte[] { 0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 4 }));
    }

    [Fact]
    public void Imagem_Que_Quebra_O_Decodificador_So_Fica_De_Fora()
    {
        byte[] bad = { 0x42, 0x4d, 1, 2, 3 }; // "BM" truncado
        Assert.ThrowsAny<Exception>(() => Images.DecodeBmp(bad));
        var res = new LayoutResult();
        var page = new LayoutPage { WidthTw = 11906, HeightTw = 16838 };
        page.Items.Add(new ImageItem { X = 1440, Y = 1440, W = 1440, H = 1440, Image = new InlineImage { Data = bad } });
        res.Pages.Add(page);
        byte[] pdf = PdfRenderer.RenderPdf(res);
        Assert.Equal("%PDF-1.7", Encoding.ASCII.GetString(pdf, 0, 8));
    }

    // ── números do PDF e ids de glifo ──

    [Fact]
    public void Fmt_Nunca_Escreve_NaN_Infinity_Nem_Expoente()
    {
        Assert.Equal("0", PdfNum.Fmt(double.NaN));
        Assert.Equal("1000000000", PdfNum.Fmt(double.PositiveInfinity));
        Assert.Equal("-1000000000", PdfNum.Fmt(-1e30));
        Assert.Equal("1000000000", PdfNum.Fmt(1e21));
        var doc = new PdfDocument(compress: false);
        var page = doc.AddPage(595.32, 841.92);
        page.FillRect(double.NaN, double.PositiveInfinity, 1e21, double.NegativeInfinity, new PdfColor(0, 0, 0));
        string s = Encoding.Latin1.GetString(doc.Build());
        Assert.DoesNotMatch(@"NaN|Infinity|\dE[+-]?\d|\de[+-]\d", s);
    }

    private sealed class BigGidProgram : IFontProgram
    {
        public int UnitsPerEm => 2048;
        public int GlyphId(int codePoint) => codePoint == 0x41 ? 0x10000 : 3;
        public int AdvanceWidth(int glyphId) => 1000;
        public (int XMin, int YMin, int XMax, int YMax)? FontBBox => null;
        public int? Ascender => null;
        public int? Descender => null;
        public double? ItalicAngle => null;
    }

    [Fact]
    public void Glyph_Id_Fora_De_16_Bits_Vira_Notdef()
    {
        var doc = new PdfDocument(compress: false);
        byte[] bytes = File.ReadAllBytes(Path.Combine(LayoutParityTests.RepoRoot.Value, "shared", "fonts", "files", "carlito-regular.ttf"));
        var font = doc.EmbedFont("Carlito", bytes, new BigGidProgram());
        Assert.Equal(0, font.Encode(0x41).Gid);
        Assert.Equal(3, font.Encode(0x42).Gid);
    }

    // ── hiperlinks (oráculo hlink) ──

    private const string HStyle = "<w:style w:type=\"character\" w:styleId=\"Hyperlink\"><w:name w:val=\"Hyperlink\"/><w:basedOn w:val=\"DefaultParagraphFont\"/><w:rPr><w:color w:val=\"0563C1\"/><w:u w:val=\"single\"/></w:rPr></w:style>";

    private static (string Color, bool Underlined) Link(string runs, string styles = HStyle)
    {
        string body = EngineRulesTests.P($"<w:hyperlink w:anchor=\"alvo\">{runs}</w:hyperlink>")
            + EngineRulesTests.P("<w:bookmarkStart w:id=\"0\" w:name=\"alvo\"/>" + EngineRulesTests.R("Alvo") + "<w:bookmarkEnd w:id=\"0\"/>");
        var res = EngineRulesTests.Run(EngineRulesTests.Docx(body, styles: styles));
        var g = res.Pages[0].Items.OfType<GlyphRunItem>().First(x => x.Text.StartsWith("Link", StringComparison.Ordinal));
        // o sublinhado sai como retângulo (Underline.cs) — ou linha, nos casos antigos
        bool underlined = res.Pages[0].Items.OfType<LineItem>().Any(l => Math.Abs(l.Y1 - g.Y) < 100)
            || res.Pages[0].Items.OfType<RectItem>().Any(r => r.Y >= g.Y - 20 && r.Y - g.Y < 100 && r.H < 60);
        return (g.Color, underlined);
    }

    [Fact]
    public void Hyperlink_Sozinho_Nao_Formata() => Assert.Equal(("000000", false), Link(EngineRulesTests.R("Link simples")));

    [Fact]
    public void Hyperlink_Com_Estilo() => Assert.Equal(("0563C1", true), Link(EngineRulesTests.R("Link estilo", "<w:rStyle w:val=\"Hyperlink\"/>")));

    [Fact]
    public void Hyperlink_U_None_Tira_O_Sublinhado() => Assert.Equal(("0563C1", false), Link(EngineRulesTests.R("Link sem", "<w:rStyle w:val=\"Hyperlink\"/><w:u w:val=\"none\"/>")));

    [Fact]
    public void Hyperlink_Cor_Direta() => Assert.Equal(("FF0000", false), Link(EngineRulesTests.R("Link vermelho", "<w:color w:val=\"FF0000\"/>")));

    [Fact]
    public void Hyperlink_Estilo_Ausente() => Assert.Equal(("000000", false), Link(EngineRulesTests.R("Link ausente", "<w:rStyle w:val=\"Hyperlink\"/>"), ""));

    // ── WordArt VML ──

    [Fact]
    public void WordArt_Vml_Mantem_Espacamento_Zero()
    {
        string shape = "<w:r><w:pict><v:shape xmlns:v=\"urn:schemas-microsoft-com:vml\" id=\"w1\" type=\"#_x0000_t136\" style=\"position:absolute;margin-left:0;margin-top:0;width:300pt;height:100pt;z-index:-1\" fillcolor=\"silver\" stroked=\"f\"><v:textpath style=\"font-family:&quot;Carlito&quot;;font-size:1pt\" string=\"RASCUNHO\"/></v:shape></w:pict></w:r>";
        var docx = EngineRulesTests.Docx(EngineRulesTests.P(shape) + EngineRulesTests.P(EngineRulesTests.R("Corpo")),
            styles: "", defaultsPPr: "<w:spacing w:after=\"400\" w:line=\"360\" w:lineRule=\"auto\"/>");
        var full = FullDocReader.ReadFullDocument(DocxPackage.Load(docx));
        var pb = (ParagraphBlock)full.Blocks[0];
        var tb = pb.Paragraph.Runs.First(r => r.Textbox?.WordArt is not null).Textbox!;
        var sp = DocContext.DirectPPr(tb.Paras[0]).Spacing!;
        Assert.Equal((0.0, 0.0, 240.0, "auto"), (sp.Before ?? -1, sp.After ?? -1, sp.Line ?? -1, sp.LineRule));
    }

    // ── nomes vindos do arquivo ──

    [Fact]
    public void Nomes_Constructor_E_Proto_Nao_Quebram_Nem_Colorem()
    {
        string rpr = "<w:rStyle w:val=\"__proto__\"/><w:rFonts w:ascii=\"constructor\" w:hAnsi=\"constructor\"/><w:highlight w:val=\"constructor\"/><w:color w:val=\"auto\" w:themeColor=\"constructor\"/>";
        var res = EngineRulesTests.Run(EngineRulesTests.Docx(EngineRulesTests.P(EngineRulesTests.R("Texto", rpr), "<w:pStyle w:val=\"toString\"/>")));
        var g = res.Pages[0].Items.OfType<GlyphRunItem>().First(x => x.Text == "Texto");
        Assert.Equal("000000", g.Color);
        Assert.DoesNotContain(res.Pages[0].Items, i => i is RectItem);
    }

    // ── cores do DrawingML (medido no Word: write/tools/image-lab/recolor-probe.mjs) ──
    [Fact]
    public void DrawingColorShadeTintLinearAndSatModHsl()
    {
        var theme = new Theme();
        theme.Colors["accent1"] = "4472C4";
        theme.Colors["accent2"] = "E97132";
        // contorno padrão das formas do Word: accent1 shade 50%
        Assert.Equal("2F528F", Resolve.ResolveDrawingColor("@accent1|shade=50000", theme));
        Assert.Equal("BA4609", Resolve.ResolveDrawingColor("@accent2|shade=45000,satMod=135000", theme));
        Assert.Equal("2F5597", Resolve.ResolveDrawingColor("4472C4|lumMod=75000", theme));
    }
}
