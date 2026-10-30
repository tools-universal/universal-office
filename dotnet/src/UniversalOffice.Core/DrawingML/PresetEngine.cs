using System.Globalization;
using System.Text.RegularExpressions;

namespace UniversalOffice.DrawingML;

/// <summary>Geometria resolvida: subcaminhos + preenchimento (null = sem; número = deslocamento de luminância) + contorno.</summary>
public sealed class PresetGeometry
{
    public List<List<PathSeg>> Subs { get; } = new();
    public List<double?> Fill { get; } = new();
    public List<bool> Stroke { get; } = new();
}

/// <summary>
/// Interpretador das geometrias PRESET do DrawingML (ECMA-376 Parte 1, 20.1.9) —
/// porta de shared/drawingml/src/preset-engine.ts: avalia as guias (<c>avLst</c>
/// com os ajustes da forma, depois <c>gdLst</c>) e monta os caminhos
/// (<c>moveTo</c>/<c>lnTo</c>/<c>arcTo</c>/<c>quadBezTo</c>/<c>cubicBezTo</c>/<c>close</c>)
/// de qualquer um dos ~187 presets. As definições são as do PRÓPRIO
/// preset-defs.ts (gerado do presetShapeDefinitions.xml), embutido como recurso:
/// uma fonte só para os dois lados. Ângulos em 1/60000 de grau.
/// </summary>
public static class PresetEngine
{
    private sealed class PathDef
    {
        public double? W, H;
        public string Fill = "";
        public bool Stroke;
        public List<string[]> Cmds = new();
    }

    private sealed class PresetDef
    {
        public List<(string Name, string[] F)> Av = new();
        public List<(string Name, string[] F)> Gd = new();
        public List<PathDef> Paths = new();
        public string[]? Rect;
    }

    private static readonly Regex Ws = new(@"\s+", RegexOptions.CultureInvariant);

    // linhas "  nome: '…'," do preset-defs.ts
    private static readonly Lazy<Dictionary<string, string>> Raw = new(() => TsResource.StringTable("preset-defs.ts"));
    private static readonly Dictionary<string, PresetDef?> Parsed = new(StringComparer.Ordinal);

    /// <summary>Nomes de todas as definições (na ordem do arquivo não garantida).</summary>
    public static IEnumerable<string> Names => Raw.Value.Keys;

    /// <summary>Number(t) do JS para os tokens das fórmulas (não finito → NaN).</summary>
    private static double JsNumber(string t)
    {
        if (t.Length == 0) return 0; // Number('') = 0
        return double.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : double.NaN;
    }

    /// <summary>s.trim().split(/\s+/).filter(Boolean)</summary>
    private static string[] Words(string s) => Ws.Split(s.Trim()).Where(w => w.Length > 0).ToArray();

    private static List<(string, string[])> Guides(string s)
    {
        var outp = new List<(string, string[])>();
        if (s.Length == 0) return outp;
        foreach (var e in s.Split(';'))
        {
            int i = e.IndexOf('=');
            // sem '=': e.slice(0, -1) / e.slice(0) do JS
            string name = (i >= 0 ? e[..i] : e.Length > 0 ? e[..^1] : "").Trim();
            outp.Add((name, Words(i >= 0 ? e[(i + 1)..] : e)));
        }
        return outp;
    }

    private static PresetDef? ParseDef(string name)
    {
        lock (Parsed)
        {
            if (Parsed.TryGetValue(name, out var hit)) return hit;
            PresetDef? def = null;
            if (Raw.Value.TryGetValue(name, out var raw))
            {
                var parts = raw.Split('|');
                string P(int i) => i < parts.Length ? parts[i] : "";
                string av = P(0), gd = P(1), ps = P(2), rc = P(3);
                def = new PresetDef { Av = Guides(av), Gd = Guides(gd) };
                if (ps.Length > 0)
                {
                    foreach (var p in ps.Split('#'))
                    {
                        var pc = p.Split('~');
                        string attrs = pc[0], cmds = pc.Length > 1 ? pc[1] : "";
                        var at = attrs.Split(',');
                        string A(int i) => i < at.Length ? at[i] : "";
                        string w = A(0), h = A(1), fill = A(2), stroke = A(3);
                        var d = new PathDef { Fill = fill, Stroke = stroke != "false" && stroke != "0" };
                        if (cmds.Length > 0) foreach (var c in cmds.Split(';')) d.Cmds.Add(Words(c));
                        if (w.Length > 0) d.W = JsNumber(w);
                        if (h.Length > 0) d.H = JsNumber(h);
                        def.Paths.Add(d);
                    }
                }
                var rw = Words(rc);
                if (rw.Length == 4) def.Rect = rw;
            }
            Parsed[name] = def;
            return def;
        }
    }

