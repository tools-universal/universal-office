import type { InlineImage } from '@universal-office/docx-core';
import type { PageItem, PathCmdTw } from './tree.js';
import type { DocContext } from './context.js';

/**
 * Reprodução de metarquivos EMF ([MS-EMF]) como itens de desenho: caminhos
 * (retângulo, elipse, polígonos, Béziers, paths), texto (EMR_EXTTEXTOUTW com
 * o vetor de avanços do próprio arquivo) e bitmaps DIB. Cobre o que os
 * documentos do Word usam (ícones de objetos OLE com rótulo, diagramas
 * colados do Visio/Excel). Registros EMF+ (comentários) são ignorados — o EMF
 * "dual" traz os registros EMF equivalentes.
 */

interface Xform { a: number; b: number; c: number; d: number; e: number; f: number }
const IDENT: Xform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const mul = (m: Xform, n: Xform): Xform => ({
  a: m.a * n.a + m.b * n.c, b: m.a * n.b + m.b * n.d,
  c: m.c * n.a + m.d * n.c, d: m.c * n.b + m.d * n.d,
  e: m.e * n.a + m.f * n.c + n.e, f: m.e * n.b + m.f * n.d + n.f,
});

interface Pen { style: number; width: number; color: string }
interface Brush { style: number; color: string }
interface Font { height: number; weight: number; italic: boolean; underline: boolean; strike: boolean; face: string; escapement: number }
type Obj = { kind: 'pen'; pen: Pen } | { kind: 'brush'; brush: Brush } | { kind: 'font'; font: Font };

interface DcState {
  mapMode: number;
  winOrg: [number, number]; winExt: [number, number];
  vpOrg: [number, number]; vpExt: [number, number];
  world: Xform;
  pen: Pen; brush: Brush; font: Font;
  textColor: string; bkColor: string; bkMode: number; textAlign: number;
  polyFill: number;
  cur: [number, number];
}

const colorOf = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();

const STOCK: Record<number, Obj> = {
  0: { kind: 'brush', brush: { style: 0, color: 'FFFFFF' } },
  1: { kind: 'brush', brush: { style: 0, color: 'C0C0C0' } },
  2: { kind: 'brush', brush: { style: 0, color: '808080' } },
  3: { kind: 'brush', brush: { style: 0, color: '404040' } },
  4: { kind: 'brush', brush: { style: 0, color: '000000' } },
  5: { kind: 'brush', brush: { style: 1, color: '000000' } },
  6: { kind: 'pen', pen: { style: 0, width: 0, color: 'FFFFFF' } },
  7: { kind: 'pen', pen: { style: 0, width: 0, color: '000000' } },
  8: { kind: 'pen', pen: { style: 5, width: 0, color: '000000' } },
  13: { kind: 'font', font: { height: -12, weight: 400, italic: false, underline: false, strike: false, face: 'Arial', escapement: 0 } },
  17: { kind: 'font', font: { height: -11, weight: 400, italic: false, underline: false, strike: false, face: 'Segoe UI', escapement: 0 } },
};

export function isEmf(b: Uint8Array): boolean {
  return b.length > 44 && b[0] === 1 && b[1] === 0 && b[2] === 0 && b[3] === 0 && b[40] === 0x20 && b[41] === 0x45 && b[42] === 0x4d && b[43] === 0x46;
}

