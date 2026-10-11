import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type Paragraph, type Section, type TableBlock, type FullDocument } from '@universal-office/docx-core';
import type { LaidOutLine } from '@universal-office/docx-layout';
import { buildEngineDoc, reconcileBlocks, locateRef, cellAtGrid, resolveCell, caretXIn, offsetAtX, findItems, shiftPageItem, hfBlocksFor, paragraphAtPath } from './engine-doc.js';

const para = (text: string): Paragraph => ({ runs: [{ text, props: { ...DEFAULT_RUN_PROPS } }], props: {} });
const table = (cells: Paragraph[][]): TableBlock => ({
  type: 'table', gridColsTwips: cells[0]!.map(() => 1000),
  rows: cells.map((row) => ({ cells: row.map((p) => ({ paragraphs: [p], tables: [], gridSpan: 1, blocks: [{ type: 'paragraph' as const, paragraph: p }] })) })),
});
const sect = (): Section => ({
  sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
  blockStart: 0, blockEnd: 0, headers: {}, footers: {}, headerRefs: [], footerRefs: [],
});

describe('buildEngineDoc', () => {
  it('intercala tabelas ancoradas e segue as seções pelos parágrafos atuais', () => {
    const ps = [para('a'), para('b'), para('c'), para('d')];
    const t = table([[para('x')]]);
    const s0 = sect(), s1 = sect();
    const full = { blocks: [], sections: [s0, s1], footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(), bookmarks: new Map() } as unknown as FullDocument;
    const d = buildEngineDoc({
      fullDoc: full, paragraphs: ps, tableAnchors: [{ beforePara: 2, table: t }],
      sectionStarts: [{ startPara: 0, section: s0 }, { startPara: 2, section: s1 }], sectPr: s0.sectPr,
      bookmarkParas: new Map([['bm', 3]]),
    });
    expect(d.full.blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph', 'table', 'paragraph', 'paragraph']);
    // a tabela antes do parágrafo 2 abre a 2ª seção
    expect(d.full.sections.map((s) => [s.blockStart, s.blockEnd])).toEqual([[0, 1], [2, 4]]);
    expect(d.paraBlock).toEqual([0, 1, 3, 4]);
    expect(d.origins[2]).toEqual({ kind: 'table', anchor: 0 });
    expect(d.full.bookmarks.get('bm')).toBe(4);
  });

  it('omite seção que ficou vazia', () => {
    const ps = [para('a'), para('b')];
    const s0 = sect(), s1 = sect(), s2 = sect();
    const full = { blocks: [], sections: [s0, s1, s2], footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(), bookmarks: new Map() } as unknown as FullDocument;
    const d = buildEngineDoc({
      fullDoc: full, paragraphs: ps, tableAnchors: [],
      sectionStarts: [{ startPara: 0, section: s0 }, { startPara: 1, section: s1 }, { startPara: 1, section: s2 }], sectPr: s0.sectPr,
    });
    expect(d.full.sections.length).toBe(2);
    expect(d.sectionMap).toEqual([0, 2]);
  });
});

describe('reconcileBlocks', () => {
  it('mantém o mesmo array sem mudança estrutural', () => {
    const ps = [para('a'), para('b')];
    const blocks = ps.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
    expect(reconcileBlocks(blocks, ps, false)).toBe(blocks);
  });

  it('insere parágrafo novo depois do anterior, também dentro de célula (deep)', () => {
    const a = para('a'), cellP = para('c'), b = para('b');
    const t = table([[cellP]]);
    const blocks = [{ type: 'paragraph' as const, paragraph: a }, t, { type: 'paragraph' as const, paragraph: b }];
    const novo = para('n');
    const out = reconcileBlocks(blocks, [a, cellP, novo, b], true)!;
    const inner = (out[1] as TableBlock).rows[0]!.cells[0]!;
    expect(inner.paragraphs).toEqual([cellP, novo]);
    expect(out.filter((x) => x.type === 'paragraph').map((x) => (x as { paragraph: Paragraph }).paragraph)).toEqual([a, b]);
  });
});

describe('referências das linhas', () => {
  it('corpo, célula e tabela aninhada', () => {
    const origins = [{ kind: 'para' as const, para: 0 }, { kind: 'table' as const, anchor: 0 }];
    expect(locateRef('b0', origins)).toEqual({ kind: 'body', para: 0 });
    expect(locateRef('b1/r2/c3/b0', origins)).toEqual({ kind: 'cell', anchor: 0, hops: [{ r: 2, c: 3 }], block: 0 });
    expect(locateRef('b1/r0/c1/b2/r1/c0/b4', origins)).toEqual({ kind: 'cell', anchor: 0, hops: [{ r: 0, c: 1, b: 2 }, { r: 1, c: 0 }], block: 4 });
    expect(locateRef('hdr2/b0', origins).kind).toBe('other');
  });

  it('cabeçalho/rodapé: parte, herança e parágrafo no caminho (com tabela)', () => {
    expect(locateRef('hdr:first/b1/r0/c0/b0', [])).toEqual({ kind: 'hf', which: 'hdr', part: 'first', path: ['b1', 'r0', 'c0', 'b0'] });
    const a = para('a'), cellP = para('c');
    const t = table([[cellP]]);
    const blocks = [{ type: 'paragraph' as const, paragraph: a }, t];
    const s0 = { ...sect(), headerBlocks: { default: blocks } }, s1 = sect();
    const full = { blocks: [], sections: [s0, s1], footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(), bookmarks: new Map() } as unknown as FullDocument;
    const src = hfBlocksFor(full, 1, 'hdr', 'default');
    expect(src?.definer).toBe(0);
    expect(paragraphAtPath(src!.blocks, ['b0'])).toBe(a);
    expect(paragraphAtPath(src!.blocks, ['b1', 'r0', 'c0', 'b0'])).toBe(cellP);
    expect(hfBlocksFor(full, 1, 'ftr', 'default')).toBeNull();
  });

  it('coluna da grade com gridSpan', () => {
    const t = table([[para('a'), para('b')]]);
    t.rows[0]!.cells[0]!.gridSpan = 2;
    expect(cellAtGrid(t, 0, 2)).toBe(t.rows[0]!.cells[1]);
    expect(resolveCell(t, [{ r: 0, c: 0 }])).toBe(t.rows[0]!.cells[0]);
  });
});

describe('cursor por caractere', () => {
  const line: LaidOutLine = {
    ref: 'b0', start: 0, end: 4, x: 100, y: 0, height: 240, baseline: 200, width: 400,
    chars: [{ o: 0, x: 100, w: 100 }, { o: 1, x: 200, w: 100 }, { o: 2, x: 300, w: 100 }, { o: 3, x: 400, w: 100 }],
  };
  it('x do cursor e do fim da linha', () => {
    expect(caretXIn(line, 0)).toBe(100);
    expect(caretXIn(line, 2)).toBe(300);
    expect(caretXIn(line, 4)).toBe(500);
  });
  it('clique escolhe o lado mais próximo', () => {
    expect(offsetAtX(line, 140)).toBe(0);
    expect(offsetAtX(line, 160)).toBe(1);
    expect(offsetAtX(line, 900)).toBe(4);
  });
});

describe('layout incremental', () => {
  it('acha a sequência de itens deslocada', () => {
    const face = {} as never;
    const items = [
      { t: 'rect' as const, x: 0, y: 0, w: 10, h: 10, fill: 'FF0000' },
      { t: 'glyphs' as const, face, sizePt: 11, color: '000000', y: 500, glyphs: [{ cp: 65, x: 100 }], text: 'A' },
    ];
    const want = [shiftPageItem({ t: 'glyphs', face, sizePt: 11, color: '000000', y: 300, glyphs: [{ cp: 65, x: 50 }], text: 'A' }, 50, 200)];
    expect(findItems(items, want)).toBe(1);
  });
});
