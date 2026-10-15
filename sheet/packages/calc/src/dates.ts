/**
 * Datas do Excel: número de série (dias) com a fração do dia como hora.
 * Sistema 1900: série 1 = 1900-01-01, e o Excel finge que 1900 foi bissexto
 * (série 60 = 29/02/1900, que não existiu — compatibilidade com o Lotus).
 * Série 0 = "00/01/1900". Sistema 1904: série 0 = 1904-01-01.
 *
 * Regras medidas no Excel 365 pt-BR (lab calc/tdl):
 * - DATE soma o dia ao 1º do mês: DATE(1900;2;29) = DATE(1900;3;0) = 60 e
 *   DATE(1900;1;61) = 61; o dia fora de [-32768, 32767] vira 32767 (16 bits:
 *   DATE(2024;1;40000) = DATE(2024;1;32767)); mês ≥ 32767 ou < -32768 → #NUM!.
 * - As funções que leem a data (YEAR, DAY, HOUR…) arredondam a série ao
 *   SEGUNDO antes: DAY(45658,99999999) = 2; HOUR(0,99999999) = 0.
 */

const MS_DAY = 86400000;
/** Época do sistema 1900 no calendário real: série 1 = 1900-01-01 → base = 1899-12-31. */
const BASE_1900 = Date.UTC(1899, 11, 31);
const BASE_1904 = Date.UTC(1904, 0, 1);

/** Série máxima aceita pelo Excel (31/12/9999). */
export const MAX_DATE_SERIAL = 2958465;
/** Diferença entre os sistemas (série 1900 de 01/01/1904). */
export const DATE1904_OFFSET = 1462;

/** Série máxima no sistema em uso. */
export function maxSerial(date1904 = false): number {
  return date1904 ? MAX_DATE_SERIAL - DATE1904_OFFSET : MAX_DATE_SERIAL;
}

/**
 * Ano/mês/dia → série (inteira). Normaliza mês/dia fora do intervalo como
 * DATE (mês 13 = janeiro seguinte, dia 0 = último do mês anterior), contando o
 * 29/02/1900 fictício: o dia é somado ao 1º do mês já na série do Excel.
 */
export function ymdToSerial(y: number, m: number, d: number, date1904 = false): number {
  const yy = y + Math.floor((m - 1) / 12);
  const mm = (((m - 1) % 12) + 12) % 12;
  const first = Date.UTC(yy, mm, 1);
  // Date.UTC trata anos 0–99 como 1900–1999; corrige com setUTCFullYear
  const t = yy >= 0 && yy < 100 ? new Date(first).setUTCFullYear(yy) : first;
  if (date1904) return Math.round((t - BASE_1904) / MS_DAY) + d - 1;
  let s = Math.round((t - BASE_1900) / MS_DAY);
  // a partir de 01/03/1900 a série fica deslocada pelo 29/02/1900 fictício
  if (s >= 60) s += 1;
  return s + d - 1;
}

/** Série → { y, m, d } (parte inteira). A série 60 do sistema 1900 é 29/02/1900; a 0 é 00/01/1900. */
export function serialToYmd(serial: number, date1904 = false): { y: number; m: number; d: number } {
  let s = Math.floor(serial);
  if (date1904) {
    const dt = new Date(BASE_1904 + s * MS_DAY);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  if (s === 0) return { y: 1900, m: 1, d: 0 };
  if (s === 60) return { y: 1900, m: 2, d: 29 };
  if (s > 60) s -= 1;
  const dt = new Date(BASE_1900 + s * MS_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Dia da semana da série (0 = domingo), com o 1900 "bissexto" do Excel. */
export function weekday(serial: number, date1904 = false): number {
  // série 1 (01/01/1900) é domingo para o Excel (no calendário real foi segunda: o
  // 29/02/1900 fictício acerta a conta a partir de 01/03/1900); série 0 = sábado
  const s = Math.floor(serial) + (date1904 ? DATE1904_OFFSET : 0);
  return (((s + 6) % 7) + 7) % 7;
}

/** Fração do dia → horas, minutos, segundos (segundos arredondados como o Excel exibe). */
export function serialToHms(serial: number): { h: number; mi: number; s: number } {
  const frac = serial - Math.floor(serial);
  const total = Math.round(frac * 86400);
  return { h: Math.floor(total / 3600) % 24, mi: Math.floor(total / 60) % 60, s: total % 60 };
}

/** Dias no mês (calendário do Excel: fevereiro de 1900 tem 29 no sistema 1900). */
export function daysInMonth(y: number, m: number, date1904 = false): number {
  if (m === 2) return isLeap(y) || (y === 1900 && !date1904) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0;
}

/** Ano bissexto no calendário gregoriano (sem o 1900 fictício). */
export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Série arredondada ao segundo, como YEAR/MONTH/DAY/HOUR/MINUTE/SECOND/WEEKDAY
 * leem a data: { day: parte inteira, sec: segundo do dia }. undefined = fora da
 * faixa (negativa ou além de 31/12/9999 depois do arredondamento) → #NUM!.
 */
export function splitSerial(serial: number, date1904 = false): { day: number; sec: number } | undefined {
  if (!(serial >= 0)) return undefined;
  const total = Math.round(serial * 86400);
  const day = Math.floor(total / 86400);
  if (day > maxSerial(date1904)) return undefined;
  return { day, sec: total - day * 86400 };
}

/**
 * DATE(ano; mês; dia) como o Excel: partes truncadas para baixo (INT), ano
 * < 1900 soma 1900, ano fora de [0, 9999] / mês fora de 16 bits / série fora
 * da faixa → undefined (#NUM!).
 */
export function excelDate(year: number, month: number, day: number, date1904 = false): number | undefined {
  let y = Math.floor(year), m = Math.floor(month), d = Math.floor(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  if (y < 0 || y >= 10000) return undefined;
  if (y < 1900) y += 1900;
  if (m >= 32767 || m < -32768) return undefined;
  if (d > 32767 || d < -32768) d = 32767;
  const s = ymdToSerial(y, m, d, date1904);
  if (s < 0 || s > maxSerial(date1904)) return undefined;
  return s;
}
