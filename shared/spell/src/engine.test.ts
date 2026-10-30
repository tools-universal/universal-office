import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SpellChecker, type SpellCheckerInternalOptions, type Transport } from './checker.js';
import { spellEngineMain, type EngineResponse } from './engine.js';
import { memoryStore, tokenize } from './index.js';
import { registerBuiltinSources } from './builtin.js';

registerBuiltinSources();

const make = (opts: SpellCheckerInternalOptions = {}) => new SpellChecker({ store: memoryStore(), ...opts });

describe('Worker → thread', () => {
  it('Worker que falha no init (CSP bloqueando blob:) cai no thread', async () => {
    let disposed = false;
    const failing = (): Transport => {
      const t: Transport = {
        kind: 'worker',
        post: () => setTimeout(() => t.onError(new Error('blob: bloqueado pela CSP')), 5),
        onResponse: () => {},
        onError: () => {},
        dispose: () => { disposed = true; },
      };
      return t;
    };
    const sc = make({ workerFactory: failing });
    expect(await sc.check('comptador', 'pt-BR')).toBe(false);
    expect(await sc.check('computador', 'pt-BR')).toBe(true);
    expect(sc.mode).toBe('thread');
    expect(disposed).toBe(true);
    sc.dispose();
  }, 60_000);
});

describe('o código do Worker é autocontido', () => {
  it('spellEngineMain.toString() roda num contexto isolado (sem __name nem imports)', async () => {
    const replies: EngineResponse[] = [];
    const scope = { onmessage: null as null | ((ev: { data: unknown }) => Promise<void>), postMessage: (m: EngineResponse) => replies.push(m) };
    // só os globais de um Worker de verdade; nada do módulo
    const ctx = { TextEncoder, TextDecoder, URL, Blob, atob, btoa, scope };
    runInNewContext(`(${spellEngineMain.toString()})(scope);`, ctx);
    expect(typeof scope.onmessage).toBe('function');
    await scope.onmessage!({ data: { id: 1, op: 'check', dict: 'pt-BR', words: ['casa'] } });
    expect(replies).toEqual([{ id: 1, error: 'dicionário não carregado: pt-BR' }]);
  });
});

describe('dicionário do host', () => {
  it('ISO8859-1 em texto: convertido pela linha SET', async () => {
    const sc = make({ dictionaries: { 'xx-LA': async () => ({ aff: 'SET ISO8859-1\nTRY aeiou\n', dic: '3\nação\ncafé\nmaçã\n' }) } });
    expect(await sc.checkWords(['ação', 'café', 'maçã', 'acao'], 'xx-LA')).toEqual([true, true, true, false]);
    expect(await sc.suggest('cafe', 'xx-LA')).toContain('café');
    sc.dispose();
  }, 60_000);
  it('ISO8859-1 em bytes vai como está', async () => {
    const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
    const sc = make({ dictionaries: { 'xx-LB': async () => ({ aff: bytes('SET ISO8859-1\n'), dic: bytes('1\npão\n') }) } });
    expect(await sc.checkWords(['pão', 'pao'], 'xx-LB')).toEqual([true, false]);
    sc.dispose();
  }, 60_000);
  it('outra codificação é recusada', async () => {
    const sc = make({ dictionaries: { 'xx-LC': async () => ({ aff: 'SET KOI8-R\n', dic: '1\nda\n' }) } });
    await expect(sc.check('da', 'xx-LC')).rejects.toThrow(/não suportada/);
    sc.dispose();
  }, 60_000);
});

describe('dicionário do usuário × dicionário base', () => {
  it('add + remove de palavra que o base já aceita não a proíbe', async () => {
    const sc = make();
    await sc.add('casa');
    await sc.remove('casa');
    expect(await sc.checkWords(['casa', 'Casa', 'casas'], 'pt-BR')).toEqual([true, true, true]);
    sc.dispose();
  }, 60_000);
  it('add/remove durante um check não deixa resultado velho no cache', async () => {
    const sc = make();
    await sc.load('pt-BR');
    // o check em voo responde pelo estado de quando o motor o atendeu; o que
    // importa é não sobrar o resultado velho no cache que a pintura consulta
    const pending = sc.check('Zuquetá', 'pt-BR');
    await Promise.all([pending, sc.add('Zuquetá')]);
    expect(sc.cached('Zuquetá', 'pt-BR')).not.toBe(false);
    expect(await sc.check('Zuquetá', 'pt-BR')).toBe(true);
    expect(sc.cached('Zuquetá', 'pt-BR')).toBe(true);
    const again = sc.check('Zuquetá', 'pt-BR'); // do cache: true
    await Promise.all([again, sc.remove('Zuquetá')]);
    expect(sc.cached('Zuquetá', 'pt-BR')).not.toBe(true);
    expect(await sc.check('Zuquetá', 'pt-BR')).toBe(false);
    // check de verdade em voo (palavra nova) com add no meio
    const inflight = sc.checkWords(['Zuquetá', 'Zuquetó'], 'pt-BR');
    const adding = sc.add('Zuquetó');
    await Promise.all([inflight, adding]);
    expect(sc.cached('Zuquetó', 'pt-BR')).not.toBe(false);
    expect(await sc.check('Zuquetó', 'pt-BR')).toBe(true);
    sc.dispose();
  }, 60_000);
});

describe('hífen Unicode', () => {
  it('U+2011 (w:noBreakHyphen) e U+2010 viram - para o Hunspell', async () => {
    const toks = tokenize('bem‑vindo guarda‐chuva');
    expect(toks.map((t) => t.word)).toEqual(['bem-vindo', 'guarda-chuva']);
    expect(toks.map((t) => t.end - t.start)).toEqual([9, 12]);
    const sc = make();
    expect(await sc.checkText('bem‑vindo guarda‐chuva', 'pt-BR')).toEqual([]);
    sc.dispose();
  }, 60_000);
});

describe('unload e instância compartilhada', () => {
  it('unload libera e o próximo uso recarrega', async () => {
    const sc = make();
    await sc.load('en-US');
    expect(sc.isLoaded('en-US')).toBe(true);
    await sc.unload('en-US');
    expect(sc.isLoaded('en-US')).toBe(false);
    expect(sc.cached('hello', 'en-US')).toBeUndefined();
    expect(await sc.check('hello', 'en-US')).toBe(true);
    expect(sc.isLoaded('en-US')).toBe(true);
    sc.dispose();
  }, 60_000);
  it('dispose() de um app não derruba o motor dos outros', async () => {
    const a = SpellChecker.shared();
    const b = SpellChecker.shared();
    expect(a).toBe(b);
    expect(await a.check('hello', 'en-US')).toBe(true);
    a.dispose();
    expect(b.mode).toBeDefined();
    expect(await b.check('helo', 'en-US')).toBe(false);
    b.dispose();
    expect(b.mode).toBeUndefined();
    const c = SpellChecker.shared();
    expect(c).not.toBe(a);
    c.dispose();
  }, 60_000);
});
