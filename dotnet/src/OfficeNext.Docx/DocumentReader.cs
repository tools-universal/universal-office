using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>Campo complexo aberto (fldChar begin…end), possivelmente aninhado.</summary>
public sealed class FieldFrame
{
    public string Instr = "";
    /// <summary>w:ffData do fldChar begin (campos de formulário).</summary>
    public FormFieldInfo? Ff;
    /// <summary>instr | result</summary>
    public string Phase = "instr";
    /// <summary>runs do resultado (enquanto o campo não atravessou parágrafo).</summary>
    public List<Run> Runs = new();
    /// <summary>o resultado atravessou um fim de parágrafo: o resto sai como runs normais.</summary>
    public bool Crossed;
    public RunProps Props = new();
    public RPr? Rpr;
}

/// <summary>Contexto de leitura (resolvers de imagem/link) — espelho de ReadContext do JS.</summary>
public sealed class ReadContext
{
    public required Func<string, (byte[] Data, string Ext)?> ResolveImage { get; init; }
    public required Func<string, string?> ResolveLink { get; init; }
    /// <summary>Comentários abertos (commentRangeStart sem End) — atravessa parágrafos.
    /// Lista com semântica de Set do JS (ordem de inserção, sem duplicatas).</summary>
    public List<int>? ActiveComments;
    /// <summary>Bookmark visto: nome e posição no texto do parágrafo (Run.Text
    /// concatenado) — PAGEREF depois de quebra de página no meio do parágrafo.</summary>
    public Action<string, int>? OnBookmark;
    /// <summary>Pilha de campos complexos abertos (atravessa runs e parágrafos).</summary>
    public List<FieldFrame>? FieldStack;
    /// <summary>Lê os blocos (parágrafos + tabelas) de um container (w:txbxContent) —
    /// injetado pelo leitor do documento completo (fulldoc).</summary>
    public Func<XmlElement, ReadContext, List<Block>>? ReadBlocks;

    public void AddActiveComment(int id)
    {
        if (ActiveComments is null || ActiveComments.Contains(id)) return;
        ActiveComments.Add(id);
    }

    public void RemoveActiveComment(int id) => ActiveComments?.Remove(id);
}

/// <summary>Leitura de parágrafos/runs/sectPr — porta de docx-core/src/document.ts.</summary>
public static class DocumentReader
{
    public const string Obj = "￼";

    /// <summary>Props de EDIÇÃO (achatadas) derivadas da formatação direta tipada
    /// (runPropsFromRPr). O motor usa a mesma função para detectar o que a edição mudou.</summary>
    public static RunProps RunPropsFromRPr(RPr? rpr)
    {
        var p = new RunProps();
        if (rpr is null) return p;
        if (rpr.B is { } b) p.Bold = b;
        if (rpr.I is { } i) p.Italic = i;
        if (rpr.U is not null)
        {
            string val = rpr.U.Val;
            p.Underline = val != "none" && val != "";
            if (val is "double" or "dotted" or "dash" or "wave" or "thick") p.UnderlineStyle = val;
            if (Js.Truthy(rpr.U.Color) && rpr.U.Color != "auto") p.UnderlineColor = rpr.U.Color;
        }
        if (rpr.Strike is { } st) p.Strike = st;
        if (rpr.Dstrike is { } ds) p.DoubleStrike = ds;
        if (rpr.Caps is { } caps) p.AllCaps = caps;
        if (rpr.SmallCaps is { } sc) p.SmallCaps = sc;
        if (rpr.VertAlign is "superscript" or "subscript") p.VertAlign = rpr.VertAlign;
        if (rpr.Sz is { } sz) p.SzHalfPt = (int)sz;
        if (Js.Truthy(rpr.Color?.Val) && rpr.Color!.Val != "auto") p.Color = rpr.Color.Val;
        if (Js.Truthy(rpr.Highlight) && rpr.Highlight != "none") p.Highlight = rpr.Highlight;
        if (rpr.RFonts is not null) p.FontAscii = rpr.RFonts.Ascii;
        if (rpr.Spacing is { } sp && sp != 0) p.CharSpacingTwips = double.IsFinite(sp) ? (int)sp : null;
        return p;
    }

    /// <summary>Props de parágrafo de EDIÇÃO derivadas do w:pPr tipado (paraPropsFromPPr).</summary>
    public static ParaProps ParaPropsFromPPr(PPr? ppr)
    {
        var props = new ParaProps();
        if (ppr is null) return props;
        string? jc = ppr.Jc;
        if (jc is "center" or "right" or "both" or "left") props.Alignment = jc;
        else if (jc == "start") props.Alignment = "left";
        else if (jc == "end") props.Alignment = "right";
        else if (jc == "distribute") props.Alignment = "both";
        if (ppr.PStyle is not null) props.StyleId = ppr.PStyle;
        if (ppr.NumPr is not null)
        {
            double numId = ppr.NumPr.NumId ?? 0;
            props.Numbering = new NumberingProps { Kind = numId == 1002 ? "decimal" : "bullet", Ilvl = (int)(ppr.NumPr.Ilvl ?? 0) };
        }
        if (ppr.Ind is not null)
        {
            if (ppr.Ind.Left is { } l) props.IndentLeftTwips = ToInt(l);
            if (ppr.Ind.Right is { } r) props.IndentRightTwips = ToInt(r);
            if (ppr.Ind.FirstLine is { } fl) props.IndentFirstLineTwips = ToInt(fl);
            if (ppr.Ind.Hanging is { } h) props.IndentFirstLineTwips = ToInt(-h);
        }
        if (ppr.Spacing is not null)
        {
            if (ppr.Spacing.Line is { } line && ppr.Spacing.LineRule == "auto") props.LineTwentieths = ToInt(line);
            if (ppr.Spacing.After is { } after) props.SpaceAfterTwips = ToInt(after);
            if (ppr.Spacing.Before is { } before) props.SpaceBeforeTwips = ToInt(before);
        }
        if (Js.Truthy(ppr.Shd?.Fill) && ppr.Shd!.Fill != "auto") props.ShadingHex = ppr.Shd.Fill;
        if (ppr.Tabs is not null)
        {
            var stops = ppr.Tabs
                .Where(t => t.Pos > 0 && t.Val != "clear" && t.Val != "bar")
                .Select(t => new TabStop
                {
                    PosTwips = ToInt(t.Pos),
                    Align = t.Val == "right" ? "right" : "left",
                    Leader = t.Leader == "dot" ? "dot" : null,
                })
                .ToList();
            if (stops.Count > 0) props.TabStops = stops;
        }
        if (ppr.PBdr is not null)
        {
            props.BoxBorder = true;
            var borders = new ParagraphBorders();
            foreach (var side in new[] { "top", "left", "bottom", "right" })
            {
                var b = ppr.PBdr.Get(side);
                if (b is null || b.Val is "none" or "nil") continue;
                var edge = new DocxBorderEdge
                {
                    Style = b.Val,
                    SizeEighthPt = ToInt(b.Sz ?? 4),
                    Color = Js.Truthy(b.Color) && b.Color != "auto" ? b.Color : null,
                    SpacePt = ToInt(b.Space ?? 0),
                };
                switch (side)
                {
                    case "top": borders.Top = edge; break;
                    case "left": borders.Left = edge; break;
                    case "bottom": borders.Bottom = edge; break;
                    case "right": borders.Right = edge; break;
                }
            }
            if (borders.Any) props.Borders = borders;
        }
        if (ppr.PageBreakBefore == true) props.PageBreakBefore = true;
        if (Js.Truthy(ppr.FramePr?.DropCap) && ppr.FramePr!.DropCap != "none") props.DropCap = true;
        return props;
    }

