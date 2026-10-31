/**
 * Export Markdown (GFM): `## <nome da sheet>` + tabela por planilha.
 * Primeira linha usada = header; merges com o valor no topo-esquerdo e células
 * absorvidas vazias; coluna com maioria numérica alinha à direita (`---:`);
 * `|` escapado e quebras de linha viram `<br>`.
 */
import { PT_BR } from '@universal-office/sheets-processing';
import {
  loadModel, selectSheets, buildGrid,
  type SheetExportInput, type SheetExportOptions, type SheetGrid,
} from './model.js';

function mdEscape(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>');
}

/** Texto da célula na tabela: absorvidas por merge ficam vazias. */
function cellText(grid: SheetGrid, r: number, c: number): string {
  const merge = grid.mergeAt(r, c);
  if (merge && (merge.r0 !== r || merge.c0 !== c)) return '';
  return mdEscape(grid.cells[r - 1]![c - 1]?.text ?? '');
}

function sheetToMarkdown(grid: SheetGrid): string {
  const out: string[] = [`## ${grid.name}`];
  if (grid.rowCount === 0) return out.join('\n');

  // primeira linha usada = header
  let headerRow = 1;
  for (let r = 1; r <= grid.rowCount; r++) {
    if (grid.cells[r - 1]!.some((c) => c !== undefined)) { headerRow = r; break; }
  }

  // alinhamento por coluna: direita quando a MAIORIA das células de dados
  // não-vazias é numérica
  const aligns: string[] = [];
  for (let c = 1; c <= grid.colCount; c++) {
    let numeric = 0;
    let nonEmpty = 0;
    for (let r = headerRow + 1; r <= grid.rowCount; r++) {
      const gc = grid.cells[r - 1]![c - 1];
      if (!gc || gc.text === '') continue;
      nonEmpty++;
      if (gc.numeric) numeric++;
    }
    aligns.push(nonEmpty > 0 && numeric * 2 > nonEmpty ? '---:' : '---');
  }

  const rowLine = (r: number): string => {
    const fields: string[] = [];
    for (let c = 1; c <= grid.colCount; c++) fields.push(cellText(grid, r, c));
    return `| ${fields.join(' | ')} |`;
  };

  out.push('');
  out.push(rowLine(headerRow));
  out.push(`| ${aligns.join(' | ')} |`);
  for (let r = headerRow + 1; r <= grid.rowCount; r++) out.push(rowLine(r));
  return out.join('\n');
}

/** Exporta para Markdown. Default: todas as planilhas visíveis. */
export function xlsxToMarkdown(input: SheetExportInput, opts: SheetExportOptions = {}): string {
  const model = loadModel(input);
  const loc = opts.locale ?? PT_BR;
  const sheets = selectSheets(model, opts.sheet, 'all');
  return sheets
    .map((sel) => sheetToMarkdown(buildGrid(model, sel, loc)))
    .join('\n\n') + '\n';
}
