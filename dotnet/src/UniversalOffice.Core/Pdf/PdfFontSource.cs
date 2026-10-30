namespace UniversalOffice.Pdf;

/// <summary>Fonte TTF para embutir no PDF (bytes crus + traços que ela cobre).</summary>
public sealed class PdfFontSource
{
    public required byte[] Bytes { get; init; }
    public bool Bold;
    public bool Italic;
    /// <summary>Nome-base no PDF (default: FontN).</summary>
    public string? Name;
}
