import type { BorderSpec, PBdr } from '@universal-office/docx-core';
import type { Line, PlacedGlyph } from './lines.js';
import type { PreparedPara, Glyph } from './para.js';
import { WORD_UNIT } from './para.js';
import type { PageItem, GlyphRunItem } from './tree.js';
import { faceMetrics } from './fonts.js';
import { resolveColor, shadingFill, fontOfSlot } from './resolve.js';
import type { DocContext } from './context.js';
import { isEmf, renderEmf } from './emf.js';
import { isWmf, renderWmf } from './wmf.js';
import type { MathBox } from './math.js';

/** Identidade das linhas pintadas (GlyphRunItem.lineBox.line). */
let lineSeq = 0;

/** Linha de texto → itens de desenho (glifos agrupados, sublinhados, realces). */
export function paintLine(
  ctx: DocContext, out: PageItem[], line: Line, frameX: number, top: number,
): void {
  const baseY = top + line.baseline;
  const lineId = ++lineSeq;
  const all: PlacedGlyph[] = [...(line.marker ?? []), ...line.placed];
  // fundos: sombreamento de run e realce (por trás do texto)
  for (const pg of all) {
    const st = pg.g.style;
    const fill = st.highlight ?? st.shading;
    if (!fill || pg.w <= 0 || pg.g.kind === 'lb' || pg.g.kind === 'pb') continue;
    const m = faceMetrics(pg.g.face.font);
    const asc = m.ascent * st.sizePt * 20, desc = m.descent * st.sizePt * 20;
    out.push({ t: 'rect', x: frameX + pg.x, y: baseY - asc, w: pg.w, h: asc + desc, fill });
  }
  // glifos, agrupados por face/tamanho/cor/deslocamento
  let run: GlyphRunItem | null = null;
  let runKey = '';
  const flush = () => { if (run && run.glyphs.length) out.push(run); run = null; runKey = ''; };
  for (const pg of all) {
    const g = pg.g;
    if (g.math) { flush(); paintMath(out, g.math, frameX, pg.x, baseY, line, lineId); continue; }
    if (g.kind !== 'char' && g.kind !== 'nbsp' && !(g.kind === 'shy' && pg.w > 0)) {
      if (g.kind === 'space') continue;
      flush();
      if (g.kind === 'tab' && pg.leader) paintLeader(ctx, out, pg, frameX, baseY, all);
      if (g.kind === 'obj' && g.obj && g.adv > 0) paintInlineObject(ctx, out, g, frameX + pg.x, baseY);
      if (g.kind === 'box' && g.box) paintCheckBox(out, g, frameX + pg.x, baseY);
      continue;
    }
    // seletor de variação (U+FE0E/FE0F, emoji): sem glifo
    if (g.cp >= 0xfe00 && g.cp <= 0xfe0f) continue;
    // espaços tipográficos tratados como caractere (resultado de FORMTEXT): em branco —
    // sem o .notdef da fonte que não os tem (corpus t43)
    if ((g.cp >= 0x2000 && g.cp <= 0x200a) || g.cp === 0x3000) continue;
    const st = g.style;
    // texto SEM preenchimento (w14:noFill / alpha 100%) e sem contorno: o Word
    // não desenha nem grava no PDF (oráculo hidetext/tf-nofill, tf-alpha100)
    if (st.alpha === 0 && !st.outline) { flush(); continue; }
    // emoji colorido (COLR): o Word desenha as camadas coloridas, sem texto
    // extraível (oráculo hidetext/emoji)
    const colr = !!g.face.font.hasColorGlyphs?.() && !!g.face.font.colorLayers?.(g.face.font.glyphId(g.cp));
    const key = `${g.face.key}|${g.face.synthBold ? 1 : 0}${g.face.synthItalic ? 1 : 0}|${g.sizePt}|${st.color}|${st.shift}|${st.rpr.w ?? 100}|${st.alpha ?? 1}|${colr ? 'c' : ''}`;
    if (key !== runKey) {
      flush();
      runKey = key;
      run = {
        t: 'glyphs', face: g.face, sizePt: g.sizePt, color: st.color, y: baseY - st.shift, glyphs: [], text: '',
        ...(st.rpr.w && st.rpr.w !== 100 ? { scaleX: st.rpr.w / 100 } : {}),
        ...(g.face.synthBold ? { synthBold: true } : {}),
        ...(g.face.synthItalic ? { synthItalic: true } : {}),
        ...(st.alpha !== undefined ? { alpha: st.alpha } : {}),
        // semitransparente: o Word desenha CURVAS, não texto (oráculo hidetext/tf-alpha50)
        ...(st.alpha !== undefined && st.alpha > 0 && st.alpha < 1 ? { asPath: true } : {}),
        lineBox: { asc: line.baseline - st.shift, desc: line.height - line.baseline + st.shift, lead: pg.x, line: lineId },
        ...(colr ? { asPath: true, colr: true } : {}),
      };
    }
    const cp = g.kind === 'shy' ? 0x2d : g.cp;
    run!.glyphs.push({ cp, x: frameX + pg.x });
    run!.text += String.fromCodePoint(cp);
  }
  flush();
  // sublinhado / tachado — por trechos contíguos com o mesmo estilo
  paintDecorations(out, all, frameX, baseY, line);
}

