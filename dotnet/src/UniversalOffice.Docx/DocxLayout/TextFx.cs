using System.Globalization;
using System.Text;
using UniversalOffice.Core;
using UniversalOffice.Docx;
using UniversalOffice.DrawingML;
using Raster = UniversalOffice.DrawingML.Raster;

namespace UniversalOffice.DocxLayout;

/// <summary>Preenchimento resolvido de um efeito de texto: none | solid | grad.</summary>
public sealed class ResolvedFill
{
    public string Kind = "solid";
    public string Hex = "000000";
    public double Alpha = 1;
    public List<(double Pos, string Hex, double Alpha)> Stops = new();
    public double AngleDeg;
    public bool Scaled;
    public string? Path;
    public RectTw? FillTo;

    public string Key()
    {
        var sb = new StringBuilder(Kind);
        if (Kind == "solid") sb.Append('|').Append(Hex).Append('|').Append(Js.Str(Alpha));
        if (Kind == "grad")
        {
            foreach (var s in Stops) sb.Append('|').Append(Js.Str(s.Pos)).Append(',').Append(s.Hex).Append(',').Append(Js.Str(s.Alpha));
            sb.Append('|').Append(Js.Str(AngleDeg)).Append(Scaled ? "s" : "").Append('|').Append(Path ?? "");
            if (FillTo is { } f) sb.Append('|').Append(Js.Str(f.L)).Append(',').Append(Js.Str(f.T)).Append(',').Append(Js.Str(f.R)).Append(',').Append(Js.Str(f.B));
        }
        return sb.ToString();
    }
}

public sealed class ResolvedOutline
{
    public double WidthPt;
    public ResolvedFill Fill = new();
    public string? Dash;
    /// <summary>butt | round | square</summary>
    public string Cap = "butt";
    /// <summary>round | bevel | miter</summary>
    public string Join = "miter";
}

public sealed record ResolvedTextShadow(double BlurPt, double DistPt, double DirDeg, double Sx, double Sy, double KxDeg, double KyDeg, string Algn, string Hex, double Alpha);
public sealed record ResolvedGlow(double RadPt, string Hex, double Alpha);
public sealed record ResolvedReflection(double BlurPt, double StA, double StPos, double EndA, double EndPos, double DistPt, double DirDeg, string Algn);

/// <summary>Efeitos de texto w14 resolvidos de um run (degradê, contorno, sombra, brilho, reflexo).</summary>
public sealed class ResolvedTextFx
{
    /// <summary>preenchimento que não é a cor sólida do texto (degradê, nenhum)</summary>
    public ResolvedFill? Fill;
    public ResolvedOutline? Outline;
    public ResolvedTextShadow? Shadow;
    public ResolvedGlow? Glow;
    public ResolvedReflection? Reflection;

    /// <summary>Chave dos efeitos (o JSON.stringify do JS: agrupa os glifos com os mesmos efeitos).</summary>
    public string Key()
    {
        var sb = new StringBuilder();
        if (Fill is not null) sb.Append("f:").Append(Fill.Key());
        if (Outline is { } o) sb.Append(";o:").Append(Js.Str(o.WidthPt)).Append('|').Append(o.Fill.Key()).Append('|').Append(o.Dash ?? "").Append('|').Append(o.Cap).Append('|').Append(o.Join);
        if (Shadow is { } s) sb.Append(";s:").Append(string.Join(",", new[] { s.BlurPt, s.DistPt, s.DirDeg, s.Sx, s.Sy, s.KxDeg, s.KyDeg }.Select(Js.Str))).Append('|').Append(s.Algn).Append('|').Append(s.Hex).Append('|').Append(Js.Str(s.Alpha));
        if (Glow is { } g) sb.Append(";g:").Append(Js.Str(g.RadPt)).Append('|').Append(g.Hex).Append('|').Append(Js.Str(g.Alpha));
        if (Reflection is { } r) sb.Append(";r:").Append(string.Join(",", new[] { r.BlurPt, r.StA, r.StPos, r.EndA, r.EndPos, r.DistPt, r.DirDeg }.Select(Js.Str))).Append('|').Append(r.Algn);
        return sb.ToString();
    }
}

