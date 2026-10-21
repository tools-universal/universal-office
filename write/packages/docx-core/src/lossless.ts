/**
 * Edição cirúrgica de w:rPr / w:pPr / w:sectPr CRUS: aplica ao XML original
 * só as diferenças entre as props de edição atuais e as que o próprio XML
 * implica — a mesma regra de directRPr/directPPr (docx-layout/src/context.ts),
 * para que o arquivo salvo diga o mesmo que o canvas mostra. O resto do
 * elemento (estilo de caractere, fontes e cores de tema, w14:*, rPrChange…)
 * fica byte a byte, na ordem do schema.
 */
import { parseXml, childElements, type XmlElement } from './xml.js';
import { readRPr, readPPr, type RPr, type PPr } from './ooxml/props.js';
import {
  editBaseProps, paraPropsFromPPr, readSectPr,
  type Run, type Paragraph, type RunProps, type ParaProps, type SectPr,
} from './document.js';
import { pgBordersXml } from './table-xml.js';
import { paraFormatting, runFormatting } from './revisions.js';
import { markRevisionXml, revisionAttrs } from './rev-xml.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** CT_RPr */
const RPR_ORDER = [
  'w:rStyle', 'w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:caps', 'w:smallCaps', 'w:strike', 'w:dstrike',
  'w:outline', 'w:shadow', 'w:emboss', 'w:imprint', 'w:noProof', 'w:snapToGrid', 'w:vanish', 'w:webHidden',
  'w:color', 'w:spacing', 'w:w', 'w:kern', 'w:position', 'w:sz', 'w:szCs', 'w:highlight', 'w:u', 'w:effect',
  'w:bdr', 'w:shd', 'w:fitText', 'w:vertAlign', 'w:rtl', 'w:cs', 'w:em', 'w:lang', 'w:eastAsianLayout',
  'w:specVanish', 'w:oMath', 'w:rPrChange',
];

/** CT_PPr */
const PPR_ORDER = [
  'w:pStyle', 'w:keepNext', 'w:keepLines', 'w:pageBreakBefore', 'w:framePr', 'w:widowControl', 'w:numPr',
  'w:suppressLineNumbers', 'w:pBdr', 'w:shd', 'w:tabs', 'w:suppressAutoHyphens', 'w:kinsoku', 'w:wordWrap',
  'w:overflowPunct', 'w:topLinePunct', 'w:autoSpaceDE', 'w:autoSpaceDN', 'w:bidi', 'w:adjustRightInd',
  'w:snapToGrid', 'w:spacing', 'w:ind', 'w:contextualSpacing', 'w:mirrorIndents', 'w:suppressOverlap', 'w:jc',
  'w:textDirection', 'w:textAlignment', 'w:textboxTightWrap', 'w:outlineLvl', 'w:divId', 'w:cnfStyle', 'w:rPr',
  'w:sectPr', 'w:pPrChange',
];

/** CT_SectPr (as referências de cabeçalho/rodapé vêm antes de tudo). */
const SECT_ORDER = [
  'w:headerReference', 'w:footerReference', 'w:footnotePr', 'w:endnotePr', 'w:type', 'w:pgSz', 'w:pgMar',
  'w:paperSrc', 'w:pgBorders', 'w:lnNumType', 'w:pgNumType', 'w:cols', 'w:formProt', 'w:vAlign', 'w:noEndnote',
  'w:titlePg', 'w:textDirection', 'w:bidi', 'w:rtlGutter', 'w:docGrid', 'w:printerSettings', 'w:sectPrChange',
];

export interface Kid { name: string; raw: string; el: XmlElement }

/** Elemento cru → tag de abertura, filhos crus e fechamento. */
export function splitElement(raw: string): { open: string; close: string; kids: Kid[]; el: XmlElement } {
  const el = parseXml(raw, { positions: true });
  if (el.cs === el.e) {
    const open = raw.replace(/\s*\/>\s*$/, '>');
    return { open, close: `</${el.name}>`, kids: [], el };
  }
  const kids = childElements(el).map((k) => ({ name: k.name, raw: raw.slice(k.s, k.e), el: k }));
  return { open: raw.slice(0, el.cs), close: raw.slice(el.ce), kids, el };
}

