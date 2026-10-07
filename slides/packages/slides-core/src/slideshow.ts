import type { SlideTimingModel, SlideTransitionInfo } from './timing.js';
import { clickWait, instantTransition, placeSlideEffects, STEP_PENDING, type PlaybackSlide } from './playback.js';

/**
 * APRESENTAÇÃO POR CLIQUE — o F5 do app de referência: o apresentador dá o
 * ritmo. Máquina de estados PURA: todo comando recebe `now` (ms, no relógio
 * do chamador) e o quadro é função de (estado, now). O viewer só repassa a
 * entrada e pinta com o mesmo motor da reprodução automática
 * (`PlaybackSlide` + efeitos posicionados).
 *
 * Semântica MEDIDA no app ao vivo (tools/ppt-lab/playback/f5-probe.ps1):
 *  - entrar num slide (avançando ou pulando): transição de entrada (o 1º, a
 *    partir do preto); o relógio do slide começa no FIM dela, com o passo
 *    automático ("com/após a anterior");
 *  - slide COM intervalo (`advTm`, com `useTimings`): os passos "ao clicar"
 *    disparam SOZINHOS nos horários do export de vídeo (`clickWait`) e o
 *    slide avança em max(D, A) desde o início das animações. O clique manual
 *    só ANTECIPA o próximo passo — os horários dos demais e o avanço ficam;
 *  - slide SEM intervalo: os passos esperam o clique; não avança sozinho;
 *  - comando durante uma transição (de ida ou de volta) → ela conclui na hora;
 *  - `next` sem passo pendente → próximo slide VISÍVEL (ocultos pulados);
 *    depois do último, a tela de fim; nela, `next` sai. Clique do MOUSE não
 *    troca de slide com "avançar ao clicar" desligado (`advClick="0"`); o
 *    teclado troca;
 *  - `prev`: slide sem intervalo → desfaz o último passo (um por vez); slide
 *    com intervalo → REBOBINA (todos os passos por clique) e o relógio para
 *    até o próximo clique, que o recomeça do zero; sem passo a desfazer → o
 *    slide visível anterior, no estado FINAL, pela transição do slide que
 *    SAI tocada no sentido contrário — e ali ele não avança mais sozinho;
 *  - sequências interativas (gatilho = clique numa forma): ainda não.
 */

export interface SlideShowOptions {
  /** Usa os intervalos gravados (`advTm`): passos e avanço sozinhos. Default true. */
  useTimings?: boolean;
  /** Depois do último slide volta ao primeiro (em vez da tela de fim). Default false. */
  loop?: boolean;
}

/**
 * O que um comando fez: `transition` = concluiu a transição em curso;
 * `step` = disparou/desfez passo(s); `slide` = trocou de slide; `end` = foi
 * para a tela de fim; `exit` = o apresentador saiu (comando na tela de fim);
 * `none` = nada a fazer.
 */
export type SlideShowAction = 'none' | 'transition' | 'step' | 'slide' | 'end' | 'exit';

/** Origem de uma transição: slide anterior congelado no tempo de animação `animMs`. */
export interface SlideShowOrigin {
  slide: PlaybackSlide;
  animMs: number;
  /** Identifica a passagem pelo slide (cache da imagem de origem). */
  key: number;
}

/** Quadro da apresentação num instante. */
export interface SlideShowFrame {
  /** Slide em cena; null na tela de fim. */
  slide: PlaybackSlide | null;
  /** Tempo de animação do slide (ms desde o fim da transição; < 0 durante ela). */
  animMs: number;
  /** Progresso 0..1 da transição em curso (1 = concluída). */
  transitionProgress: number;
  /** Origem da transição em curso; null = do preto (ou sem transição). */
  from: SlideShowOrigin | null;
  /** Tela de fim ("Fim da apresentação de slides"). */
  ended: boolean;
}

/** Horários de um slide com intervalo, relativos à base (`Run.anchor`). */
interface Schedule {
  /** Início de cada passo (o automático em 0). */
  steps: number[];
  /** Avanço para o próximo slide. */
  end: number;
}

