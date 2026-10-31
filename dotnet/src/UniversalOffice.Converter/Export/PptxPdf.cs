using UniversalOffice.Converter.Pdf;
using UniversalOffice.Converter.Processing.Slides.Pptx;

namespace UniversalOffice.Converter;

public sealed class SlidesPdfOptions
{
    /// <summary>OBRIGATÓRIO: fontes TTF (não há base-14 no gerador).</summary>
    public List<PdfFontSource>? Fonts;
}

/// <summary>
/// Export PDF vetorial do pptx — porta de slides/packages/export/src/pdf.ts:
/// 1 página por slide no tamanho do slide (EMU→pt). Desenha fundo, shapes
/// (presets como paths bezier/poligonais), linhas/bordas, tabelas e texto
/// posicionado com a MESMA lógica de layout do canvas (LayoutTextBody puro) —
/// o Measurer usa métricas da TTF embutida.
///
/// Imagens: JPEG embute direto (DCTDecode); PNG é decodificado (unfilter) →
/// RGB + SMask p/ alpha. Outros formatos viram placeholder cinza silencioso.
/// Aproximações documentadas: gradientes viram faixas interpoladas (24 strips
/// recortadas pelo path); sombras, fillAlpha e alphaModFix são ignorados;
/// charts viram placeholder cinza.
/// </summary>
public static class PptxPdf
{
    /// <summary>Tamanhos default (pt) — os mesmos do renderer canvas.</summary>
    private const double DefaultTitlePt = 40;
    private const double DefaultBodyPt = 18;
    /// <summary>Constante de bezier p/ quarto de círculo.</summary>
    private const double Kappa = 0.5522847498307936;
    /// <summary>Nº de faixas da aproximação de gradiente.</summary>
    private const int GradStrips = 24;
    /// <summary>Cinza do placeholder de imagem/chart não suportado.</summary>
    private static readonly PdfColor Placeholder = new(0.8, 0.8, 0.8);

    private sealed class FontVariant
    {
        public bool Bold;
        public bool Italic;
        public required TtfProgram Program;
        public required EmbeddedFont Embedded;
    }

    private static string F(double n) => PdfNum.Fmt(n);

    /// <summary>EMU → pontos.</summary>
    private static double Pt(double emu) => emu / Emu.PerPoint;

    /// <summary>Exporta o .pptx para PDF (1 página por slide, vetorial).</summary>
    public static byte[] ToPdf(byte[] bytes, SlidesPdfOptions? opts = null)
    {
        var fonts = opts?.Fonts;
        if (fonts is null || fonts.Count == 0)
            throw new ArgumentException(
                "PptxPdf.ToPdf: opts.Fonts é obrigatório — o gerador de PDF não tem fontes base-14. " +
                "Passe ao menos uma TTF (ideal: regular/bold/italic/bold-italic da fonte do deck).");

        var deck = SlidesModelOps.LoadDeck(bytes);
        var doc = new PdfDocument();
        var variants = new List<FontVariant>();
        for (int i = 0; i < fonts.Count; i++)
        {
            var f = fonts[i];
            var program = TtfProgram.For(f.Bytes);
            variants.Add(new FontVariant
            {
                Bold = f.Bold,
                Italic = f.Italic,
                Program = program,
                Embedded = doc.EmbedFont(f.Name ?? $"Font{i}", f.Bytes, program),
            });
        }
        FontVariant Pick(bool bold, bool italic) =>
            variants.FirstOrDefault(v => v.Bold == bold && v.Italic == italic)
            ?? variants.FirstOrDefault(v => !v.Bold && !v.Italic)
            ?? variants[0];

        var imageCache = new Dictionary<string, PdfImage?>(StringComparer.Ordinal);
        PreEmbedImages(deck, doc, imageCache);
        double pageW = Pt(deck.Pres.SlideW);
        double pageH = Pt(deck.Pres.SlideH);
        foreach (var ds in deck.Slides)
        {
            var page = doc.AddPage(pageW, pageH);
            DrawSlide(page, doc, ds.Slide, pageW, pageH, Pick, imageCache);
        }
        return doc.Build();
    }