/**
 * Preenchimento de tab como o Word desenha (oráculo tocdots), em pixels de 600 dpi:
 *  - glifo/fonte/tamanho/cor/deslocamento: os do run do TAB; 'heavy' também sai com '_';
 *  - passo = avanço do glifo no em do dispositivo (round(tamanho × 600/72) px),
 *    arredondado ao pixel (+ w:spacing do run do tab; × escala w:w);
 *  - grade ABSOLUTA: glifos em múltiplos do passo a partir da borda esquerda da
 *    PÁGINA (independe de margem e recuo — tocdots-margin);
 *  - só glifos inteiros, sem respiro: 1º em k·passo ≥ fim do texto; o último
 *    termina ≤ início do texto seguinte, igualdade inclusive (tocdots-tabpos).
 *    Bordas do tab em px como o Word posiciona: px(quadro) + px(deslocamento); o fim do
 *    texto é o de EXIBIÇÃO (displayEnd).
 */
function paintLeader(ctx: DocContext, out: PageItem[], pg: PlacedGlyph, frameX: number, baseY: number, all: PlacedGlyph[]): void {
  if (pg.w <= 0) return;
  const g = pg.g;
  const ch = pg.leader === 'hyphen' ? '-' : pg.leader === 'underscore' || pg.leader === 'heavy' ? '_' : pg.leader === 'middleDot' ? '·' : '.';
  const cp = ch.codePointAt(0)!;
  const face = g.face;
  const f = face.font;
  const rpr = g.style.rpr;
  const emPx = Math.round((g.sizePt * 600) / 72);
  let step = Math.round((f.advanceWidth(f.glyphId(cp)) * emPx) / f.metrics.unitsPerEm);
  if (rpr.spacing) step += Math.round(rpr.spacing / 2.4);
  const scale = rpr.w && rpr.w !== 100 ? rpr.w / 100 : 1;
  step = Math.round(step * scale);
  if (step <= 0) return;
  // px do quadro: meio pixel arredonda para o PAR (472,5 → 472; 467,5 → 468 — oráculo tdhalfpx)
  const fv = frameX / 2.4, ff = Math.floor(fv);
  const fx = Math.abs(fv - ff - 0.5) < 1e-6 ? ff + (ff % 2) : Math.round(fv);
  const x0 = displayEnd(ctx, all, pg, fx), x1 = fx + Math.round((pg.x + pg.w) / 2.4);
  const run: GlyphRunItem = {
    t: 'glyphs', face, sizePt: g.sizePt, color: g.style.color, y: baseY - g.style.shift, glyphs: [], text: '',
    ...(scale !== 1 ? { scaleX: scale } : {}),
  };
  for (let k = Math.ceil(x0 / step); (k + 1) * step <= x1; k++) { run.glyphs.push({ cp, x: k * step * 2.4 }); run.text += ch; }
  if (run.glyphs.length) out.push(run);
}

