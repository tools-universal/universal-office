using System.Text;
using System.Text.RegularExpressions;

namespace OfficeNext.Docx;

/// <summary>
/// Serialização do document.xml — porta do SUBSET paragraphs/runs/props/numbering
/// de docx-core/src/serialize.ts (ordem canônica de elementos do word-lab:
/// rPr: rFonts → b → i → caps → smallCaps → strike → color → sz → highlight →
/// u → vertAlign; pPr: pStyle → numPr → spacing → ind → jc).
/// Imagens/headers/footers/comentários ficam fora do subset da fase 1.
/// </summary>
public static class DocxSerialize
{
    private static string Esc(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string EscAttr(string s) => Esc(s).Replace("\"", "&quot;");

    private static readonly Regex SegmentRe = new(@"(\t|\n|\f)", RegexOptions.CultureInvariant);

    private static string RunXml(Run run)
    {
        var p = run.Props;
        var rpr = new List<string>();
        if (!string.IsNullOrEmpty(p.FontAscii))
            rpr.Add($"<w:rFonts w:ascii=\"{EscAttr(p.FontAscii!)}\" w:hAnsi=\"{EscAttr(p.FontAscii!)}\" w:cs=\"{EscAttr(p.FontAscii!)}\"/>");
        if (p.Bold) rpr.Add("<w:b/>");
        if (p.Italic) rpr.Add("<w:i/>");
        if (p.AllCaps) rpr.Add("<w:caps/>");
        if (p.SmallCaps) rpr.Add("<w:smallCaps/>");
        if (p.Strike) rpr.Add("<w:strike/>");
        if (p.DoubleStrike) rpr.Add("<w:dstrike/>");
        if (!string.IsNullOrEmpty(p.Color)) rpr.Add($"<w:color w:val=\"{EscAttr(p.Color!)}\"/>");
        if (p.CharSpacingTwips is int cs && cs != 0) rpr.Add($"<w:spacing w:val=\"{cs}\"/>");
        if (p.SzHalfPt is int sz) rpr.Add($"<w:sz w:val=\"{sz}\"/><w:szCs w:val=\"{sz}\"/>");
        if (!string.IsNullOrEmpty(p.Highlight)) rpr.Add($"<w:highlight w:val=\"{EscAttr(p.Highlight!)}\"/>");
        if (p.Underline)
        {
            string uColor = p.UnderlineColor is not null ? $" w:color=\"{EscAttr(p.UnderlineColor)}\"" : "";
            rpr.Add($"<w:u w:val=\"{p.UnderlineStyle ?? "single"}\"{uColor}/>");
        }
        if (p.VertAlign is not null) rpr.Add($"<w:vertAlign w:val=\"{p.VertAlign}\"/>");

        var parts = new List<string>();
        if (rpr.Count > 0) parts.Add($"<w:rPr>{string.Concat(rpr)}</w:rPr>");
        var segments = SegmentRe.Split(run.Text);
        foreach (var seg in segments)
        {
            if (seg == "\t") parts.Add("<w:tab/>");
            else if (seg == "\n") parts.Add("<w:br/>");
            else if (seg == "\f") parts.Add("<w:br w:type=\"page\"/>");
            else if (seg.Length > 0)
            {
                string space = seg != seg.Trim() ? " xml:space=\"preserve\"" : "";
                parts.Add($"<w:t{space}>{Esc(seg)}</w:t>");
            }
        }
        return $"<w:r>{string.Concat(parts)}</w:r>";
    }

    private static string ParaXml(Paragraph para)
    {
        var runParts = new List<string>();
        foreach (var r in para.Runs)
        {
            // run de CAMPO: emite fldSimple com o cache atual
            if (r.Field is not null)
                runParts.Add($"<w:fldSimple w:instr=\"{EscAttr(r.Field)}\">{RunXml(r)}</w:fldSimple>");
            else runParts.Add(RunXml(r));
        }
        return ParaXmlInner(para, string.Concat(runParts));
    }

    private static string ParaXmlInner(Paragraph para, string runsXml)
    {
        var pp = para.Props;
        var ppr = new List<string>();
        if (!string.IsNullOrEmpty(pp.StyleId)) ppr.Add($"<w:pStyle w:val=\"{EscAttr(pp.StyleId!)}\"/>");
        if (pp.PageBreakBefore) ppr.Add("<w:pageBreakBefore/>");
        if (pp.TabStops is { Count: > 0 })
        {
            ppr.Add("<w:tabs>" + string.Concat(pp.TabStops.Select(t =>
                $"<w:tab w:val=\"{t.Align}\"{(t.Leader is not null ? $" w:leader=\"{t.Leader}\"" : "")} w:pos=\"{t.PosTwips}\"/>")) + "</w:tabs>");
        }
        if (pp.Numbering is not null)
        {
            int numId = pp.Numbering.Kind == "decimal" ? 1002 : 1001;
            ppr.Add($"<w:numPr><w:ilvl w:val=\"{pp.Numbering.Ilvl}\"/><w:numId w:val=\"{numId}\"/></w:numPr>");
        }
        if (pp.Borders is not null)
        {
            var bdr = new StringBuilder();
            foreach (var (side, e) in new (string, DocxBorderEdge?)[]
                { ("top", pp.Borders.Top), ("left", pp.Borders.Left), ("bottom", pp.Borders.Bottom), ("right", pp.Borders.Right) })
            {
                if (e is null) continue;
                bdr.Append($"<w:{side} w:val=\"{EscAttr(e.Style)}\" w:sz=\"{e.SizeEighthPt}\" " +
                    $"w:space=\"{e.SpacePt}\" w:color=\"{(e.Color is not null ? EscAttr(e.Color) : "auto")}\"/>");
            }
            if (bdr.Length > 0) ppr.Add($"<w:pBdr>{bdr}</w:pBdr>");
        }
        else if (pp.BoxBorder)
        {
            const string b = "<w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"1\" w:color=\"auto\"/>";
            ppr.Add("<w:pBdr>" +
                b.Replace("w:bottom", "w:top") + b.Replace("w:bottom", "w:left") +
                b + b.Replace("w:bottom", "w:right") +
                "</w:pBdr>");
        }
        if (!string.IsNullOrEmpty(pp.ShadingHex))
            ppr.Add($"<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"{EscAttr(pp.ShadingHex!)}\"/>");
        if (pp.LineTwentieths is not null || pp.SpaceAfterTwips is not null || pp.SpaceBeforeTwips is not null)
        {
            string line = pp.LineTwentieths is int lt ? $" w:line=\"{lt}\" w:lineRule=\"auto\"" : "";
            string before = pp.SpaceBeforeTwips is int sb2 ? $" w:before=\"{sb2}\"" : "";
            string after = pp.SpaceAfterTwips is int sa ? $" w:after=\"{sa}\"" : "";
            ppr.Add($"<w:spacing{before}{after}{line}/>");
        }
        if ((pp.IndentLeftTwips ?? 0) != 0 || (pp.IndentRightTwips ?? 0) != 0 || (pp.IndentFirstLineTwips ?? 0) != 0)
        {
            var attrs = new StringBuilder();
            if ((pp.IndentLeftTwips ?? 0) != 0) attrs.Append($" w:left=\"{pp.IndentLeftTwips}\"");
            if ((pp.IndentRightTwips ?? 0) != 0) attrs.Append($" w:right=\"{pp.IndentRightTwips}\"");
            if ((pp.IndentFirstLineTwips ?? 0) != 0)
            {
                attrs.Append(pp.IndentFirstLineTwips > 0
                    ? $" w:firstLine=\"{pp.IndentFirstLineTwips}\""
                    : $" w:hanging=\"{-pp.IndentFirstLineTwips}\"");
            }
            ppr.Add($"<w:ind{attrs}/>");
        }
        if (pp.Alignment is not null && pp.Alignment != "left") ppr.Add($"<w:jc w:val=\"{pp.Alignment}\"/>");

