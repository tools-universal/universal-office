using UniversalOffice.Core;
using static UniversalOffice.Core.MiniXml;

namespace UniversalOffice.Docx;

/// <summary>
/// Leitura de styles.xml: resolve a cadeia basedOn + docDefaults —
/// porta de docx-core/src/styles.ts.
/// </summary>
public static class DocxStylesReader
{
    private static bool? OnOff(XmlElement? el)
    {
        if (el is null) return null;
        string? v = el.Attr("w:val");
        return v != "0" && v != "false" && v != "none";
    }

    private static StyleRun ReadStyleRunProps(XmlElement? rPr)
    {
        var p = new StyleRun();
        if (rPr is null) return p;
        foreach (var el in ChildElements(rPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:b": p.Bold = OnOff(el); break;
                case "w:i": p.Italic = OnOff(el); break;
                case "w:caps": p.AllCaps = OnOff(el); break;
                case "w:smallCaps": p.SmallCaps = OnOff(el); break;
                case "w:strike": p.Strike = OnOff(el); break;
                case "w:sz": if (!string.IsNullOrEmpty(val)) p.SzHalfPt = JsNumber.ParseIntOr(val, 0); break;
                case "w:color": if (!string.IsNullOrEmpty(val) && val != "auto") p.Color = val; break;
                case "w:rFonts": if (!string.IsNullOrEmpty(el.Attr("w:ascii"))) p.FontAscii = el.Attr("w:ascii"); break;
                case "w:u": p.Underline = val != "none"; break;
            }
        }
        return p;
    }

    private static StylePara ReadStyleParaProps(XmlElement? pPr)
    {
        var p = new StylePara();
        if (pPr is null) return p;
        string? jc = FirstChild(pPr, "w:jc")?.Attr("w:val");
        if (jc is "center" or "right" or "both" or "left") p.Alignment = jc;
        var spacing = FirstChild(pPr, "w:spacing");
        if (spacing is not null)
        {
            if (!string.IsNullOrEmpty(spacing.Attr("w:line")) && spacing.Attr("w:lineRule") == "auto")
                p.LineTwentieths = JsNumber.ParseIntOr(spacing.Attr("w:line"), 0);
            if (!string.IsNullOrEmpty(spacing.Attr("w:after"))) p.SpaceAfterTwips = JsNumber.ParseIntOr(spacing.Attr("w:after"), 0);
            if (!string.IsNullOrEmpty(spacing.Attr("w:before"))) p.SpaceBeforeTwips = JsNumber.ParseIntOr(spacing.Attr("w:before"), 0);
        }
        var ind = FirstChild(pPr, "w:ind");
        if (!string.IsNullOrEmpty(ind?.Attr("w:left"))) p.IndentLeftTwips = JsNumber.ParseIntOr(ind!.Attr("w:left"), 0);
        if (!string.IsNullOrEmpty(ind?.Attr("w:right"))) p.IndentRightTwips = JsNumber.ParseIntOr(ind!.Attr("w:right"), 0);
        if (FirstChild(pPr, "w:pageBreakBefore") is not null) p.PageBreakBefore = true;
        var pBdr = FirstChild(pPr, "w:pBdr");
        if (pBdr is not null)
        {
            var borders = new ParagraphBorders
            {
                Top = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:top")),
                Left = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:left")),
                Bottom = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:bottom")),
                Right = DocxModel.ReadBorderEdge(FirstChild(pBdr, "w:right")),
            };
            if (borders.Any) p.Borders = borders;
        }
        string? shd = FirstChild(pPr, "w:shd")?.Attr("w:fill");
        if (!string.IsNullOrEmpty(shd) && shd != "auto") p.ShadingHex = shd;
        return p;
    }

