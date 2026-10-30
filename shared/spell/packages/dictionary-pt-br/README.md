# @universal-office/dictionary-pt-br

The **Brazilian Portuguese (pt-BR)** Hunspell dictionary for the spell checker
of `<universal-write>`: VERO 3.2, the LibreOffice dictionary by Raimundo
Moura and contributors. It also checks other Portuguese variants (`pt`,
`pt-PT`) when no closer dictionary is registered.

It is **optional** and needs the engine, `@universal-office/spellcheck`; see
that package for the whole setup. The editor downloads this dictionary (5.5 MB,
~1.1 MB brotli) only when a document has text in Portuguese.

```bash
npm install @universal-office/spellcheck @universal-office/dictionary-pt-br
```

With a bundler:

```js
import { registerSpellcheck, registerDictionary } from '@universal-office/write';

registerSpellcheck(() => import('@universal-office/spellcheck'));
registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br'));
```

From a static folder: copy this package to `<base>/dictionary-pt-br/` (next to
`<base>/spellcheck/`) and set `spellcheck-url="<base>"` on the editor.

## What it exports

```ts
export const aff: string;  // pt_BR.aff, verbatim (UTF-8)
export const dic: string;  // pt_BR.dic, verbatim (UTF-8)
```

## Source and license

`pt_BR.aff` and `pt_BR.dic` from
[LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/pt_BR)
(commit `67032ee9`), unmodified. VERO is licensed under the LGPLv3 **or** the
MPL 1.1, at your choice; it is distributed here under the **Mozilla Public
License 1.1** (`licenses/LICENSE-MPL-1.1.txt`). Authors and terms:
`licenses/README_pt_BR.txt`.
