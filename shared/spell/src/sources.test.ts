import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerBuiltinSources } from './builtin.js';
import { SpellChecker } from './checker.js';
import { clearSpellSources, configureSpellcheck, dictionaryPackage, registerDictionary, registerSpellcheck, spellcheckAvailable } from './sources.js';
import { memoryStore } from './user-dictionary.js';

// O registro é da página: cada teste começa vazio.
beforeEach(() => clearSpellSources());
afterAll(() => { clearSpellSources(); registerBuiltinSources(); });

const make = () => new SpellChecker({ store: memoryStore(), worker: false });

describe('sem motor registrado', () => {
  it('a revisão fica indisponível: nada resolve, tudo passa, o motor nem sobe', async () => {
    const sc = make();
    expect(spellcheckAvailable()).toBe(false);
    expect(sc.dictionaries()).toEqual([]);
    expect(sc.resolve('pt-BR')).toBeUndefined();
    expect(await sc.check('comptador', 'pt-BR')).toBe(true);
    expect(await sc.checkText('O comptador nao veio.', 'pt-BR')).toEqual([]);
    expect(await sc.suggest('nao', 'pt-BR')).toEqual([]);
    expect(await sc.load('pt-BR')).toBeUndefined();
    expect(sc.mode).toBeUndefined();
    sc.dispose();
  });
  it('dicionário sem motor também não revisa (nem o da opção `dictionaries`)', async () => {
    let calls = 0;
    registerDictionary('pt-BR', async () => { calls++; return { aff: '', dic: '' }; });
    const sc = new SpellChecker({ store: memoryStore(), worker: false, dictionaries: { 'xx-LA': async () => ({ aff: 'SET UTF-8\n', dic: '1\nação\n' }) } });
    expect(spellcheckAvailable()).toBe(false);
    expect(sc.resolve('pt-BR')).toBeUndefined();
    expect(await sc.check('acao', 'xx-LA')).toBe(true);
    expect(calls).toBe(0);
    sc.dispose();
  });
});

describe('loaders registrados (hospedeiro com bundler)', () => {
  it('motor e dicionário só carregam na 1ª revisão do idioma, uma vez', async () => {
    let engineCalls = 0;
    let enCalls = 0;
    registerSpellcheck(() => { engineCalls++; return import('./hunspell/wasm.js'); });
    registerDictionary('en-US', () => { enCalls++; return import('./dicts/en-US.js'); });
    const sc = make();
    expect(spellcheckAvailable()).toBe(true);
    expect(sc.dictionaries()).toEqual(['en-US']);
    expect(sc.resolve('en-GB')).toEqual({ id: 'en-US', exact: false });
    // pt-BR não registrado: sem revisão, sem baixar nada
    expect(sc.resolve('pt-BR')).toBeUndefined();
    expect(await sc.check('comptador', 'pt-BR')).toBe(true);
    expect(engineCalls).toBe(0);
    expect(enCalls).toBe(0);
    expect(await sc.checkWords(['hello', 'helo'], 'en-US')).toEqual([true, false]);
    expect(await sc.suggest('recieve', 'en-US')).toContain('receive');
    expect(engineCalls).toBe(1);
    expect(enCalls).toBe(1);
    sc.dispose();
  }, 60_000);
  it('dicionário registrado depois: evento `load` para o hospedeiro revisar de novo', async () => {
    registerSpellcheck(() => import('./hunspell/wasm.js'));
    const sc = make();
    expect(sc.resolve('en-US')).toBeUndefined();
    const events: string[] = [];
    sc.onChange((e) => events.push(e.kind));
    registerDictionary('en_US', () => import('./dicts/en-US.js'));
    expect(events).toEqual(['load']);
    expect(sc.resolve('en-US')).toEqual({ id: 'en-US', exact: true });
    expect(await sc.check('helo', 'en-US')).toBe(false);
    sc.dispose();
  }, 60_000);
  it('loader de dicionário que falha: o idioma fica sem revisão, sem erro', async () => {
    let calls = 0;
    registerSpellcheck(() => import('./hunspell/wasm.js'));
    registerDictionary('pt-BR', () => { calls++; return Promise.reject(new Error('Cannot find module @universal-office/dictionary-pt-br')); });
    const sc = make();
    expect(await sc.check('comptador', 'pt-BR')).toBe(true);
    expect(await sc.checkText('O comptador nao veio.', 'pt-BR')).toEqual([]);
    expect(sc.resolve('pt-BR')).toBeUndefined();
    expect(calls).toBe(1); // não tenta de novo a cada pintura
    sc.dispose();
  }, 60_000);
  it('loader do motor que falha: revisão indisponível em todos os idiomas, sem erro', async () => {
    let calls = 0;
    registerSpellcheck(() => { calls++; return Promise.reject(new Error('Cannot find module @universal-office/spellcheck')); });
    registerDictionary('en-US', () => import('./dicts/en-US.js'));
    const sc = make();
    expect(await sc.check('helo', 'en-US')).toBe(true);
    expect(sc.dictionaries()).toEqual([]);
    expect(await sc.check('helo', 'en-US')).toBe(true);
    expect(calls).toBe(1);
    // o hospedeiro registra o motor certo: volta a revisar
    registerSpellcheck(() => import('./hunspell/wasm.js'));
    expect(await sc.check('helo', 'en-US')).toBe(false);
    sc.dispose();
  }, 60_000);
});

