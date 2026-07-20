import { describe, expect, it } from 'vitest';
import {
  bisectLE, frozenExtent, pxToIndex, indexScreenPos, boundaryAt,
  pxToColWidthChars, pxToRowHeightPt, layoutRichLines, PATTERN_MASKS,
} from '../src/grid-layout.js';

// grade de 5 colunas de 50px: edges[i] = borda esquerda da coluna i+1
const EDGES = [0, 50, 100, 150, 200, 250];

describe('bisectLE', () => {
  it('devolve o maior índice i com arr[i] <= x', () => {
    expect(bisectLE(EDGES, -1)).toBe(0);
    expect(bisectLE(EDGES, 0)).toBe(0);
    expect(bisectLE(EDGES, 49)).toBe(0);
    expect(bisectLE(EDGES, 50)).toBe(1);
    expect(bisectLE(EDGES, 260)).toBe(5);
  });
});

describe('pxToIndex — hit-test px→célula com panes congelados', () => {
  it('sem freeze: aplica scroll direto', () => {
    expect(pxToIndex(EDGES, 25, 0, 0, 5)).toBe(1);
    expect(pxToIndex(EDGES, 25, 0, 100, 5)).toBe(3); // 25+100 → col 3
  });

  it('clique na faixa congelada ignora o scroll', () => {
    // 1 coluna congelada (0..50px fixos), scroll 100
    expect(pxToIndex(EDGES, 25, 1, 100, 5)).toBe(1);
    expect(pxToIndex(EDGES, 49.9, 1, 100, 5)).toBe(1);
  });

  it('clique após a faixa congelada soma o scroll', () => {
    // px 60 com scroll 100 → x=160 → col 4
    expect(pxToIndex(EDGES, 60, 1, 100, 5)).toBe(4);
    // exatamente na borda do freeze (50) já é área rolável
    expect(pxToIndex(EDGES, 50, 1, 100, 5)).toBe(4);
    // scroll 0: contíguo ao freeze
    expect(pxToIndex(EDGES, 60, 1, 0, 5)).toBe(2);
  });

  it('fora do grid → null', () => {
    expect(pxToIndex(EDGES, -5, 1, 0, 5)).toBeNull();
    expect(pxToIndex(EDGES, 60, 1, 300, 5)).toBeNull(); // além de maxIndex
  });
});

describe('indexScreenPos / frozenExtent', () => {
  it('congelado é fixo; rolável desloca', () => {
    expect(frozenExtent(EDGES, 0)).toBe(0);
    expect(frozenExtent(EDGES, 2)).toBe(100);
    expect(indexScreenPos(EDGES, 1, 1, 999)).toBe(0);   // col 1 congelada
    expect(indexScreenPos(EDGES, 3, 1, 40)).toBe(60);   // 100 − 40
    expect(indexScreenPos(EDGES, 3, 0, 40)).toBe(60);   // sem freeze, mesmo scroll
  });
});

describe('layoutRichLines — wrap por segmentos preservando o run', () => {
  // medida determinística: run 0 = 5px/char, run 1 = 10px/char
  const measure = (text: string, run: number): number => text.length * (run === 0 ? 5 : 10);

  it('cabe em uma linha → 1 linha com segmentos por run', () => {
    const lines = layoutRichLines(['ab', 'cd'], 1000, measure);
    expect(lines).toEqual([[{ text: 'ab', run: 0 }, { text: 'cd', run: 1 }]]);
  });

  it('quebra em espaço e descarta o espaço da virada', () => {
    const lines = layoutRichLines(['aaa bbb'], 15, measure);
    expect(lines).toEqual([[{ text: 'aaa', run: 0 }], [{ text: 'bbb', run: 0 }]]);
  });

  it('palavra maior que a linha quebra por caractere', () => {
    const lines = layoutRichLines(['abcdef'], 15, measure);
    expect(lines).toEqual([[{ text: 'abc', run: 0 }], [{ text: 'def', run: 0 }]]);
  });

  it('\\n força quebra', () => {
    const lines = layoutRichLines(['a\nb'], 1000, measure);
    expect(lines).toEqual([[{ text: 'a', run: 0 }], [{ text: 'b', run: 0 }]]);
  });

  it('runs diferentes na mesma linha respeitam a medida de cada um', () => {
    // "aa" (10) + "bb" (20) = 30 cabe; "cc" (20) não cabe em 40 → 2ª linha
    const lines = layoutRichLines(['aa ', 'bb cc'], 40, measure);
    expect(lines).toEqual([
      [{ text: 'aa ', run: 0 }, { text: 'bb', run: 1 }],
      [{ text: 'cc', run: 1 }],
    ]);
  });

  it('texto vazio → uma linha vazia', () => {
    expect(layoutRichLines([''], 100, measure)).toEqual([[]]);
  });
});

