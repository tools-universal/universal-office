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
  localizeBool, localizeError, applyOpenRecalc, shouldRecalcOnOpen,
  type Area, type CellInput, type ErrorCode, type FormulaRec, type Scalar,
} from '@universal-office/sheet-calc';
import {
  builtinFormatCode, refToRowCol, rowColToRef,
  type Cell, type CellXf, type Row, type SharedString, type Styles, type Workbook, type Worksheet,
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

interface AddedXf { readonly src: number; readonly numFmtId: number; readonly applyNumberFormat: boolean; readonly quotePrefix: boolean }
type PoolXf = CellXf & { quotePrefix?: boolean };

/**
 * xfs derivados pelas edições (formato numérico / prefixo de texto): reaproveita
 * o já criado; grava no styles.xml COPIANDO o <xf> original (alinhamento,
 * proteção… ficam) com o numFmtId/quotePrefix novos.
 */
export class XfPool {
  readonly base: number;
  private readonly added: AddedXf[] = [];
  private readonly fmts = new Map<number, string>();

  constructor(private readonly styles: Styles) {
    this.base = styles.cellXfs.length;
  }

  quotePrefix(xf: number): boolean {
    return !!(this.styles.cellXfs[xf] as PoolXf | undefined)?.quotePrefix;
  }

  /** xf igual a `from` com outro formato e/ou prefixo de texto. */
  derive(from: number, fmt: NumFmtHint | undefined, quotePrefix: boolean): number {
    const xfs = this.styles.cellXfs as PoolXf[];
    const src = xfs[from] ?? xfs[0] ?? { numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 };
    const numFmtId = fmt?.id ?? src.numFmtId;
    if (numFmtId === src.numFmtId && quotePrefix === !!src.quotePrefix) return from;
    const origin = from >= this.base ? this.added[from - this.base]!.src : from;
    const applyNumberFormat = !!fmt || !!src.applyNumberFormat;
    // já criado: mesma origem, formato e prefixo
    for (let i = 0; i < this.added.length; i++) {
      const a = this.added[i]!;
      if (a.src === origin && a.numFmtId === numFmtId && a.quotePrefix === quotePrefix) return this.base + i;
    }
    // a própria origem já serve (voltou ao formato do arquivo)
    const o = xfs[origin];
    if (o && o.numFmtId === numFmtId && !!o.quotePrefix === quotePrefix) return origin;
    const xf: PoolXf = { ...src, numFmtId, ...(applyNumberFormat ? { applyNumberFormat: true } : {}) };
    if (quotePrefix) xf.quotePrefix = true; else delete xf.quotePrefix;
    xfs.push(xf);
    this.added.push({ src: origin, numFmtId, applyNumberFormat, quotePrefix });
    if (fmt?.code && !this.styles.numFmts.has(fmt.id)) { this.styles.numFmts.set(fmt.id, fmt.code); this.fmts.set(fmt.id, fmt.code); }
    return xfs.length - 1;
  }

  /** Acrescenta ao styles.xml os xfs e numFmts novos (sem tocar no resto). */
  patch(xml: string): string {
    if (!this.added.length && !this.fmts.size) return xml;
    let out = xml;
    if (this.added.length) {
      const m = /<((?:\w+:)?)cellXfs\b[^>]*>([\s\S]*?)<\/\1cellXfs>/.exec(out);
      if (!m) return xml;
      const p = m[1]!;
      // só os xfs do arquivo: gravar de novo não duplica os acrescentados
      const items = [...m[2]!.matchAll(new RegExp(`<${p}xf\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}xf>)`, 'g'))].map((x) => x[0]).slice(0, this.base);
      const extra = this.added.map((a) => rewriteXf(items[a.src] ?? items[0] ?? `<${p}xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`, a));
      const block = `<${p}cellXfs count="${items.length + extra.length}">${items.join('')}${extra.join('')}</${p}cellXfs>`;
      out = out.slice(0, m.index) + block + out.slice(m.index + m[0].length);
    }
    const fmts = [...this.fmts].filter(([id]) => !new RegExp(`<(?:\\w+:)?numFmt\\b[^>]*\\bnumFmtId="${id}"`).test(out));
    if (fmts.length) {
      const add = fmts.map(([id, code]) => `<numFmt numFmtId="${id}" formatCode="${escAttr(code)}"/>`).join('');
      const nf = /<((?:\w+:)?)numFmts\b([^>]*?)(\/?)>/.exec(out);
      if (nf) {
        const p = nf[1]!;
        if (nf[3]) {
          out = out.slice(0, nf.index) + `<${p}numFmts count="${fmts.length}">${add.replace(/<numFmt /g, `<${p}numFmt `)}</${p}numFmts>` + out.slice(nf.index + nf[0].length);
        } else {
          const end = out.indexOf(`</${p}numFmts>`, nf.index);
          const body = out.slice(nf.index + nf[0].length, end);
          const n = (body.match(new RegExp(`<${p}numFmt\\b`, 'g')) ?? []).length + fmts.length;
          out = out.slice(0, nf.index) + `<${p}numFmts count="${n}">` + body + add.replace(/<numFmt /g, `<${p}numFmt `) + out.slice(end);
        }
      } else {
        const ss = /<((?:\w+:)?)styleSheet\b[^>]*>/.exec(out);
        if (ss) {
          const p = ss[1]!;
          const at = ss.index + ss[0].length;
          out = out.slice(0, at) + `<${p}numFmts count="${fmts.length}">${add.replace(/<numFmt /g, `<${p}numFmt `)}</${p}numFmts>` + out.slice(at);
        }
      }
    }
    return out;
  }
}

const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** O <xf> original com numFmtId/applyNumberFormat/quotePrefix trocados. */
function rewriteXf(xml: string, a: AddedXf): string {
  const end = xml.search(/\/?>/);
  let open = xml.slice(0, end);
  const rest = xml.slice(end);
  const set = (name: string, value: string | undefined): void => {
    const re = new RegExp(`\\s${name}="[^"]*"`);
    if (value === undefined) open = open.replace(re, '');
    else if (re.test(open)) open = open.replace(re, ` ${name}="${value}"`);
    else open += ` ${name}="${value}"`;
  };
  set('numFmtId', String(a.numFmtId));
  if (a.applyNumberFormat) set('applyNumberFormat', '1');
  set('quotePrefix', a.quotePrefix ? '1' : undefined);
  return open + rest;
}