/// <summary>
/// EFEITOS DE TEXTO (w14) no desenho — porta de docx-layout/src/textfx.ts: as cores do tema
/// resolvidas e as medidas em pontos, a caixa do run e a SILHUETA dele (contornos dos glifos),
/// base dos efeitos em raster de UniversalOffice.DrawingML (sombra, brilho, reflexo), os mesmos das
/// imagens e formas. Medido no PDF do Word (write/tools/home-lab exp-effects.ps1): o brilho, a
/// sombra e o reflexo saem numa imagem com alfa (~200 dpi) ATRÁS do texto, que continua texto;
/// o contorno sai em curvas.
/// </summary>
public static class TextFx
{
    private const double EmuPt = 12700;
    private const double Ang = 60000;

    /// <summary>Cor w14 → hex + opacidade (modificadores do DrawingML; alpha à parte). No w14 o
    /// w14:alpha é a TRANSPARÊNCIA (medido: Transparência 60% → alpha 60000), ao contrário do
    /// a:alpha do DrawingML.</summary>
    public static (string Hex, double Alpha) FxColor(UniversalOffice.Docx.FxColor c, Theme theme, string fallback = "000000")
    {
        var mods = (c.Mods ?? new List<(string K, double V)>()).Where(m => m.K != "alpha").ToList();
        double? a = null;
        if (c.Mods is not null) foreach (var m in c.Mods) if (m.K == "alpha") { a = m.V; break; }
        string spec = (Js.Truthy(c.Scheme) ? "@" + c.Scheme : c.Rgb ?? fallback)
            + (mods.Count > 0 ? "|" + string.Join(",", mods.Select(m => $"{m.K}={Js.Str(m.V)}")) : "");
        return (Resolve.ResolveDrawingColor(spec, theme) ?? fallback, a is { } av ? Math.Max(0, Math.Min(1, 1 - av / 100000)) : 1);
    }

    private static ResolvedFill FillOf(FxFill f, Theme theme, string text)
    {
        if (f.Type == "none") return new ResolvedFill { Kind = "none" };
        if (f.Type == "solid")
        {
            var (hex, alpha) = FxColor(f.Color ?? new UniversalOffice.Docx.FxColor(), theme, text);
            return new ResolvedFill { Kind = "solid", Hex = hex, Alpha = alpha };
        }
        var stops = f.Stops.Select(s => { var (h, al) = FxColor(s.Color, theme, text); return (Pos: s.Pos / 100000, Hex: h, Alpha: al); })
            .OrderBy(s => s.Pos).ToList();
        var outp = new ResolvedFill { Kind = "grad", Stops = stops, AngleDeg = (f.Lin?.Ang ?? 5400000) / Ang, Scaled = f.Lin?.Scaled == true };
        if (f.Path is { } p)
        {
            outp.Path = p.Kind;
            outp.FillTo = new RectTw { L = p.L / 100000, T = p.T / 100000, R = p.R / 100000, B = p.B / 100000 };
        }
        return outp;
    }

    private static string CapOf(string? cap) => cap switch { "rnd" => "round", "sq" => "square", "flat" or null => "butt", _ => "butt" };

