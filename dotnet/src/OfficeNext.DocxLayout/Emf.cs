using System.Buffers.Binary;
using System.Globalization;
using System.Text;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Reprodução de metarquivos EMF ([MS-EMF]) como itens de desenho — porta de
/// docx-layout/src/emf.ts: caminhos (retângulo, elipse, polígonos, Béziers,
/// paths), texto (EMR_EXTTEXTOUTW com o vetor de avanços do próprio arquivo) e
/// bitmaps DIB. Cobre o que os documentos do Word usam (ícones de objetos OLE
/// com rótulo, diagramas colados do Visio/Excel). Registros EMF+ (comentários)
/// são ignorados — o EMF "dual" traz os registros EMF equivalentes.
/// </summary>
public static class Emf
{
    private readonly record struct Xform(double A, double B, double C, double D, double E, double F);
    private static readonly Xform Ident = new(1, 0, 0, 1, 0, 0);

    private static Xform Mul(Xform m, Xform n) => new(
        m.A * n.A + m.B * n.C, m.A * n.B + m.B * n.D,
        m.C * n.A + m.D * n.C, m.C * n.B + m.D * n.D,
        m.E * n.A + m.F * n.C + n.E, m.E * n.B + m.F * n.D + n.F);

    private sealed record Pen(double Style, double Width, string Color);
    private sealed record Brush(double Style, string Color);
    private sealed record EmfFont(double Height, double Weight, bool Italic, bool Underline, bool Strike, string Face, double Escapement);

    /// <summary>Objeto GDI: exatamente um dos três.</summary>
    private sealed record Obj(Pen? Pen, Brush? Brush, EmfFont? Font);

    private sealed class DcState
    {
        public double MapMode;
        public double[] WinOrg = { 0, 0 };
        public double[] WinExt = { 1, 1 };
        public double[] VpOrg = { 0, 0 };
        public double[] VpExt = { 1, 1 };
        public Xform World;
        public Pen Pen = null!;
        public Brush Brush = null!;
        public EmfFont Font = null!;
        public string TextColor = "000000";
        public string BkColor = "FFFFFF";
        public double BkMode;
        public double TextAlign;
        public double PolyFill;
        public double[] Cur = { 0, 0 };

        public DcState Clone()
        {
            var c = (DcState)MemberwiseClone();
            c.WinOrg = (double[])WinOrg.Clone();
            c.WinExt = (double[])WinExt.Clone();
            c.VpOrg = (double[])VpOrg.Clone();
            c.VpExt = (double[])VpExt.Clone();
            c.Cur = (double[])Cur.Clone();
            return c;
        }
    }

    private static string ColorOf(uint v)
    {
        string H(uint c) { string s = c.ToString("x", CultureInfo.InvariantCulture); return s.Length < 2 ? "0" + s : s; }
        return (H(v & 0xff) + H((v >> 8) & 0xff) + H((v >> 16) & 0xff)).ToUpperInvariant();
    }

    private static readonly Dictionary<long, Obj> Stock = new()
    {
        [0] = new Obj(null, new Brush(0, "FFFFFF"), null),
        [1] = new Obj(null, new Brush(0, "C0C0C0"), null),
        [2] = new Obj(null, new Brush(0, "808080"), null),
        [3] = new Obj(null, new Brush(0, "404040"), null),
        [4] = new Obj(null, new Brush(0, "000000"), null),
        [5] = new Obj(null, new Brush(1, "000000"), null),
        [6] = new Obj(new Pen(0, 0, "FFFFFF"), null, null),
        [7] = new Obj(new Pen(0, 0, "000000"), null, null),
        [8] = new Obj(new Pen(5, 0, "000000"), null, null),
        [13] = new Obj(null, null, new EmfFont(-12, 400, false, false, false, "Arial", 0)),
        [17] = new Obj(null, null, new EmfFont(-11, 400, false, false, false, "Segoe UI", 0)),
    };

    public static bool IsEmf(byte[] b) =>
        b.Length > 44 && b[0] == 1 && b[1] == 0 && b[2] == 0 && b[3] == 0 && b[40] == 0x20 && b[41] == 0x45 && b[42] == 0x4d && b[43] == 0x46;

