using System.Text;
using System.Text.Json;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Dump normalizado da árvore de layout — o MESMO formato de
/// tools/gen-parity-layout.mjs (normalizeLayout), usado pelos testes de
/// paridade JS × .NET: números arredondados a 0,01 (recorte e alfas a 0,0001),
/// -0 → 0, mesmas chaves. Só nomes de família e números (nunca bytes de fonte).
/// </summary>
public static class LayoutDump
{
    private static double R(double v, double k = 100)
    {
        double r = Js.Round(v * k) / k;
        return r == 0 ? 0 : r; // -0 → 0
    }

    private static void Num(Utf8JsonWriter w, string name, double v, double k = 100)
    {
        if (!double.IsFinite(v)) { w.WriteNull(name); return; }
        w.WriteNumber(name, R(v, k));
    }

    private static void NumV(Utf8JsonWriter w, double v, double k = 100)
    {
        if (!double.IsFinite(v)) { w.WriteNullValue(); return; }
        w.WriteNumberValue(R(v, k));
    }

    private static void OptR4(Utf8JsonWriter w, string name, double? v)
    {
        if (v is null) w.WriteNull(name);
        else Num(w, name, v.Value, 1e4);
    }

    private static void Stroke(Utf8JsonWriter w, StrokeSpec? s)
    {
        if (s is null) { w.WriteNull("stroke"); return; }
        w.WriteStartObject("stroke");
        w.WriteString("color", s.Color);
        Num(w, "width", s.WidthPt);
        if (s.Dash is null) w.WriteNull("dash"); else w.WriteString("dash", s.Dash);
        w.WriteEndObject();
    }

    private static void OptStr(Utf8JsonWriter w, string name, string? v)
    {
        if (v is null) w.WriteNull(name); else w.WriteString(name, v);
    }

    private static void OptR(Utf8JsonWriter w, string name, double? v)
    {
        if (v is null) w.WriteNull(name);
        else Num(w, name, v.Value);
    }

    private static void OptBool(Utf8JsonWriter w, string name, bool? v)
    {
        if (v is null) w.WriteNull(name); else w.WriteBoolean(name, v.Value);
    }

    private static void Shadow(Utf8JsonWriter w, PicShadowLook? s)
    {
        if (s is null) { w.WriteNull("shadow"); return; }
        w.WriteStartObject("shadow");
        w.WriteString("kind", s.Kind);
        w.WriteString("color", s.Color);
        Num(w, "alpha", s.Alpha, 1e4);
        Num(w, "blur", s.BlurPt);
        Num(w, "dist", s.DistPt);
        Num(w, "dir", s.DirDeg);
        OptR4(w, "sx", s.Sx);
        OptR4(w, "sy", s.Sy);
        OptR(w, "kx", s.KxDeg);
        OptR(w, "ky", s.KyDeg);
        OptStr(w, "algn", s.Algn);
        OptBool(w, "rotWithShape", s.RotWithShape);
        w.WriteEndObject();
    }

    private static void Glow(Utf8JsonWriter w, PicGlowLook? g)
    {
        if (g is null) { w.WriteNull("glow"); return; }
        w.WriteStartObject("glow");
        w.WriteString("color", g.Color);
        Num(w, "alpha", g.Alpha, 1e4);
        Num(w, "rad", g.RadPt);
        w.WriteEndObject();
    }

    private static void Reflection(Utf8JsonWriter w, PicReflectionLook? r)
    {
        if (r is null) { w.WriteNull("reflection"); return; }
        w.WriteStartObject("reflection");
        Num(w, "blur", r.BlurPt);
        Num(w, "stA", r.StA, 1e4);
        Num(w, "stPos", r.StPos, 1e4);
        Num(w, "endA", r.EndA, 1e4);
        Num(w, "endPos", r.EndPos, 1e4);
        Num(w, "dist", r.DistPt);
        Num(w, "dir", r.DirDeg);
        Num(w, "sy", r.Sy, 1e4);
        OptStr(w, "algn", r.Algn);
        OptBool(w, "rotWithShape", r.RotWithShape);
        w.WriteEndObject();
    }

