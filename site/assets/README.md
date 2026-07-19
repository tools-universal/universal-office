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

## `fonts/` (copied)

The eight TTFs (Aptos + Calibri, four variants each) and their advance-width
JSON tables. The editor fetches them at runtime via the `fonts="/assets/fonts"`
attribute. Copied from `write/tools/word-lab/fonts/`:

```bash
cp write/tools/word-lab/fonts/*.ttf           site/assets/fonts/
cp write/tools/word-lab/fonts/*advances.json  site/assets/fonts/
```

The demo button icons are **inline Material Symbols SVGs** (Rounded, 400 weight)
embedded directly in `docs/write/examples.html` — no icon font is shipped. They
were pulled from `@material-symbols/svg-400/rounded/<name>.svg` and styled by the
`.micon` class (`fill: currentColor`).

## `samples/` (copied)

Small sample documents for the live demos:

- `demo.docx` — the editor demo (from `write/samples/`)
- `rel-v1.docx`, `rel-v2.docx` — the comparison demo (from `write/temp/`)