    /// <summary>
    /// Hot path: decode de PNG + deflate dos pixels dominavam o export de decks
    /// com imagem. Prepara tudo em PARALELO e embute em ordem determinística de
    /// varredura (o desenho depois só consome o cache).
    /// </summary>
    private static void PreEmbedImages(Deck deck, PdfDocument doc, Dictionary<string, PdfImage?> imageCache)
    {
        var refs = new List<ImageRef>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        void Add(ImageRef? r)
        {
            if (r is not null && seen.Add(r.Part)) refs.Add(r);
        }
        foreach (var ds in deck.Slides)
        {
            Add(ds.Slide.BgImage);
            foreach (var sh in ds.Slide.Shapes)
            {
                Add(sh.Image);
                Add(sh.FillImage);
            }
        }
        if (refs.Count == 0) return;

        var preparedPng = new PdfDocument.PreparedRgba?[refs.Count];
        var jpegSizes = new (int W, int H)?[refs.Count];
        Parallel.For(0, refs.Count, i =>
        {
            var r = refs[i];
            if (r.Mime == "image/png")
            {
                var png = Raster.DecodePng(r.Bytes);
                if (png is not null) preparedPng[i] = PdfDocument.PrepareRgba(png.Rgba, png.Width, png.Height);
            }
            else if (r.Mime == "image/jpeg")
            {
                jpegSizes[i] = Raster.JpegSize(r.Bytes);
            }
        });
        for (int i = 0; i < refs.Count; i++)
        {
            PdfImage? img = null;
            if (preparedPng[i] is { } prep) img = doc.EmbedRgba(prep);
            else if (jpegSizes[i] is { } sz) img = doc.EmbedJpeg(refs[i].Bytes, sz.W, sz.H);
            imageCache[refs[i].Part] = img;
        }
    }

    private static void DrawSlide(
        PdfPage page, PdfDocument doc, Slide slide,
        double pageW, double pageH, Func<bool, bool, FontVariant> pick,
        Dictionary<string, PdfImage?> imageCache)
    {
        // fundo: cor sólida (default branco da página) + imagem esticada por cima
        if (slide.Bg?.Color is string bgColor) page.FillRect(0, 0, pageW, pageH, PdfColor.Hex(bgColor));
        if (slide.BgImage is not null) DrawImageRef(page, doc, imageCache, slide.BgImage, 0, 0, pageW, pageH);

        foreach (var sh in slide.Shapes) DrawShape(page, doc, sh, pageH, pick, imageCache);
    }

    private static void DrawShape(
        PdfPage page, PdfDocument doc, Shape sh,
        double pageH, Func<bool, bool, FontVariant> pick, Dictionary<string, PdfImage?> imageCache)
    {
        if (sh.Xfrm is null) return; // sem geometria confiável: pula (raro)
        double x = Pt(sh.Xfrm.X), y = Pt(sh.Xfrm.Y);
        double w = Pt(sh.Xfrm.Cx), h = Pt(sh.Xfrm.Cy);

        // rot/flip em torno do centro — CTM local (q ... Q envolve TUDO da shape)
        bool hasXform = (sh.Xfrm.Rot ?? 0) != 0 || sh.Xfrm.FlipH == true || sh.Xfrm.FlipV == true;
        if (hasXform) page.Content.Str(TransformCm(sh, x, y, w, h, pageH));

        if (sh.ChartXml is not null)
        {
            // chart no PDF v1: placeholder silencioso (a engine de chart é canvas-only)
            page.FillRect(x, y, w, h, new PdfColor(0.945, 0.961, 0.976));
            StrokeRectRaw(page, x, y, w, h, pageH, new PdfColor(0.58, 0.64, 0.72), 0.75);
        }
        else if (sh.Table is not null)
        {
            // tamanho natural da tabela (mesma regra do canvas: soma de cols/rows)
            long natW = sh.Table.ColWidthsEmu.Sum();
            long natH = sh.Table.Rows.Sum(r => r.HeightEmu);
            DrawTable(page, sh.Table, x, y, natW > 0 ? Pt(natW) : w, natH > 0 ? Pt(natH) : h, pageH, pick);
        }
        else if (sh.Image is not null)
        {
            DrawImageRef(page, doc, imageCache, sh.Image, x, y, w, h, sh.SrcRect);
            if (sh.LineColor is not null)
                StrokeRectRaw(page, x, y, w, h, pageH, PdfColor.Hex(sh.LineColor), Math.Max(0.5, Pt(sh.LineWidth ?? 9525)));
        }
        else
        {
            var preset = Geometry.PresetPath(sh.Geom, w, h);
            bool isLineGeom = preset.Kind == "line";
            // preenchimento: blipFill > gradiente (faixas) > sólido
            if (!isLineGeom && (sh.FillImage is not null || (sh.Fill is not null && sh.Fill.Type != "none")))
            {
                if (sh.FillImage is not null)
                {
                    // imagem recortada pelo path da geometria
                    page.Content.Str($"q\n{PathOps(preset, x, y, w, h, pageH)}W n\n");
                    DrawImageRef(page, doc, imageCache, sh.FillImage, x, y, w, h);
                    page.Content.Str("Q\n");
                }
                else if (sh.Fill!.Type == "gradient" && sh.Fill.Stops is { Count: >= 2 })
                {
                    FillGradient(page, preset, sh.Fill, x, y, w, h, pageH);
                }
                else if (sh.Fill.Type == "solid" && sh.Fill.Color is not null)
                {
                    var c = PdfColor.Hex(sh.Fill.Color);
                    page.Content.Str($"{F(c.R)} {F(c.G)} {F(c.B)} rg\n{PathOps(preset, x, y, w, h, pageH)}f\n");
                }
            }
            // contorno
            if (sh.LineColor is not null)
            {
                var c = PdfColor.Hex(sh.LineColor);
                double lw = Math.Max(0.5, Pt(sh.LineWidth ?? 9525));
                string dash = sh.LineDash is not null ? DashArray(sh.LineDash, lw) : "[] 0 d\n";
                page.Content.Str(
                    $"{F(c.R)} {F(c.G)} {F(c.B)} RG\n{F(lw)} w\n{dash}" +
                    $"{PathOps(preset, x, y, w, h, pageH)}S\n");
            }
            // texto
            if (sh.TxBody is not null) DrawTextBody(page, sh, sh.TxBody, x, y, pick);
        }

        if (hasXform) page.Content.Str("Q\n");
    }