    private static int ToInt(double v) => double.IsFinite(v) ? (int)v : 0;

    private static XmlElement? FindDeep(XmlElement el, string name) => DrawingReader.FindDeep(el, name);

    private static string TextContentOf(XmlElement el) => TextContent(el);

    /// <summary>Valor VML de imagedata: "19661f" (16.16) ou número.</summary>
    private static double? VmlFixed(string? v)
    {
        if (!Js.Truthy(v)) return null;
        double n = v!.EndsWith('f') ? Js.ParseInt(v) / 65536 : Js.ParseFloat(v);
        return double.IsFinite(n) ? n : null;
    }

    /// <summary>parseInt(v, 10) || 0</summary>
    private static double IntOrZero(string? v) { double n = Js.ParseInt(v ?? ""); return double.IsNaN(n) ? 0 : n; }

    /// <summary>Efeitos de cor de um v:imagedata.</summary>
    private static ImageEffects? VmlImageEffects(XmlElement el)
    {
        var fx = new ImageEffects();
        double? gain = VmlFixed(el.Attr("gain")), bl = VmlFixed(el.Attr("blacklevel"));
        if (gain is { } g && g != 1) fx.Gain = g;
        if (bl is { } b && b != 0) fx.Bright = 2 * b;
        if (el.Attr("grayscale") is "t" or "true") fx.Gray = true;
        if (el.Attr("bilevel") is "t" or "true") fx.BiLevel = 0.5;
        return fx.Any ? fx : null;
    }

    /// <summary>Efeitos de cor de um a:blip (a:lum, a:grayscl, a:biLevel).</summary>
    private static ImageEffects? BlipImageEffects(XmlElement blip)
    {
        var fx = new ImageEffects();
        var lum = FirstChild(blip, "a:lum");
        if (lum is not null)
        {
            double b = IntOrZero(lum.Attr("bright") ?? "0") / 100000;
            double c = Math.Max(-1, Math.Min(0.999, IntOrZero(lum.Attr("contrast") ?? "0") / 100000));
            if (c != 0) fx.Gain = c > 0 ? 1 / (1 - c) : 1 + c;
            if (b != 0) fx.Bright = b;
            if (b != 0 || c != 0) fx.Floor = true;
        }
        if (FirstChild(blip, "a:grayscl") is not null) fx.Gray = true;
        var bi = FirstChild(blip, "a:biLevel");
        if (bi is not null) fx.BiLevel = IntOrZero(bi.Attr("thresh") ?? "50000") / 100000;
        return fx.Any ? fx : null;
    }

    /// <summary>Lê a imagem de um pic:pic (blip + recorte + estilo).</summary>
    private static InlineImage? ReadPic(XmlElement pic, ReadContext ctx, double wTw, double hTw)
    {
        var blip = FindDeep(pic, "a:blip");
        string? rid = blip?.Attr("r:embed") ?? blip?.Attr("r:link");
        if (!Js.Truthy(rid)) return null;
        // mídia ausente/externa: o Word ainda reserva o quadro (mostra o ícone de imagem quebrada)
        var media = ctx.ResolveImage(rid!) ?? (Array.Empty<byte>(), "png");
        string? svgRid = blip is not null ? FindDeep(blip, "asvg:svgBlip")?.Attr("r:embed") : null;
        var svgMedia = Js.Truthy(svgRid) ? ctx.ResolveImage(svgRid!) : null;
        var img = new InlineImage
        {
            Data = media.Data,
            Ext = media.Ext,
            Svg = svgMedia?.Data,
            WidthTwips = wTw,
            HeightTwips = hTw,
        };
        var fx = blip is not null ? BlipImageEffects(blip) : null;
        if (fx is not null) img.Effects = fx;
        var src = FindDeep(pic, "a:srcRect");
        if (src is not null && (Js.Truthy(src.Attr("l")) || Js.Truthy(src.Attr("t")) || Js.Truthy(src.Attr("r")) || Js.Truthy(src.Attr("b"))))
        {
            double F(string k) => Js.IntOr0(src.Attr(k) ?? "0") / 100000;
            img.Crop = new ImageCrop { L = F("l"), T = F("t"), R = F("r"), B = F("b") };
        }
        var spPr = FirstChild(pic, "pic:spPr");
        if (spPr is not null)
        {
            var st = DrawingReader.ReadSpPr(spPr);
            if ((st.Rot is { } rot && rot != 0) || st.FlipH == true || st.FlipV == true || st.Line is not null) img.Style = st;
        }
        return img;
    }

    private static void BodyPrOf(DrawingTextbox tb, XmlElement? bodyPr)
    {
        if (bodyPr is null) return;
        if (FindDeep(bodyPr, "a:spAutoFit") is not null) tb.AutoFit = true;
        if (bodyPr.Attr("wrap") == "none") tb.NoWrap = true;
        double InsTw(string name, double def)
        {
            string? v = bodyPr.Attr(name);
            return v is not null ? Js.Round(Js.ParseInt(v) / DocxModel.EmuPerTwip) : def;
        }
        tb.Insets = new TextboxInsets { L = InsTw("lIns", 144), T = InsTw("tIns", 72), R = InsTw("rIns", 144), B = InsTw("bIns", 72) };
        string? anc = bodyPr.Attr("anchor");
        if (anc is "t" or "ctr" or "b") tb.VAnchor = anc;
        if (bodyPr.Attr("fromWordArt") is "1" or "true")
        {
            tb.WordArt = FirstChild(bodyPr, "a:prstTxWarp")?.Attr("prst") ?? "textPlain";
        }
    }

    private static void TextboxBlocks(XmlElement txbx, ReadContext ctx, DrawingTextbox tb)
    {
        if (ctx.ReadBlocks is not null)
        {
            var blocks = ctx.ReadBlocks(txbx, ctx);
            tb.Blocks = blocks;
            // parágrafos do modelo de edição: os do nível de cima + os das células
            var paras = new List<Paragraph>();
            void Walk(List<Block> bs)
            {
                foreach (var b in bs)
                {
                    if (b is ParagraphBlock pb) paras.Add(pb.Paragraph);
                    else if (b is TableBlock tbk)
                        foreach (var r in tbk.Rows)
                            foreach (var c in r.Cells)
                                Walk(c.Blocks ?? c.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList());
                }
            }
            Walk(blocks);
            tb.Paras = paras.Count > 0 ? paras : new List<Paragraph> { new() };
        }
        else
        {
            tb.Paras = ChildElements(txbx, "w:p").Select(p => ReadParagraph(p, ctx)).ToList();
        }
    }

    private static readonly string[] GroupChildren = { "wps:wsp", "pic:pic", "wpg:grpSp" };

