/**
 * Efeitos de preenchimento da Cor da Página (w:background + v:fill) como o
 * Word DESENHA — medido em write/tools/page-lab (page-oracle3/4/7, tile-field.py,
 * screen-probe.ps1 por PrintWindow):
 *
 *  - tudo é LADRILHO ancorado no canto superior esquerdo da página, em "pixels de
 *    dispositivo": na tela 1 px (igual em qualquer zoom), no PDF 0,12 pt para
 *    gradiente e imagem e 1 pt para o padrão; a textura fica no tamanho NATURAL
 *    (DPI da imagem), acompanhando o zoom;
 *  - gradiente: ladrilho de 1024×768 px (o:targetscreensize), com o v:fill
 *    aplicado de forma ESPELHADA (fórmulas abaixo); no PDF o "do canto" é um
 *    quadrante de 512×384 px sem espelho;
 *  - mistura: duas cores → curva em S (normal acumulada σ=0,25) em gama 2,2 (a de
 *    gradientSamples); paradas `colors` → linear em sRGB;
 *  - imagem ("frame"): px da imagem × px de dispositivo; padrão: 8×8 bits.
 */
import { resolveColor2, type InlineImage, type PageBackground } from '@universal-office/docx-core';
import { gradientSamples } from './geometry.js';
import { decodeGif, decodePng, jpegInfo } from './images.js';

/** O efeito do w:background resolvido (cor 1 = fillcolor, ou a cor da página já resolvida). */
export function resolvePageFill(bg: PageBackground, pageColor: string | undefined): PageFillPaint | undefined {
  const f = bg.fill;
  if (!f) return undefined;
  const c1 = (f.color ?? pageColor ?? 'FFFFFF').toUpperCase();
  const out: PageFillPaint = {
    type: f.type, c1, c2: resolveColor2(f.color2, c1), angle: f.angle ?? 0, focus: f.focus ?? 0,
    ...(f.colors?.length ? { stops: f.colors } : {}),
    ...(f.focusPosition ? { focusPosition: f.focusPosition } : {}),
    ...(f.gradientCenter ? { gradientCenter: true } : {}),
  };
  if (f.image) {
    const info = imagePixelInfo(f.image.data);
    out.image = { data: f.image.data, ext: f.image.ext, widthTwips: info ? (info.w * 1440) / info.dpi : 1440, heightTwips: info ? (info.h * 1440) / info.dpi : 1440 } as InlineImage;
    if (info) out.imagePx = info;
    if (f.type === 'pattern') { const rows = patternRowsFromImage(f.image.data); if (rows) out.pattern = rows; }
  }
  if (f.type === 'pattern' && !out.pattern) return undefined;
  if ((f.type === 'frame' || f.type === 'tile') && !out.imagePx) return undefined;
  return out;
}

/** Efeito resolvido para pintar (cores já em RRGGBB). */
export interface PageFillPaint {
  type: 'gradient' | 'gradientRadial' | 'pattern' | 'frame' | 'tile';
  c1: string;
  c2: string;
  stops?: { pos: number; color: string }[];
  angle: number;
  focus: number;
  focusPosition?: [number, number];
  gradientCenter?: boolean;
  /** imagem do efeito (padrão: o GIF; imagem/textura: o arquivo) */
  image?: InlineImage;
  /** tamanho em px e DPI da imagem (imagem/textura) */
  imagePx?: { w: number; h: number; dpi: number };
  /** padrão: 8 linhas (bit 7 = coluna 0; 1 = cor de frente c1) */
  pattern?: number[];
}

const tri = (q: number): number => 1 - Math.abs(1 - 2 * q);
const fract = (v: number): number => v - Math.floor(v);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.5;

/**
 * Fração da cor 2 (0..1) no ponto (x, y) do ladrilho, com x, y ∈ [0, 1]
 * (`pdfCorner`: o quadrante sem espelho do PDF). Regras por estilo/foco medidas
 * nos ladrilhos que o Word grava (page-oracle7, tile-field.py).
 */
