/**
 * Export PDF vetorial (não rasterizado): 1 página por slide no tamanho do
 * slide (EMU→pt). Desenha fundo, shapes (presets da spec 03 como paths
 * bezier/poligonais), linhas/bordas, tabelas e texto posicionado com a MESMA
 * lógica de layout do canvas (`layoutTextBody` puro, spec 03 item D) — o
 * Measurer aqui usa métricas da TTF embutida (parser SFNT próprio).
 *
 * Reusa o @wordnext/pdf (PdfDocument/PdfPage/EmbeddedFont). O gerador não tem
 * fontes base-14 → `opts.fonts` é OBRIGATÓRIO (TTFs regular/bold/italic/bi).
 *
 * Imagens: JPEG embute direto (DCTDecode); PNG é decodificado (fflate +
 * unfilter) → RGB + SMask p/ alpha. Outros formatos (gif/svg/webp/bmp) viram
 * placeholder cinza SILENCIOSO (documentado — sem warnings na API).
 *
 * Aproximações documentadas: gradientes viram faixas interpoladas (24 strips
 * recortadas pelo path); sombras (outerShdw), fillAlpha e alphaModFix são
 * ignorados (desenho opaco); charts viram placeholder cinza.
 */
import {
  PdfDocument, hexColor,
  type PdfPage, type PdfImage, type PlacedGlyph, type EmbeddedFont, type PdfColor,
} from '../pdf-writer/index.js';
import {
  EMU_PER_POINT, layoutTextBody, presetPath,
  type Slide, type Shape, type TextBody, type Table, type ImageRef, type Fill, type Run,
  type MeasureText, type LayoutFont, type PresetPath,
} from '@universal-office/slides-processing';
import { TtfProgram } from './sfnt.js';
import { decodePng, jpegSize } from './raster.js';
import { loadDeck } from './model.js';

/** Fonte TTF para embutir no PDF (bytes crus + traços que ela cobre). */
export interface PdfFontSource {
  bytes: Uint8Array;
  bold?: boolean;
  italic?: boolean;
  /** Nome-base no PDF (default: FontN). */
  name?: string;
}

export interface SlidesPdfOptions {
  /** OBRIGATÓRIO: fontes TTF (não há base-14 no gerador). */
  fonts?: PdfFontSource[];
}

/** Tamanhos default (pt) — os mesmos do renderer canvas. */
const DEFAULT_TITLE_PT = 40;
const DEFAULT_BODY_PT = 18;
/** Constante de bezier p/ quarto de círculo. */
const KAPPA = 0.5522847498307936;
/** Nº de faixas da aproximação de gradiente. */
const GRAD_STRIPS = 24;
/** Cinza do placeholder de imagem/chart não suportado. */
const PLACEHOLDER: PdfColor = [0.8, 0.8, 0.8];

interface FontVariant {
  bold: boolean;
  italic: boolean;
  program: TtfProgram;
  embedded: EmbeddedFont;
}
type PickFont = (bold: boolean, italic: boolean) => FontVariant;

const fmt = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/** EMU → pontos. */
const pt = (emu: number): number => emu / EMU_PER_POINT;

/** Exporta o .pptx para PDF (1 página por slide, vetorial). */
export function pptxToPdf(bytes: Uint8Array, opts: SlidesPdfOptions = {}): Uint8Array {
  const fonts = opts.fonts;
  if (!fonts || fonts.length === 0) {
    throw new Error(
      'pptxToPdf: opts.fonts é obrigatório — o gerador de PDF não tem fontes base-14. ' +
      'Passe ao menos uma TTF (ideal: regular/bold/italic/bold-italic da fonte do deck).',
    );
  }
  const deck = loadDeck(bytes);
  const doc = new PdfDocument();
  const variants: FontVariant[] = fonts.map((f, i) => {
    const program = new TtfProgram(f.bytes);
    return {
      bold: !!f.bold,
      italic: !!f.italic,
      program,
      embedded: doc.embedFont(f.name ?? `Font${i}`, f.bytes, program),
    };
  });
  const pick: PickFont = (bold, italic) =>
    variants.find((v) => v.bold === bold && v.italic === italic) ??
    variants.find((v) => !v.bold && !v.italic) ??
    variants[0]!;

  const imageCache = new Map<string, PdfImage | null>();
  const pageW = pt(deck.pres.slideW);
  const pageH = pt(deck.pres.slideH);
  for (const ds of deck.slides) {
    const page = doc.addPage(pageW, pageH);
    drawSlide(page, doc, ds.slide, pageW, pageH, pick, imageCache);
  }
  return doc.build();
}

