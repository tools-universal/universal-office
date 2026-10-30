using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Linha-modelo de tabela (ex.: o histórico de versões de um modelo de documento):
/// a linha que contém o marcador sai da tabela e serve de molde
/// para as linhas acrescentadas no fim, com os parâmetros <c>#{Nome}</c> trocados.
/// </summary>
public sealed class DocxTableRowTemplate
{
    private readonly XElement _row;
    private readonly XElement _table;

    private DocxTableRowTemplate(XElement row, XElement table)
    {
        _row = row;
        _table = table;
    }

    /// <summary>Linhas acrescentadas até agora.</summary>
    public int AppendedRows { get; private set; }

    /// <summary>
    /// Procura (no corpo primeiro, depois cabeçalhos/rodapés) o primeiro parágrafo de
    /// célula que contém <paramref name="marker"/> (diferencia maiúsculas, palavra
    /// inteira — o Find do DocIO), tira a linha dele da tabela e a devolve como molde.
    /// Null quando o marcador não está numa célula. Tabela que fica sem linhas é
    /// removida ao salvar se nenhuma linha for acrescentada.
    /// </summary>
    public static DocxTableRowTemplate? Take(DocxDocument doc, string marker)
    {
        var paragraph = DocxText.FindParagraphs(doc, marker, caseSensitive: true, wholeWord: true, DocxTextScope.Document).FirstOrDefault();
        var cell = paragraph?.Ancestors(W.tc).FirstOrDefault();
        if (cell is null) return null;
        var row = cell.Ancestors(W.tr).FirstOrDefault();
        var table = row?.Ancestors(W.tbl).FirstOrDefault();
        if (row is null || table is null) return null;
        var template = new XElement(row);
        row.Remove();
        doc.MarkChanged();
        return new DocxTableRowTemplate(template, table);
    }

    /// <summary>
    /// Acrescenta uma cópia da linha-modelo no fim da tabela, trocando em cada parágrafo
    /// os parâmetros <c>#{chave}</c> (sem diferenciar maiúsculas, palavra inteira, na
    /// ordem dada; valor null = vazio) e, com <paramref name="removeRemainingParameters"/>,
    /// apagando os <c>#{...}</c> que sobrarem.
    /// </summary>
    public void Append(IEnumerable<KeyValuePair<string, string?>> parameters, bool removeRemainingParameters = true)
    {
        var row = new XElement(_row);
        _table.Add(row);
        var list = parameters.ToList();
        foreach (var p in row.Descendants(W.p).ToList())
        {
            foreach (var (name, value) in list)
                DocxText.Replace(p, DocxText.Parameter(name), value ?? "", caseSensitive: false, wholeWord: true);
            if (removeRemainingParameters) DocxText.Replace(p, DocxText.AnyParameter, "");
        }
        AppendedRows++;
    }
}