    /// <summary>Formato da Imagem (PictureLook) — chaves fixas, null = ausente; frações a 0,0001.</summary>
    private static void Pic(Utf8JsonWriter w, PictureLook p)
    {
        w.WriteStartObject("pic");
        if (p.Geom is null) w.WriteNull("geom");
        else
        {
            w.WriteStartObject("geom");
            w.WriteString("prst", p.Geom.Prst);
            if (p.Geom.Adj is null) w.WriteNull("adj");
            else
            {
                w.WriteStartObject("adj");
                foreach (var (k, v) in p.Geom.Adj) Num(w, k, v);
                w.WriteEndObject();
            }
            w.WriteEndObject();
        }
        if (p.Line is not { } ln) w.WriteNull("line");
        else
        {
            w.WriteStartObject("line");
            w.WriteString("color", ln.Color);
            Num(w, "alpha", ln.Alpha, 1e4);
            Num(w, "width", ln.WidthPt);
            OptStr(w, "dash", ln.Dash);
            OptStr(w, "cmpd", ln.Cmpd);
            OptStr(w, "cap", ln.Cap);
            OptStr(w, "join", ln.Join);
            w.WriteEndObject();
        }
        Shadow(w, p.Shadow);
        Glow(w, p.Glow);
        OptR(w, "softEdge", p.SoftEdgePt);
        if (p.Bevel is not { } bv) w.WriteNull("bevel");
        else
        {
            w.WriteStartObject("bevel");
            Num(w, "w", bv.WPt);
            Num(w, "h", bv.HPt);
            OptStr(w, "prst", bv.Prst);
            OptStr(w, "rig", bv.Rig);
            OptStr(w, "dir", bv.Dir);
            OptStr(w, "material", bv.Material);
            w.WriteEndObject();
        }
        Reflection(w, p.Reflection);
        OptR4(w, "alpha", p.Alpha);
        if (p.Duotone is not { } du) w.WriteNull("duotone");
        else
        {
            w.WriteStartArray("duotone");
            w.WriteStringValue(du.A);
            w.WriteStringValue(du.B);
            w.WriteEndArray();
        }
        if (p.ClrChange is not { } cc) w.WriteNull("clrChange");
        else
        {
            w.WriteStartObject("clrChange");
            w.WriteString("from", cc.From);
            w.WriteString("to", cc.To);
            Num(w, "toAlpha", cc.ToAlpha, 1e4);
            w.WriteEndObject();
        }
        w.WriteEndObject();
    }