/** Troca (ou remove, com xml null) os filhos `name`; insere na ordem do schema. */
export function setKid(kids: Kid[], order: string[], name: string, xml: string | null): void {
  const at = kids.findIndex((k) => k.name === name);
  for (let i = kids.length - 1; i >= 0; i--) if (kids[i]!.name === name && i !== at) kids.splice(i, 1);
  if (at >= 0) {
    if (xml === null) kids.splice(at, 1);
    else kids[at] = { name, raw: xml, el: kids[at]!.el };
    return;
  }
  if (xml === null) return;
  const rank = order.indexOf(name);
  let pos = kids.length;
  for (let i = 0; i < kids.length; i++) {
    const r = order.indexOf(kids[i]!.name);
    if (r > rank) { pos = i; break; }
  }
  kids.splice(pos, 0, { name, raw: xml, el: { name, attrs: {}, children: [] } });
}

/** Tag com atributos trocados/removidos, mantendo os filhos (só a abertura muda). */
export function withAttrs(raw: string, name: string, changes: Record<string, string | number | undefined>): string {
  if (!raw) {
    const attrs = Object.entries(changes).filter(([, v]) => v !== undefined).map(([k, v]) => ` ${k}="${esc(String(v))}"`).join('');
    return `<${name}${attrs}/>`;
  }
  const m = /^<([^\s/>]+)([^>]*?)(\/?)>/.exec(raw)!;
  let attrs = m[2]!;
  for (const [k, v] of Object.entries(changes)) {
    const re = new RegExp(`\\s${k.replace(':', '\\:')}\\s*=\\s*("[^"]*"|'[^']*')`);
    if (v === undefined) attrs = attrs.replace(re, '');
    else if (re.test(attrs)) attrs = attrs.replace(re, () => ` ${k}="${esc(String(v))}"`);
    else attrs += ` ${k}="${esc(String(v))}"`;
  }
  return `<${m[1]}${attrs}${m[3]}>${raw.slice(m[0].length)}`;
}

const kidRaw = (kids: Kid[], name: string): string => kids.find((k) => k.name === name)?.raw ?? '';
const onOff = (name: string, v: boolean): string => (v ? `<${name}/>` : `<${name} w:val="0"/>`);
const join = (open: string, kids: Kid[], close: string): string => (kids.length ? open + kids.map((k) => k.raw).join('') + close : '');

/** w:rPr gerado das props (run criado pela edição, sem XML de origem).
 *  linkAware: a cor/sublinhado que o leitor força em hyperlinks não viram rPr
 *  (o caminho antigo, sem fonte original, gravava as duas). */
export function rPrFromProps(p: RunProps, linkAware = true): string {
  const rpr: string[] = [];
  if (p.charStyle) rpr.push(`<w:rStyle w:val="${esc(p.charStyle)}"/>`);
  if (p.fontAscii) rpr.push(`<w:rFonts w:ascii="${esc(p.fontAscii)}" w:hAnsi="${esc(p.fontAscii)}" w:cs="${esc(p.fontAscii)}"/>`);
  if (p.bold) rpr.push('<w:b/>');
  if (p.italic) rpr.push('<w:i/>');
  if (p.allCaps) rpr.push('<w:caps/>');
  if (p.smallCaps) rpr.push('<w:smallCaps/>');
  if (p.strike) rpr.push('<w:strike/>');
  if (p.doubleStrike) rpr.push('<w:dstrike/>');
  // hyperlink: o leitor força cor/sublinhado nas props — não é formatação (oráculo hlink)
  const linkLook = linkAware && !!p.link && !p.underlineStyle && !p.underlineColor;
  if (p.color && !(linkAware && p.link && p.color === '0563C1')) rpr.push(`<w:color w:val="${esc(p.color)}"/>`);
  if (p.charSpacingTwips) rpr.push(`<w:spacing w:val="${p.charSpacingTwips}"/>`);
  if (p.szHalfPt !== undefined) rpr.push(`<w:sz w:val="${p.szHalfPt}"/><w:szCs w:val="${p.szHalfPt}"/>`);
  if (p.highlight) rpr.push(`<w:highlight w:val="${esc(p.highlight)}"/>`);
  if (p.underline && !linkLook) {
    rpr.push(`<w:u w:val="${p.underlineStyle ?? 'single'}"${p.underlineColor ? ` w:color="${esc(p.underlineColor)}"` : ''}/>`);
  }
  if (p.vertAlign) rpr.push(`<w:vertAlign w:val="${p.vertAlign}"/>`);
  // formatação controlada: o rPr de antes, por último (CT_RPr)
  if (p.fmt) rpr.push(`<w:rPrChange${revisionAttrs(p.fmt)}>${wrapIn('w:rPr', innerOf(rPrFromProps(p.fmt.old, linkAware)))}</w:rPrChange>`);
  return rpr.length ? `<w:rPr>${rpr.join('')}</w:rPr>` : '';
}

