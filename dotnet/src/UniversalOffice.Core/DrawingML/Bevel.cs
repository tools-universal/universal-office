namespace UniversalOffice.DrawingML;

/// <summary>Chanfro: largura e altura em pixels do raster; preset, luz (rig/dir) e material;
/// <see cref="Word"/> = tabela medida no Word (imagens): a luz por azimute × fração da largura.</summary>
public sealed record BevelSpec(double W, double H, string? Prst = null, string? Rig = null, string? Dir = null, string? Material = null, bool Word = false);

/// <summary>
/// Sombreado do chanfro 3D (<c>&lt;a:sp3d&gt;&lt;a:bevelT&gt;</c> com câmera de frente) sobre
/// pixels RGBA — porta de shared/drawingml/src/bevel.ts: distância de cada pixel à borda
/// da silhueta → inclinação do perfil (bevelPhi) → normal (azimute pelo gradiente da
/// distância, ângulo polar pelo perfil) → luz medida: em luz linear cor·D + S; a face
/// plana também muda. Com <c>Word</c>, a tabela medida no Word (bevel-word.ts, lida do
/// PRÓPRIO TS embutido); sem ela, a luz do PowerPoint (Light3D).
/// </summary>
public static class Bevel
{
    private static readonly Lazy<Dictionary<string, string>> WordBevel = new(() => TsResource.StringTable("bevel-word.ts"));
    private static readonly Dictionary<string, byte[]> WordTabs = new(StringComparer.Ordinal);

    /// <summary>Tabela do Word para o preset (só o rig threePt de cima com o material padrão foi medido).</summary>
    private static byte[]? WordTable(BevelSpec b)
    {
        if (!b.Word || (!string.IsNullOrEmpty(b.Rig) && b.Rig != "threePt") || (!string.IsNullOrEmpty(b.Dir) && b.Dir != "t")
            || (!string.IsNullOrEmpty(b.Material) && b.Material != "warmMatte")) return null;
        string k = b.Prst ?? "circle";
        if (!WordBevel.Value.TryGetValue(k, out var raw) || raw.Length == 0) return null;
        lock (WordTabs)
        {
            if (!WordTabs.TryGetValue(k, out var t)) { t = Convert.FromBase64String(raw); WordTabs[k] = t; }
            return t;
        }
    }

    /// <summary>D e S da tabela do Word (interpolação no azimute e na fração t).</summary>
    private static void WordLight(byte[] t, double thDeg, double u, float[] outp)
    {
        const int NA = 24, NT = 24;
        double th = ((thDeg % 360) + 360) % 360;
        double ai = th / 15 - 0.5;
        int a0 = (int)(((Math.Floor(ai) % NA) + NA) % NA), a1 = (a0 + 1) % NA;
        double fa = ai - Math.Floor(ai);
        double ti = Math.Max(0, Math.Min(NT - 1, u * NT - 0.5));
        int t0 = (int)Math.Floor(ti), t1 = Math.Min(NT, t0 + 1);
        double ft = ti - t0;
        for (int c = 0; c < 2; c++)
        {
            double At(int a, int k) => t[(a * (NT + 1) + k) * 2 + c];
            double v = (At(a0, t0) * (1 - ft) + At(a0, t1) * ft) * (1 - fa) + (At(a1, t0) * (1 - ft) + At(a1, t1) * ft) * fa;
            if (c == 0) outp[0] = outp[1] = outp[2] = (float)(v * 0.02);
            else outp[3] = (float)(v / 255);
        }
    }

    private static readonly float[] SrgbLin = BuildSrgbLin();
    private static readonly byte[] LinSrgb = BuildLinSrgb();

    private static float[] BuildSrgbLin()
    {
        var t = new float[256];
        for (int v = 0; v < 256; v++) { double x = v / 255.0; t[v] = (float)(x <= 0.04045 ? x / 12.92 : Math.Pow((x + 0.055) / 1.055, 2.4)); }
        return t;
    }

