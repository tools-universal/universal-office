/**
 * Controle de alterações no modelo de edição: listar, aceitar e rejeitar as
 * revisões (w:ins, w:del, w:moveFrom/To, w:rPrChange, w:pPrChange e as marcas
 * de parágrafo) e editar com o controle LIGADO. As regras são as do Word,
 * medidas via COM (write/tools/word-lab/revisions-xml.ps1):
 *  - texto digitado vira inserção; junto de uma inserção da mesma autoria a
 *    estende; dentro da inserção de outro autor a divide;
 *  - apagar a PRÓPRIA inserção apaga de verdade; o resto vira exclusão (a
 *    inserção de outro autor fica inserida E excluída);
 *  - Enter: a marca NOVA é a do primeiro parágrafo (w:pPr/w:rPr/w:ins);
 *  - juntar parágrafos exclui a marca do primeiro; se ele tem texto, o segundo
 *    recebe a formatação dele (w:pPrChange guarda a de antes) — na visão final
 *    o texto junto fica com a formatação do primeiro, como sem controle;
 *  - formatar guarda as props de ANTES (a primeira); voltar a elas desfaz a revisão;
 *  - aceitar uma marca excluída / rejeitar uma inserida junta os parágrafos com
 *    a formatação do segundo.
 */
import {
  editBaseProps, paraPropsFromPPr, runPropsFromRPr, revInfo,
  type FormatChange, type Paragraph, type ParaProps, type RevisionInfo, type Run, type RunProps,
} from './document.js';
import type { FullDocument, Block } from './fulldoc.js';
import { normalizeParagraph, normalizeRange, paraLength, splitAt, insertText, insertRun, splitParagraph, propsAt, withoutRevisions, type DocPosition, type DocRange } from './model-ops.js';
import type { DocumentModel } from './document.js';

/** Autoria de uma revisão feita AGORA: w:date na convenção do Word (hora local,
 *  segundos zerados, sufixo Z) e w16du:dateUtc (UTC, segundos zerados). */
export function newRevision(author: string, now: Date = new Date()): RevisionInfo {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00Z`;
  const utc = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:00Z`;
  return { author, date: local, dateUtc: utc };
}

const json = (v: unknown): string => JSON.stringify(v ?? null);
const same = (a: unknown, b: unknown): boolean => a === b || json(a) === json(b);

/** Campos de RunProps que não são formatação (origem, link, comentário, revisão). */
const RUN_META = ['src', 'link', 'commentIds', 'isMath', 'ins', 'del', 'fmt'] as const;
/** Campos de ParaProps que não são formatação. */
const PARA_META = ['src', 'fmtSrc', 'sectionBreak', 'markIns', 'markDel', 'pfmt', 'tocInstr', 'tocEntry', 'blockSdt'] as const;

/** Só a formatação de um run (o que um w:rPrChange guarda). */
export function runFormatting(p: RunProps): RunProps {
  const out = { ...p } as Record<string, unknown>;
  for (const k of RUN_META) delete out[k];
  return out as unknown as RunProps;
}

/** Só a formatação de um parágrafo (o que um w:pPrChange guarda). */
export function paraFormatting(p: ParaProps): ParaProps {
  const out = { ...p } as Record<string, unknown>;
  for (const k of PARA_META) delete out[k];
  return out as ParaProps;
}

const runMeta = (p: RunProps): Partial<RunProps> => {
  const out: Partial<RunProps> = {};
  for (const k of RUN_META) if (p[k] !== undefined) (out as Record<string, unknown>)[k] = p[k];
  return out;
};
const paraMeta = (p: ParaProps): Partial<ParaProps> => {
  const out: Partial<ParaProps> = {};
  for (const k of PARA_META) if (p[k] !== undefined) (out as Record<string, unknown>)[k] = p[k];
  return out;
};

/** Run excluído em revisão (fica no modelo; a visão final o esconde). */
export const isDeletedRun = (r: Run): boolean => !!r.props.del;

