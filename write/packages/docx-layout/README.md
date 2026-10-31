# @universal-office/docx-layout

Write's layout engine, with no DOM. It takes the document from `docx-core`
(`readFullDocument`) and a font provider and returns pages with paint
items in twips. The same tree feeds:

- the canvas of `<universal-write>` (editing, caret and selection);
- `exportPdf` (`pdf.ts`);
- the .NET port (`dotnet/src/UniversalOffice.Docx/DocxLayout`). Parity is tested with
  normalized dumps: if you change the engine here, port it there and regenerate the dumps
  (`tools/gen-parity-layout.mjs`).

```ts
const full = readFullDocument(DocxPackage.load(bytes));
const res = layoutDocument(full, fontProvider);   // { pages: LayoutPage[] }
const pdf = renderPdf(res);                        // Uint8Array
```

Each `LayoutPage` carries:
- `items`: glyphs, rectangles, paths, images, clips and transforms,
  already in z order (header/footer → behind text → text → in front);
- `hfItems`: how many items at the start of `items` belong to the header/footer;
- `lines`: paragraph ref, offsets and per-character `chars`, for caret,
  selection and click;
- `objects`: positioned floating objects, for selection and dragging.

## How a rule gets into the engine

1. **Measure in Word**, never guess. `tools/layout-oracle/cases/<group>.mjs`
   generates synthetic `.docx` files. `node tools/layout-oracle/run.mjs <group>` asks
   Word (invisible COM) for the PDF of each one and writes `test/oracle/<group>/<case>.word.json`
   (versioned). Word's PDFs stay out of git because they embed Microsoft fonts.
2. Implement and check with `node tools/layout-oracle/report.mjs <group> --verbose`.
3. `vitest run`: `oracle.test.ts` requires Δbaseline ≤ 0.3 pt in every case.
4. Run the real corpus (outside the repository) with `tools/corpus-lab`:
   `run-engine.mjs` → `compare.py` → `sbs.py`. Do not accept regressions.

## Measured Word rules (oracle)

Each item has cases in `test/oracle/<group>` (in parentheses).

**Text and lines**
- Widths in Word's internal unit, 1/4096 pt (`emwidth`, `gwfit`):
  - each glyph measures floor(advance × size × 4096 / upm): exact in fonts with 2048
    units per em, up to 1/4096 pt less in those with 1000/2000 (installed or embedded);
  - `w:w` scale: integer average width floor(xAvgCharWidth × w/100) and each advance
    round(advance × that width / xAvgCharWidth), in font units;
  - `w:spacing` rounded to the unit, with no scaling;
  - line limit: column/cell width and each indent (right, left, first
    line) rounded separately; the word fits if the sum ≤ limit.
- Kerning also applies to spaces (`kern`).
- In compat ≤ 14 there is no compression in justification (`compat-text`, `justify*`).
- Tabs (`tabs`):
  - a tab only breaks the line when the next stop is a default one, past the margin, and there is
    content after it;
  - custom stops past the margin are honored;
  - in compat ≤ 14 with custom stops, the text runs past the margin.
- A `w:br` at the end of the paragraph creates its own empty line.
- The list marker only contributes its ascent (`markers`).
- Missing font (`fontsub`): uses the altName; otherwise falls back to Cambria (roman or
  outside the fontTable) or Calibri (swiss/modern/auto).
- Line grid (`docgrid`):
  - height = max(pitch × line/240, ⌈natural/pitch⌉ × pitch), with the text centered;
  - in atLeast, the grid box goes at the bottom.

**Pagination**
- Widow/orphan: a 3-line paragraph whose split would leave an orphan moves
  whole to the next page (`pagination`).
- The extra line spacing of "multiple" can go past the bottom margin (`pagefit`).
- An EMPTY paragraph that carries the section break does not move to the next page: it stays
  hanging below the margin (`sectfit`).
- Keep with next applies between table rows. A heading with
  keepNext before a table stays with its first row(s) (`keeptbl`).
- Page breaks inside a cell, header/footer and text box are
  ignored.
- Column balancing at a continuous section break:
  - two columns: the smallest height at which everything fits (`colbal`);
  - three or more (`colbal3`): the 1st column reaches the average of the content (the line
    that crosses the average stays in it), the middle ones go up to its height and the last
    takes the rest — it can exceed the 1st. Near a full page Word does not match
    the 1st to the others by the smallest height.

**Tables**
- Border bands (`tables`):
  - each row boundary has the width of its thickest border, and the last
    row adds the bottom band;
  - exact height includes the top band;
  - in compat 15, grid0 = left + bwL/2;
  - in compat ≤ 14, the text of the 1st cell sits at tblInd.
