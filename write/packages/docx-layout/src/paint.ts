import type { BorderSpec, PBdr } from '@universal-office/docx-core';
import type { Line, PlacedGlyph } from './lines.js';
import type { PreparedPara, Glyph } from './para.js';
import type { PageItem, GlyphRunItem } from './tree.js';
import { faceMetrics } from './fonts.js';
import { resolveColor } from './resolve.js';
import type { DocContext } from './context.js';
import { isEmf, renderEmf } from './emf.js';

/** Linha de texto → itens de desenho (glifos agrupados, sublinhados, realces). */
export function paintLine(
  ctx: DocContext, out: PageItem[], line: Line, frameX: number, top: number,
): void {
  const baseY = top + line.baseline;
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
    if (g.kind !== 'char' && g.kind !== 'nbsp' && !(g.kind === 'shy' && pg.w > 0)) {
      if (g.kind === 'space') continue;
      flush();
      if (g.kind === 'tab' && pg.leader) paintLeader(ctx, out, pg, frameX, baseY);
      if (g.kind === 'obj' && g.obj && g.adv > 0) paintInlineObject(ctx, out, g, frameX + pg.x, baseY);
      if (g.kind === 'box' && g.box) paintCheckBox(out, g, frameX + pg.x, baseY);
      continue;
    }
    const st = g.style;
    const key = `${g.face.key}|${g.face.synthBold ? 1 : 0}${g.face.synthItalic ? 1 : 0}|${g.sizePt}|${st.color}|${st.shift}|${st.rpr.w ?? 100}|${st.alpha ?? 1}`;
    if (key !== runKey) {
      flush();
      runKey = key;
      run = {
        t: 'glyphs', face: g.face, sizePt: g.sizePt, color: st.color, y: baseY - st.shift, glyphs: [], text: '',
        ...(st.rpr.w && st.rpr.w !== 100 ? { scaleX: st.rpr.w / 100 } : {}),
        ...(g.face.synthBold ? { synthBold: true } : {}),
        ...(g.face.synthItalic ? { synthItalic: true } : {}),
        ...(st.alpha !== undefined ? { alpha: st.alpha } : {}),
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

function paintLeader(ctx: DocContext, out: PageItem[], pg: PlacedGlyph, frameX: number, baseY: number): void {
  if (pg.w <= 0) return;
  const g = pg.g;
  const ch = pg.leader === 'hyphen' ? '-' : pg.leader === 'underscore' ? '_' : pg.leader === 'middleDot' ? '·' : '.';
  const cp = ch.codePointAt(0)!;
  const face = g.face;
  const f = face.font;
  const adv = (f.advanceWidth(f.glyphId(cp)) * g.sizePt * 20) / f.metrics.unitsPerEm;
  if (adv <= 0) return;
  const run: GlyphRunItem = { t: 'glyphs', face, sizePt: g.sizePt, color: g.style.color, y: baseY, glyphs: [], text: '' };
  // Word alinha os pontos numa grade absoluta e deixa um respiro antes do texto
  const x0 = frameX + pg.x, x1 = frameX + pg.x + pg.w - adv * 0.5;
  let x = Math.ceil(x0 / adv) * adv;
  while (x + adv <= x1) { run.glyphs.push({ cp, x }); run.text += ch; x += adv; }
  if (run.glyphs.length) out.push(run);
  void ctx;
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

function paintInlineObject(ctx: DocContext, out: PageItem[], g: Glyph, x: number, baseY: number): void {
  const obj = g.obj!;
  const shift = g.style.shift;
  if (obj.image && isEmf(obj.image.data)) {
    const im = obj.image;
    const r = { x, y: baseY - shift - im.heightTwips, w: im.widthTwips, h: im.heightTwips };
    out.push({ t: 'clip', op: 'push', ...r }, ...renderEmf(ctx, im.data, r), { t: 'clip', op: 'pop' });
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
  const pt = Math.max(0.25, (b.sz ?? 4) / 8);
  if (b.val === 'double') return pt * 3 * 20;
  if (b.val === 'thinThickSmallGap' || b.val === 'thickThinSmallGap') return pt * 20 + 40;
  return pt * 20;
}

/** Desenha uma borda horizontal/vertical como linha(s). */
export function paintBorder(
  ctx: DocContext, out: PageItem[], b: BorderSpec | undefined, x1: number, y1: number, x2: number, y2: number,
): void {
  if (!b || b.val === 'none' || b.val === 'nil') return;
  const color = resolveColor({ val: b.color, themeColor: b.themeColor, themeTint: b.themeTint, themeShade: b.themeShade }, ctx.fmt.theme) ?? '000000';
  const pt = Math.max(0.25, (b.sz ?? 4) / 8);
  const dash = b.val === 'dotted' ? 'dotted' as const : b.val === 'dashed' || b.val === 'dashSmallGap' ? 'dashed' as const
    : b.val === 'dotDash' ? 'dashDot' as const : b.val === 'dotDotDash' ? 'dashDotDot' as const : undefined;
  if (b.val === 'double') {
    const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const off = pt * 20; // 1 traço + 1 vão
    if (horizontal) {
      out.push({ t: 'line', x1, y1: y1 - off, x2, y2: y2 - off, color, widthPt: pt });
      out.push({ t: 'line', x1, y1: y1 + off, x2, y2: y2 + off, color, widthPt: pt });
    } else {
      out.push({ t: 'line', x1: x1 - off, y1, x2: x2 - off, y2, color, widthPt: pt });
      out.push({ t: 'line', x1: x1 + off, y1, x2: x2 + off, y2, color, widthPt: pt });
    }
    return;
  }
  void BORDER_SINGLE_LIKE;
  out.push({ t: 'line', x1, y1, x2, y2, color, widthPt: pt, ...(dash ? { dash } : {}) });
}

/** Caixa de bordas/sombreamento de um bloco de parágrafos com bordas iguais. */
export function paintParaBox(
  ctx: DocContext, out: PageItem[], p: PreparedPara, pBdr: PBdr | undefined,
  left: number, right: number, top: number, bottom: number, drawTop: boolean, drawBottom: boolean,
  /** parágrafo do meio de um grupo: desenha a borda "between" no topo (após o espaço) */
  between = false,
): void {
  const fill = p.ppr.shd?.fill && p.ppr.shd.fill !== 'auto' ? p.ppr.shd.fill
    : p.ppr.shd?.themeFill ? resolveColor({ themeColor: p.ppr.shd.themeFill, themeTint: p.ppr.shd.themeFillTint, themeShade: p.ppr.shd.themeFillShade }, ctx.fmt.theme) : undefined;
  const bl = pBdr?.left, br = pBdr?.right;
  const padL = bl && bl.val !== 'none' && bl.val !== 'nil' ? (bl.space ?? 0) * 20 : 0;
  const padR = br && br.val !== 'none' && br.val !== 'nil' ? (br.space ?? 0) * 20 : 0;
  if (fill) out.push({ t: 'rect', x: left - padL, y: top, w: right - left + padL + padR, h: bottom - top, fill });
  if (!pBdr) return;
  if (drawTop) paintBorder(ctx, out, pBdr.top, left - padL - borderWidth(bl) / 2, top, right + padR + borderWidth(br) / 2, top);
  if (between && pBdr.between && pBdr.between.val !== 'none' && pBdr.between.val !== 'nil') {
    const yb = top + (pBdr.between.space ?? 0) * 20 + borderWidth(pBdr.between) / 2;
    paintBorder(ctx, out, pBdr.between, left - padL - borderWidth(bl) / 2, yb, right + padR + borderWidth(br) / 2, yb);
  }
  if (drawBottom) paintBorder(ctx, out, pBdr.bottom, left - padL - borderWidth(bl) / 2, bottom, right + padR + borderWidth(br) / 2, bottom);
  paintBorder(ctx, out, bl, left - padL - borderWidth(bl) / 2, top, left - padL - borderWidth(bl) / 2, bottom);
  paintBorder(ctx, out, br, right + padR + borderWidth(br) / 2, top, right + padR + borderWidth(br) / 2, bottom);
}
