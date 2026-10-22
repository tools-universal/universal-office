import { describe, expect, it } from 'vitest';
import {
  dedupeTabs, drawingGridOf, findInText, gridLines, headingSpan, indentsDirect, matchSnippet, moveMap, snapTo, rulerSnap, tabsDirect,
} from './navigation.js';

// Casos do oráculo do Word (write/tools/nav-lab/results/*.xml).
describe('tabulações: o mínimo que o Word grava', () => {
  const style = [{ val: 'left' as const, pos: 2000 }, { val: 'right' as const, pos: 4000, leader: 'dot' as const }];

  it('nova tabulação sem herdadas (tab-left, tab-types, tab-order)', () => {
    expect(tabsDirect(undefined, [{ pos: 2160, align: 'right' }, { pos: 1440, align: 'left' }])).toEqual([
      { posTwips: 1440, align: 'left' }, { posTwips: 2160, align: 'right' },
    ]);
  });
  it('igual à herdada não grava (tab-same-as-style)', () => {
    expect(tabsDirect(style, [{ pos: 2000, align: 'left' }, { pos: 4000, align: 'right', leader: 'dot' }])).toBeUndefined();
  });
  it('outro tipo na posição da herdada: grava sem clear (tab-retype-style)', () => {
    expect(tabsDirect(style, [{ pos: 2000, align: 'center' }, { pos: 4000, align: 'right', leader: 'dot' }])).toEqual([{ posTwips: 2000, align: 'center' }]);
  });
  it('herdada removida vira clear (tab-clear-style item 2, tab-clearall-style)', () => {
    expect(tabsDirect(style, [{ pos: 2000, align: 'left' }])).toEqual([{ posTwips: 4000, align: 'clear' }]);
    expect(tabsDirect(style, [])).toEqual([{ posTwips: 2000, align: 'clear' }, { posTwips: 4000, align: 'clear' }]);
  });
  it('mover herdada: clear na antiga + a nova, em ordem (tab-move-style)', () => {
    expect(tabsDirect(style, [{ pos: 3000, align: 'left' }, { pos: 4000, align: 'right', leader: 'dot' }])).toEqual([
      { posTwips: 2000, align: 'clear' }, { posTwips: 3000, align: 'left' },
    ]);
  });
  it('clear direto não conta como herdada', () => {
    expect(tabsDirect([{ val: 'clear', pos: 1000 }], [{ pos: 1000, align: 'left' }])).toEqual([{ posTwips: 1000, align: 'left' }]);
  });
  it('uma por posição', () => {
    expect(dedupeTabs([{ pos: 10.4, align: 'left' }, { pos: 10, align: 'right' }])).toEqual([{ pos: 10, align: 'right' }]);
  });
});

describe('recuos: só o que difere do herdado', () => {
  it('sem herdado: valores diretos (ind-left, ind-hanging, ind-first)', () => {
    expect(indentsDirect(undefined, { left: 720, right: 0, firstLine: -360 })).toEqual({ indentLeftTwips: 720, indentRightTwips: undefined, indentFirstLineTwips: -360 });
  });
  it('voltar ao herdado tira o atributo (ind-to-zero, ind-style-same)', () => {
    expect(indentsDirect(undefined, { left: 0, right: 0, firstLine: 0 })).toEqual({ indentLeftTwips: undefined, indentRightTwips: undefined, indentFirstLineTwips: undefined });
    expect(indentsDirect({ left: 720 }, { left: 720, right: 0, firstLine: 0 }).indentLeftTwips).toBeUndefined();
  });
  it('zero contra estilo com recuo grava 0 (ind-style-zero)', () => {
    expect(indentsDirect({ left: 720 }, { left: 0, right: 0, firstLine: 0 }).indentLeftTwips).toBe(0);
  });
  it('lista: o deslocamento do nível fica herdado (ind-list, ind-list-first)', () => {
    expect(indentsDirect({ left: 720, hanging: 360 }, { left: 1080, right: 0, firstLine: -360 })).toEqual({ indentLeftTwips: 1080, indentRightTwips: undefined, indentFirstLineTwips: undefined });
    expect(indentsDirect({ left: 720, hanging: 360 }, { left: 720, right: 0, firstLine: 0 }).indentFirstLineTwips).toBe(0);
  });
});

