// Orquestrador do diff de documentos: tokenize -> histogram/myers -> DocEdit[].
//
// A convenção de ranges é a mesma do OpenCompare (validada contra o Beyond
// Compare 5): 1-based, inclusiva nas duas pontas; range vazio usa start = o
// bloco APÓS o qual a edição está ancorada e end = start - 1 (comprimento 0).
// delete+insert adjacentes são dobrados em um Edit 'change'.
//
// Além do modelo do OpenCompare, este orquestrador conhece documento:
//  - pares alinhados com conteúdo igual mas formatação diferente viram
//    'change' com formatOnly=true e importance 'minor' (equivalente à
//    "unimportant difference" do BC) — sem quebrar o alinhamento;
//  - imagem redimensionada com bytes iguais cai nesse caso (a dimensão mora
//    na formatKey; os bytes moram na contentKey);
//  - Edits 'change' de parágrafo ganham refinamento intra-parágrafo por
//    palavra (Myers sobre tokens palavra/espaço);
//  - pares 'change' de tabela ganham diff aninhado de linhas.

import type { Block, FullDocument } from '@universal-office/docx-core';
import { finalBlocks, paraText } from '@universal-office/docx-core';
import { myersDiff, type DiffOp } from './myers.js';
import { histogramDiff } from './histogram.js';
import {
  rowContentKey,
  rowFormatKey,
  tokenizeBlocks,
  tokensEqual,
  type BlockToken,
} from './tokens.js';

export type DocEditKind = 'equal' | 'insert' | 'delete' | 'change';

export interface BlockRange {
  start: number; // 1-based, inclusivo
  end: number;   // 1-based, inclusivo; end = start - 1 significa vazio
}

/** Marca intra-parágrafo (palavra inserida/removida) em um par alinhado de
 *  um Edit 'change'. Offsets em code units UTF-16 no texto do parágrafo. */
export interface DocIntraEdit {
  kind: 'insert' | 'delete';
  side: 'a' | 'b';
  /** 0-based, no i-ésimo par alinhado de aBlocks/bBlocks do Edit. */
  pairOffset: number;
  startCh: number; // inclusivo
  endCh: number;   // exclusivo
}

/** Linha do diff aninhado de um par de tabelas alterado. */
export interface TableRowEdit {
  kind: DocEditKind;
  /** Índices 0-based em rows da tabela A / B. */
  aRows: number[];
  bRows: number[];
  formatOnly?: boolean;
}

export interface DocEdit {
  kind: DocEditKind;
  a: BlockRange;
  b: BlockRange;
  /** Índices 0-based dos blocos deste edit em cada documento. */
  aBlocks: number[];
  bBlocks: number[];
  /** Conteúdo igual, só formatação mudou (inclui imagem redimensionada). */
  formatOnly?: boolean;
  importance?: 'important' | 'minor';
  intra?: DocIntraEdit[];
  /** Para cada par alinhado de tabelas no edit: diff de linhas (ou null se o
   *  par não é tabela↔tabela). */
  tableRows?: (TableRowEdit[] | null)[];
}

export interface DocDiffStats {
  inserted: number;   // blocos inseridos
  deleted: number;    // blocos removidos
  changed: number;    // blocos alterados (conteúdo)
  formatOnly: number; // blocos com mudança só de formatação
  equal: number;      // blocos inalterados
}

export interface DocDiff {
  edits: DocEdit[];
  stats: DocDiffStats;
}

export interface DocDiffOptions {
  algorithm?: 'histogram' | 'myers';
  /** Refinamento intra-parágrafo por palavra em edits 'change'. */
  intraWord?: boolean;
}

export const DEFAULT_DOC_DIFF_OPTIONS: Required<DocDiffOptions> = {
  algorithm: 'histogram',
  intraWord: true,
};

// Op interno: 'format' = par alinhado com conteúdo igual e formatação
// diferente. Mantido separado de 'equal' para não coalescer.
type OpKind = 'equal' | 'delete' | 'insert' | 'format';

interface Op {
  op: OpKind;
  aIndex: number;
  bIndex: number;
}

interface OpRun {
  kind: OpKind;
  aIdxs: number[];
  bIdxs: number[];
  aStart: number; // 1-based; para runs vazios, "bloco após o qual ancora"
  bStart: number;
}

