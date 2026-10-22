using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Geometria/posicionamento de objetos de desenho (DrawingML wp:anchor e VML
/// position:absolute) normalizados para TWIPS — porta de docx-core/src/drawing.ts.
/// </summary>
public sealed class AnchorPos
{
    /// <summary>page | margin | column | character | paragraph | line | leftMargin |
    /// rightMargin | insideMargin | outsideMargin | topMargin | bottomMargin</summary>
    public string RelativeFrom = "column";
    /// <summary>left | center | right | inside | outside | top | bottom</summary>
    public string? Align;
    /// <summary>deslocamento em twips (posOffset).</summary>
    public double? Offset;
    /// <summary>wp14:pctPosHOffset/pctPosVOffset (milésimos de %).</summary>
    public double? Pct;
}

public sealed class PointTw
{
    public double X;
    public double Y;
}

public sealed class RectTw
{
    public double L;
    public double T;
    public double R;
    public double B;
}

public sealed class DrawingAnchor
{
    /// <summary>inline | none | square | tight | through | topAndBottom</summary>
    public string Wrap = "none";
    /// <summary>bothSides | left | right | largest</summary>
    public string? WrapText;
    public bool? BehindDoc;
    /// <summary>distâncias do texto (twips).</summary>
    public double? DistT;
    public double? DistB;
    public double? DistL;
    public double? DistR;
    /// <summary>wp:simplePos (twips, relativo à página) quando simplePos="1".</summary>
    public PointTw? SimplePos;
    public AnchorPos PosH = new();
    public AnchorPos PosV = new() { RelativeFrom = "paragraph" };
    public double? RelativeHeight;
    public bool? LayoutInCell;
    public bool? AllowOverlap;
    /// <summary>wp:effectExtent (twips) — sombra/brilho fora do extent.</summary>
    public RectTw? EffectExtent;
    /// <summary>contorno justo/através: caixa do wp:wrapPolygon em frações (0..1) do extent —
    /// o texto contorna ela, não a figura inteira (oráculo wrappoly). L=x0, T=y0, R=x1, B=y1.</summary>
    public RectTw? WrapBox;
    /// <summary>o wp:wrapPolygon quando NÃO é um retângulo (frações 0..1 do extent): o texto
    /// segue o contorno linha a linha (oráculo wrapcontour)</summary>
    public List<(double X, double Y)>? WrapPoly;
}

public sealed class ShapeLine
{
    public string Color = "000000";
    public double WidthPt;
    public string? Dash;
    public double? Alpha;
    /// <summary>linha do estilo (lnRef sem a:ln@w): índice da linha do tema</summary>
    public int? Ref;
}

/// <summary>espessura do contorno PARA O RECUO do texto da caixa, mesmo sem preenchimento da linha:
/// W = a:ln@w (pt); Ref = índice do lnRef (largura do tema) — oráculo txbxln</summary>
public sealed class LineInset
{
    public double? W;
    public int? Ref;
}

public sealed class ShapeGradient
{
    public string From = "";
    public string To = "";
    public double AngleDeg;
    /// <summary>todas as paradas (pos 0..1), em ordem</summary>
    public List<GradStop>? Stops;
    /// <summary>a:lin scaled</summary>
    public bool? Scaled;
    public bool? RotWithShape;
    /// <summary>a:path (circle/rect/shape)</summary>
    public string? Path;
    /// <summary>a:fillToRect (frações)</summary>
    public RectTw? FillTo;
}

/// <summary>Parada de degradê: posição (0..1) e cor (RRGGBB, "@tema" ou com "|mods").</summary>
public sealed class GradStop
{
    public double Pos;
    public string Color = "000000";
}

/// <summary>Sombra externa (a:outerShdw): deslocamento (twips), cor, opacidade, desfoque (twips).</summary>
public sealed class ShapeShadow
{
    public double Dx;
    public double Dy;
    public string Color = "000000";
    public double? Alpha;
    public double? Blur;
}

/// <summary>Comando de um caminho de a:custGeom já em números (unidades do caminho; ângulos em graus).
/// Op: M | L (X, Y) · C | Q (Pts) · A (WR, HR, St, Sw) · Z.</summary>
public sealed class CustCmd
{
    public char Op;
    public double X, Y;
    public List<(double X, double Y)>? Pts;
    public double WR, HR, St, Sw;
}

/// <summary>Caminho de a:custGeom: espaço próprio (W × H; sem w/h = o da forma em EMU), preenche/contorna.</summary>
public sealed class CustPath
{
    public double W;
    public double H;
    public bool Fill;
    public bool Stroke;
    public List<CustCmd> Cmds = new();
}

/// <summary>Aparência de uma forma (preenchimento/contorno).</summary>
public sealed class ShapeStyle
{
    /// <summary>preset geometry (rect, roundRect, ellipse, line, …) ou 'custom'.</summary>
    public string Geom = "rect";
    /// <summary>RRGGBB (pode trazer "|mods" ou "@tema"); nulo = sem preenchimento.</summary>
    public string? Fill;
    public double? FillAlpha;
    /// <summary>contorno; nulo = sem linha.</summary>
    public ShapeLine? Line;
    /// <summary>graus, horário.</summary>
    public double? Rot;
    public bool? FlipH;
    public bool? FlipV;
    /// <summary>gradiente (a:gradFill): 1ª e última paradas + todas as paradas (pos 0..1),
    /// a:lin (ângulo, scaled), rotWithShape e a:path (circle/rect/shape + fillToRect)</summary>
    public ShapeGradient? Gradient;
    /// <summary>a:custGeom: caminhos já numéricos</summary>
    public List<CustPath>? Cust;
    /// <summary>ajustes da geometria predefinida (a:avLst: nome → valor de "val N"), na ordem do arquivo</summary>
    public Dictionary<string, double>? Adj;
    /// <summary>sombra externa (a:outerShdw)</summary>
    public ShapeShadow? Shadow;
    /// <summary>espessura do contorno para o recuo do texto da caixa (oráculo txbxln)</summary>
    public LineInset? LineInset;
    /// <summary>padrão (a:pattFill): predefinição e cores de frente/fundo (RRGGBB ou @esquema|mods)</summary>
    public ShapePattern? Pattern;
    /// <summary>imagem (a:blipFill): esticada (Imagem) ou em mosaico (Textura: a:tile em EMU e 1/1000 %)</summary>
    public ShapeBlip? Blip;
    /// <summary>wps:style/a:fillRef sem preenchimento no spPr: idx 2..3 (e 1002…) = estilo de
    /// preenchimento do tema com a cor (phClr) — Estilos de Forma (oráculo textbox-lab style-*)</summary>
    public StyleRef? FillRef;
    /// <summary>wps:style/a:effectRef idx ≥ 1 (efeito do tema) com a cor</summary>
    public StyleRef? EffectRef;

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public ShapeStyle ShallowClone() => (ShapeStyle)MemberwiseClone();
}

/// <summary>Padrão (a:pattFill): predefinição e cores de frente/fundo (RRGGBB ou @esquema|mods).</summary>
public sealed class ShapePattern
{
    public string Prst = "pct5";
    public string Fg = "000000";
    public string Bg = "FFFFFF";

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public ShapePattern ShallowClone() => (ShapePattern)MemberwiseClone();
}

/// <summary>Imagem do a:blipFill: os bytes (Data/Ext de <see cref="InlineImage"/>), o mosaico
/// (a:tile) e a opacidade (a:alphaModFix).</summary>
public sealed class ShapeBlip
{
    public InlineImage Image = new();
    public BlipTile? Tile;
    public double? Alpha;
}

/// <summary>a:tile: deslocamento tx/ty (EMU), escala sx/sy (1/1000 %), alinhamento e espelho.</summary>
public sealed class BlipTile
{
    public double Tx;
    public double Ty;
    public double Sx = 100000;
    public double Sy = 100000;
    public string Algn = "tl";
    public string Flip = "none";
}

/// <summary>Referência a um estilo do tema (a:fillRef / a:effectRef): índice e a cor (phClr).</summary>
public sealed class StyleRef
{
    public int Idx;
    public string Color = "";
}

public static class DrawingReader
{
    public const double EmuPerTwipD = 635;

    private static double? EmuTw(string? v)
    {
        if (v is null || v == "") return null;
        double n = Js.ParseInt(v);
        return double.IsFinite(n) ? n / EmuPerTwipD : null;
    }

    public static XmlElement? FindDeep(XmlElement el, string name)
    {
        foreach (var c in ChildElements(el))
        {
            if (c.Name == name) return c;
            var f = FindDeep(c, name);
            if (f is not null) return f;
        }
        return null;
    }

    public static string TextOf(XmlElement el) => TextContent(el);

    private static AnchorPos ReadPos(XmlElement? el, string defFrom)
    {
        var pos = new AnchorPos { RelativeFrom = el?.Attr("relativeFrom") ?? defFrom };
        if (el is null) return pos;
        var align = FirstChild(el, "wp:align");
        if (align is not null) pos.Align = TextOf(align).Trim();
        var off = FirstChild(el, "wp:posOffset");
        if (off is not null) pos.Offset = Js.IntOr0(TextOf(off).Trim()) / EmuPerTwipD;
        var pct = FirstChild(el, "wp14:pctPosHOffset") ?? FirstChild(el, "wp14:pctPosVOffset");
        if (pct is not null) pos.Pct = Js.IntOr0(TextOf(pct).Trim());
        return pos;
    }

    /// <summary>
    /// Filho <paramref name="name"/> do wp:anchor, direto ou dentro de mc:AlternateContent
    /// (mc:Choice, senão mc:Fallback) — o Word grava a posição em % assim (wp14:pctPos…
    /// no Choice, a absoluta no Fallback). Porta de anchorChild (drawing.ts).
    /// </summary>
    public static XmlElement? AnchorChild(XmlElement anchor, string name)
    {
        var direct = FirstChild(anchor, name);
        if (direct is not null) return direct;
        foreach (var ac in ChildElements(anchor, "mc:AlternateContent"))
        {
            var choice = FirstChild(ac, "mc:Choice");
            var el = choice is not null ? FirstChild(choice, name) : null;
            if (el is null)
            {
                var fb = FirstChild(ac, "mc:Fallback");
                el = fb is not null ? FirstChild(fb, name) : null;
            }
            if (el is not null) return el;
        }
        return null;
    }

    /// <summary>Âncora de um wp:anchor (nulo para wp:inline).</summary>
    public static DrawingAnchor? ReadWpAnchor(XmlElement? anchor)
    {
        if (anchor is null) return null;
        string wrap = "none";
        string? wrapText = null;
        RectTw? wrapBox = null;
        List<(double X, double Y)>? wrapPoly = null;
        RectTw? PolyBox(XmlElement w)
        {
            var poly = FirstChild(w, "wp:wrapPolygon");
            if (poly is null) return null;
            static double N(string? v) { double n = Js.ParseInt(v ?? "0"); return double.IsNaN(n) ? 0 : n; }
            var pts = ChildElements(poly).Where(e => e.Name is "wp:start" or "wp:lineTo").Select(e => (X: N(e.Attr("x")), Y: N(e.Attr("y")))).ToList();
            if (pts.Count < 3) return null;
            double x0 = pts.Min(q => q.X), y0 = pts.Min(q => q.Y), x1 = pts.Max(q => q.X), y1 = pts.Max(q => q.Y);
            // retângulo (área = a da caixa): vale a caixa; senão, o contorno
            double area = 0;
            for (int i = 0; i < pts.Count; i++) { var a = pts[i]; var b = pts[(i + 1) % pts.Count]; area += a.X * b.Y - b.X * a.Y; }
            if (Math.Abs(Math.Abs(area) / 2 - (x1 - x0) * (y1 - y0)) > 1e-6 * 21600 * 21600) wrapPoly = pts.Select(q => (q.X / 21600, q.Y / 21600)).ToList();
            return new RectTw { L = x0 / 21600, T = y0 / 21600, R = x1 / 21600, B = y1 / 21600 };
        }
        foreach (var c in ChildElements(anchor))
        {
            switch (c.Name)
            {
                case "wp:wrapNone": wrap = "none"; break;
                case "wp:wrapSquare": wrap = "square"; wrapText = c.Attr("wrapText"); break;
                case "wp:wrapTight": wrap = "tight"; wrapText = c.Attr("wrapText"); wrapBox = PolyBox(c); break;
                case "wp:wrapThrough": wrap = "through"; wrapText = c.Attr("wrapText"); wrapBox = PolyBox(c); break;
                case "wp:wrapTopAndBottom": wrap = "topAndBottom"; break;
            }
        }
        var outp = new DrawingAnchor
        {
            Wrap = wrap,
            PosH = ReadPos(AnchorChild(anchor, "wp:positionH"), "column"),
            PosV = ReadPos(AnchorChild(anchor, "wp:positionV"), "paragraph"),
        };
        if (Js.Truthy(wrapText)) outp.WrapText = wrapText;
        if (anchor.Attr("behindDoc") is "1" or "true") outp.BehindDoc = true;
        outp.DistT = EmuTw(anchor.Attr("distT"));
        outp.DistB = EmuTw(anchor.Attr("distB"));
        outp.DistL = EmuTw(anchor.Attr("distL"));
        outp.DistR = EmuTw(anchor.Attr("distR"));
        if (anchor.Attr("simplePos") is "1" or "true")
        {
            var sp = FirstChild(anchor, "wp:simplePos");
            outp.SimplePos = new PointTw { X = EmuTw(sp?.Attr("x")) ?? 0, Y = EmuTw(sp?.Attr("y")) ?? 0 };
        }
        if (Js.Truthy(anchor.Attr("relativeHeight"))) outp.RelativeHeight = Js.IntOr0(anchor.Attr("relativeHeight"));
        if (anchor.Attr("layoutInCell") is { } lic) outp.LayoutInCell = lic is "1" or "true";
        if (anchor.Attr("allowOverlap") is { } ao) outp.AllowOverlap = ao is "1" or "true";
        var ee = FirstChild(anchor, "wp:effectExtent");
        if (ee is not null)
        {
            outp.EffectExtent = new RectTw
            {
                L = EmuTw(ee.Attr("l")) ?? 0, T = EmuTw(ee.Attr("t")) ?? 0,
                R = EmuTw(ee.Attr("r")) ?? 0, B = EmuTw(ee.Attr("b")) ?? 0,
            };
        }
        if (wrapBox is not null) outp.WrapBox = wrapBox;
        if (wrapPoly is not null && wrap is "tight" or "through") outp.WrapPoly = wrapPoly;
        return outp;
    }

    private static readonly Dictionary<string, string> SchemeMap = new(StringComparer.Ordinal)
        { ["tx1"] = "dk1", ["bg1"] = "lt1", ["tx2"] = "dk2", ["bg2"] = "lt2" };
    private static readonly Dictionary<string, string> NamedPrst = new(StringComparer.Ordinal)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "00FF00",
        ["blue"] = "0000FF", ["yellow"] = "FFFF00", ["gray"] = "808080",
    };

    private static (string Hex, double? Alpha)? SrgbOf(XmlElement? el, Dictionary<string, string>? theme = null)
    {
        if (el is null) return null;
        var c = FirstChild(el, "a:srgbClr") ?? FirstChild(el, "a:schemeClr") ?? FirstChild(el, "a:sysClr") ?? FirstChild(el, "a:prstClr");
        if (c is null) return null;
        string? hex = null;
        if (c.Name == "a:srgbClr") hex = c.Attr("val");
        else if (c.Name == "a:sysClr") hex = c.Attr("lastClr") ?? (c.Attr("val") == "window" ? "FFFFFF" : "000000");
        else if (c.Name == "a:schemeClr")
        {
            string key = c.Attr("val") ?? "";
            string mk = SchemeMap.TryGetValue(key, out var m) ? m : key;
            hex = theme is not null && theme.TryGetValue(mk, out var th) ? th : "@" + key;
        }
        else if (c.Name == "a:prstClr")
            hex = NamedPrst.TryGetValue(c.Attr("val") ?? "", out var nh) ? nh : "000000";
        if (!Js.Truthy(hex)) return null;
        var alphaEl = FirstChild(c, "a:alpha");
        // referência de tema (@tx1, @accent1…) fica como está — o motor resolve pelo nome
        string outHex = hex!.StartsWith('@') ? hex : Js.ToUpper(hex);
        double? alpha = null;
        if (alphaEl is not null) alpha = Js.IntOr0(alphaEl.Attr("val") ?? "100000") / 100000;
        // lumMod/lumOff/tint/shade ficam com o motor (precisa do tema); registramos cru
        var mods = ChildElements(c).Where(m => m.Name != "a:alpha")
            .Select(m => $"{(m.Name.Length > 2 ? m.Name[2..] : "")}={m.Attr("val") ?? "undefined"}").ToList();
        if (mods.Count > 0) outHex = $"{outHex}|{string.Join(",", mods)}";
        return (outHex, alpha);
    }

    /// <summary>Estilo de forma de um wps:spPr / pic:spPr (preenchimento, contorno, geometria).</summary>
    public static ShapeStyle ReadSpPr(XmlElement? spPr, XmlElement? styleEl = null)
    {
        var st = new ShapeStyle { Geom = "rect" };
        if (spPr is null) return st;
        var prstEl = FirstChild(spPr, "a:prstGeom");
        string? prst = prstEl?.Attr("prst");
        if (Js.Truthy(prst)) st.Geom = prst!;
        var av = prstEl is not null ? FirstChild(prstEl, "a:avLst") : null;
        if (av is not null)
        {
            foreach (var gd in ChildElements(av, "a:gd"))
            {
                var m = AdjValRe.Match(gd.Attr("fmla") ?? "");
                string? gname = gd.Attr("name");
                if (m.Success && Js.Truthy(gname)) (st.Adj ??= new Dictionary<string, double>(StringComparer.Ordinal))[gname!] = Js.ParseInt(m.Groups[1].Value);
            }
        }
        var cg = !Js.Truthy(prst) ? FirstChild(spPr, "a:custGeom") : null;
        if (cg is not null)
        {
            st.Geom = "custom";
            var cext = FirstChild(FirstChild(spPr, "a:xfrm") ?? spPr, "a:ext");
            var paths = ReadCustGeom(cg, Js.IntOr0(cext?.Attr("cx") ?? "0"), Js.IntOr0(cext?.Attr("cy") ?? "0"));
            if (paths.Count > 0) st.Cust = paths;
        }
        var xfrm = FirstChild(spPr, "a:xfrm");
        if (xfrm is not null)
        {
            double rot = Js.ParseInt(xfrm.Attr("rot") ?? "0");
            if (rot != 0 && !double.IsNaN(rot)) st.Rot = rot / 60000;
            if (xfrm.Attr("flipH") == "1") st.FlipH = true;
            if (xfrm.Attr("flipV") == "1") st.FlipV = true;
        }
        if (FirstChild(spPr, "a:noFill") is not null) { /* sem preenchimento */ }
        else if (FirstChild(spPr, "a:solidFill") is not null)
        {
            var c = SrgbOf(FirstChild(spPr, "a:solidFill"));
            if (c is { } cc) { st.Fill = cc.Hex; if (cc.Alpha is not null) st.FillAlpha = cc.Alpha; }
        }
        else if (FirstChild(spPr, "a:gradFill") is { } grad)
        {
            var gs = FindDeep(grad, "a:gsLst");
            var stops = gs is not null ? ChildElements(gs, "a:gs").ToList() : new List<XmlElement>();
            var from = stops.Count > 0 ? SrgbOf(stops[0]) : null;
            var to = stops.Count > 0 ? SrgbOf(stops[^1]) : null;
            var lin = FindDeep(grad, "a:lin");
            if (from is not null && to is not null)
            {
                st.Gradient = new ShapeGradient { From = from.Value.Hex, To = to.Value.Hex, AngleDeg = Js.IntOr0(lin?.Attr("ang") ?? "0") / 60000 };
                var g = st.Gradient;
                // (ordenação estável por posição, como o sort do JS)
                g.Stops = stops.Select(s => new GradStop { Pos = Js.IntOr0(s.Attr("pos") ?? "0") / 100000, Color = SrgbOf(s)?.Hex ?? "000000" })
                    .OrderBy(s => s.Pos).ToList();
                if (lin?.Attr("scaled") is { } sc) g.Scaled = sc is "1" or "true";
                if (grad.Attr("rotWithShape") is { } rws) g.RotWithShape = rws is "1" or "true";
                var path = FirstChild(grad, "a:path");
                if (path is not null)
                {
                    g.Path = path.Attr("path") ?? "circle";
                    var ft = FirstChild(path, "a:fillToRect");
                    double F(string k) => Js.IntOr0(ft?.Attr(k) ?? "0") / 100000;
                    if (ft is not null) g.FillTo = new RectTw { L = F("l"), T = F("t"), R = F("r"), B = F("b") };
                }
                st.Fill = from.Value.Hex;
            }
        }
        else if (FirstChild(spPr, "a:pattFill") is { } pf)
        {
            var fg = SrgbOf(FirstChild(pf, "a:fgClr"));
            var bg = SrgbOf(FirstChild(pf, "a:bgClr"));
            st.Pattern = new ShapePattern { Prst = pf.Attr("prst") ?? "pct5", Fg = fg?.Hex ?? "000000", Bg = bg?.Hex ?? "FFFFFF" };
            // a cor de fundo é a do preenchimento (texto automático continua preto — medido:
            // padrão vermelho sobre branco não clareia o texto; pintores sem o padrão)
            st.Fill = st.Pattern.Bg;
        }
        else if (styleEl is not null && FirstChild(spPr, "a:blipFill") is null && FirstChild(spPr, "a:grpFill") is null)
        {
            // sem fill explícito: wps:style/a:fillRef (cor do tema); idx 2/3 = degradês do tema
            var fillRef = FirstChild(styleEl, "a:fillRef");
            int idx = (int)Js.IntOr0(fillRef?.Attr("idx") ?? "0");
            if (fillRef is not null && idx != 0)
            {
                var c = SrgbOf(fillRef);
                if (c is not null)
                {
                    st.Fill = c.Value.Hex;
                    if (idx != 1 && idx != 1001) st.FillRef = new StyleRef { Idx = idx, Color = c.Value.Hex };
                }
            }
        }
        var effRef = styleEl is not null && FirstChild(spPr, "a:effectLst") is null ? FirstChild(styleEl, "a:effectRef") : null;
        int effIdx = (int)Js.IntOr0(effRef?.Attr("idx") ?? "0");
        if (effRef is not null && effIdx > 0)
        {
            var c = SrgbOf(effRef);
            if (c is not null) st.EffectRef = new StyleRef { Idx = effIdx, Color = c.Value.Hex };
        }
        var eff = FirstChild(spPr, "a:effectLst");
        var shd = eff is not null ? FirstChild(eff, "a:outerShdw") : null;
        if (shd is not null)
        {
            var c = SrgbOf(shd);
            double dist = Js.IntOr0(shd.Attr("dist") ?? "0") / EmuPerTwipD;
            double dir = (Js.IntOr0(shd.Attr("dir") ?? "0") / 60000) * (Math.PI / 180);
            if (c is { } cc)
            {
                st.Shadow = new ShapeShadow { Dx = dist * Math.Cos(dir), Dy = dist * Math.Sin(dir), Color = cc.Hex };
                if (cc.Alpha is not null) st.Shadow.Alpha = cc.Alpha;
                double blur = Js.IntOr0(shd.Attr("blurRad") ?? "0") / EmuPerTwipD;
                if (blur != 0) st.Shadow.Blur = blur;
            }
        }
        var ln = FirstChild(spPr, "a:ln");
        var lnRef = styleEl is not null ? FirstChild(styleEl, "a:lnRef") : null;
        // o Word afasta o texto da caixa meia espessura do contorno, mesmo com a linha sem
        // preenchimento: a do a:ln@w ou, sem ela, a da linha do tema do lnRef (oráculo txbxln)
        int refIdx = lnRef is not null ? (int)Js.IntOr0(lnRef.Attr("idx") ?? "0") : 0;
        if (Js.Truthy(ln?.Attr("w"))) st.LineInset = new LineInset { W = Js.ParseInt(ln!.Attr("w")) / 12700 };
        else if (refIdx > 0) st.LineInset = new LineInset { Ref = refIdx };
        if (ln is not null && FirstChild(ln, "a:noFill") is not null) { /* sem linha */ }
        else if (ln is not null && FirstChild(ln, "a:solidFill") is not null)
        {
            var c = SrgbOf(FirstChild(ln, "a:solidFill"));
            if (c is { } cc)
            {
                st.Line = new ShapeLine { Color = cc.Hex, WidthPt = Js.Truthy(ln.Attr("w")) ? Js.ParseInt(ln.Attr("w")) / 12700 : 0.75 };
                if (cc.Alpha is not null) st.Line.Alpha = cc.Alpha;
                string? dash = FirstChild(ln, "a:prstDash")?.Attr("val");
                if (Js.Truthy(dash) && dash != "solid") st.Line.Dash = dash;
            }
        }
        else if (lnRef is not null && lnRef.Attr("idx") != "0")
        {
            var c = SrgbOf(lnRef);
            if (c is not null) st.Line = new ShapeLine { Color = c.Value.Hex, WidthPt = Js.Truthy(ln?.Attr("w")) ? Js.ParseInt(ln!.Attr("w")) / 12700 : 0.75, Ref = Js.Truthy(ln?.Attr("w")) ? null : refIdx };
        }
        return st;
    }

    private static readonly Regex AdjValRe = new(@"^val\s+(-?[0-9]+)", RegexOptions.CultureInvariant);

    // ───────────────────────── a:custGeom ─────────────────────────

    private static readonly Regex GdWs = new(@"\s+", RegexOptions.CultureInvariant);

    private static readonly Regex JsDecRe = new(@"^[+-]?(Infinity|([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?)\z", RegexOptions.CultureInvariant);

    /// <summary>Number(s) do JS para texto: brancos nas pontas, vazio = 0, 0x/0o/0b, Infinity; senão NaN.</summary>
    private static double JsNumberOf(string s)
    {
        string t = s.Trim();
        if (t.Length == 0) return 0;
        if (t.Length > 2 && t[0] == '0' && (t[1] is 'x' or 'X' or 'o' or 'O' or 'b' or 'B'))
        {
            int radix = t[1] is 'x' or 'X' ? 16 : t[1] is 'o' or 'O' ? 8 : 2;
            double acc = 0;
            foreach (char ch in t[2..])
            {
                int d = ch >= '0' && ch <= '9' ? ch - '0' : ch >= 'a' && ch <= 'z' ? ch - 'a' + 10 : ch >= 'A' && ch <= 'Z' ? ch - 'A' + 10 : 99;
                if (d >= radix) return double.NaN;
                acc = acc * radix + d;
            }
            return acc;
        }
        if (!JsDecRe.IsMatch(t)) return double.NaN;
        if (t.EndsWith("Infinity", StringComparison.Ordinal)) return t[0] == '-' ? double.NegativeInfinity : double.PositiveInfinity;
        return double.Parse(t, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// a:custGeom → caminhos numéricos. As guias (a:avLst/a:gdLst) são avaliadas com
    /// as fórmulas do DrawingML sobre as dimensões da forma em EMU (cx × cy).
    /// </summary>
    public static List<CustPath> ReadCustGeom(XmlElement cg, double cx, double cy)
    {
        double w = cx != 0 && !double.IsNaN(cx) ? cx : 1, h = cy != 0 && !double.IsNaN(cy) ? cy : 1, ss = Math.Min(w, h), ls = Math.Max(w, h);
        var v = new Dictionary<string, double>(StringComparer.Ordinal)
        {
            ["w"] = w, ["h"] = h, ["l"] = 0, ["t"] = 0, ["r"] = w, ["b"] = h, ["hc"] = w / 2, ["vc"] = h / 2, ["ss"] = ss, ["ls"] = ls,
            ["cd2"] = 10800000, ["cd4"] = 5400000, ["cd8"] = 2700000, ["3cd4"] = 16200000, ["3cd8"] = 8100000, ["5cd8"] = 13500000, ["7cd8"] = 18900000,
        };
        foreach (int k in new[] { 2, 3, 4, 5, 6, 8, 10, 12, 16, 32 }) { v[$"wd{k}"] = w / k; v[$"hd{k}"] = h / k; v[$"ssd{k}"] = ss / k; }
        double Num(string? s)
        {
            if (s is null) return 0;
            double n = JsNumberOf(s);
            return double.IsFinite(n) ? n : v.TryGetValue(s, out var g) ? g : 0;
        }
        static double Rad(double a) => (a / 60000) * (Math.PI / 180);
        double EvalGd(string f)
        {
            var parts = GdWs.Split(f.Trim());
            string op = parts[0];
            double x = parts.Length > 1 ? Num(parts[1]) : 0, y = parts.Length > 2 ? Num(parts[2]) : 0, z = parts.Length > 3 ? Num(parts[3]) : 0;
            switch (op)
            {
                case "*/": return z != 0 && !double.IsNaN(z) ? (x * y) / z : 0;
                case "+-": return x + y - z;
                case "+/": return z != 0 && !double.IsNaN(z) ? (x + y) / z : 0;
                case "?:": return x > 0 ? y : z;
                case "abs": return Math.Abs(x);
                case "at2": return (Math.Atan2(y, x) * 180 / Math.PI) * 60000;
                case "cat2": return x * Math.Cos(Math.Atan2(z, y));
                case "sat2": return x * Math.Sin(Math.Atan2(z, y));
                case "cos": return x * Math.Cos(Rad(y));
                case "sin": return x * Math.Sin(Rad(y));
                case "tan": return x * Math.Tan(Rad(y));
                case "max": return double.IsNaN(x) || double.IsNaN(y) ? double.NaN : Math.Max(x, y);
                case "min": return double.IsNaN(x) || double.IsNaN(y) ? double.NaN : Math.Min(x, y);
                case "mod": return Math.Sqrt(x * x + y * y + z * z);
                case "pin": return y < x ? x : y > z ? z : y;
                case "sqrt": return Math.Sqrt(Math.Max(0, x));
                case "val": return x;
                default: return 0;
            }
        }
        foreach (var lst in new[] { "a:avLst", "a:gdLst" })
        {
            var el = FirstChild(cg, lst);
            if (el is null) continue;
            foreach (var gd in ChildElements(el, "a:gd"))
            {
                string? name = gd.Attr("name");
                if (Js.Truthy(name)) v[name!] = EvalGd(gd.Attr("fmla") ?? "val 0");
            }
        }
        var outp = new List<CustPath>();
        var pl = FirstChild(cg, "a:pathLst");
        if (pl is null) return outp;
        foreach (var p in ChildElements(pl, "a:path"))
        {
            double pw = Num(p.Attr("w")), ph = Num(p.Attr("h"));
            var path = new CustPath
            {
                W = pw != 0 && !double.IsNaN(pw) ? pw : w, H = ph != 0 && !double.IsNaN(ph) ? ph : h,
                Fill = p.Attr("fill") != "none", Stroke = p.Attr("stroke") is not ("0" or "false"),
            };
            List<(double X, double Y)> Pts(XmlElement el) => ChildElements(el, "a:pt").Select(q => (Num(q.Attr("x")), Num(q.Attr("y")))).ToList();
            foreach (var c in ChildElements(p))
            {
                switch (c.Name)
                {
                    case "a:moveTo":
                    case "a:lnTo":
                        {
                            var q = Pts(c);
                            if (q.Count > 0) path.Cmds.Add(new CustCmd { Op = c.Name == "a:moveTo" ? 'M' : 'L', X = q[0].X, Y = q[0].Y });
                            break;
                        }
                    case "a:cubicBezTo": path.Cmds.Add(new CustCmd { Op = 'C', Pts = Pts(c) }); break;
                    case "a:quadBezTo": path.Cmds.Add(new CustCmd { Op = 'Q', Pts = Pts(c) }); break;
                    case "a:arcTo":
                        path.Cmds.Add(new CustCmd { Op = 'A', WR = Num(c.Attr("wR")), HR = Num(c.Attr("hR")), St = Num(c.Attr("stAng")) / 60000, Sw = Num(c.Attr("swAng")) / 60000 });
                        break;
                    case "a:close": path.Cmds.Add(new CustCmd { Op = 'Z' }); break;
                }
            }
            if (path.Cmds.Count > 0) outp.Add(path);
        }
        return outp;
    }

    // ───────────────────────── VML ─────────────────────────

    private static readonly Regex VmlLenRe = new(@"^(-?[0-9.]+)\s*(pt|in|px|cm|mm|pc|em)?\z", RegexOptions.CultureInvariant);

    /// <summary>Converte um comprimento CSS do VML (pt, in, px, cm, mm, em sem unidade = px).</summary>
    public static double? VmlLenTwips(string? v)
    {
        if (!Js.Truthy(v)) return null;
        var m = VmlLenRe.Match(v!.Trim());
        if (!m.Success) return null;
        double n = Js.ParseFloat(m.Groups[1].Value);
        if (!m.Groups[2].Success) return n * 15; // px (96 dpi) = 15 twips
        return m.Groups[2].Value switch
        {
            "pt" => n * 20,
            "in" => n * 1440,
            "cm" => (n / 2.54) * 1440,
            "mm" => (n / 25.4) * 1440,
            "pc" => n * 240,
            "em" => n * 240,
            _ => n * 15,
        };
    }

    public static Dictionary<string, string> ParseVmlStyle(string? style)
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var decl in (style ?? "").Split(';'))
        {
            int i = decl.IndexOf(':');
            if (i < 0) continue;
            outp[Js.ToLower(decl[..i].Trim())] = decl[(i + 1)..].Trim();
        }
        return outp;
    }

    private static string? Get(Dictionary<string, string> d, string k) => d.TryGetValue(k, out var v) ? v : null;

    private static readonly Dictionary<string, string> RelMap = new(StringComparer.Ordinal)
    {
        ["text"] = "column", ["page"] = "page", ["margin"] = "margin", ["char"] = "character", ["line"] = "line",
        ["left-margin-area"] = "leftMargin", ["right-margin-area"] = "rightMargin",
        ["top-margin-area"] = "topMargin", ["bottom-margin-area"] = "bottomMargin",
        ["inner-margin-area"] = "insideMargin", ["outer-margin-area"] = "outsideMargin",
    };

    /// <summary>Âncora a partir do style do VML (position:absolute + mso-position-*).</summary>
    public static DrawingAnchor? VmlAnchor(Dictionary<string, string> style, XmlElement? wrapEl = null)
    {
        if (Get(style, "position") != "absolute") return null;
        string hRel = Get(style, "mso-position-horizontal-relative") ?? "text";
        string vRel = Get(style, "mso-position-vertical-relative") ?? "text";
        var posH = new AnchorPos { RelativeFrom = RelMap.TryGetValue(hRel, out var h) ? h : "column" };
        var posV = new AnchorPos { RelativeFrom = vRel == "text" ? "paragraph" : RelMap.TryGetValue(vRel, out var v) ? v : "paragraph" };
        string? hAlign = Get(style, "mso-position-horizontal");
        if (Js.Truthy(hAlign) && hAlign != "absolute") posH.Align = hAlign;
        else posH.Offset = (VmlLenTwips(Get(style, "margin-left")) ?? 0) + (VmlLenTwips(Get(style, "left")) ?? 0);
        string? vAlign = Get(style, "mso-position-vertical");
        if (Js.Truthy(vAlign) && vAlign != "absolute") posV.Align = vAlign;
        else posV.Offset = (VmlLenTwips(Get(style, "margin-top")) ?? 0) + (VmlLenTwips(Get(style, "top")) ?? 0);
        double z = Js.IntOr0(Get(style, "z-index") ?? "0");
        string? wrapType = wrapEl?.Attr("type");
        var anchor = new DrawingAnchor
        {
            Wrap = wrapType == "square" ? "square" : wrapType == "tight" ? "tight" : wrapType == "through" ? "through"
                : wrapType == "topAndBottom" ? "topAndBottom" : "none",
            PosH = posH,
            PosV = posV,
            RelativeHeight = z,
        };
        if (z < 0) anchor.BehindDoc = true;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-left")) is { } dl) anchor.DistL = dl;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-right")) is { } dr) anchor.DistR = dr;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-top")) is { } dt) anchor.DistT = dt;
        if (VmlLenTwips(Get(style, "mso-wrap-distance-bottom")) is { } db) anchor.DistB = db;
        return anchor;
    }

    private static readonly Dictionary<string, string> VmlColors = new(StringComparer.Ordinal)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "008000", ["blue"] = "0000FF", ["yellow"] = "FFFF00",
        ["gray"] = "808080", ["grey"] = "808080", ["silver"] = "C0C0C0", ["navy"] = "000080", ["maroon"] = "800000", ["teal"] = "008080",
        ["olive"] = "808000", ["purple"] = "800080", ["fuchsia"] = "FF00FF", ["aqua"] = "00FFFF", ["lime"] = "00FF00", ["window"] = "FFFFFF",
    };

    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>Cor VML ("#rrggbb", "#rgb", nome, "#xxxxxx [n]") → RRGGBB.</summary>
    public static string? VmlColor(string? v)
    {
        if (!Js.Truthy(v)) return null;
        string s = Js.ToLower(WsRe.Split(v!.Trim())[0]);
        if (s.StartsWith('#'))
        {
            string hh = s[1..];
            if (hh.Length == 3) return Js.ToUpper(string.Concat(hh.Select(c => $"{c}{c}")));
            if (hh.Length >= 6) return Js.ToUpper(hh[..6]);
        }
        return VmlColors.TryGetValue(s, out var nc) ? nc : null;
    }

    private static readonly Regex EndsLetterRe = new(@"[a-z]\z", RegexOptions.CultureInvariant);

    /// <summary>Estilo de forma VML (fill/stroke por atributos e filhos v:fill / v:stroke).</summary>
    public static ShapeStyle VmlShapeStyle(XmlElement el, string geom)
    {
        var st = new ShapeStyle { Geom = geom };
        var fillEl = FirstChild(el, "v:fill");
        var strokeEl = FirstChild(el, "v:stroke");
        string? filled = el.Attr("filled") ?? fillEl?.Attr("on");
        if (filled != "f" && filled != "false")
        {
            string? fc = VmlColor(fillEl?.Attr("color") ?? el.Attr("fillcolor"))
                ?? (el.Attr("fillcolor") is null && fillEl is null ? "FFFFFF" : null);
            if (Js.Truthy(fc)) st.Fill = fc;
            string? op = fillEl?.Attr("opacity");
            if (Js.Truthy(op)) st.FillAlpha = op!.EndsWith('f') ? Js.ParseInt(op) / 65536 : Js.ParseFloat(op);
        }
        string? stroked = el.Attr("stroked") ?? strokeEl?.Attr("on");
        if (stroked != "f" && stroked != "false")
        {
            string sc = VmlColor(strokeEl?.Attr("color") ?? el.Attr("strokecolor")) ?? "000000";
            string? sw = el.Attr("strokeweight") ?? strokeEl?.Attr("weight");
            st.Line = new ShapeLine
            {
                Color = sc,
                WidthPt = Js.Truthy(sw) ? (VmlLenTwips(sw!.EndsWith('t') || EndsLetterRe.IsMatch(sw) ? sw : sw + "pt") ?? 15) / 20 : 0.75,
            };
            string? dash = strokeEl?.Attr("dashstyle");
            if (Js.Truthy(dash) && dash != "solid") st.Line.Dash = dash;
        }
        double rot = Js.ParseFloat(Get(ParseVmlStyle(el.Attr("style")), "rotation") ?? "0");
        if (rot != 0 && !double.IsNaN(rot)) st.Rot = rot;
        string flip = Get(ParseVmlStyle(el.Attr("style")), "flip") ?? "";
        if (flip.Contains('x')) st.FlipH = true;
        if (flip.Contains('y')) st.FlipV = true;
        return st;
    }
}