    /// <summary>Efeitos resolvidos de um run (nulo: só a cor sólida, o caminho comum).</summary>
    public static ResolvedTextFx? ResolveTextFx(TextEffects? fx, Theme theme, string text)
    {
        if (fx is null) return null;
        var outp = new ResolvedTextFx();
        bool any = false;
        if (fx.Fill is not null && fx.Fill.Type != "solid") { outp.Fill = FillOf(fx.Fill, theme, text); any = true; }
        var o = fx.Outline;
        if (o is not null && o.Fill is not null && o.Fill.Type != "none")
        {
            // w="0": o traço mais fino do dispositivo (o Word grava 0 nos modelos "sem contorno" com cor)
            double w = (o.W ?? 9525) / EmuPt;
            if (w > 0)
            {
                outp.Outline = new ResolvedOutline
                {
                    WidthPt = w, Fill = FillOf(o.Fill, theme, text),
                    Dash = Js.Truthy(o.Dash) && o.Dash != "solid" ? o.Dash : null,
                    Cap = CapOf(o.Cap), Join = o.Join == "round" ? "round" : o.Join == "bevel" ? "bevel" : "miter",
                };
                any = true;
            }
        }
        if (fx.Shadow is { } s)
        {
            var (hex, alpha) = FxColor(s.Color, theme);
            if (s.Sx != 0 && s.Sy != 0)
            {
                outp.Shadow = new ResolvedTextShadow(s.BlurRad / EmuPt, s.Dist / EmuPt, s.Dir / Ang, s.Sx / 100000, s.Sy / 100000, s.Kx / Ang, s.Ky / Ang, s.Algn, hex, alpha);
                any = true;
            }
        }
        if (fx.Glow is { } g && g.Rad > 0)
        {
            var (hex, alpha) = FxColor(g.Color, theme);
            outp.Glow = new ResolvedGlow(g.Rad / EmuPt, hex, alpha);
            any = true;
        }
        if (fx.Reflection is { } r)
        {
            outp.Reflection = new ResolvedReflection(r.BlurRad / EmuPt, r.StA / 100000, r.StPos / 100000, r.EndA / 100000, r.EndPos / 100000, r.Dist / EmuPt, r.Dir / Ang, r.Algn);
            any = true;
        }
        return any ? outp : null;
    }

    /// <summary>Degradê do texto como o das formas (caixa = a do run).</summary>
    public static GradFill GradOf(ResolvedFill f) => new()
    {
        Stops = f.Stops.Select(s => new GradStop { Pos = s.Pos, Color = s.Hex }).ToList(),
        AngleDeg = f.AngleDeg,
        Scaled = f.Scaled,
        Path = f.Path,
        FillTo = f.FillTo,
    };

    /// <summary>Quanto os efeitos passam da caixa do texto (pt), para o tamanho da camada.</summary>
    public static (double L, double T, double R, double B) FxMarginPt(ResolvedTextFx fx, double textHPt)
    {
        double m = (fx.Outline?.WidthPt ?? 0) / 2 + 1;
        if (fx.Glow is not null) m = Math.Max(m, fx.Glow.RadPt * 1.2);
        double b = m;
        if (fx.Shadow is { } s)
        {
            double a = (s.DirDeg * Math.PI) / 180;
            m = Math.Max(m, s.BlurPt + Math.Abs(s.DistPt * Math.Cos(a)) + textHPt * Math.Abs(s.Sx - 1));
            b = Math.Max(Math.Max(b, s.BlurPt + Math.Abs(s.DistPt * Math.Sin(a)) + textHPt * Math.Abs(s.Sy - 1)), m);
        }
        if (fx.Reflection is { } r) b = Math.Max(b, textHPt + r.DistPt + r.BlurPt + 2);
        return (m, m, m, b);
    }

    /// <summary>Glifo de um GlyphPos: o trocado (OpenType), o índice direto (EMF) ou o do cmap.</summary>
    public static int GidOf(GlyphRunItem it, GlyphPos g) => g.Gid ?? (it.ByGid ? g.Cp : it.Face.Font.GlyphId(g.Cp));

    /// <summary>Caixa do run (twips, y para baixo): do 1º ao fim do último glifo, da ascendente à descendente.</summary>
    public static (double X, double Y, double W, double H) RunBox(GlyphRunItem it)
    {
        var f = it.Face.Font;
        double upem = f.Metrics.UnitsPerEm != 0 ? f.Metrics.UnitsPerEm : 1;
        double k = (it.SizePt * 20) / upem;
        var last = it.Glyphs[^1];
        double lastAdv = f.AdvanceWidth(GidOf(it, last)) * k * (it.ScaleX ?? 1);
        double asc = f.Metrics.Ascender * k, desc = Math.Abs(f.Metrics.Descender) * k;
        double x = it.Glyphs[0].X;
        return (x, it.Y - asc, Math.Max(1, last.X + lastAdv - x), asc + desc);
    }

