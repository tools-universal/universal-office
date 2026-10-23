// Localizar/Substituir contra o Word (write/tools/home-lab results/find, exp-find.ps1).
import { describe, expect, it } from 'vitest';
import type { Paragraph, RunProps } from '@universal-office/docx-core';
import { adaptCase, expandReplacement, findAll, metaphone, storyText, wildcardRegex, wordForms, FindError, type FindQuery } from './find-engine.js';

const props = (p: Partial<RunProps> = {}): RunProps => ({ bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false, ...p });
const para = (...runs: (string | [string, Partial<RunProps>])[]): Paragraph =>
  ({ runs: runs.map((r) => (typeof r === 'string' ? { text: r, props: props() } : { text: r[0], props: props(r[1]) })), props: {} }) as unknown as Paragraph;
const doc = (...texts: string[]): Paragraph[] => texts.map((t) => para(t));

/** [início, fim, texto] como no Find-All do oráculo (índices no texto com ¶ = \r). */
function hits(paras: Paragraph[], q: FindQuery): [number, number, string][] {
  const st = storyText(paras);
  return findAll(st, q).map((h) => [h.start, h.end, st.text.slice(h.start, h.end)]);
}

describe('opções da busca (oráculo f-whole, f-ignore, f-accent)', () => {
  const WHOLE = "cat cat's cats bobcat cat-dog (cat) cat_x 3cat cat3 CAT pão pãozinho";
  it('palavras inteiras: "_" e o apóstrofo são fronteira; dígitos são da palavra', () => {
    expect(hits(doc(WHOLE), { text: 'cat', wholeWord: true }).map((h) => h[0])).toEqual([0, 4, 22, 31, 36, 52]);
    expect(hits(doc(WHOLE), { text: 'pão', wholeWord: true }).map((h) => h[0])).toEqual([56]);
  });
  it('sem diferenciar maiúsculas acha CAT; com, não', () => {
    expect(hits(doc(WHOLE), { text: 'cat' }).length).toBe(10);
    expect(hits(doc(WHOLE), { text: 'cat', matchCase: true }).length).toBe(9);
  });
  it('prefixo, sufixo e os dois', () => {
    expect(hits(doc(WHOLE), { text: 'cat', prefix: true }).map((h) => h[0])).toEqual([0, 4, 10, 22, 31, 36, 47, 52]);
    expect(hits(doc(WHOLE), { text: 'cat', suffix: true }).map((h) => h[0])).toEqual([0, 18, 22, 31, 36, 43, 52]);
    expect(hits(doc(WHOLE), { text: 'cat', prefix: true, suffix: true }).map((h) => h[0])).toEqual([0, 22, 31, 36, 52]);
  });
  it('palavras inteiras não vale com espaço no texto procurado', () => {
    expect(hits(doc(WHOLE), { text: 'cat cat', wholeWord: true }).map((h) => h[0])).toEqual([0, 18, 43]);
  });
  const IGN = 'a,b a.b ab a b a-b a  b a, b a\tb a;b';
  it('ignorar pontuação / espaços / os dois', () => {
    expect(hits(doc(IGN), { text: 'ab', ignorePunct: true }).map((h) => h[0])).toEqual([0, 4, 8, 15, 33]);
    expect(hits(doc(IGN), { text: 'ab', ignoreSpace: true }).map((h) => h[0])).toEqual([8, 11, 19, 29]);
    expect(hits(doc(IGN), { text: 'ab', ignorePunct: true, ignoreSpace: true }).map((h) => h[0])).toEqual([0, 4, 8, 11, 15, 19, 24, 29, 33]);
    expect(hits(doc(IGN), { text: 'a.b', ignorePunct: true }).map((h) => h[0])).toEqual([4]);
    expect(hits(doc(IGN), { text: 'a b', ignoreSpace: true }).map((h) => h[0])).toEqual([11, 19]);
  });
  it('acentos contam; a caixa não', () => {
    const t = 'ação acao AÇÃO';
    expect(hits(doc(t), { text: 'ação' }).map((h) => h[0])).toEqual([0, 10]);
    expect(hits(doc(t), { text: 'acao' }).map((h) => h[0])).toEqual([5]);
  });
});