/**
 * Fim do texto antes do tab como o Word o EXIBE no PDF (px de 600 dpi; oráculos de
 * laboratório tdfit/tdseg/tdtab/tdpage/tdcompat). O Word converte as larguras da unidade
 * interna (1/4096 pt) para o dispositivo com o multiplicador de ponto fixo 8534/2²²
 * (= teto(2²²/491,52)) em 32 bits: o texto desde o tab anterior (ou o início da linha) é
 * medido em trechos — o maior prefixo de glifos cuja largura × 8534 + 2²¹ ainda cabe em
 * 2³² (≈ 1023,5 px) — e cada trecho é arredondado ao pixel à parte. Fim = px(início do
 * texto) + soma dos trechos; em texto longo difere de round(fim ideal) em até ±1,5 px.
 * Exceção medida e ainda não modelada: modo de compatibilidade (≤ 14) com
 * useWord97LineBreakRules e fonte do Leste Asiático no texto (comum em .doc) — o Word
 * exibe de outro jeito; ali fica o arredondamento do fim ideal.
 */
function displayEnd(ctx: DocContext, all: PlacedGlyph[], tab: PlacedGlyph, fx: number): number {
  const i = all.indexOf(tab);
  let s = i;
  while (s > 0 && all[s - 1]!.g.kind !== 'tab') s--;
  const st = ctx.fmt.settings;
  if (st.compatibilityMode < 15 && st.compat['useWord97LineBreakRules']
    && fontOfSlot((s < i ? all[s]! : tab).g.style.rpr.rFonts, 'eastAsia', ctx.fmt.theme)) return fx + Math.round(tab.x / 2.4);
  const seg = (u: number) => Math.floor((u * 8534 + 2097152) / 4194304);
  let px = fx + Math.round((s < i ? all[s]!.x : tab.x) / 2.4);
  let u = 0;
  for (let j = s; j < i; j++) {
    const w = Math.round(all[j]!.w / WORD_UNIT);
    if (u > 0 && (u + w) * 8534 + 2097152 >= 4294967296) { px += seg(u); u = 0; }
    u += w;
  }
  return px + seg(u);
}

/** Fração de equação (math.ts): numerador e denominador — nessa ordem, como o Word
 *  grava no PDF — e o traço. */
function paintMath(out: PageItem[], box: MathBox, frameX: number, x: number, baseY: number, line: Line, lineId: number): void {
  let run: GlyphRunItem | null = null;
  let key = '';
  for (const it of box.items) {
    const k = `${it.face.key}|${it.sizePt}|${it.style.color}|${it.y}`;
    if (!run || k !== key) {
      if (run) out.push(run);
      key = k;
      run = {
        t: 'glyphs', face: it.face, sizePt: it.sizePt, color: it.style.color, y: baseY + it.y, glyphs: [], text: '',
        lineBox: { asc: line.baseline + it.y, desc: line.height - line.baseline - it.y, lead: x + it.x, line: lineId },
      };
    }
    run.glyphs.push({ cp: it.cp, x: frameX + x + it.x });
    run.text += String.fromCodePoint(it.cp);
  }
  if (run) out.push(run);
  for (const r of box.rules) out.push({ t: 'rect', x: frameX + x + r.x, y: baseY + r.y, w: r.w, h: r.h, fill: r.color });
}

