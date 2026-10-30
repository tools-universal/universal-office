using System.Text;
using System.Text.RegularExpressions;
using UniversalOffice.Docx;
using static UniversalOffice.Export.DocxExportModel;

namespace UniversalOffice.Export;

public sealed class DocxMarkdownOptions
{
    public string? Title;
    /// <summary>'data' (default) embute imagens em data URI; 'omit' vira "[imagem]".</summary>
    public string Images = "data";
}

/// <summary>Exporta o modelo Write para Markdown (GFM) —
/// porta de write/packages/docx-core/src/export/markdown.ts.</summary>
public static class DocxMarkdown
{
    private sealed class Ctx
    {
        public Dictionary<int, CommentInfo> Comments = new();
        public Dictionary<int, List<Paragraph>> Footnotes = new();
        public Dictionary<int, List<Paragraph>> Endnotes = new();
        public List<string> NoteDefs = new();
        public int NoteSeq;
        public List<int> UsedComments = new();       // ordem de inserção (Set do JS)
        public HashSet<int> UsedCommentsSet = new();
        public string ImagesMode = "data";

        public void UseComment(int id)
        {
            if (UsedCommentsSet.Add(id)) UsedComments.Add(id);
        }
    }

    private static readonly Regex EscapeMdRe = new(@"([\\`*_{}\[\]<>|])", RegexOptions.CultureInvariant);

    private static string EscapeMd(string s) => EscapeMdRe.Replace(s, "\\$1");

    private static bool IsJsSpace(char c) =>
        char.IsWhiteSpace(c) || c == '﻿';

    private static string Emphasize(string t, RunProps p)
    {
        int leadLen = 0;
        while (leadLen < t.Length && IsJsSpace(t[leadLen])) leadLen++;
        int trailLen = 0;
        while (trailLen < t.Length - leadLen && IsJsSpace(t[t.Length - 1 - trailLen])) trailLen++;
        string lead = t[..leadLen];
        string trail = trailLen > 0 ? t[^trailLen..] : "";
        string core = t[leadLen..(t.Length - trailLen)];
        if (core.Length == 0) return t; // só espaços: não aplica ênfase
        if (p.Bold && p.Italic) core = $"***{core}***";
        else if (p.Bold) core = $"**{core}**";
        else if (p.Italic) core = $"*{core}*";
        if (p.Strike || p.DoubleStrike) core = $"~~{core}~~";
        if (p.Underline) core = $"<u>{core}</u>";
        if (p.VertAlign == "superscript") core = $"<sup>{core}</sup>";
        else if (p.VertAlign == "subscript") core = $"<sub>{core}</sub>";
        return lead + core + trail;
    }

    private static string RunMd(Run run, Ctx ctx)
    {
        if (run.Image is not null)
            return ctx.ImagesMode == "omit" ? "[imagem]" : $"![]({DataUri(run.Image)})";
        if (run.NoteRef is not null)
        {
            int seq = ++ctx.NoteSeq;
            var map = run.NoteRef.Kind == "footnote" ? ctx.Footnotes : ctx.Endnotes;
            string txt = map.TryGetValue(run.NoteRef.Id, out var paras)
                ? string.Join(" ", paras.Select(np => string.Concat(np.Runs.Select(r => r.Text)))).Trim()
                : "";
            ctx.NoteDefs.Add($"[^n{seq}]: {txt}");
            return $"[^n{seq}]";
        }
        string t = Emphasize(EscapeMd(run.Text), run.Props);
        if (run.Props.Link is not null) t = $"[{t}]({run.Props.Link})";
        return t;
    }

    private static string InlineRuns(List<Run> runs, Ctx ctx)
    {
        var s = new StringBuilder();
        var ids = new List<int>();
        var idsSet = new HashSet<int>();
        foreach (var r in runs)
        {
            s.Append(RunMd(r, ctx));
            foreach (var id in r.Props.CommentIds ?? new List<int>())
                if (idsSet.Add(id)) ids.Add(id);
        }
        foreach (var id in ids)
        {
            if (ctx.Comments.ContainsKey(id)) { ctx.UseComment(id); s.Append($"[^c{id}]"); }
        }
        return s.ToString();
    }

    private static string CellText(TableCell cell, Ctx ctx)
    {
        string inner = string.Join("<br>", cell.Paragraphs.Select(p => InlineRuns(p.Runs, ctx)));
        return inner.Replace("|", "\\|").Replace("\n", " ");
    }

    private static string TableMd(TableBlock t, Ctx ctx)
    {
        var rows = t.Rows.Select(r => r.Cells.Select(c => CellText(c, ctx)).ToList()).ToList();
        if (rows.Count == 0) return "";
        int cols = rows.Max(r => r.Count);
        List<string> Pad(List<string> r) { while (r.Count < cols) r.Add(""); return r; }
        var header = Pad(new List<string>(rows[0]));
        var md = new StringBuilder();
        md.Append($"| {string.Join(" | ", header)} |\n");
        md.Append($"| {string.Join(" | ", header.Select(_ => "---"))} |\n");
        foreach (var r in rows.Skip(1)) md.Append($"| {string.Join(" | ", Pad(new List<string>(r)))} |\n");
        return md.ToString();
    }

    private static readonly Regex MultiBlankRe = new(@"\n{3,}", RegexOptions.CultureInvariant);

    public static string ToMarkdown(ExportDoc doc, DocxMarkdownOptions? opts = null)
    {
        doc = DocxExportModel.FinalExportDoc(doc);
        opts ??= new DocxMarkdownOptions();
        var ctx = new Ctx
        {
            Comments = doc.Comments.ToDictionary(c => c.Id, c => c),
            Footnotes = doc.Footnotes,
            Endnotes = doc.Endnotes,
            ImagesMode = opts.Images,
        };
        var outp = new List<string>();
        string? title = opts.Title ?? doc.Title;
        if (!string.IsNullOrEmpty(title)) outp.Add($"# {title}\n");

        bool inList = false;
        foreach (var b in OrderedBlocks(doc))
        {
            bool isList = b is OrderedPara op0 && op0.P.Props.Numbering is not null;
            if (inList && !isList) outp.Add(""); // separa a lista do bloco seguinte (GFM)
            inList = isList;
            if (b is OrderedTable ot) { outp.Add(TableMd(ot.T, ctx)); continue; }
            var p = ((OrderedPara)b).P;
            string inner = InlineRuns(p.Runs, ctx);
            if (p.Props.Numbering is not null)
            {
                string indent = string.Concat(Enumerable.Repeat("  ", p.Props.Numbering.Ilvl));
                string marker = p.Props.Numbering.Kind == "decimal" ? "1." : "-";
                outp.Add($"{indent}{marker} {inner}");
                continue;
            }
            int lvl = HeadingLevel(p);
            if (lvl > 0) outp.Add($"{new string('#', lvl)} {inner}\n");
            else if (inner.Trim().Length > 0) outp.Add($"{inner}\n");
            else outp.Add("");
        }

        if (ctx.NoteDefs.Count > 0)
        {
            outp.Add("");
            outp.AddRange(ctx.NoteDefs);
        }

        var used = ctx.UsedComments.Where(id => ctx.Comments.ContainsKey(id)).ToList();
        if (used.Count > 0)
        {
            outp.Add("");
            foreach (var id in used)
            {
                var c = ctx.Comments[id];
                outp.Add($"[^c{id}]: **{c.Author ?? "Anônimo"}**: {c.Text}");
            }
        }

        return MultiBlankRe.Replace(string.Join("\n", outp), "\n\n").Trim() + "\n";
    }
}
