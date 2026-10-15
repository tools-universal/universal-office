/**
 * Data e hora (DATE, TIME, DATEVALUE, TIMEVALUE, NOW, TODAY, YEAR/MONTH/DAY, HOUR/MINUTE/SECOND, WEEKDAY, WEEKNUM, ISOWEEKNUM, EDATE, EOMONTH, NETWORKDAYS(.INTL), WORKDAY(.INTL), DATEDIF, DAYS, DAYS360, YEARFRAC).
 * Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR (date.cases.json; lab calc/tdl):
 * - EDATE, EOMONTH, NETWORKDAYS(.INTL), WORKDAY(.INTL), WEEKNUM e YEARFRAC (as
 *   do Analysis ToolPak) com referência de várias células → #VALUE! (nem
 *   interseção implícita); as demais levantam/intersectam normalmente;
 * - YEAR…SECOND/WEEKDAY arredondam a série ao segundo (ver dates.ts); série
 *   negativa ou além de 31/12/9999 → #NUM!;
 * - TIME: partes com INT, cada uma ≤ 32767, total negativo → #NUM!, resultado =
 *   fração do dia (TIME(25;0;0) = 25/24 − 1);
 * - DATEVALUE/TIMEVALUE só aceitam texto (número → #VALUE!); hora sozinha → data 0.
 */
import { register, type FnContext } from '../fn.js';
import { parseDateTimeParts } from '../coerce.js';
import { daysInMonth, excelDate, isLeap, maxSerial, serialToYmd, splitSerial, weekday, ymdToSerial } from '../dates.js';
import { ArrayValue, CalcError, ERR, RefValue, type Scalar, type Value } from '../values.js';
import { yearFrac } from './daycount.js';
import { atpNum, liftAtp, num, OMITTED, txt, type AtpArg } from './tdl-util.js';

const lift = { args: 'value' as const, lift: true };

/** Série arredondada ao segundo → { day, sec } ou #NUM!. */
function split(v: Scalar, ctx: FnContext): { day: number; sec: number } | CalcError {
  const n = num(v, ctx);
  if (n instanceof CalcError) return n;
  return splitSerial(n, ctx.date1904) ?? ERR.NUM;
}

/** Data (parte inteira) de um argumento, validada (0 ≤ série ≤ 31/12/9999). */
function dateArg(v: Scalar, ctx: FnContext): number | CalcError {
  const n = num(v, ctx);
  if (n instanceof CalcError) return n;
  const d = Math.floor(n);
  return d < 0 || d > maxSerial(ctx.date1904) ? ERR.NUM : d;
}

/** Ano/mês/dia de uma série inteira (sistema do workbook). */
function ymd(serial: number, ctx: FnContext): { y: number; m: number; d: number } {
  return serialToYmd(serial, ctx.date1904);
}

/** Série de y/m/d (sem validação). */
function serial(y: number, m: number, d: number, ctx: FnContext): number {
  return ymdToSerial(y, m, d, ctx.date1904);
}

/** Dia da semana (0 = domingo) da série inteira. */
function wd(s: number, ctx: FnContext): number {
  return weekday(s, ctx.date1904);
}

// ───────────────────────────── fins de semana ─────────────────────────────

/** Máscara de fim de semana (índice 0 = domingo … 6 = sábado) do argumento weekend de .INTL. */
function weekendMask(v: Scalar | undefined, ctx: FnContext): boolean[] | CalcError {
  const mask = [true, false, false, false, false, false, true];
  if (v === undefined || v === null) return mask;
  if (typeof v === 'string') {
    if (!/^[01]{7}$/.test(v)) return ERR.VALUE;
    // "seg..dom"
    const m = [v[6] === '1', v[0] === '1', v[1] === '1', v[2] === '1', v[3] === '1', v[4] === '1', v[5] === '1'];
    return m;
  }
  if (typeof v === 'boolean') return ERR.VALUE;
  const n = num(v, ctx);
  if (n instanceof CalcError) return n;
  const k = Math.trunc(n);
  // 1 = sáb+dom, 2 = dom+seg, …, 7 = sex+sáb; 11 = só dom, …, 17 = só sáb
  if (k >= 1 && k <= 7) {
    const a = (k + 5) % 7; // 1 → sábado(6)
    const out = [false, false, false, false, false, false, false];
    out[a] = true; out[(a + 1) % 7] = true;
    return out;
  }
  if (k >= 11 && k <= 17) {
    const out = [false, false, false, false, false, false, false];
    out[(k - 11) % 7] = true;
    return out;
  }
  return ERR.NUM;
}

