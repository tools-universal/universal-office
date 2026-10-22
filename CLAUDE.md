# Universal Office — regras do repositório

## Fontes proprietárias: NUNCA commitar

Nenhum arquivo de fonte proprietária entra no repositório — nem em pasta de
lab, fixture, demo ou site, nem por um commit "temporário". Isso vale para
qualquer fonte da Microsoft/Monotype (Aptos, Aptos Narrow, Aptos Display,
Calibri, Arial, Segoe, Cambria, Tahoma, Times New Roman…) e para qualquer
fonte comercial (ex.: Proxima Nova) ou com incorporação restrita. A licença
embutida nelas ("Microsoft supplied font") só permite usá-las no produto em
que vieram e embuti-las em documentos; o ARQUIVO da fonte não pode ser
redistribuído — repositório privado também é distribuição. Tampouco entram
cópias disfarçadas: `.odttf` extraídas, documento do Office usado como
contêiner para extrair a fonte, bundle com a fonte em base64.

- **Uso local** (demos, labs de fidelidade, testes de PDF): `npm run
  fonts:sync` copia as fontes instaladas na máquina (Windows\Fonts, fontes do
  usuário, cache CloudFonts do Office 365) para os caminhos que o código
  espera — todos no `.gitignore`. Sem elas, o app cai na substituta aberta
  (Liberation Sans) e os testes usam fontes abertas versionadas.
- **Bloqueio automático** (pelo conteúdo, não só pelo nome):
  `tools/fonts/check-fonts.mjs`, rodado pelo hook de pre-commit
  (`.githooks/`, ativado por `npm run hooks:install` / `npm install` na raiz)
  e pelo CI (`.github/workflows/fonts.yml`). Nunca contornar com `git add -f`,
  `--no-verify` ou mudando o verificador para passar.
- **Fontes abertas** (OFL, Apache, Ubuntu Font Licence…) podem ser
  versionadas. Se o arquivo não declara a licença de forma legível (ou é
  EOT/`.fntdata`), registrar sha256 + licença + origem em
  `tools/fonts/allowed-fonts.txt`.
- **Documentos de amostra** (`.pptx`/`.docx`/`.xlsx`) com fonte EMBUTIDA só
  entram se a licença de cada fonte permitir a incorporação (fsType 0/8) — e
  também precisam constar em `allowed-fonts.txt`. Decks de templates de
  terceiros com fontes comerciais embutidas ficam fora do repositório.
- Encontrou uma fonte proprietária já versionada? Não basta apagar na ponta:
  ela fica no histórico — avise para reescrever o histórico.

## Resolução de fontes: um lugar só

Write, Sheet e Slides resolvem fontes da MESMA forma, em `shared/fonts`
(`@universal-office/fonts`) — não reimplementar nos apps. Lá ficam o
resolvedor dos web components (`FontResolver`: host → Local Font Access →
embarcada → `@font-face` da página → instalada pelo nome → substituta
métrico-compatível → Liberation Sans; o Write usa `getWithFile`: mede e
embute só com o ARQUIVO da fonte, então "instalada pelo nome" vira a
substituta, igual na tela e no PDF), o módulo de fontes do SO dos shells
Electron (`node/system-fonts.cjs`) e as substitutas ABERTAS (`files/`:
Carlito, Caladea, Liberation Serif/Mono — `npm run fonts:sync` copia para os
demos/site). Fontes embutidas no documento continuam com cada componente.
A opção "fontes no arquivo" também é única (`embedding.ts` decide o que
entra, `ooxml.ts` grava .docx/.pptx; o diálogo dos dois apps é
`shared/ui/src/font-embedding-dialog.ts`);
o Sheet não tem — o .xlsx não guarda fontes (o Excel não oferece).
Fatos medidos que guiam o desenho: `document.fonts.check` devolve `true` para
qualquer família (não serve para saber se a fonte existe); nenhum navegador
enxerga o cache de fontes do Office (Aptos); só o Chromium enumera/dá bytes
(`queryLocalFonts`, com permissão); Firefox privado/ETP estrito só vê as
fontes base do sistema.

## Gráficos e formatação numérica: um lugar só

