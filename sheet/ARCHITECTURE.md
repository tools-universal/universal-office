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
| **sheet** | `@universal-office-pro/sheet` | O webcomponent `<universal-sheet>`. Renderiza o grid em canvas: células, estilos, merges, panes congeladas (4 quadrantes), rich text, charts, hyperlinks, edição inline. |
| **export** | `@universal-office/sheet-export` | Exportadores puros (browser+node): CSV/TSV (`;`, RFC 4180, CRLF), Markdown (GFM), HTML (estilos inline), PDF (via `@universal-office/pdf`), ODS (OpenDocument) e SpreadsheetML 2003. Valores exibidos via `formatValue` pt-BR. |
| _sheet-layout_ (futuro) | `@universal-office/sheet-layout` | Motor de grid extraído (hoje o layout vive no webcomponent; funções puras em `grid-layout.ts`). |

> **Build cross-workspace**: `@universal-office/sheet-export` depende de
> `@universal-office/pdf` via `file:../../../write/packages/pdf` (symlink npm) e dos
> **`dist/` do write** — rode `npm run build` no `write/` antes do build do
> sheet num checkout limpo (senão TS2307 "Cannot find module '@universal-office/pdf'").

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
