using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Inline de plugin gravado pelo &lt;universal-write&gt;: <c>w:sdt</c> de linha cujo
/// <c>w:tag</c> segue <see cref="CustomInlineTag"/> e cujo conteúdo é o texto de reserva.
/// Obtido por <see cref="DocxCustomInlines.Find"/>; as operações trocam o controle no
/// próprio documento (cada instância só pode ser trocada uma vez).
/// </summary>
public sealed class DocxCustomInline
{
    private readonly DocxDocument _doc;
    private readonly XElement _sdt;

    internal DocxCustomInline(DocxDocument doc, string part, XElement sdt, string type, string json)
    {
        _doc = doc;
        _sdt = sdt;
        PartPath = part;
        Type = type;
        Json = json;
    }

    /// <summary>Tipo do inline (ex.: "myapp.user-tag").</summary>
    public string Type { get; }

    /// <summary>Payload JSON (já decodificado do w:tag).</summary>
    public string Json { get; }

    /// <summary>Parte onde está (document.xml, header1.xml…).</summary>
    public string PartPath { get; }

    /// <summary>Título do controle (w:alias), se houver.</summary>
    public string? Title => (string?)_sdt.Element(W.sdtPr)?.Element(W.alias)?.Attribute(W.val);

    /// <summary>Texto de reserva (o conteúdo do controle).</summary>
    public string Text => ParagraphText.PlainText(new XElement(W.p, Content?.Nodes()));

    /// <summary>Ainda está no documento (não foi trocado/desembrulhado).</summary>
    public bool IsAttached => _sdt.Parent is not null;

    private XElement? Content => _sdt.Element(W.sdtContent);

    /// <summary>w:rPr do primeiro run com texto do conteúdo (a formatação que o texto novo herda).</summary>
    private XElement? FirstRunProperties =>
        Content?.Descendants(W.r).FirstOrDefault(r => r.Elements(W.t).Any())?.Element(W.rPr)
        ?? Content?.Descendants(W.r).FirstOrDefault()?.Element(W.rPr);

    /// <summary>
    /// Troca o controle por um run com o texto, na formatação do primeiro run do
    /// conteúdo. Texto vazio remove o controle.
    /// </summary>
    public void ReplaceWithText(string text)
    {
        EnsureAttached();
        if (string.IsNullOrEmpty(text))
        {
            _sdt.Remove();
            return;
        }
        _sdt.ReplaceWith(XmlText.Run(FirstRunProperties, text));
    }

    /// <summary>
    /// Troca o controle por um hiperlink NATIVO (<c>w:hyperlink</c> + relacionamento
    /// externo; sem campo HYPERLINK). O run herda a formatação do conteúdo e, com
    /// <paramref name="applyHyperlinkStyle"/>, o estilo de caractere "Hyperlink"
    /// (criado se faltar), como o hiperlink que o DocIO inseria. URL que não seja
    /// absoluta com esquema permitido (http, https, mailto) vira só texto — devolve falso.
    /// </summary>
    public bool ReplaceWithHyperlink(string url, string text, bool applyHyperlinkStyle = true, IEnumerable<string>? allowedSchemes = null)
    {
        EnsureAttached();
        if (!DocxFields.IsAllowedUrl(url, allowedSchemes ?? DocxFields.DefaultAllowedSchemes))
        {
            ReplaceWithText(text);
            return false;
        }
        var run = XmlText.Run(FirstRunProperties, text);
        if (applyHyperlinkStyle)
        {
            string styleId = DocxStyles.EnsureHyperlinkCharacterStyle(_doc);
            var rPr = XmlOrder.EnsureRPr(run);
            XmlOrder.Set(rPr, new XElement(W.rStyle, new XAttribute(W.val, styleId)), XmlOrder.RPr);
        }
        string id = _doc.AddRelationship(PartPath, RelTypes.Hyperlink, url, external: true);
        _sdt.ReplaceWith(new XElement(W.hyperlink, new XAttribute(Ns.R + "id", id), new XAttribute(W.history, "1"), run));
        return true;
    }

