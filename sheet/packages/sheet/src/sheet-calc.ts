/**
 * Ponte entre o componente (<universal-sheet>) e o motor de cálculo
 * (@universal-office/sheet-calc): cria o Engine a partir do modelo do sheet-core,
 * aplica as edições (entry.ts), recalcula e grava de volta no modelo
 * (worksheet.rows) SÓ as células cujo valor mudou — em qualquer aba —, para a
 * pintura e a gravação continuarem lendo o modelo de sempre.
 *
 * - O motor nasce sob demanda (1ª edição, 1ª célula com fórmula/matriz
 *   selecionada) — abrir uma pasta não paga o custo, salvo quando o Excel
 *   recalcularia ao abrir: `shouldRecalcOnOpen` do motor (regra medida —
 *   completo, só as ca="1"/sem `<v>`, ou nada); o gancho `recalcOnOpen` do
 *   hospedeiro, se houver, decide no lugar dela (true = completo).
 * - Fórmula digitada = semântica do 365 (matriz dinâmica: derrama); a âncora
 *   bloqueada vira #DESPEJAR!; apagar a âncora limpa o intervalo.
 * - Barra de fórmulas: a fórmula no idioma (toLocal da forma da tela do Excel,
 *   com os "@" da conversão legada); célula derramada mostra a da âncora
 *   ("fantasma", cinza no Excel); matriz CSE com chaves {=…}.
 * - Formato: o que a entrada/fórmula aplica (entry-format.ts) vira um xf
 *   derivado (XfPool), acrescentado ao styles.xml na gravação.
 */
import {
  CalcError, Engine, areaToA1, cellValue, fromSheetCore, numberLiteral, toLocal,
  localizeBool, localizeError, applyOpenRecalc, shouldRecalcOnOpen, parseFormula, printFormula,
  type Area, type CellInput, type ErrorCode, type FormulaRec, type Scalar,
} from '@universal-office/sheet-calc';
import {
  builtinFormatCode, refToRowCol, rowColToRef,
  type Border, type BorderEdge, type Cell, type CellXf, type Fill, type Font, type Row, type SharedString, type Styles, type Workbook, type Worksheet,
} from '@universal-office/sheet-core';
import { xfIndexAt } from './cell-format.js';
import { editText } from './edit-text.js';
import { parseEntry } from './entry.js';
import { formatCategory, inferFormulaFormat, shouldApplyFormat, type NumFmtHint } from './entry-format.js';
import type { FormulaLocale } from './formula-locale.js';

/** O que a ponte precisa de cada aba do componente (SheetView). */
export interface CalcView {
  readonly worksheet: Worksheet;
  readonly rowXf: Map<number, number>;
  readonly colXf: Map<number, number>;
  maxRow: number;
  maxCol: number;
}

/** Acesso ao estado do componente (vivo: muda a cada pasta carregada). */
export interface SheetCalcHost {
  readonly workbook: Workbook | null;
  readonly views: readonly CalcView[];
  readonly shared: readonly SharedString[];
  readonly styles: Styles;
  /** Índice célula-por-(linha, coluna) da aba (o da pintura) — atualizado no lugar. */
  cellIndex(view: number): Map<number, Map<number, Cell>>;
  /** A aba mudou: invalida a formatação condicional e marca para gravar. */
  touched(view: number): void;
}

export type EditResult =
  | { readonly ok: true; readonly views: ReadonlySet<number>; readonly grew: boolean }
  | { readonly ok: false; readonly message: string };

/** Texto da barra de fórmulas da célula selecionada. */
export interface BarText {
  /** Fórmula no idioma ("=SOMA(A1:A3)", "{=…}" CSE) ou '' para constante. */
  readonly formula: string;
  /** O que a barra mostra / F2 edita: a fórmula ou o texto de edição da constante. */
  readonly edit: string;
  /** Célula derramada (não âncora): a fórmula é a da âncora, em cinza. */
  readonly ghost: boolean;
}

/** Intervalo 1-based (colunas/linhas do componente). */
export interface CellRange { readonly c1: number; readonly r1: number; readonly c2: number; readonly r2: number }

interface Bridge {
  readonly engine: Engine;
  /** aba do motor (= workbook.sheets) → aba do componente (-1 = sem conteúdo) */
  readonly viewOfSheet: readonly number[];
  readonly sheetOfView: readonly number[];
}

const MSG = {
  'pt-BR': { array: 'Não é possível alterar parte de uma matriz.' },
  'en-US': { array: "You can't change part of an array." },
} as const;

export class SheetCalc {
  private bridge: Bridge | null = null;
  private pool: XfPool | null = null;
  private readonly arrays = new Map<number, boolean>();
  /** Gancho do hospedeiro: recalcular tudo ao abrir? Decide no lugar da regra do Excel (`shouldRecalcOnOpen` do motor). */
  recalcOnOpen: ((wb: Workbook) => boolean) | null = null;
  /** Caminho/nome do arquivo (CELL("filename")); sem ele "[Pasta1.xlsx]Aba" — pasta aberta de arquivo nunca dá "". */
  fileName: string | undefined;

  constructor(private readonly host: SheetCalcHost, public locale: FormulaLocale) {}

  /** Nova pasta carregada: esquece o motor e os xfs derivados; recalcula se pedido. */
  reset(): Set<number> {
    this.bridge = null;
    this.pool = new XfPool(this.host.styles);
    this.arrays.clear();
    const wb = this.host.workbook;
    if (!wb) return new Set();
    if (this.recalcOnOpen) return this.recalcOnOpen(wb) ? this.recalcAll() : new Set();
    // regra do Excel 365 (open-recalc.ts): completo, só ca="1"/sem <v>, ou nada
    const worksheets: (Worksheet | undefined)[] = [];
    let k = 0;
    for (const s of wb.sheets) worksheets.push(s.target && this.host.views[k] ? this.host.views[k++]!.worksheet : undefined);
    const plan = shouldRecalcOnOpen({ workbook: wb, worksheets });
    if (plan.mode === 'none') return new Set();
    if (plan.mode === 'full') return this.recalcAll();
    return this.writeBack(applyOpenRecalc(this.ensure().engine, plan)).views;
  }

