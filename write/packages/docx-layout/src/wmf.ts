import type { PageItem, PathCmdTw } from './tree.js';
import type { DocContext } from './context.js';

/**
 * Metarquivo WMF ([MS-WMF], 16 bits — ex.: a prévia de um objeto do Equation Editor 3.0)
 * como itens de desenho, no subconjunto que esses arquivos usam: janela lógica
 * (SETWINDOWORG/EXT, mapeada no retângulo do objeto), canetas, pincéis e fontes, linhas
 * (MOVETO/LINETO, POLYLINE), POLYGON, RECTANGLE e texto (TEXTOUT/EXTTEXTOUT, com o
 * alinhamento do SETTEXTALIGN). O Word grava esse texto no PDF; o da fonte Symbol sai
 * na área privada (U+F0xx), como o w:sym (corpus t15: "P = Po × MO/MOo").
 */

interface Pen { style: number; width: number; color: string }
interface Brush { style: number; color: string }
interface Font { height: number; weight: number; italic: boolean; face: string; charset: number }
type Obj = { kind: 'pen'; pen: Pen } | { kind: 'brush'; brush: Brush } | { kind: 'font'; font: Font } | { kind: 'other' };
interface Dc { org: [number, number]; ext: [number, number]; pen: Pen; brush: Brush; font: Font; textColor: string; textAlign: number; cur: [number, number] }

const colorOf = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
/** Windows-1252: 0x80–0x9F (o resto coincide com o Latin-1) */
const CP1252 = [0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178];

