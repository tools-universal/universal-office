/**
 * Números complexos (COMPLEX, IM*). Dono: agente FN-MATH.
 *
 * Regras medidas no Excel 365 (oráculo pt-BR):
 * - Texto "a+bi"/"a+bj" no decimal do idioma ("1,5+2i" no pt-BR; "1.5+2i" = #NUM!),
 *   espaços ignorados, "+-" vira "-", sem parte imaginária ou real aceito; vazio = #NUM!;
 *   número vira complexo real; booleano = #VALUE!; misturar i e j = #VALUE!.
 * - Saída: 15 dígitos significativos; notação fixa enquanto couber em 21
 *   caracteres (sem o sinal), senão científica com expoente de 2 dígitos no mínimo
 *   ("1,22514845490862E-16+2i", "1E+21+i", "0,000000000000001+i"); ±1 imaginário = "i".
 * - Funções polares (IMSQRT, IMPOWER) usam o seno/cosseno do Excel (π do x87):
 *   IMSQRT("-4") = "1,22514845490862E-16+2i".
 */
import { register, type FnContext, type FnDef, type ValueLocale } from '../fn.js';
import { ArrayValue, CalcError, ERR, LambdaValue, RefValue, type Scalar, type Value } from '../values.js';
import { atpRaw, cosExt, excelPower, fin, liftScalars, sinExt, tanExt, TRIG_LIMIT } from './math-util.js';

const X = '_xlfn.';

export interface Complex { readonly re: number; readonly im: number; readonly sfx?: 'i' | 'j' }

/** Número com 15 dígitos: fixo até 21 caracteres, senão científico (E±dd). */
export function formatImNumber(x: number, locale: ValueLocale): string {
  if (x === 0) return '0';
  const neg = x < 0;
  const s = Math.abs(x).toExponential(14);
  const ei = s.indexOf('e');
  const digits = (s[0]! + s.slice(2, ei)).replace(/0+$/, '');
  const e = parseInt(s.slice(ei + 1), 10);
  let fixed: string;
  if (e >= 0) {
    fixed = digits.length <= e + 1 ? digits + '0'.repeat(e + 1 - digits.length) : digits.slice(0, e + 1) + locale.decimal + digits.slice(e + 1);
  } else {
    fixed = '0' + locale.decimal + '0'.repeat(-e - 1) + digits;
  }
  let out: string;
  if (fixed.length <= 21) out = fixed;
  else {
    const mant = digits.length > 1 ? digits[0] + locale.decimal + digits.slice(1) : digits;
    out = `${mant}E${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`;
  }
  return neg ? '-' + out : out;
}

export function formatComplex(c: Complex, locale: ValueLocale): string {
  const sfx = c.sfx ?? 'i';
  const re = c.re === 0 ? 0 : c.re, im = c.im === 0 ? 0 : c.im;
  if (im === 0) return formatImNumber(re, locale);
  const mag = formatImNumber(Math.abs(im), locale);
  const imText = (mag === '1' ? '' : mag) + sfx;
  if (re === 0) return (im < 0 ? '-' : '') + imText;
  return formatImNumber(re, locale) + (im < 0 ? '-' : '+') + imText;
}

/** Lê o texto de um complexo (undefined = #NUM!). */
export function parseComplex(text: string, locale: ValueLocale): Complex | undefined {
  const s = text.replace(/ /g, '');
  if (!s) return undefined;
  const d = locale.decimal === '.' ? '\\.' : locale.decimal;
  const num = `(?:\\d+(?:${d}\\d*)?|${d}\\d+)(?:[eE][+-]?\\d+)?`;
  const toNum = (t: string): number => Number(t.replace(locale.decimal, '.'));
  let m = new RegExp(`^([+-]?)(${num})$`).exec(s);
  if (m) return { re: (m[1] === '-' ? -1 : 1) * toNum(m[2]!), im: 0 };
  m = new RegExp(`^([+-]?)(${num})?([ij])$`).exec(s);
  if (m) return { re: 0, im: (m[1] === '-' ? -1 : 1) * (m[2] ? toNum(m[2]) : 1), sfx: m[3] as 'i' | 'j' };
  m = new RegExp(`^([+-]?)(${num})([+-]{1,2})(${num})?([ij])$`).exec(s);
  if (m) {
    const sg = m[3]!.split('').reduce((a, c) => (c === '-' ? -a : a), 1);
    return { re: (m[1] === '-' ? -1 : 1) * toNum(m[2]!), im: sg * (m[4] ? toNum(m[4]) : 1), sfx: m[5] as 'i' | 'j' };
  }
  return undefined;
}