    private static byte[] BuildLinSrgb()
    {
        var t = new byte[4096];
        for (int i = 0; i < 4096; i++)
        {
            double x = i / 4095.0;
            t[i] = (byte)UniversalOffice.Core.JsNumber.Round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.Pow(x, 1 / 2.4) - 0.055));
        }
        return t;
    }

    /// <summary>Aplica o chanfro nos pixels <paramref name="rgba"/> (w×h) dentro da silhueta
    /// <paramref name="sil"/> (mesmo tamanho).</summary>
    public static void ShadeBevel(byte[] rgba, Mask sil, BevelSpec b)
    {
        var wt = WordTable(b);
        var tab = Light3D.LightTable(b.Rig, b.Material);
        if ((tab is null && wt is null) || !(b.W > 0.5)) return;
        int W = sil.W, H = sil.H;
        // distância (px) até FORA da forma — a borda do raster conta como fora
        var P = new Mask(W + 2, H + 2);
        for (int r = 0; r < H; r++) Array.Copy(sil.A, r * W, P.A, (r + 1) * (W + 2) + 1, W);
        var pd = Raster.DistanceTo(P, false);
        var dist = new float[W * H];
        for (int r = 0; r < H; r++) for (int c = 0; c < W; c++) dist[r * W + c] = pd[(r + 1) * (W + 2) + c + 1];
        // direção da normal: gradiente (Sobel) da distância suavizada — a distância
        // discreta perto da borda faz estrias
        var sm = Raster.GaussianBlur(new Mask(W, H, dist), 1.2).A;
        double hw = b.H / b.W;
        var L = new float[4];
        var face = new float[4];
        if (wt is not null)
        {
            const int o = 24 * 25 * 2 - 2;
            face[0] = face[1] = face[2] = (float)(wt[o] * 0.02);
            face[3] = (float)(wt[o + 1] / 255.0);
        }
        else Light3D.LightFace(tab!, face);
        double G(int cc, int rr) => sm[Math.Min(H - 1, Math.Max(0, rr)) * W + Math.Min(W - 1, Math.Max(0, cc))];
        for (int r = 0; r < H; r++)
        {
            for (int c = 0; c < W; c++)
            {
                int i = r * W + c;
                float a = sil.A[i];
                if (a <= 0) continue;
                double d = dist[i];
                var lt = face;
                if (d < b.W)
                {
                    // direção para FORA = −∇d (Sobel na distância suavizada)
                    double gx = G(c + 1, r - 1) + 2 * G(c + 1, r) + G(c + 1, r + 1) - G(c - 1, r - 1) - 2 * G(c - 1, r) - G(c - 1, r + 1);
                    double gy = G(c - 1, r + 1) + 2 * G(c, r + 1) + G(c + 1, r + 1) - G(c - 1, r - 1) - 2 * G(c, r - 1) - G(c + 1, r - 1);
                    double th = (Math.Atan2(-gy, -gx) * 180) / Math.PI;
                    if (wt is not null) WordLight(wt, th, d / b.W, L);
                    else
                    {
                        double ph = Light3D.BevelPhi(b.Prst, d / b.W, hw);
                        // inclinada para dentro: a normal aponta para o lado oposto
                        Light3D.LightAt(tab!, b.Dir, ph < 0 ? th + 180 : th, Math.Abs(ph), L);
                    }
                    lt = L;
                }
                int o = i * 4;
                for (int k = 0; k < 3; k++)
                {
                    double v = (double)SrgbLin[rgba[o + k]] * lt[k] + lt[3];
                    byte nv = LinSrgb[(int)Math.Max(0, Math.Min(4095, UniversalOffice.Core.JsNumber.Round(v * 4095)))];
                    rgba[o + k] = a >= 1 ? nv : (byte)UniversalOffice.Core.JsNumber.Round(rgba[o + k] + (nv - rgba[o + k]) * (double)a);
                }
            }
        }
    }
}
