/**
 * Metarquivos do Windows — EMF ([MS-EMF]) e WMF ([MS-WMF]) — tocados num
 * Canvas 2D. O navegador não decodifica nenhum dos dois, e eles são o
 * clip-art, os gráficos/equações OLE colados e os logos de templates
 * (~30% dos decks reais do corpus). O viewer RASTERIZA o metarquivo uma vez
 * (`rasterizeMetafile`) e usa o canvas como imagem comum.
 *
 * Mapeamento de coordenadas, fontes e casos de borda portados do motor do
 * Write (write/packages/docx-layout/src/{emf,wmf}.ts); lá a saída são itens
 * de página, aqui chamadas diretas ao canvas. Cobertura: caminhos (retângulo,
 * retângulo arredondado, elipse, arco/corda/setor, polígonos, Béziers,
 * paths), texto (EXTTEXTOUT/TEXTOUT com o vetor de avanços do arquivo,
 * alinhamento, rotação), bitmaps DIB (1/4/8/16/24/32 bpp, operações raster
 * SRCCOPY/SRCAND/SRCPAINT/SRCINVERT), recorte por retângulo/path e o
 * estado do DC (SAVEDC/RESTOREDC, modos de mapeamento, transformação de
 * mundo). EMF+ "dual" toca os registros EMF equivalentes.
 */

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Pt = [number, number];

interface Pen { style: number; width: number; color: string; cap?: number; join?: number }
interface Brush { style: number; color: string; hatch?: number }
interface Font { height: number; weight: number; italic: boolean; underline: boolean; strike: boolean; face: string; escapement: number; charset: number }
type Obj = { kind: 'pen'; pen: Pen } | { kind: 'brush'; brush: Brush } | { kind: 'font'; font: Font } | { kind: 'other' };

/** Comando de path em coordenadas de SAÍDA (px do canvas). */
type Cmd = { op: 'M' | 'L'; x: number; y: number } | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number } | { op: 'Z' };

const hex = (v: number): string => '#' + [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff].map((c) => c.toString(16).padStart(2, '0')).join('');
/** Windows-1252: 0x80–0x9F (o resto coincide com o Latin-1). */
const CP1252 = [0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178];

export function isEmf(b: Uint8Array): boolean {
  return b.length > 44 && b[0] === 1 && b[1] === 0 && b[2] === 0 && b[3] === 0 && b[40] === 0x20 && b[41] === 0x45 && b[42] === 0x4d && b[43] === 0x46;
}
export function isWmf(b: Uint8Array): boolean {
  if (b.length < 40) return false;
  if (b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a) return true; // "placeable" (Aldus)
  return (b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0;
}
export function isMetafile(b: Uint8Array): boolean { return isEmf(b) || isWmf(b); }

/** Tamanho natural (px a 96 dpi) do metarquivo; undefined = desconhecido. */
export function metafileSize(b: Uint8Array): { w: number; h: number } | undefined {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (isEmf(b)) {
    const w = (dv.getInt32(32, true) - dv.getInt32(24, true)) / 100, h = (dv.getInt32(36, true) - dv.getInt32(28, true)) / 100; // mm
    if (w > 0 && h > 0) return { w: (w / 25.4) * 96, h: (h / 25.4) * 96 };
    const bw = dv.getInt32(16, true) - dv.getInt32(8, true), bh = dv.getInt32(20, true) - dv.getInt32(12, true);
    return bw > 0 && bh > 0 ? { w: bw, h: bh } : undefined;
  }
  if (isWmf(b) && b[0] === 0xd7) {
    const inch = dv.getUint16(14, true) || 1440;
    const w = Math.abs(dv.getInt16(10, true) - dv.getInt16(6, true)), h = Math.abs(dv.getInt16(12, true) - dv.getInt16(8, true));
    if (w > 0 && h > 0) return { w: (w / inch) * 96, h: (h / inch) * 96 };
  }
  if (isWmf(b) && b[0] !== 0xd7) {
    // sem cabeçalho "placeable" (equações do Equation Editor, prévias OLE): a
    // janela do 1º SETWINDOWEXT dá a PROPORÇÃO — rasterizar quadrado espremia o
    // x e mantinha o corpo da fonte (glifos encavalados); unidade ≈ twip
    let q = dv.getUint16(2, true) * 2;
    for (let guard = 0; q + 10 <= b.length && guard < 20000; guard++) {
      const size = dv.getUint32(q, true) * 2, fn = dv.getUint16(q + 4, true);
      if (fn === 0 || size < 6) break;
      if (fn === 0x020c) {
        const w = Math.abs(dv.getInt16(q + 8, true)), h = Math.abs(dv.getInt16(q + 6, true));
        if (w > 0 && h > 0) return { w: w / 15, h: h / 15 };
        break;
      }
      q += size;
    }
  }
  return undefined;
}

/**
 * Rasteriza o metarquivo num canvas novo (tamanho natural × `scale`, limitado
 * a `maxSide`). `makeCanvas` fornece o canvas (OffscreenCanvas, <canvas> ou o
 * da fábrica do export). Devolve undefined se não for metarquivo/sem canvas.
 */
export function rasterizeMetafile<C extends { getContext(id: '2d'): unknown; width: number; height: number }>(
  bytes: Uint8Array, makeCanvas: (w: number, h: number) => C | undefined, opts: { scale?: number; maxSide?: number; minSide?: number } = {},
): C | undefined {
  if (!isMetafile(bytes)) return undefined;
  const nat = metafileSize(bytes) ?? { w: 512, h: 512 };
  let k = opts.scale ?? 2;
  const maxSide = opts.maxSide ?? 2400, minSide = opts.minSide ?? 600;
  const big = Math.max(nat.w, nat.h) * k;
  if (big > maxSide) k *= maxSide / big;
  else if (big < minSide) k *= minSide / Math.max(1, big);
  const w = Math.max(1, Math.round(nat.w * k)), h = Math.max(1, Math.round(nat.h * k));
  const cv = makeCanvas(w, h);
  const ctx = cv?.getContext('2d') as Ctx | null | undefined;
  if (!cv || !ctx) return undefined;
  try { drawMetafile(ctx, bytes, 0, 0, w, h); } catch { /* metarquivo truncado: fica o que foi desenhado */ }
  return cv;
}

/** Toca EMF/WMF no retângulo (x, y, w, h) do contexto. */
export function drawMetafile(ctx: Ctx, bytes: Uint8Array, x: number, y: number, w: number, h: number): void {
  ctx.save();
  try {
    if (isEmf(bytes)) playEmf(ctx, bytes, { x, y, w, h });
    else if (isWmf(bytes)) playWmf(ctx, bytes, { x, y, w, h });
  } finally { ctx.restore(); }
}

// ─────────────────────────── desenho comum ───────────────────────────

interface Paint {
  pen: Pen; brush: Brush; polyFill: number;
  /** px de saída por unidade lógica (para espessura de caneta). */
  penScale: number;
  /** caneta cosmética (largura 0) → 1 px do dispositivo de referência, em px de saída */
  hairline: number;
  clip: Cmd[][];
}

function tracePath(ctx: Ctx, cmds: Cmd[]): void {
  ctx.beginPath();
  for (const c of cmds) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}

function withClip(ctx: Ctx, clip: Cmd[][], f: () => void): void {
  if (!clip.length) { f(); return; }
  ctx.save();
  for (const c of clip) { tracePath(ctx, c); ctx.clip(); }
  f();
  ctx.restore();
}

/** Hachura (HS_*) como padrão 8×8 da cor do pincel sobre transparente. */
function hatchPattern(ctx: Ctx, color: string, style: number): CanvasPattern | string {
  const mk = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : undefined;
  const c2 = mk?.getContext('2d');
  if (!mk || !c2) return color;
  c2.strokeStyle = color; c2.lineWidth = 1;
  c2.beginPath();
  if (style === 0 || style === 4) { c2.moveTo(0, 4.5); c2.lineTo(8, 4.5); }
  if (style === 1 || style === 4) { c2.moveTo(4.5, 0); c2.lineTo(4.5, 8); }
  if (style === 2 || style === 5) { c2.moveTo(0, 0); c2.lineTo(8, 8); }
  if (style === 3 || style === 5) { c2.moveTo(8, 0); c2.lineTo(0, 8); }
  c2.stroke();
  return ctx.createPattern(mk, 'repeat') ?? color;
}

function paintPath(ctx: Ctx, p: Paint, cmds: Cmd[], fill: boolean, stroke: boolean): void {
  if (!cmds.length) return;
  const doFill = fill && p.brush.style !== 1;
  const doStroke = stroke && p.pen.style !== 5;
  if (!doFill && !doStroke) return;
  withClip(ctx, p.clip, () => {
    tracePath(ctx, cmds);
    if (doFill) {
      ctx.fillStyle = p.brush.style === 2 ? hatchPattern(ctx, p.brush.color, p.brush.hatch ?? 0) : p.brush.color;
      ctx.fill(p.polyFill === 1 ? 'evenodd' : 'nonzero');
    }
    if (doStroke) {
      const lw = p.pen.width > 0 ? p.pen.width * p.penScale : p.hairline;
      ctx.lineWidth = Math.max(p.hairline * 0.5, lw);
      ctx.strokeStyle = p.pen.color;
      const s = p.pen.style & 0xf;
      const u = Math.max(1, ctx.lineWidth);
      ctx.setLineDash(s === 1 ? [6 * u, 2 * u] : s === 2 ? [u, u] : s === 3 ? [6 * u, 2 * u, u, 2 * u] : s === 4 ? [6 * u, 2 * u, u, 2 * u, u, 2 * u] : []);
      // EXTCREATEPEN: PS_ENDCAP_* (0x000/0x100/0x200) e PS_JOIN_* (0x0000/0x1000/0x2000)
      const cap = p.pen.cap ?? 0, join = p.pen.join ?? 0;
      ctx.lineCap = cap === 0x100 ? 'square' : cap === 0x200 ? 'butt' : 'round';
      ctx.lineJoin = join === 0x1000 ? 'bevel' : join === 0x2000 ? 'miter' : 'round';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

/** Elipse (Béziers) inscrita no retângulo, via função de mapeamento. */
function ellipseCmds(map: (x: number, y: number) => Pt, l: number, t: number, r: number, b: number): Cmd[] {
  const K = 0.5523;
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  const P = map;
  const seg = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): Cmd => {
    const a = P(x1, y1), b2 = P(x2, y2), d = P(x, y);
    return { op: 'C', x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], x: d[0], y: d[1] };
  };
  const p0 = P(cx + rx, cy);
  return [
    { op: 'M', x: p0[0], y: p0[1] },
    seg(cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry),
    seg(cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy),
    seg(cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry),
    seg(cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy),
    { op: 'Z' },
  ];
}

/** Retângulo arredondado (cantos elípticos rw × rh). */
function roundRectCmds(map: (x: number, y: number) => Pt, l: number, t: number, r: number, b: number, rw: number, rh: number): Cmd[] {
  if (r < l) [l, r] = [r, l];
  if (b < t) [t, b] = [b, t];
  const ax = Math.min(Math.abs(rw) / 2, (r - l) / 2), ay = Math.min(Math.abs(rh) / 2, (b - t) / 2);
  const K = 0.5523;
  const P = map;
  const L = (x: number, y: number): Cmd => { const p = P(x, y); return { op: 'L', x: p[0], y: p[1] }; };
  const C = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): Cmd => {
    const a = P(x1, y1), c = P(x2, y2), d = P(x, y);
    return { op: 'C', x1: a[0], y1: a[1], x2: c[0], y2: c[1], x: d[0], y: d[1] };
  };
  const m = P(l + ax, t);
  return [
    { op: 'M', x: m[0], y: m[1] }, L(r - ax, t), C(r - ax + ax * K, t, r, t + ay - ay * K, r, t + ay),
    L(r, b - ay), C(r, b - ay + ay * K, r - ax + ax * K, b, r - ax, b),
    L(l + ax, b), C(l + ax - ax * K, b, l, b - ay + ay * K, l, b - ay),
    L(l, t + ay), C(l, t + ay - ay * K, l + ax - ax * K, t, l + ax, t), { op: 'Z' },
  ];
}

/**
 * Arco/corda/setor GDI: elipse do retângulo, do raio que passa por (xs, ys)
 * ao raio por (xe, ye), no sentido ANTI-horário (em coordenadas lógicas com y
 * para baixo = sentido decrescente do ângulo). Aproximado por segmentos.
 */
function arcCmds(map: (x: number, y: number) => Pt, l: number, t: number, r: number, b: number, xs: number, ys: number, xe: number, ye: number, kind: 'arc' | 'chord' | 'pie'): Cmd[] {
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = Math.abs(r - l) / 2, ry = Math.abs(b - t) / 2;
  if (rx === 0 || ry === 0) return [];
  const a0 = Math.atan2((ys - cy) / ry, (xs - cx) / rx);
  let a1 = Math.atan2((ye - cy) / ry, (xe - cx) / rx);
  // anti-horário na tela (y para baixo) = ângulo decrescente
  while (a1 >= a0) a1 -= 2 * Math.PI;
  if (Math.abs(a1 - a0) < 1e-9) a1 = a0 - 2 * Math.PI;
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 32)));
  const out: Cmd[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = map(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
    out.push({ op: i === 0 ? 'M' : 'L', x: p[0], y: p[1] });
  }
  if (kind === 'pie') { const c = map(cx, cy); out.push({ op: 'L', x: c[0], y: c[1] }, { op: 'Z' }); }
  else if (kind === 'chord') out.push({ op: 'Z' });
  return out;
}

