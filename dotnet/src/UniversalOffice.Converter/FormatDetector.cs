using System.IO.Compression;

namespace UniversalOffice.Converter;

public enum DocumentFormat
{
    Docx,
    Xlsx,
    Pptx,
    Pdf,
}

public static class FormatDetector
{
    public static DocumentFormat Detect(ReadOnlySpan<byte> input)
    {
        if (input.StartsWith("%PDF-"u8)) return DocumentFormat.Pdf;
        if (input.Length < 2 || input[0] != (byte)'P' || input[1] != (byte)'K')
            throw new NotSupportedException("Expected PDF, DOCX, XLSX, or PPTX bytes.");

        using var stream = new MemoryStream(input.ToArray(), writable: false);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: false);
        var names = archive.Entries.Select(entry => entry.FullName.Replace('\\', '/')).ToHashSet(StringComparer.Ordinal);
        if (names.Contains("word/document.xml")) return DocumentFormat.Docx;
        if (names.Contains("xl/workbook.xml")) return DocumentFormat.Xlsx;
        if (names.Contains("ppt/presentation.xml")) return DocumentFormat.Pptx;
        throw new NotSupportedException("ZIP container is not a supported OOXML document.");
    }
}