function paintCheckBox(out: PageItem[], g: Glyph, x: number, baseY: number): void {
  const b = g.box!;
  // base da caixa ≈ 0,18 × corpo abaixo da baseline (medido)
  const top = baseY + 0.18 * (b.side / 1.07) - b.side;
  const w = Math.max(0.5, b.side / 20 / 16);
  const c = g.style.color;
  out.push({ t: 'line', x1: x, y1: top, x2: x + b.side, y2: top, color: c, widthPt: w });
  out.push({ t: 'line', x1: x, y1: top + b.side, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: 'line', x1: x, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  out.push({ t: 'line', x1: x + b.side, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
  if (b.checked) {
    out.push({ t: 'line', x1: x, y1: top, x2: x + b.side, y2: top + b.side, color: c, widthPt: w });
    out.push({ t: 'line', x1: x + b.side, y1: top, x2: x, y2: top + b.side, color: c, widthPt: w });
  }
}

function paintInlineObject(ctx: DocContext, out: PageItem[], g: Glyph, x0: number, baseY0: number): void {
  const obj = g.obj!;
  const shift = g.style.shift;
  // margem de efeitos em linha: a figura fica dentro dela (oráculo effext)
  const ie = obj.image?.inlineEffect ?? obj.shape?.inlineEffect;
  const x = x0 + (ie?.l ?? 0), baseY = baseY0 - (ie?.b ?? 0);
  if (obj.image && isEmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: 'clip', op: 'push', ...r }, ...renderEmf(ctx, im.data, r), { t: 'clip', op: 'pop' });
  } else if (obj.image && isWmf(obj.image.data)) {
    // WMF (prévia do Equation Editor 3.0…): o Word desenha e grava o texto (wmf.ts)
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: 'clip', op: 'push', ...r }, ...renderWmf(ctx, im.data, r), { t: 'clip', op: 'pop' });
  } else if (obj.image) {
    const im = obj.image;
    out.push({
      t: 'image', x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips, image: im,
      ...(im.crop ? { crop: im.crop } : {}),
      ...(im.style?.rot ? { rot: im.style.rot } : {}),
      ...(im.style?.flipH ? { flipH: true } : {}),
      ...(im.style?.flipV ? { flipV: true } : {}),
    });
  } else if (obj.shape) {
    const s = obj.shape;
    out.push({ t: 'shape', x, y: baseY - shift - s.heightTwips, w: s.widthTwips, h: s.heightTwips, style: s.style });
  }
}

function paintDecorations(out: PageItem[], all: PlacedGlyph[], frameX: number, baseY: number, line: Line): void {
  type Seg = { x0: number; x1: number; g: Glyph };
  const segs = (pred: (g: Glyph) => boolean): Seg[] => {
    const res: Seg[] = [];
    let cur: Seg | null = null;
    // espaços finais da linha não recebem sublinhado
    let lastContent = -1;
    all.forEach((pg, k) => { if (pg.g.kind !== 'space' && pg.g.kind !== 'lb' && pg.g.kind !== 'pb') lastContent = k; });
    all.forEach((pg, k) => {
      const g = pg.g;
      const on = k <= lastContent && pred(g) && pg.w > 0 && g.kind !== 'lb' && g.kind !== 'pb';
      if (on && cur && cur.g.style === g.style && Math.abs(cur.x1 - (frameX + pg.x)) < 1) {
        cur.x1 = frameX + pg.x + pg.w;
      } else if (on) {
        if (cur) res.push(cur);
        cur = { x0: frameX + pg.x, x1: frameX + pg.x + pg.w, g };
      } else if (cur) { res.push(cur); cur = null; }
    });
    if (cur) res.push(cur);
    return res;
  };
  for (const s of segs((g) => !!g.style.underline && g.style.underline.val !== 'none')) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const sz = st.sizePt * 20;
    const y = baseY - st.shift + m.underlinePos * sz;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    const color = st.underline!.color ?? st.color;
    const val = st.underline!.val;
    if (val === 'words' && s.g.kind === 'space') continue;
    const dash = val.startsWith('dotted') ? 'dotted' as const : val.startsWith('dash') ? 'dashed' as const : undefined;
    out.push({ t: 'line', x1: s.x0, y1: y, x2: s.x1, y2: y, color, widthPt: val === 'thick' ? w * 2 : w, ...(dash ? { dash } : {}) });
    if (val === 'double') out.push({ t: 'line', x1: s.x0, y1: y + w * 20 * 2, x2: s.x1, y2: y + w * 20 * 2, color, widthPt: w });
  }
  for (const s of segs((g) => g.style.strike || g.style.dstrike)) {
    const st = s.g.style;
    const m = faceMetrics(s.g.face.font);
    const y = baseY - st.shift - m.ascent * st.sizePt * 20 * 0.3;
    const w = Math.max(0.5, m.underlineThick * st.sizePt);
    out.push({ t: 'line', x1: s.x0, y1: y, x2: s.x1, y2: y, color: st.color, widthPt: w });
    if (st.dstrike) out.push({ t: 'line', x1: s.x0, y1: y - w * 40, x2: s.x1, y2: y - w * 40, color: st.color, widthPt: w });
  }
  void line;
}