describe('pasta por URL (hospedeiro que serve os pacotes estáticos)', () => {
  let root: string;
  beforeAll(async () => {
    // a mesma forma dos pacotes publicados: <base>/spellcheck/index.js e <base>/dictionary-en-us/index.js
    root = mkdtempSync(path.join(tmpdir(), 'uo-spell-url-'));
    const wasm = await import('./hunspell/wasm.js');
    const en = await import('./dicts/en-US.js');
    mkdirSync(path.join(root, 'full', 'spellcheck'), { recursive: true });
    mkdirSync(path.join(root, 'full', dictionaryPackage('en-US')), { recursive: true });
    writeFileSync(path.join(root, 'full', 'spellcheck', 'index.js'), `export const glue = ${JSON.stringify(wasm.glue)};\nexport const wasmBase64 = ${JSON.stringify(wasm.wasmBase64)};\n`);
    writeFileSync(path.join(root, 'full', dictionaryPackage('en-US'), 'index.js'), `export const aff = ${JSON.stringify(en.aff)};\nexport const dic = ${JSON.stringify(en.dic)};\n`);
    mkdirSync(path.join(root, 'empty'), { recursive: true });
  }, 60_000);
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('nome da pasta do dicionário', () => {
    expect(dictionaryPackage('pt-BR')).toBe('dictionary-pt-br');
    expect(dictionaryPackage('en_US')).toBe('dictionary-en-us');
  });
  it('motor e dicionário carregados da pasta base', async () => {
    configureSpellcheck({ baseUrl: pathToFileURL(path.join(root, 'full')).href, languages: ['en-US'] });
    const sc = make();
    expect(sc.dictionaries()).toEqual(['en-US']);
    expect(sc.resolve('pt-BR')).toBeUndefined();
    expect(await sc.checkWords(['hello', 'helo'], 'en-US')).toEqual([true, false]);
    expect(await sc.suggest('helo', 'en-US')).toContain('hello');
    sc.dispose();
  }, 60_000);
  it('sem `languages`: os dicionários publicados; o que não está na pasta fica sem revisão', async () => {
    configureSpellcheck({ baseUrl: pathToFileURL(path.join(root, 'full')).href + '/' });
    const sc = make();
    expect(sc.dictionaries()).toEqual(['pt-BR', 'en-US']);
    expect(await sc.check('comptador', 'pt-BR')).toBe(true);
    expect(sc.dictionaries()).toEqual(['en-US']);
    expect(await sc.check('helo', 'en-US')).toBe(false);
    sc.dispose();
  }, 60_000);
  it('pasta sem o motor: revisão indisponível, sem erro', async () => {
    configureSpellcheck({ baseUrl: pathToFileURL(path.join(root, 'empty')).href });
    const sc = make();
    expect(await sc.check('helo', 'en-US')).toBe(true);
    expect(await sc.checkText('O comptador nao veio.', 'pt-BR')).toEqual([]);
    expect(sc.dictionaries()).toEqual([]);
    sc.dispose();
  }, 60_000);
});
