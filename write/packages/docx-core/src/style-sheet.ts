/**
 * Edição da folha de estilos (word/styles.xml) SEM PERDAS: cada operação
 * troca só os w:style envolvidos (e o lsdException do latente, quando a
 * galeria muda), na ordem do CT_Style; o resto da parte sai byte a byte.
 * Regras medidas no Word 365 pt-BR (write/tools/styles-oracle, memória
 * word-styles-oracle-facts):
 *  - estilo novo de parágrafo é VINCULADO: w:customStyle="1", basedOn, link
 *    para o par "<id>Char" (tipo caractere, basedOn = par do base ou a Fonte
 *    Parágrafo Padrão, rPr = cópia);
 *  - styleId = nome sem o que não é [A-Za-z0-9-]; colisão → sufixo "0", "1"…;
 *  - estilo latente usado entra com a definição completa do built-in e perde o
 *    w:semiHidden se tiver w:unhideWhenUsed;
 *  - galeria: w:qFormat no estilo E no lsdException.
 * Também serve aos estilos de tabela (frente Tabela): putStyle/patchStyle são
 * genéricos.
 */
import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import { splitElement, setKid, withAttrs } from './lossless.js';
import { WORD_BUILTIN_STYLES } from './word-styles.js';
import { BUILTIN_STYLE_NAMES_ES } from './style-names-es.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** CT_Style */
export const STYLE_ORDER = [
  'w:name', 'w:aliases', 'w:basedOn', 'w:next', 'w:link', 'w:autoRedefine', 'w:hidden', 'w:uiPriority',
  'w:semiHidden', 'w:unhideWhenUsed', 'w:qFormat', 'w:locked', 'w:personal', 'w:personalCompose',
  'w:personalReply', 'w:rsid', 'w:pPr', 'w:rPr', 'w:tblPr', 'w:trPr', 'w:tcPr', 'w:tblStylePr',
];

/** CT_RPr / CT_PPr (os mesmos do lossless.ts) — para os rPr/pPr de estilo. */
const RPR_ORDER = [
  'w:rStyle', 'w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:caps', 'w:smallCaps', 'w:strike', 'w:dstrike',
  'w:outline', 'w:shadow', 'w:emboss', 'w:imprint', 'w:noProof', 'w:snapToGrid', 'w:vanish', 'w:webHidden',
  'w:color', 'w:spacing', 'w:w', 'w:kern', 'w:position', 'w:sz', 'w:szCs', 'w:highlight', 'w:u', 'w:effect',
  'w:bdr', 'w:shd', 'w:fitText', 'w:vertAlign', 'w:rtl', 'w:cs', 'w:em', 'w:lang', 'w:eastAsianLayout',
  'w:specVanish', 'w:oMath', 'w:rPrChange',
];
const PPR_ORDER = [
  'w:pStyle', 'w:keepNext', 'w:keepLines', 'w:pageBreakBefore', 'w:framePr', 'w:widowControl', 'w:numPr',
  'w:suppressLineNumbers', 'w:pBdr', 'w:shd', 'w:tabs', 'w:suppressAutoHyphens', 'w:kinsoku', 'w:wordWrap',
  'w:overflowPunct', 'w:topLinePunct', 'w:autoSpaceDE', 'w:autoSpaceDN', 'w:bidi', 'w:adjustRightInd',
  'w:snapToGrid', 'w:spacing', 'w:ind', 'w:contextualSpacing', 'w:mirrorIndents', 'w:suppressOverlap', 'w:jc',
  'w:textDirection', 'w:textAlignment', 'w:textboxTightWrap', 'w:outlineLvl', 'w:divId', 'w:cnfStyle', 'w:rPr',
  'w:sectPr', 'w:pPrChange',
];

export type StyleType = 'paragraph' | 'character' | 'table' | 'numbering';

