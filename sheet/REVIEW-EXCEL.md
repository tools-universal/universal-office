# 1:1 fidelity review — Universal Sheet × reference app

## Audit 2026-07-25 — 1:1 tables, theme chart engine, 1M-cell perf

New tools: `tools/excel-lab/gap-tour.mjs` (screenshots per sheet of the
showcase in the headless component), `gen-giant.mjs` (xlsx with 200k and 1M cells),
`perf-giant.mjs` (load/paint/scroll + heap through CDP `Performance.getMetrics`).

1. **1:1 tables (ListObject)**: parse of `xl/tables/tableN.xml` through
   `<tableParts>`; built-in `TableStyleMediumN` family replicated per accent of the
   THEME (N=1 gray; N=2..7 → accent1..6). Header = accent + white bold text
   (only when the cell uses the default font — explicit formatting wins);
   bands = accent with **HSL tint 0.8** (the reference app's formula, measured
   in the PDF oracle: accent1 `#156082` → band `#C0E6F5`; ours `#C1E5F5`,
   ±1/255 from rounding); autofilter arrows drawn in the header.
2. **Chart engine synced with Slides** (today's upgrade): palette =
   accents 1..6 of the workbook's `theme1.xml` (it was a fixed Office 2013 palette),
   centered legends, holeSize, nice ticks with headroom, line radar,
   real XY scatter, area, pt-BR decimals; `#D9D9D9` frame (the reference
   app draws a border on embedded charts; PowerPoint does not).
3. **Confirmed in the tour**: frozen panes ALREADY render 1:1 (4-quadrant
   viewport) — the old pending item was out of date.
4. **Performance (giant sheet)**: the cell-by-ref index (`rowMap`) was
   rebuilt ON EVERY paint — 1M entries per frame:
   | file | load | paint before | paint after | scroll after | heap used |
   |---|---|---|---|---|---|
   | giant-200k (2000×100) | 226ms | 17.4ms | **2.5ms** | 2.7ms | ~23MB |
   | giant-1m (10000×100) | 787ms | 75.3ms | **2.4ms** | 2.4ms | ~98MB |
   Per-sheet cache invalidated in `loadXlsx`/`selectSheet`/`setCellValue`
   (incl. cell removal); `condNumMap` likewise (only with rules on the sheet).
   124/124 tests green; showcase with no regression in the gap-tour.


Review conducted with the **reference app as oracle** (reference app 16.0 pt-BR, through
COM automation). Methodology: capture the reference app's exact behavior, compare
it against the implementation, fix, and **pin it with a regression test** anchored in the
oracle. Oracle locale: pt-BR (decimal `,`, thousands `.`, lowercase pt names).

## Oracle harness created (reusable)

| Tool | Role |
|---|---|
| `tools/excel-lab/gen-oracle-xlsx.mjs` | Generates `.xlsx` with **canonical OOXML** formatCodes (locale-independent) — 74 cases (General, decimals, thousands, %, currency, accounting, multi-section, scientific, fractions, dates, time, elapsed, text). |
| `tools/excel-lab/read-oracle-xlsx.ps1` | Opens in the reference app and reads `Range.Text` (localized display) cell by cell → `results/oracle-format.json`. |
| `tools/excel-lab/audit-format.mjs` | Audits the `format.ts` engine against the oracle. |
| `tools/excel-lab/gen-smoke-xlsx.mjs` + `smoke-render.mjs` | Renders new behaviors (overflow, ####, [Red], dates) on the headless canvas for inspection. |

> **Documented methodological trap:** the COM `.NumberFormat` setter is
> contaminated by the locale (in pt-BR it reads the `.` of `0.00` as a thousands
> separator → `#.000`, and `yyyy` becomes a literal because the localized year token is
> `a`). The reliable oracle is to **write the canonical formatCode in the `.xlsx` and read
> `Range.Text`** — which is what `read-oracle-xlsx.ps1` does.

## Fixed (verified 1:1)

### 1. Number/date formatting engine — rewritten (`sheet-core/src/format.ts`)
The renderer's old `formatNumeric`/`formatDate` were in **en-US** and did not
handle sections, General, scientific, fractions or accounting. New **pure** engine
in core, **74/74 cases matching the reference app** (`test/format.test.ts`):

- **pt-BR locale**: `1234567.89` `#,##0.00` → `1.234.567,89` (was `1,234,567.89`).
- **Faithful General**: fits in ~11 characters and switches to scientific when it overflows —
  `123456789012` → `1,23457E+11`; `0.6666…` → `0,666666667`; `1e-10` → `1E-10`.
  (It used to return the raw `<v>`.)
- **Multi-section** `pos;neg;zero;text`: `#,##0;(#,##0)` with −5 → `(5)`;
  `0.0;-0.0;"--"` with 0 → `--`.
- **numFmt color**: `[Red]` etc. is extracted and returned separately (the renderer paints it).
- **Scientific** `0.00E+00` → `1,23E+04`; engineering `##0.0E+0` → `12,3E+3`.
- **Fractions** `# ?/?` (Stern-Brocot): `0,5` → ` 1/2`, `2,25` → `2 1/4`.
- **Accounting** `_-"R$"* #,##0.00_-;…`: `_` = space, `*` = fill, section.
- **Dates/time**: y/m/d/h/s tokens, AM/PM, pt-BR names; **elapsed time**
  `[h]:mm` (1,5 → `36:00`); month×minute disambiguation.
- The reference app's **"round half up" rounding** (`0,005` `0.00` → `0,01`),
  robust to binary noise (without the `toFixed` bug).

### 2. Grid rendering (`packages/sheet/src/universal-sheet.ts`)
Verified against the reference app on the same `samples/smoke.xlsx` (Range.Text + capture):

- **Text overflow** into **empty** neighboring cells (left/right/center
  according to alignment); it stops at an occupied neighbor — before, all text was
  clipped to its own cell.
- **`####`** when a **number/date** does not fit in the column (the reference app never
  overflows a number) — confirmed: B4/B7/B8 of the smoke file = `########` in the reference app.
- **Underline and strikethrough** now drawn (they were in the model, never painted).
- **Gridlines drawn BEFORE** the cells (the reference app's order): fills
  cover the grid under the cell; overflowing text passes over the neighbors.
- **`showGridLines="0"`** honored (hides the grid).
- **numFmt color** ([Red] on negatives) takes priority over the font color.

### 3. Styles and colors (`sheet-core/src/styles.ts`, `read.ts`)
- **Color `tint`** applied (HSL): lightens/darkens theme/indexed/rgb — exact on the
  gray axis (white −25% → `#BFBFBF`, −15% → `#D9D9D9`, −5% → `#F2F2F2`, the
  default zebra bands). Before, the tint was ignored (flat base color).

### 4. Model / reading (`sheet-core/src/read.ts`, `model.ts`)
- **`activeTab`** read from the right place (`<bookViews><workbookView activeTab>`),
  not from the `<workbook>` root. Also fixed the `Math.min(0, …)` bug that **always
  opened the 1st sheet** → it now opens on the active sheet.
- **`date1904`** read (`<workbookPr date1904>`) and passed on to the date engine
  (epoch +1462 days) — before, dates from Mac files came out 4 years + 1 day off.
- **Column width** applied even **without `customWidth`** (the reference app always applies
  `width`; `customWidth` only marks "manual adjustment" for autofit).

## Prioritized pending items (next phase)

Real items confirmed in the review, outside the scope already fixed (renderer/reading).
**High** priority first:

| Sev | Area | Item | Note |
|---|---|---|---|
| High | Render | **Frozen panes** (`<pane>` is parsed, not rendered) | requires a split viewport (4 quadrants) + scroll offsets. |
| High | Render | **Rich text runs** (several fonts in one cell) not drawn | use `SharedString.runs` per segment. |
| High | Style | **`cellStyleXfs`/`xfId` inheritance** and the semantics of `applyX` | `xf` inherits from the named style when `applyX=0`. |
| High | UX | **Range selection** (Shift+click/arrow, drag) | the current model is 1 cell `{col,row}`. |
| High | UX | **Ctrl+Arrows** (jump to the data edge), **Ctrl+Home** (→A1) | |
| High | UX | **Click on the header** selects the whole column/row | |
| Medium | Style | Real **`theme1.xml`** (palette is hardcoded) | tint already applied on top. |
| Medium | Geom | `sheetFormatPr` `defaultColWidth`/`defaultRowHeight`/`baseColWidth` | defaults currently fixed at 64px/20px. |
| Medium | Render | Non-solid fill patterns, `gradientFill`, `gray125` (fillId 1 must not paint) | |
| Medium | UX | Selecting a merged cell selects the whole range; PageUp/Down by visible page (currently a fixed 10) | |
| Medium | Editing | Cell editing (double-click/typing) — `onDblClick` is a placeholder | editor phase. |
| Low | Style | Legacy **indexed** palette (0–56) almost empty | rare in current files. |
| Low | Geom | Fixed row header width (the reference app grows it with the number of digits) | |

### Non-issue (verified)
- `colWidthPx` — **correct** formula (oracle: 8.43 ch → 48pt → 64px; 10 → 75px;
  18.71 → 136px). The "col-width-formula-wrong" finding was **rejected** on verification.

## Audit 2026-06-20 — `showcase.xlsx` (user's oracle)

`samples/showcase.xlsx` is now synced with the user's file at
`{User}\OneDrive\Documentos\showcase.xlsx` (29 614 bytes, 14 sheets, **generated
by Excel's real COM**). It is the 1:1 fidelity oracle for this round.

| Sheet | Oracle content | Status in Universal Sheet | Priority gap |
|---|---|---|---|
| Inicio | TOC with hyperlinks to other sheets | ✓ renders OK, hyperlinks visible (click → navigation not yet) | — |
| TextoENumeros | Types / number formats / text wrapping | ✓ `format.ts` covers 77/77 |  |
| Datas | Date/time formats | ✓ through `formatValue` |  |
| Formatacao | Bold, italic, color, fill, alignment | ✓ through `styles.ts` |  |
| Bordas | Border and grid styles | ✓ through `paintBorder` |  |
| Mesclar | Horizontally and vertically merged cells | ✓ `merges` + `mergedAreas` |  |
| Formulas | SUM/AVERAGE/IF/VLOOKUP/COUNTIF | ✓ values computed by Excel are kept in `<v>` — we display the result | formula evaluation engine is future work |
| CondFormat | Color scale, data bar, highlight rule | ✓ `colorScale` / `dataBar` / `cellIs` |  |
| Validacao | Data validation dropdown | ✗ does not draw the dropdown arrow on the cell | parse `<dataValidations>` + UI arrow |
| Tabela | Excel "Table" (ListObject) with banded rows + autoFilter | △ data shows, **but bands + autoFilter arrow are missing** | parse `xl/tables/table1.xml` + `tableStyle` styles |
| Graficos | chart source data + 3 charts (chart1/2/3) embedded through `drawings1.xml` | ✗ chart does not draw | parse `drawings1.xml` + chart engine shared with Slides |
| Comentarios | 2 comments (A1 and A3) with text + author | **✓ SINCE THIS AUDIT**: red triangle shows (1:1) | tooltip on hover still missing |
| Congelar | frozen pane (1 row at the top) | △ `<pane>` parse OK (verified in a test), **split viewport does not render yet** | 4-quadrant viewport + separate scroll offsets |
| Ocultos | hidden rows/columns + groups (outline) | ✓ `hiddenRows`/`hiddenCols` applied |  |

### Delivered 2026-06-20 — Shared chart engine (commit pending)

6. Standalone **`chart-engine.ts`** (copied into sheet-core + slides-core):
   - Parse of `<c:chartSpace>` → `ChartModel` (title, type, series with name/values/color,
     categories). Supports combo (multiple `*Chart` blocks in the same `plotArea`).
   - Types covered: **barChart** (col), **lineChart**, **pieChart**, **doughnutChart**,
     **scatterChart**, **radarChart** + "render coming soon" fallback.
   - Explicit colors in `<c:ser><c:spPr><a:solidFill><a:srgbClr>` (1:1 with PowerPoint);
     default Office fallback palette.
   - Renders directly into `CanvasRenderingContext2D` given a rect `(x,y,w,h)`.
7. **drawings1.xml parser**:
   - Sheet rels → drawing target → parse `<xdr:twoCellAnchor>` (from/to col,row +
     EMU offsets) → resolves `<c:chart r:id>` through the drawing's own `_rels`.
   - Worksheet.charts = `DrawingChart[]` with anchor + raw chartXml.
   - The view's `extMaxCol/extMaxRow` grow so the chart area fits in the scroll.
8. **Render in `Graficos`** — 3 charts (bar/line/pie) show up on the sheet to the right
   of the `Mes/Vendas` (Month/Sales) table with the correct values 100/250/180/320/290/410;
   EMU→px coordinates using `xs/ys` + 9525 EMU/px.
9. **+1 test** (`aba Graficos lê 3 charts ancorados`, "Graficos sheet reads 3 anchored charts"): checks consistent
   anchors (`from.col < to.col`), types `[bar-col, line, pie]` and ≥6 points
   in the first series. Sheet total: **97/97 green**.

### Delivered 2026-06-20 — Edit mode (commit pending)

5. **Edit mode 1:1 with Excel**:
   - **F2** / **Enter** / **double-click** on a cell → input overlay with the
     current value (caret at the end, Excel-style).
   - **Direct typing** with the cell selected (any 1 printable char
     without Ctrl/Alt/Meta) → enters editing, replacing the content.
   - **Delete/Backspace** → clears the cell.
   - **Enter** inside the editor commits + moves down one row; **Shift+Tab/Tab**
     commits + moves one column; **Esc** cancels.
   - **Formula bar**: Enter in the demo's formula bar → `setActiveCellText`
     writes to the active cell.
   - **Type-aware mutation**: `=...` → formula (`Cell.formula`), plain number
     (accepts "," or ".") → type `n` with `Cell.value`, the rest → `inlineStr` with
     `Cell.inlineString`. Empty text removes the cell (Delete semantics).
   - **Merge-aware**: editing any covered cell opens at the merge's ORIGIN
     (and the input takes the `cx × cy` of the whole merge).
   - **maxRow/maxCol grow** automatically when editing a cell
     outside the used range.
   - 4 mutation tests on the `setCellValue` engine
     (`describe: Edição: motor de mutação do worksheet`, "Editing: worksheet mutation engine").

### Delivered in this audit (commit pending)

1. **1:1 comment indicator**: `#D7373F` triangle with a 5px side (zoom 1) in the
   top-right corner of each cell with a comment, exactly as
   Excel draws it. Verified in `Comentarios` (A1 and A3) — screenshot @200% in the
   session logs.
2. **Comments parser** (`sheet-core/read.ts → readComments`): resolves
   `xl/commentsN.xml` through the sheet's `_rels`, returns `Comment[]` with `ref`,
   plain `text` and `author` (index resolved). Modeled by
   `Worksheet.comments`.
3. **Fix to `XlsxPackage.resolveRelTarget`**: it now resolves `../` targets
   (parent dir navigation). Without it, `xl/worksheets/_rels/sheetN.xml.rels` pointing
   to `../comments1.xml` did not reach `xl/comments1.xml`.
4. **3 tests pinned on `showcase.xlsx`** (`roundtrip.test.ts`):
   - 14 sheets with exact names (rejects any regression in `readWorkbook`).
   - 2 comments in `Comentarios` with refs `[A1, A3]` + author `Eric Kono`.
   - `Congelar` reports `pane.xSplit + pane.ySplit > 0` (covers the parse).

### Next prioritized gaps (with session task IDs)

- **#8** — drawings1.xml + charts (Graficos) + tables (Tabela). **Chart engine shared with Slides** (which has charts on 4 slides of the animated showcase).
- **#9** — frozen panes renderer + validation dropdown + comment tooltip.
- **#10** — Edit mode (double-click cell → input → write back) — covers the explicit "editing" in the goal.

## How to reproduce

```bash
# regenerate the oracle (needs the reference app installed)
node tools/excel-lab/gen-oracle-xlsx.mjs
powershell -ExecutionPolicy Bypass -File tools/excel-lab/read-oracle-xlsx.ps1
# audit the formatting engine
npm run build --prefix packages/sheet-core && node tools/excel-lab/audit-format.mjs   # PASS 74 FAIL 0
# tests (includes the oracle pin)
npm test --workspaces --if-present
# headless render of the new behaviors
node tools/excel-lab/gen-smoke-xlsx.mjs
node tools/dev-server.mjs &   # :8124
node tools/excel-lab/smoke-render.mjs   # → tools/excel-lab/results/smoke.png
```
