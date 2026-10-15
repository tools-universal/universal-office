/**
 * Agregações condicionais: COUNTIF, COUNTIFS, SUMIF, SUMIFS, AVERAGEIF, AVERAGEIFS,
 * MAXIFS, MINIFS. Critérios em criteria.ts. Dono: agente FN-STAT.
 *
 * Regras medidas: os intervalos de critério das *IFS (e o de soma) têm de ter a
 * mesma forma (#VALUE!); em SUMIF/AVERAGEIF o intervalo de soma é só o canto: ele é
 * redimensionado para a forma do intervalo de critério; só números do intervalo de
 * soma entram (texto/booleano ignorados), erro numa célula que casa propaga; critério
 * matriz → resultado elemento a elemento. Colunas inteiras: percorre só as células
 * existentes (o vazio que casa entra pela conta do tamanho).
 */
import { parseCriterion, type Criterion } from '../criteria.js';
import { register, type FnContext, type FnDef } from '../fn.js';
import { CalcError, ERR, RefValue, type Area, type Scalar, type Value } from '../values.js';

const X = '_xlfn.';

interface Cond { readonly area: Area; readonly crit: Criterion }

const rowsOf = (a: Area): number => a.r2 - a.r1 + 1;
const colsOf = (a: Area): number => a.c2 - a.c1 + 1;

/** Área única de uma referência (união ou não referência → undefined). */
function singleArea(v: Value): Area | undefined {
  return v instanceof RefValue && v.areas.length === 1 ? v.areas[0] : undefined;
}

/** Todas as condições casam no deslocamento (dr, dc)? */
function allMatch(conds: readonly Cond[], ctx: FnContext, dr: number, dc: number, skip = -1): boolean {
  for (let i = 0; i < conds.length; i++) {
    if (i === skip) continue;
    const { area, crit } = conds[i]!;
    if (!crit(ctx.cell(area.sheet, area.r1 + dr, area.c1 + dc))) return false;
  }
  return true;
}

/** Quantos deslocamentos casam todas as condições (sem varrer células vazias). */
function countMatches(conds: readonly Cond[], ctx: FnContext): number {
  const a0 = conds[0]!.area;
  const R = rowsOf(a0), C = colsOf(a0);
  const pivot = conds.findIndex((c) => !c.crit.blank);
  if (pivot >= 0) {
    // percorre as células existentes de um critério que não casa vazio
    const { area, crit } = conds[pivot]!;
    let n = 0;
    ctx.forEachCell(area, (v, r, c) => {
      if (crit(v) && allMatch(conds, ctx, r - area.r1, c - area.c1, pivot)) n++;
    });
    return n;
  }
  // todos casam vazio: total menos as posições (com alguma célula) que falham
  const seen = new Set<number>();
  let fails = 0;
  for (const { area } of conds) {
    ctx.forEachCell(area, (_v, r, c) => {
      const dr = r - area.r1, dc = c - area.c1, key = dr * 16384 + dc;
      if (seen.has(key)) return;
      seen.add(key);
      if (!allMatch(conds, ctx, dr, dc)) fails++;
    });
  }
  return R * C - fails;
}

/** Números do intervalo de soma nas posições que casam (ordem linha a linha), ou o 1º erro. */
function matchedValues(conds: readonly Cond[], sum: Area, ctx: FnContext): number[] | CalcError {
  const out: number[] = [];
  let err: CalcError | undefined;
  const R = rowsOf(conds[0]!.area), C = colsOf(conds[0]!.area);
  ctx.forEachCell(sum, (v, r, c) => {
    if (err) return;
    const dr = r - sum.r1, dc = c - sum.c1;
    if (dr >= R || dc >= C) return;
    if (typeof v !== 'number' && !(v instanceof CalcError)) return;
    if (!allMatch(conds, ctx, dr, dc)) return;
    if (v instanceof CalcError) err = v;
    else out.push(v);
  });
  return err ?? out;
}

/** Critério de um argumento; texto com mais de 255 caracteres → #VALUE! (medido). */
export function criterionArg(raw: Scalar, ctx: FnContext): Criterion | CalcError {
  if (typeof raw === 'string' && raw.length > 255) return ERR.VALUE;
  return parseCriterion(raw, ctx.locale);
}