/** Elemento do w:rPr ↔ campo do RPr tipado (limpar formatação: o que saiu do rpr sai do XML). */
const RPR_FIELD: Record<string, string> = {
  'w:rStyle': 'rStyle', 'w:rFonts': 'rFonts', 'w:b': 'b', 'w:bCs': 'bCs', 'w:i': 'i', 'w:iCs': 'iCs', 'w:caps': 'caps',
  'w:smallCaps': 'smallCaps', 'w:strike': 'strike', 'w:dstrike': 'dstrike', 'w:outline': 'outline', 'w:shadow': 'shadow',
  'w:emboss': 'emboss', 'w:imprint': 'imprint', 'w:vanish': 'vanish', 'w:color': 'color', 'w:spacing': 'spacing', 'w:w': 'w',
  'w:kern': 'kern', 'w:position': 'position', 'w:sz': 'sz', 'w:szCs': 'szCs', 'w:highlight': 'highlight', 'w:u': 'u',
  'w:effect': 'effect', 'w:bdr': 'bdr', 'w:shd': 'shd', 'w:vertAlign': 'vertAlign', 'w:em': 'em',
};
/** Elemento do w:pPr ↔ campo do PPr tipado (w:pStyle/w:sectPr/w:pPrChange seguem as props). */
const PPR_FIELD: Record<string, string> = {
  'w:keepNext': 'keepNext', 'w:keepLines': 'keepLines', 'w:pageBreakBefore': 'pageBreakBefore', 'w:framePr': 'framePr',
  'w:widowControl': 'widowControl', 'w:numPr': 'numPr', 'w:suppressLineNumbers': 'suppressLineNumbers', 'w:pBdr': 'pBdr',
  'w:shd': 'shd', 'w:tabs': 'tabs', 'w:suppressAutoHyphens': 'suppressAutoHyphens', 'w:kinsoku': 'kinsoku', 'w:wordWrap': 'wordWrap',
  'w:overflowPunct': 'overflowPunct', 'w:autoSpaceDE': 'autoSpaceDE', 'w:autoSpaceDN': 'autoSpaceDN', 'w:bidi': 'bidi',
  'w:adjustRightInd': 'adjustRightInd', 'w:snapToGrid': 'snapToGrid', 'w:spacing': 'spacing', 'w:ind': 'ind',
  'w:contextualSpacing': 'contextualSpacing', 'w:mirrorIndents': 'mirrorIndents', 'w:suppressOverlap': 'suppressOverlap', 'w:jc': 'jc',
  'w:textAlignment': 'textAlignment', 'w:outlineLvl': 'outlineLvl', 'w:rPr': 'rPr',
};
/** rpr sem a formatação direta (fica o que não é formatação: idioma, noProof…;
 *  o rStyle fica o de origem — a troca do estilo de caractere vai pelas props). */
export function clearedRPr(rpr: RPr | undefined, fields?: readonly (keyof RunProps)[]): RPr {
  const out: Record<string, unknown> = { ...(rpr ?? {}) };
  const drop = fields ? fields.flatMap((k) => PROP_RPR[k] ?? []) : Object.values(RPR_FIELD).filter((f) => f !== 'rStyle');
  for (const f of drop) delete out[f];
  return out as RPr;
}
/** Prop de edição do run ↔ campos do RPr. */
const PROP_RPR: Partial<Record<keyof RunProps, string[]>> = {
  bold: ['b', 'bCs'], italic: ['i', 'iCs'], underline: ['u'], underlineStyle: ['u'], underlineColor: ['u'], strike: ['strike'],
  doubleStrike: ['dstrike'], allCaps: ['caps'], smallCaps: ['smallCaps'], vertAlign: ['vertAlign'], szHalfPt: ['sz', 'szCs'],
  color: ['color'], highlight: ['highlight'], fontAscii: ['rFonts'], charSpacingTwips: ['spacing'],
};
/** ppr sem a formatação direta de parágrafo (ficam pStyle, marca ¶ e revisão). */
export function clearedPPr(ppr: PPr | undefined): PPr {
  const out: Record<string, unknown> = { ...(ppr ?? {}) };
  for (const f of Object.values(PPR_FIELD)) if (f !== 'rPr') delete out[f];
  return out as PPr;
}

/** Tira os filhos cujo campo tipado saiu do objeto atual (o editor limpou). */
function dropCleared(kids: Kid[], map: Record<string, string>, cur: object): boolean {
  let n = 0;
  for (let i = kids.length - 1; i >= 0; i--) {
    const f = map[kids[i]!.name];
    if (f && (cur as Record<string, unknown>)[f] === undefined) { kids.splice(i, 1); n++; }
  }
  return n > 0;
}