    /// <summary>Contornos dos glifos do run (twips) como segmentos de caminho; nulo sem contornos (CFF).</summary>
    public static List<List<PathSeg>>? RunOutlineSegs(GlyphRunItem it)
    {
        var f = it.Face.Font;
        // (no JS: só as fontes SFNT têm glyphOutline; CFF dá contornos nulos, glifo a glifo)
        if (f is not UniversalOffice.Fonts.SfntFont) return null;
        double upem = f.Metrics.UnitsPerEm != 0 ? f.Metrics.UnitsPerEm : 1;
        double s = (it.SizePt * 20) / upem, sx = s * (it.ScaleX ?? 1);
        double skew = it.SynthItalic ? 0.21 : 0;
        var subs = new List<List<PathSeg>>();
        foreach (var g in it.Glyphs)
        {
            var ol = f.GlyphOutline(GidOf(it, g));
            if (ol is null) continue;
            double X(double x, double y) => g.X + x * sx + skew * y * s;
            double Y(double y) => it.Y - y * s;
            var cur = new List<PathSeg>();
            foreach (var c in ol)
            {
                if (c.Op == 'M') { if (cur.Count > 0) subs.Add(cur); cur = new List<PathSeg> { PathSeg.M(X(c.X, c.Y), Y(c.Y)) }; }
                else if (c.Op == 'L') cur.Add(PathSeg.L(X(c.X, c.Y), Y(c.Y)));
                else if (c.Op == 'Q') cur.Add(PathSeg.Quad(X(c.Cx, c.Cy), Y(c.Cy), X(c.X, c.Y), Y(c.Y)));
                // (Z: os subcaminhos fecham sozinhos no preenchimento)
            }
            if (cur.Count > 0) subs.Add(cur);
        }
        return subs;
    }

    /// <summary>
    /// As camadas dos efeitos (atrás do texto) numa grade de <paramref name="ppt"/> pixels por
    /// ponto: a sombra externa, o brilho e o reflexo, a partir da silhueta do run (preenchida +
    /// contorno). X0/Y0 = canto da grade em twips. RGBA de alfa direto (não pré-multiplicado).
    /// </summary>
    public static (byte[] Data, int W, int H, double X0, double Y0)? FxLayers(GlyphRunItem it, ResolvedTextFx fx, double ppt, string textHex)
    {
        if (fx.Shadow is null && fx.Glow is null && fx.Reflection is null) return null;
        var subs = RunOutlineSegs(it);
        if (subs is null) return null;
        var box = RunBox(it);
        var mg = FxMarginPt(fx, box.H / 20);
        double x0 = box.X - mg.L * 20, y0 = box.Y - mg.T * 20;
        int W = Math.Max(1, (int)Math.Ceiling((box.W / 20 + mg.L + mg.R) * ppt)), H = Math.Max(1, (int)Math.Ceiling((box.H / 20 + mg.T + mg.B) * ppt));
        if ((double)W * H > 2.4e7) return null;
        double tw = ppt / 20;
        var sil = Raster.FillPolygons(Raster.NewMask(W, H), Raster.FlattenPath(subs, new Affine(tw, 0, 0, tw, -x0 * tw, -y0 * tw), 0.35));
        // contorno: a silhueta cresce meia espessura (o brilho e a sombra seguem a linha)
        if (fx.Outline is { } ol)
        {
            double rr = (ol.WidthPt / 2) * ppt;
            if (rr >= 0.5) sil = Dilate(sil, rr);
        }
        var bx = new Box((box.X - x0) * tw, (box.Y - y0) * tw, box.W * tw, box.H * tw);
        var rgba = new float[W * H * 4];
        void Over(Mask m, string hex, double alpha)
        {
            int r = int.Parse(hex[..2], NumberStyles.HexNumber), g = int.Parse(hex[2..4], NumberStyles.HexNumber), b = int.Parse(hex[4..6], NumberStyles.HexNumber);
            for (int i = 0; i < m.A.Length; i++)
            {
                double a = Math.Max(0, Math.Min(1, m.A[i] * alpha));
                if (a <= 0) continue;
                int k = i * 4;
                double da = rgba[k + 3], oa = a + da * (1 - a);
                rgba[k] = (float)((r * a + rgba[k] * da * (1 - a)) / oa);
                rgba[k + 1] = (float)((g * a + rgba[k + 1] * da * (1 - a)) / oa);
                rgba[k + 2] = (float)((b * a + rgba[k + 2] * da * (1 - a)) / oa);
                rgba[k + 3] = (float)oa;
            }
        }
        if (fx.Reflection is { } rf)
        {
            // o texto espelhado em volta da borda de baixo, com o degradê de alfa (a cor do texto)
            double a = (rf.DirDeg * Math.PI) / 180;
            double dx = rf.DistPt * Math.Cos(a) * ppt, dy = rf.DistPt * Math.Sin(a) * ppt;
            var m = Raster.NewMask(W, H);
            double bottom = bx.Y + bx.H;
            for (int y = 0; y < H; y++)
            {
                int sy = (int)Js.Round(2 * bottom + dy - y - 1);
                double t = (y + 0.5 - (bottom + dy)) / bx.H;
                double al = t < 0 ? 0 : Effects.ReflectionAlpha(t, rf.StA, rf.StPos, rf.EndA, rf.EndPos);
                if (sy < 0 || sy >= H || al <= 0) continue;
                for (int x = 0; x < W; x++)
                {
                    int sx = (int)Js.Round(x - dx);
                    if (sx >= 0 && sx < W) m.A[y * W + x] = (float)(sil.A[sy * W + sx] * al);
                }
            }
            if (rf.BlurPt > 0) m = Raster.GaussianBlur(m, (rf.BlurPt / 3) * ppt);
            Over(m, textHex, 1);
        }
        if (fx.Shadow is { } s)
            Over(Effects.OuterShadowMask(sil, bx, new ShadowSpec(s.BlurPt, s.DistPt, s.DirDeg, s.Sx, s.Sy, s.KxDeg, s.KyDeg, s.Algn), ppt), s.Hex, s.Alpha);
        if (fx.Glow is { } gl) Over(Effects.GlowMask(sil, gl.RadPt, ppt), gl.Hex, gl.Alpha);
        var data = new byte[W * H * 4];
        for (int i = 0; i < rgba.Length; i++)
        {
            double v = i % 4 == 3 ? Js.Round(rgba[i] * 255) : Js.Round(rgba[i]);
            data[i] = (byte)Math.Max(0, Math.Min(255, v));
        }
        return (data, W, H, x0, y0);
    }

