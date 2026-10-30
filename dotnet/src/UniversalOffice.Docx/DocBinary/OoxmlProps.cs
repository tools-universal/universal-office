namespace UniversalOffice.DocBinary;

/// <summary>Contexto de propriedades: fontes e styleIds.</summary>
internal sealed class PropCtx
{
    public List<DocFont> Fonts = new();
    public Func<int, string?> StyleId = _ => null;
}

internal sealed class PPrOpts
{
    /// <summary>Tabulações do nível de baixo (estilo/pai) para o diff.</summary>
    public List<TabStop>? BaseTabs;
    /// <summary>numId para o ilfo.</summary>
    public Func<int, int>? NumId;
    /// <summary>Conteúdo extra no fim (rPr da marca, sectPr).</summary>
    public string? RPr;
    public string? SectPr;
    public bool WithStyle = true;
}

/// <summary>
/// CHP/PAP → elementos OOXML (w:rPr, w:pPr, bordas, sombreamento) na ordem do
/// schema — porta de ooxml-props.ts. Só emite o que foi tocado.
/// </summary>
internal static class OoxmlProps
{
    public static string Hex(int c) => c == PropUtil.AUTO ? "auto" : Xml.Hex(c, 6);

    private static readonly Dictionary<int, string> BrcType = new()
    {
        [0] = "none", [1] = "single", [2] = "thick", [3] = "double", [5] = "single", [6] = "dotted", [7] = "dashed", [8] = "dotDash",
        [9] = "dotDotDash", [10] = "triple", [11] = "thinThickSmallGap", [12] = "thickThinSmallGap", [13] = "thinThickThinSmallGap",
        [14] = "thinThickMediumGap", [15] = "thickThinMediumGap", [16] = "thinThickThinMediumGap", [17] = "thinThickLargeGap",
        [18] = "thickThinLargeGap", [19] = "thinThickThinLargeGap", [20] = "wave", [21] = "doubleWave", [22] = "dashSmallGap",
        [23] = "dashDotStroked", [24] = "threeDEmboss", [25] = "threeDEngrave", [26] = "outset", [27] = "inset", [0xff] = "nil",
    };

    /// <summary>Borda → elemento. null/nenhuma → val="nil"/"none".</summary>
    public static string BrcXml(string name, Brc? b)
    {
        if (b is null) return Xml.El(name, new Attrs { { "w:val", "nil" } });
        string val = BrcType.TryGetValue(b.Type, out var v) ? v : "single";
        if (val == "none" || val == "nil") return Xml.El(name, new Attrs { { "w:val", val == "none" && b.Width == 0 ? "nil" : val } });
        return Xml.El(name, new Attrs
        {
            { "w:val", val },
            { "w:sz", b.Width },
            { "w:space", b.Space },
            { "w:color", Hex(b.Color) },
            { "w:shadow", b.Shadow ? true : null },
            { "w:frame", b.Frame ? true : null },
        });
    }

    private static readonly Dictionary<int, string> ShdPat = new()
    {
        [0] = "clear", [1] = "solid", [2] = "pct5", [3] = "pct10", [4] = "pct20", [5] = "pct25", [6] = "pct30", [7] = "pct40", [8] = "pct50",
        [9] = "pct60", [10] = "pct70", [11] = "pct75", [12] = "pct80", [13] = "pct90", [14] = "horzStripe", [15] = "vertStripe",
        [16] = "reverseDiagStripe", [17] = "diagStripe", [18] = "horzCross", [19] = "diagCross", [20] = "thinHorzStripe",
        [21] = "thinVertStripe", [22] = "thinReverseDiagStripe", [23] = "thinDiagStripe", [24] = "thinHorzCross",
        [25] = "thinDiagCross", [0x25] = "pct12", [0x26] = "pct15", [0x2b] = "pct35", [0x2c] = "pct37", [0x2e] = "pct45",
        [0x31] = "pct55", [0x33] = "pct62", [0x34] = "pct65", [0x39] = "pct85", [0x3a] = "pct87", [0x3c] = "pct95", [0xffff] = "nil",
    };

