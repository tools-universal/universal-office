# 1:1 fidelity review — Universal Slides × reference app

## Audit 2026-07-25 — STRESS decks generated through COM + diff loop

New tooling (`tools/ppt-lab/`): `gen-stress.ps1` (PowerPoint COM generates 4
decks covering as many features as possible + exports a 1280×720 PNG per slide + extracts the
XML), `render-deck.mjs` (renders in `<universal-slides-viewer>` headless
at the EXACT size via `renderSlideToCanvas` — no chrome), `compare-deck.mjs`
(pixel-by-pixel diff, tolerance 40/channel, side-by-side `report.html` report).

Decks: `samples/stress-{shapes,text,table-chart,media}.pptx` (18 slides).
**Average divergence: 14.00% → 3.96%** in this round. Fixes guided by the oracle:

1. **1:1 gradient**: `<a:lin scaled="1">` — the direction transforms
   COVARIANTLY `(cos·h, sin·w)` (45° at 16:9 gets steeper, not shallower);
   stop interpolation in **LINEAR RGB** (γ≈2.2) via substops — the canvas
   interpolates in sRGB and darkened the middle. Gradient background: 69% → 1.1%.
2. **`a:tint`/`a:shade` in LINEAR space** and correct tint semantics
   (val = fraction of the COLOR; 40% accent1 ⇒ #CAD1D7, not #A1BFCD).
3. **Table styles** (`table-style.ts`): `ppt/tableStyles.xml` +
   `<a:tblPr firstRow bandRow>` → header/banding fills, white/bold header
   text, lt1 borders; cells inherit `defaultTextStyle` (13.5pt Aptos — measured
   through COM) + `otherStyle` + tcTxStyle. Default cell anchor = TOP.
   Table: 42% → 2.2%.
4. **Charts**: palette = the THEME's accents (not hardcoded Office 2013); title
   15.5pt `#595959` centered; bottom/top legend CENTERED (categories in
   pie/doughnut, series in the others); `holeSize` (default 75%); white separator
   between slices; `gapWidth`/`overlap` from the XML (defaults 219/-27); "nice" ticks
   with 1.05 headroom (max 5 ⇒ axis 6); LINE radar with rings/labels
   (radarStyle standard vs filled); scatter with REAL X from `<c:xVal>` + vertical
   grid; pt-BR decimals ("0,5"); area. Radar+scatter: 12.6% → 2.65%.
5. **New geometries**: octagon, donut (evenodd), moon, heart (béziers),
   lightningBolt (path 21600), sun (rays+disc), can, cube — via a new generic
   `path` kind in `geometry.ts`. Shapes: 11.1% → 5.4%.
6. **Bug fix**: precedence in scatter (`vals[i] ?? 0 - min`).

Pending items from this round (by remaining %): gradient variants on slide 2 of
shapes (FromCorner/FromCenter → radial), elbow/curve connectors + line
arrows, shadows/freeform on slide 4, autofit/vertical text (text slide 3),
combo bar+line (slide 5), bar axis fonts (slide 2 of charts).

## Round 2 (same date) — **3.96% → 2.83%** average divergence

1. **Radial gradient** (`<a:path path="rect|circle|shape">` + fillToRect):
   pos 0 = center; substops in linear RGB shared with the linear gradient.
2. **`lumMod`/`lumOff` in HSL luminance** (not sRGB): the theme's "light" variant
   (lumMod 60% + lumOff 40%) stays VIVID as in the reference app.
3. **`<a:ln><a:noFill/>`** blocks the `lnRef` fallback (ellipses without a border);
   the `lnRef idx` width is resolved through the theme's `<a:lnStyleLst>` (12700/19050/25400).
4. **custGeom (freeforms)**: pathLst parsing (moveTo/lnTo/cubicBez/quadBez/
   close) scaled to the xfrm — the freeform on slide 4 no longer turns into a rectangle.
5. **arc/blockArc** (arc is stroke-only) + **pentagon/star5 normalized to the
   bounding box** (the reference app scales the polygon, it does not inscribe it in the ellipse).
6. **Chart layout calibrated by MEASUREMENT** (title 16u, gap 20u, axis 2.4·label,
   legend label+20u; pie: 97% of the plot, center −1.2%h; 2px separator):
   pie 10.5%→1.2%, area 7.3%→4.1%. Engine re-synced in sheet-core.

Worst remaining: bar/line 6.2% (axis font metrics), shapes slide1 4.9%
(3D shading of can/cube, thin moon/sun), autofit 4.8%.


Methodology mirrored from `sheet/REVIEW-EXCEL.md`: the reference app (real PowerPoint,
through COM) is the oracle; the specification is the XML it emits. Here
we document the audits of the user's **animated showcase** and what was
closed in each round.

## Audit 2026-06-20 — `showcase_animado.pptx` (the user's oracle)

`samples/showcase_animado.pptx` was copied from
`{User}\OneDrive\Documentos\showcase_animado.pptx` (344 448 bytes, 12 slides,
4 embedded charts, 26 images, animations declared in `<p:timing>`).

### Showcase inventory (verified in this round)

```
12 slides + 1 slideMaster + 1 slideLayout + 12 notesSlides
Content_Types declares 12 slideMasterN as Override, but the package contains
ONLY slideMaster1.xml — every slide resolves to the SAME master.
```

| Slide | Content | Status | Gap |
|---|---|---|---|
| 1 | bg image (`<p:bgPr><a:blipFill>`) + 1 `<p:pic>` (rocket) + 3 texts + 3 ellipses (colors) | **✓ 1:1 render with the source** | — |
| 2 | title + 6 cards with 6 `<p:pic>` (icons) + 12 texts | **✓ 1:1 render** | — |
| 3 | title "Formatacao de texto rico" (rich text formatting) + texts with runs (`b`/`i`/`color`) | ✓ via `paintText` |  |
| 4 | "Formas, linhas e transparências" (shapes, lines and transparencies) — 8 `<p:sp>` with `prstGeom` ellipse/rect | ✓ shapes + colors via theme | gradients/transparency not yet |
| 5 | "Gráficos nativos e editáveis" (native, editable charts) + 1 `<p:graphicFrame>` (chart1) | ✗ chart does not draw (only the title shows) | **chart engine** |
| 6 | "Radar e dispersão com estatística" (radar and scatter with statistics) + 1 chart | ✗ chart does not draw | **chart engine** |
| 7 | "Tabelas com células mescladas" (tables with merged cells) + 1 `<p:graphicFrame>` (`<a:tbl>`) | ✗ table does not draw | `<a:tbl>` parsing + rendering |
| 8 | 4 variants of the SAME `<p:pic>` (circular crop, rot 20°, alpha 45%, mirrored) | △ images show but **without effects** | crop ellipse / `xfrm.rot` / alpha / `xfrm.flipH` |
| 9 | hyperlinks + several `<p:pic>` (annotations) | ✓ text + images | clickable links not yet |
| 10 | assorted bullets / numbering | ✓ paragraphs + simple bullets | levels (`a:pPr lvl`) + bullet types |
| 11 | images + texts | ✓ 1:1 render |  |
| 12 | closing slide with `<p:pic>` | ✓ 1:1 render |  |

### Delivered 2026-06-20 — Chart engine (commit pending)

11. **`<p:graphicFrame>` + charts**: read in `readShapes` → resolves `r:id`
    via `slideRels` → loads the chart XML as `Shape.chartXml`.
12. **Shared chart engine** (`chart-engine.ts` in `slides-core`,
    duplicated in `sheet-core` because of the monorepo separation):
    - bar/line/pie/doughnut/scatter/radar — all painted.
    - 1:1 colors: `<c:ser><c:spPr><a:solidFill><a:srgbClr val>` beats the default palette
      (verified: the "Receita" (revenue) series on slide 5 comes out #028090 as in PowerPoint).
    - Combo (bar+line in the same plotArea) detected and perSeriesType annotated.
13. **Showcase slide 5 renders 1:1**: title "Gráficos nativos e editáveis"
    + bar chart "Receita vs Meta (combo)" (revenue vs target) + doughnut "Distribuição" (distribution) side by side,
    correct colors, correct values. Slide 6 (radar "Comparativo" (comparison)) + slide 7
    (scatter "Dispersão + linha de tendência" (scatter + trend line)) also run.
14. **+1 test** (`slides 5/6/7 leem <p:graphicFrame> com chart`): checks the extracted
    title, the detected type and the series' explicit color. **Slides total: 10/10 green**.

### Delivered 2026-06-20 — `<p:pic>` effects + text editing (commit pending)

7. **Per-shape transforms**: `xfrm.rot` (in 1/60000 of a degree), `xfrm.flipH`,
   `xfrm.flipV` applied via `ctx.save/translate/rotate/scale/restore` around
   the geometric center — target: showcase slide 8, which has 4 variants of the
   same pic with rot=20°, alpha=45%, flipH=true. **Verified in the model**
   (`pics[1].xfrm.rot === 1200000` etc.) and in the paint via a green build.
8. **Per-image alpha** (`<a:blip><a:alphaModFix amt="..."/></a:blip>`):
   parses `amt` (thousandths of a %) → `Shape.alpha` (0..1); applied as
   `globalAlpha` in the renderer.
9. **Edit mode v1**: double-clicking a shape with a `txBody` creates a
   `<div contenteditable>` over the `xfrm` rect, with font/color/align inherited
   from the first run; Enter/Esc commit/cancel; the commit writes back to
   `txBody.paragraphs` (1 paragraph per line, runs keep the font/sz/color/bold
   of the original first run). Pending for v2: an offset-based diff that preserves inner
   runs (formatting per range).
10. **+1 test** anchored on slide 8: the 4 pic variants with `rot=1200000`
    / `alpha≈0.55` / `flipH=true` (`9/9 green`).

### Delivered in this audit (commit pending)

1. **1:1 `<p:pic>` images**: parses `<p:nvPicPr>/<p:blipFill r:embed>/<p:spPr xfrm>`,
   resolves the bytes through the slide's rels, decodes in parallel in the component cache,
   paints with `drawImage` at the slide's `xfrm`. Z-order respected (walks `<p:spTree>`
   in document order, alternating `<p:sp>`/`<p:pic>`/`<p:grpSp>`).
2. **Slide background image** (`<p:bg><p:bgPr><a:blipFill>`): drawn
   underneath the shapes (showcase slide 1 no longer shows up all white
   and now shows the dark image with SHOWCASE/Recursos do PowerPoint ("PowerPoint features").
3. **`Shape.srcRect`** (crop in thousandths of a %): parsing done and propagated to
   `drawImage(sx, sy, sw, sh, …)`. Visual effects that depend on a round `srcRect`
   / rotation / alpha still PENDING (task #6).
4. **Demo chrome (PowerPoint-style)**: header with the
   Arquivo/Inserir/Apresentar (File/Insert/Present) menus (dropdowns), editable title, dark mode toggle,
   primary "Abrir .pptx" (open .pptx), toolbar with undo/redo + prev/next + "▶ Apresentar"
   (F5 fullscreen of the stage), **thumbnails sidebar** (220px, click → selects,
   active highlight), footer with the slide counter "N / 12" + prev/next, drag-and-drop of a
   `.pptx`, shortcuts Ctrl+O / Ctrl+S / Ctrl+P / F5 / Shift+F5.
5. **Public API**: `renderThumbnail(i, canvas)`, `getSlideIndex()`,
   events `us-loaded`, `us-slide`, `us-image`.
6. **4 tests pinned to `showcase_animado.pptx`**
   (`slides-core/test/roundtrip.test.ts`):
   - The package round-trip preserves `ppt/media/Slide-1-image-1.png` +
     `ppt/charts/chart1.xml` byte for byte.
   - 12 slides + 1 master + 1 layout (rejects the wrong reading of
     Content_Types).
   - Slide 1: `bgImage` resolved with `mime = image/png` + 1 `<p:pic>` at
     `(5852160, 777240, 502920, 502920)` + the texts "SHOWCASE" and "Recursos do
     PowerPoint" + **z-order** (`<p:pic>` before the first `<p:sp>`).
   - Pic-per-slide inventory: `[1, 2, 8, 9, 11, 12]` (exact), all with bytes > 0.

### Next prioritized gaps (with the session's task IDs)

- **#5** — `<p:graphicFrame>` charts (slides 5/6/7). **Engine shared with Sheet** (showcase.xlsx Graficos).
- **#6** — `<p:pic>` effects (slide 8): circular crop, rotation `xfrm.rot/60000`, alpha `a:alphaModFix`, `xfrm.flipH/V`.
- **#7** — Notes panel (notesSlide1..12), `lstStyle/txStyles` cascade, animation timeline (`<p:timing>` declares 12 `entr` sequences per slide — the showcase is literally "animated").
- **#10** — Edit mode (shared with Sheet).

## How to reproduce

```bash
# build
npm install --prefix slides
npm run build --prefix slides/packages/slides-core
npm run build --prefix slides/packages/slides
# tests
npm test --prefix slides/packages/slides-core   # 8/8 pass, includes showcase_animado
# demo
npm run build:demo --prefix slides/packages/slides
node slides/tools/dev-server.mjs     # http://127.0.0.1:8125/packages/slides/demo/
```