- Floating table (`ftable`):
  - position from the anchors; the text wraps around it;
  - anchor in the text: moves down below floating objects that block it;
  - if not even the 1st line of text fits, it moves whole to the next page;
  - otherwise the rows (even a tall row) split, and the rest continues at the
    top of the next page.
- Table that flows from one column to another (`coltbl`): the rows of the
  continuation sit at the x of the NEW column (from the 2nd column to the 1st of the next
  page, and from the 1st to the 2nd).

**Floating objects**
- Wrapped floating objects anchored in a body paragraph are positioned
  before the lines: the paragraph itself wraps around them (`selffloat`).
- `behindDoc` is z order only. With square/tight/top-and-bottom wrapping, the
  text wraps around the object the same way (`selffloat`).
- Paragraph-relative object that would go past the bottom margin (`selffloat`):
  - if it can move up to the margin without crossing the lines of its own
    paragraph, it moves up;
  - otherwise, the paragraph moves with it to the next page.
  - With no wrapping (wrapNone), it overflows.
- Header/footer (`hffloat`):
  - absolutely positioned floating objects go first; the header text wraps
    around them, and tables move down below them;
  - in compat ≤ 14, header/footer floating objects push no text away,
    not even the body's.
- A text box with `wrap="none"` + auto-fit takes the width of the text.
  The fitted height is the content's (the stored `cy` is ignored).
- "Inside"/"outside" on an EVEN page (by the displayed number) (`inside`): horizontally
  inside = right and outside = left, and the inside/outside margins
  swap sides; vertically inside = bottom and outside = top — with or without
  mirror margins, for text boxes (`wp:align`) and floating tables
  (`tblpXSpec`).
- Rotated box with square wrapping (`rotwrap`): between 45° and 135° (and between 225°
  and 315°) the text wraps around the box with width and height swapped around the
  center; outside that range, around the unrotated box.

**Header, footer and fields**
- Headers and footers are inherited between sections (`hf`).
- Fields updated in the PDF: PAGE, NUMPAGES, PAGEREF, SEQ, REF, including those
  nested in a table of contents (`fields`); also SECTIONPAGES, per section
  (`test/page-fields.test.ts`).
- NUMPAGES (`numpages.ts`) counts the physical pages, MINUS ONE when the body
  has a cover page from the gallery (block sdt with `w:docPartGallery`
  "Cover Pages") AND the 1st section starts numbering at 0 (`w:pgNumType
  w:start="0"`, which Word writes when inserting the cover page). Without the gallery,
  with another start, or with start=0 only in a later section: physical pages.
  SECTIONPAGES (pages of the page's section) never leaves it out. The layout's
  total is still the physical one. Measured in Word 365 (gallery cover, 8
  pages, start=0 → "1 de 7" ("1 of 7")).
- Formula field (`field-formula.ts`): `{ = { NUMPAGES } - 1 }` (the "total
  without the cover") is recalculated as Word does — always in the header/footer, in the body
  only with a field nested in the code. Small, safe evaluator: numbers
  (pt-BR notation), `+ - * /`, parentheses and sign over PAGE/NUMPAGES/
  SECTIONPAGES/SECTION and nested formulas; result with up to 2 decimal places
  (`1,33`), `\# "00"` and `\* roman`/`ROMAN`/`alphabetic`/`ALPHABETIC`/`Arabic`.
  Everything else (functions, bookmarks, cells, division by zero) keeps the
  cached result. The code, with the nested fields in braces, is kept in
  `Run.fieldCode`.
- Line numbering (`lnnum`):
  - the 1st number is start + 1;
  - right-aligned at column − distance (auto = 360);
  - tables and paragraphs with suppressLineNumbers do not count.
- Automatic text color turns white over dark shading (paragraph
  or cell shading).

## Known differences from Word

Not reproduced yet (JS and .NET engines):

- Font precedence: the engine uses the font EMBEDDED in the document before the
  installed one; Word prefers the installed one (or the one from the Office cloud) when it has
  both.
- Mirror margins (`w:mirrorMargins`) and gutter (`w:gutter`): read and
  preserved, but not applied to the layout (only "inside"/"outside" of floating
  objects swap sides on an even page).
- Rotated box positioned above its own anchor paragraph: rotated wrapping
  (`rotwrap`) applies to the box inside the paragraph; above it the position
  still differs.
- Data-bound content controls (`w:dataBinding`): they show the content
  stored in the control; Word restores the value from the bound XML when it opens the file.
