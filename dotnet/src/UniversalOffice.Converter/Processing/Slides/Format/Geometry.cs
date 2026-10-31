namespace UniversalOffice.Converter.Processing.Slides.Pptx;

/// <summary>
/// Geometrias preset do DrawingML (&lt;a:prstGeom prst&gt;) como FUNÇÃO PURA —
/// porta de slides-core/src/geometry.ts. Devolve um descritor de path
/// parametrizado pelo retângulo w × h; o export PDF constrói o path final a
/// partir do descritor. Usa os adj DEFAULTS de cada preset.
/// </summary>
public readonly record struct GeoPt(double X, double Y);

public sealed class PresetPath
{
    /// <summary>poly | line | pie | rect | ellipse | roundRect</summary>
    public required string Kind { get; init; }
    public List<GeoPt>? Points;                 // poly
    public double X1, Y1, X2, Y2;               // line
    public double StartDeg, EndDeg;             // pie
    public double R;                            // roundRect
}

public static class Geometry
{
    /// <summary>Vértices de um polígono regular inscrito na elipse w×h, começando no topo.</summary>
    private static List<GeoPt> RegularPolygon(int n, double w, double h)
    {
        var pts = new List<GeoPt>(n);
        for (int i = 0; i < n; i++)
        {
            double a = -Math.PI / 2 + i * 2 * Math.PI / n;
            pts.Add(new GeoPt(w / 2 + w / 2 * Math.Cos(a), h / 2 + h / 2 * Math.Sin(a)));
        }
        return pts;
    }

    /// <summary>
    /// Descritor de path para o preset `geom` num rect w × h.
    /// Presets desconhecidos caem em rect.
    /// </summary>
    public static PresetPath PresetPath(string? geom, double w, double h)
    {
        double ss = Math.Min(w, h); // "shortest side" das fórmulas DrawingML
        switch (geom)
        {
            case "ellipse": return new PresetPath { Kind = "ellipse" };
            case "roundRect": return new PresetPath { Kind = "roundRect", R = ss * 0.1 };

            case "triangle": // isósceles, ápice no topo (adj 50000)
                return Poly(new(w / 2, 0), new(w, h), new(0, h));
            case "rtTriangle": // ângulo reto no canto inferior-esquerdo
                return Poly(new(0, 0), new(w, h), new(0, h));
            case "diamond":
                return Poly(new(w / 2, 0), new(w, h / 2), new(w / 2, h), new(0, h / 2));
            case "parallelogram":
            { // adj=25000 → deslocamento = ss/4
                double d = ss * 0.25;
                return Poly(new(d, 0), new(w, 0), new(w - d, h), new(0, h));
            }
            case "trapezoid":
            { // adj=25000 → topo mais estreito
                double d = ss * 0.25;
                return Poly(new(d, 0), new(w - d, 0), new(w, h), new(0, h));
            }
            case "pentagon":
                return new PresetPath { Kind = "poly", Points = RegularPolygon(5, w, h) };
            case "hexagon":
            { // hexágono "horizontal" do PowerPoint (adj=25000)
                double d = ss * 0.25;
                return Poly(new(d, 0), new(w - d, 0), new(w, h / 2), new(w - d, h), new(d, h), new(0, h / 2));
            }
            case "star5":
            { // adj=19098 → raio interno ≈ 0.38196 do externo
                double inner = 19098.0 / 50000;
                var pts = new List<GeoPt>(10);
                for (int i = 0; i < 10; i++)
                {
                    double a = -Math.PI / 2 + i * Math.PI / 5;
                    double fx = i % 2 == 0 ? 1 : inner;
                    pts.Add(new GeoPt(w / 2 + w / 2 * fx * Math.Cos(a), h / 2 + h / 2 * fx * Math.Sin(a)));
                }
                return new PresetPath { Kind = "poly", Points = pts };
            }

            // setas em bloco (adj1=50000 → haste com metade da altura; adj2=50000 →
            // cabeça com comprimento ss/2)
            case "rightArrow":
            {
                double hd = ss * 0.5, t = h * 0.25;
                return Poly(new(0, t), new(w - hd, t), new(w - hd, 0), new(w, h / 2),
                    new(w - hd, h), new(w - hd, h - t), new(0, h - t));
            }
            case "leftArrow":
            {
                double hd = ss * 0.5, t = h * 0.25;
                return Poly(new(w, t), new(hd, t), new(hd, 0), new(0, h / 2),
                    new(hd, h), new(hd, h - t), new(w, h - t));
            }
            case "upArrow":
            {
                double hd = ss * 0.5, t = w * 0.25;
                return Poly(new(t, h), new(t, hd), new(0, hd), new(w / 2, 0),
                    new(w, hd), new(w - t, hd), new(w - t, h));
            }
            case "downArrow":
            {
                double hd = ss * 0.5, t = w * 0.25;
                return Poly(new(t, 0), new(t, h - hd), new(0, h - hd), new(w / 2, h),
                    new(w, h - hd), new(w - t, h - hd), new(w - t, 0));
            }
            case "chevron":
            { // adj=50000 → recuo = ss/2
                double d = ss * 0.5;
                return Poly(new(0, 0), new(w - d, 0), new(w, h / 2), new(w - d, h), new(0, h), new(d, h / 2));
            }
            case "pie": // adj1=0, adj2=270 (graus × 60000 no XML)
                return new PresetPath { Kind = "pie", StartDeg = 0, EndDeg = 270 };
            case "line":
            case "straightConnector1":
                return new PresetPath { Kind = "line", X1 = 0, Y1 = 0, X2 = w, Y2 = h };
            default:
                return new PresetPath { Kind = "rect" };
        }
    }

    private static PresetPath Poly(params GeoPt[] pts) =>
        new() { Kind = "poly", Points = new List<GeoPt>(pts) };
}