    /// <summary>Um objeto de desenho (wps:wsp, pic:pic, grupo) → Run (sem props).</summary>
    private static Run? ReadGraphicObject(XmlElement obj, ReadContext ctx, double wTw, double hTw)
    {
        if (obj.Name == "pic:pic")
        {
            var image = ReadPic(obj, ctx, wTw, hTw);
            return image is not null ? new Run { Text = Obj, Image = image } : null;
        }
        if (obj.Name == "wps:wsp")
        {
            var spPr = FirstChild(obj, "wps:spPr");
            var style = DrawingReader.ReadSpPr(spPr, FirstChild(obj, "wps:style"));
            var txbx = FirstChild(obj, "wps:txbx");
            var content = txbx is not null ? FirstChild(txbx, "w:txbxContent") : null;
            if (content is not null)
            {
                var tb = new DrawingTextbox { WidthTwips = wTw, HeightTwips = hTw };
                TextboxBlocks(content, ctx, tb);
                BodyPrOf(tb, FirstChild(obj, "wps:bodyPr"));
                if (Js.Truthy(style.Fill) || style.Line is not null || style.Gradient is not null) tb.Shape = style;
                tb.LineInset = style.LineInset ?? new LineInset();
                if (style.Rot is { } srot && srot != 0 && !double.IsNaN(srot)) tb.Rot = srot;
                return new Run { Text = Obj, Textbox = tb };
            }
            // imagem como preenchimento da forma (a:blipFill)
            var blipFill = spPr is not null ? FirstChild(spPr, "a:blipFill") : null;
            if (blipFill is not null)
            {
                var synth = new XmlElement("pic:pic");
                synth.Children.Add(blipFill);
                var image = ReadPic(synth, ctx, wTw, hTw);
                if (image is not null) return new Run { Text = Obj, Image = image };
            }
            return new Run { Text = Obj, Shape = new DrawingShape { Style = style, WidthTwips = wTw, HeightTwips = hTw } };
        }
        if (obj.Name is "wpg:wgp" or "wpg:grpSp" or "wpc:wpc")
        {
            var grpSpPr = FirstChild(obj, "wpg:grpSpPr");
            var xfrm = grpSpPr is not null ? FirstChild(grpSpPr, "a:xfrm") : null;
            static double N(XmlElement? el, string k) => Js.IntOr0(el?.Attr(k) ?? "0");
            var chOff = xfrm is not null ? FirstChild(xfrm, "a:chOff") : null;
            var chExt = xfrm is not null ? FirstChild(xfrm, "a:chExt") : null;
            var ext = xfrm is not null ? FirstChild(xfrm, "a:ext") : null;
            double cw = N(chExt, "cx"); if (cw == 0) cw = N(ext, "cx");
            double ch = N(chExt, "cy"); if (ch == 0) ch = N(ext, "cy");
            double sx = cw != 0 ? (wTw * DocxModel.EmuPerTwip) / cw : 1;
            double sy = ch != 0 ? (hTw * DocxModel.EmuPerTwip) / ch : 1;
            var items = new List<GroupItem>();
            foreach (var child in ChildElements(obj))
            {
                if (!GroupChildren.Contains(child.Name)) continue;
                var cpr = FirstChild(child, "wps:spPr") ?? FirstChild(child, "pic:spPr") ?? FirstChild(child, "wpg:grpSpPr");
                var cx = cpr is not null ? FirstChild(cpr, "a:xfrm") : null;
                var off = cx is not null ? FirstChild(cx, "a:off") : null;
                var cext = cx is not null ? FirstChild(cx, "a:ext") : null;
                double x = ((N(off, "x") - N(chOff, "x")) * sx) / DocxModel.EmuPerTwip;
                double y = ((N(off, "y") - N(chOff, "y")) * sy) / DocxModel.EmuPerTwip;
                double w = (N(cext, "cx") * sx) / DocxModel.EmuPerTwip;
                double h = (N(cext, "cy") * sy) / DocxModel.EmuPerTwip;
                var run = ReadGraphicObject(child, ctx, w, h);
                if (run is not null)
                {
                    run.Props = new RunProps();
                    items.Add(new GroupItem { X = x, Y = y, W = w, H = h, Run = run });
                }
            }
            if (items.Count == 0) return null;
            var group = new DrawingGroup { WidthTwips = wTw, HeightTwips = hTw, Items = items };
            double grot = Js.ParseInt(xfrm?.Attr("rot") ?? "0");
            if (grot != 0 && !double.IsNaN(grot)) group.Rot = grot / 60000;
            if (xfrm?.Attr("flipH") == "1") group.FlipH = true;
            if (xfrm?.Attr("flipV") == "1") group.FlipV = true;
            return new Run { Text = Obj, Group = group };
        }
        return null;
    }

    private static readonly string[] DrawingObjects = { "pic:pic", "wps:wsp", "wpg:wgp", "wpc:wpc" };

    /// <summary>w:drawing → run (imagem, caixa de texto, forma ou grupo).</summary>
    private static Run? ReadDrawingRun(XmlElement drawing, ReadContext ctx)
    {
        var anchorEl = FirstChild(drawing, "wp:anchor");
        var container = anchorEl ?? FirstChild(drawing, "wp:inline");
        if (container is null) return null;
        var extent = FirstChild(container, "wp:extent");
        double wTw = Js.ParseInt(extent?.Attr("cx") ?? "0") / DocxModel.EmuPerTwip;
        double hTw = Js.ParseInt(extent?.Attr("cy") ?? "0") / DocxModel.EmuPerTwip;
        var gd = FindDeep(container, "a:graphicData");
        var obj = gd is not null ? ChildElements(gd).FirstOrDefault(c => DrawingObjects.Contains(c.Name)) : null;
        // SmartArt (a:graphicData .../diagram) ainda sem desenho: uma caixa vazia do tamanho
        // da extensão — em linha, ela ocupa a linha como uma imagem (oráculo dgmspace)
        bool dgm = obj is null && (gd?.Attr("uri") ?? "").EndsWith("/drawingml/2006/diagram", StringComparison.Ordinal);
        if (obj is null && !dgm) return null;
        var run = obj is not null ? ReadGraphicObject(obj, ctx, wTw, hTw)
            : new Run { Text = Obj, Shape = new DrawingShape { Style = new ShapeStyle { Geom = "rect" }, WidthTwips = wTw, HeightTwips = hTw } };
        if (run is null) return null;
        var anchor = DrawingReader.ReadWpAnchor(anchorEl);
        // em linha: a margem de efeitos (sombra, brilho) ocupa espaço na linha (oráculo effext)
        var ee = anchorEl is null ? FirstChild(container, "wp:effectExtent") : null;
        if (ee is not null && (run.Image is not null || run.Shape is not null))
        {
            double E(string k) { double n = Js.ParseInt(ee.Attr(k) ?? "0"); return (double.IsNaN(n) ? 0 : n) / DocxModel.EmuPerTwip; }
            var v = new RectTw { L = E("l"), T = E("t"), R = E("r"), B = E("b") };
            if (v.L != 0 || v.T != 0 || v.R != 0 || v.B != 0)
            {
                if (run.Image is not null) run.Image.InlineEffect = v; else run.Shape!.InlineEffect = v;
            }
        }
        if (anchor is not null && (run.Image is not null || run.Textbox is not null || run.Shape is not null || run.Group is not null))
        {
            if (run.Image is not null) { run.Image.Floating = true; run.Image.Anchor = anchor; }
            else if (run.Textbox is not null) { run.Textbox.Floating = true; run.Textbox.Anchor = anchor; }
            else if (run.Shape is not null) { run.Shape.Floating = true; run.Shape.Anchor = anchor; }
            else { run.Group!.Floating = true; run.Group.Anchor = anchor; }
            if (anchor.BehindDoc == true && (run.Image is not null || run.Textbox is not null))
            {
                if (run.Image is not null) run.Image.BehindDoc = true;
                else run.Textbox!.BehindDoc = true;
            }
        }
        // campos legados usados pelo editor (relH/relV/offsets)
        if (anchor is not null)
        {
            if (run.Image is { } im)
            {
                im.RelH = anchor.PosH.RelativeFrom;
                im.RelV = anchor.PosV.RelativeFrom;
                if (anchor.PosH.Offset is { } ox) im.OffsetXTwips = ox;
                if (anchor.PosV.Offset is { } oy) im.OffsetYTwips = oy;
            }
            if (run.Textbox is { } tb)
            {
                tb.RelH = anchor.PosH.RelativeFrom;
                tb.RelV = anchor.PosV.RelativeFrom;
                if (anchor.PosH.Offset is { } ox) tb.OffsetXTwips = ox;
                if (anchor.PosV.Offset is { } oy) tb.OffsetYTwips = oy;
            }
        }
        return run;
    }

