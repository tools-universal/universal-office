/**
 * Base compartilhada pelos exportadores: carregamento do modelo (bytes .xlsx ou
 * modelo já lido), seleção de planilhas, grade densa com valores FORMATADOS
 * (formatValue + PT_BR — fidelidade pt-BR é o alvo) e a métrica de largura de
 * coluna MDW (a mesma do componente <universal-sheet>).
 *
 * Este módulo é PURO: sem fs/path/DOM. Entrada Uint8Array/modelo, saída dados.
 */
import {
  XlsxPackage, openSpreadsheet, readWorkbook, readWorksheet, readSharedStrings, readStyles, colorContext,
  refToRowCol, formatValue, builtinFormatCode, PT_BR,
  type Workbook, type Worksheet, type Styles, type SharedString, type Cell,
  type SheetRef, type FormatLocale, type Fill,
} from '@universal/sheet-core';

/** Modelo já lido (alternativa aos bytes crus como entrada). */
export interface SheetModel {
  pkg: XlsxPackage;
  workbook: Workbook;
  styles: Styles;
  sharedStrings: SharedString[];
}

/** Entrada de todo exportador: bytes do .xlsx OU modelo já carregado. */
export type SheetExportInput = Uint8Array | SheetModel;

export interface SheetExportOptions {
  /** Índice (0-based) ou nome da planilha. Default: todas (md/html/pdf) / ativa (csv/tsv). */
  sheet?: number | string;
  /** Locale de exibição dos valores. Default PT_BR (alvo de fidelidade). */
  locale?: FormatLocale;
}

/** Carrega o modelo a partir de bytes .xlsx/.xls (ou devolve o modelo já lido). */
export function loadModel(input: SheetExportInput): SheetModel {
  if (input instanceof Uint8Array) {
    const pkg = openSpreadsheet(input);
    const cx = colorContext(pkg);
    return {
      pkg,
      workbook: readWorkbook(pkg),
      styles: readStyles(pkg, cx),
      sharedStrings: readSharedStrings(pkg, cx),
    };
  }
  return input;
}

export interface SelectedSheet {
  name: string;
  ws: Worksheet;
}

/**
 * Resolve quais planilhas exportar. `sheet` explícito (índice/nome) sempre vale;
 * sem ele, `defaultScope` decide: 'active' = aba ativa (csv/tsv), 'all' = todas
 * as visíveis (md/html/pdf) — abas hidden/veryHidden ficam de fora do "todas".
 */
export function selectSheets(
  model: SheetModel,
  sheet: number | string | undefined,
  defaultScope: 'active' | 'all',
): SelectedSheet[] {
  const { workbook, pkg } = model;
  const cx = colorContext(pkg);
  const readOne = (ref: SheetRef): SelectedSheet => {
    if (!ref.target) throw new Error(`Planilha "${ref.name}" sem parte resolvida no pacote`);
    return { name: ref.name, ws: readWorksheet(pkg, ref.target, cx) };
  };
  if (sheet !== undefined) {
    const ref = typeof sheet === 'number'
      ? workbook.sheets[sheet]
      : workbook.sheets.find((s) => s.name === sheet);
    if (!ref) {
      throw new Error(typeof sheet === 'number'
        ? `Índice de planilha fora do intervalo: ${sheet} (0..${workbook.sheets.length - 1})`
        : `Planilha não encontrada: "${sheet}"`);
    }
    return [readOne(ref)];
  }
  if (workbook.sheets.length === 0) throw new Error('Pasta de trabalho sem planilhas');
  if (defaultScope === 'active') {
    const ref = workbook.sheets[workbook.activeTab ?? 0] ?? workbook.sheets[0]!;
    return [readOne(ref)];
  }
  const visible = workbook.sheets.filter((s) => s.state === undefined || s.state === 'visible');
  return (visible.length ? visible : workbook.sheets).map(readOne);
}

// ──────────────────────── Valor exibido ────────────────────────

export interface DisplayValue {
  /** Texto exibido (formatValue, localizado). */
  text: string;
  /** Cor pedida pelo numFmt (ex.: `[Red]` em negativos), #RRGGBB. */
  color?: string;
  /** Valor subjacente é numérico (número/data) — General alinha à direita. */
  numeric: boolean;
}

