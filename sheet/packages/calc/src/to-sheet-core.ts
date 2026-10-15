/**
 * Motor → modelo do sheet-core: grava nas células do modelo (o que a tela pinta
 * e o que vai para o `<sheetData>` ao salvar) os valores que o motor calculou —
 * tipo `t` e `<v>` como o Excel 365 grava (medido em pastas gravadas por ele,
 * `_lab/calc/io/out/make1`):
 * - número sem `t`; texto `t="str"` (também nas células DERRAMADAS e o `""`,
 *   que vai como `<v/>`); booleano `t="b"` 1/0; erro `t="e"` com o código;
 * - âncora de matriz dinâmica: `<f t="array" ref="área derramada">` (uma célula
 *   só: `ref="A1"`; derramamento bloqueado: a própria âncora);
 * - células derramadas: só valor (sem `<f>`), criadas/limpas conforme a área
 *   muda.
 * Tipado por ESTRUTURA (o motor não importa o sheet-core). Dono: agente CALC-IO.
 */
import { areaToA1, a1ToCell, cellToA1 } from './a1.js';
import type { Engine } from './engine.js';
import { CalcError, type Scalar } from './values.js';

export interface SyncFormulaAttrs {
  t?: 'normal' | 'array' | 'dataTable' | 'shared';
  ref?: string; si?: number; ca?: boolean; aca?: boolean;
  [k: string]: unknown;
}
export interface SyncCell {
  ref: string;
  type?: string;
  value?: string;
  formula?: string;
  formulaAttrs?: SyncFormulaAttrs;
  cm?: number;
  vm?: number;
  style?: number;
  inlineString?: unknown;
}
export interface SyncRow { r: number; cells: SyncCell[] }
export interface SyncWorksheet { rows: SyncRow[] }

/** Valor do motor → `t` e texto do `<v>` como o Excel grava numa célula de fórmula/derramada. */
export function fileCellValue(v: Scalar): { type?: 'str' | 'b' | 'e'; value: string } {
  if (typeof v === 'number') return { value: numberText(v) };
  if (typeof v === 'string') return { type: 'str', value: v };
  if (typeof v === 'boolean') return { type: 'b', value: v ? '1' : '0' };
  if (v instanceof CalcError) return { type: 'e', value: v.code };
  return { value: '0' };
}

/** Número → `<v>` (round-trip exato; "1E+20" como o Excel). */
export function numberText(v: number): string {
  if (!Number.isFinite(v)) return '0';
  if (Object.is(v, -0)) return '0';
  const s = String(v);
  return s.includes('e') ? s.replace('e', 'E') : s;
}

/** Índice das células do modelo de uma aba (linha → célula por coluna). */
class SheetIndex {
  private readonly rows = new Map<number, SyncRow>();
  private readonly cells = new Map<number, SyncCell>();
  constructor(private readonly ws: SyncWorksheet) {
    for (const row of ws.rows) {
      this.rows.set(row.r, row);
      for (const c of row.cells) {
        const p = a1ToCell(c.ref);
        if (p) this.cells.set(p.row * 16384 + p.col, c);
      }
    }
  }
  get(row: number, col: number): SyncCell | undefined { return this.cells.get(row * 16384 + col); }
  /** Cria a célula (linha criada se faltar; ordem das colunas preservada). */
  create(row: number, col: number): SyncCell {
    let r = this.rows.get(row + 1);
    if (!r) {
      r = { r: row + 1, cells: [] };
      this.rows.set(row + 1, r);
      // linhas em ordem (o serializador também ordena; a tela não depende)
      let i = this.ws.rows.length;
      while (i > 0 && this.ws.rows[i - 1]!.r > row + 1) i--;
      this.ws.rows.splice(i, 0, r);
    }
    const c: SyncCell = { ref: cellToA1(row, col) };
    let i = r.cells.length;
    while (i > 0) {
      const p = a1ToCell(r.cells[i - 1]!.ref);
      if (!p || p.col < col) break;
      i--;
    }
    r.cells.splice(i, 0, c);
    this.cells.set(row * 16384 + col, c);
    return c;
  }
  remove(row: number, col: number): void {
    const c = this.cells.get(row * 16384 + col);
    if (!c) return;
    this.cells.delete(row * 16384 + col);
    const r = this.rows.get(row + 1);
    if (r) { const i = r.cells.indexOf(c); if (i >= 0) r.cells.splice(i, 1); }
  }
}

function setValue(c: SyncCell, v: Scalar): void {
  const fv = fileCellValue(v);
  if (fv.type) c.type = fv.type; else delete c.type;
  c.value = fv.value;
  delete c.inlineString;
}

/**
 * Copia para o modelo os valores das células indicadas (as que o motor mudou —
 * `engine.takeChanges()` depois de recálculo/edição), criando as derramadas
 * novas e limpando as que saíram do derramamento; atualiza o `ref` das âncoras
 * dinâmicas. `worksheets` na ordem das abas. Devolve as abas alteradas.
 */
export function writeValues(engine: Engine, worksheets: readonly (SyncWorksheet | undefined)[],
  cells: Iterable<{ readonly sheet: number; readonly row: number; readonly col: number }>): Set<number> {
  const idx = new Map<number, SheetIndex>();
  const sheetIdx = (s: number): SheetIndex | undefined => {
    let x = idx.get(s);
    if (!x) { const ws = worksheets[s]; if (!ws) return undefined; x = new SheetIndex(ws); idx.set(s, x); }
    return x;
  };
  const touched = new Set<number>();
  for (const { sheet, row, col } of cells) {
    const si = sheetIdx(sheet);
    if (!si) continue;
    const f = engine.getFormula(sheet, row, col);
    const owner = engine.getOwner(sheet, row, col);
    let c = si.get(row, col);
    if (!f && !owner) {
      // saiu de um derramamento (ou ficou vazia): limpa o valor; sem estilo, some
      if (c && c.formula === undefined && engine.getValue(sheet, row, col) === null) {
        delete c.value; delete c.type; delete c.inlineString;
        if (c.style === undefined && c.cm === undefined && c.vm === undefined) si.remove(row, col);
        touched.add(sheet);
      }
      continue;
    }
    if (!c) c = si.create(row, col);
    setValue(c, engine.getValue(sheet, row, col));
    if (f?.dynamic) {
      const a = f.area;
      c.formulaAttrs = { ...(c.formulaAttrs ?? {}), t: 'array', ref: a ? areaToA1(a) : cellToA1(row, col) };
    }
    touched.add(sheet);
  }
  return touched;
}
