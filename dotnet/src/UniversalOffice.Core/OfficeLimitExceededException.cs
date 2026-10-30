namespace UniversalOffice.Core;

/// <summary>Teto de entrada não confiável que foi ultrapassado (ver <see cref="OfficeLimitExceededException"/>).</summary>
public enum OfficeLimit
{
    /// <summary>Bytes descomprimidos de uma parte do pacote (<see cref="OpcPackageLimits.MaxPartBytes"/>).</summary>
    PartBytes,

    /// <summary>Bytes descomprimidos somados de todas as partes (<see cref="OpcPackageLimits.MaxTotalBytes"/>).</summary>
    TotalBytes,

    /// <summary>Profundidade de aninhamento do XML de uma parte.</summary>
    XmlDepth,

    /// <summary>Campos (w:fldChar begin) numa história do documento.</summary>
    FieldsPerStory,

    /// <summary>Campos abertos ao mesmo tempo (aninhados) numa história do documento.</summary>
    FieldNesting,
}

/// <summary>
/// Entrada recusada por ultrapassar um teto de recursos (tamanho descomprimido,
/// profundidade de XML, quantidade de campos…). Tipo próprio para quem hospeda
/// distinguir "entrada grande/abusiva demais" de "arquivo corrompido"
/// (<see cref="InvalidDataException"/>, <see cref="System.Xml.XmlException"/>).
/// </summary>
public sealed class OfficeLimitExceededException : Exception
{
    public OfficeLimitExceededException(OfficeLimit limit, long maximum, string? partName)
        : base($"Limite {limit} ultrapassado (máximo {maximum}){(partName is null ? "" : $" em {partName}")}")
    {
        Limit = limit;
        Maximum = maximum;
        PartName = partName;
    }

    /// <summary>Qual teto foi ultrapassado.</summary>
    public OfficeLimit Limit { get; }

    /// <summary>O valor máximo configurado.</summary>
    public long Maximum { get; }

    /// <summary>Parte onde o teto foi ultrapassado (null quando vale para o pacote inteiro).</summary>
    public string? PartName { get; }
}