function opsToRuns(ops: DiffOp[], aTokens: BlockToken[], bTokens: BlockToken[]): OpRun[] {
  // Reclassifica 'equal' com formatKey diferente como 'format' antes de
  // coalescer, para que virem Edits próprios.
  const tagged: Op[] = ops.map((o) => {
    if (
      o.op === 'equal' &&
      aTokens[o.aIndex]!.formatKey !== bTokens[o.bIndex]!.formatKey
    ) {
      return { op: 'format', aIndex: o.aIndex, bIndex: o.bIndex };
    }
    return o as Op;
  });

  const runs: OpRun[] = [];
  let i = 0;
  let aPos = 0;
  let bPos = 0;
  while (i < tagged.length) {
    const op = tagged[i]!;
    let j = i + 1;
    while (j < tagged.length && tagged[j]!.op === op.op) j++;
    const slice = tagged.slice(i, j);
    const aIdxs: number[] = [];
    const bIdxs: number[] = [];
    for (const s of slice) {
      if (s.aIndex >= 0) aIdxs.push(s.aIndex);
      if (s.bIndex >= 0) bIdxs.push(s.bIndex);
    }
    runs.push({
      kind: op.op,
      aIdxs,
      bIdxs,
      aStart: aPos + 1,
      bStart: bPos + 1,
    });
    aPos += aIdxs.length;
    bPos += bIdxs.length;
    i = j;
  }
  return runs;
}

