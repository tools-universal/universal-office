using System.Text;

namespace UniversalOffice.Converter.Processing.Slides.Pptx;

/// <summary>
/// Manipulação básica de .pptx: troca o texto de um run regravando o slideN.xml
/// com cirurgia mínima — apenas o conteúdo do &lt;a:t&gt; alvo muda; todo o resto
/// do XML (e todas as demais partes) flui byte a byte.
/// </summary>
public static class PptxManipulate
{
    private static string EscXml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    /// <summary>
    /// Substitui o texto do N-ésimo run (&lt;a:t&gt;, 0-based, em ordem de documento)
    /// da parte de slide indicada. Lança se o índice não existir.
    /// </summary>
    public static void SetRunText(PptxPackage pkg, string slidePath, int runIndex, string newText)
    {
        string xml = pkg.GetPartText(slidePath)
            ?? throw new InvalidDataException($"Pacote sem {slidePath}");
        int seen = 0;
        int i = 0;
        while (true)
        {
            int open = xml.IndexOf("<a:t", i, StringComparison.Ordinal);
            if (open < 0) throw new ArgumentOutOfRangeException(nameof(runIndex),
                $"Slide tem apenas {seen} runs <a:t>; pedido índice {runIndex}");
            // precisa ser exatamente <a:t> ou <a:t ...> (não <a:tab> etc.)
            int afterName = open + 4;
            char next = afterName < xml.Length ? xml[afterName] : '\0';
            if (next != '>' && next != ' ' && next != '/')
            {
                i = afterName;
                continue;
            }
            int tagEnd = xml.IndexOf('>', open);
            if (tagEnd < 0) throw new InvalidDataException("XML de slide malformado (<a:t sem >)");
            if (xml[tagEnd - 1] == '/')
            {
                // <a:t/> auto-fechado conta como run vazio
                if (seen == runIndex)
                {
                    string replacement = "<a:t>" + EscXml(newText) + "</a:t>";
                    pkg.SetPartText(slidePath, xml[..open] + replacement + xml[(tagEnd + 1)..]);
                    return;
                }
                seen++;
                i = tagEnd + 1;
                continue;
            }
            int close = xml.IndexOf("</a:t>", tagEnd, StringComparison.Ordinal);
            if (close < 0) throw new InvalidDataException("XML de slide malformado (</a:t> ausente)");
            if (seen == runIndex)
            {
                var sb = new StringBuilder();
                sb.Append(xml, 0, tagEnd + 1);
                sb.Append(EscXml(newText));
                sb.Append(xml, close, xml.Length - close);
                pkg.SetPartText(slidePath, sb.ToString());
                return;
            }
            seen++;
            i = close + 6;
        }
    }
}