/** Uma passagem por um slide. */
interface Run {
  serial: number;
  index: number;
  model: SlideTimingModel;
  /** Transição desta passagem (na volta: a do slide que saiu, espelhada). */
  transition: SlideTransitionInfo | undefined;
  /** Início absoluto da transição. */
  startAt: number;
  transitionMs: number;
  /** Instante absoluto em que cada passo disparou (undefined = pendente). */
  stepAt: (number | undefined)[];
  /** Passos disparados (inclui o automático). */
  fired: number;
  /** Horários do intervalo; null = slide sem intervalo. */
  sched: Schedule | null;
  /** Base absoluta dos horários; null = relógio parado (volta / rebobinado). */
  anchor: number | null;
  from: SlideShowOrigin | null;
  ps: PlaybackSlide;
}

const NO_TIMING: SlideTimingModel = { steps: [], interactive: [], hidden: false };

/** Sentido contrário (medido: empurrar da direita volta pela esquerda). */
const MIRROR: Record<string, string> = { l: 'r', r: 'l', u: 'd', d: 'u', lu: 'rd', rd: 'lu', ru: 'ld', ld: 'ru' };
/** Direção padrão (sem `dir` no arquivo) dos tipos que andam numa direção. */
const DIR_DEFAULT: Record<string, string> = {
  push: 'l', cover: 'l', pull: 'l', wipe: 'l', strips: 'lu', reveal: 'l', prism: 'l',
  pan: 'l', conveyor: 'l', gallery: 'l', ferris: 'l',
};

/** A transição tocada no sentido contrário (voltar um slide). */
export function mirrorTransition(tr: SlideTransitionInfo | undefined): SlideTransitionInfo | undefined {
  if (!tr) return tr;
  const dir = tr.attrs['dir'] ?? DIR_DEFAULT[tr.type];
  const m = dir !== undefined ? MIRROR[dir] : undefined;
  return m ? { ...tr, attrs: { ...tr.attrs, dir: m } } : tr;
}

export class SlideShow {
  private readonly useTimings: boolean;
  private readonly loop: boolean;
  /** Passagem em cena; null = tela de fim. */
  private run: Run | null = null;
  private serial = 0;
  /** Último slide antes da tela de fim (para voltar dela). */
  private lastIndex = -1;

  /**
   * Começa em `from` (índice no deck; um slide oculto também, se pedido
   * explicitamente), entrando pela transição a partir do preto.
   */
  constructor(private readonly models: readonly (SlideTimingModel | undefined)[], from: number, now: number,
    opts: SlideShowOptions = {}) {
    this.useTimings = opts.useTimings ?? true;
    this.loop = opts.loop ?? false;
    if (models.length) this.enter(Math.max(0, Math.min(models.length - 1, Math.trunc(from) || 0)), now, 'forward');
  }

  /** Índice (no deck) do slide em cena; -1 na tela de fim. */
  get index(): number { return this.run?.index ?? -1; }
  /** Na tela de fim. */
  get ended(): boolean { return this.run === null; }
  /** Passos por clique do slide em cena. */
  get steps(): number {
    const st = this.run?.model.steps ?? [];
    return st.length - (st[0]?.auto ? 1 : 0);
  }
  /** Passos por clique já dados no slide em cena. */
  get step(): number {
    const r = this.run;
    return r ? r.fired - (r.model.steps[0]?.auto ? 1 : 0) : 0;
  }

  /** Avança: conclui a transição, dispara o próximo passo ou troca de slide. `mouse` = veio de clique. */
  next(now: number, mouse = false): SlideShowAction {
    const r = this.run;
    if (!r) return 'exit';
    if (now < r.startAt + r.transitionMs) {
      this.finishTransition(r, now);
      return 'transition';
    }
    if (r.fired < r.model.steps.length) {
      // rebobinado: o clique recomeça o relógio do intervalo do zero
      if (r.sched && r.anchor === null) r.anchor = now;
      r.stepAt[r.fired++] = now;
      this.place(r);
      return 'step';
    }
    if (mouse && r.model.transition?.advClick === false) return 'none';
    return this.advance(now);
  }

