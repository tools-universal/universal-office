import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { colorContext, resolveColorEl, type ColorContext } from './theme.js';
import type {
  Workbook, SheetRef, Worksheet, Row, Cell, CellType, SharedString, RichRun, RunProps,
  ColDef, PaneInfo, CondFormat, CondRule, ColorStop, Comment,
  DrawingAnchor, DrawingChart, Hyperlink, SheetFormatPr, TableInfo,
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

/** Caminho do .rels que pertence a uma parte (ex.: `xl/worksheets/sheet1.xml` →
 *  `xl/worksheets/_rels/sheet1.xml.rels`). */
function relsPathFor(part: string): string {
  const slash = part.lastIndexOf('/');
  const dir = part.slice(0, slash); const file = part.slice(slash + 1);
  return `${dir}/_rels/${file}.rels`;
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
  // activeTab vive em <bookViews><workbookView activeTab="N"> (NÃO no root).
  const bookViews = firstChild(root, 'bookViews');
  const wbView = bookViews ? firstChild(bookViews, 'workbookView') : undefined;
  const activeTabStr = wbView?.attrs['activeTab'] ?? root.attrs['activeTab'];
  if (activeTabStr !== undefined) wb.activeTab = parseInt(activeTabStr, 10);
  // date1904: <workbookPr date1904="1"> desloca o epoch dos seriais em 1462 dias.
  const wbPr = firstChild(root, 'workbookPr');
  if (wbPr?.attrs['date1904'] === '1' || wbPr?.attrs['date1904'] === 'true') wb.date1904 = true;
  return wb;
}

/**
 * Lê xl/sharedStrings.xml → SharedString[] (ausente → []). `cx` opcional:
 * contexto de cores para resolver <color theme/indexed> dos runs ricos.
 */
export function readSharedStrings(pkg: XlsxPackage, cx?: ColorContext): SharedString[] {
  const xml = pkg.getPartText('xl/sharedStrings.xml');
  if (xml === undefined) return [];
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml(xml);
  const out: SharedString[] = [];
  for (const si of childElements(root, 'si')) {
    out.push(readSharedStringEntry(si, ctx));
  }
  return out;
}

/**
 * Parseia o <rPr> de um run rico → RunProps. Booleans são EXPLÍCITOS quando o
 * elemento existe (`<b val="0"/>` → bold:false, nega o herdado da célula).
 */
function readRunProps(rPr: XmlElement, cx?: ColorContext): RunProps | undefined {
  const props: RunProps = {};
  const boolEl = (name: string): boolean | undefined => {
    const e = firstChild(rPr, name);
    if (!e) return undefined;
    const v = e.attrs['val'];
    return v !== '0' && v !== 'false' && v !== 'none';
  };
  const b = boolEl('b'); if (b !== undefined) props.bold = b;
  const i = boolEl('i'); if (i !== undefined) props.italic = i;
  const u = boolEl('u'); if (u !== undefined) props.underline = u;
  const st = boolEl('strike'); if (st !== undefined) props.strike = st;
  const sz = firstChild(rPr, 'sz');
  if (sz?.attrs['val'] !== undefined) props.size = parseFloat(sz.attrs['val']);
  const colEl = firstChild(rPr, 'color');
  if (colEl) props.color = resolveColorEl(colEl, cx);
  const rFont = firstChild(rPr, 'rFont');
  if (rFont?.attrs['val'] !== undefined) props.font = rFont.attrs['val'];
  return Object.keys(props).length ? props : undefined;
}

function readSharedStringEntry(el: XmlElement, cx?: ColorContext): SharedString {
  const runsEls = childElements(el, 'r');
  if (runsEls.length > 0) {
    const runs: RichRun[] = runsEls.map((r) => {
      const t = firstChild(r, 't');
      const rPr = firstChild(r, 'rPr');
      const rPrAttrs: Record<string, string> = {};
      if (rPr) for (const a of Object.keys(rPr.attrs)) rPrAttrs[a] = rPr.attrs[a]!;
      const run: RichRun = { text: t ? textContent(t) : '' };
      if (Object.keys(rPrAttrs).length) run.rPr = rPrAttrs;
      if (rPr) {
        const props = readRunProps(rPr, cx);
        if (props) run.props = props;
      }
      return run;
    });
    return { text: runs.map((r) => r.text).join(''), runs };
  }
  const t = firstChild(el, 't');
  return { text: t ? textContent(t) : '' };
}

/** Lê uma planilha (path) → Worksheet. `cx` opcional: contexto de cores. */
export function readWorksheet(pkg: XlsxPackage, sheetPath: string, cx?: ColorContext): Worksheet {
  const xml = pkg.getPartText(sheetPath);
  if (xml === undefined) throw new Error(`Pacote sem ${sheetPath}`);
  const ctx = cx ?? colorContext(pkg);
  const root = parseXml(xml);
  // .rels do sheet: liga a comments1.xml, drawings1.xml, hyperlinks, etc.
  const relsPath = relsPathFor(sheetPath);
  const sheetRels = readRels(pkg, relsPath);

  const rows: Row[] = [];
  const sheetData = firstChild(root, 'sheetData');
  if (sheetData) {
    for (const rowEl of childElements(sheetData, 'row')) {
      rows.push(readRow(rowEl, ctx));
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

  // <sheetFormatPr defaultColWidth defaultRowHeight customHeight baseColWidth>
  let sheetFormatPr: SheetFormatPr | undefined;
  const sfp = firstChild(root, 'sheetFormatPr');
  if (sfp) {
    sheetFormatPr = {};
    if (sfp.attrs['defaultColWidth'] !== undefined) sheetFormatPr.defaultColWidth = parseFloat(sfp.attrs['defaultColWidth']);
    if (sfp.attrs['baseColWidth'] !== undefined) sheetFormatPr.baseColWidth = parseFloat(sfp.attrs['baseColWidth']);
    if (sfp.attrs['defaultRowHeight'] !== undefined) sheetFormatPr.defaultRowHeight = parseFloat(sfp.attrs['defaultRowHeight']);
    if (sfp.attrs['customHeight'] === '1' || sfp.attrs['customHeight'] === 'true') sheetFormatPr.customHeight = true;
    if (Object.keys(sheetFormatPr).length === 0) sheetFormatPr = undefined;
  }

  // <hyperlinks><hyperlink ref r:id location display tooltip/></hyperlinks>
  // Externo: r:id → target no .rels (URL completa, NÃO resolver como parte).
  const hyperlinks: Hyperlink[] = [];
  const hlinksEl = firstChild(root, 'hyperlinks');
  if (hlinksEl) {
    for (const hl of childElements(hlinksEl, 'hyperlink')) {
      const ref = hl.attrs['ref'];
      if (ref === undefined) continue;
      const link: Hyperlink = { ref };
      const rid = hl.attrs['r:id'] ?? hl.attrs['id'];
      if (rid !== undefined) {
        const target = sheetRels.get(rid);
        if (target !== undefined) link.target = target;
      }
      if (hl.attrs['location'] !== undefined) link.location = hl.attrs['location'];
      if (hl.attrs['display'] !== undefined) link.display = hl.attrs['display'];
      if (hl.attrs['tooltip'] !== undefined) link.tooltip = hl.attrs['tooltip'];
      hyperlinks.push(link);
    }
  }

  // <sheetView><pane .../></sheetView> — congelar painéis + grade
  let pane: PaneInfo | undefined;
  const sheetView = firstChild(firstChild(root, 'sheetViews') ?? root, 'sheetView');
  const showGridLines = sheetView?.attrs['showGridLines'] === '0' ? false : undefined;
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
          const c = resolveColorEl(colEl, ctx) ?? '#000000';
          if (stops[i]) stops[i]!.color = c; i++;
        }
        rules.push({ type, priority, stops });
      } else if (type === 'dataBar') {
        const db = firstChild(ruleEl, 'dataBar');
        const colorEl = db ? firstChild(db, 'color') : undefined;
        rules.push({ type, priority, barColor: (colorEl ? resolveColorEl(colorEl, ctx) : undefined) ?? '#638EC6' });
      } else if (type === 'cellIs' || type === 'expression') {
        const dxfId = ruleEl.attrs['dxfId'] !== undefined ? parseInt(ruleEl.attrs['dxfId'], 10) : undefined;
        const formula = childElements(ruleEl, 'formula').map((f) => textContent(f));
        rules.push({ type, priority, operator: ruleEl.attrs['operator'], formula, dxfId });
      }
    }
    if (rules.length) condFormats.push({ sqref, rules });
  }

  // comentários da planilha (rels de tipo .../relationships/comments)
  const commentsPath = findRelByType(pkg, relsPath, '/comments');
  const comments = commentsPath ? readComments(pkg, pkg.resolveRelTarget(sheetPath, commentsPath)) : [];
  // charts ancorados (drawing1.xml) — só descobre o caminho aqui; parse abaixo
  const drawingTarget = findRelByType(pkg, relsPath, '/drawing');
  const charts = drawingTarget
    ? readDrawingCharts(pkg, pkg.resolveRelTarget(sheetPath, drawingTarget))
    : [];

  // tabelas (ListObjects): <tableParts> liga a xl/tables/tableN.xml via rels
  const tables: TableInfo[] = [];
  for (const target of findRelsByType(pkg, relsPath, '/table')) {
    const t = readTablePart(pkg, pkg.resolveRelTarget(sheetPath, target));
    if (t) tables.push(t);
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
  if (showGridLines === false) ws.showGridLines = false;
  if (condFormats.length > 0) ws.condFormats = condFormats;
  if (comments.length > 0) ws.comments = comments;
  if (charts.length > 0) ws.charts = charts;
  if (hyperlinks.length > 0) ws.hyperlinks = hyperlinks;
  if (sheetFormatPr) ws.sheetFormatPr = sheetFormatPr;
  if (tables.length > 0) ws.tables = tables;
  return ws;
}

