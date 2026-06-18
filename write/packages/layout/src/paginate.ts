import type { SfntFont } from './font/sfnt.js';
import { breakParagraph, type LineBox } from './linebreak.js';
import { lineHeightPt, type LineSpacing } from './lineheight.js';
import { TWIPS_PER_PT } from './units.js';

/** Geometria da página em twips (espelha w:sectPr). */
export interface SectionGeometry {
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
}

/** A4 + margens do Normal.dotm desta máquina (ver probe). */
export const DEFAULT_SECTION: SectionGeometry = {
  pageWidth: 11906,
  pageHeight: 16838,
  marginLeft: 1701,
  marginRight: 1701,
  marginTop: 1417,
  marginBottom: 1417,
};

export interface ParagraphInput {
  text: string;
  font: SfntFont;
  sizePt: number;
  spacing: LineSpacing;
  /** w:spacing w:after em twips (Normal atual: 160tw = 8pt). */
  spaceAfterTwips: number;
}

export interface PositionedLine {
  paragraphIndex: number;
  line: LineBox;
  /** Posição do canto superior esquerdo da linha, em twips, relativa à página. */
  xTwips: number;
  yTwips: number;
  heightTwips: number;
  text: string;
  sizePt: number;
  font: SfntFont;
}

export interface Page {
  lines: PositionedLine[];
}

/**
 * Paginação v1: parágrafos simples, uma coluna, sem viúvas/órfãs ainda
 * (o Word ativa widow/orphan control por padrão — TODO experimento).
 */
export function paginate(paragraphs: ParagraphInput[], sect: SectionGeometry): Page[] {
  const availWidth = sect.pageWidth - sect.marginLeft - sect.marginRight;
  const contentBottom = sect.pageHeight - sect.marginBottom;

  const pages: Page[] = [{ lines: [] }];
  let y = sect.marginTop;

  paragraphs.forEach((para, pi) => {
    const lh = lineHeightPt(para.font, para.sizePt, para.spacing) * TWIPS_PER_PT;
    const lines = breakParagraph(para.text, {
      font: para.font,
      sizePt: para.sizePt,
      availableTwips: availWidth,
    });
    for (const line of lines) {
      if (y + lh > contentBottom) {
        pages.push({ lines: [] });
        y = sect.marginTop;
      }
      pages[pages.length - 1]!.lines.push({
        paragraphIndex: pi,
        line,
        xTwips: sect.marginLeft,
        yTwips: y,
        heightTwips: lh,
        text: para.text.slice(line.start, line.end),
        sizePt: para.sizePt,
        font: para.font,
      });
      y += lh;
    }
    y += para.spaceAfterTwips;
  });
  return pages;
}
