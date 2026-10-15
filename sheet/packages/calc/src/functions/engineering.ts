/**
 * Engenharia (BIN2DEC…, BITAND…, CONVERT, DELTA, GESTEP, ERF*, BESSEL*, IM* complexos).
 * Dono: agente FN-MATH. Os complexos (IM*) ficam em complex.ts.
 *
 * Regras medidas no Excel 365 (oráculo pt-BR):
 * - As funções herdadas do Analysis ToolPak seguem as regras ATP de math-util.ts
 *   (omitido = #N/A, booleano = #VALUE!, intervalo de várias células = #VALUE!).
 * - BESSELI/J/K/Y são as rotinas do Numerical Recipes em C (2ª ed.): mesmas
 *   aproximações polinomiais (erro relativo até 1E-3 em BESSELI(100;3)!); I, K e Y
 *   batem bit a bit; J com x ≥ 8 difere (algoritmo do Excel não identificado).
 * - CONVERT: tabela "unidades por unidade-base" medida no próprio Excel
 *   (CONVERT(1;base;u)), conversão x·(U_destino/U_origem)·p_origem/p_destino;
 *   temperatura por fórmulas diretas de cada par; prefixos só nas unidades
 *   métricas que o Excel aceita.
 */
import { register, type FnContext, type FnDef } from '../fn.js';
import { CalcError, ERR, type Scalar, type Value } from '../values.js';
import { atpFn, atpNum, atpRaw, fin, finFlush, liftScalars, numFn, type Num } from './math-util.js';
import './complex.js';

const X = '_xlfn.';

// ---------------------------------------------------------------------------
// Bases (BIN/OCT/DEC/HEX): 10 dígitos, complemento de 2 no 10º dígito.

/** Texto de um argumento "número em base" do ATP: número inteiro ≥ 0 vira texto. */
function baseText(v: Scalar): string | CalcError {
  if (v instanceof CalcError) return v;
  if (typeof v === 'boolean') return ERR.VALUE;
  if (v === null) return '';
  if (typeof v === 'number') {
    if (v < 0 || !Number.isInteger(v)) return ERR.NUM;
    if (v >= 1e10) return ERR.NUM;
    return String(v);
  }
  return v;
}

const DIG = '0123456789ABCDEF';

/** Lê um número de até 10 dígitos na base (com sinal pelo complemento de 2). */
function parseBase(text: string, radix: number): number | CalcError {
  if (text.length > 10) return ERR.NUM;
  let v = 0;
  for (const ch of text.toUpperCase()) {
    const d = DIG.indexOf(ch);
    if (d < 0 || d >= radix) return ERR.NUM;
    v = v * radix + d;
  }
  const full = Math.pow(radix, 10);
  if (text.length === 10 && v >= full / 2) v -= full;
  return v;
}

/** Faixa de valores representáveis em 10 dígitos da base. */
function baseRange(radix: number): [number, number] {
  const half = Math.pow(radix, 10) / 2;
  return [-half, half - 1];
}

/** Escreve em base com `places` (undefined = mínimo); negativo = 10 dígitos em complemento de 2. */
function formatBase(v: number, radix: number, places: number | undefined): string | CalcError {
  const [lo, hi] = baseRange(radix);
  if (v < lo || v > hi) return ERR.NUM;
  if (v < 0) return (v + Math.pow(radix, 10)).toString(radix).toUpperCase();
  const s = v.toString(radix).toUpperCase();
  if (places === undefined) return s;
  if (places < s.length || places > 10) return ERR.NUM;
  return s.padStart(places, '0');
}

/** Converte o argumento `places` (truncado; negativo ou zero = #NUM!). */
function placesArg(v: number | undefined): number | undefined | CalcError {
  if (v === undefined) return undefined;
  const p = Math.trunc(v);
  if (p <= 0) return ERR.NUM;
  return p;
}

const RADIX: Record<string, number> = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 };

