using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>Onde o degradê começa e termina: axial (do ponto 0 ao 1) ou radial (centro, raio 0 → R).</summary>
public sealed record GradGeom(bool Radial, double X0, double Y0, double X1, double Y1, double R);

/// <summary>
/// Geometrias predefinidas do DrawingML (presetShapeDefinitions.xml) usadas nos
/// documentos do Word: caminho no quadro local (0..w × 0..h, twips), com os
/// ajustes (a:avLst, "val N") do arquivo ou os padrões da especificação. Depois
/// vêm espelho (flipH/flipV, dentro do quadro) e rotação (em torno do centro) —
/// a ordem do Word. Geometrias desconhecidas: retângulo. Porta de
/// docx-layout/src/geometry.ts (degradês, grupos girados e a:custGeom também).
/// </summary>
public static class Geometry
{
    private const double K = 0.5522847498;

    /// <summary>Arco elíptico (ângulos em graus, sentido horário na tela) a partir do ponto atual.</summary>
    private static (double X, double Y) ArcTo(List<PathCmdTw> outp, (double X, double Y) cur, double wR, double hR, double stDeg, double swDeg)
    {
        double st = (stDeg * Math.PI) / 180, sw = (swDeg * Math.PI) / 180;
        double cx = cur.X - wR * Math.Cos(st), cy = cur.Y - hR * Math.Sin(st);
        int n = (int)Math.Max(1, Math.Ceiling(Math.Abs(swDeg) / 90 - 1e-9));
        double d = sw / n, k = (4.0 / 3) * Math.Tan(d / 4);
        double a = st, x = cur.X, y = cur.Y;
        for (int i = 0; i < n; i++)
        {
            double b = a + d;
            double x2 = cx + wR * Math.Cos(b), y2 = cy + hR * Math.Sin(b);
            outp.Add(PathCmdTw.C(
                x - k * wR * Math.Sin(a), y + k * hR * Math.Cos(a),
                x2 + k * wR * Math.Sin(b), y2 - k * hR * Math.Cos(b),
                x2, y2));
            a = b; x = x2; y = y2;
        }
        return (x, y);
    }

    private static List<PathCmdTw> Poly((double X, double Y)[] pts, bool close = true)
    {
        var outp = new List<PathCmdTw>();
        for (int i = 0; i < pts.Length; i++) outp.Add(i > 0 ? PathCmdTw.L(pts[i].X, pts[i].Y) : PathCmdTw.M(pts[i].X, pts[i].Y));
        if (close) outp.Add(PathCmdTw.Z());
        return outp;
    }

    /// <summary>Math.max(lo, Math.min(hi, v))</summary>
    private static double Pin(double lo, double v, double hi) => JsMax(lo, JsMin(hi, v));

    private static double JsMax(double a, double b) => double.IsNaN(a) || double.IsNaN(b) ? double.NaN : Math.Max(a, b);
    private static double JsMin(double a, double b) => double.IsNaN(a) || double.IsNaN(b) ? double.NaN : Math.Min(a, b);

