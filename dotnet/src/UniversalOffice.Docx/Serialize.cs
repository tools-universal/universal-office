using System.Text;
using System.Text.RegularExpressions;

namespace UniversalOffice.Docx;

/// <summary>
/// Serialização do document.xml — porta do SUBSET paragraphs/runs/props/numbering
/// de docx-core/src/serialize.ts (ordem canônica de elementos do word-lab:
/// rPr: rFonts → b → i → caps → smallCaps → strike → color → sz → highlight →
/// u → vertAlign; pPr: pStyle → numPr → spacing → ind → jc).
/// Imagens/headers/footers/comentários ficam fora do subset da fase 1.
/// Revisões (w:ins/w:del/moveFrom/moveTo, marcas de parágrafo, w:rPrChange e
/// w:pPrChange) saem das props, como no caminho sem fonte original do JS.
/// </summary>
public static class DocxSerialize
{
    private static string Esc(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string EscAttr(string s) => Esc(s).Replace("\"", "&quot;");

    private static readonly Regex SegmentRe = new(@"(\t|\n|\f)", RegexOptions.CultureInvariant);

    // ───────────── revisões geradas ao salvar (porta de rev-xml.ts) ─────────────

    private const string W16duNs = "http://schemas.microsoft.com/office/word/2023/wordml/word16du";
    private const string McNs = "http://schemas.openxmlformats.org/markup-compatibility/2006";
    private static readonly Regex RevIdRe = new(@"\bw:id=""(-?\d+)""", RegexOptions.CultureInvariant);
    private static readonly Regex XmlnsW16duRe = new(@"\sxmlns:w16du=", RegexOptions.CultureInvariant);
    private static readonly Regex XmlnsMcRe = new(@"\sxmlns:mc=", RegexOptions.CultureInvariant);
    private static readonly Regex IgnorableRe = new(@"\smc:Ignorable=""([^""]*)""", RegexOptions.CultureInvariant);
    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>
    /// XML das revisões geradas num salvamento (w:ins, w:del, w:rPrChange, w:pPrChange,
    /// marcas de parágrafo): w:id únicos acima dos que o pacote já usa, autor, data
    /// (w:date como o Word grava — hora local com Z) e w16du:dateUtc. Quem usa o
    /// w16du precisa declarar o namespace na raiz da parte (EnsureRevisionNamespaces).
    /// </summary>
    private sealed class RevXml
    {
        private double _nextId = 1;
        /// <summary>algum w16du:dateUtc foi gerado</summary>
        public bool UsedUtc;

        /// <summary>Começo de um salvamento: ids novos acima do maior w:id dos textos dados.</summary>
        public static RevXml Begin(IEnumerable<string?> xmls)
        {
            double max = 0;
            foreach (var x in xmls)
            {
                if (x is null) continue;
                foreach (Match m in RevIdRe.Matches(x)) max = Math.Max(max, double.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture));
            }
            return new RevXml { _nextId = max + 1 };
        }

        private static string EscRev(string s) => Esc(s).Replace("\"", "&quot;");

        /// <summary>Atributos de uma revisão nova: w:id, w:author, w:date, w16du:dateUtc.</summary>
        public string Attrs(RevisionInfo r)
        {
            string a = $" w:id=\"{Js.JsonNumber(_nextId++)}\" w:author=\"{EscRev(r.Author)}\"";
            if (Js.Truthy(r.Date)) a += $" w:date=\"{EscRev(r.Date!)}\"";
            if (Js.Truthy(r.DateUtc)) { a += $" w16du:dateUtc=\"{EscRev(r.DateUtc!)}\""; UsedUtc = true; }
            return a;
        }

        private static string Tag(string kind, RevisionInfo r) => r.Move ? (kind == "ins" ? "w:moveTo" : "w:moveFrom") : $"w:{kind}";

        /// <summary>Elemento de revisão vazio (marca de parágrafo): &lt;w:ins …/&gt;, &lt;w:del …/&gt;, moveFrom/To.</summary>
        public string Mark(string kind, RevisionInfo r) => $"<{Tag(kind, r)}{Attrs(r)}/>";

        /// <summary>Envoltório de runs: abertura e fecho de w:ins/w:del (ou moveTo/moveFrom).</summary>
        public string Wrap(string kind, RevisionInfo r, string inner)
        {
            string tag = Tag(kind, r);
            return $"<{tag}{Attrs(r)}>{inner}</{tag}>";
        }
    }

