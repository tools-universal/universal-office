/**
 * Classificação de valor de célula para exportadores TIPADOS (ODS/XML 2003):
 * além do texto exibido, esses formatos gravam o valor cru com tipo
 * (float/date/time/boolean/string) — o tipo de data/hora vem do numFmt.
 */
import {
  serialToDate, builtinFormatCode, PT_BR,
  type Cell, type FormatLocale,
} from '@universal/sheet-core';
import type { SheetModel } from './model.js';

export type TypedKind = 'number' | 'date' | 'time' | 'boolean' | 'string' | 'error' | 'empty';

export interface TypedValue {
  kind: TypedKind;
  /** Valor numérico (kind number/date/time). */
  num?: number;
  /** Texto cru (kind string/error). */
  str?: string;
  /** true/false (kind boolean). */
  bool?: boolean;
  /** Data resolvida (kind date/time). */
  date?: Date;
  /** formatCode efetivo da célula (numFmt custom ou builtin do locale). */
  code?: string;
  /** Fórmula (sem '='), quando presente. */
  formula?: string;
}

/** O formatCode contém tokens de data/hora fora de literais? */
export function isDateTimeCode(code: string): { date: boolean; time: boolean } {
  // remove literais "..."/\x, cores/condições [..] (mas preserva [h] etc.)
  const bare = code
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[(?![hms])[^\]]*\]/gi, '');
  const stripped = bare.replace(/\[[^\]]*\]/g, '');
  const time = /[hs]/i.test(bare) || /am\/pm/i.test(bare);
  // 'm' sozinho é mês; adjacente a h/s (heurística: código também tem h/s) é minuto
  const date = /[yd]/i.test(stripped) || (/m/i.test(stripped) && !time);
  return { date, time };
}

/** formatCode efetivo (numFmt custom > builtin do locale > General). */
export function effectiveCode(cell: Cell, model: SheetModel, loc: FormatLocale = PT_BR): string {
  const xf = model.styles.cellXfs[cell.style ?? 0];
  const id = xf?.numFmtId ?? 0;
  return model.styles.numFmts.get(id) ?? builtinFormatCode(id, loc) ?? 'General';
}

/** Classifica a célula em valor tipado (para ODS/XML2003). */
export function typedValue(cell: Cell | undefined, model: SheetModel, loc: FormatLocale = PT_BR): TypedValue {
  if (!cell) return { kind: 'empty' };
  const formula = cell.formula;
  if (cell.type === 's' && cell.value !== undefined) {
    const ss = model.sharedStrings[parseInt(cell.value, 10)];
    return { kind: 'string', str: ss?.text ?? ss?.runs?.map((r) => r.text).join('') ?? '', formula };
  }
  if (cell.type === 'inlineStr') {
    return { kind: 'string', str: cell.inlineString?.text ?? cell.inlineString?.runs?.map((r) => r.text).join('') ?? '', formula };
  }
  if (cell.type === 'b') return { kind: 'boolean', bool: cell.value === '1', formula };
  if (cell.type === 'e') return { kind: 'error', str: cell.value ?? '', formula };
  if (cell.value === undefined) return { kind: 'empty', formula };
  if (cell.type === 'str') return { kind: 'string', str: cell.value, formula };
  const n = parseFloat(cell.value);
  if (Number.isNaN(n)) return { kind: 'string', str: cell.value, formula };
  const code = effectiveCode(cell, model, loc);
  const dt = isDateTimeCode(code);
  // sistema 1904 (Mac legacy): epoch deslocado +1462 dias
  const serial = model.workbook.date1904 ? n + 1462 : n;
  if (dt.date) return { kind: 'date', num: n, date: serialToDate(serial), code, formula };
  if (dt.time) return { kind: 'time', num: n, date: serialToDate(serial), code, formula };
  return { kind: 'number', num: n, code, formula };
}

const p2 = (x: number): string => String(x).padStart(2, '0');

/** Date → "YYYY-MM-DD" (UTC — serialToDate materializa em UTC). */
export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

/** Date → "YYYY-MM-DDTHH:MM:SS". */
export function isoDateTime(d: Date): string {
  return `${isoDate(d)}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

/** Fração de dia → duração ISO "PTxxHxxMxxS" (office:time-value do ODS). */
export function isoDuration(serial: number): string {
  const totalSec = Math.round((serial % 1 < 0 ? 1 + (serial % 1) : serial % 1) * 86400);
  const h = Math.floor(totalSec / 3600) + Math.floor(serial) * 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `PT${p2(h)}H${p2(m)}M${p2(s)}S`;
}