    public static string ShdXml(Shd? s)
    {
        if (s is null) return "";
        string val = ShdPat.TryGetValue(s.Pat, out var v) ? v : "clear";
        if (val == "nil") return Xml.El("w:shd", new Attrs { { "w:val", "nil" } });
        return Xml.El("w:shd", new Attrs { { "w:val", val }, { "w:color", Hex(s.Fore) }, { "w:fill", Hex(s.Back) } });
    }

    private static readonly Dictionary<int, string> Kul = new()
    {
        [0] = "none", [1] = "single", [2] = "words", [3] = "double", [4] = "dotted", [6] = "thick", [7] = "dash", [9] = "dotDash",
        [10] = "dotDotDash", [11] = "wave", [20] = "dottedHeavy", [23] = "dashedHeavy", [25] = "dashDotHeavy",
        [26] = "dashDotDotHeavy", [27] = "wavyHeavy", [39] = "dashLong", [43] = "wavyDouble", [55] = "dashLongHeavy",
    };

    private static readonly string[] Highlight =
    {
        "none", "black", "blue", "cyan", "green", "magenta", "red", "yellow", "white",
        "darkBlue", "darkCyan", "darkGreen", "darkMagenta", "darkRed", "darkYellow", "darkGray", "lightGray",
    };

    /// <summary>LCID → marca de idioma BCP 47 (as usadas pelo Word).</summary>
    private static readonly Dictionary<int, string> Lcid = new()
    {
        [0x0000] = "x-none", [0x0401] = "ar-SA", [0x0402] = "bg-BG", [0x0403] = "ca-ES", [0x0404] = "zh-TW", [0x0405] = "cs-CZ",
        [0x0406] = "da-DK", [0x0407] = "de-DE", [0x0408] = "el-GR", [0x0409] = "en-US", [0x040a] = "es-ES_tradnl", [0x040b] = "fi-FI",
        [0x040c] = "fr-FR", [0x040d] = "he-IL", [0x040e] = "hu-HU", [0x040f] = "is-IS", [0x0410] = "it-IT", [0x0411] = "ja-JP",
        [0x0412] = "ko-KR", [0x0413] = "nl-NL", [0x0414] = "nb-NO", [0x0415] = "pl-PL", [0x0416] = "pt-BR", [0x0417] = "rm-CH",
        [0x0418] = "ro-RO", [0x0419] = "ru-RU", [0x041a] = "hr-HR", [0x041b] = "sk-SK", [0x041c] = "sq-AL", [0x041d] = "sv-SE",
        [0x041e] = "th-TH", [0x041f] = "tr-TR", [0x0420] = "ur-PK", [0x0421] = "id-ID", [0x0422] = "uk-UA", [0x0423] = "be-BY",
        [0x0424] = "sl-SI", [0x0425] = "et-EE", [0x0426] = "lv-LV", [0x0427] = "lt-LT", [0x0429] = "fa-IR", [0x042a] = "vi-VN",
        [0x042d] = "eu-ES", [0x0436] = "af-ZA", [0x0439] = "hi-IN", [0x043e] = "ms-MY", [0x0456] = "gl-ES", [0x0804] = "zh-CN",
        [0x0807] = "de-CH", [0x0809] = "en-GB", [0x080a] = "es-MX", [0x080c] = "fr-BE", [0x0810] = "it-CH", [0x0813] = "nl-BE",
        [0x0816] = "pt-PT", [0x0c04] = "zh-HK", [0x0c07] = "de-AT", [0x0c09] = "en-AU", [0x0c0a] = "es-ES", [0x0c0c] = "fr-CA",
        [0x1009] = "en-CA", [0x100c] = "fr-CH", [0x1409] = "en-NZ", [0x1809] = "en-IE", [0x1c09] = "en-ZA", [0x2009] = "en-JM",
        [0x200a] = "es-VE", [0x240a] = "es-CO", [0x280a] = "es-PE", [0x2c0a] = "es-AR", [0x300a] = "es-EC", [0x340a] = "es-CL",
        [0x380a] = "es-UY", [0x3c0a] = "es-PY", [0x400a] = "es-BO", [0x4009] = "en-IN", [0x540a] = "es-US", [0x0c01] = "ar-EG",
    };

