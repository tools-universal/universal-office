# UniversalOffice — .NET (net8.0)

.NET port of the handling and export of the monorepo's three formats
(.docx/.xlsx/.pptx), with **byte-identical parity** with the JS exporters in the
text formats and structural parity in the PDFs. No NuGet dependencies in
`src/` (xUnit only in the tests).

## Packages and projects

Five assemblies, each packed as a NuGet package of the same name (version
aligned with the `@universal-office/*` npm packages, currently 0.9.2). On nuget.org,
`UniversalOffice.Core` and `UniversalOffice.Docx` are published; `UniversalOffice.Xlsx`
and `UniversalOffice.Pptx` are packed but not published yet. `UniversalOffice.Converter`
(port of `@universal-office/converter`: DOCX, XLSX, PPTX and PDF to HTML, PDF or Markdown)
is standalone: it does not depend on the others, and it is the only project with external
NuGet dependencies (PdfPig and SkiaSharp).
`UniversalOffice.Docx`, `UniversalOffice.Xlsx` and `UniversalOffice.Pptx` depend
only on `UniversalOffice.Core`; each package has its own `README.md` (in the
project folder, in English — it goes inside the .nupkg). Common metadata (version, author,
MIT license, `.snupkg` symbols, deterministic build without a repository URL) is in
`Directory.Build.props`; the step-by-step publishing guide is in `docs/publishing.md`.
Nothing specific to one consumer goes into the library: conversions from other
editors' formats (e.g. Quill's Delta/HTML) stay in the host, which writes with
the generic API (`DocxBodyWriter`, `DocxRunFormat`, `DocxParagraphFormat`,
`DocxParagraphProperties`, `DocxParagraphSamples`).