    private static StylePara MergePara(StylePara baseP, StylePara over) => new()
    {
        Alignment = over.Alignment ?? baseP.Alignment,
        LineTwentieths = over.LineTwentieths ?? baseP.LineTwentieths,
        SpaceAfterTwips = over.SpaceAfterTwips ?? baseP.SpaceAfterTwips,
        SpaceBeforeTwips = over.SpaceBeforeTwips ?? baseP.SpaceBeforeTwips,
        IndentLeftTwips = over.IndentLeftTwips ?? baseP.IndentLeftTwips,
        IndentRightTwips = over.IndentRightTwips ?? baseP.IndentRightTwips,
        PageBreakBefore = over.PageBreakBefore ?? baseP.PageBreakBefore,
        Borders = over.Borders ?? baseP.Borders,
        ShadingHex = over.ShadingHex ?? baseP.ShadingHex,
    };

    private static StyleRun MergeRun(StyleRun baseR, StyleRun over) => new()
    {
        Bold = over.Bold ?? baseR.Bold,
        Italic = over.Italic ?? baseR.Italic,
        AllCaps = over.AllCaps ?? baseR.AllCaps,
        SmallCaps = over.SmallCaps ?? baseR.SmallCaps,
        Strike = over.Strike ?? baseR.Strike,
        SzHalfPt = over.SzHalfPt ?? baseR.SzHalfPt,
        Color = over.Color ?? baseR.Color,
        FontAscii = over.FontAscii ?? baseR.FontAscii,
        Underline = over.Underline ?? baseR.Underline,
    };

    public static Dictionary<string, ResolvedStyle> ReadStyles(DocxPackage pkg)
    {
        var outp = new Dictionary<string, ResolvedStyle>(StringComparer.Ordinal);
        string? xml = pkg.GetPartText("word/styles.xml");
        if (string.IsNullOrEmpty(xml)) return outp;
        var root = Parse(xml!);

        var docDefaults = FirstChild(root, "w:docDefaults");
        var rPrDefault = docDefaults is not null ? FirstChild(docDefaults, "w:rPrDefault") ?? docDefaults : null;
        var pPrDefault = docDefaults is not null ? FirstChild(docDefaults, "w:pPrDefault") ?? docDefaults : null;
        var defRun = ReadStyleRunProps(rPrDefault is not null ? FirstChild(rPrDefault, "w:rPr") : null);
        var defPara = ReadStyleParaProps(pPrDefault is not null ? FirstChild(pPrDefault, "w:pPr") : null);

        var raw = new Dictionary<string, (string? BasedOn, StylePara Para, StyleRun Run)>(StringComparer.Ordinal);
        foreach (var st in ChildElements(root, "w:style"))
        {
            if (st.Attr("w:type") is not ("paragraph" or "character")) continue;
            string? id = st.Attr("w:styleId");
            if (string.IsNullOrEmpty(id)) continue;
            raw[id!] = (
                FirstChild(st, "w:basedOn")?.Attr("w:val"),
                ReadStyleParaProps(FirstChild(st, "w:pPr")),
                ReadStyleRunProps(FirstChild(st, "w:rPr")));
        }

        ResolvedStyle Resolve(string id, HashSet<string> seen)
        {
            if (outp.TryGetValue(id, out var cached)) return cached;
            if (!raw.TryGetValue(id, out var r) || seen.Contains(id))
                return new ResolvedStyle { Para = MergePara(new StylePara(), defPara), Run = MergeRun(new StyleRun(), defRun) };
            seen.Add(id);
            var baseStyle = r.BasedOn is not null
                ? Resolve(r.BasedOn, seen)
                : new ResolvedStyle { Para = MergePara(new StylePara(), defPara), Run = MergeRun(new StyleRun(), defRun) };
            var resolved = new ResolvedStyle
            {
                Para = MergePara(baseStyle.Para, r.Para),
                Run = MergeRun(baseStyle.Run, r.Run),
            };
            outp[id] = resolved;
            return resolved;
        }
        foreach (var id in raw.Keys) Resolve(id, new HashSet<string>(StringComparer.Ordinal));
        outp["docDefaults"] = new ResolvedStyle
        {
            Para = MergePara(new StylePara(), defPara),
            Run = MergeRun(new StyleRun(), defRun),
        };
        return outp;
    }
}
