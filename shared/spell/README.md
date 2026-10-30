# @universal-office/spell

Revisão ortográfica **única** dos apps (Write, Sheet, Slides) — pacote interno
(`private`), embutido nos produtos pelo `tools/build-pkg.mjs`. É um motor usado
por mais de um app (regra de pacotes do CLAUDE.md): não reimplementar nos apps.
O **motor** (Hunspell WASM) e os **dicionários** NÃO vão dentro dos produtos:
são publicados como pacotes à parte e opcionais (`packages/`, ver
[Publicação](#publicação)), e o hospedeiro diz onde estão.

- **Hunspell 1.7.2 em WebAssembly**, num **Worker** (a interface não trava);
  sem Worker (CSP sem `blob:`, Node), o MESMO código roda no thread.
- Só Hunspell, também no Electron (decisão do usuário): quando a integração
  chegar, o shell vai desligar o corretor do Chromium e usar este motor — o
  resultado será igual em todo lugar. (Hoje o Electron ainda não desliga.)
- Dicionários abertos do LibreOffice: **pt-BR** (VERO) e **en-US** (SCOWL),
  carregados **sob demanda** pelo registro de fontes (`src/sources.ts`): o
  hospedeiro registra um loader (`import()` do pacote, com bundler) ou a pasta
  onde os pacotes são servidos (URL); o motor WASM também. Nada pesa até a
  primeira revisão. Sem motor registrado, não há revisão (tudo passa).
- Idioma por etiqueta **BCP 47** (no Write, o `w:lang` do run).
- Dicionário do usuário guardado pelo hospedeiro (padrão: `localStorage`).

## Escolha do motor (medido em 2026-10-19)

`npm run bench` (`bench/bench.mjs`): cada motor num processo separado, Node 24,
Windows 11. Corpus: palavras reais dos `.md` do repositório (pt: CLAUDE.md,
REVIEW-*, FINDINGS…; en: READMEs dos produtos) + 400 erros sintéticos de 1
edição. A referência de aderência é o próprio Hunspell 1.7.2.

| motor | idioma | bundle (KB, min) | carga (ms) | heap JS (MB) | WASM/ArrayBuffer (MB) | check (µs/palavra) | suggest mediana / p95 (ms) | check = Hunspell | 1ª sugestão = Hunspell |
|---|---|---|---|---|---|---|---|---|---|
| **hunspell-wasm 0.3.0** (Hunspell 1.7.2) | pt-BR | 847 | 286 | 0,7 | 35,6 | 7,6 | 76 / 263 | 100% | 100% |
| hunspell-asm 4.0.2 (Hunspell 1.7.0) | pt-BR | 728 | 246 | 2,5 | 44,0 | 6,0 | 117 / 635 | 100% | 95% |
| nspell 2.1.5 (JS puro) | pt-BR | 10 | **> 300 s, não terminou** (> 1 GB de heap) | | | | | | |
| **hunspell-wasm 0.3.0** | en-US | 847 | 38 | 0,7 | 19,1 | 3,7 | 8 / 17 | 100% | 100% |
| hunspell-asm 4.0.2 | en-US | 728 | 64 | 2,5 | 18,2 | 2,6 | 11 / 21 | 100% | 98% |
| nspell 2.1.5 | en-US | 10 | 91 | 12,4 | 0,6 | 0,5 | 1,3 / 25 | 97,95% | 72% |

**Decisão: Hunspell 1.7.2 em WASM (binário do `hunspell-wasm`).**

- O **nspell** não serve para o pt-BR: o `.aff` do VERO (25.770 regras SFX, 162
  PFX, 1.056 REP, 65 BREAK) expande na carga e não terminou em 5 min (numa sonda isolada, nem em 15 min), com mais
  de 1 GB de memória. No en-US, onde carrega, recusa compostos com hífen (não
  implementa BREAK: "built-in", "read-only", "state-of-the-art") e acerta só 72%
  da 1ª sugestão do Hunspell.
- Entre os dois ports, o check é igual (100%). O `hunspell-wasm` traz o
  Hunspell mais novo (1.7.2), sugere mais rápido no pt-BR (p95 de 263 ms contra
  635 ms) e não tem dependências. O `hunspell-asm` (1.7.0, de 2019) diverge em
  5% da 1ª sugestão.
- Usamos só o **binário** (`hunspell.js` + `hunspell.wasm`): o wrapper é nosso
  (`src/engine.ts`, ~150 linhas sobre a API C do Hunspell). Assim o motor roda
  igual no Worker e no thread, e o build não depende de loader de `.wasm`.

Tamanho publicado (esbuild `--minify`, como o build-pkg):

| parte | onde | quando baixa | bruto | gzip | brotli |
|---|---|---|---|---|---|
| API (o SpellChecker) | `chunks/` do produto | 1ª pintura com motor registrado | 10 KB | 4 KB | 4 KB |
| motor WASM | `@universal-office/spellcheck` | 1ª revisão | 1,1 MB | 438 KB | 359 KB |
| dicionário pt-BR | `@universal-office/dictionary-pt-br` | 1º texto pt | 5,5 MB | 1,3 MB | 1,1 MB |
| dicionário en-US | `@universal-office/dictionary-en-us` | 1º texto en | 542 KB | 188 KB | 163 KB |

No navegador (Chromium, demo): carga do motor + pt-BR + revisão do 1º parágrafo
em ~0,5 s, dentro do Worker; en-US depois em ~26 ms; suggest típico de 2 a 80 ms.

## API

```ts
import { SpellChecker, registerSpellcheck, registerDictionary, configureSpellcheck } from '@universal-office/spell';

// de onde vêm motor e dicionários (registro da PÁGINA; o write reexporta essas funções)
registerSpellcheck(() => import('@universal-office/spellcheck'));            // { glue, wasmBase64 }
registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br')); // { aff, dic }
// ou, pacotes servidos numa pasta: <base>/spellcheck/index.js, <base>/dictionary-pt-br/index.js
configureSpellcheck({ baseUrl: '/vendor/universal-office', languages: ['pt-BR'] });

const spell = SpellChecker.shared();             // um motor por página, para todos os apps

await spell.load('pt-BR');                       // opcional: pré-carrega (senão, no 1º check)
await spell.check('comptador', 'pt-BR');         // false
await spell.checkWords(['casa', 'cassa'], 'pt-BR'); // [true, true] — uma mensagem só
await spell.checkText('O comptador nao veio.', 'pt-BR');
// → [{ word: 'comptador', start: 2, end: 11 }, { word: 'nao', start: 12, end: 15 }]
await spell.suggest('nao', 'pt-BR');             // ['não'] (ordem do Hunspell, até 8)
spell.cached('nao', 'pt-BR');                    // false — síncrono, para a pintura (undefined = ainda não revisada)

await spell.add('Kono');                         // "Adicionar ao dicionário": todos os idiomas, persistido
await spell.remove('Kono');
spell.ignore('Fulano');                          // "Ignorar tudo": só nesta sessão
spell.onChange(({ kind, words }) => repintar()); // add | remove | ignore | load

spell.resolve('en-GB');                          // { id: 'en-US', exact: false }
spell.resolve('de-DE');                          // undefined → sem revisão (tudo passa)
spell.mode;                                      // 'worker' | 'thread' | undefined

await spell.unload('en-US');                     // libera a memória do dicionário (o próximo uso recarrega)
spell.dispose();                                 // em shared(): solta só a referência de quem chamou
```

Opções (`new SpellChecker(opts)`):

- `worker` (padrão `true`): `false` roda o motor no thread;
- `store`: onde mora o dicionário do usuário, `{ load(): string[] | Promise, save(words) }`.
  O padrão é `localStorageStore()`; `null` = só memória. O shell Electron passa um store em disco;
- `dictionaries`: `{ 'es-ES': () => Promise<{ aff, dic }> }` acrescenta ou troca dicionários
  além dos do registro (o Electron pode servir os do disco); o motor vem sempre do registro. O id vira idioma resolvível. `aff`/`dic`
  em texto valem para dicionários UTF-8 ou ISO8859-1 (a linha `SET` do .aff
  decide a conversão para bytes); outra codificação é recusada — converter o
  dicionário para UTF-8. Em `Uint8Array` os bytes vão ao Hunspell como estão.

`SpellChecker.shared()` conta referências: cada app que pega a instância chama
o próprio `dispose()`, e o motor só cai com o último.

Tokenização (`tokenize(text, opts)` / `checkText`), como o Word com os padrões dele:

- palavra = letras unidas por hífen ou apóstrofo internos ("guarda-chuva",
  "dar-lhe", "don't"); o ’ tipográfico vira ' e os hífens U+2010/U+2011 (o
  `w:noBreakHyphen` do Word) viram - em `word`;
- ignora números, palavras com dígitos (`ignoreWithNumbers`), MAIÚSCULAS
  (`ignoreUppercase`), URLs, e-mails e caminhos de arquivo (`ignoreInternet`).
  Os três ficam ligados por padrão;
- `start`/`end` apontam para o texto ORIGINAL (o hífen de sílaba U+00AD e os
  caracteres de largura zero saem só de `word`).

Idioma: a etiqueta exata casa o dicionário; senão vale outra variante da mesma
língua (`pt-PT` → pt-BR, `en-GB` → en-US, com `exact: false`, e o hospedeiro
decide). `zxx`/`x-none`, ou língua sem dicionário, ficam sem revisão.

## Integração (próximo passo — não feita aqui)

Para o Write (Sheet e Slides seguem o mesmo contrato):

1. **Sublinhado ondulado** em `paintItems` (`docx-layout/src/canvas.ts`): por
   parágrafo visível, `spell.checkText(textoDoParágrafo, wLang)` em segundo
   plano (agrupar runs do mesmo `w:lang`; pular runs com `w:noProof`). Guardar
   os intervalos por parágrafo e repintar quando a promessa voltar. A pintura é
   síncrona: usa só o resultado guardado (ou `spell.cached`). Revisar de novo o
   parágrafo editado (debounce) e tudo em `onChange`.
2. **Menu de contexto** sobre um erro: `spell.suggest(word, lang)` (até 5 no topo,
   como o Word), "Ignorar tudo" → `spell.ignore(word)`, "Adicionar ao dicionário"
   → `spell.add(word)`.
3. **Diálogo Ortografia e gramática** (F7): percorrer `checkText` parágrafo a
   parágrafo a partir do cursor; "Alterar"/"Alterar todas" substituem no modelo;
   "Ignorar uma vez" é estado do diálogo.
4. **Electron** (ainda não feito): `webPreferences.spellcheck: false` (desliga o corretor do
   Chromium) e um `store` que grava o dicionário do usuário em disco pelo
   preload; opcionalmente `dictionaries` com outros idiomas do disco.
5. **build-pkg**: `@universal-office/spell` está no mapa `INTERNAL` (o código
   da API entra no produto); motor e dicionários são pacotes à parte (ver
   [Publicação](#publicação)).

## Publicação

O código do SpellChecker vai dentro dos produtos (só o write o usa hoje); o
motor e os dicionários, que são 95% do peso, não: cada um vira um pacote
publicado, opcional, gerado pelo `tools/build-pkg.mjs` a partir dos mesmos
módulos gerados de `src/`:

| pacote | pasta (package.json + README) | módulo publicado (`index.js`) | licença |
|---|---|---|---|
| `@universal-office/spellcheck` | `packages/spellcheck` | `src/hunspell/wasm.ts` → `{ glue, wasmBase64 }` | MPL-1.1 AND MIT |
| `@universal-office/dictionary-pt-br` | `packages/dictionary-pt-br` | `src/dicts/pt-BR.ts` → `{ aff, dic }` | MPL-1.1 |
| `@universal-office/dictionary-en-us` | `packages/dictionary-en-us` | `src/dicts/en-US.ts` → `{ aff, dic }` | SCOWL (`licenses/README_en_US.txt`) |

Os textos de licença de cada um ficam no `licenseFiles` do package.json da
pasta dele (→ `licenses/` no pacote). O write não depende deles: o hospedeiro
registra os loaders (`registerSpellcheck`/`registerDictionary`, reexportados
pelo write) ou aponta a pasta onde os serve (`configureSpellcheck({ baseUrl })`,
ou o atributo `spellcheck-url` do `<universal-write>`): `<base>/spellcheck/index.js`
e `<base>/dictionary-<id minúsculo>/index.js`. O build-pkg falha se um produto
embutir `src/hunspell` ou `src/dicts`. Nos testes, nas demos e nos bundles de
desenvolvimento, `registerBuiltinSources()` (`src/builtin.ts`) registra os
módulos daqui (cada um continua um `import()`, um chunk).

Motor ou dicionário que não carrega (pacote ausente, 404) deixa o idioma (ou,
o motor, todos) sem revisão até o registro mudar — `load` devolve undefined e
`check` responde true, sem erro para o hospedeiro.

## Desenvolvimento

- `npm test`: Vitest (motor no thread, pelo mesmo `engine.ts` do Worker; os
  testes registram os módulos de `src/` com `registerBuiltinSources()`);
- `npm run build`: tsc → `dist/`;
- `npm run demo`: bundle esbuild com splitting em `demo/build/`; servir a pasta
  `demo/` (ex.: `python -m http.server 8095` dentro dela);
- `npm run gen`: regenera `src/dicts/*.ts` e `src/hunspell/wasm.ts` (ver
  [src/dicts/README.md](src/dicts/README.md));
- `npm run bench`: refaz a tabela acima (os candidatos que perderam precisam de
  `npm i --no-save nspell@2.1.5 hunspell-asm@4.0.2`).

## Licenças e código-fonte

- **Hunspell 1.7.2** (LGPL-2.0 OR GPL-2.0 OR MPL-1.1, usado sob a MPL 1.1):
  textos em `src/hunspell/COPYING*`. O binário vem do pacote npm
  [hunspell-wasm 0.3.0](https://github.com/rotemdan/hunspell-wasm) (Rotem Dan);
  o código-fonte do Hunspell está em https://github.com/hunspell/hunspell (tag
  `v1.7.2`), e o da compilação para WASM, nesse repositório do hunspell-wasm —
  é onde se obtém a forma de código-fonte (MPL 1.1 §3.6). Sem modificações nossas
  ao Hunspell.
- **Runtime do emscripten** no glue (MIT ou UIUC/NCSA, usado sob a MIT):
  `src/hunspell/LICENSE-emscripten.txt`.
- **Dicionários**: [src/dicts/README.md](src/dicts/README.md) (VERO sob MPL 1.1;
  SCOWL com o aviso em README_en_US.txt).
- Nos pacotes publicados, cada texto vai com os dados a que se refere: os do
  Hunspell e do emscripten para `licenses/` do `@universal-office/spellcheck`,
  os de cada dicionário para `licenses/` do pacote dele (campo `licenseFiles`
  do package.json em `packages/<pacote>/`, copiado pelo `tools/build-pkg.mjs`).
