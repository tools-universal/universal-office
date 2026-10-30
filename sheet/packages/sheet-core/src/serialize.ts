/**
 * Serialização MÍNIMA de worksheet — cirurgia no XML original.
 *
 * Regra de ouro do projeto: só regeneramos o que uma edição de fato mudou.
 * Aqui trocamos os blocos `<sheetData>` e `<cols>` do XML original da
 * worksheet e, SÓ quando a edição os mudou (opções de updateWorksheetXml),
 * `<mergeCells>` e o 1º `<sheetView>` (linhas de grade, painéis congelados);
 * todo o resto (condicionais, validações, partes desconhecidas…) flui byte a
 * byte. É o suficiente para persistir edições de célula, formatação,
 * mesclas, vista e redimensionamento feitos no editor.
 *
 * Limitações v1 (documentadas): o bloco <sheetData> inteiro é regenerado a
 * partir do modelo — atributos de `<row>`/`<c>` não modelados são perdidos.
 * Row/Cell preservam r, ht, hidden, customHeight, s, t, f, v e is, que cobre
 * o que o app de referência grava em planilhas comuns. `spans` é recalculado
 * (não copiado) para evitar spans obsoletos após edição.
 */
import type { Worksheet, Row, Cell, ColDef } from './model.js';
import { refToRowCol, rowColToRef } from './model.js';

const escXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string): string => escXml(s).replace(/"/g, '&quot;');

/**
 * Texto ST_Xstring (valor `t="str"`, string inline): caractere de controle que
 * o XML não aceita vira `_xHHHH_` e um `_xHHHH_` literal ganha o escape
 * `_x005F_` — o inverso do decodeXstring da leitura (o Excel faz igual).
 */
export function encodeXstring(s: string): string {
  return s.replace(/_x[0-9A-Fa-f]{4}_/g, '_x005F$&')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, (ch) => `_x${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`);
}

/** <f> com os atributos (t, ref, si, ca…); filha de compartilhada sem texto = <f …/>. */
function formulaXml(c: Cell): string {
  let a = '';
  const fa = c.formulaAttrs;
  if (fa) {
    if (fa.t && fa.t !== 'normal') a += ` t="${fa.t}"`;
    if (fa.ref !== undefined) a += ` ref="${escAttr(fa.ref)}"`;
    if (fa.dt2D) a += ' dt2D="1"';
    if (fa.dtr) a += ' dtr="1"';
    if (fa.del1) a += ' del1="1"';
    if (fa.del2) a += ' del2="1"';
    if (fa.r1 !== undefined) a += ` r1="${escAttr(fa.r1)}"`;
    if (fa.r2 !== undefined) a += ` r2="${escAttr(fa.r2)}"`;
    if (fa.ca) a += ' ca="1"';
    if (fa.si !== undefined) a += ` si="${fa.si}"`;
    if (fa.aca) a += ' aca="1"';
    if (fa.bx) a += ' bx="1"';
  }
  return c.formula ? `<f${a}>${escXml(c.formula)}</f>` : a ? `<f${a}/>` : '<f></f>';
}

/**
 * Erros que o `<v>` aceita. Os do 365 (#SPILL!, #CALC!, #FIELD!…) o Excel grava
 * como #VALUE! + rich value (vm); escritos direto, ele NÃO abre a pasta (medido).
 */
const FILE_ERRORS = new Set(['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA']);

function cellXml(c: Cell): string {
  let attrs = ` r="${escAttr(c.ref)}"`;
  if (c.style !== undefined) attrs += ` s="${c.style}"`;
  if (c.type) attrs += ` t="${c.type}"`;
  if (c.cm !== undefined) attrs += ` cm="${c.cm}"`;
  if (c.vm !== undefined) attrs += ` vm="${c.vm}"`;
  let inner = '';
  if (c.formula !== undefined) inner += formulaXml(c);
  if (c.inlineString !== undefined) {
    const t = c.inlineString.text ?? c.inlineString.runs?.map((r) => r.text).join('') ?? '';
    const sp = /^\s|\s$/.test(t) ? ' xml:space="preserve"' : '';
    inner += `<is><t${sp}>${escXml(encodeXstring(t))}</t></is>`;
  } else if (c.type === 'str' && c.value !== undefined) {
    // texto de fórmula/derramado: "" vai como <v></v> (o Excel grava <v/>; sem <v> ele calcula ao abrir);
    // espaço nas pontas só sobrevive com xml:space="preserve" (o Excel grava assim e apara sem ele)
    const sp = /^[ \t\n\r]|[ \t\n\r]$/.test(c.value) ? ' xml:space="preserve"' : '';
    inner += `<v${sp}>${escXml(encodeXstring(c.value))}</v>`;
  } else if (c.type === 'e' && c.value !== undefined && !FILE_ERRORS.has(c.value.trim().toUpperCase())) {
    // (com vm, o rich value guarda o tipo do erro; o <v> é sempre #VALUE!)
    inner += '<v>#VALUE!</v>';
  } else if (c.value !== undefined && (c.value !== '' || c.formula === undefined)) {
    inner += `<v>${escXml(c.value)}</v>`;
  }
  return inner ? `<c${attrs}>${inner}</c>` : `<c${attrs}/>`;
}

