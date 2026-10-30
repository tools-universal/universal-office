import { XlsxPackage } from './package.js';

/**
 * Pasta de trabalho EM BRANCO (Arquivo › Novo): o pacote mínimo do
 * XlsxPackage.empty() com um styles.xml completo — fontes, preenchimentos,
 * bordas, estilo de célula "Normal" e o xf 0 —, para que formatar células
 * acrescente fontes/preenchimentos/bordas como numa pasta criada no Excel.
 * Fonte Normal: Aptos Narrow 11, a do Excel 365 (larguras pela tabela medida
 * em grid-metrics); o .xlsx não guarda a fonte, só o nome.
 */
export interface BlankWorkbookOptions {
  /** nome da 1ª aba (o Excel pt-BR usa "Planilha1"; o inglês, "Sheet1") */
  sheetName?: string;
  /** fonte Normal (estilo 0) */
  font?: { name: string; size: number };
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function blankWorkbook(opts: BlankWorkbookOptions = {}): XlsxPackage {
  const pkg = XlsxPackage.empty();
  const name = (opts.sheetName ?? 'Sheet1').slice(0, 31);
  const font = opts.font ?? { name: 'Aptos Narrow', size: 11 };
  pkg.setPartText('xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<bookViews><workbookView activeTab="0"/></bookViews>'
    + `<sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets>`
    + '<calcPr calcId="191029"/>'
    + '</workbook>');
  pkg.setPartText('xl/worksheets/sheet1.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<dimension ref="A1"/>'
    + '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + '<sheetData/>'
    + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    + '</worksheet>');
  pkg.setPartText('xl/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<fonts count="1"><font><sz val="${font.size}"/><color theme="1"/><name val="${esc(font.name)}"/><family val="2"/></font></fonts>`
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '<dxfs count="0"/><tableStyles count="0"/>'
    + '</styleSheet>');
  return pkg;
}

/** Bytes .xlsx da pasta em branco (ver {@link blankWorkbook}). */
export function blankXlsx(opts: BlankWorkbookOptions = {}): Uint8Array {
  return blankWorkbook(opts).save();
}
