// Regras puras da frente NAVEGAÇÃO (régua, Painel de Navegação, busca), sem
// DOM: o <universal-write> as usa e os testes as exercitam direto. Fatos do
// Word medidos em write/tools/nav-lab (memória word-ruler-nav-facts).
import type { IndSpec, ParaProps, ParaTabStop, TabLeader, TabSpec } from '@universal-office/docx-core';

/** Tabulação efetiva de um parágrafo (o que a régua mostra e o diálogo lista). */
export interface TabStopInfo {
  /** posição em twips a partir da borda esquerda do quadro do parágrafo */
  pos: number;
  align: 'left' | 'center' | 'right' | 'decimal' | 'bar';
  leader?: TabLeader;
}

/** Recuos efetivos de um parágrafo (twips; firstLine < 0 = deslocamento). */
export interface IndentInfo {
  left: number;
  right: number;
  firstLine: number;
}

/** Tabulação do pPr tipado → a da régua (num vira esquerda; clear não chega aqui). */
export function tabInfo(t: TabSpec): TabStopInfo {
  const align = t.val === 'center' || t.val === 'right' || t.val === 'decimal' || t.val === 'bar' ? t.val : 'left';
  return { pos: Math.round(t.pos), align, ...(t.leader && t.leader !== 'none' ? { leader: t.leader } : {}) };
}

const sameTab = (a: TabSpec, b: TabStopInfo): boolean =>
  Math.round(a.pos) === b.pos && tabInfo(a).align === b.align && (tabInfo(a).leader ?? '') === (b.leader ?? '');

/**
 * Tabulações DIRETAS mínimas que levam as herdadas (estilo/numeração) às
 * efetivas pedidas, como o Word grava (oráculo nav-lab):
 *  - tabulação igual à herdada na mesma posição não é gravada (tab-same-as-style);
 *  - herdada com outro tipo/preenchimento: grava a nova, sem clear (tab-retype-style);
 *  - herdada que sumiu: `clear` na posição dela (tab-clear-style, tab-clearall-style);
 *  - em ordem de posição (tab-order, tab-move-style). Nada a gravar: undefined.
 */
export function tabsDirect(inherited: readonly TabSpec[] | undefined, wanted: readonly TabStopInfo[]): ParaTabStop[] | undefined {
  const inh = (inherited ?? []).filter((t) => t.val !== 'clear');
  const out: ParaTabStop[] = [];
  const want = dedupeTabs(wanted);
  for (const w of want) {
    const h = inh.find((t) => Math.round(t.pos) === w.pos);
    if (h && sameTab(h, w)) continue;
    out.push({ posTwips: w.pos, align: w.align, ...(w.leader ? { leader: w.leader } : {}) });
  }
  for (const h of inh) {
    const pos = Math.round(h.pos);
    if (!want.some((w) => w.pos === pos)) out.push({ posTwips: pos, align: 'clear' });
  }
  out.sort((a, b) => a.posTwips - b.posTwips);
  return out.length ? out : undefined;
}

/** Uma tabulação por posição (a última vence), em ordem. */
export function dedupeTabs(tabs: readonly TabStopInfo[]): TabStopInfo[] {
  const m = new Map<number, TabStopInfo>();
  for (const t of tabs) m.set(Math.round(t.pos), { ...t, pos: Math.round(t.pos) });
  return [...m.values()].sort((a, b) => a.pos - b.pos);
}

/**
 * Recuos DIRETOS mínimos: cada atributo (esquerdo, direito, primeira linha /
 * deslocamento) só vai se difere do herdado; igual ao herdado sai (o Word tira
 * o w:ind inteiro quando nada sobra — oráculo nav-lab ind-to-zero,
 * ind-style-same, ind-style-zero, ind-list, ind-list-first).
 */
export function indentsDirect(inherited: IndSpec | undefined, want: IndentInfo): Pick<ParaProps, 'indentLeftTwips' | 'indentRightTwips' | 'indentFirstLineTwips'> {
  const inh = inherited ?? {};
  const l = Math.round(want.left), r = Math.round(want.right), f = Math.round(want.firstLine);
  const inhF = inh.hanging !== undefined ? -inh.hanging : (inh.firstLine ?? 0);
  return {
    indentLeftTwips: l === Math.round(inh.left ?? 0) ? undefined : l,
    indentRightTwips: r === Math.round(inh.right ?? 0) ? undefined : r,
    indentFirstLineTwips: f === Math.round(inhF) ? undefined : f,
  };
}

/**
 * Parágrafos de uma SEÇÃO de título: [início, fim) — o título e tudo até o
 * próximo título de nível igual ou maior (o que o Painel de Navegação arrasta,
 * exclui e seleciona junto). `levels[i]`: nível de tópico do parágrafo i (0 =
 * corpo do texto).
 */
export function headingSpan(levels: readonly number[], i: number): [number, number] {
  const lv = levels[i] ?? 0;
  if (!lv) return [i, i + 1];
  let e = i + 1;
  while (e < levels.length && !(levels[e]! > 0 && levels[e]! <= lv)) e++;
  return [i, e];
}

/** Nova ordem dos parágrafos ao mover [s, e) para antes de `t` (t fora de [s, e]):
 *  `map[velho] = novo`. */
export function moveMap(n: number, s: number, e: number, t: number): number[] {
  const len = e - s;
  const map = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    if (i >= s && i < e) map[i] = (t > e ? t - len : t) + (i - s);
    else if (t > e && i >= e && i < t) map[i] = i - len;
    else if (t < s && i >= t && i < s) map[i] = i + len;
    else map[i] = i;
  }
  return map;
}