        string inner = (ppr.Count > 0 ? $"<w:pPr>{string.Concat(ppr)}</w:pPr>" : "") + runsXml;
        return $"<w:p>{inner}</w:p>";
    }

    private const string WNs =
        "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" " +
        "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" " +
        "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\"";

    /// <summary>Corpo de um &lt;w:sectPr&gt; (sem a tag) com geometria + orientação.</summary>
    public static string SectPrInner(SectPr s)
    {
        string orient = s.PageWidthTwips > s.PageHeightTwips ? " w:orient=\"landscape\"" : "";
        string cols = s.Cols is not null
            ? $"<w:cols w:space=\"{s.Cols.SpaceTwips}\" w:num=\"{s.Cols.Count}\"" +
              $"{(s.Cols.Sep ? " w:sep=\"true\"" : "")} w:equalWidth=\"true\"/>"
            : "";
        return
            $"<w:pgSz w:w=\"{s.PageWidthTwips}\" w:h=\"{s.PageHeightTwips}\"{orient}/>" +
            $"<w:pgMar w:top=\"{s.MarginTopTwips}\" w:right=\"{s.MarginRightTwips}\" " +
            $"w:bottom=\"{s.MarginBottomTwips}\" w:left=\"{s.MarginLeftTwips}\" " +
            $"w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>{cols}";
    }

    public static string SerializeDocument(DocumentModel model)
    {
        string sect = $"<w:sectPr>{SectPrInner(model.SectPr)}</w:sectPr>";
        return
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            $"<w:document {WNs}><w:body>" +
            string.Concat(model.Paragraphs.Select(ParaXml)) +
            sect +
            "</w:body></w:document>";
    }

    private static string NumberingXml()
    {
        string[] bulletChars = ["", "o", ""];
        string[] bulletFonts = ["Symbol", "Courier New", "Wingdings"];
        var bulletLvls = new StringBuilder();
        for (int i = 0; i < 3; i++)
        {
            bulletLvls.Append(
                $"<w:lvl w:ilvl=\"{i}\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/>" +
                $"<w:lvlText w:val=\"{bulletChars[i]}\"/><w:lvlJc w:val=\"left\"/>" +
                $"<w:pPr><w:ind w:left=\"{720 * (i + 1)}\" w:hanging=\"360\"/></w:pPr>" +
                $"<w:rPr><w:rFonts w:ascii=\"{bulletFonts[i]}\" w:hAnsi=\"{bulletFonts[i]}\" w:hint=\"default\"/></w:rPr></w:lvl>");
        }
        var decimalLvls = new StringBuilder();
        for (int i = 0; i < 3; i++)
        {
            decimalLvls.Append(
                $"<w:lvl w:ilvl=\"{i}\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/>" +
                $"<w:lvlText w:val=\"%{i + 1}.\"/><w:lvlJc w:val=\"left\"/>" +
                $"<w:pPr><w:ind w:left=\"{720 * (i + 1)}\" w:hanging=\"360\"/></w:pPr></w:lvl>");
        }
        return
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            $"<w:numbering {WNs}>" +
            $"<w:abstractNum w:abstractNumId=\"1001\">{bulletLvls}</w:abstractNum>" +
            $"<w:abstractNum w:abstractNumId=\"1002\">{decimalLvls}</w:abstractNum>" +
            "<w:num w:numId=\"1001\"><w:abstractNumId w:val=\"1001\"/></w:num>" +
            "<w:num w:numId=\"1002\"><w:abstractNumId w:val=\"1002\"/></w:num>" +
            "</w:numbering>";
    }

    /// <summary>
    /// Grava o modelo no pacote (document.xml + numbering/rels/content-types quando
    /// há listas) — subset do writeDocument JS, sem media/comments/headers.
    /// </summary>
    public static void WriteDocument(DocxPackage pkg, DocumentModel model)
    {
        pkg.SetPartText("word/document.xml", SerializeDocument(model));

        bool hasLists = model.Paragraphs.Any(p => p.Props.Numbering is not null);
        if (!hasLists) return;

        pkg.SetPartText("word/numbering.xml", NumberingXml());

        const string relsPath = "word/_rels/document.xml.rels";
        string rels = pkg.GetPartText(relsPath) ??
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"></Relationships>";
        if (!rels.Contains("numbering.xml"))
        {
            rels = rels.Replace("</Relationships>",
                "<Relationship Id=\"rIdWnNum\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering\" Target=\"numbering.xml\"/></Relationships>");
            pkg.SetPartText(relsPath, rels);
        }

        string? ct = pkg.GetPartText("[Content_Types].xml");
        if (ct is not null && !ct.Contains("numbering+xml"))
        {
            ct = ct.Replace("</Types>",
                "<Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/></Types>");
            pkg.SetPartText("[Content_Types].xml", ct);
        }
    }
}
