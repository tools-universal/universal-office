using System.Buffers.Binary;
using System.Text;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Metarquivo WMF ([MS-WMF], 16 bits — ex.: a prévia de um objeto do Equation Editor 3.0)
/// como itens de desenho (porta de docx-layout/src/wmf.ts), no subconjunto que esses
/// arquivos usam: janela lógica (SETWINDOWORG/EXT, mapeada no retângulo do objeto),
/// canetas, pincéis e fontes, linhas (MOVETO/LINETO, POLYLINE), POLYGON, RECTANGLE e
/// texto (TEXTOUT/EXTTEXTOUT, com o alinhamento do SETTEXTALIGN). O Word grava esse texto
/// no PDF; o da fonte Symbol sai na área privada (U+F0xx), como o w:sym (corpus t15).
/// </summary>
public static class Wmf
{
    private sealed class Pen { public int Style; public int Width; public string Color = "000000"; }
    private sealed class Brush { public int Style; public string Color = "FFFFFF"; }
    private sealed class WFont { public int Height; public int Weight; public bool Italic; public string Face = ""; public int Charset; }
    private sealed class Obj { public string Kind = "other"; public Pen? Pen; public Brush? Brush; public WFont? Font; }
    private sealed class Dc
    {
        public (double X, double Y) Org;
        public (double X, double Y) Ext;
        public Pen Pen = new();
        public Brush Brush = new();
        public WFont Font = new();
        public string TextColor = "000000";
        public int TextAlign;
        public (double X, double Y) Cur;
        public Dc Copy() => (Dc)MemberwiseClone();
    }

    private static string ColorOf(long v) =>
        ((v & 0xff).ToString("x2") + ((v >> 8) & 0xff).ToString("x2") + ((v >> 16) & 0xff).ToString("x2")).ToUpperInvariant();

    /// <summary>Windows-1252: 0x80–0x9F (o resto coincide com o Latin-1)</summary>
    private static readonly int[] Cp1252 = { 0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178 };

    public static bool IsWmf(byte[] b)
    {
        if (b.Length < 40) return false;
        // cabeçalho "placeable" (Aldus) ou o de memória/disco (tipo 1/2, 9 palavras)
        if (b[0] == 0xd7 && b[1] == 0xcd && b[2] == 0xc6 && b[3] == 0x9a) return true;
        return (b[0] == 1 || b[0] == 2) && b[1] == 0 && b[2] == 9 && b[3] == 0;
    }

    /// <summary>Uint8Array.subarray(start, end) (limitado ao tamanho).</summary>
    private static byte[] Sub(byte[] b, long start, long end)
    {
        long n = b.Length;
        long s = start < 0 ? Math.Max(n + start, 0) : Math.Min(start, n);
        long e = end < 0 ? Math.Max(n + end, 0) : Math.Min(end, n);
        if (e <= s) return Array.Empty<byte>();
        var outp = new byte[e - s];
        Array.Copy(b, s, outp, 0, e - s);
        return outp;
    }