| Package / assembly | Folders → namespaces | Contents |
|---|---|---|
| `UniversalOffice.Core` | root → `UniversalOffice.Core` | `OpcPackage` (lossless per-part ZIP, order preserved), `OpcPartName`, `OpcPackageLimits`/`OfficeLimitExceededException`, `MiniXml` (port of the xml.ts parser), `JsNumber` (ECMAScript numeric semantics: toString/toFixed/round — the key to parity), units |
| | `Fonts/` → `UniversalOffice.Fonts` | Port of the typography base of `@universal-office/docx-layout` (`src/typography`, fonts): `SfntFont` (cmap/hmtx/OS2/post, GPOS kerning + legacy `kern`, GSUB) and `SystemFontIndex` — index of the INSTALLED fonts (Windows\Fonts, user fonts, Office CloudFonts cache), port of `write/tools/corpus-lab/node-fonts.mjs`; hyphenation (`Hyphen/`, embedded hyph-utf8 patterns; notices in `Fonts/Hyphen/patterns/THIRD-PARTY-NOTICES.md`, which goes into the package at `licenses/hyphenation/`) |
| | `Pdf/` → `UniversalOffice.Pdf` | In-house PDF writer (port of `docx-layout/src/pdf-writer`): TrueType subsetting, Type0/Identity-H, JPEG (gray/RGB/CMYK) and RGBA with /SMask, paths, clipping, transforms, opacity (ExtGState), glyphs with synthetic scaling/bold/italic; `PdfFontSource` (TTF font given by the host to the PDF exports) |
| | `DrawingML/` → `UniversalOffice.DrawingML` | Port of `shared/drawingml`: interpreter of the OFFICIAL preset shapes (`preset-defs.ts` itself embedded as a resource — a single source), `PresetOutline`, DOM-free rasterization (`Raster`: polygons, Gaussian blur, distance, dilation/erosion, affine), the effects measured in Word (`Effects`: outer/inner shadow, glow, soft edges, reflection), the 3D bevel (`Light3D` + `Bevel`: the `light3d.ts` and `bevel-word.ts` tables, also embedded) and the a:pattFill patterns (`Patterns`: `patterns.ts` embedded) |
| `UniversalOffice.Docx` | root → `UniversalOffice.Docx` | Model + `ReadFullDocument` (parity with docx-core: typed OOXML props `Ooxml/Props.cs`, formatting parts `Ooxml/Parts.cs` — styles/numbering/theme/settings/fontTable —, DrawingML/VML `Drawing.cs`, fields/field results/text boxes/shapes/groups), embedded fonts (`EmbeddedFonts`), `ModelOps` (insert/delete/props), subset serialization, `CustomInlineTag` |
| | `Editing/` → `UniversalOffice.Docx.Editing` | Lossless server-side .docx editing (sanitization, templates, parameters, plugin inlines, formatted content at the end of the body) — see "Server-side .docx editing" |
| | `DocxLayout/` → `UniversalOffice.DocxLayout` | **Write layout engine** — port of `@universal-office/docx-layout`, one file per TS module (`Resolve`, `Fonts`, `Numbering`, `Context`, `Para`, `Lines`, `Paint`, `Table`, `Engine`, `Chain`, `Tree`, `Images`, `Emf`, `Pdf`, `Picture`, `PdfPicture`): OOXML cascade, pagination, tables, headers/footers, notes, floating objects, fields; page tree in twips + PDF renderer (Format Picture: `PictureLook` on the image item, composition of the effects in the PDF as Word does). `SystemFontProvider` (machine fonts), `SubstituteFontProvider` (machine fonts + metric substitutes), `DocxLayoutPipeline` (.docx → layout → PDF), `LayoutDump` (normalized parity dump). The font catalog (`shared/fonts/src/catalog.ts`) is embedded as a resource |
| | `DocBinary/` → `UniversalOffice.DocBinary` | Word 97-2003 (binary .doc) → .docx converter (port of write/packages/docx-core/src/doc): parts identical to the JS ones |
| | `Export/` → `UniversalOffice.Export` | Docx→MD/HTML (`DocxMarkdown`, `DocxHtml`, `FromDocx`) and `DocxPdf` (PDF through the layout engine; .doc converted first) |
| `UniversalOffice.Xlsx` | root → `UniversalOffice.Xlsx` | Model + readers (styles/theme/worksheet), **`Format.FormatValue` pt-BR** (faithful port of format.ts, 74 Excel oracle cases + 20k fuzz vs JS), `UpdateWorksheetXml` surgery |
| | `Export/` → `UniversalOffice.Export` | Xlsx→CSV/TSV/MD/HTML/ODS/XML2003 (`XlsxCsv`, `XlsxMarkdown`, `XlsxHtml`, `XlsxOds`, `XlsxXml2003`) and `XlsxPdf` |
| `UniversalOffice.Pptx` | root → `UniversalOffice.Pptx` | Model + reader (text style cascade, flattened groups), `LayoutTextBody`, `SetRunText` |
| | `Export/` → `UniversalOffice.Export` | Pptx→MD/HTML (`PptxMarkdown`, `PptxHtml`) and `PptxPdf` (vector) |

Outside the packages (`IsPackable=false`): `src/UniversalOffice.CorpusLab` (corpus lab
console, port of `run-engine.mjs`: writes `LAB_DIR/<tag>/<id>/net.pdf` +
`info.json` for `compare.py --source net`), `tests/UniversalOffice.Tests`,
`tests/UniversalOffice.DocBinary.Tests` and `tests/UniversalOffice.Benchmarks`
(Stopwatch console — compares with `node tools/bench-export-pdf.mjs`).

## Server-side PDF (host)

```csharp
var pdf = DocxLayoutPipeline.ToPdf(docx, SubstituteFontProvider.Shared,
    new LayoutOptions { HyphenationLanguages = ["pt-BR", "en", "es"] });
```