describe('seções de título', () => {
  const lv = [0, 1, 0, 2, 0, 2, 1, 0, 3, 1];
  it('título leva o que vem até o próximo de nível igual ou maior', () => {
    expect(headingSpan(lv, 1)).toEqual([1, 6]);
    expect(headingSpan(lv, 3)).toEqual([3, 5]);
    expect(headingSpan(lv, 6)).toEqual([6, 9]);
    expect(headingSpan(lv, 9)).toEqual([9, 10]);
    expect(headingSpan(lv, 0)).toEqual([0, 1]);
  });
  it('moveMap: para antes de um título depois ou antes', () => {
    // [1,3) para antes de 5 → 0,3,4,1,2,5
    expect(moveMap(6, 1, 3, 5)).toEqual([0, 3, 4, 1, 2, 5]);
    // [3,5) para antes de 1 → 0,3,4,1,2,5
    expect(moveMap(6, 3, 5, 1)).toEqual([0, 3, 4, 1, 2, 5]);
    // para o fim
    expect(moveMap(5, 0, 2, 5)).toEqual([3, 4, 0, 1, 2]);
  });
});

describe('busca', () => {
  it('sem diferenciar maiúsculas (pt-BR) e palavras inteiras', () => {
    expect(findInText('Recuo e recuos; RECUO.', 'recuo')).toEqual([0, 8, 16]);
    expect(findInText('Recuo e recuos; RECUO.', 'recuo', { wholeWord: true })).toEqual([0, 16]);
    expect(findInText('Recuo e recuos', 'Recuo', { matchCase: true })).toEqual([0]);
    expect(findInText('Ação acao', 'ação')).toEqual([0]);
    expect(findInText('aaaa', 'aa')).toEqual([0, 2]);
    expect(findInText('abc', '')).toEqual([]);
  });
  it('trecho: começa em palavra e corta com reticências', () => {
    const t = 'Um texto bem comprido e mais comprido ainda antes da palavra procurada e muito texto depois dela para cortar no fim do trecho que aparece.';
    const i = t.indexOf('procurada');
    const s = matchSnippet(t, i, i + 9);
    expect(s.match).toBe('procurada');
    expect(s.before.startsWith('…')).toBe(true);
    expect(s.before.endsWith('palavra ')).toBe(true);
    expect(s.after.endsWith('…')).toBe(true);
    expect(matchSnippet('curto', 0, 5)).toEqual({ before: '', match: 'curto', after: '' });
  });
});

describe('grade do documento e régua', () => {
  it('padrões do Word: 9 pt nas duas direções, a cada 1, origem nas margens (grid-defaults)', () => {
    expect(drawingGridOf(undefined)).toEqual({ hSpacing: 180, vSpacing: 180, everyH: 1, everyV: 1, fromMargins: true, originX: 0, originY: 0 });
  });
  it('o que o diálogo de grade grava (grid-spacing, grid-origin)', () => {
    const x = '<w:settings><w:drawingGridHorizontalSpacing w:val="240"/><w:drawingGridVerticalSpacing w:val="360"/><w:displayHorizontalDrawingGridEvery w:val="2"/><w:displayVerticalDrawingGridEvery w:val="0"/><w:doNotUseMarginsForDrawingGridOrigin/><w:drawingGridHorizontalOrigin w:val="600"/><w:drawingGridVerticalOrigin w:val="800"/></w:settings>';
    expect(drawingGridOf(x)).toEqual({ hSpacing: 240, vSpacing: 360, everyH: 2, everyV: 0, fromMargins: false, originX: 600, originY: 800 });
  });
  it('linhas a partir da origem dentro da caixa', () => {
    const g = drawingGridOf(undefined);
    const { xs, ys } = gridLines(g, { x0: 1000, y0: 1000, x1: 1400, y1: 1200 }, { x: 1000, y: 1000 });
    expect(xs).toEqual([1000, 1180, 1360]);
    expect(ys).toEqual([1000, 1180]);
    expect(gridLines({ ...g, everyV: 0 }, { x0: 0, y0: 0, x1: 500, y1: 0 }, { x: 0, y: 0 }).xs).toEqual([]);
  });
  it('encaixe: 0,25 cm e 1/16"', () => {
    expect(snapTo(700, rulerSnap('cm'))).toBe(709);
    expect(rulerSnap('in')).toBe(90);
  });
});
