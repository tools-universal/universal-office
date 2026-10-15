/**
 * Funções PURAS de layout do grid (sem DOM/canvas), extraídas do webcomponent
 * para permitir teste unitário: hit-test px→célula com panes congelados e
 * quebra de linha de texto rico (runs) em segmentos.
 *
 * Convenção de geometria (a mesma do <universal-sheet>):
 *   - `edges[i]` = borda esquerda/superior ACUMULADA da coluna/linha i+1
 *     (edges[0]=0; edges[n]=total). Comprimento = maxIndex+2.
 *   - Coordenadas "de conteúdo": px já sem o cabeçalho (0 = primeira célula).
 *   - Com panes: as primeiras `frozenCount` colunas/linhas ficam fixas na tela
 *     (não recebem scroll); o restante desloca por `scroll`, recortado a
 *     partir de `edges[frozenCount]`.
 */

/** Busca binária: maior índice i tal que arr[i] <= x. */
export function bisectLE(arr: ArrayLike<number>, x: number): number {
  let lo = 0, hi = arr.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((arr[mid] ?? 0) <= x) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** Extensão (px) da região congelada = borda direita/inferior do último congelado. */
export function frozenExtent(edges: ArrayLike<number>, frozenCount: number): number {
  return frozenCount > 0 ? (edges[frozenCount] ?? 0) : 0;
}

/**
 * Hit-test 1D com panes: converte uma coordenada de conteúdo (px na tela, sem
 * cabeçalho) no índice 1-based da coluna/linha, considerando que a região
 * congelada não sofre scroll. Null quando fora de [1..maxIndex].
 */
export function pxToIndex(
  edges: ArrayLike<number>, contentPx: number,
  frozenCount: number, scroll: number, maxIndex: number,
): number | null {
  if (contentPx < 0) return null;
  const fpx = frozenExtent(edges, frozenCount);
  // dentro da faixa congelada → coordenada absoluta direta (sem scroll)
  const x = contentPx < fpx ? contentPx : contentPx + scroll;
  const idx = bisectLE(edges, x) + 1;
  if (idx < 1 || idx > maxIndex) return null;
  return idx;
}

/**
 * Posição na tela (coords de conteúdo) da borda esquerda/superior do índice
 * 1-based, considerando panes: congelados são fixos; o resto desloca.
 */
export function indexScreenPos(
  edges: ArrayLike<number>, index: number,
  frozenCount: number, scroll: number,
): number {
  const pos = edges[index - 1] ?? 0;
  return index <= frozenCount ? pos : pos - scroll;
}

/**
 * Índice 1-based cuja borda FINAL (direita/inferior) está a ≤ `tol` px da
 * coordenada de conteúdo — zona de agarre do redimensionamento no cabeçalho.
 * Com bordas coincidentes (colunas ocultas, largura 0) devolve o índice mais
 * alto, como o app de referência. Null fora da zona.
 */
export function boundaryAt(
  edges: ArrayLike<number>, contentPx: number,
  frozenCount: number, scroll: number, maxIndex: number, tol = 3,
): number | null {
  if (contentPx < 0) return null;
  const fpx = frozenExtent(edges, frozenCount);
  // preferência: borda na faixa congelada (coords absolutas, sem scroll) —
  // na linha do freeze, o Excel agarra a coluna/linha CONGELADA
  if (frozenCount > 0 && contentPx <= fpx + tol) {
    const k = bisectLE(edges, contentPx + tol);
    if (k >= 1 && k <= Math.min(frozenCount, maxIndex) && Math.abs((edges[k] ?? 0) - contentPx) <= tol) return k;
  }
  if (contentPx >= fpx || frozenCount === 0) {
    const x = contentPx + scroll;
    const k = bisectLE(edges, x + tol); // último índice com borda ≤ x+tol
    if (k >= 1 && k <= maxIndex && k > frozenCount && Math.abs((edges[k] ?? 0) - x) <= tol) return k;
  }
  return null;
}

/**
 * Inverte a fórmula MDW: px → largura em unidades de caractere (passo 1/256),
 * escolhendo o MENOR width representável cujo colWidthPx dá exatamente `px`
 * (px = floor(((256*w + floor(128/MDW))/256) * MDW), MDW = 7).
 */
export function pxToColWidthChars(px: number, mdw = 7): number {
  if (px <= 0) return 0;
  const u = Math.ceil((256 * px) / mdw - Math.floor(128 / mdw) - 1e-9);
  return Math.max(0, u) / 256;
}

/** px → pontos de altura de linha (px = round(pt × 96/72)); 2 casas como o app. */
export function pxToRowHeightPt(px: number): number {
  return Math.round(px * 0.75 * 100) / 100;
}

// ───────────────────── Padrões legados de preenchimento ─────────────────────

/**
 * Máscaras 8×8 dos pattern fills legados (gray125, darkTrellis, …).
 * Cada linha é um byte; bit mais significativo = pixel x=0. Bit ligado = pixel
 * na cor do padrão (fgColor). Pixel a pixel como o Excel (medido no oráculo,
 * pasta sintética t-fills), em coordenadas ABSOLUTAS da planilha mod 8 (A1 =
 * 0,0): o mesmo padrão em colunas vizinhas continua em fase.
 */
export const PATTERN_MASKS: Record<string, number[]> = (() => {
  const rows = (fn: (x: number, y: number) => boolean): number[] => {
    const out: number[] = [];
    for (let y = 0; y < 8; y++) {
      let m = 0;
      for (let x = 0; x < 8; x++) if (fn(x, y)) m |= 1 << (7 - x);
      out.push(m);
    }
    return out;
  };
  const lightGray = (x: number, y: number): boolean => (y % 2 === 0 ? x % 4 === 0 : x % 4 === 2);
  const gridU = (v: number): boolean => (v + 1) % 4 < 2;
  return {
    gray0625: rows((x, y) => (y % 4 === 0 && x % 8 === 0) || (y % 4 === 2 && x % 8 === 4)),
    gray125: rows((x, y) => (y % 4 === 0 && x % 4 === 0) || (y % 4 === 2 && x % 4 === 2)),
    lightGray: rows(lightGray),
    mediumGray: rows((x, y) => (x + y) % 2 === 0),
    darkGray: rows((x, y) => !(y % 2 === 0 ? x % 4 === 3 : x % 4 === 1)),
    darkHorizontal: rows((_x, y) => y % 4 < 2),
    lightHorizontal: rows((_x, y) => y % 4 === 0),
    darkVertical: rows((x) => x % 4 < 2),
    lightVertical: rows((x) => x % 4 === 0),
    darkDown: rows((x, y) => (x - y + 8) % 4 < 2),
    lightDown: rows((x, y) => (x - y + 8) % 4 === 0),
    darkUp: rows((x, y) => (x + y) % 4 >= 2),
    lightUp: rows((x, y) => (x + y) % 4 === 3),
    darkGrid: rows((x, y) => gridU(x) === gridU(y)),
    lightGrid: rows((x, y) => x % 4 === 0 || y % 4 === 0),
    darkTrellis: rows((x, y) => y % 2 === 0 || (y % 4 === 1 ? x % 4 === 1 || x % 4 === 2 : x % 4 === 0 || x % 4 === 3)),
    lightTrellis: rows((x, y) => (y % 2 === 1 && x % 2 === 1) || (y % 4 === 0 && x % 4 === 0) || (y % 4 === 2 && x % 4 === 2)),
  };
})();

// ───────────────────── Texto rico: quebra em linhas ─────────────────────

/** Segmento de uma linha: fatia de texto pertencente ao run `run`. */
export interface RichSeg {
  text: string;
  /** Índice do run de origem (para estilo/medida). */
  run: number;
}

/**
 * Quebra o texto de runs ricos em linhas que cabem em `maxW`, preservando o
 * run de origem de cada segmento. `measure(text, run)` devolve a largura em px
 * do texto medido com a fonte do run. Regras (como o wrap de célula):
 *   - quebra em espaços (word wrap); espaços não iniciam linha;
 *   - palavra maior que a linha quebra por caractere;
 *   - '\n' força quebra.
 * Sempre devolve ao menos uma linha (possivelmente vazia).
 */
export function layoutRichLines(
  texts: readonly string[], maxW: number,
  measure: (text: string, run: number) => number,
): RichSeg[][] {
  interface Tok { text: string; run: number; }
  // tokeniza preservando espaços como tokens próprios
  const tokens: (Tok | '\n')[] = [];
  for (let r = 0; r < texts.length; r++) {
    for (const piece of (texts[r] ?? '').split(/(\n| +)/)) {
      if (piece === '') continue;
      if (piece === '\n') tokens.push('\n');
      else tokens.push({ text: piece, run: r });
    }
  }

  const lines: RichSeg[][] = [];
  let line: RichSeg[] = [];
  let lineW = 0;

  const pushSeg = (text: string, run: number, w: number): void => {
    const last = line[line.length - 1];
    if (last && last.run === run) last.text += text;
    else line.push({ text, run });
    lineW += w;
  };
  const breakLine = (): void => { lines.push(line); line = []; lineW = 0; };

  for (const tok of tokens) {
    if (tok === '\n') { breakLine(); continue; }
    const isSpace = /^ +$/.test(tok.text);
    const w = measure(tok.text, tok.run);
    if (lineW + w <= maxW || line.length === 0) {
      // cabe (ou linha vazia: aceita ao menos algo — palavra longa trata abaixo)
      if (line.length === 0 && isSpace) continue; // espaço não inicia linha
      if (line.length === 0 && w > maxW) {
        // palavra sozinha maior que a linha: quebra por caractere
        let chunk = '';
        for (const ch of tok.text) {
          const cw = measure(chunk + ch, tok.run);
          if (cw <= maxW || chunk === '') chunk += ch;
          else { pushSeg(chunk, tok.run, measure(chunk, tok.run)); breakLine(); chunk = ch; }
        }
        if (chunk) pushSeg(chunk, tok.run, measure(chunk, tok.run));
        continue;
      }
      pushSeg(tok.text, tok.run, w);
      continue;
    }
    // não cabe: quebra a linha; espaço é descartado na virada
    breakLine();
    if (isSpace) continue;
    if (w > maxW) {
      let chunk = '';
      for (const ch of tok.text) {
        const cw = measure(chunk + ch, tok.run);
        if (cw <= maxW || chunk === '') chunk += ch;
        else { pushSeg(chunk, tok.run, measure(chunk, tok.run)); breakLine(); chunk = ch; }
      }
      if (chunk) pushSeg(chunk, tok.run, measure(chunk, tok.run));
    } else {
      pushSeg(tok.text, tok.run, w);
    }
  }
  lines.push(line);
  return lines;
}

/** Retângulo de mescla (1-based, inclusivo). */
export interface MergeRect { c1: number; r1: number; c2: number; r2: number }

/**
 * Índice espacial das mesclas: blocos de 64×64 células → mesclas que os tocam
 * (mescla enorme vai para uma lista "grande", sempre consultada). A busca era
 * linear por célula pintada — 50 mil mesclas travavam a pintura.
 */
export class MergeIndex {
  private blocks = new Map<number, MergeRect[]>();
  private big: MergeRect[] = [];
  constructor(rects: MergeRect[]) {
    for (const m of rects) {
      const bc1 = (m.c1 - 1) >> 6, bc2 = (m.c2 - 1) >> 6, br1 = (m.r1 - 1) >> 6, br2 = (m.r2 - 1) >> 6;
      if ((bc2 - bc1 + 1) * (br2 - br1 + 1) > 256) { this.big.push(m); continue; }
      for (let br = br1; br <= br2; br++) {
        for (let bc = bc1; bc <= bc2; bc++) {
          const k = br * 1024 + bc;
          const list = this.blocks.get(k);
          if (list) list.push(m); else this.blocks.set(k, [m]);
        }
      }
    }
  }
  /** Mescla que contém a célula (col,row), se houver. */
  at(col: number, row: number): MergeRect | undefined {
    const list = this.blocks.get(((row - 1) >> 6) * 1024 + ((col - 1) >> 6));
    if (list) for (const m of list) if (col >= m.c1 && col <= m.c2 && row >= m.r1 && row <= m.r2) return m;
    for (const m of this.big) if (col >= m.c1 && col <= m.c2 && row >= m.r1 && row <= m.r2) return m;
    return undefined;
  }
}
