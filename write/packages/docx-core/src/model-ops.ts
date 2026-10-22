import { clearedRPr, clearedPPr } from './lossless.js';
import {
  DEFAULT_RUN_PROPS,
  editBaseProps,
  isMarkRun,
  paraPropsFromPPr,
  type DocumentModel,
  type Paragraph,
  type ParaProps,
  type Run,
  type RunProps,
} from './document.js';

/**
 * Operações de edição sobre o DocumentModel, espelhando o comportamento
 * observado do app de referência (FINDINGS.md):
 *  - formatação parcial divide runs no limite exato;
 *  - Enter divide o parágrafo; Backspace na fronteira funde (o parágrafo
 *    resultante herda as props do SEGUNDO — identidade na marca ¶ final);
 *  - runs adjacentes com props idênticas são normalizados (como o app de
 *    referência faz ao salvar).
 */

export interface DocPosition {
  para: number;
  /** offset em caracteres no texto concatenado do parágrafo. */
  offset: number;
}

export interface DocRange {
  start: DocPosition;
  end: DocPosition;
}

export const paraText = (p: Paragraph): string => p.runs.map((r) => r.text).join('');
export const paraLength = (p: Paragraph): number =>
  p.runs.reduce((s, r) => s + r.text.length, 0);

export function comparePos(a: DocPosition, b: DocPosition): number {
  return a.para !== b.para ? a.para - b.para : a.offset - b.offset;
}

export function normalizeRange(r: DocRange): DocRange {
  return comparePos(r.start, r.end) <= 0 ? r : { start: r.end, end: r.start };
}

/** Formatação tipada original (rPr) igual? Runs com rPr diferente não se fundem
 *  (estilo de caractere, efeitos que as props de edição não representam). */
const sameRPr = (a: Run, b: Run): boolean => a.rpr === b.rpr || JSON.stringify(a.rpr ?? null) === JSON.stringify(b.rpr ?? null);

/** Extras de TEXTO que acompanham cada pedaço de um run dividido. */
const textExtras = (run: Run): Partial<Run> => ({
  ...(run.field ? { field: run.field } : {}),
  ...(run.fieldOpen ? { fieldOpen: true } : {}),
  ...(run.rpr ? { rpr: run.rpr } : {}),
  ...(run.symFont ? { symFont: run.symFont } : {}),
  ...(run.inToc ? { inToc: run.inToc } : {}),
});

const sameProps = (a: RunProps, b: RunProps): boolean =>
  a.bold === b.bold && a.italic === b.italic && a.underline === b.underline &&
  a.underlineStyle === b.underlineStyle && a.underlineColor === b.underlineColor && sameJson(a.underlineTheme, b.underlineTheme) &&
  sameJson(a.colorTheme, b.colorTheme) && !!a.hidden === !!b.hidden && (a.scalePct ?? 100) === (b.scalePct ?? 100) &&
  (a.positionHalfPt ?? 0) === (b.positionHalfPt ?? 0) && (a.kernHalfPt ?? 0) === (b.kernHalfPt ?? 0) &&
  a.strike === b.strike && a.doubleStrike === b.doubleStrike &&
  a.vertAlign === b.vertAlign && a.szHalfPt === b.szHalfPt &&
  a.color === b.color && a.highlight === b.highlight && a.fontAscii === b.fontAscii &&
  a.allCaps === b.allCaps && a.smallCaps === b.smallCaps &&
  a.link === b.link && a.linkTip === b.linkTip && a.charStyle === b.charStyle && !!a.noProof === !!b.noProof && !!a.webHidden === !!b.webHidden &&
  // runs de elementos de origem diferentes (dentro × fora de um sdt/hyperlink…) não se fundem
  a.src === b.src &&
  sameComments(a.commentIds, b.commentIds) &&
  // revisões: só a mesma (autor, data, movimentação) se funde — o Word grava um w:ins por autoria
  sameJson(a.ins, b.ins) && sameJson(a.del, b.del) && sameJson(a.fmt, b.fmt);