    /// <summary>Tira o controle e deixa o conteúdo (o texto de reserva) no lugar.</summary>
    public void Unwrap()
    {
        EnsureAttached();
        _sdt.ReplaceWith(Content?.Nodes().ToList() ?? []);
    }

    private void EnsureAttached()
    {
        if (!IsAttached) throw new InvalidOperationException("o controle já foi trocado ou removido do documento");
    }
}

/// <summary>Busca e criação de inlines de plugin (<see cref="CustomInlineTag"/>) num .docx.</summary>
public static class DocxCustomInlines
{
    /// <summary>
    /// Inlines de plugin de todas as partes com texto (corpo, cabeçalhos, rodapés,
    /// notas), em ordem de documento; <paramref name="type"/> filtra pelo tipo.
    /// Controles com w:tag fora do contrato (ou JSON inválido) não entram.
    /// </summary>
    public static IReadOnlyList<DocxCustomInline> Find(DocxDocument doc, string? type = null)
    {
        var list = new List<DocxCustomInline>();
        foreach (var (part, root) in doc.Stories())
        {
            foreach (var sdt in root.Descendants(W.sdt))
            {
                if (!IsInline(sdt)) continue;
                var tag = (string?)sdt.Element(W.sdtPr)?.Element(W.tag)?.Attribute(W.val);
                if (!CustomInlineTag.TryParse(tag, out var t, out var json)) continue;
                if (type is not null && t != type) continue;
                list.Add(new DocxCustomInline(doc, part, sdt, t, json));
            }
        }
        return list;
    }

    /// <summary>
    /// Troca cada ocorrência do texto <paramref name="marker"/> (mesmo quebrado em
    /// vários runs) por um inline de plugin com o texto de reserva dado, na formatação
    /// do primeiro run da ocorrência. Ocorrências dentro do texto de reserva recém-
    /// inserido não são trocadas de novo. Devolve quantas trocou.
    /// </summary>
    public static int ReplaceText(DocxDocument doc, string marker, string type, string json, string fallbackText)
    {
        ArgumentException.ThrowIfNullOrEmpty(marker);
        string tag = CustomInlineTag.Format(type, json);
        fallbackText = XmlText.RemoveInvalidChars(fallbackText);
        int count = 0;
        foreach (var (_, root) in doc.Stories())
        {
            foreach (var p in ParagraphText.Paragraphs(root).ToList())
            {
                var text = ParagraphText.Build(p);
                var matches = text.Find(marker, caseSensitive: true, wholeWord: false);
                for (int k = matches.Count - 1; k >= 0; k--)
                {
                    var (start, length) = matches[k];
                    ParagraphText.Build(p).ReplaceWithElement(start, length, rPr => Create(tag, fallbackText, rPr));
                    count++;
                }
            }
        }
        return count;
    }

    /// <summary>XML do inline (o mesmo que o serialize.ts grava): alias, tag, lock sdtLocked e o run de reserva.</summary>
    public static XElement Create(string tag, string fallbackText, XElement? runProperties) =>
        new(W.sdt,
            new XElement(W.sdtPr,
                new XElement(W.alias, new XAttribute(W.val, fallbackText)),
                new XElement(W.tag, new XAttribute(W.val, tag)),
                new XElement(W.@lock, new XAttribute(W.val, "sdtLocked"))),
            new XElement(W.sdtContent, XmlText.Run(runProperties, fallbackText)));

    /// <summary>w:sdt de linha (o conteúdo não tem parágrafos nem tabelas).</summary>
    internal static bool IsInline(XElement sdt)
    {
        var content = sdt.Element(W.sdtContent);
        return content is not null && !content.Elements().Any(e => e.Name == W.p || e.Name == W.tbl || e.Name == W.tr || e.Name == W.tc);
    }

    /// <summary>
    /// Desembrulha os inlines para os quais <paramref name="isValid"/> devolve falso
    /// (o conteúdo de reserva fica). Devolve quantos desembrulhou.
    /// </summary>
    public static int UnwrapInvalid(DocxDocument doc, Func<string, string, bool> isValid)
    {
        int count = 0;
        foreach (var inline in Find(doc))
        {
            if (isValid(inline.Type, inline.Json)) continue;
            inline.Unwrap();
            count++;
        }
        return count;
    }
}
