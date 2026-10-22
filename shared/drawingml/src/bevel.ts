/**
 * Sombreado do chanfro 3D (`<a:sp3d><a:bevelT>` com câmera de frente) sobre
 * pixels RGBA: distância de cada pixel à borda da silhueta → inclinação do
 * perfil (bevelPhi) → normal (azimute pelo gradiente da distância, ângulo polar
 * pelo perfil) → luz medida (light3d): em luz linear cor·D + S; a face plana
 * também muda (D da face). A mesma matemática do Slides (render.ts applyBevel),
 * conferida numa imagem do Word (image-lab bevel-5: face ±3 níveis).
 */
import { lightAt, lightFace, lightTable, bevelPhi } from './light3d.js';
import { distanceTo, gaussianBlur, type Mask } from './raster.js';
import { WORD_BEVEL } from './bevel-word.js';

export interface BevelSpec {
  /** largura e altura do chanfro, em pixels do raster */
  w: number;
  h: number;
  prst?: string;
  rig?: string;
  dir?: string;
  material?: string;
  /** tabela medida no Word (imagens): a luz por azimute × fração da largura */
  word?: boolean;
}

const wordTabs = new Map<string, Uint8Array>();
/** Tabela do Word para o preset (só o rig threePt de cima com o material padrão foi medido). */
function wordTable(b: BevelSpec): Uint8Array | undefined {
  if (!b.word || (b.rig && b.rig !== 'threePt') || (b.dir && b.dir !== 't') || (b.material && b.material !== 'warmMatte')) return undefined;
  const k = b.prst ?? 'circle';
  const raw = WORD_BEVEL[k];
  if (!raw) return undefined;
  let t = wordTabs.get(k);
  if (!t) {
    const bin = atob(raw);
    t = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
    wordTabs.set(k, t);
  }
  return t;
}

/** D e S da tabela do Word (interpolação no azimute e na fração t). */
function wordLight(t: Uint8Array, thDeg: number, u: number, out: Float32Array): void {
  const NA = 24, NT = 24;
  const th = ((thDeg % 360) + 360) % 360;
  const ai = th / 15 - 0.5, a0 = ((Math.floor(ai) % NA) + NA) % NA, a1 = (a0 + 1) % NA, fa = ai - Math.floor(ai);
  const ti = Math.max(0, Math.min(NT - 1, u * NT - 0.5)), t0 = Math.floor(ti), t1 = Math.min(NT, t0 + 1), ft = ti - t0;
  const at = (a: number, k: number, c: number): number => t[(a * (NT + 1) + k) * 2 + c]!;
  for (let c = 0; c < 2; c++) {
    const v = (at(a0, t0, c) * (1 - ft) + at(a0, t1, c) * ft) * (1 - fa) + (at(a1, t0, c) * (1 - ft) + at(a1, t1, c) * ft) * fa;
    if (c === 0) out[0] = out[1] = out[2] = v * 0.02; else out[3] = v / 255;
  }
}

const SRGB_LIN = new Float32Array(256);
for (let v = 0; v < 256; v++) { const x = v / 255; SRGB_LIN[v] = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
const LIN_SRGB = new Uint8Array(4096);
for (let i = 0; i < 4096; i++) { const x = i / 4095; LIN_SRGB[i] = Math.round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)); }

/** Aplica o chanfro nos pixels `rgba` (w×h) dentro da silhueta `sil` (mesmo tamanho). */
export function shadeBevel(rgba: Uint8ClampedArray | Uint8Array, sil: Mask, b: BevelSpec): void {
  const wt = wordTable(b);
  const tab = lightTable(b.rig, b.material);
  if ((!tab && !wt) || !(b.w > 0.5)) return;
  const { w: W, h: H } = sil;
  // distância (px) até FORA da forma — a borda do raster conta como fora
  const P = { w: W + 2, h: H + 2, a: new Float32Array((W + 2) * (H + 2)) };
  for (let r = 0; r < H; r++) P.a.set(sil.a.subarray(r * W, r * W + W), (r + 1) * (W + 2) + 1);
  const pd = distanceTo(P, false);
  const dist = new Float32Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) dist[r * W + c] = pd[(r + 1) * (W + 2) + c + 1]!;
  // direção da normal: gradiente (Sobel) da distância suavizada — a distância
  // discreta perto da borda faz estrias
  const sm = gaussianBlur({ w: W, h: H, a: dist }, 1.2).a;
  const hw = b.h / b.w;
  const L = new Float32Array(4), face = new Float32Array(4);
  if (wt) { const o = 24 * 25 * 2 - 2; face[0] = face[1] = face[2] = wt[o]! * 0.02; face[3] = wt[o + 1]! / 255; } else lightFace(tab!, face);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c, a = sil.a[i]!;
      if (a <= 0) continue;
      const d = dist[i]!;
      let lt = face;
      if (d < b.w) {
        // direção para FORA = −∇d (Sobel na distância suavizada)
        const g = (cc: number, rr: number): number => sm[Math.min(H - 1, Math.max(0, rr)) * W + Math.min(W - 1, Math.max(0, cc))]!;
        const gx = g(c + 1, r - 1) + 2 * g(c + 1, r) + g(c + 1, r + 1) - g(c - 1, r - 1) - 2 * g(c - 1, r) - g(c - 1, r + 1);
        const gy = g(c - 1, r + 1) + 2 * g(c, r + 1) + g(c + 1, r + 1) - g(c - 1, r - 1) - 2 * g(c, r - 1) - g(c + 1, r - 1);
        const th = (Math.atan2(-gy, -gx) * 180) / Math.PI;
        if (wt) wordLight(wt, th, d / b.w, L);
        else {
          const ph = bevelPhi(b.prst, d / b.w, hw);
          // inclinada para dentro: a normal aponta para o lado oposto
          lightAt(tab!, b.dir, ph < 0 ? th + 180 : th, Math.abs(ph), L);
        }
        lt = L;
      }
      const o = i * 4;
      for (let k = 0; k < 3; k++) {
        const v = SRGB_LIN[rgba[o + k]!]! * lt[k]! + lt[3]!;
        const nv = LIN_SRGB[Math.max(0, Math.min(4095, Math.round(v * 4095)))]!;
        rgba[o + k] = a >= 1 ? nv : Math.round(rgba[o + k]! + (nv - rgba[o + k]!) * a);
      }
    }
  }
}