  /** Volta: desfaz passo(s) ou vai ao slide anterior (estado final). */
  prev(now: number): SlideShowAction {
    const r = this.run;
    if (!r) {
      const last = this.lastIndex >= 0 ? this.lastIndex : this.visibleBefore(this.models.length);
      if (last < 0) return 'none';
      this.enter(last, now, 'back');
      return 'slide';
    }
    const auto = r.model.steps[0]?.auto ? 1 : 0;
    if (r.fired > auto) {
      if (r.sched) {
        // com intervalo: rebobina todos os passos por clique e para o relógio
        for (let k = auto; k < r.fired; k++) r.stepAt[k] = undefined;
        r.fired = auto;
        r.anchor = null;
      } else {
        r.stepAt[--r.fired] = undefined;
      }
      this.place(r);
      return 'step';
    }
    const p = this.visibleBefore(r.index);
    if (p < 0) return 'none';
    this.enter(p, now, 'back');
    return 'slide';
  }

  /** Pula para o slide `index` (entra pela transição, como avançando). */
  goTo(index: number, now: number): SlideShowAction {
    if (index < 0 || index >= this.models.length || index === this.run?.index) return 'none';
    this.enter(index, now, 'forward');
    return 'slide';
  }

  /** Primeiro slide visível. */
  first(now: number): SlideShowAction {
    const i = this.visibleAfter(-1);
    return i < 0 ? 'none' : this.goTo(i, now);
  }

  /** Último slide visível. */
  last(now: number): SlideShowAction {
    const i = this.visibleBefore(this.models.length);
    return i < 0 ? 'none' : this.goTo(i, now);
  }

  /**
   * Relógio do intervalo até `now`: passos vencidos disparam no horário
   * deles; com todos dados e o avanço vencido, troca de slide. Chamar a cada
   * quadro.
   */
  update(now: number): SlideShowAction {
    const r = this.run;
    if (!r || !r.sched || r.anchor === null || now < r.startAt + r.transitionMs) return 'none';
    let act: SlideShowAction = 'none';
    while (r.fired < r.model.steps.length && r.anchor + r.sched.steps[r.fired]! <= now) {
      r.stepAt[r.fired] = r.anchor + r.sched.steps[r.fired]!;
      r.fired++;
      act = 'step';
    }
    if (act === 'step') this.place(r);
    if (r.fired === r.model.steps.length && r.anchor + r.sched.end <= now) return this.advance(now);
    return act;
  }

  /** Próximo instante (absoluto) em que o relógio do intervalo age; Infinity = espera o apresentador. */
  dueAt(): number {
    const r = this.run;
    if (!r || !r.sched || r.anchor === null) return Infinity;
    return r.anchor + (r.fired < r.model.steps.length ? r.sched.steps[r.fired]! : r.sched.end);
  }

  /** Quadro no instante `now`. */
  frame(now: number): SlideShowFrame {
    const r = this.run;
    if (!r) return { slide: null, animMs: 0, transitionProgress: 1, from: null, ended: true };
    const p = r.transitionMs > 0 ? Math.max(0, Math.min(1, (now - r.startAt) / r.transitionMs)) : 1;
    return {
      slide: r.ps, animMs: now - (r.startAt + r.transitionMs), transitionProgress: p,
      from: p < 1 ? r.from : null, ended: false,
    };
  }

  /**
   * Próximo instante (absoluto) em que o quadro muda sozinho: `now` = está
   * animando (transição ou efeito em curso); Infinity = parado até o
   * apresentador. Mídia (vídeo/GIF) fica por conta de quem pinta.
   */
  wakeAt(now: number): number {
    const r = this.run;
    if (!r) return Infinity;
    const animStart = r.startAt + r.transitionMs;
    if (now < animStart) return now;
    const a = now - animStart;
    let at = this.dueAt();
    for (const e of r.ps.effects) {
      if (e.t0 >= STEP_PENDING) continue;
      if (a < e.t0) { at = Math.min(at, animStart + e.t0); continue; }
      if (a < Math.min(e.t0 + e.durMs, e.endAt ?? Infinity)) return now;
    }
    return at;
  }

  // ───────────────────────── interno ─────────────────────────

  private model(i: number): SlideTimingModel { return this.models[i] ?? NO_TIMING; }

  private visibleAfter(i: number): number {
    for (let j = i + 1; j < this.models.length; j++) if (!this.model(j).hidden) return j;
    return -1;
  }

  private visibleBefore(i: number): number {
    for (let j = i - 1; j >= 0; j--) if (!this.model(j).hidden) return j;
    return -1;
  }

