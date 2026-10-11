import type { TabSpec } from '@universal-office/docx-core';
import type { Glyph, PreparedPara } from './para.js';
import type { DocContext } from './context.js';
import { advanceTwips } from './para.js';
import { faceMetrics } from './fonts.js';

/**
 * Quebra de linha do Word (greedy): quebra no início da palavra que não coube;
 * espaços/tabs finais penduram além da margem; hífen e hífen opcional são
 * oportunidades; palavra maior que a linha quebra por caractere.
 * Tabs: paradas custom (left/center/right/decimal/bar, com preenchimento)
 * relativas à borda esquerda do quadro de texto; sem parada custom à frente,
 * grade de defaultTabStop a partir de 0; o recuo deslocado (hanging) é uma
 * parada implícita na 1ª linha.
 */

export interface PlacedGlyph {
  g: Glyph;
  /** x relativo à borda esquerda do quadro (twips) */
  x: number;
  /** largura efetiva (tabs/justificação incluídos) */
  w: number;
  /** tab com preenchimento */
  leader?: string;
}

export interface Line {
  /** índices [start, end) em para.glyphs */
  start: number;
  end: number;
  placed: PlacedGlyph[];
  /** marcador de numeração na 1ª linha */
  marker?: PlacedGlyph[];
  /** largura do conteúdo (sem espaços finais), a partir de xStart */
  width: number;
  xStart: number;
  /** métricas verticais naturais */
  asc: number;
  desc: number;
  /** altura final (regra de entrelinha aplicada) e baseline relativa ao topo */
  height: number;
  baseline: number;
  /** termina com quebra manual de página/coluna */
  breakAfter?: 'page' | 'column';
  /** última linha do parágrafo */
  last: boolean;
}

export interface LineFrame {
  /** borda esquerda/direita do espaço disponível para ESTA linha, relativas ao quadro (já com recuos) */
  left: number;
  right: number;
}

function nextTab(
  x: number, tabs: TabSpec[], defaultTab: number, hangingStop: number | undefined, rightLimit: number,
): { pos: number; tab?: TabSpec } {
  let best: { pos: number; tab?: TabSpec } | undefined;
  for (const t of tabs) {
    if (t.val === 'bar') continue;
    if (t.pos > x + 0.5) { best = { pos: t.pos, tab: t }; break; }
  }
  if (hangingStop !== undefined && hangingStop > x + 0.5 && (!best || hangingStop < best.pos)) {
    best = { pos: hangingStop };
  }
  if (best) return best;
  const lastCustom = tabs.length ? Math.max(...tabs.map((t) => t.pos)) : -Infinity;
  const from = Math.max(x, lastCustom);
  const dts = defaultTab > 0 ? defaultTab : 720;
  let pos = (Math.floor(from / dts + 1e-6) + 1) * dts;
  if (pos <= x + 0.5) pos += dts;
  void rightLimit;
  return { pos };
}

/** Altura/baseline da linha pela regra de entrelinha (medido no Word — ver FINDINGS). */
export function lineBox(asc: number, desc: number, p: PreparedPara, textNat?: number, grid?: number): { height: number; baseline: number } {
  const nat = asc + desc;
  if (p.lineRule === 'exact') {
    const h = p.line;
    return { height: h, baseline: h * 0.8 };
  }
  if (grid && grid > 0) {
    // grade do documento (docGrid type=lines) — medido no oráculo docgrid: a
    // linha ocupa o menor nº de passos da grade que comporta a altura natural,
    // com o texto CENTRADO; a entrelinha múltipla vale sobre UM passo
    // (altura = máx(passo × fator, passos × passo)); mínima: a caixa da grade
    // fica no PÉ da altura mínima
    const g = Math.max(1, Math.ceil((nat - 1) / grid)) * grid;
    const gBase = (g - nat) / 2 + asc;
    if (p.lineRule === 'atLeast') {
      const h = Math.max(g, p.line);
      return { height: h, baseline: h - g + gBase };
    }
    const h = Math.max((grid * p.line) / 240, g);
    return { height: h, baseline: (h - nat) / 2 + asc };
  }
  if (p.lineRule === 'atLeast') {
    const h = Math.max(nat, p.line);
    return { height: h, baseline: h - desc };
  }
  // múltipla: o extra é (fator − 1) × altura do TEXTO (objetos inline não
  // são multiplicados — medido no Word) e vai ABAIXO da linha
  const extra = (p.line / 240 - 1) * (textNat ?? nat);
  const h = nat + extra;
  return { height: h, baseline: extra >= 0 ? asc : asc * (h / nat) };
}