function runsToEdits(runs: OpRun[]): DocEdit[] {
  const edits: DocEdit[] = [];
  let i = 0;
  while (i < runs.length) {
    const r = runs[i]!;
    const next = runs[i + 1];
    // Dobra delete+insert (em qualquer ordem) -> 'change'.
    if (r.kind === 'delete' && next && next.kind === 'insert') {
      edits.push({
        kind: 'change',
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: next.bStart, end: next.bStart + next.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: next.bIdxs,
      });
      i += 2;
      continue;
    }
    if (r.kind === 'insert' && next && next.kind === 'delete') {
      edits.push({
        kind: 'change',
        a: { start: next.aStart, end: next.aStart + next.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: next.aIdxs,
        bBlocks: r.bIdxs,
      });
      i += 2;
      continue;
    }
    if (r.kind === 'equal' || r.kind === 'format') {
      edits.push({
        kind: r.kind === 'format' ? 'change' : 'equal',
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: r.aIdxs,
        bBlocks: r.bIdxs,
        ...(r.kind === 'format'
          ? { formatOnly: true, importance: 'minor' as const }
          : {}),
      });
    } else if (r.kind === 'delete') {
      edits.push({
        kind: 'delete',
        a: { start: r.aStart, end: r.aStart + r.aIdxs.length - 1 },
        b: { start: r.bStart, end: r.bStart - 1 },
        aBlocks: r.aIdxs,
        bBlocks: [],
      });
    } else {
      edits.push({
        kind: 'insert',
        a: { start: r.aStart, end: r.aStart - 1 },
        b: { start: r.bStart, end: r.bStart + r.bIdxs.length - 1 },
        aBlocks: [],
        bBlocks: r.bIdxs,
      });
    }
    i++;
  }
  return edits;
}

// ─────────────── refinamento intra-parágrafo (palavra) ───────────────

interface WordTok {
  start: number; // offset UTF-16 no texto
  end: number;
  text: string;
}

/** Palavras e runs de espaço como tokens separados (política strict). */
function wordTokens(text: string): WordTok[] {
  const out: WordTok[] = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

/** Marcas intra de um par de textos; retorna [] quando não há refinamento
 *  útil (textos iguais ou completamente diferentes). */
export function intraWordMarks(
  aText: string,
  bText: string,
  pairOffset: number,
): DocIntraEdit[] {
  if (aText === bText) return [];
  const aToks = wordTokens(aText);
  const bToks = wordTokens(bText);
  const ops = myersDiff(
    aToks.length,
    bToks.length,
    (i, j) => aToks[i]!.text === bToks[j]!.text,
  );
  const marks: DocIntraEdit[] = [];
  let hasEqual = false;
  for (const op of ops) {
    if (op.op === 'equal') {
      // Só palavra de verdade ancora o refinamento — espaço em comum entre
      // textos totalmente diferentes marcaria "tudo mudou" palavra a palavra.
      if (/\S/.test(aToks[op.aIndex]!.text)) hasEqual = true;
    } else if (op.op === 'delete') {
      const t = aToks[op.aIndex]!;
      marks.push({ kind: 'delete', side: 'a', pairOffset, startCh: t.start, endCh: t.end });
    } else {
      const t = bToks[op.bIndex]!;
      marks.push({ kind: 'insert', side: 'b', pairOffset, startCh: t.start, endCh: t.end });
    }
  }
  // Sem nenhuma palavra em comum o destaque viraria "tudo marcado" — ruído.
  if (!hasEqual) return [];
  // Coalesce marcas adjacentes do mesmo lado (palavra+espaço+palavra).
  const merged: DocIntraEdit[] = [];
  for (const mk of marks) {
    const last = merged[merged.length - 1];
    if (last && last.side === mk.side && last.kind === mk.kind && last.endCh === mk.startCh) {
      last.endCh = mk.endCh;
    } else {
      merged.push(mk);
    }
  }
  return merged;
}

// ─────────────── diff aninhado de linhas de tabela ───────────────

function tableRowDiff(a: Block, b: Block): TableRowEdit[] | null {
  if (a.type !== 'table' || b.type !== 'table') return null;
  const aKeys = a.rows.map(rowContentKey);
  const bKeys = b.rows.map(rowContentKey);
  const ops = histogramDiff(
    a.rows.length,
    b.rows.length,
    (i, j) => aKeys[i] === bKeys[j],
    (i) => aKeys[i]!,
    (j) => bKeys[j]!,
  );
  // Runs + fold delete/insert -> change, espelhando o nível de bloco.
  const out: TableRowEdit[] = [];
  let i = 0;
  const tagged = ops.map((o) => ({
    op:
      o.op === 'equal' &&
      rowFormatKey(a.rows[o.aIndex]!) !== rowFormatKey(b.rows[o.bIndex]!)
        ? ('format' as OpKind)
        : (o.op as OpKind),
    aIndex: o.aIndex,
    bIndex: o.bIndex,
  }));
  while (i < tagged.length) {
    const op = tagged[i]!;
    let j = i + 1;
    while (j < tagged.length && tagged[j]!.op === op.op) j++;
    const slice = tagged.slice(i, j);
    const aRows = slice.filter((s) => s.aIndex >= 0).map((s) => s.aIndex);
    const bRows = slice.filter((s) => s.bIndex >= 0).map((s) => s.bIndex);
    const last = out[out.length - 1];
    if (op.op === 'insert' && last && last.kind === 'delete' && last.bRows.length === 0) {
      last.kind = 'change';
      last.bRows = bRows;
    } else if (op.op === 'delete' && last && last.kind === 'insert' && last.aRows.length === 0) {
      last.kind = 'change';
      last.aRows = aRows;
    } else {
      out.push({
        kind: op.op === 'format' ? 'change' : op.op === 'equal' ? 'equal' : op.op,
        aRows,
        bRows,
        ...(op.op === 'format' ? { formatOnly: true } : {}),
      });
    }
    i = j;
  }
  return out;
}

// ─────────────── entrada pública ───────────────

export function diffBlocks(
  aBlocks: Block[],
  bBlocks: Block[],
  opts: DocDiffOptions = {},
): DocDiff {
  const o = { ...DEFAULT_DOC_DIFF_OPTIONS, ...opts };
  const aTokens = tokenizeBlocks(aBlocks);
  const bTokens = tokenizeBlocks(bBlocks);

  const eq = (i: number, j: number) => tokensEqual(aTokens[i]!, bTokens[j]!);
  const ops =
    o.algorithm === 'myers'
      ? myersDiff(aTokens.length, bTokens.length, eq)
      : histogramDiff(
          aTokens.length,
          bTokens.length,
          eq,
          (i) => aTokens[i]!.contentKey,
          (j) => bTokens[j]!.contentKey,
        );

  const edits = runsToEdits(opsToRuns(ops, aTokens, bTokens));

  // Enriquecimento de edits 'change': intra-palavra e diff de linhas de
  // tabela, par a par (i-ésimo bloco de A com i-ésimo de B, como o BC faz
  // com linhas de um hunk).
  for (const e of edits) {
    if (e.kind !== 'change' || e.formatOnly) continue;
    const pairs = Math.min(e.aBlocks.length, e.bBlocks.length);
    const intra: DocIntraEdit[] = [];
    const tableRows: (TableRowEdit[] | null)[] = [];
    let anyTable = false;
    for (let p = 0; p < pairs; p++) {
      const aB = aBlocks[e.aBlocks[p]!]!;
      const bB = bBlocks[e.bBlocks[p]!]!;
      if (aB.type === 'paragraph' && bB.type === 'paragraph') {
        if (o.intraWord) {
          intra.push(...intraWordMarks(paraText(aB.paragraph), paraText(bB.paragraph), p));
        }
        tableRows.push(null);
      } else {
        const rd = tableRowDiff(aB, bB);
        tableRows.push(rd);
        if (rd) anyTable = true;
      }
    }
    if (intra.length > 0) e.intra = intra;
    if (anyTable) e.tableRows = tableRows;
  }

  // Estatísticas por bloco.
  const stats: DocDiffStats = { inserted: 0, deleted: 0, changed: 0, formatOnly: 0, equal: 0 };
  for (const e of edits) {
    if (e.kind === 'equal') stats.equal += e.aBlocks.length;
    else if (e.kind === 'insert') stats.inserted += e.bBlocks.length;
    else if (e.kind === 'delete') stats.deleted += e.aBlocks.length;
    else if (e.formatOnly) stats.formatOnly += e.aBlocks.length;
    else stats.changed += Math.max(e.aBlocks.length, e.bBlocks.length);
  }

  return { edits, stats };
}

/** Diff dos corpos de dois documentos carregados com readFullDocument — na visão
 *  final do controle de alterações (o texto excluído em revisão não conta). */
export function diffDocuments(
  a: FullDocument,
  b: FullDocument,
  opts: DocDiffOptions = {},
): DocDiff {
  return diffBlocks(finalBlocks(a.blocks), finalBlocks(b.blocks), opts);
}
