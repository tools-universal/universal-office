/**
 * Desenho fora do texto — regras medidas no Word (PDF exportado) com documentos
 * sintéticos do lab de desenho: ajustes de cor de imagem, geometrias
 * predefinidas, degradês, bordas de página/parágrafo e EMF+ só com imagem.
 * Entradas inventadas aqui; os valores esperados são os medidos no Word.
 */
import { describe, it, expect } from 'vitest';
import { applyImageEffects, effectDecode, effectLine } from '../src/images.js';
import { gradientGeometry, gradientSamples, groupChild, presetPath, presetPathLocal } from '../src/geometry.js';
import { borderPaintWidth, pageBorderItems, paintBorder, paintParaBox } from '../src/paint.js';
import { renderEmf } from '../src/emf.js';
import { shadingFill } from '../src/resolve.js';
import type { DocContext } from '../src/context.js';
import type { PageItem, PathCmdTw } from '../src/tree.js';
import type { PreparedPara } from '../src/para.js';

/** rampa de cinza 0..255 (RGBA) → canal R depois do ajuste */
const ramp = (fx: Parameters<typeof applyImageEffects>[1], rgb: (v: number) => [number, number, number] = (v) => [v, v, v]): number[] => {
  const px = new Uint8Array(256 * 4);
  for (let v = 0; v < 256; v++) px.set([...rgb(v), 255], v * 4);
  applyImageEffects(px, fx);
  return Array.from({ length: 256 }, (_, v) => px[v * 4]!);
};

describe('ajustes de cor de imagem (oráculo imgfx)', () => {
  it('VML "desbotar" (gain 19661f, blacklevel 22938f) — valores do PDF do Word', () => {
    const out = ramp({ gain: 19661 / 65536, bright: (2 * 22938) / 65536 });
    expect([out[0], out[32], out[64], out[96], out[128], out[160], out[192]]).toEqual([205, 215, 224, 234, 244, 253, 255]);
  });
  it('VML gain/blacklevel isolados', () => {
    expect(ramp({ gain: 0.5 })[0]).toBe(64);
    expect(ramp({ gain: 0.5 })[255]).toBe(191);
    expect(ramp({ bright: (2 * 13107) / 65536 })[32]).toBe(134);
    expect(ramp({ gain: 0.5, bright: (2 * 13107) / 65536 })[0]).toBe(140);
  });
  it('DrawingML a:lum (trunca): desbotar e brilho/contraste combinados', () => {
    // bright 70%, contrast −70% → gain 0,3
    const wash = ramp({ gain: 0.3, bright: 0.7, floor: true });
    expect([wash[0], wash[32], wash[64], wash[96], wash[128]]).toEqual([205, 214, 224, 234, 243]);
    // bright 20%, contrast 30% → gain 1/0,7
    const bc = ramp({ gain: 1 / 0.7, bright: 0.2, floor: true });
    expect([bc[32], bc[64], bc[96], bc[128], bc[160]]).toEqual([53, 98, 144, 190, 235]);
  });
  it('escala de cinza Rec. 709 antes do brilho/contraste', () => {
    expect(ramp({ gray: true }, (v) => [v, 0, 0])[255]).toBe(54);
    expect(ramp({ gray: true }, (v) => [0, v, 255])[0]).toBe(18);
    expect(ramp({ gray: true, gain: 19661 / 65536, bright: (2 * 22938) / 65536 }, (v) => [v, 0, 0])[255]).toBe(221);
  });
  it('preto e branco pela luminância', () => {
    const out = ramp({ biLevel: 0.5 });
    expect(out[127]).toBe(0);
    expect(out[128]).toBe(255);
  });
  it('JPEG: a reta vira /Decode; cinza exige os pixels', () => {
    const ln = effectLine({ gain: 0.3, bright: 0.7 })!;
    expect(ln.slope).toBeCloseTo(0.3);
    expect(ln.off).toBeCloseTo(0.805);
    expect(effectDecode({ gain: 0.3, bright: 0.7 }, 3)).toHaveLength(6);
    expect(effectDecode({ gray: true }, 3)).toBeNull();
  });
});

