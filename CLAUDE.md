# Universal Office — regras do repositório

## Nome, licença e o que entra na biblioteca

- **Nome**: o produto é **UniversalOffice** / Universal Office (a pasta ainda
  se chama `OfficeNext`, nome antigo — não usar em código, pacote ou doc
  novos). npm: escopo `@universal-office/*`. .NET: projetos, assemblies e namespaces `UniversalOffice.*`
  (`UniversalOffice.Layout` virou `UniversalOffice.Fonts`), solução
  `dotnet/UniversalOffice.sln`.
- **Licença**: MIT em TUDO (`LICENSE` na raiz, copyright Eric Kono) — sem
  edição paga nem cláusula não comercial. Exceções são só
  os dados de terceiros, cada um com os textos de licença no próprio pacote:
  `@universal-office/font-files` = `OFL-1.1 AND Apache-2.0` (Liberation e
  Carlito OFL, Caladea Apache), Hunspell `MPL-1.1 AND MIT` (com o runtime do
  emscripten), dicionário pt-BR MPL-1.1, en-US licença SCOWL, es
  `GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+`, padrões de
  hifenização do hyph-utf8 (avisos em `THIRD-PARTY-NOTICES.md`, no npm e no
  NuGet).
- **Nada específico de um consumidor na biblioteca**: código que só serve a
  um app hospedeiro (ex.: a conversão do Delta/HTML do Quill para .docx do
  clickCompliance) fica NO hospedeiro. A biblioteca oferece a API genérica
  (no .NET: `DocxBodyWriter`, `DocxRunFormat`, `DocxParagraphFormat`,
  `DocxParagraphProperties`, `DocxParagraphSamples`; no editor: plugins,
  `formatting-policy`, slot `side`, `setNotice`, kit da barra).
- **Histórico e publicação**: o que muda em cada versão vai no `CHANGELOG.md`
  da raiz; o passo a passo de npm e NuGet está em `docs/publishing.md`.
