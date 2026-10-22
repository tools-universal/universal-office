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
| `author` | string | Name recorded on tracked changes and new comments. Without it the bars use the host's user name (Electron: the OS user) or ask once and remember the answer; the bare API falls back to "Author"/"Autor". |
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

Theme the bars with CSS variables on the element: `--uw-font` (UI font),
`--uw-desk` (background behind the pages), `--uo-bar-bg`,
`--uo-bar-container`, `--uo-accent`, `--uo-menu-bg`, `--uo-hover-bg`. Parts:
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

## Spelling

Words are checked as you type with Hunspell (open LibreOffice dictionaries:
pt-BR and en-US, loaded on demand) in a Web Worker, by the language of each
run (`w:lang`, then character style, paragraph style and document defaults;
`w:noProof` is skipped). Misspellings get a red squiggle on screen only (never
in PDF, print or the viewer); right-click one for suggestions, **Ignore All**
and **Add to Dictionary** (kept in `localStorage`). **Tools › Spelling & grammar**
(F7) walks through the errors. Languages without a dictionary are not checked.

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
| `load(bytes, format = 'auto', { protected })` | Opens .docx, .doc (converted) or .odt; `'auto'` detects the format. .docx opens protected (read-only) unless `protected: false`. |
| `newDocument()` | Empty A4 document with Word's blank-document styles, theme and settings (Normal, headings, quotes… and the built-in styles applied on first use). |
| `save(format = 'auto', { images, title })` | `'docx'` · `'odt'` · `'pdf'` · `'xps'` → `Uint8Array`; `'html'` · `'markdown'` → `string`. `'auto'` = the format that was loaded. |
| `print()` | Browser print dialog with the pages (call from a user gesture). |
| `isProtected()` · `enableEditing()` | Protected View. `uw-protected` reports changes. |

## Editing API