/** Condições a partir de pares (intervalo, critério); formas diferentes → #VALUE!. */
function buildConds(args: readonly unknown[], start: number, ctx: FnContext): Cond[] | CalcError {
  const conds: Cond[] = [];
  for (let i = start; i < args.length; i += 2) {
    const area = singleArea(args[i] as Value);
    if (!area) return ERR.VALUE;
    if (i + 1 >= args.length) return ERR.VALUE;
    if (conds.length && (rowsOf(area) !== rowsOf(conds[0]!.area) || colsOf(area) !== colsOf(conds[0]!.area))) return ERR.VALUE;
    const crit = criterionArg(args[i + 1] as Scalar, ctx);
    if (crit instanceof CalcError) return crit;
    conds.push({ area, crit });
  }
  return conds;
}

type Reduce = (xs: number[]) => Value;
// soma simples, SEM o zero do Excel: =SUMIFS(…) de 0,1; 0,2; −0,3 dá 5,55E−17 (medido)
const rSum: Reduce = (xs) => { let s = 0; for (const x of xs) s += x; return Number.isFinite(s) ? s : ERR.NUM; };
const rAvg: Reduce = (xs) => (xs.length ? rSum(xs) as number / xs.length : ERR.DIV0);
const rMax: Reduce = (xs) => { let m = -Infinity; for (const x of xs) if (x > m) m = x; return xs.length ? m : 0; };
const rMin: Reduce = (xs) => { let m = Infinity; for (const x of xs) if (x < m) m = x; return xs.length ? m : 0; };

/** SUMIF/AVERAGEIF: (intervalo, critério, [soma]) — soma redimensionada a partir do canto. */
function ifFn(name: string, reduce: Reduce): FnDef {
  return {
    name, minArgs: 2, maxArgs: 3, args: (i) => (i === 1 ? 'value' : 'ref'), lift: true, acceptsErrors: true,
    call: ([range, crit, sumRange], ctx) => {
      const area = singleArea(range as Value);
      if (!area) return ERR.VALUE;
      let sum = area;
      if (sumRange !== undefined && sumRange !== null) {
        const s = singleArea(sumRange as Value);
        if (!s) return ERR.VALUE;
        sum = { sheet: s.sheet, r1: s.r1, c1: s.c1, r2: s.r1 + rowsOf(area) - 1, c2: s.c1 + colsOf(area) - 1 };
      }
      const c = criterionArg(crit as Scalar, ctx);
      if (c instanceof CalcError) return c;
      const xs = matchedValues([{ area, crit: c }], sum, ctx);
      return xs instanceof CalcError ? xs : reduce(xs);
    },
  };
}

/** SUMIFS/AVERAGEIFS/MAXIFS/MINIFS: (soma, intervalo1, critério1, …). */
function ifsFn(name: string, reduce: Reduce, prefix?: string): FnDef {
  return {
    // máximo do catálogo medido: 255 (SUMIFS…), 253 nas de 2016 (MAXIFS/MINIFS)
    name, prefix, minArgs: 3, maxArgs: prefix ? 253 : 255, args: (i) => (i > 0 && i % 2 === 0 ? 'value' : 'ref'), lift: true, acceptsErrors: true,
    call: (args, ctx) => {
      if (args.length % 2 === 0) return ERR.VALUE;
      const sum = singleArea(args[0] as Value);
      if (!sum) return ERR.VALUE;
      const conds = buildConds(args, 1, ctx);
      if (conds instanceof CalcError) return conds;
      if (rowsOf(sum) !== rowsOf(conds[0]!.area) || colsOf(sum) !== colsOf(conds[0]!.area)) return ERR.VALUE;
      const xs = matchedValues(conds, sum, ctx);
      return xs instanceof CalcError ? xs : reduce(xs);
    },
  };
}

register(
  {
    name: 'COUNTIF', minArgs: 2, maxArgs: 2, args: (i) => (i === 0 ? 'ref' : 'value'), lift: true, acceptsErrors: true,
    call: ([range, crit], ctx) => {
      const area = singleArea(range as Value);
      if (!area) return ERR.VALUE;
      const c = criterionArg(crit as Scalar, ctx);
      if (c instanceof CalcError) return c;
      return countMatches([{ area, crit: c }], ctx);
    },
  },
  {
    name: 'COUNTIFS', minArgs: 2, maxArgs: 254, args: (i) => (i % 2 === 0 ? 'ref' : 'value'), lift: true, acceptsErrors: true,
    call: (args, ctx) => {
      if (args.length % 2) return ERR.VALUE;
      const conds = buildConds(args, 0, ctx);
      return conds instanceof CalcError ? conds : countMatches(conds, ctx);
    },
  },
  ifFn('SUMIF', rSum),
  ifFn('AVERAGEIF', rAvg),
  ifsFn('SUMIFS', rSum),
  ifsFn('AVERAGEIFS', rAvg),
  ifsFn('MAXIFS', rMax, X),
  ifsFn('MINIFS', rMin, X),
);
