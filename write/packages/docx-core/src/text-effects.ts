/**
 * EFEITOS DE TEXTO (w14, Word 2010+) e TIPOGRAFIA OpenType de um run, estruturados:
 * preenchimento (sólido, gradiente, nenhum), contorno, sombra, reflexo, brilho, 3D
 * (cena e propriedades guardadas cruas — desenhadas planas) e ligaduras, formas e
 * espaçamento dos números, conjuntos estilísticos e alternativas contextuais.
 * O XML segue a ordem do esquema w14 no w:rPr (glow, shadow, reflection, textOutline,
 * textFill, scene3d, props3d, ligatures, numForm, numSpacing, stylisticSets, cntxtAlts) —
 * a mesma que o Word grava (write/tools/home-lab exp-effects.ps1).
 */
import { childElements, firstChild, type XmlElement } from './xml.js';

/** Cor DrawingML do w14: RGB ou do tema, com os modificadores na ordem gravada
 *  (alpha, lumMod, lumOff, tint, shade, satMod… em milésimos de %). */
export interface FxColor {
  rgb?: string;
  scheme?: string;
  mods?: [string, number][];
}

export interface FxGradStop {
  /** 0–100000 */
  pos: number;
  color: FxColor;
}

export type FxFill =
  | { type: 'none' }
  | { type: 'solid'; color: FxColor }
  | {
    type: 'grad';
    stops: FxGradStop[];
    /** linear: ângulo em 60000 avos de grau; scaled */
    lin?: { ang: number; scaled: boolean };
    /** radial/retangular/forma (w14:path) com o retângulo de preenchimento (em 1000 avos de %) */
    path?: { kind: 'circle' | 'rect' | 'shape'; l: number; t: number; r: number; b: number };
  };

export interface FxOutline {
  /** largura em EMU */
  w?: number;
  cap?: 'rnd' | 'sq' | 'flat';
  cmpd?: 'sng' | 'dbl' | 'thickThin' | 'thinThick' | 'tri';
  algn?: 'ctr' | 'in';
  fill?: FxFill;
  /** w14:prstDash (solid, dash, sysDot…) */
  dash?: string;
  join?: 'round' | 'bevel' | 'miter';
  miterLim?: number;
}

export interface FxShadow {
  /** EMU */
  blurRad: number;
  dist: number;
  /** 60000 avos de grau, horário a partir do leste */
  dir: number;
  /** escalas e inclinações (1000 avos de %, 60000 avos de grau) */
  sx: number; sy: number; kx: number; ky: number;
  algn: string;
  color: FxColor;
}

export interface FxReflection {
  blurRad: number;
  /** alfas e posições em 1000 avos de % */
  stA: number; stPos: number; endA: number; endPos: number;
  dist: number; dir: number; fadeDir: number;
  sx: number; sy: number; kx: number; ky: number;
  algn: string;
}

export interface FxGlow {
  /** raio em EMU */
  rad: number;
  color: FxColor;
}

export interface TextEffects {
  fill?: FxFill;
  outline?: FxOutline;
  shadow?: FxShadow;
  reflection?: FxReflection;
  glow?: FxGlow;
  /** 3D (w14:scene3d / w14:props3d): XML cru, preservado e desenhado plano */
  scene3d?: string;
  props3d?: string;
}

export interface OpenTypeProps {
  /** w14:ligatures: none, standard, contextual, historical, discretional, combinações ou all */
  ligatures?: string;
  numForm?: 'default' | 'lining' | 'oldStyle';
  numSpacing?: 'default' | 'proportional' | 'tabular';
  /** conjuntos estilísticos ligados (1–20) */
  stylisticSets?: number[];
  cntxtAlts?: boolean;
}

const W14 = (a: XmlElement, k: string): string | undefined => a.attrs[`w14:${k}`];
const num = (v: string | undefined, d = 0): number => { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : d; };

function readColor(el: XmlElement | undefined): FxColor | undefined {
  const c = el && (firstChild(el, 'w14:srgbClr') ?? firstChild(el, 'w14:schemeClr'));
  if (!c) return undefined;
  const out: FxColor = c.name === 'w14:srgbClr' ? { rgb: (W14(c, 'val') ?? '000000').toUpperCase() } : { scheme: W14(c, 'val') ?? 'tx1' };
  const mods = childElements(c).map((m): [string, number] => [m.name.slice(4), num(W14(m, 'val'))]);
  if (mods.length) out.mods = mods;
  return out;
}