Gráficos DrawingML (`c:chartSpace`) e a formatação numérica do Office ficam em
`shared/charts` (`@universal-office/charts`) — Slides e Sheet usam o MESMO
motor; não reimplementar nos apps. O app hospedeiro entrega a árvore XML já
parseada e o resolvedor de cor do próprio tema (clrMap/modificadores do app);
o motor faz layout, escala e pintura em canvas. Fatos medidos no oráculo
(PowerPoint 365 pt-BR, gráficos sintéticos do lab): área sem `spPr`
transparente no PowerPoint; linha sem `c:smooth` sai SUAVE; série além da 6ª e
estilos monocromáticos variam em RGB linear; data curta "m/d/yyyy" segue o
locale.

## Formas e efeitos DrawingML: um lugar só

As formas predefinidas (as definições oficiais, `preset-defs.ts`), os modificadores
de cor (`applyColorMods`: shade/tint em RGB linear — vale no Word também), os
efeitos em raster (sombra, brilho, bordas suaves, reflexo), o chanfro 3D (luz
medida no PowerPoint e, para imagens, no Word), os ajustes de imagem do Office
2010 e o contorno de quebra ficam em `shared/drawingml`
(`@universal-office/drawingml`) — Slides e Write usam o mesmo; não reimplementar
nos apps. O .NET (`OfficeNext.DrawingML`) lê as MESMAS tabelas dos arquivos TS
como recurso embutido. Charts e slides-core ainda têm cópias próprias da
matemática de cor (migrar para cá é sequência).


## Controles dos viewers: um lugar só

A barra de controles dos viewers (`<universal-presentation-viewer>`,
`<universal-document-viewer>`) fica em `shared/ui`
(`@universal-office/ui`, `viewer-controls.ts`): botões, progresso, contador,
auto-ocultar, ícones SVG e o CSS. Cada viewer declara só os próprios itens.
Modelo combinado com o usuário: visível por padrão; `nocontrols` desliga tudo;
um atributo booleano por item (`nodownload`, `nofullscreen`…) — sem
`controlslist`. Variáveis `--upv-*`/`--udv-*` com recuo nas comuns `--uo-*`;
`::part()` para o resto. O canvas das páginas do Write também é um só:
`paintItems` em `docx-layout/src/canvas.ts` (editor e viewer).

## Barras dos editores: um lugar só

O framework das barras dos editores fica em `shared/ui/src/toolbar`
(`@universal-office/ui`): registro de comandos (rótulo `{ en, pt }`, ícone,
atalho, `supports`/`isEnabled`/`isChecked`/`run`), barra COMPACTA estilo Google
Docs (menus + linha que recolhe por prioridade — `data-prio`, gatilhos, "⋮",
"☰") e RIBBON estilo Word (guias, grupos com iniciador, guias contextuais),
menus/submenus (o motor único — não copiar menu.ts/context-menu.ts nos demos),
diálogo sobre `<dialog>` nativo (o u-dialog trava no fechar sem relógio de
animação), avisos, galeria, painel lateral (`pane.ts`), a RÉGUA (`ruler.ts`:
margens, recuos, tabulações, colunas/células, arrasto com encaixe e seletor
de tabulação — o app só entrega a geometria em twips) e os Material Symbols
como SVG (`symbols.ts`, gerado por
`shared/ui/tools/extract-symbols.py`). Tudo funciona dentro de shadow root
(clique fora por `composedPath()`). O app só DECLARA comandos sobre a própria
API e os layouts: o Write em `editor/src/chrome-*.ts` (`toolbar="compact|ribbon"`,
compacta por padrão). Comando cuja API ainda não existe fica oculto
(`supports = typeof editor[m] === 'function'`) — frente nova só implementa o
método. O que depende do app hospedeiro (Electron) entra pelo `element.host`
opcional, com o caminho web como recuo; o demo só hospeda o componente.

## Idioma da interface: um lugar só

Os textos da INTERFACE de todos os web components (`<universal-write>`,
`<universal-sheet>`, `<universal-slides>`, os dois viewers,
`<universal-write-diff>`, o diálogo de fontes e o plugin de menções) escolhem
o idioma em `shared/ui` (`@universal-office/ui`, `i18n.ts`) — não reimplementar nos
apps. Regra combinada com o usuário: inglês por padrão; português quando o
navegador prefere pt (`navigator.languages`); o atributo `lang` no PRÓPRIO
elemento força (`lang` de ancestral, como `<html lang>`, não conta; idioma sem
tradução cai no inglês). Cada componente guarda a própria tabela `{ en, pt }`
e usa `pickLabels`/`uiLang`. Isso é só a interface: números, datas e nomes de
função do Sheet seguem `formula-locale` (as mensagens de erro de fórmula
também, como no Excel), e a fidelidade dos dados continua pt-BR.

