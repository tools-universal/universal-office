import { describe, it, expect } from 'vitest';
import { Hyphenator, hyphenationPatternId, hyphenatorFor, loadHyphenation, HYPHENATION_PATTERN_IDS } from '../../src/typography/index.js';

const fmt = (w: string, pts: number[]) => Array.from(w).map((c, i) => (pts.includes(i + 1) ? `${c}-` : c)).join('');

describe('algoritmo de Liang', () => {
  // padrões do exemplo de Liang/Knuth (TeXbook, apêndice H) — só os que tocam "hyphenation"
  const h = new Hyphenator({ id: 't', left: 2, right: 3, patterns: 'hy3ph he2n hena4 hen5at 1na n2at 1tio 2io o2n', exceptions: 'ta-ble' });

  it('maior valor entre letras, ímpar quebra', () => {
    expect(fmt('hyphenation', h.points('hyphenation'))).toBe('hy-phen-ation');
  });
  it('mínimos de letras antes/depois', () => {
    expect(h.hyphenate('hyphenation', 2, 3)).toEqual([2, 6]);
    expect(h.hyphenate('hyphenation', 3, 3)).toEqual([6]);
    expect(h.hyphenate('hyphenation', 2, 6)).toEqual([2]);
  });
  it('exceção manda sobre os padrões; maiúsculas como minúsculas', () => {
    expect(h.points('table')).toEqual([2]);
    expect(fmt('HYPHENATION', h.points('HYPHENATION'))).toBe('HY-PHEN-ATION');
  });
});

describe('padrões hyph-utf8 gerados', async () => {
  await loadHyphenation(HYPHENATION_PATTERN_IDS);
  const hy = (lang: string, w: string, left = 2, right = 3) => fmt(w, hyphenatorFor(lang)!.hyphenate(w, left, right));

  it('idioma → padrões (todo inglês com os americanos, como o Word)', () => {
    expect(hyphenationPatternId('pt-BR')).toBe('pt');
    expect(hyphenationPatternId('pt-PT')).toBe('pt');
    expect(hyphenationPatternId('en-GB')).toBe('en-us');
    expect(hyphenationPatternId('es-MX')).toBe('es');
    expect(hyphenationPatternId('de-CH')).toBe('de-1996');
    expect(hyphenationPatternId('ja-JP')).toBeUndefined();
    expect(hyphenationPatternId(undefined)).toBeUndefined();
  });
  it('pontos iguais aos do Word (varredura do oráculo)', () => {
    expect(hy('pt-BR', 'responsabilidade')).toBe('res-pon-sa-bi-li-dade');
    expect(hy('pt-BR', 'responsabilidade', 2, 2)).toBe('res-pon-sa-bi-li-da-de');
    expect(hy('pt-BR', 'administração')).toBe('ad-mi-nis-tra-ção');
    expect(hy('pt-BR', 'cidade')).toBe('ci-dade');
    expect(hy('en-US', 'participation')).toBe('par-tic-i-pa-tion');
    expect(hy('es-ES', 'declaraciones')).toBe('de-cla-ra-cio-nes');
  });
  it('outros idiomas carregam', () => {
    expect(hy('fr-FR', 'responsabilité', 2, 2)).toBe('res-pon-sa-bi-li-té');
    expect(hy('de-DE', 'Zusammenarbeit', 2, 2)).toBe('Zu-sam-men-ar-beit');
    expect(hy('it-IT', 'comunicazione', 2, 2)).toBe('co-mu-ni-ca-zio-ne');
    expect(hy('nl-NL', 'samenwerking', 2, 2)).toBe('sa-men-wer-king');
  });
});
