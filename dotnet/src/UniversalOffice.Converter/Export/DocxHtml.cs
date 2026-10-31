using System.Text;
using UniversalOffice.Converter.Processing.Docs.Core;
using UniversalOffice.Converter.Processing.Docs.Docx;
using static UniversalOffice.Converter.DocxExportModel;

namespace UniversalOffice.Converter;

public sealed class DocxHtmlOptions
{
    /// <summary>Documento completo com &lt;head&gt;/&lt;style&gt; (default true) ou só o fragmento.</summary>
    public bool FullDocument = true;
    public string? Title;
    public string Images = "data"; // data | omit
}

/// <summary>Exporta o modelo Write para HTML semântico e fluido —
/// porta de write/packages/export/src/html.ts.</summary>
public static class DocxHtml
{
    private sealed class NoteOut
    {
        public string Kind = "footnote";
        public int Id;
        public string Html = "";
    }

    private sealed class Ctx
    {
        public Dictionary<int, CommentInfo> Comments = new();
        public List<int> UsedComments = new();
        public HashSet<int> UsedCommentsSet = new();
        public List<NoteOut> Notes = new();
        public Dictionary<int, List<Paragraph>> Footnotes = new();
        public Dictionary<int, List<Paragraph>> Endnotes = new();
        public string ImagesMode = "data";

        public void UseComment(int id)
        {
            if (UsedCommentsSet.Add(id)) UsedComments.Add(id);
        }
    }

    private static readonly Dictionary<string, string> Highlights = new(StringComparer.Ordinal)
    {
        ["yellow"] = "#ffff00", ["green"] = "#00ff00", ["cyan"] = "#00ffff", ["magenta"] = "#ff00ff",
        ["blue"] = "#0000ff", ["red"] = "#ff0000", ["darkBlue"] = "#000080", ["darkCyan"] = "#008080",
        ["darkGreen"] = "#008000", ["darkMagenta"] = "#800080", ["darkRed"] = "#800000",
        ["darkYellow"] = "#808000", ["darkGray"] = "#808080", ["lightGray"] = "#c0c0c0",
        ["black"] = "#000000", ["white"] = "#ffffff",
    };

    private static string CssBorderStyle(string s)
    {
        if (s is "dashed" or "dotted" or "double") return s;
        if (s is "none" or "nil") return "none";
        return "solid";
    }

    private static string EdgeCss(DocxBorderEdge e)
    {
        double w = Math.Max(0.5, e.SizeEighthPt / 8.0);
        return $"{JsNumber.ToString(w)}pt {CssBorderStyle(e.Style)} {(e.Color is not null ? "#" + e.Color : "#000")}";
    }

    private static string RunHtml(Run run, Ctx ctx)
    {
        if (run.Image is not null)
        {
            if (ctx.ImagesMode == "omit")
            {
                return "<span class=\"wn-img-placeholder\" aria-label=\"imagem\" " +
                    "style=\"display:inline-block;padding:0 .35em;margin:0 .15em;" +
                    "background:rgba(0,0,0,.06);border-radius:4px;font-size:.9em;color:#777\">📷</span>";
            }
            double w = Units.TwipsToPx(run.Image.WidthTwips);
            double h = Units.TwipsToPx(run.Image.HeightTwips);
            return $"<img src=\"{DataUri(run.Image)}\" width=\"{JsNumber.ToString(w)}\" height=\"{JsNumber.ToString(h)}\" alt=\"\" loading=\"lazy\">";
        }
        var p = run.Props;
        if (run.NoteRef is not null)
        {
            int seq = ctx.Notes.Count + 1;
            var map = run.NoteRef.Kind == "footnote" ? ctx.Footnotes : ctx.Endnotes;
            string noteHtml = map.TryGetValue(run.NoteRef.Id, out var paras)
                ? string.Join(" ", paras.Select(np => string.Concat(np.Runs.Select(r => EscapeHtml(r.Text))))).Trim()
                : "";
            ctx.Notes.Add(new NoteOut { Kind = run.NoteRef.Kind, Id = run.NoteRef.Id, Html = EscapeHtml(noteHtml) });
            return $"<sup class=\"wn-note\"><a id=\"noteref-{seq}\" href=\"#note-{seq}\">{seq}</a></sup>";
        }
        string text = EscapeHtml(run.Text);
        if (text.Length == 0) return "";

        var styles = new List<string>();
        if (!string.IsNullOrEmpty(p.Color)) styles.Add($"color:#{p.Color}");
        if (p.SzHalfPt is int sz && sz != 0) styles.Add($"font-size:{JsNumber.ToString(Units.HalfPtToPt(sz))}pt");
        if (!string.IsNullOrEmpty(p.Highlight))
            styles.Add($"background-color:{(Highlights.TryGetValue(p.Highlight!, out var hl) ? hl : p.Highlight)}");
        if (!string.IsNullOrEmpty(p.FontAscii)) styles.Add($"font-family:'{p.FontAscii}',serif");
        if (p.AllCaps) styles.Add("text-transform:uppercase");
        if (p.SmallCaps) styles.Add("font-variant:small-caps");
        if (p.CharSpacingTwips is int cst && cst != 0)
            styles.Add($"letter-spacing:{JsNumber.ToString(Units.TwipsToPt(cst))}pt");

        string inner = text;
        if (p.Bold) inner = $"<strong>{inner}</strong>";
        if (p.Italic) inner = $"<em>{inner}</em>";
        if (p.Strike || p.DoubleStrike) inner = $"<s>{inner}</s>";
        if (p.Underline) inner = $"<u>{inner}</u>";
        if (p.VertAlign == "superscript") inner = $"<sup>{inner}</sup>";
        else if (p.VertAlign == "subscript") inner = $"<sub>{inner}</sub>";
        if (styles.Count > 0) inner = $"<span style=\"{string.Join(";", styles)}\">{inner}</span>";
        if (!string.IsNullOrEmpty(p.Link)) inner = $"<a href=\"{EscapeAttr(p.Link!)}\">{inner}</a>";
        if (p.CommentIds is { Count: > 0 })
        {
            foreach (var id in p.CommentIds) ctx.UseComment(id);
            string tips = string.Join(" | ", p.CommentIds
                .Select(id => ctx.Comments.TryGetValue(id, out var c) ? $"{c.Author ?? "Anônimo"}: {c.Text}" : "")
                .Where(s => s.Length > 0));
            string idsAttr = string.Join(",", p.CommentIds.Select(JsNumber.IntToString));
            inner = $"<span class=\"wn-comment\" data-comment=\"{idsAttr}\" title=\"{EscapeAttr(tips)}\">{inner}</span>";
        }
        return inner;
    }

