# Dicionários Hunspell embarcados

Cada `<id>.ts` é GERADO por `scripts/gen.mjs` a partir dos arquivos originais
do LibreOffice, com o `.aff` e o `.dic` **verbatim** (linha a linha, só com o
escape de literal de template), para virar um pedaço sob demanda (`chunks/`)
no bundle. O cabeçalho `@license` de cada módulo traz origem, sha256 e licença;
o esbuild o preserva (`legalComments`).

| id | origem | arquivos (sha256) | licença |
|---|---|---|---|
| `pt-BR` | VERO 3.2 — [LibreOffice/dictionaries `pt_BR/`](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/pt_BR) | `pt_BR.aff` 21d8ad2a…5523865 · `pt_BR.dic` a38bfb26…9933183 | LGPLv3 **ou** MPL 1.1, à escolha; usado sob a MPL 1.1 ([LICENSE-MPL-1.1.txt](LICENSE-MPL-1.1.txt)). Autoria e termos: [README_pt_BR.txt](README_pt_BR.txt) |
| `en-US` | SCOWL 2020.12.07 — [LibreOffice/dictionaries `en/`](https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/en) | `en_US.aff` e746c882…4d2e24e · `en_US.dic` f0b1a234…59b3647 | licença do SCOWL/Ispell (estilo MIT/BSD, redistribuição livre com o aviso); texto completo em [README_en_US.txt](README_en_US.txt) |

Baixados em 2026-10-19 do commit `67032ee957631908098a72edf48dc81cac27e369`
de https://github.com/LibreOffice/dictionaries.

## Regenerar / atualizar

1. Baixar os originais para `shared/spell/dicts-src/<id>/` (fora do git):
   `https://raw.githubusercontent.com/LibreOffice/dictionaries/<commit>/pt_BR/pt_BR.{aff,dic}`
   e `…/en/en_US.{aff,dic}` (com os READMEs, que guardam a licença).
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