    /// <summary>Declara w16du (e mc:Ignorable) na tag raiz de uma parte.</summary>
    private static string EnsureRevisionNamespaces(string open, string rootName)
    {
        int at = open.IndexOf("<" + rootName, StringComparison.Ordinal);
        if (at < 0) return open;
        int end = open.IndexOf('>', at);
        string tag = open[at..end];
        if (!XmlnsW16duRe.IsMatch(tag)) tag += $" xmlns:w16du=\"{W16duNs}\"";
        if (!XmlnsMcRe.IsMatch(tag)) tag += $" xmlns:mc=\"{McNs}\"";
        var ign = IgnorableRe.Match(tag);
        if (!ign.Success) tag += " mc:Ignorable=\"w16du\"";
        else if (!WsRe.Split(ign.Groups[1].Value).Contains("w16du"))
        {
            string v = ign.Groups[1].Value;
            int i = tag.IndexOf(ign.Value, StringComparison.Ordinal);
            tag = tag[..i] + $" mc:Ignorable=\"{(v.Length > 0 ? v + " " : "")}w16du\"" + tag[(i + ign.Value.Length)..];
        }
        return open[..at] + tag + open[end..];
    }

    /// <summary>Elemento com conteúdo (vazio: autofechado, como o Word grava).</summary>
    private static string WrapIn(string tag, string inner) => inner.Length > 0 ? $"<{tag}>{inner}</{tag}>" : $"<{tag}/>";

    /// <summary>Conteúdo de um elemento serializado (sem a abertura e o fecho).</summary>
    private static string InnerOf(string xml)
    {
        if (xml.Length == 0) return "";
        int a = xml.IndexOf('>');
        if (a > 0 && xml[a - 1] == '/') return "";
        return xml[(a + 1)..xml.LastIndexOf("</", StringComparison.Ordinal)];
    }

    /// <summary>w:rPr gerado das props (subset; formatação controlada: o rPr de antes, por último).</summary>
    private static string RPrFromProps(RunProps p, RevXml rx)
    {
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
        // formatação controlada: o rPr de antes, por último (CT_RPr)
        if (p.Fmt is not null) rpr.Add($"<w:rPrChange{rx.Attrs(p.Fmt)}>{WrapIn("w:rPr", InnerOf(RPrFromProps(p.Fmt.Old, rx)))}</w:rPrChange>");
        return rpr.Count > 0 ? $"<w:rPr>{string.Concat(rpr)}</w:rPr>" : "";
    }

    /// <summary>Texto do run (excluído em revisão: w:delText).</summary>
    private static string TextXml(string text, bool deleted)
    {
        string t = deleted ? "w:delText" : "w:t";
        var parts = new List<string>();
        foreach (var seg in SegmentRe.Split(text))
        {
            if (seg == "\t") parts.Add("<w:tab/>");
            else if (seg == "\n") parts.Add("<w:br/>");
            else if (seg == "\f") parts.Add("<w:br w:type=\"page\"/>");
            else if (seg.Length > 0)
            {
                string space = seg != seg.Trim() ? " xml:space=\"preserve\"" : "";
                parts.Add($"<{t}{space}>{Esc(seg)}</{t}>");
            }
        }
        return string.Concat(parts);
    }

    private static string RunXml(Run run, RevXml rx)
    {
        string rpr = RPrFromProps(run.Props, rx);
        return $"<w:r>{rpr}{TextXml(run.Text, run.Props.Del is not null)}</w:r>";
    }

    /// <summary>Run de CAMPO: fldSimple com o cache atual (o Word o atualiza sozinho). Dentro
    /// de uma revisão (w:ins/w:del só contêm runs) o campo sai na forma complexa.</summary>
    private static string FieldOrRunXml(Run r, RevXml rx)
    {
        if (r.Field is null) return RunXml(r, rx);
        if (r.Props.Ins is null && r.Props.Del is null) return $"<w:fldSimple w:instr=\"{EscAttr(r.Field)}\">{RunXml(r, rx)}</w:fldSimple>";
        string rpr = RPrFromProps(r.Props, rx);
        string Ch(string type) => $"<w:r>{rpr}<w:fldChar w:fldCharType=\"{type}\"/></w:r>";
        string it = r.Props.Del is not null ? "w:delInstrText" : "w:instrText";
        string begin = Ch("begin");
        string instr = $"<w:r>{rpr}<{it} xml:space=\"preserve\">{Esc(r.Field)}</{it}></w:r>";
        string sep = Ch("separate");
        string result = RunXml(r, rx);
        return begin + instr + sep + result + Ch("end");
    }

