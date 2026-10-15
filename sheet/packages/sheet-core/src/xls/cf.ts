/**
 * Formatação condicional do BIFF8 → `<conditionalFormatting>` + `<dxf>` do
 * styles.xml:
 *  - CONDFMT + CF (Excel 97): valor da célula com operador, ou fórmula; DXFN
 *    com fonte/borda/preenchimento;
 *  - CONDFMT12 + CF12 (Excel 2007+): escalas de cor, barras de dados,
 *    conjuntos de ícones, primeiros/últimos N, acima da média, valores
 *    únicos/duplicados — com prioridade própria e o DXFN12 (cores completas
 *    RGB/tema no XFExtNoFRT);
 *  - CFEX: prioridade, "parar se verdadeiro" e o DXFN12 de uma regra CF.
 * As fórmulas saem pelo mesmo descompilador das células (refs relativas ao
 * canto do range).
 */
import type { Bytes } from './biff.js';
import type { XlsGlobals } from './globals.js';
import { decompile, type FormulaContext } from './formula.js';
import { icvColor } from './styles-xml.js';
import { rangeRef, xmlText } from './xmlw.js';

/** Regra já convertida (o XML sai no fim, com a prioridade final). */
export interface CondRuleOut {
  type: string;
  /** Atributos além de type/dxfId/priority/stopIfTrue (com espaço inicial). */
  attrs: string;
  /** Filhos (`<formula>`, `<colorScale>`…). */
  body: string;
  dxfId?: number;
  priority: number;
  stopIfTrue?: boolean;
}

/** Regras de um CONDFMT/CONDFMT12 com o sqref já em A1. */
export interface CondFormatOut {
  sqref: string;
  rules: CondRuleOut[];
  /** nID do CONDFMT (o CFEX aponta por ele). */
  nid?: number;
  /** Regras na ordem dos registros CF (índice icf do CFEX; undefined = não convertida). */
  byIcf?: (CondRuleOut | undefined)[];
}

/** `<cfRule>` de uma regra convertida. */
export function ruleXml(r: CondRuleOut): string {
  return `<cfRule type="${r.type}"${r.dxfId !== undefined ? ` dxfId="${r.dxfId}"` : ''} priority="${r.priority}"`
    + `${r.stopIfTrue ? ' stopIfTrue="1"' : ''}${r.attrs}>${r.body}</cfRule>`;
}

