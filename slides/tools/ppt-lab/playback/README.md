# AUTOMATIC PLAYBACK lab — PowerPoint × our player

End-to-end test of the presentation playing **on its own** (rehearsed timings,
like kiosk mode/"use timings"): real PowerPoint is the oracle, captured
**frame by frame**, and our `<universal-slides-viewer>` is captured at the
**same instants**. The comparison separates **timing** errors from **visual** errors.

```bash
# everything (the corpus is only generated if missing; the oracle only for what is missing)
node tools/ppt-lab/playback/run-playback.mjs
# a subset / another frame rate / regenerate the corpus / redo the oracle
node tools/ppt-lab/playback/run-playback.mjs --decks pb-tempo,showcase_animado --fps 30 --default-slide 3 --gen --force-ppt
# view the reports (the <video> needs Range)
node tools/ppt-lab/playback/serve.mjs   # → http://127.0.0.1:8126/tools/ppt-lab/results/playback/index.html
```

Requirements: Windows + PowerPoint 16 (COM), ffmpeg/ffprobe on the PATH, Playwright
(Chromium) from the `slides` workspace.

## Pipeline

| step | file | what it does |
|---|---|---|
| corpus | `gen-playback.ps1` | generates the decks `samples/playback/pb-*.pptx` **and** `.ppt` through COM (+ `showcase_animado.ppt`) |
| oracle | `capture-ppt.ps1` | `Presentation.CreateVideo` (rehearsed timings, N fps, 720p, quality 100) → `ppt.mp4`; `ppt-manifest.json` (transition/timing/effects through COM); `ppt-slides/slideN.png` (final state) |
| ours | `capture-ours.mjs` + `harness.ts/html` | viewer in `play()` in headless Chromium under a **virtual clock** (`page.clock`); each frame at the exact instant of the PowerPoint frame → lossless `ours.mkv` + `ours-timeline.json`. Video/GIF in `media: 'seek'` mode (exact seek before each frame); `.ppt` opens through the converter in `slides-core/src/ppt` |
| compare | `compare-playback.mjs` | metrics + `report.html` per deck/format + `index.html` |
| support | `inspect-timing.mjs`, `fonts.mjs`, `frames.mjs`, `serve.mjs` | timing model of a deck; OS fonts (theme + typefaces) for the harness; video reading; server with Range |
| diagnostics | `diag-effects.mjs`, `strip.mjs`, `trans-curves.py`, `fade-curve.py`, `slide-phase.py` | ranking of effects by divergence; PowerPoint × ours frame strip; reveal curve per transition; blend curve of the fade; real start of each slide in the app (fade phase) |
| hand-made corpus | `gen-graficos-partes.ps1` + `.py` | chart/SmartArt **by parts** (COM cannot create it): the app generates the base deck, the `.py` writes the build into the XML and the app **re-saves** it (.pptx + .ppt) — the re-saved file is the reference. Only the base deck needs a window (`-Rebuild`) |
| live F5 | `f5-probe.ps1 [-Only A,H,…]` | **a real slide show** (full screen — only with the user's approval): probe deck + scenarios (timing, early click, going back, hidden, `advClick`, end); state of the `SlideShowView` every ~15 ms and, in scenarios H–M, an image of ONLY the slide show window (`PrintWindow`) → `_probe/f5/` |

Nothing opens a window: PowerPoint (COM) only runs when the oracle video is missing
(`run-playback.mjs`); to compare again without touching PowerPoint, call
`capture-ours.mjs` and `compare-playback.mjs` directly (the oracle stays cached).

Output: `tools/ppt-lab/results/playback/<deck>/<pptx|ppt>/` — `ppt.mp4`,
`ours.mkv`, `sbs.mp4` (PowerPoint | ours | difference), `keyframes/`,
`compare.json`, `report.html`.

## Metrics

Analysis at 640×360, channel tolerance 40 (like `compare-deck.mjs`):

- **strict** — PowerPoint frame k × our frame k (same instant): timing + visual together;
- **aligned** — each of our frames × the most similar PowerPoint frame according to
  a monotonic time alignment (DTW on 16×9 thumbnails): visual only;
- **timing** — total duration and offset of the start of each slide. The start in
  PowerPoint is the last frame equal to the final state of the previous slide
  (`Slide.Export`) when that state is static; otherwise, the DTW estimate
  (the `startHow` field in the JSON) — with 3D transitions, which start out still, the detected
  start lags and the per-slide offset gets noisy (the total duration does not).
- `.ppt`: compares **PowerPoint(.ppt) × our player(.ppt)** (`PptxPackage.load`
  converts the 97-2003 binary). If ours does not open the file, the report falls back to
  "format mode": **PowerPoint(.ppt) × PowerPoint(.pptx)** — what the format
  itself loses.

## Timing semantics measured in PowerPoint (oracle)

Measured frame by frame in the videos (calibration decks + `pb-tempo`) and
implemented in `slides-core/src/timing.ts` + `playback.ts`:

1. **HYBRID export clock**: the timeline (timings, animations) advances
   **33 ms per frame** (10 s = 303 frames), but **transitions and media count
   frames at 30/s** (1 s = 30 frames = 990 ms of video; half a frame rounds
   DOWN: 0.75 s = 22 frames). Our capture uses exactly those instants
   (`tickMs: 33, transitionFps: 30`).
2. **Transition**: `p14:dur` wins; otherwise `spd` fast=500 / med=750 / **slow=1000** ms
   (the viewer's v1 model uses 300/500/1000 — wrong for fast/med). 2010+ transitions
   and durations outside the 3 values come in `mc:AlternateContent` (the v1 parser does not see them).
   The 1st slide enters **from black**; the 1st frame of the video is **always black**
   (a 1st slide with a plain cut enters 1 frame later).
3. **Phases in ticks**: animations start **2 ticks** after the end of the transition
   (including a plain cut; not on the 1st slide without a transition); the slide ends at
   the start of the animations + max(D, A), rounded up to the tick, **+1 tick**
   when the animations run past the timing (A ≥ D).
4. **Timing**: D = `advTm` (without it, the export's "default duration"). If the
   animations run past D, the slide waits for them to finish.
5. **"On click" steps fire on their own**: the leftover max(0, D − A) becomes K+1
   equal waits (before each click and after the last one).
6. **"After previous" chains dynamically**: the `delay` recorded in the sub-`par` is
   only a cache; playback starts when the previous one actually ends — **1 ms
   later** (measured through the fade phase: it only shows when the end falls right before
   a tick, e.g. 3001 ms/6500 ms with 5–12 links = 1 extra frame).
7. **Children of `mainSeq`**: only the 1st with `evt="onBegin"` is automatic; any
   other (including with a numeric `delay`, as in `showcase_animado`) is a
   click step — the delay is ignored.
8. **Text by letter/word** (`<p:iterate>`): letters = characters **without spaces**;
   if the shape has a **visible background** (fill or outline — including a filled
   text box), the background is an initial unit of full duration and animates
   (fill color, fade…): total = base + base + (n−1)·interval.
   Controlled experiment: `<p:bldP animBg>` **changes nothing** (neither timing nor
   visual); a text box without a background never has that unit. (The delay cache
   recorded by PowerPoint leaves that background out.) An effect undefined per letter
   ("bold reveal"): only the spread (n−1)·interval holds the sequence.
9. **"Cut through black"** lasts the transition time: half on the previous slide,
   half in black. A plain cut is instantaneous even with `p14:dur`.
10. **Hidden** slides are skipped; **interactive triggers** do not fire on their own.
11. Color: PowerPoint's MP4 is **untagged BT.709** YUV — decoding as BT.601
    shifts colors by up to 17 levels (`frames.mjs` forces BT.709).
12. **Media** (measured with a per-frame barcode video/GIF,
    `_probe/media`): before the `playFrom` command the shape shows the **poster frame**; the video
    starts **2 ticks** after the command and advances **1/30 s per frame**; the media node
    ends at command + duration, so the video **freezes** ~2 frames before the end
    of the file (and the app still repeats/skips a video frame every now and then).
    The **GIF** advances from the start of the slide's animations, also at 1/30 s per
    frame (100 ms = 3 frames), and shows its 1st frame during the transition.
13. **2D transitions**, measured curves (`trans-curves.py`): wipe/split/strips
    are smooth ramps the size of the slide; circle/diamond/plus are softer (band 0.5);
    push ≈ cosine; straight cover = power-3 ease, diagonal = cubic
    ease-out; straight uncover ends at 90% of the time, **diagonal** goes out between 7% and 38%;
    2 px random bars with a triangular start in [0.18; 0.58]; blinds with 12
    staggered 3D slats; checkerboard 10×6 by column; clock/wedge with a **feathered**
    leading edge (wheels with 3+ spokes: sharp); **smooth reveal**: the background blends
    linearly and the content passes through the blended background color (midpoint = background only).
14. **Repeat until next click** (`repeatCount="indefinite"` +
    `<p:endCondLst><p:cond evt="onNext">`): stops when the next step fires;
    "until end of slide" = just `indefinite`. In `.ppt`, "indefinite" is FLT_MAX.
15. **Media bookmark** (`<p:cond evt="onMediaBookmark"><p14:bmkTgt bmkName>`,
    `<p14:bmk time>`): the interactive sequence fires **on its own** when the video
    passes the bookmark (command + 2 ticks + position on the media clock).
16. **Video options** (barcode): **trim** (`p14:trim st/end`, the command
    records the trimmed duration) starts at the trim point; **fade** (`p14:fade`)
    blends the video OVER the poster frame and, after the end, the poster frame stays; **rewind**
    (`fill="remove"` on the node) goes back to the poster frame; **hide while not playing** (`showWhenStopped="0"`)
    appears at the command and disappears at the end; **full screen** (`<p:video fullScrn="1">`)
    covers the slide while it plays; **loop until stopped** — the export does **not** loop
    (it plays to the end of the file and freezes); a **linked** video plays in the app.
    On slides with these options the slide ends ~3–6 frames earlier (what is left
    after the command seems to count on the media clock) — not modeled.
17. The export ignores "show **without animation**" (`showAnimation="0"`).
18. The export's MP4 has **timestamp gaps** (e.g.: 957 ms with no frame): reading it as
    rawvideo (constant rate) repeats the previous frame — index = time/33 ms.
    Tools using `select(n)` need `fps=1000/33` first (`strip.mjs` does this).
19. **Fade** (`<p:fade/>`): the blend follows **(1 − cos πp)/2**, it is not linear
    (`fade-curve.py`: residual ~0 on in-phase slides); **through black**: each half
    (the old one leaves, the new one enters) with the same curve. Since the curve is known, the
    fade PHASE measures the real start of each slide with 0.1-frame precision
    (`slide-phase.py`).
20. **Chart by parts** (`<p:graphicEl><a:chart seriesIdx categoryIdx bldStep>`,
    `<a:bldChart bld>`): each part (series, category, point) animates in the **box of its
    own marks** — the "wipe" of a series goes from the base to ITS tallest
    column, not to the chart frame; the background (`gridLegend`: gridlines, axes, legend)
    uses the frame.
21. **SmartArt by parts**: `<a:dgm id>` is the `modelId` of the **drawing shape**
    (`dsp:sp modelId` = the "pres" point of the data model). With the id of the data NODE
    the app accepts and re-saves the file, but **nothing animates** (static shape). Each
    shape animates in its own box ("level at once" = all together, each one in
    its own). In `.ppt` the SmartArt is an IMAGE and the metroBlob keeps the whole
    diagram (`drs/e2oDoc.xml` + `drs/diagrams/*`): the app rebuilds it — and animates it
    by parts. A chart in `.ppt` is an OLE object (BIFF8 data, `convChart="1"`): the
    app converts it back; we show the image.
22. **Chart background**: `<c:chartSpace><c:spPr><a:noFill>` (the default for charts
    inserted in PowerPoint 2013+) is transparent — without `spPr`, white.

## LIVE slide show (F5) — measured with `f5-probe.ps1`

The video export does not show the presenter; the probe runs a real F5 through COM
(`SlideShowSettings.Run`, `View.Next/Previous/GotoSlide`) and reads `GetClickIndex`,
`State` and `SlideElapsedTime`. Implemented in `slides-core/src/slideshow.ts`
(`SlideShow`) and in the viewer's `present()`.

1. **Slide with a timing** ("use timings" on): "on click" steps
   fire **on their own**, at the same times as in the export (K+1 equal waits) — 3 s
   and 3 clicks → 0.75 / 1.5 / 2.25 s, advance at 3 s. The clock starts at the **end**
   of the transition (`SlideElapsedTime` stays 0 during it).
2. **An early click** only brings that step forward: the times of the others and the
   advance do not change.
3. **Slide without a timing**: steps wait for the click; it does not advance on its own.
4. **A command during the transition** (forward or back) completes the transition right away
   (the slide clock starts there); it does not fire a step.
5. **Going back** (`Previous`): slide without a timing → undoes one step at a time; slide
   **with** a timing → **rewinds** all click steps and the clock stops;
   the next click restarts it from zero (advance = that click + D). With no step to
   undo → the previous visible slide in its **final state**, through the transition of the
   slide that is **leaving**, played **in reverse** (push from the right goes back
   from the left; the 3 s fade of the leaving slide lasts 3 s); there it no longer advances
   on its own.
6. A **hidden** slide is skipped in both directions; `GotoSlide` (jump) plays the
   destination's transition.
7. **"Advance on mouse click" off**: a mouse click (message to the window) does not
   change slides; `Next`/keyboard does. A mouse click fires a step.
8. **End**: after the last slide, a black screen with "Fim da apresentação de
   slides. Clique para sair." ("End of slide show, click to exit."; interface text ~11 px on a 1080 screen, at the
   top, centered); the next command exits.
9. Probe pitfalls: `SlideShowWindow.HWND` comes back empty — the window is the
   PowerPoint process's `screenClass`; `Run()` only returns after the
   1st slide's transition (`GotoSlide` returns right away); `Presentations.Add(0)`
   (no window) makes `Run()` return null — reopen with a window; the 1st automatic
   click on a slide WITHOUT a transition comes ~160 ms late in the app (latency;
   the following ones land on time); `powershell -File` passes `-Only A,B` as
   a single string.

## Corpus

| deck | covers |
|---|---|
| `pb-transicoes-classicas` | 33 2D transitions (cut, through black, fade, push, wipe, split, shapes, cover/uncover, strips, blinds, clock, wheel, wedge, checkerboard, dissolve, comb, newsflash…), durations 0.5/1/2 s and default |
| `pb-transicoes-dinamicas` | 30 3D/"exciting" transitions (fall over, curtains, wind, fracture, origami, vortex, cube, gallery, doors, orbit…) + **Morph** |
| `pb-entrada` / `pb-enfase` / `pb-saida` | ~50 entrances, ~30 emphases, ~30 exits (default duration of each effect, after previous) |
| `pb-trajetorias` | 24 motion paths (lines, arcs, curves, shapes, loops), simultaneous |
| `pb-texto` | by paragraph, by word, by letter (typewriter), fade/hide afterwards, reverse order, emphasis on text, levels |
| `pb-tempo` | with/after triggers, delays, durations, repetition, auto-reverse, rewind, smooth/bounce, clicks with/without a timing, timing 0, hidden slide, interactive trigger, enter-exit-enter, long transition, cut through black |
| `pb-midia` | video and audio with autoplay, animated GIF, chart, SmartArt, table, image (zoom + spin), group |
| `showcase_animado` | existing real deck (12 slides, ~400 effects) |
| **complement** | |
| `pb-transicoes-variantes` / `-3d` | ALL the remaining directions/options of the `PpEntryEffect` enum (diagonal cover/uncover, strips, vertical comb/checkerboard/bars, wheels with 2/3/8 spokes, push ↓→, wipe →/through black, vortex/ripple/shimmer/gallery/cube/rotate/box/orbit/pan… in every direction), **Random**, **Morph by word/character** |
| `pb-saida-2` / `pb-trajetorias-2` | the ~22 remaining exits and ~40 remaining motion paths + a drawn (custom) motion path |
| `pb-texto-2` | by 3rd/4th/5th level, hide on next click, 2 columns, vertical text by letter, a different effect per paragraph + emphasis on just one, autofit + letters in reverse order |
| `pb-tempo-2` | repeat until end of slide / until next click, 2× speed, delay longer than the timing, grow ×2 + auto-reverse + accelerate |
| `pb-midia-2` | **barcode** video (each frame carries its number): trim, fade, loop, rewind, hide while not playing, bookmark firing an effect, linked, full screen; background audio across slides |
| `pb-graficos` | charts and SmartArt (no animation: COM refuses "by series/category/node") |
| `pb-graficos-partes` | chart **by series, by category, by element of the series/category** (columns, pie, lines) and SmartArt **one by one, level at once, one by one reversed** — build written into the XML and validated by the app (`gen-graficos-partes.ps1`) |
| `pb-365` | SVG icon (only `svgBlip`, no PNG) and 3D model (glTF) |
| `pb-config` | "show without animation" (the export ignores it) |

All in `.pptx` and `.ppt`. The COM model does not expose "by series/category" for
modern charts nor "by node" for SmartArt (`Invalid request`, including
`AddEffect`/`ConvertToBuildLevel` with the diagram levels): the
`pb-graficos-partes` deck writes those builds into the XML and the app validates them by re-saving.
Without a window COM does not expose `SmartArtLayouts` either (nor `AddChart2`) — that is why
the corpus SmartArt only uses the default layout (blocks; no connectors and no
multi-shape nodes). Legacy transitions (fly/peek/crawl/zoom/stretch) are not
valid as transitions (COM refuses them).

## Results (2026-10-06, 30 fps, default duration 3 s)

Our player × PowerPoint playing the SAME file. Divergence = % of pixels
outside the tolerance (average over the frames); 1 frame = 33 ms.

| deck | .pptx strict | .pptx aligned | .pptx duration | .ppt strict | .ppt aligned | .ppt duration |
|---|---|---|---|---|---|---|
| pb-entrada | 1.26% | 1.10% | 0 | 1.26% | 1.10% | 0 |
| pb-enfase | 1.82% | 1.79% | −33 ms | 1.82% | 1.79% | −33 ms |
| pb-saida | 2.22% | 2.09% | 0 | 2.22% | 2.09% | 0 |
| pb-trajetorias | 2.59% | 1.32% | 0 | 2.59% | 1.32% | 0 |
| pb-texto | 2.25% | 2.25% | 0 | 2.25% | 2.25% | 0 |
| pb-tempo | 1.95% | 1.74% | 0 | 1.79% | 1.64% | 0 |
| pb-midia | 4.96% | 1.99% | −33 ms | 2.19% | 2.18% | −33 ms |
| showcase_animado | 2.56% | 2.23% | −33 ms | 3.95% | 3.91% | 0 |
| pb-transicoes-classicas | 7.21% | 5.79% | 0 | 6.12% | 5.48% | 0 |
| pb-transicoes-dinamicas | 27.88% | 25.29% | 0 | 2.92% | 2.92% | 0 |
| **complement** | | | | | | |
| pb-saida-2 | 1.74% | 1.62% | 0 | 1.74% | 1.62% | 0 |
| pb-trajetorias-2 | 3.28% | 1.48% | 0 | 3.28% | 1.48% | 0 |
| pb-texto-2 | 1.66% | 1.66% | 0 | 1.68% | 1.68% | 0 |
| pb-tempo-2 | 1.99% | 1.47% | 0 | 1.97% | 1.45% | 0 |
| pb-midia-2 | 11.85% ² | 1.35% | 0 | 0.85% | 0.85% | 0 |
| pb-graficos | 3.97% | 3.97% | 0 | 1.20% | 1.20% | 0 |
| pb-graficos-partes | 2.84% | 2.82% | 0 | 8.70% | 8.31% | 0 |
| pb-365 | 0.72% | 0.72% | 0 | 0.72% | 0.72% | 0 |
| pb-config | 1.78% | 1.62% | 0 | 1.78% | 1.62% | 0 |
| pb-transicoes-variantes | 8.23% | 6.40% | 0 | 6.88% | 5.91% | 0 |
| pb-transicoes-variantes-3d | 29.84% | 27.86% | 0 | 3.47% | 3.47% | 0 |

² slides with video options end 3–6 frames earlier in the app (item 16):
the drift accumulates; the aligned metric (1.35%) shows that the content matches.
The "2 colunas" (2 columns) slide of `pb-texto-2.ppt` (previously −3036 ms) has an empty PPT10 tree;
the converter now uses the original round-trip `<p:timing>`
(`RoundTripAnimationAtom12` → `drs/timingInfo.xml`), like the app.

History: before this lab the viewer had no automatic playback; the 1st round
(fade only + a naive timing model) gave strict 15.1% / aligned 10.8% over the
whole set, emphasis 15.7%, motion paths 12.4%, classic 16.3% and −1.24 s on emphasis.

`.ppt` in PowerPoint itself (× .pptx): 2010+ transitions (vortex, cube, reveal,
flash, Morph…) become a **1 s fade**; durations drop to fast/med/slow (2 s → 1 s);
the showcase animations and the "play video" of pb-midia **disappear** — that is why the
dynamic transitions in .ppt match easily (our converter reproduces the same loss).

## Gaps in our player (by measured impact)

1. **3D / "exciting" transitions** (cube, vortex, gallery, doors, orbit…) and
   **Morph** (including by word/character) — 2D approximations or a cross
   fade (dynamic ~25%, 3D variants ~28%).
2. **Residual 2D transitions**: checkerboard (13–17%: the app rotates the pieces in
   PERSPECTIVE), vertical comb (~23%: the app pushes the strips and finishes earlier),
   wheels with 3/8 spokes (13–19%), **random** (the app's random pick), dissolve/random
   bars (random in the app).
3. **Chart in `.ppt`**: it is an OLE object (BIFF8) and the app converts it back into a
   chart (and animates it by parts) — we show the static image (~11–12% on those
   slides). SmartArt with connectors/multi-shape nodes was not measured (see
   Corpus). The feathered edge of "wipe" only on the whole shape and on chart
   parts — by paragraph/letter it is still sharp; the other filters (split,
   blinds, circle…) were not measured for their edge.
3b. **Slide end ±1 frame** residual: slide 3 of `pb-enfase` (emphases with
   repetition/auto-reverse: probably the inner links also add 1 ms each) and
   −33 ms on `showcase`/`pb-midia` (`slide-phase.py` measures the start of each slide).
4. **"Grow with color" by letter**: the app re-lays out the line as each letter
   grows (`style.fontSize` per unit) — today only the color advances.
5. **Media**: slide end with video options (3–6 frames); a LINKED video outside
   the package does not play in the browser (the poster frame stays); "loop until stopped" only loops in
   real-time mode; audio fade; the video ends ~1 frame after the app's.
6. **`.ppt`**: EMF/WMF/PICT images are not drawn; `.ppt` video/audio only
   as a poster frame; animations ONLY in the legacy format (AnimationInfo, with no PPT10 or round-trip
   XML — genuine 97-2003 files) do not convert.
7. Manual mode still uses the v1 model (`spd` 300/500, no `mc:AlternateContent`,
   PowerPoint's 3-level `<p:timing>` is not read) — unify with `timing.ts`.

## Test limitations

- The oracle is the **video export**; the total duration measured live (state of the
  slide show window through COM) matched the video (10.57 s × 10.6 s on
  `pb-trajetorias`). Live screen recording was discarded: it depends on nothing
  covering the window and captures the rest of the desktop.
- `dissolve`/`random bars` are random in PowerPoint — there is no way to match
  them pixel by pixel.
- Static text already diverges ~2–3% (font metrics); this shows up as the floor of the
  aligned metric.
