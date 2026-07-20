# Regras observadas do Excel (via experimentos)

Cada regra cita o experimento que a evidencia. Estas regras são a especificação
de comportamento que o editor deve replicar. Excel 16.0 pt-BR.

## Modelo estrutural

- Nome padrão da primeira planilha é LOCALIZADO: pt-BR "Planilha1"
  (`<sheet name="Planilha1" sheetId="1" r:id="rId1"/>`) — não "Sheet1" [001].
- `workbook.xml` referencia sheets por `r:id` → `xl/_rels/workbook.xml.rels`
  mapeia para `worksheets/sheetN.xml`. Relacionamentos na ordem: rId1
  (worksheet), rId2 (theme), rId3 (styles), rId4 (sharedStrings) [001].
- Ruído de save: `xr:revisionPtr@documentId` (GUID) e o GUID de
  `workbookView@xr2:uid` mudam entre saves — não são determinísticos [001].
  Nosso round-trip lossless ignora isso (preserva bytes; não regenera
  workbook.xml). BOM: `sharedStrings.xml` é gravado COM BOM UTF-8; os demais
  parts do template sem BOM [001].

## Células e valores

- Setar uma string numa planilha vazia **cria** `xl/sharedStrings.xml` (arquivo
  novo), adiciona `<Override>` em `[Content_Types].xml` e o relationship
  `rId4`→`sharedStrings.xml` em `xl/_rels/workbook.xml.rels` [001].
- String vira `<c r="A1" t="s"><v>0</v></c>`: `t="s"` = tipo shared string,
  `<v>` = índice (0-based) em `sharedStrings.xml` [001].
- `sharedStrings.xml`: `<sst count="N" uniqueCount="U"><si><t>texto</t></si>…`;
  `count` = total de referências, `uniqueCount` = entradas únicas [001].
- Linha: `<row r="1" spans="1:1" ...>` — `spans` = primeira:última coluna com
  dados na linha. `x14ac:dyDescent="0.25"` em todo row/sheetFormatPr [001].
- **Número** (ex.: 42): `<c r="A1"><v>42</v></c>` — **sem atributo `t`**
  (default = `n`), valor direto em `<v>`, NÃO cria sharedStrings.xml [002].
- **Fórmula** (ex.: =1+2): `<c r="A1"><f>1+2</f><v>3</v></c>` — `<f>` guarda a
  fórmula **sem o "="**, `<v>` guarda o valor em cache calculado [003].
- Tipos restantes a confirmar: `b`/`e`/`str`/`inlineStr`/`d`.

## Showcase de recursos (samples/showcase.xlsx)

Gerado via COM com TODOS os recursos (exceto macros) para servir de oráculo de
renderização. Estruturas confirmadas no XML:

### Geometria
- **Largura de coluna**: `<cols><col min max width="18.71" customWidth="1"/></cols>`
  — `width` em **unidades de caractere** da fonte Normal. Aprox px@96dpi =
  `round(width*7+5)` (MaxDigitWidth≈7). Ocultas: `hidden="1"`.
- **Altura de linha**: `<row ht="34" customHeight="1"/>` — `ht` em **pontos**
  (×96/72 → px). Ocultas: `hidden="1"`.
- **Congelar**: `<sheetView><pane xSplit="1" ySplit="1" topLeftCell="B2"
  state="frozen"/></sheetView>` — xSplit=cols à esquerda, ySplit=linhas no topo.

### Mesclas, bordas, cores
- **Mesclar**: `<mergeCells><mergeCell ref="A1:D1"/><mergeCell ref="A3:B4"/>
  </mergeCells>`. A origem (top-left) guarda valor/estilo; as cobertas têm só `s`.
- **Bordas** (styles.xml): `<border><left style="thin"><color indexed="64"/>
  </left>...</border>`. styles: thin/thick/medium/dashed/dotted/double.
- **Cores** vêm como `rgb="FFC00000"` (FF=alpha+RGB), `theme="1"` (dk1=preto é
  o default da fonte), `indexed="64"` (auto=preto). Paleta tema padrão Office
  mapeada; theme1.xml completo é trabalho futuro.

