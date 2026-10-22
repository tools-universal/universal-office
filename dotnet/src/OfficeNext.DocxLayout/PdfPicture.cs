using OfficeNext.DrawingML;
using OfficeNext.Pdf;
using Raster = OfficeNext.DrawingML.Raster;

namespace OfficeNext.DocxLayout;

/// <summary>O que o pintor do PDF oferece ao desenho da imagem formatada.</summary>
public sealed class PdfPictureEnv
{
    /// <summary>a imagem embutida como está (JPEG direto, raster com /SMask)</summary>
    public required Func<PdfImage?> Image { get; init; }
    /// <summary>pixels RGBA da imagem (com os ajustes de cor), ou null (JPEG sem decodificador)</summary>
    public required Func<Rgba?> Rgba { get; init; }
    /// <summary>a imagem com uma máscara suave nova cobrindo a imagem inteira (bordas suaves/reflexo em JPEG)</summary>
    public required Func<byte[], int, int, PdfImage?> Masked { get; init; }
    public required Func<byte[], int, int, PdfImage> EmbedRgba { get; init; }
}

/// <summary>
/// Imagem com Formato da Imagem no PDF — porta de docx-layout/src/pdf-picture.ts, a
/// mesma composição do canvas (canvas-picture.ts), como o Word grava: a imagem
/// original (recortada pela forma) e cada efeito como um raster RGBA à parte com
/// máscara suave (sombra, brilho, reflexo, sombra interna), o contorno como caminho
/// (todo de fora) e as bordas suaves como /SMask da própria imagem. Tudo no
/// referencial da imagem (antes do giro) e girado em volta do centro.
/// </summary>
public static class PdfPicture
{
    private const double T = 20;

    /// <summary>Resolução dos rasters dos efeitos (pt → px): 200 ppp, como o Word nos efeitos finos.</summary>
    private const double PPT = 200.0 / 72;

    private static List<IReadOnlyList<PathSeg>> ShapeSubs(PictureLook? look, double w, double h, bool flipH, bool flipV)
    {
        var o = PresetOutline.Of(look?.Geom?.Prst, w, h, look?.Geom?.Adj);
        var subs = new List<IReadOnlyList<PathSeg>>();
        for (int i = 0; i < o.Subs.Count; i++) if (i >= o.Fill.Count || o.Fill[i]) subs.Add(o.Subs[i]);
        if (!flipH && !flipV) return subs;
        double Fx(double x) => flipH ? w - x : x;
        double Fy(double y) => flipV ? h - y : y;
        return subs.Select(sub => (IReadOnlyList<PathSeg>)sub.Select(s => s.C switch
        {
            'M' or 'L' => s with { X = Fx(s.X), Y = Fy(s.Y) },
            'C' => s with { X1 = Fx(s.X1), Y1 = Fy(s.Y1), X2 = Fx(s.X2), Y2 = Fy(s.Y2), X = Fx(s.X), Y = Fy(s.Y) },
            'Q' => s with { X1 = Fx(s.X1), Y1 = Fy(s.Y1), X = Fx(s.X), Y = Fy(s.Y) },
            'E' => FlipArc(s, Fx, Fy, flipH, flipV),
            _ => s,
        }).ToList()).ToList();
    }

    private static PathSeg FlipArc(PathSeg s, Func<double, double> fx, Func<double, double> fy, bool flipH, bool flipV)
    {
        double a0 = flipH ? Math.PI - s.A0 : s.A0, a1 = flipH ? Math.PI - s.A1 : s.A1;
        return s with { Cx = fx(s.Cx), Cy = fy(s.Cy), A0 = flipV ? -a0 : a0, A1 = flipV ? -a1 : a1, Ccw = flipH != flipV ? !s.Ccw : s.Ccw };
    }

    private static (double R, double G, double B) Rgb(string hex)
    {
        double P(int i) => OfficeNext.Core.JsNumber.ParseInt(i < hex.Length ? hex.Substring(i, Math.Min(2, hex.Length - i)) : "", 16);
        return (P(0), P(2), P(4));
    }

