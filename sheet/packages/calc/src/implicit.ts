/**
 * Fórmulas LEGADAS (gravadas sem `cm`/array, de antes das matrizes dinâmicas)
 * → forma dinâmica equivalente, inserindo o `@` (SINGLE) exatamente onde o
 * Excel 365 insere ao abrir o arquivo (o que ele mostra na barra de fórmulas e
 * o que de fato calcula). Medido no oráculo por Range.Formula → Formula2 para
 * todas as funções do catálogo (tools: _lab/calc/core/f2-probe.mjs).
 *
 * Classes de parâmetro (as do BIFF): V = valor (intervalo vira @intervalo),
 * R = referência (intervalo passa; expressão com operador vira valor), A =
 * matriz (nada de @ dentro). `top` = a função pode devolver referência/matriz:
 * no contexto de valor ganha @ na frente (=@INDEX(…), =@OFFSET(…)).
 * Dono: agente CORE.
 */
import type { Node } from './ast.js';
import { argMode, lookupFn } from './fn.js';
import { catalogEntry } from './i18n/catalog.js';
import { IMPLICIT_CLASSES } from './implicit-classes.js';

export type ParamClass = 'V' | 'R' | 'A';
export interface FnClassInfo {
  /** Recebe @ na frente quando usada como valor. */
  readonly top: boolean;
  /** Classe por posição; a última vale para as posições seguintes. */
  readonly params: readonly ParamClass[];
}

/** Classe medida (ou deduzida dos modos de argumento do FnDef). */
export function fnClass(name: string): FnClassInfo {
  const m = OVERRIDES[name] ?? IMPLICIT_CLASSES[name];
  if (m) return m;
  const def = lookupFn(name);
  if (!def) return { top: false, params: ['V'] };
  const params: ParamClass[] = [];
  for (let i = 0; i < Math.min(def.maxArgs, 8); i++) {
    const md = argMode(def, i);
    params.push(md === 'array' || md === 'any' ? 'A' : md === 'ref' ? 'R' : 'V');
  }
  return { top: !!def.returnsRef, params: params.length ? params : ['V'] };
}

let inserted: number[] = [];
/** @ inserido pela conversão (marcado, com a posição do texto original). */
const SINGLE = (e: Node): Node => {
  const pos = (e as { pos?: number }).pos;
  inserted.push(pos ?? -1);
  return { t: 'fn', name: 'SINGLE', prefix: '_xlfn.', args: [e], implicitAt: pos ?? -1 } as Node;
};

/** Posições do texto original onde a conversão pôs "@" (−1 = sem posição conhecida). */
export function implicitPositions(n: Node): number[] {
  const out: number[] = [];
  const visit = (x: Node): void => {
    const p = (x as { implicitAt?: number }).implicitAt;
    if (x.t === 'fn' && p !== undefined) out.push(p);
    switch (x.t) {
      case 'fn': x.args.forEach(visit); break;
      case 'call': visit(x.fn); x.args.forEach(visit); break;
      case 'unary': case 'paren': visit(x.e); break;
      case 'bin': visit(x.a); visit(x.b); break;
    }
  };
  visit(n);
  return out;
}

const UDF_CLASS: FnClassInfo = { top: true, params: ['R'] };

/** Parâmetros que a sonda com enchimento "1" não alcança (o 2º do CELL exige referência). */
const OVERRIDES: Record<string, FnClassInfo> = {
  CELL: { top: true, params: ['V', 'R'] },
};

/** Classe do i-ésimo parâmetro (os pares que se repetem continuam o ciclo). */
export function paramClass(info: FnClassInfo, i: number): ParamClass {
  const ps = info.params, n = ps.length;
  if (i < n) return ps[i] ?? 'V';
  // pares que se repetem (COUNTIFS: intervalo R, critério V, …): continua o ciclo
  if (n >= 4 && ps[n - 1] === ps[n - 3] && ps[n - 2] === ps[n - 4] && ps[n - 1] !== ps[n - 2]) return ps[n - 2 + ((i - n) % 2)]!;
  return ps[n - 1] ?? 'V';
}

export interface LegacyOptions {
  /**
   * O nome definido pode valer várias células? O Excel só mostra @ em nome que
   * não é célula única nem constante escalar (medido: =relA2 sem @, =@rngA, =@soma).
   * Ausente = sim (no valor tanto faz).
   */
  readonly nameIsMulti?: (name: string) => boolean;
  /** O nome de função é um nome definido (chamada de LAMBDA guardada em nome — não é UDF). */
  readonly isName?: (name: string) => boolean;
}

let opts: LegacyOptions = {};

/** Insere os @ de uma fórmula legada (contexto de valor no topo). */
export function legacyToDynamic(n: Node, o: LegacyOptions = {}): Node {
  const prev = opts, prevIns = inserted;
  opts = o;
  inserted = [];
  try {
    const r = conv(n, 'V');
    // nada a inserir: a mesma árvore (o texto original vale como está)
    return inserted.length ? r : n;
  } finally { opts = prev; inserted = prevIns; }
}