- **Fonts**: `SubstituteFontProvider.Shared` = system fonts (Windows, `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`, `~/.local/share/fonts`, the macOS folders and `EXTRA_FONT_DIRS`) with the metric-compatible substitutes from the suite's catalog (`shared/fonts/src/catalog.ts`, read as a resource: Calibri → Carlito, Cambria → Caladea, Arial/Helvetica → Liberation Sans, Times → Liberation Serif, Courier → Liberation Mono). The substitute arrives marked `StandIn` — the `FaceResolver` first tries what Word puts in place of the family —, the same as the editor's provider. The fonts EMBEDDED in the .docx come first, per document (`DocxLayoutPipeline`), never in a shared cache. Each folder is read with its subfolders; `EXTRA_FONT_DIRS` accepts several, separated by `;`. Up to 0.9.1 the index was empty outside Windows (`JsPath.Join`, the port of Node's `path.join`, joined with `\` on Linux and macOS too) and the PDF failed with `nenhuma fonte disponível para "…"` ("no font available for …"); since 0.9.2 it uses the OS separator outside Windows (on Windows, parity with the JS, nothing changes).
- **Linux server / container**: the metric substitutes are not in the package; install them in the OS (Debian/Ubuntu: `apt-get install fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea`) so line and page breaks come out as in Word — or point `EXTRA_FONT_DIRS` at a folder with the TTFs.
- **Navigation**: the PDF comes out with `/Link` annotations (only `http`, `https` and `mailto`; anchors become internal destinations) and `/Outlines` bookmarks from the headings (outline level of the paragraph or of the style), as Word writes them with "Criar indicadores usando títulos" ("Create bookmarks using headings").
- **Plugin inlines**: `CustomInlineTag.TryParse/Format` (UniversalOffice.Docx) is the contract of the `w:sdt` written by `<universal-write>` (`wordnext:inline:<type>:<json>`).
- **Page fields** (measured in Word 365, cover page with `w:titlePg` and `w:pgNumType w:start="0"` + 3 pages): on the page after the cover `PAGE` = 1, `NUMPAGES` = 4 (all pages, the cover included) and `SECTIONPAGES` = the pages of the page's section (4 with one section, 3 with the cover in its own section). Exception (`NumPages`, same as `numpages.ts`): with a cover page from Word's GALLERY in the body (block sdt with `w:docPartGallery` "Cover Pages") AND the 1st section starting at 0, Word's `NUMPAGES` already leaves out the cover (3 in the example); `SECTIONPAGES` never leaves it out. The total **without the cover** is a formula field in the template footer: `Página { PAGE } de { = { NUMPAGES } - 1 }` → "Página 1 de 3" ("Page 1 of 3"). The engine (JS and .NET, `FieldFormula`) recalculates the formula as Word does when paginating — always in the header/footer, in the body only with a field nested in the code — with a small, safe evaluator: numbers (pt-BR notation), `+ - * /`, parentheses and sign over `PAGE`/`NUMPAGES`/`SECTIONPAGES`/`SECTION` and nested formulas; result as Word gives it (up to 2 decimal places, `1,33`), `\# "00"` and `\* roman`/`ROMAN`/`alphabetic`/`ALPHABETIC`/`Arabic`. Everything else (functions, bookmarks, cells, division by zero) keeps the cached result. The reader keeps the code, with the nested fields in braces, in `Run.FieldCode` (`" = { NUMPAGES } - 1 "`).
- **Known differences** of the layout from Word (precedence of embedded × installed font, mirror margins/gutter, rotated box above the paragraph, data-bound controls): see `write/packages/docx-layout/README.md`.
- **Untrusted content**: the XML parser rejects an unclosed token and nesting above `MiniXml.MaxDepth`; the ZIP is read with the caps of `OpcPackageLimits` (`DocxPackage.Load(bytes, limits)`, see below); image limits are up to the host (validate before calling).

## Server-side .docx editing (`UniversalOffice.Docx.Editing`)

Server-side .docx handling (sanitization, templates, parameters, history,
plugin inlines, formatted content), in the same `UniversalOffice.Docx.dll`.
It works directly on the XML of the parts with `System.Xml.Linq` (BCL): namespaces,
prefixes, comments and unknown markup pass through intact — `MiniXml` is a
reader (port of xml.ts) and does not rewrite. The ZIP is the `OpcPackage`: opening and saving without
changes returns the parts byte for byte; only the changed XML parts are reserialized
(with the canonical prefixes declared at the root, which MiniXml/xml.ts require). On
saving after editing: Word's structural rules (a cell ends in a paragraph,
a table with no rows is removed…) and collection of relationships/parts no longer referenced by anything.

```csharp
using UniversalOffice.Docx.Editing;

var doc = DocxDocument.Open(bytes);          // InvalidDataException/XmlException if it is not a valid .docx
// … operations …
byte[] result = doc.Save();
```