    // ─────────────────────────── paths / transform ───────────────────────────

    /// <summary>
    /// Operadores de path (sem paint op) para um PresetPath no rect (x,y,w,h) em
    /// coordenadas com origem no TOPO — a conversão para o sistema do PDF
    /// (origem embaixo) acontece aqui via pageH - y.
    /// </summary>
    private static string PathOps(PresetPath p, double x, double y, double w, double h, double pageH)
    {
        string Y(double v) => F(pageH - v);
        string M(double px, double py) => $"{F(px)} {Y(py)} m\n";
        string L(double px, double py) => $"{F(px)} {Y(py)} l\n";
        string C(double x1, double y1, double x2, double y2, double x3, double y3) =>
            $"{F(x1)} {Y(y1)} {F(x2)} {Y(y2)} {F(x3)} {Y(y3)} c\n";
        switch (p.Kind)
        {
            case "ellipse": return EllipseOps(x + w / 2, y + h / 2, w / 2, h / 2, M, C);
            case "roundRect":
            {
                double r = Math.Min(p.R, Math.Min(w / 2, h / 2));
                double k = Kappa * r;
                return
                    M(x + r, y) + L(x + w - r, y) +
                    C(x + w - r + k, y, x + w, y + r - k, x + w, y + r) +
                    L(x + w, y + h - r) +
                    C(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h) +
                    L(x + r, y + h) +
                    C(x + r - k, y + h, x, y + h - r + k, x, y + h - r) +
                    L(x, y + r) +
                    C(x, y + r - k, x + r - k, y, x + r, y) + "h\n";
            }
            case "poly":
            {
                if (p.Points is not { Count: > 0 }) return "";
                var ops = new System.Text.StringBuilder(M(x + p.Points[0].X, y + p.Points[0].Y));
                for (int i = 1; i < p.Points.Count; i++) ops.Append(L(x + p.Points[i].X, y + p.Points[i].Y));
                return ops.Append("h\n").ToString();
            }
            case "line": return M(x + p.X1, y + p.Y1) + L(x + p.X2, y + p.Y2);
            case "pie":
            {
                double cx = x + w / 2, cy = y + h / 2;
                string ops = M(cx, cy) + L(
                    cx + w / 2 * Math.Cos(p.StartDeg * Math.PI / 180),
                    cy + h / 2 * Math.Sin(p.StartDeg * Math.PI / 180));
                ops += ArcOps(cx, cy, w / 2, h / 2, p.StartDeg, p.EndDeg, C);
                return ops + "h\n";
            }
            default:
                // re usa canto INFERIOR esquerdo no PDF
                return $"{F(x)} {F(pageH - (y + h))} {F(w)} {F(h)} re\n";
        }
    }