    private static string ParaStyles(Paragraph p)
    {
        var s = new List<string>();
        string? a = p.Props.Alignment;
        if (a == "center") s.Add("text-align:center");
        else if (a == "right") s.Add("text-align:right");
        else if (a == "both") s.Add("text-align:justify");
        if ((p.Props.IndentLeftTwips ?? 0) != 0)
            s.Add($"margin-left:{JsNumber.ToString(Units.TwipsToPt(p.Props.IndentLeftTwips!.Value))}pt");
        if ((p.Props.IndentRightTwips ?? 0) != 0)
            s.Add($"margin-right:{JsNumber.ToString(Units.TwipsToPt(p.Props.IndentRightTwips!.Value))}pt");
        if ((p.Props.IndentFirstLineTwips ?? 0) != 0)
            s.Add($"text-indent:{JsNumber.ToString(Units.TwipsToPt(p.Props.IndentFirstLineTwips!.Value))}pt");
        if (!string.IsNullOrEmpty(p.Props.ShadingHex)) s.Add($"background-color:#{p.Props.ShadingHex}");
        var b = p.Props.Borders;
        if (b is not null)
        {
            if (b.Top is not null) s.Add($"border-top:{EdgeCss(b.Top)}");
            if (b.Bottom is not null) s.Add($"border-bottom:{EdgeCss(b.Bottom)}");
            if (b.Left is not null) s.Add($"border-left:{EdgeCss(b.Left)}");
            if (b.Right is not null) s.Add($"border-right:{EdgeCss(b.Right)}");
        }
        return string.Join(";", s);
    }

    private static string ParaInner(Paragraph p, Ctx ctx)
    {
        string html = string.Concat(p.Runs.Select(r => RunHtml(r, ctx)));
        return html.Length > 0 ? html : "<br>";
    }

    private static string ParaHtml(Paragraph p, Ctx ctx)
    {
        string inner = ParaInner(p, ctx);
        string st = ParaStyles(p);
        string attr = st.Length > 0 ? $" style=\"{st}\"" : "";
        int lvl = HeadingLevel(p);
        if (lvl > 0) return $"<h{lvl}{attr}>{inner}</h{lvl}>";
        return $"<p{attr}>{inner}</p>";
    }

    private static string TableHtml(TableBlock t, Ctx ctx)
    {
        var html = new StringBuilder("<table>");
        foreach (var row in t.Rows)
        {
            html.Append("<tr>");
            foreach (var cell in row.Cells)
            {
                string span = cell.GridSpan > 1 ? $" colspan=\"{cell.GridSpan}\"" : "";
                string style = !string.IsNullOrEmpty(cell.ShadingHex) ? $" style=\"background-color:#{cell.ShadingHex}\"" : "";
                var inner = new StringBuilder(string.Concat(cell.Paragraphs.Select(p => ParaHtml(p, ctx))));
                foreach (var nt in cell.Tables) inner.Append(TableHtml(nt, ctx));
                html.Append($"<td{span}{style}>{inner}</td>");
            }
            html.Append("</tr>");
        }
        return html + "</table>";
    }

    private sealed class ListItem
    {
        public int Ilvl;
        public string Kind = "bullet";
        public string Inner = "";
    }

