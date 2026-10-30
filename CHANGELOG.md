# Changelog

Mudanças por versão dos pacotes publicados do UniversalOffice (npm
`@universal-office/*` e NuGet `UniversalOffice.*`). Como publicar:
`docs/publishing.md`.

## Unreleased

### Sheet

- `<universal-sheet>` ganhou barras próprias, como as do `<universal-write>`
  e sobre o mesmo framework (`@universal-office/ui`), ligadas pelos mesmos
  atributos: `topbar` (barra compacta, padrão — título acima dos menus
  Arquivo · Editar · Exibir · Inserir · Formatar · Ferramentas · Ajuda e uma
  linha de ferramentas que recolhe por prioridade — ou `toolbar="ribbon"`,
  com as guias Página Inicial · Inserir · Fórmulas · Exibir · Ajuda), barra
  de fórmulas com Caixa de Nome e `fx`, e `bottombar` (guias das planilhas
  com Inserir Planilha e barra de status com média, contagem e soma da
  seleção e zoom). `lang`, `theme`/`color-scheme`, `accent`, `storage-key`,
  `hidden-commands`, plugins com `toolbar` (`use`/`register`), `setNotice`,
  atalhos do Excel, menu de contexto, arrastar e soltar, diálogos (Formatar
  Células, Localizar e Substituir, Ir Para, Inserir Função, Largura da
  Coluna, Altura da Linha, Propriedades) e o `host` opcional do app
  hospedeiro (diálogos nativos, confirmação ao fechar, janela sem moldura com
  `.uo-wco`). Sem os atributos o elemento fica como era.
- API de edição nova (usada pelas barras e pública): seleção de intervalo
  (`selectRange`, `getSelection`, `selectAll`, Shift/Ctrl+setas), desfazer/
  refazer, copiar/recortar/colar com as referências relativas ajustadas,
  Colar Valores, Preencher Abaixo/à Direita, Limpar, `setFormat` (fonte,
  preenchimento, bordas, alinhamento, quebra, formatos de número, casas
  decimais), mesclar, congelar painéis, linhas de grade, largura/altura,
  AutoAjuste, ocultar/reexibir, localizar/substituir, AutoSoma, Inserir
  Função, Calcular Agora, `newWorkbook`, `addSheet`, `selectionStats`,
  `getProperties`, `isDirty`, eventos `us-change`, `us-load`,
  `us-theme-change`. Tudo vai para o .xlsx: o styles.xml ganha só as
  fontes/preenchimentos/bordas/xfs novos e a worksheet regrava
  `<mergeCells>`/`<sheetView>` só quando mudaram.
- sheet-core: `blankWorkbook`/`blankXlsx` e as opções `merges`/`sheetView`
  de `updateWorksheetXml`.
- App desktop: a janela sem moldura mostra a barra do componente com os
  controles do SO sobrepostos; Abrir/Salvar/Exportar nativos, confirmação de
  alterações não salvas ao fechar, e as planilhas abertas pelo SO entram
  pela API do componente (`openWorkbook`) em vez de um "soltar" sintético.

### Slides

- `<universal-slides>` ganhou barras próprias, como as do `<universal-write>`
  e sobre o mesmo framework (`@universal-office/ui`), ligadas pelos mesmos
  atributos: `topbar` (barra compacta, padrão — logo, título editável acima
  dos menus Arquivo · Editar · Exibir · Inserir · Formatar · Slide ·
  Apresentação · Ajuda, linha de ferramentas que recolhe por prioridade e o
  botão Apresentar — ou `toolbar="ribbon"`, com as guias Página Inicial ·
  Inserir · Design · Transições · Animações · Apresentação de Slides · Exibir
  e a contextual Formato da Forma), painel de MINIATURAS (arrastar para
  reordenar, menu de contexto), painel de ANOTAÇÕES, modos Classificação de
  Slides e Leitura, Painel de Animação (leitura) e `bottombar` (Slide n de N,
  modos de exibição, zoom). `lang`, `theme`/`color-scheme`, `storage-key`,
  `hidden-commands`, plugins com `toolbar` (`use`/`register`), `setNotice`,
  `loadBarKit`, atalhos do PowerPoint (F5, Shift+F5, Ctrl+M, Ctrl+D…), área
  de transferência das formas, arrastar e soltar (apresentação abre, imagem
  entra no slide), diálogos (Localizar e Substituir, Propriedades,
  Configurar Apresentação, Tamanho e Posição, Link, Atalhos) e o `appHost`
  opcional do app hospedeiro (diálogos nativos, impressão, confirmação ao
  fechar, janela sem moldura com `.uo-wco`). Sem os atributos o elemento fica
  como era.