function drawSlide(
  page: PdfPage, doc: PdfDocument, slide: Slide,
  pageW: number, pageH: number, pick: PickFont, imageCache: Map<string, PdfImage | null>,
): void {
  // fundo: cor sólida (default branco da página) + imagem esticada por cima
  if (slide.bg?.color) page.fillRect(0, 0, pageW, pageH, hexColor(slide.bg.color));
  if (slide.bgImage) drawImageRef(page, doc, imageCache, slide.bgImage, 0, 0, pageW, pageH);

  for (const sh of slide.shapes) drawShape(page, doc, sh, pageH, pick, imageCache);
}

function drawShape(
  page: PdfPage, doc: PdfDocument, sh: Shape,
  pageH: number, pick: PickFont, imageCache: Map<string, PdfImage | null>,
): void {
  if (!sh.xfrm) return; // sem geometria confiável: pula (raro)
  const x = pt(sh.xfrm.x), y = pt(sh.xfrm.y);
  const w = pt(sh.xfrm.cx), h = pt(sh.xfrm.cy);

  // rot/flip em torno do centro — CTM local (q ... Q envolve TUDO da shape)
  const hasXform = !!(sh.xfrm.rot || sh.xfrm.flipH || sh.xfrm.flipV);
  if (hasXform) page.content.str(transformCm(sh, x, y, w, h, pageH));

  if (sh.chartXml) {
    // chart no PDF v1: placeholder silencioso (a engine de chart é canvas-only)
    page.fillRect(x, y, w, h, [0.945, 0.961, 0.976]);
    strokeRectRaw(page, x, y, w, h, pageH, [0.58, 0.64, 0.72], 0.75);
  } else if (sh.table) {
    // tamanho natural da tabela (mesma regra do canvas: soma de cols/rows)
    const natW = sh.table.colWidthsEmu.reduce((a, b) => a + b, 0);
    const natH = sh.table.rows.reduce((a, r) => a + r.heightEmu, 0);
    drawTable(page, sh.table, x, y, natW > 0 ? pt(natW) : w, natH > 0 ? pt(natH) : h, pageH, pick);
  } else if (sh.image) {
    drawImageRef(page, doc, imageCache, sh.image, x, y, w, h, sh.srcRect);
    if (sh.lineColor) {
      strokeRectRaw(page, x, y, w, h, pageH, hexColor(sh.lineColor), Math.max(0.5, pt(sh.lineWidth ?? 9525)));
    }
  } else {
    const preset = presetPath(sh.geom, w, h);
    const isLineGeom = preset.kind === 'line';
    // preenchimento: blipFill > gradiente (faixas) > sólido
    if (!isLineGeom && (sh.fillImage || (sh.fill && sh.fill.type !== 'none'))) {
      if (sh.fillImage) {
        // imagem recortada pelo path da geometria
        page.content.str(`q\n${pathOps(preset, x, y, w, h, pageH)}W n\n`);
        drawImageRef(page, doc, imageCache, sh.fillImage, x, y, w, h);
        page.content.str('Q\n');
      } else if (sh.fill!.type === 'gradient' && sh.fill!.stops && sh.fill!.stops.length >= 2) {
        fillGradient(page, preset, sh.fill!, x, y, w, h, pageH);
      } else if (sh.fill!.type === 'solid' && sh.fill!.color) {
        const c = hexColor(sh.fill!.color);
        page.content.str(`${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])} rg\n${pathOps(preset, x, y, w, h, pageH)}f\n`);
      }
    }
    // contorno
    if (sh.lineColor) {
      const c = hexColor(sh.lineColor);
      const lw = Math.max(0.5, pt(sh.lineWidth ?? 9525));
      const dash = sh.lineDash ? dashArray(sh.lineDash, lw) : '[] 0 d\n';
      page.content.str(
        `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])} RG\n${fmt(lw)} w\n${dash}` +
        `${pathOps(preset, x, y, w, h, pageH)}S\n`,
      );
    }
    // texto
    if (sh.txBody) drawTextBody(page, sh, sh.txBody, x, y, pick);
  }

  if (hasXform) page.content.str('Q\n');
}

// ─────────────────────────── paths / transform ───────────────────────────

