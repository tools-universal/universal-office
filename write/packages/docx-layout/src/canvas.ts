import type { InlineImage } from '@universal-office/docx-core';
import { BORDER_DASHES } from './tree.js';
import { needsPicturePainter, paintPicture } from './canvas-picture.js';
import type { PageItem, GlyphRunItem, ShapeItem, LayoutPage, PathCmdTw } from './tree.js';
import { gradientTileRgba, gradientTilePx, pageFillTileTw, patternRgba, type PageFillPaint } from './page-fill.js';
import { OPEN_PRESETS, custPaths, gradientGeometry, gradientSamples, pathBounds, presetPath, patternRaster, blipTiles, isRectGradient, rectGradientRaster } from './geometry.js';
import { imagePixelSize } from './images.js';
import type { FontFace as EngineFontFace } from './fonts.js';

/**
 * Pintor de canvas da árvore de layout do motor — usado pelo editor
 * (<universal-write>) e pelo viewer (<universal-document-viewer>).
 * Espelha EXATAMENTE a semântica de docx-layout/src/pdf.ts (o pintor de
 * referência): glifos um a um no x/baseline do motor, retângulos com alfa,
 * linhas tracejadas, formas (rect/roundRect/elipse/linha, rotação, espelho,
 * alfa de preenchimento/contorno), caminhos, imagens (recorte, rotação,
 * espelho), recortes e transformações afins. Tudo é desenhado no espaço de
 * TWIPS (o chamador fixa a escala twip → pixel do buffer).
 */

/** O que o hospedeiro (editor/viewer) fornece ao pintor (fontes carregadas, imagens, cores). */
export interface EnginePaintEnv {
  /** família CSS (já entre aspas, com fallback) + peso/estilo da face. */
  fontOf(face: EngineFontFace): { family: string; weight: 400 | 700; italic: boolean };
  /** bitmap decodificado da imagem (null: ainda decodificando/indisponível). */
  image(img: InlineImage): CanvasImageSource | null;
  /** RRGGBB → cor CSS (o editor inverte a luminosidade no tema escuro). */
  color(hex: string): string;
}

const HEX6 = /^[0-9A-Fa-f]{6}$/;

/** Ladrilhos do fundo da página já rasterizados (gradiente 1024×768, padrão 8×8). */
const fillTiles = new Map<string, CanvasImageSource>();

function rgbaCanvas(rgba: Uint8Array, w: number, h: number): CanvasImageSource | null {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h)
    : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: w, height: h }) : null;
  const x = c?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!c || !x) return null;
  const id = x.createImageData(w, h);
  id.data.set(rgba);
  x.putImageData(id, 0, 0);
  return c as CanvasImageSource;
}

/**
 * Fundo da página (Cor da Página) no contexto JÁ em twips: a cor sólida e o efeito
 * de preenchimento em ladrilhos de "pixel de dispositivo" ancorados no canto da
 * página (page-fill.ts). Na tela (`screen`) o Word só mostra o fundo com
 * w:displayBackgroundShape; sem ele, `paper` (branco, ou o da página escura).
 * `devicePxTw` = twips por pixel CSS na escala atual (tela: 15/zoom).
 */
