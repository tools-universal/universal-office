import { describe, expect, it, vi } from 'vitest';
import type { FontEnvironment } from './environment.js';
import { FontResolver } from './resolver.js';
import type { HostFontProvider, LocalFontData } from './types.js';

/** Ambiente falso: o que está "instalado", em local(), na página e na base. */
function fakeEnv(opts: {
  installed?: string[];
  local?: string[];
  page?: string[];
  files?: string[];
  qlf?: { granted: boolean; fonts: LocalFontData[] };
} = {}) {
  const added: string[] = [];
  const env: FontEnvironment = {
    isInstalled: (f) => (opts.installed ?? []).includes(f),
    loadLocal: async (f, v) => v === 'regular' && (opts.local ?? []).includes(f),
    addFace: async (f, v) => { added.push(`${f}/${v}`); return true; },
    pageFamilies: (exclude) => new Map((opts.page ?? []).filter((p) => !exclude.has(p.toLowerCase())).map((p) => [p.toLowerCase(), p])),
    loadPageFamily: async () => {},
    fetchBytes: async (url) => ((opts.files ?? []).some((f) => url.endsWith(f)) ? new Uint8Array([1, 2, 3]) : null),
    localAccess: opts.qlf
      ? { granted: async () => opts.qlf!.granted, query: async () => opts.qlf!.fonts }
      : null,
  };
  return { env, added };
}

const ALL_BUNDLED = ['carlito', 'caladea', 'liberationsans', 'liberationserif', 'liberationmono']
  .flatMap((f) => ['regular', 'bold', 'italic', 'bolditalic'].map((v) => `${f}-${v}.ttf`));

const face = (family: string, style = 'Regular'): LocalFontData =>
  ({ family, style, blob: async () => new Blob([new Uint8Array([0, 1, 0, 0])]) });

describe('FontResolver — ordem de resolução', () => {
  it('host vence tudo e é consultado UMA vez por lote', async () => {
    const host: HostFontProvider = {
      list: async () => ['Aptos'],
      resolve: vi.fn(async (fams: string[]) => fams.filter((f) => f === 'Aptos').flatMap((f) => [
        { family: f, weight: '400', style: 'normal', bold: false, bytes: new ArrayBuffer(4) },
        { family: f, weight: '700', style: 'normal', bold: true, bytes: new ArrayBuffer(4) },
      ])),
    };
    const { env } = fakeEnv({ installed: ['Aptos'], files: ALL_BUNDLED });
    const r = new FontResolver(env);
    r.configure({ baseUrl: '/f', host });
    const [aptos, calibri] = await r.resolve(['Aptos', 'Calibri']);
    expect(host.resolve).toHaveBeenCalledTimes(1);
    expect(aptos).toMatchObject({ source: 'host', cssFamily: 'Aptos' });
    expect(Object.keys(aptos!.faces).sort()).toEqual(['bold', 'regular']);
    expect(calibri).toMatchObject({ source: 'substitute', cssFamily: 'Carlito' });
  });

  it('Local Font Access só quando JÁ permitida (nunca pede sozinha)', async () => {
    const fonts = [face('Calibri'), face('Calibri', 'Bold')];
    const negada = new FontResolver(fakeEnv({ installed: ['Calibri'], qlf: { granted: false, fonts } }).env);
    expect((await negada.resolve(['Calibri']))[0]).toMatchObject({ source: 'installed', faces: {} });
    const permitida = new FontResolver(fakeEnv({ installed: ['Calibri'], qlf: { granted: true, fonts } }).env);
    const [r] = await permitida.resolve(['Calibri']);
    expect(r).toMatchObject({ source: 'local-access', cssFamily: 'Calibri' });
    expect(Object.keys(r!.faces).sort()).toEqual(['bold', 'regular']);
  });

  it('embarcada de mesmo nome > página > instalada > local() > substituta > padrão', async () => {
    const { env } = fakeEnv({
      installed: ['Georgia', 'Liberation Serif'], local: ['Segoe UI Light'], page: ['Aptos'], files: ALL_BUNDLED,
    });
    const r = new FontResolver(env);
    r.configure({ baseUrl: '/f' });
    const res = await r.resolve(['Liberation Serif', 'Aptos', 'Georgia', 'Segoe UI Light', 'Cambria', 'Inexistente']);
    expect(res.map((x) => `${x.family}:${x.source}:${x.cssFamily}`)).toEqual([
      'Liberation Serif:bundled:Liberation Serif',
      'Aptos:page:Aptos',
      'Georgia:installed:Georgia',
      'Segoe UI Light:installed:Segoe UI Light',
      'Cambria:substitute:Caladea',
      'Inexistente:default:Liberation Sans',
    ]);
  });

  it('sem base das embarcadas: substituta indisponível cai no padrão (sem bytes)', async () => {
    const r = new FontResolver(fakeEnv().env);
    const [x] = await r.resolve(['Calibri']);
    expect(x).toMatchObject({ source: 'default', cssFamily: 'Liberation Sans', faces: {} });
  });
});