    public static string? LcidTag(int? lid)
    {
        if (lid is null) return null;
        return Lcid.TryGetValue(lid.Value, out var t) ? t : null;
    }

    private static string? FontName(PropCtx ctx, int? ftc)
    {
        if (ftc is null) return null;
        return ftc.Value >= 0 && ftc.Value < ctx.Fonts.Count ? ctx.Fonts[ftc.Value].Name : null;
    }

    private static string OnOff(string name, bool? v) => v is null ? "" : v.Value ? $"<{name}/>" : $"<{name} w:val=\"0\"/>";

    /// <summary>Conteúdo do w:rPr (sem o elemento externo).</summary>
    public static string RPrInner(Chp chp, HashSet<ChpKey> touched, PropCtx ctx, bool withStyle = true)
    {
        bool T(ChpKey k) => touched.Contains(k);
        string x = "";
        int? istd = chp.Istd;
        if (withStyle && istd is not null && istd != 10 && T(ChpKey.Istd))
        {
            string? id = ctx.StyleId(istd.Value);
            if (id is not null) x += Xml.El("w:rStyle", new Attrs { { "w:val", id } });
        }
        if (T(ChpKey.FtcAscii) || T(ChpKey.FtcOther) || T(ChpKey.FtcFE) || T(ChpKey.FtcBi) || T(ChpKey.IdctHint))
        {
            int? hint = chp.I(ChpKey.IdctHint);
            x += Xml.El("w:rFonts", new Attrs
            {
                { "w:ascii", T(ChpKey.FtcAscii) ? FontName(ctx, chp.I(ChpKey.FtcAscii)) : null },
                { "w:eastAsia", T(ChpKey.FtcFE) ? FontName(ctx, chp.I(ChpKey.FtcFE)) : null },
                { "w:hAnsi", T(ChpKey.FtcOther) ? FontName(ctx, chp.I(ChpKey.FtcOther)) : null },
                { "w:cs", T(ChpKey.FtcBi) ? FontName(ctx, chp.I(ChpKey.FtcBi)) : null },
                { "w:hint", T(ChpKey.IdctHint) ? (hint == 1 ? "eastAsia" : hint == 2 ? "cs" : null) : null },
            });
        }
        if (T(ChpKey.Bold)) x += OnOff("w:b", chp.B(ChpKey.Bold));
        if (T(ChpKey.BoldBi)) x += OnOff("w:bCs", chp.B(ChpKey.BoldBi));
        if (T(ChpKey.Italic)) x += OnOff("w:i", chp.B(ChpKey.Italic));
        if (T(ChpKey.ItalicBi)) x += OnOff("w:iCs", chp.B(ChpKey.ItalicBi));
        if (T(ChpKey.Caps)) x += OnOff("w:caps", chp.B(ChpKey.Caps));
        if (T(ChpKey.SmallCaps)) x += OnOff("w:smallCaps", chp.B(ChpKey.SmallCaps));
        if (T(ChpKey.Strike)) x += OnOff("w:strike", chp.B(ChpKey.Strike));
        if (T(ChpKey.Dstrike)) x += OnOff("w:dstrike", chp.B(ChpKey.Dstrike));
        if (T(ChpKey.Outline)) x += OnOff("w:outline", chp.B(ChpKey.Outline));
        if (T(ChpKey.Shadow)) x += OnOff("w:shadow", chp.B(ChpKey.Shadow));
        if (T(ChpKey.Emboss)) x += OnOff("w:emboss", chp.B(ChpKey.Emboss));
        if (T(ChpKey.Imprint)) x += OnOff("w:imprint", chp.B(ChpKey.Imprint));
        if (T(ChpKey.NoProof)) x += OnOff("w:noProof", chp.B(ChpKey.NoProof));
        if (T(ChpKey.Vanish)) x += OnOff("w:vanish", chp.B(ChpKey.Vanish));
        if (T(ChpKey.WebHidden)) x += OnOff("w:webHidden", chp.B(ChpKey.WebHidden));
        if (T(ChpKey.Cv) || T(ChpKey.Ico))
        {
            int? cv = chp.I(ChpKey.Cv);
            int c = T(ChpKey.Cv) && cv is not null ? cv.Value : PropUtil.IcoColor(chp.I(ChpKey.Ico) ?? 0);
            x += Xml.El("w:color", new Attrs { { "w:val", Hex(c) } });
        }
        if (T(ChpKey.DxaSpace)) x += Xml.El("w:spacing", new Attrs { { "w:val", chp.I(ChpKey.DxaSpace) } });
        if (T(ChpKey.CharScale) && chp.I(ChpKey.CharScale) is not null) x += Xml.El("w:w", new Attrs { { "w:val", chp.I(ChpKey.CharScale) } });
        if (T(ChpKey.HpsKern)) x += Xml.El("w:kern", new Attrs { { "w:val", chp.I(ChpKey.HpsKern) } });
        if (T(ChpKey.HpsPos)) x += Xml.El("w:position", new Attrs { { "w:val", chp.I(ChpKey.HpsPos) } });
        if (T(ChpKey.Hps)) x += Xml.El("w:sz", new Attrs { { "w:val", chp.I(ChpKey.Hps) } });
        if (T(ChpKey.HpsBi)) x += Xml.El("w:szCs", new Attrs { { "w:val", chp.I(ChpKey.HpsBi) } });
        if (T(ChpKey.Highlight))
        {
            int h = chp.I(ChpKey.Highlight) ?? 0;
            x += Xml.El("w:highlight", new Attrs { { "w:val", h >= 0 && h < Highlight.Length ? Highlight[h] : "none" } });
        }
        if (T(ChpKey.Kul))
        {
            int k = chp.I(ChpKey.Kul) ?? 0;
            var a = new Attrs { { "w:val", Kul.TryGetValue(k, out var kv) ? kv : "single" } };
            int? cvUl = chp.I(ChpKey.CvUl);
            if (T(ChpKey.CvUl) && cvUl is not null) a["w:color"] = Hex(cvUl.Value);
            x += Xml.El("w:u", a);
        }
        if (T(ChpKey.Brc)) x += BrcXml("w:bdr", chp.Brc);
        if (T(ChpKey.Shd)) x += ShdXml(chp.Shd);
        if (T(ChpKey.Iss))
        {
            int? iss = chp.I(ChpKey.Iss);
            x += Xml.El("w:vertAlign", new Attrs { { "w:val", iss == 1 ? "superscript" : iss == 2 ? "subscript" : "baseline" } });
        }
        if (T(ChpKey.Rtl)) x += OnOff("w:rtl", chp.B(ChpKey.Rtl));
        if (T(ChpKey.Cs)) x += OnOff("w:cs", chp.B(ChpKey.Cs));
        if (T(ChpKey.Kcd))
        {
            string[] em = { "none", "dot", "comma", "circle", "underDot" };
            int kcd = chp.I(ChpKey.Kcd) ?? 0;
            x += Xml.El("w:em", new Attrs { { "w:val", kcd >= 0 && kcd < em.Length ? em[kcd] : "none" } });
        }
        if (T(ChpKey.Lid) || T(ChpKey.LidFE) || T(ChpKey.LidBi))
        {
            string? val = T(ChpKey.Lid) ? LcidTag(chp.I(ChpKey.Lid)) : null;
            string? ea = T(ChpKey.LidFE) ? LcidTag(chp.I(ChpKey.LidFE)) : null;
            string? bidi = T(ChpKey.LidBi) ? LcidTag(chp.I(ChpKey.LidBi)) : null;
            if (!string.IsNullOrEmpty(val) || !string.IsNullOrEmpty(ea) || !string.IsNullOrEmpty(bidi))
                x += Xml.El("w:lang", new Attrs { { "w:val", val }, { "w:eastAsia", ea }, { "w:bidi", bidi } });
        }
        if (T(ChpKey.SpecVanish)) x += OnOff("w:specVanish", chp.B(ChpKey.SpecVanish));
        return x;
    }

