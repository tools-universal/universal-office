using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Texto de um parágrafo montado a partir dos w:t dos runs (inclusive dentro de
/// hiperlinks, controles de conteúdo, campos simples, smart tags), para buscar e
/// substituir texto que o Word quebrou em vários runs. Tabulação, quebra, símbolo,
/// objeto e equação entram como um caractere-sentinela que nunca casa com a busca.
/// Texto excluído (w:del) e código de campo (w:instrText) ficam fora. Parágrafos de
/// caixas de texto dentro do parágrafo são parágrafos próprios (não entram aqui).
/// </summary>
internal sealed class ParagraphText
{
    /// <summary>Caractere que representa conteúdo sem texto buscável.</summary>
    public const char Sentinel = (char)0xFFFF;

    internal readonly record struct Segment(XElement T, int Start, int Length);

    public XElement Paragraph { get; }
    public string Text { get; }
    private readonly List<Segment> _segments;

    private ParagraphText(XElement paragraph, string text, List<Segment> segments)
    {
        Paragraph = paragraph;
        Text = text;
        _segments = segments;
    }

    public static ParagraphText Build(XElement paragraph)
    {
        var sb = new StringBuilder();
        var segments = new List<Segment>();
        Walk(paragraph, sb, segments);
        return new ParagraphText(paragraph, sb.ToString(), segments);
    }

    private static void Walk(XElement container, StringBuilder sb, List<Segment> segments)
    {
        foreach (var child in container.Elements())
        {
            var name = child.Name;
            if (name == W.r)
            {
                foreach (var rc in child.Elements())
                {
                    var rn = rc.Name;
                    if (rn == W.t)
                    {
                        string value = rc.Value;
                        segments.Add(new Segment(rc, sb.Length, value.Length));
                        sb.Append(value);
                    }
                    else if (rn == W.tab || rn == W.br || rn == W.cr || rn == W.sym || rn == W.noBreakHyphen || rn == W.ptab
                             || rn == W.drawing || rn == W.pict || rn == W.@object || rn.Namespace == Ns.Mc
                             || rn == W.footnoteReference || rn == W.endnoteReference)
                    {
                        sb.Append(Sentinel);
                    }
                }
            }
            else if (name == W.hyperlink || name == W.smartTag || name == W.customXml || name == W.fldSimple
                     || name == W.ins || name == W.moveTo || name == W.dir || name == W.bdo)
            {
                Walk(child, sb, segments);
            }
            else if (name == W.sdt)
            {
                var content = child.Element(W.sdtContent);
                if (content is not null) Walk(content, sb, segments);
            }
            else if (name.Namespace == Ns.M)
            {
                sb.Append(Sentinel);
            }
        }
    }

    // ─────────────────────────────── busca ───────────────────────────────

    /// <summary>Ocorrências (início, tamanho), da esquerda para a direita, sem sobreposição.</summary>
    public List<(int Start, int Length)> Find(string needle, bool caseSensitive, bool wholeWord)
    {
        var result = new List<(int, int)>();
        if (needle.Length == 0) return result;
        var comparison = caseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
        int from = 0;
        while (from <= Text.Length - needle.Length)
        {
            int at = Text.IndexOf(needle, from, comparison);
            if (at < 0) break;
            if (Text.AsSpan(at, needle.Length).Contains(Sentinel) || (wholeWord && !IsWholeWord(Text, at, needle.Length)))
            {
                from = at + 1;
                continue;
            }
            result.Add((at, needle.Length));
            from = at + needle.Length;
        }
        return result;
    }

    /// <summary>Ocorrências de uma expressão regular (sem as que atravessam sentinelas).</summary>
    public List<(int Start, int Length)> Find(Regex regex)
    {
        var result = new List<(int, int)>();
        foreach (Match m in regex.Matches(Text))
        {
            if (m.Length == 0 || m.Value.Contains(Sentinel)) continue;
            result.Add((m.Index, m.Length));
        }
        return result;
    }

    /// <summary>
    /// "Palavra inteira": se a busca começa com letra/dígito, o caractere anterior não
    /// pode ser letra/dígito; idem no fim. Busca que começa/termina com símbolo
    /// (ex.: <c>#{Title}</c>) não exige fronteira daquele lado.
    /// </summary>
    internal static bool IsWholeWord(string text, int start, int length)
    {
        bool startsWord = IsWordChar(text[start]);
        bool endsWord = IsWordChar(text[start + length - 1]);
        if (startsWord && start > 0 && IsWordChar(text[start - 1])) return false;
        if (endsWord && start + length < text.Length && IsWordChar(text[start + length])) return false;
        return true;
    }

    private static bool IsWordChar(char c) => char.IsLetterOrDigit(c) || c == '_';

    // ─────────────────────────────── edição ───────────────────────────────

    /// <summary>
    /// Troca o trecho pelo texto dado. O texto novo fica no run do PRIMEIRO caractere
    /// do trecho (herda a formatação dele, como o Replace do DocIO); runs que ficam
    /// sem conteúdo saem. Tabulação/quebras de linha do valor viram w:tab/w:br.
    /// Aplique de trás para frente quando houver várias ocorrências.
    /// </summary>
    public void Replace(int start, int length, string replacement)
    {
        int end = start + length;
        var touched = _segments.Where(s => s.Length > 0 && s.Start < end && s.Start + s.Length > start).ToList();
        if (touched.Count == 0)
        {
            // trecho vazio: o texto entra no segmento que contém (ou termina em) start
            int host = _segments.FindLastIndex(s => s.Start <= start && s.Start + s.Length >= start);
            if (host < 0) return;
            touched = [_segments[host]];
        }
        var first = touched[0];
        string firstText = first.T.Value;
        int localStart = Math.Clamp(start - first.Start, 0, firstText.Length);
        string suffix = touched.Count == 1 ? firstText[Math.Clamp(end - first.Start, localStart, firstText.Length)..] : "";
        ReplaceTextElement(first.T, firstText[..localStart], replacement, suffix);
        for (int k = 1; k < touched.Count; k++)
        {
            var seg = touched[k];
            string text = seg.T.Value;
            SetText(seg.T, k == touched.Count - 1 ? text[Math.Clamp(end - seg.Start, 0, text.Length)..] : "");
        }
    }

    /// <summary>
    /// Troca o trecho por um elemento de conteúdo de parágrafo (w:sdt, w:hyperlink,
    /// run com desenho…) criado a partir do w:rPr do primeiro run do trecho.
    /// O elemento entra no lugar do trecho, no mesmo contêiner do primeiro run.
    /// </summary>
    public XElement ReplaceWithElement(int start, int length, Func<XElement?, XElement> create)
    {
        char placeholder = PickPlaceholder(Text);
        Replace(start, length, placeholder.ToString());
        var rebuilt = Build(Paragraph);
        int at = rebuilt.Text.IndexOf(placeholder);
        var seg = rebuilt._segments.First(s => at >= s.Start && at < s.Start + s.Length);
        var run = seg.T.Parent!;
        // isola o placeholder num run só dele
        int local = at - seg.Start;
        var after = SplitRun(run, seg.T, local + 1);
        var middle = SplitRun(run, seg.T, local);
        RemoveIfEmpty(after);
        var rPr = middle.Element(W.rPr);
        var element = create(rPr is null ? null : new XElement(rPr));
        middle.ReplaceWith(element);
        RemoveIfEmpty(run);
        return element;
    }

    private static char PickPlaceholder(string text)
    {
        for (int code = 0xF8FF; code >= 0xE000; code--)
            if (text.IndexOf((char)code) < 0) return (char)code;
        throw new InvalidOperationException("sem caractere livre para marcar o trecho");
    }

    /// <summary>
    /// Divide o run no offset dentro do w:t dado: o run original fica com o que vem
    /// antes; um run novo (mesmo w:rPr) com o resto, logo depois. Devolve o run novo.
    /// </summary>
    internal static XElement SplitRun(XElement run, XElement t, int offset)
    {
        var tail = new XElement(run.Name, run.Attributes());
        var rPr = run.Element(W.rPr);
        if (rPr is not null) tail.Add(new XElement(rPr));
        string text = t.Value;
        if (offset < text.Length) tail.Add(XmlText.T(text[offset..]));
        var following = t.ElementsAfterSelf().ToList();
        foreach (var f in following)
        {
            f.Remove();
            tail.Add(f);
        }
        if (offset <= 0) t.Remove();
        else SetText(t, text[..offset]);
        run.AddAfterSelf(tail);
        return tail;
    }

    private static void ReplaceTextElement(XElement t, string prefix, string replacement, string suffix)
    {
        string full = prefix + replacement + suffix;
        if (full.IndexOfAny(['\t', '\n', '\r', '\v']) < 0)
        {
            SetText(t, XmlText.RemoveInvalidChars(full));
            return;
        }
        var parts = XmlText.RunContent(full).ToList();
        t.ReplaceWith(parts);
    }

    private static void SetText(XElement t, string value)
    {
        if (value.Length == 0)
        {
            var run = t.Parent;
            t.Remove();
            if (run is not null) RemoveIfEmpty(run);
            return;
        }
        t.Value = value;
        if (value.Length != value.Trim().Length || value.Contains("  ", StringComparison.Ordinal))
            t.SetAttributeValue(Ns.Xml + "space", "preserve");
    }

    /// <summary>Remove o run se sobrou só o w:rPr.</summary>
    internal static void RemoveIfEmpty(XElement run)
    {
        if (run.Name != W.r || run.Parent is null) return;
        if (run.Elements().All(e => e.Name == W.rPr)) run.Remove();
    }

    // ─────────────────────────────── consultas ───────────────────────────────

    /// <summary>Todos os parágrafos (inclusive em tabelas e caixas de texto), em ordem de documento.</summary>
    public static IEnumerable<XElement> Paragraphs(XElement root) => root.Descendants(W.p);

    /// <summary>Texto "visível" do parágrafo para extração (tabulação \t, quebra \n).</summary>
    public static string PlainText(XElement paragraph)
    {
        var sb = new StringBuilder();
        PlainWalk(paragraph, sb);
        return sb.ToString();
    }

    private static void PlainWalk(XElement container, StringBuilder sb)
    {
        foreach (var child in container.Elements())
        {
            var name = child.Name;
            if (name == W.r)
            {
                foreach (var rc in child.Elements())
                {
                    if (rc.Name == W.t) sb.Append(rc.Value);
                    else if (rc.Name == W.tab || rc.Name == W.ptab) sb.Append('\t');
                    else if (rc.Name == W.br || rc.Name == W.cr) sb.Append('\n');
                    else if (rc.Name == W.noBreakHyphen) sb.Append('-');
                }
            }
            else if (name == W.hyperlink || name == W.smartTag || name == W.customXml || name == W.fldSimple
                     || name == W.ins || name == W.moveTo || name == W.dir || name == W.bdo)
            {
                PlainWalk(child, sb);
            }
            else if (name == W.sdt)
            {
                var content = child.Element(W.sdtContent);
                if (content is not null) PlainWalk(content, sb);
            }
        }
    }
}