describe('FontResolver — uso síncrono e avisos', () => {
  it('cssStack: antes de resolver usa o nome pedido; onChange avisa com get() já pronto', async () => {
    const r = new FontResolver(fakeEnv({ files: ALL_BUNDLED }).env);
    r.configure({ baseUrl: '/f' });
    expect(r.cssStack('Calibri')).toBe('"Calibri", "Liberation Sans", sans-serif');
    const seen = await new Promise<string>((ok) => r.onChange(() => ok(r.get('Calibri')!.cssFamily)));
    expect(seen).toBe('Carlito');
    expect(r.cssStack('Calibri')).toBe('"Carlito", "Liberation Sans", sans-serif');
    expect(r.cssStack(undefined)).toBe('"Liberation Sans", sans-serif');
  });

  it('cssStack com substitutos do app: família inexistente cai no 1º substituto que existe', async () => {
    const r = new FontResolver(fakeEnv({ files: ALL_BUNDLED, installed: ['Georgia'] }).env);
    r.configure({ baseUrl: '/f' });
    // antes de resolver: a pilha fixa (nome pedido + substitutos + padrão)
    expect(r.cssStack('Bellota Text', ['Aptos', 'Calibri'])).toBe('"Bellota Text", "Aptos", "Calibri", "Liberation Sans", sans-serif');
    await r.resolve(['Bellota Text', 'Aptos', 'Calibri', 'Georgia']);
    // Aptos não existe (default) → Calibri → substituta Carlito
    expect(r.cssStack('Bellota Text', ['Aptos', 'Calibri'])).toBe('"Carlito", "Liberation Sans", sans-serif');
    // família que existe ignora os substitutos
    expect(r.cssStack('Georgia', ['Aptos', 'Calibri'])).toBe('"Georgia", "Liberation Sans", sans-serif');
    // sem substitutos: o padrão
    expect(r.cssStack('Bellota Text')).toBe('"Liberation Sans", sans-serif');
  });

  it('pedidos repetidos reaproveitam a resolução em andamento', async () => {
    const { env } = fakeEnv({ files: ALL_BUNDLED });
    const spy = vi.spyOn(env, 'isInstalled');
    const r = new FontResolver(env);
    r.configure({ baseUrl: '/f' });
    await Promise.all([r.resolve(['Foo']), r.resolve(['foo']), r.resolve(['FOO'])]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('requestLocalAccess (gesto) promove instaladas/substitutas para os bytes reais', async () => {
    const fonts = [face('Calibri'), face('Georgia')];
    const r = new FontResolver(fakeEnv({ installed: ['Georgia'], files: ALL_BUNDLED, qlf: { granted: false, fonts } }).env);
    r.configure({ baseUrl: '/f' });
    await r.resolve(['Calibri', 'Georgia']);
    expect(r.get('Calibri')!.source).toBe('substitute');
    const changed = new Promise<string[]>((ok) => r.onChange(ok));
    expect(await r.requestLocalAccess()).toBe(true);
    expect((await changed).sort()).toEqual(['Calibri', 'Georgia']);
    expect(r.get('Calibri')).toMatchObject({ source: 'local-access', cssFamily: 'Calibri' });
    expect(r.get('Georgia')!.source).toBe('local-access');
  });
});

describe('FontResolver — famílias legadas do Windows', () => {
  it('"Segoe UI Light" casa pelo nome completo da face (a API dá família "Segoe UI" + estilo "Light")', async () => {
    const fonts: LocalFontData[] = [
      { family: 'Segoe UI', style: 'Light', fullName: 'Segoe UI Light', blob: async () => new Blob([new Uint8Array([0, 1, 0, 0])]) },
      { family: 'Segoe UI', style: 'Light Italic', fullName: 'Segoe UI Light Italic', blob: async () => new Blob([new Uint8Array([0, 1, 0, 0])]) },
      face('Segoe UI'),
    ];
    const r = new FontResolver(fakeEnv({ qlf: { granted: true, fonts } }).env);
    const [light, ui] = await r.resolve(['Segoe UI Light', 'Segoe UI']);
    expect(light).toMatchObject({ source: 'local-access', cssFamily: 'Segoe UI Light' });
    expect(Object.keys(light!.faces).sort()).toEqual(['italic', 'regular']);
    expect(Object.keys(ui!.faces)).toEqual(['regular']); // "Light" não vira o regular da "Segoe UI"
  });
});

describe('FontResolver — modo que exige o arquivo (Write)', () => {
  it('instalada só pelo nome → substituta com arquivo (Calibri → Carlito) ou padrão (Georgia → Liberation Sans)', async () => {
    const r = new FontResolver(fakeEnv({ installed: ['Calibri', 'Georgia'], files: ALL_BUNDLED }).env);
    r.configure({ baseUrl: '/f' });
    await r.resolve(['Calibri', 'Georgia', 'Carlito']);
    // o modo normal (Sheet/Slides) continua usando a instalada pelo nome
    expect(r.get('Calibri')).toMatchObject({ source: 'installed', cssFamily: 'Calibri' });
    expect(r.getWithFile('Calibri')).toBeUndefined(); // ainda não carregou a substituta
    const [cal, geo, carl] = await r.resolveWithFile(['Calibri', 'Georgia', 'Carlito']);
    expect(cal).toMatchObject({ source: 'substitute', cssFamily: 'Carlito' });
    expect(Object.keys(cal!.faces)).toEqual(['regular']); // as outras variantes só sob demanda
    expect(geo).toMatchObject({ source: 'default', cssFamily: 'Liberation Sans' });
    expect(carl).toMatchObject({ source: 'bundled', cssFamily: 'Carlito' });
    expect(r.getWithFile('Calibri')!.cssFamily).toBe('Carlito');
    expect(r.get('Calibri')!.source).toBe('installed');
  });

  it('com o arquivo de verdade (Local Font Access) não troca nada', async () => {
    const r = new FontResolver(fakeEnv({ installed: ['Calibri'], qlf: { granted: true, fonts: [face('Calibri')] } }).env);
    const [cal] = await r.resolveWithFile(['Calibri']);
    expect(cal).toMatchObject({ source: 'local-access', cssFamily: 'Calibri' });
  });

  it('seletor withFile: sem as instaladas só pelo nome', async () => {
    const r = new FontResolver(fakeEnv({ installed: ['Georgia', 'Verdana'] }).env);
    const list = await r.listFamilies({ withFile: true });
    expect(list).not.toContain('Georgia');
    for (const f of ['Carlito', 'Liberation Sans', 'Calibri']) expect(list).toContain(f);
  });
});

describe('FontResolver — baixa só as faces usadas', () => {
  it('embarcada: só a regular baixa; outra variante vem UMA vez (cssStack ou loadFace) e avisa', async () => {
    const { env } = fakeEnv({ files: ALL_BUNDLED });
    const fetched: string[] = [];
    const fetch0 = env.fetchBytes;
    const file = (u: string) => u.slice(u.lastIndexOf('/') + 1);
    env.fetchBytes = async (u) => { fetched.push(file(u)); return fetch0(u); };
    const r = new FontResolver(env);
    r.configure({ baseUrl: '/f' });
    const [cal] = await r.resolve(['Calibri']);
    expect(fetched).toEqual(['carlito-regular.ttf']);
    // quem DESENHA negrito avisa pelo cssStack; quem MEDE pede loadFace — uma descida só
    const changed = new Promise<string[]>((ok) => r.onChange(ok));
    expect(r.cssStack('Calibri', [], 'bold')).toBe('"Carlito", "Liberation Sans", sans-serif');
    expect(await r.loadFace(cal!, 'bold')).toBeInstanceOf(Uint8Array);
    expect(await changed).toEqual(['Calibri']);
    expect(Object.keys(r.get('Calibri')!.faces).sort()).toEqual(['bold', 'regular']);
    r.cssStack('Calibri', [], 'bold');
    await r.loadFace(cal!, 'bold');
    expect(fetched).toEqual(['carlito-regular.ttf', 'carlito-bold.ttf']);
  });
});

describe('FontResolver — lista para o seletor', () => {
  it('sem host nem permissão: sondadas pelo nome + embarcadas + as com substituta', async () => {
    const r = new FontResolver(fakeEnv({ installed: ['Georgia', 'Verdana'] }).env);
    const list = await r.listFamilies();
    for (const f of ['Georgia', 'Verdana', 'Carlito', 'Liberation Sans', 'Calibri', 'Times New Roman']) expect(list).toContain(f);
    expect(list).not.toContain('Tahoma');
  });

  it('com host: a lista do host', async () => {
    const r = new FontResolver(fakeEnv().env);
    r.configure({ host: { list: async () => ['Aptos', 'Zapfino'], resolve: async () => [] } });
    expect(await r.listFamilies()).toEqual(expect.arrayContaining(['Aptos', 'Zapfino', 'Carlito']));
  });
});
