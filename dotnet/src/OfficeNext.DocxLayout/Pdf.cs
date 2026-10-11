using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using OfficeNext.Core;
using OfficeNext.Docx;
using OfficeNext.Pdf;

namespace OfficeNext.DocxLayout;

/// <summary>Opções do renderizador PDF (porta de PdfRenderOptions).</summary>
public sealed class PdfRenderOptions
{
    /// <summary>comprime os content streams (padrão true)</summary>
    public bool? Compress;
    /// <summary>decodificador de imagens extra (ex.: EMF/SVG/TIFF por outra via).</summary>
    public Func<InlineImage, Rgba?>? DecodeImage;
}

/// <summary>
/// Pinta a árvore de layout num PDF (o mesmo desenho do canvas) — porta de
/// docx-layout/src/pdf.ts: glifos posicionados um a um (fonte embutida em
/// subconjunto), retângulos, linhas, caminhos, imagens (JPEG direto;
/// PNG/GIF/BMP/TIFF decodificados) e recortes.
/// </summary>
public static class PdfRenderer
{
    private const double T = 20; // twips por ponto

    /// <summary>FontProgram do JS: unitsPerEm/ascender/descender + glyphId com o recuo F0xx.</summary>
    private sealed class FaceProgram : IFontProgram
    {
        private readonly OfficeNext.Layout.ILayoutFont _sf;
        public FaceProgram(OfficeNext.Layout.ILayoutFont sf) { _sf = sf; }
        public int UnitsPerEm => (int)_sf.Metrics.UnitsPerEm;
        public int GlyphId(int cp)
        {
            int g = _sf.GlyphId(cp);
            return g == 0 && cp >= 0xf000 && cp <= 0xf0ff ? _sf.GlyphId(cp - 0xf000) : g;
        }
        public int AdvanceWidth(int glyphId) => (int)_sf.AdvanceWidth(glyphId);
        public (int XMin, int YMin, int XMax, int YMax)? FontBBox => null;
        public int? Ascender => (int)_sf.Metrics.Ascender;
        public int? Descender => (int)_sf.Metrics.Descender;
        public double? ItalicAngle => null;
    }

    /// <summary>hexColor do JS (parseInt por par; inválido vira NaN como no JS).</summary>
    private static PdfColor HexColor(string hex)
    {
        string h = hex.Replace("#", "");
        double P(int i) => JsNumber.ParseInt(i < h.Length ? h.Substring(i, Math.Min(2, h.Length - i)) : "", 16);
        return new PdfColor(P(0) / 255, P(2) / 255, P(4) / 255);
    }

    private static readonly Regex Hex6 = new("^[0-9A-Fa-f]{6}\\z", RegexOptions.CultureInvariant);
    private static readonly Regex Ws = new(@"\s+", RegexOptions.CultureInvariant);

    public static byte[] RenderPdf(LayoutResult result, PdfRenderOptions? opts = null)
    {
        opts ??= new PdfRenderOptions();
        var doc = new PdfDocument(opts.Compress ?? true);
        var fonts = new Dictionary<string, EmbeddedFont?>(StringComparer.Ordinal);
        var images = new ConditionalWeakTable<InlineImage, PdfImageBox>();

        EmbeddedFont? FontFor(FontFace face)
        {
            if (!fonts.TryGetValue(face.Key, out var f))
            {
                if (face.Bytes is null) f = null;
                else
                {
                    string name = Ws.Replace(face.Family, "") + (face.Bold ? "-Bold" : "") + (face.Italic ? "-Italic" : "");
                    f = doc.EmbedFont(name, face.Bytes, new FaceProgram(face.Font));
                }
                fonts[face.Key] = f;
            }
            return f;
        }

        PdfImage? ImageFor(InlineImage img)
        {
            if (images.TryGetValue(img, out var box)) return box.Image;
            PdfImage? h = null;
            var data = img.Data;
            // decodificador que falha (arquivo corrompido, variante não suportada): a imagem
            // fica de fora e o PDF segue — não aborta a exportação inteira
            try
            {
                var jp = Images.JpegInfo(data);
                if (jp is not null) h = doc.EmbedJpeg(data, jp.Width, jp.Height, jp.Components ?? 3, jp.Adobe);
                else
                {
                    var r = Images.DecodeRaster(data);
                    if (r is not null) h = doc.EmbedRgba(r.Data, r.Width, r.Height);
                    else
                    {
                        var ext = opts.DecodeImage?.Invoke(img);
                        if (ext is not null) h = doc.EmbedRgba(ext.Data, ext.Width, ext.Height);
                    }
                }
            }
            catch (Exception)
            {
                h = null;
            }
            images.AddOrUpdate(img, new PdfImageBox(h));
            return h;
        }

        foreach (var lp in result.Pages)
        {
            var page = doc.AddPage(lp.WidthTw / T, lp.HeightTw / T);
            foreach (var it in lp.Items) PaintItem(page, it, FontFor, ImageFor);
        }
        return doc.Build();
    }

