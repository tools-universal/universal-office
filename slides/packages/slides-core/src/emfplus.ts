/**
 * EMF+ ([MS-EMFPLUS]) tocado num Canvas 2D — os registros GDI+ gravados em
 * comentários dentro de um EMF. Medido no app de referência com decks
 * sintéticos (_lab syn-c-emfplus*, fundo azul, reserva GDI verde):
 *
 * - EMF+ "dual": o app toca os registros EMF+ e IGNORA os GDI de reserva; GDI
 *   só vale logo após um EmfPlusGetDC, até o próximo registro EMF+ (igual em
 *   .pptx e .ppt, com qualquer dpi e qualquer EmfPlusFlags).
 * - Metarquivo aninhado (DrawImage de imagem tipo metarquivo): sai com fundo
 *   transparente; o WMF "placeable" vem com o cabeçalho de 24 bytes que o GDI+
 *   grava (struct alinhada) e o MetafileDataSize conta só o WMF.
 *
 * Subconjunto (o censo do corpus: ~25 decks): caminhos, retângulos, polígonos,
 * linhas, elipses/setores/arcos, Béziers, regiões (retângulo/caminho/infinita
 * e combinações), recorte, transformações, Save/Restore/contêineres, imagens
 * (bitmap cru, comprimido pré-decodificado, metarquivo aninhado), pincéis
 * sólido, hachura, degradê linear e de caminho, canetas com tracejado, pontas
 * e pontas personalizadas (setas). Texto EMF+ (DrawString/DrawDriverString)
 * não — não aparece no corpus; com ele, o EMF "dual" toca a reserva GDI.
 */
import { PRESET_PATTERNS } from './patterns.js';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Pt = [number, number];
type Cmd = { op: 'M' | 'L'; x: number; y: number } | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number } | { op: 'Z' };
/** Matriz afim em convenção de vetor-LINHA do GDI+: p' = p × M = (x·a + y·c + e, x·b + y·d + f). */
export type Mat = [number, number, number, number, number, number];

export const EMF_PLUS = 0x2b464d45; // "EMF+"
const ID: Mat = [1, 0, 0, 1, 0, 0];
/** m depois n (p × m × n) */
export const matMul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Mat, x: number, y: number): Pt => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
const matInv = (m: Mat): Mat | undefined => {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det || !Number.isFinite(det)) return undefined;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
};
const matScale = (m: Mat): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

function tracePath(ctx: Ctx, cmds: Cmd[]): void {
  ctx.beginPath();
  for (const c of cmds) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}

// ─────────────────────────── leitura ───────────────────────────

class Rd {
  readonly dv: DataView;
  constructor(readonly b: Uint8Array) { this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength); }
  get len(): number { return this.b.length; }
  ok(o: number, n: number): boolean { return o >= 0 && o + n <= this.b.length; }
  u8(o: number): number { return this.ok(o, 1) ? this.b[o]! : 0; }
  u16(o: number): number { return this.ok(o, 2) ? this.dv.getUint16(o, true) : 0; }
  i16(o: number): number { return this.ok(o, 2) ? this.dv.getInt16(o, true) : 0; }
  u32(o: number): number { return this.ok(o, 4) ? this.dv.getUint32(o, true) : 0; }
  i32(o: number): number { return this.ok(o, 4) ? this.dv.getInt32(o, true) : 0; }
  f32(o: number): number { if (!this.ok(o, 4)) return 0; const v = this.dv.getFloat32(o, true); return Number.isFinite(v) ? v : 0; }
}

interface PlusPend { id: number; flags: number; total: number; parts: Uint8Array[]; got: number }

/**
 * Registros EMF+ de UM comentário (start..end no EMF): objetos "continuados"
 * (flag 0x8000, divididos em vários registros) são remontados em `st`.
 * Devolve o tipo do último registro.
 */
function plusRecords(b: Uint8Array, start: number, end: number, st: { pend: PlusPend | null }, cb: (type: number, flags: number, d: Rd) => void): number {
  const r = new Rd(b);
  let q = start, last = 0;
  for (let guard = 0; q + 12 <= end && guard < 1_000_000; guard++) {
    const type = r.u16(q), flags = r.u16(q + 2), size = r.u32(q + 4), dsz = r.u32(q + 8);
    if (size < 12 || q + size > end) break;
    const d = b.subarray(q + 12, Math.min(q + size, q + 12 + dsz));
    if (type === 0x4008 && (flags & 0x8000)) {
      const id = flags & 0xff, total = d.length >= 4 ? new Rd(d).u32(0) : 0, part = d.subarray(4);
      if (!st.pend || st.pend.id !== id) st.pend = { id, flags: flags & 0x7fff, total, parts: [], got: 0 };
      st.pend.parts.push(part); st.pend.got += part.length;
      if (st.pend.got >= st.pend.total) {
        const all = new Uint8Array(st.pend.got);
        let o = 0;
        for (const p of st.pend.parts) { all.set(p, o); o += p.length; }
        const f = st.pend.flags;
        st.pend = null;
        cb(0x4008, f, new Rd(all));
      }
    } else cb(type, flags, new Rd(d));
    last = type;
    q += size;
  }
  return last;
}

/** Comentários EMF+ de um EMF: (início, fim) dos dados EMF+ de cada um, e os registros GDI no meio. */
function emfRecords(b: Uint8Array, cb: (type: number, pos: number, size: number, plus?: [number, number]) => void): void {
  const r = new Rd(b);
  let pos = 0;
  for (let guard = 0; pos + 8 <= b.length && guard < 1_000_000; guard++) {
    const type = r.u32(pos), size = r.u32(pos + 4);
    if (size < 8 || pos + size > b.length) break;
    const plus = type === 70 && size >= 16 && r.u32(pos + 12) === EMF_PLUS ? [pos + 16, Math.min(pos + size, pos + 12 + r.u32(pos + 8))] as [number, number] : undefined;
    cb(type, pos, size, plus);
    if (type === 14) break;
    pos += size;
  }
}

// ─────────────────────────── bitmaps comprimidos ───────────────────────────

/** Bitmaps comprimidos (PNG/JPEG/GIF… dentro do EMF+), pré-decodificados de forma assíncrona. */
const decoded = new Map<string, CanvasImageSource | null>();
function bitmapKey(d: Uint8Array): string {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(d.length / 4096));
  for (let i = 0; i < d.length; i += step) { h ^= d[i]!; h = Math.imul(h, 16777619); }
  for (let i = Math.max(0, d.length - 64); i < d.length; i++) { h ^= d[i]!; h = Math.imul(h, 16777619); }
  return `${d.length}:${(h >>> 0).toString(36)}`;
}

/** Pixels crus de um EmfPlusBitmap (tipo 0) → ImageData. Formatos de 1/4/8 bpp com paleta, 16/24/32 bpp. */
function rawBitmap(r: Rd, o: number): ImageData | undefined {
  if (typeof ImageData === 'undefined') return undefined;
  const w = r.i32(o), h = r.i32(o + 4), stride = r.i32(o + 8), fmt = r.u32(o + 12);
  if (w <= 0 || h <= 0 || w * h > 64e6) return undefined;
  const bpp = (fmt >>> 8) & 0xff, indexed = (fmt & 0x10000) !== 0, alpha = (fmt & 0x40000) !== 0, premul = (fmt & 0x80000) !== 0;
  let p = o + 20;
  const pal: number[] = [];
  if (indexed) {
    const n = r.u32(p + 4);
    for (let k = 0; k < Math.min(n, 256); k++) pal.push(r.u32(p + 8 + k * 4));
    p += 8 + n * 4;
  }
  if (!r.ok(p, Math.abs(stride) * h)) return undefined;
  const img = new ImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const row = p + y * stride;
    for (let x = 0; x < w; x++) {
      const t = (y * w + x) * 4;
      let a = 255, rr = 0, gg = 0, bb = 0;
      if (indexed) {
        const bit = x * bpp, v = (r.u8(row + (bit >> 3)) >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
        const c = pal[v] ?? 0;
        a = c >>> 24; rr = (c >> 16) & 255; gg = (c >> 8) & 255; bb = c & 255;
        if (!(fmt & 0x40000) && !(c >>> 24)) a = 255;
      } else if (bpp === 32 || bpp === 24) {
        const s = row + x * (bpp >> 3);
        bb = r.u8(s); gg = r.u8(s + 1); rr = r.u8(s + 2);
        if (bpp === 32 && alpha) a = r.u8(s + 3);
      } else if (bpp === 16) {
        const v = r.u16(row + x * 2);
        if ((fmt & 0xff) === 6) { rr = ((v >> 11) & 31) * 255 / 31; gg = ((v >> 5) & 63) * 255 / 63; bb = (v & 31) * 255 / 31; }
        else { rr = ((v >> 10) & 31) * 255 / 31; gg = ((v >> 5) & 31) * 255 / 31; bb = (v & 31) * 255 / 31; if ((fmt & 0xff) === 7) a = v & 0x8000 ? 255 : 0; }
      } else return undefined;
      if (premul && a > 0 && a < 255) { rr = (rr * 255) / a; gg = (gg * 255) / a; bb = (bb * 255) / a; }
      d[t] = Math.min(255, Math.round(rr)); d[t + 1] = Math.min(255, Math.round(gg)); d[t + 2] = Math.min(255, Math.round(bb)); d[t + 3] = a;
    }
  }
  return img;
}