    /// <summary>Caminho local (sem espelho/rotação). adj: valores "val" do a:avLst.</summary>
    public static List<PathCmdTw> PresetPathLocal(string prst, double w, double h, IReadOnlyDictionary<string, double>? adj = null)
    {
        double ss = JsMin(w, h), hc = w / 2, vc = h / 2;
        double Av(string name, double def) =>
            adj is not null && adj.TryGetValue(name, out var v) ? v
            : name == "adj1" && adj is not null && adj.TryGetValue("adj", out var a0) ? a0 : def;
        switch (prst)
        {
            case "triangle":
                {
                    double a = Pin(0, Av("adj", 50000), 100000);
                    return Poly(new[] { (0.0, h), ((w * a) / 100000, 0.0), (w, h) });
                }
            case "rtTriangle": return Poly(new[] { (0.0, 0.0), (w, h), (0.0, h) });
            case "diamond": return Poly(new[] { (0.0, vc), (hc, 0.0), (w, vc), (hc, h) });
            case "parallelogram":
                {
                    double a = Pin(0, Av("adj", 25000), (100000 * w) / ss), x2 = (ss * a) / 100000;
                    return Poly(new[] { (0.0, h), (x2, 0.0), (w, 0.0), (w - x2, h) });
                }
            case "trapezoid":
                {
                    double a = Pin(0, Av("adj", 25000), (50000 * w) / ss), x2 = (ss * a) / 100000;
                    return Poly(new[] { (0.0, h), (x2, 0.0), (w - x2, 0.0), (w, h) });
                }
            case "homePlate":
                {
                    double a = Pin(0, Av("adj", 50000), (100000 * w) / ss), x1 = w - (ss * a) / 100000;
                    return Poly(new[] { (0.0, 0.0), (x1, 0.0), (w, vc), (x1, h), (0.0, h) });
                }
            case "chevron":
                {
                    double a = Pin(0, Av("adj", 50000), (100000 * w) / ss), x1 = (ss * a) / 100000;
                    return Poly(new[] { (0.0, 0.0), (w - x1, 0.0), (w, vc), (w - x1, h), (0.0, h), (x1, vc) });
                }
            case "hexagon":
                {
                    double a = Pin(0, Av("adj", 25000), (50000 * w) / ss), x1 = (ss * a) / 100000;
                    double dy1 = ((h / 2) * (Av("vf", 115470) / 100000)) * Math.Sin(Math.PI / 3);
                    return Poly(new[] { (0.0, vc), (x1, vc - dy1), (w - x1, vc - dy1), (w, vc), (w - x1, vc + dy1), (x1, vc + dy1) });
                }
            case "octagon":
                {
                    double x1 = (ss * Pin(0, Av("adj", 29289), 50000)) / 100000;
                    return Poly(new[] { (0.0, x1), (x1, 0.0), (w - x1, 0.0), (w, x1), (w, h - x1), (w - x1, h), (x1, h), (0.0, h - x1) });
                }
            case "rightArrow":
            case "leftArrow":
                {
                    double a1 = Pin(0, Av("adj1", 50000), 100000), a2 = Pin(0, Av("adj2", 50000), (100000 * w) / ss);
                    double dx = (ss * a2) / 100000, dy1 = (h * a1) / 200000, y1 = vc - dy1, y2 = vc + dy1;
                    if (prst == "rightArrow") { double x1 = w - dx; return Poly(new[] { (0.0, y1), (x1, y1), (x1, 0.0), (w, vc), (x1, h), (x1, y2), (0.0, y2) }); }
                    return Poly(new[] { (0.0, vc), (dx, 0.0), (dx, y1), (w, y1), (w, y2), (dx, y2), (dx, h) });
                }
            case "upArrow":
            case "downArrow":
                {
                    double a1 = Pin(0, Av("adj1", 50000), 100000), a2 = Pin(0, Av("adj2", 50000), (100000 * h) / ss);
                    double dy = (ss * a2) / 100000, dx1 = (w * a1) / 200000, x1 = hc - dx1, x2 = hc + dx1;
                    if (prst == "downArrow") { double y1 = h - dy; return Poly(new[] { (0.0, y1), (x1, y1), (x1, 0.0), (x2, 0.0), (x2, y1), (w, y1), (hc, h) }); }
                    return Poly(new[] { (0.0, dy), (hc, 0.0), (w, dy), (x2, dy), (x2, h), (x1, h), (x1, dy) });
                }
            // setas duplas (presetShapeDefinitions; corpus t15: forma 70 de .doc)
            case "upDownArrow":
                {
                    double a1 = Pin(0, Av("adj1", 50000), 100000), a2 = Pin(0, Av("adj2", 50000), (50000 * h) / ss);
                    double y2 = (ss * a2) / 100000, y3 = h - y2, dx1 = (w * a1) / 200000, x1 = hc - dx1, x2 = hc + dx1;
                    return Poly(new[] { (0.0, y2), (hc, 0.0), (w, y2), (x2, y2), (x2, y3), (w, y3), (hc, h), (0.0, y3), (x1, y3), (x1, y2) });
                }
            case "leftRightArrow":
                {
                    double a1 = Pin(0, Av("adj1", 50000), 100000), a2 = Pin(0, Av("adj2", 50000), (50000 * w) / ss);
                    double x2 = (ss * a2) / 100000, x3 = w - x2, dy = (h * a1) / 200000, y1 = vc - dy, y2 = vc + dy;
                    return Poly(new[] { (0.0, vc), (x2, 0.0), (x2, y1), (x3, y1), (x3, 0.0), (w, vc), (x3, h), (x3, y2), (x2, y2), (x2, h) });
                }
            case "ellipse":
                {
                    double rx = w / 2, ry = h / 2;
                    return new List<PathCmdTw>
                    {
                        PathCmdTw.M(w, vc),
                        PathCmdTw.C(w, vc + ry * K, hc + rx * K, h, hc, h),
                        PathCmdTw.C(hc - rx * K, h, 0, vc + ry * K, 0, vc),
                        PathCmdTw.C(0, vc - ry * K, hc - rx * K, 0, hc, 0),
                        PathCmdTw.C(hc + rx * K, 0, w, vc - ry * K, w, vc),
                        PathCmdTw.Z(),
                    };
                }
            case "roundRect":
                {
                    double r = (ss * Pin(0, Av("adj", 16667), 50000)) / 100000;
                    var outp = new List<PathCmdTw> { PathCmdTw.M(0, r) };
                    ArcTo(outp, (0, r), r, r, 180, 90);
                    outp.Add(PathCmdTw.L(w - r, 0)); ArcTo(outp, (w - r, 0), r, r, 270, 90);
                    outp.Add(PathCmdTw.L(w, h - r)); ArcTo(outp, (w, h - r), r, r, 0, 90);
                    outp.Add(PathCmdTw.L(r, h)); ArcTo(outp, (r, h), r, r, 90, 90);
                    outp.Add(PathCmdTw.Z());
                    return outp;
                }
            case "round2SameRect":
                {
                    double t = (ss * Pin(0, Av("adj1", 16667), 50000)) / 100000, b = (ss * Pin(0, Av("adj2", 0), 50000)) / 100000;
                    var outp = new List<PathCmdTw> { PathCmdTw.M(t, 0), PathCmdTw.L(w - t, 0) };
                    ArcTo(outp, (w - t, 0), t, t, 270, 90);
                    outp.Add(PathCmdTw.L(w, h - b)); ArcTo(outp, (w, h - b), b, b, 0, 90);
                    outp.Add(PathCmdTw.L(b, h)); ArcTo(outp, (b, h), b, b, 90, 90);
                    outp.Add(PathCmdTw.L(0, t)); ArcTo(outp, (0, t), t, t, 180, 90);
                    outp.Add(PathCmdTw.Z());
                    return outp;
                }
            case "frame":
                {
                    double x1 = (ss * Pin(0, Av("adj1", 12500), 50000)) / 100000;
                    // contorno interno no sentido oposto: furo com a regra do número de voltas
                    var outp = Poly(new[] { (0.0, 0.0), (w, 0.0), (w, h), (0.0, h) });
                    outp.AddRange(Poly(new[] { (x1, x1), (x1, h - x1), (w - x1, h - x1), (w - x1, x1) }));
                    return outp;
                }
            case "bentConnector3":
                {
                    double x1 = (w * Av("adj1", 50000)) / 100000;
                    return Poly(new[] { (0.0, 0.0), (x1, 0.0), (x1, h), (w, h) }, false);
                }
            case "line":
            case "straightConnector1":
                return Poly(new[] { (0.0, 0.0), (w, h) }, false);
            default:
                return Poly(new[] { (0.0, 0.0), (w, 0.0), (w, h), (0.0, h) });
        }
    }