- A edição vai para o ARQUIVO (antes o texto editado só mudava a tela):
  `deck-edit.ts` troca só o trecho editado de cada parte e o modelo é relido
  do pacote. API nova (usada pelas barras e pública): `openPresentation`,
  `newPresentation` (tema do Office, seis layouts, master de anotações),
  `documentName`, desfazer/refazer, `isDirty`/`markClean`, slides (novo a
  partir do layout, duplicar com as anotações, excluir, mover, ocultar,
  layout, fundo, transição — 21 efeitos —, "Configurar apresentação"),
  formas (seleção, caixa de texto, 28 formas, imagem, posição/tamanho,
  preenchimento, contorno, ordem, excluir com as animações, copiar/colar,
  link), formatação do texto da forma, anotações, propriedades,
  localizar/substituir, zoom, `previewSlide`, `getSlideAnimations`. Eventos
  `us-change`, `us-selection`, `us-dirty`, `us-title-change`, `us-zoom`,
  `us-theme-change`, `us-file-drop`.
- presentation-viewer: ganchos protegidos para o editor (`rereadDeck`,
  `rereadSlide`, `slidePartPath`, `deskColor`); o comportamento do viewer não
  muda. slides-core: `PptxPackage.fromParts` e o número do slide (campo
  `slidenum`) acompanha inserção/exclusão/movimento de slides.
- App desktop: a janela sem moldura mostra a barra do componente com os
  controles do SO sobrepostos (sem a região de arrastar injetada no demo);
  Abrir/Salvar (no mesmo arquivo)/Exportar nativos, impressão pelo diálogo do
  sistema, confirmação de alterações não salvas ao fechar, e as apresentações
  abertas pelo SO entram pela API do componente (`openPresentation`) em vez
  de um "soltar" sintético. O demo passou a ser só o componente.

## 0.9.1 — 2026-10-29

Primeira versão publicada com o nome e a licença definitivos.

### Nome e licença

- O produto se chama **UniversalOffice**. npm: escopo `@universal-office/*`
  (o escopo `@universal-office-pro` acabou). .NET: projetos, assemblies e
  namespaces `UniversalOffice.*` (`OfficeNext.*` saiu; `UniversalOffice.Layout`
  virou `UniversalOffice.Fonts`), solução `dotnet/UniversalOffice.sln`.
- **MIT em tudo** (`LICENSE` na raiz, copyright Eric Kono): não há mais edição
  paga, PrivJS nem cláusula não comercial. Dados de terceiros com as próprias
  licenças, dentro de cada pacote: `@universal-office/font-files` =
  `OFL-1.1 AND Apache-2.0` (Caladea é Apache-2.0), Hunspell `MPL-1.1 AND MIT`,
  dicionário pt-BR MPL-1.1, en-US licença SCOWL, avisos dos padrões de
  hifenização do hyph-utf8.

### Pacotes npm

- Publicados em 0.9.1: `@universal-office/write` (editor, com a entrada
  `./viewer` que só registra o `<universal-document-viewer>` e compartilha os
  chunks), `@universal-office/document-viewer` (só o viewer),
  `@universal-office/font-files`, `@universal-office/spellcheck`,
  `@universal-office/dictionary-pt-br` e `@universal-office/dictionary-en-us`.
  Publicados em 0.0.1: `@universal-office/compare` e
  `@universal-office/presentation-viewer`. `@universal-office/sheet` e
  `@universal-office/slides` (0.0.1) são gerados, mas ainda não publicados.
- As fontes abertas saíram de dentro de cada produto (eram os mesmos 7 MB em
  cada um) para o `@universal-office/font-files`, única dependência dos
  produtos, com versão exata. O host serve a pasta do pacote e aponta o
  atributo `fonts` para ela; sem o atributo, o viewer procura a pasta irmã
  `font-files/`.
- A revisão ortográfica não vem mais dentro do write: o motor
  (`@universal-office/spellcheck`) e cada dicionário são pacotes OPCIONAIS,
  registrados por loader (`registerSpellcheck`, `registerDictionary`, com
  bundler) ou por pasta (`spellcheck-url`, `spellcheck-languages`,
  `configureSpellcheck`). Sem eles não há revisão nem erro.