/** Elemento com conteúdo (vazio: autofechado, como o Word grava). */
const wrapIn = (tag: string, inner: string): string => (inner ? `<${tag}>${inner}</${tag}>` : `<${tag}/>`);

/** Conteúdo de um elemento serializado (sem a abertura e o fecho). */
function innerOf(xml: string): string {
  if (!xml) return '';
  const a = xml.indexOf('>');
  if (xml[a - 1] === '/') return '';
  return xml.slice(a + 1, xml.lastIndexOf('</'));
}

/** O w:rPr que um w:rPrChange cru guarda (o de antes), cru. */
function changeRPrRaw(kids: Kid[]): { raw: string; el: XmlElement } | undefined {
  const k = kids.find((x) => x.name === 'w:rPrChange');
  if (!k) return undefined;
  const inner = splitElement(k.raw).kids.find((x) => x.name === 'w:rPr');
  return inner ? { raw: inner.raw, el: inner.el } : { raw: '<w:rPr/>', el: { name: 'w:rPr', attrs: {}, children: [] } };
}

/** w:rPr do run: o cru de origem com as diferenças das props aplicadas. */
export function patchRPr(raw: string | undefined, run: Run): string {
  const p = run.props;
  if (raw === undefined) return rPrFromProps(p);
  const { open, close, kids, el } = splitElement(raw);
  // rpr trocado pelo editor (limpar formatação): ele é a base, e o que saiu dele sai do XML
  const edited = run.rprEdited && run.rpr ? run.rpr : undefined;
  const base = editBaseProps(run, edited ?? readRPr(el));
  if (base.fmt && !p.fmt) {
    // formatação controlada rejeitada: o rPr volta ao de antes, cru, do próprio arquivo
    const old = changeRPrRaw(kids);
    if (old && sameJson(runFormatting(p), runFormatting(editBaseProps(run, readRPr(old.el))))) return patchRPr(old.raw, run);
  }
  let changed = edited ? dropCleared(kids, RPR_FIELD, edited) : false;
  const set = (name: string, xml: string | null): void => { changed = true; setKid(kids, RPR_ORDER, name, xml); };
  if (p.bold !== base.bold) { set('w:b', onOff('w:b', p.bold)); set('w:bCs', onOff('w:bCs', p.bold)); }
  if (p.italic !== base.italic) { set('w:i', onOff('w:i', p.italic)); set('w:iCs', onOff('w:iCs', p.italic)); }
  if (p.underline !== base.underline || p.underlineStyle !== base.underlineStyle || p.underlineColor !== base.underlineColor) {
    set('w:u', p.underline
      ? `<w:u w:val="${p.underlineStyle ?? 'single'}"${p.underlineColor ? ` w:color="${esc(p.underlineColor)}"` : ''}/>`
      : '<w:u w:val="none"/>');
  }
  if (p.strike !== base.strike) set('w:strike', onOff('w:strike', p.strike));
  if (!!p.doubleStrike !== !!base.doubleStrike) set('w:dstrike', onOff('w:dstrike', !!p.doubleStrike));
  if (p.allCaps !== base.allCaps) set('w:caps', onOff('w:caps', p.allCaps));
  if (p.smallCaps !== base.smallCaps) set('w:smallCaps', onOff('w:smallCaps', p.smallCaps));
  if (p.vertAlign !== base.vertAlign) set('w:vertAlign', `<w:vertAlign w:val="${p.vertAlign ?? 'baseline'}"/>`);
  if (p.szHalfPt !== base.szHalfPt) {
    set('w:sz', p.szHalfPt === undefined ? null : `<w:sz w:val="${p.szHalfPt}"/>`);
    set('w:szCs', p.szHalfPt === undefined ? null : `<w:szCs w:val="${p.szHalfPt}"/>`);
  }
  if (p.color !== base.color) set('w:color', p.color === undefined ? null : `<w:color w:val="${esc(p.color)}"/>`);
  if (p.highlight !== base.highlight) set('w:highlight', p.highlight === undefined ? null : `<w:highlight w:val="${esc(p.highlight)}"/>`);
  if (p.fontAscii !== base.fontAscii) {
    set('w:rFonts', p.fontAscii === undefined ? null : withAttrs(kidRaw(kids, 'w:rFonts'), 'w:rFonts', {
      'w:ascii': p.fontAscii, 'w:hAnsi': p.fontAscii, 'w:cs': p.fontAscii,
      'w:asciiTheme': undefined, 'w:hAnsiTheme': undefined, 'w:cstheme': undefined,
    }));
  }
  if (p.charStyle !== base.charStyle) set('w:rStyle', p.charStyle ? `<w:rStyle w:val="${esc(p.charStyle)}"/>` : null);
  if ((p.charSpacingTwips ?? 0) !== (base.charSpacingTwips ?? 0)) {
    set('w:spacing', p.charSpacingTwips ? `<w:spacing w:val="${p.charSpacingTwips}"/>` : null);
  }
  if (!sameJson(p.fmt, base.fmt)) {
    // formatação controlada nova (o rPr de antes = o cru sem a revisão, com as props
    // antigas) ou aceita (sai a revisão)
    if (!p.fmt) set('w:rPrChange', null);
    else {
      const rest = kids.filter((k) => k.name !== 'w:rPrChange');
      const before = rest.length ? patchRPr(join(open, rest, close), { ...run, props: { ...p.fmt.old, ...(p.link ? { link: p.link } : {}) } }) : rPrFromProps(p.fmt.old);
      set('w:rPrChange', `<w:rPrChange${revisionAttrs(p.fmt)}>${wrapIn('w:rPr', innerOf(before))}</w:rPrChange>`);
    }
  }
  return changed ? join(open, kids, close) : raw;
}

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const eq = sameJson;

