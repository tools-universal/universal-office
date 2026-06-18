# Universal Sheet — Arquitetura

Planilha eletrônica **1:1 compatível com Microsoft Excel**: mesmo formato
(`.xlsx` / SpreadsheetML), mesma renderização em tela. Irmão do UniversalWrite
(WordNext) dentro do monorepo OfficeNext — mesma metodologia, mesmo rigor.

Princípio organizador (aprendido com o WordNext): **abstrair cedo é o que quebra
a compatibilidade em todo editor de Office**. Cada editor concorrente perde
fidelidade porque inventa um modelo "bonito" que não espelha o formato real.
Aqui o modelo interno espelha o OOXML literalmente.

## Regra de Ouro — round-trip sem perdas

Um `.xlsx` é um ZIP de partes (OPC). Toda parte é preservada **byte a byte**;
só regeneramos uma parte quando uma edição a modifica de fato. A **ordem das
partes no ZIP é preservada** — o Excel não exige, mas diffs ficam limpos e
regressões nossas saltam aos olhos. Partes/atributos desconhecidos fluem
intactos (rawXml passthrough). Isso é a base estrutural de compatibilidade.

## Metodologia — Excel como oráculo (3 camadas)

A especificação não é um documento; é o comportamento observado do Excel real,
capturado por automação COM (`New-Object -ComObject Excel.Application`).

### Camada A — Diferencial estrutural (mutação de XML)
`tools/excel-lab/` dirige o Excel real via COM:
1. Cada **experimento** (`experiments/NNN-*.ps1`) define `$Description`,
   `$Setup` (opcional) e `$Operation` (uma operação atômica: setar valor,
   aplicar formato, inserir fórmula, mesclar células…).
2. `run-experiment.ps1` abre o Excel, snapshot `before.xlsx`, executa a op,
   snapshot `after.xlsx`.
3. Ambos são descompactados, todo XML re-indentado (`XDocument`), e
   `git diff --no-index` gera `sheet.diff` + `report.md`.
4. **O diff É a especificação** de como aquela operação muta o SpreadsheetML.
   Achados vão para `FINDINGS.md`.

### Camada B — Oráculo numérico de layout
O Excel usa um sistema de unidades próprio (largura de coluna em caracteres da
fonte Normal, altura de linha em pontos). Validamos nosso motor de grid contra
os números do Excel: `Range.Width`, `Range.Height`, `ColumnWidth`,
`RowHeight`, `UsedRange`, e quebras de página impressas
(`HPageBreaks`/`VPageBreaks`).

### Camada C — Fidelidade de pixel (renderização)
O Excel exporta **PDF** (`ExportAsFixedFormat`, Type=0). Rasterizamos via WinRT
`Windows.Data.Pdf` (PowerShell 5.1 — pwsh não projeta WinRT). Nosso canvas
renderiza e compara com `pixel-compare.mjs` (cinza + blur 3×3 + tolerância).
Métrica estrutural (blur) separa estrutura de fase de antialiasing entre
rasterizadores.

## Pacotes (monorepo npm workspaces)

| Pacote | npm | Propósito |
|---|---|---|
| **sheet-core** | `@universal/sheet-core` | Modelo + parse/serialize OOXML. `XlsxPackage` (container lossless), `parseXml`, leitura de workbook/worksheets/sharedStrings/styles. |
| _sheet-layout_ (futuro) | `@universal/sheet-layout` | Motor de grid: largura de coluna (unidades de caractere), altura de linha, paginação, células mescladas, clipping/overflow. |
| _editor_ (futuro) | `@universal/sheet` | O webcomponent `<universal-sheet>`. Renderiza o grid em canvas. Célula, fórmula, seleção, panes congeladas. |

(modelo segue o WordNext: pdf, export, odf — futuros)

## Stack

TypeScript ES2022/ESM, `fflate` (zip/unzip sync), `pngjs` (pixel-diff),
Vitest (testes co-localizados `*.test.ts`), builds `tsc`, app/demo `esbuild`,
shell Electron. Sem React/Vite — editor é webcomponent renderizando em canvas.

## Convenções

- **Pasta**: `SheetNext/` (paralela a `WordNext/`). **Produto**: Universal Sheet.
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
célula do Excel (overflow/clip, autofit, alinhamento vertical, grids)
fielmente. Controlamos cada pixel.
