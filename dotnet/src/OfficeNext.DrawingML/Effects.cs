namespace OfficeNext.DrawingML;

/// <summary>Sombra (externa) em pontos: desfoque, distância, direção (graus, horário a
/// partir do leste), escala (1 = 100%), inclinação (graus) e alinhamento (tl|t|tr|l|ctr|r|bl|b|br).</summary>
public sealed record ShadowSpec(double BlurPt, double DistPt, double DirDeg,
    double? Sx = null, double? Sy = null, double? KxDeg = null, double? KyDeg = null, string? Algn = null);

/// <summary>Caixa (x, y, w, h) nas unidades da máscara.</summary>
public readonly record struct Box(double X, double Y, double W, double H);

/// <summary>
/// Efeitos DrawingML (a:effectLst) como máscaras de alfa, a partir da silhueta da
/// forma — porta de shared/drawingml/src/effects.ts, os modelos medidos no PDF do
/// Word (write/tools/image-lab, fx-fit.py):
/// - sombra externa: a silhueta escalada/inclinada em volta do ponto <c>algn</c> e
///   deslocada (dist, dir), desfocada com gaussiana σ = blurRad/3;
/// - sombra interna: silhueta × (1 − desfoque(silhueta deslocada CONTRA a direção));
/// - brilho: silhueta dilatada rad/2 e desfocada com σ = rad/6;
/// - bordas suaves: silhueta erodida 0,86·rad e desfocada com σ = rad/3;
/// - reflexo: o alfa cai linearmente de stA (em stPos) a endA (em endPos) e é 0 depois.
/// Medidas em pontos; <c>ppt</c> = pixels por ponto da camada.
/// </summary>
public static class Effects
{
    /// <summary>Ponto de alinhamento <paramref name="algn"/> na caixa (x, y, w, h).</summary>
    public static (double X, double Y) AlignPoint(string? algn, double x, double y, double w, double h)
    {
        string a = algn ?? "b";
        double fx = a is "tl" or "l" or "bl" ? 0 : a is "tr" or "r" or "br" ? 1 : 0.5;
        double fy = a is "tl" or "t" or "tr" ? 0 : a is "bl" or "b" or "br" ? 1 : 0.5;
        return (x + fx * w, y + fy * h);
    }

    /// <summary>Afim da sombra externa (unidades da máscara): inclinação e escala em volta do
    /// ponto de alinhamento, depois o deslocamento.</summary>
    public static Affine ShadowAffine(ShadowSpec s, Box box, double ppt)
    {
        var (ax, ay) = AlignPoint(s.Algn, box.X, box.Y, box.W, box.H);
        double sx = s.Sx ?? 1, sy = s.Sy ?? 1;
        double kx = Math.Tan(((s.KxDeg ?? 0) * Math.PI) / 180), ky = Math.Tan(((s.KyDeg ?? 0) * Math.PI) / 180);
        double a = (s.DirDeg * Math.PI) / 180;
        double dx = s.DistPt * ppt * Math.Cos(a), dy = s.DistPt * ppt * Math.Sin(a);
        // p' = A + S·K·(p − A) + d
        var K = new Affine(1, ky, kx, 1, 0, 0);
        var S = new Affine(sx, 0, 0, sy, 0, 0);
        var toA = new Affine(1, 0, 0, 1, -ax, -ay);
        var back = new Affine(1, 0, 0, 1, ax + dx, ay + dy);
        return Raster.MulAffine(back, Raster.MulAffine(S, Raster.MulAffine(K, toA)));
    }

    /// <summary>Máscara da sombra externa (mesmo tamanho de <paramref name="sil"/>).</summary>
    public static Mask OuterShadowMask(Mask sil, Box box, ShadowSpec s, double ppt)
    {
        var m = ShadowAffine(s, box, ppt);
        var moved = Raster.WarpMask(sil, Raster.InvertAffine(m), sil.W, sil.H);
        return Raster.GaussianBlur(moved, (s.BlurPt / 3) * ppt);
    }

    /// <summary>Máscara da sombra interna.</summary>
    public static Mask InnerShadowMask(Mask sil, double blurPt, double distPt, double dirDeg, double ppt)
    {
        double a = (dirDeg * Math.PI) / 180;
        var sh = Raster.ShiftMask(sil, -distPt * ppt * Math.Cos(a), -distPt * ppt * Math.Sin(a));
        var b = Raster.GaussianBlur(sh, (blurPt / 3) * ppt);
        var outp = new Mask(sil.W, sil.H);
        for (int i = 0; i < outp.A.Length; i++) outp.A[i] = (float)((double)sil.A[i] * (1 - (double)b.A[i]));
        return outp;
    }

    /// <summary>Máscara do brilho.</summary>
    public static Mask GlowMask(Mask sil, double radPt, double ppt) =>
        Raster.GaussianBlur(Raster.Morph(sil, (radPt / 2) * ppt), (radPt / 6) * ppt);

    /// <summary>Máscara das bordas suaves (multiplica a forma).</summary>
    public static Mask SoftEdgeMask(Mask sil, double radPt, double ppt)
    {
        var e = Raster.GaussianBlur(Raster.Morph(sil, -0.86 * radPt * ppt), (radPt / 3) * ppt);
        for (int i = 0; i < e.A.Length; i++) e.A[i] = Math.Min(e.A[i], sil.A[i]);
        return e;
    }

    /// <summary>Alfa do reflexo na fração t (0 = encostado na forma, 1 = a forma inteira).</summary>
    public static double ReflectionAlpha(double t, double stA, double stPos, double endA, double endPos)
    {
        if (t < stPos) return stA;
        if (t > endPos || endPos <= stPos) return t > endPos ? 0 : stA;
        return stA + ((endA - stA) * (t - stPos)) / (endPos - stPos);
    }
}