**Untrusted input.** Opening does not reserve memory for the size the ZIP
declares (the bytes are counted as they are read) and everything has a cap, configurable
through `DocxLimits`; going over it throws `OfficeLimitExceededException` (`Limit`,
`Maximum`, `PartName`) — it never overflows the stack or goes quadratic:

```csharp
var limits = new DocxLimits
{
    Package = new OpcPackageLimits { MaxPartBytes = 50L << 20, MaxTotalBytes = 150L << 20 }, // default 256 MiB / 512 MiB
    MaxXmlDepth = 256,          // XmlReader.Depth of any node, checked before building the tree (default 256)
    MaxFieldsPerStory = 100_000, // w:fldChar begin per story (default)
    MaxFieldNesting = 64,        // fields open at the same time, including those with no end (default)
};
var doc = DocxDocument.Open(bytes, limits);     // Clone() and the content of ApplyContent inherit doc.Limits
```

Relationship targets follow ONE rule, public so the host's validator
can use the same one: `OpcPartName.ResolveRelationshipTarget(source, target)`
— fragment dropped, relative to the source's folder (`""` = root) or absolute, `.`/`..`
normalized (above the root = null), each segment unescaped ONCE
(`fn%2531.xml` → `fn%31.xml`, never `fn1.xml`); null for a scheme, `?`, `\`,
malformed escape or a segment that unescapes to `/`, `\`, `.` or `..`. The returned
name is compared with the ZIP's names case-insensitively and is not
unescaped again. `OpcPartName.EscapeSegment` is the inverse (UniversalOffice writes
new targets with it). XML copies between documents are iterative
(`ApplyContent`/`ImportBody`), and the field scan is linear.

| Operation | API |
|---|---|
| Sanitization | `DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content)` (received content: revisions accepted, comments, macros (becomes .docx), protection, attached template, personal metadata, headers/footers, sections merged into the last one, OLE/ActiveX/altChunk/subdocument/frames, external relationships other than http/https/mailto hyperlinks, fields outside `PAGE NUMPAGES HYPERLINK TOC REF PAGEREF SEQ` → cached result without evaluating, HYPERLINK field → native `w:hyperlink`, customXml). `DocxSanitizeOptions.Output` = only revisions + unsafe content + fields with the extended list `DocxFields.DefaultOutputAllowedFields` (+ `DATE TIME SAVEDATE CREATEDATE PRINTDATE SECTION SECTIONPAGES NOTEREF` and the `=` formula, e.g. `{ = { NUMPAGES } - 1 }` — fields nested in the code go through the same list) — document generated from a template. `IsCustomInlineValid = (type, json) => …` unwraps invalid inlines. Individual steps: `DocxReview.AcceptAllRevisions/RemoveComments/RemoveMacros/RemoveProtection/RemoveAttachedTemplate/DisableTrackChanges`, `DocxSanitizer.RemoveHeadersAndFooters/MergeSections/RemoveCustomXml/RemoveUnsafeContent`, `DocxFields.ReplaceDisallowedWithResult/ConvertHyperlinkFields` |
| Empty a template | `DocxTemplate.Empty(doc)` — one empty Normal paragraph under the sectPr of the LAST section, with no header/footer references; styles, numbering, theme, settings and fonts (embedded ones included) stay; revisions/comments/macros/protection/metadata cleared; orphan notes are removed |
| Apply content | `DocxTemplate.ApplyContent(template, contentDocx, new() { SampleMarkers = ["#{Heading1}", "#{Normal}", …] })` — "import content with the destination styles" (like DocIO's `ImportContent(UseDestinationStyles)`): removes the template's sample paragraphs, accepts the content's revisions/comments, imports the body at the end of the last section (content sections flattened; with `PreserveSections = true` the content's section and column breaks stay, each section with the size/margins/headers/footers of the template's last section, and the template blocks before the content get their own break — the first content section starts continuous), a style with the same NAME uses the destination's (internal ids without a definition — `Heading1` — match by the internal name), the missing ones come in with a free id; numbering (new w:num/w:abstractNum, new nsid, separate lists stay separate), images and related parts (charts…), hyperlinks, footnotes/endnotes, fonts from the font table (with the embedded ones) copied without collisions; bookmarks renumbered/renamed (anchors and REF follow); unique `wp:docPr`, `w14:paraId` and `w:sdt/w:id`; final empty paragraph dropped; large images reduced to the usable area of the section they are in (to the column, in a section with columns — `DocxPictures.FitToPage`). Body only: `DocxTemplate.ImportBody(target, source)` |
| `#{...}` parameters | `DocxText.ReplaceParameter(doc, "Title", "Código")` / `ReplaceParameters(doc, [new("Code", "POL-1"), …])` — case-insensitive, "whole word" (an adjacent letter/digit only counts on the side where the search starts/ends with a letter/digit), even when split across several runs; the new text inherits the formatting of the first character; `\t`/line breaks become `w:tab`/`w:br`; body, text boxes (mc:Choice and mc:Fallback), headers, footers and notes. Generic: `DocxText.Replace(doc, find, value, caseSensitive, wholeWord, scope)`, `DocxText.Replace(doc, regex, value)`, `DocxText.Contains`, `DocxText.RemoveParagraphsContaining` |
| History (template row) | `var row = DocxTableRowTemplate.Take(doc, "HistoryVersion"); row?.Append([new("HistoryVersion", "1.0"), new("HistoryNotes", note), …]);` — the marker row is removed from the table and each `Append` adds a copy at the end with the `#{...}` replaced and the leftover ones deleted |
| Logo / text box | `DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", png, maxWidthPt: 200, maxHeightPt: 75)` (PNG/JPEG/GIF/BMP at physical size, scaled down proportionally); `DocxShapes.RemoveContaining(doc, "#{Logo}")` removes the text box |
| Footer/header | `DocxShapes.FirstShapeIn(doc, footer: true)` → `DocxShape.SetFillColor("0B5394")`, `SetFillTransparent()`, `SetTextColor("FFFFFF")` (last paragraph, or all of them with `lastParagraphOnly: false`), `ClearText()`; `DocxShapes.ClearHeaderFooter(doc, footer: true)` — DrawingML and the fallback VML together |
| Properties | `doc.Properties.Title/Subject/Author/LastAuthor/Category/Keywords/Comments/LastSaveDate/Company/Manager/ApplicationName`, `SetCustomProperty`, `RemoveCustomProperties`, `RemovePersonalMetadata()` (null/empty removes) |
| Plugin inlines | `DocxCustomInlines.Find(doc, "myapp.user-tag")` → `DocxCustomInline` (`Type`, `Json`, `Title`, `Text`, `PartPath`) with `ReplaceWithText(value)` (run formatting; empty removes), `ReplaceWithHyperlink(url, text)` (`w:hyperlink` + external relationship, "Hyperlink" style; a URL outside http/https/mailto becomes text — **no HYPERLINK field**), `Unwrap()`. `DocxCustomInlines.ReplaceText(doc, marker, type, json, fallback)` replaces a text (e.g. U+E000 n U+E001 markers that the host put in place of another editor's objects, even when split across runs) with the `w:sdt` in the editor's contract; `UnwrapInvalid(doc, validator)` |
| Plain text | `DocxText.GetPlainText(doc, includeHeadersAndFooters: false)` — one paragraph per line (CRLF), `\t`, `\n` for breaks; tables, text boxes (once), inlines through the fallback text; no field code or deleted text |
| Template samples | `DocxParagraphSamples.Contains(doc, "Heading1")` (marker `#{Heading1}`, whole word, case-sensitive) and `DocxParagraphSamples.Extract(doc, ["Heading1", "Normal", "BulletList", …])` → `IReadOnlyDictionary<string, DocxParagraphProperties>`: keeps the w:pPr of the FIRST paragraph of each marker (without w:sectPr/w:pPrChange; `StyleId`, `NumId`) and removes ALL paragraphs that contain it; a name without a sample is left out of the result |
| Formatted content | `var writer = new DocxBodyWriter(doc, new() { LinkColor = null });` — writes at the END of the body (before the final w:sectPr): `AddText(text, new DocxRunFormat { Bold, Italic, Underline, Strike, Color, Background, VerticalAlign, Link })` (`\t`/breaks become `w:tab`/`w:br`; CSS/hex colors normalized, invalid ones ignored; native link only with a scheme from `AllowedLinkSchemes`, "www.…" gets http://, the rest becomes text), `AddBreak()`, `AddImage(bytes, link)` (false if the image is not recognized), `EndParagraph(new DocxParagraphFormat { Base = sample, StyleId, ListNumId, ListLevel, LeftIndentTwips, Alignment, KeepWithNext })` (the document's default style is omitted) and `Finish()` (closes the line, trims the last empty paragraph, reduces the images to the page). Options: `LinkColor` (color of links without underline; null = "Hyperlink" style), `ReuseEmptyLastParagraph` (the first paragraph goes into the template's last empty paragraph), `TrimTrailingEmptyParagraph`, `FitPictures`. Restarted lists: `DocxNumbering.AddRestartedInstance(doc, numId)` |

Typical flows (the `Editing/TemplateDocumentFlowTests` tests run them on a
synthetic template with a cover page, logo, colored footer and sample paragraphs):

```csharp
// editing: emptied template + .docx content
var doc = DocxDocument.Open(template);
DocxTemplate.Empty(doc);
DocxTemplate.ApplyContent(doc, contentDocx, new() { PreserveSections = true });
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { MergeSections = false, IsCustomInlineValid = IsValid });
return doc.Save();

// content from another editor (e.g. Delta/HTML from a rich text editor) in the formatting of the samples
var doc = DocxDocument.Open(template);
var samples = DocxParagraphSamples.Extract(doc, ["Heading1", "Normal", "BulletList", "NumberedList"]);
DocxTemplate.Empty(doc);
var writer = new DocxBodyWriter(doc);
writer.AddText("Objetivo", DocxRunFormat.None);
writer.EndParagraph(new() { StyleId = samples["Heading1"].StyleId, KeepWithNext = true });
writer.AddText("Item", new DocxRunFormat { Bold = true });
writer.EndParagraph(new() { Base = samples["BulletList"], ListNumId = samples["BulletList"].NumId, Alignment = "left" });
writer.Finish();
foreach (var m in markers) DocxCustomInlines.ReplaceText(doc, m.Text, m.Type, m.Json, m.FallbackText);
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { IsCustomInlineValid = IsValid });

// PDF/DOCX generated from the template
var doc = DocxDocument.Open(template);
DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", logo, 200, 75);  // or RemoveContaining(doc, "#{Logo}")
DocxShapes.FirstShapeIn(doc, footer: true)?.SetFillColor(primary);
doc.Properties.Title = fullTitle; doc.Properties.ApplicationName = "My App";
DocxText.ReplaceParameters(doc, parameters);    // BEFORE the content: the content's #{Title} stays literal
var history = DocxTableRowTemplate.Take(doc, "HistoryVersion"); /* history?.Append(...) per version */
DocxTemplate.ApplyContent(doc, contentDocx, new() { SampleMarkers = sampleMarkers, PreserveSections = true });
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Output with { IsCustomInlineValid = IsValid });
var pdf = DocxLayoutPipeline.ToPdf(doc.Save(), SubstituteFontProvider.Shared, options);
```

Known differences from Syncfusion DocIO (on purpose): removed headers/footers
go away with their part (DocIO left the part empty); the shape's "100% transparency"
becomes `a:noFill`/`filled="f"`; image indent in a list = the level's left indent
(DocIO subtracted spacing-after + number position); a relative or
`#…` link written by `DocxBodyWriter` becomes text (no broken hyperlink); date/time of
`LastSaveDate` in UTC; `GetPlainText` does not write the list labels ("1.", "•"),
which DocIO's `GetText` included; fields (DATE…) are never evaluated on open (DocIO
updated DATE on load).

## How to run

```powershell
# 1. parity fixtures (require the JS projects built: npm run build at the root)
node tools/gen-parity-fixtures.mjs
node tools/gen-parity-pdf.mjs
node tools/gen-parity-doc.mjs        # .doc → .docx (requires the docx-core dist)

#    Write layout: dumps of the JS engine over the Word oracle
#    (write/packages/docx-layout/test/oracle) — requires the dists of docx-core,
#    layout, pdf and docx-layout and the installed fonts (Arial/Calibri/Times…)
node tools/gen-parity-layout.mjs
#    Format Picture: synthetic input (fixtures/input/pictures.docx) — then
#    gen-parity-layout (expected/layout-input) and gen-parity-pdf --only pictures.docx
node tools/gen-parity-pictures.mjs
#    text boxes (linked, vertical, hidden, pattern/picture, Shape Styles,
#    shapes with text): fixtures/input/textboxes.docx — then gen-parity-layout
node tools/gen-parity-textboxes.mjs

# 2. build + tests
cd dotnet
dotnet build -c Release
dotnet test

# 3. corpus (real documents OUTSIDE the repo; nothing from them goes into git)
dotnet run -c Release --project src/UniversalOffice.CorpusLab -- --tag net [--only id,id] [--limit N]
cd ../write/tools/corpus-lab && python -I compare.py net --source net

# 4. .NET vs node benchmark
dotnet run -c Release --project tests/UniversalOffice.Benchmarks
node ../tools/bench-export-pdf.mjs

# 5. NuGet packages (Core, Docx, Xlsx, Pptx: .nupkg + .snupkg; version in Directory.Build.props)
#    publishing to nuget.org: docs/publishing.md
dotnet pack UniversalOffice.sln -c Release -o <folder>
```

## Parity — what is guaranteed

- **Text formats (md/html/csv/tsv/xml2003/ods-content)**: byte for byte with the JS
  (tests compare ordinal strings, without normalization; CSV with CRLF+trailing, the rest LF).
- **PDF**: page count, MediaBox (±0.01 pt) and text operator count
  identical to the JS; raster (WinRT) with identical pixel count in the fixtures.
- **Round-trip**: untouched parts byte-identical and order preserved (the
  container recompresses — same semantics as JS/fflate).
- **Write layout (docx)**: `LayoutParityTests` lays out each case of the Word
  oracle with the .NET engine and compares with the JS engine's dump
  (`fixtures/expected/layout/<group>/<case>.layout.json`, from
  `tools/gen-parity-layout.mjs`): same structure (items in the same order, same
  faces/texts) and numbers within ±0.05 twip. `LayoutOracleTests` mirrors
  `oracle.test.ts` (lines, pages and baseline against Word's PDF, same
  tolerances; rotated text of the vertical boxes through the `vlines`). Without Arial/Calibri/Times New Roman installed the cases are not
  evaluated — the fonts are read from the machine, never versioned (CLAUDE.md).
  `EngineRulesTests` / `ImagesAndPdfRulesTests` mirror `engine.test.ts`,
  `images.test.ts` and the pdf `writer.test.ts` (synthetic documents and images
  built in the test, open font Carlito): side-effect-free measurements
  (lists/SEQ/notes), hyperlinks, VML WordArt, image decoders,
  PDF numbers and glyph ids. `Layout_Js_Net_Input` compares the synthetic inputs
  outside the oracle in the same way (`fixtures/expected/layout-input`, e.g.
  `pictures.docx` — Format Picture, with the `pic` key on the image items;
  `textboxes.docx` — text boxes, with `pattern`/`blip` on the shapes that have them);
  `DrawingMLTests` covers the shape interpreter, the rasterization and the effects.
- **Speed** (measured in Release, warmup 3 + average of 10): Pptx ~13–16× node,
  Docx ~5×, Xlsx ~3× (floor: the case already runs in ~4 ms); all <100 ms on the fixtures.

## Known divergences (documented in the sources)

- `DocxPdf.ToPdf` uses the ported layout engine (parity with the JS); the
  overload with `List<PdfFontSource>` (v1 API) applies the given faces to EVERY
  font family in the document (JS reference: `tools/docx-pdf-ref.mjs`); `ToPdf(bytes)`
  uses the installed fonts. `.odt` with a renamed extension still has no ODF
  reader in .NET.
- JS semantics reproduced on purpose (for parity): `toUpperCase` with
  SpecialCasing (ß → SS), JS object key order in identities through
  `JSON.stringify` (border groups), NaN/`undefined` from `parseInt`, `DataView`
  reads outside the buffer that throw.
- pptx/xlsx charts in PDF: placeholder (same as the JS).
- `SerialToDate` saturates instead of reproducing the JS `Date` garbage for serials
  outside Excel's domain.
