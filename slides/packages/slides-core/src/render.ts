/**
 * Pintura de um slide em um contexto canvas 2D como FUNÇÃO PURA (spec 05).
 *
 * Extraída do webcomponent `<universal-slides>` para ser compartilhada entre o
 * componente (browser), miniaturas e o export de imagens (`pptxToImages`, que
 * roda também em node com um canvas injetado). A função NUNCA decodifica
 * imagens: recebe um `Map<part, imagem decodificada>` via `PaintResources` —
 * quem chama decide como decodificar (HTMLImageElement no componente,
 * createImageBitmap no export browser, factory injetada no node).
 *
 * Coordenadas: geometria do slide em EMU; `scale` converte EMU → px do canvas.
 */
import { parseChart, paintChart, chartPartBounds, type ChartModel, type ChartSel } from './chart-engine.js';
import { layoutTextBody, type LayoutFont, type MeasureText, type PlacedRun, type PlacedLine } from './text-layout.js';
import { presetPath } from './geometry.js';
import { lumHsl } from './theme.js';
import { EMU_PER_POINT, type Slide, type Shape, type TextBody, type Fill, type Table, type Run } from './model.js';
import type { ShapeAnimHooks, PartState, AnimBase, UnitRef } from './anim-engine.js';
import { applyReveal, applySoftReveal, softRevealFilter } from './reveal.js';

/** Tamanhos default (pt) quando a cascata não resolveu sz. */
export const DEFAULT_TITLE_PT = 40;
export const DEFAULT_BODY_PT = 18;

/**
 * Imagem já decodificada, pronta para `ctx.drawImage`. Estruturalmente cobre
 * HTMLImageElement, ImageBitmap e as imagens de canvases node (@napi-rs/canvas).
 */
export type PaintImage = CanvasImageSource & {
  naturalWidth?: number;
  naturalHeight?: number;
  width?: unknown;
  height?: unknown;
};

/** Recursos externos do paint: dimensões do slide + imagens/charts decodificados. */
export interface PaintResources {
  /** Largura/altura do slide em EMU (de `Presentation.slideW/H`). */
  slideW: number;
  slideH: number;
  /** Imagens decodificadas por `ImageRef.part`. Ausente no mapa = pula (não desenha). */
  images?: Map<string, PaintImage>;
  /** Cache de ChartModel por XML cru (opcional — memoiza entre repaints). */
  charts?: Map<string, ChartModel>;
}

export interface PaintSlideOptions {
  /** Offset do canto sup. esq. do slide no canvas, em px (default 0,0). */
  ox?: number;
  oy?: number;
  /** Opacidade por shape (animações do componente). Default: 1. Retorno ≤0 pula a shape. */
  shapeOpacity?: (shape: Shape, index: number) => number;
  /** Índice de shape cujo TEXTO não deve ser pintado (edição inline no componente). */
  suppressTextShapeIdx?: number;
  /**
   * Animação da forma (motor SMIL, `anim-engine.ts`): ganchos por camada —
   * forma inteira, fundo, parágrafo, letra/palavra. null = forma estática.
   */
  shapeAnim?: (shape: Shape, index: number) => ShapeAnimHooks | null;
  /**
   * Quadro de MÍDIA da forma (vídeo tocando, quadro atual de GIF animado) —
   * pintado no lugar da imagem do `<p:pic>`. null/undefined = imagem normal.
   */
  mediaFrame?: (shape: Shape, index: number) => PaintImage | MediaFramePaint | null | undefined;
}

/** Quadro de mídia com opacidade: pintado SOBRE a capa (esmaecer de vídeo). */
export interface MediaFramePaint { image: PaintImage; alpha: number }

interface Fit { ox: number; oy: number; scale: number }

/** Retângulo do slide no canvas (px) — converte fração do slide ↔ px. */
interface SlidePx { ox: number; oy: number; sw: number; sh: number }

/** Animação de uma forma durante a pintura (estado da camada `all` já avaliado). */
interface ShapeAnimPaint { hooks: ShapeAnimHooks; all: PartState; base: AnimBase; m: SlidePx }

/** Caixa em px → geometria-base (centro/tamanho em fração do slide). */
function boxBase(x: number, y: number, w: number, h: number, m: SlidePx, extra?: Partial<AnimBase>): AnimBase {
  return { x: (x + w / 2 - m.ox) / m.sw, y: (y + h / 2 - m.oy) / m.sh, w: w / m.sw, h: h / m.sh, ...extra };
}

/**
 * Aplica o estado animado de uma parte ao contexto: opacidade, deslocamento /
 * escala / rotação em torno do centro da caixa (escala no referencial da
 * forma quando ela tem rotação própria) e as máscaras de revelação dos
 * filtros. Devolve false quando a parte está invisível (nada a pintar).
 */
function applyPart(ctx: CanvasRenderingContext2D, st: PartState, base: AnimBase,
  x: number, y: number, w: number, h: number, m: SlidePx, baseRotRad = 0, soft?: SoftReveal[]): boolean {
  if (!st.visible || st.opacity <= 0) return false;
  const kx = (base.w > 0 ? st.w / base.w : 1) * st.sx;
  const ky = (base.h > 0 ? st.h / base.h : 1) * st.sy;
  if (!Number.isFinite(kx) || !Number.isFinite(ky) || Math.abs(kx) < 1e-4 || Math.abs(ky) < 1e-4) return false;
  ctx.globalAlpha = ctx.globalAlpha * st.opacity;
  const bcx = x + w / 2, bcy = y + h / 2;
  const ncx = m.ox + (st.x + st.mx) * m.sw, ncy = m.oy + (st.y + st.my) * m.sh;
  if (Math.abs(ncx - bcx) > 1e-3 || Math.abs(ncy - bcy) > 1e-3 || st.rot || Math.abs(kx - 1) > 1e-6 || Math.abs(ky - 1) > 1e-6) {
    ctx.translate(ncx, ncy);
    if (st.rot) ctx.rotate((st.rot * Math.PI) / 180);
    if (baseRotRad && (kx !== 1 || ky !== 1)) { ctx.rotate(baseRotRad); ctx.scale(kx, ky); ctx.rotate(-baseRotRad); }
    else ctx.scale(kx, ky);
    ctx.translate(-bcx, -bcy);
  }
  for (const f of st.filters) {
    const q = f.transition === 'out' ? 1 - f.p : f.p;
    // borda esfumada: quem chama pinta numa camada e aplica a máscara
    if (soft && q > 0 && q < 1 && softRevealFilter(f.filter)) { soft.push({ filter: f.filter, q }); continue; }
    ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, f.filter, q, x, y, w, h);
    if (ctx.globalAlpha <= 0) return false;
  }
  return true;
}

/** Revelação com borda esfumada pendente (aplicada como máscara numa camada). */
interface SoftReveal { filter: string; q: number }

type LayerCtx = CanvasRenderingContext2D & { canvas: { width: number; height: number } };
const layerPool = new WeakMap<object, LayerCtx[]>();
const layerBusy = new WeakSet<object>();

/**
 * Camada do tamanho do canvas de `ctx`, limpa e com a MESMA transformação
 * (as coordenadas de pintura valem nas duas). null sem canvas/OffscreenCanvas
 * (ex.: testes) — quem chama cai no recorte seco.
 */