    /// <summary>O preset tem definição oficial interpretável?</summary>
    public static bool HasPresetDef(string? name) => !string.IsNullOrEmpty(name) && ParseDef(name) is not null;

    private const double Deg = Math.PI / (180 * 60000);

    /// <summary>Variáveis embutidas da especificação (20.1.9.11) para um retângulo w×h.</summary>
    private static Dictionary<string, double> Builtins(double w, double h)
    {
        double ss = Math.Min(w, h), ls = Math.Max(w, h);
        var v = new Dictionary<string, double>(StringComparer.Ordinal)
        {
            ["l"] = 0, ["t"] = 0, ["r"] = w, ["b"] = h, ["w"] = w, ["h"] = h, ["hc"] = w / 2, ["vc"] = h / 2,
            ["ss"] = ss, ["ls"] = ls,
            ["cd2"] = 10800000, ["cd4"] = 5400000, ["cd8"] = 2700000, ["3cd4"] = 16200000, ["3cd8"] = 8100000,
            ["5cd8"] = 13500000, ["7cd8"] = 18900000,
        };
        foreach (int d in new[] { 2, 3, 4, 5, 6, 8, 10, 12, 16, 32 })
        {
            v[$"wd{d}"] = w / d;
            v[$"hd{d}"] = h / d;
            v[$"ssd{d}"] = ss / d;
        }
        return v;
    }

    private static double EvalFormula(string[] f, Func<string, double> val)
    {
        string op = f.Length > 0 ? f[0] : "";
        string a = f.Length > 1 ? f[1] : "0", b = f.Length > 2 ? f[2] : "0", c = f.Length > 3 ? f[3] : "0";
        double X() => val(a);
        double Y() => val(b);
        double Z() => val(c);
        static double Or1(double v) => v == 0 || double.IsNaN(v) ? 1 : v;
        switch (op)
        {
            case "val": return X();
            case "*/": return (X() * Y()) / Or1(Z());
            case "+-": return X() + Y() - Z();
            case "+/": return (X() + Y()) / Or1(Z());
            case "?:": return X() > 0 ? Y() : Z();
            case "abs": return Math.Abs(X());
            case "at2": return Math.Atan2(Y(), X()) / Deg;
            case "cat2": return X() * Math.Cos(Math.Atan2(Z(), Y()));
            case "sat2": return X() * Math.Sin(Math.Atan2(Z(), Y()));
            case "cos": return X() * Math.Cos(Y() * Deg);
            case "sin": return X() * Math.Sin(Y() * Deg);
            case "tan": return X() * Math.Tan(Y() * Deg);
            case "max": return Math.Max(X(), Y());
            case "min": return Math.Min(X(), Y());
            case "mod": { double x = X(), y = Y(), z = Z(); return Math.Sqrt(x * x + y * y + z * z); }
            case "pin": { double lo = X(), v = Y(), hi = Z(); return v < lo ? lo : v > hi ? hi : v; }
            case "sqrt": return Math.Sqrt(Math.Max(0, X()));
            default: return 0;
        }
    }

    private static Func<string, double> Resolver(Dictionary<string, double> vars) => t =>
    {
        if (vars.TryGetValue(t, out var v)) return v;
        double n = JsNumber(t);
        return double.IsFinite(n) ? n : 0;
    };

