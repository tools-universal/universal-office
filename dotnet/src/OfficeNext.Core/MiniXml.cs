using System.Globalization;
using System.Text;

namespace OfficeNext.Core;

/// <summary>
/// Elemento XML do parser mínimo (espelho do xml.ts do sheet/slides/write-core).
/// Não resolve namespaces — nomes prefixados ("w:p", "a:off") são literais,
/// estável dentro de um pacote OOXML (prefixos fixos no root).
/// </summary>
public sealed class XmlElement
{
    public string Name;
    public Dictionary<string, string> Attrs;
    /// <summary>Filhos: XmlElement ou string (nós de texto).</summary>
    public List<object> Children;

    public XmlElement(string name)
    {
        Name = name;
        Attrs = new Dictionary<string, string>(StringComparer.Ordinal);
        Children = new List<object>();
    }

    public string? Attr(string name) => Attrs.TryGetValue(name, out var v) ? v : null;
}

/// <summary>
/// Parser XML mínimo para OOXML — porta 1:1 do xml.ts (sem dependências).
/// Mesmo comportamento de entidades, CDATA, comentários e prólogos.
/// Como o xml.ts do write-core: quando o arquivo liga um namespace conhecido a
/// OUTRO prefixo (ex.: xmlns:ve="…/markup-compatibility/2006" de geradores
/// antigos do Open XML SDK), o nome é reescrito para o prefixo canônico
/// (ve:Choice → mc:Choice). O Word resolve pelo namespace, não pelo prefixo
/// (oráculo hidetext). Pacotes com os prefixos padrão não mudam.
/// </summary>
public static class MiniXml
{
    /// <summary>Namespace → prefixo canônico (o que o resto do leitor espera).</summary>
    private static readonly Dictionary<string, string> CanonicalPrefix = new(StringComparer.Ordinal)
    {
        ["http://schemas.openxmlformats.org/wordprocessingml/2006/main"] = "w",
        ["http://schemas.openxmlformats.org/officeDocument/2006/relationships"] = "r",
        ["http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"] = "wp",
        ["http://schemas.openxmlformats.org/drawingml/2006/main"] = "a",
        ["http://schemas.openxmlformats.org/drawingml/2006/picture"] = "pic",
        ["http://schemas.openxmlformats.org/officeDocument/2006/math"] = "m",
        ["http://schemas.openxmlformats.org/markup-compatibility/2006"] = "mc",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingShape"] = "wps",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"] = "wpg",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"] = "wpc",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"] = "wp14",
        ["http://schemas.microsoft.com/office/word/2010/wordml"] = "w14",
        ["http://schemas.microsoft.com/office/word/2012/wordml"] = "w15",
        ["urn:schemas-microsoft-com:vml"] = "v",
        ["urn:schemas-microsoft-com:office:office"] = "o",
        ["urn:schemas-microsoft-com:office:word"] = "w10",
    };

    /// <summary>Sem renomeações (nunca alterado: cada escopo copia antes de mudar).</summary>
    private static readonly Dictionary<string, string> NoRenames = new(StringComparer.Ordinal);

    /// <summary>Nome com o prefixo trocado pelo canônico (renomeações em vigor).</summary>
    private static string Renamed(string name, Dictionary<string, string> ren)
    {
        if (ren.Count == 0) return name;
        int c = name.IndexOf(':');
        if (c <= 0) return name;
        return ren.TryGetValue(name[..c], out var to) ? to + name[c..] : name;
    }

    private static bool IsSpace(char c) =>
        c is ' ' or '\t' or '\n' or '\r' or '\v' or '\f'
        || char.GetUnicodeCategory(c) == UnicodeCategory.SpaceSeparator;

    private static string DecodeEntities(string s)
    {
        int amp = s.IndexOf('&');
        if (amp < 0) return s;
        var sb = new StringBuilder(s.Length);
        int i = 0;
        while (i < s.Length)
        {
            char c = s[i];
            if (c != '&') { sb.Append(c); i++; continue; }
            // regex JS: &(#x?[0-9a-fA-F]+|\w+);
            int semi = s.IndexOf(';', i + 1);
            if (semi < 0) { sb.Append(c); i++; continue; }
            string body = s[(i + 1)..semi];
            string? decoded = DecodeEntity(body);
            if (decoded is null) { sb.Append('&'); i++; continue; }
            sb.Append(decoded);
            i = semi + 1;
        }
        return sb.ToString();
    }

    private static string? DecodeEntity(string e)
    {
        if (e.Length == 0) return null;
        if (e[0] == '#')
        {
            bool hex = e.Length > 1 && (e[1] == 'x' || e[1] == 'X');
            string digits = hex ? e[2..] : e[1..];
            if (digits.Length == 0) return null;
            foreach (char c in digits)
            {
                bool ok = hex ? Uri.IsHexDigit(c) : char.IsAsciiDigit(c);
                if (!ok) return null;
            }
            int code = int.Parse(digits, hex ? NumberStyles.HexNumber : NumberStyles.Integer, CultureInfo.InvariantCulture);
            return char.ConvertFromUtf32(code);
        }
        // \w+ = [A-Za-z0-9_]+
        foreach (char c in e)
            if (!(char.IsAsciiLetterOrDigit(c) || c == '_')) return null;
        return e switch
        {
            "amp" => "&", "lt" => "<", "gt" => ">", "quot" => "\"", "apos" => "'",
            _ => "&" + e + ";", // entidade desconhecida fica literal (igual ao JS)
        };
    }

    public static XmlElement Parse(string xml)
    {
        int i = 0;
        int n = xml.Length;

        void Error(string msg) => throw new FormatException($"XML inválido @{i}: {msg}");

        void SkipMisc()
        {
            for (; ; )
            {
                while (i < n && IsSpace(xml[i])) i++;
                if (i < n - 1 && xml[i] == '<' && xml[i + 1] == '?')
                {
                    i = xml.IndexOf("?>", i, StringComparison.Ordinal);
                    if (i < 0) Error("?> não fechado");
                    i += 2;
                }
                else if (StartsWith(xml, "<!--", i))
                {
                    i = xml.IndexOf("-->", i, StringComparison.Ordinal);
                    if (i < 0) Error("--> não fechado");
                    i += 3;
                }
                else if (StartsWith(xml, "<!", i))
                {
                    i = xml.IndexOf('>', i);
                    if (i < 0) Error("<! não fechado");
                    i += 1;
                }
                else break;
            }
        }

        XmlElement ParseElement(Dictionary<string, string> parentRen)
        {
            if (i >= n || xml[i] != '<') Error("esperava <");
            i++;
            int nameStart = i;
            while (i < n && !(IsSpace(xml[i]) || xml[i] == '/' || xml[i] == '>')) i++;
            string name = xml[nameStart..i];
            var el = new XmlElement(name);
            var ren = parentRen;
            bool declares = false;
            // declarações xmlns:* deste elemento: prefixos fora do padrão viram o canônico
            void Scope()
            {
                Dictionary<string, string>? own = null;
                if (declares)
                {
                    foreach (var (k, uri) in el.Attrs)
                    {
                        if (!k.StartsWith("xmlns:", StringComparison.Ordinal)) continue;
                        string pfx = k[6..];
                        string? canon = CanonicalPrefix.TryGetValue(uri, out var cv) ? cv : null;
                        if ((canon is null || canon == pfx) && !ren.ContainsKey(pfx)) continue;
                        own ??= new Dictionary<string, string>(ren, StringComparer.Ordinal);
                        if (canon is null || canon == pfx) own.Remove(pfx);
                        else own[pfx] = canon;
                    }
                }
                if (own is not null) ren = own;
                if (ren.Count == 0) return;
                el.Name = Renamed(el.Name, ren);
                var attrs = new Dictionary<string, string>(StringComparer.Ordinal);
                foreach (var (k, v) in el.Attrs) attrs[k.StartsWith("xmlns:", StringComparison.Ordinal) ? k : Renamed(k, ren)] = v;
                el.Attrs = attrs;
            }
            for (; ; )
            {
                while (i < n && IsSpace(xml[i])) i++;
                if (i < n && xml[i] == '/')
                {
                    if (i + 1 >= n || xml[i + 1] != '>') Error("esperava />");
                    i += 2;
                    Scope();
                    return el;
                }
                if (i < n && xml[i] == '>') { i++; Scope(); break; }
                int aStart = i;
                while (i < n && xml[i] != '=' && !IsSpace(xml[i])) i++;
                string aName = xml[aStart..i];
                while (i < n && IsSpace(xml[i])) i++;
                if (i >= n || xml[i] != '=') Error($"atributo {aName} sem =");
                i++;
                while (i < n && IsSpace(xml[i])) i++;
                char q = i < n ? xml[i] : '\0';
                if (q != '"' && q != '\'') Error("valor de atributo sem aspas");
                i++;
                int vStart = i;
                i = xml.IndexOf(q, i);
                if (i < 0) Error("aspas não fechadas");
                el.Attrs[aName] = DecodeEntities(xml[vStart..i]);
                if (aName.StartsWith("xmlns:", StringComparison.Ordinal)) declares = true;
                i++;
            }
            // conteúdo
            for (; ; )
            {
                if (i >= n) Error($"</{name}> ausente");
                if (StartsWith(xml, "</", i))
                {
                    int close = xml.IndexOf('>', i);
                    i = close + 1;
                    return el;
                }
                if (StartsWith(xml, "<!--", i))
                {
                    i = xml.IndexOf("-->", i, StringComparison.Ordinal) + 3;
                    continue;
                }
                if (StartsWith(xml, "<![CDATA[", i))
                {
                    int end = xml.IndexOf("]]>", i, StringComparison.Ordinal);
                    el.Children.Add(xml[(i + 9)..end]);
                    i = end + 3;
                    continue;
                }
                if (xml[i] == '<') { el.Children.Add(ParseElement(ren)); continue; }
                int tStart = i;
                while (i < n && xml[i] != '<') i++;
                string text = DecodeEntities(xml[tStart..i]);
                if (text.Length > 0) el.Children.Add(text);
            }
        }

        SkipMisc();
        return ParseElement(NoRenames);
    }

    private static bool StartsWith(string s, string token, int at) =>
        at + token.Length <= s.Length && string.CompareOrdinal(s, at, token, 0, token.Length) == 0;

    public static IEnumerable<XmlElement> ChildElements(XmlElement el, string? name = null)
    {
        foreach (var c in el.Children)
            if (c is XmlElement e && (name is null || e.Name == name)) yield return e;
    }

    public static XmlElement? FirstChild(XmlElement el, string name)
    {
        foreach (var c in el.Children)
            if (c is XmlElement e && e.Name == name) return e;
        return null;
    }

    /// <summary>Busca o primeiro descendente (qualquer profundidade) com o nome dado.</summary>
    public static XmlElement? Descend(XmlElement el, string name)
    {
        foreach (var c in el.Children)
        {
            if (c is not XmlElement e) continue;
            if (e.Name == name) return e;
            var found = Descend(e, name);
            if (found is not null) return found;
        }
        return null;
    }

    public static string TextContent(XmlElement el)
    {
        var sb = new StringBuilder();
        AppendText(el, sb);
        return sb.ToString();
    }

    private static void AppendText(XmlElement el, StringBuilder sb)
    {
        foreach (var c in el.Children)
        {
            if (c is string s) sb.Append(s);
            else AppendText((XmlElement)c, sb);
        }
    }
}