const sameJson = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const sameComments = (a?: number[], b?: number[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

/** Funde runs adjacentes idênticos e remove vazios.
 *  Runs especiais (imagem/campo/nota) nunca se fundem e preservam extras. */
const isSpecial = (r: Run): boolean => !!(r.image || r.field || r.noteRef || r.custom || r.textbox || r.shape || r.group || r.ptab) || isMarkRun(r);

export function normalizeParagraph(p: Paragraph): void {
  const out: Run[] = [];
  for (const run of p.runs) {
    if (run.text.length === 0 && !isSpecial(run)) continue;
    const last = out[out.length - 1];
    if (last && !isSpecial(last) && !isSpecial(run) && sameProps(last.props, run.props) && sameRPr(last, run)
      && !last.fieldResult && !run.fieldResult && last.field === run.field) {
      last.text += run.text;
    } else {
      out.push({ ...run, props: { ...run.props } });
    }
  }
  p.runs = out;
}

/** Divide o run que contém offset, retornando o índice do run que começa ali. */
export function splitAt(p: Paragraph, offset: number): number {
  let acc = 0;
  for (let i = 0; i < p.runs.length; i++) {
    const run = p.runs[i]!;
    if (offset === acc) return i;
    if (offset < acc + run.text.length) {
      const extras = textExtras(run);
      const head: Run = { ...extras, text: run.text.slice(0, offset - acc), props: { ...run.props } };
      const tail: Run = { ...extras, text: run.text.slice(offset - acc), props: { ...run.props } };
      p.runs.splice(i, 1, head, tail);
      return i + 1;
    }
    acc += run.text.length;
  }
  return p.runs.length;
}

/** Props efetivas no ponto de inserção (herda do caractere anterior, como o app de referência).
 *  Revisões não passam adiante: texto novo junto de uma inserção/exclusão/formatação
 *  controlada sai comum (medido no Word) — com o controle ligado, quem insere põe a dele. */
export function propsAt(model: DocumentModel, pos: DocPosition): RunProps {
  const p = model.paragraphs[pos.para];
  // (marcas de largura zero — indicador, começo/fim de campo — não têm formatação)
  const runs = p?.runs.filter((r) => !isMarkRun(r)) ?? [];
  if (!runs.length) return { ...DEFAULT_RUN_PROPS };
  let acc = 0;
  for (const run of runs) {
    if (pos.offset <= acc + run.text.length) return withoutRevisions(run.props);
    acc += run.text.length;
  }
  return withoutRevisions(runs[runs.length - 1]!.props);
}

/**
 * Índice onde um run novo entra na posição `offset`: o texto digitado fica DEPOIS
 * das marcas de indicador e do fim de campo que estão ali (no começo do indicador
 * entra nele; no fim, fica fora; no de ponto, depois dele — oráculo refs-lab,
 * bm-type-*), e antes do começo de um campo.
 */
export function insertIndex(p: Paragraph, offset: number): number {
  let idx = splitAt(p, offset);
  while (idx < p.runs.length && (p.runs[idx]!.bookmark || p.runs[idx]!.fieldEnd)) idx++;
  return idx;
}

/** Cópia das props sem as marcas de revisão (ins/del/fmt). */
export function withoutRevisions(props: RunProps): RunProps {
  const out = { ...props };
  delete out.ins;
  delete out.del;
  delete out.fmt;
  return out;
}

/** rPr do run onde o texto entra (o anterior, como propsAt). */
function rprAt(model: DocumentModel, pos: DocPosition): Run['rpr'] {
  const p = model.paragraphs[pos.para];
  if (!p || p.runs.length === 0) return undefined;
  let acc = 0;
  for (const run of p.runs) {
    if (pos.offset <= acc + run.text.length && !isSpecial(run)) return run.rpr;
    acc += run.text.length;
  }
  for (let i = p.runs.length - 1; i >= 0; i--) if (!isSpecial(p.runs[i]!)) return p.runs[i]!.rpr;
  return undefined;
}

export function insertText(
  model: DocumentModel,
  pos: DocPosition,
  text: string,
  props?: RunProps,
): DocPosition {
  const p = model.paragraphs[pos.para]!;
  const effective = props ?? propsAt(model, pos);
  // o texto novo herda a formatação tipada (rPr) do run vizinho, como herda as props
  const rpr = rprAt(model, pos);
  const idx = insertIndex(p, pos.offset);
  p.runs.splice(idx, 0, { text, props: { ...effective }, ...(rpr ? { rpr } : {}) });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + text.length };
}

/** Insere um run completo sem perder metadados especiais (imagem/campo/plugin). */
export function insertRun(model: DocumentModel, pos: DocPosition, run: Run): DocPosition {
  const p = model.paragraphs[pos.para]!;
  const idx = insertIndex(p, pos.offset);
  p.runs.splice(idx, 0, { ...run, props: { ...run.props } });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + run.text.length };
}

