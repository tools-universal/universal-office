import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerBuiltinSources } from './builtin.js';
import { SpellChecker, memoryStore, resolveLanguage, tokenize } from './index.js';

// motor e dicionários do repositório (nos produtos, os pacotes à parte)
registerBuiltinSources();

// No Node não há Worker: o motor roda no thread pelo MESMO código (engine.ts).
let sc: SpellChecker;
const store = memoryStore(['Kono']);

beforeAll(async () => {
  sc = new SpellChecker({ store });
  await Promise.all([sc.load('pt-BR'), sc.load('en-US')]);
}, 60_000);
afterAll(() => sc.dispose());

const wrong = async (words: string[], lang: string) => {
  const ok = await sc.checkWords(words, lang);
  return words.filter((_, i) => !ok[i]);
};

describe('pt-BR (VERO)', () => {
  it('aceita palavras corretas, inclusive flexões dos afixos', async () => {
    const good = ['casa', 'casas', 'Casa', 'CASA', 'ação', 'ações', 'computadores', 'fizéssemos', 'beneficiários', 'reutilizável',
      'pão', 'pães', 'órgão', 'órgãos', 'informação', 'informações', 'cantávamos', 'impossibilidade', 'São', 'Paulo', 'Brasil'];
    expect(await wrong(good, 'pt-BR')).toEqual([]);
  });
  it('acusa palavras erradas', async () => {
    const bad = ['acao', 'comptador', 'excessão', 'previlégio', 'concerteza', 'beneficiênte', 'xpto'];
    expect(await wrong(bad, 'pt-BR')).toEqual(bad);
  });
  it('hífen: compostos e ênclise', async () => {
    expect(await wrong(['guarda-chuva', 'dar-lhe', 'vendo-o', 'pé-de-meia', 'bem-vindo', 'segunda-feira'], 'pt-BR')).toEqual([]);
    expect(await wrong(['guarda-chuvva', 'dar-lhee'], 'pt-BR')).toEqual(['guarda-chuvva', 'dar-lhee']);
  });
  it('sugestões', async () => {
    expect((await sc.suggest('acao', 'pt-BR'))).toContain('ação');
    expect((await sc.suggest('excessão', 'pt-BR'))).toContain('exceção');
    expect(await sc.suggest('computadr', 'pt-BR')).toContain('computador');
    expect((await sc.suggest('casaa', 'pt-BR', 3)).length).toBeLessThanOrEqual(3); // limite
  });
});

describe('en-US (SCOWL)', () => {
  it('aceita palavras corretas', async () => {
    expect(await wrong(['hello', 'world', 'running', 'children', 'analyses', 'Microsoft', 'colorful', 'English'], 'en-US')).toEqual([]);
  });
  it('acusa palavras erradas (e a grafia britânica no dicionário americano)', async () => {
    expect(await wrong(['helo', 'recieve', 'definately', 'colour'], 'en-US')).toEqual(['helo', 'recieve', 'definately', 'colour']);
  });
  it('apóstrofo reto e tipográfico; hífen', async () => {
    const words = tokenize("don't can’t it's John’s well-known state-of-the-art").map((t) => t.word);
    expect(words).toEqual(["don't", "can't", "it's", "John's", 'well-known', 'state-of-the-art']);
    expect(await wrong(words, 'en-US')).toEqual([]);
    expect(await wrong(["dont'", "cann't"].map((w) => w), 'en-US')).toEqual(["dont'", "cann't"]);
  });
  it('sugestões', async () => {
    expect((await sc.suggest('recieve', 'en-US'))[0]).toBe('receive');
    expect(await sc.suggest('helo', 'en-US')).toContain('hello');
  });
});

