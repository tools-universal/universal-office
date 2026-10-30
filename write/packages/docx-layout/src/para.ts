import type {
  Paragraph, Run, RPr, PPr, TabSpec, InlineImage, NumLevel, ResolvedStyle,
} from '@universal-office/docx-core';
import { DocContext, directPPr, directRPr } from './context.js';
import { cascadeRPr, mergePPr, mergeRPr, fontOfSlot, resolveColor, shadingFill, highlightHex, resolveDrawingColor, own } from './resolve.js';
import { faceMetrics, deviceEmPt, superscriptRaiseFor, subscriptDropPt, isSymbolFont, type FontFace } from './fonts.js';
import { resolveTextFx, fxColor } from './textfx.js';
import type { NumberMarker } from './numbering.js';
import { mathAtoms, mathTextMetrics, type MathBox, type MathEnv } from './math.js';
import { markHyphenation } from './hyphenate.js';
import { revisionRanges } from './revisions.js';
import { evaluateFieldFormula, hasNestedField } from './field-formula.js';

/**
 * Parágrafo pronto para quebrar em linhas: propriedades resolvidas (cascata
 * completa), glifos medidos (fonte por slot ascii/hAnsi/eastAsia/cs, kerning
 * só com w:kern, caps/versalete, sobrescrito) e o marcador de numeração.
 */

export interface RunStyle {
  rpr: RPr;
  sizePt: number;
  color: string;
  /** undefined = automática (preto, ou branco sobre fundo escuro) */
  autoColor: boolean;
  bold: boolean;
  italic: boolean;
  underline?: { val: string; color?: string };
  strike: boolean;
  dstrike: boolean;
  highlight?: string;
  shading?: string;
  /** deslocamento vertical (twips, + sobe) — w:position + sobrescrito */
  shift: number;
  hidden: boolean;
  link?: string;
  /** opacidade do texto (w14:textFill) */
  alpha?: number;
  /** contorno visível (w14:textOutline com preenchimento) */
  outline?: boolean;
  /** efeitos de texto w14 resolvidos (degradê, contorno, sombra, brilho, reflexo) e a chave deles */
  fx?: import('./textfx.js').ResolvedTextFx;
  fxKey?: string;
}

export type GlyphKind = 'char' | 'space' | 'nbsp' | 'tab' | 'lb' | 'pb' | 'cb' | 'obj' | 'shy' | 'box';

export interface Glyph {
  kind: GlyphKind;
  ch: string;
  cp: number;
  face: FontFace;
  style: RunStyle;
  /** largura (twips) — tabs são calculados na quebra */
  adv: number;
  /** ascendente/descendente na linha (twips) */
  asc: number;
  desc: number;
  /** texto deslocado (w:position): ascendente/descendente SEM o deslocamento —
   *  a entrelinha múltipla vale sobre elas (oráculo position) */
  nAsc?: number;
  nDesc?: number;
  /** offset no texto do parágrafo (run.text concatenado) */
  offset: number;
  runIdx: number;
  /** quebra possível DEPOIS deste glifo */
  breakAfter: boolean;
  /** colado ao anterior: a palavra maior que a linha não quebra antes dele (PAGE no
   *  cabeçalho/rodapé — oráculo hfgroup) */
  glue?: boolean;
  /** quebra de linha com w:clear: a linha seguinte desce para baixo dos flutuantes */
  clear?: boolean;
  /** objeto inline (imagem/forma/grupo/caixa) */
  obj?: Run;
  /** linha horizontal VML (o:hr): altura do traço (twips) — fica sozinha na linha */
  hr?: number;
  /** w:ptab */
  ptab?: Run['ptab'];
  /** tamanho efetivo do glifo (sobrescrito reduz) */
  sizePt: number;
  /** caixa de seleção (FORMCHECKBOX): lado em twips e se está marcada */
  box?: { side: number; checked: boolean };
  /** referência de nota de rodapé (id da nota) */
  noteId?: number;
  /** espaço que comprime (modos ≤ 14 com layout asiático e characterSpacingControl ≠
   *  doNotCompress): twips que pode perder */
  feShrink?: number;
  /** espaço de largura fixa: não comprime nem expande no justificado */
  fixed?: boolean;
  /** kerning somado ao avanço (par com o caractere seguinte do run); undefined = sem kerning */
  kernAdj?: number;
  /** glifo da ligadura que este caractere abre/fecha (kerning com os vizinhos) */
  ligStart?: number;
  /** glifo trocado por uma substituição OpenType (onum, tnum, ss01…) */
  subGid?: number;
  ligEnd?: number;
  /** pontuação que pode pendurar além da margem no fim da linha */
  hang?: boolean;
  /** fração de equação (m:f) diagramada — o glifo é a caixa inteira (math.ts) */
  math?: MathBox;
  /** hifenização automática: pode quebrar com hífen DEPOIS deste glifo (hyphenate.ts) */
  hyph?: boolean;
  /** hífen que a hifenização automática acrescentou no fim da linha (não é do texto) */
  autoHyphen?: boolean;
}

export interface ParaMarker {
  text: string;
  glyphs: Glyph[];
  width: number;
  level: NumLevel;
  suff: 'tab' | 'space' | 'nothing';
  jc: string;
  picBullet?: InlineImage;
  /** número de capítulo (campo PAGE com w:chapStyle) — ver NumberMarker.chapter */
  chapter?: string;
}

export interface PreparedPara {
  para: Paragraph;
  ppr: PPr;
  styleId?: string;
  markStyle: RunStyle;
  markFace: FontFace;
  glyphs: Glyph[];
  marker?: ParaMarker;
  /** recuos (twips) */
  indLeft: number;
  indRight: number;
  /** >0 primeira linha recuada; <0 deslocamento (hanging) */
  firstLine: number;
  jc: string;
  tabs: TabSpec[];
  /** propriedades de fluxo */
  spaceBefore: number;
  spaceAfter: number;
  beforeAuto: boolean;
  afterAuto: boolean;
  lineRule: 'auto' | 'exact' | 'atLeast';
  line: number;
  contextual: boolean;
  keepNext: boolean;
  keepLines: boolean;
  widowControl: boolean;
  pageBreakBefore: boolean;
  /** só contém quebra de página/seção (parágrafo "vazio" de quebra) */
  empty: boolean;
  /** revisões que pedem barra de alteração nesta visão (offsets; parágrafo inteiro; marca) */
  revBars?: { ranges: [number, number, boolean][]; whole: boolean; mark: boolean };
}

export interface ParaEnv {
  /** pPr/rPr do estilo de tabela (condicionais já mesclados) para parágrafos em células */
  tablePPr?: PPr;
  tableRPr?: RPr;
  /** valor dos campos dinâmicos (PAGE, NUMPAGES…); `at` = posição do campo no
   *  texto do parágrafo (REF \p: acima/abaixo) */
  field?: (name: string, instr?: string, at?: number) => string | undefined;
  /** numerar (false no cabeçalho reaproveitado em cada página) */
  numbering?: boolean;
  /** cor de fundo escura (cor automática vira branco) */
  darkBackground?: boolean;
  /** fluxo sem paginação (célula, cabeçalho/rodapé, caixa): quebras de página/coluna não quebram */
  noPageBreaks?: boolean;
  /** dentro do cabeçalho/rodapé (inclusive caixas e células dele) */
  hf?: boolean;
  /** cor do texto de cor automática (caixa de texto com wps:style/a:fontRef — RRGGBB) */
  defaultColor?: string;
  /** continuação de um parágrafo partido (caixa vinculada seguinte): sem marcador, sem
   *  recuo da 1ª linha e sem espaço antes */
  continuation?: boolean;
}

/** resultado do PAGE no cabeçalho/rodapé: o Word não o parte por caractere numa
 *  caixa mais estreita que ele (no corpo parte — oráculo hfgroup, hn-field-*) */
const GLUED_FIELD = new WeakSet<Run>();

const CJK = (cp: number) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xffef) || (cp >= 0x3000 && cp <= 0x303f);
/** Depois de hífen/travessão NÃO há quebra se vem espaço (quebra no espaço), NBSP
 *  (cola), tab ou quebra de linha; com qualquer outro caractere há (oráculo dashsym). */
const NO_BREAK_AFTER_DASH = /^[\s\u00a0\u202f\u2000-\u200b\u3000\ufeff\u00ad]$/u;
const CS = (cp: number) => (cp >= 0x0590 && cp <= 0x08ff) || (cp >= 0xfb1d && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);

/** Fonte das equações (m:mathFont padrão do Word). */
const MATH_FONT = 'Cambria Math';
const FALLBACK_FAMILIES = ['Segoe UI Symbol', 'Segoe UI Emoji', 'Arial Unicode MS', 'MS Gothic', 'Cambria Math', 'Segoe UI', 'Arial'];
/** Fonte "da classe" da fonte do run pelo PANOSE: monoespaçada (proporção 9) → Courier
 *  New; sem serifa (serifa 11–15) → Arial; o resto (serifada, PANOSE zerado) → Times
 *  New Roman — o Word cai nela antes da cadeia de símbolos (oráculo glyphfb). */
function classFallback(font: { metrics: { panose?: number[] } }): string {
  const pn = font.metrics.panose;
  if (pn && pn[0] === 2 && pn[3] === 9) return 'Courier New';
  if (pn && pn[0] === 2 && pn[1]! >= 11 && pn[1]! <= 15) return 'Arial';
  return 'Times New Roman';
}
/** Ordem de fallback do Word para o caractere que a fonte do run não tem, por bloco
 *  Unicode (oráculo glyphfb): setas e formas geométricas → fonte da classe, Cambria Math;
 *  operadores matemáticos → Cambria Math; o resto (símbolos diversos, dingbats…) →
 *  Segoe UI Symbol primeiro. */
