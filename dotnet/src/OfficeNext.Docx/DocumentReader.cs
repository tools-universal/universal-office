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
    /// <summary>Fim de um indicador (w:bookmarkEnd) visto — a mesma posição de OnBookmark.</summary>
    public Action<string, int>? OnBookmarkEnd;
    /// <summary>w:id → nome dos indicadores abertos na parte (o w:bookmarkEnd só traz o id).</summary>
    public Dictionary<int, string>? BookmarkIds;
    /// <summary>Pilha de campos complexos abertos (atravessa runs e parágrafos).</summary>
    public List<FieldFrame>? FieldStack;
    /// <summary>Lê os blocos (parágrafos + tabelas) de um container (w:txbxContent) —
    /// injetado pelo leitor do documento completo (fulldoc).</summary>
    public Func<XmlElement, ReadContext, List<Block>>? ReadBlocks;
    /// <summary>XML de uma parte ligada pelo r:id (alvo relativo a word/) — desenho do SmartArt</summary>
    public Func<string, XmlElement?>? ResolvePart;

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
        if (Js.Truthy(rpr.RStyle)) p.CharStyle = rpr.RStyle;
        if (rpr.Change is not null) p.Fmt = CopyRevInfo(rpr.Change, new FormatChange { Old = RunPropsFromRPr(rpr.Change.RPr) });
        return p;
    }

    /// <summary>Só a autoria de uma revisão (sem o conteúdo antigo).</summary>
    public static RevisionInfo RevInfo(RevisionInfo r) => CopyRevInfo(r, new RevisionInfo());

    /// <summary>Copia a autoria (autor, datas, movimentação) de uma revisão para outra.</summary>
    private static T CopyRevInfo<T>(RevisionInfo r, T into) where T : RevisionInfo
    {
        into.Author = r.Author;
        into.Date = r.Date;
        into.DateUtc = r.DateUtc;
        into.Move = r.Move;
        return into;
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
        if (ppr.Tabs is { Count: > 0 })
        {
            props.TabStops = ppr.Tabs
                .Select(t => new TabStop
                {
                    PosTwips = ToInt(t.Pos),
                    Align = t.Val,
                    Leader = Js.Truthy(t.Leader) && t.Leader != "none" ? t.Leader : null,
                })
                .ToList();
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
        if (ppr.MarkIns is not null) props.MarkIns = RevInfo(ppr.MarkIns);
        if (ppr.MarkDel is not null) props.MarkDel = RevInfo(ppr.MarkDel);
        if (ppr.Change is not null) props.Pfmt = CopyRevInfo(ppr.Change, new ParaFormatChange { Old = ParaPropsFromPPr(ppr.Change.PPr) });
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
                if (!string.IsNullOrEmpty(style.Geom) && style.Geom != "rect" && style.Geom != "custom") tb.Geom = new TextboxGeom { Prst = style.Geom, Adj = style.Adj };
                // espelho vertical gira o texto 180° (o horizontal não o afeta): rot 180 + flipV fica
                // em pé — medido no Word (corpus t43)
                bool hasRot = style.Rot is { } srot && srot != 0 && !double.IsNaN(srot);
                if (hasRot || style.FlipV == true) tb.Rot = ((style.Rot ?? 0) + (style.FlipV == true ? 180 : 0)) % 360;
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
    /// <summary>Cor DrawingML (srgbClr/sysClr/schemeClr) → cor de run; tint/shade do esquema
    /// viram themeTint/themeShade.</summary>
    private static ColorSpec? DmlRunColor(XmlElement? el)
    {
        var c = el is not null ? (FirstChild(el, "a:srgbClr") ?? FirstChild(el, "a:sysClr") ?? FirstChild(el, "a:schemeClr") ?? FirstChild(el, "a:prstClr")) : null;
        if (c is null) return null;
        if (c.Name == "a:srgbClr") return new ColorSpec { Val = Js.ToUpper(c.Attr("val") ?? "000000") };
        if (c.Name == "a:sysClr") return new ColorSpec { Val = Js.ToUpper(c.Attr("lastClr") ?? (c.Attr("val") == "window" ? "FFFFFF" : "000000")) };
        if (c.Name == "a:prstClr") return new ColorSpec { Val = c.Attr("val") == "white" ? "FFFFFF" : "000000" };
        var spec = new ColorSpec { ThemeColor = c.Attr("val") ?? "tx1" };
        string? Frac(string k)
        {
            var m = FirstChild(c, k);
            if (m is null) return null;
            double n = Js.ParseInt(m.Attr("val") ?? "100000");
            long v = (long)JsNumber.Round(((double.IsNaN(n) ? 0 : n) / 100000) * 255);
            return Js.ToUpper(v.ToString("x").PadLeft(2, '0'));
        }
        string? t = Frac("a:tint"), sh = Frac("a:shade");
        if (Js.Truthy(t)) spec.ThemeTint = t;
        if (Js.Truthy(sh)) spec.ThemeShade = sh;
        return spec;
    }

    private static readonly Regex OneOrTrueRe = new("^(1|true)$", RegexOptions.CultureInvariant);

    /// <summary>Texto DrawingML (a:txBody do SmartArt) → parágrafos com a formatação toda explícita:
    /// o texto da forma não herda o estilo Normal do documento (oráculo dgmdraw). Cor sem
    /// a:solidFill: a do txFillClrLst do esquema de cores; senão a do fontRef.</summary>
    private static List<Paragraph> DmlParagraphs(XmlElement body, XmlElement? styleEl, ColorSpec? txFill)
    {
        var fontRef = styleEl is not null ? FirstChild(styleEl, "a:fontRef") : null;
        var refColor = txFill ?? DmlRunColor(fontRef);
        string refKind = fontRef?.Attr("idx") == "major" ? "major" : "minor";
        RPr RprOf(XmlElement? rPr)
        {
            double szv = Js.ParseInt(rPr?.Attr("sz") ?? "1800");
            double sz = JsNumber.Round((double.IsNaN(szv) || szv == 0 ? 1800 : szv) / 50);
            string? Face(string tag) { var f = rPr is not null ? FirstChild(rPr, tag)?.Attr("typeface") : null; return Js.Truthy(f) ? f : null; }
            string Kind(string? f) => Js.Truthy(f) ? (f!.StartsWith("+mj", StringComparison.Ordinal) ? "major" : "minor") : refKind;
            string? lt = Face("a:latin"), ea = Face("a:ea"), cs = Face("a:cs");
            var rFonts = new RFonts();
            if (lt is not null && !lt.StartsWith('+')) { rFonts.Ascii = lt; rFonts.HAnsi = lt; }
            else { rFonts.AsciiTheme = $"{Kind(lt)}HAnsi"; rFonts.HAnsiTheme = $"{Kind(lt)}HAnsi"; }
            if (ea is not null && !ea.StartsWith('+')) rFonts.EastAsia = ea; else rFonts.EastAsiaTheme = $"{Kind(ea)}EastAsia";
            if (cs is not null && !cs.StartsWith('+')) rFonts.Cs = cs; else rFonts.CsTheme = $"{Kind(cs)}Bidi";
            bool On(string k) => rPr?.Attr(k) == "1" || rPr?.Attr(k) == "true";
            string? u = rPr?.Attr("u");
            var r = new RPr
            {
                RFonts = rFonts, Sz = sz, SzCs = sz, B = On("b"), BCs = On("b"), I = On("i"), ICs = On("i"),
                Color = DmlRunColor(rPr is not null ? FirstChild(rPr, "a:solidFill") : null) ?? refColor ?? new ColorSpec { ThemeColor = "tx1" },
            };
            if (Js.Truthy(u) && u != "none") r.U = new UnderlineSpec { Val = u == "dbl" ? "double" : "single" };
            return r;
        }
        double Num(XmlElement? el) { double n = Js.ParseInt(el?.Attr("val") ?? "0"); return double.IsNaN(n) ? 0 : n; }
        // spcFirstLastPara ausente/0: sem espaço antes do 1º nem depois do último parágrafo
        bool edges = OneOrTrueRe.IsMatch(FirstChild(body, "a:bodyPr")?.Attr("spcFirstLastPara") ?? "");
        var aps = ChildElements(body, "a:p").ToList();
        var outp = new List<Paragraph>();
        for (int k = 0; k < aps.Count; k++)
        {
            var ap = aps[k];
            var pPr = FirstChild(ap, "a:pPr");
            var runs = new List<Run>();
            foreach (var c in ChildElements(ap))
            {
                if (c.Name != "a:r" && c.Name != "a:br" && c.Name != "a:fld") continue;
                var t = FirstChild(c, "a:t");
                string text = c.Name == "a:br" ? "\n" : t is not null ? TextContentOf(t) : "";
                if (text.Length == 0) continue;
                var rpr = RprOf(FirstChild(c, "a:rPr"));
                runs.Add(new Run { Text = text, Props = RunPropsFromRPr(rpr), Rpr = rpr });
            }
            var firstR = FirstChild(ap, "a:r");
            var mark = RprOf(FirstChild(ap, "a:endParaRPr") ?? (firstR is not null ? FirstChild(firstR, "a:rPr") : null));
            double szPt = runs.Aggregate(mark.Sz ?? 36, (mx, r) => Math.Max(mx, r.Rpr?.Sz ?? 0)) / 2;
            // espaço antes/depois: spcPts (centésimos de pt) ou spcPct (fração da linha, 1,2 × corpo)
            double Gap(string tag)
            {
                var e = pPr is not null ? FirstChild(pPr, tag) : null;
                var pts = e is not null ? FirstChild(e, "a:spcPts") : null;
                var pct = e is not null ? FirstChild(e, "a:spcPct") : null;
                return pts is not null ? JsNumber.Round(Num(pts) / 5) : pct is not null ? JsNumber.Round((Num(pct) / 100000) * 1.2 * szPt * 20) : 0;
            }
            var ln = pPr is not null ? FirstChild(pPr, "a:lnSpc") : null;
            var lnPct = ln is not null ? FirstChild(ln, "a:spcPct") : null;
            var lnPts = ln is not null ? FirstChild(ln, "a:spcPts") : null;
            string? algn = pPr?.Attr("algn");
            double Emu(string key) { double n = Js.ParseInt(pPr?.Attr(key) ?? "0"); return JsNumber.Round((double.IsNaN(n) ? 0 : n) / DocxModel.EmuPerTwip); }
            double indent = Emu("indent");
            var spacing = new SpacingSpec
            {
                Before = k == 0 && !edges ? 0 : Gap("a:spcBef"),
                After = k == aps.Count - 1 && !edges ? 0 : Gap("a:spcAft"),
            };
            if (lnPts is not null) { spacing.Line = JsNumber.Round(Num(lnPts) / 5); spacing.LineRule = "exact"; }
            else { spacing.Line = lnPct is not null ? JsNumber.Round((240 * Num(lnPct)) / 100000) : 240; spacing.LineRule = "auto"; }
            var ind = new IndSpec { Left = Emu("marL"), Right = 0 };
            if (indent < 0) ind.Hanging = -indent; else ind.FirstLine = indent;
            var ppr = new PPr
            {
                Jc = algn == "ctr" ? "center" : algn == "r" ? "right" : algn == "just" ? "both" : algn == "dist" ? "distribute" : "left",
                Spacing = spacing,
                Ind = ind,
                ContextualSpacing = false,
                RPr = mark,
            };
            outp.Add(new Paragraph { Runs = runs, Props = ParaPropsFromPPr(ppr), Ppr = ppr });
        }
        return outp;
    }

    /// <summary>SmartArt: o Word grava junto o desenho pronto (word/diagrams/drawingN.xml, apontado
    /// pelo dsp:dataModelExt da parte de dados). Vira um grupo: cada dsp:sp é uma forma e
    /// o texto vai numa caixa no retângulo dsp:txXfrm (oráculo dgmdraw).</summary>
    private static Run? ReadDiagram(XmlElement gd, ReadContext ctx, double wTw, double hTw)
    {
        var relIds = FirstChild(gd, "dgm:relIds");
        var data = relIds is not null ? ctx.ResolvePart?.Invoke(relIds.Attr("r:dm") ?? "") : null;
        var ext = data is not null ? FindDeep(data, "dsp:dataModelExt") : null;
        var drawing = ext is not null ? ctx.ResolvePart?.Invoke(ext.Attr("relId") ?? "") : null;
        var tree = drawing is not null ? FindDeep(drawing, "dsp:spTree") : null;
        if (tree is null) return null;
        // cor do texto: o desenho não a grava quando vem do esquema de cores (r:cs) — rótulo de
        // estilo do ponto de apresentação (dsp:sp@modelId) → txFillClrLst
        var colors = relIds is not null ? ctx.ResolvePart?.Invoke(relIds.Attr("r:cs") ?? "") : null;
        var lbls = new Dictionary<string, XmlElement>(StringComparer.Ordinal);
        if (colors is not null) foreach (var l in ChildElements(colors, "dgm:styleLbl")) lbls[l.Attr("name") ?? ""] = l;
        var txFill = new Dictionary<string, ColorSpec?>(StringComparer.Ordinal);
        var ptLst = data is not null ? FindDeep(data, "dgm:ptLst") : null;
        if (ptLst is not null)
        {
            foreach (var pt in ChildElements(ptLst, "dgm:pt"))
            {
                var pr = FirstChild(pt, "dgm:prSet");
                XmlElement? lst = pr is not null && lbls.TryGetValue(pr.Attr("presStyleLbl") ?? "", out var lv) ? lv : null;
                var fills = lst is not null ? FirstChild(lst, "dgm:txFillClrLst") : null;
                var cs = fills is not null ? ChildElements(fills).ToList() : new List<XmlElement>();
                if (cs.Count == 0 || !Js.Truthy(pt.Attr("modelId"))) continue;
                double iv = Js.ParseInt(pr!.Attr("presStyleIdx") ?? "0");
                int i = double.IsNaN(iv) ? 0 : (int)iv;
                var c = fills!.Attr("meth") == "cycle" ? cs[((i % cs.Count) + cs.Count) % cs.Count] : cs[Math.Max(0, Math.Min(i, cs.Count - 1))];
                var wrapper = new XmlElement("x");
                wrapper.Children.Add(c);
                txFill[pt.Attr("modelId")!] = DmlRunColor(wrapper);
            }
        }
        double N(XmlElement? el, string k) { double n = Js.ParseInt(el?.Attr(k) ?? "0"); return (double.IsNaN(n) ? 0 : n) / DocxModel.EmuPerTwip; }
        (double X, double Y, double W, double H) Rect(XmlElement xf)
        {
            var off = FirstChild(xf, "a:off");
            var e = FirstChild(xf, "a:ext");
            return (N(off, "x"), N(off, "y"), N(e, "cx"), N(e, "cy"));
        }
        var items = new List<GroupItem>();
        void Walk(XmlElement parent)
        {
            foreach (var sp in ChildElements(parent))
            {
                if (sp.Name == "dsp:grpSp") { Walk(sp); continue; }
                var spPr = sp.Name == "dsp:sp" ? FirstChild(sp, "dsp:spPr") : null;
                var xf = spPr is not null ? FirstChild(spPr, "a:xfrm") : null;
                if (xf is null) continue;
                var box = Rect(xf);
                var styleEl = FirstChild(sp, "dsp:style");
                var style = DrawingReader.ReadSpPr(spPr, styleEl);
                if (Js.Truthy(style.Fill) || style.Line is not null || style.Gradient is not null)
                    items.Add(new GroupItem { X = box.X, Y = box.Y, W = box.W, H = box.H, Run = new Run { Text = Obj, Shape = new DrawingShape { Style = style, WidthTwips = box.W, HeightTwips = box.H } } });
                var body = FirstChild(sp, "dsp:txBody");
                var paras = body is not null ? DmlParagraphs(body, styleEl, txFill.TryGetValue(sp.Attr("modelId") ?? "", out var tf) ? tf : null) : new List<Paragraph>();
                if (body is null || !paras.Any(p => p.Runs.Count > 0)) continue;
                var txf = FirstChild(sp, "dsp:txXfrm");
                var tbox = txf is not null ? Rect(txf) : box;
                var tb = new DrawingTextbox { Paras = paras, Blocks = paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList(), WidthTwips = tbox.W, HeightTwips = tbox.H };
                BodyPrOf(tb, FirstChild(body, "a:bodyPr"));
                double rot = Js.ParseInt((txf ?? xf).Attr("rot") ?? "0");
                if (rot != 0 && !double.IsNaN(rot)) tb.Rot = rot / 60000;
                items.Add(new GroupItem { X = tbox.X, Y = tbox.Y, W = tbox.W, H = tbox.H, Run = new Run { Text = Obj, Textbox = tb } });
            }
        }
        Walk(tree);
        return items.Count > 0 ? new Run { Text = Obj, Group = new DrawingGroup { WidthTwips = wTw, HeightTwips = hTw, Items = items } } : null;
    }

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
        // SmartArt com o desenho gravado pelo Word: grupo de formas e caixas (oráculo dgmdraw)
        var run = obj is not null ? ReadGraphicObject(obj, ctx, wTw, hTw)
            : (gd is not null ? ReadDiagram(gd, ctx, wTw, hTw) : null) ?? new Run { Text = Obj, Shape = new DrawingShape { Style = new ShapeStyle { Geom = "rect" }, WidthTwips = wTw, HeightTwips = hTw } };
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
        // grupo em linha (wpg e SmartArt): a margem de efeitos também entra na caixa do grupo,
        // como em imagem/forma (oráculo effext; corpus t43)
        if (ee is not null && run.Group is not null)
        {
            double E2(string k) { double n = Js.ParseInt(ee.Attr(k) ?? "0"); return (double.IsNaN(n) ? 0 : n) / DocxModel.EmuPerTwip; }
            foreach (var it in run.Group.Items) { it.X += E2("l"); it.Y += E2("t"); }
            run.Group.WidthTwips += E2("l") + E2("r");
            run.Group.HeightTwips += E2("t") + E2("b");
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
        // formatação da imagem (Formato da Imagem): contorno, efeitos, 3D, ajustes, texto alt
        if (run.Image is not null && PictureXml.ReadPictureFormat(drawing) is { } fmt) run.Image.Format = fmt;
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

    /// <summary>O que um envoltório passa aos runs de dentro (hyperlink, campo, revisão).</summary>
    private sealed class Inherit
    {
        public string? Link;
        public string? Field;
        public RevisionInfo? Ins;
        public RevisionInfo? Del;

        /// <summary>{ ...inherit } (raso).</summary>
        public static Inherit From(Inherit? i) => new() { Link = i?.Link, Field = i?.Field, Ins = i?.Ins, Del = i?.Del };
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
                case "w:bookmarkEnd":
                    {
                        bool end = child.Name == "w:bookmarkEnd";
                        bool hasId = int.TryParse(child.Attr("w:id") ?? "", System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out int id);
                        ctx.BookmarkIds ??= new Dictionary<int, string>();
                        string? name = end ? (hasId && ctx.BookmarkIds.TryGetValue(id, out var nm) ? nm : null) : child.Attr("w:name");
                        if (!Js.Truthy(name)) break;
                        int offset = 0;
                        foreach (var r in runs) offset += r.Text.Length;
                        if (end) { ctx.BookmarkIds.Remove(id); ctx.OnBookmarkEnd?.Invoke(name!, offset); }
                        else { if (hasId) ctx.BookmarkIds[id] = name!; ctx.OnBookmark?.Invoke(name!, offset); }
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
                        var hi = Inherit.From(inherit);
                        hi.Link = link;
                        ReadRunsInto(runs, child, ctx, hi);
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
                        if (text.Length == 0) break;
                        var mrun = new Run { Text = text, Props = new RunProps { Italic = true, IsMath = true } };
                        // equação de exibição: cada m:oMath numa linha
                        if (child.Name == "m:oMathPara")
                        {
                            var paraPr = FirstChild(child, "m:oMathParaPr");
                            string? mjc = paraPr is not null ? FirstChild(paraPr, "m:jc")?.Attr("m:val") : null;
                            var nodes = new List<MathNode>();
                            foreach (var om in ChildElements(child))
                            {
                                if (om.Name != "m:oMath") continue;
                                if (nodes.Count > 0) nodes.Add(new MathBreak());
                                ReadMathNodes(om, nodes);
                            }
                            mrun.Math = new MathZone { Nodes = nodes, Jc = Js.Truthy(mjc) ? mjc : null };
                        }
                        RunTarget(ctx, runs)?.Add(mrun);
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
                case "w:customXml":
                case "w:dir":
                case "w:bdo":
                    ReadRunsInto(runs, child, ctx, inherit);
                    break;
                // revisões: o texto inserido E o excluído ficam no modelo, marcados nas props
                // (a visão final esconde o excluído — motor de layout)
                case "w:ins":
                case "w:moveTo":
                    {
                        var ri = Inherit.From(inherit);
                        ri.Ins = OoxmlProps.ReadRevisionInfo(child);
                        ReadRunsInto(runs, child, ctx, ri);
                        break;
                    }
                case "w:del":
                case "w:moveFrom":
                    {
                        var rd = Inherit.From(inherit);
                        rd.Del = OoxmlProps.ReadRevisionInfo(child);
                        ReadRunsInto(runs, child, ctx, rd);
                        break;
                    }
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

    /// <summary>Conteúdo de uma equação OMML (ver MathNode).</summary>
    private static List<MathNode> ReadMathNodes(XmlElement el, List<MathNode>? outp = null)
    {
        outp ??= new List<MathNode>();
        foreach (var c in ChildElements(el))
        {
            switch (c.Name)
            {
                case "m:r":
                case "w:r":
                    {
                        var mrPr = FirstChild(c, "m:rPr");
                        // m:nor (texto normal): fora do alfabeto matemático, como o estilo "p"
                        string? sty = mrPr is not null ? (FirstChild(mrPr, "m:nor") is not null ? "p" : FirstChild(mrPr, "m:sty")?.Attr("m:val")) : null;
                        var wrPr = FirstChild(c, "w:rPr");
                        var rpr = wrPr is not null ? OoxmlProps.ReadRPr(wrPr) : null;
                        var text = new StringBuilder();
                        void Flush()
                        {
                            if (text.Length > 0) outp.Add(new MathRun { Text = text.ToString(), Sty = Js.Truthy(sty) ? sty : null, Rpr = rpr });
                            text.Clear();
                        }
                        foreach (var k in ChildElements(c))
                        {
                            if (k.Name == "m:t" || k.Name == "w:t") text.Append(TextContentOf(k));
                            else if (k.Name == "w:br") { Flush(); outp.Add(new MathBreak { Rpr = rpr }); }
                        }
                        Flush();
                        break;
                    }
                case "m:f":
                    {
                        var fPr = FirstChild(c, "m:fPr");
                        string? type = fPr is not null ? FirstChild(fPr, "m:type")?.Attr("m:val") : null;
                        var num = FirstChild(c, "m:num");
                        var den = FirstChild(c, "m:den");
                        outp.Add(new MathFrac { Num = num is not null ? ReadMathNodes(num) : new List<MathNode>(), Den = den is not null ? ReadMathNodes(den) : new List<MathNode>(), Type = Js.Truthy(type) ? type : null });
                        break;
                    }
                case "m:d":
                    {
                        // delimitadores: begChr/sepChr/endChr (padrão "(", "|", ")") em volta dos m:e
                        var dPr = FirstChild(c, "m:dPr");
                        string Chr(string name, string def)
                        {
                            var e = dPr is not null ? FirstChild(dPr, name) : null;
                            return e is not null ? (e.Attr("m:val") ?? "") : def;
                        }
                        string beg = Chr("m:begChr", "("), sep = Chr("m:sepChr", "|"), end = Chr("m:endChr", ")");
                        if (beg.Length > 0) outp.Add(new MathRun { Text = beg, Sty = "p" });
                        int i = 0;
                        foreach (var e in ChildElements(c))
                        {
                            if (e.Name != "m:e") continue;
                            if (i > 0 && sep.Length > 0) outp.Add(new MathRun { Text = sep, Sty = "p" });
                            ReadMathNodes(e, outp);
                            i++;
                        }
                        if (end.Length > 0) outp.Add(new MathRun { Text = end, Sty = "p" });
                        break;
                    }
                default:
                    // propriedades (m:fPr, m:ctrlPr…) ficam de fora; os outros objetos, achatados
                    if (!c.Name.EndsWith("Pr", StringComparison.Ordinal)) ReadMathNodes(c, outp);
                    break;
            }
        }
        return outp;
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
            if (inherit?.Ins is not null) props.Ins = inherit.Ins;
            if (inherit?.Del is not null) props.Del = inherit.Del;
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
                    if (inherit?.Ins is not null) frame.Props.Ins = inherit.Ins;
                    if (inherit?.Del is not null) frame.Props.Del = inherit.Del;
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
            if (child.Name is "w:instrText" or "w:delInstrText")
            {
                var top = stack.Count > 0 ? stack[^1] : null;
                if (top is not null && top.Phase == "instr") top.Instr += TextContentOf(child);
                continue;
            }
            switch (child.Name)
            {
                case "w:t":
                case "w:delText":
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
                        bool custom = child.Attr("w:customMarkFollows") is "1" or "true";
                        var run = Make("", new Run { NoteRef = new NoteRef { Kind = child.Name == "w:footnoteReference" ? "footnote" : "endnote", Id = id, Custom = custom } });
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
            ResolvePart = rid =>
            {
                if (!relMap.TryGetValue(rid, out var rel) || rel.External) return null;
                string? xml = pkg.GetPartText(rel.Target.StartsWith('/') ? rel.Target[1..] : "word/" + rel.Target);
                return Js.Truthy(xml) ? Parse(xml!) : null;
            },
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
        string? pgFmt = pgNumType?.Attr("w:fmt");
        if (Js.Truthy(pgFmt)) sect.PgNumFmt = pgFmt;
        double chapStyle = JsNumber.ParseInt(pgNumType?.Attr("w:chapStyle") ?? "");
        if (chapStyle > 0)
        {
            sect.PgNumChapStyle = (int)Math.Min(chapStyle, int.MaxValue);
            string? sep = pgNumType?.Attr("w:chapSep");
            if (sep is "period" or "colon" or "emDash" or "enDash") sect.PgNumChapSep = sep;
        }
        var fnPr = OoxmlParts.ReadNoteProps(sectEl is not null ? FirstChild(sectEl, "w:footnotePr") : null);
        if (fnPr is not null) sect.FootnotePr = fnPr;
        var enPr = OoxmlParts.ReadNoteProps(sectEl is not null ? FirstChild(sectEl, "w:endnotePr") : null);
        if (enPr is not null) sect.EndnotePr = enPr;
        string? fnCols = sectEl is not null ? FirstChild(sectEl, "w15:footnoteColumns")?.Attr("w:val") : null;
        if (fnCols is not null && JsNumber.ParseInt(fnCols) > 0) sect.FootnoteColumns = (int)Math.Min(JsNumber.ParseInt(fnCols), int.MaxValue);
        return sect;
    }
}
