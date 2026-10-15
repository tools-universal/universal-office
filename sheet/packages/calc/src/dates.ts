/**
 * Datas do Excel: número de série (dias) com a fração do dia como hora.
 * Sistema 1900: série 1 = 1900-01-01, e o Excel finge que 1900 foi bissexto
 * (série 60 = 29/02/1900, que não existiu — compatibilidade com o Lotus).
 * Série 0 = "00/01/1900". Sistema 1904: série 0 = 1904-01-01.
 */

const MS_DAY = 86400000;
/** Época do sistema 1900 no calendário real: série 1 = 1900-01-01 → base = 1899-12-31. */
const BASE_1900 = Date.UTC(1899, 11, 31);
const BASE_1904 = Date.UTC(1904, 0, 1);

/** Ano/mês/dia → série (inteira). Normaliza mês/dia fora do intervalo como DATE (mês 13 = janeiro seguinte). */
export function ymdToSerial(y: number, m: number, d: number, date1904 = false): number {
  const t = Date.UTC(y, m - 1, 1) + (d - 1) * MS_DAY;
  if (date1904) return Math.round((t - BASE_1904) / MS_DAY);
  let s = Math.round((t - BASE_1900) / MS_DAY);
  // dias a partir de 01/03/1900 ficam deslocados pelo 29/02/1900 fictício
  if (s >= 60) s += 1;
  return s;
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
  const s = Math.floor(serial) + (date1904 ? 1462 : 0);
  return (((s + 6) % 7) + 7) % 7;
}

/** Fração do dia → horas, minutos, segundos (segundos arredondados como o Excel exibe). */
export function serialToHms(serial: number): { h: number; mi: number; s: number } {
  const frac = serial - Math.floor(serial);
  const total = Math.round(frac * 86400);
  return { h: Math.floor(total / 3600) % 24, mi: Math.floor(total / 60) % 60, s: total % 60 };
}

/** Série máxima aceita pelo Excel (31/12/9999). */
export const MAX_DATE_SERIAL = 2958465;