const BORDER_SINGLE_LIKE = new Set(['single', 'thick', 'dotted', 'dashed', 'dotDash', 'dotDotDash', 'hairline', 'dashSmallGap']);

/** Espessura desenhada (twips) de uma borda OOXML (w:sz em 1/8 pt). */
export function borderWidth(b: BorderSpec | undefined): number {
  if (!b || b.val === 'none' || b.val === 'nil') return 0;
  // a espessura vai para twips INTEIROS, truncada: w:sz 1 → 2 tw, 3 → 7 tw (oráculo bdrthin)
  const tw = Math.floor(Math.max(1, b.sz ?? 4) * 2.5 + 1e-9);
  switch (b.val) {
    case 'double': return tw * 3;
    case 'thinThickSmallGap': case 'thickThinSmallGap': return tw + 40;
    // as outras compostas: a soma das faixas que o Word desenha (sonda de bordas do table-lab)
    case 'triple': return tw * 5;
    case 'thinThickThinSmallGap': return tw + 58;
    case 'thinThickMediumGap': case 'thickThinMediumGap': return tw * 2;
    case 'thinThickThinMediumGap': return tw * 3;
    case 'thinThickLargeGap': case 'thickThinLargeGap': return tw + 43;
    case 'thinThickThinLargeGap': return tw * 2 + 58;
    case 'threeDEmboss': case 'threeDEngrave': return tw + 2 * Math.max(14, Math.floor(tw / 2));
    default: return tw;
  }
}

/** Faixa de uma borda composta: espessura (twips) e cor (undefined = vão). */
type Band = { t: number; c?: 'ink' | 'light' | 'mid' };

/**
 * Faixas de uma borda, de FORA para dentro, como o Word as desenha (medido no
 * PDF — sonda de bordas do table-lab): fina = 0,72 pt e vão de 0,72 pt nas
 * SmallGap; fina e vão = w/2 nas MediumGap; grossa de 1,44 pt e vão = w nas
 * LargeGap; relevo 3D = clara/média/escura com a fina = max(0,72 pt, w/2).
 * `w` = espessura de pintura (quantizada em 2,4 tw).
 */
function borderBands(val: string, w: number): Band[] {
  const q = (x: number): number => Math.max(2.4, Math.floor(x / 2.4 + 1e-9) * 2.4);
  const thin = 14.4, half = q(w / 2), thick = 28.8, gap = (t: number): Band => ({ t });
  const ink = (t: number): Band => ({ t, c: 'ink' });
  switch (val) {
    case 'double': return [ink(w), gap(w), ink(w)];
    case 'triple': return [ink(w), gap(w), ink(w), gap(w), ink(w)];
    case 'thinThickSmallGap': return [ink(w), gap(thin), ink(thin)];
    case 'thickThinSmallGap': return [ink(thin), gap(thin), ink(w)];
    case 'thinThickThinSmallGap': return [ink(thin), gap(thin), ink(w), gap(thin), ink(thin)];
    case 'thinThickMediumGap': return [ink(w), gap(half), ink(half)];
    case 'thickThinMediumGap': return [ink(half), gap(half), ink(w)];
    case 'thinThickThinMediumGap': return [ink(half), gap(half), ink(w), gap(half), ink(half)];
    case 'thinThickLargeGap': return [ink(thick), gap(w), ink(thin)];
    case 'thickThinLargeGap': return [ink(thin), gap(w), ink(thick)];
    case 'thinThickThinLargeGap': return [ink(thin), gap(w), ink(thick), gap(w), ink(thin)];
    case 'threeDEmboss': { const t = Math.max(thin, half); return [{ t, c: 'light' }, { t: w, c: 'mid' }, { t, c: 'ink' }]; }
    case 'threeDEngrave': { const t = Math.max(thin, half); return [{ t, c: 'ink' }, { t: w, c: 'mid' }, { t, c: 'light' }]; }
    default: return [ink(w)];
  }
}