    /// <summary>Elipse completa em 4 beziers.</summary>
    private static string EllipseOps(
        double cx, double cy, double rx, double ry,
        Func<double, double, string> m,
        Func<double, double, double, double, double, double, string> c)
    {
        double kx = Kappa * rx, ky = Kappa * ry;
        return
            m(cx + rx, cy) +
            c(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry) +
            c(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy) +
            c(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry) +
            c(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy) + "h\n";
    }

    /// <summary>Arco elíptico startDeg→endDeg (horário, coords y-down) em beziers ≤90°.</summary>
    private static string ArcOps(
        double cx, double cy, double rx, double ry, double startDeg, double endDeg,
        Func<double, double, double, double, double, double, string> c)
    {
        var ops = new System.Text.StringBuilder();
        double total = endDeg - startDeg;
        int n = Math.Max(1, (int)Math.Ceiling(Math.Abs(total) / 90));
        double step = total / n;
        for (int i = 0; i < n; i++)
        {
            double a0 = (startDeg + i * step) * Math.PI / 180;
            double a1 = (startDeg + (i + 1) * step) * Math.PI / 180;
            double t = 4.0 / 3 * Math.Tan((a1 - a0) / 4);
            double c0 = Math.Cos(a0), s0 = Math.Sin(a0), c1 = Math.Cos(a1), s1 = Math.Sin(a1);
            ops.Append(c(
                cx + rx * (c0 - t * s0), cy + ry * (s0 + t * c0),
                cx + rx * (c1 + t * s1), cy + ry * (s1 - t * c1),
                cx + rx * c1, cy + ry * s1));
        }
        return ops.ToString();
    }

    /// <summary>q + matriz cm que aplica rot/flip da shape em torno do centro (coords PDF).</summary>
    private static string TransformCm(Shape sh, double x, double y, double w, double h, double pageH)
    {
        double cx = x + w / 2;
        double cy = pageH - (y + h / 2); // centro em coords PDF (y-up)
        // rotação DrawingML é horária (y-down); em coords PDF (y-up) o mesmo visual é -θ
        double theta = -((sh.Xfrm!.Rot ?? 0) / 60000) * Math.PI / 180;
        double sx = sh.Xfrm.FlipH == true ? -1 : 1;
        double sy = sh.Xfrm.FlipV == true ? -1 : 1;
        double cos = Math.Cos(theta), sin = Math.Sin(theta);
        // L = R(θ)·S — x' = a x + c y + e ; y' = b x + d y + f
        double a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
        double e = cx - (a * cx + c * cy);
        double f = cy - (b * cx + d * cy);
        return $"q\n{F(a)} {F(b)} {F(c)} {F(d)} {F(e)} {F(f)} cm\n";
    }

    /// <summary>Retângulo apenas com stroke (borda de imagem/chart).</summary>
    private static void StrokeRectRaw(PdfPage page, double x, double y, double w, double h, double pageH, PdfColor c, double lw)
    {
        page.Content.Str(
            $"{F(c.R)} {F(c.G)} {F(c.B)} RG\n{F(lw)} w\n[] 0 d\n" +
            $"{F(x)} {F(pageH - (y + h))} {F(w)} {F(h)} re S\n");
    }

    /// <summary>Padrão de dash do prstDash em pontos (proporcional à espessura, como no canvas).</summary>
    private static string DashArray(string prstDash, double lw)
    {
        double[] pat = prstDash switch
        {
            "dash" => new[] { 4.0, 3 },
            "lgDash" => new[] { 8.0, 3 },
            "dashDot" => new[] { 4.0, 3, 1, 3 },
            "lgDashDot" => new[] { 8.0, 3, 1, 3 },
            "lgDashDotDot" => new[] { 8.0, 3, 1, 3, 1, 3 },
            "dot" or "sysDot" => new[] { 1.0, 2 },
            "sysDash" => new[] { 3.0, 1 },
            "sysDashDot" => new[] { 3.0, 1, 1, 1 },
            "sysDashDotDot" => new[] { 3.0, 1, 1, 1, 1, 1 },
            _ => Array.Empty<double>(),
        };
        if (pat.Length == 0) return "[] 0 d\n";
        return $"[{string.Join(" ", pat.Select(v => F(v * lw)))}] 0 d\n";
    }

