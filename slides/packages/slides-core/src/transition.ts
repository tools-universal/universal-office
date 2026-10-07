import { applyReveal } from './reveal.js';
import type { SlideTransitionInfo } from './timing.js';

/**
 * TRANSIÇÕES DE SLIDE — composição de ORIGEM (slide anterior no estado final)
 * × DESTINO (slide que entra) num quadro, dado o progresso `p` 0..1. Função
 * pura sobre canvas: quem chama fornece as duas imagens já pintadas no mesmo
 * tamanho do canvas e o retângulo do slide (o resto é preto/letterbox).
 *
 * Cobertura: as transições 2D do PresentationML (cut, fade, push, wipe,
 * cover, pull, split, randomBar, blinds, checker, strips, circle, diamond,
 * plus, zoom, wedge, wheel, dissolve, comb, newsflash) e do p14 (reveal,
 * flash, wheelReverse); as 3D do p14/p15 têm aproximações 2D (escala/
 * deslocamento/rotação) — o resto cai no esmaecer cruzado.
 */

export interface TransitionRect { x: number; y: number; w: number; h: number }

/** Suavização "ease in-out" (seno) — o app acelera/desacelera as transições de movimento. */
function easeInOut(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, p)));
}

/** Ease-out cúbico (medido: cobrir na DIAGONAL anda rápido no começo). */
function easeOut3(p: number): number {
  const q = 1 - Math.max(0, Math.min(1, p));
  return 1 - q * q * q;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Ease in-out de potência `k` sobre [0, end] (curvas medidas por tipo de transição). */
function easePow(p: number, k: number, end = 1): number {
  const t = clamp01(p / end);
  return t < 0.5 ? 0.5 * Math.pow(2 * t, k) : 1 - 0.5 * Math.pow(2 * (1 - t), k);
}

/** Hash determinístico 0..1 (barras/peças "aleatórias" estáveis entre quadros). */
function hash01(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

type Scratch = HTMLCanvasElement | OffscreenCanvas;
const scratches: Scratch[] = [];
/** Tela de rascunho reutilizável (máscaras suaves). */
function scratch(slot: number, w: number, h: number): { c: Scratch; x: CanvasRenderingContext2D } {
  let c = scratches[slot];
  if (!c) {
    c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    scratches[slot] = c;
  }
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const x = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, w, h);
  return { c, x };
}

/**
 * Máscara ANGULAR (relógio: 12h, sentido horário) por pontos (fração da volta,
 * alfa) em ordem crescente — gradiente cônico; `ccw` espelha (anti-horário).
 * Devolve false sem `createConicGradient` (quem chama cai na máscara dura).
 */
function conicMask(m: CanvasRenderingContext2D, r: TransitionRect, pts: [number, number][], ccw = false): boolean {
  const mk = m as unknown as { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient };
  if (typeof mk.createConicGradient !== 'function') return false;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const g = mk.createConicGradient.call(m, -Math.PI / 2, cx, cy);
  const list = ccw ? pts.map(([o, a]): [number, number] => [1 - o, a]).reverse() : pts;
  let last = 0;
  for (const [o, a] of list) {
    last = Math.max(last, clamp01(o));
    g.addColorStop(last, `rgba(255,255,255,${clamp01(a)})`);
  }
  m.fillStyle = g;
  m.fillRect(r.x, r.y, r.w, r.h);
  return true;
}

/** Pontos de uma roda de `n` raios no progresso `q`: borda de ataque SUAVE, raio de partida nítido. */
function wheelPts(n: number, q: number, soft: number): [number, number][] {
  const span = 1 / n, pts: [number, number][] = [];
  const s = Math.min(soft, span * q * 2, span * (1 - q) * 2);
  for (let i = 0; i < n; i++) {
    const a0 = i * span, front = a0 + span * q;
    pts.push([a0, 1], [front - s / 2, 1], [front + s / 2, 0], [a0 + span, 0]);
  }
  return pts;
}

/** Cor média de um cantinho (inferior esquerdo) da imagem — o FUNDO do slide. */
function cornerColor(img: CanvasImageSource, r: TransitionRect): [number, number, number] {
  const t = scratch(3, 1, 1);
  t.x.drawImage(img, r.x + r.w * 0.005, r.y + r.h * 0.955, r.w * 0.03, r.h * 0.04, 0, 0, 1, 1);
  const d = t.x.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
}

/**
 * Desenha o DESTINO sobre a origem através de uma máscara de alfa SUAVE
 * (`paintMask` pinta o alfa — branco opaco = destino visível).
 */
function softOver(ctx: CanvasRenderingContext2D, from: CanvasImageSource, to: CanvasImageSource, r: TransitionRect,
  cw: number, ch: number, paintMask: (m: CanvasRenderingContext2D) => void): void {
  draw(ctx, from, r);
  const t = scratch(0, cw, ch);
  t.x.drawImage(to, 0, 0);
  t.x.globalCompositeOperation = 'destination-in';
  paintMask(t.x);
  ctx.drawImage(t.c as CanvasImageSource, 0, 0);
}

/**
 * Máscara linear suave: a rampa de alfa (largura `band` × comprimento do eixo)
 * varre de (ax,ay) a (bx,by). Medido no app: wipe/dividir/faixas usam rampa do
 * TAMANHO DO SLIDE (o meio da rampa cruza de 25% a 75% do tempo).
 */
function linearMask(m: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, q: number, band: number, r: TransitionRect): void {
  const s = q * (1 + band) - band; // posição (0..1) da frente totalmente revelada
  const dx = bx - ax, dy = by - ay;
  const x0 = ax + dx * s, y0 = ay + dy * s;
  const g = m.createLinearGradient(x0, y0, x0 + dx * band, y0 + dy * band);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  m.fillStyle = g;
  m.fillRect(r.x, r.y, r.w, r.h);
}

/**
 * Máscara de FORMA com borda suave: soma (composição 'lighter') de `steps`
 * cópias concêntricas com alfa 1/steps espalhadas em ±band/2 em volta de `q`.
 */
function softShape(m: CanvasRenderingContext2D, q: number, band: number,
  shape: (k: number, x: CanvasRenderingContext2D) => void, steps = 12): void {
  const mk = scratch(1, m.canvas.width, m.canvas.height);
  mk.x.globalCompositeOperation = 'lighter';
  mk.x.fillStyle = `rgba(255,255,255,${(1 / steps).toFixed(4)})`;
  for (let i = 0; i < steps; i++) {
    const k = q + band * (0.5 - (i + 0.5) / steps);
    if (k <= 0) continue;
    mk.x.beginPath();
    shape(k, mk.x);
    mk.x.fill();
  }
  m.drawImage(mk.c as CanvasImageSource, 0, 0);
}

/** Lâminas/peças 3D (persianas, quadriculado): cada peça gira no próprio eixo, origem → preto → destino. */
function flipTile(ctx: CanvasRenderingContext2D, from: CanvasImageSource, to: CanvasImageSource,
  x: number, y: number, w: number, h: number, f: number, horizontalAxis: boolean): void {
  const ff = clamp01(f);
  const img = ff < 0.5 ? from : to;
  const k = Math.abs(Math.cos(Math.PI * ff));
  if (k < 0.01) return;
  ctx.save();
  if (horizontalAxis) {
    const cy = y + h / 2;
    ctx.translate(0, cy); ctx.scale(1, k); ctx.translate(0, -cy);
  } else {
    const cx = x + w / 2;
    ctx.translate(cx, 0); ctx.scale(k, 1); ctx.translate(-cx, 0);
  }
  ctx.globalAlpha *= 0.75 + 0.25 * k; // face inclinada escurece (luz frontal)
  ctx.drawImage(img, x, y, w, h, x, y, w, h);
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, img: CanvasImageSource, r: TransitionRect, dx = 0, dy = 0): void {
  ctx.drawImage(img, r.x, r.y, r.w, r.h, r.x + dx, r.y + dy, r.w, r.h);
}

/** Vetor unitário (para onde o conteúdo se move) de um dir l|r|u|d|lu|ru|ld|rd. */
function dirVec(dir: string): [number, number] {
  switch (dir) {
    case 'r': return [1, 0];
    case 'u': return [0, -1];
    case 'd': return [0, 1];
    case 'lu': return [-1, -1];
    case 'ru': return [1, -1];
    case 'ld': return [-1, 1];
    case 'rd': return [1, 1];
    default: return [-1, 0];
  }
}

/** Imagem com máscara de revelação sobre a origem (destino revela-se pelo filtro). */
function revealOver(ctx: CanvasRenderingContext2D, from: CanvasImageSource, to: CanvasImageSource, r: TransitionRect, filter: string, q: number): void {
  draw(ctx, from, r);
  ctx.save();
  const a = applyReveal(ctx, filter, q, r.x, r.y, r.w, r.h);
  ctx.globalAlpha *= a;
  draw(ctx, to, r);
  ctx.restore();
}

/** Desenha `img` escalada (kx,ky) em torno do centro do retângulo, com rotação opcional. */
function drawScaled(ctx: CanvasRenderingContext2D, img: CanvasImageSource, r: TransitionRect, kx: number, ky: number, rot = 0, alpha = 1, cx = r.x + r.w / 2, cy = r.y + r.h / 2): void {
  if (kx <= 0.001 || ky <= 0.001 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.scale(kx, ky);
  ctx.translate(-cx, -cy);
  draw(ctx, img, r);
  ctx.restore();
}

/**
 * Compõe a transição no contexto (coordenadas de canvas, sem transform).
 * `p` = progresso linear 0..1 do tempo da transição.
 */
export function paintTransition(ctx: CanvasRenderingContext2D, from: CanvasImageSource, to: CanvasImageSource,
  tr: SlideTransitionInfo, p: number, r: TransitionRect, canvasW: number, canvasH: number): void {
  const a = tr.attrs;
  const dir = a['dir'] ?? '';
  const thruBlk = a['thruBlk'] === '1' || a['thruBlk'] === 'true';
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  switch (tr.type) {
    case 'cut': {
      // "cortar pelo preto": metade no anterior, metade em preto
      if (thruBlk) { if (p < 0.5) draw(ctx, from, r); }
      else draw(ctx, p > 0 ? to : from, r); // p = 0 só no quadro preto inicial do export
      break;
    }
    case 'fade': {
      if (thruBlk) {
        // cada metade (sai o antigo, entra o novo) com a mesma curva cosseno
        ctx.globalAlpha = p < 0.5 ? 1 - easeInOut(2 * p) : easeInOut(2 * p - 1);
        draw(ctx, p < 0.5 ? from : to, r);
      } else {
        // medido (fade-curve.py, resíduo ~0): a mistura segue (1 − cos πp)/2
        draw(ctx, from, r);
        ctx.globalAlpha = easeInOut(p);
        draw(ctx, to, r);
      }
      break;
    }
    case 'push': {
      const e = easeInOut(p);
      const [vx, vy] = dirVec(dir || 'l');
      draw(ctx, from, r, vx * r.w * e, vy * r.h * e);
      draw(ctx, to, r, vx * r.w * (e - 1), vy * r.h * (e - 1));
      break;
    }
    case 'cover': {
      // medido: reto = ease in-out de potência 3; diagonal = ease-out cúbico
      const [vx, vy] = dirVec(dir || 'l');
      const e = vx !== 0 && vy !== 0 ? easeOut3(p) : easePow(p, 3);
      draw(ctx, from, r);
      draw(ctx, to, r, -vx * r.w * (1 - e), -vy * r.h * (1 - e));
      break;
    }
    case 'pull': {
      // medido: reto ~quadrático e termina em 90% do tempo; DIAGONAL sai de 7% a 38% (suave)
      const [vx, vy] = dirVec(dir || 'l');
      const t = clamp01((p - 0.07) / 0.31);
      const e = vx !== 0 && vy !== 0 ? t * t * (3 - 2 * t) : easePow(p, 1.8, 0.9);
      draw(ctx, to, r);
      draw(ctx, from, r, vx * r.w * e, vy * r.h * e);
      break;
    }
    case 'wipe': {
      // dir = para onde a frente anda (r: da esquerda p/ a direita); rampa do tamanho do slide
      const [vx, vy] = dirVec(dir || 'l');
      const ax = vx > 0 ? r.x : vx < 0 ? r.x + r.w : r.x, ay = vy > 0 ? r.y : vy < 0 ? r.y + r.h : r.y;
      const bx = vx > 0 ? r.x + r.w : vx < 0 ? r.x : r.x, by = vy > 0 ? r.y + r.h : vy < 0 ? r.y : r.y;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => linearMask(m, ax, ay, bx, by, p, 1, r));
      break;
    }
    case 'split': {
      // dividir: duas rampas espelhadas (centro → bordas em "out")
      const vert = a['orient'] === 'vert';
      const inward = a['dir'] === 'in';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => {
        const half = (x0: number, y0: number, x1: number, y1: number, clip: [number, number, number, number]): void => {
          m.save(); m.beginPath(); m.rect(...clip); m.clip();
          linearMask(m, x0, y0, x1, y1, p, 1, r);
          m.restore();
        };
        if (vert) {
          if (inward) { half(r.x, cy, cx, cy, [r.x, r.y, r.w / 2, r.h]); half(r.x + r.w, cy, cx, cy, [cx, r.y, r.w / 2, r.h]); }
          else { half(cx, cy, r.x, cy, [r.x, r.y, r.w / 2, r.h]); half(cx, cy, r.x + r.w, cy, [cx, r.y, r.w / 2, r.h]); }
        } else if (inward) { half(cx, r.y, cx, cy, [r.x, r.y, r.w, r.h / 2]); half(cx, r.y + r.h, cx, cy, [r.x, cy, r.w, r.h / 2]); }
        else { half(cx, cy, cx, r.y, [r.x, r.y, r.w, r.h / 2]); half(cx, cy, cx, r.y + r.h, [r.x, cy, r.w, r.h / 2]); }
      });
      break;
    }
    case 'randomBar': {
      // barras finas (2 px a 720p) que ESMAECEM cada uma a partir de um instante aleatório
      const vert = dir === 'vert';
      const n = Math.max(60, Math.round((vert ? r.w : r.h) / 2));
      draw(ctx, from, r);
      for (let i = 0; i < n; i++) {
        // início triangular em [0.18, 0.58] + rampa de 0.3 (meio: 33%→73%, curva em S como no app)
        const u = (hash01(i, 11) + hash01(i, 29)) / 2;
        const al = clamp01((p - 0.18 - 0.4 * u) / 0.3);
        if (al <= 0) continue;
        ctx.globalAlpha = al;
        if (vert) { const bx = r.x + (i * r.w) / n, bw = r.w / n + 0.5; ctx.drawImage(to, bx, r.y, bw, r.h, bx, r.y, bw, r.h); }
        else { const by = r.y + (i * r.h) / n, bh = r.h / n + 0.5; ctx.drawImage(to, r.x, by, r.w, bh, r.x, by, r.w, bh); }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'blinds': {
      // persianas 3D: 12 lâminas giram no próprio eixo, escalonadas ao longo da tela
      const vert = dir === 'vert';
      const n = 12;
      for (let i = 0; i < n; i++) {
        const f = (p - 0.1 - (0.4 * i) / (n - 1)) / 0.35;
        if (vert) flipTile(ctx, from, to, r.x + (i * r.w) / n, r.y, r.w / n + 0.5, r.h, f, false);
        else flipTile(ctx, from, to, r.x, r.y + (i * r.h) / n, r.w, r.h / n + 0.5, f, true);
      }
      break;
    }
    case 'checker': {
      // quadriculado 3D: peças viram escalonadas da esquerda p/ a direita (vert: de cima p/ baixo)
      const vert = dir === 'vert';
      const cols = 10, rows = 6;
      for (let rI = 0; rI < rows; rI++) {
        for (let c = 0; c < cols; c++) {
          const lead = vert ? rI / (rows - 1) : c / (cols - 1);
          const f = (p - 0.5 * lead - 0.05 * hash01(c, rI)) / 0.45;
          flipTile(ctx, from, to, r.x + (c * r.w) / cols, r.y + (rI * r.h) / rows, r.w / cols + 0.5, r.h / rows + 0.5, f, vert);
        }
      }
      break;
    }
    case 'strips': {
      // faixas: rampa DIAGONAL do tamanho do slide (dir = para onde a frente anda)
      const [vx, vy] = dirVec(dir || 'lu');
      const ax = vx > 0 ? r.x : r.x + r.w, ay = vy > 0 ? r.y : r.y + r.h;
      const bx = vx > 0 ? r.x + r.w : r.x, by = vy > 0 ? r.y + r.h : r.y;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => linearMask(m, ax, ay, bx, by, p, 1, r));
      break;
    }
    case 'circle': case 'diamond': case 'plus': {
      // formas a partir do centro com borda bem suave (meio da borda: 20%→85% do tempo)
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const R = Math.hypot(r.w, r.h) / 2;
      const band = 0.5;
      const q = p * (1 + band) - band / 2;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => softShape(m, q, band, (k, x) => {
        if (tr.type === 'circle') x.arc(cx, cy, R * k, 0, Math.PI * 2);
        else if (tr.type === 'diamond') { x.moveTo(cx, cy - r.h * k); x.lineTo(cx + r.w * k, cy); x.lineTo(cx, cy + r.h * k); x.lineTo(cx - r.w * k, cy); x.closePath(); }
        else { const aw = (r.w / 2) * k * 1.2, ah = (r.h / 2) * k * 1.2; x.rect(cx - aw, r.y, aw * 2, r.h); x.rect(r.x, cy - ah, r.w, ah * 2); }
      }, 16));
      break;
    }
    case 'zoom': {
      // caixa (medido): "p/ fora" — caixa suave do destino cresce na 2ª METADE (2p−1);
      // "p/ dentro" — a caixa da origem encolhe e some na 1ª metade (1−2p)
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const soft = 0.06;
      if (dir === 'in') {
        const k = clamp01(1 - 2 * p);
        draw(ctx, to, r);
        if (k > 0) softOver(ctx, to, from, r, canvasW, canvasH, (m) => softShape(m, k, soft, (kk, x) => {
          x.rect(cx - (r.w * kk) / 2, cy - (r.h * kk) / 2, r.w * kk, r.h * kk);
        }, 8));
      } else {
        const k = clamp01(2 * p - 1);
        if (k <= 0) draw(ctx, from, r);
        else softOver(ctx, from, to, r, canvasW, canvasH, (m) => softShape(m, k, soft, (kk, x) => {
          x.rect(cx - (r.w * kk) / 2, cy - (r.h * kk) / 2, r.w * kk, r.h * kk);
        }, 8));
      }
      break;
    }
    case 'wedge': {
      // cunha: duas frentes simétricas a partir das 12h, bordas suaves (como a roda)
      const h = p / 2, sw = Math.min(0.06, p, 1 - p);
      let ok = false;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => {
        ok = conicMask(m, r, [[0, 1], [h - sw / 2, 1], [h + sw / 2, 0], [1 - h - sw / 2, 0], [1 - h + sw / 2, 1], [1, 1]]);
      });
      if (!ok) revealOver(ctx, from, to, r, 'wedge', p);
      break;
    }
    case 'wheel': {
      // roda/relógio (medido): com 1–2 raios a borda de ataque é ESFUMADA; com 3+
      // raios as cunhas têm bordas nítidas
      const n = Math.max(1, parseInt(a['spokes'] ?? '4', 10) || 4);
      let ok = false;
      if (n <= 2) softOver(ctx, from, to, r, canvasW, canvasH, (m) => { ok = conicMask(m, r, wheelPts(n, p, 0.06)); });
      if (!ok) revealOver(ctx, from, to, r, `wheel(${n})`, p);
      break;
    }
    case 'wheelReverse': {
      const n = Math.max(1, parseInt(a['spokes'] ?? '1', 10) || 1);
      let ok = false;
      softOver(ctx, from, to, r, canvasW, canvasH, (m) => { ok = conicMask(m, r, wheelPts(n, p, 0.06), true); });
      if (ok) break;
      // anti-horário: espelha a roda
      draw(ctx, from, r);
      ctx.save();
      ctx.translate(r.x + r.w, 0); ctx.scale(-1, 1); ctx.translate(-r.x, 0);
      applyReveal(ctx, `wheel(${a['spokes'] ?? '1'})`, p, r.x, r.y, r.w, r.h);
      ctx.translate(r.x + r.w, 0); ctx.scale(-1, 1); ctx.translate(-r.x, 0);
      draw(ctx, to, r);
      ctx.restore();
      break;
    }
    case 'dissolve': revealOver(ctx, from, to, r, 'dissolve', p); break;
    case 'comb': {
      // pente: tiras alternadas do destino entram por lados opostos
      const n = 8, e = easeInOut(p);
      draw(ctx, from, r);
      const vert = dir === 'vert';
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.beginPath();
        if (vert) ctx.rect(r.x + (i * r.w) / n, r.y, r.w / n + 0.5, r.h);
        else ctx.rect(r.x, r.y + (i * r.h) / n, r.w, r.h / n + 0.5);
        ctx.clip();
        const s = i % 2 === 0 ? 1 : -1;
        if (vert) draw(ctx, to, r, 0, s * r.h * (1 - e));
        else draw(ctx, to, r, s * r.w * (1 - e), 0);
        ctx.restore();
      }
      break;
    }
    case 'newsflash': {
      // manchete: o destino gira e cresce a partir do centro
      draw(ctx, from, r);
      drawScaled(ctx, to, r, p, p, (1 - p) * Math.PI * 4);
      break;
    }
    case 'flash': {
      // flash (medido): estoura p/ branco rápido, segura e só revela o destino no fim (meio em ~85%)
      if (p < 0.62) { draw(ctx, from, r); ctx.fillStyle = `rgba(255,255,255,${clamp01(p / 0.12).toFixed(3)})`; }
      else { draw(ctx, to, r); ctx.fillStyle = `rgba(255,255,255,${clamp01((0.95 - p) / 0.33).toFixed(3)})`; }
      ctx.fillRect(r.x, r.y, r.w, r.h);
      break;
    }
    case 'reveal': {
      // revelar (medido): suave = esmaecer cruzado com mergulho escuro no meio;
      // pelo preto = a origem sai até ~45%, preto, e o destino entra de 60% a 80%
      const [vx] = dirVec(dir === 'r' ? 'r' : 'l');
      if (thruBlk) {
        const out = clamp01(p / 0.45);
        if (out < 1) { ctx.globalAlpha = 1 - out; draw(ctx, from, r, vx * r.w * 0.15 * out, 0); }
        const inn = clamp01((p - 0.6) / 0.2);
        if (inn > 0) { ctx.globalAlpha = inn; draw(ctx, to, r); }
      } else {
        // suave (medido): o FUNDO funde linearmente e o CONTEÚDO passa pela cor de
        // fundo misturada — o anterior some, o novo surge; no meio, só fundo
        draw(ctx, from, r);
        ctx.globalAlpha = p;
        draw(ctx, to, r);
        const w = 1 - Math.abs(2 * p - 1);
        if (w > 0) {
          const c0 = cornerColor(from, r), c1 = cornerColor(to, r);
          const mix = (i: number): number => Math.round(c0[i]! + (c1[i]! - c0[i]!) * p);
          ctx.globalAlpha = w;
          ctx.fillStyle = `rgb(${mix(0)},${mix(1)},${mix(2)})`;
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
      }
      break;
    }
    // ── aproximações 2D das transições 3D/dinâmicas ──
    case 'pan': case 'conveyor': case 'gallery': case 'ferris': {
      const e = easeInOut(p);
      const [vx, vy] = dirVec(dir === 'r' ? 'r' : dir === 'u' ? 'u' : dir === 'd' ? 'd' : 'l');
      const k = tr.type === 'pan' ? 1 : 1 - 0.15 * Math.sin(Math.PI * p);
      drawScaled(ctx, from, r, k, k, 0, 1, r.x + r.w / 2 + vx * r.w * e, r.y + r.h / 2 + vy * r.h * e);
      drawScaled(ctx, to, r, k, k, 0, 1, r.x + r.w / 2 + vx * r.w * (e - 1), r.y + r.h / 2 + vy * r.h * (e - 1));
      break;
    }
    case 'prism': {
      // cubo/caixa/girar/órbita: face que sai achata e a que entra estica
      const e = easeInOut(p);
      const [vx] = dirVec(dir === 'r' ? 'r' : 'l');
      const fromW = 1 - e, toW = e;
      ctx.save();
      ctx.translate(vx < 0 ? r.x : r.x + r.w, 0);
      ctx.scale(fromW || 0.001, 1);
      ctx.translate(-(vx < 0 ? r.x : r.x + r.w), 0);
      draw(ctx, from, r);
      ctx.restore();
      ctx.save();
      ctx.translate(vx < 0 ? r.x + r.w : r.x, 0);
      ctx.scale(toW || 0.001, 1);
      ctx.translate(-(vx < 0 ? r.x + r.w : r.x), 0);
      draw(ctx, to, r);
      ctx.restore();
      break;
    }
    case 'flip': case 'switch': {
      // gira no eixo vertical: a origem fecha até o meio, o destino abre
      const e = easeInOut(p);
      if (e < 0.5) drawScaled(ctx, from, r, 1 - 2 * e, 1 - 0.1 * e);
      else drawScaled(ctx, to, r, 2 * e - 1, 1 - 0.1 * (1 - e));
      break;
    }
    case 'doors': case 'window': {
      // portas: metades da origem abrem p/ os lados; o destino aproxima
      const e = easeInOut(p);
      const vert = (a['dir'] ?? 'vert') === 'vert';
      drawScaled(ctx, to, r, 0.8 + 0.2 * e, 0.8 + 0.2 * e, 0, Math.min(1, e * 1.4));
      for (const side of [0, 1]) {
        ctx.save();
        ctx.beginPath();
        if (vert) ctx.rect(r.x + (side * r.w) / 2, r.y, r.w / 2, r.h);
        else ctx.rect(r.x, r.y + (side * r.h) / 2, r.w, r.h / 2);
        ctx.clip();
        const ox = vert ? (side === 0 ? r.x : r.x + r.w) : r.x + r.w / 2;
        const oy = vert ? r.y + r.h / 2 : (side === 0 ? r.y : r.y + r.h);
        ctx.translate(ox, oy);
        if (vert) ctx.scale(Math.max(0.001, 1 - e), 1); else ctx.scale(1, Math.max(0.001, 1 - e));
        ctx.translate(-ox, -oy);
        draw(ctx, from, r);
        ctx.restore();
      }
      break;
    }
    case 'warp': case 'flythrough': {
      const e = easeInOut(p);
      const inward = (a['dir'] ?? 'in') === 'in';
      if (inward) {
        drawScaled(ctx, from, r, 1 + e, 1 + e, 0, 1 - e);
        drawScaled(ctx, to, r, 0.5 + 0.5 * e, 0.5 + 0.5 * e, 0, e);
      } else {
        drawScaled(ctx, from, r, 1 - 0.5 * e, 1 - 0.5 * e, 0, 1 - e);
        drawScaled(ctx, to, r, 2 - e, 2 - e, 0, e);
      }
      break;
    }
    case 'prstTrans': {
      // 2013 (cair, cortinas, vento, fratura, origami…): a origem sai (cai/encolhe) sobre o destino
      const e = easeInOut(p);
      draw(ctx, to, r);
      const prst = a['prst'] ?? '';
      if (prst === 'fallOver') drawScaled(ctx, from, r, 1, Math.max(0.001, Math.cos((e * Math.PI) / 2)), 0, 1, r.x + r.w / 2, r.y + r.h);
      else if (prst === 'curtains' || prst === 'drape') {
        for (const side of [0, 1]) {
          ctx.save();
          ctx.beginPath(); ctx.rect(r.x + (side * r.w) / 2, r.y, r.w / 2, r.h); ctx.clip();
          const ox = side === 0 ? r.x : r.x + r.w;
          ctx.translate(ox, 0); ctx.scale(Math.max(0.001, 1 - e), 1); ctx.translate(-ox, 0);
          draw(ctx, from, r);
          ctx.restore();
        }
      } else {
        ctx.globalAlpha = 1 - e;
        draw(ctx, from, r, (a['invX'] === '1' ? 1 : -1) * r.w * e * 0.2, 0);
      }
      break;
    }
    default: {
      // vórtice, ondulação, favo, brilho, picotar, morph sem objetos… → esmaecer cruzado
      draw(ctx, from, r);
      ctx.globalAlpha = p;
      draw(ctx, to, r);
    }
  }
  ctx.restore();
}
