using System.Text.RegularExpressions;
using OfficeNext.Core;
using OfficeNext.Docx;

namespace OfficeNext.Export;

/// <summary>
/// Tipos de entrada + helpers compartilhados pelos exportadores de docx —
/// porta de write/packages/docx-core/src/export/model.ts.
/// </summary>
public sealed class ExportDoc
{
    public string? Title;
    public List<Paragraph> Paragraphs = new();
    /// <summary>Tabelas ancoradas "antes do parágrafo N".</summary>
    public List<(int BeforePara, TableBlock Table)> TableAnchors = new();
    public List<CommentInfo> Comments = new();
    public Dictionary<int, List<Paragraph>> Footnotes = new();
    public Dictionary<int, List<Paragraph>> Endnotes = new();
    public SectPr? SectPr;
}

public abstract class OrderedBlock { }
public sealed class OrderedPara : OrderedBlock { public Paragraph P = new(); }
public sealed class OrderedTable : OrderedBlock { public TableBlock T = new(); }

public static class DocxExportModel
{
    /// <summary>Intercala parágrafos e tabelas na ordem original do documento.</summary>
    public static List<OrderedBlock> OrderedBlocks(ExportDoc doc)
    {
        var outp = new List<OrderedBlock>();
        var byPara = new Dictionary<int, List<TableBlock>>();
        foreach (var (beforePara, table) in doc.TableAnchors)
        {
            if (!byPara.TryGetValue(beforePara, out var arr)) { arr = new List<TableBlock>(); byPara[beforePara] = arr; }
            arr.Add(table);
        }
        for (int i = 0; i < doc.Paragraphs.Count; i++)
        {
            if (byPara.TryGetValue(i, out var tables))
                foreach (var t in tables) outp.Add(new OrderedTable { T = t });
            outp.Add(new OrderedPara { P = doc.Paragraphs[i] });
        }
        if (byPara.TryGetValue(doc.Paragraphs.Count, out var tail))
            foreach (var t in tail) outp.Add(new OrderedTable { T = t });
        return outp;
    }

    private static readonly Regex HeadingRe =
        new(@"(?:heading|t[íi]tulo|titulo)\s*([1-9])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex HRe = new(@"^h([1-6])$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex TitleRe = new(@"^(title|t[íi]tulo)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Nível de título (1..6) de um parágrafo, ou 0 se não for título.</summary>
    public static int HeadingLevel(Paragraph p)
    {
        string id = p.Props.StyleId ?? "";
        var m = HeadingRe.Match(id);
        if (m.Success) return Math.Min(6, JsNumber.ParseIntOr(m.Groups[1].Value, 0));
        m = HRe.Match(id);
        if (m.Success) return JsNumber.ParseIntOr(m.Groups[1].Value, 0);
        if (TitleRe.IsMatch(id)) return 1;
        return 0;
    }

    // ───────────────────────── util de codificação ─────────────────────────

    public static string EscapeHtml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    public static string EscapeAttr(string s) => EscapeHtml(s).Replace("\"", "&quot;");

    public static string ImgMime(string ext)
    {
        string e = ext.ToLowerInvariant();
        return e switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "bmp" => "image/bmp",
            "svg" => "image/svg+xml",
            "webp" => "image/webp",
            "tif" or "tiff" => "image/tiff",
            _ => "image/" + e,
        };
    }

    public static string Base64(byte[] bytes) => Convert.ToBase64String(bytes);

    public static string DataUri(InlineImage img) =>
        $"data:{ImgMime(img.Ext)};base64,{Base64(img.Data)}";
}
