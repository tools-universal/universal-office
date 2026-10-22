// Formato da Imagem — regras PURAS (sem DOM) que o <universal-write> aplica sobre
// o XML da imagem (docx-core/picture-xml.ts). Tudo medido no Word (oráculo
// write/tools/image-lab, memória word-picture-oracle-facts):
// - wp:effectExtent em passos de 19050 EMU (2 px a 96 dpi), arredondado para cima;
// - ordem z: objeto novo/Trazer para a Frente = maior + 1024, Enviar para Trás =
//   menor − 1025;
// - Preencher/Ajustar: srcRect simétrico pela razão das proporções;
// - predefinições de sombra/reflexo/bordas suaves/bisel/rotação 3D = as do COM.
import type {
  PictureFormat, PicShadow, PicReflection, DmlColor, Pic3D, PicLine, PicBlipFx,
} from '@universal-office/docx-core';

export type Lbl = { en: string; pt: string };

const STEP = 19050;
const up = (v: number): number => (v <= 0.5 ? 0 : Math.ceil(v / STEP - 1e-6) * STEP);

/** wp:effectExtent que o Word grava para a formatação (EMU). */
export function effectExtentOf(f: Pick<PictureFormat, 'cx' | 'cy' | 'rot' | 'line' | 'effects' | 'threeD'>): { l: number; t: number; r: number; b: number } {
  const { cx, cy } = f;
  let l = 0, t = 0, r = 0, b = 0;
  const grow = (L: number, T: number, R: number, B: number): void => {
    l = Math.max(l, L); t = Math.max(t, T); r = Math.max(r, R); b = Math.max(b, B);
  };
  // giro: a caixa envolvente do retângulo girado (giro 30° de 144×108 pt → 18/30 pt)
  let ex = 0, ey = 0;
  if (f.rot) {
    const a = ((f.rot / 60000) * Math.PI) / 180;
    const bw = Math.abs(cx * Math.cos(a)) + Math.abs(cy * Math.sin(a));
    const bh = Math.abs(cx * Math.sin(a)) + Math.abs(cy * Math.cos(a));
    ex = (bw - cx) / 2; ey = (bh - cy) / 2;
    grow(ex, ey, ex, ey);
  }
  // contorno: inteiro do lado de fora (a largura toda)
  const ln = f.line;
  if (ln && ln.fill !== null && (ln.fill !== undefined || ln.fillRaw)) {
    const w = ln.w ?? 9525;
    grow(ex + w, ey + w, ex + w, ey + w);
  }
  const fx = f.effects;
  const s = fx.shadow;
  if (s && s.kind === 'outer') {
    const blur = s.blurRad ?? 0, d = s.dist ?? 0;
    const a = (((s.dir ?? 0) / 60000) * Math.PI) / 180;
    const dx = d * Math.cos(a), dy = d * Math.sin(a);
    // escala/inclinação: a sombra cresce em volta da âncora (algn)
    const sx = (s.sx ?? 100000) / 100000, sy = (s.sy ?? 100000) / 100000;
    const kx = Math.tan((((s.kx ?? 0) / 60000) * Math.PI) / 180), ky = Math.tan((((s.ky ?? 0) / 60000) * Math.PI) / 180);
    const al = s.algn ?? 'b';
    const ax = al.includes('l') ? 0 : al.includes('r') ? 1 : 0.5;
    const ay = al.startsWith('t') ? 0 : al.startsWith('b') ? 1 : 0.5;
    const corners = [[0, 0], [cx, 0], [0, cy], [cx, cy]].map(([x, y]) => {
      const px = ax * cx + (x! - ax * cx) * sx + (y! - ay * cy) * kx * sy;
      const py = ay * cy + (y! - ay * cy) * sy + (x! - ax * cx) * ky * sx;
      return [px + dx, py + dy] as const;
    });
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    grow(blur - Math.min(...xs), blur - Math.min(...ys), Math.max(...xs) - cx + blur, Math.max(...ys) - cy + blur);
  }
  if (fx.glow) grow(fx.glow.rad + ex, fx.glow.rad + ey, fx.glow.rad + ex, fx.glow.rad + ey);
  const rf = fx.reflection;
  if (rf) {
    const blur = rf.blurRad ?? 0;
    const span = ((rf.endPos ?? 100000) / 100000) * cy;
    grow(blur, 0, blur, (rf.dist ?? 0) + span + blur * 4);
  }
  return { l: up(l), t: up(t), r: up(r), b: up(b) };
}

