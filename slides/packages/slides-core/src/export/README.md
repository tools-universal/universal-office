# slides-core/export

Slides exporters (spec 05): `.pptx` (bytes) → **Markdown**, **static
HTML**, **vector PDF** and **PNG images per slide**. Browser + node, with no
required `fs`/DOM. **NO video** (out of scope).

```ts
import { pptxToMarkdown, pptxToHtml, pptxToPdf, pptxToImages } from '@universal-office/slides-core';

pptxToMarkdown(bytes, { images: 'data' | 'omit' });   // string
pptxToHtml(bytes, { images: 'data' | 'omit', fullDocument: true }); // string
pptxToPdf(bytes, { fonts });                          // Uint8Array
await pptxToImages(bytes, { scale, canvas });         // Uint8Array[] (1 PNG/slide)
```

## Markdown

`## Slide N — <title>` (title/ctrTitle placeholder; otherwise the first text),
bullets per level (`-`; buAutoNum becomes a numbered list), GFM tables, images
as `[imagem]` (default) or data URI (`images: 'data'`), speaker notes
(notesSlide part) as a blockquote. The text uses the style cascade of spec 03,
already resolved on read.

## HTML

One `<section class="slide">` per slide (natural width @96dpi + `aspect-ratio`
from sldSz), absolute shapes in % (EMU→%), fills/gradients/borders/text with
inline styles, data URI images (default; `images: 'omit'` removes them), HTML
tables, slide background. Static — no animations/transitions.

## PDF (vector)

Implemented in office-converter (`vendor/`): 1 page per slide (EMU→pt); background, spec 03 presets
as paths (bezier for ellipse/roundRect/pie), text via `layoutTextBody` with
TTF metrics (own SFNT parser), tables and images.

- **`opts.fonts` is REQUIRED** (the generator has no base-14): TTFs
  regular/bold/italic/bold-italic.
- Images: JPEG is embedded directly (DCTDecode); PNG is decoded (fflate) →
  RGB + SMask for alpha. **Other formats (gif/svg/webp/bmp) become a silent
  gray placeholder.**
- Approximations: gradient → 24 interpolated bands clipped by the path;
  shadows/transparencies ignored (opaque); charts → gray placeholder.

## Images (PNG per slide)

Uses the pure `paintSlideTo` function from slides-core (the SAME paint as the
web component).

- **Browser:** works with no options (OffscreenCanvas/`<canvas>` +
  `createImageBitmap`).
- **Node:** the package does not bundle a native dependency — inject the factory:

```ts
import { createCanvas, loadImage } from '@napi-rs/canvas';
await pptxToImages(bytes, {
  canvas: (w, h) => createCanvas(w, h),
  // optional, for decks with images:
  decodeImage: async (ref) => loadImage(Buffer.from(ref.bytes)),
});
```

Without a factory and without a DOM, `pptxToImages` rejects with an error telling you to pass
`opts.canvas`. `scale` multiplies the 96dpi base resolution.
