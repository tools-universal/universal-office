/**
 * Operações de SEÇÃO sobre o modelo de edição, com as regras que o Word segue
 * (oráculo de edição em write/tools/sections-lab, fatos na memória do projeto):
 *
 *  - a seção k vai do parágrafo seguinte ao sectionBreak k−1 até o parágrafo que
 *    leva o sectionBreak k; a última termina no fim (o sectPr dela é model.sectPr);
 *  - inserir uma quebra DIVIDE o parágrafo no ponto; a 1ª metade leva o sectPr
 *    novo = cópia completa da seção (tipo antigo incluso) com as refs de
 *    cabeçalho/rodapé, que SAEM da seção de depois (fica vinculada à anterior);
 *    o tipo da quebra vai para a seção de DEPOIS (w:type é "como esta começa");
 *  - colunas: espaçamento padrão 708 tw, largura mínima 720 tw (o espaço encolhe),
 *    predefinições Esquerda/Direita na grade de 3 (não medidas: o COM não alcança
 *    a galeria);
 *  - orientação gira as margens (retrato→paisagem: T'=L, R'=T, B'=R, L'=B).
 */
import type { DocumentModel, Paragraph, SectPr, SectionType } from './document.js';
import { splitParagraph as coreSplit, type DocPosition } from './model-ops.js';

type SectionBreak = NonNullable<Paragraph['props']['sectionBreak']>;
type Refs = NonNullable<DocumentModel['bodyRefs']>;

/** Espaço padrão entre colunas do Word pt-BR (1,25 cm). */
export const COLUMN_SPACE_DEFAULT = 708;
/** Largura mínima de coluna (1,27 cm). */
export const COLUMN_MIN_WIDTH = 720;

export interface SectionRange {
  /** 1º e último parágrafo da seção */
  start: number;
  end: number;
  /** o sectionBreak que encerra a seção (ausente = a última, model.sectPr) */
  sb?: SectionBreak;
}

/** Seções do modelo, na ordem. */
export function sectionRanges(model: DocumentModel): SectionRange[] {
  const out: SectionRange[] = [];
  let start = 0;
  model.paragraphs.forEach((p, i) => {
    const sb = p.props.sectionBreak;
    if (!sb) return;
    out.push({ start, end: i, sb });
    start = i + 1;
  });
  out.push({ start, end: Math.max(start, model.paragraphs.length - 1) });
  return out;
}

/** Índice da seção do parágrafo. */
export function sectionIndexAt(model: DocumentModel, para: number): number {
  const rs = sectionRanges(model);
  const k = rs.findIndex((r) => para <= r.end);
  return k < 0 ? rs.length - 1 : k;
}

/** sectPr da seção k (o objeto do modelo — mudar nele muda a seção). */
export function sectionSectPr(model: DocumentModel, k: number): SectPr {
  return sectionRanges(model)[k]?.sb?.sectPr ?? model.sectPr;
}

/** Refs de cabeçalho/rodapé da seção k no modelo (a última: model.bodyRefs). */
export function sectionRefs(model: DocumentModel, k: number): Refs {
  const r = sectionRanges(model)[k];
  if (r?.sb) return r.sb;
  return (model.bodyRefs ??= { headerRefs: [], footerRefs: [] });
}

const cloneSectPr = (s: SectPr): SectPr => JSON.parse(JSON.stringify(s)) as SectPr;

export interface InsertSectionBreakOptions {
  /** divisão do parágrafo (o editor usa a versão que preserva o w:rPr cru) */
  split?: (m: DocumentModel, pos: DocPosition) => DocPosition;
  /** w:sectPr cru da seção (base da cópia: o que o modelo não representa) */
  raw?: string;
  /** chave da quebra nova no editor */
  id?: number;
}

/**
 * Insere uma quebra de seção no ponto, como o Word: divide o parágrafo (no
 * início ou no fim dele também — a metade vazia é um parágrafo), a 1ª metade
 * encerra a seção nova. Devolve o início da seção de depois (onde o cursor fica).
 */
export function insertSectionBreak(model: DocumentModel, pos: DocPosition, type: SectionType = 'nextPage', opts: InsertSectionBreakOptions = {}): DocPosition {
  const k = sectionIndexAt(model, pos.para);
  const range = sectionRanges(model)[k]!;
  const sp = range.sb ? range.sb.sectPr : model.sectPr;
  const refs = range.sb ?? model.bodyRefs ?? { headerRefs: [], footerRefs: [] };
  const sb: SectionBreak = {
    sectPr: cloneSectPr(sp),
    headerRefs: refs.headerRefs.map((r) => ({ ...r })),
    footerRefs: refs.footerRefs.map((r) => ({ ...r })),
    ...(opts.raw ? { raw: opts.raw } : {}),
    ...(opts.id !== undefined ? { id: opts.id } : {}),
  };
  const next = (opts.split ?? coreSplit)(model, pos);
  const first = model.paragraphs[pos.para]!;
  first.props = { ...first.props, sectionBreak: sb };
  // a seção de depois começa com o tipo da quebra e fica vinculada à anterior
  if (type === 'nextPage') delete sp.type; else sp.type = type;
  if (range.sb) { range.sb.headerRefs = []; range.sb.footerRefs = []; }
  else model.bodyRefs = { headerRefs: [], footerRefs: [] };
  return next;
}