    /// <summary>Desenha o WMF no retângulo (twips) dado.</summary>
    public static List<PageItem> RenderWmf(DocContext ctx, byte[] bytes, double destX, double destY, double destW, double destH)
    {
        var outp = new List<PageItem>();
        if (!IsWmf(bytes)) return outp;
        int I16(long o) => BinaryPrimitives.ReadInt16LittleEndian(bytes.AsSpan(checked((int)o), 2));
        int U16(long o) => BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(checked((int)o), 2));
        long U32(long o) => BinaryPrimitives.ReadUInt32LittleEndian(bytes.AsSpan(checked((int)o), 4));
        bool placeable = bytes[0] == 0xd7;
        long pos = placeable ? 22 : 0;
        // janela padrão: a caixa do cabeçalho "placeable"
        int[] box = placeable ? new[] { I16(6), I16(8), I16(10), I16(12) } : new[] { 0, 0, 1, 1 };
        pos += U16(pos + 2) * 2L; // cabeçalho (9 palavras)
        int ex0 = box[2] - box[0], ey0 = box[3] - box[1];
        var dc = new Dc
        {
            Org = (box[0], box[1]), Ext = (ex0 != 0 ? ex0 : 1, ey0 != 0 ? ey0 : 1),
            Pen = new Pen { Style = 0, Width = 0, Color = "000000" }, Brush = new Brush { Style = 0, Color = "FFFFFF" },
            Font = new WFont { Height = -12, Weight = 400, Italic = false, Face = "Arial", Charset = 0 }, TextColor = "000000", TextAlign = 0, Cur = (0, 0),
        };
        var stack = new List<Dc>();
        var objs = new List<Obj?>();
        void Add(Obj o) { int k = objs.IndexOf(null); if (k >= 0) objs[k] = o; else objs.Add(o); }
        double Sx() => destW / dc.Ext.X;
        double Sy() => destH / dc.Ext.Y;
        (double X, double Y) ToPage(double x, double y) => (destX + (x - dc.Org.X) * Sx(), destY + (y - dc.Org.Y) * Sy());
        void Stroke(List<PathCmdTw> cmds, bool fill)
        {
            string? f = fill && dc.Brush.Style != 1 ? dc.Brush.Color : null;
            StrokeSpec? st = null;
            if (dc.Pen.Style != 5)
            {
                double pw = Math.Abs(dc.Pen.Width * Sx());
                st = new StrokeSpec { Color = dc.Pen.Color, WidthPt = Math.Max(0.25, (double.IsNaN(pw) ? 0 : pw) / 20) };
            }
            if (cmds.Count > 0 && (f is not null || st is not null)) outp.Add(new PathItem { Cmds = cmds, Fill = f, Stroke = st });
        }
        List<PathCmdTw> Poly(long o, int n, bool closed)
        {
            var c = new List<PathCmdTw>();
            for (int k = 0; k < n; k++)
            {
                var (x, y) = ToPage(I16(o + 4 * k), I16(o + 4 * k + 2));
                c.Add(k > 0 ? PathCmdTw.L(x, y) : PathCmdTw.M(x, y));
            }
            if (closed) c.Add(PathCmdTw.Z());
            return c;
        }
        void Text(double x, double y, byte[] raw, Func<int, int>? dx)
        {
            var f = dc.Font;
            bool sym = f.Charset == 2;
            var sb = new StringBuilder();
            foreach (byte b in raw) sb.Append((char)(sym ? 0xf000 + b : b >= 0x80 && b < 0xa0 ? Cp1252[b - 0x80] : b));
            string s = sb.ToString();
            if (s.Trim().Length == 0) return;
            var face = ctx.Faces.Get(f.Face.Length > 0 ? f.Face : "Arial", f.Weight >= 600, f.Italic);
            var fm = face.Font.Metrics;
            // altura negativa = corpo (em); positiva = altura da célula
            int cellI = Math.Abs(f.Height);
            double cell = cellI != 0 ? cellI : 12;
            double emLog = f.Height < 0 ? cell : (cell * fm.UnitsPerEm) / Math.Max(1, fm.UsWinAscent + fm.UsWinDescent);
            double emTw = Math.Abs(emLog * Sy());
            if (emTw < 1) return;
            bool upd = (dc.TextAlign & 1) != 0;
            var (px, py) = ToPage(upd ? dc.Cur.X : x, upd ? dc.Cur.Y : y);
            double asc = ((fm.UsWinAscent != 0 ? fm.UsWinAscent : fm.Ascender) / fm.UnitsPerEm) * emTw;
            double desc = ((fm.UsWinDescent != 0 ? fm.UsWinDescent : -fm.Descender) / fm.UnitsPerEm) * emTw;
            int va = dc.TextAlign & 24;
            double baseY = va == 24 ? py : va == 8 ? py - desc : py + asc;
            var adv = new double[s.Length];
            for (int k = 0; k < s.Length; k++)
                adv[k] = dx is not null ? Math.Abs(dx(k) * Sx()) : (face.Font.AdvanceWidth(face.Font.GlyphId(s[k])) * emTw) / fm.UnitsPerEm;
            double total = adv.Sum();
            int ha = dc.TextAlign & 6;
            double gx = ha == 2 ? px - total : ha == 6 ? px - total / 2 : px;
            var glyphs = new List<GlyphPos>();
            for (int k = 0; k < s.Length; k++) { glyphs.Add(new GlyphPos(s[k], gx)); gx += adv[k]; }
            outp.Add(new GlyphRunItem { Face = face, SizePt = emTw / 20, Color = dc.TextColor, Y = baseY, Glyphs = glyphs, Text = s });
            if (upd) dc.Cur = (dc.Cur.X + total / Sx(), dc.Cur.Y);
        }

