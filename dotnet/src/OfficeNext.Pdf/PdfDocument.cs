using System.Globalization;

namespace OfficeNext.Pdf;

/// <summary>Cor RGB em componentes 0..1.</summary>
public readonly record struct PdfColor(double R, double G, double B)
{
    public static PdfColor Rgb255(int r, int g, int b) => new(r / 255.0, g / 255.0, b / 255.0);

    /// <summary>Aceita "RRGGBB" (com ou sem #).</summary>
    public static PdfColor Hex(string hex)
    {
        string h = hex.StartsWith('#') ? hex[1..] : hex;
        return Rgb255(
            int.Parse(h.AsSpan(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(h.AsSpan(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(h.AsSpan(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
    }
}

/// <summary>Um glifo já posicionado: gid (=CID), code point (p/ ToUnicode) e coords em pt.</summary>
public readonly struct PlacedGlyph
{
    public required int Gid { get; init; }
    public required int CodePoint { get; init; }
    /// <summary>x absoluto na página, em pontos (origem no canto superior esquerdo).</summary>
    public required double XPt { get; init; }
    /// <summary>y da baseline medido a partir do TOPO da página, em pontos.</summary>
    public required double BaselineFromTopPt { get; init; }
}

/// <summary>Imagem embutida (XObject) pronta para desenhar.</summary>
public sealed record PdfImage(string ResourceName, int ObjNum);

/// <summary>Formatação numérica dos operadores PDF (até 3 casas, sem zeros supérfluos).</summary>
public static class PdfNum
{
    public static string Fmt(double n)
    {
        double r = Math.Floor(n * 1000 + 0.5) / 1000; // Math.round do JS
        if (r == 0) return "0"; // inclusive -0
        return r.ToString("0.###", CultureInfo.InvariantCulture);
    }
}

/// <summary>
/// Página PDF — porta de @wordnext/pdf document.ts. As coordenadas de entrada
/// usam origem no canto SUPERIOR esquerdo (y cresce para baixo, como no canvas);
/// a conversão para o sistema do PDF (origem inferior esquerda) é feita aqui.
/// </summary>
public sealed class PdfPage
{
    public ByteBuilder Content { get; } = new(4096);
    public double WidthPt { get; }
    public double HeightPt { get; }

    public PdfPage(double widthPt, double heightPt)
    {
        WidthPt = widthPt;
        HeightPt = heightPt;
    }

    private double FromTop(double yTop) => HeightPt - yTop;

    /// <summary>Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo.</summary>
    public void FillRect(double xPt, double yTopPt, double wPt, double hPt, PdfColor color)
    {
        double y = FromTop(yTopPt + hPt); // canto inferior em coords PDF
        Content.Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" rg\n")
            .Num(xPt).Byte((byte)' ').Num(y).Byte((byte)' ').Num(wPt).Byte((byte)' ').Num(hPt).Str(" re f\n");
    }

    /// <summary>Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo.</summary>
    public void Line(
        double x0, double y0Top, double x1, double y1Top,
        PdfColor color, double widthPt, IReadOnlyList<double>? dash = null)
    {
        var c = Content;
        c.Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" RG\n")
         .Num(widthPt).Str(" w\n");
        if (dash is { Count: > 0 })
        {
            c.Byte((byte)'[');
            for (int i = 0; i < dash.Count; i++)
            {
                if (i > 0) c.Byte((byte)' ');
                c.Num(dash[i]);
            }
            c.Str("] 0 d\n");
        }
        else c.Str("[] 0 d\n");
        c.Num(x0).Byte((byte)' ').Num(FromTop(y0Top)).Str(" m ")
         .Num(x1).Byte((byte)' ').Num(FromTop(y1Top)).Str(" l S\n");
    }

    /// <summary>
    /// Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
    /// recebe sua própria matriz de texto (posição absoluta), reproduzindo
    /// exatamente as posições calculadas pelo layout.
    /// </summary>
    public void Glyphs(EmbeddedFont font, double sizePt, PdfColor color, IReadOnlyList<PlacedGlyph> glyphs)
    {
        if (glyphs.Count == 0) return;
        var c = Content;
        c.Str("BT\n/").Str(font.ResourceName).Byte((byte)' ').Num(sizePt).Str(" Tf\n")
         .Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" rg\n");
        foreach (var g in glyphs)
        {
            double y = FromTop(g.BaselineFromTopPt);
            c.Str("1 0 0 1 ").Num(g.XPt).Byte((byte)' ').Num(y).Str(" Tm ").GlyphHex(g.Gid).Str(" Tj\n");
        }
        c.Str("ET\n");
    }

    /// <summary>Desenha uma imagem já embutida. (x,y) = canto superior esquerdo.</summary>
    public void DrawImage(PdfImage img, double xPt, double yTopPt, double wPt, double hPt)
    {
        double y = FromTop(yTopPt + hPt);
        Content.Str("q\n").Num(wPt).Str(" 0 0 ").Num(hPt).Byte((byte)' ')
            .Num(xPt).Byte((byte)' ').Num(y).Str(" cm\n/").Str(img.ResourceName).Str(" Do\nQ\n");
    }
}

/// <summary>Documento PDF: fontes/imagens compartilhadas + páginas, montado em Build().</summary>
public sealed class PdfDocument
{
    private readonly PdfWriter _writer;
    private readonly List<EmbeddedFont> _fonts = new();
    private readonly List<PdfImage> _images = new();
    private readonly List<PdfPage> _pages = new();

    public PdfDocument(bool compress = true)
    {
        _writer = new PdfWriter(compress);
    }

    /// <summary>Embute uma fonte TrueType (bytes crus + consultas de métrica).</summary>
    public EmbeddedFont EmbedFont(string name, byte[] bytes, IFontProgram program)
    {
        var f = new EmbeddedFont(_fonts.Count, name, bytes, program);
        _fonts.Add(f);
        return f;
    }

    /// <summary>Embute um JPEG (baseline) diretamente via DCTDecode.</summary>
    public PdfImage EmbedJpeg(byte[] bytes, int widthPx, int heightPx)
    {
        int objNum = _writer.AddStream(
            $"/Type /XObject /Subtype /Image /Width {widthPx} /Height {heightPx} " +
            "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode",
            bytes,
            allowCompress: false); // já comprimido
        var handle = new PdfImage($"Im{_images.Count}", objNum);
        _images.Add(handle);
        return handle;
    }

    /// <summary>
    /// Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
    /// trivial (algum pixel &lt; 255), o canal vira um /SMask DeviceGray — PNGs com
    /// transparência preservam o recorte no PDF.
    /// </summary>
    public PdfImage EmbedRgba(byte[] rgba, int widthPx, int heightPx) =>
        EmbedRgba(PrepareRgba(rgba, widthPx, heightPx, _writer.CompressEnabled));

    /// <summary>Imagem RGBA já separada em RGB(+SMask) e comprimida — preparável em paralelo.</summary>
    public sealed class PreparedRgba
    {
        internal PdfWriter.PreparedStream Rgb;
        internal PdfWriter.PreparedStream? Alpha;
        internal int W;
        internal int H;
    }

    /// <summary>Split RGB/alpha + deflate (thread-safe; não toca o writer).</summary>
    public static PreparedRgba PrepareRgba(byte[] rgba, int widthPx, int heightPx, bool compress = true)
    {
        var rgb = new byte[widthPx * heightPx * 3];
        var alpha = new byte[widthPx * heightPx];
        bool hasAlpha = false;
        for (int i = 0, j = 0, k = 0; i < rgba.Length; i += 4, j += 3, k++)
        {
            rgb[j] = rgba[i];
            rgb[j + 1] = rgba[i + 1];
            rgb[j + 2] = rgba[i + 2];
            byte a = rgba[i + 3];
            alpha[k] = a;
            if (a != 255) hasAlpha = true;
        }
        return new PreparedRgba
        {
            Rgb = PdfWriter.Prepare(rgb, compress),
            Alpha = hasAlpha ? PdfWriter.Prepare(alpha, compress) : null,
            W = widthPx,
            H = heightPx,
        };
    }

    public PdfImage EmbedRgba(PreparedRgba p)
    {
        string smask = "";
        if (p.Alpha is { } alphaPs)
        {
            int smaskNum = _writer.AddStreamPrepared(
                $"/Type /XObject /Subtype /Image /Width {p.W} /Height {p.H} " +
                "/ColorSpace /DeviceGray /BitsPerComponent 8",
                alphaPs);
            smask = $" /SMask {smaskNum} 0 R";
        }
        int objNum = _writer.AddStreamPrepared(
            $"/Type /XObject /Subtype /Image /Width {p.W} /Height {p.H} " +
            $"/ColorSpace /DeviceRGB /BitsPerComponent 8{smask}",
            p.Rgb);
        var handle = new PdfImage($"Im{_images.Count}", objNum);
        _images.Add(handle);
        return handle;
    }

    public PdfPage AddPage(double widthPt, double heightPt)
    {
        var p = new PdfPage(widthPt, heightPt);
        _pages.Add(p);
        return p;
    }

    /// <summary>Anexa uma página desenhada fora do documento (render paralelo).</summary>
    public void AddPage(PdfPage page) => _pages.Add(page);

    /// <summary>Serializa o PDF completo.</summary>
    public byte[] Build()
    {
        var w = _writer;

        // hot path: subset+deflate das fontes e deflate dos content streams são
        // independentes — prepara em PARALELO; a alocação de objetos continua
        // sequencial e determinística.
        var preparedFonts = new EmbeddedFont.PreparedFontFile[_fonts.Count];
        var contentBytes = new byte[_pages.Count][];
        for (int i = 0; i < _pages.Count; i++) contentBytes[i] = _pages[i].Content.ToArray();
        var preparedContents = new PdfWriter.PreparedStream[_pages.Count];
        int jobs = _fonts.Count + _pages.Count;
        if (jobs > 1)
        {
            Parallel.For(0, jobs, i =>
            {
                if (i < _fonts.Count) preparedFonts[i] = _fonts[i].PrepareFontFile(w.CompressEnabled);
                else preparedContents[i - _fonts.Count] = PdfWriter.Prepare(contentBytes[i - _fonts.Count], w.CompressEnabled);
            });
        }
        else
        {
            for (int i = 0; i < _fonts.Count; i++) preparedFonts[i] = _fonts[i].PrepareFontFile(w.CompressEnabled);
            for (int i = 0; i < _pages.Count; i++) preparedContents[i] = PdfWriter.Prepare(contentBytes[i], w.CompressEnabled);
        }

        // fontes
        var fontRefs = _fonts.Select((f, i) => (f.ResourceName, Ref: f.Write(w, preparedFonts[i]))).ToList();
        string fontDict = fontRefs.Count > 0
            ? $"/Font << {string.Join(" ", fontRefs.Select(f => $"/{f.ResourceName} {f.Ref} 0 R"))} >>"
            : "";
        string xobjDict = _images.Count > 0
            ? $"/XObject << {string.Join(" ", _images.Select(i => $"/{i.ResourceName} {i.ObjNum} 0 R"))} >>"
            : "";
        string resources = $"<< {fontDict} {xobjDict} >>";

        int catalog = w.Alloc();
        int pagesNode = w.Alloc();

        var pageRefs = new List<int>();
        for (int i = 0; i < _pages.Count; i++)
        {
            var page = _pages[i];
            int contentNum = w.AddStreamPrepared("", preparedContents[i]);
            int pageNum = w.AddDict(
                $"<< /Type /Page /Parent {pagesNode} 0 R " +
                $"/MediaBox [0 0 {PdfNum.Fmt(page.WidthPt)} {PdfNum.Fmt(page.HeightPt)}] " +
                $"/Resources {resources} /Contents {contentNum} 0 R >>");
            pageRefs.Add(pageNum);
        }

        w.Define(pagesNode,
            $"<< /Type /Pages /Count {pageRefs.Count} /Kids [{string.Join(" ", pageRefs.Select(r => $"{r} 0 R"))}] >>");
        w.Define(catalog, $"<< /Type /Catalog /Pages {pagesNode} 0 R >>");
        return w.Build(catalog);
    }
}
