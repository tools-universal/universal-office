/**
 * Modelo de dados que espelha o SpreadsheetML (OOXML) literalmente.
 *
 * Não há camada "bonita" de abstração — os tipos correspondem 1:1 aos
 * elementos de xl/workbook.xml, xl/worksheets/sheetN.xml, xl/sharedStrings.xml
 * e xl/styles.xml. Isso é o que garante compatibilidade (vide ARCHITECTURE.md).
 */

import type { Dxf } from './styles.js';

/** Planilha referenciada em xl/workbook.xml. */
export interface SheetRef {
  name: string;
  sheetId: string;
  rId: string;
  state?: string; // visible | hidden | veryHidden
  /** Caminho resolvido dentro do pacote (ex.: "xl/worksheets/sheet1.xml"). */
  target?: string;
}

export interface Workbook {
  sheets: SheetRef[];
  /** Índice da aba ativa (atributo activeTab de <workbookView>), se presente. */
  activeTab?: number;
  /** Sistema de data 1904 (Mac legacy): desloca o epoch dos seriais em 1462 dias. */
  date1904?: boolean;
}

/**
 * Tipos de célula (atributo `t`). Ausente = "n" (número).
 *   b=bool, n=número, e=erro, s=sharedString (índice), str=string de fórmula,
 *   inlineStr=string inline, d=data.
 */
export type CellType = 'b' | 'n' | 'e' | 's' | 'str' | 'inlineStr' | 'd';

/**
 * Propriedades de fonte de um run rico (<rPr> parseado). Booleans explícitos:
 * `bold: false` significa `<b val="0"/>` (nega o negrito herdado da célula);
 * undefined = herda do estilo da célula.
 */
export interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Tamanho em pontos (<sz val>). */
  size?: number;
  /** #RRGGBB resolvido (rgb/theme+tint/indexed). */
  color?: string;
  /** Nome da fonte (<rFont val>). */
  font?: string;
  /** Sobrescrito/subscrito (<vertAlign val>). */
  vertAlign?: 'superscript' | 'subscript';
}

/** Run de texto rico dentro de um shared/inline string (<r><rPr/><t>). */
export interface RichRun {
  text: string;
  /** Props brutas (atributos do <rPr>, preservadas para round-trip futuro). */
  rPr?: Record<string, string>;
  /** Props parseadas do <rPr> (b/i/u/strike/sz/color/rFont). */
  props?: RunProps;
}

/** Entrada em xl/sharedStrings.xml (<si>) ou string inline (<is>). */
export interface SharedString {
  /** Texto plano (concatenado). Presente quando <si><t>...</t></si>. */
  text?: string;
  /** Runs quando texto rico: <si><r>...</r></si>. */
  runs?: RichRun[];
}

/** Célula — elemento <c>. */
export interface Cell {
  /** Referência A1 (atributo r), ex.: "A1", "BF42". */
  ref: string;
  /** Tipo (atributo t). Undefined = número (default do OOXML). */
  type?: CellType;
  /** Índice de estilo (atributo s) → cellXfs em styles.xml. */
  style?: number;
  /** Valor bruto do <v>. String numérica (n/d), índice (s), booleano (b). */
  value?: string;
  /** Fórmula <f> (texto, sem o "="). */
  formula?: string;
  /** String inline (t="inlineStr") — conteúdo de <is>. */
  inlineString?: SharedString;
}

/** Linha — elemento <row>. */
export interface Row {
  /** Número da linha (atributo r). */
  r: number;
  /** Spans de colunas com dados (ex.: "1:1", "3:12"). */
  spans?: string;
  /** Altura em pontos (atributo ht). */
  height?: number;
  /** customHeight=true indica altura definida manualmente. */
  customHeight?: boolean;
  /** hidden=true. */
  hidden?: boolean;
  /** Estilo de linha (atributo s) — aplica a células sem estilo próprio. */
  style?: number;
  /** customFormat=1: o estilo `s` vale para as células AUSENTES da linha (sem ele o Excel ignora `s` — medido). */
  customFormat?: boolean;
  /** thickTop/thickBot: borda grossa em cima/embaixo — o auto-ajuste do Excel soma 1 px cada (medido). */
  thickTop?: boolean;
  thickBot?: boolean;
  cells: Cell[];
}

/** Definição de largura/oculto de um intervalo de colunas (<col>). */
export interface ColDef {
  min: number;
  max: number;
  /** Largura em unidades de caractere da fonte Normal. */
  width?: number;
  customWidth?: boolean;
  hidden?: boolean;
  /** Estilo de coluna (atributo s) — índice em cellXfs. */
  style?: number;
}

