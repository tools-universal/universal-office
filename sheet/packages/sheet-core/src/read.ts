import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import type {
  Workbook, SheetRef, Worksheet, Row, Cell, CellType, SharedString, RichRun,
  ColDef, PaneInfo, CondFormat, CondRule, ColorStop,
} from './model.js';
import type { XlsxPackage } from './package.js';

/** Mapa de relacionamentos rId → target, lido de um arquivo .rels do pacote. */
function readRels(pkg: XlsxPackage, relsPart: string): Map<string, string> {
  const map = new Map<string, string>();
  const xml = pkg.getPartText(relsPart);
  if (xml === undefined) return map;
  const root = parseXml(xml);
  for (const rel of childElements(root, 'Relationship')) {
    const id = rel.attrs['Id'];
    const target = rel.attrs['Target'];
    if (id !== undefined && target !== undefined) map.set(id, target);
  }
  return map;
}

/** Lê xl/workbook.xml → Workbook (resolve targets das planilhas via rels). */
export function readWorkbook(pkg: XlsxPackage): Workbook {
  const root = parseXml(pkg.workbookXml());
  const sheetsEl = firstChild(root, 'sheets');
  const sheets: SheetRef[] = [];
  const rels = readRels(pkg, 'xl/_rels/workbook.xml.rels');
  if (sheetsEl) {
    for (const s of childElements(sheetsEl, 'sheet')) {
      const rId = s.attrs['r:id'];
      const target = rId !== undefined ? rels.get(rId) : undefined;
      sheets.push({
        name: s.attrs['name'] ?? '',
        sheetId: s.attrs['sheetId'] ?? '',
        rId: rId ?? '',
        state: s.attrs['state'],
        target: target !== undefined ? pkg.resolveRelTarget('xl/workbook.xml', target) : undefined,
      });
    }
  }
  const wb: Workbook = { sheets };
  const activeTab = root.attrs['activeTab'] !== undefined ? parseInt(root.attrs['activeTab'], 10) : undefined;
  if (activeTab !== undefined) wb.activeTab = activeTab;
  return wb;
}

/** Lê xl/sharedStrings.xml → SharedString[] (ausente → []). */
export function readSharedStrings(pkg: XlsxPackage): SharedString[] {
  const xml = pkg.getPartText('xl/sharedStrings.xml');
  if (xml === undefined) return [];
  const root = parseXml(xml);
  const out: SharedString[] = [];
  for (const si of childElements(root, 'si')) {
    out.push(readSharedStringEntry(si));
  }
  return out;
}

function readSharedStringEntry(el: XmlElement): SharedString {
  const runsEls = childElements(el, 'r');
  if (runsEls.length > 0) {
    const runs: RichRun[] = runsEls.map((r) => {
      const t = firstChild(r, 't');
      const rPr = firstChild(r, 'rPr');
      const rPrAttrs: Record<string, string> = {};
      if (rPr) for (const a of Object.keys(rPr.attrs)) rPrAttrs[a] = rPr.attrs[a]!;
      return { text: t ? textContent(t) : '', rPr: Object.keys(rPrAttrs).length ? rPrAttrs : undefined };
    });
    return { text: runs.map((r) => r.text).join(''), runs };
  }
  const t = firstChild(el, 't');
  return { text: t ? textContent(t) : '' };
}

