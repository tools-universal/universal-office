import type { FullDocument, Paragraph } from '@universal-office/docx-core';
import { StyleResolver, paragraphAtPath, type LayoutResult } from '@universal-office/docx-layout';

/**
 * Comentários e títulos do documento posicionados nas páginas diagramadas:
 * cada linha do motor (LaidOutLine) aponta o parágrafo (ref) e os caracteres
 * (offsets no texto do parágrafo) — daí saem os retângulos do trecho comentado
 * e a posição de cada título. Coordenadas em twips da página.
 */

export interface Rect { page: number; x: number; y: number; w: number; h: number }

export interface CommentEntry {
  id: number;
  author?: string;
  text: string;
  /** trecho comentado nas páginas (vazio: comentário sem âncora visível) */
  rects: Rect[];
}

export interface HeadingEntry {
  /** nível 1–9 (w:outlineLvl 0–8) */
  level: number;
  text: string;
  page: number;
  y: number;
}

export interface Annotations {
  comments: CommentEntry[];
  headings: HeadingEntry[];
}

/** Nível de estrutura do parágrafo: outlineLvl direto, senão o do estilo (cadeia basedOn). */
function outlineLevel(p: Paragraph, styles: StyleResolver | null): number | undefined {
  let lvl = p.ppr?.outlineLvl;
  if (lvl === undefined && styles) lvl = styles.paraStyle(p.ppr?.pStyle ?? p.props.styleId).pPr.outlineLvl;
  if (lvl !== undefined) return lvl >= 0 && lvl <= 8 ? lvl + 1 : undefined;
  // sem formatação crua (documento antigo/montado): o nome do estilo
  const m = (p.ppr?.pStyle ?? p.props.styleId)?.match(/^(?:heading|t[íi]?tulo)\s*(\d)$/i);
  return m ? Number(m[1]) : undefined;
}

export function collectAnnotations(full: FullDocument, layout: LayoutResult): Annotations {
  const styles = full.formatting ? new StyleResolver(full.formatting) : null;
  const paraCache = new Map<string, Paragraph | null>();
  const para = (ref: string): Paragraph | null => {
    let p = paraCache.get(ref);
    if (p === undefined) {
      p = /^b\d/.test(ref) ? paragraphAtPath(full.blocks, ref.split('/')) : null; // cabeçalho/rodapé/notas: fora
      paraCache.set(ref, p);
    }
    return p;
  };
  const rects = new Map<number, Rect[]>();
  const headings: HeadingEntry[] = [];
  const seenHeading = new Set<Paragraph>();
  const levelCache = new Map<Paragraph, number | undefined>();

  layout.pages.forEach((page, pi) => {
    for (const line of page.lines) {
      const p = para(line.ref);
      if (!p) continue;
      // título: a 1ª linha do parágrafo
      if (!seenHeading.has(p)) {
        if (!levelCache.has(p)) levelCache.set(p, outlineLevel(p, styles));
        const level = levelCache.get(p);
        if (level !== undefined) {
          seenHeading.add(p);
          const text = p.runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
          if (text) headings.push({ level, text, page: pi, y: line.y });
        }
      }
      // trechos comentados: extensão dos caracteres de cada run com comentário
      let acc = 0;
      for (const run of p.runs) {
        const a = acc;
        acc += run.text.length;
        const ids = run.props.commentIds;
        if (!ids?.length || acc <= line.start || a >= line.end) continue;
        let x1 = Infinity, x2 = -Infinity;
        for (const c of line.chars ?? []) {
          if (c.o < a || c.o >= acc) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        for (const id of ids) {
          let list = rects.get(id);
          if (!list) rects.set(id, (list = []));
          const last = list[list.length - 1];
          // emenda com o retângulo anterior da mesma linha
          if (last && last.page === pi && last.y === line.y && Math.abs(last.x + last.w - x1) < 1) last.w = x2 - last.x;
          else list.push({ page: pi, x: x1, y: line.y, w: x2 - x1, h: line.height });
        }
      }
    }
  });

  const comments: CommentEntry[] = full.comments.map((c) => ({
    id: c.id, ...(c.author ? { author: c.author } : {}), text: c.text, rects: rects.get(c.id) ?? [],
  }));
  // ordem de leitura: pela 1ª âncora; sem âncora, no fim
  const key = (c: CommentEntry): number[] => {
    const r = c.rects[0];
    return r ? [r.page, r.y, r.x] : [1e9, 0, 0];
  };
  comments.sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka[0]! - kb[0]! || ka[1]! - kb[1]! || ka[2]! - kb[2]!;
  });
  return { comments, headings };
}
