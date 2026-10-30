import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type Block, type FullDocument, type Run } from '@universal-office/docx-core';
import { runBoxes } from '../src/run-boxes.js';
import type { LaidOutLine, LayoutResult } from '../src/tree.js';

const run = (text: string, link?: string, custom?: Run['custom']): Run => ({
  text, props: { ...DEFAULT_RUN_PROPS, ...(link ? { link } : {}) }, ...(custom ? { custom } : {}),
});

/** Linha com um caractere de 100 twips por posição, a partir de x = 1000. */
const line = (ref: string, start: number, end: number, y: number): LaidOutLine => ({
  ref, start, end, x: 1000, y, height: 300, baseline: y + 240, width: (end - start) * 100,
  chars: Array.from({ length: end - start }, (_, i) => ({ o: start + i, x: 1000 + i * 100, w: 100 })),
});

const doc = (blocks: Block[]): FullDocument => ({ blocks } as unknown as FullDocument);
const layout = (...pages: LaidOutLine[][]): LayoutResult => ({
  warnings: [],
  pages: pages.map((lines) => ({ widthTw: 11906, heightTw: 16838, section: 0, number: 1, items: [], lines })),
});

describe('runBoxes', () => {
  const blocks: Block[] = [{
    type: 'paragraph',
    paragraph: { props: {}, runs: [run('Veja '), run('o site', 'https://a.test'), run(' e '), run('aqui', '#cap')] },
  }];

  it('uma caixa por run escolhido em cada linha, na extensão dos caracteres dele', () => {
    const boxes = runBoxes(doc(blocks), layout([line('b0', 0, 18, 500)]), (r) => r.props.link);
    expect(boxes.map(({ value, x, w, y, h, page }) => ({ value, x, w, y, h, page }))).toEqual([
      { value: 'https://a.test', x: 1500, w: 600, y: 500, h: 300, page: 0 },
      { value: '#cap', x: 2400, w: 400, y: 500, h: 300, page: 0 },
    ]);
  });

  it('run quebrado entre linhas e páginas dá uma caixa em cada', () => {
    const boxes = runBoxes(doc(blocks), layout([line('b0', 0, 8, 500)], [line('b0', 8, 18, 200)]), (r) => r.props.link);
    expect(boxes.filter((b) => b.value === 'https://a.test').map((b) => [b.page, b.x, b.w])).toEqual([[0, 1500, 300], [1, 1000, 300]]);
  });

  it('inlines de plugin (um caractere) e parágrafos dentro de tabela', () => {
    const tag = run('￼', undefined, { type: 'acme.tag', data: { n: 1 }, fallbackText: '@Nome' });
    const table: Block = {
      type: 'table', gridColsTwips: [3000],
      rows: [{ cells: [{ paragraphs: [{ props: {}, runs: [run('Oi '), tag] }], tables: [], gridSpan: 1 }] }],
    };
    const boxes = runBoxes(doc([table]), layout([line('b0/r0/c0/b0', 0, 4, 800)]), (r) => r.custom);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ page: 0, x: 1300, w: 100, y: 800, baseline: 1040 });
    expect(boxes[0]!.value.type).toBe('acme.tag');
  });

  it('o texto de reserva de um inline ocupa vários caracteres na linha e o run seguinte vem depois dele', () => {
    // o motor desenha "Integridade" (11 caracteres) com offsets a partir do do inline (5),
    // que colidem com os do run seguinte ("x", offset 6)
    const link = run('￼', undefined, { type: 'acme.link', data: { id: 1 }, fallbackText: 'Integridade' });
    const blocks: Block[] = [{ type: 'paragraph', paragraph: { props: {}, runs: [run('Veja '), link, run('x', 'https://x.test')] } }];
    const engineLine: LaidOutLine = {
      ref: 'b0', start: 0, end: 7, x: 1000, y: 500, height: 300, baseline: 740, width: 1700,
      chars: [
        ...Array.from({ length: 5 }, (_, i) => ({ o: i, x: 1000 + i * 100, w: 100 })),
        ...Array.from({ length: 11 }, (_, i) => ({ o: 5 + i, x: 1500 + i * 100, w: 100 })),
        { o: 6, x: 2600, w: 100 },
      ],
    };
    const custom = runBoxes(doc(blocks), layout([engineLine]), (r) => r.custom);
    expect(custom.map((b) => [b.x, b.w])).toEqual([[1500, 1100]]);
    const links = runBoxes(doc(blocks), layout([engineLine]), (r) => (r.custom ? undefined : r.props.link));
    expect(links.map((b) => [b.x, b.w])).toEqual([[2600, 100]]);
  });

  it('linhas de cabeçalho/rodapé e refs desconhecidas ficam de fora', () => {
    const boxes = runBoxes(doc(blocks), layout([line('hdr:default/b0', 0, 18, 100), line('b7', 0, 3, 100)]), (r) => r.props.link);
    expect(boxes).toEqual([]);
  });
});