// ─────────────────────────── objetos ───────────────────────────

interface Stop { pos: number; argb: number }
type PBrush =
  | { t: 'solid'; c: number }
  | { t: 'hatch'; style: number; fore: number; back: number }
  | { t: 'lin'; rect: [number, number, number, number]; stops: Stop[]; xf?: Mat; wrap: number }
  | { t: 'path'; center: Pt; boundary: Pt[]; stops: Stop[]; xf?: Mat; focus: number }
  | { t: 'other'; c: number };
interface PCap { fill: Pt[][]; line: Pt[][]; inset: number; scale: number }
interface PPen {
  width: number; unit: number; cap0: number; cap1: number; join: number; miter: number;
  dash?: number[]; dashOff: number; brush: PBrush; capStart?: PCap; capEnd?: PCap;
}
interface PPath { pts: Pt[]; types: number[]; winding: boolean }
type PRegion = { t: 'inf' } | { t: 'empty' } | { t: 'rect'; r: [number, number, number, number] } | { t: 'path'; p: PPath } | { t: 'op'; op: number; l: PRegion; r: PRegion };
type PImage = { t: 'bmp'; src: CanvasImageSource | ImageData; w: number; h: number } | { t: 'mf'; data: Uint8Array; w: number; h: number };
type PObj = { k: 'brush'; v: PBrush } | { k: 'pen'; v: PPen } | { k: 'path'; v: PPath } | { k: 'region'; v: PRegion } | { k: 'image'; v: PImage | undefined } | { k: 'other' };

