// Caminho standalone: bytes .docx → ExportDoc → Markdown/HTML.
// Permite exportar sem o editor (node/CLI/browser), a partir do arquivo.
import {
  DocxPackage,
  readFullDocument,
  type FullDocument,
  type Paragraph,
  type TableBlock,
} from '@universal-office/docx-core';
import { type ExportDoc } from './model.js';
import { type MarkdownOptions } from './markdown.js';
import { type HtmlOptions } from './html.js';
import {
  docxToMarkdown as convertDocxToMarkdown,
  docxToHtml as convertDocxToHtml,
} from '@tools-universal/office-converter';

/**
 * Converte o modelo completo (readFullDocument) para a entrada dos
 * exportadores. Tabelas viram âncoras "antes do parágrafo N", preservando a
 * ordem original dos blocos.
 *
 * `title` NÃO é preenchido: parágrafos Title/Heading já são renderizados como
 * títulos pelos exportadores — preencher duplicaria o texto.
 */
export function exportDocFromFullDocument(full: FullDocument): ExportDoc {
  const paragraphs: Paragraph[] = [];
  const tableAnchors: { beforePara: number; table: TableBlock }[] = [];
  for (const b of full.blocks) {
    if (b.type === 'paragraph') paragraphs.push(b.paragraph);
    else tableAnchors.push({ beforePara: paragraphs.length, table: b });
  }
  return {
    paragraphs,
    tableAnchors,
    comments: full.comments,
    footnotes: full.footnotes,
    endnotes: full.endnotes,
    sectPr: full.sections[0]?.sectPr,
  };
}

/** Exporta bytes de um .docx diretamente para Markdown (GFM). */
export function docxToMarkdown(bytes: Uint8Array, opts: MarkdownOptions = {}): string {
  return convertDocxToMarkdown(bytes, opts);
}

/** Exporta bytes de um .docx diretamente para HTML. */
export function docxToHtml(bytes: Uint8Array, opts: HtmlOptions = {}): string {
  return convertDocxToHtml(bytes, opts);
}
