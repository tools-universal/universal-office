# @universal-office/write

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
  or a ribbon with tabs, plus a status bar; English, Portuguese and Spanish UI
- Plugins for custom inline content (e.g. @mentions)

Just want to edit documents? The same editor is **Universal Write (Beta)** in the
ready-to-run desktop app **Universal Office (Beta)** — Write, Sheet and Slides in
one install — for Windows, macOS and Linux:
[download it from the releases page](https://github.com/erichideyuki/universal-office/releases/tag/v0.9.2).

## Installation

```bash
npm install @universal-office/write
```

All the code is inside the package; its only dependency is
`@universal-office/font-files` (pinned to an exact version), the open fonts. Serve these
paths:

| Path | What it is |
|---|---|
| `index.js` | The editor (registers `<universal-write>` on import) |
| `viewer.js` | Only the read-only viewer (registers `<universal-document-viewer>`; see [The viewer entry](#the-viewer-entry)) |
| `chunks/` | Parts loaded on demand (toolbar, hyphenation patterns, rare converters) and the code shared by the two entries |
| `@universal-office/font-files` | Open fonts — **Liberation Sans is required** (see [Fonts](#fonts)). Point the `fonts` attribute at this package's folder. |

```js
import '@universal-office/write';
```

```html
<universal-write id="editor" fonts="/node_modules/@universal-office/font-files" topbar bottombar
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

Spell checking is optional and comes in separate packages (the engine and one
package per language) — see [Spelling](#spelling).

Loading the component from a static folder instead of a bundler: copy each
package to its own subfolder, named as in the npm scope, and import the
entry by URL:

```
/vendor/universal-office/
  write/                index.js, viewer.js, chunks/, …
  font-files/           *.ttf, LICENSE-*.txt
  spellcheck/           index.js   (optional)
  dictionary-pt-br/     index.js   (optional, one folder per language)
```

```html
<script type="module" src="/vendor/universal-office/write/index.js"></script>
<universal-write fonts="/vendor/universal-office/font-files"
  spellcheck-url="/vendor/universal-office"></universal-write>
```

### The viewer entry

`@universal-office/write/viewer` registers only `<universal-document-viewer>`,
the read-only viewer, without loading the editor; it shares its code with the
editor (in `chunks/`), so a page that uses both downloads it once. It is the
same component as the standalone `@universal-office/document-viewer` package —
see that package's README for its attributes and API.

```js
import '@universal-office/write/viewer';   // types: viewer.d.ts
```

Without a `fonts` attribute the viewer looks for the fonts in the sibling
`font-files/` folder (`node_modules/@universal-office/font-files/`, or
`/vendor/universal-office/font-files/` in the layout above).

## Attributes

| Attribute | Values | Description |
|---|---|---|
| `fonts` | URL | Folder with the font files: the `@universal-office/font-files` package. Read at initialization. |
| `src` | URL | Document opened at initialization (in Protected View, like Word). |
| `topbar` | boolean | Built-in top bar with menus, find/replace, comments beside the page, open/save, autosave, Protected View and drag and drop (see [Built-in bars](#built-in-bars)). |
| `toolbar` | `compact` · `ribbon` | Style of the top bar: `compact` (default — the document title above the menu bar + one toolbar row that collapses by priority, like Google Docs) or `ribbon` (tabs and groups, like Word). |
| `bottombar` | boolean | Built-in status bar: page/word count, view buttons, zoom. |
| `theme` | `auto` (default) · `light` · `dark` · `black` | Light or dark UI. `auto` — or no attribute — follows the CSS `color-scheme` the element inherits from the page (see [Light and dark](#light-and-dark)); `light`/`dark` force it; `black` is dark with a dark page. Any value set here also selects the element's own Material palette. |
| `accent` | `blue` · `teal` · `green` · `amber` · `red` · `purple` · `neutral` | Accent color of the element's own palette (setting it uses that palette even when the page has `--u-color-*` tokens). |
| `storage-key` | string | Remembers this instance's bar choices (toolbar style, theme, comments, autosave interval) in `localStorage`. Falls back to `id`; with neither, choices last only for the session. |
| `noautosave` | boolean | No autosave and no "autosave pending" notice. |
| `nounloadprompt` | boolean | No browser "leave page?" prompt for unsaved changes. |
| `nospellcheck` | boolean | No spell checking (no red squiggles, no suggestions). |
| `spellcheck-url` | URL | Folder with the spell checking packages, one subfolder each: the engine in `<url>/spellcheck/index.js`, each dictionary in `<url>/dictionary-<language>/index.js` (see [Spelling](#spelling)). Applies to the whole page. Also the `spellcheckUrl` property. |
| `spellcheck-languages` | language tags | With `spellcheck-url`: the dictionaries present in that folder (comma- or space-separated, e.g. `pt-BR en-US`). Default: all published dictionaries. |
| `spellcheck-default-lang` | language tag | Language of text whose language the document doesn't say (no `w:lang` on the run, its styles or the document defaults), e.g. the host app's UI language. A new document (`newDocument()`) is also created in it, as Word does with the editing language. Default: `pt-BR`. Also the `spellcheckDefaultLang` property. |
| `lang` | `en` · `pt` · `es` | UI language of the bars and popups (any region: `es-MX`, `es-419`… → Spanish). Without it: the first of Spanish/Portuguese/English the browser prefers (`es-*` → Spanish, `pt-*` → Portuguese), otherwise English. |
| `author` | string | Name recorded on tracked changes and new comments. Without it the bars use the host's user name (Electron: the OS user) or ask once and remember the answer; the bare API falls back to "Author"/"Autor". |
| `manual-init` | boolean | Do not initialize on connect; call `initialize()` yourself (offline use). |
| `hidden-commands` | ids | Commands, menus, groups, tabs and bar controls to hide (comma- or space-separated), everywhere: bars, menus, context menu and shortcuts — like CKEditor's `toolbar.removeItems`. Also the `hiddenCommands` property. Example: `hidden-commands="file title save print hf comment tracking"`. |
| `layout` | `legacy` | Use the previous canvas layout instead of the Word-fidelity engine. The editor also falls back to it on its own if the engine fails on a document. |
| `formatting-policy` | `template-document` | What the user may format, by preset name (see [Formatting policy](#formatting-policy)). The `formattingPolicy` property takes any policy object and, once set, wins over the attribute. |
| `nofiledrop` | boolean | The editor never opens or inserts dropped files (the cancelable `uw-file-drop` still fires, so the host can run its own flow). Also the `fileDropDisabled` property. See [Dropped files](#dropped-files). |

## Built-in bars

`topbar` turns the element into a complete editor — nothing to wire:

- **Compact** (`toolbar="compact"`, default): the document title (editable)
  above the File · Edit · View · Insert · Format · Tools · Help menus, and one
  toolbar row; when space runs out, the
  lowest-priority groups collapse into their own buttons and then into "⋮",
  and the menus into "☰".
- **Ribbon** (`toolbar="ribbon"`): quick access toolbar, File menu, Home ·
  Insert · Design · Layout · References · Mailings · Review · View tabs,
  groups with dialog launchers (Font, Paragraph, Page Setup) and contextual
  tabs (Header & Footer while editing them; Table Design and Table Layout
  inside a table; Picture as soon as the editor exposes its commands). The Styles group is a **gallery** of
  thumbnails drawn with each style's real formatting (scroll by row, expand,
  right-click to update, modify, rename or remove from the gallery); its
  launcher opens the **Styles pane**.
- Both: the **Navigation Pane** (Ctrl+F; see [Navigation](#navigation)), the
  **rulers** and **gridlines** (View › Show), find and replace (Ctrl+H),
  comments and revision balloons as cards beside the
  page, Track Changes (Review tab; Tools › Track Changes), the Reviewing Pane, link/comment
  dialogs, font and paragraph dialogs, word count, theme (automatic, light,
  dark, dark page) and accent color, focus mode (full screen) and read mode,
  context menu, drag and drop of .docx/.odt, autosave (with a file opened
  through the File System Access API), recent files, Protected View with
  trusted documents and the "update fields" prompt, "Compare with…" and
  "Fonts in the file…". Styles: the Styles pane (filter, sort, preview, apply,
  per-style menu), the Create/Modify Style dialog and the Style Inspector
  (Format › Styles in the compact bar).
- A command whose API the editor does not have yet stays hidden, so new
  editor features only need the method to show up in the bars.

### Light and dark

The element follows the **CSS `color-scheme` of its context** — the value it
inherits from the page (it crosses the shadow DOM). Every color in the bars,
menus, dialogs, popovers, rulers, panes, status bar and the desk is a
`--u-color-*` token or a `light-dark()` color, so the switch is pure CSS and
happens live, without reloading:

- `@universal-material` pages work as they are: `:root { color-scheme: light dark }`
  follows the OS, and the `u-light` / `u-dark` classes on `body` (or any
  ancestor) set `color-scheme: light` / `dark`. The element does **not** look
  for those classes — only at the resulting `color-scheme`.
- With no `color-scheme` anywhere the browser's default applies (`normal` =
  light); `color-scheme: light dark` follows the OS.
- `theme="light"` / `theme="dark"` force it (the element sets `color-scheme`
  on itself); `theme="auto"` or no attribute inherits. The View › Theme menu
  does the same when there is no attribute.
- Colors: without `theme`/`accent` and without a choice in the menu, the bars
  use the page's `--u-color-*` tokens when it defines them (an
  `@universal-material` app keeps its own palette); otherwise the element's
  palette for `accent` (blue by default).
- **The page stays white in dark mode** (fidelity to the document, like Word
  and Google Docs with a light page). `theme="black"` (View › Theme › Black)
  or `setDarkPage(true)` paints the page dark as well.

`editor.effectiveTheme` (`'light'` · `'dark'`) tells the theme in effect and
`uw-theme-change` (`detail: { theme }`) fires when it changes — for a host
that paints something of its own. The element reads it from a probe in its
shadow root (`color: light-dark(…)`, a 1 ms transition and `matchMedia`; no
polling, no class observers) and drops all listeners on disconnect.

### One background color

Like Google Docs and Drive, the desk behind the pages, the top and bottom
bars, the rulers and the side panes share **one** background color; only the
page — and what floats (menus, dialogs, comment cards) — differs. Separators
are thin borders, not other shades:

```css
universal-write { --uw-background: #f8fafd; } /* one variable for all of it */
```

The default is `--u-color-surface-container-low` (`#f5f3f7` light /
`#1b1b1f` dark in the blue palette): one step below the white page in light
mode, so the sheet stands out without a heavy shadow, and slightly lifted from
the darkest surface in dark mode, so menus and the toolbar pill still read as
raised. The rounded toolbar pill (and the ribbon body) keeps a light accent
tone (`--u-color-surface-container`; `-high` in dark), as in Google Docs, to
group the tools.

Other CSS variables on the element: `--uw-font` (UI font), `--uw-desk` (only
the desk) and `--uo-bar-bg` (only the bars, rulers and panes) — both still
win over `--uw-background` —, `--uo-bar-container` (the toolbar pill),
`--uo-accent`, `--uo-menu-bg`, `--uo-hover-bg`. Parts:
`toolbar`, `titlebar`, `menubar`, `toolrow`, `tabs`, `ribbon`, `menu`,
`popover`, `dialog`, `find`, `comments`, `review-pane`, `navigation-pane`, `ruler`
(`ruler-h` · `ruler-v`), `statusbar`, `protected-bar`, `compare`.

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
  userName: () => bridge.userName(),        // author of tracked changes and comments
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

## Formatting policy

For documents whose look comes from a **template** — styles, fonts, spacing,
borders and page setup are the template's job, not the text's — the host gives
the editor a formatting policy, like Quill's `formats` whitelist. Whatever the
policy leaves out disappears from the bars, menus, context menu, galleries,
dialogs and keyboard shortcuts (the same mechanism as `hidden-commands`), the
editing API ignores it (`setFontFamily`, `applyStyle('Heading5')`, Ctrl+Shift+D…
do nothing) and **paste** converts or drops it. Content already in the document
is never touched: loading and saving do not filter anything.

```js
import { TEMPLATE_DOCUMENT_POLICY } from '@universal-office/write';

editor.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;   // or <universal-write formatting-policy="template-document">
editor.formattingPolicy = { ...TEMPLATE_DOCUMENT_POLICY, tables: false, lists: { kinds: ['bullet'], levels: 3 } };
editor.formattingPolicy = null;                       // no policy: everything
```

`FormattingPolicy` (every field optional; a missing field means allowed):

| Field | Type | What it controls |
|---|---|---|
| `paragraphStyles` | `string[]` | Paragraph styles the user may apply (gallery, style menus, Alt+1…3, paste). By id or by the style's internal English name, ignoring case and spaces: `Normal`, `Title`, `Subtitle`, `Heading1` (= "heading 1") — so a Portuguese document whose ids are `Ttulo1` matches by name. |
| `characterStyles` | `string[]` | Character styles the user may apply. With `paragraphStyles` set and this missing: none. |
| `lists` | `{ kinds: ('bullet' \| 'decimal')[], levels?: 1–9 }` | Only the Bullets and Numbering buttons with the default formats (• o ▪ / 1. a. i.); the bullet/numbering libraries, the document's and the template's lists, multilevel lists and Define New… disappear; Tab/Increase Indent stop at `levels`. |
| `character` | `CharacterFormat[]` | `bold`, `italic`, `underline`, `underlineStyles` (double, wavy…, underline color), `strike`, `doubleStrike`, `superscript`, `subscript`, `color`, `highlight`, `link`, `caps` (All Caps, Small Caps), `hidden`, `charSpacing`, `textEffects` (outline, shadow, glow, gradient, OpenType, drop cap). |
| `font` · `fontSize` | boolean | Font family · size (also Grow/Shrink Font and the Font dialog). |
| `alignment` | boolean | Left, center, right, justify. |
| `indentation` | `true` · `'steps'` · `false` | All indents · only Increase/Decrease Indent (Quill's `indent`) · none. |
| `spacing` | boolean | Line and paragraph spacing and the paragraph's pagination options. |
| `borders` · `shading` · `tabs` | boolean | Paragraph borders and horizontal line · paragraph shading · tab stops. |
| `styleEditing` · `formatPainter` | boolean | Create/modify/rename/delete styles (Styles pane, Style Inspector) · Format Painter. |
| `pageSetup` · `pageBackground` · `headersFooters` | boolean | Margins, orientation, paper size, ruler, line numbers and hyphenation · page color, watermark, page borders · headers, footers and page numbers. |
| `columns` · `pageBreaks` · `sectionBreaks` | boolean | Columns · page and column breaks (and Blank Page) · section breaks. |
| `tables` · `images` · `imageFormatting` · `shapes` | boolean | Insert tables · insert pictures (also paste and drop) · picture styles, borders, effects, crop, adjustments, wrapping and position · shapes, text boxes and cover pages. Existing tables, pictures and shapes stay editable. |

### The template-document preset

`TEMPLATE_DOCUMENT_POLICY` (attribute value `template-document`) behaves like a
lightweight rich-text editor (such as Quill) for documents whose look comes from a
template: the template defines Normal, Heading 1–3, Title, Subtitle and the
bullet/numbered list paragraphs, and the text only keeps direct emphasis:

| Allowed | Not allowed |
|---|---|
| Styles Normal, Heading 1, Heading 2, Heading 3, Title, Subtitle (a typical rich-text heading selector) | Other styles; editing styles; style-driven content (table of contents, captions, table of figures) |
| Bulleted and numbered lists, 9 levels | Other list formats, list galleries, multilevel lists |
| Bold, italic, underline, strikethrough, font color, highlight, links | Font, size, superscript/subscript, underline styles, double strikethrough, caps, character spacing, text effects |
| Alignment; Increase/Decrease Indent | Special/exact indents, ruler, spacing, borders, shading, tabs, Format Painter |
| Pictures (the template sizes them), tables, columns, page breaks | Picture formatting, shapes/text boxes/cover pages, section breaks, page setup, page background, headers and footers |

### Paste under a policy

Paste follows the policy for every source — the editor's own copy (same or another
document), HTML from browsers and Word, and plain text (which takes the destination's
formatting anyway). As Word does with content it does not know, the content stays and
what is not allowed goes:

- **Styles**: a style that is not allowed becomes the nearest allowed one — Heading N
  becomes the deepest allowed heading at or above it (Heading 5–9 → Heading 3 with the
  preset), Title → Heading 1 when Title is not allowed, anything else → Normal. Word's
  HTML headings (`h1`–`h6`, `MsoHeading7…9`), Title and Subtitle (`MsoTitle`,
  `MsoSubtitle`) map to the styles of the same name first; HTML body text (Normal (Web))
  becomes Normal.
- **Characters**: font, size and the other formats outside `character` are dropped
  (double strikethrough becomes single when strikethrough is allowed); the run keeps
  what is allowed.
- **Paragraphs**: alignment, indents, spacing, pagination, borders, shading, tabs,
  outline level and section breaks are dropped as the policy says (with
  `indentation: 'steps'` a left indent is kept rounded to 0.5" steps).
- **Lists** of any format (roman, letters, multilevel, the template's, Word's `mso-list`
  paragraphs) become bulleted or numbered lists with the default formats, within the
  allowed levels; when only one kind is allowed, the other kind becomes it.
- **Tables** stay tables (their cells follow the same rules) or, with `tables: false`,
  their cells become paragraphs. **Pictures** and **shapes** that are not allowed are
  dropped.
- **Plugin inlines** (`editor.use`, saved as locked content controls) copied inside the
  editor paste as inlines again (also into another instance that registered the same
  type); from anywhere else they arrive as their fallback text.

## Dropped files

Every file dropped on the element first fires the cancelable `uw-file-drop`
(`detail: { files, clientX, clientY }`), before the editor does anything with it.
`preventDefault()` hands the files to the host — e.g. to replace the document after
asking:

```js
editor.addEventListener('uw-file-drop', async (e) => {
  const file = e.detail.files[0];
  if (!/\.docx$/i.test(file.name)) return;          // let the editor handle it
  e.preventDefault();
  if (await confirmReplace(file.name)) editor.load(new Uint8Array(await file.arrayBuffer()));
});
```

Not canceled, the editor inserts dropped pictures (PNG, JPEG, GIF, BMP, WebP) at the drop
point when the document is editable and the formatting policy allows `images`; with
`topbar`, a dropped .docx/.odt/.doc opens. With the `nofiledrop` attribute the editor
never opens or inserts dropped files (the event still fires) and the browser never
navigates to them.

## Spelling

Words are checked as you type with Hunspell (open LibreOffice dictionaries) in
a Web Worker, by the language of each run (`w:lang`, then character style,
paragraph style and document defaults, else `spellcheck-default-lang` — `pt-BR`
by default; `w:noProof` is skipped). Misspellings
get a red squiggle on screen only (never in PDF, print or the viewer);
right-click one for suggestions, **Ignore All** and **Add to Dictionary** (kept
in `localStorage`). **Tools › Spelling & grammar** (F7) walks through the
errors. Languages without a dictionary are not checked.

The engine and the dictionaries are **separate, optional packages** — this
package does not depend on them:

| Package | What it is |
|---|---|
| `@universal-office/spellcheck` | Hunspell 1.7.2 in WebAssembly (1.1 MB) |
| `@universal-office/dictionary-pt-br` | Brazilian Portuguese (5.5 MB) |
| `@universal-office/dictionary-en-us` | American English (540 KB) |
| `@universal-office/dictionary-es` | Spanish, one dictionary for all variants (865 KB) |

```bash
npm install @universal-office/spellcheck @universal-office/dictionary-pt-br @universal-office/dictionary-en-us @universal-office/dictionary-es
```

Tell the editor where they are, in one of two ways. Either way nothing is
downloaded until it is needed: the engine on the first check, a dictionary on
the first text in its language.

- **With a bundler**, register lazy loaders (once per page):

  ```js
  import { registerSpellcheck, registerDictionary } from '@universal-office/write';

  registerSpellcheck(() => import('@universal-office/spellcheck'));
  registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br'));
  registerDictionary('en-US', () => import('@universal-office/dictionary-en-us'));
  registerDictionary('es', () => import('@universal-office/dictionary-es'));
  ```

- **From a static folder** (the component loaded by URL), copy each package to
  `<base>/<name without the scope>/` and set `spellcheck-url="<base>"`: the
  editor imports `<base>/spellcheck/index.js` and
  `<base>/dictionary-pt-br/index.js` (`<base>/dictionary-es/index.js` for
  Spanish). List the dictionaries you copied with `spellcheck-languages`
  (e.g. `spellcheck-languages="pt-BR en-US es"`) so a missing one is never requested. From script:
  `configureSpellcheck({ baseUrl: '/vendor/universal-office', languages: ['pt-BR'] })`.

A dictionary is chosen by language tag: the exact one, else another variant of
the same language (`pt-PT` → pt-BR, `en-GB` → en-US, `es-MX`/`es-419`/`es-ES` →
es). `registerDictionary` also
takes your own Hunspell dictionaries (`() => Promise<{ aff, dic }>`, UTF-8 or
ISO8859-1). The registration is per page and may happen after the editor is
created — it starts checking then. Without the engine or a dictionary, or if
one fails to load, there is no spell checking and no error; the Spelling
commands just find nothing.

## Track changes

With **Track Changes** on (Review › Track Changes, Ctrl+Shift+E), typing,
deleting, Enter and formatting become revisions with author and date, exactly
as Word writes them (`w:ins`, `w:del`, `w:rPrChange`, `w:pPrChange`, paragraph
marks; checked against Word 365 operation by operation). Your own insertions
disappear when deleted; other authors' text stays, struck through. The state is
saved in the .docx (`w:trackRevisions`), so a document opens the way it was
saved, and revisions written by Word open as revisions.

**Display for Review** has Word's four modes: **Simple Markup** (final text and
red change bars), **All Markup** (default: insertions underlined and deletions
struck in each author's color, black change bars, formatting changes in
balloons beside the page), **No Markup** and **Original**. **Show Markup** picks
the types (insertions and deletions, formatting, comments), the balloons
(revisions in balloons, all inline, only comments and formatting) and specific
people. PDF export and printing follow the mode on screen, without the balloon
area. The **Reviewing Pane** (vertical or horizontal) lists every revision with
counts by type; click to go there, ✓/✗ to accept or reject. Accept and Reject
work on the selection or the revision at the cursor and move to the next one,
like Word; their menus also have *This Change*, *All Changes Shown*, *All
Changes* and *All Changes and Stop Tracking*.

Not yet: list numbering changes in All Markup (Word shows the old number struck
next to the new one), table/cell/section property revisions (kept as they are),
and moves created by editing (cut and paste becomes a deletion plus an insertion).

## Loading and saving

| Method | Description |
|---|---|
| `load(bytes, format = 'auto', { protected })` | Opens .docx, .doc (converted) or .odt; `'auto'` detects the format. The bytes come from the host, so the document opens **editable**; `protected: true` opens it in Protected View (the `src` attribute and File › Open keep deciding by Mark-of-the-Web / Trusted Documents). |
| `newDocument()` | Empty A4 document with Word's blank-document styles, theme and settings (Normal, headings, quotes… and the built-in styles applied on first use). |
| `save(format = 'auto', { images, title })` | `'docx'` · `'odt'` · `'pdf'` · `'xps'` → `Uint8Array`; `'html'` · `'markdown'` → `string`. `'auto'` = the format that was loaded. |
| `print()` | Browser print dialog with the pages (call from a user gesture). |
| `isProtected()` · `enableEditing()` | Protected View. `uw-protected` reports changes. |

### State and content

For hosts that validate and save the document themselves.

| Method | Description |
|---|---|
| `isEmpty()` | No visible content in the body: no text (other than spaces), table, picture, shape, plugin inline or note. Text boxes count by their content. |
| `isDirty()` · `setDirty(dirty)` | Changed since the document was loaded or since `setDirty(false)` (like TinyMCE's `isDirty()`/`setDirty()`). Every change counts — edits, undo/redo, Update Field/Table of Contents (which do not fire `uw-change`) and options saved in the file, such as font embedding. Undo does not make it clean again; the bars' Save marks it clean. `uw-dirty-change` reports the transitions. |
| `getLinks()` | Hyperlinks of the body in document order: `{ address }` (external) or `{ anchor }` (bookmark), plus the visible `text` (neighbor runs with the same target are joined). |
| `getCustomInlines(type?)` | Plugin inlines of the body in document order (`{ type, data, fallbackText }`), all of them or of one type — e.g. to tell which linked items a document uses. |
| `repaint()` | Repaints the pages without a new layout — call it when state read by a plugin renderer changes (e.g. a link whose target was removed). |

## Editing API

| Area | Methods |
|---|---|
| Characters | `toggleRunProp('bold' \| 'italic' \| 'underline' \| 'strike' \| 'allCaps' \| 'smallCaps')`, `toggleVertAlign('superscript' \| 'subscript')`, `setFontFamily(name)`, `setFontSize(pt)`, `growFont(±1)`, `setColor(hex)`, `setHighlight(name)`, `setLink(url)`, `setCharSpacing(twips)`, `changeCase('upper' \| 'lower')`, `clearFormatting()` |
| Paragraphs | `applyStyle(styleId)`, `paragraphStyles()`, `setAlignment('left' \| 'center' \| 'right' \| 'both')`, `toggleList('bullet' \| 'decimal')`, `indent(±1)`, `setLineSpacing(line)`, `setSpaceBefore(twips)`, `setSpaceAfter(twips)`, `setSpecialIndent(...)`, `setIndentRight(twips)`, `setShading(hex)`, `toggleBorder()`; indents and tabs: see [Navigation](#navigation) |
| Format painter | `copyFormat()`, `painterActive()` |
| Insert | `insertImage(bytes, ext)`, `insertPageBreak()`, `insertField('PAGE' \| 'NUMPAGES' \| 'DATE')`, `updateToc()` (see [Table of contents](#table-of-contents)) |
| Page | `setPageSetup({ orientation, size: 'A4' \| 'Letter', margins: 'normal' \| 'narrow' \| 'wide', customMargins, sectionStart, verticalAlignment, lineNumbering, applyTo })` — for the section(s) the selection touches (see Text layout for the Layout tab's options); `applyTo`: `'section'` (default) · `'document'` · `'forward'` (next-page section break at the caret) · `'selection'` (breaks before and after the selection). Changing the orientation rotates the margins. |
| Sections and columns | `insertSectionBreak('nextPage' \| 'continuous' \| 'evenPage' \| 'oddPage' \| 'nextColumn')` (splits the paragraph; the new section before the caret copies the current one and takes its headers/footers), `insertColumnBreak()`, `setColumns('one' \| 'two' \| 'three' \| 'left' \| 'right')` (with selected text, only for it) or `setColumns({ count, spaceTwips, widths, sep, applyTo, startNewColumn })`, `getSection()` → `{ index, count, type, orientation, margins, columns, verticalAlignment, lineNumbering }` |
| Edit | `undo()`, `redo()`, `cut()`, `copy()`, `paste()`, `pastePlain()`, `pasteText(text)`, `selectAll()`, `selectedText()` |
| Find | `findNext(text)`, `replaceAll(text, replacement)` (case-insensitive); the Navigation Pane search: `search()` (see [Navigation](#navigation)) |
| Spelling | `spellCheckEnabled()`, `toggleSpellCheck(on?)`, `spellingAtCaret()`, `spellingSuggestions(m)`, `replaceSpelling(m, text)`, `ignoreSpelling(word)`, `addToDictionary(word)` (the user dictionary — `host.userDictionary` `{ load(), save(words) }` keeps it, otherwise the origin's localStorage), `nextMisspelling()` |
| Comments | `getComments()`, `addComment(text, author = this.author)`, `removeComment(id)`, `goToComment(id)` |
| Track changes | `toggleTrackChanges(on?)`, `isTrackingChanges()`, `author` (property), `hasAuthor()`, `acceptChange({ moveNext })`, `rejectChange({ moveNext })`, `acceptAllChanges({ shown, stopTracking })` / `rejectAllChanges(…)` → count, `nextChange()`, `previousChange()`, `getRevisions()` → `{ kind, author, date, dateUtc, text, description, mark, move, story, color }[]`, `acceptRevisionAt(i)`, `rejectRevisionAt(i)`, `selectRevision(i)`, `revisionAtCaret()`, `revisionAuthors()`, `authorColor(name)` |
| Markup | `setMarkupMode('simple' \| 'all' \| 'none' \| 'original')`, `getMarkupMode()`, `setMarkupOptions({ insertionsDeletions, formatting, comments, balloons: 'revisions' \| 'inline' \| 'mixed', authors })`, `getMarkupOptions()` |
| Headers/footers | `enterHeaderFooter('header' \| 'footer')`, `exitHeaderFooter()` — options, galleries and page numbers in [Headers and footers](#headers-and-footers) |
| View | `setView('print' \| 'web' \| 'read' \| 'draft' \| 'outline')`, `getView()`, `setZoom(z)`, `getZoom()`, `toggleMarks()`, `setDarkPage(dark)`, `navigateTo('#bookmark')` |
| State | `stats()` → `{ pages, words, chars, page, paragraph }`, `getSelectionState()`, `currentPage()`, `focusEditor()` |

## Home tab

The Home tab of the built-in bars, as public methods (behavior measured in Word):

```js
// Font: Word's 17 underline styles, theme colors, change case, Font dialog
editor.setFontFormat({ fontFamily: 'Georgia', sizePt: 14, underline: 'wave', underlineColor: 'C00000' });
editor.changeCase('title');

// Lists: the libraries, multilevel lists linked to headings, list styles, picture bullets
editor.applyListLibrary('bullet', 0);
editor.defineListLevel({ picture: { data: pngBytes, ext: 'png' } });

// Clipboard: paste options (Keep Source / Merge / Picture / Keep Text Only), Paste Special,
// the Clipboard pane (24 items)
await editor.paste('merge');

// Text effects and typography (w14): glow, shadow, reflection, outline, gradient fill, OpenType
editor.setTextEffects({ glow: { rad: 63500, color: { scheme: 'accent1', mods: [['alpha', 60000]] } } });
editor.setOpenType({ ligatures: 'standard', numForm: 'oldStyle' });

// Editing: Find and Replace with Word's options, special characters and wildcards; Go To
editor.replaceAllMatches({ text: '(<[A-Z][a-z]@>) (<[A-Z][a-z]@>)', wildcards: true }, '\\2, \\1');
editor.goTo('page', '3');

// Selection: non-contiguous ranges, Select Text with Similar Formatting, Select Objects
editor.selectAllMatches({ text: 'draft', wholeWord: true });
editor.setFontFormat({ bold: true }); // applies to every selected range
```

Find options: `matchCase`, `wholeWord`, `wildcards`, `soundsLike`, `allForms`, `prefix`,
`suffix`, `ignorePunct`, `ignoreSpace`, `format`. Without `matchCase` the new text follows the
case of the found text (as in Word).

## Tables

Tables follow Word's rules (measured against Word): what each operation does
to widths, merges, borders and styles, and what it writes to the file. Every
operation is one undo step, works in nested tables and floating tables, and
is refused in Protected View. A table that was read from the file keeps its
original XML for everything the operation did not touch (rows, cells, content
controls and bookmarks inside it).

| Area | Methods |
|---|---|
| Insert and convert | `insertTable(rows, cols, { autofit: 'fixed' \| 'content' \| 'window', colWidthTwips })`, `convertTextToTable({ separator, cols, autofit })`, `textToTableGuess(separator?, cols?)`, `convertTableToText(separator)` — separators: `'paragraph'` · `'tab'` · `'semicolon'` · `'comma'` · `{ char }`; `quickTables()` · `insertQuickTable(id)` (calendar, tabular list, matrix, with subheads, double table — content in the UI language) |
| Rows, columns, cells | `insertRowAbove()` · `insertRowBelow()` · `insertColumnLeft()` · `insertColumnRight()`, `insertCells('right' \| 'down' \| 'row' \| 'column')`, `deleteCells('left' \| 'up' \| 'row' \| 'column')`, `deleteRow()` · `deleteColumn()` · `deleteTable()`, `mergeCells()`, `splitCell(cols, rows, mergeFirst)`, `splitTable()` |
| Select | `selectCell()` · `selectRow()` · `selectColumn()` · `selectTable()`, `editingTableCell()`, `getTableState()` → `TableState` (`rows`, `cols`, `rect`, `cells`, `nested`, `canMerge`, `style`, `look`, `vAlign`, `textDirection`, `headerRow`, `rowHeight`, `colWidth`, `shading`, `tblPr` · `trPr` · `tcPr`, `availTwips`) |
| Size | `setRowHeight(twips, 'atLeast' \| 'exact')`, `setColumnWidth(twips)`, `distributeRows()` · `distributeColumns()`, `autoFitTable('content' \| 'window' \| 'fixed')`, `setTableCellMargins({ top, left, bottom, right }, spacingTwips?, autoResize?)` |
| Properties | `setTableProperties({ table, row, column, cell })` — the Table Properties dialog in one step: `table` (`width` (dxa or pct), `align`, `indentTwips`, `wrap: 'none' \| 'around'`, `position` (floating table), `overlap`, `title`, `description` — Alt Text), `row` (`height`, `allowBreak`, `header`), `column` (`width`), `cell` (`width`, `vAlign`, `margins`, `wrap`, `fitText`). `setCellAlignment(h, v)`, `setTextDirection('lrTb' \| 'tbRl' \| 'btLr')`, `toggleRepeatHeaderRows()` |
| Styles | `tableStyleList()` · `tableStyleListNow()` → `TableStyleInfo[]` (`name`, `label { en, pt, es }`, `group`: custom · plain · grid · list), `setTableStyle(name \| null)` (built-ins are added to the file on first use, with Word's definition), `setTableStyleOptions({ headerRow, totalRow, bandedRows, firstColumn, lastColumn, bandedColumns })`, `renderTableStyleThumb(canvas, name, look?)` |
| New / modify table style | `tableStyleXml(nameOrId)` → `{ id, xml, inDoc }`, `tableStyleBases()`, `newTableStyleId(name)`, `saveTableStyle(xml, { apply, basedOnName })`, `renderTableStyleXmlThumb(canvas, xml, look?)` — the New/Modify Table Style dialog edits the style per condition (whole table, header row, total row, first/last column, banded rows/columns, corner cells): font, borders, fill and alignment |
| Borders and shading | `setCellBorders(kind, spec?)` (`'all'` · `'outside'` · `'inside'` · `'insideH'` · `'insideV'` · `'top'` · `'bottom'` · `'left'` · `'right'` · `'tl2br'` · `'tr2bl'` · `'none'`), `setTableBorderSides(sides, 'cell' \| 'table')`, `getBorderPen()` · `setBorderPen({ val, sz, color })`, `setCellShading(color \| { themeColor, tint, shade } \| null, pattern?, 'cell' \| 'table')` (patterns `pct10`…, `horzStripe`…, painted with Word's coverage), `setParagraphBorders(sides)` · `getParagraphBorders()`, `getPageBorders()` · `setPageBorders({ offsetFrom, display, zOrder, top, left, bottom, right }, 'section' \| 'document')` |
| Draw | `setTableTool('draw' \| 'eraser' \| 'painter' \| null)` · `getTableTool()`: draw a table or a cell divider, erase a divider (merges the cells), paint borders with the current pen. With the mouse, drag a column or row border to resize, the move handle to float the table, the corner handle to resize it. `showTableGridlines(on)` · `tableGridlinesShown()` — dashed gridlines on screen for tables without borders (never in PDF or print) |
| Sort | `sortInfo(separator?)` → `{ kind: 'table' \| 'paragraphs', columns: [{ text, guess }], header, mergeError }`, `sort({ keys: [{ column, type: 'text' \| 'number' \| 'date', desc }], header, caseSensitive, separator })` — up to three keys (the dialog); text compares like Word (pt-BR word sort); tables with merged cells are refused (`uw-sort-error`) |
| Formula | `suggestFormula()` (`=SUM(ABOVE)` / `=SUM(LEFT)` like Word), `previewFormula(formula, numberFormat?)`, `insertFormula(formula?, numberFormat?)` — a `{ =… }` field with `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `PRODUCT`, `ABS`, `INT`, `MOD`, `ROUND`, `SIGN`, `IF`, `AND`, `OR`, `NOT`, `TRUE`, `FALSE`, `DEFINED`, cell references (`A1`, `B2:C4`), `ABOVE` · `BELOW` · `LEFT` · `RIGHT`, and a number format (`\# "#.##0,00"`); `updateFields()` (F9) recalculates them |
| Clipboard | `copy()` · `cut()` of cells and tables (tab-separated text + HTML), `paste()` (cells over the selection, HTML tables become tables), `pasteCells('overwrite' \| 'rows' \| 'nest' \| 'text')`, `hasCellsClip()` |
| Excel spreadsheet | `insertSpreadsheet()` · `editEmbeddedObject(run)` (double-click the object): an embedded Excel worksheet edited in `<universal-sheet>`, saved like Word (`w:object` + the workbook in `word/embeddings`). The page supplies the Sheet product: `editor.sheetLoader = () => import('@universal-office/sheet')`; `canEmbedSpreadsheet()` says whether it is available |

With `topbar`, the commands are in Insert › Table (grid, Insert Table, Draw
Table, Convert, Excel Spreadsheet, Quick Tables), Format › Table and Tools ›
Sort in the compact bar, and on the contextual **Table Design** (styles
gallery with live preview, style options, shading, border styles, pen, border
painter) and **Table Layout** (select, gridlines, properties, draw/eraser, insert,
delete, merge, split, cell size, alignment, text direction, margins, sort,
repeat header rows, convert to text, formula) tabs of the ribbon. The context
menu has the paste options, insert/delete, merge/split, borders, alignment and
Table Properties. Dialogs: Insert Table, Convert, Insert/Delete Cells, Split
Cells, Cell Margins, Table Properties (Table · Row · Column · Cell · Alt Text,
with Positioning and Options), Sort, Formula, Borders and Shading (Borders ·
Page Border · Shading), and New/Modify Table Style.

## Pictures

Pictures follow Word's rules (measured against Word): the XML each operation
writes, the wrap and position it keeps, how effects and adjustments are drawn on
the page and in the PDF. Every operation is one undo step and edits only the
picture's own XML (everything else in it is kept byte for byte). Click a picture
to select it: round handles resize (corners keep the aspect ratio when it is
locked, Shift inverts, Ctrl resizes from the center), the handle above rotates
(Shift snaps to 15°), dragging moves it (an inline picture moves in the text),
the arrow keys nudge a floating one and Delete removes it.

| Area | Methods |
|---|---|
| State | `selectedImage()` → `{ inline, wrap, widthPt, heightPt, rotation, altText, decorative, naturalPt, lockAspect, moveWithText, format }` (`format` is the parsed picture: wrap, position, crop, geometry, line, effects, 3-D, `a:blip` adjustments), `selectedImagePreview(w, h)`, `deleteSelectedImage()` |
| Wrap and position | `setImageWrap('inline' \| 'square' \| 'tight' \| 'through' \| 'topAndBottom' \| 'behind' \| 'front')` (Tight/Through on a picture with transparency generate the contour polygon, like Word), `setImagePosition('inline' \| '<top\|center\|bottom>-<left\|center\|right>')`, `setImageMoveWithText(on)`, `setImageLockAnchor(on)`, `setImageLayout({ wrap, wrapText, distPt, posH, posV, lockAnchor, allowOverlap, layoutInCell, widthPt, heightPt, relWidth, relHeight, lockAspect, rotation, moveWithText })` (the Layout dialog), `startEditWrapPoints()` · `endEditWrapPoints()` · `editingWrapPoints()` (drag a point, Ctrl+click adds or removes one) |
| Arrange | `arrangeImage('front' \| 'back' \| 'forward' \| 'backward' \| 'frontOfText' \| 'behindText')`, `alignImage('left' \| 'center' \| 'right' \| 'top' \| 'middle' \| 'bottom', 'margin' \| 'page')` and `imageAlignTo`, `rotateImage(±90)`, `flipImage('h' \| 'v')`, `setImageRotation(deg)`, `setImageSize({ widthPt, heightPt })`; Selection Pane: `selectionPaneItems()`, `selectPaneItem(key)`, `renamePaneItem(key, name)`, `setPaneItemHidden(key \| null, hidden)` (a hidden floating picture is not drawn and text does not wrap around it) |
| Crop | `startImageCrop()` · `endImageCrop()` · `croppingImage()` (black crop handles; drag inside to move the picture in the frame), `setImageCrop({ l, t, r, b })`, `cropImageFillFit('fill' \| 'fit')`, `cropImageToAspect(w, h)`, `cropImageToShape(prst)` (any DrawingML preset shape) |
| Picture styles | `setImageBorder({ color, weightPt, dash })`, `setImageEffect('shadow' \| 'reflection' \| 'glow' \| 'softEdge' \| 'bevel' \| 'rotation', preset \| null)`, `setImageFormat({ line, shadow, reflection, glow, softEdge, threeD })` (exact values, the Format Picture pane), `resolveDmlColor(color)` |
| Adjust | `setImageAdjust({ sharpen, bright, contrast, saturation, temperature })` (Office 2010 corrections: the picture is processed like Word and the original kept in the `a14:imgLayer`), `setImageRecolor(preset \| color)`, `setImageTransparency(percent)`, `setImageTransparentColor(hex \| null)` · `startTransparentColorPick()`, `changeImage(bytes, ext)` · `changeImageFromFile()` · `changeImageFromClipboard()`, `resetImage(size?)`, `compressImages({ ppi, deleteCropped, all })` |
| Accessibility | `setImageAltText({ text, title, decorative })` |

With `topbar`, the ribbon shows the contextual **Picture Format** tab (Adjust ·
Picture Styles · Accessibility · Arrange · Size) when a picture is selected; the
compact bar has a Picture group and Format › Picture. Galleries preview each
choice on the picture itself (corrections, color, transparency, effects). Panes:
Format Picture (Fill & Line · Effects · Layout & Properties · Picture), Alt Text
and Selection. Dialogs: Layout (Position · Text Wrapping · Size) and Compress
Pictures. Effects (shadow, reflection, glow, soft edges, bevel) are drawn with
Word's measured models on the canvas and written to the PDF like Word does
(each effect as an RGBA image with a soft mask). Not included: Remove
Background, Artistic Effects (kept when present in the file), Picture Layout,
online pictures and icons, and drawing 3-D rotation (it is kept and saved, but
the picture is drawn flat).

## Shapes and text boxes

Text boxes and shapes follow Word's rules (measured against Word): the XML each
operation writes (`wps:wsp` inside `mc:AlternateContent` with the VML fallback
rebuilt like Word), linked text boxes, the text flowing between them, vertical
text and the theme's shape styles. Click inside a text box to edit its text (the
undo stack is the document's, like Word); click its border to select the shape
(round handles resize, the handle above rotates, dragging moves; Esc in the text
selects the shape, typing with the shape selected adds to its text, Delete
removes it, Ctrl+C / Ctrl+V copy it). Shapes and groups are selected the same
way. A document in compatibility mode (Word 2007 or earlier) and a text box that
came only as VML stay VML when saved, like Word.

| Area | Methods |
|---|---|
| Insert | `insertTextbox(id?)` (the Text Box gallery — `textboxTemplates()`: our own designs; the sample text is selected so typing replaces it), `drawTextbox(vertical?)` · `drawingTextbox()` · `cancelDrawTextbox()` (the next drag on the page draws the box; a click makes a 1-inch one), `setAsDefaultTextbox()` (Set as Default Text Box: stored in the theme, `a:objectDefaults/a:txDef`, and used by the next drawn boxes), `saveSelectionToTextboxGallery(name?)` · `removeTextboxGalleryItem(id)` (the user's own gallery items — `host.loadTextboxGallery()` / `saveTextboxGallery(json)` keep them, otherwise the origin's localStorage) |
| State | `selectedShape()` → `{ kind, inline, wrap, widthPt, heightPt, rotation, flipH, flipV, lockAspect, moveWithText, lockAnchor, name, altText, decorative, geometry, styleIndex, text, link, editingText, format }` (`text`: margins, vertical alignment, direction, wrap, autofit, Do not rotate text; `format` is the parsed shape), `editSelectedTextbox()`, `deleteSelectedShape()` |
| Shape styles | `setShapeStyle(1…77)` (the Shape Styles gallery, as Word writes each one), `setShapeFill(color \| fill \| null)` (solid, gradient — `shapeGradientVariations()` —, pattern; `null` = No Fill), `setShapePictureFill(bytes, ext, tile?)` (Picture or Texture), `setShapeOutline({ color \| null, weightPt, dash, compound })` (No Outline keeps the previous line in `a14:hiddenLine`, like Word), `setShapeEffect(kind, preset \| null)`, `setShapeFormat({ line, shadow, reflection, glow, softEdge, threeD })`, `changeShape(prst)` |
| Text | `setTextboxOptions({ marginsPt, anchor: 't' \| 'ctr' \| 'b', direction: 'horz' \| 'vert' \| 'vert270' \| 'eaVert' \| …, wrap, autofit: 'none' \| 'shape', upright })`; Create Link: `createTextboxLink()` (the next click on an EMPTY text box links it; a box with text is refused with `uw-blocked`) · `linkingTextbox()` · `cancelTextboxLink()` · `linkTextboxTo(key)`, `breakTextboxLink()` |
| Arrange and size | `setShapeWrap(kind)`, `setShapePosition(preset)`, `setShapeMoveWithText(on)`, `setShapeLockAnchor(on)`, `setShapeLayout(o)` (the Layout dialog), `arrangeShape(op)`, `alignShape(kind, relativeTo?)`, `setShapeSize({ widthPt, heightPt })`, `setShapeRotation(deg)`, `rotateShape(±90)`, `flipShape('h' \| 'v')`, `setShapeAltText({ text, title, decorative })`; the Selection Pane lists pictures, text boxes, shapes and groups |

With `topbar`, the ribbon shows the contextual **Shape Format** tab (Insert
Shapes · Shape Styles · Text · Accessibility · Arrange · Size) when a shape or
text box is selected or being edited, and Insert › Text Box opens the gallery
and Draw Text Box; the compact bar has a Shape group, Format › Shape and Insert ›
Text box. The Format Shape pane (Fill & Line · Effects · Layout & Properties,
with the Text Box options) and the shape's context menu are included. Not
included: WordArt styles, inserting new shapes, Edit Points and grouping (other
work items), Word's own Text Box gallery designs and textures, and 3-D rotation
is kept and saved but drawn flat.

## Styles

The document's `styles.xml` is edited in place: each operation rewrites only
the `w:style` elements it touches (in schema order) and leaves the rest of the
part byte for byte. Created and modified styles are written the way Word
writes them — a new paragraph style is **linked** (`w:customStyle`, `w:link`
to a `…Char` twin), its id is the name without accents or spaces
(`Ação & Reação` → `AoReao`, collisions get `0`, `1`…), a built-in style used
for the first time gets Word's full definition. Style names are shown in the
UI language (`heading 1` → "Heading 1" / "Título 1").

| Method | Description |
|---|---|
| `listStyles(filter = 'recommended')` | `StyleInfo[]` (`id`, `name`, `kind`: paragraph · character · linked, `builtIn`, `defined`, `quick`, `hidden`, `priority`, `inUse`, `basedOn`, `next`, `link`, `autoUpdate`) in Word's order. `filter`: `'gallery'` · `'recommended'` · `'inUse'` · `'document'` · `'all'`. |
| `styleFormatting(id)` | Effective formatting of a style (`StyleLook`: font, size, colors, bold…, alignment, spacing, indents, shading, borders). |
| `applyStyle(id)` | Paragraph style: replaces the style and clears direct paragraph formatting and the character formatting that is uniform in the paragraph (partial formatting stays). Character style: on the selection (at the caret, the word), removing its direct formatting. Linked style on part of one paragraph: its character twin. `undefined` = Normal. |
| `createStyle({ name, type, basedOn, next, quick, autoUpdate, format, fromSelection, apply })` | Creates a style (default: linked, in the gallery, based on the current paragraph style, with the formatting of the selection's first character and paragraph) and applies it. Returns the id, or `null` if the name is taken. |
| `modifyStyle(id, { name, basedOn, next, quick, autoUpdate, format })` | Changes a style; `format` keys set a value on the style, `null` inherits again. The whole document is laid out again; one undo step. |
| `updateStyleFromSelection(id?)` | "Update to Match Selection": the current paragraph's direct formatting moves into the style. |
| `renameStyle(id, name)` · `deleteStyle(id)` · `setStyleInGallery(id, on)` | Custom styles get a new id when renamed (the document follows); built-ins get an alias. Deleting a custom style returns its paragraphs to Normal; built-ins cannot be deleted. |
| `inspectStyle()` | `{ paragraph: { id, name, direct }, text: { id, name, direct } }` — the Style Inspector. |
| `clearParagraphStyle()` · `clearParagraphFormatting()` · `clearCharacterStyle()` · `clearCharacterFormatting()` · `clearFormatting()` | The Inspector's erasers and Clear All Formatting. |
| `currentStyles()` · `selectionStyleFormat()` · `stylesVersion()` | Styles at the caret, the selection's direct formatting as a `StyleFormat`, and a counter that changes with the style sheet. |

Enter at the end of a paragraph whose style has a *next style* (Heading 1 →
Normal) starts the new paragraph in that style, without direct formatting.

## Footnotes and endnotes

Notes are edited where they are drawn: click the note area at the bottom of the
page (or the endnotes after the text) and type — caret, selection, formatting,
styles and spelling work as in the body; Esc or a click in the text goes back.
Undo is one history for the text and the notes (undoing note typing from the
body moves the caret to the note). Deleting the reference deletes the note;
numbers follow the order of the references. The first Backspace right after a
reference only selects it; copying a reference and pasting it creates a new note
with a copy of the text. Double-click a reference to open its note and the
note's number to go back; hovering a reference shows the note's text.
With Track Changes on, a new note is an insertion (the reference and the note's
text); deleting the reference keeps the note until the deletion is accepted.
Revisions inside notes are listed by `getRevisions()` (`story: 'footnote' |
'endnote'`) and included in Accept/Reject All.

Endnotes are laid out after the text of the document (or of each section), with
the separator and, on the following pages, the continuation separator; the
footnote area can be split in columns. Number formats: `decimal`,
`lowerLetter`, `upperLetter`, `lowerRoman`, `upperRoman`, `chicago` (*, †, ‡,
§…); numbering continuous, per section or (footnotes) per page.

| Method | Description |
|---|---|
| `insertFootnote({ mark })` · `insertEndnote({ mark })` | Inserts a note at the end of the selection (nothing is deleted) and moves the caret into it. `mark`: custom mark instead of the number. Not available in headers/footers, text boxes, inside a note or in a plain text, date, combo box or drop-down content control. Returns the note id or `null`. Note styles and parts are added the way Word writes them. |
| `canInsertNote()` · `editingNote()` · `noteCount(kind)` | Whether a note can be inserted here; the note being edited (`{ kind, id }` or `null`); how many notes of a kind the text references. |
| `nextNote(kind = 'footnote', dir = 1)` | Next (`1`) or previous (`-1`) note: in the text the caret goes before the reference; inside the notes, to the start of the next note. `false` = none. |
| `showNotes(kind?)` | In the text, opens the note of the reference at the caret (or the next one); inside a note, goes back to its reference. |
| `openNote(kind, id)` · `goToNoteRef(kind, id)` | Edit a note (caret at the end) · caret right after its reference. |
| `getNoteOptions(kind)` | `{ position, numberFormat, startAt, restart, columns }` of the section at the caret. `position`: `'pageBottom'` · `'beneathText'` (footnotes), `'docEnd'` · `'sectEnd'` (endnotes); `restart`: `'continuous'` · `'eachSect'` · `'eachPage'` (footnotes); `columns`: footnote area columns, `0` = as the section. |
| `setNoteOptions(kind, options, scope = 'document')` | Changes them for the whole document or for `'section'` (the section at the caret). With numbering restarted per section or page the start is 1. One undo step. |
| `convertNotes('toEndnotes' \| 'toFootnotes' \| 'swap', only?)` | Converts all notes of a kind, swaps them, or only `{ kind, id }`; the content takes the other kind's note styles. Returns how many changed. |

The ribbon has a **References** tab (Table of Contents; Footnotes: insert
footnote/endnote, the Next Footnote menu, Show Notes and the **Footnote and
Endnote** dialog, with Convert…); the compact bar has them under Insert ›
Notes. Right-click inside a note for Go to Reference, Convert and the options.

## Headers and footers

Double-click the top or bottom margin (or use Insert › Header / Footer) to edit
the header or footer of that page; the ribbon shows the **Header & Footer** tab:

- **Header**, **Footer** and **Page Number** galleries with built-in designs
  (blank, three columns, centered title, title and author, color band, accent;
  page numbers at the top or bottom of the page, in the page margin or at the
  current position — "Page X of Y", brackets, accent rule…). Choosing a header,
  footer or top/bottom page number replaces the content of the part shown on
  that page, as in Word; page numbers from the galleries are kept in a block
  that **Remove Page Numbers** finds (Word's own page numbers too).
- **Date & Time** (formats of the language; *Update automatically* inserts a
  `TIME` field as Word does), **Document Info** (author, title, file name and
  path as fields), **Format Page Numbers** (format, chapter number from a
  numbered heading style, continue or start at), **Insert Alignment Tab**.
- **Navigation**: Go to Header / Go to Footer, Previous / Next (by section:
  first page, even page, then the other pages — Word's order) and **Link to
  Previous**: turning it off copies the inherited header or footer into a new
  part of the section (pictures included); turning it on removes the section's
  own part, which then leaves the file.
- **Options**: Different First Page (`w:titlePg`, per section), Different Odd &
  Even Pages (`w:evenAndOddHeaders`, for the document) and Show Document Text.
- **Position**: distance of the header from the top and of the footer from the
  bottom of the page (centimeters with `lang="pt"` or `lang="es"`, inches otherwise).

While editing, each page shows the name of its part ("First Page Header
-Section 2-", "Even Page Footer"…) and "Same as Previous" when it comes from
the previous section. Undo is one history for the text, the headers/footers
and these options: undoing a header step from the body changes the header
without entering it. Saving keeps you in the header or footer. The compact
bar has all of it under Insert › Headers & footers, with the options in the
**Header & footer options** dialog.

| Method | Description |
|---|---|
| `enterHeaderFooter(kind, page?)` · `exitHeaderFooter()` · `editingHeaderFooter()` | Edit the header or footer shown on a page (0-based) · back to the body · `'header'`, `'footer'` or `null`. |
| `getHeaderFooterOptions()` | `HeaderFooterOptions` of the section at the caret (or of the page being edited): `section`, `sectionCount`, `page`, `part` (`{ kind, type: 'default' \| 'first' \| 'even' }` while editing), `differentFirstPage`, `differentOddEven`, `headerDistance`, `footerDistance` (twips), `linkToPrevious`, `documentTextShown`. |
| `setDifferentFirstPage(on)` · `setDifferentOddEven(on)` · `setHeaderFooterDistance({ header?, footer? })` | The options, one undo step each; in header/footer editing the caret goes to the part the page now shows. |
| `setLinkToPrevious(on, kind?)` | Link to Previous for the part being edited (sections after the first). |
| `goToHeaderFooter(kind?)` · `nextHeaderFooter()` · `previousHeaderFooter()` | Go to Header/Footer; Next/Previous. |
| `showDocumentText(on)` · `documentTextShown()` | Show Document Text (screen only). |
| `headerFooterTemplates(gallery)` · `insertHeaderFooterTemplate(gallery, id)` · `paintHeaderFooterTemplate(gallery, id, canvas, cssWidth)` | The gallery designs (`gallery`: `'header'` · `'footer'` · `'pageTop'` · `'pageBottom'` · `'pageMargin'` · `'pageCurrent'`), insert one, draw its thumbnail with the layout engine. |
| `removeHeaderFooter(kind)` · `removePageNumbers()` | Remove Header/Footer (empties the part of the page at the caret) · Remove Page Numbers. |
| `getPageNumberFormat()` · `setPageNumberFormat({ format?, chapter?, start? })` | `PageNumberFormat` of the section: `format` (`decimal`, `numberInDash`, `lowerLetter`, `upperLetter`, `lowerRoman`, `upperRoman`), `chapter` (`{ level: 1–9, separator: 'hyphen' \| 'period' \| 'colon' \| 'emDash' \| 'enDash' }` or `null`), `start` (`null` = continue). The page number shows the number of the last heading of that level on or before the page (`1-3`). |
| `dateTimeFormats(lang?)` · `insertDateTime(pattern, update?, lang?)` | Date & Time formats (`{ pattern, sample }[]`) and insertion. |
| `insertDocumentInfo('author' \| 'title' \| 'fileName' \| 'filePath', fileName?)` | Document Info fields (`AUTHOR`, `TITLE`, `FILENAME`). |
| `insertAlignmentTab('left' \| 'center' \| 'right', relativeTo?, leader?)` | Alignment tab (`w:ptab`) relative to the margin or the indent. |

### Page fields and a cover page

The page fields follow Word (measured in Word 365 with a cover page: Different
First Page — `w:titlePg` — and numbering starting at 0, then three pages; for a
cover from Word's gallery see [below](#cover-pages-from-words-gallery)):

| Field | On the page after the cover |
|---|---|
| `PAGE` | `1` (the cover is page 0 and shows no footer) |
| `NUMPAGES` | `4` — **every** page of the document, the cover included |
| `SECTIONPAGES` | the pages of the page's own section: `4` with one section, `3` when the cover is a section of its own |
| `{ = { NUMPAGES } - 1 }` | `3` — the total **without** the cover |

So "page 1 of 3" with a cover is a **formula field** in the footer:
`Page { PAGE } of { = { NUMPAGES } - 1 }`. In Word: Ctrl+F9 inserts the field
braces, type `= `, Ctrl+F9 again inside them for `NUMPAGES`, then ` - 1`, and
F9 (or Alt+F9 to toggle codes). With the cover in a section of its own (next
page break after it) `{ SECTIONPAGES }` also gives 3 — but only while the body is
a single section. In the file it is a complex field with the nested field in
its code:

```xml
<w:r><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:instrText xml:space="preserve"> = </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:instrText xml:space="preserve"> NUMPAGES \* Arabic \* MERGEFORMAT </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>4</w:t></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
<w:r><w:instrText xml:space="preserve"> - 1 </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>3</w:t></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
```

The layout engine (screen, PDF, viewer and the .NET engine) recalculates
formula fields the way Word does when it paginates: in headers and footers
always, in the body only when the code has a nested field (a plain `= 2 + 2`
in the body keeps its cached result). The evaluation is deliberately small and
safe — numbers (pt-BR notation: `0,5`, `1.000`), `+ - * /`, parentheses and
sign over `PAGE`, `NUMPAGES`, `SECTIONPAGES`, `SECTION` and nested formulas;
the result as Word shows it (up to two decimals, `1,33`), with `\# "00"`
(numeric picture) or `\* roman`/`ROMAN`/`alphabetic`/`ALPHABETIC`/`Arabic`. Anything
else (functions, bookmarks, table cells, division by zero) keeps the cached
result. The model keeps the nested code in `Run.fieldCode`
(`" = { NUMPAGES } - 1 "`), and saving writes the nested fields back even if
the footer paragraph was edited.

#### Cover pages from Word's gallery

When the body has a cover page from **Word's gallery** (Insert › Cover Page: a
content control with `w:docPartGallery` "Cover Pages") **and** the first
section starts numbering at 0 (`w:pgNumType w:start="0"`, which Word writes
with that cover), Word's `NUMPAGES` already leaves the cover out — `3` in the
example above, so `{ = { NUMPAGES } - 1 }` gives `2`. The engine does the
same, and only then: without the gallery control, with any other start (or
`start="0"` only in a later section), `NUMPAGES` counts every page, and
`SECTIONPAGES` never leaves the cover out. The editor's own Insert › Cover
Page turns on Different First Page but does not start the numbering at 0.

## Page design

The ribbon's **Design** tab holds the **Page Background** group; the compact
bar has the same under Format › Page background, and Insert › Cover page /
Blank Page.

- **Watermark**: a gallery of 12 text watermarks (Confidential, Do Not Copy,
  Draft, Sample, ASAP, Urgent — diagonal and horizontal, in the UI language)
  with thumbnails drawn by the layout engine, **Custom Watermark…** (picture
  with scale and washout; text with language, the language's list of texts,
  font, size or Auto, color, semitransparent, diagonal or horizontal — Apply
  keeps the dialog open) and **Remove Watermark**. It goes where Word puts it:
  VML (`PowerPlusWaterMarkObject` / `WordPictureWatermark`) in the first
  paragraph of the three headers of the section at the caret, creating the
  ones it lacks; Word recognizes and removes it, and Remove takes it out of
  every section.
- **Page Color**: the theme palette (saved with `w:themeColor` and its
  tint/shade), standard colors, No Color, More Colors and **Fill Effects…**:
  gradient (one color dark↔light, two colors or our own presets; the six
  shading styles and their variants), texture (your image, tiled at its
  natural size), the 48 patterns with foreground and background, and picture.
  Saved as `w:background` (+ `v:background` for the effects) and
  `w:displayBackgroundShape`.
- **Page Borders** opens the Borders and Shading dialog on its page tab.
- **Cover Page** (Insert › Pages): our own designs — Band, Sidebar, Frame,
  Block, Minimal, Base, Duotone and Diagonal — with fields filled from the
  document properties (title, subject, author, company, description) or
  placeholders. The cover is a `w:sdt` "Cover Pages" at the start of the
  document ending in a page break, with Different First Page on the first
  section; choosing another one replaces it and **Remove Current Cover Page**
  takes it out (Word's own cover pages too). The title placeholder comes
  selected, so typing replaces it.
- **Blank Page**: splits the paragraph at the caret and puts a page break, an
  empty paragraph (the caret goes there) and another page break, as Word does;
  one undo step.

Like Word, the page color and fill show on screen, always go into the PDF
(gradient and picture tiles at Word's device resolution, patterns at 1 pt)
and stay out of printing.

| Method | Description |
|---|---|
| `pageBackground()` | `PageBackgroundInfo` or `null` (No Color): `color`, `themeColor`, `tint`/`shade` (0–1), `fill` (the `v:fill`: `type` `gradient` · `gradientRadial` · `pattern` · `tile` · `frame`, colors, angle, focus…) and `shown`. |
| `setPageColor(color)` | `'RRGGBB'`, `{ themeColor, tint?, shade? }` (`themeColor` as in `w:themeColor`: `accent1`, `background1`…; `tint`/`shade` 0–1) or `null` for No Color. One undo step. |
| `setPageFill(fill)` · `pageFillOptions()` | Fill Effects: `{ type: 'gradient', colors: 'one', color, degree (0 dark–1 light), style, variant }`, `{ type: 'gradient', colors: 'two', color, color2, style, variant }`, `{ type: 'gradient', colors: 'preset', preset, style, variant }`, `{ type: 'pattern', pattern, color, background }`, `{ type: 'texture' \| 'picture', data, ext, name }`; `style` is `horizontal` · `vertical` · `diagonalUp` · `diagonalDown` · `fromCorner` · `fromCenter`. `pageFillOptions()` lists the presets, the variants per style and the patterns (DrawingML preset names) with names in the UI language. |
| `watermark()` · `watermarkGallery()` · `watermarkTexts()` | The watermark of the section at the caret (`WatermarkInfo`: text, font, size, color, semitransparent, layout — or picture, washout — with its box in points), the gallery items (`id`, `label`, `categoryLabel`) and the text list of the Custom Watermark dialog. |
| `setWatermark(spec)` · `removeWatermark()` | A gallery id (`'confidential1'`, `'draft2'`…) or a `WatermarkSpec`: `{ kind: 'text', text, font, sizePt?, color, semitransparent, layout: 'diagonal' \| 'horizontal', lang? }` (no `sizePt` = Auto) or `{ kind: 'picture', data, ext, title, scale?, washout }` (no `scale` = Auto). Replaces the current one; one undo step. |
| `coverPages()` · `hasCoverPage()` · `insertCoverPage(id)` · `removeCoverPage()` | Cover page designs (`{ id, name }`), whether the document has one, insert (replaces the current), remove (`false` without a cover page). |
| `paintWatermarkTemplate(id, canvas, cssWidth)` · `paintCoverTemplate(id, canvas, cssWidth)` | Draw a gallery thumbnail (a whole page) with the layout engine. |
| `insertBlankPage()` | Blank Page at the caret. |

## Text layout

The ribbon's **Layout** tab has Word's **Line Numbers** and **Hyphenation**
menus in Page Setup and the **Indent** / **Spacing** boxes in Paragraph; the
compact bar has both menus under Tools. Everything is written the way Word
writes it (measured against Word with `write/tools/textlayout-lab`).

- **Hyphenation**: None, Automatic, **Manual…** and **Hyphenation Options…**
  (hyphenate automatically, hyphenate words in CAPS, hyphenation zone, limit
  consecutive hyphens). The layout engine hyphenates pt-BR, English and Spanish
  with Word's rules (minimum letters, the gap that triggers a break, the
  justified-line comparison, the consecutive limit). **Manual** walks through the
  words that automatic hyphenation would break at the end of a line — in the
  selection, or the whole document —, shows the possible breaks with the
  suggested one (breaks past the margin can't be chosen) and **Yes** inserts an
  optional hyphen (`w:softHyphen`); **No** skips the word. Per paragraph, *Don't
  hyphenate* is in the Paragraph dialog. Ctrl+- types an optional hyphen and
  Ctrl+Shift+- a nonbreaking hyphen.
- **Line Numbers**: None, Continuous, Restart Each Page, Restart Each Section
  (the sections the selection touches), **Suppress for Current Paragraph** and
  **Line Numbering Options…**, which opens Page Setup on its **Layout** tab —
  its *Line Numbers…* button has start at, from text (Auto = ¼" with one column,
  ⅛" with more), count by and numbering. The numbers are drawn on the page, in
  the PDF and in print with the document's *Line Number* style (added to the
  styles the first time, like Word), counting only body lines (not tables, text
  boxes, frames or notes) and restarting like Word between sections on the same
  page.
- **Indent / Spacing** boxes: left and right indent (cm with `lang="pt"`/`"es"`,
  inches otherwise; steps of 0.1) and spacing before and after (pt, steps of 6;
  below 0 is *Auto*). Type any unit (`1,5`, `2 cm`, `12 pt`, `0.5"`); Enter
  applies, Esc restores. A value equal to the style's is not written. They are
  empty when the selected paragraphs differ.
- The **Paragraph** dialog has a *Line and Page Breaks* tab (widow/orphan
  control, keep with next, keep lines together, page break before, suppress
  line numbers, don't hyphenate, text box tight wrap) and **Page Setup** has
  *Margins*, *Paper* and *Layout* tabs (section start, different odd and even,
  different first page, header/footer distance, vertical alignment, Line
  Numbers…, Borders…), with *Apply to* for all of them.

| Method | Description |
|---|---|
| `getHyphenation()` · `setHyphenation('none' \| 'auto')` · `setHyphenationOptions(o)` | `HyphenationInfo`: `{ auto, caps, zoneTwips, limit }` (`limit` 0 = no limit). One undo step; `settings.xml` gets `w:autoHyphenation`, `w:consecutiveHyphenLimit`, `w:hyphenationZone`, `w:doNotHyphenateCaps` (None removes the element). |
| `nextManualHyphenation()` · `applyManualHyphenation(letters)` · `skipManualHyphenation()` · `endManualHyphenation()` | Manual hyphenation: `nextManualHyphenation()` resolves to `{ word, lang, points, suggested, limit }` (break points as the number of letters before the hyphen) or `null` when done, and selects the word; `applyManualHyphenation(n)` inserts the optional hyphen (one undo step each). |
| `getLineNumbering()` · `setLineNumbering(mode)` | `{ mode: 'none' \| 'continuous' \| 'page' \| 'section', startAt, countBy, distanceTwips (0 = Auto), mixed }`; `setLineNumbering` is the menu (keeps start, count by and distance). |
| `setLineNumberingOptions(o, applyTo?)` | The Line Numbers dialog: `{ on, startAt, countBy, distanceTwips, restart: 'page' \| 'section' \| 'continuous' }`; `applyTo` as in Page Setup. `w:lnNumType` with `w:start` = start at − 1, no `w:distance` for Auto, no `w:restart` for each page. |
| `toggleLineNumberSuppression()` · `lineNumbersSuppressed()` | Suppress for Current Paragraph (`w:suppressLineNumbers`): toggles, and clears every paragraph when some of the selection is suppressed. |
| `getParagraphFlow()` · `setParagraphFlow(f)` | `ParagraphFlow`: `widowControl`, `keepNext`, `keepLines`, `pageBreakBefore`, `suppressLineNumbers`, `suppressAutoHyphens` (effective values; `null` = mixed) and `textboxTightWrap`. Only what differs from the style is written; turning off what the style turns on writes `w:val="0"`. |
| `getParagraphLayout()` · `setParagraphLayout(v)` | The Indent/Spacing boxes: `{ left, right, before, after }` in twips (`before`/`after` may be `'auto'`; `null` = mixed). |
| `setSectionStart(type, applyTo?)` · `setVerticalAlignment(v, applyTo?)` | Section start (`w:type`) and vertical alignment `'top' \| 'center' \| 'both' \| 'bottom'` (`w:vAlign`). `getSection()` also reports `verticalAlignment` and `lineNumbering`; `setPageSetup()` takes `sectionStart`, `verticalAlignment` and `lineNumbering` in the same undo step. |

## Navigation

**View › Show** has Word's three switches, remembered per instance:

- **Navigation Pane** (also Ctrl+F, which focuses its search box): a pane at
  the left with a search box and three tabs. *Headings* is the tree of the
  body's headings — the paragraphs with an outline level, built like Word's
  (checked on 141 real documents against Word: the built-in Heading styles
  count by name even without `w:outlineLvl`, a direct outline level on them
  is ignored, list numbers and All Caps appear as in Word, headings inside
  tables and empty ones are left out). Click to go to a heading, collapse and
  expand, **drag a heading to move its whole section** (subheadings, tables
  and all, one undo step), and right-click to promote/demote, add a heading
  before/after or a subheading, delete or select the heading with its content,
  and show only some heading levels. *Pages* shows page thumbnails; *Results*
  lists the search matches with the text around them. While searching, every
  match is highlighted on the page (on screen only), the headings that
  contain matches light up and *Pages* shows only the pages with matches.
  Search options: match case, whole words, highlight all, incremental find.
- **Ruler**: horizontal (Print, Web and Draft layouts) and vertical (Print
  Layout), in centimeters with `lang="pt"` or `lang="es"` and inches otherwise. It shows the
  page margins, the columns of the section, the cells of the table at the
  caret, the indents of the paragraph (first line, hanging, left, right), its
  tab stops and the default tab stops. Drag to change them (steps of 0.25 cm
  or 1/16"; hold Alt for free movement); click to set a tab of the kind chosen
  in the corner selector (left, center, right, decimal, bar — or put the
  first-line/hanging indent there); drag a tab off the ruler to remove it.
  Double-click opens Page Setup (margins), Paragraph (indents) or Tabs.
  Dragging writes what Word writes: only the attributes that differ from the
  style (an indent dragged back to the style's value leaves `w:ind`), tab
  stops in position order, and `w:val="clear"` for a style's tab that was
  removed.
- **Gridlines**: the document's drawing grid on the page (9 pt squares from
  the margins unless the document sets its own spacing, origin or
  intervals) — on screen only, never in the file, PDF or print.

The View tab also switches to **Outline** and **Draft**. The Paragraph dialog
has left, right and special indents and a **Tabs…** button; the **Tabs**
dialog sets positions, alignment and leaders, clears them and changes the
document's default tab stop; Page Setup takes custom margins.

| Area | Methods |
|---|---|
| Ruler | `getRulerInfo()` → `RulerInfo` (`page`, `pageWidthTwips`, `pageHeightTwips`, `margins`, `columns`, `frame` — the paragraph's column, cell text area, header/footer or text box —, `indents`, `tabs`, `defaultTabTwips`, `where`, `table` (`cols`, `current`, `rows`), `lineTop`, `readOnly`); `null` in Read Mode and Outline |
| Indents | `getParagraphIndents()` → `{ left, right, firstLine }` (effective, twips from the frame; `firstLine` < 0 = hanging), `setParagraphIndents({ left?, right?, firstLine? })` — absolute values for every selected paragraph, one undo step |
| Tabs | `getTabStops()` → `{ tabs: { pos, align: 'left' \| 'center' \| 'right' \| 'decimal' \| 'bar', leader? }[], defaultTabTwips }`, `setTabStops(tabs, only?)` — the effective tab stops of the selected paragraphs (`only: { add, remove }` touches just those positions in each paragraph), `getDefaultTabStop()` · `setDefaultTabStop(twips)` (`w:defaultTabStop`) |
| Table on the ruler | `resizeTableColumn(boundary, deltaTwips)`, `resizeTableRow(row, deltaTwips)` — the table at the caret, like dragging its borders |
| Headings | `getHeadings()` → `{ index, level, text, para, page }[]`, `currentHeading()`, `goToHeading(i)`, `moveHeading(i, before)` (`before` = index of the heading to move in front of; `getHeadings().length` = end), `promoteHeading(i)` · `demoteHeading(i)` (with its subheadings), `insertHeading(i, 'before' \| 'after' \| 'sub')`, `deleteHeading(i)`, `selectHeading(i)` |
| Search | `search(text, { matchCase, wholeWord, highlight })` → `{ index, start, end, before, match, after, page, heading, inTable }[]` (body and tables; highlights the matches), `goToSearchResult(i)` (enters the cell when needed), `clearSearch()` |
| Pages | `layoutPageCount()`, `paintPageThumbnail(page, canvas, cssWidth)`, `goToPage(page)` |
| Gridlines | `showGridlines(on)` · `gridlinesShown()` |

## Links and references

Bookmarks, cross-references, captions, the table of figures, the table of
contents and hyperlinks are written the way Word writes them (measured against
Word: bookmark XML and ids, hidden `_Ref`/`_Toc` bookmarks, complex
`REF`/`PAGEREF`/`NOTEREF` fields, `SEQ`/`STYLEREF` captions, multi-paragraph
`TOC` fields). Bookmarks follow edits like Word's: typing at the start of a
bookmark goes inside it, at the end it stays out; deleting the whole bookmarked
text deletes the bookmark; cut and paste moves it, copy does not duplicate it.

| Area | Methods |
|---|---|
| Bookmarks | `insertBookmark(name)` — on the selection (or a point bookmark at the caret); a repeated name (case-insensitive) moves the bookmark; `false` for an invalid name (a letter, then letters, digits or `_`, up to 40). `deleteBookmark(name)`, `goToBookmark(name)` (selects it), `getBookmarks({ hidden, sort: 'name' \| 'location' })` → `{ name, hidden, text }[]`, `hasBookmark(name)`, `validBookmarkName(name)`, `showBookmarks(on?)` · `bookmarksShown()` (gray brackets on the screen, never in the PDF or print; hidden bookmarks are not shown) |
| Cross-reference | `getCrossReferenceItems(type, label?)` → `{ id, text }[]` for `'numbered' \| 'heading' \| 'bookmark' \| 'footnote' \| 'endnote' \| 'caption'`, `crossReferenceKinds(type)`, `insertCrossReference({ type, label?, item, kind, hyperlink = true, position, separator })` — kinds `'text' \| 'page' \| 'number' \| 'numberNoContext' \| 'numberFullContext' \| 'position' \| 'noteNumber' \| 'noteNumberFormatted' \| 'captionEntire' \| 'captionLabel' \| 'captionText'`; a hidden `_Ref` bookmark is created on the target (and reused by the next reference to it) |
| Captions | `insertCaption({ label, title?, position?, excludeLabel?, numbering? })` — above or below the selected picture or table (`keepNext` like Word), otherwise at the caret; renumbers the following captions of the label. `getCaptionLabels()`, `addCaptionLabel(name)` · `deleteCaptionLabel(name)`, `getCaptionNumbering(label)` · `setCaptionNumbering(label, { format, chapter?: { level, separator } })` (formats `ARABIC`, `alphabetic`, `ALPHABETIC`, `roman`, `ROMAN`; chapter numbers through `STYLEREF n \s`), `captionTarget()`, `nextCaptionNumber(label)`, `getAutoCaption()` · `setAutoCaption({ table: { label, position } })` (caption new tables). `captionSettings` (get/set) holds the new labels, numbering and AutoCaption — the bars keep it per machine |
| Table of figures | `insertTableOfFigures({ label, includeLabel, pageNumbers, rightAlign, leader, hyperlinks, format })` (`TOC \h \z \c "Figure"`; with the caret in a table of figures it is replaced), `updateTableOfFigures()` (the one at the caret, or all), `getTableOfFiguresOptions()` |
| Table of contents | the same engine as the table of figures — see [Table of contents](#table-of-contents) |
| Fields | `updateFields(scope = 'all', toc = 'all')` — `'selection'` (what F9 does, like Word) updates the fields in the selection or at the caret; `'all'` every field: TOCs, table formulas and the cached results of `REF`, `PAGEREF`, `NOTEREF`, `SEQ` and `STYLEREF` (the `REF` result keeps the direct formatting of the bookmarked text); `toc: 'pages'` updates only the page numbers of the tables of contents. Returns how many changed |
| Hyperlinks | `insertHyperlink({ address?, anchor?, tip?, text? })` — a web address, file or `mailto:`, or a place in the document (`anchor`: a bookmark, `'_top'`, or `'p:<paragraph>'` for a heading, which gets a hidden `_Toc` bookmark); `tip` is the ScreenTip (`w:tooltip`); the runs take the Hyperlink style. `getLink()` → `{ address?, anchor?, tip?, text }`, `getLinkTargets()` (headings and bookmarks), `removeLink()` |
| Where | `canInsertField()` — `false` inside a plain-text, date, combo box or drop-down list content control: Word refuses fields and hyperlinks there (a file with one inside does not open), so cross-references, captions at the caret, tables of figures and hyperlinks do nothing there and the bars disable them |

The layout engine computes these fields the way Word does when it prints or
exports: `REF` shows the exact bookmarked text (`\n`, `\r`, `\w` and `\d`
for paragraph numbers in context), `\p` gives "above"/"below", `NOTEREF` the
note's mark (also for a later note), `STYLEREF` the nearest heading of the level
(`\s` only the numbers, `\n` the number) and `SEQ \s n` restarts at each
heading of level n or above.

The ribbon has **Insert › Links** (Link, Bookmark, Cross-reference),
**References › Captions** (Insert Caption, Insert Table of Figures, Update
Table, Cross-reference) and **View › Show › Bookmarks**; the compact bar has
them under Insert and View. The dialogs: **Bookmark** (add, delete, go to, sort
by name or location, hidden bookmarks, show bookmarks), **Cross-reference**
(non-modal: it stays open after Insert), **Caption** (New Label, Delete Label,
Numbering, AutoCaption), **Table of Figures** (preview, page numbers, tab
leader, hyperlinks, formats, Modify the style) and **Link** (web page or file,
place in this document, e-mail address, text to display, ScreenTip, Remove
Link). Ctrl+click follows a link or a cross-reference inserted as a hyperlink;
only `http`, `https` and `mailto` leave the editor, in a new tab without
`window.opener` or `Referer` (`noopener,noreferrer`).

## Table of contents

Tables of contents are `TOC` fields written the way Word writes them (measured
against Word): entries in the TOC 1–9 styles with a right tab and leader, each
one a hyperlink to a hidden `_Toc` bookmark on its heading with a `PAGEREF`
page number. The gallery tables sit in a content control (`w:sdt` with
`docPartGallery="Table of Contents"` and `docPartUnique`) with a TOC Heading
paragraph; there is one gallery table per document, so a new one replaces it.
With the caret inside, the control shows its frame and a tab with the gallery
menu and **Update Table…** (screen only — never in the PDF, print or viewer).

| Area | Methods |
|---|---|
| Gallery | `tocTemplates()` → `{ id, name }[]` (`'auto1'` "Contents", `'auto2'` "Table of Contents" — `TOC \o "1-3" \h \z \u` — and `'manual'`, typed entries with placeholders and a right-aligned leader tab), `insertTocTemplate(id)`, `paintTocTemplate(id, canvas, cssWidth)` (the thumbnail, drawn by the layout engine) |
| Custom table | `insertTableOfContents(options, replace?)` — `{ pageNumbers, rightAlign, leader, hyperlinks, format, levels, useStyles, styles, outlineLevels, fields, fieldId }` → `\o "1-N"`, `\n`, `\p " "`, `\h`, `\z`, `\t "Style;level"`, `\u`, `\f [id]`; `format` (`'template'`, `'classic'`, `'distinctive'`, `'fancy'`, `'modern'`, `'formal'`, `'simple'`) rewrites the TOC 1–9 styles like Word. `replace`: `true` replaces the table at the caret (or the first), `false` inserts another one at the caret; omitted, the one at the caret is replaced. `getTableOfContentsOptions()` reads the table at the caret (or the first) |
| Update | `updateToc(mode = 'all')` — `'pages'` updates only the page numbers (text typed in the entries stays, the `_Toc` bookmarks are kept); `'all'` rebuilds the entries. The table at the caret, or every `TOC` field (also the tables of figures) |
| Remove | `removeTableOfContents()` — the content control with its heading, or the field; the `_Toc` bookmarks only the entries used go away. The table at the caret, or the first |
| Add Text | `getTocLevel()` (0 = Do Not Show in Table of Contents, 1–9), `setTocLevel(level)` — Level N applies Heading N to a Normal or heading paragraph; Do Not Show turns a heading back into Normal; in other styles only the outline level changes (`w:outlineLvl`) |
| Entry fields | `markTocEntry({ text, identifier = 'C', level = 1 })` inserts a `TC "text" \f C \l "N"` field at the end of the selection (Mark Table of Contents Entry); a table with `fields` (`\f`) lists them — `\f id` only the ones of that identifier, `\l "a-b"` the levels, `TC … \n` without the page number. `tocEntrySuggestion()` |
| State | `hasTableOfContents()`, `inTableOfContents()` |

The ribbon has **References › Table of Contents**: the **Table of Contents**
gallery (with Custom Table of Contents and Remove Table of Contents), **Add
Text** (Do Not Show, Level 1–N and Mark Table of Contents Entry) and **Update
Table**, which asks — like Word — whether to update only the page numbers or
the entire table (also F9 with a table in the selection and the button on the
control's tab). The compact bar has them under **Insert › Table of contents**.
The **Table of Contents** dialog has the print and web previews, page numbers,
right alignment, tab leader, hyperlinks, formats, levels, **Options** (styles
and their levels, outline levels, entry fields) and **Modify** (the TOC 1–9
styles). Alt+Shift+O (Option+Shift+O on a Mac) marks an entry.

## Events

| Event | `detail` | When |
|---|---|---|
| `uw-ready` | `{ offline, plugins }` | Initialization finished. |
| `uw-change` | — | The document is about to change (fired before the edit is applied — read the new state on the next frame). |
| `uw-protected` | `{ active, hasFields }` | Protected View turned on or off. |
| `uw-blocked` | `{ reason: 'protected' }` | Header/footer editing was refused because the document is protected. |
| `uw-zoom` | `{ zoom }` | Zoom changed. |
| `uw-styles-change` | — | The style sheet changed (create, modify, rename, delete, undo). |
| `uw-hfmode` | `{ active, kind }` | Entered or left header/footer editing. |
| `uw-cellmode` | `{ active }` | The caret entered or left a table cell. |
| `uw-tabletool` | `{ tool }` | Draw Table, Eraser or Border Painter turned on (`'draw'` · `'eraser'` · `'painter'`) or off (`null`). |
| `uw-borderpen` | `BorderSpec` | The border pen (style, width, color) changed. |
| `uw-sort-error` | `{ reason, message }` | Sort refused (`reason: 'merged'` — the table has merged cells). |
| `uw-notemode` | `{ active, kind, id }` | Entered or left a footnote or endnote. |
| `uw-bookmarks-change` | — | A bookmark was added, moved or deleted. |
| `uw-caption-settings` | — | Caption labels, numbering or AutoCaption changed (save `captionSettings`). |
| `uw-toc-update` | `{ scope: 'caret' \| 'selection' }` | Update Table on the content control's tab, or F9 with a table of contents in the selection. **Cancelable** — `preventDefault()` = the host asks (page numbers only or the entire table) and calls `updateToc(mode)` / `updateFields('selection', mode)`; otherwise the entire table is updated. |
| `uw-toc-menu` | `{ x, y }` | The menu button on the table of contents control's tab was clicked (the bars open the gallery there). |
| `uw-before-input` | `{ text }` | Text is about to be typed. **Cancelable.** |
| `uw-input` | `{ text }` | Text was typed. |
| `uw-comments-changed` | — | A comment was added or removed. |
| `uw-comment-click` | `{ ids }` | Commented text was clicked. |
| `uw-track-changes` | `{ on }` | Track Changes was turned on or off. |
| `uw-markup` | `{ mode }` | Display for Review or Show Markup changed. |
| `uw-revisions-changed` | — | Revisions were accepted or rejected. |
| `uw-font-embedding` | `{ embedded, skipped }` | After saving a .docx with font embedding on. |
| `uw-save-request` | `{ saveAs, format }` | The bars are about to save. **Cancelable** — `preventDefault()` = the host saves. |
| `uw-open-request` | — | The bars are about to show an open dialog. **Cancelable** — `preventDefault()` = the host opens. |
| `uw-dirty-change` | `{ dirty }` | `isDirty()` changed. |
| `uw-formatting-policy-change` | `{ policy }` | `formattingPolicy` (or the `formatting-policy` attribute) changed. |
| `uw-file-drop` | `{ files, clientX, clientY }` | Files were dropped on the element. **Cancelable** — `preventDefault()` = the host handles them (see [Dropped files](#dropped-files)). |
| `uw-side-resize` | `{ start, end }` | The width (px) of the host's side panels (`slot="side-start"` / `slot="side"`) changed — 0 when empty or hidden. |
| `uw-theme-change` | `{ theme }` | The UI theme in effect (`effectiveTheme`: `'light'` · `'dark'`) changed — the page's `color-scheme`, the OS (with `light dark`) or `theme`. |
| `uw-plugin-added` · `uw-plugin-removed` | `{ id }` | Plugin lifecycle. |
| `uw-custom-inline-inserted` | `{ type, data, fallbackText }` | A plugin inline was inserted. |

## Fonts

**Liberation Sans (four variants) is required** — it is the default font and
the substitute of last resort. With the `fonts` attribute, the editor fetches
`liberationsans-regular.ttf`, `-bold`, `-italic` and `-bolditalic` from that
folder. They come in `@universal-office/font-files`, installed with this
package: serve its folder (`node_modules/@universal-office/font-files/`) and
point `fonts` at it.

Other families resolve, in order: fonts embedded in the document → fonts the
host provides → the browser's installed fonts (with their files, via Local
Font Access in Chromium, after `requestSystemFonts()` in a user gesture) →
**metric-compatible open substitutes** from that folder (Calibri → Carlito,
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
import { createMentionPlugin } from '@universal-office/write';

editor.use(createMentionPlugin({
  source: async (query) => (await fetch(`/people?q=${query}`)).json(), // [{ id, label }]
}));
```

Type `@` to open the suggestions (only when `source` is given).

Plugins follow Quill's model: install per instance with `editor.use(plugin)` /
`editor.unuse(id)`, or for every instance with
`UniversalWriteElement.register(plugin)` / `unregister(id)` (connected
instances get it right away; new ones on connect). Registering another plugin
with the same id replaces it; `unregister` leaves alone a plugin the host
installed with `use()`. A conflict in one instance (e.g. an inline type already
taken) is reported with `console.warn` and never stops the element from
connecting. A plugin may declare:

| Member | Description |
|---|---|
| `inlineRenderers` | Inline types (`type`, `toText`, `measure`, `draw`) — the same contract the `<universal-document-viewer>` uses, so one renderer serves both. |
| `setup({ editor })` | Listeners and state; returns the cleanup called by `unuse`. |
| `toolbar({ editor, lang, theme, ui })` | Commands and their places in the bars, like Quill's `modules.toolbar`: `{ commands, compact: { title, menus, groups, trailing }, ribbon: { title, tabs, groups: [{ tab, … }], qat } }`. Items accept `before: '<id>'` to be placed before a sibling. `title` (a bar item, usually a widget) **replaces** the built-in document title (id `title`). `lang` is the bar's UI language (`'en'` · `'pt'` · `'es'`), `theme` the theme in effect when the bar is mounted and `ui` the widget kit (below). Labels take a string or `{ en, pt, es }`; `es` is optional, and without it the Spanish UI shows the English text. Called each time the bar is mounted. |

```js
editor.use({
  id: 'acme.tags',
  inlineRenderers: [{ type: 'acme.tag', toText: (d) => `@${d.label}` }],
  toolbar: ({ editor }) => ({
    compact: {
      groups: [{
        id: 'acme:tags', label: 'Tags', icon: 'person', before: 'extras',
        items: [{ id: 'acme:tags:menu', label: 'Tags', icon: 'person', menu: () => [
          { label: 'Name', onClick: () => editor.insertCustomInline('acme.tag', { label: 'Name' }) },
        ] }],
      }],
    },
  }),
});
```

### The editor's bar as the host app's bar

A host can use the compact bar as its own app bar, Google Docs style — its
title and status at the left of the menu row (or **above** it), its actions at
the right — with no top app bar of its own. Widgets live in the element's shadow root, where
the page's icon fonts (Font Awesome, ligature icon fonts) do not reach, so the
`ui` kit builds buttons and icons with the bar's look: Material Symbols as SVG,
ripple, colors from the tokens (light or dark follows by itself).

| `ui.` | Description |
|---|---|
| `createBarButton({ icon, label, title, variant, size, disabled, onClick })` | `variant`: `filled` (accent) · `tonal` · `outlined` (default with a label) · `text` · `icon` (default without a label; the label becomes the accessible name) · `icon-filled` / `icon-tonal` (round icon button on an accent / tonal background). `size: 'small'`: a 24px pill (status chips) or a 28px icon button. With an icon and a label the space between them is only the gap (Material 3: 16px before the icon, 8px gap, 24px after the label). `label`/`title` take a string or `{ en, pt, es }` (the bar's language; `es` optional, English otherwise). Does not take focus away from the document. |
| `createBarIcon(name, { size, title })` | A Material Symbol in a `<span class="uo-ic-box">`, in the text color (decorative unless `title` is given). |
| `hasBarIcon(name)` | Whether the built-in set has the icon (`send`, `save`, `visibility`, `check_circle`, `error`, `warning`, `folder_open`, `arrow_back`… — or pass a raw `<path…>` in the 0 -960 960 960 viewBox). |
| `createBarRow({ title, actions, leading, titlePlacement })` | A row with the look of the bar's title row — `title` (a node or a string) at the left in `.uo-title-slot`, `actions` at the right, `leading` (an icon) before the title — to build the same "minimal bar" **outside** the editor (loading state, read-only page, preview). `titlePlacement: 'above-menus'` gives it the geometry of the bar with the title above the menus: title on the first line, the second line (the menus' line) empty but keeping its height, `leading` and `actions` spanning both — switching between the editor and the minimal bar does not move the page. It is the default when there is a `title`, as in the compact bar; `'inline'` keeps everything on one line. |
| `barCss` · `barStyleSheet()` · `adoptBarStyles(root)` | The bars' CSS as a string · in a shared constructable `CSSStyleSheet` (null without support) · added once to a document or shadow root (adopted, or a `<style>`). Colors follow the page's `--u-color-*` tokens and `color-scheme`. |

```js
editor.setAttribute('hidden-commands', 'save'); // the host saves (uw-save-request)
editor.use({
  id: 'host.appbar',
  toolbar: ({ editor, ui }) => {
    let status;
    return {
      compact: {
        title: {
          id: 'host:title', // own id: hiding `title` does not hide it
          widget: () => {
            const el = document.createElement('div'); // gets class uo-title-slot
            const name = Object.assign(document.createElement('span'), { textContent: 'Policy.docx' });
            status = ui.createBarIcon('check_circle', { size: 18, title: 'Saved' });
            el.append(ui.createBarIcon('description'), name, status);
            return { el, sync: () => { /* runs on every bar sync, including uw-theme-change */ } };
          },
        },
        trailing: [
          { id: 'host:preview', widget: () => ({ el: ui.createBarButton({ icon: 'visibility', label: 'Preview', variant: 'text', onClick: preview }) }) },
          { id: 'host:save', widget: () => ({ el: ui.createBarButton({ icon: 'save', label: 'Save', variant: 'tonal', onClick: save }) }) },
          { id: 'host:send', widget: () => ({ el: ui.createBarButton({ icon: 'send', label: 'Send for approval', variant: 'filled', onClick: send }) }) },
        ],
      },
    };
  },
});
```

#### Title above the menus

The compact bar is laid out like Google Docs by default (`compact.titlePlacement:
'above-menus'`, the default whenever there is a title): the title row (`compact.title`: name, icons, status chips) **above** the
menu row (File, Edit, View…), an optional `compact.leading` item (the app's
logo or the document icon) at the left spanning both rows, and the
`compact.trailing` actions at the right spanning both rows, centered. The
notice band (`setNotice`) stays between this block and the toolbar, which keeps
the full width; the menus still turn into "☰" and the toolbar groups still
collapse with the width. `titlePlacement: 'inline'` puts the title, menus and
actions on one row instead. Parts: `titlebar`, `leading`,
`title-row`, `menu-row`, `trailing`, `menubar`, `notice`, `toolrow`. In the
ribbon the option is ignored.

```js
editor.use({
  id: 'host.appbar',
  toolbar: ({ ui }) => ({
    compact: {
      titlePlacement: 'above-menus',
      leading: { id: 'host:logo', widget: () => ({ el: ui.createBarIcon('description', { size: 40 }) }) },
      title: { id: 'host:title', widget: () => ({ el: buildTitle(ui) }) }, // name + icons + status chips
      trailing: [
        { id: 'host:preview', widget: () => ({ el: ui.createBarButton({ icon: 'visibility', label: 'Preview', variant: 'text', onClick: preview }) }) },
        { id: 'host:save', widget: () => ({ el: ui.createBarButton({ icon: 'save', label: 'Save', variant: 'tonal', onClick: save }) }) },
        { id: 'host:send', widget: () => ({ el: ui.createBarButton({ icon: 'send', label: 'Send', variant: 'filled', onClick: send }) }) },
      ],
    },
  }),
});
```

The same layout outside the editor (preview, read only):

```js
const ui = await loadBarKit('pt');
shadow.append(ui.createBarRow({
  titlePlacement: 'above-menus',
  leading: ui.createBarIcon('description', { size: 40 }),
  title: titleNode,
  actions: [ui.createBarButton({ icon: 'edit', label: 'Editar', variant: 'tonal' })],
}));
```

Only the built-in editable title has the field look (`.uo-title`: 17px, border on
hover and focus); the host's title — even an `<input>` — only gets `.uo-title-slot`.
Without a `title` contribution the built-in editable title stays. The kit is
loaded with the bars (on demand), so the icon set never weighs on pages that
use the element without them.

Outside the editor (no plugin context), `loadBarKit(lang?)` loads the same kit on
demand:

```js
import { loadBarKit } from '@universal-office/write';

const ui = await loadBarKit('pt');
const shadow = host.attachShadow({ mode: 'open' });
ui.adoptBarStyles(shadow);
shadow.append(ui.createBarRow({
  title: 'Política de compras.docx',
  actions: [
    ui.createBarButton({ icon: 'check_circle', label: 'Publicado', variant: 'tonal', size: 'small' }),
    ui.createBarButton({ icon: 'more_vert', title: 'Mais', variant: 'icon' }),
    ui.createBarButton({ icon: 'send', title: 'Enviar', variant: 'icon-filled' }),
  ],
}));
```

### Side panel

Light DOM children with `slot="side"` (or `slot="side-start"`) are shown
**below** the bars — title, menus, notice, toolbar and ruler — and beside the
pages, like Google Docs' comments pane: the toolbar keeps the full width and
the pages shrink and re-center. The host owns the panel: its own component
(an Angular component, say) in the light DOM, so the page's styles apply to
it; it sets the width and shows or hides it (`hidden`, `display: none`, or
removing it) — an empty or hidden slot takes no space.

```html
<universal-write topbar>
  <app-document-data slot="side" style="width: 320px"></app-document-data>
</universal-write>
```

- **Height and scroll**: the panel sticks below the bars and is as tall as the
  space between the top and bottom bars; it scrolls by itself (its own content
  can also scroll — the slotted element fills the height by default) while the
  pages scroll on. When the pages are wider than the space left (high zoom),
  the panel stays at the visible edge over them.
- **Keyboard, mouse and drops**: what happens in the panel is the host's. The
  editor does not take the focus, move the caret, open its context menu, zoom
  or turn pages (read mode) on clicks, keys and the wheel there, and dropped
  files are not handled (no `uw-file-drop`). Only the app shortcuts (open, save,
  print, find) still work from the panel, as from a field of the bar. Events
  still bubble to the page, so the host's own listeners (overlays, shortcuts) work.
- **Print**: the panel is not part of `print()` nor of a browser print of the page.
- **Theme**: the slotted content inherits the element's `color-scheme`
  (`theme="dark"` included) and the CSS variables set on it.
- **Layout**: `uw-side-resize` (`{ start, end }`, in px) fires when the panels'
  widths change; read mode and the web layout refit. The wrappers are
  `::part(side)` and `::part(side-start)`.

### Notice band

`setNotice(el, { tone })` shows a band of the host's own BETWEEN the title/menu
row and the tools — in the compact bar before the toolbar row, in the ribbon
before the tabs — like Google Docs' and Drive's storage warnings: someone else
is editing, read-only, storage almost full. The element moves into the bar
(shadow root), so it inherits the bar's theme — light or dark, `accent` / one
background color, the bar's font — and the kit's buttons fit in it. `tone`:
`info` (default, a tint of the accent), `warning` or `error`. The band stays in
read mode (`view="read"`), survives switching `toolbar="compact|ribbon"` and
the UI language, is announced by screen readers (`role="status"`), and is
styled with `::part(notice)` or the `--uo-notice-bg` / `--uo-notice-color`
(and `-warning-` / `-error-`) variables. It only shows with `topbar`.
`setNotice(null)` removes it; `editor.notice` is the current element.

```js
const ui = await loadBarKit('pt');
const band = document.createElement('div');
band.style.cssText = 'display:flex;align-items:center;gap:12px;flex:1';
band.append(
  ui.createBarIcon('warning', { size: 18 }),
  Object.assign(document.createElement('span'), { textContent: 'Maria Souza está editando este documento. Você está só lendo.', style: 'flex:1' }),
  ui.createBarButton({ label: 'Tentar de novo', variant: 'text', size: 'small', onClick: retry }),
);
editor.setNotice(band, { tone: 'warning' });
// …
editor.setNotice(null);
```

## Keyboard

Ctrl/⌘ + B · I · U (format), Z · Y (undo, redo), A (select all), E · L · R · J
(alignment), C · X · V (clipboard), Shift+V (paste plain text), Enter (page
break), Shift+Enter (column break), ← → (word), Home · End (document, also from a table cell), Alt+F ·
Alt+D (footnote, endnote; Esc inside a note goes back to its reference), - · Shift+- (optional and
nonbreaking hyphen). F9 updates the fields in the selection (Ctrl+A, F9: all; with a table of contents it asks how — `uw-toc-update`). With `topbar`, also Alt+Shift+O (Mark Table of Contents Entry — Option+Shift+O on a Mac), O (open), S ·
Shift+S (save, save as), P (print), F · H (find, replace), K (link), D (font
dialog), ] · [ (font size), F7 (spelling), Alt+M (comment), Shift+8 (formatting marks), / (shortcuts),
Alt+1 · 2 · 3 (Heading 1–3), Shift+N (Normal), Space (clear character
formatting), Q (clear paragraph formatting), Alt+Shift+S (Styles pane). Tab / Shift+Tab move between table
cells and list levels; Esc turns off Draw Table, Eraser and Border Painter. Ctrl+wheel zooms; Ctrl+click follows a link;
double-click the top or bottom margin to edit the header or footer.

## License

MIT. The fonts (`@universal-office/font-files`) are under the SIL OFL 1.1
and the Apache License 2.0; the spell checking packages carry their own
licenses (MPL 1.1 for Hunspell and the pt-BR dictionary, the SCOWL license for
en-US, GPL 3+ / LGPL 3+ / MPL 1.1+ at your choice for Spanish).
