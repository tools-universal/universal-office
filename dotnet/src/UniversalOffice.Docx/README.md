# UniversalOffice.Docx

Word documents in pure .NET (net8.0), with no native dependencies and no Office install.

- **Edit .docx without losing anything.** Namespaces, unknown markup and the parts you
  don't touch survive; only the XML parts you change are rewritten.
- **Sanitize untrusted documents.** Accept tracked changes and remove comments, macros,
  OLE/ActiveX, external relationships, disallowed fields and personal metadata, with
  size, depth and field limits that never overflow the stack.
- **Fill templates.** Apply a content .docx to a template with the template's styles,
  replace `#{Parameter}` placeholders (even when Word split them across runs), repeat a
  table row, swap a logo, and write formatted content at the end of the body.
- **Render .docx to PDF** with a layout engine that follows Word: pagination, tables,
  headers and footers, footnotes, floating objects, fields, hyphenation, links and
  bookmarks, using the installed fonts or metric-compatible substitutes.
- **Convert** Word 97-2003 (.doc) to .docx, and .docx to Markdown or HTML.

It depends only on [UniversalOffice.Core](https://www.nuget.org/packages/UniversalOffice.Core).

## Install

```shell
dotnet add package UniversalOffice.Docx
```

## Open, edit and save

```csharp
using UniversalOffice.Docx.Editing;

var doc = DocxDocument.Open(bytes);   // InvalidDataException or XmlException if it isn't a .docx
DocxText.ReplaceParameters(doc, [new("Title", "Code of Conduct"), new("Version", "2.0")]);
doc.Properties.Title = "Code of Conduct";
byte[] result = doc.Save();
```

## Sanitize an uploaded document

```csharp
using UniversalOffice.Core;
using UniversalOffice.Docx.Editing;

var limits = new DocxLimits { Package = new OpcPackageLimits { MaxPartBytes = 50L << 20, MaxTotalBytes = 150L << 20 } };
var doc = DocxDocument.Open(upload, limits);   // OfficeLimitExceededException when over a limit
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content);
byte[] clean = doc.Save();
```

Use `DocxSanitizeOptions.Content` for documents you received: it accepts revisions and
removes comments, macros, protection, headers and footers, unsafe objects and fields.
Use `DocxSanitizeOptions.Output` for documents you generated from a trusted template.

## Apply content to a template

```csharp
using UniversalOffice.Docx.Editing;

var doc = DocxDocument.Open(templateBytes);
DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", logoPng, maxWidthPt: 200, maxHeightPt: 75);
DocxText.ReplaceParameters(doc, parameters);   // before the content, so its #{...} stay literal
DocxTemplate.ApplyContent(doc, contentBytes, new() { PreserveSections = true });
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Output);
byte[] docx = doc.Save();
```

## Write formatted content using the template's sample paragraphs

Paragraphs of the template that contain a marker such as `#{Heading1}`, `#{Normal}` or
`#{BulletList}` carry the formatting to reuse. `DocxParagraphSamples.Extract` reads them
and removes them from the document.

```csharp
using UniversalOffice.Docx.Editing;

var doc = DocxDocument.Open(templateBytes);
var samples = DocxParagraphSamples.Extract(doc, ["Heading1", "Normal", "BulletList"]);
var writer = new DocxBodyWriter(doc);

writer.AddText("Purpose", DocxRunFormat.None);
writer.EndParagraph(new() { StyleId = samples["Heading1"].StyleId, KeepWithNext = true });

writer.AddText("Read the ", DocxRunFormat.None);
writer.AddText("policy", new DocxRunFormat { Bold = true, Link = "https://example.com/policy" });
writer.EndParagraph(new() { Base = samples["BulletList"], ListNumId = samples["BulletList"].NumId });

writer.Finish();
```

## Convert to PDF

```csharp
using UniversalOffice.DocxLayout;

byte[] pdf = DocxLayoutPipeline.ToPdf(docx, SubstituteFontProvider.Shared,
    new LayoutOptions { HyphenationLanguages = ["en", "pt-BR"] });
```

`SubstituteFontProvider.Shared` uses the fonts embedded in the document first, then the
fonts installed on the machine (Windows; on Linux `/usr/share/fonts`,
`/usr/local/share/fonts`, `~/.fonts` and `~/.local/share/fonts`; the macOS font
folders; plus the folders in the `EXTRA_FONT_DIRS` environment variable, separated
by `;`). When a font is missing it falls back to an
installed metric-compatible open font: Carlito for Calibri, Caladea for Cambria, and
Liberation Sans, Serif and Mono for Arial, Times New Roman and Courier New. These are
not in the package: on Linux servers and containers install them, e.g. on
Debian/Ubuntu

```bash
apt-get install fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea
```

to get the same line and page breaks as Word. Before 0.9.2 the installed fonts were
not found outside Windows, and the conversion failed with
`nenhuma fonte disponível para "…"` ("no font available for …").

## .doc, Markdown and HTML

```csharp
using UniversalOffice.DocBinary;
using UniversalOffice.Export;

byte[] docx = DocBinary.IsWordBinary(bytes) ? DocBinary.ConvertDocToDocx(bytes) : bytes;
string markdown = FromDocx.DocxToMarkdown(docx);
string html = FromDocx.DocxToHtml(docx);
byte[] pdf = DocxPdf.ToPdf(bytes);   // .doc or .docx, with the installed fonts
```

## Page fields

`PAGE`, `NUMPAGES`, `SECTIONPAGES`, `PAGEREF`, `SEQ` and `REF` are updated when the
document is laid out. Formula fields over them, such as `{ = { NUMPAGES } - 1 }` (the
page count without a cover page), are recalculated as Word does. Like Word, `NUMPAGES`
leaves out a cover page from Word's gallery when the first section starts numbering at 0.

## Known differences from Word

- Word prefers an installed font over the same font embedded in the document; the
  layout engine uses the embedded one first.
- Mirror margins and gutter are kept in the file but not applied to the layout.
- A rotated text box placed above its anchor paragraph can land in a different place.
- Data-bound content controls show the content stored in the control; Word refreshes
  it from the bound XML when it opens the file.

## License

MIT.
