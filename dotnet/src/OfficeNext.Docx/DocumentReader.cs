using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>Contexto de leitura (resolvers de imagem/link) — espelho de ReadContext do JS.</summary>
public sealed class ReadContext
{
    public required Func<string, (byte[] Data, string Ext)?> ResolveImage { get; init; }
    public required Func<string, string?> ResolveLink { get; init; }
    /// <summary>Comentários abertos (commentRangeStart sem End) — atravessa parágrafos.</summary>
    public HashSet<int>? ActiveComments;
    /// <summary>Ordem de inserção dos comentários ativos (o JS usa Set, que preserva ordem).</summary>
    public List<int> ActiveCommentOrder = new();
    public Action<string>? OnBookmark;
    public FieldState? FieldState;

    public void AddActiveComment(int id)
    {
        if (ActiveComments is null) return;
        if (ActiveComments.Add(id)) ActiveCommentOrder.Add(id);
    }

    public void RemoveActiveComment(int id)
    {
        if (ActiveComments is null) return;
        if (ActiveComments.Remove(id)) ActiveCommentOrder.Remove(id);
    }

    public List<int> SnapshotActiveComments() => new(ActiveCommentOrder);
}

public sealed class FieldState
{
    public string Instr = "";
    public string Phase = "instr"; // instr | result
    public string Result = "";
}

/// <summary>Leitura de parágrafos/runs/sectPr — porta de docx-core/src/document.ts.</summary>
public static class DocumentReader
{
    private static bool OnOff(XmlElement? el)
    {
        if (el is null) return false;
        string? v = el.Attr("w:val");
        return v != "0" && v != "false" && v != "none";
    }

    private static RunProps ReadRunProps(XmlElement? rPr)
    {
        var p = new RunProps();
        if (rPr is null) return p;
        foreach (var el in ChildElements(rPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:b": p.Bold = OnOff(el); break;
                case "w:i": p.Italic = OnOff(el); break;
                case "w:u":
                    p.Underline = val is not null && val != "none";
                    if (val is "double" or "dotted" or "dash" or "wave" or "thick") p.UnderlineStyle = val;
                    if (el.Attr("w:color") is string uc && uc != "auto") p.UnderlineColor = uc;
                    break;
                case "w:strike": p.Strike = OnOff(el); break;
                case "w:dstrike": p.DoubleStrike = OnOff(el); break;
                case "w:caps": p.AllCaps = OnOff(el); break;
                case "w:smallCaps": p.SmallCaps = OnOff(el); break;
                case "w:vertAlign":
                    if (val is "superscript" or "subscript") p.VertAlign = val;
                    break;
                case "w:sz": if (!string.IsNullOrEmpty(val)) p.SzHalfPt = JsNumber.ParseIntOr(val, 0); break;
                case "w:color": if (!string.IsNullOrEmpty(val) && val != "auto") p.Color = val; break;
                case "w:highlight": if (!string.IsNullOrEmpty(val) && val != "none") p.Highlight = val; break;
                case "w:rFonts": p.FontAscii = el.Attr("w:ascii"); break;
                case "w:spacing": if (!string.IsNullOrEmpty(val)) p.CharSpacingTwips = JsNumber.ParseIntOr(val, 0); break;
            }
        }
        return p;
    }

    private static XmlElement? FindDeep(XmlElement el, string name)
    {
        foreach (var c in ChildElements(el))
        {
            if (c.Name == name) return c;
            var found = FindDeep(c, name);
            if (found is not null) return found;
        }
        return null;
    }

    private static string TextContentOf(XmlElement el) => TextContent(el);

