using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Porta de docx-layout/src/underline.ts — sublinhados (w:u) como o Word os desenha no
/// PDF (sonda write/tools/home-lab; memória word-underline-facts): tudo em pixels de
/// 600 dpi (2,4 twips) a partir da baseline; retângulos para os traços cheios e
/// tracejados, curvas cúbicas traçadas para as ondas.
/// </summary>
public static class Underline
{
    /// <summary>twips por pixel de 600 dpi</summary>
    private const double PX = 2.4;
    /// <summary>meia-onda: 1,2 pt (picos a cada 2,4 pt a partir da borda esquerda da página)</summary>
    private const double HalfWave = 24;

    /// <summary>Posição do topo (P), espessura (T) e limite de descida (L) do sublinhado, em px.</summary>
    public readonly record struct UlMetrics(double P, double T, double L);

    /// <summary>Geometria derivada (px): simples [P, P+T]; dupla [top1, top1+Td] e [top2, top2+Td];
    /// grossa/Heavy [top1, top2]; ondas com a linha central entre top1 e B.</summary>
    public readonly record struct UlGeom(double P, double T, double Td, double Top1, double Top2, double B);

    /// <summary>Métricas do sublinhado da face no corpo (em = round(corpo·600/72) px; P e T da post
    /// arredondados no em; L = VDMX 1:1 desse em ou usWinDescent no em, arredondado).</summary>
    public static UlMetrics Metrics(FontFace face, double sizePt)
    {
        var f = face.Font;
        var fm = f.Metrics;
        var m = Fonts.FaceMetrics(f);
        double upm = fm.UnitsPerEm != 0 ? fm.UnitsPerEm : 1000;
        double em = Js.Round((sizePt * 600) / 72);
        double P = Js.Round(m.UnderlinePos * em);
        double T = Math.Max(1, Js.Round(m.UnderlineThick * em));
        var vd = f.Vdmx((int)em);
        double desc = fm.UsWinDescent > 0 ? fm.UsWinDescent : Math.Max(0, -fm.Descender);
        double L = vd is { } v ? -v.YMin : Js.Round((desc * em) / upm);
        return new UlMetrics(P, T, L);
    }

    public static UlGeom Geometry(UlMetrics m)
    {
        double T = m.T, L = m.L;
        double P = m.P + T > L ? Math.Max(0, L - T) : m.P;
        double Td = Math.Floor(T / 2 + 0.5);
        double top1 = Math.Ceiling(P / 2);
        // vão mínimo de 8 px entre as duas linhas; a de baixo não passa da descendente
        double top2 = Math.Max(P + T - Td, top1 + Td + 8);
        double over = top2 + Td - L;
        if (over > 0) { top1 -= over; top2 -= over; }
        if (top1 < 0)
        {
            top1 = 0;
            Td = Math.Max(1, Math.Min(Td, Math.Floor((L - 8) / 2)));
            top2 = L - Td;
        }
        double B = Math.Floor((top1 + top2 + Td) / 2) - 1;
        return new UlGeom(P, T, Td, top1, top2, B);
    }

    /// <summary>Padrão dos tracejados (px de 600 dpi: traço, vão, …) — fixo, não escala com o corpo.</summary>
    private static readonly Dictionary<string, double[]> Patterns = new()
    {
        ["dotted"] = [12, 12], ["dottedHeavy"] = [12, 12],
        ["dash"] = [33, 16], ["dashedHeavy"] = [33, 16],
        ["dashLong"] = [66, 33], ["dashLongHeavy"] = [66, 33],
        ["dotDash"] = [25, 8, 8, 8], ["dashDotHeavy"] = [25, 8, 8, 8],
        ["dotDotDash"] = [18, 6, 6, 6, 6, 6], ["dashDotDotHeavy"] = [18, 6, 6, 6, 6, 6],
    };
    private static readonly HashSet<string> Heavy = ["thick", "dottedHeavy", "dashedHeavy", "dashLongHeavy", "dashDotHeavy", "dashDotDotHeavy"];

    private sealed class Seg
    {
        public double X0, X1;
        public string Color = "000000";
    }

    private sealed class Group
    {
        public string Val = "";
        public double? Low;
        public readonly List<PlacedGlyph> Items = new();
    }