function readFill(el: XmlElement | undefined): FxFill | undefined {
  if (!el) return undefined;
  if (firstChild(el, 'w14:noFill')) return { type: 'none' };
  const solid = firstChild(el, 'w14:solidFill');
  if (solid) { const color = readColor(solid); return color ? { type: 'solid', color } : undefined; }
  const g = firstChild(el, 'w14:gradFill');
  if (!g) return undefined;
  const stops = childElements(firstChild(g, 'w14:gsLst') ?? g, 'w14:gs')
    .map((s) => ({ pos: num(W14(s, 'pos')), color: readColor(s) }))
    .filter((s): s is FxGradStop => !!s.color);
  const lin = firstChild(g, 'w14:lin');
  const path = firstChild(g, 'w14:path');
  const fr = path && firstChild(path, 'w14:fillToRect');
  return {
    type: 'grad', stops,
    ...(lin ? { lin: { ang: num(W14(lin, 'ang')), scaled: W14(lin, 'scaled') === '1' || W14(lin, 'scaled') === 'true' } } : {}),
    ...(path ? { path: { kind: (W14(path, 'path') ?? 'circle') as 'circle', l: num(fr && W14(fr, 'l')), t: num(fr && W14(fr, 't')), r: num(fr && W14(fr, 'r')), b: num(fr && W14(fr, 'b')) } } : {}),
  };
}

/** Os efeitos e a tipografia w14 de um w:rPr lido (undefined se não houver). */
export function readTextEffects(rPr: XmlElement, raw: (el: XmlElement) => string = elementXml): { fx?: TextEffects; ot?: OpenTypeProps } {
  const fx: TextEffects = {};
  const ot: OpenTypeProps = {};
  for (const el of childElements(rPr)) {
    switch (el.name) {
      case 'w14:glow': { const color = readColor(el); if (color) fx.glow = { rad: num(W14(el, 'rad')), color }; break; }
      case 'w14:shadow': {
        const color = readColor(el);
        if (color) fx.shadow = { blurRad: num(W14(el, 'blurRad')), dist: num(W14(el, 'dist')), dir: num(W14(el, 'dir')), sx: num(W14(el, 'sx'), 100000), sy: num(W14(el, 'sy'), 100000), kx: num(W14(el, 'kx')), ky: num(W14(el, 'ky')), algn: W14(el, 'algn') ?? 'b', color };
        break;
      }
      case 'w14:reflection':
        fx.reflection = {
          blurRad: num(W14(el, 'blurRad')), stA: num(W14(el, 'stA'), 100000), stPos: num(W14(el, 'stPos')), endA: num(W14(el, 'endA')), endPos: num(W14(el, 'endPos'), 100000),
          dist: num(W14(el, 'dist')), dir: num(W14(el, 'dir')), fadeDir: num(W14(el, 'fadeDir'), 5400000), sx: num(W14(el, 'sx'), 100000), sy: num(W14(el, 'sy'), 100000), kx: num(W14(el, 'kx')), ky: num(W14(el, 'ky')), algn: W14(el, 'algn') ?? 'b',
        };
        break;
      case 'w14:textOutline': {
        const o: FxOutline = {};
        if (W14(el, 'w') !== undefined) o.w = num(W14(el, 'w'));
        if (W14(el, 'cap')) o.cap = W14(el, 'cap') as FxOutline['cap'];
        if (W14(el, 'cmpd')) o.cmpd = W14(el, 'cmpd') as FxOutline['cmpd'];
        if (W14(el, 'algn')) o.algn = W14(el, 'algn') as FxOutline['algn'];
        const f = readFill(el);
        if (f) o.fill = f;
        const d = firstChild(el, 'w14:prstDash');
        if (d) o.dash = W14(d, 'val') ?? 'solid';
        if (firstChild(el, 'w14:round')) o.join = 'round';
        else if (firstChild(el, 'w14:bevel')) o.join = 'bevel';
        else { const m = firstChild(el, 'w14:miter'); if (m) { o.join = 'miter'; if (W14(m, 'lim')) o.miterLim = num(W14(m, 'lim')); } }
        fx.outline = o;
        break;
      }
      case 'w14:textFill': { const f = readFill(el); if (f) fx.fill = f; break; }
      case 'w14:scene3d': fx.scene3d = raw(el); break;
      case 'w14:props3d': fx.props3d = raw(el); break;
      case 'w14:ligatures': ot.ligatures = W14(el, 'val') ?? 'standard'; break;
      case 'w14:numForm': ot.numForm = (W14(el, 'val') ?? 'default') as OpenTypeProps['numForm']; break;
      case 'w14:numSpacing': ot.numSpacing = (W14(el, 'val') ?? 'default') as OpenTypeProps['numSpacing']; break;
      case 'w14:stylisticSets': ot.stylisticSets = childElements(el, 'w14:styleSet').map((s) => num(W14(s, 'id'))).filter((n) => n >= 1 && n <= 20); break;
      case 'w14:cntxtAlts': ot.cntxtAlts = W14(el, 'val') !== '0' && W14(el, 'val') !== 'false'; break;
    }
  }
  return { ...(Object.keys(fx).length ? { fx } : {}), ...(Object.keys(ot).length ? { ot } : {}) };
}

const escX = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Um elemento lido de volta em XML (o 3D guardado cru). */
export function elementXml(el: XmlElement): string {
  if (el.raw) return el.raw;
  const attrs = Object.entries(el.attrs).map(([k, v]) => ` ${k}="${escX(v)}"`).join('');
  const kids = el.children.map((c) => (typeof c === 'string' ? escX(c) : elementXml(c))).join('');
  return kids ? `<${el.name}${attrs}>${kids}</${el.name}>` : `<${el.name}${attrs}/>`;
}

