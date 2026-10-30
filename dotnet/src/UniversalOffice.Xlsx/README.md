# UniversalOffice.Xlsx

Excel workbooks in pure .NET (net8.0), with no native dependencies and no Office install:

- **Read .xlsx** losslessly: sheets, cells, shared and rich strings, styles, theme
  colors, merges, column widths, row heights, hyperlinks, comments, conditional formats.
- **Format values like Excel** (`Format.FormatValue`): number, date, time, percent,
  fraction and custom format codes (pt-BR locale by default, configurable through
  `FormatLocale`).
- **Update a worksheet surgically** without touching the rest of the package.
- **Export** to CSV/TSV, Markdown, HTML, ODS (OpenDocument), SpreadsheetML 2003 and PDF.

Depends only on `UniversalOffice.Core`.

## Install

```
dotnet add package UniversalOffice.Xlsx
```

## Read

```csharp
using UniversalOffice.Xlsx;

var package = XlsxPackage.Load(bytes);
var workbook = XlsxReader.ReadWorkbook(package);
foreach (var sheet in workbook.Sheets)
{
    var worksheet = XlsxReader.ReadWorksheet(package, sheet.Target!);
    Console.WriteLine($"{sheet.Name}: {worksheet.Rows.Count} rows");
}

// "12,5%": the default locale is pt-BR; pass new FormatOptions { Locale = … } for another one
var shown = Format.FormatValue(0.125, "0.0%").Text;
```

## Export

```csharp
using UniversalOffice.Export;
using UniversalOffice.Pdf;

string csv = XlsxCsv.ToCsv(bytes, new SheetExportOptions { SheetName = "Sales" });
string markdown = XlsxMarkdown.ToMarkdown(bytes);
string html = XlsxHtml.ToHtml(bytes, fullDocument: true);
byte[] ods = XlsxOds.ToOds(bytes);
string xml2003 = XlsxXml2003.ToXml2003(bytes);

// PDF: the generator has no built-in fonts, pass at least one TTF
byte[] pdf = XlsxPdf.ToPdf(bytes, new SheetPdfOptions
{
    Fonts = [new PdfFontSource { Bytes = File.ReadAllBytes("LiberationSans-Regular.ttf") }],
});
```

## License

MIT.
