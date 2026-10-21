using System.Text;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>Linha de texto → itens de desenho (glifos agrupados, sublinhados,
/// realces) — porta de docx-layout/src/paint.ts.</summary>
public static class Paint
{
    /// <summary>Identidade das linhas pintadas (GlyphRunItem.LineBox.Line).</summary>
    private static int _lineSeq;

    /// <summary>Fração de equação (Math.cs): numerador e denominador — nessa ordem, como o Word
    /// grava no PDF — e o traço.</summary>
    private static void PaintMath(List<PageItem> outp, MathBox box, double frameX, double x, double baseY, Line line, int lineId)
    {
        GlyphRunItem? run = null;
        StringBuilder? text = null;
        string key = "";
        foreach (var it in box.Items)
        {
            string k = $"{it.Face.Key}|{Js.Str(it.SizePt)}|{it.Style.Color}|{Js.Str(it.Y)}";
            if (run is null || k != key)
            {
                if (run is not null) { run.Text = text!.ToString(); outp.Add(run); }
                key = k;
                run = new GlyphRunItem
                {
                    Face = it.Face, SizePt = it.SizePt, Color = it.Style.Color, Y = baseY + it.Y,
                    LineBox = new LineBoxInfo(line.Baseline + it.Y, line.Height - line.Baseline - it.Y, x + it.X, lineId),
                };
                text = new StringBuilder();
            }
            run.Glyphs.Add(new GlyphPos(it.Cp, frameX + x + it.X));
            text!.Append(char.ConvertFromUtf32(it.Cp));
        }
        if (run is not null) { run.Text = text!.ToString(); outp.Add(run); }
        foreach (var r in box.Rules) outp.Add(new RectItem { X = frameX + x + r.X, Y = baseY + r.Y, W = r.W, H = r.H, Fill = r.Color });
    }

    public static void PaintLine(DocContext ctx, List<PageItem> outp, Line line, double frameX, double top)
    {
        double baseY = top + line.Baseline;
        int lineId = Interlocked.Increment(ref _lineSeq);
        var all = new List<PlacedGlyph>();
        if (line.Marker is not null) all.AddRange(line.Marker);
        all.AddRange(line.Placed);
        // fundos: sombreamento de run e realce (por trás do texto)
        foreach (var pg in all)
        {
            var st = pg.G.Style;
            string? fill = st.Highlight ?? st.Shading;
            if (fill is null || pg.W <= 0 || pg.G.Kind == GlyphKind.Lb || pg.G.Kind == GlyphKind.Pb) continue;
            var m = Fonts.FaceMetrics(pg.G.Face.Font);
            double asc = m.Ascent * st.SizePt * 20, desc = m.Descent * st.SizePt * 20;
            outp.Add(new RectItem { X = frameX + pg.X, Y = baseY - asc, W = pg.W, H = asc + desc, Fill = fill });
        }
        // glifos, agrupados por face/tamanho/cor/deslocamento
        GlyphRunItem? run = null;
        StringBuilder? text = null;
        string runKey = "";
        void Flush()
        {
            if (run is not null && run.Glyphs.Count > 0) { run.Text = text!.ToString(); outp.Add(run); }
            run = null; text = null; runKey = "";
        }
        foreach (var pg in all)
        {
            var g = pg.G;
            if (g.MathBox is not null) { Flush(); PaintMath(outp, g.MathBox, frameX, pg.X, baseY, line, lineId); continue; }
            if (g.Kind != GlyphKind.Char && g.Kind != GlyphKind.Nbsp && !(g.Kind == GlyphKind.Shy && pg.W > 0))
            {
                if (g.Kind == GlyphKind.Space) continue;
                Flush();
                if (g.Kind == GlyphKind.Tab && pg.Leader is not null) PaintLeader(ctx, outp, pg, frameX, baseY, all);
                if (g.Kind == GlyphKind.Obj && g.Obj is not null && g.Adv > 0) PaintInlineObject(ctx, outp, g, frameX + pg.X, baseY);
                if (g.Kind == GlyphKind.Box && g.Box is not null) PaintCheckBox(outp, g, frameX + pg.X, baseY);
                continue;
            }
            // seletor de variação (U+FE0E/FE0F, emoji): sem glifo
            if (g.Cp >= 0xfe00 && g.Cp <= 0xfe0f) continue;
            // espaços tipográficos tratados como caractere (resultado de FORMTEXT): em branco —
            // sem o .notdef da fonte que não os tem (corpus t43)
            if ((g.Cp >= 0x2000 && g.Cp <= 0x200a) || g.Cp == 0x3000) continue;
            var st = g.Style;
            // texto SEM preenchimento (w14:noFill / alpha 100%) e sem contorno: o Word
            // não desenha nem grava no PDF (oráculo hidetext/tf-nofill, tf-alpha100)
            if (st.Alpha == 0 && !st.Outline) { Flush(); continue; }
            // emoji colorido (COLR): o Word desenha as camadas coloridas, sem texto
            // extraível (oráculo hidetext/emoji)
            bool colr = g.Face.Font.HasColorGlyphs() && g.Face.Font.ColorLayers(g.Face.Font.GlyphId(g.Cp)) is not null;
            string key = $"{g.Face.Key}|{(g.Face.SynthBold ? 1 : 0)}{(g.Face.SynthItalic ? 1 : 0)}|{Js.Str(g.SizePt)}|{st.Color}|{Js.Str(st.Shift)}|{Js.Str(st.Rpr.W ?? 100)}|{Js.Str(st.Alpha ?? 1)}|{(colr ? "c" : "")}";
            if (key != runKey)
            {
                Flush();
                runKey = key;
                run = new GlyphRunItem
                {
                    Face = g.Face, SizePt = g.SizePt, Color = st.Color, Y = baseY - st.Shift,
                    ScaleX = st.Rpr.W is { } w && w != 0 && !double.IsNaN(w) && w != 100 ? w / 100 : null,
                    SynthBold = g.Face.SynthBold,
                    SynthItalic = g.Face.SynthItalic,
                    Alpha = st.Alpha,
                    // semitransparente: o Word desenha CURVAS, não texto (oráculo hidetext/tf-alpha50);
                    // emoji colorido: curvas por camada
                    AsPath = st.Alpha is { } a && a > 0 && a < 1 || colr,
                    LineBox = new LineBoxInfo(line.Baseline - st.Shift, line.Height - line.Baseline + st.Shift, pg.X, lineId),
                    Colr = colr,
                };
                text = new StringBuilder();
            }
            int cp = g.Kind == GlyphKind.Shy ? 0x2d : g.Cp;
            run!.Glyphs.Add(new GlyphPos(cp, frameX + pg.X));
            text!.Append(Js.FromCodePoint(cp));
        }
        Flush();
        // sublinhado / tachado — por trechos contíguos com o mesmo estilo
        PaintDecorations(outp, all, frameX, baseY, line);
    }

    /// <summary>
    /// Preenchimento de tab como o Word desenha (oráculo tocdots), em pixels de 600 dpi:
    ///  - glifo/fonte/tamanho/cor/deslocamento: os do run do TAB; 'heavy' também sai com '_';
    ///  - passo = avanço do glifo no em do dispositivo (round(tamanho × 600/72) px),
    ///    arredondado ao pixel (+ w:spacing do run do tab; × escala w:w);
    ///  - grade ABSOLUTA: glifos em múltiplos do passo a partir da borda esquerda da
    ///    PÁGINA (independe de margem e recuo — tocdots-margin);
    ///  - só glifos inteiros, sem respiro: 1º em k·passo ≥ fim do texto; o último
    ///    termina ≤ início do texto seguinte, igualdade inclusive (tocdots-tabpos).
    ///    Bordas do tab em px como o Word posiciona: px(quadro) + px(deslocamento); o fim do
    ///    texto é o de EXIBIÇÃO (DisplayEnd).
    /// </summary>
    private static void PaintLeader(DocContext ctx, List<PageItem> outp, PlacedGlyph pg, double frameX, double baseY, List<PlacedGlyph> all)
    {
        if (pg.W <= 0) return;
        var g = pg.G;
        string ch = pg.Leader == "hyphen" ? "-" : pg.Leader == "underscore" || pg.Leader == "heavy" ? "_" : pg.Leader == "middleDot" ? "·" : ".";
        int cp = ch[0];
        var face = g.Face;
        var f = face.Font;
        var rpr = g.Style.Rpr;
        double emPx = Js.Round((g.SizePt * 600) / 72);
        double step = Js.Round((f.AdvanceWidth(f.GlyphId(cp)) * emPx) / f.Metrics.UnitsPerEm);
        if (rpr.Spacing is { } sp && sp != 0 && !double.IsNaN(sp)) step += Js.Round(sp / 2.4);
        double scale = rpr.W is { } w && w != 0 && !double.IsNaN(w) && w != 100 ? w / 100 : 1;
        step = Js.Round(step * scale);
        if (!(step > 0)) return;
        // px do quadro: meio pixel arredonda para o PAR (472,5 → 472; 467,5 → 468 — oráculo tdhalfpx)
        double fv = frameX / 2.4, ff = Math.Floor(fv);
        double fx = Math.Abs(fv - ff - 0.5) < 1e-6 ? ff + (ff % 2) : Js.Round(fv);
        double x0 = DisplayEnd(ctx, all, pg, fx), x1 = fx + Js.Round((pg.X + pg.W) / 2.4);
        var run = new GlyphRunItem
        {
            Face = face, SizePt = g.SizePt, Color = g.Style.Color, Y = baseY - g.Style.Shift,
            ScaleX = scale != 1 ? scale : null,
        };
        var sb = new StringBuilder();
        for (double k = Math.Ceiling(x0 / step); (k + 1) * step <= x1; k++) { run.Glyphs.Add(new GlyphPos(cp, k * step * 2.4)); sb.Append(ch); }
        run.Text = sb.ToString();
        if (run.Glyphs.Count > 0) outp.Add(run);
    }

    private static void PaintCheckBox(List<PageItem> outp, Glyph g, double x, double baseY)
    {
        var b = g.Box!;
        // base da caixa ≈ 0,18 × corpo abaixo da baseline (medido)
        double top = baseY + 0.18 * (b.Side / 1.07) - b.Side;
        double w = Math.Max(0.5, b.Side / 20 / 16);
        string c = g.Style.Color;
        outp.Add(new LineItem { X1 = x, Y1 = top, X2 = x + b.Side, Y2 = top, Color = c, WidthPt = w });
        outp.Add(new LineItem { X1 = x, Y1 = top + b.Side, X2 = x + b.Side, Y2 = top + b.Side, Color = c, WidthPt = w });
        outp.Add(new LineItem { X1 = x, Y1 = top, X2 = x, Y2 = top + b.Side, Color = c, WidthPt = w });
        outp.Add(new LineItem { X1 = x + b.Side, Y1 = top, X2 = x + b.Side, Y2 = top + b.Side, Color = c, WidthPt = w });
        if (b.Checked)
        {
            outp.Add(new LineItem { X1 = x, Y1 = top, X2 = x + b.Side, Y2 = top + b.Side, Color = c, WidthPt = w });
            outp.Add(new LineItem { X1 = x + b.Side, Y1 = top, X2 = x, Y2 = top + b.Side, Color = c, WidthPt = w });
        }
    }

    internal static ImageItem ImageItemOf(InlineImage im, double x, double y, double w, double h) => new()
    {
        X = x, Y = y, W = w, H = h, Image = im,
        Crop = im.Crop,
        Rot = im.Style?.Rot is { } r && r != 0 && !double.IsNaN(r) ? r : null,
        FlipH = im.Style?.FlipH == true,
        FlipV = im.Style?.FlipV == true,
    };

    private static void PaintInlineObject(DocContext ctx, List<PageItem> outp, Glyph g, double x0, double baseY0)
    {
        var obj = g.Obj!;
        double shift = g.Style.Shift;
        // margem de efeitos em linha: a figura fica dentro dela (oráculo effext)
        var ie = obj.Image?.InlineEffect ?? obj.Shape?.InlineEffect;
        double x = x0 + (ie?.L ?? 0), baseY = baseY0 - (ie?.B ?? 0);
        if (obj.Image is not null && Emf.IsEmf(obj.Image.Data))
        {
            var im = obj.Image;
            double ry = baseY - shift - im.HeightTwips;
            outp.Add(ClipItem.Push(x, ry, im.WidthTwips, im.HeightTwips));
            outp.AddRange(Emf.RenderEmf(ctx, im.Data, x, ry, im.WidthTwips, im.HeightTwips));
            outp.Add(ClipItem.Pop());
        }
        else if (obj.Image is not null && Wmf.IsWmf(obj.Image.Data))
        {
            // WMF (prévia do Equation Editor 3.0…): o Word desenha e grava o texto (Wmf.cs)
            var im = obj.Image;
            double ry = baseY - shift - im.HeightTwips;
            outp.Add(ClipItem.Push(x, ry, im.WidthTwips, im.HeightTwips));
            outp.AddRange(Wmf.RenderWmf(ctx, im.Data, x, ry, im.WidthTwips, im.HeightTwips));
            outp.Add(ClipItem.Pop());
        }
        else if (obj.Image is not null)
        {
            var im = obj.Image;
            outp.Add(ImageItemOf(im, x, baseY - shift - im.HeightTwips, im.WidthTwips, im.HeightTwips));
        }
        else if (obj.Shape is not null)
        {
            var s = obj.Shape;
            outp.Add(new ShapeItem { X = x, Y = baseY - shift - s.HeightTwips, W = s.WidthTwips, H = s.HeightTwips, Style = s.Style });
        }
    }

    private sealed class Seg
    {
        public double X0;
        public double X1;
        public Glyph G = null!;
    }

    private static void PaintDecorations(List<PageItem> outp, List<PlacedGlyph> all, double frameX, double baseY, Line line)
    {
        List<Seg> Segs(Func<Glyph, bool> pred)
        {
            var res = new List<Seg>();
            Seg? cur = null;
            // espaços finais da linha não recebem sublinhado
            int lastContent = -1;
            for (int k = 0; k < all.Count; k++)
            {
                var kind = all[k].G.Kind;
                if (kind != GlyphKind.Space && kind != GlyphKind.Lb && kind != GlyphKind.Pb) lastContent = k;
            }
            for (int k = 0; k < all.Count; k++)
            {
                var pg = all[k];
                var g = pg.G;
                bool on = k <= lastContent && pred(g) && pg.W > 0 && g.Kind != GlyphKind.Lb && g.Kind != GlyphKind.Pb;
                if (on && cur is not null && ReferenceEquals(cur.G.Style, g.Style) && Math.Abs(cur.X1 - (frameX + pg.X)) < 1)
                {
                    cur.X1 = frameX + pg.X + pg.W;
                }
                else if (on)
                {
                    if (cur is not null) res.Add(cur);
                    cur = new Seg { X0 = frameX + pg.X, X1 = frameX + pg.X + pg.W, G = g };
                }
                else if (cur is not null) { res.Add(cur); cur = null; }
            }
            if (cur is not null) res.Add(cur);
            return res;
        }
        foreach (var s in Segs(g => g.Style.Underline is not null && g.Style.Underline.Val != "none"))
        {
            var st = s.G.Style;
            var m = Fonts.FaceMetrics(s.G.Face.Font);
            double sz = st.SizePt * 20;
            double y = baseY - st.Shift + m.UnderlinePos * sz;
            double w = Math.Max(0.5, m.UnderlineThick * st.SizePt);
            string color = st.Underline!.Color ?? st.Color;
            string val = st.Underline.Val;
            if (val == "words" && s.G.Kind == GlyphKind.Space) continue;
            string? dash = val.StartsWith("dotted", StringComparison.Ordinal) ? "dotted" : val.StartsWith("dash", StringComparison.Ordinal) ? "dashed" : null;
            outp.Add(new LineItem { X1 = s.X0, Y1 = y, X2 = s.X1, Y2 = y, Color = color, WidthPt = val == "thick" ? w * 2 : w, Dash = dash });
            if (val == "double") outp.Add(new LineItem { X1 = s.X0, Y1 = y + w * 20 * 2, X2 = s.X1, Y2 = y + w * 20 * 2, Color = color, WidthPt = w });
        }
        foreach (var s in Segs(g => g.Style.Strike || g.Style.Dstrike))
        {
            var st = s.G.Style;
            var m = Fonts.FaceMetrics(s.G.Face.Font);
            double y = baseY - st.Shift - m.Ascent * st.SizePt * 20 * 0.3;
            double w = Math.Max(0.5, m.UnderlineThick * st.SizePt);
            outp.Add(new LineItem { X1 = s.X0, Y1 = y, X2 = s.X1, Y2 = y, Color = st.Color, WidthPt = w });
            if (st.Dstrike) outp.Add(new LineItem { X1 = s.X0, Y1 = y - w * 40, X2 = s.X1, Y2 = y - w * 40, Color = st.Color, WidthPt = w });
        }
    }


    /// <summary>
    /// Fim do texto antes do tab como o Word o EXIBE no PDF (px de 600 dpi). O Word converte
    /// as larguras da unidade interna (1/4096 pt) para o dispositivo com o multiplicador de
    /// ponto fixo 8534/2²² (= teto(2²²/491,52)) em 32 bits: o texto desde o tab anterior (ou o
    /// início da linha) é medido em trechos — o maior prefixo de glifos cuja largura × 8534 +
    /// 2²¹ ainda cabe em 2³² (≈ 1023,5 px) — e cada trecho é arredondado ao pixel à parte.
    /// Exceção ainda não modelada: modo ≤ 14 com useWord97LineBreakRules e fonte do Leste
    /// Asiático no texto — ali fica o arredondamento do fim ideal.
    /// </summary>
    private static double DisplayEnd(DocContext ctx, List<PlacedGlyph> all, PlacedGlyph tab, double fx)
    {
        int i = all.IndexOf(tab), s = i;
        while (s > 0 && all[s - 1].G.Kind != GlyphKind.Tab) s--;
        var st = ctx.Fmt.Settings;
        var first = s < i ? all[s] : tab;
        if (st.CompatibilityMode < 15 && st.Compat.TryGetValue("useWord97LineBreakRules", out var w97) && w97
            && Resolve.FontOfSlot(first.G.Style.Rpr.RFonts, "eastAsia", ctx.Fmt.Theme) is { Length: > 0 })
            return fx + Js.Round(tab.X / 2.4);
        static double Seg(double u) => Math.Floor((u * 8534 + 2097152) / 4194304);
        double px = fx + Js.Round(first.X / 2.4);
        double acc = 0;
        for (int j = s; j < i; j++)
        {
            double w = Js.Round(all[j].W / Para.WordUnit);
            if (acc > 0 && (acc + w) * 8534 + 2097152 >= 4294967296.0) { px += Seg(acc); acc = 0; }
            acc += w;
        }
        return px + Seg(acc);
    }
    /// <summary>Espessura desenhada (twips) de uma borda OOXML (w:sz em 1/8 pt).</summary>
    public static double BorderWidth(BorderSpec? b)
    {
        if (b is null || b.Val is "none" or "nil") return 0;
        // a espessura vai para twips INTEIROS, truncada: w:sz 1 → 2 tw, 3 → 7 tw (oráculo bdrthin)
        double tw = Math.Floor(Math.Max(1, b.Sz ?? 4) * 2.5 + 1e-9);
        switch (b.Val)
        {
            case "double": return tw * 3;
            case "thinThickSmallGap": case "thickThinSmallGap": return tw + 40;
            // as outras compostas: a soma das faixas que o Word desenha (sonda de bordas do table-lab)
            case "triple": return tw * 5;
            case "thinThickThinSmallGap": return tw + 58;
            case "thinThickMediumGap": case "thickThinMediumGap": return tw * 2;
            case "thinThickThinMediumGap": return tw * 3;
            case "thinThickLargeGap": case "thickThinLargeGap": return tw + 43;
            case "thinThickThinLargeGap": return tw * 2 + 58;
            case "threeDEmboss": case "threeDEngrave": return tw + 2 * Math.Max(14, Math.Floor(tw / 2));
            default: return tw;
        }
    }

    /// <summary>Faixa de uma borda composta: espessura (twips) e cor (nulo = vão; "ink"/"light"/"mid").</summary>
    private readonly record struct Band(double T, string? C);

    /// <summary>Faixas de uma borda, de FORA para dentro, como o Word as desenha (porta de paint.ts).</summary>
    private static Band[] BorderBands(string val, double w)
    {
        static double Q(double x) => Math.Max(2.4, Math.Floor(x / 2.4 + 1e-9) * 2.4);
        double thin = 14.4, half = Q(w / 2), thick = 28.8;
        static Band Gap(double t) => new(t, null);
        static Band Ink(double t) => new(t, "ink");
        switch (val)
        {
            case "double": return new[] { Ink(w), Gap(w), Ink(w) };
            case "triple": return new[] { Ink(w), Gap(w), Ink(w), Gap(w), Ink(w) };
            case "thinThickSmallGap": return new[] { Ink(w), Gap(thin), Ink(thin) };
            case "thickThinSmallGap": return new[] { Ink(thin), Gap(thin), Ink(w) };
            case "thinThickThinSmallGap": return new[] { Ink(thin), Gap(thin), Ink(w), Gap(thin), Ink(thin) };
            case "thinThickMediumGap": return new[] { Ink(w), Gap(half), Ink(half) };
            case "thickThinMediumGap": return new[] { Ink(half), Gap(half), Ink(w) };
            case "thinThickThinMediumGap": return new[] { Ink(half), Gap(half), Ink(w), Gap(half), Ink(half) };
            case "thinThickLargeGap": return new[] { Ink(thick), Gap(w), Ink(thin) };
            case "thickThinLargeGap": return new[] { Ink(thin), Gap(w), Ink(thick) };
            case "thinThickThinLargeGap": return new[] { Ink(thin), Gap(w), Ink(thick), Gap(w), Ink(thin) };
            case "threeDEmboss": { double t = Math.Max(thin, half); return new[] { new Band(t, "light"), new Band(w, "mid"), new Band(t, "ink") }; }
            case "threeDEngrave": { double t = Math.Max(thin, half); return new[] { new Band(t, "ink"), new Band(w, "mid"), new Band(t, "light") }; }
            default: return new[] { Ink(w) };
        }
    }

    /// <summary>Mistura com o branco (relevo 3D: preto → C0C0C0 / 606060).</summary>
    private static string ToWhite(string hex, double f)
    {
        int n = Convert.ToInt32(hex, 16);
        int[] ch = { (n >> 16) & 255, (n >> 8) & 255, n & 255 };
        var sb = new System.Text.StringBuilder();
        foreach (int v in ch) sb.Append(((int)Math.Round(v + (255 - v) * f, MidpointRounding.AwayFromZero)).ToString("X2"));
        return sb.ToString();
    }

    /// <summary>Tracejados de borda (múltiplos de w — medido).</summary>
    private static string? BorderDash(string val) => val switch
    {
        "dotted" => "bdrDot", "dashed" => "bdrDash", "dotDash" => "bdrDashDot", "dotDotDash" => "bdrDashDotDot",
        "dashSmallGap" => "bdrDashSmall", "dashDotStroked" => "bdrDashDot", _ => null,
    };

    /// <summary>
    /// Espessura (twips) com que o Word GRAVA uma borda no PDF (oráculo bdrw): w:sz
    /// (1/8 pt) truncado para 1/600" — 2→0,24 pt, 4→0,48, 6→0,72, 12→1,44, 24→3,00,
    /// 36→4,44. O layout usa a espessura nominal (BorderWidth); só o desenho quantiza.
    /// </summary>
    public static double BorderPaintWidth(BorderSpec b) => Math.Max(1, Math.Floor((Math.Max(2, b.Sz ?? 4) * 25) / 24 + 1e-9)) * 2.4;

    /// <summary>
    /// Desenha uma borda horizontal/vertical centrada no segmento dado. As sólidas
    /// (single, thick, double…) saem como RETÂNGULOS preenchidos da espessura
    /// quantizada, como no PDF do Word — traço fino antisserrilhado cai entre dois
    /// pixels e some; o retângulo fino o leitor de PDF alinha ao pixel. Pontilhadas/
    /// tracejadas seguem como traço (o Word também as grava assim).
    /// </summary>
    public static void PaintBorder(DocContext ctx, List<PageItem> outp, BorderSpec? b, double x1, double y1, double x2, double y2, string? outer = null)
    {
        if (b is null || b.Val is "none" or "nil") return;
        string color = Resolve.ResolveColor(b.Color, b.ThemeColor, b.ThemeTint, b.ThemeShade, ctx.Fmt.Theme) ?? "000000";
        double w = BorderPaintWidth(b);
        string? dash = BorderDash(b.Val);
        if (dash is not null) { outp.Add(new LineItem { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2, Color = color, WidthPt = w / 20, Dash = dash }); return; }
        // diagonal (tl2br/tr2bl da célula): traço
        if (x1 != x2 && y1 != y2) { outp.Add(new LineItem { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2, Color = color, WidthPt = w / 20 }); return; }
        bool horizontal = Math.Abs(y2 - y1) < Math.Abs(x2 - x1);
        if (b.Val is "wave" or "doubleWave") { PaintWave(outp, b.Val == "doubleWave", color, w, horizontal, x1, y1, x2, y2); return; }
        var bands = BorderBands(b.Val, w);
        double total = 0;
        foreach (var bd in bands) total += bd.T;
        // de fora para dentro: de cima (ou da esquerda) quando o lado de fora é top/left
        bool flip = outer is "bottom" or "right";
        double pos = -total / 2;
        var order = flip ? bands.Reverse().ToArray() : bands;
        foreach (var band in order)
        {
            if (band.C is not null)
            {
                string fill = band.C == "light" ? ToWhite(color, 192.0 / 255) : band.C == "mid" ? ToWhite(color, 96.0 / 255) : color;
                if (horizontal) outp.Add(new RectItem { X = Math.Min(x1, x2), Y = y1 + pos, W = Math.Abs(x2 - x1), H = band.T, Fill = fill });
                else outp.Add(new RectItem { X = x1 + pos, Y = Math.Min(y1, y2), W = band.T, H = Math.Abs(y2 - y1), Fill = fill });
            }
            pos += band.T;
        }
    }

    /// <summary>Ondulada: zigue-zague de altura 3 pt e período 6 pt, escalado com a espessura (porta de paint.ts).</summary>
    private static void PaintWave(List<PageItem> outp, bool dbl, string color, double w, bool horizontal, double x1, double y1, double x2, double y2)
    {
        double h = Math.Max(60, w * 3), period = h * 2, lw = Math.Max(0.5, w / 20 / 1.5);
        double len = horizontal ? Math.Abs(x2 - x1) : Math.Abs(y2 - y1);
        double[] waves = dbl ? new[] { -h / 4, h / 4 } : new[] { 0.0 };
        foreach (double off in waves)
        {
            var cmds = new List<PathCmdTw>();
            for (double s = 0; s <= len + 0.01; s += period / 2)
            {
                double d = ((long)Math.Round(s / (period / 2), MidpointRounding.AwayFromZero) % 2 != 0 ? 1 : -1) * (h / (dbl ? 4 : 2));
                double a = Math.Min(s, len);
                double px = horizontal ? Math.Min(x1, x2) + a : x1 + off + d;
                double py = horizontal ? y1 + off + d : Math.Min(y1, y2) + a;
                cmds.Add(cmds.Count == 0 ? PathCmdTw.M(px, py) : PathCmdTw.L(px, py));
            }
            outp.Add(new PathItem { Cmds = cmds, Stroke = new StrokeSpec { Color = color, WidthPt = lw } });
        }
    }

    /// <summary>Tracejados de borda (Word: múltiplos da espessura) — porta de tree.ts BORDER_DASHES.</summary>
    public static double[]? BorderDashes(string? dash, double w) => dash switch
    {
        "bdrDot" => new[] { w, w }, "bdrDash" => new[] { 3 * w, w }, "bdrDashDot" => new[] { 3 * w, w, w, w },
        "bdrDashDotDot" => new[] { 3 * w, w, w, w, w, w }, "bdrDashSmall" => new[] { 25 * w / 6, 5 * w / 6 }, _ => null,
    };

    /// <summary>Caixa de bordas/sombreamento de um bloco de parágrafos com bordas iguais.</summary>
    public static void PaintParaBox(
        DocContext ctx, List<PageItem> outp, PreparedPara p, PBdr? pBdr,
        double left, double right, double top, double bottom, bool drawTop, bool drawBottom,
        /* parágrafo do meio de um grupo: desenha a borda "between" no topo (após o espaço) */
        bool between = false)
    {
        string? fill = Resolve.ShadingFill(p.Ppr.Shd, ctx.Fmt.Theme);
        const double EXT = 29;
        var bl = pBdr?.Left;
        var br = pBdr?.Right;
        double padL = bl is not null && bl.Val != "none" && bl.Val != "nil" ? (bl.Space ?? 0) * 20 : 0;
        double padR = br is not null && br.Val != "none" && br.Val != "nil" ? (br.Space ?? 0) * 20 : 0;
        double inL = left - EXT - padL, inR = right + EXT + padR;
        // sombra (w:shadow): a faixa de cima/baixo reservada é o dobro da espessura; a
        // borda de cima fica na metade de BAIXO da faixa e a sombra é uma cópia das bordas
        // direita e de baixo deslocada da espessura para a direita e para baixo (PDF do Word)
        double shT = drawTop && pBdr?.Top?.Shadow == true ? BorderWidth(pBdr.Top) : 0;
        double shB = drawBottom && pBdr?.Bottom?.Shadow == true ? BorderWidth(pBdr.Bottom) : 0;
        double shR = br?.Shadow == true ? BorderWidth(br) : 0;
        double fTop = shT != 0 ? top + shT + BorderWidth(pBdr!.Top) : top, fBot = shB != 0 ? bottom - shB - BorderWidth(pBdr!.Bottom) : bottom;
        if (fill is not null) outp.Add(new RectItem { X = inL, Y = fTop, W = inR - inL, H = fBot - fTop, Fill = fill });
        if (pBdr is null) return;
        double outL = inL - BorderWidth(bl), outR = inR + BorderWidth(br);
        if (drawTop) { double y = top + shT + BorderWidth(pBdr.Top) / 2; PaintBorder(ctx, outp, pBdr.Top, outL, y, outR, y); }
        var btw = pBdr.Between;
        if (between && btw is not null && btw.Val != "none" && btw.Val != "nil")
        {
            double yb = top + (btw.Space ?? 0) * 20 + BorderWidth(btw) / 2;
            PaintBorder(ctx, outp, btw, outL, yb, outR, yb);
        }
        if (drawBottom)
        {
            double y = bottom - shB - BorderWidth(pBdr.Bottom) / 2;
            PaintBorder(ctx, outp, pBdr.Bottom, outL, y, outR, y);
            if (shB != 0) PaintBorder(ctx, outp, pBdr.Bottom, outL + shB, bottom - shB / 2, outR + shB, bottom - shB / 2);
        }
        PaintBorder(ctx, outp, bl, inL - BorderWidth(bl) / 2, top + shT, inL - BorderWidth(bl) / 2, bottom - shB);
        PaintBorder(ctx, outp, br, inR + BorderWidth(br) / 2, top + shT, inR + BorderWidth(br) / 2, bottom - shB);
        if (shR != 0) PaintBorder(ctx, outp, br, inR + BorderWidth(br) + shR / 2, top + shT + shR, inR + BorderWidth(br) + shR / 2, bottom);
    }

    /// <summary>
    /// Bordas de página (w:pgBorders) como o Word as grava no PDF (oráculo pgbdr):
    ///  - offsetFrom="page": a borda começa a `space` pt da BORDA da página e cresce
    ///    para dentro;
    ///  - offsetFrom="text" (padrão): a face interna fica a `space` pt da área de
    ///    texto e a espessura cresce para fora; com cabeçalho/rodapé na página, o
    ///    topo/pé contornam o cabeçalho/rodapé (distâncias w:header/w:footer), salvo
    ///    bordersDoNotSurroundHeader/Footer;
    ///  - single: sz/8 pt; double: 3 faixas (traço, vão, traço) de sz/8 pt;
    ///  - os lados horizontais vão de ponta a ponta da caixa (os cantos ficam cheios).
    /// </summary>
    internal static List<PageItem> PageBorderItems(DocContext ctx, PgBordersSpec pb, SectGeom g, bool surroundHeader, bool surroundFooter)
    {
        static bool On(BorderSpec? b) => b is not null && b.Val != "none" && b.Val != "nil";
        static double Lw(BorderSpec? b) => On(b) ? Math.Max(0.25, (b!.Sz ?? 4) / 8) * 20 : 0;
        static double Thick(BorderSpec? b) => On(b) && b!.Val == "double" ? 3 * Lw(b) : Lw(b);
        static double Sp(BorderSpec? b) => (b?.Space ?? 0) * 20;
        bool page = pb.OffsetFrom == "page";
        // faces externas da caixa
        double top = page ? Sp(pb.Top) : (surroundHeader ? g.Hdr : g.MarT) - Sp(pb.Top) - Thick(pb.Top);
        double bottom = page ? g.PageH - Sp(pb.Bottom) : g.PageH - (surroundFooter ? g.Ftr : g.MarB) + Sp(pb.Bottom) + Thick(pb.Bottom);
        double left = page ? Sp(pb.Left) : g.MarL - Sp(pb.Left) - Thick(pb.Left);
        double right = page ? g.PageW - Sp(pb.Right) : g.PageW - g.MarR + Sp(pb.Right) + Thick(pb.Right);
        var outp = new List<PageItem>();
        string Color(BorderSpec b) => Resolve.ResolveColor(b.Color, b.ThemeColor, b.ThemeTint, b.ThemeShade, ctx.Fmt.Theme) ?? "000000";
        // faixas (desde a face externa, para dentro) de uma borda
        static (double A, double Z)[] Bands(BorderSpec b) => b.Val == "double"
            ? new[] { (0.0, Lw(b)), (2 * Lw(b), 3 * Lw(b)) } : new[] { (0.0, Lw(b)) };
        if (On(pb.Top)) foreach (var (a, z) in Bands(pb.Top!)) outp.Add(new RectItem { X = left, Y = top + a, W = right - left, H = z - a, Fill = Color(pb.Top!) });
        if (On(pb.Bottom)) foreach (var (a, z) in Bands(pb.Bottom!)) outp.Add(new RectItem { X = left, Y = bottom - z, W = right - left, H = z - a, Fill = Color(pb.Bottom!) });
        if (On(pb.Left)) foreach (var (a, z) in Bands(pb.Left!)) outp.Add(new RectItem { X = left + a, Y = top, W = z - a, H = bottom - top, Fill = Color(pb.Left!) });
        if (On(pb.Right)) foreach (var (a, z) in Bands(pb.Right!)) outp.Add(new RectItem { X = right - z, Y = top, W = z - a, H = bottom - top, Fill = Color(pb.Right!) });
        return outp;
    }
}