export interface FindOptions {
  /** Diferenciar maiúsculas e minúsculas */
  matchCase?: boolean;
  /** Localizar apenas palavras inteiras */
  wholeWord?: boolean;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** Ocorrências de `needle` em `text` (início de cada uma), sem sobreposição. */
export function findInText(text: string, needle: string, opts: FindOptions = {}): number[] {
  if (!needle) return [];
  const hay = opts.matchCase ? text : text.toLocaleLowerCase('pt-BR');
  const nee = opts.matchCase ? needle : needle.toLocaleLowerCase('pt-BR');
  const out: number[] = [];
  let i = hay.indexOf(nee);
  while (i >= 0) {
    const ok = !opts.wholeWord
      || ((i === 0 || !WORD_CHAR.test(text[i - 1]!)) && (i + needle.length >= text.length || !WORD_CHAR.test(text[i + needle.length]!)));
    if (ok) { out.push(i); i = hay.indexOf(nee, i + Math.max(1, nee.length)); } else i = hay.indexOf(nee, i + 1);
  }
  return out;
}

/** Trecho em volta de uma ocorrência para a lista de Resultados: até ~5 palavras
 *  antes (cortado no início de palavra) e o resto da linha depois (até ~60). */
export function matchSnippet(text: string, start: number, end: number): { before: string; match: string; after: string } {
  const clean = (s: string): string => s.replace(/[\t\n\r\u000b\u000c\ufffc]/g, ' ');
  let b = Math.max(0, start - 40);
  if (b > 0) { const sp = text.indexOf(' ', b); b = sp >= 0 && sp < start ? sp + 1 : b; }
  let a = Math.min(text.length, end + 60);
  if (a < text.length) { const sp = text.lastIndexOf(' ', a); a = sp > end ? sp : a; }
  return {
    before: (b > 0 ? '…' : '') + clean(text.slice(b, start)),
    match: clean(text.slice(start, end)),
    after: clean(text.slice(end, a)) + (a < text.length ? '…' : ''),
  };
}

/**
 * Grade de desenho do documento (Exibir > Linhas de Grade), do settings.xml.
 * Padrões medidos no Word (oráculo nav-lab grid-defaults: GridDistance 9 pt
 * nas duas direções, a cada 1, origem nas margens); o que o diálogo de grade
 * grava: w:drawingGridHorizontalSpacing/VerticalSpacing (twips),
 * w:displayHorizontal/VerticalDrawingGridEvery, w:doNotUseMarginsForDrawingGridOrigin
 * e w:drawingGridHorizontal/VerticalOrigin (grid-spacing, grid-origin). Mostrar
 * a grade NÃO vai para o arquivo (é opção da janela — grid-show).
 */
export interface DrawingGrid {
  /** distância entre as linhas VERTICAIS (unidade horizontal da grade), twips */
  hSpacing: number;
  /** distância entre as linhas HORIZONTAIS (unidade vertical), twips */
  vSpacing: number;
  /** linhas horizontais a cada N unidades verticais (0 = nenhuma) */
  everyH: number;
  /** linhas verticais a cada N unidades horizontais (0 = nenhuma) */
  everyV: number;
  /** origem no canto das margens (padrão) ou em originX/originY (twips da página) */
  fromMargins: boolean;
  originX: number;
  originY: number;
}

export function drawingGridOf(settingsXml: string | undefined): DrawingGrid {
  const x = settingsXml ?? '';
  const val = (name: string): number | undefined => {
    const m = new RegExp(`<w:${name}\\b[^>]*\\bw:val="(-?\\d+)"`).exec(x);
    return m ? +m[1]! : undefined;
  };
  const flag = new RegExp('<w:doNotUseMarginsForDrawingGridOrigin\\b(?![^>]*w:val="(?:0|false|off)")').test(x);
  return {
    hSpacing: Math.max(1, val('drawingGridHorizontalSpacing') ?? 180),
    vSpacing: Math.max(1, val('drawingGridVerticalSpacing') ?? 180),
    everyH: Math.max(0, val('displayHorizontalDrawingGridEvery') ?? 1),
    everyV: Math.max(0, val('displayVerticalDrawingGridEvery') ?? 1),
    fromMargins: !flag,
    originX: val('drawingGridHorizontalOrigin') ?? 0,
    originY: val('drawingGridVerticalOrigin') ?? 0,
  };
}

/** Linhas da grade num retângulo (coordenadas da página, twips): x das
 *  verticais e y das horizontais, a partir da origem. */
export function gridLines(g: DrawingGrid, box: { x0: number; y0: number; x1: number; y1: number }, origin: { x: number; y: number }): { xs: number[]; ys: number[] } {
  const xs: number[] = [], ys: number[] = [];
  const stepX = g.hSpacing * g.everyV, stepY = g.vSpacing * g.everyH;
  if (stepX > 0) {
    const k0 = Math.ceil((box.x0 - origin.x) / stepX - 1e-9);
    for (let k = k0, x = origin.x + k * stepX; x <= box.x1 + 1e-6 && xs.length < 2000; k++, x = origin.x + k * stepX) xs.push(x);
  }
  if (stepY > 0) {
    const k0 = Math.ceil((box.y0 - origin.y) / stepY - 1e-9);
    for (let k = k0, y = origin.y + k * stepY; y <= box.y1 + 1e-6 && ys.length < 2000; k++, y = origin.y + k * stepY) ys.push(y);
  }
  return { xs, ys };
}

/** Passo de encaixe da régua (twips): 0,25 cm (cm) ou 1/16" (polegadas); Alt arrasta livre. */
export function rulerSnap(unit: 'cm' | 'in'): number {
  return unit === 'cm' ? 1440 / 2.54 / 4 : 1440 / 16;
}

export function snapTo(v: number, step: number): number {
  return Math.round(Math.round(v / step) * step);
}
