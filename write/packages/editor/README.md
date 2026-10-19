# @universal-office-pro/write

The `<universal-write>` web component — a **.docx editor** that paints the
document to a **canvas** with layout faithful to Microsoft Word (real font
metrics, the same line and page breaks) and a lossless OOXML round-trip: parts
it does not model are saved back byte for byte.

![The editor: typing, formatting, toolbar and status bar](../../../site/assets/gifs/write.gif)

- Full editing: its own caret, selection, IME and clipboard; undo/redo
- Paragraph and character formatting, styles, lists, tables, images,
  headers and footers, fields, table of contents, comments
- Print, Web, Read, Draft and Outline views; zoom; formatting marks
- Opens .docx, .doc and .odt; saves .docx, .odt, PDF, XPS, HTML and Markdown
- Optional Word-style toolbar and status bar; English and Portuguese UI
- Plugins for custom inline content (e.g. @mentions)

## Installation

Obtain the package from **PrivJS** and follow the setup instructions there.

The package is self-contained — no dependencies. Serve these folders next to
`index.js`:

| Path | What it is |
|---|---|
| `index.js` | The component (registers `<universal-write>` on import) |
| `chunks/` | Parts loaded on demand (toolbar, hyphenation patterns, rare converters) |
| `fonts/` | Open fonts — **Liberation Sans is required** (see [Fonts](#fonts)) |

```js
import '@universal-office-pro/write';
```

```html
<universal-write id="editor" fonts="/office/fonts" topbar bottombar
  style="display:block; height:100vh"></universal-write>
```

```js
const editor = document.getElementById('editor');

editor.addEventListener('uw-ready', async () => {
  const bytes = new Uint8Array(await (await fetch('/contract.docx')).arrayBuffer());
  editor.load(bytes, 'auto', { protected: false });
  editor.focusEditor();
});

const docx = await editor.save('docx');   // Uint8Array
const pdf  = await editor.save('pdf');    // Uint8Array
const md   = await editor.save('markdown'); // string
```

Give the element a size with CSS — it fills its box and scrolls inside.

## Attributes

| Attribute | Values | Description |
|---|---|---|
| `fonts` | URL | Folder with the font files (the package's `fonts/`). Read at initialization. |
| `src` | URL | Document opened at initialization (in Protected View, like Word). |
| `topbar` | boolean | Built-in two-row toolbar. |
| `bottombar` | boolean | Built-in status bar: page/word count, view buttons, zoom. |
| `lang` | `en` · `pt` | UI language of the bars and popups. Without it: Portuguese if the browser prefers it, otherwise English. |
| `manual-init` | boolean | Do not initialize on connect; call `initialize()` yourself (offline use). |
| `layout` | `legacy` | Use the previous canvas layout instead of the Word-fidelity engine. The editor also falls back to it on its own if the engine fails on a document. |

## Loading and saving

| Method | Description |
|---|---|
| `load(bytes, format = 'auto', { protected })` | Opens .docx, .doc (converted) or .odt; `'auto'` detects the format. .docx opens protected (read-only) unless `protected: false`. |
| `newDocument()` | Empty A4 document. |
| `save(format = 'auto', { images, title })` | `'docx'` · `'odt'` · `'pdf'` · `'xps'` → `Uint8Array`; `'html'` · `'markdown'` → `string`. `'auto'` = the format that was loaded. |
| `print()` | Browser print dialog with the pages (call from a user gesture). |
| `isProtected()` · `enableEditing()` | Protected View. `uw-protected` reports changes. |

## Editing API

| Area | Methods |
|---|---|
| Characters | `toggleRunProp('bold' \| 'italic' \| 'underline' \| 'strike' \| 'allCaps' \| 'smallCaps')`, `toggleVertAlign('superscript' \| 'subscript')`, `setFontFamily(name)`, `setFontSize(pt)`, `growFont(±1)`, `setColor(hex)`, `setHighlight(name)`, `setLink(url)`, `setCharSpacing(twips)`, `changeCase('upper' \| 'lower')`, `clearFormatting()` |
| Paragraphs | `applyStyle(styleId)`, `paragraphStyles()`, `setAlignment('left' \| 'center' \| 'right' \| 'both')`, `toggleList('bullet' \| 'decimal')`, `indent(±1)`, `setLineSpacing(line)`, `setSpaceBefore(twips)`, `setSpaceAfter(twips)`, `setSpecialIndent(...)`, `setIndentRight(twips)`, `setShading(hex)`, `toggleBorder()` |
| Format painter | `copyFormat()`, `painterActive()` |
| Insert | `insertImage(bytes, ext)`, `insertPageBreak()`, `insertField('PAGE' \| 'NUMPAGES' \| 'DATE')`, `updateToc()` |
| Page | `setPageSetup({ orientation, size: 'A4' \| 'Letter', margins: 'normal' \| 'narrow' \| 'wide', customMargins })` |
| Edit | `undo()`, `redo()`, `cut()`, `copy()`, `paste()`, `pastePlain()`, `pasteText(text)`, `selectAll()`, `selectedText()` |
| Find | `findNext(text)`, `replaceAll(text, replacement)` (case-insensitive) |
| Comments | `getComments()`, `addComment(text, author)`, `removeComment(id)`, `goToComment(id)` |
| Headers/footers | `enterHeaderFooter('header' \| 'footer')`, `exitHeaderFooter()` |
| View | `setView('print' \| 'web' \| 'read' \| 'draft' \| 'outline')`, `getView()`, `setZoom(z)`, `getZoom()`, `toggleMarks()`, `setDarkPage(dark)`, `navigateTo('#bookmark')` |
| State | `stats()` → `{ pages, words, chars, page, paragraph }`, `getSelectionState()`, `currentPage()`, `focusEditor()` |

## Events

| Event | `detail` | When |
|---|---|---|
| `uw-ready` | `{ offline, plugins }` | Initialization finished. |
| `uw-change` | — | The document is about to change (fired before the edit is applied — read the new state on the next frame). |
| `uw-protected` | `{ active, hasFields }` | Protected View turned on or off. |
| `uw-blocked` | `{ reason: 'protected' }` | Header/footer editing was refused because the document is protected. |
| `uw-zoom` | `{ zoom }` | Zoom changed. |
| `uw-hfmode` | `{ active, kind }` | Entered or left header/footer editing. |
| `uw-before-input` | `{ text }` | Text is about to be typed. **Cancelable.** |
| `uw-input` | `{ text }` | Text was typed. |
| `uw-comments-changed` | — | A comment was added or removed. |
| `uw-comment-click` | `{ ids }` | Commented text was clicked. |
| `uw-font-embedding` | `{ embedded, skipped }` | After saving a .docx with font embedding on. |
| `uw-plugin-added` · `uw-plugin-removed` | `{ id }` | Plugin lifecycle. |
| `uw-custom-inline-inserted` | `{ type, data, fallbackText }` | A plugin inline was inserted. |

## Fonts

**Liberation Sans (four variants) is required** — it is the default font and
the substitute of last resort. With the `fonts` attribute, the editor fetches
`liberationsans-regular.ttf`, `-bold`, `-italic` and `-bolditalic` from that
folder; the package's `fonts/` has them.

Other families resolve, in order: fonts embedded in the document → fonts the
host provides → the browser's installed fonts (with their files, via Local
Font Access in Chromium, after `requestSystemFonts()` in a user gesture) →
**metric-compatible open substitutes** from `fonts/` (Calibri → Carlito,
Cambria → Caladea, Arial → Liberation Sans, Times New Roman → Liberation
Serif, Courier New → Liberation Mono) → Liberation Sans. The editor measures
and embeds only fonts whose file it has, so the screen and the PDF always
match.

Offline, without any network request:

```html
<universal-write id="editor" manual-init></universal-write>
```

```js
await editor.initialize({
  fonts: [
    { family: 'Liberation Sans', variant: 'regular',    data: regular },
    { family: 'Liberation Sans', variant: 'bold',       data: bold },
    { family: 'Liberation Sans', variant: 'italic',     data: italic },
    { family: 'Liberation Sans', variant: 'boldItalic', data: boldItalic },
  ],
  document: { bytes: docxBytes, format: 'docx', protected: false },
});
```

`FontResolver` is exported for desktop shells that supply the OS fonts
(`FontResolver.shared().configure({ baseUrl, host })`). Embedding fonts in the
saved file: `getFontEmbedding()` / `setFontEmbedding({ embed, subset,
skipCommonFonts })`.

## Plugins

`editor.use(plugin)` registers custom inline content that is measured and
painted by the layout engine and saved to .docx as a locked content control
(other formats get its fallback text). The bundled mention plugin:

```js
import { createMentionPlugin } from '@universal-office-pro/write';

editor.use(createMentionPlugin({
  source: async (query) => (await fetch(`/people?q=${query}`)).json(), // [{ id, label }]
}));
```

Type `@` to open the suggestions (only when `source` is given).

## Keyboard

Ctrl/⌘ + B · I · U (format), Z · Y (undo, redo), A (select all), E · L · R · J
(alignment), C · X · V (clipboard), Shift+V (paste plain text), Enter (page
break), ← → (word), Home · End (document). Tab / Shift+Tab move between table
cells and list levels. Ctrl+wheel zooms; Ctrl+click follows a link;
double-click the top or bottom margin to edit the header or footer.

## License

Free for non-commercial use. See LICENSE / the PrivJS listing for terms.