const pts = (cmds: PathCmdTw[]) => cmds.filter((c) => c.op !== 'Z').map((c) => (c.op === 'C' ? [c.x, c.y] : [c.x, c.y]).map((v) => Math.round(v * 100) / 100));

describe('geometrias predefinidas (oráculo de formas)', () => {
  it('triangle adj=0: vértice no canto superior esquerdo', () => {
    expect(pts(presetPathLocal('triangle', 100, 200, { adj: 0 }))).toEqual([[0, 200], [0, 0], [100, 200]]);
    expect(pts(presetPathLocal('triangle', 100, 200))).toEqual([[0, 200], [50, 0], [100, 200]]);
  });
  it('rotação de 90° em torno do centro, espelho antes da rotação', () => {
    // 100×300 em (200,100), girado 90°: vira 300×100 centrado no mesmo ponto
    const r = pts(presetPath('triangle', 200, 100, 100, 300, { adj: { adj: 0 }, rot: 90 }));
    expect(r).toEqual([[100, 200], [400, 200], [100, 300]]);
    const f = pts(presetPath('triangle', 0, 0, 100, 200, { adj: { adj: 0 }, flipH: true }));
    expect(f).toEqual([[100, 200], [100, 0], [0, 200]]);
  });
  it('rightArrow com ajustes', () => {
    expect(pts(presetPathLocal('rightArrow', 200, 80, { adj1: 30000, adj2: 80000 }))).toEqual([[0, 28], [136, 28], [136, 0], [200, 40], [136, 80], [136, 52], [0, 52]]);
  });
  it('setas duplas (presetShapeDefinitions; corpus: forma 70 de .doc)', () => {
    expect(pts(presetPathLocal('upDownArrow', 100, 200))).toEqual([[0, 50], [50, 0], [100, 50], [75, 50], [75, 150], [100, 150], [50, 200], [0, 150], [25, 150], [25, 50]]);
    expect(pts(presetPathLocal('leftRightArrow', 200, 100, { adj1: 40000 }))).toEqual([[0, 50], [50, 0], [50, 30], [150, 30], [150, 0], [200, 50], [150, 100], [150, 70], [50, 70], [50, 100]]);
  });
});

describe('degradês (oráculo de gradientes)', () => {
  it('duas paradas nas pontas: curva em S (σ 0,25) em gama 2,2', () => {
    const s = gradientSamples([{ pos: 0, color: '000000' }, { pos: 1, color: 'FFFFFF' }], 257);
    // amostras do Word (função tipo 0): 62 em 1/8, 104 em 1/4, 186 no meio, 238 em 3/4
    expect(Math.abs(s[32 * 3]! - 62)).toBeLessThanOrEqual(1);
    expect(Math.abs(s[64 * 3]! - 104)).toBeLessThanOrEqual(1);
    expect(Math.abs(s[128 * 3]! - 186)).toBeLessThanOrEqual(1);
    expect(Math.abs(s[192 * 3]! - 238)).toBeLessThanOrEqual(1);
  });
  it('três paradas: linear em sRGB; antes/depois das pontas, constante', () => {
    const s = gradientSamples([{ pos: 0.2, color: '000000' }, { pos: 0.5, color: '808080' }, { pos: 0.8, color: 'FFFFFF' }], 11);
    expect(s[0]).toBe(0);
    expect(s[5 * 3]).toBe(128);
    expect(s[10 * 3]).toBe(255);
  });
  it('a:lin 45° scaled num quadro 300×100: eixo covariante (cos·h, sen·w)', () => {
    const g = gradientGeometry({ stops: [], angleDeg: 45, scaled: true }, { x: 100, y: 100, w: 300, h: 100 }, { x0: 100, y0: 100, x1: 400, y1: 200 });
    // PDF do Word: do meio (220, 60) até (280, 240) em coordenadas de cima para baixo
    expect(g.kind).toBe('axial');
    if (g.kind !== 'axial') return;
    expect([g.x0, g.y0, g.x1, g.y1].map((v) => Math.round(v * 10) / 10)).toEqual([220, 60, 280, 240]);
  });
  it('rotWithShape=0: eixo na página, sobre a envoltória do caminho girado', () => {
    const g = gradientGeometry({ stops: [], angleDeg: 0, rotWithShape: false }, { x: 150, y: 150, w: 300, h: 100, rot: 30 }, { x0: 145.1, y0: 0, x1: 454.9, y1: 0 });
    if (g.kind !== 'axial') throw new Error('axial');
    expect([g.x0, g.x1].map((v) => Math.round(v * 10) / 10)).toEqual([145.1, 454.9]);
  });
});