/** O que a interface precisa de cada w:style (lido do XML cru). */
export interface StyleMeta {
  id: string;
  type: StyleType;
  /** w:name como gravado (built-in: nome canônico em inglês, ex. "heading 1") */
  name: string;
  aliases?: string;
  custom: boolean;
  isDefault: boolean;
  basedOn?: string;
  next?: string;
  link?: string;
  autoRedefine: boolean;
  hidden: boolean;
  /** ausente = 0 (o Word ordena assim os personalizados) */
  uiPriority: number;
  semiHidden: boolean;
  unhideWhenUsed: boolean;
  qFormat: boolean;
}

/** lsdException (estilo latente: built-in ainda não definido no arquivo). */
export interface LatentMeta {
  name: string;
  uiPriority: number;
  semiHidden: boolean;
  unhideWhenUsed: boolean;
  qFormat: boolean;
}

const val = (el: XmlElement, n: string): string | undefined => firstChild(el, n)?.attrs['w:val'];
const onOff = (el: XmlElement, n: string): boolean => {
  const k = firstChild(el, n);
  if (!k) return false;
  const v = k.attrs['w:val'];
  return v === undefined || (v !== '0' && v !== 'false' && v !== 'off');
};
const truthy = (v: string | undefined): boolean => v === '1' || v === 'true' || v === 'on';

/** Lê os w:style (com a posição de cada um) e os latentes. */
export function readStyleIndex(xml: string): {
  styles: (StyleMeta & { start: number; end: number })[];
  latent: { defaults: Omit<LatentMeta, 'name'>; items: LatentMeta[] };
} {
  const root = parseXml(xml, { positions: true });
  const styles: (StyleMeta & { start: number; end: number })[] = [];
  // w:styleId repetido: vale a ÚLTIMA definição, inteira (medido no Word,
  // oráculo styledup) — as anteriores ficam mortas e saem do índice
  const all = childElements(root, 'w:style');
  const last = new Map<string, number>();
  all.forEach((st, i) => { const id = st.attrs['w:styleId']; if (id) last.set(id, i); });
  for (const [i, st] of all.entries()) {
    const id = st.attrs['w:styleId'];
    if (!id || last.get(id) !== i) continue;
    const type = (st.attrs['w:type'] ?? 'paragraph') as StyleType;
    const prio = val(st, 'w:uiPriority');
    styles.push({
      id, type, name: val(st, 'w:name') ?? id, aliases: val(st, 'w:aliases'),
      custom: truthy(st.attrs['w:customStyle']), isDefault: truthy(st.attrs['w:default']),
      basedOn: val(st, 'w:basedOn'), next: val(st, 'w:next'), link: val(st, 'w:link'),
      autoRedefine: onOff(st, 'w:autoRedefine'), hidden: onOff(st, 'w:hidden'),
      uiPriority: prio !== undefined ? parseInt(prio, 10) || 0 : 0,
      semiHidden: onOff(st, 'w:semiHidden'), unhideWhenUsed: onOff(st, 'w:unhideWhenUsed'), qFormat: onOff(st, 'w:qFormat'),
      start: st.s!, end: st.e!,
    });
  }
  const ls = firstChild(root, 'w:latentStyles');
  const a = ls?.attrs ?? {};
  const defaults = {
    uiPriority: a['w:defUIPriority'] !== undefined ? parseInt(a['w:defUIPriority'], 10) || 0 : 99,
    semiHidden: truthy(a['w:defSemiHidden']), unhideWhenUsed: truthy(a['w:defUnhideWhenUsed']), qFormat: truthy(a['w:defQFormat']),
  };
  const items: LatentMeta[] = [];
  for (const e of ls ? childElements(ls, 'w:lsdException') : []) {
    const n = e.attrs['w:name'];
    if (!n) continue;
    const g = (k: string, d: boolean): boolean => (e.attrs[k] === undefined ? d : truthy(e.attrs[k]));
    items.push({
      name: n,
      uiPriority: e.attrs['w:uiPriority'] !== undefined ? parseInt(e.attrs['w:uiPriority'], 10) || 0 : defaults.uiPriority,
      semiHidden: g('w:semiHidden', defaults.semiHidden), unhideWhenUsed: g('w:unhideWhenUsed', defaults.unhideWhenUsed),
      qFormat: g('w:qFormat', defaults.qFormat),
    });
  }
  return { styles, latent: { defaults, items } };
}