function acquireLayer(ctx: CanvasRenderingContext2D): LayerCtx | null {
  const c = (ctx as { canvas?: { width: number; height: number } }).canvas;
  if (!c || !c.width || !c.height || typeof ctx.getTransform !== 'function') return null;
  let pool = layerPool.get(c);
  if (!pool) layerPool.set(c, pool = []);
  let lc = pool.find((l) => !layerBusy.has(l) && l.canvas.width === c.width && l.canvas.height === c.height);
  if (!lc) {
    let cv: { getContext(k: '2d'): unknown } | undefined;
    if (typeof OffscreenCanvas !== 'undefined') cv = new OffscreenCanvas(c.width, c.height);
    else if (typeof document !== 'undefined') { const e = document.createElement('canvas'); e.width = c.width; e.height = c.height; cv = e; }
    const got = cv?.getContext('2d') as LayerCtx | null | undefined;
    if (!got) return null;
    lc = got;
    pool.push(lc);
  }
  layerBusy.add(lc);
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, c.width, c.height);
  lc.setTransform(ctx.getTransform());
  return lc;
}

/** Aplica as máscaras esfumadas na camada, compõe em `ctx` (alfa e recorte de `ctx` valem) e a devolve ao pool. */
function compositeLayer(ctx: CanvasRenderingContext2D, lc: LayerCtx, soft: SoftReveal[], x: number, y: number, w: number, h: number): void {
  for (const s of soft) applySoftReveal(lc, s.filter, s.q, x, y, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lc.canvas as unknown as CanvasImageSource, 0, 0);
  ctx.restore();
  layerBusy.delete(lc);
}

/** Cor do 1º run (ponto de partida de animações de cor do texto). */
function firstRunColor(sh: Shape): string | undefined {
  for (const p of sh.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.color) return r.color;
  return undefined;
}

/**
 * Pinta o slide inteiro (fundo + shapes em z-order) no contexto. O conteúdo é
 * recortado ao retângulo do slide; estado do contexto é preservado
 * (save/restore). Não desenha chrome (borda/sombra/badge — responsabilidade de
 * quem chama).
 */
export function paintSlideTo(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  resources: PaintResources,
  scale: number,
  opts: PaintSlideOptions = {},
): void {
  const ox = opts.ox ?? 0;
  const oy = opts.oy ?? 0;
  const sw = resources.slideW * scale;
  const sh = resources.slideH * scale;
  const fit: Fit = { ox, oy, scale };

  // fundo do slide: cor sólida ou gradiente (fallback branco) + opcional imagem
  if (slide.bg?.type === 'gradient' && slide.bg.stops && slide.bg.stops.length >= 2) {
    ctx.fillStyle = makeLinearGradient(ctx, slide.bg, ox, oy, sw, sh);
  } else {
    ctx.fillStyle = slide.bg?.color ?? '#ffffff';
  }
  ctx.fillRect(ox, oy, sw, sh);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, sw, sh); ctx.clip();
  if (slide.bgImage) {
    const bg = resources.images?.get(slide.bgImage.part);
    // blipFill default = stretch p/ a área inteira do slide
    if (bg) ctx.drawImage(bg, ox, oy, sw, sh);
  }
  const m: SlidePx = { ox, oy, sw, sh };
  for (let i = 0; i < slide.shapes.length; i++) {
    const shp = slide.shapes[i]!;
    const op = opts.shapeOpacity ? opts.shapeOpacity(shp, i) : 1;
    if (op <= 0) continue; // invisível: pula
    const hooks = opts.shapeAnim && shp.xfrm ? opts.shapeAnim(shp, i) : null;
    ctx.save();
    if (op < 1) ctx.globalAlpha = ctx.globalAlpha * op;
    const mf = opts.mediaFrame?.(shp, i) ?? undefined;
    const frame = mf && 'image' in mf && 'alpha' in mf ? mf : mf ? { image: mf as PaintImage, alpha: 1 } : undefined;
    let anim: ShapeAnimPaint | undefined;
    if (hooks && shp.xfrm) {
      // camada "forma inteira": transforma fundo + texto em volta do centro
      const x = ox + shp.xfrm.x * scale, y = oy + shp.xfrm.y * scale;
      const w = shp.xfrm.cx * scale, h = shp.xfrm.cy * scale;
      const rotDeg = (shp.xfrm.rot ?? 0) / 60000;
      const base = boxBase(x, y, w, h, m, { rot: rotDeg, fill: shp.fill?.color, line: shp.lineColor, text: firstRunColor(shp) });
      const all = hooks.all(base);
      const soft: SoftReveal[] = [];
      if (!applyPart(ctx, all, base, x, y, w, h, m, (rotDeg * Math.PI) / 180, soft)) { ctx.restore(); continue; }
      anim = { hooks, all, base, m };
      if (soft.length) {
        // revelar com borda esfumada: a forma vai para uma camada mascarada
        const lc = acquireLayer(ctx);
        if (lc) {
          paintShape(lc, shp, fit, resources, opts.suppressTextShapeIdx === i, anim, frame);
          compositeLayer(ctx, lc, soft, x, y, w, h);
          ctx.restore();
          continue;
        }
        for (const s of soft) ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, s.filter, s.q, x, y, w, h);
      }
    }
    paintShape(ctx, shp, fit, resources, opts.suppressTextShapeIdx === i, anim, frame);
    ctx.restore();
  }
  ctx.restore();
}

/** Largura natural de uma PaintImage (HTMLImageElement usa naturalWidth; vídeo, videoWidth; ImageBitmap, width). */
function imgW(img: PaintImage): number {
  const vw = (img as { videoWidth?: unknown }).videoWidth;
  if (typeof vw === 'number' && vw > 0) return vw;
  return typeof img.naturalWidth === 'number' && img.naturalWidth > 0
    ? img.naturalWidth
    : typeof img.width === 'number' ? img.width : 0;
}
function imgH(img: PaintImage): number {
  const vh = (img as { videoHeight?: unknown }).videoHeight;
  if (typeof vh === 'number' && vh > 0) return vh;
  return typeof img.naturalHeight === 'number' && img.naturalHeight > 0
    ? img.naturalHeight
    : typeof img.height === 'number' ? img.height : 0;
}

function paintShape(
  ctx: CanvasRenderingContext2D, sh: Shape, fit: Fit, res: PaintResources, suppressText: boolean,
  anim?: ShapeAnimPaint, frame?: MediaFramePaint,
): void {
  if (!sh.xfrm) {
    // caixa de texto sem xfrm (raro) — desenha no canto sup. esq. do slide
    if (sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, fit.ox + 40, fit.oy + 40, 400, 200, fit.scale);
    return;
  }
  const x = fit.ox + sh.xfrm.x * fit.scale;
  const y = fit.oy + sh.xfrm.y * fit.scale;
  const w = sh.xfrm.cx * fit.scale;
  const h = sh.xfrm.cy * fit.scale;

  // ── transformação de instância: rot (1/60000 grau) + flipH/flipV em torno
  //    do CENTRO geométrico. Pintada DENTRO de save/restore para não vazar.
  const hasXform = sh.xfrm.rot || sh.xfrm.flipH || sh.xfrm.flipV;
  const hasAlpha = sh.alpha !== undefined && sh.alpha < 1;
  if (hasXform || hasAlpha) {
    ctx.save();
    if (hasAlpha) ctx.globalAlpha = ctx.globalAlpha * sh.alpha!;
    if (hasXform) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.translate(cx, cy);
      if (sh.xfrm.rot) ctx.rotate(sh.xfrm.rot / 60000 * Math.PI / 180);
      if (sh.xfrm.flipH) ctx.scale(-1, 1);
      if (sh.xfrm.flipV) ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }
  }

  // camada de FUNDO animada (efeito por letra/palavra com animBg, ou <p:bg/>)
  const bgSt = anim?.hooks.bg ? anim.hooks.bg(anim.base) : undefined;
  const ov: BodyOverrides = {};
  const fillOv = bgSt?.fillColor ?? anim?.all.fillColor;
  const lineOv = bgSt?.lineColor ?? anim?.all.lineColor;
  if (fillOv) ov.fill = fillOv;
  if (lineOv) ov.line = lineOv;
  if (frame) ov.frame = frame;
  if (anim?.hooks.chartParts && sh.chartXml) {
    ov.chartParts = anim.hooks.chartParts;
    ov.chartBase = { base: anim.base, m: anim.m };
  }
  ctx.save();
  const bodyOn = !bgSt || applyPart(ctx, bgSt, anim!.base, x, y, w, h, anim!.m);
  const hostsText = bodyOn ? paintBody(ctx, sh, x, y, w, h, fit, res, ov) : !(sh.chartXml || sh.table || sh.image);
  ctx.restore();
  // texto (suprimido quando a shape está em edição — overlay HTML cobre)
  if (hostsText && sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, x, y, w, h, fit.scale, anim);
  if (hasXform || hasAlpha) ctx.restore();
}

