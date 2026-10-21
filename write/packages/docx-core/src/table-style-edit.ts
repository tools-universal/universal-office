/**
 * Novo Estilo de Tabela / Modificar Estilo de Tabela: o w:style de tabela
 * editado por condição ("Aplicar formatação a": tabela inteira, linha de
 * cabeçalho, linha de total, primeira/última coluna, faixas, cantos), como o
 * Word grava — tabela inteira no topo do estilo (rPr/pPr, bordas em
 * tblPr/tblBorders, preenchimento e alinhamento vertical em tcPr); as outras
 * condições num w:tblStylePr do tipo (bordas em tcPr/tcBorders). Só os
 * filhos editados mudam (o resto do cru fica).
 */
import { splitElement, setKid } from './lossless.js';
import { patchStylePPr, patchStyleRPr, STYLE_ORDER, type Change, type StyleFormat } from './style-sheet.js';
import { borderXml } from './table-xml.js';
import type { BorderSpec } from './ooxml/props.js';

/** "Aplicar formatação a" na ordem do diálogo do Word. */
export const TABLE_STYLE_CONDS = ['wholeTable', 'firstRow', 'lastRow', 'firstCol', 'lastCol', 'band1Horz', 'band2Horz', 'band1Vert', 'band2Vert', 'nwCell', 'neCell', 'swCell', 'seCell'] as const;
export type TableStyleCond = typeof TABLE_STYLE_CONDS[number];

export type TableStyleSide = 'top' | 'left' | 'bottom' | 'right' | 'insideH' | 'insideV';

/** Formatação de uma condição: a de texto/parágrafo do StyleFormat + célula. */
export interface TableCondFormat extends StyleFormat {
  /** preenchimento (RRGGBB); null = tira */
  fill?: Change<string>;
  /** bordas por lado (null = sem borda; ausente = como está) */
  borders?: Partial<Record<TableStyleSide, BorderSpec | null>>;
  vAlign?: Change<'top' | 'center' | 'bottom'>;
}

/** Ordem dos w:tblStylePr no estilo (ST_TblStyleOverrideType, como o Word grava). */
const COND_ORDER = ['wholeTable', 'firstRow', 'lastRow', 'firstCol', 'lastCol', 'band1Vert', 'band2Vert', 'band1Horz', 'band2Horz', 'neCell', 'nwCell', 'seCell', 'swCell'];
const TSPR_ORDER = ['w:pPr', 'w:rPr', 'w:tblPr', 'w:trPr', 'w:tcPr'];
const TBLPR_ORDER = ['w:tblStyle', 'w:tblpPr', 'w:tblOverlap', 'w:bidiVisual', 'w:tblStyleRowBandSize', 'w:tblStyleColBandSize', 'w:tblW', 'w:jc', 'w:tblCellSpacing', 'w:tblInd', 'w:tblBorders', 'w:shd', 'w:tblLayout', 'w:tblCellMar', 'w:tblLook'];
const TCPR_ORDER = ['w:cnfStyle', 'w:tcW', 'w:gridSpan', 'w:hMerge', 'w:vMerge', 'w:tcBorders', 'w:shd', 'w:noWrap', 'w:tcMar', 'w:textDirection', 'w:tcFitText', 'w:vAlign', 'w:hideMark'];
const SIDES: TableStyleSide[] = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function el(raw: string | undefined, tag: string) {
  return raw ? splitElement(raw) : { open: `<${tag}>`, close: `</${tag}>`, kids: [] as ReturnType<typeof splitElement>['kids'] };
}
const join = (o: { open: string; close: string; kids: { raw: string }[] }): string => (o.kids.length ? o.open + o.kids.map((k) => k.raw).join('') + o.close : '');
const kid = (kids: { name: string; raw: string }[], n: string): string | undefined => kids.find((k) => k.name === n)?.raw;

/** Conjunto de bordas (tblBorders/tcBorders) com os lados pedidos trocados. */
function patchBorderSet(raw: string | undefined, tag: string, b: Partial<Record<TableStyleSide, BorderSpec | null>>): string {
  const o = el(raw, tag);
  for (const s of SIDES) {
    if (!(s in b)) continue;
    const spec = b[s];
    setKid(o.kids, SIDES.map((x) => `w:${x}`), `w:${s}`, spec ? borderXml(s, spec) : borderXml(s, { val: 'nil' }));
  }
  return join(o);
}

/** w:tcPr com preenchimento, bordas (tcBorders) e alinhamento vertical. */
function patchTcPr(raw: string | undefined, f: TableCondFormat, bordersHere: boolean): string {
  const o = el(raw, 'w:tcPr');
  if (bordersHere && f.borders && Object.keys(f.borders).length) setKid(o.kids, TCPR_ORDER, 'w:tcBorders', patchBorderSet(kid(o.kids, 'w:tcBorders'), 'w:tcBorders', f.borders) || null);
  if (f.fill !== undefined) setKid(o.kids, TCPR_ORDER, 'w:shd', f.fill === null ? null : `<w:shd w:val="clear" w:color="auto" w:fill="${esc(f.fill)}"/>`);
  if (f.vAlign !== undefined) setKid(o.kids, TCPR_ORDER, 'w:vAlign', f.vAlign === null || f.vAlign === 'top' ? null : `<w:vAlign w:val="${f.vAlign}"/>`);
  return join(o);
}