/** Mistura com o branco (relevo 3D: preto → C0C0C0 / 606060, medido). */
const toWhite = (hex: string, f: number): string => {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * f).toString(16).padStart(2, '0')).join('').toUpperCase();
};

/** Padrão dos tracejados de borda (múltiplos de w — medido: [w w], [3w w]…). */
const BORDER_DASH: Record<string, import('./tree.js').LineItem['dash']> = {
  dotted: 'bdrDot', dashed: 'bdrDash', dotDash: 'bdrDashDot', dotDotDash: 'bdrDashDotDot', dashSmallGap: 'bdrDashSmall', dashDotStroked: 'bdrDashDot',
};

/**
 * Espessura (twips) com que o Word GRAVA uma borda no PDF (oráculo bdrw): w:sz
 * (1/8 pt) truncado para 1/600" — 2→0,24 pt, 4→0,48, 6→0,72, 12→1,44, 24→3,00,
 * 36→4,44. O layout usa a espessura nominal (borderWidth); só o desenho quantiza.
 */
export function borderPaintWidth(b: BorderSpec): number {
  return Math.max(1, Math.floor((Math.max(2, b.sz ?? 4) * 25) / 24 + 1e-9)) * 2.4;
}

/**
 * Desenha uma borda horizontal/vertical centrada no segmento dado. As sólidas
 * (single, thick, double…) saem como RETÂNGULOS preenchidos da espessura
 * quantizada, como no PDF do Word — traço fino antisserrilhado cai entre dois
 * pixels e some; o retângulo fino o leitor de PDF alinha ao pixel. Pontilhadas/
 * tracejadas seguem como traço (o Word também as grava assim).
 */
export function paintBorder(
  ctx: DocContext, out: PageItem[], b: BorderSpec | undefined, x1: number, y1: number, x2: number, y2: number,
  /** lado de FORA da borda (as compostas assimétricas: fina/grossa) */
  outer?: 'top' | 'bottom' | 'left' | 'right',
): void {
  if (!b || b.val === 'none' || b.val === 'nil') return;
  const color = resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? '000000';
  const w = borderPaintWidth(b);
  const dash = BORDER_DASH[b.val];
  if (dash) { out.push({ t: 'line', x1, y1, x2, y2, color, widthPt: w / 20, dash }); return; }
  // diagonal (tl2br/tr2bl da célula): traço
  if (x1 !== x2 && y1 !== y2) { out.push({ t: 'line', x1, y1, x2, y2, color, widthPt: w / 20 }); return; }
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  if (b.val === 'wave' || b.val === 'doubleWave') { paintWave(out, b.val === 'doubleWave', color, w, horizontal, x1, y1, x2, y2); return; }
  const bands = borderBands(b.val, w);
  const total = bands.reduce((s, x) => s + x.t, 0);
  // de fora para dentro: de cima (ou da esquerda) quando o lado de fora é top/left
  const flip = outer === 'bottom' || outer === 'right';
  let pos = -total / 2;
  for (const band of flip ? [...bands].reverse() : bands) {
    if (band.c) {
      const fill = band.c === 'light' ? toWhite(color, 192 / 255) : band.c === 'mid' ? toWhite(color, 96 / 255) : color;
      if (horizontal) out.push({ t: 'rect', x: Math.min(x1, x2), y: y1 + pos, w: Math.abs(x2 - x1), h: band.t, fill });
      else out.push({ t: 'rect', x: x1 + pos, y: Math.min(y1, y2), w: band.t, h: Math.abs(y2 - y1), fill });
    }
    pos += band.t;
  }
  void BORDER_SINGLE_LIKE;
}

/**
 * Ondulada (o Word usa ladrilhos de bitmap): zigue-zague de altura 3 pt e
 * período 6 pt (ladrilho medido em w:sz 4), escalado com a espessura; a dupla
 * leva duas ondas.
 */