    /// <summary>
    /// Guias de uma geometria PERSONALIZADA (<c>a:custGeom</c> com <c>avLst</c>/<c>gdLst</c>
    /// em fórmulas): resolvedor de nome/número para um retângulo w×h. Fórmula
    /// malformada vale 0 (não lança).
    /// </summary>
    public static Func<string, double> CustomGuides(IEnumerable<(string Name, string[] F)> av, IEnumerable<(string Name, string[] F)> gd, double w, double h)
    {
        var vars = Builtins(w, h);
        var val = Resolver(vars);
        foreach (var (n, f) in av) vars[n] = EvalFormula(f, val);
        foreach (var (n, f) in gd) vars[n] = EvalFormula(f, val);
        return val;
    }

    /// <summary>
    /// <c>arcTo</c> que continua do ponto (cx, cy): elipse rx×ry em que o ponto atual está
    /// no ângulo stAng (1/60000°), varrendo swAng. Devolve o segmento e o ponto final.
    /// </summary>
    public static (PathSeg Seg, double X, double Y)? ArcToSeg(double cx, double cy, double rx, double ry, double stAng, double swAng)
    {
        double st = stAng * Deg, sw = swAng * Deg;
        if (rx <= 0 || ry <= 0 || sw == 0) return null;
        var (seg, x, y) = Arc(cx, cy, rx, ry, st, sw);
        return (seg, x, y);
    }

    private static (PathSeg, double, double) Arc(double cx, double cy, double rx, double ry, double st, double sw)
    {
        double Param(double a) => Math.Atan2(rx * Math.Sin(a), ry * Math.Cos(a));
        double p0 = Param(st);
        double p1 = Param(st + sw);
        if (Math.Abs(sw) >= 2 * Math.PI - 1e-9) p1 = p0 + Math.Sign(sw) * 2 * Math.PI;
        else if (sw > 0) { while (p1 <= p0) p1 += 2 * Math.PI; }
        else { while (p1 >= p0) p1 -= 2 * Math.PI; }
        double ecx = cx - rx * Math.Cos(p0), ecy = cy - ry * Math.Sin(p0);
        return (PathSeg.Ellipse(ecx, ecy, rx, ry, p0, p1, sw < 0), ecx + rx * Math.Cos(p1), ecy + ry * Math.Sin(p1));
    }

    /// <summary>Guias do preset avaliadas num retângulo w×h, com os ajustes da forma
    /// (por nome em <paramref name="adjNames"/> ou na ordem do avLst).</summary>
    private static Dictionary<string, double> PresetVars(PresetDef def, double w, double h, IReadOnlyList<double>? adj, IReadOnlyList<string>? adjNames)
    {
        var vars = Builtins(w, h);
        var val = Resolver(vars);
        // ajustes: os da forma vencem os defaults do avLst (por nome; sem nome, na ordem)
        for (int i = 0; i < def.Av.Count; i++)
        {
            var (n, f) = def.Av[i];
            double? v = null;
            if (adj is not null && adjNames is not null)
            {
                int k = IndexOf(adjNames, n);
                if (k >= 0 && k < adj.Count) v = adj[k];
            }
            else if (adj is not null && i < adj.Count) v = adj[i];
            vars[n] = v ?? EvalFormula(f, val);
        }
        foreach (var (n, f) in def.Gd) vars[n] = EvalFormula(f, val);
        return vars;
    }

    private static int IndexOf(IReadOnlyList<string> list, string s)
    {
        for (int i = 0; i < list.Count; i++) if (list[i] == s) return i;
        return -1;
    }

    /// <summary>
    /// Guias avaliadas do preset <paramref name="name"/> num retângulo w×h (inclui as
    /// embutidas e os ajustes) — para o retângulo de TEXTO da forma.
    /// </summary>
    public static IReadOnlyDictionary<string, double>? PresetGuides(string name, double w, double h, IReadOnlyList<double>? adj = null, IReadOnlyList<string>? adjNames = null)
    {
        var def = ParseDef(name);
        return def is null ? null : PresetVars(def, w, h, adj, adjNames);
    }

