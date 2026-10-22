namespace OfficeNext.DrawingML;

/// <summary>Máscara de cobertura w×h (linhas de cima para baixo), canal único 0..1 em
/// precisão simples — o Float32Array do JS (as contas são em double e o valor é
/// gravado como float, como lá).</summary>
public sealed class Mask
{
    public int W { get; }
    public int H { get; }
    public float[] A { get; }

    public Mask(int w, int h)
    {
        W = w;
        H = h;
        A = new float[Math.Max(0, w * h)];
    }

    public Mask(int w, int h, float[] a)
    {
        W = w;
        H = h;
        A = a;
    }
}

/// <summary>Transformação afim (a b c d e f): x' = a·x + c·y + e, y' = b·x + d·y + f.</summary>
public readonly record struct Affine(double A, double B, double C, double D, double E, double F)
{
    public static readonly Affine Identity = new(1, 0, 0, 1, 0, 0);

    public (double X, double Y) Apply(double x, double y) => (A * x + C * y + E, B * x + D * y + F);
}

/// <summary>
/// Rasterização e morfologia sem DOM para os efeitos DrawingML (canal único de
/// cobertura/alfa, 0..1) — porta de shared/drawingml/src/raster.ts com os mesmos
/// números: polígonos com anti-serrilhado (4 sublinhas por pixel), desfoque
/// gaussiano separável, distância euclidiana (Felzenszwalb &amp; Huttenlocher),
/// dilatação/erosão, deslocamento e afim bilineares.
/// </summary>
public static class Raster
{
    public static Mask NewMask(int w, int h) => new(w, h);

    /// <summary>m ∘ n (aplica n primeiro).</summary>
    public static Affine MulAffine(Affine m, Affine n) => new(
        m.A * n.A + m.C * n.B, m.B * n.A + m.D * n.B,
        m.A * n.C + m.C * n.D, m.B * n.C + m.D * n.D,
        m.A * n.E + m.C * n.F + m.E, m.B * n.E + m.D * n.F + m.F);

    public static Affine InvertAffine(Affine m)
    {
        double det = m.A * m.D - m.B * m.C;
        if (det == 0 || double.IsNaN(det)) det = 1e-12;
        double a = m.D / det, b = -m.B / det, c = -m.C / det, d = m.A / det;
        return new Affine(a, b, c, d, -(a * m.E + c * m.F), -(b * m.E + d * m.F));
    }

    public static List<double[]> FlattenPath(IEnumerable<IReadOnlyList<PathSeg>> subs, double tol = 0.35) => FlattenPath(subs, Affine.Identity, tol);