describe('PATTERN_MASKS — densidade dos padrões legados', () => {
  const density = (mask: number[]): number => {
    let on = 0;
    for (const row of mask) for (let b = 0; b < 8; b++) if (row & (1 << b)) on++;
    return on / (mask.length * 8);
  };

  it('densidades canônicas (gray125=12,5%, mediumGray=50%, darkGray=75%)', () => {
    expect(density(PATTERN_MASKS['gray0625']!)).toBeCloseTo(0.0625, 5);
    expect(density(PATTERN_MASKS['gray125']!)).toBeCloseTo(0.125, 5);
    expect(density(PATTERN_MASKS['lightGray']!)).toBeCloseTo(0.25, 5);
    expect(density(PATTERN_MASKS['mediumGray']!)).toBeCloseTo(0.5, 5);
    expect(density(PATTERN_MASKS['darkGray']!)).toBeCloseTo(0.75, 5);
  });

  it('todos os padrões da spec existem', () => {
    for (const name of [
      'gray125', 'gray0625', 'darkGray', 'mediumGray', 'lightGray',
      'darkHorizontal', 'darkVertical', 'darkDown', 'darkUp', 'darkGrid', 'darkTrellis',
      'lightHorizontal', 'lightVertical', 'lightDown', 'lightUp', 'lightGrid', 'lightTrellis',
    ]) {
      expect(PATTERN_MASKS[name], name).toBeDefined();
      expect(PATTERN_MASKS[name]!.length).toBe(8);
    }
  });
});


describe('boundaryAt — zona de agarre do resize no cabeçalho', () => {
  // EDGES: colunas de 50px; borda final da coluna k em k*50
  it('borda exata e tolerância ±3', () => {
    expect(boundaryAt(EDGES, 50, 0, 0, 5)).toBe(1);
    expect(boundaryAt(EDGES, 48, 0, 0, 5)).toBe(1);
    expect(boundaryAt(EDGES, 52, 0, 0, 5)).toBe(1);
    expect(boundaryAt(EDGES, 46, 0, 0, 5)).toBeNull();  // longe demais
    expect(boundaryAt(EDGES, 25, 0, 0, 5)).toBeNull();  // meio da célula
  });
  it('com scroll: borda da coluna rolada', () => {
    // scroll 30: borda da col 2 (grid 100) está na tela em 70
    expect(boundaryAt(EDGES, 70, 0, 30, 5)).toBe(2);
  });
  it('com freeze: faixa congelada não recebe scroll e tem preferência na linha do split', () => {
    // 1 col congelada; scroll 100. Borda da col 1 fica fixa em 50.
    expect(boundaryAt(EDGES, 50, 1, 100, 5)).toBe(1);
    // ambíguo na linha do split (col 1 congelada × col 3 rolada): congelada vence
    expect(boundaryAt(EDGES, 52, 1, 100, 5)).toBe(1);
    // fora da zona congelada, soma o scroll: tela 55 + scroll 45 → grid 100 → col 2
    expect(boundaryAt(EDGES, 55, 1, 45, 5)).toBe(2);
  });
});

describe('pxToColWidthChars — inversa da fórmula MDW', () => {
  it('round-trip com colWidthPx para larguras comuns', () => {
    const colWidthPx = (w: number): number =>
      Math.floor(((256 * w + Math.floor(128 / 7)) / 256) * 7);
    for (const px of [14, 35, 59, 64, 70, 100, 250]) {
      const w = pxToColWidthChars(px);
      expect(colWidthPx(w)).toBe(px);
    }
  });
  it('0 e negativos viram 0', () => {
    expect(pxToColWidthChars(0)).toBe(0);
    expect(pxToColWidthChars(-5)).toBe(0);
  });
});

describe('pxToRowHeightPt', () => {
  it('px → pontos em quartos exatos', () => {
    expect(pxToRowHeightPt(20)).toBe(15);
    expect(pxToRowHeightPt(28)).toBe(21);
    expect(pxToRowHeightPt(27)).toBe(20.25);
  });
});