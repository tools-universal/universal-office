using System.Text.RegularExpressions;

namespace UniversalOffice.DocBinary;

/// <summary>STSH → styles.xml — porta de styles-xml.ts.</summary>
internal static class StylesXml
{
    private static readonly string[] AccentBase =
    {
        "Light Shading", "Light List", "Light Grid", "Medium Shading 1", "Medium Shading 2", "Medium List 1",
        "Medium List 2", "Medium Grid 1", "Medium Grid 2", "Medium Grid 3", "Dark List", "Colorful Shading", "Colorful List", "Colorful Grid",
    };

    /// <summary>Estilos de tabela com ênfase (14 por cor de ênfase).</summary>
    private static IEnumerable<string> Accent(int n, int from = 0, int to = 14) =>
        AccentBase.Skip(from).Take(to - from).Select(b => $"{b} Accent {n}");

    /// <summary>Nomes dos estilos internos por sti ([ECMA-376] 17.7.4.9).</summary>
    public static readonly string[] StiNames = new[]
    {
        "Normal", "heading 1", "heading 2", "heading 3", "heading 4", "heading 5", "heading 6", "heading 7",
        "heading 8", "heading 9", "index 1", "index 2", "index 3", "index 4", "index 5", "index 6", "index 7",
        "index 8", "index 9", "toc 1", "toc 2", "toc 3", "toc 4", "toc 5", "toc 6", "toc 7", "toc 8", "toc 9",
        "Normal Indent", "footnote text", "annotation text", "header", "footer", "index heading", "caption",
        "table of figures", "envelope address", "envelope return", "footnote reference", "annotation reference",
        "line number", "page number", "endnote reference", "endnote text", "table of authorities", "macro",
        "toa heading", "List", "List Bullet", "List Number", "List 2", "List 3", "List 4", "List 5",
        "List Bullet 2", "List Bullet 3", "List Bullet 4", "List Bullet 5", "List Number 2", "List Number 3",
        "List Number 4", "List Number 5", "Title", "Closing", "Signature", "Default Paragraph Font", "Body Text",
        "Body Text Indent", "List Continue", "List Continue 2", "List Continue 3", "List Continue 4",
        "List Continue 5", "Message Header", "Subtitle", "Salutation", "Date", "Body Text First Indent",
        "Body Text First Indent 2", "Note Heading", "Body Text 2", "Body Text 3", "Body Text Indent 2",
        "Body Text Indent 3", "Block Text", "Hyperlink", "FollowedHyperlink", "Strong", "Emphasis",
        "Document Map", "Plain Text", "E-mail Signature", "HTML Top of Form", "HTML Bottom of Form",
        "Normal (Web)", "HTML Acronym", "HTML Address", "HTML Cite", "HTML Code", "HTML Definition",
        "HTML Keyboard", "HTML Preformatted", "HTML Sample", "HTML Typewriter", "HTML Variable", "Normal Table",
        "annotation subject", "No List", "Outline List 1", "Outline List 2", "Outline List 3", "Table Simple 1",
        "Table Simple 2", "Table Simple 3", "Table Classic 1", "Table Classic 2", "Table Classic 3",
        "Table Classic 4", "Table Colorful 1", "Table Colorful 2", "Table Colorful 3", "Table Columns 1",
        "Table Columns 2", "Table Columns 3", "Table Columns 4", "Table Columns 5", "Table Grid 1",
        "Table Grid 2", "Table Grid 3", "Table Grid 4", "Table Grid 5", "Table Grid 6", "Table Grid 7",
        "Table Grid 8", "Table List 1", "Table List 2", "Table List 3", "Table List 4", "Table List 5",
        "Table List 6", "Table List 7", "Table List 8", "Table 3D effects 1", "Table 3D effects 2",
        "Table 3D effects 3", "Table Contemporary", "Table Elegant", "Table Professional", "Table Subtle 1",
        "Table Subtle 2", "Table Web 1", "Table Web 2", "Table Web 3", "Balloon Text", "Table Grid", "Table Theme",
        // Word 2007+ (sti 156-266; ordem conferida contra o .docx do Word)
        "Placeholder Text", "No Spacing", "Light Shading", "Light List", "Light Grid", "Medium Shading 1",
        "Medium Shading 2", "Medium List 1", "Medium List 2", "Medium Grid 1", "Medium Grid 2", "Medium Grid 3",
        "Dark List", "Colorful Shading", "Colorful List", "Colorful Grid",
    }
        .Concat(Accent(1, 0, 6)).Concat(new[] { "Revision", "List Paragraph", "Quote", "Intense Quote" }).Concat(Accent(1, 6, 14))
        .Concat(Accent(2)).Concat(Accent(3)).Concat(Accent(4)).Concat(Accent(5)).Concat(Accent(6))
        .Concat(new[] { "Subtle Emphasis", "Intense Emphasis", "Subtle Reference", "Intense Reference", "Book Title", "Bibliography", "TOC Heading" })
        .ToArray();