/** Cores animadas do corpo da forma (animClr/set em fillcolor/stroke.color). */
interface BodyOverrides {
  fill?: string; line?: string; frame?: MediaFramePaint;
  /** Gráfico animado por partes: camadas (seleção + estado; null = estática) e a geometria-base da forma. */
  chartParts?: { sel: ChartSel; state: ((base: AnimBase) => PartState | null) | null }[];
  chartBase?: { base: AnimBase; m: SlidePx };
}

/**
 * Corpo da forma (gráfico, tabela, imagem ou preenchimento/sombra/contorno),
 * já dentro da transformação de instância. Devolve false para corpos que não
 * hospedam texto (gráfico/tabela/imagem).
 */
function paintBody(
  ctx: CanvasRenderingContext2D, sh: Shape, x: number, y: number, w: number, h: number,
  fit: Fit, res: PaintResources, ov: BodyOverrides,
): boolean {
  // <p:graphicFrame> com chart: pinta a engine de chart no xfrm.
  if (sh.chartXml) {
    let model = res.charts?.get(sh.chartXml);
    if (!model) { model = parseChart(sh.chartXml, sh.chartTheme); res.charts?.set(sh.chartXml, model); }
    if (!model.palette && sh.chartPalette) model.palette = sh.chartPalette;
    if (sh.chartBg !== undefined) model.bg = sh.chartBg;
    const ppt = EMU_PER_POINT * fit.scale;
    if (ov.chartParts && ov.chartBase) {
      // por partes: cada camada (fundo / série / categoria / ponto) com o próprio
      // estado, na PRÓPRIA caixa — a das marcas que desenha (medido: o "revelar"
      // de uma série vai da base à coluna mais alta dela, não do quadro todo);
      // o fundo (grade/legenda) usa o quadro do gráfico
      const { base, m } = ov.chartBase;
      for (const p of ov.chartParts) {
        ctx.save();
        let on = true;
        if (p.state) {
          const box = p.sel.bg ? { x, y, w, h } : chartPartBounds(ctx, model, x, y, w, h, ppt, p.sel);
          const pb = p.sel.bg || !box ? base : boxBase(box.x, box.y, box.w, box.h, m);
          const st = box ? p.state(pb) : null;
          const soft: SoftReveal[] = [];
          on = !!box && (!st || applyPart(ctx, st, pb, box.x, box.y, box.w, box.h, m, 0, soft));
          if (on && box && soft.length) {
            const lc = acquireLayer(ctx);
            if (lc) {
              paintChart(lc, model, x, y, w, h, ppt, undefined, true, p.sel);
              compositeLayer(ctx, lc, soft, box.x, box.y, box.w, box.h);
              on = false;
            } else for (const s of soft) ctx.globalAlpha = ctx.globalAlpha * applyReveal(ctx, s.filter, s.q, box.x, box.y, box.w, box.h);
          }
        }
        if (on) paintChart(ctx, model, x, y, w, h, ppt, undefined, true, p.sel);
        ctx.restore();
      }
    } else paintChart(ctx, model, x, y, w, h, ppt);
    return false;
  }
  // <p:graphicFrame> com tabela. PowerPoint frequentemente seta xfrm.cy como
  // PLACEHOLDER pequeno (~1in) e o tamanho REAL da tabela vem da soma das row
  // heights + col widths em EMU. Quando as somas naturais existem, usamos elas.
  if (sh.table) {
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    const tw = natW > 0 ? natW * fit.scale : w;
    const th = natH > 0 ? natH * fit.scale : h;
    paintTable(ctx, sh.table, x, y, tw, th, fit.scale);
    return false;
  }

  // <p:pic>: prioridade absoluta sobre fill — a imagem ocupa o xfrm.
  if (sh.image) {
    // quadro de mídia: opaco substitui a capa; com esmaecer, a capa fica por baixo
    const poster = res.images?.get(sh.image.part);
    const img = ov.frame && ov.frame.alpha >= 1 ? ov.frame.image : poster;
    if (img) {
      // sombra da shape aplicada à imagem (cards de foto de template)
      if (sh.shadow) {
        const sc = sh.shadow;
        const n = parseInt(sc.color.replace('#', ''), 16);
        ctx.save();
        ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${sc.alpha})`;
        ctx.shadowBlur = sc.blurRad * fit.scale;
        ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * fit.scale;
        ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * fit.scale;
      }
      // geometria do pic != rect (ex.: crop circular via prstGeom ellipse):
      // recorta a imagem pelo path da geometria, como o app de referência.
      const clipGeom = sh.geom !== undefined && sh.geom !== 'rect';
      if (clipGeom) {
        ctx.save();
        const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
        if (rule) ctx.clip(rule); else ctx.clip();
      }
      // srcRect (crop em 0..1 dos quatro lados) aplica-se em coordenadas da imagem natural.
      const drawPic = (im: PaintImage): void => {
        if (sh.srcRect) {
          const iw = imgW(im), ih = imgH(im);
          const sx = sh.srcRect.l * iw;
          const sy = sh.srcRect.t * ih;
          const sw = iw - (sh.srcRect.l + sh.srcRect.r) * iw;
          const sh2 = ih - (sh.srcRect.t + sh.srcRect.b) * ih;
          ctx.drawImage(im, sx, sy, sw, sh2, x, y, w, h);
        } else {
          ctx.drawImage(im, x, y, w, h);
        }
      };
      drawPic(img);
      // vídeo esmaecendo: quadro com opacidade por cima da capa
      if (ov.frame && ov.frame.alpha > 0 && ov.frame.alpha < 1) {
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * ov.frame.alpha;
        drawPic(ov.frame.image);
        ctx.restore();
      }
      if (clipGeom) ctx.restore();
      if (sh.shadow) ctx.restore();
    }
    // contorno (raro em pic mas válido) — segue a geometria do pic
    if (sh.lineColor) {
      ctx.strokeStyle = sh.lineColor;
      ctx.lineWidth = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
      shapePath(ctx, sh.geom ?? 'rect', x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'stroke');
      ctx.stroke();
    }
    return false;
  }

  // sombra externa (outerShdw) — aplicada no fill path. Shape SEM fill não
  // pinta proxy (a sombra vai no texto/imagem herdada — nunca um rect branco).
  const hasVisibleFill = sh.fill !== undefined && sh.fill.type !== 'none';
  if (sh.shadow && hasVisibleFill) {
    const sx = sh.shadow.dist * Math.cos(sh.shadow.dirDeg * Math.PI / 180) / 9525 * fit.scale;
    const sy = sh.shadow.dist * Math.sin(sh.shadow.dirDeg * Math.PI / 180) / 9525 * fit.scale;
    ctx.save();
    const hex = sh.shadow.color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    ctx.shadowColor = `rgba(${r},${g},${b},${sh.shadow.alpha})`;
    ctx.shadowBlur = sh.shadow.blurRad / 9525 * fit.scale;
    ctx.shadowOffsetX = sx;
    ctx.shadowOffsetY = sy;
    ctx.fillStyle = ov.fill ?? (sh.fill?.type === 'solid' && sh.fill.color ? sh.fill.color : '#ffffff');
    const shRule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    if (shRule) ctx.fill(shRule); else ctx.fill();
    ctx.restore();
  }
  // preenchimento (solid com alpha opcional, gradiente linear ou blipFill).
  // Geometrias "linha pura" (line/conectores/arc) não têm área p/ fill.
  const isLineGeom = sh.geom === 'line' || sh.geom === 'arc' ||
    /^(straight|bent|curved)Connector\d?$/.test(sh.geom ?? '');
  if (!isLineGeom && (ov.fill || sh.fillImage || (sh.fill && sh.fill.type !== 'none'))) {
    ctx.save();
    if (sh.fillAlpha !== undefined && sh.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * sh.fillAlpha;
    const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'fill');
    if (ov.fill) {
      // cor de preenchimento animada (o app troca fill.type p/ sólido)
      ctx.fillStyle = ov.fill;
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fillImage) {
      // blipFill de shape: esticada OU em LADRILHO (a:tile, tamanho natural
      // @96dpi convertido a EMU), sempre recortada pelo path da geometria
      const img = res.images?.get(sh.fillImage.part);
      if (img && sh.fillTile) {
        const pat = ctx.createPattern(img as CanvasImageSource, 'repeat');
        if (pat) {
          const k = 9525 * fit.scale; // px da imagem (96dpi) → px do canvas
          if (typeof (pat as { setTransform?: unknown }).setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
            pat.setTransform(new DOMMatrix([k, 0, 0, k, x, y]));
          }
          ctx.fillStyle = pat;
          if (rule) ctx.fill(rule); else ctx.fill();
        }
      } else if (img) { ctx.clip(); ctx.drawImage(img, x, y, w, h); }
    } else if (sh.fill!.type === 'gradient' && sh.fill!.stops && sh.fill!.stops.length >= 2) {
      ctx.fillStyle = makeLinearGradient(ctx, sh.fill!, x, y, w, h);
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fill!.type === 'solid' && sh.fill!.color) {
      // sombreado por face (can/cube): cada subpath preenche com a luminância
      // deslocada; demais geometrias preenchem o path combinado de uma vez.
      const desc = sh.custGeom ? null : presetPath(sh.geom, w, h, sh.adj, sh.adjNames);
      if (desc && desc.kind === 'path' && desc.subLum) {
        for (let i = 0; i < desc.subs.length; i++) {
          const lum = desc.subLum[i];
          if (lum === null || lum === undefined) continue;
          ctx.beginPath();
          drawSegs(ctx, [desc.subs[i]!], x, y, 1, 1);
          ctx.fillStyle = lum === 0 ? sh.fill!.color! : lumHsl(sh.fill!.color!, 1, lum);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = sh.fill!.color;
        if (rule) ctx.fill(rule); else ctx.fill();
      }
    }
    ctx.restore();
  }
  // contorno (com prstDash opcional)
  const lineColor = ov.line ?? sh.lineColor;
  if (lineColor) {
    ctx.strokeStyle = lineColor;
    const lw = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
    ctx.lineWidth = lw;
    if (sh.lineDash) ctx.setLineDash(dashPattern(sh.lineDash, lw));
    shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom, sh.adj, sh.adjNames, 'stroke');
    ctx.stroke();
    if (sh.lineDash) ctx.setLineDash([]);
    // setas nos extremos (headEnd/tailEnd) das geometrias de linha
    if (isLineGeom && (sh.headArrow || sh.tailArrow)) {
      const ends = lineEndpoints(sh.geom, x, y, w, h);
      if (ends) {
        ctx.fillStyle = lineColor;
        if (sh.headArrow) paintArrowhead(ctx, sh.headArrow, ends.hx, ends.hy, ends.hAng, lw);
        if (sh.tailArrow) paintArrowhead(ctx, sh.tailArrow, ends.tx, ends.ty, ends.tAng, lw);
      }
    }
  }
  return true;
}

/**
 * Monta o path da geometria preset no contexto (usa o descritor puro
 * `presetPath` — o MESMO que o export PDF reusa como paths vetoriais).
 */
function shapePath(
  ctx: CanvasRenderingContext2D, geom: string | undefined,
  x: number, y: number, w: number, h: number,
  custGeom?: { w: number; h: number; subs: import('./geometry.js').PathSeg[][] },
  adj?: number[],
  adjNames?: string[],
  /** Só os subcaminhos que PREENCHEM (`fill`) ou que têm CONTORNO (`stroke`); ausente = todos. */
  mode?: 'fill' | 'stroke',
): CanvasFillRule | undefined {
  ctx.beginPath();
  // geometria CUSTOM (freeform): segs nas unidades do path, escalados ao rect
  if (custGeom) {
    const sx = w / custGeom.w, sy = h / custGeom.h;
    drawSegs(ctx, custGeom.subs, x, y, sx, sy);
    return undefined;
  }
  const p = presetPath(geom, w, h, adj, adjNames);
  switch (p.kind) {
    case 'path': {
      const subs = mode === 'fill' && p.subLum ? p.subs.filter((_, i) => p.subLum![i] !== null)
        : mode === 'stroke' && p.subStroke ? p.subs.filter((_, i) => p.subStroke![i] !== false)
          : p.subs;
      drawSegs(ctx, subs, x, y, 1, 1);
      return p.fillRule;
    }
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'roundRect':
      roundRect(ctx, x, y, w, h, p.r);
      break;
    case 'poly': {
      const pts = p.points;
      if (pts.length) {
        ctx.moveTo(x + pts[0]!.x, y + pts[0]!.y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i]!.x, y + pts[i]!.y);
        ctx.closePath();
      }
      break;
    }
    case 'line':
      ctx.moveTo(x + p.x1, y + p.y1);
      ctx.lineTo(x + p.x2, y + p.y2);
      break;
    case 'pie': {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, p.startDeg * Math.PI / 180, p.endDeg * Math.PI / 180);
      ctx.closePath();
      break;
    }
    default:
      ctx.rect(x, y, w, h);
  }
  return undefined;
}

/**
 * Extremos + tangentes das geometrias de linha (para desenhar setas).
 * head = ponto inicial, apontando PARA FORA (contra a direção do traço);
 * tail = ponto final, apontando na direção do traço.
 */
function lineEndpoints(geom: string | undefined, x: number, y: number, w: number, h: number):
  { hx: number; hy: number; hAng: number; tx: number; ty: number; tAng: number } | null {
  switch (geom) {
    case 'line':
    case 'straightConnector1': {
      const a = Math.atan2(h, w);
      return { hx: x, hy: y, hAng: a + Math.PI, tx: x + w, ty: y + h, tAng: a };
    }
    case 'bentConnector2':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: Math.PI / 2 };
    case 'bentConnector3':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: 0 };
    case 'bentConnector4':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: Math.PI / 2 };
    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5':
      return { hx: x, hy: y, hAng: Math.PI, tx: x + w, ty: y + h, tAng: 0 };
    default:
      return null;
  }
}

/**
 * Seta de extremidade de linha (`headEnd`/`tailEnd`), tamanho médio do app de
 * referência (~3× a espessura). `ang` = direção para onde a seta APONTA.
 */
function paintArrowhead(ctx: CanvasRenderingContext2D, type: string, px: number, py: number, ang: number, lw: number): void {
  const L = lw * 3.5 + 2;   // comprimento
  const W = lw * 1.6 + 1;   // meia-largura
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.beginPath();
  switch (type) {
    case 'stealth': // triângulo com entalhe traseiro
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L * 0.6, 0);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case 'arrow': // V aberto (stroke)
      ctx.moveTo(-L, W);
      ctx.lineTo(0, 0);
      ctx.lineTo(-L, -W);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.moveTo(L * 0.5, 0);
      ctx.lineTo(0, W);
      ctx.lineTo(-L * 0.5, 0);
      ctx.lineTo(0, -W);
      ctx.closePath();
      ctx.fill();
      break;
    case 'oval':
      ctx.ellipse(0, 0, lw * 1.9 + 1, lw * 1.9 + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: // triangle
      ctx.moveTo(0, 0);
      ctx.lineTo(-L, W);
      ctx.lineTo(-L, -W);
      ctx.closePath();
      ctx.fill();
  }
  ctx.restore();
}

/** Constrói subpaths de PathSeg no contexto (offset x,y + escala sx,sy). */
function drawSegs(
  ctx: CanvasRenderingContext2D,
  subs: import('./geometry.js').PathSeg[][],
  x: number, y: number, sx: number, sy: number,
): void {
  for (const sub of subs) {
    for (const s of sub) {
      if (s.c === 'M') ctx.moveTo(x + s.x * sx, y + s.y * sy);
      else if (s.c === 'L') ctx.lineTo(x + s.x * sx, y + s.y * sy);
      else if (s.c === 'C') ctx.bezierCurveTo(x + s.x1 * sx, y + s.y1 * sy, x + s.x2 * sx, y + s.y2 * sy, x + s.x * sx, y + s.y * sy);
      else if (s.c === 'Q') ctx.quadraticCurveTo(x + s.x1 * sx, y + s.y1 * sy, x + s.x * sx, y + s.y * sy);
      else if (s.c === 'E') ctx.ellipse(x + s.cx * sx, y + s.cy * sy, s.rx * sx, s.ry * sy, 0, s.a0, s.a1, s.ccw ?? false);
      else ctx.closePath();
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, r); // arcTo lança com raio negativo (escala/ajuste negativo)
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Pinta o txBody usando o layout PURO `layoutTextBody` (word-wrap, autofit,
 * bullets com indent, âncora — spec 03 item D). O measurer injeta
 * `ctx.measureText`: fonte setada em `sizePt`px mede uma largura numericamente
 * igual a pontos (escala linear do canvas).
 */
function paintText(ctx: CanvasRenderingContext2D, sh: Shape, tb: TextBody, x: number, y: number, w: number, h: number, scale: number,
  anim?: ShapeAnimPaint): void {
  // texto VERTICAL (vert = 90° horário; vert270 = 90° anti-horário): diagrama
  // na caixa de lados trocados e gira em volta do centro
  const turn = tb.vert === 'vert' || tb.vert === 'eaVert' ? 1 : tb.vert === 'vert270' ? -1 : 0;
  if (turn) {
    const { vert: _v, ...flat } = tb;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.translate(-cx, -cy);
    paintText(ctx, sh, flat, cx - h / 2, cy - w / 2, h, w, scale, anim);
    ctx.restore();
    return;
  }
  // flipH/flipV espelham a GEOMETRIA, nunca o TEXTO (o app de referência
  // mantém os glifos legíveis) — desfaz o espelho localmente em volta do centro
  const unflip = sh.xfrm?.flipH || sh.xfrm?.flipV;
  if (unflip) {
    ctx.save();
    const cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.scale(sh.xfrm!.flipH ? -1 : 1, sh.xfrm!.flipV ? -1 : 1);
    ctx.translate(-cx, -cy);
  }
  const all = anim?.all;
  // ênfase "tamanho da fonte": refaz o layout com a fonte escalada
  const fsc = all?.fontScale !== undefined && all.fontScale !== 1 ? all.fontScale : 1;
  const body = fsc !== 1 ? { ...tb, fontScale: (tb.fontScale ?? 1) * fsc } : tb;
  const isTitle = sh.phType === 'title' || sh.phType === 'ctrTitle';
  const measure: MeasureText = (text, f) => {
    ctx.font = layoutFontStr(f, 1);
    return ctx.measureText(text).width;
  };
  const layout = layoutTextBody(body, w / scale, h / scale, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? 'ctr' : 't',
  });

  const pxPerPt = EMU_PER_POINT * scale; // 1pt em px na escala atual
  // sobreposições de estilo animadas (forma inteira < parágrafo < unidade)
  const fontOf = (f: LayoutFont, st?: PartState | null): LayoutFont => {
    const wgt = st?.fontWeight ?? all?.fontWeight, sty = st?.fontStyle ?? all?.fontStyle, fam = st?.fontFamily ?? all?.fontFamily;
    if (!wgt && !sty && !fam) return f;
    return { ...f, bold: wgt ? wgt === 'bold' : f.bold, italic: sty ? sty === 'italic' : f.italic, family: fam ?? f.family };
  };
  const colorOf = (c: string, st?: PartState | null): string => st?.textColor ?? all?.textColor ?? c;
  const underOf = (u: boolean, st?: PartState | null): boolean => st?.underline ?? all?.underline ?? u;
  const drawText = (text: string, r: PlacedRun, tx: number, by: number, st?: PartState | null): void => {
    const f = fontOf(r.font, st);
    ctx.font = layoutFontStr(f, pxPerPt);
    const color = colorOf(r.color, st);
    ctx.fillStyle = color;
    const effShadow = r.shadow ?? sh.shadow;
    if (effShadow) {
      // sombra do texto: EMU→px pela escala; alpha na cor da sombra
      // (a sombra da SHAPE se aplica ao texto no app de referência)
      const sc = effShadow;
      const n = parseInt(sc.color.replace('#', ''), 16);
      ctx.save();
      ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${sc.alpha})`;
      ctx.shadowBlur = sc.blurRad * scale;
      ctx.shadowOffsetX = sc.dist * Math.cos(sc.dirDeg * Math.PI / 180) * scale;
      ctx.shadowOffsetY = sc.dist * Math.sin(sc.dirDeg * Math.PI / 180) * scale;
      ctx.fillText(text, tx, by);
      ctx.restore();
    } else {
      ctx.fillText(text, tx, by);
    }
    if (underOf(r.underline, st)) {
      const sizePx = f.sizePt * pxPerPt;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, sizePx / 16);
      const uy = Math.round(by + sizePx * 0.12) + 0.5;
      const tw = text === r.text ? r.w * scale : ctx.measureText(text).width;
      ctx.beginPath(); ctx.moveTo(tx, uy); ctx.lineTo(tx + tw, uy); ctx.stroke();
    }
  };

  // caixas por parágrafo (px) — geometria-base das animações por parágrafo
  const paraHook = anim?.hooks.para;
  const unitHook = anim?.hooks.unit;
  const pbox = new Map<number, [number, number, number, number]>();
  const pcolor = new Map<number, string>();
  if (paraHook) {
    for (const line of layout.lines) {
      if (!pcolor.has(line.para) && line.runs[0]) pcolor.set(line.para, line.runs[0].color);
      let x0 = Infinity, x1 = -Infinity;
      for (const r of line.runs) { x0 = Math.min(x0, x + r.x * scale); x1 = Math.max(x1, x + (r.x + r.w) * scale); }
      if (line.bullet) x0 = Math.min(x0, x + line.bullet.x * scale);
      if (!Number.isFinite(x0)) continue;
      const top = y + (line.baseline - line.height * 0.8) * scale, bot = y + (line.baseline + line.height * 0.2) * scale;
      const b = pbox.get(line.para);
      pbox.set(line.para, b ? [Math.min(b[0], x0), Math.min(b[1], top), Math.max(b[2], x1), Math.max(b[3], bot)] : [x0, top, x1, bot]);
    }
  }
  const paraSt = new Map<number, PartState | null>();
  const stOfPara = (pi: number): PartState | null => {
    if (!paraHook || !anim) return null;
    if (!paraSt.has(pi)) {
      const b = pbox.get(pi);
      paraSt.set(pi, b ? paraHook(pi, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m, { text: pcolor.get(pi) })) : null);
    }
    return paraSt.get(pi) ?? null;
  };
  // unidades (letras sem espaço / palavras) — MESMA contagem do modelo de tempo
  const plan = unitHook ? planUnits(tb, layout, unitHook.type, !!unitHook.words) : null;

  ctx.textBaseline = 'alphabetic';
  for (const line of layout.lines) {
    const by = y + line.baseline * scale;
    const pst = stOfPara(line.para);
    if (pst && !pst.visible) continue;
    ctx.save();
    if (pst && anim) {
      const b = pbox.get(line.para)!;
      if (!applyPart(ctx, pst, boxBase(b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m), b[0], b[1], b[2] - b[0], b[3] - b[1], anim.m)) {
        ctx.restore(); continue;
      }
    }
    if (line.bullet) {
      // marcador acompanha a 1ª unidade do parágrafo quando o texto entra por unidade
      let bulletOn = true;
      if (unitHook && plan && anim) {
        const sizePx = line.bullet.font.sizePt * pxPerPt;
        const bst = unitHook.state(plan.firstRef(line.para),
          boxBase(x + line.bullet.x * scale, by - sizePx * 0.8, sizePx, sizePx, anim.m, { text: line.bullet.color }),
          plan.firstWordRef(line.para));
        bulletOn = !bst || (bst.visible && bst.opacity > 0);
      }
      if (bulletOn) {
        ctx.font = layoutFontStr(line.bullet.font, pxPerPt);
        ctx.fillStyle = line.bullet.color;
        ctx.fillText(line.bullet.text, x + line.bullet.x * scale, by);
      }
    }
    if (!unitHook || !plan || !anim) {
      for (const r of line.runs) drawText(r.text, r, x + r.x * scale, by, pst);
      ctx.restore();
      continue;
    }
    // por letra/palavra: cada unidade tem o próprio estado (escalonado no tempo).
    // Geometria de cada pedaço; os pedaços de uma palavra que cruza runs
    // compartilham a caixa (união) e o estado
    const pieces: { p: UnitPiece; r: PlacedRun; ux: number; uw: number; sizePx: number }[] = [];
    for (const r of line.runs) {
      const ps = plan.pieces.get(r);
      if (!ps?.length) continue;
      ctx.font = layoutFontStr(fontOf(r.font, pst), pxPerPt);
      const tx = x + r.x * scale;
      for (const p of ps) {
        pieces.push({ p, r, ux: tx + ctx.measureText(r.text.slice(0, p.start)).width, uw: ctx.measureText(p.text).width, sizePx: r.font.sizePt * pxPerPt });
      }
    }
    const boxes = new Map<number, { x0: number; x1: number; size: number; color: string }>();
    for (const q of pieces) {
      const b = boxes.get(q.p.ref.k);
      if (b) { b.x0 = Math.min(b.x0, q.ux); b.x1 = Math.max(b.x1, q.ux + q.uw); b.size = Math.max(b.size, q.sizePx); }
      else boxes.set(q.p.ref.k, { x0: q.ux, x1: q.ux + q.uw, size: q.sizePx, color: q.r.color });
    }
    const states = new Map<number, PartState | null>();
    for (const q of pieces) {
      const b = boxes.get(q.p.ref.k)!;
      const uy = by - b.size * 0.8;
      const ubase = boxBase(b.x0, uy, b.x1 - b.x0, b.size, anim.m, { text: b.color });
      if (!states.has(q.p.ref.k)) states.set(q.p.ref.k, unitHook.state(q.p.ref, ubase, q.p.word));
      const ust = states.get(q.p.ref.k)!;
      if (ust && !ust.visible) continue;
      ctx.save();
      if (ust && !applyPart(ctx, ust, ubase, b.x0, uy, b.x1 - b.x0, b.size, anim.m)) { ctx.restore(); continue; }
      ctx.font = layoutFontStr(fontOf(q.r.font, pst), pxPerPt);
      drawText(q.p.text, q.r, q.ux, by, ust ?? pst);
      ctx.restore();
    }
    ctx.restore();
  }
  if (unflip) ctx.restore();
}