  /** O motor já existe (alguma célula foi editada ou consultada). */
  get engine(): Engine | null { return this.bridge?.engine ?? null; }

  private ensure(): Bridge {
    if (this.bridge) return this.bridge;
    const wb = this.host.workbook;
    if (!wb) throw new Error('nenhuma pasta carregada');
    const worksheets: (Worksheet | undefined)[] = [];
    const viewOfSheet: number[] = [], sheetOfView: number[] = [];
    let k = 0;
    wb.sheets.forEach((s, i) => {
      if (s.target && this.host.views[k]) { worksheets.push(this.host.views[k]!.worksheet); viewOfSheet[i] = k; sheetOfView[k] = i; k++; }
      else { worksheets.push(undefined); viewOfSheet[i] = -1; }
    });
    const engine = new Engine(fromSheetCore({ workbook: wb, worksheets, sharedStrings: this.host.shared }), { locale: this.locale.values, fileName: this.fileName ?? 'Pasta1.xlsx' });
    this.bridge = { engine, viewOfSheet, sheetOfView };
    return this.bridge;
  }

  /** Recálculo completo (Ctrl+Alt+F9 / ao abrir): grava os valores no modelo. */
  recalcAll(): Set<number> {
    const b = this.ensure();
    b.engine.recalc();
    return this.writeBack(b.engine.takeChanges()).views;
  }

  // ---------------------------------------------------------------- edição

  /** Texto digitado na célula (col,row 1-based) da aba `view`. */
  edit(view: number, col: number, row: number, text: string): EditResult {
    const v = this.host.views[view];
    if (!v) return { ok: false, message: '' };
    const b = this.ensure();
    const sheet = b.sheetOfView[view]!;
    const eng = b.engine;
    const r0 = row - 1, c0 = col - 1;
    // parte de matriz CSE (ou tabela de dados) de várias células não se edita
    const rec = eng.getFormula(sheet, r0, c0) ?? eng.getOwner(sheet, r0, c0);
    if (rec && !rec.dynamic && (rec.kind === 'dataTable' || (rec.kind === 'array' && rec.area && (rec.area.r1 !== rec.area.r2 || rec.area.c1 !== rec.area.c2)))) {
      return { ok: false, message: MSG[this.locale.lang].array };
    }
    const idx = this.host.cellIndex(view);
    let cell = idx.get(row)?.get(col);
    const xf = xfIndexAt(v, cell, col, row);
    const fmt = this.formatOf(xf);
    const current = formatCategory(fmt.code);
    const entry = parseEntry(text, {
      locale: this.locale, current, row: r0, col: c0, date1904: !!this.host.workbook?.date1904,
      names: this.names(), ...(this.tableAt(sheet, r0, c0) ? { inTable: this.tableAt(sheet, r0, c0)! } : {}),
    });
    if (entry.kind === 'invalid') return { ok: false, message: entry.message };

    let input: CellInput | undefined;
    if (entry.kind === 'clear') {
      if (cell) stripContent(cell);
    } else {
      cell ??= this.createCell(view, row, col, xf);
      stripContent(cell);
      if (entry.kind === 'formula') {
        cell.formula = entry.text;
        input = { f: { text: entry.text, t: 'array', dynamic: true } };
      } else {
        input = { v: entry.value };
        const quote = !!entry.quotePrefix;
        const fmtChange = entry.fmt && shouldApplyFormat(current, entry.fmt) ? entry.fmt : undefined;
        if (fmtChange || quote !== this.pool!.quotePrefix(xf)) this.setStyle(cell, this.pool!.derive(xf, fmtChange, quote));
      }
    }
    eng.setCell(sheet, r0, c0, input);
    eng.calculate();
    // formato herdado pela fórmula (=HOJE(), =A1 de data…)
    if (entry.kind === 'formula' && cell) {
      const hint = inferFormulaFormat(entry.node, r0, c0, (name, r, c) => this.formatAt(name === undefined ? view : this.viewByName(name), r + 1, c + 1));
      if (hint && shouldApplyFormat(current, hint)) this.setStyle(cell, this.pool!.derive(xf, hint, false));
      else if (this.pool!.quotePrefix(xf)) this.setStyle(cell, this.pool!.derive(xf, undefined, false));
    }
    const res = this.writeBack(eng.takeChanges());
    res.views.add(view);
    this.host.touched(view);
    return { ok: true, views: res.views, grew: res.grew };
  }

  private setStyle(cell: Cell, xf: number): void {
    if (xf === 0) delete cell.style; else cell.style = xf;
  }

