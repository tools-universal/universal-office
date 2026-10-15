/**
 * Motor de cálculo de uma pasta de trabalho: células, fórmulas (normais,
 * compartilhadas, de matriz CSE, dinâmicas que derramam, tabelas de dados),
 * nomes, tabelas, links externos; grafo de dependências; recálculo completo e
 * incremental; voláteis; referência circular (com e sem cálculo iterativo).
 *
 * Ordem de cálculo: as fórmulas sujas são calculadas na ordem da planilha;
 * antes de cada uma, os precedentes ESTÁTICOS (referências do texto, nomes,
 * tabelas) ainda sujos vão para uma pilha explícita (sem recursão — cadeias
 * longas não estouram a pilha do JS). Referências dinâmicas (INDIRECT, OFFSET,
 * INDEX…) que encontram célula suja interrompem a avaliação (`NeedCell`), a
 * célula pedida é calculada e a fórmula é refeita — como a cadeia de cálculo
 * do Excel.
 * Dono: agente CORE.
 */
import { a1ToArea, areasOverlap, areaContains } from './a1.js';
import { implicitIntersection } from './apply.js';
import { walk, type Node } from './ast.js';
import { CellCtx, Evaluator, type EvalHost, type TableDef } from './evaluate.js';
import { EN_US, lookupFn, type ValueLocale } from './fn.js';
import { parseFormula, FormulaSyntaxError } from './parse.js';
import { printFormula } from './print.js';
import { implicitPositions, legacyToDynamic } from './implicit.js';
import { setComputedCriterion } from './functions/database.js';
import { ArrayValue, CalcError, ERR, LambdaValue, MAX_COL, MAX_ROW, RefValue, type Area, type Scalar, type Value } from './values.js';
import type { CalcWorkbook, CellInput, FormulaInput } from './workbook.js';

/** Índices de aba a partir daqui são abas de pastas externas (cache do externalLink). */
export const EXTERNAL_BASE = 1 << 20;
const EXT_STRIDE = 4096;
const W = MAX_COL + 1;
const key = (r: number, c: number): number => r * W + c;

/** Fórmula de uma célula (âncora, no caso de matriz). */
export interface FormulaRec {
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
  node: Node | undefined;
  /**
   * Árvore avaliada: a legada (sem t="array") ganha os "@" que o Excel 365 insere
   * ao abri-la (implicit.ts) e é avaliada como dinâmica, sem derramar.
   */
  exec?: Node;
  /** Texto canônico como veio (vazio = filha de compartilhada: imprime do AST). */
  text: string;
  kind: 'normal' | 'array' | 'dataTable';
  /** Matriz dinâmica (derrama). */
  dynamic: boolean;
  /** CSE: área fixa; dinâmica: área derramada atual (undefined = uma célula). */
  area?: Area;
  volatile: boolean;
  hasSubtotal: boolean;
  dirty: boolean;
  onStack: boolean;
  scanPass: number;
  deps?: Area[];
  /** Texto original do <f> (para gravar de volta). */
  readonly input?: FormulaInput;
  /**
   * Valor em cache do arquivo guardado à parte com `ignoreCache`: num ciclo o
   * Excel parte do valor anterior (o do arquivo), não de 0 (medido no corpus:
   * iterativo com 1 passo a partir do cache).
   */
  cached?: Scalar;
  /** Já calculada nesta sessão. */
  computed?: boolean;
}

interface CellRec {
  v: Scalar;
  f?: FormulaRec;
  /** Célula preenchida pela matriz (CSE ou derramamento) de outra célula. */
  owner?: FormulaRec;
}

class NeedCell {
  constructor(readonly rec: FormulaRec) {}
}

interface ColIndex { rows: number[]; sorted: boolean }

class SheetStore {
  readonly cells = new Map<number, CellRec>();
  private readonly colRows = new Map<number, ColIndex>();
  readonly hidden = new Set<number>();
  readonly filtered = new Set<number>();
  merges: Area[] = [];
  maxRow = -1;
  constructor(readonly name: string, readonly index: number) {}

  get(r: number, c: number): CellRec | undefined { return this.cells.get(key(r, c)); }

  set(r: number, c: number, rec: CellRec): void {
    const k = key(r, c);
    if (!this.cells.has(k)) {
      let ci = this.colRows.get(c);
      if (!ci) { ci = { rows: [], sorted: true }; this.colRows.set(c, ci); }
      if (ci.sorted && ci.rows.length && ci.rows[ci.rows.length - 1]! > r) ci.sorted = false;
      ci.rows.push(r);
      if (r > this.maxRow) this.maxRow = r;
    }
    this.cells.set(k, rec);
  }

  delete(r: number, c: number): void {
    if (!this.cells.delete(key(r, c))) return;
    const ci = this.colRows.get(c);
    if (!ci) return;
    const i = ci.rows.indexOf(r);
    if (i >= 0) ci.rows.splice(i, 1);
  }

  private rowsOf(c: number): number[] | undefined {
    const ci = this.colRows.get(c);
    if (!ci) return undefined;
    if (!ci.sorted) { ci.rows.sort((a, b) => a - b); ci.sorted = true; }
    return ci.rows;
  }

  /** Células existentes da área, linha a linha. */
  each(a: Area, fn: (r: number, c: number, rec: CellRec) => void): void {
    const h = a.r2 - a.r1 + 1, w = a.c2 - a.c1 + 1;
    if (h * w <= 512 || h * w <= this.cells.size) {
      for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) {
        const rec = this.cells.get(key(r, c));
        if (rec) fn(r, c, rec);
      }
      return;
    }
    const cols: number[] = [];
    if (w <= this.colRows.size) { for (let c = a.c1; c <= a.c2; c++) if (this.colRows.has(c)) cols.push(c); }
    else { for (const c of this.colRows.keys()) if (c >= a.c1 && c <= a.c2) cols.push(c); cols.sort((x, y) => x - y); }
    if (cols.length === 1) {
      const c = cols[0]!, rows = this.rowsOf(c)!;
      for (let i = lowerBound(rows, a.r1); i < rows.length && rows[i]! <= a.r2; i++) {
        const r = rows[i]!;
        const rec = this.cells.get(key(r, c));
        if (rec) fn(r, c, rec);
      }
      return;
    }
    const keys: number[] = [];
    for (const c of cols) {
      const rows = this.rowsOf(c)!;
      for (let i = lowerBound(rows, a.r1); i < rows.length && rows[i]! <= a.r2; i++) keys.push(key(rows[i]!, c));
    }
    keys.sort((x, y) => x - y);
    for (const k of keys) {
      const rec = this.cells.get(k);
      if (rec) fn(Math.floor(k / W), k % W, rec);
    }
  }
}