    /// <summary>Lista aninhada a partir de uma sequência de parágrafos com numbering.</summary>
    private static string ListHtml(List<ListItem> items)
    {
        int i = 0;
        string Build(int level)
        {
            string tag = items[i].Kind == "decimal" ? "ol" : "ul";
            var html = new StringBuilder($"<{tag}>");
            while (i < items.Count && items[i].Ilvl >= level)
            {
                if (items[i].Ilvl > level) break;
                var li = new StringBuilder($"<li>{items[i].Inner}");
                i++;
                if (i < items.Count && items[i].Ilvl > level) li.Append(Build(items[i].Ilvl));
                html.Append(li).Append("</li>");
            }
            return html + $"</{tag}>";
        }
        return items.Count > 0 ? Build(items[0].Ilvl) : "";
    }

    private static string BodyHtml(ExportDoc doc, Ctx ctx)
    {
        var blocks = OrderedBlocks(doc);
        var parts = new List<string>();
        var listBuf = new List<ListItem>();
        void FlushList()
        {
            if (listBuf.Count > 0) { parts.Add(ListHtml(listBuf)); listBuf = new List<ListItem>(); }
        }
        foreach (var b in blocks)
        {
            if (b is OrderedPara op && op.P.Props.Numbering is not null)
            {
                listBuf.Add(new ListItem
                {
                    Ilvl = op.P.Props.Numbering.Ilvl,
                    Kind = op.P.Props.Numbering.Kind,
                    Inner = ParaInner(op.P, ctx),
                });
                continue;
            }
            FlushList();
            if (b is OrderedPara op2) parts.Add(ParaHtml(op2.P, ctx));
            else parts.Add(TableHtml(((OrderedTable)b).T, ctx));
        }
        FlushList();

        if (ctx.Notes.Count > 0)
        {
            parts.Add("<hr><section class=\"wn-notes\"><ol>");
            for (int idx = 0; idx < ctx.Notes.Count; idx++)
                parts.Add($"<li id=\"note-{idx + 1}\">{ctx.Notes[idx].Html} <a href=\"#noteref-{idx + 1}\">↩</a></li>");
            parts.Add("</ol></section>");
        }

        var used = ctx.UsedComments.Where(id => ctx.Comments.ContainsKey(id)).ToList();
        if (used.Count > 0)
        {
            parts.Add("<section class=\"wn-comments\"><h2>Comentários</h2><ol>");
            foreach (var id in used)
            {
                var c = ctx.Comments[id];
                parts.Add($"<li id=\"cmt-{id}\"><span class=\"wn-author\">{EscapeHtml(c.Author ?? "Anônimo")}</span>: {EscapeHtml(c.Text)}</li>");
            }
            parts.Add("</ol></section>");
        }
        return string.Join("\n", parts);
    }

    // NOTA: normalizado para LF (o arquivo-fonte pode ter CRLF; o JS usa LF).
    private static readonly string Style = @"
:root { color-scheme: light; }
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55;
  max-width: 46rem; margin: 2.5rem auto; padding: 0 1.25rem; color: #1a1a1a;
  background: #ffffff; }
h1,h2,h3,h4,h5,h6 { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.25; margin: 1.6em 0 .5em; }
h1 { font-size: 2rem; } h2 { font-size: 1.6rem; } h3 { font-size: 1.3rem; }
p { margin: 0 0 .75em; }
a { color: #1a73e8; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; margin: 1em 0; width: 100%; }
td, th { border: 1px solid #bbb; padding: .4em .6em; vertical-align: top; }
ul, ol { margin: 0 0 .75em; padding-left: 1.6em; }
sup.wn-note a { text-decoration: none; }
.wn-comment { background: rgba(255,187,0,.28); border-bottom: 1px dotted #c79100; cursor: help; }
.wn-img-placeholder { display: inline-block; padding: 0 .35em; margin: 0 .15em; background: rgba(0,0,0,.06); border-radius: 4px; font-size: .9em; color: #777; }
.wn-comments { margin-top: 2.5rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: .9rem; color: #555; }
.wn-comments .wn-author { font-weight: 600; }
.wn-notes { font-size: .85rem; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0 .5rem; }
".Replace("\r\n", "\n");

    public static string ToHtml(ExportDoc doc, DocxHtmlOptions? opts = null)
    {
        opts ??= new DocxHtmlOptions();
        var ctx = new Ctx
        {
            Comments = doc.Comments.ToDictionary(c => c.Id, c => c),
            Footnotes = doc.Footnotes,
            Endnotes = doc.Endnotes,
            ImagesMode = opts.Images,
        };
        string body = BodyHtml(doc, ctx);
        if (!opts.FullDocument) return body;
        string title = EscapeHtml(opts.Title ?? doc.Title ?? "Documento");
        return $"<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n" +
            $"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
            $"<title>{title}</title>\n<style>{Style}</style>\n</head>\n<body>\n{body}\n</body>\n</html>";
    }
}