/** numIds das listas que o editor cria (marcador / decimal). */
export interface GenNumIds { bullet: number; decimal: number }
export const DEFAULT_NUM_IDS: GenNumIds = { bullet: 1001, decimal: 1002 };

/** Partes do pPr que as props de edição controlam (o gerador puro usa o mesmo). */
function pprBits(pp: ParaProps, ids: GenNumIds): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  out['w:pStyle'] = pp.styleId ? `<w:pStyle w:val="${esc(pp.styleId)}"/>` : null;
  out['w:pageBreakBefore'] = pp.pageBreakBefore ? '<w:pageBreakBefore/>' : null;
  out['w:tabs'] = pp.tabStops?.length
    ? '<w:tabs>' + pp.tabStops.map((t) => `<w:tab w:val="${t.align}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.posTwips}"/>`).join('') + '</w:tabs>'
    : null;
  out['w:numPr'] = pp.numbering
    ? `<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${pp.numbering.kind === 'decimal' ? ids.decimal : ids.bullet}"/></w:numPr>`
    : null;
  if (pp.borders) {
    let inner = '';
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const e = pp.borders[side];
      if (e) inner += `<w:${side} w:val="${esc(e.style)}" w:sz="${e.sizeEighthPt}" w:space="${e.spacePt}" w:color="${e.color ? esc(e.color) : 'auto'}"/>`;
    }
    out['w:pBdr'] = inner ? `<w:pBdr>${inner}</w:pBdr>` : null;
  } else if (pp.boxBorder) {
    const b = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="1" w:color="auto"/>`;
    out['w:pBdr'] = `<w:pBdr>${b('top')}${b('left')}${b('bottom')}${b('right')}</w:pBdr>`;
  } else out['w:pBdr'] = null;
  out['w:shd'] = pp.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${esc(pp.shadingHex)}"/>` : null;
  return out;
}

/** Gerou numPr com os numIds das listas novas (exige as definições em numbering.xml). */
export interface PPrOut { xml: string; genNumbering: boolean }

