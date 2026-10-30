using UniversalOffice.Core;
using static UniversalOffice.Core.MiniXml;

namespace UniversalOffice.Pptx;

/// <summary>
/// Cascata de estilos de texto do PresentationML (spec 03, item A) — porta de
/// slides-core/src/text-style.ts. Fontes de herança, da MENOR para a MAIOR
/// prioridade: defaultTextStyle → txStyles do master → fontRef do p:style →
/// lstStyle do placeholder (master) → (layout) → lstStyle do próprio txBody.
/// Props diretas de a:pPr/a:rPr sempre vencem (o apply só preenche ausentes).
/// </summary>
public static class TextStyle
{
    private static readonly string[] LevelNames =
    [
        "a:lvl1pPr", "a:lvl2pPr", "a:lvl3pPr", "a:lvl4pPr", "a:lvl5pPr",
        "a:lvl6pPr", "a:lvl7pPr", "a:lvl8pPr", "a:lvl9pPr",
    ];

    public static List<TextStyleLevel> EmptyLevels() =>
        Enumerable.Range(0, 9).Select(_ => new TextStyleLevel()).ToList();

    /// <summary>Parseia um container de níveis (lstStyle/titleStyle/…) → 9 níveis.
    /// O &lt;a:defPPr&gt; (quando presente) vale como base de TODOS os níveis.</summary>
    public static List<TextStyleLevel> ParseTxStyleLevels(XmlElement? el, Theme theme)
    {
        var levels = EmptyLevels();
        if (el is null) return levels;
        var defPPr = FirstChild(el, "a:defPPr");
        var baseLvl = defPPr is not null ? ParsePPrLevel(defPPr, theme) : new TextStyleLevel();
        for (int i = 0; i < 9; i++)
        {
            var lvlEl = FirstChild(el, LevelNames[i]);
            levels[i] = lvlEl is not null ? Overlay(baseLvl, ParsePPrLevel(lvlEl, theme)) : baseLvl.Clone();
        }
        return levels;
    }

    /// <summary>Espalha `over` sobre `base` como o spread { ...base, ...over } do JS
    /// (TODAS as chaves de `over` presentes no objeto JS sobrescrevem).</summary>
    private static TextStyleLevel Overlay(TextStyleLevel baseLvl, TextStyleLevel over) => new()
    {
        Sz = over.Sz ?? baseLvl.Sz,
        Bold = over.Bold ?? baseLvl.Bold,
        Italic = over.Italic ?? baseLvl.Italic,
        Color = over.Color ?? baseLvl.Color,
        Font = over.Font ?? baseLvl.Font,
        Align = over.Align ?? baseLvl.Align,
        MarL = over.MarL ?? baseLvl.MarL,
        Indent = over.Indent ?? baseLvl.Indent,
        BuChar = over.BuChar ?? baseLvl.BuChar,
        BuAutoNum = over.BuAutoNum ?? baseLvl.BuAutoNum,
        BuNone = over.BuNone || baseLvl.BuNone,
    };

    /// <summary>Parseia UM nível (a:lvlNpPr / a:defPPr / a:pPr) → TextStyleLevel.</summary>
    public static TextStyleLevel ParsePPrLevel(XmlElement pPr, Theme theme)
    {
        var lvl = new TextStyleLevel();
        if (!string.IsNullOrEmpty(pPr.Attr("algn"))) lvl.Align = pPr.Attr("algn");
        if (pPr.Attr("marL") is string marL) lvl.MarL = JsNumber.ParseIntOr(marL, 0);
        if (pPr.Attr("indent") is string indent) lvl.Indent = JsNumber.ParseIntOr(indent, 0);
        var buChar = FirstChild(pPr, "a:buChar");
        if (!string.IsNullOrEmpty(buChar?.Attr("char"))) lvl.BuChar = buChar!.Attr("char");
        var buAuto = FirstChild(pPr, "a:buAutoNum");
        if (buAuto is not null) lvl.BuAutoNum = buAuto.Attr("type") ?? "arabicPeriod";
        if (FirstChild(pPr, "a:buNone") is not null) lvl.BuNone = true;
        var defRPr = FirstChild(pPr, "a:defRPr");
        if (defRPr is not null)
        {
            if (!string.IsNullOrEmpty(defRPr.Attr("sz"))) lvl.Sz = JsNumber.ParseIntOr(defRPr.Attr("sz"), 0) / 100.0;
            if (defRPr.Attr("b") is string b) lvl.Bold = b == "1";
            if (defRPr.Attr("i") is string it) lvl.Italic = it == "1";
            var sf = FirstChild(defRPr, "a:solidFill");
            if (sf is not null)
            {
                var c = PptxTheme.ColorFromDml(ChildElements(sf).FirstOrDefault(), theme);
                if (c is not null) lvl.Color = c;
            }
            var latin = FirstChild(defRPr, "a:latin");
            if (!string.IsNullOrEmpty(latin?.Attr("typeface"))) lvl.Font = latin!.Attr("typeface");
        }
        return lvl;
    }

