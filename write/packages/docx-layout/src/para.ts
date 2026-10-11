import type {
  Paragraph, Run, RPr, PPr, TabSpec, InlineImage, NumLevel, ResolvedStyle,
} from '@universal-office/docx-core';
import { DocContext, directPPr, directRPr } from './context.js';
import { cascadeRPr, mergePPr, mergeRPr, fontOfSlot, resolveColor, highlightHex, resolveDrawingColor, own } from './resolve.js';
import { faceMetrics, deviceEmPt, superscriptRaiseFor, subscriptDropPt, type FontFace } from './fonts.js';
import type { NumberMarker } from './numbering.js';

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
  /** pontuação que pode pendurar além da margem no fim da linha */
  hang?: boolean;
}

export interface ParaMarker {
  text: string;
  glyphs: Glyph[];
  width: number;
  level: NumLevel;
  suff: 'tab' | 'space' | 'nothing';
  jc: string;
  picBullet?: InlineImage;
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
}

export interface ParaEnv {
  /** pPr/rPr do estilo de tabela (condicionais já mesclados) para parágrafos em células */
  tablePPr?: PPr;
  tableRPr?: RPr;
  /** valor dos campos dinâmicos (PAGE, NUMPAGES…) */
  field?: (name: string, instr?: string) => string | undefined;
  /** numerar (false no cabeçalho reaproveitado em cada página) */
  numbering?: boolean;
  /** cor de fundo escura (cor automática vira branco) */
  darkBackground?: boolean;
  /** fluxo sem paginação (célula, cabeçalho/rodapé, caixa): quebras de página/coluna não quebram */
  noPageBreaks?: boolean;
}

const CJK = (cp: number) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xffef) || (cp >= 0x3000 && cp <= 0x303f);
/** Depois de hífen/travessão NÃO há quebra se vem espaço (quebra no espaço), NBSP
 *  (cola), tab ou quebra de linha; com qualquer outro caractere há (oráculo dashsym). */
const NO_BREAK_AFTER_DASH = /^[\s\u00a0\u202f\u2000-\u200b\u3000\ufeff\u00ad]$/u;
const CS = (cp: number) => (cp >= 0x0590 && cp <= 0x08ff) || (cp >= 0xfb1d && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);

const FALLBACK_FAMILIES = ['Segoe UI Symbol', 'Segoe UI Emoji', 'Arial Unicode MS', 'MS Gothic', 'Cambria Math', 'Segoe UI', 'Arial'];

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
  const u = rpr.u && rpr.u.val !== 'none' && rpr.u.val !== '' ? { val: rpr.u.val, ...(rpr.u.color && rpr.u.color !== 'auto' ? { color: rpr.u.color } : {}) } : undefined;
  const shd = rpr.shd?.fill && rpr.shd.fill !== 'auto' ? rpr.shd.fill : undefined;
  const style: RunStyle = {
    rpr,
    sizePt,
    color: color ?? (env.darkBackground ? 'FFFFFF' : '000000'),
    autoColor: !color,
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
  if (va === 'superscript' || va === 'subscript') {
    // medido no Word (oráculo supraise): elevação/queda pela fonte do PRÓPRIO run
    const face = faceFor(ctx, rpr, 0x41, style);
    style.shift += va === 'superscript' ? superscriptRaiseFor(face.family, faceMetrics(face.font), sz, sizePt) * 20 : -subscriptDropPt(face.family, sz) * 20;
  }
  return style;
}