// ───────────────────────── ordem z ─────────────────────────

export const Z_FIRST = 251658240;

/** relativeHeight novo para a operação de ordem (medido: frente = maior + 1024,
 *  trás = menor − 1025; avançar/recuar passam o vizinho de cima/baixo). */
export function zFor(op: 'front' | 'back' | 'forward' | 'backward', mine: number, others: number[]): number {
  const all = others.filter((v) => v !== mine).sort((a, b) => a - b);
  if (!all.length) return mine;
  const max = all[all.length - 1]!, min = all[0]!;
  if (op === 'front') return max + 1024;
  if (op === 'back') return min - 1025;
  if (op === 'forward') {
    const above = all.filter((v) => v > mine);
    if (!above.length) return mine;
    const next = above[0]!, after = above[1];
    return after === undefined ? next + 1024 : Math.floor((next + after) / 2);
  }
  const below = all.filter((v) => v < mine);
  if (!below.length) return mine;
  const prev = below[below.length - 1]!, before = below[below.length - 2];
  return before === undefined ? prev - 1025 : Math.floor((prev + before) / 2);
}

// ───────────────────────── corte ─────────────────────────

/** Preencher/Ajustar (medido): a imagem inteira cobre (Preencher) ou cabe
 *  (Ajustar) no quadro atual; srcRect simétrico, milésimos de %. */
export function fillFitCrop(mode: 'fill' | 'fit', box: { cx: number; cy: number }, natural: { w: number; h: number }): { l: number; t: number; r: number; b: number } {
  const boxA = box.cx / box.cy, imgA = natural.w / natural.h;
  const r = { l: 0, t: 0, r: 0, b: 0 };
  if (Math.abs(boxA - imgA) < 1e-9) return r;
  const wide = boxA > imgA;
  if (mode === 'fill') {
    // a imagem cobre o quadro: corta em cima/embaixo (quadro mais largo) ou dos lados
    if (wide) r.t = r.b = Math.round(((1 - imgA / boxA) / 2) * 100000);
    else r.l = r.r = Math.round(((1 - boxA / imgA) / 2) * 100000);
  } else {
    // a imagem cabe no quadro: margem negativa dos lados (quadro mais largo) ou em cima/embaixo
    if (wide) r.l = r.r = -Math.round(((boxA / imgA - 1) / 2) * 100000);
    else r.t = r.b = -Math.round(((imgA / boxA - 1) / 2) * 100000);
  }
  return r;
}

/** Corte numa proporção: a maior região centrada da imagem visível com a razão
 *  pedida; o quadro passa a ter essa razão mantendo a escala da imagem. */
export function aspectCrop(f: Pick<PictureFormat, 'cx' | 'cy' | 'srcRect'>, ratio: number): { crop: { l: number; t: number; r: number; b: number }; cx: number; cy: number } {
  const s = f.srcRect;
  const visW = 1 - (s.l + s.r) / 100000, visH = 1 - (s.t + s.b) / 100000;
  // tamanho da imagem inteira na escala atual
  const fullW = f.cx / visW, fullH = f.cy / visH;
  let cx = f.cx, cy = f.cy;
  if (cx / cy > ratio) cx = cy * ratio; else cy = cx / ratio;
  const dx = (f.cx - cx) / 2 / fullW, dy = (f.cy - cy) / 2 / fullH;
  return {
    crop: { l: Math.round(s.l + dx * 100000), r: Math.round(s.r + dx * 100000), t: Math.round(s.t + dy * 100000), b: Math.round(s.b + dy * 100000) },
    cx: Math.round(cx), cy: Math.round(cy),
  };
}

export const ASPECT_RATIOS: { id: string; group: 'square' | 'portrait' | 'landscape'; w: number; h: number }[] = [
  { id: '1:1', group: 'square', w: 1, h: 1 },
  { id: '2:3', group: 'portrait', w: 2, h: 3 }, { id: '3:4', group: 'portrait', w: 3, h: 4 }, { id: '3:5', group: 'portrait', w: 3, h: 5 }, { id: '4:5', group: 'portrait', w: 4, h: 5 },
  { id: '3:2', group: 'landscape', w: 3, h: 2 }, { id: '4:3', group: 'landscape', w: 4, h: 3 }, { id: '5:3', group: 'landscape', w: 5, h: 3 }, { id: '5:4', group: 'landscape', w: 5, h: 4 },
  { id: '16:9', group: 'landscape', w: 16, h: 9 }, { id: '16:10', group: 'landscape', w: 16, h: 10 },
];

