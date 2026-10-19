import {
  DEFAULT_RUN_PROPS,
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
  ...(run.rpr ? { rpr: run.rpr } : {}),
  ...(run.symFont ? { symFont: run.symFont } : {}),
  ...(run.inToc ? { inToc: run.inToc } : {}),
});

const sameProps = (a: RunProps, b: RunProps): boolean =>
  a.bold === b.bold && a.italic === b.italic && a.underline === b.underline &&
  a.underlineStyle === b.underlineStyle && a.underlineColor === b.underlineColor &&
  a.strike === b.strike && a.doubleStrike === b.doubleStrike &&
  a.vertAlign === b.vertAlign && a.szHalfPt === b.szHalfPt &&
  a.color === b.color && a.highlight === b.highlight && a.fontAscii === b.fontAscii &&
  a.allCaps === b.allCaps && a.smallCaps === b.smallCaps &&
  // runs de elementos de origem diferentes (dentro × fora de um sdt/hyperlink…) não se fundem
  a.src === b.src &&
  sameComments(a.commentIds, b.commentIds);

const sameComments = (a?: number[], b?: number[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

/** Funde runs adjacentes idênticos e remove vazios.
 *  Runs especiais (imagem/campo/nota) nunca se fundem e preservam extras. */
const isSpecial = (r: Run): boolean => !!(r.image || r.field || r.noteRef || r.custom || r.textbox || r.shape || r.group || r.ptab);

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
function splitAt(p: Paragraph, offset: number): number {
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

/** Props efetivas no ponto de inserção (herda do caractere anterior, como o app de referência). */
export function propsAt(model: DocumentModel, pos: DocPosition): RunProps {
  const p = model.paragraphs[pos.para];
  if (!p || p.runs.length === 0) return { ...DEFAULT_RUN_PROPS };
  let acc = 0;
  for (const run of p.runs) {
    if (pos.offset <= acc + run.text.length) return { ...run.props };
    acc += run.text.length;
  }
  return { ...p.runs[p.runs.length - 1]!.props };
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
  const idx = splitAt(p, pos.offset);
  p.runs.splice(idx, 0, { text, props: { ...effective }, ...(rpr ? { rpr } : {}) });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + text.length };
}

/** Insere um run completo sem perder metadados especiais (imagem/campo/plugin). */
export function insertRun(model: DocumentModel, pos: DocPosition, run: Run): DocPosition {
  const p = model.paragraphs[pos.para]!;
  const idx = splitAt(p, pos.offset);
  p.runs.splice(idx, 0, { ...run, props: { ...run.props } });
  normalizeParagraph(p);
  return { para: pos.para, offset: pos.offset + run.text.length };
}

export function splitParagraph(model: DocumentModel, pos: DocPosition): DocPosition {
  const p = model.paragraphs[pos.para]!;
  const idx = splitAt(p, pos.offset);
  const tailRuns = p.runs.slice(idx);
  p.runs = p.runs.slice(0, idx);
  // app de referência: o parágrafo NOVO fica com a primeira metade (¶ novo inserido);
  // o original desce com a segunda. Props de parágrafo são copiadas.
  const tail: Paragraph = { runs: tailRuns, props: { ...p.props } };
  // o pPr tipado vai junto (o motor lê dele o que as props não representam);
  // a quebra de seção é da marca de parágrafo final — só a segunda metade a leva
  if (p.ppr) tail.ppr = p.ppr;
  if (p.props.sectionBreak) { p.props = { ...p.props }; delete p.props.sectionBreak; }
  model.paragraphs.splice(pos.para + 1, 0, tail);
  normalizeParagraph(p);
  normalizeParagraph(tail);
  return { para: pos.para + 1, offset: 0 };
}

export function deleteRange(model: DocumentModel, range: DocRange): DocPosition {
  const { start, end } = normalizeRange(range);
  if (start.para === end.para) {
    const p = model.paragraphs[start.para]!;
    rebuildDelete(p, start.offset, end.offset);
    normalizeParagraph(p);
    return start;
  }
  const first = model.paragraphs[start.para]!;
  const last = model.paragraphs[end.para]!;
  rebuildDelete(first, start.offset, paraLength(first));
  rebuildDelete(last, 0, end.offset);
  // herda props do ÚLTIMO parágrafo (identidade na marca ¶ final — FINDINGS 009)
  first.runs = [...first.runs, ...last.runs];
  first.props = { ...last.props };
  if (last.ppr) first.ppr = last.ppr; else delete first.ppr;
  model.paragraphs.splice(start.para + 1, end.para - start.para);
  normalizeParagraph(first);
  return start;
}

/** Remove [from,to) reconstruindo os runs (mais simples e à prova de índice). */
function rebuildDelete(p: Paragraph, from: number, to: number): void {
  const out: Run[] = [];
  let acc = 0;
  for (const run of p.runs) {
    const rs = acc;
    const re = acc + run.text.length;
    acc = re;
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
