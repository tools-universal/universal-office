import { describe, it, expect } from 'vitest';
import { parseXml } from '../src/xml.js';
import { patternGif, pageBackgroundXml, readPageBackground, oneColorGradientColor2, resolveColor2, vmlColorAttr, writePageBackground, WORD_PATTERNS } from '../src/page-background.js';
import { writeDisplayBackgroundShape } from '../src/settings-xml.js';
import { DocxPackage } from '../src/package.js';
import { blankDocxPackage } from '../src/blank.js';

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const rows = (h: string): number[] => h.match(/../g)!.map((x) => parseInt(x, 16));

// GIFs que o Word pt-BR grava (oráculo write/tools/page-lab, page-oracle2: Patterned(1) e (7))
const WORD_GIF_5 = '4749463837610800080077010021fe1a536f6674776172653a204d6963726f736f6674204f6666696365002c000000000800080080ffffff000000020844 8ea9cb6c0d6101003b'.replace(/\s/g, '');
const WORD_GIF_50 = '4749463837610800080077010021fe1a536f6674776172653a204d6963726f736f6674204f6666696365002c000000000800080080ffffff000000020c448c718b99ccdc828d2a090a003b';

describe('Cor da Página — padrões', () => {
  it('o GIF do padrão sai byte a byte igual ao do Word (5% e 50%)', () => {
    expect(hex(patternGif(rows('8000000008000000')))).toBe(WORD_GIF_5);
    expect(hex(patternGif(rows('aa55aa55aa55aa55')))).toBe(WORD_GIF_50);
  });
  it('48 padrões na ordem do Word', () => {
    expect(WORD_PATTERNS).toHaveLength(48);
    expect(WORD_PATTERNS[40]!.prst).toBe('openDmnd');
    expect(WORD_PATTERNS[40]!.title.pt).toBe('Contorno de losango');
  });
});

describe('Cor da Página — XML como o Word grava (page-oracle2)', () => {
  it('cor sólida e do tema', () => {
    expect(pageBackgroundXml({ color: 'FFFF00' })).toBe('<w:background w:color="FFFF00"/>');
    expect(pageBackgroundXml({ color: 'FAE2D5', themeColor: 'accent2', themeTint: '33' }))
      .toBe('<w:background w:color="FAE2D5" w:themeColor="accent2" w:themeTint="33"/>');
  });
  it('gradiente de duas cores em cada estilo', () => {
    const g = (o: object): string => pageBackgroundXml({ color: 'FF0000', fill: { type: 'gradient', color: 'FF0000', color2: 'blue', ...o } });
    expect(g({ focus: 100 })).toBe('<w:background w:color="FF0000"><v:background id="_x0000_s1025" o:bwmode="white" fillcolor="red" o:targetscreensize="1024,768"><v:fill color2="blue" focus="100%" type="gradient"/></v:background></w:background>');
    expect(g({ angle: -90, focus: -50 })).toContain('<v:fill color2="blue" angle="-90" focus="-50%" type="gradient"/>');
    expect(g({ angle: -135 })).toContain('<v:fill color2="blue" angle="-135" type="gradient"/>');
  });
  it('radial do canto e do centro', () => {
    const corner = pageBackgroundXml({ color: 'FF0000', fill: { type: 'gradientRadial', color: 'FF0000', color2: 'blue', focusPosition: [1, 1], focus: 100, gradientCenter: true } });
    expect(corner).toContain('<v:fill color2="blue" focusposition="1,1" focussize="" focus="100%" type="gradientRadial"><o:fill v:ext="view" type="gradientCenter"/></v:fill>');
    const corner2 = pageBackgroundXml({ color: 'FF0000', fill: { type: 'gradientRadial', color: 'FF0000', color2: 'blue', focusPosition: [0, 1], focus: 100, gradientCenter: true } });
    expect(corner2).toContain('focusposition=",1" focussize=""');
    const center = pageBackgroundXml({ color: 'FF0000', fill: { type: 'gradientRadial', color: 'FF0000', color2: 'blue', focusPosition: [0.5, 0.5] } });
    expect(center).toContain('<v:fill color2="blue" focusposition=".5,.5" focussize="" type="gradientRadial"/>');
  });
  it('uma cor e predefinido', () => {
    const one = pageBackgroundXml({ color: '008000', fill: { type: 'gradient', color: '008000', color2: 'fill lighten(102)', angle: -90, method: 'linear sigma' } });
    expect(one).toContain('<v:fill color2="fill lighten(102)" angle="-90" method="linear sigma" type="gradient"/>');
    expect(oneColorGradientColor2(0.25)).toBe('fill darken(128)');
    expect(oneColorGradientColor2(0.75)).toBe('fill lighten(128)');
    expect(oneColorGradientColor2(0.5)).toBe('fill');
    expect(oneColorGradientColor2(1)).toBe('fill lighten(0)');
    expect(resolveColor2('fill darken(128)', '008000')).toBe('004000');
    expect(resolveColor2('fill lighten(128)', '008000')).toBe('7FC07F');
    const pre = pageBackgroundXml({ color: '000082', fill: { type: 'gradient', color: '000082', color2: '#ff8200', colors: [{ pos: 0, color: '000082' }, { pos: 19661 / 65536, color: '66008F' }, { pos: 58982 / 65536, color: 'FF0000' }, { pos: 1, color: 'FF8200' }], method: 'none', focus: 100 } });
    expect(pre).toContain('colors="0 #000082;19661f #66008f;58982f red;1 #ff8200" method="none" focus="100%"');
  });
  it('padrão, imagem e textura', () => {
    expect(pageBackgroundXml({ color: 'C80000', fill: { type: 'pattern', color: 'C80000', color2: '#ffffc8', title: ' 5%' } }, 'rId2'))
      .toBe('<w:background w:color="C80000"><v:background id="_x0000_s1025" o:bwmode="white" fillcolor="#c80000"><v:fill r:id="rId2" o:title=" 5%" color2="#ffffc8" type="pattern"/></v:background></w:background>');
    expect(pageBackgroundXml({ fill: { type: 'frame', title: 'quad' } }, 'rId2'))
      .toBe('<w:background w:color="FFFFFF"><v:background id="_x0000_s1025" o:bwmode="white" o:targetscreensize="1024,768"><v:fill r:id="rId2" o:title="quad" type="frame"/></v:background></w:background>');
    expect(pageBackgroundXml({ fill: { type: 'tile', title: 'quad' } }, 'rId2'))
      .toBe('<w:background w:color="FFFFFF"><v:background id="_x0000_s1025" o:bwmode="white"><v:fill r:id="rId2" o:title="quad" type="tile"/></v:background></w:background>');
  });
  it('cores VML como o Word', () => {
    expect(vmlColorAttr('FF0000')).toBe('red');
    expect(vmlColorAttr('FFCC99')).toBe('#fc9');
    expect(vmlColorAttr('0080FF')).toBe('#0080ff');
  });
  it('lê o que grava', () => {
    const xml = pageBackgroundXml({ color: 'FF0000', fill: { type: 'gradientRadial', color: 'FF0000', color2: 'blue', focusPosition: [1, 0], focus: 100, gradientCenter: true } });
    const el = parseXml(`<w:document xmlns:w="w" xmlns:v="v" xmlns:o="o">${xml}</w:document>`).children.find((c) => typeof c !== 'string') as never;
    const bg = readPageBackground(el, () => undefined)!;
    expect(bg.fill).toMatchObject({ type: 'gradientRadial', color: 'FF0000', color2: 'blue', focusPosition: [1, 0], focus: 100, gradientCenter: true });
  });
});