    private sealed record PdfImageBox(PdfImage? Image);

    private static PathStroke? StrokeOf(StrokeSpec? s, bool validate)
    {
        if (s is null) return null;
        if (validate && !Hex6.IsMatch(s.Color)) return null;
        return new PathStroke(HexColor(s.Color), Math.Max(0.25, s.WidthPt),
            Js.Truthy(s.Dash) ? new[] { s.WidthPt * 3, s.WidthPt * 2 } : null);
    }

    private static void PaintItem(PdfPage page, PageItem item, Func<FontFace, EmbeddedFont?> fontFor, Func<InlineImage, PdfImage?> imageFor)
    {
        switch (item)
        {
            case GlyphRunItem it:
                {
                    var ef = fontFor(it.Face);
                    if (ef is null) return;
                    var placed = it.Glyphs.Select(g =>
                    {
                        var (gid, _) = ef.Encode(g.Cp);
                        return new OfficeNext.Pdf.PlacedGlyph { Gid = gid, CodePoint = g.Cp, XPt = g.X / T, BaselineFromTopPt = it.Y / T };
                    }).ToList();
                    page.WithAlpha(it.Alpha, it.Alpha, () => page.Glyphs(ef, it.SizePt, HexColor(it.Color), placed,
                        scaleX: it.ScaleX is { } sx && sx != 0 && !double.IsNaN(sx) ? sx : null,
                        synthBold: it.SynthBold, synthItalic: it.SynthItalic));
                    return;
                }
            case RectItem it:
                page.WithAlpha(it.Alpha, null, () => page.FillRect(it.X / T, it.Y / T, it.W / T, it.H / T, HexColor(it.Fill)));
                return;
            case LineItem it:
                {
                    double w = it.WidthPt;
                    double[]? dash = it.Dash == "dotted" ? new[] { w, w * 2 } : it.Dash == "dashed" ? new[] { w * 4, w * 3 }
                        : it.Dash == "dashDot" ? new[] { w * 4, w * 2, w, w * 2 } : it.Dash == "dashDotDot" ? new[] { w * 4, w * 2, w, w * 2, w, w * 2 } : null;
                    page.Line(it.X1 / T, it.Y1 / T, it.X2 / T, it.Y2 / T, HexColor(it.Color), it.WidthPt, dash);
                    return;
                }
            case ImageItem it:
                {
                    var h = imageFor(it.Image);
                    if (h is null) return;
                    double x = it.X / T, y = it.Y / T, w = it.W / T, hh = it.H / T;
                    var crop = it.Crop;
                    bool rotOn = it.Rot is { } rr && rr != 0 && !double.IsNaN(rr);
                    if (crop is not null && (Truthy(crop.L) || Truthy(crop.T) || Truthy(crop.R) || Truthy(crop.B)))
                    {
                        page.PushClipRect(x, y, w, hh);
                        double fw = w / Math.Max(0.01, 1 - crop.L - crop.R);
                        double fh = hh / Math.Max(0.01, 1 - crop.T - crop.B);
                        x -= crop.L * fw; y -= crop.T * fh; w = fw; hh = fh;
                        page.DrawImageTransformed(h, x, y, w, hh, it.Rot ?? 0, it.FlipH, it.FlipV);
                        page.PopClip();
                    }
                    else if (rotOn || it.FlipH || it.FlipV) page.DrawImageTransformed(h, x, y, w, hh, it.Rot ?? 0, it.FlipH, it.FlipV);
                    else page.DrawImage(h, x, y, w, hh);
                    return;
                }
            case ShapeItem it:
                {
                    PdfColor? fill = it.Fill is not null && Hex6.IsMatch(it.Fill) ? HexColor(it.Fill) : null;
                    var stroke = StrokeOf(it.Stroke, validate: true);
                    if (fill is null && stroke is null) return;
                    double x = it.X / T, y = it.Y / T, w = it.W / T, h = it.H / T;
                    var cmds = ShapePath(it.Style.Geom, x, y, w, h, it.Line, it.Style.FlipH == true, it.Style.FlipV == true);
                    if (it.Style.Rot is { } rot && rot != 0 && !double.IsNaN(rot)) cmds = RotatePath(cmds, x + w / 2, y + h / 2, rot);
                    // transparência do preenchimento/contorno (a:alpha, v:fill opacity)
                    page.WithAlpha(it.Style.FillAlpha, it.Style.Line?.Alpha, () => page.Path(cmds, it.Style.Geom == "line" ? null : fill, stroke));
                    return;
                }
            case PathItem it:
                {
                    PdfColor? fill = it.Fill is not null && Hex6.IsMatch(it.Fill) ? HexColor(it.Fill) : null;
                    var stroke = StrokeOf(it.Stroke, validate: false);
                    var cmds = it.Cmds.Select(c => c.Op == 'Z' ? PathCmd.Z : c.Op == 'C'
                        ? PathCmd.C(c.X1 / T, c.Y1 / T, c.X2 / T, c.Y2 / T, c.X / T, c.Y / T)
                        : c.Op == 'M' ? PathCmd.M(c.X / T, c.Y / T) : PathCmd.L(c.X / T, c.Y / T)).ToList();
                    page.Path(cmds, fill, stroke);
                    return;
                }
            case XformItem it:
                {
                    if (it.Op == "pop" || it.M is null) { page.PopClip(); return; }
                    // M em twips com origem no topo → matriz cm do PDF (pt, origem embaixo)
                    double a = it.M[0], b = it.M[1], c = it.M[2], d = it.M[3], e = it.M[4], f = it.M[5];
                    double H = page.HeightPt;
                    page.PushTransform(a, -b, -c, d, c * H + e / T, H - d * H - f / T);
                    return;
                }
            case ClipItem it:
                if (it.Op == "push") page.PushClipRect((it.X ?? 0) / T, (it.Y ?? 0) / T, (it.W ?? 0) / T, (it.H ?? 0) / T);
                else page.PopClip();
                return;
        }
    }

