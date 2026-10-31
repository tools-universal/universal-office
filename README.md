<p align="center">
  <img src="https://raw.githubusercontent.com/erichideyuki/universal-office/main/site/assets/icons/universal-office.svg" width="96" height="96" alt="Universal Office" />
</p>

<h1 align="center">Universal Office</h1>

<p align="center">
  <strong>Document, spreadsheet and presentation editors that open, render and save
  .docx, .xlsx and .pptx the way Microsoft Office does</strong> — as web components,
  as a desktop app and as a .NET library. MIT licensed.
</p>

<p align="center">
  <a href="https://universaloffice.org/"><strong>Website &amp; documentation</strong></a> ·
  <a href="https://universaloffice.org/live.html">Try it live</a> ·
  <a href="https://github.com/erichideyuki/universal-office/releases/tag/desktop-v0.9.2">Download the desktop app (Beta)</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@universal-office/write"><img src="https://img.shields.io/npm/v/@universal-office/write?label=npm" alt="npm" /></a>
  <a href="https://www.nuget.org/packages/UniversalOffice.Docx"><img src="https://img.shields.io/nuget/v/UniversalOffice.Docx?label=NuGet" alt="NuGet" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT" /></a>
  <a href="https://universaloffice.org/"><img src="https://img.shields.io/badge/docs-universaloffice.org-0a7cff" alt="Documentation" /></a>
  <a href="https://github.com/sponsors/erichideyuki"><img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&amp;logoColor=white" alt="Sponsor" /></a>
</p>

---

Most editors convert Office files into their own model and back, and the
document comes out different. Universal Office keeps the file as it is: the
data model mirrors OOXML, parts it does not model are saved back byte for
byte, and pages are laid out with the real font metrics — the same line
breaks, page breaks and column widths as Word, Excel and PowerPoint. Every
rule is measured against the reference application, not guessed.

- **Web components** — one HTML tag per editor, no backend, no Office install.
- **Desktop app (Beta)** — Universal Office for Windows, macOS and Linux, with
  the three editors, offline.
- **.NET library** — edit, sanitize and fill .docx templates and render them
  to PDF on the server, with the same layout engine as the editor.

## Universal Write — documents