function fallbackOrder(cp: number, font: { metrics: { panose?: number[] } }): readonly string[] {
  if ((cp >= 0x2190 && cp <= 0x21ff) || (cp >= 0x25a0 && cp <= 0x25ff)) return [classFallback(font), 'Cambria Math', ...FALLBACK_FAMILIES];
  if ((cp >= 0x2200 && cp <= 0x22ff) || (cp >= 0x2980 && cp <= 0x29ff)) return ['Cambria Math', ...FALLBACK_FAMILIES];
  return FALLBACK_FAMILIES;
}

export function resolveRunStyle(ctx: DocContext, rpr: RPr, env: ParaEnv, link?: string): RunStyle {
  const theme = ctx.fmt.theme;
  const sz = (rpr.sz ?? 20) / 2;
  const va = rpr.vertAlign;
  // sobrescrito/subscrito: ySuperscriptYSize (1331/2048 nas fontes comuns, não 0,65) do
  // corpo, em meios pontos — 15pt → 9,5pt (oráculo supraise, corpo do PDF do Word)
  const sizePt = va === 'superscript' || va === 'subscript' ? Math.round((sz * 2 * 1331) / 2048) / 2 : sz;
  // o deslocamento do sobrescrito/subscrito vem da fonte do run (calculado abaixo, com a face)
  const shift = (rpr.position ?? 0) * 10; // half-points → twips
  // w14:textFill (Word 2010+) manda sobre w:color e traz a opacidade
  const tf = rpr.textFill;
  const color = (tf && (tf.color ?? (tf.themeColor ? resolveColor({ themeColor: tf.themeColor }, theme) : undefined))) ?? resolveColor(rpr.color, theme);
  // cor do sublinhado: hex ou cor do tema (recalculada do tema, como no texto); auto = a do texto
  const uColor = rpr.u ? resolveColor({ val: rpr.u.color, themeColor: rpr.u.themeColor, themeTint: rpr.u.themeTint, themeShade: rpr.u.themeShade }, theme) : undefined;
  const u = rpr.u && rpr.u.val !== 'none' && rpr.u.val !== '' ? { val: rpr.u.val, ...(uColor ? { color: uColor } : {}) } : undefined;
  const shd = shadingFill(rpr.shd, theme);
  const style: RunStyle = {
    rpr,
    sizePt,
    color: color ?? env.defaultColor ?? (env.darkBackground ? 'FFFFFF' : '000000'),
    autoColor: !color && !env.defaultColor,
    bold: !!rpr.b,
    italic: !!rpr.i,
    underline: u,
    strike: !!rpr.strike,
    dstrike: !!rpr.dstrike,
    highlight: highlightHex(rpr.highlight),
    shading: shd,
    shift,
    hidden: !!rpr.vanish || !!rpr.specVanish,
    ...(tf?.alpha !== undefined && tf.alpha < 1 ? { alpha: tf.alpha } : {}),
    ...(rpr.textOutline ? { outline: true } : {}),
    ...(link ? { link } : {}),
  };
  // preenchimento sólido w14: a cor pelo DrawingML (tx1/bg1, lumMod/lumOff…) e a opacidade
  if (rpr.fx?.fill?.type === 'solid') {
    const c = fxColor(rpr.fx.fill.color, theme, style.color);
    style.color = c.hex;
    if (c.alpha < 1) style.alpha = c.alpha; else delete style.alpha;
  }
  const fx = resolveTextFx(rpr.fx, theme, style.color);
  if (fx) {
    style.fx = fx;
    style.fxKey = JSON.stringify(fx);
    // degradê: a cor "do texto" (sublinhado, tachado) é a da 1ª parada
    if (fx.fill?.kind === 'grad' && fx.fill.stops[0]) style.color = fx.fill.stops[0].hex;
    if (fx.fill?.kind === 'none') style.alpha = 0;
  }
  if (va === 'superscript' || va === 'subscript') {
    // medido no Word (oráculo supraise): elevação/queda pela fonte do PRÓPRIO run
    const face = faceFor(ctx, rpr, 0x41, style);
    style.shift += va === 'superscript' ? superscriptRaiseFor(face.family, faceMetrics(face.font), sz, sizePt) * 20 : -subscriptDropPt(face.family, sz) * 20;
  }
  return style;
}

/** Código da área privada desenhado como .notdef (fonte comum, sem mapeamento de símbolo). */
const notdefPua = (face: FontFace, cp: number): boolean => cp >= 0xf000 && cp <= 0xf0ff && face.font.glyphId(cp) === 0 && !isSymbolFont(face.font);

/** Face do caractere (slot por faixa Unicode) com fallback de glifo ausente. */
function faceFor(ctx: DocContext, rpr: RPr, cp: number, style: RunStyle, symFont?: string): FontFace {
  const theme = ctx.fmt.theme;
  let family: string | undefined;
  let bold = style.bold, italic = style.italic;
  // w:sym: a fonte do símbolo (a área F0xx sempre; fora dela, menos CJK, que segue o eastAsia)
  if (symFont && ((cp >= 0xf000 && cp <= 0xf0ff) || !CJK(cp))) family = symFont;
  else if (CJK(cp)) family = fontOfSlot(rpr.rFonts, 'eastAsia', theme) ?? fontOfSlot(rpr.rFonts, 'ascii', theme);
  else if (CS(cp) || rpr.cs || rpr.rtl) {
    family = fontOfSlot(rpr.rFonts, 'cs', theme) ?? fontOfSlot(rpr.rFonts, 'ascii', theme);
    bold = !!rpr.bCs; italic = !!rpr.iCs;
  } else if (cp < 0x80) family = fontOfSlot(rpr.rFonts, 'ascii', theme);
  else {
    family = rpr.rFonts?.hint === 'eastAsia' && (cp === 0x201c || cp === 0x201d || cp === 0x2018 || cp === 0x2019)
      ? fontOfSlot(rpr.rFonts, 'eastAsia', theme)
      : fontOfSlot(rpr.rFonts, 'hAnsi', theme) ?? fontOfSlot(rpr.rFonts, 'ascii', theme);
  }
  const face = ctx.faces.get(family, bold, italic);
  // espaços tipográficos ausentes na fonte NÃO trocam de fonte (a altura da
  // linha segue a fonte do run — ex.: U+2002)
  if (cp <= 32 || SPACE_WIDTHS[cp] !== undefined || face.font.glyphId(cp) !== 0) return face;
  // símbolo legado (F0xx) numa fonte que mapeia em 0x00xx (Symbol/Wingdings antigos)
  // código da área privada (w:sym, marcador) que a fonte não tem: fonte de SÍMBOLO que o
  // mapeia em 0x00xx fica com ele; fonte comum (Arial, Times…) não — o Word desenha o glifo
  // ausente (.notdef) da Calibri, qualquer que seja a fonte do run ou do tema (oráculo symnotdef)
  if (cp >= 0xf000 && cp <= 0xf0ff) {
    if (isSymbolFont(face.font) && face.font.glyphId(cp - 0xf000) !== 0) return face;
    return ctx.faces.get('Calibri', false, false);
  }
  for (const fb of fallbackOrder(cp, face.font)) {
    const f = ctx.faces.get(fb, bold, italic);
    if (f.font.glyphId(cp) !== 0) return f;
  }
  return face;
}

function vMetrics(m: { ascent: number; descent: number }, style: RunStyle): { asc: number; desc: number; nAsc?: number; nDesc?: number } {
  const va = style.rpr.vertAlign;
  if (va === 'superscript' || va === 'subscript') {
    const base = (style.rpr.sz ?? 20) / 2;
    return { asc: m.ascent * base * 20, desc: m.descent * base * 20 };
  }
  // w:position desloca a caixa do glifo: elevado, a descendente encolhe (até 0);
  // rebaixado, a ascendente (oráculo position)
  const [sa, sd] = shadowExtent(style);
  const a = m.ascent * style.sizePt * 20 + sa, d = m.descent * style.sizePt * 20 + sd;
  if (!style.shift) return { asc: a, desc: d };
  return { asc: Math.max(0, a + style.shift), desc: Math.max(0, d - style.shift), nAsc: a, nDesc: d };
}

/**
 * Quanto a sombra do texto (w14:shadow) estende a caixa do glifo acima e abaixo
 * (twips), medido no Word (oráculo shadowh): k·máx(0, desfoque ∓ dy), dy = dist·sen(dir)
 * (para baixo positivo), k = (corpo/72)^0,7 — independe da fonte; vale também na
 * marca de parágrafo e escala com a entrelinha múltipla; a exata não muda.
 */
export function shadowExtent(style: RunStyle): [number, number] {
  const sh = style.rpr.textShadow;
  if (!sh || (!sh.blur && !sh.dist)) return [0, 0];
  const k = Math.pow(style.sizePt / 72, 0.7);
  const dy = sh.dist * Math.sin((sh.dir * Math.PI) / 180);
  return [k * Math.max(0, sh.blur - dy) * 20, k * Math.max(0, sh.blur + dy) * 20];
}

function isHyperlinkStyle(ctx: DocContext, id: string): boolean {
  const st = own(ctx.resolver.styles, id);
  return id === 'Hyperlink' || st?.name?.toLowerCase() === 'hyperlink';
}

