import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  PptxPackage, readPresentation, readSlide, buildPlaybackTimeline, shapeAnimHooks, chartPartBounds, applySoftReveal, parseChart,
  type Slide, type Shape, type PlacedEffect,
} from '../src/index.js';

// deck do corpus de reprodução: gráficos e SmartArt animados POR PARTES, regravado
// pelo PowerPoint (tools/ppt-lab/playback/gen-graficos-partes.ps1); sem ele, pula
const dir = join(__dirname, '..', '..', '..', 'samples', 'playback');
const has = (name: string): boolean => existsSync(join(dir, name));
const deck = (name: string): Slide[] => {
  const pkg = PptxPackage.load(new Uint8Array(readFileSync(join(dir, name))));
  return readPresentation(pkg).slides.map((r) => readSlide(pkg, r.target!));
};
const placed = (s: Slide): PlacedEffect[] => buildPlaybackTimeline([s.timing]).slides[0]!.effects;
const ids = (sh: Shape): string[] => [sh.id, ...(sh.groupIds ?? [])];
const BASE = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };

describe('SmartArt animado por partes (pb-graficos-partes)', () => {
  for (const ext of ['pptx', 'ppt']) {
    it.skipIf(!has(`pb-graficos-partes.${ext}`))(`<a:dgm id> nomeia a FORMA do desenho (modelId) — ${ext}`, () => {
      const s = deck(`pb-graficos-partes.${ext}`);
      // .ppt: o SmartArt volta como diagrama real (metroBlob → graphicFrame + partes)
      for (const k of [6, 7, 8]) {
        // (a caixa de texto do txXfrm acompanha a forma: mesmo dgmId, fora da contagem)
        const shapes = s[k]!.shapes.filter((x) => x.dgmId && !x.dgmTextOf);
        expect(shapes.length).toBe(5);
        const targets = s[k]!.timing!.steps.flatMap((st) => st.effects).map((e) => e.target!);
        expect(targets.length).toBe(5);
        for (const t of targets) {
          expect(shapes.map((x) => x.dgmId)).toContain(t.dgm);
          expect(shapes.every((x) => x.groupIds?.includes(t.spid))).toBe(true);
        }
      }
    });
  }

  it.skipIf(!has('pb-graficos-partes.pptx'))('um a um: cada forma entra no próprio efeito; id de NÓ de dados não anima', () => {
    const s = deck('pb-graficos-partes.pptx')[6]!;
    const fx = placed(s);
    const third = fx[2]!;
    const sh = s.shapes.find((x) => x.dgmId === third.target!.dgm)!;
    const at = (ms: number) => shapeAnimHooks(fx, ids(sh), ms, { dgmId: sh.dgmId })!.all(BASE).visible;
    expect(at(third.t0 - 1)).toBe(false);
    expect(at(third.t0 + third.durMs + 1)).toBe(true);
    // medido no app: o id do nó (ponto de dados) não casa com forma nenhuma → estática
    const node: PlacedEffect = { ...third, target: { ...third.target!, dgm: '{00000000-0000-0000-0000-000000000001}' } };
    expect(shapeAnimHooks([node], ids(sh), 0, { dgmId: sh.dgmId })).toBeNull();
  });
});

describe('gráfico animado por partes (pb-graficos-partes)', () => {
  it.skipIf(!has('pb-graficos-partes.pptx'))('fundo noFill do chartSpace; série entra no próprio efeito', () => {
    const s = deck('pb-graficos-partes.pptx')[0]!;
    const chart = s.shapes.find((x) => x.chartXml)!;
    expect(parseChart(chart.chartXml!, chart.chartTheme).space.sp.fill).toEqual({ kind: 'none' }); // gráfico inserido no PowerPoint 2013+: transparente
    const fx = placed(s);
    const s2 = fx.find((e) => e.target?.chart?.step === 'series' && e.target.chart.series === 1)!;
    const part = (ms: number) => shapeAnimHooks(fx, [chart.id], ms)!.chartParts!.find((p) => p.sel.key === 'series|1|-4')!;
    expect(part(0).sel.data!(1, 2)).toBe(true);
    expect(part(0).sel.data!(0, 2)).toBe(false);
    expect(part(s2.t0 - 1).state!(BASE)!.visible).toBe(false);
    expect(part(s2.t0 + s2.durMs + 1).state!(BASE)!.visible).toBe(true);
  });
});