/** Runs da visão FINAL (sem o texto excluído) — exportações, contagem, diff. */
export function finalRuns(p: Paragraph): Run[] {
  return p.runs.some(isDeletedRun) ? p.runs.filter((r) => !r.props.del) : p.runs;
}

/**
 * Visão FINAL de uma lista de parágrafos (como se tudo fosse aceito): sem o texto
 * excluído, e o parágrafo de marca excluída junto do seguinte, com a formatação do
 * seguinte (a marca que sobra) — o que exportações e o diff enxergam.
 * `index[i]`: posição, na saída, do parágrafo que recebe o texto do i-ésimo.
 */
export function finalParagraphs(paras: readonly Paragraph[]): { paras: Paragraph[]; index: number[] } {
  const out: Paragraph[] = [];
  const index: number[] = [];
  let carry: Run[] = [];
  paras.forEach((p, i) => {
    const own = finalRuns(p);
    const runs = carry.length ? [...carry, ...own] : own;
    index[i] = out.length;
    if (p.props.markDel && i < paras.length - 1) { carry = runs; return; }
    carry = [];
    out.push(runs === p.runs ? p : { ...p, runs });
  });
  return { paras: out, index };
}

/** finalParagraphs nos blocos (parágrafos seguidos; dentro das células também). */
export function finalBlocks(blocks: readonly Block[]): Block[] {
  const out: Block[] = [];
  let run: Paragraph[] = [];
  const flush = (): void => {
    if (!run.length) return;
    for (const paragraph of finalParagraphs(run).paras) out.push({ type: 'paragraph', paragraph });
    run = [];
  };
  for (const b of blocks) {
    if (b.type === 'paragraph') { run.push(b.paragraph); continue; }
    flush();
    out.push({
      ...b,
      rows: b.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          paragraphs: finalParagraphs(cell.paragraphs).paras,
          ...(cell.blocks ? { blocks: finalBlocks(cell.blocks) } : {}),
        })),
      })),
    });
  }
  flush();
  return out;
}

/** O parágrafo tem alguma revisão (texto, formatação ou marca)? */
export function paragraphHasRevisions(p: Paragraph): boolean {
  return !!(p.props.markIns || p.props.markDel || p.props.pfmt) || p.runs.some((r) => !!(r.props.ins || r.props.del || r.props.fmt));
}

/** Há texto que fica na visão final (não excluído)? */
const hasLiveText = (p: Paragraph): boolean => p.runs.some((r) => !r.props.del && r.text.length > 0);

// ───────────────────────── listagem ─────────────────────────

export type RevisionKind = 'insert' | 'delete' | 'format' | 'paraFormat';

/** Uma revisão do texto (o que o Painel de Revisão lista e Anterior/Próxima percorrem). */
export interface RevisionSpan {
  kind: RevisionKind;
  author: string;
  date?: string;
  dateUtc?: string;
  /** movimentação (w:moveFrom/To): delete = origem, insert = destino */
  move?: boolean;
  /** termina numa marca de parágrafo (¶) inserida/excluída — sozinha: start = end
   *  = fim do parágrafo */
  mark?: boolean;
  /** parágrafo e offsets [start, end) no texto dele; atravessando marcas, `end`
   *  é no parágrafo `endPara` */
  para: number;
  endPara?: number;
  start: number;
  end: number;
  /** texto inserido/excluído (formatação: o texto formatado) */
  text: string;
  /** formatação: antes e depois (descrição do balão) */
  old?: RunProps | ParaProps;
  now?: RunProps | ParaProps;
}

const KIND_ORDER: Record<RevisionKind, number> = { paraFormat: 0, delete: 1, insert: 2, format: 3 };

/** Revisões de uma lista de parágrafos, na ordem do texto. Runs vizinhos da mesma
 *  autoria (e, na formatação, da mesma mudança) formam uma revisão só. */
