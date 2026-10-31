# Dicionários Hunspell embarcados

Cada `<id>.ts` é GERADO por `scripts/gen.mjs` a partir dos arquivos originais
do LibreOffice, com o `.aff` e o `.dic` **verbatim** (linha a linha, só com o
escape de literal de template), para virar um pedaço sob demanda (`chunks/`)
no bundle. O cabeçalho `@license` de cada módulo traz origem, sha256 e licença;
o esbuild o preserva (`legalComments`).

| id | origem | arquivos (sha256) | licença |
|---|---|---|---|
| `pt-BR` | VERO 3.2 — [LibreOffice/dictionaries `pt_BR/`](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/pt_BR) | `pt_BR.aff` 21d8ad2a…5523865 · `pt_BR.dic` a38bfb26…9933183 | LGPLv3 **ou** MPL 1.1, à escolha; usado sob a MPL 1.1 ([LICENSE-MPL-1.1.txt](LICENSE-MPL-1.1.txt)). Autoria e termos: [README_pt_BR.txt](README_pt_BR.txt) |
| `es` | RLA-ES 2.9, variante `es_ES` — [LibreOffice/dictionaries `es/`](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/es) | `es_ES.aff` e73a9bf8…3c1cad9 · `es_ES.dic` 6975ddde…9ac9ec1 | GPL 3 ou posterior **ou** LGPL 3 ou posterior **ou** MPL 1.1 ou posterior, à escolha (`(GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+)`); os três textos vão no pacote ([LICENSE-GPL-3.0.txt](LICENSE-GPL-3.0.txt), [LICENSE-LGPL-3.0.txt](LICENSE-LGPL-3.0.txt), [LICENSE-MPL-1.1.txt](LICENSE-MPL-1.1.txt)). Nota do projeto e autoria: [LICENSE_es.md](LICENSE_es.md) e [README_es.txt](README_es.txt) (os `LICENSE.md` e `README_hunspell_es.txt` de lá) |
| `en-US` | SCOWL 2020.12.07 — [LibreOffice/dictionaries `en/`](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/en) | `en_US.aff` e746c882…4d2e24e · `en_US.dic` f0b1a234…59b3647 | licença do SCOWL/Ispell (estilo MIT/BSD, redistribuição livre com o aviso); texto completo em [README_en_US.txt](README_en_US.txt) |

Baixados em 2026-10-19 (pt-BR, en-US) e 2026-10-30 (es) do commit
`67032ee957631908098a72edf48dc81cac27e369` de https://github.com/LibreOffice/dictionaries.

Espanhol: a pasta `es/` do LibreOffice só tem dicionários regionais (es_AR,
es_ES, es_MX… 23 ao todo), sem um neutro (o `es_ANY` do RLA-ES não está lá). O
`es_ES` é o usado para todas as variantes, com o id `es` (pacote
`dictionary-es`): aceita o vocabulário geral, inclusive o comum na América
(*computadora*, *celular*, *carro*), e as formas de *vosotros*; não tem o voseo
(*tenés*, *sabés*). O MPL-1.1 de lá é idêntico ao `LICENSE-MPL-1.1.txt` daqui.

## Regenerar / atualizar

1. Baixar os originais para `shared/spell/dicts-src/<id>/` (fora do git):
   `https://raw.githubusercontent.com/LibreOffice/dictionaries/<commit>/pt_BR/pt_BR.{aff,dic}`,
   `…/en/en_US.{aff,dic}` e `…/es/es_ES.{aff,dic}` (com os READMEs e textos de
   licença, `…/es/{README_hunspell_es.txt,LICENSE.md,GPLv3.txt,LGPLv3.txt,MPL-1.1.txt}`).
2. Atualizar `UPSTREAM_COMMIT` em `scripts/gen.mjs` e rodar `npm run gen`.
3. Copiar os READMEs novos para esta pasta e rodar `npm test`.

Dicionário novo (outro idioma): entrada em `DICTS` do `scripts/gen.mjs`, o
loader em `registerBuiltinSources` (`src/builtin.ts`), o id em
`PUBLISHED_DICTIONARIES` (`src/sources.ts`), o pacote publicado em
`packages/dictionary-<id minúsculo>/` (package.json com `licenseFiles` + README)
com a entrada no `PRODUCTS` do `tools/build-pkg.mjs`, e a licença aqui. Só
dicionários de licença aberta.

Publicados, os dicionários não ficam nos produtos: cada um é o pacote
`@universal-office/dictionary-<id>` (ver o README do pacote spell, Publicação).