    // ───────────────────────────── parágrafo ─────────────────────────────

    private static readonly string[] Jc = { "left", "center", "right", "both", "distribute", "mediumKashida", "both", "highKashida", "lowKashida", "thaiDistribute" };

    public static string JcVal(int? jc)
    {
        int j = jc ?? 0;
        return j >= 0 && j < Jc.Length ? Jc[j] : "left";
    }

    private static readonly string[] TabJc = { "left", "center", "right", "decimal", "bar", "clear", "num", "left" };
    private static readonly string?[] TabTlc = { null, "dot", "hyphen", "underscore", "heavy", "middleDot", null, null };

    /// <summary>Diferença de tabulações: limpa as do estilo que sumiram e acrescenta as novas.</summary>
    public static string TabsXml(List<TabStop>? @base, List<TabStop>? final, List<int>? cleared)
    {
        var b = @base ?? new List<TabStop>();
        var f = final ?? new List<TabStop>();
        static bool Same(TabStop x, TabStop y) => x.Pos == y.Pos && x.Jc == y.Jc && x.Tlc == y.Tlc;
        // Set do JS: ordem de inserção, sem repetição
        var clearPos = new List<int>();
        foreach (var x in b) if (!f.Exists(y => Same(x, y)) && !clearPos.Contains(x.Pos)) clearPos.Add(x.Pos);
        // remoções explícitas do próprio nível (o Word as mantém mesmo sem tab correspondente no estilo)
        foreach (int p in cleared ?? new List<int>()) if (!f.Exists(y => y.Pos == p) && !clearPos.Contains(p)) clearPos.Add(p);
        var adds = f.Where(y => !b.Exists(x => Same(x, y))).ToList();
        if (clearPos.Count == 0 && adds.Count == 0) return "";
        string xml = "";
        foreach (int c in clearPos.OrderBy(v => v))
            if (!adds.Exists(a => a.Pos == c)) xml += Xml.El("w:tab", new Attrs { { "w:val", "clear" }, { "w:pos", c } });
        foreach (var a in adds)
        {
            xml += Xml.El("w:tab", new Attrs
            {
                { "w:val", a.Jc >= 0 && a.Jc < TabJc.Length ? TabJc[a.Jc] : "left" },
                { "w:leader", a.Tlc >= 0 && a.Tlc < TabTlc.Length ? TabTlc[a.Tlc] : null },
                { "w:pos", a.Pos },
            });
        }
        return xml.Length > 0 ? $"<w:tabs>{xml}</w:tabs>" : "";
    }