function paintWave(out: PageItem[], double: boolean, color: string, w: number, horizontal: boolean, x1: number, y1: number, x2: number, y2: number): void {
  const h = Math.max(60, w * 3), period = h * 2, lw = Math.max(0.5, w / 20 / 1.5);
  const len = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const waves = double ? [-h / 4, h / 4] : [0];
  for (const off of waves) {
    const cmds: { op: 'M' | 'L'; x: number; y: number }[] = [];
    for (let s = 0; s <= len + 0.01; s += period / 2) {
      const d = (Math.round(s / (period / 2)) % 2 ? 1 : -1) * (h / (double ? 4 : 2));
      const a = Math.min(s, len);
      cmds.push(horizontal
        ? { op: cmds.length ? 'L' : 'M', x: Math.min(x1, x2) + a, y: y1 + off + d }
        : { op: cmds.length ? 'L' : 'M', x: x1 + off + d, y: Math.min(y1, y2) + a });
    }
    out.push({ t: 'path', cmds, stroke: { color, widthPt: lw } } as PageItem);
  }
}

/**
 * Caixa de bordas/sombreamento de um bloco de parágrafos com bordas iguais, como
 * o Word a grava (oráculo pbdr do lab de desenho):
 *  - a caixa do parágrafo vai ~1,45 pt (29 tw) além da área de texto de cada
 *    lado (o sombreamento sem borda também);
 *  - bordas laterais: face interna a `space` da caixa, espessura para fora;
 *  - topo/pé: faixa a partir da borda externa da caixa (topo = início do
 *    parágrafo, pé = fim do espaço da borda), de ponta a ponta das laterais;
 *  - sombreamento: entre as faces internas das bordas laterais.
 */
export function paintParaBox(
  ctx: DocContext, out: PageItem[], p: PreparedPara, pBdr: PBdr | undefined,
  left: number, right: number, top: number, bottom: number, drawTop: boolean, drawBottom: boolean,
  /** parágrafo do meio de um grupo: desenha a borda "between" no topo (após o espaço) */
  between = false,
): void {
  const fill = shadingFill(p.ppr.shd, ctx.fmt.theme);
  const EXT = 29;
  const bl = pBdr?.left, br = pBdr?.right;
  const padL = bl && bl.val !== 'none' && bl.val !== 'nil' ? (bl.space ?? 0) * 20 : 0;
  const padR = br && br.val !== 'none' && br.val !== 'nil' ? (br.space ?? 0) * 20 : 0;
  const inL = left - EXT - padL, inR = right + EXT + padR;
  // sombra (w:shadow): a faixa de cima/baixo reservada é o dobro da espessura; a
  // borda de cima fica na metade de BAIXO da faixa e a sombra é uma cópia das bordas
  // direita e de baixo deslocada da espessura para a direita e para baixo (PDF do Word)
  const shT = drawTop && pBdr?.top?.shadow ? borderWidth(pBdr.top) : 0;
  const shB = drawBottom && pBdr?.bottom?.shadow ? borderWidth(pBdr.bottom) : 0;
  const shR = br?.shadow ? borderWidth(br) : 0;
  const fTop = shT ? top + shT + borderWidth(pBdr!.top) : top, fBot = shB ? bottom - shB - borderWidth(pBdr!.bottom) : bottom;
  if (fill) out.push({ t: 'rect', x: inL, y: fTop, w: inR - inL, h: fBot - fTop, fill });
  if (!pBdr) return;
  const outL = inL - borderWidth(bl), outR = inR + borderWidth(br);
  if (drawTop) { const y = top + shT + borderWidth(pBdr.top) / 2; paintBorder(ctx, out, pBdr.top, outL, y, outR, y); }
  if (between && pBdr.between && pBdr.between.val !== 'none' && pBdr.between.val !== 'nil') {
    const yb = top + (pBdr.between.space ?? 0) * 20 + borderWidth(pBdr.between) / 2;
    paintBorder(ctx, out, pBdr.between, outL, yb, outR, yb);
  }
  if (drawBottom) {
    const y = bottom - shB - borderWidth(pBdr.bottom) / 2;
    paintBorder(ctx, out, pBdr.bottom, outL, y, outR, y);
    if (shB) paintBorder(ctx, out, pBdr.bottom, outL + shB, bottom - shB / 2, outR + shB, bottom - shB / 2);
  }
  paintBorder(ctx, out, bl, inL - borderWidth(bl) / 2, top + shT, inL - borderWidth(bl) / 2, bottom - shB);
  paintBorder(ctx, out, br, inR + borderWidth(br) / 2, top + shT, inR + borderWidth(br) / 2, bottom - shB);
  if (shR) paintBorder(ctx, out, br, inR + borderWidth(br) + shR / 2, top + shT + shR, inR + borderWidth(br) + shR / 2, bottom);
}

