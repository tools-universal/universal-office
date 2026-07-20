using System.Text.RegularExpressions;
using OfficeNext.Core;
using OfficeNext.Pptx;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Export;

/// <summary>
/// Base compartilhada pelos exportadores de slides — porta de
/// slides/packages/export/src/model.ts (deck, notas, título, base64).
/// </summary>
public sealed class DeckSlide
{
    public Slide Slide = new();
    public List<string> Notes = new();
}

public sealed class Deck
{
    public required PptxPackage Pkg { get; init; }
    public required Presentation Pres { get; init; }
    public required List<DeckSlide> Slides { get; init; }
}

public static class SlidesModelOps
{
    /// <summary>Carrega o deck a partir dos bytes .pptx. Slides ilegíveis viram vazios.</summary>
    public static Deck LoadDeck(byte[] bytes)
    {
        var pkg = PptxPackage.Load(bytes);
        var pres = PptxReader.ReadPresentation(pkg);
        var slides = new List<DeckSlide>();
        foreach (var slideRef in pres.Slides)
        {
            if (slideRef.Target is null) continue;
            Slide slide;
            try { slide = PptxReader.ReadSlide(pkg, slideRef.Target); }
            catch { slide = new Slide(); }
            slides.Add(new DeckSlide { Slide = slide, Notes = ReadNotes(pkg, slideRef.Target) });
        }
        return new Deck { Pkg = pkg, Pres = pres, Slides = slides };
    }

    private static string RelsPathFor(string part)
    {
        int slash = part.LastIndexOf('/');
        return $"{part[..slash]}/_rels/{part[(slash + 1)..]}.rels";
    }

    /// <summary>Notas do apresentador de um slide (placeholder body da parte notesSlide).</summary>
    public static List<string> ReadNotes(PptxPackage pkg, string slidePath)
    {
        string? relsXml = pkg.GetPartText(RelsPathFor(slidePath));
        if (relsXml is null) return new List<string>();
        string? notesPath = null;
        foreach (var rel in ChildElements(Parse(relsXml), "Relationship"))
        {
            if ((rel.Attr("Type") ?? "").EndsWith("/notesSlide", StringComparison.Ordinal))
            {
                notesPath = pkg.ResolveRelTarget(slidePath, rel.Attr("Target") ?? "");
                break;
            }
        }
        if (notesPath is null) return new List<string>();
        string? xml = pkg.GetPartText(notesPath);
        if (xml is null) return new List<string>();
        var tree = Descend(Parse(xml), "p:spTree");
        if (tree is null) return new List<string>();
        var outp = new List<string>();
        foreach (var sp in ChildElements(tree, "p:sp"))
        {
            var ph = Descend(sp, "p:ph");
            if (ph?.Attr("type") != "body") continue;
            var txBody = FirstChild(sp, "p:txBody");
            if (txBody is null) continue;
            foreach (var p in ChildElements(txBody, "a:p"))
            {
                string text = ParaXmlText(p);
                if (text.Trim().Length > 0) outp.Add(text);
            }
        }
        return outp;
    }

    private static string ParaXmlText(XmlElement p)
    {
        var outp = new System.Text.StringBuilder();
        foreach (var c in ChildElements(p))
        {
            if (c.Name is "a:r" or "a:fld")
            {
                var t = FirstChild(c, "a:t");
                if (t is not null) outp.Append(TextContent(t));
            }
            else if (c.Name == "a:br") outp.Append('\n');
        }
        return outp.ToString();
    }

    // ──────────────────────── Texto / título ────────────────────────

    public static string ParagraphText(OfficeNext.Pptx.Paragraph p) =>
        string.Concat(p.Runs.Select(r => r.Text));

    public static string BodyText(TextBody tb) =>
        string.Join("\n", tb.Paragraphs.Select(ParagraphText));

    public static bool IsTitleShape(Shape sh) => sh.PhType is "title" or "ctrTitle";

    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>Título do slide: placeholder title/ctrTitle com texto; senão a primeira
    /// shape com texto não-vazio.</summary>
    public static (string Text, Shape Shape)? SlideTitle(Slide slide)
    {
        foreach (var sh in slide.Shapes)
        {
            if (IsTitleShape(sh) && sh.TxBody is not null && BodyText(sh.TxBody).Trim().Length > 0)
                return (WsRe.Replace(BodyText(sh.TxBody), " ").Trim(), sh);
        }
        foreach (var sh in slide.Shapes)
        {
            if (sh.TxBody is not null && BodyText(sh.TxBody).Trim().Length > 0)
                return (WsRe.Replace(BodyText(sh.TxBody), " ").Trim(), sh);
        }
        return null;
    }

    // ──────────────────────── base64 / data URI ────────────────────────

    public static string Base64(byte[] bytes) => Convert.ToBase64String(bytes);

    public static string DataUri(ImageRef img) => $"data:{img.Mime};base64,{Base64(img.Bytes)}";
}