  /** Horários do intervalo do slide (mesma regra do export de vídeo); null sem intervalo. */
  private schedule(model: SlideTimingModel): Schedule | null {
    const D = model.transition?.advTmMs;
    if (!this.useTimings || D === undefined) return null;
    const wait = clickWait(model.steps, D);
    const steps: number[] = [];
    let t = 0;
    for (const st of model.steps) {
      if (!st.auto) t += wait;
      steps.push(t);
      t += st.durMs;
    }
    return { steps, end: t + wait };
  }

  /** Conclui a transição em curso agora: o relógio do slide (e do intervalo) começa aqui. */
  private finishTransition(r: Run, now: number): void {
    const shift = r.startAt + r.transitionMs - now;
    r.startAt -= shift;
    for (let k = 0; k < r.stepAt.length; k++) if (r.stepAt[k] !== undefined) r.stepAt[k]! -= shift;
    if (r.anchor !== null) r.anchor -= shift;
    this.place(r);
  }

  /** Próximo slide visível; depois do último, o 1º (`loop`) ou a tela de fim. */
  private advance(now: number): SlideShowAction {
    const cur = this.run;
    if (!cur) return 'none';
    const nxt = this.visibleAfter(cur.index);
    const to = nxt >= 0 ? nxt : this.loop ? this.visibleAfter(-1) : -1;
    if (to >= 0) {
      this.enter(to, now, 'forward');
      return 'slide';
    }
    this.lastIndex = cur.index;
    this.run = null;
    return 'end';
  }

  /**
   * Nova passagem pelo slide `index`. `forward`: transição de entrada (a
   * partir do slide em cena congelado, ou do preto) + passo automático + o
   * relógio do intervalo desde o fim da transição. `back`: a transição do
   * slide que SAI, espelhada; o destino no estado FINAL (todos os passos já
   * concluídos antes de a transição começar) e sem relógio.
   */
  private enter(index: number, now: number, how: 'forward' | 'back'): void {
    const model = this.model(index);
    const steps = model.steps;
    const prev = this.run;
    const r: Run = {
      serial: ++this.serial, index, model, transition: model.transition, startAt: now, transitionMs: 0,
      stepAt: steps.map(() => undefined), fired: 0, sched: this.schedule(model), anchor: null,
      from: prev ? this.freeze(prev, now) : null, ps: undefined!,
    };
    if (how === 'forward') {
      r.transitionMs = instantTransition(model.transition) ? 0 : Math.max(0, model.transition!.durMs);
      const animStart = now + r.transitionMs;
      if (r.sched) r.anchor = animStart;
      if (steps[0]?.auto) { r.stepAt[0] = animStart; r.fired = 1; }
    } else {
      const leaving = prev?.model.transition;
      r.transition = mirrorTransition(leaving);
      r.transitionMs = instantTransition(leaving) ? 0 : Math.max(0, leaving!.durMs);
      let t = 0;
      const rel = steps.map((st) => { const s = t; t += st.durMs; return s; });
      r.stepAt = rel.map((s) => now - t - 1 + s);
      r.fired = steps.length;
    }
    this.run = r;
    this.place(r);
  }

  /** O slide em cena congelado agora (passos já dados concluídos): origem da próxima transição. */
  private freeze(r: Run, now: number): SlideShowOrigin {
    const animStart = r.startAt + r.transitionMs;
    return { slide: r.ps, animMs: Math.max(now - animStart, finiteEnd(r.ps)), key: r.serial };
  }

  /** (Re)posiciona os efeitos da passagem a partir dos passos disparados. */
  private place(r: Run): void {
    const animStart = r.startAt + r.transitionMs;
    r.ps = {
      index: r.index, startMs: r.startAt, transition: r.transition ?? null, transitionMs: r.transitionMs,
      animStartMs: animStart, stepStartMs: r.stepAt.map((t) => t ?? Infinity), endMs: Infinity,
      effects: placeSlideEffects(r.model, r.stepAt.map((t) => (t === undefined ? undefined : t - animStart)), STEP_PENDING),
    };
  }
}

/** Fim (tempo de animação) dos efeitos FINITOS já disparados; 0 sem efeitos. */
function finiteEnd(ps: PlaybackSlide): number {
  let m = 0;
  for (const e of ps.effects) {
    if (e.t0 < STEP_PENDING && Number.isFinite(e.durMs)) m = Math.max(m, e.t0 + e.durMs);
  }
  return m;
}