    private static void Item(Utf8JsonWriter w, PageItem it)
    {
        w.WriteStartObject();
        w.WriteString("t", it.T);
        switch (it)
        {
            case GlyphRunItem g:
                w.WriteString("family", g.Face.Family);
                w.WriteBoolean("bold", g.Face.Bold);
                w.WriteBoolean("italic", g.Face.Italic);
                w.WriteBoolean("synthBold", g.SynthBold);
                w.WriteBoolean("synthItalic", g.SynthItalic);
                Num(w, "size", g.SizePt);
                w.WriteString("color", g.Color);
                Num(w, "y", g.Y);
                Num(w, "scaleX", g.ScaleX ?? 1);
                w.WriteString("text", g.Text);
                w.WriteStartArray("g");
                foreach (var p in g.Glyphs)
                {
                    w.WriteStartArray();
                    w.WriteNumberValue(p.Cp);
                    NumV(w, p.X);
                    w.WriteEndArray();
                }
                w.WriteEndArray();
                break;
            case RectItem r:
                Num(w, "x", r.X); Num(w, "y", r.Y); Num(w, "w", r.W); Num(w, "h", r.H);
                w.WriteString("fill", r.Fill);
                OptR4(w, "alpha", r.Alpha);
                break;
            case LineItem l:
                Num(w, "x1", l.X1); Num(w, "y1", l.Y1); Num(w, "x2", l.X2); Num(w, "y2", l.Y2);
                w.WriteString("color", l.Color);
                Num(w, "width", l.WidthPt);
                if (l.Dash is null) w.WriteNull("dash"); else w.WriteString("dash", l.Dash);
                break;
            case ImageItem im:
                Num(w, "x", im.X); Num(w, "y", im.Y); Num(w, "w", im.W); Num(w, "h", im.H);
                w.WriteString("ext", im.Image.Ext);
                w.WriteNumber("bytes", im.Image.Data.Length);
                if (im.Crop is null) w.WriteNull("crop");
                else
                {
                    w.WriteStartArray("crop");
                    NumV(w, im.Crop.L, 1e4); NumV(w, im.Crop.T, 1e4); NumV(w, im.Crop.R, 1e4); NumV(w, im.Crop.B, 1e4);
                    w.WriteEndArray();
                }
                Num(w, "rot", im.Rot ?? 0);
                w.WriteBoolean("flipH", im.FlipH);
                w.WriteBoolean("flipV", im.FlipV);
                if (im.Pic is not null) Pic(w, im.Pic);
                break;
            case ShapeItem sh:
                Num(w, "x", sh.X); Num(w, "y", sh.Y); Num(w, "w", sh.W); Num(w, "h", sh.H);
                w.WriteString("geom", sh.Style.Geom);
                Num(w, "rot", sh.Style.Rot ?? 0);
                w.WriteBoolean("flipH", sh.Style.FlipH == true);
                w.WriteBoolean("flipV", sh.Style.FlipV == true);
                OptR4(w, "fillAlpha", sh.Style.FillAlpha);
                OptR4(w, "lineAlpha", sh.Style.Line?.Alpha);
                if (sh.Fill is null) w.WriteNull("fill"); else w.WriteString("fill", sh.Fill);
                Stroke(w, sh.Stroke);
                if (sh.Line is null) w.WriteNull("line");
                else
                {
                    w.WriteStartArray("line");
                    NumV(w, sh.Line.X1); NumV(w, sh.Line.Y1); NumV(w, sh.Line.X2); NumV(w, sh.Line.Y2);
                    w.WriteEndArray();
                }
                // padrão (a:pattFill) e imagem/textura (a:blipFill): só nos itens que os têm
                if (sh.Pattern is { } pt)
                {
                    w.WriteStartObject("pattern");
                    w.WriteString("prst", pt.Prst);
                    w.WriteString("fg", pt.Fg);
                    w.WriteString("bg", pt.Bg);
                    w.WriteEndObject();
                }
                if (sh.Blip is { } bl)
                {
                    w.WriteStartObject("blip");
                    w.WriteString("ext", bl.Image.Ext);
                    w.WriteNumber("bytes", bl.Image.Data.Length);
                    if (bl.Tile is not { } tl) w.WriteNull("tile");
                    else
                    {
                        w.WriteStartObject("tile");
                        Num(w, "tx", tl.Tx); Num(w, "ty", tl.Ty); Num(w, "sx", tl.Sx); Num(w, "sy", tl.Sy);
                        w.WriteString("algn", tl.Algn);
                        w.WriteString("flip", tl.Flip);
                        w.WriteEndObject();
                    }
                    OptR4(w, "alpha", bl.Alpha);
                    w.WriteEndObject();
                }
                // Efeitos de Forma: só nos itens que os têm (chaves fixas, null = ausente)
                if (sh.Fx is { } fx)
                {
                    w.WriteStartObject("fx");
                    Shadow(w, fx.Shadow);
                    Glow(w, fx.Glow);
                    OptR(w, "softEdge", fx.SoftEdgePt);
                    Reflection(w, fx.Reflection);
                    w.WriteEndObject();
                }
                break;
            case PathItem pa:
                w.WriteStartArray("cmds");
                foreach (var c in pa.Cmds)
                {
                    w.WriteStartArray();
                    w.WriteStringValue(c.Op.ToString());
                    if (c.Op is 'M' or 'L') { NumV(w, c.X); NumV(w, c.Y); }
                    else if (c.Op == 'C') { NumV(w, c.X1); NumV(w, c.Y1); NumV(w, c.X2); NumV(w, c.Y2); NumV(w, c.X); NumV(w, c.Y); }
                    w.WriteEndArray();
                }
                w.WriteEndArray();
                if (pa.Fill is null) w.WriteNull("fill"); else w.WriteString("fill", pa.Fill);
                Stroke(w, pa.Stroke);
                w.WriteBoolean("evenOdd", pa.EvenOdd);
                break;
            case XformItem xi:
                // transformação afim (giro de caixa, escala do WordArt/marca-d'água)
                w.WriteString("op", xi.Op == "pop" ? "pop" : "push");
                if (xi.Op != "pop")
                {
                    w.WriteStartArray("m");
                    var mm = xi.M ?? Array.Empty<double>();
                    for (int i = 0; i < mm.Length; i++) NumV(w, mm[i], i < 4 ? 10000 : 100);
                    w.WriteEndArray();
                }
                break;
            case ClipItem ci:
                w.WriteString("op", ci.Op == "pop" ? "pop" : "push");
                if (ci.Op != "pop")
                {
                    Num(w, "x", ci.X ?? 0); Num(w, "y", ci.Y ?? 0); Num(w, "w", ci.W ?? 0); Num(w, "h", ci.H ?? 0);
                }
                break;
        }
        w.WriteEndObject();
    }

