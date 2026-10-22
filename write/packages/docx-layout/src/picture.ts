/**
 * Formato da Imagem no layout: a aparência da imagem além do bitmap (forma,
 * contorno, sombra, brilho, bordas suaves, reflexo e ajustes do a:blip) com as
 * cores do tema já resolvidas — o pintor do canvas e o do PDF desenham a partir
 * disto (com os efeitos de @universal-office/drawingml).
 */
import { blipFxImageEffects, dmlColorSpec, type DmlColor, type InlineImage, type PicBlipFx, type Theme } from '@universal-office/docx-core';
import { applyImageEffects, applyPictureAdjust } from './images.js';
import { resolveDrawingColor } from './resolve.js';
import type { PictureLook } from './tree.js';

const EMU_PT = 12700;

function color(c: DmlColor | undefined, theme: Theme): { color: string; alpha: number } | undefined {
  if (!c) return undefined;
  const { spec, alpha } = dmlColorSpec(c);
  const hex = resolveDrawingColor(spec, theme);
  return hex ? { color: hex, alpha } : undefined;
}

/** Aparência da imagem (undefined = só o bitmap, como antes). */
export function pictureLook(im: InlineImage, theme: Theme): PictureLook | undefined {
  const f = im.format;
  if (!f) return undefined;
  const out: PictureLook = {};
  if (f.geom && f.geom !== 'rect' && f.geom !== 'custom') out.geom = { prst: f.geom, ...(f.adj ? { adj: f.adj } : {}) };
  const ln = f.line;
  if (ln && ln.fill) {
    const c = color(ln.fill, theme);
    if (c) {
      out.line = { color: c.color, alpha: c.alpha, widthPt: (ln.w ?? 9525) / EMU_PT };
      if (ln.dash && ln.dash !== 'solid') out.line.dash = ln.dash;
      if (ln.cmpd && ln.cmpd !== 'sng') out.line.cmpd = ln.cmpd;
      if (ln.cap) out.line.cap = ln.cap;
      if (ln.join) out.line.join = ln.join;
    }
  }
  const fx = f.effects;
  const s = fx.shadow;
  if (s && (s.kind === 'outer' || s.kind === 'inner')) {
    const c = color(s.color, theme);
    if (c) {
      out.shadow = {
        kind: s.kind, color: c.color, alpha: c.alpha,
        blurPt: (s.blurRad ?? 0) / EMU_PT, distPt: (s.dist ?? 0) / EMU_PT, dirDeg: (s.dir ?? 0) / 60000,
        ...(s.sx !== undefined ? { sx: s.sx / 100000 } : {}), ...(s.sy !== undefined ? { sy: s.sy / 100000 } : {}),
        ...(s.kx ? { kxDeg: s.kx / 60000 } : {}), ...(s.ky ? { kyDeg: s.ky / 60000 } : {}),
        ...(s.algn ? { algn: s.algn } : {}), ...(s.rotWithShape !== undefined ? { rotWithShape: s.rotWithShape } : {}),
      };
    }
  }
  if (fx.glow) {
    const c = color(fx.glow.color, theme);
    if (c) out.glow = { color: c.color, alpha: c.alpha, radPt: fx.glow.rad / EMU_PT };
  }
  if (fx.softEdge) out.softEdgePt = fx.softEdge / EMU_PT;
  // chanfro (câmera de frente; a rotação 3D/perspectiva não é desenhada)
  const td = f.threeD;
  if (td?.bevelT && (!td.camera || td.camera.prst === 'orthographicFront') && !td.camera?.rot) {
    out.bevel = {
      wPt: (td.bevelT.w ?? 76200) / EMU_PT, hPt: (td.bevelT.h ?? 76200) / EMU_PT,
      ...(td.bevelT.prst ? { prst: td.bevelT.prst } : {}), ...(td.lightRig ? { rig: td.lightRig.rig, dir: td.lightRig.dir } : {}),
      ...(td.prstMaterial ? { material: td.prstMaterial } : {}),
    };
  }
  const r = fx.reflection;
  if (r) {
    out.reflection = {
      blurPt: (r.blurRad ?? 0) / EMU_PT, stA: (r.stA ?? 100000) / 100000, stPos: (r.stPos ?? 0) / 100000,
      endA: (r.endA ?? 0) / 100000, endPos: (r.endPos ?? 100000) / 100000,
      distPt: (r.dist ?? 0) / EMU_PT, dirDeg: (r.dir ?? 5400000) / 60000, sy: (r.sy ?? 100000) / 100000,
      ...(r.algn ? { algn: r.algn } : {}), ...(r.rotWithShape !== undefined ? { rotWithShape: r.rotWithShape } : {}),
    };
  }
  Object.assign(out, blipLook(f.blip, theme));
  return Object.keys(out).length ? out : undefined;
}

/** A parte do a:blip da aparência: transparência, tom duplo e cor transparente. */
function blipLook(b: PicBlipFx, theme: Theme): Pick<PictureLook, 'alpha' | 'duotone' | 'clrChange'> {
  const out: Pick<PictureLook, 'alpha' | 'duotone' | 'clrChange'> = {};
  if (b.alphaModFix !== undefined && b.alphaModFix < 100000) out.alpha = b.alphaModFix / 100000;
  if (b.duotone) {
    const c0 = color(b.duotone[0], theme), c1 = color(b.duotone[1], theme);
    if (c0 && c1) out.duotone = [c0.color, c1.color];
  }
  if (b.clrChange) {
    const from = color(b.clrChange.from, theme), to = color(b.clrChange.to, theme);
    if (from && to) out.clrChange = { from: from.color, to: to.color, toAlpha: to.alpha };
  }
  return out;
}

/** Ajustes de cor do a:blip sobre pixels RGBA pelo MESMO caminho do desenho
 *  (a:lum/grayscl/biLevel, depois tom duplo, cor transparente e transparência) —
 *  as miniaturas das galerias Cor e Transparência usam isto. */
export function applyBlipFx(d: Uint8Array | Uint8ClampedArray, b: PicBlipFx, theme: Theme): void {
  const fx = blipFxImageEffects(b);
  if (fx) applyImageEffects(d as Uint8Array, fx);
  applyPictureAdjust(d, blipLook(b, theme));
}
