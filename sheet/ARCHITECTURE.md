# Universal Sheet — Arquitetura

Planilha eletrônica **1:1 compatível com o app de referência**: mesmo formato
(`.xlsx` / SpreadsheetML), mesma renderização em tela. Irmão do UniversalWrite
(Write) dentro do monorepo Universal Office — mesma metodologia, mesmo rigor.

Princípio organizador (aprendido com o Write): **abstrair cedo é o que quebra
a compatibilidade em todo editor de Office**. Cada editor concorrente perde
fidelidade porque inventa um modelo "bonito" que não espelha o formato real.
Aqui o modelo interno espelha o OOXML literalmente.

## Regra de Ouro — round-trip sem perdas

Um `.xlsx` é um ZIP de partes (OPC). Toda parte é preservada **byte a byte**;
só regeneramos uma parte quando uma edição a modifica de fato. A **ordem das
partes no ZIP é preservada** — o app de referência não exige, mas diffs ficam limpos e
regressões nossas saltam aos olhos. Partes/atributos desconhecidos fluem
intactos (rawXml passthrough). Isso é a base estrutural de compatibilidade.

## Metodologia — o app de referência como oráculo (3 camadas)

A especificação não é um documento; é o comportamento observado do app de referência,
capturado por automação COM (`New-Object -ComObject Excel.Application`).

### Camada A — Diferencial estrutural (mutação de XML)
`tools/excel-lab/` dirige o app de referência via COM:
1. Cada **experimento** (`experiments/NNN-*.ps1`) define `$Description`,
   `$Setup` (opcional) e `$Operation` (uma operação atômica: setar valor,
   aplicar formato, inserir fórmula, mesclar células…).
2. `run-experiment.ps1` abre o app de referência, snapshot `before.xlsx`, executa a op,
   snapshot `after.xlsx`.
3. Ambos são descompactados, todo XML re-indentado (`XDocument`), e
   `git diff --no-index` gera `sheet.diff` + `report.md`.
4. **O diff É a especificação** de como aquela operação muta o SpreadsheetML.
   Achados vão para `FINDINGS.md`.

### Camada B — Oráculo numérico de layout
O app de referência usa um sistema de unidades próprio (largura de coluna em caracteres da
fonte Normal, altura de linha em pontos). Validamos nosso motor de grid contra
os números do app de referência: `Range.Width`, `Range.Height`, `ColumnWidth`,
`RowHeight`, `UsedRange`, e quebras de página impressas
(`HPageBreaks`/`VPageBreaks`).

### Camada C — Fidelidade de pixel (renderização)
O app de referência exporta **PDF** (`ExportAsFixedFormat`, Type=0). Rasterizamos via WinRT
`Windows.Data.Pdf` (PowerShell 5.1 — pwsh não projeta WinRT). Nosso canvas
renderiza e compara com `pixel-compare.mjs` (cinza + blur 3×3 + tolerância).
Métrica estrutural (blur) separa estrutura de fase de antialiasing entre
rasterizadores.

## Pacotes (monorepo npm workspaces)

| Pacote | npm | Propósito |
|---|---|---|
| **sheet-core** | `@universal-office/sheet-core` | Modelo + parse/serialize OOXML. `XlsxPackage` (container lossless), `parseXml`, leitura de workbook/worksheets/sharedStrings/styles/theme, `formatValue` pt-BR (oráculo 1:1). |
| **sheet** | `@universal-office/sheet` | O webcomponent `<universal-sheet>`. Renderiza o grid em canvas: células, estilos, merges, panes congeladas (4 quadrantes), rich text, charts, hyperlinks, edição inline. |
| **sheet-core/export** | (dentro de `@universal-office/sheet-core`) | Exportadores puros (browser+node) em `sheet-core/src/export`: CSV/TSV (`;`, RFC 4180, CRLF), Markdown (GFM), HTML (estilos inline), PDF e Markdown via office-converter (`vendor/`), ODS (OpenDocument) e SpreadsheetML 2003. Valores exibidos via `formatValue` pt-BR. |
| **calc** | `@universal-office/sheet-calc` | Motor de cálculo (fórmulas, funções, recálculo) — ver `calc/`. |
| _sheet-layout_ (futuro) | `@universal-office/sheet-layout` | Motor de grid extraído (hoje o layout vive no webcomponent; funções puras em `grid-layout.ts`). |

> **Build**: os exportadores de `sheet-core` (PDF e Markdown) usam o
> office-converter de `vendor/` pelo `dist/` dele — num checkout limpo rode
> `npm run install:converter` na raiz antes do build do sheet. O Sheet não
> depende mais de nenhum pacote do `write/`.

## Stack

