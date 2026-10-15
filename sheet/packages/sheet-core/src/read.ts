import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { colorContext, resolveColorEl, type ColorContext } from './theme.js';
import type {
  Workbook, SheetRef, Worksheet, Row, Cell, CellType, SharedString, RichRun, RunProps,
  ColDef, PaneInfo, CondFormat, Comment,
  Hyperlink, SheetFormatPr, TableInfo, AutoFilterInfo, PivotInfo,
  DefinedName, CalcPr, ExternalLink, FormulaAttrs, TableColumnInfo,
} from './model.js';
import { refToRowCol, rowColToRef } from './model.js';
import type { XlsxPackage } from './package.js';
import { readDrawing, readOleObjects, readControls } from './drawing.js';
import { readConditionalFormats } from './read-cf.js';
import { readPivotTable } from './read-pivot.js';

/**
 * Escape `_xHHHH_` da OOXML (ST_Xstring): caractere UTF-16 HHHH (hex maiúsculo
 * ou minúsculo). `_x005F_` escapa o próprio `_` — numa passada só,
 * `_x005F_x000D_` vira o literal `_x000D_`. O Excel exibe `a_x000D_` + LF + `b`
 * como "a\r\nb" (oráculo: lo-escape-unicode, poi-60289).
 */
export function decodeXstring(s: string): string {
  return s.indexOf('_x') < 0 ? s : s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Texto de um `<t>` (string compartilhada, inline ou run rico). Sem
 * `xml:space="preserve"` o Excel apara espaço/TAB/LF/CR das PONTAS — inclusive
 * os vindos de referência (`&#32;`, `&#13;`); o miolo, NBSP e U+3000 ficam
 * (medido, lab e17: independe de quebra, formato "@" ou tipo de string).
 */
function tText(t: XmlElement): string {
  const s = textContent(t);
  return decodeXstring(t.attrs['xml:space'] === 'preserve' ? s : s.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, ''));
}

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
  // nomes definidos
  const dns = firstChild(root, 'definedNames');
  if (dns) {
    const names: DefinedName[] = [];
    for (const d of childElements(dns, 'definedName')) {
      const name = d.attrs['name'];
      if (!name) continue;
      const dn: DefinedName = { name, formula: textContent(d) };
      const ls = d.attrs['localSheetId'];
      if (ls !== undefined && /^\d+$/.test(ls)) dn.localSheetId = parseInt(ls, 10);
      if (isTrue(d.attrs['hidden'])) dn.hidden = true;
      names.push(dn);
    }
    if (names.length) wb.definedNames = names;
  }
  // opções de cálculo
  const cp = firstChild(root, 'calcPr');
  if (cp) {
    const c: CalcPr = {};
    const num = (k: string): number | undefined => { const v = cp.attrs[k]; const n = v === undefined ? NaN : parseFloat(v); return Number.isFinite(n) ? n : undefined; };
    if (num('calcId') !== undefined) c.calcId = num('calcId');
    if (cp.attrs['calcMode']) c.calcMode = cp.attrs['calcMode'];
    if (isTrue(cp.attrs['fullCalcOnLoad'])) c.fullCalcOnLoad = true;
    if (isTrue(cp.attrs['iterate'])) c.iterate = true;
    if (num('iterateCount') !== undefined) c.iterateCount = num('iterateCount');
    if (num('iterateDelta') !== undefined) c.iterateDelta = num('iterateDelta');
    if (cp.attrs['refMode']) c.refMode = cp.attrs['refMode'];
    wb.calcPr = c;
  }
  // links externos: <externalReferences><externalReference r:id/></…> na ordem = [1], [2]…
  const ers = firstChild(root, 'externalReferences');
  if (ers) {
    const links: ExternalLink[] = [];
    for (const er of childElements(ers, 'externalReference')) {
      const rId = er.attrs['r:id'];
      const target = rId !== undefined ? rels.get(rId) : undefined;
      const part = target !== undefined ? pkg.resolveRelTarget('xl/workbook.xml', target) : undefined;
      links.push((part && readExternalLink(pkg, part)) || { sheetNames: [], definedNames: [], sheetData: [] });
    }
    if (links.length) wb.externalLinks = links;
  }
  // matrizes dinâmicas: metadados XLDAPR (xl/metadata.xml)
  const relsXml = pkg.getPartText('xl/_rels/workbook.xml.rels');
  let metaPart = 'xl/metadata.xml';
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), 'Relationship')) {
      if ((rel.attrs['Type'] ?? '').endsWith('/sheetMetadata') && rel.attrs['Target']) metaPart = pkg.resolveRelTarget('xl/workbook.xml', rel.attrs['Target']);
    }
  }
  const dyn = readDynamicArrayCm(pkg, metaPart);
  if (dyn.length) wb.dynamicArrayCm = dyn;
  return wb;
}