export function collectRevisions(paras: readonly Paragraph[]): RevisionSpan[] {
  const out: RevisionSpan[] = [];
  paras.forEach((p, pi) => {
    const len = paraLength(p);
    if (p.props.pfmt) {
      const f = p.props.pfmt;
      out.push({ kind: 'paraFormat', ...revInfo(f), para: pi, start: 0, end: len, text: p.runs.map((r) => r.text).join(''), old: f.old, now: paraFormatting(p.props) });
    }
    const open: Partial<Record<'insert' | 'delete' | 'format', { span: RevisionSpan; key: string }>> = {};
    const close = (k: 'insert' | 'delete' | 'format'): void => { const o = open[k]; if (o) { out.push(o.span); delete open[k]; } };
    let acc = 0;
    for (const r of p.runs) {
      const rs = acc;
      acc += r.text.length;
      const aspects: ['insert' | 'delete' | 'format', RevisionInfo | FormatChange | undefined, string][] = [
        ['insert', r.props.ins, json(r.props.ins)],
        ['delete', r.props.del, json(r.props.del)],
        ['format', r.props.fmt, r.props.fmt ? json([revInfo(r.props.fmt), r.props.fmt.old, runFormatting(r.props)]) : ''],
      ];
      for (const [k, rev, key] of aspects) {
        if (!rev) { close(k); continue; }
        const o = open[k];
        if (o && o.key === key && o.span.end === rs) { o.span.end = acc; o.span.text += r.text; continue; }
        close(k);
        const span: RevisionSpan = { kind: k, ...revInfo(rev), para: pi, start: rs, end: acc, text: r.text };
        if (k === 'format') { span.old = (rev as FormatChange).old; span.now = runFormatting(r.props); }
        open[k] = { span, key };
      }
    }
    close('delete'); close('insert'); close('format');
    if (p.props.markIns) out.push({ kind: 'insert', mark: true, ...revInfo(p.props.markIns), para: pi, start: len, end: len, text: '' });
    if (p.props.markDel) out.push({ kind: 'delete', mark: true, ...revInfo(p.props.markDel), para: pi, start: len, end: len, text: '' });
  });
  out.sort((a, b) => a.para - b.para || a.start - b.start || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  // inserção/exclusão que atravessa marcas de parágrafo da mesma autoria: uma
  // revisão só, como o Word lista (texto até o fim + ¶ + texto do começo do seguinte)
  const merged: RevisionSpan[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && (s.kind === 'insert' || s.kind === 'delete') && last.kind === s.kind && same(revInfo(last), revInfo(s))) {
      const lp = last.endPara ?? last.para;
      const joins = last.mark ? s.para === lp + 1 && s.start === 0 : s.mark && s.para === lp && last.end === s.start;
      if (joins) {
        if (last.mark) last.text += '\n';
        last.text += s.text;
        last.endPara = s.para;
        last.end = s.end;
        if (s.mark) last.mark = true; else delete last.mark;
        continue;
      }
    }
    merged.push(s);
  }
  return merged;
}

/** Fim de uma revisão no documento (marca: o offset além do texto do parágrafo). */
const spanEnd = (s: RevisionSpan): DocPosition => ({ para: s.endPara ?? s.para, offset: s.mark ? s.end + 1 : s.end });

/** Revisão no cursor (a que contém a posição; na falta, a que termina nela). */
export function revisionAt(spans: readonly RevisionSpan[], pos: DocPosition): RevisionSpan | undefined {
  const cmp = (a: DocPosition, b: DocPosition): number => a.para - b.para || a.offset - b.offset;
  const text = spans.filter((s) => s.kind !== 'paraFormat');
  return text.find((s) => cmp({ para: s.para, offset: s.start }, pos) <= 0 && cmp(pos, spanEnd(s)) < 0)
    ?? text.find((s) => cmp(pos, { para: s.endPara ?? s.para, offset: s.end }) === 0)
    ?? spans.find((s) => s.para === pos.para && s.kind === 'paraFormat');
}

