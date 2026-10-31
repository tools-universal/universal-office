/**
 * Export HTML: uma `<table>` por planilha com estilos inline — fills, bordas,
 * fonte (bold/italic/size/color/name), alinhamento, merges via colspan/rowspan
 * e larguras de coluna em px pela fórmula MDW (paridade com o componente).
 * `fullDocument: true` embrulha em HTML5 com `<meta charset>`.
 */
import { PT_BR, type Styles, type BorderEdge, type CellXf } from '@universal-office/sheets-processing';
import {
  loadModel, selectSheets, buildGrid, colWidthsPx, rowHeightsPt, fillColor,
  type SheetExportInput, type SheetExportOptions, type SheetGrid, type SheetModel, type GridCell,
} from './model.js';

export interface HtmlOptions extends SheetExportOptions {
  /** true = documento HTML5 completo (`<!DOCTYPE html>` + `<meta charset>`). */
  fullDocument?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texto da célula com entidades escapadas e quebras → <br>. */
function htmlText(text: string): string {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
}

/** Borda CSS de uma aresta OOXML (espessura aproximada por estilo). */
function borderCss(edge: BorderEdge): string {
  const style = edge.style ?? 'thin';
  const map: Record<string, string> = {
    thin: '1px solid', hair: '1px solid', dotted: '1px dotted', dashed: '1px dashed',
    dashDot: '1px dashed', dashDotDot: '1px dashed',
    medium: '2px solid', mediumDashed: '2px dashed', mediumDashDot: '2px dashed',
    mediumDashDotDot: '2px dashed', slantDashDot: '2px dashed',
    thick: '3px solid', double: '3px double',
  };
  return `${map[style] ?? '1px solid'} ${edge.color ?? '#000000'}`;
}

/** CSS inline da célula a partir do cellXf (fill/borda/fonte/alinhamento). */
function cellCss(gc: GridCell | undefined, styles: Styles): string {
  const parts: string[] = [];
  const xf: CellXf | undefined = gc?.xf !== undefined ? styles.cellXfs[gc.xf] : undefined;
  const font = xf ? styles.fonts[xf.fontId] : undefined;
  const bg = fillColor(xf ? styles.fills[xf.fillId] : undefined);
  if (bg) parts.push(`background-color:${bg}`);
  const border = xf ? styles.borders[xf.borderId] : undefined;
  if (border?.top) parts.push(`border-top:${borderCss(border.top)}`);
  if (border?.right) parts.push(`border-right:${borderCss(border.right)}`);
  if (border?.bottom) parts.push(`border-bottom:${borderCss(border.bottom)}`);
  if (border?.left) parts.push(`border-left:${borderCss(border.left)}`);
  if (font?.bold) parts.push('font-weight:700');
  if (font?.italic) parts.push('font-style:italic');
  if (font?.size !== undefined) parts.push(`font-size:${font.size}pt`);
  if (font?.name) parts.push(`font-family:'${font.name}'`);
  const deco: string[] = [];
  if (font?.underline) deco.push('underline');
  if (font?.strike) deco.push('line-through');
  if (deco.length) parts.push(`text-decoration:${deco.join(' ')}`);
  // cor do numFmt (ex.: [Red] em negativos) tem prioridade sobre a da fonte
  const color = gc?.color ?? font?.color;
  if (color) parts.push(`color:${color}`);
  // alinhamento: explícito do xf; General alinha números/datas à direita
  let ha = xf?.horizontal;
  if (ha === 'general') ha = undefined;
  if (ha === 'centerContinuous') ha = 'center';
  if (ha === 'fill') ha = 'left';
  if (!ha && gc?.numeric) ha = 'right';
  if (ha) parts.push(`text-align:${ha}`);
  if (xf?.vertical === 'top') parts.push('vertical-align:top');
  else if (xf?.vertical === 'center') parts.push('vertical-align:middle');
  if (xf?.wrapText) parts.push('white-space:pre-wrap');
  return parts.join(';');
}

function sheetToHtml(model: SheetModel, grid: SheetGrid, heading: boolean): string {
  const out: string[] = [];
  if (heading) out.push(`<h2>${escapeHtml(grid.name)}</h2>`);
  out.push('<table style="border-collapse:collapse;font-family:\'Aptos Narrow\',Calibri,sans-serif;font-size:11pt">');
  if (grid.colCount > 0) {
    const widths = colWidthsPx(grid.ws, grid.colCount);
    out.push(`<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join('')}</colgroup>`);
  }
  const heights = rowHeightsPt(grid.ws, grid.rowCount);
  out.push('<tbody>');
  for (let r = 1; r <= grid.rowCount; r++) {
    const tds: string[] = [];
    for (let c = 1; c <= grid.colCount; c++) {
      const merge = grid.mergeAt(r, c);
      if (merge && (merge.r0 !== r || merge.c0 !== c)) continue; // absorvida
      const gc = grid.cells[r - 1]![c - 1];
      const attrs: string[] = [];
      if (merge) {
        const colspan = merge.c1 - merge.c0 + 1;
        const rowspan = merge.r1 - merge.r0 + 1;
        if (colspan > 1) attrs.push(`colspan="${colspan}"`);
        if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
      }
      const css = cellCss(gc, model.styles);
      if (css) attrs.push(`style="${css}"`);
      tds.push(`<td${attrs.length ? ' ' + attrs.join(' ') : ''}>${htmlText(gc?.text ?? '')}</td>`);
    }
    out.push(`<tr style="height:${heights[r - 1]}pt">${tds.join('')}</tr>`);
  }
  out.push('</tbody>');
  out.push('</table>');
  return out.join('\n');
}

/** Exporta para HTML. Default: todas as planilhas visíveis (uma tabela cada). */
export function xlsxToHtml(input: SheetExportInput, opts: HtmlOptions = {}): string {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, 'all');
  // <h2> por planilha só quando o export tem mais de uma (evita ruído no caso comum)
  const heading = sheets.length > 1;
  const body = sheets
    .map((sel) => sheetToHtml(model, buildGrid(model, sel, loc), heading))
    .join('\n');
  if (!opts.fullDocument) return body;
  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head><meta charset="utf-8"><title>Planilha</title></head>',
    '<body>',
    body,
    '</body>',
    '</html>',
  ].join('\n');
}