/** Aplica `f` aos filhos de um conjunto (o topo do estilo ou um tblStylePr). */
function patchParts(kids: ReturnType<typeof splitElement>['kids'], order: string[], f: TableCondFormat, whole: boolean): void {
  const set = (n: string, xml: string): void => setKid(kids, order, n, xml || null);
  const pf: StyleFormat = {};
  for (const k of ['alignment', 'spaceBeforeTwips', 'spaceAfterTwips', 'lineTwentieths', 'indentLeftTwips', 'indentRightTwips', 'indentFirstLineTwips'] as const) if (f[k] !== undefined) (pf as Record<string, unknown>)[k] = f[k];
  const rf: StyleFormat = {};
  for (const k of ['fontAscii', 'szHalfPt', 'bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps', 'color', 'charSpacingTwips'] as const) if (f[k] !== undefined) (rf as Record<string, unknown>)[k] = f[k];
  if (Object.keys(pf).length) set('w:pPr', patchStylePPr(kid(kids, 'w:pPr'), pf));
  if (Object.keys(rf).length) set('w:rPr', patchStyleRPr(kid(kids, 'w:rPr'), rf));
  if (whole && f.borders && Object.keys(f.borders).length) {
    const t = el(kid(kids, 'w:tblPr'), 'w:tblPr');
    setKid(t.kids, TBLPR_ORDER, 'w:tblBorders', patchBorderSet(kid(t.kids, 'w:tblBorders'), 'w:tblBorders', f.borders) || null);
    set('w:tblPr', join(t));
  }
  if (f.fill !== undefined || f.vAlign !== undefined || (!whole && f.borders && Object.keys(f.borders).length)) {
    set('w:tcPr', patchTcPr(kid(kids, 'w:tcPr'), f, !whole));
  }
}

/** Estilo de tabela com a condição `cond` formatada por `f` (só o que `f` traz muda). */
export function patchTableStyleXml(raw: string, cond: TableStyleCond, f: TableCondFormat): string {
  const o = splitElement(raw);
  if (cond === 'wholeTable') {
    patchParts(o.kids, STYLE_ORDER, f, true);
    return join(o) || raw;
  }
  const i = o.kids.findIndex((k) => k.name === 'w:tblStylePr' && k.el.attrs['w:type'] === cond);
  const cur = i >= 0 ? splitElement(o.kids[i]!.raw) : { open: `<w:tblStylePr w:type="${cond}">`, close: '</w:tblStylePr>', kids: [] as ReturnType<typeof splitElement>['kids'] };
  patchParts(cur.kids, TSPR_ORDER, f, false);
  const xml = cur.kids.length ? cur.open + cur.kids.map((k) => k.raw).join('') + cur.close : null;
  if (i >= 0) {
    if (xml === null) o.kids.splice(i, 1);
    else o.kids[i] = { name: 'w:tblStylePr', raw: xml, el: o.kids[i]!.el };
  } else if (xml !== null) {
    // na ordem do Word: depois dos tblStylePr de tipos anteriores
    const rank = COND_ORDER.indexOf(cond);
    let at = o.kids.length;
    for (let k = 0; k < o.kids.length; k++) {
      const kd = o.kids[k]!;
      if (kd.name === 'w:tblStylePr' && COND_ORDER.indexOf(kd.el.attrs['w:type'] ?? '') > rank) { at = k; break; }
    }
    o.kids.splice(at, 0, { name: 'w:tblStylePr', raw: xml, el: { name: 'w:tblStylePr', attrs: { 'w:type': cond }, children: [] } });
  }
  return o.open + o.kids.map((k) => k.raw).join('') + o.close;
}

/** Estilo de tabela novo (personalizado, baseado em outro). */
export function newTableStyleXml(o: { id: string; name: string; basedOn?: string }): string {
  return `<w:style w:type="table" w:customStyle="1" w:styleId="${esc(o.id)}"><w:name w:val="${esc(o.name)}"/>`
    + (o.basedOn ? `<w:basedOn w:val="${esc(o.basedOn)}"/>` : '')
    + '<w:uiPriority w:val="99"/></w:style>';
}

/** Troca o nome (w:name) e o estilo de base (w:basedOn) de um estilo de tabela. */
export function retitleTableStyleXml(raw: string, h: { name?: string; basedOn?: string | null }): string {
  const o = splitElement(raw);
  if (h.name !== undefined) setKid(o.kids, STYLE_ORDER, 'w:name', `<w:name w:val="${esc(h.name)}"/>`);
  if (h.basedOn !== undefined) setKid(o.kids, STYLE_ORDER, 'w:basedOn', h.basedOn ? `<w:basedOn w:val="${esc(h.basedOn)}"/>` : null);
  return o.open + o.kids.map((k) => k.raw).join('') + o.close;
}