/** Intervalo de uma revisão para aceitar/rejeitar SÓ ela (marca: o ¶ — offset além do texto). */
export function spanScope(s: RevisionSpan): RevisionScope {
  return {
    range: { start: { para: s.para, offset: s.start }, end: spanEnd(s) },
    kinds: new Set([s.kind]),
    authors: new Set([s.author]),
    ...(s.kind === 'paraFormat' ? {} : { runsOnly: true }),
  };
}

// ───────────────────────── aceitar / rejeitar ─────────────────────────

export interface RevisionScope {
  /** intervalo (ausente = todos os parágrafos). A marca do parágrafo i entra se o
   *  intervalo passa dela: end.para > i, ou end.offset > comprimento do parágrafo. */
  range?: DocRange | null;
  /** só estes tipos (padrão: todos) */
  kinds?: ReadonlySet<RevisionKind> | null;
  /** só estes autores (padrão: todos) — "aceitar todas as mostradas" */
  authors?: ReadonlySet<string> | null;
  /** a formatação do PARÁGRAFO fica de fora (revisão de texto escolhida no cursor) */
  runsOnly?: boolean;
}

/** Aceita as revisões do escopo. `onMerge(i)`: o parágrafo i foi juntado ao
 *  anterior (i − 1) e saiu da lista — o editor desloca âncoras. Devolve se mudou algo. */
export function acceptRevisions(paras: Paragraph[], scope: RevisionScope = {}, onMerge?: (removed: number) => void): boolean {
  return applyRevisions(paras, scope, true, onMerge);
}

/** Rejeita as revisões do escopo (ver acceptRevisions). */
export function rejectRevisions(paras: Paragraph[], scope: RevisionScope = {}, onMerge?: (removed: number) => void): boolean {
  return applyRevisions(paras, scope, false, onMerge);
}

function applyRevisions(paras: Paragraph[], scope: RevisionScope, accept: boolean, onMerge?: (removed: number) => void): boolean {
  const kindOk = (k: RevisionKind): boolean => !scope.kinds || scope.kinds.has(k);
  const ok = (k: RevisionKind, rev: RevisionInfo | undefined): boolean => !!rev && kindOk(k) && (!scope.authors || scope.authors.has(rev.author));
  const range = scope.range ? normalizeRange(scope.range) : null;
  let changed = false;
  // de trás para frente: juntar parágrafos não mexe nos índices que faltam
  for (let i = paras.length - 1; i >= 0; i--) {
    const p = paras[i]!;
    const len = paraLength(p);
    let from = 0, to = len, markIn = true;
    if (range) {
      if (i < range.start.para || i > range.end.para) continue;
      from = i === range.start.para ? range.start.offset : 0;
      to = i === range.end.para ? Math.min(range.end.offset, len) : len;
      markIn = range.end.para > i || range.end.offset > len;
    }
    if (to > from && applyRuns(p, from, to, accept, ok)) changed = true;
    const pf = p.props.pfmt;
    if (pf && !scope.runsOnly && ok('paraFormat', pf)) {
      changed = true;
      if (accept) { p.props = { ...p.props }; delete p.props.pfmt; } else rejectParaFormat(p);
    }
    if (!markIn) continue;
    const last = i === paras.length - 1;
    const mi = p.props.markIns, md = p.props.markDel;
    if (md && ok('delete', md)) {
      changed = true;
      if (accept && !last) { mergeNext(paras, i); onMerge?.(i + 1); continue; }
      p.props = { ...p.props }; delete p.props.markDel;
      if (p.ppr?.markDeleted) { p.ppr = { ...p.ppr }; delete p.ppr.markDeleted; delete p.ppr.markDel; }
    }
    if (mi && ok('insert', mi)) {
      changed = true;
      if (!accept && !last) { mergeNext(paras, i); onMerge?.(i + 1); continue; }
      p.props = { ...p.props }; delete p.props.markIns;
    }
  }
  return changed;
}

