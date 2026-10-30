# UniversalOffice.Pptx

PowerPoint presentations in pure .NET (net8.0), with no native dependencies and no Office install:

- **Read .pptx**: slides, layouts and masters, the text style cascade, shapes with
  flattened groups, tables, pictures, fills and notes.
- **Lay out text** the way the slides render (`LayoutTextBody`) and **change run
  text** without touching the rest of the package.
- **Export** to Markdown, HTML and vector PDF (one page per slide).

Depends only on `UniversalOffice.Core`.

## Install

```
dotnet add package UniversalOffice.Pptx
```

## Read

```csharp
using UniversalOffice.Pptx;

var package = PptxPackage.Load(bytes);
var presentation = PptxReader.ReadPresentation(package);
foreach (var slideRef in presentation.Slides)
{
    var slide = PptxReader.ReadSlide(package, slideRef.Target!);
    Console.WriteLine($"{slideRef.Target}: {slide.Shapes.Count} shapes");
}
```

## Export

```csharp
using UniversalOffice.Export;
using UniversalOffice.Pdf;

string markdown = PptxMarkdown.ToMarkdown(bytes);
string html = PptxHtml.ToHtml(bytes);

// PDF: the generator has no built-in fonts, pass the TTFs to use (regular/bold/italic…)
byte[] pdf = PptxPdf.ToPdf(bytes, new SlidesPdfOptions
{
    Fonts =
    [
        new PdfFontSource { Bytes = File.ReadAllBytes("LiberationSans-Regular.ttf") },
        new PdfFontSource { Bytes = File.ReadAllBytes("LiberationSans-Bold.ttf"), Bold = true },
    ],
});
```

## License

MIT.
