/**
 * Serializador AST → texto da fórmula. Forma de ARQUIVO (padrão: canônica
 * OOXML, `_xlfn.`/`_xlpm.`, `_xlfn.SINGLE(…)`, `Tabela[[#This Row],[Col]]`) ou
 * de TELA (`ui`: `@x`, `A1#`, `[@Col]`, sem prefixos). A1 precisa da célula
 * anfitriã (as referências relativas são deslocamentos); R1C1 não.
 * Dono: agente CORE.
 */
import { colToLetters, quoteSheetName, wrapCol, wrapRow } from './a1.js';
import type { Node, RefPart, SheetSpec, TableItem } from './ast.js';
import { lookupFn } from './fn.js';
import { catalogEntry } from './i18n/catalog.js';
import { CalcError, type Scalar } from './values.js';

export interface PrintOptions {
  /** Célula da fórmula (0-based) para imprimir A1 relativo. */
  readonly row?: number;
  readonly col?: number;
  readonly r1c1?: boolean;
  /** Forma de tela (sem prefixos, `@`, `#`, `[@Col]`). */
  readonly ui?: boolean;
}

/** Número como o Excel o grava na fórmula ("1E+20", "0.5"). */
export function numberLiteral(v: number): string {
  const s = String(v);
  return s.includes('e') ? s.replace('e', 'E').replace(/E(\d)/, 'E+$1') : s;
}

function scalarLiteral(v: Scalar): string {
  if (typeof v === 'number') return numberLiteral(v);
  if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof CalcError) return v.code;
  return '';
}

function sheetPrefix(s: SheetSpec | undefined): string {
  if (!s) return '';
  const ext = s.ext !== undefined ? `[${s.ext}]` : '';
  if (!s.sheet) return `${ext}!`;
  const body = s.sheet2 !== undefined ? `${s.sheet}:${s.sheet2}` : s.sheet;
  const needQuote = quoteSheetName(s.sheet) !== s.sheet || (s.sheet2 !== undefined && quoteSheetName(s.sheet2) !== s.sheet2);
  return needQuote ? `'${(ext + body).replace(/'/g, "''")}'!` : `${ext}${body}!`;
}