/** Junta o parágrafo i + 1 ao i com a formatação do SEGUNDO (a marca que sobra). */
function mergeNext(paras: Paragraph[], i: number): void {
  const p = paras[i]!, next = paras[i + 1]!;
  p.runs = [...p.runs, ...next.runs];
  p.props = { ...next.props };
  if (next.ppr) p.ppr = next.ppr; else delete p.ppr;
  paras.splice(i + 1, 1);
  normalizeParagraph(p);
}

/** Aceita/rejeita as revisões dos runs em [from, to). */
function applyRuns(p: Paragraph, from: number, to: number, accept: boolean, ok: (k: RevisionKind, rev: RevisionInfo | undefined) => boolean): boolean {
  splitAt(p, to);
  splitAt(p, from);
  let changed = false;
  const out: Run[] = [];
  let acc = 0;
  for (const run of p.runs) {
    const rs = acc;
    acc += run.text.length;
    const inside = run.text.length ? rs >= from && acc <= to : rs >= from && rs < to;
    if (!inside) { out.push(run); continue; }
    let r = run;
    if (ok('format', r.props.fmt)) {
      changed = true;
      if (accept) { r = { ...r, props: { ...r.props } }; delete r.props.fmt; } else r = rejectRunFormat(r);
    }
    if (ok('delete', r.props.del)) {
      changed = true;
      if (accept) continue;
      r = { ...r, props: { ...r.props } };
      delete r.props.del;
    }
    if (ok('insert', r.props.ins)) {
      changed = true;
      if (!accept) continue;
      r = { ...r, props: { ...r.props } };
      delete r.props.ins;
    }
    out.push(r);
  }
  p.runs = out;
  normalizeParagraph(p);
  return changed;
}

/** O w:rPrChange do run é o que veio do arquivo (o rPr tipado tem o antigo exato)? */
function fileFormatChange(run: Run): boolean {
  const c = run.rpr?.change;
  return !!c && !!run.props.fmt && same(revInfo(c), revInfo(run.props.fmt)) && same(runPropsFromRPr(c.rPr), run.props.fmt.old);
}

/** Rejeitar a formatação: volta às props de antes (do arquivo: o rPr antigo exato). */
function rejectRunFormat(run: Run): Run {
  const fmt = run.props.fmt!;
  const meta = runMeta(run.props);
  delete meta.fmt;
  if (fileFormatChange(run)) {
    const rpr = { ...run.rpr!.change!.rPr };
    const out: Run = { ...run, rpr };
    out.props = { ...withoutRevisions(editBaseProps(out, rpr)), ...meta };
    return out;
  }
  return { ...run, props: { ...fmt.old, ...meta } };
}

/** Rejeitar a formatação do parágrafo: volta às props de antes (do arquivo: o pPr antigo). */
function rejectParaFormat(p: Paragraph): void {
  const pf = p.props.pfmt!;
  const meta = paraMeta(p.props);
  delete meta.pfmt;
  const c = p.ppr?.change;
  if (c && same(revInfo(c), revInfo(pf)) && same(paraFormatting(paraPropsFromPPr(c.pPr)), pf.old)) {
    const cur = p.ppr!;
    p.ppr = {
      ...c.pPr,
      ...(cur.rPr ? { rPr: cur.rPr } : {}),
      ...(cur.markDeleted ? { markDeleted: true } : {}),
      ...(cur.markDel ? { markDel: cur.markDel } : {}),
      ...(cur.markIns ? { markIns: cur.markIns } : {}),
    };
  }
  p.props = { ...pf.old, ...meta };
}

// ───────────────────────── edição com o controle ligado ─────────────────────────

