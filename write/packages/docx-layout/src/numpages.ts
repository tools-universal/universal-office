import type { Paragraph } from '@universal-office/docx-core';

/** w:docPartGallery das folhas de rosto da galeria do Word (Inserir > Folha de Rosto). */
export const COVER_PAGES_GALLERY = 'Cover Pages';

/** O corpo tem uma folha de rosto da galeria: sdt de bloco com
 *  docPartGallery "Cover Pages" (marca ParaProps.blockSdt dos parágrafos). */
export function hasCoverPage(paragraphs: Iterable<Paragraph>): boolean {
  for (const p of paragraphs) if (p.props.blockSdt?.gallery === COVER_PAGES_GALLERY) return true;
  return false;
}

/**
 * Valor exibido do campo NUMPAGES. O Word conta as páginas físicas, MENOS UMA
 * quando o corpo tem uma folha de rosto da galeria E a 1ª seção começa a
 * numeração em 0 (w:pgNumType w:start="0" — o que o Word grava ao inserir a
 * folha de rosto). Medido no Word 365 (etica.docx, 8 páginas, capa da galeria,
 * start=0 → "1 de 7"):
 * - sem a galeria ("Quick Parts"), com start ausente/1/2/5 ou start=0 só numa
 *   seção posterior (inclusive a que abre na capa): páginas físicas;
 * - titlePg, docPartUnique, a capa fora da 1ª página ou no fim do documento,
 *   capa de duas páginas, duas seções (a 2ª reiniciando em 1 ou continuando):
 *   não mudam o desconto, que é sempre de uma página;
 * - SECTIONPAGES não tem desconto.
 * O total de páginas da diagramação (estabilidade das passadas) continua o físico;
 * a fórmula { = { NUMPAGES } - 1 } vê o valor descontado, como no Word.
 */
export function numPagesShown(pages: number, firstPageNumber: number, coverPage: boolean): number {
  return coverPage && firstPageNumber === 0 ? pages - 1 : pages;
}
