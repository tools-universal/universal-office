import { childElements, firstChild, type XmlElement } from '@universal-office/docx-core';
import { lengthToTwips, lengthToHalfPt } from './units.js';
import type { ResolvedRunProps, ResolvedParaProps } from './props.js';

/**
 * Resolução do cascade de estilos ODF.
 *
 * Os estilos vivem em dois lugares:
 *  - content.xml `office:automatic-styles` (estilos automáticos, normalmente
 *    formatação direta nomeada P1, T1, …);
 *  - styles.xml `office:styles` (estilos nomeados/comuns: Standard, "Heading 1", …)
 *    e `office:automatic-styles` (page-layout etc.).
 *
 * Cada `style:style` pode ter `style:parent-style-name`. A resolução acumula
 * `style:text-properties` (run) e `style:paragraph-properties` (parágrafo) do
 * pai para o filho. Também coletamos os `text:list-style` (por nome) para
 * decidir bullet vs. número.
 */

export interface RawStyle {
  family?: string;
  parent?: string;
  /** estilo de lista associado (style:list-style-name), se houver. */
  listStyleName?: string;
  text: XmlElement | undefined;
  para: XmlElement | undefined;
  /** style:table-column-properties (largura de coluna). */
  column: XmlElement | undefined;
  /** style:table-cell-properties (bordas/fundo de célula). */
  cell: XmlElement | undefined;
  /** style:graphic-properties (molduras: quebra, posição, margens internas) */
  graphic?: XmlElement | undefined;
}

export type ListKind = 'bullet' | 'decimal';

export interface OdfStyleIndex {
  /** style:name → RawStyle (automáticos + nomeados; nomeado sobrescreve se duplicado). */
  styles: Map<string, RawStyle>;
  /** text:style-name de listas → mapa de nível (1-based) para tipo. */
  listStyles: Map<string, Map<number, ListKind>>;
  /** style:default-style por família (ex.: 'paragraph'). */
  defaults: Map<string, RawStyle>;
}

function readRawStyle(st: XmlElement): RawStyle {
  return {
    family: st.attrs['style:family'],
    parent: st.attrs['style:parent-style-name'],
    listStyleName: st.attrs['style:list-style-name'],
    text: firstChild(st, 'style:text-properties'),
    para: firstChild(st, 'style:paragraph-properties'),
    column: firstChild(st, 'style:table-column-properties'),
    cell: firstChild(st, 'style:table-cell-properties'),
    graphic: firstChild(st, 'style:graphic-properties'),
  };
}

function readListStyle(ls: XmlElement): Map<number, ListKind> {
  const levels = new Map<number, ListKind>();
  for (const lvl of childElements(ls)) {
    const level = parseInt(lvl.attrs['text:level'] ?? '1', 10);
    if (lvl.name === 'text:list-level-style-bullet') {
      levels.set(level, 'bullet');
    } else if (lvl.name === 'text:list-level-style-number') {
      levels.set(level, 'decimal');
    } else if (lvl.name === 'text:list-level-style-image') {
      levels.set(level, 'bullet');
    }
  }
  return levels;
}

/** Coleta estilos de um container `office:styles`/`office:automatic-styles`. */
function collectStyles(container: XmlElement | undefined, index: OdfStyleIndex): void {
  if (!container) return;
  for (const el of childElements(container)) {
    if (el.name === 'style:style') {
      const name = el.attrs['style:name'];
      if (name) index.styles.set(name, readRawStyle(el));
    } else if (el.name === 'style:default-style') {
      const family = el.attrs['style:family'];
      if (family) index.defaults.set(family, readRawStyle(el));
    } else if (el.name === 'text:list-style') {
      const name = el.attrs['style:name'];
      if (name) index.listStyles.set(name, readListStyle(el));
    }
  }
}

/**
 * Constrói o índice a partir das raízes de content.xml e styles.xml.
 * Estilos nomeados (styles.xml) entram primeiro; automáticos (content.xml)
 * por cima — assim um P1 automático tem precedência se houver colisão de nome
 * (improvável, mas determinístico).
 */
export function buildStyleIndex(
  contentRoot: XmlElement,
  stylesRoot: XmlElement | undefined,
): OdfStyleIndex {
  const index: OdfStyleIndex = {
    styles: new Map(),
    listStyles: new Map(),
    defaults: new Map(),
  };
  if (stylesRoot) {
    collectStyles(firstChild(stylesRoot, 'office:styles'), index);
    collectStyles(firstChild(stylesRoot, 'office:automatic-styles'), index);
  }
  collectStyles(firstChild(contentRoot, 'office:automatic-styles'), index);
  return index;
}

const isTrue = (v: string | undefined): boolean =>
  v === 'bold' || v === 'italic' || v === 'true' || v === '700';

