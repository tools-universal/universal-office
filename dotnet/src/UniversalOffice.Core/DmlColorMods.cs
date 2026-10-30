namespace UniversalOffice.Core;

/// <summary>
/// Modificadores de cor do DrawingML (a:shade, a:tint, a:lumMod, a:satMod…) sobre uma
/// cor sRGB 0..1, na ordem do documento e em ponto flutuante — port de
/// shared/drawingml/src/color.ts (medido no PowerPoint e conferido no Word):
/// shade/tint em RGB LINEAR com a curva sRGB exata (entre a:gamma e a:invGamma, no
/// sRGB); lumMod/lumOff/lum na luminância HSL; sat/hue em HSL com saturação sem teto;
/// gray = luma Rec. 709; comp = matiz +180°; inv = 1 − c.
/// </summary>
public static class DmlColorMods
{
    static double Clamp01(double v) => Math.Max(0, Math.Min(1, v));
    public static double SrgbToLin(double v) => v <= 0.04045 ? v / 12.92 : Math.Pow((v + 0.055) / 1.055, 2.4);
    public static double LinToSrgb(double v) { v = Clamp01(v); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.Pow(v, 1 / 2.4) - 0.055; }

    static (double, double, double) Hsl((double R, double G, double B) c, Func<double, double, double, (double, double, double)> f)
    {
        var (rf, gf, bf) = c;
        double max = Math.Max(Math.Max(rf, gf), bf), min = Math.Min(Math.Min(rf, gf), bf), d = max - min;
        double h = 0, s = 0;
        double l = (max + min) / 2;
        if (d != 0)
        {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max == rf) h = ((gf - bf) / d) % 6;
            else if (max == gf) h = (bf - rf) / d + 2;
            else h = (rf - gf) / d + 4;
            h /= 6;
            if (h < 0) h += 1;
        }
        var (h2, s2, l2) = f(h, s, l);
        h2 = ((h2 % 1) + 1) % 1;
        l2 = Clamp01(l2);
        double k = (1 - Math.Abs(2 * l2 - 1)) * s2;
        double x = k * (1 - Math.Abs(((h2 * 6) % 2) - 1));
        double m = l2 - k / 2;
        int seg = (int)Math.Floor(h2 * 6) % 6;
        var (r2, g2, b2) = seg switch
        {
            0 => (k, x, 0.0),
            1 => (x, k, 0.0),
            2 => (0.0, k, x),
            3 => (0.0, x, k),
            4 => (x, 0.0, k),
            _ => (k, 0.0, x),
        };
        return (Clamp01(r2 + m), Clamp01(g2 + m), Clamp01(b2 + m));
    }

    /// <summary>Aplica os modificadores (nome sem prefixo, val em 1/100000) em ordem.</summary>
    public static (double R, double G, double B) Apply((double R, double G, double B) c, IEnumerable<(string Name, double? Val)> mods)
    {
        bool srgbMode = false;
        foreach (var (name, raw) in mods)
        {
            if (name == "gamma") { srgbMode = true; continue; }
            if (name == "invGamma") { srgbMode = false; continue; }
            if (name == "comp") { c = Hsl(c, (h, s, l) => (h + 0.5, s, l)); continue; }
            if (name == "inv") { c = (1 - c.R, 1 - c.G, 1 - c.B); continue; }
            if (name == "gray") { double y = 0.2126 * c.R + 0.7152 * c.G + 0.0722 * c.B; c = (y, y, y); continue; }
            if (raw is not double rv || double.IsNaN(rv) || double.IsInfinity(rv)) continue;
            double val = rv / 100000;
            bool sm = srgbMode;
            double Shade(double v) => sm ? v * val : LinToSrgb(SrgbToLin(v) * val);
            double Tint(double v) => sm ? v * val + (1 - val) : LinToSrgb(SrgbToLin(v) * val + (1 - val));
            switch (name)
            {
                case "shade": c = (Shade(c.R), Shade(c.G), Shade(c.B)); break;
                case "tint": c = (Tint(c.R), Tint(c.G), Tint(c.B)); break;
                case "lumMod": c = Hsl(c, (h, s, l) => (h, s, Clamp01(l * val))); break;
                case "lumOff": c = Hsl(c, (h, s, l) => (h, s, Clamp01(l + val))); break;
                case "lum": c = Hsl(c, (h, s, l) => (h, s, Clamp01(val))); break;
                case "satMod": c = Hsl(c, (h, s, l) => (h, Math.Max(0, s * val), l)); break;
                case "satOff": c = Hsl(c, (h, s, l) => (h, Math.Max(0, s + val), l)); break;
                case "sat": c = Hsl(c, (h, s, l) => (h, Math.Max(0, val), l)); break;
                case "hueMod": c = Hsl(c, (h, s, l) => (h * val, s, l)); break;
                case "hueOff": c = Hsl(c, (h, s, l) => (h + rv / 21600000, s, l)); break;
                case "hue": c = Hsl(c, (h, s, l) => (rv / 21600000, s, l)); break;
                default: break; // red/green/blue(Mod/Off): não medidos
            }
        }
        return c;
    }
}
