/**
 * PICT do QuickDraw (Mac) tocado num Canvas 2D. O PowerPoint guarda o PICT
 * como BLIP (`msofbtBlipPICT`) — gráficos do Excel/Mac, clip-art e figuras
 * coladas de apps do Mac nos .ppt antigos; o navegador não decodifica.
 *
 * Cobertura: versão 1 e 2 (cabeçalho estendido com resolução), retângulos,
 * retângulos arredondados, ovais, arcos/setores, polígonos, regiões, linhas
 * (caneta "pendurada" abaixo/à direita do ponto), texto (fonte por id/nome,
 * estilo, tamanho, Mac Roman, rotação dos comentários TextBegin/TextCenter),
 * cores RGB e clássicas, padrões (média fg/bg) e PixPat, bitmaps
 * BitsRect/PackBitsRect (1–8 bpp com tabela de cores) e DirectBitsRect
 * (16/32 bpp), recorte por retângulo. QuickTime comprimido (JPEG dentro do
 * PICT) fica de fora — não há decodificação síncrona.
 */

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Deslocamento do início do PICT: 0, ou 512 quando vem com o cabeçalho de arquivo do Mac. */
function pictStart(b: Uint8Array): number {
  if (b.length < 16) return -1;
  // o PICT não tem assinatura: recusa antes os formatos que têm (JPEG, PNG, GIF, BMP,
  // TIFF, EMF, WMF) — bytes de um JPEG no deslocamento 522 podem imitar o cabeçalho
  const sig = (b[0]! << 24 | b[1]! << 16 | b[2]! << 8 | b[3]!) >>> 0;
  if ((sig >>> 8) === 0xffd8ff || sig === 0x89504e47 || sig === 0x47494638 || (sig >>> 16) === 0x424d
    || sig === 0x49492a00 || sig === 0x4d4d002a || sig === 0x01000000 || sig === 0xd7cdc69a || sig === 0x01000900 || sig === 0x02000900 || sig === 0x52494646 || (sig >>> 24) === 0x3c) return -1;
  for (const o of [0, 512]) {
    if (b.length < o + 16) continue;
    const t = (b[o + 2]! << 8 | b[o + 3]!) << 16 >> 16, l = (b[o + 4]! << 8 | b[o + 5]!) << 16 >> 16;
    const bt = (b[o + 6]! << 8 | b[o + 7]!) << 16 >> 16, r = (b[o + 8]! << 8 | b[o + 9]!) << 16 >> 16;
    if (bt <= t || r <= l) continue; // picFrame vazio/invertido
    // v2: 0x0011 0x02FF seguido do cabeçalho 0x0C00; v1: 0x11 0x01
    if (b[o + 10] === 0x00 && b[o + 11] === 0x11 && b[o + 12] === 0x02 && b[o + 13] === 0xff && b[o + 14] === 0x0c && b[o + 15] === 0x00) return o;
    if (b[o + 10] === 0x11 && b[o + 11] === 0x01) return o;
  }
  return -1;
}

export function isPict(b: Uint8Array): boolean { return pictStart(b) >= 0; }

interface Frame { top: number; left: number; bottom: number; right: number }

/** Quadro de destino (picFrame, 72 dpi) e o retângulo das coordenadas dos opcodes. */
function pictFrames(b: Uint8Array): { frame: Frame; src: Frame; v2: boolean; body: number } | undefined {
  const s = pictStart(b);
  if (s < 0) return undefined;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const rect = (o: number): Frame => ({ top: dv.getInt16(o), left: dv.getInt16(o + 2), bottom: dv.getInt16(o + 4), right: dv.getInt16(o + 6) });
  const frame = rect(s + 2);
  if (b[s + 10] === 0x11) return { frame, src: frame, v2: false, body: s + 12 };
  let body = s + 14, src = frame;
  if (dv.getUint16(body) === 0x0c00 && body + 26 <= b.length) {
    // cabeçalho estendido (versão −2): resolução + retângulo de origem nativo
    if (dv.getInt16(body + 2) === -2) {
      const r = rect(body + 2 + 16);
      if (r.right > r.left && r.bottom > r.top) src = r;
    }
    body += 26;
  }
  return { frame, src, v2: true, body };
}

/** Tamanho natural (px a 96 dpi): o picFrame está em pontos (72 dpi). */
export function pictSize(b: Uint8Array): { w: number; h: number } | undefined {
  const f = pictFrames(b)?.frame;
  if (!f) return undefined;
  const w = f.right - f.left, h = f.bottom - f.top;
  return w > 0 && h > 0 ? { w: (w * 96) / 72, h: (h * 96) / 72 } : undefined;
}