    private static readonly (PapKey Key, string Name)[] PBdr =
    {
        (PapKey.BrcTop, "top"), (PapKey.BrcLeft, "left"), (PapKey.BrcBottom, "bottom"),
        (PapKey.BrcRight, "right"), (PapKey.BrcBetween, "between"), (PapKey.BrcBar, "bar"),
    };

    public static string PPrInner(Pap pap, HashSet<PapKey> touched, PropCtx ctx, PPrOpts? o = null)
    {
        o ??= new PPrOpts();
        bool T(PapKey k) => touched.Contains(k);
        string x = "";
        if (o.WithStyle && pap.Istd != 0)
        {
            string? id = ctx.StyleId(pap.Istd);
            if (id is not null) x += Xml.El("w:pStyle", new Attrs { { "w:val", id } });
        }
        if (T(PapKey.KeepFollow)) x += OnOff("w:keepNext", pap.B(PapKey.KeepFollow));
        if (T(PapKey.Keep)) x += OnOff("w:keepLines", pap.B(PapKey.Keep));
        if (T(PapKey.PageBreakBefore)) x += OnOff("w:pageBreakBefore", pap.B(PapKey.PageBreakBefore));
        x += FramePrXml(pap, touched);
        if (T(PapKey.WidowControl)) x += OnOff("w:widowControl", pap.B(PapKey.WidowControl));
        if (T(PapKey.Ilfo) || T(PapKey.Ilvl))
        {
            int ilfo = pap.I(PapKey.Ilfo) ?? 0;
            int numId = ilfo == 0 || ilfo == -2047 ? 0 : o.NumId is not null ? o.NumId(Math.Abs(ilfo)) : Math.Abs(ilfo);
            string n = "";
            if (T(PapKey.Ilvl) || numId != 0) n += Xml.El("w:ilvl", new Attrs { { "w:val", Math.Min(8, pap.I(PapKey.Ilvl) ?? 0) } });
            n += Xml.El("w:numId", new Attrs { { "w:val", numId } });
            x += $"<w:numPr>{n}</w:numPr>";
        }
        if (T(PapKey.NoLineNumb)) x += OnOff("w:suppressLineNumbers", pap.B(PapKey.NoLineNumb));
        string bdr = string.Concat(PBdr.Where(e => T(e.Key)).Select(e => BrcXml($"w:{e.Name}", pap.BrcOf(e.Key))));
        if (bdr.Length > 0) x += $"<w:pBdr>{bdr}</w:pBdr>";
        if (T(PapKey.Shd)) x += ShdXml(pap.Shd);
        if (T(PapKey.Tabs)) x += TabsXml(o.BaseTabs, pap.Tabs, pap.TabsCleared);
        if (T(PapKey.NoAutoHyph)) x += OnOff("w:suppressAutoHyphens", pap.B(PapKey.NoAutoHyph));
        if (T(PapKey.Kinsoku)) x += OnOff("w:kinsoku", pap.B(PapKey.Kinsoku));
        if (T(PapKey.WordWrap)) x += OnOff("w:wordWrap", pap.B(PapKey.WordWrap));
        if (T(PapKey.OverflowPunct)) x += OnOff("w:overflowPunct", pap.B(PapKey.OverflowPunct));
        if (T(PapKey.TopLinePunct)) x += OnOff("w:topLinePunct", pap.B(PapKey.TopLinePunct));
        if (T(PapKey.AutoSpaceDE)) x += OnOff("w:autoSpaceDE", pap.B(PapKey.AutoSpaceDE));
        if (T(PapKey.AutoSpaceDN)) x += OnOff("w:autoSpaceDN", pap.B(PapKey.AutoSpaceDN));
        if (T(PapKey.Bidi)) x += OnOff("w:bidi", pap.B(PapKey.Bidi));
        if (T(PapKey.AdjustRight)) x += OnOff("w:adjustRightInd", pap.B(PapKey.AdjustRight));
        if (T(PapKey.UsePgsuSettings)) x += OnOff("w:snapToGrid", pap.B(PapKey.UsePgsuSettings));
        if (T(PapKey.DyaBefore) || T(PapKey.DyaAfter) || T(PapKey.LineSpacing) || T(PapKey.BeforeAuto) || T(PapKey.AfterAuto) || T(PapKey.DylBefore) || T(PapKey.DylAfter))
        {
            var ls = pap.LineSpacing;
            x += Xml.El("w:spacing", new Attrs
            {
                { "w:before", T(PapKey.DyaBefore) ? pap.I(PapKey.DyaBefore) : null },
                { "w:beforeLines", T(PapKey.DylBefore) ? pap.I(PapKey.DylBefore) : null },
                { "w:beforeAutospacing", T(PapKey.BeforeAuto) ? (pap.B(PapKey.BeforeAuto) == true ? "1" : "0") : null },
                { "w:after", T(PapKey.DyaAfter) ? pap.I(PapKey.DyaAfter) : null },
                { "w:afterLines", T(PapKey.DylAfter) ? pap.I(PapKey.DylAfter) : null },
                { "w:afterAutospacing", T(PapKey.AfterAuto) ? (pap.B(PapKey.AfterAuto) == true ? "1" : "0") : null },
                { "w:line", T(PapKey.LineSpacing) && ls is not null ? Math.Abs(ls.Line) : null },
                { "w:lineRule", T(PapKey.LineSpacing) && ls is not null ? (ls.Mult ? "auto" : ls.Line < 0 ? "exact" : "atLeast") : null },
            });
        }
        if (T(PapKey.DxaLeft) || T(PapKey.DxaRight) || T(PapKey.DxaLeft1) || T(PapKey.DxcLeft) || T(PapKey.DxcRight) || T(PapKey.DxcLeft1))
        {
            int? l1 = pap.I(PapKey.DxaLeft1);
            var a = new Attrs
            {
                { "w:left", T(PapKey.DxaLeft) ? pap.I(PapKey.DxaLeft) : null },
                { "w:leftChars", T(PapKey.DxcLeft) ? pap.I(PapKey.DxcLeft) : null },
                { "w:right", T(PapKey.DxaRight) ? pap.I(PapKey.DxaRight) : null },
                { "w:rightChars", T(PapKey.DxcRight) ? pap.I(PapKey.DxcRight) : null },
            };
            if (T(PapKey.DxaLeft1) && l1 is not null)
            {
                if (l1 < 0) a["w:hanging"] = -l1.Value; else a["w:firstLine"] = l1.Value;
            }
            int? dxc1 = pap.I(PapKey.DxcLeft1);
            if (T(PapKey.DxcLeft1) && dxc1 is not null)
            {
                if (dxc1 < 0) a["w:hangingChars"] = -dxc1.Value; else a["w:firstLineChars"] = dxc1.Value;
            }
            x += Xml.El("w:ind", a);
        }
        if (T(PapKey.ContextualSpacing)) x += OnOff("w:contextualSpacing", pap.B(PapKey.ContextualSpacing));
        if (T(PapKey.MirrorIndents)) x += OnOff("w:mirrorIndents", pap.B(PapKey.MirrorIndents));
        if (T(PapKey.Jc)) x += Xml.El("w:jc", new Attrs { { "w:val", JcVal(pap.I(PapKey.Jc)) } });
        if (T(PapKey.WAlignFont))
        {
            string[] ta = { "top", "center", "baseline", "bottom", "auto" };
            int wa = pap.I(PapKey.WAlignFont) ?? 4;
            x += Xml.El("w:textAlignment", new Attrs { { "w:val", wa >= 0 && wa < ta.Length ? ta[wa] : "auto" } });
        }
        int? outLvl = pap.OutLvl;
        if (T(PapKey.OutLvl) && outLvl is not null && outLvl <= 9) x += Xml.El("w:outlineLvl", new Attrs { { "w:val", outLvl } });
        if (!string.IsNullOrEmpty(o.RPr)) x += $"<w:rPr>{o.RPr}</w:rPr>";
        if (!string.IsNullOrEmpty(o.SectPr)) x += o.SectPr;
        return x;
    }