export function splitParagraph(model: DocumentModel, pos: DocPosition): DocPosition {
  const p = model.paragraphs[pos.para]!;
  // marcas de indicador no ponto ficam na 1ª metade (Enter no começo do indicador
  // leva a marca ¶ para dentro dele — oráculo refs-lab, bm-enter-*)
  const idx = insertIndex(p, pos.offset);
  const tailRuns = p.runs.slice(idx);
  p.runs = p.runs.slice(0, idx);
  // app de referência: o parágrafo NOVO fica com a primeira metade (¶ novo inserido);
  // o original desce com a segunda. Props de parágrafo são copiadas.
  const tail: Paragraph = { runs: tailRuns, props: { ...p.props } };
  // o pPr tipado vai junto (o motor lê dele o que as props não representam);
  // a quebra de seção é da marca de parágrafo final — só a segunda metade a leva
  if (p.ppr) tail.ppr = p.ppr;
  if (p.pprEdited) tail.pprEdited = true;
  if (p.props.sectionBreak) { p.props = { ...p.props }; delete p.props.sectionBreak; }
  // a marca original (e a revisão dela) também é da segunda metade; a da primeira é nova
  if (p.props.markIns || p.props.markDel) { p.props = { ...p.props }; delete p.props.markIns; delete p.props.markDel; }
  model.paragraphs.splice(pos.para + 1, 0, tail);
  normalizeParagraph(p);
  normalizeParagraph(tail);
  return { para: pos.para + 1, offset: 0 };
}

export function deleteRange(model: DocumentModel, range: DocRange): DocPosition {
  const { start, end } = normalizeRange(range);
  const doomed = doomedMarks(model, start, end);
  if (start.para === end.para) {
    const p = model.paragraphs[start.para]!;
    rebuildDelete(p, start.offset, end.offset, doomed);
    dropDoomed(model, doomed);
    normalizeParagraph(p);
    return start;
  }
  const first = model.paragraphs[start.para]!;
  const last = model.paragraphs[end.para]!;
  rebuildDelete(first, start.offset, paraLength(first), doomed);
  // marcas que sobrevivem nos parágrafos do meio ficam no ponto da exclusão
  const kept: Run[] = [];
  for (let pi = start.para + 1; pi < end.para; pi++) {
    for (const r of model.paragraphs[pi]!.runs) if ((isMarkRun(r) || (r.text.length === 0 && isSpecial(r))) && !doomed.has(r)) kept.push(r);
  }
  rebuildDelete(last, 0, end.offset, doomed);
  // herda props do ÚLTIMO parágrafo (identidade na marca ¶ final — FINDINGS 009)
  first.runs = [...first.runs, ...kept, ...last.runs];
  first.props = { ...last.props };
  if (last.ppr) first.ppr = last.ppr; else delete first.ppr;
  model.paragraphs.splice(start.para + 1, end.para - start.para);
  dropDoomed(model, doomed);
  normalizeParagraph(first);
  return start;
}

const cmpPos = (a: DocPosition, b: DocPosition): number => comparePos(a, b);

/**
 * Marcas que somem junto com o trecho [start, end] (oráculo refs-lab, bm-del-*):
 *  - indicador com o trecho inteiro dentro da exclusão (o de ponto, só se estiver
 *    estritamente dentro — Backspace logo depois dele o mantém);
 *  - campo que atravessa parágrafos cujo começo sai: o fim vai junto (o campo
 *    vira texto); fim sem o começo fica (não deixa o campo aberto).
 * As demais marcas do trecho ficam no ponto da exclusão.
 */