/** Mac Roman 0x80–0xFF. */
const MAC_ROMAN = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
function macRoman(bytes: Uint8Array): string {
  let s = '';
  for (const c of bytes) s += c < 0x80 ? String.fromCharCode(c) : MAC_ROMAN[c - 0x80] ?? '?';
  return s;
}

/** Fontes clássicas do Mac por id e equivalentes no Windows (o que o app usa ao abrir). */
const MAC_FONT_ID: Record<number, string> = { 0: 'Chicago', 1: 'Geneva', 2: 'New York', 3: 'Geneva', 4: 'Monaco', 20: 'Times', 21: 'Helvetica', 22: 'Courier', 23: 'Symbol' };
const MAC_TO_WIN: Record<string, string> = {
  chicago: 'Arial', geneva: 'Arial', helvetica: 'Arial', 'new york': 'Times New Roman', times: 'Times New Roman',
  courier: 'Courier New', monaco: 'Courier New', palatino: 'Book Antiqua', 'avant garde': 'Century Gothic',
  bookman: 'Bookman Old Style', 'new century schlbk': 'Century Schoolbook', 'zapf chancery': 'Monotype Corsiva',
};

/** Cores clássicas do QuickDraw (FgColor/BkColor antigos). */
const OLD_COLORS: Record<number, [number, number, number]> = {
  33: [0, 0, 0], 30: [255, 255, 255], 205: [255, 0, 0], 341: [0, 255, 0], 409: [0, 0, 255],
  273: [0, 255, 255], 137: [255, 0, 255], 69: [255, 255, 0],
};

type RGB = [number, number, number];
const css = (c: RGB): string => `rgb(${c[0]},${c[1]},${c[2]})`;

interface State {
  fg: RGB; bk: RGB;
  pnPat: number; fillPat: number; bkPat: number; // fração de bits 1 do padrão (1 = só fg)
  pnPatColor?: RGB; fillPatColor?: RGB; bkPatColor?: RGB; // PixPat de cor
  pnW: number; pnH: number; pnMode: number;
  ovW: number; ovH: number;
  font: string; face: number; size: number; txMode: number;
  txH: number; txV: number; // origem do último texto
  pnH0: number; pnV0: number; // posição da caneta
  last: { kind: string; a: number[] } | undefined; // forma do "Same*"
  clip: Frame | undefined;
  rot: { angle: number; cx: number; cy: number } | undefined;
}

const bits = (pat: Uint8Array): number => { let n = 0; for (const v of pat) for (let k = 0; k < 8; k++) n += (v >> k) & 1; return n / 64; };
const mix = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] * t + b[0] * (1 - t)), Math.round(a[1] * t + b[1] * (1 - t)), Math.round(a[2] * t + b[2] * (1 - t))];

/** Toca o PICT no retângulo (x, y, w, h) do contexto. */
export function drawPict(ctx: Ctx, bytes: Uint8Array, x: number, y: number, w: number, h: number, onOp?: (op: number, at: number) => void): void {
  const fr = pictFrames(bytes);
  if (!fr) return;
  ctx.save();
  try { play(ctx, bytes, fr, x, y, w, h, onOp); } catch { /* truncado: fica o que foi desenhado */ } finally { ctx.restore(); }
}

/** Rasteriza o PICT num canvas novo (tamanho natural × escala, limitado como os metarquivos). */
export function rasterizePict<C extends { getContext(id: '2d'): unknown; width: number; height: number }>(
  bytes: Uint8Array, makeCanvas: (w: number, h: number) => C | undefined,
): C | undefined {
  const nat = pictSize(bytes);
  if (!nat) return undefined;
  let k = 2;
  const big = Math.max(nat.w, nat.h) * k;
  if (big > 2400) k *= 2400 / big; else if (big < 600) k *= 600 / Math.max(1, big);
  const w = Math.max(1, Math.round(nat.w * k)), h = Math.max(1, Math.round(nat.h * k));
  const cv = makeCanvas(w, h);
  const ctx = cv?.getContext('2d') as Ctx | null | undefined;
  if (!cv || !ctx) return undefined;
  drawPict(ctx, bytes, 0, 0, w, h);
  return cv;
}