const at = (k: string, v: string | number): string => ` w14:${k}="${v}"`;

export function fxColorXml(c: FxColor): string {
  const mods = (c.mods ?? []).map(([k, v]) => `<w14:${k}${at('val', Math.round(v))}/>`).join('');
  const tag = c.scheme ? 'schemeClr' : 'srgbClr';
  const val = c.scheme ?? (c.rgb ?? '000000').toUpperCase();
  return mods ? `<w14:${tag}${at('val', val)}>${mods}</w14:${tag}>` : `<w14:${tag}${at('val', val)}/>`;
}

function fillXml(f: FxFill): string {
  if (f.type === 'none') return '<w14:noFill/>';
  if (f.type === 'solid') return `<w14:solidFill>${fxColorXml(f.color)}</w14:solidFill>`;
  const stops = f.stops.map((s) => `<w14:gs${at('pos', Math.round(s.pos))}>${fxColorXml(s.color)}</w14:gs>`).join('');
  const shade = f.path
    ? `<w14:path${at('path', f.path.kind)}><w14:fillToRect${at('l', f.path.l)}${at('t', f.path.t)}${at('r', f.path.r)}${at('b', f.path.b)}/></w14:path>`
    : `<w14:lin${at('ang', Math.round(f.lin?.ang ?? 5400000))}${at('scaled', f.lin?.scaled ? 1 : 0)}/>`;
  return `<w14:gradFill><w14:gsLst>${stops}</w14:gsLst>${shade}</w14:gradFill>`;
}

/** Os elementos w14 do w:rPr (na ordem do esquema), vazio sem efeitos. */
export function textEffectsXml(fx: TextEffects | undefined, ot: OpenTypeProps | undefined): string {
  let x = '';
  if (fx?.glow) x += `<w14:glow${at('rad', Math.round(fx.glow.rad))}>${fxColorXml(fx.glow.color)}</w14:glow>`;
  if (fx?.shadow) {
    const s = fx.shadow;
    x += `<w14:shadow${at('blurRad', Math.round(s.blurRad))}${at('dist', Math.round(s.dist))}${at('dir', Math.round(s.dir))}${at('sx', s.sx)}${at('sy', s.sy)}${at('kx', s.kx)}${at('ky', s.ky)}${at('algn', s.algn)}>${fxColorXml(s.color)}</w14:shadow>`;
  }
  if (fx?.reflection) {
    const r = fx.reflection;
    x += `<w14:reflection${at('blurRad', r.blurRad)}${at('stA', r.stA)}${at('stPos', r.stPos)}${at('endA', r.endA)}${at('endPos', r.endPos)}${at('dist', r.dist)}${at('dir', r.dir)}${at('fadeDir', r.fadeDir)}${at('sx', r.sx)}${at('sy', r.sy)}${at('kx', r.kx)}${at('ky', r.ky)}${at('algn', r.algn)}/>`;
  }
  if (fx?.outline) {
    const o = fx.outline;
    x += `<w14:textOutline${o.w !== undefined ? at('w', Math.round(o.w)) : ''}${o.cap ? at('cap', o.cap) : ''}${o.cmpd ? at('cmpd', o.cmpd) : ''}${o.algn ? at('algn', o.algn) : ''}>`
      + (o.fill ? fillXml(o.fill) : '') + (o.dash ? `<w14:prstDash${at('val', o.dash)}/>` : '')
      + (o.join === 'round' ? '<w14:round/>' : o.join === 'bevel' ? '<w14:bevel/>' : o.join === 'miter' ? `<w14:miter${o.miterLim !== undefined ? at('lim', o.miterLim) : ''}/>` : '')
      + '</w14:textOutline>';
  }
  if (fx?.fill) x += `<w14:textFill>${fillXml(fx.fill)}</w14:textFill>`;
  if (fx?.scene3d) x += fx.scene3d;
  if (fx?.props3d) x += fx.props3d;
  if (ot?.ligatures) x += `<w14:ligatures${at('val', ot.ligatures)}/>`;
  if (ot?.numForm) x += `<w14:numForm${at('val', ot.numForm)}/>`;
  if (ot?.numSpacing) x += `<w14:numSpacing${at('val', ot.numSpacing)}/>`;
  if (ot?.stylisticSets?.length) x += `<w14:stylisticSets>${ot.stylisticSets.map((n) => `<w14:styleSet${at('id', n)}/>`).join('')}</w14:stylisticSets>`;
  if (ot?.cntxtAlts) x += '<w14:cntxtAlts/>';
  return x;
}

/** Os nomes dos elementos w14 de efeito/tipografia (para o salvar sem perdas os tirar). */
export const W14_RPR = ['w14:glow', 'w14:shadow', 'w14:reflection', 'w14:textOutline', 'w14:textFill', 'w14:scene3d', 'w14:props3d', 'w14:ligatures', 'w14:numForm', 'w14:numSpacing', 'w14:stylisticSets', 'w14:cntxtAlts'] as const;
