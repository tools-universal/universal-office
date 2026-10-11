import type {
  FullDocument, Block, Paragraph, TableBlock, Section, SectPr, Run, PBdr, DrawingAnchor, TableCell,
} from '@universal-office/docx-core';
import { runPropsFromRPr } from '@universal-office/docx-core';
import { DocContext, emptyFormatting, directPPr, type LayoutOptions, type FlowState } from './context.js';
import { faceMetrics, type FontProvider } from './fonts.js';
import { prepareParagraph, resolvePPr, isDark, paraVisibility, type PreparedPara, type ParaEnv } from './para.js';
import { LineBreaker, type Line } from './lines.js';
import { paintLine, paintParaBox, borderWidth } from './paint.js';
import { layoutTable, shiftItem, isHiddenRow, type TableLayout, type CellContent } from './table.js';
import type { LayoutPage, LayoutResult, PageItem, LaidOutLine, PlacedObject } from './tree.js';
import { resolveColor, resolveDrawingColor } from './resolve.js';
import { formatNumber } from './numbering.js';
import { NumberingState } from './numbering.js';
import { isEmf, renderEmf } from './emf.js';

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
  distL: number; distR: number; distT: number; distB: number;
}

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

export function layoutDocument(full: FullDocument, provider: FontProvider, opts: LayoutOptions = {}): LayoutResult {
  const fmt = full.formatting ?? emptyFormatting();
  // NUMPAGES e PAGEREF dependem do próprio layout: a 1ª passada estima, as
  // seguintes usam o total de páginas e as páginas dos indicadores da anterior
  let total = 1;
  let marks = new Map<string, string>();
  let result: LayoutResult | null = null;
  for (let pass = 0; pass < 4; pass++) {
    const ctx = new DocContext(fmt, provider, opts);
    const eng = new Engine(ctx, full, total, marks);
    result = eng.run();
    const newMarks = eng.usedPageRef ? eng.bookmarkPages() : marks;
    const stable = (!eng.usedNumPages || result.pages.length === total)
      && (!eng.usedPageRef || sameMap(newMarks, marks));
    if (stable) break;
    total = result.pages.length;
    marks = newMarks;
  }
  return result!;
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
  ) {}

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
    if (!bm || /\\[nrwp]\b/i.test(instr)) return undefined; // número de parágrafo / posição: mantém o cache
    const b = this.full.bookmarks?.get(bm);
    const blk = b !== undefined ? this.full.blocks[b] : undefined;
    if (!blk || blk.type !== 'paragraph') return undefined;
    const text = blk.paragraph.runs.map((x) => (x.field || x.image || x.textbox ? '' : x.text)).join('').replace(/[\t\n\f\u000B]/g, ' ').trim();
    return text || undefined;
  }

  /** Página exibida (já formatada) do parágrafo de cada indicador. */
  bookmarkPages(): Map<string, string> {
    const out = new Map<string, string>();
    const firstPage = new Map<number, LayoutPage>();
    for (const ps of this.pages) {
      for (const l of ps.page.lines) {
        const m = /^b(\d+)/.exec(l.ref);
        if (m && !firstPage.has(+m[1]!)) firstPage.set(+m[1]!, ps.page);
      }
    }
    for (const [name, block] of this.full.bookmarks ?? []) {
      // indicador em bloco sem linha (vazio): a próxima linha diagramada
      let pg: LayoutPage | undefined;
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
    for (const g of this.geoms) {
      if (g.index === 0 || g.type !== 'continuous') this.newPage(g, g.type);
      else this.continuousSection(g);
      for (let b = g.blocks[0]; b <= g.blocks[1] && b < full.blocks.length; b++) {
        const block = full.blocks[b]!;
        if (block.type === 'paragraph') this.placeParagraph(block.paragraph, `b${b}`, b, g);
        else this.placeTable(block, `b${b}`, b);
      }
    }
    // tabela flutuante dividida no fim do documento: as linhas restantes ganham páginas
    for (let k = 0; k < 100 && this.floatCarry.length && this.cur; k++) this.newPage(this.cur.geom);
    if (this.cur) this.paintNotes(this.cur);
    // finaliza páginas (cabeçalhos/rodapés já entram na criação)
    const pages: LayoutPage[] = this.pages.map((ps) => {
      // camadas do Word: TODO o cabeçalho/rodapé (atrás, texto, frente) fica
      // abaixo do documento; no corpo, atrás do texto < texto < na frente
      const hfLayer = [...zItems(ps.hfBehind), ...ps.hf, ...zItems(ps.hfFront)];
      ps.page.items = [...hfLayer, ...zItems(ps.behind), ...ps.body, ...zItems(ps.front)];
      ps.page.hfItems = hfLayer.length;
      return ps.page;
    });
    return { pages, warnings: [...this.ctx.warnings] };
  }

  // ───────────────────────── seções e páginas ─────────────────────────

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
    this.atTop = true;
    this.prev = null;
    if (this.floatCarry.length) this.placeFloatCarry();
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
    this.layoutHeaderFooter(ps);
    ps.bodyBottomBase = ps.bodyBottom;
  }

  private continuousSection(g: SectGeom): void {
    // mesma página; nova geometria de colunas a partir do y atual
    this.cur.geom = g;
    this.col = 0;
    this.colTop = this.y;
    this.prev = null;
  }

  private colFrame(): { x: number; w: number } {
    const c = this.cur.geom.cols[this.col] ?? this.cur.geom.cols[0]!;
    return { x: c.x, w: c.w };
  }

  /** Fim da coluna: próxima coluna ou nova página. */
  private breakColumn(): void {
    const g = this.cur.geom;
    if (this.col < g.cols.length - 1) {
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
    const env: ParaEnv = { field: this.fieldValue(ps), numbering: false };
    const width = g.pageW - g.marL - g.marR;
    // numeração em cabeçalho/rodapé não avança a lista do corpo
    const savedNum = this.ctx.numbering;
    this.ctx.numbering = new NumberingState(this.ctx.fmt.numbering, this.ctx.fmt.styles.styles, this.ctx.opts.lang);
    this.inHf = true;
    try {
      const hdr = pick(g.headers);
      if (hdr?.length) {
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
  layoutStatic(blocks: Block[], x: number, width: number, env: ParaEnv, ref: string, ps?: PageState, yOrigin = 0, nb?: CellNeighbors): CellContent {
    const items: PageItem[] = [];
    const lines: LaidOutLine[] = [];
    let y = 0;
    let prev: PrevPara | null = null;
    let keepNext = false;
    const n = blocks.length;
    const isHf = !!ps && /^(hdr|ftr):\w+$/.test(ref);
    // cabeçalho/rodapé (também nas medições sem página): o "depois" automático do
    // último parágrafo conta na altura — só na célula ele some (oráculo autosp)
    const hfFlow = /^(hdr|ftr):\w+$/.test(ref);
    if (isHf) {
      // cabeçalho/rodapé: flutuantes com posição vertical absoluta (página/margem)
      // vão primeiro — o conteúdo ANTES da âncora também os contorna (medido no Word)
      for (const b of blocks) {
        if (b.type !== 'paragraph') continue;
        for (const run of b.paragraph.runs) {
          const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
          const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
          if (!fl || !anc || !ABSOLUTE_V.has(anc.posV.relativeFrom ?? '') || this.onlyTextFloats) continue;
          this.placeFloat(run, ps!, x, width, yOrigin, items, yOrigin);
          this.prePlaced.add(run);
        }
      }
    }
    /** runs de parágrafos de marca oculta que se juntam ao seguinte */
    let join: Run[] | null = null;
    blocks.forEach((b, bi) => {
      if (b.type === 'paragraph') {
        const para = join ? { ...b.paragraph, runs: [...join, ...b.paragraph.runs] } : b.paragraph;
        join = null;
        const p = prepareParagraph(this.ctx, para, { ...env, noPageBreaks: true });
        // marca oculta (fora o último bloco): sem conteúdo visível não ocupa nada;
        // com conteúdo, junta-se ao parágrafo seguinte (oráculo hidden)
        if (p.markStyle.hidden && bi < n - 1) {
          if (!p.glyphs.length) return;
          if (blocks[bi + 1]!.type === 'paragraph') { join = para.runs; return; }
        }
        if (p.keepNext) keepNext = true;
        const firstInCell = bi === 0;
        const lastInCell = bi === n - 1;
        let before = p.beforeAuto ? (firstInCell ? 0 : 280) : p.spaceBefore;
        let prevAfter = prev ? prev.after : 0;
        if (prev && prev.styleId === p.styleId) {
          if (prev.contextual) prevAfter = 0;
          if (p.contextual) before = 0;
        }
        // 1º parágrafo da célula: o vizinho anterior é o parágrafo antes da tabela, o
        // último da célula anterior ou a marca de fim de linha (oráculo autosp2)
        if (bi === 0 && nb?.prev && p.contextual && nb.prev.styleId === p.styleId) before = 0;
        y += this.collapse(prevAfter, before);
        const top = y;
        const br = new LineBreaker(this.ctx, p);
        const frame0 = { left: p.indLeft, right: width - p.indRight };
        // cabeçalho/rodapé: os flutuantes do parágrafo são posicionados ANTES das
        // linhas e o texto (inclusive o do próprio parágrafo) os contorna — oráculo hffloat
        const hfWrap = !!ps && /^(hdr|ftr):\w+$/.test(ref);
        if (hfWrap) this.placeFloats(p, ps!, x, width, yOrigin + top, items, yOrigin);
        const boxTop = y;
        const boxAt = items.length;
        y += this.borderTopExtent(p, prev);
        do {
          let frame: { left: number; right: number; skipTo?: number } = frame0;
          if (hfWrap) {
            const lh = markLineH(p);
            frame = this.wrapFrame(frame0, x, yOrigin + y, lh, ps);
            for (let k = 0; k < 8 && frame.skipTo !== undefined && frame.skipTo - yOrigin > y; k++) {
              y = frame.skipTo - yOrigin;
              frame = this.wrapFrame(frame0, x, yOrigin + y, lh, ps);
            }
          }
          const line = br.next(frame);
          paintLine(this.ctx, items, line, x, y);
          lines.push(lineRecord(`${ref}/b${bi}`, p, line, x, y));
          y += line.height;
        } while (!br.done());
        const groupedNext = this.groupsWithNext(p, blocks[bi + 1], env);
        y += this.borderBottomExtent(p, groupedNext);
        this.paintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
        // floats ancorados no parágrafo (fora do cabeçalho/rodapé: depois das linhas)
        if (ps && !hfWrap) this.placeFloats(p, ps, x, width, yOrigin + top, items, yOrigin);
        let after = p.afterAuto ? (lastInCell && !hfFlow ? 0 : 280) : p.spaceAfter;
        // último da célula: o vizinho seguinte é o 1º da próxima célula ou a marca de fim de linha
        if (lastInCell && nb?.next && p.contextual && nb.next.styleId === p.styleId) after = 0;
        prev = { after, afterAuto: p.afterAuto, ...(p.styleId ? { styleId: p.styleId } : {}), contextual: p.contextual, ...(p.ppr.pBdr ? { pBdr: p.ppr.pBdr, pBdrKey: bdrKey(p.ppr) } : {}) };
      } else if (b.rows.every((r) => isHiddenRow(this.ctx, r))) {
        // tabela só com linhas ocultas: some (oráculo hidden)
      } else if (b.tblPr?.tblpPr && b.tblPr.tblpPr.tblpYSpec !== 'inline' && ps && /^(hdr|ftr):\w+$/.test(ref)) {
        // tabela flutuante no cabeçalho/rodapé: posição absoluta na página
        const t = layoutTable(this.ctx, b, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
        this.placeFloatingTable(t, b.tblPr.tblpPr, ps, yOrigin + y, x, width, items, yOrigin, false);
      } else {
        y += prev && !this.dropsAfterBeforeTable(prev, b) ? prev.after : 0;
        this.assignCellNeighbors(b, prev ? { ...(prev.styleId ? { styleId: prev.styleId } : {}) } : bi === 0 ? nb?.prev : undefined);
        const t = layoutTable(this.ctx, b, x, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, ps), `${ref}/b${bi}`);
        if (isHf && t.rows[0]) {
          // tabela não contorna: se a 1ª linha cruza um flutuante com quebra, desce para baixo dele
          const h0 = t.rows[0].height;
          for (let k = 0; k < 8; k++) {
            const yy = yOrigin + y;
            const hit = ps!.floats.find((fl) => (fl.wrap === 'topAndBottom' || fl.wrap === 'square' || fl.wrap === 'tight' || fl.wrap === 'through')
              && yy + h0 > fl.y - fl.distT && yy < fl.y + fl.h + fl.distB
              && t.x + t.width > fl.x - fl.distL && t.x < fl.x + fl.w + fl.distR);
            if (!hit) break;
            y = hit.y + hit.h + hit.distB - yOrigin;
          }
        }
        for (const row of t.rows) {
          for (const it of row.items) items.push(shiftItem(it, y));
          for (const it of row.borderItems) items.push(shiftItem(it, y));
          for (const l of row.lines) lines.push({ ...l, y: l.y + y, baseline: l.baseline + y });
          y += row.height;
        }
        prev = this.rowEndPrev();
      }
    });
    // espaço depois do último parágrafo conta na altura (célula/HF)
    if (prev) y += (prev as PrevPara).after;
    return { items, lines, height: y, ...(keepNext ? { keepNext: true } : {}) };
  }

  private layoutCell(cell: TableCell, x: number, width: number, env: { tablePPr?: import('@universal-office/docx-core').PPr; tableRPr?: import('@universal-office/docx-core').RPr; darkBackground?: boolean }, ref: string, ps?: PageState): CellContent {
    const blocks: Block[] = cell.blocks ?? cell.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }));
    const penv: ParaEnv = { ...(env.tablePPr ? { tablePPr: env.tablePPr } : {}), ...(env.tableRPr ? { tableRPr: env.tableRPr } : {}), ...(env.darkBackground ? { darkBackground: true } : {}) };
    if (ps) penv.field = this.fieldValue(ps);
    const c = this.layoutStatic(blocks, x, width, penv, ref, ps, 0, this.cellNb.get(cell));
    // hideMark: a marca da célula vazia não conta na altura da linha (vale a
    // altura mínima da linha) — oráculo hidden
    if (cell.tcPr?.hideMark && blocks.every((b) => b.type === 'paragraph' && !paraVisibility(this.ctx, b.paragraph, penv).visible)) return { ...c, height: 0 };
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
    return (b.top.space ?? 0) * 20 + borderWidth(b.top);
  }

  private borderBottomExtent(p: PreparedPara, groupedNext = false): number {
    const b = p.ppr.pBdr;
    if (groupedNext || !b?.bottom || b.bottom.val === 'none' || b.bottom.val === 'nil') return 0;
    return (b.bottom.space ?? 0) * 20 + borderWidth(b.bottom);
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

  /** Passo da grade de linhas para um parágrafo do corpo (snapToGrid=0 desliga). */
  private gridFor(p: PreparedPara): number | undefined {
    const pitch = this.cur?.geom.linePitch;
    return pitch && p.ppr.snapToGrid !== false ? pitch : undefined;
  }

  /** runs de parágrafos de marca oculta que se juntam ao parágrafo seguinte */
  private pendingJoin: Run[] | null = null;

  private placeParagraph(para0: Paragraph, ref: string, blockIdx: number, g: SectGeom): void {
    const para = this.pendingJoin ? { ...para0, runs: [...this.pendingJoin, ...para0.runs] } : para0;
    this.pendingJoin = null;
    const p = prepareParagraph(this.ctx, para, { field: this.fieldValue(this.cur) });
    // texto oculto (oráculo hidden): parágrafo de marca oculta sem conteúdo visível
    // não ocupa nada (nem linha nem espaçamento); com conteúdo visível, junta-se ao
    // seguinte, que dá as propriedades. O último da seção (quebra) fica como está.
    if (p.markStyle.hidden && blockIdx < g.blocks[1]) {
      if (!p.glyphs.length) return;
      if (this.full.blocks[blockIdx + 1]?.type === 'paragraph') { this.pendingJoin = para.runs; return; }
    }
    const ps0 = this.cur;
    // quebra de página antes
    if (p.pageBreakBefore && !this.atTop) this.newPage(this.cur.geom);
    // keepNext / keepLines: decide antes de colocar a 1ª linha
    const frameBase = this.colFrame();
    const avail = () => this.cur.bodyBottom - this.y;
    let before = p.beforeAuto ? (this.firstInDoc ? 0 : 280) : p.spaceBefore;
    let prevAfter = this.prev ? this.prev.after : 0;
    if (this.prev && this.prev.styleId === p.styleId) {
      if (this.prev.contextual) prevAfter = 0;
      if (p.contextual) before = 0;
    }
    // topo de página (exceto o 1º parágrafo do documento): espaço antes suprimido
    let gap = this.collapse(prevAfter, before);
    if (this.atTop && !this.firstInDoc) gap = 0;
    if (p.keepLines || p.keepNext) {
      const need = gap + this.paragraphHeight(p, frameBase.w) + (p.keepNext ? this.nextBlockLead(blockIdx, g, frameBase.w) : 0);
      const full = this.cur.bodyBottom - this.colTop;
      if (need > avail() && need <= full && !this.atTop) {
        this.breakColumn();
        gap = 0;
      }
    }
    if (!this.atTop || this.firstInDoc) this.y += gap;
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
    /** onde ficou a 1ª linha: os objetos ancorados no parágrafo vão para ESSA
     *  página (não a da última linha — parágrafo com quebra de página no fim) */
    let anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w };
    let early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
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
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y, this.cur.bodyBottom);
      } else {
        this.breakColumn();
        this.y += this.borderTopExtent(p, this.prev);
        anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w };
        early = this.placeFloatsEarly(p, this.cur, this.colFrame().x, this.colFrame().w, this.y);
      }
    }
    let earlyAt = { ps: this.cur, x: this.colFrame().x };
    const earlyRuns = new Set(early.map((e) => e.obj.run));
    // parágrafo VAZIO que carrega a quebra de seção: não desce para a página
    // seguinte, fica pendurado abaixo da margem (oráculo sectfit)
    const hangs = blockIdx === g.blocks[1] && g.index < this.full.sections.length - 1 && p.glyphs.length === 0;
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
      const frame = frameHere();
      const mark = br.mark();
      let line = br.next(frame);
      let noteNeed = this.noteNeed(p, line);
      let pageChanged = false;
      // a entrelinha extra (múltipla > 1, posta abaixo do texto) pode passar da
      // margem inferior — medido no oráculo pagefit
      // linha só com a quebra de página e mais conteúdo depois dela no parágrafo: não
      // ocupa altura no teste — a quebra fica nesta página (oráculo pbfit)
      const breakOnly = line.breakAfter === 'page' && !line.last && line.placed.every((pg) => pg.g.kind === 'pb');
      const fitH = breakOnly ? 0 : p.lineRule === 'exact' || p.lineRule === 'atLeast' ? line.height : Math.min(line.height, line.baseline + line.desc);
      if (this.y + fitH > this.cur.bodyBottom - noteNeed.extra + 0.5 && !this.atTop && !hangs) {
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
        if (allMoved) anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w };
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
        anchorAt = { ps: this.cur, top: this.y, x: this.colFrame().x, w: this.colFrame().w };
      }
      if (pageChanged) {
        // a linha foi quebrada no quadro da página anterior (contorno de objetos): refaz no da nova
        const nf = frameHere();
        if (nf.left !== frame.left || nf.right !== frame.right) {
          br.reset(mark);
          line = br.next(nf);
          noteNeed = this.noteNeed(p, line);
        }
      }
      if (noteNeed.ids.length) this.reserveNotes(noteNeed.ids);
      frag.push({ line, y: this.y, frameX: this.colFrame().x });
      this.y += line.height;
      this.atTop = false;
      first = false;
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
    this.placeFloats(p, anchorAt.ps, anchorAt.x, anchorAt.w, anchorAt.top, anchorAt.ps.body, 0);
    for (const r of earlyRuns) this.prePlaced.delete(r);
    // parágrafo só com quebra de página: o próximo começa no topo
    const lastGlyph = p.glyphs[p.glyphs.length - 1];
    if (lastGlyph?.kind === 'pb') this.atTop = true;
    this.prev = {
      after: p.afterAuto ? 280 : p.spaceAfter,
      afterAuto: p.afterAuto,
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

  /** Altura do separador (1 linha do estilo Normal). */
  private separatorHeight(): number {
    const p = prepareParagraph(this.ctx, { runs: [], props: {} }, {});
    return new LineBreaker(this.ctx, p).next({ left: 0, right: 10000 }).height;
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

  private reserveNotes(ids: number[]): void {
    const ps = this.cur;
    for (const id of ids) {
      if (ps.notes.some((n) => n.id === id)) continue;
      if (!ps.notes.length) ps.noteArea += this.separatorHeight();
      const content = this.noteContent(id);
      ps.notes.push({ id, content });
      ps.noteArea += content.height;
    }
    ps.bodyBottom = ps.bodyBottomBase - ps.noteArea;
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
      if (nb.type === 'table') {
        // título antes de tabela: fica com a 1ª linha (e a seguinte, se a 1ª
        // tiver keepNext) — oráculo keeptbl. Prévia sem página: sem floats.
        const t = layoutTable(this.ctx, nb, 0, width, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref), 'preview');
        const r0 = t.rows[0];
        if (!r0) return 0;
        const startNeed = (r: TableLayout['rows'][number], cap: number) =>
          r.cantSplit || (r.natural ?? r.height) < r.height ? r.height : Math.min(r.height, cap);
        const r1 = t.rows[1];
        return r0.keepNext && r1 ? r0.height + startNeed(r1, 400) : startNeed(r0, r0.natural ?? r0.height);
      }
      const q = prepareParagraph(this.ctx, nb.paragraph, {});
      const gap = this.collapse(0, q.spaceBefore);
      if (q.keepNext) return gap + this.paragraphHeight(q, width) + this.nextBlockLead(blockIdx + 1, g, width);
      const br = new LineBreaker(this.ctx, q, this.gridFor(q));
      return gap + br.next({ left: q.indLeft, right: width - q.indRight }).height;
    } finally {
      this.ctx.restoreFlow(saved);
    }
  }

  // ───────────────────────── tabelas no corpo ─────────────────────────

  private placeTable(table: TableBlock, ref: string, blockIdx = -1): void {
    // tabela só com linhas ocultas: some, sem mexer no espaçamento (oráculo hidden)
    if (table.rows.every((r) => isHiddenRow(this.ctx, r))) return;
    const fr = this.colFrame();
    const fp = table.tblPr?.tblpPr;
    if (fp && fp.tblpYSpec !== 'inline') {
      // tabela flutuante (w:tblpPr): fora do fluxo, o texto seguinte a contorna
      const t = layoutTable(this.ctx, table, 0, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
      // pintada depois do texto do corpo (como o Word: ordem do conteúdo da página)
      const items: PageItem[] = [];
      let flowY = this.y;
      if (fp.vertAnchor !== 'page' && fp.vertAnchor !== 'margin') {
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
        if (!this.atTop && r0 && top + r0.height > this.cur.bodyBottom + 0.5) {
          const avail = this.cur.bodyBottom - top;
          const onlyMin = (r0.natural ?? r0.height) <= avail + 0.5;
          const parts = onlyMin || r0.cantSplit ? null : r0.split?.(avail) ?? null;
          if (!(parts && parts[0].height > 0)) {
            this.breakColumn();
            flowY = this.y;
          }
        }
      }
      this.placeFloatingTable(t, fp, this.cur, flowY, fr.x, fr.w, items, 0, true, true);
      this.cur.front.push({ z: -1, seq: this.zSeq++, items });
      return;
    }
    if (this.prev) {
      this.y += this.atTop || this.dropsAfterBeforeTable(this.prev, table) ? 0 : this.prev.after;
    }
    this.assignCellNeighbors(table, this.prev ? { ...(this.prev.styleId ? { styleId: this.prev.styleId } : {}) } : undefined);
    this.prev = null;
    this.firstInDoc = false;
    const t: TableLayout = layoutTable(this.ctx, table, fr.x, fr.w, (cell, cx, cw, cenv, cref) => this.layoutCell(cell, cx, cw, cenv, cref, this.cur), ref);
    if (blockIdx >= 0) this.pinFloatsOverTable(t, blockIdx);
    this.lastRowEmit = null;
    const headerRows: TableLayout['rows'] = [];
    for (const r of t.rows) { if (r.header) headerRows.push(r); else break; }
    t.rows.forEach((row0, ri) => {
      let row = row0;
      // manter com a próxima: se a próxima linha não puder começar nesta página
      // logo depois desta, esta desce junto (oráculo keeptbl)
      if (row.keepNext && !this.atTop && ri + 1 < t.rows.length) {
        const avail = this.cur.bodyBottom - this.y;
        if (row.height <= avail + 0.5 && !this.rowCanStart(t.rows[ri + 1]!, avail - row.height)) {
          if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
          this.breakColumn();
          if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
        }
      }
      for (let guard = 0; guard < 500; guard++) {
        const avail = this.cur.bodyBottom - this.y;
        if (row.height <= avail + 0.5) break;
        // não cabe: o Word divide a linha (salvo cantSplit) no fim da última linha de
        // texto que cabe — mas se o CONTEÚDO cabe e só a altura mínima não, a linha desce inteira
        const onlyMin = (row.natural ?? row.height) <= avail + 0.5;
        const parts = onlyMin ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          this.emitRow(parts[0]);
          row = parts[1];
        } else if (this.atTop) break; // nem uma linha cabe numa página vazia: coloca assim mesmo
        // a última linha desta página fecha com a borda da divisa
        if (this.lastRowEmit?.row.breakBorderItems) for (const it of this.lastRowEmit.row.breakBorderItems) this.cur.body.push(shiftItem(it, this.lastRowEmit.y));
        this.breakColumn();
        // repete as linhas de cabeçalho da tabela
        if (ri >= headerRows.length) for (const h of headerRows) this.emitRow(h);
      }
      this.emitRow(row);
    });
    // o parágrafo seguinte vê a marca de fim de linha como anterior (contextual)
    this.prev = this.rowEndPrev();
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
      const x = alignPos(anc.posH.align, anc.posH.offset, hRef.x, hRef.w, w, anc.posH.pct, g.pageW);
      const overV = y - (anc.distT ?? 0) < top + H && y + h + (anc.distB ?? 0) > top;
      const overH = x - (anc.distL ?? 0) < t.x + t.width && x + w + (anc.distR ?? 0) > t.x;
      if (!overV || !overH) continue;
      this.pinnedFloats.set(run, { ps: this.cur, y });
      newTop = Math.max(newTop, y + h + (anc.distB ?? 0));
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
    // caixa de referência (o que se alinha): modo 15 = borda externa; antigos = texto
    const refW = legacy ? Math.max(0, t.width - 216) : t.width;
    const [aL, aR] = fp.horzAnchor === 'page' ? [0, g.pageW] : fp.horzAnchor === 'margin' ? [g.marL, g.pageW - g.marR] : [colX, colX + colW];
    const xs = fp.tblpXSpec;
    const refX = xs === 'center' ? aL + (aR - aL - refW) / 2 : xs === 'right' || xs === 'outside' ? aR - refW : aL + (xs ? 0 : fp.tblpX ?? 0);
    const [aT, aB] = fp.vertAnchor === 'page' ? [0, g.pageH] : fp.vertAnchor === 'margin' ? [g.marT, g.pageH - g.marB] : [flowY, flowY];
    const ys = fp.tblpYSpec;
    const top = ys === 'center' ? aT + (aB - aT - H) / 2 : ys === 'bottom' ? aB - H : aT + (ys ? 0 : fp.tblpY ?? 0);
    void H;
    this.emitFloatRows(t, t.rows, fp, ps, refX, top, out, yOrigin, wrap, split);
  }

  /** Linhas de uma tabela flutuante a partir de `top`. Com `split`, as que não
   *  cabem na página seguem para o topo da próxima (o texto as contorna lá). */
  private emitFloatRows(t: TableLayout, rows: TableLayout['rows'], fp: NonNullable<TableBlock['tblPr']>['tblpPr'] & object, ps: PageState, refX: number, top: number, out: PageItem[], yOrigin: number, wrap: boolean, split: boolean): void {
    const legacy = this.ctx.fmt.settings.compatibilityMode < 15;
    let y = top;
    let n = 0;
    rows = [...rows];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i]!;
      if (split && y + row.height > ps.bodyBottom + 0.5) {
        // não cabe: divide a linha (salvo cantSplit / só a altura mínima) como no fluxo
        const avail = ps.bodyBottom - y;
        const onlyMin = (row.natural ?? row.height) <= avail + 0.5;
        const parts = onlyMin || row.cantSplit ? null : row.split?.(avail) ?? null;
        if (parts && parts[0].height > 0) {
          rows.splice(i, 1, parts[0], parts[1]);
          row = parts[0];
        } else if (n > 0) break;
      }
      for (const it of row.items) out.push(shiftItem(it, y - yOrigin, refX));
      for (const it of row.borderItems) out.push(shiftItem(it, y - yOrigin, refX));
      for (const l of row.lines) ps.page.lines.push({ ...l, x: l.x + refX, y: l.y + y, baseline: l.baseline + y, ...(l.chars ? { chars: l.chars.map((c) => ({ ...c, x: c.x + refX })) } : {}) });
      y += row.height;
      n++;
    }
    if (wrap) {
      ps.floats.push({
        // caixa = bordas externas (modo antigo: a grade fica na margem da célula antes do texto)
        x: refX + (legacy ? -108 - (t.borderLeft ?? 0) / 2 : 0), y: top, w: t.width + (legacy ? (t.borderLeft ?? 0) : 0), h: y - top, wrap: 'square',
        distL: fp.leftFromText ?? 0, distR: fp.rightFromText ?? 0, distT: fp.topFromText ?? 0, distB: fp.bottomFromText ?? 0,
      });
    }
    if (n < rows.length) this.floatCarry.push({ t, rows: rows.slice(n), fp, refX });
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
    this.lastRowEmit = { row, y: this.y };
    for (const it of row.items) this.cur.body.push(shiftItem(it, this.y));
    for (const it of row.borderItems) this.cur.body.push(shiftItem(it, this.y));
    for (const l of row.lines) this.cur.page.lines.push({ ...l, y: l.y + this.y, baseline: l.baseline + this.y });
    this.y += row.height;
    this.atTop = false;
  }

  // ───────────────────────── objetos flutuantes ─────────────────────────

  /** Quadro de uma linha descontando floats com contorno (wrap) que a cruzam. */
  private wrapFrame(frame: { left: number; right: number }, frameX: number, y: number, lineH = 240, ps: PageState = this.cur): { left: number; right: number; skipTo?: number } {
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
      const top = f.y - f.distT, bottom = f.y + f.h + f.distB;
      // (1 twip de folga: o Word compara em twips — 0,02pt de sobreposição
      // não desvia; 0,15pt desvia)
      if (y + lineH <= top + 1 || y >= bottom - 1) continue;
      const fl = f.x - f.distL - frameX, fr = f.x + f.w + f.distR - frameX;
      if (fr <= left || fl >= right) continue;
      if (f.wrap === 'topAndBottom') { skipTo = Math.max(skipTo ?? 0, bottom); continue; }
      hit = true;
      minBottom = Math.min(minBottom, bottom);
      const next: [number, number][] = [];
      for (const [a, b] of free) {
        if (fr <= a || fl >= b) { next.push([a, b]); continue; }
        if (fl > a) next.push([a, fl]);
        if (fr < b) next.push([fr, b]);
      }
      free = next;
    }
    if (hit) {
      // o intervalo mais largo (empate: o da esquerda) — vários flutuantes na mesma
      // linha: a linha vai para o vão livre, não para baixo deles (oráculo hfmix)
      let best: [number, number] | undefined;
      for (const iv of free) if (!best || iv[1] - iv[0] > best[1] - best[0]) best = iv;
      // sem espaço útil ao lado: a linha desce até o fim do 1º objeto que a bloqueia
      if (!best || best[1] - best[0] < 300) skipTo = Math.max(skipTo ?? 0, minBottom);
      else if (skipTo === undefined) return { left: best[0], right: best[1] };
    }
    if (skipTo !== undefined) return { ...frame, skipTo };
    return { left, right };
  }

  private placeFloats(p: PreparedPara, ps: PageState, colX: number, colW: number, paraTop: number, flowItems: PageItem[], yOrigin: number): void {
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      if (!fl || this.prePlaced.has(run)) continue;
      if (this.onlyTextFloats && !followsText(floatAnchor(run))) continue;
      this.placeFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin);
    }
  }

  private placeFloat(run: Run, ps: PageState, colX: number, colW: number, paraTop: number, flowItems: PageItem[], yOrigin: number, clampBottom?: number): FloatReceipt {
    const g = ps.geom;
    const anchor: DrawingAnchor | undefined = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
    let w = run.image?.widthTwips ?? run.shape?.widthTwips ?? run.group?.widthTwips ?? run.textbox?.widthTwips ?? 0;
    let h = run.image?.heightTwips ?? run.shape?.heightTwips ?? run.group?.heightTwips ?? run.textbox?.heightTwips ?? 0;
    const behind = !!anchor?.behindDoc || !!run.image?.behindDoc || !!run.textbox?.behindDoc;
    // conteúdo da caixa de texto (altura automática)
    let tbContent: CellContent | null = null;
    if (run.textbox) {
      const tb = run.textbox;
      const ins = tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
      const blocks: Block[] = tb.blocks ?? tb.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
      const env: ParaEnv = { field: this.fieldValue(ps), darkBackground: isDark(run.textbox.shape?.fill) };
      let inner = w - ins.l - ins.r;
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
      tbContent = this.layoutStatic(blocks, 0, Math.max(1, inner), env, 'txbx', ps);
      // ajuste automático: a altura é a do texto (o cy gravado pode estar desatualizado)
      if (tb.autoFit) h = tbContent.height + ins.t + ins.b;
    }
    let x: number, y: number;
    if (anchor?.simplePos) { x = anchor.simplePos.x; y = anchor.simplePos.y; }
    else {
      const hRef = horizRef(anchor?.posH.relativeFrom ?? 'column', g, colX, colW);
      x = alignPos(anchor?.posH.align, anchor?.posH.offset, hRef.x, hRef.w, w, anchor?.posH.pct, g.pageW);
      const pin = this.pinnedFloats.get(run);
      if (pin && pin.ps === ps) y = pin.y;
      else {
        const vRef = vertRef(anchor?.posV.relativeFrom ?? 'paragraph', g, ps, paraTop);
        y = alignPos(anchor?.posV.align, anchor?.posV.offset, vRef.y, vRef.h, h, anchor?.posV.pct, g.pageH);
        if (clampBottom !== undefined && y + h > clampBottom) y = clampBottom - h;
        // com quebra e relativo ao texto: não sobe além do topo do corpo; nos modos
        // antigos (≤ 14), só além do topo da PÁGINA (oráculos toptbl/toptbl2)
        if (!this.inHf && anchor && WRAPPING.has(anchor.wrap) && followsText(anchor)) y = Math.max(y, this.floatMinY(ps));
      }
    }
    // itens desenhados em coordenadas absolutas da página; o fluxo do chamador
    // pode deslocar y (yOrigin) — compensamos para o desenho ficar absoluto
    const target = this.inHf ? (behind ? ps.hfBehind : ps.hfFront) : (behind ? ps.behind : ps.front);
    const items = this.paintObject(run, x, y, w, h, tbContent, ps);
    const obj: PlacedObject = { run, x, y, w, h, layer: behind ? 'behind' : 'front', hf: this.inHf };
    (ps.page.objects ??= []).push(obj);
    const zobj: ZObj = { z: anchor?.relativeHeight ?? 0, seq: this.zSeq++, items };
    target.push(zobj);
    let box: FloatBox | undefined;
    void flowItems; void yOrigin;
    // modo de compatibilidade ≤ 14: flutuantes do cabeçalho/rodapé não afastam texto
    // nenhum (nem o do próprio cabeçalho, nem o do corpo) — oráculo hffloat (hff14-*)
    const hfLegacy = this.inHf && this.ctx.fmt.settings.compatibilityMode < 15;
    if (anchor && WRAPPING.has(anchor.wrap) && !hfLegacy) {
      box = { x, y, w, h, wrap: anchor.wrap, distL: anchor.distL ?? 0, distR: anchor.distR ?? 0, distT: anchor.distT ?? 0, distB: anchor.distB ?? 0 };
      ps.floats.push(box);
    }
    return { ps, target, zobj, obj, ...(box ? { box } : {}) };
  }

  /** Desfaz um flutuante colocado (parágrafo que mudou de página). */
  private unplaceFloat(r: FloatReceipt): void {
    const rm = <T>(arr: T[] | undefined, v: T) => { const i = arr ? arr.indexOf(v) : -1; if (i >= 0) arr!.splice(i, 1); };
    rm(r.target, r.zobj);
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
  private placeFloatsEarly(p: PreparedPara, ps: PageState, colX: number, colW: number, paraTop: number, clampBottom?: number): FloatReceipt[] {
    const out: FloatReceipt[] = [];
    let flow: FlowState | undefined;
    for (const g of p.glyphs) {
      const run = g.obj;
      if (!run) continue;
      const fl = run.image?.floating || run.shape?.floating || run.group?.floating || run.textbox?.floating;
      const anc = run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
      if (!fl || !anc || !WRAPPING.has(anc.wrap ?? '')) continue;
      // estado antes de TODAS as colocações (desfazer em qualquer ordem volta a ele)
      flow ??= this.ctx.saveFlow();
      out.push({ ...this.placeFloat(run, ps, colX, colW, paraTop, ps.body, 0, clampBottom !== undefined && followsText(anc) ? clampBottom : undefined), flow });
    }
    return out;
  }

  /** Desenha imagem/forma/caixa/grupo no retângulo dado. */
  private paintObject(run: Run, x: number, y: number, w: number, h: number, tbContent: CellContent | null, ps: PageState = this.cur): PageItem[] {
    const out: PageItem[] = [];
    const theme = this.ctx.fmt.theme;
    if (run.image && isEmf(run.image.data)) {
      out.push({ t: 'clip', op: 'push', x, y, w, h }, ...renderEmf(this.ctx, run.image.data, { x, y, w, h }), { t: 'clip', op: 'pop' });
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
      const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: s.line.widthPt, ...(s.line.dash ? { dash: s.line.dash } : {}) } : undefined;
      out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}), ...(run.shape.line ? { line: run.shape.line } : {}) });
    } else if (run.textbox) {
      const tb = run.textbox;
      const s = tb.shape;
      if (s && (s.fill || s.line)) {
        const fill = resolveDrawingColor(s.fill, theme);
        const stroke = s.line ? { color: resolveDrawingColor(s.line.color, theme) ?? '000000', widthPt: s.line.widthPt } : undefined;
        out.push({ t: 'shape', x, y, w, h, style: s, ...(fill ? { fill } : {}), ...(stroke ? { stroke } : {}) });
      }
      if (tbContent) {
        const ins = tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
        // caixa girada: o conteúdo gira em torno do centro (a forma já gira no pintor)
        const rot = tb.rot ?? s?.rot ?? 0;
        if (rot) out.push({ t: 'xform', op: 'push', m: rotation(x + w / 2, y + h / 2, rot) });
        if (tb.wordArt && tbContent.lines.length) {
          // WordArt (textPlain): o texto estica para preencher a caixa interna
          const x0 = Math.min(...tbContent.lines.map((l) => l.x)), x1 = Math.max(...tbContent.lines.map((l) => l.x + l.width));
          const iw = Math.max(1, w - ins.l - ins.r), ih = Math.max(1, h - ins.t - ins.b);
          const sx = iw / Math.max(1, x1 - x0), sy = ih / Math.max(1, tbContent.height);
          out.push({ t: 'xform', op: 'push', m: [sx, 0, 0, sy, x + ins.l - x0 * sx, y + ins.t] });
          for (const it of tbContent.items) out.push(it);
          out.push({ t: 'xform', op: 'pop' });
        } else {
          let dy = y + ins.t;
          const free = h - ins.t - ins.b - tbContent.height;
          if (tb.vAnchor === 'ctr' && free > 0) dy += free / 2;
          else if (tb.vAnchor === 'b' && free > 0) dy += free;
          out.push({ t: 'clip', op: 'push', x, y, w, h });
          for (const it of tbContent.items) out.push(shiftItem(it, dy, x + ins.l));
          out.push({ t: 'clip', op: 'pop' });
        }
        if (rot) out.push({ t: 'xform', op: 'pop' });
      }
    } else if (run.group) {
      const gr = run.group;
      const sx = gr.widthTwips ? w / gr.widthTwips : 1;
      const sy = gr.heightTwips ? h / gr.heightTwips : 1;
      for (const item of gr.items) {
        const r = item.run;
        let tc: CellContent | null = null;
        if (r.textbox) {
          const ins = r.textbox.insets ?? { l: 144, t: 72, r: 144, b: 72 };
          const blocks: Block[] = r.textbox.blocks ?? r.textbox.paras.map((paragraph) => ({ type: 'paragraph', paragraph }));
          tc = this.layoutStatic(blocks, 0, Math.max(1, item.w * sx - ins.l - ins.r), { darkBackground: isDark(r.textbox.shape?.fill) }, 'grp', ps);
        }
        out.push(...this.paintObject(r, x + item.x * sx, y + item.y * sy, item.w * sx, item.h * sy, tc, ps));
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
    case 'margin': return { y: g.marT, h: g.pageH - g.marT - g.marB };
    case 'topMargin': case 'insideMargin': return { y: 0, h: g.marT };
    case 'bottomMargin': case 'outsideMargin': return { y: g.pageH - g.marB, h: g.marB };
    default: return { y: paraTop, h: 0 }; // paragraph | line
  }
  void ps;
}

