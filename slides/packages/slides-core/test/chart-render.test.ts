import { describe, expect, it } from 'vitest';
import { parseChart, paintChart } from '../src/chart-engine.js';
import { paintSlideTo } from '../src/render.js';
import type { Slide } from '../src/model.js';

/** Contexto 2D que só REGISTRA as chamadas (sem canvas no Node). `arc`/`ellipse` lançam com raio < 0, como no navegador. */
function recCtx(): CanvasRenderingContext2D & { calls: { op: string; args: unknown[] }[]; depth: number } {
  const calls: { op: string; args: unknown[] }[] = [];
  const state = { depth: 0 };
  const ctx: Record<string, unknown> = {
    calls,
    get depth() { return state.depth; },
    canvas: { width: 1280, height: 720 },
    measureText: (t: string) => ({ width: t.length * 6 }),
    save: () => { state.depth++; },
    restore: () => { state.depth--; },
    getTransform: () => ({}),
    arc: (...args: number[]) => { if (args[2]! < 0) throw new DOMException('raio negativo', 'IndexSizeError'); calls.push({ op: 'arc', args }); },
    ellipse: (...args: number[]) => { if (args[2]! < 0 || args[3]! < 0) throw new DOMException('raio negativo', 'IndexSizeError'); calls.push({ op: 'ellipse', args }); },
  };
  return new Proxy(ctx, {
    get(t, k: string) {
      if (k in t) return t[k];
      return (...args: unknown[]) => { calls.push({ op: k, args }); };
    },
    set(t, k: string, v) { t[k] = v; return true; },
  }) as unknown as ReturnType<typeof recCtx>;
}

const chartXml = (plot: string, extra = ''): string =>
  `<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea>${plot}</c:plotArea>${extra}</c:chart></c:chartSpace>`;
