/**
 * XML das propriedades de TABELA a partir das props tipadas (`TblPr`, `TrPr`,
 * `TcPr`) — na ordem do schema e com os atributos na ordem em que o Word
 * grava (medido em tools/table-lab) — e o patch CIRÚRGICO do XML original:
 * só os filhos cujo valor tipado mudou são regenerados; o resto (w14:*,
 * revisões, o que o modelo não representa) fica byte a byte.
 */
import { parseXml } from './xml.js';
import { splitElement } from './lossless.js';
import type { PageBorders } from './document.js';
import {
  readTblPr, readTrPr, readTcPr,
  type TblPr, type TrPr, type TcPr, type BorderSpec, type ShadingSpec, type WidthSpec,
  type CellMargins, type TblLook, type TblpPr, type TcBorders,
} from './ooxml/props.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (pairs: [string, string | number | undefined][]): string =>
  pairs.filter(([, v]) => v !== undefined).map(([k, v]) => ` w:${k}="${esc(String(v))}"`).join('');

/** CT_TblPr */
const TBLPR_ORDER = [
  'w:tblStyle', 'w:tblpPr', 'w:tblOverlap', 'w:bidiVisual', 'w:tblStyleRowBandSize', 'w:tblStyleColBandSize',
  'w:tblW', 'w:jc', 'w:tblCellSpacing', 'w:tblInd', 'w:tblBorders', 'w:shd', 'w:tblLayout', 'w:tblCellMar',
  'w:tblLook', 'w:tblCaption', 'w:tblDescription', 'w:tblPrChange',
];
/** CT_TblPrEx */
const TBLPREX_ORDER = [
  'w:tblW', 'w:jc', 'w:tblCellSpacing', 'w:tblInd', 'w:tblBorders', 'w:shd', 'w:tblLayout', 'w:tblCellMar',
  'w:tblLook', 'w:tblPrExChange',
];
/** CT_TrPr (a ordem em que o Word grava) */
const TRPR_ORDER = [
  'w:cnfStyle', 'w:divId', 'w:gridBefore', 'w:gridAfter', 'w:wBefore', 'w:wAfter', 'w:cantSplit', 'w:trHeight',
  'w:tblHeader', 'w:tblCellSpacing', 'w:jc', 'w:hidden', 'w:ins', 'w:del', 'w:trPrChange',
];
/** CT_TcPr */
const TCPR_ORDER = [
  'w:cnfStyle', 'w:tcW', 'w:gridSpan', 'w:hMerge', 'w:vMerge', 'w:tcBorders', 'w:shd', 'w:noWrap', 'w:tcMar',
  'w:textDirection', 'w:tcFitText', 'w:vAlign', 'w:hideMark', 'w:headers', 'w:cellIns', 'w:cellDel', 'w:cellMerge',
  'w:tcPrChange',
];

// ───────────────────────── elementos ─────────────────────────

export function borderXml(tag: string, b: BorderSpec): string {
  return `<w:${tag}${attrs([
    ['val', b.val], ['sz', b.sz], ['space', b.space ?? (b.val === 'nil' ? undefined : 0)],
    ['color', b.color ?? (b.val === 'nil' ? undefined : 'auto')],
    ['themeColor', b.themeColor], ['themeTint', b.themeTint], ['themeShade', b.themeShade],
    ['shadow', b.shadow === undefined ? undefined : b.shadow ? 1 : 0], ['frame', b.frame === undefined ? undefined : b.frame ? 1 : 0],
  ])}/>`;
}

/** w:pgBorders como o Word grava (atributos zOrder, display, offsetFrom; lados top, left, bottom, right); null = nenhuma. */
export function pgBordersXml(pb: PageBorders | null | undefined): string | null {
  if (!pb) return null;
  const inner = (['top', 'left', 'bottom', 'right'] as const).map((s) => (pb[s] ? borderXml(s, pb[s]!) : '')).join('');
  if (!inner) return null;
  return `<w:pgBorders${attrs([['zOrder', pb.zOrder], ['display', pb.display], ['offsetFrom', pb.offsetFrom]])}>${inner}</w:pgBorders>`;
}

const SIDES = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV', 'tl2br', 'tr2bl'] as const;

export function bordersXml(tag: string, b: TcBorders): string {
  const inner = SIDES.map((s) => (b[s] ? borderXml(s, b[s]!) : '')).join('');
  return inner ? `<w:${tag}>${inner}</w:${tag}>` : '';
}

export function shdXml(s: ShadingSpec): string {
  return `<w:shd${attrs([
    ['val', s.val ?? 'clear'], ['color', s.color ?? 'auto'], ['themeColor', s.themeColor],
    ['fill', s.fill], ['themeFill', s.themeFill], ['themeFillTint', s.themeFillTint], ['themeFillShade', s.themeFillShade],
  ])}/>`;
}

const widthXml = (tag: string, w: WidthSpec): string => `<w:${tag}${attrs([['w', w.w], ['type', w.type]])}/>`;

