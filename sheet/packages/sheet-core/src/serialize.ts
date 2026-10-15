/**
 * Serialização MÍNIMA de worksheet — cirurgia no XML original.
 *
 * Regra de ouro do projeto: só regeneramos o que uma edição de fato mudou.
 * Aqui trocamos APENAS os blocos `<sheetData>` e `<cols>` do XML original da
 * worksheet; todo o resto (sheetViews, mergeCells, condicionais, partes
 * desconhecidas…) flui byte a byte. É o suficiente para persistir edições de
 * célula e redimensionamento de coluna/linha feitos no editor.
 *
 * Limitações v1 (documentadas): o bloco <sheetData> inteiro é regenerado a
 * partir do modelo — atributos de `<row>`/`<c>` não modelados são perdidos.
 * Row/Cell preservam r, ht, hidden, customHeight, s, t, f, v e is, que cobre
 * o que o app de referência grava em planilhas comuns. `spans` é recalculado
 * (não copiado) para evitar spans obsoletos após edição.
 */
import type { Worksheet, Row, Cell, ColDef } from './model.js';
import { refToRowCol } from './model.js';

const escXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string): string => escXml(s).replace(/"/g, '&quot;');

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
    inner += `<is><t${sp}>${escXml(t)}</t></is>`;
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

/**
 * Atualiza o XML original da worksheet trocando SÓ <sheetData> (e <cols>).
 * Tudo fora desses blocos permanece byte a byte.
 */
export function updateWorksheetXml(originalXml: string, ws: Worksheet): string {
  let xml = originalXml;

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