    private static string? SG(Dictionary<string, string> d, string k) => d.TryGetValue(k, out var v) ? v : null;

    /// <summary>VML (w:pict / w:object) → runs.</summary>
    private static List<Run> ReadVmlRuns(XmlElement container, ReadContext ctx, bool inline)
    {
        var outp = new List<Run>();
        Run? ShapeOf(XmlElement el, (double Sx, double Sy)? inGroup = null)
        {
            var st = DrawingReader.ParseVmlStyle(el.Attr("style"));
            if (SG(st, "visibility") == "hidden" || SG(st, "display") == "none") return null;
            double w = DrawingReader.VmlLenTwips(SG(st, "width")) ?? 0;
            double h = DrawingReader.VmlLenTwips(SG(st, "height")) ?? 0;
            var anchor = inGroup is not null ? null : DrawingReader.VmlAnchor(st, FindDeep(el, "w10:wrap"));
            if (inGroup is { } g)
            {
                w = Js.FloatOr0(SG(st, "width") ?? "0") * g.Sx;
                h = Js.FloatOr0(SG(st, "height") ?? "0") * g.Sy;
            }
            var textpath = FindDeep(el, "v:textpath");
            if (textpath is not null)
            {
                // WordArt VML (marca d'água "PowerPlusWaterMark"): texto esticado na forma
                string wtext = textpath.Attr("string") ?? "";
                if (wtext.Trim().Length == 0) return null;
                var tps = DrawingReader.ParseVmlStyle(textpath.Attr("style"));
                string famRaw = QuoteRe.Replace(SG(tps, "font-family") ?? "", "").Trim();
                var wsh = DrawingReader.VmlShapeStyle(el, "rect");
                // opacidade do preenchimento: misturada ao branco (a cor do texto não tem alfa)
                string color = wsh.Fill ?? "000000";
                if (wsh.FillAlpha is { } fa && fa < 1)
                {
                    string Mix(int i)
                    {
                        double v = Js.Round(JsNumber.ParseInt(i < color.Length ? color.Substring(i, Math.Min(2, color.Length - i)) : "", 16) * fa + 255 * (1 - fa));
                        if (double.IsNaN(v)) return "NaN";
                        string s = ((long)v).ToString("x", System.Globalization.CultureInfo.InvariantCulture);
                        return s.Length < 2 ? "0" + s : s;
                    }
                    color = (Mix(0) + Mix(2) + Mix(4)).ToUpperInvariant();
                }
                var wrpr = new RPr { Color = new ColorSpec { Val = color }, Sz = 72 };
                if (famRaw.Length > 0) wrpr.RFonts = new RFonts { Ascii = famRaw, HAnsi = famRaw, Cs = famRaw };
                if (BoldRe.IsMatch(SG(tps, "font-weight") ?? "")) wrpr.B = true;
                if ((SG(tps, "font-style") ?? "").Contains("italic", StringComparison.Ordinal)) wrpr.I = true;
                // props de edição derivadas do MESMO pPr (senão o espaçamento parece editado e some)
                var wppr = new PPr { Jc = "center", Spacing = new SpacingSpec { Before = 0, After = 0, Line = 240, LineRule = "auto" } };
                var wpara = new Paragraph
                {
                    Runs = { new Run { Text = wtext, Props = RunPropsFromRPr(wrpr), Rpr = wrpr } },
                    Props = ParaPropsFromPPr(wppr),
                    Ppr = wppr,
                };
                var wtb = new DrawingTextbox
                {
                    Paras = new List<Paragraph> { wpara }, Blocks = new List<Block> { new ParagraphBlock { Paragraph = wpara } },
                    WidthTwips = w, HeightTwips = h, Vml = true, Insets = new TextboxInsets { L = 0, T = 0, R = 0, B = 0 }, VAnchor = "ctr", WordArt = "textPlain",
                };
                double wrot = Js.ParseFloat(SG(st, "rotation") ?? "0");
                if (wrot != 0 && !double.IsNaN(wrot)) wtb.Rot = wrot;
                var wrun = new Run { Text = Obj, Textbox = wtb };
                if (anchor is not null)
                {
                    wtb.Floating = true;
                    wtb.Anchor = anchor;
                    if (anchor.BehindDoc == true) wtb.BehindDoc = true;
                    wtb.RelH = anchor.PosH.RelativeFrom;
                    wtb.RelV = anchor.PosV.RelativeFrom;
                    if (anchor.PosH.Offset is { } ox) wtb.OffsetXTwips = ox;
                    if (anchor.PosV.Offset is { } oy) wtb.OffsetYTwips = oy;
                }
                return wrun;
            }
            var imagedata = FirstChild(el, "v:imagedata");
            string? rid = imagedata?.Attr("r:id") ?? imagedata?.Attr("r:pict");
            Run run;
            if (Js.Truthy(rid))
            {
                var media = ctx.ResolveImage(rid!);
                if (media is null) return null;
                var image = new InlineImage { Data = media.Value.Data, Ext = media.Value.Ext, WidthTwips = w, HeightTwips = h, Vml = true };
                double Crop(string k)
                {
                    string? v = imagedata!.Attr(k);
                    if (!Js.Truthy(v)) return 0;
                    return v!.EndsWith('f') ? Js.ParseInt(v) / 65536 : Js.ParseFloat(v);
                }
                var c = new ImageCrop { L = Crop("cropleft"), T = Crop("croptop"), R = Crop("cropright"), B = Crop("cropbottom") };
                if (Truthy(c.L) || Truthy(c.T) || Truthy(c.R) || Truthy(c.B)) image.Crop = c;
                var fx = VmlImageEffects(imagedata!);
                if (fx is not null) image.Effects = fx;
                run = new Run { Text = Obj, Image = image };
            }
            else
            {
                var txb = FirstChild(el, "v:textbox");
                var content = txb is not null ? FirstChild(txb, "w:txbxContent") : null;
                if (content is not null)
                {
                    var tb = new DrawingTextbox { WidthTwips = w, HeightTwips = h, Vml = true };
                    TextboxBlocks(content, ctx, tb);
                    var inset = (txb!.Attr("inset") ?? "").Split(',');
                    double Ins(int i, double def) =>
                        i < inset.Length && inset[i].Trim() != "" ? DrawingReader.VmlLenTwips(inset[i].Trim()) ?? def : def;
                    tb.Insets = new TextboxInsets { L = Ins(0, 144), T = Ins(1, 72), R = Ins(2, 144), B = Ins(3, 72) };
                    var tbStyle = DrawingReader.ParseVmlStyle(txb.Attr("style"));
                    if (SG(tbStyle, "mso-fit-shape-to-text") == "t") tb.AutoFit = true;
                    if (SG(DrawingReader.ParseVmlStyle(el.Attr("style")), "mso-wrap-style") == "none") tb.NoWrap = true;
                    var sh = DrawingReader.VmlShapeStyle(el, "rect");
                    if (Js.Truthy(sh.Fill) || sh.Line is not null) tb.Shape = sh;
                    run = new Run { Text = Obj, Textbox = tb };
                }
                else
                {
                    string tag = el.Name.StartsWith("v:", StringComparison.Ordinal) ? el.Name[2..] : el.Name;
                    string type = el.Attr("type") ?? "";
                    bool declared = Js.Truthy(el.Attr("fillcolor")) || Js.Truthy(el.Attr("strokecolor")) || Js.Truthy(el.Attr("filled")) || Js.Truthy(el.Attr("stroked"))
                        || FirstChild(el, "v:fill") is not null || FirstChild(el, "v:stroke") is not null;
                    if (tag == "shape" && (type.Contains("_x0000_t75") || !declared))
                        return null; // moldura de imagem sem imagem / forma sem aparência declarada
                    string geom = tag == "oval" ? "ellipse" : tag == "roundrect" ? "roundRect"
                        : tag == "line" || type.Contains("_x0000_t32") ? "line" : "rect";
                    var style = DrawingReader.VmlShapeStyle(el, geom);
                    if (geom == "line") style.Fill = null;
                    var shape = new DrawingShape { Style = style, WidthTwips = w, HeightTwips = h };
                    if (el.Attr("o:hr") == "t") shape.Hr = true;
                    if (tag == "line")
                    {
                        double[] Pt(string? s) => (s ?? "0,0").Split(',').Select(v => DrawingReader.VmlLenTwips(v.Trim()) ?? 0).ToArray();
                        var p1 = Pt(el.Attr("from"));
                        var p2 = Pt(el.Attr("to"));
                        double x1 = p1.Length > 0 ? p1[0] : 0, y1 = p1.Length > 1 ? p1[1] : 0;
                        double x2 = p2.Length > 0 ? p2[0] : 0, y2 = p2.Length > 1 ? p2[1] : 0;
                        shape.Line = new ShapeLinePoints { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2 };
                        shape.WidthTwips = Math.Abs(x2 - x1);
                        shape.HeightTwips = Math.Abs(y2 - y1);
                        if (anchor is null && inGroup is null)
                        {
                            var st2 = new Dictionary<string, string>(st, StringComparer.Ordinal) { ["position"] = "absolute" };
                            anchor = DrawingReader.VmlAnchor(st2);
                        }
                    }
                    run = new Run { Text = Obj, Shape = shape };
                }
            }
            if (anchor is not null && (run.Image is not null || run.Textbox is not null || run.Shape is not null))
            {
                if (run.Image is not null) { run.Image.Floating = true; run.Image.Anchor = anchor; }
                else if (run.Textbox is not null) { run.Textbox.Floating = true; run.Textbox.Anchor = anchor; }
                else { run.Shape!.Floating = true; run.Shape.Anchor = anchor; }
                if (run.Image is { } im)
                {
                    if (anchor.BehindDoc == true) im.BehindDoc = true;
                    im.RelH = anchor.PosH.RelativeFrom;
                    im.RelV = anchor.PosV.RelativeFrom;
                    if (anchor.PosH.Offset is { } ox) im.OffsetXTwips = ox;
                    if (anchor.PosV.Offset is { } oy) im.OffsetYTwips = oy;
                }
                else if (run.Textbox is { } tb)
                {
                    if (anchor.BehindDoc == true) tb.BehindDoc = true;
                    tb.RelH = anchor.PosH.RelativeFrom;
                    tb.RelV = anchor.PosV.RelativeFrom;
                    if (anchor.PosH.Offset is { } ox) tb.OffsetXTwips = ox;
                    if (anchor.PosV.Offset is { } oy) tb.OffsetYTwips = oy;
                }
            }
            return run;
        }
        foreach (var el in ChildElements(container))
        {
            if (el.Name == "v:shapetype" || el.Name.StartsWith("o:", StringComparison.Ordinal) || el.Name.StartsWith("w10:", StringComparison.Ordinal)) continue;
            if (el.Name == "v:group")
            {
                var st = DrawingReader.ParseVmlStyle(el.Attr("style"));
                double w = DrawingReader.VmlLenTwips(SG(st, "width")) ?? 0;
                double h = DrawingReader.VmlLenTwips(SG(st, "height")) ?? 0;
                var cs = (el.Attr("coordsize") ?? "1000,1000").Split(',').Select(v => { double f = Js.ParseFloat(v); return Truthy(f) ? f : 1000; }).ToArray();
                var co = (el.Attr("coordorigin") ?? "0,0").Split(',').Select(v => { double f = Js.ParseFloat(v); return Truthy(f) ? f : 0; }).ToArray();
                double cs0 = cs.Length > 0 && Truthy(cs[0]) ? cs[0] : 1;
                double cs1 = cs.Length > 1 && Truthy(cs[1]) ? cs[1] : 1;
                double sx = w / cs0, sy = h / cs1;
                var items = new List<GroupItem>();
                foreach (var c in ChildElements(el))
                {
                    if (!c.Name.StartsWith("v:", StringComparison.Ordinal) || c.Name == "v:shapetype") continue;
                    var cst = DrawingReader.ParseVmlStyle(c.Attr("style"));
                    var r = ShapeOf(c, (sx, sy));
                    if (r is null) continue;
                    double x = (Js.FloatOr0(SG(cst, "left") ?? "0") - (co.Length > 0 ? co[0] : 0)) * sx;
                    double y = (Js.FloatOr0(SG(cst, "top") ?? "0") - (co.Length > 1 ? co[1] : 0)) * sy;
                    double tw = r.Image?.WidthTwips ?? r.Textbox?.WidthTwips ?? r.Shape?.WidthTwips ?? 0;
                    double th = r.Image?.HeightTwips ?? r.Textbox?.HeightTwips ?? r.Shape?.HeightTwips ?? 0;
                    r.Props = new RunProps();
                    items.Add(new GroupItem { X = x, Y = y, W = tw, H = th, Run = r });
                }
                if (items.Count == 0) continue;
                var group = new DrawingGroup { WidthTwips = w, HeightTwips = h, Items = items };
                var anchor = DrawingReader.VmlAnchor(st, FindDeep(el, "w10:wrap"));
                if (anchor is not null) { group.Floating = true; group.Anchor = anchor; }
                outp.Add(new Run { Text = Obj, Group = group });
                continue;
            }
            if (el.Name.StartsWith("v:", StringComparison.Ordinal))
            {
                var r = ShapeOf(el);
                if (r is not null)
                {
                    // w:object: a imagem do OLE é inline
                    if (inline && r.Image is not null) { r.Image.Floating = false; r.Image.Anchor = null; }
                    outp.Add(r);
                }
            }
        }
        return outp;
    }

