using UniversalOffice.Converter.Processing.Docs.Core;

namespace UniversalOffice.Converter.Processing.Docs.Docx;

/// <summary>
/// Container OPC de um .docx (porta de docx-core/src/package.ts).
/// Round-trip lossless: partes não tocadas preservadas byte a byte, ordem mantida.
/// </summary>
public sealed class DocxPackage : OpcPackage
{
    private DocxPackage() { }

    public static new DocxPackage Load(byte[] bytes)
    {
        var pkg = new DocxPackage();
        pkg.LoadInto(bytes);
        if (pkg.GetPart("word/document.xml") is null)
            throw new InvalidDataException("Pacote sem word/document.xml — não é um documento .docx válido");
        return pkg;
    }

    /// <summary>Pacote OPC mínimo para documentos novos.</summary>
    public static DocxPackage Empty()
    {
        var pkg = new DocxPackage();
        pkg.SetPartText("[Content_Types].xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
            "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
            "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
            "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
            "</Types>");
        pkg.SetPartText("_rels/.rels",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>" +
            "</Relationships>");
        pkg.SetPartText("word/document.xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body/></w:document>");
        return pkg;
    }

    public string DocumentXml() =>
        GetPartText("word/document.xml") ?? throw new InvalidDataException("Pacote sem word/document.xml");
}