/** Feriados (datas inteiras, ordenados, sem repetição). */
function holidaySet(v: Value | undefined, ctx: FnContext): Set<number> | CalcError {
  const out = new Set<number>();
  if (v === undefined || v === null) return out;
  let xs: Scalar[];
  if (v instanceof RefValue) {
    xs = [];
    for (let k = 0; k < v.areas.length; k++) xs.push(...ctx.values(v, k).data);
  } else if (v instanceof ArrayValue) xs = v.data.slice();
  else xs = [v as Scalar];
  for (const x of xs) {
    if (x === null) continue;
    if (x instanceof CalcError) return x;
    if (typeof x === 'boolean') return ERR.VALUE;
    const n = num(x, ctx);
    if (n instanceof CalcError) return n;
    if (n < 0) return ERR.NUM;
    out.add(Math.floor(n));
  }
  return out;
}

function networkDays(start: number, end: number, mask: boolean[], hol: Set<number>, ctx: FnContext): number {
  const sign = end >= start ? 1 : -1;
  const [a, b] = sign > 0 ? [start, end] : [end, start];
  const workPerWeek = mask.filter((x) => !x).length;
  const total = b - a + 1;
  const weeks = Math.floor(total / 7);
  let count = weeks * workPerWeek;
  for (let s = a + weeks * 7; s <= b; s++) if (!mask[wd(s, ctx)]) count++;
  for (const h of hol) if (h >= a && h <= b && !mask[wd(h, ctx)]) count--;
  return sign * count;
}

function workday(start: number, days: number, mask: boolean[], hol: Set<number>, ctx: FnContext): number | CalcError {
  if (mask.every((x) => x)) return ERR.VALUE;
  let s = start;
  const step = days >= 0 ? 1 : -1;
  let left = Math.abs(days);
  const workPerWeek = mask.filter((x) => !x).length;
  // salta semanas inteiras quando não há feriado no caminho
  const max = maxSerial(ctx.date1904);
  while (left > 0) {
    if (left > workPerWeek * 2 && hol.size === 0) {
      const weeks = Math.floor(left / workPerWeek) - 1;
      s += step * weeks * 7;
      left -= weeks * workPerWeek;
      continue;
    }
    s += step;
    if (s < 0 || s > max) return ERR.NUM;
    if (!mask[wd(s, ctx)] && !hol.has(s)) left--;
  }
  if (s < 0 || s > max) return ERR.NUM;
  return s;
}

// ───────────────────────────── semanas ─────────────────────────────

function isoWeek(s: number, ctx: FnContext): number {
  // quinta-feira da mesma semana ISO decide o ano
  const dow = (wd(s, ctx) + 6) % 7; // 0 = segunda
  const thu = s - dow + 3;
  const { y } = ymd(thu, ctx);
  const jan1 = serial(y, 1, 1, ctx);
  return Math.floor((thu - jan1) / 7) + 1;
}

/** WEEKNUM tipo → dia em que a semana começa (0 = domingo); 21 = ISO. */
const WEEKNUM_START: Record<number, number> = { 1: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 };

// ───────────────────────────── DATEDIF / DAYS360 / YEARFRAC ─────────────────────────────

function datedif(a: number, b: number, unit: string, ctx: FnContext): number | CalcError {
  if (a > b) return ERR.NUM;
  const s = ymd(a, ctx), e = ymd(b, ctx);
  switch (unit) {
    case 'D': return b - a;
    case 'M': {
      let m = (e.y - s.y) * 12 + e.m - s.m;
      if (e.d < s.d) m--;
      return m;
    }
    case 'Y': {
      let y = e.y - s.y;
      if (e.m < s.m || (e.m === s.m && e.d < s.d)) y--;
      return y;
    }
    case 'YM': {
      let m = e.m - s.m;
      if (e.d < s.d) m--;
      return ((m % 12) + 12) % 12;
    }
    case 'YD': {
      // medido (grade diária 2022–2028): o Excel soma os meses "YM" ao início NO
      // ANO DO INÍCIO e depois os dias "MD" — por isso início em ano não bissexto e
      // fim depois do dia do início em março de ano bissexto dá 1 a menos (e vice-versa)
      const ym = datedif(a, b, 'YM', ctx) as number, md = datedif(a, b, 'MD', ctx) as number;
      return serial(s.y, s.m + ym, s.d, ctx) - a + md;
    }
    case 'MD': {
      // dias como se estivessem no mesmo mês (o anterior ao do fim quando o dia volta)
      if (e.d >= s.d) return e.d - s.d;
      const pm = e.m === 1 ? 12 : e.m - 1, py = e.m === 1 ? e.y - 1 : e.y;
      return daysInMonth(py, pm, ctx.date1904) - s.d + e.d;
    }
  }
  return ERR.NUM;
}

