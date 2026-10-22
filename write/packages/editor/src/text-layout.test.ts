import { describe, expect, it } from 'vitest';
import type { SectPr } from '@universal-office/docx-core';
import {
  flowDirect, flowValue, lineNumberingFromOptions, lineNumberingInfo, manualPoints, offsetAfterLetters, spacingDirect,
  withLineNumberMode, wordAround, common,
} from './text-layout.js';

// Regras do Word medidas em write/tools/textlayout-lab (results/*.xml|json).
const SP = (ln?: SectPr['lnNumType']): SectPr => ({
  pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417,
  ...(ln ? { lnNumType: ln } : {}),
});

describe('números de linha', () => {
  it('menu: Contínuo/Cada Página/Cada Seção nos atributos do Word (ln-cont, ln-page, ln-section)', () => {
    expect(withLineNumberMode(SP(), 'continuous')).toEqual({ countBy: 1, restart: 'continuous' });
    expect(withLineNumberMode(SP(), 'page')).toEqual({ countBy: 1 });
    expect(withLineNumberMode(SP(), 'section')).toEqual({ countBy: 1, restart: 'newSection' });
    expect(withLineNumberMode(SP({ countBy: 1 }), 'none')).toBeUndefined();
  });
  it('menu por cima de opções mantém início, contar por e distância (ln-cont-over)', () => {
    expect(withLineNumberMode(SP({ countBy: 5, start: 2, distance: 567 }), 'continuous')).toEqual({ countBy: 5, start: 2, distance: 567, restart: 'continuous' });
  });
  it('ligar de novo: a sessão lembra início e distância; contar por volta a 1 (ln-off-on)', () => {
    expect(withLineNumberMode(SP(), 'continuous', { start: 2, distance: 567 })).toEqual({ countBy: 1, start: 2, distance: 567, restart: 'continuous' });
  });
  it('diálogo: "Iniciar em" − 1, Automático sem distância, limites do Word (ln-all, limits)', () => {
    expect(lineNumberingFromOptions({ on: true, startAt: 3, countBy: 5, distanceTwips: 567, restart: 'section' })).toEqual({ countBy: 5, start: 2, distance: 567, restart: 'newSection' });
    expect(lineNumberingFromOptions({ on: true, startAt: 1, countBy: 1, distanceTwips: 0, restart: 'page' })).toEqual({ countBy: 1 });
    expect(lineNumberingFromOptions({ on: true, startAt: 99999, countBy: 500, distanceTwips: 99999, restart: 'continuous' })).toEqual({ countBy: 100, start: 32766, distance: 31680, restart: 'continuous' });
    expect(lineNumberingFromOptions({ on: false, startAt: 1, countBy: 1, distanceTwips: 0, restart: 'page' })).toBeUndefined();
  });
  it('lê como o diálogo mostra; sem countBy (ou 0) o Word não numera (lnnum3)', () => {
    expect(lineNumberingInfo(SP({ countBy: 5, start: 2, distance: 567, restart: 'newSection' }))).toEqual({ mode: 'section', startAt: 3, countBy: 5, distanceTwips: 567 });
    expect(lineNumberingInfo(SP({ restart: 'continuous' })).mode).toBe('none');
    expect(lineNumberingInfo(SP({ countBy: 0 })).mode).toBe('none');
    expect(lineNumberingInfo(SP()).mode).toBe('none');
  });
});

describe('quebras de linha e de página', () => {
  it('órfãs/viúvas é ligado sem elemento; as outras, desligadas (pf-widow-off)', () => {
    expect(flowValue({}, 'widowControl')).toBe(true);
    expect(flowValue({ widowControl: false }, 'widowControl')).toBe(false);
    expect(flowValue({}, 'keepNext')).toBe(false);
    expect(flowValue({ keepNext: true }, 'keepNext')).toBe(true);
  });
  it('direto = só o que difere do herdado (pf-heading-off, pf-widow-on)', () => {
    expect(flowDirect(true, false)).toBe(false);
    expect(flowDirect(true, true)).toBeUndefined();
    expect(flowDirect(false, true)).toBe(true);
  });
});

describe('espaçamento antes/depois (caixas numéricas)', () => {
  it('igual ao herdado não grava (sp-after-same); outro valor grava', () => {
    expect(spacingDirect({ twips: 160, auto: false }, 160, 'after')).toEqual({ spaceAfterAuto: undefined, spaceAfterTwips: undefined });
    expect(spacingDirect({ twips: 160, auto: false }, 240, 'after')).toEqual({ spaceAfterAuto: undefined, spaceAfterTwips: 240 });
  });
  it('"Automático" grava só o autospacing; valor tira o Automático herdado (sp-before-auto)', () => {
    expect(spacingDirect({ twips: 0, auto: false }, 'auto', 'before')).toEqual({ spaceBeforeAuto: true });
    expect(spacingDirect({ twips: 0, auto: true }, 'auto', 'before')).toEqual({ spaceBeforeAuto: undefined });
    expect(spacingDirect({ twips: 0, auto: true }, 0, 'before')).toEqual({ spaceBeforeAuto: false, spaceBeforeTwips: 0 });
  });
  it('valor comum ou null (seleção com valores diferentes)', () => {
    expect(common([1, 1, 1])).toBe(1);
    expect(common([1, 2])).toBeNull();
    expect(common(['auto', 'auto'])).toBe('auto');
  });
});

describe('hifenização manual', () => {
  it('palavra em torno do ponto (letras e hífens opcionais)', () => {
    const t = 'texto condensado, fim';
    expect(wordAround(t, 9)).toEqual([6, 16]);
    expect(wordAround('hife\u00ADnizacao manual', 6)).toEqual([0, 12]);
  });
  it('pontos dos padrões somados aos hífens opcionais que a palavra já tem', () => {
    expect(manualPoints('con\u00ADdensado', [3, 6])).toEqual({ word: 'condensado', points: [3, 6] });
    expect(manualPoints('conden\u00ADsado', [3])).toEqual({ word: 'condensado', points: [3, 6] });
  });
  it('offset antes da letra N+1 (depois do hífen opcional que já esteja ali)', () => {
    expect(offsetAfterLetters('condensado', 10, 3)).toBe(13);
    expect(offsetAfterLetters('con\u00ADdensado', 10, 3)).toBe(14);
    expect(offsetAfterLetters('con\u00ADdensado', 10, 6)).toBe(17);
  });
});
