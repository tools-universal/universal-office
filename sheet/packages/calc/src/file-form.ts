/**
 * Como o Excel 365 GRAVA as fórmulas no .xlsx (medido: fórmulas digitadas por
 * Formula2 e salvas pelo Excel — `_lab/calc/io/out/make1`):
 *
 * - fórmula que a semântica LEGADA calcula igual (os `@` que o usuário pôs são
 *   exatamente os que o Excel insere ao abrir uma fórmula legada) vai como
 *   fórmula comum, SEM os `@`: `=@A1:A3` → `<f>A1:A3</f>`, `=SUM(C1#)`,
 *   `=LET(x,1,x+1)`, `=@INDEX(A1:A3,0)` → `INDEX(A1:A3,0)`;
 * - senão vai como matriz DINÂMICA: `<c cm="…"><f t="array" ref="área">` com
 *   `_xlfn.SINGLE(…)` nos `@` explícitos — inclusive resultado de uma célula
 *   (`=SUM(A1:A3*2)`, `=SEQUENCE(1)` → ref="I1"), chamada de LAMBDA, `=C1#`,
 *   `=INDIRECT("A1")`;
 * - `ca="1"`: fórmulas com função/nome volátil E todas as que dependem delas
 *   (transitivo: =NOW(), =X1+1, =Y1+1 todas com ca); a dinâmica com ca ganha
 *   também `aca="1"`; derramamento bloqueado (#SPILL!) ganha `aca` + `ca`.
 * Dono: agente CALC-IO.
 */
import type { Node } from './ast.js';
import type { Engine, FormulaRec } from './engine.js';
import { catalogEntry } from './i18n/catalog.js';
import { fnClass, legacyToDynamic, paramClass, type LegacyOptions } from './implicit.js';
import { printFormula } from './print.js';
import { CalcError } from './values.js';

export interface FileFormula {
  /** Texto do `<f>` (forma de arquivo: `_xlfn.`, `_xlpm.`…). */
  readonly text: string;
  /** Matriz dinâmica: `t="array"` + `cm` (XLDAPR). */
  readonly dynamic: boolean;
}

/** Tira os `@` (SINGLE) da árvore. */
function stripSingles(n: Node): Node {
  switch (n.t) {
    case 'fn':
      if (n.name === 'SINGLE' && n.args.length === 1) return stripSingles(n.args[0]!);
      return { ...n, args: n.args.map(stripSingles) };
    case 'call': return { ...n, fn: stripSingles(n.fn), args: n.args.map(stripSingles) };
    case 'unary': case 'paren': return { ...n, e: stripSingles(n.e) };
    case 'bin': return { ...n, a: stripSingles(n.a), b: stripSingles(n.b) };
    default: return n;
  }
}

/** Há chamada de expressão (LAMBDA(…)(…), nome definido(…)) — a legada não tem. */
function hasCall(n: Node, isName: (name: string) => boolean): boolean {
  switch (n.t) {
    case 'call': return true;
    case 'fn': return (!catalogEntry(n.name) && isName(n.name)) || n.args.some((a) => hasCall(a, isName));
    case 'unary': case 'paren': return hasCall(n.e, isName);
    case 'bin': return hasCall(n.a, isName) || hasCall(n.b, isName);
    default: return false;
  }
}

/**
 * Constante de matriz em contexto de VALOR a partir do topo (=UPPER({"a";"b"})):
 * a legada pegaria só o 1º elemento, a dinâmica derrama — o Excel grava como
 * dinâmica (medido). Em argumento de referência/matriz (SUM({1,2})) não conta.
 */
function arrayInValue(n: Node): boolean {
  switch (n.t) {
    case 'arr': return n.rows.length * (n.rows[0]?.length ?? 0) > 1;
    case 'paren': case 'unary': return arrayInValue(n.t === 'paren' ? n.e : n.e);
    case 'bin': return n.op !== ':' && n.op !== ' ' && n.op !== ',' && (arrayInValue(n.a) || arrayInValue(n.b));
    case 'fn': {
      if (n.name === 'SINGLE') return false;
      const info = fnClass(n.name);
      return n.args.some((a, i) => paramClass(info, i) === 'V' && arrayInValue(a));
    }
    default: return false;
  }
}

export interface FileFormOptions extends LegacyOptions {
  /** O nome é um nome definido (chamada `Nome(…)` de LAMBDA guardada em nome → dinâmica). */
  readonly isName?: (name: string) => boolean;
}

/**
 * Forma de gravação de uma fórmula na semântica DINÂMICA (a da barra de
 * fórmulas do 365, com `@` explícitos) na célula (row, col).
 */
export function toFileFormula(node: Node, row: number, col: number, o: FileFormOptions = {}): FileFormula {
  const at = { row, col };
  const ui = printFormula(node, { ...at, ui: true });
  if (!hasCall(node, o.isName ?? (() => false)) && !arrayInValue(node)) {
    const legacy = stripSingles(node);
    const back = legacyToDynamic(legacy, o);
    if (printFormula(back, { ...at, ui: true }) === ui) return { text: printFormula(legacy, at), dynamic: false };
  }
  return { text: printFormula(node, at), dynamic: true };
}

/** Atributos de recálculo que o Excel grava em cada fórmula (ca/aca). */
export interface SaveFlags { readonly ca: boolean; readonly aca: boolean }

/**
 * ca/aca de todas as fórmulas como o Excel gravaria agora: voláteis pelo
 * texto + dependentes (transitivos); dinâmica com ca → aca; #SPILL! → ca+aca.
 */
export function saveFlags(engine: Engine): Map<FormulaRec, SaveFlags> {
  const all = engine.allFormulas();
  const seeds = all.filter((f) => f.volatileFn);
  const ca = new Set<FormulaRec>(seeds);
  for (const f of engine.dependentsOf(seeds)) ca.add(f);
  const out = new Map<FormulaRec, SaveFlags>();
  for (const f of all) {
    const v = engine.getValue(f.sheet, f.row, f.col);
    const blocked = f.dynamic && v instanceof CalcError && v.code === '#SPILL!';
    const c = ca.has(f) || blocked;
    out.set(f, { ca: c, aca: f.dynamic && c });
  }
  return out;
}