    /// <summary>
    /// Sublinhados de uma linha. Trecho contínuo com o mesmo estilo tem UMA geometria: média de
    /// P/T/L ponderada pela largura dos glifos na baseline do trecho (rebaixados formam trecho
    /// próprio; elevados entram no trecho da linha sem pesar, ou, sozinhos, ficam na própria
    /// baseline). A cor só divide o desenho (e o padrão recomeça).
    /// </summary>
    public static void Paint(List<PageItem> outp, List<PlacedGlyph> all, double frameX, double baseY)
    {
        int lastContent = -1;
        for (int k = 0; k < all.Count; k++)
        {
            var kind = all[k].G.Kind;
            if (kind != GlyphKind.Space && kind != GlyphKind.Lb && kind != GlyphKind.Pb) lastContent = k;
        }
        var groups = new List<Group>();
        Group? cur = null;
        double curEnd = 0;
        for (int k = 0; k < all.Count; k++)
        {
            var pg = all[k];
            var g = pg.G;
            var u = g.Style.Underline;
            bool words = u?.Val == "words";
            bool on = k <= lastContent && u is not null && u.Val != "none" && pg.W > 0 && g.Kind != GlyphKind.Lb && g.Kind != GlyphKind.Pb
                && !(words && (g.Kind == GlyphKind.Space || g.Kind == GlyphKind.Tab));
            if (!on) { cur = null; continue; }
            double? low = g.Style.Shift < 0 ? g.Style.Shift : null;
            double x = frameX + pg.X;
            if (cur is not null && cur.Val == u!.Val && cur.Low == low && Math.Abs(curEnd - x) < 1) cur.Items.Add(pg);
            else { cur = new Group { Val = u!.Val, Low = low }; cur.Items.Add(pg); groups.Add(cur); }
            curEnd = x + pg.W;
        }
        foreach (var gr in groups)
        {
            // baseline do trecho e quem pesa na geometria
            double shift;
            List<PlacedGlyph> weigh;
            if (gr.Low is { } lo) { shift = lo; weigh = gr.Items; }
            else
            {
                var bse = gr.Items.Where(pg => pg.G.Style.Shift == 0).ToList();
                if (bse.Count > 0) { shift = 0; weigh = bse; }
                else
                {
                    shift = gr.Items.Min(pg => pg.G.Style.Shift);
                    double sh = shift;
                    weigh = gr.Items.Where(pg => pg.G.Style.Shift == sh).ToList();
                }
            }
            double sw = 0, sp = 0, st = 0, sl = 0;
            var cache = new Dictionary<string, UlMetrics>();
            foreach (var pg in weigh)
            {
                string key = pg.G.Face.Key + "|" + Js.Str(pg.G.Style.SizePt);
                if (!cache.TryGetValue(key, out var m)) { m = Metrics(pg.G.Face, pg.G.Style.SizePt); cache[key] = m; }
                sw += pg.W; sp += pg.W * m.P; st += pg.W * m.T; sl += pg.W * m.L;
            }
            if (sw <= 0) continue;
            var geo = Geometry(new UlMetrics(Js.Round(sp / sw), Js.Round(st / sw), Js.Round(sl / sw)));
            double y0 = baseY - shift;
            // pedaços por cor (o traço muda de cor; o padrão recomeça)
            var segs = new List<Seg>();
            foreach (var pg in gr.Items)
            {
                double x = frameX + pg.X;
                string color = pg.G.Style.Underline!.Color ?? pg.G.Style.Color;
                var last = segs.Count > 0 ? segs[^1] : null;
                if (last is not null && last.Color == color && Math.Abs(last.X1 - x) < 1) last.X1 = x + pg.W;
                else segs.Add(new Seg { X0 = x, X1 = x + pg.W, Color = color });
            }
            foreach (var s in segs) PaintStyle(outp, gr.Val, geo, s, y0);
        }
    }

    private static void Band(List<PageItem> outp, Seg s, double y0, double top, double h, double[]? pattern = null)
    {
        double y = y0 + top * PX, hh = h * PX;
        if (pattern is null) { outp.Add(new RectItem { X = s.X0, Y = y, W = s.X1 - s.X0, H = hh, Fill = s.Color }); return; }
        double x = s.X0;
        int i = 0;
        while (x < s.X1 - 0.01)
        {
            double len = pattern[i % pattern.Length] * PX;
            if (i % 2 == 0) outp.Add(new RectItem { X = x, Y = y, W = Math.Min(len, s.X1 - x), H = hh, Fill = s.Color });
            x += len;
            i++;
        }
    }

    /// <summary>Onda entre as linhas centrais yTop e yBot (twips), picos na grade da página, recortada no trecho.</summary>
    private static void Wave(List<PageItem> outp, Seg s, double yTop, double yBot, double widthPt)
    {
        var cmds = new List<PathCmdTw>();
        double k = Math.Floor(s.X0 / (2 * HalfWave)) * 2;
        double x = k * HalfWave;
        cmds.Add(PathCmdTw.M(x, yTop));
        while (x < s.X1)
        {
            bool up = k % 2 == 0;
            double y1 = up ? yTop : yBot, y2 = up ? yBot : yTop;
            cmds.Add(PathCmdTw.C(x + HalfWave / 2, y1, x + HalfWave / 2, y2, x + HalfWave, y2));
            x += HalfWave;
            k++;
        }
        double pad = widthPt * 20;
        outp.Add(ClipItem.Push(s.X0, yTop - pad - HalfWave, s.X1 - s.X0, yBot - yTop + 2 * pad + 2 * HalfWave));
        outp.Add(new PathItem { Cmds = cmds, Stroke = new StrokeSpec { Color = s.Color, WidthPt = widthPt } });
        outp.Add(ClipItem.Pop());
    }

    private static void PaintStyle(List<PageItem> outp, string val, UlGeom g, Seg s, double y0)
    {
        switch (val)
        {
            case "double":
                Band(outp, s, y0, g.Top1, g.Td);
                Band(outp, s, y0, g.Top2, g.Td);
                return;
            case "wave":
            case "wavyHeavy":
                Wave(outp, s, y0 + g.Top1 * PX, y0 + g.B * PX, val == "wavyHeavy" ? 0.96 : 0.24);
                return;
            case "wavyDouble":
                {
                    double a = Math.Floor((g.B - g.Top1) / 2) - 1;
                    Wave(outp, s, y0 + g.Top1 * PX, y0 + (g.Top1 + a) * PX, 0.24);
                    Wave(outp, s, y0 + (g.B - a) * PX, y0 + g.B * PX, 0.24);
                    return;
                }
            default:
                {
                    bool heavy = Heavy.Contains(val);
                    double top = heavy ? g.Top1 : g.P;
                    double h = heavy ? g.Top2 - g.Top1 : g.T;
                    Band(outp, s, y0, top, h, Patterns.TryGetValue(val, out var pat) ? pat : null);
                    return;
                }
        }
    }
}