    /// <summary>
    /// Retângulo de TEXTO do preset (<c>&lt;a:rect l t r b&gt;</c> da definição oficial) num
    /// retângulo w×h. null = sem definição (caixa inteira).
    /// </summary>
    public static (double L, double T, double R, double B)? PresetTextRect(string? name, double w, double h, IReadOnlyList<double>? adj = null, IReadOnlyList<string>? adjNames = null)
    {
        var def = string.IsNullOrEmpty(name) ? null : ParseDef(name);
        if (def?.Rect is null) return null;
        var val = Resolver(PresetVars(def, w, h, adj, adjNames));
        double l = val(def.Rect[0]), t = val(def.Rect[1]), r = val(def.Rect[2]), b = val(def.Rect[3]);
        if (!(r > l) || !(b > t)) return null;
        return (l, t, r, b);
    }

    /// <summary>Sombreado dos caminhos (<c>fill="darken"…</c>) como deslocamento de luminância
    /// (medido, lo-cshapes: darken = RGB×0,6, darkenLess = ×0,8, lighten = 40% rumo ao
    /// branco, lightenLess = 20%).</summary>
    private static readonly Dictionary<string, double?> Shade = new(StringComparer.Ordinal)
    {
        ["none"] = null, ["darken"] = -0.4, ["darkenLess"] = -0.2, ["lighten"] = 0.4, ["lightenLess"] = 0.2,
    };

    /// <summary>
    /// Caminhos do preset <paramref name="name"/> num retângulo w×h (origem 0,0), com os
    /// ajustes da forma (<paramref name="adj"/>, por nome em <paramref name="adjNames"/> ou
    /// na ordem do <c>avLst</c>). null = preset sem definição.
    /// </summary>
    public static PresetGeometry? EvalPreset(string name, double w, double h, IReadOnlyList<double>? adj = null, IReadOnlyList<string>? adjNames = null)
    {
        var def = ParseDef(name);
        if (def is null) return null;
        var val = Resolver(PresetVars(def, w, h, adj, adjNames));
        double V(string[] c, int i) => val(i < c.Length ? c[i] : "");

        var outp = new PresetGeometry();
        foreach (var p in def.Paths)
        {
            // sistema de coordenadas próprio do caminho (w/h do <a:path>) → retângulo
            double sx = p.W is { } pw && pw != 0 && !double.IsNaN(pw) ? w / pw : 1;
            double sy = p.H is { } ph && ph != 0 && !double.IsNaN(ph) ? h / ph : 1;
            var segs = new List<PathSeg>();
            double cx = 0, cy = 0;
            foreach (var c in p.Cmds)
            {
                if (c.Length == 0) continue;
                switch (c[0])
                {
                    case "M": cx = V(c, 1) * sx; cy = V(c, 2) * sy; segs.Add(PathSeg.M(cx, cy)); break;
                    case "L": cx = V(c, 1) * sx; cy = V(c, 2) * sy; segs.Add(PathSeg.L(cx, cy)); break;
                    case "Q":
                        {
                            double x1 = V(c, 1) * sx, y1 = V(c, 2) * sy;
                            cx = V(c, 3) * sx; cy = V(c, 4) * sy;
                            segs.Add(PathSeg.Quad(x1, y1, cx, cy));
                            break;
                        }
                    case "C":
                        {
                            double x1 = V(c, 1) * sx, y1 = V(c, 2) * sy, x2 = V(c, 3) * sx, y2 = V(c, 4) * sy;
                            cx = V(c, 5) * sx; cy = V(c, 6) * sy;
                            segs.Add(PathSeg.Cubic(x1, y1, x2, y2, cx, cy));
                            break;
                        }
                    case "A":
                        {
                            // arco que CONTINUA do ponto atual: elipse wR×hR em que o ponto atual
                            // está no ângulo stAng (ângulo visual → paramétrico), varrendo swAng
                            double rx = V(c, 1) * sx, ry = V(c, 2) * sy;
                            double st = V(c, 3) * Deg, sw = V(c, 4) * Deg;
                            if (rx <= 0 || ry <= 0 || sw == 0) break;
                            var (seg, ex, ey) = Arc(cx, cy, rx, ry, st, sw);
                            segs.Add(seg);
                            cx = ex; cy = ey;
                            break;
                        }
                    case "Z": segs.Add(PathSeg.Z); break;
                }
            }
            outp.Subs.Add(segs);
            outp.Fill.Add(Shade.TryGetValue(p.Fill, out var sh) ? sh : 0);
            outp.Stroke.Add(p.Stroke);
        }
        return outp;
    }
}