## Revisão ortográfica: um lugar só

A revisão ortográfica de todos os apps fica em `shared/spell`
(`@universal-office/spell`): Hunspell 1.7.2 em WASM num Worker, dicionários
abertos do LibreOffice (pt-BR VERO, en-US SCOWL) carregados sob demanda
(chunks), idioma por etiqueta BCP 47 (`w:lang`) e dicionário do usuário
guardado pelo hospedeiro. Regra combinada com o usuário: SÓ Hunspell, também no
Electron (o shell desliga o corretor do Chromium: `webPreferences.spellcheck:
false`). No Write, `editor/src/spell.ts` só resolve idioma/noProof por run e
guarda os erros por parágrafo; o sublinhado é adorno de tela do editor (não do
`paintItems` — nunca no PDF, na impressão ou no viewer). Medido: o
nspell não carrega o .aff do VERO (mais de 5 min e mais de 1 GB); a escolha e os
números estão no README do pacote.

## Pacotes: fronteira só com motivo

São 16 pacotes (consolidados em 2026-10-19 a partir de 21; `spell` e `drawingml` entraram depois). Pacote novo só
entra com um motivo real: (1) é um PRODUTO separado — um web component com
licença própria (gratuito × `-pro`); ou (2) é um motor usado por mais de um
app ou sem DOM fora dos apps (`fonts`, `charts`, `ui`, `spell`, `sheet-calc`, `drawingml`). O resto
fica como pasta dentro do pacote dono: conversões de formato em
`<app>-core/src/export` (e `docx-core/src/odf`), base tipográfica e PDF do
Write em `docx-layout/src/typography` e `src/pdf-writer`. Módulos movidos para
dentro de um core importam de `../core.js` (não do `index.ts`), para não criar
ciclo. Código que só delega ao office-converter (`vendor/`) não justifica
pacote nem cópia local — e os cores têm `sideEffects: false` para o conversor
não entrar nos bundles de quem não o usa.

Publicação: só os 6 PRODUTOS vão para o registro (`write`, `document-viewer`,
`compare`, `sheet`, `presentation-viewer`, `slides`), cada um AUTOSSUFICIENTE
— `npm run build:pkg` (`tools/build-pkg.mjs`) gera `<pacote>/publish/` (fora
do git) com tudo dentro: pacotes internos pelo src, dependências npm, partes
sob demanda em `chunks/`, `index.d.ts` único e package.json sem dependências.
Publicar de dentro de `publish/`. Os 10 internos são `private` e nunca são
publicados. O `dist/` é outra coisa: saída do tsc que os pacotes do monorepo
consomem entre si (ordem de build: write → slides → sheet; o Sheet usa o
`dist/` do slides-core).

Documentação dos produtos: o README de cada produto é a fonte ÚNICA. O site
(`site/docs/<produto>/`) é gerado dele por `npm run docs:site`
(`tools/site/gen-docs.mjs`, que também mantém a barra lateral de todas as
páginas de docs); só as páginas do `<universal-write>` e do diff são escritas
à mão. Os GIFs moram uma vez só em `site/assets/gifs/` e são regravados por
`npm run docs:gifs` (`tools/gifs/record.mjs`: Chromium headless sobre os
pacotes de `publish/`, documentos de exemplo em inglês gerados na hora); o
`build:pkg` copia cada GIF para `publish/media/` do pacote.

## Funcionalidades do editor do Write: backlog e fluxo

As lacunas do `<universal-write>` em relação ao Word e o fluxo combinado para
fechá-las ficam em `write/BACKLOG.md`: cada frente numa sessão com worktree
próprio (escopo aprovado → medir no oráculo → API → render → salvar sem perdas
→ interface → testes → docs → entrega), até 4 em paralelo. Worktree se monta
com `node tools/parallel/worktree-setup.mjs --build` e se desmonta com
`worktree-teardown.mjs` (nunca `rm -rf`); todo uso do Office via COM passa
por `tools/parallel/word-lock.mjs`. As frentes não commitam bundles
versionados nem editam o BACKLOG: a sessão coordenadora junta na main,
recompila e atualiza o estado.