/** Painel congelado (<pane> dentro de <sheetView>). */
export interface PaneInfo {
  /** Colunas congeladas à esquerda. */
  xSplit: number;
  /** Linhas congeladas no topo. */
  ySplit: number;
  topLeftCell?: string;
  state: string; // frozen | frozenSplit | split
}

/**
 * Hyperlink de célula (<hyperlinks><hyperlink>). Externo: `target` resolvido
 * via rels (URL completa). Interno: `location` no formato "Planilha2!A1".
 */
export interface Hyperlink {
  /** Ref A1 (pode ser range, ex.: "A1:B2"). */
  ref: string;
  /** URL externa (rels TargetMode=External). */
  target?: string;
  /** Destino interno ("Aba!A1") — presente também em externos com âncora. */
  location?: string;
  display?: string;
  tooltip?: string;
}

/** Defaults do grid (<sheetFormatPr>). */
export interface SheetFormatPr {
  /** Largura default em unidades de caractere (defaultColWidth). */
  defaultColWidth?: number;
  /** Base p/ derivar largura quando defaultColWidth ausente (baseColWidth). */
  baseColWidth?: number;
  /** Altura default de linha em pontos (defaultRowHeight). */
  defaultRowHeight?: number;
  /** customHeight=1: alturas não são auto-ajustadas. */
  customHeight?: boolean;
  /** zeroHeight=1: linhas sem `<row>` próprio ficam ocultas. */
  zeroHeight?: boolean;
}

/**
 * Ponto de controle (<cfvo>) de escala de cor / barra de dados / ícones:
 * min | max | num | percent | percentile | formula (x14: autoMin | autoMax).
 * `val` cru (número ou fórmula); `value` = número quando é constante.
 */
export interface ColorStop { type: string; value?: number; val?: string; color: string; }
export interface Cfvo { type: string; val?: string; value?: number; /** ícones: limite ≥ (default) ou > */ gte?: boolean; }
export type CondRuleType =
  | 'colorScale' | 'dataBar' | 'iconSet' | 'cellIs' | 'expression'
  | 'top10' | 'aboveAverage' | 'duplicateValues' | 'uniqueValues'
  | 'containsText' | 'notContainsText' | 'beginsWith' | 'endsWith'
  | 'containsBlanks' | 'notContainsBlanks' | 'containsErrors' | 'notContainsErrors' | 'timePeriod';
export interface CondRule {
  type: CondRuleType;
  priority: number;
  stopIfTrue?: boolean;
  // colorScale
  stops?: ColorStop[];
  // dataBar
  barColor?: string;
  /** Comprimentos min/max da barra em % (x14 quando presente; clássico 10/90). */
  barMinLen?: number;
  barMaxLen?: number;
  /** Borda da barra (x14 border="1"; default sem borda). */
  barBorder?: boolean;
  /** x14: barra em degradê (default) ou sólida. */
  barGradient?: boolean;
  barBorderColor?: string;
  barNegColor?: string;
  barNegBorderColor?: string;
  /** x14 negativeBarColorSameAsPositive / negativeBarBorderColorSameAsPositive. */
  barNegSame?: boolean;
  barNegBorderSame?: boolean;
  /** x14 axisPosition: automatic (default) | middle | none. */
  barAxis?: string;
  barAxisColor?: string;
  /** x14 direction: context | leftToRight | rightToLeft. */
  barDirection?: string;
  /** Pontos min/max (barra) ou limites (ícones). */
  cfvos?: Cfvo[];
  /** showValue="0": esconde o valor (barra/ícones). */
  showValue?: boolean;
  /** Marca a regra como de Excel 2010+ (definição x14 presente). */
  x14?: boolean;
  /** Id que liga o cfRule clássico à definição x14 no extLst da worksheet. */
  x14Id?: string;
  // iconSet
  iconSet?: string;
  iconReverse?: boolean;
  /** Ícones avulsos (x14 custom): conjunto + índice por limite. */
  icons?: { set: string; id: number }[];
  // cellIs / expression / texto / top10 / média / período
  operator?: string;
  formula?: string[];
  dxfId?: number;
  /** dxf embutido (regras x14 — <x14:dxf>). */
  dxf?: Dxf;
  text?: string;
  timePeriod?: string;
  rank?: number;
  percent?: boolean;
  bottom?: boolean;
  /** aboveAverage="0" → abaixo da média (default true). */
  aboveAverage?: boolean;
  equalAverage?: boolean;
  stdDev?: number;
}
export interface CondFormat { sqref: string; rules: CondRule[]; }

