namespace UniversalOffice.Core;

/// <summary>
/// Tetos aplicados ao descomprimir um pacote OPC. Contam os bytes REALMENTE lidos
/// de cada entrada — o tamanho declarado no diretório do ZIP não é usado para nada
/// (é controlado por quem montou o arquivo). Ultrapassar um teto lança
/// <see cref="OfficeLimitExceededException"/>. Null = sem teto.
/// </summary>
public sealed record OpcPackageLimits
{
    /// <summary>Bytes descomprimidos de uma parte (padrão 256 MiB).</summary>
    public long? MaxPartBytes { get; init; } = 256L * 1024 * 1024;

    /// <summary>Bytes descomprimidos somados de todas as partes (padrão 512 MiB).</summary>
    public long? MaxTotalBytes { get; init; } = 512L * 1024 * 1024;

    /// <summary>Os tetos padrão (256 MiB por parte, 512 MiB no total).</summary>
    public static OpcPackageLimits Default { get; } = new();

    /// <summary>Sem tetos (só para entrada confiável).</summary>
    public static OpcPackageLimits None { get; } = new() { MaxPartBytes = null, MaxTotalBytes = null };
}