// ───────────────────────── predefinições ─────────────────────────

const black = (alpha?: number): DmlColor => ({ kind: 'prstClr', val: 'black', ...(alpha !== undefined ? { mods: [['alpha', alpha]] as [string, number][] } : {}) });

/** Galeria de Sombra (COM Shadow.Type 21–43): 9 externas, 9 internas, 5 em perspectiva. */
export const SHADOW_PRESETS: { id: string; group: 'outer' | 'inner' | 'persp'; label: Lbl; shadow: PicShadow }[] = [
  { id: 'outer-br', group: 'outer', label: { en: 'Offset: Bottom Right', pt: 'Deslocamento: Inferior Direito' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 2700000, algn: 'tl', color: black(40000) } },
  { id: 'outer-b', group: 'outer', label: { en: 'Offset: Bottom', pt: 'Deslocamento: Inferior' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 5400000, algn: 't', color: black(40000) } },
  { id: 'outer-bl', group: 'outer', label: { en: 'Offset: Bottom Left', pt: 'Deslocamento: Inferior Esquerdo' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 8100000, algn: 'tr', color: black(40000) } },
  { id: 'outer-r', group: 'outer', label: { en: 'Offset: Right', pt: 'Deslocamento: Direita' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, algn: 'l', color: black(40000) } },
  { id: 'outer-c', group: 'outer', label: { en: 'Offset: Center', pt: 'Deslocamento: Centro' }, shadow: { kind: 'outer', blurRad: 63500, sx: 102000, sy: 102000, algn: 'ctr', color: black(40000) } },
  { id: 'outer-l', group: 'outer', label: { en: 'Offset: Left', pt: 'Deslocamento: Esquerda' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 10800000, algn: 'r', color: black(40000) } },
  { id: 'outer-tr', group: 'outer', label: { en: 'Offset: Top Right', pt: 'Deslocamento: Superior Direito' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 18900000, algn: 'bl', color: black(40000) } },
  { id: 'outer-t', group: 'outer', label: { en: 'Offset: Top', pt: 'Deslocamento: Superior' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 16200000, color: black(40000) } },
  { id: 'outer-tl', group: 'outer', label: { en: 'Offset: Top Left', pt: 'Deslocamento: Superior Esquerdo' }, shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 13500000, algn: 'br', color: black(40000) } },
  { id: 'inner-tl', group: 'inner', label: { en: 'Inside: Top Left', pt: 'Interna: Superior Esquerda' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 13500000, color: black(50000) } },
  { id: 'inner-t', group: 'inner', label: { en: 'Inside: Top', pt: 'Interna: Superior' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 16200000, color: black(50000) } },
  { id: 'inner-tr', group: 'inner', label: { en: 'Inside: Top Right', pt: 'Interna: Superior Direita' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 18900000, color: black(50000) } },
  { id: 'inner-l', group: 'inner', label: { en: 'Inside: Left', pt: 'Interna: Esquerda' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 10800000, color: black(50000) } },
  { id: 'inner-c', group: 'inner', label: { en: 'Inside: Center', pt: 'Interna: Centro' }, shadow: { kind: 'inner', blurRad: 114300, color: black() } },
  { id: 'inner-r', group: 'inner', label: { en: 'Inside: Right', pt: 'Interna: Direita' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, color: black(50000) } },
  { id: 'inner-bl', group: 'inner', label: { en: 'Inside: Bottom Left', pt: 'Interna: Inferior Esquerda' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 8100000, color: black(50000) } },
  { id: 'inner-b', group: 'inner', label: { en: 'Inside: Bottom', pt: 'Interna: Inferior' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 5400000, color: black(50000) } },
  { id: 'inner-br', group: 'inner', label: { en: 'Inside: Bottom Right', pt: 'Interna: Inferior Direita' }, shadow: { kind: 'inner', blurRad: 63500, dist: 50800, dir: 2700000, color: black(50000) } },
  { id: 'persp-ul', group: 'persp', label: { en: 'Perspective: Upper Left', pt: 'Perspectiva: Superior Esquerda' }, shadow: { kind: 'outer', blurRad: 76200, dir: 13500000, sy: 23000, kx: 1200000, algn: 'br', color: black(20000) } },
  { id: 'persp-ur', group: 'persp', label: { en: 'Perspective: Upper Right', pt: 'Perspectiva: Superior Direita' }, shadow: { kind: 'outer', blurRad: 76200, dir: 18900000, sy: 23000, kx: -1200000, algn: 'bl', color: black(20000) } },
  { id: 'persp-below', group: 'persp', label: { en: 'Perspective: Below', pt: 'Perspectiva: Abaixo' }, shadow: { kind: 'outer', blurRad: 152400, dist: 317500, dir: 5400000, sx: 90000, sy: -19000, color: black(15000) } },
  { id: 'persp-ll', group: 'persp', label: { en: 'Perspective: Lower Left', pt: 'Perspectiva: Inferior Esquerda' }, shadow: { kind: 'outer', blurRad: 76200, dist: 12700, dir: 8100000, sy: -23000, kx: 800400, algn: 'br', color: black(20000) } },
  { id: 'persp-lr', group: 'persp', label: { en: 'Perspective: Lower Right', pt: 'Perspectiva: Inferior Direita' }, shadow: { kind: 'outer', blurRad: 76200, dist: 12700, dir: 2700000, sy: -23000, kx: -800400, algn: 'bl', color: black(20000) } },
];

