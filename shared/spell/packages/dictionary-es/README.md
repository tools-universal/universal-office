# @universal-office/dictionary-es

The **Spanish (es)** Hunspell dictionary for the spell checker of
`<universal-write>`: RLA-ES 2.9 (Recursos Lingüísticos Abiertos del Español),
the LibreOffice dictionary by Santiago Bosio and contributors, in its `es_ES`
variant. One dictionary checks every variant of Spanish (`es`, `es-ES`,
`es-MX`, `es-419`, `es-AR`, `es-US`…): the editor sends any Spanish text to it
when no closer dictionary is registered.

It is the general Spanish word list (common Latin American vocabulary such as
*computadora*, *celular* or *carro* is accepted), plus the `vosotros` forms of
Spain. The voseo forms of Argentina and Uruguay (*tenés*, *sabés*) are not in
it.

It is **optional** and needs the engine, `@universal-office/spellcheck`; see
that package for the whole setup. The editor downloads this dictionary (865 KB,
~196 KB brotli) only when a document has text in Spanish.

```bash
npm install @universal-office/spellcheck @universal-office/dictionary-es
```

With a bundler:

```js
import { registerSpellcheck, registerDictionary } from '@universal-office/write';

registerSpellcheck(() => import('@universal-office/spellcheck'));
registerDictionary('es', () => import('@universal-office/dictionary-es'));
```

From a static folder: copy this package to `<base>/dictionary-es/` (next to
`<base>/spellcheck/`) and set `spellcheck-url="<base>"` on the editor (with
`spellcheck-languages`, list `es`).

## What it exports

```ts
export const aff: string;  // es_ES.aff, verbatim (UTF-8)
export const dic: string;  // es_ES.dic, verbatim (UTF-8)
```

## Source and license

`es_ES.aff` and `es_ES.dic` from
[LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/es)
(commit `67032ee9`), unmodified. That folder only has regional dictionaries
(no neutral `es_ANY`); `es_ES` is the one used here for all variants.

RLA-ES is distributed under three disjoint licenses, at your choice: the
**GNU GPL version 3 or later**, the **GNU LGPL version 3 or later**, or the
**Mozilla Public License version 1.1 or later**
(`(GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+)`). The texts are in
`licenses/LICENSE-GPL-3.0.txt`, `licenses/LICENSE-LGPL-3.0.txt` (which
supplements the GPL text) and `licenses/LICENSE-MPL-1.1.txt`; the project's own
license note and README (authors and credits, in Spanish) are
`licenses/LICENSE_es.md` and `licenses/README_es.txt` (upstream `LICENSE.md` and
`README_hunspell_es.txt`).