function play(ctx: Ctx, b: Uint8Array, fr: NonNullable<ReturnType<typeof pictFrames>>, ox: number, oy: number, ow: number, oh: number, onOp?: (op: number, at: number) => void): void {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const { src, v2 } = fr;
  const sx = ow / (src.right - src.left), sy = oh / (src.bottom - src.top);
  let orgH = 0, orgV = 0;
  const X = (hh: number): number => ox + (hh + orgH - src.left) * sx;
  const Y = (vv: number): number => oy + (vv + orgV - src.top) * sy;
  const st: State = {
    fg: [0, 0, 0], bk: [255, 255, 255], pnPat: 1, fillPat: 1, bkPat: 0, pnW: 1, pnH: 1, pnMode: 8,
    ovW: 0, ovH: 0, font: 'Arial', face: 0, size: 12, txMode: 1, txH: 0, txV: 0, pnH0: 0, pnV0: 0,
    last: undefined, clip: undefined, rot: undefined,
  };
  const fontIds = new Map<number, string>();
  const i16 = (o: number): number => dv.getInt16(o), u16 = (o: number): number => dv.getUint16(o);
  const rect = (o: number): number[] => [i16(o), i16(o + 2), i16(o + 4), i16(o + 6)]; // t l b r
  const rgb = (o: number): RGB => [b[o]!, b[o + 2]!, b[o + 4]!];

  const penColor = (): string => css(st.pnPatColor ?? mix(st.fg, st.bk, st.pnPat));
  const colorFor = (verb: number): string | undefined => {
    // 0 frame, 1 paint, 2 erase, 3 invert, 4 fill
    if (verb === 0 || verb === 1) return penColor();
    if (verb === 2) return css(st.bkPatColor ?? mix(st.fg, st.bk, st.bkPat));
    if (verb === 4) return css(st.fillPatColor ?? mix(st.fg, st.bk, st.fillPat));
    return undefined; // inverter: ignorado
  };
  const withClip = (f: () => void, noClip = false): void => {
    ctx.save();
    if (st.clip && !noClip) { ctx.beginPath(); ctx.rect(X(st.clip.left), Y(st.clip.top), (st.clip.right - st.clip.left) * sx, (st.clip.bottom - st.clip.top) * sy); ctx.clip(); }
    f();
    ctx.restore();
  };
  // modos de caneta: patBic/srcBic apagam (cor de fundo), Xor ignorado
  const penSkip = (): boolean => st.pnMode === 10 || st.pnMode === 2 || st.pnMode === 14 || st.pnMode === 6;

  /** Forma geométrica: traça o caminho (em unidades do PICT). */
  const shape = (verb: number, kind: string, a: number[]): void => {
    if (verb === 3) return;
    const color = colorFor(verb);
    if (!color) return;
    if (verb <= 1 && penSkip()) return;
    const [t, l, bt, r] = a as [number, number, number, number];
    const trace = (inset: number, insetV: number): void => {
      ctx.beginPath();
      const L = X(l) + inset, T = Y(t) + insetV, R = X(r) - inset, B = Y(bt) - insetV;
      if (kind === 'rect') ctx.rect(L, T, R - L, B - T);
      else if (kind === 'rrect') {
        const rx = Math.min((st.ovW * sx) / 2, (R - L) / 2), ry = Math.min((st.ovH * sy) / 2, (B - T) / 2);
        ctx.moveTo(L + rx, T); ctx.lineTo(R - rx, T); ctx.ellipse(R - rx, T + ry, rx, ry, 0, -Math.PI / 2, 0);
        ctx.lineTo(R, B - ry); ctx.ellipse(R - rx, B - ry, rx, ry, 0, 0, Math.PI / 2);
        ctx.lineTo(L + rx, B); ctx.ellipse(L + rx, B - ry, rx, ry, 0, Math.PI / 2, Math.PI);
        ctx.lineTo(L, T + ry); ctx.ellipse(L + rx, T + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
        ctx.closePath();
      } else if (kind === 'oval') ctx.ellipse((L + R) / 2, (T + B) / 2, Math.max(0, (R - L) / 2), Math.max(0, (B - T) / 2), 0, 0, Math.PI * 2);
      else if (kind === 'arc') {
        // ângulos do QuickDraw: 0° = 12 h, sentido horário
        const s0 = ((a[4]! - 90) * Math.PI) / 180, s1 = ((a[4]! + a[5]! - 90) * Math.PI) / 180;
        const cx = (L + R) / 2, cy = (T + B) / 2;
        if (verb !== 0) ctx.moveTo(cx, cy);
        ctx.ellipse(cx, cy, Math.max(0, (R - L) / 2), Math.max(0, (B - T) / 2), 0, s0, s1, a[5]! < 0);
        if (verb !== 0) ctx.closePath();
      }
    };
    withClip(() => {
      if (verb === 0) {
        // moldura: a caneta fica DENTRO do contorno
        const pw = st.pnW * sx, ph = st.pnH * sy;
        if (pw <= 0 || ph <= 0) return;
        ctx.strokeStyle = color; ctx.lineWidth = Math.min(pw, ph);
        trace(pw / 2, ph / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        trace(0, 0);
        ctx.fill();
      }
    });
  };

  const poly = (verb: number, pts: number[][]): void => {
    if (verb === 3 || pts.length < 2) return;
    const color = colorFor(verb);
    if (!color || (verb <= 1 && penSkip())) return;
    withClip(() => {
      if (verb === 0) {
        // polilinha: a caneta pendurada desloca meia espessura para baixo/direita
        const pw = st.pnW * sx, ph = st.pnH * sy;
        if (pw <= 0 || ph <= 0) return;
        ctx.strokeStyle = color; ctx.lineWidth = Math.min(pw, ph); ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
        ctx.beginPath();
        pts.forEach(([v, hh], k) => { const px = X(hh!) + pw / 2, py = Y(v!) + ph / 2; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        pts.forEach(([v, hh], k) => { if (k) ctx.lineTo(X(hh!), Y(v!)); else ctx.moveTo(X(hh!), Y(v!)); });
        ctx.closePath(); ctx.fill();
      }
    });
  };

  const line = (h1: number, v1: number, h2: number, v2_: number): void => {
    st.pnH0 = h2; st.pnV0 = v2_;
    if (penSkip() || st.pnW <= 0 || st.pnH <= 0) return;
    const pw = st.pnW * sx, ph = st.pnH * sy;
    withClip(() => {
      ctx.fillStyle = penColor();
      // a caneta (retângulo pw×ph) arrastada de um ponto a outro: hexágono convexo
      const ax = X(h1), ay = Y(v1), bx = X(h2), by = Y(v2_);
      if (ax === bx || ay === by) { ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + pw, Math.abs(by - ay) + ph); return; }
      ctx.beginPath();
      if ((bx - ax) * (by - ay) > 0) {
        const [x0, y0, x1, y1] = ax < bx ? [ax, ay, bx, by] : [bx, by, ax, ay];
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + pw, y0); ctx.lineTo(x1 + pw, y1); ctx.lineTo(x1 + pw, y1 + ph); ctx.lineTo(x1, y1 + ph); ctx.lineTo(x0, y0 + ph);
      } else {
        const [x0, y0, x1, y1] = ax < bx ? [ax, ay, bx, by] : [bx, by, ax, ay];
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 + pw, y1); ctx.lineTo(x1 + pw, y1 + ph); ctx.lineTo(x0 + pw, y0 + ph); ctx.lineTo(x0, y0 + ph);
      }
      ctx.closePath(); ctx.fill();
    });
  };

  const text = (str: string): void => {
    if (!str) return;
    const name = st.font;
    const fam = MAC_TO_WIN[name.toLowerCase()] ?? name;
    const sizePx = st.size * sy;
    if (sizePx <= 0) return;
    withClip(() => {
      ctx.font = `${st.face & 2 ? 'italic ' : ''}${st.face & 1 ? 'bold ' : ''}${sizePx}px "${fam}"`;
      ctx.fillStyle = css(st.fg);
      ctx.textBaseline = 'alphabetic';
      const px = X(st.txH), py = Y(st.txV);
      if (st.rot && st.rot.angle) {
        // TextBegin/TextCenter: gira em volta do centro (deslocamento da origem do texto)
        const cx = px + st.rot.cx * sx, cy = py + st.rot.cy * sy;
        ctx.translate(cx, cy); ctx.rotate((st.rot.angle * Math.PI) / 180); ctx.translate(-cx, -cy);
      }
      ctx.fillText(str, px, py);
      if (st.face & 4) { const tw = ctx.measureText(str).width; ctx.fillRect(px, py + sizePx * 0.1, tw, Math.max(1, sizePx / 14)); }
    // texto girado (TextBegin com ângulo): o app grava um recorte VAZIO para o QuickDraw
    // não desenhar a versão sem giro — quem entende o comentário desenha girado sem recorte
    }, !!(st.rot && st.rot.angle));
  };

  // ── região: só o retângulo envolvente (o recorte e o desenho usam o retângulo) ──
  const regionAt = (o: number): { size: number; r: number[] } => ({ size: u16(o), r: rect(o + 2) });

  // ── bitmaps ──
  const bitmap = (o: number, op: number): number => {
    let p = o;
    if (op === 0x9a || op === 0x9b) p += 4; // baseAddr
    const rowBytesRaw = u16(p);
    const isPix = (rowBytesRaw & 0x8000) !== 0 || op === 0x9a || op === 0x9b;
    const rowBytes = rowBytesRaw & 0x3fff;
    const bnd = rect(p + 2);
    p += 10;
    let pixelSize = 1, cmpCount = 1, packType = 0;
    let ctab: RGB[] | undefined;
    if (isPix) {
      packType = u16(p + 2);
      pixelSize = u16(p + 18); cmpCount = u16(p + 20);
      p += 36;
      if (op !== 0x9a && op !== 0x9b) {
        // ColorTable: seed(4) flags(2) size(2) e (size+1) × (valor, r, g, b)
        const n = u16(p + 6) + 1, flags = u16(p + 4);
        ctab = new Array(256).fill([0, 0, 0]);
        for (let k = 0; k < n; k++) {
          const e = p + 8 + k * 8;
          const idx = flags & 0x8000 ? k : u16(e) & 0xff;
          ctab[idx] = [b[e + 2]!, b[e + 4]!, b[e + 6]!];
        }
        p += 8 + n * 8;
      }
    }
    const srcR = rect(p), dstR = rect(p + 8);
    const mode = u16(p + 16);
    p += 18;
    if (op === 0x91 || op === 0x99 || op === 0x9b) p += u16(p); // máscara (região)
    const bw = bnd[3]! - bnd[1]!, bh = bnd[2]! - bnd[0]!;
    if (bw <= 0 || bh <= 0) return p; // bitmap vazio (apps gravam um antes do texto girado)
    if (bw > 16384 || bh > 16384) throw new Error('bitmap inválido');
    // linhas
    const rows: Uint8Array[] = [];
    const rb = rowBytes || Math.ceil((bw * pixelSize) / 8);
    // BitsRect/BitsRgn (0x90/0x91) nunca vêm compactados; os Pack*/Direct* só com rowBytes ≥ 8
    const packed = op !== 0x90 && op !== 0x91 && rb >= 8 && packType !== 1 && !(pixelSize === 32 && packType === 2);
    for (let yy = 0; yy < bh; yy++) {
      if (!packed) {
        const n = pixelSize === 32 && packType === 2 ? bw * 3 : rb;
        rows.push(b.subarray(p, p + n)); p += n;
        continue;
      }
      const cnt = rb > 250 ? u16(p) : b[p]!;
      p += rb > 250 ? 2 : 1;
      const end = p + cnt;
      const word = pixelSize === 16 && packType === 3;
      const unit = word ? 2 : 1;
      const out = new Uint8Array(pixelSize === 32 && packType === 4 ? bw * cmpCount : rb);
      let q = 0;
      while (p < end && q < out.length) {
        const c = (b[p]! << 24) >> 24; p++;
        if (c >= 0) { const n = (c + 1) * unit; out.set(b.subarray(p, p + n).subarray(0, out.length - q), q); q += n; p += n; }
        else if (c !== -128) { const n = 1 - c; for (let k = 0; k < n; k++) for (let u = 0; u < unit; u++) if (q < out.length) out[q++] = b[p + u]!; p += unit; }
      }
      p = end;
      rows.push(out);
    }
    // pixels → ImageData
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bw, bh) : undefined;
    const c2 = cv?.getContext('2d');
    if (cv && c2) {
      const id = c2.createImageData(bw, bh);
      const d = id.data;
      for (let yy = 0; yy < bh; yy++) {
        const row = rows[yy]!;
        for (let xx = 0; xx < bw; xx++) {
          let c: RGB;
          if (pixelSize === 32) {
            if (packType === 4) c = cmpCount === 4 ? [row[bw + xx]!, row[2 * bw + xx]!, row[3 * bw + xx]!] : [row[xx]!, row[bw + xx]!, row[2 * bw + xx]!];
            else if (packType === 2) c = [row[xx * 3]!, row[xx * 3 + 1]!, row[xx * 3 + 2]!];
            else c = [row[xx * 4 + 1]!, row[xx * 4 + 2]!, row[xx * 4 + 3]!];
          } else if (pixelSize === 16) {
            const v = (row[xx * 2]! << 8) | row[xx * 2 + 1]!;
            c = [((v >> 10) & 31) * 255 / 31 | 0, ((v >> 5) & 31) * 255 / 31 | 0, (v & 31) * 255 / 31 | 0];
          } else {
            const bitPos = xx * pixelSize;
            const v = (row[bitPos >> 3]! >> (8 - pixelSize - (bitPos & 7))) & ((1 << pixelSize) - 1);
            c = ctab ? ctab[v]! : v ? st.fg : st.bk; // 1 bpp sem tabela: 1 = frente
          }
          const j = (yy * bw + xx) * 4;
          d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
          // srcOr/transparente em 1 bpp: o 0 (fundo) não pinta
          if (!ctab && pixelSize === 1 && (mode & 0x3f) !== 0 && !((row[xx >> 3]! >> (7 - (xx & 7))) & 1)) d[j + 3] = 0;
        }
      }
      c2.putImageData(id, 0, 0);
      const s = srcR, t = dstR;
      withClip(() => {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(cv as CanvasImageSource, s[1]! - bnd[1]!, s[0]! - bnd[0]!, s[3]! - s[1]!, s[2]! - s[0]!, X(t[1]!), Y(t[0]!), (t[3]! - t[1]!) * sx, (t[2]! - t[0]!) * sy);
      });
    }
    return p;
  };

  let p = fr.body;
  const end = b.length;
  for (let guard = 0; p + (v2 ? 2 : 1) <= end && guard < 2_000_000; guard++) {
    if (v2 && (p - fr.body) & 1) p++;
    const op = v2 ? u16(p) : b[p]!;
    onOp?.(op, p);
    p += v2 ? 2 : 1;
    if (op === 0xff) break;
    const verb = op & 7;
    if (op >= 0x30 && op <= 0x37) { const a = rect(p); st.last = { kind: 'rect', a }; shape(verb, 'rect', a); p += 8; continue; }
    if (op >= 0x38 && op <= 0x3f) { if (st.last) shape(verb, 'rect', st.last.a); continue; }
    if (op >= 0x40 && op <= 0x47) { const a = rect(p); st.last = { kind: 'rrect', a }; shape(verb, 'rrect', a); p += 8; continue; }
    if (op >= 0x48 && op <= 0x4f) { if (st.last) shape(verb, 'rrect', st.last.a); continue; }
    if (op >= 0x50 && op <= 0x57) { const a = rect(p); st.last = { kind: 'oval', a }; shape(verb, 'oval', a); p += 8; continue; }
    if (op >= 0x58 && op <= 0x5f) { if (st.last) shape(verb, 'oval', st.last.a); continue; }
    if (op >= 0x60 && op <= 0x67) { const a = [...rect(p), i16(p + 8), i16(p + 10)]; st.last = { kind: 'arc', a: a.slice(0, 4) }; shape(verb, 'arc', a); p += 12; continue; }
    if (op >= 0x68 && op <= 0x6f) { if (st.last) shape(verb, 'arc', [...st.last.a.slice(0, 4), i16(p), i16(p + 2)]); p += 4; continue; }
    if (op >= 0x70 && op <= 0x77) {
      const size = u16(p), n = (size - 10) >> 2, pts: number[][] = [];
      for (let k = 0; k < n; k++) pts.push([i16(p + 10 + k * 4), i16(p + 12 + k * 4)]);
      poly(verb, pts); p += size; continue;
    }
    if (op >= 0x78 && op <= 0x7f) continue;
    if (op >= 0x80 && op <= 0x87) { const rg = regionAt(p); shape(verb, 'rect', rg.r); p += rg.size; continue; }
    if (op >= 0x88 && op <= 0x8f) continue;
    switch (op) {
      case 0x00: break;
      case 0x01: { const rg = regionAt(p); st.clip = { top: rg.r[0]!, left: rg.r[1]!, bottom: rg.r[2]!, right: rg.r[3]! }; p += rg.size; break; }
      case 0x02: st.bkPat = bits(b.subarray(p, p + 8)); st.bkPatColor = undefined; p += 8; break;
      case 0x03: st.font = fontIds.get(u16(p)) ?? MAC_FONT_ID[u16(p)] ?? 'Helvetica'; p += 2; break;
      case 0x04: st.face = b[p]!; p += 1; break;
      case 0x05: st.txMode = u16(p); p += 2; break;
      case 0x06: p += 4; break;
      case 0x07: st.pnH = i16(p); st.pnW = i16(p + 2); p += 4; break;
      case 0x08: st.pnMode = u16(p); p += 2; break;
      case 0x09: st.pnPat = bits(b.subarray(p, p + 8)); st.pnPatColor = undefined; p += 8; break;
      case 0x0a: st.fillPat = bits(b.subarray(p, p + 8)); st.fillPatColor = undefined; p += 8; break;
      case 0x0b: st.ovH = i16(p); st.ovW = i16(p + 2); p += 4; break;
      case 0x0c: orgH -= i16(p + 2); orgV -= i16(p); p += 4; break;
      case 0x0d: st.size = u16(p); p += 2; break;
      case 0x0e: st.fg = OLD_COLORS[dv.getUint32(p)] ?? st.fg; p += 4; break;
      case 0x0f: st.bk = OLD_COLORS[dv.getUint32(p)] ?? st.bk; p += 4; break;
      case 0x10: p += 8; break;
      case 0x11: p += 1; break;
      case 0x12: case 0x13: case 0x14: {
        // PixPat: tipo 1 (mapa de pixels) → cor média; tipo 2 (RGB pontilhado) → a cor
        const type = u16(p);
        let q = p + 10, color: RGB | undefined;
        if (type === 2) { color = rgb(q); q += 6; }
        else if (type === 1) {
          const rb = u16(q) & 0x3fff, bd = rect(q + 2);
          const pixelSize = u16(q + 28);
          q += 46;
          const n = u16(q + 6) + 1, tab: RGB[] = [];
          for (let k = 0; k < n; k++) tab.push(rgb(q + 8 + k * 8 + 2));
          q += 8 + n * 8;
          const hgt = bd[2]! - bd[0]!;
          // dados: linhas não compactadas se rb < 8, senão PackBits
          let sum = [0, 0, 0], cnt = 0;
          for (let r = 0; r < hgt; r++) {
            let row: Uint8Array;
            if (rb < 8) { row = b.subarray(q, q + rb); q += rb; }
            else {
              const c = rb > 250 ? u16(q) : b[q]!; q += rb > 250 ? 2 : 1;
              const out = new Uint8Array(rb); let o = 0, s = q; const e = q + c;
              while (s < e && o < rb) { const k = (b[s]! << 24) >> 24; s++; if (k >= 0) { out.set(b.subarray(s, s + k + 1).subarray(0, rb - o), o); o += k + 1; s += k + 1; } else if (k !== -128) { out.fill(b[s]!, o, Math.min(rb, o + 1 - k)); o += 1 - k; s++; } }
              row = out; q = e;
            }
            for (let bi = 0; bi < row.length * 8 / pixelSize; bi++) {
              const bp = bi * pixelSize, v = (row[bp >> 3]! >> (8 - pixelSize - (bp & 7))) & ((1 << pixelSize) - 1);
              const c = tab[v]; if (c) { sum = [sum[0]! + c[0], sum[1]! + c[1], sum[2]! + c[2]]; cnt++; }
            }
          }
          if (cnt) color = [Math.round(sum[0]! / cnt), Math.round(sum[1]! / cnt), Math.round(sum[2]! / cnt)];
        }
        const f = bits(b.subarray(p + 2, p + 10));
        if (op === 0x12) { st.bkPat = f; st.bkPatColor = color; }
        else if (op === 0x13) { st.pnPat = f; st.pnPatColor = color; }
        else { st.fillPat = f; st.fillPatColor = color; }
        p = q; break;
      }
      case 0x15: case 0x16: p += 2; break;
      case 0x17: case 0x18: case 0x19: break;
      case 0x1a: st.fg = rgb(p); st.pnPatColor = undefined; p += 6; break;
      case 0x1b: st.bk = rgb(p); p += 6; break;
      case 0x1c: break;
      case 0x1d: p += 6; break;
      case 0x1e: break;
      case 0x1f: p += 6; break;
      case 0x20: line(i16(p + 2), i16(p), i16(p + 6), i16(p + 4)); p += 8; break;
      case 0x21: line(st.pnH0, st.pnV0, i16(p + 2), i16(p)); p += 4; break;
      case 0x22: { const h1 = i16(p + 2), v1 = i16(p); line(h1, v1, h1 + ((b[p + 4]! << 24) >> 24), v1 + ((b[p + 5]! << 24) >> 24)); p += 6; break; }
      case 0x23: line(st.pnH0, st.pnV0, st.pnH0 + ((b[p]! << 24) >> 24), st.pnV0 + ((b[p + 1]! << 24) >> 24)); p += 2; break;
      case 0x28: { st.txV = i16(p); st.txH = i16(p + 2); const n = b[p + 4]!; text(macRoman(b.subarray(p + 5, p + 5 + n))); p += 5 + n; break; }
      case 0x29: { st.txH += b[p]!; const n = b[p + 1]!; text(macRoman(b.subarray(p + 2, p + 2 + n))); p += 2 + n; break; }
      case 0x2a: { st.txV += b[p]!; const n = b[p + 1]!; text(macRoman(b.subarray(p + 2, p + 2 + n))); p += 2 + n; break; }
      case 0x2b: { st.txH += b[p]!; st.txV += b[p + 1]!; const n = b[p + 2]!; text(macRoman(b.subarray(p + 3, p + 3 + n))); p += 3 + n; break; }
      case 0x2c: { const len = u16(p); const id = u16(p + 2), n = b[p + 4]!; fontIds.set(id, macRoman(b.subarray(p + 5, p + 5 + n))); p += 2 + len; break; }
      case 0x90: case 0x91: case 0x98: case 0x99: case 0x9a: case 0x9b: p = bitmap(p, op); break;
      case 0xa0: if (u16(p) === 151) st.rot = undefined; p += 2; break; // TextEnd curto
      case 0xa1: {
        const kind = u16(p), size = u16(p + 2), d = p + 4;
        if (kind === 150 && size >= 6) {
          // TextBegin (TTxtPicRec): tJus u8, tFlip u8, tAngle i16 (graus, horário), tLine u8,
          // tCmnt u8 e tAngle_Fixed (Fixed) quando o registro vem completo
          const angle = i16(d + 2);
          const fixed = size >= 10 ? dv.getInt32(d + 6) / 65536 : 0;
          st.rot = { angle: fixed || angle, cx: 0, cy: 0 };
        } else if (kind === 154 && size >= 8 && st.rot) {
          st.rot.cy = dv.getInt32(d) / 65536; st.rot.cx = dv.getInt32(d + 4) / 65536;
        } else if (kind === 151) st.rot = undefined;
        p += 4 + size; break;
      }
      case 0x0c00: p += 24; break;
      default:
        if (op >= 0x24 && op <= 0x2f) { p += 2 + u16(p); break; }
        if ((op >= 0x92 && op <= 0x97) || (op >= 0x9c && op <= 0x9f) || (op >= 0xa2 && op <= 0xaf)) { p += 2 + u16(p); break; }
        if (op >= 0xb0 && op <= 0xcf) break;
        if (op >= 0xd0 && op <= 0xfe) { p += 4 + dv.getUint32(p); break; }
        if (op >= 0x100 && op <= 0x7fff) { p += (op >> 8) * 2; break; }
        if (op >= 0x8000 && op <= 0x80ff) break;
        if (op >= 0x8100) { p += 4 + dv.getUint32(p); break; }
        return; // desconhecido: para
    }
  }
}