    /// <summary>Achata os subcaminhos (curvas e arcos em segmentos) já transformados por
    /// <paramref name="m"/>: cada polígono é [x0, y0, x1, y1, …]. <paramref name="tol"/> = passo
    /// máximo (unidades de saída).</summary>
    public static List<double[]> FlattenPath(IEnumerable<IReadOnlyList<PathSeg>> subs, Affine m, double tol = 0.35)
    {
        var outp = new List<double[]>();
        double scale = Math.Max(1e-9, Math.Max(double.Hypot(m.A, m.B), double.Hypot(m.C, m.D)));
        foreach (var sub in subs)
        {
            var poly = new List<double>();
            double cx = 0, cy = 0, sx = 0, sy = 0;
            void Push(double x, double y) { var p = m.Apply(x, y); poly.Add(p.X); poly.Add(p.Y); }
            foreach (var s in sub)
            {
                switch (s.C)
                {
                    case 'M':
                        if (poly.Count >= 6) outp.Add(poly.ToArray());
                        poly.Clear();
                        cx = sx = s.X; cy = sy = s.Y; Push(s.X, s.Y);
                        break;
                    case 'L': cx = s.X; cy = s.Y; Push(s.X, s.Y); break;
                    case 'C':
                        {
                            double len = (double.Hypot(s.X1 - cx, s.Y1 - cy) + double.Hypot(s.X2 - s.X1, s.Y2 - s.Y1) + double.Hypot(s.X - s.X2, s.Y - s.Y2)) * scale;
                            double n = Math.Max(2, Math.Min(256, Math.Ceiling(len / tol / 4)));
                            for (double i = 1; i <= n; i++)
                            {
                                double t = i / n, u = 1 - t;
                                Push(u * u * u * cx + 3 * u * u * t * s.X1 + 3 * u * t * t * s.X2 + t * t * t * s.X,
                                    u * u * u * cy + 3 * u * u * t * s.Y1 + 3 * u * t * t * s.Y2 + t * t * t * s.Y);
                            }
                            cx = s.X; cy = s.Y;
                            break;
                        }
                    case 'Q':
                        {
                            double len = (double.Hypot(s.X1 - cx, s.Y1 - cy) + double.Hypot(s.X - s.X1, s.Y - s.Y1)) * scale;
                            double n = Math.Max(2, Math.Min(256, Math.Ceiling(len / tol / 4)));
                            for (double i = 1; i <= n; i++)
                            {
                                double t = i / n, u = 1 - t;
                                Push(u * u * cx + 2 * u * t * s.X1 + t * t * s.X, u * u * cy + 2 * u * t * s.Y1 + t * t * s.Y);
                            }
                            cx = s.X; cy = s.Y;
                            break;
                        }
                    case 'E':
                        {
                            double a0 = s.A0, a1 = s.A1;
                            if (s.Ccw) { if (a1 > a0) a1 -= Math.PI * 2; }
                            else if (a1 < a0) a1 += Math.PI * 2;
                            double len = Math.Abs(a1 - a0) * Math.Max(s.Rx, s.Ry) * scale;
                            double n = Math.Max(2, Math.Min(512, Math.Ceiling(len / tol / 2)));
                            for (double i = 0; i <= n; i++)
                            {
                                double t = a0 + ((a1 - a0) * i) / n;
                                Push(s.Cx + s.Rx * Math.Cos(t), s.Cy + s.Ry * Math.Sin(t));
                            }
                            cx = s.Cx + s.Rx * Math.Cos(a1); cy = s.Cy + s.Ry * Math.Sin(a1);
                            break;
                        }
                    case 'Z': cx = sx; cy = sy; break;
                }
            }
            if (poly.Count >= 6) outp.Add(poly.ToArray());
        }
        return outp;
    }

    private struct Edge { public double X0, Y0, X1, Y1; public int Dir; }

    /// <summary>Preenche polígonos numa máscara (cobertura com anti-serrilhado: 4 sublinhas
    /// por pixel, extremos horizontais fracionários). <paramref name="evenOdd"/> = regra par-ímpar.</summary>
    public static Mask FillPolygons(Mask mask, IReadOnlyList<double[]> polys, bool evenOdd = false)
    {
        int w = mask.W, h = mask.H;
        var a = mask.A;
        const int SUB = 4;
        var edges = new List<Edge>();
        foreach (var p in polys)
        {
            int n = p.Length / 2;
            for (int i = 0; i < n; i++)
            {
                double x0 = p[2 * i], y0 = p[2 * i + 1], x1 = p[2 * ((i + 1) % n)], y1 = p[2 * ((i + 1) % n) + 1];
                if (y0 == y1) continue;
                edges.Add(y0 < y1 ? new Edge { X0 = x0, Y0 = y0, X1 = x1, Y1 = y1, Dir = 1 } : new Edge { X0 = x1, Y0 = y1, X1 = x0, Y1 = y0, Dir = -1 });
            }
        }
        if (edges.Count == 0) return mask;
        var row = new float[w + 1];
        var xs = new double[edges.Count];
        var ds = new int[edges.Count];
        double ymin = h, ymax = 0;
        foreach (var e in edges) { ymin = Math.Min(ymin, e.Y0); ymax = Math.Max(ymax, e.Y1); }
        if (double.IsNaN(ymin) || double.IsNaN(ymax)) return mask;
        int r0 = (int)Math.Max(0, Math.Floor(ymin)), r1 = (int)Math.Min(h - 1, Math.Ceiling(ymax));
        for (int py = r0; py <= r1; py++)
        {
            Array.Clear(row);
            for (int s = 0; s < SUB; s++)
            {
                double y = py + (s + 0.5) / SUB;
                int cnt = 0;
                foreach (var e in edges)
                {
                    if (y < e.Y0 || y >= e.Y1) continue;
                    // ordenação ESTÁVEL por x (o sort do JS): inserção
                    double x = e.X0 + ((y - e.Y0) / (e.Y1 - e.Y0)) * (e.X1 - e.X0);
                    int j = cnt++;
                    while (j > 0 && xs[j - 1] > x) { xs[j] = xs[j - 1]; ds[j] = ds[j - 1]; j--; }
                    xs[j] = x; ds[j] = e.Dir;
                }
                if (cnt == 0) continue;
                int wind = 0;
                for (int k = 0; k < cnt - 1; k++)
                {
                    wind += evenOdd ? 1 : ds[k];
                    bool inside = evenOdd ? wind % 2 != 0 : wind != 0;
                    if (!inside) continue;
                    double xa = Math.Max(0, xs[k]), xb = Math.Min(w, xs[k + 1]);
                    if (!(xb > xa)) continue;
                    int ia = (int)Math.Floor(xa), ib = (int)Math.Floor(xb);
                    if (ia == ib) { row[ia] = (float)(row[ia] + (xb - xa) / SUB); continue; }
                    row[ia] = (float)(row[ia] + (ia + 1 - xa) / SUB);
                    for (int ix = ia + 1; ix < ib; ix++) row[ix] = (float)(row[ix] + 1.0 / SUB);
                    if (ib < w) row[ib] = (float)(row[ib] + (xb - ib) / SUB);
                }
            }
            int o = py * w;
            for (int x = 0; x < w; x++) a[o + x] = (float)Math.Min(1, (double)a[o + x] + row[x]);
        }
        return mask;
    }

