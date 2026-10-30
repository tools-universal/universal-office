using UniversalOffice.Core;
using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>Efeito de preenchimento da página resolvido para pintar (cores em RRGGBB).</summary>
public sealed class PageFillPaint
{
    public string Type = "gradient";
    public string C1 = "FFFFFF";
    public string C2 = "FFFFFF";
    public List<(double Pos, string Color)>? Stops;
    public double Angle;
    public double Focus;
    public (double X, double Y)? FocusPosition;
    public bool GradientCenter;
    public InlineImage? Image;
    public (int W, int H, int Dpi)? ImagePx;
    public int[]? Pattern;
}

/// <summary>
/// Efeitos de preenchimento da Cor da Página como o Word DESENHA — port de
/// write/packages/docx-layout/src/page-fill.ts (medido em write/tools/page-lab):
/// ladrilhos de "pixel de dispositivo" ancorados no canto da página (no PDF 0,12 pt
/// para gradiente e imagem, 1 pt para o padrão; textura no tamanho natural), o
/// gradiente num ladrilho de 1024×768 px aplicado ESPELHADO e a mistura em S (gama 2,2).
/// </summary>
public static class PageFillMath
{
    private static double Tri(double q) => 1 - Math.Abs(1 - 2 * q);
    private static double Fract(double v) => v - Math.Floor(v);
    private static bool Near(double a, double b) => Math.Abs(a - b) < 0.5;

    /// <summary>O efeito do w:background resolvido (cor 1 = fillcolor, ou a cor da página).</summary>
    public static PageFillPaint? Resolve(PageBackground bg, string? pageColor)
    {
        var f = bg.Fill;
        if (f is null) return null;
        string c1 = Js.ToUpper(f.Color ?? pageColor ?? "FFFFFF");
        var o = new PageFillPaint
        {
            Type = f.Type, C1 = c1, C2 = PageBackgroundReader.ResolveColor2(f.Color2, c1),
            Angle = f.Angle ?? 0, Focus = f.Focus ?? 0, FocusPosition = f.FocusPosition, GradientCenter = f.GradientCenter,
            Stops = f.Colors is { Count: > 0 } ? f.Colors : null,
        };
        if (f.Image is { } img)
        {
            var info = ImagePixelInfo(img.Data);
            o.Image = new InlineImage { Data = img.Data, Ext = img.Ext, WidthTwips = info is { } i1 ? i1.W * 1440.0 / i1.Dpi : 1440, HeightTwips = info is { } i2 ? i2.H * 1440.0 / i2.Dpi : 1440 };
            o.ImagePx = info;
            if (f.Type == "pattern") o.Pattern = PatternRowsFromImage(img.Data);
        }
        if (f.Type == "pattern" && o.Pattern is null) return null;
        if ((f.Type == "frame" || f.Type == "tile") && o.ImagePx is null) return null;
        return o;
    }