/** BIN2DEC, DEC2HEX… (ATP: argumento de texto/número; places opcional). */
function baseConv(from: string, to: string): FnDef {
  const rf = RADIX[from]!, rt = RADIX[to]!;
  const name = `${from}2${to}`;
  const hasPlaces = to !== 'DEC';
  return {
    name, minArgs: 1, maxArgs: hasPlaces ? 2 : 1, args: 'any', acceptsErrors: true,
    call: (args: readonly Value[], ctx: FnContext) => {
      const raw = [atpRaw(args[0], ctx)];
      if (hasPlaces && args.length > 1 && args[1] !== null) raw.push(atpRaw(args[1], ctx));
      return liftScalars(raw, ([a, p]) => {
        let v: number | CalcError;
        if (from === 'DEC') {
          const n = atpNum(a!, ctx);
          if (n instanceof CalcError) return n;
          v = Math.trunc(n);
        } else {
          const t = baseText(a!);
          if (t instanceof CalcError) return t;
          v = parseBase(t, rf);
        }
        if (v instanceof CalcError) return v;
        let places: number | undefined | CalcError;
        if (p !== undefined) {
          const pn = atpNum(p, ctx);
          if (pn instanceof CalcError) return pn;
          places = placesArg(pn);
          if (places instanceof CalcError) return places;
        }
        if (to === 'DEC') return v;
        return formatBase(v, rt, places as number | undefined);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Bits (BITAND/BITOR/BITXOR/BITLSHIFT/BITRSHIFT, Excel 2013): inteiros 0 ≤ n < 2^48.

const BIT_LIMIT = 281474976710656; // 2^48

function bitArg(n: number): bigint | CalcError {
  if (n < 0 || n >= BIT_LIMIT || !Number.isInteger(n)) return ERR.NUM;
  return BigInt(n);
}

function bitOp(name: string, op: (a: bigint, b: bigint) => bigint): FnDef {
  return numFn(name, 2, 2, ([a, b]) => {
    const x = bitArg(a!), y = bitArg(b!);
    if (x instanceof CalcError) return x;
    if (y instanceof CalcError) return y;
    return Number(op(x, y));
  }, { prefix: X });
}

/**
 * Medido: n = 0 dá 0 com qualquer deslocamento; |s| > 53 = #NUM!; à esquerda o
 * resultado é tomado módulo 2^53 antes do teste de 2^48 (BITLSHIFT(1;53) = 0,
 * BITLSHIFT(1;48) = #NUM!).
 */
function shift(n: number, s: number): Num {
  const x = bitArg(n);
  if (x instanceof CalcError) return x;
  if (x === 0n) return 0;
  const k = Math.trunc(s);
  if (Math.abs(k) > 53) return ERR.NUM;
  const r = k >= 0 ? (x << BigInt(k)) % (1n << 53n) : x >> BigInt(-k);
  if (r >= BigInt(BIT_LIMIT)) return ERR.NUM;
  return Number(r);
}

// ---------------------------------------------------------------------------
// CONVERT

type Cat = 'mass' | 'dist' | 'time' | 'press' | 'force' | 'energy' | 'power' | 'magn' | 'temp' | 'vol' | 'area' | 'info' | 'speed';

/**
 * Unidades por 1 unidade-base da categoria (g, m, sec, Pa, N, J, W, T, l, m2,
 * bit, m/s), lidas do Excel com CONVERT(1;base;u) (bits exatos).
 */
const UNITS: Record<string, [Cat, number]> = {};
function defUnits(cat: Cat, list: [string, number][]): void { for (const [u, v] of list) UNITS[u] = [cat, v]; }
defUnits('mass', [
  ['g', 1],
  ['sg', 0.00006852176585679177],
  ['lbm', 0.002204622621848776],
  ['u', 6.022141794216764e+23],
  ['ozm', 0.035273961949580414],
  ['grain', 15.43235835294143],
  ['cwt', 0.000022046226218487758],
  ['shweight', 0.000022046226218487758],
  ['uk_cwt', 0.000019684130552221215],
  ['lcwt', 0.000019684130552221215],
  ['hweight', 0.000019684130552221215],
  ['stone', 0.00015747304441776972],
  ['ton', 0.000001102311310924388],
  ['uk_ton', 9.842065276110607e-7],
  ['LTON', 9.842065276110607e-7],
  ['brton', 9.842065276110607e-7],
]);
defUnits('dist', [
  ['m', 1],
  ['mi', 0.0006213711922373339],
  ['Nmi', 0.0005399568034557236],
  ['in', 39.37007874015748],
  ['ft', 3.2808398950131235],
  ['yd', 1.0936132983377078],
  ['ang', 10000000000],
  ['ell', 0.8748906386701663],
  ['ly', 1.0570008340246154e-16],
  ['parsec', 3.240779289664725e-17],
  ['pc', 3.240779289664725e-17],
  ['Picapt', 2834.6456692913384],
  ['Pica', 2834.6456692913384],
  ['pica', 236.22047244094486],
  ['survey_mi', 0.0006213699494949495],
]);
defUnits('time', [
  ['sec', 1],
  ['yr', 3.168808781402895e-8],
  ['day', 0.000011574074074074073],
  ['d', 0.000011574074074074073],
  ['hr', 0.0002777777777777778],
  ['mn', 0.016666666666666666],
  ['min', 0.016666666666666666],
  ['s', 1],
]);
defUnits('press', [
  ['Pa', 1],
  ['p', 1],
  ['atm', 0.000009869232667160129],
  ['at', 0.000009869232667160129],
  ['mmHg', 0.007500637554192106],
  ['psi', 0.0001450377377302092],
  ['Torr', 0.007500616827041697],
]);
defUnits('force', [
  ['N', 1],
  ['dyn', 100000],
  ['dy', 100000],
  ['lbf', 0.22480894309971047],
  ['pond', 101.97162129779282],
]);
defUnits('energy', [
  ['J', 1],
  ['e', 10000000],
  ['c', 0.2390057361376673],
  ['cal', 0.23884589662749595],
  ['eV', 6241509647120418000],
  ['ev', 6241509647120418000],
  ['HPh', 3.725061359986188e-7],
  ['hh', 3.725061359986188e-7],
  ['Wh', 0.0002777777777777778],
  ['wh', 0.0002777777777777778],
  ['flb', 0.7375621492772654],
  ['BTU', 0.0009478171203133171],
  ['btu', 0.0009478171203133171],
]);
defUnits('power', [
  ['W', 1],
  ['HP', 0.0013410220895950279],
  ['h', 0.0013410220895950279],
  ['PS', 0.0013596216173039043],
  ['w', 1],
]);
defUnits('magn', [
  ['T', 1],
  ['ga', 10000],
]);
defUnits('vol', [
  ['l', 1],
  ['m3', 0.001],
  ['tsp', 202.88413621105798],
  ['tspm', 200],
  ['tbs', 67.628045403686],
  ['oz', 33.814022701843],
  ['cup', 4.226752837730375],
  ['pt', 2.1133764188651876],
  ['us_pt', 2.1133764188651876],
  ['uk_pt', 1.759753986392702],
  ['qt', 1.0566882094325938],
  ['uk_qt', 0.879876993196351],
  ['gal', 0.26417205235814845],
  ['uk_gal', 0.21996924829908776],
  ['L', 1],
  ['lt', 1],
  ['ang3', 1e+27],
  ['ang^3', 1e+27],
  ['barrel', 0.006289810770432105],
  ['bushel', 0.028377593258401747],
  ['ft3', 0.035314666721488586],
  ['ft^3', 0.035314666721488586],
  ['in3', 61.02374409473229],
  ['in^3', 61.02374409473229],
  ['ly3', 1.1809349884417084e-51],
  ['ly^3', 1.1809349884417084e-51],
  ['m^3', 0.001],
  ['mi3', 2.3991275857892773e-13],
  ['mi^3', 2.3991275857892773e-13],
  ['yd3', 0.001307950619314392],
  ['yd^3', 0.001307950619314392],
  ['Nmi3', 1.574262146858115e-13],
  ['Nmi^3', 1.574262146858115e-13],
  ['Picapt3', 22776990.435870633],
  ['Picapt^3', 22776990.435870633],
  ['Pica3', 22776990.435870633],
  ['Pica^3', 22776990.435870633],
  ['GRT', 0.00035314666721488586],
  ['regton', 0.00035314666721488586],
  ['MTON', 0.0008828666680372147],
]);
defUnits('area', [
  ['m2', 1],
  ['uk_acre', 0.0002471053814671653],
  ['us_acre', 0.0002471043930466279],
  ['ang2', 100000000000000000000],
  ['ang^2', 100000000000000000000],
  ['ar', 0.01],
  ['ft2', 10.763910416709722],
  ['ft^2', 10.763910416709722],
  ['ha', 0.0001],
  ['in2', 1550.0031000062],
  ['in^2', 1550.0031000062],
  ['ly2', 1.117250763128733e-32],
  ['ly^2', 1.117250763128733e-32],
  ['m^2', 1],
  ['Morgen', 0.0004],
  ['mi2', 3.861021585424458e-7],
  ['mi^2', 3.861021585424458e-7],
  ['Nmi2', 2.9155334959812285e-7],
  ['Nmi^2', 2.9155334959812285e-7],
  ['Picapt2', 8035216.070432141],
  ['Pica2', 8035216.070432141],
  ['Pica^2', 8035216.070432141],
  ['Picapt^2', 8035216.070432141],
  ['yd2', 1.1959900463010802],
  ['yd^2', 1.1959900463010802],
]);
defUnits('info', [
  ['bit', 1],
  ['byte', 0.125],
]);
defUnits('speed', [
  ['m/s', 1],
  ['admkn', 1.9426025694156652],
  ['kn', 1.9438444924406046],
  ['m/h', 3600],
  ['m/hr', 3600],
  ['m/sec', 1],
  ['mph', 2.2369362920544025],
]);
defUnits('temp', [['K', 1], ['kel', 1], ['C', NaN], ['cel', NaN], ['F', NaN], ['fah', NaN], ['Rank', NaN], ['Reau', NaN]]);

/** Unidades que aceitam prefixo decimal (medido) e a potência do prefixo (área/volume). */
const PREFIXABLE: Record<string, number> = {
  g: 1, u: 1, m: 1, ang: 1, ly: 1, parsec: 1, pc: 1, sec: 1, s: 1, Pa: 1, p: 1, atm: 1, at: 1, mmHg: 1, N: 1, dyn: 1, dy: 1,
  pond: 1, J: 1, e: 1, c: 1, cal: 1, eV: 1, ev: 1, Wh: 1, wh: 1, W: 1, w: 1, T: 1, ga: 1, K: 1, kel: 1, uk_pt: 1, l: 1, L: 1,
  lt: 1, ar: 1, bit: 1, byte: 1, 'm/s': 1, 'm/h': 1, 'm/hr': 1, 'm/sec': 1, mph: 1,
  m3: 3, 'm^3': 3, ang3: 3, 'ang^3': 3, m2: 2, 'm^2': 2, ang2: 2, 'ang^2': 2,
};
const PREFIXES: [string, number][] = [
  ['da', 1e1], ['Y', 1e24], ['Z', 1e21], ['E', 1e18], ['P', 1e15], ['T', 1e12], ['G', 1e9], ['M', 1e6], ['k', 1e3], ['h', 1e2],
  ['e', 1e1], ['d', 1e-1], ['c', 1e-2], ['m', 1e-3], ['u', 1e-6], ['n', 1e-9], ['p', 1e-12], ['f', 1e-15], ['a', 1e-18],
  ['z', 1e-21], ['y', 1e-24],
];
const BIN_PREFIXES: [string, number][] = [
  ['Yi', 2 ** 80], ['Zi', 2 ** 70], ['Ei', 2 ** 60], ['Pi', 2 ** 50], ['Ti', 2 ** 40], ['Gi', 2 ** 30], ['Mi', 2 ** 20], ['ki', 2 ** 10],
];

interface Unit { readonly name: string; readonly cat: Cat; readonly u: number; readonly pf: number }

/** Unidade (com prefixo) ou undefined. Nome exato tem prioridade sobre prefixo+unidade. */
function parseUnit(s: string): Unit | undefined {
  const exact = UNITS[s];
  if (exact) return { name: s, cat: exact[0], u: exact[1], pf: 1 };
  for (const [p, f] of BIN_PREFIXES) {
    if (s.startsWith(p)) {
      const r = s.slice(p.length);
      if (r === 'bit' || r === 'byte') return { name: r, cat: 'info', u: UNITS[r]![1], pf: f };
    }
  }
  for (const [p, f] of PREFIXES) {
    if (!s.startsWith(p)) continue;
    const r = s.slice(p.length);
    const base = UNITS[r];
    const pow = PREFIXABLE[r];
    if (base && pow) return { name: r, cat: base[0], u: base[1], pf: Math.pow(f, pow) };
  }
  return undefined;
}

type TempUnit = 'C' | 'F' | 'K' | 'Rank' | 'Reau';
const TEMP_ALIAS: Record<string, TempUnit> = { C: 'C', cel: 'C', F: 'F', fah: 'F', K: 'K', kel: 'K', Rank: 'Rank', Reau: 'Reau' };

/** Fórmulas diretas de cada par (medidas bit a bit). */
function convertTemp(x: number, a: TempUnit, b: TempUnit): number {
  if (a === b) return x;
  switch (a) {
    case 'C': return b === 'F' ? x * 1.8 + 32 : b === 'K' ? x + 273.15 : b === 'Rank' ? (x + 273.15) * 1.8 : x * 0.8;
    case 'F': return b === 'C' ? (x - 32) / 1.8 : b === 'K' ? (x - 32) / 1.8 + 273.15 : b === 'Rank' ? x + 459.67 : (x - 32) * 5 / 9 * 0.8;
    case 'K': return b === 'C' ? x - 273.15 : b === 'F' ? (x - 273.15) * 1.8 + 32 : b === 'Rank' ? x * 1.8 : (x - 273.15) * 0.8;
    case 'Rank': return b === 'C' ? x / 1.8 - 273.15 : b === 'F' ? x - 459.67 : b === 'K' ? x / 1.8 : (x / 1.8 - 273.15) * 0.8;
    default: { const c = x / 0.8; return b === 'C' ? c : b === 'F' ? c * 1.8 + 32 : b === 'K' ? c + 273.15 : (c + 273.15) * 1.8; }
  }
}

export function convertUnits(x: number, from: string, to: string): Num {
  const a = parseUnit(from), b = parseUnit(to);
  if (!a || !b || a.cat !== b.cat) return ERR.NA;
  if (a.cat === 'temp') {
    const ta = TEMP_ALIAS[a.name]!, tb = TEMP_ALIAS[b.name]!;
    // medido: o prefixo do kelvin é ignorado de mK/kK para Rank e entre Reau e mK/kK
    const ignore = (ta === 'K' && (tb === 'Rank' || tb === 'Reau')) || (tb === 'K' && ta === 'Reau');
    const xa = ignore ? x : x * a.pf;
    const r = convertTemp(xa, ta, tb);
    return fin(ignore ? r : r / b.pf);
  }
  if (from === to) return x;
  return fin(x * (b.u / a.u) * a.pf / b.pf);
}

const convert: FnDef = {
  name: 'CONVERT', minArgs: 3, maxArgs: 3, args: 'any', acceptsErrors: true,
  call: (args: readonly Value[], ctx: FnContext) => {
    const raw = args.map((a) => atpRaw(a, ctx));
    return liftScalars(raw, ([n, f, t]) => {
      const x = atpNum(n!, ctx);
      if (x instanceof CalcError) return x;
      for (const u of [f, t]) {
        if (u instanceof CalcError) return u;
        if (typeof u === 'boolean') return ERR.VALUE;
      }
      if (typeof f !== 'string' || typeof t !== 'string') return ERR.NA;
      return convertUnits(x, f, t);
    });
  },
};

// ---------------------------------------------------------------------------
// DELTA / GESTEP

const delta = atpFn('DELTA', 1, 2, ([a, b]) => (a === b ? 1 : 0), { defaults: [0] });
const gestep = atpFn('GESTEP', 1, 2, ([n, s]) => (n! >= s! ? 1 : 0), { defaults: [0] });

// ---------------------------------------------------------------------------
// ERF / ERFC (W. J. Cody, SPECFUN CALERF — precisão de máquina, como o Excel 2010+)

const EA = [3.16112374387056560e00, 1.13864154151050156e02, 3.77485237685302021e02, 3.20937758913846947e03, 1.85777706184603153e-1];
const EB = [2.36012909523441209e01, 2.44024637934444173e02, 1.28261652607737228e03, 2.84423683343917062e03];
const EC = [5.64188496988670089e-1, 8.88314979438837594e00, 6.61191906371416295e01, 2.98635138197400131e02, 8.81952221241769090e02,
  1.71204761263407058e03, 2.05107837782607147e03, 1.23033935479799725e03, 2.15311535474403846e-8];
const ED = [1.57449261107098347e01, 1.17693950891312499e02, 5.37181101862009858e02, 1.62138957456669019e03, 3.29079923573345963e03,
  4.36261909014324716e03, 3.43936767414372164e03, 1.23033935480374942e03];
const EP = [3.05326634961232344e-1, 3.60344899949804439e-1, 1.25781726111229246e-1, 1.60837851487422766e-2, 6.58749161529837803e-4,
  1.63153871373020978e-2];
const EQ = [2.56852019228982242e00, 1.87295284992346725e00, 5.27905102951428412e-1, 6.05183413124413191e-2, 2.33520497626869185e-3];
const SQRPI = 5.6418958354775628695e-1;

/** erf (jint=0) ou erfc (jint=1). */
function calerf(x: number, jint: 0 | 1): number {
  const y = Math.abs(x);
  let result: number;
  if (y <= 0.46875) {
    const ysq = y > 1.11e-16 ? y * y : 0;
    let xnum = EA[4]! * ysq, xden = ysq;
    for (let i = 0; i < 3; i++) { xnum = (xnum + EA[i]!) * ysq; xden = (xden + EB[i]!) * ysq; }
    result = x * (xnum + EA[3]!) / (xden + EB[3]!);
    return jint === 0 ? result : 1 - result;
  }
  if (y <= 4) {
    let xnum = EC[8]! * y, xden = y;
    for (let i = 0; i < 7; i++) { xnum = (xnum + EC[i]!) * y; xden = (xden + ED[i]!) * y; }
    result = (xnum + EC[7]!) / (xden + ED[7]!);
    const ysq = Math.trunc(y * 16) / 16, del = (y - ysq) * (y + ysq);
    result = Math.exp(-ysq * ysq) * Math.exp(-del) * result;
  } else {
    result = 0;
    if (y < 26.543) {
      const ysq0 = 1 / (y * y);
      let xnum = EP[5]! * ysq0, xden = ysq0;
      for (let i = 0; i < 4; i++) { xnum = (xnum + EP[i]!) * ysq0; xden = (xden + EQ[i]!) * ysq0; }
      result = ysq0 * (xnum + EP[4]!) / (xden + EQ[4]!);
      result = (SQRPI - result) / y;
      const ysq = Math.trunc(y * 16) / 16, del = (y - ysq) * (y + ysq);
      result = Math.exp(-ysq * ysq) * Math.exp(-del) * result;
    }
  }
  // result = erfc(|x|)
  if (jint === 0) { const r = 0.5 - result + 0.5; return x < 0 ? -r : r; }
  return x < 0 ? 2 - result : result;
}
export const erf = (x: number): number => calerf(x, 0);
export const erfc = (x: number): number => calerf(x, 1);

// medido: ERF(a;b) = ERFC(a) − ERFC(b) (bit a bit); as .PRECISE também seguem as regras ATP
const erfFn = atpFn('ERF', 1, 2, (a) => (a.length > 1 ? erfc(a[0]!) - erfc(a[1]!) : erf(a[0]!)));
const erfPrecise = atpFn('ERF.PRECISE', 1, 1, ([x]) => erf(x!), { prefix: X });
const erfcFn = atpFn('ERFC', 1, 1, ([x]) => erfc(x!));
const erfcPrecise = atpFn('ERFC.PRECISE', 1, 1, ([x]) => erfc(x!), { prefix: X });

// ---------------------------------------------------------------------------
// Bessel — Numerical Recipes em C (2ª ed.), como o Excel.

function bessj0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8.0) {
    const y = x * x;
    const a1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
    const a2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y * 1.0))));
    return a1 / a2;
  }
  const z = 8.0 / ax, y = z * z, xx = ax - 0.785398164;
  const a1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const a2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
}
function bessj1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8.0) {
    const y = x * x;
    const a1 = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))));
    const a2 = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y * 1.0))));
    return a1 / a2;
  }
  const z = 8.0 / ax, y = z * z, xx = ax - 2.356194491;
  const a1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
  const a2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const r = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
  return x < 0 ? -r : r;
}
function bessj(n: number, x: number): number {
  if (n === 0) return bessj0(x);
  if (n === 1) return bessj1(x);
  const ax = Math.abs(x);
  if (ax === 0) return 0;
  let ans: number;
  const tox = 2.0 / ax;
  if (ax > n) {
    let bjm = bessj0(ax), bj = bessj1(ax);
    for (let j = 1; j < n; j++) { const bjp = j * tox * bj - bjm; bjm = bj; bj = bjp; }
    ans = bj;
  } else {
    const m = 2 * Math.trunc((n + Math.trunc(Math.sqrt(40 * n))) / 2);
    let jsum = false, bjp = 0, sum = 0, bj = 1.0;
    ans = 0;
    for (let j = m; j > 0; j--) {
      const bjm = j * tox * bj - bjp;
      bjp = bj; bj = bjm;
      if (Math.abs(bj) > 1e10) { bj *= 1e-10; bjp *= 1e-10; ans *= 1e-10; sum *= 1e-10; }
      if (jsum) sum += bj;
      jsum = !jsum;
      if (j === n) ans = bjp;
    }
    sum = 2.0 * sum - bj;
    ans /= sum;
  }
  return x < 0 && n & 1 ? -ans : ans;
}
function bessy0(x: number): number {
  if (x < 8.0) {
    const y = x * x;
    const a1 = -2957821389.0 + y * (7062834065.0 + y * (-512359803.6 + y * (10879881.29 + y * (-86327.92757 + y * 228.4622733))));
    const a2 = 40076544269.0 + y * (745249964.8 + y * (7189466.438 + y * (47447.26470 + y * (226.1030244 + y * 1.0))));
    return a1 / a2 + 0.636619772 * bessj0(x) * Math.log(x);
  }
  const z = 8.0 / x, y = z * z, xx = x - 0.785398164;
  const a1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const a2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 + y * (-0.934945152e-7))));
  return Math.sqrt(0.636619772 / x) * (Math.sin(xx) * a1 + z * Math.cos(xx) * a2);
}
function bessy1(x: number): number {
  if (x < 8.0) {
    const y = x * x;
    const a1 = x * (-0.4900604943e13 + y * (0.1275274390e13 + y * (-0.5153438139e11 + y * (0.7349264551e9 + y * (-0.4237922726e7 + y * 0.8511937935e4)))));
    const a2 = 0.2499580570e14 + y * (0.4244419664e12 + y * (0.3733650367e10 + y * (0.2245904002e8 + y * (0.1020426050e6 + y * (0.3549632885e3 + y)))));
    return a1 / a2 + 0.636619772 * (bessj1(x) * Math.log(x) - 1.0 / x);
  }
  const z = 8.0 / x, y = z * z, xx = x - 2.356194491;
  const a1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
  const a2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  return Math.sqrt(0.636619772 / x) * (Math.sin(xx) * a1 + z * Math.cos(xx) * a2);
}
function bessy(n: number, x: number): number {
  if (n === 0) return bessy0(x);
  if (n === 1) return bessy1(x);
  const tox = 2.0 / x;
  let by = bessy1(x), bym = bessy0(x);
  for (let j = 1; j < n; j++) { const byp = j * tox * by - bym; bym = by; by = byp; }
  return by;
}
function bessi0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    let y = x / 3.75; y *= y;
    return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492 + y * (0.2659732 + y * (0.360768e-1 + y * 0.45813e-2)))));
  }
  const y = 3.75 / ax;
  return (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + y * (0.1328592e-1 + y * (0.225319e-2 + y * (-0.157565e-2 + y * (0.916281e-2
    + y * (-0.2057706e-1 + y * (0.2635537e-1 + y * (-0.1647633e-1 + y * 0.392377e-2))))))));
}
function bessi1(x: number): number {
  const ax = Math.abs(x);
  let ans: number;
  if (ax < 3.75) {
    let y = x / 3.75; y *= y;
    ans = ax * (0.5 + y * (0.87890594 + y * (0.51498869 + y * (0.15084934 + y * (0.2658733e-1 + y * (0.301532e-2 + y * 0.32411e-3))))));
  } else {
    const y = 3.75 / ax;
    ans = 0.2282967e-1 + y * (-0.2895312e-1 + y * (0.1787654e-1 - y * 0.420059e-2));
    ans = 0.39894228 + y * (-0.3988024e-1 + y * (-0.362018e-2 + y * (0.163801e-2 + y * (-0.1031555e-1 + y * ans))));
    ans *= Math.exp(ax) / Math.sqrt(ax);
  }
  return x < 0 ? -ans : ans;
}
function bessi(n: number, x: number): number {
  if (n === 0) return bessi0(x);
  if (n === 1) return bessi1(x);
  if (x === 0) return 0;
  const tox = 2.0 / Math.abs(x);
  let bip = 0, ans = 0, bi = 1.0;
  for (let j = 2 * (n + Math.trunc(Math.sqrt(40 * n))); j > 0; j--) {
    const bim = bip + j * tox * bi;
    bip = bi; bi = bim;
    if (Math.abs(bi) > 1e10) { ans *= 1e-10; bi *= 1e-10; bip *= 1e-10; }
    if (j === n) ans = bip;
  }
  ans *= bessi0(x) / bi;
  return x < 0 && n & 1 ? -ans : ans;
}
function bessk0(x: number): number {
  if (x <= 2.0) {
    const y = (x * x) / 4.0;
    return -Math.log(x / 2.0) * bessi0(x) + (-0.57721566 + y * (0.42278420 + y * (0.23069756 + y * (0.3488590e-1 + y * (0.262698e-2 + y * (0.10750e-3 + y * 0.74e-5))))));
  }
  const y = 2.0 / x;
  return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + y * (-0.7832358e-1 + y * (0.2189568e-1 + y * (-0.1062446e-1 + y * (0.587872e-2 + y * (-0.251540e-2 + y * 0.53208e-3))))));
}
function bessk1(x: number): number {
  if (x <= 2.0) {
    const y = (x * x) / 4.0;
    return Math.log(x / 2.0) * bessi1(x) + (1.0 / x) * (1.0 + y * (0.15443144 + y * (-0.67278579 + y * (-0.18156897 + y * (-0.1919402e-1 + y * (-0.110404e-2 + y * (-0.4686e-4)))))));
  }
  const y = 2.0 / x;
  return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + y * (0.23498619 + y * (-0.3655620e-1 + y * (0.1504268e-1 + y * (-0.780353e-2 + y * (0.325614e-2 + y * (-0.68245e-3)))))));
}
function bessk(n: number, x: number): number {
  if (n === 0) return bessk0(x);
  if (n === 1) return bessk1(x);
  const tox = 2.0 / x;
  let bkm = bessk0(x), bk = bessk1(x);
  for (let j = 1; j < n; j++) { const bkp = bkm + j * tox * bk; bkm = bk; bk = bkp; }
  return bk;
}