/** w:style cru de um id (ou undefined). */
export function styleRaw(xml: string, id: string): string | undefined {
  const s = readStyleIndex(xml).styles.find((x) => x.id === id);
  return s ? xml.slice(s.start, s.end) : undefined;
}

/** Troca o w:style `id` (ou acrescenta no fim da parte). */
export function putStyle(xml: string, id: string, styleXml: string): string {
  const s = readStyleIndex(xml).styles.find((x) => x.id === id);
  if (s) return xml.slice(0, s.start) + styleXml + xml.slice(s.end);
  const at = xml.lastIndexOf('</w:styles>');
  if (at < 0) throw new Error('styles.xml sem </w:styles>');
  return xml.slice(0, at) + styleXml + xml.slice(at);
}

/** Remove o w:style `id` — todas as definições, senão uma duplicata anterior voltaria a valer. */
export function dropStyle(xml: string, id: string): string {
  const spans = childElements(parseXml(xml, { positions: true }), 'w:style')
    .filter((st) => st.attrs['w:styleId'] === id)
    .map((st) => [st.s!, st.e!] as const);
  for (const [s, e] of spans.reverse()) xml = xml.slice(0, s) + xml.slice(e);
  return xml;
}

/** lsdException do latente `name`: liga/desliga w:qFormat (o Word muda os dois). */
export function setLatentQFormat(xml: string, name: string, on: boolean): string {
  const re = new RegExp(`<w:lsdException\\b[^>]*\\bw:name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;')}"[^>]*/>`);
  const m = re.exec(xml);
  if (!m) return xml;
  const tag = m[0];
  let out = tag.replace(/\s+w:qFormat="[^"]*"/, '');
  if (on) out = out.replace(/\s*\/>$/, ' w:qFormat="1"/>');
  return out === tag ? xml : xml.slice(0, m.index) + out + xml.slice(m.index + tag.length);
}

