using System.Text;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Texto vindo de fora (valores de parâmetros, títulos) dentro de w:t.</summary>
internal static class XmlText
{
    /// <summary>Tira caracteres que o XML 1.0 não aceita (o XmlWriter recusaria ao salvar).</summary>
    public static string RemoveInvalidChars(string value)
    {
        StringBuilder? sb = null;
        for (int i = 0; i < value.Length; i++)
        {
            char c = value[i];
            bool ok;
            if (char.IsHighSurrogate(c) && i + 1 < value.Length && char.IsLowSurrogate(value[i + 1]))
            {
                sb?.Append(c).Append(value[i + 1]);
                i++;
                continue;
            }
            ok = c is '\t' or '\n' or '\r' || (c >= 0x20 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD);
            if (ok)
            {
                sb?.Append(c);
                continue;
            }
            sb ??= new StringBuilder(value, 0, i, value.Length);
        }
        return sb?.ToString() ?? value;
    }

    /// <summary>w:t com xml:space="preserve".</summary>
    public static XElement T(string text) =>
        new(W.t, new XAttribute(Ns.Xml + "space", "preserve"), text);

    /// <summary>Conteúdo de run para um texto: tabulação vira w:tab e quebras de linha viram w:br.</summary>
    public static IEnumerable<XElement> RunContent(string text)
    {
        text = RemoveInvalidChars(text);
        var sb = new StringBuilder();
        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            if (c is '\t' or '\n' or '\r' or '\v')
            {
                if (sb.Length > 0) { yield return T(sb.ToString()); sb.Clear(); }
                if (c == '\t') yield return new XElement(W.tab);
                else
                {
                    if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                    yield return new XElement(W.br);
                }
                continue;
            }
            sb.Append(c);
        }
        if (sb.Length > 0) yield return T(sb.ToString());
    }

    /// <summary>Run com as propriedades dadas (clonadas) e o texto.</summary>
    public static XElement Run(XElement? rPr, string text)
    {
        var run = new XElement(W.r);
        if (rPr is not null) run.Add(new XElement(rPr));
        run.Add(RunContent(text));
        return run;
    }
}

/// <summary>Ordem dos filhos exigida pelo schema (o Word recusa propriedades fora de ordem).</summary>
internal static class XmlOrder
{
    private static XName[] Names(params string[] locals) => locals.Select(l => Ns.W + l).ToArray();

    public static readonly XName[] PPr = Names(
        "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr", "suppressLineNumbers",
        "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE",
        "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents",
        "suppressOverlap", "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle",
        "rPr", "sectPr", "pPrChange");

    public static readonly XName[] RPr = Names(
        "rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss",
        "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing", "w", "kern", "position", "sz", "szCs",
        "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout",
        "specVanish", "oMath");

    public static readonly XName[] NumPr = Names("ilvl", "numId", "numberingChange", "ins");

    public static readonly XName[] SectPr = Names(
        "headerReference", "footerReference", "footnotePr", "endnotePr", "type", "pgSz", "pgMar", "paperSrc", "pgBorders",
        "lnNumType", "pgNumType", "cols", "formProt", "vAlign", "noEndnote", "titlePg", "textDirection", "bidi", "rtlGutter",
        "docGrid", "printerSettings", "sectPrChange");

    public static readonly XName[] Settings = Names(
        "writeProtection", "view", "zoom", "removePersonalInformation", "removeDateAndTime", "doNotDisplayPageBoundaries",
        "displayBackgroundShape", "printPostScriptOverText", "printFractionalCharacterWidth", "printFormsData",
        "embedTrueTypeFonts", "embedSystemFonts", "saveSubsetFonts", "saveFormsData", "mirrorMargins", "alignBordersAndEdges",
        "bordersDoNotSurroundHeader", "bordersDoNotSurroundFooter", "gutterAtTop", "hideSpellingErrors", "hideGrammaticalErrors",
        "activeWritingStyle", "proofState", "formsDesign", "attachedTemplate", "linkStyles", "stylePaneFormatFilter",
        "stylePaneSortMethod", "documentType", "mailMerge", "revisionView", "trackRevisions", "doNotTrackMoves",
        "doNotTrackFormatting", "documentProtection");

    /// <summary>
    /// Substitui (ou insere na posição do schema) o filho de mesmo nome. Filhos de nomes
    /// fora da lista ficam onde estão; o novo entra antes do primeiro que deve vir depois dele.
    /// </summary>
    public static XElement Set(XElement parent, XElement child, XName[] order)
    {
        var existing = parent.Element(child.Name);
        if (existing is not null)
        {
            existing.ReplaceWith(child);
            return child;
        }
        int rank = Array.IndexOf(order, child.Name);
        if (rank >= 0)
        {
            foreach (var sibling in parent.Elements())
            {
                int r = Array.IndexOf(order, sibling.Name);
                if (r > rank)
                {
                    sibling.AddBeforeSelf(child);
                    return child;
                }
            }
        }
        parent.Add(child);
        return child;
    }

