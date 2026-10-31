# Real-world corpus × Universal Sheet (2026-10-15)

Validation of Sheet against **2,175 unique workbooks** downloaded from the
internet, rendered by our `<universal-sheet>` and compared with
Excel 365 pt-BR (COM oracle). The corpus and the lab live **outside the repository**:
`E:\UniversalSheetTest` (third-party files; see CLAUDE.md). Same
methodology as Slides (`slides/tools/ppt-lab/CORPUS-REPORT.md`).

## Corpus

| prefix | source | workbooks | nature |
|---|---|---|---|
| `lo-`  | LibreOffice core `sc/qa`, `chart2/qa`, `oox/qa` (sparse clone) | 884 | bug reproductions, synthetic |
| `poi-` | Apache POI `test-data/spreadsheet` | 782 | bugs + fuzz (clusterfuzz) |
| `gd-`  | GovDocs1 `xls.zip` (.gov, ~1997–2009), 320 sampled through HTTP Range | 320 | **real, binary .xls** |
| `gdx-` | GovDocs1 `xlsx.zip` (whole) | 36 | real, Office 2007/2010 |
| `web-` | 153 URLs from government agencies/universities (2016–2026) | 153 | **real, modern**: pt-BR 43 (IBGE, BCB, Tesouro, Receita, ANP, CVM…), EN 59, CJK/RTL/others 40, Europe 11 |

Types: 1,099 `.xlsx`, 1,020 BIFF8 (`.xls`), 14 BIFF5, 23 BIFF2–4 without a
container, 10 `.xlsb`, 2 XML 2003.

### Security

1. Windows Defender on everything (`MpCmdRun -Scan -ScanType 3`): **no threats**.
2. Static triage (`_lab/triage.ts`, byte reading only): real type from the
   content, sha256/dedup; macros (vbaProject, `_VBA_PROJECT_CUR`, XLM macro
   sheet, `Auto_Open`, XLM function names), ActiveX, OLE, external links
   (`externalLinks`, SUPBOOK, External rels, UNC → NTLM leak), data
   connections (queries that refresh on open), DOCTYPE/entities (XML bomb),
   zip bomb, encryption, executable in the package.
3. Exploit/fuzz cases from the suites (`sc/qa/.../{pass,fail,indeterminate}`,
   POI clusterfuzz/poc) only go to the JS parser — **never** to Excel.
4. Oracle only for `xlSafe` (1,775), with `AutomationSecurity=3`, no alerts,
   no link updates, ReadOnly, no window, nothing saved; a watchdog that kills only
   the `EXCEL.EXE` with the PID the script itself opened.

## Oracle: Excel's SCREEN, without the clipboard

For each visible sheet (up to 6 per workbook), the region A1..(1280×800 px at 100%)
becomes a **linked picture** (camera) inside an empty chart on a temporary
sheet → `Chart.Export(png)`: it is Excel's screen rendering (gray
grid, AA text, charts, images, filter arrows, comment
indicator), without using the clipboard or changing any system
setting. `meta.json` stores Excel's widths/heights (pt) and the `Range.Text`
of each cell. Discarded: PDF (`ExportAsFixedFormat` — columns come out ~8%
wider, printer metrics) and `CopyPicture` (clipboard).

Our side: `renderRegionToCanvas` paints the same region at 100%, without
headers/selection/panes; the harness is `tools/excel-lab/harness.{ts,html}`.

Measured COM traps: a chart in a scratch workbook created before
opening the workbook crashes Excel (RPC 0x800706BE) after reading `Rows().Height`
— that is why the temporary sheet lives in the workbook itself; `view="pageLayout"` changes
`Range.Width` (Normal mode is forced); cascading failures in a batch are redone
one workbook per instance.

Oracle result: 1,730 workbooks ok, 45 rejected by Excel itself
(invalid format, "o Office detectou um problema" ("Office detected a problem"), timeouts).

## Fidelity

Per-sheet metrics: `blk` = % of 8×8 blocks whose mean differs by > 24 (ignores
antialiasing); `text` = % of non-empty cells whose displayed text matches
`Range.Text`.

| round | .xlsx sheets | median blk | mean blk | text | different geometry |
|---|---|---|---|---|---|
| r2 (before) | 1,238 | 8.70 | 14.40 | 80.6% | 423 sheets |
| r3 (geometry) | 1,238 | 6.32 | 12.70 | 80.6% | 88 |
| r4 (+3 passes, oracle zoom) | 1,254 | 6.25 | 12.56 | 80.8% | 89 |
| r5 (+.xls reader and what came with it) | 1,252 | **5.40** | **11.39** | — | — |