/**
 * Operadores de path (sem paint op) para um PresetPath no rect (x,y,w,h) em
 * coordenadas com origem no TOPO — a conversão para o sistema do PDF
 * (origem embaixo) acontece aqui via `pageH - y`.
 */
function pathOps(p: PresetPath, x: number, y: number, w: number, h: number, pageH: number): string {
  const Y = (v: number): string => fmt(pageH - v);
  const M = (px: number, py: number): string => `${fmt(px)} ${Y(py)} m\n`;
  const L = (px: number, py: number): string => `${fmt(px)} ${Y(py)} l\n`;
  const C = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): string =>
    `${fmt(x1)} ${Y(y1)} ${fmt(x2)} ${Y(y2)} ${fmt(x3)} ${Y(y3)} c\n`;
  switch (p.kind) {
    case 'ellipse': return ellipseOps(x + w / 2, y + h / 2, w / 2, h / 2, Y, M, C);
    case 'roundRect': {
      const r = Math.min(p.r, w / 2, h / 2);
      const k = KAPPA * r;
      return (
        M(x + r, y) + L(x + w - r, y) +
        C(x + w - r + k, y, x + w, y + r - k, x + w, y + r) +
        L(x + w, y + h - r) +
        C(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h) +
        L(x + r, y + h) +
        C(x + r - k, y + h, x, y + h - r + k, x, y + h - r) +
        L(x, y + r) +
        C(x, y + r - k, x + r - k, y, x + r, y) + 'h\n'
      );
    }
    case 'poly': {
      if (!p.points.length) return '';
      let ops = M(x + p.points[0]!.x, y + p.points[0]!.y);
      for (let i = 1; i < p.points.length; i++) ops += L(x + p.points[i]!.x, y + p.points[i]!.y);
      return ops + 'h\n';
    }
    case 'line': return M(x + p.x1, y + p.y1) + L(x + p.x2, y + p.y2);
    case 'pie': {
      const cx = x + w / 2, cy = y + h / 2;
      let ops = M(cx, cy) + L(cx + (w / 2) * Math.cos(p.startDeg * Math.PI / 180), cy + (h / 2) * Math.sin(p.startDeg * Math.PI / 180));
      ops += arcOps(cx, cy, w / 2, h / 2, p.startDeg, p.endDeg, C);
      return ops + 'h\n';
    }
    default: {
      // re usa canto INFERIOR esquerdo no PDF
      return `${fmt(x)} ${fmt(pageH - (y + h))} ${fmt(w)} ${fmt(h)} re\n`;
    }
  }
}

/** Elipse completa em 4 beziers. */
function ellipseOps(
  cx: number, cy: number, rx: number, ry: number,
  _Y: (v: number) => string,
  M: (x: number, y: number) => string,
  C: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => string,
): string {
  const kx = KAPPA * rx, ky = KAPPA * ry;
  return (
    M(cx + rx, cy) +
    C(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry) +
    C(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy) +
    C(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry) +
    C(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy) + 'h\n'
  );
}

/** Arco elíptico startDeg→endDeg (horário, coords y-down) em beziers ≤90°. */
function arcOps(
  cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number,
  C: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => string,
): string {
  let ops = '';
  const total = endDeg - startDeg;
  const n = Math.max(1, Math.ceil(Math.abs(total) / 90));
  const step = total / n;
  for (let i = 0; i < n; i++) {
    const a0 = (startDeg + i * step) * Math.PI / 180;
    const a1 = (startDeg + (i + 1) * step) * Math.PI / 180;
    const t = (4 / 3) * Math.tan((a1 - a0) / 4);
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    ops += C(
      cx + rx * (c0 - t * s0), cy + ry * (s0 + t * c0),
      cx + rx * (c1 + t * s1), cy + ry * (s1 - t * c1),
      cx + rx * c1, cy + ry * s1,
    );
  }
  return ops;
}

/** `q` + matriz `cm` que aplica rot/flip da shape em torno do centro (coords PDF). */
function transformCm(sh: Shape, x: number, y: number, w: number, h: number, pageH: number): string {
  const cx = x + w / 2;
  const cy = pageH - (y + h / 2); // centro em coords PDF (y-up)
  // rotação DrawingML é horária (y-down); em coords PDF (y-up) o mesmo visual é -θ
  const theta = -((sh.xfrm!.rot ?? 0) / 60000) * Math.PI / 180;
  const sx = sh.xfrm!.flipH ? -1 : 1;
  const sy = sh.xfrm!.flipV ? -1 : 1;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  // L = R(θ)·S — x' = a x + c y + e ; y' = b x + d y + f
  const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
  const e = cx - (a * cx + c * cy);
  const f = cy - (b * cx + d * cy);
  return `q\n${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm\n`;
}