describe('curingas (oráculo f-wild, f-wild2)', () => {
  const T = 'The quick brown fox jumps over 12 lazy dogs; 2024-10-23 (test) aaa bb ccc. Tot tat tooth.';
  const w = (p: string): [number, number, string][] => hits(doc(T), { text: p, wildcards: true });
  it('? * < > [ ] e grupos', () => {
    expect(w('?o?').map((h) => h[2])).toEqual(['row', 'fox', ' ov', 'dog', 'Tot', 'too']);
    expect(w('<b*n>').map((h) => h[2])).toEqual(['brown']);
    expect(w('o*o').map((h) => h[2])).toEqual(['own fo', 'over 12 lazy do', 'ot tat to']);
    expect(w('<(t*)>').map((h) => h[2])).toEqual(['test', 'tat', 'tooth']);
    expect(w('\\(*\\)').map((h) => h[2])).toEqual(['(test)']);
    expect(w('[A-Z]').map((h) => h[0])).toEqual([0, 75]);
    expect(w('<t?t>').map((h) => h[2])).toEqual(['tat']);
    expect(w('t*t').map((h) => h[2])).toEqual(['test', 't t', 't t']);
    expect(w('a{2}').map((h) => h[2])).toEqual(['aa']);
    expect(w('<[0-9]{4}').map((h) => h[2])).toEqual(['2024']);
    expect(w('[0-9]{2}>').map((h) => h[2])).toEqual(['12', '24', '10', '23']);
  });
  it('@ é o MENOR (1); {n;} e {n;m} são o maior', () => {
    expect(w('[0-9]@').map((h) => h[2]).slice(0, 3)).toEqual(['1', '2', '2']);
    const t2 = doc('2024 7 12345 aab abc ab', 'um dois', 'tres');
    const w2 = (p: string): string[] => hits(t2, { text: p, wildcards: true }).map((h) => h[2]);
    expect(w2('[0-9]{2;}')).toEqual(['2024', '12345']);
    expect(w2('[0-9]{2,3}')).toEqual(['202', '123', '45']);
    expect(w2('(a)@b')).toEqual(['aab', 'ab', 'ab']);
    expect(w2('um*tres')).toEqual(['um dois\rtres']);
    expect(w2('dois?tres')).toEqual(['dois\rtres']);
    expect(w2('dois^13tres')).toEqual(['dois\rtres']);
  });
  it('padrão inválido', () => {
    expect(() => wildcardRegex('[z-a]')).toThrow(FindError);
    expect(() => wildcardRegex('(ab')).toThrow(FindError);
  });
});

describe('especiais (oráculo f-specials)', () => {
  const p = doc('a\tb c\nd e­f‑g — h – 7 x');
  it('^t ^l ^s ^- ^~ ^+ ^= ^# ^$ ^w', () => {
    const at = (t: string): number[] => hits(p, { text: t }).map((h) => h[0]);
    expect(at('^t')).toEqual([1]);
    expect(at('^l')).toEqual([5]);
    expect(at('^s')).toEqual([7]);
    expect(at('^-')).toEqual([9]);
    expect(at('^~')).toEqual([11]);
    expect(at('^+')).toEqual([14]);
    expect(at('^=')).toEqual([18]);
    expect(at('^#')).toEqual([20]);
    expect(at('^0160')).toEqual([7]);
    expect(hits(p, { text: '^w' })[0]).toEqual([1, 2, '\t']);
    // ^? não pega o hífen opcional
    expect(hits(p, { text: '^?' }).some((h) => h[0] === 9)).toBe(false);
  });
  it('^p atravessa parágrafos', () => {
    expect(hits(doc('um', 'dois', 'tres'), { text: 'um^pdois' })).toEqual([[0, 7, 'um\rdois']]);
  });
});