/** Comentário/anotação (xl/commentsN.xml). */
export interface Comment {
  /** Ref A1 da célula que possui o comentário. */
  ref: string;
  /** Texto plano (concat dos runs). */
  text: string;
  /** Índice em <authors> (resolvido). */
  author?: string;
}

/**
 * Ancoragem de um drawing (chart/imagem/forma) na grade da planilha. Default
 * `<xdr:twoCellAnchor>`: `from`/`to` definem o range de células (col/row
 * 0-based) com offsets em EMU (914 400 EMU = 1 polegada). `oneCellAnchor`:
 * `from` + `ext`; `absoluteAnchor`: `pos` + `ext` (aí `from`/`to` = origem).
 */
export interface DrawingAnchor {
  from: { col: number; row: number; colOff: number; rowOff: number };
  to: { col: number; row: number; colOff: number; rowOff: number };
  /** Âncora de UMA célula (`oneCellAnchor`) ou absoluta (`absoluteAnchor`); ausente = duas células. */
  kind?: 'oneCell' | 'absolute';
  /** `editAs` do twoCellAnchor (twoCell|oneCell|absolute): só o comportamento na edição. */
  editAs?: string;
  /** Tamanho em EMU (`<xdr:ext cx cy>`) das âncoras oneCell/absolute. */
  ext?: { cx: number; cy: number };
  /** Posição em EMU (`<xdr:pos x y>`) da âncora absoluta. */
  pos?: { x: number; y: number };
}

/** Chart embutido com sua âncora e XML cru (parseado on-demand pela engine). */
export interface DrawingChart {
  anchor: DrawingAnchor;
  /** XML de `xl/charts/chartN.xml`. */
  chartXml: string;
  /** Posição na ordem do desenho (z-order, contando os demais objetos). */
  order?: number;
}

/**
 * Objeto de desenho que não é gráfico: imagem (`xdr:pic`), forma/caixa de
 * texto (`xdr:sp`), conector (`xdr:cxnSp`), grupo (`xdr:grpSp`) ou quadro
 * (`xdr:graphicFrame`, ex.: SmartArt). O elemento DrawingML fica cru — o
 * componente o lê com o leitor de formas compartilhado com o Slides.
 */
export interface DrawingObject {
  anchor: DrawingAnchor;
  /** Posição na ordem do desenho (z-order, contando os gráficos). */
  order: number;
  /** Elemento `xdr:*` do objeto (prefixo normalizado para `xdr:`). */
  el: import('./xml.js').XmlElement;
  /** Parte do desenho (`xl/drawings/drawingN.xml`): as imagens resolvem pelos rels dela. */
  part: string;
  /**
   * Controle de formulário (`<controls>` + `ctrlPropN.xml`): `type` =
   * objectType (CheckBox, Radio, Button, GBox, Label…), `checked` = Checked|Mixed.
   * O elemento é a forma do rótulo; o controle em si o componente desenha.
   */
  control?: { type: string; checked?: string };
}

/**
 * Tabela (ListObject, `xl/tables/tableN.xml`). Os ESTILOS built-in
 * (TableStyleMedium2 etc.) não são gravados no pacote — o app de referência os
 * conhece por nome; o renderer replica a família Medium parametrizada por accent.
 */
export interface TableInfo {
  /** Range A1 da tabela inteira (inclui header/totals). */
  ref: string;
  /** headerRowCount != 0 (default 1). */
  headerRow: boolean;
  /** totalsRowCount == 1. */
  totalsRow: boolean;
  /** `<tableStyleInfo showRowStripes="1">`. */
  stripes: boolean;
  /** Nome do estilo (ex.: TableStyleMedium2). */
  styleName?: string;
  /** `<autoFilter>` presente (setas de filtro no header). */
  autoFilter: boolean;
  /** `<tableStyleInfo>`: faixas de coluna, primeira/última coluna destacadas. */
  colStripes?: boolean;
  firstColumn?: boolean;
  lastColumn?: boolean;
  /** Detalhes do autofiltro (botões ocultos / colunas filtradas). */
  filter?: AutoFilterInfo;
  /** tableBorderDxfId: contorno da tabela (o Excel o desenha; os dxf de cabeçalho/dados/total não). */
  borderDxfId?: number;
}

/** Item de linha/coluna de tabela dinâmica (`<rowItems><i t r><x/>…</i>`). */
export interface PivotItem {
  /** default/sum/…/grand/blank (ausente = item de dado). */
  t?: string;
  /** Quantos índices repetem o item anterior (nível do item). */
  r: number;
  /** Quantidade de <x> (índices próprios). */
  x: number;
}