    private static readonly Regex QuoteRe = new(@"^[""']|[""']\z", RegexOptions.CultureInvariant);
    private static readonly Regex BoldRe = new("bold|[6-9]00", RegexOptions.CultureInvariant);

    /// <summary>"truthy" de número do JS (não 0 e não NaN).</summary>
    private static bool Truthy(double v) => v != 0 && !double.IsNaN(v);

    /// <summary>Destino dos runs: resultado do campo aberto (se houver) ou o parágrafo.</summary>
    private static List<Run>? RunTarget(ReadContext ctx, List<Run> runs)
    {
        var stack = ctx.FieldStack;
        if (stack is null || stack.Count == 0) return runs;
        var top = stack[^1];
        if (top.Phase == "instr") return null; // conteúdo da instrução: descartado
        return top.Crossed ? runs : top.Runs;
    }

    private static bool IsObjectRun(Run r) => r.Image is not null || r.Textbox is not null || r.Shape is not null || r.Group is not null;

    private static RunProps CloneProps(RunProps p) => p.Clone();

    /// <summary>Fecha o campo do topo da pilha, emitindo o run achatado (texto + runs formatados).</summary>
    private static void CloseField(ReadContext ctx, List<Run> runs)
    {
        var stack = ctx.FieldStack!;
        var f = stack[^1];
        stack.RemoveAt(stack.Count - 1);
        if (f.Crossed) return;
        var textRuns = f.Runs.Where(r => !IsObjectRun(r)).ToList();
        string text = string.Concat(textRuns.Select(r => r.Text));
        var first = textRuns.Count > 0 ? textRuns[0] : f.Runs.Count > 0 ? f.Runs[0] : null;
        var parent = stack.Count > 0 ? stack[^1] : null;
        if (parent is not null && parent.Phase == "instr") { parent.Instr += text; return; }
        var run = new Run
        {
            Text = text,
            Props = CloneProps(first?.Props ?? f.Props),
            Field = $" {f.Instr.Trim()} ",
        };
        // campo de formulário: a formatação é a do run do fldChar begin
        var rpr = f.Ff is not null ? f.Rpr : (first?.Rpr ?? f.Rpr);
        if (rpr is not null) run.Rpr = rpr;
        if (f.Ff is not null) run.FormField = f.Ff;
        if (f.Runs.Count > 0) run.FieldResult = f.Runs;
        RunTarget(ctx, runs)?.Add(run);
    }