// ─────────────────────────── bitmaps DIB ───────────────────────────

/**
 * BITMAPINFO + bits → ImageData (síncrono). Formatos sem compressão
 * (BI_RGB/BI_BITFIELDS, 1/4/8/16/24/32 bpp) e RLE8/RLE4. JPEG/PNG embutidos
 * (BI_JPEG/BI_PNG) não — ficam de fora (raros em metarquivos de Office).
 */
function decodeDib(b: Uint8Array, offBmi: number, cbBmi: number, offBits: number, cbBits: number): ImageData | undefined {
  if (!cbBmi || offBmi + 40 > b.length || offBits + cbBits > b.length) return undefined;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const hdr = dv.getUint32(offBmi, true);
  let w: number, h: number, bpp: number, comp = 0, clrUsed = 0;
  if (hdr === 12) { w = dv.getUint16(offBmi + 4, true); h = dv.getInt16(offBmi + 6, true); bpp = dv.getUint16(offBmi + 10, true); }
  else { w = dv.getInt32(offBmi + 4, true); h = dv.getInt32(offBmi + 8, true); bpp = dv.getUint16(offBmi + 14, true); comp = dv.getUint32(offBmi + 16, true); clrUsed = dv.getUint32(offBmi + 32, true); }
  const topDown = h < 0;
  h = Math.abs(h);
  if (w <= 0 || h <= 0 || w * h > 40_000_000) return undefined;
  if (comp !== 0 && comp !== 3 && comp !== 1 && comp !== 2) return undefined;
  const palN = bpp <= 8 ? (clrUsed || 1 << bpp) : 0;
  const entry = hdr === 12 ? 3 : 4;
  let palOff = offBmi + hdr;
  // BI_BITFIELDS: 3 máscaras após o cabeçalho de 40 bytes
  let masks: [number, number, number, number] | undefined;
  if (comp === 3) {
    if (hdr >= 52) masks = [dv.getUint32(offBmi + 40, true), dv.getUint32(offBmi + 44, true), dv.getUint32(offBmi + 48, true), hdr >= 56 ? dv.getUint32(offBmi + 52, true) : 0];
    else { masks = [dv.getUint32(palOff, true), dv.getUint32(palOff + 4, true), dv.getUint32(palOff + 8, true), 0]; palOff += 12; }
  }
  const pal: number[][] = [];
  for (let i = 0; i < palN; i++) {
    const o = palOff + i * entry;
    if (o + 3 > b.length) break;
    pal.push([b[o + 2]!, b[o + 1]!, b[o]!]);
  }
  const img = new ImageData(w, h);
  const d = img.data;
  const put = (x: number, yRow: number, r: number, g: number, bl: number, a = 255): void => {
    const y = topDown ? yRow : h - 1 - yRow;
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = bl; d[i + 3] = a;
  };
  if (comp === 1 || comp === 2) {
    // RLE8 / RLE4
    let x = 0, y = 0, o = offBits;
    const end = offBits + cbBits;
    const px = (idx: number): void => { const c = pal[idx] ?? [0, 0, 0]; put(x++, y, c[0]!, c[1]!, c[2]!); };
    while (o + 1 < end) {
      const n = b[o]!, v = b[o + 1]!; o += 2;
      if (n > 0) {
        for (let k = 0; k < n; k++) px(comp === 1 ? v : (k & 1 ? v & 0xf : v >> 4));
      } else if (v === 0) { x = 0; y++; }
      else if (v === 1) break;
      else if (v === 2) { x += b[o]!; y += b[o + 1]!; o += 2; }
      else {
        const bytesN = comp === 1 ? v : (v + 1) >> 1;
        for (let k = 0; k < v; k++) px(comp === 1 ? b[o + k]! : ((b[o + (k >> 1)]! >> (k & 1 ? 0 : 4)) & 0xf));
        o += (bytesN + 1) & ~1;
      }
    }
    return img;
  }
  const stride = Math.ceil((w * bpp) / 32) * 4;
  const shiftOf = (m: number): number => { let s = 0; if (!m) return 0; while (!((m >>> s) & 1)) s++; return s; };
  const bitsOf = (m: number): number => { let n = 0; for (let v = m; v; v >>>= 1) n += v & 1; return n; };
  const chan = (v: number, m: number): number => { if (!m) return 0; const s = shiftOf(m), n = bitsOf(m); const x = (v & m) >>> s; return n >= 8 ? x >>> (n - 8) : Math.round((x * 255) / ((1 << n) - 1)); };
  let anyAlpha = false;
  for (let y = 0; y < h; y++) {
    const row = offBits + y * stride;
    if (row + stride > b.length + 3) break;
    for (let x = 0; x < w; x++) {
      if (bpp === 24) { const o = row + x * 3; put(x, y, b[o + 2]!, b[o + 1]!, b[o]!); }
      else if (bpp === 32) {
        const o = row + x * 4;
        if (masks) { const v = dv.getUint32(o, true); put(x, y, chan(v, masks[0]), chan(v, masks[1]), chan(v, masks[2]), masks[3] ? chan(v, masks[3]) : 255); }
        else { if (b[o + 3]) anyAlpha = true; put(x, y, b[o + 2]!, b[o + 1]!, b[o]!, 255); }
      } else if (bpp === 16) {
        const v = dv.getUint16(row + x * 2, true);
        const m = masks ?? [0x7c00, 0x03e0, 0x001f, 0];
        put(x, y, chan(v, m[0]), chan(v, m[1]), chan(v, m[2]));
      } else {
        const bitPos = x * bpp;
        const byte = b[row + (bitPos >> 3)] ?? 0;
        const idx = (byte >> (8 - bpp - (bitPos & 7))) & ((1 << bpp) - 1);
        const c = pal[idx] ?? (bpp === 1 ? (idx ? [255, 255, 255] : [0, 0, 0]) : [0, 0, 0]);
        put(x, y, c[0]!, c[1]!, c[2]!);
      }
    }
  }
  void anyAlpha;
  return img;
}