/** Retângulo apenas com stroke (borda de imagem/chart). */
function strokeRectRaw(page: PdfPage, x: number, y: number, w: number, h: number, pageH: number, c: PdfColor, lw: number): void {
  page.content.str(
    `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])} RG\n${fmt(lw)} w\n[] 0 d\n` +
    `${fmt(x)} ${fmt(pageH - (y + h))} ${fmt(w)} ${fmt(h)} re S\n`,
  );
}

/** Padrão de dash do prstDash em pontos (proporcional à espessura, como no canvas). */
function dashArray(prstDash: string, lw: number): string {
  const pat = ((): number[] => {
    switch (prstDash) {
      case 'dash': return [4, 3];
      case 'lgDash': return [8, 3];
      case 'dashDot': return [4, 3, 1, 3];
      case 'lgDashDot': return [8, 3, 1, 3];
      case 'lgDashDotDot': return [8, 3, 1, 3, 1, 3];
      case 'dot': case 'sysDot': return [1, 2];
      case 'sysDash': return [3, 1];
      case 'sysDashDot': return [3, 1, 1, 1];
      case 'sysDashDotDot': return [3, 1, 1, 1, 1, 1];
      default: return [];
    }
  })();
  if (!pat.length) return '[] 0 d\n';
  return `[${pat.map((v) => fmt(v * lw)).join(' ')}] 0 d\n`;
}

/**
 * Gradiente linear aproximado por GRAD_STRIPS faixas sólidas interpoladas,
 * recortadas pelo path da geometria (mesma reta/ângulo do canvas).
 */
function fillGradient(page: PdfPage, preset: PresetPath, fill: Fill, x: number, y: number, w: number, h: number, pageH: number): void {
  const stops = fill.stops!;
  const ang = (fill.angleDeg ?? 0) * Math.PI / 180;
  const dx = Math.cos(ang), dy = Math.sin(ang); // direção em coords y-down
  const cx = x + w / 2, cy = y + h / 2;
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  const len = 2 * half;
  const px = -dy, py = dx; // perpendicular
  const halfPerp = (Math.abs(dy) * w + Math.abs(dx) * h) / 2 + 1;

  const lerp = (t: number): PdfColor => {
    let lo = stops[0]!, hi = stops[stops.length - 1]!;
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i]!.pos && t <= stops[i + 1]!.pos) { lo = stops[i]!; hi = stops[i + 1]!; break; }
    }
    if (t <= stops[0]!.pos) return hexColor(stops[0]!.color);
    if (t >= stops[stops.length - 1]!.pos) return hexColor(stops[stops.length - 1]!.color);
    const f = hi.pos > lo.pos ? (t - lo.pos) / (hi.pos - lo.pos) : 0;
    const a = hexColor(lo.color), b = hexColor(hi.color);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };

  let ops = `q\n${pathOps(preset, x, y, w, h, pageH)}W n\n`;
  for (let i = 0; i < GRAD_STRIPS; i++) {
    const t0 = i / GRAD_STRIPS, t1 = (i + 1) / GRAD_STRIPS + 0.002;
    const c = lerp((t0 + (i + 1) / GRAD_STRIPS) / 2);
    const s0 = -half + t0 * len, s1 = -half + Math.min(1, t1) * len;
    const corners = [
      [cx + dx * s0 + px * halfPerp, cy + dy * s0 + py * halfPerp],
      [cx + dx * s1 + px * halfPerp, cy + dy * s1 + py * halfPerp],
      [cx + dx * s1 - px * halfPerp, cy + dy * s1 - py * halfPerp],
      [cx + dx * s0 - px * halfPerp, cy + dy * s0 - py * halfPerp],
    ];
    ops += `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])} rg\n`;
    ops += `${fmt(corners[0]![0]!)} ${fmt(pageH - corners[0]![1]!)} m\n`;
    for (let k = 1; k < 4; k++) ops += `${fmt(corners[k]![0]!)} ${fmt(pageH - corners[k]![1]!)} l\n`;
    ops += 'h f\n';
  }
  page.content.str(ops + 'Q\n');
}

// ─────────────────────────── texto ───────────────────────────

