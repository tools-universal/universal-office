import type {
  FullDocument, Block, Paragraph, TableBlock, Section, SectPr, Run, PBdr, DrawingAnchor, TableCell, DrawingTextbox,
} from '@universal-office/docx-core';
import { presetTextRect } from '@universal-office/drawingml';
import { indexChains, sliceParagraphFrom, remapLines, topBlockOf, topRowOf, CONTINUATION, type TextboxChain } from './chain.js';
import { runPropsFromRPr, paraPropsFromPPr, revisionAuthors } from '@universal-office/docx-core';
import { DocContext, emptyFormatting, directPPr, type LayoutOptions, type FlowState, type NoteNumbering } from './context.js';
import { faceMetrics, type FontProvider } from './fonts.js';
import { prepareParagraph, resolvePPr, isDark, paraVisibility, isMarkRun, type PreparedPara, type ParaEnv } from './para.js';
import { LineBreaker, type Line } from './lines.js';
import { paintLine, paintParaBox, borderWidth, pageBorderItems } from './paint.js';
import { dateFieldValue } from './datefmt.js';
import { layoutTable, shiftItem, isHiddenRow, mergeTextFirst, dropMoved, splitContent, atPageTop, LATE_ITEMS, type TableLayout, type CellContent, type ParaSplitInfo, type NestRow } from './table.js';
import type { LayoutPage, LayoutResult, PageItem, LaidOutLine, LineParaFormat, PlacedObject, PictureLook } from './tree.js';
import { BAR_WIDTH, barX, joinDeleted } from './revisions.js';
import { resolveColor, resolveDrawingColor, shadingFill } from './resolve.js';
import { formatNumber } from './numbering.js';
import { NumberingState, type NumberMarker } from './numbering.js';
import { isEmf, renderEmf } from './emf.js';
import { isWmf, renderWmf } from './wmf.js';
import { groupChild, shapeExtras, withThemeStyles } from './geometry.js';
import { pictureLook } from './picture.js';
import { resolvePageFill } from './page-fill.js';
import { liftFrames, FRAME_SKIP, FRAME_CARRY, FRAME_INFO } from './frames.js';

/**
 * Motor de layout de documento: seções → páginas → colunas, parágrafos
 * (espaçamento colapsado pelo maior, contextual, autospacing, viúvas/órfãs,
 * keepNext/keepLines), tabelas, cabeçalhos/rodapés (que empurram o corpo),
 * objetos flutuantes e campos de página. Regras medidas no Word: ver
 * write/tools/layout-oracle e os .word.json em test/oracle.
 */

interface SectGeom {
  index: number;
  pageW: number;
  pageH: number;
  marL: number;
  marR: number;
  marT: number;
  marB: number;
  hdr: number;
  ftr: number;
  cols: { x: number; w: number }[];
  colSep: boolean;
  titlePg: boolean;
  type: string;
  vAlign?: string;
  pgStart?: number;
  pgFmt?: string;
  /** w:pgNumType chapStyle/chapSep: número do capítulo antes do da página (campo PAGE) */
  chap?: { level: number; sep: string };
  headers: { default?: Block[]; first?: Block[]; even?: Block[] };
  footers: { default?: Block[]; first?: Block[]; even?: Block[] };
  blocks: [number, number];
  /** w:lnNumType */
  lnNum?: { countBy: number; start: number; restart: string; distance: number };
  /** grade de linhas (docGrid type=lines/linesAndChars): passo em twips */
  linePitch?: number;
  /** notas: numeração efetiva da seção (sectPr sobre o settings), local das de rodapé
   *  (pageBottom | beneathText) e colunas da área de notas (w15:footnoteColumns) */
  notes: { footnote: NoteNumbering; endnote: NoteNumbering; fnPos: string; fnCols?: number };
  /** chave do equilíbrio de colunas (padrão: o índice da seção; a área das notas de
   *  fim é equilibrada à parte) */
  balKey?: number;
}

const balKey = (g: SectGeom): number => g.balKey ?? g.index;

interface FloatBox {
  x: number; y: number; w: number; h: number;
  wrap: string;
  /** wrapText: lado(s) por onde o texto passa (bothSides | left | right | largest) */
  side?: string;
  distL: number; distR: number; distT: number; distB: number;
  /** do cabeçalho/rodapé nos modos ≤ 14: só o texto do CORPO o contorna (oráculo hff14wrap) */
  bodyOnly?: boolean;
  /** justo/através com polígono não retangular (twips da página): a faixa da linha
   *  bloqueia a projeção do polígono nela (oráculo wrapcontour) */
  poly?: [number, number][];
}

/**
 * Projeção em x do polígono cortado pela faixa horizontal [ya, yb]: os intervalos
 * (já unidos) ocupados pelo contorno naquela faixa — pedaços das arestas dentro
 * da faixa e o interior nas duas bordas dela.
 */
export function polyBandIntervals(poly: readonly (readonly [number, number])[], ya: number, yb: number): [number, number][] {
  const iv: [number, number][] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % n]!;
    const lo = Math.max(ya, Math.min(y0, y1)), hi = Math.min(yb, Math.max(y0, y1));
    if (lo > hi) continue;
    if (y0 === y1) { iv.push([Math.min(x0, x1), Math.max(x0, x1)]); continue; }
    const xa = x0 + ((lo - y0) / (y1 - y0)) * (x1 - x0), xb = x0 + ((hi - y0) / (y1 - y0)) * (x1 - x0);
    iv.push([Math.min(xa, xb), Math.max(xa, xb)]);
  }
  // interior nas bordas da faixa (regra par-ímpar)
  for (const yy of [ya, yb]) {
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % n]!;
      if ((y0 <= yy) !== (y1 <= yy)) xs.push(x0 + ((yy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) iv.push([xs[k]!, xs[k + 1]!]);
  }
  iv.sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of iv) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1e-6) last[1] = Math.max(last[1], b); else out.push([a, b]);
  }
  return out;
}

/** espaço da linha contornando flutuantes: o vão mais largo, os vãos todos
 *  (objeto no meio) ou até onde descer (sem espaço útil) */
interface WrapFrame { left: number; right: number; skipTo?: number; segs?: [number, number][]; gap?: boolean }

interface PageState {
  page: LayoutPage;
  geom: SectGeom;
  bodyTop: number;
  bodyBottom: number;
  /** objetos flutuantes por camada (ordem final por relativeHeight) */
  behind: ZObj[];
  hf: PageItem[];
  body: PageItem[];
  front: ZObj[];
  hfBehind: ZObj[];
  hfFront: ZObj[];
  floats: FloatBox[];
  /** índice da página dentro da seção (0 = primeira) */
  sectPage: number;
  /** notas de rodapé desta página (ids, na ordem) e o conteúdo já diagramado */
  notes: { id: number; content: CellContent }[];
  /** altura reservada no pé (separador + notas) e o fundo do corpo sem notas */
  noteArea: number;
  bodyBottomBase: number;
  /** página tomada pela continuação de uma nota (o corpo segue na próxima) */
  notesFull?: boolean;
  /** colunas da página quando a seção seguinte entrou por "próxima coluna": o
   *  resto da página fica com as colunas de antes (oráculo sections, nc-2to2-margin) */
  cols?: { x: number; w: number }[];
}

/** Objeto flutuante com sua ordem z (wp:anchor relativeHeight / VML z-index). */
interface ZObj { z: number; seq: number; items: PageItem[] }
const zItems = (objs: ZObj[]): PageItem[] => [...objs].sort((a, b) => a.z - b.z || a.seq - b.seq).flatMap((o) => o.items);

interface PrevPara {
  after: number;
  afterAuto: boolean;
  /** lista (abstractNum) do parágrafo numerado/com marcador */
  list?: string;
  styleId?: string;
  contextual: boolean;
  pBdr?: PBdr;
  pBdrKey?: string;
  boxBottomItemIdx?: number;
}

/** Parágrafo vizinho de uma célula na ordem do documento (espaçamento contextual). */
interface CtxNeighbor { styleId?: string }
/** Vizinhos de uma célula: antes do 1º e depois do último parágrafo dela. */
interface CellNeighbors { prev?: CtxNeighbor; next?: CtxNeighbor }

const EMPTY_LINES: LaidOutLine[] = [];
/** Número de capítulo por nível de título: as páginas (índice) onde cada título começa, na ordem. */
export type ChapterIndex = Map<number, { page: number; text: string }[]>;
/** w:chapSep → caractere entre o capítulo e a página (oráculo hfopts, chap-*). */
const CHAP_SEP: Record<string, string> = { hyphen: '-', period: '.', colon: ':', emDash: '—', enDash: '–' };
const sameChapters = (a: ChapterIndex, b: ChapterIndex): boolean =>
  a.size === b.size && [...a].every(([k, v]) => { const w = b.get(k); return !!w && w.length === v.length && v.every((x, i) => x.page === w[i]!.page && x.text === w[i]!.text); });
/** Espessura da linha entre colunas (w:sep) no PDF do Word: 0,84 pt (oráculo sections, sep-*). */
const COL_SEP_W = 16.8;

/** parágrafo de marca oculta (com texto visível) à espera do seguinte */
interface HiddenJoin { para: Paragraph; marker: PreparedPara['marker'] }

export function layoutDocument(full0: FullDocument, provider: FontProvider, opts: LayoutOptions = {}): LayoutResult {
  // revisões: cor por autor na ordem de leitura do documento (a ordem de encontro do Word)
  if (opts.revisions && opts.revisions.mode !== 'final' && !opts.revisions.order) opts = { ...opts, revisions: { ...opts.revisions, order: revisionAuthors(full0) } };
  const fmt = full0.formatting ?? emptyFormatting();
  // molduras (w:framePr) saem do fluxo: viram caixas ancoradas no parágrafo seguinte
  const lifted = liftFrames(full0.blocks, new Set(full0.sections.map((s) => s.blockEnd)));
  const full: FullDocument = lifted === full0.blocks ? full0 : { ...full0, blocks: lifted };
  // NUMPAGES e PAGEREF dependem do próprio layout: a 1ª passada estima, as
  // seguintes usam o total de páginas e as páginas dos indicadores da anterior
  let total = 1;
  let marks = new Map<string, string>();
  let result: LayoutResult | null = null;
  // flutuantes de posição vertical absoluta que cobrem texto JÁ diagramado da
  // página (ancorados depois dele): a passada seguinte os coloca no início da
  // página e o texto de antes os contorna (oráculo latefloat)
  let late = new Map<number, Run[]>();
  // tabelas flutuantes (âncora no texto) que cobrem linhas JÁ diagramadas antes
  // delas: na passada seguinte entram no início da página, na posição achada, e o
  // texto de antes as contorna (oráculo ftable2, ft2-form*)
  let lateTables = new Map<number, LateTable>();
  // notas de rodapé "reiniciar a cada página": a marca depende da página onde a nota
  // saiu — a passada seguinte usa as da anterior
  let noteMarks: Map<string, string> | undefined;
  // NOTEREF: a marca da nota referida (ela pode vir depois do campo — a passada
  // seguinte usa as marcas da anterior)
  let noteRefs = new Map<string, string>();
  const newCtx = (): DocContext => {
    const c = new DocContext(fmt, provider, opts);
    if (noteMarks) c.noteMarkOverride = noteMarks;
    return c;
  };
  // número de capítulo no PAGE: as páginas dos títulos vêm da passada anterior
  let chaps: ChapterIndex = new Map();
  let last: Engine | null = null;
  for (let pass = 0; pass < 5; pass++) {
    const eng = new Engine(newCtx(), full, total, marks, late, lateTables, new Map(), noteRefs);
    eng.chaptersGuess = chaps;
    result = eng.run();
    last = eng;
    const newMarks = eng.usedPageRef ? eng.bookmarkPages() : marks;
    const newNoteRefs = eng.usedNoteRef ? eng.ctx.allNoteMarks() : noteRefs;
    const newLate = eng.lateFound.size ? mergeLate(late, eng.lateFound) : late;
    const newLateTables = eng.lateTablesFound.size ? new Map([...lateTables, ...eng.lateTablesFound]) : lateTables;
    const fix = eng.noteMarkFix();
    const newChaps = eng.usedChapter ? eng.chapterIndex() : chaps;
    const stable = (!eng.usedNumPages || result.pages.length === total)
      && (!eng.usedPageRef || sameMap(newMarks, marks)) && (!eng.usedNoteRef || sameMap(newNoteRefs, noteRefs))
      && newLate === late && newLateTables === lateTables && !fix
      && (!eng.usedChapter || sameChapters(newChaps, chaps));
    if (stable) break;
    chaps = newChaps;
    total = result.pages.length;
    marks = newMarks;
    noteRefs = newNoteRefs;
    late = newLate;
    lateTables = newLateTables;
    if (fix) noteMarks = fix;
  }
  // seções de várias colunas encerradas por quebra CONTÍNUA: o Word equilibra as
  // colunas da última página da seção — a menor altura de coluna com que o conteúdo,
  // enchido em sequência, ainda cabe nas colunas da página (oráculo colbal)
  const balance = new Map<number, BalanceSpec>();
  const runWith = (bal: Map<number, BalanceSpec>): Engine => {
    const eng = new Engine(newCtx(), full, total, marks, late, lateTables, bal, noteRefs);
    eng.chaptersGuess = chaps;
    result = eng.run();
    return eng;
  };
  const done = new Set<number>();
  for (let guard = 0; guard < 20 && last; guard++) {
    const next = [...last.balanceFound].find(([s, i]) => !done.has(s) && i.n > 1);
    if (!next) break;
    const [s, info] = next;
    done.add(s);
    let lo = Math.max(0, Math.floor(info.sum / info.n) - 1), hi = Math.ceil(info.bottom - info.colTop);
    if (hi <= lo + 1) continue;
    // cabe na página e a última coluna não fica mais comprida que a 1ª: o Word deixa
    // a linha que passa da média na 1ª coluna (oráculo sections, cont-2col-after0, sep-cont)
    const fits = (h: number): boolean => {
      const f = runWith(new Map([...balance, [s, { page: info.page, h }]])).balanceFound.get(s);
      return f?.page === info.page && f.used[f.used.length - 1]! <= f.used[0]! + 1;
    };
    if (!fits(hi)) continue;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) hi = mid; else lo = mid;
    }
    balance.set(s, { page: info.page, h: hi });
    last = runWith(balance);
  }
  return result!;
}

/** Coluna equilibrada: página (índice) da última página da seção e altura das colunas. */
interface BalanceSpec { page: number; h: number }
/** Conteúdo da seção na sua última página (passada sem equilíbrio): soma das alturas usadas. */
interface BalanceInfo { page: number; colTop: number; bottom: number; sum: number; n: number; used: number[] }

/** Tabela flutuante tardia: página (índice) e y do fluxo de referência da âncora. */
interface LateTable { page: number; flowY: number }

/** Junta os flutuantes tardios achados numa passada (o mesmo objeto não entra duas vezes). */
function mergeLate(a: Map<number, Run[]>, b: Map<number, Run[]>): Map<number, Run[]> {
  const seen = new Set<Run>([...a.values()].flat());
  let out: Map<number, Run[]> | null = null;
  for (const [pg, runs] of b) for (const r of runs) {
    if (seen.has(r)) continue;
    seen.add(r);
    out ??= new Map([...a].map(([k, v]) => [k, [...v]]));
    (out.get(pg) ?? out.set(pg, []).get(pg)!).push(r);
  }
  return out ?? a;
}