describe('revelar com borda esfumada (applySoftReveal)', () => {
  // grava o gradiente e o preenchimento da máscara
  const rec = () => {
    const calls: { grad?: number[]; stops: [number, string][]; rect?: number[]; op?: string } = { stops: [] };
    const ctx = {
      globalCompositeOperation: 'source-over', globalAlpha: 1, fillStyle: '' as unknown,
      save() {}, restore() {},
      createLinearGradient: (...a: number[]) => { calls.grad = a; return { addColorStop: (o: number, c: string) => calls.stops.push([o, c]) }; },
      fillRect(...a: number[]) { calls.rect = a; calls.op = this.globalCompositeOperation; },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
  };

  it('rampa linear de 14% da extensão; a frente percorre extensão + rampa (medido no app)', () => {
    const { ctx, calls } = rec();
    // de baixo (wipe(down)), metade: frente em y + h − 0,5·(h + 0,14h)
    applySoftReveal(ctx, 'wipe(down)', 0.5, 10, 100, 50, 200);
    const b = 0.14 * 200, f = 100 + 200 - 0.5 * (200 + b);
    expect(calls.grad).toEqual([0, f, 0, f + b]);
    expect(calls.stops).toEqual([[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
    expect(calls.rect).toEqual([10, 100, 50, 200]);
    expect(calls.op).toBe('destination-in');
  });

  it('q = 0 esconde tudo e q = 1 mostra tudo (rampa fora da caixa)', () => {
    const a = rec(); applySoftReveal(a.ctx, 'wipe(left)', 0, 0, 0, 100, 10);
    expect(a.calls.grad![0]).toBe(0); // da esquerda: rampa termina na borda esquerda
    const z = rec(); applySoftReveal(z.ctx, 'wipe(left)', 1, 0, 0, 100, 10);
    expect(z.calls.grad![2]).toBeCloseTo(100, 9); // lado revelado já passou da borda direita
  });
});

describe('chartPartBounds', () => {
  // contexto mínimo: o motor só mede texto e desenha retângulos/caminhos
  const fakeCtx = (): CanvasRenderingContext2D => ({
    font: '10px Arial', textAlign: 'left', textBaseline: 'alphabetic', fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    save() {}, restore() {},
    measureText: (s: string) => ({ width: s.length * 6 }),
    fillRect() { throw new Error('desenhou no contexto real'); },
  }) as unknown as CanvasRenderingContext2D;
  const cache = (v: number[]) => `<c:numRef><c:numCache><c:ptCount val="2"/>${v.map((x, i) => `<c:pt idx="${i}"><c:v>${x}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`;
  const ser = (i: number, v: number[]) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:cat><c:strRef><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>A</c:v></c:pt><c:pt idx="1"><c:v>B</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val>${cache(v)}</c:val></c:ser>`;
  const model = parseChart(`<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>${ser(0, [1, 4])}${ser(1, [3, 2])}</c:barChart></c:plotArea></c:chart></c:chartSpace>`);

  it('caixa das marcas da parte (série), menor que o quadro; nada desenhado de verdade', () => {
    const ctx = fakeCtx();
    const all = chartPartBounds(ctx, model, 0, 0, 400, 300, 1, { bg: false, data: () => true })!;
    const s1 = chartPartBounds(ctx, model, 0, 0, 400, 300, 1, { key: 'series|0|-4', bg: false, data: (s) => s === 0 })!;
    expect(s1.w).toBeGreaterThan(0);
    expect(s1.x).toBeGreaterThanOrEqual(all.x - 1e-6);
    expect(s1.x + s1.w).toBeLessThanOrEqual(all.x + all.w + 1e-6);
    // a coluna mais alta da série 0 (4) define o topo da caixa: mais alta que a da série 1 (3)
    const s2 = chartPartBounds(ctx, model, 0, 0, 400, 300, 1, { bg: false, data: (s) => s === 1 })!;
    expect(s1.y).toBeLessThan(s2.y);
    expect(s1.y + s1.h).toBeCloseTo(s2.y + s2.h, 6); // mesma base
    expect(all.h).toBeLessThan(300);
  });

  it('seleção vazia → null', () => {
    expect(chartPartBounds(fakeCtx(), model, 0, 0, 400, 300, 1, { bg: false, data: () => false })).toBeNull();
  });
});
