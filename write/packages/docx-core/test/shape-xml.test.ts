// Forma/caixa de texto (wps): leitura e edição cirúrgica contra o XML do Word
// (oráculo write/tools/textbox-lab/results — o "pretty" volta a ser o XML original).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readShapeFormat, patchShape, vmlFallback, newTextboxDrawingXml, txbxContentOf, parseXml, type DmlColor } from '../src/index.js';
import { vmlTextboxToDrawing } from '../src/vml-shape.js';
import { SHAPE_STYLE_PRESETS } from '../../../../shared/drawingml/src/shape-styles.js';

const RES = join(__dirname, '..', '..', '..', 'tools', 'textbox-lab', 'results');
const unpretty = (s: string): string => s.replace(/<!--[\s\S]*?-->\n?/g, '').replace(/>\n\s*</g, '><').trim();
/** XML da caixa do experimento: o w:drawing (Choice) e o mc:Fallback. */
function lab(name: string): { drawing: string; fallback: string } {
  const x = unpretty(readFileSync(join(RES, `${name}.xml`), 'utf8'));
  return { drawing: /<w:drawing>[\s\S]*?<\/w:drawing>/.exec(x)![0], fallback: /<mc:Fallback>[\s\S]*?<\/mc:Fallback>/.exec(x)![0] };
}
const ids = (s: string) => s.replace(/(wp:docPr id=")\d+/g, '$1N').replace(/\s(w14:anchorId|o:gfxdata)="[^"]*"/g, '').replace(/<wp:effectExtent [^>]*\/>/, '<wp:effectExtent/>');
const theme: Record<string, string> = { lt1: 'FFFFFF', dk1: '000000', accent1: '156082', accent2: 'E97132' };
const color = (c: DmlColor): string => (c.kind === 'srgbClr' ? c.val : c.kind === 'prstClr' ? (c.val === 'black' ? '000000' : 'FFFFFF') : theme[c.val] ?? '000000');

describe('caixa de texto: leitura (readShapeFormat)', () => {
  it('a caixa padrão do AddTextbox', () => {
    const f = readShapeFormat(lab('default').drawing)!;
    expect(f.textbox).toBe(true);
    expect(f.fill).toEqual({ kind: 'none' });
    expect(f.line?.w).toBe(6350);
    expect(f.body).toMatchObject({ lIns: 91440, tIns: 45720, anchor: 't', vert: 'horz', wrap: 'square', autofit: 'none' });
    expect(f.story).toEqual({ kind: 'txbx' });
    expect(f.docPr.name).toBe('Caixa de Texto 1');
  });
  it('vínculo: txbx id e linkedTxbx id/seq', () => {
    const x = unpretty(readFileSync(join(RES, 'link3.xml'), 'utf8'));
    const ds = [...x.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>/g)].map((m) => readShapeFormat(m[0])!.story);
    expect(ds).toEqual([{ kind: 'linked', id: 1, seq: 2 }, { kind: 'linked', id: 1, seq: 1 }, { kind: 'txbx', id: 1 }]);
  });
  it('estilo de forma (wps:style) e padrão', () => {
    expect(readShapeFormat(lab('style-16').drawing)!.style).toMatchObject({ ln: { idx: 3 }, fill: { idx: 1, color: { kind: 'schemeClr', val: 'accent1' } }, font: { idx: 'minor', color: { val: 'lt1' } } });
    expect(readShapeFormat(lab('fill-pattern').drawing)!.fill).toMatchObject({ kind: 'pattern', prst: 'pct30' });
  });
});

describe('caixa de texto: edição como o Word (patchShape)', () => {
  const base = lab('default').drawing;
  const cases: [string, Parameters<typeof patchShape>[1]][] = [
    ['fill-rgb', { fill: { kind: 'solid', color: { kind: 'srgbClr', val: '3399FF' } } }],
    ['fill-theme', { fill: { kind: 'solid', color: { kind: 'schemeClr', val: 'accent2' } } }],
    ['fill-theme-light40', { fill: { kind: 'solid', color: { kind: 'schemeClr', val: 'accent1', mods: [['lumMod', 60000], ['lumOff', 40000]] } } }],
    ['fill-transp', { fill: { kind: 'solid', color: { kind: 'srgbClr', val: '3399FF', mods: [['alpha', 50000]] } } }],
    ['margins', { body: { lIns: 127000, tIns: 38100, rIns: 152400, bIns: 50800 } }],
    ['anchor-mid', { body: { anchor: 'ctr' } }],
    ['anchor-bottom', { body: { anchor: 'b' } }],
    ['orient-2', { body: { vert: 'vert270' } }],
    ['orient-3', { body: { vert: 'vert' } }],
    ['nowrap', { body: { wrap: 'none' } }],
    ['autosize', { body: { autofit: 'shape' } }],
    ['name', { name: 'Minha caixa' }],
    ['hidden', { hidden: true }],
    ['alt', { descr: 'Descricao da caixa', title: 'Titulo da caixa' }],
    ['line-theme', { line: { w: 19050, fill: { kind: 'schemeClr', val: 'accent1' } } }],
    ['line-none', { outline: null }],
    ['line-rgb', { outline: { w: 38100, fill: { kind: 'srgbClr', val: 'FF0000' }, dash: 'dash' } }],
  ];
  for (const [name, ch] of cases) {
    it(name, () => expect(ids(patchShape(base, ch))).toBe(ids(lab(name).drawing)));
  }
  // galeria Estilos de Forma (tabela gerada dos mesmos resultados)
  for (const n of [1, 8, 16, 22, 36, 43, 50, 57, 64, 71, 77]) {
    it(`estilo de forma ${n}`, () => {
      const [spPr, style] = SHAPE_STYLE_PRESETS[n - 1]!;
      expect(ids(patchShape(base, { stylePreset: { spPr, style } }))).toBe(ids(lab(`style-${n}`).drawing));
    });
  }
});

describe('caixa de texto: VML de reserva (vmlFallback)', () => {
  const strip = (s: string) => ids(s).replace(/<v:shapetype[\s\S]*?<\/v:shapetype>/, '');
  for (const name of ['default', 'fill-rgb', 'margins', 'anchor-mid', 'orient-2', 'orient-3', 'autosize', 'nowrap', 'hidden', 'name', 'line-rgb', 'line-none', 'fill-transp', 'pos-center-margin', 'wrap-0', 'flipH']) {
    it(name, () => {
      const l = lab(name);
      const content = txbxContentOf(l.drawing)!;
      const ours = vmlFallback(l.drawing, content, { color, spid: 1026 });
      expect(strip(ours)).toBe(strip(l.fallback));
    });
  }
});

describe('caixa de texto nova (newTextboxDrawingXml)', () => {
  it('o w:drawing do AddTextbox (preenchimento e contorno do COM)', () => {
    const d = newTextboxDrawingXml({
      id: 1, name: 'Caixa de Texto 1', cx: 2286000, cy: 1143000, relativeHeight: 251659264,
      posH: { relativeFrom: 'column', offset: 189865 }, posV: { relativeFrom: 'paragraph', offset: -1667510 },
      fill: { kind: 'none' }, content: '<w:p><w:r><w:t>Texto da caixa de teste</w:t></w:r></w:p>',
    });
    expect(ids(d)).toBe(ids(lab('default').drawing));
  });
});

describe('caixa só em VML (modo de compatibilidade 12): o wps equivalente', () => {
  const vml = (name: string) => {
    const x = unpretty(readFileSync(join(RES, `${name}.xml`), 'utf8'));
    const pict = parseXml(/<w:pict[\s\S]*?<\/w:pict>/.exec(x)![0]);
    const el = pict.children.find((k) => typeof k !== 'string' && k.name !== 'v:shapetype') as Parameters<typeof vmlTextboxToDrawing>[0];
    return readShapeFormat(vmlTextboxToDrawing(el, 7)!)!;
  };
  it('posição, tamanho e quebra padrão', () => {
    const f = vml('c12-default');
    expect(f.cx).toBe(180 * 12700);
    expect(f.posH).toMatchObject({ relativeFrom: 'column', offset: 100 * 12700 });
    expect(f.wrap).toBe('front');
    expect(f.line?.w).toBe(9525);
  });
  it('preenchimento com transparência', () => expect(vml('c12-fill').fill).toEqual({ kind: 'solid', color: { kind: 'srgbClr', val: '3399FF', mods: [['alpha', 75000]] } }));
  it('degradê de duas cores', () => expect(vml('c12-grad').fill).toMatchObject({ kind: 'gradient', stops: [{ color: { val: 'FF0000' } }, { color: { val: '0000FF' } }] }));
  it('contorno', () => expect(vml('c12-line').line).toMatchObject({ w: 38100, fill: { val: 'FF0000' }, dash: 'dash' }));
  it('sem preenchimento e sem contorno', () => { const f = vml('c12-noline'); expect(f.fill.kind).toBe('none'); expect(f.line?.fill).toBeNull(); });
  it('margens e alinhamento', () => expect(vml('c12-margins').body).toMatchObject({ lIns: 127000, tIns: 38100, rIns: 152400, bIns: 50800, anchor: 'ctr' }));
  it('ajustar ao texto e direção', () => { expect(vml('c12-autosize').body?.autofit).toBe('shape'); expect(vml('c12-orient').body?.vert).toBe('vert'); });
  it('VML de volta: cantos arredondados viram v:roundrect com o arcsize do Word', () => {
    const x = unpretty(readFileSync(join(RES, 'c12-shape.xml'), 'utf8'));
    const pict = parseXml(/<w:pict[^>]*>[\s\S]*?<\/w:pict>/.exec(x)![0]);
    const el = pict.children.find((k) => typeof k !== 'string' && k.name !== 'v:shapetype') as Parameters<typeof vmlTextboxToDrawing>[0];
    const out = vmlFallback(vmlTextboxToDrawing(el, 7)!, '<w:p/>', { color: () => '000000', spid: 1026 });
    expect(out).toMatch(/<v:roundrect [^>]*arcsize="10923f"/);
    expect(out).toMatch(/<\/v:roundrect><\/w:pict>/);
  });
  it('quebra quadrada, oculta com nome, cantos arredondados', () => {
    expect(vml('c12-wrap').wrap).toBe('square');
    const h = vml('c12-hidden');
    expect(h.docPr).toMatchObject({ name: 'Minha caixa', hidden: true });
    expect(vml('c12-shape').geom).toBe('roundRect');
  });
});