    /// <summary>Geometrias abertas (só contorno, sem preenchimento).</summary>
    public static readonly HashSet<string> OpenPresets = new(StringComparer.Ordinal) { "line", "straightConnector1", "bentConnector3", "bentConnector2", "curvedConnector3" };

    /// <summary>Aplica ponto a ponto uma transformação a um caminho.</summary>
    public static List<PathCmdTw> MapPath(List<PathCmdTw> cmds, Func<double, double, (double X, double Y)> f) =>
        cmds.Select(c =>
        {
            if (c.Op == 'Z') return c;
            if (c.Op == 'C')
            {
                var p1 = f(c.X1, c.Y1); var p2 = f(c.X2, c.Y2); var p = f(c.X, c.Y);
                return PathCmdTw.C(p1.X, p1.Y, p2.X, p2.Y, p.X, p.Y);
            }
            var q = f(c.X, c.Y);
            return new PathCmdTw { Op = c.Op, X = q.X, Y = q.Y };
        }).ToList();

    /// <summary>
    /// Caminho final da forma no retângulo (x, y, w, h) da página: geometria local,
    /// espelho dentro do quadro e rotação (graus, horário) em torno do centro.
    /// </summary>
    public static List<PathCmdTw> PresetPath(string prst, double x, double y, double w, double h,
        IReadOnlyDictionary<string, double>? adj = null, bool flipH = false, bool flipV = false, double rot = 0)
    {
        var local = PresetPathLocal(prst, w, h, adj);
        double r = (rot * Math.PI) / 180, c = Math.Cos(r), s = Math.Sin(r);
        double cx = w / 2, cy = h / 2;
        return MapPath(local, (px, py) =>
        {
            if (flipH) px = w - px;
            if (flipV) py = h - py;
            double dx = px - cx, dy = py - cy;
            return (x + cx + dx * c - dy * s, y + cy + dx * s + dy * c);
        });
    }

    /// <summary>Caixa envolvente (pontos de controle incluídos — basta para gradiente/sombra).</summary>
    public static (double X0, double Y0, double X1, double Y1) PathBounds(IEnumerable<PathCmdTw> cmds)
    {
        double x0 = double.PositiveInfinity, y0 = double.PositiveInfinity, x1 = double.NegativeInfinity, y1 = double.NegativeInfinity;
        void Add(double x, double y) { x0 = JsMin(x0, x); y0 = JsMin(y0, y); x1 = JsMax(x1, x); y1 = JsMax(y1, y); }
        foreach (var c in cmds)
        {
            if (c.Op == 'Z') continue;
            if (c.Op == 'C') { Add(c.X1, c.Y1); Add(c.X2, c.Y2); }
            Add(c.X, c.Y);
        }
        return (x0, y0, x1, y1);
    }

    // ───────────────────────── degradê (a:gradFill) ─────────────────────────

    /// <summary>Φ (distribuição normal acumulada), aproximação de Abramowitz-Stegun 7.1.26.</summary>
    private static double Phi(double x)
    {
        double t = 1 / (1 + 0.3275911 * Math.Abs(x) / Math.Sqrt(2));
        double e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.Exp(-(x * x) / 2);
        return x >= 0 ? (1 + e) / 2 : (1 - e) / 2;
    }

    private static double[] HexRgb(string h) => new[]
    {
        OfficeNext.Core.JsNumber.ParseInt(h.Length >= 2 ? h[..2] : h, 16),
        OfficeNext.Core.JsNumber.ParseInt(h.Length >= 4 ? h[2..4] : h.Length > 2 ? h[2..] : "", 16),
        OfficeNext.Core.JsNumber.ParseInt(h.Length >= 6 ? h[4..6] : h.Length > 4 ? h[4..] : "", 16),
    };