/** Interpola ARGB (gama 2,2 quando o pincel pede correção de gama). */
function mixArgb(a: number, b: number, f: number, gamma: boolean): number {
  const ch = (sh: number): number => {
    const x = (a >>> sh) & 255, y = (b >>> sh) & 255;
    if (!gamma || sh === 24) return Math.round(x + (y - x) * f);
    const lx = (x / 255) ** 2.2, ly = (y / 255) ** 2.2;
    return Math.round(255 * (lx + (ly - lx) * f) ** (1 / 2.2));
  };
  return ((ch(24) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
}
const css = (argb: number): string => `rgba(${(argb >>> 16) & 255},${(argb >>> 8) & 255},${argb & 255},${((argb >>> 24) / 255).toFixed(3)})`;

/** Paradas de um degradê: duas cores + fatores de mistura ou cores predefinidas; gama 2,2 amostrada. */
function gradStops(c0: number, c1: number, gamma: boolean, blend?: { pos: number[]; f: number[] }, preset?: { pos: number[]; c: number[] }): Stop[] {
  let base: Stop[];
  if (preset && preset.pos.length >= 2) base = preset.pos.map((pos, i) => ({ pos, argb: preset.c[i] ?? c1 }));
  // fatores de mistura: a cor já sai misturada (em gama 2,2 quando o pincel pede)
  else if (blend && blend.pos.length >= 2) return blend.pos.map((pos, i) => ({ pos, argb: mixArgb(c0, c1, blend.f[i] ?? 0, gamma) })).sort((x, y) => x.pos - y.pos);
  else base = [{ pos: 0, argb: c0 }, { pos: 1, argb: c1 }];
  base.sort((x, y) => x.pos - y.pos);
  if (!gamma) return base;
  const out: Stop[] = [];
  for (let i = 0; i + 1 < base.length; i++) {
    const a = base[i]!, b = base[i + 1]!;
    for (let k = 0; k < 8; k++) out.push({ pos: a.pos + ((b.pos - a.pos) * k) / 8, argb: mixArgb(a.argb, b.argb, k / 8, true) });
  }
  out.push(base[base.length - 1]!);
  return out;
}

/** EmfPlusPath em `o` → caminho + bytes lidos (com preenchimento a 4). */
function readPath(r: Rd, o: number): { p: PPath; size: number } | undefined {
  const n = r.u32(o + 4), flags = r.u32(o + 8);
  if (n > 2_000_000 || !r.ok(o + 12, 0)) return undefined;
  let q = o + 12;
  const pts: Pt[] = [];
  if (flags & 0x800) { // relativo (EmfPlusPointR)
    let x = 0, y = 0;
    const int = (): number => { const b0 = r.u8(q); if (b0 & 0x80) { const v = ((b0 & 0x7f) << 8) | r.u8(q + 1); q += 2; return v & 0x4000 ? v - 0x8000 : v; } q += 1; return b0 & 0x40 ? b0 - 0x80 : b0; };
    for (let k = 0; k < n; k++) { x += int(); y += int(); pts.push([x, y]); }
  } else if (flags & 0x4000) { for (let k = 0; k < n; k++) pts.push([r.i16(q + k * 4), r.i16(q + k * 4 + 2)]); q += n * 4; }
  else { for (let k = 0; k < n; k++) pts.push([r.f32(q + k * 8), r.f32(q + k * 8 + 4)]); q += n * 8; }
  const types: number[] = [];
  if (flags & 0x1000) { // tipos em RLE
    while (types.length < n && r.ok(q, 2)) { const run = r.u8(q) & 0x3f, t = r.u8(q + 1); for (let k = 0; k < run; k++) types.push(t); q += 2; }
  } else { for (let k = 0; k < n; k++) types.push(r.u8(q + k)); q += n; }
  const size = ((q - o) + 3) & ~3;
  // bit 0x2000: preenchimento "winding" (subcaminhos repetidos não se anulam — gd-544523)
  return { p: { pts, types, winding: (flags & 0x2000) !== 0 }, size };
}

function readBrush(r: Rd, o: number): PBrush {
  const t = r.u32(o + 4), d = o + 8;
  if (t === 0) return { t: 'solid', c: r.u32(d) };
  if (t === 1) return { t: 'hatch', style: r.u32(d), fore: r.u32(d + 4), back: r.u32(d + 8) };
  if (t === 4) { // degradê linear
    const fl = r.u32(d), wrap = r.u32(d + 4);
    const rect: [number, number, number, number] = [r.f32(d + 8), r.f32(d + 12), r.f32(d + 16), r.f32(d + 20)];
    const c0 = r.u32(d + 24), c1 = r.u32(d + 28);
    let q = d + 40;
    let xf: Mat | undefined;
    if (fl & 0x02) { xf = [r.f32(q), r.f32(q + 4), r.f32(q + 8), r.f32(q + 12), r.f32(q + 16), r.f32(q + 20)]; q += 24; }
    let blend: { pos: number[]; f: number[] } | undefined, preset: { pos: number[]; c: number[] } | undefined;
    if (fl & 0x04) { const n = r.u32(q); preset = { pos: Array.from({ length: n }, (_, k) => r.f32(q + 4 + k * 4)), c: Array.from({ length: n }, (_, k) => r.u32(q + 4 + n * 4 + k * 4)) }; }
    else if (fl & 0x08) { const n = r.u32(q); blend = { pos: Array.from({ length: n }, (_, k) => r.f32(q + 4 + k * 4)), f: Array.from({ length: n }, (_, k) => r.f32(q + 4 + n * 4 + k * 4)) }; }
    return { t: 'lin', rect, stops: gradStops(c0, c1, (fl & 0x80) !== 0, blend, preset), ...(xf ? { xf } : {}), wrap };
  }
  if (t === 3) { // degradê de caminho
    const fl = r.u32(d), cc = r.u32(d + 8);
    const center: Pt = [r.f32(d + 12), r.f32(d + 16)];
    const ns = r.u32(d + 20);
    const surround = Array.from({ length: Math.min(ns, 4096) }, (_, k) => r.u32(d + 24 + k * 4));
    let q = d + 24 + ns * 4;
    let boundary: Pt[] = [];
    if (fl & 0x01) { const sz = r.u32(q); const p = readPath(r, q + 4); if (p) boundary = flatten(p.p); q += 4 + sz; }
    else { const n = r.u32(q); boundary = Array.from({ length: Math.min(n, 100000) }, (_, k) => [r.f32(q + 4 + k * 8), r.f32(q + 8 + k * 8)] as Pt); q += 4 + n * 8; }
    let xf: Mat | undefined;
    if (fl & 0x02) { xf = [r.f32(q), r.f32(q + 4), r.f32(q + 8), r.f32(q + 12), r.f32(q + 16), r.f32(q + 20)]; q += 24; }
    let blend: { pos: number[]; f: number[] } | undefined, preset: { pos: number[]; c: number[] } | undefined;
    if (fl & 0x04) { const n = r.u32(q); preset = { pos: Array.from({ length: n }, (_, k) => r.f32(q + 4 + k * 4)), c: Array.from({ length: n }, (_, k) => r.u32(q + 4 + n * 4 + k * 4)) }; q += 4 + n * 8; }
    else if (fl & 0x08) { const n = r.u32(q); blend = { pos: Array.from({ length: n }, (_, k) => r.f32(q + 4 + k * 4)), f: Array.from({ length: n }, (_, k) => r.f32(q + 4 + n * 4 + k * 4)) }; q += 4 + n * 8; }
    let focus = 0;
    if (fl & 0x40) { focus = (r.f32(q + 4) + r.f32(q + 8)) / 2; }
    // posições do degradê de caminho: 0 = borda (cor de contorno), 1 = centro
    const sc = surround.length ? surround[0]! : cc;
    return { t: 'path', center, boundary, stops: gradStops(sc, cc, (fl & 0x80) !== 0, blend, preset), ...(xf ? { xf } : {}), focus: Math.max(0, Math.min(0.99, focus)) };
  }
  return { t: 'other', c: 0xff808080 };
}

/** Ponta personalizada (EmfPlusCustomLineCap): seta ajustável ou caminho de preenchimento/linha. */
function readCap(r: Rd, o: number): PCap | undefined {
  const type = r.u32(o + 4), d = o + 8;
  if (type === 1) { // AdjustableArrow
    const w = r.f32(d), h = r.f32(d + 4), mid = r.f32(d + 8), filled = r.u32(d + 12) !== 0, scale = r.f32(d + 32) || 1;
    const tri: Pt[] = mid ? [[-w / 2, -h], [0, 0], [w / 2, -h], [0, -h + mid]] : [[-w / 2, -h], [0, 0], [w / 2, -h]];
    return filled ? { fill: [tri], line: [], inset: h, scale } : { fill: [], line: [[[-w / 2, -h], [0, 0], [w / 2, -h]]], inset: 0, scale };
  }
  const fl = r.u32(d), inset = r.f32(d + 8), scale = r.f32(d + 28) || 1;
  let q = d + 48;
  const fill: Pt[][] = [], line: Pt[][] = [];
  const subs = (p: PPath): Pt[][] => { const out: Pt[][] = []; let cur: Pt[] = []; p.pts.forEach((pt, i) => { if ((p.types[i]! & 7) === 0 && cur.length) { out.push(cur); cur = []; } cur.push(pt); }); if (cur.length) out.push(cur); return out; };
  if (fl & 1) { const sz = r.u32(q); const p = readPath(r, q + 4); if (p) fill.push(...subs(p.p)); q += 4 + sz; }
  if (fl & 2) { const sz = r.u32(q); const p = readPath(r, q + 4); if (p) line.push(...subs(p.p)); q += 4 + sz; }
  return { fill, line, inset, scale };
}

function readPen(r: Rd, o: number): PPen {
  const pf = r.u32(o + 8), unit = r.u32(o + 12), width = r.f32(o + 16);
  let q = o + 20;
  const pen: PPen = { width, unit, cap0: 0, cap1: 0, join: 0, miter: 10, dashOff: 0, brush: { t: 'solid', c: 0xff000000 } };
  let style = 0, pattern: number[] | undefined;
  if (pf & 0x01) q += 24;
  if (pf & 0x02) { pen.cap0 = r.i32(q); q += 4; }
  if (pf & 0x04) { pen.cap1 = r.i32(q); q += 4; }
  if (pf & 0x08) { pen.join = r.i32(q); q += 4; }
  if (pf & 0x10) { pen.miter = r.f32(q); q += 4; }
  if (pf & 0x20) { style = r.i32(q); q += 4; }
  if (pf & 0x40) q += 4;
  if (pf & 0x80) { pen.dashOff = r.f32(q); q += 4; }
  if (pf & 0x100) { const n = r.u32(q); pattern = Array.from({ length: Math.min(n, 64) }, (_, k) => r.f32(q + 4 + k * 4)); q += 4 + n * 4; }
  if (pf & 0x200) q += 4;
  if (pf & 0x400) { const n = r.u32(q); q += 4 + n * 4; }
  if (pf & 0x800) { const n = r.u32(q); const c = readCap(r, q + 4); if (c) pen.capStart = c; q += 4 + n; }
  if (pf & 0x1000) { const n = r.u32(q); const c = readCap(r, q + 4); if (c) pen.capEnd = c; q += 4 + n; }
  // padrão gravado sem LineStyle = tracejado personalizado (gdx-212654)
  const dash = pattern && style !== 1 && style !== 2 && style !== 3 && style !== 4 ? pattern : style === 1 ? [3, 1] : style === 2 ? [1, 1] : style === 3 ? [3, 1, 1, 1] : style === 4 ? [3, 1, 1, 1, 1, 1] : undefined;
  if (dash && dash.length) pen.dash = dash;
  pen.brush = readBrush(r, q);
  return pen;
}

function readRegion(r: Rd, o: number): PRegion {
  let q = o + 8;
  const node = (depth: number): PRegion => {
    const t = r.u32(q); q += 4;
    if (depth > 64) return { t: 'inf' };
    if (t >= 1 && t <= 5) { const l = node(depth + 1), rr = node(depth + 1); return { t: 'op', op: t, l, r: rr }; }
    if (t === 0x10000000) { const rc: [number, number, number, number] = [r.f32(q), r.f32(q + 4), r.f32(q + 8), r.f32(q + 12)]; q += 16; return { t: 'rect', r: rc }; }
    if (t === 0x10000001) { const n = r.u32(q); const p = readPath(r, q + 4); q += 4 + n; return p ? { t: 'path', p: p.p } : { t: 'empty' }; }
    if (t === 0x10000002) return { t: 'empty' };
    return { t: 'inf' };
  };
  return node(0);
}

/** Bézier → polilinha (contorno do degradê de caminho, pontas). */
function flatten(p: PPath): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < p.pts.length; i++) {
    const t = p.types[i]! & 7;
    if (t === 3 && i + 2 < p.pts.length && out.length) {
      const a = out[out.length - 1]!, b = p.pts[i]!, c = p.pts[i + 1]!, d = p.pts[i + 2]!;
      for (let k = 1; k <= 12; k++) {
        const s = k / 12, u = 1 - s;
        out.push([u * u * u * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * c[0] + s * s * s * d[0], u * u * u * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * c[1] + s * s * s * d[1]]);
      }
      i += 2;
    } else out.push(p.pts[i]!);
  }
  return out;
}

