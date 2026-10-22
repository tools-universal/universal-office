/**
 * Efeitos DrawingML (a:effectLst) como máscaras de alfa, a partir da silhueta da
 * forma — os modelos medidos no PDF do Word (write/tools/image-lab, fx-fit.py):
 * - sombra externa: a silhueta escalada/inclinada em volta do ponto `algn` e
 *   deslocada (dist, dir), desfocada com gaussiana σ = blurRad/3;
 * - sombra interna: silhueta × (1 − desfoque(silhueta deslocada CONTRA a
 *   direção)) — o lado para onde `dir` aponta fica sombreado;
 * - brilho: silhueta dilatada rad/2 e desfocada com σ = rad/6;
 * - bordas suaves: silhueta erodida 0,86·rad e desfocada com σ = rad/3;
 * - reflexo: o alfa cai linearmente de stA (em stPos) a endA (em endPos) e é 0
 *   depois; a cópia espelhada vai a `dist` na direção `dir`.
 * Medidas em pontos; `ppt` = pixels por ponto da camada.
 */
import { gaussianBlur, morph, newMask, shiftMask, warpMask, invertAffine, mulAffine, type Affine, type Mask } from './raster.js';

export interface ShadowSpec {
  blurPt: number;
  distPt: number;
  /** graus, horário a partir do leste */
  dirDeg: number;
  /** escala (1 = 100%) e inclinação (graus) */
  sx?: number; sy?: number; kxDeg?: number; kyDeg?: number;
  /** tl|t|tr|l|ctr|r|bl|b|br (padrão b) */
  algn?: string;
}

/** Ponto de alinhamento `algn` na caixa (x, y, w, h). */
export function alignPoint(algn: string | undefined, x: number, y: number, w: number, h: number): [number, number] {
  const a = algn ?? 'b';
  const fx = a === 'tl' || a === 'l' || a === 'bl' ? 0 : a === 'tr' || a === 'r' || a === 'br' ? 1 : 0.5;
  const fy = a === 'tl' || a === 't' || a === 'tr' ? 0 : a === 'bl' || a === 'b' || a === 'br' ? 1 : 0.5;
  return [x + fx * w, y + fy * h];
}

/** Afim da sombra externa (unidades da máscara): inclinação e escala em volta do
 *  ponto de alinhamento, depois o deslocamento. */
export function shadowAffine(s: ShadowSpec, box: { x: number; y: number; w: number; h: number }, ppt: number): Affine {
  const [ax, ay] = alignPoint(s.algn, box.x, box.y, box.w, box.h);
  const sx = s.sx ?? 1, sy = s.sy ?? 1;
  const kx = Math.tan(((s.kxDeg ?? 0) * Math.PI) / 180), ky = Math.tan(((s.kyDeg ?? 0) * Math.PI) / 180);
  const a = (s.dirDeg * Math.PI) / 180;
  const dx = s.distPt * ppt * Math.cos(a), dy = s.distPt * ppt * Math.sin(a);
  // p' = A + S·K·(p − A) + d
  const K: Affine = [1, ky, kx, 1, 0, 0];
  const S: Affine = [sx, 0, 0, sy, 0, 0];
  const toA: Affine = [1, 0, 0, 1, -ax, -ay];
  const back: Affine = [1, 0, 0, 1, ax + dx, ay + dy];
  return mulAffine(back, mulAffine(S, mulAffine(K, toA)));
}

/** Máscara da sombra externa (mesmo tamanho de `sil`). */
export function outerShadowMask(sil: Mask, box: { x: number; y: number; w: number; h: number }, s: ShadowSpec, ppt: number): Mask {
  const m = shadowAffine(s, box, ppt);
  const moved = warpMask(sil, invertAffine(m), sil.w, sil.h);
  return gaussianBlur(moved, (s.blurPt / 3) * ppt);
}

/** Máscara da sombra interna. */
export function innerShadowMask(sil: Mask, s: { blurPt: number; distPt: number; dirDeg: number }, ppt: number): Mask {
  const a = (s.dirDeg * Math.PI) / 180;
  const sh = shiftMask(sil, -s.distPt * ppt * Math.cos(a), -s.distPt * ppt * Math.sin(a));
  const b = gaussianBlur(sh, (s.blurPt / 3) * ppt);
  const out = newMask(sil.w, sil.h);
  for (let i = 0; i < out.a.length; i++) out.a[i] = sil.a[i]! * (1 - b.a[i]!);
  return out;
}

/** Máscara do brilho. */
export function glowMask(sil: Mask, radPt: number, ppt: number): Mask {
  return gaussianBlur(morph(sil, (radPt / 2) * ppt), (radPt / 6) * ppt);
}

/** Máscara das bordas suaves (multiplica a forma). */
export function softEdgeMask(sil: Mask, radPt: number, ppt: number): Mask {
  const e = gaussianBlur(morph(sil, -0.86 * radPt * ppt), (radPt / 3) * ppt);
  for (let i = 0; i < e.a.length; i++) e.a[i] = Math.min(e.a[i]!, sil.a[i]!);
  return e;
}

/** Alfa do reflexo na fração t (0 = encostado na forma, 1 = a forma inteira). */
export function reflectionAlpha(t: number, r: { stA: number; stPos: number; endA: number; endPos: number }): number {
  if (t < r.stPos) return r.stA;
  if (t > r.endPos || r.endPos <= r.stPos) return t > r.endPos ? 0 : r.stA;
  return r.stA + ((r.endA - r.stA) * (t - r.stPos)) / (r.endPos - r.stPos);
}