/** Lê `xl/tables/tableN.xml` → TableInfo. */
function readTablePart(pkg: XlsxPackage, tablePath: string): TableInfo | undefined {
  const xml = pkg.getPartText(tablePath);
  if (!xml) return undefined;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return undefined; }
  const ref = root.attrs['ref'];
  if (!ref) return undefined;
  const headerRow = root.attrs['headerRowCount'] !== '0';
  const totalsRow = root.attrs['totalsRowCount'] === '1';
  const styleInfo = firstChild(root, 'tableStyleInfo');
  const out: TableInfo = {
    ref,
    headerRow,
    totalsRow,
    stripes: styleInfo?.attrs['showRowStripes'] === '1',
    autoFilter: firstChild(root, 'autoFilter') !== undefined,
  };
  if (styleInfo?.attrs['name']) out.styleName = styleInfo.attrs['name'];
  return out;
}

/**
 * Lê `xl/drawings/drawingN.xml` + seu `_rels` → lista de charts ancorados.
 * Cada `<xdr:twoCellAnchor>` define from/to em (col,row) + offsets EMU;
 * cada `<xdr:graphicFrame>` com `<c:chart r:id>` resolve para um `chartN.xml`.
 * Imagens/tabelas via drawing são pendentes (futuras iterações).
 */
