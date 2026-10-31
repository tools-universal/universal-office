using UniversalOffice.Converter.Processing.Docs.Core;
using static UniversalOffice.Converter.Processing.Docs.Core.MiniXml;

namespace UniversalOffice.Converter.Processing.Docs.Docx;

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

    private static TableBlock ReadTable(XmlElement tblEl, ReadContext ctx)
    {
        var grid = FirstChild(tblEl, "w:tblGrid");
        var gridColsTwips = grid is not null
            ? ChildElements(grid, "w:gridCol").Select(c => JsNumber.ParseIntOr(c.Attr("w:w") ?? "0", 0)).ToList()
            : new List<int>();
        var tblPr = FirstChild(tblEl, "w:tblPr");
        var tblBorders = ReadBorderSet(tblPr is not null ? FirstChild(tblPr, "w:tblBorders") : null, true);
        var rows = new List<TableRow>();
        foreach (var trEl in ChildElements(tblEl, "w:tr"))
        {
            var cells = new List<TableCell>();
            foreach (var tcEl in ChildElements(trEl, "w:tc"))
            {
                var tcPr = FirstChild(tcEl, "w:tcPr");
                string? shd = tcPr is not null ? FirstChild(tcPr, "w:shd")?.Attr("w:fill") : null;
                var tcW = tcPr is not null ? FirstChild(tcPr, "w:tcW") : null;
                var cellBorders = ReadBorderSet(tcPr is not null ? FirstChild(tcPr, "w:tcBorders") : null, true);
                int gridSpan = tcPr is not null
                    ? JsNumber.ParseIntOr(FirstChild(tcPr, "w:gridSpan")?.Attr("w:val") ?? "1", 1)
                    : 1;
                var paragraphs = ChildElements(tcEl, "w:p").Select(p => DocumentReader.ReadParagraph(p, ctx)).ToList();
                var tables = ChildElements(tcEl, "w:tbl").Select(t => ReadTable(t, ctx)).ToList();
                if (paragraphs.Count == 0 && tables.Count == 0) paragraphs.Add(new Paragraph());
                cells.Add(new TableCell
                {
                    Paragraphs = paragraphs,
                    Tables = tables,
                    GridSpan = gridSpan,
                    WidthTwips = tcW is not null && tcW.Attr("w:type") == "dxa"
                        ? JsNumber.ParseIntOr(tcW.Attr("w:w") ?? "0", 0) : null,
                    ShadingHex = !string.IsNullOrEmpty(shd) && shd != "auto" ? shd : null,
                    Borders = cellBorders,
                });
            }
            if (cells.Count > 0) rows.Add(new TableRow { Cells = cells });
        }
        return new TableBlock { Rows = rows, GridColsTwips = gridColsTwips, Borders = tblBorders };
    }

    private static List<Paragraph>? ReadHeaderFooterPart(DocxPackage pkg, string path)
    {
        string? xml = pkg.GetPartText(path);
        if (string.IsNullOrEmpty(xml)) return null;
        var root = Parse(xml!);
        string partName = path[(path.LastIndexOf('/') + 1)..];
        var ctx = DocumentReader.BuildReadContext(pkg, $"word/_rels/{partName}.rels");
        var paras = new List<Paragraph>();
        foreach (var child in ChildElements(root))
        {
            if (child.Name == "w:p") paras.Add(DocumentReader.ReadParagraph(child, ctx));
            else if (child.Name == "w:tbl")
            {
                var t = ReadTable(child, ctx);
                foreach (var r in t.Rows)
                    foreach (var c in r.Cells)
                        paras.AddRange(c.Paragraphs);
            }
        }
        return paras;
    }

    private static Dictionary<int, List<Paragraph>> ReadNotesPart(DocxPackage pkg, string path, string elementName)
    {
        var outp = new Dictionary<int, List<Paragraph>>();
        string? xml = pkg.GetPartText(path);
        if (string.IsNullOrEmpty(xml)) return outp;
        var root = Parse(xml!);
        string partName = path[(path.LastIndexOf('/') + 1)..];
        var ctx = DocumentReader.BuildReadContext(pkg, $"word/_rels/{partName}.rels");
        foreach (var note in ChildElements(root, elementName))
        {
            int id = JsNumber.ParseIntOr(note.Attr("w:id") ?? "0", 0);
            string? type = note.Attr("w:type");
            if (type is "separator" or "continuationSeparator") continue;
            outp[id] = ChildElements(note, "w:p").Select(p => DocumentReader.ReadParagraph(p, ctx)).ToList();
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

        // rels do documento p/ resolver headers/footers por r:id
        string? relsXml = pkg.GetPartText("word/_rels/document.xml.rels");
        var relTargets = new Dictionary<string, string>(StringComparer.Ordinal);
        if (relsXml is not null)
        {
            foreach (var rel in ChildElements(Parse(relsXml), "Relationship"))
            {
                string? id = rel.Attr("Id");
                string? target = rel.Attr("Target");
                if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(target))
                {
                    string t = target!.StartsWith("./", StringComparison.Ordinal) ? target[2..] : target!;
                    relTargets[id!] = "word/" + t;
                }
            }
        }

        (HeaderFooterSet Set, List<HfRef> Refs) ReadHfSet(XmlElement sectEl, string kind)
        {
            var set = new HeaderFooterSet();
            var refs = new List<HfRef>();
            foreach (var refEl in ChildElements(sectEl, "w:" + kind))
            {
                string? rid = refEl.Attr("r:id");
                string type = refEl.Attr("w:type") ?? "default";
                string? target = rid is not null && relTargets.TryGetValue(rid, out var t) ? t : null;
                if (target is not null && rid is not null)
                {
                    var paras = ReadHeaderFooterPart(pkg, target);
                    if (paras is not null)
                    {
                        switch (type)
                        {
                            case "first": set.First = paras; break;
                            case "even": set.Even = paras; break;
                            default: set.Default = paras; break;
                        }
                        refs.Add(new HfRef { Type = type, Rid = rid, Path = target });
                    }
                }
            }
            return (set, refs);
        }

        var blocks = new List<Block>();
        var sections = new List<Section>();
        var bookmarks = new Dictionary<string, int>(StringComparer.Ordinal);
        ctx.OnBookmark = name =>
        {
            if (!bookmarks.ContainsKey(name)) bookmarks[name] = blocks.Count;
        };
        int sectionStart = 0;

        void CloseSection(XmlElement sectEl, int endBlock)
        {
            var h = ReadHfSet(sectEl, "headerReference");
            var f = ReadHfSet(sectEl, "footerReference");
            sections.Add(new Section
            {
                SectPr = DocumentReader.ReadSectPr(sectEl),
                BlockStart = sectionStart,
                BlockEnd = endBlock,
                Headers = h.Set,
                Footers = f.Set,
                HeaderRefs = h.Refs,
                FooterRefs = f.Refs,
            });
            sectionStart = endBlock + 1;
        }

        foreach (var child in ChildElements(body))
        {
            if (child.Name == "w:p")
            {
                var para = DocumentReader.ReadParagraph(child, ctx);
                blocks.Add(new ParagraphBlock { Paragraph = para });
                var pPr = FirstChild(child, "w:pPr");
                var sectEl = pPr is not null ? FirstChild(pPr, "w:sectPr") : null;
                if (sectEl is not null) CloseSection(sectEl, blocks.Count - 1);
            }
            else if (child.Name == "w:tbl")
                blocks.Add(ReadTable(child, ctx));
            else if (child.Name == "w:sectPr")
                CloseSection(child, blocks.Count - 1);
            else if (child.Name == "w:sdt")
            {
                var content = FirstChild(child, "w:sdtContent");
                if (content is not null)
                {
                    foreach (var inner in ChildElements(content))
                    {
                        if (inner.Name == "w:p")
                            blocks.Add(new ParagraphBlock { Paragraph = DocumentReader.ReadParagraph(inner, ctx) });
                        else if (inner.Name == "w:tbl")
                            blocks.Add(ReadTable(inner, ctx));
                    }
                }
            }
        }
        if (sections.Count == 0)
            CloseSection(FirstChild(body, "w:sectPr") ?? new XmlElement("w:sectPr"), blocks.Count - 1);
        if (blocks.Count == 0) blocks.Add(new ParagraphBlock { Paragraph = new Paragraph() });

        return new FullDocument
        {
            Blocks = blocks,
            Sections = sections,
            Footnotes = ReadNotesPart(pkg, "word/footnotes.xml", "w:footnote"),
            Endnotes = ReadNotesPart(pkg, "word/endnotes.xml", "w:endnote"),
            Comments = ReadComments(pkg),
            Styles = DocxStylesReader.ReadStyles(pkg),
            Bookmarks = bookmarks,
        };
    }
}