const refl = (stA: number, endA: number, endPos: number, dist?: number): PicReflection => ({
  blurRad: 6350, stA, endA, endPos, ...(dist ? { dist } : {}), dir: 5400000, sy: -100000, algn: 'bl', rotWithShape: false,
});
/** Galeria de Reflexo (COM Reflection.Type 1–9). */
export const REFLECTION_PRESETS: { id: string; label: Lbl; reflection: PicReflection }[] = [
  { id: 'tight-touch', label: { en: 'Tight Reflection: Touching', pt: 'Reflexo Justo: Encostado' }, reflection: refl(52000, 300, 35000) },
  { id: 'half-touch', label: { en: 'Half Reflection: Touching', pt: 'Meio Reflexo: Encostado' }, reflection: refl(50000, 300, 55000) },
  { id: 'full-touch', label: { en: 'Full Reflection: Touching', pt: 'Reflexo Total: Encostado' }, reflection: refl(50000, 300, 90000) },
  { id: 'tight-4', label: { en: 'Tight Reflection: 4 pt offset', pt: 'Reflexo Justo: Deslocamento de 4 pt' }, reflection: refl(50000, 300, 38500, 50800) },
  { id: 'half-4', label: { en: 'Half Reflection: 4 pt offset', pt: 'Meio Reflexo: Deslocamento de 4 pt' }, reflection: refl(50000, 300, 55500, 50800) },
  { id: 'full-4', label: { en: 'Full Reflection: 4 pt offset', pt: 'Reflexo Total: Deslocamento de 4 pt' }, reflection: refl(50000, 300, 90000, 50800) },
  { id: 'tight-8', label: { en: 'Tight Reflection: 8 pt offset', pt: 'Reflexo Justo: Deslocamento de 8 pt' }, reflection: refl(50000, 275, 40000, 101600) },
  { id: 'half-8', label: { en: 'Half Reflection: 8 pt offset', pt: 'Meio Reflexo: Deslocamento de 8 pt' }, reflection: refl(50000, 300, 55500, 101600) },
  { id: 'full-8', label: { en: 'Full Reflection: 8 pt offset', pt: 'Reflexo Total: Deslocamento de 8 pt' }, reflection: refl(50000, 295, 92000, 101600) },
];

/** Galeria de Bordas Suaves (COM SoftEdge.Type 1–6), em EMU. */
export const SOFT_EDGE_PRESETS = [12700, 31750, 63500, 127000, 317500, 635000];

/** Galeria de Brilho: 4 tamanhos × 6 cores de ênfase, 60% de transparência. */
export const GLOW_SIZES = [63500, 101600, 139700, 228600];
export const glowPreset = (rad: number, accent: number): { rad: number; color: DmlColor } => ({ rad, color: { kind: 'schemeClr', val: `accent${accent}`, mods: [['alpha', 40000]] } });

