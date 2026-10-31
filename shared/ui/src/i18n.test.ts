import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserUiLang, matchUiLang, pickLabels, uiDecimal, uiLang, uiLocale, UI_LANGS } from './i18n';

/** Elemento mínimo: só o que `uiLang` lê. */
const el = (lang?: string) => ({ getAttribute: (n: string) => (n === 'lang' ? lang ?? null : null) }) as unknown as Element;

const browser = (languages: string[]) => vi.stubGlobal('navigator', { languages, language: languages[0] });

afterEach(() => vi.unstubAllGlobals());

describe('matchUiLang', () => {
  it('reconhece pt, en e es por prefixo', () => {
    expect(matchUiLang('pt-BR')).toBe('pt');
    expect(matchUiLang('PT')).toBe('pt');
    expect(matchUiLang('en-GB')).toBe('en');
    for (const tag of ['es', 'es-ES', 'es-419', 'es-MX', 'es-AR', 'ES-co']) expect(matchUiLang(tag)).toBe('es');
    expect(matchUiLang('fr')).toBeNull();
    expect(matchUiLang('ptx')).toBeNull();
    expect(matchUiLang('esx')).toBeNull();
    expect(matchUiLang('')).toBeNull();
  });
});

describe('uiLang', () => {
  it('inglês por padrão', () => {
    browser([]);
    expect(uiLang(el())).toBe('en');
    browser(['fr-FR', 'de']);
    expect(uiLang(el())).toBe('en');
  });

  it('português quando o navegador prefere', () => {
    browser(['pt-BR', 'en-US']);
    expect(uiLang(el())).toBe('pt');
    expect(browserUiLang()).toBe('pt');
  });

  it('espanhol quando o navegador prefere (qualquer região)', () => {
    browser(['es-MX', 'en-US']);
    expect(uiLang(el())).toBe('es');
    browser(['es-419']);
    expect(browserUiLang()).toBe('es');
  });

  it('1ª língua traduzida do navegador vence', () => {
    browser(['fr', 'pt-PT', 'en']);
    expect(uiLang(el())).toBe('pt');
    browser(['fr', 'en', 'pt-BR']);
    expect(uiLang(el())).toBe('en');
    browser(['fr', 'es-AR', 'pt-BR']);
    expect(uiLang(el())).toBe('es');
  });

  it('atributo lang força, inclusive contra o navegador', () => {
    browser(['pt-BR']);
    expect(uiLang(el('en'))).toBe('en');
    browser(['en-US']);
    expect(uiLang(el('pt-BR'))).toBe('pt');
    expect(uiLang(el('es-ES'))).toBe('es');
    browser(['es-ES']);
    expect(uiLang(el('en'))).toBe('en');
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
    const L = { en: 'Next', pt: 'Próximo', es: 'Siguiente' };
    expect(pickLabels('pt', L)).toBe('Próximo');
    expect(pickLabels('es', L)).toBe('Siguiente');
    expect(pickLabels(el('es-419'), L)).toBe('Siguiente');
    browser(['pt-BR']);
    expect(pickLabels(el('en'), L)).toBe('Next');
    expect(pickLabels(el(), L)).toBe('Próximo');
  });
});

describe('uiLocale / uiDecimal', () => {
  it('locale e separador decimal da interface por idioma', () => {
    expect(UI_LANGS).toEqual(['en', 'pt', 'es']);
    expect(uiLocale('en')).toBe('en-US');
    expect(uiLocale('pt')).toBe('pt-BR');
    expect(uiLocale('es')).toBe('es-ES');
    expect(uiDecimal('en')).toBe('.');
    expect(uiDecimal('pt')).toBe(',');
    expect(uiDecimal('es')).toBe(',');
  });
});
