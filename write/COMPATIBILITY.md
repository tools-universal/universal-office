# Word ↔ Write matrix

Status audited on 2026-07-11; layout/PDF re-audited on 2026-10-11 (the
`docx-layout` engine, see “Real corpus” below). “Complete” requires evidence in `.docx` and, when
visual, a comparison with Word/PDF/XPS. This matrix is the authoritative backlog; full
parity is not done yet.

| Area | Status | Current evidence | Remaining gap |
|---|---:|---|---|
| Open/save DOCX | ✅ | lossless writing (`source.ts`/`lossless.ts`, `lossless.test.ts`); real corpus: 867/868 save byte for byte without editing and, when edited, without losing hyperlinks/bookmarks/fields/notes/sdt/equations/drawings; Word opens the 777 edited ones without repair | an edited table loses markers at row/cell level; a field that spans paragraphs (table of contents) edited by hand goes back to raw |
| Open .doc (binary) | 🟡 | `docx-core/src/doc` (convertDocToDocx) + .NET DocBinary tests; real corpus | saving is still in .docx; rare features of the binary format |
| Text, Enter, Backspace | ✅ | word-lab 001/003/009 + `editing.test.ts` | — |
| Undo/redo | 🟡 | implementation in the editor | integration tests for tables, notes and custom inlines are missing |
| Clipboard/IME | 🟡 | implementation in the preview | rich clipboard is internal only; system HTML/RTF is not preserved yet |
| Font/size/bold/italic/color | ✅ | word-lab 002/005/008/010 | — |
| Underlines/strikethroughs | 🟡 | `underline-strike.test.ts` | the UI does not expose all of Word's gallery |
| OpenType/kerning/line breaking | ✅ | `linebreak-oracle.test.ts`, XPS and empirical tables | coverage limited to Aptos/Calibri |
| Pagination and breaks | 🟡 | oracle `pagination`/`pagefit`/`breaks`/`keeptbl`/`sectfit` + real corpus | table row breaks in rare cases; documents with fields that change size |
| Paragraphs/alignment/indents/spacing | 🟡 | word-lab 006 + tests | tabs/indents/lists in all localized styles are missing |
| Styles | 🟡 | real styles.xml + `styles-pagebreak-hf.test.ts` | full creation/editing of the styles gallery |
| Lists | 🟡 | word-lab 007 + numbering.xml | multilevel/arbitrary formats and numbering restart |
| Tables | 🟡 | oracle `tables`/`keeptbl`/`ftable` (border bands, vertical cells, floating tables split across pages) + `table-serialize.test.ts` | structural editing; content autofit in extreme cases |
| Inline/floating images | 🟡 | oracle `objects`/`selffloat`/`hffloat`/`hfgroup` (wrap contour, rising up to the margin × pushing the paragraph down, mode 14) + corpus | "tight" contour by the polygon; editing anchor/wrap through the UI |
| Sections/columns/orientation | 🟡 | `sections.test.ts`, catalog | all section break types and continuous balancing |
| Headers/footers/fields | 🟡 | oracle `hf`/`hffloat`/`fields` (inheritance between sections, PAGE/NUMPAGES/PAGEREF/SEQ/REF) + HF editing through the engine | rare complex fields |
| Footnotes/endnotes | 🟡 | parser and catalog | editing, numbering/restart and layout of long cases |
| Comments | 🟡 | `comments-toc.test.ts` + side UI | replies, resolved state, dates and Word's modern integration |
| TOC/bookmarks/hyperlinks | 🟡 | catalog and local update | incremental preservation of all bookmarks/complex fields |
| Equations | ❌ | textual fallback only | 1:1 OMML, editing and math layout |
| Shapes/WordArt/SmartArt/charts | ❌ | not modeled | parser, layout, editing and round-trip |
| Track changes | 🟡 | `revisions.test.ts` (46 operations redone and compared with Word's XML; accept/reject = Word), oracle `revisions` (final view and All Markup), colors/bars measured in Word's PDF, Word's `Doc.Revisions` reads what we write | list numbering in markup (old number struck through), table/cell/section property revisions (only preserved), moves created by editing |
| Common content controls | 🟡 | generic reading; plugin `w:sdt`; wrapper preserved when editing | Word's dropdown/date/checkbox/repeating section; an edited control with `w:dataBinding` does not update the bound XML (Word restores the value on open) |
| Plugins/custom inline | ✅ | per-instance API, mention, `custom-inline.test.ts`, real Word | extend to paragraph/table-level blocks |
| Web Component without a backend | ✅ | `offline.html`: `fetch` blocked, embedded fonts, canvas ready | reduce the size of the self-contained bundle (currently: ~8.8 MB) |
| Web Component lifecycle | ✅ | cleanup of `resize` and of the caret timer; reconnection supported | extend the automated mount/unmount smoke test |
| Export PDF (JS and .NET) | ✅ | same engine as the canvas; .NET identical to JS (layout dumps and PDF bytes); real corpus × Word's PDFs | see “Real corpus” |
| HTML/Markdown/ODT/XPS | 🟡 | package suites + plugin fallback | full visual matrix per format; ODT with frames |
| Accessibility | ❌ | basic proxy textarea | semantic tree, screen reader reading and advanced navigation |
| Real-time collaboration | ❌ | outside the current core | operations/CRDT model and presence |

## Real corpus (2026-10-19)

993 documents from a real system (.docx/.doc/.odt — outside the repository),
laid out by the engine and compared with the PDFs generated by Word itself
(`tools/corpus-lab`). The editor canvas, the browser's `exportPdf` and the
.NET port give the same result (same layout tree).

References redone on 2026-10-19 with Word 16.0.20430 (updated on
2026-10-18), a new Word session per document
(`tools/corpus-lab/word-pdfs.mjs`). One document (.doc with IRM) cannot be opened even by Word
without a credential: the metrics apply to the other 992.

| Metric | Old canvas layout | 1st engine version | 2026-10-11 | Engine today |
|---|---:|---:|---:|---:|
| same number of pages | — | 816 / 995 | 950 / 995 | **992 / 992** |
| identical line breaks on all pages | — | — | — | **989 / 992** |
| identical lines (mean / median) | ≈ 0.49 (median) | — | 0.973 / 1.000 | **0.999 / 1.000** |
| documents with ≥ 99% identical lines | — | 465 | 680 | **981** |
| pixel overlap with Word (F1 mean / median) | 0.16 / 0.14 (sample of 40) | — / 0.833 | 0.875 / 0.988 | **0.996 / 0.999** |
| vertical deviation of lines (median) | — | — | 0.08 pt | **0.06 pt** |

The page count already matched in all of them since pagination round 6 (the
995/995 in the old references); the 2026-10-11 measurement predated it.
The Word update changed a measured rule: a list with `startOverride`
that crosses onto the 2nd page no longer restarts (oracle `numbering3`, `pg2-*`).
The whole oracle was redone in the new Word; only that rule changed.

New rules measured in this round (oracles `tblshd`, `brfirst`,
`tblsqueeze`): the table's `w:shd` (`w:tblPr`, direct, from the style or from the
conditional) does not paint the cells, only the cell's own does — with spacing between
cells, it paints the gap around them; in a paragraph that starts with a column
break, the line in the next column takes the first-line indent and the list
number; a table whose unbreakable words exceed the available width, with
a requested width in pct (up to 100%) or in twips below the available width, goes to the
available width and is squeezed like the automatic one (in twips ≥ available,
it grows).

