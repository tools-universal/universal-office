# @universal-office-pro/sheet

The `<universal-sheet>` web component — an **.xlsx editor** that draws the grid
to a **canvas** with the look of Microsoft Excel: column widths and row heights
from the workbook, number formats, fonts, borders, merged cells, conditional
formatting, charts, images and shapes. Formulas are recalculated by a built-in
engine with Excel's functions.

![The spreadsheet: navigating sheets, editing cells and formulas](../../../site/assets/gifs/sheet.gif)

- Opens .xlsx and .xls (Excel 97–2003, converted in memory); saves .xlsx,
  rewriting only what was edited
- Inline cell editing typed like Excel (numbers, dates, percentages, currency,
  booleans, formulas) with function autocomplete
- Recalculation of dependent cells across all sheets on every edit
- Formula language and number separators follow the user's locale
  (`=SUM(A1,1.5)` or `=SOMA(A1;1,5)`)
- Frozen panes, hidden rows/columns, hyperlinks, comments, right-to-left sheets
- Zoom, resizable rows and columns (double-click to autofit)

## Installation

Obtain the package from **PrivJS** and follow the setup instructions there.

The package is self-contained — no dependencies. Serve these folders next to
`index.js`:

| Path | What it is |
|---|---|
| `index.js` | The component (registers `<universal-sheet>` on import) |
| `chunks/` | Parts loaded on demand |
| `fonts/` | Open fonts used as metric-compatible substitutes (see [Fonts](#fonts)) |

```js
import { FontResolver } from '@universal-office-pro/sheet';

FontResolver.shared().configure({ baseUrl: '/office/fonts' }); // the package's fonts/

const sheet = document.querySelector('universal-sheet');
sheet.loadXlsx(new Uint8Array(await (await fetch('/budget.xlsx')).arrayBuffer()));
sheet.addEventListener('us-selection', (e) => console.log(e.detail.ref, e.detail.edit));
```

```html
<universal-sheet style="display:block; height:100vh"></universal-sheet>
```

Give the element a size with CSS — it fills its box.

## Attributes and properties

| Attribute / property | Description |
|---|---|
| `formula-locale` / `formulaLocale` | Locale of formulas and numbers (BCP 47). `pt*` uses Portuguese function names, errors and booleans (`=SOMA`, `#N/D`, `VERDADEIRO`); anything else uses English (`=SUM`, `#N/A`, `TRUE`). The decimal separator comes from the region; the argument separator is `;` when the decimal is `,`. Default: the browser's language. |
| `lang` | UI language (`en` · `pt`). Without it: Portuguese if the browser prefers it, otherwise English. |
| `fileName` | File name reported by `CELL("filename")`. Set before loading. |
| `shouldRecalcOnOpen` | `(workbook) => boolean`. Return `true` to recalculate everything on open; otherwise the values saved in the file are shown, like Excel. |
| `onSelectionChange` | Callback form of `us-selection`. |
| `activeCellEditText` | What a formula bar should show for the active cell. |

## Methods

| Method | Description |
|---|---|
| `loadXlsx(bytes: Uint8Array)` | Opens .xlsx or .xls on the workbook's active sheet. Throws on an invalid file. |
| `saveXlsx(): Uint8Array` | Commits any edit in progress and returns the .xlsx. Parts that were not edited are kept as they were. |
| `getSheetNames()` · `selectSheet(i)` | Sheets (tabs). |
| `goToRef('B12')` | Selects a cell. |
| `setZoom(z)` | Zoom, 0.4–3. |
| `setCellValue(col, row, text)` | Writes text as if typed (1-based column and row): `''` clears, `=…` is a formula. Returns `{ ok: true }` or `{ ok: false, message }`. |
| `setActiveCellText(text)` | Same, for the active cell (formula-bar commit). |
| `beginEdit(col, row, text?)` · `commitEdit()` · `cancelEdit()` | Inline editor. |
| `attachFormulaBar(input)` | Adds function autocomplete to your formula-bar `<input>`; returns a detach function. |
| `renderRegionToCanvas(sheet, canvas, cols, rows)` | Draws a range at 100% (no headers) — e.g. to export a PNG. |
| `drawingsReady(): Promise<void>` | Resolves when fonts, images and drawings are ready. |

A minimal formula bar:

```js
const bar = document.querySelector('#formula');
sheet.attachFormulaBar(bar);
sheet.addEventListener('us-selection', () => { bar.value = sheet.activeCellEditText; });
bar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sheet.setActiveCellText(bar.value);
});
```

## Events

| Event | `detail` | When |
|---|---|---|
| `us-selection` | `{ ref, display, formula, edit, ghost }` | The selected cell or sheet changed (also after edits). `ghost` = part of a spilled array. |
| `us-edit` | `{ ref, text }` | A cell was written. |
| `us-entry-error` | `{ message }` | Input was refused (invalid formula, part of an array) — Excel's message, in the formula language. |
| `us-zoom` | `{ zoom }` | Zoom changed. |

## Fonts

The default font of a workbook (Aptos Narrow, Calibri…) defines the column
widths, so it matters. Families resolve, in order: fonts the browser can see
by name (installed or declared with `@font-face`) → **metric-compatible open
substitutes** from the folder given to `FontResolver` (Calibri → Carlito,
Cambria → Caladea, Arial → Liberation Sans, Times New Roman → Liberation
Serif, Courier New → Liberation Mono) → Liberation Sans. Serve the package's
`fonts/` and point `FontResolver.shared().configure({ baseUrl })` at it.

## Keyboard and mouse

Arrows move (leaving merged cells by their edge), Home · End go to the first
and last column, PageUp · PageDown move 10 rows, typing starts editing,
F2 or Enter edit the current content, Delete · Backspace clear. While editing:
Enter commits and moves down, Tab · Shift+Tab commit and move sideways, Escape
cancels. Wheel scrolls (Shift for horizontal); drag a header border to resize,
double-click it to autofit; double-click a cell to edit; hover a red-cornered
cell to read its comment.

## Current limitations

One cell is selected at a time (no range selection), and there is no copy and
paste yet.