/**
 * Contexto da conversão: V = valor a partir do topo; VR = valor dentro de um
 * argumento de referência (SUM(ABS(…))): intervalo ainda ganha @, mas função que
 * devolve MATRIZ (FREQUENCY, MMULT, SORT, SEQUENCE…) não (medido:
 * =SUM(SIGN(FREQUENCY(…))) sem @, =SIGN(@FREQUENCY(…)) com); R = referência; A = matriz.
 */
type Ctx = ParamClass | 'VR';

/** Funções de resultado matricial: sem @ no contexto VR (medido com =SUM(ABS(F(…)))). */
const ARRAY_RESULT = new Set<string>([
  'STOCKHISTORY', 'IFS', 'SWITCH', 'CHOOSECOLS', 'CHOOSEROWS', 'DROP', 'EXPAND', 'FILTER', 'HSTACK', 'SORT', 'SORTBY', 'TAKE', 'TOCOL', 'TOROW',
  'TRANSPOSE', 'UNIQUE', 'VSTACK', 'WRAPCOLS', 'WRAPROWS', 'GROUPBY', 'PIVOTBY', 'MINVERSE', 'MMULT', 'MUNIT', 'RANDARRAY', 'SEQUENCE',
  'FREQUENCY', 'GROWTH', 'LINEST', 'LOGEST', 'MODE.MULT', 'TREND', 'TEXTSPLIT', 'REGEXEXTRACT',
]);

const isValue = (c: Ctx): boolean => c === 'V' || c === 'VR';

function conv(n: Node, ctx: Ctx): Node {
  switch (n.t) {
    case 'area':
      return isValue(ctx) ? SINGLE(n) : n;
    case 'name':
      return isValue(ctx) && !n.param && !n.eta && (opts.nameIsMulti?.(n.name) ?? true) ? SINGLE(n) : n;
    case 'table':
      return isValue(ctx) ? SINGLE(n) : n;
    case 'unary':
      return { ...n, e: conv(n.e, ctx === 'A' ? 'A' : ctx === 'V' ? 'V' : 'VR') };
    case 'bin': {
      if (n.op === ':' || n.op === ' ' || n.op === ',') {
        const r: Node = { ...n, a: conv(n.a, 'R'), b: conv(n.b, 'R') };
        // união fica sem @ (medido: =(A1:A3;B1) continua igual)
        return isValue(ctx) && n.op !== ',' ? SINGLE(r) : r;
      }
      const sub: Ctx = ctx === 'A' ? 'A' : ctx === 'V' ? 'V' : 'VR';
      return { ...n, a: conv(n.a, sub), b: conv(n.b, sub) };
    }
    case 'paren':
      return { ...n, e: conv(n.e, ctx) };
    case 'fn': {
      if (n.name === 'SINGLE') return n;
      // A1# devolve referência: como valor ganha @ (medido: FORMULATEXT → "=@F4#")
      if (n.name === 'ANCHORARRAY' || n.name.startsWith('_TRO_')) return isValue(ctx) ? SINGLE(n) : n;
      // função definida pelo usuário / de suplemento (_xludf., _xll., nome desconhecido):
      // pode devolver matriz — ganha @ no topo e os argumentos passam como referência
      // (medido: .xls com ISEVEN de suplemento → Formula2 "=@ISEVEN(A1)")
      const udf = /^_xludf\.|^_xll\./i.test(n.prefix ?? '') || (!lookupFn(n.name) && !catalogEntry(n.name) && !(opts.isName?.(n.name) ?? false));
      const info = udf ? UDF_CLASS : fnClass(n.name);
      // IF com A1# na condição: a condição vira matriz e o @ vai no IF (medido: =@IF(A1#>1;1;2))
      const ifAnchor = n.name === 'IF' && !!n.args[0] && hasAnchor(n.args[0]);
      const args = n.args.map((a, i) => {
        if (ifAnchor && i === 0) return conv(a, 'A');
        // TYPE(A1#) fica sem @ (medido; TYPE(A1:A3) ganha)
        const cls = n.name === 'TYPE' && a.t === 'fn' && a.name === 'ANCHORARRAY' ? 'R' : paramClass(info, i);
        // dentro de um argumento de classe matriz, os de valor e de referência também
        // avaliam como matriz (=SUMPRODUCT(SUM(A1:A3*1)) fica sem @), salvo IF/IFERROR/IFNA
        if (ctx === 'A' && cls !== 'A' && !NO_ARRAY_PROPAGATION.has(n.name)) return conv(a, 'A');
        // valor dentro de referência continua "VR"
        if ((ctx === 'R' || ctx === 'VR') && cls === 'V') return conv(a, 'VR');
        return conv(a, cls);
      });
      const f: Node = { ...n, args };
      const at = ifAnchor ? isValue(ctx) : ctx === 'V' ? needsAt(n.name, n.args, info) : ctx === 'VR' ? !ARRAY_RESULT.has(n.name) && needsAt(n.name, n.args, info) : false;
      return at ? SINGLE(f) : f;
    }
    default:
      return n;
  }
}

