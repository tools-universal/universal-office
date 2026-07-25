# Revisão de fidelidade 1:1 — Universal Sheet × app de referência

## Auditoria 2026-07-25 — tabelas 1:1, chart engine do tema, perf 1M células

Ferramentas novas: `tools/excel-lab/gap-tour.mjs` (screenshots por aba do
showcase no componente headless), `gen-giant.mjs` (xlsx de 200k e 1M células),
`perf-giant.mjs` (load/paint/scroll + heap via CDP `Performance.getMetrics`).

1. **Tabelas (ListObject) 1:1**: parse de `xl/tables/tableN.xml` via
   `<tableParts>`; família built-in `TableStyleMediumN` replicada por accent do
   TEMA (N=1 cinza; N=2..7 → accent1..6). Header = accent + texto branco bold
   (apenas quando a célula usa a fonte default — formatação explícita vence);
   bandas = accent com **tint HSL 0.8** (fórmula do app de referência, medida
   no oráculo PDF: accent1 `#156082` → banda `#C0E6F5`; nosso `#C1E5F5`,
   ±1/255 de arredondamento); setas de autofiltro desenhadas no header.
2. **Chart engine sincronizada com o Slides** (upgrade de hoje): paleta =
   accents 1..6 do `theme1.xml` do workbook (era paleta Office 2013 fixa),
   legendas centradas, holeSize, ticks nice com headroom, radar de linhas,
   scatter XY real, área, decimais pt-BR; moldura `#D9D9D9` (o app de
   referência desenha borda em charts embutidos; PowerPoint não).
3. **Confirmado no tour**: frozen panes JÁ renderizam 1:1 (viewport de 4
   quadrantes) — a pendência antiga estava desatualizada.
4. **Performance (planilha gigante)**: o índice célula-por-ref (`rowMap`) era
   reconstruído A CADA paint — 1M de entradas por frame:
   | arquivo | load | paint antes | paint depois | scroll depois | heap usado |
   |---|---|---|---|---|---|
   | giant-200k (2000×100) | 226ms | 17.4ms | **2.5ms** | 2.7ms | ~23MB |
   | giant-1m (10000×100) | 787ms | 75.3ms | **2.4ms** | 2.4ms | ~98MB |
   Cache por aba invalidado em `loadXlsx`/`selectSheet`/`setCellValue`
   (incl. remoção de célula); `condNumMap` idem (só com regras na aba).
   124/124 testes verdes; showcase sem regressão no gap-tour.


Revisão conduzida com o **app de referência como oráculo** (app de referência 16.0 pt-BR, via
automação COM). Metodologia: capturar o comportamento exato do app de referência, comparar
contra a implementação, corrigir, e **fixar com teste de regressão** ancorado no
oráculo. Locale do oráculo: pt-BR (decimal `,`, milhar `.`, nomes pt minúsculos).

## Harness de oráculo criado (reutilizável)