/** Desenha uma DIB com operação raster (ROP3) aproximada por modo de composição. */
function blitDib(ctx: Ctx, img: ImageData | undefined, rop: number, x0: number, y0: number, x1: number, y1: number, clip: Cmd[][], sx = 0, sy = 0, sw = 0, sh = 0, alphaBlend?: { alpha: number; srcAlpha: boolean }): void {
  if (!img) return;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(img.width, img.height) : undefined;
  const c2 = cv?.getContext('2d');
  if (!cv || !c2) return;
  if (alphaBlend?.srcAlpha) {
    // AC_SRC_ALPHA: 32 bpp pré-multiplicado → alfa direto
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3]!;
      if (a > 0 && a < 255) for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.round((d[i + c]! * 255) / a));
    }
  }
  c2.putImageData(img, 0, 0);
  const r3 = (rop >>> 16) & 0xff;
  withClip(ctx, clip, () => {
    ctx.save();
    // SRCCOPY 0xCC; SRCAND 0x88 (multiplica: máscara preta); SRCPAINT 0xEE (OU);
    // SRCINVERT 0x66 (XOU ≈ diferença em máscaras P&B); NOTSRCCOPY 0x33
    if (r3 === 0x88) ctx.globalCompositeOperation = 'multiply';
    else if (r3 === 0xee) ctx.globalCompositeOperation = 'lighten';
    else if (r3 === 0x66) ctx.globalCompositeOperation = 'difference';
    else if (r3 === 0xaa) { ctx.restore(); return; } // D: não muda nada
    if (alphaBlend) ctx.globalAlpha *= alphaBlend.alpha;
    const flipX = x1 < x0, flipY = y1 < y0;
    const dx = Math.min(x0, x1), dy = Math.min(y0, y1), dw = Math.abs(x1 - x0), dh = Math.abs(y1 - y0);
    if (flipX || flipY) {
      ctx.translate(dx + (flipX ? dw : 0), dy + (flipY ? dh : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.translate(-dx, -dy);
    }
    const ok = sw > 0 && sh > 0 && sx >= 0 && sy >= 0 && sx + sw <= img.width + 0.5 && sy + sh <= img.height + 0.5;
    if (ok) ctx.drawImage(cv, sx, sy, sw, sh, dx, dy, dw, dh);
    else ctx.drawImage(cv, dx, dy, dw, dh);
    ctx.restore();
  });
}

// ─────────────────────────── texto ───────────────────────────

/** Fonte Symbol (charset SYMBOL) → Unicode: gregos e sinais matemáticos. */
const SYMBOL: Record<number, number> = {
  0x22: 0x2200, 0x24: 0x2203, 0x27: 0x220b, 0x2a: 0x2217, 0x2d: 0x2212, 0x40: 0x2245,
  0x41: 0x391, 0x42: 0x392, 0x43: 0x3a7, 0x44: 0x394, 0x45: 0x395, 0x46: 0x3a6, 0x47: 0x393, 0x48: 0x397, 0x49: 0x399, 0x4a: 0x3d1,
  0x4b: 0x39a, 0x4c: 0x39b, 0x4d: 0x39c, 0x4e: 0x39d, 0x4f: 0x39f, 0x50: 0x3a0, 0x51: 0x398, 0x52: 0x3a1, 0x53: 0x3a3, 0x54: 0x3a4,
  0x55: 0x3a5, 0x56: 0x3c2, 0x57: 0x3a9, 0x58: 0x39e, 0x59: 0x3a8, 0x5a: 0x396, 0x5c: 0x2234, 0x5e: 0x22a5,
  0x61: 0x3b1, 0x62: 0x3b2, 0x63: 0x3c7, 0x64: 0x3b4, 0x65: 0x3b5, 0x66: 0x3c6, 0x67: 0x3b3, 0x68: 0x3b7, 0x69: 0x3b9, 0x6a: 0x3d5,
  0x6b: 0x3ba, 0x6c: 0x3bb, 0x6d: 0x3bc, 0x6e: 0x3bd, 0x6f: 0x3bf, 0x70: 0x3c0, 0x71: 0x3b8, 0x72: 0x3c1, 0x73: 0x3c3, 0x74: 0x3c4,
  0x75: 0x3c5, 0x76: 0x3d6, 0x77: 0x3c9, 0x78: 0x3be, 0x79: 0x3c8, 0x7a: 0x3b6, 0x7e: 0x223c,
  0xa1: 0x3d2, 0xa2: 0x2032, 0xa3: 0x2264, 0xa4: 0x2044, 0xa5: 0x221e, 0xa6: 0x192, 0xa7: 0x2663, 0xa8: 0x2666, 0xa9: 0x2665, 0xaa: 0x2660,
  0xab: 0x2194, 0xac: 0x2190, 0xad: 0x2191, 0xae: 0x2192, 0xaf: 0x2193, 0xb0: 0xb0, 0xb1: 0xb1, 0xb2: 0x2033, 0xb3: 0x2265, 0xb4: 0xd7,
  0xb5: 0x221d, 0xb6: 0x2202, 0xb7: 0x2022, 0xb8: 0xf7, 0xb9: 0x2260, 0xba: 0x2261, 0xbb: 0x2248, 0xbc: 0x2026, 0xbf: 0x21b5,
  0xc0: 0x2135, 0xc1: 0x2111, 0xc2: 0x211c, 0xc3: 0x2118, 0xc4: 0x2297, 0xc5: 0x2295, 0xc6: 0x2205, 0xc7: 0x2229, 0xc8: 0x222a,
  0xc9: 0x2283, 0xca: 0x2287, 0xcb: 0x2284, 0xcc: 0x2282, 0xcd: 0x2286, 0xce: 0x2208, 0xcf: 0x2209, 0xd0: 0x2220, 0xd1: 0x2207,
  0xd2: 0xae, 0xd3: 0xa9, 0xd4: 0x2122, 0xd5: 0x220f, 0xd6: 0x221a, 0xd7: 0x22c5, 0xd8: 0xac, 0xd9: 0x2227, 0xda: 0x2228,
  0xdb: 0x21d4, 0xdc: 0x21d0, 0xdd: 0x21d1, 0xde: 0x21d2, 0xdf: 0x21d3, 0xe0: 0x25ca, 0xe1: 0x2329, 0xe5: 0x2211,
  0xf1: 0x232a, 0xf2: 0x222b, 0xf3: 0x2320, 0xf5: 0x2321,
};
export function symbolToUnicode(code: number): number {
  const c = code >= 0xf000 && code <= 0xf0ff ? code - 0xf000 : code;
  return SYMBOL[c] ?? c;
}

interface TextReq {
  text: string; x: number; y: number; font: Font; color: string; align: number;
  /** avanços em px de saída (opcional) */
  dx?: number[];
  /** px de saída por unidade lógica (vertical), para o tamanho da fonte */
  scaleY: number;
  bk?: string;
}

function drawText(ctx: Ctx, t: TextReq, clip: Cmd[][]): number {
  const f = t.font;
  const sym = f.charset === 2 || /^symbol$/i.test(f.face);
  let s = '';
  for (const ch of t.text) {
    const c = ch.charCodeAt(0);
    s += String.fromCharCode(sym ? symbolToUnicode(c) : c);
  }
  if (!s.trim()) return 0;
  // altura negativa = corpo (em); positiva = altura da célula (≈ em / 0,86 nas fontes de texto comuns)
  const cell = Math.abs(f.height) || 12;
  const emPx = (f.height < 0 ? cell : cell * 0.86) * t.scaleY;
  if (emPx < 0.5) return 0;
  const face = sym ? '"Segoe UI Symbol", "Cambria Math", serif' : `"${f.face || 'Arial'}", Arial, sans-serif`;
  ctx.font = `${f.italic ? 'italic ' : ''}${f.weight >= 600 ? 'bold ' : ''}${emPx.toFixed(2)}px ${face}`;
  const va = t.align & 24;
  ctx.textBaseline = va === 24 ? 'alphabetic' : va === 8 ? 'bottom' : 'top';
  const widths = t.dx && t.dx.length >= s.length ? t.dx.slice(0, s.length) : Array.from(s, (ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  const ha = t.align & 6;
  const rot = (-f.escapement / 10) * Math.PI / 180;
  withClip(ctx, clip, () => {
    ctx.save();
    ctx.translate(t.x, t.y);
    if (rot) ctx.rotate(rot);
    let x = ha === 2 ? -total : ha === 6 ? -total / 2 : 0;
    if (t.bk) {
      const asc = va === 24 ? emPx * 0.9 : 0;
      ctx.fillStyle = t.bk;
      ctx.fillRect(x, -asc, total, emPx * 1.15);
    }
    ctx.fillStyle = t.color;
    if (t.dx) {
      for (let k = 0; k < s.length; k++) { ctx.fillText(s[k]!, x, 0); x += widths[k]!; }
    } else ctx.fillText(s, x, 0);
    if (f.underline || f.strike) {
      const x0 = ha === 2 ? -total : ha === 6 ? -total / 2 : 0;
      const base = va === 24 ? 0 : va === 8 ? -emPx * 0.22 : emPx * 0.9;
      ctx.fillRect(x0, base + (f.underline ? emPx * 0.1 : -emPx * 0.3), total, Math.max(0.5, emPx * 0.06));
    }
    ctx.restore();
  });
  return total;
}

// ─────────────────────────── EMF ───────────────────────────

interface Xform { a: number; b: number; c: number; d: number; e: number; f: number }
const IDENT: Xform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const mul = (m: Xform, n: Xform): Xform => ({
  a: m.a * n.a + m.b * n.c, b: m.a * n.b + m.b * n.d,
  c: m.c * n.a + m.d * n.c, d: m.c * n.b + m.d * n.d,
  e: m.e * n.a + m.f * n.c + n.e, f: m.e * n.b + m.f * n.d + n.f,
});

const DEF_FONT: Font = { height: -12, weight: 400, italic: false, underline: false, strike: false, face: 'Arial', escapement: 0, charset: 0 };
const STOCK: Record<number, Obj> = {
  0: { kind: 'brush', brush: { style: 0, color: '#ffffff' } },
  1: { kind: 'brush', brush: { style: 0, color: '#c0c0c0' } },
  2: { kind: 'brush', brush: { style: 0, color: '#808080' } },
  3: { kind: 'brush', brush: { style: 0, color: '#404040' } },
  4: { kind: 'brush', brush: { style: 0, color: '#000000' } },
  5: { kind: 'brush', brush: { style: 1, color: '#000000' } },
  6: { kind: 'pen', pen: { style: 0, width: 0, color: '#ffffff' } },
  7: { kind: 'pen', pen: { style: 0, width: 0, color: '#000000' } },
  8: { kind: 'pen', pen: { style: 5, width: 0, color: '#000000' } },
  10: { kind: 'font', font: { ...DEF_FONT, face: 'Courier New' } },
  11: { kind: 'font', font: DEF_FONT },
  12: { kind: 'font', font: { ...DEF_FONT, face: 'Courier New' } },
  13: { kind: 'font', font: DEF_FONT },
  14: { kind: 'font', font: { ...DEF_FONT, face: 'Courier New' } },
  16: { kind: 'font', font: DEF_FONT },
  17: { kind: 'font', font: { ...DEF_FONT, height: -11, face: 'Segoe UI' } },
};

interface EmfDc {
  mapMode: number; winOrg: Pt; winExt: Pt; vpOrg: Pt; vpExt: Pt; world: Xform;
  pen: Pen; brush: Brush; font: Font;
  textColor: string; bkColor: string; bkMode: number; textAlign: number; polyFill: number;
  cur: Pt; clip: Cmd[][];
}

function playEmf(ctx: Ctx, bytes: Uint8Array, dest: { x: number; y: number; w: number; h: number }): void {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i32 = (o: number): number => dv.getInt32(o, true);
  const u32 = (o: number): number => dv.getUint32(o, true);
  const i16 = (o: number): number => dv.getInt16(o, true);
  const u16 = (o: number): number => dv.getUint16(o, true);
  const f32 = (o: number): number => dv.getFloat32(o, true);
  // quadro (0,01 mm) → pixels do dispositivo de referência
  const frame = [i32(24), i32(28), i32(32), i32(36)] as const;
  const devPx = [i32(72), i32(76)] as const;
  const devMm = [i32(80), i32(84)] as const;
  const pxPerHmmX = devPx[0] / Math.max(1, devMm[0] * 100);
  const pxPerHmmY = devPx[1] / Math.max(1, devMm[1] * 100);
  let fx0 = frame[0] * pxPerHmmX, fy0 = frame[1] * pxPerHmmY;
  let fw = (frame[2] - frame[0]) * pxPerHmmX, fh = (frame[3] - frame[1]) * pxPerHmmY;
  if (!(fw > 0 && fh > 0)) { // quadro vazio: usa os limites (bounds, px do dispositivo)
    fx0 = i32(8); fy0 = i32(12); fw = Math.max(1, i32(16) - i32(8)); fh = Math.max(1, i32(20) - i32(12));
  }
  const sx = dest.w / fw, sy = dest.h / fh;

  let dc: EmfDc = {
    mapMode: 1, winOrg: [0, 0], winExt: [1, 1], vpOrg: [0, 0], vpExt: [1, 1], world: IDENT,
    pen: (STOCK[7] as { pen: Pen }).pen, brush: (STOCK[0] as { brush: Brush }).brush, font: DEF_FONT,
    textColor: '#000000', bkColor: '#ffffff', bkMode: 2, textAlign: 0, polyFill: 1, cur: [0, 0], clip: [],
  };
  const stack: EmfDc[] = [];
  const objs = new Map<number, Obj>();

  const mapScale = (): Pt => {
    switch (dc.mapMode) {
      case 2: return [pxPerHmmX * 10, -pxPerHmmY * 10]; // LOMETRIC: 0,1 mm
      case 3: return [pxPerHmmX, -pxPerHmmY]; // HIMETRIC: 0,01 mm
      case 4: return [0.254 * pxPerHmmX * 100, -0.254 * pxPerHmmY * 100]; // LOENGLISH 0,01"
      case 5: return [0.0254 * pxPerHmmX * 100, -0.0254 * pxPerHmmY * 100]; // HIENGLISH 0,001"
      case 6: return [(25.4 / 1440) * pxPerHmmX * 100, -(25.4 / 1440) * pxPerHmmY * 100]; // TWIPS
      case 7: case 8: return [dc.vpExt[0] / (dc.winExt[0] || 1), dc.vpExt[1] / (dc.winExt[1] || 1)];
      default: return [1, 1];
    }
  };
  const scaleNow = (): Pt => {
    const [kx, ky] = mapScale();
    if (dc.mapMode === 7) { const k = Math.min(Math.abs(kx), Math.abs(ky)); return [Math.sign(kx) * k, Math.sign(ky) * k]; }
    return [kx, ky];
  };
  /** lógico → px de saída */
  const P = (x: number, y: number): Pt => {
    const w = dc.world;
    const wx = x * w.a + y * w.c + w.e, wy = x * w.b + y * w.d + w.f;
    const s = scaleNow();
    const dx = (wx - dc.winOrg[0]) * s[0] + dc.vpOrg[0], dy = (wy - dc.winOrg[1]) * s[1] + dc.vpOrg[1];
    return [dest.x + (dx - fx0) * sx, dest.y + (dy - fy0) * sy];
  };
  /** comprimento lógico → px de saída (escala média) */
  const len = (l: number): number => {
    const s = scaleNow();
    const w = dc.world;
    return Math.abs(l * Math.hypot(w.a, w.b) * s[0]) * Math.sqrt(Math.abs(sx * sy));
  };
  const lenY = (l: number): number => {
    const s = scaleNow();
    const w = dc.world;
    return Math.abs(l * Math.hypot(w.c, w.d) * s[1]) * Math.abs(sy);
  };
  const paint = (): Paint => ({ pen: dc.pen, brush: dc.brush, polyFill: dc.polyFill, penScale: len(1), hairline: Math.max(0.5, Math.sqrt(Math.abs(sx * sy))), clip: dc.clip });

  let path: Cmd[] | null = null;
  const draw = (cmds: Cmd[], closed: boolean): void => {
    if (path) { path.push(...cmds); return; }
    paintPath(ctx, paint(), cmds, closed, true);
  };
  const pts16 = (o: number, n: number): Pt[] => Array.from({ length: Math.min(n, (bytes.length - o) >> 2) }, (_, k) => [i16(o + k * 4), i16(o + k * 4 + 2)]);
  const pts32 = (o: number, n: number): Pt[] => Array.from({ length: Math.min(n, (bytes.length - o) >> 3) }, (_, k) => [i32(o + k * 8), i32(o + k * 8 + 4)]);
  const poly = (pts: Pt[], closed: boolean, cont = false): Cmd[] => {
    const c: Cmd[] = [];
    pts.forEach(([x, y], k) => { const [px, py] = P(x, y); c.push({ op: k === 0 && !cont ? 'M' : 'L', x: px, y: py }); });
    if (closed && c.length) c.push({ op: 'Z' });
    return c;
  };
  const bez = (pts: Pt[], startWithMove: boolean): Cmd[] => {
    const c: Cmd[] = [];
    let k = 0;
    if (startWithMove && pts.length) { const [x, y] = P(pts[0]![0], pts[0]![1]); c.push({ op: 'M', x, y }); k = 1; }
    for (; k + 2 < pts.length; k += 3) {
      const a = P(...pts[k]!), b = P(...pts[k + 1]!), d = P(...pts[k + 2]!);
      c.push({ op: 'C', x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: d[0], y: d[1] });
    }
    return c;
  };
  const rect = (l: number, t: number, r: number, b: number): Cmd[] => poly([[l, t], [r, t], [r, b], [l, b]], true);
  const textOut = (r: number, pos: number, wide: boolean): void => {
    const refX = i32(r + 28), refY = i32(r + 32);
    const nChars = u32(r + 36), offStr = u32(r + 40), opts = u32(r + 44), offDx = u32(r + 64);
    if (!nChars || pos + offStr + nChars * (wide ? 2 : 1) > bytes.length) return;
    if (opts & 0x10) return; // ETO_GLYPH_INDEX: índices de glifo, sem texto (raro em slides)
    let text = '';
    for (let k = 0; k < nChars; k++) {
      const c = wide ? u16(pos + offStr + k * 2) : bytes[pos + offStr + k]!;
      text += String.fromCharCode(!wide && c >= 0x80 && c < 0xa0 ? CP1252[c - 0x80]! : c);
    }
    const anchor: Pt = dc.textAlign & 1 ? dc.cur : [refX, refY];
    const [px, py] = P(anchor[0], anchor[1]);
    const dx = offDx && pos + offDx + nChars * 4 <= bytes.length ? Array.from({ length: nChars }, (_, k) => len(i32(pos + offDx + k * 4))) : undefined;
    // ETO_OPAQUE (2): retângulo de fundo
    if (opts & 2) {
      const [x0, y0] = P(i32(r + 48), i32(r + 52)), [x1, y1] = P(i32(r + 56), i32(r + 60));
      withClip(ctx, dc.clip, () => { ctx.fillStyle = dc.bkColor; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); });
    }
    const adv = drawText(ctx, {
      text, x: px, y: py, font: dc.font, color: dc.textColor, align: dc.textAlign, ...(dx ? { dx } : {}), scaleY: lenY(1),
      ...(dc.bkMode === 2 && !(opts & 2) ? { bk: dc.bkColor } : {}),
    }, dc.clip);
    if (dc.textAlign & 1) { const s = len(1) || 1; dc.cur = [dc.cur[0] + adv / s, dc.cur[1]]; }
  };

  let pos = 0, guard = 0;
  while (pos + 8 <= bytes.length && guard++ < 500000) {
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
      case 31: { // SCALEVIEWPORTEXTEX
        dc.vpExt = [Math.round((dc.vpExt[0] * i32(r)) / (i32(r + 4) || 1)), Math.round((dc.vpExt[1] * i32(r + 8)) / (i32(r + 12) || 1))];
        break;
      }
      case 32: { // SCALEWINDOWEXTEX
        dc.winExt = [Math.round((dc.winExt[0] * i32(r)) / (i32(r + 4) || 1)), Math.round((dc.winExt[1] * i32(r + 8)) / (i32(r + 12) || 1))];
        break;
      }
      case 35: dc.world = { a: f32(r), b: f32(r + 4), c: f32(r + 8), d: f32(r + 12), e: f32(r + 16), f: f32(r + 20) }; break;
      case 36: { // MODIFYWORLDTRANSFORM
        const m: Xform = { a: f32(r), b: f32(r + 4), c: f32(r + 8), d: f32(r + 12), e: f32(r + 16), f: f32(r + 20) };
        const mode = u32(r + 24);
        dc.world = mode === 1 ? IDENT : mode === 2 ? mul(m, dc.world) : mode === 3 ? mul(dc.world, m) : m;
        break;
      }
      case 33: stack.push({ ...dc, winOrg: [...dc.winOrg], winExt: [...dc.winExt], vpOrg: [...dc.vpOrg], vpExt: [...dc.vpExt], cur: [...dc.cur], clip: [...dc.clip] }); break;
      case 34: { // RESTOREDC (relativo, negativo)
        let n = i32(r);
        let s: EmfDc | undefined;
        if (n > 0) n = n - stack.length - 1;
        while (n < 0 && stack.length) { s = stack.pop(); n++; }
        if (s) dc = s;
        break;
      }
      case 18: dc.bkMode = u32(r); break;
      case 19: dc.polyFill = u32(r); break;
      case 22: dc.textAlign = u32(r); break;
      case 24: dc.textColor = hex(u32(r)); break;
      case 25: dc.bkColor = hex(u32(r)); break;
      case 38: objs.set(u32(r), { kind: 'pen', pen: { style: u32(r + 4) & 0xf, width: i32(r + 8), color: hex(u32(r + 16)) } }); break; // CREATEPEN
      case 95: { // EXTCREATEPEN
        const st = u32(r + 20);
        objs.set(u32(r), { kind: 'pen', pen: { style: st & 0xf, width: u32(r + 24), color: hex(u32(r + 32)), cap: st & 0xf00, join: st & 0xf000 } });
        break;
      }
      case 39: { // CREATEBRUSHINDIRECT
        const st = u32(r + 4);
        objs.set(u32(r), { kind: 'brush', brush: { style: st === 2 ? 2 : st === 1 ? 1 : 0, color: hex(u32(r + 8)), hatch: u32(r + 12) } });
        break;
      }
      case 93: case 94: { // CREATEMONOBRUSH / CREATEDIBPATTERNBRUSHPT: cor média ≈ cinza do texto
        objs.set(u32(r), { kind: 'brush', brush: { style: 0, color: dc.textColor === '#000000' ? '#808080' : dc.textColor } });
        break;
      }
      case 82: { // EXTCREATEFONTINDIRECTW (LOGFONTW em r+4)
        let face = '';
        for (let k = 0; k < 32; k++) { const c = u16(r + 32 + k * 2); if (!c) break; face += String.fromCharCode(c); }
        objs.set(u32(r), {
          kind: 'font',
          font: { height: i32(r + 4), escapement: i32(r + 12), weight: i32(r + 20), italic: bytes[r + 24] !== 0, underline: bytes[r + 25] !== 0, strike: bytes[r + 26] !== 0, charset: bytes[r + 27]!, face },
        });
        break;
      }
      case 37: { // SELECTOBJECT
        const hnd = u32(r);
        const o = hnd & 0x80000000 ? STOCK[hnd & 0x7fffffff] : objs.get(hnd);
        if (o?.kind === 'pen') dc.pen = o.pen;
        else if (o?.kind === 'brush') dc.brush = o.brush;
        else if (o?.kind === 'font') dc.font = o.font;
        break;
      }
      case 40: objs.delete(u32(r)); break;
      case 27: dc.cur = [i32(r), i32(r + 4)]; if (path) { const [x, y] = P(dc.cur[0], dc.cur[1]); path.push({ op: 'M', x, y }); } break;
      case 54: { // LINETO
        const to: Pt = [i32(r), i32(r + 4)];
        if (path) { const [x, y] = P(...to); path.push({ op: 'L', x, y }); }
        else draw(poly([dc.cur, to], false), false);
        dc.cur = to;
        break;
      }
      case 43: draw(rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true); break;
      case 44: draw(roundRectCmds(P, i32(r), i32(r + 4), i32(r + 8), i32(r + 12), i32(r + 16), i32(r + 20)), true); break;
      case 42: draw(ellipseCmds(P, i32(r), i32(r + 4), i32(r + 8), i32(r + 12)), true); break;
      case 45: case 46: case 47: case 55: { // ARC / CHORD / PIE / ARCTO
        const kind = type === 46 ? 'chord' : type === 47 ? 'pie' : 'arc';
        const c = arcCmds(P, i32(r), i32(r + 4), i32(r + 8), i32(r + 12), i32(r + 16), i32(r + 20), i32(r + 24), i32(r + 28), kind);
        if (type === 55 && path && c.length) { c[0] = { ...(c[0] as { x: number; y: number }), op: 'L' } as Cmd; }
        draw(c, kind !== 'arc');
        break;
      }
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
        draw(bez(pts, true), false);
        break;
      }
      case 88: case 5: { // POLYBEZIERTO
        const pts = type === 88 ? pts16(r + 20, u32(r + 16)) : pts32(r + 20, u32(r + 16));
        const c = bez([dc.cur, ...pts], !path);
        if (path) path.push(...c); else draw(c, false);
        if (pts.length) dc.cur = pts[pts.length - 1]!;
        break;
      }
      case 91: case 8: { // POLYPOLYGON
        const n = u32(r + 16);
        let o = r + 24 + n * 4;
        const cmds: Cmd[] = [];
        for (let k = 0; k < n && o < bytes.length; k++) {
          const c = u32(r + 24 + k * 4);
          cmds.push(...poly(type === 91 ? pts16(o, c) : pts32(o, c), true));
          o += c * (type === 91 ? 4 : 8);
        }
        draw(cmds, true);
        break;
      }
      case 90: case 7: { // POLYPOLYLINE
        const n = u32(r + 16);
        let o = r + 24 + n * 4;
        for (let k = 0; k < n && o < bytes.length; k++) {
          const c = u32(r + 24 + k * 4);
          draw(poly(type === 90 ? pts16(o, c) : pts32(o, c), false), false);
          o += c * (type === 90 ? 4 : 8);
        }
        break;
      }
      case 59: path = []; break; // BEGINPATH
      case 60: break; // ENDPATH
      case 61: path?.push({ op: 'Z' }); break; // CLOSEFIGURE
      case 62: if (path) paintPath(ctx, paint(), path, true, false); path = null; break; // FILLPATH
      case 63: if (path) paintPath(ctx, paint(), path, true, true); path = null; break; // STROKEANDFILLPATH
      case 64: if (path) paintPath(ctx, paint(), path, false, true); path = null; break; // STROKEPATH
      case 67: if (path && path.length) dc.clip = [...dc.clip, path]; path = null; break; // SELECTCLIPPATH
      case 68: path = null; break; // ABORTPATH
      case 30: { // INTERSECTCLIPRECT
        dc.clip = [...dc.clip, rect(i32(r), i32(r + 4), i32(r + 8), i32(r + 12))];
        break;
      }
      case 75: { // EXTSELECTCLIPRGN: RGN_COPY sem região = sem recorte
        const cb = u32(r), mode = u32(r + 4);
        if (mode === 5 || cb === 0) dc.clip = [];
        else if (cb >= 32) {
          // RgnData: cabeçalho (32) + retângulos; RGN_AND (1) / RGN_COPY (5)
          const n = u32(r + 8 + 8), rs: Cmd[] = [];
          for (let k = 0; k < n && r + 8 + 32 + k * 16 + 16 <= pos + size; k++) {
            const o = r + 8 + 32 + k * 16;
            // coordenadas de DISPOSITIVO → saída direta
            const x0 = dest.x + (i32(o) - fx0) * sx, y0 = dest.y + (i32(o + 4) - fy0) * sy;
            const x1 = dest.x + (i32(o + 8) - fx0) * sx, y1 = dest.y + (i32(o + 12) - fy0) * sy;
            rs.push({ op: 'M', x: x0, y: y0 }, { op: 'L', x: x1, y: y0 }, { op: 'L', x: x1, y: y1 }, { op: 'L', x: x0, y: y1 }, { op: 'Z' });
          }
          if (rs.length) dc.clip = mode === 1 ? [...dc.clip, rs] : [rs];
        }
        break;
      }
      case 83: textOut(r, pos, false); break; // EXTTEXTOUTA
      case 84: textOut(r, pos, true); break; // EXTTEXTOUTW
      case 76: case 77: { // BITBLT / STRETCHBLT
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const rop = u32(r + 32);
        const xs = i32(r + 36), ys = i32(r + 40);
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        // BITBLT: a origem é o bitmap inteiro; STRETCHBLT traz a extensão de origem
        const sw = type === 77 ? i32(r + 92) : 0, sh = type === 77 ? i32(r + 96) : 0;
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + cx, yd + cy);
        if (cbBmi) blitDib(ctx, decodeDib(bytes, pos + offBmi, cbBmi, pos + offBits, cbBits), rop, x0, y0, x1, y1, dc.clip, xs, ys, sw, sh);
        else {
          // sem bitmap de origem só PATCOPY/BLACKNESS/WHITENESS pintam (com o pincel atual)
          const r3 = (rop >>> 16) & 0xff;
          const color = r3 === 0x00 ? '#000000' : r3 === 0xff ? '#ffffff' : r3 === 0xf0 && dc.brush.style !== 1 ? dc.brush.color : undefined;
          if (color) withClip(ctx, dc.clip, () => { ctx.fillStyle = color; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); });
        }
        break;
      }
      case 114: { // ALPHABLEND
        const xd = i32(r + 16), yd = i32(r + 20), cx = i32(r + 24), cy = i32(r + 28);
        const constAlpha = bytes[r + 34]!, alphaFmt = bytes[r + 35]!;
        const xs = i32(r + 36), ys = i32(r + 40);
        const offBmi = u32(r + 76), cbBmi = u32(r + 80), offBits = u32(r + 84), cbBits = u32(r + 88);
        const sw = i32(r + 92), sh = i32(r + 96);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + cx, yd + cy);
        const img = decodeDib(bytes, pos + offBmi, cbBmi, pos + offBits, cbBits);
        // 32 bpp com AC_SRC_ALPHA: o canal alfa do DIB vale (o decode o zera quando BI_RGB)
        if (img && alphaFmt === 1) {
          const bpp = dv.getUint16(pos + offBmi + 14, true);
          if (bpp === 32) {
            const h = Math.abs(dv.getInt32(pos + offBmi + 8, true)), w = img.width, top = dv.getInt32(pos + offBmi + 8, true) < 0;
            for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
              const o = pos + offBits + (yy * w + xx) * 4 + 3;
              const y2 = top ? yy : h - 1 - yy;
              img.data[(y2 * w + xx) * 4 + 3] = bytes[o] ?? 255;
            }
          }
        }
        blitDib(ctx, img, 0xcc0020, x0, y0, x1, y1, dc.clip, xs, ys, sw, sh, { alpha: constAlpha / 255, srcAlpha: alphaFmt === 1 });
        break;
      }
      case 81: { // STRETCHDIBITS
        const xd = i32(r + 16), yd = i32(r + 20), xs = i32(r + 24), ys = i32(r + 28), sw = i32(r + 32), sh = i32(r + 36);
        const offBmi = u32(r + 40), cbBmi = u32(r + 44), offBits = u32(r + 48), cbBits = u32(r + 52);
        const rop = u32(r + 60);
        const cx = i32(r + 64), cy = i32(r + 68);
        const img = decodeDib(bytes, pos + offBmi, cbBmi, pos + offBits, cbBits);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + cx, yd + cy);
        // origem em coordenadas de DIB (de baixo para cima quando altura > 0)
        const bh = img?.height ?? 0;
        const bottomUp = cbBmi >= 12 && dv.getInt32(pos + offBmi + 8, true) > 0;
        blitDib(ctx, img, rop, x0, y0, x1, y1, dc.clip, xs, bottomUp ? bh - ys - sh : ys, sw, sh);
        break;
      }
      case 80: { // SETDIBITSTODEVICE
        const xd = i32(r + 16), yd = i32(r + 20), xs = i32(r + 24), ys = i32(r + 28), cx = i32(r + 32), cy = i32(r + 36);
        const offBmi = u32(r + 40), cbBmi = u32(r + 44), offBits = u32(r + 48), cbBits = u32(r + 52);
        const img = decodeDib(bytes, pos + offBmi, cbBmi, pos + offBits, cbBits);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + cx, yd + cy);
        blitDib(ctx, img, 0xcc0020, x0, y0, x1, y1, dc.clip, xs, ys, cx, cy);
        break;
      }
      case 118: { // GRADIENTFILL (retângulos H/V; triângulos ≈ cor média)
        const nVer = u32(r + 16), nTri = u32(r + 20), mode = u32(r + 24);
        const vo = r + 28;
        const ver = Array.from({ length: Math.min(nVer, 4096) }, (_, k) => {
          const o = vo + k * 16;
          return { x: i32(o), y: i32(o + 4), c: [u16(o + 8) >> 8, u16(o + 10) >> 8, u16(o + 12) >> 8] };
        });
        let o = vo + nVer * 16;
        for (let k = 0; k < nTri && o + 8 <= pos + size; k++) {
          if (mode === 2) { // triângulo
            const a = ver[u32(o)], b = ver[u32(o + 4)], c = ver[u32(o + 8)];
            o += 12;
            if (!a || !b || !c) continue;
            const avg = [0, 1, 2].map((i) => Math.round((a.c[i]! + b.c[i]! + c.c[i]!) / 3));
            paintPath(ctx, { ...paint(), brush: { style: 0, color: `rgb(${avg.join(',')})` }, pen: { style: 5, width: 0, color: '#000' } }, poly([[a.x, a.y], [b.x, b.y], [c.x, c.y]], true), true, false);
          } else {
            const a = ver[u32(o)], b = ver[u32(o + 4)];
            o += 8;
            if (!a || !b) continue;
            const [x0, y0] = P(a.x, a.y), [x1, y1] = P(b.x, b.y);
            withClip(ctx, dc.clip, () => {
              const g = mode === 0 ? ctx.createLinearGradient(x0, 0, x1, 0) : ctx.createLinearGradient(0, y0, 0, y1);
              g.addColorStop(0, `rgb(${a.c.join(',')})`); g.addColorStop(1, `rgb(${b.c.join(',')})`);
              ctx.fillStyle = g;
              ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
            });
          }
        }
        break;
      }
    }
    pos += size;
  }
}

