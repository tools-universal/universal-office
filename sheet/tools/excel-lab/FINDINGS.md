# Observed Excel rules (from experiments)

Each rule cites the experiment that shows it. These rules are the behavior
specification the editor must replicate. Excel 16.0 pt-BR.

## Structural model

- The default name of the first sheet is LOCALIZED: pt-BR "Planilha1"
  (`<sheet name="Planilha1" sheetId="1" r:id="rId1"/>`) — not "Sheet1" [001].
- `workbook.xml` references sheets by `r:id` → `xl/_rels/workbook.xml.rels`
  maps to `worksheets/sheetN.xml`. Relationships in order: rId1
  (worksheet), rId2 (theme), rId3 (styles), rId4 (sharedStrings) [001].
- Save noise: `xr:revisionPtr@documentId` (GUID) and the GUID of
  `workbookView@xr2:uid` change between saves — they are not deterministic [001].
  Our lossless round-trip ignores this (preserves bytes; does not regenerate
  workbook.xml). BOM: `sharedStrings.xml` is written WITH a UTF-8 BOM; the other
  template parts without a BOM [001].

## Cells and values

- Setting a string on an empty sheet **creates** `xl/sharedStrings.xml` (new
  file), adds an `<Override>` to `[Content_Types].xml` and the relationship
  `rId4`→`sharedStrings.xml` to `xl/_rels/workbook.xml.rels` [001].
- A string becomes `<c r="A1" t="s"><v>0</v></c>`: `t="s"` = shared string type,
  `<v>` = (0-based) index into `sharedStrings.xml` [001].
- `sharedStrings.xml`: `<sst count="N" uniqueCount="U"><si><t>texto</t></si>…`;
  `count` = total references, `uniqueCount` = unique entries [001].
- Row: `<row r="1" spans="1:1" ...>` — `spans` = first:last column with
  data in the row. `x14ac:dyDescent="0.25"` on every row/sheetFormatPr [001].
- **Number** (e.g. 42): `<c r="A1"><v>42</v></c>` — **no `t` attribute**
  (default = `n`), value directly in `<v>`, does NOT create sharedStrings.xml [002].
- **Formula** (e.g. =1+2): `<c r="A1"><f>1+2</f><v>3</v></c>` — `<f>` holds the
  formula **without the "="**, `<v>` holds the cached calculated value [003].
- Remaining types to confirm: `b`/`e`/`str`/`inlineStr`/`d`.

## Feature showcase (samples/showcase.xlsx)

Generated through COM with ALL features (except macros) to serve as the rendering
oracle. Structures confirmed in the XML:

### Geometry
- **Column width**: `<cols><col min max width="18.71" customWidth="1"/></cols>`
  — `width` in **character units** of the Normal font. Approx. px@96dpi =
  `round(width*7+5)` (MaxDigitWidth≈7). Hidden: `hidden="1"`.
- **Row height**: `<row ht="34" customHeight="1"/>` — `ht` in **points**
  (×96/72 → px). Hidden: `hidden="1"`.
- **Freeze**: `<sheetView><pane xSplit="1" ySplit="1" topLeftCell="B2"
  state="frozen"/></sheetView>` — xSplit=columns on the left, ySplit=rows at the top.

### Merges, borders, colors
- **Merge**: `<mergeCells><mergeCell ref="A1:D1"/><mergeCell ref="A3:B4"/>
  </mergeCells>`. The origin (top-left) holds value/style; the covered cells only have `s`.
- **Borders** (styles.xml): `<border><left style="thin"><color indexed="64"/>
  </left>...</border>`. styles: thin/thick/medium/dashed/dotted/double.
- **Colors** come as `rgb="FFC00000"` (FF=alpha+RGB), `theme="1"` (dk1=black is
  the font default), `indexed="64"` (auto=black). Default Office theme palette
  mapped; full theme1.xml is future work.

