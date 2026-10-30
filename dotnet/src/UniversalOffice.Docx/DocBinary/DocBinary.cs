namespace UniversalOffice.DocBinary;

/// <summary>
/// Erro de formato do .doc (criptografado, anterior ao Word 97, corrompido) —
/// equivalente do DocFormatError do JS, com as mesmas mensagens em português.
/// </summary>
public sealed class DocFormatException : Exception
{
    public DocFormatException(string message) : base(message) { }
}

/// <summary>
/// Conversor Word 97-2003 (.doc binário, [MS-DOC]) → .docx (WordprocessingML)
/// em memória — porta fiel de write/packages/docx-core/src/doc (index.ts).
/// O resultado tem as mesmas partes, com o mesmo texto XML, que o conversor JS.
/// </summary>
public static class DocBinary
{
    /// <summary>Compound File com um stream "WordDocument" (documento do Word 97-2003)?</summary>
    public static bool IsWordBinary(byte[] bytes)
    {
        if (!CfbFile.IsCfbBytes(bytes)) return false;
        try
        {
            return new CfbFile(bytes).Has("WordDocument");
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Converte um .doc (bytes do arquivo) em .docx (bytes ZIP). Lança
    /// DocFormatException com mensagem em português para arquivos criptografados,
    /// de versões anteriores ao Word 97 ou corrompidos.
    /// </summary>
    public static byte[] ConvertDocToDocx(byte[] bytes, ConvertOptions? options = null) =>
        Run(bytes, w => w.Build(options));

    /// <summary>
    /// Igual a <see cref="ConvertDocToDocx"/>, mas devolve as partes do pacote
    /// (caminho → bytes, na ordem do ZIP) — para comparação parte a parte.
    /// </summary>
    public static IReadOnlyList<KeyValuePair<string, byte[]>> ConvertDocToParts(byte[] bytes, ConvertOptions? options = null) =>
        Run(bytes, w => w.BuildParts(options).Select(p => new KeyValuePair<string, byte[]>(p.Path, p.Data)).ToList());

    private static T Run<T>(byte[] bytes, Func<DocxWriter, T> build)
    {
        if (!CfbFile.IsCfbBytes(bytes))
            throw new DocFormatException("O arquivo não é um .doc do Word 97-2003 (assinatura de Compound File ausente).");
        try
        {
            var reader = new DocReader(bytes);
            return build(new DocxWriter(reader));
        }
        catch (DocFormatException)
        {
            throw;
        }
        catch (Exception e)
        {
            throw new DocFormatException($"Arquivo .doc corrompido ou não suportado: {e.Message}");
        }
    }
}