export function fillParam(f: PageFillPaint, x: number, y: number, pdfCorner = false): number {
  const fo = f.focus;
  if (f.type === 'gradientRadial') {
    if (f.gradientCenter) {
      const qx = pdfCorner ? x : tri(x), qy = pdfCorner ? y : tri(y);
      const [fx, fy] = f.focusPosition ?? [0, 0];
      const p = Math.max(Math.abs(qx - fx), Math.abs(qy - fy));
      return fo > 0 ? p : 1 - p;
    }
    const [fx, fy] = f.focusPosition ?? [0.5, 0.5];
    const p = Math.min(1, Math.max(Math.abs(x - fx) / Math.max(fx, 1 - fx, 1e-6), Math.abs(y - fy) / Math.max(fy, 1 - fy, 1e-6)));
    return fo > 0 ? p : 1 - p;
  }
  let a = ((f.angle % 360) + 360) % 360;
  if (a > 180) a -= 360; // −180..180
  if (near(a, 0) || near(Math.abs(a), 180)) return fo > 0 ? tri(y) : 1 - tri(y);
  // vertical: o ±50% tem o sinal trocado em relação ao horizontal (tl-2-3/2-4)
  if (near(Math.abs(a), 90)) return fo >= 75 || fo < 0 ? tri(x) : 1 - tri(x);
  if (near(a, -135) || near(a, 45)) {
    const q = (x + y) / 2;
    if (fo >= 75) return tri(q);
    if (fo > 0) return 1 - tri(fract(2 * q));
    if (fo < 0) return tri(fract(2 * q));
    return 1 - tri(q);
  }
  if (near(a, -45) || near(a, 135)) {
    const v = x - y;
    const base = 1 - Math.abs((((v + 1.5) % 2) + 2) % 2 - 1);
    if (fo >= 75) return 1 - base;
    if (fo > 0) return tri(fract(v));
    if (fo < 0) return 1 - tri(fract(v));
    return base;
  }
  // outros ângulos (arquivos de outros programas): projeção na direção, espelhada
  const r = (a * Math.PI) / 180;
  const dx = -Math.sin(r), dy = Math.cos(r);
  const lo = Math.min(0, dx) + Math.min(0, dy), hi = Math.max(0, dx) + Math.max(0, dy);
  const q = hi > lo ? (x * dx + y * dy - lo) / (hi - lo) : 0;
  return fo > 0 ? tri(q) : 1 - tri(q);
}

/** Rampa de cores (n amostras RGB) do gradiente. */
function ramp(f: PageFillPaint, n: number): Uint8Array {
  const stops = f.stops?.length ? f.stops : [{ pos: 0, color: f.c1 }, { pos: 1, color: f.c2 }];
  return gradientSamples(stops, n);
}

/** Tamanho do ladrilho do gradiente em px de dispositivo (o do canto no PDF é a metade). */
export function gradientTilePx(f: PageFillPaint, pdf: boolean): { w: number; h: number } {
  return pdf && f.type === 'gradientRadial' && f.gradientCenter ? { w: 512, h: 384 } : { w: 1024, h: 768 };
}

/** Ladrilho RGBA do gradiente em w×h pixels (amostrando o campo de 1024×768). */
export function gradientTileRgba(f: PageFillPaint, w: number, h: number, pdf = false): Uint8Array {
  const N = 1024;
  const lut = ramp(f, N);
  const out = new Uint8Array(w * h * 4);
  const corner = pdf && f.type === 'gradientRadial' && !!f.gradientCenter;
  for (let j = 0; j < h; j++) {
    const y = h > 1 ? j / (h - 1) : 0;
    for (let i = 0; i < w; i++) {
      const x = w > 1 ? i / (w - 1) : 0;
      const k = Math.max(0, Math.min(N - 1, Math.round(fillParam(f, x, y, corner) * (N - 1)))) * 3;
      const o = (j * w + i) * 4;
      out[o] = lut[k]!; out[o + 1] = lut[k + 1]!; out[o + 2] = lut[k + 2]!; out[o + 3] = 255;
    }
  }
  return out;
}

/** Padrão 8×8 em RGBA (c1 onde o bit é 1). */
export function patternRgba(f: PageFillPaint): Uint8Array {
  const out = new Uint8Array(64 * 4);
  const fg = hexRgb(f.c1), bg = hexRgb(f.c2);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const on = ((f.pattern?.[y] ?? 0) >> (7 - x)) & 1;
      const c = on ? fg : bg;
      const o = (y * 8 + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  return out;
}

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];

