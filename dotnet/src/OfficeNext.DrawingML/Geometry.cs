namespace OfficeNext.DrawingML;

/// <summary>
/// Segmento de um subcaminho genérico (coordenadas absolutas no retângulo w×h) —
/// porta do <c>PathSeg</c> de shared/drawingml/src/geometry.ts. <see cref="C"/> é o
/// comando: 'M'/'L' (X, Y), 'C' (X1, Y1, X2, Y2, X, Y), 'Q' (X1, Y1, X, Y),
/// 'E' (arco de elipse: centro Cx/Cy, raios Rx/Ry, ângulos A0→A1 em RADIANOS,
/// Ccw opcional) e 'Z'.
/// </summary>
public readonly record struct PathSeg
{
    public char C { get; init; }
    public double X { get; init; }
    public double Y { get; init; }
    public double X1 { get; init; }
    public double Y1 { get; init; }
    public double X2 { get; init; }
    public double Y2 { get; init; }
    public double Cx { get; init; }
    public double Cy { get; init; }
    public double Rx { get; init; }
    public double Ry { get; init; }
    public double A0 { get; init; }
    public double A1 { get; init; }
    public bool Ccw { get; init; }

    public static PathSeg M(double x, double y) => new() { C = 'M', X = x, Y = y };
    public static PathSeg L(double x, double y) => new() { C = 'L', X = x, Y = y };
    public static PathSeg Cubic(double x1, double y1, double x2, double y2, double x, double y) =>
        new() { C = 'C', X1 = x1, Y1 = y1, X2 = x2, Y2 = y2, X = x, Y = y };
    public static PathSeg Quad(double x1, double y1, double x, double y) => new() { C = 'Q', X1 = x1, Y1 = y1, X = x, Y = y };
    public static PathSeg Ellipse(double cx, double cy, double rx, double ry, double a0, double a1, bool ccw = false) =>
        new() { C = 'E', Cx = cx, Cy = cy, Rx = rx, Ry = ry, A0 = a0, A1 = a1, Ccw = ccw };
    public static PathSeg Z => new() { C = 'Z' };
}
