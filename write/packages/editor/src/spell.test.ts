import { describe, expect, it } from 'vitest';
import type { Paragraph, Run, StyleSheet } from '@universal-office/docx-core';
import { LangResolver, ParagraphSpell, misspellingAt, spellSpans, type SpellEngine } from './spell.js';

const run = (text: string, extra: Partial<Run> = {}): Run =>
  ({ text, props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false }, ...extra });
const para = (...runs: Run[]): Paragraph => ({ runs, props: {} });

const sheet: StyleSheet = {
  docDefaults: { rPr: { lang: { val: 'en-US' } } },
  styles: {
    Normal: { styleId: 'Normal', type: 'paragraph', rPr: { lang: { val: 'pt-BR' } } },
    Codigo: { styleId: 'Codigo', type: 'character', rPr: { noProof: true } },
    Citacao: { styleId: 'Citacao', type: 'paragraph', basedOn: 'Normal' },
  },
  defaults: { paragraph: 'Normal' },
};

/** Motor falso: "erro" = palavra que contém "xx"; conta as chamadas. */
function fakeEngine(): SpellEngine & { calls: number; fire: () => void } {
  let listener: (() => void) | null = null;
  const e = {
    calls: 0,
    async checkText(text: string) {
      e.calls++;
      const out: { word: string; start: number; end: number }[] = [];
      for (const m of text.matchAll(/\p{L}+/gu)) if (m[0].includes('xx')) out.push({ word: m[0], start: m.index!, end: m.index! + m[0].length });
      return out;
    },
    async suggest() { return []; },
    async add() {},
    ignore() {},
    resolve: (lang: string) => (lang.startsWith('pt') ? { id: 'pt-BR', exact: lang === 'pt-BR' } : lang.startsWith('en') ? { id: 'en-US', exact: true } : undefined),
    onChange(cb: () => void) { listener = cb; return () => { listener = null; }; },
    dispose() {},
    fire() { listener?.(); },
  };
  return e;
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('revisão ortográfica do Write', () => {
  it('idioma: run → estilo de caractere → estilo do parágrafo (basedOn) → padrões', () => {
    const langs = new LangResolver(sheet);
    const p = { ...para(run('a')), props: { styleId: 'Citacao' } };
    expect(langs.run(run('a'), p).lang).toBe('pt-BR');
    expect(langs.run(run('a', { rpr: { lang: { val: 'en-GB' } } }), p).lang).toBe('en-GB');
    expect(langs.run(run('a', { rpr: { rStyle: 'Codigo' } }), p).noProof).toBe(true);
    expect(new LangResolver(undefined).run(run('a'), p).lang).toBe('pt-BR');
  });

  it('trechos por idioma mantêm as posições do parágrafo; campos, notas e noProof saem', () => {
    const langs = new LangResolver(sheet);
    const p = para(
      run('Olá '),
      run('world', { rpr: { lang: { val: 'en-US' } } }),
      run(' 12', { field: ' PAGE ' }),
      run(' fim'),
      run('x()', { rpr: { noProof: true } }),
    );
    const spans = spellSpans(p, langs);
    const pt = spans.find((s) => s.lang === 'pt-BR')!;
    const en = spans.find((s) => s.lang === 'en-US')!;
    expect(pt.text).toBe('Olá ' + ' '.repeat(5) + '   ' + ' fim' + '   ');
    expect(en.text.indexOf('world')).toBe(4);
    expect(spellSpans(para(run('123 456')), langs)).toEqual([]);
  });

  it('cache por parágrafo: revisa em lote, não revisa de novo o mesmo texto e refaz o editado', async () => {
    const engine = fakeEngine();
    let updates = 0;
    const spell = new ParagraphSpell(engine, () => new LangResolver(sheet), () => updates++, 5);
    const p = para(run('um axxb dois'));
    expect(spell.get(p)).toBeUndefined();
    await tick();
    expect(updates).toBe(1);
    expect(spell.get(p)).toEqual([{ word: 'axxb', start: 3, end: 7, lang: 'pt-BR' }]);
    const calls = engine.calls;
    // outro objeto com o MESMO texto (desfazer recria os parágrafos): do cache
    expect(spell.get(para(run('um axxb dois')))).toHaveLength(1);
    expect(engine.calls).toBe(calls);
    // editado: devolve o resultado anterior até a nova revisão voltar
    p.runs[0]!.text = 'um axxb dois cxxd';
    expect(spell.get(p)).toHaveLength(1);
    await tick();
    expect(spell.get(p)!.map((m) => m.word)).toEqual(['axxb', 'cxxd']);
  });

  it('mudança no motor (dicionário do usuário) invalida o cache; idioma sem dicionário não revisa', async () => {
    const engine = fakeEngine();
    const spell = new ParagraphSpell(engine, () => new LangResolver(sheet), () => {}, 5);
    const p = para(run('axxb'));
    await spell.check(p);
    engine.fire();
    expect(spell.get(p)).toBeUndefined();
    const de = para(run('axxb', { rpr: { lang: { val: 'de-DE' } } }));
    expect(await spell.check(de)).toEqual([]);
  });

  it('misspellingAt acha o erro que contém ou toca o cursor', () => {
    const list = [{ word: 'axxb', start: 3, end: 7, lang: 'pt-BR' }];
    expect(misspellingAt(list, 3)?.word).toBe('axxb');
    expect(misspellingAt(list, 7)?.word).toBe('axxb');
    expect(misspellingAt(list, 8)).toBeUndefined();
  });
});