/**
 * Tamanho de UM ladrilho em twips para o alvo. `devicePxTw` = twips por pixel de
 * dispositivo (tela: 15/zoom; PDF: 2,4 = 0,12 pt); `patternPxTw` = o do padrão
 * (tela: o mesmo; PDF: 20 = 1 pt).
 */
export function pageFillTileTw(f: PageFillPaint, devicePxTw: number, patternPxTw: number, pdf = false): { w: number; h: number } | null {
  if (f.type === 'gradient' || f.type === 'gradientRadial') {
    const t = gradientTilePx(f, pdf);
    return { w: t.w * devicePxTw, h: t.h * devicePxTw };
  }
  if (f.type === 'pattern') return f.pattern ? { w: 8 * patternPxTw, h: 8 * patternPxTw } : null;
  const px = f.imagePx;
  if (!px || px.w <= 0 || px.h <= 0) return null;
  if (f.type === 'frame') return { w: px.w * devicePxTw, h: px.h * devicePxTw };
  const dpi = px.dpi > 0 ? px.dpi : 96;
  return { w: (px.w * 1440) / dpi, h: (px.h * 1440) / dpi };
}

/** Tamanho em px e DPI de uma imagem (PNG/JPEG/GIF/BMP; DPI 96 se não declarado). */
export function imagePixelInfo(b: Uint8Array): { w: number; h: number; dpi: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) {
    const w = (b[16]! << 24 | b[17]! << 16 | b[18]! << 8 | b[19]!) >>> 0, h = (b[20]! << 24 | b[21]! << 16 | b[22]! << 8 | b[23]!) >>> 0;
    let dpi = 96;
    for (let i = 8; i + 8 < b.length;) {
      const len = (b[i]! << 24 | b[i + 1]! << 16 | b[i + 2]! << 8 | b[i + 3]!) >>> 0;
      const type = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
      if (type === 'pHYs' && b[i + 16] === 1) dpi = Math.round((((b[i + 8]! << 24 | b[i + 9]! << 16 | b[i + 10]! << 8 | b[i + 11]!) >>> 0) * 0.0254));
      if (type === 'IDAT' || type === 'IEND') break;
      i += 12 + len;
    }
    return { w, h, dpi };
  }
  const jp = jpegInfo(b);
  if (jp) {
    let dpi = 96;
    // JFIF APP0: unidades 1 = ppp
    if (b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[13] === 1) dpi = (b[14]! << 8) | b[15]!;
    return { w: jp.width, h: jp.height, dpi: dpi || 96 };
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { w: b[6]! | (b[7]! << 8), h: b[8]! | (b[9]! << 8), dpi: 96 };
  if (b[0] === 0x42 && b[1] === 0x4d) {
    const w = b[18]! | (b[19]! << 8) | (b[20]! << 16), h = Math.abs((b[22]! | (b[23]! << 8) | (b[24]! << 16) | (b[25]! << 24)) | 0);
    const ppm = (b[38]! | (b[39]! << 8) | (b[40]! << 16) | (b[41]! << 24)) >>> 0;
    return { w, h, dpi: ppm ? Math.round(ppm * 0.0254) : 96 };
  }
  const png = decodePng(b);
  return png ? { w: png.width, h: png.height, dpi: 96 } : null;
}

/** As 8 linhas de um GIF de padrão do Word (pixel claro = cor de frente). */
export function patternRowsFromImage(b: Uint8Array): number[] | undefined {
  const img = decodeGif(b) ?? decodePng(b);
  if (!img || img.width < 8 || img.height < 8) return undefined;
  const rows: number[] = [];
  for (let y = 0; y < 8; y++) {
    let r = 0;
    for (let x = 0; x < 8; x++) {
      const o = (y * img.width + x) * 4;
      const lum = 0.299 * img.data[o]! + 0.587 * img.data[o + 1]! + 0.114 * img.data[o + 2]!;
      if (lum >= 128) r |= 0x80 >> x;
    }
    rows.push(r);
  }
  return rows;
}