function lowerBound(a: number[], x: number): number {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m]! < x) lo = m + 1; else hi = m; }
  return lo;
}

export interface EngineOptions {
  /** Convenções de valor (texto↔número, VERDADEIRO…). Padrão en-US. */
  readonly locale?: ValueLocale;
  /** "Agora" como serial do Excel (padrão: relógio local). */
  readonly now?: () => number;
  readonly random?: () => number;
  /** Ignora os valores em cache das fórmulas (recalcula do zero; fórmulas começam em 0). */
  readonly ignoreCache?: boolean;
  /** Formatação da célula para CELL("format"/"color"/"parentheses"/"prefix"/"protect"/"width"). */
  readonly cellInfo?: (sheet: number, row: number, col: number, what: string) => Scalar | undefined;
  /**
   * Caminho completo do arquivo da pasta (CELL("filename") → "dir\[pasta.xlsx]Aba",
   * CELL("address") de outra aba, INFO("directory")). Ausente = pasta não salva ("").
   */
  readonly fileName?: string;
}

/** Serial do Excel do instante atual no fuso local. */
export function nowSerial(): number {
  const d = new Date();
  return (d.getTime() - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
}

interface ExtBook { sheets: { name: string; cells: Map<number, Scalar> }[] }

export class Engine implements EvalHost {
  readonly locale: ValueLocale;
  readonly date1904: boolean;
  readonly ev: Evaluator;
  private readonly sheets: SheetStore[] = [];
  private readonly sheetByName = new Map<string, number>();
  private readonly names = new Map<string, Node | null>();
  private readonly tables: TableDef[] = [];
  private readonly tableByName = new Map<string, TableDef>();
  private readonly ext: ExtBook[] = [];
  private readonly formulas = new Set<FormulaRec>();
  private ordered: FormulaRec[] | undefined;
  private readonly rangeMasters = new Set<FormulaRec>();
  private readonly formulaCols: Map<number, ColIndex>[] = [];
  private readonly dirtyCount = new Map<number, number>();
  private computing = false;
  private pass = 0;
  private readonly stale = new Set<FormulaRec>();
  /** Fórmulas que participaram de referência circular no último cálculo. */
  readonly circular = new Set<FormulaRec>();
  /** Exceções inesperadas de funções (bugs), por célula — o valor vira #VALUE!. */
  readonly internalErrors: { sheet: number; row: number; col: number; error: unknown }[] = [];
  private nowValue = 0;
  private readonly iterate: { on: boolean; count: number; delta: number };
  private rev: { byCol: Map<number, { r1: number; r2: number; f: FormulaRec }[]>; wide: { a: Area; f: FormulaRec }[] }[] | undefined;
  private spillChanged: Area[] = [];
  /** Memória das funções durante um recálculo (zerada a cada passada: os valores podem mudar entre passadas). */
  readonly cache = new Map<string, unknown>();
  /** Células cujo valor mudou (aba → chaves), para a UI repintar/gravar. */
  private readonly changes = new Map<number, Set<number>>();

  constructor(wb: CalcWorkbook, private readonly opts: EngineOptions = {}) {
    this.locale = opts.locale ?? EN_US;
    this.date1904 = !!wb.date1904;
    this.ev = new Evaluator(this);
    this.iterate = { on: !!wb.calc?.iterate, count: wb.calc?.iterateCount ?? 100, delta: wb.calc?.iterateDelta ?? 0.001 };
    wb.sheets.forEach((s, i) => {
      const st = new SheetStore(s.name, i);
      this.sheets.push(st);
      this.formulaCols.push(new Map());
      this.sheetByName.set(s.name.toUpperCase(), i);
      for (const r of s.hiddenRows ?? []) st.hidden.add(r);
      for (const r of s.filteredRows ?? []) st.filtered.add(r);
      for (const m of s.merges ?? []) { const a = a1ToArea(m, i); if (a) st.merges.push(a); }
    });
    for (const n of wb.names ?? []) {
      let node: Node | null = null;
      try { node = parseFormula(n.formula); } catch (e) { if (!(e instanceof FormulaSyntaxError)) throw e; }
      const k = `${n.sheet ?? -1}|${n.name.toUpperCase()}`;
      this.names.set(k, node);
      if (/^_xlnm\./i.test(n.name)) this.names.set(`${n.sheet ?? -1}|${n.name.slice(6).toUpperCase()}`, node);
    }
    for (const t of wb.tables ?? []) {
      const area = a1ToArea(t.ref, t.sheet);
      if (!area) continue;
      const def: TableDef = { name: t.name, sheet: t.sheet, area, headerRows: t.headerRowCount, totalsRows: t.totalsRowCount, columns: t.columns };
      this.tables.push(def);
      this.tableByName.set(t.name.toUpperCase(), def);
    }
    for (const x of wb.externals ?? []) {
      this.ext.push({
        sheets: x.sheets.map((s) => {
          const cells = new Map<number, Scalar>();
          for (const [r, c, v] of s.cells) cells.set(key(r, c), v);
          return { name: s.name, cells };
        }),
      });
    }
    // células: 1º as âncoras de compartilhadas (as filhas usam o AST delas)
    const shared = new Map<string, { node: Node | undefined; row: number; col: number; text: string }>();
    wb.sheets.forEach((s, si) => {
      for (const [r, c, inp] of s.cells) {
        const f = inp.f;
        if (f?.t === 'shared' && f.si !== undefined && f.text) shared.set(`${si}|${f.si}`, { node: this.parse(f.text, r, c), row: r, col: c, text: f.text });
      }
    });
    wb.sheets.forEach((s, si) => {
      const st = this.sheets[si]!;
      for (const [r, c, inp] of s.cells) this.load(st, r, c, inp, shared);
    });
  }

  private parse(text: string, row: number, col: number): Node | undefined {
    try { return parseFormula(text, { row, col }); } catch (e) { if (e instanceof FormulaSyntaxError) return undefined; throw e; }
  }

  private load(st: SheetStore, r: number, c: number, inp: CellInput, shared: Map<string, { node: Node | undefined; text: string }>): void {
    // <f ca="1"/> sem texto (célula derramada de matriz volátil) não é fórmula; só a filha de compartilhada é
    const f = inp.f && (inp.f.text || (inp.f.t === 'shared' && inp.f.si !== undefined)) ? inp.f : undefined;
    const existing = st.get(r, c);
    if (!f) {
      if (inp.v === null || inp.v === undefined) return;
      // célula de matriz/derramamento já marcada pela âncora: guarda o valor em cache
      if (existing?.owner) { existing.v = inp.v; return; }
      st.set(r, c, { v: inp.v });
      return;
    }
    let node: Node | undefined, text = f.text;
    if (f.t === 'shared' && f.si !== undefined) {
      const m = shared.get(`${st.index}|${f.si}`);
      node = text ? this.parse(text, r, c) : m?.node;
      if (!text) text = '';
    } else node = this.parse(text, r, c);
    const kind = f.t === 'array' ? 'array' : f.t === 'dataTable' ? 'dataTable' : 'normal';
    const rec: FormulaRec = {
      sheet: st.index, row: r, col: c, node, text, kind, dynamic: kind === 'array' && !!f.dynamic,
      volatile: !!f.ca, hasSubtotal: false, dirty: false, onStack: false, scanPass: -1, input: f,
    };
    if (node) this.analyze(rec, node);
    const v = this.opts.ignoreCache && kind !== 'dataTable' ? 0 : (inp.v ?? (kind === 'dataTable' ? null : 0));
    if (this.opts.ignoreCache && inp.v !== undefined && inp.v !== null) rec.cached = inp.v;
    st.set(r, c, { v, f: rec });
    this.addFormula(rec);
    if ((kind === 'array' || kind === 'dataTable') && f.ref) {
      const a = a1ToArea(f.ref, st.index);
      if (a && (a.r1 !== a.r2 || a.c1 !== a.c2)) {
        if (kind !== 'dataTable') { rec.area = a; this.rangeMasters.add(rec); }
        for (let rr = a.r1; rr <= a.r2; rr++) for (let cc = a.c1; cc <= a.c2; cc++) {
          if (rr === r && cc === c) continue;
          const old = st.get(rr, cc);
          if (old?.f) continue;
          if (kind === 'dataTable') continue;
          st.set(rr, cc, { v: this.opts.ignoreCache ? null : old?.v ?? null, owner: rec });
        }
      } else if (kind === 'array' && rec.dynamic) this.rangeMasters.add(rec);
    }
  }

  private readonly execCache = new WeakMap<Node, Node>();

  /** O nome definido pode valer várias células (para o @ da fórmula legada)? */
  private nameIsMulti(sheet: number, name: string): boolean {
    const d = this.definedName(name, sheet);
    if (!d) return true;
    const e = d.t === 'paren' ? d.e : d;
    return !(e.t === 'cell' || e.t === 'num' || e.t === 'str' || e.t === 'bool' || e.t === 'err');
  }

  private analyze(rec: FormulaRec, node: Node): void {
    if (rec.kind === 'normal') {
      let ex = this.execCache.get(node);
      if (!ex) { ex = legacyToDynamic(node, { nameIsMulti: (nm) => this.nameIsMulti(rec.sheet, nm) }); this.execCache.set(node, ex); }
      rec.exec = ex;
    }
    walk(node, (n) => {
      if (n.t === 'name' && !n.param && !n.eta && this.nameVolatile(n.name, rec.sheet)) rec.volatile = true;
      if (n.t !== 'fn') return;
      if (n.name === 'SUBTOTAL' || n.name === 'AGGREGATE') rec.hasSubtotal = true;
      if (lookupFn(n.name)?.volatile) rec.volatile = true;
    });
  }

  private readonly volatileNames = new Map<string, boolean>();
  /** O nome definido usa função volátil (direta ou por outro nome)? Ex.: X = SUM(OFFSET(…)). */
  private nameVolatile(name: string, sheet: number, depth = 0): boolean {
    const k = `${sheet}|${name.toUpperCase()}`;
    const hit = this.volatileNames.get(k);
    if (hit !== undefined) return hit;
    this.volatileNames.set(k, false);
    const d = this.definedName(name, sheet);
    let v = false;
    if (d && depth < 20) {
      walk(d, (n) => {
        if (n.t === 'fn' && lookupFn(n.name)?.volatile) v = true;
        else if (n.t === 'name' && !n.param && this.nameVolatile(n.name, sheet, depth + 1)) v = true;
      });
    }
    this.volatileNames.set(k, v);
    return v;
  }

  private addFormula(rec: FormulaRec): void {
    this.formulas.add(rec);
    this.ordered = undefined;
    this.rev = undefined;
    const fc = this.formulaCols[rec.sheet]!;
    let ci = fc.get(rec.col);
    if (!ci) { ci = { rows: [], sorted: true }; fc.set(rec.col, ci); }
    if (ci.rows.length && ci.rows[ci.rows.length - 1]! > rec.row) ci.sorted = false;
    ci.rows.push(rec.row);
  }

  private removeFormula(rec: FormulaRec): void {
    if (!this.formulas.delete(rec)) return;
    this.setDirty(rec, false);
    this.rangeMasters.delete(rec);
    this.ordered = undefined;
    this.rev = undefined;
    const ci = this.formulaCols[rec.sheet]!.get(rec.col);
    if (ci) { const i = ci.rows.indexOf(rec.row); if (i >= 0) ci.rows.splice(i, 1); }
  }

  private setDirty(f: FormulaRec, d: boolean): void {
    if (f.dirty === d) return;
    f.dirty = d;
    const k = f.sheet * W + f.col;
    this.dirtyCount.set(k, (this.dirtyCount.get(k) ?? 0) + (d ? 1 : -1));
  }

  // ---------------------------------------------------------------- EvalHost

  sheetCount(): number { return this.sheets.length; }
  sheetName(i: number): string {
    if (i >= EXTERNAL_BASE) {
      const b = Math.floor((i - EXTERNAL_BASE) / EXT_STRIDE), s = (i - EXTERNAL_BASE) % EXT_STRIDE;
      return `[${b + 1}]${this.ext[b]?.sheets[s]?.name ?? ''}`;
    }
    return this.sheets[i]?.name ?? '';
  }
  sheetIndex(name: string): number | undefined { return this.sheetByName.get(name.toUpperCase()); }
  externalSheet(ext: number, name: string): number | undefined {
    const b = this.ext[ext - 1];
    if (!b) return undefined;
    const i = b.sheets.findIndex((s) => s.name.toUpperCase() === name.toUpperCase());
    return i < 0 ? undefined : EXTERNAL_BASE + (ext - 1) * EXT_STRIDE + i;
  }

  private extCells(sheet: number): Map<number, Scalar> | undefined {
    const b = Math.floor((sheet - EXTERNAL_BASE) / EXT_STRIDE), s = (sheet - EXTERNAL_BASE) % EXT_STRIDE;
    return this.ext[b]?.sheets[s]?.cells;
  }

  /** Valor de célula para as fórmulas (calcula antes o que estiver sujo). */
  cell(sheet: number, row: number, col: number): Scalar {
    if (sheet >= EXTERNAL_BASE) return this.extCells(sheet)?.get(key(row, col)) ?? null;
    const rec = this.sheets[sheet]?.get(row, col);
    if (!rec) return null;
    this.check(rec);
    return rec.v;
  }

  private check(rec: CellRec): void {
    if (!this.computing) return;
    const p = rec.f ?? rec.owner;
    if (p && p.dirty && !this.stale.has(p)) throw new NeedCell(p);
  }

  forEachCell(area: Area, fn: (v: Scalar, row: number, col: number) => void): void {
    if (area.sheet >= EXTERNAL_BASE) {
      const cells = this.extCells(area.sheet);
      if (!cells) return;
      const hits: number[] = [];
      for (const k of cells.keys()) {
        const r = Math.floor(k / W), c = k % W;
        if (r >= area.r1 && r <= area.r2 && c >= area.c1 && c <= area.c2) hits.push(k);
      }
      hits.sort((a, b) => a - b);
      for (const k of hits) fn(cells.get(k)!, Math.floor(k / W), k % W);
      return;
    }
    const st = this.sheets[area.sheet];
    if (!st) return;
    // célula suja interrompe (NeedCell) — a função é refeita depois, sem estado parcial
    if (this.computing) st.each(area, (r, c, rec) => { this.check(rec); fn(rec.v, r, c); });
    else st.each(area, (r, c, rec) => fn(rec.v, r, c));
  }

  values(area: Area): ArrayValue {
    let { r2 } = area;
    const rows0 = area.r2 - area.r1 + 1, cols = area.c2 - area.c1 + 1;
    // referência absurda (planilha inteira): limita às linhas usadas
    if (rows0 * cols > 1 << 24) {
      const st = area.sheet < EXTERNAL_BASE ? this.sheets[area.sheet] : undefined;
      r2 = Math.max(area.r1, Math.min(area.r2, (st?.maxRow ?? 0)));
    }
    const rows = r2 - area.r1 + 1;
    const data: Scalar[] = new Array(rows * cols).fill(null);
    this.forEachCell({ ...area, r2 }, (v, r, c) => { data[(r - area.r1) * cols + (c - area.c1)] = v; });
    return new ArrayValue(rows, cols, data);
  }

  formulaText(sheet: number, row: number, col: number): string | undefined {
    const rec = this.sheets[sheet]?.get(row, col);
    const f = rec?.f ?? (rec?.owner && !rec.owner.dynamic ? rec.owner : undefined);
    if (!f?.node) return f ? f.text || undefined : undefined;
    return this.sourceText(f) ?? printFormula(f.exec ?? f.node, { row: f.row, col: f.col, ui: true });
  }

  /**
   * Texto original da fórmula (com os espaços do usuário, forma do arquivo) com
   * os "@" da conversão legada inseridos; undefined se não houver texto próprio.
   */
  private sourceText(f: FormulaRec): string | undefined {
    if (!f.text) return undefined;
    if (!f.exec || f.exec === f.node) return f.text;
    const pos = implicitPositions(f.exec);
    if (pos.some((p) => p < 0)) return undefined;
    let t = f.text;
    for (const p of [...new Set(pos)].sort((a, b) => b - a)) t = t.slice(0, p) + '@' + t.slice(p);
    return t;
  }

  isSubtotalCell(sheet: number, row: number, col: number): boolean {
    const rec = this.sheets[sheet]?.get(row, col);
    return !!(rec?.f ?? rec?.owner)?.hasSubtotal;
  }
  rowHidden(sheet: number, row: number): boolean { return !!this.sheets[sheet]?.hidden.has(row); }
  rowFiltered(sheet: number, row: number): boolean { return !!this.sheets[sheet]?.filtered.has(row); }
  now(): number { return this.nowValue || (this.nowValue = this.opts.now?.() ?? nowSerial()); }
  random(): number { return this.opts.random?.() ?? Math.random(); }

  definedName(name: string, sheet: number): Node | undefined {
    const u = name.toUpperCase();
    const local = this.names.get(`${sheet}|${u}`);
    if (local !== undefined) return local ?? { t: 'err', v: '#NAME?' };
    const global = this.names.get(`-1|${u}`);
    if (global !== undefined) return global ?? { t: 'err', v: '#NAME?' };
    // nome de tabela usado sozinho (=Tabela1) = dados da tabela
    if (this.tableByName.has(u)) return { t: 'table', table: name, items: [] };
    return undefined;
  }
  table(name: string): TableDef | undefined { return this.tableByName.get(name.toUpperCase()); }
  tableAt(sheet: number, row: number, col: number): TableDef | undefined {
    return this.tables.find((t) => areaContains(t.area, sheet, row, col));
  }

  /**
   * A1#: área derramada da âncora; fórmula comum (não dinâmica) vale a própria
   * célula (medido: =_xlfn.ANCHORARRAY(I95) com I95 =SUM(60) → 60); constante → #REF!.
   */
  spillArea(sheet: number, row: number, col: number): Area | undefined {
    const rec = this.sheets[sheet]?.get(row, col);
    const f = rec?.f;
    if (!f) return undefined;
    if (this.computing && f.dirty && !this.stale.has(f)) throw new NeedCell(f);
    return f.area ?? { sheet, r1: row, c1: col, r2: row, c2: col };
  }

  cellInfo(sheet: number, row: number, col: number, what: string): Scalar | undefined {
    const own = this.opts.cellInfo?.(sheet, row, col, what);
    if (own !== undefined) return own;
    const fn = this.opts.fileName;
    if (!fn) return undefined;
    const cut = Math.max(fn.lastIndexOf('\\'), fn.lastIndexOf('/'));
    const dir = fn.slice(0, cut + 1), base = fn.slice(cut + 1);
    switch (what) {
      case 'filename': return `${dir}[${base}]${this.sheetName(sheet)}`;
      case 'bookname': return base;
      case 'directory': return dir;
      default: return undefined;
    }
  }

  // ---------------------------------------------------------------- leitura pública

  /** Valor atual da célula (sem calcular). */
  getValue(sheet: number, row: number, col: number): Scalar {
    return this.sheets[sheet]?.get(row, col)?.v ?? null;
  }

  /** Fórmula da célula (âncora/própria), se houver. */
  getFormula(sheet: number, row: number, col: number): FormulaRec | undefined {
    return this.sheets[sheet]?.get(row, col)?.f;
  }

  /** Célula preenchida por matriz/derramamento de outra: a âncora. */
  getOwner(sheet: number, row: number, col: number): FormulaRec | undefined {
    return this.sheets[sheet]?.get(row, col)?.owner;
  }

  /** Texto da fórmula como a UI mostra ("=SUM(A1:A3)", "=@A1:A3", "=B1#"), ou undefined. */
  formulaDisplay(sheet: number, row: number, col: number): string | undefined {
    const f = this.getFormula(sheet, row, col);
    if (!f) return undefined;
    if (!f.node) return f.text ? `=${f.text}` : undefined;
    return '=' + printFormula(f.exec ?? f.node, { row, col, ui: true });
  }

  /** Área derramada pela âncora (sheet,row,col), se houver. */
  spillOf(sheet: number, row: number, col: number): Area | undefined {
    const f = this.getFormula(sheet, row, col);
    return f?.dynamic ? f.area : undefined;
  }

  /**
   * Critério calculado das D-funções: a fórmula da célula de critério avaliada
   * como se estivesse `offset` linhas abaixo (as referências relativas apontam
   * para o 1º registro e descem com ele). undefined = célula sem fórmula.
   */
  criterionAt(sheet: number, row: number, col: number, offset: number): boolean | undefined {
    const f = this.getFormula(sheet, row, col);
    if (!f?.node) return undefined;
    const ctx = this.ev.context(sheet, row + offset, col, true);
    const v = topScalar(this.ev.evalFormula(f.exec ?? f.node, ctx), ctx);
    return v === true || (typeof v === 'number' && v !== 0);
  }

  /** Fórmulas que dependem (transitivamente) das dadas — para a UI (rastrear dependentes) e o harness. */
  dependentsOf(seeds: readonly FormulaRec[]): Set<FormulaRec> {
    const out = new Set<FormulaRec>();
    const queue = seeds.map((f) => this.areaOf(f));
    while (queue.length) {
      for (const g of this.dependentsOfArea(queue.pop()!)) {
        if (out.has(g)) continue;
        out.add(g);
        queue.push(this.areaOf(g));
      }
    }
    return out;
  }

  /** Todas as fórmulas (âncoras), na ordem da planilha. */
  allFormulas(): readonly FormulaRec[] {
    if (!this.ordered) {
      this.ordered = [...this.formulas].sort((a, b) => a.sheet - b.sheet || a.row - b.row || a.col - b.col);
    }
    return this.ordered;
  }

  /** Avalia uma fórmula avulsa (texto canônico) como se estivesse em (sheet,row,col), sem gravar. */
  evaluate(text: string, sheet = 0, row = 0, col = 0, dynamic = true): Value {
    const node = parseFormula(text, { row, col });
    const ctx = this.ev.context(sheet, row, col, dynamic);
    return this.ev.evalFormula(node, ctx);
  }

  // ---------------------------------------------------------------- edição

  /**
   * Troca o conteúdo de uma célula (constante, fórmula ou vazio) e marca os
   * dependentes como sujos. Chame `calculate()` depois (pode agrupar várias).
   * Fórmula sem `t` digitada na UI: passe `{ text, t: 'array', dynamic: true }`
   * para a semântica do 365 (derrama).
   */
  setCell(sheet: number, row: number, col: number, inp: CellInput | undefined): void {
    const st = this.sheets[sheet];
    if (!st) return;
    const changed: Area[] = [{ sheet, r1: row, c1: col, r2: row, c2: col }];
    const old = st.get(row, col);
    if (old?.f) {
      const f = old.f;
      if (f.area) { changed.push(f.area); this.clearArea(f); }
      this.removeFormula(f);
    }
    const owner = old?.owner;
    st.delete(row, col);
    this.touch(sheet, row, col);
    if (inp?.f) {
      const node = this.parse(inp.f.text, row, col);
      const kind = inp.f.t === 'array' ? 'array' : 'normal';
      const rec: FormulaRec = {
        sheet, row, col, node, text: inp.f.text, kind, dynamic: kind === 'array' && !!inp.f.dynamic,
        volatile: !!inp.f.ca, hasSubtotal: false, dirty: false, onStack: false, scanPass: -1, input: inp.f,
      };
      if (node) this.analyze(rec, node);
      st.set(row, col, { v: 0, f: rec });
      this.addFormula(rec);
      if (rec.dynamic) this.rangeMasters.add(rec);
      if (kind === 'array' && !rec.dynamic && inp.f.ref) {
        const a = a1ToArea(inp.f.ref, sheet);
        if (a) {
          rec.area = a; this.rangeMasters.add(rec);
          for (let rr = a.r1; rr <= a.r2; rr++) for (let cc = a.c1; cc <= a.c2; cc++) {
            if (rr !== row || cc !== col) st.set(rr, cc, { v: null, owner: rec });
          }
          changed.push(a);
        }
      }
      this.setDirty(rec, true);
    } else if (inp && inp.v !== null && inp.v !== undefined) {
      st.set(row, col, { v: inp.v });
    }
    // a célula estava num derramamento: a âncora precisa reavaliar (#SPILL! ou não)
    if (owner && owner.dynamic) this.setDirty(owner, true);
    // derramamentos que agora podem estar bloqueados/desbloqueados
    for (const m of this.rangeMasters) {
      if (m.dynamic && m.sheet === sheet && (m.area ? areaContains(m.area, sheet, row, col) : false)) this.setDirty(m, true);
      if (m.dynamic && m.sheet === sheet && m.row <= row && m.col <= col) {
        const v = st.get(m.row, m.col)?.v;
        if (v instanceof CalcError && v.code === '#SPILL!') this.setDirty(m, true);
      }
    }
    this.markDependents(changed);
  }

  // ---------------------------------------------------------------- cálculo

  /** Recálculo completo (Ctrl+Alt+F9): todas as fórmulas. */
  recalc(): void {
    for (const f of this.formulas) if (f.kind !== 'dataTable') this.setDirty(f, true);
    this.run();
  }

  /** Cálculo do que está sujo + voláteis (F9 / depois de edições). */
  calculate(): void {
    const vol: Area[] = [];
    for (const f of this.formulas) if (f.volatile && f.kind !== 'dataTable') { this.setDirty(f, true); vol.push(this.areaOf(f)); }
    if (vol.length) this.markDependents(vol);
    this.run();
  }

  /**
   * Calcula SÓ as fórmulas dadas ([aba, linha, coluna], âncoras) e os
   * precedentes delas ainda sujos, SEM sujar os dependentes — o recálculo
   * parcial do Excel ao abrir (fórmulas com `ca="1"` e sem valor em cache;
   * ver open-recalc.ts). Os demais valores ficam os do arquivo.
   */
  calculateCells(cells: Iterable<readonly [number, number, number]>): void {
    for (const [s, r, c] of cells) {
      const f = this.getFormula(s, r, c);
      if (f && f.kind !== 'dataTable') this.setDirty(f, true);
    }
    this.run();
  }

  private areaOf(f: FormulaRec): Area {
    return f.area ?? { sheet: f.sheet, r1: f.row, c1: f.col, r2: f.row, c2: f.col };
  }

  private run(): void {
    this.nowValue = 0;
    this.cache.clear();
    this.circular.clear();
    for (let round = 0; round < 10; round++) {
      this.spillChanged = [];
      this.computeDirty();
      if (!this.spillChanged.length) break;
      const changed = this.spillChanged;
      this.spillChanged = [];
      this.markDependents(changed);
      if (![...this.formulas].some((f) => f.dirty)) break;
    }
    if (this.iterate.on && this.circular.size) this.iterateCycles();
    this.cache.clear();
  }

  private computeDirty(): void {
    this.cache.clear();
    this.computing = true;
    this.pass++;
    try {
      for (const f of this.allFormulas()) if (f.dirty) this.computeRoot(f);
    } finally {
      this.computing = false;
      this.stale.clear();
    }
  }

  /**
   * Calcula `root` e o que ela precisa, com pilha explícita. Cada quadro sabe se
   * entrou por precedente estático ("mole": talvez nem seja lido, ex. ramo do IF
   * não escolhido) ou porque a avaliação de fato leu a célula ("duro"). Ciclo
   * real = só arestas duras; um ciclo com aresta mole desfaz os quadros moles e
   * tenta de novo sem eles.
   */
  private computeRoot(root: FormulaRec): void {
    const stack: FormulaRec[] = [root];
    const hard: boolean[] = [true];
    root.onStack = true;
    const pop = (): void => { stack.pop()!.onStack = false; hard.pop(); };
    while (stack.length) {
      const f = stack[stack.length - 1]!;
      if (!f.dirty) { pop(); continue; }
      if (f.scanPass !== this.pass) {
        f.scanPass = this.pass;
        let pushed = false;
        for (const g of this.pendingPrecedents(f)) {
          if (g === f || g.onStack) continue;
          g.onStack = true;
          stack.push(g);
          hard.push(false);
          pushed = true;
        }
        if (pushed) continue;
      }
      try {
        this.evaluateRec(f);
        f.computed = true;
        this.setDirty(f, false);
        pop();
      } catch (e) {
        if (!(e instanceof NeedCell)) throw e;
        const g = e.rec;
        if (!g.onStack) { g.onStack = true; stack.push(g); hard.push(true); continue; }
        const i = stack.lastIndexOf(g);
        // quadro mole acima de g: desfaz a partir dele (continua sujo; volta depois)
        let k = -1;
        for (let j = i + 1; j < stack.length; j++) if (!hard[j]) { k = j; break; }
        if (k >= 0) { while (stack.length > k) pop(); continue; }
        // ciclo real: g … f
        const members = stack.slice(i);
        for (const m of members) {
          this.circular.add(m);
          // ainda não calculada: o "valor anterior" é o do arquivo
          if (!m.computed && m.cached !== undefined) { const rec = this.sheets[m.sheet]!.get(m.row, m.col); if (rec) rec.v = m.cached; }
        }
        // o ciclo não é calculado aqui: ficam os valores anteriores (sem iterativo é o
        // resultado final; com iterativo, iterateCycles() varre o ciclo depois)
        for (const m of members) this.setDirty(m, false);
        while (stack.length > i) pop();
      }
    }
  }

  /** Precedentes estáticos ainda sujos. */
  private pendingPrecedents(f: FormulaRec): FormulaRec[] {
    const out: FormulaRec[] = [];
    for (const a of this.depsOf(f)) {
      if (a.sheet >= EXTERNAL_BASE) continue;
      const st = this.sheets[a.sheet];
      const fc = this.formulaCols[a.sheet];
      if (!st || !fc) continue;
      const visit = (c: number): void => {
        if (!this.dirtyCount.get(a.sheet * W + c)) return;
        const ci = fc.get(c);
        if (!ci) return;
        if (!ci.sorted) { ci.rows.sort((x, y) => x - y); ci.sorted = true; }
        for (let i = lowerBound(ci.rows, a.r1); i < ci.rows.length && ci.rows[i]! <= a.r2; i++) {
          const g = st.get(ci.rows[i]!, c)?.f;
          if (g && g.dirty && !this.stale.has(g)) out.push(g);
        }
      };
      if (a.c2 - a.c1 + 1 <= fc.size) for (let c = a.c1; c <= a.c2; c++) visit(c);
      else for (const c of fc.keys()) if (c >= a.c1 && c <= a.c2) visit(c);
      for (const m of this.rangeMasters) {
        if (m.dirty && !this.stale.has(m) && m.area && areasOverlap(m.area, a)) out.push(m);
      }
    }
    return out;
  }

  /** Áreas referenciadas no texto (referências, nomes, tabelas), resolvidas para a célula. */
  private depsOf(f: FormulaRec): Area[] {
    if (f.deps) return f.deps;
    const out: Area[] = [];
    if (f.node) {
      const ctx = this.ev.context(f.sheet, f.row, f.col);
      const seen = new Set<Node>();
      const visit = (n: Node, depth: number): void => walk(n, (x) => {
        if (x.t === 'cell' || x.t === 'area' || x.t === 'table') {
          const v = this.ev.evalNode(x, { ctx, arr: true, env: undefined });
          if (v instanceof RefValue) out.push(...v.areas);
        } else if (x.t === 'name' && depth < 20) {
          const d = this.definedName(x.name, f.sheet);
          if (d && !seen.has(d)) { seen.add(d); visit(d, depth + 1); }
        } else if (x.t === 'fn' && !lookupFn(x.name) && depth < 20) {
          const d = this.definedName(x.name, f.sheet);
          if (d && !seen.has(d)) { seen.add(d); visit(d, depth + 1); }
        }
      });
      visit(f.node, 0);
    }
    f.deps = out;
    return out;
  }

  /** Marca sujas as fórmulas que dependem (transitivamente) das áreas. */
  private markDependents(changed: Area[]): void {
    const queue = [...changed];
    const seen = new Set<FormulaRec>();
    while (queue.length) {
      const a = queue.pop()!;
      for (const f of this.dependentsOfArea(a)) {
        if (seen.has(f)) continue;
        seen.add(f);
        if (f.kind === 'dataTable') continue;
        this.setDirty(f, true);
        queue.push(this.areaOf(f));
      }
    }
  }

  private dependentsOfArea(a: Area): FormulaRec[] {
    if (!this.rev) {
      this.rev = this.sheets.map(() => ({ byCol: new Map(), wide: [] }));
      for (const f of this.formulas) {
        for (const d of this.depsOf(f)) {
          const ix = this.rev[d.sheet];
          if (!ix) continue;
          if (d.c2 - d.c1 < 64) {
            for (let c = d.c1; c <= d.c2; c++) {
              let l = ix.byCol.get(c);
              if (!l) { l = []; ix.byCol.set(c, l); }
              l.push({ r1: d.r1, r2: d.r2, f });
            }
          } else ix.wide.push({ a: d, f });
        }
      }
    }
    const ix = this.rev[a.sheet];
    if (!ix) return [];
    const out = new Set<FormulaRec>();
    const w = a.c2 - a.c1 + 1;
    if (w <= ix.byCol.size) {
      for (let c = a.c1; c <= a.c2; c++) for (const e of ix.byCol.get(c) ?? []) if (e.r1 <= a.r2 && a.r1 <= e.r2) out.add(e.f);
    } else {
      for (const [c, l] of ix.byCol) if (c >= a.c1 && c <= a.c2) for (const e of l) if (e.r1 <= a.r2 && a.r1 <= e.r2) out.add(e.f);
    }
    for (const e of ix.wide) if (areasOverlap(e.a, a)) out.add(e.f);
    return [...out];
  }

  private evaluateRec(f: FormulaRec): void {
    const st = this.sheets[f.sheet]!;
    if (f.kind === 'dataTable') return;
    const arrayFormula = f.kind === 'array';
    const ctx = this.ev.context(f.sheet, f.row, f.col, true);
    let v: Value;
    if (!f.node) v = ERR.NAME;
    else {
      try {
        v = this.ev.evalFormula(f.exec ?? f.node, ctx);
      } catch (e) {
        if (e instanceof NeedCell) throw e;
        if (e instanceof RangeError) v = ERR.NUM;
        else { this.internalErrors.push({ sheet: f.sheet, row: f.row, col: f.col, error: e }); v = ERR.VALUE; }
      }
    }
    if (!arrayFormula) { this.put(st, f, topScalar(v, ctx)); return; }
    if (f.dynamic) { this.spill(st, f, v, ctx); return; }
    // CSE: preenche a área fixa
    const arr = asArray(v, this);
    const a = f.area ?? { sheet: f.sheet, r1: f.row, c1: f.col, r2: f.row, c2: f.col };
    for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) {
      const x = arr instanceof ArrayValue ? fitAt(arr, r - a.r1, c - a.c1) : arr;
      const val = x === null ? 0 : x;
      if (r === f.row && c === f.col) this.put(st, f, val);
      else {
        const rec = st.get(r, c);
        if (rec && rec.owner === f) this.write(st, r, c, rec, val);
        else if (!rec?.f) { st.set(r, c, { v: val, owner: f }); this.touch(st.index, r, c); }
      }
    }
  }

  private put(st: SheetStore, f: FormulaRec, v: Scalar): void {
    const rec = st.get(f.row, f.col);
    if (rec) this.write(st, f.row, f.col, rec, v);
  }

  /** Grava o valor numa célula existente, anotando a mudança. */
  private write(st: SheetStore, r: number, c: number, rec: CellRec, v: Scalar): void {
    if (rec.v !== v) { rec.v = v; this.touch(st.index, r, c); }
  }

  private touch(sheet: number, r: number, c: number): void {
    let set = this.changes.get(sheet);
    if (!set) { set = new Set(); this.changes.set(sheet, set); }
    set.add(key(r, c));
  }

  /** Células cujo valor mudou desde a última chamada (recálculo, derramamento, edição). */
  takeChanges(): { sheet: number; row: number; col: number }[] {
    const out: { sheet: number; row: number; col: number }[] = [];
    for (const [sheet, set] of this.changes) for (const k of set) out.push({ sheet, row: Math.floor(k / W), col: k % W });
    this.changes.clear();
    return out;
  }

  /** Derramamento da matriz dinâmica a partir da âncora. */
  private spill(st: SheetStore, f: FormulaRec, v: Value, ctx: CellCtx): void {
    let arr: Scalar | ArrayValue;
    if (v instanceof RefValue) {
      const a = v.single;
      if (!a) arr = v.areas.some((x) => x.sheet !== v.areas[0]!.sheet) ? ERR.REF : ERR.VALUE;
      else if (a.r1 === a.r2 && a.c1 === a.c2) arr = this.cell(a.sheet, a.r1, a.c1);
      else arr = this.values(a);
    } else if (v instanceof LambdaValue) arr = ERR.CALC;
    else arr = v;
    if (arr instanceof ArrayValue && (arr.rows === 0 || arr.cols === 0)) arr = ERR.CALC;
    if (arr instanceof ArrayValue && arr.rows === 1 && arr.cols === 1) arr = arr.get(0, 0);
    const old = f.area;
    if (!(arr instanceof ArrayValue)) {
      this.clearArea(f);
      this.put(st, f, arr === null ? 0 : arr);
      if (old) this.spillChanged.push(old);
      return;
    }
    const target: Area = { sheet: f.sheet, r1: f.row, c1: f.col, r2: f.row + arr.rows - 1, c2: f.col + arr.cols - 1 };
    let blocked = target.r2 > MAX_ROW || target.c2 > MAX_COL;
    if (!blocked) {
      st.each(target, (r, c, rec) => {
        if (r === f.row && c === f.col) return;
        if (rec.f || (rec.owner && rec.owner !== f) || (!rec.owner && rec.v !== null)) blocked = true;
      });
      if (!blocked && st.merges.some((m) => areasOverlap(m, target))) blocked = true;
      // matriz dinâmica não derrama dentro de tabela (ListObject)
      if (!blocked && this.tables.some((t) => areasOverlap(t.area, target))) blocked = true;
    }
    if (blocked) {
      this.clearArea(f);
      this.put(st, f, ERR.SPILL);
      if (old) this.spillChanged.push(old);
      return;
    }
    // limpa o que sobrou do derramamento anterior
    if (old) {
      st.each(old, (r, c, rec) => {
        if (rec.owner === f && !areaContains(target, f.sheet, r, c)) { st.delete(r, c); this.touch(st.index, r, c); }
      });
    }
    for (let r = 0; r < arr.rows; r++) for (let c = 0; c < arr.cols; c++) {
      const x = arr.get(r, c);
      const val = x === null ? 0 : x;
      if (r === 0 && c === 0) { this.put(st, f, val); continue; }
      const rec = st.get(f.row + r, f.col + c);
      if (rec && rec.owner === f) this.write(st, f.row + r, f.col + c, rec, val);
      else { st.set(f.row + r, f.col + c, { v: val, owner: f }); this.touch(st.index, f.row + r, f.col + c); }
    }
    f.area = target;
    if (!old || old.r2 !== target.r2 || old.c2 !== target.c2) {
      this.spillChanged.push(target);
      if (old) this.spillChanged.push(old);
    }
    void ctx;
  }

  /** Apaga as células preenchidas pela matriz/derramamento de `f`. */
  private clearArea(f: FormulaRec): void {
    const a = f.area;
    if (!a) return;
    const st = this.sheets[f.sheet]!;
    st.each(a, (r, c, rec) => { if (rec.owner === f) { st.delete(r, c); this.touch(st.index, r, c); } });
    if (f.dynamic) f.area = undefined;
  }

  /**
   * Cálculo iterativo (calcPr iterate): varre as fórmulas dos ciclos na ordem da
   * planilha (Gauss-Seidel, cada uma já vendo o valor novo das anteriores),
   * partindo dos valores anteriores (os do arquivo); a 1ª varredura sempre
   * acontece e a parada é quando a maior mudança de uma varredura fica abaixo de
   * iterateDelta, ou em iterateCount varreduras (medido no corpus: poi-57535).
   * Depois recalcula os dependentes dos ciclos.
   */
  private iterateCycles(): void {
    const members = [...this.circular].sort((a, b) => a.sheet - b.sheet || a.row - b.row || a.col - b.col);
    const value = (f: FormulaRec): Scalar => this.sheets[f.sheet]!.get(f.row, f.col)?.v ?? null;
    this.computing = true;
    this.pass++;
    try {
      for (const m of members) this.stale.add(m);
      for (let sweep = 0; sweep < this.iterate.count; sweep++) {
        let maxDelta = 0;
        this.cache.clear();
        for (const m of members) {
          const v0 = value(m);
          // precedente sujo fora do ciclo: calcula antes (pilha normal) e tenta de novo
          for (let guard = 0; guard < 10000; guard++) {
            try { this.evaluateRec(m); m.computed = true; break; } catch (e) {
              if (!(e instanceof NeedCell)) throw e;
              this.computeRoot(e.rec);
            }
          }
          const v1 = value(m);
          if (typeof v0 === 'number' && typeof v1 === 'number') maxDelta = Math.max(maxDelta, Math.abs(v1 - v0));
          else if (v0 !== v1) maxDelta = Infinity;
        }
        if (sweep > 0 && maxDelta < this.iterate.delta) break;
      }
    } finally { this.computing = false; this.stale.clear(); }
    // dependentes dos ciclos (calculados com os valores de antes)
    const memberSet = new Set(members);
    const deps: Area[] = members.map((f) => this.areaOf(f));
    this.markDependents(deps);
    for (const m of members) this.setDirty(m, false);
    if ([...this.formulas].some((f) => f.dirty && !memberSet.has(f))) {
      const circ = new Set(this.circular);
      this.computeDirty();
      for (const c of circ) this.circular.add(c);
    }
  }
}

