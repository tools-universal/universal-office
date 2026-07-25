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
import { parseChart, paintChart, type ChartModel } from './chart-engine.js';
import { layoutTextBody, type LayoutFont, type MeasureText } from './text-layout.js';
import { presetPath } from './geometry.js';
import { EMU_PER_POINT, type Slide, type Shape, type TextBody, type Fill, type Table, type Run } from './model.js';

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
}

interface Fit { ox: number; oy: number; scale: number }

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
  for (let i = 0; i < slide.shapes.length; i++) {
    const shp = slide.shapes[i]!;
    const op = opts.shapeOpacity ? opts.shapeOpacity(shp, i) : 1;
    if (op <= 0) continue; // invisível: pula
    ctx.save();
    if (op < 1) ctx.globalAlpha = ctx.globalAlpha * op;
    paintShape(ctx, shp, fit, resources, opts.suppressTextShapeIdx === i);
    ctx.restore();
  }
  ctx.restore();
}

/** Largura natural de uma PaintImage (HTMLImageElement usa naturalWidth; ImageBitmap usa width). */
function imgW(img: PaintImage): number {
  return typeof img.naturalWidth === 'number' && img.naturalWidth > 0
    ? img.naturalWidth
    : typeof img.width === 'number' ? img.width : 0;
}
function imgH(img: PaintImage): number {
  return typeof img.naturalHeight === 'number' && img.naturalHeight > 0
    ? img.naturalHeight
    : typeof img.height === 'number' ? img.height : 0;
}

function paintShape(
  ctx: CanvasRenderingContext2D, sh: Shape, fit: Fit, res: PaintResources, suppressText: boolean,
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

  // <p:graphicFrame> com chart: pinta a engine de chart no xfrm.
  if (sh.chartXml) {
    let model = res.charts?.get(sh.chartXml);
    if (!model) { model = parseChart(sh.chartXml); res.charts?.set(sh.chartXml, model); }
    if (!model.palette && sh.chartPalette) model.palette = sh.chartPalette;
    paintChart(ctx, model, x, y, w, h, EMU_PER_POINT * fit.scale);
    if (hasXform || hasAlpha) ctx.restore();
    return;
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
    if (hasXform || hasAlpha) ctx.restore();
    return;
  }

  // <p:pic>: prioridade absoluta sobre fill — a imagem ocupa o xfrm.
  if (sh.image) {
    const img = res.images?.get(sh.image.part);
    if (img) {
      // srcRect (crop em 0..1 dos quatro lados) aplica-se em coordenadas da imagem natural.
      if (sh.srcRect) {
        const iw = imgW(img), ih = imgH(img);
        const sx = sh.srcRect.l * iw;
        const sy = sh.srcRect.t * ih;
        const sw = iw - (sh.srcRect.l + sh.srcRect.r) * iw;
        const sh2 = ih - (sh.srcRect.t + sh.srcRect.b) * ih;
        ctx.drawImage(img, sx, sy, sw, sh2, x, y, w, h);
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    }
    // contorno (raro em pic mas válido)
    if (sh.lineColor) {
      ctx.strokeStyle = sh.lineColor;
      ctx.lineWidth = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
      ctx.strokeRect(x, y, w, h);
    }
    if (hasXform || hasAlpha) ctx.restore();
    return;
  }

  // sombra externa (outerShdw) — aplicada no fill path
  if (sh.shadow) {
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
    ctx.fillStyle = sh.fill?.type === 'solid' && sh.fill.color ? sh.fill.color : '#ffffff';
    const shRule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom);
    if (shRule) ctx.fill(shRule); else ctx.fill();
    ctx.restore();
  }
  // preenchimento (solid com alpha opcional, gradiente linear ou blipFill).
  // Geometrias "linha pura" (line/conectores/arc) não têm área p/ fill.
  const isLineGeom = sh.geom === 'line' || sh.geom === 'straightConnector1' || sh.geom === 'arc';
  if (!isLineGeom && (sh.fillImage || (sh.fill && sh.fill.type !== 'none'))) {
    ctx.save();
    if (sh.fillAlpha !== undefined && sh.fillAlpha < 1) ctx.globalAlpha = ctx.globalAlpha * sh.fillAlpha;
    const rule = shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom);
    if (sh.fillImage) {
      // blipFill de shape: imagem esticada recortada pelo path da geometria
      const img = res.images?.get(sh.fillImage.part);
      if (img) { ctx.clip(); ctx.drawImage(img, x, y, w, h); }
    } else if (sh.fill!.type === 'gradient' && sh.fill!.stops && sh.fill!.stops.length >= 2) {
      ctx.fillStyle = makeLinearGradient(ctx, sh.fill!, x, y, w, h);
      if (rule) ctx.fill(rule); else ctx.fill();
    } else if (sh.fill!.type === 'solid' && sh.fill!.color) {
      ctx.fillStyle = sh.fill!.color;
      if (rule) ctx.fill(rule); else ctx.fill();
    }
    ctx.restore();
  }
  // contorno (com prstDash opcional)
  if (sh.lineColor) {
    ctx.strokeStyle = sh.lineColor;
    const lw = Math.max(1, (sh.lineWidth ?? 9525) / 9525 * fit.scale);
    ctx.lineWidth = lw;
    if (sh.lineDash) ctx.setLineDash(dashPattern(sh.lineDash, lw));
    shapePath(ctx, sh.geom, x, y, w, h, sh.custGeom);
    ctx.stroke();
    if (sh.lineDash) ctx.setLineDash([]);
  }
  // texto (suprimido quando a shape está em edição — overlay HTML cobre)
  if (sh.txBody && !suppressText) paintText(ctx, sh, sh.txBody, x, y, w, h, fit.scale);
  if (hasXform || hasAlpha) ctx.restore();
}

