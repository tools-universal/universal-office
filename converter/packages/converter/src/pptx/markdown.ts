/**
 * Export Markdown: `## Slide N — <título>` por slide, parágrafos com bullets
 * (`-` por nível de indent, numeração automática via formatAutoNum), tabelas
 * em GFM, imagens como data URI (`opts.images: 'data'`) ou `[imagem]`
 * (default), e notas do apresentador (parte notesSlide) como blockquote.
 *
 * O texto vem do modelo com a cascata de estilos da spec 03 já resolvida
 * (herança de master/layout aplicada no read).
 */
import type { Shape, TextBody, Table } from '@universal-office/slides-processing';
import { loadDeck, slideTitle, paragraphText, isTitleShape, dataUri, type DeckSlide } from './model.js';

export interface MarkdownOptions {
  /** 'data' = imagens embutidas como data URI; 'omit' (default) = placeholder `[imagem]`. */
  images?: 'data' | 'omit';
}

/** Escapa pipes e quebras para caber numa célula GFM. */
function mdCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>').trim();
}

/** Parágrafos de um txBody → linhas markdown (bullets/numeração por nível). */
function bodyToMarkdown(tb: TextBody): string[] {
  const lines: string[] = [];
  // contadores de buAutoNum por nível (reiniciam ao voltar para nível raso)
  const counters: number[] = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
    const text = paragraphText(p).replace(/\n/g, ' ').trim();
    if (text === '') continue;
    const level = Math.min(p.level ?? 0, 8);
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++) counters[l] = 0;
      let marker = '-';
      if (p.bulletAutoNum !== undefined) {
        // GFM só aceita `N.`/`N)` como lista ordenada — usa o contador do nível
        // (o esquema exato — romano/alfabético — só é reproduzido em HTML/PDF).
        counters[level] = (counters[level] ?? 0) + 1;
        marker = `${counters[level]}.`;
      }
      lines.push(`${'  '.repeat(level)}${marker} ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines;
}

/** Tabela `<a:tbl>` → GFM (primeira linha = header; células mescladas vazias). */
function tableToMarkdown(t: Table): string[] {
  if (t.rows.length === 0) return [];
  const cols = t.colWidthsEmu.length || Math.max(...t.rows.map((r) => r.cells.length));
  const rowLine = (ri: number): string => {
    const row = t.rows[ri]!;
    const fields: string[] = [];
    for (let ci = 0; ci < cols; ci++) {
      const cell = row.cells[ci];
      if (!cell || cell.hMerge || cell.vMerge || !cell.txBody) { fields.push(''); continue; }
      fields.push(mdCell(cell.txBody.paragraphs.map(paragraphText).join(' ')));
    }
    return `| ${fields.join(' | ')} |`;
  };
  const out = [rowLine(0), `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`];
  for (let ri = 1; ri < t.rows.length; ri++) out.push(rowLine(ri));
  return out;
}

function slideToMarkdown(ds: DeckSlide, n: number, opts: MarkdownOptions): string {
  const { slide, notes } = ds;
  const title = slideTitle(slide);
  const blocks: string[] = [`## Slide ${n}${title ? ` — ${title.text}` : ''}`];

  for (const sh of slide.shapes) {
    if (title && sh === title.shape) continue; // título já foi para o heading
    const block = shapeToMarkdown(sh, opts);
    if (block) blocks.push(block);
  }
  if (notes.length) {
    blocks.push(notes.map((l) => l.split('\n').map((s) => `> ${s}`).join('\n')).join('\n>\n'));
  }
  return blocks.join('\n\n');
}

function shapeToMarkdown(sh: Shape, opts: MarkdownOptions): string | undefined {
  if (sh.table) {
    const t = tableToMarkdown(sh.table);
    return t.length ? t.join('\n') : undefined;
  }
  if (sh.image) {
    return opts.images === 'data' ? `![](${dataUri(sh.image)})` : '[imagem]';
  }
  if (sh.chartXml) return '[gráfico]';
  if (sh.txBody) {
    const lines = bodyToMarkdown(sh.txBody);
    return lines.length ? lines.join('\n') : undefined;
  }
  return undefined;
}

/** Exporta o .pptx inteiro para Markdown (um `##` por slide). */
export function pptxToMarkdown(bytes: Uint8Array, opts: MarkdownOptions = {}): string {
  const deck = loadDeck(bytes);
  return deck.slides.map((ds, i) => slideToMarkdown(ds, i + 1, opts)).join('\n\n') + '\n';
}