// ─────────────────────────── WMF ───────────────────────────

interface WmfDc {
  mapMode: number; winOrg: Pt; winExt: Pt; vpOrg: Pt; vpExt: Pt;
  pen: Pen; brush: Brush; font: Font;
  textColor: string; bkColor: string; bkMode: number; textAlign: number; polyFill: number;
  cur: Pt; clip: Cmd[][];
}

function playWmf(ctx: Ctx, bytes: Uint8Array, dest: { x: number; y: number; w: number; h: number }): void {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const i16 = (o: number): number => dv.getInt16(o, true);
  const u16 = (o: number): number => dv.getUint16(o, true);
  const u32 = (o: number): number => dv.getUint32(o, true);
  const placeable = bytes[0] === 0xd7;
  let pos = placeable ? 22 : 0;
  // caixa do cabeçalho "placeable" (lógico) = a área de saída
  const box: [number, number, number, number] = placeable ? [i16(6), i16(8), i16(10), i16(12)] : [0, 0, 0, 0];
  pos += u16(pos + 2) * 2; // cabeçalho (9 palavras)

  // sem caixa: descobre a janela pelo 1º SETWINDOWEXT/ORG
  if (!placeable || box[2] === box[0] || box[3] === box[1]) {
    let q = pos, org: Pt = [0, 0], ext: Pt | undefined;
    for (let guard = 0; q + 6 <= bytes.length && guard < 20000; guard++) {
      const size = u32(q) * 2, fn = u16(q + 4);
      if (fn === 0 || size < 6) break;
      if (fn === 0x020b) org = [i16(q + 8), i16(q + 6)];
      if (fn === 0x020c && !ext) ext = [i16(q + 8), i16(q + 6)];
      q += size;
    }
    if (ext) { box[0] = org[0]; box[1] = org[1]; box[2] = org[0] + ext[0]; box[3] = org[1] + ext[1]; }
    else { box[2] = 1000; box[3] = 1000; }
  }
  let dc: WmfDc = {
    mapMode: 1, winOrg: [box[0], box[1]], winExt: [box[2] - box[0] || 1, box[3] - box[1] || 1], vpOrg: [0, 0], vpExt: [1, 1],
    pen: { style: 0, width: 0, color: '#000000' }, brush: { style: 0, color: '#ffffff' }, font: DEF_FONT,
    textColor: '#000000', bkColor: '#ffffff', bkMode: 2, textAlign: 0, polyFill: 1, cur: [0, 0], clip: [],
  };
  // a janela do arquivo mapeia na caixa do cabeçalho; a saída = caixa → dest
  const bx = box[0], by = box[1], bw = (box[2] - box[0]) || 1, bh = (box[3] - box[1]) || 1;
  const stack: WmfDc[] = [];
  const objs: (Obj | null)[] = [];
  const add = (o: Obj): void => { const k = objs.indexOf(null); if (k >= 0) objs[k] = o; else objs.push(o); };
  /** lógico → px de saída: a janela atual (org/ext) cobre a caixa do cabeçalho */
  const P = (x: number, y: number): Pt => {
    // janela → caixa (na escala da 1ª janela = caixa): u = box + (x − org)·(box/ext)?
    // No WMF "placeable" a convenção é: lógico == coordenadas da caixa quando a janela
    // é a própria caixa; janelas diferentes reescalam relativo à caixa.
    const ux = bx + ((x - dc.winOrg[0]) * bw) / (dc.winExt[0] || 1);
    const uy = by + ((y - dc.winOrg[1]) * bh) / (dc.winExt[1] || 1);
    return [dest.x + ((ux - bx) * dest.w) / bw, dest.y + ((uy - by) * dest.h) / bh];
  };
  const kx = (): number => Math.abs(dest.w / (dc.winExt[0] || 1));
  const ky = (): number => Math.abs(dest.h / (dc.winExt[1] || 1));
  const paint = (): Paint => ({ pen: dc.pen, brush: dc.brush, polyFill: dc.polyFill, penScale: Math.sqrt(kx() * ky()), hairline: Math.max(0.5, dest.w / 1000), clip: dc.clip });
  const draw = (cmds: Cmd[], fill: boolean): void => paintPath(ctx, paint(), cmds, fill, true);
  const poly = (o: number, n: number, closed: boolean): Cmd[] => {
    const c: Cmd[] = [];
    for (let k = 0; k < n && o + 4 * k + 4 <= bytes.length; k++) { const [x, y] = P(i16(o + 4 * k), i16(o + 4 * k + 2)); c.push({ op: k ? 'L' : 'M', x, y }); }
    if (closed && c.length) c.push({ op: 'Z' });
    return c;
  };
  const rectCmds = (l: number, t: number, r: number, b: number): Cmd[] => {
    const [x0, y0] = P(l, t), [x1, y1] = P(r, b);
    return [{ op: 'M', x: x0, y: y0 }, { op: 'L', x: x1, y: y0 }, { op: 'L', x: x1, y: y1 }, { op: 'L', x: x0, y: y1 }, { op: 'Z' }];
  };
  const text = (x: number, y: number, raw: Uint8Array, dx: ((k: number) => number) | null, opaque?: [number, number, number, number]): void => {
    const sym = dc.font.charset === 2;
    let s = '';
    for (const b of raw) s += String.fromCharCode(sym ? b : b >= 0x80 && b < 0xa0 ? CP1252[b - 0x80]! : b);
    if (opaque) {
      const c = rectCmds(...opaque);
      withClip(ctx, dc.clip, () => { tracePath(ctx, c); ctx.fillStyle = dc.bkColor; ctx.fill(); });
    }
    const anchor: Pt = dc.textAlign & 1 ? dc.cur : [x, y];
    const [px, py] = P(anchor[0], anchor[1]);
    const adv = drawText(ctx, {
      text: s, x: px, y: py, font: dc.font, color: dc.textColor, align: dc.textAlign, scaleY: ky(),
      ...(dx ? { dx: Array.from(s, (_, k) => Math.abs(dx(k) * kx())) } : {}),
      ...(dc.bkMode === 2 && !opaque ? { bk: dc.bkColor } : {}),
    }, dc.clip);
    if (dc.textAlign & 1) dc.cur = [dc.cur[0] + adv / (kx() || 1), dc.cur[1]];
  };
  const dibAt = (o: number, end: number): { img: ImageData | undefined } => {
    // DIB empacotado: BITMAPINFOHEADER + paleta + bits
    if (o + 40 > end) return { img: undefined };
    const hdr = u32(o);
    const bpp = hdr === 12 ? u16(o + 10) : u16(o + 14);
    const clrUsed = hdr === 12 ? 0 : u32(o + 32);
    const comp = hdr === 12 ? 0 : u32(o + 16);
    const pal = bpp <= 8 ? (clrUsed || 1 << bpp) * (hdr === 12 ? 3 : 4) : comp === 3 && hdr === 40 ? 12 : 0;
    const bits = o + hdr + pal;
    return { img: decodeDib(bytes, o, hdr + pal, bits, Math.max(0, end - bits)) };
  };

  let guard = 0;
  while (pos + 6 <= bytes.length && guard++ < 500000) {
    const size = u32(pos) * 2, fn = u16(pos + 4), p = pos + 6;
    if (fn === 0 || size < 6 || pos + size > bytes.length) break;
    const end = pos + size;
    switch (fn) {
      case 0x0103: dc.mapMode = u16(p); break;
      case 0x020b: dc.winOrg = [i16(p + 2), i16(p)]; break; // SETWINDOWORG (y, x)
      case 0x020c: dc.winExt = [i16(p + 2) || 1, i16(p) || 1]; break; // SETWINDOWEXT
      case 0x020d: dc.vpOrg = [i16(p + 2), i16(p)]; break;
      case 0x020e: dc.vpExt = [i16(p + 2) || 1, i16(p) || 1]; break;
      case 0x020f: dc.winOrg = [dc.winOrg[0] + i16(p + 2), dc.winOrg[1] + i16(p)]; break; // OFFSETWINDOWORG
      case 0x0410: { // SCALEWINDOWEXT (yDenom, yNum, xDenom, xNum)
        dc.winExt = [Math.round((dc.winExt[0] * i16(p + 6)) / (i16(p + 4) || 1)), Math.round((dc.winExt[1] * i16(p + 2)) / (i16(p) || 1))];
        break;
      }
      case 0x0102: dc.bkMode = u16(p); break;
      case 0x0106: dc.polyFill = u16(p); break;
      case 0x012e: dc.textAlign = u16(p); break;
      case 0x0209: dc.textColor = hex(u32(p)); break;
      case 0x0201: dc.bkColor = hex(u32(p)); break;
      case 0x001e: stack.push({ ...dc, winOrg: [...dc.winOrg], winExt: [...dc.winExt], cur: [...dc.cur], clip: [...dc.clip] }); break; // SAVEDC
      case 0x0127: { // RESTOREDC
        let n = i16(p);
        let s: WmfDc | undefined;
        while (n < 0 && stack.length) { s = stack.pop(); n++; }
        if (s) dc = s;
        break;
      }
      case 0x02fa: add({ kind: 'pen', pen: { style: u16(p) & 0xf, width: Math.abs(i16(p + 2)), color: hex(u32(p + 6)) } }); break;
      case 0x02fc: { // CREATEBRUSHINDIRECT
        const st = u16(p);
        add({ kind: 'brush', brush: { style: st === 2 ? 2 : st === 1 ? 1 : 0, color: hex(u32(p + 2)), hatch: u16(p + 6) } });
        break;
      }
      case 0x02fb: { // CREATEFONTINDIRECT
        let face = '';
        for (let k = p + 18; k < Math.min(p + 50, end) && bytes[k]; k++) face += String.fromCharCode(bytes[k]!);
        add({ kind: 'font', font: { height: i16(p), escapement: i16(p + 4), weight: i16(p + 8), italic: bytes[p + 10] !== 0, underline: bytes[p + 11] !== 0, strike: bytes[p + 12] !== 0, charset: bytes[p + 13]!, face } });
        break;
      }
      case 0x0142: add({ kind: 'brush', brush: { style: 0, color: '#808080' } }); break; // DIBCREATEPATTERNBRUSH ≈ cinza
      case 0x00f7: case 0x01f9: case 0x06ff: add({ kind: 'other' }); break; // paleta, pincel padrão, região
      case 0x012d: { // SELECTOBJECT
        const o = objs[u16(p)];
        if (o?.kind === 'pen') dc.pen = o.pen; else if (o?.kind === 'brush') dc.brush = o.brush; else if (o?.kind === 'font') dc.font = o.font;
        break;
      }
      case 0x01f0: if (u16(p) < objs.length) objs[u16(p)] = null; break; // DELETEOBJECT
      case 0x0214: dc.cur = [i16(p + 2), i16(p)]; break; // MOVETO (y, x)
      case 0x0213: { // LINETO
        const [x0, y0] = P(dc.cur[0], dc.cur[1]);
        dc.cur = [i16(p + 2), i16(p)];
        const [x1, y1] = P(dc.cur[0], dc.cur[1]);
        draw([{ op: 'M', x: x0, y: y0 }, { op: 'L', x: x1, y: y1 }], false);
        break;
      }
      case 0x0325: draw(poly(p + 2, i16(p), false), false); break; // POLYLINE
      case 0x0324: draw(poly(p + 2, i16(p), true), true); break; // POLYGON
      case 0x0538: { // POLYPOLYGON
        const n = u16(p);
        let o = p + 2 + n * 2;
        const cmds: Cmd[] = [];
        for (let k = 0; k < n; k++) { const c = u16(p + 2 + k * 2); cmds.push(...poly(o, c, true)); o += c * 4; }
        draw(cmds, true);
        break;
      }
      case 0x041b: draw(rectCmds(i16(p + 6), i16(p + 4), i16(p + 2), i16(p)), true); break; // RECTANGLE (b, r, t, l)
      case 0x061c: draw(roundRectCmds(P, i16(p + 10), i16(p + 8), i16(p + 6), i16(p + 4), i16(p + 2), i16(p)), true); break; // ROUNDRECT (h, w, b, r, t, l)
      case 0x0418: draw(ellipseCmds(P, i16(p + 6), i16(p + 4), i16(p + 2), i16(p)), true); break; // ELLIPSE (b, r, t, l)
      case 0x0817: case 0x081a: case 0x0830: { // ARC / PIE / CHORD (yEnd, xEnd, yStart, xStart, b, r, t, l)
        const kind = fn === 0x081a ? 'pie' : fn === 0x0830 ? 'chord' : 'arc';
        draw(arcCmds(P, i16(p + 14), i16(p + 12), i16(p + 10), i16(p + 8), i16(p + 6), i16(p + 4), i16(p + 2), i16(p), kind), kind !== 'arc');
        break;
      }
      case 0x0416: dc.clip = [...dc.clip, rectCmds(i16(p + 6), i16(p + 4), i16(p + 2), i16(p))]; break; // INTERSECTCLIPRECT (b, r, t, l)
      case 0x012c: dc.clip = []; break; // SELECTCLIPREGION (sem região = sem recorte)
      case 0x0521: { // TEXTOUT: n, cadeia (par), y, x
        const n = i16(p), o = p + 2 + ((n + 1) & ~1);
        text(i16(o + 2), i16(o), bytes.subarray(p + 2, p + 2 + n), null);
        break;
      }
      case 0x0a32: { // EXTTEXTOUT: y, x, n, opções, [retângulo], cadeia (par), [dx]
        const n = i16(p + 4), opt = u16(p + 6);
        const hasRect = (opt & 6) !== 0;
        const so = p + 8 + (hasRect ? 8 : 0);
        const dxo = so + ((n + 1) & ~1);
        const hasDx = dxo + 2 * n <= end;
        const opaque: [number, number, number, number] | undefined = opt & 2 && hasRect ? [i16(p + 8), i16(p + 10), i16(p + 12), i16(p + 14)] : undefined;
        text(i16(p + 2), i16(p), bytes.subarray(so, so + n), hasDx ? (k) => i16(dxo + 2 * k) : null, opaque);
        break;
      }
      case 0x0b41: { // DIBSTRETCHBLT: rop(4), srcH, srcW, ySrc, xSrc, destH, destW, yDst, xDst, DIB
        const rop = u32(p);
        const sh = i16(p + 4), sw = i16(p + 6), ys = i16(p + 8), xs = i16(p + 10);
        const dh = i16(p + 12), dw = i16(p + 14), yd = i16(p + 16), xd = i16(p + 18);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + dw, yd + dh);
        if (size > 26) {
          const { img } = dibAt(p + 20, end);
          const bottomSrc = img ? img.height - ys - sh : ys;
          blitDib(ctx, img, rop, x0, y0, x1, y1, dc.clip, xs, bottomSrc, sw, sh);
        } else {
          const r3 = (rop >>> 16) & 0xff;
          const color = r3 === 0x00 ? '#000000' : r3 === 0xff ? '#ffffff' : r3 === 0xf0 ? dc.brush.color : undefined;
          if (color) withClip(ctx, dc.clip, () => { ctx.fillStyle = color; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); });
        }
        break;
      }
      case 0x0940: { // DIBBITBLT: rop(4), ySrc, xSrc, height, width, yDst, xDst, DIB
        const rop = u32(p);
        const ys = i16(p + 4), xs = i16(p + 6), hh = i16(p + 8), ww = i16(p + 10), yd = i16(p + 12), xd = i16(p + 14);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + ww, yd + hh);
        if (size > 22) {
          const { img } = dibAt(p + 16, end);
          blitDib(ctx, img, rop, x0, y0, x1, y1, dc.clip, xs, img ? img.height - ys - hh : ys, ww, hh);
        } else {
          const r3 = (rop >>> 16) & 0xff;
          const color = r3 === 0x00 ? '#000000' : r3 === 0xff ? '#ffffff' : r3 === 0xf0 ? dc.brush.color : undefined;
          if (color) withClip(ctx, dc.clip, () => { ctx.fillStyle = color; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); });
        }
        break;
      }
      case 0x0f43: { // STRETCHDIB: rop(4), usage, srcH, srcW, ySrc, xSrc, destH, destW, yDst, xDst, DIB
        const rop = u32(p);
        const sh = i16(p + 6), sw = i16(p + 8), ys = i16(p + 10), xs = i16(p + 12);
        const dh = i16(p + 14), dw = i16(p + 16), yd = i16(p + 18), xd = i16(p + 20);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + dw, yd + dh);
        const { img } = dibAt(p + 22, end);
        blitDib(ctx, img, rop, x0, y0, x1, y1, dc.clip, xs, img ? img.height - ys - sh : ys, sw, sh);
        break;
      }
      case 0x0d33: { // SETDIBTODEV: usage, scanCount, startScan, ySrc, xSrc, height, width, yDest, xDest, DIB
        const hh = i16(p + 10), ww = i16(p + 12), yd = i16(p + 14), xd = i16(p + 16);
        const [x0, y0] = P(xd, yd), [x1, y1] = P(xd + ww, yd + hh);
        blitDib(ctx, dibAt(p + 18, end).img, 0xcc0020, x0, y0, x1, y1, dc.clip);
        break;
      }
    }
    pos += size;
  }
}
