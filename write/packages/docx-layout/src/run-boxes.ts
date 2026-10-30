import type { FullDocument, Paragraph, Run } from '@universal-office/docx-core';
import { paragraphAtPath } from './refs.js';
import type { LaidOutLine, LayoutResult } from './tree.js';

/**
 * Onde os runs de um tipo foram parar nas páginas diagramadas: links (área
 * clicável no viewer e anotação no PDF), inlines de plugin (desenho e clique
 * no viewer). Cada linha do motor aponta o parágrafo (ref) e os caracteres
 * (offset no texto do parágrafo → x, largura); a caixa de um run numa linha
 * é a extensão dos caracteres dele. Coordenadas em twips da página. Só o
 * corpo (refs "b…"): cabeçalho, rodapé e notas ficam de fora.
 */
export interface RunBox<T> {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  baseline: number;
  run: Run;
  value: T;
}

/**
 * Caracteres da linha com o texto de reserva de cada inline de plugin juntado
 * num caractere só: o motor desenha os caracteres do texto de reserva com
 * offsets a partir do do inline (1 caractere no modelo), que colidem com os do
 * run seguinte (mesma regra do collapseCustomChars do editor).
 */
export function collapseCustomInlineChars(chars: readonly LineChar[], paragraph: Paragraph): LineChar[] {
  const out = [...chars];
  let acc = 0;
  for (const run of paragraph.runs) {
    const a = acc;
    acc += run.text.length;
    if (!run.custom) continue;
    const n = Math.max(1, Array.from(run.custom.fallbackText || ' ').length);
    const i = out.findIndex((c) => c.o === a);
    if (i < 0) continue;
    let j = i;
    while (j + 1 < out.length && j - i + 1 < n && out[j + 1]!.o === out[j]!.o + 1) j++;
    const last = out[j]!;
    out.splice(i, j - i + 1, { o: a, x: out[i]!.x, w: last.x + last.w - out[i]!.x });
  }
  return out;
}

type LineChar = NonNullable<LaidOutLine['chars']>[number];

export function runBoxes<T>(full: FullDocument, layout: LayoutResult, pick: (run: Run) => T | undefined): RunBox<T>[] {
  const paras = new Map<string, Paragraph | null>();
  const para = (ref: string): Paragraph | null => {
    let p = paras.get(ref);
    if (p === undefined) {
      p = /^b\d/.test(ref) ? paragraphAtPath(full.blocks, ref.split('/')) : null;
      paras.set(ref, p);
    }
    return p;
  };
  const out: RunBox<T>[] = [];
  layout.pages.forEach((page, pi) => {
    for (const line of page.lines) {
      const p = para(line.ref);
      if (!p || !line.chars?.length) continue;
      const chars = p.runs.some((r) => r.custom) ? collapseCustomInlineChars(line.chars, p) : line.chars;
      let acc = 0;
      for (const run of p.runs) {
        const a = acc;
        acc += run.text.length;
        if (acc <= line.start || a >= line.end) continue;
        const value = pick(run);
        if (value === undefined || value === null || value === '') continue;
        let x1 = Infinity, x2 = -Infinity;
        for (const c of chars) {
          if (c.o < a || c.o >= acc) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        out.push({ page: pi, x: x1, y: line.y, w: x2 - x1, h: line.height, baseline: line.baseline, run, value });
      }
    }
  });
  return out;
}