/**
 * Monta o path da geometria preset no contexto (usa o descritor puro
 * `presetPath` — o MESMO que o export PDF reusa como paths vetoriais).
 */
function shapePath(
  ctx: CanvasRenderingContext2D, geom: string | undefined,
  x: number, y: number, w: number, h: number,
  custGeom?: { w: number; h: number; subs: import('./geometry.js').PathSeg[][] },
): CanvasFillRule | undefined {
  ctx.beginPath();
  // geometria CUSTOM (freeform): segs nas unidades do path, escalados ao rect
  if (custGeom) {
    const sx = w / custGeom.w, sy = h / custGeom.h;
    drawSegs(ctx, custGeom.subs, x, y, sx, sy);
    return undefined;
  }
  const p = presetPath(geom, w, h);
  switch (p.kind) {
    case 'path': {
      drawSegs(ctx, p.subs, x, y, 1, 1);
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
function paintText(ctx: CanvasRenderingContext2D, sh: Shape, tb: TextBody, x: number, y: number, w: number, h: number, scale: number): void {
  const isTitle = sh.phType === 'title' || sh.phType === 'ctrTitle';
  const measure: MeasureText = (text, f) => {
    ctx.font = layoutFontStr(f, 1);
    return ctx.measureText(text).width;
  };
  const layout = layoutTextBody(tb, w / scale, h / scale, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? 'ctr' : 't',
  });

  const pxPerPt = EMU_PER_POINT * scale; // 1pt em px na escala atual
  ctx.textBaseline = 'alphabetic';
  for (const line of layout.lines) {
    const by = y + line.baseline * scale;
    if (line.bullet) {
      ctx.font = layoutFontStr(line.bullet.font, pxPerPt);
      ctx.fillStyle = line.bullet.color;
      ctx.fillText(line.bullet.text, x + line.bullet.x * scale, by);
    }
    for (const r of line.runs) {
      ctx.font = layoutFontStr(r.font, pxPerPt);
      ctx.fillStyle = r.color;
      const tx = x + r.x * scale;
      ctx.fillText(r.text, tx, by);
      if (r.underline) {
        const sizePx = r.font.sizePt * pxPerPt;
        ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, sizePx / 16);
        const uy = Math.round(by + sizePx * 0.12) + 0.5;
        ctx.beginPath(); ctx.moveTo(tx, uy); ctx.lineTo(tx + r.w * scale, uy); ctx.stroke();
      }
    }
  }
}

/** Font string CSS para uma LayoutFont (pxPerPt converte pt → px). */
function layoutFontStr(f: LayoutFont, pxPerPt: number): string {
  return `${f.italic ? 'italic ' : ''}${f.bold ? '700 ' : '400 '}${f.sizePt * pxPerPt}px '${f.family}', 'Aptos', Calibri, Arial, sans-serif`;
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

  // fundo branco geral
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);

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
        ctx.fillStyle = cell.fill;
        ctx.fillRect(cx0, cy0, cw, ch);
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
      const bw = (cell.borderWidth ?? 12700) * scale; // EMU -> px na escala atual
      const bc = cell.borderColor ?? '#CBD5E1';
      ctx.strokeStyle = bc;
      ctx.lineWidth = Math.max(0.5, bw);
      ctx.strokeRect(cx0 + 0.5, cy0 + 0.5, cw - 1, ch - 1);
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
      // insets default do app de referência: 0.1in lateral, 0.05in vertical
      const padX = 91440 * scale;
      const padY = 45720 * scale;
      // anchor da célula — default do app de referência é TOPO
      const cellAnchor = cell.anchor ?? 't';
      const pxPerPt = EMU_PER_POINT * scale;
      // pinta linha por linha (1 parágrafo = 1 linha aqui — bullets ignorados)
      const lines: { text: string; bold: boolean; italic: boolean; color: string; size: number; align: string; font: string }[] = [];
      for (const p of cell.txBody.paragraphs) {
        for (const r of p.runs.length ? p.runs : [{ text: '' } as Run]) {
          lines.push({
            text: r.text,
            bold: !!(r.bold ?? cell.txBold), italic: !!r.italic,
            color: r.color ?? cell.txColor ?? '#000000',
            size: (r.sz ?? 18) * pxPerPt,
            align: p.align ?? 'l',
            font: r.font ?? 'Calibri',
          });
        }
      }
      const lineH = (lines[0]?.size ?? 18 * pxPerPt) * 1.2;
      const totalH = lines.length * lineH;
      let cy = cy0 + padY;
      if (cellAnchor === 'ctr') cy = cy0 + (ch - totalH) / 2;
      else if (cellAnchor === 'b') cy = cy0 + ch - totalH - padY;
      ctx.textBaseline = 'top';
      for (const l of lines) {
        ctx.font = `${l.italic ? 'italic ' : ''}${l.bold ? '700 ' : '400 '}${l.size}px '${l.font}', 'Aptos', Calibri, Arial, sans-serif`;
        ctx.fillStyle = l.color;
        const tw = ctx.measureText(l.text).width;
        let tx: number;
        if (l.align === 'ctr') tx = cx0 + (cw - tw) / 2;
        else if (l.align === 'r') tx = cx0 + cw - tw - padX;
        else tx = cx0 + padX;
        ctx.fillText(l.text, tx, cy);
        cy += lineH;
      }
    }
  }
}

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
function addLinearSpaceStops(g: CanvasGradient, rawStops: { pos: number; color: string }[]): void {
  const stops = rawStops.map((s) => ({ pos: Math.max(0, Math.min(1, s.pos)), color: s.color }));
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    g.addColorStop(s.pos, s.color);
    const nx = stops[i + 1];
    if (!nx || nx.pos - s.pos < 0.05) continue;
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      g.addColorStop(s.pos + (nx.pos - s.pos) * f, mixLinearRgb(s.color, nx.color, f));
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
 * Tabela de prstDash → padrão LineDash do canvas. Os valores são MULTIPLICADOS
 * pela espessura da linha para escalonar com o stroke width (convenção do
 * PowerPoint: dash tem comprimento proporcional à grossura).
 */
function dashPattern(prstDash: string, lw: number): number[] {
  switch (prstDash) {
    case 'dash': return [4 * lw, 3 * lw];
    case 'lgDash': return [8 * lw, 3 * lw];
    case 'dashDot': return [4 * lw, 3 * lw, 1 * lw, 3 * lw];
    case 'lgDashDot': return [8 * lw, 3 * lw, 1 * lw, 3 * lw];
    case 'lgDashDotDot': return [8 * lw, 3 * lw, 1 * lw, 3 * lw, 1 * lw, 3 * lw];
    case 'dot':
    case 'sysDot': return [1 * lw, 2 * lw];
    case 'sysDash': return [3 * lw, 1 * lw];
    case 'sysDashDot': return [3 * lw, 1 * lw, 1 * lw, 1 * lw];
    case 'sysDashDotDot': return [3 * lw, 1 * lw, 1 * lw, 1 * lw, 1 * lw, 1 * lw];
    default: return [];
  }
}
