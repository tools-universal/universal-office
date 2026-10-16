import type { InlineImage } from '@universal-office/docx-core';
import type { PageItem, GlyphRunItem, ShapeItem } from './tree.js';
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
          : it.dash === 'dashDot' ? [w * 4, w * 2, w, w * 2] : it.dash === 'dashDotDot' ? [w * 4, w * 2, w, w * 2, w, w * 2] : [];
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

function paintShape(ctx: CanvasRenderingContext2D, it: ShapeItem, env: EnginePaintEnv, base: number): void {
  const fill = it.fill && HEX6.test(it.fill) ? env.color(it.fill) : undefined;
  const stroke = it.stroke && HEX6.test(it.stroke.color) ? it.stroke : undefined;
  if (!fill && !stroke) return;
  let cmds = shapePath(it.style.geom, it.x, it.y, it.w, it.h, it.line, !!it.style.flipH, !!it.style.flipV);
  if (it.style.rot) cmds = rotatePath(cmds, it.x + it.w / 2, it.y + it.h / 2, it.style.rot);
  ctx.beginPath();
  tracePath(ctx, cmds);
  if (fill && it.style.geom !== 'line') {
    ctx.globalAlpha = base * (it.style.fillAlpha ?? 1);
    ctx.fillStyle = fill;
    ctx.fill('nonzero');
  }
  if (stroke) {
    ctx.globalAlpha = base * (it.style.line?.alpha ?? 1);
    strokeWith(ctx, env.color(stroke.color), stroke.widthPt, stroke.dash);
  }
  ctx.globalAlpha = base;
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
