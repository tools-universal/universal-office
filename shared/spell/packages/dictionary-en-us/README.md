# @universal-office/dictionary-en-us

The **American English (en-US)** Hunspell dictionary for the spell checker of
`<universal-write>`: the SCOWL-based dictionary shipped with LibreOffice
(Kevin Atkinson, Marco A.G. Pinto), version 2020.12.07. It also checks other
English variants (`en`, `en-GB`…) when no closer dictionary is registered —
with American spelling.

It is **optional** and needs the engine, `@universal-office/spellcheck`; see
that package for the whole setup. The editor downloads this dictionary (540 KB,
~160 KB brotli) only when a document has text in English.

```bash
npm install @universal-office/spellcheck @universal-office/dictionary-en-us
```

With a bundler:

```js
import { registerSpellcheck, registerDictionary } from '@universal-office/write';

registerSpellcheck(() => import('@universal-office/spellcheck'));
registerDictionary('en-US', () => import('@universal-office/dictionary-en-us'));
```

From a static folder: copy this package to `<base>/dictionary-en-us/` (next to
`<base>/spellcheck/`) and set `spellcheck-url="<base>"` on the editor.

## What it exports

```ts
export const aff: string;  // en_US.aff, verbatim (UTF-8)
export const dic: string;  // en_US.dic, verbatim (UTF-8)
```

## Source and license

`en_US.aff` and `en_US.dic` from
[LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/en)
(commit `67032ee9`), unmodified. The word list is under the SCOWL license
(permissive, MIT/BSD-style: free use and redistribution with the copyright
notice); the full text, with the copyright notices of SCOWL and its sources, is
in `licenses/README_en_US.txt`.
