/**
 * Endereços A1/R1C1 (texto ↔ índices 0-based) e utilidades de área. Sem
 * dependência do avaliador: usado pelo parser, pelo serializador, pelo motor e
 * pelas funções de referência (ADDRESS, INDIRECT…).
 * Dono: agente CORE.
 */
import { MAX_COL, MAX_ROW, type Area } from './values.js';

/** "A" → 0, "XFD" → 16383; undefined se não for coluna válida. */
export function colFromLetters(s: string): number | undefined {
  if (!/^[A-Za-z]{1,3}$/.test(s)) return undefined;
  let c = 0;
  for (const ch of s.toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
  return c - 1 <= MAX_COL ? c - 1 : undefined;
}

/** 0 → "A", 16383 → "XFD". */
export function colToLetters(col: number): string {
  let c = col + 1, s = '';
  while (c > 0) {
    const r = (c - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

/** (0,0) → "A1"; com `$` opcionais. */
export function cellToA1(row: number, col: number, rowAbs = false, colAbs = false): string {
  return `${colAbs ? '$' : ''}${colToLetters(col)}${rowAbs ? '$' : ''}${row + 1}`;
}

/** "A1"/"$B$2" → índices 0-based (sem aba). */
export function a1ToCell(s: string): { row: number; col: number } | undefined {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(s);
  if (!m) return undefined;
  const col = colFromLetters(m[1]!);
  const row = +m[2]! - 1;
  if (col === undefined || row < 0 || row > MAX_ROW) return undefined;
  return { row, col };
}

/** Área A1 sem aba ("A1:B3", "A:A", "1:1", "C5") → área na aba `sheet`. */
export function a1ToArea(s: string, sheet = 0): Area | undefined {
  const [a, b = a] = s.split(':') as [string, string?];
  const cell1 = a1ToCell(a), cell2 = a1ToCell(b!);
  if (cell1 && cell2) return normArea({ sheet, r1: cell1.row, c1: cell1.col, r2: cell2.row, c2: cell2.col });
  const col1 = colFromLetters(a.replace(/\$/g, '')), col2 = colFromLetters(b!.replace(/\$/g, ''));
  if (s.includes(':') && col1 !== undefined && col2 !== undefined) return normArea({ sheet, r1: 0, c1: col1, r2: MAX_ROW, c2: col2 });
  const row1 = /^\$?\d+$/.test(a) ? +a.replace('$', '') - 1 : NaN, row2 = /^\$?\d+$/.test(b!) ? +b!.replace('$', '') - 1 : NaN;
  if (s.includes(':') && row1 >= 0 && row2 >= 0 && row1 <= MAX_ROW && row2 <= MAX_ROW) return normArea({ sheet, r1: row1, c1: 0, r2: row2, c2: MAX_COL });
  return undefined;
}

/** Área → texto A1 ("A1", "A1:B3", "A:A", "1:3"). */
export function areaToA1(a: Area): string {
  if (a.r1 === 0 && a.r2 === MAX_ROW && !(a.c1 === 0 && a.c2 === MAX_COL)) return `${colToLetters(a.c1)}:${colToLetters(a.c2)}`;
  if (a.c1 === 0 && a.c2 === MAX_COL && !(a.r1 === 0 && a.r2 === MAX_ROW)) return `${a.r1 + 1}:${a.r2 + 1}`;
  const tl = cellToA1(a.r1, a.c1);
  return a.r1 === a.r2 && a.c1 === a.c2 ? tl : `${tl}:${cellToA1(a.r2, a.c2)}`;
}

/** Ordena os cantos (r1 ≤ r2, c1 ≤ c2). */
export function normArea(a: Area): Area {
  return {
    sheet: a.sheet,
    r1: Math.min(a.r1, a.r2), c1: Math.min(a.c1, a.c2),
    r2: Math.max(a.r1, a.r2), c2: Math.max(a.c1, a.c2),
  };
}

export const areaRows = (a: Area): number => a.r2 - a.r1 + 1;
export const areaCols = (a: Area): number => a.c2 - a.c1 + 1;

export function areaContains(a: Area, sheet: number, row: number, col: number): boolean {
  return a.sheet === sheet && row >= a.r1 && row <= a.r2 && col >= a.c1 && col <= a.c2;
}

/** Interseção de duas áreas (mesma aba) ou undefined. */
export function intersectAreas(a: Area, b: Area): Area | undefined {
  if (a.sheet !== b.sheet) return undefined;
  const r1 = Math.max(a.r1, b.r1), r2 = Math.min(a.r2, b.r2);
  const c1 = Math.max(a.c1, b.c1), c2 = Math.min(a.c2, b.c2);
  return r1 <= r2 && c1 <= c2 ? { sheet: a.sheet, r1, c1, r2, c2 } : undefined;
}

export function areasOverlap(a: Area, b: Area): boolean {
  return a.sheet === b.sheet && a.r1 <= b.r2 && b.r1 <= a.r2 && a.c1 <= b.c2 && b.c1 <= a.c2;
}

/** Menor área que contém as duas (operador `:` entre referências). */
export function boundingArea(a: Area, b: Area): Area {
  return { sheet: a.sheet, r1: Math.min(a.r1, b.r1), c1: Math.min(a.c1, b.c1), r2: Math.max(a.r2, b.r2), c2: Math.max(a.c2, b.c2) };
}

/** Linha relativa com a volta do Excel (R[-1] na linha 1 = última linha). */
export function wrapRow(r: number): number {
  const n = MAX_ROW + 1;
  return ((r % n) + n) % n;
}
export function wrapCol(c: number): number {
  const n = MAX_COL + 1;
  return ((c % n) + n) % n;
}

/**
 * Nome de aba no texto da fórmula: entre aspas simples quando o Excel exige
 * (espaço, pontuação, começa com dígito, parece referência A1/R1C1…).
 */
export function quoteSheetName(name: string): string {
  const plain = /^[\p{L}_\\][\p{L}\p{N}_.]*$/u.test(name)
    && !/^[A-Za-z]{1,3}\d+$/.test(name)
    && !/^(R\d*C\d*|R\d*|C\d*)$/i.test(name)
    && !/^(TRUE|FALSE)$/i.test(name);
  return plain ? name : `'${name.replace(/'/g, "''")}'`;
}
