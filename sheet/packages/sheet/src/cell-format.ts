import type { Worksheet, Cell } from '@universal-office/sheet-core';

/**
 * Estilo das células AUSENTES do XML, como o Excel (medido, pasta sintética
 * t-colrow): `<row s customFormat="1">` vale para toda a linha e vence o
 * `<col style>` (sem `s`, o estilo 0); `<row s>` SEM customFormat é
 * ignorado; célula presente sem `s` usa o estilo 0 (não herda linha/coluna).
 */
export function defaultXfMaps(ws: Worksheet): { rowXf: Map<number, number>; colXf: Map<number, number> } {
  const rowXf = new Map<number, number>();
  const colXf = new Map<number, number>();
  // customFormat sem `s` = estilo 0, que também vence o da coluna (medido: lo-RowImportCellStyleIssue)
  for (const r of ws.rows) if (r.customFormat) rowXf.set(r.r, r.style ?? 0);
  for (const c of ws.cols ?? []) {
    if (c.style === undefined || c.style === 0) continue;
    const hi = Math.min(c.max, 16384);
    for (let k = Math.max(1, c.min); k <= hi; k++) colXf.set(k, c.style);
  }
  return { rowXf, colXf };
}

/** Índice em cellXfs da célula (col,row) — própria ou o padrão da linha/coluna. */
export function xfIndexAt(
  maps: { rowXf: Map<number, number>; colXf: Map<number, number> },
  cell: Cell | undefined, col: number, row: number,
): number {
  if (cell) return cell.style ?? 0;
  if (maps.rowXf.size) { const r = maps.rowXf.get(row); if (r !== undefined) return r; }
  if (maps.colXf.size) { const c = maps.colXf.get(col); if (c !== undefined) return c; }
  return 0;
}
