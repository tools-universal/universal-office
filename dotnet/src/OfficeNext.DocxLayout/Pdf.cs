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
            return g == 0 && cp >= 0xf000 && cp <= 0xf0ff && Fonts.IsSymbolFont(_sf) ? _sf.GlyphId(cp - 0xf000) : g;
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

        // pua: cópia da fonte para os códigos da área privada (F0xx) que ela não tem no cmap
        // (w:sym com fonte comum) — o ToUnicode grava o código privado, como o Word, sem colidir
        // com o caractere comum que use o mesmo glifo
        EmbeddedFont? FontFor(FontFace face, bool pua = false)
        {
            string key = pua ? $"{face.Key}#pua" : face.Key;
            if (!fonts.TryGetValue(key, out var f))
            {
                if (face.Bytes is null) f = null;
                else
                {
                    string name = Ws.Replace(face.Family, "") + (face.Bold ? "-Bold" : "") + (face.Italic ? "-Italic" : "");
                    f = doc.EmbedFont(name, face.Bytes, new FaceProgram(face.Font));
                }
                fonts[key] = f;
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
                var fx = img.Effects;
                var jp = Images.JpegInfo(data);
                // JPEG com ajuste de cor: brilho/contraste via /Decode; os demais exigem os pixels
                var dec = jp is not null && fx is not null ? Images.EffectDecode(fx, jp.Components ?? 3) : null;
                if (jp is not null && (fx is null || dec is not null)) h = doc.EmbedJpeg(data, jp.Width, jp.Height, jp.Components ?? 3, jp.Adobe, dec);
                else
                {
                    var r = jp is not null ? null : Images.DecodeRaster(data);
                    if (r is not null)
                    {
                        if (fx is not null) Images.ApplyImageEffects(r.Data, fx);
                        h = doc.EmbedRgba(r.Data, r.Width, r.Height);
                    }
                    else
                    {
                        var ext = opts.DecodeImage?.Invoke(img);
                        if (ext is not null && fx is not null) Images.ApplyImageEffects(ext.Data, fx);
                        if (ext is not null) h = doc.EmbedRgba(ext.Data, ext.Width, ext.Height);
                        else if (jp is not null) h = doc.EmbedJpeg(data, jp.Width, jp.Height, jp.Components ?? 3, jp.Adobe);
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

        // Formato da Imagem: os pixels (com os ajustes de cor) quando dá para decodificar
        Rgba? RgbaOf(ImageItem it)
        {
            var img = it.Image;
            Rgba? r = null;
            try
            {
                var jp = Images.JpegInfo(img.Data);
                var d = jp is not null ? null : Images.DecodeRaster(img.Data);
                if (d is not null) r = new Rgba(d.Width, d.Height, (byte[])d.Data.Clone());
                else
                {
                    var ext = opts.DecodeImage?.Invoke(img);
                    if (ext is not null) r = new Rgba(ext.Width, ext.Height, (byte[])ext.Data.Clone());
                }
            }
            catch (Exception)
            {
                r = null;
            }
            if (r is null) return null;
            if (img.Effects is not null) Images.ApplyImageEffects(r.Data, img.Effects);
            if (it.Pic is not null) Images.ApplyPictureAdjust(r.Data, it.Pic);
            return r;
        }
        var adjustedFor = new Dictionary<InlineImage, Dictionary<string, PdfImage?>>(ReferenceEqualityComparer.Instance);
        PdfPictureEnv PictureEnv(ImageItem it)
        {
            var look = it.Pic;
            bool needPixels = look is not null && (look.Alpha is not null || look.Duotone is not null || look.ClrChange is not null);
            return new PdfPictureEnv
            {
                Image = () =>
                {
                    if (!needPixels) return ImageFor(it.Image);
                    string key = PicAdjustKey(look!);
                    if (!adjustedFor.TryGetValue(it.Image, out var byImg)) { byImg = new Dictionary<string, PdfImage?>(StringComparer.Ordinal); adjustedFor[it.Image] = byImg; }
                    if (byImg.TryGetValue(key, out var hit)) return hit;
                    var r = RgbaOf(it);
                    var h = r is not null ? doc.EmbedRgba(r.Data, r.Width, r.Height) : ImageFor(it.Image);
                    byImg[key] = h;
                    return h;
                },
                Rgba = () => RgbaOf(it),
                Masked = (alpha, mw, mh) =>
                {
                    var jp = Images.JpegInfo(it.Image.Data);
                    if (jp is not null && !needPixels)
                    {
                        var fx = it.Image.Effects;
                        var dec = fx is not null ? Images.EffectDecode(fx, jp.Components ?? 3) : null;
                        if (fx is null || dec is not null) return doc.EmbedJpeg(it.Image.Data, jp.Width, jp.Height, jp.Components ?? 3, jp.Adobe, dec, (alpha, mw, mh));
                    }
                    var r = RgbaOf(it);
                    if (r is null) return ImageFor(it.Image);
                    // a máscara (na resolução dela) multiplica o alfa da imagem
                    for (int y = 0; y < r.Height; y++)
                    {
                        int my = (int)Math.Min(mh - 1, Math.Floor(((y + 0.5) / r.Height) * mh));
                        for (int x = 0; x < r.Width; x++)
                        {
                            int mx = (int)Math.Min(mw - 1, Math.Floor(((x + 0.5) / r.Width) * mw));
                            int k = (y * r.Width + x) * 4 + 3;
                            r.Data[k] = (byte)JsNumber.Round((r.Data[k] * (double)alpha[my * mw + mx]) / 255);
                        }
                    }
                    return doc.EmbedRgba(r.Data, r.Width, r.Height);
                },
                EmbedRgba = (d, w, h) => doc.EmbedRgba(d, w, h),
            };
        }

        // efeito da Cor da Página: o ladrilho (gradiente/padrão) embutido UMA vez por documento
        var bgImages = new Dictionary<string, PdfImage>();
        PdfImage BgImage(string key, Func<(byte[] Rgba, int W, int H)> make)
        {
            if (!bgImages.TryGetValue(key, out var h)) { var r = make(); h = doc.EmbedRgba(r.Rgba, r.W, r.H); bgImages[key] = h; }
            return h;
        }

        foreach (var lp in result.Pages)
        {
            var page = doc.AddPage(lp.WidthTw / T, lp.HeightTw / T);
            if (Js.Truthy(lp.Background)) page.FillRect(0, 0, lp.WidthTw / T, lp.HeightTw / T, HexColor(lp.Background!));
            if (lp.BackgroundFill is not null) PaintFillPdf(page, lp, lp.BackgroundFill, BgImage, ImageFor);
            foreach (var it in lp.Items) PaintItem(page, it, FontFor, ImageFor,
                (g, smp) => doc.AddShading(new PdfShadingGeom(g.Radial, g.X0, g.Y0, g.X1, g.Y1, g.R), smp, page.HeightPt), PictureEnv,
                (d, w, h) => doc.EmbedRgba(d, w, h));
        }
        return doc.Build();
    }

    /// <summary>
    /// Efeito de preenchimento da página no PDF como o Word grava (PageFill.cs): ladrilhos de
    /// "pixel de dispositivo" de 0,12 pt (gradiente, imagem) ou 1 pt (padrão), textura no
    /// tamanho natural, ancorados no canto superior esquerdo; a imagem do ladrilho do gradiente a
    /// 96 ppp do tamanho no PDF.
    /// </summary>
    private static void PaintFillPdf(PdfPage page, LayoutPage lp, PageFillPaint f,
        Func<string, Func<(byte[] Rgba, int W, int H)>, PdfImage> bgImage, Func<InlineImage, PdfImage?> imageFor)
    {
        var tile = PageFillMath.TileTw(f, 2.4, 20, true);
        if (tile is not { } t) return;
        PdfImage? img = null;
        double tw = t.W / T, th = t.H / T;
        if (f.Type is "gradient" or "gradientRadial")
        {
            int pw = Math.Max(2, (int)JsNumber.Round(tw * 96 / 72)), ph = Math.Max(2, (int)JsNumber.Round(th * 96 / 72));
            string key = "g|" + f.Type + "|" + f.C1 + "|" + f.C2 + "|" + string.Join(";", f.Stops?.Select(s => s.Pos.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + s.Color) ?? Enumerable.Empty<string>())
                + "|" + f.Angle.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + f.Focus.ToString(System.Globalization.CultureInfo.InvariantCulture)
                + "|" + f.FocusPosition + "|" + f.GradientCenter + "|" + pw + "x" + ph;
            img = bgImage(key, () => (PageFillMath.GradientTileRgba(f, pw, ph, true), pw, ph));
        }
        else if (f.Type == "pattern")
        {
            var bas = PageFillMath.PatternRgba(f);
            img = bgImage("p|" + f.C1 + "|" + f.C2 + "|" + string.Join(",", f.Pattern ?? Array.Empty<int>()), () =>
            {
                var rgba = new byte[64 * 64 * 4];
                for (int y = 0; y < 64; y++)
                    for (int x = 0; x < 64; x++)
                        Array.Copy(bas, ((y % 8) * 8 + (x % 8)) * 4, rgba, (y * 64 + x) * 4, 4);
                return (rgba, 64, 64);
            });
            tw *= 8; th *= 8;
        }
        else if (f.Image is not null) img = imageFor(f.Image);
        if (img is null || tw <= 0 || th <= 0) return;
        double W = lp.WidthTw / T, H = lp.HeightTw / T;
        page.PushClipRect(0, 0, W, H);
        for (double y = 0; y < H; y += th)
            for (double x = 0; x < W; x += tw)
                page.DrawImage(img, x, y, tw, th);
        page.PopClip();
    }

    private sealed record PdfImageBox(PdfImage? Image);

    /// <summary>Chave do cache de imagem ajustada (o JSON.stringify([alpha, duotone, clrChange]) do JS).</summary>
    private static string PicAdjustKey(PictureLook look) =>
        string.Join("|", look.Alpha is { } a ? JsNumber.ToString(a) : "-",
            look.Duotone is { } d ? d.A + "," + d.B : "-",
            look.ClrChange is { } c ? c.From + "," + c.To + "," + JsNumber.ToString(c.ToAlpha) : "-");

    private static PathStroke? StrokeOf(StrokeSpec? s, bool validate)
    {
        if (s is null) return null;
        if (validate && !Hex6.IsMatch(s.Color)) return null;
        return new PathStroke(HexColor(s.Color), Math.Max(0.25, s.WidthPt),
            Js.Truthy(s.Dash) ? new[] { s.WidthPt * 3, s.WidthPt * 2 } : null);
    }

    /// <summary>Contorno de um glifo (camada COLR) → comandos do PDF; false sem contorno.</summary>
    private static bool OutlineInto(List<PathCmd> cmds, OfficeNext.Layout.ILayoutFont font, int gid, double ox, double bas, double sx, double s, double skew)
    {
        var ol = font.GlyphOutline(gid);
        if (ol is null) return false;
        double X(double x, double y) => ox + x * sx + skew * y * s;
        double Y(double y) => bas - y * s;
        double px = 0, py = 0;
        foreach (var c in ol)
        {
            if (c.Op == 'Z') { cmds.Add(PathCmd.Z); continue; }
            if (c.Op == 'Q')
            {
                // quadrática → cúbica (pontos de controle a 2/3)
                double c1x = px + (2.0 / 3) * (c.Cx - px), c1y = py + (2.0 / 3) * (c.Cy - py);
                double c2x = c.X + (2.0 / 3) * (c.Cx - c.X), c2y = c.Y + (2.0 / 3) * (c.Cy - c.Y);
                cmds.Add(PathCmd.C(X(c1x, c1y), Y(c1y), X(c2x, c2y), Y(c2y), X(c.X, c.Y), Y(c.Y)));
            }
            else cmds.Add(c.Op == 'M' ? PathCmd.M(X(c.X, c.Y), Y(c.Y)) : PathCmd.L(X(c.X, c.Y), Y(c.Y)));
            px = c.X; py = c.Y;
        }
        return true;
    }

    /// <summary>Resolução da camada dos efeitos de texto no PDF (o Word grava ~200 dpi).</summary>
    private const double FxPpt = 200.0 / 72;

    /// <summary>Os contornos dos glifos do run em comandos do PDF (pt); nulo sem contornos.</summary>
    private static List<PathCmd>? RunPathCmds(GlyphRunItem it)
    {
        var font = it.Face.Font;
        if (font is not OfficeNext.Layout.SfntFont) return null;
        double upm = font.Metrics.UnitsPerEm;
        double sc = it.SizePt / upm, sx = sc * (it.ScaleX ?? 1);
        double skew = it.SynthItalic ? 0.2 : 0;
        var cmds = new List<PathCmd>();
        foreach (var g in it.Glyphs) OutlineInto(cmds, font, TextFx.GidOf(it, g), g.X / T, it.Y / T, sx, sc, skew);
        return cmds;
    }

    /// <summary>Run com efeitos de texto no PDF: sombra/brilho/reflexo numa imagem com alfa atrás;
    /// o preenchimento (sólido = texto; degradê = curvas sombreadas; nenhum = só o contorno) e o
    /// contorno em curvas por cima (como o Word: write/tools/home-lab exp-effects).</summary>
    private static void PaintGlyphsFxPdf(PdfPage page, GlyphRunItem it, Action<PageItem> drawPlain,
        Func<GradGeom, byte[], PdfShading> shade, Func<byte[], int, int, PdfImage>? embedRgba)
    {
        var fx = it.Fx!;
        if (embedRgba is not null && (fx.Shadow is not null || fx.Glow is not null || fx.Reflection is not null))
        {
            if (TextFx.FxLayers(it, fx, FxPpt, it.Color) is { } L)
                page.DrawImage(embedRgba(L.Data, L.W, L.H), L.X0 / T, L.Y0 / T, L.W / FxPpt, L.H / FxPpt);
        }
        var fill = fx.Fill;
        if (fill is { Kind: "grad" })
        {
            var cmds = RunPathCmds(it);
            if (cmds is not null)
            {
                var b = TextFx.RunBox(it);
                double bxp = b.X / T, byp = b.Y / T, bwp = b.W / T, bhp = b.H / T;
                var g = Geometry.GradientGeometry(TextFx.GradOf(fill), (bxp, byp, bwp, bhp, 0), (bxp, byp, bxp + bwp, byp + bhp));
                var sh = shade(g, Geometry.GradientSamples(fill.Stops.Select(st => new GradStop { Pos = st.Pos, Color = st.Hex }).ToList(), Js.Truthy(fill.Path) ? 256 : 512));
                double? a0 = fill.Stops.Count > 0 && fill.Stops[0].Alpha < 1 ? fill.Stops[0].Alpha : null;
                page.WithAlpha(a0, null, () => page.FillShaded(cmds, sh));
            }
        }
        else if (fill is not { Kind: "none" })
        {
            var plain = (GlyphRunItem)it.ShallowClone();
            plain.Fx = null;
            double? a = fill is { Kind: "solid" } ? fill.Alpha : it.Alpha;
            if (fill is { Kind: "solid" }) plain.Color = fill.Hex;
            if (a is { } av && av < 1) { plain.Alpha = av; plain.AsPath = true; }
            drawPlain(plain);
        }
        var o = fx.Outline;
        if (o is not null && o.Fill.Kind != "none")
        {
            var cmds = RunPathCmds(it);
            if (cmds is not null)
            {
                string color = o.Fill.Kind == "solid" ? o.Fill.Hex : o.Fill.Stops.Count > 0 ? o.Fill.Stops[0].Hex : it.Color;
                double a = o.Fill.Kind == "solid" ? o.Fill.Alpha : 1;
                var dash = TextFx.DashPattern(o.Dash).Select(d => d * o.WidthPt).ToArray();
                page.WithAlpha(null, a < 1 ? a : null, () => page.Path(cmds, null, new PathStroke(HexColor(color), o.WidthPt, dash.Length > 0 ? dash : null)));
            }
        }
    }

    /// <summary>
    /// Texto como CURVAS (WordArt, texto semitransparente, caixa girada, emoji
    /// colorido): cada glifo vira o seu contorno TrueType, preenchido. false se a
    /// fonte não dá contornos (CFF) — aí vai como texto.
    /// </summary>
    private static bool GlyphsAsPath(PdfPage page, GlyphRunItem it)
    {
        var font = it.Face.Font;
        double upm = font.Metrics.UnitsPerEm;
        double s = it.SizePt / upm, sx = s * (it.ScaleX ?? 1);
        double skew = it.SynthItalic ? 0.2 : 0;
        double bas = it.Y / T;
        var cmds = new List<PathCmd>();
        foreach (var g in it.Glyphs)
        {
            int gid = TextFx.GidOf(it, g);
            // glifo colorido (COLR): cada camada com a sua cor, na ordem da tabela
            var layers = it.Colr ? font.ColorLayers(gid) : null;
            if (layers is not null)
            {
                foreach (var L in layers)
                {
                    var lc = new List<PathCmd>();
                    if (!OutlineInto(lc, font, L.GlyphId, g.X / T, bas, sx, s, skew)) continue;
                    if (lc.Count == 0) continue;
                    double a = L.Alpha * (it.Alpha ?? 1);
                    var col = HexColor(L.Color ?? it.Color);
                    page.WithAlpha(a < 1 ? a : null, null, () => page.Path(lc, col, null));
                }
                continue;
            }
            if (!OutlineInto(cmds, font, gid, g.X / T, bas, sx, s, skew)) return false;
        }
        if (cmds.Count == 0) return true;
        var color = HexColor(it.Color);
        PathStroke? stroke = it.SynthBold ? new PathStroke(color, it.SizePt * 0.03) : null;
        page.WithAlpha(it.Alpha, it.Alpha, () => page.Path(cmds, color, stroke));
        return true;
    }

    private static void PaintItem(PdfPage page, PageItem item, Func<FontFace, bool, EmbeddedFont?> fontFor, Func<InlineImage, PdfImage?> imageFor,
        Func<GradGeom, byte[], PdfShading> shade, Func<ImageItem, PdfPictureEnv>? pictureEnv = null,
        Func<byte[], int, int, PdfImage>? embedRgba = null)
    {
        switch (item)
        {
            case GlyphRunItem it:
                {
                    // efeitos de texto (w14): camada atrás, o texto, o contorno
                    if (it.Fx is not null) { PaintGlyphsFxPdf(page, it, x => PaintItem(page, x, fontFor, imageFor, shade, pictureEnv, embedRgba), shade, embedRgba); return; }
                    if (it.AsPath && GlyphsAsPath(page, it)) return;
                    var ef = fontFor(it.Face, false);
                    if (ef is null) return;
                    // corpo gravado no PDF como o Word: múltiplo de 1/600" (0,12 pt) — 10 → 9,96, 11 → 11,04
                    // (PDFs do oráculo); as posições dos glifos não mudam (cada um tem a sua matriz)
                    double pdfSize = Js.Round(it.SizePt / 0.12) * 0.12;
                    // código da área privada que a fonte não tem no cmap (w:sym com fonte comum, ex.: Arial
                    // F0A0 → .notdef da Calibri): vai na cópia "pua" da fonte, com o próprio código no
                    // ToUnicode (como o Word)
                    var sf = it.Face.Font;
                    bool IsPua(int cp) => cp >= 0xf000 && cp <= 0xf0ff && sf.GlyphId(cp) == 0;
                    // glifo por índice (EMF) sem contorno disponível: não há caractere para gravar
                    var all = it.ByGid ? new List<GlyphPos>() : it.Glyphs.ToList();
                    for (int i = 0; i < all.Count;)
                    {
                        bool pua = IsPua(all[i].Cp);
                        int j = i + 1;
                        while (j < all.Count && IsPua(all[j].Cp) == pua) j++;
                        var f = pua ? fontFor(it.Face, true) ?? ef : ef;
                        var placed = all.GetRange(i, j - i).Select(g =>
                        {
                            var (gid, _) = f.Encode(g.Cp);
                            return new OfficeNext.Pdf.PlacedGlyph { Gid = gid, CodePoint = g.Cp, XPt = g.X / T, BaselineFromTopPt = it.Y / T };
                        }).ToList();
                        page.WithAlpha(it.Alpha, it.Alpha, () => page.Glyphs(f, pdfSize, HexColor(it.Color), placed,
                            scaleX: it.ScaleX is { } sx && sx != 0 && !double.IsNaN(sx) ? sx : null,
                            synthBold: it.SynthBold, synthItalic: it.SynthItalic,
                            // texto em corridas (Tm + TJ) como no PDF do Word: a extração não embaralha linhas sobrepostas
                            runs: true));
                        i = j;
                    }
                    return;
                }
            case RectItem it:
                page.WithAlpha(it.Alpha, null, () => page.FillRect(it.X / T, it.Y / T, it.W / T, it.H / T, HexColor(it.Fill)));
                return;
            case LineItem it:
                {
                    double w = it.WidthPt;
                    double[]? dash = it.Dash == "dotted" ? new[] { w, w * 2 } : it.Dash == "dashed" ? new[] { w * 4, w * 3 }
                        : it.Dash == "dashDot" ? new[] { w * 4, w * 2, w, w * 2 } : it.Dash == "dashDotDot" ? new[] { w * 4, w * 2, w, w * 2, w, w * 2 }
                        : Paint.BorderDashes(it.Dash, w);
                    page.Line(it.X1 / T, it.Y1 / T, it.X2 / T, it.Y2 / T, HexColor(it.Color), it.WidthPt, dash);
                    return;
                }
            case ImageItem it:
                {
                    // Formato da Imagem (e recorte girado): a composição no referencial da imagem
                    bool rotOn0 = it.Rot is { } r0 && r0 != 0 && !double.IsNaN(r0);
                    if (pictureEnv is not null && (it.Pic is not null || (it.Crop is not null && (rotOn0 || it.FlipH || it.FlipV))))
                    {
                        PdfPicture.PaintPicturePdf(page, it, pictureEnv(it));
                        return;
                    }
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
                    // Efeitos de Forma: rasters dos efeitos em volta do corpo vetorial
                    if (it.Fx is not null && embedRgba is not null && it.Style.Geom != "line")
                    {
                        PdfPicture.PaintShapeEffectsPdf(page, it, embedRgba, () =>
                        {
                            var body = (ShapeItem)it.ShallowClone();
                            body.Fx = null;
                            body.Shadow = null;
                            PaintItem(page, body, fontFor, imageFor, shade, pictureEnv, embedRgba);
                        });
                        return;
                    }
                    var st = it.Style;
                    PdfColor? fill = it.Fill is not null && Hex6.IsMatch(it.Fill) ? HexColor(it.Fill) : null;
                    var stroke = StrokeOf(it.Stroke, validate: true);
                    if (fill is null && stroke is null && it.Grad is null && it.Pattern is null && it.Blip is null) return;
                    double x = it.X / T, y = it.Y / T, w = it.W / T, h = it.H / T;
                    bool isLine = st.Geom == "line" || st.Geom.StartsWith("straightConnector", StringComparison.Ordinal);
                    bool fH = st.FlipH == true, fV = st.FlipV == true;
                    double rot = st.Rot is { } r0 && !double.IsNaN(r0) ? r0 : 0;
                    // linha: pontos do VML ou diagonal do quadro; a:custGeom: caminhos do arquivo
                    // (cada um preenchido à parte, par-ímpar); demais: geometria predefinida
                    // (ajustes, espelho e rotação) — oráculos de formas e cust
                    var parts = new List<(List<PathCmd> Cmds, bool Fill, bool Stroke, bool EvenOdd)>();
                    if (isLine)
                    {
                        var cmds = LinePath(x, y, w, h, it.Line, fH, fV);
                        if (rot != 0) cmds = RotatePath(cmds, x + w / 2, y + h / 2, rot);
                        parts.Add((cmds, false, true, false));
                    }
                    else if (st.Geom == "custom" && st.Cust is not null)
                    {
                        foreach (var p in Geometry.CustPaths(st.Cust, x, y, w, h, fH, fV, rot)) parts.Add((ToPdf(p.Cmds), p.Fill, p.Stroke, true));
                    }
                    else
                    {
                        parts.Add((ToPdf(Geometry.PresetPath(st.Geom, x, y, w, h, st.Adj, fH, fV, rot)), !Geometry.OpenPresets.Contains(st.Geom), true, false));
                    }
                    // sombra externa: cópia deslocada na cor da sombra (sem desfoque); o contorno
                    // também projeta sombra (oráculo shd-tri)
                    if (it.Shadow is { } shw)
                    {
                        double dx = shw.Dx / T, dy = shw.Dy / T;
                        var col = HexColor(shw.Color);
                        foreach (var p in parts)
                        {
                            if (!p.Fill && stroke is null) continue;
                            var sc = p.Cmds.Select(c => c.Op == PathOp.Z ? c : c.Op == PathOp.C
                                ? PathCmd.C(c.X1 + dx, c.Y1 + dy, c.X2 + dx, c.Y2 + dy, c.X + dx, c.Y + dy)
                                : c with { X = c.X + dx, Y = c.Y + dy }).ToList();
                            PdfColor? sf = p.Fill && (fill is not null || it.Grad is not null) ? col : null;
                            PathStroke? ss = p.Stroke && stroke is { } sk ? sk with { Color = col } : null;
                            page.WithAlpha(shw.Alpha, shw.Alpha, () => page.Path(sc, sf, ss, p.EvenOdd));
                        }
                    }
                    // padrão (a:pattFill) e imagem/textura (a:blipFill): raster recortado pelo caminho
                    if ((it.Pattern is not null || it.Blip is not null) && embedRgba is not null)
                    {
                        foreach (var p in parts.Where(p => p.Fill).ToList())
                        {
                            page.PushClipPath(p.Cmds, p.EvenOdd);
                            if (it.Pattern is not null)
                            {
                                var pr = Geometry.PatternRaster(it.Pattern, x, y, w, h, 0.75, 4);
                                if (pr is not null) page.DrawImage(embedRgba(pr.Data, pr.W, pr.H), pr.X, pr.Y, pr.CellsW * 0.75, pr.CellsH * 0.75);
                            }
                            else if (it.Blip is { } bl)
                            {
                                var im = imageFor(bl.Image);
                                var nat = Images.ImagePixelSize(bl.Image.Data);
                                if (im is not null) page.WithAlpha(bl.Alpha, null, () =>
                                {
                                    foreach (var t in Geometry.BlipTiles(bl, x, y, w, h, 1.0 / 12700, nat)) page.DrawImage(im, t.X, t.Y, t.W, t.H);
                                });
                            }
                            page.PopClip();
                        }
                        if (stroke is not null) foreach (var p in parts) if (p.Stroke) page.WithAlpha(null, st.Line?.Alpha, () => page.Path(p.Cmds, null, stroke));
                        return;
                    }
                    // degradê em retângulos ("Do Centro"): raster no quadro da forma, girado com ela
                    if (it.Grad is { } rg && Geometry.IsRectGradient(rg) && embedRgba is not null)
                    {
                        var r = Geometry.RectGradientRaster(rg, w, h, 2);
                        var im = embedRgba(r.Data, r.W, r.H);
                        foreach (var p in parts)
                        {
                            if (!p.Fill) continue;
                            page.PushClipPath(p.Cmds, p.EvenOdd);
                            page.WithAlpha(st.FillAlpha, null, () => page.DrawImageTransformed(im, x, y, w, h, st.Rot ?? 0, st.FlipH == true, st.FlipV == true));
                            page.PopClip();
                        }
                        if (stroke is not null) foreach (var p in parts) if (p.Stroke) page.WithAlpha(null, st.Line?.Alpha, () => page.Path(p.Cmds, null, stroke));
                        return;
                    }
                    if (it.Grad is { } grad)
                    {
                        var pb = Geometry.PathBounds(parts.SelectMany(p => FromPdf(p.Cmds)));
                        var g = Geometry.GradientGeometry(grad, (x, y, w, h, rot), pb);
                        var sh = shade(g, Geometry.GradientSamples(grad.Stops, Js.Truthy(grad.Path) ? 256 : 512));
                        foreach (var p in parts) if (p.Fill) page.WithAlpha(st.FillAlpha, null, () => page.FillShaded(p.Cmds, sh, p.EvenOdd));
                        if (stroke is not null) foreach (var p in parts) if (p.Stroke) page.WithAlpha(null, st.Line?.Alpha, () => page.Path(p.Cmds, null, stroke));
                        return;
                    }
                    // transparência do preenchimento/contorno (a:alpha, v:fill opacity)
                    foreach (var p in parts) page.WithAlpha(st.FillAlpha, st.Line?.Alpha, () => page.Path(p.Cmds, p.Fill ? fill : null, p.Stroke ? stroke : null, p.EvenOdd));
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

    /// <summary>Linha (geom line/straightConnector): pontos do VML ou diagonal do quadro com espelho.</summary>
    private static List<PathCmd> LinePath(double x, double y, double w, double h, ShapeLinePoints? line = null, bool flipH = false, bool flipV = false)
    {
        if (line is not null) return new List<PathCmd> { PathCmd.M(x + line.X1 / T, y + line.Y1 / T), PathCmd.L(x + line.X2 / T, y + line.Y2 / T) };
        var (x1, x2) = flipH ? (x + w, x) : (x, x + w);
        var (y1, y2) = flipV ? (y + h, y) : (y, y + h);
        return new List<PathCmd> { PathCmd.M(x1, y1), PathCmd.L(x2, y2) };
    }

    /// <summary>Caminho da geometria (twips ou pt — mesma unidade) → comandos do PDF.</summary>
    private static List<PathCmd> ToPdf(IEnumerable<PathCmdTw> cmds) => cmds.Select(c => c.Op == 'Z' ? PathCmd.Z : c.Op == 'C'
        ? PathCmd.C(c.X1, c.Y1, c.X2, c.Y2, c.X, c.Y)
        : c.Op == 'M' ? PathCmd.M(c.X, c.Y) : PathCmd.L(c.X, c.Y)).ToList();

    private static IEnumerable<PathCmdTw> FromPdf(IEnumerable<PathCmd> cmds) => cmds.Select(c => c.Op == PathOp.Z ? PathCmdTw.Z() : c.Op == PathOp.C
        ? PathCmdTw.C(c.X1, c.Y1, c.X2, c.Y2, c.X, c.Y)
        : c.Op == PathOp.M ? PathCmdTw.M(c.X, c.Y) : PathCmdTw.L(c.X, c.Y));
}