### Number formatting / dates
- Custom numFmt in `<numFmt numFmtId="164" formatCode="..."/>` + built-ins (14=
  date etc.). **Caution: formatCode is locale-dependent** when written through
  COM on a pt-BR system (e.g. `"R$"\ #.##000`, dates with an escaped `\y`). In
  portable formats, `\x` = literal; Excel treats `\`+date-letter as a token.
- Date tokens: y/yy/yyyy, m/mm/mmm/mmmm (month; becomes **minute** after h), d/dd/
  ddd/dddd, h/hh, s, AM/PM.

### Formulas (renders the cached value)
- `<c><f>SUM(B2:B5)</f><v>46</v></c>` — `<f>` without "=", `<v>` = calculated cache.
- Formula string: `t="str"` + `<v>texto</v>`. External ref: `<f>Planilha!B3</f>`.

### Conditional formatting
- Color scale: `<cfRule type="colorScale"><colorScale><cfvo type="min"/><cfvo
  type="percentile" val="50"/><cfvo type="max"/><color/>...</colorScale></cfRule>`
- Data bar: `type="dataBar"` with `<dataBar><color/></dataBar>`.
- Highlight (cellIs): `type="cellIs" operator="greaterThan" dxfId="0"` + `<dxfs>`
  (`<dxf><fill><patternFill><bgColor rgb="..."/></patternFill></fill></dxf>`).

### Others (parsed/preserved, rendering in the future)
- **Table** (ListObject): `xl/tables/tableN.xml` + `<tableParts r:id>` on the sheet.
- **Charts**: `xl/drawings/drawingN.xml` (anchor) + `xl/charts/chartN.xml`.
- **Validation**: `<dataValidations><dataValidation type="list" .../></dataValidations>`.
- **Comments**: `xl/commentsN.xml` (text) + `<legacyDrawing>` (anchors).
- **Hyperlinks**: `<hyperlinks><hyperlink ref location display/></hyperlinks>`.
- **calcChain.xml**: calculation order (ignored — we use the cache).

## Styles and formatting

- **Default Normal font = "Aptos Narrow" 11pt** (`<name val="Aptos Narrow"/>`,
  `<sz val="11"/>`, color theme="1"), scheme "minor" — same Aptos family as
  Word, but the Narrow variant. This font defines the column width unit
  [004].
- Formatting (e.g. bold) **appends** records, never reorders: append of a
  `<font>` with `<b/>` to `fonts` → append of `<xf fontId="1" applyFont="1">` to
  `cellXfs` → the cell gets `s="1"` (index of the new cellXfs). The
  pre-existing cellXfs (index 0 = Normal) are immutable [004].
- `cellXf` referenced by the cell: `<xf numFmtId fontId fillId borderId xfId
  applyFont/applyBorder/.../>` [004].
- Save noise: `dcterms:modified` (core.xml) and `xr:revisionPtr@documentId`
  (workbook.xml) change on every save — not deterministic. BOM: `styles.xml` and
  `sharedStrings.xml` written WITH a UTF-8 BOM; the other template parts without a
  BOM. The lossless round-trip ignores the noise (preserves bytes; does not regenerate) [001,004].

## Grid layout (to validate against the numeric oracle)

- Column width in **character units of the Normal font** (Calibre/Aptos
  11), not pixels. `Range.ColumnWidth` ↔ `c:col width` in `sheetFormatPr`.
- Row height in **points** (`c:row ht`). `Range.RowHeight`.
- Autofit, merged cells (`c:mergeCell`), frozen panes (`c:pane`).

## Pixel fidelity (harness: excel-screenshot.ps1 + capture-ours.mjs + pixel-compare-green.mjs)

Visual parity pipeline (oracle: real Excel through COM):
- **Excel → PNG**: `CopyPicture(xlScreen, xlBitmap)` of the UsedRange captures the
  SCREEN rendering (correct scale). Run in STA (`powershell -STA`) for the clipboard.
- **Ours → PNG**: Playwright headless screenshot of the canvas, cropping the headers
  (`getUsedRangeRect()`), `capture=true` suppresses the selection (CopyPicture does not include it).
- **Compare**: `pixel-compare-green.mjs` — **GREEN channel**. Reason: CopyPicture
  captures ClearType; only R/B have subpixel fringes, **G is clean grayscale** (native
  resolution). Comparing G(excel) vs luminance(ours) removes the ClearType noise.

### Traps found (each one fixed)
- **Print ≠ screen**: `ExportAsFixedFormat`/xlPrinter scales ~8% and positions text
  differently (print padding). **Do not compare** with a screen renderer. Use xlScreen.
- **The Normal font "Aptos Narrow" is not on disk** — extracted through a Word embed
  (`extract-aptos-narrow.ps1`: docx with `EmbedTrueTypeFonts` without subsetting → `.odttf`
  → deobfuscated by `w:fontKey`). 4 variants, ~240KB each (full Latin).
- **Font size is in POINTS**: `sz val="11"` = 11pt = 14.67px@96dpi (NOT 11px!).
  This was the highest-impact bug — text 25% smaller than Excel's.
- **Column width**: correct formula `floor((256*w+18)/256*7)` with MDW=7 (Aptos
  Narrow). `w*7+5` overestimated by ~5px/column.
- **Row height**: `ht` is the real height EVEN without `customHeight` (wrap
  auto-fit). Apply it whenever `ht` is present.
- **General alignment**: numbers/dates (numeric type) on the RIGHT, text on the left
  — based on the cell type, not on the formatted string (formatted dates contain "/").
- **Date/time built-ins**: numFmtId 14-22, 45-49 etc. were missing → the cell fell back to the
  raw serial (e.g. "46190.6"). Full map in `BUILTIN_FMTS`.
- **formatCode is locale-dependent** when generated through pt-BR COM: dates come with an escaped `\y`
  (Excel renders the LITERAL "yyyy"). `\x` = always literal (in Excel too).

## Number/date formatting oracle (oracle-format.json — 74 cases, pt-BR)

Captured by writing **canonical OOXML** formatCodes into an `.xlsx` and reading
`Range.Text` in real Excel (gen-oracle-xlsx.mjs + read-oracle-xlsx.ps1). Rules
pinned in the `sheet-core/src/format.ts` engine (format.test.ts):

- **pt-BR display locale**: decimal `,`, thousands `.`. `#,##0.00` on
  `1234567.89` → `1.234.567,89`. General `3.14159` → `3,14159`.