/**
 * Funções cujos parâmetros de valor NÃO viram matriz dentro de contexto
 * matricial (medido: =SUMPRODUCT(IF(@A1:A3>1;1;0)), =SUMPRODUCT(IFERROR(1/@A1:A3;0))).
 */
const NO_ARRAY_PROPAGATION = new Set<string>(['IF', 'IFERROR', 'IFNA']);

/** A expressão pode valer mais de uma célula (intervalo, nome, função de referência…)? */
function multi(n: Node): boolean {
  switch (n.t) {
    case 'area': return true;
    case 'name': return !n.param && !n.eta && (opts.nameIsMulti?.(n.name) ?? true);
    case 'table': return true;
    case 'paren': return multi(n.e);
    case 'bin': return n.op === ':' || n.op === ' ' || n.op === ',';
    case 'fn': return n.name === 'ANCHORARRAY' || n.name.startsWith('_TRO_') || needsAt(n.name, n.args, fnClass(n.name));
    default: return false;
  }
}
const nonZeroLiteral = (n: Node | undefined): boolean => !!n && n.t === 'num' && n.v !== 0;

/** A expressão contém A1# (ANCHORARRAY)? */
function hasAnchor(n: Node): boolean {
  switch (n.t) {
    case 'fn': return n.name === 'ANCHORARRAY' || n.args.some(hasAnchor);
    case 'unary': case 'paren': return hasAnchor(n.e);
    case 'bin': return hasAnchor(n.a) || hasAnchor(n.b);
    default: return false;
  }
}

/** Alguma referência de várias células dentro da expressão. */
function hasRange(n: Node): boolean {
  if (multi(n)) return true;
  switch (n.t) {
    case 'unary': case 'paren': return hasRange(n.e);
    case 'bin': return hasRange(n.a) || hasRange(n.b);
    case 'fn': return n.args.some(hasRange);
    default: return false;
  }
}

/**
 * O Excel põe @ na frente da função só quando o resultado pode ter várias
 * células, olhando a forma dos argumentos (medido: =INDEX(A1:A3;1) sem @,
 * =INDEX(A1:A3;0) com; =IF(1;A1) sem, =IF(1;A1:A2) com; =OFFSET(A1;0;0) sem,
 * =OFFSET(A1;0;0;2) com; =ROW(A1) sem, =ROW(A1:A3) com; =XLOOKUP(…;B1:B3) sem,
 * =XLOOKUP(…;B1:C3) com). No valor tanto faz (@ de uma célula é ela mesma).
 */
function needsAt(name: string, args: readonly Node[], info: FnClassInfo): boolean {
  switch (name) {
    case 'INDEX': {
      const arr = args[0];
      if (!arr || !multi(arr) && arr.t !== 'fn') return false;
      // índice que nunca é 0: literal ≠ 0 ou MATCH/XMATCH (medido: =INDEX(A1:A3;MATCH(…)) sem @)
      const never0 = (a: Node): boolean => nonZeroLiteral(a) || (a.t === 'fn' && (a.name === 'MATCH' || a.name === 'XMATCH'));
      const idx = args.slice(1, 3).filter((a) => a.t !== 'missing');
      const direct = arr.t === 'area' || arr.t === 'name' || arr.t === 'table' || (arr.t === 'paren' && arr.e.t === 'bin' && arr.e.op === ',');
      return !(direct && idx.length > 0 && idx.every(never0));
    }
    case 'IF': case 'CHOOSE': case 'IFERROR': case 'IFNA':
      return args.slice(1).some(multi);
    case 'OFFSET':
      return multi(args[0] ?? { t: 'missing' }) && args[0]?.t !== 'cell' || args.length > 3;
    case 'ISFORMULA': case 'FORMULATEXT':
      // levantam sobre a referência: @ só quando ela tem várias células
      return !!args[0] && multi(args[0]);
    case 'ROW': case 'COLUMN':
      return !!args[0] && args[0].t !== 'cell' && args[0].t !== 'missing';
    case 'XLOOKUP': {
      // uma célula só quando a busca e o retorno são vetores na mesma direção (medido)
      const look = args[1], ret = args[2];
      if (args[3] && multi(args[3])) return true;
      if (!ret || !hasRange(ret)) return false;
      const dir = (n: Node | undefined): 'v' | 'h' | undefined => {
        if (!n || n.t !== 'area' || !n.r1 || !n.r2 || !n.c1 || !n.c2) return undefined;
        if (n.c1.n === n.c2.n && n.c1.abs === n.c2.abs) return 'v';
        if (n.r1.n === n.r2.n && n.r1.abs === n.r2.abs) return 'h';
        return undefined;
      };
      const d = dir(look);
      return !(d && d === dir(ret));
    }
    default:
      return info.top;
  }
}