/** Pedaço de uma unidade de texto animada dentro de um run posicionado. */
interface UnitPiece {
  text: string;
  /** Início do pedaço no texto do run. */
  start: number;
  /** Unidade (letra ou palavra) a que o pedaço pertence. */
  ref: UnitRef;
  /** Palavra da letra (efeito por palavra desenhado por letra). */
  word?: UnitRef;
}

interface UnitPlan {
  pieces: Map<PlacedRun, UnitPiece[]>;
  /** 1ª unidade (e palavra) do parágrafo — o marcador acompanha. */
  firstRef(para: number): UnitRef;
  firstWordRef(para: number): UnitRef | undefined;
}

/**
 * Unidades de texto (`<p:iterate>`) com a MESMA contagem do modelo de tempo
 * (read.ts countTextUnits): letras = caracteres não-espaço; palavras = /\S+/
 * no texto do PARÁGRAFO inteiro — uma palavra que cruza runs ("H"+"₂"+"O",
 * negrito parcial) é UMA unidade. Os runs posicionados são localizados no
 * texto original do parágrafo (o layout descarta as quebras `\n`); se não
 * casarem, as linhas contam como separadas.
 */
function planUnits(tb: TextBody, layout: { lines: PlacedLine[] }, type: 'wd' | 'lt', withWords: boolean): UnitPlan {
  const byPara = new Map<number, PlacedRun[]>();
  for (const line of layout.lines) {
    let list = byPara.get(line.para);
    if (!list) byPara.set(line.para, list = []);
    list.push(...line.runs);
  }
  // palavras por parágrafo: deslocamento de cada run no texto + índice da palavra por caractere
  const runOff = new Map<PlacedRun, number>();
  const wordAt = new Map<number, Int32Array>();
  const wordCount = new Map<number, number>();
  for (const [pi, runs] of byPara) {
    const orig = (tb.paragraphs[pi]?.runs ?? []).map((r) => r.text).join('');
    let text = orig, cursor = 0, ok = true;
    const offs: number[] = [];
    for (const r of runs) {
      const idx = orig.indexOf(r.text, cursor);
      if (idx < 0 || /\S/.test(orig.slice(cursor, idx))) { ok = false; break; }
      offs.push(idx);
      cursor = idx + r.text.length;
    }
    if (!ok) { // fallback: texto dos runs posicionados, linhas separadas
      text = ''; offs.length = 0;
      let prevLine: PlacedLine | undefined;
      for (const line of layout.lines) {
        if (line.para !== pi) continue;
        if (prevLine) text += '\n';
        prevLine = line;
        for (const r of line.runs) { offs.push(text.length); text += r.text; }
      }
    }
    runs.forEach((r, i) => runOff.set(r, offs[i] ?? 0));
    const at = new Int32Array(text.length).fill(-1);
    let k = 0;
    for (const m of text.matchAll(/\S+/g)) { at.fill(k, m.index!, m.index! + m[0].length); k++; }
    wordAt.set(pi, at);
    wordCount.set(pi, k);
  }
  const paras = [...byPara.keys()].sort((a, b) => a - b);
  const wordBase = new Map<number, number>();
  let wTotal = 0;
  for (const pi of paras) { wordBase.set(pi, wTotal); wTotal += wordCount.get(pi) ?? 0; }
  const wordRef = (pi: number, kp: number): UnitRef =>
    ({ para: pi, k: (wordBase.get(pi) ?? 0) + kp, count: wTotal, kPara: kp, countPara: wordCount.get(pi) ?? 1 });

  const pieces = new Map<PlacedRun, UnitPiece[]>();
  if (type === 'wd') {
    for (const pi of paras) {
      const at = wordAt.get(pi)!;
      for (const r of byPara.get(pi)!) {
        const off = runOff.get(r) ?? 0;
        const list: UnitPiece[] = [];
        for (const m of r.text.matchAll(/\S+/g)) {
          const kp = Math.max(0, at[off + m.index!] ?? 0);
          list.push({ text: m[0], start: m.index!, ref: wordRef(pi, kp) });
        }
        pieces.set(r, list);
      }
    }
    return {
      pieces,
      firstRef: (pi) => wordRef(pi, 0),
      firstWordRef: () => undefined,
    };
  }
  // letras: contagem por caractere não-espaço (índice global e no parágrafo)
  const perPara = new Map<number, number>();
  const first = new Map<number, number>();
  let total = 0;
  for (const pi of paras) {
    first.set(pi, total);
    for (const r of byPara.get(pi)!) {
      const n = (r.text.match(/\S/g) ?? []).length;
      total += n;
      perPara.set(pi, (perPara.get(pi) ?? 0) + n);
    }
  }
  let k = 0;
  for (const pi of paras) {
    const at = wordAt.get(pi)!;
    let kp = 0;
    for (const r of byPara.get(pi)!) {
      const off = runOff.get(r) ?? 0;
      const list: UnitPiece[] = [];
      for (const m of r.text.matchAll(/\S/g)) {
        const piece: UnitPiece = { text: m[0], start: m.index!, ref: { para: pi, k: k++, count: total, kPara: kp++, countPara: perPara.get(pi) ?? 1 } };
        if (withWords) piece.word = wordRef(pi, Math.max(0, at[off + m.index!] ?? 0));
        list.push(piece);
      }
      pieces.set(r, list);
    }
  }
  return {
    pieces,
    firstRef: (pi) => ({ para: pi, k: first.get(pi) ?? 0, count: total, kPara: 0, countPara: perPara.get(pi) ?? 1 }),
    firstWordRef: (pi) => (withWords ? wordRef(pi, 0) : undefined),
  };
}