/** styleId que o Word gera para um nome: só [A-Za-z0-9-]; colisão → 0, 1, 2… */
export function styleIdFromName(name: string, taken: ReadonlySet<string>): string {
  const base = name.replace(/[^A-Za-z0-9-]/g, '') || 'Estilo';
  if (!taken.has(base)) return base;
  for (let i = 0; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

export interface NewStyle {
  type: StyleType;
  id: string;
  name: string;
  custom?: boolean;
  basedOn?: string;
  next?: string;
  link?: string;
  autoRedefine?: boolean;
  uiPriority?: number;
  semiHidden?: boolean;
  unhideWhenUsed?: boolean;
  qFormat?: boolean;
  /** w:pPr / w:rPr crus (com as tags) */
  pPr?: string;
  rPr?: string;
}

/** w:style novo na ordem do CT_Style. */
export function newStyleXml(o: NewStyle): string {
  return `<w:style w:type="${o.type}"${o.custom ? ' w:customStyle="1"' : ''} w:styleId="${esc(o.id)}">`
    + `<w:name w:val="${esc(o.name)}"/>`
    + (o.basedOn ? `<w:basedOn w:val="${esc(o.basedOn)}"/>` : '')
    + (o.next ? `<w:next w:val="${esc(o.next)}"/>` : '')
    + (o.link ? `<w:link w:val="${esc(o.link)}"/>` : '')
    + (o.autoRedefine ? '<w:autoRedefine/>' : '')
    + (o.uiPriority !== undefined ? `<w:uiPriority w:val="${o.uiPriority}"/>` : '')
    + (o.semiHidden ? '<w:semiHidden/>' : '')
    + (o.unhideWhenUsed ? '<w:unhideWhenUsed/>' : '')
    + (o.qFormat ? '<w:qFormat/>' : '')
    + (o.pPr ?? '') + (o.rPr ?? '')
    + '</w:style>';
}

/** Mudanças no cabeçalho de um w:style. undefined = não mexe; null = remove. */
export interface StyleHead {
  styleId?: string;
  name?: string;
  aliases?: string | null;
  basedOn?: string | null;
  next?: string | null;
  link?: string | null;
  autoRedefine?: boolean;
  semiHidden?: boolean;
  qFormat?: boolean;
  /** w:pPr / w:rPr crus inteiros (null/'' = remove) */
  pPr?: string | null;
  rPr?: string | null;
}

/** Aplica `h` ao w:style cru: só os filhos tocados mudam (o resto, byte a byte). */
export function patchStyleXml(raw: string, h: StyleHead): string {
  const { open, close, kids } = splitElement(raw);
  let head = open;
  if (h.styleId !== undefined) head = withAttrs(head, 'w:style', { 'w:styleId': h.styleId });
  const set = (n: string, xml: string | null): void => setKid(kids, STYLE_ORDER, n, xml);
  const v = (n: string, x: string | null | undefined): void => {
    if (x === undefined) return;
    set(n, x === null ? null : `<${n} w:val="${esc(x)}"/>`);
  };
  if (h.name !== undefined) v('w:name', h.name);
  v('w:aliases', h.aliases);
  v('w:basedOn', h.basedOn);
  v('w:next', h.next);
  v('w:link', h.link);
  const flag = (n: string, on: boolean | undefined): void => { if (on !== undefined) set(n, on ? `<${n}/>` : null); };
  flag('w:autoRedefine', h.autoRedefine);
  flag('w:semiHidden', h.semiHidden);
  flag('w:qFormat', h.qFormat);
  if (h.pPr !== undefined) set('w:pPr', h.pPr || null);
  if (h.rPr !== undefined) set('w:rPr', h.rPr || null);
  return head + kids.map((k) => k.raw).join('') + close;
}

/** Filho de um w:style cru (ex. 'w:rPr'). */
export function styleKid(raw: string, name: string): string | undefined {
  return splitElement(raw).kids.find((k) => k.name === name)?.raw;
}

// ───────────── formatação do estilo (diálogo Modificar Estilo) ─────────────

/** Mudança de uma propriedade do estilo: valor, null = herdar (tira do estilo). */
export type Change<T> = T | null | undefined;

export interface StyleFormat {
  fontAscii?: Change<string>;
  szHalfPt?: Change<number>;
  bold?: Change<boolean>;
  italic?: Change<boolean>;
  underline?: Change<boolean>;
  strike?: Change<boolean>;
  allCaps?: Change<boolean>;
  smallCaps?: Change<boolean>;
  color?: Change<string>;
  charSpacingTwips?: Change<number>;
  alignment?: Change<'left' | 'center' | 'right' | 'both'>;
  spaceBeforeTwips?: Change<number>;
  spaceAfterTwips?: Change<number>;
  lineTwentieths?: Change<number>;
  indentLeftTwips?: Change<number>;
  indentRightTwips?: Change<number>;
  /** >0 primeira linha, <0 deslocamento */
  indentFirstLineTwips?: Change<number>;
}

const RUN_KEYS = ['fontAscii', 'szHalfPt', 'bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps', 'color', 'charSpacingTwips'] as const;
const PARA_KEYS = ['alignment', 'spaceBeforeTwips', 'spaceAfterTwips', 'lineTwentieths', 'indentLeftTwips', 'indentRightTwips', 'indentFirstLineTwips'] as const;
export const hasRunChanges = (f: StyleFormat): boolean => RUN_KEYS.some((k) => f[k] !== undefined);
export const hasParaChanges = (f: StyleFormat): boolean => PARA_KEYS.some((k) => f[k] !== undefined);

function split(raw: string | undefined, tag: string) {
  return raw ? splitElement(raw) : { open: `<${tag}>`, close: `</${tag}>`, kids: [] as ReturnType<typeof splitElement>['kids'] };
}
const joinKids = (o: { open: string; close: string; kids: { raw: string }[] }): string =>
  (o.kids.length ? o.open + o.kids.map((k) => k.raw).join('') + o.close : '');
const kidRaw = (kids: { name: string; raw: string }[], n: string): string => kids.find((k) => k.name === n)?.raw ?? '';

/** w:rPr do estilo com `f` aplicado, como o Word grava ao modificar: fonte troca
 *  só ascii/hAnsi (tira os temas desses dois; leste asiático/complexo ficam),
 *  tamanho mexe no w:sz, cor perde o tema, alternáveis só no latino. */
export function patchStyleRPr(raw: string | undefined, f: StyleFormat): string {
  const o = split(raw, 'w:rPr');
  const set = (n: string, xml: string | null): void => setKid(o.kids, RPR_ORDER, n, xml);
  const tog = (n: string, v: Change<boolean>): void => {
    if (v === undefined) return;
    set(n, v === null ? null : v ? `<${n}/>` : `<${n} w:val="0"/>`);
  };
  if (f.fontAscii !== undefined) {
    const cur = kidRaw(o.kids, 'w:rFonts');
    if (f.fontAscii === null) {
      const x = cur ? withAttrs(cur, 'w:rFonts', { 'w:ascii': undefined, 'w:hAnsi': undefined }) : '';
      set('w:rFonts', /\sw:/.test(x) ? x : null);
    } else {
      // o Word troca o atributo de tema pelo nome NO LUGAR (ascii, eastAsiaTheme, hAnsi, cstheme)
      let x = cur;
      for (const [theme, plain] of [['w:asciiTheme', 'w:ascii'], ['w:hAnsiTheme', 'w:hAnsi']] as const) {
        const re = new RegExp(`\\s${theme}="[^"]*"`);
        if (re.test(x) && !new RegExp(`\\s${plain}="`).test(x)) x = x.replace(re, () => ` ${plain}="${esc(f.fontAscii as string)}"`);
      }
      set('w:rFonts', withAttrs(x, 'w:rFonts', {
        'w:ascii': f.fontAscii, 'w:hAnsi': f.fontAscii, 'w:asciiTheme': undefined, 'w:hAnsiTheme': undefined,
      }));
    }
  }
  tog('w:b', f.bold);
  tog('w:i', f.italic);
  tog('w:caps', f.allCaps);
  tog('w:smallCaps', f.smallCaps);
  tog('w:strike', f.strike);
  if (f.color !== undefined) set('w:color', f.color === null ? null : `<w:color w:val="${esc(f.color)}"/>`);
  if (f.charSpacingTwips !== undefined) set('w:spacing', f.charSpacingTwips === null ? null : `<w:spacing w:val="${f.charSpacingTwips}"/>`);
  if (f.szHalfPt !== undefined) set('w:sz', f.szHalfPt === null ? null : `<w:sz w:val="${f.szHalfPt}"/>`);
  if (f.underline !== undefined) set('w:u', f.underline === null ? null : `<w:u w:val="${f.underline ? 'single' : 'none'}"/>`);
  return joinKids(o);
}

/** w:pPr do estilo com `f` aplicado (espaçamento/recuo mesclam os atributos). */
export function patchStylePPr(raw: string | undefined, f: StyleFormat): string {
  const o = split(raw, 'w:pPr');
  const set = (n: string, xml: string | null): void => setKid(o.kids, PPR_ORDER, n, xml);
  if (f.alignment !== undefined) set('w:jc', f.alignment === null ? null : `<w:jc w:val="${f.alignment}"/>`);
  if (f.spaceBeforeTwips !== undefined || f.spaceAfterTwips !== undefined || f.lineTwentieths !== undefined) {
    const n = (v: Change<number>): string | number | undefined => (v === null ? undefined : v);
    const ch: Record<string, string | number | undefined> = {};
    if (f.spaceBeforeTwips !== undefined) ch['w:before'] = n(f.spaceBeforeTwips);
    if (f.spaceAfterTwips !== undefined) ch['w:after'] = n(f.spaceAfterTwips);
    if (f.lineTwentieths !== undefined) {
      ch['w:line'] = n(f.lineTwentieths);
      ch['w:lineRule'] = f.lineTwentieths === null ? undefined : 'auto';
    }
    const x = withAttrs(kidRaw(o.kids, 'w:spacing'), 'w:spacing', ch);
    set('w:spacing', /\sw:/.test(x) ? x : null);
  }
  if (f.indentLeftTwips !== undefined || f.indentRightTwips !== undefined || f.indentFirstLineTwips !== undefined) {
    const ch: Record<string, string | number | undefined> = {};
    if (f.indentLeftTwips !== undefined) ch['w:left'] = f.indentLeftTwips ?? undefined;
    if (f.indentRightTwips !== undefined) ch['w:right'] = f.indentRightTwips ?? undefined;
    if (f.indentFirstLineTwips !== undefined) {
      const v = f.indentFirstLineTwips;
      ch['w:firstLine'] = v !== null && v > 0 ? v : undefined;
      ch['w:hanging'] = v !== null && v < 0 ? -v : undefined;
    }
    const x = withAttrs(kidRaw(o.kids, 'w:ind'), 'w:ind', ch);
    set('w:ind', /\sw:/.test(x) ? x : null);
  }
  return joinKids(o);
}

// ───────────────────────── built-ins do Word ─────────────────────────

export interface BuiltinStyle {
  /** w:name canônico (ex. "heading 1") */
  name: string;
  /** nome pt-BR (ex. "Título 1") */
  pt: string;
  /** w:style como o Word grava quando o estilo é usado (ids pt-BR) */
  xml: string;
  /** par Char (vinculado) */
  twin?: string;
}

let byName: Map<string, BuiltinStyle> | null = null;
function builtins(): Map<string, BuiltinStyle> {
  if (!byName) {
    byName = new Map();
    for (const [name, pt, xml, twin] of WORD_BUILTIN_STYLES) byName.set(name.toLowerCase(), { name, pt, xml, twin });
  }
  return byName;
}

/** Built-in pelo nome canônico (sem diferenciar maiúsculas). */
export function builtinStyle(name: string): BuiltinStyle | undefined {
  return builtins().get(name.toLowerCase());
}
export function builtinStyles(): BuiltinStyle[] { return [...builtins().values()]; }

const EXTRA_PT: Record<string, string> = {
  'default paragraph font': 'Fonte parág. padrão', 'normal table': 'Tabela normal', 'no list': 'Sem lista',
  'table grid': 'Tabela com grade',
};
const EN_WORDS: Record<string, string> = { toc: 'TOC', toa: 'TOA', html: 'HTML', of: 'of', annotation: 'Comment' };
const EN_WHOLE: Record<string, string> = { macro: 'Macro Text', 'annotation text': 'Comment Text', 'annotation reference': 'Comment Reference', 'annotation subject': 'Comment Subject' };

/** Nome de exibição de um estilo built-in pelo w:name canônico (undefined = não é built-in conhecido). */
export function builtinDisplayName(name: string, lang: 'en' | 'pt' | 'es'): string | undefined {
  const k = name.toLowerCase();
  const b = builtins().get(k);
  if (lang === 'pt') return b?.pt ?? EXTRA_PT[k];
  if (lang === 'es') return b || EXTRA_PT[k] ? BUILTIN_STYLE_NAMES_ES[k] ?? builtinDisplayName(name, 'en') : undefined;
  if (!b && !EXTRA_PT[k]) return undefined;
  if (EN_WHOLE[k]) return EN_WHOLE[k];
  return name.split(' ').map((w, i) => EN_WORDS[w.toLowerCase()] && (i > 0 || w.toLowerCase() !== 'of')
    ? EN_WORDS[w.toLowerCase()]!
    : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** w:style do built-in com o id que o arquivo usar (Word pt-BR: o do oráculo);
 *  `used` = já aplicado (o Word tira o semiHidden de quem tem unhideWhenUsed). */
export function builtinXml(xml: string, opts: { id?: string; used?: boolean; refs?: Record<string, string> } = {}): string {
  let out = xml;
  if (opts.id) out = out.replace(/w:styleId="[^"]*"/, () => `w:styleId="${esc(opts.id!)}"`);
  // basedOn/next/link para os ids que o documento usa (inglês × pt-BR)
  for (const [from, to] of Object.entries(opts.refs ?? {})) {
    out = out.replace(new RegExp(`(<w:(?:basedOn|next|link) w:val=")${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(")`, 'g'), (_m, a: string, b: string) => a + esc(to) + b);
  }
  if (opts.used && /<w:unhideWhenUsed\/>/.test(out)) out = out.replace('<w:semiHidden/>', '');
  return out;
}
