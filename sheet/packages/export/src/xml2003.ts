/**
 * Export SpreadsheetML 2003 (.xml) — o "XML Spreadsheet" clássico que o Excel
 * abre nativamente (<?mso-application progid="Excel.Sheet"?>).
 *
 * v1: valores tipados (ss:Type Number/String/Boolean/DateTime), formato de
 * número via ss:Format (o próprio formatCode OOXML — o Excel entende), estilos
 * básicos (bold/italic/size/cor + fundo sólido + alinhamento), larguras de
 * coluna e alturas de linha em pontos, merges (ss:MergeAcross/MergeDown).
 * Fórmulas NÃO são emitidas (SpreadsheetML usa R1C1; converter A1→R1C1 fica
 * fora do v1) — vai o valor cacheado, como no CSV.
 */
import { refToRowCol, PT_BR } from '@universal/sheet-core';
import {
  loadModel, selectSheets, colWidthPx,
  type SheetExportInput, type SheetExportOptions,
} from './model.js';
import { typedValue, isoDateTime, effectiveCode } from './cellvalue.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s: string): string => esc(s).replace(/"/g, '&quot;');

// SpreadsheetML usa PONTOS (px da fórmula MDW × 72/96)
const colWidthPt = (width: number): number => Math.round(colWidthPx(width) * 72 / 96 * 100) / 100;