- Host que carrega por URL: um subdiretório por pacote,
  `/vendor/universal-office/<pacote>/` (`write/`, `font-files/`,
  `spellcheck/`, `dictionary-pt-br/`…).
- Sem tgz vendorizado: cada pacote sai de `tools/build-pkg.mjs` em
  `<pacote>/publish/` e é empacotado com `npm pack`.

### Pacotes NuGet

- Publicados em 0.9.1: `UniversalOffice.Core` (Core + Fonts + Pdf +
  DrawingML) e `UniversalOffice.Docx` (Docx + Editing + DocxLayout + DocBinary
  + exportadores do docx). `UniversalOffice.Xlsx` e `UniversalOffice.Pptx` são
  empacotados, mas ainda não publicados. Metadados comuns em
  `dotnet/Directory.Build.props`, README em inglês dentro de cada pacote,
  símbolos `.snupkg`.
- Edição de .docx no servidor (`UniversalOffice.Docx.Editing`): saneamento de
  conteúdo não confiável com tetos (`DocxLimits`, `OpcPackageLimits`,
  `OfficeLimitExceededException`), regra única para alvos de relação
  (`OpcPartName.ResolveRelationshipTarget`), modelos, parâmetros `#{...}`,
  inlines de plugin (`CustomInlineTag`), texto puro, links e marcadores no PDF,
  substitutas métricas (`SubstituteFontProvider`).
- Nada específico de um consumidor na biblioteca: a conversão do Quill saiu
  para o app que a usa. No lugar, a API genérica `DocxBodyWriter`,
  `DocxRunFormat`, `DocxParagraphFormat`, `DocxParagraphProperties` e
  `DocxParagraphSamples`.

### Layout (motores JS e .NET, medidos no Word)

- `NUMPAGES` desconta a capa quando o corpo tem uma folha de rosto da galeria
  do Word (sdt "Cover Pages") e a 1ª seção começa a numeração em 0;
  `SECTIONPAGES` nunca desconta e é calculado por seção.
- Campos de fórmula recalculados como o Word (`{ = { NUMPAGES } - 1 }`, o
  total sem a capa), com avaliação pequena e segura.
- Tabela que continua em outra coluna fica no x da coluna nova.
- "Dentro"/"fora" na página par: posição e margens interna/externa trocam de
  lado, para caixas de texto e tabelas flutuantes.
- Equilíbrio de 3 ou mais colunas numa quebra de seção contínua.
- Contorno de objetos girados: entre 45° e 135° (e 225°–315°) largura e
  altura trocadas.
- PDF com espaços entre palavras gravados (busca e cópia), links clicáveis e
  marcadores pelos títulos.
- Diferenças que continuam: o Word prefere a fonte instalada (ou da nuvem) à
  embutida; margens espelhadas e medianiz não aplicadas; caixa girada acima do
  parágrafo âncora; controles de conteúdo ligados a dados. Detalhes no README
  do `docx-layout`.

### Editor e viewer para apps hospedeiros

- Barra compacta com a linha de título acima dos menus, como o Google Docs
  (`compact.titlePlacement: 'above-menus'`, o padrão quando há título;
  `'inline'` volta a uma linha só); `loadBarKit()` e `createBarRow()` montam a mesma barra
  fora do editor (prévia, só leitura).
- Slot `side` (e `side-start`) no `<universal-write>` e no
  `<universal-document-viewer>`: painel lateral do host abaixo das barras;
  evento `uw-side-resize`.
- `setNotice(el, { tone })`: faixa de aviso do host entre os menus e as
  ferramentas.
- `formatting-policy="template-document"` (e a propriedade
  `formattingPolicy`): o usuário só formata o que a política permite; colar
  converte o resto.
- `uw-file-drop` (cancelável) e `nofiledrop`: o host decide o que fazer com
  arquivos soltos.
- Claro/escuro pela propriedade CSS `color-scheme` do contexto (`theme` força);
  `effectiveTheme` e `uw-theme-change` / `udv-theme-change`.
- Plugins também no viewer (os mesmos `inlineRenderers`) e registro global
  (`register`/`unregister`); `isEmpty`, `isDirty`/`setDirty`, `getLinks`,
  `getCustomInlines`; Ctrl+clique abre só http/https/mailto, sem opener nem
  Referer.