    /// <summary>JSON compacto do dump (estrutura de normalizeLayout).</summary>
    public static string Normalize(LayoutResult res)
    {
        using var ms = new MemoryStream();
        using (var w = new Utf8JsonWriter(ms, new JsonWriterOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping }))
        {
            w.WriteStartObject();
            w.WriteStartArray("pages");
            foreach (var p in res.Pages)
            {
                w.WriteStartObject();
                Num(w, "w", p.WidthTw);
                Num(w, "h", p.HeightTw);
                w.WriteNumber("section", p.Section);
                Num(w, "number", p.Number, 1);
                w.WriteStartArray("items");
                foreach (var it in p.Items) Item(w, it);
                w.WriteEndArray();
                w.WriteStartArray("lines");
                foreach (var l in p.Lines)
                {
                    w.WriteStartObject();
                    w.WriteString("ref", l.Ref);
                    Num(w, "start", l.Start); Num(w, "end", l.End);
                    Num(w, "x", l.X); Num(w, "y", l.Y); Num(w, "height", l.Height);
                    Num(w, "baseline", l.Baseline); Num(w, "width", l.Width);
                    w.WriteEndObject();
                }
                w.WriteEndArray();
                // Cor da Página (frente Página): cor, se a tela mostra e o efeito resolvido — só quando há
                if (p.Background is not null || p.BackgroundFill is not null)
                {
                    w.WriteStartObject("bg");
                    if (p.Background is null) w.WriteNull("color"); else w.WriteString("color", p.Background);
                    w.WriteBoolean("show", p.BackgroundShow);
                    if (p.BackgroundFill is not { } f) w.WriteNull("fill");
                    else
                    {
                        w.WriteStartObject("fill");
                        w.WriteString("type", f.Type); w.WriteString("c1", f.C1); w.WriteString("c2", f.C2);
                        Num(w, "angle", f.Angle); Num(w, "focus", f.Focus);
                        if (f.FocusPosition is { } fp) { w.WriteStartArray("fp"); NumV(w, fp.X); NumV(w, fp.Y); w.WriteEndArray(); } else w.WriteNull("fp");
                        w.WriteBoolean("center", f.GradientCenter);
                        if (f.Stops is { } st)
                        {
                            w.WriteStartArray("stops");
                            foreach (var (pos, col) in st) { w.WriteStartArray(); NumV(w, pos, 10000); w.WriteStringValue(col); w.WriteEndArray(); }
                            w.WriteEndArray();
                        }
                        else w.WriteNull("stops");
                        if (f.Pattern is { } pat) { w.WriteStartArray("pattern"); foreach (int b in pat) w.WriteNumberValue(b); w.WriteEndArray(); } else w.WriteNull("pattern");
                        if (f.ImagePx is { } ip) { w.WriteStartArray("img"); w.WriteNumberValue(ip.W); w.WriteNumberValue(ip.H); w.WriteNumberValue(ip.Dpi); w.WriteEndArray(); } else w.WriteNull("img");
                        w.WriteEndObject();
                    }
                    w.WriteEndObject();
                }
                w.WriteEndObject();
            }
            w.WriteEndArray();
            w.WriteStartArray("warnings");
            foreach (var s in res.Warnings) w.WriteStringValue(s);
            w.WriteEndArray();
            w.WriteEndObject();
        }
        return Encoding.UTF8.GetString(ms.ToArray());
    }
}
