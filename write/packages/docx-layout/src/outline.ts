import type { Block, FullDocument, Paragraph } from '@universal-office/docx-core';
import { DocContext, directRPr, emptyFormatting } from './context.js';
import { resolvePPr } from './para.js';
import { cascadeRPr } from './resolve.js';
import { cellBlocks } from './refs.js';

/**
 * Árvore de TÍTULOS do documento (aba Títulos do Painel de Navegação), como o
 * Word a monta — conferido no corpus contra Paragraph.OutlineLevel e o texto
 * do Range (tools/nav-lab/run-headings.mjs):
 *  - entram os parágrafos do CORPO (fora de tabela) com nível de tópico 1–9:
 *    w:outlineLvl 0–8 direto, do estilo (cadeia basedOn) ou do nível da lista;
 *  - parágrafo sem texto não entra;
 *  - o texto é o da numeração (o marcador da lista) seguido do texto do
 *    parágrafo — com "Todas em maiúsculas" (w:caps) aplicado, como o Word o
 *    devolve —, sem objetos, com tabulações e quebras viradas espaço.
 */
export interface OutlineHeading {
  /** índice do bloco em `full.blocks` */
  block: number;
  /** nível de tópico 1–9 */
  level: number;
  /** número da lista + texto, como o painel mostra */
  text: string;
  /** só o número da lista (vazio sem numeração) */
  number: string;
}

const NO_FONTS = { face: () => null };

/** Texto exibido do parágrafo (sem objetos, sem o texto excluído em revisão).
 *  `caps(run)`: o run está em "Todas em maiúsculas". */
export function headingText(p: Paragraph, caps?: (r: Paragraph['runs'][number]) => boolean): string {
  let s = '';
  for (const r of p.runs) {
    if (r.props.del) continue;
    s += caps?.(r) ? r.text.toUpperCase() : r.text;
  }
  return s.replace(/[\u00ad\ufffc]/g, '').replace(/[\t\n\r\u000b\u000c]/g, ' ').replace(/\s+/g, ' ').trim();
}

const BUILTIN_HEADING = /^heading ([1-9])$/i;

/**
 * Nível de tópico efetivo de um parágrafo do corpo (1–9) ou 0 = corpo do texto.
 * Os estilos de título internos ("heading N", qualquer caixa) têm o nível
 * TRAVADO no Word (oráculo nav-lab heading-rules): valem N mesmo sem
 * w:outlineLvl no styles.xml, o nível direto no parágrafo não muda nada e o
 * estilo baseado neles herda o nível — salvo um w:outlineLvl próprio mais
 * perto na cadeia. Fora deles: direto > estilo > nível da lista.
 */
export function outlineLevelOf(ctx: DocContext, p: Paragraph, ppr = resolvePPr(ctx, p, {}).ppr): number {
  const chain = ctx.resolver.paraChain(ppr.pStyle ?? directStyle(p));
  for (let i = chain.length - 1; i >= 0; i--) {
    const s = chain[i]!;
    const m = BUILTIN_HEADING.exec(s.name ?? '');
    if (m) return +m[1]!;
    if (s.pPr?.outlineLvl !== undefined) break;
  }
  const lvl = ppr.outlineLvl;
  return lvl !== undefined && lvl >= 0 && lvl <= 8 ? lvl + 1 : 0;
}

const directStyle = (p: Paragraph): string | undefined => p.props.styleId;

export function documentOutline(full: FullDocument, opts: { lang?: string } = {}): OutlineHeading[] {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const dd = ctx.resolver.docDefaults;
  const out: OutlineHeading[] = [];
  const walk = (blocks: readonly Block[], top: boolean): void => {
    blocks.forEach((b, i) => {
      if (b.type === 'table') {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), false);
        return;
      }
      const p = b.paragraph;
      const { ppr, styleRPr } = resolvePPr(ctx, p, {});
      // a numeração avança como no desenho (ordem do documento, células incluídas)
      const n = ppr.numPr;
      const num = n?.numId ? (ctx.numbering.next(n.numId, n.ilvl ?? 0)?.text ?? '') : '';
      if (!top) return;
      const level = outlineLevelOf(ctx, p, ppr);
      if (!level) return;
      const caps = (r: Paragraph['runs'][number]): boolean => {
        const d = directRPr(r);
        return !!cascadeRPr(dd.rPr, [styleRPr, ctx.resolver.charStyle(d.rStyle)], d).caps;
      };
      const text = headingText(p, caps);
      if (!text) return;
      out.push({ block: i, level, text: num ? `${num} ${text}` : text, number: num });
    });
  };
  walk(full.blocks, true);
  return out;
}

