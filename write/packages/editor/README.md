# @universal-office-pro/write

The `<universal-write>` web component — a **.docx** editor that renders to a
**canvas** with layout faithful to Microsoft Word (real font metrics, identical
pagination and line breaks) and lossless OOXML round-trip.

Self-contained: everything (document core, layout engine, exporters, comparison)
ships in this single package — no peer dependencies.

## Install

Obtain the package from **PrivJS** and follow the setup instructions there.

## Usage

```js
import '@universal-office-pro/write';
```

```html
<universal-write id="editor" fonts="/fonts" src="/document.docx"></universal-write>
```

```js
const editor = document.getElementById('editor');

editor.addEventListener('uw-ready', () => editor.focusEditor());
editor.addEventListener('uw-change', () => {
  const { pages, words } = editor.stats();
  console.log(`${pages} pages · ${words} words`);
});

// Load / save (format defaults to 'auto')
editor.load(new Uint8Array(await (await fetch('/contract.docx')).arrayBuffer()));
const docx = await editor.save('docx');   // Uint8Array
const pdf  = await editor.save('pdf');
const html = await editor.save('html');   // string
```

Optional built-in chrome: add the boolean `topbar` / `bottombar` attributes for
a Word-style toolbar and status bar.

The print (and read) view lays out and paints pages with the Word-fidelity
layout engine (`@universal-office/docx-layout`, the same layout as the PDF
export). Set `layout="legacy"` to use the previous canvas layout instead; the
editor also falls back to it automatically (with a console warning) if the
engine fails on a document.

Full documentation and live examples: see the Universal Office docs site.

## License

Free for non-commercial use. See LICENSE / the PrivJS listing for terms.