/**
 * Texto exibido de uma célula — espelha o renderer do componente, com as regras
 * de export: boolean → VERDADEIRO/FALSO (pt-BR), erro → literal do cache `<v>`,
 * fórmula → valor cacheado `<v>` formatado.
 */
export function displayValue(cell: Cell, model: SheetModel, loc: FormatLocale): DisplayValue {
  if (cell.type === 's' && cell.value !== undefined) {
    return { text: model.sharedStrings[parseInt(cell.value, 10)]?.text ?? '', numeric: false };
  }
  if (cell.type === 'inlineStr') return { text: cell.inlineString?.text ?? '', numeric: false };
  if (cell.type === 'b') return { text: cell.value === '1' ? 'VERDADEIRO' : 'FALSO', numeric: false };
  if (cell.type === 'e') return { text: cell.value ?? '', numeric: false };
  if (cell.value === undefined) return { text: '', numeric: false };
  if (cell.type === 'str') return { text: cell.value, numeric: false }; // string de fórmula = texto cru
  const n = parseFloat(cell.value);
  if (Number.isNaN(n)) return { text: cell.value, numeric: false };
  // numérico/data: aplica o formatCode via motor fiel ao oráculo (sheet-core)
  const xf = model.styles.cellXfs[cell.style ?? 0];
  const numFmtId = xf?.numFmtId ?? 0;
  const code = model.styles.numFmts.get(numFmtId) ?? builtinFormatCode(numFmtId, loc) ?? 'General';
  const r = formatValue(n, code, { locale: loc, date1904: model.workbook.date1904 });
  return { text: r.text, color: r.color, numeric: true };
}

// ──────────────────────── Grade densa ────────────────────────

export interface GridCell extends DisplayValue {
  /** Índice em styles.cellXfs (atributo `s` da célula), se houver. */
  xf?: number;
}

