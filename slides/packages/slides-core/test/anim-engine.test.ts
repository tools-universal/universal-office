import { describe, expect, it } from 'vitest';
import { shapeAnimHooks, evalFormula, mediaStateAt, type PlacedEffect, type AnimBase } from '../src/index.js';
import type { TimeNode, AnimTarget } from '../src/timing.js';

// Nós de tempo montados à mão (a forma exata que o parser produz)
const node = (tag: string, extra: Partial<TimeNode> = {}, children: TimeNode[] = []): TimeNode =>
  ({ tag, st: [{ delayMs: 0 }], children, ...extra }) as TimeNode;
const effect = (n: TimeNode, target: AnimTarget = { spid: '3' }, t0 = 0, cls = 'entr'): PlacedEffect =>
  ({ presetClass: cls, presetId: 1, presetSubtype: 0, startMs: t0, durMs: 1000, blockMs: 1000, node: n, target, t0, step: 0 }) as PlacedEffect;
const base: AnimBase = { x: 0.5, y: 0.5, w: 0.2, h: 0.1 };

describe('trajetória (animMotion path)', () => {
  const motion = (path: string): PlacedEffect =>
    effect(node('par', { dur: 1000, fill: 'hold' }, [node('animMotion', { dur: 1000, fill: 'hold', path, target: { spid: '3' } })]));

  it('expoente em MAIÚSCULA ("-4.58333E-6") não vira o comando E', () => {
    const fx = motion('M -4.58333E-6 -4.44444E-6 L 0.25 -4.44444E-6 E');
    for (const t of [0, 500, 1000, 5000]) {
      const st = shapeAnimHooks([fx], ['3'], t)!.all(base);
      expect(Number.isFinite(st.mx) && Number.isFinite(st.my)).toBe(true);
    }
    const end = shapeAnimHooks([fx], ['3'], 1000)!.all(base);
    expect(end.mx).toBeCloseTo(0.25, 5);
    expect(end.my).toBeCloseTo(-4.44444e-6, 9);
  });

  it('número solto depois de Z não trava (antes: laço infinito)', () => {
    const fx = motion('M 0 0 L 0.1 0 Z 0.2 0.2');
    const st = shapeAnimHooks([fx], ['3'], 500)!.all(base);
    expect(Number.isFinite(st.mx)).toBe(true);
  });
});

describe('anim com quadros-chave (tavLst)', () => {
  const tavAnim = (attr: string, calcmode: string, valueType: string, tav: NonNullable<TimeNode['tav']>, dur = 1000): PlacedEffect =>
    effect(node('par', { dur, fill: 'hold' }, [node('anim', { dur, fill: 'hold', calcmode, valueType, attrNames: [attr], tav, target: { spid: '3' } })]), { spid: '3' }, 0, 'emph');

  it('discreto: no fim vale o ÚLTIMO quadro (não o penúltimo)', () => {
    const fx = tavAnim('style.opacity', 'discrete', 'num', [{ tm: 0, val: '0.2' }, { tm: 0.5, val: '0.9' }]);
    expect(shapeAnimHooks([fx], ['3'], 250)!.all(base).opacity).toBeCloseTo(0.2, 6);
    expect(shapeAnimHooks([fx], ['3'], 600)!.all(base).opacity).toBeCloseTo(0.9, 6);
    expect(shapeAnimHooks([fx], ['3'], 5000)!.all(base).opacity).toBeCloseTo(0.9, 6); // fill hold
  });

  it('discreto de cor: no fim vale a última cor', () => {
    const fx = tavAnim('fillcolor', 'discrete', 'clr', [{ tm: 0, color: '#FF0000' }, { tm: 0.5, color: '#00FF00' }]);
    expect(shapeAnimHooks([fx], ['3'], 250)!.all(base).fillColor).toBe('#FF0000');
    expect(shapeAnimHooks([fx], ['3'], 900)!.all(base).fillColor).toBe('#00FF00');
  });

  it('texto ("hidden"/"visible") é valor, não fórmula — o piscar esconde de verdade', () => {
    const fx = tavAnim('style.visibility', 'discrete', 'str', [{ tm: 0, val: 'hidden' }, { tm: 0.5, val: 'visible' }]);
    expect(shapeAnimHooks([fx], ['3'], 200)!.all(base).visible).toBe(false);
    expect(shapeAnimHooks([fx], ['3'], 700)!.all(base).visible).toBe(true);
    const bold = tavAnim('style.fontWeight', 'discrete', 'str', [{ tm: 0, val: 'bold' }]);
    expect(shapeAnimHooks([bold], ['3'], 500)!.all(base).fontWeight).toBe('bold');
  });

  it('linear numérico segue interpolando (e a fórmula do quadro vale no fim)', () => {
    const fx = tavAnim('ppt_x', 'lin', 'num', [{ tm: 0, val: '0' }, { tm: 1, val: '#ppt_x' }]);
    expect(shapeAnimHooks([fx], ['3'], 500)!.all(base).x).toBeCloseTo(0.25, 6);
    expect(shapeAnimHooks([fx], ['3'], 1000)!.all(base).x).toBeCloseTo(0.5, 6);
  });
});

describe('seq com filho indefinido', () => {
  it('no fim do slide (animMs = Infinity) o filho seguinte não recebe NaN', () => {
    const rot = node('animRot', { dur: 500, repeat: Infinity, rotBy: 360, target: { spid: '3' } });
    const scale = node('animScale', { dur: 500, fill: 'hold', toXY: [2, 2], target: { spid: '3' } });
    const fx = effect(node('par', { fill: 'hold' }, [node('seq', { fill: 'hold' }, [rot, scale])]), { spid: '3' }, 0, 'emph');
    const st = shapeAnimHooks([fx], ['3'], Infinity)!.all(base);
    expect(Number.isNaN(st.sx) || Number.isNaN(st.sy)).toBe(false);
    expect(st.sx).toBe(1);
  });
});

