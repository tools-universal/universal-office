import type { AnimStep, EffectTiming, SlideTimingModel, SlideTransitionInfo } from './timing.js';
import { mediaCommands } from './media.js';

/**
 * Linha do tempo da REPRODUÇÃO AUTOMÁTICA (apresentação com intervalos, como
 * o export de vídeo / quiosque do app de referência). Função PURA do modelo
 * de tempo de cada slide: dado `t` (ms desde o início), diz qual slide está
 * na tela, o progresso da transição e o estado de cada efeito — o viewer só
 * pinta. Determinística: o lab de playback captura quadro a quadro com
 * relógio virtual e compara com o vídeo do app de referência.
 *
 * Semântica medida (tools/ppt-lab/playback/FINDINGS.md):
 *  - o slide começa pela transição de entrada (o 1º slide, a partir do preto);
 *    as animações começam quando ela termina;
 *  - D = `advTm` (se usar intervalos e houver) senão `defaultSlideMs`;
 *  - passos por CLIQUE disparam sozinhos: o tempo que sobra, max(0, D − A)
 *    (A = soma das durações dos passos), é dividido em K+1 esperas iguais
 *    (K = nº de passos por clique) — antes de cada clique e depois do último;
 *  - se as animações passam de D, o slide espera elas terminarem;
 *  - slides ocultos (`show="0"`) são pulados;
 *  - export de vídeo (medido): a linha do tempo anda `tickMs` = 33 ms por
 *    quadro (10 s de intervalo = 303 quadros), mas a TRANSIÇÃO conta quadros
 *    a 30/s (1 s = 30 quadros = 990 ms de vídeo) — `transitionFps`;
 *  - as animações começam 2 ticks após o fim da transição (inclusive corte
 *    seco; não no 1º slide sem transição); o slide acaba em animStart +
 *    max(D, A) arredondado p/ o próximo quadro, +1 tick quando A ≥ D;
 *  - "cortar pelo preto" (`<p:cut thruBlk="1">`) dura `durMs`: metade no
 *    slide anterior, metade em preto.
 */

export interface PlaybackOptions {
  /** Usa os intervalos gravados (`advTm`). Default true. */
  useTimings?: boolean;
  /** Duração de slides SEM intervalo (ms) — "segundos em cada slide" do export. Default 5000. */
  defaultSlideMs?: number;
  /**
   * Tick de render do app de referência (ms) — latência das trocas de fase
   * (ver acima). 0 = contínuo. Export de vídeo a 30 fps = 33; ao vivo ≈ 1000/60.
   */
  tickMs?: number;
  /**
   * Taxa de quadros das TRANSIÇÕES no export de vídeo: a transição dura
   * round(dur·fps/1000) quadros de `tickMs` cada. Ausente = tempo real.
   */
  transitionFps?: number;
}

export interface PlacedEffect extends EffectTiming {
  /** Início relativo ao INÍCIO DAS ANIMAÇÕES do slide (fim da transição), ms. */
  t0: number;
  /** Passo (índice em `SlideTimingModel.steps`); −1 = disparado por marcador de mídia. */
  step: number;
  /**
   * Fim forçado (mesma base de `t0`): "até o próximo clique" termina quando o
   * passo seguinte dispara (ou no fim do slide). Ausente = fim natural.
   */
  endAt?: number;
}

export interface PlaybackSlide {
  /** Índice do slide no deck (0-based). */
  index: number;
  /** Início absoluto (ms) — começo da transição de entrada. */
  startMs: number;
  transition: SlideTransitionInfo | null;
  /** Duração efetiva da transição (0 = corte seco / sem transição). */
  transitionMs: number;
  /** Início absoluto das animações (= fim da transição). */
  animStartMs: number;
  /** Início absoluto de cada passo. */
  stepStartMs: number[];
  /** Fim absoluto (= início do próximo slide). */
  endMs: number;
  effects: PlacedEffect[];
}

export interface PlaybackTimeline {
  slides: PlaybackSlide[];
  durationMs: number;
  /** Tick do relógio emulado (export de vídeo), ms; 0 = tempo real. */
  tickMs: number;
  /**
   * Relógio de MÍDIA (vídeo/GIF) por ms da linha do tempo: no export a mídia
   * anda 1/fps por quadro (como a transição) — (1000/fps)/tickMs; 1 = real.
   */
  mediaClock: number;
}

/** Transições sem animação de quadro (troca seca). "Cortar pelo preto" tem duração (preto). */
export function instantTransition(tr: SlideTransitionInfo | undefined): boolean {
  if (!tr || tr.type === 'none') return true;
  if (tr.type === 'cut') return !(tr.attrs['thruBlk'] === '1' || tr.attrs['thruBlk'] === 'true');
  return false;
}

/**
 * Início de passo AINDA NÃO DISPARADO (apresentação por clique): longe o
 * bastante para nunca chegar — o efeito fica no estado inicial (entrada
 * oculta). Passos pendentes ficam em ordem (`+ passo · 1e7`).
 */