describe('grupo girado (a:grpSpPr rot)', () => {
  it('o centro do filho gira em torno do centro do grupo e a rotação soma', () => {
    const run = { text: '￼', props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false }, shape: { style: { geom: 'rect', rot: 10 }, widthTwips: 100, heightTwips: 50 } };
    const gr = { widthTwips: 1000, heightTwips: 500, rot: 180, items: [{ x: 0, y: 0, w: 100, h: 50, run }] };
    const c = groupChild(gr, gr.items[0]!, 0, 0, 1000, 500);
    expect([c.x, c.y, c.w, c.h].map(Math.round)).toEqual([900, 450, 100, 50]);
    expect(c.run.shape!.style.rot).toBe(190);
  });
});

const ctxStub = { fmt: { theme: { colors: {}, majorFont: {}, minorFont: {} } } } as unknown as DocContext;
const rects = (items: PageItem[]) => items.filter((i): i is Extract<PageItem, { t: 'rect' }> => i.t === 'rect').map((r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 100) / 100));

describe('bordas de página (oráculo pgbdr)', () => {
  const g = { pageW: 11906, pageH: 16838, marL: 1701, marR: 1701, marT: 1417, marB: 1417, hdr: 708, ftr: 708 };
  const side = (sz: number, space: number) => ({ val: 'single', sz, space });
  const all = (sz: number, space: number) => ({ top: side(sz, space), left: side(sz, space), bottom: side(sz, space), right: side(sz, space) });
  it('offsetFrom page: começa a `space` da borda da página, para dentro', () => {
    const r = rects(pageBorderItems(ctxStub, { offsetFrom: 'page', ...all(24, 24) }, g, { header: false, footer: false }));
    // topo: y 24 pt, 3 pt de espessura
    expect(r[0]).toEqual([480, 480, 11906 - 960, 60]);
  });
  it('offsetFrom text: face interna a `space` do texto; contorna o cabeçalho', () => {
    const r = rects(pageBorderItems(ctxStub, all(4, 6), g, { header: false, footer: false }));
    expect(r[0]![1]! + r[0]![3]!).toBe(1417 - 120); // face interna do topo
    const h = rects(pageBorderItems(ctxStub, all(4, 6), g, { header: true, footer: true }));
    expect(h[0]![1]! + h[0]![3]!).toBe(708 - 120);
  });
});