    /// <summary>Desfoque gaussiano separável (σ em pixels; kernel até 3σ).</summary>
    public static Mask GaussianBlur(Mask m, double sigma)
    {
        if (!(sigma >= 0.05)) return new Mask(m.W, m.H, (float[])m.A.Clone());
        int r = (int)Math.Max(1, Math.Ceiling(sigma * 3));
        var k = new float[2 * r + 1];
        double sum = 0;
        for (int i = -r; i <= r; i++) { double v = Math.Exp(-(double)(i * i) / (2 * sigma * sigma)); k[i + r] = (float)v; sum += v; }
        for (int i = 0; i < k.Length; i++) k[i] = (float)(k[i] / sum);
        int w = m.W, h = m.H;
        var tmp = new float[w * h];
        var outp = new float[w * h];
        var src = m.A;
        for (int y = 0; y < h; y++)
        {
            int o = y * w;
            for (int x = 0; x < w; x++)
            {
                double s = 0;
                int lo = Math.Max(-r, -x), hi = Math.Min(r, w - 1 - x);
                for (int i = lo; i <= hi; i++) s += (double)src[o + x + i] * k[i + r];
                tmp[o + x] = (float)s;
            }
        }
        for (int y = 0; y < h; y++)
        {
            int lo = Math.Max(-r, -y), hi = Math.Min(r, h - 1 - y);
            for (int x = 0; x < w; x++)
            {
                double s = 0;
                for (int i = lo; i <= hi; i++) s += (double)tmp[(y + i) * w + x] * k[i + r];
                outp[y * w + x] = (float)s;
            }
        }
        return new Mask(w, h, outp);
    }