TypeScript ES2022/ESM, `fflate` (zip/unzip sync), `pngjs` (pixel-diff),
Vitest (testes co-localizados `*.test.ts`), builds `tsc`, app/demo `esbuild`,
shell Electron. Sem React/Vite — editor é webcomponent renderizando em canvas.

## Convenções

- **Pasta**: `sheet/` (paralela a `write/`). **Produto**: Universal Sheet.
  **Scope npm**: `@universal`. **Webcomponent**: `<universal-sheet>`.
- Imports usam extensão `.js` mesmo em fonte `.ts` (ESM + moduleResolution bundler).
- `index.ts` é barrel re-exportando a API pública (`export type` para interfaces).
- Comentários/docs em **pt-BR**; identificadores em inglês.
- Experimentos nomeados `NNN-kebab-name.ps1`, resultados espelhados em `results/NNN-*/`.

## Pipeline de renderização (alvo)

```
.xlsx bytes
   │  XlsxPackage.load (fflate unzip)
   ▼
XlsxPackage (parts map, ordem preservada)
   │  readWorkbook / readSharedStrings / readStyles / readWorksheet
   ▼
Workbook (sheets, cells com estilo/fórmula/valor)
   │  <universal-sheet>.layout()  ◄── motor de grid + paginação
   ▼
SheetLayout[] (posições absolutas: colunas, linhas, células mescladas)
   │  <universal-sheet>.paint()    ◄── desenha grid em <canvas> por planilha
   ▼
planilha visível
```

Por que canvas, não DOM: um navegador não vai reproduzir a renderização de
célula do app de referência (overflow/clip, autofit, alinhamento vertical, grids)
fielmente. Controlamos cada pixel.

## Edição e barras (chrome)

O `<universal-sheet>` edita a pasta pelo MESMO modelo da leitura (sem modelo
paralelo): o motor de cálculo grava os valores em `worksheet.rows`, e as
operações das barras mexem direto no modelo e marcam o que regravar.

- **Seleção de intervalo**: célula ativa (`sel`) + canto (`corner`) +
  intervalo (`range`, expandido até conter as mesclas inteiras); colunas
  inteiras vão até a linha 1048576 e linhas inteiras até a coluna XFD.
- **Desfazer/refazer**: cada ação guarda o antes/depois das células que toca
  (texto de edição + estilo) e, quando muda a estrutura, um retrato da aba
  (`<col>`, metadados das `<row>`, mesclas, painéis, grade, larguras e alturas
  da vista). Restaurar uma célula é redigitar o texto de edição no motor
  (fórmulas recalculam) e repor o estilo. Carregar uma pasta zera a pilha.
- **Copiar/colar**: o texto tabulado vai para a área de transferência do
  sistema (eventos `copy`/`cut`/`paste` do canvas); a cópia interna leva o
  texto de edição com as referências RELATIVAS deslocadas
  (`SheetCalc.copyText`: `parseFormula` na origem → `printFormula` no
  destino → `toLocal`) e o estilo.
- **Formatação**: o `XfPool` (sheet-calc.ts), que já derivava xfs para os
  formatos que a entrada aplica, deriva também fonte, preenchimento, bordas e
  alinhamento; na gravação acrescenta ao styles.xml as `<font>`/`<fill>`/
  `<border>`/`<xf>` novas — a fonte nova copia o XML da fonte de molde (cor do
  tema, família, esquema) trocando só o que mudou; o `<xf>` copia o de origem
  (proteção, extLst) — sem tocar no resto. Colunas/linhas inteiras recebem o
  `<col style>` / `<row s customFormat>`, como o Excel.
- **Gravação**: `updateWorksheetXml(xml, ws, { merges, sheetView })` regrava
  `<sheetData>`/`<cols>` e, só nas abas em que mudaram, `<mergeCells>` e o
  1º `<sheetView>` (`showGridLines` e o `<pane>` congelado; um split solto do
  arquivo fica). Arquivo › Novo é `blankWorkbook()` (sheet-core/blank.ts);
  Inserir Planilha acrescenta a parte e reabre a pasta gravada.
- **Barras** (`chrome*.ts`, chunk sob demanda; só com `topbar`/`bottombar`):
  declaradas sobre o framework de `shared/ui/src/toolbar` como as do Write —
  comandos (`chrome-commands.ts`, só sobre a API pública do elemento),
  layouts compacto e ribbon (`chrome-layout.ts`), widgets, diálogos, barra de
  fórmulas, guias e status (`chrome-panels.ts`), app (`chrome-app.ts`:
  abrir/salvar/exportar/imprimir, título, alterações não salvas) e o `host`
  opcional (`chrome-host.ts`). Ícones que o conjunto compartilhado não tem
  ficam em `chrome-icons.ts` (SVG cru da mesma fonte). Plugins
  (`use`/`register`, `toolbar`) e `hidden-commands` seguem o modelo do Write.