    /// <summary>Fração da cor 2 (0..1) no ponto (x, y) ∈ [0,1]² do ladrilho (regras medidas).</summary>
    public static double FillParam(PageFillPaint f, double x, double y, bool pdfCorner = false)
    {
        double fo = f.Focus;
        if (f.Type == "gradientRadial")
        {
            if (f.GradientCenter)
            {
                double qx = pdfCorner ? x : Tri(x), qy = pdfCorner ? y : Tri(y);
                var (fx, fy) = f.FocusPosition ?? (0, 0);
                double p = Math.Max(Math.Abs(qx - fx), Math.Abs(qy - fy));
                return fo > 0 ? p : 1 - p;
            }
            var (cx, cy) = f.FocusPosition ?? (0.5, 0.5);
            double pc = Math.Min(1, Math.Max(Math.Abs(x - cx) / Math.Max(Math.Max(cx, 1 - cx), 1e-6), Math.Abs(y - cy) / Math.Max(Math.Max(cy, 1 - cy), 1e-6)));
            return fo > 0 ? pc : 1 - pc;
        }
        double a = ((f.Angle % 360) + 360) % 360;
        if (a > 180) a -= 360;
        if (Near(a, 0) || Near(Math.Abs(a), 180)) return fo > 0 ? Tri(y) : 1 - Tri(y);
        // vertical: o ±50% tem o sinal trocado em relação ao horizontal (tl-2-3/2-4)
        if (Near(Math.Abs(a), 90)) return fo >= 75 || fo < 0 ? Tri(x) : 1 - Tri(x);
        if (Near(a, -135) || Near(a, 45))
        {
            double q = (x + y) / 2;
            if (fo >= 75) return Tri(q);
            if (fo > 0) return 1 - Tri(Fract(2 * q));
            if (fo < 0) return Tri(Fract(2 * q));
            return 1 - Tri(q);
        }
        if (Near(a, -45) || Near(a, 135))
        {
            double v = x - y;
            double bas = 1 - Math.Abs(((((v + 1.5) % 2) + 2) % 2) - 1);
            if (fo >= 75) return 1 - bas;
            if (fo > 0) return Tri(Fract(v));
            if (fo < 0) return 1 - Tri(Fract(v));
            return bas;
        }
        double r = a * Math.PI / 180;
        double dx = -Math.Sin(r), dy = Math.Cos(r);
        double lo = Math.Min(0, dx) + Math.Min(0, dy), hi = Math.Max(0, dx) + Math.Max(0, dy);
        double qq = hi > lo ? (x * dx + y * dy - lo) / (hi - lo) : 0;
        return fo > 0 ? Tri(qq) : 1 - Tri(qq);
    }

    /// <summary>Tamanho do ladrilho do gradiente em px de dispositivo (o do canto no PDF é a metade).</summary>
    public static (int W, int H) GradientTilePx(PageFillPaint f, bool pdf) =>
        pdf && f.Type == "gradientRadial" && f.GradientCenter ? (512, 384) : (1024, 768);

    /// <summary>Ladrilho RGBA do gradiente em w×h pixels.</summary>
    public static byte[] GradientTileRgba(PageFillPaint f, int w, int h, bool pdf = false)
    {
        const int N = 1024;
        var stops = f.Stops is { Count: > 0 }
            ? f.Stops.Select(s => new GradStop { Pos = s.Pos, Color = s.Color }).ToList()
            : new List<GradStop> { new() { Pos = 0, Color = f.C1 }, new() { Pos = 1, Color = f.C2 } };
        var lut = Geometry.GradientSamples(stops, N);
        var o = new byte[w * h * 4];
        bool corner = pdf && f.Type == "gradientRadial" && f.GradientCenter;
        for (int j = 0; j < h; j++)
        {
            double y = h > 1 ? (double)j / (h - 1) : 0;
            for (int i = 0; i < w; i++)
            {
                double x = w > 1 ? (double)i / (w - 1) : 0;
                int k = (int)Math.Max(0, Math.Min(N - 1, JsNumber.Round(FillParam(f, x, y, corner) * (N - 1)))) * 3;
                int p = (j * w + i) * 4;
                o[p] = lut[k]; o[p + 1] = lut[k + 1]; o[p + 2] = lut[k + 2]; o[p + 3] = 255;
            }
        }
        return o;
    }

    /// <summary>Padrão 8×8 em RGBA (c1 onde o bit é 1).</summary>
    public static byte[] PatternRgba(PageFillPaint f)
    {
        var o = new byte[64 * 4];
        var fg = HexRgb(f.C1); var bg = HexRgb(f.C2);
        for (int y = 0; y < 8; y++)
            for (int x = 0; x < 8; x++)
            {
                bool on = (((f.Pattern?[y] ?? 0) >> (7 - x)) & 1) != 0;
                var c = on ? fg : bg;
                int p = (y * 8 + x) * 4;
                o[p] = c.R; o[p + 1] = c.G; o[p + 2] = c.B; o[p + 3] = 255;
            }
        return o;
    }