    private static readonly PapKey[] FrameTrigger = { PapKey.DxaAbs, PapKey.DyaAbs, PapKey.DxaWidth, PapKey.Wr, PapKey.WHeightAbs, PapKey.Dcs };

    /// <summary>
    /// Moldura (framePr). Como o Word grava: só quando há posição, tamanho, quebra
    /// ou capitular; w:wrap sempre; w:vAnchor omitido quando é "margin"; w:hRule só exata.
    /// </summary>
    private static string FramePrXml(Pap pap, HashSet<PapKey> touched)
    {
        if (!FrameTrigger.Any(k => touched.Contains(k) && (pap.I(k) ?? 0) != 0)) return "";
        int pc = pap.I(PapKey.Pc) ?? 0;
        int pcVert = (pc >> 4) & 3; // 0 margem, 1 página, 2 texto
        int pcHorz = (pc >> 6) & 3; // 0 coluna, 1 margem, 2 página
        var a = new Dictionary<string, object>();
        int dcs = pap.I(PapKey.Dcs) ?? 0;
        if (dcs != 0)
        {
            int fdct = dcs & 7;
            int lines = (dcs >> 3) & 0x1f;
            if (fdct != 0) { a["w:dropCap"] = fdct == 1 ? "drop" : "margin"; a["w:lines"] = lines; }
        }
        int dxaWidth = pap.I(PapKey.DxaWidth) ?? 0;
        if (dxaWidth != 0) a["w:w"] = dxaWidth;
        int wh = pap.I(PapKey.WHeightAbs) ?? 0;
        if (wh != 0)
        {
            a["w:h"] = wh & 0x7fff;
            if ((wh & 0x8000) == 0) a["w:hRule"] = "exact";
        }
        int dxf = pap.I(PapKey.DxaFromText) ?? 0;
        if (dxf != 0) a["w:hSpace"] = dxf;
        int dyf = pap.I(PapKey.DyaFromText) ?? 0;
        if (dyf != 0) a["w:vSpace"] = dyf;
        string[] wraps = { "auto", "notBeside", "around", "none", "tight", "through" };
        int wr = pap.I(PapKey.Wr) ?? 0;
        a["w:wrap"] = wr >= 0 && wr < wraps.Length ? wraps[wr] : "auto";
        string[] vs = { "margin", "page", "text" };
        string? v = pcVert < vs.Length ? vs[pcVert] : null;
        if (v is not null && v != "margin") a["w:vAnchor"] = v;
        string[] hs = { "text", "margin", "page" };
        a["w:hAnchor"] = pcHorz < hs.Length ? hs[pcHorz] : "text";
        int xa = pap.I(PapKey.DxaAbs) ?? 0;
        var xAlign = new Dictionary<int, string> { [-4] = "center", [-8] = "right", [-12] = "inside", [-16] = "outside" };
        // o Word grava no .docx o valor do XAS_plusOne como está (medido: dyaAbs 1 → w:y=1)
        if (xAlign.TryGetValue(xa, out var xs)) a["w:xAlign"] = xs; else if (xa != 0) a["w:x"] = xa;
        int ya = pap.I(PapKey.DyaAbs) ?? 0;
        var yAlign = new Dictionary<int, string> { [-4] = "top", [-8] = "center", [-12] = "bottom", [-16] = "inside", [-20] = "outside" };
        if (yAlign.TryGetValue(ya, out var ys)) a["w:yAlign"] = ys; else if (ya != 0) a["w:y"] = ya;
        if (pap.B(PapKey.FrameLocked) == true) a["w:anchorLock"] = "1";
        // ordem dos atributos como o Word: x antes de xAlign, y antes de yAlign
        string[] order = { "w:dropCap", "w:lines", "w:w", "w:h", "w:hRule", "w:hSpace", "w:vSpace", "w:wrap", "w:vAnchor", "w:hAnchor", "w:x", "w:xAlign", "w:y", "w:yAlign", "w:anchorLock" };
        var sorted = new Attrs();
        foreach (var k in order) if (a.TryGetValue(k, out var val)) sorted[k] = val;
        return Xml.El("w:framePr", sorted);
    }

