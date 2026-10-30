using System.Text;
using System.Xml.Linq;
using UniversalOffice.Core;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Campos do Word: complexos (w:fldChar begin/separate/end + w:instrText, podendo
/// aninhar e atravessar runs) e simples (w:fldSimple). Nada é avaliado — trocar um
/// campo pelo resultado mantém o texto que o Word deixou em cache.
/// <para>A varredura é linear no tamanho da história; campos sem fim são ignorados.
/// Acima de <see cref="DocxLimits.MaxFieldsPerStory"/> campos ou de
/// <see cref="DocxLimits.MaxFieldNesting"/> campos abertos ao mesmo tempo, as
/// operações lançam <see cref="OfficeLimitExceededException"/> sem alterar a
/// história.</para>
/// </summary>
public static class DocxFields
{
    /// <summary>Campos mantidos pelo saneamento padrão de conteúdo recebido (paginação, sumário, hiperlinks e referências).</summary>
    public static readonly IReadOnlyList<string> DefaultAllowedFields = ["PAGE", "NUMPAGES", "HYPERLINK", "TOC", "REF", "PAGEREF", "SEQ"];

    /// <summary>
    /// Campos mantidos no documento GERADO de um modelo (o modelo é confiável): os de
    /// <see cref="DefaultAllowedFields"/> mais datas, seção, referência de nota e fórmula
    /// (<c>=</c>, ex.: <c>{ = { NUMPAGES } - 1 }</c>, o total de páginas sem a capa — os
    /// campos aninhados no código passam pela mesma lista).
    /// </summary>
    public static readonly IReadOnlyList<string> DefaultOutputAllowedFields =
        [.. DefaultAllowedFields, "DATE", "TIME", "SAVEDATE", "CREATEDATE", "PRINTDATE", "SECTION", "SECTIONPAGES", "NOTEREF", "="];

    /// <summary>Esquemas de URL aceitos em hiperlinks pelo saneamento padrão.</summary>
    public static readonly IReadOnlyList<string> DefaultAllowedSchemes = ["http", "https", "mailto"];

    private const char Backslash = (char)92;

    private sealed class Field
    {
        /// <summary>Filhos de run (sem w:rPr) da história, em ordem de documento; compartilhada pelos campos da varredura.</summary>
        public required List<XElement> Elements;
        public required XElement Begin;
        public required int BeginIndex;
        public XElement? Separate;
        public int SeparateIndex = -1;
        public XElement? End;
        public int EndIndex = -1;
        public readonly StringBuilder Instruction = new();
        public bool InResult => Separate is not null;

        /// <summary>Tudo entre begin e separate (ou end): código, inclusive campos aninhados no código.</summary>
        public IEnumerable<XElement> InstructionContent
        {
            get
            {
                int stop = SeparateIndex >= 0 ? SeparateIndex : EndIndex;
                for (int i = BeginIndex + 1; i < stop; i++) yield return Elements[i];
            }
        }
    }

    /// <summary>Instrução de campo já montada (nome = primeira palavra, maiúsculo; fórmula = <c>=</c>).</summary>
    public readonly record struct FieldInstruction(string Name, string Text);

    /// <summary>
    /// Troca pelo resultado em cache todo campo cujo nome não está em
    /// <paramref name="allowedFields"/> e todo HYPERLINK cujo destino não é âncora
    /// interna nem URL absoluta com esquema em <paramref name="allowedSchemes"/>.
    /// Devolve quantos campos foram trocados.
    /// </summary>
    public static int ReplaceDisallowedWithResult(DocxDocument doc, IEnumerable<string>? allowedFields = null, IEnumerable<string>? allowedSchemes = null)
    {
        var fields = new HashSet<string>(allowedFields ?? DefaultAllowedFields, StringComparer.OrdinalIgnoreCase);
        var schemes = new HashSet<string>(allowedSchemes ?? DefaultAllowedSchemes, StringComparer.OrdinalIgnoreCase);
        int count = 0;
        foreach (var (part, root) in doc.Stories())
            count += ReplaceWithResult(root, doc.Limits, part, i => !IsAllowed(i, fields, schemes));
        return count;
    }

    /// <summary>
    /// Troca pelo resultado os campos para os quais <paramref name="replace"/> devolve
    /// verdadeiro. As remoções são feitas em lote, por pai: tirar um nó de um
    /// <see cref="XContainer"/> custa a posição dele, e um a um o custo seria
    /// quadrático num parágrafo com muitos campos.
    /// </summary>
    internal static int ReplaceWithResult(XElement root, DocxLimits limits, string part, Func<FieldInstruction, bool> replace)
    {
        int count = 0;
        var markers = new HashSet<XElement>();
        foreach (var field in Scan(root, limits, part))
        {
            if (field.End is null || !replace(Instruction(field))) continue;
            markers.Add(field.Begin);
            foreach (var e in field.InstructionContent) markers.Add(e);
            if (field.Separate is not null) markers.Add(field.Separate);
            markers.Add(field.End);
            count++;
        }
        if (markers.Count > 0)
        {
            var runs = markers.Select(e => e.Parent).OfType<XElement>().Distinct().ToList();
            XmlTree.RemoveAll(markers);
            XmlTree.RemoveAll(runs.Where(r => r.Name == W.r && r.Parent is not null && r.Elements().All(e => e.Name == W.rPr)));
        }
        var simples = new List<XElement>();
        foreach (var simple in root.Descendants(W.fldSimple))
        {
            string instr = (string?)simple.Attribute(W.instr) ?? "";
            if (replace(new FieldInstruction(FirstWord(instr), instr))) simples.Add(simple);
        }
        XmlTree.Unwrap(simples);
        return count + simples.Count;
    }

    private static bool IsAllowed(FieldInstruction instruction, HashSet<string> fields, HashSet<string> schemes)
    {
        if (!fields.Contains(instruction.Name)) return false;
        if (!string.Equals(instruction.Name, "HYPERLINK", StringComparison.OrdinalIgnoreCase)) return true;
        return TryParseHyperlink(instruction.Text, schemes, out _, out _);
    }

    /// <summary>
    /// Interpreta a instrução HYPERLINK: âncora interna (<c>\l "x"</c>) ou URL absoluta
    /// com esquema permitido. Falso para qualquer outro destino.
    /// </summary>
    public static bool TryParseHyperlink(string instruction, IEnumerable<string> allowedSchemes, out string? url, out string? anchor)
    {
        url = anchor = null;
        var tokens = Tokenize(instruction);
        if (tokens.Count == 0 || !string.Equals(tokens[0], "HYPERLINK", StringComparison.OrdinalIgnoreCase)) return false;
        string? target = null, location = null;
        for (int k = 1; k < tokens.Count; k++)
        {
            string token = tokens[k];
            if (token.Length == 2 && token[0] == Backslash)
            {
                char sw = char.ToLowerInvariant(token[1]);
                if (sw == 'l' && k + 1 < tokens.Count) location = tokens[++k];
                else if (sw is 'o' or 't' && k + 1 < tokens.Count) k++;
                continue;
            }
            target ??= token;
        }
        if (target is null)
        {
            if (string.IsNullOrEmpty(location)) return false;
            anchor = location;
            return true;
        }
        if (!IsAllowedUrl(target, allowedSchemes)) return false;
        url = string.IsNullOrEmpty(location) ? target : target + "#" + location;
        return true;
    }

    /// <summary>Palavras da instrução: textos entre aspas (sem as aspas) e chaves (como l).</summary>
    private static List<string> Tokenize(string instruction)
    {
        var tokens = new List<string>();
        int i = 0;
        while (i < instruction.Length)
        {
            char c = instruction[i];
            if (char.IsWhiteSpace(c)) { i++; continue; }
            if (c == '"')
            {
                int close = instruction.IndexOf('"', i + 1);
                if (close < 0) close = instruction.Length;
                tokens.Add(instruction[(i + 1)..close]);
                i = close + 1;
                continue;
            }
            int start = i;
            while (i < instruction.Length && !char.IsWhiteSpace(instruction[i]) && instruction[i] != '"') i++;
            tokens.Add(instruction[start..i]);
        }
        return tokens;
    }

    /// <summary>URL absoluta cujo esquema está na lista.</summary>
    public static bool IsAllowedUrl(string url, IEnumerable<string> allowedSchemes) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && allowedSchemes.Contains(uri.Scheme, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Converte campos HYPERLINK permitidos em <c>w:hyperlink</c> nativo (relacionamento
    /// externo ou w:anchor), quando o campo inteiro está em runs filhos diretos de um
    /// mesmo parágrafo (o caso que o Word e o DocIO gravam). Devolve quantos converteu.
    /// Campo que se sobrepõe a outro já convertido (HYPERLINK dentro do resultado de
    /// outro) fica como campo. Cada parágrafo é remontado uma vez só.
    /// </summary>
    public static int ConvertHyperlinkFields(DocxDocument doc, IEnumerable<string>? allowedSchemes = null)
    {
        var schemes = (allowedSchemes ?? DefaultAllowedSchemes).ToList();
        int count = 0;
        foreach (var (part, root) in doc.Stories())
        {
            var consumed = new HashSet<XElement>();
            var hyperlinks = new Dictionary<XElement, (XElement Hyperlink, List<XElement> Result)>();
            var paragraphs = new List<XElement>();
            var paragraphSet = new HashSet<XElement>();
            RelationshipIds? ids = null;
            foreach (var field in Scan(root, doc.Limits, part))
            {
                if (field.End?.Parent is null || field.Separate?.Parent is null || field.Begin.Parent is null) continue;
                var instruction = Instruction(field);
                if (!string.Equals(instruction.Name, "HYPERLINK", StringComparison.OrdinalIgnoreCase)) continue;
                if (!TryParseHyperlink(instruction.Text, schemes, out var url, out var anchor)) continue;
                var beginRun = field.Begin.Parent!;
                var separateRun = field.Separate.Parent!;
                var endRun = field.End.Parent!;
                var paragraph = beginRun.Parent;
                if (paragraph is null || paragraph.Name != W.p || separateRun.Parent != paragraph || endRun.Parent != paragraph) continue;
                if (!IsMarkerRun(beginRun, allowInstruction: true) || !IsMarkerRun(separateRun, allowInstruction: false) || !IsMarkerRun(endRun, allowInstruction: false)) continue;
                // irmãos do begin ao end: o custo é o tamanho do próprio campo, não o do parágrafo
                var span = new List<XElement> { beginRun };
                int s = -1, e = -1;
                using (var sibling = beginRun.ElementsAfterSelf().GetEnumerator())
                {
                    while (e < 0 && sibling.MoveNext())
                    {
                        span.Add(sibling.Current);
                        if (sibling.Current == separateRun && s < 0) s = span.Count - 1;
                        if (sibling.Current == endRun) e = span.Count - 1;
                    }
                }
                if (!(0 < s && s < e)) continue;
                if (span.Skip(1).Take(s - 1).Any(x => x.Name != W.r || !IsMarkerRun(x, allowInstruction: true))) continue;
                var result = span.GetRange(s + 1, e - s - 1);
                if (result.Any(x => x.Descendants(W.fldChar).Any())) continue;
                if (span.Any(consumed.Contains)) continue;

                var hyperlink = new XElement(W.hyperlink);
                if (anchor is not null) hyperlink.Add(new XAttribute(W.anchor, anchor));
                else
                {
                    ids ??= new RelationshipIds(doc.GetRelationships(part).Select(r => r.Id));
                    string id = ids.Next();
                    doc.AddRelationship(part, id, RelTypes.Hyperlink, url!, external: true);
                    hyperlink.Add(new XAttribute(Ns.R + "id", id));
                }
                hyperlink.Add(new XAttribute(W.history, "1"));
                consumed.UnionWith(span);
                if (paragraphSet.Add(paragraph)) paragraphs.Add(paragraph);
                hyperlinks[beginRun] = (hyperlink, result);
                count++;
            }
            foreach (var paragraph in paragraphs)
            {
                var nodes = paragraph.Nodes().ToList();
                paragraph.RemoveNodes();
                var rebuilt = new List<XNode>(nodes.Count);
                foreach (var node in nodes)
                {
                    if (node is XElement element)
                    {
                        if (hyperlinks.TryGetValue(element, out var conversion))
                        {
                            conversion.Hyperlink.Add(conversion.Result);
                            rebuilt.Add(conversion.Hyperlink);
                            continue;
                        }
                        if (consumed.Contains(element)) continue;
                    }
                    rebuilt.Add(node);
                }
                paragraph.Add(rebuilt);
            }
        }
        return count;
    }

    /// <summary>Ids novos de relacionamento (rIdN acima dos existentes), sem reler o .rels a cada um.</summary>
    private sealed class RelationshipIds
    {
        private readonly HashSet<string> _used;
        private int _max;

        public RelationshipIds(IEnumerable<string> existing)
        {
            _used = new HashSet<string>(existing, StringComparer.Ordinal);
            foreach (var id in _used)
                if (id.StartsWith("rId", StringComparison.Ordinal) && int.TryParse(id.AsSpan(3), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out int n))
                    _max = Math.Max(_max, n);
        }

        public string Next()
        {
            string candidate;
            do candidate = "rId" + (++_max).ToString(System.Globalization.CultureInfo.InvariantCulture);
            while (!_used.Add(candidate));
            return candidate;
        }
    }

    /// <summary>Run que só tem w:rPr + fldChar (+ instrText quando permitido).</summary>
    private static bool IsMarkerRun(XElement run, bool allowInstruction) =>
        run.Name == W.r && run.Elements().All(e => e.Name == W.rPr || e.Name == W.fldChar || (allowInstruction && e.Name == W.instrText));

    /// <summary>Instruções de todos os campos (complexos e simples) das partes com texto.</summary>
    public static IReadOnlyList<FieldInstruction> GetInstructions(DocxDocument doc)
    {
        var list = new List<FieldInstruction>();
        foreach (var (part, root) in doc.Stories())
        {
            list.AddRange(Scan(root, doc.Limits, part).Select(Instruction));
            list.AddRange(root.Descendants(W.fldSimple).Select(s => (string?)s.Attribute(W.instr) ?? "").Select(i => new FieldInstruction(FirstWord(i), i)));
        }
        return list;
    }

    private static FieldInstruction Instruction(Field field)
    {
        string text = field.Instruction.ToString();
        return new FieldInstruction(FirstWord(text), text);
    }

    private static string FirstWord(string instruction)
    {
        var trimmed = instruction.TrimStart();
        if (trimmed.StartsWith('=')) return "=";
        int end = 0;
        while (end < trimmed.Length && !char.IsWhiteSpace(trimmed[end]) && trimmed[end] != '\\') end++;
        return trimmed[..end].ToUpperInvariant();
    }

    /// <summary>
    /// Campos complexos em ordem de FIM (internos antes dos externos). Uma passada
    /// com pilha de campos abertos: o código de cada campo é o intervalo entre o
    /// begin e o separate (ou o end) na lista de elementos, sem cópia por campo;
    /// campos que nunca fecham ficam fora do resultado.
    /// </summary>
    private static List<Field> Scan(XElement root, DocxLimits limits, string part)
    {
        var elements = new List<XElement>();
        var done = new List<Field>();
        var open = new Stack<Field>();
        int begins = 0;
        foreach (var run in root.Descendants(W.r).ToList())
        {
            foreach (var e in run.Elements().ToList())
            {
                if (e.Name == W.rPr) continue;
                int index = elements.Count;
                elements.Add(e);
                var fldType = e.Name == W.fldChar ? (string?)e.Attribute(W.fldCharType) : null;
                switch (fldType)
                {
                    case "begin":
                        if (++begins > limits.MaxFieldsPerStory)
                            throw new OfficeLimitExceededException(OfficeLimit.FieldsPerStory, limits.MaxFieldsPerStory, part);
                        if (open.Count >= limits.MaxFieldNesting)
                            throw new OfficeLimitExceededException(OfficeLimit.FieldNesting, limits.MaxFieldNesting, part);
                        open.Push(new Field { Elements = elements, Begin = e, BeginIndex = index });
                        break;
                    case "separate":
                        if (open.TryPeek(out var top) && !top.InResult)
                        {
                            top.Separate = e;
                            top.SeparateIndex = index;
                        }
                        break;
                    case "end":
                        if (open.TryPop(out var closed))
                        {
                            closed.End = e;
                            closed.EndIndex = index;
                            done.Add(closed);
                        }
                        break;
                    default:
                        if (e.Name == W.instrText && open.TryPeek(out var current) && !current.InResult)
                            current.Instruction.Append(e.Value);
                        break;
                }
            }
        }
        return done;
    }

}
