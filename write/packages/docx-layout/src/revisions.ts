/**
 * Exibição das revisões (controle de alterações) no motor. Medido no Word
 * (write/tools/revisions-oracle, PDF "com marcação"):
 *  - inserção sublinhada e exclusão tachada na cor do autor (a cor da revisão
 *    vence a cor e o sublinhado do próprio run); movimentação em verde 2C6234,
 *    origem com tachado duplo e destino com sublinhado duplo;
 *  - formatação controlada não marca o texto (só a barra e o balão);
 *  - cor "por autor": paleta de 20 na ordem em que os autores aparecem;
 *  - barra de alteração preta de 0,72 pt na margem esquerda, borda esquerda em
 *    margem − 36 pt (margem/2 se a margem for menor que 1 pol.), cobrindo a caixa
 *    da linha (a 1ª linha com o espaço antes, a última com o depois).
 * Modos (Exibir para Revisão): 'final' (padrão, sem marcas — o PDF do Word sem
 * marcação), 'simple' (final + barras vermelhas), 'all' e 'original'.
 */
import { paraPropsFromPPr, runPropsFromRPr, type Paragraph, type PPr, type Run, type RPr, type RevisionInfo } from '@universal-office/docx-core';
import { directPPr, directRPr } from './context.js';

export type RevisionMode = 'final' | 'simple' | 'all' | 'original';

/** Como o motor mostra as revisões. */
export interface RevisionView {
  mode: RevisionMode;
  /** "Mostrar Marcação": inserções e exclusões (padrão: sim). Desligado, o texto
   *  aparece como ficaria aceito. */
  insDel?: boolean;
  /** "Mostrar Marcação": formatação (padrão: sim) — só a barra. */
  formatting?: boolean;
  /** só a marcação destes autores aparece (os demais: como aceito); padrão: todos */
  authors?: readonly string[] | null;
  /** cor RRGGBB por autor; padrão: paleta do Word na ordem de `order` */
  colors?: Readonly<Record<string, string>>;
  /** autores na ordem de encontro (cor da paleta); padrão: a ordem de leitura do documento */
  order?: readonly string[];
}

/** Paleta "por autor" do Word 365 (20 cores, recomeça). */
export const AUTHOR_PALETTE = [
  'D13438', '0078D4', '5C2E91', '498205', 'CC3595', '7160E8', '038387', '6D5700', 'CF0F1F', '4E6AED',
  'B146C2', '394146', '0B6A0B', 'CA5010', '750B1C', '5D5A58', '881798', '69797E', '005B70', '8E562E',
] as const;
/** Movimentação (w:moveFrom/To). */
export const MOVE_COLOR = '2C6234';
/** Barra de alteração: Todas as Marcações (preta, medida) e Marcação Simples (vermelha). */
export const BAR_COLOR = '000000';
export const SIMPLE_BAR_COLOR = 'C00000';
/** Largura da barra (twips): 0,72 pt. */
export const BAR_WIDTH = 14.4;

/** Cor de um autor pela ordem de encontro. */
export function authorColor(order: readonly string[], author: string): string {
  const i = order.indexOf(author);
  return AUTHOR_PALETTE[(i < 0 ? order.length : i) % AUTHOR_PALETTE.length]!;
}

/** Borda esquerda da barra (twips) para a margem esquerda da página (twips). */
export function barX(marginLeft: number): number {
  return Math.max(268.8, marginLeft >= 1440 ? marginLeft - 720 : marginLeft / 2);
}

/** Decisão para um run: esconder, mostrar marcado ou como está (null). */
export type RunRevision = 'hide' | { color: string; kind: 'ins' | 'del'; move: boolean } | null;

export class RevisionDisplay {
  readonly mode: RevisionMode;
  private readonly insDel: boolean;
  private readonly fmt: boolean;
  private readonly authors: ReadonlySet<string> | null;
  private readonly order: string[];
  private readonly colors: Readonly<Record<string, string>>;

  constructor(view: RevisionView | undefined, docOrder: readonly string[]) {
    this.mode = view?.mode ?? 'final';
    this.insDel = view?.insDel ?? true;
    this.fmt = view?.formatting ?? true;
    this.authors = view?.authors ? new Set(view.authors) : null;
    this.order = [...(view?.order ?? docOrder)];
    this.colors = view?.colors ?? {};
  }

  /** A marcação desta revisão aparece (modo 'all'/'simple', tipo e autor ligados)? */
  private shown(r: RevisionInfo | undefined, kind: 'insDel' | 'fmt'): boolean {
    if (!r) return false;
    if (kind === 'insDel' ? !this.insDel : !this.fmt) return false;
    return !this.authors || this.authors.has(r.author);
  }

  color(author: string): string {
    return this.colors[author] ?? authorColor(this.order, author);
  }