### Formatação numérica / datas
- numFmt custom em `<numFmt numFmtId="164" formatCode="..."/>` + built-ins (14=
  data etc.). **Atenção: formatCode é dependente de locale** quando gravado via
  COM num sistema pt-BR (ex.: `"R$"\ #.##000`, datas com `\y` escapado). Em
  formatos portáteis, `\x` = literal; Excel trata `\`+letra-de-data como token.
- Tokens de data: y/yy/yyyy, m/mm/mmm/mmmm (mês; vira **minuto** após h), d/dd/
  ddd/dddd, h/hh, s, AM/PM.

### Fórmulas (renderiza o valor em cache)
- `<c><f>SUM(B2:B5)</f><v>46</v></c>` — `<f>` sem "=", `<v>` = cache calculado.
- String de fórmula: `t="str"` + `<v>texto</v>`. Ref externa: `<f>Planilha!B3</f>`.

### Formatação condicional
- Color scale: `<cfRule type="colorScale"><colorScale><cfvo type="min"/><cfvo
  type="percentile" val="50"/><cfvo type="max"/><color/>...</colorScale></cfRule>`
- Data bar: `type="dataBar"` com `<dataBar><color/></dataBar>`.
- Highlight (cellIs): `type="cellIs" operator="greaterThan" dxfId="0"` + `<dxfs>`
  (`<dxf><fill><patternFill><bgColor rgb="..."/></patternFill></fill></dxf>`).

### Outros (parseados/preservados, render futuro)
- **Tabela** (ListObject): `xl/tables/tableN.xml` + `<tableParts r:id>` na aba.
- **Gráficos**: `xl/drawings/drawingN.xml` (âncora) + `xl/charts/chartN.xml`.
- **Validação**: `<dataValidations><dataValidation type="list" .../></dataValidations>`.
- **Comentários**: `xl/commentsN.xml` (texto) + `<legacyDrawing>` (âncoras).
- **Hyperlinks**: `<hyperlinks><hyperlink ref location display/></hyperlinks>`.
- **calcChain.xml**: ordem de cálculo (ignorado — usamos o cache).

## Estilos e formatação

- **Fonte Normal padrão = "Aptos Narrow" 11pt** (`<name val="Aptos Narrow"/>`,
  `<sz val="11"/>`, color theme="1"), scheme "minor" — mesma família Aptos do
  Word, mas variante Narrow. Essa fonte define a unidade de largura de coluna
  [004].
- Formatação (ex.: negrito) **anexa** registros, nunca reordena: append de um
  `<font>` com `<b/>` em `fonts` → append de `<xf fontId="1" applyFont="1">` em
  `cellXfs` → a célula ganha `s="1"` (índice do novo cellXfs). Os cellXfs
  pré-existentes (índice 0 = Normal) são imutáveis [004].
- `cellXf` referenciado pela célula: `<xf numFmtId fontId fillId borderId xfId
  applyFont/applyBorder/.../>` [004].
- Ruído de save: `dcterms:modified` (core.xml) e `xr:revisionPtr@documentId`
  (workbook.xml) mudam a cada save — não determinísticos. BOM: `styles.xml` e
  `sharedStrings.xml` gravados COM BOM UTF-8; demais parts do template sem
  BOM. Round-trip lossless ignora o ruído (preserva bytes; não regenera) [001,004].

## Layout de grid (a validar contra oráculo numérico)

- Largura de coluna em **unidades de caractere da fonte Normal** (Calibre/Aptos
  11), não pixels. `Range.ColumnWidth` ↔ `c:col width` em `sheetFormatPr`.
- Altura de linha em **pontos** (`c:row ht`). `Range.RowHeight`.
- Autofit, células mescladas (`c:mergeCell`), panes congeladas (`c:pane`).

## Pixel-fidelidade (harness: excel-screenshot.ps1 + capture-ours.mjs + pixel-compare-green.mjs)

Pipeline de paridade visual (oráculo: Excel real via COM):
- **Excel → PNG**: `CopyPicture(xlScreen, xlBitmap)` do UsedRange captura a
  renderização de TELA (escala correta). Rodar em STA (`powershell -STA`) p/ clipboard.
- **Nosso → PNG**: Playwright headless screenshot do canvas, crop dos cabeçalhos
  (`getUsedRangeRect()`), `capture=true` suprime a seleção (CopyPicture não a inclui).
- **Compare**: `pixel-compare-green.mjs` — **canal VERDE**. Motivo: CopyPicture
  captura ClearType; só R/B têm fringes subpixel, o **G é grayscale limpo** (resolução
  nativa). Comparar G(excel) vs luminância(ours) remove o ruído ClearType.

### Armadilhas descobertas (cada uma corrigida)
- **Print ≠ tela**: `ExportAsFixedFormat`/xlPrinter escala ~8% e posiciona texto
  diferente (padding de impressão). **Não comparar** com renderer de tela. Usar xlScreen.
- **Fonte Normal "Aptos Narrow" não está no disco** — extraída via Word embed
  (`extract-aptos-narrow.ps1`: docx com `EmbedTrueTypeFonts` sem subset → `.odttf`
  → deobfusca por `w:fontKey`). 4 variantes, ~240KB cada (Latin completo).
- **Tamanho de fonte é em PONTOS**: `sz val="11"` = 11pt = 14.67px@96dpi (NÃO 11px!).
  Era o bug de maior impacto — texto 25% menor que o Excel.
- **Largura de coluna**: fórmula correta `floor((256*w+18)/256*7)` com MDW=7 (Aptos
  Narrow). `w*7+5` superestimava ~5px/coluna.
- **Altura de linha**: `ht` é a altura real MESMO sem `customHeight` (auto-fit de
  wrap). Aplicar sempre que `ht` presente.
- **Alinhamento General**: números/datas (tipo numérico) à DIREITA, texto à esquerda
  — basear no tipo da célula, não na string formatada (datas formatadas têm "/").
- **Built-ins de data/hora**: numFmtId 14-22, 45-49 etc. faltavam → célula caía no
  serial cru (ex.: "46190.6"). Mapa completo em `BUILTIN_FMTS`.
- **formatCode é locale-dependente** quando gerado via COM pt-BR: datas vêm com `\y`
  escapado (Excel renderiza LITERAL "yyyy"). `\x` = literal sempre (Excel tb).

## Oráculo de formatação numérica/data (oracle-format.json — 74 casos, pt-BR)

Capturado escrevendo formatCodes **canônicos OOXML** num `.xlsx` e lendo
`Range.Text` no Excel real (gen-oracle-xlsx.mjs + read-oracle-xlsx.ps1). Regras
fixadas no motor `sheet-core/src/format.ts` (format.test.ts):

- **Locale pt-BR de exibição**: decimal `,`, milhar `.`. `#,##0.00` em
  `1234567.89` → `1.234.567,89`. General `3.14159` → `3,14159`.
