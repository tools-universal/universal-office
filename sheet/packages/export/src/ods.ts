/**
 * Export OpenDocument Spreadsheet (.ods) — v1.
 *
 * content.xml com valores TIPADOS (office:value-type) + texto exibido
 * (formatValue pt-BR) — assim o valor cru sobrevive e a exibição fica fiel
 * mesmo sem data-styles ODF (limitação v1: number:number-style não é gerado;
 * apps recalculam a exibição pelo próprio formato default ao reformatar).
 * Estilos básicos por célula: bold/italic/size/cor de fonte + fundo sólido.
 * Larguras de coluna e alturas de linha preservadas. Merges com
 * table:number-columns/rows-spanned + covered-table-cell.
 *
 * ZIP: parte "mimetype" PRIMEIRA e STORED (exigência da spec ODF) — mesmo
 * padrão do write/packages/odf.
 */
import { zipSync, strToU8, type Zippable } from 'fflate';
import { formatValue, refToRowCol, PT_BR } from '@universal/sheet-core';
import {
  loadModel, selectSheets, colWidthPx,
  type SheetExportInput, type SheetExportOptions, type SheetModel, type SelectedSheet,
} from './model.js';
import { typedValue, isoDate, isoDateTime, isoDuration, effectiveCode } from './cellvalue.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s: string): string => esc(s).replace(/"/g, '&quot;');

const MIMETYPE = 'application/vnd.oasis.opendocument.spreadsheet';

const OFFICE_NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
  'xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" ' +
  'office:version="1.2"';

/** px (MDW) → atributo de largura ODF em polegadas. */
const pxToIn = (px: number): string => `${(px / 96).toFixed(4)}in`;

interface CellStyleKey { bold?: boolean; italic?: boolean; size?: number; color?: string; bg?: string }