export const STEP_PENDING = 1e12;

/**
 * Efeitos de UM slide posicionados no tempo de animação (ms desde o início
 * das animações), dados os inícios dos passos na mesma base — `undefined` =
 * passo ainda não disparado. `endMs` (mesma base) encerra os "até o próximo
 * clique" do último passo. Compartilhado pela reprodução automática
 * (`buildPlaybackTimeline`) e pela apresentação por clique (`SlideShow`).
 */
export function placeSlideEffects(model: SlideTimingModel, stepStartMs: readonly (number | undefined)[], endMs: number,
  clock: { tickMs?: number; mediaClock?: number } = {}): PlacedEffect[] {
  const steps = model.steps;
  const startOf = (si: number): number => stepStartMs[si] ?? STEP_PENDING + si * 1e7;
  const effects: PlacedEffect[] = [];
  steps.forEach((st, si) => {
    // "até o próximo clique": acaba quando o passo seguinte começa (senão, no fim do slide)
    const next = si + 1 < steps.length ? startOf(si + 1) : endMs;
    const start = startOf(si);
    for (const e of st.effects) {
      const pe: PlacedEffect = { ...e, t0: start + e.startMs, step: si };
      if (e.endOnNext) pe.endAt = next;
      effects.push(pe);
    }
  });
  // marcadores de mídia: o efeito dispara quando a mídia passa pelo ponto
  // (comando playFrom + latência do export + posição do marcador no relógio da mídia)
  const tick = clock.tickMs ?? 0;
  const clockScale = clock.mediaClock ?? 1;
  for (const bt of model.bookmarkTriggers ?? []) {
    if (bt.timeMs === undefined) continue;
    const play = mediaCommands(effects, bt.spid).find((c) => c.cmd.startsWith('playFrom'));
    if (!play) continue;
    const from = parseFloat(/playFrom\(\s*(-?[\d.]+)/.exec(play.cmd)?.[1] ?? '0') * 1000;
    const mediaMs = bt.timeMs - (bt.trimStartMs ?? 0) - from;
    if (mediaMs < 0 || (play.durMs !== undefined && mediaMs > play.durMs)) continue;
    const at = play.atMs + (tick > 0 ? 2 * tick : 0) + mediaMs / clockScale;
    for (const e of bt.effects) effects.push({ ...e, t0: at + e.startMs, step: -1 });
  }
  return effects;
}

/**
 * Espera antes de cada passo "ao clicar" num slide com intervalo D: o que
 * sobra, max(0, D − A) (A = soma das durações dos passos), em K+1 esperas
 * iguais (K = passos por clique) — antes de cada clique e depois do último.
 * Medido no export de vídeo e na apresentação ao vivo (f5-probe.ps1).
 */
export function clickWait(steps: readonly AnimStep[], D: number): number {
  const total = steps.reduce((s, st) => s + st.durMs, 0);
  const clicks = steps.filter((s) => !s.auto).length;
  return Math.max(0, D - total) / (clicks + 1);
}

/** Monta a linha do tempo absoluta da apresentação (slides visíveis). */
export function buildPlaybackTimeline(models: (SlideTimingModel | undefined)[], opts: PlaybackOptions = {}): PlaybackTimeline {
  const useTimings = opts.useTimings ?? true;
  const defaultMs = opts.defaultSlideMs ?? 5000;
  const tick = Math.max(0, opts.tickMs ?? 0);
  // relógio da mídia por ms da linha do tempo (export: 1/fps por quadro de tickMs)
  const mediaClock = opts.transitionFps && tick > 0 ? 1000 / opts.transitionFps / tick : 1;
  const slides: PlaybackSlide[] = [];
  let cursor = 0;
  models.forEach((m, index) => {
    const model: SlideTimingModel = m ?? { steps: [], interactive: [], hidden: false };
    if (model.hidden) return;
    const tr = model.transition;
    let transitionMs = instantTransition(tr) ? 0 : Math.max(0, tr!.durMs);
    // quadros da transição: meio quadro arredonda p/ BAIXO (medido: 0,75 s = 22 quadros, não 23)
    if (transitionMs > 0 && opts.transitionFps && tick > 0) transitionMs = Math.ceil((transitionMs * opts.transitionFps) / 1000 - 0.5) * tick;
    // export: o 1º quadro do vídeo é sempre PRETO — 1º slide com corte seco
    // entra 1 tick depois (o corte "do preto" dura 1 quadro)
    if (slides.length === 0 && tick > 0 && tr?.type === 'cut' && transitionMs === 0) transitionMs = tick;
    const startMs = cursor;
    // 1º slide sem transição começa direto; senão as animações esperam 2 ticks
    const hasPhase = slides.length > 0 || (tr !== undefined && tr.type !== 'none');
    const animStartMs = startMs + transitionMs + (hasPhase ? 2 * tick : 0);
    const D = useTimings && tr?.advTmMs !== undefined ? tr.advTmMs : defaultMs;
    const steps: AnimStep[] = model.steps;
    const total = steps.reduce((s, st) => s + st.durMs, 0);
    const wait = clickWait(steps, D);
    const stepStartMs: number[] = [];
    let t = animStartMs;
    for (const st of steps) {
      if (!st.auto) t += wait;
      stepStartMs.push(t);
      t += st.durMs;
    }
    t += wait;
    // fim: o próximo slide começa num QUADRO inteiro (arredonda p/ cima no tick);
    // +1 tick quando as animações passam do intervalo (o slide espera a cadeia)
    if (tick > 0) t = Math.ceil(t / tick - 1e-9) * tick;
    if (steps.length && total >= D) t += tick;
    const effects = placeSlideEffects(model, stepStartMs.map((s) => s - animStartMs), t - animStartMs, { tickMs: tick, mediaClock });
    slides.push({
      index, startMs, transition: tr ?? null, transitionMs, animStartMs, stepStartMs, endMs: t, effects,
    });
    cursor = t;
  });
  return { slides, durationMs: cursor, tickMs: tick, mediaClock };
}

export interface PlaybackState {
  /** Posição em `timeline.slides` (-1 sem slides). */
  pos: number;
  /** Slide em cena (posição em timeline.slides). */
  slide?: PlaybackSlide;
  /** Slide anterior (origem da transição), quando a transição está em curso. */
  from?: PlaybackSlide;
  /** Progresso 0..1 da transição de entrada (1 = concluída). */
  transitionProgress: number;
  /** Tempo da timeline de animação do slide (t − animStartMs); < 0 durante a transição. */
  animMs: number;
  /** t passou do fim da apresentação. */
  ended: boolean;
}

/** Estado da apresentação no instante `t` (ms). Após o fim, congela no último quadro. */
export function playbackStateAt(tl: PlaybackTimeline, t: number): PlaybackState {
  const n = tl.slides.length;
  if (n === 0) return { pos: -1, transitionProgress: 1, animMs: 0, ended: true };
  const ended = t >= tl.durationMs;
  const tt = Math.max(0, Math.min(t, tl.durationMs));
  let pos = n - 1;
  for (let i = 0; i < n; i++) {
    if (tt < tl.slides[i]!.endMs) { pos = i; break; }
  }
  const slide = tl.slides[pos]!;
  const local = tt - slide.startMs;
  const st: PlaybackState = {
    pos, slide,
    transitionProgress: slide.transitionMs > 0 ? Math.max(0, Math.min(1, local / slide.transitionMs)) : 1,
    animMs: ended ? Infinity : tt - slide.animStartMs,
    ended,
  };
  if (st.transitionProgress < 1 && pos > 0) st.from = tl.slides[pos - 1];
  return st;
}

/** Efeito que encaixa em "aparecer/sumir com rampa de opacidade" na v1. */
function ramps(e: PlacedEffect): boolean {
  return e.filter !== undefined;
}

/**
 * Opacidade (0..1) de uma shape no tempo de animação `animMs` do slide.
 * `ids` = id da shape + ids dos grupos que a contêm (alvo pode ser o grupo).
 *
 * v1 (visibilidade): estado inicial OCULTO se o primeiro efeito de
 * visibilidade da shape é de entrada; entradas/saídas com filtro
 * (`animEffect`: fade, wipe, …) viram rampa de opacidade, as demais
 * (aparecer, surgir, zoom…) trocam no início (entrada) / no fim (saída);
 * `fill="remove"` (retroceder ao terminar) volta ao estado anterior.
 * Alvos de TEXTO por parágrafo/letra só podem revelar a shape (nunca
 * re-ocultam): a v1 não pinta parágrafos separados.
 */
export function shapeOpacityAt(effects: PlacedEffect[], ids: readonly string[], animMs: number): number {
  const mine = effects
    .filter((e) => e.target && ids.includes(e.target.spid) && (e.presetClass === 'entr' || e.presetClass === 'exit'))
    .sort((a, b) => a.t0 - b.t0);
  if (mine.length === 0) return 1;
  let op = mine[0]!.presetClass === 'entr' ? 0 : 1;
  for (const e of mine) {
    if (animMs < e.t0) break;
    const partial = e.target?.pRange !== undefined || e.target?.charRange !== undefined;
    const end = e.t0 + e.durMs;
    const before = op;
    let v: number;
    if (animMs < end) {
      const p = e.durMs > 0 ? (animMs - e.t0) / e.durMs : 1;
      v = e.presetClass === 'entr' ? (ramps(e) ? p : 1) : (ramps(e) ? 1 - p : 1);
      op = partial && e.presetClass === 'entr' ? Math.max(before, v) : partial ? before : v;
      break;
    }
    if (e.fill === 'remove') v = before;
    else v = e.presetClass === 'entr' ? 1 : 0;
    op = partial && e.presetClass === 'entr' ? Math.max(before, v) : partial ? before : v;
  }
  return op;
}
