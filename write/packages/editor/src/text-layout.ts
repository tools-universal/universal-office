// Layout do texto (guia Layout: Hifenização, Números de Linha, Recuar/Espaçamento;
// diálogo Parágrafo › Quebras de linha e de página): as regras do Word medidas em
// write/tools/textlayout-lab (memória word-textlayout-oracle-facts), sem DOM.
import type { LineNumbering, ParaProps, PPr, SectPr } from '@universal-office/docx-core';

// ───────────────────────── números de linha ─────────────────────────

/** Item do menu Números de Linha (Nenhum, Contínuo, Reiniciar a Cada Página/Seção). */
export type LineNumberMode = 'none' | 'continuous' | 'page' | 'section';

/** Numeração de linhas da seção, como o diálogo a mostra. */
export interface LineNumberingInfo {
  mode: LineNumberMode;
  /** "Iniciar em" (o 1º número) */
  startAt: number;
  /** "Contar por" */
  countBy: number;
  /** "Do texto" em twips; 0 = Automático */
  distanceTwips: number;
}

/** Diálogo Números de Linha (Configurar Página › Layout). */
export interface LineNumberingOptions {
  /** "Adicionar numeração de linha" */
  on: boolean;
  startAt: number;
  countBy: number;
  /** twips; 0 = Automático */
  distanceTwips: number;
  restart: 'page' | 'section' | 'continuous';
}

/** Limites das caixas do diálogo (os que o Word aceita — oráculo limits). */
export const LINE_NUMBER_LIMITS = { startAt: [1, 32767], countBy: [1, 100], distanceTwips: [0, 31680] } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]): number => Math.min(hi, Math.max(lo, Math.round(v)));

/** A numeração está ligada? (sem countBy, ou 0, o Word não numera — oráculo lnnum3) */
export const lineNumberingOn = (ln: LineNumbering | undefined): ln is LineNumbering => !!ln && (ln.countBy ?? 0) >= 1;

export function lineNumberingInfo(sp: SectPr): LineNumberingInfo {
  const ln = sp.lnNumType;
  const on = lineNumberingOn(ln);
  return {
    mode: !on ? 'none' : ln.restart === 'continuous' ? 'continuous' : ln.restart === 'newSection' ? 'section' : 'page',
    startAt: (ln?.start ?? 0) + 1,
    countBy: on ? ln.countBy! : 1,
    distanceTwips: ln?.distance ?? 0,
  };
}

/** O que a sessão lembra de uma seção cuja numeração foi desligada (o Word lembra
 *  o início e a distância; "contar por" volta a 1 — oráculo ln-off-on). */
export interface LineNumberMemory { start?: number; distance?: number }

/**
 * w:lnNumType depois de um item do menu: Nenhum tira; os outros só trocam o
 * reinício e mantêm início/contar por/distância (oráculo ln-cont-over); ligando
 * do zero, contar por 1 e o que a sessão lembrou.
 */
export function withLineNumberMode(sp: SectPr, mode: LineNumberMode, memory?: LineNumberMemory): LineNumbering | undefined {
  if (mode === 'none') return undefined;
  const cur = lineNumberingOn(sp.lnNumType) ? sp.lnNumType : undefined;
  const out: LineNumbering = cur ? { ...cur } : {
    countBy: 1,
    ...(memory?.start ? { start: memory.start } : {}),
    ...(memory?.distance ? { distance: memory.distance } : {}),
  };
  delete out.restart;
  if (mode === 'continuous') out.restart = 'continuous';
  else if (mode === 'section') out.restart = 'newSection';
  return out;
}

/** w:lnNumType do diálogo (valores presos aos limites do Word). */
export function lineNumberingFromOptions(o: LineNumberingOptions): LineNumbering | undefined {
  if (!o.on) return undefined;
  const start = clamp(o.startAt, LINE_NUMBER_LIMITS.startAt) - 1;
  const distance = clamp(o.distanceTwips, LINE_NUMBER_LIMITS.distanceTwips);
  return {
    countBy: clamp(o.countBy, LINE_NUMBER_LIMITS.countBy),
    ...(start ? { start } : {}),
    ...(distance ? { distance } : {}),
    ...(o.restart === 'continuous' ? { restart: 'continuous' as const } : o.restart === 'section' ? { restart: 'newSection' as const } : {}),
  };
}

// ─────────────────── quebras de linha e de página (parágrafo) ───────────────────

/** Ajuste rígido da caixa de texto (w:textboxTightWrap). */
export type TightWrap = 'none' | 'allLines' | 'firstAndLastLine' | 'firstLineOnly' | 'lastLineOnly';

/** Aba Quebras de linha e de página do diálogo Parágrafo: valores EFETIVOS (estilo
 *  incluído); null = os parágrafos selecionados diferem. */
export interface ParagraphFlow {
  /** Controle de linhas órfãs/viúvas */
  widowControl: boolean | null;
  /** Manter com o próximo */
  keepNext: boolean | null;
  /** Manter linhas juntas */
  keepLines: boolean | null;
  /** Quebrar página antes */
  pageBreakBefore: boolean | null;
  /** Suprimir números de linha */
  suppressLineNumbers: boolean | null;
  /** Não hifenizar */
  suppressAutoHyphens: boolean | null;
  textboxTightWrap: TightWrap | null;
}

