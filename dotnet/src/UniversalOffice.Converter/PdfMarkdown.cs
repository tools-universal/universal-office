using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace UniversalOffice.Converter;

public sealed class PdfMarkdownOptions
{
    public IReadOnlyCollection<int>? Pages { get; init; }
    public bool? PageHeadings { get; init; }
    public bool InferHeadings { get; init; } = true;
}

public static partial class PdfMarkdown
{
    private sealed record Item(string Text, double X, double Y, double Width, double Size, bool Bold);
    private sealed record Line(string Text, double Y, double Size, bool Bold);

    [GeneratedRegex(@"([\\`*_{}\[\]<>|])", RegexOptions.CultureInvariant)]
    private static partial Regex MarkdownChars();

    [GeneratedRegex(@"^[•●▪◦‣⁃]\s*(.*)$", RegexOptions.CultureInvariant)]
    private static partial Regex Bullet();

    [GeneratedRegex(@"^(\d+)[.)]\s+(.*)$", RegexOptions.CultureInvariant)]
    private static partial Regex Numbered();

    private static string Escape(string text) => MarkdownChars().Replace(text, "\\$1");

    private static double Median(IEnumerable<double> values)
    {
        var sorted = values.Order().ToArray();
        if (sorted.Length == 0) return 12;
        int middle = sorted.Length / 2;
        return sorted.Length % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    private static IReadOnlyList<Line> MakeLines(IReadOnlyList<Item> source)
    {
        var groups = new List<List<Item>>();
        foreach (var item in source.OrderByDescending(item => item.Y).ThenBy(item => item.X))
        {
            var group = groups.FirstOrDefault(candidate =>
            {
                double y = candidate.Average(value => value.Y);
                double size = Math.Max(item.Size, candidate.Max(value => value.Size));
                return Math.Abs(y - item.Y) <= Math.Max(1.5, size * .35);
            });
            if (group is null) groups.Add([item]); else group.Add(item);
        }

        return groups.Select(group =>
        {
            var text = new StringBuilder();
            double right = 0;
            foreach (var item in group.OrderBy(value => value.X))
            {
                double gap = item.X - right;
                if (text.Length > 0 && gap > Math.Max(1.2, item.Size * .35) && !",.;:!?%)]}".Contains(item.Text[0]))
                    text.Append(' ');
                text.Append(item.Text);
                right = Math.Max(right, item.X + item.Width);
            }
            return new Line(
                Regex.Replace(text.ToString(), @"\s+", " ").Trim(),
                group.Average(value => value.Y),
                group.Max(value => value.Size),
                group.Count(value => value.Bold) * 2 >= group.Count);
        }).Where(line => line.Text.Length > 0).OrderByDescending(line => line.Y).ToArray();
    }

    private static string? AsListItem(string text)
    {
        var bullet = Bullet().Match(text);
        if (bullet.Success) return $"- {Escape(bullet.Groups[1].Value)}";
        var numbered = Numbered().Match(text);
        return numbered.Success ? $"{numbered.Groups[1].Value}. {Escape(numbered.Groups[2].Value)}" : null;
    }

    private static string LinesToMarkdown(IReadOnlyList<Line> lines, bool inferHeadings)
    {
        if (lines.Count == 0) return "";
        double bodySize = Median(lines.Select(line => line.Size).Where(size => size > 0));
        var blocks = new List<string>();
        var paragraph = new StringBuilder();
        Line? previous = null;
        void Flush()
        {
            if (paragraph.Length > 0) blocks.Add(paragraph.ToString());
            paragraph.Clear();
        }

        foreach (var line in lines)
        {
            string? listItem = AsListItem(line.Text);
            bool heading = inferHeadings && line.Text.Length <= 160 &&
                (line.Size >= bodySize * 1.35 || (line.Bold && line.Size >= bodySize * 1.12));
            if (listItem is not null)
            {
                Flush();
                if (blocks.Count > 0 && (blocks[^1].StartsWith('-') || char.IsAsciiDigit(blocks[^1][0])))
                    blocks[^1] += "\n" + listItem;
                else blocks.Add(listItem);
            }
            else if (heading)
            {
                Flush();
                int level = line.Size >= bodySize * 1.8 ? 1 : line.Size >= bodySize * 1.45 ? 2 : 3;
                blocks.Add($"{new string('#', level)} {Escape(line.Text)}");
            }
            else
            {
                double gap = previous is null ? 0 : previous.Y - line.Y;
                if (paragraph.Length > 0 && gap > Math.Max(previous!.Size, line.Size) * 1.65) Flush();
                if (paragraph.Length > 0) paragraph.Append(' ');
                paragraph.Append(Escape(line.Text));
            }
            previous = line;
        }
        Flush();
        return string.Join("\n\n", blocks);
    }

    public static string ToMarkdown(byte[] input, PdfMarkdownOptions? options = null)
    {
        options ??= new PdfMarkdownOptions();
        using var document = PdfDocument.Open(input);
        int[] selected = options.Pages?.ToArray() ?? Enumerable.Range(1, document.NumberOfPages).ToArray();
        bool pageHeadings = options.PageHeadings ?? document.NumberOfPages > 1;
        var pages = new List<string>();

        foreach (int pageNumber in selected)
        {
            if (pageNumber < 1 || pageNumber > document.NumberOfPages)
                throw new ArgumentOutOfRangeException(nameof(options), $"PDF page out of range: {pageNumber}");
            Page page = document.GetPage(pageNumber);
            var items = page.Letters
                .Where(letter => !string.IsNullOrEmpty(letter.Value))
                .Select(letter => new Item(
                    letter.Value,
                    letter.BoundingBox.Left,
                    letter.BoundingBox.Bottom,
                    letter.BoundingBox.Width,
                    letter.PointSize,
                    (letter.FontName ?? "").Contains("bold", StringComparison.OrdinalIgnoreCase) ||
                    (letter.FontName ?? "").Contains("black", StringComparison.OrdinalIgnoreCase) ||
                    (letter.FontName ?? "").Contains("heavy", StringComparison.OrdinalIgnoreCase)))
                .ToArray();
            string body = LinesToMarkdown(MakeLines(items), options.InferHeadings);
            string prefix = pageHeadings ? $"## Page {pageNumber}{(body.Length > 0 ? "\n\n" : "")}" : "";
            pages.Add((prefix + body).Trim());
        }
        return string.Join("\n\n---\n\n", pages.Where(page => page.Length > 0)).Trim() + "\n";
    }

    public static string ToHtml(byte[] input, PdfMarkdownOptions? options = null)
    {
        string text = System.Net.WebUtility.HtmlEncode(ToMarkdown(input, options).Trim());
        return "<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>PDF</title>" +
            "<style>body{max-width:72rem;margin:2rem auto;padding:0 1rem;font:16px/1.55 system-ui,sans-serif;white-space:pre-wrap}</style>" +
            $"</head><body>{text}</body></html>\n";
    }
}