Full rounds with `.xls` (all sheets with an oracle):

| round | sheets | median | mean | p90 | text |
|---|---|---|---|---|---|
| r5 (.xls) | 2,691 | 6.74 | 11.54 | 29.7 | 89.5% |
| r6 (+drawings) | 2,414* | 5.78 | 10.35 | 27.4 | 89.1% |
| r7 (+tables/CF, 1:1 oracle) | 2,692 | 5.26 | 9.03 | 23.9 | 90.0% |
| r8 (+text/formats, charts, .xls shapes) | 2,692 | 0.31 | 4.30 | 14.8 | 98.9% |
| r9 (+calculation engine: recalculation on open, TEXT/fractions) | 2,692 | **0.29** | **4.15** | **14.6** | **99.4%** |

r9 by source (median/mean): gd 0.31/3.85 · gdx 0.63/6.76 · lo 0.17/2.27 ·
poi 0.02/2.67 · web 2.66/9.32. The displayed text goes up because the screen now shows
what Excel shows on open — it recalculates the workbook in several cases (rule
measured below) and the cache stored in the file goes stale.

\* round run concurrently with the oracle re-export (renders lost).
In r8 by source (median/mean): gd 0.31/3.88 · gdx 0.63/6.76 · lo 0.22/2.66 ·
poi 0.02/2.77 · web 2.72/9.34. What went in: tokenized number formatting
engine (1,709 Excel cases, ported to .NET), Range.Text by column
width with GDI widths, text position re-measured in the 1:1 oracle (shared
row baseline), automatic row height with wrapped text,
"number stored as text" triangle; charts with data from the cells, chartex
(Office 2016), trendlines, pie of pie, labels with fields,
userShapes, Excel's axis density; full OfficeArt shapes from .xls,
CF12/CFEX, GELFRAME and date axis in the .xls charts.

Pending (r8): row height `ht` without customHeight — Excel sometimes keeps
the stored height (.xls: 91% of the rows; our re-fit gets 96% right, but misses
~480 rows where the stored one applies; no simple rule separates the cases — neither
"unmeasured font" nor dyDescent/fileVersion in the .xlsx); missing CJK fonts
(kostat, 12843-1); World Bank combo charts; doughnut with outside labels;
3D in the .xls charts; error bars.
In r7 by source (median/mean): gd 7.93/9.93 · gdx 6.60/12.52 ·
lo 2.73/5.89 · poi 3.15/7.90 · web 10.39/14.34. 1:1 oracle:
`Chart.Export` reserved a 1 px frame and squeezed the image by ~2 px; now the
chart and the image come out 1.5 pt larger and W×H is cropped (1 px border left out
of the comparison).

r5 with the `.xls` files: **2,691 sheets** in 1,677 workbooks — median 6.74, mean 11.54,
displayed text equal to Excel's in **89.5%** of 297 thousand cells. By source
(median/mean): gd 8.15/10.78 · gdx 8.95/14.37 · lo 4.57/10.04 · poi
4.44/9.76 · web 12.52/17.05.

### `.xls` reader (BIFF8/BIFF5)

`openSpreadsheet` recognizes the Compound File and converts it in memory to the
equivalent OOXML package (`sheet-core/src/xls/`), which then follows the same
path as `.xlsx`: cells, SST with CONTINUE and runs, FONT/FORMAT/XF/PALETTE/
XFEXT (theme colors), rows/columns/merges/window, hyperlinks, comments,
images (PNG/JPEG/DIB), shapes and text boxes (`xdr:sp`), charts (BIFF8
substream → `c:chartSpace` of the single engine), formula text (96% decompiled),
conditional formatting, validation, autofilter. 1,026 of 1,051 open; the remaining 25
(encrypted, fuzz, BIFF2–4) fail with a friendly message.
Before the reader no `.xls` opened; now gd median 8.2. The
synthesized package, saved as `.xlsx`, opens in Excel (40 of 40; column A text
equal in 97.7%).

## Measured rules (synthetic workbooks in the oracle)

Grid geometry (`sheet-core/src/grid-metrics.ts`, tables in
`excel-metrics-data.ts` generated by `gen-grid-metrics.mjs`):
- `<col width>` → px by the maximum digit width (MDW) of the **Normal** font
  (it is not always 7: Calibri 12 = 8, Arial 12 = 9, Verdana 10 = 8); default
  width ⌈(baseColWidth·MDW + 2⌈MDW/4⌉ + 1)/8⌉·8.
