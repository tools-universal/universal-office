import { describe, expect, it } from 'vitest';
import { withWordSpaces, type WordSpaceCursor } from '../src/pdf-word-spaces.js';
import type { LayoutFont } from '../src/typography/index.js';

/** Fonte monoespaçada falsa: todo glifo (inclusive o espaço) avança 100 twips. */
const font = (hasSpace = true): LayoutFont => ({
  advanceTwips: () => 100,
  glyphId: (cp: number) => (cp === 32 && !hasSpace ? 0 : cp),
} as unknown as LayoutFont);

const glyphs = (...xs: [string, number][]): { cp: number; x: number }[] => xs.map(([c, x]) => ({ cp: c.codePointAt(0)!, x }));
const text = (gs: { cp: number }[]): string => gs.map((g) => String.fromCodePoint(g.cp)).join('');

describe('withWordSpaces', () => {
  it('grava o espaço onde há a lacuna de uma palavra, e não entre letras vizinhas', () => {
    const cursor: WordSpaceCursor = { last: null };
    const out = withWordSpaces(glyphs(['a', 0], ['b', 100], ['c', 300], ['d', 400]), font(), 11, 1, 1000, cursor);
    expect(text(out)).toBe('ab cd');
    expect(out[2]).toEqual({ cp: 32, x: 200 });
  });

  it('lacuna menor que meio espaço (kerning, espaçamento) não vira espaço', () => {
    const out = withWordSpaces(glyphs(['a', 0], ['b', 140]), font(), 11, 1, 1000, { last: null });
    expect(text(out)).toBe('ab');
  });

  it('entre corridas da mesma linha (estilo muda depois do espaço) o espaço vai no começo da seguinte', () => {
    const cursor: WordSpaceCursor = { last: null };
    withWordSpaces(glyphs(['a', 0], ['b', 100]), font(), 11, 1, 1000, cursor);
    expect(text(withWordSpaces(glyphs(['c', 300]), font(), 11, 1, 1000, cursor))).toBe(' c');
    expect(text(withWordSpaces(glyphs(['d', 2000]), font(), 11, 1, 1300, cursor))).toBe('d');
  });

  it('fonte sem glifo de espaço fica como está', () => {
    expect(text(withWordSpaces(glyphs(['a', 0], ['b', 500]), font(false), 11, 1, 1000, { last: null }))).toBe('ab');
  });
});