    private static readonly Dictionary<int, string> Nfc = new()
    {
        [0] = "decimal", [1] = "upperRoman", [2] = "lowerRoman", [3] = "upperLetter", [4] = "lowerLetter", [5] = "ordinal",
        [6] = "cardinalText", [7] = "ordinalText", [8] = "hex", [9] = "chicago", [10] = "ideographDigital", [11] = "japaneseCounting",
        [12] = "aiueo", [13] = "iroha", [14] = "decimalFullWidth", [15] = "decimalHalfWidth", [16] = "japaneseLegal",
        [17] = "japaneseDigitalTenThousand", [18] = "decimalEnclosedCircle", [19] = "decimalFullWidth2", [20] = "aiueoFullWidth",
        [21] = "irohaFullWidth", [22] = "decimalZero", [23] = "bullet", [24] = "ganada", [25] = "chosung", [26] = "decimalEnclosedFullstop",
        [27] = "decimalEnclosedParen", [28] = "decimalEnclosedCircleChinese", [29] = "ideographEnclosedCircle",
        [30] = "ideographTraditional", [31] = "ideographZodiac", [32] = "ideographZodiacTraditional", [33] = "taiwaneseCounting",
        [34] = "ideographLegalTraditional", [35] = "taiwaneseCountingThousand", [36] = "taiwaneseDigital", [37] = "chineseCounting",
        [38] = "chineseLegalSimplified", [39] = "chineseCountingThousand", [41] = "koreanDigital", [42] = "koreanCounting",
        [43] = "koreanLegal", [44] = "koreanDigital2", [45] = "hebrew1", [46] = "arabicAlpha", [47] = "hebrew2", [48] = "arabicAbjad",
        [49] = "hindiVowels", [50] = "hindiConsonants", [51] = "hindiNumbers", [52] = "thaiLetters", [53] = "thaiNumbers",
        [54] = "thaiCounting", [55] = "vietnameseCounting", [56] = "numberInDash", [57] = "russianLower", [58] = "russianUpper",
        [255] = "none",
    };

    public static string NumFmtOf(int nfc) => Nfc.TryGetValue(nfc, out var v) ? v : "decimal";
}