| Ferramenta | Papel |
|---|---|
| `tools/excel-lab/gen-oracle-xlsx.mjs` | Gera `.xlsx` com formatCodes **canônicos OOXML** (locale-independentes) — 74 casos (General, decimais, milhar, %, moeda, contábil, multi-seção, científico, frações, datas, hora, elapsed, texto). |
| `tools/excel-lab/read-oracle-xlsx.ps1` | Abre no app de referência e lê `Range.Text` (display localizado) célula a célula → `results/oracle-format.json`. |
| `tools/excel-lab/audit-format.mjs` | Audita o motor `format.ts` contra o oráculo. |
| `tools/excel-lab/gen-smoke-xlsx.mjs` + `smoke-render.mjs` | Renderiza comportamentos novos (transbordo, ####, [Red], datas) no canvas headless p/ inspeção. |

> **Armadilha metodológica documentada:** o setter COM `.NumberFormat` é
> contaminado pelo locale (em pt-BR ele lê o `.` de `0.00` como separador de
> milhar → `#.000`, e `yyyy` vira literal porque o token de ano localizado é
> `a`). O oráculo confiável é **escrever o formatCode canônico no `.xlsx` e ler
> `Range.Text`** — o que `read-oracle-xlsx.ps1` faz.

## Corrigido (verificado 1:1)

### 1. Motor de formatação numérica/data — reescrito (`sheet-core/src/format.ts`)
O `formatNumeric`/`formatDate` antigos do renderer estavam em **en-US** e não
tratavam seções, General, científico, frações nem contábil. Novo motor **puro**
no core, **74/74 casos batendo o app de referência** (`test/format.test.ts`):

- **Locale pt-BR**: `1234567.89` `#,##0.00` → `1.234.567,89` (era `1,234,567.89`).
- **General fiel**: cabe em ~11 caracteres e vira científico quando estoura —
  `123456789012` → `1,23457E+11`; `0.6666…` → `0,666666667`; `1e-10` → `1E-10`.
  (Antes devolvia o `<v>` cru.)
- **Multi-seção** `pos;neg;zero;texto`: `#,##0;(#,##0)` com −5 → `(5)`;
  `0.0;-0.0;"--"` com 0 → `--`.
- **Cor do numFmt**: `[Red]` etc. é extraído e devolvido à parte (renderer pinta).
- **Científico** `0.00E+00` → `1,23E+04`; engenharia `##0.0E+0` → `12,3E+3`.
- **Frações** `# ?/?` (Stern-Brocot): `0,5` → ` 1/2`, `2,25` → `2 1/4`.
- **Contábil** `_-"R$"* #,##0.00_-;…`: `_` = espaço, `*` = preenchimento, seção.
- **Datas/hora**: tokens y/m/d/h/s, AM/PM, nomes pt-BR; **tempo decorrido**
  `[h]:mm` (1,5 → `36:00`); desambiguação mês×minuto.
- **Arredondamento** "metade p/ cima" do app de referência (`0,005` `0.00` → `0,01`),
  robusto a ruído binário (sem o bug do `toFixed`).

### 2. Renderização do grid (`packages/sheet/src/universal-sheet.ts`)
Verificado contra o app de referência no mesmo `samples/smoke.xlsx` (Range.Text + captura):

- **Transbordo de texto** para células vizinhas **vazias** (esq/dir/centro
  conforme alinhamento); bloqueia em vizinha ocupada — antes todo texto era
  recortado na própria célula.
- **`####`** quando um **número/data** não cabe na coluna (o app de referência nunca
  transborda número) — confirmado: B4/B7/B8 do smoke = `########` no app de referência.
- **Sublinhado e tachado** agora desenhados (estavam no modelo, nunca pintados).
- **Linhas de grade desenhadas ANTES** das células (ordem do app de referência): fills
  cobrem a grade sob a célula; texto transbordado passa por cima das vizinhas.
- **`showGridLines="0"`** respeitado (oculta a grade).
- **Cor do numFmt** ([Red] em negativos) tem prioridade sobre a cor da fonte.

### 3. Estilos e cores (`sheet-core/src/styles.ts`, `read.ts`)
- **`tint` de cor** aplicado (HSL): clareia/escurece tema/indexed/rgb — exato no
  eixo cinza (branco −25% → `#BFBFBF`, −15% → `#D9D9D9`, −5% → `#F2F2F2`, as
  faixas zebradas padrão). Antes o tint era ignorado (cor base "chapada").

### 4. Modelo / leitura (`sheet-core/src/read.ts`, `model.ts`)
- **`activeTab`** lido do lugar certo (`<bookViews><workbookView activeTab>`),
  não do root do `<workbook>`. E corrigido o bug `Math.min(0, …)` que **sempre
  abria a 1ª aba** → agora abre na aba ativa.
- **`date1904`** lido (`<workbookPr date1904>`) e propagado ao motor de datas
  (epoch +1462 dias) — antes datas de arquivos Mac vinham 4 anos+1 dia erradas.
- **Largura de coluna** aplicada mesmo **sem `customWidth`** (o app de referência aplica
  `width` sempre; `customWidth` só marca "ajuste manual" p/ o autofit).

## Pendências priorizadas (próxima fase)

Itens reais confirmados na revisão, fora do escopo já corrigido (renderer/leitura).
**Alta** prioridade primeiro:

| Sev | Área | Item | Nota |
|---|---|---|---|
| Alta | Render | **Painéis congelados** (`<pane>` é parseado, não renderizado) | exige viewport dividido (4 quadrantes) + offsets de scroll. |
| Alta | Render | **Rich text runs** (várias fontes numa célula) não desenhados | usar `SharedString.runs` por trecho. |
| Alta | Estilo | **Herança `cellStyleXfs`/`xfId`** e semântica dos `applyX` | `xf` herda do estilo nomeado quando `applyX=0`. |
| Alta | UX | **Seleção de intervalo** (Shift+clique/seta, arrasto) | modelo atual é 1 célula `{col,row}`. |
| Alta | UX | **Ctrl+Setas** (pula p/ borda de dados), **Ctrl+Home** (→A1) | |
| Alta | UX | **Clique no cabeçalho** seleciona coluna/linha inteira | |
| Média | Estilo | **`theme1.xml`** real (paleta está hardcoded) | tint já aplicado por cima. |
| Média | Geom | `sheetFormatPr` `defaultColWidth`/`defaultRowHeight`/`baseColWidth` | defaults hoje fixos 64px/20px. |
| Média | Render | Padrões de fill não-sólidos, `gradientFill`, `gray125` (fillId 1 não deve pintar) | |
| Média | UX | Seleção de célula mesclada seleciona o range todo; PageUp/Down por página visível (hoje 10 fixo) | |
| Média | Edição | Edição de célula (duplo-clique/digitar) — `onDblClick` é placeholder | fase de editor. |
| Baixa | Estilo | Paleta **indexed** legada (0–56) quase vazia | rara em arquivos atuais. |
| Baixa | Geom | Largura do cabeçalho de linha fixa (o app de referência cresce com nº de dígitos) | |

### Não-problema (verificado)
- `colWidthPx` — fórmula **correta** (oráculo: 8,43 ch → 48pt → 64px; 10 → 75px;
  18,71 → 136px). Finding "col-width-formula-wrong" foi **rejeitado** na verificação.

## Auditoria 2026-06-20 — `showcase.xlsx` (oráculo do usuário)

`samples/showcase.xlsx` agora é sincronizado com o arquivo do usuário em
`{User}\OneDrive\Documentos\showcase.xlsx` (29 614 bytes, 14 abas, **gerado
pelo COM real do Excel**). É o oráculo de fidelidade 1:1 dessa rodada.

| Aba | Conteúdo do oráculo | Status no Universal Sheet | Lacuna prioritária |
|---|---|---|---|
| Inicio | TOC com hyperlinks para outras abas | ✓ render OK, hyperlinks visíveis (clique → navegação ainda não) | — |
| TextoENumeros | Tipos / formatos numéricos / quebra de texto | ✓ `format.ts` cobre 77/77 |  |
| Datas | Formatos data/hora | ✓ via `formatValue` |  |
| Formatacao | Negrito, itálico, cor, preenchimento, alinhamento | ✓ via `styles.ts` |  |
| Bordas | Estilos de borda e grade | ✓ via `paintBorder` |  |
| Mesclar | Células mescladas horizontal e vertical | ✓ `merges` + `mergedAreas` |  |
| Formulas | SUM/AVERAGE/IF/VLOOKUP/COUNTIF | ✓ valores computados pelo Excel ficam em `<v>` — exibimos o resultado | engine de avaliação de fórmulas é tarefa futura |
| CondFormat | Escala de cor, data bar, regra de destaque | ✓ `colorScale` / `dataBar` / `cellIs` |  |
| Validacao | Dropdown de validação de dados | ✗ não desenha a seta dropdown na célula | parse `<dataValidations>` + seta UI |
| Tabela | Excel "Table" (ListObject) com banded rows + autoFilter | △ dados aparecem, **mas faltam bandas + seta autoFilter** | parse `xl/tables/table1.xml` + estilos `tableStyle` |
| Graficos | dados-fonte da chart + 3 charts (chart1/2/3) embutidos via `drawings1.xml` | ✗ chart não desenha | parse `drawings1.xml` + engine de chart compartilhada com Slides |
| Comentarios | 2 comentários (A1 e A3) com texto + autor | **✓ DESDE ESTA AUDITORIA**: triângulo vermelho aparece (1:1) | tooltip on hover ainda falta |
| Congelar | painel congelado (1 linha no topo) | △ parse do `<pane>` OK (verificado em teste), **viewport split ainda não renderiza** | viewport de 4 quadrantes + offsets de scroll separados |
| Ocultos | linhas/colunas ocultas + grupos (outline) | ✓ `hiddenRows`/`hiddenCols` aplicados |  |

### Entregue 2026-06-20 — Engine de chart compartilhada (commit pendente)

6. **`chart-engine.ts`** standalone (copiado em sheet-core + slides-core):
   - Parse de `<c:chartSpace>` → `ChartModel` (título, tipo, séries com nome/valores/cor,
     categorias). Suporta combo (multiplos `*Chart` blocks no mesmo `plotArea`).
   - Tipos cobertos: **barChart** (col), **lineChart**, **pieChart**, **doughnutChart**,
     **scatterChart**, **radarChart** + fallback "render em breve".
   - Cores explícitas em `<c:ser><c:spPr><a:solidFill><a:srgbClr>` (1:1 com PowerPoint);
     paleta de fallback Office padrão.
   - Render direto em `CanvasRenderingContext2D` dado um rect `(x,y,w,h)`.
7. **Parser de drawings1.xml**:
   - Sheet rels → drawing target → parse `<xdr:twoCellAnchor>` (from/to col,row +
     offsets EMU) → resolve `<c:chart r:id>` via `_rels` do próprio drawing.
   - Worksheet.charts = `DrawingChart[]` com anchor + chartXml cru.
   - `extMaxCol/extMaxRow` da view ampliam para caber a área dos charts no scroll.
8. **Render no `Graficos`** — 3 charts (bar/line/pie) aparecem na aba à direita
   da tabela `Mes/Vendas` com valores 100/250/180/320/290/410 corretos;
   coordenadas EMU→px usando `xs/ys` + 9525 EMU/px.
9. **+1 teste** (`aba Graficos lê 3 charts ancorados`): verifica âncoras
   coerentes (`from.col < to.col`), tipos `[bar-col, line, pie]` e ≥6 pontos
   da primeira série. Total Sheet: **97/97 verde**.

### Entregue 2026-06-20 — Edit mode (commit pendente)

5. **Edit mode 1:1 com Excel**:
   - **F2** / **Enter** / **double-click** sobre célula → input overlay com o
     valor atual (cursor no fim, Excel-style).
   - **Tipagem direta** com a célula selecionada (qualquer 1 char imprimível
     sem Ctrl/Alt/Meta) → entra em edição substituindo o conteúdo.
   - **Delete/Backspace** → limpa a célula.
   - **Enter** dentro do editor commita + desce uma linha; **Shift+Tab/Tab**
     commita + move coluna; **Esc** cancela.
   - **Barra de fórmulas**: Enter na fórmula bar do demo → `setActiveCellText`
     escreve na célula ativa.
   - **Mutação tipo-aware**: `=...` → fórmula (`Cell.formula`), número puro
     (aceita "," ou ".") → tipo `n` com `Cell.value`, resto → `inlineStr` com
     `Cell.inlineString`. Texto vazio remove a célula (semântica do Delete).
   - **Mescla-aware**: edição em qualquer célula coberta abre na ORIGEM da
     mescla (e o input ocupa o `cx × cy` da mescla inteira).
   - **maxRow/maxCol expandem** automaticamente quando se edita uma célula
     fora do range usado.
   - 4 testes de mutação no motor de `setCellValue`
     (`describe: Edição: motor de mutação do worksheet`).

### Entregue nesta auditoria (commit pendente)

1. **Indicador de comentário 1:1**: triângulo `#D7373F` de lado 5px (zoom 1) no
   canto superior direito de cada célula com comentário, exatamente como o
   Excel desenha. Verificado em `Comentarios` (A1 e A3) — screenshot @200% nos
   logs da sessão.
2. **Parser de comentários** (`sheet-core/read.ts → readComments`): resolve
   `xl/commentsN.xml` via `_rels` do sheet, devolve `Comment[]` com `ref`,
   `text` plano e `author` (índice resolvido). Modelado por
   `Worksheet.comments`.
3. **Correção de `XlsxPackage.resolveRelTarget`**: agora resolve targets `../`
   (parent dir nav). Sem isso, `xl/worksheets/_rels/sheetN.xml.rels` apontando
   para `../comments1.xml` não chegava em `xl/comments1.xml`.
4. **3 testes pinados em `showcase.xlsx`** (`roundtrip.test.ts`):
   - 14 abas com nomes exatos (rejeita qualquer regressão no `readWorkbook`).
   - 2 comentários em `Comentarios` com refs `[A1, A3]` + autor `Eric Kono`.
   - `Congelar` reporta `pane.xSplit + pane.ySplit > 0` (cobre o parse).

### Próximas lacunas priorizadas (com IDs de tasks da sessão)

- **#8** — drawings1.xml + charts (Graficos) + tables (Tabela). **Engine de chart compartilhada com Slides** (que tem charts em 4 slides do showcase animado).
- **#9** — frozen panes renderer + dropdown validação + tooltip do comment.
- **#10** — Edit mode (double-click célula → input → write back) — atende o "edição" explícito do goal.

## Como reproduzir

```bash
# regenerar o oráculo (precisa do app de referência instalado)
node tools/excel-lab/gen-oracle-xlsx.mjs
powershell -ExecutionPolicy Bypass -File tools/excel-lab/read-oracle-xlsx.ps1
# auditar o motor de formatação
npm run build --prefix packages/sheet-core && node tools/excel-lab/audit-format.mjs   # PASS 74 FAIL 0
# testes (inclui o pino do oráculo)
npm test --workspaces --if-present
# render headless dos comportamentos novos
node tools/excel-lab/gen-smoke-xlsx.mjs
node tools/dev-server.mjs &   # :8124
node tools/excel-lab/smoke-render.mjs   # → tools/excel-lab/results/smoke.png
```
