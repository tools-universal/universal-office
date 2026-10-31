# Universal Sheet — Architecture

A spreadsheet that is **1:1 compatible with the reference app**: same format
(`.xlsx` / SpreadsheetML), same on-screen rendering. Sibling of UniversalWrite
(Write) inside the Universal Office monorepo — same methodology, same rigor.

Organizing principle (learned with Write): **abstracting early is what breaks
compatibility in every Office editor**. Every competing editor loses
fidelity because it invents a "pretty" model that does not mirror the real format.
Here the internal model mirrors OOXML literally.

## Golden Rule — lossless round-trip

An `.xlsx` is a ZIP of parts (OPC). Every part is preserved **byte for byte**;
we only regenerate a part when an edit actually changes it. The **order of the
parts in the ZIP is preserved** — the reference app does not require it, but diffs stay clean and
our regressions stand out. Unknown parts/attributes flow through
intact (rawXml passthrough). This is the structural basis of compatibility.

## Methodology — the reference app as oracle (3 layers)

The specification is not a document; it is the observed behavior of the reference app,
captured through COM automation (`New-Object -ComObject Excel.Application`).

### Layer A — Structural differential (XML mutation)
`tools/excel-lab/` drives the reference app through COM:
1. Each **experiment** (`experiments/NNN-*.ps1`) defines `$Description`,
   `$Setup` (optional) and `$Operation` (one atomic operation: set a value,
   apply a format, insert a formula, merge cells…).
2. `run-experiment.ps1` opens the reference app, snapshots `before.xlsx`, runs the op,
   snapshots `after.xlsx`.
3. Both are unzipped, all XML is re-indented (`XDocument`), and
   `git diff --no-index` generates `sheet.diff` + `report.md`.
4. **The diff IS the specification** of how that operation mutates SpreadsheetML.
   Findings go into `FINDINGS.md`.

### Layer B — Numeric layout oracle
The reference app uses its own unit system (column width in characters of the
Normal font, row height in points). We validate our grid engine against
the reference app's numbers: `Range.Width`, `Range.Height`, `ColumnWidth`,
`RowHeight`, `UsedRange`, and printed page breaks
(`HPageBreaks`/`VPageBreaks`).

### Layer C — Pixel fidelity (rendering)
The reference app exports **PDF** (`ExportAsFixedFormat`, Type=0). We rasterize through WinRT
`Windows.Data.Pdf` (PowerShell 5.1 — pwsh does not project WinRT). Our canvas
renders and compares with `pixel-compare.mjs` (grayscale + 3×3 blur + tolerance).
The structural metric (blur) separates structure from antialiasing phase between
rasterizers.

## Packages (npm workspaces monorepo)

| Package | npm | Purpose |
|---|---|---|
| **sheet-core** | `@universal-office/sheet-core` | Model + OOXML parse/serialize. `XlsxPackage` (lossless container), `parseXml`, reading of workbook/worksheets/sharedStrings/styles/theme, pt-BR `formatValue` (1:1 oracle). |
| **sheet** | `@universal-office/sheet` | The `<universal-sheet>` web component. Renders the grid on canvas: cells, styles, merges, frozen panes (4 quadrants), rich text, charts, hyperlinks, inline editing. |
| **sheet-core/export** | (inside `@universal-office/sheet-core`) | Pure exporters (browser+node) in `sheet-core/src/export`: CSV/TSV (`;`, RFC 4180, CRLF), Markdown (GFM), HTML (inline styles), PDF and Markdown through office-converter (`vendor/`), ODS (OpenDocument) and SpreadsheetML 2003. Displayed values through pt-BR `formatValue`. |
| **calc** | `@universal-office/sheet-calc` | Calculation engine (formulas, functions, recalculation) — see `calc/`. |
| _sheet-layout_ (future) | `@universal-office/sheet-layout` | Extracted grid engine (today the layout lives in the web component; pure functions in `grid-layout.ts`). |

> **Build**: the `sheet-core` exporters (PDF and Markdown) use the
> office-converter from `vendor/` through its `dist/` — in a clean checkout run
> `npm run install:converter` at the root before building sheet. Sheet no longer
> depends on any package from `write/`.

## Stack

TypeScript ES2022/ESM, `fflate` (sync zip/unzip), `pngjs` (pixel diff),
Vitest (co-located `*.test.ts` tests), `tsc` builds, `esbuild` app/demo,
desktop app (Electron, `desktop/`, the suite with the three editors). No React/Vite
— the editor is a web component rendering on canvas.