    /// <summary>
    /// Cores do degradê em n amostras de t ∈ [0, 1] (RGB 8 bits), como o Word grava
    /// no PDF (oráculo de gradientes):
    ///  - DUAS paradas, em 0 e 100%: curva em S (normal acumulada, σ = 0,25) com a
    ///    mistura em gama 2,2;
    ///  - qualquer outro caso: interpolação linear em sRGB entre paradas vizinhas,
    ///    cor constante antes da 1ª e depois da última.
    /// </summary>
    public static byte[] GradientSamples(IReadOnlyList<GradStop> stops, int n = 512)
    {
        var outp = new byte[n * 3];
        if (stops.Count == 0) return outp;
        var st = stops.Select(s => (Pos: s.Pos, C: HexRgb(s.Color))).ToList();
        bool two = st.Count == 2 && st[0].Pos <= 0 && st[1].Pos >= 1;
        const double sig = 0.25;
        double p0 = Phi(-0.5 / sig), p1 = Phi(0.5 / sig);
        var c = new double[3];
        for (int i = 0; i < n; i++)
        {
            double t = (double)i / (n - 1);
            if (two)
            {
                double g = (Phi((t - 0.5) / sig) - p0) / (p1 - p0);
                for (int k = 0; k < 3; k++)
                    c[k] = 255 * Math.Pow(Math.Pow(st[0].C[k] / 255, 2.2) * (1 - g) + Math.Pow(st[1].C[k] / 255, 2.2) * g, 1 / 2.2);
            }
            else
            {
                int j = 0;
                while (j < st.Count - 1 && st[j + 1].Pos < t) j++;
                var a = st[j];
                var b = st[Math.Min(j + 1, st.Count - 1)];
                double f = t <= a.Pos ? 0 : t >= b.Pos || b.Pos == a.Pos ? 1 : (t - a.Pos) / (b.Pos - a.Pos);
                for (int k = 0; k < 3; k++) c[k] = a.C[k] + (b.C[k] - a.C[k]) * f;
            }
            for (int k = 0; k < 3; k++)
            {
                double v = JsMax(0, JsMin(255, OfficeNext.Core.JsNumber.Round(c[k])));
                outp[i * 3 + k] = double.IsNaN(v) ? (byte)0 : (byte)v; // NaN num Uint8Array vira 0
            }
        }
        return outp;
    }

    /// <summary>
    /// Onde o degradê começa e termina (mesmas unidades do quadro, y para baixo):
    ///  - a:lin: reta pelo centro na direção do ângulo (scaled: direção "covariante"
    ///    (cos·h, sen·w)); t = 0/1 nas projeções extremas dos cantos da caixa;
    ///  - rotWithShape: caixa = quadro da forma, e o eixo gira com ela; senão caixa =
    ///    envoltória do caminho já girado e o eixo fica na página;
    ///  - a:path (circle…): centro no fillToRect, raio até o canto mais distante.
    /// </summary>
    public static GradGeom GradientGeometry(GradFill g, (double X, double Y, double W, double H, double Rot) box, (double X0, double Y0, double X1, double Y1) pathBox)
    {
        bool withShape = g.RotWithShape != false;
        var b = withShape ? (box.X, box.Y, box.W, box.H) : (pathBox.X0, pathBox.Y0, pathBox.X1 - pathBox.X0, pathBox.Y1 - pathBox.Y0);
        double bx = b.Item1, by = b.Item2, bw = b.Item3, bh = b.Item4;
        double cx = bx + bw / 2, cy = by + bh / 2;
        (double, double) RotPt(double px, double py)
        {
            if (!withShape || box.Rot == 0 || double.IsNaN(box.Rot)) return (px, py);
            double r = (box.Rot * Math.PI) / 180, c = Math.Cos(r), s = Math.Sin(r);
            return (cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c);
        }
        if (Js.Truthy(g.Path))
        {
            var f = g.FillTo ?? new RectTw { L = 0.5, T = 0.5, R = 0.5, B = 0.5 };
            double fx = bx + bw * (f.L + (1 - f.L - f.R) / 2), fy = by + bh * (f.T + (1 - f.T - f.B) / 2);
            double r = double.NegativeInfinity;
            foreach (var (px, py) in new[] { (bx, by), (bx + bw, by), (bx, by + bh), (bx + bw, by + bh) })
                r = JsMax(r, double.Hypot(px - fx, py - fy));
            var (x0, y0) = RotPt(fx, fy);
            return new GradGeom(true, x0, y0, 0, 0, r);
        }
        double a = (g.AngleDeg * Math.PI) / 180;
        double dx = Math.Cos(a), dy = Math.Sin(a);
        if (g.Scaled == true) { dx *= bh; dy *= bw; }
        double len = double.Hypot(dx, dy);
        if (len == 0 || double.IsNaN(len)) len = 1;
        dx /= len; dy /= len;
        double t0 = double.PositiveInfinity, t1 = double.NegativeInfinity;
        foreach (var (px, py) in new[] { (-bw / 2, -bh / 2), (bw / 2, -bh / 2), (-bw / 2, bh / 2), (bw / 2, bh / 2) })
        {
            double pr = px * dx + py * dy;
            t0 = JsMin(t0, pr); t1 = JsMax(t1, pr);
        }
        var (ax0, ay0) = RotPt(cx + dx * t0, cy + dy * t0);
        var (ax1, ay1) = RotPt(cx + dx * t1, cy + dy * t1);
        return new GradGeom(false, ax0, ay0, ax1, ay1, 0);
    }