/** Galeria de Bisel (COM BevelTopType 2–13): nome do a:bevelT@prst na ordem da galeria. */
export const BEVEL_PRESETS: { prst: string; label: Lbl }[] = [
  { prst: 'circle', label: { en: 'Circle', pt: 'Círculo' } },
  { prst: 'relaxedInset', label: { en: 'Relaxed Inset', pt: 'Inserção Leve' } },
  { prst: 'cross', label: { en: 'Cross', pt: 'Cruz' } },
  { prst: 'coolSlant', label: { en: 'Cool Slant', pt: 'Inclinação Suave' } },
  { prst: 'angle', label: { en: 'Angle', pt: 'Ângulo' } },
  { prst: 'softRound', label: { en: 'Soft Round', pt: 'Arredondamento Suave' } },
  { prst: 'convex', label: { en: 'Convex', pt: 'Convexo' } },
  { prst: 'slope', label: { en: 'Slope', pt: 'Declive' } },
  { prst: 'divot', label: { en: 'Divot', pt: 'Torrão' } },
  { prst: 'riblet', label: { en: 'Riblet', pt: 'Ondulado' } },
  { prst: 'hardEdge', label: { en: 'Hard Edge', pt: 'Borda Rígida' } },
  { prst: 'artDeco', label: { en: 'Art Deco', pt: 'Art Déco' } },
];

/** Bisel aplicado pela galeria (medido): câmera ortográfica + luz threePt t. */
export function bevel3D(prst: string): Pic3D {
  return { camera: { prst: 'orthographicFront' }, lightRig: { rig: 'threePt', dir: 't' }, bevelT: prst === 'circle' ? {} : { prst } };
}

/** Galeria de Rotação 3D: câmeras por grupo. */
export const ROTATION_PRESETS: { group: 'parallel' | 'perspective' | 'oblique'; prst: string; label: Lbl }[] = [
  { group: 'parallel', prst: 'isometricLeftDown', label: { en: 'Isometric: Left Down', pt: 'Isométrica: Esquerda para Baixo' } },
  { group: 'parallel', prst: 'isometricRightUp', label: { en: 'Isometric: Right Up', pt: 'Isométrica: Direita para Cima' } },
  { group: 'parallel', prst: 'isometricTopUp', label: { en: 'Isometric: Top Up', pt: 'Isométrica: Superior para Cima' } },
  { group: 'parallel', prst: 'isometricBottomDown', label: { en: 'Isometric: Bottom Down', pt: 'Isométrica: Inferior para Baixo' } },
  { group: 'parallel', prst: 'isometricOffAxis1Left', label: { en: 'Off Axis 1: Left', pt: 'Fora do Eixo 1: Esquerda' } },
  { group: 'parallel', prst: 'isometricOffAxis1Right', label: { en: 'Off Axis 1: Right', pt: 'Fora do Eixo 1: Direita' } },
  { group: 'parallel', prst: 'isometricOffAxis1Top', label: { en: 'Off Axis 1: Top', pt: 'Fora do Eixo 1: Superior' } },
  { group: 'parallel', prst: 'isometricOffAxis2Left', label: { en: 'Off Axis 2: Left', pt: 'Fora do Eixo 2: Esquerda' } },
  { group: 'parallel', prst: 'isometricOffAxis2Right', label: { en: 'Off Axis 2: Right', pt: 'Fora do Eixo 2: Direita' } },
  { group: 'parallel', prst: 'isometricOffAxis2Top', label: { en: 'Off Axis 2: Top', pt: 'Fora do Eixo 2: Superior' } },
  { group: 'perspective', prst: 'perspectiveFront', label: { en: 'Perspective: Front', pt: 'Perspectiva: Frente' } },
  { group: 'perspective', prst: 'perspectiveLeft', label: { en: 'Perspective: Left', pt: 'Perspectiva: Esquerda' } },
  { group: 'perspective', prst: 'perspectiveRight', label: { en: 'Perspective: Right', pt: 'Perspectiva: Direita' } },
  { group: 'perspective', prst: 'perspectiveBelow', label: { en: 'Perspective: Below', pt: 'Perspectiva: Abaixo' } },
  { group: 'perspective', prst: 'perspectiveAbove', label: { en: 'Perspective: Above', pt: 'Perspectiva: Acima' } },
  { group: 'perspective', prst: 'perspectiveAboveLeftFacing', label: { en: 'Perspective: Above Left', pt: 'Perspectiva: Acima à Esquerda' } },
  { group: 'perspective', prst: 'perspectiveAboveRightFacing', label: { en: 'Perspective: Above Right', pt: 'Perspectiva: Acima à Direita' } },
  { group: 'perspective', prst: 'perspectiveContrastingLeftFacing', label: { en: 'Perspective: Contrasting Left', pt: 'Perspectiva: Contrastante à Esquerda' } },
  { group: 'perspective', prst: 'perspectiveContrastingRightFacing', label: { en: 'Perspective: Contrasting Right', pt: 'Perspectiva: Contrastante à Direita' } },
  { group: 'perspective', prst: 'perspectiveHeroicLeftFacing', label: { en: 'Perspective: Heroic Left', pt: 'Perspectiva: Heroica à Esquerda' } },
  { group: 'perspective', prst: 'perspectiveHeroicRightFacing', label: { en: 'Perspective: Heroic Right', pt: 'Perspectiva: Heroica à Direita' } },
  { group: 'perspective', prst: 'perspectiveHeroicExtremeLeftFacing', label: { en: 'Perspective: Heroic Extreme Left', pt: 'Perspectiva: Heroica Extrema à Esquerda' } },
  { group: 'perspective', prst: 'perspectiveHeroicExtremeRightFacing', label: { en: 'Perspective: Heroic Extreme Right', pt: 'Perspectiva: Heroica Extrema à Direita' } },
  { group: 'perspective', prst: 'perspectiveRelaxed', label: { en: 'Perspective: Relaxed', pt: 'Perspectiva: Relaxada' } },
  { group: 'perspective', prst: 'perspectiveRelaxedModerately', label: { en: 'Perspective: Relaxed Moderately', pt: 'Perspectiva: Moderadamente Relaxada' } },
  { group: 'oblique', prst: 'obliqueTopLeft', label: { en: 'Oblique: Top Left', pt: 'Oblíqua: Superior à Esquerda' } },
  { group: 'oblique', prst: 'obliqueTopRight', label: { en: 'Oblique: Top Right', pt: 'Oblíqua: Superior à Direita' } },
  { group: 'oblique', prst: 'obliqueBottomLeft', label: { en: 'Oblique: Bottom Left', pt: 'Oblíqua: Inferior à Esquerda' } },
  { group: 'oblique', prst: 'obliqueBottomRight', label: { en: 'Oblique: Bottom Right', pt: 'Oblíqua: Inferior à Direita' } },
];