function lastOfFeb(p: { y: number; m: number; d: number }, ctx: FnContext): boolean {
  return p.m === 2 && p.d === daysInMonth(p.y, 2, ctx.date1904);
}

function days360(a: number, b: number, european: boolean, ctx: FnContext): number {
  const s = ymd(a, ctx), e = ymd(b, ctx);
  let sd = s.d, ed = e.d;
  if (european) {
    if (sd === 31) sd = 30;
    if (ed === 31) ed = 30;
  } else {
    if (lastOfFeb(s, ctx)) sd = 30;
    if (sd === 31) sd = 30;
    if (ed === 31) {
      if (sd < 30) return (e.y - s.y) * 360 + (e.m - s.m) * 30 + 30 + 1 - sd;
      ed = 30;
    }
  }
  return (e.y - s.y) * 360 + (e.m - s.m) * 30 + ed - sd;
}

// ───────────────────────────── registro ─────────────────────────────

/** Data de um argumento do Analysis ToolPak (booleano → #VALUE!, omitido → #N/A, fora da faixa → #NUM!). */
function atpDate(v: AtpArg | undefined, ctx: FnContext): number | CalcError {
  const n = atpNum(v, ctx);
  if (n instanceof CalcError) return n;
  const d = Math.floor(n);
  return d < 0 || d > maxSerial(ctx.date1904) ? ERR.NUM : d;
}

/**
 * Meses somados (EDATE/EOMONTH) no calendário REAL: 29/02/1900 (série 60) vira
 * 28/02/1900 (medido: EDATE(60;0) = 59, EOMONTH(1;1) = 59); ano < 1900 → #NUM!
 * mesmo no sistema 1904 (lá EDATE(0;-1) = -31).
 */
function addMonths(d: number, k: number, eom: boolean, ctx: FnContext): number | CalcError {
  const p = ymd(d, ctx);
  const mm = p.m + k;
  const y = p.y + Math.floor((mm - 1) / 12), mo = (((mm - 1) % 12) + 12) % 12 + 1;
  if (y < 1900 || y > 9999) return ERR.NUM;
  const dim = daysInMonth(y, mo, true);
  const s = serial(y, mo, eom ? dim : Math.min(p.d, dim), ctx);
  return s > maxSerial(ctx.date1904) ? ERR.NUM : s;
}

/** weekend dos .INTL: erro → #VALUE! (medido), número inválido → #NUM!, texto inválido → #VALUE!. */
function atpWeekend(v: AtpArg | undefined, ctx: FnContext): boolean[] | CalcError {
  if (v === undefined || v === OMITTED || v === null) return weekendMask(undefined, ctx);
  if (v instanceof CalcError || typeof v === 'boolean') return ERR.VALUE;
  return weekendMask(v, ctx);
}

const atp = (name: string, minArgs: number, maxArgs: number, f: (xs: AtpArg[], ctx: FnContext) => Value, pass?: (i: number) => boolean) => ({
  name, minArgs, maxArgs, args: 'any' as const,
  call: (args: readonly Value[], ctx: FnContext) => liftAtp(args, ctx, (xs) => f(xs, ctx), pass),
});