    /// <summary>
    /// Gradiente linear aproximado por GradStrips faixas sólidas interpoladas,
    /// recortadas pelo path da geometria (mesma reta/ângulo do canvas).
    /// </summary>
    private static void FillGradient(PdfPage page, PresetPath preset, Fill fill, double x, double y, double w, double h, double pageH)
    {
        var stops = fill.Stops!;
        double ang = (fill.AngleDeg ?? 0) * Math.PI / 180;
        double dx = Math.Cos(ang), dy = Math.Sin(ang); // direção em coords y-down
        double cx = x + w / 2, cy = y + h / 2;
        double half = (Math.Abs(dx) * w + Math.Abs(dy) * h) / 2;
        double len = 2 * half;
        double px = -dy, py = dx; // perpendicular
        double halfPerp = (Math.Abs(dy) * w + Math.Abs(dx) * h) / 2 + 1;

        PdfColor Lerp(double t)
        {
            var lo = stops[0];
            var hi = stops[^1];
            for (int i = 0; i < stops.Count - 1; i++)
            {
                if (t >= stops[i].Pos && t <= stops[i + 1].Pos) { lo = stops[i]; hi = stops[i + 1]; break; }
            }
            if (t <= stops[0].Pos) return PdfColor.Hex(stops[0].Color);
            if (t >= stops[^1].Pos) return PdfColor.Hex(stops[^1].Color);
            double f = hi.Pos > lo.Pos ? (t - lo.Pos) / (hi.Pos - lo.Pos) : 0;
            var a = PdfColor.Hex(lo.Color);
            var b = PdfColor.Hex(hi.Color);
            return new PdfColor(a.R + (b.R - a.R) * f, a.G + (b.G - a.G) * f, a.B + (b.B - a.B) * f);
        }

        var ops = new System.Text.StringBuilder($"q\n{PathOps(preset, x, y, w, h, pageH)}W n\n");
        for (int i = 0; i < GradStrips; i++)
        {
            double t0 = (double)i / GradStrips, t1 = (double)(i + 1) / GradStrips + 0.002;
            var c = Lerp((t0 + (double)(i + 1) / GradStrips) / 2);
            double s0 = -half + t0 * len, s1 = -half + Math.Min(1, t1) * len;
            var corners = new[]
            {
                (X: cx + dx * s0 + px * halfPerp, Y: cy + dy * s0 + py * halfPerp),
                (X: cx + dx * s1 + px * halfPerp, Y: cy + dy * s1 + py * halfPerp),
                (X: cx + dx * s1 - px * halfPerp, Y: cy + dy * s1 - py * halfPerp),
                (X: cx + dx * s0 - px * halfPerp, Y: cy + dy * s0 - py * halfPerp),
            };
            ops.Append($"{F(c.R)} {F(c.G)} {F(c.B)} rg\n");
            ops.Append($"{F(corners[0].X)} {F(pageH - corners[0].Y)} m\n");
            for (int k = 1; k < 4; k++) ops.Append($"{F(corners[k].X)} {F(pageH - corners[k].Y)} l\n");
            ops.Append("h f\n");
        }
        page.Content.Str(ops.Append("Q\n").ToString());
    }

    // ─────────────────────────── texto ───────────────────────────

    /// <summary>Largura de um texto em pt para uma variante/tamanho (métrica da TTF).</summary>
    private static double TextWidthPt(string text, FontVariant v, double sizePt)
    {
        long units = 0;
        foreach (int cp in XlsxPdf.CodePoints(text)) units += v.Program.AdvanceWidth(v.Program.GlyphId(cp));
        return units * sizePt / v.Program.UnitsPerEm;
    }

    /// <summary>Desenha uma string na página (baseline em pt do topo).</summary>
    private static void DrawString(PdfPage page, FontVariant v, double sizePt, PdfColor color, double xPt, double baselinePt, string text)
    {
        var glyphs = new List<PlacedGlyph>();
        double pen = xPt;
        double upem = v.Program.UnitsPerEm;
        foreach (int cp in XlsxPdf.CodePoints(text))
        {
            var (gid, advanceWidth) = v.Embedded.Encode(cp);
            glyphs.Add(new PlacedGlyph { Gid = gid, CodePoint = cp, XPt = pen, BaselineFromTopPt = baselinePt });
            pen += advanceWidth * sizePt / upem;
        }
        if (glyphs.Count > 0) page.Glyphs(v.Embedded, sizePt, color, glyphs);
    }

