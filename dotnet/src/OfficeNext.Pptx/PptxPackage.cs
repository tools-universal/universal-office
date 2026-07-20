using OfficeNext.Core;

namespace OfficeNext.Pptx;

/// <summary>Container OPC de um .pptx (porta de slides-core/src/package.ts).</summary>
public sealed class PptxPackage : OpcPackage
{
    private PptxPackage() { }

    public static new PptxPackage Load(byte[] bytes)
    {
        var pkg = new PptxPackage();
        pkg.LoadInto(bytes);
        if (pkg.GetPart("ppt/presentation.xml") is null)
            throw new InvalidDataException("Pacote sem ppt/presentation.xml — não é uma apresentação válida");
        return pkg;
    }

    public string PresentationXml() =>
        GetPartText("ppt/presentation.xml") ?? throw new InvalidDataException("Pacote sem ppt/presentation.xml");
}