// ───────────────────────── ajustes ─────────────────────────

export const SATURATION_PRESETS = [0, 33000, 66000, 100000, 200000, 300000, 400000];
export const TEMPERATURE_PRESETS = [4700, 5300, 5900, 6500, 7200, 8800, 11200];
export const SHARPEN_PRESETS = [-50000, -25000, 0, 25000, 50000];
export const BRIGHT_CONTRAST_STEPS = [-40000, -20000, 0, 20000, 40000];
export const TRANSPARENCY_PRESETS = [0, 15, 30, 50, 65, 80, 95];

const scheme = (val: string, mods: [string, number][] = []): DmlColor => ({ kind: 'schemeClr', val, ...(mods.length ? { mods } : {}) });
const darkOf = (val: string): DmlColor => scheme(val, [['shade', 45000], ['satMod', 135000]]);

/** Galeria Recolorir: 7 modos de cor + 7 variações escuras + 7 claras. */
export const RECOLOR_PRESETS: { id: string; group: 'mode' | 'dark' | 'light'; label: Lbl; fx: Omit<PicBlipFx, 'a14'> }[] = [
  { id: 'none', group: 'mode', label: { en: 'No Recolor', pt: 'Sem Recolorir' }, fx: {} },
  { id: 'grayscale', group: 'mode', label: { en: 'Grayscale', pt: 'Escala de Cinza' }, fx: { grayscl: true } },
  { id: 'sepia', group: 'mode', label: { en: 'Sepia', pt: 'Sépia' }, fx: { duotone: [{ kind: 'prstClr', val: 'black' }, { kind: 'srgbClr', val: 'D9C3A5', mods: [['tint', 50000], ['satMod', 180000]] }] } },
  { id: 'washout', group: 'mode', label: { en: 'Washout', pt: 'Desbotar' }, fx: { lum: { bright: 70000, contrast: -70000 } } },
  { id: 'bw25', group: 'mode', label: { en: 'Black and White: 25%', pt: 'Preto e Branco: 25%' }, fx: { biLevel: 25000 } },
  { id: 'bw50', group: 'mode', label: { en: 'Black and White: 50%', pt: 'Preto e Branco: 50%' }, fx: { biLevel: 50000 } },
  { id: 'bw75', group: 'mode', label: { en: 'Black and White: 75%', pt: 'Preto e Branco: 75%' }, fx: { biLevel: 75000 } },
  ...(['tx2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'] as const).map((c, i) => ({
    id: `dark-${c}`, group: 'dark' as const,
    label: i === 0 ? { en: 'Text color 2 Dark', pt: 'Cor do texto 2 Escuro' } : { en: `Accent color ${i} Dark`, pt: `Cor de ênfase ${i} Escuro` },
    fx: { duotone: [{ kind: 'prstClr', val: 'black' }, darkOf(c)] as [DmlColor, DmlColor] },
  })),
  ...(['bg2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'] as const).map((c, i) => ({
    id: `light-${c}`, group: 'light' as const,
    label: i === 0 ? { en: 'Background color 2 Light', pt: 'Cor do plano de fundo 2 Claro' } : { en: `Accent color ${i} Light`, pt: `Cor de ênfase ${i} Claro` },
    fx: { duotone: [darkOf(c), { kind: 'prstClr', val: 'white' }] as [DmlColor, DmlColor] },
  })),
];