/** Desenha o EMF no retângulo (twips) dado. */
export function renderEmf(ctx: DocContext, bytes: Uint8Array, dest: { x: number; y: number; w: number; h: number }): PageItem[] {
  const out: PageItem[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i32 = (o: number) => dv.getInt32(o, true);
  const u32 = (o: number) => dv.getUint32(o, true);
  const i16 = (o: number) => dv.getInt16(o, true);
  const u16 = (o: number) => dv.getUint16(o, true);
  if (!isEmf(bytes)) return out;
  // quadro (0,01 mm) → pixels do dispositivo de referência
  const frame = [i32(24), i32(28), i32(32), i32(36)] as const;
  const devPx = [i32(72), i32(76)] as const;
  const devMm = [i32(80), i32(84)] as const;
  const pxPerHmmX = devPx[0] / Math.max(1, devMm[0] * 100);
  const pxPerHmmY = devPx[1] / Math.max(1, devMm[1] * 100);
  const fx0 = frame[0] * pxPerHmmX, fy0 = frame[1] * pxPerHmmY;
  const fw = Math.max(1e-6, (frame[2] - frame[0]) * pxPerHmmX), fh = Math.max(1e-6, (frame[3] - frame[1]) * pxPerHmmY);
  const sx = dest.w / fw, sy = dest.h / fh;
  const twipsPerDevPx = (devMm[0] * 100) / Math.max(1, devPx[0]) * (1440 / 2540); // p/ espessuras

  let dc: DcState = {
    mapMode: 1, winOrg: [0, 0], winExt: [1, 1], vpOrg: [0, 0], vpExt: [1, 1], world: IDENT,
    pen: (STOCK[7] as { pen: Pen }).pen, brush: (STOCK[0] as { brush: Brush }).brush, font: (STOCK[13] as { font: Font }).font,
    textColor: '000000', bkColor: 'FFFFFF', bkMode: 2, textAlign: 0, polyFill: 1, cur: [0, 0],
  };
  const stack: DcState[] = [];
  const objs = new Map<number, Obj>();

  /** escala lógico → dispositivo (sem translação) */
  const mapScale = (): [number, number] => {
    switch (dc.mapMode) {
      case 2: return [0.1 * pxPerHmmX * 10, -0.1 * pxPerHmmY * 10]; // LOMETRIC: 0,1 mm
      case 3: return [0.01 * pxPerHmmX * 100 / 1, -0.01 * pxPerHmmY * 100]; // HIMETRIC
      case 4: return [0.254 * pxPerHmmX * 100, -0.254 * pxPerHmmY * 100]; // LOENGLISH 0,01"
      case 5: return [0.0254 * pxPerHmmX * 100, -0.0254 * pxPerHmmY * 100]; // HIENGLISH
      case 6: return [(25.4 / 1440) * pxPerHmmX * 100, -(25.4 / 1440) * pxPerHmmY * 100]; // TWIPS
      case 7: case 8: return [dc.vpExt[0] / (dc.winExt[0] || 1), dc.vpExt[1] / (dc.winExt[1] || 1)];
      default: return [1, 1];
    }
  };
  const toDev = (x: number, y: number): [number, number] => {
    const w = dc.world;
    const wx = x * w.a + y * w.c + w.e, wy = x * w.b + y * w.d + w.f;
    const [kx, ky] = mapScale();
    let s = [kx, ky];
    if (dc.mapMode === 7) { const k = Math.min(Math.abs(kx), Math.abs(ky)); s = [Math.sign(kx) * k, Math.sign(ky) * k]; }
    return [(wx - dc.winOrg[0]) * s[0]! + dc.vpOrg[0], (wy - dc.winOrg[1]) * s[1]! + dc.vpOrg[1]];
  };
  const toPage = (x: number, y: number): [number, number] => {
    const [dx, dy] = toDev(x, y);
    return [dest.x + (dx - fx0) * sx, dest.y + (dy - fy0) * sy];
  };
  const lenTw = (logical: number): number => {
    const [kx] = mapScale();
    const w = dc.world;
    return Math.abs(logical * Math.hypot(w.a, w.b) * kx) * sx;
  };

  let path: PathCmdTw[] | null = null;
  const emitPath = (cmds: PathCmdTw[], fill: boolean, stroke: boolean) => {
    if (!cmds.length) return;
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : undefined;
    const pen = dc.pen;
    const st = stroke && pen.style !== 5 ? { color: pen.color, widthPt: Math.max(0.25, lenTw(pen.width || 1) / 20), ...(pen.style >= 1 && pen.style <= 4 ? { dash: 'dashed' } : {}) } : undefined;
    if (!f && !st) return;
    out.push({ t: 'path', cmds, ...(f ? { fill: f } : {}), ...(st ? { stroke: st } : {}), ...(dc.polyFill === 1 ? { evenOdd: true } : {}) });
  };
  const draw = (cmds: PathCmdTw[], closed: boolean) => {
    if (path) { path.push(...cmds); return; }
    emitPath(cmds, closed, true);
  };
  const pts16 = (o: number, n: number): [number, number][] => Array.from({ length: n }, (_, k) => [i16(o + k * 4), i16(o + k * 4 + 2)]);
  const pts32 = (o: number, n: number): [number, number][] => Array.from({ length: n }, (_, k) => [i32(o + k * 8), i32(o + k * 8 + 4)]);
  const poly = (pts: [number, number][], closed: boolean, cont = false): PathCmdTw[] => {
    const c: PathCmdTw[] = [];
    pts.forEach(([x, y], k) => { const [px, py] = toPage(x, y); c.push({ op: k === 0 && !cont ? 'M' : 'L', x: px, y: py }); });
    if (closed) c.push({ op: 'Z' });
    return c;
  };
  const bezier = (pts: [number, number][], startWithMove: boolean): PathCmdTw[] => {
    const c: PathCmdTw[] = [];
    let k = 0;
    if (startWithMove) { const [x, y] = toPage(pts[0]![0], pts[0]![1]); c.push({ op: 'M', x, y }); k = 1; }
    for (; k + 2 < pts.length + (startWithMove ? 0 : 0); k += 3) {
      const a = toPage(...pts[k]!), b = toPage(...pts[k + 1]!), d = toPage(...pts[k + 2]!);
      c.push({ op: 'C', x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
    }
    return c;
  };
  const rect = (l: number, t: number, r: number, b: number): PathCmdTw[] => poly([[l, t], [r, t], [r, b], [l, b]], true);
  const ellipse = (l: number, t: number, r: number, b: number): PathCmdTw[] => {
    const K = 0.5523;
    const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
    const P = (x: number, y: number) => toPage(x, y);
    const p0 = P(cx + rx, cy);
    const seg = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): PathCmdTw => {
      const a = P(x1, y1), b2 = P(x2, y2), d = P(x, y);
      return { op: 'C', x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], x: d[0], y: d[1] };
    };
    return [
      { op: 'M', x: p0[0], y: p0[1] },
      seg(cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry),
      seg(cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy),
      seg(cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry),
      seg(cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy),
      { op: 'Z' },
    ];
  };

  const dib = (off: number, cbBmi: number, offBits: number, cbBits: number, premul = false): InlineImage | null => {
    if (!cbBmi || !cbBits || off + cbBmi > bytes.length || offBits + cbBits > bytes.length) return null;
    // BMP = cabeçalho de arquivo (14) + BITMAPINFO (hdr bytes) + bits
    const build = (hdr: number): [Uint8Array, DataView] => {
      const b = new Uint8Array(14 + hdr + cbBits);
      b[0] = 0x42; b[1] = 0x4d;
      const v = new DataView(b.buffer);
      v.setUint32(2, b.length, true);
      v.setUint32(10, 14 + hdr, true);
      b.set(bytes.subarray(off, off + cbBmi), 14);
      b.set(bytes.subarray(offBits, offBits + cbBits), 14 + hdr);
      return [b, v];
    };
    let [bmp, bv] = build(cbBmi);
    // AlphaBlend com AC_SRC_ALPHA: 32 bpp pré-multiplicado → canal alfa direto: cabeçalho
    // V3 (56 bytes) com BITFIELDS e máscaras BGRA explícitas, que o decodeBmp segue
    if (premul && bv.getUint16(14 + 14, true) === 32) {
      const hdr = Math.max(cbBmi, 56);
      [bmp, bv] = build(hdr);
      bv.setUint32(14, hdr, true);
      bv.setUint32(14 + 16, 3, true);
      bv.setUint32(14 + 40, 0x00ff0000, true); bv.setUint32(14 + 44, 0x0000ff00, true);
      bv.setUint32(14 + 48, 0x000000ff, true); bv.setUint32(14 + 52, 0xff000000, true);
      for (let k = 14 + hdr; k + 3 < bmp.length; k += 4) {
        const a = bmp[k + 3]!;
        if (a > 0 && a < 255) for (let c = 0; c < 3; c++) bmp[k + c] = Math.min(255, Math.round((bmp[k + c]! * 255) / a));
      }
    }
    return { data: bmp, ext: 'bmp', widthTwips: 0, heightTwips: 0 };
  };

  let pos = 0;
  let guard = 0;
  while (pos + 8 <= bytes.length && guard++ < 200000) {
    const type = u32(pos), size = u32(pos + 4);
    if (size < 8 || pos + size > bytes.length) break;
    const r = pos + 8;
    switch (type) {
      case 14: pos = bytes.length; continue; // EOF
      case 17: dc.mapMode = u32(r); break;
      case 9: dc.winExt = [i32(r), i32(r + 4)]; break;
      case 10: dc.winOrg = [i32(r), i32(r + 4)]; break;
      case 11: dc.vpExt = [i32(r), i32(r + 4)]; break;
      case 12: dc.vpOrg = [i32(r), i32(r + 4)]; break;
      case 35: { // SETWORLDTRANSFORM
        dc.world = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        break;
      }
      case 36: { // MODIFYWORLDTRANSFORM
        const m: Xform = { a: dv.getFloat32(r, true), b: dv.getFloat32(r + 4, true), c: dv.getFloat32(r + 8, true), d: dv.getFloat32(r + 12, true), e: dv.getFloat32(r + 16, true), f: dv.getFloat32(r + 20, true) };
        const mode = u32(r + 24);
        dc.world = mode === 1 ? IDENT : mode === 2 ? mul(m, dc.world) : mode === 3 ? mul(dc.world, m) : m;
        break;
      }
      case 33: stack.push({ ...dc, winOrg: [...dc.winOrg], winExt: [...dc.winExt], vpOrg: [...dc.vpOrg], vpExt: [...dc.vpExt], cur: [...dc.cur] }); break;
      case 34: { // RESTOREDC (relativo)
        let n = i32(r);
        let s: DcState | undefined;
        while (n < 0 && stack.length) { s = stack.pop(); n++; }
        if (s) dc = s;
        break;
      }
      case 18: dc.bkMode = u32(r); break;
      case 19: dc.polyFill = u32(r); break;
      case 22: dc.textAlign = u32(r); break;
      case 24: dc.textColor = colorOf(u32(r)); break;
      case 25: dc.bkColor = colorOf(u32(r)); break;
      case 38: objs.set(u32(r), { kind: 'pen', pen: { style: u32(r + 4) & 0xf, width: i32(r + 8), color: colorOf(u32(r + 16)) } }); break;
      case 95: objs.set(u32(r), { kind: 'pen', pen: { style: u32(r + 20) & 0xf, width: u32(r + 24), color: colorOf(u32(r + 32)) } }); break;
      case 39: objs.set(u32(r), { kind: 'brush', brush: { style: u32(r + 4), color: colorOf(u32(r + 8)) } }); break;
      case 82: { // EXTCREATEFONTINDIRECTW
        let face = '';
        for (let k = 0; k < 32; k++) { const c = u16(r + 32 + k * 2); if (!c) break; face += String.fromCharCode(c); }
        objs.set(u32(r), { kind: 'font', font: { height: i32(r + 4), escapement: i32(r + 12), weight: i32(r + 20), italic: bytes[r + 24] !== 0, underline: bytes[r + 25] !== 0, strike: bytes[r + 26] !== 0, face } });
        break;
      }
      case 37: { // SELECTOBJECT
        const h = u32(r);
        const o = h & 0x80000000 ? STOCK[h & 0x7fffffff] : objs.get(h);
        if (o?.kind === 'pen') dc.pen = o.pen;
        else if (o?.kind === 'brush') dc.brush = o.brush;
        else if (o?.kind === 'font') dc.font = o.font;
        break;
      }
      case 40: objs.delete(u32(r)); break;
      case 27: dc.cur = [i32(r), i32(r + 4)]; if (path) { const [x, y] = toPage(dc.cur[0], dc.cur[1]); path.push({ op: 'M', x, y }); } break;
      case 54: { // LINETO
        const to: [number, number] = [i32(r), i32(r + 4)];
        if (path) { const [x, y] = toPage(...to); path.push({ op: 'L', x, y }); }
        else draw(poly([dc.cur, to], false), false);
        dc.cur = to;
        break;
      }
      case 43: draw(rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true); break;
      case 44: draw(rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true); break; // ROUNDRECT ≈ ret.
      case 42: draw(ellipse(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true); break;
      case 86: draw(poly(pts16(r + 20, u32(r + 16)), true), true); break; // POLYGON16
      case 87: draw(poly(pts16(r + 20, u32(r + 16)), false), false); break; // POLYLINE16
      case 3: draw(poly(pts32(r + 20, u32(r + 16)), true), true); break;
      case 4: draw(poly(pts32(r + 20, u32(r + 16)), false), false); break;
      case 89: case 6: { // POLYLINETO
        const pts = type === 89 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        if (path) path.push(...poly(pts, false, true));
        else draw(poly([dc.cur, ...pts], false), false);
        if (pts.length) dc.cur = pts[pts.length - 1]!;
        break;
      }
      case 85: case 2: { // POLYBEZIER
        const pts = type === 85 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        draw(bezier(pts, true), false);
        break;
      }
      case 88: case 5: { // POLYBEZIERTO
        const pts = type === 88 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        const c = bezier([dc.cur, ...pts], !path);
        if (path) path.push(...c.slice(0));
        else draw(c, false);
        if (pts.length) dc.cur = pts[pts.length - 1]!;
        break;
      }
      case 91: case 8: { // POLYPOLYGON
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        const cmds: PathCmdTw[] = [];
        for (const c of counts) {
          const pts = type === 91 ? pts16(o, c) : pts32(o, c);
          cmds.push(...poly(pts, true));
          o += c * (type === 91 ? 4 : 8);
        }
        draw(cmds, true);
        break;
      }
      case 90: case 7: { // POLYPOLYLINE
        const n = u32(r + 16);
        const counts = Array.from({ length: n }, (_, k) => u32(r + 24 + k * 4));
        let o = r + 24 + n * 4;
        for (const c of counts) {
          draw(poly(type === 90 ? pts16(o, c) : pts32(o, c), false), false);
          o += c * (type === 90 ? 4 : 8);
        }
        break;
      }
      case 59: path = []; break; // BEGINPATH
      case 60: break; // ENDPATH
      case 61: path?.push({ op: 'Z' }); break; // CLOSEFIGURE
      case 62: if (path) emitPath(path, true, false); path = null; break; // FILLPATH
      case 63: if (path) emitPath(path, true, true); path = null; break; // STROKEANDFILLPATH
      case 64: if (path) emitPath(path, false, true); path = null; break; // STROKEPATH
      case 67: case 68: path = null; break; // SELECTCLIPPATH / ABORTPATH
      case 84: { // EXTTEXTOUTW
        const refX = i32(r + 28), refY = i32(r + 32);
        const nChars = u32(r + 36), offStr = u32(r + 40), offDx = u32(r + 64);
        let text = '';
        for (let k = 0; k < nChars; k++) text += String.fromCharCode(u16(pos + offStr + k * 2));
        if (!text.trim()) break;
        const f = dc.font;
        const face = ctx.faces.get(f.face || 'Arial', f.weight >= 600, f.italic);
        const fm = face.font.metrics;
        // altura negativa = corpo (em); positiva = altura da célula
        const cell = Math.abs(f.height) || 12;
        const emLog = f.height < 0 ? cell : (cell * fm.unitsPerEm) / Math.max(1, fm.usWinAscent + fm.usWinDescent);
        const emTw = lenTw(emLog);
        if (emTw < 1) break;
        const sizePt = emTw / 20;
        const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : refX, dc.textAlign & 1 ? dc.cur[1] : refY);
        const ascTw = ((fm.usWinAscent || fm.ascender) / fm.unitsPerEm) * emTw;
        const descTw = ((fm.usWinDescent || -fm.descender) / fm.unitsPerEm) * emTw;
        const va = dc.textAlign & 24;
        const baseY = va === 24 ? py : va === 8 ? py - descTw : py + ascTw;
        // avanços: vetor Dx do registro (lógico) ou métricas da fonte
        const dxs: number[] = [];
        for (let k = 0; k < nChars; k++) dxs.push(offDx ? lenTw(i32(pos + offDx + k * 4)) : (face.font.advanceWidth(face.font.glyphId(text.charCodeAt(k))) * emTw) / fm.unitsPerEm);
        const total = dxs.reduce((a, b) => a + b, 0);
        const ha = dc.textAlign & 6;
        let x = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
        const glyphs: { cp: number; x: number }[] = [];
        for (let k = 0; k < nChars; k++) { glyphs.push({ cp: text.charCodeAt(k), x }); x += dxs[k]!; }
        out.push({ t: 'glyphs', face, sizePt, color: dc.textColor, y: baseY, glyphs, text });
        break;
      }
      case 76: case 77: { // BITBLT / STRETCHBLT
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = cbBmi ? dib(pos + offBmi, cbBmi, pos + offBits, cbBits) : null;
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: 'image', x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        else if (dc.brush.style !== 1) out.push({ t: 'rect', x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), fill: dc.brush.color });
        break;
      }
      case 114: { // ALPHABLEND
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const alphaFmt = bytes[r + 35]!;
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits, alphaFmt === 1);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: 'image', x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img });
        break;
      }
      case 81: { // STRETCHDIBITS
        const xd = i32(r + 16), yd = i32(r + 20);
        const offBmi = u32(r + 40), cbBmi = u32(r + 44), offBits = u32(r + 48), cbBits = u32(r + 52);
        const cx = i32(r + 64), cy = i32(r + 68);
        const img = dib(pos + offBmi, cbBmi, pos + offBits, cbBits);
        const [x0, y0] = toPage(xd, yd), [x1, y1] = toPage(xd + cx, yd + cy);
        if (img) out.push({ t: 'image', x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), image: img, ...(y1 < y0 ? { flipV: true } : {}) });
        break;
      }
    }
    pos += size;
  }
  void twipsPerDevPx;
  return out;
}