/** Parágrafo numerado do corpo (lista do diálogo Referência Cruzada, "Item numerado"). */
export interface NumberedItem {
  /** índice do bloco em `full.blocks` */
  block: number;
  /** nível da lista (0–8) */
  ilvl: number;
  /** o número como aparece ("1.", "a)") */
  number: string;
  /** texto do parágrafo */
  text: string;
}

/** Número de cada item de lista (corpo e células), como no desenho: o valor do contador
 *  (o diálogo Definir Valor de Numeração começa nele) e o texto do marcador (colar só o
 *  texto leva o número como texto, como o Word). */
export function listItemValues(full: FullDocument, opts: { lang?: string } = {}): Map<Paragraph, { value: number; text: string }> {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const out = new Map<Paragraph, { value: number; text: string }>();
  const walk = (blocks: readonly Block[]): void => {
    for (const b of blocks) {
      if (b.type === 'table') {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell));
        continue;
      }
      const n = resolvePPr(ctx, b.paragraph, {}).ppr.numPr;
      const m = n?.numId ? ctx.numbering.next(n.numId, n.ilvl ?? 0) : null;
      if (m) out.set(b.paragraph, { value: m.value ?? 0, text: m.text });
    }
  };
  walk(full.blocks);
  return out;
}

/** Parágrafos do CORPO (fora de tabela) com numeração que não é marcador, na ordem
 *  do documento — a numeração avança como no desenho (células incluídas). */
export function numberedItems(full: FullDocument, opts: { lang?: string } = {}): NumberedItem[] {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const out: NumberedItem[] = [];
  const walk = (blocks: readonly Block[], top: boolean): void => {
    blocks.forEach((b, i) => {
      if (b.type === 'table') {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), false);
        return;
      }
      const n = resolvePPr(ctx, b.paragraph, {}).ppr.numPr;
      const m = n?.numId ? ctx.numbering.next(n.numId, n.ilvl ?? 0) : null;
      if (!top || !m || m.level.numFmt === 'bullet' || !m.text) return;
      const text = headingText(b.paragraph);
      if (text) out.push({ block: i, ilvl: m.ilvl, number: m.text, text });
    });
  };
  walk(full.blocks, true);
  return out;
}

/** Parágrafo do documento (fonte de sumário), no corpo ou numa célula. */
export interface OutlineParagraph {
  paragraph: Paragraph;
  /** bloco de topo (a tabela, para as células) */
  block: number;
  /** nível de tópico 1–9 (0 = corpo do texto) */
  level: number;
  /** número da lista ("" sem numeração) */
  number: string;
}

/** Todos os parágrafos do corpo na ordem do documento, células de tabela INCLUÍDAS,
 *  com o nível de tópico — o sumário do Word leva os títulos e as legendas de dentro
 *  das tabelas (corpus: edit-check toccorpus × word-open-check -Toc); a numeração
 *  avança como no desenho. */
export function outlineParagraphs(full: FullDocument, opts: { lang?: string } = {}): OutlineParagraph[] {
  const ctx = new DocContext(full.formatting ?? emptyFormatting(), NO_FONTS, { lang: opts.lang });
  const out: OutlineParagraph[] = [];
  const walk = (blocks: readonly Block[], top: number | null): void => {
    blocks.forEach((b, i) => {
      if (b.type === 'table') {
        for (const row of b.rows) for (const cell of row.cells) walk(cellBlocks(cell), top ?? i);
        return;
      }
      const p = b.paragraph;
      const { ppr } = resolvePPr(ctx, p, {});
      const n = ppr.numPr;
      const num = n?.numId ? (ctx.numbering.next(n.numId, n.ilvl ?? 0)?.text ?? '') : '';
      out.push({ paragraph: p, block: top ?? i, level: outlineLevelOf(ctx, p, ppr), number: num });
    });
  };
  walk(full.blocks, null);
  return out;
}
