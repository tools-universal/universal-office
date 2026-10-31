/**
 * Export PDF — grid da planilha paginado em A4 (retrato/paisagem automático,
 * como a impressão básica do Excel): larguras de coluna pela fórmula MDW→pt,
 * alturas de linha em pt, texto com alinhamento General, fills sólidos e
 * bordas retas. Quebra de página por LINHAS; linhas/colunas ocultas não saem.
 *
 * Reusa o @wordnext/pdf (PdfDocument/PdfPage/EmbeddedFont). O gerador não tem
 * fontes base-14 embutidas → `opts.fonts` é OBRIGATÓRIO (TTFs; ex.: Aptos
 * Narrow regular/bold/italic/bold-italic).
 */
import {
  PdfDocument, hexColor,
  type PdfPage, type PlacedGlyph, type EmbeddedFont,
} from '../pdf-writer/index.js';
import { PT_BR, type Font, type BorderEdge, type FormatLocale } from '@universal-office/sheets-processing';
import { TtfProgram } from './sfnt.js';
import {
  loadModel, selectSheets, buildGrid, colWidthsPx, rowHeightsPt, hiddenCols, hiddenRows, fillColor,
  type SheetExportInput, type SheetExportOptions, type SheetModel, type SelectedSheet, type SheetGrid,
} from './model.js';

/** Fonte TTF para embutir no PDF (bytes crus + traços que ela cobre). */
export interface PdfFontSource {
  bytes: Uint8Array;
  bold?: boolean;
  italic?: boolean;
  /** Nome-base no PDF (default: FontN). */
  name?: string;
}

export interface SheetPdfOptions extends SheetExportOptions {
  /** OBRIGATÓRIO: fontes TTF (não há base-14 no gerador). */
  fonts?: PdfFontSource[];
  /** Margem da página em pontos. Default 36 (0,5"). */
  marginPt?: number;
}

/** A4 em pontos (210 × 297 mm). */
const A4_W = 595.276;
const A4_H = 841.89;
/** Margem interna horizontal da célula (~3px do Excel). */
const CELL_PAD = 2.25;
/** Folga vertical do texto (bottom-align do Excel). */
const CELL_VPAD = 1.5;

interface FontVariant {
  bold: boolean;
  italic: boolean;
  program: TtfProgram;
  embedded: EmbeddedFont;
}

/** Espessura em pt e tracejado por estilo de borda OOXML. */
function borderStroke(edge: BorderEdge): { width: number; dash?: readonly number[] } {
  switch (edge.style) {
    case 'hair': return { width: 0.5 };
    case 'dotted': return { width: 0.75, dash: [1, 1] };
    case 'dashed': case 'dashDot': case 'dashDotDot': return { width: 0.75, dash: [3, 2] };
    case 'medium': return { width: 1.5 };
    case 'mediumDashed': case 'mediumDashDot': case 'mediumDashDotDot': case 'slantDashDot':
      return { width: 1.5, dash: [3, 2] };
    case 'thick': return { width: 2.25 };
    case 'double': return { width: 2.25 }; // aproximação: linha única grossa
    default: return { width: 0.75 }; // thin
  }
}

/** Largura de um texto em pt para uma fonte/tamanho. */
function textWidthPt(text: string, program: TtfProgram, sizePt: number): number {
  let units = 0;
  for (const ch of text) units += program.advanceWidth(program.glyphId(ch.codePointAt(0)!));
  return (units * sizePt) / program.unitsPerEm;
}

/** Exporta para PDF. Default: todas as planilhas visíveis, cada uma em página nova. */
export function xlsxToPdf(input: SheetExportInput, opts: SheetPdfOptions = {}): Uint8Array {
  const fonts = opts.fonts;
  if (!fonts || fonts.length === 0) {
    throw new Error(
      'xlsxToPdf: opts.fonts é obrigatório — o gerador de PDF não tem fontes base-14. ' +
      'Passe ao menos uma TTF (ex.: Aptos Narrow regular; ideal: regular/bold/italic/bold-italic).',
    );
  }
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const margin = opts.marginPt ?? 36;

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
  const pick = (bold: boolean, italic: boolean): FontVariant =>
    variants.find((v) => v.bold === bold && v.italic === italic) ??
    variants.find((v) => !v.bold && !v.italic) ??
    variants[0]!;

  const sheets = selectSheets(model, opts.sheet, 'all');
  for (const sel of sheets) renderSheet(doc, model, sel, loc, margin, pick);
  return doc.build();
}