const HATCH = ['horz', 'vert', 'dnDiag', 'upDiag', 'cross', 'diagCross', 'pct5', 'pct10', 'pct20', 'pct25', 'pct30', 'pct40', 'pct50', 'pct60', 'pct70', 'pct75', 'pct80', 'pct90',
  'ltDnDiag', 'ltUpDiag', 'dkDnDiag', 'dkUpDiag', 'wdDnDiag', 'wdUpDiag', 'ltVert', 'ltHorz', 'narVert', 'narHorz', 'dkVert', 'dkHorz', 'dashDnDiag', 'dashUpDiag', 'dashHorz', 'dashVert',
  'smConfetti', 'lgConfetti', 'zigZag', 'wave', 'diagBrick', 'horzBrick', 'weave', 'plaid', 'divot', 'dotGrid', 'dotDmnd', 'shingle', 'trellis', 'sphere', 'smGrid', 'smCheck', 'lgCheck', 'openDmnd', 'solidDmnd'];

// ─────────────────────────── censo / pré-decodificação ───────────────────────────

/** Registros EMF+ desenhados; um EMF "dual" com outro (texto EMF+…) toca a reserva GDI. */
const SUPPORTED = new Set([0x4001, 0x4002, 0x4003, 0x4004, 0x4008, 0x4009, 0x400a, 0x400b, 0x400c, 0x400d, 0x400e, 0x400f, 0x4010, 0x4011, 0x4012, 0x4013, 0x4014, 0x4015,
  0x4019, 0x401a, 0x401b, 0x401d, 0x401e, 0x401f, 0x4020, 0x4021, 0x4022, 0x4023, 0x4024, 0x4025, 0x4026, 0x4027, 0x4028, 0x4029, 0x402a, 0x402b, 0x402c, 0x402d,
  0x402e, 0x402f, 0x4030, 0x4031, 0x4032, 0x4033, 0x4034, 0x4035, 0x4039, 0x403a]);

export interface PlusScan {
  kind: 'none' | 'dual' | 'only';
  /** todos os registros/objetos têm desenho aqui (e os bitmaps comprimidos já decodificados) */
  ok: boolean;
  /** dados dos bitmaps comprimidos (inclusive em metarquivos aninhados) */
  compressed: Uint8Array[];
}

export function scanEmfPlus(b: Uint8Array, depth = 0): PlusScan {
  const out: PlusScan = { kind: 'none', ok: true, compressed: [] };
  const st = { pend: null as PlusPend | null };
  let seen = false;
  emfRecords(b, (type, _pos, _size, plus) => {
    if (!plus) return;
    plusRecords(b, plus[0], plus[1], st, (t, flags, d) => {
      if (!seen && t === 0x4001) { out.kind = flags & 1 ? 'dual' : 'only'; seen = true; }
      if (!SUPPORTED.has(t)) out.ok = false;
      if (t !== 0x4008) return;
      const ot = (flags >> 8) & 0x7f;
      if (ot === 1 && d.u32(4) === 2) out.ok = false; // pincel de textura
      if (ot === 5) {
        const it = d.u32(4);
        if (it === 1 && d.u32(24) === 1) out.compressed.push(d.b.subarray(28));
        else if (it === 2) {
          const mt = d.u32(8);
          if (mt >= 3 && depth < 3) { const n = scanEmfPlus(d.b.subarray(16, 16 + d.u32(12)), depth + 1); out.compressed.push(...n.compressed); }
        } else if (it !== 1) out.ok = false;
      }
    });
    void type;
  });
  if (out.compressed.some((c) => !decoded.get(bitmapKey(c)))) out.ok = false;
  return out;
}

/** Há bitmap comprimido ainda não decodificado (o raster tem de esperar `prepareEmfPlus`). */
export function emfPlusNeedsPrepare(b: Uint8Array): boolean {
  return scanEmfPlus(b).compressed.some((c) => !decoded.has(bitmapKey(c)));
}

/** Decodifica (createImageBitmap) os bitmaps comprimidos do EMF+; depois o raster síncrono os usa. */
export async function prepareEmfPlus(b: Uint8Array): Promise<void> {
  const g = globalThis as { createImageBitmap?: (b: Blob) => Promise<ImageBitmap>; Blob?: typeof Blob };
  for (const c of scanEmfPlus(b).compressed) {
    const k = bitmapKey(c);
    if (decoded.has(k)) continue;
    let img: CanvasImageSource | null = null;
    if (typeof g.createImageBitmap === 'function' && typeof g.Blob === 'function') {
      try { img = await g.createImageBitmap(new g.Blob([c.slice()])); } catch { img = null; }
    }
    if (decoded.size > 256) decoded.delete(decoded.keys().next().value as string);
    decoded.set(k, img);
  }
}

// ─────────────────────────── recorte ───────────────────────────

interface ClipOp { cmds: Cmd[]; rule: CanvasFillRule }
type ClipShape = { t: 'inf' } | { t: 'empty' } | { t: 'ops'; ops: ClipOp[] };
const BIG = 1e7;
const bigBox = (): Cmd[] => [{ op: 'M', x: -BIG, y: -BIG }, { op: 'L', x: BIG, y: -BIG }, { op: 'L', x: BIG, y: BIG }, { op: 'L', x: -BIG, y: BIG }, { op: 'Z' }];
const complement = (o: ClipOp): ClipOp => ({ cmds: [...bigBox(), ...o.cmds], rule: 'evenodd' });
function clipAnd(a: ClipShape, b: ClipShape): ClipShape {
  if (a.t === 'empty' || b.t === 'empty') return { t: 'empty' };
  if (a.t === 'inf') return b;
  if (b.t === 'inf') return a;
  return { t: 'ops', ops: [...a.ops, ...b.ops] };
}
function clipOr(a: ClipShape, b: ClipShape): ClipShape {
  if (a.t === 'inf' || b.t === 'inf') return { t: 'inf' };
  if (a.t === 'empty') return b;
  if (b.t === 'empty') return a;
  // união aproximada: um só caminho com os dois (regra nonzero)
  if (a.ops.length === 1 && b.ops.length === 1) return { t: 'ops', ops: [{ cmds: [...a.ops[0]!.cmds, ...b.ops[0]!.cmds], rule: 'nonzero' }] };
  return a.ops.length <= b.ops.length ? b : a;
}
function clipMinus(a: ClipShape, b: ClipShape): ClipShape {
  if (b.t === 'inf' || a.t === 'empty') return { t: 'empty' };
  if (b.t === 'empty') return a;
  if (b.ops.length === 1) return clipAnd(a, { t: 'ops', ops: [complement(b.ops[0]!)] });
  return a;
}
function combine(cur: ClipShape, s: ClipShape, mode: number): ClipShape {
  switch (mode) {
    case 0: return s; // Replace
    case 1: return clipAnd(cur, s); // Intersect
    case 2: case 3: return clipOr(cur, s); // Union / Xor (aproximado)
    case 4: return clipMinus(cur, s); // Exclude
    case 5: return clipMinus(s, cur); // Complement
    default: return cur;
  }
}

// ─────────────────────────── tocador ───────────────────────────

export interface PlusEnv {
  /** dispositivo de referência (px) → saída */
  D: Mat;
  /** px de saída por px do dispositivo */
  devPx: number;
  /** traço mínimo (1 px da página) em px de saída */
  minPx: number;
  /** retângulo da imagem na saída (Clear) */
  box: [number, number, number, number];
  /** desenha um metarquivo aninhado num canvas novo de w×h (px de saída) */
  nested: (data: Uint8Array, w: number, h: number) => CanvasImageSource | undefined;
}

interface PlusState { world: Mat; unit: number; scale: number; clip: ClipShape }

export class EmfPlusRenderer {
  private world: Mat = ID;
  private unit = 2;
  private scale = 1;
  private dpi = 96;
  private clip: ClipShape = { t: 'inf' };
  private readonly objs = new Map<number, PObj>();
  private readonly saved = new Map<number, PlusState>();
  private readonly st = { pend: null as PlusPend | null };
  private readonly canvases = new WeakMap<ImageData, CanvasImageSource>();

  constructor(private readonly ctx: Ctx, private readonly b: Uint8Array, private readonly env: PlusEnv) {}

  /** px do dispositivo por unidade de página */
  private unitPx(u: number): number {
    switch (u) {
      case 3: return this.dpi / 72;
      case 4: return this.dpi;
      case 5: return this.dpi / 300;
      case 6: return this.dpi / 25.4;
      default: return 1;
    }
  }
  /** mundo → saída */
  private T(): Mat {
    const k = this.scale * this.unitPx(this.unit);
    return matMul(matMul(this.world, [k, 0, 0, k, 0, 0]), this.env.D);
  }