function rowXml(r: Row): string {
  let attrs = ` r="${r.r}"`;
  // spans recalculado da própria linha (evita span obsoleto)
  if (r.cells.length > 0) {
    const colNums = r.cells.map((c) => refToRowCol(c.ref).col);
    attrs += ` spans="${Math.min(...colNums)}:${Math.max(...colNums)}"`;
  }
  if (r.style !== undefined) attrs += ` s="${r.style}" customFormat="1"`;
  if (r.height !== undefined) attrs += ` ht="${r.height}"`;
  if (r.hidden) attrs += ' hidden="1"';
  if (r.customHeight) attrs += ' customHeight="1"';
  const cells = r.cells.map(cellXml).join('');
  return cells ? `<row${attrs}>${cells}</row>` : `<row${attrs}/>`;
}

/** Serializa o bloco <sheetData> a partir do modelo (linhas ordenadas). */
export function serializeSheetData(rows: Row[]): string {
  const sorted = [...rows].sort((a, b) => a.r - b.r);
  const body = sorted.filter((r) => r.cells.length > 0 || r.height !== undefined || r.hidden || r.style !== undefined)
    .map(rowXml).join('');
  return body ? `<sheetData>${body}</sheetData>` : '<sheetData/>';
}

/** Serializa o bloco <cols> (vazio → ''; OOXML não permite <cols/> sem filhos). */
export function serializeCols(cols: ColDef[] | undefined): string {
  if (!cols || cols.length === 0) return '';
  const body = cols.map((c) => {
    let a = ` min="${c.min}" max="${c.max}"`;
    if (c.width !== undefined) a += ` width="${c.width}"`;
    if (c.customWidth) a += ' customWidth="1"';
    if (c.hidden) a += ' hidden="1"';
    if (c.style !== undefined) a += ` style="${c.style}"`;
    return `<col${a}/>`;
  }).join('');
  return `<cols>${body}</cols>`;
}

/** O que mais regravar além de <sheetData>/<cols> (só o que a edição mudou). */
export interface WorksheetXmlOptions {
  /** `<mergeCells>` a partir de `ws.merges` (Mesclar/Desfazer mesclagem). */
  merges?: boolean;
  /** `showGridLines` e `<pane>` do 1º `<sheetView>` (Linhas de Grade, Congelar Painéis). */
  sheetView?: boolean;
}

/**
 * Atualiza o XML original da worksheet trocando SÓ <sheetData> (e <cols>) —
 * e, quando pedido (a edição mudou), <mergeCells> e o 1º <sheetView> (linhas de
 * grade e painéis congelados). Tudo fora desses blocos permanece byte a byte.
 */
export function updateWorksheetXml(originalXml: string, ws: Worksheet, opts: WorksheetXmlOptions = {}): string {
  let xml = originalXml;
  if (opts.merges) xml = replaceMergeCells(xml, ws.merges ?? []);
  if (opts.sheetView) xml = updateSheetView(xml, ws);

  const sheetData = serializeSheetData(ws.rows);
  const sdOpen = xml.search(/<sheetData[\s/>]/);
  if (sdOpen < 0) throw new Error('worksheet sem <sheetData>');
  const selfClose = /^<sheetData\s*\/>/.test(xml.slice(sdOpen));
  const sdEnd = selfClose
    ? sdOpen + xml.slice(sdOpen).match(/^<sheetData\s*\/>/)![0].length
    : xml.indexOf('</sheetData>', sdOpen) + '</sheetData>'.length;
  xml = xml.slice(0, sdOpen) + sheetData + xml.slice(sdEnd);

  const cols = serializeCols(ws.cols);
  const colsOpen = xml.search(/<cols[\s>]/);
  if (colsOpen >= 0) {
    const colsEnd = xml.indexOf('</cols>', colsOpen) + '</cols>'.length;
    xml = xml.slice(0, colsOpen) + cols + xml.slice(colsEnd);
  } else if (cols) {
    // schema: <cols> vem imediatamente antes de <sheetData>
    const at = xml.search(/<sheetData[\s/>]/);
    xml = xml.slice(0, at) + cols + xml.slice(at);
  }
  return xml;
}

/** Elementos do CT_Worksheet que vêm DEPOIS de <mergeCells> (ordem do schema). */
const AFTER_MERGES = ['phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins',
  'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags',
  'drawing', 'legacyDrawing', 'legacyDrawingHF', 'drawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems',
  'tableParts', 'extLst'];
/** Elementos que vêm DEPOIS de <sheetViews>. */
const AFTER_VIEWS = ['sheetFormatPr', 'cols', 'sheetData'];
/** Prefixo do namespace da raiz (`x:` em pacotes gerados por SDKs; '' no Excel). */
function rootPrefix(xml: string): string {
  return /<((?:\w+:)?)worksheet\b/.exec(xml)?.[1] ?? '';
}