    /// <summary>
    /// Texto de uma shape: LayoutTextBody (word-wrap/autofit/âncora/bullets) com o
    /// Measurer de métricas TTF; cada PlacedRun vira glifos posicionados.
    /// </summary>
    private static void DrawTextBody(PdfPage page, Shape sh, TextBody tb, double xPt, double yPt, Func<bool, bool, FontVariant> pick)
    {
        bool isTitle = sh.PhType is "title" or "ctrTitle";
        double Measure(string text, LayoutFont f) => TextWidthPt(text, pick(f.Bold, f.Italic), f.SizePt);
        var layout = TextLayoutOps.LayoutTextBody(tb, sh.Xfrm!.Cx, sh.Xfrm.Cy, Measure, new LayoutTextOptions
        {
            DefaultSzPt = isTitle ? DefaultTitlePt : DefaultBodyPt,
            DefaultAnchor = isTitle ? "ctr" : "t",
        });
        foreach (var line in layout.Lines)
        {
            double baseline = yPt + Pt(line.Baseline);
            if (line.Bullet is not null)
            {
                var v = pick(line.Bullet.Font.Bold, line.Bullet.Font.Italic);
                DrawString(page, v, line.Bullet.Font.SizePt, PdfColor.Hex(line.Bullet.Color), xPt + Pt(line.Bullet.X), baseline, line.Bullet.Text);
            }
            foreach (var r in line.Runs)
            {
                var v = pick(r.Font.Bold, r.Font.Italic);
                var color = PdfColor.Hex(r.Color);
                double rx = xPt + Pt(r.X);
                DrawString(page, v, r.Font.SizePt, color, rx, baseline, r.Text);
                if (r.Underline)
                {
                    double uy = baseline + r.Font.SizePt * 0.12;
                    page.Line(rx, uy, rx + Pt(r.W), uy, color, Math.Max(0.5, r.Font.SizePt / 16));
                }
            }
        }
    }

    // ─────────────────────────── tabelas ───────────────────────────

    /// <summary>
    /// Tabela em pt (mesma lógica simplificada do canvas: fills → bordas → texto,
    /// 1 run por linha, âncora vertical da célula e alinhamento do parágrafo).
    /// </summary>
    private static void DrawTable(PdfPage page, Table t, double x, double y, double w, double h, double pageH, Func<bool, bool, FontVariant> pick)
    {
        bool allZeroRows = t.Rows.All(r => r.HeightEmu == 0);
        var rowHs = allZeroRows ? t.Rows.Select(_ => 1.0).ToArray() : t.Rows.Select(r => Math.Max((double)r.HeightEmu, 1)).ToArray();
        double totalColEmu = t.ColWidthsEmu.Sum();
        if (totalColEmu == 0) totalColEmu = 1;
        double totalRowEmu = rowHs.Sum();
        if (totalRowEmu == 0) totalRowEmu = 1;
        double sx = w / totalColEmu;
        double sy = h / totalRowEmu;
        var colX = new List<double> { 0 };
        foreach (long cw in t.ColWidthsEmu) colX.Add(colX[^1] + cw * sx);
        var rowY = new List<double> { 0 };
        foreach (double rh in rowHs) rowY.Add(rowY[^1] + rh * sy);

        // fundo branco geral
        page.FillRect(x, y, w, h, new PdfColor(1, 1, 1));

        var boxes = new List<(double Cx0, double Cy0, double Cw, double Ch, TableCell Cell)>();
        for (int ri = 0; ri < t.Rows.Count; ri++)
        {
            var row = t.Rows[ri];
            for (int ci = 0; ci < row.Cells.Count; ci++)
            {
                var cell = row.Cells[ci];
                if (cell.HMerge || cell.VMerge) continue;
                int span = cell.GridSpan ?? 1;
                int rspan = cell.RowSpan ?? 1;
                boxes.Add((
                    x + colX[ci],
                    y + rowY[ri],
                    (ci + span < colX.Count ? colX[ci + span] : colX[^1]) - colX[ci],
                    (ri + rspan < rowY.Count ? rowY[ri + rspan] : rowY[^1]) - rowY[ri],
                    cell));
            }
        }

        foreach (var b in boxes)
        {
            if (b.Cell.FillColor is not null) page.FillRect(b.Cx0, b.Cy0, b.Cw, b.Ch, PdfColor.Hex(b.Cell.FillColor));
        }
        foreach (var b in boxes)
        {
            double lw = Math.Max(0.4, Pt(b.Cell.BorderWidth ?? 6350));
            StrokeRectRaw(page, b.Cx0, b.Cy0, b.Cw, b.Ch, pageH, PdfColor.Hex(b.Cell.BorderColor ?? "#CBD5E1"), lw);
        }
        double pad = 45720 * Math.Min(sx, sy); // 0.05in (EMU) na escala pt/EMU da tabela
        foreach (var b in boxes)
        {
            if (b.Cell.TxBody is null) continue;
            var lines = new List<(string Text, FontVariant V, double Size, PdfColor Color, string Align)>();
            foreach (var p in b.Cell.TxBody.Paragraphs)
            {
                var runs = p.Runs.Count > 0 ? p.Runs : new List<Run> { new() };
                foreach (var r in runs)
                {
                    lines.Add((
                        r.Text,
                        pick(r.Bold ?? false, r.Italic ?? false),
                        r.Sz ?? 12,
                        PdfColor.Hex(r.Color ?? "#1f1f1f"),
                        p.Align ?? "l"));
                }
            }
            double lineH = (lines.Count > 0 ? lines[0].Size : 12) * 1.2;
            double totalH = lines.Count * lineH;
            string anchor = b.Cell.Anchor ?? "ctr";
            double cy = b.Cy0 + pad;
            if (anchor == "ctr") cy = b.Cy0 + (b.Ch - totalH) / 2;
            else if (anchor == "b") cy = b.Cy0 + b.Ch - totalH - pad;
            foreach (var l in lines)
            {
                double asc = (double)l.V.Program.AscenderVal / l.V.Program.UnitsPerEm * l.Size;
                double tw = TextWidthPt(l.Text, l.V, l.Size);
                double tx;
                if (l.Align == "ctr") tx = b.Cx0 + (b.Cw - tw) / 2;
                else if (l.Align == "r") tx = b.Cx0 + b.Cw - tw - pad;
                else tx = b.Cx0 + pad;
                DrawString(page, l.V, l.Size, l.Color, tx, cy + asc, l.Text);
                cy += lineH;
            }
        }
    }

