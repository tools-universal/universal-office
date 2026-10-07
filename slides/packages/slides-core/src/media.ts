import { beginOffset, type TimeNode } from './timing.js';
import type { PlacedEffect } from './playback.js';

/**
 * MÍDIA NA REPRODUÇÃO — vídeo/áudio (`<p:pic>` com `p14:media`) e GIF animado.
 *
 * Vídeo e áudio tocam por COMANDOS na árvore de tempo: `<p:cmd type="call"
 * cmd="playFrom(s)">`, `pause`, `resume`, `togglePause`, `stop` — efeitos
 * `presetClass="mediacall"`, em geral um passo da sequência principal (o
 * "iniciar automaticamente" do app). Medido no oráculo (export de vídeo): a
 * forma mostra a CAPA (o blip do `<p:pic>`) até o comando; a mídia toca em
 * tempo real; ao terminar, CONGELA no último quadro (fill hold).
 *
 * GIF animado: começa a andar quando a transição de entrada termina e
 * repete conforme o próprio arquivo (atraso por quadro, nº de repetições).
 *
 * Export de vídeo do app (medido com vídeo/GIF de código de barras por
 * quadro): o vídeo começa 2 TICKS após o comando e anda 1/30 s por quadro
 * exportado (o mesmo relógio das transições); o nó de mídia termina em
 * comando + duração (nesse relógio), então o vídeo congela ~2 quadros antes
 * do fim do arquivo. O GIF anda desde o início das animações do slide,
 * também 1/30 s por quadro.
 *
 * Funções PURAS — quem tem os elementos de mídia (viewer) decide como buscar
 * o quadro (tempo real ou busca exata, p/ captura determinística).
 */

/** Relógio da mídia: latência de partida e escala (export de vídeo). */
export interface MediaClock {
  /** Atraso entre o comando e o 1º quadro (ms da linha do tempo). Default 0. */
  latencyMs?: number;
  /** ms de mídia por ms da linha do tempo. Default 1. */
  scale?: number;
}

/** Comando de mídia num instante absoluto de animação do slide. */
export interface MediaCommand {
  atMs: number;
  /** `playFrom(0.0)`, `pause`, `resume`, `togglePause`, `stop`… */
  cmd: string;
  /** `dur` do comando (o app grava a duração da mídia no playFrom), ms. */
  durMs?: number;
}

/** Estado de reprodução de uma mídia num instante. */
export interface MediaPlayState {
  /** Algum `playFrom` já disparou (antes disso: quadro de capa). */
  started: boolean;
  /** Tocando agora. */
  playing: boolean;
  /** Posição desejada (s) — sem limitar pela duração da mídia. */
  timeSec: number;
  /** Duração da mídia segundo o arquivo (ms), quando conhecida. */
  durMs?: number;
  /** O nó de mídia ACABOU (≠ pausado): vale "retroceder" / "ocultar quando parado". */
  ended?: boolean;
}

/** Comandos (`<p:cmd>`) dos efeitos colocados que miram a forma `spid`, em ordem. */
export function mediaCommands(effects: readonly PlacedEffect[], spid: string): MediaCommand[] {
  const out: MediaCommand[] = [];
  const walk = (n: TimeNode, t: number): void => {
    if (n.tag === 'cmd') {
      if (n.cmd && n.target?.spid === spid) {
        const c: MediaCommand = { atMs: t, cmd: n.cmd };
        if (n.dur !== undefined && Number.isFinite(n.dur)) c.durMs = n.dur;
        out.push(c);
      }
      return;
    }
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b !== null) walk(c, t + b);
    }
  };
  for (const e of effects) walk(e.node, e.t0);
  return out.sort((a, b) => a.atMs - b.atMs);
}

/**
 * Estado da mídia `spid` no tempo de animação `animMs` (Infinity = fim do slide).
 * `loop` ("repetir até parar"): o nó de mídia não acaba em comando + duração —
 * a mídia segue até o fim do arquivo (quem toca decide se volta ao início).
 */
export function mediaStateAt(effects: readonly PlacedEffect[], spid: string, animMs: number, clock: MediaClock = {}, loop = false): MediaPlayState {
  const k = clock.scale ?? 1, lat = clock.latencyMs ?? 0;
  let started = false, playing = false, pos = 0, since = 0;
  let durMs: number | undefined, startAt = 0;
  for (const c of mediaCommands(effects, spid)) {
    if (c.atMs > animMs) break;
    const m = /^playFrom\(\s*(-?[\d.]+)\s*\)$/.exec(c.cmd);
    if (m) {
      started = true; playing = true; pos = Math.max(0, parseFloat(m[1]!)); since = c.atMs + lat; startAt = c.atMs;
      if (c.durMs !== undefined) durMs = c.durMs;
      continue;
    }
    switch (c.cmd) {
      case 'pause':
        if (playing) { pos += (Math.max(0, c.atMs - since) * k) / 1000; playing = false; }
        break;
      case 'resume':
        if (started && !playing) { playing = true; since = c.atMs + lat; }
        break;
      case 'togglePause':
        if (playing) { pos += (Math.max(0, c.atMs - since) * k) / 1000; playing = false; }
        else if (started) { playing = true; since = c.atMs + lat; }
        break;
      case 'stop':
        started = false; playing = false; pos = 0;
        break;
      default: break;
    }
  }
  let timeSec = playing ? pos + (Math.max(0, animMs - since) * k) / 1000 : pos;
  // o nó de mídia acaba em comando + duração (no relógio da mídia): congela ali
  let ended = false;
  if (playing && !loop && durMs !== undefined && (animMs - startAt) * k >= durMs) {
    playing = false; ended = true;
    timeSec = Math.min(timeSec, pos + (durMs - lat * k) / 1000);
  }
  const st: MediaPlayState = { started, playing, timeSec };
  if (ended) st.ended = true;
  if (durMs !== undefined) st.durMs = durMs;
  return st;
}

/**
 * Opacidade do vídeo com esmaecer (`p14:fade`) — o vídeo surge/some SOBRE a
 * capa: `playedMs` = quanto já tocou, `lenMs` = duração tocada (com corte).
 * Medido: depois do esmaecer de saída fica a capa.
 */
export function mediaFadeAlpha(fade: { inMs: number; outMs: number } | undefined, playedMs: number, lenMs: number | undefined): number {
  if (!fade) return 1;
  let a = 1;
  if (fade.inMs > 0) a = Math.min(a, Math.max(0, playedMs / fade.inMs));
  if (fade.outMs > 0 && lenMs !== undefined && Number.isFinite(lenMs)) a = Math.min(a, Math.max(0, (lenMs - playedMs) / fade.outMs));
  return a;
}

/**
 * Quadro de um GIF animado após `elapsedMs`. `delaysMs` = atraso de cada
 * quadro (≤ 10 ms vale 100 ms, como nos navegadores e no app); `repeat` =
 * repetições ALÉM da 1ª passada (Infinity = sempre). Depois da última, fica
 * no último quadro.
 */
export function gifFrameAt(delaysMs: readonly number[], elapsedMs: number, repeat = Infinity): number {
  const n = delaysMs.length;
  if (n <= 1 || !(elapsedMs > 0)) return 0;
  const d = delaysMs.map((x) => (x > 10 ? x : 100));
  const total = d.reduce((a, b) => a + b, 0);
  const round = Math.floor(elapsedMs / total);
  if (round > repeat) return n - 1;
  let t = elapsedMs - round * total;
  for (let i = 0; i < n; i++) {
    if (t < d[i]!) return i;
    t -= d[i]!;
  }
  return n - 1;
}
