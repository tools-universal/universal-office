import { describe, expect, it } from 'vitest';
import {
  SlideShow, mirrorTransition, STEP_PENDING,
  type AnimStep, type EffectTiming, type SlideTimingModel, type SlideTransitionInfo,
} from '../src/index.js';

// Semântica medida no PowerPoint ao vivo (tools/ppt-lab/playback/f5-probe.ps1):
// os números dos testes "com intervalo" são os do deck da sonda (P2: 3 s, 3 cliques).

const eff = (durMs: number): EffectTiming => ({
  presetClass: 'entr', presetId: 1, presetSubtype: 0, startMs: 0, durMs, blockMs: durMs,
  target: { spid: '9' }, node: { tag: 'par', children: [] },
} as unknown as EffectTiming);
const step = (auto: boolean, durMs = 0): AnimStep => ({ auto, durMs, hasIndefinite: false, effects: [eff(durMs)] });
const clicks = (n: number, durMs = 0): AnimStep[] => Array.from({ length: n }, () => step(false, durMs));
const tr = (o: Partial<SlideTransitionInfo> = {}): SlideTransitionInfo => ({ type: 'fade', ns: 'p', attrs: {}, durMs: 0, advClick: true, ...o });
const slide = (o: { steps?: AnimStep[]; transition?: SlideTransitionInfo; hidden?: boolean } = {}): SlideTimingModel => ({
  steps: o.steps ?? [], interactive: [], hidden: o.hidden ?? false, ...(o.transition ? { transition: o.transition } : {}),
});
/** Corte seco (sem transição) com intervalo opcional. */
const cut = (advTmMs?: number, advClick = true): SlideTransitionInfo =>
  tr({ type: 'none', ...(advTmMs !== undefined ? { advTmMs } : {}), advClick });