/** Larguras-padrão (frações do em) dos espaços tipográficos sem glifo na fonte. */
const SPACE_WIDTHS: Record<number, number | string> = {
  0x2000: 0.5, 0x2001: 1, 0x2002: 0.5, 0x2003: 1, 0x2004: 1 / 3, 0x2005: 0.25, 0x2006: 1 / 6,
  0x2007: '0', 0x2008: '.', 0x2009: 0.2, 0x200a: 0.1, 0x200b: 0, 0x202f: ' ', 0x205f: 4 / 18,
};

/**
 * Unidade interna das larguras do Word: 1/4096 pt (5/1024 twip). Medido no oráculo
 * emwidth: cada glifo mede avanço × corpo / upm em 1/4096 pt ARREDONDADO PARA BAIXO —
 * exato nas fontes de 2048 unidades por em (corpos de meio em meio ponto), até 1/4096 pt
 * menor nas de 1000/2000 unidades (Noto Sans, Public Sans…), instaladas ou embutidas.
 */
export const WORD_UNIT = 20 / 4096;

/** Largura (twips) de `units` unidades da fonte no corpo sizePt: piso em 1/4096 pt. */
export function wordWidth(units: number, sizePt: number, upm: number): number {
  return Math.floor((units * sizePt * 4096) / upm + 1e-7) * WORD_UNIT;
}

/** Medida em twips na unidade interna, arredondada: recuos, largura da coluna/célula e
 *  w:spacing são convertidos um a um (oráculo emwidth). */
export function toWordUnit(tw: number): number {
  return Math.round(tw / WORD_UNIT) * WORD_UNIT;
}

/**
 * Escala horizontal (w:w) medida no Word (oráculo emwidth: Arial, Calibri, Noto Sans,
 * 66–200%): a fonte escalada tem largura média INTEIRA — piso de xAvgCharWidth (OS/2) ×
 * w/100, em unidades da fonte — e cada avanço vira round(avanço × essa largura /
 * xAvgCharWidth) unidades; o w:spacing não escala. Sem largura média: a escala exata.
 */
export function scaledUnits(units: number, font: FontFace['font'], w: number): number {
  const avg = (font.metrics as { xAvgCharWidth?: number }).xAvgCharWidth;
  if (!avg || avg <= 0) return (units * w) / 100;
  const lf = Math.floor((avg * w) / 100 + 1e-9);
  return Math.floor((units * lf) / avg + 0.5);
}

/** w:spacing (twips) somado a cada caractere, na unidade interna do Word. */
export function spacingTwips(ctx: DocContext, sp: number): number {
  return ctx.opts.advanceRound === 'word' && ctx.opts.advanceEm !== 'device' ? toWordUnit(sp) : sp;
}

/** Avanço (twips) do caractere cp na face, no corpo sizePt e na escala horizontal w (%). */
export function advanceTwips(ctx: DocContext, face: FontFace, cp: number, sizePt: number, w = 100): number {
  const f = face.font;
  let gid = f.glyphId(cp);
  // área privada: fonte de símbolo mapeia em 0x00xx; nas demais fica o .notdef, e o Word
  // ainda avança um espaço da fonte depois dele (oráculo symnotdef)
  let extra = 0;
  if (gid === 0 && cp >= 0xf000 && cp <= 0xf0ff) {
    if (isSymbolFont(f)) gid = f.glyphId(cp - 0xf000);
    else extra = f.advanceWidth(f.glyphId(0x20));
  }
  if (gid === 0 && SPACE_WIDTHS[cp] !== undefined) {
    const sw = SPACE_WIDTHS[cp]!;
    if (typeof sw === 'string') return advanceTwips(ctx, face, sw.codePointAt(0)!, sizePt, w) * (cp === 0x202f ? 0.5 : 1);
    return (sw * sizePt * 20 * w) / 100;
  }
  // espaços "en", "em" e de quatro por em (U+2002, U+2003, U+2005 — os que quebram): o Word
  // mede pelo TRAVESSÃO da própria fonte — en dash, em dash, em dash/4 —, não pelo glifo do
  // espaço (oráculo enspace: Arial "en" = 0,556 em, Calibri "em" = 0,905 em)
  let frac = 1;
  if (gid !== 0 && (cp === 0x2002 || cp === 0x2003 || cp === 0x2005)) {
    const dg = f.glyphId(cp === 0x2002 ? 0x2013 : 0x2014);
    if (dg) { gid = dg; frac = cp === 0x2005 ? 1 / 4 : 1; }
  }
  const units = f.advanceWidth(gid) * frac + extra;
  if (ctx.opts.advanceRound === 'word' && ctx.opts.advanceEm !== 'device') {
    return wordWidth(w !== 100 ? scaledUnits(units, f, w) : units, sizePt, f.metrics.unitsPerEm);
  }
  return (roundAdvance(ctx, (units * emOf(ctx, sizePt) * 20) / f.metrics.unitsPerEm) * w) / 100;
}

const emOf = (ctx: DocContext, sizePt: number): number => (ctx.opts.advanceEm === 'device' ? deviceEmPt(sizePt) : sizePt);

/** Arredondamentos de calibração (advanceRound ≠ 'word'). */
function roundAdvance(ctx: DocContext, tw: number): number {
  switch (ctx.opts.advanceRound) {
    case 'twip': return Math.round(tw);
    case 'twipFloor': return Math.floor(tw);
    case 'twipCeil': return Math.ceil(tw);
    case 'dev600': return Math.round(tw / 2.4) * 2.4;
    case 'half': return Math.round(tw * 2) / 2;
    default: return tw;
  }
}

/** Kerning de um par de GLIFOS (com glifo de ligadura), na mesma escala de kernTwips. */
function kernGlyphs(ctx: DocContext, face: FontFace, g1: number, g2: number, sizePt: number): number {
  const kg = (face.font as { kernGlyphsTwips?: (a: number, b: number, s: number) => number }).kernGlyphsTwips;
  const k = kg ? kg.call(face.font, g1, g2, sizePt) : 0;
  if (!k) return 0;
  if (ctx.opts.advanceEm === 'device') return k;
  return (k * sizePt) / deviceEmPt(sizePt);
}

/** Avanço de um GLIFO (de ligadura) em twips, na mesma escala de advanceTwips. */
function glyphAdvTwips(ctx: DocContext, face: FontFace, gid: number, sizePt: number): number {
  const f = face.font;
  if (ctx.opts.advanceRound === 'word' && ctx.opts.advanceEm !== 'device') return wordWidth(f.advanceWidth(gid), sizePt, f.metrics.unitsPerEm);
  return roundAdvance(ctx, (f.advanceWidth(gid) * emOf(ctx, sizePt) * 20) / f.metrics.unitsPerEm);
}

/** Features GSUB da tipografia w14 além das ligaduras: formas e espaçamento dos números,
 *  conjuntos estilísticos e alternativas contextuais (calt: só as substituições simples). */
function otFeatures(ot: RPr['ot']): string[] {
  if (!ot) return [];
  const out: string[] = [];
  if (ot.numForm === 'oldStyle') out.push('onum'); else if (ot.numForm === 'lining') out.push('lnum');
  if (ot.numSpacing === 'tabular') out.push('tnum'); else if (ot.numSpacing === 'proportional') out.push('pnum');
  for (const n of ot.stylisticSets ?? []) out.push(`ss${String(n).padStart(2, '0')}`);
  if (ot.cntxtAlts) out.push('calt');
  return out;
}

/** Features GSUB de ligadura ligadas por w14:ligatures (none, standard, contextual,
 *  historical, discretional, combinações e all). */
function ligFeatures(v: string | undefined): string[] {
  if (!v || v === 'none') return [];
  if (v === 'all') return ['liga', 'clig', 'hlig', 'dlig'];
  const out: string[] = [];
  if (/standard/i.test(v)) out.push('liga');
  if (/contextual/i.test(v)) out.push('clig');
  if (/historical/i.test(v)) out.push('hlig');
  if (/discretional/i.test(v)) out.push('dlig');
  return out;
}

/**
 * Ligaduras OpenType (w14:ligatures): o Word mede o glifo da ligadura (GSUB do script
 * latino), não a soma das letras — Calibri "tt" −73/2048 em, "ti" −15, "fi" −11; dentro
 * dela não há kerning e o par com o vizinho é o do glifo da ligadura (oráculo ligwidth).
 * Trechos de letras com a mesma face e corpo, também entre runs (com cor diferente,
 * inclusive). A diferença de largura vai para o último caractere da ligadura
 * (cada letra continua desenhada com o seu glifo).
 */
