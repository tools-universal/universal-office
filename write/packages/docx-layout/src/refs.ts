import type { Block, Paragraph, TableBlock, TableCell } from '@universal-office/docx-core';

/**
 * Navegação pelas referências das linhas do motor (LaidOutLine.ref:
 * "b12", "b3/r0/c1/b0"…) de volta aos parágrafos do documento — usada pelo
 * editor (<universal-write>) e pelo viewer (<universal-document-viewer>).
 */

/** Célula da linha `r` que começa na coluna `c` da grade (gridBefore + spans). */
export function cellAtGrid(t: TableBlock, r: number, c: number): TableCell | null {
  const row = t.rows[r];
  if (!row) return null;
  let col = row.trPr?.gridBefore ?? 0;
  for (const cell of row.cells) {
    if (col === c) return cell;
    col += Math.max(1, cell.tcPr?.gridSpan ?? cell.gridSpan ?? 1);
  }
  return null;
}

/** Blocos de uma célula na ordem (como o motor os lê). */
export function cellBlocks(cell: TableCell): Block[] {
  return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }));
}

/** Parágrafo no caminho "b<i>[/r<r>/c<c>/b<k>…]" de uma lista de blocos. */
export function paragraphAtPath(blocks: readonly Block[], path: readonly string[]): Paragraph | null {
  let list: readonly Block[] = blocks;
  for (let i = 0; i < path.length; i += 3) {
    const b = /^b(\d+)$/.exec(path[i] ?? '');
    const blk = b ? list[+b[1]!] : undefined;
    if (!blk) return null;
    if (i + 1 >= path.length) return blk.type === 'paragraph' ? blk.paragraph : null;
    const r = /^r(\d+)$/.exec(path[i + 1] ?? ''), c = /^c(\d+)$/.exec(path[i + 2] ?? '');
    if (blk.type !== 'table' || !r || !c) return null;
    const cell = cellAtGrid(blk, +r[1]!, +c[1]!);
    if (!cell) return null;
    list = cellBlocks(cell);
  }
  return null;
}
