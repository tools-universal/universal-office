import { childElements, firstChild, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { Theme, TextBody, Shape } from './model.js';

/**
 * Cascata de estilos de texto do PresentationML (spec 03, item A).
 *
 * Fontes de herança, da MENOR para a MAIOR prioridade:
 *   1. `<p:defaultTextStyle>` do ppt/presentation.xml
 *   2. `<p:txStyles>` do slideMaster (titleStyle/bodyStyle/otherStyle por phType)
 *   3. `<p:style><a:fontRef>` da shape (cor/fonte default do estilo temático)
 *   4. `<a:lstStyle>` do placeholder correspondente no MASTER
 *   5. `<a:lstStyle>` do placeholder correspondente no LAYOUT
 *   6. `<a:lstStyle>` do próprio `<p:txBody>` da shape
 *   (propriedades diretas de `a:pPr`/`a:rPr` sempre vencem — o apply só
 *   preenche o que está AUSENTE no modelo)
 *
 * A resolução acontece no READ (preenche defaults nos Run/Paragraph), para os
 * exportadores (spec 05) se beneficiarem sem reimplementar a cascata.
 */

/** Propriedades efetivas de UM nível (lvl1pPr..lvl9pPr) já resolvidas. */
export interface TextStyleLevel {
  /** Tamanho em pontos (defRPr sz/100). */
  sz?: number;
  bold?: boolean;
  italic?: boolean;
  /** #RRGGBB resolvido via tema. */
  color?: string;
  /** Typeface do a:latin (pode ser alias "+mj-lt"/"+mn-lt" — resolvido no apply). */
  font?: string;
  /** Alinhamento (l | ctr | r | just). */
  align?: string;
  /** Bullet por caractere (`<a:buChar char>`). */
  buChar?: string;
  /** Bullet numerado (`<a:buAutoNum type>`). */
  buAutoNum?: string;
  /** `<a:buNone/>` explícito (desliga bullet herdado). */
  buNone?: boolean;
  /** marL em EMU. */
  marL?: number;
  /** indent (primeira linha) em EMU. */
  indent?: number;
  /** Sombra de texto do defRPr (`<a:effectLst><a:outerShdw>`). */
  shadow?: { color: string; blurRad: number; dist: number; dirDeg: number; alpha: number };
}

/** 9 níveis (índice 0 = lvl1pPr). */
export type TextStyleLevels = TextStyleLevel[];

const LEVEL_NAMES = [
  'a:lvl1pPr', 'a:lvl2pPr', 'a:lvl3pPr', 'a:lvl4pPr', 'a:lvl5pPr',
  'a:lvl6pPr', 'a:lvl7pPr', 'a:lvl8pPr', 'a:lvl9pPr',
];

/**
 * Parseia um elemento "container de níveis" (`<a:lstStyle>`, `<p:titleStyle>`,
 * `<p:bodyStyle>`, `<p:otherStyle>`, `<p:defaultTextStyle>`) → 9 níveis.
 * O `<a:defPPr>` (quando presente) vale como base de TODOS os níveis.
 */
export function parseTxStyleLevels(el: XmlElement | undefined, theme: Theme): TextStyleLevels {
  const levels: TextStyleLevels = Array.from({ length: 9 }, () => ({}));
  if (!el) return levels;
  const defPPr = firstChild(el, 'a:defPPr');
  const base = defPPr ? parsePPrLevel(defPPr, theme) : {};
  for (let i = 0; i < 9; i++) {
    const lvlEl = firstChild(el, LEVEL_NAMES[i]!);
    levels[i] = lvlEl ? { ...base, ...parsePPrLevel(lvlEl, theme) } : { ...base };
  }
  return levels;
}

/**
 * Parseia UM nível (a:lvlNpPr / a:defPPr / a:pPr) → TextStyleLevel.
 * Lê algn/marL/indent do próprio elemento, bullet (buChar/buAutoNum/buNone) e
 * as run-properties default de `<a:defRPr>` (sz, b, i, solidFill, latin).
 */
export function parsePPrLevel(pPr: XmlElement, theme: Theme): TextStyleLevel {
  const lvl: TextStyleLevel = {};
  if (pPr.attrs['algn']) lvl.align = pPr.attrs['algn'];
  if (pPr.attrs['marL'] !== undefined) lvl.marL = parseInt(pPr.attrs['marL'], 10);
  if (pPr.attrs['indent'] !== undefined) lvl.indent = parseInt(pPr.attrs['indent'], 10);
  const buChar = firstChild(pPr, 'a:buChar');
  if (buChar?.attrs['char']) lvl.buChar = buChar.attrs['char'];
  const buAuto = firstChild(pPr, 'a:buAutoNum');
  if (buAuto) lvl.buAutoNum = buAuto.attrs['type'] ?? 'arabicPeriod';
  if (firstChild(pPr, 'a:buNone')) lvl.buNone = true;
  const defRPr = firstChild(pPr, 'a:defRPr');
  if (defRPr) {
    if (defRPr.attrs['sz']) lvl.sz = parseInt(defRPr.attrs['sz'], 10) / 100;
    if (defRPr.attrs['b'] !== undefined) lvl.bold = defRPr.attrs['b'] === '1';
    if (defRPr.attrs['i'] !== undefined) lvl.italic = defRPr.attrs['i'] === '1';
    const sf = firstChild(defRPr, 'a:solidFill');
    if (sf) {
      const c = colorFromDml(childElements(sf)[0], theme);
      if (c) lvl.color = c;
    }
    const latin = firstChild(defRPr, 'a:latin');
    if (latin?.attrs['typeface']) lvl.font = latin.attrs['typeface'];
    // sombra de texto default do nível (títulos de template sobre foto)
    const eff = firstChild(defRPr, 'a:effectLst');
    const shd = eff ? firstChild(eff, 'a:outerShdw') : undefined;
    if (shd) {
      const colorEl = childElements(shd)[0];
      let color = '#000000', alpha = 0.6;
      if (colorEl) {
        const c = colorFromDml(colorEl, theme);
        if (c) color = c;
        const aEl = firstChild(colorEl, 'a:alpha');
        if (aEl?.attrs['val']) alpha = parseInt(aEl.attrs['val'], 10) / 100000;
      }
      lvl.shadow = {
        color,
        blurRad: shd.attrs['blurRad'] ? parseInt(shd.attrs['blurRad'], 10) : 0,
        dist: shd.attrs['dist'] ? parseInt(shd.attrs['dist'], 10) : 0,
        dirDeg: (shd.attrs['dir'] ? parseInt(shd.attrs['dir'], 10) : 5400000) / 60000,
        alpha,
      };
    }
  }
  return lvl;
}

/**
 * Mescla camadas de níveis: camadas POSTERIORES têm prioridade (props definidas
 * sobrescrevem). Bullet é mutuamente exclusivo: uma camada que define
 * buChar/buAutoNum/buNone substitui o bullet inteiro da camada anterior.
 */
export function mergeStyleLevels(...layers: TextStyleLevels[]): TextStyleLevels {
  const out: TextStyleLevels = Array.from({ length: 9 }, () => ({}));
  for (const layer of layers) {
    for (let i = 0; i < 9; i++) {
      const src = layer[i];
      if (!src) continue;
      const dst = out[i]!;
      if (src.sz !== undefined) dst.sz = src.sz;
      if (src.bold !== undefined) dst.bold = src.bold;
      if (src.italic !== undefined) dst.italic = src.italic;
      if (src.color !== undefined) dst.color = src.color;
      if (src.font !== undefined) dst.font = src.font;
      if (src.align !== undefined) dst.align = src.align;
      if (src.shadow !== undefined) dst.shadow = src.shadow;
      if (src.marL !== undefined) dst.marL = src.marL;
      if (src.indent !== undefined) dst.indent = src.indent;
      if (src.buChar !== undefined || src.buAutoNum !== undefined || src.buNone) {
        delete dst.buChar; delete dst.buAutoNum; delete dst.buNone;
        if (src.buChar !== undefined) dst.buChar = src.buChar;
        if (src.buAutoNum !== undefined) dst.buAutoNum = src.buAutoNum;
        if (src.buNone) dst.buNone = true;
      }
    }
  }
  return out;
}

/** Resolve aliases de fonte do tema ("+mj-lt" → major, "+mn-lt" → minor). */
export function resolveFontAlias(font: string | undefined, theme: Theme): string | undefined {
  if (font === undefined) return undefined;
  if (font.startsWith('+mj')) return theme.fonts?.major;
  if (font.startsWith('+mn')) return theme.fonts?.minor;
  return font;
}

/**
 * Aplica os níveis efetivos a um TextBody, preenchendo APENAS o que está
 * ausente (props diretas do XML sempre vencem). Muta o txBody in-place.
 */
export function applyTextStyles(tb: TextBody, levels: TextStyleLevels, theme: Theme): void {
  for (const p of tb.paragraphs) {
    const lvl = levels[Math.min(p.level ?? 0, 8)] ?? {};
    if (p.align === undefined && lvl.align !== undefined) p.align = lvl.align;
    if (p.marL === undefined && lvl.marL !== undefined) p.marL = lvl.marL;
    if (p.indent === undefined && lvl.indent !== undefined) p.indent = lvl.indent;
    // bullet: só herda quando o pPr não declarou nada (bullet === undefined)
    if (p.bullet === undefined) {
      if (lvl.buChar !== undefined) { p.bullet = true; p.bulletChar = lvl.buChar; }
      else if (lvl.buAutoNum !== undefined) { p.bullet = true; p.bulletAutoNum = lvl.buAutoNum; }
      else if (lvl.buNone) p.bullet = false;
    } else if (p.bullet && p.bulletChar === undefined && p.bulletAutoNum === undefined) {
      // pPr tinha buChar/buAutoNum mas sem char/type utilizável — completa da cascata
      if (lvl.buChar !== undefined) p.bulletChar = lvl.buChar;
      else if (lvl.buAutoNum !== undefined) p.bulletAutoNum = lvl.buAutoNum;
    }
    for (const r of p.runs) {
      if (r.sz === undefined && lvl.sz !== undefined) r.sz = lvl.sz;
      if (r.bold === undefined && lvl.bold !== undefined) r.bold = lvl.bold;
      if (r.italic === undefined && lvl.italic !== undefined) r.italic = lvl.italic;
      if (r.color === undefined && lvl.color !== undefined) r.color = lvl.color;
      if (r.shadow === undefined && lvl.shadow !== undefined) r.shadow = lvl.shadow;
      if (r.font === undefined && lvl.font !== undefined) {
        const f = resolveFontAlias(lvl.font, theme);
        if (f !== undefined) r.font = f;
      } else if (r.font !== undefined && r.font.startsWith('+')) {
        // run com alias direto ("+mn-lt") também resolve
        const f = resolveFontAlias(r.font, theme);
        if (f !== undefined) r.font = f;
      }
    }
  }
}

/** Contexto de cascata pré-computado por slide (master + layout + presentation). */
export interface TextStyleContext {
  /** `<p:defaultTextStyle>` do presentation.xml. */
  defaultStyle: TextStyleLevels;
  /** `<p:txStyles>` do master. */
  titleStyle: TextStyleLevels;
  bodyStyle: TextStyleLevels;
  otherStyle: TextStyleLevels;
  /** lstStyle dos placeholders do MASTER, por chave phKey. */
  masterPh: Map<string, TextStyleLevels>;
  /** lstStyle dos placeholders do LAYOUT, por chave phKey. */
  layoutPh: Map<string, TextStyleLevels>;
}

/** Escolhe o estilo do master conforme a família do placeholder. */
export function masterStyleFor(ctx: TextStyleContext, phType: string | undefined): TextStyleLevels {
  if (phType === 'title' || phType === 'ctrTitle') return ctx.titleStyle;
  if (phType === 'body' || phType === 'subTitle') return ctx.bodyStyle;
  return ctx.otherStyle;
}

/**
 * Resolve e aplica a cascata completa numa shape (item A + fontRef do item B).
 * `phKeys` são as chaves candidatas do placeholder (type#idx, type, idx:N) em
 * ordem de preferência — a primeira que existir no mapa vence.
 */
export function applyShapeTextCascade(sh: Shape, ctx: TextStyleContext, theme: Theme, phKeys: string[]): void {
  if (!sh.txBody) return;
  const layers: TextStyleLevels[] = [ctx.defaultStyle, masterStyleFor(ctx, sh.phType)];
  // fontRef do <p:style>: default de cor/fonte da shape temática — prioridade
  // acima do txStyles do master, abaixo dos lstStyle de placeholder.
  if (sh.styleFontColor !== undefined || sh.styleFontIdx !== undefined) {
    const font = sh.styleFontIdx === 'major' ? theme.fonts?.major
      : sh.styleFontIdx === 'minor' ? theme.fonts?.minor : undefined;
    const lvl: TextStyleLevel = {};
    if (sh.styleFontColor !== undefined) lvl.color = sh.styleFontColor;
    if (font !== undefined) lvl.font = font;
    layers.push(Array.from({ length: 9 }, () => ({ ...lvl })));
  }
  for (const map of [ctx.masterPh, ctx.layoutPh]) {
    for (const key of phKeys) {
      const ls = map.get(key);
      if (ls) { layers.push(ls); break; }
    }
  }
  if (sh.txBody.lstStyle) layers.push(sh.txBody.lstStyle);
  applyTextStyles(sh.txBody, mergeStyleLevels(...layers), theme);
}