register(
  {
    name: 'DATE', minArgs: 3, maxArgs: 3, ...lift,
    call: ([y, m, d], ctx) => {
      const a = num(y, ctx); if (a instanceof CalcError) return a;
      const b = num(m, ctx); if (b instanceof CalcError) return b;
      const c = num(d, ctx); if (c instanceof CalcError) return c;
      return excelDate(a, b, c, ctx.date1904) ?? ERR.NUM;
    },
  },
  {
    name: 'TIME', minArgs: 3, maxArgs: 3, ...lift,
    call: ([h, m, s], ctx) => {
      const xs: number[] = [];
      for (const v of [h, m, s]) {
        const n = num(v, ctx);
        if (n instanceof CalcError) return n;
        let k = Math.floor(n);
        if (k > 32767) return ERR.NUM;
        if (k < -32768) k = (((k + 32768) % 65536) + 65536) % 65536 - 32768; // 16 bits (medido: -40000 min = 25536)
        xs.push(k);
      }
      const total = xs[0]! * 3600 + xs[1]! * 60 + xs[2]!;
      if (total < 0) return ERR.NUM;
      const t = total / 86400;
      return t - Math.floor(t);
    },
  },
  {
    name: 'DATEVALUE', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      if (typeof v !== 'string') return v === null ? ERR.VALUE : ERR.VALUE;
      const p = parseDateTimeParts(v, ctx.locale, ctx.date1904);
      if (!p) return ERR.VALUE;
      return Math.floor((p.date ?? 0) + (p.time ?? 0)); // "25:00" = 1, "1/2/2024 25:00" = dia seguinte
    },
  },
  {
    name: 'TIMEVALUE', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      if (typeof v !== 'string') return ERR.VALUE;
      const p = parseDateTimeParts(v, ctx.locale, ctx.date1904);
      if (!p) return ERR.VALUE;
      const t = (p.date ?? 0) + (p.time ?? 0);
      return t - Math.floor(t);
    },
  },
  { name: 'NOW', minArgs: 0, maxArgs: 0, args: 'value', volatile: true, call: (_, ctx) => ctx.now() },
  { name: 'TODAY', minArgs: 0, maxArgs: 0, args: 'value', volatile: true, call: (_, ctx) => Math.floor(ctx.now()) },
  ...(['YEAR', 'MONTH', 'DAY'] as const).map((name) => ({
    name, minArgs: 1, maxArgs: 1, ...lift,
    call: ([v]: readonly Scalar[], ctx: FnContext): Value => {
      const p = split(v!, ctx);
      if (p instanceof CalcError) return p;
      const d = ymd(p.day, ctx);
      return name === 'YEAR' ? d.y : name === 'MONTH' ? d.m : d.d;
    },
  })),
  ...(['HOUR', 'MINUTE', 'SECOND'] as const).map((name) => ({
    name, minArgs: 1, maxArgs: 1, ...lift,
    call: ([v]: readonly Scalar[], ctx: FnContext): Value => {
      const p = split(v!, ctx);
      if (p instanceof CalcError) return p;
      return name === 'HOUR' ? Math.floor(p.sec / 3600) : name === 'MINUTE' ? Math.floor(p.sec / 60) % 60 : p.sec % 60;
    },
  })),
  {
    name: 'WEEKDAY', minArgs: 1, maxArgs: 2, ...lift,
    call: ([v, t], ctx) => {
      // o tipo é validado antes da data (WEEKDAY(-1;"x") = #VALUE!); omitido com ";" = 0 → #NUM!
      let type = 1;
      if (t !== undefined) { const n = num(t, ctx); if (n instanceof CalcError) return n; type = Math.trunc(n); }
      const p = split(v!, ctx);
      if (p instanceof CalcError) return p;
      const w = wd(p.day, ctx); // 0 = domingo
      if (type === 1) return w + 1;
      if (type === 2) return ((w + 6) % 7) + 1;
      if (type === 3) return (w + 6) % 7;
      if (type >= 11 && type <= 17) { const start = (type - 10) % 7; return ((w - start + 7) % 7) + 1; }
      return ERR.NUM;
    },
  },
  atp('WEEKNUM', 1, 2, ([v, t], ctx) => {
    const d = atpDate(v, ctx);
    if (d instanceof CalcError) return d;
    const n = atpNum(t, ctx, 1);
    if (n instanceof CalcError) return n;
    const type = Math.trunc(n);
    if (type === 21) return isoWeek(d, ctx);
    const start = WEEKNUM_START[type];
    if (start === undefined) return ERR.NUM;
    const { y } = ymd(d, ctx);
    const jan1 = serial(y, 1, 1, ctx);
    const off = (wd(jan1, ctx) - start + 7) % 7;
    return Math.floor((d - jan1 + off) / 7) + 1;
  }),
  {
    name: 'ISOWEEKNUM', prefix: '_xlfn.', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => { const d = dateArg(v, ctx); return d instanceof CalcError ? d : isoWeek(d, ctx); },
  },
  ...(['EDATE', 'EOMONTH'] as const).map((name) => atp(name, 2, 2, ([v, m], ctx) => {
    const d = atpDate(v, ctx);
    if (d instanceof CalcError) return d;
    const k = atpNum(m, ctx);
    if (k instanceof CalcError) return k;
    return addMonths(d, Math.trunc(k), name === 'EOMONTH', ctx);
  })),
  atp('NETWORKDAYS', 2, 3, ([a, b, h], ctx) => {
    const s = atpDate(a, ctx); if (s instanceof CalcError) return s;
    const e = atpDate(b, ctx); if (e instanceof CalcError) return e;
    const hol = holidaySet(h as Value | undefined, ctx); if (hol instanceof CalcError) return hol;
    return networkDays(s, e, [true, false, false, false, false, false, true], hol, ctx);
  }, (i) => i === 2),
  {
    // o fim de semana é validado ANTES das datas (medido: ("x";1;0) = #NUM!)
    ...atp('NETWORKDAYS.INTL', 2, 4, ([a, b, w, h], ctx) => {
      const mask = atpWeekend(w, ctx); if (mask instanceof CalcError) return mask;
      const s = atpDate(a, ctx); if (s instanceof CalcError) return s;
      const e = atpDate(b, ctx); if (e instanceof CalcError) return e;
      const hol = holidaySet(h as Value | undefined, ctx); if (hol instanceof CalcError) return hol;
      return networkDays(s, e, mask, hol, ctx);
    }, (i) => i === 3),
  },
  atp('WORKDAY', 2, 3, ([a, n, h], ctx) => {
    const s = atpDate(a, ctx); if (s instanceof CalcError) return s;
    const k = atpNum(n, ctx); if (k instanceof CalcError) return k;
    const hol = holidaySet(h as Value | undefined, ctx); if (hol instanceof CalcError) return hol;
    return workday(s, Math.floor(k), [true, false, false, false, false, false, true], hol, ctx);
  }, (i) => i === 2),
  {
    // dias = 0 devolve o início sem olhar o fim de semana; início+dias fora da
    // faixa → #NUM! antes de validar o fim de semana (medido)
    ...atp('WORKDAY.INTL', 2, 4, ([a, n, w, h], ctx) => {
      const s = atpDate(a, ctx); if (s instanceof CalcError) return s;
      const k = atpNum(n, ctx); if (k instanceof CalcError) return k;
      const days = Math.floor(k);
      if (days === 0) return s;
      if (s + days < 0 || s + days > maxSerial(ctx.date1904)) return ERR.NUM;
      const mask = atpWeekend(w, ctx); if (mask instanceof CalcError) return mask;
      const hol = holidaySet(h as Value | undefined, ctx); if (hol instanceof CalcError) return hol;
      return workday(s, days, mask, hol, ctx);
    }, (i) => i === 3),
  },
  {
    name: 'DATEDIF', minArgs: 3, maxArgs: 3, ...lift,
    call: ([a, b, u], ctx) => {
      const s = dateArg(a, ctx); if (s instanceof CalcError) return s;
      const e = dateArg(b, ctx); if (e instanceof CalcError) return e;
      const unit = txt(u, ctx); if (unit instanceof CalcError) return unit;
      return datedif(s, e, unit.toUpperCase(), ctx);
    },
  },
  {
    name: 'DAYS', prefix: '_xlfn.', minArgs: 2, maxArgs: 2, ...lift,
    call: ([b, a], ctx) => {
      const e = dateArg(b, ctx); if (e instanceof CalcError) return e;
      const s = dateArg(a, ctx); if (s instanceof CalcError) return s;
      return e - s;
    },
  },
  {
    name: 'DAYS360', minArgs: 2, maxArgs: 3, ...lift,
    call: ([a, b, m], ctx) => {
      const s = dateArg(a, ctx); if (s instanceof CalcError) return s;
      const e = dateArg(b, ctx); if (e instanceof CalcError) return e;
      let eu = false;
      if (m !== undefined && m !== null) {
        if (typeof m === 'string') return ERR.VALUE;
        const n = num(m, ctx); if (n instanceof CalcError) return n;
        eu = n !== 0;
      }
      return days360(s, e, eu, ctx);
    },
  },
  atp('YEARFRAC', 2, 3, ([a, b, bs], ctx) => {
    const s = atpDate(a, ctx); if (s instanceof CalcError) return s;
    const e = atpDate(b, ctx); if (e instanceof CalcError) return e;
    const n = atpNum(bs, ctx, 0); if (n instanceof CalcError) return n;
    const basis = Math.trunc(n);
    if (basis < 0 || basis > 4) return ERR.NUM;
    return yearFrac(s, e, basis, ctx.date1904); // o mesmo do FN-MATH (daycount.ts, GetYearFrac do ATP)
  }),
);