export class LineBreaker {
  pos = 0;
  lineIdx = 0;
  /** quebra de linha (w:br) no FIM do parágrafo: a marca de parágrafo vai
   *  para uma linha vazia própria (Word) */
  private trailingBreak = false;
  constructor(
    private ctx: DocContext,
    readonly p: PreparedPara,
    /** passo da grade de linhas da seção (twips) — só no corpo, se o parágrafo encaixa */
    private grid?: number,
  ) {}

  done(): boolean {
    return this.pos >= this.p.glyphs.length && this.lineIdx > 0 && !this.trailingBreak;
  }

  /** Estado antes de uma linha (para refazê-la noutro quadro). */
  mark(): { pos: number; lineIdx: number; trailingBreak: boolean } {
    return { pos: this.pos, lineIdx: this.lineIdx, trailingBreak: this.trailingBreak };
  }

  reset(m: { pos: number; lineIdx: number; trailingBreak: boolean }): void {
    this.pos = m.pos;
    this.lineIdx = m.lineIdx;
    this.trailingBreak = m.trailingBreak;
  }

  /** Próxima linha no quadro dado. `frame` já desconta recuos do parágrafo. */
  next(frame: LineFrame): Line {
    const p = this.p;
    const gs = p.glyphs;
    const first = this.lineIdx === 0;
    const start = this.pos;
    const xStart = frame.left + (first ? p.firstLine : 0);
    const right = frame.right;
    const placed: PlacedGlyph[] = [];
    let x = xStart;
    let markerPlaced: PlacedGlyph[] | undefined;
    const defaultTab = this.ctx.fmt.settings.defaultTabStop;
    // recuo deslocado = parada implícita (1ª linha)
    const hangingStop = first && p.firstLine < 0 ? frame.left : undefined;

    // marcador de numeração (só na 1ª linha)
    if (first && p.marker) {
      const mk = p.marker;
      let mx = xStart;
      if (mk.jc === 'right') mx -= mk.width;
      else if (mk.jc === 'center') mx -= mk.width / 2;
      markerPlaced = [];
      for (const g of mk.glyphs) { markerPlaced.push({ g, x: mx, w: g.adv }); mx += g.adv; }
      x = Math.max(mx, xStart);
      if (mk.suff === 'tab') {
        // tab após o número: próxima parada (o recuo esquerdo conta como parada)
        const ns = nextTab(x, p.tabs, defaultTab, frame.left > x + 0.5 ? frame.left : undefined, right);
        x = ns.pos;
      } else if (mk.suff === 'space') {
        x += advanceTwips(this.ctx, mk.glyphs[0]?.face ?? p.markFace, 0x20, mk.glyphs[0]?.sizePt ?? p.markStyle.sizePt);
      }
    }

    let i = start;
    let lastBreak = -1;          // índice após o qual é possível quebrar
    // justificado: o Word 2013+ comprime os espaços para caber a palavra — medido
    // no oráculo (justify2..5): cabe se o excesso ≤ mín(25% da soma dos espaços
    // da linha, 35% da largura da palavra + espaço anterior). Nos modos de
    // compatibilidade ≤ 14 não há compressão: a palavra tem de caber (justify6)
    const justify = (p.jc === 'both' || p.jc === 'distribute') && this.ctx.fmt.settings.compatibilityMode >= 15;
    const shrink = this.ctx.opts.justifyShrink;
    let spacesW = 0;             // soma dos espaços da linha (após o último tab)
    let lastGapW = 0;            // largura dos espaços imediatamente antes da palavra
    let wordOk = false;          // a palavra corrente já foi aceita inteira
    let prevWasGap = true;
    let widthAtBreak = 0;        // largura do conteúdo até o ponto de quebra (sem gaps finais)
    let contentEnd = xStart;     // x do fim do último glifo não-branco
    // tab alinhado pendente (right/center/decimal): ajusta seu avanço conforme o segmento cresce
    let pendTab: { idx: number; pos: number; tab: TabSpec; segStart: number; startX: number; decimalSeen: boolean; decimalX: number } | null = null;
    let breakAfter: Line['breakAfter'];
    let pastMargin = false;
    let forced = false;

    const closePending = () => {
      if (!pendTab) return;
      const pt = placed[pendTab.idx]!;
      const segW = x - pendTab.segStart;
      let shift = 0;
      const avail = pendTab.pos - pendTab.startX;
      if (pendTab.tab.val === 'right') shift = Math.max(0, avail - segW);
      else if (pendTab.tab.val === 'center') shift = Math.max(0, avail - segW / 2);
      else if (pendTab.tab.val === 'decimal') {
        const dx = pendTab.decimalSeen ? pendTab.decimalX - pendTab.segStart : segW;
        shift = Math.max(0, avail - dx);
      }
      pt.w = shift;
      for (let k = pendTab.idx + 1; k < placed.length; k++) placed[k]!.x += shift;
      x += shift;
      if (contentEnd > pendTab.segStart) contentEnd += shift;
      pendTab = null;
    };

    for (; i < gs.length; i++) {
      const g = gs[i]!;
      if (g.kind === 'lb' || g.kind === 'pb' || g.kind === 'cb') {
        closePending();
        placed.push({ g, x, w: 0 });
        i++;
        forced = true;
        if (g.kind === 'pb') breakAfter = 'page';
        else if (g.kind === 'cb') breakAfter = 'column';
        break;
      }
      if (g.kind === 'tab') {
        closePending();
        let pos: number; let tab: TabSpec | undefined;
        if (g.ptab) {
          // tab absoluto: alinhamento relativo à margem/recuo
          const width = right - frame.left;
          pos = g.ptab.alignment === 'center' ? frame.left + width / 2 : g.ptab.alignment === 'right' ? right : frame.left;
          tab = { val: g.ptab.alignment === 'center' ? 'center' : g.ptab.alignment === 'right' ? 'right' : 'left', pos, ...(g.ptab.leader && g.ptab.leader !== 'none' ? { leader: g.ptab.leader as TabSpec['leader'] } : {}) };
        } else ({ pos, tab } = nextTab(x, p.tabs, defaultTab, hangingStop, right));
        // sem parada até a margem direita: a linha quebra ANTES do tab, que
        // recomeça na linha seguinte (na 1ª parada dela) — oráculo tabs
        // (modo ≤ 14 com paradas custom: o tab segue além da margem pela grade padrão)
        const legacyNoWrap = this.ctx.fmt.settings.compatibilityMode < 15 && p.tabs.some((t) => t.val !== 'bar' && t.val !== 'clear');
        // (tab sem conteúdo depois, no fim do parágrafo: pendura como espaço)
        // (parada CUSTOM além da margem vale — sumários com tab direito na margem)
        if (!g.ptab && !tab && !legacyNoWrap && pos > right + 0.5 && i > start && gs.slice(i + 1).some((q) => q.kind === 'char' || q.kind === 'obj' || q.kind === 'nbsp' || q.kind === 'box')) break;
        // modo antigo: depois de um tab além da margem o resto da linha não quebra (oráculo tabs c14)
        if (legacyNoWrap && pos > right + 0.5) pastMargin = true;
        const pg: PlacedGlyph = { g, x, w: 0, ...(tab?.leader && tab.leader !== 'none' ? { leader: tab.leader } : {}) };
        placed.push(pg);
        if (tab && (tab.val === 'right' || tab.val === 'center' || tab.val === 'decimal')) {
          pendTab = { idx: placed.length - 1, pos, tab, segStart: x, startX: x, decimalSeen: false, decimalX: 0 };
        } else {
          pg.w = Math.max(0, pos - x);
          x = Math.max(x, pos);
        }
        lastBreak = i;
        widthAtBreak = contentEnd - xStart;
        spacesW = 0;
        lastGapW = 0;
        prevWasGap = true;
        continue;
      }
      if (g.kind === 'obj' && g.adv === 0) { placed.push({ g, x, w: 0 }); continue; } // âncora
      const isGap = g.kind === 'space';
      if (!isGap && g.kind !== 'shy' && prevWasGap) {
        // início de palavra: decide se ela cabe inteira (com compressão, se justificado)
        let e = i, wordW = 0;
        for (; e < gs.length; e++) {
          const q = gs[e]!;
          if (q.kind === 'space' || q.kind === 'tab' || q.kind === 'lb' || q.kind === 'pb' || q.kind === 'cb') break;
          if (q.kind === 'obj' && q.adv === 0) continue;
          wordW += q.kind === 'shy' ? 0 : q.adv;
          if (q.breakAfter && q.kind !== 'char') break;
          if (q.breakAfter) { e++; break; }
        }
        const over = x + wordW - right;
        wordOk = over <= 0.5;
        if (!wordOk && justify && lastBreak >= start && i > start) {
          const allowed = Math.min(shrink.ratio * spacesW, shrink.wordRatio * (wordW + lastGapW));
          wordOk = over <= allowed + 0.5;
        }
      }
      // estouro: quebra no último ponto possível
      const projected = isGap ? x : x + g.adv;
      if (!isGap && g.kind !== 'shy' && !wordOk && !pastMargin && projected > right + 0.5 && i > start) {
        if (lastBreak >= start) {
          // volta ao ponto de quebra
          const keep = lastBreak + 1;
          while (placed.length && placed[placed.length - 1]!.g !== gs[lastBreak]) placed.pop();
          i = keep;
          // hífen opcional no ponto de quebra vira hífen visível
          const brk = gs[lastBreak]!;
          if (brk.kind === 'shy') {
            const last = placed[placed.length - 1]!;
            last.w = advanceTwips(this.ctx, brk.face, 0x2d, brk.sizePt);
            contentEnd = last.x + last.w;
            widthAtBreak = contentEnd - xStart;
          } else {
            contentEnd = xStart + widthAtBreak;
          }
          pendTab = null;
          break;
        }
        // palavra maior que a linha: quebra por caractere (o glifo atual desce)
        break;
      }
      if (g.kind === 'shy') {
        placed.push({ g, x, w: 0 });
        prevWasGap = true;
        lastBreak = i;
        widthAtBreak = contentEnd - xStart;
        continue;
      }
      placed.push({ g, x, w: g.adv });
      if (isGap) {
        if (!prevWasGap) lastGapW = 0;
        lastGapW += g.adv;
        spacesW += g.adv;
      }
      prevWasGap = isGap || !!g.breakAfter;
      if (pendTab?.tab.val === 'decimal' && !pendTab.decimalSeen && (g.ch === ',' || g.ch === '.')) {
        pendTab.decimalSeen = true;
        pendTab.decimalX = x;
      }
      x += g.adv;
      if (!isGap) contentEnd = x;
      if (g.breakAfter) {
        lastBreak = i;
        widthAtBreak = (isGap ? contentEnd : x) - xStart;
      }
    }
    closePending();
    // espaços/tabs finais penduram: largura = até o último não-branco
    let width = 0;
    for (const pg of placed) {
      if (pg.g.kind !== 'space' && pg.g.kind !== 'lb' && pg.g.kind !== 'pb' && pg.g.kind !== 'cb') {
        width = Math.max(width, pg.x + pg.w - xStart);
      }
    }
    this.pos = Math.min(gs.length, i);
    if (this.pos === start && start < gs.length) this.pos = start + 1; // garante progresso
    this.trailingBreak = forced && this.pos >= gs.length && placed[placed.length - 1]?.g.kind === 'lb';
    const last = this.pos >= gs.length && !this.trailingBreak;
    this.lineIdx++;

    // métricas verticais
    let asc = 0, desc = 0, tAsc = 0, tDesc = 0;
    const content = placed.filter((pg) => pg.g.kind !== 'obj' || pg.g.adv > 0);
    for (const pg of content) {
      if (pg.g.kind === 'pb' || pg.g.kind === 'cb') continue;
      // espaço comum (U+0020) e tab não dão altura à linha — no fim, no meio ou
      // sozinhos (aí vale a marca de parágrafo); o NBSP dá — oráculos trailsp/hfimg
      if (pg.g.ch === ' ' || pg.g.kind === 'tab') continue;
      asc = Math.max(asc, pg.g.asc);
      desc = Math.max(desc, pg.g.desc);
      if (pg.g.kind !== 'obj' && pg.g.kind !== 'box') { tAsc = Math.max(tAsc, pg.g.asc); tDesc = Math.max(tDesc, pg.g.desc); }

    }
    if (tAsc + tDesc === 0) {
      // só objetos: a altura de texto (p/ entrelinha múltipla) vem da marca de parágrafo
      const mm = faceMetrics(p.markFace.font);
      tAsc = mm.ascent * p.markStyle.sizePt * 20;
      tDesc = mm.descent * p.markStyle.sizePt * 20;
    }
    if (asc === 0 && desc === 0) {
      // linha vazia: altura pela marca de parágrafo
      const mm = faceMetrics(p.markFace.font);
      const sz = p.markStyle.sizePt * 20;
      asc = mm.ascent * sz;
      desc = mm.descent * sz;
    }
    // marcador de numeração: só a ASCENDENTE entra na linha (a descendente e a
    // entrelinha múltipla seguem o texto) — oráculo markers
    if (markerPlaced) for (const pg of markerPlaced) asc = Math.max(asc, pg.g.asc);
    const box = lineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : undefined, this.grid);