export const FLOW_FLAGS = ['widowControl', 'keepNext', 'keepLines', 'pageBreakBefore', 'suppressLineNumbers', 'suppressAutoHyphens'] as const;
export type FlowFlag = typeof FLOW_FLAGS[number];

/** Valor efetivo de uma flag no pPr resolvido — o controle de órfãs/viúvas é LIGADO
 *  quando nada o define (oráculo pf-widow-off). */
export function flowValue(ppr: PPr, k: FlowFlag): boolean {
  return k === 'widowControl' ? ppr.widowControl !== false : !!ppr[k];
}

/** Prop direta para chegar a `want` sobre o herdado: igual ao herdado = sem elemento
 *  (oráculo pf-widow-on), diferente = ligado ou w:val="0" (pf-heading-off). */
export const flowDirect = (inherited: boolean, want: boolean): boolean | undefined => (want === inherited ? undefined : want);

// ───────────────────── Recuar / Espaçamento (caixas numéricas) ─────────────────────

/** Caixas Recuar e Espaçamento do grupo Parágrafo (twips; 'auto' = Automático; null =
 *  os parágrafos selecionados diferem). */
export interface ParagraphLayoutInfo {
  left: number | null;
  right: number | null;
  before: number | 'auto' | null;
  after: number | 'auto' | null;
}

/** Limites das caixas (os do Word: 1584 pt = 31680 tw; recuo também negativo). */
export const PARAGRAPH_LAYOUT_LIMITS = { indent: [-31680, 31680], spacing: [0, 31680] } as const;

/**
 * Props diretas do espaçamento antes/depois para chegar a `want`: igual ao herdado
 * não grava (oráculo sp-after-same/sp-after-same-sel); "Automático" grava só o
 * w:beforeAutospacing (sp-before-auto); um valor tira o Automático.
 */
export function spacingDirect(
  inherited: { twips: number; auto: boolean }, want: number | 'auto', side: 'before' | 'after',
): Partial<ParaProps> {
  const tw = side === 'before' ? 'spaceBeforeTwips' : 'spaceAfterTwips';
  const au = side === 'before' ? 'spaceBeforeAuto' : 'spaceAfterAuto';
  if (want === 'auto') return { [au]: inherited.auto ? undefined : true };
  const v = clamp(want, PARAGRAPH_LAYOUT_LIMITS.spacing);
  return { [au]: inherited.auto ? false : undefined, [tw]: !inherited.auto && v === inherited.twips ? undefined : v };
}

/** Um valor por parágrafo → o comum ou null. */
export function common<T>(vals: readonly T[]): T | null {
  if (!vals.length) return null;
  const k = JSON.stringify(vals[0]);
  return vals.every((v) => JSON.stringify(v) === k) ? vals[0]! : null;
}

// ───────────────────────── hifenização ─────────────────────────

/** Opções de Hifenização (as do documento). */
export interface HyphenationInfo {
  /** Hifenizar documento automaticamente (w:autoHyphenation) */
  auto: boolean;
  /** Hifenizar palavras em MAIÚSCULAS (falso = w:doNotHyphenateCaps) */
  caps: boolean;
  /** Zona de hifenização (twips; sem o elemento, a do Word pt-BR: 425) */
  zoneTwips: number;
  /** Limitar hifens consecutivos a (0 = sem limite) */
  limit: number;
}

/** Limites do diálogo (os que o Word aceita — oráculo limits). */
export const HYPHENATION_LIMITS = { limit: [0, 32767], zoneTwips: [1, 31680] } as const;

/** Palavra que a Hifenização Manual propõe. */
export interface ManualHyphenation {
  /** a palavra, sem os hífens opcionais que já tem */
  word: string;
  /** idioma (w:lang) — o título do diálogo */
  lang: string;
  /** onde pode haver hífen: nº de letras antes dele, em ordem */
  points: number[];
  /** o ponto proposto (o da hifenização automática) */
  suggested: number;
  /** o último ponto antes da margem: os de depois não cabem na linha */
  limit: number;
}

const LETTER = /^[\p{L}\p{M}]$/u;

/** A palavra (letras e hífens opcionais) em torno de `at` num texto: [início, fim). */
export function wordAround(text: string, at: number): [number, number] {
  const isW = (c: string | undefined): boolean => c !== undefined && (LETTER.test(c) || c === '\u00AD');
  let a = Math.min(at, text.length), b = a;
  while (a > 0 && isW(text[a - 1])) a--;
  while (b < text.length && isW(text[b])) b++;
  return [a, b];
}

/** Pontos de uma palavra: os dos padrões e os hífens opcionais que ela já tem (nº de
 *  letras antes), sem repetição e em ordem. */
export function manualPoints(raw: string, patternPoints: readonly number[]): { word: string; points: number[] } {
  const word = raw.replace(/\u00AD/g, '');
  const shy: number[] = [];
  let n = 0;
  for (const c of raw) { if (c === '\u00AD') shy.push(n); else n++; }
  const points = [...new Set([...patternPoints, ...shy])].filter((p) => p > 0 && p < word.length).sort((x, y) => x - y);
  return { word, points };
}

/** Offset no texto (com os hífens opcionais) depois de `letters` letras da palavra. */
export function offsetAfterLetters(raw: string, start: number, letters: number): number {
  let n = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\u00AD') continue;
    if (n === letters) return start + i;
    n++;
  }
  return start + raw.length;
}