    private static InlineImage? ReadDrawing(XmlElement drawing, Func<string, (byte[] Data, string Ext)?> resolveImage)
    {
        var anchor = FirstChild(drawing, "wp:anchor");
        var extent = FindDeep(drawing, "wp:extent");
        var blip = FindDeep(drawing, "a:blip");
        string? rid = blip?.Attr("r:embed");
        if (extent is null || rid is null) return null;
        var media = resolveImage(rid);
        if (media is null) return null;
        var img = new InlineImage
        {
            Data = media.Value.Data,
            Ext = media.Value.Ext,
            WidthTwips = (double)JsNumber.ParseIntOr(extent.Attr("cx") ?? "0", 0) / DocxModel.EmuPerTwip,
            HeightTwips = (double)JsNumber.ParseIntOr(extent.Attr("cy") ?? "0", 0) / DocxModel.EmuPerTwip,
        };
        if (anchor is not null)
        {
            img.Floating = true;
            var posH = FirstChild(anchor, "wp:positionH");
            var posV = FirstChild(anchor, "wp:positionV");
            var offH = posH is not null ? FirstChild(posH, "wp:posOffset") : null;
            var offV = posV is not null ? FirstChild(posV, "wp:posOffset") : null;
            if (offH is not null) img.OffsetXTwips = (double)JsNumber.ParseIntOr(TextContentOf(offH), 0) / DocxModel.EmuPerTwip;
            if (offV is not null) img.OffsetYTwips = (double)JsNumber.ParseIntOr(TextContentOf(offV), 0) / DocxModel.EmuPerTwip;
        }
        return img;
    }

    private sealed class Inherit
    {
        public string? Link;
        public string? Field;
        public Inherit With(string? link = null, string? field = null) =>
            new() { Link = link ?? Link, Field = field ?? Field };
    }