    /// <summary>Raster de um padrão (PatternRaster): RGBA, canto e tamanho em células.</summary>
    public sealed record PatternRasterResult(byte[] Data, int W, int H, double X, double Y, int CellsW, int CellsH);

    /// <summary>
    /// Padrão (a:pattFill) num quadro: raster RGBA com 1 pixel do padrão por célula da grade
    /// (<paramref name="px"/> unidades — 0,75 pt / 15 twips: 1/96 pol, medido no PDF do Word), a grade
    /// alinhada à origem da página. Devolve o canto (na unidade do quadro) e o tamanho em células.
    /// </summary>
    public static PatternRasterResult? PatternRaster(ShapePattern p, double x, double y, double w, double h, double px, int k = 1)
    {
        var rows = OfficeNext.DrawingML.Patterns.PatternRows(p.Prst);
        // (NaN também sai: no JS daria um raster vazio de tamanho NaN)
        if (rows is null || !(w > 0) || !(h > 0)) return null;
        double i0 = Math.Floor(x / px), j0 = Math.Floor(y / px);
        int W = (int)JsMax(1, Math.Ceiling((x + w) / px) - i0), H = (int)JsMax(1, Math.Ceiling((y + h) / px) - j0);
        var fg = HexRgb(p.Fg);
        var bg = HexRgb(p.Bg);
        // k pixels por célula: sem a interpolação do visualizador borrando o padrão
        int RW = W * k, RH = H * k;
        var data = new byte[RW * RH * 4];
        static byte U8(double v) => double.IsNaN(v) ? (byte)0 : (byte)v; // NaN num Uint8Array vira 0
        for (int y2 = 0; y2 < RH; y2++)
        {
            int j = y2 / k;
            int row = rows[(int)((((j0 + j) % 8) + 8) % 8)];
            for (int x2 = 0; x2 < RW; x2++)
            {
                int i = x2 / k;
                int on = (row >> (7 - (int)((((i0 + i) % 8) + 8) % 8))) & 1;
                var c = on != 0 ? fg : bg;
                int q = (y2 * RW + x2) * 4;
                data[q] = U8(c[0]); data[q + 1] = U8(c[1]); data[q + 2] = U8(c[2]); data[q + 3] = 255;
            }
        }
        return new PatternRasterResult(data, RW, RH, i0 * px, j0 * px, W, H);
    }

    /// <summary>
    /// Imagem do a:blipFill no quadro: esticada (um retângulo) ou em mosaico (a:tile: escala
    /// sx/sy em 1/1000 %, deslocamento tx/ty em EMU, alinhamento do 1º ladrilho; tamanho
    /// natural a 96 ppp). <paramref name="emu"/> = unidades do quadro por EMU; <paramref name="natural"/> em pixels.
    /// </summary>
    public static List<(double X, double Y, double W, double H)> BlipTiles(ShapeBlip b, double x, double y, double w, double h, double emu, (double Width, double Height)? natural)
    {
        var t = b.Tile;
        if (t is null || natural is not { } nat) return new() { (x, y, w, h) };
        double tw = nat.Width * 9525 * emu * (t.Sx / 100000), th = nat.Height * 9525 * emu * (t.Sy / 100000);
        if (!(tw > 0) || !(th > 0)) return new() { (x, y, w, h) };
        string a = t.Algn ?? "tl";
        double ax = a is "tr" or "r" or "br" ? x + w - tw : a is "t" or "ctr" or "b" ? x + (w - tw) / 2 : x;
        double ay = a.StartsWith('b') ? y + h - th : a is "l" or "ctr" or "r" ? y + (h - th) / 2 : y;
        double ox = ax + t.Tx * emu, oy = ay + t.Ty * emu;
        double sx0 = ox - Math.Ceiling((ox - x) / tw) * tw, sy0 = oy - Math.Ceiling((oy - y) / th) * th;
        var outp = new List<(double, double, double, double)>();
        for (double ty = sy0; ty < y + h && outp.Count < 4000; ty += th)
            for (double tx = sx0; tx < x + w; tx += tw) outp.Add((tx, ty, tw, th));
        return outp;
    }

    /// <summary>Degradê em retângulos (a:path path="rect" | "shape"): o "Do Centro" do Word — anéis
    /// retangulares do retângulo de foco (fillToRect) até as bordas do quadro.</summary>
    public static bool IsRectGradient(GradFill? g) => g is not null && (g.Path == "rect" || g.Path == "shape");