/** Font string CSS para uma LayoutFont (pxPerPt converte pt → px). */
function layoutFontStr(f: LayoutFont, pxPerPt: number): string {
  return `${f.italic ? 'italic ' : ''}${f.bold ? '700 ' : '400 '}${f.sizePt * pxPerPt}px '${f.family}', 'Aptos', Calibri, 'Liberation Sans', Arial, sans-serif`;
}

/**
 * Renderiza uma tabela `<a:tbl>` no rect `(x,y,w,h)`. Escala colunas/linhas
 * proporcionalmente para preencher exatamente o rect. Suporta gridSpan/rowSpan
 * via skip de células `hMerge`/`vMerge`. Pinta cell.fill, depois bordas, depois
 * texto conforme `cell.anchor` (default TOPO, como o app de referência) +
 * `pPr.algn`. `scale` = px por EMU (dimensiona texto e insets).
 */
function paintTable(ctx: CanvasRenderingContext2D, t: Table, x: number, y: number, w: number, h: number, scale: number): void {
  // Alturas: se TODAS forem 0 (XML sem atributo h em <a:tr>), distribui
  // igualmente; caso contrário, usa as proporções do XML.
  const allZeroRows = t.rows.every((r) => !r.heightEmu);
  const rowHs = allZeroRows
    ? t.rows.map(() => 1)
    : t.rows.map((r) => Math.max(r.heightEmu, 1));
  const totalColEmu = t.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const totalRowEmu = rowHs.reduce((a, b) => a + b, 0) || 1;
  const sx = w / totalColEmu;
  const sy = h / totalRowEmu;
  // posições acumuladas em px
  const colX: number[] = [0];
  for (const cw of t.colWidthsEmu) colX.push(colX[colX.length - 1]! + cw * sx);
  const rowY: number[] = [0];
  for (const rh of rowHs) rowY.push(rowY[rowY.length - 1]! + rh * sy);

  // sem fundo forçado: tabela sem fill é TRANSPARENTE (templates translúcidos)

  // primeira passada: fills das células
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri]!;
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci]!;
      if (cell.hMerge || cell.vMerge) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x + colX[ci]!;
      const cy0 = y + rowY[ri]!;
      const cw = (colX[ci + span] ?? colX[colX.length - 1]!) - colX[ci]!;
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]!) - rowY[ri]!;
      if (cell.fill) {
        ctx.save();
        if (cell.fillAlpha !== undefined && cell.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * cell.fillAlpha;
        ctx.fillStyle = cell.fill;
        ctx.fillRect(cx0, cy0, cw, ch);
        ctx.restore();
      }
    }
  }

  // segunda passada: bordas (linhas finas por célula)
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri]!;
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci]!;
      if (cell.hMerge || cell.vMerge) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x + colX[ci]!;
      const cy0 = y + rowY[ri]!;
      const cw = (colX[ci + span] ?? colX[colX.length - 1]!) - colX[ci]!;
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]!) - rowY[ri]!;
      // grade uniforme SÓ quando o estilo/célula define cor (o app de
      // referência não desenha grade em tabela sem estilo)
      if (cell.borderColor) {
        const bw = (cell.borderWidth ?? 12700) * scale;
        ctx.strokeStyle = cell.borderColor;
        ctx.lineWidth = Math.max(0.5, bw);
        // lado a lado: lados com borda própria (desenhada abaixo) ou noFill explícito ficam de fora
        const skip = (k: 'l' | 'r' | 't' | 'b'): boolean => !!cell.borders?.[k] || !!cell.borderNone?.[k];
        const sides: ['l' | 'r' | 't' | 'b', number, number, number, number][] = [
          ['t', cx0, cy0 + 0.5, cx0 + cw, cy0 + 0.5], ['b', cx0, cy0 + ch - 0.5, cx0 + cw, cy0 + ch - 0.5],
          ['l', cx0 + 0.5, cy0, cx0 + 0.5, cy0 + ch], ['r', cx0 + cw - 0.5, cy0, cx0 + cw - 0.5, cy0 + ch],
        ];
        ctx.beginPath();
        for (const [k, x1, y1, x2, y2] of sides) if (!skip(k)) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        ctx.stroke();
      }
      // bordas POR LADO explícitas por cima da uniforme (só nos lados definidos)
      if (cell.borders) {
        const edges: [{ color: string; width: number; dash?: string } | undefined, number, number, number, number][] = [
          [cell.borders.t, cx0, cy0, cx0 + cw, cy0],
          [cell.borders.b, cx0, cy0 + ch, cx0 + cw, cy0 + ch],
          [cell.borders.l, cx0, cy0, cx0, cy0 + ch],
          [cell.borders.r, cx0 + cw, cy0, cx0 + cw, cy0 + ch],
        ];
        for (const [edge, x1, y1, x2, y2] of edges) {
          if (!edge) continue;
          ctx.strokeStyle = edge.color;
          const elw = Math.max(1, edge.width * scale);
          ctx.lineWidth = elw;
          if (edge.dash) ctx.setLineDash(dashPattern(edge.dash, elw));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          if (edge.dash) ctx.setLineDash([]);
        }
      }
    }
  }

  // terceira passada: texto
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri]!;
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci]!;
      if (cell.hMerge || cell.vMerge) continue;
      if (!cell.txBody) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      const cx0 = x + colX[ci]!;
      const cy0 = y + rowY[ri]!;
      const cw = (colX[ci + span] ?? colX[colX.length - 1]!) - colX[ci]!;
      const ch = (rowY[ri + rspan] ?? rowY[rowY.length - 1]!) - rowY[ri]!;
      // o MESMO motor de texto das formas (runs na mesma linha, quebra,
      // sublinhado, espaçamentos); margens e âncora vêm do tcPr — default do
      // app: 0,1" nas laterais, 0,05" em cima/embaixo, âncora no TOPO
      const { txColor, txBold } = cell;
      const body: TextBody = {
        ...cell.txBody,
        anchor: cell.anchor ?? 't',
        ...(cell.vert ? { vert: cell.vert } : {}),
        insL: cell.marL ?? 91440, insR: cell.marR ?? 91440,
        insT: cell.marT ?? 45720, insB: cell.marB ?? 45720,
        // cor/negrito default do ESTILO da tabela (tcTxStyle) onde o run não define
        paragraphs: txColor === undefined && txBold === undefined ? cell.txBody.paragraphs
          : cell.txBody.paragraphs.map((p) => ({
            ...p,
            runs: p.runs.map((r): Run => {
              const o: Run = { ...r };
              if (o.color === undefined && txColor !== undefined) o.color = txColor;
              if (o.bold === undefined && txBold !== undefined) o.bold = txBold;
              return o;
            }),
          })),
      };
      paintText(ctx, TABLE_CELL, body, cx0, cy0, cw, ch, scale);
    }
  }
}

