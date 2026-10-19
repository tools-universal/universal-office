# @universal-office-pro/slides

The `<universal-slides>` web component — a **.pptx editor** built on the same
rendering as [`<universal-presentation-viewer>`](../viewer/README.md): slides
faithful to Microsoft PowerPoint, transitions, animations, the slide show and
automatic playback, plus editing.

![The slides editor: navigating, editing text and presenting](../../../site/assets/gifs/slides.gif)

- Everything the viewer does (it extends `UniversalPresentationViewerElement`):
  same methods and events, slide show, playback, thumbnails, notes
- In-place text editing: double-click a text shape
- Fonts in the file: embed the used fonts when saving, like PowerPoint's
  "Embed fonts in the file"
- Opens .pptx and .ppt; saves .pptx

The editor has no built-in control bar — it is meant to sit inside your own
app UI (slide list, toolbar). It shows an "n / N" counter and draws the slide
on a neutral frame.

## Installation

Obtain the package from **PrivJS** and follow the setup instructions there.

The package is self-contained — no dependencies. Serve `chunks/` and `fonts/`
next to `index.js`, as for the viewer.

```js
import '@universal-office-pro/slides';
```

```html
<universal-slides id="deck" fonts="/office/fonts" style="display:block; height:80vh"></universal-slides>
```

```js
const deck = document.getElementById('deck');
deck.loadPptx(new Uint8Array(await (await fetch('/pitch.pptx')).arrayBuffer()));
deck.addEventListener('us-shape-edit', (e) => console.log(e.detail)); // { slide, shapeIdx, text }

document.querySelector('#present').onclick = () => deck.present('start');
```

## API

All attributes, methods and events of
[`<universal-presentation-viewer>`](../viewer/README.md#methods) apply, except
the control-bar ones (`nocontrols`, `no<item>`, the `--upv-controls-*`
properties and the bar's parts). In addition:

| Member | Description |
|---|---|
| `beginEditShape(shapeIdx)` · `commitEditShape()` · `cancelEditShape()` | Text editing of a shape on the current slide (also by double-click). Enter commits, Shift+Enter adds a line, Escape cancels. |
| `savePptx(): Promise<Uint8Array>` | Saves the presentation with the font-embedding setting applied. |
| `getFontEmbedding()` · `setFontEmbedding({ embed, subset, skipCommonFonts })` | Fonts in the file. Default: off; when on, only the used characters, and never the common fonts PowerPoint skips (Arial, Times New Roman, Courier New, Calibri, Aptos). |

| Event | `detail` | When |
|---|---|---|
| `us-shape-edit` | `{ slide, shapeIdx, text }` | A text edit was committed. |
| `us-font-embedding` | `{ embedded, skipped: { family, reason }[] }` | After `savePptx()`; `reason` is `'common'`, `'license'` or `'unavailable'`. |

## Current limitations

Text edits change the slide on screen but are **not yet written to the saved
file** — `savePptx()` keeps the original slide content and applies only the
font-embedding setting. Edited text keeps the formatting of the first run of
each line.