export function paintPageBackground(
  ctx: CanvasRenderingContext2D, page: LayoutPage, env: EnginePaintEnv,
  opts: { devicePxTw: number; screen: boolean; paper: string },
): void {
  const show = !opts.screen || !!page.backgroundShow;
  const f = show ? page.backgroundFill : undefined;
  const solid = show && page.background && !(f && (f.type === 'frame' || f.type === 'tile')) ? `#${page.background}` : f && (f.type === 'frame' || f.type === 'tile') ? '#ffffff' : opts.paper;
  ctx.fillStyle = solid;
  ctx.fillRect(0, 0, page.widthTw, page.heightTw);
  if (!f) return;
  const tile = pageFillTileTw(f, opts.devicePxTw, opts.devicePxTw);
  if (!tile) return;
  let src: CanvasImageSource | null = null;
  let srcW = 1, srcH = 1;
  if (f.type === 'gradient' || f.type === 'gradientRadial') {
    const t = gradientTilePx(f, false);
    const key = `g|${JSON.stringify([f.type, f.c1, f.c2, f.stops, f.angle, f.focus, f.focusPosition, f.gradientCenter])}`;
    src = fillTiles.get(key) ?? null;
    if (!src) { src = rgbaCanvas(gradientTileRgba(f, t.w, t.h), t.w, t.h); if (src) fillTiles.set(key, src); }
    srcW = t.w; srcH = t.h;
  } else if (f.type === 'pattern') {
    const key = `p|${f.c1}|${f.c2}|${f.pattern?.join(',')}`;
    src = fillTiles.get(key) ?? null;
    if (!src) { src = rgbaCanvas(patternRgba(f), 8, 8); if (src) fillTiles.set(key, src); }
    srcW = 8; srcH = 8;
  } else if (f.image) {
    src = env.image(f.image);
    srcW = f.imagePx?.w ?? 1; srcH = f.imagePx?.h ?? 1;
  }
  if (!src) return;
  if (fillTiles.size > 32) fillTiles.clear();
  const pat = ctx.createPattern(src, 'repeat');
  if (!pat) return;
  pat.setTransform(new DOMMatrix([tile.w / srcW, 0, 0, tile.h / srcH, 0, 0]));
  ctx.save();
  // padrão de bits: sem suavizar (como o Word, 1 bit = 1 pixel)
  if (f.type === 'pattern') ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, page.widthTw, page.heightTw);
  ctx.restore();
}
const K = 0.5523;

