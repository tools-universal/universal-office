/**
 * Export CSV/TSV — paridade com "Salvar como CSV" do Excel pt-BR:
 * valor FORMATADO (o que o usuário vê), delimitador `;` (decimal é vírgula!),
 * CRLF entre linhas, quoting RFC 4180 (aspas quando contém delimitador, aspas,
 * \r ou \n; aspas duplicadas). TSV usa o MESMO esquema de quoting com tab.
 */
import { PT_BR } from '../core.js';
import {
  loadModel, selectSheets, buildGrid,
  type SheetExportInput, type SheetExportOptions,
} from './model.js';

export interface CsvOptions extends SheetExportOptions {
  /** Delimitador de campo. Default `;` (fidelidade pt-BR); use ',' se quiser. */
  delimiter?: string;
}

/** Escapa um campo segundo RFC 4180 (aspas duplicadas, campo entre aspas). */
function csvField(text: string, delimiter: string): string {
  if (text === '') return '';
  if (text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Exporta UMA planilha (default: a ativa) para CSV. Grade densa: células
 * ausentes viram campos vazios, linhas puladas viram linhas vazias.
 */
export function xlsxToCsv(input: SheetExportInput, opts: CsvOptions = {}): string {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const delimiter = opts.delimiter ?? ';';
  const sel = selectSheets(model, opts.sheet, 'active')[0]!;
  const grid = buildGrid(model, sel, loc);
  const lines: string[] = [];
  for (let r = 1; r <= grid.rowCount; r++) {
    const fields: string[] = [];
    for (let c = 1; c <= grid.colCount; c++) {
      fields.push(csvField(grid.cells[r - 1]![c - 1]?.text ?? '', delimiter));
    }
    lines.push(fields.join(delimiter));
  }
  // Excel termina o arquivo com CRLF após a última linha (verificado nos bytes
  // de um SaveAs xlCSV via COM)
  return lines.length ? lines.join('\r\n') + '\r\n' : '';
}

/** Atalho: CSV com delimitador tab (mesmo quoting — o Excel também o faz em TSV). */
export function xlsxToTsv(input: SheetExportInput, opts: SheetExportOptions = {}): string {
  return xlsxToCsv(input, { ...opts, delimiter: '\t' });
}