    private static (byte R, byte G, byte B) HexRgb(string h)
    {
        byte P(int i) => i + 2 <= h.Length && int.TryParse(h.AsSpan(i, 2), System.Globalization.NumberStyles.HexNumber, System.Globalization.CultureInfo.InvariantCulture, out int v) ? (byte)v : (byte)0;
        return (P(0), P(2), P(4));
    }

    /// <summary>Tamanho de UM ladrilho em twips para o alvo (tela: px CSS; PDF: 2,4/20 twips).</summary>
    public static (double W, double H)? TileTw(PageFillPaint f, double devicePxTw, double patternPxTw, bool pdf = false)
    {
        if (f.Type == "gradient" || f.Type == "gradientRadial")
        {
            var t = GradientTilePx(f, pdf);
            return (t.W * devicePxTw, t.H * devicePxTw);
        }
        if (f.Type == "pattern") return f.Pattern is not null ? (8 * patternPxTw, 8 * patternPxTw) : null;
        if (f.ImagePx is not { } px || px.W <= 0 || px.H <= 0) return null;
        if (f.Type == "frame") return (px.W * devicePxTw, px.H * devicePxTw);
        double dpi = px.Dpi > 0 ? px.Dpi : 96;
        return (px.W * 1440 / dpi, px.H * 1440 / dpi);
    }

    /// <summary>Tamanho em px e DPI de uma imagem (PNG/JPEG/GIF/BMP; DPI 96 se não declarado).</summary>
    public static (int W, int H, int Dpi)? ImagePixelInfo(byte[] b)
    {
        int U32(int i) => (int)((uint)(b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]));
        if (b.Length > 24 && b[0] == 0x89 && b[1] == 0x50)
        {
            int w = U32(16), h = U32(20);
            int dpi = 96;
            for (int i = 8; i + 8 < b.Length;)
            {
                int len = U32(i);
                string type = System.Text.Encoding.ASCII.GetString(b, i + 4, 4);
                if (type == "pHYs" && i + 16 < b.Length && b[i + 16] == 1) dpi = (int)JsNumber.Round((uint)U32(i + 8) * 0.0254);
                if (type is "IDAT" or "IEND" || len < 0) break;
                i += 12 + len;
            }
            return (w, h, dpi);
        }
        var jp = Images.JpegInfo(b);
        if (jp is not null)
        {
            int dpi = 96;
            if (b.Length > 15 && b[2] == 0xff && b[3] == 0xe0 && b[6] == 0x4a && b[7] == 0x46 && b[13] == 1) dpi = (b[14] << 8) | b[15];
            return (jp.Width, jp.Height, dpi != 0 ? dpi : 96);
        }
        if (b.Length > 10 && b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46) return (b[6] | (b[7] << 8), b[8] | (b[9] << 8), 96);
        if (b.Length > 42 && b[0] == 0x42 && b[1] == 0x4d)
        {
            int w = b[18] | (b[19] << 8) | (b[20] << 16), h = Math.Abs(b[22] | (b[23] << 8) | (b[24] << 16) | (b[25] << 24));
            uint ppm = (uint)(b[38] | (b[39] << 8) | (b[40] << 16) | (b[41] << 24));
            return (w, h, ppm != 0 ? (int)JsNumber.Round(ppm * 0.0254) : 96);
        }
        var png = Images.DecodePng(b);
        return png is null ? null : (png.Width, png.Height, 96);
    }

    /// <summary>As 8 linhas de um GIF de padrão do Word (pixel claro = cor de frente).</summary>
    public static int[]? PatternRowsFromImage(byte[] b)
    {
        var img = Images.DecodeGif(b) ?? Images.DecodePng(b);
        if (img is null || img.Width < 8 || img.Height < 8) return null;
        var rows = new int[8];
        for (int y = 0; y < 8; y++)
        {
            int r = 0;
            for (int x = 0; x < 8; x++)
            {
                int o = (y * img.Width + x) * 4;
                double lum = 0.299 * img.Data[o] + 0.587 * img.Data[o + 1] + 0.114 * img.Data[o + 2];
                if (lum >= 128) r |= 0x80 >> x;
            }
            rows[y] = r;
        }
        return rows;
    }
}