    /// <summary>Raster RGBA do degradê retangular no quadro (w × h unidades, <paramref name="ppu"/> pixels por unidade).</summary>
    public static (byte[] Data, int W, int H) RectGradientRaster(GradFill g, double w, double h, double ppu)
    {
        int W = (int)JsMax(1, JsMin(2000, OfficeNext.Core.JsNumber.Round(w * ppu)));
        int H = (int)JsMax(1, JsMin(2000, OfficeNext.Core.JsNumber.Round(h * ppu)));
        var f = g.FillTo ?? new RectTw { L = 0.5, T = 0.5, R = 0.5, B = 0.5 };
        double fx0 = f.L * W, fx1 = (1 - f.R) * W, fy0 = f.T * H, fy1 = (1 - f.B) * H;
        var smp = GradientSamples(g.Stops, 256);
        var data = new byte[W * H * 4];
        for (int y = 0; y < H; y++)
        {
            double py = y + 0.5;
            double ty = py < fy0 ? (fy0 - py) / JsMax(1e-6, fy0) : py > fy1 ? (py - fy1) / JsMax(1e-6, H - fy1) : 0;
            for (int x = 0; x < W; x++)
            {
                double px = x + 0.5;
                double tx = px < fx0 ? (fx0 - px) / JsMax(1e-6, fx0) : px > fx1 ? (px - fx1) / JsMax(1e-6, W - fx1) : 0;
                double t = JsMin(1, JsMax(tx, ty));
                double iv = OfficeNext.Core.JsNumber.Round(t * 255) * 3;
                int k = (y * W + x) * 4;
                // (índice fora da tabela — NaN, negativo: undefined no JS, 0 no Uint8Array)
                bool ok = !double.IsNaN(iv) && iv >= 0 && iv + 2 < smp.Length;
                int i = ok ? (int)iv : 0;
                data[k] = ok ? smp[i] : (byte)0; data[k + 1] = ok ? smp[i + 1] : (byte)0; data[k + 2] = ok ? smp[i + 2] : (byte)0; data[k + 3] = 255;
            }
        }
        return (data, W, H);
    }

    /// <summary>Cor do estilo do tema com a do marcador phClr trocada pela da referência (a do
    /// fillRef/effectRef): os modificadores da referência e depois os do estilo.</summary>
    public static string SubstPhClr(string spec, string color)
    {
        if (!spec.StartsWith("@phClr", StringComparison.Ordinal)) return spec;
        var sp = spec.Split('|');
        string? mods = sp.Length > 1 ? sp[1] : null;
        if (string.IsNullOrEmpty(mods)) return color;
        var cp = color.Split('|');
        string bas = cp[0];
        string? cm = cp.Length > 1 ? cp[1] : null;
        return $"{bas}|{string.Join(",", new[] { cm, mods }.Where(Js.Truthy))}";
    }

    /// <summary>O ShapeStyle com o preenchimento e a sombra dos estilos do tema (fillRef idx 2/3 e
    /// 1001…, effectRef) já postos — Estilos de Forma (oráculo textbox-lab style-*).</summary>
    public static ShapeStyle WithThemeStyles(ShapeStyle s, Theme theme)
    {
        var outp = s;
        if (s.FillRef is { } fr)
        {
            var list = fr.Idx >= 1000 ? theme.BgFillStyles : theme.FillStyles;
            int li = (fr.Idx % 1000) - 1;
            var ts = list is not null && li >= 0 && li < list.Count ? list[li] : null;
            if (ts is not null)
            {
                string c = fr.Color;
                outp = outp.ShallowClone();
                if (Js.Truthy(ts.Fill)) outp.Fill = SubstPhClr(ts.Fill!, c);
                if (ts.Gradient is { } tg)
                {
                    outp.Gradient = new ShapeGradient
                    {
                        From = SubstPhClr(tg.From, c), To = SubstPhClr(tg.To, c), AngleDeg = tg.AngleDeg,
                        Stops = tg.Stops is not null ? tg.Stops.Select(x => new GradStop { Pos = x.Pos, Color = SubstPhClr(x.Color, c) }).ToList() : null,
                        Scaled = tg.Scaled, RotWithShape = tg.RotWithShape, Path = tg.Path, FillTo = tg.FillTo,
                    };
                }
                if (ts.Pattern is { } tp)
                {
                    var np = tp.ShallowClone();
                    np.Fg = SubstPhClr(tp.Fg, c);
                    np.Bg = SubstPhClr(tp.Bg, c);
                    outp.Pattern = np;
                }
            }
        }
        if (s.EffectRef is { } er && s.Shadow is null)
        {
            var effs = theme.EffectStyles;
            int ei = er.Idx - 1;
            var sh = effs is not null && ei >= 0 && ei < effs.Count ? effs[ei] : null;
            if (sh is not null)
            {
                if (ReferenceEquals(outp, s)) outp = outp.ShallowClone();
                outp.Shadow = new ShapeShadow { Dx = sh.Dx, Dy = sh.Dy, Color = SubstPhClr(sh.Color, er.Color), Alpha = sh.Alpha, Blur = sh.Blur };
            }
        }
        return outp;
    }