  /** Aplica o recorte EMF+ no contexto (para os GDI depois de GetDC também). */
  applyClip(): void {
    const c = this.clip;
    if (c.t === 'inf') return;
    if (c.t === 'empty') { this.ctx.beginPath(); this.ctx.rect(0, 0, 0, 0); this.ctx.clip(); return; }
    for (const o of c.ops) { tracePath(this.ctx, o.cmds); this.ctx.clip(o.rule); }
  }

  private withClip(f: () => void): void {
    this.ctx.save();
    try { this.applyClip(); f(); } finally { this.ctx.restore(); }
  }

  /** Toca os registros de um comentário EMF+; devolve o tipo do último (GetDC libera os GDI seguintes). */
  play(start: number, end: number): number {
    return plusRecords(this.b, start, end, this.st, (t, flags, d) => {
      try { this.record(t, flags, d); } catch { /* registro corrompido: segue */ }
    });
  }

  private record(t: number, fl: number, d: Rd): void {
    const id = fl & 0xff;
    switch (t) {
      case 0x4001: this.dpi = d.u32(8) || 96; break;
      case 0x4008: this.object(fl, d); break;
      case 0x4009: { // Clear
        const [x, y, w, h] = this.env.box;
        this.withClip(() => { this.ctx.fillStyle = css(d.u32(0)); this.ctx.fillRect(x, y, w, h); });
        break;
      }
      case 0x400a: case 0x400b: { // FillRects / DrawRects
        const n = Math.min(t === 0x400a ? d.u32(4) : d.u32(0), 100000), o = t === 0x400a ? 8 : 4;
        const rects = this.rects(d, o, n, (fl & 0x4000) !== 0);
        const M = this.T();
        const cmds = rects.flatMap((r) => this.polyCmds([[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]], M, true));
        if (t === 0x400a) this.fill(cmds, 'nonzero', this.brushOf(fl, d.u32(0)), M);
        else this.stroke(cmds, this.penOf(id), M, []);
        break;
      }
      case 0x400c: { // FillPolygon
        const n = d.u32(4), pts = this.points(d, 8, n, fl);
        const M = this.T();
        this.fill(this.polyCmds(pts, M, true), 'evenodd', this.brushOf(fl, d.u32(0)), M);
        break;
      }
      case 0x400d: { // DrawLines (L 0x2000 = fechado)
        const n = d.u32(0), pts = this.points(d, 4, n, fl), closed = (fl & 0x2000) !== 0;
        const M = this.T();
        this.stroke(this.polyCmds(pts, M, closed), this.penOf(id), M, closed ? [] : [pts.map((p) => apply(M, p[0], p[1]))]);
        break;
      }
      case 0x4019: { // DrawBeziers
        const n = d.u32(0), pts = this.points(d, 4, n, fl);
        const M = this.T();
        const P = pts.map((p) => apply(M, p[0], p[1]));
        if (!P.length) break;
        const cmds: Cmd[] = [{ op: 'M', x: P[0]![0], y: P[0]![1] }];
        for (let k = 1; k + 2 < P.length; k += 3) cmds.push({ op: 'C', x1: P[k]![0], y1: P[k]![1], x2: P[k + 1]![0], y2: P[k + 1]![1], x: P[k + 2]![0], y: P[k + 2]![1] });
        this.stroke(cmds, this.penOf(id), M, [P]);
        break;
      }
      case 0x400e: case 0x400f: { // FillEllipse / DrawEllipse
        const r = this.rects(d, t === 0x400e ? 4 : 0, 1, (fl & 0x4000) !== 0)[0]!;
        const M = this.T();
        const cmds = this.polyCmds(this.arcPts(r, 0, 360), M, true);
        if (t === 0x400e) this.fill(cmds, 'nonzero', this.brushOf(fl, d.u32(0)), M);
        else this.stroke(cmds, this.penOf(id), M, []);
        break;
      }
      case 0x4010: case 0x4011: case 0x4012: { // FillPie / DrawPie / DrawArc
        const o = t === 0x4010 ? 4 : 0;
        const a0 = d.f32(o), sw = d.f32(o + 4), r = this.rects(d, o + 8, 1, (fl & 0x4000) !== 0)[0]!;
        const M = this.T();
        const arc = this.arcPts(r, a0, sw);
        if (t === 0x4012) { const P = arc.map((p) => apply(M, p[0], p[1])); this.stroke(this.polyCmds(arc, M, false), this.penOf(id), M, [P]); break; }
        const pie = this.polyCmds([[r[0] + r[2] / 2, r[1] + r[3] / 2], ...arc], M, true);
        if (t === 0x4010) this.fill(pie, 'nonzero', this.brushOf(fl, d.u32(0)), M);
        else this.stroke(pie, this.penOf(id), M, []);
        break;
      }
      case 0x4013: { // FillRegion
        const o = this.objs.get(id);
        if (o?.k !== 'region') break;
        const s = this.regionClip(o.v, this.T());
        if (s.t === 'empty') break;
        const M = this.T();
        const box = this.env.box;
        this.withClip(() => {
          if (s.t === 'ops') for (const op of s.ops) { tracePath(this.ctx, op.cmds); this.ctx.clip(op.rule); }
          this.fill([{ op: 'M', x: box[0], y: box[1] }, { op: 'L', x: box[0] + box[2], y: box[1] }, { op: 'L', x: box[0] + box[2], y: box[1] + box[3] }, { op: 'L', x: box[0], y: box[1] + box[3] }, { op: 'Z' }], 'nonzero', this.brushOf(fl, d.u32(0)), M, false);
        });
        break;
      }
      case 0x4014: case 0x4015: { // FillPath / DrawPath
        const o = this.objs.get(id);
        if (o?.k !== 'path') break;
        const M = this.T();
        const cmds = this.pathCmds(o.v, M);
        if (t === 0x4014) this.fill(cmds, o.v.winding ? 'nonzero' : 'evenodd', this.brushOf(fl, d.u32(0)), M);
        else this.stroke(cmds, this.penOf(d.u32(0)), M, this.openSubpaths(o.v, M));
        break;
      }
      case 0x401a: case 0x401b: { // DrawImage / DrawImagePoints
        const o = this.objs.get(id);
        if (o?.k !== 'image' || !o.v) break;
        const src: [number, number, number, number] = [d.f32(8), d.f32(12), d.f32(16), d.f32(20)];
        let p0: Pt, p1: Pt, p2: Pt;
        if (t === 0x401a) {
          const r = this.rects(d, 24, 1, (fl & 0x4000) !== 0)[0]!;
          p0 = [r[0], r[1]]; p1 = [r[0] + r[2], r[1]]; p2 = [r[0], r[1] + r[3]];
        } else {
          const pts = this.points(d, 28, 3, fl);
          if (pts.length < 3) break;
          [p0, p1, p2] = pts as [Pt, Pt, Pt];
        }
        this.image(o.v, src, p0, p1, p2);
        break;
      }
      case 0x4025: case 0x4027: case 0x4028: { // Save / BeginContainer / BeginContainerNoParams
        const k = t === 0x4027 ? d.u32(32) : d.u32(0);
        this.saved.set(k, { world: this.world, unit: this.unit, scale: this.scale, clip: this.clip });
        if (t === 0x4027) {
          // contêiner: o retângulo de origem (unidade das flags) vira o de destino
          const dr = [d.f32(0), d.f32(4), d.f32(8), d.f32(12)], sr = [d.f32(16), d.f32(20), d.f32(24), d.f32(28)];
          const u = this.unitPx(fl & 0xff) / (this.scale * this.unitPx(this.unit));
          const kx = (dr[2]! / (sr[2]! || 1)) * u, ky = (dr[3]! / (sr[3]! || 1)) * u;
          this.world = matMul([kx, 0, 0, ky, dr[0]! - sr[0]! * kx, dr[1]! - sr[1]! * ky], this.world);
        }
        break;
      }
      case 0x4026: case 0x4029: { // Restore / EndContainer
        const s = this.saved.get(d.u32(0));
        if (s) { this.world = s.world; this.unit = s.unit; this.scale = s.scale; this.clip = s.clip; }
        break;
      }
      case 0x402a: this.world = this.mat(d, 0); break;
      case 0x402b: this.world = ID; break;
      case 0x402c: case 0x402d: case 0x402e: case 0x402f: {
        let m: Mat;
        if (t === 0x402c) m = this.mat(d, 0);
        else if (t === 0x402d) m = [1, 0, 0, 1, d.f32(0), d.f32(4)];
        else if (t === 0x402e) m = [d.f32(0), 0, 0, d.f32(4), 0, 0];
        else { const a = (d.f32(0) * Math.PI) / 180; m = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]; }
        // A (0x2000) = depois da atual; senão antes
        this.world = fl & 0x2000 ? matMul(this.world, m) : matMul(m, this.world);
        break;
      }
      case 0x4030: this.unit = fl & 0xff; this.scale = d.f32(0) || 1; break;
      case 0x4031: this.clip = { t: 'inf' }; break;
      case 0x4032: { // SetClipRect
        const r = [d.f32(0), d.f32(4), d.f32(8), d.f32(12)];
        const M = this.T();
        const s: ClipShape = { t: 'ops', ops: [{ cmds: this.polyCmds([[r[0]!, r[1]!], [r[0]! + r[2]!, r[1]!], [r[0]! + r[2]!, r[1]! + r[3]!], [r[0]!, r[1]! + r[3]!]], M, true), rule: 'nonzero' }] };
        this.clip = combine(this.clip, s, (fl >> 8) & 0xf);
        break;
      }
      case 0x4033: { // SetClipPath
        const o = this.objs.get(id);
        if (o?.k !== 'path') break;
        const s: ClipShape = { t: 'ops', ops: [{ cmds: this.pathCmds(o.v, this.T()), rule: o.v.winding ? 'nonzero' : 'evenodd' }] };
        this.clip = combine(this.clip, s, (fl >> 8) & 0xf);
        break;
      }
      case 0x4034: { // SetClipRegion
        const o = this.objs.get(id);
        if (o?.k !== 'region') break;
        this.clip = combine(this.clip, this.regionClip(o.v, this.T()), (fl >> 8) & 0xf);
        break;
      }
      case 0x4035: { // OffsetClip
        if (this.clip.t !== 'ops') break;
        const M = this.T(), dx = d.f32(0) * M[0] + d.f32(4) * M[2], dy = d.f32(0) * M[1] + d.f32(4) * M[3];
        const mv = (c: Cmd): Cmd => c.op === 'Z' ? c : c.op === 'C' ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy };
        this.clip = { t: 'ops', ops: this.clip.ops.map((o) => ({ cmds: o.cmds.map(mv), rule: o.rule })) };
        break;
      }
      default: break; // estado de qualidade/antisserrilhado/compositing: o canvas sempre suaviza
    }
  }

  private mat(d: Rd, o: number): Mat { return [d.f32(o), d.f32(o + 4), d.f32(o + 8), d.f32(o + 12), d.f32(o + 16), d.f32(o + 20)]; }

  private object(fl: number, d: Rd): void {
    const id = fl & 0xff, ot = (fl >> 8) & 0x7f;
    let o: PObj = { k: 'other' };
    if (ot === 1) o = { k: 'brush', v: readBrush(d, 0) };
    else if (ot === 2) o = { k: 'pen', v: readPen(d, 0) };
    else if (ot === 3) { const p = readPath(d, 0); if (p) o = { k: 'path', v: p.p }; }
    else if (ot === 4) o = { k: 'region', v: readRegion(d, 0) };
    else if (ot === 5) o = { k: 'image', v: this.readImage(d) };
    this.objs.set(id, o);
  }

  private readImage(d: Rd): PImage | undefined {
    const it = d.u32(4);
    if (it === 1) {
      const w = d.i32(8), h = d.i32(12);
      if (d.u32(24) === 1) {
        const src = decoded.get(bitmapKey(d.b.subarray(28)));
        if (!src) return undefined;
        const s = src as { width?: number; height?: number };
        return { t: 'bmp', src, w: w > 0 ? w : s.width ?? 1, h: h > 0 ? h : s.height ?? 1 };
      }
      const img = rawBitmap(d, 8);
      return img ? { t: 'bmp', src: img, w: img.width, h: img.height } : undefined;
    }
    if (it === 2) {
      const mt = d.u32(8), size = d.u32(12);
      let data = d.b.subarray(16, 16 + size);
      if (mt === 2) {
        // WMF "placeable": o GDI+ grava o cabeçalho com 24 bytes (struct alinhada) e o
        // MetafileDataSize conta só o WMF — refaz o cabeçalho de 22
        const raw = d.b.subarray(16);
        const at = (o: number): boolean => raw.length > o + 4 && (raw[o] === 1 || raw[o] === 2) && raw[o + 1] === 0 && raw[o + 2] === 9 && raw[o + 3] === 0;
        // medido: com cabeçalho de 22 bytes ou tamanho que inclui o cabeçalho, o app não desenha nada
        if (!at(24) || raw.length < size + 24 || size < 18) return undefined;
        const ph = 24, wmfLen = size;
        data = new Uint8Array(22 + wmfLen);
        data.set(raw.subarray(0, 22)); data.set(raw.subarray(ph, ph + wmfLen), 22);
        const r = new Rd(data);
        const w = Math.abs(r.i16(10) - r.i16(6)), h = Math.abs(r.i16(12) - r.i16(8));
        return { t: 'mf', data, w: w || 1, h: h || 1 };
      }
      if (mt === 1) return undefined; // WMF sem cabeçalho: tamanho desconhecido
      const r = new Rd(data);
      // EMF: tamanho natural em px do dispositivo de referência do próprio EMF
      const fw = r.i32(32) - r.i32(24), fh = r.i32(36) - r.i32(28);
      const pxX = r.i32(72) / Math.max(1, r.i32(80) * 100), pxY = r.i32(76) / Math.max(1, r.i32(84) * 100);
      const w = fw > 0 ? fw * pxX : r.i32(16) - r.i32(8), h = fh > 0 ? fh * pxY : r.i32(20) - r.i32(12);
      return { t: 'mf', data, w: w || 1, h: h || 1 };
    }
    return undefined;
  }

  private brushOf(fl: number, v: number): PBrush {
    if (fl & 0x8000) return { t: 'solid', c: v };
    const o = this.objs.get(v & 0xff);
    return o?.k === 'brush' ? o.v : { t: 'solid', c: 0xff000000 };
  }
  private penOf(id: number): PPen | undefined {
    const o = this.objs.get(id & 0xff);
    return o?.k === 'pen' ? o.v : undefined;
  }

  /** Pontos de um registro: int16 (C), relativos (P, EmfPlusPointR) ou float. */
  private points(d: Rd, o: number, n: number, fl: number): Pt[] {
    const out: Pt[] = [];
    n = Math.min(n, 1_000_000);
    if (fl & 0x0800) {
      let q = o, x = 0, y = 0;
      const int = (): number => { const b0 = d.u8(q); if (b0 & 0x80) { const v = ((b0 & 0x7f) << 8) | d.u8(q + 1); q += 2; return v & 0x4000 ? v - 0x8000 : v; } q += 1; return b0 & 0x40 ? b0 - 0x80 : b0; };
      for (let k = 0; k < n && d.ok(q, 1); k++) { x += int(); y += int(); out.push([x, y]); }
    } else if (fl & 0x4000) { for (let k = 0; k < n && d.ok(o + k * 4, 4); k++) out.push([d.i16(o + k * 4), d.i16(o + k * 4 + 2)]); }
    else for (let k = 0; k < n && d.ok(o + k * 8, 8); k++) out.push([d.f32(o + k * 8), d.f32(o + k * 8 + 4)]);
    return out;
  }
  private rects(d: Rd, o: number, n: number, c: boolean): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    for (let k = 0; k < n; k++) {
      if (c) { if (!d.ok(o + k * 8, 8)) break; out.push([d.i16(o + k * 8), d.i16(o + k * 8 + 2), d.i16(o + k * 8 + 4), d.i16(o + k * 8 + 6)]); }
      else { if (!d.ok(o + k * 16, 16)) break; out.push([d.f32(o + k * 16), d.f32(o + k * 16 + 4), d.f32(o + k * 16 + 8), d.f32(o + k * 16 + 12)]); }
    }
    if (!out.length) out.push([0, 0, 0, 0]);
    return out;
  }

  /** Pontos de arco de elipse (ângulos do GDI+: graus, sentido horário, ângulo REAL do ponto). */
  private arcPts(r: [number, number, number, number], a0: number, sweep: number): Pt[] {
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, rx = r[2] / 2, ry = r[3] / 2;
    const par = (deg: number): number => { const a = (deg * Math.PI) / 180; return Math.atan2(Math.sin(a) / (ry || 1), Math.cos(a) / (rx || 1)); };
    let t0 = par(a0), t1 = par(a0 + sweep);
    if (Math.abs(sweep) >= 360) t1 = t0 + Math.sign(sweep || 1) * 2 * Math.PI;
    else if (sweep > 0) { while (t1 <= t0) t1 += 2 * Math.PI; } else { while (t1 >= t0) t1 -= 2 * Math.PI; }
    const n = Math.max(8, Math.ceil(Math.abs(t1 - t0) / (Math.PI / 48)));
    return Array.from({ length: n + 1 }, (_, k) => { const t = t0 + ((t1 - t0) * k) / n; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Pt; });
  }

  private polyCmds(pts: Pt[], M: Mat, closed: boolean): Cmd[] {
    const c: Cmd[] = pts.map((p, k) => { const [x, y] = apply(M, p[0], p[1]); return { op: k ? 'L' : 'M', x, y }; });
    if (closed && c.length) c.push({ op: 'Z' });
    return c;
  }

  private pathCmds(p: PPath, M: Mat): Cmd[] {
    const out: Cmd[] = [];
    for (let i = 0; i < p.pts.length; i++) {
      const t = p.types[i]! & 7;
      let last = i;
      if (t === 3 && i + 2 < p.pts.length) {
        const a = apply(M, ...p.pts[i]!), b = apply(M, ...p.pts[i + 1]!), c = apply(M, ...p.pts[i + 2]!);
        out.push({ op: 'C', x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: c[0], y: c[1] });
        last = i + 2;
        i += 2;
      } else { const [x, y] = apply(M, ...p.pts[i]!); out.push({ op: t === 0 || !out.length ? 'M' : 'L', x, y }); }
      if (p.types[last]! & 0x80) out.push({ op: 'Z' });
    }
    return out;
  }

  /** Subcaminhos abertos (em px de saída) — onde vão as pontas. */
  private openSubpaths(p: PPath, M: Mat): Pt[][] {
    const out: Pt[][] = [];
    let cur: Pt[] = [], closed = false;
    const flush = (): void => { if (cur.length >= 2 && !closed) out.push(cur); cur = []; closed = false; };
    p.pts.forEach((pt, i) => {
      const t = p.types[i]!;
      if ((t & 7) === 0) flush();
      cur.push(apply(M, pt[0], pt[1]));
      if (t & 0x80) closed = true;
    });
    flush();
    return out;
  }

  private regionClip(g: PRegion, M: Mat): ClipShape {
    switch (g.t) {
      case 'inf': return { t: 'inf' };
      case 'empty': return { t: 'empty' };
      case 'rect': { const r = g.r; return { t: 'ops', ops: [{ cmds: this.polyCmds([[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]], M, true), rule: 'nonzero' }] }; }
      case 'path': return { t: 'ops', ops: [{ cmds: this.pathCmds(g.p, M), rule: g.p.winding ? 'nonzero' : 'evenodd' }] };
      default: {
        const l = this.regionClip(g.l, M), r = this.regionClip(g.r, M);
        return g.op === 1 ? clipAnd(l, r) : g.op === 4 ? clipMinus(l, r) : g.op === 5 ? clipMinus(r, l) : clipOr(l, r);
      }
    }
  }

  // ─────────── pintura ───────────

  /** Preenche `cmds` (px de saída) com o pincel; M = mundo → saída (espaço do pincel). */
  private fill(cmds: Cmd[], rule: CanvasFillRule, br: PBrush, M: Mat, clip = true): void {
    if (!cmds.length) return;
    const ctx = this.ctx;
    const run = (): void => {
      if (br.t === 'path') { this.pathGradient(cmds, rule, br, M); return; }
      tracePath(ctx, cmds);
      if (br.t === 'lin') {
        const BM = br.xf ? matMul(br.xf, M) : M;
        const g = this.linear(br, BM, cmds);
        if (g) { ctx.save(); ctx.transform(BM[0], BM[1], BM[2], BM[3], BM[4], BM[5]); ctx.fillStyle = g; ctx.fill(rule); ctx.restore(); return; }
        ctx.fillStyle = css(br.stops[0]?.argb ?? 0xff000000);
      } else if (br.t === 'hatch') ctx.fillStyle = this.hatch(br) ?? css(br.fore);
      else ctx.fillStyle = css(br.c);
      ctx.fill(rule);
    };
    if (clip) this.withClip(run); else run();
  }

  /** Degradê linear no espaço do pincel (o eixo x do retângulo), repetido pelo modo de ladrilho. */
  private linear(br: Extract<PBrush, { t: 'lin' }>, BM: Mat, cmds: Cmd[]): CanvasGradient | undefined {
    const inv = matInv(BM);
    const [x, , w] = br.rect;
    if (!inv || !(Math.abs(w) > 1e-9)) return undefined;
    // extensão do caminho projetada no eixo do degradê (espaço do pincel)
    let lo = Infinity, hi = -Infinity;
    for (const c of cmds) {
      if (c.op === 'Z') continue;
      for (const [px, py] of c.op === 'C' ? [[c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]] : [[c.x, c.y]]) {
        const u = (apply(inv, px!, py!)[0] - x) / w;
        lo = Math.min(lo, u); hi = Math.max(hi, u);
      }
    }
    if (!Number.isFinite(lo)) return undefined;
    const clampMode = br.wrap === 4;
    const k0 = clampMode ? 0 : Math.max(-32, Math.floor(lo)), k1 = clampMode ? 1 : Math.min(32, Math.ceil(hi));
    const g = this.ctx.createLinearGradient(x + k0 * w, 0, x + k1 * w, 0);
    const span = k1 - k0 || 1;
    const flipX = br.wrap === 1 || br.wrap === 3;
    for (let k = k0; k < k1; k++) {
      const flip = flipX && ((k % 2) + 2) % 2 === 1;
      for (const s of br.stops) {
        const pos = flip ? 1 - s.pos : s.pos;
        g.addColorStop(Math.max(0, Math.min(1, (k - k0 + pos) / span)), css(s.argb));
      }
    }
    return g;
  }

  /** Degradê de caminho: contornos do limite encolhidos rumo ao centro (cor da borda → do centro). */
  private pathGradient(cmds: Cmd[], rule: CanvasFillRule, br: Extract<PBrush, { t: 'path' }>, M: Mat): void {
    const ctx = this.ctx;
    const BM = br.xf ? matMul(br.xf, M) : M;
    const bnd = br.boundary.map((p) => apply(BM, p[0], p[1]));
    const c = apply(BM, br.center[0], br.center[1]);
    tracePath(ctx, cmds);
    ctx.save();
    ctx.clip(rule);
    if (bnd.length < 3) { ctx.fillStyle = css(br.stops[br.stops.length - 1]?.argb ?? 0); ctx.fill(); ctx.restore(); return; }
    const colorAt = (u: number): string => { // u: 0 borda → 1 centro
      const s = br.stops;
      if (u <= s[0]!.pos) return css(s[0]!.argb);
      for (let i = 0; i + 1 < s.length; i++) if (u <= s[i + 1]!.pos) return css(mixArgb(s[i]!.argb, s[i + 1]!.argb, (u - s[i]!.pos) / ((s[i + 1]!.pos - s[i]!.pos) || 1), false));
      return css(s[s.length - 1]!.argb);
    };
    const N = 96, f = br.focus;
    for (let i = 0; i < N; i++) {
      const sc = 1 - i / N; // fração do raio
      const u = Math.min(1, (1 - (sc - 0.5 / N)) / (1 - f));
      ctx.beginPath();
      bnd.forEach(([px, py], k) => { const x = c[0] + (px - c[0]) * sc, y = c[1] + (py - c[1]) * sc; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fillStyle = colorAt(u);
      ctx.fill();
    }
    ctx.restore();
  }

  private hatch(br: Extract<PBrush, { t: 'hatch' }>): CanvasPattern | undefined {
    const hex = PRESET_PATTERNS[HATCH[br.style] ?? ''];
    if (!hex || typeof OffscreenCanvas === 'undefined') return undefined;
    const cv = new OffscreenCanvas(8, 8), c2 = cv.getContext('2d');
    if (!c2) return undefined;
    const img = c2.createImageData(8, 8);
    for (let y = 0; y < 8; y++) {
      const row = parseInt(hex.slice(y * 2, y * 2 + 2), 16);
      for (let x = 0; x < 8; x++) {
        const c = (row >> (7 - x)) & 1 ? br.fore : br.back, i = (y * 8 + x) * 4;
        img.data[i] = (c >>> 16) & 255; img.data[i + 1] = (c >>> 8) & 255; img.data[i + 2] = c & 255; img.data[i + 3] = c >>> 24;
      }
    }
    c2.putImageData(img, 0, 0);
    const pat = this.ctx.createPattern(cv, 'repeat');
    if (pat && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([this.env.devPx, 0, 0, this.env.devPx, 0, 0]));
    return pat ?? undefined;
  }

  /** Contorna com a caneta; `opens` = subcaminhos abertos (px de saída) para as pontas. */
  private stroke(cmds: Cmd[], pen: PPen | undefined, M: Mat, opens: Pt[][]): void {
    if (!pen || !cmds.length) return;
    const ctx = this.ctx;
    const scale = pen.unit === 0 ? matScale(M) : this.unitPx(pen.unit) * this.env.devPx;
    const lw = Math.max(this.env.minPx, pen.width * scale);
    const color = pen.brush.t === 'solid' || pen.brush.t === 'other' ? pen.brush.c : pen.brush.t === 'hatch' ? pen.brush.fore : pen.brush.stops[0]?.argb ?? 0xff000000;
    this.withClip(() => {
      tracePath(ctx, cmds);
      ctx.lineWidth = lw;
      ctx.strokeStyle = css(color);
      ctx.lineJoin = pen.join === 1 ? 'bevel' : pen.join === 2 ? 'round' : 'miter';
      ctx.miterLimit = Math.max(1, pen.miter || 10);
      const capOf = (c: number): CanvasLineCap => (c === 1 ? 'square' : c === 2 ? 'round' : 'butt');
      ctx.lineCap = capOf(pen.cap1 === 0xff ? pen.cap0 : pen.cap1);
      if (pen.dash) { ctx.setLineDash(pen.dash.map((v) => Math.max(0.01, v) * lw)); ctx.lineDashOffset = pen.dashOff * lw; }
      // pontas personalizadas recuam a linha (BaseInset) — encurta o caminho aberto
      if ((pen.capStart || pen.capEnd) && opens.length) {
        ctx.beginPath();
        for (const sp of opens) {
          const pts = sp.slice();
          const pull = (i: number, j: number, cap?: PCap): void => {
            if (!cap?.inset) return;
            const a = pts[i]!, b = pts[j]!, dl = Math.hypot(a[0] - b[0], a[1] - b[1]), s = cap.inset * cap.scale * lw;
            if (dl > s) pts[i] = [a[0] + ((b[0] - a[0]) * s) / dl, a[1] + ((b[1] - a[1]) * s) / dl];
          };
          pull(0, 1, pen.capStart); pull(pts.length - 1, pts.length - 2, pen.capEnd);
          pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const sp of opens) {
        if (sp.length < 2) continue;
        this.cap(sp[0]!, this.dirFrom(sp, true), pen.cap0, pen.capStart, lw, color);
        this.cap(sp[sp.length - 1]!, this.dirFrom(sp, false), pen.cap1, pen.capEnd, lw, color);
      }
    });
  }

  /** Direção (unitária) para FORA na ponta do subcaminho. */
  private dirFrom(sp: Pt[], start: boolean): Pt {
    const e = start ? sp[0]! : sp[sp.length - 1]!;
    for (let k = 1; k < sp.length; k++) {
      const o = start ? sp[k]! : sp[sp.length - 1 - k]!;
      const dx = e[0] - o[0], dy = e[1] - o[1], l = Math.hypot(dx, dy);
      if (l > 1e-6) return [dx / l, dy / l];
    }
    return [1, 0];
  }

  /** Ponta: personalizada (seta do Office) ou âncora (círculo, quadrado, losango, seta). */
  private cap(p: Pt, d: Pt, kind: number, custom: PCap | undefined, lw: number, color: number): void {
    const ctx = this.ctx;
    const n: Pt = [-d[1], d[0]];
    const to = (x: number, y: number, s: number): Pt => [p[0] + (x * n[0] + y * d[0]) * s, p[1] + (x * n[1] + y * d[1]) * s];
    if (kind === 0xff && custom) {
      const s = custom.scale * lw;
      for (const poly of custom.fill) { ctx.beginPath(); poly.forEach(([x, y], k) => { const q = to(x, y, s); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fillStyle = css(color); ctx.fill(); }
      for (const poly of custom.line) { ctx.beginPath(); poly.forEach(([x, y], k) => { const q = to(x, y, s); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.lineWidth = lw; ctx.strokeStyle = css(color); ctx.stroke(); }
      return;
    }
    const a = kind & 0xff;
    if (a < 0x11 || a > 0x14) return;
    ctx.beginPath();
    const r = lw * 1.5;
    if (a === 0x12) ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    else {
      const poly: Pt[] = a === 0x11 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : a === 0x13 ? [[0, -1], [1, 0], [0, 1], [-1, 0]] : [[-1, -2], [0, 0], [1, -2]];
      poly.forEach(([x, y], k) => { const q = to(x, y, r); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    }
    ctx.fillStyle = css(color);
    ctx.fill();
  }

  /** Imagem no paralelogramo p0 (sup. esq.), p1 (sup. dir.), p2 (inf. esq.), com o recorte da origem. */
  private image(img: PImage, src: [number, number, number, number], p0: Pt, p1: Pt, p2: Pt): void {
    const M = this.T();
    const a = apply(M, ...p0), b = apply(M, ...p1), c = apply(M, ...p2);
    let [sx, sy, sw, sh] = src;
    if (!(sw > 0) || !(sh > 0)) { sx = 0; sy = 0; sw = img.w; sh = img.h; }
    let source: CanvasImageSource | undefined;
    let kx = 1, ky = 1; // px da fonte por unidade da imagem
    if (img.t === 'mf') {
      // aninhado: rasteriza na resolução de saída da imagem inteira
      const W = Math.min(4096, Math.max(1, Math.round((Math.hypot(b[0] - a[0], b[1] - a[1]) * img.w) / sw)));
      const H = Math.min(4096, Math.max(1, Math.round((Math.hypot(c[0] - a[0], c[1] - a[1]) * img.h) / sh)));
      source = this.env.nested(img.data, W, H);
      kx = W / img.w; ky = H / img.h;
    } else if (typeof ImageData !== 'undefined' && img.src instanceof ImageData) {
      let cv = this.canvases.get(img.src);
      if (!cv && typeof OffscreenCanvas !== 'undefined') {
        const oc = new OffscreenCanvas(img.src.width, img.src.height);
        oc.getContext('2d')?.putImageData(img.src, 0, 0);
        cv = oc;
        this.canvases.set(img.src, oc);
      }
      source = cv;
    } else source = img.src as CanvasImageSource;
    if (!source) return;
    const ctx = this.ctx;
    this.withClip(() => {
      ctx.transform((b[0] - a[0]) / sw, (b[1] - a[1]) / sw, (c[0] - a[0]) / sh, (c[1] - a[1]) / sh, a[0], a[1]);
      ctx.imageSmoothingEnabled = true;
      // redução grande (PNG do gráfico a 600 dpi): filtro de alta qualidade, como o app
      (ctx as { imageSmoothingQuality?: string }).imageSmoothingQuality = 'high';
      // a origem fora da imagem (a −0,5 px de borda do GDI+) é recortada
      const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(img.w, sx + sw), y1 = Math.min(img.h, sy + sh);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.drawImage(source!, x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
    });
  }
}
