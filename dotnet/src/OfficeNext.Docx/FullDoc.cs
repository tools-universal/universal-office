using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Modelo completo do documento (blocos parágrafo/tabela, seções com
/// headers/footers, notas e comentários) — porta de docx-core/src/fulldoc.ts.
/// </summary>
public static class FullDocReader
{
    private static TableBorders? ReadBorderSet(XmlElement? el, bool inside)
    {
        if (el is null) return null;
        var outp = new TableBorders();
        bool any = false;
        var sides = inside
            ? new[] { "top", "left", "bottom", "right", "insideH", "insideV" }
            : new[] { "top", "left", "bottom", "right" };
        foreach (var side in sides)
        {
            var edge = DocxModel.ReadBorderEdge(FirstChild(el, "w:" + side));
            if (edge is null) continue;
            any = true;
            switch (side)
            {
                case "top": outp.Top = edge; break;
                case "left": outp.Left = edge; break;
                case "bottom": outp.Bottom = edge; break;
                case "right": outp.Right = edge; break;
                case "insideH": outp.InsideH = edge; break;
                case "insideV": outp.InsideV = edge; break;
            }
        }
        return any ? outp : null;
    }

    /// <summary>Linhas/células podem vir dentro de w:sdt ou w:customXml (controles de conteúdo).</summary>
    private static List<XmlElement> Unwrap(XmlElement el, string name)
    {
        var outp = new List<XmlElement>();
        foreach (var c in ChildElements(el))
        {
            if (c.Name == name) outp.Add(c);
            else if (c.Name == "w:sdt")
            {
                var content = FirstChild(c, "w:sdtContent");
                if (content is not null) outp.AddRange(Unwrap(content, name));
            }
            else if (c.Name == "w:customXml") outp.AddRange(Unwrap(c, name));
        }
        return outp;
    }

    /// <summary>Blocos (w:p / w:tbl) de um container, na ordem, atravessando sdt/customXml.</summary>
    public static List<Block> ReadBlocksOf(XmlElement container, ReadContext ctx)
    {
        var outp = new List<Block>();
        foreach (var c in ChildElements(container))
        {
            if (c.Name == "w:p") outp.Add(new ParagraphBlock { Paragraph = DocumentReader.ReadParagraph(c, ctx) });
            else if (c.Name == "w:tbl") outp.Add(ReadTable(c, ctx));
            else if (c.Name == "w:sdt")
            {
                var content = FirstChild(c, "w:sdtContent");
                if (content is not null) outp.AddRange(ReadBlocksOf(content, ctx));
            }
            else if (c.Name == "w:customXml") outp.AddRange(ReadBlocksOf(c, ctx));
        }
        return outp;
    }

    private static TableBlock ReadTable(XmlElement tblEl, ReadContext ctx)
    {
        var grid = FirstChild(tblEl, "w:tblGrid");
        var gridColsTwips = grid is not null
            ? ChildElements(grid, "w:gridCol").Select(c => JsNumber.ParseIntOr(c.Attr("w:w") ?? "0", 0)).ToList()
            : new List<int>();
        var tblPrEl = FirstChild(tblEl, "w:tblPr");
        var tblBorders = ReadBorderSet(tblPrEl is not null ? FirstChild(tblPrEl, "w:tblBorders") : null, true);
        var rows = new List<TableRow>();
        foreach (var trEl in Unwrap(tblEl, "w:tr"))
        {
            var cells = new List<TableCell>();
            foreach (var tcEl in Unwrap(trEl, "w:tc"))
            {
                var tcPrEl = FirstChild(tcEl, "w:tcPr");
                var tcPr = OoxmlProps.ReadTcPr(tcPrEl);
                string? shd = tcPrEl is not null ? FirstChild(tcPrEl, "w:shd")?.Attr("w:fill") : null;
                var tcW = tcPrEl is not null ? FirstChild(tcPrEl, "w:tcW") : null;
                var cellBorders = ReadBorderSet(tcPrEl is not null ? FirstChild(tcPrEl, "w:tcBorders") : null, true);
                var blocks = ReadBlocksOf(tcEl, ctx);
                if (!blocks.Any(bl => bl is ParagraphBlock)) blocks.Add(new ParagraphBlock { Paragraph = new Paragraph() });
                var paragraphs = blocks.OfType<ParagraphBlock>().Select(bl => bl.Paragraph).ToList();
                var tables = blocks.OfType<TableBlock>().ToList();
                double gs = tcPr?.GridSpan ?? 1;
                var cell = new TableCell
                {
                    Paragraphs = paragraphs,
                    Tables = tables,
                    GridSpan = double.IsFinite(gs) ? (int)gs : 1,
                    WidthTwips = tcW is not null && tcW.Attr("w:type") == "dxa"
                        ? JsNumber.ParseIntOr(tcW.Attr("w:w") ?? "0", 0) : null,
                    ShadingHex = Js.Truthy(shd) && shd != "auto" ? shd : null,
                    Borders = cellBorders,
                    Blocks = blocks,
                };
                if (tcPr is not null) cell.TcPr = tcPr;
                cells.Add(cell);
            }
            if (cells.Count > 0)
            {
                var row = new TableRow { Cells = cells };
                var trPr = OoxmlProps.ReadTrPr(FirstChild(trEl, "w:trPr"));
                if (trPr is not null) row.TrPr = trPr;
                var ex = OoxmlProps.ReadTblPr(FirstChild(trEl, "w:tblPrEx"));
                if (ex is not null) row.TblPrEx = ex;
                rows.Add(row);
            }
        }
        var table = new TableBlock { Rows = rows, GridColsTwips = gridColsTwips, Borders = tblBorders };
        var tblPr = OoxmlProps.ReadTblPr(tblPrEl);
        if (tblPr is not null) table.TblPr = tblPr;
        return table;
    }

    private sealed class HfPart
    {
        public List<Paragraph> Paras = new();
        public List<Block> Blocks = new();
    }

    private static HfPart? ReadHeaderFooterPart(DocxPackage pkg, string path)
    {
        string? xml = pkg.GetPartText(path);
        if (string.IsNullOrEmpty(xml)) return null;
        var root = Parse(xml!);
        string partName = path[(path.LastIndexOf('/') + 1)..];
        var ctx = DocumentReader.BuildReadContext(pkg, $"word/_rels/{partName}.rels");
        ctx.ReadBlocks = ReadBlocksOf;
        var blocks = ReadBlocksOf(root, ctx);
        // modelo de edição (achatado): parágrafos do topo + os das células
        var paras = new List<Paragraph>();
        void Walk(List<Block> bs)
        {
            foreach (var bl in bs)
            {
                if (bl is ParagraphBlock pb) paras.Add(pb.Paragraph);
                else if (bl is TableBlock tb)
                    foreach (var r in tb.Rows)
                        foreach (var c in r.Cells)
                            Walk(c.Blocks ?? new List<Block>());
            }
        }
        Walk(blocks);
        return new HfPart { Paras = paras, Blocks = blocks };
    }

    private static Dictionary<int, List<Paragraph>> ReadNotesPart(
        DocxPackage pkg, string path, string elementName, Dictionary<int, List<Block>>? blocksOut)
    {
        var outp = new Dictionary<int, List<Paragraph>>();
        string? xml = pkg.GetPartText(path);
        if (string.IsNullOrEmpty(xml)) return outp;
        var root = Parse(xml!);
        string partName = path[(path.LastIndexOf('/') + 1)..];
        var ctx = DocumentReader.BuildReadContext(pkg, $"word/_rels/{partName}.rels");
        ctx.ReadBlocks = ReadBlocksOf;
        foreach (var note in ChildElements(root, elementName))
        {
            int id = JsNumber.ParseIntOr(note.Attr("w:id") ?? "0", 0);
            string? type = note.Attr("w:type");
            if (type is "separator" or "continuationSeparator" or "continuationNotice") continue;
            var blocks = ReadBlocksOf(note, ctx);
            outp[id] = blocks.OfType<ParagraphBlock>().Select(bl => bl.Paragraph).ToList();
            if (blocksOut is not null) blocksOut[id] = blocks;
        }
        return outp;
    }

    private static List<CommentInfo> ReadComments(DocxPackage pkg)
    {
        string? xml = pkg.GetPartText("word/comments.xml");
        if (string.IsNullOrEmpty(xml)) return new List<CommentInfo>();
        var root = Parse(xml!);
        var ctx = DocumentReader.BuildReadContext(pkg, "word/_rels/comments.xml.rels");
        return ChildElements(root, "w:comment").Select(c => new CommentInfo
        {
            Id = JsNumber.ParseIntOr(c.Attr("w:id") ?? "0", 0),
            Author = c.Attr("w:author"),
            Text = string.Join("\n", ChildElements(c, "w:p")
                .Select(p => string.Concat(DocumentReader.ReadParagraph(p, ctx).Runs.Select(r => r.Text)))),
        }).ToList();
    }

    public static FullDocument ReadFullDocument(DocxPackage pkg)
    {
        var root = Parse(pkg.DocumentXml());
        var body = FirstChild(root, "w:body")
            ?? throw new InvalidDataException("w:document sem w:body");
        var ctx = DocumentReader.BuildReadContext(pkg, "word/_rels/document.xml.rels");
        ctx.ReadBlocks = ReadBlocksOf;

        // rels do documento p/ resolver headers/footers por r:id
        string? relsXml = pkg.GetPartText("word/_rels/document.xml.rels");
        var relTargets = new Dictionary<string, string>(StringComparer.Ordinal);
        if (relsXml is not null)
        {
            foreach (var rel in ChildElements(Parse(relsXml), "Relationship"))
            {
                string? id = rel.Attr("Id");
                string? target = rel.Attr("Target");
                if (Js.Truthy(id) && Js.Truthy(target))
                {
                    string t = target!.StartsWith("./", StringComparison.Ordinal) ? target[2..] : target!;
                    relTargets[id!] = "word/" + t;
                }
            }
        }

        var hfCache = new Dictionary<string, HfPart?>(StringComparer.Ordinal);
        (HeaderFooterSet Set, List<HfRef> Refs, HfBlocks Blocks) ReadHfSet(XmlElement sectEl, string kind)
        {
            var set = new HeaderFooterSet();
            var refs = new List<HfRef>();
            var blocks = new HfBlocks();
            foreach (var refEl in ChildElements(sectEl, "w:" + kind))
            {
                string? rid = refEl.Attr("r:id");
                string type = refEl.Attr("w:type") ?? "default";
                string? target = Js.Truthy(rid) && relTargets.TryGetValue(rid!, out var t) ? t : null;
                if (target is not null && Js.Truthy(rid))
                {
                    if (!hfCache.ContainsKey(target)) hfCache[target] = ReadHeaderFooterPart(pkg, target);
                    var part = hfCache[target];
                    if (part is not null)
                    {
                        // tipo desconhecido: o JS grava numa chave que ninguém lê
                        switch (type)
                        {
                            case "default": set.Default = part.Paras; blocks.Default = part.Blocks; break;
                            case "first": set.First = part.Paras; blocks.First = part.Blocks; break;
                            case "even": set.Even = part.Paras; blocks.Even = part.Blocks; break;
                        }
                        refs.Add(new HfRef { Type = type, Rid = rid!, Path = target });
                    }
                }
            }
            return (set, refs, blocks);
        }

        var blocksAll = new List<Block>();
        var sections = new List<Section>();
        var bookmarks = new Dictionary<string, int>(StringComparer.Ordinal);
        var bookmarkOrder = new List<string>();
        var bookmarkOffsets = new Dictionary<string, int>(StringComparer.Ordinal);
        var bookmarkEnds = new Dictionary<string, (int Block, int Offset)>(StringComparer.Ordinal);
        ctx.OnBookmark = (name, offset) =>
        {
            if (bookmarks.ContainsKey(name)) return;
            bookmarks[name] = blocksAll.Count;
            bookmarkOffsets[name] = offset;
            bookmarkOrder.Add(name);
        };
        ctx.OnBookmarkEnd = (name, offset) =>
        {
            if (!bookmarkEnds.ContainsKey(name)) bookmarkEnds[name] = (blocksAll.Count, offset);
        };
        int sectionStart = 0;

        void CloseSection(XmlElement sectEl, int endBlock)
        {
            var h = ReadHfSet(sectEl, "headerReference");
            var f = ReadHfSet(sectEl, "footerReference");
            sections.Add(new Section
            {
                SectPr = DocumentReader.ReadSectPr(sectEl),
                Sect = ReadSectionProps(sectEl),
                BlockStart = sectionStart,
                BlockEnd = endBlock,
                Headers = h.Set,
                Footers = f.Set,
                HeaderRefs = h.Refs,
                FooterRefs = f.Refs,
                HeaderBlocks = h.Blocks,
                FooterBlocks = f.Blocks,
            });
            sectionStart = endBlock + 1;
        }

        List<(Block Block, XmlElement? SectEl)> ReadBlocksWithSections(XmlElement container)
        {
            var outp = new List<(Block, XmlElement?)>();
            foreach (var c in ChildElements(container))
            {
                if (c.Name == "w:p")
                {
                    var pPr = FirstChild(c, "w:pPr");
                    var sectEl = pPr is not null ? FirstChild(pPr, "w:sectPr") : null;
                    outp.Add((new ParagraphBlock { Paragraph = DocumentReader.ReadParagraph(c, ctx) }, sectEl));
                }
                else if (c.Name == "w:tbl") outp.Add((ReadTable(c, ctx), null));
                else if (c.Name == "w:sdt")
                {
                    var content = FirstChild(c, "w:sdtContent");
                    if (content is not null) outp.AddRange(ReadBlocksWithSections(content));
                }
                else if (c.Name == "w:customXml") outp.AddRange(ReadBlocksWithSections(c));
            }
            return outp;
        }

        foreach (var child in ChildElements(body))
        {
            if (child.Name == "w:p")
            {
                var para = DocumentReader.ReadParagraph(child, ctx);
                blocksAll.Add(new ParagraphBlock { Paragraph = para });
                var pPr = FirstChild(child, "w:pPr");
                var sectEl = pPr is not null ? FirstChild(pPr, "w:sectPr") : null;
                if (sectEl is not null) CloseSection(sectEl, blocksAll.Count - 1);
            }
            else if (child.Name == "w:tbl")
                blocksAll.Add(ReadTable(child, ctx));
            else if (child.Name == "w:sectPr")
                CloseSection(child, blocksAll.Count - 1);
            else if (child.Name is "w:sdt" or "w:customXml")
            {
                // sumário etc.: conteúdo de sdt no nível do body (pode conter sectPr em pPr)
                var content = child.Name == "w:sdt" ? FirstChild(child, "w:sdtContent") : child;
                if (content is not null)
                {
                    foreach (var inner in ReadBlocksWithSections(content))
                    {
                        blocksAll.Add(inner.Block);
                        if (inner.SectEl is not null) CloseSection(inner.SectEl, blocksAll.Count - 1);
                    }
                }
            }
        }
        if (sections.Count == 0)
            CloseSection(FirstChild(body, "w:sectPr") ?? new XmlElement("w:sectPr"), blocksAll.Count - 1);
        if (blocksAll.Count == 0) blocksAll.Add(new ParagraphBlock { Paragraph = new Paragraph() });

        var footnoteBlocks = new Dictionary<int, List<Block>>();
        var endnoteBlocks = new Dictionary<int, List<Block>>();
        return new FullDocument
        {
            Blocks = blocksAll,
            Sections = sections,
            Footnotes = ReadNotesPart(pkg, "word/footnotes.xml", "w:footnote", footnoteBlocks),
            Endnotes = ReadNotesPart(pkg, "word/endnotes.xml", "w:endnote", endnoteBlocks),
            Comments = ReadComments(pkg),
            Styles = DocxStylesReader.ReadStyles(pkg),
            Bookmarks = bookmarks,
            BookmarkOrder = bookmarkOrder,
            BookmarkOffsets = bookmarkOffsets,
            BookmarkEnds = bookmarkEnds,
            Formatting = OoxmlParts.ReadDocFormatting(pkg),
            FootnoteBlocks = footnoteBlocks,
            EndnoteBlocks = endnoteBlocks,
            CoreProps = ReadCoreProps(pkg),
            Background = ReadBackground(root, ctx),
        };
    }

    /// <summary>Cor de fundo da página (w:document/w:background) com o efeito de preenchimento.</summary>
    private static PageBackground? ReadBackground(XmlElement root, ReadContext ctx)
    {
        var bg = FirstChild(root, "w:background");
        return bg is null ? null : PageBackgroundReader.Read(bg, ctx.ResolveImage);
    }

    /// <summary>Datas do docProps/core.xml (criação, última gravação, última impressão).</summary>
    private static CoreProps? ReadCoreProps(DocxPackage pkg)
    {
        string? xml = pkg.GetPartText("docProps/core.xml");
        if (!Js.Truthy(xml)) return null;
        string? Get(string tag)
        {
            var m = System.Text.RegularExpressions.Regex.Match(xml!, "<" + System.Text.RegularExpressions.Regex.Escape(tag) + "[^>]*>([^<]*)<", System.Text.RegularExpressions.RegexOptions.CultureInvariant);
            return m.Success ? m.Groups[1].Value.Trim() : null;
        }
        string? created = Get("dcterms:created"), modified = Get("dcterms:modified"), lastPrinted = Get("cp:lastPrinted");
        return new CoreProps
        {
            Created = Js.Truthy(created) ? created : null,
            Modified = Js.Truthy(modified) ? modified : null,
            LastPrinted = Js.Truthy(lastPrinted) ? lastPrinted : null,
        };
    }

    /// <summary>w:sectPr → SectionProps (o que o SectPr básico não cobre).</summary>
    public static SectionProps ReadSectionProps(XmlElement sectEl)
    {
        string? V(string n, string a = "w:val") => FirstChild(sectEl, n)?.Attr(a);
        var outp = new SectionProps { Type = V("w:type") ?? "nextPage" };
        var pgSz = FirstChild(sectEl, "w:pgSz");
        string? orient = pgSz?.Attr("w:orient");
        if (orient is "landscape" or "portrait") outp.Orient = orient;
        string? gutter = FirstChild(sectEl, "w:pgMar")?.Attr("w:gutter");
        if (Js.Truthy(gutter)) outp.Gutter = Js.IntOr0(gutter);
        var cols = FirstChild(sectEl, "w:cols");
        if (cols is not null)
        {
            string? eq = cols.Attr("w:equalWidth");
            if (eq is not null) outp.EqualWidth = !(eq == "0" || eq == "false");
            var defs = ChildElements(cols, "w:col")
                .Select(c => new ColDef { W = Js.IntOr0(c.Attr("w:w") ?? "0"), Space = Js.IntOr0(c.Attr("w:space") ?? "0") })
                .ToList();
            if (defs.Count > 0) outp.ColDefs = defs;
        }
        string? va = V("w:vAlign");
        if (Js.Truthy(va)) outp.VAlign = va;
        var dg = FirstChild(sectEl, "w:docGrid");
        if (dg is not null)
        {
            outp.DocGrid = new DocGridSpec();
            if (Js.Truthy(dg.Attr("w:type"))) outp.DocGrid.Type = dg.Attr("w:type");
            if (Js.Truthy(dg.Attr("w:linePitch"))) outp.DocGrid.LinePitch = Js.ParseInt(dg.Attr("w:linePitch"));
            if (Js.Truthy(dg.Attr("w:charSpace"))) outp.DocGrid.CharSpace = Js.ParseInt(dg.Attr("w:charSpace"));
        }
        var pb = FirstChild(sectEl, "w:pgBorders");
        if (pb is not null)
        {
            outp.PgBorders = new PgBordersSpec();
            if (Js.Truthy(pb.Attr("w:offsetFrom"))) outp.PgBorders.OffsetFrom = pb.Attr("w:offsetFrom");
            if (Js.Truthy(pb.Attr("w:display"))) outp.PgBorders.Display = pb.Attr("w:display");
            if (Js.Truthy(pb.Attr("w:zOrder"))) outp.PgBorders.ZOrder = pb.Attr("w:zOrder");
            outp.PgBorders.Top = OoxmlProps.ReadBorder(FirstChild(pb, "w:top"));
            outp.PgBorders.Left = OoxmlProps.ReadBorder(FirstChild(pb, "w:left"));
            outp.PgBorders.Bottom = OoxmlProps.ReadBorder(FirstChild(pb, "w:bottom"));
            outp.PgBorders.Right = OoxmlProps.ReadBorder(FirstChild(pb, "w:right"));
        }
        string? fmt = FirstChild(sectEl, "w:pgNumType")?.Attr("w:fmt");
        if (Js.Truthy(fmt)) outp.PgNumFmt = fmt;
        var ln = FirstChild(sectEl, "w:lnNumType");
        if (ln is not null)
        {
            outp.LnNumType = new LnNumTypeSpec();
            if (Js.Truthy(ln.Attr("w:countBy"))) outp.LnNumType.CountBy = Js.ParseInt(ln.Attr("w:countBy"));
            if (Js.Truthy(ln.Attr("w:start"))) outp.LnNumType.Start = Js.ParseInt(ln.Attr("w:start"));
            if (Js.Truthy(ln.Attr("w:restart"))) outp.LnNumType.Restart = ln.Attr("w:restart");
            if (Js.Truthy(ln.Attr("w:distance"))) outp.LnNumType.Distance = Js.ParseInt(ln.Attr("w:distance"));
        }
        if (FirstChild(sectEl, "w:bidi") is not null) outp.Bidi = true;
        if (FirstChild(sectEl, "w:rtlGutter") is not null) outp.RtlGutter = true;
        if (FirstChild(sectEl, "w:formProt") is not null) outp.FormProt = true;
        if (FirstChild(sectEl, "w:noEndnote") is not null) outp.NoEndnote = true;
        return outp;
    }
}