/** Largura de um texto em pt para uma variante/tamanho (métrica da TTF). */
function textWidthPt(text: string, v: FontVariant, sizePt: number): number {
  let units = 0;
  for (const ch of text) units += v.program.advanceWidth(v.program.glyphId(ch.codePointAt(0)!));
  return (units * sizePt) / v.program.unitsPerEm;
}

/** Desenha uma string na página (baseline em pt do topo). */
function drawString(page: PdfPage, v: FontVariant, sizePt: number, color: PdfColor, xPt: number, baselinePt: number, text: string): void {
  const glyphs: PlacedGlyph[] = [];
  let pen = xPt;
  const upem = v.program.unitsPerEm;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const { gid, advanceWidth } = v.embedded.encode(cp);
    glyphs.push({ gid, codePoint: cp, xPt: pen, baselineFromTopPt: baselinePt });
    pen += (advanceWidth * sizePt) / upem;
  }
  if (glyphs.length) page.glyphs(v.embedded, sizePt, color, glyphs);
}

/**
 * Texto de uma shape: layoutTextBody (word-wrap/autofit/âncora/bullets) com o
 * Measurer de métricas TTF; cada PlacedRun vira glifos posicionados.
 */
function drawTextBody(page: PdfPage, sh: Shape, tb: TextBody, xPt: number, yPt: number, pick: PickFont): void {
  const isTitle = sh.phType === 'title' || sh.phType === 'ctrTitle';
  const measure: MeasureText = (text, f: LayoutFont) => textWidthPt(text, pick(f.bold, f.italic), f.sizePt);
  const layout = layoutTextBody(tb, sh.xfrm!.cx, sh.xfrm!.cy, measure, {
    defaultSzPt: isTitle ? DEFAULT_TITLE_PT : DEFAULT_BODY_PT,
    defaultAnchor: isTitle ? 'ctr' : 't',
  });
  for (const line of layout.lines) {
    const baseline = yPt + pt(line.baseline);
    if (line.bullet) {
      const v = pick(line.bullet.font.bold, line.bullet.font.italic);
      drawString(page, v, line.bullet.font.sizePt, hexColor(line.bullet.color), xPt + pt(line.bullet.x), baseline, line.bullet.text);
    }
    for (const r of line.runs) {
      const v = pick(r.font.bold, r.font.italic);
      const color = hexColor(r.color);
      const rx = xPt + pt(r.x);
      drawString(page, v, r.font.sizePt, color, rx, baseline, r.text);
      if (r.underline) {
        const uy = baseline + r.font.sizePt * 0.12;
        page.line(rx, uy, rx + pt(r.w), uy, color, Math.max(0.5, r.font.sizePt / 16));
      }
    }
  }
}

// ─────────────────────────── tabelas ───────────────────────────

/**
 * Tabela em pt (mesma lógica simplificada do canvas: fills → bordas → texto,
 * 1 run por linha, âncora vertical da célula e alinhamento do parágrafo).
 */
