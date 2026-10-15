import { describe, expect, it } from 'vitest';
import { autoScale, tickValues } from './scale.js';
import { chartShadeTint } from './color.js';
import { parseChartSpace } from './parse.js';
import { paintChartSpace } from './render.js';
import type { XmlNode } from './xml.js';

/**
 * Regras medidas no oráculo (PowerPoint 365 pt-BR exportando PNG de gráficos
 * sintéticos: E:\UniversalSlidesTest\_lab\syn, fora do git).
 */

// parser XML mínimo (o motor recebe a árvore do hospedeiro)
function xml(src: string): XmlNode {
  let i = 0;
  const node = (): XmlNode => {
    const m = /^<([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/.exec(src.slice(i))!;
    i += m[0].length;
    const attrs: Record<string, string> = {};
    for (const a of m[2]!.matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs[a[1]!] = a[2]!;
    const el: XmlNode = { name: m[1]!, attrs, children: [] };
    if (m[3]) return el;
    for (;;) {
      if (src.startsWith('</', i)) { i = src.indexOf('>', i) + 1; return el; }
      if (src[i] === '<') el.children.push(node());
      else { const j = src.indexOf('<', i); el.children.push(src.slice(i, j)); i = j; }
    }
  };
  return node();
}

const host = {
  color: (el: XmlNode) => {
    if (el.name === 'a:srgbClr') return '#' + el.attrs['val'];
    const T: Record<string, string> = { accent1: '#156082', accent2: '#E97132', accent3: '#196B24', accent4: '#0F9ED5', accent5: '#A02B93', accent6: '#4EA72E', tx1: '#000000', bg1: '#FFFFFF' };
    return T[el.attrs['val'] ?? ''] ?? '#000000';
  },
  fonts: { minor: 'Aptos' },
};

const cache = (v: (number | string)[], str = false) => `<c:${str ? 'str' : 'num'}Cache><c:ptCount val="${v.length}"/>${v.map((x, i) => `<c:pt idx="${i}"><c:v>${x}</c:v></c:pt>`).join('')}</c:${str ? 'str' : 'num'}Cache>`;
const ser = (i: number, v: number[], extra = '') => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>S${i + 1}</c:v></c:tx>${extra}<c:cat><c:strRef>${cache(['A', 'B', 'C', 'D'], true)}</c:strRef></c:cat><c:val><c:numRef>${cache(v)}</c:numRef></c:val></c:ser>`;
const AX = '<c:catAx><c:axId val="1"/><c:axPos val="b"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:axPos val="l"/><c:majorGridlines/><c:crossAx val="1"/></c:valAx>';
const space = (plot: string, extra = '') => xml(`<c:chartSpace><c:chart><c:plotArea>${plot}${AX}</c:plotArea>${extra}</c:chart></c:chartSpace>`);

/** Contexto que só registra texto. */
function rec(): CanvasRenderingContext2D & { texts: string[] } {
  const texts: string[] = [];
  const t: Record<string, unknown> = { texts, measureText: (s: string) => ({ width: s.length * 7 }) };
  return new Proxy(t, {
    get(o, k: string) { if (k in o) return o[k]; return (...a: unknown[]) => { if (k === 'fillText') texts.push(String(a[0])); }; },
    set(o, k: string, v) { o[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D & { texts: string[] };
}

describe('escala automática (Office)', () => {
  it('zero no eixo, 5% de folga, menor passo {1,2,5} com ≤ 10 divisões', () => {
    expect(autoScale(1.8, 5, 10, {})).toMatchObject({ lo: 0, hi: 6, major: 1 });
    expect(autoScale(2.5, 4.5, 10, {})).toMatchObject({ lo: 0, hi: 5, major: 0.5 });
    expect(autoScale(0.18, 0.5, 10, {})).toMatchObject({ lo: 0, hi: 0.6 });
  });
  it('dados longe do zero (min > 5/6·max) tiram o zero', () => {
    const s = autoScale(100, 110, 10, {});
    expect(s.lo).toBeGreaterThan(0);
  });
  it('unidade absurda não gera milhões de marcas', () => {
    expect(tickValues(autoScale(0, 3000, 10, { min: 0, max: 3000, major: 1e-6 })).length).toBeLessThan(20);
  });
});

describe('cores automáticas', () => {
  it('sombra/tinta em RGB linear (monocromático n=4 do estilo 3)', () => {
    expect(chartShadeTint('#156082', -0.3)).toBe('#0E4965');
    expect(chartShadeTint('#156082', 0.3)).toBe('#AFBAC4');
  });
  it('7ª série em diante (estilo 2): accent mais claro; 1ª volta mais escura', () => {
    const cs = parseChartSpace(space(`<c:barChart><c:barDir val="col"/>${[...Array(8).keys()].map((i) => ser(i, [1, 2, 3, 4])).join('')}<c:axId val="1"/><c:axId val="2"/></c:barChart>`), host);
    expect(cs.groups[0]!.series.length).toBe(8);
  });
});

describe('parse', () => {
  it('estilo do mc:AlternateContent (c14:style 102 → 2), eixos ligados, linha suave por padrão', () => {
    const cs = parseChartSpace(xml(`<c:chartSpace><mc:AlternateContent><mc:Choice><c14:style val="118"/></mc:Choice></mc:AlternateContent><c:chart><c:plotArea><c:lineChart>${ser(0, [1, 2, 3, 4])}<c:axId val="1"/><c:axId val="2"/></c:lineChart>${AX}</c:plotArea></c:chart></c:chartSpace>`), host);
    expect(cs.style).toBe(18);
    expect(cs.groups[0]!.series[0]!.smooth).toBeUndefined();
    expect(cs.axes.map((a) => a.kind)).toEqual(['cat', 'val']);
  });
  it('grupo sem eixos ganha o par default', () => {
    const cs = parseChartSpace(xml(`<c:chartSpace><c:chart><c:plotArea><c:barChart>${ser(0, [1, 2])}</c:barChart></c:plotArea></c:chart></c:chartSpace>`), host);
    expect(cs.groups[0]!.axIds.length).toBe(2);
  });
});

describe('pintura', () => {
  it('título rico vazio não vira "Título do Gráfico"; ausência de tx vira o nome da série única', () => {
    const auto = rec();
    const withTitle = xml(`<c:chartSpace><c:chart><c:title><c:overlay val="0"/></c:title><c:plotArea><c:barChart>${ser(0, [1, 2, 3, 4])}<c:axId val="1"/><c:axId val="2"/></c:barChart>${AX}</c:plotArea></c:chart></c:chartSpace>`);
    paintChartSpace(auto, parseChartSpace(withTitle, host), 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(auto.texts).toContain('S1');
    const blank = rec();
    const blankTitle = xml(`<c:chartSpace><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr/></a:p></c:rich></c:tx></c:title><c:plotArea><c:barChart>${ser(0, [1, 2, 3, 4])}<c:axId val="1"/><c:axId val="2"/></c:barChart>${AX}</c:plotArea></c:chart></c:chartSpace>`);
    paintChartSpace(blank, parseChartSpace(blankTitle, host), 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(blank.texts).not.toContain('Título do Gráfico');
  });
  it('rótulos de dados: valor no formato pt-BR, separador "; "', () => {
    const c = rec();
    const dl = '<c:dLbls><c:showVal val="1"/><c:showCatName val="1"/></c:dLbls>';
    paintChartSpace(c, parseChartSpace(space(`<c:barChart>${ser(0, [4.3, 2, 3, 4], dl)}<c:axId val="1"/><c:axId val="2"/></c:barChart>`), host), 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(c.texts).toContain('A; 4,3');
  });
  it('100% empilhado: eixo fixo em 0%..100%', () => {
    const c = rec();
    paintChartSpace(c, parseChartSpace(space(`<c:barChart><c:barDir val="col"/><c:grouping val="percentStacked"/>${ser(0, [1, 2, 3, 4])}${ser(1, [4, 3, 2, 1])}<c:axId val="1"/><c:axId val="2"/></c:barChart>`), host), 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(c.texts).toContain('100%');
    expect(c.texts).not.toContain('120%');
  });
});

describe('cor DrawingML (hospedeiro sem resolvedor: Sheet)', () => {
  it('schemeClr com lumMod/lumOff em HSL e tint em RGB linear', async () => {
    const { dmlColor } = await import('./dml-color.js');
    const sc = { dk1: '#000000', lt1: '#FFFFFF', accent1: '#156082' };
    expect(dmlColor(xml('<a:schemeClr val="tx1"><a:lumMod val="65000"/><a:lumOff val="35000"/></a:schemeClr>'), sc)).toBe('#595959');
    // linhas default do Office 2010+: tx1 tint 75% (medido #898989)
    expect(dmlColor(xml('<a:schemeClr val="tx1"><a:tint val="75000"/></a:schemeClr>'), sc)).toBe('#898989');
  });
  it('gráfico com c14:style: linhas default cinza', () => {
    const cs = parseChartSpace(xml(`<c:chartSpace><mc:AlternateContent><mc:Choice><c14:style val="102"/></mc:Choice></mc:AlternateContent><c:chart><c:plotArea/></c:chart></c:chartSpace>`), host);
    expect(cs.office2010).toBe(true);
  });
});

describe('quem gravou o arquivo (ChartHost.fileFormat)', () => {
  const doc = (inner: string, plot: string, ax = AX) => xml(`<c:chartSpace>${inner}<c:chart><c:plotArea>${plot}${ax}</c:plotArea></c:chart></c:chartSpace>`);
  const bar = (body: string, extra = '') => `<c:barChart><c:barDir val="col"/>${extra}${body}<c:axId val="1"/><c:axId val="2"/></c:barChart>`;
  it('Office 2007: <c:x/> sem val = falso; tiques ausentes = out/none; cantos retos; linha reta; título automático', () => {
    const h = { ...host, fileFormat: 'mso2007' as const };
    const cs = parseChartSpace(doc('', bar(ser(0, [1, -2, 3, 4], '<c:invertIfNegative/>'), '<c:varyColors/>')), h);
    expect(cs.groups[0]!.varyColors).toBe(false);
    expect(cs.groups[0]!.series[0]!.invertIfNegative).toBe(false);
    expect(cs.axes.map((a) => [a.majorTick, a.minorTick])).toEqual([['out', 'none'], ['out', 'none']]);
    expect(cs.roundedCorners).toBe(false);
    expect(cs.office2010).toBe(true); // linhas default cinza
    expect(cs.title).toBeDefined(); // série única sem <c:title>
    const ln = parseChartSpace(doc('', `<c:lineChart>${ser(0, [1, 2])}<c:axId val="1"/><c:axId val="2"/></c:lineChart>`), h);
    expect(ln.groups[0]!.series[0]!.smooth).toBe(false);
    expect(ln.groups[0]!.showMarker).toBe(true);
  });
  it('2010+: eixo sem <c:delete> some; grupo sem varyColors varia; dLbls sem show* mostram', () => {
    const h = { ...host, fileFormat: 'modern' as const };
    const cs = parseChartSpace(doc('', bar(ser(0, [1, 2], '<c:dLbls><c:showVal val="1"/></c:dLbls>'))), h);
    expect(cs.axes.every((a) => a.deleted)).toBe(true);
    expect(cs.groups[0]!.varyColors).toBe(true);
    expect(cs.groups[0]!.series[0]!.dLbls).toMatchObject({ showVal: true, showCat: true, showSer: true });
    expect(cs.roundedCorners).toBe(true);
    expect(cs.title).toBeUndefined();
  });
  it('2010+: barras sem <c:invertIfNegative> invertem as negativas', () => {
    const cs = parseChartSpace(doc('', bar(ser(0, [1, -2]))), { ...host, fileFormat: 'modern' as const });
    expect(cs.groups[0]!.series[0]!.invertIfNegative).toBe(true);
  });
  it('hospedeiro sem fileFormat (Sheet): comportamento anterior', () => {
    const cs = parseChartSpace(doc('', bar(ser(0, [1, 2]), '<c:varyColors/>')), host);
    expect(cs.groups[0]!.varyColors).toBe(true);
    expect(cs.axes.some((a) => a.deleted)).toBe(false);
    expect(cs.axes[0]!.majorTick).toBe('cross');
  });
  it('formato do ponto (c:pt formatCode) no rótulo de dados', () => {
    const c = rec();
    const pts = '<c:val><c:numRef><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0" formatCode="0%"><c:v>0.29</c:v></c:pt><c:pt idx="1"><c:v>0.5</c:v></c:pt></c:numCache></c:numRef></c:val>';
    const s = `<c:ser><c:idx val="0"/><c:order val="0"/><c:dLbls><c:showVal val="1"/></c:dLbls>${pts}</c:ser>`;
    paintChartSpace(c, parseChartSpace(space(bar(s)), host), 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(c.texts).toContain('29%');
    expect(c.texts).toContain('0,5');
  });
});

describe('3D, tabela de dados e título', () => {
  it('view3D: ausentes ficam para a pintura; gapDepth e hPercent lidos', () => {
    const cs = parseChartSpace(xml(`<c:chartSpace><c:chart><c:view3D><c:rotX val="30"/><c:hPercent val="50"/><c:rAngAx val="0"/></c:view3D><c:plotArea><c:bar3DChart><c:barDir val="col"/>${ser(0, [1, 2])}<c:gapDepth val="300"/><c:axId val="1"/><c:axId val="2"/></c:bar3DChart>${AX}</c:plotArea></c:chart></c:chartSpace>`), host);
    expect(cs.view3D).toMatchObject({ rotX: 30, hPercent: 50, rAngAx: false });
    expect(cs.view3D!.rotY).toBeUndefined();
    expect(cs.groups[0]!.gapDepth).toBe(300);
  });
  it('tabela de dados: cabeçalho com as categorias e valores no formato da série', () => {
    const c = rec();
    const dt = '<c:dTable><c:showHorzBorder val="1"/><c:showVertBorder val="1"/><c:showOutline val="1"/><c:showKeys val="1"/></c:dTable>';
    const cs = parseChartSpace(space(`<c:lineChart>${ser(0, [1.5, 2, 3, 4])}<c:axId val="1"/><c:axId val="2"/></c:lineChart>${dt}`), host);
    expect(cs.dTable).toMatchObject({ horz: true, vert: true, outline: true, keys: true });
    paintChartSpace(c, cs, 0, 0, 600, 400, { pxPerPt: 1.333 });
    expect(c.texts).toContain('S1');
    expect(c.texts).toContain('1,5');
    expect(c.texts).toContain('A');
  });
  it('título rico sem a:defRPr: 18,62 pt regular; com defRPr vazio: tamanho base negrito', () => {
    const mk = (p: string) => xml(`<c:chartSpace><c:chart><c:title><c:tx><c:rich><a:bodyPr/>${p}</c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:barChart>${ser(0, [1, 2])}<c:axId val="1"/><c:axId val="2"/></c:barChart>${AX}</c:plotArea></c:chart></c:chartSpace>`);
    const fonts: string[] = [];
    const c = rec();
    const ctx = new Proxy(c, { set(o, k, v) { if (k === 'font') fonts.push(String(v)); (o as unknown as Record<string, unknown>)[k as string] = v; return true; } });
    paintChartSpace(ctx, parseChartSpace(mk('<a:p><a:r><a:t>T</a:t></a:r></a:p>'), host), 0, 0, 600, 400, { pxPerPt: 1 });
    expect(fonts.some((f) => /^18\.62px/.test(f))).toBe(true);
    const cs2 = parseChartSpace(mk('<a:p><a:pPr><a:defRPr/></a:pPr><a:r><a:t>T</a:t></a:r></a:p>'), host);
    expect(cs2.title!.paras![0]!.noDefRPr).toBeUndefined();
  });
});

describe('preenchimento de imagem (a:blipFill)', () => {
  const area = (fill: string) => xml(`<c:chartSpace><c:chart><c:plotArea/></c:chart><c:spPr>${fill}</c:spPr></c:chartSpace>`);
  const blipHost = { ...host, blip: (el: XmlNode) => (el.attrs['r:embed'] === 'rId3' ? 'ppt/media/image1.jpeg' : undefined) };
  it('a imagem chega pela chave do hospedeiro; ladrilho (tx/ty em pt) ou esticada (fillRect)', () => {
    const tile = parseChartSpace(area('<a:blipFill><a:blip r:embed="rId3"/><a:tile tx="12700" ty="0" sx="50000" sy="100000" flip="xy" algn="ctr"/></a:blipFill>'), blipHost);
    expect(tile.sp.fill).toEqual({ kind: 'blip', ref: 'ppt/media/image1.jpeg', tile: { sx: 0.5, sy: 1, tx: 1, ty: 0, algn: 'ctr', flip: 'xy' } });
    const st = parseChartSpace(area('<a:blipFill><a:blip r:embed="rId3"><a:alphaModFix amt="50000"/></a:blip><a:stretch><a:fillRect l="10000"/></a:stretch></a:blipFill>'), blipHost);
    expect(st.sp.fill).toEqual({ kind: 'blip', ref: 'ppt/media/image1.jpeg', alpha: 0.5, fillRect: { l: 0.1, t: 0, r: 0, b: 0 } });
    // sem a:stretch nem a:tile: ladrilho no tamanho natural
    expect(parseChartSpace(area('<a:blipFill><a:blip r:embed="rId3"/></a:blipFill>'), blipHost).sp.fill).toMatchObject({ tile: { sx: 1, sy: 1, algn: 'tl' } });
  });
  it('hospedeiro sem imagens (ou rel desconhecido): ignora o preenchimento', () => {
    expect(parseChartSpace(area('<a:blipFill><a:blip r:embed="rId3"/><a:stretch/></a:blipFill>'), host).sp.fill).toBeUndefined();
    expect(parseChartSpace(area('<a:blipFill><a:blip r:embed="rId9"/><a:stretch/></a:blipFill>'), blipHost).sp.fill).toBeUndefined();
  });
  it('ladrilho: reduzido em pixels inteiros, ampliado fracionário, alinhado pelo algn', async () => {
    const { tilePattern } = await import('./image.js');
    const g = globalThis as { DOMMatrix?: unknown };
    const had = g.DOMMatrix;
    g.DOMMatrix = class { constructor(public m: number[]) {} };
    try {
      const ctx = {
        createPattern: () => ({ setTransform(this: { M?: number[] }, d: { m: number[] }) { this.M = d.m; } }),
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }),
      } as unknown as CanvasRenderingContext2D;
      const box = { x: 10, y: 20, w: 300, h: 200 };
      const down = tilePattern(ctx, {} as CanvasImageSource, 60, 40, 50.4, 33.6, { sx: 1, sy: 1, tx: 0, ty: 0 }, box) as unknown as { M: number[] };
      expect(down.M[0]).toBeCloseTo(50 / 60, 6);
      expect(down.M[3]).toBeCloseTo(34 / 40, 6);
      const up = tilePattern(ctx, {} as CanvasImageSource, 60, 40, 75.48, 50.32, { sx: 1, sy: 1, tx: 0, ty: 0, algn: 'ctr' }, box) as unknown as { M: number[] };
      expect(up.M[0]).toBeCloseTo(75.48 / 60, 6);
      expect(up.M[4]).toBeCloseTo(10 + (300 - 75.48) / 2, 6);
    } finally { g.DOMMatrix = had; }
  });
  it('resolução gravada no arquivo: PNG pHYs, JPEG JFIF; sem ela, undefined', async () => {
    const { imageDpi } = await import('./image.js');
    const png = (phys?: number[]): Uint8Array => new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 60, 0, 0, 0, 40, 8, 6, 0, 0, 0, 0, 0, 0, 0,
      ...(phys ? [0, 0, 0, 9, 0x70, 0x48, 0x59, 0x73, ...phys, 0, 0, 0, 0] : []),
      0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
    ]);
    // 5669 px/m = 144 dpi
    expect(imageDpi(png([0, 0, 0x16, 0x25, 0, 0, 0x16, 0x25, 1]))!.x).toBeCloseTo(144, 0);
    expect(imageDpi(png())).toBeUndefined();
    // JFIF APP0 com densidade 75×75 dpi
    const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, 0, 75, 0, 75, 0, 0, 0xff, 0xda, 0, 2]);
    expect(imageDpi(jfif)).toEqual({ x: 75, y: 75 });
  });
});

describe('desenho do gráfico (c:userShapes) e regras do Excel', () => {
  const NS = 'xmlns:c="c" xmlns:a="a"';
  const cs = (extra: object) => parseChartSpace(xml('<c:chartSpace ' + NS + '><c:chart><c:plotArea/></c:chart></c:chartSpace>'), { ...host, ...extra });
  it('caixa de texto em frações; grupo achatado na caixa da âncora; abs em pt', () => {
    const us = xml('<c:userShapes><cdr:relSizeAnchor><cdr:from><cdr:x>0</cdr:x><cdr:y>0.9</cdr:y></cdr:from><cdr:to><cdr:x>1</cdr:x><cdr:y>1</cdr:y></cdr:to>'
      + '<cdr:sp><cdr:nvSpPr><cdr:cNvPr id="2" name="T"/></cdr:nvSpPr><cdr:spPr><a:prstGeom prst="rect"/></cdr:spPr><cdr:txBody><a:bodyPr anchor="ctr" lIns="0"/><a:p><a:pPr algn="r"/><a:r><a:rPr sz="900" i="1"/><a:t>Fonte: X</a:t></a:r></a:p></cdr:txBody></cdr:sp></cdr:relSizeAnchor>'
      + '<cdr:relSizeAnchor><cdr:from><cdr:x>0.5</cdr:x><cdr:y>0</cdr:y></cdr:from><cdr:to><cdr:x>1</cdr:x><cdr:y>0.5</cdr:y></cdr:to><cdr:grpSp><cdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/><a:chOff x="0" y="0"/><a:chExt cx="100" cy="100"/></a:xfrm></cdr:grpSpPr>'
      + '<cdr:sp><cdr:spPr><a:xfrm><a:off x="50" y="0"/><a:ext cx="50" cy="25"/></a:xfrm><a:prstGeom prst="ellipse"/><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></cdr:spPr></cdr:sp></cdr:grpSp></cdr:relSizeAnchor>'
      + '<cdr:absSizeAnchor><cdr:from><cdr:x>0.1</cdr:x><cdr:y>0.1</cdr:y></cdr:from><cdr:ext cx="127000" cy="254000"/><cdr:cxnSp><cdr:spPr><a:prstGeom prst="straightConnector1"/></cdr:spPr></cdr:cxnSp></cdr:absSizeAnchor></c:userShapes>');
    const u = cs({ userShapes: us }).userShapes!;
    expect(u).toHaveLength(3);
    expect(u[0]).toMatchObject({ x: 0, y: 0.9, w: 1, geom: 'rect', text: { anchor: 'ctr', ins: { l: 0, t: 3.6 } } });
    expect(u[0]!.h).toBeCloseTo(0.1, 9);
    expect(u[0]!.text!.paras[0]).toMatchObject({ align: 'r', runs: [{ text: 'Fonte: X', props: { sz: 9, i: true } }] });
    expect(u[1]).toMatchObject({ x: 0.5, y: 0, w: 0.5, h: 0.5, geom: 'ellipse', sub: { x: 0.5, y: 0, w: 0.5, h: 0.25 }, sp: { fill: { kind: 'solid', color: '#FF0000' } } });
    expect(u[2]).toMatchObject({ abs: true, w: 10, h: 20, geom: 'straightConnector1' });
  });
  it('larguras do tema chegam ao modelo (linha de série do Excel = k × a 1ª)', () => {
    expect(cs({ themeLineWidths: [0.5, 1, 1.5] }).themeLn).toEqual([0.5, 1, 1.5]);
    expect(cs({}).themeLn).toBeUndefined();
  });
});
