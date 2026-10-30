// Revisão ortográfica com o motor e os dicionários FORA do pacote: o atributo
// spellcheck-url (hospedeiro que serve as pastas), loaders registrados
// (hospedeiro com bundler) e nada registrado (sem revisão, sem erro).
// Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import { clearSpellSources, registerDictionary, registerSpellcheck, registeredDictionaries, spellcheckAvailable } from '@universal-office/spell-sources';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';

const FONTS = join(__dirname, '..', 'demo', 'fonts');
const VARIANTS = { regular: 'regular', bold: 'bold', italic: 'italic', boldItalic: 'bolditalic' } as const;
const FONT_ASSETS: UniversalWriteFontAsset[] = Object.entries(VARIANTS).map(([variant, file]) => ({
  family: 'Liberation Sans', variant: variant as UniversalWriteFontAsset['variant'],
  data: new Uint8Array(readFileSync(join(FONTS, `liberationsans-${file}.ttf`))),
}));

let dom: FakeDom;
let Ctor: typeof Editor;
let ed: Editor;

beforeAll(async () => {
  dom = installFakeDom();
  dom.customElements.define('u-ripple', class extends (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement {});
  Ctor = (await import('./universal-write.js')).UniversalWriteElement;
}, 60_000);
afterAll(() => {
  clearSpellSources();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  clearSpellSources();
  installColorSchemeEnv();
  ed = new Ctor();
  ed.setAttribute('manual-init', '');
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
});

describe('spellcheck-url', () => {
  it('registra o motor e os dicionários publicados pela pasta (registro da página)', () => {
    expect(spellcheckAvailable()).toBe(false);
    ed.setAttribute('spellcheck-url', '/vendor/universal-office');
    expect(spellcheckAvailable()).toBe(true);
    expect(Object.keys(registeredDictionaries())).toEqual(['pt-BR', 'en-US']);
    expect(ed.spellcheckUrl).toBe('/vendor/universal-office');
  });
  it('spellcheck-languages restringe os idiomas servidos; a propriedade reflete o atributo', () => {
    ed.setAttribute('spellcheck-languages', 'pt-BR');
    expect(spellcheckAvailable()).toBe(false); // só a lista, sem pasta: nada
    ed.spellcheckUrl = '/vendor/universal-office/';
    expect(ed.getAttribute('spellcheck-url')).toBe('/vendor/universal-office/');
    expect(Object.keys(registeredDictionaries())).toEqual(['pt-BR']);
  });
});

describe('sem motor nem dicionário', () => {
  it('não revisa e não espera: o F7 termina na hora', async () => {
    ed.pasteText('O comptador nao veio.');
    const t0 = Date.now();
    expect(await ed.nextMisspelling()).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(ed.spellingAtCaret()).toBeNull();
  });
});

describe('loaders registrados', () => {
  it('o motor e o dicionário registrados revisam o texto (o loader só roda na revisão)', async () => {
    let engineCalls = 0;
    let ptCalls = 0;
    registerSpellcheck(() => { engineCalls++; return import('../../../../shared/spell/src/hunspell/wasm.js'); });
    registerDictionary('pt-BR', () => { ptCalls++; return import('../../../../shared/spell/src/dicts/pt-BR.js'); });
    expect(engineCalls + ptCalls).toBe(0);
    ed.pasteText('O comptador veio.');
    const m = await ed.nextMisspelling();
    expect(m?.word).toBe('comptador');
    expect(m?.lang).toBe('pt-BR');
    expect(await ed.spellingSuggestions(m!)).toContain('comprador');
    expect(engineCalls).toBe(1);
    expect(ptCalls).toBe(1);
  }, 120_000);
});