function readDrawingCharts(pkg: XlsxPackage, drawingPath: string): DrawingChart[] {
  const out: DrawingChart[] = [];
  const xml = pkg.getPartText(drawingPath);
  if (xml === undefined) return out;
  const root = parseXml(xml);
  // rels do próprio drawing (para resolver rId -> chartN.xml)
  const drelsPath = relsPathFor(drawingPath);
  const drelsMap = new Map<string, string>(); // rid -> caminho absoluto no pacote
  const drelsXml = pkg.getPartText(drelsPath);
  if (drelsXml !== undefined) {
    const drelsRoot = parseXml(drelsXml);
    for (const rel of childElements(drelsRoot, 'Relationship')) {
      const id = rel.attrs['Id'];
      const target = rel.attrs['Target'];
      if (id && target) drelsMap.set(id, pkg.resolveRelTarget(drawingPath, target));
    }
  }
  const parseInt0 = (s: string | undefined): number => (s ? parseInt(s, 10) : 0);

  for (const anchor of childElements(root, 'xdr:twoCellAnchor')) {
    const from = firstChild(anchor, 'xdr:from');
    const to = firstChild(anchor, 'xdr:to');
    if (!from || !to) continue;
    const gframe = firstChild(anchor, 'xdr:graphicFrame');
    if (!gframe) continue;
    const graphic = firstChild(gframe, 'a:graphic');
    const data = graphic ? firstChild(graphic, 'a:graphicData') : undefined;
    if (!data) continue;
    const chartEl = firstChild(data, 'c:chart');
    if (!chartEl) continue;
    const rid = chartEl.attrs['r:id'] ?? chartEl.attrs['id'];
    if (!rid) continue;
    const chartPath = drelsMap.get(rid);
    if (!chartPath) continue;
    const chartXml = pkg.getPartText(chartPath);
    if (!chartXml) continue;
    const anchorData: DrawingAnchor = {
      from: {
        col: parseInt0(textContent(firstChild(from, 'xdr:col') ?? makeStub())),
        row: parseInt0(textContent(firstChild(from, 'xdr:row') ?? makeStub())),
        colOff: parseInt0(textContent(firstChild(from, 'xdr:colOff') ?? makeStub())),
        rowOff: parseInt0(textContent(firstChild(from, 'xdr:rowOff') ?? makeStub())),
      },
      to: {
        col: parseInt0(textContent(firstChild(to, 'xdr:col') ?? makeStub())),
        row: parseInt0(textContent(firstChild(to, 'xdr:row') ?? makeStub())),
        colOff: parseInt0(textContent(firstChild(to, 'xdr:colOff') ?? makeStub())),
        rowOff: parseInt0(textContent(firstChild(to, 'xdr:rowOff') ?? makeStub())),
      },
    };
    out.push({ anchor: anchorData, chartXml });
  }
  return out;
}

