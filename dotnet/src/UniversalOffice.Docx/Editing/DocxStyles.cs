using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Consultas e criação de estilos (word/styles.xml).</summary>
public static class DocxStyles
{
    /// <summary>Raiz w:styles (criada vazia quando <paramref name="create"/>).</summary>
    internal static XElement? Root(DocxDocument doc, bool create = false) =>
        doc.MainRelatedRoot("styles", create, "word/styles.xml", ContentTypes.Styles, W.styles);

    internal static IEnumerable<XElement> All(XElement? stylesRoot) =>
        stylesRoot?.Elements(W.style) ?? [];

    internal static string? Id(XElement style) => (string?)style.Attribute(W.styleId);

    internal static string? Name(XElement style) => (string?)style.Element(W.name)?.Attribute(W.val);

    internal static string Type(XElement style) => (string?)style.Attribute(W.type) ?? "paragraph";

    /// <summary>Estilo pelo id.</summary>
    internal static XElement? ById(XElement? stylesRoot, string id) =>
        All(stylesRoot).FirstOrDefault(s => Id(s) == id);

    /// <summary>Estilo pelo NOME (sem diferenciar maiúsculas; o nome dos internos é o inglês, ex.: "heading 1").</summary>
    internal static XElement? ByName(XElement? stylesRoot, string name, string? type = null) =>
        All(stylesRoot).FirstOrDefault(s => string.Equals(Name(s), name, StringComparison.OrdinalIgnoreCase) && (type is null || Type(s) == type));

    /// <summary>Id do estilo de parágrafo padrão (w:default="1"), se houver.</summary>
    internal static string? DefaultParagraphStyleId(XElement? stylesRoot) =>
        All(stylesRoot).Where(s => Type(s) == "paragraph" && IsOn((string?)s.Attribute(W.@default))).Select(Id).FirstOrDefault();

    /// <summary>Nome de exibição (w:name) do estilo de parágrafo efetivo do parágrafo.</summary>
    public static string? ParagraphStyleName(DocxDocument doc, XElement paragraph)
    {
        var root = Root(doc);
        string? id = (string?)paragraph.Element(W.pPr)?.Element(W.pStyle)?.Attribute(W.val) ?? DefaultParagraphStyleId(root);
        if (id is null) return null;
        var style = ById(root, id);
        return style is null ? id : Name(style) ?? id;
    }

    internal static bool IsOn(string? value) => value is "1" or "true" or "on";

    private static readonly Dictionary<string, string> BuiltInNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Normal"] = "Normal", ["Title"] = "Title", ["Subtitle"] = "Subtitle", ["ListParagraph"] = "List Paragraph",
        ["Quote"] = "Quote", ["IntenseQuote"] = "Intense Quote", ["Caption"] = "caption", ["NoSpacing"] = "No Spacing",
        ["Hyperlink"] = "Hyperlink", ["FootnoteText"] = "footnote text", ["FootnoteReference"] = "footnote reference",
        ["Header"] = "header", ["Footer"] = "footer", ["TableGrid"] = "Table Grid", ["Strong"] = "Strong", ["Emphasis"] = "Emphasis",
    };

    /// <summary>Nome interno (inglês) de um id de estilo interno do Word (Heading1 → "heading 1", TOC2 → "toc 2"…).</summary>
    internal static string? BuiltInName(string styleId)
    {
        if (BuiltInNames.TryGetValue(styleId, out var name)) return name;
        foreach (var (prefix, display) in new[] { ("Heading", "heading "), ("TOC", "toc ") })
            if (styleId.Length == prefix.Length + 1 && styleId.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && char.IsAsciiDigit(styleId[^1]))
                return display + styleId[^1];
        return null;
    }

    /// <summary>
    /// Id do estilo de caractere "Hyperlink" do documento; criado (azul do tema,
    /// sublinhado simples) quando não existe.
    /// </summary>
    internal static string EnsureHyperlinkCharacterStyle(DocxDocument doc)
    {
        var root = Root(doc, create: true)!;
        var existing = ByName(root, "Hyperlink", "character");
        if (existing is not null) return Id(existing)!;
        string id = UniqueId(root, "Hyperlink");
        var style = new XElement(W.style, new XAttribute(W.type, "character"), new XAttribute(W.styleId, id),
            new XElement(W.name, new XAttribute(W.val, "Hyperlink")));
        var defaultFont = All(root).FirstOrDefault(s => Type(s) == "character" && IsOn((string?)s.Attribute(W.@default)));
        if (defaultFont is not null) style.Add(new XElement(W.basedOn, new XAttribute(W.val, Id(defaultFont)!)));
        style.Add(new XElement(Ns.W + "uiPriority", new XAttribute(W.val, "99")),
            new XElement(Ns.W + "unhideWhenUsed"),
            new XElement(W.rPr,
                new XElement(W.color, new XAttribute(W.val, "0563C1"), new XAttribute(Ns.W + "themeColor", "hyperlink")),
                new XElement(W.u, new XAttribute(W.val, "single"))));
        root.Add(style);
        return id;
    }

    /// <summary>Id livre baseado em <paramref name="desired"/> (Desired, Desired1, Desired2…).</summary>
    internal static string UniqueId(XElement stylesRoot, string desired)
    {
        var ids = new HashSet<string>(All(stylesRoot).Select(s => Id(s) ?? ""), StringComparer.OrdinalIgnoreCase);
        if (!ids.Contains(desired)) return desired;
        for (int i = 1; ; i++)
        {
            string candidate = desired + i.ToString(System.Globalization.CultureInfo.InvariantCulture);
            if (!ids.Contains(candidate)) return candidate;
        }
    }

    /// <summary>Valor de uma propriedade do parágrafo seguindo a cadeia de estilos (direto → estilo → basedOn…).</summary>
    internal static XElement? ResolvePPrChild(DocxDocument doc, XElement paragraph, XName child)
    {
        var direct = paragraph.Element(W.pPr)?.Element(child);
        if (direct is not null) return direct;
        var root = Root(doc);
        string? id = (string?)paragraph.Element(W.pPr)?.Element(W.pStyle)?.Attribute(W.val) ?? DefaultParagraphStyleId(root);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        while (id is not null && seen.Add(id))
        {
            var style = ById(root, id);
            if (style is null) break;
            var found = style.Element(W.pPr)?.Element(child);
            if (found is not null) return found;
            id = (string?)style.Element(W.basedOn)?.Attribute(W.val);
        }
        return null;
    }
}