/** Forma "neutra" para o texto de células de tabela (sem sombra, espelho nem placeholder). */
const TABLE_CELL: Shape = { id: '', name: 'tc' };

/**
 * Cria um CanvasGradient linear para um Fill gradient no rect (x,y,w,h).
 * `angleDeg` segue a convenção DrawingML: graus no sentido HORÁRIO a partir do
 * eixo +x (0 = esquerda→direita; 90 = topo→baixo). A reta do gradiente cruza o
 * centro do rect e é dimensionada pela projeção do rect na direção.
 */
function makeLinearGradient(ctx: CanvasRenderingContext2D, fill: Fill, x: number, y: number, w: number, h: number): CanvasGradient {
  // gradiente RADIAL (<a:path>): pos 0 = centro (fillToRect), pos 1 = borda.
  // Aproximação circular do path rect/shape do app de referência.
  if (fill.path) {
    const cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    addLinearSpaceStops(g, fill.stops ?? []);
    return g;
  }
  const ang = (fill.angleDeg ?? 0) * Math.PI / 180;
  let dx = Math.cos(ang), dy = Math.sin(ang);
  // scaled: o ângulo é definido no quadrado unitário; ao esticar para o rect,
  // as ISO-LINHAS transformam como vetores e a direção do gradiente (normal
  // delas) transforma de forma COVARIANTE: (cos·h, sin·w). Verificado contra o
  // app de referência (fundo 45° scaled fica mais íngreme em 16:9, não mais raso).
  if (fill.scaled) {
    dx = Math.cos(ang) * h; dy = Math.sin(ang) * w;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
  }
  const cx = x + w / 2, cy = y + h / 2;
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  addLinearSpaceStops(g, fill.stops ?? []);
  return g;
}