  /** Cria a célula no modelo (linha ordenada, colunas ordenadas) com o estilo padrão da linha/coluna. */
  private createCell(view: number, row: number, col: number, xf: number): Cell {
    const ws = this.host.views[view]!.worksheet;
    const cell: Cell = { ref: rowColToRef(col, row) };
    if (xf) cell.style = xf;
    let r = findRow(ws, row);
    if (!r) {
      r = { r: row, cells: [] };
      const i = lowerRow(ws.rows, row);
      ws.rows.splice(i, 0, r);
    }
    let lo = 0, hi = r.cells.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (refToRowCol(r.cells[m]!.ref).col < col) lo = m + 1; else hi = m; }
    r.cells.splice(lo, 0, cell);
    const idx = this.host.cellIndex(view);
    let rm = idx.get(row);
    if (!rm) { rm = new Map(); idx.set(row, rm); }
    rm.set(col, cell);
    return cell;
  }

  private removeCell(view: number, row: number, col: number, cell: Cell): void {
    const ws = this.host.views[view]!.worksheet;
    const r = findRow(ws, row);
    if (r) { const i = r.cells.indexOf(cell); if (i >= 0) r.cells.splice(i, 1); }
    this.host.cellIndex(view).get(row)?.delete(col);
  }

  /** Grava no modelo os valores das células mudadas (todas as abas). */
  private writeBack(changes: readonly { sheet: number; row: number; col: number }[]): { views: Set<number>; grew: boolean } {
    const b = this.bridge!;
    const eng = b.engine;
    const views = new Set<number>();
    let grew = false;
    const dynCm = this.host.workbook?.dynamicArrayCm?.[0];
    for (const ch of changes) {
      const view = b.viewOfSheet[ch.sheet] ?? -1;
      if (view < 0) continue;
      const v = this.host.views[view]!;
      const row = ch.row + 1, col = ch.col + 1;
      const value = eng.getValue(ch.sheet, ch.row, ch.col);
      const f = eng.getFormula(ch.sheet, ch.row, ch.col);
      const owner = eng.getOwner(ch.sheet, ch.row, ch.col);
      let cell = this.host.cellIndex(view).get(row)?.get(col);
      views.add(view);
      if (value === null && !f && !owner) {
        if (cell) {
          stripContent(cell);
          if (cell.style === undefined) this.removeCell(view, row, col, cell);
        }
        continue;
      }
      if (!cell) cell = this.createCell(view, row, col, xfIndexAt(v, undefined, col, row));
      writeScalar(cell, value, f ? 'formula' : owner ? 'spill' : 'constant');
      if (f?.dynamic) setDynamicAttrs(cell, f, dynCm);
      if (row > v.maxRow) { v.maxRow = row; grew = true; }
      if (col > v.maxCol) { v.maxCol = col; grew = true; }
    }
    for (const view of views) this.host.touched(view);
    return { views, grew };
  }

  // ---------------------------------------------------------------- leitura

  /** Barra de fórmulas / F2 da célula (col,row 1-based). */
  barText(view: number, col: number, row: number): BarText {
    const v = this.host.views[view];
    if (!v) return { formula: '', edit: '', ghost: false };
    const cell = this.host.cellIndex(view).get(row)?.get(col);
    if (cell?.formula !== undefined || this.hasArrays(view) || this.bridge) {
      const b = this.ensure();
      const sheet = b.sheetOfView[view]!;
      const r0 = row - 1, c0 = col - 1;
      const own = b.engine.getFormula(sheet, r0, c0);
      const owner = own ? undefined : b.engine.getOwner(sheet, r0, c0);
      const rec = own ?? owner;
      // tabela de dados ({=TABELA(…)}) não tem texto de fórmula no motor: mostra o valor
      if (rec && rec.kind !== 'dataTable') {
        const text = this.localFormula(rec);
        const cse = rec.kind === 'array' && !rec.dynamic;
        const formula = cse ? `{${text}}` : text;
        return { formula, edit: owner?.dynamic ? '' : formula, ghost: !!owner?.dynamic };
      }
    }
    const xf = xfIndexAt(v, cell, col, row);
    if (!cell) return { formula: '', edit: '', ghost: false };
    const value = cellValue(cell, this.host.shared, !!this.host.workbook?.date1904);
    const edit = editText(value, formatCategory(this.formatOf(xf).code), this.locale, {
      date1904: !!this.host.workbook?.date1904, quotePrefix: this.pool?.quotePrefix(xf) ?? false,
    });
    return { formula: '', edit, ghost: false };
  }

  /** Fórmula de uma âncora no idioma ("=…"). */
  private localFormula(f: FormulaRec): string {
    const eng = this.bridge!.engine;
    const canon = eng.formulaText(f.sheet, f.row, f.col) ?? '';
    const table = eng.tableAt(f.sheet, f.row, f.col)?.name;
    return toLocal('=' + canon, { ...this.locale.syntax, names: this.names(), ...(table ? { inTable: table } : {}) });
  }

  /** Intervalo derramado que contém a célula (âncora ou derramada), 1-based. */
  spillRange(view: number, col: number, row: number): CellRange | null {
    if (!this.bridge && !this.hasArrays(view)) return null;
    const b = this.ensure();
    const sheet = b.sheetOfView[view]!;
    const f = b.engine.getFormula(sheet, row - 1, col - 1) ?? b.engine.getOwner(sheet, row - 1, col - 1);
    const a: Area | undefined = f?.dynamic ? f.area : undefined;
    return a ? { c1: a.c1 + 1, r1: a.r1 + 1, c2: a.c2 + 1, r2: a.r2 + 1 } : null;
  }

  /** Erro/booleano no idioma das fórmulas (exibição de valores do arquivo e calculados). */
  errorText(code: string): string { return localizeError(code.trim().toUpperCase() as ErrorCode, this.locale.lang); }
  boolText(b: boolean): string { return localizeBool(b, this.locale.lang); }

  /** styles.xml com os xfs/formatos criados pelas edições. */
  patchStyles(xml: string): string { return this.pool?.patch(xml) ?? xml; }

  // ---------------------------------------------------------------- barras (formatar, copiar, preencher)

  /** xf igual a `from` com a mudança de formatação (fonte, preenchimento, bordas, alinhamento, formato). */
  styleFor(from: number, change: StyleChange): number {
    this.pool ??= new XfPool(this.host.styles);
    return this.pool.apply(from, change);
  }

  /** Id do formato numérico `code` (o do arquivo, um interno ou um novo). */
  formatId(code: string): number {
    this.pool ??= new XfPool(this.host.styles);
    return this.pool.formatId(code);
  }

  /** Célula do modelo em (col,row) — criada vazia (com o estilo da linha/coluna) se faltar. */
  ensureCell(view: number, col: number, row: number): Cell {
    const v = this.host.views[view]!;
    const cell = this.host.cellIndex(view).get(row)?.get(col);
    return cell ?? this.createCell(view, row, col, xfIndexAt(v, undefined, col, row));
  }

  /** Tira do modelo a célula vazia (sem valor, fórmula nem estilo). */
  dropIfEmpty(view: number, col: number, row: number): void {
    const cell = this.host.cellIndex(view).get(row)?.get(col);
    if (cell && cell.style === undefined && cell.value === undefined && cell.formula === undefined && cell.inlineString === undefined) {
      this.removeCell(view, row, col, cell);
    }
  }

  /**
   * Texto que, digitado em (dcol,drow), reproduz a célula (col,row): a fórmula
   * com as referências RELATIVAS deslocadas (copiar/colar, Preencher), no idioma;
   * constante: o texto de edição. Célula derramada: '' (é da âncora). `shift`
   * false = a fórmula como está (Recortar move sem ajustar).
   */
  copyText(view: number, col: number, row: number, dcol: number, drow: number, shift = true): string {
    const bar = this.barText(view, col, row);
    if (bar.ghost) return '';
    if (!bar.formula || !shift || bar.formula.startsWith('{')) return bar.edit;
    const b = this.ensure();
    const sheet = b.sheetOfView[view]!;
    const canon = b.engine.formulaText(sheet, row - 1, col - 1);
    if (!canon) return bar.edit;
    try {
      const node = parseFormula(canon, { row: row - 1, col: col - 1 });
      const moved = printFormula(node, { row: drow - 1, col: dcol - 1 });
      return toLocal('=' + moved, { ...this.locale.syntax, names: this.names() });
    } catch {
      return bar.edit;
    }
  }

  /** O VALOR atual da célula como constante digitável (Colar Valores): número/data no formato de edição. */
  valueText(view: number, col: number, row: number): string {
    const cell = this.host.cellIndex(view).get(row)?.get(col);
    if (!cell) return '';
    const v = this.host.views[view]!;
    const value = cellValue(cell, this.host.shared, !!this.host.workbook?.date1904);
    if (value === null) return '';
    if (typeof value === 'string') return /^[=+\-@']/.test(value) ? `'${value}` : value;
    if (typeof value === 'boolean') return localizeBool(value, this.locale.lang);
    if (value instanceof CalcError) return localizeError(value.code, this.locale.lang);
    return editText(value, formatCategory(this.formatOf(xfIndexAt(v, cell, col, row)).code), this.locale, { date1904: !!this.host.workbook?.date1904, quotePrefix: false });
  }

  /** Fórmula canônica ("=SUM(A1:A3)") no idioma das fórmulas. */
  toLocalFormula(canonical: string): string {
    return toLocal(canonical, { ...this.locale.syntax, names: this.names() });
  }

  // ---------------------------------------------------------------- apoio

  private formatOf(xf: number): { id: number; code: string } {
    const id = this.host.styles.cellXfs[xf]?.numFmtId ?? 0;
    return { id, code: this.host.styles.numFmts.get(id) ?? builtinFormatCode(id) ?? 'General' };
  }

  /** Formato da célula (col,row 1-based) de uma aba do componente. */
  private formatAt(view: number, row: number, col: number): { id: number; code: string } | undefined {
    const v = this.host.views[view];
    if (!v) return undefined;
    return this.formatOf(xfIndexAt(v, this.host.cellIndex(view).get(row)?.get(col), col, row));
  }

  private viewByName(name: string): number {
    const b = this.bridge!;
    const i = b.engine.sheetIndex(name);
    return i === undefined ? -1 : b.viewOfSheet[i] ?? -1;
  }

  private names(): string[] {
    return (this.host.workbook?.definedNames ?? []).map((d) => d.name.replace(/^_xlnm\./i, ''));
  }

  private tableAt(sheet: number, row: number, col: number): string | undefined {
    return this.bridge?.engine.tableAt(sheet, row, col)?.name;
  }

  /** A aba tem fórmula de matriz (CSE ou dinâmica)? — para saber se uma célula sem fórmula pode ser parte dela. */
  private hasArrays(view: number): boolean {
    let h = this.arrays.get(view);
    if (h === undefined) {
      h = false;
      const ws = this.host.views[view]?.worksheet;
      for (const r of ws?.rows ?? []) {
        for (const c of r.cells) if (c.formulaAttrs?.t === 'array' || c.formulaAttrs?.t === 'dataTable') { h = true; break; }
        if (h) break;
      }
      this.arrays.set(view, h);
    }
    return h;
  }
}

// ------------------------------------------------------------------ modelo

function findRow(ws: Worksheet, row: number): Row | undefined {
  const i = lowerRow(ws.rows, row);
  const r = ws.rows[i];
  if (r?.r === row) return r;
  // linhas fora de ordem (arquivo atípico): busca linear
  return ws.rows.find((x) => x.r === row);
}

function lowerRow(rows: readonly Row[], row: number): number {
  let lo = 0, hi = rows.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m]!.r < row) lo = m + 1; else hi = m; }
  return lo;
}

/** Tira valor, fórmula e metadados (mantém ref e estilo). */
function stripContent(cell: Cell): void {
  delete cell.formula;
  delete cell.formulaAttrs;
  delete cell.cm;
  delete cell.vm;
  delete cell.inlineString;
  delete cell.value;
  delete cell.type;
}

/** Valor do motor → atributos t/v da célula (constante de texto = inlineStr; resultado de fórmula = str). */
function writeScalar(cell: Cell, v: Scalar, kind: 'formula' | 'spill' | 'constant'): void {
  delete cell.inlineString;
  if (typeof v === 'number') { delete cell.type; cell.value = numberLiteral(v); }
  else if (typeof v === 'string') {
    if (kind === 'constant') { cell.type = 'inlineStr'; cell.inlineString = { text: v }; delete cell.value; }
    else { cell.type = 'str'; cell.value = v; }
  } else if (typeof v === 'boolean') { cell.type = 'b'; cell.value = v ? '1' : '0'; }
  else if (v instanceof CalcError) { cell.type = 'e'; cell.value = v.code; }
  else { delete cell.type; delete cell.value; }
}

/**
 * Atributos do <f> de uma fórmula dinâmica: t="array" + ref do derramamento
 * (e o cm de matriz dinâmica da pasta, se ela tiver os metadados); sem
 * metadados, a fórmula que não derrama fica normal (senão o Excel a leria como
 * CSE {=…}). ca="1" nas voláteis (o Excel grava assim =HOJE()). A gravação dos
 * metadados (cm/metadata.xml) é do CALC-IO.
 */
function setDynamicAttrs(cell: Cell, f: FormulaRec, dynCm: number | undefined): void {
  const a = f.area;
  const multi = !!a && (a.r1 !== a.r2 || a.c1 !== a.c2);
  const fileDynamic = cell.cm !== undefined;
  if (!multi && !fileDynamic) {
    if (cell.formulaAttrs) { delete cell.formulaAttrs.t; delete cell.formulaAttrs.ref; }
  } else {
    cell.formulaAttrs = { ...(cell.formulaAttrs ?? {}), t: 'array', ref: a ? areaToA1(a) : cell.ref };
    if (!fileDynamic && dynCm !== undefined) cell.cm = dynCm;
  }
  if (f.volatile && !f.input?.ca) cell.formulaAttrs = { ...(cell.formulaAttrs ?? {}), ca: true };
  if (cell.formulaAttrs && !Object.keys(cell.formulaAttrs).some((k) => (cell.formulaAttrs as Record<string, unknown>)[k] !== undefined)) delete cell.formulaAttrs;
}

// ------------------------------------------------------------------ estilos

/** Mudança de fonte (Formatar células › Fonte); ausente = mantém. `color: null` = automática. */
export interface FontChange {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  size?: number;
  name?: string;
  color?: string | null;
}

/** Mudança de alinhamento; `null` = volta ao padrão (Geral / Inferior). */
export interface AlignChange {
  horizontal?: string | null;
  vertical?: string | null;
  wrapText?: boolean;
  indent?: number;
}

/**
 * Mudança de formatação de um xf — o que as barras aplicam às células
 * (Página Inicial do Excel). Ausente = mantém; `fill: null` = sem
 * preenchimento; `border: null` = sem bordas (a borda dada SUBSTITUI a da célula).
 */
export interface StyleChange {
  numFmt?: { id: number; code?: string };
  quotePrefix?: boolean;
  font?: FontChange;
  fill?: string | null;
  border?: Border | null;
  align?: AlignChange;
}

type PoolXf = CellXf & { quotePrefix?: boolean };
interface AddedXf { readonly src: number; readonly rec: PoolXf }
/** Fonte acrescentada: `tpl` = fonte DO ARQUIVO cujo XML serve de molde (family, charset, scheme…). */
interface AddedFont { readonly tpl: number; readonly font: Font }

/** Campos do xf que uma edição muda (o resto vem copiado do xf de origem). */
const XF_FIELDS = ['numFmtId', 'fontId', 'fillId', 'borderId', 'quotePrefix', 'horizontal', 'vertical', 'wrapText', 'indent'] as const;
const FONT_FIELDS = ['bold', 'italic', 'underline', 'underlineStyle', 'strike', 'size', 'color', 'name', 'altName', 'vertAlign'] as const;
const sameColor = (a: string | undefined, b: string | undefined): boolean => (a ?? '').toUpperCase() === (b ?? '').toUpperCase();
const sameXf = (a: PoolXf, b: PoolXf): boolean => XF_FIELDS.every((k) => (a[k] ?? undefined) === (b[k] ?? undefined) || (k === 'quotePrefix' || k === 'wrapText') && !a[k] === !b[k]);
const sameFont = (a: Font, b: Font): boolean => FONT_FIELDS.every((k) => (k === 'color' ? sameColor(a.color, b.color) : (a[k] ?? undefined) === (b[k] ?? undefined)));
const sameEdge = (a: BorderEdge | undefined, b: BorderEdge | undefined): boolean => (!a && !b) || (!!a && !!b && a.style === b.style && sameColor(a.color, b.color));
const sameBorder = (a: Border, b: Border): boolean => (['left', 'right', 'top', 'bottom', 'diagonal'] as const).every((k) => sameEdge(a[k], b[k])) && !a.diagonalUp === !b.diagonalUp && !a.diagonalDown === !b.diagonalDown;

/** Ids dos formatos internos que não dependem do idioma (os 14–22 dependem; 41–44 não têm código fixo). */
const FIXED_BUILTINS: Record<number, string> = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
  37: '#,##0_);(#,##0)', 38: '#,##0_);[Red](#,##0)', 39: '#,##0.00_);(#,##0.00)', 40: '#,##0.00_);[Red](#,##0.00)',
  45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};

/**
 * xfs derivados pelas edições — formato numérico e prefixo de texto da entrada
 * (entry.ts) e a formatação das barras (fonte, preenchimento, bordas,
 * alinhamento): reaproveita o já criado; na gravação acrescenta ao styles.xml
 * as fontes/preenchimentos/bordas novos e os <xf> COPIADOS do de origem
 * (proteção, extLst… ficam) com o que mudou.
 */
export class XfPool {
  readonly base: number;
  private readonly fontBase: number;
  private readonly fillBase: number;
  private readonly borderBase: number;
  private readonly added: AddedXf[] = [];
  private readonly fonts: AddedFont[] = [];
  private readonly fills: Fill[] = [];
  private readonly borders: Border[] = [];
  private readonly fmts = new Map<number, string>();
  /** padrões postos no lugar de um bloco que faltava no arquivo (fonte, os 2 preenchimentos, a borda vazia) */
  private readonly defaults = { fonts: 0, fills: 0, borders: 0 };

  constructor(private readonly styles: Styles) {
    this.base = styles.cellXfs.length;
    this.fontBase = styles.fonts.length;
    this.fillBase = styles.fills.length;
    this.borderBase = styles.borders.length;
  }

  quotePrefix(xf: number): boolean {
    return !!(this.styles.cellXfs[xf] as PoolXf | undefined)?.quotePrefix;
  }

  /** xf igual a `from` com outro formato e/ou prefixo de texto (entrada de célula). */
  derive(from: number, fmt: NumFmtHint | undefined, quotePrefix: boolean): number {
    const change: StyleChange = { quotePrefix };
    if (fmt) change.numFmt = fmt.code ? { id: fmt.id, code: fmt.code } : { id: fmt.id };
    return this.apply(from, change);
  }

  /** Id do formato `code`: o do arquivo, um interno fixo ou um novo (≥ 164). */
  formatId(code: string): number {
    for (const [id, c] of this.styles.numFmts) if (c === code) return id;
    for (const [id, c] of Object.entries(FIXED_BUILTINS)) if (c === code) return Number(id);
    let id = 163;
    for (const k of this.styles.numFmts.keys()) if (k > id) id = k;
    id++;
    this.styles.numFmts.set(id, code);
    this.fmts.set(id, code);
    return id;
  }

  /** xf igual a `from` com a mudança (o mesmo `from` se nada muda). */
  apply(from: number, change: StyleChange): number {
    const xfs = this.styles.cellXfs as PoolXf[];
    const src = xfs[from] ?? xfs[0] ?? { numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 };
    const rec: PoolXf = { ...src };
    if (change.numFmt) {
      rec.numFmtId = change.numFmt.id;
      rec.applyNumberFormat = true;
      if (change.numFmt.code && !this.styles.numFmts.has(change.numFmt.id)) {
        this.styles.numFmts.set(change.numFmt.id, change.numFmt.code);
        this.fmts.set(change.numFmt.id, change.numFmt.code);
      }
    }
    if (change.quotePrefix !== undefined) { if (change.quotePrefix) rec.quotePrefix = true; else delete rec.quotePrefix; }
    if (change.font) rec.fontId = this.fontFor(src.fontId, change.font);
    if (change.fill !== undefined) rec.fillId = change.fill === null ? 0 : this.fillFor(change.fill);
    if (change.border !== undefined) rec.borderId = change.border === null || !hasEdges(change.border) ? 0 : this.borderFor(change.border);
    if (change.align) {
      const a = change.align;
      if (a.horizontal !== undefined) { if (a.horizontal === null || a.horizontal === 'general') delete rec.horizontal; else rec.horizontal = a.horizontal; }
      if (a.vertical !== undefined) { if (a.vertical === null || a.vertical === 'bottom') delete rec.vertical; else rec.vertical = a.vertical; }
      if (a.wrapText !== undefined) { if (a.wrapText) rec.wrapText = true; else delete rec.wrapText; }
      if (a.indent !== undefined) { if (a.indent > 0) rec.indent = a.indent; else delete rec.indent; }
    }
    if (rec.fontId !== src.fontId) rec.applyFont = true;
    if (rec.fillId !== src.fillId) rec.applyFill = true;
    if (rec.borderId !== src.borderId) rec.applyBorder = true;
    if (change.align) rec.applyAlignment = true;
    if (sameXf(rec, src)) return from;
    const origin = from >= this.base ? this.added[from - this.base]!.src : from;
    // já criado: mesma origem e o mesmo resultado
    for (let i = 0; i < this.added.length; i++) {
      const a = this.added[i]!;
      if (a.src === origin && sameXf(a.rec, rec)) return this.base + i;
    }
    // a própria origem já serve (voltou ao estilo do arquivo)
    const o = xfs[origin];
    if (o && sameXf(o, rec)) return origin;
    xfs.push(rec);
    this.added.push({ src: origin, rec });
    return xfs.length - 1;
  }

  private fontFor(fontId: number, ch: FontChange): number {
    const fonts = this.styles.fonts;
    if (!fonts.length) { fonts.push({ name: 'Calibri', size: 11 }); this.defaults.fonts = 1; }
    const cur = fonts[fontId] ?? fonts[0]!;
    const f: Font = { ...cur };
    const flag = (k: 'bold' | 'italic' | 'strike', v: boolean | undefined): void => { if (v !== undefined) { if (v) f[k] = true; else delete f[k]; } };
    flag('bold', ch.bold);
    flag('italic', ch.italic);
    flag('strike', ch.strike);
    if (ch.underline !== undefined) { if (ch.underline) f.underline = true; else { delete f.underline; delete f.underlineStyle; } }
    if (ch.size !== undefined) f.size = ch.size;
    if (ch.name !== undefined && ch.name !== cur.name) { f.name = ch.name; delete f.altName; }
    if (ch.color !== undefined) { if (ch.color === null) delete f.color; else f.color = ch.color.toUpperCase(); }
    if (sameFont(f, cur)) return fonts[fontId] ? fontId : 0;
    const hit = fonts.findIndex((x) => sameFont(x, f));
    if (hit >= 0) return hit;
    const tpl = fontId < this.fontBase ? fontId : this.fonts[fontId - this.fontBase]?.tpl ?? 0;
    fonts.push(f);
    this.fonts.push({ tpl, font: f });
    return fonts.length - 1;
  }

  private fillFor(color: string): number {
    const fills = this.styles.fills;
    if (!fills.length) this.defaults.fills = 2;
    while (fills.length < 2) fills.push(fills.length === 0 ? { pattern: 'none' } : { pattern: 'gray125' });
    const hit = fills.findIndex((x) => x.pattern === 'solid' && !x.gradient && sameColor(x.fgColor, color));
    if (hit >= 0) return hit;
    const f: Fill = { pattern: 'solid', fgColor: color.toUpperCase() };
    fills.push(f);
    this.fills.push(f);
    return fills.length - 1;
  }

  private borderFor(b: Border): number {
    const borders = this.styles.borders;
    if (!borders.length) { borders.push({}); this.defaults.borders = 1; }
    const hit = borders.findIndex((x) => sameBorder(x, b));
    if (hit >= 0) return hit;
    const nb: Border = {};
    for (const k of ['left', 'right', 'top', 'bottom', 'diagonal'] as const) if (b[k]) nb[k] = { style: b[k]!.style ?? 'thin', color: (b[k]!.color ?? '#000000').toUpperCase() };
    borders.push(nb);
    this.borders.push(nb);
    return borders.length - 1;
  }

  /** Acrescenta ao styles.xml as fontes/preenchimentos/bordas/xfs e numFmts novos (sem tocar no resto). */
  patch(xml: string): string {
    if (!this.added.length && !this.fmts.size && !this.fonts.length && !this.fills.length && !this.borders.length) return xml;
    let out = xml;
    const p = /<((?:\w+:)?)styleSheet\b/.exec(out)?.[1] ?? '';
    // os itens DO ARQUIVO de cada bloco (gravar de novo não duplica os acrescentados)
    const block = (name: string, item: string, base: number): { items: string[]; at: number; len: number } | null => {
      const m = new RegExp(`<${p}${name}\\b[^>]*?(?:/>|>([\\s\\S]*?)</${p}${name}>)`).exec(out);
      if (!m) return null;
      const items = [...(m[1] ?? '').matchAll(new RegExp(`<${p}${item}\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}${item}>)`, 'g'))].map((x) => x[0]).slice(0, base);
      return { items, at: m.index, len: m[0].length };
    };
    const put = (name: string, item: string, base: number, extra: string[], fallback: string[], defaults: number): void => {
      if (!extra.length) return;
      const b = block(name, item, base);
      // bloco ausente: os padrões que o pool pôs nos índices iniciais vêm antes dos novos
      const items = b ? b.items : fallback.slice(0, defaults);
      const xmlBlock = `<${p}${name} count="${items.length + extra.length}">${items.join('')}${extra.join('')}</${p}${name}>`;
      if (b) { out = out.slice(0, b.at) + xmlBlock + out.slice(b.at + b.len); return; }
      // bloco ausente: entra na ordem do schema (numFmts, fonts, fills, borders, cellStyleXfs, cellXfs…)
      const order = ['numFmts', 'fonts', 'fills', 'borders', 'cellStyleXfs', 'cellXfs', 'cellStyles', 'dxfs', 'tableStyles', 'colors', 'extLst'];
      let at = -1;
      for (const n of order.slice(order.indexOf(name) + 1)) {
        const i = out.search(new RegExp(`<${p}${n}[\\s/>]`));
        if (i >= 0) { at = i; break; }
      }
      if (at < 0) at = out.lastIndexOf(`</${p}styleSheet>`);
      if (at >= 0) out = out.slice(0, at) + xmlBlock + out.slice(at);
    };
    const fontItems = block('fonts', 'font', this.fontBase)?.items ?? [];
    put('fonts', 'font', this.fontBase, this.fonts.map((a) => fontXml(fontItems[a.tpl], this.styles.fonts[a.tpl], a.font, p)),
      [`<${p}font><${p}sz val="11"/><${p}name val="Calibri"/></${p}font>`], this.defaults.fonts);
    put('fills', 'fill', this.fillBase, this.fills.map((f) => fillXml(f, p)),
      [`<${p}fill><${p}patternFill patternType="none"/></${p}fill>`, `<${p}fill><${p}patternFill patternType="gray125"/></${p}fill>`], this.defaults.fills);
    put('borders', 'border', this.borderBase, this.borders.map((b) => borderXml(b, p)),
      [`<${p}border><${p}left/><${p}right/><${p}top/><${p}bottom/><${p}diagonal/></${p}border>`], this.defaults.borders);
    if (this.added.length) {
      const b = block('cellXfs', 'xf', this.base);
      if (!b) return xml;
      const def = `<${p}xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`;
      const extra = this.added.map((a) => rewriteXf(b.items[a.src] ?? b.items[0] ?? def, (this.styles.cellXfs as PoolXf[])[a.src], a.rec, p));
      out = out.slice(0, b.at) + `<${p}cellXfs count="${b.items.length + extra.length}">${b.items.join('')}${extra.join('')}</${p}cellXfs>` + out.slice(b.at + b.len);
    }
    const fmts = [...this.fmts].filter(([id]) => !new RegExp(`<(?:\\w+:)?numFmt\\b[^>]*\\bnumFmtId="${id}"`).test(out));
    if (fmts.length) {
      const add = fmts.map(([id, code]) => `<${p}numFmt numFmtId="${id}" formatCode="${escAttr(code)}"/>`).join('');
      const nf = new RegExp(`<${p}numFmts\\b([^>]*?)(/?)>`).exec(out);
      if (nf) {
        if (nf[2]) {
          out = out.slice(0, nf.index) + `<${p}numFmts count="${fmts.length}">${add}</${p}numFmts>` + out.slice(nf.index + nf[0].length);
        } else {
          const end = out.indexOf(`</${p}numFmts>`, nf.index);
          const body = out.slice(nf.index + nf[0].length, end);
          const n = (body.match(new RegExp(`<${p}numFmt\\b`, 'g')) ?? []).length + fmts.length;
          out = out.slice(0, nf.index) + `<${p}numFmts count="${n}">` + body + add + out.slice(end);
        }
      } else {
        const ss = new RegExp(`<${p}styleSheet\\b[^>]*>`).exec(out);
        if (ss) {
          const at = ss.index + ss[0].length;
          out = out.slice(0, at) + `<${p}numFmts count="${fmts.length}">${add}</${p}numFmts>` + out.slice(at);
        }
      }
    }
    return out;
  }
}

const hasEdges = (b: Border): boolean => !!(b.left || b.right || b.top || b.bottom || b.diagonal);

const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** #RRGGBB → ARGB do OOXML. */
const argb = (c: string): string => `FF${c.replace('#', '').toUpperCase().padStart(6, '0').slice(-6)}`;

/** Atributo `name` de uma tag de abertura: troca, acrescenta (no fim) ou tira. */
function setAttr(open: string, name: string, value: string | undefined): string {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  if (value === undefined) return open.replace(re, '');
  if (re.test(open)) return open.replace(re, ` ${name}="${value}"`);
  return open + ` ${name}="${value}"`;
}

/**
 * <font> nova: o XML da fonte de molde com só os elementos que MUDARAM trocados
 * (cor do tema, família, charset e esquema ficam se não mudaram; nome novo tira
 * o <scheme>, senão o Excel usaria a fonte do tema). Sem molde, do zero.
 */
function fontXml(tplXml: string | undefined, tpl: Font | undefined, f: Font, p: string): string {
  const t = tpl ?? {};
  let body = tplXml ? (/^<[^>]*\/>$/.test(tplXml) ? '' : tplXml.replace(/^<[^>]*>/, '').replace(new RegExp(`</${p}font>$`), '')) : '';
  const drop = (...names: string[]): void => {
    for (const n of names) body = body.replace(new RegExp(`<${p}${n}\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}${n}>)`, 'g'), '');
  };
  const add: string[] = [];
  const flag = (k: 'bold' | 'italic' | 'strike', tag: string): void => {
    if (!tplXml || !!t[k] !== !!f[k]) { drop(tag); if (f[k]) add.push(`<${p}${tag}/>`); }
  };
  flag('bold', 'b');
  flag('italic', 'i');
  flag('strike', 'strike');
  if (!tplXml || !!t.underline !== !!f.underline || t.underlineStyle !== f.underlineStyle) {
    drop('u');
    if (f.underline) add.push(f.underlineStyle ? `<${p}u val="${f.underlineStyle}"/>` : `<${p}u/>`);
  }
  if (!tplXml || t.size !== f.size) { drop('sz'); if (f.size !== undefined) add.push(`<${p}sz val="${f.size}"/>`); }
  if (!tplXml || !sameColor(t.color, f.color)) { drop('color'); if (f.color) add.push(`<${p}color rgb="${argb(f.color)}"/>`); }
  if (!tplXml || t.name !== f.name) { drop('name', 'scheme'); if (f.name) add.push(`<${p}name val="${escAttr(f.name)}"/>`); }
  // CT_Font é choice ilimitado: a ordem dos filhos não importa
  return `<${p}font>${add.join('')}${body}</${p}font>`;
}

function fillXml(f: Fill, p: string): string {
  return `<${p}fill><${p}patternFill patternType="solid"><${p}fgColor rgb="${argb(f.fgColor ?? '#000000')}"/><${p}bgColor indexed="64"/></${p}patternFill></${p}fill>`;
}

function borderXml(b: Border, p: string): string {
  const edge = (k: 'left' | 'right' | 'top' | 'bottom' | 'diagonal'): string => {
    const e = b[k];
    return e?.style ? `<${p}${k} style="${e.style}"><${p}color rgb="${argb(e.color ?? '#000000')}"/></${p}${k}>` : `<${p}${k}/>`;
  };
  return `<${p}border>${edge('left')}${edge('right')}${edge('top')}${edge('bottom')}${edge('diagonal')}</${p}border>`;
}

/** <alignment> de um xf (sem nenhum atributo → ''). */
function alignmentXml(x: PoolXf, p: string): string {
  let a = '';
  if (x.horizontal) a += ` horizontal="${x.horizontal}"`;
  if (x.vertical) a += ` vertical="${x.vertical}"`;
  if (x.textRotation) a += ` textRotation="${x.textRotation}"`;
  if (x.wrapText) a += ' wrapText="1"';
  if (x.indent) a += ` indent="${x.indent}"`;
  if (x.shrinkToFit) a += ' shrinkToFit="1"';
  if (x.readingOrder) a += ` readingOrder="${x.readingOrder}"`;
  if (x.justifyLastLine) a += ' justifyLastLine="1"';
  return a ? `<${p}alignment${a}/>` : '';
}

/** O <xf> de origem com o que mudou (ids, applyX, quotePrefix, <alignment>). */
function rewriteXf(xml: string, src: PoolXf | undefined, x: PoolXf, p: string): string {
  const end = xml.search(/\/?>/);
  let open = xml.slice(0, end);
  let rest = xml.slice(end);
  const s = src ?? { numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 };
  open = setAttr(open, 'numFmtId', String(x.numFmtId));
  if (x.fontId !== s.fontId) open = setAttr(open, 'fontId', String(x.fontId));
  if (x.fillId !== s.fillId) open = setAttr(open, 'fillId', String(x.fillId));
  if (x.borderId !== s.borderId) open = setAttr(open, 'borderId', String(x.borderId));
  if (x.applyNumberFormat && x.numFmtId !== s.numFmtId) open = setAttr(open, 'applyNumberFormat', '1');
  if (x.fontId !== s.fontId) open = setAttr(open, 'applyFont', '1');
  if (x.fillId !== s.fillId) open = setAttr(open, 'applyFill', '1');
  if (x.borderId !== s.borderId) open = setAttr(open, 'applyBorder', '1');
  open = setAttr(open, 'quotePrefix', x.quotePrefix ? '1' : undefined);
  const alignChanged = s.horizontal !== x.horizontal || s.vertical !== x.vertical || !s.wrapText !== !x.wrapText || (s.indent ?? 0) !== (x.indent ?? 0);
  if (alignChanged) {
    open = setAttr(open, 'applyAlignment', '1');
    const al = alignmentXml(x, p);
    const self = rest.startsWith('/>');
    let body = self ? '' : rest.slice(1).replace(new RegExp(`</${p}xf>$`), '');
    body = body.replace(new RegExp(`<${p}alignment\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}alignment>)`), '');
    // <alignment> é o 1º filho do CT_Xf
    body = al + body;
    rest = body ? `>${body}</${p}xf>` : '/>';
  }
  return open + rest;
}
