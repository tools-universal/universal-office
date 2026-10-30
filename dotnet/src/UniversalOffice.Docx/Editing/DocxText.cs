using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Onde procurar texto.</summary>
public enum DocxTextScope
{
    /// <summary>Corpo, cabeçalhos, rodapés e notas (o Replace do DocIO).</summary>
    Document,
    /// <summary>Só o corpo (parte principal, inclusive tabelas e caixas de texto).</summary>
    Body,
}

/// <summary>
/// Busca, substituição e extração de texto. A busca é por parágrafo (como no Word):
/// o texto pode estar quebrado em vários runs; a substituição herda a formatação
/// do primeiro caractere encontrado.
/// </summary>
public static class DocxText
{
    /// <summary>Formato dos parâmetros de modelo: <c>#{Nome}</c>.</summary>
    public static string Parameter(string name) => "#{" + name + "}";

    /// <summary>Qualquer parâmetro <c>#{Letras/dígitos}</c> que tenha sobrado.</summary>
    public static readonly Regex AnyParameter = new(@"#\{[A-Za-z0-9]+\}", RegexOptions.CultureInvariant);

    /// <summary>
    /// Troca todas as ocorrências de <paramref name="find"/> por <paramref name="replacement"/>
    /// (null = vazio). Devolve quantas trocou. <paramref name="wholeWord"/>: a ocorrência não
    /// pode estar colada em letra/dígito do lado em que a busca começa/termina com letra/dígito.
    /// </summary>
    public static int Replace(DocxDocument doc, string find, string? replacement, bool caseSensitive = false, bool wholeWord = true, DocxTextScope scope = DocxTextScope.Document)
    {
        ArgumentException.ThrowIfNullOrEmpty(find);
        int count = 0;
        foreach (var root in Roots(doc, scope))
            foreach (var p in ParagraphText.Paragraphs(root).ToList())
                count += Replace(p, find, replacement ?? "", caseSensitive, wholeWord);
        return count;
    }

    /// <summary>Troca o parâmetro <c>#{name}</c> (sem diferenciar maiúsculas, palavra inteira).</summary>
    public static int ReplaceParameter(DocxDocument doc, string name, string? value) =>
        Replace(doc, Parameter(name), value, caseSensitive: false, wholeWord: true);

    /// <summary>Troca vários parâmetros, na ordem dada.</summary>
    public static int ReplaceParameters(DocxDocument doc, IEnumerable<KeyValuePair<string, string?>> parameters) =>
        parameters.Sum(p => ReplaceParameter(doc, p.Key, p.Value));

    /// <summary>Troca as ocorrências da expressão por <paramref name="replacement"/> (texto literal).</summary>
    public static int Replace(DocxDocument doc, Regex regex, string? replacement, DocxTextScope scope = DocxTextScope.Document)
    {
        int count = 0;
        foreach (var root in Roots(doc, scope))
            foreach (var p in ParagraphText.Paragraphs(root).ToList())
                count += Replace(p, regex, replacement ?? "");
        return count;
    }

    internal static int Replace(XElement paragraph, string find, string replacement, bool caseSensitive, bool wholeWord)
    {
        var text = ParagraphText.Build(paragraph);
        var matches = text.Find(find, caseSensitive, wholeWord);
        for (int k = matches.Count - 1; k >= 0; k--) text.Replace(matches[k].Start, matches[k].Length, replacement);
        return matches.Count;
    }

    internal static int Replace(XElement paragraph, Regex regex, string replacement)
    {
        var text = ParagraphText.Build(paragraph);
        var matches = text.Find(regex);
        for (int k = matches.Count - 1; k >= 0; k--) text.Replace(matches[k].Start, matches[k].Length, replacement);
        return matches.Count;
    }

    /// <summary>O texto ocorre em algum parágrafo?</summary>
    public static bool Contains(DocxDocument doc, string find, bool caseSensitive = true, bool wholeWord = true, DocxTextScope scope = DocxTextScope.Document) =>
        FindParagraphs(doc, find, caseSensitive, wholeWord, scope).Any();

    /// <summary>Parágrafos que contêm o texto, em ordem de documento (corpo primeiro).</summary>
    internal static IEnumerable<XElement> FindParagraphs(DocxDocument doc, string find, bool caseSensitive, bool wholeWord, DocxTextScope scope)
    {
        foreach (var root in Roots(doc, scope))
            foreach (var p in ParagraphText.Paragraphs(root))
                if (ParagraphText.Build(p).Find(find, caseSensitive, wholeWord).Count > 0)
                    yield return p;
    }

    /// <summary>
    /// Remove os parágrafos que contêm algum dos textos (ex.: as amostras <c>#{Heading1}</c>
    /// dos modelos). Parágrafo único de célula/caixa de texto é esvaziado em vez de
    /// removido. Devolve quantos tirou.
    /// </summary>
    public static int RemoveParagraphsContaining(DocxDocument doc, IEnumerable<string> texts, bool caseSensitive = true, bool wholeWord = true, DocxTextScope scope = DocxTextScope.Document)
    {
        var list = texts.ToList();
        int count = 0;
        foreach (var root in Roots(doc, scope))
        {
            foreach (var p in ParagraphText.Paragraphs(root).ToList())
            {
                if (p.Parent is null) continue;
                var text = ParagraphText.Build(p);
                if (!list.Any(t => text.Find(t, caseSensitive, wholeWord).Count > 0)) continue;
                RemoveParagraph(p);
                count++;
            }
        }
        return count;
    }

    /// <summary>Tira o parágrafo; se for o único bloco do contêiner, deixa um parágrafo vazio com as mesmas propriedades.</summary>
    internal static void RemoveParagraph(XElement p)
    {
        var parent = p.Parent;
        if (parent is not null && parent.Name != W.body && !p.ElementsBeforeSelf().Any(DocxStructure.IsBlock) && !p.ElementsAfterSelf().Any(DocxStructure.IsBlock))
        {
            p.Elements().Where(e => e.Name != W.pPr).Remove();
            return;
        }
        p.Remove();
    }

    /// <summary>
    /// Texto puro: um parágrafo por linha (CRLF), tabulação como \t e quebra de linha
    /// como \n; tabelas célula a célula; caixas de texto depois do parágrafo que as
    /// contém; inlines de plugin pelo texto de reserva; código de campo e texto
    /// excluído ficam fora.
    /// </summary>
    public static string GetPlainText(DocxDocument doc, bool includeHeadersAndFooters = false)
    {
        var sb = new StringBuilder();
        foreach (var (_, root) in doc.Stories(includeHeadersAndFooters, includeNotes: false))
        {
            foreach (var p in ParagraphText.Paragraphs(root))
            {
                if (p.Ancestors(Ns.Mc + "Fallback").Any() || p.Ancestors(W.del).Any()) continue;
                if (sb.Length > 0) sb.Append("\r\n");
                sb.Append(ParagraphText.PlainText(p));
            }
        }
        return sb.ToString();
    }

    private static IEnumerable<XElement> Roots(DocxDocument doc, DocxTextScope scope) =>
        scope == DocxTextScope.Body
            ? [doc.MainRoot]
            : doc.Stories().Select(s => s.Root).ToList();
}