    private static bool Truthy(double v) => v != 0 && !double.IsNaN(v);

    private const double K = 0.5523;

    /// <summary>Gira o caminho (graus, horário na tela) em torno de (cx, cy).</summary>
    private static List<PathCmd> RotatePath(List<PathCmd> cmds, double cx, double cy, double deg)
    {
        double r = (deg * Math.PI) / 180, c = Math.Cos(r), s = Math.Sin(r);
        (double, double) Tr(double x, double y) => (cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c);
        return cmds.Select(m =>
        {
            if (m.Op is PathOp.M or PathOp.L)
            {
                var (x, y) = Tr(m.X, m.Y);
                return m.Op == PathOp.M ? PathCmd.M(x, y) : PathCmd.L(x, y);
            }
            if (m.Op == PathOp.C)
            {
                var (x1, y1) = Tr(m.X1, m.Y1);
                var (x2, y2) = Tr(m.X2, m.Y2);
                var (x, y) = Tr(m.X, m.Y);
                return PathCmd.C(x1, y1, x2, y2, x, y);
            }
            return m;
        }).ToList();
    }

    private static List<PathCmd> ShapePath(string geom, double x, double y, double w, double h, ShapeLinePoints? line = null, bool flipH = false, bool flipV = false)
    {
        if (geom == "line" || geom.StartsWith("straightConnector", StringComparison.Ordinal))
        {
            if (line is not null) return new List<PathCmd> { PathCmd.M(x + line.X1 / T, y + line.Y1 / T), PathCmd.L(x + line.X2 / T, y + line.Y2 / T) };
            var (x1, x2) = flipH ? (x + w, x) : (x, x + w);
            var (y1, y2) = flipV ? (y + h, y) : (y, y + h);
            return new List<PathCmd> { PathCmd.M(x1, y1), PathCmd.L(x2, y2) };
        }
        if (geom == "ellipse")
        {
            double cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
            return new List<PathCmd>
            {
                PathCmd.M(cx + rx, cy),
                PathCmd.C(cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry),
                PathCmd.C(cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy),
                PathCmd.C(cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry),
                PathCmd.C(cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy),
                PathCmd.Z,
            };
        }
        if (geom == "roundRect")
        {
            double r = Math.Min(w, h) * 0.1667;
            return new List<PathCmd>
            {
                PathCmd.M(x + r, y), PathCmd.L(x + w - r, y),
                PathCmd.C(x + w - r + r * K, y, x + w, y + r - r * K, x + w, y + r),
                PathCmd.L(x + w, y + h - r),
                PathCmd.C(x + w, y + h - r + r * K, x + w - r + r * K, y + h, x + w - r, y + h),
                PathCmd.L(x + r, y + h),
                PathCmd.C(x + r - r * K, y + h, x, y + h - r + r * K, x, y + h - r),
                PathCmd.L(x, y + r),
                PathCmd.C(x, y + r - r * K, x + r - r * K, y, x + r, y),
                PathCmd.Z,
            };
        }
        return new List<PathCmd> { PathCmd.M(x, y), PathCmd.L(x + w, y), PathCmd.L(x + w, y + h), PathCmd.L(x, y + h), PathCmd.Z };
    }
}