    /// <summary>Valor gravado num Uint8Array do JS (inteiro já arredondado; NaN → 0).</summary>
    private static byte U8(double v) => double.IsNaN(v) ? (byte)0 : (byte)((long)v & 0xFF);

    private static byte[] Colored(Mask m, string hex, double alpha)
    {
        var outp = new byte[m.W * m.H * 4];
        var (r, g, b) = Rgb(hex);
        for (int i = 0; i < m.A.Length; i++)
        {
            outp[i * 4] = U8(r); outp[i * 4 + 1] = U8(g); outp[i * 4 + 2] = U8(b);
            outp[i * 4 + 3] = U8(OfficeNext.Core.JsNumber.Round(Math.Max(0, Math.Min(1, m.A[i] * alpha)) * 255));
        }
        return outp;
    }

    /// <summary>Caixa (pt, relativa ao canto da imagem) que os efeitos ocupam (como no canvas).</summary>
    private static (double X0, double Y0, double X1, double Y1) Bounds(PictureLook look, double w, double h)
    {
        double x0 = 0, y0 = 0, x1 = w, y1 = h;
        void Grow(double a, double b, double c, double d) { x0 = Math.Min(x0, a); y0 = Math.Min(y0, b); x1 = Math.Max(x1, c); y1 = Math.Max(y1, d); }
        if (look.Line is { } ln) { double lw = ln.WidthPt; Grow(-lw, -lw, w + lw, h + lw); }
        if (look.Glow is { } gl) { double r = gl.RadPt; Grow(-r, -r, w + r, h + r); }
        var s = look.Shadow;
        if (s?.Kind == "outer")
        {
            double a = (s.DirDeg * Math.PI) / 180, dx = s.DistPt * Math.Cos(a), dy = s.DistPt * Math.Sin(a);
            double sx = Math.Abs(s.Sx ?? 1), sy = Math.Abs(s.Sy ?? 1);
            double k = Math.Abs(Math.Tan(((s.KxDeg ?? 0) * Math.PI) / 180)) * h + Math.Abs(Math.Tan(((s.KyDeg ?? 0) * Math.PI) / 180)) * w;
            double m = s.BlurPt + k + Math.Max(w, h) * Math.Max(0, Math.Max(sx, sy) - 1);
            double flip = s.Sy is { } ssy && ssy < 0 ? h : 0;
            Grow(dx - m, dy - m - flip, w + dx + m, h + dy + m + flip);
        }
        var rf = look.Reflection;
        if (rf is not null)
        {
            double a = (rf.DirDeg * Math.PI) / 180;
            double dx = rf.DistPt * Math.Cos(a), dy = rf.DistPt * Math.Sin(a);
            double lw = look.Line?.WidthPt ?? 0;
            Grow(dx - rf.BlurPt - lw, h + dy - rf.BlurPt, w + dx + rf.BlurPt + lw, 2 * h + dy + rf.BlurPt + lw);
        }
        return (x0, y0, x1, y1);
    }

    private static readonly Dictionary<string, double[]> Dash = new(StringComparer.Ordinal)
    {
        ["sysDot"] = new double[] { 1, 1 }, ["sysDash"] = new double[] { 3, 1 }, ["dash"] = new double[] { 4, 3 },
        ["dashDot"] = new double[] { 4, 3, 1, 3 }, ["lgDash"] = new double[] { 8, 3 }, ["lgDashDot"] = new double[] { 8, 3, 1, 3 },
        ["lgDashDotDot"] = new double[] { 8, 3, 1, 3, 1, 3 }, ["sysDashDot"] = new double[] { 3, 1, 1, 1 }, ["sysDashDotDot"] = new double[] { 3, 1, 1, 1, 1, 1 },
    };

    private static bool Nz(double? v) => v is { } x && x != 0 && !double.IsNaN(x);

