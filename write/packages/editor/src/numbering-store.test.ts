import { describe, expect, it } from 'vitest';
import { DocNumbering, libraryLevels, parseLevel, sameLevelFormat, type ListLocale } from './numbering-store.js';
import { BULLET_LIBRARY, MULTILEVEL_LIBRARY, NUMBER_LIBRARY } from './list-library.js';

const PT: ListLocale = { lcid: '0416', heading: (n) => `Ttulo${n}`, article: 'Artigo', section: 'Seção', chapter: 'Capítulo' };

describe('bibliotecas de listas (oráculo home-lab exp-lists)', () => {
  it('os modelos têm 9 níveis; o 1º marcador é o • da Symbol com tplc pt-BR', () => {
    for (const lib of [BULLET_LIBRARY, NUMBER_LIBRARY, MULTILEVEL_LIBRARY]) for (const d of lib) expect(d.levels).toHaveLength(9);
    const l0 = libraryLevels(BULLET_LIBRARY[0]!, PT)[0]!;
    expect(l0).toContain('w:tplc="04160001"');
    expect(parseLevel(l0)).toMatchObject({ numFmt: 'bullet', lvlText: '', rPr: { rFonts: { ascii: 'Symbol' } } });
  });
  it('os modelos de títulos usam os estilos e os textos do idioma', () => {
    const art = MULTILEVEL_LIBRARY.find((d) => d.levels[0]!.includes('{ARTICLE}'))!;
    const lv = libraryLevels(art, PT);
    expect(lv[0]).toContain('<w:pStyle w:val="Ttulo1"/>');
    expect(parseLevel(lv[0]!)?.lvlText).toBe('Artigo %1.');
    expect(libraryLevels(art, { ...PT, lcid: '0409', article: 'Article', heading: (n) => `Heading${n}` })[0]).toContain('Article %1.');
  });
});

describe('DocNumbering', () => {
  it('lista nova: abstractNum + w:num (ids a partir de 0/1), versões para o desfazer', () => {
    const n = new DocNumbering(null);
    const id = n.addList(libraryLevels(NUMBER_LIBRARY[0]!, PT), { multiLevelType: 'hybridMultilevel' });
    expect(id).toBe(1);
    expect(n.abstractOf(1)).toBe(0);
    expect(n.xml).toMatch(/<w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="[0-9A-F]{8}"\/><w:multiLevelType w:val="hybridMultilevel"\/><w:tmpl w:val="[0-9A-F]{8}"\/><w:lvl w:ilvl="0" w:tplc="0416000F">/);
    expect(n.xml).toMatch(/<\/w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"\/><\/w:num><\/w:numbering>$/);
    expect(n.dirty).toBe(true);
    expect(n.restore(0)).toBe(true);
    expect(n.xml).toBeNull();
    // (cada passo interno é uma versão: a última tem o w:num)
    expect(n.restore(2)).toBe(true);
    expect(n.level(1, 0)?.numFmt).toBe('decimal');
  });
  it('a parte original fica byte a byte até mexer; abstractNum novo entra antes dos w:num', () => {
    const src = '<?xml version="1.0"?>\r\n<w:numbering xmlns:w="w"><w:abstractNum w:abstractNumId="3"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="7"><w:abstractNumId w:val="3"/></w:num></w:numbering>';
    const n = new DocNumbering(src);
    expect(n.dirty).toBe(false);
    const id = n.addList(libraryLevels(BULLET_LIBRARY[0]!, PT), { multiLevelType: 'hybridMultilevel' });
    expect(id).toBe(8);
    expect(n.abstractOf(8)).toBe(4);
    // sem w15 declarado na raiz: sem o atributo
    expect(n.xml).toContain('<w:abstractNum w:abstractNumId="4"><w:nsid');
    expect(n.xml!.indexOf('w:abstractNumId="4"')).toBeLessThan(n.xml!.indexOf('<w:num w:numId="7"'));
    expect(n.xml!.startsWith('<?xml version="1.0"?>\r\n<w:numbering xmlns:w="w"><w:abstractNum w:abstractNumId="3">')).toBe(true);
  });
  it('Reiniciar: cópia com nsid novo, mesmo tmpl e w:tplc FFFFFFFF (NumberingRestart)', () => {
    const n = new DocNumbering(null);
    n.addList(libraryLevels(NUMBER_LIBRARY[0]!, PT), { multiLevelType: 'hybridMultilevel', tmpl: 'ABCDEF01' });
    const copy = n.copyAbstract(0)!;
    expect(copy).toBe(1);
    const x = n.abstractXml(1)!;
    expect(x).toContain('<w:tmpl w:val="ABCDEF01"/>');
    expect(x.match(/w:tplc="FFFFFFFF"/g)).toHaveLength(9);
    expect(/<w:nsid w:val="([0-9A-F]{8})"/.exec(x)![1]).not.toBe(/<w:nsid w:val="([0-9A-F]{8})"/.exec(n.abstractXml(0)!)![1]);
  });
  it('níveis sem parágrafo viram w:tentative na gravação (só nas listas híbridas mexidas)', () => {
    const n = new DocNumbering(null);
    n.addList(libraryLevels(NUMBER_LIBRARY[0]!, PT), { multiLevelType: 'hybridMultilevel' });
    n.addList(libraryLevels(MULTILEVEL_LIBRARY[1]!, PT), { multiLevelType: 'multilevel' });
    const out = n.withTentative(new Set([0, 1]), new Map([[0, new Set([0, 2])]]))!;
    expect(out.match(/w:tentative="1"/g)).toHaveLength(7);
    expect(out).toMatch(/<w:lvl w:ilvl="2" w:tplc="0416001B">/);
    expect(n.xml).not.toContain('tentative');
  });
  it('w:numStyleLink segue até o abstractNum do estilo de lista', () => {
    const n = new DocNumbering(null);
    const own = n.addList(libraryLevels(MULTILEVEL_LIBRARY[0]!, PT), { multiLevelType: 'multilevel', styleLink: 'MinhaLista' });
    const linked = n.addList([], { multiLevelType: 'multilevel', numStyleLink: 'MinhaLista' });
    n.styleNum = (id) => (id === 'MinhaLista' ? own : undefined);
    expect(n.abstractOf(linked)).toBe(n.abstractOf(own));
    expect(n.level(linked, 0)?.lvlText).toBe('%1)');
  });
  it('mesmo formato de nível: formato, texto e fonte', () => {
    const a = parseLevel(libraryLevels(NUMBER_LIBRARY[0]!, PT)[0]!);
    const b = parseLevel(libraryLevels(NUMBER_LIBRARY[0]!, { ...PT, lcid: '0409' })[0]!);
    expect(sameLevelFormat(a, b)).toBe(true);
    expect(sameLevelFormat(a, parseLevel(libraryLevels(NUMBER_LIBRARY[1]!, PT)[0]!))).toBe(false);
  });
});