Header band (oracle `hfgroup`, corpus t205-ea65ae51): a paragraph with
crossing indents (right before left: one character per line) does not
have a width of its own — the gap beside the floating objects is measured over the whole column,
so the line moves down below the band and the header pushes the body. In mode
15, `behindDoc` only applies without wrapping: with wrapping (square, tight, through,
top and bottom) the object stays in front, in `relativeHeight` order, in the
body and in the header; in modes ≤ 14 `behindDoc` always applies. A PAGE field in
a text box inside a group is recalculated on each page and, in the
header/footer, is not split by character in a box narrower than it
(in the body it is). t205-ea65ae51 went from 82 to 6 different lines (pixels 0.82 →
0.999); what remains is the indent of a list item on the last page.

Remaining (same page count): indent of the list item on the last page of
t205-ea65ae51, table autofit with images
(t88-253bff00), pixels from small drawing differences (t44-7e4f6e89,
t70-2b7e4e40) and a label split in two only in text extraction
(t205-423aa591).

## Lossless writing (2026-10-19)

The reader keeps the raw slices of each paragraph, run, table and top-level child
of each part (`readFullDocument(pkg, { sources: true })`); the model only carries ids
(`props.src`, `TableBlock.src`), which survive undo and copies of the props.
When saving, what is identical to the baseline comes out byte for byte; what changed applies
only the differences on top of the original w:rPr/w:pPr/w:sectPr (the engine's
`directRPr`/`directPPr` rule), rewraps sdt/hyperlink, rebuilds the revision wrappers from the props and keeps
bookmarks/comments in their relative position. Verification:
`node tools/corpus-lab/lossless-check.mjs [--out dir]` and
`tools/corpus-lab/word-open-check.ps1 -Dir dir` (Word via COM, invisible).

## Completion gates

1. Each 🟡/❌ row needs a versioned Word experiment.
2. Edits must preserve OOXML that is not understood, not just open without errors.
3. Visual features need a pixel/XPS diff on a small corpus and on real documents.
4. The TypeScript build, the Vitest suite and the offline browser smoke test must stay green.