function sameMap(a: Map<string, string>, b: Map<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

class Engine {
  pages: PageState[] = [];
  cur!: PageState;
  col = 0;
  y = 0;
  /** topo da área de colunas corrente (muda numa seção contínua) */
  colTop = 0;
  atTop = true;
  /** topo de página que MANTÉM o espaço antes do próximo parágrafo (1º da seção
   *  nova, parágrafo que começa com quebra de página, quebra antes no modo ≤ 14):
   *  o "depois" do último parágrafo da página anterior, que o Word desconta —
   *  espaço = colapso(depois, antes) − depois (oráculo tocref-sectgap). null = suprime */
  topGapPrevAfter: number | null = null;
  prev: PrevPara | null = null;
  firstInDoc = true;
  usedNumPages = false;
  geoms: SectGeom[] = [];
  /** numeração de linhas: contador e onde foi zerado */
  lnCount = 0;
  lnPage: PageState | null = null;
  lnSect = -1;
  /** última linha de tabela emitida (borda de fechamento na quebra de página) */
  lastRowEmit: { row: TableLayout['rows'][number]; y: number } | null = null;
  /** diagramando cabeçalho/rodapé (floats vão para as camadas do HF) */
  inHf = false;
  /** linhas de tabelas flutuantes que continuam na próxima página */
  private floatCarry: { t: TableLayout; rows: TableLayout['rows']; fp: NonNullable<TableBlock['tblPr']>['tblpPr'] & object; refX: number }[] = [];
  /** tabela flutuante que parte: partes de linhas emitidas e mesclas verticais que
   *  atravessam a página (o texto flui pelas partes — oráculo ftvmsplit) */
  private floatFlow = new WeakMap<TableLayout, {
    idx: Map<object, number>; moved: Set<object>; seen: Set<object>;
    emits: { ri: number; ps: PageState; y: number; h: number; out: PageItem[]; at: number; yOrigin: number; refX: number; cut?: number }[];
    merges: { start: number; end: number; col: number; content: CellContent; off: number; vAlign?: string }[];
  }>();
  /** medição do rodapé: ignora flutuantes de posição absoluta */
  onlyTextFloats = false;
  /** flutuantes já posicionados antes do fluxo (posição vertical absoluta no HF) */
  prePlaced = new Set<Run>();
  zSeq = 0;

  usedPageRef = false;
  /** campo PAGE com número de capítulo: títulos de cada nível por página (passada anterior) */
  chaptersGuess: ChapterIndex = new Map();
  usedChapter = false;
  /** títulos numerados (estilo Título N) diagramados nesta passada: ref → nível e número */
  private headingMarks = new Map<string, { level: number; text: string }>();

  constructor(
    readonly ctx: DocContext, public full: FullDocument, readonly totalPagesGuess: number,
    /** página exibida de cada indicador (passada anterior) — PAGEREF */
    readonly marksGuess: Map<string, string> = new Map(),
    /** flutuantes tardios (passada anterior): índice da página → objetos */
    readonly lateFloats: Map<number, Run[]> = new Map(),
    /** tabelas flutuantes tardias (passada anterior): bloco → página e y de referência */
    readonly lateTables: Map<number, LateTable> = new Map(),
    /** colunas equilibradas: seção → página e altura (busca em layoutDocument) */
    readonly balance: Map<number, BalanceSpec> = new Map(),
    /** marcas das notas (passada anterior) — NOTEREF para nota que vem depois */
    readonly noteRefGuess: Map<string, string> = new Map(),
  ) {}

  usedNoteRef = false;

  /** seções de várias colunas seguidas de seção contínua: o que ocupam na última página */
  balanceFound = new Map<number, BalanceInfo>();
  /** alturas usadas pelas colunas já encerradas na porção da seção nesta página */
  private colUsed: number[] = [];
  /** fundo do corpo antes do limite de coluna equilibrada (restaurado na seção seguinte) */
  private balanceSaved: number | null = null;

  /** Limita a altura das colunas na última página de uma seção equilibrada. */
  private applyBalance(): void {
    const spec = this.balance.get(balKey(this.cur.geom));
    if (!spec || spec.page !== this.pages.length - 1) return;
    this.balanceSaved = this.cur.bodyBottom;
    this.cur.bodyBottom = Math.min(this.cur.bodyBottom, this.colTop + spec.h);
  }

  /** flutuantes tardios achados nesta passada */
  lateFound = new Map<number, Run[]>();
  lateTablesFound = new Map<number, LateTable>();
  /** tabelas flutuantes do corpo já colocadas (blocos) */
  private placedTables = new Set<number>();
  /** tabelas tardias (início da página) que partiram: a âncora vai para a continuação */
  private lateSplit = new Set<number>();

  /** SEQ id [\* formato] [\r n] [\c] [\h] [\s n] — contadores na ordem do documento;
   *  \s n zera o contador se houve título de nível ≤ n desde a última vez que ele
   *  contou (oráculo refs-lab, sr-*: um título 2 não zera o \s 1). */
  private seqValue(instr: string): string | undefined {
    const tok = instr.trim().split(/\s+/);
    const id = tok[1]?.toLowerCase();
    if (!id || id.startsWith('\\')) return undefined;
    const reset = parseInt(/\\s\s*(\d)/i.exec(instr)?.[1] ?? '', 10);
    const since = this.ctx.seqHeads.get(id) ?? 0;
    if (reset && this.ctx.heads.slice(since).some((l) => l <= reset)) this.ctx.seqCounters.set(id, 0);
    this.ctx.seqHeads.set(id, this.ctx.heads.length);
    let v = this.ctx.seqCounters.get(id) ?? 0;
    const r = /\\r\s*(\d+)/i.exec(instr);
    if (r) v = parseInt(r[1]!, 10);
    else if (!/\\c\b/i.test(instr)) v++;
    this.ctx.seqCounters.set(id, v);
    if (/\\h\b/i.test(instr)) return '';
    const fmt = /\\\*\s*(\w+)/.exec(instr)?.[1] ?? 'ARABIC';
    const map: Record<string, string> = { ARABIC: 'decimal', ALPHABETIC: 'upperLetter', alphabetic: 'lowerLetter', ROMAN: 'upperRoman', roman: 'lowerRoman' };
    return formatNumber(v, map[fmt] ?? 'decimal', this.ctx.opts.lang);
  }

  /**
   * "acima"/"abaixo" (REF/NOTEREF \p): o campo vem depois do indicador ou antes
   * dele, na ordem do documento (oráculo refs-lab, xr-*-pos, xr-before). Sem a
   * posição do campo (cabeçalho, caixa), mantém o cache.
   */
  private positionWord(bm: string, block?: number, at?: number): string | undefined {
    const b = this.full.bookmarks?.get(bm);
    if (b === undefined || block === undefined || block < 0) return undefined;
    // no mesmo parágrafo vale a posição: antes do indicador é "abaixo" (oráculo refs, ref-pos)
    const off = this.full.bookmarkOffsets?.get(bm) ?? 0;
    const below = block < b || (block === b && at !== undefined && at < off);
    const pt = /^pt/i.test(this.ctx.opts.lang);
    return below ? (pt ? 'abaixo' : 'below') : (pt ? 'acima' : 'above');
  }

  /** NOTEREF indicador: a marca da nota cuja referência está no trecho do indicador. */
  private noteRefValue(instr: string, block?: number, at?: number): string | undefined {
    const bm = instr.trim().split(/\s+/)[1];
    if (!bm) return undefined;
    if (/\\p\b/i.test(instr)) return this.positionWord(bm, block, at);
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== undefined ? this.full.blocks[b] : undefined;
    if (!blk || blk.type !== 'paragraph') return undefined;
    const from = this.full.bookmarkOffsets?.get(bm) ?? 0;
    const end = this.full.bookmarkEnds?.get(bm);
    const to = end && end.block === b ? end.offset : Infinity;
    let acc = 0;
    for (const r of blk.paragraph.runs) {
      const rs = acc;
      acc += r.text.length;
      if (!r.noteRef || r.noteRef.custom || rs < from || rs > to || (rs === to && to > from)) continue;
      this.usedNoteRef = true;
      const { kind, id } = r.noteRef;
      return this.ctx.noteMarkOf(kind, id) ?? this.noteRefGuess.get(`${kind[0]}${id}`);
    }
    return undefined;
  }

  /** REF indicador: o texto do trecho do indicador (sem o fim conhecido, o parágrafo
   *  dele); \n \r \w = número do parágrafo; \p = acima/abaixo. */
  private refValue(instr: string, block?: number, at?: number): string | undefined {
    const tok = instr.trim().split(/\s+/);
    const bm = tok[1];
    if (!bm) return undefined;
    if (/\\p\b/i.test(instr)) return this.positionWord(bm, block, at);
    if (/\\[nrw]\b/i.test(instr)) {
      // número do parágrafo: o Word recalcula na exportação; sem os pontos finais,
      // e "0" se o parágrafo do indicador não é numerado (oráculo numbering3, ref-num).
      // \w = contexto completo (os níveis acima que o número não cita, \d entre eles);
      // \n e \r (de fora da lista) = o número do nível (oráculo refs-lab, rn-*)
      const bi = this.full.bookmarks?.get(bm);
      if (bi === undefined || this.full.blocks[bi]?.type !== 'paragraph') return undefined;
      const m = this.listNumberOf(bi);
      if (!m?.text) return '0';
      const sep = /\\d\s+"([^"]*)"/i.exec(instr)?.[1];
      const t = /\\w\b/i.test(instr) && m.parts ? m.parts.join(sep ?? '') : m.text;
      return t.replace(/\.+$/, '');
    }
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== undefined ? this.full.blocks[b] : undefined;
    if (!blk || blk.type !== 'paragraph') return undefined;
    const end = this.full.bookmarkEnds?.get(bm);
    const from = this.full.bookmarkOffsets?.get(bm);
    if (end && from !== undefined && end.block === b) {
      // o trecho exato (campos pelo resultado em cache: "Figura 1 - Gráfico")
      let text = '', acc = 0;
      for (const x of blk.paragraph.runs) {
        const rs = acc;
        acc += x.text.length;
        if (x.image || x.textbox || x.shape || x.group) continue;
        text += x.text.slice(Math.max(0, from - rs), Math.max(0, end.offset - rs));
      }
      return text || undefined;
    }
    const text = blk.paragraph.runs.map((x) => (x.field || x.image || x.textbox ? '' : x.text)).join('').replace(/[\t\n\f\u000B]/g, ' ').trim();
    return text || undefined;
  }

  /** número de lista de cada parágrafo do corpo (bloco → marcador), na ordem do documento */
  private listTexts?: Map<number, NumberMarker | null>;
  private listNumberOf(block: number): NumberMarker | null | undefined {
    if (!this.listTexts) {
      const out = new Map<number, NumberMarker | null>();
      const saved = this.ctx.numbering;
      const st = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      this.ctx.numbering = st;
      const num = (para: Paragraph): NumberMarker | null => {
        const n = resolvePPr(this.ctx, para, {}).ppr.numPr;
        return n?.numId ? st.next(n.numId, n.ilvl ?? 0) : null;
      };
      const visit = (b: Block): void => {
        if (b.type === 'paragraph') { num(b.paragraph); return; }
        for (const row of b.rows) {
          for (const cell of row.cells) for (const c of cell.blocks ?? cell.paragraphs.map((paragraph): Block => ({ type: 'paragraph', paragraph }))) visit(c);
        }
      };
      try {
        this.full.blocks.forEach((b, i) => { if (b.type === 'paragraph') out.set(i, num(b.paragraph)); else visit(b); });
      } finally { this.ctx.numbering = saved; }
      this.listTexts = out;
    }
    return this.listTexts.get(block);
  }

  /** Nível N do estilo de título interno do parágrafo ("heading N" — o próprio
   *  estilo, como o STYLEREF procura), 0 = outro estilo. */
  private headingStyleLevel(p: Paragraph): number {
    const id = p.props.styleId ?? p.ppr?.pStyle;
    const name = id ? this.ctx.fmt.styles.styles[id]?.name : undefined;
    const m = name ? /^heading ([1-9])$/i.exec(name) : null;
    return m ? +m[1]! : 0;
  }

  /**
   * STYLEREF n [\s|\n] no corpo: o título de nível n mais próximo ANTES do campo
   * (no próprio parágrafo inclusive); sem nenhum, o primeiro depois (oráculo
   * refs-lab, sr-*). Sem switch: o texto do título; \n: o número (sem ponto
   * final; "0" sem número); \s: só os números ("Cap %1" → "1"). Sem título
   * desse nível: a mensagem de erro do Word.
   */
  private styleRefValue(instr: string, block?: number): string | undefined {
    const n = parseInt(/^\s*STYLEREF\s+"?([1-9])"?/i.exec(instr)?.[1] ?? '', 10);
    if (!n || block === undefined || block < 0) return undefined;
    const blocks = this.full.blocks;
    const at = (i: number): boolean => { const b = blocks[i]; return b?.type === 'paragraph' && this.headingStyleLevel(b.paragraph) === n; };
    let hit = -1;
    for (let i = Math.min(block, blocks.length - 1); i >= 0 && hit < 0; i--) if (at(i)) hit = i;
    for (let i = block + 1; i < blocks.length && hit < 0; i++) if (at(i)) hit = i;
    if (hit < 0) return /^pt/i.test(this.ctx.opts.lang) ? 'Erro! Nenhum texto com o estilo especificado foi encontrado no documento.' : 'Error! No text of specified style in document.';
    const p = (blocks[hit] as Extract<Block, { type: 'paragraph' }>).paragraph;
    if (/\\[sn]\b/i.test(instr)) {
      const m = this.listNumberOf(hit);
      if (!m?.text) return '0';
      return (/\\s\b/i.test(instr) ? (m.level.numFmt === 'bullet' ? m.text : (m.chapter ?? '')) : m.text).replace(/\.+$/, '');
    }
    return p.runs.map((x) => (x.image || x.textbox || x.shape || x.group ? '' : x.text)).join('').replace(/[\t\n\f\u000B]/g, ' ').trim();
  }

  /**
   * Reinício a cada página (w:numRestart eachPage): a marca de cada nota pela
   * página onde ela saiu (a continuação de nota partida não conta de novo). null =
   * as marcas desta passada já valem; senão todas as marcas certas, para a próxima.
   */
  noteMarkFix(): Map<string, string> | null {
    const want = new Map<string, string>();
    let differs = false;
    const seen = new Set<number>();
    for (const ps of this.pages) {
      const nn = ps.geom.notes.footnote;
      let k = 0;
      for (const n of ps.notes) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        const cur = this.ctx.noteMarkOf('footnote', n.id);
        if (!cur || nn.restart !== 'eachPage') continue;
        const m = formatNumber(nn.start - 1 + ++k, nn.fmt, this.ctx.opts.lang);
        want.set(`f${n.id}`, m);
        if (m !== cur) differs = true;
      }
    }
    return differs ? want : null;
  }

  /** Página exibida (já formatada) do parágrafo de cada indicador. */
  /** Número de capítulo da página `page` no nível `level`: o do ÚLTIMO título do
   *  nível que começa nela ou antes; antes do 1º título, o do 1º; sem título
   *  numerado, nenhum (o PAGE fica só com a página) — oráculo hfopts, chap-*. */
  private chapterOf(level: number, page: number): string | undefined {
    this.usedChapter = true;
    const list = this.chaptersGuess.get(level);
    if (!list?.length) return undefined;
    let out = list[0]!.text;
    for (const h of list) { if (h.page > page) break; out = h.text; }
    return out;
  }

  /** Títulos numerados desta passada por nível: a página onde cada um começa. */
  chapterIndex(): ChapterIndex {
    const out: ChapterIndex = new Map();
    const seen = new Set<string>();
    this.pages.forEach((ps, i) => {
      for (const l of ps.page.lines) {
        const h = this.headingMarks.get(l.ref);
        if (!h || seen.has(l.ref)) continue;
        seen.add(l.ref);
        const arr = out.get(h.level) ?? [];
        arr.push({ page: i, text: h.text });
        out.set(h.level, arr);
      }
    });
    return out;
  }

  bookmarkPages(): Map<string, string> {
    const out = new Map<string, string>();
    const firstPage = new Map<number, LayoutPage>();
    /** linhas de cada parágrafo do corpo: fim (offset) e página, na ordem */
    const paraLines = new Map<number, { end: number; page: LayoutPage }[]>();
    for (const ps of this.pages) {
      for (const l of ps.page.lines) {
        const m = /^b(\d+)/.exec(l.ref);
        if (m && !firstPage.has(+m[1]!)) firstPage.set(+m[1]!, ps.page);
        if (m && l.ref === `b${m[1]}`) {
          const arr = paraLines.get(+m[1]!) ?? [];
          arr.push({ end: l.end, page: ps.page });
          paraLines.set(+m[1]!, arr);
        }
      }
    }
    for (const [name, block] of this.full.bookmarks ?? []) {
      // indicador em bloco sem linha (vazio): a próxima linha diagramada
      let pg: LayoutPage | undefined;
      // dentro do parágrafo: a linha que contém a posição do indicador (depois de
      // uma quebra de página no meio do parágrafo, a página seguinte — oráculo tocref-pbstart)
      const off = this.full.bookmarkOffsets?.get(name);
      if (off !== undefined) pg = paraLines.get(block)?.find((l) => l.end > off)?.page;
      for (let b = block; b < block + 50 && !pg; b++) pg = firstPage.get(b);
      if (!pg) continue;
      const ps = this.pages.find((x) => x.page === pg)!;
      out.set(name, formatNumber(pg.number, ps.geom.pgFmt ?? 'decimal', this.ctx.opts.lang));
    }
    return out;
  }

  run(): LayoutResult {
    const full = this.full;
    // sequencial: cada seção herda cabeçalho/rodapé da anterior (geomOf lê this.geoms)
    this.geoms = [];
    full.sections.forEach((s, i) => { this.geoms.push(this.geomOf(s, i)); });
    if (!this.geoms.length) {
      this.geoms.push(this.geomOf({
        sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
        blockStart: 0, blockEnd: full.blocks.length - 1, headers: {}, footers: {}, headerRefs: [], footerRefs: [],
      } as Section, 0));
    }
    // (até o Word 16.0.19xxx, o PDF exportado direto recomeçava as listas com
    // startOverride depois do bloco que abre a 2ª página; o Word 16.0.20430,
    // de 2026-10-18, numera em sequência — oráculo numbering3, pg2-*)
    // notas de fim no fim de cada seção (settings w:endnotePr/w:pos sectEnd) ou do documento
    const enSectEnd = this.ctx.fmt.settings.endnotePr?.pos === 'sectEnd';
    for (const g of this.geoms) {
      // numeração das notas da seção (reinício por seção vale a partir daqui)
      this.ctx.beginNoteSection(g.notes, g.index === 0);
      // contínua (ou próxima coluna) para outro tamanho/orientação de papel: o Word
      // começa página nova (oráculo sections, cont-landscape); só margens mudam na mesma
      const samePaper = !!this.cur && this.cur.page.widthTw === g.pageW && this.cur.page.heightTw === g.pageH;
      if (g.index > 0 && g.type === 'nextColumn' && samePaper && this.nextColumnFits(g)) this.nextColumnSection(g);
      else if (g.index === 0 || g.type !== 'continuous' || !samePaper) {
        const lastAfter = this.prev ? this.prev.after : 0;
        this.newPage(g, g.type);
        // seção nova (próxima página/par/ímpar): o 1º parágrafo mantém o espaço
        // antes, descontado o "depois" do último da seção anterior (tocref-sectgap)
        if (g.index > 0) this.topGapPrevAfter = lastAfter;
      } else this.continuousSection(g);
      for (let b = g.blocks[0]; b <= g.blocks[1] && b < full.blocks.length; b++) {
        const block = full.blocks[b]!;
        if (block.type === 'paragraph') this.placeParagraph(block.paragraph, `b${b}`, b, g);
        else this.placeTable(block, `b${b}`, b);
      }
      // a seção que suprime as notas (w:noEndnote) passa as dela para a seguinte
      // (oráculo endnotes, en-noend); no fim do documento saem todas
      const lastSect = g === this.geoms[this.geoms.length - 1];
      if (lastSect || (enSectEnd && !full.sections[g.index]?.sect?.noEndnote)) this.placeEndnotes(g);
    }
    // tabela flutuante dividida no fim do documento: as linhas restantes ganham páginas
    for (let k = 0; k < 100 && this.floatCarry.length && this.cur; k++) this.newPage(this.cur.geom);
    if (this.cur) { this.closeColumns(); this.paintNotes(this.cur); }
    // finaliza páginas (cabeçalhos/rodapés já entram na criação)
    // fundo da página (w:background): o Word o grava no PDF (corpus); branco = nada
    const bgSpec = full.background;
    const bg = bgSpec ? resolveColor({ ...(bgSpec.color ? { val: bgSpec.color } : {}), ...(bgSpec.themeColor ? { themeColor: bgSpec.themeColor } : {}), ...(bgSpec.themeTint ? { themeTint: bgSpec.themeTint } : {}), ...(bgSpec.themeShade ? { themeShade: bgSpec.themeShade } : {}) }, this.ctx.fmt.theme) : undefined;
    // efeito de preenchimento (gradiente, padrão, imagem, textura) e se a tela o mostra
    // (w:displayBackgroundShape; o PDF do Word leva sempre — page-fill.ts)
    const bgFill = bgSpec?.fill ? resolvePageFill(bgSpec, bg) : undefined;
    const bgShow = !!this.ctx.fmt.settings.displayBackgroundShape;
    const pages: LayoutPage[] = this.pages.map((ps) => {
      // camadas do Word: TODO o cabeçalho/rodapé (atrás, texto, frente) fica
      // abaixo do documento; no corpo, atrás do texto < texto < na frente
      // (descarte fora da página por camada: hfItems conta o que sobrou do HF)
      // objetos ancorados em células: na camada de objetos, na ordem z (oráculo cellwrap)
      const late = (arr: PageItem[]): { keep: PageItem[]; front: ZObj[]; back: ZObj[] } => {
        const keep: PageItem[] = [], front: ZObj[] = [], back: ZObj[] = [];
        let cur: ZObj | null = null, curMk: object | null = null;
        for (const it of arr) {
          const mk = LATE_ITEMS.get(it);
          if (!mk) { keep.push(it); continue; }
          if (mk !== curMk) { cur = { z: mk.z, seq: mk.seq, items: [] }; (mk.behind ? back : front).push(cur); curMk = mk; }
          cur!.items.push(it);
        }
        return { keep, front, back };
      };
      // (também os de tabelas flutuantes: saem do objeto da tabela para a ordem z — corpus t43)
      const lateZ = (objs: ZObj[], into: { front: ZObj[]; back: ZObj[] }): ZObj[] => objs.map((o) => {
        const r = late(o.items);
        into.front.push(...r.front); into.back.push(...r.back);
        return r.front.length || r.back.length ? { ...o, items: r.keep } : o;
      });
      const lh = late(ps.hf), lb = late(ps.body);
      const hfB = lateZ(ps.hfBehind, lh), hfF = lateZ(ps.hfFront, lh), bB = lateZ(ps.behind, lb), bF = lateZ(ps.front, lb);
      const hfLayer = cullOffPage([...zItems([...hfB, ...lh.back]), ...lh.keep, ...zItems([...hfF, ...lh.front])], ps.page.widthTw, ps.page.heightTw);
      // bordas de página: atrás do texto (zOrder back) ou na frente (padrão)
      const pb = this.full.sections[ps.geom.index]?.sect?.pgBorders;
      const pbItems = pb ? this.pageBorders(ps, pb) : [];
      const pbBack = pb?.zOrder === 'back';
      ps.page.items = [...hfLayer, ...(pbBack ? pbItems : []), ...cullOffPage([...zItems([...bB, ...lb.back]), ...lb.keep, ...zItems([...bF, ...lb.front])], ps.page.widthTw, ps.page.heightTw), ...(pbBack ? [] : pbItems)];
      // barras de alteração (controle de alterações): na frente, na margem esquerda
      const barColor = this.ctx.rev.barColor();
      if (barColor && ps.page.lines.some((l) => l.rev)) {
        const ml = this.full.sections[ps.geom.index]?.sectPr.marginLeftTwips ?? 1701;
        ps.page.items.push(...revisionBarItems(ps.page.lines, barX(ml), barColor));
      }
      ps.page.hfItems = hfLayer.length;
      if (bg && bg.toUpperCase() !== 'FFFFFF' && bg !== 'auto') ps.page.background = bg;
      if (bgFill) ps.page.backgroundFill = bgFill;
      if (bgShow && (ps.page.background || bgFill)) ps.page.backgroundShow = true;
      return ps.page;
    });
    return { pages, warnings: [...this.ctx.warnings] };
  }

  // ───────────────────────── seções e páginas ─────────────────────────

  /** Bordas de página da seção nesta página (w:display, contorno do cabeçalho/rodapé). */
  private pageBorders(ps: PageState, pb: NonNullable<NonNullable<Section['sect']>['pgBorders']>): PageItem[] {
    const first = ps.sectPage === 0;
    if ((pb.display === 'firstPage' && !first) || (pb.display === 'notFirstPage' && first)) return [];
    // cabeçalho/rodapé presentes = algo desenhado acima/abaixo do corpo
    const topOf = (it: PageItem): number | undefined => it.t === 'glyphs' || it.t === 'rect' || it.t === 'image' || it.t === 'shape' ? it.y : it.t === 'line' ? it.y1 : undefined;
    const hf = [...ps.hf, ...zItems(ps.hfBehind), ...zItems(ps.hfFront)];
    const set = this.ctx.fmt.settings;
    return pageBorderItems(this.ctx, pb, ps.geom, {
      header: !set.bordersDoNotSurroundHeader && hf.some((it) => (topOf(it) ?? Infinity) < ps.bodyTop),
      footer: !set.bordersDoNotSurroundFooter && hf.some((it) => (topOf(it) ?? -Infinity) > ps.bodyBottom),
    });
  }


  private geomOf(s: Section, i: number): SectGeom {
    const sp: SectPr = s.sectPr;
    const pageW = sp.pageWidthTwips, pageH = sp.pageHeightTwips;
    const marL = sp.marginLeftTwips, marR = sp.marginRightTwips;
    const contentW = Math.max(720, pageW - marL - marR);
    const cols: { x: number; w: number }[] = [];
    const defs = s.sect?.colDefs;
    const n = Math.max(1, sp.cols?.count ?? 1);
    if (n > 1 && defs && defs.length >= n && s.sect?.equalWidth === false) {
      let x = marL;
      for (const d of defs.slice(0, n)) { cols.push({ x, w: d.w }); x += d.w + d.space; }
    } else if (n > 1) {
      const space = sp.cols?.spaceTwips ?? 720;
      const w = (contentW - space * (n - 1)) / n;
      for (let k = 0; k < n; k++) cols.push({ x: marL + k * (w + space), w });
    } else cols.push({ x: marL, w: contentW });
    // header/footer herdados da seção anterior quando a seção não define
    const prev = i > 0 ? this.geoms[i - 1] : undefined;
    const pick = (own: { default?: Block[]; first?: Block[]; even?: Block[] } | undefined, inherited: SectGeom['headers'] | undefined) => {
      const out: SectGeom['headers'] = { ...(inherited ?? {}) };
      if (own?.default) out.default = own.default;
      if (own?.first) out.first = own.first;
      if (own?.even) out.even = own.even;
      return out;
    };
    const hb = s.headerBlocks ?? blocksOfParas(s.headers);
    const fb = s.footerBlocks ?? blocksOfParas(s.footers);
    // notas: o footnotePr/endnotePr da seção sobre o do settings (o Word grava nos
    // dois); padrões 1, 2, 3 no rodapé e i, ii, iii no fim
    const st = this.ctx.fmt.settings;
    const fnPr = { ...st.footnotePr, ...sp.footnotePr }, enPr = { ...st.endnotePr, ...sp.endnotePr };
    const notes: SectGeom['notes'] = {
      footnote: { fmt: fnPr.numFmt ?? 'decimal', start: fnPr.numStart ?? 1, restart: fnPr.numRestart ?? 'continuous' },
      // (nota de fim não reinicia por página)
      endnote: { fmt: enPr.numFmt ?? 'lowerRoman', start: enPr.numStart ?? 1, restart: enPr.numRestart === 'eachSect' ? 'eachSect' : 'continuous' },
      fnPos: fnPr.pos ?? 'pageBottom',
      ...(sp.footnoteColumns ? { fnCols: sp.footnoteColumns } : {}),
    };
    return {
      notes,
      index: i, pageW, pageH, marL, marR,
      marT: sp.marginTopTwips, marB: sp.marginBottomTwips,
      hdr: sp.headerDistanceTwips ?? 720, ftr: sp.footerDistanceTwips ?? 720,
      cols, colSep: !!sp.cols?.sep, titlePg: !!sp.titlePg,
      type: s.sect?.type ?? 'nextPage',
      ...(s.sect?.vAlign ? { vAlign: s.sect.vAlign } : {}),
      ...(sp.pgNumStart !== undefined ? { pgStart: sp.pgNumStart } : {}),
      ...(sp.pgNumFmt ?? s.sect?.pgNumFmt ? { pgFmt: sp.pgNumFmt ?? s.sect!.pgNumFmt! } : {}),
      ...(sp.pgNumChapStyle ? { chap: { level: sp.pgNumChapStyle, sep: CHAP_SEP[sp.pgNumChapSep ?? 'hyphen'] ?? '-' } } : {}),
      headers: pick(hb, prev?.headers),
      footers: pick(fb, prev?.footers),
      blocks: [s.blockStart, s.blockEnd],
      ...(s.sect?.docGrid && (s.sect.docGrid.type === 'lines' || s.sect.docGrid.type === 'linesAndChars') && (s.sect.docGrid.linePitch ?? 0) > 0
        ? { linePitch: s.sect.docGrid.linePitch } : {}),
      ...(s.sect?.lnNumType ? { lnNum: {
        countBy: Math.max(1, s.sect.lnNumType.countBy ?? 1),
        start: s.sect.lnNumType.start ?? 0,
        restart: s.sect.lnNumType.restart ?? 'newPage',
        // "Automático" (sem w:distance ou 0): 1/4" numa coluna, 1/8" em várias (oráculo lnnum2)
        distance: (s.sect.lnNumType.distance ?? 0) > 0 ? s.sect.lnNumType.distance! : cols.length > 1 ? 180 : 360,
      } } : {}),
    };
  }

  private pageNumber(g: SectGeom, sectPage: number): number {
    // numeração continua da seção anterior, salvo pgNumType/@start
    if (g.pgStart !== undefined) return g.pgStart + sectPage;
    const prev = this.pages.length ? this.pages[this.pages.length - 1] : undefined;
    if (sectPage === 0) return prev ? prev.page.number + 1 : 1;
    return (prev?.page.number ?? 0) + 1;
  }

  private newPage(g: SectGeom, breakType = 'nextPage'): void {
    const sectPage = this.cur && this.cur.geom === g ? this.cur.sectPage + 1 : 0;
    let number = this.pageNumber(g, sectPage);
    // evenPage/oddPage: página em branco para acertar a paridade
    if (sectPage === 0 && this.pages.length && (breakType === 'evenPage' || breakType === 'oddPage')) {
      const wantEven = breakType === 'evenPage';
      if ((number % 2 === 0) !== wantEven) {
        this.makePage(g, sectPage, number);
        number++;
        return this.newPageAt(g, sectPage + 1, number);
      }
    }
    this.newPageAt(g, sectPage, number);
  }

  private newPageAt(g: SectGeom, sectPage: number, number: number): void {
    this.makePage(g, sectPage, number);
    this.col = 0;
    this.colTop = this.cur.bodyTop;
    this.y = this.cur.bodyTop;
    this.colUsed = [];
    this.balanceSaved = null;
    this.applyBalance();
    this.atTop = true;
    this.topGapPrevAfter = null;
    this.prev = null;
    this.ctx.beginNotePage();
    // notas de fim que continuam: separador de continuação (margem a margem) no topo
    // (oráculo endnotes, en-fill50/en-split)
    if (this.enFlow?.sepDone) this.continuationSeparator(true);
    if (this.floatCarry.length) this.placeFloatCarry();
    // página só de notas (continuação longa): o texto segue na próxima
    if (this.cur.notesFull) return this.newPage(this.cur.geom);
    // flutuantes tardios desta página: entram antes do texto
    const late = this.lateFloats.get(this.pages.length - 1);
    if (late) {
      const fr = this.colFrame();
      for (const run of late) {
        this.placeFloat(run, this.cur, fr.x, fr.w, this.cur.bodyTop, this.cur.body, 0);
        this.prePlaced.add(run);
      }
    }
    for (const [bi, lt] of this.lateTables) {
      const b = this.full.blocks[bi];
      if (lt.page !== this.pages.length - 1 || this.placedTables.has(bi) || b?.type !== 'table' || !b.tblPr?.tblpPr) continue;
      this.placedTables.add(bi);
      const fr = this.colFrame();
      const t = layoutTable(this.ctx, b, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), `b${bi}`);
      const items: PageItem[] = [];
      this.placeFloatingTable(t, b.tblPr.tblpPr, this.cur, lt.flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      if (this.floatCarry.some((c) => c.t === t)) this.lateSplit.add(bi);
    }
  }

  private makePage(g: SectGeom, sectPage: number, number: number): void {
    const page: LayoutPage = { widthTw: g.pageW, heightTw: g.pageH, section: g.index, number, items: [], lines: [] };
    const ps: PageState = {
      page, geom: g, bodyTop: g.marT, bodyBottom: g.pageH - g.marB,
      behind: [], hf: [], body: [], front: [], hfBehind: [], hfFront: [], floats: [], sectPage,
      notes: [], noteArea: 0, bodyBottomBase: g.pageH - g.marB,
    };
    if (this.cur) { this.closeColumns(); this.paintNotes(this.cur); }
    this.pages.push(ps);
    this.cur = ps;
    this.colMaxY = 0;
    this.layoutHeaderFooter(ps);
    ps.bodyBottomBase = ps.bodyBottom;
    // continuação de nota partida na página anterior: primeiro no pé desta (oráculo fncont)
    if (this.noteCarry.length) {
      // nota que nem nesta página cabe inteira: enche a página (só notas, alinhadas
      // ao pé) e o resto segue para a próxima (oráculo notefmt, cont-sep-3p)
      const carry = this.noteCarry;
      this.noteCarry = [];
      for (const n of carry) {
        const avail = ps.bodyBottomBase - ps.bodyTop - this.noteAreaOf(ps.notes.map((x) => x.content), g) - (ps.notes.length ? 0 : this.separatorHeight());
        const sp = n.content.height > avail + 0.05 && !ps.notesFull ? splitContent(n.content, avail) : null;
        if (sp && sp[0].lines.length && sp[1].lines.length) {
          ps.notes.push({ id: n.id, content: sp[0] });
          this.noteCarry.push({ id: n.id, content: sp[1] });
          ps.notesFull = true;
        } else if (ps.notesFull) this.noteCarry.push(n);
        else ps.notes.push(n);
      }
      ps.noteArea = this.noteAreaOf(ps.notes.map((n) => n.content), g);
      ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
    }
  }

  private continuousSection(g: SectGeom): void {
    // a seção que termina (várias colunas): o que ocupou nesta página (equilíbrio)
    const ending = this.cur.geom;
    this.recordBalance(ending);
    if (this.balanceSaved !== null) { this.cur.bodyBottom = this.balanceSaved; this.balanceSaved = null; }
    this.closeColumns();
    this.colUsed = [];
    // colunas antes ou depois da quebra: o "depois" do último parágrafo da seção
    // anterior fica ACIMA do topo das colunas novas (a 2ª coluna começa na altura
    // da 1ª sem o "antes" do 1º parágrafo) e o fim de colunas encerradas inclui o
    // "depois" do último parágrafo; o 1º parágrafo daqui só leva o que o "antes"
    // passa dele (oráculo sections, cont-*)
    const lastAfter = this.prev && !this.atTop ? this.prev.after : 0;
    if ((ending.cols.length > 1 || g.cols.length > 1) && lastAfter > 0 && this.sectGapAfter === null) {
      this.y = Math.min(this.y + lastAfter, this.cur.bodyBottom);
      this.sectGapAfter = lastAfter;
    }
    // mesma página; nova geometria de colunas a partir do fim da coluna mais
    // ALTA da seção anterior (corpus t89)
    this.y = Math.max(this.y, this.colMaxY);
    this.colMaxY = 0;
    this.cur.geom = g;
    delete this.cur.cols;
    this.col = 0;
    this.colTop = this.y;
    this.applyBalance();
    // o espaço "depois" do último parágrafo da seção anterior colapsa com o
    // "antes" do 1º desta, como entre parágrafos (oráculo colbreak, cb-textsect-*)
  }

  /** Seção de várias colunas que termina nesta página: o que cada coluna ocupou
   *  (o equilíbrio é buscado em layoutDocument). */
  private recordBalance(ending: SectGeom): void {
    if (ending.cols.length <= 1) return;
    const used = [...this.colUsed, this.y - this.colTop];
    this.balanceFound.set(balKey(ending), { page: this.pages.length - 1, colTop: this.colTop, bottom: this.balanceSaved ?? this.cur.bodyBottom, sum: used.reduce((a, b) => a + Math.max(0, b), 0), n: ending.cols.length, used });
  }

  /** "Próxima coluna" continua na mesma página: mesmo nº de colunas e não estamos
   *  na última (senão vale como próxima página — oráculo sections, nc-*) */
  private nextColumnFits(g: SectGeom): boolean {
    if (!this.cur || g.cols.length < 2) return false;
    const cols = this.pageCols();
    return cols.length === g.cols.length && this.col < cols.length - 1;
  }

  /** Seção "próxima coluna": a seção nova começa no topo da coluna seguinte, com as
   *  colunas da página de antes (as dela valem da próxima página em diante); o 1º
   *  parágrafo leva o "antes" descontado do "depois" anterior, como numa seção nova
   *  (oráculo sections, nc-2to2-before). A seção que termina não é equilibrada. */
  private nextColumnSection(g: SectGeom): void {
    const lastAfter = this.prev ? this.prev.after : 0;
    if (this.balanceSaved !== null) { this.cur.bodyBottom = this.balanceSaved; this.balanceSaved = null; }
    const cols = this.pageCols();
    this.cur.cols = cols;
    this.cur.geom = g;
    this.colUsed.push(this.y - this.colTop);
    this.colMaxY = Math.max(this.colMaxY, this.y);
    this.col++;
    this.y = this.colTop;
    this.atTop = true;
    this.prev = null;
    this.topGapPrevAfter = lastAfter;
  }

  /** Colunas da página corrente (as da seção, salvo "próxima coluna"). */
  private pageCols(): { x: number; w: number }[] {
    return this.cur.cols ?? this.cur.geom.cols;
  }

  private colFrame(): { x: number; w: number } {
    const cols = this.pageCols();
    const c = cols[this.col] ?? cols[0]!;
    return { x: c.x, w: c.w };
  }

  /** Fim da coluna: próxima coluna ou nova página. */
  private breakColumn(): void {
    const g = this.cur.geom;
    if (this.col < this.pageCols().length - 1) {
      this.colUsed.push(this.y - this.colTop);
      this.colMaxY = Math.max(this.colMaxY, this.y);
      this.col++;
      this.y = this.colTop;
      this.atTop = true;
      this.prev = null;
      // notas de fim em colunas: a coluna seguinte guarda o lugar do separador (sem
      // linha — oráculo endnotes, en-cols)
      if (this.enFlow?.sepDone) this.continuationSeparator(false);
    } else this.newPage(g);
  }

  /** fim do conteúdo de cada coluna da área de colunas corrente (com o "depois"
   *  do último parágrafo); ausente = coluna vazia */
  private colBottoms: number[] = [];

  /** Conteúdo na coluna corrente até `bottom` (linha entre colunas). */
  private noteColContent(bottom: number): void {
    // (limite: o fundo real do corpo — na passada equilibrada a última linha passa do limite)
    const c = this.col;
    this.colBottoms[c] = Math.max(this.colBottoms[c] ?? -Infinity, Math.min(bottom, this.balanceSaved ?? this.cur.bodyBottom));
  }

  /**
   * Fecha a área de colunas corrente (nova página, seção contínua, fim): com
   * w:sep, a linha entre colunas — retângulo preto de 0,84 pt no meio do vão,
   * do topo das colunas até o fim da coluna mais comprida, só antes das colunas
   * que têm conteúdo nesta página (oráculo sections, sep-*).
   */
  private closeColumns(): void {
    const ps = this.cur, cols = this.pageCols(), b = this.colBottoms;
    this.colBottoms = [];
    if (!ps || !ps.geom.colSep || cols.length < 2 || !b.length) return;
    const bottom = Math.max(...b.filter((v) => v !== undefined));
    if (!(bottom > this.colTop)) return;
    for (let c = 1; c < cols.length; c++) {
      if (b[c] === undefined) continue;
      const x = (cols[c - 1]!.x + cols[c - 1]!.w + cols[c]!.x) / 2;
      ps.body.push({ t: 'rect', x: x - COL_SEP_W / 2, y: this.colTop, w: COL_SEP_W, h: bottom - this.colTop, fill: '000000' });
    }
  }

  // ───────────────────────── cabeçalho / rodapé ─────────────────────────

  /** Valor dos campos dinâmicos; `block` = bloco do corpo onde o campo está (REF \p). */
  private fieldValue(ps: PageState, block?: number): (name: string, instr?: string, at?: number) => string | undefined {
    return (name: string, instr?: string, at?: number) => {
      if (name === 'PAGEREF') {
        this.usedPageRef = true;
        const bm = (instr ?? '').trim().split(/\s+/)[1];
        return bm ? this.marksGuess.get(bm) : undefined;
      }
      if (name === 'SEQ') return this.seqValue(instr ?? '');
      // número da própria nota de fim (w:endnoteRef) no fluxo das notas de fim
      if (name === 'ENDNOTEREF_MARK' && this.curEndnote !== undefined) return this.ctx.noteMarkOf('endnote', this.curEndnote) ?? '';
      if (name === 'REF') return this.refValue(instr ?? '', block, at);
      if (name === 'NOTEREF') return this.noteRefValue(instr ?? '', block, at);
      if (name === 'STYLEREF') return this.styleRefValue(instr ?? '', block);
      if (name === 'PAGE') {
        const num = formatNumber(ps.page.number, ps.geom.pgFmt ?? 'decimal', this.ctx.opts.lang);
        const chap = ps.geom.chap ? this.chapterOf(ps.geom.chap.level, this.pages.indexOf(ps)) : undefined;
        return chap !== undefined ? chap + ps.geom.chap!.sep + num : num;
      }
      if (name === 'NUMPAGES') { this.usedNumPages = true; return String(this.totalPagesGuess); }
      if (name === 'SECTIONPAGES') { this.usedNumPages = true; return String(this.totalPagesGuess); }
      if (name === 'SECTION') return String(ps.geom.index + 1);
      // DATE/TIME: o Word recalcula ao exportar — o instante da exportação
      if (name === 'DATE' || name === 'TIME') return dateFieldValue(instr ?? name, this.ctx.opts.now ?? new Date(), this.ctx.opts.lang);
      // datas das propriedades do documento (o Word as relê ao exportar; hora local)
      if (name === 'SAVEDATE' || name === 'CREATEDATE' || name === 'PRINTDATE') {
        const cp = this.full.coreProps;
        const iso = name === 'SAVEDATE' ? cp?.modified : name === 'CREATEDATE' ? cp?.created : cp?.lastPrinted;
        const d = iso ? new Date(iso) : undefined;
        return d && !isNaN(d.getTime()) ? dateFieldValue(instr ?? name, d, this.ctx.opts.lang) : undefined;
      }
      return undefined;
    };
  }

  private layoutHeaderFooter(ps: PageState): void {
    const g = ps.geom;
    const settings = this.ctx.fmt.settings;
    const first = ps.sectPage === 0 && g.titlePg;
    const even = settings.evenAndOddHeaders && ps.page.number % 2 === 0;
    const kind = first ? 'first' : even ? 'even' : 'default';
    const pick = (set: SectGeom['headers']) => first ? set.first : even ? set.even : set.default;
    const env: ParaEnv = { field: this.fieldValue(ps), hf: true };
    const width = g.pageW - g.marL - g.marR;
    // numeração em cabeçalho/rodapé: própria, não avança a lista do corpo (oráculo numbering3, hdr-list)
    const savedNum = this.ctx.numbering;
    this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
    this.inHf = true;
    try {
      const hdr = pick(g.headers);
      if (hdr?.length) {
        // a "margem" dos objetos do cabeçalho posicionados em relação a ela é o topo
        // REAL do corpo (empurrado pelo cabeçalho): mede antes (corpus t43)
        const probe = this.ctx.pure(() => this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, scratchPage(ps), g.hdr));
        ps.bodyTop = Math.max(g.marT, g.hdr + probe.height);
        const r = this.layoutStatic(hdr, g.marL, width, env, `hdr:${kind}`, ps, g.hdr);
        for (const it of r.items) ps.hf.push(shiftItem(it, g.hdr));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, g.hdr));
        // o corpo começa abaixo do cabeçalho se ele invadir a margem
        ps.bodyTop = Math.max(g.marT, g.hdr + r.height);
      }
      const ftr = pick(g.footers);
      if (ftr?.length) {
        // 1ª passada só mede (sem página: floats não são colocados); a 2ª posiciona
        // os flutuantes ancorados no rodapé já com o topo real do rodapé
        // (medições puras: só a diagramação final avança listas/SEQ/notas)
        const probe = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, undefined, 0));
        let top = g.pageH - g.ftr - probe.height;
        // os flutuantes do rodapé podem empurrar o conteúdo (tabela que desce para
        // baixo de uma caixa de texto): mede de novo com eles, numa página de rascunho
        const probe2 = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top));
        // o corpo recua só pelo desvio de flutuantes que acompanham o texto do
        // rodapé (caixa ancorada no parágrafo); os de posição absoluta não contam (medido no Word)
        let limitH = probe.height;
        if (probe2.height > probe.height + 1) {
          top = g.pageH - g.ftr - probe2.height;
          this.onlyTextFloats = true;
          try {
            limitH = this.ctx.pure(() => this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, scratchPage(ps), top)).height;
          } finally { this.onlyTextFloats = false; }
        }
        const r = this.layoutStatic(ftr, g.marL, width, env, `ftr:${kind}`, ps, top);
        for (const it of r.items) ps.hf.push(shiftItem(it, top));
        for (const l of r.lines) ps.page.lines.push(shiftLine(l, top));
        ps.bodyBottom = Math.min(g.pageH - g.marB, g.pageH - g.ftr - limitH);
      }
    } finally {
      this.inHf = false;
      this.ctx.numbering = savedNum;
    }
  }

  // ───────────────────────── fluxo estático (célula, HF, caixa) ─────────────────────────

  /**
   * Lays out blocos sem paginação (y relativo a 0). Floats ancorados são
   * posicionados na página `ps` (se houver) com `yOrigin` = y absoluto do topo.
   */
  layoutStatic(blocks0: Block[], x: number, width: number, env: ParaEnv, ref: string, ps?: PageState, yOrigin = 0, nb?: CellNeighbors): CellContent {
    // moldura dentro de célula de tabela: o Word a ignora (parágrafo normal — corpus t43)
    const blocks = this.inCell ? blocks0 : liftFrames(blocks0);
    const items: PageItem[] = [];
    const lines: LaidOutLine[] = [];
    let y = 0;
    let prev: PrevPara | null = null;
    /** lista do parágrafo anterior (espaçamento automático entre itens) */
    let prevList: string | undefined;
    let keepNext = false;
    const n = blocks.length;
    const isHf = !!ps && /^(hdr|ftr):\w+$/.test(ref);
    // cabeçalho/rodapé (também nas medições sem página): o "depois" automático do
    // último parágrafo conta na altura — só na célula ele some (oráculo autosp)
    const hfFlow = /^(hdr|ftr):\w+$/.test(ref);
    // tabelas flutuantes aninhadas (célula): o texto seguinte da célula as contorna
    // e a célula cresce até o fim delas (oráculo cellftbl) — coordenadas locais
    const cellFloats: FloatBox[] = [];
    const cellPs = { floats: cellFloats } as unknown as PageState;
    let floatBottom = 0;
    /** fim dos objetos ancorados na célula (com ou sem quebra): conta no alinhamento vertical */
    let alignBottom = 0;
    /** a célula tem forma ancorada (w:doNotVertAlignCellWithSp: não alinha na vertical) */
    let cellShape = false;
    /** desenhadas depois do texto da célula (ordem do PDF do Word) */
    const floatItems: PageItem[] = [];
    const floatLines: LaidOutLine[] = [];
    if (isHf) {
      // cabeçalho/rodapé: flutuantes com posição vertical absoluta (página/margem)
      // vão primeiro — o conteúdo ANTES da âncora também os contorna (medido no Word)
      for (const b of blocks) {
        if (b.type !== 'paragraph') continue;
        const carry = FRAME_CARRY.get(b.paragraph);
        for (const run of FRAME_SKIP.has(b.paragraph) ? (carry ? [carry] : []) : b.paragraph.runs) {
          const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
          const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
          if (!fl || !anc || !ABSOLUTE_V.has(anc.posV.relativeFrom ?? '') || this.onlyTextFloats) continue;
          this.placeFloat(run, ps!, x, width, yOrigin, items, yOrigin);
          this.prePlaced.add(run);
        }
      }
    }
    /** parágrafo de marca oculta que se junta ao seguinte */
    let join: HiddenJoin | null = null;
    /** runs de parágrafos de marca excluída (revisão) que vão para o seguinte */
    let delRuns: Run[] | null = null;
    const paras = new Map<string, ParaSplitInfo>();
    /** linhas de tabelas aninhadas (partem como linha na quebra da célula de fora) */
    const nest: NestRow[] = [];
    let lastPara: ParaSplitInfo | null = null;
    blocks.forEach((b, bi) => {
      if (b.type === 'paragraph') {
        if (FRAME_SKIP.has(b.paragraph)) {
          const carry = FRAME_CARRY.get(b.paragraph);
          if (carry && ps && !this.prePlaced.has(carry)) this.placeFloat(carry, ps, x + this.staticDx, width, yOrigin + y + (prev ? prev.after : 0), items, yOrigin);
          // âncora = tabela: o texto da moldura entra na 1ª linha dela, na ordem das colunas
          if (this.hfFrameAfter.length && blocks[bi + 1]?.type === 'table') { this.hfFrameTbl.push(...this.hfFrameAfter); this.hfFrameAfter = []; }
          if (this.hfFrameAfter.length) { items.push(...this.hfFrameAfter); this.hfFrameAfter = []; }
          return;
        }
        // marca excluída (revisão): o texto vai para o parágrafo seguinte, com as
        // propriedades dele (oráculo delmark); todo o texto excluído: some (numbering3, del-mark)
        if (this.ctx.rev.markGone(b.paragraph) && !join && bi < n - 1 && blocks[bi + 1]!.type === 'paragraph') {
          delRuns = [...(delRuns ?? []), ...b.paragraph.runs];
          return;
        }
        if (this.ctx.rev.markGone(b.paragraph) && this.noShownRuns(b.paragraph) && !join && !delRuns) return;
        const merged = delRuns ? joinDeleted(delRuns, b.paragraph) : b.paragraph;
        delRuns = null;
        const para = join ? this.joinHidden(join, merged, env) : merged;
        const p = prepareParagraph(this.ctx, para, { ...env, noPageBreaks: true, ...(join ? { numbering: false } : {}), ...(CONTINUATION.has(para) ? { continuation: true } : {}) });
        if (join) p.marker = join.marker;
        join = null;
        // marca oculta (fora o último bloco): sem conteúdo visível não ocupa nada;
        // com conteúdo, junta-se ao parágrafo seguinte (oráculo hidden)
        if (p.markStyle.hidden && bi < n - 1) {
          if (!p.glyphs.length) return;
          if (blocks[bi + 1]!.type === 'paragraph') { join = { para, marker: p.marker }; return; }
        }
        if (p.keepNext) keepNext = true;
        const firstInCell = bi === 0;
        const lastInCell = bi === n - 1;
        let before = p.beforeAuto ? (firstInCell ? 0 : 280) : p.spaceBefore;
        let prevAfter = prev ? prev.after : 0;
        // "depois" suprimido pelo contextual do anterior: o "antes" só vale o excedente (oráculo ctxmark)
        let ctxAfter: number | null = null;
        if (prev && prev.styleId === p.styleId) {
          if (prev.contextual) { ctxAfter = prevAfter; prevAfter = 0; }
          if (p.contextual) before = 0;
        }
        // espaçamento automático entre itens da mesma lista: zero (oráculo autosplist)
        const list = this.listOf(p);
        if (list && prevList === list) { if (p.beforeAuto) before = 0; if (prev?.afterAuto) prevAfter = 0; }
        prevList = list;
        // 1º parágrafo da célula: o vizinho anterior é o parágrafo antes da tabela, o
        // último da célula anterior ou a marca de fim de linha (oráculo autosp2)
        if (bi === 0 && nb?.prev && p.contextual && nb.prev.styleId === p.styleId) before = 0;
        // o "depois" efetivo do anterior (contextual zera)
        if (lastPara) lastPara.after = prevAfter;
        const gapS = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(prevAfter, before);
        /** topo do parágrafo para objetos relativos a ele (oráculo anchorbefore) */
        const paraRefS = y + Math.min(prevAfter, gapS);
        y += gapS;
        const top = y;
        const br = new LineBreaker(this.ctx, p);
        const frame0 = { left: p.indLeft, right: width - p.indRight };
        // cabeçalho/rodapé: os flutuantes do parágrafo são posicionados ANTES das
        // linhas e o texto (inclusive o do próprio parágrafo) os contorna — oráculo hffloat
        const hfWrap = !!ps && /^(hdr|ftr):\w+$/.test(ref);
        if (hfWrap) this.placeFloats(p, ps!, x, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        // célula: os flutuantes do parágrafo vêm ANTES das linhas e o texto da célula
        // contorna os que têm quebra (oráculo cellwrap); desenhados depois do texto
        const cellAnch: PageItem[] | null = this.inCell && ps && !hfWrap && /\/r\d+\/c\d+$/.test(ref) ? [] : null;
        if (this.inCell && !cellShape) cellShape = p.glyphs.some((g) => !!(g.obj?.image?.floating || g.obj?.shape?.floating || g.obj?.group?.floating || g.obj?.textbox?.floating));
        if (cellAnch) {
          for (const g of p.glyphs) {
            const run = g.obj;
            if (!run || this.prePlaced.has(run) || !(run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating)) continue;
            if (this.onlyTextFloats && !followsText(floatAnchor(run))) continue;
            const its: PageItem[] = [];
            const rc = this.placeFloat(run, ps!, x + this.staticDx, width, yOrigin + top, its, yOrigin, undefined, yOrigin + paraRefS);
            const mk = { z: floatAnchor(run)?.relativeHeight ?? 0, seq: this.zSeq++, behind: rc.obj.layer === 'behind' };
            for (const it of its) LATE_ITEMS.set(it, mk);
            cellAnch.push(...its);
            if (rc.box && !floatAnchor(run)?.simplePos) {
              cellFloats.push({ ...rc.box, x: rc.box.x - this.staticDx, y: rc.box.y - yOrigin });
              // com quebra: a célula cresce até o fim dele; sem quebra, não (oráculo cellwrap)
              floatBottom = Math.max(floatBottom, rc.obj.y - yOrigin + rc.obj.h);
            }
            // todos contam na altura do conteúdo que se alinha (centro/base — oráculo cellwrap)
            alignBottom = Math.max(alignBottom, rc.obj.y - yOrigin + rc.obj.h);
          }
        }
        const boxTop = y;
        const boxAt = items.length;
        y += this.borderTopExtent(p, prev);
        const l0 = lines.length;
        do {
          let frame: WrapFrame = frame0;
          // contorno: flutuantes da página (cabeçalho/rodapé) ou da própria célula
          const wPs = hfWrap ? ps! : cellFloats.length ? cellPs : null;
          const wY0 = hfWrap ? yOrigin : 0;
          if (wPs) {
            const lh = markLineH(p);
            frame = this.wrapFrame(frame0, x, wY0 + y, lh, wPs);
            for (let k = 0; k < 8 && frame.skipTo !== undefined && frame.skipTo - wY0 > y; k++) {
              y = frame.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, lh, wPs);
            }
          }
          const mark = br.mark();
          let seg = this.pickSeg(br, frame);
          let line = br.next(seg.f);
          // linha mais alta que a estimativa (imagem em linha): o contorno vale pela
          // altura real — desce ou estreita (oráculo tallwrap)
          const textH = Math.min(line.height, line.baseline + line.desc);
          if (wPs && wPs.floats.length && textH > markLineH(p) + 1) {
            const f2 = this.wrapFrame(frame0, x, wY0 + y, textH, wPs);
            if (f2.skipTo !== undefined && f2.skipTo - wY0 > y) {
              y = f2.skipTo - wY0;
              frame = this.wrapFrame(frame0, x, wY0 + y, markLineH(p), wPs);
              br.reset(mark); seg = this.pickSeg(br, frame); line = br.next(seg.f);
            } else if (narrower(f2, frame)) {
              frame = f2;
              br.reset(mark); seg = this.pickSeg(br, frame); line = br.next(seg.f);
            }
          }
          let lh = 0;
          const put = (l: Line) => {
            paintLine(this.ctx, items, l, x, y);
            this.paintInlineDrawings(items, l, x, y, ps);
            lines.push(lineRecord(`${ref}/b${bi}`, p, l, x, y, width));
            lh = Math.max(lh, l.height);
          };
          put(line);
          this.moreSegs(br, frame, seg.k, line, put);
          y += lh;
        } while (!br.done());
        if (this.hfFrameAfter.length) { items.push(...this.hfFrameAfter); this.hfFrameAfter = []; }
        const groupedNext = this.groupsWithNext(p, blocks[bi + 1], env);
        const bandB = this.borderBottomExtent(p, groupedNext);
        y += bandB;
        this.paintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
        // floats ancorados no parágrafo (fora do cabeçalho/rodapé: depois das linhas)
        if (ps && !hfWrap && !cellAnch) this.placeFloats(p, ps, x + this.staticDx, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
        if (cellAnch) items.push(...cellAnch);
        let after = p.afterAuto ? (lastInCell && !hfFlow ? 0 : 280) : p.spaceAfter;
        // último da célula: o vizinho seguinte é o 1º da próxima célula ou a marca de fim de linha
        if (lastInCell && nb?.next && p.contextual && nb.next.styleId === p.styleId) after = 0;
        // linha de tabela partida entre páginas: viúvas/órfãs (só modo 15) e o espaço
        // depois (efetivo) que tem de caber com a última linha (oráculo rowwidow)
        lastPara = {
          lines: lines.length - l0, after, ...(bandB ? { band: bandB } : {}),
          widow: this.ctx.fmt.settings.compatibilityMode >= 15 && (p.widowControl || p.ppr.widowControl === undefined),
        };
        paras.set(`${ref}/b${bi}`, lastPara);
        prev = { after, afterAuto: p.afterAuto, ...(p.styleId ? { styleId: p.styleId } : {}), contextual: p.contextual, ...(p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {}) };
      } else if (b.rows.every((r) => isHiddenRow(this.ctx, r))) {
        // tabela só com linhas ocultas: some (oráculo hidden)
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== 'inline' && !hfFlow && this.inCell) {
        // tabela flutuante aninhada numa célula (oráculo cellftbl): fora do fluxo, a
        // partir do topo do parágrafo âncora (o seguinte); "margem"/texto = área de
        // texto da célula, "página" = a célula (borda); o texto seguinte a contorna
        const fp = b.tblPr.tblpPr;
        // o "depois" do parágrafo anterior segue a regra de antes de tabela (contextual
        // com o 1º parágrafo da tabela: some — corpus t43)
        if (prev && this.dropsAfterBeforeTable(prev, b)) {
          prev = { ...prev, after: 0 };
          if (lastPara) lastPara.after = 0;
        }
        const t0 = this.ctx.pure(() => layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`));
        const H = t0.rows.reduce((a, r) => a + r.height, 0);
        const top = y + (prev ? prev.after : 0) + (fp.tblpYSpec ? 0 : fp.tblpY ?? 0);
        const [aL, aR] = fp.horzAnchor === 'page' ? [x - 103, x + width + 103] : [x, x + width];
        const xs = fp.tblpXSpec;
        const refX = xs === 'center' ? aL + (aR - aL - t0.width) / 2 : xs === 'right' || xs === 'outside' ? aR - t0.width : aL + (xs ? 0 : fp.tblpX ?? 0);
        const t = layoutTable(this.ctx, b, refX - t0.x, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
        let ry = top;
        for (const row of t.rows) {
          for (const it of row.items) floatItems.push(shiftItem(it, ry));
          for (const it of row.borderItems) floatItems.push(shiftItem(it, ry));
          for (const l of row.lines) floatLines.push({ ...l, y: l.y + ry, baseline: l.baseline + ry });
          ry += row.height;
        }
        cellFloats.push({ x: t.x, y: top, w: t.width, h: H, wrap: 'square', side: 'bothSides',
          distL: fp.leftFromText ?? 0, distR: fp.rightFromText ?? 0, distT: fp.topFromText ?? 0, distB: fp.bottomFromText ?? 0 });
        floatBottom = Math.max(floatBottom, top + H);
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== 'inline' && hfFlow) {
        // tabela flutuante no cabeçalho/rodapé: posição absoluta na página, fora da
        // altura do cabeçalho/rodapé (também na medição sem página); no modo 15 o texto
        // seguinte (do cabeçalho e do corpo) a contorna (oráculo hftable)
        if (ps) {
          const t = layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
          // pintada depois do texto do cabeçalho/rodapé (ordem do Word)
          const fItems: PageItem[] = [];
          this.placeFloatingTable(t, b.tblPr.tblpPr, ps, yOrigin + y, x, width, fItems, 0, this.ctx.fmt.settings.compatibilityMode >= 15);
          ps.hfFront.push({ z: -1, seq: this.zSeq++, items: fItems });
        }
      } else {
        y += prev && !this.dropsAfterBeforeTable(prev, b) ? prev.after : 0;
        if (lastPara && prev && this.dropsAfterBeforeTable(prev, b)) lastPara.after = 0;
        lastPara = null;
        this.assignCellNeighbors(b, prev ? { ...(prev.styleId ? { styleId: prev.styleId } : {}) } : bi === 0 ? nb?.prev : undefined);
        // os parágrafos da tabela aninhada também seguem viúvas/órfãs e o espaço depois
        // quando a célula de fora parte entre páginas (oráculo nestwidow)
        const t = layoutTable(this.ctx, b, x, width, (cell, cx, cw, cenv, cref) => {
          const cc = this.layoutCell(cell, cx, cw, cenv, cref, ps);
          if (cc.paras) for (const [k, v] of cc.paras) paras.set(k, v);
          return cc;
        }, `${ref}/b${bi}`);
        const tblAt = items.length;
        if (isHf && t.rows[0]) {
          // tabela não contorna: se ela (inteira — não só a 1ª linha: oráculo latefloat)
          // cruza um flutuante com quebra, desce para baixo dele
          const h0 = t.rows.reduce((a, r) => a + r.height, 0);
          for (let k = 0; k < 8; k++) {
            const yy = yOrigin + y;
            const hit = ps!.floats.find((fl) => !fl.bodyOnly && (fl.wrap === 'topAndBottom' || fl.wrap === 'square' || fl.wrap === 'tight' || fl.wrap === 'through')
              && yy + h0 > fl.y - fl.distT && yy < fl.y + fl.h + fl.distB
              && t.x + t.width > fl.x - fl.distL && t.x < fl.x + fl.w + fl.distR);
            if (!hit) break;
            y = hit.y + hit.h + hit.distB - yOrigin;
          }
        }
        const mergeMoved = new Set<object>();
        for (const [ri, row0] of t.rows.entries()) {
          // texto de mescla vertical na 1ª linha dela, na ordem das colunas (oráculo vmorder)
          const row = dropMoved(mergeTextFirst(t.rows, ri, row0, mergeMoved, () => true), mergeMoved);
          const ni: PageItem[] = [], nl: LaidOutLine[] = [];
          for (const it of row.items) { const s = shiftItem(it, y); items.push(s); ni.push(s); }
          for (const it of row.borderItems) { const s = shiftItem(it, y); items.push(s); ni.push(s); }
          for (const l of row.lines) { const s = { ...l, y: l.y + y, baseline: l.baseline + y }; lines.push(s); nl.push(s); }
          nest.push({ top: y, row, items: ni, lines: nl });
          y += row.height;
        }
        // moldura ancorada nesta tabela (cabeçalho/rodapé): o texto dela vai antes da 1ª
        // célula que começa depois dela — ordem do PDF do Word (oráculo hfframetbl)
        if (this.hfFrameTbl.length) {
          const fx = Math.min(...this.hfFrameTbl.map((it) => (it.t === 'glyphs' && it.glyphs[0] ? it.glyphs[0].x : Infinity)));
          let at = items.length;
          for (let k = tblAt; k < items.length; k++) {
            const it = items[k]!;
            if (it.t === 'glyphs' && it.glyphs[0] && it.glyphs[0].x >= fx - 10) { at = k; break; }
          }
          items.splice(at, 0, ...this.hfFrameTbl);
          this.hfFrameTbl = [];
        }
        prev = this.rowEndPrev();
        prevList = undefined;
      }
    });
    // espaço depois do último parágrafo conta na altura (célula/HF)
    if (prev) y += (prev as PrevPara).after;
    items.push(...floatItems);
    lines.push(...floatLines);
    return { items, lines, height: Math.max(y, floatBottom), ...(alignBottom > Math.max(y, floatBottom) ? { alignH: alignBottom } : {}), ...(cellShape ? { shape: true } : {}), ...(keepNext ? { keepNext: true } : {}), ...(paras.size ? { paras } : {}), ...(nest.length ? { nest } : {}) };
  }

  /** diagramando o conteúdo de uma célula (flutuantes ficam relativos à célula) */
  private inCell = false;
  /** molduras do cabeçalho/rodapé à direita do início da linha: entram depois das linhas do âncora */
  private hfFrameAfter: PageItem[] = [];
  /** molduras do cabeçalho/rodapé ancoradas na tabela seguinte (entram na 1ª linha dela) */
  private hfFrameTbl: PageItem[] = [];
  /** conteúdo de caixa de texto: x da caixa na página (flutuantes dentro dela) */
  private staticDx = 0;
  /** margens laterais da célula em diagramação (âncoras relativas à célula — oráculo cellwrap) */
  private cellMar: { l: number; r: number; t?: number } | null = null;
  /** fundo da coluna mais alta já deixada nesta página (seção de várias colunas) */
  private colMaxY = 0;
  /** "depois" do parágrafo vazio de quebra contínua que não ocupa altura: o seguinte
   *  desconta (oráculo colbreak) */
  private sectGapAfter: number | null = null;

  private layoutCell(cell: TableCell, x: number, width: number, env: { tablePPr?: import('@universal-office/docx-core').PPr; tableRPr?: import('@universal-office/docx-core').RPr; darkBackground?: boolean }, ref: string, ps?: PageState): CellContent {
    const prevInCell = this.inCell, prevMar = this.cellMar;
    this.inCell = true;
    this.cellMar = (env as { cellMar?: { l: number; r: number; t?: number } }).cellMar ?? null;
    try {
      return this.layoutCellIn(cell, x, width, env, ref, ps);
    } finally {
      this.inCell = prevInCell;
      this.cellMar = prevMar;
    }
  }

  private layoutCellIn(cell: TableCell, x: number, width: number, env: { tablePPr?: import('@universal-office/docx-core').PPr; tableRPr?: import('@universal-office/docx-core').RPr; darkBackground?: boolean }, ref: string, ps?: PageState): CellContent {
    const blocks: Block[] = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }));
    const penv: ParaEnv = { ...(env.tablePPr ? { tablePPr: env.tablePPr } : {}), ...(env.tableRPr ? { tableRPr: env.tableRPr } : {}), ...(env.darkBackground ? { darkBackground: true } : {}) };
    if (ps) penv.field = this.fieldValue(ps);
    if (this.inHf) penv.hf = true;
    const c = this.layoutStatic(blocks, x, width, penv, ref, ps, 0, this.cellNb.get(cell));
    // hideMark: a marca da célula vazia não conta na altura da linha (vale a
    // altura mínima da linha) — oráculo hidden
    if (cell.tcPr?.hideMark && blocks.every((b) => b.type === 'paragraph' && !paraVisibility(this.ctx, b.paragraph, penv).visible)) return { ...c, height: 0 };
    // ... e com conteúdo: o último parágrafo VAZIO (o da marca) não conta na altura
    // nem no alinhamento vertical (oráculo hidemark)
    const lastB = blocks[blocks.length - 1];
    if (cell.tcPr?.hideMark && blocks.length > 1 && lastB?.type === 'paragraph' && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    // parágrafo final vazio logo depois de uma tabela aninhada (a marca de fim de
    // célula): sem altura, com ou sem hideMark (oráculo tblw)
    if (blocks.length > 1 && lastB?.type === 'paragraph' && blocks[blocks.length - 2]?.type === 'table' && !paraVisibility(this.ctx, lastB.paragraph, penv).visible) {
      const nb = this.cellNb.get(cell);
      return { ...c, height: this.ctx.pure(() => this.layoutStatic(blocks.slice(0, -1), x, width, penv, ref, ps, 0, nb)).height };
    }
    // o "depois" do último parágrafo da célula também ocupa (Word)
    return c;
  }

  // ───────────────────────── espaçamento contextual em volta de tabelas ─────────────────────────
  // (oráculos autosp/autosp2) Para o contextualSpacing, os parágrafos seguem a ordem do
  // documento através da tabela: o de antes → 1º parágrafo da 1ª célula; o último de cada
  // célula → 1º da célula seguinte; o fim de cada linha é uma marca com o estilo de
  // parágrafo PADRÃO (não o da célula, nem o do parágrafo antes) → próxima linha / depois.

  private cellNb = new WeakMap<TableCell, CellNeighbors>();

  private cellBlocks(cell: TableCell): Block[] {
    return cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }));
  }

  /** Estilo do 1º parágrafo (em ordem de documento) de uma sequência de blocos. */
  private firstParaNeighbor(blocks: Block[]): CtxNeighbor | undefined {
    const b = blocks[0];
    if (!b) return undefined;
    if (b.type === 'paragraph') {
      const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
      return id ? { styleId: id } : {};
    }
    const c = b.rows[0]?.cells[0];
    return c ? this.firstParaNeighbor(this.cellBlocks(c)) : undefined;
  }

  /** Estilo do último parágrafo de uma célula (tabela no fim: a marca de fim de linha dela). */
  private lastParaNeighbor(blocks: Block[]): CtxNeighbor | undefined {
    const b = blocks[blocks.length - 1];
    if (!b) return undefined;
    if (b.type !== 'paragraph') return this.rowEndNeighbor();
    const id = this.ctx.resolver.paraStyleId(directPPr(b.paragraph).pStyle);
    return id ? { styleId: id } : {};
  }

  /** Marca de fim de linha da tabela: estilo de parágrafo padrão. */
  private rowEndNeighbor(): CtxNeighbor {
    const id = this.ctx.resolver.paraStyleId(undefined);
    return id ? { styleId: id } : {};
  }

  /** "Parágrafo anterior" depois de uma tabela: a marca de fim de linha (sem espaço próprio). */
  private rowEndPrev(): PrevPara {
    return { after: 0, afterAuto: false, ...this.rowEndNeighbor(), contextual: false };
  }

  /** O "depois" do parágrafo antes da tabela some (contextual com o 1º parágrafo dela)? */
  private dropsAfterBeforeTable(prev: PrevPara, table: TableBlock): boolean {
    if (!prev.contextual) return false;
    const f = this.firstParaNeighbor([table]);
    return !!f && f.styleId === prev.styleId;
  }

  /** Registra os vizinhos de cada célula da tabela (`prev` = parágrafo antes dela). */
  private assignCellNeighbors(table: TableBlock, prev: CtxNeighbor | undefined): void {
    table.rows.forEach((row, ri) => row.cells.forEach((cell, ci) => {
      const pv = ci > 0 ? this.lastParaNeighbor(this.cellBlocks(row.cells[ci - 1]!)) : ri > 0 ? this.rowEndNeighbor() : prev;
      const nx = ci + 1 < row.cells.length ? this.firstParaNeighbor(this.cellBlocks(row.cells[ci + 1]!)) : this.rowEndNeighbor();
      this.cellNb.set(cell, { ...(pv ? { prev: pv } : {}), ...(nx ? { next: nx } : {}) });
    }));
  }

  private collapse(after: number, before: number): number {
    if (this.ctx.fmt.settings.compat['doNotUseHTMLParagraphAutoSpacing']) return after + before;
    return Math.max(after, before);
  }

  /**
   * Bordas em grupo (oráculo pbdr): parágrafos seguidos com as mesmas bordas e
   * recuos formam uma caixa — o topo (espaço + espessura) só no 1º; entre eles
   * a borda "between" com o espaço dos DOIS lados; a base só no último.
   */
  private borderTopExtent(p: PreparedPara, prev: PrevPara | null): number {
    const b = p.ppr.pBdr;
    if (prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr)) {
      const bt = b?.between;
      return bt && bt.val !== 'none' && bt.val !== 'nil' ? 2 * (bt.space ?? 0) * 20 + borderWidth(bt) : 0;
    }
    if (!b?.top || b.top.val === 'none' || b.top.val === 'nil') return 0;
    // com sombra a espessura conta duas vezes (oráculo pbdrshadow)
    return (b.top.space ?? 0) * 20 + borderWidth(b.top) * (b.top.shadow ? 2 : 1);
  }

  private borderBottomExtent(p: PreparedPara, groupedNext = false): number {
    const b = p.ppr.pBdr;
    if (groupedNext || !b?.bottom || b.bottom.val === 'none' || b.bottom.val === 'nil') return 0;
    return (b.bottom.space ?? 0) * 20 + borderWidth(b.bottom) * (b.bottom.shadow ? 2 : 1);
  }

  /** O bloco seguinte continua o grupo de bordas deste parágrafo? */
  private groupsWithNext(p: PreparedPara, next: Block | undefined, env: ParaEnv = {}): boolean {
    if (!p.ppr.pBdr || !next || next.type !== 'paragraph') return false;
    return bdrKey(resolvePPr(this.ctx, next.paragraph, env).ppr) === bdrKey(p.ppr);
  }

  /**
   * Número da linha (w:lnNumType) — medido no Word (oráculos lnnum, lnnum2, lnnum3):
   * só linhas do corpo (tabela, caixa de texto, quadro, nota e parágrafo com
   * suppressLineNumbers não contam), vazio conta; alinhado à direita em (coluna −
   * distância), mesma baseline, estilo Normal + "Line Number"; fora da página também
   * vai para o PDF. A contagem recomeça (1º número = start+1) na 1ª linha numerada
   * depois de uma seção SEM numeração (ou do início), na 1ª linha de uma seção
   * newSection e na 1ª linha de uma página nova numa seção newPage; senão continua a
   * da seção anterior (o start da seção que continua é ignorado), mesmo de uma seção
   * newPage na mesma página.
   */
  private paintLineNumber(colX: number, baseline: number): void {
    const ln = this.cur.geom.lnNum!;
    const idx = this.cur.geom.index;
    const newSect = this.lnSect !== idx;
    const fresh = this.lnSect < 0 || (newSect && !this.geoms[idx - 1]?.lnNum);
    const restart = fresh
      || (ln.restart === 'newSection' && newSect)
      || (ln.restart === 'newPage' && this.lnPage !== this.cur);
    if (restart) this.lnCount = ln.start;
    this.lnPage = this.cur;
    this.lnSect = this.cur.geom.index;
    this.lnCount++;
    if (this.lnCount % ln.countBy !== 0) return;
    const styles = this.ctx.fmt.styles.styles;
    const sid = Object.values(styles).find((d) => d.type === 'character' && d.name?.toLowerCase() === 'line number')?.styleId;
    const rpr = sid ? { rStyle: sid } : {};
    const para: Paragraph = { runs: [{ text: String(this.lnCount), props: runPropsFromRPr(rpr), rpr }], props: {}, ppr: {} };
    const np = prepareParagraph(this.ctx, para, { numbering: false });
    const line = new LineBreaker(this.ctx, np).next({ left: 0, right: 20000 });
    const x = colX - ln.distance - line.width;
    const at = this.cur.body.length;
    paintLine(this.ctx, this.cur.body, line, x, baseline - line.baseline);
    for (let k = at; k < this.cur.body.length; k++) {
      const it = this.cur.body[k]!;
      if (it.t === 'glyphs') it.lineNum = true;
    }
  }

  /** Sombreamento/bordas do parágrafo — inseridos em `at` (antes do texto já pintado). */
  private paintBox(out: PageItem[], p: PreparedPara, x: number, width: number, top: number, bottom: number, prev: PrevPara | null, at = out.length, groupedNext = false): void {
    const hasFill = !!shadingFill(p.ppr.shd, this.ctx.fmt.theme);
    if (!p.ppr.pBdr && !hasFill) return;
    const grouped = !!prev?.pBdrKey && prev.pBdrKey === bdrKey(p.ppr);
    const left = x + p.indLeft + Math.min(0, p.firstLine);
    const right = x + width - p.indRight;
    const box: PageItem[] = [];
    paintParaBox(this.ctx, box, p, p.ppr.pBdr, left, right, top, bottom, !grouped, !groupedNext, grouped);
    out.splice(at, 0, ...box);
  }

  // ───────────────────────── parágrafo no corpo (paginado) ─────────────────────────

  /** Lista (abstractNum) do parágrafo numerado/com marcador. */
  private listOf(p: PreparedPara): string | undefined {
    const id = p.ppr.numPr?.numId;
    return id ? this.ctx.numbering.listKey(id) : undefined;
  }

  /** Passo da grade de linhas para um parágrafo do corpo (snapToGrid=0 desliga). */
  private gridFor(p: PreparedPara): number | undefined {
    const pitch = this.cur?.geom.linePitch;
    return pitch && p.ppr.snapToGrid !== false ? pitch : undefined;
  }

  /** parágrafo de marca oculta que se junta ao parágrafo seguinte */
  private pendingJoin: HiddenJoin | null = null;
  /** runs de parágrafos de marca excluída (revisão) que vão para o início do seguinte */
  private pendingDel: Run[] | null = null;
  /** o bloco anterior é uma tabela flutuante ancorada no texto (o parágrafo âncora
   *  empurrado para baixo dela tem o "antes" de novo — oráculo ftable2) */
  private floatTableGap = false;
  /** âncora levada para a página da continuação da tabela flutuante: abaixo dela, o "antes" inteiro */
  private carryAnchorGap = false;

  /**
   * Parágrafo de marca oculta + o seguinte: um parágrafo só, com as propriedades
   * (recuos, alinhamento…) do 1º e a marca do seguinte; o número que aparece é o
   * do 1º, mas o do seguinte também é consumido (oráculo numbering3, hidmark-*).
   */
  private joinHidden(join: HiddenJoin, next: Paragraph, env: ParaEnv): Paragraph {
    const n = resolvePPr(this.ctx, next, env).ppr.numPr;
    if (n?.numId && env.numbering !== false) this.ctx.numbering.next(n.numId, n.ilvl ?? 0);
    const ppr = { ...join.para.ppr };
    if (next.ppr?.rPr) ppr.rPr = next.ppr.rPr; else delete ppr.rPr;
    return { ...join.para, ppr, runs: [...join.para.runs, ...next.runs] };
  }

  /** Nenhum run aparece nesta visão (todo o texto excluído — ou parágrafo vazio). */
  private noShownRuns(p: Paragraph): boolean {
    return p.runs.every((r) => isMarkRun(r) || this.ctx.rev.run(r) === 'hide');
  }

  private placeParagraph(para0: Paragraph, ref: string, blockIdx: number, g: SectGeom): void {
    // moldura: fora do fluxo (a caixa vai com o parágrafo âncora; sem âncora, fica aqui)
    if (FRAME_SKIP.has(para0)) {
      const carry = FRAME_CARRY.get(para0);
      if (carry) { const fr = this.colFrame(); this.placeFloat(carry, this.cur, fr.x, fr.w, this.y, this.cur.body, 0); }
      return;
    }
    // marca excluída (revisão): o texto passa para o parágrafo seguinte, que fica com
    // as propriedades DELE (a marca que sobra) — estilo, recuos, numeração; o número
    // do excluído não conta (oráculo delmark). Todo o texto excluído: some (numbering3,
    // del-mark). O último da seção (quebra) fica como está.
    if (this.ctx.rev.markGone(para0) && !this.pendingJoin && blockIdx < g.blocks[1] && this.full.blocks[blockIdx + 1]?.type === 'paragraph') {
      this.pendingDel = [...(this.pendingDel ?? []), ...para0.runs];
      return;
    }
    if (this.ctx.rev.markGone(para0) && this.noShownRuns(para0) && !this.pendingJoin && !this.pendingDel) return;
    const join = this.pendingJoin;
    this.pendingJoin = null;
    const env: ParaEnv = { field: this.fieldValue(this.cur, blockIdx) };
    const merged = this.pendingDel ? joinDeleted(this.pendingDel, para0) : para0;
    this.pendingDel = null;
    const para = join ? this.joinHidden(join, merged, env) : merged;
    const p = prepareParagraph(this.ctx, para, join ? { ...env, numbering: false } : env);
    if (join) p.marker = join.marker;
    // título numerado (estilo Título N): o número de capítulo do campo PAGE
    if (p.marker?.chapter !== undefined && p.styleId) {
      const lv = /^heading ([1-9])$/i.exec(this.ctx.fmt.styles.styles[p.styleId]?.name ?? '')?.[1];
      if (lv) this.headingMarks.set(ref, { level: +lv, text: p.marker.chapter });
    }
    // título (estilo "heading N") diagramado: SEQ \s n dos parágrafos seguintes zera
    const hl = this.headingStyleLevel(para0);
    if (hl) this.ctx.heads.push(hl);
    // texto oculto (oráculo hidden): parágrafo de marca oculta sem conteúdo visível
    // não ocupa nada (nem linha nem espaçamento); com conteúdo visível, junta-se ao
    // seguinte, com as propriedades do 1º (joinHidden). O último da seção (quebra) fica como está.
    if (p.markStyle.hidden && blockIdx < g.blocks[1]) {
      if (!p.glyphs.length) return;
      if (this.full.blocks[blockIdx + 1]?.type === 'paragraph') { this.pendingJoin = { para, marker: p.marker }; return; }
    }
    // parágrafo VAZIO que só carrega a quebra para uma seção CONTÍNUA: não ocupa
    // altura nem tem espaçamento próprio, mas separa os vizinhos — o "depois" do
    // anterior e o "antes" do seguinte se SOMAM (oráculo colbreak, cb-emptysect-*).
    // Logo depois de tabela ele ocupa a linha no modo 15 (cb-emptysect-aftertbl); nos
    // modos 11/14 também some (…-c11/-c14)
    if (blockIdx === g.blocks[1] && !p.glyphs.length && !this.enFlow && this.geoms[g.index + 1]?.type === 'continuous'
      && (this.full.blocks[blockIdx - 1]?.type === 'paragraph' || this.ctx.fmt.settings.compatibilityMode < 15)) {
      // o próprio espaçamento dele se desconta dos vizinhos: colapso(depois anterior,
      // antes dele) − antes dele; e no seguinte colapso(depois dele, antes) − depois
      // dele (cb-emptysect-spacing, cb-par-sp-empty-text, cb-seq-*)
      const sb = p.beforeAuto ? 280 : p.spaceBefore, sa = p.afterAuto ? 280 : p.spaceAfter;
      if (this.prev && !this.atTop) this.y += Math.max(0, this.collapse(this.prev.after, sb) - sb);
      this.prev = { after: 0, afterAuto: false, contextual: false };
      // seção seguinte em várias colunas: o 1º parágrafo da coluna leva o "antes"
      // inteiro (corpus t70)
      this.sectGapAfter = (this.geoms[g.index + 1]?.cols.length ?? 1) > 1 ? null : sa;
      return;
    }
    // a marca FINAL do documento oculta e sem conteúdo visível também não ocupa
    // nada — não cria página nova (oráculo hidden, hid-form-end)
    if (p.markStyle.hidden && !p.glyphs.length && blockIdx === this.full.blocks.length - 1 && !this.atTop) return;
    const ps0 = this.cur;
    // parágrafo que COMEÇA com quebra de página (oráculo tocref-pbstart, modos 11/14/15):
    // o Word leva o parágrafo inteiro — número da lista, indicadores (PAGEREF) e o
    // espaço antes (como depois de quebra de seção) — para a página seguinte; a
    // quebra não deixa linha na de cima
    if (p.glyphs[0]?.kind === 'pb' && p.glyphs.length > 1) {
      const lastAfter = this.prev ? this.prev.after : 0;
      p.glyphs = p.glyphs.slice(1);
      this.newPage(this.cur.geom);
      this.topGapPrevAfter = lastAfter;
    }
    // parágrafo numerado só com a quebra de página: o Word não desenha o número (nem
    // nesta página nem na seguinte, onde a marca não ocupa linha) — oráculo numpgbr
    if (p.marker && p.glyphs.length === 1 && p.glyphs[0]!.kind === 'pb'
      && !(this.ctx.fmt.settings.compatibilityMode < 15 && this.ctx.fmt.settings.compat['splitPgBreakAndParaMark'])) p.marker = undefined;
    // quebra de página antes (espaço antes no topo: suprimido no modo 15, mantido no ≤ 14 — tocref-spbefore)
    if (p.pageBreakBefore && !this.atTop) {
      const lastAfter = this.prev ? this.prev.after : 0;
      this.newPage(this.cur.geom);
      if (this.ctx.fmt.settings.compatibilityMode < 15) this.topGapPrevAfter = lastAfter;
    }
    // keepNext / keepLines: decide antes de colocar a 1ª linha
    const frameBase = this.colFrame();
    const avail = () => this.cur.bodyBottom - this.y;
    let before = p.beforeAuto ? (this.firstInDoc ? 0 : 280) : p.spaceBefore;
    let prevAfter = this.prev ? this.prev.after : 0;
    /** "depois" do anterior que o contextual DELE suprimiu: o "antes" deste só vale o que
     *  passa dele — colapso(depois, antes) − depois (oráculo ctxmark) */
    let ctxAfter: number | null = null;
    if (this.prev && this.prev.styleId === p.styleId) {
      if (this.prev.contextual) { ctxAfter = prevAfter; prevAfter = 0; }
      if (p.contextual) before = 0;
    }
    // espaçamento automático ("HTML") entre itens da mesma lista (mesmo abstractNum,
    // numerada ou com marcador): zero; na borda da lista vale (oráculo autosplist)
    const list = this.listOf(p);
    if (list && this.prev?.list === list) { if (p.beforeAuto) before = 0; if (this.prev.afterAuto) prevAfter = 0; }
    // topo de página: espaço antes suprimido, exceto no 1º parágrafo do documento
    // e depois de quebra de seção / quebra no início do parágrafo, em que vale
    // colapso(depois anterior, antes) − depois anterior (oráculo tocref-sectgap)
    let gap = this.collapse(prevAfter, before);
    if (ctxAfter !== null) gap = Math.max(0, this.collapse(ctxAfter, before) - ctxAfter);
    if (this.sectGapAfter !== null) { gap = Math.max(0, this.collapse(this.sectGapAfter, before) - this.sectGapAfter); this.sectGapAfter = null; }
    const keepAfter = this.topGapPrevAfter;
    this.topGapPrevAfter = null;
    if (this.atTop && !this.firstInDoc) gap = keepAfter !== null ? Math.max(0, this.collapse(keepAfter, before) - keepAfter) : 0;
    /** keepNext sem keepLines (modo 15): a partir desta linha o parágrafo desce com o seguinte */
    let tailAt = -1;
    if (p.keepLines || p.keepNext) {
      const ls = this.paragraphLines(p, frameBase.w);
      const lastL = ls[ls.length - 1]!;
      const fullH = ls.reduce((a, l) => a + l.height, this.borderTopExtent(p, null) + this.borderBottomExtent(p));
      // a linha que fecha o bloco só precisa caber até o texto: a entrelinha extra
      // (múltipla > 1) abaixo dele pode passar da margem, como na colocação (oráculo keepfit)
      const closedH = fullH - lastL.height + this.closingFit(p, lastL);
      const need = gap + (p.keepNext ? fullH + this.nextBlockLead(blockIdx, g, frameBase.w) : closedH);
      const full = this.cur.bodyBottom - this.colTop;
      if (need > avail() && need <= full && !this.atTop) {
        // keepNext SEM keepLines (oráculo keepsplit): o parágrafo que não cabe inteiro
        // parte normalmente (a última linha já vai com o seguinte); se ele cabe e só o
        // início do seguinte não, no modo 15 descem só as últimas linhas (2 com
        // viúvas/órfãs, 1 sem; todas se sobrar uma só) — nos modos antigos, ele inteiro
        if (!p.keepLines && gap + closedH > avail()) {
          // parte normalmente
        } else if (!p.keepLines && this.ctx.fmt.settings.compatibilityMode >= 15 && ls.length > 1) {
          const widowOn = p.widowControl || p.ppr.widowControl === undefined;
          const m = widowOn ? (ls.length - 2 >= 2 ? 2 : ls.length) : 1;
          if (m >= ls.length) { this.breakColumn(); gap = 0; } else tailAt = ls.length - m;
        } else {
          this.breakColumn();
          gap = 0;
        }
      }
    }
    const yPre = this.y;
    const gapIn = !this.atTop || this.firstInDoc || keepAfter !== null ? gap : 0;
    this.y += gapIn;
    // topo da página sob flutuante do cabeçalho/rodapé dos modos ≤ 14: o parágrafo desce
    // para baixo dele a partir do SEU topo (antes do "antes") e o "antes" vale lá (oráculo hff14wrap)
    if (this.atTop && gapIn > 0 && this.cur.floats.some((f) => f.bodyOnly)) {
      const fr = this.colFrame();
      const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, yPre, gapIn + markLineH(p));
      if (f0.skipTo !== undefined && f0.skipTo > yPre) this.y = Math.max(this.y, f0.skipTo + gapIn);
    }
    /** topo do parágrafo para objetos relativos a ele: o fim do "depois" do anterior */
    const paraRef: number | undefined = yPre + Math.min(prevAfter, gapIn);
    const selfGap = gapIn - Math.min(prevAfter, gapIn);
    // âncora de tabela flutuante: se ela a empurra para baixo, o espaço antes vale de novo lá (oráculo ftable2)
    const ftGap = this.floatTableGap && !this.atTop ? gap : this.carryAnchorGap ? before : 0;
    this.floatTableGap = false;
    this.carryAnchorGap = false;
    this.firstInDoc = false;
    void ps0;

    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const groupedNext = blockIdx + 1 <= g.blocks[1] && this.groupsWithNext(p, this.full.blocks[blockIdx + 1]);
    const widow = p.widowControl || p.ppr.widowControl === undefined;
    // linhas colocadas na página corrente (para mover em viúvas/órfãs)
    let frag: { line: Line; y: number; frameX: number }[] = [];
    let fragTop = this.y;
    /** o fragmento corrente contém a 1ª linha do parágrafo */
    let fragHasFirst = true;
    const flushFrag = (isLast: boolean) => {
      if (!frag.length) return;
      const frameX = frag[0]!.frameX;
      const boxTop = fragTop;
      const boxAt = this.cur.body.length;
      for (const f of frag) {
        if (this.cur.geom.lnNum && !p.ppr.suppressLineNumbers) this.paintLineNumber(f.frameX, f.y + f.line.baseline);
        paintLine(this.ctx, this.cur.body, f.line, f.frameX, f.y);
        this.paintInlineDrawings(this.cur.body, f.line, f.frameX, f.y, this.cur);
        this.cur.page.lines.push(lineRecord(ref, p, f.line, f.frameX, f.y, this.colFrame().w));
      }
      const last = frag[frag.length - 1]!;
      let bottom = last.y + last.line.height;
      this.noteColContent(bottom);
      if (isLast) bottom += this.borderBottomExtent(p, groupedNext);
      this.paintBox(this.cur.body, p, frameX, this.colFrame().w, boxTop, bottom, frag === null ? null : this.prev, boxAt, isLast && groupedNext);
      frag = [];
    };
    this.y += this.borderTopExtent(p, this.prev);
    let first = true;
    /** linhas (visuais) já colocadas e a página onde o parágrafo começou (keepNext: tailAt) */
    let lineNo = 0;
    const tailPs = this.cur;
    /** onde ficou a 1ª linha: os objetos ancorados no parágrafo vão para ESSA
     *  página (não a da última linha — parágrafo com quebra de página no fim) */
    let anchorAt: { ps: PageState; top: number; x: number; w: number; ref: number | undefined } = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: paraRef };
    let early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, undefined, paraRef);
    // objeto com quebra, posicionado em relação ao parágrafo, passaria da margem
    // inferior: o Word o SOBE até a margem se assim ele não cruza as linhas do
    // próprio parágrafo; senão o parágrafo desce com ele para a próxima
    // página/coluna (oráculo selffloat)
    const over = early.filter((e) => followsText(floatAnchor(e.obj.run)) && e.obj.y + e.obj.h > this.cur.bodyBottom + 0.5);
    if (!this.atTop && over.length) {
      const paraBottom = this.y + this.paragraphHeight(p, frameBase.w);
      const lift = over.every((e) => this.cur.bodyBottom - e.obj.h >= paraBottom - 0.5);
      for (const e of early) this.unplaceFloat(e);
      if (lift) {
        // (os outros objetos seguem medidos do topo antes do "antes" — oráculo liftref)
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, this.cur.bodyBottom, paraRef);
      } else {
        this.breakColumn();
        this.y += this.borderTopExtent(p, this.prev);
        anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: undefined };
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
      }
    }
    let earlyAt = { ps: this.cur, x: this.colFrame().x };
    const earlyRuns = new Set(early.map((e) => e.obj.run));
    // parágrafo VAZIO que carrega a quebra de seção: não desce para a página
    // seguinte, fica pendurado abaixo da margem (oráculo sectfit)
    const hangs = blockIdx === g.blocks[1] && g.index < this.full.sections.length - 1 && p.glyphs.every((gl) => gl.kind === 'obj' && gl.adv === 0); // (só âncoras de flutuantes: vazio — corpus t20)
    /** quadro da linha em this.y, contornando os flutuantes da página corrente */
    const frameHere = () => {
      const fr = this.colFrame();
      const lineH = markLineH(p);
      let frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      // objeto sem espaço ao lado (ou quebra "superior e inferior"): desce para baixo dele
      for (let k = 0; k < 8 && frame.skipTo !== undefined && frame.skipTo > this.y; k++) {
        this.y = frame.skipTo;
        frame = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, lineH);
      }
      return frame;
    };
    do {
      const y0 = this.y;
      let frame = frameHere();
      // empurrado para baixo de flutuante: o "antes" vale de novo lá — o da âncora de
      // tabela flutuante inteiro; senão a parte do vão que fica DENTRO do parágrafo (a
      // que excede o "depois" do anterior: a caixa do parágrafo desce com ela — oráculos
      // ftable2 img-tb-*, ftaftdist fad-html-*)
      const pushGap = ftGap > 0 ? ftGap : selfGap;
      if (first && pushGap > 0 && this.y > y0) { this.y += pushGap; frame = frameHere(); }
      const mark = br.mark();
      let seg = this.pickSeg(br, frame);
      let line = br.next(seg.f);
      // texto da linha mais alto que a estimativa (fonte da marca) cruza um flutuante que a
      // altura estimada não cruzava: desce para baixo dele (oráculo ftable2, ft2-formx-noempty-before;
      // a entrelinha extra abaixo do texto não conta)
      const textH = Math.min(line.height, line.baseline + line.desc);
      if (this.cur.floats.length && textH > markLineH(p) + 1) {
        const fr = this.colFrame();
        const f2 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, textH);
        if (f2.skipTo !== undefined && f2.skipTo > this.y) {
          this.y = f2.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        } else if (narrower(f2, frame)) {
          // cruza um flutuante que deixa espaço ao lado: a linha estreita (oráculo tallwrap)
          frame = f2;
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      // texto mais BAIXO que a marca: o salto para baixo do flutuante foi pela altura da
      // marca; se a linha real cabe acima dele, ela fica lá (oráculo liftref, lr-mark11)
      if (this.cur.floats.length && this.y > y0 + 0.5) {
        const textH2 = Math.min(line.height, line.baseline + line.desc);
        if (textH2 < markLineH(p) - 1) {
          const fr = this.colFrame();
          const f0 = this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, y0, textH2);
          if (f0.skipTo === undefined && !narrower(f0, frame)) {
            const yb = this.y;
            this.y = y0;
            br.reset(mark);
            const seg0 = this.pickSeg(br, f0);
            const line0 = br.next(seg0.f);
            if (Math.min(line0.height, line0.baseline + line0.desc) <= textH2 + 0.5) { frame = f0; seg = seg0; line = line0; } else {
              this.y = yb;
              br.reset(mark);
              seg = this.pickSeg(br, frame);
              line = br.next(seg.f);
            }
          }
        }
      }
      // palavra que não cabe no vão ao lado de um flutuante: o Word não a parte por
      // caractere — a linha desce para baixo dele (oráculo gapind, gi-*-r0)
      if (this.cur.floats.length && !line.last && line.end > line.start && line.end < p.glyphs.length) {
        const fr = this.colFrame();
        const narrowed = frame.left > p.indLeft + 0.5 || frame.right < fr.w - p.indRight - 0.5;
        const g0 = p.glyphs[line.end - 1]!, g1 = p.glyphs[line.end]!;
        const word = (g: typeof g0) => g.kind === 'char' && !/\s/.test(g.ch);
        // (linha que acabou num ponto de hifenização não foi partida por caractere)
        if (narrowed && word(g0) && !g0.breakAfter && word(g1) && !line.placed[line.placed.length - 1]?.g.autoHyphen) {
          const lineH = Math.max(markLineH(p), line.height);
          let below = Infinity;
          for (const f of this.cur.floats) {
            if (f.wrap !== 'square' && f.wrap !== 'tight' && f.wrap !== 'through') continue;
            if (this.y + lineH <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
            below = Math.min(below, f.y + f.h + f.distB);
          }
          if (below < Infinity && below > this.y) {
            this.y = below;
            frame = frameHere();
            br.reset(mark);
            seg = this.pickSeg(br, frame);
            line = br.next(seg.f);
          }
        }
      }
      // tab que abre a linha no vão com a parada além dele: a linha desce para baixo do
      // flutuante (oráculo tabgap)
      if (line.gapTab === 'start' && this.cur.floats.length) {
        const lineH = Math.max(markLineH(p), line.height);
        let below = Infinity;
        for (const f of this.cur.floats) {
          if (f.wrap !== 'square' && f.wrap !== 'tight' && f.wrap !== 'through') continue;
          if (this.y + lineH <= f.y - f.distT + 0.5 || this.y >= f.y + f.h + f.distB - 0.5) continue;
          below = Math.min(below, f.y + f.h + f.distB);
        }
        if (below < Infinity && below > this.y) {
          this.y = below;
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      // modos < 15: a última linha do parágrafo só fica acima/ao lado de um flutuante se
      // a linha INTEIRA mais o "depois" ficarem fora dele; senão desce (oráculo ftafter)
      if (this.cur.floats.length && line.last && this.ctx.fmt.settings.compatibilityMode < 15) {
        const aft = p.afterAuto ? 280 : p.spaceAfter;
        const fr = this.colFrame();
        const f3 = aft > 0 ? this.wrapFrame({ left: p.indLeft, right: fr.w - p.indRight }, fr.x, this.y, line.height + aft) : undefined;
        if (f3?.skipTo !== undefined && f3.skipTo > this.y) {
          this.y = f3.skipTo + (first ? selfGap : 0);
          frame = frameHere();
          br.reset(mark);
          seg = this.pickSeg(br, frame);
          line = br.next(seg.f);
        }
      }
      let noteNeed = this.noteNeed(p, line);
      let pageChanged = false;
      // a entrelinha extra (múltipla > 1, posta abaixo do texto) pode passar da
      // margem inferior — medido no oráculo pagefit
      // linha só com a quebra de página e mais conteúdo depois dela no parágrafo: não
      // ocupa altura no teste — a quebra fica nesta página (oráculo pbfit)
      const breakOnly = line.breakAfter === 'page' && !line.last && line.placed.every((pg) => pg.g.kind === 'pb');
      const fitH = breakOnly ? 0 : p.lineRule === 'exact' || p.lineRule === 'atLeast' ? line.height : Math.min(line.height, line.baseline + line.desc);
      // nota nova que não cabe inteira: o começo dela fica com a linha (oráculo fncont)
      let noteCut: NoteCut | null = null;
      if (noteNeed.extra > 0 && !this.atTop && !hangs && this.y + this.noteLineFit(p, line) > this.cur.bodyBottom - noteNeed.extra + 0.05
        && this.y + this.noteLineFit(p, line) <= this.cur.bodyBottom + 0.05) noteCut = this.notePartial(noteNeed.ids, this.y + this.noteLineFit(p, line));
      if (lineNo === tailAt && this.cur === tailPs && frag.length && !this.atTop) {
        // keepNext: as últimas linhas descem com o início do seguinte (oráculo keepsplit)
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
        pageChanged = true;
      // (sem folga: 0,21 tw além da margem e 0,12 tw além do topo do rodapé já descem — oráculo bodyfit)
      } else if (!noteCut && this.y + (noteNeed.extra > 0 ? this.noteLineFit(p, line) : fitH) > this.cur.bodyBottom - noteNeed.extra + 0.05 && !this.atTop && !hangs) {
        // não cabe: viúvas/órfãs
        const placedHere = frag.length;
        const moved: Line[] = [];
        if (widow && placedHere === 1 && fragHasFirst && !first) {
          // órfã: a 1ª linha não fica sozinha no fim da página
          moved.push(frag.pop()!.line);
        } else if (widow && line.last && placedHere >= 2) {
          // viúva: a última linha não vai sozinha para a próxima página
          moved.push(frag.pop()!.line);
          // …e se isso deixar a 1ª linha sozinha (parágrafo de 3 linhas), desce tudo
          if (frag.length === 1 && fragHasFirst) moved.unshift(frag.pop()!.line);
        }
        // tudo desceu: a 1ª linha continua no fragmento (agora na página nova)
        const allMoved: boolean = fragHasFirst && frag.length === 0;
        flushFrag(false);
        fragHasFirst = allMoved;
        this.breakColumn();
        fragTop = this.y;
        if (allMoved) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: undefined };
        for (const m of moved) {
          const fx = this.colFrame().x;
          frag.push({ line: m, y: this.y, frameX: fx });
          this.y += m.height;
        }
        pageChanged = true;
      }
      if (first) {
        // a 1ª linha foi para outra página/coluna: os flutuantes vão junto
        if (early.length && (earlyAt.ps !== this.cur || earlyAt.x !== this.colFrame().x)) {
          for (const e of early) this.unplaceFloat(e);
          early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
          earlyAt = { ps: this.cur, x: this.colFrame().x };
        }
        // 1ª linha empurrada para baixo de um flutuante (tabela ou figura) na MESMA página: os
        // objetos ancorados no parágrafo seguem medidos de onde ele começava (oráculo
        // ftanchor); empurrada para além do pé da página, valem dali (corpus t20)
        if (anchorAt.ps !== this.cur || this.y <= anchorAt.top + 0.5 || this.y > this.cur.bodyBottom) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w, ref: undefined };
      }
      if (pageChanged) {
        // a linha foi quebrada no quadro da página anterior (contorno de objetos): refaz no da nova
        const yTop = this.y;
        let nf = frameHere();
        // 1ª linha empurrada para baixo de um flutuante no topo da página nova: o "antes"
        // vale lá, como na mesma página (oráculo hff14wrap)
        if (first && fragHasFirst && !frag.length && pushGap > 0 && this.y > yTop + 0.01) { this.y += pushGap; nf = frameHere(); }
        if (nf.left !== frame.left || nf.right !== frame.right || nf.segs || frame.segs) {
          br.reset(mark);
          frame = nf;
          seg = this.pickSeg(br, nf);
          line = br.next(seg.f);
          noteNeed = this.noteNeed(p, line);
        }
      }
      if (noteNeed.ids.length) this.reserveNotes(noteNeed.ids, pageChanged ? null : noteCut);
      frag.push({ line, y: this.y, frameX: this.colFrame().x });
      // os outros vãos da mesma linha (objeto no meio: texto dos dois lados)
      let lineH = line.height;
      line = this.moreSegs(br, frame, seg.k, line, (l) => {
        const nn = this.noteNeed(p, l);
        if (nn.ids.length) this.reserveNotes(nn.ids);
        frag.push({ line: l, y: this.y, frameX: this.colFrame().x });
        lineH = Math.max(lineH, l.height);
      });
      this.y += lineH;
      this.atTop = false;
      first = false;
      lineNo++;
      // quebra de linha w:clear: a linha seguinte começa abaixo dos flutuantes com
      // contorno que alcançam esta altura (oráculo brclear)
      if (line.clear) {
        for (let k = 0; k < 8; k++) {
          const yy = this.y;
          const below = this.cur.floats.filter((f) => f.wrap !== 'none' && f.y - f.distT < yy && f.y + f.h + f.distB > yy);
          if (!below.length) break;
          this.y = Math.max(...below.map((f) => f.y + f.h + f.distB));
        }
      }
      if (line.breakAfter === 'page') {
        flushFrag(false);
        fragHasFirst = false;
        this.newPage(this.cur.geom);
        fragTop = this.y;
        this.atTop = true;
      } else if (line.breakAfter === 'column') {
        flushFrag(false);
        fragHasFirst = false;
        this.breakColumn();
        fragTop = this.y;
      }
    } while (!br.done());
    flushFrag(true);
    this.y += this.borderBottomExtent(p, groupedNext);
    // a coluna termina no fim do parágrafo: o "depois" conta na linha entre colunas
    if (!this.atTop) this.noteColContent(this.y + (p.afterAuto ? 280 : p.spaceAfter));
    // objetos flutuantes ancorados neste parágrafo
    for (const r of earlyRuns) this.prePlaced.add(r);
    this.placeFloats(p, anchorAt.ps, anchorAt.x, anchorAt.w, anchorAt.top, anchorAt.ps.body, 0, anchorAt.ref);
    for (const r of earlyRuns) this.prePlaced.delete(r);
    // parágrafo só com quebra de página: o próximo começa no topo (com
    // splitPgBreakAndParaMark a marca já ocupou a 1ª linha da página — oráculo pbmark)
    const lastGlyph = p.glyphs[p.glyphs.length - 1];
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat['splitPgBreakAndParaMark'];
    if (lastGlyph?.kind === 'pb' && !splitPg) this.atTop = true;
    this.prev = {
      after: p.afterAuto ? 280 : p.spaceAfter,
      afterAuto: p.afterAuto,
      ...(list ? { list } : {}),
      ...(p.styleId ? { styleId: p.styleId } : {}),
      contextual: p.contextual,
      ...(p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {}),
    };
  }

  // ───────────────────────── notas de rodapé ─────────────────────────

  /** conteúdo diagramado por nota e largura */
  private noteCache = new Map<string, CellContent>();

  /** Colunas da área de notas de rodapé: com w15:footnoteColumns, N iguais com vão de
   *  720 tw (oráculo notefmt, cols2); sem ("coincidir layout de seção"), as colunas da
   *  própria seção (sect-cols2). x relativo à margem esquerda; w = a da 1ª coluna. */
  private noteCols(g: SectGeom): { n: number; w: number; dx: number[] } {
    const contentW = g.pageW - g.marL - g.marR;
    const n = g.notes.fnCols ?? g.cols.length;
    if (g.notes.fnCols === undefined && n > 1) return { n, w: g.cols[0]!.w, dx: g.cols.map((c) => c.x - g.marL) };
    const gap = 720, w = n > 1 ? (contentW - gap * (n - 1)) / n : contentW;
    return { n, w, dx: Array.from({ length: n }, (_, k) => k * (w + gap)) };
  }

  /** Conteúdo diagramado de uma nota (largura do corpo ou da coluna de notas). */
  private noteContent(id: number): CellContent {
    const g = this.cur.geom;
    const w = this.noteCols(g).w;
    const key = `${id}:${Math.round(w)}`;
    let c = this.noteCache.get(key);
    if (!c) {
      const blocks: Block[] = this.full.footnoteBlocks?.get(id) ?? (this.full.footnotes.get(id) ?? []).map((paragraph) => ({ type: 'paragraph', paragraph }));
      // o número da própria nota é a marca da referência (no formato da seção dela)
      const mark = this.ctx.noteMarkOf('footnote', id) ?? '';
      const saved = this.ctx.numbering;
      this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      try {
        c = this.layoutStatic(blocks, g.marL, w, {
          field: (name) => (name === 'FOOTNOTEREF_MARK' ? mark : this.fieldValue(this.cur)(name)),
        }, `fn${id}`);
      } finally { this.ctx.numbering = saved; }
      this.noteCache.set(key, c);
    }
    return c;
  }

  /** Notas de rodapé NOVAS referenciadas pelas linhas de texto de uma linha de tabela
   *  (cada linha diz o parágrafo de origem no ref: b3/r2/c0/b1…). */
  private rowNoteIds(row: TableLayout['rows'][number]): number[] {
    const ids: number[] = [];
    for (const l of row.lines) {
      const para = this.paraByRef(l.ref);
      if (!para) continue;
      let off = 0;
      for (const r of para.runs) {
        const len = r.text.length;
        const id = r.noteRef?.kind === 'footnote' ? r.noteRef.id : undefined;
        if (id !== undefined && off + Math.max(len, 1) > l.start && off < Math.max(l.end, l.start + 1)
          && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
        off += len;
      }
    }
    return ids;
  }

  private rowNoteExtra(row: TableLayout['rows'][number]): number {
    return this.notesExtra(this.rowNoteIds(row));
  }

  /** Parágrafo do corpo pelo caminho do ref ("b3/r2/c0/b1"). */
  private paraByRef(ref: string): Paragraph | undefined {
    const seg = ref.split('/');
    const m = /^b(\d+)$/.exec(seg[0] ?? '');
    if (!m) return undefined;
    let block: Block | undefined = this.full.blocks[+m[1]!];
    for (let i = 1; i + 2 < seg.length + 1 && block; i += 3) {
      if (block.type !== 'table') return undefined;
      const ri = /^r(\d+)$/.exec(seg[i] ?? ''), ci = /^c(\d+)$/.exec(seg[i + 1] ?? ''), bi = /^b(\d+)$/.exec(seg[i + 2] ?? '');
      if (!ri || !ci || !bi) return undefined;
      // "cN" é a coluna da GRADE (table.ts: gridBefore + gridSpans), não o índice da célula
      // — nota em célula depois de uma mesclada na horizontal (oráculo cellnote, corpus t34)
      const row = block.rows[+ri[1]!];
      let col = row?.trPr?.gridBefore ?? 0, cell: (typeof block.rows)[number]['cells'][number] | undefined;
      for (const c of row?.cells ?? []) {
        if (col === +ci[1]!) { cell = c; break; }
        col += Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1);
      }
      if (!cell) return undefined;
      const blocks: Block[] = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }));
      block = blocks[+bi[1]!];
    }
    return block?.type === 'paragraph' ? block.paragraph : undefined;
  }

  private sepCache?: { h: number; mid: number; thick: number };
  /**
   * Linha do separador: altura (1 linha SIMPLES da fonte do Normal, sem espaçamento —
   * o pPr do separador e a entrelinha do Normal não contam, oráculo fnsep), o meio do
   * traço (0,23 em acima da base da linha) e a espessura (0,05 em em pixels de 1/600",
   * por cima — medidos com Arial, Calibri e Times: oráculo endnotes, sep-*).
   */
  private sepGeom(): { h: number; mid: number; thick: number } {
    if (!this.sepCache) {
      const ppr = { spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' as const } };
      const p = prepareParagraph(this.ctx, { runs: [], props: paraPropsFromPPr(ppr), ppr }, {});
      const l = new LineBreaker(this.ctx, p).next({ left: 0, right: 10000 });
      const em = (p.markStyle.sizePt || 10) * 20;
      this.sepCache = { h: l.height, mid: l.baseline - 0.23 * em, thick: Math.max(2.4, Math.ceil((0.05 * em) / 2.4 - 0.01) * 2.4) };
    }
    return this.sepCache;
  }

  /** Altura do separador (1 linha do estilo Normal). */
  private separatorHeight(): number {
    return this.sepGeom().h;
  }

  /** Traço do separador a partir do topo `top` da linha dele (2" no normal, a
   *  largura da coluna no de continuação das notas de fim). */
  private sepLine(x: number, top: number, w: number): PageItem {
    const sg = this.sepGeom();
    return { t: 'rect', x, y: top + sg.mid - sg.thick / 2, w, h: sg.thick, fill: '000000' };
  }

  /** Altura da área de notas (separador + notas; em colunas, a coluna mais alta). */
  private noteAreaOf(contents: CellContent[], g: SectGeom = this.cur.geom): number {
    if (!contents.length) return 0;
    return this.separatorHeight() + this.packNotes(contents.map((c) => c.height), this.noteCols(g).n).height;
  }

  /** Notas inteiras por coluna: cada coluna recebe notas até passar da média
   *  (oráculo notefmt, cols2); uma coluna = em sequência. */
  private packNotes(hs: number[], n: number): { col: number[]; top: number[]; height: number } {
    const col: number[] = [], top: number[] = [];
    const target = n > 1 ? hs.reduce((a, b) => a + b, 0) / n : Infinity;
    let c = 0, y = 0, max = 0;
    for (const h of hs) {
      if (y > 0 && y >= target - 0.5 && c < n - 1) { c++; y = 0; }
      col.push(c); top.push(y);
      y += h;
      max = Math.max(max, y);
    }
    return { col, top, height: max };
  }

  /** Espaço que as notas NOVAS `ids` acrescentam à área de notas da página. */
  private notesExtra(ids: number[]): number {
    if (!ids.length) return 0;
    const cur = this.cur.notes.map((n) => n.content);
    return this.noteAreaOf([...cur, ...ids.map((id) => this.noteContent(id))]) - this.noteAreaOf(cur);
  }

  /** Altura com que a linha que traz uma nota NOVA precisa caber acima das notas: a
   *  linha inteira (com a entrelinha extra) e, na última do parágrafo, o "depois"
   *  dele (oráculo fnsep, varreduras fsep-top* / fsep-a0-*) */
  private noteLineFit(p: PreparedPara, line: Line): number {
    return line.height + (line.last ? (p.afterAuto ? 280 : p.spaceAfter) : 0);
  }

  /** Notas NOVAS referenciadas na linha e o espaço extra que exigem. */
  private noteNeed(p: PreparedPara, line: Line): { ids: number[]; extra: number } {
    const ids: number[] = [];
    for (let k = line.start; k < line.end; k++) {
      const id = p.glyphs[k]?.noteId;
      if (id !== undefined && !ids.includes(id) && !this.cur.notes.some((n) => n.id === id)) ids.push(id);
    }
    return { ids, extra: this.notesExtra(ids) };
  }

  private reserveNotes(ids: number[], cut?: NoteCut | null): void {
    const ps = this.cur;
    for (const id of ids) {
      if (ps.notes.some((n) => n.id === id)) continue;
      const content = cut && cut.id === id ? cut.first : this.noteContent(id);
      ps.notes.push({ id, content });
      if (cut && cut.id === id) this.noteCarry.push({ id, content: cut.rest });
    }
    ps.noteArea = this.noteAreaOf(ps.notes.map((n) => n.content), ps.geom);
    ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
  }

  /** notas que continuam na página seguinte (o resto de uma nota partida) */
  private noteCarry: { id: number; content: CellContent }[] = [];
  /** nota partida da linha de tabela que vai ser emitida */
  private rowNoteCut: NoteCut | null = null;
  /** tabela do fluxo: os fundos de mescla vertical saem por página no fim (oráculo vmshd) */
  private flowFills = false;

  /**
   * Nota NOVA que não cabe inteira com a linha da referência (que termina em `bottom`):
   * o começo dela fica nesta página — o que couber, com viúvas/órfãs da própria nota — e o
   * resto continua no pé da seguinte, antes das notas de lá (oráculo fncont). Só a última
   * das notas da linha parte; sem ao menos o começo permitido, null (a linha desce).
   * Com a área de notas em colunas, a nota não parte.
   */
  private notePartial(ids: number[], bottom: number): NoteCut | null {
    if (!ids.length || this.noteCols(this.cur.geom).n > 1) return null;
    const ps = this.cur;
    let h = ps.notes.length ? 0 : this.separatorHeight();
    for (const id of ids.slice(0, -1)) h += this.noteContent(id).height;
    const id = ids[ids.length - 1]!;
    const avail = ps.bodyBottom - bottom - h;
    if (avail <= 0) return null;
    const sp = splitContent(this.noteContent(id), avail);
    return sp && sp[0].lines.length && sp[1].lines.length ? { id, first: sp[0], rest: sp[1] } : null;
  }

  /** Separador + notas, alinhados ao fundo do corpo (medido no Word); "abaixo do
   *  texto" (w:pos beneathText): logo depois do conteúdo da página, como as notas de
   *  fim (oráculo notefmt, pos-beneath*). As linhas das notas entram na página
   *  (o editor edita a nota no lugar). */
  private paintNotes(ps: PageState): void {
    if (!ps.notes.length) return;
    const g = ps.geom;
    let y = ps.bodyBottomBase - ps.noteArea;
    if (g.notes.fnPos === 'beneathText' && ps === this.cur) {
      const end = Math.max(this.y, this.colMaxY) + (this.prev && !this.atTop ? this.prev.after : 0);
      y = Math.max(ps.bodyTop, Math.min(y, end));
    }
    // traço de 2" (144 pt) no separador
    ps.body.push(this.sepLine(g.marL, y, 2880));
    y += this.separatorHeight();
    const cols = this.noteCols(g);
    const pack = this.packNotes(ps.notes.map((n) => n.content.height), cols.n);
    ps.notes.forEach((n, i) => {
      const dx = cols.dx[pack.col[i]!] ?? 0, dy = y + pack.top[i]!;
      for (const it of n.content.items) ps.body.push(shiftItem(it, dy, dx));
      for (const l of n.content.lines) ps.page.lines.push(shiftLineXY(l, dx, dy));
    });
  }

  // ───────────────────────── notas de fim ─────────────────────────

  /** fluxo de notas de fim em curso (o separador já saiu: páginas e colunas seguintes
   *  ganham o de continuação) */
  private enFlow: { sepDone: boolean } | null = null;
  /** nota de fim sendo diagramada (o número dela no campo ENDNOTEREF_MARK) */
  private curEndnote: number | undefined;
  /** quantas notas de fim (na ordem de referência) já saíram */
  private endnotesDone = 0;

  /**
   * Notas de fim pendentes no fluxo, depois do conteúdo da seção/documento: o
   * separador (uma linha simples da fonte do Normal, depois do "depois" do último
   * parágrafo, que mantém a 1ª linha da 1ª nota com ele) e as notas na ordem de
   * referência; a continuação noutra página tem o separador de continuação
   * (oráculo endnotes). Linhas com ref "en<id>/b<k>".
   */
  private placeEndnotes(g: SectGeom): void {
    const order = this.ctx.endnoteOrder;
    const ids = order.slice(this.endnotesDone);
    this.endnotesDone = order.length;
    if (!ids.length) return;
    const sepPPr = { spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' as const }, keepNext: true };
    const sep: Paragraph = { runs: [], props: paraPropsFromPPr(sepPPr), ppr: sepPPr };
    const blocks: Block[] = [{ type: 'paragraph', paragraph: sep }];
    const refs = ['ensep'];
    const owner: (number | undefined)[] = [undefined];
    for (const id of ids) {
      const bs: Block[] = this.full.endnoteBlocks?.get(id) ?? (this.full.endnotes.get(id) ?? []).map((paragraph) => ({ type: 'paragraph', paragraph }));
      bs.forEach((b, k) => { blocks.push(b); refs.push(`en${id}/b${k}`); owner.push(id); });
    }
    if (blocks.length < 2) return;
    // o fluxo das notas usa a mesma maquinaria do corpo, sobre os blocos delas
    const saved = this.full;
    this.full = { ...saved, blocks };
    // em colunas, a área das notas é como uma seção contínua: o texto de antes e as
    // notas são equilibrados cada um à parte (oráculo endnotes, en-cols)
    const multi = this.pageCols().length > 1 || g.cols.length > 1;
    const gEn: SectGeom = { ...g, blocks: [0, blocks.length - 1], ...(multi ? { balKey: -1 - g.index } : {}) };
    if (multi) this.continuousSection(gEn);
    this.enFlow = { sepDone: false };
    try {
      for (let b = 0; b < blocks.length; b++) {
        const block = blocks[b]!;
        this.curEndnote = owner[b];
        if (block.type === 'paragraph') this.placeParagraph(block.paragraph, refs[b]!, b, gEn);
        else this.placeTable(block, refs[b]!);
        if (b === 0) {
          // o traço na linha do separador (a linha some da página: não é texto)
          const lines = this.cur.page.lines;
          const at = lines.map((l) => l.ref).lastIndexOf('ensep');
          if (at >= 0) {
            const l = lines[at]!;
            lines.splice(at, 1);
            this.cur.body.push(this.sepLine(l.x, l.y, 2880));
          }
          this.enFlow.sepDone = true;
        }
      }
      if (multi) this.recordBalance(gEn);
    } finally {
      this.full = saved;
      this.enFlow = null;
      this.curEndnote = undefined;
    }
  }

  /** Separador de continuação no topo da página/coluna nova do fluxo de notas de fim
   *  (`draw`: o traço, da largura da coluna; na coluna seguinte só o lugar). */
  private continuationSeparator(draw: boolean): void {
    const fr = this.colFrame();
    if (draw) this.cur.body.push(this.sepLine(fr.x, this.y, fr.w));
    this.y += this.separatorHeight();
  }

  /** Linhas de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  private paragraphLines(p: PreparedPara, width: number): Line[] {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    const ls: Line[] = [];
    do ls.push(br.next({ left: p.indLeft, right: width - p.indRight })); while (!br.done());
    return ls;
  }

  /** Altura com que a linha que fecha um bloco precisa caber: a entrelinha extra
   *  (múltipla > 1) fica abaixo do texto e pode passar da margem (oráculos pagefit, keepfit). */
  private closingFit(p: PreparedPara, l: Line): number {
    return p.lineRule === 'exact' || p.lineRule === 'atLeast' ? l.height : Math.min(l.height, l.baseline + l.desc);
  }

  /** Altura total de um parágrafo (sem quebra de página), p/ keepLines/keepNext. */
  private paragraphHeight(p: PreparedPara, width: number): number {
    const br = new LineBreaker(this.ctx, p, this.gridFor(p));
    let h = this.borderTopExtent(p, null) + this.borderBottomExtent(p);
    do h += br.next({ left: p.indLeft, right: width - p.indRight }).height; while (!br.done());
    return h;
  }

  /** Altura da 1ª linha (e cadeia keepNext) do bloco seguinte. */
  private nextBlockLead(blockIdx: number, g: SectGeom, width: number): number {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || blockIdx + 1 > g.blocks[1]) return 0;
    // prévia pura: não avança listas, SEQ nem números de nota
    const saved = this.ctx.saveFlow();
    try {
      // o "depois" do próprio parágrafo (keepNext) conta até o início do seguinte;
      // contextual com o seguinte no mesmo estilo zera (oráculo keepgap)
      const curB = this.full.blocks[blockIdx];
      const from = curB?.type === 'paragraph' ? prepareParagraph(this.ctx, curB.paragraph, {}) : undefined;
      let after = from ? (from.afterAuto ? 280 : from.spaceAfter) : 0;
      if (nb.type === 'table') {
        // título antes de tabela: fica com a 1ª linha (e a seguinte, se a 1ª
        // tiver keepNext) — oráculo keeptbl. Prévia sem página: sem floats.
        const t = layoutTable(this.ctx, nb, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref), 'preview');
        const r0 = t.rows[0];
        if (!r0) return 0;
        const startNeed = (r: TableLayout['rows'][number], cap: number) =>
          r.cantSplit || (r.natural ?? r.height) < r.height ? r.height : Math.min(r.height, cap);
        const r1 = t.rows[1];
        // (cadeia de linhas com keepNext: até a 1ª que não tem — oráculo keepchain)
        let chain = 0, k = 0;
        while (t.rows[k]?.keepNext && t.rows[k + 1]) { chain += t.rows[k]!.height; k++; }
        const lead = k > 0 ? chain + startNeed(t.rows[k]!, 400) : r1 && r0.keepNext ? r0.height + startNeed(r1, 400) : startNeed(r0, r0.natural ?? r0.height);
        const dropped = !!from && this.dropsAfterBeforeTable({ after, afterAuto: from.afterAuto, contextual: from.contextual, ...(from.styleId ? { styleId: from.styleId } : {}) }, nb);
        return (dropped ? 0 : after) + lead;
      }
      const q = prepareParagraph(this.ctx, nb.paragraph, {});
      let before = q.spaceBefore;
      let ctxAfter: number | null = null;
      if (from && from.styleId === q.styleId) {
        if (from.contextual) { ctxAfter = after; after = 0; }
        if (q.contextual) before = 0;
      }
      const gap = ctxAfter !== null ? Math.max(0, this.collapse(ctxAfter, before) - ctxAfter) : this.collapse(after, before);
      if (q.keepNext) return gap + this.paragraphHeight(q, width) + this.nextBlockLead(blockIdx + 1, g, width);
      // o seguinte só começa nesta página com as linhas que ele não pode deixar
      // sozinhas: inteiro com keepLines; com viúvas/órfãs, 2 linhas (todas se
      // tiver até 3) — oráculo keepwidow
      // (a última linha exigida fecha o bloco: só o texto dela precisa caber — oráculo keepfit)
      if (q.keepLines) {
        const ls = this.paragraphLines(q, width);
        const lastL = ls[ls.length - 1]!;
        return gap + ls.reduce((a, l) => a + l.height, this.borderTopExtent(q, null)) - lastL.height + this.closingFit(q, lastL);
      }
      const br = new LineBreaker(this.ctx, q, this.gridFor(q));
      const qs: Line[] = [];
      do qs.push(br.next({ left: q.indLeft, right: width - q.indRight })); while (!br.done() && qs.length < 4);
      const widow = q.widowControl || q.ppr.widowControl === undefined;
      const n = !widow ? 1 : br.done() && qs.length <= 3 ? qs.length : 2;
      const take = qs.slice(0, n);
      return gap + take.reduce((a, l) => a + l.height, 0) - take[n - 1]!.height + this.closingFit(q, take[n - 1]!);
    } finally {
      this.ctx.restoreFlow(saved);
    }
  }

  // ───────────────────────── tabelas no corpo ─────────────────────────

  private placeTable(table: TableBlock, ref: string, blockIdx = -1): void {
    // tabela só com linhas ocultas: some, sem mexer no espaçamento (oráculo hidden)
    if (table.rows.every((r) => isHiddenRow(this.ctx, r))) return;
    this.sectGapAfter = null;
    const fr = this.colFrame();
    const fp = table.tblPr?.tblpPr;
    if (fp && fp.tblpYSpec !== 'inline') {
      const textAnchor = fp.vertAnchor !== 'page' && fp.vertAnchor !== 'margin';
      if (textAnchor) {
        // âncora no texto: a posição conta do fim do "depois" do parágrafo anterior;
        // o parágrafo âncora tem o "antes" inteiro, abaixo da tabela se ela o empurra (oráculo ftable2)
        if (this.prev && !this.atTop && this.prev.after > 0 && !this.prev.contextual) {
          this.y += this.prev.after;
          this.prev = { ...this.prev, after: 0 };
        }
        this.floatTableGap = true;
      }
      // já posta no início da página (tabela tardia, passada anterior): não repete
      // tabela de posição na página que a passada anterior mandou para uma página
      // ADIANTE (a âncora não coube na página dela com o texto contornando): a âncora
      // começa naquela página, onde a tabela já entrou (oráculo ftpage, fpg-overflow)
      const ltp = blockIdx >= 0 && !textAnchor ? this.lateTables.get(blockIdx) : undefined;
      for (let k = 0; ltp && k < 20 && this.pages.length - 1 < ltp.page; k++) this.breakColumn();
      if (blockIdx >= 0 && this.placedTables.has(blockIdx)) {
        // posição na página e a âncora desceu para outra página (o texto antes dela
        // contornou a tabela e passou): a tabela vai junto, para o início da página
        // da âncora, na próxima passada (oráculo ftpage)
        const lt = this.lateTables.get(blockIdx);
        if (lt && !textAnchor && this.pages.length - 1 > lt.page && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.length - 1, flowY: this.y });
        // ela partiu e a continuação ainda não saiu: a âncora vai junto (oráculo ftvmsplit)
        if (this.lateSplit.delete(blockIdx) && this.floatCarry.length && this.col === this.cur.geom.cols.length - 1) { this.breakColumn(); this.carryAnchorGap = true; }
        return;
      }
      if (blockIdx >= 0) this.placedTables.add(blockIdx);
      // tabela flutuante (w:tblpPr): fora do fluxo, o texto seguinte a contorna
      const t = layoutTable(this.ctx, table, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
      // pintada depois do texto do corpo (como o Word: ordem do conteúdo da página)
      const items: PageItem[] = [];
      let flowY = this.y;
      if (textAnchor) {
        // âncora no texto: o parágrafo seguinte desce para baixo de flutuantes que
        // não o deixam ao lado (tabelas flutuantes de largura total) e a tabela vai
        // junto; se ela então não couber, os dois passam para a próxima página (medido no Word)
        let f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        for (let k = 0; k < 8 && f.skipTo !== undefined && f.skipTo > flowY; k++) {
          flowY = f.skipTo;
          f = this.wrapFrame({ left: 0, right: fr.w }, fr.x, flowY);
        }
        const top = fp.tblpYSpec ? flowY : flowY + (fp.tblpY ?? 0);
        // nem a 1ª linha de texto cabe: a tabela (e a âncora) vão para a próxima página; senão
        // as linhas que não cabem continuam no topo da próxima (como o Word)
        const r0 = t.rows[0];
        // "não dividir tabelas com quebra automática de texto" (w:compat, modos < 15): a
        // tabela fica inteira — passando da margem — se a altura dela couber a partir do
        // topo da âncora; senão desce inteira com a âncora (oráculo ftnobreak)
        if (this.noBreakWrapped()) {
          if (!this.atTop && flowY + t.rows.reduce((a, r) => a + r.height, 0) > this.cur.bodyBottom + 0.5) {
            this.breakColumn();
            flowY = this.y;
          }
        } else if (!this.atTop && r0 && top + r0.height > this.cur.bodyBottom + 0.5) {
          const avail = this.cur.bodyBottom - top;
          const onlyMin = (r0.natural ?? r0.height) <= avail + 0.5;
          const parts = onlyMin || r0.cantSplit ? null : r0.split?.(avail) ?? null;
          if (!(parts && parts[0].height > 0)) {
            this.breakColumn();
            flowY = this.y;
          }
        }
      }
      const nFloats = this.cur.floats.length;
      const nCarry = this.floatCarry.length;
      this.placeFloatingTable(t, fp, this.cur, flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      // cobre linhas de parágrafos JÁ diagramadas antes dela (deslocamento negativo): na
      // passada seguinte entra no início da página e essas linhas a contornam (oráculo ftable2, ft2-form*)
      const box = this.cur.floats.length > nFloats ? this.cur.floats[this.cur.floats.length - 1] : undefined;
      // (posição relativa à página/margem também: o texto antes da âncora a contorna — oráculo ftpage)
      if (blockIdx >= 0 && box) {
        const g = this.cur.geom;
        const hit = this.cur.page.lines.some((l) => /^b\d+$/.test(l.ref) && l.y + l.height > box.y - box.distT + 1 && l.y < box.y + box.h + box.distB - 1
          && box.x + box.w + box.distR > g.marL && box.x - box.distL < g.pageW - g.marR);
        // uma por passada: a posição das seguintes depende do texto que esta empurrar
        if (hit && !this.lateTablesFound.size) this.lateTablesFound.set(blockIdx, { page: this.pages.indexOf(this.cur), flowY });
      }
      // a tabela continua na página seguinte: o parágrafo âncora vai junto e contorna a
      // continuação lá (largura total: fica depois do fim dela) — oráculo ftsplit
      // (posição relativa à página/margem também; lá, abaixo dela, com o "antes" inteiro — oráculo ftvmsplit)
      if (this.floatCarry.length > nCarry && this.col === this.cur.geom.cols.length - 1) { this.breakColumn(); this.carryAnchorGap = true; }
      return;
    }
    this.floatTableGap = false;
    if (this.prev) {
      this.y += this.atTop || this.dropsAfterBeforeTable(this.prev, table) ? 0 : this.prev.after;
    }
    this.assignCellNeighbors(table, this.prev ? { ...(this.prev.styleId ? { styleId: this.prev.styleId } : {}) } : undefined);
    this.prev = null;
    this.firstInDoc = false;
    this.topGapPrevAfter = null;
    const t: TableLayout = layoutTable(this.ctx, table, fr.x, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
    if (blockIdx >= 0) this.pinFloatsOverTable(t, blockIdx);
    this.lastRowEmit = null;
    const headerRows: TableLayout['rows'] = [];
    for (const r of t.rows) { if (r.header) headerRows.push(r); else break; }
    const mergeMoved = new Set<object>();
    /** partes de linhas emitidas e mesclas verticais que atravessam a página */
    const rowEmits: { ri: number; ps: PageState; y: number; h: number; at: number; cut?: number }[] = [];
    const flowMerges: { start: number; end: number; col: number; content: CellContent; off: number; vAlign?: string }[] = [];
    this.flowFills = true;
    t.rows.forEach((row0, ri) => {
      let row = row0;
      // modo 15: as linhas de cabeçalho (repetidas) não ficam sozinhas no pé — se a
      // 1ª linha de dados não puder começar logo depois delas, descem juntas
      // (oráculo hdrrow; nos modos 11/14 ficam e se repetem)
      if (ri === 0 && headerRows.length && headerRows.length < t.rows.length && !this.atTop && this.ctx.fmt.settings.compatibilityMode >= 15) {
        const avail = this.cur.bodyBottom - this.y;
        const hh = headerRows.reduce((a, r) => a + r.height, 0);
        if (hh <= avail + 0.5 && !this.rowCanStart(t.rows[headerRows.length]!, avail - hh)) this.breakColumn();
      }
      // manter com a próxima: se a próxima linha não puder começar nesta página
      // logo depois desta, esta desce junto (oráculo keeptbl)
      if (row.keepNext && !this.atTop && ri + 1 < t.rows.length) {
        const avail = this.cur.bodyBottom - this.y;
        // cadeia de linhas com keepNext: todas ficam com a primeira que não tem
        // (oráculo keepchain)
        let chainH = row.height, k = ri + 1;
        while (k + 1 < t.rows.length && t.rows[k]!.keepNext && chainH + t.rows[k]!.height <= avail + 0.5) { chainH += t.rows[k]!.height; k++; }
        if (chainH <= avail + 0.5 && !this.rowCanStart(t.rows[k]!, avail - chainH)) {
          if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
          this.breakColumn();
          if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
        }
      }
      for (let guard = 0; guard < 500; guard++) {
        // a tabela não contorna: a linha cuja 1ª linha de texto cruzaria um flutuante com
        // quebra (inclusive atrás do texto; do cabeçalho também nos modos ≤ 14) desce para
        // baixo dele (oráculo tblfloat); o resto da linha parte no pé como sempre (corpus t191)
        this.y = this.belowFloats(t.x, t.width, this.y, row.lines.length ? Math.min(row.height, ...row.lines.map((l) => l.y + l.height)) : row.height);
        // notas de rodapé referenciadas nas células desta linha ocupam o pé da página
        // flutuante com quebra que ocupa o pé da página (do rodapé, p.ex.) e cruza a
        // tabela: a linha parte no topo dele, como no pé (oráculo tblfoot)
        const avail = Math.min(this.cur.bodyBottom - this.rowNoteExtra(row), this.floatFloor(t.x, t.width, this.y)) - this.y;
        // fora a última da tabela, a borda que fecharia a página logo abaixo dela
        // também tem de caber (oráculo rowfitbdr)
        const bw = ri < t.rows.length - 1 ? row.breakW ?? 0 : 0;
        // linha que abre a página (a anterior ficou na outra): a faixa de cima é só a
        // borda de cima dela (oráculo contband)
        if (this.atTop && row.topCut && row.height - row.topCut + bw <= avail + 0.5) row = atPageTop(row);
        // (sem folga, como as linhas do corpo — oráculo bodyfit, bf-cf-*)
        if (row.height + bw <= avail + 0.05) break;
        // só a nota não cabe inteira: o começo dela fica com a linha (oráculo fncont)
        if (!this.atTop && this.y + row.height + bw <= Math.min(this.cur.bodyBottom, this.floatFloor(t.x, t.width, this.y)) + 0.05) {
          const cut = this.notePartial(this.rowNoteIds(row), this.y + row.height + bw);
          if (cut) { this.rowNoteCut = cut; break; }
        }
        // não cabe: o Word divide a linha (salvo cantSplit) no fim da última linha de
        // texto que cabe — mas se o CONTEÚDO cabe e só a altura mínima não, a linha desce inteira
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rowEmits.push({ ri, ps: this.cur, y: this.y, h: parts[0].height, at: this.cur.body.length });
          this.emitRow(parts[0]);
          row = parts[1];
        } else if (this.atTop) break; // nem uma linha cabe numa página vazia: coloca assim mesmo
        // a última linha desta página fecha com a borda da divisa
        if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
        this.breakColumn();
        // repete as linhas de cabeçalho da tabela
        if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
      }
      // texto de mescla vertical na 1ª linha dela, na ordem das colunas — se a mescla
      // inteira cabe aqui, sem flutuantes no caminho (oráculo vmorder)
      if (row === row0 || row.cut !== undefined) row = dropMoved(mergeTextFirst(t.rows, ri, row, mergeMoved, (h) => this.y + h <= this.cur.bodyBottom + 0.5 && this.belowFloats(t.x, t.width, this.y, h) === this.y), mergeMoved);
      // mescla vertical que começou em OUTRA página: o texto dela flui pelas partes
      // (topo da mescla em cada página), como célula que parte (oráculo vmsplit)
      let grow = 0;
      for (const mt of row0.mergeText ?? []) {
        const s = rowEmits.find((e) => e.ri === mt.start);
        if (!s || s.ps === this.cur || !mt.content) continue;
        for (const o of [...mt.items, ...mt.lines]) mergeMoved.add(o);
        const off = (mt.band ?? 0) + (mt.marT ?? 0);
        flowMerges.push({ start: mt.start!, end: ri, col: mt.col, content: mt.content, off, ...(mt.vAlign ? { vAlign: mt.vAlign } : {}) });
        // a parte desta página cresce o que faltar ao resto do texto: o corte nas páginas
        // anteriores perde o espaço abaixo da última linha que coube (vms-top)
        // (parte que começa com linha no topo da página: o texto sobe junto — contband)
        let rest: CellContent | null = mt.content, segPs: PageState | null = null, segTop = 0, segBot = 0, segCut = 0;
        for (const e of rowEmits) {
          if (e.ri < mt.start! || e.ps === this.cur || !rest) continue;
          if (e.ps !== segPs) {
            if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
            segPs = e.ps; segTop = e.y; segCut = e.cut ?? 0;
          }
          segBot = e.y + e.h;
        }
        if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
        const hereE = rowEmits.find((e) => e.ri >= mt.start! && e.ps === this.cur);
        const here = hereE?.y ?? this.y;
        const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
        if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (this.y - here + row.height));
      }
      if (row0.mergeText && mergeMoved.size) row = dropMoved(row, mergeMoved);
      rowEmits.push({ ri, ps: this.cur, y: this.y, h: row.height + Math.max(0, grow), at: this.cur.body.length, cut: row.cut ?? 0 });
      this.emitRow(row);
      if (grow > 0.5) this.y += grow;
    });
    this.flowFills = false;
    /** inserções no corpo de cada página (ordem do PDF do Word: texto da mescla na
     *  1ª linha da parte, na ordem das colunas) — aplicadas do fim para o começo */
    const ins: { ps: PageState; at: number; items: PageItem[] }[] = [];
    for (const m of flowMerges) {
      // partes da mescla por página (topo da 1ª parte, fundo da última)
      const segs: { ps: PageState; top: number; bottom: number; at: number; cut: number }[] = [];
      for (const e of rowEmits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at, cut: e.cut ?? 0 });
      }
      // posição da coluna da mescla entre as células da 1ª linha (1ª parte)
      // (os fundos de mescla da linha não foram gravados com ela: entram no fim, antes)
      const colAt = (t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0) - (t.rows[m.start]?.mergeFills?.length ?? 0);
      let c: CellContent | null = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part: CellContent = c, rest: CellContent | null = null;
        if (k < segs.length - 1) {
          const sp = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp) [part, rest] = sp; else { part = { items: [], lines: [], height: 0 }; rest = c; }
        }
        // alinhamento vertical da célula vale dentro de CADA parte (vms-center)
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === 'center' ? free / 2 : m.vAlign === 'bottom' ? free : 0);
        ins.push({ ps: sg.ps, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
        c = rest;
      });
    }
    // fundo das mesclas verticais: uma faixa por página, do topo ao pé da parte (o Word pinta
    // também a continuação na página seguinte); a última termina onde terminaria o retângulo
    // inteiro. Entra antes de tudo da 1ª linha da parte (oráculo vmshd; corpus t15)
    t.rows.forEach((r0, start) => {
      for (const f of r0.mergeFills ?? []) {
        const short = t.rows.slice(start, f.end + 1).reduce((a, r) => a + r.height, 0) - f.item.h;
        const segs: { ps: PageState; top: number; bottom: number; at: number }[] = [];
        for (const e of rowEmits) {
          if (e.ri < start || e.ri > f.end) continue;
          const last = segs[segs.length - 1];
          if (last && last.ps === e.ps) last.bottom = e.y + e.h;
          else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, at: e.at });
        }
        segs.forEach((sg, k) => {
          const h = sg.bottom - sg.top - (k === segs.length - 1 ? short : 0);
          if (h > 0) ins.push({ ps: sg.ps, at: sg.at, items: [{ ...f.item, y: sg.top, h }] });
        });
      }
    });
    for (const n of ins.sort((a, b) => b.at - a.at)) n.ps.body.splice(n.at, 0, ...n.items);
    // o parágrafo seguinte vê a marca de fim de linha como anterior (contextual)
    this.prev = this.rowEndPrev();
  }

  /** Topo do flutuante com quebra abaixo de `y` que cruza [x, x+w] e vai até o pé do corpo
   *  (o conteúdo da tabela não passa dele nesta página); sem nenhum, o pé do corpo. */
  private floatFloor(x: number, w: number, y: number): number {
    const fls = this.cur.floats;
    let floor = this.cur.bodyBottom;
    for (const f of fls) {
      const top = f.y - f.distT;
      if (f.wrap === 'none' || top <= y + 0.5 || f.y + f.h + f.distB < this.cur.bodyBottom - 0.5) continue;
      if (x + w > f.x - f.distL && x < f.x + f.w + f.distR) floor = Math.min(floor, top);
    }
    return floor;
  }

  /** Topo livre para uma faixa [x, x+w] × [y, y+h] que não contorna flutuantes (linha de tabela). */
  private belowFloats(x: number, w: number, y: number, h: number): number {
    const fls = this.cur.floats;
    for (let k = 0; k < 8; k++) {
      const hit = fls.find((f) => f.wrap !== 'none' && y + h > f.y - f.distT + 0.5 && y < f.y + f.h + f.distB - 0.5
        && x + w > f.x - f.distL && x < f.x + f.w + f.distR);
      if (!hit) break;
      y = hit.y + hit.h + hit.distB;
    }
    return y;
  }

  /** Topo mínimo de um flutuante com quebra relativo ao texto: corpo (modo 15) ou página (≤ 14). */
  private floatMinY(ps: PageState): number {
    return this.ctx.fmt.settings.compatibilityMode >= 15 ? ps.bodyTop : 0;
  }

  /** flutuantes com y já decidido (presos antes do parágrafo âncora) */
  private pinnedFloats = new Map<Run, { ps: PageState; y: number }>();

  /**
   * Flutuante com quebra do parágrafo SEGUINTE à tabela, relativo a ele e com
   * deslocamento negativo que cai sobre a tabela (oráculo toptbl): o Word o posiciona
   * pela posição INICIAL do parágrafo (logo após a tabela), preso no topo da margem;
   * a tabela desce para baixo dele e o objeto fica onde foi posto, mesmo que o
   * parágrafo desça com a tabela.
   */
  private pinFloatsOverTable(t: TableLayout, blockIdx: number): void {
    const nb = this.full.blocks[blockIdx + 1];
    if (!nb || nb.type !== 'paragraph') return;
    const runs = nb.paragraph.runs.filter((run) => {
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      const anc = floatAnchor(run);
      return !!fl && !!anc && WRAPPING.has(anc.wrap ?? '') && !anc.simplePos && (anc.posV.relativeFrom ?? 'paragraph') === 'paragraph'
        && anc.posV.align === undefined && anc.posV.pct === undefined && (anc.posV.offset ?? 0) < 0;
    });
    if (!runs.length) return;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    const top = this.y;
    // 1ª posição do parágrafo: logo após a tabela (+ o espaço antes dele; o anterior é a marca de fim de linha)
    const q = this.ctx.pure(() => prepareParagraph(this.ctx, nb.paragraph, {}));
    let before = q.beforeAuto ? 280 : q.spaceBefore;
    if (q.contextual && q.styleId === this.rowEndNeighbor().styleId) before = 0;
    const anchorTop0 = top + H + this.collapse(0, before);
    const fr = this.colFrame();
    const g = this.cur.geom;
    let newTop = top;
    for (const run of runs) {
      const anc = floatAnchor(run)!;
      const w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
      const h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
      const y = Math.max(this.floatMinY(this.cur), anchorTop0 + (anc.posV.offset ?? 0));
      const hRef = horizRef(anc.posH.relativeFrom ?? 'column', g, fr.x, fr.w);
      const x = alignPos(anc.posH.align, anc.posH.offset, hRef.x, hRef.w, w, anc.posH.pct, g.pageW, anc.effectExtent?.l, anc.effectExtent?.r);
      // justo/através: vale a caixa do polígono de contorno (oráculo wrappoly)
      const wb = anc.wrap === 'tight' || anc.wrap === 'through' ? anc.wrapBox : undefined;
      const by0 = wb ? y + h * wb.y0 : y, by1 = wb ? y + h * wb.y1 : y + h;
      const bx0 = wb ? x + w * wb.x0 : x, bx1 = wb ? x + w * wb.x1 : x + w;
      const overV = by0 - (anc.distT ?? 0) < top + H && by1 + (anc.distB ?? 0) > top;
      const overH = bx0 - (anc.distL ?? 0) < t.x + t.width && bx1 + (anc.distR ?? 0) > t.x;
      if (!overV || !overH) continue;
      this.pinnedFloats.set(run, { ps: this.cur, y });
      newTop = Math.max(newTop, by1 + (anc.distB ?? 0));
    }
    if (newTop > top) this.y = newTop;
  }

  /**
   * Tabela flutuante (oráculo ftable): âncoras página/margem/texto; tblpX/Y
   * ou tblpX/YSpec (left/center/right, top/center/bottom). No modo 15 a borda
   * externa fica na posição; nos antigos, o TEXTO da 1ª célula (como tblInd).
   * `t` foi diagramada com frameX = 0; os itens são deslocados para a posição.
   */
  private placeFloatingTable(t: TableLayout, fp: NonNullable<TableBlock['tblPr']>['tblpPr'] & object, ps: PageState, flowY: number, colX: number, colW: number, out: PageItem[], yOrigin: number, wrap: boolean, split = false): void {
    const g = ps.geom;
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    const H = t.rows.reduce((a, r) => a + r.height, 0);
    // caixa de referência (o que se alinha): modo 15 = borda externa; antigos = texto —
    // sem as margens da 1ª e da última célula (t.x = −a da esquerda; oráculo ftcellmar)
    const refW = legacy ? Math.max(0, t.width + t.x - (t.effR ?? 108)) : t.width;
    const [aL, aR] = fp.horzAnchor === 'page' ? [0, g.pageW] : fp.horzAnchor === 'margin' ? [g.marL, g.pageW - g.marR] : [colX, colX + colW];
    const xs = fp.tblpXSpec;
    const refX = xs === 'center' ? aL + (aR - aL - refW) / 2 : xs === 'right' || xs === 'outside' ? aR - refW : aL + (xs ? 0 : fp.tblpX ?? 0);
    const [aT, aB] = fp.vertAnchor === 'page' ? [0, g.pageH] : fp.vertAnchor === 'margin' ? [g.marT, g.pageH - g.marB] : [flowY, flowY];
    const ys = fp.tblpYSpec;
    let top = ys === 'center' ? aT + (aB - aT - H) / 2 : ys === 'bottom' ? aB - H : aT + (ys ? 0 : fp.tblpY ?? 0);
    // no cabeçalho/rodapé a tabela não sai pelo pé da página: sobe até caber, sem
    // afastar o texto de lá (corpus t43; oráculo hfclamp)
    if (this.inHf && top + H > g.pageH) { top = Math.max(0, g.pageH - H); wrap = false; }
    this.emitFloatRows(t, t.rows, fp, ps, refX, top, out, yOrigin, wrap, split);
  }

  /** Linhas de uma tabela flutuante a partir de `top`. Com `split`, as que não
   *  cabem na página seguem para o topo da próxima (o texto as contorna lá). */
  private emitFloatRows(t: TableLayout, rows: TableLayout['rows'], fp: NonNullable<TableBlock['tblPr']>['tblpPr'] & object, ps: PageState, refX: number, top: number, out: PageItem[], yOrigin: number, wrap: boolean, split: boolean): void {
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    let y = top;
    let n = 0;
    rows = [...rows];
    let fl = split ? this.floatFlow.get(t) : undefined;
    if (split && !fl && t.rows.some((r) => r.mergeText?.length)) {
      fl = { idx: new Map(t.rows.map((r, k) => [r, k])), moved: new Set(), seen: new Set(), emits: [], merges: [] };
      this.floatFlow.set(t, fl);
    }
    const vmMoved: Set<object> = fl?.moved ?? new Set();
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i]!;
      const ri = fl?.idx.get(row);
      // continuação na página nova: a 1ª linha (inteira) só com a borda de cima dela (oráculo contband)
      if (split && n === 0 && i === 0 && row !== t.rows[0] && row.topCut && y + row.height - row.topCut <= ps.bodyBottom + 0.5) {
        row = atPageTop(row);
        rows[i] = row;
      }
      // fora a última, a borda que fecharia a página logo abaixo dela também tem de
      // caber, como no fluxo; sem folga (oráculos rowfitbdr, ftrowbdr, bodyfit)
      const bw = i < rows.length - 1 ? row.breakW ?? 0 : 0;
      let cutHere = false;
      if (split && !this.noBreakWrapped() && y + row.height + bw > ps.bodyBottom + 0.05) {
        // não cabe: divide a linha (salvo cantSplit / só a altura mínima) como no fluxo
        const avail = ps.bodyBottom - y;
        const onlyMin = (row.natural ?? row.height) + bw <= avail + 0.05;
        const parts = onlyMin || row.cantSplit ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rows.splice(i, 1, parts[0], parts[1]);
          cutHere = true;
          if (fl && ri !== undefined) { fl.idx.set(parts[0], ri); fl.idx.set(parts[1], ri); }
          row = parts[0];
        } else if (n > 0) break;
      }
      // texto da mescla vertical na 1ª linha dela, na ordem das colunas, se a mescla inteira
      // fica nesta página (como no fluxo — oráculo vmorder; corpus t43, t70)
      const rk = t.rows.indexOf(row);
      if (rk >= 0) row = dropMoved(mergeTextFirst(t.rows, rk, row, vmMoved, (h) => !split || y + h <= ps.bodyBottom + 0.5), vmMoved);
      else if (vmMoved.size) row = dropMoved(row, vmMoved);
      // mescla vertical que começou em OUTRA página: o texto sai da última linha e flui
      // pelas partes; a parte desta página cresce o que faltar (como no fluxo — vmsplit)
      let grow = 0;
      if (fl && ri !== undefined) {
        for (const mt of t.rows[ri]!.mergeText ?? []) {
          if (fl.seen.has(mt)) continue;
          const s = fl.emits.find((e) => e.ri === mt.start);
          if (!s || s.ps === ps || !mt.content) continue;
          fl.seen.add(mt);
          for (const o of [...mt.items, ...mt.lines]) fl.moved.add(o);
          const off = (mt.band ?? 0) + (mt.marT ?? 0);
          fl.merges.push({ start: mt.start!, end: ri, col: mt.col, content: mt.content, off, ...(mt.vAlign ? { vAlign: mt.vAlign } : {}) });
          let rest: CellContent | null = mt.content, segPs: PageState | null = null, segTop = 0, segBot = 0, segCut = 0;
          for (const e of fl.emits) {
            if (e.ri < mt.start! || e.ps === ps || !rest) continue;
            if (e.ps !== segPs) {
              if (segPs) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
              segPs = e.ps; segTop = e.y; segCut = e.cut ?? 0;
            }
            segBot = e.y + e.h;
          }
          if (segPs && rest) rest = splitContent(rest, segBot - segTop - (off - segCut))?.[1] ?? rest;
          const hereE = fl.emits.find((e) => e.ri >= mt.start! && e.ps === ps);
          const here = hereE?.y ?? y;
          const hereCut = hereE ? hereE.cut ?? 0 : row.cut ?? 0;
          if (rest) grow = Math.max(grow, off - hereCut + rest.height + (mt.band ?? 0) - (y - here + row.height));
        }
        if (fl.moved.size) row = dropMoved(row, fl.moved);
        fl.emits.push({ ri, ps, y, h: row.height + Math.max(0, grow), out, at: out.length, yOrigin, refX, cut: row.cut ?? 0 });
      }
      for (const it of row.items) out.push(shiftItem(it, y - yOrigin, refX));
      for (const it of row.borderItems) out.push(shiftItem(it, y - yOrigin, refX));
      for (const l of row.lines) ps.page.lines.push({ ...l, x: l.x + refX, y: l.y + y, baseline: l.baseline + y, ...(l.chars ? { chars: l.chars.map((c) => ({ ...c, x: c.x + refX })) } : {}) });
      if (row.cells && !this.inHf) for (const c of row.cells) (ps.page.cells ??= []).push({ ref: c.ref, x: c.x + refX, y: y + (c.dy ?? 0), w: c.w, h: c.h ?? row.height, span: c.span });
      y += row.height + (grow > 0.5 ? grow : 0);
      n++;
      // linha partida: o resto vai inteiro para a página seguinte (oráculo ftwidow)
      if (cutHere) break;
    }
    if (wrap) {
      ps.floats.push({
        // caixa = bordas externas (modo antigo: a grade fica na margem da célula antes do texto)
        x: refX + (legacy ? t.x - (t.borderLeft ?? 0) / 2 : 0), y: top, w: t.width + (legacy ? (t.borderLeft ?? 0) : 0), h: y - top, wrap: 'square',
        distL: fp.leftFromText ?? 0, distR: fp.rightFromText ?? 0, distT: fp.topFromText ?? 0, distB: fp.bottomFromText ?? 0,
      });
    }
    if (n < rows.length) this.floatCarry.push({ t, rows: rows.slice(n), fp, refX });
    else if (fl) { this.floatFlow.delete(t); this.flowFloatMerges(t, fl); }
  }

  /** Texto das mesclas verticais de uma tabela flutuante que partiu: cada parte no topo
   *  da mescla na sua página (1ª parte na posição da coluna entre as células) */
  private flowFloatMerges(t: TableLayout, fl: NonNullable<ReturnType<Engine['floatFlow']['get']>>): void {
    const ins: { out: PageItem[]; at: number; items: PageItem[] }[] = [];
    for (const m of fl.merges) {
      const segs: { ps: PageState; top: number; bottom: number; out: PageItem[]; at: number; yOrigin: number; refX: number; cut: number }[] = [];
      for (const e of fl.emits) {
        if (e.ri < m.start || e.ri > m.end) continue;
        const last = segs[segs.length - 1];
        if (last && last.ps === e.ps) last.bottom = e.y + e.h;
        else segs.push({ ps: e.ps, top: e.y, bottom: e.y + e.h, out: e.out, at: e.at, yOrigin: e.yOrigin, refX: e.refX, cut: e.cut ?? 0 });
      }
      const colAt = t.rows[m.start]?.mergeAt?.find((a) => a.col === m.col)?.at ?? 0;
      let c: CellContent | null = m.content;
      segs.forEach((sg, k) => {
        if (!c) return;
        let part: CellContent = c, rest: CellContent | null = null;
        if (k < segs.length - 1) {
          const sp = splitContent(c, sg.bottom - sg.top - (m.off - sg.cut));
          if (sp) [part, rest] = sp; else { part = { items: [], lines: [], height: 0 }; rest = c; }
        }
        const free = Math.max(0, sg.bottom - sg.top - (m.off - sg.cut) - part.height);
        const dy = sg.top + m.off - sg.cut + (m.vAlign === 'center' ? free / 2 : m.vAlign === 'bottom' ? free : 0);
        ins.push({ out: sg.out, at: sg.at + (k === 0 ? colAt : 0), items: part.items.map((it) => shiftItem(it, dy - sg.yOrigin, sg.refX)) });
        for (const l of part.lines) sg.ps.page.lines.push({ ...l, x: l.x + sg.refX, y: l.y + dy, baseline: l.baseline + dy, ...(l.chars ? { chars: l.chars.map((ch) => ({ ...ch, x: ch.x + sg.refX })) } : {}) });
        c = rest;
      });
    }
    for (const n of ins.sort((a, b) => b.at - a.at)) n.out.splice(n.at, 0, ...n.items);
  }

  /** w:doNotBreakWrappedTables: tabelas flutuantes não partem (o modo 15 ignora — oráculo ftnobreak) */
  private noBreakWrapped(): boolean {
    return this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat['doNotBreakWrappedTables'];
  }

  /** Continuação de tabelas flutuantes divididas: topo do corpo da página nova. */
  private placeFloatCarry(): void {
    const carry = this.floatCarry;
    this.floatCarry = [];
    for (const c of carry) {
      const items: PageItem[] = [];
      // linhas de cabeçalho (w:tblHeader) repetem no topo da continuação, como no fluxo (oráculo tblhdr2)
      const hdr: TableLayout['rows'] = [];
      for (const r of c.t.rows) { if (r.header) hdr.push(r); else break; }
      const rows = hdr.length && hdr.length < c.t.rows.length && !hdr.includes(c.rows[0]!) ? [...hdr, ...c.rows] : c.rows;
      this.emitFloatRows(c.t, rows, c.fp, this.cur, c.refX, this.cur.bodyTop, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
    }
  }

  /** A linha pode começar no espaço dado (inteira, ou dividida se puder)? */
  private rowCanStart(row: TableLayout['rows'][number], avail: number): boolean {
    if (row.height <= avail + 0.5) return true;
    if (row.cantSplit || (row.natural ?? row.height) <= avail + 0.5) return false;
    const parts = row.split?.(avail) ?? null;
    return !!parts && parts[0].height > 0;
  }

  private emitRow(row: TableLayout['rows'][number]): void {
    // notas de rodapé de referências em células (oráculo notes)
    const ids = this.rowNoteIds(row);
    if (ids.length) this.reserveNotes(ids, this.rowNoteCut);
    this.rowNoteCut = null;
    this.lastRowEmit = { row, y: this.y };
    const skip = this.flowFills && row.mergeFills ? new Set<PageItem>(row.mergeFills.map((f) => f.item)) : null;
    for (const it of row.items) if (!skip?.has(it)) this.cur.body.push(shiftItem(it, this.y));
    for (const it of row.borderItems) this.cur.body.push(shiftItem(it, this.y));
    for (const l of row.lines) this.cur.page.lines.push({ ...l, y: l.y + this.y, baseline: l.baseline + this.y });
    if (row.cells && !this.inHf) for (const c of row.cells) (this.cur.page.cells ??= []).push({ ref: c.ref, x: c.x, y: this.y + (c.dy ?? 0), w: c.w, h: c.h ?? row.height, span: c.span });
    this.y += row.height;
    this.atTop = false;
    this.noteColContent(this.y);
  }

  // ───────────────────────── objetos flutuantes ─────────────────────────

  /** Quadro de uma linha descontando floats com contorno (wrap) que a cruzam. */
  private wrapFrame(frame: { left: number; right: number }, frameX: number, y: number, lineH = 240, ps: PageState = this.cur): WrapFrame {
    const floats = ps.floats;
    if (!floats.length) return frame;
    const { left, right } = frame;
    // recuos que se cruzam (direita antes da esquerda: o Word põe um caractere por
    // linha): a linha não tem largura própria e o vão é medido na coluna inteira —
    // a faixa do cabeçalho e a caixa ao lado empurram a linha (oráculo hfgroup)
    const crossed = right < left;
    let tl = left, tr = right;
    if (crossed) {
      const col = this.colFrame();
      if (Math.abs(frameX - col.x) < 0.5) { tl = Math.min(left, 0); tr = Math.max(left, col.w); } else tr = left;
    }
    let skipTo: number | undefined;
    // intervalos livres da linha: o quadro menos a faixa de cada flutuante que a cruza
    let free: [number, number][] = [[tl, tr]];
    let hit = false;
    let minBottom = Infinity;
    for (const f of floats) {
      if (f.wrap !== 'square' && f.wrap !== 'tight' && f.wrap !== 'through' && f.wrap !== 'topAndBottom') continue;
      if (f.bodyOnly && this.inHf) continue;
      const top = f.y - f.distT, bottom = f.y + f.h + f.distB;
      // (o Word compara em twips inteiros — 0,02pt de sobreposição não desvia;
      // 1 twip (moldura com y=1, oráculo frames) e 0,15pt desviam)
      if (y + lineH <= top + 0.5 || y >= bottom - 0.5) continue;
      // contorno não retangular: a projeção do polígono na faixa da linha (justo: do
      // mais à esquerda ao mais à direita; através: os pedaços, com os vãos de dentro)
      let parts: [number, number][] | undefined;
      if (f.poly) {
        const band = polyBandIntervals(f.poly, y, y + lineH);
        if (!band.length) continue;
        const hull: [number, number][] = [[band[0]![0], band[band.length - 1]![1]]];
        parts = (f.wrap === 'through' ? band : hull).map(([a, b]): [number, number] => [a - f.distL - frameX, b + f.distR - frameX]);
      }
      const fl = parts ? parts[0]![0] : f.x - f.distL - frameX, fr = parts ? parts[parts.length - 1]![1] : f.x + f.w + f.distR - frameX;
      if (fr <= tl || fl >= tr) continue;
      if (f.wrap === 'topAndBottom') { skipTo = Math.max(skipTo ?? 0, bottom); continue; }
      hit = true;
      minBottom = Math.min(minBottom, bottom);
      // wrapText: o texto passa só de um lado — o outro também fica bloqueado
      // (largest: o vão maior; oráculo wrapsides)
      const side = f.side ?? 'bothSides';
      let blocks: [number, number][] = parts && side === 'bothSides' ? parts : [[fl, fr]];
      if (side === 'left') blocks = [[fl, Infinity]];
      else if (side === 'right') blocks = [[-Infinity, fr]];
      else if (side === 'largest') blocks = [fl - tl >= tr - fr ? [fl, Infinity] : [-Infinity, fr]];
      for (const [bl, bh] of blocks) {
        const next: [number, number][] = [];
        for (const [a, b] of free) {
          if (bh <= a || bl >= b) { next.push([a, b]); continue; }
          if (bl > a) next.push([a, bl]);
          if (bh < b) next.push([bh, b]);
        }
        free = next;
      }
    }
    if (hit) {
      // o intervalo mais largo (empate: o da esquerda) — vários flutuantes na mesma
      // linha: a linha vai para o vão livre, não para baixo deles (oráculo hfmix)
      // vão com menos de 18pt não recebe texto (oráculo wrapsides, ws-a-*)
      // o vão conta só DENTRO da coluna: recuo negativo não abre espaço ao lado do
      // flutuante (oráculo ftnegind)
      const col = this.colFrame();
      const cR = Math.abs(frameX - col.x) < 0.5 ? col.w : Infinity, cL = cR === Infinity ? -Infinity : 0;
      // (o vão conta até a margem da coluna: o recuo do parágrafo não o estreita — oráculo gapind)
      const ext = (a: number, b: number): [number, number] => cR === Infinity ? [a, b] : [a <= tl + 0.5 ? Math.min(a, cL) : a, b >= tr - 0.5 ? Math.max(b, cR) : b];
      free = free.filter(([a, b]) => { const [ea, eb] = ext(a, b); return Math.min(eb, cR) - Math.max(ea, cL) >= MIN_GAP; });
      let best: [number, number] | undefined;
      for (const iv of free) if (!best || iv[1] - iv[0] > best[1] - best[0]) best = iv;
      // sem espaço útil ao lado: a linha desce até o fim do 1º objeto que a bloqueia
      if (!best) skipTo = Math.max(skipTo ?? 0, minBottom);
      // objeto no meio: o texto ocupa os vãos da esquerda para a direita (wrapsides)
      else if (skipTo === undefined) return crossed ? { left, right } : { left: best[0], right: best[1], gap: true, ...(free.length > 1 ? { segs: free } : {}) };
    }
    if (skipTo !== undefined) return { ...frame, skipTo };
    return { left, right };
  }

  /**
   * Vão onde começa a linha: com o objeto no meio dela, o 1º vão (da esquerda)
   * em que a próxima palavra cabe — vão estreito demais fica vazio (oráculo
   * wrapsides). Nenhum cabe: o mais largo, sozinho (k = fim).
   */
  private pickSeg(br: LineBreaker, frame: WrapFrame): { k: number; f: { left: number; right: number; gap?: boolean; next?: { left: number; right: number } } } {
    if (!frame.segs) return { k: -1, f: frame };
    const need = br.peekWordWidth();
    for (let k = 0; k < frame.segs.length; k++) {
      const [a, b] = frame.segs[k]!;
      const nx = frame.segs[k + 1];
      if (b - a + 0.01 >= need) return { k, f: { left: a, right: b, gap: true, ...(nx ? { next: { left: nx[0], right: nx[1] } } : {}) } };
    }
    return { k: frame.segs.length, f: { left: frame.left, right: frame.right, gap: true } };
  }

  /** linhas dos vãos seguintes da mesma linha (depois do vão `k`) */
  private moreSegs(br: LineBreaker, frame: WrapFrame, k: number, last: Line, put: (l: Line) => void): Line {
    if (!frame.segs) return last;
    // (linha que acabou num tab além do vão: o resto não vai para o vão seguinte — tabgap)
    // (linha cujo tab atravessou o flutuante: o vão seguinte já foi usado — ftrtabs)
    for (let j = k + 1 + (last.spanned ? 1 : 0); j < frame.segs.length && !br.done() && !last.breakAfter && !last.clear && last.gapTab !== 'break'; j++) {
      const [a, b] = frame.segs[j]!;
      if (b - a + 0.01 < br.peekWordWidth()) continue;
      const nx = frame.segs[j + 1];
      last = br.next({ left: a, right: b, gap: true, ...(nx ? { next: { left: nx[0], right: nx[1] } } : {}) });
      put(last);
      if (last.spanned) j++;
    }
    return last;
  }

  /** Ambiente do texto da caixa: fundo escuro (cor automática branca) e a cor do
   *  wps:style/a:fontRef para o texto sem cor (medido: estilo de forma "preenchido"). */
  private tbEnv(tb: DrawingTextbox): Pick<ParaEnv, 'darkBackground' | 'defaultColor'> {
    const theme = this.ctx.fmt.theme;
    const fc = tb.fontColor ? resolveDrawingColor(tb.fontColor, theme) : undefined;
    // só o preenchimento SÓLIDO escuro clareia o texto automático (medido: degradê e padrão não)
    const s = tb.shape;
    const solid = s && !s.gradient && !s.pattern && !s.blip && !s.fillRef ? s.fill : undefined;
    return { darkBackground: isDark(resolveDrawingColor(solid, theme)), ...(fc ? { defaultColor: fc } : {}) };
  }

  /** cadeias de caixas vinculadas (montadas na 1ª caixa que precisa) */
  private chains: Map<DrawingTextbox, TextboxChain> | null = null;
  /** conteúdo de cada caixa de uma cadeia (diagramado uma vez por passada) */
  private chainSlices = new Map<TextboxChain, Map<DrawingTextbox, CellContent>>();

  private chainOf(tb: DrawingTextbox): TextboxChain | undefined {
    if (tb.story === undefined && !tb.link) return undefined;
    this.chains ??= indexChains(this.full);
    return this.chains.get(tb);
  }

  /**
   * Pedaço do conteúdo da cadeia que cabe na caixa `tb`: o conteúdo da 1ª caixa é
   * diagramado na largura de cada caixa, em ordem; o corte (o mesmo da linha de tabela
   * partida: viúvas/órfãs, espaço depois) manda o resto para a seguinte, que quebra de
   * novo na largura dela — o parágrafo partido continua sem recuo da 1ª linha e sem
   * espaço antes. A última fica com tudo o que sobra (transborda). Oráculo txbxlink.
   */
  private chainSlice(chain: TextboxChain, tb: DrawingTextbox, env0: ParaEnv): CellContent {
    let slices = this.chainSlices.get(chain);
    if (!slices) {
      const out = new Map<DrawingTextbox, CellContent>();
      slices = out;
      this.chainSlices.set(chain, out);
      const theme = this.ctx.fmt.theme;
      const head = chain.members[0]!;
      let rem: Block[] = head.blocks ?? head.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
      let map = rem.map((_, i) => i);
      let cont = 0, rows = 0;
      const empty = (): CellContent => ({ items: [], lines: [], height: 0 });
      chain.members.forEach((m, k) => {
        if (!rem.length) { out.set(m, empty()); return; }
        const fr = tbFrame(m, theme, m.widthTwips, m.heightTwips);
        const env: ParaEnv = { ...env0, ...this.tbEnv(m) };
        const blocks = rem, curMap = map, curCont = cont, curRows = rows;
        const c = this.ctx.pure(() => this.layoutStatic(blocks, 0, Math.max(1, fr.iw), env, 'txbx'));
        // a 1ª linha da continuação não é a 1ª do parágrafo (viúvas/órfãs)
        const ci = curCont ? c.paras?.get('txbx/b0') : undefined;
        if (ci) c.paras!.set('txbx/b0', { ...ci, lines: ci.lines + 1 });
        let slice = c;
        rem = [];
        if (k < chain.members.length - 1) {
          let parts = splitContent(c, fr.ih);
          // nem a 1ª linha coube: a caixa fica vazia e tudo segue
          if (!parts) { out.set(m, empty()); rem = blocks; return; }
          let cut = parts[0].height;
          let moved = c.lines.filter((l) => l.y >= cut - 0.01);
          let first = moved.length ? moved.reduce((a, b) => (b.y < a.y ? b : a)) : undefined;
          // corte numa tabela: as linhas dela que não couberam inteiras vão para a próxima
          // caixa (a linha partida desce inteira — senão a parte de cima sairia duas vezes)
          let row = first ? topRowOf(first.ref) : -1;
          if (first && row >= 0) {
            const jt = topBlockOf(first.ref), r0 = row;
            const nr = c.nest?.find((n) => n.lines.some((l) => topBlockOf(l.ref) === jt && topRowOf(l.ref) === r0));
            if (nr && nr.top < cut - 0.01) {
              const p2 = nr.top > 0.5 ? splitContent(c, nr.top) : null;
              if (!p2) { out.set(m, empty()); rem = blocks; return; }
              parts = p2;
              cut = p2[0].height;
              moved = c.lines.filter((l) => l.y >= cut - 0.01);
              first = moved.reduce((a, b) => (b.y < a.y ? b : a));
              row = topRowOf(first.ref);
            }
          }
          if (first) {
            slice = { ...parts[0], height: cut };
            const j = Math.max(0, topBlockOf(first.ref));
            const off = /^[^/]+\/b\d+$/.test(first.ref) ? first.start : 0;
            map = curMap.slice(j);
            const pb = blocks[j];
            cont = 0; rows = 0;
            if (off > 0 && pb?.type === 'paragraph') {
              cont = (j === 0 ? curCont : 0) + off;
              rem = [{ type: 'paragraph', paragraph: sliceParagraphFrom(pb.paragraph, off) }, ...blocks.slice(j + 1)];
            } else if (row > 0 && pb?.type === 'table') {
              rows = (j === 0 ? curRows : 0) + row;
              rem = [{ ...pb, rows: pb.rows.slice(row) }, ...blocks.slice(j + 1)];
            } else {
              rem = blocks.slice(j);
            }
          }
        }
        out.set(m, { ...slice, lines: remapLines(slice.lines, curMap, curCont, curRows) });
      });
    }
    return slices.get(tb) ?? { items: [], lines: [], height: 0 };
  }

  private placeFloats(p: PreparedPara, ps: PageState, colX: number, colW: number, paraTop: number, flowItems: PageItem[], yOrigin: number, paraRef?: number): void {
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      if (!fl || this.prePlaced.has(run)) continue;
      if (this.onlyTextFloats && !followsText(floatAnchor(run))) continue;
      this.placeFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin, undefined, paraRef);
    }
  }

  private placeFloat(run: Run, ps: PageState, colX: number, colW: number, paraTop: number, flowItems: PageItem[], yOrigin: number, clampBottom?: number,
    /** topo do PARÁGRAFO como referência vertical (antes do "antes" que exceda o
     *  "depois" do anterior — oráculo anchorbefore); a linha usa paraTop */
    paraRef?: number): FloatReceipt {
    const g = ps.geom;
    // imagem flutuante oculta (Painel de Seleção, docPr hidden): não desenha nem
    // afasta o texto; a em linha continua (oráculo pichidden)
    // caixa de texto, forma ou grupo oculto: idem (oráculo txbxhide)
    if ((run.image?.floating && run.image.format?.docPr.hidden) || run.textbox?.hidden || run.shape?.hidden || run.group?.hidden) {
      return { ps, target: [], zobj: { z: 0, seq: this.zSeq++, items: [] }, obj: { run, x: 0, y: 0, w: 0, h: 0, layer: 'front', hf: this.inHf } };
    }
    const anchor: DrawingAnchor | undefined = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
    let w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
    let h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
    // modo 15: "atrás do texto" só sem contorno; com contorno (quadrado, justo,
    // através, em cima e embaixo) o objeto fica na camada da frente, na ordem do
    // relativeHeight — no corpo e no cabeçalho. Modos ≤ 14: o behindDoc vale sempre (oráculo hfgroup)
    const wrapsText = !!anchor && anchor.wrap !== 'none';
    const behind = !(wrapsText && this.ctx.fmt.settings.compatibilityMode >= 15) && (!!anchor?.behindDoc || !!run.image?.behindDoc || !!run.textbox?.behindDoc);
    // conteúdo da caixa de texto (altura automática)
    let tbContent: CellContent | null = null;
    /** diagramação final do conteúdo da caixa já no lugar: flutuantes DENTRO dela
     *  ficam relativos à caixa (antes iam para a origem da página) */
    let tbFinal: ((bx: number, by: number) => CellContent) | null = null;
    const chain = run.textbox ? this.chainOf(run.textbox) : undefined;
    if (run.textbox && chain) {
      // caixa de uma cadeia vinculada: o pedaço do conteúdo que cabe nela (oráculo txbxlink)
      tbContent = this.chainSlice(chain, run.textbox, { field: this.fieldValue(ps), ...(this.inHf ? { hf: true } : {}) });
    } else if (run.textbox) {
      const tb = run.textbox;
      // margens e largura no referencial do TEXTO (direção vertical gira as margens)
      const fr = tbFrame(tb, this.ctx.fmt.theme, w, h);
      const ins = fr.ins;
      const blocks: Block[] = tb.blocks ?? tb.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
      const env: ParaEnv = { field: this.fieldValue(ps), ...this.tbEnv(tb), ...(this.inHf ? { hf: true } : {}) };
      let inner = fr.iw;
      const fi = FRAME_INFO.get(tb);
      if (fi?.autoWidth) {
        // moldura sem largura: a da linha mais longa, quebrando na largura da coluna
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, colW, env, 'txbx'));
        // (linha + recuo do lado em que está encostada; centralizada: só a linha)
        w = inner = Math.max(1, probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, colW - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0));
      }
      if (tb.noWrap) {
        // texto sem quebra: mede a linha mais longa (sem posicionar nada na página);
        // com ajuste automático a caixa toma essa largura — caixa de uma linha só (medido no Word)
        const probe = this.ctx.pure(() => this.layoutStatic(blocks, 0, 31680, env, 'txbx'));
        // (linha + recuo do lado em que está encostada; centralizada: só a linha)
        const natural = probe.lines.reduce((m, l) => {
          const side = Math.min(l.x, 31680 - l.x - l.width);
          return Math.max(m, l.width + (side < 2880 ? side : 0));
        }, 0);
        if (tb.autoFit) { w = natural + ins.l + ins.r; inner = natural; } else inner = Math.max(inner, natural);
      }
      const iw = Math.max(1, inner);
      tbContent = this.ctx.pure(() => this.layoutStatic(blocks, 0, iw, env, 'txbx'));
      // (texto vertical: girado na pintura; flutuantes dentro dele ficam na origem)
      if (!fr.rot) {
        tbFinal = (bx, by) => {
          const prevDx = this.staticDx;
          this.staticDx = bx + ins.l;
          try { return this.layoutStatic(blocks, 0, iw, env, 'txbx', ps, by + ins.t); } finally { this.staticDx = prevDx; }
        };
      }
      // ajuste automático: a altura do texto vira a altura da caixa (o cy gravado pode estar
      // desatualizado); no texto vertical, a LARGURA (oráculo txbxvert)
      if (tb.autoFit && fr.rot) w = verticalHeight(tbContent) + ins.t + ins.b;
      else if (tb.autoFit) h = tbContent.height + ins.t + ins.b;
      if (fi) h = fi.hRule === 'exact' ? fi.h : fi.hRule === 'atLeast' ? Math.max(fi.h, tbContent.height) : tbContent.height;
    }
    let x: number, y: number;
    if (anchor?.simplePos) { x = anchor.simplePos.x; y = anchor.simplePos.y; }
    else {
      const hRef = horizRef(anchor?.posH.relativeFrom ?? 'column', g, colX, colW);
      x = alignPos(anchor?.posH.align, anchor?.posH.offset, hRef.x, hRef.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const pin = this.pinnedFloats.get(run);
      if (pin && pin.ps === ps) y = pin.y;
      else {
        const vFrom0 = anchor?.posV.relativeFrom ?? 'paragraph';
        const vRef = vertRef(vFrom0, g, ps, vFrom0 === 'paragraph' && paraRef !== undefined ? paraRef : paraTop);
        y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef.y, vRef.h, h, anchor?.posV.pct, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
        if (clampBottom !== undefined && y + h > clampBottom) y = clampBottom - h;
        // com quebra e relativo ao texto: não sobe além do topo do corpo; nos modos
        // antigos (≤ 14), só além do topo da PÁGINA (oráculos toptbl/toptbl2)
        if (!this.inHf && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) y = Math.max(y, this.floatMinY(ps));
        // no cabeçalho/rodapé dos modos ≤ 14: não sai pela borda de cima nem pela esquerda da
        // PÁGINA (oráculo hff14wrap)
        else if (this.inHf && this.ctx.fmt.settings.compatibilityMode < 15 && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) { y = Math.max(y, 0); x = Math.max(x, 0); }
      }
    }
    // itens desenhados em coordenadas absolutas da página; o fluxo do chamador
    // pode deslocar y (yOrigin) — compensamos para o desenho ficar absoluto
    // ancorado em CÉLULA de tabela: referências relativas à célula (área de texto da
    // célula na horizontal; parágrafo, ou topo da célula, na vertical) e itens no fluxo
    // da célula, que se desloca com a linha — oráculo cellfloat (lab de desenho)
    if (this.inCell && !anchor?.simplePos) {
      const vFrom = anchor?.posV.relativeFrom ?? 'paragraph';
      // margem esquerda/direita = a margem da CÉLULA (alinhado à direita: rente à borda dela)
      const cm = this.cellMar ?? { l: 0, r: 0 };
      const hFrom = anchor?.posH.relativeFrom ?? 'column';
      const [hx, hw] = hFrom === 'rightMargin' || hFrom === 'outsideMargin' ? [colX + colW, cm.r] : hFrom === 'leftMargin' || hFrom === 'insideMargin' ? [colX - cm.l, cm.l] : [colX, colW];
      // layoutInCell="0" nos modos ≤ 14 (o 15 ignora): fora da célula — na horizontal, as
      // referências da página (coluna = a da seção); na vertical, parágrafo/linha = topo da
      // LINHA da tabela, de qualquer parágrafo da célula (oráculo cellout; corpus t70)
      const outCell = anchor?.layoutInCell === false && this.ctx.fmt.settings.compatibilityMode < 15;
      if (outCell) {
        const fr = this.colFrame(), hr = horizRef(hFrom, g, fr.x, fr.w);
        x = alignPos(anchor?.posH.align, anchor?.posH.offset, hr.x, hr.w, w, anchor?.posH.pct, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      } else x = alignPos(anchor?.posH.align, anchor?.posH.offset, hx, hw, w, undefined, g.pageW, anchor?.effectExtent?.l, anchor?.effectExtent?.r);
      const vRef = outCell && (vFrom === 'paragraph' || vFrom === 'line') ? yOrigin - (cm.t ?? 0) : vFrom === 'paragraph' ? paraRef ?? paraTop : vFrom === 'line' ? paraTop : yOrigin;
      y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef, 0, h, undefined, g.pageH, anchor?.effectExtent?.t, anchor?.effectExtent?.b);
      // com quebra e relativo ao texto: não sobe acima do topo da área de texto da célula
      // (deslocamento negativo além dele vira 0 — oráculo cellpic)
      if (anchor && WRAPPING.has(anchor.wrap) && (vFrom === 'paragraph' || vFrom === 'line')) y = Math.max(y, yOrigin);
      if (tbFinal) tbContent = this.ctx.pure(() => tbFinal!(x, y));
      const cellItems = this.paintObject(run, x, y, w, h, tbContent, ps);
      if (behind) flowItems.unshift(...cellItems); else flowItems.push(...cellItems);
      // com quebra: o texto da célula o contorna (layoutStatic registra a caixa — oráculo cellwrap)
      const wb = anchor && (anchor.wrap === 'tight' || anchor.wrap === 'through') ? anchor.wrapBox : undefined;
      const cbox: FloatBox | undefined = anchor && WRAPPING.has(anchor.wrap) && anchor.layoutInCell !== false
        ? { x: wb ? x + w * wb.x0 : x, y: wb ? y + h * wb.y0 : y, w: wb ? w * (wb.x1 - wb.x0) : w, h: wb ? h * (wb.y1 - wb.y0) : h, wrap: anchor.wrap, side: anchor.wrapText ?? 'bothSides', distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 }
        : undefined;
      return { ps, target: [], zobj: { z: 0, seq: this.zSeq++, items: cellItems }, obj: { run, x, y, w, h, layer: behind ? 'behind' : 'front', hf: this.inHf }, ...(cbox ? { box: cbox } : {}) };
    }
    const target = this.inHf ? (behind ? ps.hfBehind : ps.hfFront) : (behind ? ps.behind : ps.front);
    if (tbFinal) tbContent = tbFinal(x, y);
    const items = this.paintObject(run, x, y, w, h, tbContent, ps);
    const obj: PlacedObject = {
      run, x, y, w, h, layer: behind ? 'behind' : 'front', hf: this.inHf,
      frame: { colX, colW, paraTop: paraRef ?? paraTop, pageW: g.pageW, pageH: g.pageH, marL: g.marL, marR: g.marR, marT: g.marT, marB: g.marB, bodyTop: Math.max(g.marT, ps.bodyTop ?? g.marT) },
    };
    if (run.textbox && tbContent) obj.content = tbContentPlacement(run.textbox, this.ctx.fmt.theme, x, y, w, h, tbContent);
    (ps.page.objects ??= []).push(obj);
    // moldura no cabeçalho/rodapé: vai no fluxo — no PDF do Word o texto dela vem
    // na ordem da linha: antes do parágrafo âncora se está no começo dela
    // (fr-hdr-left), depois se está mais à direita (fr-hdr-pgnum); no corpo, depois
    // de todo o texto da página (camada da frente)
    const frameFlow = this.inHf && !!run.textbox && FRAME_INFO.has(run.textbox);
    let inFlow: FloatReceipt['inFlow'];
    if (frameFlow) {
      const rel = yOrigin ? items.map((it) => shiftItem(it, -yOrigin)) : items;
      if (x > colX + 20) this.hfFrameAfter.push(...rel); else flowItems.push(...rel);
      inFlow = { arr: flowItems, items: rel };
    }
    const zobj: ZObj = { z: anchor?.relativeHeight ?? 0, seq: this.zSeq++, items: frameFlow ? [] : items };
    if (!frameFlow) target.push(zobj);
    let box: FloatBox | undefined;
    // modo de compatibilidade ≤ 14: flutuantes do cabeçalho/rodapé não afastam o texto do
    // próprio cabeçalho/rodapé (oráculo hffloat, hff14-*), mas o do corpo sim — a 1ª linha
    // da página desce para baixo deles (oráculo hff14wrap)
    const hfLegacy = this.inHf && this.ctx.fmt.settings.compatibilityMode < 15;
    if (anchor && WRAPPING.has(anchor.wrap)) {
      // justo/através: a caixa do polígono de contorno (oráculo wrappoly)
      const wb = (anchor.wrap === 'tight' || anchor.wrap === 'through') ? anchor.wrapBox : undefined;
      const bx = wb ? x + w * wb.x0 : x, by = wb ? y + h * wb.y0 : y;
      const bw = wb ? w * (wb.x1 - wb.x0) : w, bh = wb ? h * (wb.y1 - wb.y0) : h;
      const fb: FloatBox = { x: bx, y: by, w: bw, h: bh, wrap: anchor.wrap, side: anchor.wrapText ?? 'bothSides', distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 };
      if (anchor.wrapPoly && wb) fb.poly = anchor.wrapPoly.map(([u, v]): [number, number] => [x + w * u, y + h * v]);
      // (as tabelas do corpo também descem para baixo deles — oráculo tblfloat)
      if (hfLegacy) fb.bodyOnly = true;
      box = fb;
    }
    if (box) {
      ps.floats.push(box);
      // posição absoluta cobrindo linhas do corpo já colocadas nesta página: na
      // próxima passada ele entra no início da página (oráculo latefloat)
      if (!this.inHf && !followsText(anchor) && !this.prePlaced.has(run)) {
        const pi = this.pages.indexOf(ps);
        const b = box;
        const hit = pi >= 0 && ps.page.lines.some((l) => !/^(hdr|ftr|txbx)/.test(l.ref)
          && l.y + l.height > b.y - b.distT && l.y < b.y + b.h + b.distB
          && b.x + b.w + b.distR > ps.geom.marL && b.x - b.distL < ps.geom.pageW - ps.geom.marR);
        if (hit) (this.lateFound.get(pi) ?? this.lateFound.set(pi, []).get(pi)!).push(run);
      }
    }
    return { ps, target, zobj, obj, ...(box ? { box } : {}), ...(inFlow ? { inFlow } : {}) };
  }

  /** Desfaz um flutuante colocado (parágrafo que mudou de página). */
  private unplaceFloat(r: FloatReceipt): void {
    const rm = <T>(arr: T[] | undefined, v: T) => { const i = arr ? arr.indexOf(v) : -1; if (i >= 0) arr!.splice(i, 1); };
    rm(r.target, r.zobj);
    if (r.inFlow) for (const it of r.inFlow.items) rm(r.inFlow.arr, it);
    rm(r.ps.page.objects, r.obj);
    if (r.box) rm(r.ps.floats, r.box);
    // o conteúdo de caixa de texto já diagramado não conta: será refeito na nova posição
    if (r.flow) this.ctx.restoreFlow(r.flow);
  }

  /**
   * Flutuantes do parágrafo do corpo posicionados ANTES das linhas, para que o
   * próprio texto do parágrafo os contorne (como no cabeçalho). Só os
   * de quebra que afeta o texto; os demais seguem depois das linhas.
   */
  private placeFloatsEarly(p: PreparedPara, ps: PageState, colX: number, colW: number, paraTop: number, clampBottom?: number, paraRef?: number): FloatReceipt[] {
    const out: FloatReceipt[] = [];
    let flow: FlowState | undefined;
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
      // (já posto no início da página como flutuante tardio: não duplica)
      if (!fl || !anc || !WRAPPING.has(anc.wrap ?? '') || this.prePlaced.has(run)) continue;
      // estado antes de TODAS as colocações (desfazer em qualquer ordem volta a ele)
      flow ??= this.ctx.saveFlow();
      out.push({ ...this.placeFloat(run, ps, colX, colW, paraTop, ps.body, 0, clampBottom !== undefined && followsText(anc) ? clampBottom : undefined, paraRef), flow });
    }
    return out;
  }

  /** Desenha imagem/forma/caixa/grupo no retângulo dado. */
  /** Grupo de desenho e caixa de texto EM LINHA (wp:inline): desenhados como os
   *  flutuantes, na caixa do glifo — o paintLine só desenha imagem e forma (corpus t15) */
  private paintInlineDrawings(out: PageItem[], line: Line, frameX: number, top: number, ps?: PageState): void {
    for (const pg of line.placed) {
      const r = pg.g.obj;
      if (pg.g.kind !== 'obj' || !r || pg.g.adv <= 0 || (!r.group && !r.textbox) || r.image || r.shape) continue;
      const w = r.group?.widthTwips ?? r.textbox?.widthTwips ?? 0, h = r.group?.heightTwips ?? r.textbox?.heightTwips ?? 0;
      const x = frameX + pg.x, y = top + line.baseline - pg.g.style.shift - h;
      let tc: CellContent | null = null;
      if (r.textbox) {
        const blocks: Block[] = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
        const chain = this.chainOf(r.textbox);
        tc = chain ? this.chainSlice(chain, r.textbox, {}) : this.layoutStatic(blocks, 0, Math.max(1, tbFrame(r.textbox, this.ctx.fmt.theme, w, h).iw), { ...this.tbEnv(r.textbox) }, 'itb', ps);
      }
      const drawn = this.paintObject(r, x, y, w, h, tc, ps ?? this.cur);
      // no corpo, como os flutuantes: depois do texto da página (ordem do PDF do Word — oráculo inlinegrp)
      if (out === this.cur.body) this.cur.front.push({ z: 0, seq: this.zSeq++, items: drawn });
      else out.push(...drawn);
    }
  }

  private paintObject(run: Run, x: number, y: number, w: number, h: number, tbContent: CellContent | null, ps: PageState = this.cur, inGroup = false): PageItem[] {
    const out: PageItem[] = [];
    const theme = this.ctx.fmt.theme;
    if (run.image && isEmf(run.image.data)) {
      out.push({ t: 'clip', op: 'push', x, y, w, h, src: run.image }, ...renderEmf(this.ctx, run.image.data, { x, y, w, h }), { t: 'clip', op: 'pop' });
    } else if (run.image && isWmf(run.image.data)) {
      out.push({ t: 'clip', op: 'push', x, y, w, h, src: run.image }, ...renderWmf(this.ctx, run.image.data, { x, y, w, h }), { t: 'clip', op: 'pop' });
    } else if (run.image) {
      const im = run.image;
      out.push({
        t: 'image', x, y, w, h, image: im,
        ...(im.crop ? { crop: im.crop } : {}),
        ...(im.style?.rot ? { rot: im.style.rot } : {}),
        ...(im.style?.flipH ? { flipH: true } : {}),
        ...(im.style?.flipV ? { flipV: true } : {}),
        ...((): { pic?: PictureLook } => { const pic = pictureLook(im, theme); return pic ? { pic } : {}; })(),
      });
    } else if (run.shape) {
      const s = run.shape.style;
      const fill = resolveDrawingColor(withThemeStyles(s, theme).fill, theme);
      // linha do estilo (lnRef sem a:ln@w): a espessura é a da linha do tema (oráculo txbxln)
      const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
      const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: lw!, ...(s.line.dash ? { dash: s.line.dash } : {}) } : undefined;
      out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...(run.shape.line ? { line: run.shape.line } : {}), ...shapeExtras(s, theme) });
    } else if (run.textbox) {
      const tb = run.textbox;
      const s = tb.shape;
      if (s && (s.fill || s.line || s.gradient || s.pattern || s.blip)) {
        const fill = resolveDrawingColor(withThemeStyles(s, theme).fill, theme);
        // linha do estilo (lnRef sem a:ln@w): a espessura é a da linha do tema (oráculo txbxln)
        const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
        const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: lw!, ...(s.line.dash ? { dash: s.line.dash } : {}) } : undefined;
        out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...shapeExtras(s, theme) });
      }
      if (tbContent) {
        // margens no referencial do texto (texto vertical: giradas com os lados da forma)
        const fr = tbFrame(tb, this.ctx.fmt.theme, w, h);
        const ins = fr.ins;
        // caixa girada: o conteúdo gira em torno do centro (a forma já gira no pintor)
        const rot = tb.rot ?? s?.rot ?? 0;
        // WordArt (textPlain): o texto estica para preencher a caixa interna
        let art: { m: [number, number, number, number, number, number]; dy: number } | null = null;
        if (tb.wordArt && tbContent.lines.length) {
          const x0 = Math.min(...tbContent.lines.map((l) => l.x)), x1 = Math.max(...tbContent.lines.map((l) => l.x + l.width));
          const iw = Math.max(1, w - ins.l - ins.r), ih = Math.max(1, h - ins.t - ins.b);
          const sx = iw / Math.max(1, x1 - x0), sy = ih / Math.max(1, tbContent.height);
          art = { m: [sx, 0, 0, sy, x + ins.l - x0 * sx, y + ins.t], dy: 0 };
          // v:textpath (marca-d'água): o em ocupa a ALTURA da caixa e a linha de base fica
          // a altura·winDescent/upm do fundo; a largura do texto ocupa a largura (oráculo
          // page-lab wmf-*: Arial, Times, Georgia e Calibri, em/altura = 1,000)
          const g0 = tb.vml ? tbContent.items.find((it): it is import('./tree.js').GlyphRunItem => it.t === 'glyphs') : undefined;
          if (g0 && tbContent.lines.length === 1) {
            const fm = g0.face.font.metrics, u = fm.unitsPerEm || 1000;
            const desc = (fm.usWinDescent || -fm.descender) / u;
            const sy2 = ih / Math.max(1, g0.sizePt * 20);
            art.m = [sx, 0, 0, sy2, x + ins.l - x0 * sx, y + ins.t + ih - ih * desc - g0.y * sy2];
            // forma GIRADA centrada na vertical: o Word centra a caixa da TINTA do texto
            // girado (não a da forma) — a horizontal segue a caixa (oráculo page-lab wmd:
            // 6 marcas diagonais, centro da tinta = centro da margem ± 0,5 pt)
            if (rot % 180 !== 0 && tb.anchor?.posV.align === 'center') {
              const ink = rotatedInkY(tbContent.items, art.m, x + w / 2, y + h / 2, rot);
              if (ink) art.dy = y + h / 2 - (ink.lo + ink.hi) / 2;
            }
          }
        }
        if (art?.dy) out.push({ t: 'xform', op: 'push', m: [1, 0, 0, 1, 0, art.dy] });
        if (rot) out.push({ t: 'xform', op: 'push', m: rotation(x + w / 2, y + h / 2, rot) });
        if (art) {
          out.push({ t: 'xform', op: 'push', m: art.m });
          // o Word grava o texto do WordArt como CURVAS no PDF (não é texto extraível)
          for (const it of tbContent.items) out.push(it.t === 'glyphs' ? { ...it, asPath: true } : it);
          out.push({ t: 'xform', op: 'pop' });
        } else if (fr.rot) {
          // texto vertical: o conteúdo girado no quadro (margens giradas com os lados)
          out.push({ t: 'clip', op: 'push', x, y, w, h });
          out.push(...verticalContent(tbContent, fr, tb.vAnchor, x, y, w, h));
          out.push({ t: 'clip', op: 'pop' });
        } else {
          let dy = y + ins.t;
          const free = h - ins.t - ins.b - tbContent.height;
          if (tb.vAnchor === 'ctr' && free > 0) dy += free / 2;
          else if (tb.vAnchor === 'b' && free > 0) dy += free;
          out.push({ t: 'clip', op: 'push', x, y, w, h });
          // caixa girada fora de múltiplos de 90°: o Word rasteriza o conteúdo
          // (imagem no PDF, sem texto) — curvas aqui (oráculo hidetext/rot-tb, rot-1);
          // caixa de um GRUPO: o texto com escala horizontal (w:w) sai como curvas, o
          // resto como texto (oráculo txbxscale)
          const raster = rot % 90 !== 0;
          // figura (imagem, EMF/WMF com o recorte dela) INTEIRA fora da caixa: o Word não a
          // desenha — nem o texto do EMF; o texto que transborda sai (oráculo tbover)
          const outside = (r: { x: number; y: number; w: number; h: number }): boolean => r.y >= y + h || r.y + r.h <= y || r.x >= x + w || r.x + r.w <= x;
          let skip = 0;
          for (const it of tbContent.items) {
            if (skip) {
              if (it.t === 'clip') skip += it.op === 'push' ? 1 : -1;
              continue;
            }
            if (it.t === 'clip' && it.op === 'push' && it.y !== undefined && it.w !== undefined && it.h !== undefined
              && outside({ x: (it.x ?? 0) + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) { skip = 1; continue; }
            if (it.t === 'image' && outside({ x: it.x + x + ins.l, y: it.y + dy, w: it.w, h: it.h })) continue;
            const s2 = shiftItem(it, dy, x + ins.l);
            const curves = raster || (inGroup && s2.t === 'glyphs' && s2.scaleX !== undefined && s2.scaleX !== 1);
            out.push(curves && s2.t === 'glyphs' ? { ...s2, asPath: true } : s2);
          }
          out.push({ t: 'clip', op: 'pop' });
        }
        if (rot) out.push({ t: 'xform', op: 'pop' });
        if (art?.dy) out.push({ t: 'xform', op: 'pop' });
      }
    } else if (run.group) {
      const gr = run.group;
      for (const item of gr.items) {
        // rotação/espelho do grupo aplicados ao filho (oráculo de formas)
        const { run: r, x: ix, y: iy, w: iw, h: ih } = groupChild(gr, item, x, y, w, h);
        let tc: CellContent | null = null;
        if (r.textbox) {
          const blocks: Block[] = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
          // campos (PAGE…) da caixa do grupo valem por página, como na caixa solta (oráculo hfgroup)
          // (com giro/espelho do grupo o filho é uma cópia: a cadeia é a da caixa original)
          const chain = this.chainOf(item.run.textbox!);
          tc = chain ? this.chainSlice(chain, item.run.textbox!, { field: this.fieldValue(ps), ...(this.inHf ? { hf: true } : {}) })
            : this.layoutStatic(blocks, 0, Math.max(1, tbFrame(r.textbox, this.ctx.fmt.theme, iw, ih).iw), { field: this.fieldValue(ps), ...this.tbEnv(r.textbox), ...(this.inHf ? { hf: true } : {}) }, 'grp', ps);
        }
        out.push(...this.paintObject(r, ix, iy, iw, ih, tc, ps, true));
      }
    }
    return out;
  }
}


function blocksOfParas(set: { default?: Paragraph[]; first?: Paragraph[]; even?: Paragraph[] }): SectGeom['headers'] {
  const conv = (ps?: Paragraph[]) => ps?.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
  const out: SectGeom['headers'] = {};
  if (set.default) out.default = conv(set.default)!;
  if (set.first) out.first = conv(set.first)!;
  if (set.even) out.even = conv(set.even)!;
  return out;
}

function horizRef(from: string, g: SectGeom, colX: number, colW: number): { x: number; w: number } {
  switch (from) {
    case 'page': return { x: 0, w: g.pageW };
    case 'margin': return { x: g.marL, w: g.pageW - g.marL - g.marR };
    case 'leftMargin': case 'insideMargin': return { x: 0, w: g.marL };
    case 'rightMargin': case 'outsideMargin': return { x: g.pageW - g.marR, w: g.marR };
    case 'character': return { x: colX, w: colW };
    default: return { x: colX, w: colW }; // column
  }
}

function vertRef(from: string, g: SectGeom, ps: PageState, paraTop: number): { y: number; h: number } {
  switch (from) {
    case 'page': return { y: 0, h: g.pageH };
    case 'margin': { const top = Math.max(g.marT, ps?.bodyTop ?? g.marT); return { y: top, h: g.pageH - top - g.marB }; }
    case 'topMargin': case 'insideMargin': return { y: 0, h: g.marT };
    case 'bottomMargin': case 'outsideMargin': return { y: g.pageH - g.marB, h: g.marB };
    default: return { y: paraTop, h: 0 }; // paragraph | line
  }
  void ps;
}

/** Recuos internos da caixa de texto (twips); o Word ainda afasta o texto meia espessura do
 *  contorno de cada lado (oráculo txbxctr) — na caixa wps, mesmo com a linha sem
 *  preenchimento: a espessura do a:ln@w ou a da linha do tema do lnRef (oráculo txbxln) */
function tbInsets(
  tb: { insets?: { l: number; t: number; r: number; b: number }; shape?: { line?: { widthPt: number } }; lineInset?: { w?: number; ref?: number }; geom?: { prst: string; adj?: Record<string, number> } },
  theme?: { lineWidthsPt?: number[] }, w?: number, h?: number,
): { l: number; t: number; r: number; b: number } {
  const ins0 = tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  const tr = tb.geom && w !== undefined && h !== undefined ? textRectInsets(tb.geom, w, h) : null;
  const ins = tr ? { l: ins0.l + tr.l, t: ins0.t + tr.t, r: ins0.r + tr.r, b: ins0.b + tr.b } : ins0;
  const li = tb.lineInset;
  // sem tema no arquivo vale o do Word: linhas de 1; 1,5; 2 pt (oráculo tbinset)
  const lw = li ? li.w ?? (li.ref ? theme?.lineWidthsPt?.[li.ref - 1] ?? [1, 1.5, 2][li.ref - 1] ?? 0.75 : 0) : tb.shape?.line?.widthPt ?? 0;
  const half = lw * 10;
  return half ? { l: ins.l + half, t: ins.t + half, r: ins.r + half, b: ins.b + half } : ins;
}

/** Direção do texto da caixa: 0 horizontal; 90 girado no sentido horário (vert, eaVert);
 *  270 anti-horário (vert270); −90 girado no horário com as linhas da esquerda para a
 *  direita (mongolianVert, wordArtVert, wordArtVertRtl) — oráculo txbxvert. */
export type TbRot = 0 | 90 | 270 | -90;
function vertKind(v: string | undefined): TbRot {
  switch (v) {
    case 'vert': case 'eaVert': return 90;
    case 'vert270': return 270;
    case 'mongolianVert': case 'wordArtVert': case 'wordArtVertRtl': return -90;
    default: return 0;
  }
}

export interface TbFrame { ins: { l: number; t: number; r: number; b: number }; iw: number; ih: number; rot: TbRot }

/** Quadro do texto da caixa w × h no referencial do TEXTO: as margens (a direção vertical as
 *  gira com os lados da forma: em vert, a margem de cima vira a da esquerda do texto e a da
 *  direita a de cima — oráculo txbxvert), a largura e a altura disponíveis. */
export function tbFrame(
  tb: Parameters<typeof tbInsets>[0] & { vert?: string }, theme: { lineWidthsPt?: number[] } | undefined, w: number, h: number,
): TbFrame {
  const p = tbInsets(tb, theme, w, h);
  const rot = vertKind(tb.vert);
  if (rot === 90) return { ins: { l: p.t, t: p.r, r: p.b, b: p.l }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  if (rot === 270) return { ins: { l: p.b, t: p.l, r: p.t, b: p.r }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  if (rot === -90) return { ins: { l: p.t, t: p.l, r: p.b, b: p.r }, iw: h - p.t - p.b, ih: w - p.l - p.r, rot };
  return { ins: p, iw: w - p.l - p.r, ih: h - p.t - p.b, rot };
}

/** Matriz texto → página da caixa de texto vertical em (x, y, w, h). */
export function verticalMatrix(rot: TbRot, x: number, y: number, w: number, h: number): [number, number, number, number, number, number] {
  return rot === 270 ? [0, -1, 1, 0, x, y + h] : [0, 1, -1, 0, x + w, y];
}

/** Conteúdo de caixa com texto vertical: girado para a página e alinhado (t/ctr/b) no
 *  referencial do texto; em −90 (mongolianVert…) cada linha vai para o lado oposto (as
 *  linhas correm da esquerda para a direita com os caracteres girados no horário). */
/** Passo das linhas do texto vertical: o Word as afasta 1/32 do corpo a mais que na
 *  horizontal (medido 8–24 pt, Arial/Times/Courier: ≈ altura da linha / 36,8) — oráculo txbxvert tp-*. */
const VERT_PITCH = 1 / 36.8;

/** Linhas do conteúdo na vertical: deslocamento acumulado (o passo maior) por faixa. */
function verticalBands(c: CellContent): { y0: number; y1: number; add: number }[] {
  const ls = [...c.lines].sort((a, b) => a.y - b.y);
  let acc = 0;
  return ls.map((l) => { const b = { y0: l.y, y1: l.y + l.height, add: acc }; acc += l.height * VERT_PITCH; return b; });
}

/** Altura do conteúdo vertical com o passo maior das linhas. */
export function verticalHeight(c: CellContent): number {
  return c.height + c.lines.reduce((a, l) => a + l.height * VERT_PITCH, 0);
}

function verticalContent(c: CellContent, fr: TbFrame, vAnchor: string | undefined, x: number, y: number, w: number, h: number): PageItem[] {
  const lh = w;
  let dy = fr.ins.t;
  const free = lh - fr.ins.t - fr.ins.b - verticalHeight(c);
  if (vAnchor === 'ctr' && free > 0) dy += free / 2;
  else if (vAnchor === 'b' && free > 0) dy += free;
  const out: PageItem[] = [{ t: 'xform', op: 'push', m: verticalMatrix(fr.rot, x, y, w, h) }];
  const bands = verticalBands(c);
  const shiftOf = (y0: number, y1: number): number => {
    const mid = (y0 + y1) / 2;
    const b = bands.find((q) => mid >= q.y0 - 0.5 && mid <= q.y1 + 0.5) ?? [...bands].reverse().find((q) => q.y0 <= mid);
    const add = b?.add ?? 0;
    if (fr.rot !== -90) return dy + add;
    const a0 = (b ? b.y0 : y0) + add, a1 = (b ? b.y1 : y1) + add;
    // faixa [dy + a0, dy + a1] espelhada no quadro: começa em lh − (dy + a1)
    return lh - (dy + a1) - a0 + add;
  };
  for (const it of c.items) {
    const r = it as { y?: number; h?: number };
    const d = it.t === 'glyphs' ? shiftOf(it.y, it.y) : it.t === 'line' ? shiftOf(Math.min(it.y1, it.y2), Math.max(it.y1, it.y2))
      : r.y !== undefined ? shiftOf(r.y, r.y + (r.h ?? 0)) : dy;
    out.push(shiftItem(it, d, fr.ins.l));
  }
  out.push({ t: 'xform', op: 'pop' });
  return out;
}

/** Retângulo de texto da forma predefinida (txRect das definições do DrawingML), como recuo
 *  de cada lado da caixa w × h — o Word põe o texto nele (oráculos txrect, txgeom) */
function textRectInsets(g: { prst: string; adj?: Record<string, number> }, w: number, h: number): { l: number; t: number; r: number; b: number } | null {
  const names = g.adj ? Object.keys(g.adj) : undefined;
  const tr = presetTextRect(g.prst, w, h, names?.map((n) => g.adj![n]!), names);
  if (tr) return { l: tr.l, t: tr.t, r: w - tr.r, b: h - tr.b };
  switch (g.prst) {
    case 'roundRect': {
      const i = ((Math.min(w, h) * (g.adj?.['adj'] ?? 16667)) / 100000) * 0.29289;
      return { l: i, t: i, r: i, b: i };
    }
    case 'ellipse': {
      const k = 0.5 - Math.SQRT1_2 / 2;
      return { l: w * k, t: h * k, r: w * k, b: h * k };
    }
    case 'triangle': {
      const x1 = (w * (g.adj?.['adj'] ?? 50000)) / 200000;
      return { l: x1, t: h / 2, r: w / 2 - x1, b: 0 };
    }
    case 'diamond': return { l: w / 4, t: h / 4, r: w / 4, b: h / 4 };
    default: return null;
  }
}

/** Posição do objeto pelo alinhamento ou deslocamento. Alinhado, o Word alinha a caixa JUNTO
 *  com a margem de efeitos (wp:effectExtent: e0 antes, e1 depois — sombra, brilho) e o objeto
 *  fica e0 para dentro dela (oráculo txbxctr); o deslocamento vale para o próprio objeto. */
function alignPos(align: string | undefined, offset: number | undefined, base: number, span: number, size: number, pct: number | undefined, pageSpan: number, e0 = 0, e1 = 0): number {
  if (align && (e0 || e1)) return alignPos(align, offset, base, span, size + e0 + e1, pct, pageSpan) + e0;
  if (align) {
    switch (align) {
      case 'center': return base + (span - size) / 2;
      case 'right': case 'bottom': case 'outside': return base + span - size;
      default: return base; // left | top | inside
    }
  }
  if (pct !== undefined) return base + (pct / 100000) * pageSpan;
  return base + (offset ?? 0);
}

/** recuos/tabulações efetivos por parágrafo preparado (um objeto para todas as linhas) */
const PFMT = new WeakMap<PreparedPara, LineParaFormat>();
const pfmtOf = (p: PreparedPara): LineParaFormat => {
  let f = PFMT.get(p);
  if (!f) PFMT.set(p, (f = { left: p.indLeft, right: p.indRight, firstLine: p.firstLine, tabs: p.tabs }));
  return f;
};

function lineRecord(ref: string, p: PreparedPara, line: Line, frameX: number, top: number, frameW?: number): LaidOutLine {
  const gs = p.glyphs;
  const first = gs[line.start];
  const lastG = gs[Math.max(line.start, line.end - 1)];
  const start = first ? first.offset : 0;
  const end = lastG ? lastG.offset + (lastG.ch.length || 1) : start;
  // posição de cada caractere (offset no parágrafo → x absoluto e largura): o
  // editor mapeia cursor/seleção/clique por aqui
  const chars = line.placed
    .filter((pg) => pg.g.kind !== 'pb' && pg.g.kind !== 'cb' && !pg.g.autoHyphen)
    .map((pg) => ({ o: pg.g.offset, x: frameX + pg.x, w: pg.w }));
  // barra de alteração: a linha cruza uma revisão (inclusive texto excluído escondido)
  const rb = p.revBars;
  const firstLine = line.start === 0, lastLine = line.end >= gs.length;
  // (texto escondido — exclusão na Marcação Simples — não tem glifo: vale encostar na linha)
  const rev = !!rb && (rb.whole || (rb.mark && lastLine) || rb.ranges.some(([a, b, hidden]) => (hidden ? a <= end && b >= start : a < end && b > start)));
  const x = frameX + line.xStart;
  return {
    ref, start, end,
    x, y: top, height: line.height, baseline: top + line.baseline, width: line.width,
    chars,
    ...(rev ? { rev: { before: firstLine ? p.spaceBefore : 0, after: lastLine ? p.spaceAfter : 0 } } : {}),
    // régua do editor: o quadro (relativo a x) e os recuos/tabulações efetivos
    ...(frameW !== undefined ? { frame: { l: frameX - x, r: frameX + frameW - x }, pfmt: pfmtOf(p) } : {}),
  };
}

/**
 * Barras de alteração de uma página (medido no Word, revisions-render): um
 * traço de 0,72 pt na margem esquerda por trecho de linhas seguidas com
 * revisão, cobrindo a caixa de cada linha mais o espaço antes/depois do
 * parágrafo — sem passar da linha vizinha.
 */
function revisionBarItems(lines: readonly LaidOutLine[], x: number, color: string): PageItem[] {
  const all = [...lines].sort((a, b) => a.y - b.y);
  const segs: [number, number][] = [];
  all.forEach((l, i) => {
    if (!l.rev) return;
    const prevBottom = i > 0 ? all[i - 1]!.y + all[i - 1]!.height : -Infinity;
    const nextTop = i + 1 < all.length ? all[i + 1]!.y : Infinity;
    const top = Math.max(l.y - l.rev.before, Math.min(l.y, prevBottom));
    const bottom = Math.min(l.y + l.height + l.rev.after, Math.max(l.y + l.height, nextTop));
    const last = segs[segs.length - 1];
    // (a borda entre linhas de tabela não separa a barra — oráculo tbl)
    if (last && top <= last[1] + 20) last[1] = Math.max(last[1], bottom);
    else segs.push([top, bottom]);
  });
  return segs.map(([y0, y1]) => ({ t: 'rect' as const, x, y: y0, w: BAR_WIDTH, h: y1 - y0, fill: color }));
}

export { EMPTY_LINES, resolveColor };

/**
 * O Word não grava no PDF o texto que fica INTEIRO fora da página: some a
 * LINHA cuja caixa (topo/base da linha; da borda esquerda do quadro até o
 * último glifo) não cruza a página — a linha que só encosta na borda sai
 * inteira, com todos os runs, inclusive os de fora (oráculo hidetext: off-*,
 * ftr-far, straddle-*, cull-bottom, right-start-out). Considera as rotações (xform).
 */
function cullOffPage(items: PageItem[], pageW: number, pageH: number): PageItem[] {
  type M = [number, number, number, number, number, number];
  const stack: (M | null)[] = [];
  let m: M | null = null;
  // cada run diz se cruza a página; a linha fica se ALGUM dos seus runs cruza
  const outside = new Set<PageItem>();
  const lineIn = new Set<number>();
  for (const it of items) {
    if (it.t === 'xform') {
      if (it.op === 'push' && it.m) {
        stack.push(m);
        const n = it.m;
        m = m ? [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
          m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]] : n;
      } else if (it.op === 'pop') m = stack.pop() ?? null;
      continue;
    }
    // (o número de linha fica mesmo fora da página — oráculo lnnum2/ln-dist-wide)
    if (it.t !== 'glyphs' || !it.glyphs.length || it.lineNum) continue;
    const em = it.sizePt * 20;
    const box = it.lineBox ?? { asc: em, desc: em * 0.3, lead: 0 };
    let x0 = Infinity, x1 = -Infinity;
    for (const g of it.glyphs) { x0 = Math.min(x0, g.x); x1 = Math.max(x1, g.x + em); }
    // borda esquerda do quadro (o texto pode transbordar para qualquer lado)
    const frameL = it.glyphs[0]!.x - box.lead;
    x0 = Math.min(x0, frameL); x1 = Math.max(x1, frameL);
    const y0 = it.y - box.asc, y1 = it.y + box.desc;
    let bx0 = x0, bx1 = x1, by0 = y0, by1 = y1;
    if (m) {
      const mm = m;
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py]) => [mm[0] * px! + mm[2] * py! + mm[4], mm[1] * px! + mm[3] * py! + mm[5]] as const);
      bx0 = Math.min(...pts.map((q) => q[0])); bx1 = Math.max(...pts.map((q) => q[0]));
      by0 = Math.min(...pts.map((q) => q[1])); by1 = Math.max(...pts.map((q) => q[1]));
    }
    if (bx1 <= 0 || bx0 >= pageW || by1 <= 0 || by0 >= pageH) outside.add(it);
    else if (it.lineBox) lineIn.add(it.lineBox.line);
  }
  if (!outside.size) return items;
  return items.filter((it) => !outside.has(it) || (it.t === 'glyphs' && !!it.lineBox && lineIn.has(it.lineBox.line)));
}

/** Rotação (graus, horário na tela) em torno de (cx, cy) — matriz de XformItem. */
type M6 = [number, number, number, number, number, number];
const mulM = (m: M6, n: M6): M6 => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

/**
 * Linhas do conteúdo de uma caixa de texto no referencial do texto e a matriz que as
 * leva à página — a MESMA colocação da pintura (paintObject/verticalContent): margens,
 * alinhamento vertical, giro da caixa (sem "não girar o texto") e texto vertical (no
 * mongolianVert cada linha vai para o lado oposto). O editor edita a caixa por elas.
 */
export function tbContentPlacement(
  tb: DrawingTextbox & { shape?: { rot?: number } }, theme: { lineWidthsPt?: number[] } | undefined, x: number, y: number, w: number, h: number, c: CellContent,
): { lines: LaidOutLine[]; xf: M6 } {
  const fr = tbFrame(tb, theme, w, h);
  const ins = fr.ins;
  const rot = tb.upright ? 0 : tb.rot ?? tb.shape?.rot ?? 0;
  const around: M6 = rot ? rotation(x + w / 2, y + h / 2, rot) : [1, 0, 0, 1, 0, 0];
  if (tb.wordArt) return { lines: [], xf: around };
  if (!fr.rot) {
    let dy = ins.t;
    const free = h - ins.t - ins.b - c.height;
    if (tb.vAnchor === 'ctr' && free > 0) dy += free / 2;
    else if (tb.vAnchor === 'b' && free > 0) dy += free;
    return { lines: c.lines, xf: mulM(around, [1, 0, 0, 1, x + ins.l, y + dy]) };
  }
  // vertical: o mesmo deslocamento por faixa da pintura (passo maior; −90 espelhado)
  const lh = w;
  let dy = ins.t;
  const free = lh - ins.t - ins.b - verticalHeight(c);
  if (tb.vAnchor === 'ctr' && free > 0) dy += free / 2;
  else if (tb.vAnchor === 'b' && free > 0) dy += free;
  const bands = verticalBands(c);
  const lines = c.lines.map((l) => {
    const b = bands.find((q) => Math.abs(q.y0 - l.y) < 0.01);
    const add = b?.add ?? 0;
    const sh = fr.rot === -90 ? lh - (dy + l.y + add + l.height) - l.y : dy + add;
    return { ...l, x: l.x + ins.l, y: l.y + sh, baseline: l.baseline + sh, ...(l.chars ? { chars: l.chars.map((q) => ({ ...q, x: q.x + ins.l })) } : {}) };
  });
  return { lines, xf: mulM(around, verticalMatrix(fr.rot, x, y, w, h)) };
}

function rotation(cx: number, cy: number, deg: number): [number, number, number, number, number, number] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
}

/** Identidade do grupo de bordas de parágrafo: bordas + recuos. */
function bdrKey(ppr: import('@universal-office/docx-core').PPr): string | undefined {
  return ppr.pBdr ? JSON.stringify([ppr.pBdr, ppr.ind ?? null]) : undefined;
}

/** Âncoras verticais que não dependem do fluxo do texto. */
const ABSOLUTE_V = new Set(['page', 'margin', 'topMargin', 'bottomMargin', 'insideMargin', 'outsideMargin']);

/** Desloca uma linha diagramada (y e baseline). */
function shiftLine(l: LaidOutLine, dy: number): LaidOutLine {
  return { ...l, y: l.y + dy, baseline: l.baseline + dy };
}

function shiftLineXY(l: LaidOutLine, dx: number, dy: number): LaidOutLine {
  return { ...l, x: l.x + dx, y: l.y + dy, baseline: l.baseline + dy, ...(l.chars && dx ? { chars: l.chars.map((c) => ({ ...c, x: c.x + dx })) } : {}) };
}

/** Quebras de texto que afastam as linhas do objeto. */
const WRAPPING = new Set(['square', 'tight', 'through', 'topAndBottom']);
/** vão mínimo ao lado de um objeto para receber texto: 18pt (twips; oráculo wrapsides) */
const MIN_GAP = 359.5;

/** Recibo de um flutuante colocado (para desfazer). */
interface FloatReceipt {
  ps: PageState;
  target: ZObj[];
  zobj: ZObj;
  obj: PlacedObject;
  box?: FloatBox;
  /** estado de listas/SEQ/notas antes da colocação (caixa de texto): volta no unplace */
  flow?: FlowState;
  /** moldura: itens postos no FLUXO (camada do texto) */
  inFlow?: { arr: PageItem[]; items: PageItem[] };
}

/** Âncora de um objeto flutuante (qualquer tipo). */
function floatAnchor(run: Run): DrawingAnchor | undefined {
  return run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
}

/** O objeto acompanha o texto (posição vertical relativa ao parágrafo/linha). */
function followsText(a: DrawingAnchor | undefined): boolean {
  return !!a && !a.simplePos && !ABSOLUTE_V.has(a.posV.relativeFrom ?? 'paragraph');
}

/** O quadro `a` aperta a linha mais que `b` (lados ou vãos ao redor de flutuantes)? */
function narrower(a: WrapFrame, b: WrapFrame): boolean {
  return a.left > b.left + 0.5 || a.right < b.right - 0.5 || (a.segs?.length ?? 0) !== (b.segs?.length ?? 0);
}

/** Altura natural de uma linha com a fonte da marca de parágrafo (twips) —
 *  estimativa para o contorno de objetos antes de quebrar a linha. */
function markLineH(p: PreparedPara): number {
  const mm = faceMetrics(p.markFace.font);
  return Math.round((mm.ascent + mm.descent) * p.markStyle.sizePt * 20);
}

/** Nota partida entre páginas: o começo (nesta) e o resto (na seguinte). */
type NoteCut = { id: number; first: CellContent; rest: CellContent };

/** Cópia descartável do estado da página (medições que posicionam flutuantes). */
function scratchPage(ps: PageState): PageState {
  return {
    ...ps, page: { ...ps.page, items: [], lines: [], objects: [], cells: [] },
    behind: [], hf: [], body: [], front: [], hfBehind: [], hfFront: [], floats: [...ps.floats], notes: [],
  };
}

/** Faixa vertical (twips da página) da TINTA dos glifos depois da escala do WordArt
 *  (`m`) e do giro em torno de (cx, cy) — contornos da fonte (pontos de controle). */
function rotatedInkY(items: readonly PageItem[], m: readonly number[], cx: number, cy: number, rotDeg: number): { lo: number; hi: number } | null {
  const r = (rotDeg * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  let lo = Infinity, hi = -Infinity;
  for (const it of items) {
    if (it.t !== 'glyphs') continue;
    const font = it.face.font;
    if (!font.glyphOutline) continue;
    const k = (it.sizePt * 20) / (font.metrics.unitsPerEm || 1000);
    const sxg = it.scaleX ?? 1;
    for (const g of it.glyphs) {
      const ol = font.glyphOutline(g.gid ?? font.glyphId(g.cp));
      if (!ol) continue;
      for (const c of ol) {
        if (c.op === 'Z') continue;
        const pts: [number, number][] = c.op === 'Q' ? [[c.cx, c.cy], [c.x, c.y]] : [[c.x, c.y]];
        for (const [px, py] of pts) {
          const lx = g.x + px * k * sxg, ly = it.y - py * k;
          const X = m[0]! * lx + m[2]! * ly + m[4]!, Y = m[1]! * lx + m[3]! * ly + m[5]!;
          const Yr = cy + (X - cx) * sn + (Y - cy) * cs;
          if (Yr < lo) lo = Yr;
          if (Yr > hi) hi = Yr;
        }
      }
    }
  }
  return lo <= hi ? { lo, hi } : null;
}