/**
 * Bordas de página (w:pgBorders) como o Word as grava no PDF (oráculo pgbdr):
 *  - offsetFrom="page": a borda começa a `space` pt da BORDA da página e cresce
 *    para dentro;
 *  - offsetFrom="text" (padrão): a face interna fica a `space` pt da área de
 *    texto e a espessura cresce para fora; com cabeçalho/rodapé na página, o
 *    topo/pé contornam o cabeçalho/rodapé (distâncias w:header/w:footer), salvo
 *    bordersDoNotSurroundHeader/Footer;
 *  - single: sz/8 pt; double: 3 faixas (traço, vão, traço) de sz/8 pt;
 *  - os lados horizontais vão de ponta a ponta da caixa (os cantos ficam cheios).
 */
export function pageBorderItems(
  ctx: DocContext,
  pb: { offsetFrom?: string; top?: BorderSpec; left?: BorderSpec; bottom?: BorderSpec; right?: BorderSpec },
  g: { pageW: number; pageH: number; marL: number; marR: number; marT: number; marB: number; hdr: number; ftr: number },
  surround: { header: boolean; footer: boolean },
): PageItem[] {
  const on = (b?: BorderSpec): b is BorderSpec => !!b && b.val !== 'none' && b.val !== 'nil';
  const lw = (b?: BorderSpec): number => (on(b) ? Math.max(0.25, (b.sz ?? 4) / 8) * 20 : 0);
  const thick = (b?: BorderSpec): number => (on(b) && b.val === 'double' ? 3 * lw(b) : lw(b));
  const sp = (b?: BorderSpec): number => (b?.space ?? 0) * 20;
  const page = pb.offsetFrom === 'page';
  // faces externas da caixa
  const top = page ? sp(pb.top) : (surround.header ? g.hdr : g.marT) - sp(pb.top) - thick(pb.top);
  const bottom = page ? g.pageH - sp(pb.bottom) : g.pageH - (surround.footer ? g.ftr : g.marB) + sp(pb.bottom) + thick(pb.bottom);
  const left = page ? sp(pb.left) : g.marL - sp(pb.left) - thick(pb.left);
  const right = page ? g.pageW - sp(pb.right) : g.pageW - g.marR + sp(pb.right) + thick(pb.right);
  const out: PageItem[] = [];
  const color = (b: BorderSpec) => resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? '000000';
  /** faixas (desde a face externa, para dentro) de uma borda */
  const bands = (b: BorderSpec): [number, number][] => b.val === 'double'
    ? [[0, lw(b)], [2 * lw(b), 3 * lw(b)]] : [[0, lw(b)]];
  if (on(pb.top)) for (const [a, z] of bands(pb.top)) out.push({ t: 'rect', x: left, y: top + a, w: right - left, h: z - a, fill: color(pb.top) });
  if (on(pb.bottom)) for (const [a, z] of bands(pb.bottom)) out.push({ t: 'rect', x: left, y: bottom - z, w: right - left, h: z - a, fill: color(pb.bottom) });
  if (on(pb.left)) for (const [a, z] of bands(pb.left)) out.push({ t: 'rect', x: left + a, y: top, w: z - a, h: bottom - top, fill: color(pb.left) });
  if (on(pb.right)) for (const [a, z] of bands(pb.right)) out.push({ t: 'rect', x: right - z, y: top, w: z - a, h: bottom - top, fill: color(pb.right) });
  return out;
}
