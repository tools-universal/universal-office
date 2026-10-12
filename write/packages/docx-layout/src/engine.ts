import type {
  FullDocument, Block, Paragraph, TableBlock, Section, SectPr, Run, PBdr, DrawingAnchor, TableCell,
} from '@universal-office/docx-core';
import { runPropsFromRPr, paraPropsFromPPr } from '@universal-office/docx-core';
import { DocContext, emptyFormatting, directPPr, type LayoutOptions, type FlowState } from './context.js';
import { faceMetrics, type FontProvider } from './fonts.js';
import { prepareParagraph, resolvePPr, isDark, paraVisibility, type PreparedPara, type ParaEnv } from './para.js';
import { LineBreaker, type Line } from './lines.js';
import { paintLine, paintParaBox, borderWidth, pageBorderItems } from './paint.js';
import { dateFieldValue } from './datefmt.js';
import { layoutTable, shiftItem, isHiddenRow, mergeTextFirst, dropMoved, splitContent, atPageTop, LATE_ITEMS, type TableLayout, type CellContent, type ParaSplitInfo, type NestRow } from './table.js';
import type { LayoutPage, LayoutResult, PageItem, LaidOutLine, PlacedObject } from './tree.js';
import { resolveColor, resolveDrawingColor } from './resolve.js';
import { formatNumber } from './numbering.js';
import { NumberingState } from './numbering.js';
import { isEmf, renderEmf } from './emf.js';
import { isWmf, renderWmf } from './wmf.js';
import { groupChild, shapeExtras } from './geometry.js';
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
  headers: { default?: Block[]; first?: Block[]; even?: Block[] };
  footers: { default?: Block[]; first?: Block[]; even?: Block[] };
  blocks: [number, number];
  /** w:lnNumType */
  lnNum?: { countBy: number; start: number; restart: string; distance: number };
  /** grade de linhas (docGrid type=lines/linesAndChars): passo em twips */
  linePitch?: number;
}