/**
 * PICT de BLIP de .ppt cujo tamanho gravado (ptSize do cabeçalho, EMU) tem
 * proporção diferente do picFrame: o app desenha o PICT com a escala
 * HORIZONTAL nos dois eixos, ancorado no topo, e corta o que passa da altura
 * (medido: gd-033296, gráfico do Excel/Mac 501×281 em 750×394,5 pt). Devolve
 * uma cópia com o quadro (e o retângulo de origem do cabeçalho v2) encurtado.
 */
export function fitPictFrame(b: Uint8Array, ptW: number, ptH: number): Uint8Array {
  const fr = pictFrames(b);
  if (!fr || ptW <= 0 || ptH <= 0) return b;
  const fw = fr.frame.right - fr.frame.left, fh = fr.frame.bottom - fr.frame.top;
  if (fw <= 0 || fh <= 0) return b;
  const want = (fw * ptH) / ptW;
  if (Math.abs(want / fh - 1) < 0.01) return b;
  const out = b.slice();
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const s = pictStart(b);
  dv.setInt16(s + 6, Math.round(fr.frame.top + want));
  if (fr.src !== fr.frame) {
    // srcRect do cabeçalho estendido (offset fixo depois de 0x0011 0x02FF 0x0C00 + versão/reservado/resolução)
    const sw = fr.src.right - fr.src.left;
    dv.setInt16(s + 14 + 2 + 16 + 4, Math.round(fr.src.top + (sw * ptH) / ptW));
  }
  return out;
}