    /// <summary>Lê os runs de um container (w:r diretos, w:hyperlink, m:oMath, w:fldSimple).</summary>
    private static void ReadRunsInto(List<Run> runs, XmlElement container, ReadContext ctx, Inherit? inherit = null)
    {
        foreach (var child in ChildElements(container))
        {
            if (child.Name == "w:commentRangeStart")
                ctx.AddActiveComment(JsNumber.ParseIntOr(child.Attr("w:id") ?? "-1", -1));
            else if (child.Name == "w:commentRangeEnd")
                ctx.RemoveActiveComment(JsNumber.ParseIntOr(child.Attr("w:id") ?? "-1", -1));
            else if (child.Name == "w:bookmarkStart")
            {
                string? name = child.Attr("w:name");
                if (!string.IsNullOrEmpty(name)) ctx.OnBookmark?.Invoke(name!);
            }
            else if (child.Name == "w:r")
                ReadSingleRun(runs, child, ctx, inherit);
            else if (child.Name == "w:hyperlink")
            {
                string? rid = child.Attr("r:id");
                string? anchor = child.Attr("w:anchor");
                string? link = (rid is not null ? ctx.ResolveLink(rid) : null);
                if (string.IsNullOrEmpty(link)) link = anchor is not null ? "#" + anchor : null;
                ReadRunsInto(runs, child, ctx, (inherit ?? new Inherit()).With(link: link));
            }
            else if (child.Name == "w:fldSimple")
            {
                string instr = child.Attr("w:instr") ?? "";
                int before = runs.Count;
                ReadRunsInto(runs, child, ctx, (inherit ?? new Inherit()).With(field: instr));
                if (runs.Count == before)
                    runs.Add(new Run { Text = "", Props = new RunProps(), Field = instr });
            }
            else if (child.Name is "m:oMath" or "m:oMathPara")
            {
                string text = CollectMathText(child);
                if (text.Length > 0)
                    runs.Add(new Run { Text = text, Props = new RunProps { Italic = true, IsMath = true } });
            }
            else if (child.Name == "w:sdt")
            {
                var content = FindDeep(child, "w:sdtContent");
                if (content is not null) ReadRunsInto(runs, content, ctx, inherit);
            }
            else if (child.Name is "w:smartTag" or "w:ins")
                ReadRunsInto(runs, child, ctx, inherit);
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

    private static void ReadSingleRun(List<Run> runs, XmlElement rEl, ReadContext ctx, Inherit? inherit)
    {
        var rProps = ReadRunProps(FirstChild(rEl, "w:rPr"));
        if (!string.IsNullOrEmpty(inherit?.Link))
        {
            rProps.Link = inherit!.Link;
            rProps.Underline = true;
            rProps.Color ??= "0563C1";
        }

        void Flush(string text, InlineImage? image = null, NoteRef? noteRef = null, bool force = false)
        {
            if (text.Length == 0 && !force) return;
            var props = rProps.Clone();
            if (ctx.ActiveComments is { Count: > 0 }) props.CommentIds = ctx.SnapshotActiveComments();
            runs.Add(new Run
            {
                Text = text, Props = props, Image = image, NoteRef = noteRef,
                Field = inherit?.Field,
            });
        }

        var text = new StringBuilder();
        foreach (var child in ChildElements(rEl))
        {
            if (child.Name == "w:fldChar")
            {
                string? type = child.Attr("w:fldCharType");
                if (type == "begin")
                {
                    if (text.Length > 0) { Flush(text.ToString()); text.Clear(); }
                    ctx.FieldState = new FieldState();
                }
                else if (type == "separate")
                {
                    if (ctx.FieldState is not null) ctx.FieldState.Phase = "result";
                }
                else if (type == "end")
                {
                    var fs = ctx.FieldState;
                    ctx.FieldState = null;
                    if (fs is not null)
                    {
                        string instr = $" {fs.Instr.Trim()} ";
                        var props = rProps.Clone();
                        if (ctx.ActiveComments is { Count: > 0 }) props.CommentIds = ctx.SnapshotActiveComments();
                        runs.Add(new Run { Text = fs.Result, Props = props, Field = instr });
                    }
                }
                continue;
            }
            if (child.Name == "w:instrText")
            {
                if (ctx.FieldState is not null) ctx.FieldState.Instr += TextContentOf(child);
                continue;
            }
            if (ctx.FieldState is not null)
            {
                if (child.Name == "w:t" && ctx.FieldState.Phase == "result")
                    ctx.FieldState.Result += string.Concat(child.Children.OfType<string>());
                continue;
            }
            if (child.Name == "w:t")
                text.Append(string.Concat(child.Children.OfType<string>()));
            else if (child.Name == "w:tab") text.Append('\t');
            else if (child.Name is "w:br" or "w:cr")
                text.Append(child.Attr("w:type") == "page" ? '\f' : '\n');
            else if (child.Name == "w:sym")
            {
                if (text.Length > 0) { Flush(text.ToString()); text.Clear(); }
                string hex = child.Attr("w:char") ?? "F0B7";
                int code;
                try { code = Convert.ToInt32(hex, 16); } catch { code = 0xF0B7; }
                if (code <= 0xff) code |= 0xf000;
                var symProps = rProps.Clone();
                symProps.FontAscii = child.Attr("w:font") ?? rProps.FontAscii;
                runs.Add(new Run { Text = char.ConvertFromUtf32(code & 0xFFFF), Props = symProps });
            }
            else if (child.Name is "w:footnoteReference" or "w:endnoteReference")
            {
                if (text.Length > 0) { Flush(text.ToString()); text.Clear(); }
                int id = JsNumber.ParseIntOr(child.Attr("w:id") ?? "0", 0);
                var nProps = rProps.Clone();
                nProps.VertAlign = "superscript";
                runs.Add(new Run
                {
                    Text = "", Props = nProps,
                    NoteRef = new NoteRef { Kind = child.Name == "w:footnoteReference" ? "footnote" : "endnote", Id = id },
                });
            }
            else if (child.Name == "w:drawing")
            {
                if (text.Length > 0) { Flush(text.ToString()); text.Clear(); }
                var image = ReadDrawing(child, ctx.ResolveImage);
                if (image is not null)
                    runs.Add(new Run { Text = "￼", Props = rProps.Clone(), Image = image });
            }
        }
        if (text.Length > 0) Flush(text.ToString());
    }

    private static readonly Regex TocRe = new(@"\bTOC\b", RegexOptions.CultureInvariant);

    public static Paragraph ReadParagraph(XmlElement pEl, ReadContext ctx)
    {
        var props = new ParaProps();
        var pPr = FirstChild(pEl, "w:pPr");
        if (pPr is not null)
        {
            string? jc = FirstChild(pPr, "w:jc")?.Attr("w:val");
            if (jc is "center" or "right" or "both" or "left") props.Alignment = jc;
            props.StyleId = FirstChild(pPr, "w:pStyle")?.Attr("w:val");
            var numPr = FirstChild(pPr, "w:numPr");
            if (numPr is not null)
            {
                int numId = JsNumber.ParseIntOr(FirstChild(numPr, "w:numId")?.Attr("w:val") ?? "0", 0);
                props.Numbering = new NumberingProps
                {
                    Kind = numId == 1002 ? "decimal" : "bullet",
                    Ilvl = JsNumber.ParseIntOr(FirstChild(numPr, "w:ilvl")?.Attr("w:val") ?? "0", 0),
                };
            }
            var ind = FirstChild(pPr, "w:ind");
            if (ind is not null)
            {
                if (!string.IsNullOrEmpty(ind.Attr("w:left"))) props.IndentLeftTwips = JsNumber.ParseIntOr(ind.Attr("w:left"), 0);
                if (!string.IsNullOrEmpty(ind.Attr("w:right"))) props.IndentRightTwips = JsNumber.ParseIntOr(ind.Attr("w:right"), 0);
                if (!string.IsNullOrEmpty(ind.Attr("w:firstLine"))) props.IndentFirstLineTwips = JsNumber.ParseIntOr(ind.Attr("w:firstLine"), 0);
                if (!string.IsNullOrEmpty(ind.Attr("w:hanging"))) props.IndentFirstLineTwips = -JsNumber.ParseIntOr(ind.Attr("w:hanging"), 0);
            }
            var spacing = FirstChild(pPr, "w:spacing");
            if (spacing is not null)
            {
                if (!string.IsNullOrEmpty(spacing.Attr("w:line")) && spacing.Attr("w:lineRule") == "auto")
                    props.LineTwentieths = JsNumber.ParseIntOr(spacing.Attr("w:line"), 0);
                if (!string.IsNullOrEmpty(spacing.Attr("w:after"))) props.SpaceAfterTwips = JsNumber.ParseIntOr(spacing.Attr("w:after"), 0);
                if (!string.IsNullOrEmpty(spacing.Attr("w:before"))) props.SpaceBeforeTwips = JsNumber.ParseIntOr(spacing.Attr("w:before"), 0);
            }
            string? shd = FirstChild(pPr, "w:shd")?.Attr("w:fill");
            if (!string.IsNullOrEmpty(shd) && shd != "auto") props.ShadingHex = shd;
            var tabs = FirstChild(pPr, "w:tabs");
            if (tabs is not null)
            {
                var stops = ChildElements(tabs, "w:tab")
                    .Select(t => new TabStop
                    {
                        PosTwips = JsNumber.ParseIntOr(t.Attr("w:pos") ?? "0", 0),
                        Align = t.Attr("w:val") == "right" ? "right" : "left",
                        Leader = t.Attr("w:leader") == "dot" ? "dot" : null,
                    })
                    .Where(t => t.PosTwips > 0)
                    .ToList();
                if (stops.Count > 0) props.TabStops = stops;
            }
            var pBdr = FirstChild(pPr, "w:pBdr");
            if (pBdr is not null)
            {
                props.BoxBorder = true;
                var borders = new ParagraphBorders
                {
                    Top = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:top")),
                    Left = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:left")),
                    Bottom = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:bottom")),
                    Right = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:right")),
                };
                if (borders.Any) props.Borders = borders;
            }
            if (FirstChild(pPr, "w:pageBreakBefore") is not null) props.PageBreakBefore = true;
            var framePr = FirstChild(pPr, "w:framePr");
            if (framePr?.Attr("w:dropCap") is string dc && dc != "none") props.DropCap = true;
        }
        var runs = new List<Run>();
        ReadRunsInto(runs, pEl, ctx);
        string instr = CollectInstrText(pEl);
        if (TocRe.IsMatch(instr)) props.TocInstr = instr.Trim();
        return new Paragraph { Runs = runs, Props = props };
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
                if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(target))
                {
                    string t = target!.StartsWith("./", StringComparison.Ordinal) ? target[2..] : target!;
                    relMap[id!] = (t, rel.Attr("TargetMode") == "External");
                }
            }
        }
        return new ReadContext
        {
            ActiveComments = new HashSet<int>(),
            FieldState = null,
            ResolveImage = rid =>
            {
                if (!relMap.TryGetValue(rid, out var rel) || rel.External) return null;
                string path = rel.Target.StartsWith('/') ? rel.Target[1..] : "word/" + rel.Target;
                var data = pkg.GetPart(path);
                if (data is null) return null;
                int dot = path.LastIndexOf('.');
                string ext = dot >= 0 ? path[(dot + 1)..].ToLowerInvariant() : "png";
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
        return sect;
    }
}