// ───────────────────────── contorno ─────────────────────────

export const LINE_WEIGHTS_PT = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];
export const LINE_DASHES: { val: string; label: Lbl }[] = [
  { val: 'solid', label: { en: 'Solid', pt: 'Sólido' } },
  { val: 'sysDot', label: { en: 'Round Dot', pt: 'Ponto Redondo' } },
  { val: 'sysDash', label: { en: 'Square Dot', pt: 'Ponto Quadrado' } },
  { val: 'dash', label: { en: 'Dash', pt: 'Traço' } },
  { val: 'dashDot', label: { en: 'Dash Dot', pt: 'Traço Ponto' } },
  { val: 'lgDash', label: { en: 'Long Dash', pt: 'Traço Longo' } },
  { val: 'lgDashDot', label: { en: 'Long Dash Dot', pt: 'Traço Longo Ponto' } },
  { val: 'lgDashDotDot', label: { en: 'Long Dash Dot Dot', pt: 'Traço Longo Ponto Ponto' } },
];

/** Contorno novo a partir do atual (o Word grava a cor sólida; padrão 0,75 pt). */
export function lineWith(cur: PicLine | null | undefined, patch: Partial<PicLine>): PicLine {
  const base: PicLine = cur && cur.fill !== null ? { ...cur } : { w: 9525, fill: { kind: 'schemeClr', val: 'tx1' } };
  return { ...base, ...patch };
}

// ───────────────────────── posição ─────────────────────────

/** Galeria Posição (Com Quebra Automática de Texto Quadrado): relativo à margem. */
export const POSITION_PRESETS: { id: string; h: 'left' | 'center' | 'right'; v: 'top' | 'center' | 'bottom'; label: Lbl }[] = (() => {
  const H = [['left', 'Esquerda', 'Left'], ['center', 'Centro', 'Center'], ['right', 'Direita', 'Right']] as const;
  const V = [['top', 'Superior', 'Top'], ['center', 'Meio', 'Middle'], ['bottom', 'Inferior', 'Bottom']] as const;
  const out: { id: string; h: 'left' | 'center' | 'right'; v: 'top' | 'center' | 'bottom'; label: Lbl }[] = [];
  for (const [v, vp, ve] of V) for (const [h, hp, he] of H) {
    out.push({ id: `${v}-${h}`, h, v, label: { en: `Position in ${ve} ${he} with Square Text Wrapping`, pt: `Posição ${vp === 'Meio' ? 'no Meio' : vp === 'Superior' ? 'Superior' : 'Inferior'} ${hp === 'Centro' ? 'no Centro' : hp === 'Esquerda' ? 'à Esquerda' : 'à Direita'} com Quebra Automática de Texto Quadrada` } });
  }
  return out;
})();
