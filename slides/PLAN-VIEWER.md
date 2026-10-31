# Plan — `<universal-slides-viewer>` (abstracted view mode)

## Analysis (2026-07-25)

Current state: `<universal-slides>` (packages/slides) mixes three roles in a single
element — (a) **viewing** (fit EMU→px, paint via `paintSlideTo`, image
cache, navigation, thumbnails, animations, transitions, hyperlinks), (b)
**editing** (dblclick → contenteditable, commit to `txBody`) and (c) no
chrome at all (the chrome lives in the demo). Painting is already pure (`paintSlideTo` in
slides-core). The COM lab (`tools/ppt-lab`) has a working PowerPoint 16.0 oracle
(verified today) and headless Playwright rendering.

## Decisions

1. **New package `packages/viewer` → npm `@universal-office/slides-viewer`**,
   element `<universal-slides-viewer>` (class
   `UniversalSlidesViewerElement`). Depends only on `@universal-office/slides-core`.
   It is the embeddable viewing artifact (site, electron, third parties) without
   dragging in editing code.
2. **`<universal-slides>` now INHERITS from the viewer** (the subclass registers another
   tag). The current public API is preserved through inheritance (`loadPptx`, `selectSlide`,
   `next/prev`, `renderThumbnail`, `us-*` events). The viewer's private fields
   become `protected` for the subclass (editing needs `fit`, `wrap`,
   `slides`, `paint`).
3. **Viewer API** (viewing only):
   - `loadPptx(bytes)`, `src` attr (fetch by URL), `getSlideCount/Index`,
     `selectSlide`, `next/prev`, `renderThumbnail(i, canvas)`,
     `replayAnimation()`, `present()` (fullscreen), events
     `us-loaded/us-slide/us-image`.
   - Protected hook `suppressTextShapeIdx` + `onShapeDblClick` for the subclass.
4. **Stress decks generated through COM** (`tools/ppt-lab/gen-stress.ps1`), with
   reference PNGs via `Slide.Export`:
   - `stress-shapes.pptx` — preset geometries in a grid, solid/gradient/
     transparency fills, dashes, arrows, shadow, rotation/flip, connectors.
   - `stress-text.pptx` — sizes, b/i/u/strike, sub/superscript, colors,
     multilevel bullets, buAutoNum (variants), alignments, anchors,
     line spacing, indents, autofit, wrap off, caps.
   - `stress-table-chart.pptx` — table with merges/fills/borders; bar/line/pie/
     doughnut/scatter/radar/area/combo.
   - `stress-media.pptx` — images (crop/rot/flip/alpha/border), gradient
     and image backgrounds, nested groups, WordArt, hyperlink, slide number/footer.
5. **Fidelity loop**: `render-slides.mjs` generalized (path of the .pptx as an
   argument) + `compare.mjs` (pngjs, % of divergent pixels per slide, side-by-side HTML
   report in `results/report.html`). Fix slides-core gap by gap;
   record each round in REVIEW-PPT.md.
6. **Electron integration**: the demo keeps `<universal-slides>` (which ALREADY is the
   viewer through inheritance) and the presentation stage (F5) now uses a dedicated
   `<universal-slides-viewer>` instance — real proof of the abstraction. Electron
   app opened and verified with a screenshot.

## Steps with review

| # | Step | Review |
|---|---|---|
| 1 | Extract the viewer (new package + inheritance) | build + green tests + demo intact |
| 2 | COM stress decks + reference PNGs | open the extracted XML, check the inventory |
| 3 | 1:1 loop (compare, fix, repeat) | % divergence per slide going down; REVIEW-PPT.md |
| 4 | Electron integration | screenshot of the running app |

Afterwards (phase 2, outside this plan): Sheets×Excel gaps one by one + giant spreadsheets
(performance/RAM).