/** Tabela dinâmica (`xl/pivotTables/pivotTableN.xml`) — só o necessário à pintura. */
export interface PivotInfo {
  /** `<location ref>`: range já calculado (sem os campos de página). */
  ref: string;
  firstHeaderRow: number;
  firstDataRow: number;
  firstDataCol: number;
  rowPageCount: number;
  colPageCount: number;
  pageFieldCount: number;
  /** Botão de filtro do campo de página mostra funil (item escolhido/itens ocultos). */
  pageFieldActive?: boolean[];
  rowFields: number[];
  colFields: number[];
  rowItems: PivotItem[];
  colItems: PivotItem[];
  compact: boolean;
  outline: boolean;
  showHeaders: boolean;
  rowGrandTotals: boolean;
  colGrandTotals: boolean;
  /** `<pivotTableStyleInfo>` (nome ausente/vazio = sem estilo). */
  styleName?: string;
  showRowHeaders: boolean;
  showColHeaders: boolean;
  showRowStripes: boolean;
  showColStripes: boolean;
  showLastColumn: boolean;
  /** Campos (índice em pivotFields) com filtro ativo. */
  filteredFields?: number[];
}

/**
 * Autofiltro (`<autoFilter ref>` da tabela ou da planilha): o Excel desenha um
 * botão em cada célula da 1ª linha do range, exceto `hiddenButton`; coluna
 * com critério ativo mostra o ícone de funil.
 */
export interface AutoFilterInfo {
  ref: string;
  /** Deslocamentos (0 = 1ª coluna do range) com botão oculto. */
  hidden?: number[];
  /** Deslocamentos com filtro/ordenação ativos. */
  active?: number[];
}

/** Planilha — conteúdo de xl/worksheets/sheetN.xml. */
export interface Worksheet {
  rows: Row[];
  /** Merges: lista de ranges A1 ("A1:B3"). */
  merges?: string[];
  cols?: ColDef[];
  pane?: PaneInfo;
  /** `<sheetView showGridLines="0">` → false (oculta linhas de grade). */
  showGridLines?: boolean;
  /** `<sheetView showZeros="0">` → false: valores zero são exibidos vazios. */
  showZeros?: boolean;
  /** `<sheetView rightToLeft="1">` → true: colunas da direita para a esquerda. */
  rightToLeft?: boolean;
  /**
   * Faixas (A1, "A1:B3") com o indicador "número armazenado como texto"
   * desligado (`<ignoredErrors><ignoredError numberStoredAsText="1">`).
   */
  ignoreNumberAsText?: string[];
  condFormats?: CondFormat[];
  /** Mapa top-left ref → range (conveniência para render). */
  mergedAreas?: Map<string, string>;
  /** Comentários da planilha (`xl/commentsN.xml`, ligado via `_rels`). */
  comments?: Comment[];
  /** Charts embutidos via `xl/drawings/drawingN.xml`. */
  charts?: DrawingChart[];
  /** Imagens/formas/grupos do mesmo desenho (intercalados com os charts por `order`). */
  drawings?: DrawingObject[];
  /** Hyperlinks (<hyperlinks>) com targets externos resolvidos via rels. */
  hyperlinks?: Hyperlink[];
  /** Defaults de largura/altura do grid (<sheetFormatPr>). */
  sheetFormatPr?: SheetFormatPr;
  /** Tabelas (ListObjects) ligadas via `<tableParts>`. */
  tables?: TableInfo[];
  /** Autofiltro da PLANILHA (`<autoFilter>` fora de tabela). */
  autoFilter?: AutoFilterInfo;
  /** Tabelas dinâmicas desta aba (rels `/pivotTable`). */
  pivots?: PivotInfo[];
  /** Ranges A1 com validação tipo LISTA (`<dataValidation type="list" sqref>`) —
   *  a célula selecionada dentro deles ganha a seta de dropdown. */
  listValidations?: string[];
}

// ---- Helpers de referência A1 (matemática determinística) ----

const COL_RE = /([A-Z]+)(\d+)/;

/** "A1" → { col: 1 (1-based), row: 1 (1-based) }. */
export function refToRowCol(ref: string): { col: number; row: number } {
  const m = COL_RE.exec(ref);
  if (!m) throw new Error(`Referência de célula inválida: ${ref}`);
  const col = m[1]!.split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
  return { col, row: parseInt(m[2]!, 10) };
}

/** { col: 1, row: 1 } → "A1". */
export function rowColToRef(col: number, row: number): string {
  let c = col;
  let letters = '';
  while (c > 0) {
    const rem = (c - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    c = Math.floor((c - 1) / 26);
  }
  return `${letters}${row}`;
}
