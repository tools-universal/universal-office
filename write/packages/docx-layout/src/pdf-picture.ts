/**
 * Imagem com Formato da Imagem no PDF — a mesma composição do canvas
 * (canvas-picture.ts), como o Word grava: a imagem original (recortada pela
 * forma) e cada efeito como um raster RGBA à parte com máscara suave (sombra,
 * brilho, reflexo, sombra interna), o contorno como caminho (todo de fora) e as
 * bordas suaves como /SMask da própria imagem. Tudo no referencial da imagem
 * (antes do giro) e girado em volta do centro.
 */
import {
  presetOutline, flattenPath, fillPolygons, newMask, outerShadowMask, innerShadowMask, glowMask, softEdgeMask, reflectionAlpha,
  gaussianBlur, shadeBevel, morph, type Mask, type PathSeg, type Affine,
} from '@universal-office/drawingml';
import type { ImageItem, PictureLook, ShapeItem } from './tree.js';
import type { PdfImage, PdfPage, PathCmd } from './pdf-writer/document.js';

const T = 20;

/** O que o pintor do PDF oferece ao desenho da imagem formatada. */
export interface PdfPictureEnv {
  /** a imagem embutida como está (JPEG direto, raster com /SMask) */
  image(): PdfImage | null;
  /** pixels RGBA da imagem (com os ajustes de cor), ou null (JPEG sem decodificador) */
  rgba(): { data: Uint8Array; width: number; height: number } | null;
  /** a imagem com uma máscara suave nova cobrindo a imagem inteira (bordas suaves/reflexo em JPEG) */
  masked(alpha: Uint8Array, width: number, height: number): PdfImage | null;
  embedRgba(data: Uint8Array, width: number, height: number): PdfImage;
}

/** Resolução dos rasters dos efeitos (pt → px): 200 ppp, como o Word nos efeitos finos. */
const PPT = 200 / 72;

function shapeSubs(look: PictureLook | undefined, w: number, h: number, flipH: boolean, flipV: boolean): PathSeg[][] {
  const o = presetOutline(look?.geom?.prst, w, h, look?.geom?.adj);
  const subs = o.subs.filter((_, i) => o.fill[i] !== false);
  if (!flipH && !flipV) return subs;
  const fx = (x: number): number => (flipH ? w - x : x), fy = (y: number): number => (flipV ? h - y : y);
  return subs.map((sub) => sub.map((s): PathSeg => {
    switch (s.c) {
      case 'M': case 'L': return { ...s, x: fx(s.x), y: fy(s.y) };
      case 'C': return { ...s, x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2), x: fx(s.x), y: fy(s.y) };
      case 'Q': return { ...s, x1: fx(s.x1), y1: fy(s.y1), x: fx(s.x), y: fy(s.y) };
      case 'E': {
        const a0 = flipH ? Math.PI - s.a0 : s.a0, a1 = flipH ? Math.PI - s.a1 : s.a1;
        return { ...s, cx: fx(s.cx), cy: fy(s.cy), a0: flipV ? -a0 : a0, a1: flipV ? -a1 : a1, ccw: flipH !== flipV ? !s.ccw : !!s.ccw };
      }
      default: return s;
    }
  }));
}

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];

function colored(m: Mask, hex: string, alpha: number): Uint8Array {
  const out = new Uint8Array(m.w * m.h * 4);
  const [r, g, b] = rgb(hex);
  for (let i = 0; i < m.a.length; i++) {
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, m.a[i]! * alpha)) * 255);
  }
  return out;
}