function doomedMarks(model: DocumentModel, start: DocPosition, end: DocPosition): Set<Run> {
  const out = new Set<Run>();
  if (cmpPos(start, end) >= 0) return out;
  const starts = new Map<number, { run: Run; at: DocPosition }>();
  const fields: { run: Run; at: DocPosition; begin: boolean }[] = [];
  model.paragraphs.forEach((p, para) => {
    let offset = 0;
    for (const r of p.runs) {
      const at = { para, offset };
      if (r.bookmark) {
        if (!r.bookmark.end) starts.set(r.bookmark.id, { run: r, at });
        else {
          const s = starts.get(r.bookmark.id);
          if (s) {
            const inside = (x: DocPosition): boolean => cmpPos(x, start) >= 0 && cmpPos(x, end) <= 0;
            const point = cmpPos(s.at, at) === 0;
            if (point ? cmpPos(at, start) > 0 && cmpPos(at, end) < 0 : inside(s.at) && inside(at)) { out.add(s.run); out.add(r); }
          }
        }
      } else if (r.fieldBegin !== undefined || r.fieldOpen) fields.push({ run: r, at, begin: true });
      else if (r.fieldEnd) fields.push({ run: r, at, begin: false });
      offset += r.text.length;
    }
  });
  // pares começo/fim de campo (pilha); começo apagado leva o fim junto
  const stack: { run: Run; at: DocPosition }[] = [];
  for (const f of fields) {
    if (f.begin) { stack.push(f); continue; }
    const b = stack.pop();
    if (!b || cmpPos(b.at, start) < 0) continue;
    // começo lido (run com o pedaço do resultado): sai se o texto dele sai inteiro;
    // começo criado (marca): sai se o campo inteiro está no trecho
    const gone = b.run.text.length > 0
      ? cmpPos({ para: b.at.para, offset: b.at.offset + b.run.text.length }, end) <= 0
      : cmpPos(f.at, end) <= 0;
    if (gone) { out.add(b.run); out.add(f.run); }
  }
  return out;
}

/** Tira do modelo as marcas condenadas que ficaram fora do trecho (fim de campo adiante). */
function dropDoomed(model: DocumentModel, doomed: ReadonlySet<Run>): void {
  if (!doomed.size) return;
  for (const p of model.paragraphs) {
    if (p.runs.some((r) => doomed.has(r))) p.runs = p.runs.filter((r) => !doomed.has(r));
  }
}

/** Remove [from,to) reconstruindo os runs (mais simples e à prova de índice).
 *  Marcas de largura zero no trecho ficam (no ponto da exclusão), menos as condenadas. */
function rebuildDelete(p: Paragraph, from: number, to: number, doomed?: ReadonlySet<Run>): void {
  const out: Run[] = [];
  let acc = 0;
  for (const run of p.runs) {
    const rs = acc;
    const re = acc + run.text.length;
    acc = re;
    // (vale também para run especial vazio — começo de campo lido sem resultado aqui)
    if (isMarkRun(run) || (run.text.length === 0 && isSpecial(run))) {
      if (!doomed?.has(run)) out.push(run);
      continue;
    }
    const keepHead = run.text.slice(0, Math.max(0, Math.min(from, re) - rs));
    const keepTail = re > to ? run.text.slice(Math.max(0, to - rs)) : '';
    const text = keepHead + keepTail;
    if (text.length > 0) {
      // preserva extras se o run sobreviveu inteiro; campo sobrevive parcial
      const intact = text.length === run.text.length;
      // inteiro: o run segue como era (todos os extras); parcial: extras de texto
      out.push(intact ? { ...run, text } : { ...textExtras(run), text, props: run.props });
    }
  }
  p.runs = out;
}

/** Funde o parágrafo pos.para com o anterior (Backspace no início). */
export function mergeWithPrevious(model: DocumentModel, para: number): DocPosition {
  const prev = model.paragraphs[para - 1]!;
  const cur = model.paragraphs[para]!;
  const offset = paraLength(prev);
  prev.runs = [...prev.runs, ...cur.runs];
  // sobrevive a identidade do SEGUNDO (FINDINGS 009)
  prev.props = { ...cur.props };
  if (cur.ppr) prev.ppr = cur.ppr; else delete prev.ppr;
  if (cur.pprEdited) prev.pprEdited = true; else delete prev.pprEdited;
  model.paragraphs.splice(para, 1);
  normalizeParagraph(prev);
  return { para: para - 1, offset };
}