function marXml(tag: string, m: CellMargins): string {
  const inner = (['top', 'left', 'bottom', 'right'] as const).map((k) => (m[k] ? widthXml(k, m[k]!) : '')).join('');
  return inner ? `<w:${tag}>${inner}</w:${tag}>` : '';
}

/** w:tblLook: o Word grava o hexadecimal legado E os atributos. */
export function lookXml(l: TblLook): string {
  const bits = (l.firstRow ? 0x20 : 0) | (l.lastRow ? 0x40 : 0) | (l.firstColumn ? 0x80 : 0)
    | (l.lastColumn ? 0x100 : 0) | (l.noHBand ? 0x200 : 0) | (l.noVBand ? 0x400 : 0);
  const b = (v: boolean | undefined): number => (v ? 1 : 0);
  return `<w:tblLook w:val="${bits.toString(16).toUpperCase().padStart(4, '0')}" w:firstRow="${b(l.firstRow)}" w:lastRow="${b(l.lastRow)}"`
    + ` w:firstColumn="${b(l.firstColumn)}" w:lastColumn="${b(l.lastColumn)}" w:noHBand="${b(l.noHBand)}" w:noVBand="${b(l.noVBand)}"/>`;
}

function tblpPrXml(p: TblpPr): string {
  return `<w:tblpPr${attrs([
    ['leftFromText', p.leftFromText], ['rightFromText', p.rightFromText], ['topFromText', p.topFromText],
    ['bottomFromText', p.bottomFromText], ['vertAnchor', p.vertAnchor], ['horzAnchor', p.horzAnchor],
    ['tblpXSpec', p.tblpXSpec], ['tblpX', p.tblpX], ['tblpYSpec', p.tblpYSpec], ['tblpY', p.tblpY],
  ])}/>`;
}

const onOff = (tag: string, v: boolean): string => (v ? `<w:${tag}/>` : `<w:${tag} w:val="0"/>`);
const val = (tag: string, v: string | number): string => `<w:${tag} w:val="${esc(String(v))}"/>`;

type Gen<T> = { [K in keyof T]-?: [string, (v: NonNullable<T[K]>) => string] };

const TBLPR_GEN: Gen<TblPr> = {
  tblStyle: ['w:tblStyle', (v) => val('tblStyle', v)],
  tblpPr: ['w:tblpPr', tblpPrXml],
  tblOverlap: ['w:tblOverlap', (v) => val('tblOverlap', v)],
  bidiVisual: ['w:bidiVisual', (v) => onOff('bidiVisual', v)],
  tblStyleRowBandSize: ['w:tblStyleRowBandSize', (v) => val('tblStyleRowBandSize', v)],
  tblStyleColBandSize: ['w:tblStyleColBandSize', (v) => val('tblStyleColBandSize', v)],
  tblW: ['w:tblW', (v) => widthXml('tblW', v)],
  jc: ['w:jc', (v) => val('jc', v)],
  tblCellSpacing: ['w:tblCellSpacing', (v) => widthXml('tblCellSpacing', v)],
  tblInd: ['w:tblInd', (v) => widthXml('tblInd', v)],
  tblBorders: ['w:tblBorders', (v) => bordersXml('tblBorders', v)],
  shd: ['w:shd', shdXml],
  tblLayout: ['w:tblLayout', (v) => `<w:tblLayout w:type="${v}"/>`],
  tblCellMar: ['w:tblCellMar', (v) => marXml('tblCellMar', v)],
  tblLook: ['w:tblLook', lookXml],
  tblCaption: ['w:tblCaption', (v) => val('tblCaption', v)],
  tblDescription: ['w:tblDescription', (v) => val('tblDescription', v)],
};

const TRPR_GEN: Gen<TrPr> = {
  cnfStyle: ['w:cnfStyle', (v) => val('cnfStyle', v)],
  gridBefore: ['w:gridBefore', (v) => val('gridBefore', v)],
  gridAfter: ['w:gridAfter', (v) => val('gridAfter', v)],
  wBefore: ['w:wBefore', (v) => widthXml('wBefore', v)],
  wAfter: ['w:wAfter', (v) => widthXml('wAfter', v)],
  cantSplit: ['w:cantSplit', (v) => onOff('cantSplit', v)],
  // o Word grava hRule ANTES de val; "atLeast" é o padrão (sem hRule)
  trHeight: ['w:trHeight', (v) => `<w:trHeight${v.hRule === 'atLeast' ? '' : ` w:hRule="${v.hRule}"`} w:val="${v.val}"/>`],
  tblHeader: ['w:tblHeader', (v) => onOff('tblHeader', v)],
  tblCellSpacing: ['w:tblCellSpacing', (v) => widthXml('tblCellSpacing', v)],
  jc: ['w:jc', (v) => val('jc', v)],
  hidden: ['w:hidden', (v) => onOff('hidden', v)],
};