- **General cabe em ~11 caracteres** (parte numérica, sinal não conta); estoura
  p/ científico: `123456789012` → `1,23457E+11`; `999999999999` → `1E+12`;
  `0.6666…` → `0,666666667` (11 chars); `1e-10` → `1E-10` (decimal teria 12 chars);
  `100000000` (9 díg) fica inteiro. Mantissa científica trima zeros à direita.
- **Seções `;`**: 1=pos(+sinal auto p/ neg), 2=neg(abs, sinal do template),
  3=zero, 4=texto(`@`). `#,##0;(#,##0)` com −5 → `(5)`. `"pos";"neg";"zero"` com
  0 → `zero`. Seção só-literal não injeta número.
- **`%`** escala ×100 E é literal: `0.00%` 0.1234 → `12,34%`.
- **Arredondamento** metade-p/-cima: `0,005` `0.00` → `0,01`; `0,004` → `0,00`.
- **Científico**: `0.00E+00` → `1,23E+04` (expoente mín. 2 díg); engenharia
  `##0.0E+0` alinha o expoente a múltiplo do nº de díg. inteiros → `12,3E+3`.
- **Frações** (Stern-Brocot, den ≤ 10^(nº `?`)−1): `# ?/?` 0,5 → ` 1/2`,
  2,25 → `2 1/4`; `# ??/??` 0,333 → `1/3` (com padding de `?`).
- **Datas** (read-oracle confirma com tokens canônicos): `m/d/yyyy` → `6/30/2025`,
  `dddd` → `segunda-feira`, `mmmm` → `junho`, `mmm`/`ddd` minúsculos. `[h]:mm`
  (decorrido) 1,5 → `36:00`. `m` é minuto após `h`/antes de `s`, senão mês.
- **`@` em célula numérica** = valor como texto (General): 42 `@` → `42`.
- **`####`** (largura): NÚMERO/DATA que não cabe vira `#`+; TEXTO transborda p/
  vizinhas vazias. Confirmado no smoke.xlsx (B4/B7/B8 = `########` no Excel).
- **`date1904`** (`<workbookPr date1904>`): seriais de calendário deslocam +1462.
- **`activeTab`** vive em `<bookViews><workbookView activeTab>` (não no root).
- **`tint`** de cor (HSL): branco −25% → `#BFBFBF`, −15% → `#D9D9D9`, −5% →
  `#F2F2F2` (faixas zebradas). tint<0 → L·(1+tint); tint>0 → L·(1−tint)+tint.

### Estado atual (aba Datas, showcase.xlsx)
- Conteúdo: **idêntico célula-a-célula** ao Excel (auditado via Range.Text).
- Dimensões: **exatas** (305×141 vs 304×140).
- Diferença estrutural restante (~59% canal G): AA fino Chrome×GDI + offset ~1-2px
  no texto — exige calibração empírica de advances (como WordNext fez com fontes).