function renderSheet(
  doc: PdfDocument,
  model: SheetModel,
  sel: SelectedSheet,
  loc: FormatLocale,
  margin: number,
  pick: (bold: boolean, italic: boolean) => FontVariant,
): void {
  const grid = buildGrid(model, sel, loc);
  if (grid.rowCount === 0 || grid.colCount === 0) return; // planilha vazia: sem página

  // métricas: MDW px → pt (×72/96); ocultas têm largura/participação zero
  const widthsPt = colWidthsPx(grid.ws, grid.colCount).map((px) => (px * 72) / 96);
  const hidCols = hiddenCols(grid.ws, grid.colCount);
  for (const c of hidCols) widthsPt[c - 1] = 0;
  const heights = rowHeightsPt(grid.ws, grid.rowCount);
  const hidRows = hiddenRows(grid.ws);

  // orientação automática: paisagem quando o grid não cabe no retrato
  const totalW = widthsPt.reduce((a, b) => a + b, 0);
  const landscape = totalW > A4_W - 2 * margin;
  const pageW = landscape ? A4_H : A4_W;
  const pageH = landscape ? A4_W : A4_H;
  const contentH = pageH - 2 * margin;

  // x acumulado: xs[c-1] = borda esquerda da coluna c; xs[c] = direita
  const xs: number[] = [margin];
  for (let c = 1; c <= grid.colCount; c++) xs.push(xs[c - 1]! + widthsPt[c - 1]!);

  // paginação por linhas (visíveis), greedy — ao menos 1 linha por página
  const pagesRows: number[][] = [];
  let cur: number[] = [];
  let used = 0;
  for (let r = 1; r <= grid.rowCount; r++) {
    if (hidRows.has(r)) continue;
    const h = heights[r - 1]!;
    if (cur.length > 0 && used + h > contentH) { pagesRows.push(cur); cur = []; used = 0; }
    cur.push(r);
    used += h;
  }
  if (cur.length) pagesRows.push(cur);

  for (const rows of pagesRows) {
    const page = doc.addPage(pageW, pageH);
    drawPage(page, model, grid, rows, xs, widthsPt, heights, hidCols, margin, pageH, pick);
  }
}