function applyLigatures(ctx: DocContext, glyphs: Glyph[]): void {
  // runs que ligam entre si: mesma face e corpo (testados abaixo), idioma, escala,
  // posição e ligaduras — cor, sublinhado, estilo não importam (como no kerning)
  const keyOf = (g: Glyph): string => {
    const r = g.style.rpr as RPr & { ligatures?: string };
    return `${r.lang?.val ?? ''}|${r.w ?? 100}|${g.style.shift}|${r.ligatures ?? ''}|${r.spacing ?? 0}|${JSON.stringify(r.ot ?? null)}`;
  };
  for (let k = 0; k < glyphs.length;) {
    const g0 = glyphs[k]!;
    const rpr = g0.style.rpr;
    const feats = g0.kind === 'char' ? [...(!rpr.spacing ? ligFeatures((rpr as { ligatures?: string }).ligatures) : []), ...otFeatures(rpr.ot)] : [];
    const ligate = (g0.face.font as { ligate?: (g: number[], f: readonly string[]) => { gid: number; len: number }[] | null }).ligate;
    if (!feats.length || !ligate) { k++; continue; }
    const key = keyOf(g0);
    let e = k + 1;
    while (e < glyphs.length) {
      const q = glyphs[e]!;
      if (q.kind !== 'char' || q.face !== g0.face || q.sizePt !== g0.sizePt || (q.runIdx !== g0.runIdx && keyOf(q) !== key)) break;
      e++;
    }
    if (e - k >= 1) {
      const f = g0.face.font;
      const groups = ligate.call(f, glyphs.slice(k, e).map((q) => f.glyphId(q.cp)), feats);
      let pos = k;
      for (const grp of groups ?? []) {
        // substituição simples (números antigos/tabulares, conjunto estilístico): outro glifo,
        // com o avanço dele (o desenho usa o glifo trocado)
        if (grp.len === 1 && grp.gid !== f.glyphId(glyphs[pos]!.cp)) {
          const q = glyphs[pos]!;
          const w = q.style.rpr.w && q.style.rpr.w !== 100 ? q.style.rpr.w / 100 : 1;
          q.adv += (glyphAdvTwips(ctx, q.face, grp.gid, q.sizePt) - glyphAdvTwips(ctx, q.face, f.glyphId(q.cp), q.sizePt)) * w;
          q.subGid = grp.gid;
        }
        if (grp.len > 1) {
          const first = glyphs[pos]!, last = glyphs[pos + grp.len - 1]!;
          let sum = 0;
          for (let j = pos; j < pos + grp.len; j++) sum += glyphAdvTwips(ctx, first.face, f.glyphId(glyphs[j]!.cp), first.sizePt);
          const w = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
          let delta = (glyphAdvTwips(ctx, first.face, grp.gid, first.sizePt) - sum) * w;
          if (first.face.synthBold) delta -= ((grp.len - 1) * first.sizePt * 20) / 2048;
          // sem kerning dentro da ligadura
          for (let j = pos; j < pos + grp.len - 1; j++) {
            const q = glyphs[j]!;
            if (q.kernAdj) { q.adv -= q.kernAdj; q.kernAdj = 0; }
          }
          // o par com o vizinho é o do glifo da ligadura
          const nx = glyphs[pos + grp.len];
          if (last.kernAdj !== undefined && nx && nx.runIdx === last.runIdx) {
            const nk = kernGlyphs(ctx, first.face, grp.gid, nx.ligStart ?? f.glyphId(nx.cp), first.sizePt);
            last.adv += nk - last.kernAdj;
            last.kernAdj = nk;
          }
          const pv = glyphs[pos - 1];
          if (pv && pv.kernAdj !== undefined && pv.runIdx === first.runIdx && pv.face === first.face) {
            const nk = kernGlyphs(ctx, first.face, pv.ligEnd ?? f.glyphId(pv.cp), grp.gid, first.sizePt);
            pv.adv += nk - pv.kernAdj;
            pv.kernAdj = nk;
          }
          last.adv += delta;
          first.ligStart = grp.gid;
          last.ligEnd = grp.gid;
        }
        pos += grp.len;
      }
    }
    k = e;
  }
}

function kernTwips(ctx: DocContext, face: FontFace, cp: number, next: number, sizePt: number): number {
  const k = face.font.kernTwips(cp, next, sizePt);
  if (!k) return 0;
  if (ctx.opts.advanceEm === 'device') return k;
  return (k * sizePt) / deviceEmPt(sizePt);
}

/** Run com o valor dinâmico de um campo, na formatação do resultado em cache. */
function fieldValueRun(ctx: DocContext, run: Run, v: string, glued: boolean): Run {
  ctx.opts.onField?.(run, v);
  const base = run.fieldResult?.find((r) => !r.image && !r.textbox) ?? run;
  const out: Run = { ...base, text: v, field: undefined, fieldCode: undefined, fieldResult: undefined };
  if (glued) GLUED_FIELD.add(out);
  return out;
}

/** Texto exibido de um campo (resultado em cache ou valor dinâmico). */
function fieldRuns(ctx: DocContext, run: Run, env: ParaEnv, at?: number): Run[] | null {
  const instr = (run.field ?? '').trim();
  const name = instr.split(/\s+/)[0]?.toUpperCase() ?? '';
  // o Word recalcula estes campos ao imprimir/exportar (oráculo fields)
  if (['PAGE', 'NUMPAGES', 'SECTIONPAGES', 'SECTION', 'PAGEREF', 'SEQ', 'REF', 'NOTEREF', 'DATE', 'TIME', 'SAVEDATE', 'CREATEDATE', 'PRINTDATE'].includes(name) || name.endsWith('_MARK')
    // STYLEREF: só no corpo (no cabeçalho depende da página — fica o resultado em cache)
    || (name === 'STYLEREF' && !env.hf)) {
    const v = env.field?.(name, instr, at);
    if (v !== undefined) return [fieldValueRun(ctx, run, v, !!env.hf && name === 'PAGE')];
  }
  // fórmula (= …): no cabeçalho/rodapé o Word recalcula sempre; no corpo, só com
  // campo aninhado no código ({ = { NUMPAGES } - 1 } — lab numpages)
  if (name.startsWith('=') && env.field && (env.hf || hasNestedField(run.fieldCode))) {
    const v = evaluateFieldFormula(run.fieldCode ?? instr, (n, i) => env.field!(n, i, at), ctx.opts.lang);
    if (v !== undefined) return [fieldValueRun(ctx, run, v, false)];
  }
  if (run.fieldResult?.length) {
    // campos aninhados no resultado (PAGEREF dentro do TOC) também são avaliados
    if (!run.fieldResult.some((r) => r.field !== undefined)) return run.fieldResult;
    return run.fieldResult.flatMap((r) => (r.field !== undefined ? fieldRuns(ctx, r, env, at) ?? (r.text ? [r] : []) : [r]));
  }
  return null;
}

/** Marca de largura zero do modelo do editor (indicador, começo/fim de campo que
 *  atravessa parágrafos): não desenha nada. */
export const isMarkRun = (r: Run): boolean => !!(r.bookmark || r.fieldBegin !== undefined || r.fieldEnd);

/** Expande runs de campo no conteúdo exibido. */
function displayRuns(ctx: DocContext, para: Paragraph, env: ParaEnv): { run: Run; idx: number; offset: number }[] {
  const out: { run: Run; idx: number; offset: number }[] = [];
  let offset = 0;
  para.runs.forEach((run, idx) => {
    if (isMarkRun(run)) return;
    if (run.formField?.type === 'checkBox') out.push({ run, idx, offset });
    else if (run.formField?.type === 'dropDown' && run.formField.entries) {
      // FORMDROPDOWN: o Word mostra a entrada escolhida com a formatação do
      // fldChar begin — o resultado em cache é ignorado (oráculo hidetext/ff-dropdown)
      const text = run.formField.entries[run.formField.selected ?? 0] ?? '';
      if (text) out.push({ run: { ...run, text, field: undefined, fieldResult: undefined, formField: undefined }, idx, offset });
    } else if (run.field !== undefined) {
      const fr = fieldRuns(ctx, run, env, offset);
      if (fr) { for (const r of fr) out.push({ run: r, idx, offset }); }
      else if (run.text) out.push({ run, idx, offset });
    } else out.push({ run, idx, offset });
    offset += run.text.length;
  });
  return out;
}

