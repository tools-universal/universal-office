# UniversalOffice.Converter

Convert DOCX, XLSX, PPTX and PDF files to HTML, PDF or Markdown in .NET, without
Microsoft Office. It is the .NET port of the
[`@universal-office/converter`](https://www.npmjs.com/package/@universal-office/converter)
npm package, part of [Universal Office](https://universaloffice.org/).

| Input | HTML | PDF | Markdown |
| --- | --- | --- | --- |
| DOCX | yes | yes | yes |
| XLSX | yes | yes | yes |
| PPTX | yes | yes | yes |
| PDF | text-based HTML | identity | text-based Markdown |

```csharp
using UniversalOffice.Converter;

ConversionResult result = await OfficeConverter.Default.ConvertAsync(
    bytes,
    new ConversionRequest("markdown"));
string markdown = result.Text!;
```

The source format is detected from the file contents; pass `Source` in the request
to override it. PDF output from Office formats needs the TrueType font bytes in the
options (DOCX → PDF takes a `List<PdfFontSource>`). `OfficeConverter.Register(source,
target, handler)` adds new source/target pairs, on `OfficeConverter.Default` or on an
instance from `OfficeConverter.CreateDefault()`.

For lossless .docx editing, templates and the Word-compatible layout engine (DOCX →
PDF with the same pagination as the editor), see `UniversalOffice.Docx`.

Licensed under MIT.