describe('apresentação por clique (F5)', () => {
  it('sem intervalo: passos esperam o clique; oculto pulado; tela de fim; sair', () => {
    const ss = new SlideShow([slide({ steps: clicks(2) }), slide({ hidden: true }), slide()], 0, 0);
    expect([ss.index, ss.step, ss.steps]).toEqual([0, 0, 2]);
    expect(ss.update(1e6)).toBe('none');
    expect(ss.dueAt()).toBe(Infinity);
    expect(ss.next(10)).toBe('step');
    expect(ss.next(20)).toBe('step');
    expect(ss.step).toBe(2);
    expect(ss.next(30)).toBe('slide');
    expect(ss.index).toBe(2); // o oculto (1) é pulado
    expect(ss.next(40)).toBe('end');
    expect(ss.ended).toBe(true);
    expect(ss.frame(40)).toMatchObject({ slide: null, ended: true });
    expect(ss.next(50)).toBe('exit');
  });

  it('com intervalo: os cliques disparam sozinhos nos horários do export e o slide avança em D', () => {
    // P2 da sonda: sem transição, 3 s, 3 cliques → 0,75 / 1,5 / 2,25 s e avanço em 3 s
    const ss = new SlideShow([slide({ transition: cut(3000), steps: clicks(3) }), slide()], 0, 0);
    expect(ss.dueAt()).toBe(750);
    expect(ss.update(749)).toBe('none');
    expect(ss.update(750)).toBe('step');
    expect(ss.update(1500)).toBe('step');
    expect(ss.update(2250)).toBe('step');
    expect(ss.step).toBe(3);
    expect(ss.update(2999)).toBe('none');
    expect(ss.update(3000)).toBe('slide');
    expect(ss.index).toBe(1);
  });

  it('com intervalo: clique adiantado só antecipa o passo — os outros horários e o avanço ficam', () => {
    const ss = new SlideShow([slide({ transition: cut(3000), steps: clicks(3) }), slide()], 0, 0);
    expect(ss.next(342)).toBe('step');
    expect(ss.update(750)).toBe('none'); // o horário do 1º já passou: nada
    expect(ss.step).toBe(1);
    expect(ss.update(1500)).toBe('step');
    expect(ss.update(2250)).toBe('step');
    expect(ss.update(3000)).toBe('slide');
  });

  it('o relógio do intervalo começa no FIM da transição; comando na transição a conclui', () => {
    const models = [slide({ transition: tr({ durMs: 500, advTmMs: 2000 }), steps: clicks(2) }), slide()];
    const a = new SlideShow(models, 0, 0);
    expect(a.frame(250).transitionProgress).toBeCloseTo(0.5, 6);
    expect(a.update(1166)).toBe('none');
    expect(a.update(1167)).toBe('step'); // 500 + 2000/3
    const b = new SlideShow(models, 0, 0);
    expect(b.next(100)).toBe('transition');
    expect(b.frame(100)).toMatchObject({ transitionProgress: 1, animMs: 0 });
    expect(b.step).toBe(0); // o comando não disparou passo
    expect(b.update(766)).toBe('none');
    expect(b.update(767)).toBe('step'); // 100 + 2000/3
  });

  it('voltar: desfaz um passo por vez; depois o anterior no estado FINAL, pela transição espelhada, sem relógio', () => {
    const models = [
      slide({ transition: cut(2000), steps: clicks(2) }),
      slide({ transition: tr({ type: 'push', durMs: 1000 }), steps: clicks(2) }),
    ];
    const ss = new SlideShow(models, 0, 0);
    ss.update(667); ss.update(1334);
    expect(ss.update(2000)).toBe('slide');
    expect(ss.next(3100)).toBe('step');
    expect(ss.next(3200)).toBe('step');
    expect(ss.prev(3300)).toBe('step');
    expect(ss.step).toBe(1);
    expect(ss.prev(3400)).toBe('step');
    expect(ss.step).toBe(0);
    expect(ss.prev(3500)).toBe('slide');
    expect([ss.index, ss.step]).toEqual([0, 2]); // estado final
    const f = ss.frame(4000);
    expect(f.transitionProgress).toBeCloseTo(0.5, 6);
    expect(f.slide!.transition).toMatchObject({ type: 'push', attrs: { dir: 'r' } }); // empurrar volta pela esquerda
    expect(f.from!.slide.index).toBe(1);
    // os efeitos do destino já terminaram antes da transição (aparece pronto)
    expect(f.slide!.effects.every((e) => e.t0 + e.durMs < -1000)).toBe(true);
    expect(ss.update(1e9)).toBe('none'); // sem avanço sozinho depois de voltar
    expect(ss.dueAt()).toBe(Infinity);
    expect(ss.next(4000)).toBe('transition'); // conclui a transição de volta
    expect(ss.next(4100)).toBe('slide');
    expect(ss.index).toBe(1);
  });

  it('com intervalo, voltar REBOBINA e para o relógio; o clique seguinte recomeça do zero', () => {
    const ss = new SlideShow([slide({ transition: cut(3000), steps: clicks(3) }), slide()], 0, 0);
    ss.update(750); ss.update(1500);
    expect(ss.prev(1700)).toBe('step');
    expect(ss.step).toBe(0);
    expect(ss.update(1e6)).toBe('none');
    expect(ss.next(5000)).toBe('step');
    expect(ss.update(6499)).toBe('none');
    expect(ss.update(6500)).toBe('step');
    expect(ss.update(7250)).toBe('step');
    expect(ss.update(7999)).toBe('none');
    expect(ss.update(8000)).toBe('slide'); // 1º clique + D (medido)
  });

  it('"avançar ao clicar" desligado: o mouse não troca de slide, o teclado troca', () => {
    const ss = new SlideShow([slide({ transition: cut(undefined, false) }), slide()], 0, 0);
    expect(ss.next(10, true)).toBe('none');
    expect(ss.index).toBe(0);
    expect(ss.next(20)).toBe('slide');
  });

  it('repetir: depois do último volta ao primeiro', () => {
    const ss = new SlideShow([slide(), slide()], 0, 0, { loop: true });
    expect(ss.next(10)).toBe('slide');
    expect(ss.next(20)).toBe('slide');
    expect(ss.index).toBe(0);
  });

  it('sem useTimings: slide com intervalo espera o clique', () => {
    const ss = new SlideShow([slide({ transition: cut(1000), steps: clicks(1) }), slide()], 0, 0, { useTimings: false });
    expect(ss.update(1e6)).toBe('none');
    expect(ss.index).toBe(0);
  });

  it('passo automático dispara na entrada e não conta como clique', () => {
    const ss = new SlideShow([slide({ steps: [step(true, 500), ...clicks(1)] })], 0, 0);
    expect([ss.step, ss.steps]).toEqual([0, 1]);
    const f = ss.frame(0);
    expect(f.slide!.effects[0]!.t0).toBe(0);
    expect(f.slide!.effects[1]!.t0).toBeGreaterThanOrEqual(STEP_PENDING); // pendente: estado inicial
    expect(ss.prev(10)).toBe('none'); // nada a desfazer, nenhum slide antes
  });

  it('wakeAt: anima na transição/efeito; parado até o apresentador; horário do intervalo', () => {
    const a = new SlideShow([slide({ transition: tr({ durMs: 500 }), steps: [step(true, 300)] })], 0, 0);
    expect(a.wakeAt(100)).toBe(100); // transição
    expect(a.wakeAt(600)).toBe(600); // efeito em curso (500..800)
    expect(a.wakeAt(900)).toBe(Infinity);
    const b = new SlideShow([slide({ transition: cut(3000), steps: clicks(3) })], 0, 0);
    expect(b.wakeAt(10)).toBe(750);
  });

  it('da tela de fim, voltar mostra o último slide no estado final', () => {
    const ss = new SlideShow([slide(), slide({ steps: clicks(2) })], 1, 0);
    ss.next(10); ss.next(20);
    expect(ss.next(30)).toBe('end');
    expect(ss.prev(40)).toBe('slide');
    expect([ss.index, ss.step]).toEqual([1, 2]);
  });
});

describe('transição espelhada (voltar)', () => {
  it('direções trocam de lado; o padrão sem dir também; sem direção fica igual', () => {
    expect(mirrorTransition(tr({ type: 'push' }))!.attrs['dir']).toBe('r');
    expect(mirrorTransition(tr({ type: 'wipe', attrs: { dir: 'u' } }))!.attrs['dir']).toBe('d');
    expect(mirrorTransition(tr({ type: 'cover', attrs: { dir: 'lu' } }))!.attrs['dir']).toBe('rd');
    const fade = tr({ type: 'fade' });
    expect(mirrorTransition(fade)).toBe(fade);
    expect(mirrorTransition(undefined)).toBeUndefined();
  });
});
