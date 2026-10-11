/**
 * Elevação do sobrescrito e queda do subscrito × Word (oráculo supraise): para 11
 * fontes, de 6 a 24pt em meios pontos, a distância entre a baseline do texto e a do
 * sobrescrito/subscrito lida caractere a caractere no PDF do Word
 * (test/oracle/supraise/raise.json: [corpo, elevação, queda], em meios pontos — o PDF
 * quantiza a 0,12pt). O motor tem de acertar todas (tabela medida em fonts.ts).
 *
 * Usa as fontes INSTALADAS — sem elas (CI), pulado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { layoutDocument } from '../src/index.js';

const dir = join(__dirname, 'oracle', 'supraise');
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
const { createNodeFontProvider } = await import('../../../tools/corpus-lab/node-fonts.mjs');
const provider = await createNodeFontProvider();
const table = existsSync(join(dir, 'raise.json')) ? JSON.parse(readFileSync(join(dir, 'raise.json'), 'utf8')) as Record<string, [number, number, number?][]> : {};

describe('sobrescrito: elevação por fonte e corpo', () => {
  for (const [font, rows] of Object.entries(table)) {
    const face = font.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Segoe Ui', 'Segoe UI');
    it.skipIf(!provider.face(face, false, false))(font, () => {
      const full = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(join(dir, `sr-${font}.docx`)))));
      const res = layoutDocument(full, provider);
      // runs de glifos em ordem: "Base", "SUP", " meio ", "SUB", " fim" por parágrafo
      const runs = res.pages.flatMap((p) => p.items).filter((it) => it.t === 'glyphs');
      const got: number[] = [], drops: number[] = [];
      const txt = (it: (typeof runs)[number]) => (it.t === 'glyphs' ? it.glyphs.map((g) => String.fromCodePoint(g.cp)).join('') : '');
      for (let i = 0; i + 1 < runs.length; i++) {
        const a = runs[i]!, b = runs[i + 1]!;
        if (a.t !== 'glyphs' || b.t !== 'glyphs') continue;
        if (txt(a) === 'Base' && txt(b) === 'SUP') got.push((a.y - b.y) / 20);
        if (txt(a).trim() === 'meio' && txt(b) === 'SUB') drops.push((b.y - a.y) / 20);
      }
      expect(got.length).toBe(rows.length);
      rows.forEach(([size, raise, drop], k) => {
        expect(Math.abs(got[k]! - raise), `sobrescrito, corpo ${size}`).toBeLessThan(0.01);
        if (drop !== undefined) expect(Math.abs(drops[k]! - drop), `subscrito, corpo ${size}`).toBeLessThan(0.01);
      });
    });
  }
});