    /// <summary>styleIds do Word (inglês) que não saem do nome só tirando espaços.</summary>
    private static readonly Dictionary<string, string> SpecialIds = new(StringComparer.Ordinal)
    {
        ["annotation text"] = "CommentText", ["annotation reference"] = "CommentReference", ["annotation subject"] = "CommentSubject",
        ["Normal Table"] = "TableNormal", ["table of figures"] = "TableofFigures", ["table of authorities"] = "TableofAuthorities",
        ["toa heading"] = "TOAHeading", ["Normal (Web)"] = "NormalWeb", ["E-mail Signature"] = "E-mailSignature",
        ["macro"] = "MacroText", ["List"] = "List", ["line number"] = "LineNumber",
    };

    private static readonly Regex NotIdChar = new("[^A-Za-z0-9-]", RegexOptions.CultureInvariant);
    private static readonly Regex JsSpaces = new(Xml.JsS + "+", RegexOptions.CultureInvariant);

    private static string EnglishId(string name)
    {
        if (SpecialIds.TryGetValue(name, out var sp)) return sp;
        var toc = Regex.Match(name, "^toc ([0-9])$", RegexOptions.CultureInvariant);
        // `$` do .NET aceita um \n final; o do JS não (nomes internos não têm \n)
        if (toc.Success && !name.EndsWith('\n')) return $"TOC{toc.Groups[1].Value}";
        var words = JsSpaces.Split(name).Select(w => w.Length > 0 ? JsUpper(w[0]) + w[1..] : "");
        return NotIdChar.Replace(string.Concat(words), "");
    }

    /// <summary>toUpperCase de um caractere (só ASCII acontece aqui, mas mantém a semântica invariante).</summary>
    private static string JsUpper(char c) => c.ToString().ToUpperInvariant();

    /// <summary>sti esparsos depois de 266 (Word 2013+), conferidos no Word.</summary>
    private static readonly Dictionary<int, string> StiExtra = new() { [374] = "Unresolved Mention" };

    public static string StyleName(DocStyle st)
    {
        if (st.Sti < StiNames.Length) return StiNames[st.Sti];
        if (StiExtra.TryGetValue(st.Sti, out var x)) return x;
        return st.Name.Length > 0 ? st.Name : $"Estilo {st.Istd}";
    }

    public static Dictionary<int, string> StyleIdMap(List<DocStyle?> styles)
    {
        var ids = new Dictionary<int, string>();
        var used = new HashSet<string>(StringComparer.Ordinal);
        // estilos internos primeiro (ids "reservados")
        var order = styles.Where(s => s is not null).Select(s => s!)
            .OrderBy(s => s.Sti < StiNames.Length ? 0 : 1).ThenBy(s => s.Istd).ToList();
        foreach (var st in order)
        {
            string @base = st.Sti < StiNames.Length || StiExtra.ContainsKey(st.Sti) ? EnglishId(StyleName(st)) : NotIdChar.Replace(st.Name ?? "", "");
            string id = @base;
            if (@base.Length == 0)
            {
                // nome sem caracteres ASCII (ou vazio): o Word usa "a", "a0", "a1"...
                id = "a";
                for (int k = 0; used.Contains(id.ToLowerInvariant()); k++) id = $"a{k}";
            }
            else
            {
                int k = 1;
                while (used.Contains(id.ToLowerInvariant())) id = $"{@base}{++k}";
            }
            used.Add(id.ToLowerInvariant());
            ids[st.Istd] = id;
        }
        return ids;
    }