  /** O run aparece? Marcado? (texto inserido/excluído) */
  run(run: Run): RunRevision {
    const { ins, del } = run.props;
    if (!ins && !del) return null;
    if (this.mode === 'original') return ins ? 'hide' : null;
    const marks = this.mode === 'all';
    if (del) {
      if (!marks || !this.shown(del, 'insDel')) return 'hide';
      return { color: del.move ? MOVE_COLOR : this.color(del.author), kind: 'del', move: !!del.move };
    }
    if (!marks || !this.shown(ins, 'insDel')) return null;
    return { color: ins!.move ? MOVE_COLOR : this.color(ins!.author), kind: 'ins', move: !!ins!.move };
  }

  /** rPr direto a desenhar: no modo Original, o de antes da formatação controlada. */
  directRPr(run: Run): RPr {
    const f = run.props.fmt;
    if (this.mode !== 'original' || !f) return directRPr(run);
    const c = run.rpr?.change;
    // do arquivo e intocada: o rPr antigo exato; criada na edição: as props de antes
    if (c && c.author === f.author && c.date === f.date && JSON.stringify(runPropsFromRPr(c.rPr)) === JSON.stringify(f.old)) return { ...c.rPr };
    const p = run.props;
    return directRPr({ ...run, props: { ...f.old, ...(p.src !== undefined ? { src: p.src } : {}), ...(p.link ? { link: p.link } : {}) } });
  }

  /** Parágrafo a diagramar: no modo Original, com a formatação de antes. */
  paragraph(para: Paragraph): Paragraph {
    const f = para.props.pfmt;
    if (this.mode !== 'original' || !f) return para;
    const c = para.ppr?.change;
    const meta = { ...(para.props.src !== undefined ? { src: para.props.src } : {}), ...(para.props.sectionBreak ? { sectionBreak: para.props.sectionBreak } : {}) };
    if (c && c.author === f.author && c.date === f.date && JSON.stringify(paraPropsFromPPr(c.pPr)) === JSON.stringify(f.old)) {
      const ppr: PPr = { ...c.pPr, ...(para.ppr?.rPr ? { rPr: para.ppr.rPr } : {}) };
      return { ...para, ppr, props: { ...paraPropsFromPPr(ppr), ...meta } };
    }
    return { ...para, ppr: directPPr({ ...para, props: { ...f.old, ...meta } }), props: { ...f.old, ...meta } };
  }

  /** A marca deste parágrafo some (o texto vai para o seguinte) nesta visão? */
  markGone(para: Paragraph): boolean {
    const { markDel, markIns } = para.props;
    if (this.mode === 'original') return !!markIns;
    if (!markDel) return false;
    return this.mode !== 'all' || !this.shown(markDel, 'insDel');
  }

  /** A revisão pede barra nesta visão? (texto, formatação, marca) */
  barFor(r: RevisionInfo | undefined, kind: 'insDel' | 'fmt'): boolean {
    if (!r || (this.mode !== 'all' && this.mode !== 'simple')) return false;
    if (this.mode === 'simple') return kind === 'fmt' ? this.fmt : this.insDel;
    return this.shown(r, kind);
  }

  /** Cor das barras (null = sem barras). */
  barColor(): string | null {
    return this.mode === 'all' ? BAR_COLOR : this.mode === 'simple' ? SIMPLE_BAR_COLOR : null;
  }
}

/** Onde ficavam as marcas excluídas de um parágrafo juntado ao seguinte. */
const REV_JOINS = Symbol('rev-joins');
type JoinedParagraph = Paragraph & { [REV_JOINS]?: number[] };

/** Parágrafo(s) de marca excluída juntado(s) ao seguinte na visão final: o texto
 *  deles na frente, a formatação do seguinte; guarda o ponto da junção. */
export function joinDeleted(carried: Run[], next: Paragraph): Paragraph {
  const out: JoinedParagraph = { ...next, runs: [...carried, ...next.runs] };
  out[REV_JOINS] = [carried.reduce((n, r) => n + r.text.length, 0)];
  return out;
}

/** Faixas [início, fim, escondida] (offsets) do parágrafo com revisão que pede barra,
 *  e se o parágrafo inteiro / a última linha pedem. */
export function revisionRanges(rd: RevisionDisplay, para: Paragraph): { ranges: [number, number, boolean][]; whole: boolean; mark: boolean } | null {
  if (!rd.barColor()) return null;
  const ranges: [number, number, boolean][] = [];
  let acc = 0;
  for (const r of para.runs) {
    const rs = acc;
    acc += r.text.length;
    if (rd.barFor(r.props.ins, 'insDel') || rd.barFor(r.props.del, 'insDel') || rd.barFor(r.props.fmt, 'fmt')) ranges.push([rs, acc, rd.run(r) === 'hide']);
  }
  // marca excluída que sumiu na junção (Marcação Simples): barra na linha da junção
  if (rd.mode === 'simple') for (const k of (para as JoinedParagraph)[REV_JOINS] ?? []) ranges.push([k, k, true]);
  const whole = rd.barFor(para.props.pfmt, 'fmt');
  const mark = rd.barFor(para.props.markIns, 'insDel') || rd.barFor(para.props.markDel, 'insDel');
  return ranges.length || whole || mark ? { ranges, whole, mark } : null;
}
