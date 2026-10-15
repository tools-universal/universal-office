import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import type { PivotInfo, PivotItem } from './model.js';
import type { XlsxPackage } from './package.js';

/**
 * Lê `xl/pivotTables/pivotTableN.xml` → o que a pintura precisa: o range já
 * calculado (`<location>`, com as linhas/colunas de cabeçalho e de dados), o
 * estilo (`<pivotTableStyleInfo>`), os itens de linha/coluna (subtotais,
 * total geral, linhas em branco, níveis) e os campos de página/linha/coluna.
 * Os VALORES já estão nas células da planilha (cache gravado pelo Excel).
 */
export function readPivotTable(pkg: XlsxPackage, path: string): PivotInfo | undefined {
  const xml = pkg.getPartText(path);
  if (!xml) return undefined;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return undefined; }
  const loc = firstChild(root, 'location');
  const ref = loc?.attrs['ref'];
  if (!loc || !ref) return undefined;
  const int = (el: XmlElement | undefined, k: string, d: number): number => { const v = parseInt(el?.attrs[k] ?? '', 10); return Number.isFinite(v) ? v : d; };
  const flag = (k: string, d: boolean): boolean => { const v = root.attrs[k]; return v === undefined ? d : v === '1' || v === 'true'; };
  const items = (tag: string): PivotItem[] => {
    const el = firstChild(root, tag);
    if (!el) return [];
    return childElements(el, 'i').map((i) => {
      const it: PivotItem = { r: int(i, 'r', 0), x: childElements(i, 'x').length };
      if (i.attrs['t']) it.t = i.attrs['t'];
      return it;
    });
  };
  const fields = (tag: string): number[] => {
    const el = firstChild(root, tag);
    return el ? childElements(el, 'field').map((f) => int(f, 'x', 0)) : [];
  };
  const si = firstChild(root, 'pivotTableStyleInfo');
  const on = (k: string): boolean => si?.attrs[k] === '1' || si?.attrs[k] === 'true';
  const pageFields = firstChild(root, 'pageFields');
  const out: PivotInfo = {
    ref,
    firstHeaderRow: int(loc, 'firstHeaderRow', 1),
    firstDataRow: int(loc, 'firstDataRow', 1),
    firstDataCol: int(loc, 'firstDataCol', 1),
    rowPageCount: int(loc, 'rowPageCount', 0),
    colPageCount: int(loc, 'colPageCount', 0),
    pageFieldCount: pageFields ? childElements(pageFields, 'pageField').length : 0,
    rowFields: fields('rowFields'),
    colFields: fields('colFields'),
    rowItems: items('rowItems'),
    colItems: items('colItems'),
    compact: flag('compact', true),
    outline: flag('outline', false),
    showHeaders: flag('showHeaders', true),
    rowGrandTotals: flag('rowGrandTotals', true),
    colGrandTotals: flag('colGrandTotals', true),
    showRowHeaders: on('showRowHeaders'),
    showColHeaders: on('showColHeaders'),
    showRowStripes: on('showRowStripes'),
    showColStripes: on('showColStripes'),
    showLastColumn: on('showLastColumn'),
  };
  if (si) out.styleName = si.attrs['name'] ?? '';
  // campos com filtro ativo: itens ocultos (h="1") ou filtros de rótulo/valor
  const pf = firstChild(root, 'pivotFields');
  if (pf) {
    const filtered: number[] = [];
    childElements(pf, 'pivotField').forEach((f, k) => {
      const its = firstChild(f, 'items');
      if (its && childElements(its, 'item').some((it) => it.attrs['h'] === '1' || it.attrs['h'] === 'true')) filtered.push(k);
    });
    const filters = firstChild(root, 'filters');
    if (filters) for (const f of childElements(filters, 'filter')) filtered.push(int(f, 'fld', -1));
    if (filtered.length) out.filteredFields = filtered;
  }
  if (pageFields) {
    const filtered = new Set(out.filteredFields ?? []);
    // campo de página com item escolhido ou itens ocultos → funil no botão
    out.pageFieldActive = childElements(pageFields, 'pageField').map((p) => p.attrs['item'] !== undefined || filtered.has(int(p, 'fld', -1)));
  }
  return out;
}