export function applyRunProps(
  model: DocumentModel,
  range: DocRange,
  patch: Partial<RunProps>,
): void {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi]!;
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    const i1 = splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const rs = acc;
      acc += p.runs[ri]!.text.length;
      if (ri < i1) continue;
      if (rs >= to) break;
      Object.assign(p.runs[ri]!.props, patch);
    }
    normalizeParagraph(p);
  }
}

export function applyParaProps(
  model: DocumentModel,
  range: DocRange,
  patch: Partial<ParaProps>,
): void {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    Object.assign(model.paragraphs[pi]!.props, patch);
  }
}

/** Props de run "predominantes" numa seleção (para estado da toolbar). */
export function selectionRunProps(model: DocumentModel, range: DocRange): RunProps {
  const { start } = normalizeRange(range);
  return propsAt(model, { para: start.para, offset: start.offset + 1 });
}

/**
 * Tira a formatação DIRETA dos runs do intervalo (ou só os campos `fields`),
 * como o Word: o rpr tipado perde os elementos (o salvar os tira do XML — ver
 * rprEdited) e as props voltam ao que o rpr restante implica. `charStyle`:
 * string/undefined = novo estilo de caractere (undefined tira); null = mantém.
 */
export function clearRunFormatting(
  model: DocumentModel, range: DocRange,
  opts: { fields?: readonly (keyof RunProps)[]; charStyle?: string | null } = {},
): void {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = model.paragraphs[pi]!;
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p);
    if (to <= from) continue;
    splitAt(p, to);
    const i1 = splitAt(p, from);
    let acc = 0;
    for (let ri = 0; ri < p.runs.length; ri++) {
      const rs = acc;
      acc += p.runs[ri]!.text.length;
      if (ri < i1) continue;
      if (rs >= to) break;
      clearRun(p.runs[ri]!, opts);
    }
    normalizeParagraph(p);
  }
}

/** clearRunFormatting de um run só. */
export function clearRun(run: Run, opts: { fields?: readonly (keyof RunProps)[]; charStyle?: string | null } = {}): void {
  const rpr = clearedRPr(run.rpr, opts.fields);
  const old = run.props;
  const base = editBaseProps({ ...run, rpr }, rpr);
  const next: RunProps = opts.fields ? { ...old } : { ...base };
  if (opts.fields) for (const k of opts.fields) (next as unknown as Record<string, unknown>)[k] = (base as unknown as Record<string, unknown>)[k];
  for (const k of ['src', 'link', 'isMath', 'commentIds'] as const) {
    if (old[k] !== undefined) (next as unknown as Record<string, unknown>)[k] = old[k];
  }
  if (opts.charStyle !== null && opts.charStyle !== undefined) next.charStyle = opts.charStyle;
  else if (opts.charStyle === undefined && !opts.fields) delete next.charStyle;
  else if (opts.charStyle === null) { if (old.charStyle !== undefined) next.charStyle = old.charStyle; else delete next.charStyle; }
  run.rpr = rpr;
  run.rprEdited = true;
  run.props = next;
}

/** Tira a formatação direta de PARÁGRAFO (mantém o estilo, a marca ¶, a seção). */
export function clearParaFormatting(model: DocumentModel, range: DocRange): void {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) clearPara(model.paragraphs[pi]!);
}

export function clearPara(p: Paragraph): void {
  const ppr = clearedPPr(p.ppr);
  const old = p.props;
  const next: ParaProps = { ...paraPropsFromPPr(ppr) };
  if (old.styleId !== undefined) next.styleId = old.styleId; else delete next.styleId;
  for (const k of ['src', 'sectionBreak', 'tocInstr', 'tocEntry', 'blockSdt'] as const) {
    if (old[k] !== undefined) (next as Record<string, unknown>)[k] = old[k];
  }
  p.ppr = ppr;
  p.pprEdited = true;
  p.props = next;
}