describe('bordas no PDF (oráculo bdrw)', () => {
  it('espessura gravada: w:sz truncado para 1/600"', () => {
    // medido nos PDFs do Word (parágrafo e célula, single/double/thick)
    const got = [2, 4, 6, 8, 12, 18, 24, 36, 48].map((sz) => Math.round(borderPaintWidth({ val: 'single', sz }) * 5) / 100);
    expect(got).toEqual([0.24, 0.48, 0.72, 0.96, 1.44, 2.16, 3, 4.44, 6]);
  });
  it('sólida = retângulo centrado; double = traço, vão, traço; pontilhada = traço', () => {
    const out: PageItem[] = [];
    paintBorder(ctxStub, out, { val: 'single', sz: 6 }, 1000, 2000, 5000, 2000);
    paintBorder(ctxStub, out, { val: 'double', sz: 6 }, 1000, 3000, 1000, 4000);
    paintBorder(ctxStub, out, { val: 'dotted', sz: 6 }, 1000, 5000, 5000, 5000);
    expect(rects(out)).toEqual([[1000, 2000 - 7.2, 4000, 14.4], [1000 - 21.6, 3000, 14.4, 1000], [1000 + 7.2, 3000, 14.4, 1000]]);
    const dot = out.find((i) => i.t === 'line') as Extract<PageItem, { t: 'line' }>;
    // pontilhada de borda: padrão [w w] (sonda de bordas do table-lab)
    expect([dot.dash, Math.round(dot.widthPt * 100) / 100]).toEqual(['bdrDot', 0.72]);
  });
  // sonda de bordas (write/tools/table-lab/gen-border-probe.mjs): faixas do PDF do
  // Word na borda de CIMA, de fora para dentro, w:sz 12 (w = 1,44 pt = 28,8 tw)
  const bands = (val: string, outer: 'top' | 'bottom' = 'top'): [number, number, string][] => {
    const out: PageItem[] = [];
    paintBorder(ctxStub, out, { val, sz: 12, color: '000000' }, 0, 1000, 3000, 1000, outer);
    return out.filter((i): i is Extract<PageItem, { t: 'rect' }> => i.t === 'rect')
      .map((r) => [Math.round(r.y * 10) / 10, Math.round(r.h * 10) / 10, r.fill]);
  };
  it('tripla: três traços de w com vãos de w', () => {
    expect(bands('triple')).toEqual([[928, 28.8, '000000'], [985.6, 28.8, '000000'], [1043.2, 28.8, '000000']]);
  });
  it('fina-grossa SmallGap: grossa (w) por fora, vão e fina de 0,72 pt; embaixo, espelhada', () => {
    const t = bands('thinThickSmallGap');
    expect(t.map((x) => x[1])).toEqual([28.8, 14.4]);
    expect(t[1]![0] - (t[0]![0] + t[0]![1])).toBeCloseTo(14.4, 5);
    expect(bands('thinThickSmallGap', 'bottom').map((x) => x[1])).toEqual([14.4, 28.8]);
  });
  it('LargeGap: grossa de 1,44 pt, vão = w, fina de 0,72 pt', () => {
    const t = bands('thinThickLargeGap');
    expect(t.map((x) => x[1])).toEqual([28.8, 14.4]);
    expect(t[1]![0] - (t[0]![0] + t[0]![1])).toBeCloseTo(28.8, 5);
  });
  it('relevo 3D: clara, média e escura (preto → C0C0C0 / 606060)', () => {
    expect(bands('threeDEmboss').map((x) => [x[1], x[2]])).toEqual([[14.4, 'C0C0C0'], [28.8, '606060'], [14.4, '000000']]);
    expect(bands('threeDEngrave').map((x) => x[2])).toEqual(['000000', '606060', 'C0C0C0']);
  });
});

describe('bordas/sombreamento de parágrafo (oráculo pbdr)', () => {
  it('caixa 29 tw além do texto; borda lateral com face interna a `space` da caixa', () => {
    const out: PageItem[] = [];
    const p = { ppr: { shd: { fill: 'A6A6A6' } } } as unknown as PreparedPara;
    const b = { val: 'single', sz: 24, space: 4 };
    paintParaBox(ctxStub, out, p, { top: b, left: b, bottom: b, right: b }, 1701, 10205, 1000, 1500, true, true);
    const fill = out[0] as Extract<PageItem, { t: 'rect' }>;
    expect(fill.x).toBe(1701 - 29 - 80);
    expect(fill.x + fill.w).toBe(10205 + 29 + 80);
    // bordas sólidas = retângulos (como no PDF do Word), 3 pt = 25/600" = 60 tw
    const left = out.find((i) => i.t === 'rect' && i.h > i.w && i.x < 1701) as Extract<PageItem, { t: 'rect' }>;
    expect([left.x, left.w]).toEqual([1701 - 29 - 80 - 60, 60]); // face interna a `space` da caixa
    const top = out.find((i) => i.t === 'rect' && i.w > i.h && i.y < 1100 && i.fill === '000000') as Extract<PageItem, { t: 'rect' }>;
    expect([top.y, top.h]).toEqual([1000, 60]); // faixa a partir do topo da caixa
  });
});

