/**
 * Contagem de dias das funções financeiras (bases 0–4) e datas de cupom.
 * Dono: agente FN-MATH. Porta a lógica do Analysis ToolPak (a mesma que o
 * LibreOffice reproduz em analysishelper.cxx), conferida contra o Excel.
 *
 * Bases: 0 = 30/360 americano (NASD), 1 = real/real, 2 = real/360, 3 = real/365,
 * 4 = 30/360 europeu.
 */
import { serialToYmd, ymdToSerial } from '../dates.js';

export const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (m: number, y: number): number =>
  m === 2 ? (isLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;

/** Data de cupom com o "modo último dia" do ATP (a classe ScaDate do LibreOffice). */
export class CDate {
  origDay = 1; day = 1; month = 1; year = 1900;
  lastDayMode = true; lastDay = false; days30 = false; usMode = false;

  static of(serial: number, basis: number, date1904: boolean): CDate {
    const c = new CDate();
    const { y, m, d } = serialToYmd(serial, date1904);
    c.origDay = d; c.month = m; c.year = y;
    c.lastDayMode = basis !== 5;
    c.lastDay = d >= daysInMonth(m, y);
    c.days30 = basis === 0 || basis === 4;
    c.usMode = basis === 0;
    c.setDay();
    return c;
  }
  clone(): CDate { return Object.assign(new CDate(), this); }
  setDay(): void {
    if (this.days30) {
      this.day = Math.min(this.origDay, 30);
      if (this.lastDay || this.day >= daysInMonth(this.month, this.year)) this.day = 30;
    } else {
      const last = daysInMonth(this.month, this.year);
      this.day = this.lastDay ? last : Math.min(this.origDay, last);
    }
  }
  daysInMonthOf(m = this.month): number { return this.days30 ? 30 : daysInMonth(m, this.year); }
  daysInMonthRange(from: number, to: number): number {
    if (from > to) return 0;
    if (this.days30) return (to - from + 1) * 30;
    let n = 0;
    for (let m = from; m <= to; m++) n += daysInMonth(m, this.year);
    return n;
  }
  daysInYearRange(from: number, to: number): number {
    if (from > to) return 0;
    if (this.days30) return (to - from + 1) * 360;
    let n = 0;
    for (let y = from; y <= to; y++) n += isLeap(y) ? 366 : 365;
    return n;
  }
  addMonths(count: number): void {
    let nm = count + this.month;
    if (nm > 12) { nm--; this.year += Math.trunc(nm / 12); this.month = (nm % 12) + 1; }
    else if (nm < 1) { this.year += Math.trunc(nm / 12) - 1; this.month = (nm % 12) + 12; }
    else this.month = nm;
    this.setDay();
  }
  addYears(count: number): void { this.year += count; this.setDay(); }
  setYear(y: number): void { this.year = y; this.setDay(); }
  /** Série da data (com o último dia do mês quando a original era o último). */
  serial(date1904: boolean): number {
    const last = daysInMonth(this.month, this.year);
    const d = this.lastDayMode && this.lastDay ? last : Math.min(last, this.origDay);
    return ymdToSerial(this.year, this.month, d, date1904);
  }
  lt(o: CDate): boolean {
    if (this.year !== o.year) return this.year < o.year;
    if (this.month !== o.month) return this.month < o.month;
    if (this.day !== o.day) return this.day < o.day;
    if (this.lastDay || o.lastDay) return !this.lastDay && o.lastDay;
    return this.origDay < o.origDay;
  }
  gt(o: CDate): boolean { return o.lt(this); }
  /** Dias entre duas datas na base delas (ScaDate::getDiff). */
  static diff(from: CDate, to: CDate): number {
    if (from.gt(to)) return CDate.diff(to, from);
    let n = 0;
    const a = from.clone(), b = to.clone();
    if (to.days30) {
      if (to.usMode) {
        if ((from.month === 2 || from.day < 30) && b.origDay === 31) b.day = 31;
        else if (b.month === 2 && b.lastDay) b.day = daysInMonth(2, b.year);
      } else {
        if (a.month === 2 && a.day === 30) a.day = daysInMonth(2, a.year);
        if (b.month === 2 && b.day === 30) b.day = daysInMonth(2, b.year);
      }
    }
    if (a.year < b.year || (a.year === b.year && a.month < b.month)) {
      n = a.daysInMonthOf() - a.day + 1;
      a.origDay = a.day = 1;
      a.lastDay = false;
      a.addMonths(1);
      if (a.year < b.year) {
        n += a.daysInMonthRange(a.month, 12);
        a.addMonths(13 - a.month);
        n += a.daysInYearRange(a.year, b.year - 1);
        a.addYears(b.year - a.year);
      }
      n += a.daysInMonthRange(a.month, b.month - 1);
      a.addMonths(b.month - a.month);
    }
    n += b.day - a.day;
    return Math.max(n, 0);
  }
}

/** Cupom anterior (ou igual) à liquidação. */
export function couppcdDate(settle: CDate, mat: CDate, freq: number): CDate {
  const d = mat.clone();
  d.setYear(settle.year);
  if (d.lt(settle)) d.addYears(1);
  while (d.gt(settle)) d.addMonths(-12 / freq);
  return d;
}
/** Cupom seguinte à liquidação. */
export function coupncdDate(settle: CDate, mat: CDate, freq: number): CDate {
  const d = mat.clone();
  d.setYear(settle.year);
  if (d.gt(settle)) d.addYears(-1);
  while (!d.gt(settle)) d.addMonths(12 / freq);
  return d;
}

export interface Bond { readonly settle: number; readonly mat: number; readonly freq: number; readonly basis: number; readonly d1904: boolean }

export function coupPcd(b: Bond): number {
  return couppcdDate(CDate.of(b.settle, b.basis, b.d1904), CDate.of(b.mat, b.basis, b.d1904), b.freq).serial(b.d1904);
}
export function coupNcd(b: Bond): number {
  return coupncdDate(CDate.of(b.settle, b.basis, b.d1904), CDate.of(b.mat, b.basis, b.d1904), b.freq).serial(b.d1904);
}
export function coupDayBs(b: Bond): number {
  const s = CDate.of(b.settle, b.basis, b.d1904);
  return CDate.diff(couppcdDate(s, CDate.of(b.mat, b.basis, b.d1904), b.freq), s);
}
/**
 * COUPDAYS na base 1. Medido: o Excel anda do vencimento para trás mês a mês
 * truncando o dia (31 → 30 → 28 "gruda"), sem a regra de fim de mês das outras
 * funções: COUPDAYS(29/02/2008; 31/08/2017; 2; 1) = 182 (cupons no dia 28).
 */
export function coupDays(b: Bond): number {
  if (b.basis === 1) {
    // medido (35 de 40 casos): do cupom anterior até ele + 12/f meses sem a regra de fim de mês
    const pcd = coupPcd(b);
    return edate(pcd, 12 / b.freq, b.d1904) - pcd;
  }
  return (b.basis === 3 ? 365 : 360) / b.freq;
}
/** EDATE: soma meses e limita o dia ao fim do mês. */
export function edate(serial: number, months: number, d1904: boolean): number {
  const { y, m, d } = serialToYmd(serial, d1904);
  let mm = m + months, yy = y;
  while (mm < 1) { mm += 12; yy--; }
  while (mm > 12) { mm -= 12; yy++; }
  return ymdToSerial(yy, mm, Math.min(d, daysInMonth(mm, yy)), d1904);
}
/** DAYS360 europeu (dia 31 vira 30 nas duas pontas). */
export function days360eu(s: number, e: number, d1904: boolean): number {
  const a = serialToYmd(s, d1904), b = serialToYmd(e, d1904);
  const d1 = Math.min(a.d, 30), d2 = Math.min(b.d, 30);
  return (b.y - a.y) * 360 + (b.m - a.m) * 30 + (d2 - d1);
}
export function coupDaysNc(b: Bond): number {
  if (b.basis !== 0 && b.basis !== 4) {
    const s = CDate.of(b.settle, b.basis, b.d1904);
    return CDate.diff(s, coupncdDate(s, CDate.of(b.mat, b.basis, b.d1904), b.freq));
  }
  // medido: na base 4 é o DAYS360 europeu até o próximo cupom (31/03 → 31/08 = 150)
  if (b.basis === 4) return days360eu(b.settle, coupNcd(b), b.d1904);
  return coupDays(b) - coupDayBs(b);
}
export function coupNum(b: Bond): number {
  const mat = CDate.of(b.mat, b.basis, b.d1904);
  const d = couppcdDate(CDate.of(b.settle, b.basis, b.d1904), mat, b.freq);
  const months = (mat.year - d.year) * 12 + mat.month - d.month;
  return Math.trunc((months * b.freq) / 12);
}

/** Dias entre datas na base (GetDiffDate do ATP) e os dias do 1º ano. */
export function diffDate(s: number, e: number, basis: number, d1904: boolean): { days: number; year: number } {
  const neg = s > e;
  if (neg) [s, e] = [e, s];
  let days: number, year: number;
  if (basis === 0 || basis === 4) {
    const a = serialToYmd(s, d1904), b = serialToYmd(e, d1904);
    days = (b.m - a.m + (b.y - a.y) * 12) * 30 + (b.d - a.d);
    if (basis === 0 && a.m === 2 && b.m !== 2 && a.y === b.y) days -= isLeap(a.y) ? 1 : 2;
    year = 360;
  } else {
    days = e - s;
    year = basis === 1 ? (isLeap(serialToYmd(s, d1904).y) ? 366 : 365) : basis === 2 ? 360 : 365;
  }
  return { days: neg ? -days : days, year };
}

/** Dias e dias no ano do YEARFRAC (a fração é days/year). */
export function yearFracParts(s: number, e: number, basis: number, d1904: boolean): { days: number; year: number } {
  const yf = yearFrac(s, e, basis, d1904);
  if (s > e) [s, e] = [e, s];
  let days: number;
  if (basis === 0 || basis === 4) days = Math.round(yf * 360);
  else days = e - s;
  return { days, year: basis === 0 || basis === 2 || basis === 4 ? 360 : basis === 3 ? 365 : yf === 0 ? 365 : days / yf };
}

/** Dias no ano da data (GetDaysInYear do ATP): 360/365, e na base 1 o ano civil da data. */
export function daysInYear(serial: number, basis: number, d1904: boolean): number {
  if (basis === 1) return isLeap(serialToYmd(serial, d1904).y) ? 366 : 365;
  return basis === 3 ? 365 : 360;
}

/** YEARFRAC do Excel (GetYearFrac do ATP). */
export function yearFrac(s: number, e: number, basis: number, d1904: boolean): number {
  if (s === e) return 0;
  if (s > e) [s, e] = [e, s];
  const a = serialToYmd(s, d1904), b = serialToYmd(e, d1904);
  let { d: d1 } = a; const { m: m1, y: y1 } = a;
  let { d: d2 } = b; const { m: m2, y: y2 } = b;
  let dayDiff: number;
  switch (basis) {
    case 0:
      if (d1 === 31) d1--;
      if (d1 === 30 && d2 === 31) d2--;
      else if (m1 === 2 && d1 === (isLeap(y1) ? 29 : 28)) {
        d1 = 30;
        if (m2 === 2 && d2 === (isLeap(y2) ? 29 : 28)) d2 = 30;
      }
      dayDiff = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
      break;
    case 4:
      if (d1 === 31) d1--;
      if (d2 === 31) d2--;
      dayDiff = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
      break;
    default:
      dayDiff = e - s;
  }
  let daysInYear: number;
  if (basis === 0 || basis === 2 || basis === 4) daysInYear = 360;
  else if (basis === 3) daysInYear = 365;
  else {
    const differentYear = y1 !== y2;
    if (differentYear && (y2 !== y1 + 1 || m1 < m2 || (m1 === m2 && d1 < d2))) {
      let count = 0;
      for (let y = y1; y <= y2; y++) count += isLeap(y) ? 366 : 365;
      daysInYear = count / (y2 - y1 + 1);
    } else {
      let leap: boolean;
      if (differentYear) {
        // dentro de um ano: bissexto se 29/02 estiver entre as datas
        leap = (isLeap(y1) && (m1 < 2 || (m1 === 2 && d1 <= 29))) || (isLeap(y2) && (m2 > 2 || (m2 === 2 && d2 === 29)));
      } else leap = isLeap(y1);
      daysInYear = leap ? 366 : 365;
    }
  }
  return dayDiff / daysInYear;
}