/** Complexo de um escalar (regras ATP). */
function toComplex(v: Scalar, ctx: FnContext): Complex | CalcError {
  if (v instanceof CalcError) return v;
  if (typeof v === 'boolean') return ERR.VALUE;
  if (v === null) return { re: 0, im: 0 };
  if (typeof v === 'number') return { re: v, im: 0 };
  return parseComplex(v, ctx.locale) ?? ERR.NUM;
}

/** Sufixo comum (misturar i e j = #VALUE!). */
function joinSfx(cs: readonly Complex[]): 'i' | 'j' | undefined | CalcError {
  let s: 'i' | 'j' | undefined;
  for (const c of cs) {
    if (!c.sfx) continue;
    if (s && s !== c.sfx) return ERR.VALUE;
    s = c.sfx;
  }
  return s;
}

type CxResult = Complex | number | CalcError;

/** Função de complexos de aridade fixa: argumentos complexos (ou números nas posições `nums`). */
function cxFn(name: string, min: number, max: number, body: (cs: Complex[], ns: number[]) => CxResult, o: { prefix?: string; nums?: readonly number[] } = {}): FnDef {
  return {
    name, prefix: o.prefix, minArgs: min, maxArgs: max, args: 'any', acceptsErrors: true,
    call: (args: readonly Value[], ctx: FnContext) => {
      const raw = args.map((a) => atpRaw(a, ctx));
      return liftScalars(raw, (s) => {
        const cs: Complex[] = [], ns: number[] = [];
        for (let i = 0; i < s.length; i++) {
          if (o.nums?.includes(i)) {
            const v = s[i]!;
            if (v instanceof CalcError) return v;
            if (typeof v === 'boolean') return ERR.VALUE;
            const c = toComplex(v, ctx);
            if (c instanceof CalcError) return typeof v === 'string' ? ERR.VALUE : c;
            if (c.im !== 0) return ERR.VALUE;
            ns.push(c.re);
            continue;
          }
          const c = toComplex(s[i]!, ctx);
          if (c instanceof CalcError) return c;
          cs.push(c);
        }
        const sfx = joinSfx(cs);
        if (sfx instanceof CalcError) return ERR.NUM; // medido: IMDIV("3+4i";"1+j") = #NUM! (IMSUM dá #VALUE!)
        const r = body(cs, ns);
        if (r instanceof CalcError) return r;
        if (typeof r === 'number') return fin(r);
        if (!Number.isFinite(r.re) || !Number.isFinite(r.im)) return ERR.NUM;
        return formatComplex(flush(r, sfx), ctx.locale);
      });
    },
  };
}

/** Lista de complexos de IMSUM/IMPRODUCT (aceitam intervalos e matrizes). */
function cxList(args: readonly Value[], ctx: FnContext): Complex[] | CalcError {
  const out: Complex[] = [];
  const take = (v: Scalar): CalcError | undefined => {
    const c = toComplex(v, ctx);
    if (c instanceof CalcError) return c;
    out.push(c);
    return undefined;
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === null) { if (i === args.length - 1 && i > 0) continue; return ERR.NA; }
    if (a instanceof RefValue) {
      for (const area of a.areas) {
        for (let r = area.r1; r <= area.r2; r++) for (let c = area.c1; c <= area.c2; c++) {
          const e = take(ctx.cell(area.sheet, r, c));
          if (e) return e;
        }
      }
    } else if (a instanceof ArrayValue) {
      for (const v of a.data) { const e = take(v); if (e) return e; }
    } else if (a instanceof LambdaValue) return ERR.VALUE;
    else { const e = take(a); if (e) return e; }
  }
  return out;
}

function cxListFn(name: string, f: (cs: Complex[]) => Complex, overflow: CalcError = ERR.NUM): FnDef {
  return {
    name, minArgs: 1, maxArgs: 255, args: 'any', acceptsErrors: true,
    call: (args: readonly Value[], ctx: FnContext) => {
      const cs = cxList(args, ctx);
      if (cs instanceof CalcError) return cs;
      const sfx = joinSfx(cs);
      if (sfx instanceof CalcError) return sfx;
      const r = f(cs);
      if (!Number.isFinite(r.re) || !Number.isFinite(r.im)) return overflow;
      return formatComplex(flush(r, sfx), ctx.locale);
    },
  };
}

// ---------------------------------------------------------------------------
// Aritmética

/** Subnormais viram 0 (como o Excel) e o sufixo é aplicado. */
function flush(z: Complex, sfx: 'i' | 'j' | undefined): Complex {
  const f = (v: number): number => (Math.abs(v) < 2.2250738585072014e-308 ? 0 : v);
  return { re: f(z.re), im: f(z.im), sfx };
}

