/**
 * Formatação condicional do BIFF8: CONDFMT (ranges) + CF (regra: valor da
 * célula com operador, ou fórmula; DXFN com fonte/borda/preenchimento) →
 * `<conditionalFormatting>` + `<dxf>` do styles.xml. As fórmulas saem pelo
 * mesmo descompilador das células (refs relativas ao canto do range).
 * CF12/CONDFMT12 (escalas de cor, barras de dados do Excel 2007+) ficam de fora.
 */
import type { Bytes } from './biff.js';
import type { XlsGlobals } from './globals.js';
import { decompile, type FormulaContext } from './formula.js';
import { icvColor } from './styles-xml.js';
import { rangeRef, xmlText } from './xmlw.js';

/** Regras de um CONDFMT com o sqref já em A1. */
export interface CondFormatOut { sqref: string; rules: string[] }

const OPERATORS = ['', 'between', 'notBetween', 'equal', 'notEqual', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'];
const BORDER = ['', 'thin', 'medium', 'dashed', 'dotted', 'thick', 'double', 'hair', 'mediumDashed', 'dashDot', 'mediumDashDot', 'dashDotDot', 'mediumDashDotDot', 'slantDashDot'];

/** CONDFMT: nº de CF, refBound e sqref (SqRefU). */
export function readCondFmt(r: Bytes): { count: number; sqref: string; top: number; left: number } {
  const count = r.u16(0);
  const n = r.u16(12);
  const refs: string[] = [];
  for (let i = 0, o = 14; i < n && o + 8 <= r.length; i++, o += 8) {
    const r1 = r.u16(o), r2 = r.u16(o + 2), c1 = r.u16(o + 4), c2 = r.u16(o + 6);
    if (r2 >= r1 && c2 >= c1) refs.push(rangeRef(r1, c1, r2, c2));
  }
  return { count, sqref: refs.join(' '), top: r.u16(4), left: r.u16(8) };
}

const hex = (c: string): string => `FF${c.replace('#', '').toUpperCase()}`;

/** DXFN → `<dxf>` (fonte, borda, preenchimento). */
function dxfXml(g: XlsGlobals, r: Bytes, off: number): { xml: string; end: number } {
  const fl = r.u32(off);
  const fl2 = r.u16(off + 4);
  let p = off + 6;
  let font = '', fill = '', border = '';
  if (fl & (1 << 25)) p += fl2 & 1 ? Math.max(2, r.u16(p)) : 2; // DXFNum (usuário ou ifmt)
  if (fl & (1 << 26)) {
    const ts = r.u32(p + 68), bls = r.u16(p + 72), icv = r.u32(p + 80);
    const tsNinch = r.u32(p + 88), blsNinch = r.u32(p + 100);
    if (!blsNinch && bls >= 600 && bls !== 0xffff) font += '<b/>';
    if (!(tsNinch & 2) && ts & 2) font += '<i/>';
    if (!(tsNinch & 0x80) && ts & 0x80) font += '<strike/>';
    if (icv !== 0xffffffff) { const c = icvColor(icv & 0xffff, g.palette, 'font'); if (c) font += `<color rgb="${hex(c)}"/>`; }
    p += 118;
  }
  if (fl & (1 << 27)) p += 8; // DXFALC
  if (fl & (1 << 28)) {
    const a = r.u32(p), b = r.u32(p + 4);
    const edge = (tag: string, dg: number, icv: number, ninch: boolean): string => {
      if (ninch || !dg || !BORDER[dg]) return '';
      const c = icvColor(icv, g.palette, 'border') ?? '#000000';
      return `<${tag} style="${BORDER[dg]}"><color rgb="${hex(c)}"/></${tag}>`;
    };
    border = edge('left', a & 0xf, (a >>> 16) & 0x7f, (fl & (1 << 10)) !== 0) + edge('right', (a >>> 4) & 0xf, (a >>> 23) & 0x7f, (fl & (1 << 11)) !== 0)
      + edge('top', (a >>> 8) & 0xf, b & 0x7f, (fl & (1 << 12)) !== 0) + edge('bottom', (a >>> 12) & 0xf, (b >>> 7) & 0x7f, (fl & (1 << 13)) !== 0);
    p += 8;
  }
  if (fl & (1 << 29)) {
    const v = r.u16(p + 2);
    const fg = v & 0x7f, bg = (v >>> 7) & 0x7f;
    // preenchimento sólido da regra: a cor visível é a de FUNDO (bgColor no dxf, como no .xlsx)
    const icv = !(fl & (1 << 18)) ? bg : !(fl & (1 << 17)) ? fg : undefined;
    const c = icv !== undefined ? icvColor(icv, g.palette, 'fg') : undefined;
    if (c) fill = `<fill><patternFill><bgColor rgb="${hex(c)}"/></patternFill></fill>`;
    p += 4;
  }
  if (fl & (1 << 30)) p += 2;
  return { xml: `<dxf>${font ? `<font>${font}</font>` : ''}${fill}${border ? `<border>${border}</border>` : ''}</dxf>`, end: p };
}

/** CF → `<cfRule>`; o dxf vai para `g`-wide `dxfs` (índice devolvido no dxfId). */
export function readCf(g: XlsGlobals, r: Bytes, dxfs: string[], ctx: FormulaContext, priority: number): string | undefined {
  const ct = r.u8(0), cp = r.u8(1);
  const cce1 = r.u16(2), cce2 = r.u16(4);
  const { xml, end } = dxfXml(g, r, 6);
  const f1 = cce1 ? decompile(r, end, cce1, ctx) : undefined;
  const f2 = cce2 ? decompile(r, end + cce1, cce2, ctx) : undefined;
  dxfs.push(xml);
  const dxfId = dxfs.length - 1;
  if (ct === 1) {
    const op = OPERATORS[cp];
    if (!op || f1 === undefined || ((cp === 1 || cp === 2) && f2 === undefined)) return undefined;
    return `<cfRule type="cellIs" dxfId="${dxfId}" priority="${priority}" operator="${op}"><formula>${xmlText(f1)}</formula>`
      + `${cp === 1 || cp === 2 ? `<formula>${xmlText(f2!)}</formula>` : ''}</cfRule>`;
  }
  if (ct === 2 && f1 !== undefined) {
    return `<cfRule type="expression" dxfId="${dxfId}" priority="${priority}"><formula>${xmlText(f1)}</formula></cfRule>`;
  }
  return undefined;
}
