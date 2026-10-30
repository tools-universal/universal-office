using UniversalOffice.Core;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Tetos de recursos de um <see cref="DocxDocument"/> aberto de entrada não
/// confiável. Ultrapassar qualquer um lança <see cref="OfficeLimitExceededException"/>
/// — nunca trava, estoura a pilha ou reserva memória pelo que o arquivo declara.
/// </summary>
public sealed record DocxLimits
{
    /// <summary>Tetos de descompressão do pacote (padrão <see cref="OpcPackageLimits.Default"/>).</summary>
    public OpcPackageLimits Package { get; init; } = OpcPackageLimits.Default;

    /// <summary>
    /// Profundidade máxima do XML de cada parte, contada como o
    /// <see cref="System.Xml.XmlReader.Depth"/> de qualquer nó (raiz = 0) — a mesma
    /// conta de um validador do hospedeiro que leia as partes com XmlReader. Padrão 256.
    /// Conferida ao carregar a parte, antes de montar a árvore.
    /// </summary>
    public int MaxXmlDepth { get; init; } = 256;

    /// <summary>Campos complexos (w:fldChar begin) por história — corpo, cabeçalho, nota… Padrão 100 000.</summary>
    public int MaxFieldsPerStory { get; init; } = 100_000;

    /// <summary>
    /// Campos complexos abertos ao mesmo tempo numa história (aninhamento, inclusive
    /// os que nunca fecham). Padrão 64.
    /// </summary>
    public int MaxFieldNesting { get; init; } = 64;

    /// <summary>Os tetos padrão.</summary>
    public static DocxLimits Default { get; } = new();
}