const isTrue = (v: string | undefined): boolean => v === '1' || v === 'true';

/** xl/externalLinks/externalLinkN.xml → nomes de aba, nomes e valores em cache. */
function readExternalLink(pkg: XlsxPackage, part: string): ExternalLink | undefined {
  const xml = pkg.getPartText(part);
  if (xml === undefined) return undefined;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return undefined; }
  const book = firstChild(root, 'externalBook');
  const link: ExternalLink = { sheetNames: [], definedNames: [], sheetData: [] };
  if (!book) return link;
  const rId = book.attrs['r:id'];
  if (rId !== undefined) {
    const t = readRels(pkg, relsPathFor(part)).get(rId);
    if (t !== undefined) link.target = t;
  }
  for (const sn of childElements(firstChild(book, 'sheetNames') ?? book, 'sheetName')) link.sheetNames.push(sn.attrs['val'] ?? '');
  for (const dn of childElements(firstChild(book, 'definedNames') ?? book, 'definedName')) {
    const d: { name: string; refersTo?: string; sheetId?: number } = { name: dn.attrs['name'] ?? '' };
    if (dn.attrs['refersTo'] !== undefined) d.refersTo = dn.attrs['refersTo'];
    if (dn.attrs['sheetId'] !== undefined) d.sheetId = parseInt(dn.attrs['sheetId'], 10);
    link.definedNames.push(d);
  }
  for (const sd of childElements(firstChild(book, 'sheetDataSet') ?? book, 'sheetData')) {
    const cells: { ref: string; t?: string; v?: string }[] = [];
    for (const row of childElements(sd, 'row')) {
      for (const c of childElements(row, 'cell')) {
        const ref = c.attrs['r'];
        if (!ref) continue;
        const cell: { ref: string; t?: string; v?: string } = { ref };
        if (c.attrs['t'] !== undefined) cell.t = c.attrs['t'];
        const v = firstChild(c, 'v');
        if (v !== undefined) cell.v = decodeXstring(textContent(v));
        cells.push(cell);
      }
    }
    link.sheetData.push({ sheetId: parseInt(sd.attrs['sheetId'] ?? '0', 10), cells });
  }
  return link;
}

/**
 * xl/metadata.xml: quais `cm` (1-based) são matriz dinâmica — o bloco de
 * <cellMetadata> aponta (rc t,v) para um <futureMetadata name="XLDAPR"> cujo
 * xda:dynamicArrayProperties tem fDynamic="1".
 */
function readDynamicArrayCm(pkg: XlsxPackage, part: string): number[] {
  const xml = pkg.getPartText(part);
  if (xml === undefined) return [];
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return []; }
  const types = childElements(firstChild(root, 'metadataTypes') ?? root, 'metadataType').map((t) => t.attrs['name'] ?? '');
  const future = new Map<string, boolean[]>();
  for (const fm of childElements(root, 'futureMetadata')) {
    const flags = childElements(fm, 'bk').map((bk) => /fDynamic="(1|true)"/.test(serializeLoose(bk)));
    future.set(fm.attrs['name'] ?? '', flags);
  }
  const out: number[] = [];
  childElements(firstChild(root, 'cellMetadata') ?? root, 'bk').forEach((bk, i) => {
    for (const rc of childElements(bk, 'rc')) {
      const type = types[parseInt(rc.attrs['t'] ?? '0', 10) - 1];
      if (type !== 'XLDAPR') continue;
      const flags = future.get('XLDAPR');
      if (flags?.[parseInt(rc.attrs['v'] ?? '0', 10)] ?? true) { out.push(i + 1); break; }
    }
  });
  return out;
}

