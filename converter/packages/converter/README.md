# @universal-office/converter

Convert DOCX, XLSX, PPTX and PDF bytes to HTML, PDF or Markdown in Node.js and
browsers, without Microsoft Office. Part of [Universal Office](https://universaloffice.org/):
the same conversions behind the export menus of `<universal-write>`,
`<universal-sheet>` and `<universal-slides>`, as a standalone library.

| Input | HTML | PDF | Markdown |
| --- | --- | --- | --- |
| DOCX | yes | yes | yes |
| XLSX | yes | yes | yes |
| PPTX | yes | yes | yes |
| PDF | text-based HTML | identity | text-based Markdown |

```bash
npm install @universal-office/converter
```

```ts
import { convert } from '@universal-office/converter';

const markdown = await convert(bytes, { to: 'markdown' });
const html = await convert(bytes, { to: 'html' });
const pdf = await convert(bytes, { to: 'pdf', options: { fonts } });
```

`bytes` is a `Uint8Array`, an `ArrayBuffer` or a Node.js `Buffer`. The source format
is detected from the file contents; pass `from` to override it.

PDF output from Office formats embeds TrueType fonts: pass the font bytes in the
options of the target (`fonts`). The open metric-compatible fonts of
[`@universal-office/font-files`](https://www.npmjs.com/package/@universal-office/font-files)
(Liberation, Carlito, Caladea) work well for that. Reading PDF input uses
[`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist), loaded only when a PDF is converted.

## Per-format functions

Each pair is also exported as a function, with typed options:
`docxToHtml`, `docxToMarkdown`, `docxToPdf`, `xlsxToHtml`, `xlsxToMarkdown`,
`xlsxToPdf`, `pptxToHtml`, `pptxToMarkdown`, `pptxToPdf`, `pdfToHtml`,
`pdfToMarkdown`, plus `detectFormat(bytes)`.

## Adding formats

`convert` uses a registry of source/target pairs. Create your own with
`createOfficeConverter()` and add pairs with `register(source, target, handler)`:

```ts
import { createOfficeConverter } from '@universal-office/converter';

const converter = createOfficeConverter()
  .register('docx', 'txt', async (input) => (await converter.convert(input, { to: 'markdown' })).replace(/[#*_`]/g, ''));

const text = await converter.convert(bytes, { to: 'txt' });
```

The .NET port is the `UniversalOffice.Converter` NuGet package.

## License

MIT.
