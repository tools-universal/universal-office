// Consultas sobre o CONTEÚDO do documento (blocos do corpo): está vazio?
// quais links e quais inlines de plugin ele tem? Usadas pelo editor e pelo
// viewer (APIs isEmpty, getLinks, getCustomInlines) — o hospedeiro valida
// conteúdo obrigatório e marca links quebrados sem ler o OOXML.
import type { CustomInline, Paragraph, Run } from './document.js';
import type { Block, TableBlock, TableCell } from './fulldoc.js';

/** Link do documento: `address` (externo: http, mailto…) ou `anchor` (indicador interno). */
export interface DocumentLink {
  address?: string;
  anchor?: string;
  /** texto visível do link (runs vizinhos com o mesmo alvo juntos) */
  text: string;
}

const cellBlocks = (cell: TableCell): readonly Block[] =>
  cell.blocks ?? [
    ...cell.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph })),
    ...cell.tables,
  ];

/** Parágrafos na ordem do documento: corpo, células (aninhadas inclusive) e caixas de texto. */
function* paragraphsOf(blocks: readonly Block[]): Generator<Paragraph> {
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      yield b.paragraph;
      for (const r of b.paragraph.runs) if (r.textbox?.blocks) yield* paragraphsOf(r.textbox.blocks);
    } else yield* tableParagraphs(b);
  }
}

function* tableParagraphs(t: TableBlock): Generator<Paragraph> {
  for (const row of t.rows) for (const cell of row.cells) yield* paragraphsOf(cellBlocks(cell));
}

const hasTable = (blocks: readonly Block[]): boolean => blocks.some((b) => b.type === 'table');

/** O run mostra conteúdo (texto que não é só espaço, imagem, inline de plugin, nota, forma)? */
function runHasContent(r: Run): boolean {
  if (r.textbox) return false; // conta pelo conteúdo (paragraphsOf entra nele)
  if (r.image || r.custom || r.noteRef || r.shape || r.group) return true;
  return r.text.replace(/￼/g, '').trim().length > 0;
}

/**
 * Documento sem conteúdo: nenhuma tabela, e nenhum texto visível, imagem,
 * forma, inline de plugin ou nota nos parágrafos (caixas de texto pelo conteúdo).
 */
export function documentIsEmpty(blocks: readonly Block[]): boolean {
  if (hasTable(blocks)) return false;
  for (const para of paragraphsOf(blocks)) {
    if (para.runs.some(runHasContent)) return false;
  }
  return true;
}

/** Links do documento na ordem em que aparecem. */
export function documentLinks(blocks: readonly Block[]): DocumentLink[] {
  const out: DocumentLink[] = [];
  for (const para of paragraphsOf(blocks)) {
    let current: { target: string; link: DocumentLink } | null = null;
    for (const r of para.runs) {
      const target = r.custom ? undefined : r.props.link;
      if (!target) { current = null; continue; }
      if (current && current.target === target) { current.link.text += r.text; continue; }
      const link: DocumentLink = target.startsWith('#')
        ? { anchor: target.slice(1), text: r.text }
        : { address: target, text: r.text };
      out.push(link);
      current = { target, link };
    }
  }
  return out;
}

/** Inlines de plugin do documento na ordem em que aparecem (todos, ou só de um tipo). */
export function documentCustomInlines(blocks: readonly Block[], type?: string): CustomInline[] {
  const out: CustomInline[] = [];
  for (const para of paragraphsOf(blocks)) {
    for (const r of para.runs) {
      if (r.custom && (type === undefined || r.custom.type === type)) {
        out.push({ type: r.custom.type, data: r.custom.data, fallbackText: r.custom.fallbackText });
      }
    }
  }
  return out;
}
