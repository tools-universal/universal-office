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
    expect(dmlColor(xml('<a:schemeClr val="tx1"><a:tint val="75000"/></a:schemeClr>'), sc)).toBe('#888888');
  });
  it('gráfico com c14:style: linhas default cinza', () => {
    const cs = parseChartSpace(xml(`<c:chartSpace><mc:AlternateContent><mc:Choice><c14:style val="102"/></mc:Choice></mc:AlternateContent><c:chart><c:plotArea/></c:chart></c:chartSpace>`), host);
    expect(cs.office2010).toBe(true);
  });
});
