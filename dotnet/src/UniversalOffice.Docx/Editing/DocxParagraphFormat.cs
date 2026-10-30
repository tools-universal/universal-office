using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Formatação de parágrafo do conteúdo escrito por <see cref="DocxBodyWriter"/>.</summary>
public sealed record DocxParagraphFormat
{
    /// <summary>
    /// Propriedades copiadas como ponto de partida (ex.: a amostra do modelo lida por
    /// <see cref="DocxParagraphSamples.Extract"/>); null = parágrafo sem propriedades.
    /// As demais opções são aplicadas por cima.
    /// </summary>
    public DocxParagraphProperties? Base { get; init; }

    /// <summary>Estilo de parágrafo (w:pStyle); omitido quando é o estilo padrão do documento.</summary>
    public string? StyleId { get; init; }

    /// <summary>Instância de lista (w:numId); com <see cref="ListLevel"/> forma o w:numPr.</summary>
    public string? ListNumId { get; init; }

    /// <summary>Nível da lista (w:ilvl), 0 a 8 (fora disso é limitado).</summary>
    public int ListLevel { get; init; }

    /// <summary>Recuo esquerdo em twips (w:ind w:left), aplicado quando maior que zero.</summary>
    public int LeftIndentTwips { get; init; }

    /// <summary>Alinhamento (w:jc): <c>left</c>, <c>center</c>, <c>right</c>, <c>both</c> ou outro valor de ST_Jc.</summary>
    public string? Alignment { get; init; }

    /// <summary>Manter com o próximo (w:keepNext), como nos títulos.</summary>
    public bool KeepWithNext { get; init; }

    /// <summary>Sem formatação (estilo padrão do documento).</summary>
    public static DocxParagraphFormat None { get; } = new();
}

/// <summary>
/// Cópia opaca das propriedades de um parágrafo (w:pPr, sem w:sectPr nem w:pPrChange),
/// para reaproveitar a formatação de um parágrafo do modelo em parágrafos novos.
/// </summary>
public sealed class DocxParagraphProperties
{
    private readonly XElement _pPr;

    internal DocxParagraphProperties(XElement pPr) => _pPr = pPr;

    /// <summary>Estilo de parágrafo (w:pStyle), ou null.</summary>
    public string? StyleId => (string?)_pPr.Element(W.pStyle)?.Attribute(W.val);

    /// <summary>Instância de lista (w:numPr/w:numId), ou null.</summary>
    public string? NumId => (string?)_pPr.Element(W.numPr)?.Element(W.numId)?.Attribute(W.val);

    /// <summary>Cópia do w:pPr para um parágrafo novo.</summary>
    internal XElement Copy() => new(_pPr);
}
