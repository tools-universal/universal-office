import type { PivotInfo } from '@universal-office/sheet-core';
import type { StyleSpec, ElementFormat, TableCellFormat } from './table-styles.js';

/**
 * Estilo de TABELA DINÂMICA (PivotStyleLight16 etc.) aplicado ao range já
 * calculado da dinâmica (`<location>`): mesmos elementos/ordem dos estilos de
 * tabela + os próprios de dinâmica (campos de página, subtotais, subtítulos,
 * linha em branco). Regiões (medidas em lo-pivot_dark1, lo-tdf89139,
 * lo-calcfields):
 *  - cabeçalho = linhas do topo até a 1ª de dados (no layout compacto a
 *    faixa inteira; no tabular, as linhas acima de firstHeaderRow só nas
 *    células de título dos campos de coluna);
 *  - total geral = última linha (rowItems t="grand") / última coluna;
 *  - faixas de linha a partir da 1ª linha de dados; rótulos de linha =
 *    colunas antes de firstDataCol;
 *  - campos de página: linhas acima do range (rótulo | valor).
 * Botões de filtro: "Rótulos de Linha"/"Rótulos de Coluna" (compacto) ou um
 * por campo (tabular) e nos valores dos campos de página.
 */
export function pivotCellFormats(
  p: PivotInfo, rg: { c1: number; r1: number; c2: number; r2: number }, spec: StyleSpec | undefined,
  out: Map<string, TableCellFormat>, filterAt: Map<string, boolean>,
  apply: (f: TableCellFormat, el: ElementFormat | undefined, c: number, r: number, ca: number, cb: number, ra: number, rb: number) => void,
): void {
  const { c1, r1, c2, r2 } = rg;
  const fh = Math.max(0, p.firstHeaderRow), fdr = Math.max(0, p.firstDataRow), fdc = Math.max(0, p.firstDataCol);
  const d0 = r1 + fdr, dc0 = c1 + fdc;
  const grandRow = p.rowGrandTotals && p.rowItems.length > 0 && p.rowItems[p.rowItems.length - 1]!.t === 'grand' ? d0 + p.rowItems.length - 1 : -1;
  const grandCol = p.colGrandTotals && p.colItems.length > 0 && p.colItems[p.colItems.length - 1]!.t === 'grand' ? dc0 + p.colItems.length - 1 : -1;
  const lastData = grandRow > 0 ? grandRow - 1 : r2;
  const lastDataCol = grandCol > 0 ? grandCol - 1 : c2;
  const nRowF = p.rowFields.filter((x) => x >= 0).length;
  const compact = p.compact !== false;

  // páginas: rótulo em c, valor em c+1; n campos por coluna (rowPageCount)
  const pages: { r: number; c: number; k: number }[] = [];
  if (p.pageFieldCount > 0) {
    const per = Math.max(1, p.rowPageCount || p.pageFieldCount);
    for (let k = 0; k < p.pageFieldCount; k++) pages.push({ r: r1 - 1 - per + (k % per), c: c1 + 3 * Math.floor(k / per), k });
  }

  if (spec) {
    const el = (n: string): ElementFormat | undefined => spec.get(n);
    const whole = el('wholeTable');
    const cs1 = el('firstColumnStripe'), cs2 = el('secondColumnStripe'), rs1 = el('firstRowStripe'), rs2 = el('secondRowStripe');
    const cw1 = cs1?.size ?? 1, cw2 = cs2?.size ?? 1, rw1 = rs1?.size ?? 1, rw2 = rs2?.size ?? 1;
    const lastCol = el('lastColumn'), firstCol = el('firstColumn'), header = el('headerRow'), total = el('totalRow');
    const fhc = el('firstHeaderCell'), ftc = el('firstTotalCell');
    const subCol = [el('firstSubtotalColumn'), el('secondSubtotalColumn'), el('thirdSubtotalColumn')];
    const subRow = [el('firstSubtotalRow'), el('secondSubtotalRow'), el('thirdSubtotalRow')];
    const subHead = [el('firstRowSubheading'), el('secondRowSubheading'), el('thirdRowSubheading')];
    const blank = el('blankRow');
    const pl = el('pageFieldLabels'), pv = el('pageFieldValues');
    // linha de dados → item; coluna de dados → item
    const rowItem = (r: number) => (r >= d0 ? p.rowItems[r - d0] : undefined);
    const colItem = (c: number) => (c >= dc0 ? p.colItems[c - dc0] : undefined);
    const isSub = (t: string | undefined): boolean => !!t && t !== 'grand' && t !== 'blank' && t !== 'data';
    const lvl = (n: number): number => Math.max(0, Math.min(2, n));

    if (pages.length) {
      const top = pages[0]!.r, bot = pages[pages.length - 1]!.r;
      for (const pg of pages) {
        for (const [c, e] of [[pg.c, pl], [pg.c + 1, pv]] as const) {
          const f: TableCellFormat = { ...(out.get(`${c},${pg.r}`) ?? {}) };
          apply(f, e, c, pg.r, c, c, top, bot);
          if (hasAny(f)) out.set(`${c},${pg.r}`, f);
        }
      }
    }
    for (let r = r1; r <= r2; r++) {
      const ri = rowItem(r);
      for (let c = c1; c <= c2; c++) {
        const f: TableCellFormat = {};
        apply(f, whole, c, r, c1, c2, r1, r2);
        const dataRow = r >= d0 && r <= lastData;
        if (p.showColStripes && dataRow && c >= dc0 && c <= lastDataCol) {
          const i = c - dc0, per = cw1 + cw2, k = i % per, first = k < cw1;
          const a = dc0 + i - k + (first ? 0 : cw1);
          apply(f, first ? cs1 : cs2, c, r, a, Math.min(lastDataCol, a + (first ? cw1 : cw2) - 1), d0, lastData);
        }
        if (p.showRowStripes && dataRow) {
          const i = r - d0, per = rw1 + rw2, k = i % per, first = k < rw1;
          const a = d0 + i - k + (first ? 0 : rw1);
          apply(f, first ? rs1 : rs2, c, r, c1, c2, a, Math.min(lastData, a + (first ? rw1 : rw2) - 1));
        }
        if (p.showLastColumn && c === grandCol) apply(f, lastCol, c, r, c, c, r1, r2);
        if (p.showRowHeaders && c < dc0 && r >= d0) apply(f, firstCol, c, r, c1, dc0 - 1, d0, r2);
        if (p.showColHeaders && r < d0) {
          // compacto: a faixa inteira; tabular: acima de firstHeaderRow só os títulos dos campos de coluna
          const caption = r < r1 + fh;
          const colFieldCells = p.colFields.length;
          if (compact || !caption || (c >= dc0 && c < dc0 + colFieldCells)) apply(f, header, c, r, c1, c2, compact ? r1 : r1 + (caption ? 0 : fh), d0 - 1);
        }
        if (r === grandRow) apply(f, total, c, r, c1, c2, r, r);
        if (r === r1 && c === c1 && p.showColHeaders) apply(f, fhc, c, r, c, c, r, r);
        if (r === grandRow && c === c1) apply(f, ftc, c, r, c, c, r, r);
        const ci = colItem(c);
        if (ci && isSub(ci.t) && r >= d0) apply(f, subCol[lvl(ci.r)], c, r, c, c, d0, r2);
        if (ri) {
          if (ri.t === 'blank') apply(f, blank, c, r, c1, c2, r, r);
          else if (isSub(ri.t)) apply(f, subRow[lvl(ri.r)], c, r, c1, c2, r, r);
          else if (!ri.t && nRowF > 1 && ri.r + ri.x < nRowF) apply(f, subHead[lvl(ri.r + ri.x - 1)], c, r, c1, c2, r, r);
        }
        if (hasAny(f)) out.set(`${c},${r}`, f);
      }
    }
  }

  // botões de filtro
  if (p.showHeaders) {
    const filtered = new Set(p.filteredFields ?? []);
    const rowF = p.rowFields.filter((x) => x >= 0), colF = p.colFields.filter((x) => x >= 0);
    if (rowF.length) {
      if (compact) filterAt.set(`${c1},${d0 - 1}`, rowF.some((x) => filtered.has(x)));
      else rowF.forEach((x, k) => { if (c1 + k < dc0) filterAt.set(`${c1 + k},${d0 - 1}`, filtered.has(x)); });
    }
    if (colF.length && fh > 0) {
      const hr = r1 + fh - 1;
      if (compact) filterAt.set(`${dc0},${hr}`, colF.some((x) => filtered.has(x)));
      else colF.forEach((x, k) => filterAt.set(`${dc0 + k},${hr}`, filtered.has(x)));
    }
    for (const pg of pages) filterAt.set(`${pg.c + 1},${pg.r}`, !!p.pageFieldActive?.[pg.k]);
  }
}

function hasAny(f: TableCellFormat): boolean {
  return !!(f.fill || f.fontColor !== undefined || f.bold !== undefined || f.italic !== undefined || f.underline !== undefined || f.strike !== undefined || f.border);
}