/** Face do caractere (slot por faixa Unicode) com fallback de glifo ausente. */
function faceFor(ctx: DocContext, rpr: RPr, cp: number, style: RunStyle, symFont?: string): FontFace {
  const theme = ctx.fmt.theme;
  let family: string | undefined;
  let bold = style.bold, italic = style.italic;
  if (symFont && cp >= 0xf000 && cp <= 0xf0ff) family = symFont;
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
  if (cp >= 0xf000 && cp <= 0xf0ff && face.font.glyphId(cp - 0xf000) !== 0) return face;
  for (const fb of FALLBACK_FAMILIES) {
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

export function advanceTwips(ctx: DocContext, face: FontFace, cp: number, sizePt: number): number {
  const f = face.font;
  let gid = f.glyphId(cp);
  if (gid === 0 && cp >= 0xf000 && cp <= 0xf0ff) gid = f.glyphId(cp - 0xf000);
  if (gid === 0 && SPACE_WIDTHS[cp] !== undefined) {
    const sw = SPACE_WIDTHS[cp]!;
    if (typeof sw === 'string') return advanceTwips(ctx, face, sw.codePointAt(0)!, sizePt) * (cp === 0x202f ? 0.5 : 1);
    return sw * sizePt * 20;
  }
  const units = f.advanceWidth(gid);
  const em = ctx.opts.advanceEm === 'device' ? deviceEmPt(sizePt) : sizePt;
  const tw = (units * em * 20) / f.metrics.unitsPerEm;
  switch (ctx.opts.advanceRound) {
    case 'twip': return Math.round(tw);
    case 'twipFloor': return Math.floor(tw);
    case 'twipCeil': return Math.ceil(tw);
    case 'dev600': return Math.round(tw / 2.4) * 2.4;
    case 'half': return Math.round(tw * 2) / 2;
    default: return tw;
  }
}

function kernTwips(ctx: DocContext, face: FontFace, cp: number, next: number, sizePt: number): number {
  const k = face.font.kernTwips(cp, next, sizePt);
  if (!k) return 0;
  if (ctx.opts.advanceEm === 'device') return k;
  return (k * sizePt) / deviceEmPt(sizePt);
}

/** Texto exibido de um campo (resultado em cache ou valor dinâmico). */
function fieldRuns(run: Run, env: ParaEnv): Run[] | null {
  const instr = (run.field ?? '').trim();
  const name = instr.split(/\s+/)[0]?.toUpperCase() ?? '';
  // o Word recalcula estes campos ao imprimir/exportar (oráculo fields)
  if (['PAGE', 'NUMPAGES', 'SECTIONPAGES', 'SECTION', 'PAGEREF', 'SEQ', 'REF', 'DATE', 'TIME', 'SAVEDATE', 'CREATEDATE', 'PRINTDATE'].includes(name) || name.endsWith('_MARK')) {
    const v = env.field?.(name, instr);
    if (v !== undefined) {
      const base = run.fieldResult?.find((r) => !r.image && !r.textbox) ?? run;
      return [{ ...base, text: v, field: undefined, fieldResult: undefined }];
    }
  }
  if (run.fieldResult?.length) {
    // campos aninhados no resultado (PAGEREF dentro do TOC) também são avaliados
    if (!run.fieldResult.some((r) => r.field !== undefined)) return run.fieldResult;
    return run.fieldResult.flatMap((r) => (r.field !== undefined ? fieldRuns(r, env) ?? (r.text ? [r] : []) : [r]));
  }
  return null;
}

/** Expande runs de campo no conteúdo exibido. */
function displayRuns(para: Paragraph, env: ParaEnv): { run: Run; idx: number; offset: number }[] {
  const out: { run: Run; idx: number; offset: number }[] = [];
  let offset = 0;
  para.runs.forEach((run, idx) => {
    if (run.formField?.type === 'checkBox') out.push({ run, idx, offset });
    else if (run.formField?.type === 'dropDown' && run.formField.entries) {
      // FORMDROPDOWN: o Word mostra a entrada escolhida com a formatação do
      // fldChar begin — o resultado em cache é ignorado (oráculo hidetext/ff-dropdown)
      const text = run.formField.entries[run.formField.selected ?? 0] ?? '';
      if (text) out.push({ run: { ...run, text, field: undefined, fieldResult: undefined, formField: undefined }, idx, offset });
    } else if (run.field !== undefined) {
      const fr = fieldRuns(run, env);
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

const SPACE_LIKE = new Set([0x20, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x200b, 0x205f, 0x3000]);

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
export function paraVisibility(ctx: DocContext, para: Paragraph, env: ParaEnv): { markHidden: boolean; visible: boolean } {
  const { ppr, styleRPr } = resolvePPr(ctx, para, env);
  const dd = ctx.resolver.docDefaults;
  const runRPr = (rpr: RPr): RPr => cascadeRPr(dd.rPr, [env.tableRPr, styleRPr, ctx.resolver.charStyle(rpr.rStyle)], rpr);
  const hidden = (rpr: RPr) => !!rpr.vanish || !!rpr.specVanish;
  const markHidden = hidden(runRPr(ppr.rPr ?? {}));
  const visible = displayRuns(para, env).some(({ run }) =>
    !!(run.text || run.image || run.shape || run.group || run.textbox || run.formField?.type === 'checkBox' || run.custom || run.ptab || run.noteRef)
    && !hidden(runRPr(directRPr(run))));
  return { markHidden, visible };
}

export function prepareParagraph(ctx: DocContext, para: Paragraph, env0: ParaEnv): PreparedPara {
  const { ppr, styleId, styleRPr } = resolvePPr(ctx, para, env0);
  // sombreamento escuro no parágrafo: o texto de cor automática vira branco
  const shd = ppr.shd;
  const paraFill = shd?.fill && shd.fill !== 'auto' ? shd.fill
    : shd?.themeFill ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, ctx.fmt.theme) : undefined;
  const env: ParaEnv = paraFill && isDark(paraFill) && !env0.darkBackground ? { ...env0, darkBackground: true } : env0;
  const dd = ctx.resolver.docDefaults;
  const settings = ctx.fmt.settings;
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
      const m = faceMetrics(face.font);
      let adv = 0;
      if (kind === 'char' || kind === 'space' || kind === 'nbsp') {
        adv = advanceTwips(ctx, face, shownCp, size);
        // negrito sintético (sem face negrita): +1/2048 em por glifo (oráculo synthbold)
        if (face.synthBold) adv += (size * 20) / 2048;
        if (rpr.w && rpr.w !== 100) adv *= rpr.w / 100;
        const next = chars[i + 1];
        // o espaço também kerneia (Arial: " T", " Y", " A" — oráculo kern). Com ligaduras
        // OpenType (w14:ligatures ≠ none) o Word só usa o 'kern' do script latino do GPOS:
        // fonte que o registra só em outros scripts (Tahoma, Open Sans) não kerneia (oráculo kernlig)
        const lig = (rpr as { ligatures?: string }).ligatures;
        const kernOff = !!lig && lig !== 'none' && (face.font as { kernInLatin?: boolean }).kernInLatin === false;
        if (next && (kind === 'char' || kind === 'space') && rpr.kern && style.sizePt * 2 >= rpr.kern && !kernOff) {
          adv += kernTwips(ctx, face, shownCp, next.codePointAt(0)!, size);
        }
        if (rpr.spacing) adv += rpr.spacing;
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
      });
      off += ch.length;
    }
  };

  for (const { run, idx, offset } of displayRuns(para, env)) {
    const direct = directRPr(run);
    // referência de nota: o leitor põe sobrescrito nas props (editor); no layout vale a
    // formatação do documento — estilo do caractere ou rPr direto (oráculo fnrefsup)
    if (run.noteRef && run.rpr?.vertAlign === undefined) delete direct.vertAlign;
    // entradas de sumário (TOC): o Word não aplica o estilo Hyperlink
    if (run.inToc && direct.rStyle && isHyperlinkStyle(ctx, direct.rStyle)) delete direct.rStyle;
    const rpr = runRPr(direct);
    const style = resolveRunStyle(ctx, rpr, env, run.props.link);
    if (style.hidden) continue;
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
      pushChars(text, run, rpr, style, offset, idx);
      continue;
    }
    if (run.ptab) {
      const face = faceFor(ctx, rpr, 0x20, style);
      glyphs.push({ kind: 'tab', ch: '\t', cp: 9, face, style, adv: 0, asc: 0, desc: 0, offset, runIdx: idx, breakAfter: true, ptab: run.ptab, sizePt: style.sizePt });
      continue;
    }
    if (run.noteRef && !run.text) {
      // número exibido = ordem de referência no documento (não o id)
      const num = run.noteRef.kind === 'footnote' ? ctx.footnoteNumber(run.noteRef.id) : ctx.endnoteNumber(run.noteRef.id);
      const before = glyphs.length;
      pushChars(String(num), run, rpr, style, offset, idx);
      if (run.noteRef.kind === 'footnote') for (let k = before; k < glyphs.length; k++) glyphs[k]!.noteId = run.noteRef.id;
      continue;
    }
    pushChars(run.text, run, rpr, style, offset, idx, /^\s*FORMTEXT\b/i.test(para.runs[idx]?.field ?? ''));
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
    for (const g of glyphs) {
      if (compress && g.kind === 'space' && g.cp === 0x20) {
        const xAvg = (g.face.font.metrics as { xAvgCharWidth?: number }).xAvgCharWidth;
        const minSp = balance ? g.sizePt * 20 / 4 : xAvg ? (xAvg * g.sizePt * 20) / g.face.font.metrics.unitsPerEm / 2 : undefined;
        if (minSp !== undefined) g.feShrink = Math.max(0, g.adv - minSp);
      } else if (g.kind === 'char' && ppr.overflowPunct !== false && isCjkLang(g.style.rpr) && hangPunct(g.style.rpr, altKinsoku).includes(g.ch)) g.hang = true;
    }
  }

  // marcador de numeração
  let marker: ParaMarker | undefined;
  const numId = ppr.numPr?.numId;
  if (numId && env.numbering !== false) {
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
      for (const ch of Array.from(nm.text)) {
        const cp = ch.codePointAt(0)!;
        const face = faceFor(ctx, mrpr, cp, ms);
        const m = faceMetrics(face.font);
        let adv = advanceTwips(ctx, face, cp, ms.sizePt);
        // escala (w:w) e espaçamento (w:spacing) do rPr do nível também valem no número (oráculo numrpr)
        if (mrpr.w && mrpr.w !== 100) adv *= mrpr.w / 100;
        if (mrpr.spacing) adv += mrpr.spacing;
        mg.push({ kind: 'char', ch, cp, face, style: ms, adv, asc: m.ascent * ms.sizePt * 20, desc: m.descent * ms.sizePt * 20, offset: -1, runIdx: -1, breakAfter: false, sizePt: ms.sizePt });
        w += adv;
      }
      marker = { text: nm.text, glyphs: mg, width: w, level: nm.level, suff: nm.level.suff ?? 'tab', jc: nm.level.lvlJc ?? 'left' };
    }
  }

  const ind = ppr.ind ?? {};
  const sp = ppr.spacing ?? {};
  let jc = ppr.jc ?? 'left';
  if (jc === 'start') jc = 'left';
  if (jc === 'end') jc = 'right';
  const firstLine = ind.hanging !== undefined ? -ind.hanging : (ind.firstLine ?? 0);
  return {
    para, ppr, styleId, markStyle, markFace, glyphs, marker,
    indLeft: ind.left ?? 0,
    indRight: ind.right ?? 0,
    firstLine,
    jc,
    tabs: (ppr.tabs ?? []).filter((t) => t.val !== 'clear'),
    spaceBefore: sp.before ?? 0,
    spaceAfter: sp.after ?? 0,
    beforeAuto: !!sp.beforeAutospacing,
    afterAuto: !!sp.afterAutospacing,
    lineRule: sp.lineRule ?? 'auto',
    line: sp.line ?? 240,
    contextual: !!ppr.contextualSpacing,
    keepNext: !!ppr.keepNext,
    keepLines: !!ppr.keepLines,
    widowControl: ppr.widowControl ?? false,
    pageBreakBefore: !!ppr.pageBreakBefore,
    empty: glyphs.every((g) => g.kind === 'pb' || g.kind === 'obj' && !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating)),
  };
  void settings;
}

export { resolveDrawingColor };
export type { ResolvedStyle };