function drawPage(
  page: PdfPage,
  model: SheetModel,
  grid: SheetGrid,
  rows: number[],
  xs: number[],
  widthsPt: number[],
  heights: number[],
  hidCols: Set<number>,
  margin: number,
  pageH: number,
  pick: (bold: boolean, italic: boolean) => FontVariant,
): void {
  const styles = model.styles;
  const pageBottom = pageH - margin;

  // yTop por linha desta página
  const yOf = new Map<number, number>();
  let y = margin;
  for (const r of rows) { yOf.set(r, y); y += heights[r - 1]!; }

  interface CellBox {
    r: number; c: number;
    x: number; y: number; w: number; h: number;
    xf: number | undefined;
    text: string;
    color?: string;
    numeric: boolean;
    merged: boolean;
  }
  const boxes: CellBox[] = [];
  for (const r of rows) {
    for (let c = 1; c <= grid.colCount; c++) {
      if (hidCols.has(c)) continue;
      const merge = grid.mergeAt(r, c);
      // absorvidas: só o topo-esquerdo desenha (merge iniciando em página
      // anterior fica em branco aqui — aceitável no v1)
      if (merge && (merge.r0 !== r || merge.c0 !== c)) continue;
      const gc = grid.cells[r - 1]![c - 1];
      const x = xs[c - 1]!;
      let w = widthsPt[c - 1]!;
      let h = heights[r - 1]!;
      if (merge) {
        w = xs[merge.c1]! - xs[merge.c0 - 1]!;
        h = 0;
        for (let rr = merge.r0; rr <= merge.r1; rr++) h += heights[rr - 1]!;
        h = Math.min(h, pageBottom - yOf.get(r)!); // não vaza da página
      }
      if (w <= 0 || h <= 0) continue;
      boxes.push({
        r, c, x, y: yOf.get(r)!, w, h,
        xf: gc?.xf, text: gc?.text ?? '', color: gc?.color, numeric: gc?.numeric ?? false,
        merged: !!merge,
      });
    }
  }

  // passo 1: fills
  for (const b of boxes) {
    const xf = b.xf !== undefined ? styles.cellXfs[b.xf] : undefined;
    const bg = fillColor(xf ? styles.fills[xf.fillId] : undefined);
    if (bg) page.fillRect(b.x, b.y, b.w, b.h, hexColor(bg));
  }

  // passo 2: bordas
  for (const b of boxes) {
    const xf = b.xf !== undefined ? styles.cellXfs[b.xf] : undefined;
    const border = xf ? styles.borders[xf.borderId] : undefined;
    if (!border) continue;
    const edge = (e: BorderEdge | undefined, x0: number, y0: number, x1: number, y1: number): void => {
      if (!e) return;
      const { width, dash } = borderStroke(e);
      page.line(x0, y0, x1, y1, hexColor(e.color ?? '#000000'), width, dash);
    };
    edge(border.top, b.x, b.y, b.x + b.w, b.y);
    edge(border.bottom, b.x, b.y + b.h, b.x + b.w, b.y + b.h);
    edge(border.left, b.x, b.y, b.x, b.y + b.h);
    edge(border.right, b.x + b.w, b.y, b.x + b.w, b.y + b.h);
  }

  // passo 3: texto
  for (const b of boxes) {
    if (b.text === '') continue;
    const xf = b.xf !== undefined ? styles.cellXfs[b.xf] : undefined;
    const font: Font | undefined = xf ? styles.fonts[xf.fontId] : undefined;
    const variant = pick(!!font?.bold, !!font?.italic);
    const size = font?.size ?? 11;
    // cor do numFmt ([Red]) tem prioridade sobre a cor da fonte
    const color = hexColor(b.color ?? font?.color ?? '#000000');
    // só a primeira linha do texto (sem wrap no v1)
    let text = b.text.split(/\r\n|\r|\n/, 1)[0]!;
    let textW = textWidthPt(text, variant.program, size);

    // número que não cabe vira "####" (como o Excel) — dígitos truncados enganam
    if (b.numeric && textW > b.w - 2 * CELL_PAD) {
      const hashW = textWidthPt('#', variant.program, size);
      const n = Math.floor((b.w - 2 * CELL_PAD) / hashW);
      if (n <= 0) continue;
      text = '#'.repeat(n);
      textW = hashW * n;
    }

    // alinhamento: explícito do xf; General alinha números/datas à direita
    let ha = xf?.horizontal;
    if (ha === 'general' || ha === 'fill') ha = undefined;
    if (ha === 'centerContinuous') ha = 'center';
    if (!ha) ha = b.numeric ? 'right' : 'left';

    let startX: number;
    if (ha === 'right') startX = b.x + b.w - CELL_PAD - textW;
    else if (ha === 'center') startX = b.x + (b.w - textW) / 2;
    else startX = b.x + CELL_PAD;

    // texto à esquerda transborda sobre células vazias seguintes (como o Excel)
    let clipRight = b.x + b.w - CELL_PAD;
    if (ha === 'left' && !b.merged && textW > b.w - 2 * CELL_PAD) {
      let cc = b.c + 1;
      while (cc <= grid.colCount) {
        const next = grid.cells[b.r - 1]![cc - 1];
        if ((next && next.text !== '') || grid.mergeAt(b.r, cc)) break;
        clipRight = xs[cc]!;
        cc++;
      }
    }
    const clipLeft = ha === 'left' ? b.x : b.x - 0.01; // à direita/centro: clipe no próprio retângulo
    // baseline: bottom-align do Excel (vertical center/top quando pedido)
    const upem = variant.program.unitsPerEm;
    const ascPt = (variant.program.ascender / upem) * size;
    const descPt = (-variant.program.descender / upem) * size;
    let baseline: number;
    if (xf?.vertical === 'top') baseline = b.y + CELL_VPAD + ascPt;
    else if (xf?.vertical === 'center') baseline = b.y + (b.h - ascPt - descPt) / 2 + ascPt;
    else baseline = b.y + b.h - CELL_VPAD - descPt;

    const glyphs: PlacedGlyph[] = [];
    let penX = startX;
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const { gid, advanceWidth } = variant.embedded.encode(cp);
      const adv = (advanceWidth * size) / upem;
      if (penX >= clipLeft && penX + adv <= clipRight + 0.01) {
        glyphs.push({ gid, codePoint: cp, xPt: penX, baselineFromTopPt: baseline });
      }
      penX += adv;
    }
    if (glyphs.length) page.glyphs(variant.embedded, size, color, glyphs);
  }
}
