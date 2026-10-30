using System.Collections;
using System.Globalization;
using System.Text;
using UniversalOffice.Core;

namespace UniversalOffice.DocBinary;

/// <summary>
/// Atributos na ordem de inserção (objeto literal do JS: reatribuir uma chave
/// mantém a posição). Valores null/false são omitidos; true vira "1"; números
/// saem como o String(n) do JS.
/// </summary>
internal sealed class Attrs : IEnumerable<KeyValuePair<string, object?>>
{
    private readonly List<KeyValuePair<string, object?>> _items = new();

    public void Add(string key, object? value) => this[key] = value;

    public object? this[string key]
    {
        get
        {
            foreach (var kv in _items) if (kv.Key == key) return kv.Value;
            return null;
        }
        set
        {
            for (int i = 0; i < _items.Count; i++)
            {
                if (_items[i].Key == key) { _items[i] = new KeyValuePair<string, object?>(key, value); return; }
            }
            _items.Add(new KeyValuePair<string, object?>(key, value));
        }
    }

    public bool Has(string key) => _items.Exists(kv => kv.Key == key);

    public IEnumerator<KeyValuePair<string, object?>> GetEnumerator() => _items.GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

/// <summary>Escrita de XML como texto — porta de xmlw.ts.</summary>
internal static class Xml
{
    private static string StripInvalid(string s)
    {
        StringBuilder? sb = null;
        for (int i = 0; i < s.Length; i++)
        {
            int c = s[i];
            bool drop = false;
            bool pair = false;
            if ((c < 0x20 && c != 0x09 && c != 0x0a && c != 0x0d) || c == 0xfffe || c == 0xffff) drop = true;
            else if (c >= 0xd800 && c <= 0xdbff)
            {
                // substitutos isolados também são proibidos em XML
                int n = i + 1 < s.Length ? s[i + 1] : -1;
                if (n >= 0xdc00 && n <= 0xdfff) pair = true; else drop = true;
            }
            else if (c >= 0xdc00 && c <= 0xdfff) drop = true;
            if (drop || pair || sb is not null)
            {
                sb ??= new StringBuilder(s, 0, i, s.Length);
                if (pair) { sb.Append(s[i]).Append(s[i + 1]); i++; }
                else if (!drop) sb.Append(s[i]);
            }
        }
        return sb?.ToString() ?? s;
    }

    public static string EscText(string s) => StripInvalid(s).Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    public static string EscAttr(string s) => EscText(s).Replace("\"", "&quot;");

    /// <summary>String(v) do JS para os valores usados como atributo/texto.</summary>
    public static string Str(object v) => v switch
    {
        string s => s,
        bool b => b ? "true" : "false",
        int i => i.ToString(CultureInfo.InvariantCulture),
        long l => l.ToString(CultureInfo.InvariantCulture),
        double d => JsNumber.ToString(d),
        _ => Convert.ToString(v, CultureInfo.InvariantCulture) ?? "",
    };

    public static string AttrsXml(Attrs? a)
    {
        if (a is null) return "";
        var sb = new StringBuilder();
        foreach (var (k, v) in a)
        {
            if (v is null || (v is bool b && !b)) continue;
            sb.Append(' ').Append(k).Append("=\"").Append(EscAttr(v is true ? "1" : Str(v))).Append('"');
        }
        return sb.ToString();
    }

    /// <summary>Elemento: vazio (`&lt;x/&gt;`) quando não há conteúdo.</summary>
    public static string El(string name, Attrs? a = null, string content = "") =>
        content.Length > 0 ? $"<{name}{AttrsXml(a)}>{content}</{name}>" : $"<{name}{AttrsXml(a)}/>";

    public const string XML_DECL = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\r\n";

    public static class NS
    {
        public const string W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        public const string R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        public const string WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
        public const string A = "http://schemas.openxmlformats.org/drawingml/2006/main";
        public const string Pic = "http://schemas.openxmlformats.org/drawingml/2006/picture";
        public const string Wps = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
        public const string Wpg = "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup";
        public const string Mc = "http://schemas.openxmlformats.org/markup-compatibility/2006";
        public const string W14 = "http://schemas.microsoft.com/office/word/2010/wordml";
        public const string WP14 = "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing";
        public const string V = "urn:schemas-microsoft-com:vml";
        public const string O = "urn:schemas-microsoft-com:office:office";
        public const string W10 = "urn:schemas-microsoft-com:office:word";
        public const string M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
        public const string Rel = "http://schemas.openxmlformats.org/package/2006/relationships";
        public const string Ct = "http://schemas.openxmlformats.org/package/2006/content-types";
        public const string RelType = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    }

    /// <summary>Declarações de namespace para as partes de conteúdo (document/header/footer/notas).</summary>
    public static readonly string CONTENT_NS = AttrsXml(new Attrs
    {
        { "xmlns:wpc", "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" },
        { "xmlns:mc", NS.Mc },
        { "xmlns:o", NS.O },
        { "xmlns:r", NS.R },
        { "xmlns:m", NS.M },
        { "xmlns:v", NS.V },
        { "xmlns:wp14", NS.WP14 },
        { "xmlns:wp", NS.WP },
        { "xmlns:w10", NS.W10 },
        { "xmlns:w", NS.W },
        { "xmlns:w14", NS.W14 },
        { "xmlns:wpg", NS.Wpg },
        { "xmlns:wps", NS.Wps },
        { "xmlns:a", NS.A },
        { "xmlns:pic", NS.Pic },
        { "mc:Ignorable", "w14 wp14" },
    });

    /// <summary>Espaço em branco do \s do JS (ECMAScript WhiteSpace + LineTerminator).</summary>
    public static bool IsJsSpace(char c) =>
        c == '\t' || c == '\n' || c == '\v' || c == '\f' || c == '\r' || c == ' ' || c == '\u00a0' || c == '\u1680' ||
        (c >= '\u2000' && c <= '\u200a') || c == '\u2028' || c == '\u2029' || c == '\u202f' || c == '\u205f' ||
        c == '\u3000' || c == '\ufeff';

    /// <summary>Classe de caracteres equivalente ao \s do JS, para regex .NET.</summary>
    public const string JsS = "[\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]";

    /// <summary>Classe equivalente ao \S do JS.</summary>
    public const string JsNotS = "[^\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]";

    /// <summary>Hex maiúsculo com zeros à esquerda (toString(16).toUpperCase().padStart).</summary>
    public static string Hex(long v, int width) => v.ToString("X", CultureInfo.InvariantCulture).PadLeft(width, '0');
}
