import { describe, expect, it } from 'vitest';
import {
  parseXml, parseSlideTiming, parseSlideTransition, buildPlaybackTimeline, playbackStateAt, shapeOpacityAt,
  mediaStateAt, gifFrameAt,
  type CountTextUnits, type SlideTimingModel, type PlacedEffect,
} from '../src/index.js';

// Estruturas como o app de referência GRAVA (capturadas via COM no lab de
// playback — tools/ppt-lab/playback): transições 2010+ em mc:AlternateContent,
// mainSeq com passo automático (onBegin) + passos por clique (indefinite).
const NS = 'xmlns:p="p" xmlns:a="a" xmlns:mc="mc" xmlns:p14="p14"';
const one: CountTextUnits = () => 1;

const sld = (inner: string, attrs = ''): string => `<p:sld ${NS} ${attrs}><p:cSld><p:spTree/></p:cSld>${inner}</p:sld>`;

/** Efeito `presetClass` com comportamentos dados, num par com delay. */
const fx = (id: number, cls: string, preset: number, spid: string, delay: number, kids: string, extra = ''): string =>
  `<p:par><p:cTn id="${id}" presetID="${preset}" presetClass="${cls}" presetSubtype="0" fill="hold" nodeType="afterEffect" ${extra}>` +
  `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${kids.replace(/SPID/g, spid)}</p:childTnLst></p:cTn></p:par>`;
const set = '<p:set><p:cBhvr><p:cTn id="90" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="SPID"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>';
const fade = (dur: number, dir = 'in'): string =>
  `<p:animEffect transition="${dir}" filter="fade"><p:cBhvr><p:cTn id="91" dur="${dur}"/><p:tgtEl><p:spTgt spid="SPID"/></p:tgtEl></p:cBhvr></p:animEffect>`;
const anim = (dur: number): string =>
  `<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="92" dur="${dur}" fill="hold"/><p:tgtEl><p:spTgt spid="SPID"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_x</p:attrName></p:attrNameLst></p:cBhvr></p:anim>`;
/** Passo do mainSeq: automático (onBegin) ou por clique (indefinite). */
const step = (auto: boolean, subs: string[]): string =>
  `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>${auto ? '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>' : ''}</p:stCondLst><p:childTnLst>${subs.join('')}</p:childTnLst></p:cTn></p:par>`;
const sub = (delay: number, effects: string): string =>
  `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par>`;
