# @universal-office/spell

The **single** spell checking for the apps (Write, Sheet, Slides) — an internal package
(`private`), embedded in the products by `tools/build-pkg.mjs`. It is an engine used
by more than one app (package rule in CLAUDE.md): do not reimplement it in the apps.
The **engine** (Hunspell WASM) and the **dictionaries** do NOT go inside the products:
they are published as separate, optional packages (`packages/`, see
[Publishing](#publishing)), and the host says where they are.

- **Hunspell 1.7.2 in WebAssembly**, in a **Worker** (the interface does not freeze);
  without a Worker (CSP without `blob:`, Node), the SAME code runs on the thread.
- Only Hunspell, also in Electron (the user's decision): the desktop app
  (`desktop/`) turns off Chromium's spell checker in the Write window
  (`webPreferences.spellcheck: false`) and uses this engine — the result is the same
  everywhere.
- Open LibreOffice dictionaries: **pt-BR** (VERO), **en-US** (SCOWL) and
  **es** (RLA-ES, a single one for all Spanish variants), loaded **on demand** through the source registry (`src/sources.ts`): the
  host registers a loader (`import()` of the package, with a bundler) or the folder
  where the packages are served (URL); the WASM engine too. Nothing weighs anything until the
  first check. Without a registered engine, there is no spell checking (everything passes).
- Language by **BCP 47** tag (in Write, the run's `w:lang`; text whose
  language the document does not state uses the `spellcheck-default-lang` of
  `<universal-write>`, default `pt-BR`).
- User dictionary stored by the host (default: `localStorage`).

## Choosing the engine (measured on 2026-10-19)

`npm run bench` (`bench/bench.mjs`): each engine in a separate process, Node 24,
Windows 11. Corpus: real words from the repository's `.md` files (pt: CLAUDE.md,
REVIEW-*, FINDINGS…; en: the product READMEs) + 400 synthetic errors at 1
edit distance. The accuracy reference is Hunspell 1.7.2 itself.

| engine | language | bundle (KB, min) | load (ms) | JS heap (MB) | WASM/ArrayBuffer (MB) | check (µs/word) | suggest median / p95 (ms) | check = Hunspell | 1st suggestion = Hunspell |
|---|---|---|---|---|---|---|---|---|---|
| **hunspell-wasm 0.3.0** (Hunspell 1.7.2) | pt-BR | 847 | 286 | 0.7 | 35.6 | 7.6 | 76 / 263 | 100% | 100% |
| hunspell-asm 4.0.2 (Hunspell 1.7.0) | pt-BR | 728 | 246 | 2.5 | 44.0 | 6.0 | 117 / 635 | 100% | 95% |
| nspell 2.1.5 (pure JS) | pt-BR | 10 | **> 300 s, did not finish** (> 1 GB of heap) | | | | | | |
| **hunspell-wasm 0.3.0** | en-US | 847 | 38 | 0.7 | 19.1 | 3.7 | 8 / 17 | 100% | 100% |
| hunspell-asm 4.0.2 | en-US | 728 | 64 | 2.5 | 18.2 | 2.6 | 11 / 21 | 100% | 98% |
| nspell 2.1.5 | en-US | 10 | 91 | 12.4 | 0.6 | 0.5 | 1.3 / 25 | 97.95% | 72% |

**Decision: Hunspell 1.7.2 in WASM (the `hunspell-wasm` binary).**

- **nspell** does not work for pt-BR: the VERO `.aff` (25,770 SFX rules, 162
  PFX, 1,056 REP, 65 BREAK) expands on load and did not finish in 5 min (in an isolated probe, not even in 15 min), with more
  than 1 GB of memory. In en-US, where it loads, it rejects hyphenated compounds (it does not
  implement BREAK: "built-in", "read-only", "state-of-the-art") and matches only 72%
  of Hunspell's 1st suggestion.
- Between the two ports, check is the same (100%). `hunspell-wasm` brings the
  newest Hunspell (1.7.2), suggests faster in pt-BR (p95 of 263 ms versus
  635 ms) and has no dependencies. `hunspell-asm` (1.7.0, from 2019) diverges on
  5% of the 1st suggestion.
- We use only the **binary** (`hunspell.js` + `hunspell.wasm`): the wrapper is ours
  (`src/engine.ts`, ~150 lines over the Hunspell C API). That way the engine runs
  the same in the Worker and on the thread, and the build does not depend on a `.wasm` loader.

Published size (esbuild `--minify`, like build-pkg):

| part | where | when it downloads | raw | gzip | brotli |
|---|---|---|---|---|---|
| API (the SpellChecker) | the product's `chunks/` | 1st paint with a registered engine | 10 KB | 4 KB | 4 KB |
| WASM engine | `@universal-office/spellcheck` | 1st check | 1.1 MB | 438 KB | 359 KB |
| pt-BR dictionary | `@universal-office/dictionary-pt-br` | 1st pt text | 5.5 MB | 1.3 MB | 1.1 MB |
| en-US dictionary | `@universal-office/dictionary-en-us` | 1st en text | 542 KB | 188 KB | 163 KB |
| es dictionary | `@universal-office/dictionary-es` | 1st es text | 865 KB | 232 KB | 196 KB |

In the browser (Chromium, demo): loading the engine + pt-BR + checking the 1st paragraph
in ~0.5 s, inside the Worker; en-US afterwards in ~26 ms; typical suggest from 2 to 80 ms.

## API

```ts
import { SpellChecker, registerSpellcheck, registerDictionary, configureSpellcheck } from '@universal-office/spell';

// where the engine and dictionaries come from (PAGE registry; write re-exports these functions)
registerSpellcheck(() => import('@universal-office/spellcheck'));            // { glue, wasmBase64 }
registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br')); // { aff, dic }
// or, packages served from a folder: <base>/spellcheck/index.js, <base>/dictionary-pt-br/index.js
configureSpellcheck({ baseUrl: '/vendor/universal-office', languages: ['pt-BR'] });

const spell = SpellChecker.shared();             // one engine per page, for all apps

await spell.load('pt-BR');                       // optional: preloads (otherwise, on the 1st check)
await spell.check('comptador', 'pt-BR');         // false
await spell.checkWords(['casa', 'cassa'], 'pt-BR'); // [true, true] — a single message
await spell.checkText('O comptador nao veio.', 'pt-BR');
// → [{ word: 'comptador', start: 2, end: 11 }, { word: 'nao', start: 12, end: 15 }]
await spell.suggest('nao', 'pt-BR');             // ['não'] (Hunspell order, up to 8)
spell.cached('nao', 'pt-BR');                    // false — synchronous, for painting (undefined = not checked yet)

await spell.add('Kono');                         // "Add to dictionary": all languages, persisted
await spell.remove('Kono');
spell.ignore('Fulano');                          // "Ignore all": this session only
spell.onChange(({ kind, words }) => repintar()); // add | remove | ignore | load

spell.resolve('en-GB');                          // { id: 'en-US', exact: false }
spell.resolve('es-MX');                          // { id: 'es', exact: false }
spell.resolve('de-DE');                          // undefined → no spell checking (everything passes)
spell.mode;                                      // 'worker' | 'thread' | undefined

await spell.unload('en-US');                     // frees the dictionary's memory (the next use reloads it)
spell.dispose();                                 // in shared(): releases only the caller's reference
```

Options (`new SpellChecker(opts)`):

- `worker` (default `true`): `false` runs the engine on the thread;
- `store`: where the user dictionary lives, `{ load(): string[] | Promise, save(words) }`.
  The default is `localStorageStore()`; `null` = memory only. `<universal-write>` uses the host
  app's `host.userDictionary` when it exists (the desktop app writes to `user-words.json`, in the profile) and the default when it does not;
- `dictionaries`: `{ 'es-ES': () => Promise<{ aff, dic }> }` adds or replaces dictionaries
  beyond those in the registry; the engine always comes from the registry. The id becomes a resolvable language. `aff`/`dic`
  as text work for UTF-8 or ISO8859-1 dictionaries (the `SET` line of the .aff
  decides the conversion to bytes); any other encoding is rejected — convert the
  dictionary to UTF-8. As a `Uint8Array`, the bytes go to Hunspell as they are.

`SpellChecker.shared(opts?)` counts references: each app that takes the instance calls
its own `dispose()`, and the engine only goes away with the last one. The `opts` (e.g. the `store`)
only apply to whoever creates the instance; later calls get the same one.

Tokenization (`tokenize(text, opts)` / `checkText`), like Word with its defaults:

- word = letters joined by internal hyphens or apostrophes ("guarda-chuva",
  "dar-lhe", "don't"); the typographic ’ becomes ' and the hyphens U+2010/U+2011 (Word's
  `w:noBreakHyphen`) become - in `word`;
- ignores numbers, words with digits (`ignoreWithNumbers`), UPPERCASE
  (`ignoreUppercase`), URLs, e-mail addresses and file paths (`ignoreInternet`).
  All three are on by default;
- `start`/`end` point into the ORIGINAL text (the soft hyphen U+00AD and the
  zero-width characters are removed only from `word`).

Language: the exact tag matches the dictionary; otherwise another variant of the same
language applies (`pt-PT` → pt-BR, `en-GB` → en-US, `es-MX`/`es-419`/`es-ES` → es, with
`exact: false`, and the host decides; Write checks this way). The Spanish
dictionary has the id `es` (language only): there is a single package for all variants.
`zxx`/`x-none`, or a language without a dictionary, get no spell checking.

## Integration in Write

`<universal-write>` (`write/packages/editor`) uses the engine like this (Sheet and Slides
would follow the same contract):

1. **Wavy underline**: `ParagraphSpell` (`src/spell.ts`) checks each
   visible paragraph in the background, grouping runs of the same language
   (`LangResolver`: `w:lang` of the run, of the styles and of the document defaults, otherwise
   `spellcheck-default-lang`) and skipping `w:noProof`; painting uses only the stored
   result and repaints when the check comes back. It is an on-screen adornment: it does not go into the PDF,
   printing or the viewer.
2. **Context menu** on an error: suggestions (`spellingSuggestions`, up to 5 at the
   top, like Word), "Ignorar tudo" (Ignore all) and "Adicionar ao dicionário" (Add to dictionary)
   (`addToDictionary` → `spell.add`).
3. **Spelling and grammar** (F7): `nextMisspelling()` walks from the cursor.
4. **User dictionary**: the `store` comes from `host.userDictionary` when the host
   app provides one; otherwise, the origin's `localStorage`.
5. **Desktop app** (`desktop/`): turns off Chromium's spell checker in the Write window
   (`chromiumSpellcheck: false` in `desktop/editors.cjs`), puts the interface
   language in `spellcheck-default-lang` and writes the user dictionary to
   `user-words.json` in the profile (`uo:user-words-*`; the 1st time, it brings over the words that
   were in `localStorage`, which depended on the local server's port).
6. **build-pkg**: `@universal-office/spell` is in the `INTERNAL` map (the API
   code goes into the product); the engine and dictionaries are separate packages (see
   [Publishing](#publishing)).

## Publishing

The SpellChecker code goes inside the products (only write uses it today); the
engine and the dictionaries, which are 95% of the weight, do not: each one becomes a
published, optional package, generated by `tools/build-pkg.mjs` from the same
modules generated from `src/`:

| package | folder (package.json + README) | published module (`index.js`) | license |
|---|---|---|---|
| `@universal-office/spellcheck` | `packages/spellcheck` | `src/hunspell/wasm.ts` → `{ glue, wasmBase64 }` | MPL-1.1 AND MIT |
| `@universal-office/dictionary-pt-br` | `packages/dictionary-pt-br` | `src/dicts/pt-BR.ts` → `{ aff, dic }` | MPL-1.1 |
| `@universal-office/dictionary-en-us` | `packages/dictionary-en-us` | `src/dicts/en-US.ts` → `{ aff, dic }` | SCOWL (`licenses/README_en_US.txt`) |
| `@universal-office/dictionary-es` | `packages/dictionary-es` | `src/dicts/es.ts` → `{ aff, dic }` | GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+ |

The license texts of each one are in the `licenseFiles` of the package.json in its
folder (→ `licenses/` in the package). write does not depend on them: the host
registers the loaders (`registerSpellcheck`/`registerDictionary`, re-exported
by write) or points to the folder where it serves them (`configureSpellcheck({ baseUrl })`,
or the `spellcheck-url` attribute of `<universal-write>`): `<base>/spellcheck/index.js`
and `<base>/dictionary-<lowercase id>/index.js` (without `languages` /
`spellcheck-languages`, the ones in `PUBLISHED_DICTIONARIES`: `pt-BR`, `en-US` and
`es`). build-pkg fails if a product
embeds `src/hunspell` or `src/dicts`. In tests, demos and development
bundles, `registerBuiltinSources()` (`src/builtin.ts`) registers the
modules from here (each one is still an `import()`, a chunk).

An engine or dictionary that does not load (missing package, 404) leaves the language (or,
for the engine, all languages) without spell checking until the registry changes — `load` returns undefined and
`check` answers true, with no error for the host.

## Development

- `npm test`: Vitest (engine on the thread, through the same `engine.ts` as the Worker; the
  tests register the `src/` modules with `registerBuiltinSources()`);
- `npm run build`: tsc → `dist/`;
- `npm run demo`: esbuild bundle with splitting in `demo/build/`; serve the
  `demo/` folder (e.g. `python -m http.server 8095` inside it);
- `npm run gen`: regenerates `src/dicts/*.ts` and `src/hunspell/wasm.ts` (see
  [src/dicts/README.md](src/dicts/README.md));
- `npm run bench`: redoes the table above (the candidates that lost need
  `npm i --no-save nspell@2.1.5 hunspell-asm@4.0.2`).

## Licenses and source code

- **Hunspell 1.7.2** (LGPL-2.0 OR GPL-2.0 OR MPL-1.1, used under the MPL 1.1):
  texts in `src/hunspell/COPYING*`. The binary comes from the npm package
  [hunspell-wasm 0.3.0](https://github.com/rotemdan/hunspell-wasm) (Rotem Dan);
  the Hunspell source code is at https://github.com/hunspell/hunspell (tag
  `v1.7.2`), and the source for the WASM build is in that hunspell-wasm repository —
  that is where the source code form is obtained (MPL 1.1 §3.6). No modifications of ours
  to Hunspell.
- **emscripten runtime** in the glue (MIT or UIUC/NCSA, used under the MIT):
  `src/hunspell/LICENSE-emscripten.txt`.
- **Dictionaries**: [src/dicts/README.md](src/dicts/README.md) (VERO under MPL 1.1;
  SCOWL with the notice in README_en_US.txt; RLA-ES under GPL 3+, LGPL 3+ or MPL 1.1+,
  at your choice, with the three texts in the package).
- In the published packages, each text goes with the data it refers to: those of
  Hunspell and emscripten to `licenses/` of `@universal-office/spellcheck`,
  those of each dictionary to `licenses/` of its package (the `licenseFiles` field
  of the package.json in `packages/<package>/`, copied by `tools/build-pkg.mjs`).
