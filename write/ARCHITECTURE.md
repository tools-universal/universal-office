# Write — Architecture

A word processor with maximum compatibility with the reference app — both in format
(.docx / OOXML) and in **rendering** (layout identical to the reference app's).

Deliverables: a **web component** (`<universal-write>`) and the Universal Write
(Beta) editor in the suite's **desktop app** (`desktop/`, Universal Office (Beta)). On npm: `@universal-office/write` (editor, with
the `./viewer` entry that only registers `<universal-document-viewer>`),
`@universal-office/document-viewer` (viewer only) and `@universal-office/compare`
— see `docs/publishing.md`. On NuGet, the layout engine and .docx editing
ship in `UniversalOffice.Docx` (`dotnet/`).

## Core methodology: the reference app as an oracle

We do not try to guess the reference app's behavior by reading only the ECMA-376 spec (the spec
describes the format, not the layout/editing behavior). Instead:

1. **`tools/word-lab`** drives the reference app through COM automation.
2. Each *experiment* applies ONE operation (typing, bold, Enter, paste, etc.)
   on a known state and saves before/after.
3. The lab extracts the `.docx` files (they are ZIPs), normalizes the XML and generates a **diff** —
   that diff is the observed specification of how the operation changes the structure.
4. For rendering: the reference app exports to PDF/XPS; we rasterize and compare
   pixel by pixel with the output of our layout engine (differential testing).
5. Each experiment becomes versioned knowledge in `tools/word-lab/results/`
   and, later, a regression test in the corresponding package.

## Structure

```
packages/
  docx-core/   Document model + OOXML parse/serialize.
               GOLDEN RULE: lossless round-trip. Parts/attributes we do not
               understand yet are preserved byte for byte (rawXml passthrough).
               Also reads binary .doc (`docx-core/src/doc`: convertDocToDocx) —
               the .doc becomes an in-memory .docx and follows the same path.
  docx-layout/ LAYOUT ENGINE (no DOM): full OOXML cascade, line
               breaking, pagination (widows/orphans, keep with next), tables
               (border bands, vertical cells, split rows), sections
               and columns, headers/footers, notes, fields (PAGE/NUMPAGES/
               SECTIONPAGES/PAGEREF/SEQ/REF and `=` formulas over them), PDF
               links and bookmarks, floating objects with wrap contour, floating
               tables and EMF. Output: page tree → paint items
               (glyphs, rectangles, images, transforms) + lines with
               per-character offsets (cursor/selection) + positioned objects.
               The SAME tree feeds the editor canvas, exportPdf and the .NET
               port (`dotnet/src/UniversalOffice.Docx/DocxLayout`, parity tested).
               Each Word rule is MEASURED against the synthetic oracle
               (`tools/layout-oracle`) and becomes a case in `test/oracle/<group>`.
               See packages/docx-layout/README.md.
               Includes `src/typography` (typographic base: TTF/OTF/TTC parsing
               — cmap, hmtx, kern, GPOS —, metrics, hyphenation and the OLD
               canvas layout, layout="legacy") and `src/pdf-writer` (PDF
               generator: writer, TrueType subsetting, Type0/Identity-H).
               docx-core also carries the DOM-free conversions: `src/export`
               (HTML/Markdown) and `src/odf` (read/write .odt).
  viewer/      Web component <universal-document-viewer> (read-only), same
               engine and same `paintItems` as the editor.
  editor/      Web component <universal-write>. Paints the docx-layout tree on a
               canvas (its own caret, selection and IME — contenteditable CANNOT
               reproduce the reference app's layout); header/footer
               editing and object dragging use the engine's lines/objects.
               Editing = operations on the docx-core model, mirroring
               the XML mutations observed in word-lab. exportPdf uses the
               same engine (fallback: PDF from the canvas).
  compare/     Document diff + web component <universal-write-diff>. Myers/
               histogram engine PORTED from OpenCompare (opaque tokens; fixes
               are synced in both directions). Tokenizes docx-core blocks:
               an image takes part in equality BY BYTE (hash in the key + memcmp);
               equal content with different formatting becomes a 'minor' change
               (formatOnly) without breaking alignment. <universal-write-diff> displays in the
               DOM (selectable text — a decision inherited from the OpenCompare
               viewer), side-by-side in a single grid, with word-level
               intra-paragraph refinement and nested diff of table rows.
tools/
  word-lab/    Oracle: COM experiments + diffs + PDF export for
               visual comparison.
  layout-oracle/ LAYOUT oracle: synthetic .docx cases → Word (invisible
               COM) → PDF → measured lines (<case>.word.json, versioned;
               Word's PDFs stay out of git — they embed Microsoft fonts).
  corpus-lab/  Validation against real documents (outside the repository):
               run-engine.mjs (engine → PDF), compare.py (lines/pages/pixels
               against Word's PDF), sbs.py (side by side). Nothing from the corpus
               goes into git.
```

## Fundamental decisions

- **Canvas, not DOM/contenteditable.** "Identical rendering" requires controlling
  every line break and glyph position. The browser would never break lines
  exactly like the reference app. We build our own line breaker using real font
  metrics (TTF/OTF parsing — hmtx/kern/GPOS), like post-2021 Google
  Docs.
- **The reference app's units internally**: twips (1/20 pt) for layout, EMUs for
  drawing, half-points for font size. Conversion to px only at the moment
  of painting.
- **A data model faithful to OOXML**, not a "pretty" abstraction. The internal
  tree mirrors w:body/w:p/w:r/w:t + props. Abstracting too early is what
  breaks the compatibility of all the other editors.
- **Fidelity > features.** Each new feature only comes in with: a word-lab
  experiment + a round-trip test + (when visual) a comparison with the reference app's PDF.

## Phases

1. **Oracle infrastructure** (word-lab) + docx-core — implemented; incremental
   preservation of unknown OOXML after editing is still a critical gap.
2. **Base layout** — the `docx-layout` engine (canvas + PDF + .NET) validated rule by
   rule against the oracle and against ~1000 real documents with Word's PDFs
   (results in `COMPATIBILITY.md`).
3. **Editor** — caret, selection, IME, clipboard, undo/redo and Web Component in use.
4. **Formatting/document** — styles, lists, tables, HF and sections, partial.
5. **Objects/formats** — images, fields, notes, ODT/PDF/XPS/HTML/Markdown, partial.
6. **Advanced** — inline plugins and track changes implemented (revisions
   in the model, tracked editing and accept/reject measured in Word); shapes and equations
   remain in the backlog.

See `COMPATIBILITY.md` for the audited matrix and `PLUGINS.md` for plugins and
initialization without a backend.