![Universal Write: typing, formatting, toolbar and status bar](https://raw.githubusercontent.com/erichideyuki/universal-office/main/site/assets/gifs/write.gif)

`<universal-write>` · [`@universal-office/write`](https://www.npmjs.com/package/@universal-office/write)

A .docx editor painted to a canvas with Word's layout: styles, lists, tables,
images, headers and footers, fields, table of contents, comments, track
changes, spell checking, and a compact toolbar or a Word-style ribbon. Opens
.docx, .doc and .odt; saves .docx, .odt, PDF, XPS, HTML and Markdown. Also:
`<universal-document-viewer>` (read-only viewer) and `<universal-write-diff>`
(side-by-side comparison of two .docx).
[Documentation](https://universaloffice.org/docs/write/index.html)

## Universal Sheet — spreadsheets

![Universal Sheet: navigating sheets, editing cells and formulas](https://raw.githubusercontent.com/erichideyuki/universal-office/main/site/assets/gifs/sheet.gif)

`<universal-sheet>` · [`@universal-office/sheet`](https://www.npmjs.com/package/@universal-office/sheet)

An .xlsx editor with the look of Excel: number formats, fonts, borders,
merged cells, conditional formatting, charts and images, and a built-in
formula engine with Excel's functions. Opens .xlsx and .xls; saves .xlsx,
rewriting only what was edited. Optional bars: menus or ribbon, formula bar,
sheet tabs and status bar.
[Documentation](https://universaloffice.org/docs/sheet/index.html)

## Universal Slides — presentations

![Universal Slides: navigating, editing text and presenting](https://raw.githubusercontent.com/erichideyuki/universal-office/main/site/assets/gifs/slides.gif)

`<universal-slides>` · [`@universal-office/slides`](https://www.npmjs.com/package/@universal-office/slides)

A .pptx editor on the same rendering as the viewer: transitions, animations,
slide show and automatic playback, plus editing that goes to the file —
slides, shapes, text, speaker notes — with PowerPoint-style bars. Opens .pptx
and .ppt; saves .pptx; exports PDF, HTML, Markdown and PNG. The read-only
player is `<universal-slides-viewer>`.
[Documentation](https://universaloffice.org/docs/slides/index.html)

## Quick start

### Web

```bash
npm install @universal-office/write
```

```js
import '@universal-office/write'; // registers <universal-write>
```

```html
<universal-write id="editor" src="/document.docx" fonts="/node_modules/@universal-office/font-files"
  topbar bottombar style="display:block; height:100vh"></universal-write>
```

`fonts` points at the folder of `@universal-office/font-files`, installed with
the editor (the open, metric-compatible fonts). `topbar` and `bottombar` add the
built-in bars. To get the file back:

```js
const docx = await document.getElementById('editor').save('docx'); // or 'pdf', 'markdown'
```

Without a bundler, serve the packages as static folders and import
`/vendor/universal-office/write/index.js` by URL — see the
[documentation](https://universaloffice.org/docs/write/index.html).

### .NET

```bash
dotnet add package UniversalOffice.Docx
```

```csharp
using UniversalOffice.DocxLayout;

byte[] pdf = DocxLayoutPipeline.ToPdf(File.ReadAllBytes("report.docx"), SubstituteFontProvider.Shared,
    new LayoutOptions { HyphenationLanguages = ["en", "pt-BR"] });
```

`SubstituteFontProvider.Shared` uses the fonts embedded in the document, then
the installed ones, then installed metric-compatible open fonts — on Linux
servers, install `fonts-liberation`, `fonts-crosextra-carlito` and
`fonts-crosextra-caladea`.

## Packages

| npm | | What it is |
|---|---|---|
| [`@universal-office/write`](https://www.npmjs.com/package/@universal-office/write) | [![npm](https://img.shields.io/npm/v/@universal-office/write?label=)](https://www.npmjs.com/package/@universal-office/write) | `<universal-write>`, the .docx editor (the `./viewer` entry registers only the viewer) |
| [`@universal-office/document-viewer`](https://www.npmjs.com/package/@universal-office/document-viewer) | [![npm](https://img.shields.io/npm/v/@universal-office/document-viewer?label=)](https://www.npmjs.com/package/@universal-office/document-viewer) | `<universal-document-viewer>`, read-only viewer for .docx and .doc |
| [`@universal-office/compare`](https://www.npmjs.com/package/@universal-office/compare) | [![npm](https://img.shields.io/npm/v/@universal-office/compare?label=)](https://www.npmjs.com/package/@universal-office/compare) | `<universal-write-diff>` and a diff engine for .docx |
| [`@universal-office/sheet`](https://www.npmjs.com/package/@universal-office/sheet) | [![npm](https://img.shields.io/npm/v/@universal-office/sheet?label=)](https://www.npmjs.com/package/@universal-office/sheet) | `<universal-sheet>`, the .xlsx editor |
| [`@universal-office/slides`](https://www.npmjs.com/package/@universal-office/slides) | [![npm](https://img.shields.io/npm/v/@universal-office/slides?label=)](https://www.npmjs.com/package/@universal-office/slides) | `<universal-slides>`, the .pptx editor |
| [`@universal-office/slides-viewer`](https://www.npmjs.com/package/@universal-office/slides-viewer) | [![npm](https://img.shields.io/npm/v/@universal-office/slides-viewer?label=)](https://www.npmjs.com/package/@universal-office/slides-viewer) | `<universal-slides-viewer>`, player for .pptx and .ppt |
| [`@universal-office/font-files`](https://www.npmjs.com/package/@universal-office/font-files) | [![npm](https://img.shields.io/npm/v/@universal-office/font-files?label=)](https://www.npmjs.com/package/@universal-office/font-files) | Open metric-compatible fonts (Liberation, Carlito, Caladea) used by all components |
| [`@universal-office/spellcheck`](https://www.npmjs.com/package/@universal-office/spellcheck) | [![npm](https://img.shields.io/npm/v/@universal-office/spellcheck?label=)](https://www.npmjs.com/package/@universal-office/spellcheck) | Optional spell checking engine: Hunspell in WebAssembly |
| [`@universal-office/dictionary-pt-br`](https://www.npmjs.com/package/@universal-office/dictionary-pt-br) | [![npm](https://img.shields.io/npm/v/@universal-office/dictionary-pt-br?label=)](https://www.npmjs.com/package/@universal-office/dictionary-pt-br) | Brazilian Portuguese dictionary (VERO) |
| [`@universal-office/dictionary-en-us`](https://www.npmjs.com/package/@universal-office/dictionary-en-us) | [![npm](https://img.shields.io/npm/v/@universal-office/dictionary-en-us?label=)](https://www.npmjs.com/package/@universal-office/dictionary-en-us) | American English dictionary (SCOWL) |
| [`@universal-office/dictionary-es`](https://www.npmjs.com/package/@universal-office/dictionary-es) | [![npm](https://img.shields.io/npm/v/@universal-office/dictionary-es?label=)](https://www.npmjs.com/package/@universal-office/dictionary-es) | Spanish dictionary (RLA-ES), for every variant of Spanish |

| NuGet | | What it is |
|---|---|---|
| [`UniversalOffice.Docx`](https://www.nuget.org/packages/UniversalOffice.Docx) | [![NuGet](https://img.shields.io/nuget/v/UniversalOffice.Docx?label=)](https://www.nuget.org/packages/UniversalOffice.Docx) | Word documents in pure .NET: lossless editing, sanitizing, templates, .docx to PDF, .doc to .docx, Markdown and HTML |
| [`UniversalOffice.Core`](https://www.nuget.org/packages/UniversalOffice.Core) | [![NuGet](https://img.shields.io/nuget/v/UniversalOffice.Core?label=)](https://www.nuget.org/packages/UniversalOffice.Core) | Shared base: OPC packages, fonts, hyphenation, PDF writer, DrawingML (installed with the others) |

`UniversalOffice.Xlsx` and `UniversalOffice.Pptx` (spreadsheets and
presentations in .NET) are built but not published yet.

## Desktop app (Beta)

**Universal Office (Beta)** is one app with the three editors — Universal
Write, Universal Sheet and Universal Slides — each with its own shortcut,
icon and welcome window (new, open, recent files, language). Files opened from
the system go to the editor of their extension. It works offline: the open
fonts ship with it and the system fonts (such as Calibri) are read from the
machine.

- **Windows** (installer), **macOS** (dmg, Apple Silicon and Intel) and
  **Linux** (AppImage, deb, rpm, tar.gz and Snap; Flathub planned)
- [Download for Windows](https://github.com/erichideyuki/universal-office/releases/download/desktop-v0.9.2/Universal-Office-0.9.2-beta-Setup.exe)
  · [all platforms](https://github.com/erichideyuki/universal-office/releases/tag/desktop-v0.9.2)

The builds are not signed yet, so SmartScreen and Gatekeeper warn on install.

## Languages and spell checking

The interface of every component and of the desktop app is in **English,
Portuguese and Spanish**: the `lang` attribute (`en`, `pt`, `es`, any region)
picks it, otherwise the browser's language does. Keyboard shortcuts are the
same in all languages.

Spell checking in `<universal-write>` runs Hunspell in a Web Worker with open
LibreOffice dictionaries — Brazilian Portuguese, American English and Spanish
— chosen by the language of each run of text. Engine and dictionaries are
separate, optional packages, downloaded only when a text in that language
appears; the squiggles are drawn on screen only, never in the PDF or print.

## Contributing / Development

Repository layout, build, tests and the desktop app: [docs/development.md](docs/development.md)
(in Portuguese). Repository rules: [CLAUDE.md](CLAUDE.md). Publishing to npm and
NuGet: [docs/publishing.md](docs/publishing.md). What changed in each version:
[CHANGELOG.md](CHANGELOG.md). Bugs and questions:
[issues](https://github.com/erichideyuki/universal-office/issues).

## Support the project

Universal Office is free and MIT licensed. If it saves you time or powers your
product, please consider
[sponsoring its development on GitHub Sponsors](https://github.com/sponsors/erichideyuki) ❤

## License

[MIT](LICENSE) © Eric Kono. Third-party data keeps its own license, shipped
inside each package: the fonts (SIL OFL 1.1 and Apache 2.0), Hunspell (MPL
1.1) and the dictionaries (MPL 1.1, the SCOWL license and, for Spanish, GPL 3+ /
LGPL 3+ / MPL 1.1+ at your choice).

Microsoft, Word, Excel and PowerPoint are trademarks of Microsoft Corporation.
Universal Office is not affiliated with Microsoft.
