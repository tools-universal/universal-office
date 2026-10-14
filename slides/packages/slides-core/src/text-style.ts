import { childElements, firstChild, lastChild, type XmlElement } from './xml.js';
import { colorFromDml, textFillColor } from './theme.js';
import type { Theme, TextBody, Shape, ImageRef } from './model.js';

/** Resolve o `<a:blip>` de um marcador de imagem (rels da parte onde o estilo está). */
export type BlipResolver = (blip: XmlElement) => ImageRef | undefined;

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

/** baseline/cap/strike/spc de um rPr (ou defRPr). */
export function readRunExtras(rPr: XmlElement, out: { baseline?: number; cap?: 'all' | 'small' | 'none'; strike?: boolean; spc?: number }): void {
  const bl = rPr.attrs['baseline'];
  if (bl !== undefined) out.baseline = parseInt(bl, 10) / 100000;
  const cap = rPr.attrs['cap'];
  if (cap === 'all' || cap === 'small' || cap === 'none') out.cap = cap;
  const st = rPr.attrs['strike'];
  if (st !== undefined) out.strike = st === 'sngStrike' || st === 'dblStrike';
  const spc = rPr.attrs['spc'];
  if (spc !== undefined) out.spc = parseInt(spc, 10) / 100;
}

/** Propriedades efetivas de UM nível (lvl1pPr..lvl9pPr) já resolvidas. */
export interface TextStyleLevel {
  tabs?: { pos: number; algn: string }[];
  defTabSz?: number;
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
  /** Entrelinha `<a:lnSpc><a:spcPct>` (fração) ou `<a:spcPts>` (pontos). */
  lineSpacing?: number;
  lineSpacingPt?: number;
  /** Espaços antes/depois do parágrafo em pontos. */
  spaceBeforePt?: number;
  spaceAfterPt?: number;
  spaceBeforePct?: number;
  spaceAfterPct?: number;
  /** Marcador: fonte, cor, tamanho (fração ou pt). */
  buFont?: string;
  buClr?: string;
  buSzPct?: number;
  buSzPt?: number;
  /** Marcador de imagem (`<a:buBlip>`). */
  buBlip?: ImageRef;
  /** Run: sobrescrito, maiúsculas, tachado, espaçamento (defRPr). */
  baseline?: number;
  cap?: 'all' | 'small' | 'none';
  strike?: boolean;
  spc?: number;
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
export function parseTxStyleLevels(el: XmlElement | undefined, theme: Theme, blip?: BlipResolver): TextStyleLevels {
  const levels: TextStyleLevels = Array.from({ length: 9 }, () => ({}));
  if (!el) return levels;
  const defPPr = firstChild(el, 'a:defPPr');
  const base = defPPr ? parsePPrLevel(defPPr, theme, blip) : {};
  for (let i = 0; i < 9; i++) {
    const lvlEl = firstChild(el, LEVEL_NAMES[i]!);
    levels[i] = lvlEl ? { ...base, ...parsePPrLevel(lvlEl, theme, blip) } : { ...base };
  }
  return levels;
}

/**
 * Parseia UM nível (a:lvlNpPr / a:defPPr / a:pPr) → TextStyleLevel.
 * Lê algn/marL/indent do próprio elemento, bullet (buChar/buAutoNum/buNone) e
 * as run-properties default de `<a:defRPr>` (sz, b, i, solidFill, latin).
 */
export function parsePPrLevel(pPr: XmlElement, theme: Theme, blip?: BlipResolver): TextStyleLevel {
  const lvl: TextStyleLevel = {};
  if (pPr.attrs['algn']) lvl.align = pPr.attrs['algn'];
  if (pPr.attrs['marL'] !== undefined) lvl.marL = parseInt(pPr.attrs['marL'], 10);
  if (pPr.attrs['indent'] !== undefined) lvl.indent = parseInt(pPr.attrs['indent'], 10);
  if (pPr.attrs['defTabSz'] !== undefined) lvl.defTabSz = parseInt(pPr.attrs['defTabSz'], 10);
  const tl = firstChild(pPr, 'a:tabLst');
  if (tl) lvl.tabs = childElements(tl, 'a:tab').map((t) => ({ pos: parseInt(t.attrs['pos'] ?? '0', 10), algn: t.attrs['algn'] ?? 'l' })).sort((a, b) => a.pos - b.pos);
  // entrelinha e espaçamento herdáveis (título compacto de template = 75%)
  const lnSpc = firstChild(pPr, 'a:lnSpc');
  if (lnSpc) {
    const pct = firstChild(lnSpc, 'a:spcPct');
    const pts = firstChild(lnSpc, 'a:spcPts');
    if (pct?.attrs['val']) lvl.lineSpacing = parseInt(pct.attrs['val'], 10) / 100000;
    else if (pts?.attrs['val']) lvl.lineSpacingPt = parseInt(pts.attrs['val'], 10) / 100;
  }
  const spcBefEl = firstChild(pPr, 'a:spcBef');
  const befPts = spcBefEl ? firstChild(spcBefEl, 'a:spcPts') : undefined;
  if (befPts?.attrs['val']) lvl.spaceBeforePt = parseInt(befPts.attrs['val'], 10) / 100;
  const befPct = spcBefEl ? firstChild(spcBefEl, 'a:spcPct') : undefined;
  if (befPct?.attrs['val']) lvl.spaceBeforePct = parseInt(befPct.attrs['val'], 10) / 100000;
  const spcAftEl = firstChild(pPr, 'a:spcAft');
  const aftPts = spcAftEl ? firstChild(spcAftEl, 'a:spcPts') : undefined;
  if (aftPts?.attrs['val']) lvl.spaceAfterPt = parseInt(aftPts.attrs['val'], 10) / 100;
  const aftPct = spcAftEl ? firstChild(spcAftEl, 'a:spcPct') : undefined;
  if (aftPct?.attrs['val']) lvl.spaceAfterPct = parseInt(aftPct.attrs['val'], 10) / 100000;
  const buChar = firstChild(pPr, 'a:buChar');
  if (buChar?.attrs['char']) lvl.buChar = buChar.attrs['char'];
  const buAuto = firstChild(pPr, 'a:buAutoNum');
  if (buAuto) lvl.buAutoNum = buAuto.attrs['type'] ?? 'arabicPeriod';
  if (firstChild(pPr, 'a:buNone')) lvl.buNone = true;
  const buBlipEl = firstChild(pPr, 'a:buBlip');
  const bb = buBlipEl && blip ? firstChild(buBlipEl, 'a:blip') : undefined;
  const bimg = bb ? blip!(bb) : undefined;
  if (bimg) lvl.buBlip = bimg;
  const buFont = firstChild(pPr, 'a:buFont');
  if (buFont?.attrs['typeface']) lvl.buFont = buFont.attrs['typeface'];
  const buClr = firstChild(pPr, 'a:buClr');
  const bc = buClr ? colorFromDml(childElements(buClr)[0], theme) : undefined;
  if (bc) lvl.buClr = bc;
  const buPct = firstChild(pPr, 'a:buSzPct'), buPts = firstChild(pPr, 'a:buSzPts');
  if (buPct?.attrs['val']) lvl.buSzPct = parseInt(buPct.attrs['val'], 10) / 100000;
  else if (buPts?.attrs['val']) lvl.buSzPt = parseInt(buPts.attrs['val'], 10) / 100;
  const defRPr = firstChild(pPr, 'a:defRPr');
  if (defRPr) {
    readRunExtras(defRPr, lvl);
    if (defRPr.attrs['sz']) lvl.sz = parseInt(defRPr.attrs['sz'], 10) / 100;
    if (defRPr.attrs['b'] !== undefined) lvl.bold = defRPr.attrs['b'] === '1';
    if (defRPr.attrs['i'] !== undefined) lvl.italic = defRPr.attrs['i'] === '1';
    const tc = textFillColor(defRPr, theme);
    if (tc) lvl.color = tc;
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
        const aEl = lastChild(colorEl, 'a:alpha');
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
      if (src.lineSpacing !== undefined) { dst.lineSpacing = src.lineSpacing; delete dst.lineSpacingPt; }
      if (src.lineSpacingPt !== undefined) { dst.lineSpacingPt = src.lineSpacingPt; delete dst.lineSpacing; }
      // pontos × porcentagem: o nível mais específico vence (um apaga o outro)
      if (src.spaceBeforePt !== undefined) { dst.spaceBeforePt = src.spaceBeforePt; delete dst.spaceBeforePct; }
      if (src.spaceBeforePct !== undefined) { dst.spaceBeforePct = src.spaceBeforePct; delete dst.spaceBeforePt; }
      if (src.spaceAfterPt !== undefined) { dst.spaceAfterPt = src.spaceAfterPt; delete dst.spaceAfterPct; }
      if (src.spaceAfterPct !== undefined) { dst.spaceAfterPct = src.spaceAfterPct; delete dst.spaceAfterPt; }
      if (src.marL !== undefined) dst.marL = src.marL;
      if (src.indent !== undefined) dst.indent = src.indent;
      if (src.buFont !== undefined) dst.buFont = src.buFont;
      if (src.buClr !== undefined) dst.buClr = src.buClr;
      if (src.buSzPct !== undefined) { dst.buSzPct = src.buSzPct; delete dst.buSzPt; }
      if (src.buSzPt !== undefined) { dst.buSzPt = src.buSzPt; delete dst.buSzPct; }
      if (src.baseline !== undefined) dst.baseline = src.baseline;
      if (src.cap !== undefined) dst.cap = src.cap;
      if (src.strike !== undefined) dst.strike = src.strike;
      if (src.spc !== undefined) dst.spc = src.spc;
      if (src.buChar !== undefined || src.buAutoNum !== undefined || src.buNone || src.buBlip !== undefined) {
        delete dst.buChar; delete dst.buAutoNum; delete dst.buNone; delete dst.buBlip;
        if (src.buBlip !== undefined) dst.buBlip = src.buBlip;
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
    if (p.lineSpacing === undefined && p.lineSpacingPt === undefined) {
      if (lvl.lineSpacing !== undefined) p.lineSpacing = lvl.lineSpacing;
      else if (lvl.lineSpacingPt !== undefined) p.lineSpacingPt = lvl.lineSpacingPt;
    }
    if (p.spaceBeforePt === undefined && p.spaceBeforePct === undefined) {
      if (lvl.spaceBeforePt !== undefined) p.spaceBeforePt = lvl.spaceBeforePt;
      else if (lvl.spaceBeforePct !== undefined) p.spaceBeforePct = lvl.spaceBeforePct;
    }
    if (p.spaceAfterPt === undefined && p.spaceAfterPct === undefined) {
      if (lvl.spaceAfterPt !== undefined) p.spaceAfterPt = lvl.spaceAfterPt;
      else if (lvl.spaceAfterPct !== undefined) p.spaceAfterPct = lvl.spaceAfterPct;
    }
    if (p.marL === undefined && lvl.marL !== undefined) p.marL = lvl.marL;
    if (p.tabs === undefined && lvl.tabs !== undefined) p.tabs = lvl.tabs;
    if (p.defTabSz === undefined && lvl.defTabSz !== undefined) p.defTabSz = lvl.defTabSz;
    if (p.indent === undefined && lvl.indent !== undefined) p.indent = lvl.indent;
    if (p.bulletFont === undefined && lvl.buFont !== undefined) p.bulletFont = resolveFontAlias(lvl.buFont, theme) ?? lvl.buFont;
    else if (p.bulletFont?.startsWith('+')) p.bulletFont = resolveFontAlias(p.bulletFont, theme) ?? p.bulletFont;
    if (p.bulletColor === undefined && lvl.buClr !== undefined) p.bulletColor = lvl.buClr;
    if (p.bulletSizePct === undefined && p.bulletSizePt === undefined) {
      if (lvl.buSzPct !== undefined) p.bulletSizePct = lvl.buSzPct;
      else if (lvl.buSzPt !== undefined) p.bulletSizePt = lvl.buSzPt;
    }
    if (p.endSz === undefined && lvl.sz !== undefined) p.endSz = lvl.sz;
    // bullet: só herda quando o pPr não declarou nada (bullet === undefined)
    if (p.bullet === undefined) {
      if (lvl.buBlip !== undefined) { p.bullet = true; p.bulletImage = lvl.buBlip; p.bulletChar = lvl.buChar ?? '•'; }
      else if (lvl.buChar !== undefined) { p.bullet = true; p.bulletChar = lvl.buChar; }
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
      if (r.baseline === undefined && lvl.baseline !== undefined) r.baseline = lvl.baseline;
      if (r.cap === undefined && lvl.cap !== undefined) r.cap = lvl.cap;
      if (r.strike === undefined && lvl.strike !== undefined) r.strike = lvl.strike;
      if (r.spc === undefined && lvl.spc !== undefined) r.spc = lvl.spc;
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
export function applyShapeTextCascade(sh: Shape, ctx: TextStyleContext, theme: Theme, phKeys: string[], masterKeys: string[] = phKeys): void {
  if (!sh.txBody) return;
  // camadas EXCLUSIVAS (medido no app de referência): forma sem placeholder usa
  // só o defaultTextStyle da apresentação (defaultTextStyle Courier × otherStyle
  // Times → a caixa sai em Courier); placeholder usa só o estilo do master
  // (defaultTextStyle com b=1/amarelo/ctr no nível 2 não chega ao corpo)
  const isPh = sh.phType !== undefined || sh.phIdx !== undefined;
  const layers: TextStyleLevels[] = isPh ? [masterStyleFor(ctx, sh.phType)] : [ctx.defaultStyle];
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
  // layout casa por idx/tipo; o MASTER só por tipo (idx do master é outra
  // numeração: o "idx 2" do slide não é o placeholder de data idx=2 do master)
  for (const [map, keys] of [[ctx.masterPh, masterKeys], [ctx.layoutPh, phKeys]] as const) {
    for (const key of keys) {
      const ls = map.get(key);
      if (ls) { layers.push(ls); break; }
    }
  }
  if (sh.txBody.lstStyle) layers.push(sh.txBody.lstStyle);
  applyTextStyles(sh.txBody, mergeStyleLevels(...layers), theme);
}