export function isWmf(b: Uint8Array): boolean {
  if (b.length < 40) return false;
  // cabeçalho "placeable" (Aldus) ou o de memória/disco (tipo 1/2, 9 palavras)
  if (b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a) return true;
  return (b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0;
}

/** Desenha o WMF no retângulo (twips) dado. */
export function renderWmf(ctx: DocContext, bytes: Uint8Array, dest: { x: number; y: number; w: number; h: number }): PageItem[] {
  const out: PageItem[] = [];
  if (!isWmf(bytes)) return out;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i16 = (o: number) => dv.getInt16(o, true);
  const u16 = (o: number) => dv.getUint16(o, true);
  const u32 = (o: number) => dv.getUint32(o, true);
  const placeable = bytes[0] === 0xd7;
  let pos = placeable ? 22 : 0;
  // janela padrão: a caixa do cabeçalho "placeable"
  const box: [number, number, number, number] = placeable ? [i16(6), i16(8), i16(10), i16(12)] : [0, 0, 1, 1];
  pos += u16(pos + 2) * 2; // cabeçalho (9 palavras)
  let dc: Dc = {
    org: [box[0], box[1]], ext: [box[2] - box[0] || 1, box[3] - box[1] || 1],
    pen: { style: 0, width: 0, color: '000000' }, brush: { style: 0, color: 'FFFFFF' },
    font: { height: -12, weight: 400, italic: false, face: 'Arial', charset: 0 }, textColor: '000000', textAlign: 0, cur: [0, 0],
  };
  const stack: Dc[] = [];
  const objs: (Obj | null)[] = [];
  const add = (o: Obj) => { const k = objs.indexOf(null); if (k >= 0) objs[k] = o; else objs.push(o); };
  const sx = () => dest.w / dc.ext[0], sy = () => dest.h / dc.ext[1];
  const toPage = (x: number, y: number): [number, number] => [dest.x + (x - dc.org[0]) * sx(), dest.y + (y - dc.org[1]) * sy()];
  const stroke = (cmds: PathCmdTw[], fill: boolean) => {
    const f = fill && dc.brush.style !== 1 ? dc.brush.color : undefined;
    const st = dc.pen.style !== 5 ? { color: dc.pen.color, widthPt: Math.max(0.25, (Math.abs(dc.pen.width * sx()) || 0) / 20) } : undefined;
    if (cmds.length && (f || st)) out.push({ t: 'path', cmds, ...(f ? { fill: f } : {}), ...(st ? { stroke: st } : {}) });
  };
  const poly = (o: number, n: number, closed: boolean): PathCmdTw[] => {
    const c: PathCmdTw[] = [];
    for (let k = 0; k < n; k++) { const [x, y] = toPage(i16(o + 4 * k), i16(o + 4 * k + 2)); c.push({ op: k ? 'L' : 'M', x, y }); }
    if (closed) c.push({ op: 'Z' });
    return c;
  };
  const text = (x: number, y: number, raw: Uint8Array, dx: ((k: number) => number) | null) => {
    const f = dc.font;
    const sym = f.charset === 2;
    let s = '';
    for (const b of raw) s += String.fromCharCode(sym ? 0xf000 + b : b >= 0x80 && b < 0xa0 ? CP1252[b - 0x80]! : b);
    if (!s.trim()) return;
    const face = ctx.faces.get(f.face || 'Arial', f.weight >= 600, f.italic);
    const fm = face.font.metrics;
    // altura negativa = corpo (em); positiva = altura da célula
    const cell = Math.abs(f.height) || 12;
    const emLog = f.height < 0 ? cell : (cell * fm.unitsPerEm) / Math.max(1, fm.usWinAscent + fm.usWinDescent);
    const emTw = Math.abs(emLog * sy());
    if (emTw < 1) return;
    const [px, py] = toPage(dc.textAlign & 1 ? dc.cur[0] : x, dc.textAlign & 1 ? dc.cur[1] : y);
    const asc = ((fm.usWinAscent || fm.ascender) / fm.unitsPerEm) * emTw, desc = ((fm.usWinDescent || -fm.descender) / fm.unitsPerEm) * emTw;
    const va = dc.textAlign & 24;
    const baseY = va === 24 ? py : va === 8 ? py - desc : py + asc;
    const adv = Array.from(s, (ch, k) => (dx ? Math.abs(dx(k) * sx()) : (face.font.advanceWidth(face.font.glyphId(ch.charCodeAt(0))) * emTw) / fm.unitsPerEm));
    const total = adv.reduce((a, b) => a + b, 0);
    const ha = dc.textAlign & 6;
    let gx = ha === 2 ? px - total : ha === 6 ? px - total / 2 : px;
    const glyphs: { cp: number; x: number }[] = [];
    for (let k = 0; k < s.length; k++) { glyphs.push({ cp: s.charCodeAt(k), x: gx }); gx += adv[k]!; }
    out.push({ t: 'glyphs', face, sizePt: emTw / 20, color: dc.textColor, y: baseY, glyphs, text: s });
    if (dc.textAlign & 1) dc.cur = [dc.cur[0] + total / sx(), dc.cur[1]];
  };

  while (pos + 6 <= bytes.length) {
    const size = u32(pos) * 2, fn = u16(pos + 4), p = pos + 6;
    if (fn === 0 || size < 6 || pos + size > bytes.length) break;
    switch (fn) {
      case 0x020b: dc.org = [i16(p + 2), i16(p)]; break; // SETWINDOWORG (y, x)
      case 0x020c: dc.ext = [i16(p + 2) || 1, i16(p) || 1]; break; // SETWINDOWEXT
      case 0x012e: dc.textAlign = u16(p); break;
      case 0x0209: dc.textColor = colorOf(u32(p)); break;
      case 0x001e: stack.push({ ...dc }); break; // SAVEDC
      case 0x0127: { const k = i16(p); const s = k < 0 ? stack.splice(stack.length + k)[0] : undefined; if (s) dc = s; break; } // RESTOREDC
      case 0x02fa: add({ kind: 'pen', pen: { style: u16(p), width: i16(p + 2), color: colorOf(u32(p + 6)) } }); break;
      case 0x02fc: add({ kind: 'brush', brush: { style: u16(p), color: colorOf(u32(p + 2)) } }); break;
      case 0x02fb: { // CREATEFONTINDIRECT
        let face = '';
        for (let k = p + 18; k < Math.min(p + 50, pos + size) && bytes[k]; k++) face += String.fromCharCode(bytes[k]!);
        add({ kind: 'font', font: { height: i16(p), weight: i16(p + 8), italic: bytes[p + 10]! !== 0, face, charset: bytes[p + 13]! } });
        break;
      }
      case 0x00f7: case 0x0142: case 0x01f9: case 0x06ff: add({ kind: 'other' }); break; // paleta, pincel DIB, região
      case 0x012d: { // SELECTOBJECT
        const o = objs[u16(p)];
        if (o?.kind === 'pen') dc.pen = o.pen; else if (o?.kind === 'brush') dc.brush = o.brush; else if (o?.kind === 'font') dc.font = o.font;
        break;
      }
      case 0x01f0: if (u16(p) < objs.length) objs[u16(p)] = null; break; // DELETEOBJECT
      case 0x0214: dc.cur = [i16(p + 2), i16(p)]; break; // MOVETO (y, x)
      case 0x0213: { // LINETO
        const [x0, y0] = toPage(dc.cur[0], dc.cur[1]);
        dc.cur = [i16(p + 2), i16(p)];
        const [x1, y1] = toPage(dc.cur[0], dc.cur[1]);
        stroke([{ op: 'M', x: x0, y: y0 }, { op: 'L', x: x1, y: y1 }], false);
        break;
      }
      case 0x0325: stroke(poly(p + 2, i16(p), false), false); break; // POLYLINE
      case 0x0324: stroke(poly(p + 2, i16(p), true), true); break; // POLYGON
      case 0x041b: { // RECTANGLE (bottom, right, top, left)
        const [x0, y0] = toPage(i16(p + 6), i16(p + 4)), [x1, y1] = toPage(i16(p + 2), i16(p));
        stroke([{ op: 'M', x: x0, y: y0 }, { op: 'L', x: x1, y: y0 }, { op: 'L', x: x1, y: y1 }, { op: 'L', x: x0, y: y1 }, { op: 'Z' }], true);
        break;
      }
      case 0x0521: { // TEXTOUT: n, cadeia (par), y, x
        const n = i16(p), o = p + 2 + ((n + 1) & ~1);
        text(i16(o + 2), i16(o), bytes.subarray(p + 2, p + 2 + n), null);
        break;
      }
      case 0x0a32: { // EXTTEXTOUT: y, x, n, opções, [retângulo], cadeia (par), [dx]
        const n = i16(p + 4), opt = u16(p + 6);
        const so = p + 8 + (opt & 6 ? 8 : 0);
        const dxo = so + ((n + 1) & ~1);
        const hasDx = dxo + 2 * n <= pos + size;
        text(i16(p + 2), i16(p), bytes.subarray(so, so + n), hasDx ? (k) => i16(dxo + 2 * k) : null);
        break;
      }
    }
    pos += size;
  }
  return out;
}