const ser = (vals: number[], name = 'S', ptCount = vals.length): string =>
  `<c:ser><c:idx val="0"/><c:tx><c:v>${name}</c:v></c:tx><c:cat><c:strRef><c:strCache><c:ptCount val="${vals.length}"/>${vals.map((_, i) => `<c:pt idx="${i}"><c:v>C${i}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>` +
  `<c:val><c:numRef><c:numCache><c:ptCount val="${ptCount}"/>${vals.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val></c:ser>`;
const bars = (vals: number[], axis = ''): string =>
  chartXml(`<c:barChart><c:barDir val="col"/>${ser(vals)}</c:barChart><c:valAx>${axis}<c:majorGridlines/></c:valAx>`);

describe('gráficos: robustez e desenho', () => {
  it('pizza num quadro pequeno demais (plot negativo) não lança', () => {
    const m = parseChart(chartXml(`<c:pieChart>${ser([1, 2, 3])}</c:pieChart>`, '<c:legend><c:legendPos val="b"/></c:legend>'));
    m.title = 'Título';
    expect(() => paintChart(recCtx(), m, 0, 0, 120, 40, 1.33)).not.toThrow();
  });

  it('barras partem do ZERO: negativos descem dele', () => {
    const ctx = recCtx();
    paintChart(ctx, parseChart(bars([4, -2])), 0, 0, 400, 300, 1.33);
    const rects = ctx.calls.filter((c) => c.op === 'fillRect' && (c.args[2] as number) < 400 && (c.args[3] as number) !== 300).map((c) => c.args as number[]);
    const [pos, neg] = rects.slice(-2);
    // a barra positiva termina onde a negativa começa (a linha do zero)
    expect(pos![1]! + pos![3]!).toBeCloseTo(neg![1]!, 6);
    expect(neg![3]).toBeGreaterThan(0);
  });

  it('majorUnit minúsculo não vira bilhões de marcas (teto)', () => {
    const ctx = recCtx();
    const t0 = performance.now();
    paintChart(ctx, parseChart(bars([1000, 2000], '<c:scaling><c:min val="0"/><c:max val="3000"/></c:scaling><c:majorUnit val="0.000001"/>')), 0, 0, 400, 300, 1.33);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(ctx.calls.filter((c) => c.op === 'fillText').length).toBeLessThan(2100);
  });

  it('idx gigante num ponto não cria um array de 10⁸ (limitado pelo ptCount)', () => {
    const xml = chartXml(`<c:barChart><c:barDir val="col"/><c:ser><c:idx val="0"/><c:val><c:numRef><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>1</c:v></c:pt><c:pt idx="100000000"><c:v>2</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart>`);
    const m = parseChart(xml);
    expect(m.series[0]!.values.length).toBeLessThanOrEqual(2);
  });

  it('legenda à direita da pizza lista as FATIAS (categorias), não a série', () => {
    const ctx = recCtx();
    paintChart(ctx, parseChart(chartXml(`<c:pieChart>${ser([1, 2, 3])}</c:pieChart>`, '<c:legend><c:legendPos val="r"/></c:legend>')), 0, 0, 600, 300, 1.33);
    const texts = ctx.calls.filter((c) => c.op === 'fillText').map((c) => c.args[0]);
    expect(texts).toEqual(expect.arrayContaining(['C0', 'C1', 'C2']));
  });

  it('eixo logarítmico: marcas nas potências da base', () => {
    const ctx = recCtx();
    paintChart(ctx, parseChart(bars([5, 500], '<c:scaling><c:logBase val="10"/></c:scaling>')), 0, 0, 400, 300, 1.33);
    const labels = ctx.calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]));
    expect(labels).toEqual(expect.arrayContaining(['1', '10', '100', '1000'])); // Geral do Excel: sem separador de milhar
  });
});

describe('paintSlideTo: forma inválida não derruba o slide', () => {
  it('a forma seguinte é pintada e a pilha save/restore fica equilibrada', () => {
    const ctx = recCtx();
    const slide = {
      shapes: [
        // elipse com tamanho NEGATIVO (raio < 0): antes lançava IndexSizeError e abortava tudo
        { id: '2', geom: 'ellipse', xfrm: { x: 0, y: 0, cx: -100, cy: -100 }, fill: { type: 'solid', color: '#FF0000' } },
        { id: '3', geom: 'rect', xfrm: { x: 0, y: 0, cx: 1000, cy: 1000 }, fill: { type: 'solid', color: '#00FF00' } },
      ],
    } as unknown as Slide;
    expect(() => paintSlideTo(ctx, slide, { slideW: 9144000, slideH: 5143500 }, 0.0001)).not.toThrow();
    expect(ctx.depth).toBe(0);
    const fills = ctx.calls.filter((c) => c.op === 'fill' || c.op === 'fillRect').length;
    expect(fills).toBeGreaterThanOrEqual(2); // fundo + a 2ª forma (ao menos)
  });

  it('falha NO MEIO da pintura (depois de save): a pilha volta ao nível de antes e a próxima forma sai', () => {
    const ctx = recCtx();
    const slide = {
      shapes: [
        { id: '2', geom: 'rect', xfrm: { x: 0, y: 0, cx: 1000, cy: 1000 }, fill: { type: 'solid', color: '#FF0000' } },
        { id: '3', geom: 'rect', xfrm: { x: 0, y: 0, cx: 1000, cy: 1000 }, fill: { type: 'solid', color: '#00FF00' } },
      ],
    } as unknown as Slide;
    const painted: string[] = [];
    paintSlideTo(ctx, slide, { slideW: 9144000, slideH: 5143500 }, 0.0001, {
      // o gancho da 1ª forma lança DEPOIS do ctx.save() do laço
      shapeAnim: (sh) => (sh.id === '2' ? { all: () => { throw new Error('dados de animação inválidos'); } } : (painted.push(sh.id), null)),
    });
    expect(ctx.depth).toBe(0);
    expect(painted).toEqual(['3']);
  });
});