    /// <summary>Mescla camadas: posteriores têm prioridade; bullet substitui em bloco.</summary>
    public static List<TextStyleLevel> MergeStyleLevels(params List<TextStyleLevel>[] layers)
    {
        var outp = EmptyLevels();
        foreach (var layer in layers)
        {
            for (int i = 0; i < 9; i++)
            {
                if (i >= layer.Count) continue;
                var src = layer[i];
                var dst = outp[i];
                if (src.Sz is not null) dst.Sz = src.Sz;
                if (src.Bold is not null) dst.Bold = src.Bold;
                if (src.Italic is not null) dst.Italic = src.Italic;
                if (src.Color is not null) dst.Color = src.Color;
                if (src.Font is not null) dst.Font = src.Font;
                if (src.Align is not null) dst.Align = src.Align;
                if (src.MarL is not null) dst.MarL = src.MarL;
                if (src.Indent is not null) dst.Indent = src.Indent;
                if (src.BuChar is not null || src.BuAutoNum is not null || src.BuNone)
                {
                    dst.BuChar = null;
                    dst.BuAutoNum = null;
                    dst.BuNone = false;
                    if (src.BuChar is not null) dst.BuChar = src.BuChar;
                    if (src.BuAutoNum is not null) dst.BuAutoNum = src.BuAutoNum;
                    if (src.BuNone) dst.BuNone = true;
                }
            }
        }
        return outp;
    }

    /// <summary>Resolve aliases de fonte do tema ("+mj-lt" → major, "+mn-lt" → minor).</summary>
    public static string? ResolveFontAlias(string? font, Theme theme)
    {
        if (font is null) return null;
        if (font.StartsWith("+mj", StringComparison.Ordinal)) return theme.FontMajor;
        if (font.StartsWith("+mn", StringComparison.Ordinal)) return theme.FontMinor;
        return font;
    }

    /// <summary>Aplica os níveis efetivos a um TextBody, preenchendo APENAS o ausente.</summary>
    public static void ApplyTextStyles(TextBody tb, List<TextStyleLevel> levels, Theme theme)
    {
        foreach (var p in tb.Paragraphs)
        {
            var lvl = levels[Math.Min(p.Level ?? 0, 8)];
            if (p.Align is null && lvl.Align is not null) p.Align = lvl.Align;
            if (p.MarL is null && lvl.MarL is not null) p.MarL = lvl.MarL;
            if (p.Indent is null && lvl.Indent is not null) p.Indent = lvl.Indent;
            if (p.Bullet is null)
            {
                if (lvl.BuChar is not null) { p.Bullet = true; p.BulletChar = lvl.BuChar; }
                else if (lvl.BuAutoNum is not null) { p.Bullet = true; p.BulletAutoNum = lvl.BuAutoNum; }
                else if (lvl.BuNone) p.Bullet = false;
            }
            else if (p.Bullet == true && p.BulletChar is null && p.BulletAutoNum is null)
            {
                if (lvl.BuChar is not null) p.BulletChar = lvl.BuChar;
                else if (lvl.BuAutoNum is not null) p.BulletAutoNum = lvl.BuAutoNum;
            }
            foreach (var r in p.Runs)
            {
                if (r.Sz is null && lvl.Sz is not null) r.Sz = lvl.Sz;
                if (r.Bold is null && lvl.Bold is not null) r.Bold = lvl.Bold;
                if (r.Italic is null && lvl.Italic is not null) r.Italic = lvl.Italic;
                if (r.Color is null && lvl.Color is not null) r.Color = lvl.Color;
                if (r.Font is null && lvl.Font is not null)
                {
                    var f = ResolveFontAlias(lvl.Font, theme);
                    if (f is not null) r.Font = f;
                }
                else if (r.Font is not null && r.Font.StartsWith('+'))
                {
                    var f = ResolveFontAlias(r.Font, theme);
                    if (f is not null) r.Font = f;
                }
            }
        }
    }

    /// <summary>Contexto de cascata pré-computado por slide (master + layout + presentation).</summary>
    public sealed class TextStyleContext
    {
        public List<TextStyleLevel> DefaultStyle = EmptyLevels();
        public List<TextStyleLevel> TitleStyle = EmptyLevels();
        public List<TextStyleLevel> BodyStyle = EmptyLevels();
        public List<TextStyleLevel> OtherStyle = EmptyLevels();
        public Dictionary<string, List<TextStyleLevel>> MasterPh = new(StringComparer.Ordinal);
        public Dictionary<string, List<TextStyleLevel>> LayoutPh = new(StringComparer.Ordinal);
    }

    /// <summary>Escolhe o estilo do master conforme a família do placeholder.</summary>
    public static List<TextStyleLevel> MasterStyleFor(TextStyleContext ctx, string? phType)
    {
        if (phType is "title" or "ctrTitle") return ctx.TitleStyle;
        if (phType is "body" or "subTitle") return ctx.BodyStyle;
        return ctx.OtherStyle;
    }

    /// <summary>Resolve e aplica a cascata completa numa shape (item A + fontRef do B).</summary>
    public static void ApplyShapeTextCascade(Shape sh, TextStyleContext ctx, Theme theme, List<string> phKeys)
    {
        if (sh.TxBody is null) return;
        var layers = new List<List<TextStyleLevel>> { ctx.DefaultStyle, MasterStyleFor(ctx, sh.PhType) };
        if (sh.StyleFontColor is not null || sh.StyleFontIdx is not null)
        {
            string? font = sh.StyleFontIdx == "major" ? theme.FontMajor
                : sh.StyleFontIdx == "minor" ? theme.FontMinor : null;
            var layer = Enumerable.Range(0, 9).Select(_ =>
            {
                var lvl = new TextStyleLevel();
                if (sh.StyleFontColor is not null) lvl.Color = sh.StyleFontColor;
                if (font is not null) lvl.Font = font;
                return lvl;
            }).ToList();
            layers.Add(layer);
        }
        foreach (var map in new[] { ctx.MasterPh, ctx.LayoutPh })
        {
            foreach (var key in phKeys)
            {
                if (map.TryGetValue(key, out var ls)) { layers.Add(ls); break; }
            }
        }
        if (sh.TxBody.LstStyle is not null) layers.Add(sh.TxBody.LstStyle);
        ApplyTextStyles(sh.TxBody, MergeStyleLevels(layers.ToArray()), theme);
    }
}