    /// <summary>getUint16 do DataView: fora do buffer lança (RangeError).</summary>
    private static int ReadU16Checked(byte[] b, int o)
    {
        if (o < 0 || o + 2 > b.Length) throw new ArgumentOutOfRangeException(nameof(b), "Offset is outside the bounds of the DataView");
        return BinaryPrimitives.ReadUInt16LittleEndian(b.AsSpan(o, 2));
    }

    private static double JsSign(double v) => double.IsNaN(v) ? double.NaN : v > 0 ? 1 : v < 0 ? -1 : v;

    /// <summary>Desenha o EMF no retângulo (twips) dado.</summary>
    public static List<PageItem> RenderEmf(DocContext ctx, byte[] bytes, double destX, double destY, double destW, double destH)
    {
        var outp = new List<PageItem>();
        // DataView: leitura fora do arquivo LANÇA (como o RangeError do JS)
        void Chk(long o, int n) { if (o < 0 || o + n > bytes.Length) throw new ArgumentOutOfRangeException(nameof(bytes), "Offset is outside the bounds of the DataView"); }
        double I32(long o) { Chk(o, 4); return BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan((int)o, 4)); }
        uint U32(long o) { Chk(o, 4); return BinaryPrimitives.ReadUInt32LittleEndian(bytes.AsSpan((int)o, 4)); }
        double I16(long o) { Chk(o, 2); return BinaryPrimitives.ReadInt16LittleEndian(bytes.AsSpan((int)o, 2)); }
        int U16(long o) { Chk(o, 2); return BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan((int)o, 2)); }
        double F32(long o) { Chk(o, 4); return BinaryPrimitives.ReadSingleLittleEndian(bytes.AsSpan((int)o, 4)); }
        if (!IsEmf(bytes)) return outp;
        // quadro (0,01 mm) → pixels do dispositivo de referência
        double[] frame = { I32(24), I32(28), I32(32), I32(36) };
        double[] devPx = { I32(72), I32(76) };
        double[] devMm = { I32(80), I32(84) };
        double pxPerHmmX = devPx[0] / Math.Max(1, devMm[0] * 100);
        double pxPerHmmY = devPx[1] / Math.Max(1, devMm[1] * 100);
        double fx0 = frame[0] * pxPerHmmX, fy0 = frame[1] * pxPerHmmY;
        double fw = Math.Max(1e-6, (frame[2] - frame[0]) * pxPerHmmX), fh = Math.Max(1e-6, (frame[3] - frame[1]) * pxPerHmmY);
        double sx = destW / fw, sy = destH / fh;

        var dc = new DcState
        {
            MapMode = 1, World = Ident,
            Pen = Stock[7].Pen!, Brush = Stock[0].Brush!, Font = Stock[13].Font!,
            TextColor = "000000", BkColor = "FFFFFF", BkMode = 2, TextAlign = 0, PolyFill = 1,
        };
        var stack = new List<DcState>();
        var objs = new Dictionary<uint, Obj>();

        // escala lógico → dispositivo (sem translação)
        (double, double) MapScale()
        {
            switch (dc.MapMode)
            {
                case 2: return (0.1 * pxPerHmmX * 10, -0.1 * pxPerHmmY * 10); // LOMETRIC: 0,1 mm
                case 3: return (0.01 * pxPerHmmX * 100 / 1, -0.01 * pxPerHmmY * 100); // HIMETRIC
                case 4: return (0.254 * pxPerHmmX * 100, -0.254 * pxPerHmmY * 100); // LOENGLISH 0,01"
                case 5: return (0.0254 * pxPerHmmX * 100, -0.0254 * pxPerHmmY * 100); // HIENGLISH
                case 6: return ((25.4 / 1440) * pxPerHmmX * 100, -(25.4 / 1440) * pxPerHmmY * 100); // TWIPS
                case 7:
                case 8:
                    return (dc.VpExt[0] / (dc.WinExt[0] != 0 && !double.IsNaN(dc.WinExt[0]) ? dc.WinExt[0] : 1),
                        dc.VpExt[1] / (dc.WinExt[1] != 0 && !double.IsNaN(dc.WinExt[1]) ? dc.WinExt[1] : 1));
                default: return (1, 1);
            }
        }
        (double, double) ToDev(double x, double y)
        {
            var w = dc.World;
            double wx = x * w.A + y * w.C + w.E, wy = x * w.B + y * w.D + w.F;
            var (kx, ky) = MapScale();
            double s0 = kx, s1 = ky;
            if (dc.MapMode == 7) { double k = Math.Min(Math.Abs(kx), Math.Abs(ky)); s0 = JsSign(kx) * k; s1 = JsSign(ky) * k; }
            return ((wx - dc.WinOrg[0]) * s0 + dc.VpOrg[0], (wy - dc.WinOrg[1]) * s1 + dc.VpOrg[1]);
        }
        (double X, double Y) ToPage(double x, double y)
        {
            var (dx, dy) = ToDev(x, y);
            return (destX + (dx - fx0) * sx, destY + (dy - fy0) * sy);
        }
        double LenTw(double logical)
        {
            var (kx, _) = MapScale();
            var w = dc.World;
            return Math.Abs(logical * Math.Sqrt(w.A * w.A + w.B * w.B) * kx) * sx;
        }

        List<PathCmdTw>? path = null;
        void EmitPath(List<PathCmdTw> cmds, bool fill, bool stroke)
        {
            if (cmds.Count == 0) return;
            string? f = fill && dc.Brush.Style != 1 ? dc.Brush.Color : null;
            var pen = dc.Pen;
            StrokeSpec? st = stroke && pen.Style != 5
                ? new StrokeSpec { Color = pen.Color, WidthPt = Math.Max(0.25, LenTw(pen.Width != 0 && !double.IsNaN(pen.Width) ? pen.Width : 1) / 20), Dash = pen.Style >= 1 && pen.Style <= 4 ? "dashed" : null }
                : null;
            if (f is null && st is null) return;
            outp.Add(new PathItem { Cmds = cmds, Fill = f, Stroke = st, EvenOdd = dc.PolyFill == 1 });
        }
        void Draw(List<PathCmdTw> cmds, bool closed)
        {
            if (path is not null) { path.AddRange(cmds); return; }
            EmitPath(cmds, closed, true);
        }
        List<(double, double)> Pts16(long o, uint n)
        {
            var l = new List<(double, double)>();
            for (long k = 0; k < n; k++) l.Add((I16(o + k * 4), I16(o + k * 4 + 2)));
            return l;
        }
        List<(double, double)> Pts32(long o, uint n)
        {
            var l = new List<(double, double)>();
            for (long k = 0; k < n; k++) l.Add((I32(o + k * 8), I32(o + k * 8 + 4)));
            return l;
        }
        List<PathCmdTw> Poly(List<(double X, double Y)> pts, bool closed, bool cont = false)
        {
            var c = new List<PathCmdTw>();
            for (int k = 0; k < pts.Count; k++)
            {
                var (px, py) = ToPage(pts[k].X, pts[k].Y);
                c.Add(k == 0 && !cont ? PathCmdTw.M(px, py) : PathCmdTw.L(px, py));
            }
            if (closed) c.Add(PathCmdTw.Z());
            return c;
        }
        List<PathCmdTw> Bezier(List<(double X, double Y)> pts, bool startWithMove)
        {
            var c = new List<PathCmdTw>();
            int k = 0;
            if (startWithMove)
            {
                // pts[0] ausente: toPage(undefined…) → NaN no JS
                (double X, double Y) p0 = pts.Count > 0 ? pts[0] : (double.NaN, double.NaN);
                var (x, y) = ToPage(p0.X, p0.Y);
                c.Add(PathCmdTw.M(x, y));
                k = 1;
            }
            for (; k + 2 < pts.Count; k += 3)
            {
                var a = ToPage(pts[k].X, pts[k].Y);
                var b = ToPage(pts[k + 1].X, pts[k + 1].Y);
                var d = ToPage(pts[k + 2].X, pts[k + 2].Y);
                c.Add(PathCmdTw.C(a.X, a.Y, b.X, b.Y, d.X, d.Y));
            }
            return c;
        }
        List<PathCmdTw> Rect(double l, double t, double r, double b) => Poly(new() { (l, t), (r, t), (r, b), (l, b) }, true);
        List<PathCmdTw> Ellipse(double l, double t, double r, double b)
        {
            const double K = 0.5523;
            double cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
            var p0 = ToPage(cx + rx, cy);
            PathCmdTw Seg(double x1, double y1, double x2, double y2, double x, double y)
            {
                var a = ToPage(x1, y1);
                var b2 = ToPage(x2, y2);
                var d = ToPage(x, y);
                return PathCmdTw.C(a.X, a.Y, b2.X, b2.Y, d.X, d.Y);
            }
            return new List<PathCmdTw>
            {
                PathCmdTw.M(p0.X, p0.Y),
                Seg(cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry),
                Seg(cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy),
                Seg(cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry),
                Seg(cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy),
                PathCmdTw.Z(),
            };
        }

        InlineImage? Dib(long off, uint cbBmi, long offBits, uint cbBits, bool premul = false)
        {
            if (cbBmi == 0 || cbBits == 0 || off + cbBmi > bytes.Length || offBits + cbBits > bytes.Length) return null;
            // BMP = cabeçalho de arquivo (14) + BITMAPINFO (hdr bytes) + bits
            byte[] Build(uint hdr)
            {
                var b = new byte[14 + hdr + cbBits];
                b[0] = 0x42; b[1] = 0x4d;
                BinaryPrimitives.WriteUInt32LittleEndian(b.AsSpan(2), (uint)b.Length);
                BinaryPrimitives.WriteUInt32LittleEndian(b.AsSpan(10), 14 + hdr);
                Array.Copy(bytes, off, b, 14, cbBmi);
                Array.Copy(bytes, offBits, b, 14 + hdr, cbBits);
                return b;
            }
            var bmp = Build(cbBmi);
            // AlphaBlend com AC_SRC_ALPHA: 32 bpp pré-multiplicado → canal alfa direto: cabeçalho
            // V3 (56 bytes) com BITFIELDS e máscaras BGRA explícitas, que o decodeBmp segue
            if (premul && ReadU16Checked(bmp, 14 + 14) == 32)
            {
                uint hdr = Math.Max(cbBmi, 56);
                bmp = Build(hdr);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14), hdr);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14 + 16), 3);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14 + 40), 0x00ff0000);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14 + 44), 0x0000ff00);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14 + 48), 0x000000ff);
                BinaryPrimitives.WriteUInt32LittleEndian(bmp.AsSpan(14 + 52), 0xff000000);
                for (long k = 14 + hdr; k + 3 < bmp.Length; k += 4)
                {
                    int a = bmp[k + 3];
                    if (a > 0 && a < 255)
                        for (int c = 0; c < 3; c++) bmp[k + c] = (byte)Math.Min(255, Js.Round((bmp[k + c] * 255.0) / a));
                }
            }
            return new InlineImage { Data = bmp, Ext = "bmp", WidthTwips = 0, HeightTwips = 0 };
        }

        long pos = 0;
        int guard = 0;
        while (pos + 8 <= bytes.Length && guard++ < 200000)
        {
            uint type = U32(pos), size = U32(pos + 4);
            if (size < 8 || pos + size > bytes.Length) break;
            long r = pos + 8;
            switch (type)
            {
                case 14: pos = bytes.Length; continue; // EOF
                case 17: dc.MapMode = U32(r); break;
                case 9: dc.WinExt = new[] { I32(r), I32(r + 4) }; break;
                case 10: dc.WinOrg = new[] { I32(r), I32(r + 4) }; break;
                case 11: dc.VpExt = new[] { I32(r), I32(r + 4) }; break;
                case 12: dc.VpOrg = new[] { I32(r), I32(r + 4) }; break;
                case 35: // SETWORLDTRANSFORM
                    dc.World = new Xform(F32(r), F32(r + 4), F32(r + 8), F32(r + 12), F32(r + 16), F32(r + 20));
                    break;
                case 36: // MODIFYWORLDTRANSFORM
                    {
                        var m = new Xform(F32(r), F32(r + 4), F32(r + 8), F32(r + 12), F32(r + 16), F32(r + 20));
                        uint mode = U32(r + 24);
                        dc.World = mode == 1 ? Ident : mode == 2 ? Mul(m, dc.World) : mode == 3 ? Mul(dc.World, m) : m;
                        break;
                    }
                case 33: stack.Add(dc.Clone()); break;
                case 34: // RESTOREDC (relativo)
                    {
                        double n = I32(r);
                        DcState? s = null;
                        while (n < 0 && stack.Count > 0) { s = stack[^1]; stack.RemoveAt(stack.Count - 1); n++; }
                        if (s is not null) dc = s;
                        break;
                    }
                case 18: dc.BkMode = U32(r); break;
                case 19: dc.PolyFill = U32(r); break;
                case 22: dc.TextAlign = U32(r); break;
                case 24: dc.TextColor = ColorOf(U32(r)); break;
                case 25: dc.BkColor = ColorOf(U32(r)); break;
                case 38: objs[U32(r)] = new Obj(new Pen(U32(r + 4) & 0xf, I32(r + 8), ColorOf(U32(r + 16))), null, null); break;
                case 95: objs[U32(r)] = new Obj(new Pen(U32(r + 20) & 0xf, U32(r + 24), ColorOf(U32(r + 32))), null, null); break;
                case 39: objs[U32(r)] = new Obj(null, new Brush(U32(r + 4), ColorOf(U32(r + 8))), null); break;
                case 82: // EXTCREATEFONTINDIRECTW
                    {
                        var face = new StringBuilder();
                        for (int k = 0; k < 32; k++) { int c = U16(r + 32 + k * 2); if (c == 0) break; face.Append((char)c); }
                        bool B(long o) => o >= bytes.Length || bytes[o] != 0; // bytes[o] ausente !== 0
                        objs[U32(r)] = new Obj(null, null, new EmfFont(I32(r + 4), I32(r + 20), B(r + 24), B(r + 25), B(r + 26), face.ToString(), I32(r + 12)));
                        break;
                    }
                case 37: // SELECTOBJECT
                    {
                        uint h = U32(r);
                        Obj? o = (h & 0x80000000) != 0 ? (Stock.TryGetValue(h & 0x7fffffff, out var so) ? so : null) : (objs.TryGetValue(h, out var oo) ? oo : null);
                        if (o?.Pen is not null) dc.Pen = o.Pen;
                        else if (o?.Brush is not null) dc.Brush = o.Brush;
                        else if (o?.Font is not null) dc.Font = o.Font;
                        break;
                    }
                case 40: objs.Remove(U32(r)); break;
                case 27:
                    dc.Cur = new[] { I32(r), I32(r + 4) };
                    if (path is not null) { var (x, y) = ToPage(dc.Cur[0], dc.Cur[1]); path.Add(PathCmdTw.M(x, y)); }
                    break;
                case 54: // LINETO
                    {
                        var to = (I32(r), I32(r + 4));
                        if (path is not null) { var (x, y) = ToPage(to.Item1, to.Item2); path.Add(PathCmdTw.L(x, y)); }
                        else Draw(Poly(new() { (dc.Cur[0], dc.Cur[1]), to }, false), false);
                        dc.Cur = new[] { to.Item1, to.Item2 };
                        break;
                    }
                case 43: Draw(Rect(I32(r), I32(r + 4), I32(r + 8), I32(r + 12)), true); break;
                case 44: Draw(Rect(I32(r), I32(r + 4), I32(r + 8), I32(r + 12)), true); break; // ROUNDRECT ≈ ret.
                case 42: Draw(Ellipse(I32(r), I32(r + 4), I32(r + 8), I32(r + 12)), true); break;
                case 86: Draw(Poly(Pts16(r + 20, U32(r + 16)), true), true); break; // POLYGON16
                case 87: Draw(Poly(Pts16(r + 20, U32(r + 16)), false), false); break; // POLYLINE16
                case 3: Draw(Poly(Pts32(r + 20, U32(r + 16)), true), true); break;
                case 4: Draw(Poly(Pts32(r + 20, U32(r + 16)), false), false); break;
                case 89:
                case 6: // POLYLINETO
                    {
                        var pts = type == 89 ? Pts16(r + 20, U32(r + 16)) : Pts32(r + 20, U32(r + 16));
                        if (path is not null) path.AddRange(Poly(pts, false, true));
                        else
                        {
                            var all = new List<(double, double)> { (dc.Cur[0], dc.Cur[1]) };
                            all.AddRange(pts);
                            Draw(Poly(all, false), false);
                        }
                        if (pts.Count > 0) dc.Cur = new[] { pts[^1].Item1, pts[^1].Item2 };
                        break;
                    }
                case 85:
                case 2: // POLYBEZIER
                    {
                        var pts = type == 85 ? Pts16(r + 20, U32(r + 16)) : Pts32(r + 20, U32(r + 16));
                        Draw(Bezier(pts, true), false);
                        break;
                    }
                case 88:
                case 5: // POLYBEZIERTO
                    {
                        var pts = type == 88 ? Pts16(r + 20, U32(r + 16)) : Pts32(r + 20, U32(r + 16));
                        var all = new List<(double, double)> { (dc.Cur[0], dc.Cur[1]) };
                        all.AddRange(pts);
                        var c = Bezier(all, path is null);
                        if (path is not null) path.AddRange(c);
                        else Draw(c, false);
                        if (pts.Count > 0) dc.Cur = new[] { pts[^1].Item1, pts[^1].Item2 };
                        break;
                    }
                case 91:
                case 8: // POLYPOLYGON
                    {
                        uint n = U32(r + 16);
                        var counts = new List<uint>();
                        for (long k = 0; k < n; k++) counts.Add(U32(r + 24 + k * 4));
                        long o = r + 24 + n * 4L;
                        var cmds = new List<PathCmdTw>();
                        foreach (var c in counts)
                        {
                            var pts = type == 91 ? Pts16(o, c) : Pts32(o, c);
                            cmds.AddRange(Poly(pts, true));
                            o += c * (type == 91 ? 4L : 8L);
                        }
                        Draw(cmds, true);
                        break;
                    }
                case 90:
                case 7: // POLYPOLYLINE
                    {
                        uint n = U32(r + 16);
                        var counts = new List<uint>();
                        for (long k = 0; k < n; k++) counts.Add(U32(r + 24 + k * 4));
                        long o = r + 24 + n * 4L;
                        foreach (var c in counts)
                        {
                            Draw(Poly(type == 90 ? Pts16(o, c) : Pts32(o, c), false), false);
                            o += c * (type == 90 ? 4L : 8L);
                        }
                        break;
                    }
                case 59: path = new List<PathCmdTw>(); break; // BEGINPATH
                case 60: break; // ENDPATH
                case 61: path?.Add(PathCmdTw.Z()); break; // CLOSEFIGURE
                case 62: if (path is not null) EmitPath(path, true, false); path = null; break; // FILLPATH
                case 63: if (path is not null) EmitPath(path, true, true); path = null; break; // STROKEANDFILLPATH
                case 64: if (path is not null) EmitPath(path, false, true); path = null; break; // STROKEPATH
                case 67:
                case 68: path = null; break; // SELECTCLIPPATH / ABORTPATH
                case 84: // EXTTEXTOUTW
                    {
                        double refX = I32(r + 28), refY = I32(r + 32);
                        uint nChars = U32(r + 36), offStr = U32(r + 40), offDx = U32(r + 64);
                        var tsb = new StringBuilder();
                        for (long k = 0; k < nChars; k++) tsb.Append((char)U16(pos + offStr + k * 2));
                        string text = tsb.ToString();
                        if (text.Trim().Length == 0) break;
                        var f = dc.Font;
                        var face = ctx.Faces.Get(f.Face.Length > 0 ? f.Face : "Arial", f.Weight >= 600, f.Italic);
                        var fm = face.Font.Metrics;
                        // altura negativa = corpo (em); positiva = altura da célula
                        double cell = Math.Abs(f.Height);
                        if (cell == 0 || double.IsNaN(cell)) cell = 12;
                        double emLog = f.Height < 0 ? cell : (cell * fm.UnitsPerEm) / Math.Max(1, fm.UsWinAscent + fm.UsWinDescent);
                        double emTw = LenTw(emLog);
                        if (emTw < 1) break;
                        double sizePt = emTw / 20;
                        bool useCur = ((long)dc.TextAlign & 1) != 0;
                        var (px, py) = ToPage(useCur ? dc.Cur[0] : refX, useCur ? dc.Cur[1] : refY);
                        double ascU = fm.UsWinAscent != 0 && !double.IsNaN(fm.UsWinAscent) ? fm.UsWinAscent : fm.Ascender;
                        double descU = fm.UsWinDescent != 0 && !double.IsNaN(fm.UsWinDescent) ? fm.UsWinDescent : -fm.Descender;
                        double ascTw = (ascU / fm.UnitsPerEm) * emTw;
                        double descTw = (descU / fm.UnitsPerEm) * emTw;
                        long va = (long)dc.TextAlign & 24;
                        double baseY = va == 24 ? py : va == 8 ? py - descTw : py + ascTw;
                        // avanços: vetor Dx do registro (lógico) ou métricas da fonte
                        var dxs = new List<double>();
                        for (int k = 0; k < nChars; k++)
                            dxs.Add(offDx != 0 ? LenTw(I32(pos + offDx + k * 4L)) : (face.Font.AdvanceWidth(face.Font.GlyphId(text[k])) * emTw) / fm.UnitsPerEm);
                        double total = dxs.Aggregate(0.0, (a, b) => a + b);
                        long ha = (long)dc.TextAlign & 6;
                        double x = ha == 2 ? px - total : ha == 6 ? px - total / 2 : px;
                        var glyphs = new List<GlyphPos>();
                        for (int k = 0; k < nChars; k++) { glyphs.Add(new GlyphPos(text[k], x)); x += dxs[k]; }
                        outp.Add(new GlyphRunItem { Face = face, SizePt = sizePt, Color = dc.TextColor, Y = baseY, Glyphs = glyphs, Text = text });
                        break;
                    }
                case 76:
                case 77: // BITBLT / STRETCHBLT
                    {
                        double xd = I32(r + 16), yd = I32(r + 20), cx = I32(r + 24), cy = I32(r + 28);
                        uint offBmi = U32(r + 76), cbBmi = U32(r + 80), offBits = U32(r + 84), cbBits = U32(r + 88);
                        var img = cbBmi != 0 ? Dib(pos + offBmi, cbBmi, pos + offBits, cbBits) : null;
                        var (x0, y0) = ToPage(xd, yd);
                        var (x1, y1) = ToPage(xd + cx, yd + cy);
                        if (img is not null) outp.Add(new ImageItem { X = Math.Min(x0, x1), Y = Math.Min(y0, y1), W = Math.Abs(x1 - x0), H = Math.Abs(y1 - y0), Image = img });
                        else if (dc.Brush.Style != 1) outp.Add(new RectItem { X = Math.Min(x0, x1), Y = Math.Min(y0, y1), W = Math.Abs(x1 - x0), H = Math.Abs(y1 - y0), Fill = dc.Brush.Color });
                        break;
                    }
                case 114: // ALPHABLEND
                    {
                        double xd = I32(r + 16), yd = I32(r + 20), cx = I32(r + 24), cy = I32(r + 28);
                        int alphaFmt = r + 35 < bytes.Length ? bytes[r + 35] : -1;
                        uint offBmi = U32(r + 76), cbBmi = U32(r + 80), offBits = U32(r + 84), cbBits = U32(r + 88);
                        var img = Dib(pos + offBmi, cbBmi, pos + offBits, cbBits, alphaFmt == 1);
                        var (x0, y0) = ToPage(xd, yd);
                        var (x1, y1) = ToPage(xd + cx, yd + cy);
                        if (img is not null) outp.Add(new ImageItem { X = Math.Min(x0, x1), Y = Math.Min(y0, y1), W = Math.Abs(x1 - x0), H = Math.Abs(y1 - y0), Image = img });
                        break;
                    }
                case 81: // STRETCHDIBITS
                    {
                        double xd = I32(r + 16), yd = I32(r + 20);
                        uint offBmi = U32(r + 40), cbBmi = U32(r + 44), offBits = U32(r + 48), cbBits = U32(r + 52);
                        double cx = I32(r + 64), cy = I32(r + 68);
                        var img = Dib(pos + offBmi, cbBmi, pos + offBits, cbBits);
                        var (x0, y0) = ToPage(xd, yd);
                        var (x1, y1) = ToPage(xd + cx, yd + cy);
                        if (img is not null) outp.Add(new ImageItem { X = Math.Min(x0, x1), Y = Math.Min(y0, y1), W = Math.Abs(x1 - x0), H = Math.Abs(y1 - y0), Image = img, FlipV = y1 < y0 });
                        break;
                    }
            }
            pos += size;
        }
        return outp;
    }
}