    /// <summary>
    /// Forma com Efeitos de Forma no PDF: o corpo continua vetorial (<paramref name="drawBody"/>),
    /// os efeitos vão como rasters RGBA (como o Word grava os efeitos): sombra externa e brilho
    /// atrás, reflexo (a silhueta na cor do preenchimento, espelhada com o degradê), sombra
    /// interna por cima (só com preenchimento: sem ele o Word não a mostra). Com bordas suaves o
    /// corpo vira raster (a cor do preenchimento com a máscara). Porta de paintShapeEffectsPdf.
    /// </summary>
    public static void PaintShapeEffectsPdf(PdfPage page, ShapeItem it, Func<byte[], int, int, PdfImage> embedRgba, Action drawBody)
    {
        var fx = it.Fx ?? new PictureLook();
        var st = it.Style;
        double w = it.W / T, h = it.H / T;
        double rotDeg = st.Rot ?? 0;
        double rot = (rotDeg * Math.PI) / 180, cos = Math.Cos(rot), sin = Math.Sin(rot);
        double cx = it.X / T + w / 2, cy = it.Y / T + h / 2;
        var M = new Affine(cos, sin, -sin, cos, cx - (cos * w) / 2 + (sin * h) / 2, cy - (sin * w) / 2 - (cos * h) / 2);
        Affine RectMatrix(double x, double y, double rw, double rh) =>
            new(M.A * rw, M.B * rw, M.C * rh, M.D * rh, M.A * x + M.C * y + M.E, M.B * x + M.D * y + M.F);
        void Draw(PdfImage img, Affine m) => page.DrawImageMatrix(img, m.A, m.B, m.C, m.D, m.E, m.F);
        // (o contorno é centrado na borda: a camada leva a metade de fora)
        double lw0 = it.Stroke?.WidthPt ?? 0;
        var look = new PictureLook
        {
            Shadow = fx.Shadow, Glow = fx.Glow, SoftEdgePt = fx.SoftEdgePt, Reflection = fx.Reflection,
            Geom = new PicGeomLook { Prst = st.Geom == "custom" ? "rect" : st.Geom, Adj = st.Adj },
            Line = lw0 != 0 ? new PicLineLook { Color = "000000", Alpha = 1, WidthPt = lw0 / 2 } : null,
        };
        var bb = Bounds(look, w, h);
        double ppt = PPT;
        double area = (bb.X1 - bb.X0) * (bb.Y1 - bb.Y0) * ppt * ppt;
        if (area > 8e6) ppt *= Math.Sqrt(8e6 / area);
        int W = (int)Math.Max(1, Math.Ceiling((bb.X1 - bb.X0) * ppt)), H = (int)Math.Max(1, Math.Ceiling((bb.Y1 - bb.Y0) * ppt));
        double ox = -bb.X0 * ppt, oy = -bb.Y0 * ppt;
        var subs = ShapeSubs(look, w, h, st.FlipH == true, st.FlipV == true);
        var area0 = Raster.FillPolygons(Raster.NewMask(W, H), Raster.FlattenPath(subs, new Affine(ppt, 0, 0, ppt, ox, oy), 0.35));
        // a silhueta é o que a forma pinta: a área (com preenchimento) ou só o anel do contorno
        // (sem preenchimento — o brilho e a sombra seguem a linha, como no Word)
        bool filled = !string.IsNullOrEmpty(it.Fill) || it.Grad is not null || it.Pattern is not null || it.Blip is not null;
        double lwPx = (it.Stroke?.WidthPt ?? 0) * ppt;
        var sil = area0;
        if (!filled && lwPx > 0)
        {
            double rr = Math.Max(1, lwPx / 2);
            Mask outer = Raster.Morph(area0, rr), inner = Raster.Morph(area0, -rr);
            sil = Raster.NewMask(W, H);
            for (int i = 0; i < sil.A.Length; i++) sil.A[i] = (float)Math.Max(0, (double)outer.A[i] - (double)inner.A[i]);
        }
        var box = new Box(ox, oy, w * ppt, h * ppt);
        var layerMatrix = RectMatrix(bb.X0, bb.Y0, W / ppt, H / ppt);
        string fillHex = it.Fill ?? (it.Grad is { Stops.Count: > 0 } g ? g.Stops[0].Color : null) ?? it.Pattern?.Fg ?? it.Stroke?.Color ?? "FFFFFF";
        var s = fx.Shadow;
        if (s?.Kind == "outer")
        {
            double dir = s.RotWithShape == true ? s.DirDeg : s.DirDeg - rotDeg;
            var m = Effects.OuterShadowMask(sil, box, new ShadowSpec(s.BlurPt, s.DistPt, dir, s.Sx, s.Sy, s.KxDeg, s.KyDeg, s.Algn), ppt);
            Draw(embedRgba(Colored(m, s.Color, s.Alpha), W, H), layerMatrix);
        }
        if (fx.Glow is { } glow) Draw(embedRgba(Colored(Effects.GlowMask(sil, glow.RadPt, ppt), glow.Color, glow.Alpha), W, H), layerMatrix);
        var soft = Nz(fx.SoftEdgePt) ? Effects.SoftEdgeMask(sil, fx.SoftEdgePt!.Value, ppt) : null;
        var r = fx.Reflection;
        if (r is not null)
        {
            // a silhueta (com as bordas suaves) espelhada em volta da borda de baixo, com o degradê
            double a = (r.DirDeg * Math.PI) / 180;
            double dx = r.DistPt * Math.Cos(a) * ppt, dy = r.DistPt * Math.Sin(a) * ppt;
            var m = Raster.NewMask(W, H);
            var src = soft ?? sil;
            double top = oy + h * ppt + dy;
            for (int y = 0; y < H; y++)
            {
                double sy = OfficeNext.Core.JsNumber.Round(2 * (oy + h * ppt) + dy - y - 1);
                double t = (y + 0.5 - top) / (h * ppt);
                double al = t < 0 ? 0 : Effects.ReflectionAlpha(t, r.StA, r.StPos, r.EndA, r.EndPos);
                if (sy < 0 || sy >= H || al <= 0) continue;
                int syi = (int)sy;
                for (int x = 0; x < W; x++)
                {
                    double sx = OfficeNext.Core.JsNumber.Round(x - dx);
                    if (sx >= 0 && sx < W) m.A[y * W + x] = (float)(src.A[syi * W + (int)sx] * al);
                }
            }
            if (r.BlurPt > 0) m = Raster.GaussianBlur(m, (r.BlurPt / 3) * ppt);
            Draw(embedRgba(Colored(m, fillHex, 1), W, H), layerMatrix);
        }
        if (soft is not null) Draw(embedRgba(Colored(soft, fillHex, st.FillAlpha ?? 1), W, H), layerMatrix);
        else drawBody();
        if (s?.Kind == "inner" && filled)
        {
            var m = Effects.InnerShadowMask(sil, s.BlurPt, s.DistPt, s.DirDeg, ppt);
            Draw(embedRgba(Colored(m, s.Color, s.Alpha), W, H), layerMatrix);
        }
    }