describe('EMF+ só com imagem', () => {
  it('Object(Image, bitmap ARGB) + DrawImage → item de imagem no quadro', () => {
    // EMF mínimo: cabeçalho (frame 0..2 px) + comentário EMF+ (Header, Object, DrawImage, EOF) + EOF
    const rec = (type: number, flags: number, data: number[]) => {
      const b = new DataView(new ArrayBuffer(12 + data.length));
      b.setUint16(0, type, true); b.setUint16(2, flags, true); b.setUint32(4, 12 + data.length, true); b.setUint32(8, data.length, true);
      const u = new Uint8Array(b.buffer); u.set(data, 12); return Array.from(u);
    };
    const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
    const f32 = (n: number) => Array.from(new Uint8Array(new Float32Array([n]).buffer));
    const bmp = [...le32(0xdbc01002), ...le32(1), ...le32(2), ...le32(1), ...le32(8), ...le32(0x0026200a), ...le32(0), 0, 0, 255, 255, 255, 0, 0, 255];
    const plus = [
      ...rec(0x4001, 0, [...le32(0xdbc01002), ...le32(1), ...le32(96), ...le32(96)]),
      ...rec(0x4008, 0x0500, bmp),
      ...rec(0x401a, 0, [...le32(0), ...le32(2), ...f32(0), ...f32(0), ...f32(2), ...f32(1), ...f32(0), ...f32(0), ...f32(2), ...f32(1)]),
      ...rec(0x4002, 0, []),
    ];
    const comment = [...le32(70), ...le32(12 + 4 + plus.length), ...le32(4 + plus.length), ...le32(0x2b464d45), ...plus];
    const hdr = new Uint8Array(88);
    const hv = new DataView(hdr.buffer);
    hv.setUint32(0, 1, true); hv.setUint32(4, 88, true);
    // frame (0,01 mm) para 2×1 px num dispositivo de 100 px/mm*100 → 1 px = 1 unidade
    hv.setInt32(24, 0, true); hv.setInt32(28, 0, true); hv.setInt32(32, 2, true); hv.setInt32(36, 1, true);
    hdr.set([0x20, 0x45, 0x4d, 0x46], 40);
    hv.setInt32(72, 100, true); hv.setInt32(76, 100, true); hv.setInt32(80, 1, true); hv.setInt32(84, 1, true);
    const eof = [...le32(14), ...le32(20), ...le32(0), ...le32(0), ...le32(20)];
    const bytes = new Uint8Array([...hdr, ...comment, ...eof]);
    const items = renderEmf({} as DocContext, bytes, { x: 1000, y: 2000, w: 400, h: 200 });
    const img = items.find((i) => i.t === 'image') as Extract<PageItem, { t: 'image' }>;
    expect(img).toBeDefined();
    expect([img.x, img.y, img.w, img.h]).toEqual([1000, 2000, 400, 200]);
    expect(img.image.ext).toBe('bmp');
  });
});

describe('EMF: BITBLT sem bitmap de origem (oráculo emfpat)', async () => {
  // @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
  const { emfOf } = await import('../../../tools/layout-oracle/cases/emfpat.mjs');
  /** o EMF do oráculo sem o registro de texto (o teste não carrega fontes) → cores dos retângulos */
  const fills = (rop: number, stock?: number) => {
    const b: Uint8Array = emfOf(rop, stock);
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const parts: Uint8Array[] = [];
    for (let pos = 0; pos < b.length; pos += dv.getUint32(pos + 4, true)) if (dv.getUint32(pos, true) !== 84) parts.push(b.subarray(pos, pos + dv.getUint32(pos + 4, true)));
    const bytes = new Uint8Array(parts.reduce((a, x) => a + x.length, 0));
    parts.reduce((o, x) => (bytes.set(x, o), o + x.length), 0);
    return renderEmf({} as DocContext, bytes, { x: 0, y: 0, w: 1000, h: 400 }).flatMap((i) => (i.t === 'rect' ? [i.fill] : []));
  };
  const PAINT = [0x00f00021, 0x00000042, 0x00ff0062]; // PATCOPY, BLACKNESS, WHITENESS
  it('PATCOPY, BLACKNESS e WHITENESS pintam com o pincel atual (branco padrão ou preto)', () => {
    expect(PAINT.map((rop) => fills(rop))).toEqual([['FFFFFF'], ['FFFFFF'], ['FFFFFF']]);
    expect(PAINT.map((rop) => fills(rop, 4))).toEqual([['000000'], ['000000'], ['000000']]);
  });
  it('D puro, PATINVERT, DSTINVERT e NOTPATCOPY não mudam nada', () => {
    expect([0x00aa0029, 0x005a0049, 0x00550009, 0x000f0001].map((rop) => fills(rop, 4))).toEqual([[], [], [], []]);
  });
});

