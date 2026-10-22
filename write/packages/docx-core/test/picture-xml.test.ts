// Formatação de imagem contra o ORÁCULO (write/tools/image-lab/results): parte
// do w:drawing que o Word gravou ao inserir a imagem e aplica a mesma operação
// que o experimento — o XML tem de sair igual ao que o Word gravou depois dela
// (ids do docPr à parte: o Word sorteia um a cada gravação).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPictureFormat, patchPicture, type PictureChange } from '../src/index.js';

const RESULTS = join(__dirname, '../../../tools/image-lab/results');

/** 1º w:drawing do resultado, sem a quebra de linha/recuo do pretty-print. */
function drawing(name: string, i = 0): string {
  const x = readFileSync(join(RESULTS, `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
  const all = [...x.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>/g)].map((m) => m[0]);
  return all[i]!;
}
/** sem os ids sorteados (docPr/cNvPr) */
const norm = (x: string): string => x.replace(/(<(?:wp:docPr|pic:cNvPr)\b[^>]*?\bid=")\d+"/g, '$1#"');

const has = (n: string) => existsSync(join(RESULTS, `${n}.xml`));

describe('picture-xml — leitura', () => {
  it('em linha: tamanho, sem quebra, trava de proporção', () => {
    const f = readPictureFormat(drawing('inline'))!;
    expect(f.inline).toBe(true);
    expect(f.wrap).toBe('inline');
    expect([f.cx, f.cy]).toEqual([1828800, 1371600]);
    expect(f.noChangeAspect).toBe(true);
    expect(f.geom).toBe('rect');
    expect(f.embed).toBe('rId4');
  });
  it('flutuante: quebra, posição, distâncias', () => {
    const f = readPictureFormat(drawing('ui-square'))!;
    expect(f.inline).toBe(false);
    expect(f.wrap).toBe('square');
    expect(f.posH).toEqual({ relativeFrom: 'column', offset: -3810 });
    expect(f.posV).toEqual({ relativeFrom: 'paragraph', offset: -635 });
    expect(f.dist).toEqual({ t: 0, b: 0, l: 114300, r: 114300 });
    expect(f.sizeRelH).toEqual({ relativeFrom: 'page', pct: 0 });
    expect(readPictureFormat(drawing('wrap-behind'))!.wrap).toBe('behind');
    expect(readPictureFormat(drawing('wrap-front'))!.wrap).toBe('front');
    expect(readPictureFormat(drawing('wrap-topbottom'))!.wrap).toBe('topAndBottom');
    const t = readPictureFormat(drawing('wrap-tight'))!;
    expect(t.wrap).toBe('tight');
    expect(t.polygon).toEqual({ edited: false, pts: [[0, 0], [0, 21300], [21375, 21300], [21375, 0], [0, 0]] });
  });
  it('efeitos, contorno, ajustes e texto alt', () => {
    expect(readPictureFormat(drawing('line'))!.line).toEqual({ w: 57150, fill: { kind: 'srgbClr', val: 'FF0000' }, dash: 'dash' });
    expect(readPictureFormat(drawing('shadow-21'))!.effects.shadow).toEqual({
      kind: 'outer', blurRad: 50800, dist: 38100, dir: 2700000, algn: 'tl', color: { kind: 'prstClr', val: 'black', mods: [['alpha', 40000]] },
    });
    expect(readPictureFormat(drawing('softedge-3'))!.effects.softEdge).toBe(63500);
    expect(readPictureFormat(drawing('glow'))!.effects.glow).toEqual({ rad: 101600, color: { kind: 'schemeClr', val: 'accent1', mods: [['alpha', 40000]] } });
    expect(readPictureFormat(drawing('color-wash'))!.blip.lum).toEqual({ bright: 70000, contrast: -70000 });
    expect(readPictureFormat(drawing('pe-saturation'))!.blip.a14).toEqual({ layerRid: 'rId5', saturation: 200000 });
    const alt = readPictureFormat(drawing('alt'))!;
    expect(alt.docPr).toMatchObject({ name: 'Imagem 1', descr: 'Descricao de teste', title: 'Titulo de teste' });
    expect(readPictureFormat(drawing('decorative'))!.docPr.decorative).toBe(true);
    expect(readPictureFormat(drawing('crop-left'))!.srcRect).toEqual({ l: 10000, t: 0, r: 0, b: 0 });
    expect(readPictureFormat(drawing('oval-inline'))!.geom).toBe('ellipse');
    const r = readPictureFormat(drawing('rot30-inline'))!;
    expect(r.rot).toBe(1800000);
  });
});

describe('picture-xml — edição igual ao Word', () => {
  const base = () => drawing('inline');
  const cases: [string, PictureChange][] = [
    ['ui-square', { wrap: 'square', at: { x: -3810, y: -635 } }],
    ['ui-square-repag', { wrap: 'square', at: { x: -3810, y: -635 } }],
    ['alt', { descr: 'Descricao de teste', title: 'Titulo de teste' }],
    ['decorative', { decorative: true }],
    ['line', { line: { w: 57150, fill: { kind: 'srgbClr', val: 'FF0000' }, dash: 'dash' }, effectExtent: { l: 57150, t: 57150, r: 57150, b: 57150 } }],
    ['line-theme', { line: { w: 38100, fill: { kind: 'schemeClr', val: 'accent1' } }, effectExtent: { l: 38100, t: 38100, r: 38100, b: 38100 } }],
    ['softedge-3', { softEdge: 63500 }],
    ['color-gray', { blipFx: { grayscl: true } }],
    ['color-bw', { blipFx: { biLevel: 50000 } }],
    ['color-wash', { blipFx: { lum: { bright: 70000, contrast: -70000 } } }],
    ['bright', { blipFx: { lum: { bright: 40000 } } }],
  ];
  it('transp-color (o a:blip; o COM ainda põe um preenchimento na forma)', () => {
    const blip = (x: string) => /<a:blip\b[\s\S]*?<\/a:blip>/.exec(x)![0];
    const ch: PictureChange = { blipFx: { clrChange: { from: { kind: 'srgbClr', val: 'DC2828' }, to: { kind: 'srgbClr', val: 'DC2828', mods: [['alpha', 0]] } } } };
    expect(blip(patchPicture(base(), ch))).toBe(blip(drawing('transp-color')));
  });
  for (const [name, ch] of cases) {
    it(name, () => {
      if (!has(name)) return;
      expect(norm(patchPicture(base(), ch))).toBe(norm(drawing(name)));
    });
  }
  it('Quadrado → Comprimido / → Em Linha (troca de quebra)', () => {
    const sq = drawing('ui-square');
    if (has('ui-sq-tight')) expect(norm(patchPicture(sq, { wrap: 'tight' }))).toBe(norm(drawing('ui-sq-tight')));
    if (has('ui-sq-inline')) expect(norm(patchPicture(sq, { wrap: 'inline' }))).toBe(norm(drawing('ui-sq-inline')));
  });
  it('o que não muda sai byte a byte', () => {
    const x = drawing('shadow-21');
    expect(patchPicture(x, {})).toBe(x);
    expect(patchPicture(x, { descr: 'a' }).replace(' descr="a"', '').replace(' descr="a"', '').replace(' name="Imagem 1" descr', ' name="" descr')).toContain('outerShdw');
  });
});