function drawTable(page: PdfPage, t: Table, x: number, y: number, w: number, h: number, pageH: number, pick: PickFont): void {
  const allZeroRows = t.rows.every((r) => !r.heightEmu);
  const rowHs = allZeroRows ? t.rows.map(() => 1) : t.rows.map((r) => Math.max(r.heightEmu, 1));
  const totalColEmu = t.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const totalRowEmu = rowHs.reduce((a, b) => a + b, 0) || 1;
  const sx = w / totalColEmu;
  const sy = h / totalRowEmu;
  const colX: number[] = [0];
  for (const cw of t.colWidthsEmu) colX.push(colX[colX.length - 1]! + cw * sx);
  const rowY: number[] = [0];
  for (const rh of rowHs) rowY.push(rowY[rowY.length - 1]! + rh * sy);

  // fundo branco geral
  page.fillRect(x, y, w, h, [1, 1, 1]);

  interface CellBox { cx0: number; cy0: number; cw: number; ch: number; cell: Table['rows'][0]['cells'][0] }
  const boxes: CellBox[] = [];
  for (let ri = 0; ri < t.rows.length; ri++) {
    const row = t.rows[ri]!;
    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci]!;
      if (cell.hMerge || cell.vMerge) continue;
      const span = cell.gridSpan ?? 1;
      const rspan = cell.rowSpan ?? 1;
      boxes.push({
        cx0: x + colX[ci]!,
        cy0: y + rowY[ri]!,
        cw: (colX[ci + span] ?? colX[colX.length - 1]!) - colX[ci]!,
        ch: (rowY[ri + rspan] ?? rowY[rowY.length - 1]!) - rowY[ri]!,
        cell,
      });
    }
  }

  for (const b of boxes) {
    if (b.cell.fill) page.fillRect(b.cx0, b.cy0, b.cw, b.ch, hexColor(b.cell.fill));
  }
  for (const b of boxes) {
    const lw = Math.max(0.4, pt(b.cell.borderWidth ?? 6350));
    strokeRectRaw(page, b.cx0, b.cy0, b.cw, b.ch, pageH, hexColor(b.cell.borderColor ?? '#CBD5E1'), lw);
  }
  const pad = 45720 * Math.min(sx, sy); // 0.05in (EMU) na escala pt/EMU da tabela
  for (const b of boxes) {
    if (!b.cell.txBody) continue;
    const lines: { text: string; v: FontVariant; size: number; color: PdfColor; align: string }[] = [];
    for (const p of b.cell.txBody.paragraphs) {
      for (const r of (p.runs.length ? p.runs : [{ text: '' } as Run])) {
        lines.push({
          text: r.text,
          v: pick(!!r.bold, !!r.italic),
          size: r.sz ?? 12,
          color: hexColor(r.color ?? '#1f1f1f'),
          align: p.align ?? 'l',
        });
      }
    }
    const lineH = (lines[0]?.size ?? 12) * 1.2;
    const totalH = lines.length * lineH;
    const anchor = b.cell.anchor ?? 'ctr';
    let cy = b.cy0 + pad;
    if (anchor === 'ctr') cy = b.cy0 + (b.ch - totalH) / 2;
    else if (anchor === 'b') cy = b.cy0 + b.ch - totalH - pad;
    for (const l of lines) {
      const asc = (l.v.program.ascender / l.v.program.unitsPerEm) * l.size;
      const tw = textWidthPt(l.text, l.v, l.size);
      let tx: number;
      if (l.align === 'ctr') tx = b.cx0 + (b.cw - tw) / 2;
      else if (l.align === 'r') tx = b.cx0 + b.cw - tw - pad;
      else tx = b.cx0 + pad;
      drawString(page, l.v, l.size, l.color, tx, cy + asc, l.text);
      cy += lineH;
    }
  }
}

// ─────────────────────────── imagens ───────────────────────────

/** Embute uma ImageRef no documento (cache por part). `null` = sem suporte. */
function embedImage(doc: PdfDocument, cache: Map<string, PdfImage | null>, ref: ImageRef): PdfImage | null {
  const cached = cache.get(ref.part);
  if (cached !== undefined) return cached;
  let img: PdfImage | null = null;
  if (ref.mime === 'image/jpeg') {
    const size = jpegSize(ref.bytes);
    if (size) img = doc.embedJpeg(ref.bytes, size.width, size.height);
  } else if (ref.mime === 'image/png') {
    const png = decodePng(ref.bytes);
    if (png) img = doc.embedRgba(png.rgba, png.width, png.height);
  }
  // gif/svg/webp/bmp (ou decode falho): fica null → placeholder cinza
  cache.set(ref.part, img);
  return img;
}

/** Desenha uma ImageRef no rect (crop `srcRect` via clip + rect expandido). */
function drawImageRef(
  page: PdfPage, doc: PdfDocument, cache: Map<string, PdfImage | null>, ref: ImageRef,
  x: number, y: number, w: number, h: number,
  srcRect?: { l: number; t: number; r: number; b: number },
): void {
  const img = embedImage(doc, cache, ref);
  if (!img) {
    page.fillRect(x, y, w, h, PLACEHOLDER); // formato não suportado: placeholder silencioso
    return;
  }
  if (srcRect) {
    const visW = Math.max(0.0001, 1 - srcRect.l - srcRect.r);
    const visH = Math.max(0.0001, 1 - srcRect.t - srcRect.b);
    const fullW = w / visW;
    const fullH = h / visH;
    const x0 = x - srcRect.l * fullW;
    const y0 = y - srcRect.t * fullH;
    page.content.str(`q\n${fmt(x)} ${fmt(page.heightPt - (y + h))} ${fmt(w)} ${fmt(h)} re W n\n`);
    page.drawImage(img, x0, y0, fullW, fullH);
    page.content.str('Q\n');
  } else {
    page.drawImage(img, x, y, w, h);
  }
}