describe('formatação (oráculo f-format)', () => {
  const p = [para('um ', ['dois', { bold: true }], ' tres ', ['quatro', { bold: true }])];
  it('sem texto: os trechos contínuos em negrito', () => {
    expect(hits(p, { text: '', format: { bold: true } }).map((h) => h[2])).toEqual(['dois', 'quatro']);
  });
  it('com texto: só onde a formatação vale', () => {
    expect(hits(p, { text: 'o', format: { bold: true } }).map((h) => h[0])).toEqual([4, 18]);
  });
});

describe('"soa como" e formas (oráculo f-sounds, f-forms)', () => {
  it('Metaphone', () => {
    const t = doc('Smith Smyth Smithe Schmidt Smit Smote Sand night knight nite');
    expect(hits(t, { text: 'Smith', soundsLike: true }).map((h) => h[2])).toEqual(['Smith', 'Smyth', 'Smithe']);
    expect(hits(t, { text: 'night', soundsLike: true }).map((h) => h[2])).toEqual(['night', 'knight', 'nite']);
    expect(metaphone('Knight')).toBe(metaphone('nite'));
  });
  it('todas as formas', () => {
    const t = doc('go went gone going goes sit sat sitting sits mouse mice run ran running runs good better best');
    const f = (w: string): string[] => hits(t, { text: w, allForms: true }).map((h) => h[2]);
    expect(f('go')).toEqual(['go', 'went', 'gone', 'going', 'goes']);
    expect(f('sat')).toEqual(['sit', 'sat', 'sitting', 'sits']);
    expect(f('sits')).toEqual(['sit', 'sat', 'sitting', 'sits']);
    expect(f('mouse')).toEqual(['mouse', 'mice']);
    expect(f('run')).toEqual(['run', 'ran', 'running', 'runs']);
    expect(f('good')).toEqual(['good', 'better', 'best']);
    expect([...wordForms('stop')]).toContain('stopped');
  });
  it('fora do inglês, só a palavra (oráculo f-forms-pt)', () => {
    const t = doc('fazer fez feito fazendo faz casa casas');
    const st = storyText(t);
    const r = findAll(st, { text: 'casa', allForms: true }, { lang: () => 'pt-BR' });
    expect(r.map((h) => st.text.slice(h.start, h.end))).toEqual(['casa']);
  });
});

describe('substituição (oráculo f-case, f-wildrepl, f-specials-repl)', () => {
  it('a caixa do novo segue a do encontrado (só sobe)', () => {
    const r = (found: string, rep: string): string => adaptCase(found, rep);
    expect(['HELLO', 'hello', 'Hello', 'hELLO', 'HeLLo'].map((f) => r(f, 'bye')).join(' ')).toBe('BYE bye Bye bye Bye');
    expect(['HELLO', 'hello', 'Hello', 'hELLO', 'HeLLo'].map((f) => r(f, 'bYe')).join(' ')).toBe('BYE bYe BYe bYe BYe');
    expect(['HELLO', 'hello', 'Hello'].map((f) => r(f, 'BYE')).join(' ')).toBe('BYE BYE BYE');
    expect(r('HELLO WORLD', 'good bye')).toBe('GOOD BYE');
    expect(r('Hello world', 'good bye')).toBe('Good bye');
    expect(r('H', 'xy')).toBe('XY');
    expect(r('HELLO', '2x')).toBe('2X');
  });
  it('\\1 \\2, ^& e os especiais', () => {
    expect(expandReplacement('\\2, \\1', 'John Smith', ['John', 'Smith'], true)).toBe('Smith, John');
    expect(expandReplacement('[^&]', 'fox', undefined, false)).toBe('[fox]');
    expect(expandReplacement('^^', 'x', undefined, false)).toBe('^');
    expect(expandReplacement('^t^l^s^m^p', 'x', undefined, false)).toBe('\t\n \f\r');
    expect(expandReplacement('<^c>', 'x', undefined, false, 'clip')).toBe('<clip>');
  });
});