function makeStub(): XmlElement { return { name: '', attrs: {}, children: ['0'] }; }

/** Procura no `.rels` de uma parte o primeiro relacionamento cujo Type termina em `typeSuffix`. */
function findRelByType(pkg: XlsxPackage, relsPart: string, typeSuffix: string): string | undefined {
  const xml = pkg.getPartText(relsPart);
  if (xml === undefined) return undefined;
  const root = parseXml(xml);
  for (const rel of childElements(root, 'Relationship')) {
    const t = rel.attrs['Type'] ?? '';
    if (t.endsWith(typeSuffix)) return rel.attrs['Target'];
  }
  return undefined;
}

/** Como `findRelByType`, mas devolve TODOS os targets do tipo (ex.: /table). */
function findRelsByType(pkg: XlsxPackage, relsPart: string, typeSuffix: string): string[] {
  const xml = pkg.getPartText(relsPart);
  if (xml === undefined) return [];
  const root = parseXml(xml);
  const out: string[] = [];
  for (const rel of childElements(root, 'Relationship')) {
    const t = rel.attrs['Type'] ?? '';
    if (t.endsWith(typeSuffix)) {
      const target = rel.attrs['Target'];
      if (target) out.push(target);
    }
  }
  return out;
}

/** Lê `xl/commentsN.xml` → Comment[] (refs + texto plano + autor resolvido). */
function readComments(pkg: XlsxPackage, path: string): Comment[] {
  const xml = pkg.getPartText(path);
  if (xml === undefined) return [];
  const root = parseXml(xml);
  const authors: string[] = [];
  const authorsEl = firstChild(root, 'authors');
  if (authorsEl) for (const a of childElements(authorsEl, 'author')) authors.push(textContent(a));
  const list = firstChild(root, 'commentList');
  const out: Comment[] = [];
  if (!list) return out;
  for (const cmt of childElements(list, 'comment')) {
    const ref = cmt.attrs['ref'];
    if (!ref) continue;
    const text = firstChild(cmt, 'text');
    // o texto pode vir em <text><t>...</t></text> ou via runs <r><t>...</t></r>
    const plain = text ? textContent(text) : '';
    const ai = cmt.attrs['authorId'] !== undefined ? parseInt(cmt.attrs['authorId'], 10) : -1;
    const c: Comment = { ref, text: plain };
    if (ai >= 0 && authors[ai] !== undefined) c.author = authors[ai];
    out.push(c);
  }
  return out;
}

function readRow(el: XmlElement, cx?: ColorContext): Row {
  const row: Row = {
    r: parseInt(el.attrs['r'] ?? '0', 10),
    cells: [],
  };
  if (el.attrs['spans'] !== undefined) row.spans = el.attrs['spans'];
  if (el.attrs['ht'] !== undefined) row.height = parseFloat(el.attrs['ht']);
  if (el.attrs['customHeight'] === '1' || el.attrs['customHeight'] === 'true') row.customHeight = true;
  if (el.attrs['hidden'] === '1' || el.attrs['hidden'] === 'true') row.hidden = true;
  if (el.attrs['s'] !== undefined) row.style = parseInt(el.attrs['s'], 10);
  for (const cEl of childElements(el, 'c')) row.cells.push(readCell(cEl, cx));
  return row;
}

function readCell(el: XmlElement, cx?: ColorContext): Cell {
  const cell: Cell = { ref: el.attrs['r'] ?? '' };
  if (el.attrs['t'] !== undefined) cell.type = el.attrs['t'] as CellType;
  if (el.attrs['s'] !== undefined) cell.style = parseInt(el.attrs['s'], 10);
  const v = firstChild(el, 'v');
  if (v !== undefined) cell.value = textContent(v);
  const f = firstChild(el, 'f');
  if (f !== undefined) cell.formula = textContent(f);
  const isEl = firstChild(el, 'is');
  if (isEl !== undefined) cell.inlineString = readSharedStringEntry(isEl, cx);
  return cell;
}
