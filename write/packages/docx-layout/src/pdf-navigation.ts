import type { FullDocument } from '@universal-office/docx-core';
import { documentOutline } from './outline.js';
import type { PdfLink, PdfOutlineItem } from './pdf-writer/index.js';
import { runBoxes } from './run-boxes.js';
import type { LayoutResult } from './tree.js';

const T = 20; // twips por ponto

/** Links clicáveis (por página) e marcadores do PDF — mesmo resultado do PdfNavigation do .NET. */
export interface PdfNavigation {
  links: { page: number; link: PdfLink }[];
  outline: PdfOutlineItem[];
}

const blockLine = (layout: LayoutResult, block: number): { page: number; y: number } | null => {
  const root = `b${block}`;
  for (let page = 0; page < layout.pages.length; page++) {
    const line = layout.pages[page]!.lines.find((l) => l.ref === root || l.ref.startsWith(`${root}/`));
    if (line) return { page, y: line.y };
  }
  return null;
};

/**
 * Hiperlinks do corpo viram áreas clicáveis (externos: /URI; indicadores:
 * destino interno) e os títulos (documentOutline — a regra do painel de
 * navegação do editor) viram marcadores, como o Word com "Criar indicadores
 * usando títulos".
 */
export function pdfNavigation(full: FullDocument, layout: LayoutResult): PdfNavigation {
  const links: PdfNavigation['links'] = [];
  for (const b of runBoxes(full, layout, (r) => (r.custom ? undefined : r.props.link))) {
    const rect = { xPt: b.x / T, yTopPt: b.y / T, wPt: b.w / T, hPt: b.h / T };
    if (b.value.startsWith('#')) {
      const block = full.bookmarks.get(b.value.slice(1));
      const target = block === undefined ? null : blockLine(layout, block);
      if (target) links.push({ page: b.page, link: { ...rect, pageIndex: target.page, destTopPt: target.y / T } });
    } else links.push({ page: b.page, link: { ...rect, uri: b.value } });
  }
  const outline: PdfOutlineItem[] = [];
  for (const h of documentOutline(full)) {
    const at = blockLine(layout, h.block);
    if (at) outline.push({ title: h.text, level: h.level, pageIndex: at.page, topPt: at.y / T });
  }
  return { links, outline };
}