    // alinhamento/justificação
    const avail = right - xStart;
    let dx = 0;
    const jc = p.jc;
    if (jc === 'center') dx = (avail - width) / 2;
    else if (jc === 'right') dx = avail - width;
    else if ((jc === 'both' || jc === 'distribute') && (!last || jc === 'distribute') && breakAfter === undefined) {
      // espaços internos (não finais, depois do último tab)
      let lastTab = -1;
      placed.forEach((pg, k) => { if (pg.g.kind === 'tab') lastTab = k; });
      let lastContent = -1;
      placed.forEach((pg, k) => { if (pg.g.kind !== 'space' && pg.g.kind !== 'lb') lastContent = k; });
      const spaces = placed.filter((pg, k) => k > lastTab && k < lastContent && pg.g.kind === 'space');
      const extra = avail - width;
      if (spaces.length && (extra > 0 || extra < 0)) {
        const each = extra / spaces.length;
        let acc = 0;
        for (let k = 0; k < placed.length; k++) {
          const pg = placed[k]!;
          pg.x += acc;
          if (spaces.includes(pg)) { pg.w += each; acc += each; }
        }
      }
    }
    if (dx > 0 || dx < 0) {
      for (const pg of placed) pg.x += dx;
      if (markerPlaced && jc !== 'left') for (const pg of markerPlaced) pg.x += dx;
    }
    return {
      start, end: this.pos, placed,
      ...(markerPlaced ? { marker: markerPlaced } : {}),
      width, xStart: xStart + Math.max(0, dx),
      asc, desc, height: box.height, baseline: box.baseline,
      ...(breakAfter ? { breakAfter } : {}),
      last,
    };
  }
}