- **General fits in ~11 characters** (numeric part, the sign does not count); it overflows
  to scientific: `123456789012` → `1,23457E+11`; `999999999999` → `1E+12`;
  `0.6666…` → `0,666666667` (11 chars); `1e-10` → `1E-10` (decimal would take 12 chars);
  `100000000` (9 digits) stays whole. The scientific mantissa trims trailing zeros.
- **`;` sections**: 1=pos(+automatic sign for neg), 2=neg(abs, sign from the template),
  3=zero, 4=text(`@`). `#,##0;(#,##0)` with −5 → `(5)`. `"pos";"neg";"zero"` with
  0 → `zero`. A literal-only section does not inject the number.
- **`%`** scales ×100 AND is a literal: `0.00%` 0.1234 → `12,34%`.
- **Rounding** half-up: `0,005` `0.00` → `0,01`; `0,004` → `0,00`.
- **Scientific**: `0.00E+00` → `1,23E+04` (exponent min. 2 digits); engineering
  `##0.0E+0` aligns the exponent to a multiple of the number of integer digits → `12,3E+3`.
- **Fractions** (Stern-Brocot, den ≤ 10^(number of `?`)−1): `# ?/?` 0,5 → ` 1/2`,
  2,25 → `2 1/4`; `# ??/??` 0,333 → `1/3` (with `?` padding).
- **Dates** (read-oracle confirms with canonical tokens): `m/d/yyyy` → `6/30/2025`,
  `dddd` → `segunda-feira` (Monday), `mmmm` → `junho` (June), lowercase `mmm`/`ddd`. `[h]:mm`
  (elapsed) 1,5 → `36:00`. `m` is minute after `h`/before `s`, otherwise month.
- **`@` on a numeric cell** = value as text (General): 42 `@` → `42`.
- **`####`** (width): a NUMBER/DATE that does not fit becomes `#`+; TEXT overflows into
  empty neighbors. Confirmed in smoke.xlsx (B4/B7/B8 = `########` in Excel).
- **`date1904`** (`<workbookPr date1904>`): calendar serials shift by +1462.
- **`activeTab`** lives in `<bookViews><workbookView activeTab>` (not on the root).
- Color **`tint`** (HSL): white −25% → `#BFBFBF`, −15% → `#D9D9D9`, −5% →
  `#F2F2F2` (zebra bands). tint<0 → L·(1+tint); tint>0 → L·(1−tint)+tint.

### Current state (Datas sheet, showcase.xlsx)
- Content: **identical cell by cell** to Excel (audited through Range.Text).
- Dimensions: **exact** (305×141 vs 304×140).
- Remaining structural difference (~59% G channel): thin AA Chrome×GDI + ~1-2px offset
  in the text — requires empirical calibration of advances (as WordNext did with fonts).