function alignPos(align: string | undefined, offset: number | undefined, base: number, span: number, size: number, pct: number | undefined, pageSpan: number): number {
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
    .filter((pg) => pg.g.kind !== 'pb' && pg.g.kind !== 'cb')
    .map((pg) => ({ o: pg.g.offset, x: frameX + pg.x, w: pg.w }));
  return {
    ref, start, end,
    x: frameX + line.xStart, y: top, height: line.height, baseline: top + line.baseline, width: line.width,
    chars,
  };
}

export { EMPTY_LINES, resolveColor };

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

/** Recibo de um flutuante colocado (para desfazer). */
interface FloatReceipt {
  ps: PageState;
  target: ZObj[];
  zobj: ZObj;
  obj: PlacedObject;
  box?: FloatBox;
  /** estado de listas/SEQ/notas antes da colocação (caixa de texto): volta no unplace */
  flow?: FlowState;
}

/** Âncora de um objeto flutuante (qualquer tipo). */
function floatAnchor(run: Run): DrawingAnchor | undefined {
  return run.image?.anchor ?? run.shape?.anchor ?? run.group?.anchor ?? run.textbox?.anchor;
}

/** O objeto acompanha o texto (posição vertical relativa ao parágrafo/linha). */
function followsText(a: DrawingAnchor | undefined): boolean {
  return !!a && !a.simplePos && !ABSOLUTE_V.has(a.posV.relativeFrom ?? 'paragraph');
}

/** Altura natural de uma linha com a fonte da marca de parágrafo (twips) —
 *  estimativa para o contorno de objetos antes de quebrar a linha. */
function markLineH(p: PreparedPara): number {
  const mm = faceMetrics(p.markFace.font);
  return Math.round((mm.ascent + mm.descent) * p.markStyle.sizePt * 20);
}

/** Cópia descartável do estado da página (medições que posicionam flutuantes). */
function scratchPage(ps: PageState): PageState {
  return {
    ...ps, page: { ...ps.page, items: [], lines: [], objects: [] },
    behind: [], hf: [], body: [], front: [], hfBehind: [], hfFront: [], floats: [...ps.floats], notes: [],
  };
}
