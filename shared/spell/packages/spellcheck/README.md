# @universal-office/spellcheck

The spell checking engine of `<universal-write>`: **Hunspell 1.7.2 compiled to
WebAssembly** (the emscripten glue and the binary, in one ES module). It is
**optional** — `@universal-office/write` does not depend on it. Install it
together with the dictionaries you need; without them the editor simply does
not check spelling.

| Package | Language |
|---|---|
| `@universal-office/spellcheck` | the engine (this package, 1.1 MB, ~360 KB brotli) |
| `@universal-office/dictionary-pt-br` | Brazilian Portuguese (VERO) |
| `@universal-office/dictionary-en-us` | American English (SCOWL) |

Nothing is downloaded until it is needed: the engine on the first check, each
dictionary on the first text in that language. The editor runs the engine in a
Web Worker (on the main thread when a Worker is not allowed, e.g. a CSP without
`blob:`).

## Installation

```bash
npm install @universal-office/spellcheck @universal-office/dictionary-pt-br @universal-office/dictionary-en-us
```

All Universal Office packages of the same release share one version; install
the engine and the dictionaries with the same version as `@universal-office/write`.

## With a bundler

Register lazy loaders once, before or after the editor is created:

```js
import { registerSpellcheck, registerDictionary } from '@universal-office/write';

registerSpellcheck(() => import('@universal-office/spellcheck'));
registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br'));
registerDictionary('en-US', () => import('@universal-office/dictionary-en-us'));
```

The `import()` calls make each package a separate file in your bundle,
fetched only when used.

## From a static folder

When the component is loaded by URL (no bundler at runtime), copy each package
to its own subfolder — the names without the `@universal-office/` scope, as npm
lays them out — and point the editor at the parent folder:

```
/vendor/universal-office/
  write/                  index.js, viewer.js, chunks/…
  font-files/             *.ttf, LICENSE-*.txt
  spellcheck/             index.js          ← this package
  dictionary-pt-br/       index.js
  dictionary-en-us/       index.js
```

```html
<universal-write fonts="/vendor/universal-office/font-files"
  spellcheck-url="/vendor/universal-office"></universal-write>
```

The editor then imports `/vendor/universal-office/spellcheck/index.js` and
`/vendor/universal-office/dictionary-<language>/index.js` (`pt-BR` →
`dictionary-pt-br`). `spellcheck-languages="pt-BR"` lists the dictionaries you
copied (default: all published ones), so a missing one is never requested. The
same without the attribute:

```js
import { configureSpellcheck } from '@universal-office/write';

configureSpellcheck({ baseUrl: '/vendor/universal-office', languages: ['pt-BR'] });
```

A dictionary or engine that fails to load just turns spell checking off for
that language (or for all, for the engine) — no error reaches the page.

## What it exports

```ts
export const glue: string;        // source of the emscripten ES module
export const wasmBase64: string;  // the WebAssembly binary, base64
```

## License

Hunspell is licensed under LGPL-2.0, GPL-2.0 **or** MPL-1.1 and is used here
under the **Mozilla Public License 1.1** (`licenses/COPYING.MPL`; the other two
texts are next to it). The binary comes unmodified from the npm package
[hunspell-wasm 0.3.0](https://github.com/rotemdan/hunspell-wasm) by Rotem Dan;
the Hunspell source code is at https://github.com/hunspell/hunspell (tag
`v1.7.2`) and the WebAssembly build in the hunspell-wasm repository. The
emscripten runtime inside the glue is MIT (or UIUC/NCSA), used under the MIT
license (`licenses/LICENSE-emscripten.txt`). Hence `"license": "MPL-1.1 AND MIT"`.