    private static string StyleXml(DocReader r, DocStyle st, Dictionary<int, string> ids, PropCtx ctx, Func<int, int> numIdOf)
    {
        string[] types = { "", "paragraph", "character", "table", "numbering" };
        string type = st.Stk >= 0 && st.Stk < types.Length ? types[st.Stk] : "paragraph";
        bool isDefault = (st.Stk == 1 && st.Sti == 0) || (st.Stk == 2 && st.Sti == 65) || (st.Stk == 3 && st.Sti == 105) || (st.Stk == 4 && st.Sti == 107);
        // sem nome gravado (estilo do usuário): o Word omite w:name
        string x = st.Sti >= StiNames.Length && st.Name.Length == 0 ? "" : Xml.El("w:name", new Attrs { { "w:val", StyleName(st) } });
        if (!string.IsNullOrEmpty(st.Aliases)) x += Xml.El("w:aliases", new Attrs { { "w:val", st.Aliases } });
        if (st.IstdBase != Stsh.ISTD_NIL && ids.ContainsKey(st.IstdBase) && st.IstdBase != st.Istd) x += Xml.El("w:basedOn", new Attrs { { "w:val", ids[st.IstdBase] } });
        if (st.Stk == 1 && st.IstdNext != st.Istd && st.IstdNext != Stsh.ISTD_NIL && ids.ContainsKey(st.IstdNext)) x += Xml.El("w:next", new Attrs { { "w:val", ids[st.IstdNext] } });
        if (st.IstdLink is not null && ids.ContainsKey(st.IstdLink.Value)) x += Xml.El("w:link", new Attrs { { "w:val", ids[st.IstdLink.Value] } });
        if (st.AutoRedef) x += "<w:autoRedefine/>";
        if (st.Hidden) x += "<w:hidden/>";
        if (st.SemiHidden) x += "<w:semiHidden/>";
        if (st.UnhideWhenUsed) x += "<w:unhideWhenUsed/>";
        if (st.QFormat) x += "<w:qFormat/>";
        if (st.Locked) x += "<w:locked/>";
        if (st.Stk == 1 || st.Stk == 3 || st.Stk == 4)
        {
            var res = r.Styles.Resolve(st.Istd);
            var parent = st.IstdBase != Stsh.ISTD_NIL && r.Stsh.At(st.IstdBase) is not null ? r.Styles.Resolve(st.IstdBase) : null;
            string ppr = OoxmlProps.PPrInner(res.Pap, res.OwnPap, ctx, new PPrOpts { WithStyle = false, BaseTabs = parent?.Pap.Tabs, NumId = numIdOf });
            if (ppr.Length > 0) x += $"<w:pPr>{ppr}</w:pPr>";
            if (st.Stk != 4)
            {
                string rpr = OoxmlProps.RPrInner(res.Chp, res.OwnChp, ctx, false);
                if (rpr.Length > 0) x += $"<w:rPr>{rpr}</w:rPr>";
            }
            if (st.Stk == 3)
            {
                string tbl = TableStylePr(st);
                if (tbl.Length > 0) x += $"<w:tblPr>{tbl}</w:tblPr>";
            }
        }
        else if (st.Stk == 2)
        {
            var (chp, own) = r.Styles.ResolveChar(st.Istd);
            string rpr = OoxmlProps.RPrInner(chp, own, ctx, false);
            if (rpr.Length > 0) x += $"<w:rPr>{rpr}</w:rPr>";
        }
        return Xml.El("w:style", new Attrs
        {
            { "w:type", type },
            { "w:default", isDefault ? "1" : null },
            { "w:customStyle", st.Sti >= StiNames.Length && !StiExtra.ContainsKey(st.Sti) ? "1" : null },
            { "w:styleId", ids.TryGetValue(st.Istd, out var sid) ? sid : null },
        }, x);
    }

    /// <summary>TAPX de estilo de tabela → w:tblPr (recuo, bordas, margens).</summary>
    private static string TableStylePr(DocStyle st)
    {
        if (st.Tapx is null) return "";
        var tap = TapApply.NewTap();
        foreach (var p in Sprms.Prls(st.Tapx.Value)) if (Sprms.SgcOf(p.Sprm) == 5) TapApply.Apply(tap, p);
        string x = "";
        int? ind = tap.WidthIndent is not null && tap.WidthIndent.Fts == 3 ? tap.WidthIndent.W : tap.DxaLeft;
        if (ind is not null) x += Xml.El("w:tblInd", new Attrs { { "w:w", ind }, { "w:type", "dxa" } });
        if (tap.BordersSet)
        {
            string[] sides = { "top", "left", "bottom", "right", "insideH", "insideV" };
            x += $"<w:tblBorders>{string.Concat(sides.Select((s, i) => OoxmlProps.BrcXml($"w:{s}", tap.Borders.Side(i))))}</w:tblBorders>";
        }
        if (tap.ShdTable is not null) x += OoxmlProps.ShdXml(tap.ShdTable);
        var p2 = tap.Padding;
        if (p2.Top is not null || p2.Left is not null || p2.Bottom is not null || p2.Right is not null)
        {
            string m = "";
            if (p2.Top is not null) m += Xml.El("w:top", new Attrs { { "w:w", p2.Top }, { "w:type", "dxa" } });
            if (p2.Left is not null) m += Xml.El("w:left", new Attrs { { "w:w", p2.Left }, { "w:type", "dxa" } });
            if (p2.Bottom is not null) m += Xml.El("w:bottom", new Attrs { { "w:w", p2.Bottom }, { "w:type", "dxa" } });
            if (p2.Right is not null) m += Xml.El("w:right", new Attrs { { "w:w", p2.Right }, { "w:type", "dxa" } });
            x += $"<w:tblCellMar>{m}</w:tblCellMar>";
        }
        return x;
    }

