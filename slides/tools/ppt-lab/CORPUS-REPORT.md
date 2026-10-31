# Real-world corpus × Universal Slides (2026-10-13)

Validation of Slides against **1,445 unique presentations** downloaded from the internet,
rendered by our viewer and compared with PowerPoint 16 (COM oracle).
The corpus and the lab live **outside the repository**: `E:\UniversalSlidesTest`
(third-party decks, some with embedded commercial fonts; see CLAUDE.md).

## Progress (2026-10-14)

Divergence per slide (`blk`, 6,603 slides, up to 12 per deck) — full rounds:

| source | median before → r3 | mean before → r3 |
|---|---|---|
| total | 14.6 → **4.0** | 24.3 → **9.0** |
| real `.ppt` (gd) | 21.5 → 4.6 | 30.3 → 10.7 |
| Office 2007/10 (gdx) | 16.6 → 4.8 | 29.1 → 8.9 |
| modern (web) | 5.6 → 2.9 | 11.6 → 6.0 |

Subset of 210 decks (6 slides) after r3, with line width and
shadows fixed (s17): median 13.3 → **3.1**, mean 22.6 → **7.3**.
Repo samples (`regress.mjs`) × PowerPoint: 3.34% → 3.03%.

Done (P0/P1 of the plan below + findings along the way): clrMap/clrMapOvr;
bgRef/fillRef through the theme styles; color modifiers (satMod, hue, comp…);
image effects (duotone, grayscl, clrChange, lum, biLevel, alphaModFix) and
tiling with scale; MASTER SHAPE inheritance and measured fFilled/fLine
defaults in .ppt (99.3%/99.5% agreement with the app's own conversion
over 57 thousand shapes); WMF/EMF (Canvas player, `metafile.ts`); image in a
placeholder; spcPct + the 1st-paragraph rule + spcFirstLastPara; bullets
(buFont/buClr/buSz, Wingdings/Symbol → Unicode, buBlip, PP9 from .ppt);
superscript, cap, strike, spc; hyperlinks; fixed footer date in .ppt; path
gradient; pattFill (54 patterns extracted from the app); the ClientTextbox ruler in
outline text; exclusive text cascade and master per type; "other" text
in .ppt through the document style; gradient text (average color) and default tx1;
**outline width (every outline came out at 1 px) and shape shadows
(came out null)**; scaled/anchored shadow.