    // ─────────────────────────── imagens ───────────────────────────

    /// <summary>Embute uma ImageRef no documento (cache por part). null = sem suporte.</summary>
    private static PdfImage? EmbedImage(PdfDocument doc, Dictionary<string, PdfImage?> cache, ImageRef imgRef)
    {
        if (cache.TryGetValue(imgRef.Part, out var cached)) return cached;
        PdfImage? img = null;
        if (imgRef.Mime == "image/jpeg")
        {
            var size = Raster.JpegSize(imgRef.Bytes);
            if (size is { } s) img = doc.EmbedJpeg(imgRef.Bytes, s.Width, s.Height);
        }
        else if (imgRef.Mime == "image/png")
        {
            var png = Raster.DecodePng(imgRef.Bytes);
            if (png is not null) img = doc.EmbedRgba(png.Rgba, png.Width, png.Height);
        }
        // gif/svg/webp/bmp (ou decode falho): fica null → placeholder cinza
        cache[imgRef.Part] = img;
        return img;
    }

    /// <summary>Desenha uma ImageRef no rect (crop srcRect via clip + rect expandido).</summary>
    private static void DrawImageRef(
        PdfPage page, PdfDocument doc, Dictionary<string, PdfImage?> cache, ImageRef imgRef,
        double x, double y, double w, double h, SrcRect? srcRect = null)
    {
        var img = EmbedImage(doc, cache, imgRef);
        if (img is null)
        {
            page.FillRect(x, y, w, h, Placeholder); // formato não suportado: placeholder silencioso
            return;
        }
        if (srcRect is not null)
        {
            double visW = Math.Max(0.0001, 1 - srcRect.L - srcRect.R);
            double visH = Math.Max(0.0001, 1 - srcRect.T - srcRect.B);
            double fullW = w / visW;
            double fullH = h / visH;
            double x0 = x - srcRect.L * fullW;
            double y0 = y - srcRect.T * fullH;
            page.Content.Str($"q\n{F(x)} {F(page.HeightPt - (y + h))} {F(w)} {F(h)} re W n\n");
            page.DrawImage(img, x0, y0, fullW, fullH);
            page.Content.Str("Q\n");
        }
        else
        {
            page.DrawImage(img, x, y, w, h);
        }
    }
}