describe('texto por letra/palavra', () => {
  const unitFx = (type: 'lt' | 'wd', target: AnimTarget, t0 = 0, dur = 1000): PlacedEffect => {
    const set = node('set', { dur: 1, fill: 'hold', attrNames: ['style.visibility'], setTo: 'visible', target });
    return effect(node('par', { dur, fill: 'hold', iterate: { type, backwards: false, pct: 0.1 } }, [set, node('animEffect', { dur, filter: 'fade', transition: 'in', target })]), target, t0);
  };

  it('unidade de FUNDO só com a forma inteira como alvo (faixa de parágrafos não leva o fundo)', () => {
    const animBg = (): boolean => true;
    const ranged = shapeAnimHooks([unitFx('lt', { spid: '3', pRange: [0, 0] })], ['3'], 50, { animBg })!;
    expect(ranged.bg).toBeUndefined();
    // 1ª letra já começou (sem o atraso de uma unidade de fundo inteira)
    expect(ranged.unit!.state({ para: 0, k: 0, count: 5, kPara: 0, countPara: 5 }, base)!.visible).toBe(true);
    const whole = shapeAnimHooks([unitFx('lt', { spid: '3' })], ['3'], 50, { animBg })!;
    expect(whole.bg).toBeDefined();
    expect(whole.unit!.state({ para: 0, k: 0, count: 5, kPara: 0, countPara: 5 }, base)!.visible).toBe(false);
  });

  it('entrada por letra + saída por palavra: a saída escalona pela PALAVRA', () => {
    const entr = unitFx('lt', { spid: '3' });
    const exitNode = node('par', { dur: 1000, fill: 'hold', iterate: { type: 'wd', backwards: false, pct: 0.5 } },
      [node('set', { dur: 1, fill: 'hold', attrNames: ['style.visibility'], setTo: 'hidden', target: { spid: '3' } })]);
    // saída começa em 5000 (st sempre 0): palavra k some em 5000 + k·500
    const exit = effect(exitNode, { spid: '3' }, 5000, 'exit');
    const hooks = shapeAnimHooks([entr, exit], ['3'], 5600)!;
    expect(hooks.unit!.type).toBe('lt');
    expect(hooks.unit!.words).toBe(true);
    // letra 7 (k=7) na palavra 1: some em 5500 → já sumiu em 5600 (por letra seria 5000 + 7·500)
    const letter = { para: 0, k: 7, count: 10, kPara: 7, countPara: 10 };
    const word = { para: 0, k: 1, count: 2, kPara: 1, countPara: 2 };
    expect(hooks.unit!.state(letter, base, word)!.visible).toBe(false);
  });
});

describe('fórmulas', () => {
  it('operando faltando, variável/função desconhecida ⇒ NaN', () => {
    expect(evalFormula('2*)', {})).toBeNaN();
    expect(evalFormula('#ppt_x + *', { '#ppt_x': 0.5 })).toBeNaN();
    expect(evalFormula('hidden', {})).toBeNaN();
    expect(evalFormula('foo(1)', {})).toBeNaN();
  });
  it('funções do PowerPoint: sinh cosh tanh deg rad', () => {
    expect(evalFormula('cosh(0)', {})).toBe(1);
    expect(evalFormula('sinh(0)+tanh(0)', {})).toBe(0);
    expect(evalFormula('deg(pi)', {})).toBeCloseTo(180, 9);
    expect(evalFormula('rad(180)', {})).toBeCloseTo(Math.PI, 9);
  });
  it('precedência e menos unário seguem valendo', () => {
    expect(evalFormula('1+#ppt_w/2', { '#ppt_w': 0.4 })).toBeCloseTo(1.2, 9);
    expect(evalFormula('-2^2', {})).toBe(4); // unário liga mais forte que ^ (gramática do app)
    expect(evalFormula('0-#ppt_h/2', { '#ppt_h': 0.2 })).toBeCloseTo(-0.1, 9);
  });
});

describe('mídia: pausa não consome a duração', () => {
  const cmdFx = (cmd: string, t0: number, dur?: number): PlacedEffect =>
    effect(node('par', {}, [node('cmd', { cmd, ...(dur !== undefined ? { dur } : {}), target: { spid: '3' } })]), { spid: '3' }, t0, 'mediacall');

  it('vídeo de 10 s: pausa em 3 s, retoma em 8 s → acaba em 15 s (não em 10 s)', () => {
    const fx = [cmdFx('playFrom(0.0)', 0, 10000), cmdFx('togglePause', 3000), cmdFx('togglePause', 8000)];
    const mid = mediaStateAt(fx, '3', 10000);
    expect(mid.playing).toBe(true);
    expect(mid.ended).toBeUndefined();
    expect(mid.timeSec).toBeCloseTo(5, 6);
    expect(mediaStateAt(fx, '3', 16000)).toMatchObject({ playing: false, ended: true, timeSec: 10 });
  });

  it('sem pausa: igual a antes (fim em comando + duração, com latência)', () => {
    const fx = [cmdFx('playFrom(0.0)', 0, 2000)];
    expect(mediaStateAt(fx, '3', 2500, { latencyMs: 66 })).toMatchObject({ ended: true });
    expect(mediaStateAt(fx, '3', 2500, { latencyMs: 66 }).timeSec).toBeCloseTo((2000 - 66) / 1000, 6);
    expect(mediaStateAt(fx, '3', 1900, { latencyMs: 66 }).ended).toBeUndefined();
  });
});
