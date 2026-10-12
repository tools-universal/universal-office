import type { TabSpec } from '@universal-office/docx-core';
import type { Glyph, PreparedPara } from './para.js';
import type { DocContext } from './context.js';
import { advanceTwips, shadowExtent } from './para.js';
import { faceMetrics } from './fonts.js';

/** Espaço de largura fixa (en, em, fino, ideográfico…): fora da justificação (oráculo formjust). */
const FIXED_SPACE = (cp: number): boolean => (cp >= 0x2000 && cp <= 0x200a) || cp === 0x3000;

/** Folga do teste "cabe na linha" (twips): só o ruído de ponto flutuante. */
const FIT_EPS = 0.001;

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
  /** termina com quebra de linha w:clear: a seguinte desce para baixo dos flutuantes */
  clear?: boolean;
  /** última linha do parágrafo */
  last: boolean;
  /** tab com parada além do vão do flutuante: 'break' a linha acabou antes dele;
   *  'start' ele abre a linha (o motor a leva para baixo do flutuante) — oráculo tabgap */
  gapTab?: 'break' | 'start';
}

export interface LineFrame {
  /** borda esquerda/direita do espaço disponível para ESTA linha, relativas ao quadro (já com recuos) */
  left: number;
  right: number;
  /** vão ao lado de um flutuante (o quadro foi estreitado por ele) */
  gap?: boolean;
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

/** Há outro tab depois do glifo `i`, antes da próxima quebra de linha/página? */
function moreTabs(gs: Glyph[], i: number): boolean {
  for (let k = i + 1; k < gs.length; k++) {
    const q = gs[k]!;
    if (q.kind === 'tab') return true;
    if (q.kind === 'lb' || q.kind === 'pb' || q.kind === 'cb') return false;
  }
  return false;
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
  /** largura da próxima palavra (até o 1º ponto de quebra): o vão ao lado de um
   *  objeto só recebe texto se ela cabe nele (oráculo wrapsides) */
  peekWordWidth(): number {
    const gs = this.p.glyphs;
    let w = 0;
    for (let e = this.pos; e < gs.length; e++) {
      const q = gs[e]!;
      if (q.kind === 'space' || q.kind === 'tab' || q.kind === 'lb' || q.kind === 'pb' || q.kind === 'cb') break;
      if (q.kind === 'obj' && q.adv === 0) continue;
      w += q.kind === 'shy' ? 0 : q.adv;
      if (q.breakAfter) break;
    }
    return w + (this.lineIdx === 0 ? Math.max(0, this.p.firstLine) : 0);
  }

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
        // o número pode terminar EM CIMA da parada (fim ≤ parada) — oráculo numrpr (nrs-*)
        const xe = x - 0.5 - 1e-3;
        let ns = nextTab(xe, p.tabs, defaultTab, frame.left > xe + 0.5 ? frame.left : undefined, right);
        // doNotUseIndentAsNumberingTabStop (modos ≤ 14): o recuo deslocado não tem
        // prioridade — vale a parada mais próxima, padrão ou o recuo (oráculo numtabind)
        if (this.ctx.fmt.settings.compat['doNotUseIndentAsNumberingTabStop'] && this.ctx.fmt.settings.compatibilityMode < 15) {
          const plain = nextTab(xe, p.tabs, defaultTab, undefined, right);
          ns = frame.left > xe + 0.5 && frame.left < plain.pos ? { pos: frame.left } : plain;
        }
        x = ns.pos;
      } else if (mk.suff === 'space') {
        x += advanceTwips(this.ctx, mk.glyphs[0]?.face ?? p.markFace, 0x20, mk.glyphs[0]?.sizePt ?? p.markStyle.sizePt);
      }
    }

    let i = start;
    let lastBreak = -1;          // índice após o qual é possível quebrar
    // justificado: o Word 2013+ comprime os espaços para caber a palavra — medido
    // (regra em jsweep, abaixo). Nos modos de compatibilidade ≤ 14 não há
    // compressão: a palavra tem de caber (justify6)
    const justify = (p.jc === 'both' || p.jc === 'distribute') && this.ctx.fmt.settings.compatibilityMode >= 15;
    const shrink = this.ctx.opts.justifyShrink;
    let spacesW = 0;             // soma dos espaços da linha (após o último tab)
    let nSpaces = 0;
    // espaços ANTES da 1ª palavra do segmento (início da linha / depois de tab) não
    // comprimem nem expandem (oráculo jlead)
    let segWord = false;
    let lastGapW = 0;            // largura dos espaços imediatamente antes da palavra
    let lastGapSp = 0;           // … só os que comprimem/expandem (contados em spacesW)
    // unidade que desce inteira se não couber (palavra + palavras coladas por NBSP):
    // x do início, espaços da linha antes dela e o vão que a precede
    let unitX = xStart, unitSpacesW = 0, unitGapW = 0, unitGapSp = 0;
    // layout asiático dos modos ≤ 14: quanto os espaços da linha podem comprimir (oráculo fecompress)
    let feShrinkW = 0;
    let wordOk = false;          // a palavra corrente já foi aceita inteira
    let squeezed = false;        // uma palavra da linha só coube comprimindo/pendurando
    let prevWasGap = true;
    let widthAtBreak = 0;        // largura do conteúdo até o ponto de quebra (sem gaps finais)
    let contentEnd = xStart;     // x do fim do último glifo não-branco
    // tab alinhado pendente (right/center/decimal): ajusta seu avanço conforme o segmento cresce
    let pendTab: { idx: number; pos: number; tab: TabSpec; segStart: number; startX: number; decimalSeen: boolean; decimalX: number } | null = null;
    let breakAfter: Line['breakAfter'];
    let clearAfter = false;
    let gapTab: 'break' | 'start' | undefined;
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
        else if (g.clear) clearAfter = true;
        break;
      }
      // linha horizontal VML (o:hr): sozinha na linha — quebra antes e depois (oráculo vmlhr)
      if (g.hr !== undefined) {
        if (placed.some((q) => q.g.kind !== 'obj' || q.g.adv > 0 || q.g.hr !== undefined)) break;
        placed.push({ g, x, w: 0 });
        i++;
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
        // vão ao lado de um flutuante: parada além dele com OUTRO tab adiante na linha acaba a
        // linha antes do tab e o resto vai para baixo do flutuante; tab único fica no fim do
        // vão (oráculo tabgap)
        if (frame.gap && !g.ptab && pos > right + 0.5 && moreTabs(gs, i)) {
          if (i > start) { gapTab = 'break'; break; }
          gapTab = 'start';
        }
        // Word 2013+ (oráculo tocdots-beyond-c15): parada custom direita/centro/decimal
        // além de máx(margem, fim da linha) alinha o texto pela DIREITA no fim da
        // linha (margem − recuo direito); no modo ≤ 14 a posição vale
        if (!g.ptab && tab && (tab.val === 'right' || tab.val === 'center' || tab.val === 'decimal')
          && this.ctx.fmt.settings.compatibilityMode >= 15 && pos > Math.max(right, right + p.indRight) + 0.5) {
          pos = right;
          tab = { ...tab, val: 'right' };
        }
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
        // a quebra fica ANTES do tab: se o texto depois dele não couber, o tab desce junto
        // e recomeça a linha seguinte — o pontilhado vai do início dela (oráculo tabnextline)
        lastBreak = i > start ? i - 1 : i;
        widthAtBreak = contentEnd - xStart;
        spacesW = 0;
        nSpaces = 0;
        feShrinkW = 0;
        segWord = false;
        lastGapW = 0;
        lastGapSp = 0;
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
        // a palavra depois de um espaço que não quebra (colado a NBSP) continua a
        // unidade anterior: se descer, desce a unidade inteira (oráculo nbspglue)
        if (i === start || !(gs[i - 1]!.kind === 'space' && !gs[i - 1]!.breakAfter)) {
          // depois de quebra SEM espaço (hífen, travessão, objeto): a saída alternativa é
          // quebrar ali mesmo — nenhum vão sai da linha (oráculo hyphcomp)
          const gap = i > start && gs[i - 1]!.kind === 'space';
          unitX = x; unitSpacesW = spacesW; unitGapW = gap ? lastGapW : 0; unitGapSp = gap ? lastGapSp : 0;
        }
        // cabe sse W ≤ A, com a largura linear exata (oráculo fitwidth: limiar de 1 twip)
        wordOk = over <= FIT_EPS;
        // layout asiático: a pontuação final pendura além da margem — nos modos ≤ 14
        // sempre (oráculo fecompress), no 15 só no justificado (oráculo hang15)
        const hangW = e > i && gs[e - 1]!.hang && (justify || this.ctx.fmt.settings.compatibilityMode < 15) ? gs[e - 1]!.adv : 0;
        if (!wordOk && (hangW > 0 || feShrinkW > 0) && i > start) {
          // modos ≤ 14: os espaços ainda comprimem até o mínimo de cada um — mas a última
          // palavra do parágrafo que pendura a pontuação não soma a compressão (oráculo fehangcomp)
          const paraEnd = gs.slice(e).every((q) => q.kind === 'pb' || q.kind === 'cb' || (q.kind === 'obj' && q.adv === 0));
          wordOk = over - hangW <= (hangW > 0 && paraEnd ? 0 : feShrinkW) + FIT_EPS;
        }
        if (!wordOk && justify && lastBreak >= start && i > start) {
          // o Word compara as duas saídas: comprimir os n espaços para a palavra
          // caber × levá-la para a linha seguinte e expandir os que sobram.
          // Comprime se cada espaço perde ≤ 25% E ≤ metade do que ganharia
          // (oráculo jsweep; folgas = quantização sub-twip medida no Word). As frações
          // são relativas à LARGURA dos espaços (espaços de tamanhos diferentes na
          // linha, vão duplo: cada um comprime/expande na proporção — oráculo jmixsp)
          const slack = x + wordW - unitX + unitGapW - over;
          const rest = unitSpacesW - unitGapSp;
          const ov = over - hangW; // a pontuação pendurada não precisa caber (oráculo hang15)
          wordOk = nSpaces > 0 && ov <= shrink.ratio * spacesW + 0.0175
            && (nSpaces <= 1 || rest <= 0 || ov / spacesW <= (shrink.expandRatio * slack) / rest + 0.0075 * nSpaces / spacesW);
        }
        // palavra que só coube comprimindo os espaços (ou pendurando a pontuação): a linha
        // acaba nela — a seguinte desce, mesmo que coubesse comprimindo mais (oráculo fejust)
        if (squeezed && i > start) wordOk = false;
        else if (wordOk && over > FIT_EPS) squeezed = true;
        if (this.ctx.opts.onWordFit && over > -2000) {
          this.ctx.opts.onWordFit({ over, spacesW, nSpaces, wordW, lastGapW, justify, accepted: wordOk, lineStart: start, wordStart: i, wordEnd: e,
            sizePt: g.sizePt ?? 0, family: g.face?.family ?? '', compat: this.ctx.fmt.settings.compatibilityMode,
            lineText: gs.slice(start, i).map((q) => q.ch ?? (q.kind === 'space' || q.kind === 'tab' ? ' ' : '')).join(''),
            wordText: gs.slice(i, e).map((q) => q.ch ?? '').join('') });
        }
      }
      // estouro: quebra no último ponto possível
      const projected = isGap ? x : x + g.adv;
      // âncoras de flutuantes (objeto sem largura na linha) não contam como conteúdo: o
      // que vem depois delas e não cabe fica na linha assim mesmo (oráculo floatwide)
      // modo ≤ 14: o texto de um tab DIREITO que não cabe fica na linha, além da margem, e
      // a linha não quebra mais (oráculo tabnextline)
      if (!isGap && g.kind !== 'shy' && !wordOk && !pastMargin && projected > right + FIT_EPS && i > start
        && pendTab?.tab.val === 'right' && this.ctx.fmt.settings.compatibilityMode < 15) pastMargin = true;
      if (!isGap && g.kind !== 'shy' && !wordOk && !pastMargin && projected > right + FIT_EPS && i > start
        && placed.some((q) => q.g.kind !== 'obj' || q.g.adv > 0)) {
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
        if (!prevWasGap) { lastGapW = 0; lastGapSp = 0; }
        lastGapW += g.adv;
        // espaços de largura fixa (en/em/fino… U+2000–U+200A) não comprimem nem expandem
        if (segWord && !FIXED_SPACE(g.cp) && !g.fixed) { spacesW += g.adv; nSpaces++; lastGapSp += g.adv; feShrinkW += g.feShrink ?? 0; }
      } else segWord = true;
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
    // quebra de linha ou de COLUNA no fim do parágrafo: a marca vai para uma linha própria
    // (na coluna/página seguinte — oráculo colbreak); a de página não (pbfit)
    // (de página também, com splitPgBreakAndParaMark nos modos ≤ 14 — oráculo pbmark)
    const lk = placed[placed.length - 1]?.g.kind;
    const splitPg = this.ctx.fmt.settings.compatibilityMode < 15 && !!this.ctx.fmt.settings.compat['splitPgBreakAndParaMark'];
    this.trailingBreak = forced && this.pos >= gs.length && (lk === 'lb' || lk === 'cb' || (lk === 'pb' && splitPg));
    const last = this.pos >= gs.length && !this.trailingBreak;
    this.lineIdx++;

    // métricas verticais
    let asc = 0, desc = 0, tAsc = 0, tDesc = 0;
    /** fonte dos runs de objetos em linha (altura de texto de linha só com objetos) */
    let oAsc = 0, oDesc = 0;
    const content = placed.filter((pg) => pg.g.kind !== 'obj' || pg.g.adv > 0);
    // quebra de linha (w:br) numa linha com objeto em linha: como a marca de parágrafo,
    // não dá altura — a linha da imagem fica com a altura dela (oráculo imgbr)
    const withObj = content.some((pg) => pg.g.kind === 'obj');
    for (const pg of content) {
      if (pg.g.kind === 'pb' || pg.g.kind === 'cb') continue;
      if (pg.g.kind === 'lb' && withObj) continue;
      // espaço comum (U+0020) e tab não dão altura à linha — no fim, no meio ou
      // sozinhos (aí vale a marca de parágrafo); o NBSP dá — oráculos trailsp/hfimg
      if (pg.g.ch === ' ' || pg.g.kind === 'tab') continue;
      asc = Math.max(asc, pg.g.asc);
      desc = Math.max(desc, pg.g.desc);
      // (a caixa de seleção conta como texto — oráculo cbline)
      if (pg.g.kind !== 'obj') { tAsc = Math.max(tAsc, pg.g.nAsc ?? pg.g.asc); tDesc = Math.max(tDesc, pg.g.nDesc ?? pg.g.desc); }
      else if (pg.g.kind === 'obj') {
        const om = faceMetrics(pg.g.face.font);
        oAsc = Math.max(oAsc, om.ascent * pg.g.sizePt * 20);
        oDesc = Math.max(oDesc, om.descent * pg.g.sizePt * 20);
        // objeto SUBLINHADO: o Word desenha o sublinhado sob ele e a descendente da
        // fonte do run entra na linha (oráculo imgul)
        if (pg.g.style.underline && pg.g.style.underline.val !== 'none') desc = Math.max(desc, om.descent * pg.g.sizePt * 20);
      }
    }
    // linha só com objetos em linha: no mínimo a altura da fonte do RUN do objeto (o objeto
    // baixo fica no pé dela) — oráculo imgsmall; o objeto alto define a linha (imgbr)
    if (tAsc + tDesc === 0 && oAsc > 0) asc = Math.max(asc, oAsc + oDesc - desc);
    const emptyLine = asc === 0 && desc === 0;
    if (emptyLine) {
      // linha vazia: altura pela marca de parágrafo (deslocada por w:position — oráculo position)
      const mm = faceMetrics(p.markFace.font);
      // marca em sobrescrito/subscrito: a linha tem a altura do corpo NORMAL, como o
      // texto (oráculo supmark)
      const va = p.markStyle.rpr.vertAlign;
      const sz = (va === 'superscript' || va === 'subscript' ? (p.markStyle.rpr.sz ?? 20) / 2 : p.markStyle.sizePt) * 20;
      const sh = va ? 0 : p.markStyle.shift;
      // (a sombra w14:shadow da marca também conta — oráculo shadowh)
      const [ea, ed] = shadowExtent(p.markStyle);
      asc = Math.max(0, mm.ascent * sz + ea + sh);
      desc = Math.max(0, mm.descent * sz + ed - sh);
    }
    if (tAsc + tDesc === 0) {
      // só objetos: a altura de texto (p/ entrelinha múltipla) vem da fonte do RUN do
      // objeto (oráculo imgline); linha vazia: a caixa da marca JÁ deslocada
      // (pos-empty15); senão a marca de parágrafo
      const mm = faceMetrics(p.markFace.font);
      tAsc = oAsc || (emptyLine ? asc : mm.ascent * p.markStyle.sizePt * 20);
      tDesc = oAsc ? oDesc : emptyLine ? desc : mm.descent * p.markStyle.sizePt * 20;
    }
    // marcador de numeração: só a ASCENDENTE entra na linha (a descendente e a
    // entrelinha múltipla seguem o texto) — oráculo markers
    if (markerPlaced) for (const pg of markerPlaced) asc = Math.max(asc, pg.g.asc);
    const box = lineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : undefined, this.grid);
    // linha do traço horizontal: a da marca ou o traço + 6 pt, a maior (oráculo vmlhr)
    const hrH = placed.reduce((m, pg) => Math.max(m, pg.g.hr ?? -1), -1);
    if (hrH >= 0 && hrH + 120 > box.height) { box.baseline += hrH + 120 - box.height; box.height = hrH + 120; }

    // alinhamento/justificação
    const avail = right - xStart;
    let dx = 0;
    const jc = p.jc;
    // layout asiático dos modos ≤ 14 (oráculo fecompress): a pontuação pendurada fica
    // além da margem e não conta no alinhamento; sem justificar, os espaços comprimem
    // o que passar da margem
    let lastC: PlacedGlyph | undefined;
    for (const pg of placed) if (pg.g.kind !== 'space' && pg.g.kind !== 'lb' && pg.g.kind !== 'pb' && pg.g.kind !== 'cb') lastC = pg;
    const alignW = lastC?.g.hang && width > avail + FIT_EPS ? width - lastC.w : width;
    const justified = (jc === 'both' || jc === 'distribute') && (!last || jc === 'distribute') && breakAfter === undefined;
    if (!justified && alignW > avail + FIT_EPS) {
      const sh = placed.filter((pg) => pg.g.feShrink && pg.x < (lastC?.x ?? 0));
      const total = sh.reduce((a, pg) => a + pg.g.feShrink!, 0);
      if (total > 0) {
        const f = Math.min(1, (alignW - avail) / total);
        let acc = 0;
        for (const pg of placed) {
          pg.x -= acc;
          if (pg.g.feShrink && sh.includes(pg)) { pg.w -= pg.g.feShrink * f; acc += pg.g.feShrink * f; }
        }
      }
    }
    if (jc === 'center') dx = (avail - alignW) / 2;
    else if (jc === 'right') dx = avail - alignW;
    else if (justified) {
      // espaços internos (não finais, depois do último tab)
      let lastTab = -1;
      placed.forEach((pg, k) => { if (pg.g.kind === 'tab') lastTab = k; });
      let lastContent = -1;
      placed.forEach((pg, k) => { if (pg.g.kind !== 'space' && pg.g.kind !== 'lb') lastContent = k; });
      let firstContent = placed.length;
      for (let k = lastTab + 1; k < placed.length; k++) if (placed[k]!.g.kind !== 'space') { firstContent = k; break; }
      const spaces = placed.filter((pg, k) => k > firstContent && k < lastContent && pg.g.kind === 'space' && !FIXED_SPACE(pg.g.cp) && !pg.g.fixed);
      const extra = avail - alignW;
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
      ...(clearAfter ? { clear: true } : {}),
      ...(gapTab ? { gapTab } : {}),
      last,
    };
  }
}