describe('leitura do modelo (docx-core)', async () => {
  const { DocxPackage, readFullDocument } = await import('@universal-office/docx-core');
  // @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
  const { buildDocx, p } = await import('../../../tools/layout-oracle/docx-builder.mjs');
  // @ts-expect-error idem
  const { solidPng } = await import('../../../tools/layout-oracle/png.mjs');
  const media = { 'image1.png': solidPng(4, 4, [10, 20, 30]) };
  const pic = (blipKids: string) => `<w:r><w:drawing><wp:inline><wp:extent cx="127000" cy="127000"/><wp:docPr id="1" name="p"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="p"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1">${blipKids}</a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const vml = '<w:r><w:pict><v:shape type="#_x0000_t75" style="width:20pt;height:20pt"><v:imagedata r:id="rIdImg1" gain="19661f" blacklevel="22938f" grayscale="t"/></v:shape></w:pict></w:r>';
  const wsp = '<w:r><w:drawing><wp:inline><wp:extent cx="127000" cy="254000"/><wp:docPr id="2" name="t"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:spPr><a:xfrm rot="5400000"><a:off x="0" y="0"/><a:ext cx="127000" cy="254000"/></a:xfrm><a:prstGeom prst="triangle"><a:avLst><a:gd name="adj" fmla="val 0"/></a:avLst></a:prstGeom><a:gradFill rotWithShape="0"><a:gsLst><a:gs pos="0"><a:srgbClr val="000000"/></a:gs><a:gs pos="100000"><a:schemeClr val="accent1"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="1"/></a:gradFill><a:effectLst><a:outerShdw dist="28398" dir="5400000"><a:srgbClr val="243F60"><a:alpha val="50000"/></a:srgbClr></a:outerShdw></a:effectLst></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  const docx = buildDocx({ body: p(pic('<a:lum bright="70000" contrast="-70000"/>')) + p(vml) + p(wsp), media });
  const full = readFullDocument(DocxPackage.load(docx));
  const runs = full.blocks.flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : []));
  it('a:lum → gain 1 + c, bright, truncado', () => {
    const fx = runs.find((r) => r.image && !r.image.vml)!.image!.effects!;
    expect(fx.gain).toBeCloseTo(0.3);
    expect(fx.bright).toBeCloseTo(0.7);
    expect(fx.floor).toBe(true);
  });
  it('v:imagedata gain/blacklevel/grayscale', () => {
    const fx = runs.find((r) => r.image?.vml)!.image!.effects!;
    expect(fx.gain).toBeCloseTo(19661 / 65536);
    expect(fx.bright).toBeCloseTo((2 * 22938) / 65536);
    expect(fx.gray).toBe(true);
  });
  it('wps: ajustes, degradê completo, sombra e cor de tema sem caixa alta', () => {
    const st = runs.find((r) => r.shape)!.shape!.style;
    expect(st.adj).toEqual({ adj: 0 });
    expect(st.rot).toBe(90);
    expect(st.gradient!.stops).toEqual([{ pos: 0, color: '000000' }, { pos: 1, color: '@accent1' }]);
    expect(st.gradient!.scaled).toBe(true);
    expect(st.gradient!.rotWithShape).toBe(false);
    expect(st.shadow!.dy).toBeCloseTo(28398 / 635);
    expect(st.shadow!.alpha).toBeCloseTo(0.5);
  });
});

describe('a:custGeom (oráculo cust)', async () => {
  const { DocxPackage, readFullDocument } = await import('@universal-office/docx-core');
  // @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
  const { buildDocx, p } = await import('../../../tools/layout-oracle/docx-builder.mjs');
  const { custPaths } = await import('../src/geometry.js');
  const sq = (a: number, b: number) => `<a:moveTo><a:pt x="${a}" y="${a}"/></a:moveTo><a:lnTo><a:pt x="${b}" y="${a}"/></a:lnTo><a:lnTo><a:pt x="${b}" y="${b}"/></a:lnTo><a:lnTo><a:pt x="${a}" y="${b}"/></a:lnTo><a:close/>`;
  const cg = `<a:custGeom><a:avLst/><a:gdLst><a:gd name="T0" fmla="*/ 50 w 100"/></a:gdLst><a:pathLst><a:path w="100" h="100">${sq(0, 100)}${sq(25, 75)}</a:path><a:path fill="none"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="T0" y="h"/></a:lnTo></a:path></a:pathLst></a:custGeom>`;
  const wsp = `<w:r><w:drawing><wp:inline><wp:extent cx="254000" cy="127000"/><wp:docPr id="3" name="c"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="254000" cy="127000"/></a:xfrm>${cg}<a:solidFill><a:srgbClr val="1F3864"/></a:solidFill></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const full = readFullDocument(DocxPackage.load(buildDocx({ body: p(wsp) })));
  const st = full.blocks.flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : [])).find((r) => r.shape)!.shape!.style;
  it('guias avaliadas sobre a forma em EMU; caminho sem w/h no espaço da forma', () => {
    expect(st.geom).toBe('custom');
    expect(st.cust).toHaveLength(2);
    expect(st.cust![1]!.fill).toBe(false);
    expect(st.cust![1]!.w).toBe(254000);
    expect(st.cust![1]!.cmds[1]).toEqual({ op: 'L', x: 127000, y: 127000 });
  });
  it('escala do espaço do caminho para o quadro', () => {
    const parts = custPaths(st.cust!, 1000, 2000, 400, 200);
    const m = parts[0]!.cmds[5] as { x: number; y: number };
    expect([m.x, m.y]).toEqual([1100, 2050]); // (25,25) de 100×100 → 400×200
    expect(parts[1]!.cmds[1]).toEqual({ op: 'L', x: 1200, y: 2200 });
  });
});

