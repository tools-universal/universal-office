/**
 * Índice e comentários posicionados nas páginas (collectAnnotations), sobre a
 * amostra sintética da demo (demo/make-sample.mjs) — fontes ABERTAS versionadas
 * (Carlito para qualquer família): roda no CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { SfntFont } from '@universal-office/docx-layout';
import { layoutDocument, type FontProvider } from '@universal-office/docx-layout';
import { collectAnnotations } from '../src/annotations.js';

const FILES = join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files');
const faces = new Map<string, SfntFont>();
const provider: FontProvider = {
  face(_family, bold, italic) {
    const v = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
    const bytes = new Uint8Array(readFileSync(join(FILES, `carlito-${v}.ttf`)));
    let font = faces.get(v);
    if (!font) faces.set(v, (font = new SfntFont(bytes)));
    return { key: `Carlito|${v}`, family: 'Carlito', font, bytes, bold, italic };
  },
};

const load = () => {
  const bytes = new Uint8Array(readFileSync(join(__dirname, '..', 'demo', 'amostra-indice-comentarios.docx')));
  const full = readFullDocument(DocxPackage.load(bytes));
  const layout = layoutDocument(full, provider);
  return { full, layout, notes: collectAnnotations(full, layout) };
};

describe('collectAnnotations', () => {
  it('títulos pelo nível de estrutura do estilo (outlineLvl), na ordem e com a página', () => {
    const { layout, notes } = load();
    expect(notes.headings.map((h) => [h.level, h.text])).toEqual([
      [1, 'Introdução'], [2, 'Objetivos'], [2, 'Escopo'],
      [1, 'Metodologia'], [2, 'Coleta de dados'], [2, 'Análise'],
      [1, 'Conclusão'],
    ]);
    // "Title" não tem nível de estrutura: fica de fora
    expect(notes.headings.some((h) => h.text === 'Relatório de exemplo')).toBe(false);
    // páginas não decrescem e cabem no documento
    const pages = notes.headings.map((h) => h.page);
    expect(pages).toEqual([...pages].sort((a, b) => a - b));
    expect(Math.max(...pages)).toBeLessThan(layout.pages.length);
    expect(layout.pages.length).toBeGreaterThan(1);
  });

  it('comentários com autor, texto e o retângulo do trecho comentado, em ordem de leitura', () => {
    const { layout, notes } = load();
    expect(notes.comments.map((c) => [c.id, c.author])).toEqual([[0, 'Ana Souza'], [1, 'Bruno Lima'], [2, 'Ana Souza'], [3, 'Carla Dias']]);
    for (const c of notes.comments) {
      expect(c.rects.length).toBeGreaterThan(0);
      for (const r of c.rects) {
        const pg = layout.pages[r.page]!;
        expect(r.w).toBeGreaterThan(0);
        expect(r.x + r.w).toBeLessThanOrEqual(pg.widthTw);
        expect(r.y + r.h).toBeLessThanOrEqual(pg.heightTw);
      }
    }
    // o trecho comentado é só o texto marcado, não a linha inteira
    const first = notes.comments[0]!.rects[0]!;
    const line = layout.pages[first.page]!.lines.find((l) => l.y === first.y)!;
    expect(first.w).toBeLessThan(line.width);
  });
});