/** Caixa (pt, relativa ao canto da imagem) que os efeitos ocupam (como no canvas). */
function bounds(look: PictureLook, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  const grow = (a: number, b: number, c: number, d: number): void => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  if (look.line) { const lw = look.line.widthPt; grow(-lw, -lw, w + lw, h + lw); }
  if (look.glow) { const r = look.glow.radPt; grow(-r, -r, w + r, h + r); }
  const s = look.shadow;
  if (s?.kind === 'outer') {
    const a = (s.dirDeg * Math.PI) / 180, dx = s.distPt * Math.cos(a), dy = s.distPt * Math.sin(a);
    const sx = Math.abs(s.sx ?? 1), sy = Math.abs(s.sy ?? 1);
    const k = Math.abs(Math.tan(((s.kxDeg ?? 0) * Math.PI) / 180)) * h + Math.abs(Math.tan(((s.kyDeg ?? 0) * Math.PI) / 180)) * w;
    const m = s.blurPt + k + Math.max(w, h) * Math.max(0, Math.max(sx, sy) - 1);
    const flip = s.sy !== undefined && s.sy < 0 ? h : 0;
    grow(dx - m, dy - m - flip, w + dx + m, h + dy + m + flip);
  }
  const r = look.reflection;
  if (r) {
    const a = (r.dirDeg * Math.PI) / 180;
    const dx = r.distPt * Math.cos(a), dy = r.distPt * Math.sin(a);
    const lw = look.line?.widthPt ?? 0;
    grow(dx - r.blurPt - lw, h + dy - r.blurPt, w + dx + r.blurPt + lw, 2 * h + dy + r.blurPt + lw);
  }
  return { x0, y0, x1, y1 };
}

/**
 * Forma com Efeitos de Forma no PDF: o corpo continua vetorial (`drawBody`), os efeitos
 * vão como rasters RGBA (como o Word grava os efeitos): sombra externa e brilho atrás,
 * reflexo (a silhueta na cor do preenchimento, espelhada com o degradê), sombra interna
 * por cima. Com bordas suaves o corpo vira raster (a cor do preenchimento com a máscara).
 */
