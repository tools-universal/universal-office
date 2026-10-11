import type {
  TableBlock, TableCell, TblPr, TcPr, BorderSpec, WidthSpec, PPr, RPr, TblStyleType, TblLook,
} from '@universal-office/docx-core';
import { mergeTblPr, mergeTcPr, mergePPr, mergeRPr, resolveColor, COND_ORDER } from './resolve.js';
import type { DocContext } from './context.js';
import type { PageItem, LaidOutLine } from './tree.js';
import { paintBorder, borderWidth } from './paint.js';
import { isDark, paraVisibility } from './para.js';

/**
 * Tabela: grade de colunas, margens de célula, cascata do estilo de tabela
 * (incl. formatação condicional por posição), bordas, sombreamento, altura
 * de linha (trHeight), mesclas horizontais/verticais e alinhamento vertical.
 * O conteúdo das células é laid out pelo `layoutCell` injetado (fluxo
 * estático do motor), que devolve itens relativos ao topo da célula.
 */

export interface CellContent {
  items: PageItem[];
  lines: LaidOutLine[];
  height: number;
  /** algum parágrafo do conteúdo tem "manter com o próximo" */
  keepNext?: boolean;
}

export type CellLayouter = (
  cell: TableCell, x: number, width: number, env: { tablePPr?: PPr; tableRPr?: RPr; darkBackground?: boolean }, ref: string,
) => CellContent;

export interface RowLayout {
  /** altura da linha (twips) */
  height: number;
  /** itens relativos ao TOPO da linha (y=0) */
  items: PageItem[];
  lines: LaidOutLine[];
  cantSplit: boolean;
  header: boolean;
  /** a linha fica com a seguinte (parágrafo keepNext em alguma célula) */
  keepNext?: boolean;
  /** altura só do conteúdo (sem a altura mínima trHeight): se couber e só a
   *  mínima não couber, o Word leva a linha inteira (não divide) */
  natural?: number;
  /** itens de bordas desenhados por cima */
  borderItems: PageItem[];
  /** borda inferior desenhada só se a página quebrar logo após esta linha */
  breakBorderItems?: PageItem[];
  /** divide a linha para caber em `avail` (twips): [parte que cabe, resto]
   *  — null se nenhuma linha de texto cabe (a linha inteira desce). */
  split?: (avail: number) => [RowLayout, RowLayout] | null;
}

/** Parte um conteúdo de célula num corte vertical (fim da última linha que cabe). */
export function splitContent(c: CellContent, availContent: number): [CellContent, CellContent] | null {
  let cut = 0;
  for (const l of c.lines) {
    const bottom = l.y + l.height;
    if (bottom <= availContent + 0.5 && bottom > cut) cut = bottom;
  }
  if (cut <= 0) return null;
  const a: CellContent = { items: [], lines: [], height: cut };
  const b: CellContent = { items: [], lines: [], height: Math.max(0, c.height - cut) };
  const keyY = (it: PageItem): number => it.t === 'line' ? Math.min(it.y1, it.y2) : it.t === 'clip' ? (it.y ?? 0) : it.t === 'xform' ? (it.m?.[5] ?? 0) : it.t === 'path' ? Math.min(...it.cmds.map((c) => (c.op === 'Z' ? Infinity : c.y))) : it.y;
  for (const it of c.items) {
    const y = it.t === 'glyphs' ? it.y : keyY(it);
    if (y < cut) a.items.push(it);
    else b.items.push(shiftItem(it, -cut));
  }
  for (const l of c.lines) {
    if (l.y < cut) a.lines.push(l);
    else b.lines.push({ ...l, y: l.y - cut, baseline: l.baseline - cut });
  }
  return [a, b];
}

export interface TableLayout {
  x: number;
  width: number;
  rows: RowLayout[];
  /** espessura da borda esquerda da 1ª célula (twips) */
  borderLeft?: number;
  /** propriedades de fluxo */
  tblpPr?: TblPr['tblpPr'];
}

const DEFAULT_LOOK: TblLook = { firstRow: true, lastRow: false, firstColumn: true, lastColumn: false, noHBand: false, noVBand: true };

function widthTw(w: WidthSpec | undefined, base: number): number | undefined {
  if (!w) return undefined;
  if (w.type === 'dxa') return w.w;
  if (w.type === 'pct') return (base * w.w) / 5000;
  return undefined;
}

interface CellSlot {
  cell: TableCell;
  col: number;
  span: number;
  row: number;
  tcPr: TcPr;
  /** vMerge: quantas linhas a célula cobre (1 = sem mescla) */
  rowSpan: number;
  /** é continuação de mescla vertical (não pinta conteúdo) */
  merged: boolean;
  pPr?: PPr;
  rPr?: RPr;
}