/** w:pPr de um parágrafo SEM XML de origem (criado pela edição). */
export function pPrFromProps(pp: ParaProps, sectPrXml: string, ids: GenNumIds = DEFAULT_NUM_IDS): PPrOut {
  const bits = pprBits(pp, ids);
  const ppr: string[] = [];
  const add = (name: string): void => { const x = bits[name]; if (x) ppr.push(x); };
  add('w:pStyle');
  add('w:pageBreakBefore');
  add('w:numPr');
  add('w:pBdr');
  add('w:shd');
  add('w:tabs');
  if (pp.lineTwentieths !== undefined || pp.spaceAfterTwips !== undefined || pp.spaceBeforeTwips !== undefined) {
    const line = pp.lineTwentieths !== undefined ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : '';
    const before = pp.spaceBeforeTwips !== undefined ? ` w:before="${pp.spaceBeforeTwips}"` : '';
    const after = pp.spaceAfterTwips !== undefined ? ` w:after="${pp.spaceAfterTwips}"` : '';
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips || pp.indentRightTwips || pp.indentFirstLineTwips) {
    let attrs = '';
    if (pp.indentLeftTwips) attrs += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips) attrs += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips) {
      attrs += pp.indentFirstLineTwips > 0 ? ` w:firstLine="${pp.indentFirstLineTwips}"` : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs}/>`);
  }
  if (pp.alignment && pp.alignment !== 'left') ppr.push(`<w:jc w:val="${pp.alignment}"/>`);
  const mark = markXml(pp);
  if (mark) ppr.push(`<w:rPr>${mark}</w:rPr>`);
  if (sectPrXml) ppr.push(sectPrXml);
  if (pp.pfmt) ppr.push(pPrChangeXml(pp, pPrFromProps(pp.pfmt.old, '', ids).xml));
  return { xml: ppr.length ? `<w:pPr>${ppr.join('')}</w:pPr>` : '', genNumbering: !!pp.numbering || !!pp.pfmt?.old.numbering };
}

/** Revisões da marca de parágrafo (filhos de w:pPr/w:rPr, os primeiros de CT_ParaRPr). */
function markXml(pp: ParaProps): string {
  return (pp.markIns ? markRevisionXml('ins', pp.markIns) : '') + (pp.markDel ? markRevisionXml('del', pp.markDel) : '');
}

/** w:pPrChange com o pPr de antes (sem rPr/sectPr/pPrChange — CT_PPrBase). */
function pPrChangeXml(pp: ParaProps, oldPPr: string): string {
  return `<w:pPrChange${revisionAttrs(pp.pfmt!)}>${wrapIn('w:pPr', innerOf(oldPPr))}</w:pPrChange>`;
}

const MARK_REVS = new Set(['w:ins', 'w:del', 'w:moveFrom', 'w:moveTo']);

/** w:rPr da marca de parágrafo com as revisões dela trocadas (null = some). */
function markRPr(raw: string, pp: ParaProps): string | null {
  const mark = markXml(pp);
  if (!raw) return mark ? `<w:rPr>${mark}</w:rPr>` : null;
  const { open, close, kids } = splitElement(raw);
  const rest = kids.filter((k) => !MARK_REVS.has(k.name)).map((k) => k.raw).join('');
  return mark || rest ? `${open}${mark}${rest}${close}` : null;
}

/**
 * w:pPr do parágrafo: o cru de origem com as diferenças das props aplicadas.
 * `sect`: o w:sectPr que o parágrafo deve carregar (null = nenhum; undefined =
 * manter o do cru como está).
 */
export function patchPPr(raw: string | undefined, para: Paragraph, sect: string | null | undefined, ids: GenNumIds = DEFAULT_NUM_IDS): PPrOut {
  const p = para.props;
  if (raw === undefined) return pPrFromProps(p, sect ?? '', ids);
  const { open, close, kids, el } = splitElement(raw);
  const edited = para.pprEdited && para.ppr ? para.ppr : undefined;
  const base = paraPropsFromPPr(edited ?? readPPr(el));
  if (base.pfmt && !p.pfmt) {
    // formatação de parágrafo controlada rejeitada: volta ao pPr de antes, cru (com
    // a marca e a quebra de seção de agora)
    const ch = kids.find((k) => k.name === 'w:pPrChange');
    const old = ch && splitElement(ch.raw).kids.find((k) => k.name === 'w:pPr');
    const oldEl = old?.el ?? { name: 'w:pPr', attrs: {}, children: [] };
    if (ch && sameJson(paraFormatting(p), paraFormatting(paraPropsFromPPr(readPPr(oldEl))))) {
      const oldKids = old ? splitElement(old.raw).kids : [];
      const keep = kids.filter((k) => k.name === 'w:rPr' || k.name === 'w:sectPr');
      const all = [...oldKids, ...keep];
      if (!all.length) return pPrFromProps(p, sect ?? '', ids);
      return patchPPr(`<w:pPr>${all.map((k) => k.raw).join('')}</w:pPr>`, para, sect, ids);
    }
  }
  let changed = edited ? dropCleared(kids, PPR_FIELD, edited) : false;
  let genNumbering = false;
  const set = (name: string, xml: string | null): void => { changed = true; setKid(kids, PPR_ORDER, name, xml); };
  const bits = pprBits(p, ids);
  if (p.styleId !== base.styleId) set('w:pStyle', bits['w:pStyle']!);
  if (!!p.pageBreakBefore !== !!base.pageBreakBefore) set('w:pageBreakBefore', p.pageBreakBefore ? '<w:pageBreakBefore/>' : '<w:pageBreakBefore w:val="0"/>');
  if (!eq(p.tabStops, base.tabStops)) set('w:tabs', bits['w:tabs']!);
  if (!eq(p.borders, base.borders) || !!p.boxBorder !== !!base.boxBorder) set('w:pBdr', bits['w:pBdr']!);
  if (p.shadingHex !== base.shadingHex) set('w:shd', bits['w:shd']!);
  if (!eq(p.numbering, base.numbering)) {
    const numPr = el.children.find((c): c is XmlElement => typeof c !== 'string' && c.name === 'w:numPr');
    const numId = numPr && childElements(numPr, 'w:numId')[0]?.attrs['w:val'];
    if (!p.numbering) set('w:numPr', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>');
    else if (numId && numId !== '0' && base.numbering && base.numbering.kind === p.numbering.kind) {
      set('w:numPr', `<w:numPr><w:ilvl w:val="${p.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
    } else { set('w:numPr', bits['w:numPr']!); genNumbering = true; }
  }
  if (p.indentLeftTwips !== base.indentLeftTwips || p.indentRightTwips !== base.indentRightTwips || p.indentFirstLineTwips !== base.indentFirstLineTwips) {
    const f = p.indentFirstLineTwips;
    set('w:ind', withAttrs(kidRaw(kids, 'w:ind'), 'w:ind', {
      'w:left': p.indentLeftTwips, 'w:start': undefined,
      'w:right': p.indentRightTwips, 'w:end': undefined,
      'w:firstLine': f !== undefined && f >= 0 ? f : undefined,
      'w:hanging': f !== undefined && f < 0 ? -f : undefined,
      'w:firstLineChars': undefined, 'w:hangingChars': undefined, 'w:leftChars': undefined, 'w:rightChars': undefined,
    }));
  }
  if (p.lineTwentieths !== base.lineTwentieths || p.spaceAfterTwips !== base.spaceAfterTwips || p.spaceBeforeTwips !== base.spaceBeforeTwips) {
    const ch: Record<string, string | number | undefined> = {};
    if (p.lineTwentieths !== base.lineTwentieths) {
      ch['w:line'] = p.lineTwentieths;
      ch['w:lineRule'] = p.lineTwentieths !== undefined ? 'auto' : undefined;
    }
    if (p.spaceAfterTwips !== base.spaceAfterTwips) { ch['w:after'] = p.spaceAfterTwips; ch['w:afterLines'] = undefined; ch['w:afterAutospacing'] = undefined; }
    if (p.spaceBeforeTwips !== base.spaceBeforeTwips) { ch['w:before'] = p.spaceBeforeTwips; ch['w:beforeLines'] = undefined; ch['w:beforeAutospacing'] = undefined; }
    set('w:spacing', withAttrs(kidRaw(kids, 'w:spacing'), 'w:spacing', ch));
  }
  if (p.alignment !== base.alignment) set('w:jc', p.alignment ? `<w:jc w:val="${p.alignment}"/>` : null);
  if (sect !== undefined) {
    const cur = kidRaw(kids, 'w:sectPr');
    if ((sect ?? '') !== cur) set('w:sectPr', sect);
  }
  if (!sameJson(p.markIns, base.markIns) || !sameJson(p.markDel, base.markDel)) set('w:rPr', markRPr(kidRaw(kids, 'w:rPr'), p));
  if (!sameJson(p.pfmt, base.pfmt)) {
    if (!p.pfmt) set('w:pPrChange', null);
    else {
      // o pPr de antes: o cru sem rPr/sectPr/pPrChange, com as props antigas
      const rest = kids.filter((k) => k.name !== 'w:rPr' && k.name !== 'w:sectPr' && k.name !== 'w:pPrChange');
      const before = rest.length ? patchPPr(join(open, rest, close), { runs: [], props: p.pfmt.old }, undefined, ids) : pPrFromProps(p.pfmt.old, '', ids);
      if (before.genNumbering) genNumbering = true;
      set('w:pPrChange', pPrChangeXml(p, before.xml));
    }
  }
  return { xml: changed ? join(open, kids, close) : raw, genNumbering };
}