    /// <summary>Runs nos envoltórios de revisão, pelas props: w:ins por fora, w:del por dentro
    /// (a inserção de outro autor excluída é &lt;w:ins&gt;&lt;w:del&gt;…, como o Word grava).</summary>
    private static string RevisionRuns(List<Run> items, RevXml rx)
    {
        string Plain(List<Run> xs) => string.Concat(xs.Select(r => FieldOrRunXml(r, rx)));
        string Dels(List<Run> xs)
        {
            var sb = new StringBuilder();
            for (int i = 0; i < xs.Count;)
            {
                var d = xs[i].Props.Del;
                int j = i + 1;
                while (j < xs.Count && Revisions.SameJson(xs[j].Props.Del, d)) j++;
                string inner = Plain(xs.GetRange(i, j - i));
                sb.Append(d is not null ? rx.Wrap("del", d, inner) : inner);
                i = j;
            }
            return sb.ToString();
        }
        var outp = new StringBuilder();
        for (int i = 0; i < items.Count;)
        {
            var ins = items[i].Props.Ins;
            int j = i + 1;
            while (j < items.Count && Revisions.SameJson(items[j].Props.Ins, ins)) j++;
            string inner = Dels(items.GetRange(i, j - i));
            outp.Append(ins is not null ? rx.Wrap("ins", ins, inner) : inner);
            i = j;
        }
        return outp.ToString();
    }

    private static string ParaXml(Paragraph para, RevXml rx) => ParaXmlInner(para, RevisionRuns(para.Runs, rx), rx);

    private static readonly Regex PPrInnerRe = new(@"^<w:p><w:pPr>([\s\S]*)</w:pPr></w:p>\z", RegexOptions.CultureInvariant);

    private static string ParaXmlInner(Paragraph para, string runsXml, RevXml rx)
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
        if (pp.IndentLeftTwips is not null || pp.IndentRightTwips is not null || pp.IndentFirstLineTwips is not null)
        {
            var attrs = new StringBuilder();
            if (pp.IndentLeftTwips is not null) attrs.Append($" w:left=\"{pp.IndentLeftTwips}\"");
            if (pp.IndentRightTwips is not null) attrs.Append($" w:right=\"{pp.IndentRightTwips}\"");
            if (pp.IndentFirstLineTwips is not null)
            {
                attrs.Append(pp.IndentFirstLineTwips >= 0
                    ? $" w:firstLine=\"{pp.IndentFirstLineTwips}\""
                    : $" w:hanging=\"{-pp.IndentFirstLineTwips}\"");
            }
            ppr.Add($"<w:ind{attrs}/>");
        }
        if (pp.Alignment is not null && pp.Alignment != "left") ppr.Add($"<w:jc w:val=\"{pp.Alignment}\"/>");
        // revisões: marca de parágrafo (w:rPr) e formatação controlada (w:pPrChange, a última)
        string mark = (pp.MarkIns is not null ? rx.Mark("ins", pp.MarkIns) : "") + (pp.MarkDel is not null ? rx.Mark("del", pp.MarkDel) : "");
        if (mark.Length > 0) ppr.Add($"<w:rPr>{mark}</w:rPr>");
        if (pp.Pfmt is not null)
        {
            string old = ParaXmlInner(new Paragraph { Props = pp.Pfmt.Old }, "", rx);
            var m = PPrInnerRe.Match(old);
            string oldInner = m.Success ? m.Groups[1].Value : "";
            ppr.Add($"<w:pPrChange{rx.Attrs(pp.Pfmt)}>{(oldInner.Length > 0 ? $"<w:pPr>{oldInner}</w:pPr>" : "<w:pPr/>")}</w:pPrChange>");
        }

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

    public static string SerializeDocument(DocumentModel model) => SerializeDocument(model, new RevXml());

    private static string SerializeDocument(DocumentModel model, RevXml rx)
    {
        string sect = $"<w:sectPr>{SectPrInner(model.SectPr)}</w:sectPr>";
        string body = string.Concat(model.Paragraphs.Select(p => ParaXml(p, rx)));
        // raiz da parte com o namespace w16du se alguma revisão gerada o usou
        string open = $"<w:document {WNs}>";
        if (rx.UsedUtc) open = EnsureRevisionNamespaces(open, "w:document");
        return
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            open + "<w:body>" + body + sect + "</w:body></w:document>";
    }

    private static readonly Regex RevPartRe = new(@"^word/(?:document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml\z", RegexOptions.CultureInvariant);

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
        // ids das revisões novas: acima dos que o pacote já usa
        var rx = RevXml.Begin(pkg.PartNames().Where(p => RevPartRe.IsMatch(p)).Select(p => pkg.GetPartText(p)).ToList());
        pkg.SetPartText("word/document.xml", SerializeDocument(model, rx));

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