/** Lê uma planilha (path) → Worksheet. */
export function readWorksheet(pkg: XlsxPackage, sheetPath: string): Worksheet {
  const xml = pkg.getPartText(sheetPath);
  if (xml === undefined) throw new Error(`Pacote sem ${sheetPath}`);
  const root = parseXml(xml);

  const rows: Row[] = [];
  const sheetData = firstChild(root, 'sheetData');
  if (sheetData) {
    for (const rowEl of childElements(sheetData, 'row')) {
      rows.push(readRow(rowEl));
    }
  }

  const merges: string[] = [];
  const mergeCells = firstChild(root, 'mergeCells');
  if (mergeCells) {
    for (const mc of childElements(mergeCells, 'mergeCell')) {
      const ref = mc.attrs['ref'];
      if (ref !== undefined) merges.push(ref);
    }
  }

  // <cols><col min max width customWidth hidden/></cols>
  const cols: ColDef[] = [];
  const colsEl = firstChild(root, 'cols');
  if (colsEl) {
    for (const c of childElements(colsEl, 'col')) {
      const def: ColDef = { min: parseInt(c.attrs['min'] ?? '1', 10), max: parseInt(c.attrs['max'] ?? '1', 10) };
      if (c.attrs['width'] !== undefined) def.width = parseFloat(c.attrs['width']);
      if (c.attrs['customWidth'] === '1') def.customWidth = true;
      if (c.attrs['hidden'] === '1') def.hidden = true;
      if (c.attrs['style'] !== undefined) def.style = parseInt(c.attrs['style'], 10);
      cols.push(def);
    }
  }

  // <sheetView><pane .../></sheetView> — congelar painéis
  let pane: PaneInfo | undefined;
  const sheetView = firstChild(firstChild(root, 'sheetViews') ?? root, 'sheetView');
  const paneEl = sheetView ? firstChild(sheetView, 'pane') : undefined;
  if (paneEl) {
    pane = {
      xSplit: parseInt(paneEl.attrs['xSplit'] ?? '0', 10),
      ySplit: parseInt(paneEl.attrs['ySplit'] ?? '0', 10),
      topLeftCell: paneEl.attrs['topLeftCell'],
      state: paneEl.attrs['state'] ?? 'split',
    };
  }

  // <conditionalFormatting sqref="..."> regras
  const condFormats: CondFormat[] = [];
  for (const cfEl of childElements(root, 'conditionalFormatting')) {
    const sqref = cfEl.attrs['sqref'] ?? '';
    const rules: CondRule[] = [];
    for (const ruleEl of childElements(cfEl, 'cfRule')) {
      const type = ruleEl.attrs['type'] as CondRule['type'];
      const priority = parseInt(ruleEl.attrs['priority'] ?? '0', 10);
      if (type === 'colorScale') {
        const cs = firstChild(ruleEl, 'colorScale');
        const stops: ColorStop[] = [];
        if (cs) for (const cfvo of childElements(cs, 'cfvo')) {
          stops.push({ type: cfvo.attrs['type'] ?? 'min', value: cfvo.attrs['val'] !== undefined ? parseFloat(cfvo.attrs['val']) : undefined, color: '#808080' });
        }
        let i = 0;
        for (const colEl of cs ? childElements(cs, 'color') : []) {
          const c = colorFromColorEl(colEl);
          if (stops[i]) stops[i]!.color = c; i++;
        }
        rules.push({ type, priority, stops });
      } else if (type === 'dataBar') {
        const db = firstChild(ruleEl, 'dataBar');
        const colorEl = db ? firstChild(db, 'color') : undefined;
        rules.push({ type, priority, barColor: colorEl ? colorFromColorEl(colorEl) : '#638EC6' });
      } else if (type === 'cellIs' || type === 'expression') {
        const dxfId = ruleEl.attrs['dxfId'] !== undefined ? parseInt(ruleEl.attrs['dxfId'], 10) : undefined;
        const formula = childElements(ruleEl, 'formula').map((f) => textContent(f));
        rules.push({ type, priority, operator: ruleEl.attrs['operator'], formula, dxfId });
      }
    }
    if (rules.length) condFormats.push({ sqref, rules });
  }

  const ws: Worksheet = { rows };
  if (merges.length > 0) {
    ws.merges = merges;
    ws.mergedAreas = new Map(merges.map((m) => {
      const [tl] = m.split(':'); return [tl ?? m, m] as [string, string];
    }));
  }
  if (cols.length > 0) ws.cols = cols;
  if (pane) ws.pane = pane;
  if (condFormats.length > 0) ws.condFormats = condFormats;
  return ws;
}

/** Resolve um elemento <color> para #RRGGBB (rgb direto; theme/indexed via fallback). */
function colorFromColorEl(c: XmlElement): string {
  const rgb = c.attrs['rgb'];
  if (rgb !== undefined) return '#' + rgb.slice(-6);
  const theme = c.attrs['theme'];
  if (theme !== undefined) return THEME_COLORS[parseInt(theme, 10)] ?? '#000000';
  const indexed = c.attrs['indexed'];
  if (indexed !== undefined) return INDEXED_COLORS[parseInt(indexed, 10)] ?? '#000000';
  return '#000000';
}

/** Paleta tema padrão do Office (índice do atributo theme → cor). */
const THEME_COLORS = [
  '#FFFFFF', // 0 lt1 (background1)
  '#000000', // 1 dk1 (text1) — cor padrão da fonte
  '#E7E6E6', // 2 lt2
  '#44546A', // 3 dk2
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', // 4-9 accent1-6
  '#0563C1', // 10 hyperlink
  '#954F72', // 11 followedHyperlink
];

/** Subset da paleta indexada legada (os mais usados). */
const INDEXED_COLORS: string[] = [];
(() => {
  // 64 = system foreground (preto "auto"); 65 = system background (branco)
  INDEXED_COLORS[64] = '#000000';
  INDEXED_COLORS[65] = '#FFFFFF';
  INDEXED_COLORS[81] = '#FFFFFF';
  // paleta legada 0-7 (cor padrão 0 = preto)
  const base8 = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  base8.forEach((c, i) => { INDEXED_COLORS[i] = c; });
})();

function readRow(el: XmlElement): Row {
  const row: Row = {
    r: parseInt(el.attrs['r'] ?? '0', 10),
    cells: [],
  };
  if (el.attrs['spans'] !== undefined) row.spans = el.attrs['spans'];
  if (el.attrs['ht'] !== undefined) row.height = parseFloat(el.attrs['ht']);
  if (el.attrs['customHeight'] === '1' || el.attrs['customHeight'] === 'true') row.customHeight = true;
  if (el.attrs['hidden'] === '1' || el.attrs['hidden'] === 'true') row.hidden = true;
  if (el.attrs['s'] !== undefined) row.style = parseInt(el.attrs['s'], 10);
  for (const cEl of childElements(el, 'c')) row.cells.push(readCell(cEl));
  return row;
}

function readCell(el: XmlElement): Cell {
  const cell: Cell = { ref: el.attrs['r'] ?? '' };
  if (el.attrs['t'] !== undefined) cell.type = el.attrs['t'] as CellType;
  if (el.attrs['s'] !== undefined) cell.style = parseInt(el.attrs['s'], 10);
  const v = firstChild(el, 'v');
  if (v !== undefined) cell.value = textContent(v);
  const f = firstChild(el, 'f');
  if (f !== undefined) cell.formula = textContent(f);
  const isEl = firstChild(el, 'is');
  if (isEl !== undefined) cell.inlineString = readSharedStringEntry(isEl);
  return cell;
}
