using System.Text.RegularExpressions;
using OfficeNext.Pptx;
using static OfficeNext.Export.SlidesModelOps;

namespace OfficeNext.Export;

/// <summary>
/// Export Markdown de .pptx — porta de slides/packages/export/src/markdown.ts:
/// `## Slide N — título` por slide, bullets/numeração por nível, tabelas GFM,
/// imagens como `[imagem]` (default) ou data URI, notas como blockquote.
/// </summary>
public static class PptxMarkdown
{
    public sealed class Options
    {
        /// <summary>'data' = imagens data URI; 'omit' (default) = placeholder.</summary>
        public string Images = "omit";
    }

    private static readonly Regex NewlineRe = new(@"\r\n|\r|\n", RegexOptions.CultureInvariant);

    private static string MdCell(string text) =>
        NewlineRe.Replace(text.Replace("|", "\\|"), "<br>").Trim();

    private static List<string> BodyToMarkdown(TextBody tb)
    {
        var lines = new List<string>();
        var counters = new int[9];
        foreach (var p in tb.Paragraphs)
        {
            string text = ParagraphText(p).Replace("\n", " ").Trim();
            if (text.Length == 0) continue;
            int level = Math.Min(p.Level ?? 0, 8);
            if (p.Bullet == true)
            {
                for (int l = level + 1; l < 9; l++) counters[l] = 0;
                string marker = "-";
                if (p.BulletAutoNum is not null)
                {
                    counters[level]++;
                    marker = $"{counters[level]}.";
                }
                lines.Add($"{string.Concat(Enumerable.Repeat("  ", level))}{marker} {text}");
            }
            else lines.Add(text);
        }
        return lines;
    }

    private static List<string> TableToMarkdown(Table t)
    {
        if (t.Rows.Count == 0) return new List<string>();
        int cols = t.ColWidthsEmu.Count > 0 ? t.ColWidthsEmu.Count : t.Rows.Max(r => r.Cells.Count);
        string RowLine(int ri)
        {
            var row = t.Rows[ri];
            var fields = new List<string>();
            for (int ci = 0; ci < cols; ci++)
            {
                var cell = ci < row.Cells.Count ? row.Cells[ci] : null;
                if (cell is null || cell.HMerge || cell.VMerge || cell.TxBody is null) { fields.Add(""); continue; }
                fields.Add(MdCell(string.Join(" ", cell.TxBody.Paragraphs.Select(ParagraphText))));
            }
            return $"| {string.Join(" | ", fields)} |";
        }
        var outp = new List<string>
        {
            RowLine(0),
            $"| {string.Join(" | ", Enumerable.Repeat("---", cols))} |",
        };
        for (int ri = 1; ri < t.Rows.Count; ri++) outp.Add(RowLine(ri));
        return outp;
    }

    private static string SlideToMarkdown(DeckSlide ds, int n, Options opts)
    {
        var slide = ds.Slide;
        var notes = ds.Notes;
        var title = SlideTitle(slide);
        var blocks = new List<string> { $"## Slide {n}{(title is not null ? $" — {title.Value.Text}" : "")}" };

        foreach (var sh in slide.Shapes)
        {
            if (title is not null && ReferenceEquals(sh, title.Value.Shape)) continue;
            string? block = ShapeToMarkdown(sh, opts);
            if (block is not null) blocks.Add(block);
        }
        if (notes.Count > 0)
        {
            blocks.Add(string.Join("\n>\n", notes.Select(l =>
                string.Join("\n", l.Split('\n').Select(s => $"> {s}")))));
        }
        return string.Join("\n\n", blocks);
    }

    private static string? ShapeToMarkdown(Shape sh, Options opts)
    {
        if (sh.Table is not null)
        {
            var t = TableToMarkdown(sh.Table);
            return t.Count > 0 ? string.Join("\n", t) : null;
        }
        if (sh.Image is not null)
            return opts.Images == "data" ? $"![]({DataUri(sh.Image)})" : "[imagem]";
        if (sh.ChartXml is not null) return "[gráfico]";
        if (sh.TxBody is not null)
        {
            var lines = BodyToMarkdown(sh.TxBody);
            return lines.Count > 0 ? string.Join("\n", lines) : null;
        }
        return null;
    }

    /// <summary>Exporta o .pptx inteiro para Markdown (um `##` por slide).</summary>
    public static string ToMarkdown(byte[] bytes, Options? opts = null)
    {
        opts ??= new Options();
        var deck = LoadDeck(bytes);
        return string.Join("\n\n", deck.Slides.Select((ds, i) => SlideToMarkdown(ds, i + 1, opts))) + "\n";
    }
}