- **Repositório, site e README**: o repositório é
  `https://github.com/erichideyuki/universal-office` (saiu da organização
  `tools-universal`; os downloads do app desktop continuam em
  `tools-universal/universal-office-desktop`, e o submódulo
  `tools-universal/office-converter` também não mudou). O site é
  `https://universaloffice.org/` (o conteúdo de `site/`, em inglês). O
  `README.md` da raiz é a VITRINE pública, em inglês (produtos, quick start,
  pacotes, app desktop, patrocínio); o que é de manutenção (estrutura,
  comandos, desktop em detalhe) fica em `docs/development.md`, em português.
  `homepage`/`repository`/`bugs`/`funding` dos pacotes npm saem do `PROJECT`
  do `tools/build-pkg.mjs`, e `PackageProjectUrl`/`RepositoryUrl` dos NuGet do
  `dotnet/Directory.Build.props`. Patrocínio: GitHub Sponsors
  (`https://github.com/sponsors/erichideyuki`, `.github/FUNDING.yml`).

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
substituta, igual na tela e no PDF), o módulo de fontes do SO do app
desktop (`node/system-fonts.cjs`) e as substitutas ABERTAS (`files/`:
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
nos apps. O .NET (namespace `UniversalOffice.DrawingML`, no pacote `UniversalOffice.Core`) lê as MESMAS tabelas dos arquivos TS
como recurso embutido. Charts e slides-core ainda têm cópias próprias da
matemática de cor (migrar para cá é sequência).


## Controles dos viewers: um lugar só

A barra de controles dos viewers (`<universal-slides-viewer>`,
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
(`@universal-office/ui`): registro de comandos (rótulo `{ en, pt, es }`, ícone,
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
API e os layouts: o Write em `editor/src/chrome-*.ts`, o Sheet em
`sheet/packages/sheet/src/chrome-*.ts` e o Slides em
`slides/packages/slides/src/chrome-*.ts`, os três ligados pelos mesmos atributos
(`topbar`, `bottombar`, `toolbar="compact|ribbon"`, compacta por padrão, com o
título acima dos menus — `titlePlacement` é `'above-menus'` sempre que há
título, também na linha mínima do `createBarRow`, e `'inline'` só quando
pedido) e carregados sob demanda; sem os atributos o elemento
não monta barra nenhuma. Os três têm os menus completos (Arquivo · Editar ·
Exibir · Inserir · Formatar… · Ajuda) e a ribbon com as guias do Office; no
Slides o painel de anotações edita as notas do slide (`setSlideNotes`). Comando cuja API ainda não existe fica oculto
(`supports = typeof editor[m] === 'function'`) — frente nova só implementa o
método. O que depende do app hospedeiro (o app desktop) entra pelo `element.host`
opcional (no Slides, `appHost`, porque o viewer já usa `host` para a shadow
root), com o caminho web como recuo; o demo só hospeda o componente. Os testes
das barras do Sheet e do Slides usam o DOM falso do Write
(`write/test-support/fake-dom.ts`), então precisam do `node_modules` do Write.

## Idioma da interface: um lugar só

Os textos da INTERFACE de todos os web components (`<universal-write>`,
`<universal-sheet>`, `<universal-slides>`, os dois viewers,
`<universal-write-diff>`, o diálogo de fontes e o plugin de menções) escolhem
o idioma em `shared/ui` (`@universal-office/ui`, `i18n.ts`) — não reimplementar nos
apps. Idiomas: inglês, português e espanhol (`UiLang = 'en' | 'pt' | 'es'`;
`es`, `es-ES`, `es-419`, `es-MX`… → espanhol neutro com a terminologia do
Office em espanhol e o "tú" do Microsoft 365). Regra combinada com o usuário:
inglês por padrão; o 1º idioma traduzido de `navigator.languages` (pt-* →
português, es-* → espanhol); o atributo `lang` no PRÓPRIO elemento força
(`lang` de ancestral, como `<html lang>`, não conta; idioma sem tradução cai
no inglês). Cada componente guarda a própria tabela `{ en, pt, es }` e usa
`pickLabels`/`uiLang`; as tabelas são `Record<UiLang, …>` (e os helpers
`L`/`tr` pedem os três textos), então rótulo sem espanhol não compila — idioma
novo entra no `UiLang` e o compilador aponta o resto. Para FORA (plugins do
hospedeiro, `Lbl`, `createBarButton`) o rótulo é `LabelTable` `{ en, pt, es? }`:
o `es` é opcional e, sem ele, a interface em espanhol mostra o inglês — não
tornar obrigatório, que quebra hospedeiros. Medidas e números DA
INTERFACE (cm × polegadas, vírgula decimal, datas das revisões) seguem
`uiLocale`/`uiDecimal` (pt e es = métrico com vírgula; en = polegadas com
ponto) — não comparar `lang === 'pt'`. Atalhos de teclado são os mesmos em
todos os idiomas. Isso é só a interface: números, datas e nomes de função do
Sheet seguem `formula-locale` (as mensagens de erro de fórmula também, como no
Excel), que só tem pt-BR (oráculo) e en-US — não há nomes de função em
espanhol —, e a fidelidade dos dados continua pt-BR. Os nomes em espanhol dos
estilos internos do Word (`docx-core/style-names-es.ts`) e os textos das
marcas-d'água em espanhol são escritos à mão (não há oráculo es).

## Claro/escuro: um lugar só

O tema claro/escuro do `<universal-write>` e do `<universal-document-viewer>`
fica em `shared/ui` (`color-scheme.ts`). Regra combinada com o usuário: o
componente segue a propriedade CSS `color-scheme` do CONTEXTO (herdada pela
página, atravessa o shadow DOM) — nunca procura classes (`u-dark`/`u-light`
do @universal-material só mudam o `color-scheme`). As cores são tokens
`--u-color-*` ou `light-dark()`, então a troca é só CSS; sem `color-scheme`
vale o do navegador (`normal` = claro) e `light dark` segue o SO. `theme=
"light|dark"` força (define `color-scheme` no host); `auto`/ausente herda.
O JS que precisa do tema (canvas, controles da janela, evento
`uw-theme-change`/`udv-theme-change`, getter `effectiveTheme`) usa o
`ColorSchemeWatcher`: sonda `light-dark(rgb(0,0,1), rgb(0,0,2))` lida no
`getComputedStyle` + transição de 1 ms (`transitionend`) + `matchMedia` +
ResizeObserver (elemento em `display:none` não transiciona) — medido no
Chromium; sem polling nem MutationObserver. A página do documento fica
branca no escuro (Escuro total/`setDarkPage` é opção). Fundo ÚNICO (estilo
Google Docs/Drive): mesa, barras, régua e painéis em `--uw-background` /
`--udv-background` (padrão `--u-color-surface-container-low`).

## Revisão ortográfica: um lugar só

A revisão ortográfica de todos os apps fica em `shared/spell`
(`@universal-office/spell`): Hunspell 1.7.2 em WASM num Worker, dicionários
abertos do LibreOffice (pt-BR VERO, en-US SCOWL, es RLA-ES — um `es` para
todas as variantes) carregados sob demanda, idioma
por etiqueta BCP 47 (`w:lang`) e dicionário do usuário guardado pelo
hospedeiro. O motor e os dicionários vêm de um registro da página
(`src/sources.ts`): publicados, são pacotes à parte e OPCIONAIS
(`@universal-office/spellcheck`, `@universal-office/dictionary-<id>`), que o
host registra por loader (`registerSpellcheck`/`registerDictionary`) ou por
pasta (`spellcheck-url`); sem eles, não há revisão. Testes e demos usam
`registerBuiltinSources()` (pt-BR, en-US e es; `PUBLISHED_DICTIONARIES` é a
lista padrão do `spellcheck-url`). No Write, texto cujo idioma o documento não
diz (sem `w:lang` no run, nos estilos e nos padrões) é revisado no
`spellcheck-default-lang` (padrão `pt-BR`, `DEFAULT_SPELL_LANG` de
`editor/src/spell.ts`), e o `newDocument()` nasce nesse idioma
(`blankDocxPackage({ lang })` grava o `w:lang` dos padrões e o
`w:themeFontLang`, como o Word com o idioma de edição); o app desktop põe ali o
idioma da interface (`es` → `es-ES`). Dicionário novo: passo a passo em
`shared/spell/src/dicts/README.md`. Regra combinada com o usuário: SÓ Hunspell, também no
Electron (o app desktop desliga o corretor do Chromium na janela do Write:
`webPreferences.spellcheck: false`). No Write, `editor/src/spell.ts` só resolve idioma/noProof por run e
guarda os erros por parágrafo; o sublinhado é adorno de tela do editor (não do
`paintItems` — nunca no PDF, na impressão ou no viewer). Medido: o
nspell não carrega o .aff do VERO (mais de 5 min e mais de 1 GB); a escolha e os
números estão no README do pacote.

## App desktop: um lugar só

`desktop/` é o ÚNICO app Electron: a suíte Universal Office (Beta), com os
três editores num executável (uma janela por documento; a extensão decide o
editor). O que muda de um editor para o outro é DADO em `desktop/editors.cjs`
(página, extensões, formatos de salvar/exportar, tema, pop-ups, impressão,
AppUserModelID); `main.cjs` faz janelas, arquivos, salvar, exportar,
imprimir, tema e fechar uma vez só — editor novo ou formato novo entra no
perfil, não em outro `if`; texto que o usuário vê fica em `desktop/i18n.cjs`
(pt-BR, en-US, es). O `preload.cjs` (sandbox, não importa arquivo
local) expõe a ponte de cada página com os nomes que o demo e o host do
componente já usam (`wordnext`, `universalSheet`, `universalSlides`):
renomear quebra os dois. O idioma da interface é do app (boas-vindas e menu
Idioma injetado pela API `use()` de cada componente) e chega aos editores
pelo atributo `lang`, que o preload aplica; o editor em si não guarda
idioma. Os ícones saem de `site/assets/icons` rasterizados pelo Chromium
(`build/gen-icons.mjs`) — não redesenhar ícone no app. O switch do editor é
`--editor=` (`--app=` é nome de switch do Chrome; fica só como apelido; os
lançadores do snap usam `UO_APP`, porque o snapd não aceita `=`), e
`--new-window` abre um documento novo. As fontes abertas vão uma vez só
(`resources/fonts`, servidas para os três demos); proprietária nunca entra
no pacote — o servidor lê a instalada no SO (Sheet/Slides) ou devolve 404 (o
Write usa a substituta métrica). Testes: `npm --prefix desktop run smoke`
(dev, janelas ocultas) e `smoke:packaged` (os três editores no executável
empacotado, com 2ª instância). Release: tag `desktop-v<versão>`
(`desktop/RELEASING.md`).

## Pacotes: fronteira só com motivo

São 16 pacotes (consolidados em 2026-10-19 a partir de 21; `spell` e `drawingml` entraram depois). Pacote novo só
entra com um motivo real: (1) é um PRODUTO separado — um web component
publicado por conta própria; ou (2) é um motor usado por mais de um
app ou sem DOM fora dos apps (`fonts`, `charts`, `ui`, `spell`, `sheet-calc`, `drawingml`). O resto
fica como pasta dentro do pacote dono: conversões de formato em
`<app>-core/src/export` (e `docx-core/src/odf`), base tipográfica e PDF do
Write em `docx-layout/src/typography` e `src/pdf-writer`. Módulos movidos para
dentro de um core importam de `../core.js` (não do `index.ts`), para não criar
ciclo. Código que só delega ao office-converter (`vendor/`) não justifica
pacote nem cópia local — e os cores têm `sideEffects: false` para o conversor
não entrar nos bundles de quem não o usa.

Publicação: vão para o registro os 6 PRODUTOS (`write`, `document-viewer`,
`compare`, `sheet`, `slides-viewer`, `slides`) e os pacotes de DADOS
(`font-files` em `shared/fonts/packages/`; `spellcheck`, `dictionary-pt-br`,
`dictionary-en-us` e `dictionary-es` em `shared/spell/packages/`). `npm run build:pkg`
(`tools/build-pkg.mjs`) gera `<pacote>/publish/` (fora do git). Cada produto
leva todo o código dentro: pacotes internos pelo src, dependências npm, partes
sob demanda em `chunks/`, um `.d.ts` único por entrada (o write tem duas:
`index.js` = editor, `viewer.js` = só o `<universal-document-viewer>`, com os
chunks compartilhados). A única dependência dos produtos com fontes é o
`@universal-office/font-files`, com a versão EXATA; as fontes abertas não vão
mais dentro de cada produto. O motor e os dicionários da revisão nunca entram
num produto (o build falha) e o write não depende deles.
Publicar de dentro de `publish/` (`npm pack` lá dentro e `npm publish
<tgz> --access public`; ver `docs/publishing.md`). Desde a 0.9.2 todos os
pacotes (os 6 produtos e os de dados, e os NuGet) saem com a MESMA versão; o
`slides-viewer` substituiu o `presentation-viewer` (publicado só como 0.0.1,
depreciado no npm), e o viewer do Slides é o `<universal-slides-viewer>`
(classe `UniversalSlidesViewerElement`). Versões andam
juntas: `write` e `document-viewer` sempre com a mesma versão (o write leva o
viewer como 2ª entrada), o par `slides`/`slides-viewer` também, e o
`font-files` é publicado ANTES dos produtos na versão que eles exigem (exata).
Os 10 internos são `private` e nunca são publicados. O `dist/` é outra coisa: saída do tsc que os pacotes do monorepo
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

## .NET: porta com paridade

`dotnet/` (`UniversalOffice.sln`, net8.0, sem dependências NuGet em `src/`) é a
porta .NET dos três formatos, com paridade testada contra o JS (ver
`dotnet/README.md`). Quatro pacotes NuGet, metadados comuns no
`dotnet/Directory.Build.props` (versão = a dos pacotes npm): `UniversalOffice.Core`
(Core + Fonts + Pdf + DrawingML) e `UniversalOffice.Docx` (Docx + Editing +
DocxLayout + DocBinary + exportadores do docx), publicados no nuget.org;
`UniversalOffice.Xlsx` e `UniversalOffice.Pptx` são empacotados
(`dotnet pack -c Release`), mas ainda não publicados. O `JsPath` (porta do
`path` do Node, `Core/Fonts/JsCompat.cs`) é win32 só no Windows, pela paridade
com o JS; fora dele junta com o separador do SO — com `\` no Linux nenhuma
pasta de fontes era achada e o PDF do servidor falhava (teste em
`SystemFontIndexTests`). No servidor Linux as substitutas métricas
(`fonts-liberation`, `fonts-crosextra-carlito`, `fonts-crosextra-caladea`) são
instaladas no SO, não vêm no NuGet. O motor de layout existe
nos dois lados (`write/packages/docx-layout` e `UniversalOffice.Docx/DocxLayout`):
regra nova é medida no Word (`write/tools/layout-oracle`, casos em
`test/oracle/<grupo>`), entra no JS, é portada no .NET e os dumps de paridade
são regenerados (`tools/gen-parity-layout.mjs`). As regras medidas e as
diferenças conhecidas em relação ao Word ficam no README do docx-layout.

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