        while (pos + 6 <= bytes.Length)
        {
            long size = U32(pos) * 2;
            int fn = U16(pos + 4);
            long p = pos + 6;
            if (fn == 0 || size < 6 || pos + size > bytes.Length) break;
            switch (fn)
            {
                case 0x020b: dc.Org = (I16(p + 2), I16(p)); break; // SETWINDOWORG (y, x)
                case 0x020c: { int ex = I16(p + 2), ey = I16(p); dc.Ext = (ex != 0 ? ex : 1, ey != 0 ? ey : 1); break; } // SETWINDOWEXT
                case 0x012e: dc.TextAlign = U16(p); break;
                case 0x0209: dc.TextColor = ColorOf(U32(p)); break;
                case 0x001e: stack.Add(dc.Copy()); break; // SAVEDC
                case 0x0127: // RESTOREDC
                    {
                        int k = I16(p);
                        if (k < 0)
                        {
                            int start = stack.Count + k;
                            if (start < 0) start = Math.Max(stack.Count + start, 0);
                            if (start < stack.Count)
                            {
                                var s = stack[start];
                                stack.RemoveRange(start, stack.Count - start);
                                dc = s;
                            }
                        }
                        break;
                    }
                case 0x02fa: Add(new Obj { Kind = "pen", Pen = new Pen { Style = U16(p), Width = I16(p + 2), Color = ColorOf(U32(p + 6)) } }); break;
                case 0x02fc: Add(new Obj { Kind = "brush", Brush = new Brush { Style = U16(p), Color = ColorOf(U32(p + 2)) } }); break;
                case 0x02fb: // CREATEFONTINDIRECT
                    {
                        var face = new StringBuilder();
                        for (long k = p + 18; k < Math.Min(p + 50, pos + size) && k < bytes.Length && bytes[k] != 0; k++) face.Append((char)bytes[k]);
                        Add(new Obj
                        {
                            Kind = "font",
                            Font = new WFont { Height = I16(p), Weight = I16(p + 8), Italic = p + 10 >= bytes.Length || bytes[p + 10] != 0, Face = face.ToString(), Charset = p + 13 < bytes.Length ? bytes[p + 13] : -1 },
                        });
                        break;
                    }
                case 0x00f7: case 0x0142: case 0x01f9: case 0x06ff: Add(new Obj { Kind = "other" }); break; // paleta, pincel DIB, região
                case 0x012d: // SELECTOBJECT
                    {
                        int idx = U16(p);
                        var o = idx < objs.Count ? objs[idx] : null;
                        if (o?.Kind == "pen") dc.Pen = o.Pen!; else if (o?.Kind == "brush") dc.Brush = o.Brush!; else if (o?.Kind == "font") dc.Font = o.Font!;
                        break;
                    }
                case 0x01f0: if (U16(p) < objs.Count) objs[U16(p)] = null; break; // DELETEOBJECT
                case 0x0214: dc.Cur = (I16(p + 2), I16(p)); break; // MOVETO (y, x)
                case 0x0213: // LINETO
                    {
                        var (x0, y0) = ToPage(dc.Cur.X, dc.Cur.Y);
                        dc.Cur = (I16(p + 2), I16(p));
                        var (x1, y1) = ToPage(dc.Cur.X, dc.Cur.Y);
                        Stroke(new List<PathCmdTw> { PathCmdTw.M(x0, y0), PathCmdTw.L(x1, y1) }, false);
                        break;
                    }
                case 0x0325: Stroke(Poly(p + 2, I16(p), false), false); break; // POLYLINE
                case 0x0324: Stroke(Poly(p + 2, I16(p), true), true); break; // POLYGON
                case 0x041b: // RECTANGLE (bottom, right, top, left)
                    {
                        var (x0, y0) = ToPage(I16(p + 6), I16(p + 4));
                        var (x1, y1) = ToPage(I16(p + 2), I16(p));
                        Stroke(new List<PathCmdTw> { PathCmdTw.M(x0, y0), PathCmdTw.L(x1, y0), PathCmdTw.L(x1, y1), PathCmdTw.L(x0, y1), PathCmdTw.Z() }, true);
                        break;
                    }
                case 0x0521: // TEXTOUT: n, cadeia (par), y, x
                    {
                        int n = I16(p);
                        long o = p + 2 + ((n + 1) & ~1);
                        Text(I16(o + 2), I16(o), Sub(bytes, p + 2, p + 2 + n), null);
                        break;
                    }
                case 0x0a32: // EXTTEXTOUT: y, x, n, opções, [retângulo], cadeia (par), [dx]
                    {
                        int n = I16(p + 4), opt = U16(p + 6);
                        long so = p + 8 + ((opt & 6) != 0 ? 8 : 0);
                        long dxo = so + ((n + 1) & ~1);
                        bool hasDx = dxo + 2L * n <= pos + size;
                        Text(I16(p + 2), I16(p), Sub(bytes, so, so + n), hasDx ? k => I16(dxo + 2L * k) : null);
                        break;
                    }
            }
            pos += size;
        }
        return outp;
    }
}