/** Digitar/colar com o controle ligado: o texto entra como inserção da autoria. */
export function trackInsertText(model: DocumentModel, pos: DocPosition, text: string, rev: RevisionInfo, props?: RunProps): DocPosition {
  const base = withoutRevisions(props ?? propsAt(model, pos));
  return insertText(model, pos, text, { ...base, ins: rev });
}

/** Run inteiro (imagem, campo…) inserido com o controle ligado. */
export function trackInsertRun(model: DocumentModel, pos: DocPosition, run: Run, rev: RevisionInfo): DocPosition {
  return insertRun(model, pos, { ...run, props: { ...withoutRevisions(run.props), ins: rev } });
}

/** Enter com o controle ligado: a marca nova (a do 1º parágrafo) entra como inserção. */
export function trackSplitParagraph(model: DocumentModel, pos: DocPosition, rev: RevisionInfo): DocPosition {
  const out = splitParagraph(model, pos);
  const first = model.paragraphs[pos.para]!;
  first.props = { ...first.props, markIns: rev };
  return out;
}

export interface TrackedDelete {
  /** começo do intervalo apagado, depois da operação */
  start: DocPosition;
  /** fim do intervalo apagado, depois da operação (o texto excluído fica antes dele) */
  end: DocPosition;
  /** parágrafos que saíram (juntados ao anterior), na ordem em que saíram */
  merged: number[];
}

/**
 * Apagar com o controle ligado. A própria inserção (e a própria marca inserida)
 * some de verdade; o resto vira exclusão da autoria `rev`; o que já estava
 * excluído fica como está.
 */
export function trackDelete(model: DocumentModel, range: DocRange, rev: RevisionInfo): TrackedDelete {
  const { start, end } = normalizeRange(range);
  const paras = model.paragraphs;
  const merged: number[] = [];
  let endPara = end.para, endOffset = end.offset;
  for (let i = end.para; i >= start.para; i--) {
    const p = paras[i]!;
    const from = i === start.para ? start.offset : 0;
    const to = i === end.para ? end.offset : paraLength(p);
    if (to > from) {
      const removed = deleteRuns(p, from, to, rev);
      if (i === end.para) endOffset -= removed;
    }
    if (i === end.para || i >= paras.length - 1) continue;
    // a marca do parágrafo i está no intervalo
    if (p.props.markDel) continue;
    if (p.props.markIns && p.props.markIns.author === rev.author) {
      // marca inserida pela mesma autoria: some (os parágrafos se juntam de verdade)
      const len = paraLength(p);
      const next = paras[i + 1]!;
      p.runs = [...p.runs, ...next.runs];
      p.props = { ...next.props };
      if (next.ppr) p.ppr = next.ppr; else delete p.ppr;
      paras.splice(i + 1, 1);
      normalizeParagraph(p);
      merged.push(i + 1);
      if (endPara === i + 1) { endPara = i; endOffset += len; } else if (endPara > i + 1) endPara--;
      continue;
    }
    p.props = { ...p.props, markDel: rev };
    // na visão final o texto deste vai para o seguinte: o seguinte fica com a
    // formatação deste (o Word grava w:pPrChange nele) — só se este tem texto
    const next = paras[i + 1]!;
    if (hasLiveText(p) && !same(paraFormatting(next.props), paraFormatting(p.props))) {
      const old = next.props.pfmt?.old ?? paraFormatting(next.props);
      next.props = { ...paraMeta(next.props), ...paraFormatting(p.props), pfmt: next.props.pfmt ?? { ...rev, old } };
      if (same(paraFormatting(next.props), next.props.pfmt!.old)) delete next.props.pfmt;
    }
  }
  return { start, end: { para: endPara, offset: Math.max(0, endOffset) }, merged };
}