    /// <summary>Dilatação simples (máximo num disco de raio r px).</summary>
    private static Mask Dilate(Mask m, double r)
    {
        int R = (int)Math.Ceiling(r);
        var outp = Raster.NewMask(m.W, m.H);
        var offs = new List<(int Dx, int Dy)>();
        for (int dy = -R; dy <= R; dy++) for (int dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) offs.Add((dx, dy));
        for (int y = 0; y < m.H; y++)
            for (int x = 0; x < m.W; x++)
            {
                float v = 0;
                foreach (var (dx, dy) in offs)
                {
                    int xx = x + dx, yy = y + dy;
                    if (xx < 0 || yy < 0 || xx >= m.W || yy >= m.H) continue;
                    float a = m.A[yy * m.W + xx];
                    if (a > v) { v = a; if (v >= 1) break; }
                }
                outp.A[y * m.W + x] = v;
            }
        return outp;
    }

    /// <summary>Tracejado DrawingML (w14:prstDash) em múltiplos da espessura.</summary>
    public static double[] DashPattern(string? dash) => dash switch
    {
        "dot" => new double[] { 1, 1 },
        "sysDot" => new double[] { 1, 1 },
        "sysDash" => new double[] { 3, 1 },
        "dash" => new double[] { 4, 3 },
        "dashDot" => new double[] { 4, 3, 1, 3 },
        "lgDash" => new double[] { 8, 3 },
        "lgDashDot" => new double[] { 8, 3, 1, 3 },
        "lgDashDotDot" => new double[] { 8, 3, 1, 3, 1, 3 },
        "sysDashDot" => new double[] { 3, 1, 1, 1 },
        "sysDashDotDot" => new double[] { 3, 1, 1, 1, 1, 1 },
        _ => Array.Empty<double>(),
    };
}