New lab tools (`_lab/`): `model-agree.ts` (model of OUR .ppt conversion
× PowerPoint's, per shape/paragraph/run), `conv-agree.ts`,
`fill-truth.ts`, `diff-tags.mjs`, subset `subset.txt`, oracle
`oracle/ppt2pptx/` (the app's conversions of ~370 .ppt).

Afterwards (2026-10-14, 2nd stage): TIFF (own decoder: 33/33 of the corpus),
table rows that GROW until the text fits, WordArt (`prstTxWarp` only with
`fromWordArt="1"`, like the app; envelopes and arcs; adjustments in the right
units), height of paragraphs with no characters from `endParaRPr`. Full round
r4: median **3.4**, mean **8.4** (from 14.6/24.3). Subset (s22): median
13.3 → **3.1**, mean 22.6 → **7.2**. Harness: new page per deck and waiting
for the fonts (earlier rounds fluctuated because font state leaked between decks).

Measured and DISCARDED: "a font with Bold in its name comes out bold when substituted"
— the app draws the REGULAR substitute (CJK decks with "… Bold/Heavy"); the case that
suggested otherwise (Arial Rounded MT Bold) had the font installed.

SmartArt without `drawingN.xml` (Office 2007; 43 decks in the corpus): `diagram-fallback.ts`
rebuilds the diagram from the data model for the MEASURED layouts — org chart
(hierBranch r/l/hang/init, custScaleX), process and bending process (arrows),
basic block, grouped list (list1), vertical blocks, list with circle,
chevron, cycle, matrix — with colors from the color definition (repeat/span by
presStyleIdx), quick style (the theme's fillRef/lnRef) and the point's manual
formatting (`dgm:spPr`). A layout outside the list stays empty: a wrong guess (radial
arrows, hexagons) measured WORSE than empty. In those decks: mean 12.0 → **8.7**
(LibreOffice: median 20.5 → 6.7); no regression in the subset or the repo.

Charts: new, SHARED engine (`shared/charts`; Sheet's number formatting
moved there). Layout measured on synthetic charts exported by
PowerPoint (`_lab/syn`, `gen-charts.cjs`): margins, title, legend (order
reversed in horizontal/stacked bars), automatic scale (zero, 5%
headroom, tick density), category labels (wrap/45°/skip), data
labels, number format (linked = the format's cache), `c:style` styles
1–48 (colorful/mono/gray palettes in linear RGB, gradients, dark areas),
smooth lines by default, automatic markers, secondary axes, the chart's
`themeOverride`. On the 100 slides with a chart in the corpus: mean
16.5 → **8.4**, median 12.3 → **5.6**.

Afterwards (3rd stage, 2026-10-14): Sheet moved to the shared engine
(Excel Chart.Export as the oracle; 2010+ charts with #898989 lines);
OLE object previews (p:pic of the oleObj / v:imagedata of the VML; WMF without
a header); glow, soft edges, reflection, inner shadow effects and the theme's
effectRef; rotated 3D camera; 3D bars/pie; and .ppt conversion rules
matched 1:1 with PowerPoint's own (`_lab/grad-shapes.ts`,
`grad-agree.ts`, `pic-agree.ts`): gradients (angle, focus, mirror — 100% over
~13 thousand), recolored background (duotone), image adjustments (brightness/contrast/
grayscale/transparent — 97.7%), and <a:gamma/> in colors. Full round r6:
median **3.05**, mean **6.0** (r4: 3.37/8.42; start: 14.6/24.3); real .ppt
(gd) mean 10.1 → 5.9.

Afterwards (4th stage, 2026-10-14) — new rules MEASURED on synthetic decks
(`_lab/syn/*.cjs`, `gen-shapes.cjs`; all go back to 0 after the fix):

- **Gradient interpolation** depends on the stops: 2 stops at 0/100% = linear
  light with a sigma curve (normal Φ, σ = 0.25); 3 stops with equal ends =
  sigma per half (linear) or linear light (path); the rest = straight sRGB.
  The .ppt 2-color mirror comes out with 3 stops (it is the only way for the .pptx to
  reproduce the binary's "focus").
- **`circle` path gradient**: a circle circumscribed around the shape, shrunk toward
  the focus's center POINT (ring t: center F + t·(C − F), radius t·R), also
  with the focus outside the shape (Office 2007 themes); an inverted side collapses onto l/t.
- **Color**: shade/tint with the exact sRGB curve; satMod/satOff with S uncapped
  (only the RGB is clipped); chained modifiers in floating point;
  repeated `<a:alpha>` = the last one; luminance (grayscl, biLevel, duotone,
  `<a:gray/>`) Rec. 709 over sRGB. The same in the chart engine (Sheet).
- `innerShdw` comes from the shape's alpha (a translucent shape darkens inside);
  the shadow of a shape with an image follows the image's alpha.
- `useBgFill` = a window onto the slide background; default background = bg1; the
  placeholder inherits fill/outline/geometry (including custGeom) and
  effects from the layout/master; `<a:path fill="none">`; `rotWithShape="0"`
  (fill in the page's frame of reference, in the aligned box of the rotated
  shape); blipFill with no mode = tiling.
- EMF+ "EMF+ only" (images) and WMF with SCALEVIEWPORTEXT (metafile inside a
  metafile — "star" backgrounds in old .ppt files).
- Charts: styles 17–32/41–48 with the theme's 3rd fill; 35–40 with the
  plot area in the accent; blocks of 6 series (m = ⌊n/6⌋ + 1) and measured
  grays (light ones on dark styles); gridlines in tx1; axis density (+14 pt);
  equal values → axis from zero.
- SmartArt without a drawing: custom text (custT) with the recorded size/bold/
  italic and the theme font.

Full round **r7** (before the external focus/useBgFill/
custGeom fixes): median **2.80**, mean **5.15** (r6: 3.05/6.0; start:
14.6/24.3). Subset (s38): median 2.42, mean 4.27 (s27: 2.82/5.66).

Afterwards (5th stage, 2026-10-14): tabs (l/r/ctr/dec stops, inherited defTabSz,
a hanging indent takes the 1st TAB to marL), justified/dist text,
the layout's bodyPr MERGED over the master's, `normAutofit` without fontScale does NOT
shrink (measured), built-in table styles (63 from the app, by id), outline and
pattern on letters (rPr ln/pattFill), `fillOverlay`, private use area symbols
through the `<a:sym>` font, shadeToTitle, .ppt fill rules
matched with the app (picture frames, master), mono pattern brushes in
WMF/EMF. Round **r11**: median **2.41**, mean **3.98** (r10: 2.61/4.30;
r7: 2.80/5.15; start: 14.6/24.3).

Measured after r11 (`_lab/syn/lum.cjs`, 8 combinations, ±1 level):
`<a:lum bright contrast>` = (v − ½)·k + ½ + b·(1 + k)/2, k = 1/(1 − c) if
c ≥ 0, otherwise 1 + c — the contrast pivot moves by b/2 with the brightness (gd-198810
20.1 → 3.3). Mac PICT (16 decks, ~155 images): own player
(`pict.ts`); ptSize ≠ picFrame → horizontal scale on both axes and cropping
at the bottom; rotated text from TextBegin comes with an empty clip. **PowerPoint 365
does not display instance 0x542 PICTs** ("Não é possível exibir esta imagem", i.e. "This image cannot be displayed",
~30 images in 5 decks): we draw the content anyway, so those
slides diverge from the oracle on purpose. `a:fld` fields with their own rPr and
`slidenum` with the current number (the master's cache is always "1").

Afterwards (6th stage, 2026-10-14, parallel fronts — agents in worktrees,
integration into main with tests + regress + subset at each step). Round
**r12**: median **2.12**, mean **3.48** (r11: 2.41/3.98; real .ppt gd
4.09 → 3.51; read errors 61 → 40, all from invalid/password-protected input).

- Charts (`shared/charts`): background image/texture (tiling at the
  file's resolution), ticks/headroom from the font's line height, legend
  as a table, Office 2007 × 2010+ defaults (AppVersion), oblique 3D
  bars, 3D pie in perspective, data table, rich title.
- WordArt: envelopes between the two paths by arc length, single-path
  presets with rigid glyphs, text shadow (opaque without alpha; blur
  σ ≈ blurRad/3.1), .ppt WordArt and arcs like the app's conversion;
  letter fill (gradient/image/alpha); bevel with measured lighting
  (tables per rig/material), extrusion with camera, legacy .ppt 3D.
- Metafiles: .ppt Recolor, EXCLUDECLIPRECT, ROP2, PATINVERT, symbol
  fonts, full EMF+ player (the "dual" one plays the EMF+, like the app).
- .ppt: the tertiary FOPT no longer erases the primary's booleans (empty shapes and
  cells came out filled; rule × app 99.0% → 99.4%); fields with rPr
  and live slide number; Mac PICT.
- Geometry: custGeom with formula guides and arcTo; the TEXT rectangle of the
  geometries (presets and custGeom — the text wrapped across the whole box); measured
  shaded faces (darken ×0.6, darkenLess ×0.8, lighten 40% and
  lightenLess 20% toward white).
- Inheritance: the placeholder's bodyPr by idx in the layout and by type in the master;
  gradient without lin uses the style's direction (fillRef); fillOverlay as the base.
- Images: exact brightness/contrast (a:lum), blipFill in mc:AlternateContent
  (Mac), clipping by custGeom, OLE preview only in the Fallback and VML frame,
  alpha in pattFill, bodyPr rot.
- Measured and kept: single line spacing = 1.2 × sz in every font; the app
  does NOT draw with the EMBEDDED font (we do — web-intl-who diverges on
  purpose); PICT 0x542 not displayed by the app (we draw it).

End of the day (7th stage, 2026-10-14). Round **r13**: median **1.44**,
mean **2.48** (r10 in the morning: 2.61/4.30; start of the corpus: 14.6/24.3). By
source, r10 → r13: gd 3.11 → 1.82, gdx 3.14 → 1.75, lo 0.56 → 0.22, poi
2.19 → 1.21, web 2.04 → 1.23. Repo samples × PowerPoint 2.48% → 1.63%.

- **Line breaking** like the app's: glyph advance rounded to 1/8 pt,
  kerning only with `kern` and size ≥ kern/100, usable width truncated to 1/8 pt,
  break after a space and -–—, TAB stuck to the following word, a word longer than
  the line breaks between characters, fontScale rounds to the point; a missing font
  measures as Calibri. Census of 11,592 paragraphs: same breaks as the app in
  99.8% (was 98.3%).
- **Tables**: the app ignores `tableStyles.xml` (it uses the built-in definition by
  GUID; 74 styles regenerated), parts per region, border grid (edge
  owner, order, joins, dashed/compound), image in the cell and in the table,
  shadow, CJK/kinsoku.
- **SmartArt without a drawing**: layout engine (`diagram-layout.ts`) that generates the
  `dsp:spTree` like the app (lin/snake/composite/tx/sp/conn/hier/cycle/pyra,
  rules, user customizations) — LibreOffice SmartArt decks:
  median 19.0 → 1.5.
- Bevel/cube/shaded buttons also over gradient/image; outline alpha;
  `<p:pic>` with custGeom; bullet without a hanging indent; lab harness with the
  substitute font base (like the app).

### Still missing (by observed impact)

- 3D model (`am3d:model3d`, glTF): the app draws the model; the file's fallback
  is an empty PNG (web-gh-officecli-3d-model).
- 3D charts in perspective (area/bars with rAngAx=0) and 3D pie with
  strong perspective; axis maximum with a smoothed line (gdx-545393).
- 3D text (`sp3d` in bodyPr), back faces with lon > 90°, rare bevel
  presets (cross, artDeco…).
- Kerning of old fonts (Gill Sans MT, Palatino, Rockwell italic) differs
  from Chromium; wider CJK substitute font (gdx-615065); .ppt picture bullet
  (PP9) with a gradient (gd-014920).
- EMF+: white background of the nested WMF in gd-134981, unexplained.
- .NET port (`dotnet/src/UniversalOffice.Pptx/TextLayout.cs`) still without the new
  line-breaking rules (parity only covers md/html).

### Still missing — previous list

- .ppt WordArt: line spacing and text shadow (the common scale already matches).
- SmartArt without a drawing in the layouts not measured yet (arrow5, radial*,
  hierarchy1/2, gear, HexagonCluster…) and custom geometry
  (custScale/custLinFact) — ideally the app's layout engine
  (lin/snake/hierRoot/cycle algorithms + constraints) instead of families.
- Charts: 3D in perspective (rAngAx=0: area/line, 1 deck), data
  table (`c:dTable`, 1 deck), background image/texture (blipFill in the chart).
- Effects: shape bevel/3D (sp3d), legacy .ppt 3D (extrusion with lighting).
- Metrics of the missing font's substitute (Aptos/Calibri) × the app's: different
  line breaks (haunted-mansion slide 2: the table row grows;
  gd-601441 slide 5: "tt events" breaks earlier).
- PICT: QuickTime/JPEG inside the PICT (poi-pictures), fine position of rotated
  text; picture bullet in the PP9 master style.

## Corpus

| prefix | source | decks | nature |
|---|---|---|---|
| `lo-`  | LibreOffice core `sd/qa`, `oox/qa`… (sparse clone) | 625 | bug reproductions, synthetic |
| `poi-` | Apache POI `test-data/slideshow` | 242 | bugs + fuzz (clusterfuzz) |
| `gd-`  | GovDocs1 (.gov, ~1997–2009), `.ppt` sampled through HTTP Range | 250 | **real, binary** |
| `gdx-` | GovDocs1 `pptx.zip` | 209 | **real, Office 2007/2010** |
| `web-` | 120 URLs from .gov/.edu/WHO/EU/GitHub (2016–2026) | 119 | **real, modern**: pt-BR (23), JA (10), AR/HE (10), ZH/KO (10), Morph/Zoom/3D/SVG/equations |

### Security (GovDocs warns that it contains malware)

1. Windows Defender on everything (`MpCmdRun -Scan -ScanType 3`): **no threats**.
2. Static triage (`_lab/triage.ts`, reads bytes only): real type from the
   content, sha256/dedup, macro (real VBA — the empty `VBAInfoAtom` that every .ppt
   has does NOT count), ActiveX, OLE, external/UNC links (NTLM leak, dialogs),
   executable inside the package → quarantine.
3. **Exploit cases** from the test suites (`sd/qa/.../ppt/{pass,fail}`: CVE-2006-3655,
   CVE-2010-0033, EDB-39395…; POI's clusterfuzz) only go to the JS parser —
   **never** to PowerPoint.
4. PowerPoint oracle only for `pptSafe` (1,301), with `AutomationSecurity=3`
   (macros forcibly disabled), `DisplayAlerts=none`, ReadOnly, no window and a
   watchdog that kills only the instance it opened.
5. *Office File Validation* refused 3 real GovDocs `.ppt` files
   (`gd-080346/153652/638272`) — we open them normally (JS parser in a
   sandbox; ok).

## Robustness — excellent

- Reading (Node, same path as the viewer): **1,407/1,445** open (the 119
  modern web decks: 119/119, no slide with an error); the 38
  failures are fuzz/encrypted/PowerPoint 4.0 and fail with a friendly
  `PptFormatError`. **Zero hangs, zero generic exceptions.**
- Rendering (headless viewer): **zero painting exceptions/timeouts** across the 1,445.
- Real exceptions to fix:
  - `gd-171059.ppt`: PowerPoint opens it (12 slides), we refuse it with
    "UserEditAtom ausente" (UserEditAtom missing) → a scanning fallback is missing for when the
    persistence chain is broken.
  - `gd-089485`, `gd-551098`: "Compound File sem entrada raiz" (Compound File without a
    root entry) (not tested in PowerPoint, for safety).
- The viewer **swallows** `readSlide` errors and shows a blank slide
  (`universal-slides-viewer.ts`, `catch { slides.push({ shapes: [] }) }`)
  — it should at least flag it.
- Performance: converting large `.ppt` files takes up to 6 s / 25 slides
  (`gd-509598`, `gd-526699`, `gd-544523`).

## Fidelity — where we stand

`blk` metric = % of 8×8 blocks whose average diverges by > 24 (ignores antialiasing).
6,603 slides compared (up to 12 per deck, 960 px).

| source | slides | median blk% |
|---|---|---|
| `lo-` synthetic | 742 | **1.3** |
| `web-` modern | 874 | **5.6** |
| `poi-` | 691 | 12.7 |
| `gdx-` Office 2007/10 | 1,714 | 16.6 |
| `gd-` binary .ppt | 2,582 | **21.5** |

The synthetic tests hide the problem: the real world — above all Office
2007–2013 themes and `.ppt` — diverges a lot.

## What to refine (by impact)

Counts = how many of the 1,326 decks (without the web ones) use the feature (XML census,
`_lab/corpus-parse.ts`, tag p2). With the 119 web decks (tag p3): spcPct 812, bgRef 703,
buClr 539, buFont-symbol 386, cap 361, WMF 286, EMF 165 (20 of them modern),
baseline 244, tab 158, non-default clrMap 70 + override 48; the modern ones
also show SVG 25, Morph 7, Zoom 2, 3D model 1.

### P0 — the whole slide comes out wrong

1. **The master's `<p:clrMap>` and `<p:clrMapOvr>` are ignored.** `theme.ts` uses a fixed
   `bg1=lt1, tx1=dk1` map. Every dark theme (`bg1="dk1"`) swaps background/text.
   66 + 46 decks; **median 95.7% divergence** with the feature × 6.3% without.
   E.g.: `gdx-037027`, `gdx-037832`, `web-en-uva-phys2415-faraday-induction`.
2. **`<p:bgRef idx>` not supported** — background coming from the theme's `bgFillStyleLst`
   (solid/gradient/image; idx ≥ 1001). `read.ts` only reads `<p:bgPr>`. 630 decks.
   E.g.: `gdx-036275` (blue → white gradient), `poi-themes` (texture).
3. **`.ppt`: placeholders get a white background + black border.** The converter
   applies the MS-ODRAW default (`fFilled`/`fLine` = true) when the slide's FOPT
   does not carry the property and writes explicit `solidFill FFFFFF` + `<a:ln>`
   (`ppt/shapeconv.ts` `fillXml`/`lineXml`); the master's placeholder has
   `noFill`. It should omit them (pptx inheritance). Affects almost every real `.ppt`.
   E.g.: `gd-013559`, `gd-011197`, `poi-missing_core_records`.
4. **WMF/EMF are not drawn** (the `<img>` fails and leaves a hole). 278 decks
   with WMF, 145 with EMF (clip art, pasted OLE charts/equations, institutional
   logos in modern templates). Also TIFF (9), PICT (22) and `.wdp`
   (JPEG XR). Write already has `write/packages/docx-layout/src/{emf,wmf}.ts`, but
   it produces docx-layout `PageItem`s — extract to `shared/` with a neutral output
   (display list) and consume it in both. E.g.: `gd-000165`, `gd-010668`
   (OLE chart), `gd-014920` (equations), `web-ja-kanagawa-u-template`.
5. **An image in a placeholder (`<p:pic>` with `<p:ph type="pic">`) without its own
   `xfrm` disappears.** `readPic` does not read the `<p:ph>`, so the layout's geometry
   inheritance (`read.ts` ~155) does not apply. Standard in modern templates.
   E.g.: `web-intl-who-hiap-communication-workshop` #4, `web-eu-eea-europe-environment-2025` #1.
6. **SmartArt without a `drawingN.xml` cache** (Office 2007 files) becomes a black
   block. Minimum: paint nothing / use the text; ideal: a diagram layout
   engine. E.g.: `gdx-073128` #8.

### P1 — text and bullets

7. **`spcBef`/`spcAft` in `spcPct`** ignored (only `spcPts`) — **781 decks**
   (it is the default for every converted `.ppt` and for old masters).
8. **Bullets:** symbol font (`buFont` Wingdings/Symbol → PUA glyph
   0xF0xx comes out as a letter/☐; needs a Wingdings/Symbol→Unicode table or an equivalent
   open font) 359; `buClr` 480; `buSzPct/Pts` 304; `buBlip` 38;
   numbering (`buAutoNum`) lost in `.ppt` (`gd-013559`).
9. **Run:** superscript/subscript (`baseline`) 232; `cap="all|small"` 332;
   runs in the Symbol font (μ → m) 153; character spacing (`spc`) 54;
   strikethrough; highlight (`highlight`). The `Run` model today only has
   sz/bold/italic/underline/color/font/hyperlink/shadow.
10. **`fillRef idx` 2/3** uses only the solid `phClr` color — it should apply the
    theme's `fillStyleLst` (gradients). 70 decks. Same for `effectRef`.
11. **Tabs** (`<a:tab>`) 145 decks.

### P2 — specific

12. `.ppt`: footer/date/number show up when the deck turns them off
    (`gd-013559`, `gd-011197`); TextRuler indents; WordArt (`gd-661517`);
    master line widths; `UserEditAtom` fallback.
13. Modern: section/slide Zoom (`pslz`) should use the fallback image
    of the `mc:AlternateContent` (`web-gh-hta-learning-zoom-feature`); image
    effects (grayscale, duotone, recolor — `clrChange` 26, `duotone` 6);
    3D chart (`gdx-243784`); reflection/glow.
14. Diagnostics: flag a slide that failed in `readSlide` instead of showing it blank.

## Reproduce

Scripts in `E:\UniversalSlidesTest\_lab` (outside git):

```
node _lab/zip-sample.mjs <url-zip> <dir> <n> [seed]        # GovDocs sample through Range
run-ts.mjs _lab/triage.ts E:/UniversalSlidesTest           # triage + manifest.json
run-ts.mjs _lab/corpus-parse.ts E:/UniversalSlidesTest <tag>  # robustness + census
node _lab/ppt-driver.mjs E:/UniversalSlidesTest 12 [regex] # PowerPoint oracle
node _lab/corpus-render.mjs <tag> 12 4 [regex]             # our render
node _lab/corpus-compare.mjs <tag>                         # metrics + worst.html
node _lab/sbs.mjs <tag> <id> <n> <out.png>                 # side-by-side pair
```

`run-ts.mjs` = `slides/tools/ppt-lab/ppt-binary/run-ts.mjs`. After each
fix: run render+compare with a new tag and compare the medians per source.