    public static string Build(DocReader r, PropCtx ctx, Dictionary<int, string> ids, Func<int, int> numIdOf)
    {
        var f = r.Stsh.Stshif;
        string? Font(int ftc) => ftc >= 0 && ftc < r.Fonts.Count ? r.Fonts[ftc].Name : null;
        // docDefaults: fontes padrão do Stshif; idioma do estilo Normal (o Word o move para cá)
        var normal = r.Styles.Resolve(0).Chp;
        int? lid = normal.I(ChpKey.Lid), lidFE = normal.I(ChpKey.LidFE), lidBi = normal.I(ChpKey.LidBi);
        string lang = Xml.El("w:lang", new Attrs
        {
            { "w:val", OoxmlProps.LcidTag(lid) ?? "pt-BR" },
            { "w:eastAsia", OoxmlProps.LcidTag(lidFE) ?? OoxmlProps.LcidTag(lid) ?? "pt-BR" },
            { "w:bidi", OoxmlProps.LcidTag(lidBi is not null && lidBi != 0 && lidBi != 0x400 ? lidBi : 0x0401) ?? "ar-SA" },
        });
        string rFonts = Xml.El("w:rFonts", new Attrs { { "w:ascii", Font(f.FtcAsci) }, { "w:eastAsia", Font(f.FtcFE) }, { "w:hAnsi", Font(f.FtcOther) }, { "w:cs", Font(f.FtcBi) } });
        string x = $"<w:docDefaults><w:rPrDefault><w:rPr>{rFonts}{lang}</w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>";
        foreach (var st in r.Stsh.Styles)
        {
            if (st is null) continue;
            x += StyleXml(r, st, ids, ctx, numIdOf);
        }
        // .doc antigos (Word 97/2000) não trazem estes estilos padrão; o Word os cria ao salvar
        bool Has(int sti, int stk) => r.Stsh.Styles.Any(s => s is not null && s.Sti == sti && s.Stk == stk);
        var used = new HashSet<string>(ids.Values.Select(v => v.ToLowerInvariant()), StringComparer.Ordinal);
        string FreeId(string @base)
        {
            string id = @base;
            for (int k = 2; used.Contains(id.ToLowerInvariant()); k++) id = $"{@base}{k}";
            used.Add(id.ToLowerInvariant());
            return id;
        }
        if (!Has(65, 2)) x += $"<w:style w:type=\"character\" w:default=\"1\" w:styleId=\"{FreeId("DefaultParagraphFont")}\"><w:name w:val=\"Default Paragraph Font\"/><w:semiHidden/></w:style>";
        if (!Has(105, 3))
        {
            x += $"<w:style w:type=\"table\" w:default=\"1\" w:styleId=\"{FreeId("TableNormal")}\"><w:name w:val=\"Normal Table\"/><w:semiHidden/>" +
                "<w:tblPr><w:tblInd w:w=\"0\" w:type=\"dxa\"/><w:tblCellMar><w:top w:w=\"0\" w:type=\"dxa\"/><w:left w:w=\"108\" w:type=\"dxa\"/>" +
                "<w:bottom w:w=\"0\" w:type=\"dxa\"/><w:right w:w=\"108\" w:type=\"dxa\"/></w:tblCellMar></w:tblPr></w:style>";
        }
        if (!Has(107, 4)) x += $"<w:style w:type=\"numbering\" w:default=\"1\" w:styleId=\"{FreeId("NoList")}\"><w:name w:val=\"No List\"/><w:semiHidden/></w:style>";
        return $"{Xml.XML_DECL}<w:styles{Xml.AttrsXml(new Attrs { { "xmlns:w", Xml.NS.W }, { "xmlns:r", Xml.NS.R } })}>{x}</w:styles>";
    }
}
