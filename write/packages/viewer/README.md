# @universal-office/document-viewer

The `<universal-document-viewer>` web component: a **read-only viewer for
.docx and .doc** files with layout faithful to Microsoft Word — the same
pagination, line breaks and page images as the editor and the PDF export,
because all three use the same layout engine.

![The document viewer: pages, outline, comments and zoom](../../../site/assets/gifs/document-viewer.gif)

- Print, Read and Web views, zoom (page width, whole page or a percentage)
- Side panel with page thumbnails and the document outline (headings)
- Comments panel linked to the highlighted text
- Selectable, searchable text (invisible text layer over the canvas)
- Download the original file or a PDF, print and full screen; PDF export
- Keyboard and screen-reader accessible; English and Portuguese UI

## Installation

The package is self-contained: one ES module plus two folders that must be
served next to it.

| Path | What it is |
|---|---|
| `index.js` | The component (registers `<universal-document-viewer>` on import) |
| `chunks/` | Parts loaded on demand (hyphenation patterns, rare converters) |
| `fonts/` | Open fonts (Liberation, Carlito, Caladea) used as metric-compatible substitutes |

```js
import '@universal-office/document-viewer';
```

```html
<universal-document-viewer src="/report.docx" fonts="/node_modules/@universal-office/document-viewer/fonts"
  style="display:block; height:100vh"></universal-document-viewer>
```

Give the element a size with CSS — it fills its box.

## Attributes

| Attribute | Values | Description |
|---|---|---|
| `src` | URL | Document to fetch and show (same origin or CORS). Reloads when changed. |
| `fonts` | URL | Folder with the open fonts. Default: the package's own `fonts/`, next to `index.js` — set it only when you serve the fonts from somewhere else (or when the bundle is loaded from a `blob:`/`data:` URL). Read once, on the first layout. |
| `view` | `print` (default) · `read` · `web` | Initial view. |
| `zoom` | `page-width` (default) · `page-fit` · number or `%` | Initial zoom, e.g. `125` or `125%` (10–800%). |
| `noselect` | boolean | Turns off text selection. |
| `nocontrols` | boolean | Removes the whole control bar. |
| `no<item>` | boolean | Removes one control: `nonav`, `nocounter`, `nooutline`, `nothumbnails`, `nocomments`, `nozoom`, `noview`, `nodownload`, `nodownloadpdf`, `noprint`, `nofullscreen`, `noprogress`. |
| `lang` | `en` · `pt` | UI language. Without it: Portuguese if the browser prefers it, otherwise English. |

## Methods

| Method | Description |
|---|---|
| `loadDocx(bytes: Uint8Array): Promise<void>` | Loads a .docx or .doc. Throws on an invalid file and keeps the current one. |
| `getPageCount()` · `getPageIndex()` | Page count and current page (0-based). |
| `goToPage(i, smooth = true)` | Scrolls to a page. |
| `getView()` · `setView('print' \| 'read' \| 'web')` | Current view. |
| `getZoom()` · `setZoom(spec)` | `spec` is `'page-width'`, `'page-fit'` or a factor (`1` = 100%, 0.1–8). `getZoom()` returns `{ spec, factor }`. |
| `getHeadings()` · `goToHeading(i)` | Outline: `{ level, text, page }[]`. |
| `getComments()` · `selectComment(id)` | Comments: `{ id, author, text, page }[]`. |
| `exportPdf(): Uint8Array` | PDF of the print layout. |
| `print()` · `download()` · `downloadPdf()` · `toggleFullscreen()` | Same as the control-bar buttons (`download()` saves the original file, `downloadPdf()` the PDF of the print layout). |

```js
const viewer = document.querySelector('universal-document-viewer');
const bytes = new Uint8Array(await (await fetch('/contract.docx')).arrayBuffer());
await viewer.loadDocx(bytes);
viewer.setZoom('page-fit');
```

## Events

| Event | `detail` | When |
|---|---|---|
| `udv-loaded` | `{ pages }` | A document finished loading. |
| `udv-error` | `{ src, error }` | `src` could not be fetched or read. |
| `udv-page` | `{ index }` | The current page changed. |
| `udv-view` | `{ view }` | The view changed. |
| `udv-zoom` | `{ zoom, factor }` | The zoom changed. |
| `udv-heading` | `{ index, level, text, page }` | An outline entry was chosen. |
| `udv-comment` | `{ id, author, text }` | A comment was chosen. |
| `udv-download` | `{ bytes, filename }` | Download button. **Cancelable** — call `preventDefault()` to handle the file yourself. |
| `udv-download-pdf` | `{ pdf, filename }` | Download PDF button. **Cancelable** — call `preventDefault()` to handle the PDF yourself. |
| `udv-print` | `{ pdf }` | Print button. **Cancelable** — handle printing yourself. |

## Styling

CSS custom properties. Each one first reads `--udv-<name>`, then the shared
`--uo-<name>` (one theme for both viewers):

| Property | Default |
|---|---|
| `--udv-background` | `#2b2b2b` (around the pages) |
| `--udv-web-background` | `#fff` (Web view) |
| `--udv-page-gap` | `16px` |
| `--udv-panel-bg` | side-panel background |
| `--udv-comment-highlight` | `#f5b400` |
| `--udv-focus-color` | `#4ea1ff` |
| `--udv-selection` | text-selection color |
| `--udv-controls-color` · `--udv-controls-size` · `--udv-controls-bg` · `--udv-controls-hover-bg` | `#fff` · `22px` · dark gradient · translucent white |
| `--udv-progress-color` · `--udv-progress-track` · `--udv-progress-height` | `#fff` · translucent white · `3px` |

Parts for `::part()`: `viewer`, `pages`, `page`, `nav-panel`, `nav-tab`,
`outline`, `outline-item`, `thumbnails`, `thumbnail`, `comments`, `comment`,
`menu`, `menu-option`, `controls`, `progress`, `progress-value`, `counter`,
`button` and `button-<name>` (`prev`, `next`, `outline`, `thumbnails`,
`comments`, `zoom-out`, `zoom-level`, `zoom-in`, `view`, `download`, `download-pdf`, `print`,
`fullscreen`).

```css
universal-document-viewer {
  --uo-controls-color: #ffd54f;
  --udv-background: #1e1e1e;
}
universal-document-viewer::part(button-download) { display: none; }
```

## Fonts

Fonts embedded in the document are used first. Other families are resolved,
in order, from: fonts the browser can see by name (installed or declared with
`@font-face`), then **metric-compatible open substitutes** from the `fonts`
folder (Calibri → Carlito, Cambria → Caladea, Arial → Liberation Sans, Times
New Roman → Liberation Serif, Courier New → Liberation Mono), then Liberation
Sans. Serving `fonts/` keeps line breaks right when the reader does not have
the Office fonts. The package also exports `FontResolver` for advanced setups:

```js
import { FontResolver } from '@universal-office/document-viewer';
FontResolver.shared().configure({ baseUrl: '/assets/office-fonts' });
```

## Keyboard

| Keys | Action |
|---|---|
| Ctrl/⌘ `+` · `-` · `0` and Ctrl+wheel | Zoom in, out, reset (disabled by `nozoom`) |
| → ↓ PageDown Space / ← ↑ PageUp (Read view) | Next / previous screen |
| Home · End | First / last page |

## Formats

Input: `.docx`, `.doc` (Word 97–2003, converted in memory). Output: PDF
(`exportPdf`, `downloadPdf`), the original file (`download`).