    /// <summary>Distância euclidiana (pixels) de cada pixel ao conjunto {cobertura ≥ ½}
    /// (<paramref name="inside"/> = true) ou ao seu complemento — Felzenszwalb &amp; Huttenlocher.</summary>
    public static float[] DistanceTo(Mask m, bool inside)
    {
        int w = m.W, h = m.H;
        const double INF = 1e20;
        int mx = Math.Max(w, h);
        var f = new double[mx];
        var d = new double[mx];
        var v = new int[mx];
        var z = new double[mx + 1];
        var g = new double[w * h];
        for (int i = 0; i < w * h; i++) g[i] = (m.A[i] >= 0.5) == inside ? 0 : INF;
        void Pass(int n)
        {
            int k = 0;
            v[0] = 0; z[0] = -INF; z[1] = INF;
            for (int q = 1; q < n; q++)
            {
                double s = ((f[q] + (double)q * q) - (f[v[k]] + (double)v[k] * v[k])) / (2.0 * q - 2.0 * v[k]);
                while (s <= z[k]) { k--; s = ((f[q] + (double)q * q) - (f[v[k]] + (double)v[k] * v[k])) / (2.0 * q - 2.0 * v[k]); }
                k++; v[k] = q; z[k] = s; z[k + 1] = INF;
            }
            k = 0;
            for (int q = 0; q < n; q++)
            {
                while (z[k + 1] < q) k++;
                d[q] = (double)(q - v[k]) * (q - v[k]) + f[v[k]];
            }
        }
        for (int x = 0; x < w; x++)
        {
            for (int y = 0; y < h; y++) f[y] = g[y * w + x];
            Pass(h);
            for (int y = 0; y < h; y++) g[y * w + x] = d[y];
        }
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++) f[x] = g[y * w + x];
            Pass(w);
            for (int x = 0; x < w; x++) g[y * w + x] = d[x];
        }
        var outp = new float[w * h];
        for (int i = 0; i < w * h; i++) outp[i] = (float)Math.Sqrt(g[i]);
        return outp;
    }

    /// <summary>Dilata (r &gt; 0) ou erode (r &lt; 0) a máscara por um disco de raio |r| px, com
    /// meia unidade de transição (anti-serrilhado).</summary>
    public static Mask Morph(Mask m, double r)
    {
        var outp = new Mask(m.W, m.H);
        if (!(Math.Abs(r) >= 0.01)) { Array.Copy(m.A, outp.A, m.A.Length); return outp; }
        // fora da máscara = fundo: a distância mede-se numa cópia com moldura vazia
        int p = (int)Math.Ceiling(Math.Abs(r)) + 2;
        int pw = m.W + 2 * p, ph = m.H + 2 * p;
        var pad = new Mask(pw, ph);
        for (int y = 0; y < m.H; y++) Array.Copy(m.A, y * m.W, pad.A, (y + p) * pw + p, m.W);
        var d = DistanceTo(pad, r > 0);
        for (int y = 0; y < m.H; y++)
        {
            for (int x = 0; x < m.W; x++)
            {
                int i = y * m.W + x;
                double dd = d[(y + p) * pw + x + p];
                outp.A[i] = (float)(r > 0
                    ? Math.Max(m.A[i], Math.Min(1, Math.Max(0, r - dd + 0.5)))
                    : Math.Min(m.A[i], Math.Min(1, Math.Max(0, dd + r + 0.5))));
            }
        }
        return outp;
    }

    private static double At(Mask m, int xx, int yy) => xx < 0 || yy < 0 || xx >= m.W || yy >= m.H ? 0 : m.A[yy * m.W + xx];

    private static int IFloor(double v) => double.IsNaN(v) ? int.MinValue : (int)Math.Max(int.MinValue, Math.Min(int.MaxValue, Math.Floor(v)));

    /// <summary>Copia <paramref name="m"/> deslocada (dx, dy px; frações por interpolação
    /// bilinear) para uma máscara w×h.</summary>
    public static Mask ShiftMask(Mask m, double dx, double dy, int? w = null, int? h = null)
    {
        int W = w ?? m.W, H = h ?? m.H;
        var outp = new Mask(W, H);
        for (int y = 0; y < H; y++)
        {
            double sy = y - dy;
            double fy0 = Math.Floor(sy), fy = sy - fy0;
            int y0 = IFloor(sy);
            for (int x = 0; x < W; x++)
            {
                double sx = x - dx;
                double fx0 = Math.Floor(sx), fx = sx - fx0;
                int x0 = IFloor(sx);
                outp.A[y * W + x] = (float)((At(m, x0, y0) * (1 - fx) + At(m, x0 + 1, y0) * fx) * (1 - fy)
                    + (At(m, x0, y0 + 1) * (1 - fx) + At(m, x0 + 1, y0 + 1) * fx) * fy);
            }
        }
        return outp;
    }

    /// <summary>Amostra <paramref name="m"/> por uma afim inversa <paramref name="inv"/> (destino →
    /// origem), bilinear.</summary>
    public static Mask WarpMask(Mask m, Affine inv, int w, int h)
    {
        var outp = new Mask(w, h);
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                var (sx0, sy0) = inv.Apply(x + 0.5, y + 0.5);
                double sx = sx0 - 0.5, sy = sy0 - 0.5;
                double fxf = Math.Floor(sx), fyf = Math.Floor(sy);
                int x0 = IFloor(sx), y0 = IFloor(sy);
                double fx = sx - fxf, fy = sy - fyf;
                outp.A[y * w + x] = (float)((At(m, x0, y0) * (1 - fx) + At(m, x0 + 1, y0) * fx) * (1 - fy)
                    + (At(m, x0, y0 + 1) * (1 - fx) + At(m, x0 + 1, y0 + 1) * fx) * fy);
            }
        }
        return outp;
    }
}
