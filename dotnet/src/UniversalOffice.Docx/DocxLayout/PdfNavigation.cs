using System.Text.RegularExpressions;
using UniversalOffice.Docx;
using UniversalOffice.Pdf;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Links clicáveis e marcadores do PDF a partir do documento e do layout: os
/// hiperlinks do corpo (externos e indicadores internos) viram anotações
/// /Link; os títulos (nível de estrutura do parágrafo ou do estilo — o mesmo
/// critério do painel de navegação do viewer) viram /Outlines, como o Word grava
/// com "Criar indicadores usando títulos".
/// </summary>
public sealed class PdfNavigation
{
    private const double T = 20; // twips por ponto
    private static readonly Regex HeadingStyle = new(@"^(?:heading|t[íi]?tulo)\s*(\d)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex Ws = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>Áreas clicáveis por página (índice da página no layout).</summary>
    public List<(int Page, PdfLink Link)> Links { get; } = [];

    /// <summary>Marcadores na ordem do documento.</summary>
    public List<PdfOutlineItem> Outline { get; } = [];

    public static PdfNavigation From(FullDocument full, LayoutResult layout)
    {
        var nav = new PdfNavigation();
        foreach (var b in RunBoxes.Collect(full, layout, r => r.Custom is null ? r.Props.Link : null))
        {
            var link = b.Value!;
            if (link.StartsWith('#'))
            {
                if (BookmarkTarget(full, layout, link[1..]) is not { } target) continue;
                nav.Links.Add((b.Page, new PdfLink(b.X / T, b.Y / T, b.W / T, b.H / T, PageIndex: target.Page, DestTopPt: target.Y / T)));
            }
            else nav.Links.Add((b.Page, new PdfLink(b.X / T, b.Y / T, b.W / T, b.H / T, Uri: link)));
        }
        nav.Outline.AddRange(Headings(full, layout));
        return nav;
    }

    private static (int Page, double Y)? BookmarkTarget(FullDocument full, LayoutResult layout, string name)
    {
        if (!full.Bookmarks.TryGetValue(name, out int block)) return null;
        string root = $"b{block}";
        for (int pi = 0; pi < layout.Pages.Count; pi++)
        {
            var line = layout.Pages[pi].Lines.FirstOrDefault(l => l.Ref == root || l.Ref.StartsWith(root + "/", StringComparison.Ordinal));
            if (line is not null) return (pi, line.Y);
        }
        return null;
    }

    private static IEnumerable<PdfOutlineItem> Headings(FullDocument full, LayoutResult layout)
    {
        var styles = full.Formatting is not null ? new StyleResolver(full.Formatting) : null;
        var seen = new HashSet<Paragraph>(ReferenceEqualityComparer.Instance);
        for (int pi = 0; pi < layout.Pages.Count; pi++)
        {
            foreach (var line in layout.Pages[pi].Lines)
            {
                if (line.Ref.Length < 2 || line.Ref[0] != 'b' || !char.IsDigit(line.Ref[1])) continue;
                var p = LineRefs.ParagraphAtPath(full.Blocks, line.Ref.Split('/'));
                if (p is null || !seen.Add(p)) continue;
                if (LevelOf(p, styles) is not { } level) continue;
                string text = Ws.Replace(string.Concat(p.Runs.Select(r => r.Custom?.FallbackText ?? r.Text)).Replace("￼", ""), " ").Trim();
                if (text.Length > 0) yield return new PdfOutlineItem(text, level, pi, line.Y / T);
            }
        }
    }

    /// <summary>Nível de título 1–9: w:outlineLvl direto, senão o do estilo (cadeia basedOn), senão o nome do estilo.</summary>
    private static int? LevelOf(Paragraph p, StyleResolver? styles)
    {
        string? styleId = p.Ppr?.PStyle ?? p.Props.StyleId;
        double? lvl = p.Ppr?.OutlineLvl;
        if (lvl is null && styles is not null) lvl = styles.ParaStyle(styleId).PPr.OutlineLvl;
        if (lvl is not null) return lvl >= 0 && lvl <= 8 ? (int)lvl + 1 : null;
        var m = styleId is null ? null : HeadingStyle.Match(styleId);
        return m is { Success: true } ? int.Parse(m.Groups[1].Value) : null;
    }
}