/** Posição antes do 1º elemento da lista (no nível da worksheet); senão antes de </worksheet>. */
function insertionPoint(xml: string, p: string, before: readonly string[]): number {
  let at = -1;
  for (const name of before) {
    const i = xml.search(new RegExp(`<${p}${name}[\\s/>]`));
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  return at >= 0 ? at : xml.lastIndexOf(`</${p}worksheet>`);
}

/** Bloco <mergeCells> (vazio → ''). */
export function serializeMergeCells(merges: readonly string[], p = ''): string {
  if (!merges.length) return '';
  return `<${p}mergeCells count="${merges.length}">${merges.map((m) => `<${p}mergeCell ref="${escAttr(m)}"/>`).join('')}</${p}mergeCells>`;
}

function replaceMergeCells(xml: string, merges: readonly string[]): string {
  const p = rootPrefix(xml);
  const block = serializeMergeCells(merges, p);
  const open = xml.search(new RegExp(`<${p}mergeCells[\\s/>]`));
  if (open >= 0) {
    const self = new RegExp(`^<${p}mergeCells\\b[^>]*/>`).exec(xml.slice(open));
    const end = self ? open + self[0].length : xml.indexOf(`</${p}mergeCells>`, open) + `</${p}mergeCells>`.length;
    return xml.slice(0, open) + block + xml.slice(end);
  }
  if (!block) return xml;
  const at = insertionPoint(xml, p, AFTER_MERGES);
  return at < 0 ? xml : xml.slice(0, at) + block + xml.slice(at);
}

/** <pane> dos painéis congelados (sem congelamento → ''). */
function paneXml(ws: Worksheet, p: string): string {
  const pane = ws.pane;
  if (!pane || (pane.state !== 'frozen' && pane.state !== 'frozenSplit')) return '';
  const x = Math.max(0, Math.floor(pane.xSplit)), y = Math.max(0, Math.floor(pane.ySplit));
  if (!x && !y) return '';
  const active = x && y ? 'bottomRight' : x ? 'topRight' : 'bottomLeft';
  const tl = pane.topLeftCell ?? rowColToRef(x + 1, y + 1);
  return `<${p}pane${x ? ` xSplit="${x}"` : ''}${y ? ` ySplit="${y}"` : ''} topLeftCell="${escAttr(tl)}" activePane="${active}" state="frozen"/>`;
}

/**
 * 1º <sheetView>: `showGridLines` (ausente = visível) e o <pane> congelado (só
 * quando difere do arquivo — um split solto fica). As <selection> saem junto
 * com o pane antigo (a de um painel que não existe mais invalidaria o arquivo;
 * sem elas o Excel abre na A1).
 */
function updateSheetView(xml: string, ws: Worksheet): string {
  const p = rootPrefix(xml);
  const pane = paneXml(ws, p);
  const grid = (open: string): string => {
    const o = open.replace(/\sshowGridLines="[^"]*"/, '');
    return ws.showGridLines === false ? o.replace(new RegExp(`^<${p}sheetView`), `<${p}sheetView showGridLines="0"`) : o;
  };
  const m = new RegExp(`<${p}sheetView\\b([^>]*?)(/?)>`).exec(xml);
  if (!m) {
    const views = `<${p}sheetViews>${grid(`<${p}sheetView workbookViewId="0"`)}${pane ? `>${pane}</${p}sheetView>` : '/>'}</${p}sheetViews>`;
    const at = insertionPoint(xml, p, AFTER_VIEWS);
    return at < 0 ? xml : xml.slice(0, at) + views + xml.slice(at);
  }
  const open = grid(`<${p}sheetView${m[1]!.replace(/\s+$/, '')}`);
  const start = m.index, headEnd = start + m[0].length;
  if (m[2]) return xml.slice(0, start) + open + (pane ? `>${pane}</${p}sheetView>` : '/>') + xml.slice(headEnd);
  const close = xml.indexOf(`</${p}sheetView>`, headEnd);
  if (close < 0) return xml;
  // o pane do arquivo já é o do modelo (só as linhas de grade mudaram): o corpo fica como está
  const cur = new RegExp(`<${p}pane\\b([^>]*)`).exec(xml.slice(headEnd, close));
  const attr = (n: string): string | undefined => (cur ? new RegExp(`\\s${n}="([^"]*)"`).exec(cur[1]!)?.[1] : undefined);
  const samePane = cur
    ? !!ws.pane && attr('state') === ws.pane.state && Number(attr('xSplit') ?? 0) === ws.pane.xSplit && Number(attr('ySplit') ?? 0) === ws.pane.ySplit
    : !pane;
  if (samePane) return xml.slice(0, start) + open + '>' + xml.slice(headEnd);
  const body = xml.slice(headEnd, close)
    .replace(new RegExp(`<${p}pane\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}pane>)`, 'g'), '')
    .replace(new RegExp(`<${p}selection\\b[^>]*?(?:/>|>[\\s\\S]*?</${p}selection>)`, 'g'), '');
  return xml.slice(0, start) + open + '>' + pane + body + xml.slice(close);
}