/** Área mesclada, 1-based inclusiva. */
export interface GridMerge {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export interface SheetGrid {
  name: string;
  ws: Worksheet;
  /** Última linha/coluna usada (1-based). 0 = planilha vazia. */
  rowCount: number;
  colCount: number;
  /** cells[r-1][c-1] — undefined = célula ausente (grade esparsa densificada). */
  cells: (GridCell | undefined)[][];
  merges: GridMerge[];
  /** Merge que cobre (r,c) 1-based, se houver. */
  mergeAt(r: number, c: number): GridMerge | undefined;
}

/**
 * Densifica a planilha: linhas puladas viram linhas vazias até a última linha
 * usada; colunas até a última coluna usada. Merges estendem a área usada.
 */
export function buildGrid(model: SheetModel, sel: SelectedSheet, loc: FormatLocale): SheetGrid {
  const { ws, name } = sel;
  let rowCount = 0;
  let colCount = 0;
  for (const row of ws.rows) {
    if (row.cells.length === 0) continue;
    if (row.r > rowCount) rowCount = row.r;
    for (const c of row.cells) {
      const { col } = refToRowCol(c.ref);
      if (col > colCount) colCount = col;
    }
  }
  const merges: GridMerge[] = [];
  for (const m of ws.merges ?? []) {
    const [a, b] = m.split(':');
    if (!a) continue;
    try {
      const s = refToRowCol(a);
      const e = b ? refToRowCol(b) : s;
      const g: GridMerge = {
        r0: Math.min(s.row, e.row), c0: Math.min(s.col, e.col),
        r1: Math.max(s.row, e.row), c1: Math.max(s.col, e.col),
      };
      merges.push(g);
      if (g.r1 > rowCount) rowCount = g.r1;
      if (g.c1 > colCount) colCount = g.c1;
    } catch { /* ref inválida: ignora o merge */ }
  }

  const cells: (GridCell | undefined)[][] = [];
  for (let r = 0; r < rowCount; r++) cells.push(new Array<GridCell | undefined>(colCount).fill(undefined));
  for (const row of ws.rows) {
    for (const c of row.cells) {
      const { col, row: r } = refToRowCol(c.ref);
      if (r < 1 || r > rowCount || col < 1 || col > colCount) continue;
      const gc: GridCell = displayValue(c, model, loc);
      if (c.style !== undefined) gc.xf = c.style;
      cells[r - 1]![col - 1] = gc;
    }
  }

  const mergeMap = new Map<string, GridMerge>();
  for (const g of merges) {
    for (let r = g.r0; r <= g.r1; r++) {
      for (let c = g.c0; c <= g.c1; c++) mergeMap.set(`${r},${c}`, g);
    }
  }

  return {
    name, ws, rowCount, colCount, cells, merges,
    mergeAt: (r, c) => mergeMap.get(`${r},${c}`),
  };
}

// ──────────────────── Métricas (larguras/alturas) ────────────────────

/**
 * Converte largura de coluna (unidades de caractere, atributo width do <col>)
 * → pixels @96dpi. Fórmula do OOXML com MaxDigitWidth=7 (Aptos Narrow 11) —
 * a MESMA usada pelo componente <universal-sheet>:
 *   px = floor( ((256*w + floor(128/MDW)) / 256) * MDW )
 */
export function colWidthPx(width: number): number {
  const MDW = 7;
  return Math.floor(((256 * width + Math.floor(128 / MDW)) / 256) * MDW);
}

/** Largura default de coluna em px quando o pacote não especifica nada. */
const DEFAULT_COL_W_PX = 64;
/** Altura default de linha em pontos (Excel pt-BR, Aptos Narrow 11). */
const DEFAULT_ROW_H_PT = 15;

/** Largura em px de cada coluna 1..colCount (aplica <cols> + defaults do grid). */
export function colWidthsPx(ws: Worksheet, colCount: number): number[] {
  const sfp = ws.sheetFormatPr;
  const defPx = sfp?.defaultColWidth !== undefined
    ? colWidthPx(sfp.defaultColWidth)
    : sfp?.baseColWidth !== undefined
      ? colWidthPx(sfp.baseColWidth + 5 / 7) // baseColWidth + padding (5px/MDW)
      : DEFAULT_COL_W_PX;
  const out = new Array<number>(colCount).fill(defPx);
  for (const cd of ws.cols ?? []) {
    if (cd.width === undefined) continue;
    for (let c = Math.max(1, cd.min); c <= Math.min(colCount, cd.max); c++) {
      out[c - 1] = colWidthPx(cd.width);
    }
  }
  return out;
}

/** Altura em pontos de cada linha 1..rowCount (atributo ht ou default). */
export function rowHeightsPt(ws: Worksheet, rowCount: number): number[] {
  const def = ws.sheetFormatPr?.defaultRowHeight ?? DEFAULT_ROW_H_PT;
  const out = new Array<number>(rowCount).fill(def);
  for (const row of ws.rows) {
    if (row.height !== undefined && row.r >= 1 && row.r <= rowCount) out[row.r - 1] = row.height;
  }
  return out;
}

/** Colunas ocultas (1-based) — usadas pelo PDF (impressão pula ocultas). */
export function hiddenCols(ws: Worksheet, colCount: number): Set<number> {
  const out = new Set<number>();
  for (const cd of ws.cols ?? []) {
    if (!cd.hidden) continue;
    for (let c = Math.max(1, cd.min); c <= Math.min(colCount, cd.max); c++) out.add(c);
  }
  return out;
}

/** Linhas ocultas (1-based). */
export function hiddenRows(ws: Worksheet): Set<number> {
  const out = new Set<number>();
  for (const row of ws.rows) if (row.hidden) out.add(row.r);
  return out;
}

/**
 * Cor de fundo efetiva de um fill para export "chapado": sólido = fgColor;
 * gradiente = 1º stop; padrões legados = fgColor (cor do padrão) como
 * aproximação. `none`/ausente = sem fundo.
 */
export function fillColor(fill: Fill | undefined): string | undefined {
  if (!fill) return undefined;
  if (fill.pattern === 'solid') return fill.fgColor;
  if (fill.gradient) return fill.gradient.stops[0]?.color;
  if (fill.pattern && fill.pattern !== 'none') return fill.fgColor ?? fill.bgColor;
  return undefined;
}