const OPERATORS = ['', 'between', 'notBetween', 'equal', 'notEqual', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'];
const BORDER = ['', 'thin', 'medium', 'dashed', 'dotted', 'thick', 'double', 'hair', 'mediumDashed', 'dashDot', 'mediumDashDot', 'dashDotDot', 'mediumDashDotDot', 'slantDashDot'];

/**
 * CONDFMT (off 0) / CONDFMT12 (off 12, depois do FrtRefHeaderU): nº de CF,
 * nID (15 bits depois de fToughRecalc), refBound e sqref (SqRefU).
 */
export function readCondFmt(r: Bytes, off = 0): { count: number; nid: number; sqref: string; top: number; left: number } {
  const count = r.u16(off);
  const nid = r.u16(off + 2) >>> 1;
  const n = r.u16(off + 12);
  const refs: string[] = [];
  for (let i = 0, o = off + 14; i < n && o + 8 <= r.length; i++, o += 8) {
    const r1 = r.u16(o), r2 = r.u16(o + 2), c1 = r.u16(o + 4), c2 = r.u16(o + 6);
    if (r2 >= r1 && c2 >= c1) refs.push(rangeRef(r1, c1, r2, c2));
  }
  return { count, nid, sqref: refs.join(' '), top: r.u16(off + 4), left: r.u16(off + 8) };
}

const hex = (c: string): string => `FF${c.replace('#', '').toUpperCase()}`;
const hex2 = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();

/** Cores completas do XFExtNoFRT do DXFN12: extType → `<tag …/>`. */
function xfExtColors(r: Bytes, off: number, end: number): Map<number, (tag: string) => string> {
  const out = new Map<number, (tag: string) => string>();
  // reserved1, reserved2 (0xFFFF), reserved3, cexts, rgExt (ExtProp: extType u16, cb u16, dados)
  if (off + 8 > end) return out;
  const n = r.u16(off + 6);
  let p = off + 8;
  for (let i = 0; i < n && p + 4 <= end; i++) {
    const type = r.u16(p), cb = r.u16(p + 2);
    if (cb < 4) break;
    if (((type >= 4 && type <= 5) || (type >= 7 && type <= 11) || type === 13) && p + 12 <= end) {
      // FullColorExt: xclrType u16, nTintShade i16, xclrValue u32
      const ct = r.u16(p + 4), tint = r.i16(p + 6) / 32767, v = r.u32(p + 8);
      const t = tint ? ` tint="${+tint.toFixed(6)}"` : '';
      if (ct === 2) out.set(type, (tag) => `<${tag} rgb="FF${hex2(v & 0xff)}${hex2((v >>> 8) & 0xff)}${hex2((v >>> 16) & 0xff)}"${t}/>`);
      else if (ct === 3) out.set(type, (tag) => `<${tag} theme="${v}"${t}/>`);
    }
    p += cb;
  }
  return out;
}

/** DXFN (+ XFExtNoFRT até `extEnd`, se houver) → `<dxf>` (fonte, borda, preenchimento). */
function dxfXml(g: XlsGlobals, r: Bytes, off: number, extEnd?: number): { xml: string; end: number } {
  const fl = r.u32(off);
  const fl2 = r.u16(off + 4);
  let p = off + 6;
  let fontColor: string | undefined, fillIcv: number | undefined;
  let font = '', border = '';
  if (fl & (1 << 25)) p += fl2 & 1 ? Math.max(2, r.u16(p)) : 2; // DXFNum (usuário ou ifmt)
  if (fl & (1 << 26)) {
    const ts = r.u32(p + 68), bls = r.u16(p + 72), icv = r.u32(p + 80);
    const tsNinch = r.u32(p + 88), blsNinch = r.u32(p + 100);
    if (!blsNinch && bls >= 600 && bls !== 0xffff) font += '<b/>';
    if (!(tsNinch & 2) && ts & 2) font += '<i/>';
    if (!(tsNinch & 0x80) && ts & 0x80) font += '<strike/>';
    if (icv !== 0xffffffff) { const c = icvColor(icv & 0xffff, g.palette, 'font'); if (c) fontColor = `<color rgb="${hex(c)}"/>`; }
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
  let hasFill = false;
  if (fl & (1 << 29)) {
    const v = r.u16(p + 2);
    const fg = v & 0x7f, bg = (v >>> 7) & 0x7f;
    // preenchimento sólido da regra: a cor visível é a de FUNDO (bgColor no dxf, como no .xlsx)
    fillIcv = !(fl & (1 << 18)) ? bg : !(fl & (1 << 17)) ? fg : undefined;
    hasFill = fillIcv !== undefined;
    p += 4;
  }
  if (fl & (1 << 30)) p += 2;
  // Excel 2007+: cores completas (RGB/tema) no XFExtNoFRT depois do DXFN
  const ext = extEnd !== undefined && extEnd > p ? xfExtColors(r, p, extEnd) : new Map<number, (tag: string) => string>();
  const fc = ext.get(13);
  if (fc && font !== undefined) fontColor = fc('color');
  let fill = '';
  const xfill = ext.get(5) ?? ext.get(4);
  if (hasFill && xfill) fill = `<fill><patternFill>${xfill('bgColor')}</patternFill></fill>`;
  else if (hasFill) { const c = icvColor(fillIcv!, g.palette, 'fg'); if (c) fill = `<fill><patternFill><bgColor rgb="${hex(c)}"/></patternFill></fill>`; }
  if (fontColor) font += fontColor;
  return { xml: `<dxf>${font ? `<font>${font}</font>` : ''}${fill}${border ? `<border>${border}</border>` : ''}</dxf>`, end: extEnd !== undefined ? Math.max(p, extEnd) : p };
}

/** DXFN12 em `off` (cbDxf u32; 0 = 2 bytes reservados) → dxfId (ou undefined) e o fim. */
function dxfn12(g: XlsGlobals, r: Bytes, off: number, dxfs: string[]): { dxfId?: number; end: number } {
  const cb = r.u32(off);
  if (!cb) return { end: off + 6 };
  const { xml } = dxfXml(g, r, off + 4, off + 4 + cb);
  dxfs.push(xml);
  return { dxfId: dxfs.length - 1, end: off + 4 + cb };
}

/** CF → regra (`cellIs` ou `expression`); o dxf vai para os `dxfs` da pasta. */
export function readCf(g: XlsGlobals, r: Bytes, dxfs: string[], ctx: FormulaContext, priority: number): CondRuleOut | undefined {
  const ct = r.u8(0), cp = r.u8(1);
  const cce1 = r.u16(2), cce2 = r.u16(4);
  const { xml, end } = dxfXml(g, r, 6);
  const f1 = cce1 ? decompile(r, end, cce1, ctx) : undefined;
  const f2 = cce2 ? decompile(r, end + cce1, cce2, ctx) : undefined;
  dxfs.push(xml);
  return basicRule(ct, cp, f1, f2, dxfs.length - 1, priority);
}

function basicRule(ct: number, cp: number, f1: string | undefined, f2: string | undefined, dxfId: number | undefined, priority: number): CondRuleOut | undefined {
  if (ct === 1) {
    const op = OPERATORS[cp];
    if (!op || f1 === undefined || ((cp === 1 || cp === 2) && f2 === undefined)) return undefined;
    return {
      type: 'cellIs', attrs: ` operator="${op}"`, dxfId, priority,
      body: `<formula>${xmlText(f1)}</formula>${cp === 1 || cp === 2 ? `<formula>${xmlText(f2!)}</formula>` : ''}`,
    };
  }
  if (ct === 2 && f1 !== undefined) return { type: 'expression', attrs: '', body: `<formula>${xmlText(f1)}</formula>`, dxfId, priority };
  return undefined;
}

/** Regra pelo modelo (icfTemplate) quando ele define o tipo OOXML: média, únicos/duplicados. */
function templateRule(tpl: number, r: Bytes, parm: number, dxfId: number | undefined, priority: number): CondRuleOut | undefined {
  if (tpl === 0x07) return { type: 'uniqueValues', attrs: '', body: '', dxfId, priority };
  if (tpl === 0x1b) return { type: 'duplicateValues', attrs: '', body: '', dxfId, priority };
  if (tpl === 0x19 || tpl === 0x1a || tpl === 0x1d || tpl === 0x1e) {
    // CFExAveragesTemplateParams: iParam u16 = nº de desvios-padrão
    const sd = r.u16(parm);
    const below = tpl === 0x1a || tpl === 0x1e, eq = tpl === 0x1d || tpl === 0x1e;
    return { type: 'aboveAverage', attrs: `${below ? ' aboveAverage="0"' : ''}${eq ? ' equalAverage="1"' : ''}${sd ? ` stdDev="${sd}"` : ''}`, body: '', dxfId, priority };
  }
  return undefined;
}

const ICON_SETS = ['3Arrows', '3ArrowsGray', '3Flags', '3TrafficLights1', '3TrafficLights2', '3Signs', '3Symbols', '3Symbols2',
  '4Arrows', '4ArrowsGray', '4RedToBlack', '4Rating', '4TrafficLights', '5Arrows', '5ArrowsGray', '5Rating', '5Quarters'];
const CFVO_TYPES: Record<number, string> = { 1: 'num', 2: 'min', 3: 'max', 4: 'percent', 5: 'percentile', 7: 'formula' };

/** CFVO em `off` → `<cfvo>` sem fechar (para gte) e o fim. */
function cfvo(r: Bytes, off: number, ctx: FormulaContext): { attrs: string; end: number } {
  const t = r.u8(off);
  const cce = r.u16(off + 1);
  let p = off + 3;
  let val: string | undefined;
  if (cce) { val = decompile(r, p, cce, ctx); p += cce; }
  else if (t !== 2 && t !== 3) { val = String(+r.f64(p).toPrecision(15)); p += 8; }
  const type = CFVO_TYPES[t] ?? 'num';
  return { attrs: `type="${type}"${val !== undefined && type !== 'min' && type !== 'max' ? ` val="${xmlText(val)}"` : ''}`, end: p };
}

/** CFColor (16 bytes: xclrType u32, xclrValue u32, numTint Xnum) → `<color …/>`. */
function cfColor(g: XlsGlobals, r: Bytes, off: number): string {
  const t = r.u32(off), v = r.u32(off + 4), tint = r.f64(off + 8);
  const ta = tint ? ` tint="${+tint.toFixed(6)}"` : '';
  if (t === 2) return `<color rgb="FF${hex2(v & 0xff)}${hex2((v >>> 8) & 0xff)}${hex2((v >>> 16) & 0xff)}"${ta}/>`;
  if (t === 3) return `<color theme="${v}"${ta}/>`;
  if (t === 1) { const c = icvColor(v & 0xffff, g.palette, 'fg'); if (c) return `<color rgb="${hex(c)}"${ta}/>`; }
  return '<color rgb="FF000000"/>';
}

/**
 * CF12 (Excel 2007+) → regra. Layout ([MS-XLS] 2.4.43): FrtRefHeader (12), ct,
 * cp, cce1, cce2, DXFN12, rgce1, rgce2, fmlaActive (cce + rgce), flags
 * (bit 1 fStopIfTrue), ipriority, icfTemplate, cbTemplateParm (16) +
 * rgbTemplateParms, rgbCT (CFGradient/CFDatabar/CFFilter/CFMultistate).
 */
export function readCf12(g: XlsGlobals, r: Bytes, dxfs: string[], ctx: FormulaContext): CondRuleOut | undefined {
  const ct = r.u8(12), cp = r.u8(13);
  const cce1 = r.u16(14), cce2 = r.u16(16);
  const d = dxfn12(g, r, 18, dxfs);
  let p = d.end;
  const f1 = cce1 ? decompile(r, p, cce1, ctx) : undefined;
  p += cce1;
  const f2 = cce2 ? decompile(r, p, cce2, ctx) : undefined;
  p += cce2;
  p += 2 + r.u16(p); // fmlaActive
  const stop = (r.u8(p) & 2) !== 0;
  const priority = r.u16(p + 1);
  const tpl = r.u16(p + 3);
  const parm = p + 6;
  p = parm + r.u8(p + 5);
  let rule: CondRuleOut | undefined;
  switch (ct) {
    case 1: case 2:
      rule = templateRule(tpl, r, parm, d.dxfId, priority) ?? basicRule(ct, cp, f1, f2, d.dxfId, priority);
      break;
    case 3: { // CFGradient: unused (2), reserved (1), cInterpCurve, cGradientCurve, flags, rgInterp, rgCurve
      const n = r.u8(p + 3), m = r.u8(p + 4);
      let q = p + 6;
      let cfvos = '';
      for (let i = 0; i < n; i++) { const c = cfvo(r, q, ctx); cfvos += `<cfvo ${c.attrs}/>`; q = c.end + 8; } // + numDomain
      let colors = '';
      for (let i = 0; i < m; i++) { colors += cfColor(g, r, q + 8); q += 24; } // numGrange + CFColor
      if (n >= 2 && n === m) rule = { type: 'colorScale', attrs: '', body: `<colorScale>${cfvos}${colors}</colorScale>`, priority };
      break;
    }
    case 4: { // CFDatabar: unused (2), reserved (1), flags, iPercentMin, iPercentMax, CFColor, cfvo ×2
      // flags: o Excel grava 0 nas barras que MOSTRAM o valor (oráculo, poi-NewStyleConditionalFormattings) —
      // bit 0 = só a barra, como no POI (a [MS-XLS] diz fRightToLeft/fShowValue)
      const fl = r.u8(p + 3);
      const min = r.u8(p + 4), max = r.u8(p + 5);
      const color = cfColor(g, r, p + 6);
      const c1 = cfvo(r, p + 22, ctx), c2 = cfvo(r, c1.end, ctx);
      const attrs = `${min !== 10 ? ` minLength="${min}"` : ''}${max !== 90 ? ` maxLength="${max}"` : ''}${fl & 1 ? ' showValue="0"' : ''}`;
      rule = { type: 'dataBar', attrs: '', body: `<dataBar${attrs}><cfvo ${c1.attrs}/><cfvo ${c2.attrs}/>${color}</dataBar>`, priority };
      break;
    }
    case 5: { // CFFilter: cbFilter u16, reserved u8, flags (fTop, fPercent), iParam u16
      const fl = r.u8(p + 3), rank = r.u16(p + 4);
      rule = { type: 'top10', attrs: `${fl & 2 ? ' percent="1"' : ''}${fl & 1 ? '' : ' bottom="1"'} rank="${rank}"`, body: '', dxfId: d.dxfId, priority };
      break;
    }
    case 6: { // CFMultistate: unused (2), reserved (1), cStates, iIconSet, flags (fIconOnly, -, fReverse), rgStates
      const n = r.u8(p + 3), set = ICON_SETS[r.u8(p + 4)];
      const fl = r.u8(p + 5);
      if (!set) break;
      let q = p + 6;
      let cfvos = '';
      for (let i = 0; i < n; i++) {
        const c = cfvo(r, q, ctx);
        const eq = r.u8(c.end);
        cfvos += `<cfvo ${c.attrs}${eq ? '' : ' gte="0"'}/>`;
        q = c.end + 5;
      }
      rule = { type: 'iconSet', attrs: '', body: `<iconSet iconSet="${set}"${fl & 1 ? ' showValue="0"' : ''}${fl & 4 ? ' reverse="1"' : ''}>${cfvos}</iconSet>`, priority };
      break;
    }
  }
  if (rule && stop) rule.stopIfTrue = true;
  return rule;
}

/**
 * CFEX (fIsCF12 = 0): estende a regra `icf` do CONDFMT `nID` — prioridade,
 * parar-se-verdadeiro, o DXFN12 (cores completas) e o modelo (média,
 * únicos/duplicados viram o tipo OOXML próprio).
 */
export function applyCfEx(g: XlsGlobals, r: Bytes, dxfs: string[], byNid: Map<number, CondFormatOut>): void {
  if (r.u32(12) !== 0) return; // estende um CF12 (que traz tudo)
  const cf = byNid.get(r.u16(16));
  const icf = r.u16(18);
  const rule = cf?.byIcf?.[icf];
  if (!rule) return;
  const tpl = r.u8(21);
  rule.priority = r.u16(22);
  const fl = r.u8(24);
  if (!(fl & 1)) { rule.type = ''; return; } // fActive = 0: regra desligada
  if (fl & 2) rule.stopIfTrue = true;
  let p = 26;
  if (r.u8(25)) { const d = dxfn12(g, r, p, dxfs); if (d.dxfId !== undefined) rule.dxfId = d.dxfId; p = d.end; }
  const t = templateRule(tpl, r, p + 1, rule.dxfId, rule.priority);
  if (t) Object.assign(rule, { type: t.type, attrs: t.attrs, body: t.body });
}