/** Exporta a pasta (todas as sheets visíveis, ou `opts.sheet`) para XML 2003. */
export function xlsxToXml2003(input: SheetExportInput, opts: SheetExportOptions = {}): string {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, 'all');

  // ── estilos: um <Style> por cellXf usado ──
  const usedStyles = new Set<number>();
  for (const { ws } of sheets) {
    for (const r of ws.rows) for (const c of r.cells) if (c.style !== undefined) usedStyles.add(c.style);
  }
  const styleXml: string[] = [];
  for (const idx of [...usedStyles].sort((a, b) => a - b)) {
    const xf = model.styles.cellXfs[idx];
    if (!xf) continue;
    const font = model.styles.fonts[xf.fontId];
    const fill = model.styles.fills[xf.fillId];
    const code = model.styles.numFmts.get(xf.numFmtId);
    const parts: string[] = [];
    if (font) {
      const fa: string[] = [];
      if (font.bold) fa.push('ss:Bold="1"');
      if (font.italic) fa.push('ss:Italic="1"');
      if (font.underline) fa.push('ss:Underline="Single"');
      if (font.size) fa.push(`ss:Size="${font.size}"`);
      if (font.color) fa.push(`ss:Color="${font.color}"`);
      if (font.name) fa.push(`ss:FontName="${escA(font.name)}"`);
      if (fa.length) parts.push(`<Font ${fa.join(' ')}/>`);
    }
    if (fill?.pattern === 'solid' && fill.fgColor) {
      parts.push(`<Interior ss:Color="${fill.fgColor}" ss:Pattern="Solid"/>`);
    }
    if (xf.horizontal || xf.vertical) {
      const aa: string[] = [];
      if (xf.horizontal) aa.push(`ss:Horizontal="${xf.horizontal[0]!.toUpperCase()}${xf.horizontal.slice(1)}"`);
      if (xf.vertical) aa.push(`ss:Vertical="${xf.vertical[0]!.toUpperCase()}${xf.vertical.slice(1)}"`);
      parts.push(`<Alignment ${aa.join(' ')}/>`);
    }
    if (code) parts.push(`<NumberFormat ss:Format="${escA(code)}"/>`);
    styleXml.push(`<Style ss:ID="s${idx}">${parts.join('')}</Style>`);
  }

  // estilos de data implícitos (célula sem estilo próprio), dedup por código
  const dateStyleByCode = new Map<string, string>();

  // ── worksheets ──
  const wsXml: string[] = [];
  for (const { name, ws } of sheets) {
    // merges
    const spanAt = new Map<string, { across: number; down: number }>();
    const covered = new Set<string>();
    for (const range of ws.merges ?? []) {
      const [a, b] = range.split(':');
      if (!a || !b) continue;
      const s = refToRowCol(a), e = refToRowCol(b);
      spanAt.set(`${s.col},${s.row}`, { across: e.col - s.col, down: e.row - s.row });
      for (let rr = s.row; rr <= e.row; rr++) {
        for (let cc = s.col; cc <= e.col; cc++) {
          if (rr !== s.row || cc !== s.col) covered.add(`${cc},${rr}`);
        }
      }
    }

    const cols: string[] = [];
    for (const cd of ws.cols ?? []) {
      if (cd.width === undefined) continue;
      cols.push(
        `<Column ss:Index="${cd.min}"` +
        (cd.max > cd.min ? ` ss:Span="${cd.max - cd.min}"` : '') +
        ` ss:Width="${colWidthPt(cd.width)}" ss:AutoFitWidth="0"/>`,
      );
    }

    const rows: string[] = [];
    let lastRow = 0;
    for (const r of [...ws.rows].sort((a, b) => a.r - b.r)) {
      let rAttr = '';
      if (r.r !== lastRow + 1) rAttr += ` ss:Index="${r.r}"`;
      lastRow = r.r;
      if (r.height !== undefined) rAttr += ` ss:Height="${r.height}" ss:AutoFitHeight="0"`;
      const cells: string[] = [];
      let lastCol = 0;
      for (const c of r.cells) {
        const { col } = refToRowCol(c.ref);
        if (covered.has(`${col},${r.r}`)) { continue; }
        const tv = typedValue(c, model, loc);
        let cAttr = '';
        if (col !== lastCol + 1) cAttr += ` ss:Index="${col}"`;
        lastCol = col;
        const span = spanAt.get(`${col},${r.r}`);
        if (span?.across) cAttr += ` ss:MergeAcross="${span.across}"`;
        if (span?.down) cAttr += ` ss:MergeDown="${span.down}"`;
        if (c.style !== undefined && usedStyles.has(c.style)) cAttr += ` ss:StyleID="s${c.style}"`;

        let data = '';
        switch (tv.kind) {
          case 'number':
            data = `<Data ss:Type="Number">${tv.num}</Data>`;
            break;
          case 'date':
          case 'time': {
            data = `<Data ss:Type="DateTime">${isoDateTime(tv.date!)}.000</Data>`;
            // DateTime sem NumberFormat vira serial na exibição — garante um
            if (!cAttr.includes('ss:StyleID')) {
              const code = effectiveCode(c, model, loc);
              let sid = dateStyleByCode.get(code);
              if (!sid) {
                sid = `d${dateStyleByCode.size + 1}`;
                dateStyleByCode.set(code, sid);
                styleXml.push(`<Style ss:ID="${sid}"><NumberFormat ss:Format="${escA(code)}"/></Style>`);
              }
              cAttr += ` ss:StyleID="${sid}"`;
            }
            break;
          }
          case 'boolean':
            data = `<Data ss:Type="Boolean">${tv.bool ? 1 : 0}</Data>`;
            break;
          case 'error':
            data = `<Data ss:Type="Error">${esc(tv.str ?? '')}</Data>`;
            break;
          case 'string':
            data = `<Data ss:Type="String">${esc(tv.str ?? '')}</Data>`;
            break;
          case 'empty':
            break;
        }
        cells.push(`<Cell${cAttr}>${data}</Cell>`);
      }
      rows.push(`<Row${rAttr}>${cells.join('')}</Row>`);
    }

    wsXml.push(
      `<Worksheet ss:Name="${escA(name)}"><Table>${cols.join('')}${rows.join('')}</Table></Worksheet>`,
    );
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ' +
    'xmlns:html="http://www.w3.org/TR/REC-html40">' +
    `<Styles><Style ss:ID="Default" ss:Name="Normal"/>${styleXml.join('')}</Styles>` +
    wsXml.join('') +
    '</Workbook>'
  );
}