type Cmd =
  | { op: 'M' | 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

/**
 * Pinta `items[from, to)` no contexto (já com a escala twip → pixel aplicada).
 * `alpha` multiplica a opacidade (esmaecer cabeçalho/rodapé na tela).
 * Itens de tipo desconhecido (versões novas do motor) são ignorados.
 */
export function paintItems(
  ctx: CanvasRenderingContext2D, items: readonly PageItem[], env: EnginePaintEnv,
  opts: { from?: number; to?: number; alpha?: number } = {},
): void {
  const from = opts.from ?? 0;
  const to = Math.min(items.length, opts.to ?? items.length);
  const base = opts.alpha ?? 1;
  // pilha de save/restore dos recortes e transformações (q/Q no PDF)
  let depth = 0;
  ctx.save();
  ctx.globalAlpha = base;
  for (let i = from; i < to; i++) {
    const it = items[i]!;
    switch (it.t) {
      case 'glyphs': paintGlyphs(ctx, it, env); break;
      case 'rect': {
        if (!HEX6.test(it.fill)) break;
        // realces/sombreamentos vêm um retângulo por caractere: os contíguos
        // de mesma cor viram um só (no canvas as emendas antisserrilhadas
        // apareciam como listras)
        let w = it.w;
        while (i + 1 < to) {
          const n = items[i + 1]!;
          if (n.t !== 'rect' || n.fill !== it.fill || n.alpha !== it.alpha || n.y !== it.y || n.h !== it.h || Math.abs(n.x - (it.x + w)) > 0.5) break;
          w = n.x + n.w - it.x;
          i++;
        }
        ctx.globalAlpha = base * (it.alpha ?? 1);
        ctx.fillStyle = env.color(it.fill);
        ctx.fillRect(it.x, it.y, w, it.h);
        ctx.globalAlpha = base;
        break;
      }
      case 'line': {
        if (!HEX6.test(it.color)) break;
        const w = it.widthPt;
        const dash = it.dash === 'dotted' ? [w, w * 2] : it.dash === 'dashed' ? [w * 4, w * 3]
          : it.dash === 'dashDot' ? [w * 4, w * 2, w, w * 2] : it.dash === 'dashDotDot' ? [w * 4, w * 2, w, w * 2, w, w * 2]
          : it.dash ? BORDER_DASHES[it.dash]!(w) : [];
        let { x1, y1, x2, y2 } = it;
        let lw = w * 20;
        // ajuste de traço (como os rasterizadores de PDF e o Word na tela):
        // linha fina horizontal/vertical vai para o centro do pixel com
        // largura inteira ≥ 1 px — senão o antisserrilhado a espalha em 2 px
        // claros (bordas de tabela de 0,5 pt sumiam)
        const m = ctx.getTransform();
        if (m.b === 0 && m.c === 0) {
          const horiz = Math.abs(y1 - y2) < 0.01, vert = Math.abs(x1 - x2) < 0.01;
          const dev = lw * (horiz ? m.d : m.a);
          if ((horiz || vert) && dev < 3 && dev > 0) {
            const dw = Math.max(1, Math.round(dev));
            const snap = (v: number, s: number, o: number) => {
              const d = v * s + o;
              return ((dw % 2 ? Math.floor(d) + 0.5 : Math.round(d)) - o) / s;
            };
            if (horiz) { y1 = y2 = snap(y1, m.d, m.f); lw = dw / m.d; } else { x1 = x2 = snap(x1, m.a, m.e); lw = dw / m.a; }
          }
        }
        ctx.strokeStyle = env.color(it.color);
        ctx.lineWidth = lw;
        ctx.lineCap = 'butt';
        ctx.setLineDash(dash.map((d) => d * 20));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'image': {
        const bmp = env.image(it.image);
        if (!bmp) break;
        // Formato da Imagem (forma, contorno, efeitos, ajustes): camada composta
        if (needsPicturePainter(it)) { paintPicture(ctx, it, bmp); break; }
        let x = it.x, y = it.y, w = it.w, h = it.h;
        const crop = it.crop;
        const cropped = !!crop && !!(crop.l || crop.t || crop.r || crop.b);
        ctx.save();
        if (cropped) {
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          const fw = w / Math.max(0.01, 1 - crop!.l - crop!.r);
          const fh = h / Math.max(0.01, 1 - crop!.t - crop!.b);
          x -= crop!.l * fw; y -= crop!.t * fh; w = fw; h = fh;
        }
        if (it.rot || it.flipH || it.flipV) {
          // gira (horário) e espelha em torno do centro do retângulo da imagem
          ctx.translate(x + w / 2, y + h / 2);
          if (it.rot) ctx.rotate((it.rot * Math.PI) / 180);
          ctx.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
          ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
        } else ctx.drawImage(bmp, x, y, w, h);
        ctx.restore();
        break;
      }
      case 'shape': paintShape(ctx, it, env, base); break;
      case 'path': {
        const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : undefined;
        const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : undefined;
        if (!fill && !stroke) break;
        ctx.beginPath();
        tracePath(ctx, it.cmds as Cmd[]);
        if (fill) { ctx.fillStyle = fill; ctx.fill('nonzero'); }
        if (stroke) strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
        break;
      }
      case 'clip':
        if (it.op === 'push') {
          ctx.save();
          depth++;
          ctx.beginPath();
          ctx.rect(it.x ?? 0, it.y ?? 0, it.w ?? 0, it.h ?? 0);
          ctx.clip();
        } else if (depth > 0) { ctx.restore(); depth--; }
        break;
      default: {
        // transformação afim (texto vertical de célula): ponto' = (a·x + c·y + e, b·x + d·y + f)
        const x = it as { t: string; op?: string; m?: [number, number, number, number, number, number] };
        if (x.t !== 'xform') break;
        if (x.op === 'push' && x.m) {
          ctx.save();
          depth++;
          ctx.transform(x.m[0], x.m[1], x.m[2], x.m[3], x.m[4], x.m[5]);
        } else if (depth > 0) { ctx.restore(); depth--; }
      }
    }
  }
  while (depth-- > 0) ctx.restore();
  ctx.restore();
}

function paintGlyphs(ctx: CanvasRenderingContext2D, it: GlyphRunItem, env: EnginePaintEnv): void {
  if (!it.glyphs.length || !HEX6.test(it.color)) return;
  const f = env.fontOf(it.face);
  const font = it.face.font;
  ctx.font = `${f.italic ? 'italic ' : ''}${f.weight} ${it.sizePt * 20}px ${f.family}`;
  const color = env.color(it.color);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // negrito sintético: preenche + contorna (traço proporcional ao corpo, como o PDF)
  if (it.synthBold) {
    ctx.strokeStyle = color;
    ctx.lineWidth = (it.sizePt / 35) * 20;
    ctx.lineJoin = 'miter';
  }
  const sx = it.scaleX ?? 1;
  // itálico sintético: cisalhamento 0,21 (no PDF y cresce para cima)
  const skew = it.synthItalic ? -0.21 : 0;
  const plain = sx === 1 && skew === 0;
  const gl = it.glyphs;
  // glifos em sequência no avanço NATURAL da fonte (sem kerning) saem num só
  // fillText — mesmo x do motor, menos chamadas e sem emendas entre
  // sublinhados. ZWNJ entre eles impede ligaduras (o Word não as aplica).
  const batch = plain && 'fontKerning' in ctx;
  if (batch) ctx.fontKerning = 'none';
  const upem = font.metrics.unitsPerEm || 1000;
  const adv = (cp: number) => (font.advanceWidth(font.glyphId(cp)) * it.sizePt * 20) / upem;
  for (let i = 0; i < gl.length; i++) {
    const g = gl[i]!;
    let cp = g.cp;
    // símbolo legado (F0xx) numa fonte que mapeia em 0x00xx — mesmo critério do PDF
    if (cp >= 0xf000 && cp <= 0xf0ff && font.glyphId(cp) === 0 && font.glyphId(cp - 0xf000) !== 0) cp -= 0xf000;
    let ch = String.fromCodePoint(cp);
    if (batch && batchable(cp)) {
      while (i + 1 < gl.length) {
        const n = gl[i + 1]!;
        const prev = gl[i]!;
        if (!batchable(n.cp) || Math.abs(n.x - (prev.x + adv(prev.cp))) > 0.25) break;
        ch += '\u200C' + String.fromCodePoint(n.cp);
        i++;
      }
    }
    if (plain) {
      ctx.fillText(ch, g.x, it.y);
      if (it.synthBold) ctx.strokeText(ch, g.x, it.y);
    } else {
      ctx.save();
      ctx.translate(g.x, it.y);
      ctx.transform(sx, 0, skew, 1, 0, 0);
      ctx.fillText(ch, 0, 0);
      if (it.synthBold) ctx.strokeText(ch, 0, 0);
      ctx.restore();
    }
  }
}

/** Escritas sem composição contextual (latim, grego, cirílico, pontuação):
 *  o avanço de cada glifo é o da fonte, então dá para desenhar em sequência. */
function batchable(cp: number): boolean {
  return (cp >= 0x20 && cp < 0x0300) || (cp >= 0x0370 && cp < 0x0590) || (cp >= 0x2000 && cp < 0x2070 && cp !== 0x200c && cp !== 0x200d) || (cp >= 0x20a0 && cp < 0x20d0);
}

function strokeWith(ctx: CanvasRenderingContext2D, color: string, widthPt: number, dash?: string): void {
  const w = Math.max(0.25, widthPt);
  ctx.strokeStyle = color;
  // contorno nunca abaixo de 1 px do dispositivo (como os rasterizadores de PDF)
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) || 1;
  ctx.lineWidth = Math.max(w * 20, 1 / px);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.setLineDash(dash ? [w * 3 * 20, w * 2 * 20] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Forma (wps/VML): a MESMA geometria do pdf.ts — predefinida com ajustes, espelho e
 * giro; a:custGeom; linha — com preenchimento sólido, degradê, padrão ou imagem,
 * contorno e a sombra externa (cópia deslocada, sem desfoque, como no PDF).
 */
function paintShape(ctx: CanvasRenderingContext2D, it: ShapeItem, env: EnginePaintEnv, base: number): void {
  const st = it.style;
  const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : undefined;
  const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : undefined;
  if (!fill && !stroke && !it.grad && !it.pattern && !it.blip) return;
  const { x, y, w, h } = it;
  const isLine = st.geom === 'line' || st.geom.startsWith('straightConnector');
  const xf = { flipH: !!st.flipH, flipV: !!st.flipV, rot: st.rot ?? 0 };
  type Part = { cmds: Cmd[]; fill: boolean; stroke: boolean; evenOdd: boolean };
  let parts: Part[];
  if (isLine) {
    let cmds = shapePath('line', x, y, w, h, it.line, !!st.flipH, !!st.flipV);
    if (st.rot) cmds = rotatePath(cmds, x + w / 2, y + h / 2, st.rot);
    parts = [{ cmds, fill: false, stroke: true, evenOdd: false }];
  } else if (st.geom === 'custom' && st.cust) {
    parts = custPaths(st.cust, x, y, w, h, xf).map((p) => ({ cmds: p.cmds as Cmd[], fill: p.fill, stroke: p.stroke, evenOdd: true }));
  } else {
    parts = [{ cmds: presetPath(st.geom, x, y, w, h, { ...(st.adj ? { adj: st.adj } : {}), ...xf }) as Cmd[], fill: !OPEN_PRESETS.has(st.geom), stroke: true, evenOdd: false }];
  }
  const fillPart = (p: Part): void => { ctx.beginPath(); tracePath(ctx, p.cmds); ctx.fill(p.evenOdd ? 'evenodd' : 'nonzero'); };
  const strokePart = (p: Part): void => { ctx.beginPath(); tracePath(ctx, p.cmds); strokeWith(ctx, env.color(stroke!.color), stroke!.widthPt, stroke!.dash); };
  if (it.shadow && HEX6.test(it.shadow.color)) {
    ctx.save();
    ctx.translate(it.shadow.dx, it.shadow.dy);
    ctx.globalAlpha = base * (it.shadow.alpha ?? 1);
    ctx.fillStyle = env.color(it.shadow.color);
    for (const p of parts) {
      if (p.fill && (fill || it.grad || it.pattern || it.blip)) fillPart(p);
      if (p.stroke && stroke) { ctx.beginPath(); tracePath(ctx, p.cmds); strokeWith(ctx, env.color(it.shadow.color), stroke.widthPt, stroke.dash); }
    }
    ctx.restore();
  }
  ctx.globalAlpha = base * (st.fillAlpha ?? 1);
  if (it.pattern || it.blip) {
    for (const p of parts) {
      if (!p.fill) continue;
      ctx.save();
      ctx.beginPath();
      tracePath(ctx, p.cmds);
      ctx.clip(p.evenOdd ? 'evenodd' : 'nonzero');
      if (it.pattern) {
        const pr = patternRaster({ ...it.pattern, fg: it.pattern.fg, bg: it.pattern.bg }, x, y, w, h, 15);
        if (pr) {
          const c = rgbaCanvasThemed(pr.data, pr.w, pr.h, env, it.pattern);
          ctx.imageSmoothingEnabled = false;
          if (c) ctx.drawImage(c, pr.x, pr.y, pr.cells.w * 15, pr.cells.h * 15);
        }
      } else if (it.blip) {
        const bmp = env.image(it.blip.image as InlineImage);
        if (bmp) {
          ctx.globalAlpha = base * (it.blip.alpha ?? 1);
          for (const t of blipTiles(it.blip, x, y, w, h, 1 / 635, imagePixelSize(it.blip.image.data))) ctx.drawImage(bmp, t.x, t.y, t.w, t.h);
        }
      }
      ctx.restore();
    }
  } else if (it.grad && isRectGradient(it.grad)) {
    // degradê em retângulos ("Do Centro"): raster no quadro, girado com a forma
    const r = rectGradientRaster(it.grad, w / 20, h / 20, 2);
    const c = rgbaCanvasThemed(r.data, r.w, r.h, env, null);
    for (const p of parts) {
      if (!p.fill || !c) continue;
      ctx.save();
      ctx.beginPath();
      tracePath(ctx, p.cmds);
      ctx.clip(p.evenOdd ? 'evenodd' : 'nonzero');
      ctx.translate(x + w / 2, y + h / 2);
      if (st.rot) ctx.rotate((st.rot * Math.PI) / 180);
      ctx.scale(st.flipH ? -1 : 1, st.flipV ? -1 : 1);
      ctx.drawImage(c, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  } else if (it.grad) {
    const pb = pathBounds(parts.flatMap((p) => p.cmds) as PathCmdTw[]);
    const g = gradientGeometry(it.grad, { x, y, w, h, rot: st.rot ?? 0 }, pb);
    const smp = gradientSamples(it.grad.stops, 64);
    const cg = g.kind === 'axial' ? ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1) : ctx.createRadialGradient(g.x0, g.y0, 0, g.x0, g.y0, g.r);
    for (let i = 0; i < 64; i++) cg.addColorStop(i / 63, env.color(hex2(smp[i * 3]!) + hex2(smp[i * 3 + 1]!) + hex2(smp[i * 3 + 2]!)));
    ctx.fillStyle = cg;
    for (const p of parts) if (p.fill) fillPart(p);
  } else if (fill) {
    ctx.fillStyle = fill;
    for (const p of parts) if (p.fill) fillPart(p);
  }
  if (stroke) {
    ctx.globalAlpha = base * (st.line?.alpha ?? 1);
    for (const p of parts) if (p.stroke) strokePart(p);
  }
  ctx.globalAlpha = base;
}

const hex2 = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();

/** RGBA → canvas (padrão; as cores passam pelo env.color do tema escuro). */
function rgbaCanvasThemed(data: Uint8Array, w: number, h: number, env: EnginePaintEnv, p: { fg: string; bg: string } | null): HTMLCanvasElement | OffscreenCanvas | null {
  const c: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const x = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!x) return null;
  const img = x.createImageData(w, h);
  img.data.set(data);
  // cores trocadas pelo tema escuro do editor (env.color): recolore frente/fundo
  const fg = p ? env.color(p.fg) : '', bg = p ? env.color(p.bg) : '';
  if (p && (fg !== `#${p.fg}` || bg !== `#${p.bg}`)) {
    const parse = (s: string): number[] | null => { const m = /^#?([0-9a-f]{6})$/i.exec(s); return m ? [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16)) : null; };
    const f = parse(fg), b = parse(bg), f0 = parse(p.fg)!;
    if (f && b) for (let i = 0; i < img.data.length; i += 4) { const on = img.data[i] === f0[0] && img.data[i + 1] === f0[1] && img.data[i + 2] === f0[2]; const c2 = on ? f : b; img.data[i] = c2[0]!; img.data[i + 1] = c2[1]!; img.data[i + 2] = c2[2]!; }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function tracePath(ctx: CanvasRenderingContext2D, cmds: readonly Cmd[]): void {
  for (const c of cmds) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else ctx.closePath();
  }
}

/** Gira o caminho (graus, horário na tela) em torno de (cx, cy) — como pdf.ts. */
function rotatePath(cmds: Cmd[], cx: number, cy: number, deg: number): Cmd[] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x: number, y: number): [number, number] => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === 'M' || m.op === 'L') { const [x, y] = tr(m.x, m.y); return { op: m.op, x, y }; }
    if (m.op === 'C') {
      const [x1, y1] = tr(m.x1, m.y1); const [x2, y2] = tr(m.x2, m.y2); const [x, y] = tr(m.x, m.y);
      return { op: 'C', x1, y1, x2, y2, x, y };
    }
    return m;
  });
}