## Conventions

- **Folder**: `sheet/` (parallel to `write/`). **Product**: Universal Sheet.
  **npm scope**: `@universal`. **Web component**: `<universal-sheet>`.
- Imports use the `.js` extension even in `.ts` sources (ESM + moduleResolution bundler).
- `index.ts` is a barrel re-exporting the public API (`export type` for interfaces).
- Docs in English; code comments in **pt-BR**; identifiers in English.
- Experiments named `NNN-kebab-name.ps1`, results mirrored in `results/NNN-*/`.

## Rendering pipeline (target)

```
.xlsx bytes
   │  XlsxPackage.load (fflate unzip)
   ▼
XlsxPackage (parts map, order preserved)
   │  readWorkbook / readSharedStrings / readStyles / readWorksheet
   ▼
Workbook (sheets, cells with style/formula/value)
   │  <universal-sheet>.layout()  ◄── grid engine + pagination
   ▼
SheetLayout[] (absolute positions: columns, rows, merged cells)
   │  <universal-sheet>.paint()    ◄── draws the grid on a <canvas> per sheet
   ▼
visible sheet
```

Why canvas, not DOM: a browser will not reproduce the reference app's cell
rendering (overflow/clip, autofit, vertical alignment, grids)
faithfully. We control every pixel.

## Editing and bars (chrome)

`<universal-sheet>` edits the workbook through the SAME model used for reading (no parallel
model): the calculation engine writes the values into `worksheet.rows`, and the
toolbar operations change the model directly and mark what to rewrite.

- **Range selection**: active cell (`sel`) + corner (`corner`) +
  range (`range`, expanded until it contains whole merges); whole columns
  go down to row 1048576 and whole rows out to column XFD.
- **Undo/redo**: each action stores the before/after of the cells it touches
  (edit text + style) and, when it changes the structure, a snapshot of the sheet
  (`<col>`, `<row>` metadata, merges, panes, gridlines, view widths and
  heights). Restoring a cell means retyping the edit text into the engine
  (formulas recalculate) and restoring the style. Loading a workbook clears the stack.
- **Copy/paste**: the tab-separated text goes to the system
  clipboard (`copy`/`cut`/`paste` events of the canvas); the internal copy carries the
  edit text with the RELATIVE references shifted
  (`SheetCalc.copyText`: `parseFormula` at the source → `printFormula` at the
  destination → `toLocal`) and the style.
- **Formatting**: the `XfPool` (sheet-calc.ts), which already derived xfs for the
  formats that input applies, also derives font, fill, borders and
  alignment; on save it appends the new `<font>`/`<fill>`/
  `<border>`/`<xf>` to styles.xml — the new font copies the XML of the template font (theme
  color, family, scheme) changing only what changed; the `<xf>` copies the source one
  (protection, extLst) — without touching anything else. Whole columns/rows get
  `<col style>` / `<row s customFormat>`, as Excel does.
- **Saving**: `updateWorksheetXml(xml, ws, { merges, sheetView })` rewrites
  `<sheetData>`/`<cols>` and, only in the sheets where they changed, `<mergeCells>` and the
  1st `<sheetView>` (`showGridLines` and the frozen `<pane>`; a plain split from the
  file stays). File › New is `blankWorkbook()` (sheet-core/blank.ts);
  Insert Sheet appends the part and reopens the saved workbook.
- **Bars** (`chrome*.ts`, on-demand chunk; only with `topbar`/`bottombar`):
  declared on top of the `shared/ui/src/toolbar` framework like Write's —
  commands (`chrome-commands.ts`, only over the element's public API),
  compact and ribbon layouts (`chrome-layout.ts`), widgets, dialogs, formula
  bar, sheet tabs and status (`chrome-panels.ts`), app (`chrome-app.ts`:
  open/save/export/print, title, unsaved changes) and the optional `host`
  (`chrome-host.ts`). Icons the shared set lacks
  live in `chrome-icons.ts` (raw SVG from the same source). Plugins
  (`use`/`register`, `toolbar`) and `hidden-commands` follow Write's model.
  The bar texts are `{ en, pt, es }` tables (`chrome-labels.ts` and the
  `L(en, pt, es)` of the commands and layouts), chosen by `lang`; formulas
  do not change with the interface language — they follow `formula-locale` (function
  names in pt-BR or in English; there are no Spanish names).