/** Fundo escuro (o texto de cor automática vira branco). */
export function isDark(hex: string | undefined): boolean {
  if (!hex || !/^[0-9A-Fa-f]{6}/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 80;
}

/** Kinsoku: caracteres que não podem terminar a linha (listas padrão do Word para
 *  japonês/chinês/coreano, união). */
const NO_LINE_END = '$([{\u00a3\u00a5\u2018\u201c\u3008\u300a\u300c\u300e\u3010\u3014\u3016\u301d\ufe59\ufe5b\ufe5d\uff04\uff08\uff3b\uff5b\uff62\uffe1\uffe5\uffe6';

/** Fonte do Leste Asiático (CJK): pelo conjunto de caracteres do fontTable, pelo nome
 *  conhecido ou instalada com glifos CJK. */
const CJK_FONT_NAME = /^(ms (p|ui )?(gothic|mincho)|yu (gothic|mincho)|meiryo|hg.*(gothic|mincho)|(p)?mingliu|n?simsun|simhei|kaiti|fangsong|microsoft (yahei|jhenghei)|dengxian|(batang|gulim|dotum|gungsuh)(che)?|malgun gothic|nanum)|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/i;
export function isCjkFont(ctx: DocContext, name: string | undefined): boolean {
  if (!name) return false;
  // o fontTable do documento manda: conjunto de caracteres japonês/coreano/chinês
  const cs = own(ctx.fmt.fontTable, name)?.charset?.toUpperCase();
  if (cs) return ['80', '81', '82', '86', '88'].includes(cs);
  if (CJK_FONT_NAME.test(name)) return true;
  const f = ctx.faces.get(name, false, false);
  return f.family.toLowerCase() === name.toLowerCase() && (f.font.glyphId(0x4e00) !== 0 || f.font.glyphId(0xac00) !== 0);
}

/** A fonte PADRÃO do documento para texto asiático (docDefaults, eastAsia) é do
 *  Leste Asiático? Nos modos ≤ 14 é ela — e não a fonte eastAsia do run — que liga
 *  o layout asiático (kinsoku, pontuação pendurada, compressão: oráculos kinsoku, fecompress) */
function docEastAsiaCjk(ctx: DocContext): boolean {
  const rf = ctx.resolver.docDefaults.rPr?.rFonts;
  const name = fontOfSlot(rf, 'eastAsia', ctx.fmt.theme);
  // sem o conjunto de caracteres no fontTable, as variantes proporcionais/de interface e
  // as novas padrão (MS PGothic, MS PMincho, MS UI Gothic, Meiryo, Malgun Gothic) não ligam
  // o layout asiático — MS Gothic/Mincho, Yu Gothic e SimSun sim (oráculo feknown)
  if (name && !own(ctx.fmt.fontTable, name)?.charset && /^(ms (p|ui )(gothic|mincho)|meiryo|malgun gothic)\b/i.test(name)) return false;
  if (name) return isCjkFont(ctx, name);
  // fonte do tema sem "ea": o Word usa a da escrita do idioma do tema (themeFontLang)
  return !!rf?.eastAsiaTheme && /^(ja|zh|ko)\b/i.test(ctx.fmt.settings.themeFontLang?.eastAsia ?? '');
}

const isCjkLang = (rpr: RPr): boolean => /^(ja|zh|ko)\b/i.test(rpr.lang?.eastAsia ?? '');

/** As regras de quebra do Leste Asiático valem para o texto deste run? Idioma
 *  eastAsia ja/zh/ko; nos modos ≤ 14, também a fonte asiática padrão do documento
 *  (oráculo kinsoku) */
function eastAsianBreakRules(ctx: DocContext, rpr: RPr): boolean {
  if (!isCjkLang(rpr)) return false;
  return ctx.fmt.settings.compatibilityMode >= 15 || docEastAsiaCjk(ctx);
}

/** Pontuação que pode pendurar além da margem direita (w:overflowPunct, layout asiático),
 *  conforme o idioma eastAsia do texto — japonês só vírgula, ponto e aspas de fecho;
 *  chinês/coreano também ) ; : ! ? ] } (e % fora do chinês tradicional) — oráculo hang15.
 *  Com o conjunto alternativo de regras (useAltKinsokuLineBreakRules, só nos modos ≤ 14)
 *  as aspas e o % não penduram e o coreano fica como o japonês (oráculo hangalt) */
const HANG_BASE = ',.\u3001\u3002\uff0c\uff0e';
const HANG_CLOSE = ');:!?]}\uff1a\uff1b\uff1f\uff01\uff09\uff3d\uff5d';
const HANG_QUOTES = '\u201d\u2019';
const hangPunct = (rpr: RPr, alt: boolean): string => {
  const ea = rpr.lang?.eastAsia ?? '';
  if (/^ja/i.test(ea)) return alt ? HANG_BASE : HANG_BASE + HANG_QUOTES;
  if (alt) return /^ko/i.test(ea) ? HANG_BASE : HANG_BASE + HANG_CLOSE;
  return HANG_BASE + HANG_CLOSE + HANG_QUOTES + (/^zh-(tw|hk|mo)/i.test(ea) ? '' : '%');
};

/** Espaços que são oportunidade de quebra no Word: o comum, "en", "em", o de quatro por em,
 *  o de largura zero e o ideográfico — os demais (quads, três e seis por em, figura,
 *  pontuação, fino, finíssimo, matemático) colam como caracteres (oráculo enspace) */
const SPACE_LIKE = new Set([0x20, 0x2002, 0x2003, 0x2005, 0x200b, 0x3000]);

export interface PrepareInput {
  para: Paragraph;
  env: ParaEnv;
}

/** Resolve o pPr final do parágrafo (docDefaults → tabela → estilo → numeração → direto). */
export function resolvePPr(ctx: DocContext, para: Paragraph, env: ParaEnv): { ppr: PPr; styleId?: string; styleRPr: RPr } {
  const dd = ctx.resolver.docDefaults;
  const direct = directPPr(para);
  const styleId = ctx.resolver.paraStyleId(direct.pStyle);
  const st = ctx.resolver.paraStyle(styleId);
  let ppr = mergePPr(dd.pPr, env.tablePPr);
  // numeração: o pPr do nível entra no nível de quem a define — direta: entre o
  // estilo e o direto; do estilo: logo ANTES do estilo que traz o numId (o recuo
  // dele e dos derivados manda; o dos pais, não — oráculo numstyind)
  const numPr = { ...st.pPr.numPr, ...direct.numPr };
  const lvl = numPr.numId ? ctx.numbering.level(numPr.numId, numPr.ilvl ?? 0) : undefined;
  const addLvl = (): void => {
    if (lvl?.pPr) ppr = mergePPr(ppr, { ...lvl.pPr, tabs: undefined });
    if (lvl?.pPr?.tabs) ppr = mergePPr(ppr, { tabs: lvl.pPr.tabs });
  };
  if (numPr.numId && direct.numPr?.numId === undefined) {
    const chain = ctx.resolver.paraChain(styleId);
    let at = -1;
    chain.forEach((s, i) => { if (s.pPr?.numPr?.numId !== undefined) at = i; });
    chain.forEach((s, i) => { if (i === at) addLvl(); ppr = mergePPr(ppr, s.pPr); });
    if (at < 0) addLvl();
  } else {
    ppr = mergePPr(ppr, st.pPr);
    if (numPr.numId) addLvl();
  }
  ppr = mergePPr(ppr, direct);
  ppr.numPr = numPr;
  return { ppr, styleId, styleRPr: st.rPr };
}

/**
 * Texto oculto (w:vanish) sem diagramar e sem efeitos colaterais (numeração):
 * a marca do parágrafo está oculta? há algum run visível com conteúdo?
 */
export function paraVisibility(ctx: DocContext, para0: Paragraph, env: ParaEnv): { markHidden: boolean; visible: boolean } {
  const para = ctx.rev.paragraph(para0);
  const { ppr, styleRPr } = resolvePPr(ctx, para, env);
  const dd = ctx.resolver.docDefaults;
  const runRPr = (rpr: RPr): RPr => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const hidden = (rpr: RPr) => !!rpr.vanish || !!rpr.specVanish;
  const markHidden = hidden(runRPr(ppr.rPr ?? {}));
  const visible = displayRuns(ctx, para, env).some(({ run }) =>
    !!(run.text || run.image || run.shape || run.group || run.textbox || run.formField?.type === 'checkBox' || run.custom || run.ptab || run.noteRef)
    && ctx.rev.run(run) !== 'hide' && !hidden(runRPr(ctx.rev.directRPr(run))));
  return { markHidden, visible };
}

export function prepareParagraph(ctx: DocContext, para0: Paragraph, env0: ParaEnv): PreparedPara {
  // modo Original: a formatação de parágrafo de antes da revisão
  const para = ctx.rev.paragraph(para0);
  const { ppr, styleId, styleRPr } = resolvePPr(ctx, para, env0);
  // sombreamento escuro no parágrafo: o texto de cor automática vira branco
  const shd = ppr.shd;
  const paraFill = shadingFill(shd, ctx.fmt.theme);
  const env: ParaEnv = paraFill && isDark(paraFill) && !env0.darkBackground ? { ...env0, darkBackground: true } : env0;
  const dd = ctx.resolver.docDefaults;
  const settings = ctx.fmt.settings;
  const yenBackslash = !!settings.compat['doNotLeaveBackslashAlone'] && docEastAsiaCjk(ctx);
  // rPr de um run: docDefaults → tabela → estilo de parágrafo → estilo de caractere → direto
  const runRPr = (rpr: RPr): RPr => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const markRpr = runRPr(ppr.rPr ?? {});
  const markStyle = resolveRunStyle(ctx, markRpr, env);
  const markFace = faceFor(ctx, markRpr, 0x20, markStyle);

  const glyphs: Glyph[] = [];
  const pushChars = (text: string, run: Run, rpr: RPr, style: RunStyle, offset0: number, runIdx: number, formText = false) => {
    let t = text;
    if (rpr.caps) t = t.toUpperCase();
    const chars = Array.from(t);
    let off = offset0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;
      // invisíveis de largura zero (BOM/ZWNBSP, ZWJ/ZWNJ): o Word não
      // os desenha nem busca fonte para eles — não mexem na altura da linha; o
      // ZWNBSP ainda cola no anterior: o espaço logo antes deixa de quebrar (invischars)
      if (cp === 0xfeff || cp === 0x200c || cp === 0x200d) {
        const prev = glyphs[glyphs.length - 1];
        if (cp === 0xfeff && prev?.kind === 'space') { prev.kind = 'nbsp'; prev.breakAfter = false; }
        off += ch.length;
        continue;
      }
      let kind: GlyphKind = 'char';
      if (ch === '\t') kind = 'tab';
      else if (ch === '\n' || ch === '\r' || ch === '\u2028') kind = 'lb';
      else if (ch === '\f' || ch === '\u000B') {
        // quebra de página/coluna em célula, cabeçalho ou caixa de texto: o Word ignora
        if (env.noPageBreaks) { off += ch.length; continue; }
        kind = ch === '\f' ? 'pb' : 'cb';
      }
      else if (cp === 0xa0 || cp === 0x202f) kind = 'nbsp';
      else if (cp === 0xad) kind = 'shy';
      // no resultado de campo FORMTEXT os espaços especiais ("en" do campo vazio)
      // são caracteres comuns: nem quebram nem penduram (oráculo formtext, ft-margem)
      else if (SPACE_LIKE.has(cp) && !(cp !== 0x20 && formText)) kind = 'space';
      // versalete: minúsculas viram maiúsculas menores
      let size = style.sizePt;
      let shownCh = ch;
      let shownCp = cp;
      // hífen incondicional (w:noBreakHyphen / U+00AD literal): o Word desenha o
      // HÍFEN da própria fonte (U+002D, mesmo avanço), sem quebra depois (oráculo
      // hidetext/nbh-*) — as fontes comuns nem têm U+2011
      if (cp === 0x2011) shownCp = 0x2d;
      // doNotLeaveBackslashAlone: no texto de idioma eastAsia japonês (com a fonte
      // asiática padrão do documento do Leste Asiático), a barra invertida sai como o
      // iene "¥" (U+00A5) da própria fonte do run (oráculo fejust)
      if (cp === 0x5c && yenBackslash && /^ja/i.test(rpr.lang?.eastAsia ?? '')) { shownCh = '¥'; shownCp = 0xa5; }
      if (rpr.smallCaps && !rpr.caps && ch.toLowerCase() === ch && ch.toUpperCase() !== ch) {
        shownCh = ch.toUpperCase();
        shownCp = shownCh.codePointAt(0)!;
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      } else if (rpr.smallCaps && !rpr.caps && cp === 0x20) {
        // versalete: o ESPAÇO também sai no tamanho reduzido; a pontuação não (oráculo scapskern)
        size = Math.round(style.sizePt * 2 * 0.8) / 2;
      }
      // quebras (inclusive a U+2028 do w:clear) medem com a fonte do run, sem substituta
      const face = faceFor(ctx, rpr, kind === 'lb' ? 0x20 : shownCp, style, run.symFont);
      // .notdef da Calibri no lugar do código privado: a altura da linha segue a fonte do run
      const m = faceMetrics(notdefPua(face, shownCp) ? faceFor(ctx, rpr, 0x41, style).font : face.font);
      let adv = 0;
      let kernAdj: number | undefined;
      if (kind === 'char' || kind === 'space' || kind === 'nbsp') {
        const hs = rpr.w && rpr.w !== 100 ? rpr.w : 100;
        adv = advanceTwips(ctx, face, shownCp, size, hs);
        // negrito sintético (sem face negrita): +1/2048 em por glifo (oráculo synthbold)
        if (face.synthBold) adv += ((size * 20) / 2048) * (hs / 100);
        const next = chars[i + 1];
        // o espaço também kerneia (Arial: " T", " Y", " A" — oráculo kern). Com ligaduras
        // OpenType (w14:ligatures ≠ none) o Word só usa o 'kern' do script latino do GPOS:
        // fonte que o registra só em outros scripts (Tahoma, Open Sans) não kerneia (oráculo kernlig)
        const lig = (rpr as { ligatures?: string }).ligatures;
        const kernOff = !!lig && lig !== 'none' && (face.font as { kernInLatin?: boolean }).kernInLatin === false;
        if (next && (kind === 'char' || kind === 'space') && rpr.kern && style.sizePt * 2 >= rpr.kern && !kernOff) {
          // versalete: o par é o dos glifos DESENHADOS — a minúscula seguinte também vira
          // maiúscula (oráculo sckern2); maiúscula (corpo cheio) ao lado de minúscula (corpo
          // reduzido) não kerneia (oráculo sckmix)
          const sc = rpr.smallCaps && !rpr.caps;
          const lower = sc && next.toLowerCase() === next && next.toUpperCase() !== next && next.toUpperCase().length === 1;
          const nextShown = lower ? next.toUpperCase() : next;
          const nextSize = sc && (lower || next === ' ') ? Math.round(style.sizePt * 2 * 0.8) / 2 : style.sizePt;
          kernAdj = sc && nextSize !== size ? 0 : kernTwips(ctx, face, shownCp, nextShown.codePointAt(0)!, size);
          adv += kernAdj;
        }
        if (rpr.spacing) adv += spacingTwips(ctx, rpr.spacing);
        // seletor de variação (U+FE00–FE0F, ex.: emoji "⚠️"): largura zero (oráculo hidetext/emoji)
        if (cp >= 0xfe00 && cp <= 0xfe0f) adv = 0;
      }
      // hífen/travessão: quebra depois se o caractere seguinte não é espaço — letra,
      // dígito, pontuação ou símbolo ("abc-_def", "abc–(def": oráculo dashsym)
      const breakAfter = kind === 'space' || kind === 'tab' || kind === 'shy'
        || ((cp === 0x2d || cp === 0x2013 || cp === 0x2014) && i + 1 < chars.length && !NO_BREAK_AFTER_DASH.test(chars[i + 1]!))
        || CJK(cp);
      glyphs.push({
        kind, ch: shownCh, cp: shownCp, face, style, adv,
        // sobrescrito/subscrito não mudam a altura da linha (medido no Word):
        // a linha mede como se o texto estivesse no corpo original; w:position mede
        ...vMetrics(m, style),
        offset: off, runIdx, breakAfter, sizePt: size,
        ...(cp === 0x2028 ? { clear: true } : {}),
        ...(kernAdj !== undefined ? { kernAdj } : {}),
      });
      off += ch.length;
    }
  };

  // equação de exibição (m:oMathPara): glifos na fonte de matemática, a fração é um
  // glifo com a caixa diagramada; o w:br e cada m:oMath seguinte quebram a linha
  let mathJc: string | undefined;
  const mathRuns = new Set<number>();
  const pushMath = (run: Run, runIdx: number, offset0: number): void => {
    const zone = run.math!;
    mathJc = zone.jc ?? 'centerGroup';
    mathRuns.add(runIdx);
    const menv: MathEnv = {
      styleOf: (r) => {
        // sem ligaduras, espaçamento e escala: o Word não os aplica na equação (o
        // kerning do w:kern sim — oráculo omath/om-12-kern)
        const mr: RPr & { ligatures?: string } = { ...runRPr(r ?? {}) };
        delete mr.spacing; delete mr.w; delete mr.ligatures;
        return { rpr: mr, style: resolveRunStyle(ctx, mr, env) };
      },
      face: (bold, italic) => ctx.faces.get(MATH_FONT, bold, italic),
      adv: (face, cp, size) => advanceTwips(ctx, face, cp, size),
      kern: (face, cp, next, size) => kernTwips(ctx, face, cp, next, size),
    };
    const last = Math.max(0, run.text.length - 1);
    const off = { n: 0 };
    let seg: typeof zone.nodes = [];
    const flushSeg = (): void => {
      for (const a of mathAtoms(menv, seg, 'D', 1, off)) {
        const tm = mathTextMetrics(a.face);
        const tA = tm.ascent * a.sizePt * 20, tD = tm.descent * a.sizePt * 20;
        const g: Glyph = { kind: 'char', ch: String.fromCodePoint(a.cp), cp: a.cp, face: a.face, style: a.style, adv: a.adv, asc: tA, desc: tD, offset: offset0 + Math.min(a.offset, last), runIdx, breakAfter: false, sizePt: a.sizePt };
        // a fração entra na linha com a caixa dela; a entrelinha múltipla segue o texto
        if (a.box) Object.assign(g, { asc: Math.max(tA, a.box.lineTop), desc: Math.max(tD, a.box.lineBottom), nAsc: tA, nDesc: tD, math: a.box });
        glyphs.push(g);
      }
      seg = [];
    };
    for (const nd of zone.nodes) {
      if (nd.t !== 'br') { seg.push(nd); continue; }
      flushSeg();
      const { style: bs } = menv.styleOf(nd.rpr);
      const bf = menv.face(false, false);
      const tm = mathTextMetrics(bf);
      glyphs.push({ kind: 'lb', ch: '\n', cp: 10, face: bf, style: bs, adv: 0, asc: tm.ascent * bs.sizePt * 20, desc: tm.descent * bs.sizePt * 20, offset: offset0 + Math.min(off.n, last), runIdx, breakAfter: true, sizePt: bs.sizePt });
    }
    flushSeg();
  };

  /** nota de rodapé de marca personalizada: vai no 1º glifo da marca (texto seguinte) */
  let pendingNote: number | undefined;
  for (const { run, idx, offset } of displayRuns(ctx, para, env)) {
    // revisões: o texto que a visão esconde (excluído na final, inserido na
    // original) sai como o oculto — sem glifo, offsets intactos
    const rev = ctx.rev.run(run);
    if (rev === 'hide') continue;
    // (referência de nota: o sobrescrito que o leitor põe nas props não é
    // formatação — editBaseProps; vale o estilo/rPr do documento, oráculo fnrefsup)
    const direct = ctx.rev.directRPr(run);
    // entradas de sumário (TOC): o Word não aplica o estilo Hyperlink
    if (run.inToc && direct.rStyle && isHyperlinkStyle(ctx, direct.rStyle)) delete direct.rStyle;
    const rpr = runRPr(direct);
    const style = resolveRunStyle(ctx, rpr, env, run.props.link);
    if (style.hidden) continue;
    if (rev) {
      // marcação: a cor do autor vence a do run; inserção sublinhada, exclusão tachada
      // (movimentação: duplos) — oráculo revisions-render
      style.color = rev.color;
      style.autoColor = false;
      if (rev.kind === 'ins') style.underline = { val: rev.move ? 'double' : 'single' };
      else { style.strike = !rev.move; style.dstrike = rev.move; }
    }
    if (run.image || run.shape || run.group || run.textbox) {
      const floating = run.image?.floating ?? run.shape?.floating ?? run.group?.floating ?? run.textbox?.floating;
      const face = faceFor(ctx, rpr, 0x20, style);
      if (floating) {
        // âncora: ocupa 0 no fluxo, registra o objeto no parágrafo
        glyphs.push({ kind: 'obj', ch: '', cp: 0xfffc, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: false, obj: run, sizePt: style.sizePt });
        continue;
      }
      // margem de efeitos em linha: soma ao avanço (l/r) e à altura (t/b) — oráculo effext
      const ie = run.image?.inlineEffect ?? run.shape?.inlineEffect;
      const w = (run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0) + (ie ? ie.l + ie.r : 0);
      const h = (run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0) + (ie ? ie.t + ie.b : 0);
      // linha horizontal VML (o:hr): sem largura no fluxo, sozinha na linha (oráculo vmlhr)
      if (run.shape?.hr) {
        glyphs.push({ kind: 'obj', ch: '￼', cp: 0xfffc, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, obj: run, sizePt: style.sizePt, hr: h });
        continue;
      }
      const m = faceMetrics(face.font);
      glyphs.push({
        kind: 'obj', ch: '￼', cp: 0xfffc, face, style, adv: w,
        asc: Math.max(0, h + style.shift), desc: Math.max(0, -style.shift), // a imagem fica na baseline: sem descendente (medido)
        offset, runIdx: idx, breakAfter: true, obj: run, sizePt: style.sizePt,
      });
      continue;
    }
    if (run.formField?.type === 'checkBox') {
      // caixa de seleção legada (medido no Word: lado ≈ 1,07 × corpo; avanço = lado + 0,9pt)
      const face = faceFor(ctx, rpr, 0x20, style);
      const size = run.formField.sizeAuto || !run.formField.sizeHalfPt ? style.sizePt : run.formField.sizeHalfPt / 2;
      const side = 1.07 * size * 20;
      // na linha, a caixa mede como um caractere da fonte do run no tamanho da caixa
      const fm = faceMetrics(face.font);
      glyphs.push({
        kind: 'box', ch: '☐', cp: 0x2610, face, style, adv: side + 18,
        asc: fm.ascent * size * 20, desc: fm.descent * size * 20,
        offset, runIdx: idx, breakAfter: false, sizePt: style.sizePt, box: { side, checked: !!run.formField.checked },
      });
      continue;
    }
    if (run.custom) {
      const face = faceFor(ctx, rpr, 0x20, style);
      const text = run.custom.fallbackText || ' ';
      const before = glyphs.length;
      pushChars(text, run, rpr, style, offset, idx);
      // inline atômico: a linha não quebra dentro do texto de reserva (espaços viram não separáveis)
      for (let k = before; k < glyphs.length - 1; k++) {
        const g = glyphs[k]!;
        if (g.kind === 'space') g.kind = 'nbsp';
        g.breakAfter = false;
      }
      continue;
    }
    if (run.ptab) {
      const face = faceFor(ctx, rpr, 0x20, style);
      glyphs.push({ kind: 'tab', ch: '\t', cp: 9, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, ptab: run.ptab, sizePt: style.sizePt });
      continue;
    }
    if (run.noteRef) {
      // marca exibida = ordem de referência no documento, no formato da seção (não o
      // id nem o texto do run — no editor ele só guarda o lugar da marca); com marca
      // personalizada o texto que segue é a marca (e não consome número)
      const { kind, id, custom } = run.noteRef;
      const mark = ctx.noteMark(kind, id, custom);
      if (custom) { if (kind === 'footnote') pendingNote = id; continue; }
      const before = glyphs.length;
      pushChars(mark, run, rpr, style, offset, idx);
      // a marca inteira é UM caractere do run (cursor/seleção não entram nela)
      for (let k = before; k < glyphs.length; k++) { glyphs[k]!.offset = offset; if (kind === 'footnote') glyphs[k]!.noteId = id; }
      continue;
    }
    if (run.math) { pushMath(run, idx, offset); continue; }
    const before = glyphs.length;
    pushChars(run.text, run, rpr, style, offset, idx, /^\s*FORMTEXT\b/i.test(para.runs[idx]?.field ?? ''));
    if (GLUED_FIELD.has(run)) for (let k = before + 1; k < glyphs.length; k++) glyphs[k]!.glue = true;
    // número da própria nota (w:footnoteRef): também um caractere só
    if (/_MARK\s*$/.test(para.runs[idx]?.field ?? '')) for (let k = before; k < glyphs.length; k++) glyphs[k]!.offset = offset;
    if (pendingNote !== undefined && glyphs.length > before) { glyphs[before]!.noteId = pendingNote; pendingNote = undefined; }
  }
  // objeto inline (imagem, forma…) colado ao texto: pode quebrar ANTES dele (o
  // objeto desce sozinho), salvo depois de NBSP (oráculo imgbreak)
  for (let k = 1; k < glyphs.length; k++) {
    if (glyphs[k]!.kind !== 'obj' || glyphs[k]!.adv <= 0) continue;
    let j = k - 1;
    while (j > 0 && glyphs[j]!.kind === 'obj' && glyphs[j]!.adv === 0) j--; // âncoras de flutuantes não contam
    const pv = glyphs[j]!;
    if (!pv.breakAfter && pv.kind !== 'nbsp' && !(pv.kind === 'obj' && pv.adv === 0)) pv.breakAfter = true;
  }
  // hífen/travessão no FIM de um run: a quebra depois dele depende do caractere
  // seguinte no parágrafo, ainda que em outro run (oráculo breakopp)
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k]!, nx = glyphs[k + 1]!;
    if (!g.breakAfter && g.kind === 'char' && (g.cp === 0x2d || g.cp === 0x2013 || g.cp === 0x2014) && g.ch !== '\u2011'
      && g.runIdx !== nx.runIdx && nx.kind === 'char' && !NO_BREAK_AFTER_DASH.test(nx.ch)) g.breakAfter = true;
  }
  applyLigatures(ctx, glyphs);
  // kerning na fronteira de dois runs: o par kerneia se a face, o corpo, o idioma e o
  // kerning dos dois batem — cor, sublinhado, estilo de caractere não importam (oráculo kernrun)
  for (let k = 0; k + 1 < glyphs.length; k++) {
    const g = glyphs[k]!, nx = glyphs[k + 1]!;
    if (g.runIdx === nx.runIdx || (g.kind !== 'char' && g.kind !== 'space') || (nx.kind !== 'char' && nx.kind !== 'space')) continue;
    const a = g.style.rpr, b = nx.style.rpr;
    if (g.face !== nx.face || g.sizePt !== nx.sizePt || g.style.sizePt !== nx.style.sizePt || g.style.shift !== nx.style.shift) continue;
    if (!a.kern || !b.kern || g.style.sizePt * 2 < a.kern || nx.style.sizePt * 2 < b.kern) continue;
    if ((a.lang?.val ?? '') !== (b.lang?.val ?? '') || (a.w ?? 100) !== (b.w ?? 100)) continue;
    const lig = (a as { ligatures?: string }).ligatures;
    if (lig && lig !== 'none' && (g.face.font as { kernInLatin?: boolean }).kernInLatin === false) continue;
    g.adv += g.ligEnd !== undefined || nx.ligStart !== undefined
      ? kernGlyphs(ctx, g.face, g.ligEnd ?? g.face.font.glyphId(g.cp), nx.ligStart ?? g.face.font.glyphId(nx.cp), g.sizePt)
      : kernTwips(ctx, g.face, g.cp, nx.cp, g.sizePt);
  }
  // espaços comuns encostados num NBSP (antes ou depois — a sequência inteira de
  // espaços): não quebram, a palavra de cada lado fica junta (oráculo nbspglue)
  for (let k = 0; k < glyphs.length; k++) {
    if (glyphs[k]!.kind !== 'space') continue;
    let e = k;
    while (e + 1 < glyphs.length && glyphs[e + 1]!.kind === 'space') e++;
    if (glyphs[k - 1]?.kind === 'nbsp' || glyphs[e + 1]?.kind === 'nbsp') for (let j = k; j <= e; j++) glyphs[j]!.breakAfter = false;
    k = e;
  }
  // kinsoku (regras de quebra do Leste Asiático): a linha não termina em "$", "(",
  // "“", "£"… — o espaço depois deles não quebra ("R$ 100" desce junto). Vale
  // com idioma eastAsia ja/zh/ko no run; no modo ≤ 14, só se a fonte asiática
  // padrão do documento também for do Leste Asiático; w:kinsoku desligado no
  // parágrafo tira (doNotUseEastAsianBreakRules não — oráculo kinsoku)
  if (ppr.kinsoku !== false) {
    for (let k = 1; k < glyphs.length; k++) {
      if (glyphs[k]!.kind !== 'space' || glyphs[k - 1]!.kind !== 'char') continue;
      const pv = glyphs[k - 1]!;
      if (!NO_LINE_END.includes(pv.ch) || !eastAsianBreakRules(ctx, pv.style.rpr)) continue;
      for (let j = k; j < glyphs.length && glyphs[j]!.kind === 'space'; j++) glyphs[j]!.breakAfter = false;
    }
  }
  // layout asiático dos modos ≤ 14 (fonte asiática padrão do documento CJK — oráculo
  // fecompress): com characterSpacingControl ≠ doNotCompress, o espaço comprime até
  // METADE da largura média (OS/2 xAvgCharWidth) da sua fonte — com
  // balanceSingleByteDoubleByteWidth, até ¼ de em —, para a palavra caber, também no
  // alinhado à esquerda; com idioma eastAsia ja/zh/ko, a pontuação final (",", ".",
  // ")"…) pode pendurar além da margem (w:overflowPunct) — no modo 15, só no
  // justificado, somando-se aos 25% de compressão (oráculo hang15)
  if (docEastAsiaCjk(ctx)) {
    const compress = settings.compatibilityMode < 15 && !!settings.characterSpacingControl && settings.characterSpacingControl !== 'doNotCompress';
    const balance = !!settings.compat['balanceSingleByteDoubleByteWidth'];
    const altKinsoku = settings.compatibilityMode < 15 && !!settings.compat['useAltKinsokuLineBreakRules'];
    // com balanceSingleByteDoubleByteWidth, espaços comuns SEGUIDOS (dois ou mais)
    // medem meio em cada — dois valem um caractere de largura dupla — e não comprimem
    // nem expandem no justificado; o espaço isolado fica com a largura da fonte. Nos
    // modos 14 e 15, qualquer que seja a fonte asiática (oráculo fejust)
    if (balance) for (let k = 0; k < glyphs.length; k++) {
      if (glyphs[k]!.kind !== 'space' || glyphs[k]!.cp !== 0x20) continue;
      let e = k;
      while (e + 1 < glyphs.length && glyphs[e + 1]!.kind === 'space' && glyphs[e + 1]!.cp === 0x20) e++;
      // no início do parágrafo, até o espaço isolado mede meio em (oráculo felead)
      const lead = glyphs.slice(0, k).every((q) => q.kind === 'obj' && q.adv === 0);
      if (e > k || lead) for (let j = k; j <= e; j++) {
        const g = glyphs[j]!;
        g.adv = g.sizePt * 10 + spacingTwips(ctx, g.style.rpr.spacing ?? 0);
        g.fixed = true;
      }
      k = e;
    }
    // modos ≤ 14 com compressão: o hífen e o travessão não são oportunidade de quebra; o
    // meia-risca é no modo 14, não nos ≤ 12 (oráculo fejust)
    if (compress) {
      for (const g of glyphs) {
        if (g.kind === 'char' && (g.cp === 0x2d || g.cp === 0x2014 || (g.cp === 0x2013 && settings.compatibilityMode < 14))) g.breakAfter = false;
      }
    }
    for (const g of glyphs) {
      if (compress && g.kind === 'space' && g.cp === 0x20 && !g.fixed) {
        const xAvg = (g.face.font.metrics as { xAvgCharWidth?: number }).xAvgCharWidth;
        const minSp = balance ? g.sizePt * 20 / 4 : xAvg ? (xAvg * g.sizePt * 20) / g.face.font.metrics.unitsPerEm / 2 : undefined;
        if (minSp !== undefined) g.feShrink = Math.max(0, g.adv - minSp);
      } else if (g.kind === 'char' && ppr.overflowPunct !== false && isCjkLang(g.style.rpr) && hangPunct(g.style.rpr, altKinsoku).includes(g.ch)) g.hang = true;
    }
  }

  // hifenização automática (w:autoHyphenation): pontos de quebra nas palavras
  markHyphenation(ctx, ppr, glyphs, mathRuns, para0);

  // marcador de numeração
  let marker: ParaMarker | undefined;
  const numId = ppr.numPr?.numId;
  if (numId && env.numbering !== false && !env.continuation) {
    let nm: NumberMarker | null = ctx.numbering.next(numId, ppr.numPr?.ilvl ?? 0);
    if (!nm && (numId === 1001 || numId === 1002)) {
      // lista criada pelo editor (numId sintético): marcador padrão
      const ilvl = ppr.numPr?.ilvl ?? 0;
      nm = { text: numId === 1001 ? ['•', 'o', '▪'][ilvl % 3]! : '1.', level: { ilvl, numFmt: numId === 1001 ? 'bullet' : 'decimal', suff: 'tab' }, numId, ilvl, listKey: 'synthetic' };
    }
    if (nm && (nm.text || nm.level.lvlPicBulletId !== undefined)) {
      // rPr do marcador: marca do parágrafo + rPr do nível (sem sublinhado herdado do texto)
      const lvlRpr = nm.level.rPr ?? {};
      const mrpr = mergeRPr(markRpr, lvlRpr);
      const ms = resolveRunStyle(ctx, mrpr, env);
      const mg: Glyph[] = [];
      let w = 0;
      // marcador de imagem (w:lvlPicBulletId): a figura no lugar do caractere — altura = corpo
      // do nível − 2 pt, largura pela proporção, o pé na linha de base; a altura entra na
      // ascendente da linha (oráculo home-lab picbullet: 6→4, 8→6, 11→9, 14→12, 30→28, 48→46 pt)
      const pb = nm.level.lvlPicBulletId !== undefined ? ctx.fmt.numbering.picBullets?.[nm.level.lvlPicBulletId] : undefined;
      if (pb?.image) {
        const hTw = Math.max(1, ms.sizePt - 2) * 20;
        const ratio = pb.widthPt && pb.heightPt ? pb.widthPt / pb.heightPt : 1;
        const wTw = hTw * ratio;
        const face = faceFor(ctx, mrpr, 0x41, ms);
        const run: Run = { text: '\uFFFC', props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false }, image: { data: pb.image.data, ext: pb.image.ext, widthTwips: wTw, heightTwips: hTw } };
        mg.push({ kind: 'obj', ch: '\uFFFC', cp: 0xfffc, face, style: { ...ms, shift: 0 }, adv: wTw, asc: hTw, desc: 0, offset: -1, runIdx: -1, breakAfter: false, sizePt: ms.sizePt, obj: run });
        w += wTw;
      }
      for (const ch of pb?.image ? [] : Array.from(nm.text)) {
        const cp = ch.codePointAt(0)!;
        const face = faceFor(ctx, mrpr, cp, ms);
        const m = faceMetrics(notdefPua(face, cp) ? faceFor(ctx, mrpr, 0x41, ms).font : face.font);
        // escala (w:w) e espaçamento (w:spacing) do rPr do nível também valem no número (oráculo numrpr)
        let adv = advanceTwips(ctx, face, cp, ms.sizePt, mrpr.w && mrpr.w !== 100 ? mrpr.w : 100);
        if (mrpr.spacing) adv += spacingTwips(ctx, mrpr.spacing);
        mg.push({ kind: 'char', ch, cp, face, style: ms, adv, asc: m.ascent * ms.sizePt * 20, desc: m.descent * ms.sizePt * 20, offset: -1, runIdx: -1, breakAfter: false, sizePt: ms.sizePt });
        w += adv;
      }
      marker = { text: nm.text, glyphs: mg, width: w, level: nm.level, suff: nm.level.suff ?? 'tab', jc: nm.level.lvlJc ?? 'left', ...(nm.chapter !== undefined ? { chapter: nm.chapter } : {}) };
    }
  }

  const ind = ppr.ind ?? {};
  const sp = ppr.spacing ?? {};
  let jc = ppr.jc ?? 'left';
  if (jc === 'start') jc = 'left';
  if (jc === 'end') jc = 'right';
  let firstLine = env.continuation ? 0 : ind.hanging !== undefined ? -ind.hanging : (ind.firstLine ?? 0);
  // equação de exibição sozinha no parágrafo: alinhada pelo m:jc (centerGroup: no
  // centro) entre os recuos, sem o da 1ª linha — o w:jc do parágrafo não vale (oráculo omath)
  if (mathJc && !glyphs.some((g) => !mathRuns.has(g.runIdx) && g.kind !== 'lb' && g.kind !== 'pb' && g.kind !== 'space' && !(g.kind === 'obj' && g.adv === 0))) {
    jc = mathJc === 'left' ? 'left' : mathJc === 'right' ? 'right' : 'center';
    firstLine = 0;
  }
  const revBars = revisionRanges(ctx.rev, para);
  return {
    para, ppr, styleId, markStyle, markFace, glyphs, marker,
    ...(revBars ? { revBars } : {}),
    indLeft: ind.left ?? 0,
    indRight: ind.right ?? 0,
    firstLine,
    jc,
    tabs: (ppr.tabs ?? []).filter((t) => t.val !== 'clear'),
    spaceBefore: env.continuation ? 0 : sp.before ?? 0,
    spaceAfter: sp.after ?? 0,
    // w:doNotUseHTMLParagraphAutoSpacing: o automático ("HTML", 14 pt) não vale — ficam os
    // w:before/w:after explícitos (oráculo autosphtml)
    beforeAuto: !env.continuation && !!sp.beforeAutospacing && !settings.compat['doNotUseHTMLParagraphAutoSpacing'],
    afterAuto: !!sp.afterAutospacing && !settings.compat['doNotUseHTMLParagraphAutoSpacing'],
    lineRule: sp.lineRule ?? 'auto',
    line: sp.line ?? 240,
    contextual: !!ppr.contextualSpacing,
    keepNext: !!ppr.keepNext,
    keepLines: !!ppr.keepLines,
    widowControl: ppr.widowControl ?? false,
    pageBreakBefore: !env.continuation && !!ppr.pageBreakBefore,
    empty: glyphs.every((g) => g.kind === 'pb' || g.kind === 'obj' && !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating)),
  };
  void settings;
}

export { resolveDrawingColor };
export type { ResolvedStyle };