export interface HfRefXml { kind: 'header' | 'footer'; type: string; rid: string }

/**
 * w:cols como o Word grava (oráculo tools/sections-lab): atributos na ordem num,
 * sep="1", space, equalWidth="0" e uma w:col por coluna desigual. Uma coluna:
 * o w:space (e a linha, se havia) do cru ficam, sem o número nem as larguras.
 */
export function colsXml(cols: SectPr['cols'], raw?: string): string {
  if (cols && cols.count > 1) {
    const head = `<w:cols w:num="${cols.count}"${cols.sep ? ' w:sep="1"' : ''} w:space="${cols.spaceTwips}"`;
    if (!cols.widths?.length) return `${head}/>`;
    return `${head} w:equalWidth="0">${cols.widths.map((c) => `<w:col w:w="${c.widthTwips}" w:space="${c.spaceTwips}"/>`).join('')}</w:cols>`;
  }
  const el = raw ? splitElement(raw).el : undefined;
  const sep = el?.attrs['w:sep'];
  const space = el?.attrs['w:space'] ?? '708';
  return `<w:cols${sep && sep !== '0' && sep !== 'false' ? ' w:sep="1"' : ''} w:space="${esc(space)}"/>`;
}

/** w:sectPr cru com a geometria/refs atuais (só o que mudou é tocado). */
export function patchSectPr(raw: string, cur: SectPr, refs: HfRefXml[] | undefined): string {
  const { open, close, kids, el } = splitElement(raw);
  const base = readSectPr(el);
  let changed = false;
  const set = (name: string, xml: string | null): void => { changed = true; setKid(kids, SECT_ORDER, name, xml); };
  if (refs) {
    const now = kids.filter((k) => k.name === 'w:headerReference' || k.name === 'w:footerReference')
      .map((k) => `${k.name}|${k.el.attrs['w:type'] ?? 'default'}|${k.el.attrs['r:id']}`).sort().join(',');
    const want = refs.map((r) => `w:${r.kind}Reference|${r.type}|${r.rid}`).sort().join(',');
    if (now !== want) {
      changed = true;
      for (let i = kids.length - 1; i >= 0; i--) if (kids[i]!.name === 'w:headerReference' || kids[i]!.name === 'w:footerReference') kids.splice(i, 1);
      kids.unshift(...refs.map((r) => {
        const x = `<w:${r.kind}Reference w:type="${r.type}" r:id="${r.rid}"/>`;
        return { name: `w:${r.kind}Reference`, raw: x, el: { name: '', attrs: {}, children: [] } };
      }));
    }
  }
  if (cur.pageWidthTwips !== base.pageWidthTwips || cur.pageHeightTwips !== base.pageHeightTwips) {
    set('w:pgSz', withAttrs(kidRaw(kids, 'w:pgSz'), 'w:pgSz', {
      'w:w': cur.pageWidthTwips, 'w:h': cur.pageHeightTwips,
      'w:orient': cur.pageWidthTwips > cur.pageHeightTwips ? 'landscape' : undefined,
    }));
  }
  if (cur.marginTopTwips !== base.marginTopTwips || cur.marginBottomTwips !== base.marginBottomTwips
    || cur.marginLeftTwips !== base.marginLeftTwips || cur.marginRightTwips !== base.marginRightTwips
    || (cur.headerDistanceTwips ?? 720) !== base.headerDistanceTwips || (cur.footerDistanceTwips ?? 720) !== base.footerDistanceTwips) {
    const pgMar = kidRaw(kids, 'w:pgMar');
    set('w:pgMar', withAttrs(pgMar, 'w:pgMar', {
      'w:top': cur.marginTopTwips, 'w:right': cur.marginRightTwips, 'w:bottom': cur.marginBottomTwips,
      'w:left': cur.marginLeftTwips, 'w:header': cur.headerDistanceTwips ?? 720, 'w:footer': cur.footerDistanceTwips ?? 720,
      ...(pgMar ? {} : { 'w:gutter': 0 }),
    }));
  }
  if ((cur.type ?? 'nextPage') !== (base.type ?? 'nextPage')) {
    set('w:type', cur.type && cur.type !== 'nextPage' ? `<w:type w:val="${cur.type}"/>` : null);
  }
  if (!eq(cur.cols, base.cols)) set('w:cols', colsXml(cur.cols, kidRaw(kids, 'w:cols') || undefined));
  if (!!cur.titlePg !== !!base.titlePg) set('w:titlePg', cur.titlePg ? '<w:titlePg/>' : null);
  // bordas de página: só quando o editor as definiu (ausente = como no arquivo)
  if (cur.pgBorders !== undefined && !eq(cur.pgBorders ?? undefined, base.pgBorders ?? undefined)) set('w:pgBorders', pgBordersXml(cur.pgBorders));
  if (cur.pgNumStart !== base.pgNumStart) {
    set('w:pgNumType', withAttrs(kidRaw(kids, 'w:pgNumType'), 'w:pgNumType', { 'w:start': cur.pgNumStart }));
  }
  return changed ? join(open, kids, close) || `${open}${close}` : raw;
}