describe('sombreamento com padrão (w:shd) — sonda gen-shading-probe', () => {
  const theme = { colors: {}, fonts: { major: {}, minor: {} } } as unknown as Parameters<typeof shadingFill>[1];
  it('percentuais: mistura exata (12/37/62/87 = 12,5%…) como o PDF do Word', () => {
    const got = (val: string, color: string, fill: string): string | undefined => shadingFill({ val, color, fill }, theme);
    expect(got('pct5', '000000', 'FFFFFF')).toBe('F2F2F2');
    expect(got('pct12', '000000', 'FFFFFF')).toBe('DFDFDF');
    expect(got('pct37', '000000', 'FFFFFF')).toBe('9F9F9F');
    expect(got('pct62', '000000', 'FFFFFF')).toBe('606060');
    expect(got('pct87', '000000', 'FFFFFF')).toBe('202020');
    expect(got('pct5', 'C00000', 'FFFF00')).toBe('FCF200');
    expect(got('pct95', 'C00000', 'FFFF00')).toBe('C30D00');
  });
  it('listras: a cobertura do ladrilho 8×8 (fino demais para se ver)', () => {
    expect(shadingFill({ val: 'vertStripe', color: '000000', fill: 'FFFFFF' }, theme)).toBe('808080');
    expect(shadingFill({ val: 'thinVertStripe', color: '000000', fill: 'FFFFFF' }, theme)).toBe('BFBFBF');
    expect(shadingFill({ val: 'diagCross', color: '000000', fill: 'FFFFFF' }, theme)).toBe('404040');
  });
  it('sólido, limpo e nil', () => {
    expect(shadingFill({ val: 'solid', color: 'C00000', fill: 'FFFF00' }, theme)).toBe('C00000');
    expect(shadingFill({ val: 'clear', color: 'auto', fill: 'FFFF00' }, theme)).toBe('FFFF00');
    expect(shadingFill({ val: 'nil', fill: 'FFFF00' }, theme)).toBeUndefined();
  });
});