interface FloatBox {
  x: number; y: number; w: number; h: number;
  wrap: string;
  /** wrapText: lado(s) por onde o texto passa (bothSides | left | right | largest) */
  side?: string;
  distL: number; distR: number; distT: number; distB: number;
  /** do cabeçalho/rodapé nos modos ≤ 14: só o texto do CORPO o contorna (oráculo hff14wrap) */
  bodyOnly?: boolean;
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

/** parágrafo de marca oculta (com texto visível) à espera do seguinte */
interface HiddenJoin { para: Paragraph; marker: PreparedPara['marker'] }

export function layoutDocument(full0: FullDocument, provider: FontProvider, opts: LayoutOptions = {}): LayoutResult {
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
  let last: Engine | null = null;
  for (let pass = 0; pass < 5; pass++) {
    const ctx = new DocContext(fmt, provider, opts);
    const eng = new Engine(ctx, full, total, marks, late, lateTables);
    result = eng.run();
    last = eng;
    const newMarks = eng.usedPageRef ? eng.bookmarkPages() : marks;
    const newLate = eng.lateFound.size ? mergeLate(late, eng.lateFound) : late;
    const newLateTables = eng.lateTablesFound.size ? new Map([...lateTables, ...eng.lateTablesFound]) : lateTables;
    const stable = (!eng.usedNumPages || result.pages.length === total)
      && (!eng.usedPageRef || sameMap(newMarks, marks)) && newLate === late && newLateTables === lateTables;
    if (stable) break;
    total = result.pages.length;
    marks = newMarks;
    late = newLate;
    lateTables = newLateTables;
  }
  // seções de várias colunas encerradas por quebra CONTÍNUA: o Word equilibra as
  // colunas da última página da seção — a menor altura de coluna com que o conteúdo,
  // enchido em sequência, ainda cabe nas colunas da página (oráculo colbal)
  const balance = new Map<number, BalanceSpec>();
  const runWith = (bal: Map<number, BalanceSpec>): Engine => {
    const eng = new Engine(new DocContext(fmt, provider, opts), full, total, marks, late, lateTables, bal);
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
    const fits = (h: number): boolean => runWith(new Map([...balance, [s, { page: info.page, h }]])).balanceFound.get(s)?.page === info.page;
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
interface BalanceInfo { page: number; colTop: number; bottom: number; sum: number; n: number }

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

  constructor(
    readonly ctx: DocContext, readonly full: FullDocument, readonly totalPagesGuess: number,
    /** página exibida de cada indicador (passada anterior) — PAGEREF */
    readonly marksGuess: Map<string, string> = new Map(),
    /** flutuantes tardios (passada anterior): índice da página → objetos */
    readonly lateFloats: Map<number, Run[]> = new Map(),
    /** tabelas flutuantes tardias (passada anterior): bloco → página e y de referência */
    readonly lateTables: Map<number, LateTable> = new Map(),
    /** colunas equilibradas: seção → página e altura (busca em layoutDocument) */
    readonly balance: Map<number, BalanceSpec> = new Map(),
  ) {}

  /** seções de várias colunas seguidas de seção contínua: o que ocupam na última página */
  balanceFound = new Map<number, BalanceInfo>();
  /** alturas usadas pelas colunas já encerradas na porção da seção nesta página */
  private colUsed: number[] = [];
  /** fundo do corpo antes do limite de coluna equilibrada (restaurado na seção seguinte) */
  private balanceSaved: number | null = null;

  /** Limita a altura das colunas na última página de uma seção equilibrada. */
  private applyBalance(): void {
    const spec = this.balance.get(this.cur.geom.index);
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

  /** SEQ id [\* formato] [\r n] [\c] [\h] — contadores na ordem do documento. */
  private seqValue(instr: string): string | undefined {
    const tok = instr.trim().split(/\s+/);
    const id = tok[1]?.toLowerCase();
    if (!id || id.startsWith('\\')) return undefined;
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

  /** REF indicador: o texto do parágrafo do indicador (os do sumário cobrem o título inteiro). */
  private refValue(instr: string): string | undefined {
    const tok = instr.trim().split(/\s+/);
    const bm = tok[1];
    if (!bm || /\\p\b/i.test(instr)) return undefined; // posição (acima/abaixo): mantém o cache
    if (/\\[nrw]\b/i.test(instr)) {
      // número do parágrafo: o Word recalcula na exportação; sem os pontos finais,
      // e "0" se o parágrafo do indicador não é numerado (oráculo numbering3, ref-num)
      const bi = this.full.bookmarks?.get(bm);
      if (bi === undefined || this.full.blocks[bi]?.type !== 'paragraph') return undefined;
      const t = this.listNumberOf(bi);
      return t ? t.replace(/\.+$/, '') : '0';
    }
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== undefined ? this.full.blocks[b] : undefined;
    if (!blk || blk.type !== 'paragraph') return undefined;
    const text = blk.paragraph.runs.map((x) => (x.field || x.image || x.textbox ? '' : x.text)).join('').replace(/[\t\n\f\u000B]/g, ' ').trim();
    return text || undefined;
  }

  /** texto do número de lista de cada parágrafo do corpo (bloco → texto), na ordem do documento */
  private listTexts?: Map<number, string>;
  private listNumberOf(block: number): string | undefined {
    if (!this.listTexts) {
      const out = new Map<number, string>();
      const saved = this.ctx.numbering;
      const st = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      this.ctx.numbering = st;
      const num = (para: Paragraph): string => {
        const n = resolvePPr(this.ctx, para, {}).ppr.numPr;
        return (n?.numId ? st.next(n.numId, n.ilvl ?? 0)?.text : undefined) ?? '';
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

  /** Página exibida (já formatada) do parágrafo de cada indicador. */
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
    // PDF do Word aberto e exportado direto: os parágrafos formatados na abertura
    // guardam o número; depois deles, as listas com startOverride recomeçam
    // (oráculo numbering3, pg2-*). Na abertura a 1ª página vai até o bloco que
    // transborda para a 2ª — e sem descontar o cabeçalho que empurra o corpo:
    // cabe mais essa altura (pg2-header).
    let numReopen = 0; // 0: 1ª página; 1: na 2ª, até o limite da abertura; 2: esquecer; 3: feito
    let openLimit = 0;
    const toPage2 = (): void => {
      const p1 = this.pages[0]!, p2 = this.pages[1]!;
      openLimit = p2.bodyTop + Math.max(0, p1.bodyTop - p1.geom.marT);
      numReopen = 1;
    };
    const pastOpen = (): void => {
      if (numReopen === 1 && (this.cur !== this.pages[1] || this.y >= openLimit)) numReopen = 2;
    };
    for (const g of this.geoms) {
      if (g.index === 0 || g.type !== 'continuous') {
        const lastAfter = this.prev ? this.prev.after : 0;
        this.newPage(g, g.type);
        // seção nova (próxima página/par/ímpar): o 1º parágrafo mantém o espaço
        // antes, descontado o "depois" do último da seção anterior (tocref-sectgap)
        if (g.index > 0) this.topGapPrevAfter = lastAfter;
      } else this.continuousSection(g);
      for (let b = g.blocks[0]; b <= g.blocks[1] && b < full.blocks.length; b++) {
        const block = full.blocks[b]!;
        // quebra de seção: a 2ª página começa neste bloco
        if (numReopen === 0 && this.pages.length >= 2) { toPage2(); pastOpen(); }
        if (numReopen === 2) { this.ctx.numbering.forgetFirstUse(); numReopen = 3; }
        if (block.type === 'paragraph') this.placeParagraph(block.paragraph, `b${b}`, b, g);
        else this.placeTable(block, `b${b}`, b);
        if (numReopen === 0 && this.pages.length >= 2) toPage2();
        pastOpen();
      }
    }
    // tabela flutuante dividida no fim do documento: as linhas restantes ganham páginas
    for (let k = 0; k < 100 && this.floatCarry.length && this.cur; k++) this.newPage(this.cur.geom);
    if (this.cur) this.paintNotes(this.cur);
    // finaliza páginas (cabeçalhos/rodapés já entram na criação)
    // fundo da página (w:background): o Word o grava no PDF (corpus); branco = nada
    const bgSpec = full.background;
    const bg = bgSpec ? resolveColor({ ...(bgSpec.color ? { val: bgSpec.color } : {}), ...(bgSpec.themeColor ? { themeColor: bgSpec.themeColor } : {}), ...(bgSpec.themeTint ? { themeTint: bgSpec.themeTint } : {}), ...(bgSpec.themeShade ? { themeShade: bgSpec.themeShade } : {}) }, this.ctx.fmt.theme) : undefined;
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
      ps.page.hfItems = hfLayer.length;
      if (bg && bg.toUpperCase() !== 'FFFFFF' && bg !== 'auto') ps.page.background = bg;
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
    return {
      index: i, pageW, pageH, marL, marR,
      marT: sp.marginTopTwips, marB: sp.marginBottomTwips,
      hdr: sp.headerDistanceTwips ?? 720, ftr: sp.footerDistanceTwips ?? 720,
      cols, colSep: !!sp.cols?.sep, titlePg: !!sp.titlePg,
      type: s.sect?.type ?? 'nextPage',
      ...(s.sect?.vAlign ? { vAlign: s.sect.vAlign } : {}),
      ...(sp.pgNumStart !== undefined ? { pgStart: sp.pgNumStart } : {}),
      ...(s.sect?.pgNumFmt ? { pgFmt: s.sect.pgNumFmt } : {}),
      headers: pick(hb, prev?.headers),
      footers: pick(fb, prev?.footers),
      blocks: [s.blockStart, s.blockEnd],
      ...(s.sect?.docGrid && (s.sect.docGrid.type === 'lines' || s.sect.docGrid.type === 'linesAndChars') && (s.sect.docGrid.linePitch ?? 0) > 0
        ? { linePitch: s.sect.docGrid.linePitch } : {}),
      ...(s.sect?.lnNumType ? { lnNum: {
        countBy: Math.max(1, s.sect.lnNumType.countBy ?? 1),
        start: s.sect.lnNumType.start ?? 0,
        restart: s.sect.lnNumType.restart ?? 'newPage',
        distance: s.sect.lnNumType.distance ?? 360,
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
    if (this.floatCarry.length) this.placeFloatCarry();
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
    if (this.cur) this.paintNotes(this.cur);
    this.pages.push(ps);
    this.cur = ps;
    this.colMaxY = 0;
    this.layoutHeaderFooter(ps);
    ps.bodyBottomBase = ps.bodyBottom;
    // continuação de nota partida na página anterior: primeiro no pé desta (oráculo fncont)
    if (this.noteCarry.length) {
      for (const n of this.noteCarry) {
        if (!ps.notes.length) ps.noteArea += this.separatorHeight();
        ps.notes.push(n);
        ps.noteArea += n.content.height;
      }
      this.noteCarry = [];
      ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
    }
  }

  private continuousSection(g: SectGeom): void {
    // a seção que termina (várias colunas): o que ocupou nesta página (equilíbrio)
    const ending = this.cur.geom;
    if (ending.cols.length > 1) {
      const used = [...this.colUsed, this.y - this.colTop];
      this.balanceFound.set(ending.index, { page: this.pages.length - 1, colTop: this.colTop, bottom: this.balanceSaved ?? this.cur.bodyBottom, sum: used.reduce((a, b) => a + Math.max(0, b), 0), n: ending.cols.length });
    }
    if (this.balanceSaved !== null) { this.cur.bodyBottom = this.balanceSaved; this.balanceSaved = null; }
    this.colUsed = [];
    // mesma página; nova geometria de colunas a partir do fim da coluna mais
    // ALTA da seção anterior (corpus t89)
    this.y = Math.max(this.y, this.colMaxY);
    this.colMaxY = 0;
    this.cur.geom = g;
    this.col = 0;
    this.colTop = this.y;
    this.applyBalance();
    // o espaço "depois" do último parágrafo da seção anterior colapsa com o
    // "antes" do 1º desta, como entre parágrafos (oráculo colbreak, cb-textsect-*)
  }

  private colFrame(): { x: number; w: number } {
    const c = this.cur.geom.cols[this.col] ?? this.cur.geom.cols[0]!;
    return { x: c.x, w: c.w };
  }

  /** Fim da coluna: próxima coluna ou nova página. */
  private breakColumn(): void {
    const g = this.cur.geom;
    if (this.col < g.cols.length - 1) {
      this.colUsed.push(this.y - this.colTop);
      this.colMaxY = Math.max(this.colMaxY, this.y);
      this.col++;
      this.y = this.colTop;
      this.atTop = true;
      this.prev = null;
    } else this.newPage(g);
  }

  // ───────────────────────── cabeçalho / rodapé ─────────────────────────

  private fieldValue(ps: PageState): (name: string, instr?: string) => string | undefined {
    return (name: string, instr?: string) => {
      if (name === 'PAGEREF') {
        this.usedPageRef = true;
        const bm = (instr ?? '').trim().split(/\s+/)[1];
        return bm ? this.marksGuess.get(bm) : undefined;
      }
      if (name === 'SEQ') return this.seqValue(instr ?? '');
      if (name === 'REF') return this.refValue(instr ?? '');
      if (name === 'PAGE') return formatNumber(ps.page.number, ps.geom.pgFmt ?? 'decimal', this.ctx.opts.lang);
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
    const env: ParaEnv = { field: this.fieldValue(ps) };
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
        if (b.paragraph.ppr?.markDeleted && !join && bi < n - 1 && blocks[bi + 1]!.type === 'paragraph') {
          delRuns = [...(delRuns ?? []), ...b.paragraph.runs];
          return;
        }
        if (b.paragraph.ppr?.markDeleted && !b.paragraph.runs.length && !join && !delRuns) return;
        const merged = delRuns ? { ...b.paragraph, runs: [...delRuns, ...b.paragraph.runs] } : b.paragraph;
        delRuns = null;
        const para = join ? this.joinHidden(join, merged, env) : merged;
        const p = prepareParagraph(this.ctx, para, { ...env, noPageBreaks: true, ...(join ? { numbering: false } : {}) });
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
            lines.push(lineRecord(`${ref}/b${bi}`, p, l, x, y));
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
   * Número da linha (w:lnNumType) — medido no Word (oráculo lnnum): só linhas
   * do corpo (tabela e parágrafo com suppressLineNumbers não contam), vazio
   * conta; o 1º número é start+1; alinhado à direita em (coluna − distância,
   * auto = 360tw), mesma baseline, estilo Normal + "Line Number".
   */
  private paintLineNumber(colX: number, baseline: number): void {
    const ln = this.cur.geom.lnNum!;
    const restart = ln.restart === 'continuous' ? this.lnSect < 0
      : ln.restart === 'newSection' ? this.lnSect !== this.cur.geom.index
        : this.lnPage !== this.cur;
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
    paintLine(this.ctx, this.cur.body, line, x, baseline - line.baseline);
  }

  /** Sombreamento/bordas do parágrafo — inseridos em `at` (antes do texto já pintado). */
  private paintBox(out: PageItem[], p: PreparedPara, x: number, width: number, top: number, bottom: number, prev: PrevPara | null, at = out.length, groupedNext = false): void {
    const hasFill = !!(p.ppr.shd && ((p.ppr.shd.fill && p.ppr.shd.fill !== 'auto') || p.ppr.shd.themeFill));
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
    if (para0.ppr?.markDeleted && !this.pendingJoin && blockIdx < g.blocks[1] && this.full.blocks[blockIdx + 1]?.type === 'paragraph') {
      this.pendingDel = [...(this.pendingDel ?? []), ...para0.runs];
      return;
    }
    if (para0.ppr?.markDeleted && !para0.runs.length && !this.pendingJoin && !this.pendingDel) return;
    const join = this.pendingJoin;
    this.pendingJoin = null;
    const env: ParaEnv = { field: this.fieldValue(this.cur) };
    const merged = this.pendingDel ? { ...para0, runs: [...this.pendingDel, ...para0.runs] } : para0;
    this.pendingDel = null;
    const para = join ? this.joinHidden(join, merged, env) : merged;
    const p = prepareParagraph(this.ctx, para, join ? { ...env, numbering: false } : env);
    if (join) p.marker = join.marker;
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
    if (blockIdx === g.blocks[1] && !p.glyphs.length && this.geoms[g.index + 1]?.type === 'continuous'
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
        this.cur.page.lines.push(lineRecord(ref, p, f.line, f.frameX, f.y));
      }
      const last = frag[frag.length - 1]!;
      let bottom = last.y + last.line.height;
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

  private noteCache = new Map<number, CellContent>();

  /** Conteúdo diagramado de uma nota (largura do corpo da página). */
  private noteContent(id: number): CellContent {
    let c = this.noteCache.get(id);
    if (!c) {
      const g = this.cur.geom;
      const blocks: Block[] = this.full.footnoteBlocks?.get(id) ?? (this.full.footnotes.get(id) ?? []).map((paragraph) => ({ type: 'paragraph', paragraph }));
      const num = this.ctx.footnoteNumber(id);
      const saved = this.ctx.numbering;
      this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
      try {
        c = this.layoutStatic(blocks, g.marL, g.pageW - g.marL - g.marR, {
          field: (name) => (name === 'FOOTNOTEREF_MARK' ? String(num) : this.fieldValue(this.cur)(name)),
        }, `fn${id}`);
      } finally { this.ctx.numbering = saved; }
      this.noteCache.set(id, c);
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
    const ids = this.rowNoteIds(row);
    if (!ids.length) return 0;
    let extra = this.cur.notes.length ? 0 : this.separatorHeight();
    for (const id of ids) extra += this.noteContent(id).height;
    return extra;
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

  /** Altura do separador (1 linha do estilo Normal). */
  private separatorHeight(): number {
    // linha SIMPLES da fonte do Normal, sem espaçamento (o pPr do separador e a
    // entrelinha do Normal não contam — oráculo fnsep)
    const ppr = { spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' as const } };
    const p = prepareParagraph(this.ctx, { runs: [], props: paraPropsFromPPr(ppr), ppr }, {});
    return new LineBreaker(this.ctx, p).next({ left: 0, right: 10000 }).height;
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
    if (!ids.length) return { ids, extra: 0 };
    let extra = this.cur.notes.length ? 0 : this.separatorHeight();
    for (const id of ids) extra += this.noteContent(id).height;
    return { ids, extra };
  }

  private reserveNotes(ids: number[], cut?: NoteCut | null): void {
    const ps = this.cur;
    for (const id of ids) {
      if (ps.notes.some((n) => n.id === id)) continue;
      if (!ps.notes.length) ps.noteArea += this.separatorHeight();
      const content = cut && cut.id === id ? cut.first : this.noteContent(id);
      ps.notes.push({ id, content });
      ps.noteArea += content.height;
      if (cut && cut.id === id) this.noteCarry.push({ id, content: cut.rest });
    }
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
   */
  private notePartial(ids: number[], bottom: number): NoteCut | null {
    if (!ids.length) return null;
    const ps = this.cur;
    let h = ps.notes.length ? 0 : this.separatorHeight();
    for (const id of ids.slice(0, -1)) h += this.noteContent(id).height;
    const id = ids[ids.length - 1]!;
    const avail = ps.bodyBottom - bottom - h;
    if (avail <= 0) return null;
    const sp = splitContent(this.noteContent(id), avail);
    return sp && sp[0].lines.length && sp[1].lines.length ? { id, first: sp[0], rest: sp[1] } : null;
  }

  /** Separador + notas, alinhados ao fundo do corpo (medido no Word). */
  private paintNotes(ps: PageState): void {
    if (!ps.notes.length) return;
    const g = ps.geom;
    let y = ps.bodyBottomBase - ps.noteArea;
    const sepH = this.separatorHeight();
    // traço de 2" (144 pt) na altura do meio-x da linha do separador
    const ly = y + sepH * 0.62;
    ps.body.push({ t: 'line', x1: g.marL, y1: ly, x2: g.marL + 2880, y2: ly, color: '000000', widthPt: 0.5 });
    y += sepH;
    for (const n of ps.notes) {
      for (const it of n.content.items) ps.body.push(shiftItem(it, y));
      y += n.content.height;
    }
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
      this.emitFloatRows(c.t, c.rows, c.fp, this.cur, c.refX, this.cur.bodyTop, items, 0, true, true);
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
    this.y += row.height;
    this.atTop = false;
  }

  // ───────────────────────── objetos flutuantes ─────────────────────────

  /** Quadro de uma linha descontando floats com contorno (wrap) que a cruzam. */
  private wrapFrame(frame: { left: number; right: number }, frameX: number, y: number, lineH = 240, ps: PageState = this.cur): WrapFrame {
    const floats = ps.floats;
    if (!floats.length) return frame;
    const { left, right } = frame;
    let skipTo: number | undefined;
    // intervalos livres da linha: o quadro menos a faixa de cada flutuante que a cruza
    let free: [number, number][] = [[left, right]];
    let hit = false;
    let minBottom = Infinity;
    for (const f of floats) {
      if (f.wrap !== 'square' && f.wrap !== 'tight' && f.wrap !== 'through' && f.wrap !== 'topAndBottom') continue;
      if (f.bodyOnly && this.inHf) continue;
      const top = f.y - f.distT, bottom = f.y + f.h + f.distB;
      // (o Word compara em twips inteiros — 0,02pt de sobreposição não desvia;
      // 1 twip (moldura com y=1, oráculo frames) e 0,15pt desviam)
      if (y + lineH <= top + 0.5 || y >= bottom - 0.5) continue;
      const fl = f.x - f.distL - frameX, fr = f.x + f.w + f.distR - frameX;
      if (fr <= left || fl >= right) continue;
      if (f.wrap === 'topAndBottom') { skipTo = Math.max(skipTo ?? 0, bottom); continue; }
      hit = true;
      minBottom = Math.min(minBottom, bottom);
      // wrapText: o texto passa só de um lado — o outro também fica bloqueado
      // (largest: o vão maior; oráculo wrapsides)
      let bl = fl, bh = fr;
      const side = f.side ?? 'bothSides';
      if (side === 'left') bh = Infinity;
      else if (side === 'right') bl = -Infinity;
      else if (side === 'largest') { if (fl - left >= right - fr) bh = Infinity; else bl = -Infinity; }
      const next: [number, number][] = [];
      for (const [a, b] of free) {
        if (bh <= a || bl >= b) { next.push([a, b]); continue; }
        if (bl > a) next.push([a, bl]);
        if (bh < b) next.push([bh, b]);
      }
      free = next;
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
      const ext = (a: number, b: number): [number, number] => cR === Infinity ? [a, b] : [a <= left + 0.5 ? Math.min(a, cL) : a, b >= right - 0.5 ? Math.max(b, cR) : b];
      free = free.filter(([a, b]) => { const [ea, eb] = ext(a, b); return Math.min(eb, cR) - Math.max(ea, cL) >= MIN_GAP; });
      let best: [number, number] | undefined;
      for (const iv of free) if (!best || iv[1] - iv[0] > best[1] - best[0]) best = iv;
      // sem espaço útil ao lado: a linha desce até o fim do 1º objeto que a bloqueia
      if (!best) skipTo = Math.max(skipTo ?? 0, minBottom);
      // objeto no meio: o texto ocupa os vãos da esquerda para a direita (wrapsides)
      else if (skipTo === undefined) return { left: best[0], right: best[1], gap: true, ...(free.length > 1 ? { segs: free } : {}) };
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
    const anchor: DrawingAnchor | undefined = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
    let w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
    let h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
    const behind = !!anchor?.behindDoc || !!run.image?.behindDoc || !!run.textbox?.behindDoc;
    // conteúdo da caixa de texto (altura automática)
    let tbContent: CellContent | null = null;
    /** diagramação final do conteúdo da caixa já no lugar: flutuantes DENTRO dela
     *  ficam relativos à caixa (antes iam para a origem da página) */
    let tbFinal: ((bx: number, by: number) => CellContent) | null = null;
    if (run.textbox) {
      const tb = run.textbox;
      const ins = tbInsets(tb, this.ctx.fmt.theme, w, h);
      const blocks: Block[] = tb.blocks ?? tb.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
      const env: ParaEnv = { field: this.fieldValue(ps), darkBackground: isDark(resolveDrawingColor(run.textbox.shape?.fill, this.ctx.fmt.theme)) };
      let inner = w - ins.l - ins.r;
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
      tbFinal = (bx, by) => {
        const prevDx = this.staticDx;
        this.staticDx = bx + ins.l;
        try { return this.layoutStatic(blocks, 0, iw, env, 'txbx', ps, by + ins.t); } finally { this.staticDx = prevDx; }
      };
      // ajuste automático: a altura é a do texto (o cy gravado pode estar desatualizado)
      if (tb.autoFit) h = tbContent.height + ins.t + ins.b;
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
    const obj: PlacedObject = { run, x, y, w, h, layer: behind ? 'behind' : 'front', hf: this.inHf };
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
        const ins = tbInsets(r.textbox, this.ctx.fmt.theme, w, h);
        const blocks: Block[] = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
        tc = this.layoutStatic(blocks, 0, Math.max(1, w - ins.l - ins.r), { darkBackground: isDark(resolveDrawingColor(r.textbox.shape?.fill, this.ctx.fmt.theme)) }, 'itb', ps);
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
      out.push({ t: 'clip', op: 'push', x, y, w, h }, ...renderEmf(this.ctx, run.image.data, { x, y, w, h }), { t: 'clip', op: 'pop' });
    } else if (run.image && isWmf(run.image.data)) {
      out.push({ t: 'clip', op: 'push', x, y, w, h }, ...renderWmf(this.ctx, run.image.data, { x, y, w, h }), { t: 'clip', op: 'pop' });
    } else if (run.image) {
      const im = run.image;
      out.push({
        t: 'image', x, y, w, h, image: im,
        ...(im.crop ? { crop: im.crop } : {}),
        ...(im.style?.rot ? { rot: im.style.rot } : {}),
        ...(im.style?.flipH ? { flipH: true } : {}),
        ...(im.style?.flipV ? { flipV: true } : {}),
      });
    } else if (run.shape) {
      const s = run.shape.style;
      const fill = resolveDrawingColor(s.fill, theme);
      // linha do estilo (lnRef sem a:ln@w): a espessura é a da linha do tema (oráculo txbxln)
      const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
      const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: lw!, ...(s.line.dash ? { dash: s.line.dash } : {}) } : undefined;
      out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...(run.shape.line ? { line: run.shape.line } : {}), ...shapeExtras(s, theme) });
    } else if (run.textbox) {
      const tb = run.textbox;
      const s = tb.shape;
      if (s && (s.fill || s.line)) {
        const fill = resolveDrawingColor(s.fill, theme);
        // linha do estilo (lnRef sem a:ln@w): a espessura é a da linha do tema (oráculo txbxln)
        const lw = s.line?.ref ? this.ctx.fmt.theme.lineWidthsPt?.[s.line.ref - 1] ?? s.line.widthPt : s.line?.widthPt;
        const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: lw! } : undefined;
        out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...shapeExtras(s, theme) });
      }
      if (tbContent) {
        const ins = tbInsets(tb, this.ctx.fmt.theme, w, h);
        // caixa girada: o conteúdo gira em torno do centro (a forma já gira no pintor)
        const rot = tb.rot ?? s?.rot ?? 0;
        if (rot) out.push({ t: 'xform', op: 'push', m: rotation(x + w / 2, y + h / 2, rot) });
        if (tb.wordArt && tbContent.lines.length) {
          // WordArt (textPlain): o texto estica para preencher a caixa interna
          const x0 = Math.min(...tbContent.lines.map((l) => l.x)), x1 = Math.max(...tbContent.lines.map((l) => l.x + l.width));
          const iw = Math.max(1, w - ins.l - ins.r), ih = Math.max(1, h - ins.t - ins.b);
          const sx = iw / Math.max(1, x1 - x0), sy = ih / Math.max(1, tbContent.height);
          out.push({ t: 'xform', op: 'push', m: [sx, 0, 0, sy, x + ins.l - x0 * sx, y + ins.t] });
          // o Word grava o texto do WordArt como CURVAS no PDF (não é texto extraível)
          for (const it of tbContent.items) out.push(it.t === 'glyphs' ? { ...it, asPath: true } : it);
          out.push({ t: 'xform', op: 'pop' });
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
      }
    } else if (run.group) {
      const gr = run.group;
      for (const item of gr.items) {
        // rotação/espelho do grupo aplicados ao filho (oráculo de formas)
        const { run: r, x: ix, y: iy, w: iw, h: ih } = groupChild(gr, item, x, y, w, h);
        let tc: CellContent | null = null;
        if (r.textbox) {
          const ins = tbInsets(r.textbox, this.ctx.fmt.theme, iw, ih);
          const blocks: Block[] = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
          tc = this.layoutStatic(blocks, 0, Math.max(1, iw - ins.l - ins.r), { darkBackground: isDark(resolveDrawingColor(r.textbox.shape?.fill, this.ctx.fmt.theme)) }, 'grp', ps);
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

/** Retângulo de texto da forma predefinida (txRect das definições do DrawingML), como recuo
 *  de cada lado da caixa w × h — o Word põe o texto nele (oráculo txrect) */
function textRectInsets(g: { prst: string; adj?: Record<string, number> }, w: number, h: number): { l: number; t: number; r: number; b: number } | null {
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

function lineRecord(ref: string, p: PreparedPara, line: Line, frameX: number, top: number): LaidOutLine {
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
  return {
    ref, start, end,
    x: frameX + line.xStart, y: top, height: line.height, baseline: top + line.baseline, width: line.width,
    chars,
  };
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
    if (it.t !== 'glyphs' || !it.glyphs.length) continue;
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
    ...ps, page: { ...ps.page, items: [], lines: [], objects: [] },
    behind: [], hf: [], body: [], front: [], hfBehind: [], hfFront: [], floats: [...ps.floats], notes: [],
  };
}