- Row without `customHeight`: Excel **redoes the auto-fit on open** and ignores the
  stored `ht` — max of the cells' fonts (empty cells with a style too; empty ones
  without a cell use the column style or the Normal font), rich runs,
  superscript/subscript, wrapping (lines × font height) and +1 px per
  `thickTop`/`thickBot` (real borders do not count).
- Height per font has no formula (VDMX/hinting; Verdana is not even monotonic):
  table per ppem 4–96 for 54 families; missing font = Arial.
- Missing row: without `<sheetFormatPr>` 15 pt; with `customHeight` the
  `defaultRowHeight`; otherwise the Normal font row (`defaultRowHeight` is
  ignored). `customHeight` truncates to the pixel.
- A font with `<scheme val="minor|major">` = the **theme** font (a 宋体 with
  scheme minor measures and draws as Calibri).

Robustness: `<row>`/`<c>` without `r` (implicit position) and the `x:` prefix of the
OpenXML SDK; merges with a spatial index (50 thousand merges: 13 s → 2.6 s).

## Calculation engine (`sheet/packages/calc`)

In-house formula engine, canonical inside (English names, "," and "."
as in the file) with the language layer kept separate (`src/i18n`: pt-BR measured in
Excel, en-US; other languages come later). All 535 worksheet functions
of the Excel 365 catalog registered; parser/serializer of the OOXML
text (`_xlfn.`, `_xlpm.`, `@`/SINGLE, `#`/ANCHORARRAY, `:.`…), dynamic
arrays and spilling, LET/LAMBDA, names, tables, external links (cache),
dependency graph with incremental recalculation, volatiles, cycles/iterative and
the legacy `@` measured on 508 functions.

| measure (oracle: Excel 365 pt-BR through COM) | result |
|---|---|
| per-function case banks (`test/oracle/*.cases.json`) | 35,299 cases; divergences accepted only with a measured reason (`*.known.json`) |
| .xlsx corpus: formula cells equal to Excel's full recalculation | **99.90%** (65,464/65,531, 237 workbooks) |
| .xls corpus: formula text = `Formula2` / value = Excel | 98.8% / 99.7% (380 workbooks, 40 thousand formulas) |
| .xlsx round trip (read → recalculate → save → Excel opens) | 237/237 with no repair; `Formula2` 99.999% |
| incremental × full recalculation | 0 differences in 62,526 cells |
| pt-BR language (FormulaLocal ↔ canonical) | 100% of the 609 functions; 99.995% of 19,576 corpus formulas |

Measured recalculation-on-open rule (Excel 16, CalculationVersion 191029):
manual mode does not recalculate; full recalculation without `fileVersion appName="xl"`,
without `calcId` or with `calcId` < 191028, with `fullCalcOnLoad`/`forceFullCalc`,
or with a volatile function in the text of a formula without `ca="1"`; otherwise only the
formulas with `ca="1"` or without `<v>`. On screen: what Excel shows on open
matches the stored cache in 92.8% of formula cells and our
plan in 99.65%.

Pending: FORECAST.ETS (Excel's optimizer not identified; 66 cells in
one workbook), last digits of RATE/IRR/XIRR/YIELD, some distribution
inverses; BIFF5 formulas; the CSV/HTML/PDF exporters and the .NET port still
use the cache; copy/paste/fill/insert rows (reference adjustment)
once the UI has them.

## Reproduce

Scripts in `E:\UniversalSheetTest\_lab` (outside git):

```
node _lab/zip-sample.mjs <url-zip> <dir> <n> [seed]             # GovDocs sample by Range
run-ts.mjs _lab/triage.ts E:/UniversalSheetTest                  # triage + manifest.json
node _lab/xl-driver.mjs 3 [regex|@list]                          # Excel oracle (RETRY=1 redoes failures)
node _lab/corpus-render.mjs <tag> 3 [regex|@list]                # our render (SRC_ROOT=<worktree>/sheet)
node _lab/corpus-compare.mjs <tag>                               # metrics + worst.html + texts-diff.json
node _lab/geom.mjs <tag>                                         # widths/heights × Excel
node _lab/sbs.mjs <tag> <id> <sheet> <out.png> [scale] [x y w h] # ours | Excel
node _lab/gen-metrics*.mjs + measure.ps1                         # synthetic measurements
```

`run-ts.mjs` = `slides/tools/ppt-lab/ppt-binary/run-ts.mjs`.