    /// <summary>Desenha a imagem formatada no PDF.</summary>
    public static void PaintPicturePdf(PdfPage page, ImageItem it, PdfPictureEnv env)
    {
        var look = it.Pic ?? new PictureLook();
        double w = it.W / T, h = it.H / T;
        double rotDeg = it.Rot ?? 0;
        // local (pt, canto da imagem) → página (pt, a partir do topo): giro no centro
        double rot = (rotDeg * Math.PI) / 180, cos = Math.Cos(rot), sin = Math.Sin(rot);
        double cx = it.X / T + w / 2, cy = it.Y / T + h / 2;
        var M = new Affine(cos, sin, -sin, cos, cx - (cos * w) / 2 + (sin * h) / 2, cy - (sin * w) / 2 - (cos * h) / 2);
        (double, double) P(double x, double y) => (M.A * x + M.C * y + M.E, M.B * x + M.D * y + M.F);
        // retângulo local → matriz do quadrado unitário na página
        Affine RectMatrix(double x, double y, double rw, double rh) =>
            new(M.A * rw, M.B * rw, M.C * rh, M.D * rh, M.A * x + M.C * y + M.E, M.B * x + M.D * y + M.F);
        void Draw(PdfImage img, Affine m) => page.DrawImageMatrix(img, m.A, m.B, m.C, m.D, m.E, m.F);

        var subs = ShapeSubs(look, w, h, it.FlipH, it.FlipV);
        var polysLocal = Raster.FlattenPath(subs, new Affine(1, 0, 0, 1, 0, 0), 0.2);
        List<PathCmd> Cmds(List<double[]> polys)
        {
            var outp = new List<PathCmd>();
            foreach (var p in polys)
            {
                for (int i = 0; i < p.Length; i += 2)
                {
                    var (x, y) = P(p[i], p[i + 1]);
                    outp.Add(i > 0 ? PathCmd.L(x, y) : PathCmd.M(x, y));
                }
                outp.Add(PathCmd.Z);
            }
            return outp;
        }

        var bb = Bounds(look, w, h);
        double ppt = PPT;
        double area = (bb.X1 - bb.X0) * (bb.Y1 - bb.Y0) * ppt * ppt;
        if (area > 8e6) ppt *= Math.Sqrt(8e6 / area);
        int W = (int)Math.Max(1, Math.Ceiling((bb.X1 - bb.X0) * ppt)), H = (int)Math.Max(1, Math.Ceiling((bb.Y1 - bb.Y0) * ppt));
        double ox = -bb.X0 * ppt, oy = -bb.Y0 * ppt;
        bool needSil = look.Shadow is not null || look.Glow is not null || Nz(look.SoftEdgePt);
        var sil = needSil ? Raster.FillPolygons(Raster.NewMask(W, H), Raster.FlattenPath(subs, new Affine(ppt, 0, 0, ppt, ox, oy), 0.35)) : null;
        var box = new Box(ox, oy, w * ppt, h * ppt);
        var layerMatrix = RectMatrix(bb.X0, bb.Y0, W / ppt, H / ppt);

        // 1) sombra externa e brilho (atrás)
        var s = look.Shadow;
        if (s?.Kind == "outer" && sil is not null)
        {
            double dir = s.RotWithShape == true ? s.DirDeg : s.DirDeg - rotDeg;
            var m = Effects.OuterShadowMask(sil, box, new ShadowSpec(s.BlurPt, s.DistPt, dir, s.Sx, s.Sy, s.KxDeg, s.KyDeg, s.Algn), ppt);
            Draw(env.EmbedRgba(Colored(m, s.Color, s.Alpha), W, H), layerMatrix);
        }
        if (look.Glow is { } glow && sil is not null)
            Draw(env.EmbedRgba(Colored(Effects.GlowMask(sil, glow.RadPt, ppt), glow.Color, glow.Alpha), W, H), layerMatrix);

        // a imagem inteira (sem recorte) no referencial local
        var crop = it.Crop ?? new OfficeNext.Docx.ImageCrop();
        double fw = w / Math.Max(0.01, 1 - crop.L - crop.R), fh = h / Math.Max(0.01, 1 - crop.T - crop.B);
        double fx0 = -crop.L * fw, fy0 = -crop.T * fh;
        // espelho: o quadro da imagem inteira refletido dentro da caixa
        Affine ImgRect()
        {
            double x = it.FlipH ? w - fx0 - fw : fx0, y = it.FlipV ? h - fy0 - fh : fy0;
            return RectMatrix(it.FlipH ? x + fw : x, it.FlipV ? y + fh : y, it.FlipH ? -fw : fw, it.FlipV ? -fh : fh);
        }
        // máscara das bordas suaves sobre a IMAGEM INTEIRA (o /SMask cobre o quadrado unitário dela)
        (byte[] Alpha, int Width, int Height)? SoftMask()
        {
            if (!Nz(look.SoftEdgePt) || sil is null) return null;
            var m = Effects.SoftEdgeMask(sil, look.SoftEdgePt!.Value, ppt);
            int iw = (int)Math.Max(1, OfficeNext.Core.JsNumber.Round(fw * ppt)), ih = (int)Math.Max(1, OfficeNext.Core.JsNumber.Round(fh * ppt));
            var alpha = new byte[iw * ih];
            for (int y = 0; y < ih; y++)
            {
                for (int x = 0; x < iw; x++)
                {
                    // pixel da imagem (com espelho) → camada
                    double lx = (it.FlipH ? w - (fx0 + (x + 0.5) / ppt) : fx0 + (x + 0.5) / ppt) * ppt + ox;
                    double ly = (it.FlipV ? h - (fy0 + (y + 0.5) / ppt) : fy0 + (y + 0.5) / ppt) * ppt + oy;
                    double xi = Math.Floor(lx), yi = Math.Floor(ly);
                    alpha[y * iw + x] = !(xi >= 0) || !(yi >= 0) || xi >= W || yi >= H ? (byte)0 : U8(OfficeNext.Core.JsNumber.Round(m.A[(int)yi * W + (int)xi] * 255.0));
                }
            }
            return (alpha, iw, ih);
        }

        // 2) reflexo: a imagem espelhada com o degradê (e a forma), a `dist` na direção `dir`
        var r = look.Reflection;
        if (r is not null)
        {
            double a = (r.DirDeg * Math.PI) / 180;
            double dy = r.DistPt * Math.Sin(a), dx = r.DistPt * Math.Cos(a);
            int iw = (int)Math.Max(1, OfficeNext.Core.JsNumber.Round(fw * ppt)), ih = (int)Math.Max(1, OfficeNext.Core.JsNumber.Round(fh * ppt));
            var alpha = new byte[iw * ih];
            var shapeM = Raster.FillPolygons(Raster.NewMask(iw, ih), Raster.FlattenPath(subs, new Affine(ppt, 0, 0, ppt, -fx0 * ppt, -fy0 * ppt), 0.35));
            var soft = Nz(look.SoftEdgePt) ? Effects.SoftEdgeMask(shapeM, look.SoftEdgePt!.Value, ppt) : shapeM;
            for (int y = 0; y < ih; y++)
            {
                // linha y da imagem espelhada: t medido a partir da borda de baixo da caixa
                double ly = fy0 + (y + 0.5) / ppt;
                double t = (h - ly) / h;
                double al = Effects.ReflectionAlpha(t, r.StA, r.StPos, r.EndA, r.EndPos);
                for (int x = 0; x < iw; x++) alpha[y * iw + x] = U8(OfficeNext.Core.JsNumber.Round(soft.A[y * iw + x] * al * 255));
            }
            var rimg = env.Masked(alpha, iw, ih);
            if (rimg is not null)
            {
                // espelho vertical em volta da borda de baixo da caixa
                Draw(rimg, RectMatrix(fx0 + dx, 2 * h - fy0 + dy, fw, -fh));
            }
        }

        // 3') chanfro: a imagem vira um raster da camada com a luz 3D (e a forma/bordas
        // suaves no alfa), como o Word grava
        var src = look.Bevel is not null ? env.Rgba() : null;
        bool beveled = look.Bevel is not null && src is not null;
        if (look.Bevel is { } bv && src is not null)
        {
            var shapeM = sil ?? Raster.FillPolygons(Raster.NewMask(W, H), Raster.FlattenPath(subs, new Affine(ppt, 0, 0, ppt, ox, oy), 0.35));
            var alphaM = Nz(look.SoftEdgePt) ? Effects.SoftEdgeMask(shapeM, look.SoftEdgePt!.Value, ppt) : shapeM;
            var px = new byte[W * H * 4];
            for (int y = 0; y < H; y++)
            {
                for (int x = 0; x < W; x++)
                {
                    int k = y * W + x;
                    if (shapeM.A[k] <= 0) continue;
                    // pixel da camada → ponto da imagem inteira (corte e espelho)
                    double lx = (x + 0.5 - ox) / ppt, ly = (y + 0.5 - oy) / ppt;
                    if (it.FlipH) lx = w - lx;
                    if (it.FlipV) ly = h - ly;
                    double u = (lx - fx0) / fw, v = (ly - fy0) / fh;
                    if (!(u >= 0) || !(v >= 0) || u >= 1 || v >= 1) continue;
                    int si = ((int)Math.Min(src.Height - 1, Math.Floor(v * src.Height)) * src.Width + (int)Math.Min(src.Width - 1, Math.Floor(u * src.Width))) * 4;
                    px[k * 4] = src.Data[si]; px[k * 4 + 1] = src.Data[si + 1]; px[k * 4 + 2] = src.Data[si + 2];
                    px[k * 4 + 3] = U8(OfficeNext.Core.JsNumber.Round(src.Data[si + 3] * Math.Min(1, (double)alphaM.A[k])));
                }
            }
            Bevel.ShadeBevel(px, shapeM, new BevelSpec(bv.WPt * ppt, bv.HPt * ppt, bv.Prst, bv.Rig, bv.Dir, bv.Material, Word: true));
            Draw(env.EmbedRgba(px, W, H), layerMatrix);
        }

        // 3) a imagem recortada pela forma (bordas suaves como /SMask)
        var sm = beveled ? null : SoftMask();
        var img = beveled ? null : sm is { } smv ? env.Masked(smv.Alpha, smv.Width, smv.Height) : env.Image();
        if (img is not null)
        {
            page.PushClipPath(Cmds(polysLocal));
            Draw(img, ImgRect());
            page.PopClip();
        }

        // 4) sombra interna (dentro da forma)
        if (s?.Kind == "inner" && sil is not null)
        {
            var m = Effects.InnerShadowMask(sil, s.BlurPt, s.DistPt, s.DirDeg, ppt);
            Draw(env.EmbedRgba(Colored(m, s.Color, s.Alpha), W, H), layerMatrix);
        }

        // 5) contorno todo de fora: traço de 2w recortado pelo lado de fora da forma
        var ln = look.Line;
        if (ln is not null && ln.WidthPt > 0)
        {
            var outer = new List<PathCmd>();
            var big = new (double X, double Y)[] { (bb.X0 - 10, bb.Y0 - 10), (bb.X1 + 10, bb.Y0 - 10), (bb.X1 + 10, bb.Y1 + 10), (bb.X0 - 10, bb.Y1 + 10) };
            for (int i = 0; i < big.Length; i++)
            {
                var (px, py) = P(big[i].X, big[i].Y);
                outer.Add(i > 0 ? PathCmd.L(px, py) : PathCmd.M(px, py));
            }
            outer.Add(PathCmd.Z);
            page.PushClipPath(outer.Concat(Cmds(polysLocal)).ToList(), true);
            double[]? dash = !string.IsNullOrEmpty(ln.Dash) && Dash.TryGetValue(ln.Dash, out var dd) ? dd.Select(v => v * ln.WidthPt).ToArray() : null;
            var (cr, cg, cb) = Rgb(ln.Color);
            var stroke = new PathStroke(new PdfColor(cr / 255, cg / 255, cb / 255), 2 * ln.WidthPt, dash);
            page.WithAlpha(null, ln.Alpha < 1 ? ln.Alpha : null, () => page.Path(Cmds(polysLocal), null, stroke));
            page.PopClip();
        }
    }
}