function besselFn(name: string, f: (n: number, x: number) => number, positiveX: boolean): FnDef {
  return atpFn(name, 2, 2, ([x, nn]) => {
    if (nn! < 0) return ERR.NUM; // medido: BESSELI(1,5;−0,5) = #NUM! (antes de truncar)
    const n = Math.trunc(nn!);
    if (positiveX && x! <= 0) return ERR.NUM;
    return finFlush(f(n, x!));
  });
}

register(
  ...(['BIN', 'OCT', 'DEC', 'HEX'] as const).flatMap((a) => (['BIN', 'OCT', 'DEC', 'HEX'] as const).filter((b) => a !== b).map((b) => baseConv(a, b))),
  bitOp('BITAND', (a, b) => a & b), bitOp('BITOR', (a, b) => a | b), bitOp('BITXOR', (a, b) => a ^ b),
  numFn('BITLSHIFT', 2, 2, ([n, s]) => shift(n!, s!), { prefix: X }),
  numFn('BITRSHIFT', 2, 2, ([n, s]) => shift(n!, -s!), { prefix: X }),
  convert, delta, gestep, erfFn, erfPrecise, erfcFn, erfcPrecise,
  besselFn('BESSELJ', bessj, false), besselFn('BESSELY', bessy, true), besselFn('BESSELI', bessi, false), besselFn('BESSELK', bessk, true),
);