export interface ColumnSpec {
  count: number;
  /** espaço entre colunas iguais (twips; padrão 708) */
  spaceTwips?: number;
  /** larguras próprias (w:equalWidth="0"): largura e espaço depois de cada coluna */
  widths?: { widthTwips: number; spaceTwips: number }[];
  /** linha entre colunas */
  sep?: boolean;
}

/** Largura útil da seção (entre as margens). */
export const contentWidth = (sp: SectPr): number => sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;

/** Máximo de colunas que cabem (largura mínima 720 tw, espaço zero). */
export const maxColumns = (sp: SectPr): number => Math.max(1, Math.floor(contentWidth(sp) / COLUMN_MIN_WIDTH));

/**
 * w:cols de uma especificação, ajustada como o Word: colunas iguais que não
 * cabem com o espaço pedido ficam com 720 tw e o espaço encolhe para
 * ⌊(W − n·720)/(n−1)⌋; mais colunas que ⌊W/720⌋ não cabem. Uma coluna = sem w:cols
 * (o w:space/linha do cru ficam).
 */
export function columnsFor(sp: SectPr, spec: ColumnSpec): SectPr['cols'] {
  const W = contentWidth(sp);
  const n = Math.max(1, Math.min(Math.round(spec.count), maxColumns(sp)));
  if (n < 2) return undefined;
  let space = Math.max(0, Math.round(spec.spaceTwips ?? sp.cols?.spaceTwips ?? COLUMN_SPACE_DEFAULT));
  if ((W - space * (n - 1)) / n < COLUMN_MIN_WIDTH) space = Math.max(0, Math.floor((W - n * COLUMN_MIN_WIDTH) / (n - 1)));
  const cols: NonNullable<SectPr['cols']> = { count: n, spaceTwips: space, sep: !!spec.sep };
  if (spec.widths && spec.widths.length >= n) {
    cols.widths = spec.widths.slice(0, n).map((c, i) => ({
      widthTwips: Math.max(COLUMN_MIN_WIDTH, Math.round(c.widthTwips)),
      // o Word grava o w:space da última coluna com o espaço geral
      spaceTwips: i === n - 1 ? space : Math.max(0, Math.round(c.spaceTwips)),
    }));
  }
  return cols;
}

export type ColumnPreset = 'one' | 'two' | 'three' | 'left' | 'right';

/** Especificação de uma predefinição da galeria Colunas (mantém a linha e o espaço da seção). */
export function presetColumns(sp: SectPr, preset: ColumnPreset): ColumnSpec {
  const sep = !!sp.cols?.sep;
  const space = sp.cols?.spaceTwips ?? COLUMN_SPACE_DEFAULT;
  if (preset === 'one') return { count: 1, sep };
  if (preset === 'two' || preset === 'three') return { count: preset === 'two' ? 2 : 3, spaceTwips: space, sep };
  // Esquerda/Direita: grade de 3 colunas — a estreita é uma, a larga duas mais o vão
  const W = contentWidth(sp);
  const narrow = Math.round((W - 2 * space) / 3);
  const wide = W - narrow - space;
  const ws = preset === 'left' ? [narrow, wide] : [wide, narrow];
  return { count: 2, spaceTwips: space, sep, widths: ws.map((w) => ({ widthTwips: w, spaceTwips: space })) };
}

/** Qual predefinição as colunas da seção são (para marcar na galeria). */
export function columnsPresetOf(sp: SectPr): ColumnPreset | null {
  const c = sp.cols;
  if (!c || c.count < 2) return 'one';
  if (!c.widths) return c.count === 2 ? 'two' : c.count === 3 ? 'three' : null;
  if (c.count !== 2) return null;
  for (const p of ['left', 'right'] as const) {
    const ref = presetColumns(sp, p).widths!;
    if (ref.every((w, i) => Math.abs(w.widthTwips - c.widths![i]!.widthTwips) <= 20)) return p;
  }
  return null;
}

/** Larguras de cada coluna (iguais ou próprias) — o diálogo Mais Colunas. */
export function columnWidths(sp: SectPr): { widthTwips: number; spaceTwips: number }[] {
  const c = sp.cols;
  const W = contentWidth(sp);
  if (!c || c.count < 2) return [{ widthTwips: W, spaceTwips: 0 }];
  if (c.widths) return c.widths.map((w) => ({ ...w }));
  const w = Math.round((W - c.spaceTwips * (c.count - 1)) / c.count);
  return Array.from({ length: c.count }, (_, i) => ({ widthTwips: w, spaceTwips: i < c.count - 1 ? c.spaceTwips : 0 }));
}

/**
 * Orientação da seção como o Word: troca largura/altura do papel e GIRA as
 * margens (retrato→paisagem: superior←esquerda, direita←superior,
 * inferior←direita, esquerda←inferior; a volta é o inverso).
 */
export function setOrientation(sp: SectPr, orientation: 'portrait' | 'landscape'): void {
  const land = sp.pageWidthTwips > sp.pageHeightTwips;
  if ((orientation === 'landscape') === land) return;
  [sp.pageWidthTwips, sp.pageHeightTwips] = [sp.pageHeightTwips, sp.pageWidthTwips];
  const { marginTopTwips: t, marginRightTwips: r, marginBottomTwips: b, marginLeftTwips: l } = sp;
  if (orientation === 'landscape') {
    sp.marginTopTwips = l; sp.marginRightTwips = t; sp.marginBottomTwips = r; sp.marginLeftTwips = b;
  } else {
    sp.marginTopTwips = r; sp.marginRightTwips = b; sp.marginBottomTwips = l; sp.marginLeftTwips = t;
  }
}