/**
 * Adiciona os stops com SUBSTOPS interpolados em RGB LINEAR (gamma) — o app de
 * referência interpola em linear; o canvas interpola em sRGB (meio mais escuro).
 */
function addLinearSpaceStops(g: CanvasGradient, rawStops: { pos: number; color: string; alpha?: number }[]): void {
  const stops = rawStops.map((s) => ({
    pos: Math.max(0, Math.min(1, s.pos)), color: s.color, alpha: s.alpha ?? 1,
  }));
  const rgba = (hex: string, a: number): string => {
    if (a >= 1) return hex;
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  };
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    g.addColorStop(s.pos, rgba(s.color, s.alpha));
    const nx = stops[i + 1];
    if (!nx || nx.pos - s.pos < 0.05) continue;
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      const a = s.alpha + (nx.alpha - s.alpha) * f;
      g.addColorStop(s.pos + (nx.pos - s.pos) * f, rgba(mixLinearRgb(s.color, nx.color, f), a));
    }
  }
}

/** Mistura duas cores #RRGGBB em espaço RGB linear (gamma 2.2 aproximado). */
function mixLinearRgb(c1: string, c2: string, f: number): string {
  const p = (h: string): [number, number, number] => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(c1);
  const [r2, g2, b2] = p(c2);
  const lin = (v: number): number => Math.pow(v / 255, 2.2);
  const srgb = (v: number): number => Math.round(Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255);
  const mix = (a: number, b: number): number => srgb(lin(a) * (1 - f) + lin(b) * f);
  const hx = (v: number): string => v.toString(16).padStart(2, '0');
  return '#' + hx(mix(r1, r2)) + hx(mix(g1, g2)) + hx(mix(b1, b2));
}