export function paintShapeEffectsPdf(page: PdfPage, it: ShapeItem, embedRgba: (data: Uint8Array, w: number, h: number) => PdfImage, drawBody: () => void): void {
  const fx = it.fx ?? {};
  const st = it.style;
  const w = it.w / T, h = it.h / T;
  const rot = ((st.rot ?? 0) * Math.PI) / 180, cos = Math.cos(rot), sin = Math.sin(rot);
  const cx = it.x / T + w / 2, cy = it.y / T + h / 2;
  const M: Affine = [cos, sin, -sin, cos, cx - (cos * w) / 2 + (sin * h) / 2, cy - (sin * w) / 2 - (cos * h) / 2];
  const rectMatrix = (x: number, y: number, rw: number, rh: number): Affine =>
    [M[0] * rw, M[1] * rw, M[2] * rh, M[3] * rh, M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const draw = (img: PdfImage, m: Affine): void => page.drawImageMatrix(img, m[0], m[1], m[2], m[3], m[4], m[5]);
  const look: PictureLook = { ...fx, geom: { prst: st.geom === 'custom' ? 'rect' : st.geom, ...(st.adj ? { adj: st.adj } : {}) } };
  const bb = bounds(look, w, h);
  let ppt = PPT;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 8e6) ppt *= Math.sqrt(8e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const subs = shapeSubs(look, w, h, !!st.flipH, !!st.flipV);
  const area0 = fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35));
  // a silhueta é o que a forma pinta: a área (com preenchimento) ou só o anel do contorno
  // (sem preenchimento — o brilho e a sombra seguem a linha, como no Word)
  const filled = !!(it.fill || it.grad || it.pattern || it.blip);
  const lwPx = (it.stroke?.widthPt ?? 0) * ppt;
  let sil = area0;
  if (!filled && lwPx > 0) {
    const r = Math.max(1, lwPx / 2);
    const outer = morph(area0, r), inner = morph(area0, -r);
    sil = newMask(W, H);
    for (let i = 0; i < sil.a.length; i++) sil.a[i] = Math.max(0, outer.a[i]! - inner.a[i]!);
  }
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
  const layerMatrix = rectMatrix(bb.x0, bb.y0, W / ppt, H / ppt);
  const fillHex = it.fill ?? it.grad?.stops[0]?.color ?? it.pattern?.fg ?? it.stroke?.color ?? 'FFFFFF';
  const s = fx.shadow;
  if (s?.kind === 'outer') {
    const dir = s.rotWithShape ? s.dirDeg : s.dirDeg - (st.rot ?? 0);
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    draw(embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
  if (fx.glow) draw(embedRgba(colored(glowMask(sil, fx.glow.radPt, ppt), fx.glow.color, fx.glow.alpha), W, H), layerMatrix);
  const soft = fx.softEdgePt ? softEdgeMask(sil, fx.softEdgePt, ppt) : null;
  const r = fx.reflection;
  if (r) {
    // a silhueta (com as bordas suaves) espelhada em volta da borda de baixo, com o degradê
    const a = (r.dirDeg * Math.PI) / 180;
    const dx = r.distPt * Math.cos(a) * ppt, dy = r.distPt * Math.sin(a) * ppt;
    let m = newMask(W, H);
    const src = soft ?? sil;
    const top = oy + h * ppt + dy;
    for (let y = 0; y < H; y++) {
      const sy = Math.round(2 * (oy + h * ppt) + dy - y - 1);
      const t = (y + 0.5 - top) / (h * ppt);
      const al = t < 0 ? 0 : reflectionAlpha(t, r);
      if (sy < 0 || sy >= H || al <= 0) continue;
      for (let x = 0; x < W; x++) {
        const sx = Math.round(x - dx);
        if (sx >= 0 && sx < W) m.a[y * W + x] = src.a[sy * W + sx]! * al;
      }
    }
    if (r.blurPt > 0) m = gaussianBlur(m, (r.blurPt / 3) * ppt);
    draw(embedRgba(colored(m, fillHex, 1), W, H), layerMatrix);
  }
  if (soft) draw(embedRgba(colored(soft, fillHex, st.fillAlpha ?? 1), W, H), layerMatrix);
  else drawBody();
  // sombra interna: dentro do preenchimento (sem preenchimento o Word não a mostra)
  if (s?.kind === 'inner' && filled) {
    const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
    draw(embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
}

/** Desenha a imagem formatada no PDF. */
export function paintPicturePdf(page: PdfPage, it: ImageItem, env: PdfPictureEnv): void {
  const look = it.pic ?? {};
  const w = it.w / T, h = it.h / T;
  // local (pt, canto da imagem) → página (pt, a partir do topo): giro no centro
  const rot = ((it.rot ?? 0) * Math.PI) / 180, cos = Math.cos(rot), sin = Math.sin(rot);
  const cx = it.x / T + w / 2, cy = it.y / T + h / 2;
  const M: Affine = [cos, sin, -sin, cos, cx - (cos * w) / 2 + (sin * h) / 2, cy - (sin * w) / 2 - (cos * h) / 2];
  const P = (x: number, y: number): [number, number] => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  /** retângulo local → matriz do quadrado unitário na página */
  const rectMatrix = (x: number, y: number, rw: number, rh: number): Affine =>
    [M[0] * rw, M[1] * rw, M[2] * rh, M[3] * rh, M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const draw = (img: PdfImage, m: Affine): void => page.drawImageMatrix(img, m[0], m[1], m[2], m[3], m[4], m[5]);

  const subs = shapeSubs(look, w, h, !!it.flipH, !!it.flipV);
  const polysLocal = flattenPath(subs, [1, 0, 0, 1, 0, 0], 0.2);
  const cmds = (polys: number[][]): PathCmd[] => {
    const out: PathCmd[] = [];
    for (const p of polys) {
      for (let i = 0; i < p.length; i += 2) {
        const [x, y] = P(p[i]!, p[i + 1]!);
        out.push({ op: i ? 'L' : 'M', x, y });
      }
      out.push({ op: 'Z' });
    }
    return out;
  };

  const bb = bounds(look, w, h);
  let ppt = PPT;
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * ppt * ppt;
  if (area > 8e6) ppt *= Math.sqrt(8e6 / area);
  const W = Math.max(1, Math.ceil((bb.x1 - bb.x0) * ppt)), H = Math.max(1, Math.ceil((bb.y1 - bb.y0) * ppt));
  const ox = -bb.x0 * ppt, oy = -bb.y0 * ppt;
  const needSil = !!(look.shadow || look.glow || look.softEdgePt);
  const sil = needSil ? fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35)) : null;
  const box = { x: ox, y: oy, w: w * ppt, h: h * ppt };
  const layerMatrix = rectMatrix(bb.x0, bb.y0, W / ppt, H / ppt);

  // 1) sombra externa e brilho (atrás)
  const s = look.shadow;
  if (s?.kind === 'outer' && sil) {
    const dir = s.rotWithShape ? s.dirDeg : s.dirDeg - (it.rot ?? 0);
    const m = outerShadowMask(sil, box, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: dir, sx: s.sx, sy: s.sy, kxDeg: s.kxDeg, kyDeg: s.kyDeg, algn: s.algn }, ppt);
    draw(env.embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }
  if (look.glow && sil) draw(env.embedRgba(colored(glowMask(sil, look.glow.radPt, ppt), look.glow.color, look.glow.alpha), W, H), layerMatrix);

  // a imagem inteira (sem recorte) no referencial local
  const crop = it.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  const fw = w / Math.max(0.01, 1 - crop.l - crop.r), fh = h / Math.max(0.01, 1 - crop.t - crop.b);
  const fx0 = -crop.l * fw, fy0 = -crop.t * fh;
  // espelho: o quadro da imagem inteira refletido dentro da caixa
  const imgRect = (): Affine => {
    const x = it.flipH ? w - fx0 - fw : fx0, y = it.flipV ? h - fy0 - fh : fy0;
    const m = rectMatrix(it.flipH ? x + fw : x, it.flipV ? y + fh : y, it.flipH ? -fw : fw, it.flipV ? -fh : fh);
    return m;
  };
  // máscara das bordas suaves sobre a IMAGEM INTEIRA (o /SMask cobre o quadrado unitário dela)
  const softMask = (): { alpha: Uint8Array; width: number; height: number } | null => {
    if (!look.softEdgePt || !sil) return null;
    const m = softEdgeMask(sil, look.softEdgePt, ppt);
    const iw = Math.max(1, Math.round(fw * ppt)), ih = Math.max(1, Math.round(fh * ppt));
    const alpha = new Uint8Array(iw * ih);
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        // pixel da imagem (com espelho) → camada
        const lx = (it.flipH ? w - (fx0 + (x + 0.5) / ppt) : fx0 + (x + 0.5) / ppt) * ppt + ox;
        const ly = (it.flipV ? h - (fy0 + (y + 0.5) / ppt) : fy0 + (y + 0.5) / ppt) * ppt + oy;
        const xi = Math.floor(lx), yi = Math.floor(ly);
        alpha[y * iw + x] = xi < 0 || yi < 0 || xi >= W || yi >= H ? 0 : Math.round(m.a[yi * W + xi]! * 255);
      }
    }
    return { alpha, width: iw, height: ih };
  };

  // 2) reflexo: a imagem espelhada com o degradê (e a forma), a `dist` na direção `dir`
  const r = look.reflection;
  if (r) {
    const a = (r.dirDeg * Math.PI) / 180;
    const dy = r.distPt * Math.sin(a), dx = r.distPt * Math.cos(a);
    const iw = Math.max(1, Math.round(fw * ppt)), ih = Math.max(1, Math.round(fh * ppt));
    const alpha = new Uint8Array(iw * ih);
    const shapeM = fillPolygons(newMask(iw, ih), flattenPath(subs, [ppt, 0, 0, ppt, -fx0 * ppt, -fy0 * ppt], 0.35));
    const soft = look.softEdgePt ? softEdgeMask(shapeM, look.softEdgePt, ppt) : shapeM;
    for (let y = 0; y < ih; y++) {
      // linha y da imagem espelhada: t medido a partir da borda de baixo da caixa
      const ly = fy0 + (y + 0.5) / ppt;
      const t = (h - ly) / h;
      const al = reflectionAlpha(t, r);
      for (let x = 0; x < iw; x++) alpha[y * iw + x] = Math.round(soft.a[y * iw + x]! * al * 255);
    }
    const img = env.masked(alpha, iw, ih);
    if (img) {
      // espelho vertical em volta da borda de baixo da caixa
      const m = rectMatrix(fx0 + dx, 2 * h - fy0 + dy, fw, -fh);
      draw(img, m);
    }
  }

  // 3') chanfro: a imagem vira um raster da camada com a luz 3D (e a forma/bordas
  // suaves no alfa), como o Word grava
  const src = look.bevel ? env.rgba() : null;
  if (look.bevel && src) {
    const shapeM = sil ?? fillPolygons(newMask(W, H), flattenPath(subs, [ppt, 0, 0, ppt, ox, oy], 0.35));
    const alphaM = look.softEdgePt ? softEdgeMask(shapeM, look.softEdgePt, ppt) : shapeM;
    const px = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (shapeM.a[k]! <= 0) continue;
        // pixel da camada → ponto da imagem inteira (corte e espelho)
        let lx = (x + 0.5 - ox) / ppt, ly = (y + 0.5 - oy) / ppt;
        if (it.flipH) lx = w - lx;
        if (it.flipV) ly = h - ly;
        const u = (lx - fx0) / fw, v = (ly - fy0) / fh;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        const si = (Math.min(src.height - 1, Math.floor(v * src.height)) * src.width + Math.min(src.width - 1, Math.floor(u * src.width))) * 4;
        px[k * 4] = src.data[si]!; px[k * 4 + 1] = src.data[si + 1]!; px[k * 4 + 2] = src.data[si + 2]!;
        px[k * 4 + 3] = Math.round(src.data[si + 3]! * Math.min(1, alphaM.a[k]!));
      }
    }
    shadeBevel(px, shapeM, { w: look.bevel.wPt * ppt, h: look.bevel.hPt * ppt, prst: look.bevel.prst, rig: look.bevel.rig, dir: look.bevel.dir, material: look.bevel.material, word: true });
    draw(env.embedRgba(px, W, H), layerMatrix);
  }

  // 3) a imagem recortada pela forma (bordas suaves como /SMask)
  const sm = look.bevel && src ? null : softMask();
  const img = look.bevel && src ? null : sm ? env.masked(sm.alpha, sm.width, sm.height) : env.image();
  if (img) {
    page.pushClipPath(cmds(polysLocal));
    draw(img, imgRect());
    page.popClip();
  }

  // 4) sombra interna (dentro da forma)
  if (s?.kind === 'inner' && sil) {
    const m = innerShadowMask(sil, { blurPt: s.blurPt, distPt: s.distPt, dirDeg: s.dirDeg }, ppt);
    draw(env.embedRgba(colored(m, s.color, s.alpha), W, H), layerMatrix);
  }

  // 5) contorno todo de fora: traço de 2w recortado pelo lado de fora da forma
  const ln = look.line;
  if (ln && ln.widthPt > 0) {
    const outer: PathCmd[] = [];
    const big = [[bb.x0 - 10, bb.y0 - 10], [bb.x1 + 10, bb.y0 - 10], [bb.x1 + 10, bb.y1 + 10], [bb.x0 - 10, bb.y1 + 10]];
    big.forEach(([x, y], i) => { const [px, py] = P(x!, y!); outer.push({ op: i ? 'L' : 'M', x: px, y: py }); });
    outer.push({ op: 'Z' });
    page.pushClipPath([...outer, ...cmds(polysLocal)], true);
    const dash = ln.dash ? DASH[ln.dash]?.map((v) => v * ln.widthPt) : undefined;
    page.withAlpha(undefined, ln.alpha < 1 ? ln.alpha : undefined, () =>
      page.path(cmds(polysLocal), undefined, { color: rgb(ln.color).map((v) => v / 255) as [number, number, number], widthPt: 2 * ln.widthPt, ...(dash ? { dash } : {}) }));
    page.popClip();
  }
  void gaussianBlur;
}

const DASH: Record<string, number[]> = {
  sysDot: [1, 1], sysDash: [3, 1], dash: [4, 3], dashDot: [4, 3, 1, 3], lgDash: [8, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1],
};
