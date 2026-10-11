using System.Text;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>Linha de texto → itens de desenho (glifos agrupados, sublinhados,
/// realces) — porta de docx-layout/src/paint.ts.</summary>
public static class Paint
{
    public static void PaintLine(DocContext ctx, List<PageItem> outp, Line line, double frameX, double top)
    {
        double baseY = top + line.Baseline;
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
            if (g.Kind != GlyphKind.Char && g.Kind != GlyphKind.Nbsp && !(g.Kind == GlyphKind.Shy && pg.W > 0))
            {
                if (g.Kind == GlyphKind.Space) continue;
                Flush();
                if (g.Kind == GlyphKind.Tab && pg.Leader is not null) PaintLeader(ctx, outp, pg, frameX, baseY);
                if (g.Kind == GlyphKind.Obj && g.Obj is not null && g.Adv > 0) PaintInlineObject(ctx, outp, g, frameX + pg.X, baseY);
                if (g.Kind == GlyphKind.Box && g.Box is not null) PaintCheckBox(outp, g, frameX + pg.X, baseY);
                continue;
            }
            var st = g.Style;
            string key = $"{g.Face.Key}|{(g.Face.SynthBold ? 1 : 0)}{(g.Face.SynthItalic ? 1 : 0)}|{Js.Str(g.SizePt)}|{st.Color}|{Js.Str(st.Shift)}|{Js.Str(st.Rpr.W ?? 100)}|{Js.Str(st.Alpha ?? 1)}";
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

    private static void PaintLeader(DocContext ctx, List<PageItem> outp, PlacedGlyph pg, double frameX, double baseY)
    {
        if (pg.W <= 0) return;
        var g = pg.G;
        string ch = pg.Leader == "hyphen" ? "-" : pg.Leader == "underscore" ? "_" : pg.Leader == "middleDot" ? "·" : ".";
        int cp = ch[0];
        var face = g.Face;
        var f = face.Font;
        double adv = (f.AdvanceWidth(f.GlyphId(cp)) * g.SizePt * 20) / f.Metrics.UnitsPerEm;
        if (adv <= 0) return;
        var run = new GlyphRunItem { Face = face, SizePt = g.SizePt, Color = g.Style.Color, Y = baseY };
        var sb = new StringBuilder();
        // Word alinha os pontos numa grade absoluta e deixa um respiro antes do texto
        double x0 = frameX + pg.X, x1 = frameX + pg.X + pg.W - adv * 0.5;
        double x = Math.Ceiling(x0 / adv) * adv;
        while (x + adv <= x1) { run.Glyphs.Add(new GlyphPos(cp, x)); sb.Append(ch); x += adv; }
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

    private static void PaintInlineObject(DocContext ctx, List<PageItem> outp, Glyph g, double x, double baseY)
    {
        var obj = g.Obj!;
        double shift = g.Style.Shift;
        if (obj.Image is not null && Emf.IsEmf(obj.Image.Data))
        {
            var im = obj.Image;
            double ry = baseY - shift - im.HeightTwips;
            outp.Add(ClipItem.Push(x, ry, im.WidthTwips, im.HeightTwips));
            outp.AddRange(Emf.RenderEmf(ctx, im.Data, x, ry, im.WidthTwips, im.HeightTwips));
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

    /// <summary>Espessura desenhada (twips) de uma borda OOXML (w:sz em 1/8 pt).</summary>
    public static double BorderWidth(BorderSpec? b)
    {
        if (b is null || b.Val is "none" or "nil") return 0;
        double pt = Math.Max(0.25, (b.Sz ?? 4) / 8);
        if (b.Val == "double") return pt * 3 * 20;
        if (b.Val is "thinThickSmallGap" or "thickThinSmallGap") return pt * 20 + 40;
        return pt * 20;
    }

    /// <summary>Desenha uma borda horizontal/vertical como linha(s).</summary>
    public static void PaintBorder(DocContext ctx, List<PageItem> outp, BorderSpec? b, double x1, double y1, double x2, double y2)
    {
        if (b is null || b.Val is "none" or "nil") return;
        string color = Resolve.ResolveColor(b.Color, b.ThemeColor, b.ThemeTint, b.ThemeShade, ctx.Fmt.Theme) ?? "000000";
        double pt = Math.Max(0.25, (b.Sz ?? 4) / 8);
        string? dash = b.Val == "dotted" ? "dotted" : b.Val is "dashed" or "dashSmallGap" ? "dashed"
            : b.Val == "dotDash" ? "dashDot" : b.Val == "dotDotDash" ? "dashDotDot" : null;
        if (b.Val == "double")
        {
            bool horizontal = Math.Abs(y2 - y1) < Math.Abs(x2 - x1);
            double off = pt * 20; // 1 traço + 1 vão
            if (horizontal)
            {
                outp.Add(new LineItem { X1 = x1, Y1 = y1 - off, X2 = x2, Y2 = y2 - off, Color = color, WidthPt = pt });
                outp.Add(new LineItem { X1 = x1, Y1 = y1 + off, X2 = x2, Y2 = y2 + off, Color = color, WidthPt = pt });
            }
            else
            {
                outp.Add(new LineItem { X1 = x1 - off, Y1 = y1, X2 = x2 - off, Y2 = y2, Color = color, WidthPt = pt });
                outp.Add(new LineItem { X1 = x1 + off, Y1 = y1, X2 = x2 + off, Y2 = y2, Color = color, WidthPt = pt });
            }
            return;
        }
        outp.Add(new LineItem { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2, Color = color, WidthPt = pt, Dash = dash });
    }

    /// <summary>Caixa de bordas/sombreamento de um bloco de parágrafos com bordas iguais.</summary>
    public static void PaintParaBox(
        DocContext ctx, List<PageItem> outp, PreparedPara p, PBdr? pBdr,
        double left, double right, double top, double bottom, bool drawTop, bool drawBottom,
        /* parágrafo do meio de um grupo: desenha a borda "between" no topo (após o espaço) */
        bool between = false)
    {
        var shd = p.Ppr.Shd;
        string? fill = Js.Truthy(shd?.Fill) && shd!.Fill != "auto" ? shd.Fill
            : Js.Truthy(shd?.ThemeFill) ? Resolve.ResolveColor(null, shd!.ThemeFill, shd.ThemeFillTint, shd.ThemeFillShade, ctx.Fmt.Theme) : null;
        var bl = pBdr?.Left;
        var br = pBdr?.Right;
        double padL = bl is not null && bl.Val != "none" && bl.Val != "nil" ? (bl.Space ?? 0) * 20 : 0;
        double padR = br is not null && br.Val != "none" && br.Val != "nil" ? (br.Space ?? 0) * 20 : 0;
        if (fill is not null) outp.Add(new RectItem { X = left - padL, Y = top, W = right - left + padL + padR, H = bottom - top, Fill = fill });
        if (pBdr is null) return;
        if (drawTop) PaintBorder(ctx, outp, pBdr.Top, left - padL - BorderWidth(bl) / 2, top, right + padR + BorderWidth(br) / 2, top);
        var btw = pBdr.Between;
        if (between && btw is not null && btw.Val != "none" && btw.Val != "nil")
        {
            double yb = top + (btw.Space ?? 0) * 20 + BorderWidth(btw) / 2;
            PaintBorder(ctx, outp, btw, left - padL - BorderWidth(bl) / 2, yb, right + padR + BorderWidth(br) / 2, yb);
        }
        if (drawBottom) PaintBorder(ctx, outp, pBdr.Bottom, left - padL - BorderWidth(bl) / 2, bottom, right + padR + BorderWidth(br) / 2, bottom);
        PaintBorder(ctx, outp, bl, left - padL - BorderWidth(bl) / 2, top, left - padL - BorderWidth(bl) / 2, bottom);
        PaintBorder(ctx, outp, br, right + padR + BorderWidth(br) / 2, top, right + padR + BorderWidth(br) / 2, bottom);
    }
}