/**
 * Linha oculta (oráculo hidden): trPr/w:hidden E todo o conteúdo oculto (marcas
 * e texto) — o Word a remove inteira, bordas incluídas. Com conteúdo visível
 * (ou sem trPr/hidden) a linha fica.
 */
export function isHiddenRow(ctx: DocContext, row: TableBlock['rows'][number]): boolean {
  if (!row.trPr?.hidden) return false;
  return row.cells.every((c) => (c.blocks ?? c.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }))).every((b) => {
    if (b.type !== 'paragraph') return false;
    const v = paraVisibility(ctx, b.paragraph, {});
    return v.markHidden && !v.visible;
  }));
}

export function layoutTable(
  ctx: DocContext, table0: TableBlock, frameX: number, frameWidth: number, layoutCell: CellLayouter, ref: string,
): TableLayout {
  const table = table0.rows.some((r) => r.trPr?.hidden) ? { ...table0, rows: table0.rows.filter((r) => !isHiddenRow(ctx, r)) } : table0;
  const theme = ctx.fmt.theme;
  const direct = table.tblPr ?? {};
  const style = ctx.resolver.tableStyle(direct.tblStyle);
  const tblPr = mergeTblPr(style.tblPr, direct);
  const look = { ...DEFAULT_LOOK, ...(direct.tblLook ?? style.tblPr.tblLook ?? {}) };
  const nRows = table.rows.length;

  // ── grade ──
  let grid = table.gridColsTwips.slice();
  const tblWidth = widthTw(tblPr.tblW, frameWidth);
  if (!grid.length || grid.every((g) => g <= 0)) {
    const cols = Math.max(1, ...table.rows.map((r) => r.cells.reduce((s, c) => s + Math.max(1, c.tcPr?.gridSpan ?? c.gridSpan ?? 1), 0) + (r.trPr?.gridBefore ?? 0) + (r.trPr?.gridAfter ?? 0)));
    const total = tblWidth ?? frameWidth;
    grid = Array.from({ length: cols }, () => total / cols);
  }
  // tabela em pct/auto mais larga que o quadro: Word encolhe proporcionalmente (autofit)
  let width = grid.reduce((a, b) => a + b, 0);
  if (tblWidth && tblPr.tblW?.type === 'pct' && Math.abs(tblWidth - width) > 20) {
    grid = grid.map((g) => (g * tblWidth) / width);
    width = tblWidth;
  }
  const colX = [0];
  for (const g of grid) colX.push(colX[colX.length - 1]! + g);

  // ── posição ──
  const firstCellMarL = (() => {
    const c = table.rows[0]?.cells[0];
    const m = c?.tcPr?.tcMar?.left ?? tblPr.tblCellMar?.left;
    return widthTw(m, width) ?? 108;
  })();
  // tabela flutuante: posicionada pelo chamador (âncoras do tblpPr) — sem recuo/alinhamento
  const floating = !!tblPr.tblpPr && tblPr.tblpPr.tblpYSpec !== 'inline';
  let x = frameX + (floating ? 0 : widthTw(tblPr.tblInd, frameWidth) ?? 0);
  // compat < 15: o recuo é até o TEXTO da 1ª célula (a borda sai para a esquerda)
  if (ctx.fmt.settings.compatibilityMode < 15) x -= firstCellMarL;
  const jc = floating ? undefined : tblPr.jc;
  if (jc === 'center') x = frameX + (frameWidth - width) / 2;
  else if (jc === 'right' || jc === 'end') x = frameX + frameWidth - width;

  // ── células (vMerge) ──
  const slots: CellSlot[][] = [];
  table.rows.forEach((row, ri) => {
    const rowSlots: CellSlot[] = [];
    let col = row.trPr?.gridBefore ?? 0;
    for (const cell of row.cells) {
      const tc = cell.tcPr ?? {};
      const span = Math.max(1, tc.gridSpan ?? cell.gridSpan ?? 1);
      rowSlots.push({ cell, col, span, row: ri, tcPr: tc, rowSpan: 1, merged: tc.vMerge === 'continue' });
      col += span;
    }
    slots.push(rowSlots);
  });
  // amarra continuações à célula inicial
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]!) {
      if (s.tcPr.vMerge !== 'restart') continue;
      let k = ri + 1;
      while (k < slots.length && slots[k]!.some((o) => o.col === s.col && o.merged)) k++;
      s.rowSpan = k - ri;
    }
  }

  // ── formatação condicional ──
  const rowBand = Math.max(1, tblPr.tblStyleRowBandSize ?? 1);
  const colBand = Math.max(1, tblPr.tblStyleColBandSize ?? 1);
  const nCols = grid.length;
  const condFor = (ri: number, s: CellSlot): TblStyleType[] => {
    const out: TblStyleType[] = ['wholeTable'];
    const firstRow = look.firstRow && ri === 0 || !!table.rows[ri]?.trPr?.tblHeader && look.firstRow;
    const lastRow = look.lastRow && ri === nRows - 1;
    const firstCol = look.firstColumn && s.col === 0;
    const lastCol = look.lastColumn && s.col + s.span >= nCols;
    if (!look.noVBand) {
      const c0 = s.col - (look.firstColumn ? 1 : 0);
      if (c0 >= 0 && !(lastCol && look.lastColumn)) out.push(Math.floor(c0 / colBand) % 2 === 0 ? 'band1Vert' : 'band2Vert');
    }
    if (!look.noHBand) {
      const r0 = ri - (look.firstRow ? 1 : 0);
      if (r0 >= 0 && !lastRow) out.push(Math.floor(r0 / rowBand) % 2 === 0 ? 'band1Horz' : 'band2Horz');
    }
    if (firstCol) out.push('firstCol');
    if (lastCol) out.push('lastCol');
    if (firstRow) out.push('firstRow');
    if (lastRow) out.push('lastRow');
    if (firstRow && firstCol) out.push('nwCell');
    if (firstRow && lastCol) out.push('neCell');
    if (lastRow && firstCol) out.push('swCell');
    if (lastRow && lastCol) out.push('seCell');
    return COND_ORDER.filter((t) => out.includes(t));
  };

  // ── propriedades resolvidas por célula (estilo + condicional + direto) ──
  const resolved = new Map<CellSlot, { tcPr: TcPr; pPr: PPr; rPr: RPr }>();
  for (let ri = 0; ri < slots.length; ri++) {
    for (const s of slots[ri]!) {
      let tcPr: TcPr = style.tcPr;
      let pPr: PPr = style.pPr;
      let rPr: RPr = style.rPr;
      for (const c of condFor(ri, s)) {
        const part = style.cond[c];
        if (!part) continue;
        tcPr = mergeTcPr(tcPr, part.tcPr);
        pPr = mergePPr(pPr, part.pPr);
        rPr = mergeRPr(rPr, part.rPr);
      }
      resolved.set(s, { tcPr: mergeTcPr(tcPr, s.tcPr), pPr, rPr });
    }
  }

  // ── bordas ──
  const tblBorders = tblPr.tblBorders ?? {};
  const edge = (s: CellSlot, side: 'top' | 'bottom' | 'left' | 'right'): BorderSpec | undefined => {
    const own = resolved.get(s)?.tcPr.tcBorders?.[side];
    if (own) return own;
    const ex = table.rows[s.row]?.tblPrEx;
    const tb = ex?.tblBorders ? { ...tblBorders, ...ex.tblBorders } : tblBorders;
    const isOuter = side === 'top' ? s.row === 0 : side === 'bottom' ? s.row + s.rowSpan >= nRows
      : side === 'left' ? s.col === 0 : s.col + s.span >= nCols;
    return isOuter ? tb[side] : (side === 'top' || side === 'bottom' ? tb.insideH : tb.insideV);
  };
  /** conflito entre bordas vizinhas: a mais grossa vence (empate: a de cima) */
  const heavier = (a: BorderSpec | undefined, b: BorderSpec | undefined) => (borderWidth(b) > borderWidth(a) ? b : a);
  const covering = (ri: number, c0: number, c1: number) => (slots[ri] ?? []).filter((o) => o.col < c1 && o.col + o.span > c0);
  /** borda vencedora no topo da célula (divisa com a linha de cima) */
  const topWinner = (s: CellSlot): BorderSpec | undefined => {
    let w: BorderSpec | undefined;
    if (s.row > 0) for (const u of covering(s.row - 1, s.col, s.col + s.span)) w = heavier(w, edge(u, 'bottom'));
    return heavier(w, edge(s, 'top'));
  };
  /**
   * Faixas horizontais de borda (medido no Word, oráculo tables): cada divisa
   * entre linhas ocupa a espessura da borda mais grossa dela — o conteúdo da
   * linha começa abaixo; a última linha ganha a faixa da borda inferior.
   */
  const band: number[] = [];
  for (let k = 0; k <= nRows; k++) {
    let m = 0;
    if (k === nRows) for (const s of slots[nRows - 1] ?? []) m = Math.max(m, borderWidth(edge(s, 'bottom')));
    else for (const s of slots[k] ?? []) if (!s.merged) m = Math.max(m, borderWidth(topWinner(s)));
    band.push(m);
  }
  // compat ≥ 15: a borda esquerda começa na margem (+recuo) — a grade fica meia borda adiante
  if (ctx.fmt.settings.compatibilityMode >= 15 && !jc && slots[0]?.[0]) x += borderWidth(edge(slots[0][0], 'left')) / 2;

  // ── bordas SEPARADAS (oráculos cellsp/cellsp2) ──
  // tblCellSpacing presente (mesmo 0), na tabela ou em alguma linha: cada célula desenha
  // as PRÓPRIAS bordas dentro da sua caixa e a borda externa da tabela contorna tudo.
  // Entre células, entre linhas e entre a borda externa e as células: 2× o espaçamento.
  // Caixa da célula: [B_i + s, B_(i+1) − s], com B_0 = grade_0 + s, B_n = grade_n − s e
  // as divisas internas proporcionais à grade (exato com 2 colunas; aproximado com mais).
  // O texto começa na borda da célula + margem (com s = 0 o Word põe meia borda antes).
  const separated = !!tblPr.tblCellSpacing || table.rows.some((r) => !!r.trPr?.tblCellSpacing);
  const spRow = (ri: number) => widthTw(table.rows[ri]?.trPr?.tblCellSpacing ?? tblPr.tblCellSpacing, width) ?? 0;
  const spTbl = widthTw(tblPr.tblCellSpacing ?? table.rows.find((r) => r.trPr?.tblCellSpacing)?.trPr?.tblCellSpacing, width) ?? 0;
  const outerB = (ri: number, side: 'top' | 'bottom' | 'left' | 'right'): BorderSpec | undefined => table.rows[ri]?.tblPrEx?.tblBorders?.[side] ?? tblBorders[side];
  /** por linha: do topo da linha ao conteúdo / do conteúdo ao fim; espessuras das bordas das células */
  const sepTop: number[] = [], sepBottom: number[] = [], sepWT: number[] = [], sepWB: number[] = [];
  if (separated) {
    for (let ri = 0; ri < nRows; ri++) {
      const sp = spRow(ri);
      let wT = 0, wB = 0;
      for (const sl of slots[ri] ?? []) { wT = Math.max(wT, borderWidth(edge(sl, 'top'))); wB = Math.max(wB, borderWidth(edge(sl, 'bottom'))); }
      sepWT.push(wT);
      sepWB.push(wB);
      sepTop.push((ri === 0 ? borderWidth(outerB(0, 'top')) + sp : 0) + sp + wT);
      sepBottom.push(wB + sp + (ri === nRows - 1 ? sp + borderWidth(outerB(ri, 'bottom')) : 0));
    }
  }
  const bandTopOf = (ri: number) => (separated ? sepTop[ri]! : band[ri]!);
  const bandBottomOf = (ri: number) => (separated ? sepBottom[ri]! : ri === nRows - 1 ? band[nRows]! : 0);
  const g0 = colX[0]!, gn = colX[nCols]!;
  const sepB = (i: number) => g0 + spTbl + (colX[i]! - g0) * ((gn - g0 - 2 * spTbl) / (gn - g0 || 1));

  const rows: RowLayout[] = [];
  const pendingMerges: { slot: CellSlot; content: CellContent | null; tcPr: TcPr; x0: number; x1: number; startRow: number; vertical?: string; marL: number; marR: number; env: { tablePPr?: PPr; tableRPr?: RPr } }[] = [];
  /** maior largura de linha do conteúdo (comprimento do texto vertical) */
  const maxLineW = (c: CellContent) => c.lines.reduce((m, l) => Math.max(m, l.x + l.width), 0);
  /**
   * Texto vertical (textDirection btLr/tbRl): diagrama o conteúdo no
   * comprimento disponível (altura da linha) — sem quebrar se couber; senão
   * quebra, mas nunca abaixo da maior palavra.
   */
  const layoutVertical = (s: CellSlot, avail: number, env: { tablePPr?: PPr; tableRPr?: RPr }, cref: string): CellContent => {
    // medições puras: só a diagramação final avança listas/SEQ/notas
    const natural = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 31680, env, cref)));
    if (natural <= avail + 0.5) return layoutCell(s.cell, 0, Math.max(1, avail), env, cref);
    const longest = maxLineW(ctx.pure(() => layoutCell(s.cell, 0, 1, env, cref)));
    return layoutCell(s.cell, 0, Math.max(1, avail, longest), env, cref);
  };
  const rowHeights: number[] = [];

  table.rows.forEach((row, ri) => {
    const ex = row.tblPrEx;
    let contentH = 0;
    const cellInfos: { slot: CellSlot; tcPr: TcPr; content?: CellContent; x0: number; x1: number; bx0: number; bx1: number; marT: number; marB: number; marL: number; marR: number; vertical?: string; env: { tablePPr?: PPr; tableRPr?: RPr } }[] = [];
    for (const s of slots[ri]!) {
      const { tcPr, pPr, rPr } = resolved.get(s)!;
      // bordas separadas: caixa da célula (bx) e área do conteúdo (x) dentro das bordas dela
      const bx0 = separated ? sepB(Math.min(s.col, nCols)) + spTbl : colX[Math.min(s.col, nCols)]!;
      const bx1 = separated ? sepB(Math.min(s.col + s.span, nCols)) - spTbl : colX[Math.min(s.col + s.span, nCols)]!;
      const x0r = bx0, x1r = bx1;
      const mar = { ...(tblPr.tblCellMar ?? {}), ...(ex?.tblCellMar ?? {}), ...(tcPr.tcMar ?? {}) };
      const marL = widthTw(mar.left, width) ?? 108;
      const marR = widthTw(mar.right, width) ?? 108;
      const marT = widthTw(mar.top, width) ?? 0;
      const marB = widthTw(mar.bottom, width) ?? 0;
      // texto: borda da célula + margem; com espaçamento 0 o Word conta só meia borda
      // (como no modelo colapsado), mas nunca menos que a borda inteira
      const wl = separated ? borderWidth(edge(s, 'left')) : 0, wr = separated ? borderWidth(edge(s, 'right')) : 0;
      const x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.max(wl - marL, wl / 2);
      const x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.max(wr - marR, wr / 2);
      // fundo escuro na célula: texto de cor automática vira branco
      const env = { tablePPr: pPr, tableRPr: rPr, ...(isDark(cellFill(ctx, tcPr, tblPr, theme)) ? { darkBackground: true } : {}) };
      const vertical = tcPr.textDirection === 'btLr' || tcPr.textDirection === 'tbRl' || tcPr.textDirection === 'tbRlV' ? tcPr.textDirection : undefined;
      const info: (typeof cellInfos)[number] = { slot: s, tcPr, x0, x1, bx0, bx1, marT, marB, marL, marR, env, ...(vertical ? { vertical } : {}) };
      if (!s.merged) {
        if (vertical) {
          // texto vertical: diagramado depois que a altura das outras células é conhecida
          if (s.rowSpan !== 1) pendingMerges.push({ slot: s, content: null, tcPr, x0, x1, startRow: ri, vertical, marL, marR, env });
        } else {
          const content = layoutCell(s.cell, x + x0 + marL, Math.max(1, x1 - x0 - marL - marR), env, `${ref}/r${ri}/c${s.col}`);
          info.content = content;
          if (s.rowSpan === 1) contentH = Math.max(contentH, content.height + marT + marB);
          else pendingMerges.push({ slot: s, content, tcPr, x0, x1, startRow: ri, marL, marR, env });
        }
      }
      cellInfos.push(info);
    }
    const th = row.trPr?.trHeight;
    // altura mínima × margens da célula (oráculo tcell): a mínima vale para o TEXTO
    // e as margens de cima/baixo somam por fora — max(trHeight, texto) + mT + mB; na
    // exata só a margem de BAIXO soma (a de cima fica dentro da altura)
    let maxMar = 0, maxMarB = 0;
    for (const ci of cellInfos) { maxMar = Math.max(maxMar, ci.marT + ci.marB); maxMarB = Math.max(maxMarB, ci.marB); }
    // células de texto vertical (não mescladas): comprimento = altura da linha
    for (const ci of cellInfos) {
      if (!ci.vertical || ci.slot.merged || ci.slot.rowSpan !== 1) continue;
      const rowMin = th ? th.val + (th.hRule === 'exact' ? maxMarB : maxMar) : 0;
      const avail = Math.max(contentH, rowMin) - ci.marT - ci.marB;
      const c = layoutVertical(ci.slot, avail, ci.env, `${ref}/r${ri}/c${ci.slot.col}`);
      ci.content = c;
      if (th?.hRule !== 'exact') contentH = Math.max(contentH, maxLineW(c) + ci.marT + ci.marB);
    }
    // keepNext em qualquer parágrafo de qualquer célula (oráculo keeptbl)
    const rowKeepNext = cellInfos.some((ci) => ci.content?.keepNext);
    // altura da linha (sem as faixas de borda)
    let h = contentH;
    if (th) {
      if (th.hRule === 'exact') h = th.val;
      else h = Math.max(h, th.val + maxMar);
    }
    const bandTop = bandTopOf(ri);
    // altura exata inclui a faixa de borda de cima (oráculo tables/tb-cellmar)
    if (th?.hRule === 'exact') h = Math.max(0, th.val - bandTop) + maxMarB;
    if (h <= 0) h = 0;
    const bandBottom = bandBottomOf(ri);
    // mesclas verticais que TERMINAM nesta linha: a última linha cresce se faltar altura
    for (const m of pendingMerges) {
      if (m.startRow + m.slot.rowSpan - 1 !== ri || !m.content) continue;
      const spanned = rowHeights.slice(m.startRow).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) + bandTop + h;
      const need = m.content.height + (widthTw(m.tcPr.tcMar?.top, width) ?? 0) + (widthTw(m.tcPr.tcMar?.bottom, width) ?? 0);
      if (need > spanned) h += need - spanned;
    }
    rowHeights.push(bandTop + h + bandBottom);
    const paintRow = (ch: number, contents: Map<CellSlot, CellContent | undefined>, vTop: boolean, drawTop: boolean, bTop: number, bBottom: number): RowLayout => {
      const its: PageItem[] = [];
      const lns: LaidOutLine[] = [];
      const brd: PageItem[] = [];
      const brk: PageItem[] = [];
      const rh = bTop + ch + bBottom;
      if (separated) {
        // cada célula: fundo e as próprias bordas dentro da caixa; depois a borda externa
        const cy0 = bTop - sepWT[ri]!, cy1 = bTop + ch + (bBottom > 0 ? sepWB[ri]! : 0);
        for (const ci of cellInfos) {
          const s = ci.slot;
          if (s.merged) continue;
          const fill = cellFill(ctx, ci.tcPr, tblPr, theme);
          const content = contents.get(s);
          if (fill) its.push({ t: 'rect', x: x + ci.bx0, y: cy0, w: ci.bx1 - ci.bx0, h: cy1 - cy0, fill });
          if (s.rowSpan === 1) {
            if (content && ci.vertical) paintVertical(its, content, ci.vertical, ci.tcPr.vAlign, x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
            else if (content) placeContent(its, lns, content, vTop ? 'top' : ci.tcPr.vAlign, ch, ci.marT, ci.marB, bTop);
          }
          const bT = edge(s, 'top'), bB = edge(s, 'bottom'), bL = edge(s, 'left'), bR = edge(s, 'right');
          if (drawTop && bT) paintBorder(ctx, brd, bT, x + ci.bx0, cy0 + borderWidth(bT) / 2, x + ci.bx1, cy0 + borderWidth(bT) / 2);
          if (bBottom > 0 && bB) paintBorder(ctx, brd, bB, x + ci.bx0, cy1 - borderWidth(bB) / 2, x + ci.bx1, cy1 - borderWidth(bB) / 2);
          if (bL) paintBorder(ctx, brd, bL, x + ci.bx0 + borderWidth(bL) / 2, cy0, x + ci.bx0 + borderWidth(bL) / 2, cy1);
          if (bR) paintBorder(ctx, brd, bR, x + ci.bx1 - borderWidth(bR) / 2, cy0, x + ci.bx1 - borderWidth(bR) / 2, cy1);
        }
        const oL = outerB(ri, 'left'), oR = outerB(ri, 'right'), oT = outerB(ri, 'top'), oB = outerB(ri, 'bottom');
        const xl = x + g0, xr = x + gn;
        paintBorder(ctx, brd, oL, xl, 0, xl, rh);
        paintBorder(ctx, brd, oR, xr, 0, xr, rh);
        if (ri === 0 && drawTop) paintBorder(ctx, brd, oT, xl - borderWidth(oL) / 2, borderWidth(oT) / 2, xr + borderWidth(oR) / 2, borderWidth(oT) / 2);
        if (ri === nRows - 1 && bBottom > 0) paintBorder(ctx, brd, oB, xl - borderWidth(oL) / 2, rh - borderWidth(oB) / 2, xr + borderWidth(oR) / 2, rh - borderWidth(oB) / 2);
        return {
          height: rh, items: its, lines: lns, borderItems: brd, breakBorderItems: brk, cantSplit: !!row.trPr?.cantSplit, header: !!row.trPr?.tblHeader,
          ...(rowKeepNext ? { keepNext: true } : {}), natural: bTop + Math.min(ch, contentH) + bBottom,
        };
      }
      for (const ci of cellInfos) {
        const s = ci.slot;
        const fill = cellFill(ctx, ci.tcPr, tblPr, theme);
        const content = contents.get(s);
        if (!s.merged && s.rowSpan === 1) {
          if (fill) its.push({ t: 'rect', x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
          if (content && ci.vertical) paintVertical(its, content, ci.vertical, ci.tcPr.vAlign, x + ci.x0 + ci.marL, x + ci.x1 - ci.marR, bTop + ci.marT, bTop + ch - ci.marB);
          else if (content) placeContent(its, lns, content, vTop ? 'top' : ci.tcPr.vAlign, ch, ci.marT, ci.marB, bTop);
        } else if (s.merged && fill) {
          its.push({ t: 'rect', x: x + ci.x0, y: 0, w: ci.x1 - ci.x0, h: rh, fill });
        }
        const tcb = ci.tcPr.tcBorders;
        // topo: na faixa de cima (continuação de linha partida: a borda de cima da célula)
        const top = drawTop ? (s.merged ? undefined : topWinner(s)) : (edge(s, 'top') ?? edge(s, 'bottom'));
        if (top) paintBorder(ctx, brd, top, x + ci.x0, borderWidth(top) / 2, x + ci.x1, borderWidth(top) / 2);
        const bottom = edge(s, 'bottom');
        const lastOfMerge = !slots[ri + 1]?.some((o) => o.col === s.col && o.merged);
        if (bBottom > 0) {
          const b = bottom ?? edge(s, 'top');
          paintBorder(ctx, brd, b, x + ci.x0, rh - bBottom + borderWidth(b) / 2, x + ci.x1, rh - bBottom + borderWidth(b) / 2);
        } else if (lastOfMerge) {
          // fim de página entre esta linha e a próxima: o Word fecha a linha com a borda da divisa
          let w = bottom;
          for (const d of covering(ri + 1, s.col, s.col + s.span)) w = heavier(w, edge(d, 'top'));
          if (w) paintBorder(ctx, brk, w, x + ci.x0, rh + borderWidth(w) / 2, x + ci.x1, rh + borderWidth(w) / 2);
        }
        const left = edge(s, 'left'), right = edge(s, 'right');
        paintBorder(ctx, brd, left, x + ci.x0, 0, x + ci.x0, rh);
        paintBorder(ctx, brd, right, x + ci.x1, 0, x + ci.x1, rh);
        if (tcb?.tl2br) paintBorder(ctx, brd, tcb.tl2br, x + ci.x0, bTop, x + ci.x1, rh - bBottom);
        if (tcb?.tr2bl) paintBorder(ctx, brd, tcb.tr2bl, x + ci.x1, bTop, x + ci.x0, rh - bBottom);
      }
      return {
        height: rh, items: its, lines: lns, borderItems: brd, breakBorderItems: brk, cantSplit: !!row.trPr?.cantSplit, header: !!row.trPr?.tblHeader,
        ...(rowKeepNext ? { keepNext: true } : {}), natural: bTop + Math.min(ch, contentH) + bBottom,
      };
    };
    const full = new Map<CellSlot, CellContent | undefined>(cellInfos.map((ci) => [ci.slot, ci.content]));
    const canSplit = !row.trPr?.cantSplit && row.trPr?.trHeight?.hRule !== 'exact';
    // linha (ou resto de linha) com divisão sob demanda entre páginas
    const build = (ch: number, contents: Map<CellSlot, CellContent | undefined>, vTop: boolean, drawTop: boolean): RowLayout => {
      const r = paintRow(ch, contents, vTop, drawTop, bandTop, bandBottom);
      if (!canSplit) return r;
      r.split = (avail: number) => {
        const a = new Map<CellSlot, CellContent | undefined>();
        const rest = new Map<CellSlot, CellContent | undefined>();
        let h1 = 0, h2 = 0, any = false;
        const availContent = avail - bandTop;
        for (const ci of cellInfos) {
          const c = contents.get(ci.slot);
          if (!c || ci.slot.merged || ci.slot.rowSpan !== 1) { a.set(ci.slot, c); continue; }
          const sp = splitContent(c, availContent - ci.marT - ci.marB);
          if (!sp) {
            rest.set(ci.slot, c);
            h2 = Math.max(h2, c.height + ci.marT + ci.marB);
            continue;
          }
          any = true;
          a.set(ci.slot, sp[0]);
          rest.set(ci.slot, sp[1]);
          h1 = Math.max(h1, sp[0].height + ci.marT + ci.marB);
          h2 = Math.max(h2, sp[1].height + ci.marT + ci.marB);
        }
        if (!any) return null;
        const first = paintRow(h1, a, true, drawTop, bandTop, 0);
        // a parte de cima fecha com a borda inferior da célula (no pé da página)
        first.borderItems.push(...(first.breakBorderItems ?? []));
        first.breakBorderItems = [];
        return [first, build(Math.max(h2, 1), rest, true, false)];
      };
      return r;
    };
    rows.push(build(h, full, false, true));
  });

  // conteúdo das células mescladas verticalmente: o fundo vai na linha inicial
  // (altura somada); o texto, na ÚLTIMA linha da mescla (coordenadas negativas)
  // para ficar por cima dos fundos das linhas de continuação
  for (const m of pendingMerges) {
    const endRow = m.startRow + m.slot.rowSpan - 1;
    const h = rowHeights.slice(m.startRow, endRow + 1).reduce((a, b) => a + b, 0) - bandTopOf(m.startRow) - bandBottomOf(endRow);
    const first = rows[m.startRow]!;
    const target = rows[endRow] ?? first;
    const fill = cellFill(ctx, m.tcPr, tblPr, theme);
    if (fill) first.items.unshift({ t: 'rect', x: x + m.x0, y: 0, w: m.x1 - m.x0, h, fill });
    const marT = widthTw(m.tcPr.tcMar?.top, width) ?? 0;
    const marB = widthTw(m.tcPr.tcMar?.bottom, width) ?? 0;
    // topo da célula mesclada no sistema de coordenadas da linha-alvo
    const top = bandTopOf(m.startRow) - rowHeights.slice(m.startRow, Math.min(endRow, rows.length - 1)).reduce((a, b) => a + b, 0);
    if (m.vertical) {
      const c = layoutVertical(m.slot, h - marT - marB, m.env, `${ref}/r${m.startRow}/c${m.slot.col}`);
      paintVertical(target.items, c, m.vertical, m.tcPr.vAlign, x + m.x0 + m.marL, x + m.x1 - m.marR, top + marT, top + h - marB);
    } else if (m.content) placeContent(target.items, target.lines, m.content, m.tcPr.vAlign, h, marT, marB, top);
  }

  const borderLeft = slots[0]?.[0] ? borderWidth(edge(slots[0][0], 'left')) : 0;
  return { x, width, rows, borderLeft, ...(tblPr.tblpPr ? { tblpPr: tblPr.tblpPr } : {}) };
}

function cellFill(ctx: DocContext, tcPr: TcPr, tblPr: TblPr, theme: DocContext['fmt']['theme']): string | undefined {
  const shd = tcPr.shd ?? tblPr.shd;
  if (!shd) return undefined;
  if (shd.val === 'solid') return resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? '000000';
  const fill = shd.themeFill
    ? resolveColor({ themeColor: shd.themeFill, themeTint: shd.themeFillTint, themeShade: shd.themeFillShade }, theme)
    : shd.fill && shd.fill !== 'auto' ? shd.fill.toUpperCase() : undefined;
  void ctx;
  if (shd.val && /^pct(\d+)$/.test(shd.val)) {
    // padrão percentual: mistura a cor do padrão sobre o preenchimento
    const pct = parseInt(shd.val.slice(3), 10) / 100;
    const fg = resolveColor({ val: shd.color, themeColor: shd.themeColor }, theme) ?? '000000';
    const bg = fill ?? 'FFFFFF';
    const mix = (i: number) => Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - pct) + parseInt(fg.slice(i, i + 2), 16) * pct);
    return [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return fill;
}

/**
 * Pinta o conteúdo de uma célula de texto vertical: o conteúdo foi diagramado
 * num quadro local (x ao longo do texto, y entre linhas) e entra girado —
 * btLr: de baixo para cima (topo das letras à esquerda); tbRl: de cima para baixo.
 * O alinhamento vertical da célula vale entre as linhas (na horizontal da página).
 */
function paintVertical(items: PageItem[], c: CellContent, dir: string, vAlign: string | undefined, left: number, right: number, top: number, bottom: number): void {
  const free = right - left - c.height;
  const off = vAlign === 'center' ? free / 2 : vAlign === 'bottom' ? free : 0;
  const m: [number, number, number, number, number, number] = dir === 'btLr'
    ? [0, -1, 1, 0, left, bottom]
    : [0, 1, -1, 0, right, top];
  items.push({ t: 'xform', op: 'push', m });
  for (const it of c.items) items.push(shiftItem(it, Math.max(0, off)));
  items.push({ t: 'xform', op: 'pop' });
}

function placeContent(items: PageItem[], lines: LaidOutLine[], c: CellContent, vAlign: string | undefined, rowH: number, marT: number, marB: number, y0 = 0): void {
  if (!c) return;
  let dy = y0 + marT;
  const free = rowH - marT - marB - c.height;
  if (vAlign === 'center' && free > 0) dy += free / 2;
  else if (vAlign === 'bottom' && free > 0) dy += free;
  for (const it of c.items) items.push(shiftItem(it, dy));
  for (const l of c.lines) lines.push({ ...l, y: l.y + dy, baseline: l.baseline + dy });
}

export function shiftItem(it: PageItem, dy: number, dx = 0): PageItem {
  switch (it.t) {
    case 'glyphs': return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ cp: g.cp, x: g.x + dx })) : it.glyphs };
    case 'rect': case 'image': case 'shape': return { ...it, x: it.x + dx, y: it.y + dy };
    case 'line': return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case 'clip': return it.y === undefined ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    case 'xform': {
      if (!it.m) return it;
      // mantém M'(p + d) = M(p) + d (o conteúdo de dentro também é deslocado)
      const [a, b, c, d, e, f] = it.m;
      return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] };
    }
    case 'path': return { ...it, cmds: it.cmds.map((c) => c.op === 'Z' ? c : c.op === 'C' ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy }) };
  }
}
