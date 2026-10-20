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
- Optional built-in bars: a compact toolbar (default)
  or a ribbon with tabs, plus a status bar; English and Portuguese UI
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
| `topbar` | boolean | Built-in top bar with menus, find/replace, comments beside the page, open/save, autosave, Protected View and drag and drop (see [Built-in bars](#built-in-bars)). |
| `toolbar` | `compact` · `ribbon` | Style of the top bar: `compact` (default — menu bar + one toolbar row that collapses by priority, like Google Docs) or `ribbon` (tabs and groups, like Word). |
| `bottombar` | boolean | Built-in status bar: page/word count, view buttons, zoom. |
| `theme` | `auto` · `light` · `dark` · `black` | Opt-in Material theme for the bars, scoped to the element (`black` also darkens the page). Without it — and without a choice in View › Theme — the element inherits `color-scheme` and the `--u-color-*` tokens from the page. |
| `accent` | `blue` · `teal` · `green` · `amber` · `red` · `purple` · `neutral` | Accent color of the opt-in theme. |
| `storage-key` | string | Remembers this instance's bar choices (toolbar style, theme, comments, autosave interval) in `localStorage`. Falls back to `id`; with neither, choices last only for the session. |
| `noautosave` | boolean | No autosave and no "autosave pending" notice. |
| `nounloadprompt` | boolean | No browser "leave page?" prompt for unsaved changes. |
| `nospellcheck` | boolean | No spell checking (no red squiggles, no suggestions). |
| `lang` | `en` · `pt` | UI language of the bars and popups. Without it: Portuguese if the browser prefers it, otherwise English. |
| `manual-init` | boolean | Do not initialize on connect; call `initialize()` yourself (offline use). |
| `layout` | `legacy` | Use the previous canvas layout instead of the Word-fidelity engine. The editor also falls back to it on its own if the engine fails on a document. |

## Built-in bars

`topbar` turns the element into a complete editor — nothing to wire:

- **Compact** (`toolbar="compact"`, default): File · Edit · View · Insert ·
  Format · Tools · Help menus and one toolbar row; when space runs out, the
  lowest-priority groups collapse into their own buttons and then into "⋮",
  and the menus into "☰".
- **Ribbon** (`toolbar="ribbon"`): quick access toolbar, File menu, Home ·
  Insert · Design · Layout · References · Mailings · Review · View tabs,
  groups with dialog launchers (Font, Paragraph, Page Setup) and contextual
  tabs (Header & Footer while editing them; Table and Picture as soon as the
  editor exposes their commands).
- Both: find and replace, comments as cards beside the page, link/comment
  dialogs, font and paragraph dialogs, word count, theme (automatic, light,
  dark, dark page) and accent color, focus mode (full screen) and read mode,
  context menu, drag and drop of .docx/.odt, autosave (with a file opened
  through the File System Access API), recent files, Protected View with
  trusted documents and the "update fields" prompt, "Compare with…" and
  "Fonts in the file…".
- A command whose API the editor does not have yet stays hidden, so new
  editor features only need the method to show up in the bars.

Theme the bars with CSS variables on the element: `--uw-font` (UI font),
`--uw-desk` (background behind the pages), `--uo-bar-bg`,
`--uo-bar-container`, `--uo-accent`, `--uo-menu-bg`, `--uo-hover-bg`. Parts:
`toolbar`, `titlebar`, `menubar`, `toolrow`, `tabs`, `ribbon`, `menu`,
`popover`, `dialog`, `find`, `comments`, `statusbar`, `protected-bar`,
`compare`.

What only the host application can do comes in through the optional
`editor.host` object (an Electron shell, for example); without it the bars use
the browser (File System Access, downloads, `beforeunload`):

```js
editor.host = {
  openFile: () => bridge.open(),            // → { name, bytes, motw? } | null
  openFileForCompare: (title) => bridge.open(title),
  saveFile: (bytes, { name, format, saveAs }) => bridge.save(bytes, name), // → saved name | null
  listFonts: bridge.listFonts, resolveFonts: bridge.resolveFonts,           // OS fonts
  setDirty: (dirty, name) => bridge.setDirty(dirty, name),                  // confirm on close
  onSaveBeforeClose: (cb) => bridge.onSaveBeforeClose(cb),
  closeWindow: () => bridge.close(),
  setTitleTheme: (dark) => bridge.setTitleTheme(dark),
  setTitle: (title) => { document.title = title; },
  windowControlsOverlay: true, // frameless window: reserve the OS window buttons
};
```

`openDocument(editor, bytes, name, { motw })` (exported) opens a document the
way File › Open does: title, recent files and Word's Protected View rule.

When the page saves and opens documents itself, handle the cancelable
`uw-save-request` (`detail: { saveAs, format }`) and `uw-open-request` events
and call `preventDefault()`: the bars then do nothing for those actions (menu,
button, Ctrl+S / Ctrl+O), and after the first handled save request they also
drop autosave and the leave-page prompt — saving belongs to the host.

App shortcuts (Ctrl+O, S, Shift+S, P, F, H) also work while focus is on the
page body, for the last focused `<universal-write topbar>` (or the only one),
never while typing in another element's field. Removing the element from the
document tears the bars down completely (timers and window/document
listeners); putting it back rebuilds them.

## Spelling

Words are checked as you type with Hunspell (open LibreOffice dictionaries:
pt-BR and en-US, loaded on demand) in a Web Worker, by the language of each
run (`w:lang`, then character style, paragraph style and document defaults;
`w:noProof` is skipped). Misspellings get a red squiggle on screen only (never
in PDF, print or the viewer); right-click one for suggestions, **Ignore All**
and **Add to Dictionary** (kept in `localStorage`). **Tools › Spelling & grammar**
(F7) walks through the errors. Languages without a dictionary are not checked.

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
| Spelling | `spellCheckEnabled()`, `toggleSpellCheck(on?)`, `spellingAtCaret()`, `spellingSuggestions(m)`, `replaceSpelling(m, text)`, `ignoreSpelling(word)`, `addToDictionary(word)`, `nextMisspelling()` |
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
| `uw-save-request` | `{ saveAs, format }` | The bars are about to save. **Cancelable** — `preventDefault()` = the host saves. |
| `uw-open-request` | — | The bars are about to show an open dialog. **Cancelable** — `preventDefault()` = the host opens. |
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
break), ← → (word), Home · End (document). With `topbar`, also O (open), S ·
Shift+S (save, save as), P (print), F · H (find, replace), K (link), D (font
dialog), ] · [ (font size), F7 (spelling), Alt+M (comment), Shift+8 (formatting marks), / (shortcuts). Tab / Shift+Tab move between table
cells and list levels. Ctrl+wheel zooms; Ctrl+click follows a link;
double-click the top or bottom margin to edit the header or footer.

## License

Free for non-commercial use. See LICENSE / the PrivJS listing for terms.
