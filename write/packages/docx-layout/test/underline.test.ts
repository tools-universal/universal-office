/**
 * Sublinhados (w:u) × Word: a geometria de cada estilo em px de 600 dpi a partir da
 * baseline, medida no PDF do Word (sonda write/tools/home-lab: gen-ulsize-probe.mjs,
 * 9 fontes × 7 estilos × 27 corpos — results/underline/ulsize-word.tsv; memória
 * word-underline-facts). A regra (ulGeometry) é testada sem fontes; a comparação de
 * ponta a ponta usa as fontes INSTALADAS — sem elas (CI), pulada.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { layoutDocument, ulGeometry } from '../src/index.js';

const lab = join(__dirname, '..', '..', '..', 'tools', 'home-lab');

describe('ulGeometry (px, medidos)', () => {
  // [P, T, L] → simples, dupla, grossa e onda como o Word
  const cases: [string, number, number, number, { top1: number; Td: number; top2: number; B: number }][] = [
    ['Arial 24', 21, 15, 43, { top1: 11, Td: 8, top2: 28, B: 22 }],
    ['Arial 10 (limite do VDMX)', 9, 6, 18, { top1: 4, Td: 3, top2: 15, B: 10 }],
    ['Arial 8', 7, 5, 15, { top1: 1, Td: 3, top2: 12, B: 7 }],
    ['Arial Bold 10', 9, 9, 19, { top1: 1, Td: 5, top2: 14, B: 9 }],
    ['Arial 6 (topo no zero)', 5, 4, 11, { top1: 0, Td: 1, top2: 10, B: 4 }],
    ['Verdana 6', 4, 3, 10, { top1: 0, Td: 1, top2: 9, B: 4 }],
    ['Arial 72', 64, 44, 153, { top1: 32, Td: 22, top2: 86, B: 69 }],
  ];
  for (const [name, P, T, L, exp] of cases) {
    it(name, () => {
      const g = ulGeometry({ P, T, L });
      expect({ top1: g.top1, Td: g.Td, top2: g.top2, B: g.B }).toEqual(exp);
    });
  }
  it('Courier New 22: a simples sobe até caber na descendente', () => {
    expect(ulGeometry({ P: 43, T: 8, L: 50 }).P).toBe(42);
  });
});

// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
const { createNodeFontProvider } = await import('../../../tools/corpus-lab/node-fonts.mjs');
const provider = await createNodeFontProvider();
const hasFonts = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Georgia', 'Cambria', 'Courier New'].every((f) => provider.face(f, false, false));

describe.skipIf(!hasFonts)('sublinhados × PDF do Word (fontes instaladas)', async () => {
  // @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
  const { ulsizeDocs, SIZES } = await import('../../../tools/home-lab/gen-ulsize-probe.mjs');
  const word = new Map(readFileSync(join(lab, 'results', 'underline', 'ulsize-word.tsv'), 'utf8').trim().split('\n').slice(1)
    .map((l) => { const c = l.split('\t'); return [`${c[0]}__${c[1]}@${c[2]}`, c[5]!]; }));
  for (const [name, bytes] of ulsizeDocs() as [string, Uint8Array][]) {
    it(name, () => {
      const res = layoutDocument(readFullDocument(DocxPackage.load(bytes)), provider);
      const bad: string[] = [];
      let li = 0;
      for (const p of res.pages) {
        const bases = [...new Set(p.items.filter((it) => it.t === 'glyphs').map((it) => (it as { y: number }).y))].sort((a, b) => a - b);
        for (const by of bases) {
          const size = (SIZES as number[])[li++]!;
          const px = (v: number): number => Math.round((v - by) / 2.4);
          const near = (y: number): boolean => y > by - 20 && y < by + size * 10;
          const waves = p.items.filter((it) => it.t === 'path' && it.stroke && near(it.cmds[0]!.op === 'M' ? (it.cmds[0] as { y: number }).y : 0));
          let got: string;
          if (waves.length) {
            got = [...new Set(waves.map((w) => {
              const ys = (w as { cmds: { op: string; y?: number }[] }).cmds.filter((c) => c.op === 'C').map((c) => c.y!);
              return `${px(Math.min(...ys))}..${px(Math.max(...ys))}`;
            }))].join(' ');
          } else {
            got = [...new Set(p.items.filter((it) => it.t === 'rect' && near(it.y)).map((it) => { const r = it as { y: number; h: number }; return `${px(r.y)}+${Math.round(r.h / 2.4)}`; }))]
              .sort((a, b) => parseInt(a) - parseInt(b)).join(' ');
          }
          const exp = word.get(`${name}@${size}`);
          if (exp !== undefined && exp !== got) bad.push(`${size}pt: Word ${exp} motor ${got}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
