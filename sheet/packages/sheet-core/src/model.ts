/**
 * Modelo de dados que espelha o SpreadsheetML (OOXML) literalmente.
 *
 * Não há camada "bonita" de abstração — os tipos correspondem 1:1 aos
 * elementos de xl/workbook.xml, xl/worksheets/sheetN.xml, xl/sharedStrings.xml
 * e xl/styles.xml. Isso é o que garante compatibilidade (vide ARCHITECTURE.md).
 */

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
}

/** Regra de formatação condicional (subconjunto suportado). */
export interface ColorStop { type: string; value?: number; color: string; }
export interface CondRule {
  type: 'colorScale' | 'dataBar' | 'cellIs' | 'expression';
  priority: number;
  // colorScale
  stops?: ColorStop[];
  // dataBar
  barColor?: string;
  // cellIs
  operator?: string;
  formula?: string[];
  dxfId?: number;
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
 * Ancoragem de um drawing (chart/imagem) na grade da planilha, vinda de
 * `<xdr:twoCellAnchor>`. `from`/`to` definem o range de células com offsets em
 * EMU (914 400 EMU = 1 polegada).
 */
export interface DrawingAnchor {
  from: { col: number; row: number; colOff: number; rowOff: number };
  to: { col: number; row: number; colOff: number; rowOff: number };
}

/** Chart embutido com sua âncora e XML cru (parseado on-demand pela engine). */
export interface DrawingChart {
  anchor: DrawingAnchor;
  /** XML de `xl/charts/chartN.xml`. */
  chartXml: string;
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
  condFormats?: CondFormat[];
  /** Mapa top-left ref → range (conveniência para render). */
  mergedAreas?: Map<string, string>;
  /** Comentários da planilha (`xl/commentsN.xml`, ligado via `_rels`). */
  comments?: Comment[];
  /** Charts embutidos via `xl/drawings/drawingN.xml`. */
  charts?: DrawingChart[];
  /** Hyperlinks (<hyperlinks>) com targets externos resolvidos via rels. */
  hyperlinks?: Hyperlink[];
  /** Defaults de largura/altura do grid (<sheetFormatPr>). */
  sheetFormatPr?: SheetFormatPr;
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