const mul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
/** Divisão de Smith (sem estouro no denominador). */
function smith(a: Complex, b: Complex): Complex | CalcError {
  if (b.re === 0 && b.im === 0) return ERR.NUM;
  // medido: IMSECH("1E+20+1E-20i") = 0 (divisor infinito)
  if (Number.isNaN(b.re) || Number.isNaN(b.im)) return ERR.NUM;
  if (!Number.isFinite(b.re) || !Number.isFinite(b.im)) return Number.isFinite(a.re) && Number.isFinite(a.im) ? { re: 0, im: 0 } : ERR.NUM;
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re, den = b.re + b.im * r;
    return { re: (a.re + a.im * r) / den, im: (a.im - a.re * r) / den };
  }
  const r = b.re / b.im, den = b.re * r + b.im;
  return { re: (a.re * r + a.im) / den, im: (a.im * r - a.re) / den };
}
/** Divisão pela fórmula direta a·conj(b)/|b|² (a do IMDIV); com |b|² fora da faixa, Smith. */
function div(a: Complex, b: Complex): Complex | CalcError {
  const d = b.re * b.re + b.im * b.im;
  if (b.re === 0 && b.im === 0) return ERR.NUM;
  if (!(d > 2.2250738585072014e-308 && d < Infinity)) return smith(a, b);
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
const abs = (z: Complex): number => Math.hypot(z.re, z.im);
const arg = (z: Complex): number => Math.atan2(z.im, z.re);
const polar = (r: number, t: number): Complex => ({ re: r * cosExt(t), im: r * sinExt(t) });
function ln(z: Complex): Complex | CalcError {
  if (z.re === 0 && z.im === 0) return ERR.NUM;
  return { re: Math.log(abs(z)), im: arg(z) };
}
const DBL_MAX = 1.7976931348623157e308;
/**
 * e^x como o ATP: calculado em precisão estendida (x87) e convertido para double
 * saturando em DBL_MAX; só estoura (#NUM!) quando passa até da faixa estendida
 * (x > 11356,5). Medido: IMEXP("1e3+0,01i") = 1,79760325095461E+308+…; IMEXP("1E20") = #NUM!.
 */
function expC(x: number): number {
  const e = Math.exp(x);
  return Number.isFinite(e) ? e : x < 11356.5 ? DBL_MAX : Infinity;
}
function exp(z: Complex): Complex { return polar(expC(z.re), z.im); }
// seno/cosseno do Excel (π do x87, |x| >= 2^27 = #NUM!) e hiperbólicas pela fórmula com exp
const S = (x: number): number => (Math.abs(x) >= TRIG_LIMIT ? NaN : sinExt(x));
const C = (x: number): number => (Math.abs(x) >= TRIG_LIMIT ? NaN : cosExt(x));
const shN = (y: number): number => (expC(y) - expC(-y)) / 2;
const chN = (y: number): number => (expC(y) + expC(-y)) / 2;
function sin(z: Complex): Complex { return { re: S(z.re) * chN(z.im), im: C(z.re) * shN(z.im) }; }
function cos(z: Complex): Complex { return { re: C(z.re) * chN(z.im), im: -S(z.re) * shN(z.im) }; }
function sinh(z: Complex): Complex { return { re: Math.sinh(z.re) * C(z.im), im: Math.cosh(z.re) * S(z.im) }; }
function cosh(z: Complex): Complex { return { re: Math.cosh(z.re) * C(z.im), im: Math.sinh(z.re) * S(z.im) }; }
/** tan z = (sen 2x + i senh 2y)/(cos 2x + cosh 2y) (medido); real puro = TAN. */
function tan(z: Complex): Complex {
  if (z.im === 0) return { re: Math.abs(z.re) >= TRIG_LIMIT ? NaN : tanExt(z.re), im: 0 };
  const ch = Math.cosh(2 * z.im);
  if (!Number.isFinite(ch)) return { re: 0 * S(2 * z.re), im: Math.sign(z.im) };
  const d = C(2 * z.re) + ch;
  return { re: S(2 * z.re) / d, im: Math.sinh(2 * z.im) / d };
}
/** cot z = (sen 2x − i senh 2y)/(cosh 2y − cos 2x) (medido, inclusive o cancelamento perto de 0). */
function cot(z: Complex): Complex | CalcError {
  if (z.im === 0) {
    if (Math.abs(z.re) >= TRIG_LIMIT) return { re: 0, im: 0 }; // medido: IMCOT("1E+300") = 0
    return div({ re: C(z.re), im: 0 }, { re: S(z.re), im: 0 });
  }
  const ch = chN(2 * z.im);
  if (!Number.isFinite(ch)) return { re: 0 * S(2 * z.re), im: -Math.sign(z.im) };
  const d = ch - C(2 * z.re);
  return { re: S(2 * z.re) / d, im: -shN(2 * z.im) / d };
}
const ONE: Complex = { re: 1, im: 0 };
const hypCx = (z: Complex): { s: Complex; c: Complex } => (z.im === 0
  ? { s: { re: Math.sinh(z.re), im: 0 }, c: { re: chN(z.re), im: 0 } }
  : { s: { re: shN(z.re) * C(z.im), im: chN(z.re) * S(z.im) }, c: { re: chN(z.re) * C(z.im), im: shN(z.re) * S(z.im) } });

const complexFn: FnDef = {
  name: 'COMPLEX', minArgs: 2, maxArgs: 3, args: 'any', acceptsErrors: true,
  call: (args: readonly Value[], ctx: FnContext) => {
    const raw = args.map((a, i) => (i === 2 && a === null ? 'i' : atpRaw(a, ctx)));
    return liftScalars(raw, ([r, i, s]) => {
      const xs: number[] = [];
      for (const v of [r, i]) {
        if (v instanceof CalcError) return v;
        if (typeof v === 'boolean') return ERR.VALUE;
        const c = toComplex(v!, ctx);
        if (c instanceof CalcError || c.im !== 0) return ERR.VALUE;
        xs.push(c.re);
      }
      let sfx: 'i' | 'j' = 'i';
      if (s !== undefined) {
        if (s instanceof CalcError) return s;
        if (s === 'j') sfx = 'j';
        else if (!(s === 'i' || s === '' || s === 0)) return ERR.VALUE; // medido: só "i", "j" ou vazio
      }
      return formatComplex({ re: xs[0]!, im: xs[1]!, sfx }, ctx.locale);
    });
  },
};

register(
  complexFn,
  cxFn('IMABS', 1, 1, ([z]) => abs(z!)),
  cxFn('IMAGINARY', 1, 1, ([z]) => z!.im),
  cxFn('IMREAL', 1, 1, ([z]) => z!.re),
  cxFn('IMARGUMENT', 1, 1, ([z]) => (z!.re === 0 && z!.im === 0 ? ERR.DIV0 : arg(z!))),
  cxFn('IMCONJUGATE', 1, 1, ([z]) => ({ re: z!.re, im: -z!.im })),
  cxFn('IMDIV', 2, 2, ([a, b]) => div(a!, b!)),
  cxFn('IMSUB', 2, 2, ([a, b]) => ({ re: a!.re - b!.re, im: a!.im - b!.im })),
  cxListFn('IMSUM', (cs) => cs.reduce((a, b) => ({ re: a.re + b.re, im: a.im + b.im }), { re: 0, im: 0 })),
  cxListFn('IMPRODUCT', (cs) => cs.slice(1).reduce(mul, cs[0]!), ERR.VALUE),
  cxFn('IMEXP', 1, 1, ([z]) => exp(z!)),
  cxFn('IMLN', 1, 1, ([z]) => ln(z!)),
  cxFn('IMLOG10', 1, 1, ([z]) => { const l = ln(z!); return l instanceof CalcError ? l : { re: l.re / Math.LN10, im: l.im / Math.LN10 }; }),
  cxFn('IMLOG2', 1, 1, ([z]) => { const l = ln(z!); return l instanceof CalcError ? l : { re: l.re / Math.LN2, im: l.im / Math.LN2 }; }),
  cxFn('IMPOWER', 2, 2, ([z], [n]) => {
    if (z!.re === 0 && z!.im === 0) return n! > 0 ? { re: 0, im: 0 } : ERR.NUM;
    const r = excelPower(abs(z!), n!);
    if (r instanceof CalcError) return r;
    return polar(r, n! * arg(z!));
  }, { nums: [1] }),
  // medido: IMSQRT usa |z| = √(x²+y²) direto (IMSQRT("1E-300") = 0; "1E+300" = #NUM!)
  cxFn('IMSQRT', 1, 1, ([z]) => polar(Math.sqrt(Math.sqrt(z!.re * z!.re + z!.im * z!.im)), arg(z!) / 2)),
  cxFn('IMSIN', 1, 1, ([z]) => sin(z!)),
  cxFn('IMCOS', 1, 1, ([z]) => cos(z!)),
  cxFn('IMTAN', 1, 1, ([z]) => tan(z!), { prefix: X }),
  cxFn('IMCOT', 1, 1, ([z]) => cot(z!), { prefix: X }),
  cxFn('IMSEC', 1, 1, ([z]) => smith(ONE, cos(z!)), { prefix: X }),
  cxFn('IMCSC', 1, 1, ([z]) => smith(ONE, sin(z!)), { prefix: X }),
  cxFn('IMSINH', 1, 1, ([z]) => sinh(z!), { prefix: X }),
  cxFn('IMCOSH', 1, 1, ([z]) => cosh(z!), { prefix: X }),
  cxFn('IMSECH', 1, 1, ([z]) => div(ONE, hypCx(z!).c), { prefix: X }),
  cxFn('IMCSCH', 1, 1, ([z]) => div(ONE, hypCx(z!).s), { prefix: X }),
);