| Area | Methods |
|---|---|
| Characters | `toggleRunProp('bold' \| 'italic' \| 'underline' \| 'strike' \| 'allCaps' \| 'smallCaps')`, `toggleVertAlign('superscript' \| 'subscript')`, `setFontFamily(name)`, `setFontSize(pt)`, `growFont(±1)`, `setColor(hex)`, `setHighlight(name)`, `setLink(url)`, `setCharSpacing(twips)`, `changeCase('upper' \| 'lower')`, `clearFormatting()` |
| Paragraphs | `applyStyle(styleId)`, `paragraphStyles()`, `setAlignment('left' \| 'center' \| 'right' \| 'both')`, `toggleList('bullet' \| 'decimal')`, `indent(±1)`, `setLineSpacing(line)`, `setSpaceBefore(twips)`, `setSpaceAfter(twips)`, `setSpecialIndent(...)`, `setIndentRight(twips)`, `setShading(hex)`, `toggleBorder()`; indents and tabs: see [Navigation](#navigation) |
| Format painter | `copyFormat()`, `painterActive()` |
| Insert | `insertImage(bytes, ext)`, `insertPageBreak()`, `insertField('PAGE' \| 'NUMPAGES' \| 'DATE')`, `updateToc()` (see [Table of contents](#table-of-contents)) |
| Page | `setPageSetup({ orientation, size: 'A4' \| 'Letter', margins: 'normal' \| 'narrow' \| 'wide', customMargins, applyTo })` — for the section(s) the selection touches; `applyTo`: `'section'` (default) · `'document'` · `'forward'` (next-page section break at the caret) · `'selection'` (breaks before and after the selection). Changing the orientation rotates the margins. |
| Sections and columns | `insertSectionBreak('nextPage' \| 'continuous' \| 'evenPage' \| 'oddPage' \| 'nextColumn')` (splits the paragraph; the new section before the caret copies the current one and takes its headers/footers), `insertColumnBreak()`, `setColumns('one' \| 'two' \| 'three' \| 'left' \| 'right')` (with selected text, only for it) or `setColumns({ count, spaceTwips, widths, sep, applyTo, startNewColumn })`, `getSection()` → `{ index, count, type, orientation, margins, columns }` |
| Edit | `undo()`, `redo()`, `cut()`, `copy()`, `paste()`, `pastePlain()`, `pasteText(text)`, `selectAll()`, `selectedText()` |
| Find | `findNext(text)`, `replaceAll(text, replacement)` (case-insensitive); the Navigation Pane search: `search()` (see [Navigation](#navigation)) |
| Spelling | `spellCheckEnabled()`, `toggleSpellCheck(on?)`, `spellingAtCaret()`, `spellingSuggestions(m)`, `replaceSpelling(m, text)`, `ignoreSpelling(word)`, `addToDictionary(word)`, `nextMisspelling()` |
| Comments | `getComments()`, `addComment(text, author = this.author)`, `removeComment(id)`, `goToComment(id)` |
| Track changes | `toggleTrackChanges(on?)`, `isTrackingChanges()`, `author` (property), `hasAuthor()`, `acceptChange({ moveNext })`, `rejectChange({ moveNext })`, `acceptAllChanges({ shown, stopTracking })` / `rejectAllChanges(…)` → count, `nextChange()`, `previousChange()`, `getRevisions()` → `{ kind, author, date, dateUtc, text, description, mark, move, story, color }[]`, `acceptRevisionAt(i)`, `rejectRevisionAt(i)`, `selectRevision(i)`, `revisionAtCaret()`, `revisionAuthors()`, `authorColor(name)` |
| Markup | `setMarkupMode('simple' \| 'all' \| 'none' \| 'original')`, `getMarkupMode()`, `setMarkupOptions({ insertionsDeletions, formatting, comments, balloons: 'revisions' \| 'inline' \| 'mixed', authors })`, `getMarkupOptions()` |
| Headers/footers | `enterHeaderFooter('header' \| 'footer')`, `exitHeaderFooter()` — options, galleries and page numbers in [Headers and footers](#headers-and-footers) |
| View | `setView('print' \| 'web' \| 'read' \| 'draft' \| 'outline')`, `getView()`, `setZoom(z)`, `getZoom()`, `toggleMarks()`, `setDarkPage(dark)`, `navigateTo('#bookmark')` |
| State | `stats()` → `{ pages, words, chars, page, paragraph }`, `getSelectionState()`, `currentPage()`, `focusEditor()` |

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
| Styles | `tableStyleList()` · `tableStyleListNow()` → `TableStyleInfo[]` (`name`, `label { en, pt }`, `group`: custom · plain · grid · list), `setTableStyle(name \| null)` (built-ins are added to the file on first use, with Word's definition), `setTableStyleOptions({ headerRow, totalRow, bandedRows, firstColumn, lastColumn, bandedColumns })`, `renderTableStyleThumb(canvas, name, look?)` |
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
  bottom of the page (centimeters with `lang="pt"`, inches otherwise).

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
  Layout), in centimeters with `lang="pt"` and inches otherwise. It shows the
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
Link). Ctrl+click follows a link or a cross-reference inserted as a hyperlink.

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
break), Shift+Enter (column break), ← → (word), Home · End (document, also from a table cell), Alt+F ·
Alt+D (footnote, endnote; Esc inside a note goes back to its reference). F9 updates the fields in the selection (Ctrl+A, F9: all; with a table of contents it asks how — `uw-toc-update`). With `topbar`, also Alt+Shift+O (Mark Table of Contents Entry — Option+Shift+O on a Mac), O (open), S ·
Shift+S (save, save as), P (print), F · H (find, replace), K (link), D (font
dialog), ] · [ (font size), F7 (spelling), Alt+M (comment), Shift+8 (formatting marks), / (shortcuts),
Alt+1 · 2 · 3 (Heading 1–3), Shift+N (Normal), Space (clear character
formatting), Q (clear paragraph formatting), Alt+Shift+S (Styles pane). Tab / Shift+Tab move between table
cells and list levels; Esc turns off Draw Table, Eraser and Border Painter. Ctrl+wheel zooms; Ctrl+click follows a link;
double-click the top or bottom margin to edit the header or footer.

## License

Free for non-commercial use. See LICENSE / the PrivJS listing for terms.