    private sealed class Inherit
    {
        public string? Link;
        public string? Field;
    }

    /// <summary>Lê os runs de um container (w:r diretos, w:hyperlink, m:oMath, w:fldSimple…).</summary>
    private static void ReadRunsInto(List<Run> runs, XmlElement container, ReadContext ctx, Inherit? inherit = null)
    {
        foreach (var child in ChildElements(container))
        {
            switch (child.Name)
            {
                case "w:commentRangeStart":
                    ctx.AddActiveComment(JsNumber.ParseIntOr(child.Attr("w:id") ?? "-1", -1));
                    break;
                case "w:commentRangeEnd":
                    ctx.RemoveActiveComment(JsNumber.ParseIntOr(child.Attr("w:id") ?? "-1", -1));
                    break;
                case "w:bookmarkStart":
                    {
                        string? name = child.Attr("w:name");
                        if (Js.Truthy(name))
                        {
                            int offset = 0;
                            foreach (var r in runs) offset += r.Text.Length;
                            ctx.OnBookmark?.Invoke(name!, offset);
                        }
                        break;
                    }
                case "w:r":
                    ReadSingleRun(runs, child, ctx, inherit);
                    break;
                case "w:hyperlink":
                    {
                        string? rid = child.Attr("r:id");
                        string? anchor = child.Attr("w:anchor");
                        string? link = Js.Truthy(rid) ? ctx.ResolveLink(rid!) : null;
                        if (!Js.Truthy(link)) link = anchor is not null ? "#" + anchor : null;
                        ReadRunsInto(runs, child, ctx, new Inherit { Link = link, Field = inherit?.Field });
                        break;
                    }
                case "w:fldSimple":
                    {
                        string instr = child.Attr("w:instr") ?? "";
                        var inner = new List<Run>();
                        ReadRunsInto(inner, child, ctx, inherit);
                        var textRuns = inner.Where(r => !IsObjectRun(r)).ToList();
                        var first = textRuns.Count > 0 ? textRuns[0] : null;
                        var run = new Run
                        {
                            Text = string.Concat(textRuns.Select(r => r.Text)),
                            Props = first is not null ? CloneProps(first.Props) : new RunProps(),
                            Field = instr,
                        };
                        if (first?.Rpr is not null) run.Rpr = first.Rpr;
                        if (inner.Count > 0) run.FieldResult = inner;
                        RunTarget(ctx, runs)?.Add(run);
                        break;
                    }
                case "m:oMath":
                case "m:oMathPara":
                    {
                        string text = CollectMathText(child);
                        if (text.Length > 0) RunTarget(ctx, runs)?.Add(new Run { Text = text, Props = new RunProps { Italic = true, IsMath = true } });
                        break;
                    }
                case "w:sdt":
                    {
                        var content = FindDeep(child, "w:sdtContent");
                        var sdtPr = FirstChild(child, "w:sdtPr");
                        string? tag = sdtPr is not null ? FirstChild(sdtPr, "w:tag")?.Attr("w:val") : null;
                        var custom = ParseCustomInlineTag(tag);
                        if (content is not null && custom is not null)
                        {
                            var nested = new List<Run>();
                            ReadRunsInto(nested, content, ctx, inherit);
                            string fallbackText = string.Concat(nested.Select(r => r.Text));
                            RunTarget(ctx, runs)?.Add(new Run
                            {
                                Text = "￼",
                                Props = nested.Count > 0 ? CloneProps(nested[0].Props) : new RunProps(),
                                Custom = new CustomInline { Type = custom.Value.Type, DataJson = custom.Value.Json, FallbackText = fallbackText },
                            });
                        }
                        else if (content is not null)
                        {
                            ReadRunsInto(runs, content, ctx, inherit);
                        }
                        break;
                    }
                case "w:smartTag":
                case "w:ins":
                case "w:moveTo":
                case "w:customXml":
                case "w:dir":
                case "w:bdo":
                    ReadRunsInto(runs, child, ctx, inherit);
                    break;
                    // w:del / w:moveFrom: texto excluído (visão "final") — fora do fluxo
            }
        }
    }

    private const string CustomInlineTagPrefix = "wordnext:inline:";
    private static readonly Regex LiteralBreakRe = new("\r\n|[\r\n]", RegexOptions.CultureInvariant);
    private static readonly Regex CustomTypeRe = new(@"^[a-zA-Z0-9._-]+\z", RegexOptions.CultureInvariant);

    private static (string Type, string Json)? ParseCustomInlineTag(string? tag)
    {
        if (tag is null || !tag.StartsWith(CustomInlineTagPrefix, StringComparison.Ordinal)) return null;
        string payload = tag[CustomInlineTagPrefix.Length..];
        int split = payload.IndexOf(':');
        if (split <= 0) return null;
        string type = payload[..split];
        if (!CustomTypeRe.IsMatch(type)) return null;
        try
        {
            string json = Uri.UnescapeDataString(payload[(split + 1)..]);
            using var _ = System.Text.Json.JsonDocument.Parse(json);
            return (type, json);
        }
        catch
        {
            return null;
        }
    }

    private static string CollectMathText(XmlElement el)
    {
        var sb = new StringBuilder();
        foreach (var c in el.Children)
        {
            if (c is not XmlElement e) continue;
            if (e.Name == "m:t") sb.Append(TextContentOf(e));
            else sb.Append(CollectMathText(e));
        }
        return sb.ToString();
    }