    /// <summary>Degradê, padrão, imagem, sombra e Efeitos de Forma de um ShapeStyle com as cores do
    /// tema resolvidas (itens 'shape').</summary>
    public static (GradFill? Grad, ShapeShadow? Shadow, ShapePattern? Pattern, ShapeBlip? Blip, PictureLook? Fx) ShapeExtras(ShapeStyle s0, Theme theme)
    {
        var s = WithThemeStyles(s0, theme);
        GradFill? grad = null;
        ShapeShadow? shadow = null;
        ShapePattern? pattern = null;
        PictureLook? fxOut = null;
        if (s.Fx is { } f)
        {
            string C(string x) => Resolve.ResolveDrawingColor(x, theme) ?? "000000";
            var fx = new PictureLook();
            if (f.Inner is { } fi) fx.Shadow = new PicShadowLook { Kind = "inner", Color = C(fi.Color), Alpha = fi.Alpha, BlurPt = fi.BlurPt, DistPt = fi.DistPt, DirDeg = fi.DirDeg };
            else if (f.Outer is { } o)
            {
                fx.Shadow = new PicShadowLook
                {
                    Kind = "outer", Color = C(o.Color), Alpha = o.Alpha, BlurPt = o.BlurPt, DistPt = o.DistPt, DirDeg = o.DirDeg,
                    Sx = o.Sx, Sy = o.Sy,
                    KxDeg = o.KxDeg is { } kx && kx != 0 && !double.IsNaN(kx) ? kx : null,
                    KyDeg = o.KyDeg is { } ky && ky != 0 && !double.IsNaN(ky) ? ky : null,
                    Algn = Js.Truthy(o.Algn) ? o.Algn : null, RotWithShape = o.RotWithShape,
                };
            }
            if (f.Glow is { } gl) fx.Glow = new PicGlowLook { Color = C(gl.Color), Alpha = gl.Alpha, RadPt = gl.RadPt };
            if (f.SoftEdgePt is { } se && se != 0 && !double.IsNaN(se)) fx.SoftEdgePt = se;
            if (f.Reflection is { } r)
            {
                fx.Reflection = new PicReflectionLook
                {
                    BlurPt = r.BlurPt, StA = r.StA, StPos = r.StPos, EndA = r.EndA, EndPos = r.EndPos, DistPt = r.DistPt, DirDeg = r.DirDeg, Sy = r.Sy,
                    Algn = r.Algn, RotWithShape = r.RotWithShape,
                };
            }
            if (fx.Shadow is not null || fx.Glow is not null || fx.SoftEdgePt is not null || fx.Reflection is not null) fxOut = fx;
        }
        if (s.Pattern is { } pt)
        {
            pattern = new ShapePattern { Prst = pt.Prst, Fg = Resolve.ResolveDrawingColor(pt.Fg, theme) ?? "000000", Bg = Resolve.ResolveDrawingColor(pt.Bg, theme) ?? "FFFFFF" };
        }
        var blip = s.Blip;
        var g = s.Gradient;
        if (g?.Stops is { Count: > 0 } stops)
        {
            grad = new GradFill
            {
                Stops = stops.Select(st => new GradStop { Pos = st.Pos, Color = Resolve.ResolveDrawingColor(st.Color, theme) ?? "000000" }).ToList(),
                AngleDeg = g.AngleDeg,
                Scaled = g.Scaled,
                RotWithShape = g.RotWithShape,
                Path = Js.Truthy(g.Path) ? g.Path : null,
                FillTo = g.FillTo,
            };
        }
        if (s.Shadow is { } sh)
        {
            string? c = Resolve.ResolveDrawingColor(sh.Color, theme);
            if (c is not null) shadow = new ShapeShadow { Dx = sh.Dx, Dy = sh.Dy, Color = c, Alpha = sh.Alpha, Blur = sh.Blur };
        }
        return (grad, shadow, pattern, blip, fxOut);
    }

    // ───────────────────────── grupos girados/espelhados ─────────────────────────