const timing = (steps: string[]): string =>
  `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${steps.join('')}</p:childTnLst></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;

describe('transição de entrada (parseSlideTransition)', () => {
  it('desembrulha mc:AlternateContent (Choice p14): tipo, p14:dur e advTm', () => {
    const t = parseSlideTransition(parseXml(sld(
      '<mc:AlternateContent><mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="2000" advTm="3000"><p14:vortex dir="r"/></p:transition></mc:Choice>' +
      '<mc:Fallback><p:transition spd="slow" advTm="3000"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')))!;
    expect(t.type).toBe('vortex');
    expect(t.ns).toBe('p14');
    expect(t.attrs).toEqual({ dir: 'r' });
    expect(t.durMs).toBe(2000);
    expect(t.advTmMs).toBe(3000);
    expect(t.advClick).toBe(true);
  });

  it('spd do app: fast 500 / med 750 / slow 1000; sem spd = fast', () => {
    expect(parseSlideTransition(parseXml(sld('<p:transition spd="med"><p:push dir="u"/></p:transition>')))!.durMs).toBe(750);
    expect(parseSlideTransition(parseXml(sld('<p:transition spd="slow"><p:wipe/></p:transition>')))!.durMs).toBe(1000);
    const f = parseSlideTransition(parseXml(sld('<p:transition advClick="0"><p:fade thruBlk="1"/></p:transition>')))!;
    expect(f.durMs).toBe(500);
    expect(f.attrs['thruBlk']).toBe('1');
    expect(f.advClick).toBe(false);
    expect(f.advTmMs).toBeUndefined();
  });

  it('transição só com intervalo (sem elemento de efeito) vira type none', () => {
    expect(parseSlideTransition(parseXml(sld('<p:transition advTm="2000"/>')))!.type).toBe('none');
  });
});

describe('árvore <p:timing> → passos e efeitos (parseSlideTiming)', () => {
  const xml = sld(timing([
    step(true, [sub(0, fx(5, 'entr', 10, '3', 0, set + fade(1000))), sub(1000, fx(6, 'entr', 1, '4', 0, set))]),
    step(false, [sub(0, fx(7, 'exit', 10, '3', 250, fade(500, 'out')))]),
  ]));
  const m = parseSlideTiming(parseXml(xml), one);

  it('1º passo automático (onBegin) + passo por clique (indefinite)', () => {
    expect(m.steps.map((s) => s.auto)).toEqual([true, false]);
  });

  it('"após o anterior" vira sub-par com delay = fim acumulado', () => {
    const [a, b] = m.steps[0]!.effects;
    expect([a!.presetClass, a!.presetId, a!.target?.spid, a!.startMs, a!.durMs, a!.filter]).toEqual(['entr', 10, '3', 0, 1000, 'fade']);
    expect([b!.presetId, b!.target?.spid, b!.startMs, b!.durMs]).toEqual([1, '4', 1000, 1]);
    expect(m.steps[0]!.durMs).toBe(1001);
  });

  it('atraso do próprio efeito (stCondLst) soma no início', () => {
    const c = m.steps[1]!.effects[0]!;
    expect([c.presetClass, c.startMs, c.durMs]).toEqual(['exit', 250, 500]);
    expect(m.steps[1]!.durMs).toBe(750);
  });

  it('repetição, auto-reverter e iteração por palavra entram na duração ativa', () => {
    const rep = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, fx(5, 'emph', 8, '3', 0, anim(500), 'repeatCount="3000"'))])]))), one);
    expect(rep.steps[0]!.durMs).toBe(1500);
    const rev = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, fx(5, 'emph', 6, '3', 0, anim(1000), 'autoRev="1"'))])]))), one);
    expect(rev.steps[0]!.durMs).toBe(2000);
    const indef = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, fx(5, 'emph', 8, '3', 0, anim(500), 'repeatCount="indefinite"'))])]))), one);
    expect(indef.steps[0]!.hasIndefinite).toBe(true);
    expect(indef.steps[0]!.durMs).toBe(0);
    // por palavra: 5 palavras, 10% entre elas => 500 + 4 × 50
    const iter = fx(5, 'entr', 2, '3', 0, anim(500)).replace('<p:childTnLst>', '<p:iterate type="wd"><p:tmPct val="10000"/></p:iterate><p:childTnLst>');
    const words = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, iter)])]))), (_t, type) => (type === 'wd' ? 5 : 1));
    expect(words.steps[0]!.durMs).toBe(700);
  });

  it('filho do mainSeq com delay numérico (sem onBegin) é passo por CLIQUE; o atraso é ignorado', () => {
    // estrutura do showcase_animado: par(delay=200) direto no mainSeq
    const numeric = (d: number, spid: string): string =>
      `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="${d}"/></p:stCondLst><p:childTnLst>${fx(5, 'entr', 10, spid, 0, set + fade(500))}</p:childTnLst></p:cTn></p:par>`;
    const m2 = parseSlideTiming(parseXml(sld(timing([numeric(0, '2'), numeric(200, '3'), numeric(200, '4')]))), one);
    expect(m2.steps.map((s) => [s.auto, s.durMs])).toEqual([[false, 500], [false, 500], [false, 500]]);
  });

  it('"após o anterior" encadeia pelo fim REAL do sub-grupo anterior, não pelo delay gravado', () => {
    // delay gravado 300 (cache errado): o 2º efeito começa quando o 1º (1000) termina
    const m2 = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, fx(5, 'entr', 10, '3', 0, set + fade(1000))), sub(300, fx(6, 'entr', 10, '4', 0, set + fade(500)))])]))), one);
    expect(m2.steps[0]!.effects.map((e) => e.startMs)).toEqual([0, 1000]);
    expect(m2.steps[0]!.durMs).toBe(1500);
  });

  it('por letra: sem informação das formas, cai no bldP animBg="1" (fundo = unidade cheia antes do texto)', () => {
    const iter = fx(5, 'entr', 10, '3', 0, set + fade(1000)).replace('<p:childTnLst>', '<p:iterate type="lt"><p:tmPct val="10000"/></p:iterate><p:childTnLst>').replace('nodeType', 'grpId="0" nodeType');
    const bld = (bg: boolean): string => `<p:bldLst><p:bldP spid="3" grpId="0"${bg ? ' animBg="1"' : ''}/></p:bldLst>`;
    const five: CountTextUnits = (_t, type) => (type === 'lt' ? 5 : 1);
    const withBg = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, iter)])]).replace('</p:timing>', `${bld(true)}</p:timing>`))), five);
    const noBg = parseSlideTiming(parseXml(sld(timing([step(true, [sub(0, iter)])]).replace('</p:timing>', `${bld(false)}</p:timing>`))), five);
    // medido no app: caixa preenchida "ABCDE" 2,4 s; caixa de texto 1,4 s
    expect(withBg.steps[0]!.durMs).toBe(1000 + 1000 + 4 * 100);
    expect(noBg.steps[0]!.durMs).toBe(1000 + 4 * 100);
  });

  it('por letra: o FUNDO VISÍVEL da forma decide a unidade de fundo — animBg não importa (oráculo)', () => {
    const iter = fx(5, 'entr', 10, '3', 0, set + fade(1000)).replace('<p:childTnLst>', '<p:iterate type="lt"><p:tmPct val="10000"/></p:iterate><p:childTnLst>').replace('nodeType', 'grpId="0" nodeType');
    const xml = (bg: boolean): string => sld(timing([step(true, [sub(0, iter)])]).replace('</p:timing>', `<p:bldLst><p:bldP spid="3" grpId="0"${bg ? ' animBg="1"' : ''}/></p:bldLst></p:timing>`));
    const five: CountTextUnits = (_t, type) => (type === 'lt' ? 5 : 1);
    const filled = (): boolean => true, bare = (): boolean => false;
    // forma preenchida SEM animBg: tem a unidade de fundo (ênfase "sublinhar", "crescer c/ cor")
    const a = parseSlideTiming(parseXml(xml(false)), five, undefined, filled);
    expect(a.steps[0]!.durMs).toBe(1000 + 1000 + 4 * 100);
    expect(a.animBg).toEqual(['3']);
    // caixa de texto sem fundo COM animBg: não tem
    const b = parseSlideTiming(parseXml(xml(true)), five, undefined, bare);
    expect(b.steps[0]!.durMs).toBe(1000 + 4 * 100);
    expect(b.animBg).toBeUndefined();
  });

  it('slide oculto (show="0")', () => {
    expect(parseSlideTiming(parseXml(sld('', 'show="0"')), one).hidden).toBe(true);
  });
});

describe('linha do tempo da reprodução automática (buildPlaybackTimeline)', () => {
  const model = (advTm: number | undefined, steps: { auto: boolean; durMs: number }[], tr = 'fade', durMs = 500): SlideTimingModel => ({
    transition: { type: tr, ns: 'p', attrs: {}, durMs, advClick: true, ...(advTm !== undefined ? { advTmMs: advTm } : {}) },
    steps: steps.map((s) => ({ ...s, hasIndefinite: false, effects: [] })),
    interactive: [], hidden: false,
  });

  it('cliques disparam sozinhos: sobra max(0, D − A) dividida em K+1 esperas', () => {
    const tl = buildPlaybackTimeline([model(4000, [{ auto: true, durMs: 1000 }, { auto: false, durMs: 500 }, { auto: false, durMs: 500 }])]);
    const s = tl.slides[0]!;
    const w = 2000 / 3;
    expect(s.animStartMs).toBe(500);
    expect(s.stepStartMs[0]).toBe(500);
    expect(s.stepStartMs[1]).toBeCloseTo(500 + 1000 + w, 6);
    expect(s.stepStartMs[2]).toBeCloseTo(500 + 1000 + w + 500 + w, 6);
    expect(s.endMs).toBeCloseTo(500 + 4000, 6);
  });

  it('animações mais longas que o intervalo: o slide espera elas acabarem', () => {
    const tl = buildPlaybackTimeline([model(1000, [{ auto: true, durMs: 3000 }])]);
    expect(tl.slides[0]!.endMs).toBe(500 + 3000);
  });

  it('sem advTm usa defaultSlideMs; slides ocultos são pulados', () => {
    const hidden = { ...model(1000, []), hidden: true };
    const tl = buildPlaybackTimeline([model(undefined, []), hidden, model(2000, [], 'cut')], { defaultSlideMs: 3000 });
    expect(tl.slides.map((s) => s.index)).toEqual([0, 2]);
    expect(tl.slides[0]!.endMs).toBe(3500);
    expect(tl.slides[1]!.transitionMs).toBe(0); // corte seco
    expect(tl.durationMs).toBe(3500 + 2000);
  });

  it('latência de fase em ticks (export de vídeo: 2 ticks após a transição; +1 tick no fim quando A ≥ D)', () => {
    const tick = 33;
    const tl = buildPlaybackTimeline([
      model(2000, [], 'none'),                          // 1º slide sem transição: sem latência inicial
      model(1000, [{ auto: true, durMs: 2500 }]),       // A ≥ D
      model(4000, [{ auto: false, durMs: 500 }]),        // A < D
    ], { tickMs: tick });
    const [a, b, c] = tl.slides;
    expect(a!.animStartMs).toBe(0);
    expect(a!.endMs).toBe(Math.ceil(2000 / tick) * tick);
    expect(b!.animStartMs).toBe(a!.endMs + 500 + 2 * tick);
    expect(b!.endMs).toBe(Math.ceil((b!.animStartMs + 2500) / tick) * tick + tick);
    expect(c!.endMs).toBe(Math.ceil((c!.animStartMs + 4000) / tick) * tick);
  });

  it('transição em quadros do export (30/s × 33 ms): 1 s = 30 quadros = 990 ms', () => {
    const tl = buildPlaybackTimeline([model(1000, [], 'fade', 500), model(1000, [], 'push', 1000)], { tickMs: 33, transitionFps: 30 });
    expect(tl.slides[0]!.transitionMs).toBe(15 * 33);
    expect(tl.slides[1]!.transitionMs).toBe(30 * 33);
  });

  it('export: duração PADRÃO (sem advTm) conta quadros a 30/s; intervalo gravado conta ticks', () => {
    const tl = buildPlaybackTimeline([model(undefined, [], 'fade', 750), model(3000, [], 'fade', 750)], { tickMs: 33, transitionFps: 30, defaultSlideMs: 3000 });
    const s0 = tl.slides[0]!, s1 = tl.slides[1]!;
    expect(s0.endMs - s0.startMs).toBe((23 + 2 + 90) * 33); // medido: 115 quadros (showcase)
    expect(s1.endMs - s1.startMs).toBe((23 + 2 + 91) * 33); // advTm 3000 → ceil(3000/33)
  });

  it('export: 1º slide com corte seco começa após 1 quadro preto', () => {
    const tl = buildPlaybackTimeline([model(1000, [], 'cut', 0), model(1000, [], 'cut', 0)], { tickMs: 33, transitionFps: 30 });
    expect(tl.slides[0]!.transitionMs).toBe(33);
    expect(tl.slides[0]!.endMs).toBe(34 * 33); // medido: 2º slide no quadro 34
    expect(tl.slides[1]!.transitionMs).toBe(0);
    expect(buildPlaybackTimeline([model(1000, [], 'cut', 0)]).slides[0]!.transitionMs).toBe(0); // tempo real: sem quadro preto
  });

  it('"cortar pelo preto" tem duração; corte seco não', () => {
    const blk = model(1000, [], 'cut', 2000);
    blk.transition!.attrs = { thruBlk: '1' };
    const tl = buildPlaybackTimeline([model(1000, [], 'fade'), blk]);
    expect(tl.slides[1]!.transitionMs).toBe(2000);
  });

  it('estado no instante t: transição em curso, origem e progresso', () => {
    const tl = buildPlaybackTimeline([model(1000, []), model(1000, [])]);
    const st = playbackStateAt(tl, 1500 + 250);
    expect(st.slide!.index).toBe(1);
    expect(st.from!.index).toBe(0);
    expect(st.transitionProgress).toBeCloseTo(0.5, 6);
    expect(st.animMs).toBeLessThan(0);
    const end = playbackStateAt(tl, 1e9);
    expect(end.ended).toBe(true);
    expect(end.slide!.index).toBe(1);
  });
});

describe('visibilidade das shapes (shapeOpacityAt)', () => {
  const eff = (cls: 'entr' | 'exit', t0: number, durMs: number, extra: object = {}) =>
    ({ presetClass: cls, presetId: 10, presetSubtype: 0, startMs: t0, durMs, blockMs: durMs, t0, step: 0, node: { tag: 'par', st: [], children: [] }, target: { spid: '3' }, ...extra });

  it('entrada esmaecer: oculta antes, rampa durante, visível depois', () => {
    const e = [eff('entr', 1000, 1000, { filter: 'fade' })];
    expect(shapeOpacityAt(e, ['3'], -100)).toBe(0);
    expect(shapeOpacityAt(e, ['3'], 1500)).toBeCloseTo(0.5, 6);
    expect(shapeOpacityAt(e, ['3'], 2500)).toBe(1);
    expect(shapeOpacityAt(e, ['9'], -100)).toBe(1); // outra shape: intocada
  });

  it('saída sem filtro some no FIM; retroceder (fill=remove) volta ao estado anterior', () => {
    const out = [eff('exit', 0, 500)];
    expect(shapeOpacityAt(out, ['3'], 250)).toBe(1);
    expect(shapeOpacityAt(out, ['3'], 600)).toBe(0);
    const rewind = [eff('entr', 0, 1000, { filter: 'fade', fill: 'remove' })];
    expect(shapeOpacityAt(rewind, ['3'], 500)).toBeCloseTo(0.5, 6);
    expect(shapeOpacityAt(rewind, ['3'], 1200)).toBe(0);
  });

  it('alvo de grupo (groupIds) e parágrafos que não re-ocultam a shape', () => {
    expect(shapeOpacityAt([eff('entr', 0, 100)], ['7', '3'], -1)).toBe(0);
    const paras = [eff('entr', 0, 100, { target: { spid: '3', pRange: [0, 0] } }), eff('entr', 500, 100, { filter: 'fade', target: { spid: '3', pRange: [1, 1] } })];
    expect(shapeOpacityAt(paras, ['3'], 550)).toBe(1);
  });
});

describe('mídia na reprodução (media.ts)', () => {
  const cmdFx = (spid: string, cmd: string, t0: number, dur = 4000) => ({
    presetClass: 'mediacall', presetId: 1, presetSubtype: 0, startMs: 0, durMs: dur, blockMs: dur, t0, step: 0,
    node: { tag: 'par', st: [], children: [{ tag: 'cmd', st: [{ delayMs: 0 }], cmd, dur, target: { spid }, children: [] }] },
    target: { spid },
  }) as unknown as PlacedEffect;

  it('playFrom inicia; antes do comando = capa; depois anda em tempo real', () => {
    const fx = [cmdFx('3', 'playFrom(0.0)', 500)];
    expect(mediaStateAt(fx, '3', 200).started).toBe(false);
    const st = mediaStateAt(fx, '3', 1500);
    expect(st.started && st.playing).toBe(true);
    expect(st.timeSec).toBeCloseTo(1, 6);
    expect(st.durMs).toBe(4000);
    expect(mediaStateAt(fx, '4', 1500).started).toBe(false);
  });

  it('pause/resume/togglePause/stop', () => {
    const fx = [cmdFx('3', 'playFrom(1.5)', 0), cmdFx('3', 'togglePause', 1000, 1), cmdFx('3', 'togglePause', 3000, 1), cmdFx('3', 'stop', 5000, 1)];
    expect(mediaStateAt(fx, '3', 2000)).toMatchObject({ playing: false, timeSec: 2.5 });
    expect(mediaStateAt(fx, '3', 4000).timeSec).toBeCloseTo(3.5, 6);
    expect(mediaStateAt(fx, '3', 6000)).toMatchObject({ started: false, playing: false, timeSec: 0 });
  });

  it('GIF: quadro por atraso, repetição e atraso mínimo', () => {
    expect(gifFrameAt([100, 100, 100], 0)).toBe(0);
    expect(gifFrameAt([100, 100, 100], 150)).toBe(1);
    expect(gifFrameAt([100, 100, 100], 350)).toBe(0); // volta ao início
    expect(gifFrameAt([100, 100, 100], 350, 0)).toBe(2); // sem repetição: congela no último
    expect(gifFrameAt([0, 0], 150)).toBe(1); // atraso 0 vale 100 ms
  });
});