describe('tokenização', () => {
  it('ignora números, palavras com dígitos, MAIÚSCULAS e endereços', () => {
    const text = 'Em 2024 o mp3 da ABNT custou R$ 1.234,56 — veja https://exemplo.com.br/a?b=1, www.teste.org, fulano@empresa.com.br, C:\\Pastas\\arquivo.docx e exemplo.com.';
    expect(tokenize(text).map((t) => t.word)).toEqual(['Em', 'o', 'da', 'custou', 'R', 'veja', 'e']);
  });
  it('opções desligadas revisam o que o padrão ignora', () => {
    expect(tokenize('ABNT mp3', { ignoreUppercase: false, ignoreWithNumbers: false }).map((t) => t.word)).toEqual(['ABNT', 'mp3']);
  });
  it('posições apontam para o texto original (hífen de sílaba e ’)', () => {
    const text = 'a infor\u00ADmação d’água';
    const toks = tokenize(text);
    expect(toks.map((t) => t.word)).toEqual(['a', 'informação', "d'água"]);
    expect(toks.map((t) => text.slice(t.start, t.end))).toEqual(['a', 'infor\u00ADmação', 'd’água']);
  });
  it('hífen/apóstrofo nas pontas ficam de fora', () => {
    expect(tokenize("'aspas' -traço- ex-").map((t) => t.word)).toEqual(['aspas', 'traço', 'ex']);
  });
});

describe('checkText', () => {
  it('devolve só as erradas, com posições', async () => {
    const text = 'O comptador tem acesso a https://exmplo.com e ao arquivo C:\\tmp\\xyzw.txt; pagou 1500 reais.';
    const errs = await sc.checkText(text, 'pt-BR');
    expect(errs.map((e) => e.word)).toEqual(['comptador']);
    expect(text.slice(errs[0]!.start, errs[0]!.end)).toBe('comptador');
  });
});

describe('idioma (BCP 47)', () => {
  it('etiqueta exata, variante da mesma língua e sem dicionário', () => {
    expect(resolveLanguage('pt-BR')).toEqual({ id: 'pt-BR', exact: true });
    expect(resolveLanguage('pt_br')).toEqual({ id: 'pt-BR', exact: true });
    expect(resolveLanguage('pt-PT')).toEqual({ id: 'pt-BR', exact: false });
    expect(resolveLanguage('en-GB')).toEqual({ id: 'en-US', exact: false });
    expect(resolveLanguage('de-DE')).toBeUndefined();
    expect(resolveLanguage('zxx')).toBeUndefined();
    expect(resolveLanguage(undefined)).toBeUndefined();
  });
  it('sem dicionário: tudo passa (não sublinha)', async () => {
    expect(await sc.check('Rechtschreibprüfungg', 'de-DE')).toBe(true);
    expect(await sc.suggest('Rechtschreibprüfungg', 'de-DE')).toEqual([]);
  });
});

describe('dicionário do usuário e ignorar', () => {
  it('palavras guardadas valem desde o carregamento', async () => {
    expect(await sc.check('Kono', 'pt-BR')).toBe(true);
    expect(await sc.check('Kono', 'en-US')).toBe(true);
  });
  it('add persiste, vale em todos os idiomas e entra nas sugestões; remove desfaz', async () => {
    const events: string[] = [];
    const off = sc.onChange((e) => events.push(`${e.kind}:${e.words.join()}`));
    expect(await sc.check('Fulanópolis', 'pt-BR')).toBe(false);
    await sc.add('Fulanópolis');
    expect(await sc.check('Fulanópolis', 'pt-BR')).toBe(true);
    expect(await sc.check('Fulanópolis', 'en-US')).toBe(true);
    expect(store.load()).toContain('Fulanópolis');
    expect(await sc.suggest('Fulanópolys', 'pt-BR')).toContain('Fulanópolis');
    await sc.remove('Fulanópolis');
    expect(await sc.check('Fulanópolis', 'pt-BR')).toBe(false);
    expect(store.load()).not.toContain('Fulanópolis');
    off();
    expect(events).toEqual(['add:Fulanópolis', 'remove:Fulanópolis']);
  });
  it('ignorar vale só na sessão e não grava', async () => {
    expect(await sc.check('zumbizumbi', 'pt-BR')).toBe(false);
    sc.ignore('zumbizumbi');
    expect(await sc.check('zumbizumbi', 'pt-BR')).toBe(true);
    expect(sc.cached('zumbizumbi', 'pt-BR')).toBe(true);
    expect(store.load()).not.toContain('zumbizumbi');
  });
  it('cached responde sem esperar o que já foi revisado', async () => {
    await sc.checkWords(['cachorro', 'cachoro'], 'pt-BR');
    expect(sc.cached('cachorro', 'pt-BR')).toBe(true);
    expect(sc.cached('cachoro', 'pt-BR')).toBe(false);
    expect(sc.cached('nuncavisto', 'pt-BR')).toBeUndefined();
  });
});