    private static readonly Regex TocInstrRe = new(@"^\s*TOC\b", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private static void ReadSingleRun(List<Run> runs, XmlElement rEl, ReadContext ctx, Inherit? inherit)
    {
        var rpr = OoxmlProps.ReadRPr(FirstChild(rEl, "w:rPr"));
        var rProps = RunPropsFromRPr(rpr);
        if (Js.Truthy(inherit?.Link))
        {
            rProps.Link = inherit!.Link;
            rProps.Underline = true;
            rProps.Color ??= "0563C1";
        }
        ctx.FieldStack ??= new List<FieldFrame>();
        var stack = ctx.FieldStack;
        Run Make(string text, Run? extra = null)
        {
            var props = rProps.Clone();
            if (ctx.ActiveComments is { Count: > 0 }) props.CommentIds = new List<int>(ctx.ActiveComments);
            var run = extra ?? new Run();
            run.Text = text;
            run.Props = props;
            if (Js.Truthy(inherit?.Field) && (extra is null || extra.Field is null)) run.Field = inherit!.Field;
            if (rpr is not null) run.Rpr = rpr;
            if (stack.Any(f => f.Phase == "result" && TocInstrRe.IsMatch(f.Instr))) run.InToc = true;
            return run;
        }
        var text = new StringBuilder();
        void Flush()
        {
            if (text.Length == 0) return;
            RunTarget(ctx, runs)?.Add(Make(text.ToString()));
            text.Clear();
        }
        void PushRun(Run extra)
        {
            Flush();
            RunTarget(ctx, runs)?.Add(Make(extra.Text, extra));
        }
        foreach (var child in ChildElements(rEl))
        {
            if (child.Name == "w:rPr") continue;
            // campos complexos: fldChar begin/separate/end + instrText (PAGE, NUMPAGES…)
            if (child.Name == "w:fldChar")
            {
                Flush();
                string? type = child.Attr("w:fldCharType");
                if (type == "begin")
                {
                    var frame = new FieldFrame { Props = rProps.Clone() };
                    if (rpr is not null) frame.Rpr = rpr;
                    var ff = FirstChild(child, "w:ffData");
                    if (ff is not null)
                    {
                        var cb = FirstChild(ff, "w:checkBox");
                        if (cb is not null)
                        {
                            string? def = FirstChild(cb, "w:default")?.Attr("w:val");
                            var chk = FirstChild(cb, "w:checked");
                            string? size = FirstChild(cb, "w:size")?.Attr("w:val");
                            frame.Ff = new FormFieldInfo
                            {
                                Type = "checkBox",
                                Checked = chk is not null ? chk.Attr("w:val") != "0" && chk.Attr("w:val") != "false" : def is "1" or "true",
                                SizeHalfPt = Js.Truthy(size) ? Js.ParseInt(size) : null,
                                SizeAuto = FirstChild(cb, "w:sizeAuto") is not null || !Js.Truthy(size),
                            };
                        }
                        else if (FirstChild(ff, "w:ddList") is { } dl)
                        {
                            // o Word exibe a entrada w:result; sem ela (ou fora da lista), w:default;
                            // senão a 1ª — nunca o resultado em cache (oráculo hidetext/ff-dropdown)
                            var entries = ChildElements(dl, "w:listEntry").Select(e => e.Attr("w:val") ?? "").ToList();
                            int? Idx(string name)
                            {
                                double k = Js.ParseInt(FirstChild(dl, name)?.Attr("w:val") ?? "");
                                return !double.IsNaN(k) && k >= 0 && k < entries.Count ? (int)k : null;
                            }
                            frame.Ff = new FormFieldInfo { Type = "dropDown", Entries = entries, Selected = Idx("w:result") ?? Idx("w:default") ?? 0 };
                        }
                        else if (FirstChild(ff, "w:textInput") is not null) frame.Ff = new FormFieldInfo { Type = "textInput" };
                    }
                    stack.Add(frame);
                }
                else if (type == "separate")
                {
                    if (stack.Count > 0) stack[^1].Phase = "result";
                }
                else if (type == "end")
                {
                    if (stack.Count > 0) CloseField(ctx, runs);
                }
                continue;
            }
            if (child.Name == "w:instrText")
            {
                var top = stack.Count > 0 ? stack[^1] : null;
                if (top is not null && top.Phase == "instr") top.Instr += TextContentOf(child);
                continue;
            }
            switch (child.Name)
            {
                case "w:t":
                    // U+00AD LITERAL no texto não é hífen opcional para o Word: aparece
                    // sempre (hífen da própria fonte) e não quebra a linha — igual ao
                    // w:noBreakHyphen (oráculo hidetext/shy-literal). Opcional é só w:softHyphen.
                    // quebra de linha LITERAL (CR, LF, CRLF) no texto é um espaço para o Word
                    // (e ele a grava assim) — só w:br/w:cr quebram a linha (oráculo ctlspace)
                    {
                        var tsb = new StringBuilder();
                        foreach (var c in child.Children) if (c is string s) tsb.Append(s);
                        text.Append(LiteralBreakRe.Replace(tsb.ToString().Replace('\u00AD', '\u2011'), " "));
                    }
                    break;
                case "w:tab":
                    text.Append('\t');
                    break;
                case "w:ptab":
                    PushRun(new Run
                    {
                        Text = "\t",
                        Ptab = new PtabInfo
                        {
                            Alignment = child.Attr("w:alignment") ?? "left",
                            RelativeTo = child.Attr("w:relativeTo") ?? "margin",
                            Leader = Js.Truthy(child.Attr("w:leader")) ? child.Attr("w:leader") : null,
                        },
                    });
                    break;
                case "w:br":
                case "w:cr":
                    {
                        // \f = quebra de página; \u000B = quebra de coluna; \n = quebra de linha
                        string? t = child.Attr("w:type");
                        // quebra de linha com w:clear (desce para baixo dos flutuantes): U+2028
                        string? clr = child.Attr("w:clear");
                        text.Append(t == "page" ? '\f' : t == "column" ? '\u000B' : Js.Truthy(clr) && clr != "none" ? '\u2028' : '\n');
                        break;
                    }
                case "w:noBreakHyphen":
                    text.Append('‑');
                    break;
                case "w:softHyphen":
                    text.Append('­');
                    break;
                case "w:sym":
                    {
                        string hex = child.Attr("w:char") ?? "F0B7";
                        double code = JsNumber.ParseInt(hex, 16);
                        // só códigos legados de 1 byte mapeiam para a área privada F0xx;
                        // valores Unicode reais (ex.: 2612 ☒) ficam como estão
                        if (code <= 0xff) code = (long)code | 0xf000;
                        string? font = child.Attr("w:font");
                        Flush();
                        var run = Make(Js.FromCharCode(double.IsNaN(code) ? 0 : (int)(long)code));
                        run.Props.FontAscii = font ?? rProps.FontAscii;
                        if (Js.Truthy(font)) run.SymFont = font;
                        RunTarget(ctx, runs)?.Add(run);
                        break;
                    }
                case "w:footnoteReference":
                case "w:endnoteReference":
                    {
                        int id = JsNumber.ParseIntOr(child.Attr("w:id") ?? "0", 0);
                        Flush();
                        var run = Make("", new Run { NoteRef = new NoteRef { Kind = child.Name == "w:footnoteReference" ? "footnote" : "endnote", Id = id } });
                        run.Props.VertAlign = "superscript";
                        RunTarget(ctx, runs)?.Add(run);
                        break;
                    }
                case "w:footnoteRef":
                case "w:endnoteRef":
                    // número da própria nota (dentro de footnotes.xml): o motor numera
                    PushRun(new Run { Text = "", Field = child.Name == "w:footnoteRef" ? " FOOTNOTEREF_MARK " : " ENDNOTEREF_MARK " });
                    break;
                case "w:pgNum":
                    PushRun(new Run { Text = "", Field = " PAGE " });
                    break;
                case "w:drawing":
                    {
                        var r = ReadDrawingRun(child, ctx);
                        if (r is not null) PushRun(r);
                        break;
                    }
                case "w:pict":
                    foreach (var r in ReadVmlRuns(child, ctx, false)) PushRun(r);
                    break;
                case "w:object":
                    foreach (var r in ReadVmlRuns(child, ctx, true)) PushRun(r);
                    break;
                case "mc:AlternateContent":
                    {
                        // formas/caixas de texto de DrawingML: o w:drawing moderno fica em
                        // mc:Choice (Requires="wps"); o mc:Fallback é VML.
                        var choice = FirstChild(child, "mc:Choice");
                        var drawing = choice is not null ? FindDeep(choice, "w:drawing") : null;
                        var r = drawing is not null ? ReadDrawingRun(drawing, ctx) : null;
                        if (r is not null) PushRun(r);
                        else
                        {
                            var fb = FirstChild(child, "mc:Fallback");
                            var pict = fb is not null ? (FindDeep(fb, "w:pict") ?? FindDeep(fb, "w:object")) : null;
                            if (pict is not null) foreach (var v in ReadVmlRuns(pict, ctx, pict.Name == "w:object")) PushRun(v);
                        }
                        break;
                    }
                case "w:ruby":
                    {
                        var rb = FirstChild(child, "w:rubyBase");
                        if (rb is not null) { Flush(); ReadRunsInto(runs, rb, ctx, inherit); }
                        break;
                    }
            }
        }
        Flush();
    }

    private static readonly Regex TocRe = new(@"\bTOC\b", RegexOptions.CultureInvariant);

    public static Paragraph ReadParagraph(XmlElement pEl, ReadContext ctx)
    {
        var ppr = OoxmlProps.ReadPPr(FirstChild(pEl, "w:pPr"));
        var props = ParaPropsFromPPr(ppr);
        var runs = new List<Run>();
        ReadRunsInto(runs, pEl, ctx);
        // campo cujo resultado atravessa o fim do parágrafo (ex.: TOC): o pedaço
        // deste parágrafo vira o run do campo; o resto segue como runs normais
        var stack = ctx.FieldStack ?? new List<FieldFrame>();
        for (int i = stack.Count - 1; i >= 0; i--)
        {
            var f = stack[i];
            if (f.Phase != "result" || f.Crossed) continue;
            if (i == stack.Count - 1 && f.Runs.Count > 0)
            {
                var textRuns = f.Runs.Where(r => !IsObjectRun(r)).ToList();
                var first = textRuns.Count > 0 ? textRuns[0] : f.Runs[0];
                var run = new Run
                {
                    Text = string.Concat(textRuns.Select(r => r.Text)),
                    Props = CloneProps(first.Props),
                    Field = $" {f.Instr.Trim()} ",
                    FieldResult = f.Runs,
                };
                var rpr = first.Rpr ?? f.Rpr;
                if (rpr is not null) run.Rpr = rpr;
                runs.Add(run);
            }
            f.Crossed = true;
            f.Runs = new List<Run>();
        }
        // campo TOC (mesmo "sujo"/sem cache): marca o parágrafo p/ geração
        string instr = CollectInstrText(pEl);
        if (TocRe.IsMatch(instr)) props.TocInstr = instr.Trim();
        var para = new Paragraph { Runs = runs, Props = props };
        if (ppr is not null) para.Ppr = ppr;
        return para;
    }

    private static string CollectInstrText(XmlElement el)
    {
        var sb = new StringBuilder();
        foreach (var c in el.Children)
        {
            if (c is not XmlElement e) continue;
            if (e.Name == "w:instrText") sb.Append(TextContentOf(e));
            else sb.Append(CollectInstrText(e));
        }
        return sb.ToString();
    }

    /// <summary>Constrói o contexto de leitura (resolvers de imagem/link) para uma parte.</summary>
    public static ReadContext BuildReadContext(DocxPackage pkg, string relsPath)
    {
        string? relsXml = pkg.GetPartText(relsPath);
        var relMap = new Dictionary<string, (string Target, bool External)>(StringComparer.Ordinal);
        if (relsXml is not null)
        {
            var rels = Parse(relsXml);
            foreach (var rel in ChildElements(rels, "Relationship"))
            {
                string? id = rel.Attr("Id");
                string? target = rel.Attr("Target");
                if (Js.Truthy(id) && Js.Truthy(target))
                {
                    string t = target!.StartsWith("./", StringComparison.Ordinal) ? target[2..] : target!;
                    relMap[id!] = (t, rel.Attr("TargetMode") == "External");
                }
            }
        }
        return new ReadContext
        {
            ActiveComments = new List<int>(),
            FieldStack = new List<FieldFrame>(),
            ResolveImage = rid =>
            {
                if (!relMap.TryGetValue(rid, out var rel) || rel.External) return null;
                string path = rel.Target.StartsWith('/') ? rel.Target[1..] : "word/" + rel.Target;
                var data = pkg.GetPart(path);
                if (data is null) return null;
                // path.split('.').pop() — sem ponto, é o caminho inteiro (como no JS)
                int dot = path.LastIndexOf('.');
                string ext = Js.ToLower(dot >= 0 ? path[(dot + 1)..] : path);
                return (data, ext);
            },
            ResolveLink = rid =>
                relMap.TryGetValue(rid, out var rel) && rel.External ? rel.Target : null,
        };
    }

    private static int Tw(XmlElement? el, string attr, int fallback)
    {
        string? v = el?.Attr(attr);
        return v is null ? fallback : JsNumber.ParseIntOr(v, fallback);
    }

    public static DocumentModel ReadDocument(DocxPackage pkg)
    {
        var root = Parse(pkg.DocumentXml());
        var body = FirstChild(root, "w:body")
            ?? throw new InvalidDataException("w:document sem w:body");
        var ctx = BuildReadContext(pkg, "word/_rels/document.xml.rels");
        var paragraphs = ChildElements(body, "w:p").Select(p => ReadParagraph(p, ctx)).ToList();
        if (paragraphs.Count == 0) paragraphs.Add(new Paragraph());
        var sectPr = ReadSectPr(FirstChild(body, "w:sectPr"));
        return new DocumentModel { Paragraphs = paragraphs, SectPr = sectPr };
    }

    public static SectPr ReadSectPr(XmlElement? sectEl)
    {
        var pgSz = sectEl is not null ? FirstChild(sectEl, "w:pgSz") : null;
        var pgMar = sectEl is not null ? FirstChild(sectEl, "w:pgMar") : null;
        var colsEl = sectEl is not null ? FirstChild(sectEl, "w:cols") : null;
        var sect = new SectPr
        {
            PageWidthTwips = Tw(pgSz, "w:w", 11906),
            PageHeightTwips = Tw(pgSz, "w:h", 16838),
            MarginLeftTwips = Tw(pgMar, "w:left", 1701),
            MarginRightTwips = Tw(pgMar, "w:right", 1701),
            MarginTopTwips = Tw(pgMar, "w:top", 1417),
            MarginBottomTwips = Tw(pgMar, "w:bottom", 1417),
            HeaderDistanceTwips = Tw(pgMar, "w:header", 720),
            FooterDistanceTwips = Tw(pgMar, "w:footer", 720),
        };
        int num = colsEl is not null ? JsNumber.ParseIntOr(colsEl.Attr("w:num") ?? "1", 1) : 1;
        if (num > 1)
        {
            sect.Cols = new SectPrCols
            {
                Count = num,
                SpaceTwips = JsNumber.ParseIntOr(colsEl!.Attr("w:space") ?? "720", 720),
                Sep = colsEl.Attr("w:sep") is "true" or "1",
            };
        }
        var titlePg = sectEl is not null ? FirstChild(sectEl, "w:titlePg") : null;
        if (titlePg is not null && titlePg.Attr("w:val") != "0" && titlePg.Attr("w:val") != "false") sect.TitlePg = true;
        var pgNumType = sectEl is not null ? FirstChild(sectEl, "w:pgNumType") : null;
        string? startAttr = pgNumType?.Attr("w:start");
        if (startAttr is not null)
        {
            double n = JsNumber.ParseInt(startAttr);
            if (!double.IsNaN(n)) sect.PgNumStart = (int)Math.Clamp(n, int.MinValue, int.MaxValue);
        }
        return sect;
    }
}
