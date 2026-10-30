# Site assets

Static assets for the documentation site. Most are hand-written
(`style.css`), but a few are **generated / copied** build artifacts used by the
live demos on `docs/write/examples.html`:

## `universal-office.js` (generated)

The bundled web components (`<universal-write>`, `<universal-write-diff>`) plus
the API used by the examples (`createMentionPlugin`, `diffDocuments`,
`DocxPackage`, `readFullDocument`) exposed on `window.UniversalOffice`.

It is built from `write/packages/editor/demo/site-live.ts`, which imports the
real components (they self-register `<universal-write>` / `<universal-write-diff>`)
and re-exposes the example API on `window.UniversalOffice`. It also imports
`@universal-material/web` button + icon-button so the demos can use
`<u-button>` / `<u-icon-button>`.

Rebuild after changing the editor/compare/docx-core source:

```bash
npm --prefix write/packages/editor run build:site-live
```

## `fonts/` (partly versioned)

The editor fetches its fonts at runtime via the `fonts="/assets/fonts"`
attribute. Only open fonts are versioned here: Liberation Sans (the required
default font, four variants, `LICENSE-liberation.txt`) and the advance-width
JSON tables (metrics only) of Aptos and Calibri. The Aptos and Calibri TTFs
themselves are proprietary and are **never** committed: `npm run fonts:sync`
copies them from the fonts installed on the machine (they are in
`.gitignore`), together with the other open substitutes (Carlito, Caladea,
Liberation Serif/Mono). Without them the demos fall back to the open fonts.

## `downloads.js` (hand-written)

The download badges of the desktop apps (Universal Write, Sheet and Slides,
Beta). It is the **one place** with their links: pages only put
`<div class="downloads" data-downloads="write|sheet|slides">` (with a
`<noscript>` link to the releases page) and load the script with `defer`. A
store that is not published yet (`url: null`) shows as "coming soon", not as a
link. Styles: `.downloads` / `.dl-badge` in `style.css`.

## Icons

The demo button icons are **inline Material Symbols SVGs** (Rounded, 400 weight)
embedded directly in `docs/write/examples.html` — no icon font is shipped. They
were pulled from `@material-symbols/svg-400/rounded/<name>.svg` and styled by the
`.micon` class (`fill: currentColor`).

## `samples/` (copied)

Small sample documents for the live demos:

- `demo.docx` — the editor demo (from `write/samples/`)
- `rel-v1.docx`, `rel-v2.docx` — the comparison demo (from `write/temp/`)
