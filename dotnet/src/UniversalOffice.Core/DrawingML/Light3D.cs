namespace UniversalOffice.DrawingML;

/// <summary>
/// Luz do 3D (chanfro <c>&lt;a:sp3d&gt;&lt;a:bevelT&gt;</c> com <c>&lt;a:scene3d&gt;&lt;a:lightRig&gt;</c>) como o
/// PowerPoint a aplica, MEDIDA no próprio app — porta de shared/drawingml/src/light3d.ts.
/// Em luz LINEAR, cor = C·D + S, com D (por canal) e S (aditivo) em função da normal:
/// azimute θ (tela, 0 = direita, 90 = baixo; 15° por coluna) × ângulo polar φ
/// (0, 10, …, 70, 75, 80, 85°); a direção <c>dir</c> do rig gira o azimute; a face plana
/// tem a última amostra. As tabelas (base64, chave <c>rig|material</c>) são lidas do
/// PRÓPRIO light3d.ts embutido como recurso.
/// </summary>
public static class Light3D
{
    private static readonly double[] PH = { 0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 85 };
    private static readonly Dictionary<string, double> Dir = new(StringComparer.Ordinal)
    {
        ["t"] = 0, ["tl"] = 45, ["l"] = 90, ["bl"] = 135, ["b"] = 180, ["br"] = -135, ["r"] = -90, ["tr"] = -45,
    };

    private static readonly Lazy<Dictionary<string, string>> Tables = new(() => TsResource.StringTable("light3d.ts"));
    private static readonly Dictionary<string, byte[]> Decoded = new(StringComparer.Ordinal);

    private static byte[]? Table(string key)
    {
        lock (Decoded)
        {
            if (Decoded.TryGetValue(key, out var t)) return t;
            if (!Tables.Value.TryGetValue(key, out var s)) return null;
            t = Convert.FromBase64String(s);
            Decoded[key] = t;
            return t;
        }
    }

    /// <summary>Tabela do rig/material (rig desconhecido = threePt; material sem tabela = o padrão do rig).</summary>
    public static byte[]? LightTable(string? rig, string? mat)
    {
        string r = !string.IsNullOrEmpty(rig) && Tables.Value.ContainsKey($"{rig}|") ? rig : "threePt";
        string m = !string.IsNullOrEmpty(mat) && mat != "warmMatte" && Tables.Value.ContainsKey($"{r}|{mat}") ? mat : "";
        return Table($"{r}|{m}");
    }

    /// <summary>[D_r, D_g, D_b, S] para a normal de azimute <paramref name="thetaDeg"/> (tela) e
    /// ângulo polar <paramref name="phiDeg"/> (0 = de frente), com a direção do rig.</summary>
    public static void LightAt(byte[] t, string? dir, double thetaDeg, double phiDeg, float[] outp)
    {
        double th = ((thetaDeg + (Dir.TryGetValue(dir ?? "t", out var dd) ? dd : 0)) % 360 + 360) % 360;
        double ti = th / 15;
        int t0 = (int)(Math.Floor(ti) % 24), t1 = (t0 + 1) % 24;
        double ft = ti - Math.Floor(ti);
        double ph = Math.Max(0, Math.Min(85, phiDeg));
        int p0 = 0;
        while (p0 < PH.Length - 2 && PH[p0 + 1] <= ph) p0++;
        double fp = Math.Max(0, Math.Min(1, (ph - PH[p0]) / (PH[p0 + 1] - PH[p0])));
        for (int c = 0; c < 4; c++)
        {
            double V(int ti2, int pi2) => t[(ti2 * PH.Length + pi2) * 4 + c];
            double a = V(t0, p0) * (1 - fp) + V(t0, p0 + 1) * fp, b = V(t1, p0) * (1 - fp) + V(t1, p0 + 1) * fp;
            double q = a * (1 - ft) + b * ft;
            outp[c] = (float)(c < 3 ? q * 0.02 : q / 255);
        }
    }

    /// <summary>[D_r, D_g, D_b, S] da face plana (sem inclinação).</summary>
    public static void LightFace(byte[] t, float[] outp)
    {
        int o = 24 * PH.Length * 4;
        for (int c = 0; c < 4; c++) outp[c] = (float)(c < 3 ? t[o + c] * 0.02 : t[o + c] / 255.0);
    }

    /// <summary>Ângulo polar (graus) da normal dos perfis medidos com altura = largura, nas
    /// distâncias 0,5; 1; …; 12 de 12 pt (t = d/12). Negativo = inclinada para DENTRO.</summary>
    private static readonly Dictionary<string, double[]> Profiles = new(StringComparer.Ordinal)
    {
        ["relaxedInset"] = new double[] { 81, 73, 67.5, 61.5, 54.5, 50, 48, 42.5, 38, 34, 30.5, -40.5, -50, -50, -50, -48.5, -44.5, -40, -36, -28, -20, -14, -7, -1.5 },
        ["softRound"] = new double[] { 80, 80, 68, -39, -53, -60.5, -60.5, -57, -52, -50, -49, -45.5, -39.5, -36, -32.5, -30.5, -26.5, -17.5, -18, -15, -10.5, -6.5, -3.5, -0.5 },
        ["convex"] = new double[] { 4, 4, 4, 10.5, 16, 20, 23.5, 28.5, 32, 34.5, 37.5, 40, 43.5, 46.5, 49, 50, 50.5, 53.5, 58.5, 62.5, 69, 67, 39.5, 1 },
        ["coolSlant"] = new double[] { 73.5, 69.5, 68, 67, 66.5, 66, 63, 51.5, 45, 33.5, 26.5, 11, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
    };

    /// <summary>
    /// Ângulo polar (graus, negativo = para dentro) da normal do chanfro na fração
    /// t = distância à borda / largura (0 = borda, 1 = começo da face), com a razão
    /// altura/largura <paramref name="hw"/>. circle = quarto de círculo (o padrão), angle =
    /// reta; os perfis medidos; os demais presets seguem o círculo.
    /// </summary>
    public static double BevelPhi(string? prst, double t, double hw)
    {
        double u = Math.Max(1e-3, Math.Min(1, t));
        double[]? tab = prst is not null && Profiles.TryGetValue(prst, out var pt) ? pt : null;
        double tan;
        if (tab is not null)
        {
            double p = Math.Max(0, Math.Min(tab.Length - 1, u * 24 - 0.5));
            int i = (int)Math.Floor(p);
            double f = p - i;
            double deg = tab[i] * (1 - f) + tab[Math.Min(tab.Length - 1, i + 1)] * f;
            tan = Math.Tan((deg * Math.PI) / 180);
        }
        else if (prst == "angle") tan = 1;
        else { double s = 1 - u; tan = s / Math.Sqrt(Math.Max(1e-6, 1 - s * s)); }
        return (Math.Atan(tan * hw) * 180) / Math.PI;
    }
}