/** Atributos de todos os descendentes como texto (para achar fDynamic em extLst). */
function serializeLoose(el: XmlElement): string {
  let s = Object.entries(el.attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  for (const c of childElements(el)) s += ' ' + serializeLoose(c);
  return s;
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
  const va = firstChild(rPr, 'vertAlign')?.attrs['val'];
  if (va === 'superscript' || va === 'subscript') props.vertAlign = va;
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
      const run: RichRun = { text: t ? tText(t) : '' };
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
  return { text: t ? tText(t) : '' };
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
    // `r` é opcional em <row> e <c> (o Excel aceita): a posição é a seguinte à anterior
    let nextRow = 1;
    for (const rowEl of childElements(sheetData, 'row')) {
      const row = readRow(rowEl, ctx, nextRow);
      nextRow = row.r + 1;
      rows.push(row);
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
    if (sfp.attrs['zeroHeight'] === '1' || sfp.attrs['zeroHeight'] === 'true') sheetFormatPr.zeroHeight = true;
    // vazio também conta: SEM <sheetFormatPr> a linha padrão do Excel é 15 pt fixos
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
  const offAttr = (a: string): boolean => sheetView?.attrs[a] === '0' || sheetView?.attrs[a] === 'false';
  const onAttr = (a: string): boolean => sheetView?.attrs[a] === '1' || sheetView?.attrs[a] === 'true';
  const paneEl = sheetView ? firstChild(sheetView, 'pane') : undefined;
  if (paneEl) {
    pane = {
      xSplit: parseInt(paneEl.attrs['xSplit'] ?? '0', 10),
      ySplit: parseInt(paneEl.attrs['ySplit'] ?? '0', 10),
      topLeftCell: paneEl.attrs['topLeftCell'],
      state: paneEl.attrs['state'] ?? 'split',
    };
  }

  // formatação condicional: clássica + definições x14 do <extLst> (read-cf.ts)
  const condFormats: CondFormat[] = readConditionalFormats(root, ctx);

  // comentários da planilha (rels de tipo .../relationships/comments)
  const commentsPath = findRelByType(pkg, relsPath, '/comments');
  const comments = commentsPath ? readComments(pkg, pkg.resolveRelTarget(sheetPath, commentsPath)) : [];
  // desenho da aba (drawingN.xml): gráficos + imagens/formas, na ordem do arquivo
  const drawingTarget = findRelByType(pkg, relsPath, '/drawing');
  const drawing = drawingTarget
    ? readDrawing(pkg, pkg.resolveRelTarget(sheetPath, drawingTarget))
    : { charts: [], objects: [] };
  const charts = drawing.charts;
  // objetos OLE (prévia em imagem) e controles de formulário entram como objetos do desenho
  drawing.objects.push(...readOleObjects(root, sheetPath, drawing.objects), ...readControls(pkg, root, sheetPath, drawing.objects));

  // validações de dados tipo LISTA (dropdown na célula selecionada)
  const listValidations: string[] = [];
  const dvs = firstChild(root, 'dataValidations');
  if (dvs) {
    for (const dv of childElements(dvs, 'dataValidation')) {
      if (dv.attrs['type'] !== 'list') continue;
      const sqref = dv.attrs['sqref'];
      if (sqref) for (const part of sqref.split(' ')) listValidations.push(part);
    }
  }

  // tabelas (ListObjects): <tableParts> liga a xl/tables/tableN.xml via rels
  const tables: TableInfo[] = [];
  for (const target of findRelsByType(pkg, relsPath, '/table')) {
    const t = readTablePart(pkg, pkg.resolveRelTarget(sheetPath, target));
    if (t) tables.push(t);
  }
  // tabelas dinâmicas (rels .../pivotTable): estilo pintado sobre o range calculado
  const pivots: PivotInfo[] = [];
  for (const target of findRelsByType(pkg, relsPath, '/pivotTable')) {
    const p = readPivotTable(pkg, pkg.resolveRelTarget(sheetPath, target));
    if (p) pivots.push(p);
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
  if (offAttr('showZeros')) ws.showZeros = false;
  if (onAttr('rightToLeft')) ws.rightToLeft = true;
  // erros ignorados: só o "número armazenado como texto" tem indicador pintado aqui
  const ignored: string[] = [];
  for (const ie of childElements(firstChild(root, 'ignoredErrors') ?? root, 'ignoredError')) {
    const v = ie.attrs['numberStoredAsText'];
    if (v === '1' || v === 'true') ignored.push(...(ie.attrs['sqref'] ?? '').split(/\s+/).filter(Boolean));
  }
  if (ignored.length > 0) ws.ignoreNumberAsText = ignored;
  if (condFormats.length > 0) ws.condFormats = condFormats;
  if (comments.length > 0) ws.comments = comments;
  if (charts.length > 0) ws.charts = charts;
  if (drawing.objects.length > 0) ws.drawings = drawing.objects;
  if (root.name === 'chartsheet') ws.chartsheet = chartsheetView(root);
  if (hyperlinks.length > 0) ws.hyperlinks = hyperlinks;
  if (sheetFormatPr) ws.sheetFormatPr = sheetFormatPr;
  if (tables.length > 0) ws.tables = tables;
  if (pivots.length > 0) ws.pivots = pivots;
  if (listValidations.length > 0) ws.listValidations = listValidations;
  const sheetAf = firstChild(root, 'autoFilter');
  if (sheetAf?.attrs['ref']) ws.autoFilter = readAutoFilter(sheetAf, sheetAf.attrs['ref']);
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
  const on = (k: string): boolean => styleInfo?.attrs[k] === '1' || styleInfo?.attrs[k] === 'true';
  const af = firstChild(root, 'autoFilter');
  const out: TableInfo = {
    ref,
    headerRow,
    totalsRow,
    stripes: on('showRowStripes'),
    autoFilter: af !== undefined,
  };
  if (root.attrs['name'] !== undefined) out.name = root.attrs['name'];
  if (root.attrs['displayName'] !== undefined) out.displayName = root.attrs['displayName'];
  if (root.attrs['headerRowCount'] !== undefined) out.headerRowCount = parseInt(root.attrs['headerRowCount'], 10);
  if (root.attrs['totalsRowCount'] !== undefined) out.totalsRowCount = parseInt(root.attrs['totalsRowCount'], 10);
  const tcs = firstChild(root, 'tableColumns');
  if (tcs) {
    out.columns = childElements(tcs, 'tableColumn').map((tc) => {
      const col: TableColumnInfo = { name: decodeXstring(tc.attrs['name'] ?? '') };
      const ccf = firstChild(tc, 'calculatedColumnFormula');
      if (ccf) col.calculatedColumnFormula = textContent(ccf);
      if (tc.attrs['totalsRowFunction'] !== undefined) col.totalsRowFunction = tc.attrs['totalsRowFunction'];
      if (tc.attrs['totalsRowLabel'] !== undefined) col.totalsRowLabel = tc.attrs['totalsRowLabel'];
      const trf = firstChild(tc, 'totalsRowFormula');
      if (trf) col.totalsRowFormula = textContent(trf);
      return col;
    });
  }
  if (styleInfo?.attrs['name']) out.styleName = styleInfo.attrs['name'];
  if (on('showColumnStripes')) out.colStripes = true;
  if (on('showFirstColumn')) out.firstColumn = true;
  if (on('showLastColumn')) out.lastColumn = true;
  if (af) out.filter = readAutoFilter(af, ref);
  if (root.attrs['tableBorderDxfId'] !== undefined) out.borderDxfId = parseInt(root.attrs['tableBorderDxfId'], 10);
  return out;
}

/** `<autoFilter ref>` → botões ocultos e colunas com critério. */
export function readAutoFilter(af: XmlElement, fallbackRef: string): AutoFilterInfo {
  const info: AutoFilterInfo = { ref: af.attrs['ref'] ?? fallbackRef };
  for (const fc of childElements(af, 'filterColumn')) {
    const id = parseInt(fc.attrs['colId'] ?? '', 10);
    if (!Number.isFinite(id)) continue;
    if (fc.attrs['hiddenButton'] === '1' || fc.attrs['hiddenButton'] === 'true' || fc.attrs['showButton'] === '0' || fc.attrs['showButton'] === 'false') (info.hidden ??= []).push(id);
    if (childElements(fc).length > 0) (info.active ??= []).push(id);
  }
  return info;
}

/** `<chartsheet>`: zoom da vista (`zoomScale`, %) e "ajustar à janela" (`zoomToFit`). */
function chartsheetView(root: XmlElement): { zoom: number; zoomToFit: boolean } {
  const sv = firstChild(firstChild(root, 'sheetViews') ?? root, 'sheetView');
  const z = parseInt(sv?.attrs['zoomScale'] ?? '100', 10);
  const fit = sv?.attrs['zoomToFit'];
  return { zoom: Number.isFinite(z) && z >= 10 && z <= 400 ? z : 100, zoomToFit: fit === '1' || fit === 'true' };
}

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

function readRow(el: XmlElement, cx?: ColorContext, implicitR = 1): Row {
  const rAttr = parseInt(el.attrs['r'] ?? '', 10);
  const row: Row = {
    r: Number.isFinite(rAttr) && rAttr > 0 ? rAttr : implicitR,
    cells: [],
  };
  if (el.attrs['spans'] !== undefined) row.spans = el.attrs['spans'];
  if (el.attrs['ht'] !== undefined) row.height = parseFloat(el.attrs['ht']);
  if (el.attrs['customHeight'] === '1' || el.attrs['customHeight'] === 'true') row.customHeight = true;
  if (el.attrs['hidden'] === '1' || el.attrs['hidden'] === 'true') row.hidden = true;
  if (el.attrs['s'] !== undefined) row.style = parseInt(el.attrs['s'], 10);
  if (el.attrs['customFormat'] === '1' || el.attrs['customFormat'] === 'true') row.customFormat = true;
  if (el.attrs['thickTop'] === '1' || el.attrs['thickTop'] === 'true') row.thickTop = true;
  if (el.attrs['thickBot'] === '1' || el.attrs['thickBot'] === 'true') row.thickBot = true;
  let nextCol = 1;
  for (const cEl of childElements(el, 'c')) {
    const cell = readCell(cEl, cx);
    let col = nextCol;
    if (cell.ref) {
      try { col = refToRowCol(cell.ref).col; } catch { cell.ref = ''; }
    }
    if (!cell.ref) cell.ref = rowColToRef(col, row.r);
    nextCol = col + 1;
    row.cells.push(cell);
  }
  return row;
}

function readCell(el: XmlElement, cx?: ColorContext): Cell {
  const cell: Cell = { ref: el.attrs['r'] ?? '' };
  if (el.attrs['t'] !== undefined) cell.type = el.attrs['t'] as CellType;
  if (el.attrs['s'] !== undefined) cell.style = parseInt(el.attrs['s'], 10);
  const v = firstChild(el, 'v');
  if (v !== undefined) cell.value = cell.type === 'str' ? decodeXstring(textContent(v)) : textContent(v);
  const f = firstChild(el, 'f');
  if (f !== undefined) {
    cell.formula = textContent(f);
    const fa = readFormulaAttrs(f);
    if (fa) cell.formulaAttrs = fa;
  }
  const cm = el.attrs['cm'], vm = el.attrs['vm'];
  if (cm !== undefined && /^\d+$/.test(cm)) cell.cm = parseInt(cm, 10);
  if (vm !== undefined && /^\d+$/.test(vm)) cell.vm = parseInt(vm, 10);
  const isEl = firstChild(el, 'is');
  if (isEl !== undefined) cell.inlineString = readSharedStringEntry(isEl, cx);
  return cell;
}

/** Atributos do <f> (undefined = nenhum). */
function readFormulaAttrs(f: XmlElement): FormulaAttrs | undefined {
  const a = f.attrs;
  if (!Object.keys(a).length) return undefined;
  const out: FormulaAttrs = {};
  const t = a['t'];
  if (t === 'normal' || t === 'array' || t === 'dataTable' || t === 'shared') out.t = t;
  if (a['ref'] !== undefined) out.ref = a['ref'];
  if (a['si'] !== undefined && /^\d+$/.test(a['si'])) out.si = parseInt(a['si'], 10);
  for (const k of ['aca', 'ca', 'bx', 'dt2D', 'dtr', 'del1', 'del2'] as const) if (isTrue(a[k])) out[k] = true;
  if (a['r1'] !== undefined) out.r1 = a['r1'];
  if (a['r2'] !== undefined) out.r2 = a['r2'];
  return Object.keys(out).length ? out : undefined;
}