/** Resultado de fórmula legada numa célula: interseção implícita / canto da matriz; vazio = 0. */
function topScalar(v: Value, ctx: CellCtx): Scalar {
  let x: Scalar;
  // referência 3D no topo da fórmula → #REF! (medido: =Plan1:Plan2!A1)
  if (v instanceof RefValue && v.areas.some((a) => a.sheet !== v.areas[0]!.sheet)) x = ERR.REF;
  else if (v instanceof RefValue) x = implicitIntersection(v, ctx);
  else if (v instanceof ArrayValue) x = v.rows && v.cols ? v.get(0, 0) : ERR.VALUE;
  else if (v instanceof LambdaValue) x = ERR.CALC;
  else x = v;
  return x === null ? 0 : x;
}

function asArray(v: Value, eng: Engine): Scalar | ArrayValue {
  if (v instanceof RefValue) {
    const a = v.single;
    if (!a) return ERR.VALUE;
    return eng.values(a);
  }
  if (v instanceof LambdaValue) return ERR.CALC;
  return v;
}

/** Elemento (r,c) de uma matriz posta numa área CSE: linha/coluna única repete; fora → #N/A. */
function fitAt(a: ArrayValue, r: number, c: number): Scalar {
  const rr = a.rows === 1 ? 0 : r, cc = a.cols === 1 ? 0 : c;
  if (rr >= a.rows || cc >= a.cols) return ERR.NA;
  return a.get(rr, cc);
}

setComputedCriterion((ctx, sheet, row, col, offset) => {
  const host = ctx instanceof CellCtx ? ctx.ev.host : undefined;
  return host instanceof Engine ? host.criterionAt(sheet, row, col, offset) : undefined;
});
