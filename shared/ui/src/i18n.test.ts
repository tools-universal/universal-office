import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserUiLang, matchUiLang, pickLabels, uiLang } from './i18n';

/** Elemento mínimo: só o que `uiLang` lê. */
const el = (lang?: string) => ({ getAttribute: (n: string) => (n === 'lang' ? lang ?? null : null) }) as unknown as Element;

const browser = (languages: string[]) => vi.stubGlobal('navigator', { languages, language: languages[0] });

afterEach(() => vi.unstubAllGlobals());

describe('matchUiLang', () => {
  it('reconhece pt e en por prefixo', () => {
    expect(matchUiLang('pt-BR')).toBe('pt');
    expect(matchUiLang('PT')).toBe('pt');
    expect(matchUiLang('en-GB')).toBe('en');
    expect(matchUiLang('es')).toBeNull();
    expect(matchUiLang('ptx')).toBeNull();
    expect(matchUiLang('')).toBeNull();
  });
});

describe('uiLang', () => {
  it('inglês por padrão', () => {
    browser([]);
    expect(uiLang(el())).toBe('en');
    browser(['es-ES', 'fr']);
    expect(uiLang(el())).toBe('en');
  });

  it('português quando o navegador prefere', () => {
    browser(['pt-BR', 'en-US']);
    expect(uiLang(el())).toBe('pt');
    expect(browserUiLang()).toBe('pt');
  });

  it('1ª língua traduzida do navegador vence', () => {
    browser(['es', 'pt-PT', 'en']);
    expect(uiLang(el())).toBe('pt');
    browser(['es', 'en', 'pt-BR']);
    expect(uiLang(el())).toBe('en');
  });

  it('atributo lang força, inclusive contra o navegador', () => {
    browser(['pt-BR']);
    expect(uiLang(el('en'))).toBe('en');
    browser(['en-US']);
    expect(uiLang(el('pt-BR'))).toBe('pt');
  });

  it('atributo sem tradução cai no inglês (não no navegador)', () => {
    browser(['pt-BR']);
    expect(uiLang(el('de'))).toBe('en');
  });

  it('sem navigator (node) → inglês', () => {
    vi.stubGlobal('navigator', undefined);
    expect(uiLang(null)).toBe('en');
  });
});

describe('pickLabels', () => {
  it('escolhe a tabela pelo idioma ou pelo elemento', () => {
    const L = { en: 'Next', pt: 'Próximo' };
    expect(pickLabels('pt', L)).toBe('Próximo');
    browser(['pt-BR']);
    expect(pickLabels(el('en'), L)).toBe('Next');
    expect(pickLabels(el(), L)).toBe('Próximo');
  });
});