    /// <summary>Filho <paramref name="name"/> de <paramref name="parent"/>, criado na posição do schema se faltar.</summary>
    public static XElement Ensure(XElement parent, XName name, XName[] order) =>
        parent.Element(name) ?? Set(parent, new XElement(name), order);

    /// <summary>w:pPr do parágrafo (criado como primeiro filho se faltar).</summary>
    public static XElement EnsurePPr(XElement p)
    {
        var pPr = p.Element(W.pPr);
        if (pPr is not null) return pPr;
        pPr = new XElement(W.pPr);
        p.AddFirst(pPr);
        return pPr;
    }

    /// <summary>w:rPr do run (criado como primeiro filho se faltar).</summary>
    public static XElement EnsureRPr(XElement r)
    {
        var rPr = r.Element(W.rPr);
        if (rPr is not null) return rPr;
        rPr = new XElement(W.rPr);
        r.AddFirst(rPr);
        return rPr;
    }
}

/// <summary>Operações sobre árvores XML que não dependem da pilha (profundidade qualquer).</summary>
internal static class XmlTree
{
    /// <summary>
    /// Cópia profunda iterativa — o construtor de cópia do <see cref="XElement"/> é
    /// recursivo e estoura a pilha com XML muito aninhado. Mesmo resultado: nome,
    /// atributos (inclusive declarações de namespace), texto, CDATA, comentários,
    /// instruções de processamento e a forma vazia (<c>&lt;a/&gt;</c> × <c>&lt;a&gt;&lt;/a&gt;</c>).
    /// </summary>
    public static XElement DeepClone(XElement source)
    {
        var root = ShallowClone(source);
        var pending = new Stack<(XElement Source, XElement Target)>();
        pending.Push((source, root));
        while (pending.TryPop(out var item))
        {
            foreach (var node in item.Source.Nodes())
            {
                switch (node)
                {
                    case XElement child:
                        var copy = ShallowClone(child);
                        item.Target.Add(copy);
                        pending.Push((child, copy));
                        break;
                    case XCData cdata:
                        item.Target.Add(new XCData(cdata));
                        break;
                    case XText text:
                        item.Target.Add(new XText(text));
                        break;
                    case XComment comment:
                        item.Target.Add(new XComment(comment));
                        break;
                    case XProcessingInstruction instruction:
                        item.Target.Add(new XProcessingInstruction(instruction));
                        break;
                }
            }
        }
        return root;
    }

    /// <summary>
    /// Tira os nós do lugar em lote: cada pai é remontado uma vez (O(filhos)), em vez
    /// de <see cref="XNode.Remove"/> por nó, que custa a posição do nó no pai.
    /// </summary>
    public static void RemoveAll(IEnumerable<XNode> nodes)
    {
        var set = new HashSet<XNode>(nodes.Where(n => n.Parent is not null));
        foreach (var parent in set.Select(n => n.Parent!).Distinct().ToList())
        {
            var kept = parent.Nodes().Where(n => !set.Contains(n)).ToList();
            parent.RemoveNodes();
            parent.Add(kept);
        }
    }

    /// <summary>
    /// Troca cada elemento pelos filhos dele (desembrulha), em lote por pai — os mais
    /// profundos antes, para que aninhados saiam inteiros.
    /// </summary>
    public static void Unwrap(IReadOnlyCollection<XElement> elements)
    {
        if (elements.Count == 0) return;
        var set = new HashSet<XElement>(elements.Where(e => e.Parent is not null));
        var parents = set.Select(e => e.Parent!).Distinct().OrderByDescending(p => p.Ancestors().Count()).ToList();
        foreach (var parent in parents)
        {
            var nodes = parent.Nodes().ToList();
            parent.RemoveNodes();
            var rebuilt = new List<XNode>(nodes.Count);
            foreach (var node in nodes)
            {
                if (node is XElement element && set.Contains(element))
                {
                    var children = element.Nodes().ToList();
                    element.RemoveNodes();
                    rebuilt.AddRange(children);
                }
                else rebuilt.Add(node);
            }
            parent.Add(rebuilt);
        }
    }

    private static XElement ShallowClone(XElement source)
    {
        var copy = new XElement(source.Name, source.Attributes().Select(a => new XAttribute(a)));
        if (!source.IsEmpty && source.FirstNode is null) copy.Value = string.Empty;
        return copy;
    }
}