const TCPR_GEN: Gen<TcPr> = {
  cnfStyle: ['w:cnfStyle', (v) => val('cnfStyle', v)],
  tcW: ['w:tcW', (v) => widthXml('tcW', v)],
  gridSpan: ['w:gridSpan', (v) => val('gridSpan', v)],
  hMerge: ['w:hMerge', (v) => (v === 'restart' ? val('hMerge', 'restart') : '<w:hMerge/>')],
  vMerge: ['w:vMerge', (v) => (v === 'restart' ? val('vMerge', 'restart') : '<w:vMerge/>')],
  tcBorders: ['w:tcBorders', (v) => bordersXml('tcBorders', v)],
  shd: ['w:shd', shdXml],
  noWrap: ['w:noWrap', (v) => onOff('noWrap', v)],
  tcMar: ['w:tcMar', (v) => marXml('tcMar', v)],
  textDirection: ['w:textDirection', (v) => val('textDirection', v)],
  tcFitText: ['w:tcFitText', (v) => onOff('tcFitText', v)],
  vAlign: ['w:vAlign', (v) => val('vAlign', v)],
  hideMark: ['w:hideMark', (v) => onOff('hideMark', v)],
};

/** Campos do TblPr que valem em w:tblPrEx. */
const EX_KEYS = new Set(['tblW', 'jc', 'tblCellSpacing', 'tblInd', 'tblBorders', 'shd', 'tblLayout', 'tblCellMar', 'tblLook']);

function genAll<T extends object>(p: T, gen: Gen<T>, order: string[], only?: Set<string>): string {
  const parts: [number, string][] = [];
  for (const k of Object.keys(gen) as (keyof T)[]) {
    if (only && !only.has(k as string)) continue;
    const v = p[k];
    if (v === undefined || v === null) continue;
    const [name, f] = gen[k];
    parts.push([order.indexOf(name), (f as (x: unknown) => string)(v)]);
  }
  return parts.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
}

export const tblPrXml = (p: TblPr): string => `<w:tblPr>${genAll(p, TBLPR_GEN, TBLPR_ORDER)}</w:tblPr>`;
export const tblPrExXml = (p: TblPr): string => {
  const inner = genAll(p, TBLPR_GEN, TBLPREX_ORDER, EX_KEYS);
  return inner ? `<w:tblPrEx>${inner}</w:tblPrEx>` : '';
};
export const trPrXml = (p: TrPr): string => {
  const inner = genAll(p, TRPR_GEN, TRPR_ORDER);
  return inner ? `<w:trPr>${inner}</w:trPr>` : '';
};
export const tcPrXml = (p: TcPr): string => `<w:tcPr>${genAll(p, TCPR_GEN, TCPR_ORDER)}</w:tcPr>`;

// ───────────────────────── patch do XML original ─────────────────────────

/** Igualdade estrutural (ordem de chaves e campos undefined não importam). */
export function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

interface Kid { name: string; raw: string }

function setKid(kids: Kid[], order: string[], name: string, xml: string | null): void {
  const at = kids.findIndex((k) => k.name === name);
  for (let i = kids.length - 1; i >= 0; i--) if (kids[i]!.name === name && i !== at) kids.splice(i, 1);
  if (at >= 0) {
    if (xml === null || xml === '') kids.splice(at, 1);
    else kids[at] = { name, raw: xml };
    return;
  }
  if (xml === null || xml === '') return;
  const rank = order.indexOf(name);
  let pos = kids.length;
  for (let i = 0; i < kids.length; i++) {
    const r = order.indexOf(kids[i]!.name);
    if (r > rank) { pos = i; break; }
  }
  kids.splice(pos, 0, { name, raw: xml });
}

function patch<T extends object>(
  raw: string, cur: T | undefined, read: (el: ReturnType<typeof parseXml>) => T | undefined,
  gen: Gen<T>, order: string[], keys?: Set<string>, emptyOk = false,
): string {
  const { open, close, kids: k0, el } = splitElement(raw);
  const base = (read(el) ?? {}) as T;
  const now = (cur ?? {}) as T;
  const kids: Kid[] = k0.map((k) => ({ name: k.name, raw: k.raw }));
  let changed = false;
  for (const k of Object.keys(gen) as (keyof T)[]) {
    if (keys && !keys.has(k as string)) continue;
    if (deepEq(base[k], now[k])) continue;
    changed = true;
    const [name, f] = gen[k];
    const v = now[k];
    setKid(kids, order, name, v === undefined || v === null ? null : (f as (x: unknown) => string)(v));
  }
  if (!changed) return raw;
  if (!kids.length && !emptyOk) return '';
  return open + kids.map((x) => x.raw).join('') + close;
}

/** w:tblPr original com as diferenças do TblPr atual. */
export const patchTblPr = (raw: string, cur: TblPr | undefined): string =>
  patch(raw, cur, readTblPr, TBLPR_GEN, TBLPR_ORDER, undefined, true);
export const patchTblPrEx = (raw: string, cur: TblPr | undefined): string =>
  patch(raw, cur, readTblPr, TBLPR_GEN, TBLPREX_ORDER, EX_KEYS);
export const patchTrPr = (raw: string, cur: TrPr | undefined): string =>
  patch(raw, cur, readTrPr, TRPR_GEN, TRPR_ORDER);
export const patchTcPr = (raw: string, cur: TcPr | undefined): string =>
  patch(raw, cur, readTcPr, TCPR_GEN, TCPR_ORDER, undefined, true);