describe('Cor da Página — gravação no pacote', () => {
  it('troca o w:background, grava a imagem e tira a relação antiga', () => {
    const pkg = blankDocxPackage() as DocxPackage;
    writePageBackground(pkg, { color: 'FFFF00' });
    expect(pkg.documentXml()).toMatch(/<w:document\b[^>]*><w:background w:color="FFFF00"\/><w:body>/);
    const gif = patternGif(rows('aa55aa55aa55aa55'));
    writePageBackground(pkg, { color: 'C80000', fill: { type: 'pattern', color: 'C80000', color2: '#ffffc8', title: ' 50%', image: { data: gif, ext: 'gif' } } });
    const xml = pkg.documentXml();
    const rid = /r:id="(rId\d+)"/.exec(xml)![1]!;
    expect(xml).toContain('xmlns:v="urn:schemas-microsoft-com:vml"');
    expect((xml.match(/<w:background\b/g) ?? []).length).toBe(1);
    const rels = pkg.getPartText('word/_rels/document.xml.rels')!;
    expect(rels).toContain(`Id="${rid}"`);
    expect(pkg.getPartText('[Content_Types].xml')).toContain('Extension="gif"');
    writePageBackground(pkg, null);
    expect(pkg.documentXml()).not.toContain('<w:background');
    expect(pkg.getPartText('word/_rels/document.xml.rels')).not.toContain(`Id="${rid}"`);
  });
  it('displayBackgroundShape liga e desliga', () => {
    const pkg = blankDocxPackage() as DocxPackage;
    writeDisplayBackgroundShape(pkg, true);
    expect(pkg.getPartText('word/settings.xml')).toContain('<w:displayBackgroundShape/>');
    writeDisplayBackgroundShape(pkg, false);
    expect(pkg.getPartText('word/settings.xml')).not.toContain('displayBackgroundShape');
  });
});