/** Lê `style:text-properties` de UM estilo (sem herança). */
function readTextProps(el: XmlElement | undefined): Partial<ResolvedRunProps> {
  const p: Partial<ResolvedRunProps> = {};
  if (!el) return p;
  const a = el.attrs;
  if (a['fo:font-weight'] !== undefined) p.bold = isTrue(a['fo:font-weight']);
  if (a['fo:font-style'] !== undefined) p.italic = a['fo:font-style'] === 'italic' || a['fo:font-style'] === 'oblique';
  const uStyle = a['style:text-underline-style'];
  if (uStyle !== undefined) p.underline = uStyle !== 'none';
  const lineThrough = a['style:text-line-through-style'];
  if (lineThrough !== undefined) p.strike = lineThrough !== 'none';
  if (a['fo:color'] !== undefined) p.color = normHex(a['fo:color']);
  if (a['fo:background-color'] !== undefined && a['fo:background-color'] !== 'transparent') {
    p.highlight = normHex(a['fo:background-color']);
  }
  const size = lengthToHalfPt(a['fo:font-size']);
  if (size !== undefined) p.szHalfPt = size;
  const font = a['style:font-name'] ?? a['fo:font-family'];
  if (font) p.fontAscii = stripQuotes(font);
  if (a['fo:font-variant'] === 'small-caps' || a['style:font-variant'] === 'small-caps') p.smallCaps = true;
  if (a['fo:text-transform'] === 'uppercase') p.allCaps = true;
  const pos = a['style:text-position'];
  if (pos) {
    if (/^super\b/.test(pos) || /^[1-9]/.test(pos)) p.vertAlign = 'superscript';
    else if (/^sub\b/.test(pos) || /^-/.test(pos)) p.vertAlign = 'subscript';
  }
  return p;
}

/** Lê `style:paragraph-properties` de UM estilo (sem herança). */
function readParaPropsStyle(el: XmlElement | undefined): Partial<ResolvedParaProps> {
  const p: Partial<ResolvedParaProps> = {};
  if (!el) return p;
  const a = el.attrs;
  switch (a['fo:text-align']) {
    case 'start': case 'left': p.alignment = 'left'; break;
    case 'end': case 'right': p.alignment = 'right'; break;
    case 'center': p.alignment = 'center'; break;
    case 'justify': p.alignment = 'both'; break;
    default: break;
  }
  const ml = lengthToTwips(a['fo:margin-left']);
  if (ml !== undefined) p.indentLeftTwips = ml;
  const mr = lengthToTwips(a['fo:margin-right']);
  if (mr !== undefined) p.indentRightTwips = mr;
  const ti = lengthToTwips(a['fo:text-indent']);
  if (ti !== undefined) p.indentFirstLineTwips = ti;
  const mt = lengthToTwips(a['fo:margin-top']);
  if (mt !== undefined) p.spaceBeforeTwips = mt;
  const mb = lengthToTwips(a['fo:margin-bottom']);
  if (mb !== undefined) p.spaceAfterTwips = mb;
  if (a['fo:background-color'] !== undefined && a['fo:background-color'] !== 'transparent') {
    p.shadingHex = normHex(a['fo:background-color']);
  }
  if (a['fo:break-before'] === 'page') p.pageBreakBefore = true;
  return p;
}

function normHex(v: string): string {
  return v.replace(/^#/, '').toUpperCase();
}

function stripQuotes(v: string): string {
  return v.replace(/^['"]|['"]$/g, '').split(',')[0]!.trim();
}

export interface ResolvedStyle {
  run: Partial<ResolvedRunProps>;
  para: Partial<ResolvedParaProps>;
  /** style:list-style-name herdado (para parágrafos que pertencem a uma lista). */
  listStyleName?: string;
}

/**
 * Resolve um estilo por nome aplicando a cadeia `style:parent-style-name`
 * (com proteção contra ciclos) e os default-styles da família.
 */
export function resolveStyle(
  index: OdfStyleIndex,
  name: string | undefined,
  seen: Set<string> = new Set(),
): ResolvedStyle {
  const empty: ResolvedStyle = { run: {}, para: {} };
  if (!name || seen.has(name)) return empty;
  seen.add(name);
  const raw = index.styles.get(name);
  if (!raw) return empty;

  // base: default-style da família + cadeia do pai
  const familyDefault = raw.family ? index.defaults.get(raw.family) : undefined;
  const baseFromDefault: ResolvedStyle = familyDefault
    ? { run: readTextProps(familyDefault.text), para: readParaPropsStyle(familyDefault.para) }
    : empty;
  const baseFromParent = raw.parent ? resolveStyle(index, raw.parent, seen) : empty;

  return {
    run: { ...baseFromDefault.run, ...baseFromParent.run, ...readTextProps(raw.text) },
    para: { ...baseFromDefault.para, ...baseFromParent.para, ...readParaPropsStyle(raw.para) },
    listStyleName: raw.listStyleName ?? baseFromParent.listStyleName,
  };
}
