// Revisão ortográfica com o motor e os dicionários FORA do pacote: o atributo
// spellcheck-url (hospedeiro que serve as pastas), loaders registrados
// (hospedeiro com bundler) e nada registrado (sem revisão, sem erro).
// Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blankDocxPackage, DocxPackage } from '@universal-office/docx-core';
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

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/** .docx com um parágrafo no idioma dado (w:lang do run). */
function docxInLang(text: string, lang: string): Uint8Array {
  const pkg = blankDocxPackage();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>`
    + `<w:p><w:r><w:rPr><w:lang w:val="${lang}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return pkg.save();
}

/** .docx sem idioma em lugar nenhum (nem run, nem estilos, nem padrões). */
function docxWithoutLang(text: string): Uint8Array {
  const pkg = blankDocxPackage();
  pkg.setPartText('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>`
    + `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return pkg.save();
}

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
    expect(Object.keys(registeredDictionaries())).toEqual(['pt-BR', 'en-US', 'es']);
    expect(ed.spellcheckUrl).toBe('/vendor/universal-office');
  });
  it('spellcheck-languages restringe os idiomas servidos; a propriedade reflete o atributo', () => {
    ed.setAttribute('spellcheck-languages', 'pt-BR');
    expect(spellcheckAvailable()).toBe(false); // só a lista, sem pasta: nada
    ed.spellcheckUrl = '/vendor/universal-office/';
    expect(ed.getAttribute('spellcheck-url')).toBe('/vendor/universal-office/');
    expect(Object.keys(registeredDictionaries())).toEqual(['pt-BR']);
    ed.setAttribute('spellcheck-languages', 'pt-BR, en-US, es');
    expect(Object.keys(registeredDictionaries())).toEqual(['pt-BR', 'en-US', 'es']);
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
  it('espanhol: o dicionário `es` revisa o texto em es-MX (w:lang do run)', async () => {
    let esCalls = 0;
    registerSpellcheck(() => import('../../../../shared/spell/src/hunspell/wasm.js'));
    registerDictionary('es', () => { esCalls++; return import('../../../../shared/spell/src/dicts/es.js'); });
    ed.load(docxInLang('El ordenadr llegó tarde, pero la canción fue increíble.', 'es-MX'));
    const m = await ed.nextMisspelling();
    expect(m?.word).toBe('ordenadr');
    expect(m?.lang).toBe('es');
    expect(await ed.spellingSuggestions(m!)).toContain('ordenador');
    // as palavras certas (com acento) passam: não há outro erro no parágrafo
    expect(await ed.nextMisspelling(new Set([`${m!.para}:${m!.start}:${m!.word}`]))).toBeNull();
    expect(esCalls).toBe(1);
  }, 120_000);
  it('spellcheck-default-lang: texto sem idioma no documento é revisado no idioma do atributo', async () => {
    registerSpellcheck(() => import('../../../../shared/spell/src/hunspell/wasm.js'));
    registerDictionary('pt-BR', () => import('../../../../shared/spell/src/dicts/pt-BR.js'));
    registerDictionary('es', () => import('../../../../shared/spell/src/dicts/es.js'));
    ed.load(docxWithoutLang('El ordenadr llegó tarde.'));
    const fromStart = (): ReturnType<typeof ed.nextMisspelling> => { ed.setSelection({ para: 0, offset: 0 }); return ed.nextMisspelling(); };
    expect((await fromStart())?.lang).toBe('pt-BR');
    ed.spellcheckDefaultLang = 'es';
    expect(ed.getAttribute('spellcheck-default-lang')).toBe('es');
    const m = await fromStart();
    expect(m?.word).toBe('ordenadr');
    expect(m?.lang).toBe('es');
    ed.spellcheckDefaultLang = null;
    expect(ed.hasAttribute('spellcheck-default-lang')).toBe(false);
    expect((await fromStart())?.lang).toBe('pt-BR');
  }, 120_000);
  it('spellcheck-default-lang: o documento novo nasce no idioma do atributo (w:lang dos padrões)', async () => {
    registerSpellcheck(() => import('../../../../shared/spell/src/hunspell/wasm.js'));
    registerDictionary('es', () => import('../../../../shared/spell/src/dicts/es.js'));
    ed.spellcheckDefaultLang = 'es-ES';
    ed.newDocument();
    ed.pasteText('El ordenadr llegó tarde.');
    ed.setSelection({ para: 0, offset: 0 });
    expect((await ed.nextMisspelling())?.lang).toBe('es');
    const saved = DocxPackage.load(await ed.save('docx') as Uint8Array);
    expect(saved.getPartText('word/styles.xml')).toContain('<w:lang w:val="es-ES"');
    expect(saved.getPartText('word/settings.xml')).toContain('<w:themeFontLang w:val="es-ES"');
  }, 120_000);
  it('spellcheck-default-lang inválido vale como ausente, na revisão e no documento novo', async () => {
    registerSpellcheck(() => import('../../../../shared/spell/src/hunspell/wasm.js'));
    registerDictionary('pt-BR', () => import('../../../../shared/spell/src/dicts/pt-BR.js'));
    ed.load(docxWithoutLang('O comptador veio.'));
    ed.spellcheckDefaultLang = 'português!';
    ed.setSelection({ para: 0, offset: 0 });
    expect((await ed.nextMisspelling())?.lang).toBe('pt-BR');
    ed.newDocument();
    const saved = DocxPackage.load(await ed.save('docx') as Uint8Array);
    expect(saved.getPartText('word/styles.xml')).toContain('<w:lang w:val="pt-BR"');
  }, 120_000);
  it('o dicionário do usuário fica onde o app hospedeiro guarda (host.userDictionary)', async () => {
    registerSpellcheck(() => import('../../../../shared/spell/src/hunspell/wasm.js'));
    registerDictionary('pt-BR', () => import('../../../../shared/spell/src/dicts/pt-BR.js'));
    let stored: string[] = ['comptador'];
    const saves: string[][] = [];
    ed.host = { userDictionary: { load: () => stored, save: (words) => { stored = words; saves.push(words); } } };
    ed.pasteText('O comptador e o zorbax vieram.');
    ed.setSelection({ para: 0, offset: 0 });
    const m = await ed.nextMisspelling();
    expect(m?.word).toBe('zorbax');
    await ed.addToDictionary('zorbax');
    expect(stored).toEqual(['comptador', 'zorbax']);
    expect(saves).toHaveLength(1);
    ed.host = null;
  }, 120_000);
});