    /// <summary>
    /// Filho de um grupo no retângulo da página, com a rotação/espelho do GRUPO
    /// aplicados: o centro do filho gira (espelha) em torno do centro do grupo e a
    /// rotação/espelho do filho somam os do grupo (a:grpSpPr/a:xfrm).
    /// </summary>
    public static (Run Run, double X, double Y, double W, double H) GroupChild(DrawingGroup gr, GroupItem item, double x, double y, double w, double h)
    {
        double sx = gr.WidthTwips != 0 && !double.IsNaN(gr.WidthTwips) ? w / gr.WidthTwips : 1;
        double sy = gr.HeightTwips != 0 && !double.IsNaN(gr.HeightTwips) ? h / gr.HeightTwips : 1;
        double iw = item.W * sx, ih = item.H * sy;
        double ix = x + item.X * sx, iy = y + item.Y * sy;
        double grot = gr.Rot ?? 0;
        if ((grot == 0 || double.IsNaN(grot)) && !gr.FlipH && !gr.FlipV) return (item.Run, ix, iy, iw, ih);
        double gcx = x + w / 2, gcy = y + h / 2;
        double cx = ix + iw / 2, cy = iy + ih / 2;
        if (gr.FlipH) cx = 2 * gcx - cx;
        if (gr.FlipV) cy = 2 * gcy - cy;
        double a = (grot * Math.PI) / 180, c = Math.Cos(a), s = Math.Sin(a);
        (cx, cy) = (gcx + (cx - gcx) * c - (cy - gcy) * s, gcy + (cx - gcx) * s + (cy - gcy) * c);
        ix = cx - iw / 2; iy = cy - ih / 2;
        // espelho ímpar inverte o sentido da rotação do filho
        bool mirror = gr.FlipH != gr.FlipV;
        ShapeStyle Xf(ShapeStyle st)
        {
            var o = st.ShallowClone();
            double sr = st.Rot ?? 0;
            o.Rot = ((mirror ? -sr : sr) + grot) % 360;
            o.FlipH = (st.FlipH == true) != gr.FlipH;
            o.FlipV = (st.FlipV == true) != gr.FlipV;
            return o;
        }
        var r0 = item.Run;
        var run = r0.ShallowClone();
        if (r0.Shape is not null) { var sh = r0.Shape.ShallowClone(); sh.Style = Xf(r0.Shape.Style); run.Shape = sh; }
        if (r0.Image is not null) { var im = r0.Image.ShallowClone(); im.Style = Xf(r0.Image.Style ?? new ShapeStyle { Geom = "rect" }); run.Image = im; }
        if (r0.Textbox is not null)
        {
            var tb = r0.Textbox.ShallowClone();
            if (tb.Shape is not null) tb.Shape = Xf(tb.Shape);
            double tr0 = tb.Rot ?? 0;
            double tr = ((mirror ? -tr0 : tr0) + grot) % 360;
            if (tr != 0 && !double.IsNaN(tr)) tb.Rot = tr;
            run.Textbox = tb;
        }
        if (r0.Group is not null)
        {
            var g2 = r0.Group.ShallowClone();
            g2.Rot = ((r0.Group.Rot ?? 0) + grot) % 360;
            g2.FlipH = r0.Group.FlipH != gr.FlipH;
            g2.FlipV = r0.Group.FlipV != gr.FlipV;
            run.Group = g2;
        }
        return (run, ix, iy, iw, ih);
    }

    // ───────────────────────── a:custGeom ─────────────────────────

    /// <summary>
    /// Caminhos de a:custGeom no retângulo (x, y, w, h) da página, com espelho e
    /// rotação como as predefinidas. Cada caminho do arquivo é preenchido à parte,
    /// com a regra par-ímpar (oráculo cust: subcaminhos sobrepostos fazem furo; dois
    /// caminhos se somam); fill="none" só contorna.
    /// </summary>
    public static List<(List<PathCmdTw> Cmds, bool Fill, bool Stroke)> CustPaths(
        List<CustPath> cust, double x, double y, double w, double h, bool flipH = false, bool flipV = false, double rot = 0)
    {
        double r = (rot * Math.PI) / 180, c = Math.Cos(r), s = Math.Sin(r);
        double cx = w / 2, cy = h / 2;
        (double, double) Place(double px, double py)
        {
            if (flipH) px = w - px;
            if (flipV) py = h - py;
            double dx = px - cx, dy = py - cy;
            return (x + cx + dx * c - dy * s, y + cy + dx * s + dy * c);
        }
        var outp = new List<(List<PathCmdTw>, bool, bool)>();
        foreach (var p in cust)
        {
            double sx = w / (p.W != 0 && !double.IsNaN(p.W) ? p.W : 1), sy = h / (p.H != 0 && !double.IsNaN(p.H) ? p.H : 1);
            var local = new List<PathCmdTw>();
            (double X, double Y) cur = (0, 0);
            (double X, double Y) start = (0, 0);
            foreach (var k in p.Cmds)
            {
                if (k.Op is 'M' or 'L')
                {
                    cur = (k.X * sx, k.Y * sy);
                    if (k.Op == 'M') start = cur;
                    local.Add(new PathCmdTw { Op = k.Op, X = cur.X, Y = cur.Y });
                }
                else if (k.Op == 'C' && k.Pts is { Count: >= 3 } cp)
                {
                    var a = (X: cp[0].X * sx, Y: cp[0].Y * sy);
                    var b = (X: cp[1].X * sx, Y: cp[1].Y * sy);
                    var d = (X: cp[2].X * sx, Y: cp[2].Y * sy);
                    local.Add(PathCmdTw.C(a.X, a.Y, b.X, b.Y, d.X, d.Y));
                    cur = d;
                }
                else if (k.Op == 'Q' && k.Pts is { Count: >= 2 } qp)
                {
                    // quadrática → cúbica (pontos de controle a 2/3)
                    var q = (X: qp[0].X * sx, Y: qp[0].Y * sy);
                    var d = (X: qp[1].X * sx, Y: qp[1].Y * sy);
                    local.Add(PathCmdTw.C(cur.X + (2.0 / 3) * (q.X - cur.X), cur.Y + (2.0 / 3) * (q.Y - cur.Y),
                        d.X + (2.0 / 3) * (q.X - d.X), d.Y + (2.0 / 3) * (q.Y - d.Y), d.X, d.Y));
                    cur = d;
                }
                else if (k.Op == 'A')
                {
                    cur = ArcTo(local, cur, k.WR * sx, k.HR * sy, k.St, k.Sw);
                }
                else if (k.Op == 'Z')
                {
                    local.Add(PathCmdTw.Z());
                    cur = start;
                }
            }
            outp.Add((MapPath(local, Place), p.Fill, p.Stroke));
        }
        return outp;
    }
}