/** Marca [from, to) como excluído; a própria inserção sai. Devolve quantos caracteres saíram. */
function deleteRuns(p: Paragraph, from: number, to: number, rev: RevisionInfo): number {
  splitAt(p, to);
  splitAt(p, from);
  const out: Run[] = [];
  let acc = 0, removed = 0;
  for (const run of p.runs) {
    const rs = acc;
    acc += run.text.length;
    const inside = run.text.length ? rs >= from && acc <= to : rs >= from && rs < to;
    if (!inside || run.props.del) { out.push(run); continue; }
    if (run.props.ins && run.props.ins.author === rev.author && !run.props.ins.move) { removed += run.text.length; continue; }
    out.push({ ...run, props: { ...run.props, del: rev } });
  }
  p.runs = out;
  normalizeParagraph(p);
  return removed;
}

/** Formatar runs com o controle ligado (o patch só de formatação vira w:rPrChange). */
export function trackApplyRunProps(model: DocumentModel, range: DocRange, patch: Partial<RunProps>, rev: RevisionInfo): void {
  const { start, end } = normalizeRange(range);
  const formatting = Object.keys(patch).some((k) => !(RUN_META as readonly string[]).includes(k));
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi]!;
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const run = p.runs[ri]!;
      const rs = acc;
      acc += run.text.length;
      if (rs < from || acc > to || !run.text.length) continue;
      const before = runFormatting(run.props);
      const props: RunProps = { ...run.props, ...patch };
      if (formatting) {
        const after = runFormatting(props);
        if (props.fmt) {
          // a mudança guarda a formatação de ANTES da primeira; voltar a ela desfaz
          if (same(after, props.fmt.old)) delete props.fmt;
        } else if (!same(before, after)) props.fmt = { ...rev, old: before };
      }
      p.runs[ri] = { ...run, props };
    }
    normalizeParagraph(p);
  }
}

/** Formatar parágrafos com o controle ligado (vira w:pPrChange). */
export function trackApplyParaProps(model: DocumentModel, range: DocRange, patch: Partial<ParaProps>, rev: RevisionInfo): void {
  const { start, end } = normalizeRange(range);
  const formatting = Object.keys(patch).some((k) => !(PARA_META as readonly string[]).includes(k));
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi]!;
    const before = paraFormatting(p.props);
    const props: ParaProps = { ...p.props, ...patch };
    if (formatting) {
      const after = paraFormatting(props);
      if (props.pfmt) { if (same(after, props.pfmt.old)) delete props.pfmt; }
      else if (!same(before, after)) props.pfmt = { ...rev, old: before };
    }
    p.props = props;
  }
}

// ───────────────────────── autores ─────────────────────────

/** Autores das revisões na ordem de leitura (corpo, cabeçalhos/rodapés, notas) —
 *  a ordem em que o Word os encontra e lhes dá cor. */
export function revisionAuthors(full: FullDocument): string[] {
  const seen = new Set<string>();
  const add = (r: RevisionInfo | undefined): void => { if (r && !seen.has(r.author)) seen.add(r.author); };
  const para = (p: Paragraph): void => {
    add(p.props.pfmt);
    for (const r of p.runs) {
      add(r.props.del); add(r.props.ins); add(r.props.fmt);
      if (r.textbox?.blocks) blocks(r.textbox.blocks);
      else if (r.textbox?.paras) r.textbox.paras.forEach(para);
    }
    add(p.props.markIns); add(p.props.markDel);
  };
  const blocks = (bs: readonly Block[]): void => {
    for (const b of bs) {
      if (b.type === 'paragraph') para(b.paragraph);
      else for (const row of b.rows) for (const cell of row.cells) blocks(cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph })));
    }
  };
  blocks(full.blocks);
  for (const s of full.sections) {
    for (const set of [s.headerBlocks, s.footerBlocks]) for (const k of ['default', 'first', 'even'] as const) { const b = set?.[k]; if (b) blocks(b); }
  }
  for (const m of [full.footnoteBlocks, full.endnoteBlocks]) for (const b of m?.values() ?? []) blocks(b);
  return [...seen];
}
