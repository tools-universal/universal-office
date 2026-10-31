# Universal Slides — Architecture

Presentation **1:1 compatible with the reference app**: same format
(`.pptx` / PresentationML + DrawingML), same on-screen rendering. Sibling of
UniversalWrite (Write) and UniversalSheet (Sheet) in the Universal Office monorepo —
**same methodology, same rigor**.

Organizing principle (from Write/Sheet): **abstracting early is what breaks
compatibility**. The internal model mirrors OOXML literally; whoever invents a
"pretty" model loses fidelity.

## Golden rule — lossless round-trip

A `.pptx` is a ZIP of parts (OPC). `PptxPackage` preserves every part **byte for
byte** and only regenerates what an edit actually changes; the order of the parts is
preserved (clean diffs). Unknown parts/attributes flow through untouched.

## Methodology — the reference presentation as the oracle

The specification is the **observed behavior of the reference presentation**, captured by
COM automation (`New-Object -ComObject PowerPoint.Application`).

- `tools/ppt-lab/gen-reference.ps1` drives the reference app: it creates a deck
  (title, title+content with bullets, blank with a textbox + colored rectangle),
  saves the `.pptx` (`SaveAs ..., 24`) and **extracts/indents the XML** — the XML IS the spec of
  how the reference app materializes slides/shapes/text/geometry.
- `tools/ppt-lab/render-slides.mjs` renders our `<universal-slides>` headless;
  `Slides.Item(i).Export(... "PNG" ...)` exports the reference presentation's PNGs for
  **side-by-side comparison** (pixel fidelity).

## Units

- Geometry in **EMU** (English Metric Units): 914400/inch, 12700/point.
  EMU→px@96dpi = EMU/9525.
- Font size (`sz`) in **hundredths of a point** (`sz="2800"` = 28pt).
- Slide size in `<p:sldSz cx cy>` (EMU). 16:9 onscreen = 9144000×5143500.

## Packages (npm workspaces)

| Package | npm | Purpose |
|---|---|---|
| **slides-core** | `@universal-office/slides-core` | Model + OOXML parsing. `PptxPackage` (lossless container), `parseXml`, `readPresentation`/`readSlide`, theme/color resolution (DrawingML), placeholder geometry inheritance (layout/master). |
| **slides** | `@universal-office/slides` | Web component `<universal-slides>` — the EDITOR: inherits the viewer's painting and edits the package (`deck-edit.ts`: pure functions over the `PptxPackage` that replace only the edited fragment of each part, `xml-edit.ts`; the model is re-read from the package; undo by shallow snapshot of the parts, `history.ts`; blank presentation, `blank-deck.ts`). Optional bars (`topbar`/`bottombar`, `toolbar="compact\|ribbon"`) in `chrome*.ts`, loaded on demand, on top of the `@universal-office/ui` framework — like those of `<universal-write>`: full menus (Arquivo · Editar · Exibir · Inserir · Formatar · Slide · Apresentação · Ajuda; File · Edit · View · Insert · Format · Slide · Slide Show · Help), a ribbon with PowerPoint's tabs, a thumbnails pane and an editable notes pane (writes the slide notes, `setSlideNotes`; `NotesPane` in `chrome-panels.ts`). |
| **slides-core/export** | (inside `@universal-office/slides-core`) | Exporters `.pptx bytes → output` in `slides-core/src/export` (browser+node, NO video): `pptxToMarkdown` (headings/bullets/GFM tables/notes), `pptxToHtml` (static sections, shapes in %), `pptxToPdf` (vector, 1 page/slide, TTF fonts required, via office-converter in `vendor/`), `pptxToImages` (1 PNG/slide via `paintSlideTo`; in node it requires an injected canvas factory). |
| **viewer** | `@universal-office/slides-viewer` | Web component `<universal-slides-viewer>` (read-only, with controls); `<universal-slides>` extends it. |

Slide painting is the PURE function `paintSlideTo(ctx, slide, resources, scale)`
(`slides-core/src/render.ts`): it receives ALREADY decoded images through
`Map<part, image>` — the web component, the thumbnails and `pptxToImages` use the
SAME function (a single source of truth for painting).

## Rendering pipeline

```
.pptx bytes
   │  PptxPackage.load (fflate unzip)
   ▼
PptxPackage (parts map, order preserved)
   │  readPresentation (sldSz, slide list via rels)
   │  readSlide (spTree → shapes; placeholders inherit xfrm from layout→master)
   ▼
Presentation + Slide[] (shapes: xfrm EMU, fill, line, txBody)
   │  <universal-slides>.paint()  ◄── scales EMU→px, draws per slide
   ▼
visible slide in <canvas>
```

## Current coverage (bootstrap, verified against the reference app)

Rendered **1:1** in geometry/content (side-by-side comparison in
`tools/ppt-lab/results/{ours,ppt}`):

- Slide size and fit scaling; white/overridden background.
- `<p:sp>` shapes: own `xfrm` **and inherited from the placeholder** (layout→master);
  `prstGeom` rect/ellipse/roundRect; solid fill (srgbClr/schemeClr +
  shade/tint/lumMod/lumOff); outline (`a:ln`).
- Text: paragraphs, runs with `sz`/`b`/`i`/`u`/color/font, vertical anchor
  (`bodyPr anchor`), explicit alignment (`pPr algn`), `<a:br>` breaks.
- Theme colors resolved from `theme1.xml` (clrScheme + default clrMap).
- Slide navigation (arrows/Page/Home/End/click).

## Prioritized pending items (next phase)

| Priority | Item | Note |
|---|---|---|
| **High** | **Cascade of inherited text styles**: `lstStyle`/`txStyles` (titleStyle/bodyStyle of the master/layout) + the presentation's `defaultTextStyle` | govern the placeholders' default **alignment, size, color and bullets**. It is the largest visible gap (the title of the title layout is centered; body bullets have `•`). |
| **High** | **The shape's `<p:style>`** (`fontRef`/`lnRef`/`fillRef`/`effectRef`) | text color and outline come from here when the run/`spPr` does not specify them (e.g. white text in the accent rectangle). |
| **High** | **Images** (`<p:pic>` + media in `ppt/media/`) | extract the blob and draw it. |
| Medium | Groups (`<p:grpSp>` with `chOff`/`chExt`), tables (`<a:tbl>`), charts | |
| Medium | Automatic text wrapping at the shape width (`a:bodyPr wrap`) + `spAutoFit`/`normAutofit` | |
| Medium | Preset geometries beyond rect/ellipse/roundRect; gradients/image as fill | |
| Low | Rotation (`xfrm rot`/flip), shadows/effects, transitions/animations | |

## Stack & conventions

TypeScript ES2022/ESM, `fflate` (zip), Vitest, `tsc` builds, `esbuild` demo,
headless `playwright` rendering. Imports with the `.js` extension in `.ts` sources.
`index.ts` re-exports the public API. Comments in **pt-BR**, identifiers in
English. Lab experiments in `tools/ppt-lab/`, results in `results/`.