/** Contorno da geometria predefinida (twips) — mesmas formas do pdf.ts. */
function shapePath(geom: string, x: number, y: number, w: number, h: number, line?: { x1: number; y1: number; x2: number; y2: number }, flipH = false, flipV = false): Cmd[] {
  if (geom === 'line' || geom.startsWith('straightConnector')) {
    if (line) return [{ op: 'M', x: x + line.x1, y: y + line.y1 }, { op: 'L', x: x + line.x2, y: y + line.y2 }];
    const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
    const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
    return [{ op: 'M', x: x1, y: y1 }, { op: 'L', x: x2, y: y2 }];
  }
  if (geom === 'ellipse') {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    return [
      { op: 'M', x: cx + rx, y: cy },
      { op: 'C', x1: cx + rx, y1: cy + ry * K, x2: cx + rx * K, y2: cy + ry, x: cx, y: cy + ry },
      { op: 'C', x1: cx - rx * K, y1: cy + ry, x2: cx - rx, y2: cy + ry * K, x: cx - rx, y: cy },
      { op: 'C', x1: cx - rx, y1: cy - ry * K, x2: cx - rx * K, y2: cy - ry, x: cx, y: cy - ry },
      { op: 'C', x1: cx + rx * K, y1: cy - ry, x2: cx + rx, y2: cy - ry * K, x: cx + rx, y: cy },
      { op: 'Z' },
    ];
  }
  if (geom === 'roundRect') {
    const r = Math.min(w, h) * 0.1667;
    return [
      { op: 'M', x: x + r, y }, { op: 'L', x: x + w - r, y },
      { op: 'C', x1: x + w - r + r * K, y1: y, x2: x + w, y2: y + r - r * K, x: x + w, y: y + r },
      { op: 'L', x: x + w, y: y + h - r },
      { op: 'C', x1: x + w, y1: y + h - r + r * K, x2: x + w - r + r * K, y2: y + h, x: x + w - r, y: y + h },
      { op: 'L', x: x + r, y: y + h },
      { op: 'C', x1: x + r - r * K, y1: y + h, x2: x, y2: y + h - r + r * K, x, y: y + h - r },
      { op: 'L', x, y: y + r },
      { op: 'C', x1: x, y1: y + r - r * K, x2: x + r - r * K, y2: y, x: x + r, y },
      { op: 'Z' },
    ];
  }
  return [{ op: 'M', x, y }, { op: 'L', x: x + w, y }, { op: 'L', x: x + w, y: y + h }, { op: 'L', x, y: y + h }, { op: 'Z' }];
}