/**
 * Tabela de prstDash → padrão LineDash do canvas, em múltiplos da espessura.
 * Valores MEDIDOS no app de referência (tools/ppt-lab/measure-dash.mjs sobre o
 * PNG exportado; linhas de 2pt, compensação de ~1.5px de antialiasing por
 * borda): dot 1.5/3, dash 5/3, dashDot 5/3/1.5/3, lgDash 9.5/3,
 * lgDashDot 9.5/3/1.5/3, sysDashDotDot 3.8/0.7/1.5/0.7/1.5/0.7.
 */
function dashPattern(prstDash: string, lw: number): number[] {
  switch (prstDash) {
    case 'dash': return [5 * lw, 3 * lw];
    case 'lgDash': return [9.5 * lw, 3 * lw];
    case 'dashDot': return [5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'lgDashDot': return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'lgDashDotDot': return [9.5 * lw, 3 * lw, 1.5 * lw, 3 * lw, 1.5 * lw, 3 * lw];
    case 'dot': return [1.5 * lw, 3 * lw];
    case 'sysDot': return [1.5 * lw, 1 * lw];
    case 'sysDash': return [3 * lw, 1 * lw];
    case 'sysDashDot': return [3 * lw, 1 * lw, 1.5 * lw, 1 * lw];
    case 'sysDashDotDot': return [3.8 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw, 1.5 * lw, 0.7 * lw];
    default: return [];
  }
}