/** Exporta a pasta (todas as sheets visíveis, ou `opts.sheet`) para .ods. */
export function xlsxToOds(input: SheetExportInput, opts: SheetExportOptions = {}): Uint8Array {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, 'all');

  // ── estilos automáticos (colunas/linhas/células) ──
  const auto: string[] = [];
  const cellStyleIds = new Map<string, string>();
  const cellStyleFor = (model2: SheetModel, styleIdx: number | undefined): string | undefined => {
    if (styleIdx === undefined) return undefined;
    const xf = model2.styles.cellXfs[styleIdx];
    if (!xf) return undefined;
    const font = model2.styles.fonts[xf.fontId];
    const fill = model2.styles.fills[xf.fillId];
    const key: CellStyleKey = {
      bold: font?.bold, italic: font?.italic, size: font?.size, color: font?.color,
      bg: fill?.pattern === 'solid' ? fill.fgColor : undefined,
    };
    if (!key.bold && !key.italic && !key.size && !key.color && !key.bg) return undefined;
    const k = JSON.stringify(key);
    let id = cellStyleIds.get(k);
    if (!id) {
      id = `ce${cellStyleIds.size + 1}`;
      cellStyleIds.set(k, id);
      const txt: string[] = [];
      if (key.bold) txt.push('fo:font-weight="bold"');
      if (key.italic) txt.push('fo:font-style="italic"');
      if (key.size) txt.push(`fo:font-size="${key.size}pt"`);
      if (key.color) txt.push(`fo:color="${key.color}"`);
      const cellProps = key.bg ? `<style:table-cell-properties fo:background-color="${key.bg}"/>` : '';
      auto.push(
        `<style:style style:name="${id}" style:family="table-cell">` +
        cellProps +
        (txt.length ? `<style:text-properties ${txt.join(' ')}/>` : '') +
        '</style:style>',
      );
    }
    return id;
  };

  // ── tabelas ──
  const tables: string[] = [];
  let styleSeq = 0;
  for (const { name, ws } of sheets as SelectedSheet[]) {
    let maxCol = 0, maxRow = 0;
    for (const r of ws.rows) {
      if (r.r > maxRow) maxRow = r.r;
      for (const c of r.cells) {
        const { col } = refToRowCol(c.ref);
        if (col > maxCol) maxCol = col;
      }
    }
    // merges: origem → span; cobertas → covered-table-cell
    const spanAt = new Map<string, { cols: number; rows: number }>();
    const covered = new Set<string>();
    for (const range of ws.merges ?? []) {
      const [a, b] = range.split(':');
      if (!a || !b) continue;
      const s = refToRowCol(a), e = refToRowCol(b);
      spanAt.set(`${s.col},${s.row}`, { cols: e.col - s.col + 1, rows: e.row - s.row + 1 });
      // a grade densa precisa alcançar o merge mesmo sem células na área
      if (e.col > maxCol) maxCol = e.col;
      if (e.row > maxRow) maxRow = e.row;
      for (let rr = s.row; rr <= e.row; rr++) {
        for (let cc = s.col; cc <= e.col; cc++) {
          if (rr !== s.row || cc !== s.col) covered.add(`${cc},${rr}`);
        }
      }
    }
    if (maxCol === 0) maxCol = 1;
    if (maxRow === 0) maxRow = 1;

    // colunas: estilo de largura por coluna
    const colXml: string[] = [];
    const widthOf = (col: number): number | undefined => {
      for (const cd of ws.cols ?? []) {
        if (col >= cd.min && col <= cd.max && cd.width !== undefined) return colWidthPx(cd.width);
      }
      return undefined;
    };
    for (let c = 1; c <= maxCol; c++) {
      const px = widthOf(c);
      if (px !== undefined) {
        const id = `co${++styleSeq}`;
        auto.push(
          `<style:style style:name="${id}" style:family="table-column">` +
          `<style:table-column-properties style:column-width="${pxToIn(px)}"/></style:style>`,
        );
        colXml.push(`<table:table-column table:style-name="${id}"/>`);
      } else {
        colXml.push('<table:table-column/>');
      }
    }

    const rowByNum = new Map<number, typeof ws.rows[number]>();
    for (const r of ws.rows) rowByNum.set(r.r, r);

    const rowsXml: string[] = [];
    for (let rnum = 1; rnum <= maxRow; rnum++) {
      const row = rowByNum.get(rnum);
      let rowAttr = '';
      if (row?.height !== undefined) {
        const id = `ro${++styleSeq}`;
        auto.push(
          `<style:style style:name="${id}" style:family="table-row">` +
          `<style:table-row-properties style:row-height="${row.height}pt" style:use-optimal-row-height="false"/></style:style>`,
        );
        rowAttr = ` table:style-name="${id}"`;
      }
      const cellByCol = new Map<number, typeof ws.rows[number]['cells'][number]>();
      for (const c of row?.cells ?? []) cellByCol.set(refToRowCol(c.ref).col, c);

      const cells: string[] = [];
      for (let cnum = 1; cnum <= maxCol; cnum++) {
        if (covered.has(`${cnum},${rnum}`)) { cells.push('<table:covered-table-cell/>'); continue; }
        const cell = cellByCol.get(cnum);
        const tv = typedValue(cell, model, loc);
        const span = spanAt.get(`${cnum},${rnum}`);
        let attrs = '';
        if (span) attrs += ` table:number-columns-spanned="${span.cols}" table:number-rows-spanned="${span.rows}"`;
        const styleId = cell ? cellStyleFor(model, cell.style) : undefined;
        if (styleId) attrs += ` table:style-name="${styleId}"`;
        if (tv.formula !== undefined) attrs += ` table:formula="of:=${escA(tv.formula)}"`;

        let text = '';
        if (cell) {
          if (tv.kind === 'number' || tv.kind === 'date' || tv.kind === 'time') {
            text = formatValue(tv.num!, effectiveCode(cell, model, loc), { locale: loc, date1904: model.workbook.date1904 }).text;
          } else if (tv.kind === 'boolean') text = tv.bool ? 'VERDADEIRO' : 'FALSO';
          else text = tv.str ?? '';
        }

        switch (tv.kind) {
          case 'number':
            attrs += ` office:value-type="float" office:value="${tv.num}"`;
            break;
          case 'date':
            attrs += ` office:value-type="date" office:date-value="${(tv.num! % 1) ? isoDateTime(tv.date!) : isoDate(tv.date!)}"`;
            break;
          case 'time':
            attrs += ` office:value-type="time" office:time-value="${isoDuration(tv.num!)}"`;
            break;
          case 'boolean':
            attrs += ` office:value-type="boolean" office:boolean-value="${tv.bool}"`;
            break;
          case 'string':
          case 'error':
            if (text !== '') attrs += ' office:value-type="string"';
            break;
          case 'empty':
            break;
        }
        cells.push(text !== ''
          ? `<table:table-cell${attrs}><text:p>${esc(text)}</text:p></table:table-cell>`
          : `<table:table-cell${attrs}/>`);
      }
      rowsXml.push(`<table:table-row${rowAttr}>${cells.join('')}</table:table-row>`);
    }

    tables.push(
      `<table:table table:name="${escA(name)}">${colXml.join('')}${rowsXml.join('')}</table:table>`,
    );
  }

  const content =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<office:document-content ${OFFICE_NS}>` +
    `<office:automatic-styles>${auto.join('')}</office:automatic-styles>` +
    `<office:body><office:spreadsheet>${tables.join('')}</office:spreadsheet></office:body>` +
    '</office:document-content>';

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<office:document-styles ${OFFICE_NS}><office:styles/></office:document-styles>`;

  const manifest =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    `<manifest:file-entry manifest:full-path="/" manifest:media-type="${MIMETYPE}"/>` +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '</manifest:manifest>';

  const files: Zippable = {
    // mimetype PRIMEIRO e sem compressão (spec ODF)
    'mimetype': [strToU8(MIMETYPE), { level: 0 }],
    'content.xml': strToU8(content),
    'styles.xml': strToU8(stylesXml),
    'META-INF/manifest.xml': strToU8(manifest),
  };
  return zipSync(files, { level: 6 });
}