/** Caracteres que obrigam o nome de coluna a ir entre colchetes duplos. */
const COL_SPECIAL = /[\s,:.[\]#'"{}$^&*+=\-<>/]/;
function escapeCol(name: string): string {
  return name.replace(/[[\]#']/g, "'$&");
}

class Printer {
  constructor(private readonly o: PrintOptions) {}

  private rowText(p: RefPart): string {
    if (this.o.r1c1) return p.abs ? `R${p.n + 1}` : p.n ? `R[${p.n}]` : 'R';
    return `${p.abs ? '$' : ''}${(p.abs ? p.n : wrapRow((this.o.row ?? 0) + p.n)) + 1}`;
  }
  private colText(p: RefPart): string {
    if (this.o.r1c1) return p.abs ? `C${p.n + 1}` : p.n ? `C[${p.n}]` : 'C';
    return `${p.abs ? '$' : ''}${colToLetters(p.abs ? p.n : wrapCol((this.o.col ?? 0) + p.n))}`;
  }
  private cellText(row: RefPart, col: RefPart): string {
    return this.o.r1c1 ? this.rowText(row) + this.colText(col) : this.colText(col) + this.rowText(row);
  }

  print(n: Node): string {
    switch (n.t) {
      case 'num': return n.raw || numberLiteral(n.v);
      case 'str': return scalarLiteral(n.v);
      case 'bool': return n.v ? 'TRUE' : 'FALSE';
      case 'err': return n.v;
      case 'arr': return `{${n.rows.map((r) => r.map(scalarLiteral).join(',')).join(';')}}`;
      case 'cell': return sheetPrefix(n.sheet) + this.cellText(n.row, n.col);
      case 'area': {
        const sp = sheetPrefix(n.sheet);
        if (!n.r1 || !n.r2) {
          // colunas inteiras
          if (this.o.r1c1) return sp + (sameRef(n.c1!, n.c2!) ? this.colText(n.c1!) : `${this.colText(n.c1!)}:${this.colText(n.c2!)}`);
          return `${sp}${this.colText(n.c1!)}:${this.colText(n.c2!)}`;
        }
        if (!n.c1 || !n.c2) {
          if (this.o.r1c1) return sp + (sameRef(n.r1, n.r2) ? this.rowText(n.r1) : `${this.rowText(n.r1)}:${this.rowText(n.r2)}`);
          return `${sp}${this.rowText(n.r1)}:${this.rowText(n.r2)}`;
        }
        return `${sp}${this.cellText(n.r1, n.c1)}:${this.cellText(n.r2, n.c2)}`;
      }
      case 'referr': return `${sheetPrefix(n.sheet)}#REF!`;
      case 'name':
        if (n.eta) return this.o.ui ? n.name : `_xleta.${n.name}`;
        if (n.optional) return this.o.ui ? `[${n.name}]` : `_xlop.${n.name}`;
        return sheetPrefix(n.sheet) + (n.param && !this.o.ui ? `_xlpm.${n.name}` : n.name);
      case 'table': return this.table(n);
      case 'fn': {
        if (this.o.ui && n.name === 'SINGLE' && n.args.length === 1) return `@${this.print(n.args[0]!)}`;
        if (this.o.ui && n.name === 'ANCHORARRAY' && n.args.length === 1) return `${this.print(n.args[0]!)}#`;
        if (this.o.ui && n.args.length === 1 && TRO[n.name]) {
          const a = n.args[0]!;
          const t = this.print(a);
          // o ":" do intervalo ganha os pontos (A1:.A10, A1.:A10, A1.:.A10)
          return a.t === 'area' || (a.t === 'bin' && a.op === ':') ? t.replace(/:(?=[^:]*$)/, TRO[n.name]!) : `${n.name}(${t})`;
        }
        const prefix = this.o.ui ? '' : (n.prefix ?? catalogEntry(n.name)?.prefix ?? lookupFn(n.name)?.prefix ?? (TRO[n.name] || n.name === 'ANCHORARRAY' ? '_xlfn.' : ''));
        return `${prefix}${n.name}(${n.args.map((a) => this.print(a)).join(',')})`;
      }
      case 'call': return `${this.print(n.fn)}(${n.args.map((a) => this.print(a)).join(',')})`;
      case 'missing': return '';
      case 'unary': return n.op === '%' ? `${this.print(n.e)}%` : `${n.op}${this.print(n.e)}`;
      case 'bin': return `${this.print(n.a)}${n.op}${this.print(n.b)}`;
      case 'paren': return `(${this.print(n.e)})`;
    }
  }

  private table(n: Extract<Node, { t: 'table' }>): string {
    const cols: string[] = [];
    if (n.col1 !== undefined) cols.push(n.col2 !== undefined ? `[${escapeCol(n.col1)}]:[${escapeCol(n.col2)}]` : `[${escapeCol(n.col1)}]`);
    const items = n.items as TableItem[];
    const thisRow = items.length === 1 && items[0] === '#This Row';
    if (this.o.ui && thisRow) {
      if (n.col1 === undefined) return `${n.table}[@]`;
      if (n.col2 === undefined && !COL_SPECIAL.test(n.col1)) return `${n.table}[@${escapeCol(n.col1)}]`;
      return `${n.table}[@${cols[0]}]`;
    }
    if (!items.length) {
      if (n.col1 === undefined) return `${n.table}[]`;
      if (n.col2 === undefined && !COL_SPECIAL.test(n.col1)) return `${n.table}[${escapeCol(n.col1)}]`;
      return `${n.table}[${cols[0]}]`;
    }
    if (items.length === 1 && n.col1 === undefined) return `${n.table}[${items[0]}]`;
    return `${n.table}[${[...items.map((i) => `[${i}]`), ...cols].join(',')}]`;
  }
}

function sameRef(a: RefPart, b: RefPart): boolean { return a.n === b.n && a.abs === b.abs; }

/** Operadores de corte (TRIMRANGE): arquivo _xlfn._TRO_* ↔ tela :. .: .:. */
const TRO: Record<string, string> = { _TRO_TRAILING: ':.', _TRO_LEADING: '.:', _TRO_ALL: '.:.' };

/** AST → texto da fórmula (sem "="). */
export function printFormula(n: Node, o: PrintOptions = {}): string {
  return new Printer(o).print(n);
}

