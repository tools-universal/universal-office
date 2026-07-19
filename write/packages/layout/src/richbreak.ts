import type { SfntFont } from './font/sfnt.js';

/**
 * Quebra de linha com runs heterogêneos, tabs e recuos especiais.
 * Regras validadas contra o app de referência (FINDINGS.md):
 *  - greedy, quebra no início da palavra que não coube;
 *  - espaços E TABS finais nunca causam quebra (penduram);
 *  - tab avança ao próximo múltiplo de defaultTabStop (708tw) contado da
 *    MARGEM esquerda (não do recuo) — oráculo tab-oracle;
 *  - palavra maior que a linha quebra por caractere;
 *  - w:spacing de caractere soma a cada advance.
 */

export type FontVariant = 'regular' | 'bold' | 'italic' | 'boldItalic';

export interface FontRegistry {
  resolve(family: string | undefined, variant: FontVariant): SfntFont;
}

export interface StyledSpan {
  text: string;
  family?: string;
  variant: FontVariant;
  sizePt: number;
  /** w:spacing do rPr, em twips por caractere. */
  letterSpacingTwips?: number;
  /** Span de imagem inline: text é '￼', avança pela largura. */
  imageWidthTwips?: number;
  imageHeightTwips?: number;
}

export interface RichSegment {
  spanIndex: number;
  start: number;
  end: number;
  xTwips: number;
  widthTwips: number;
}

export interface RichLine {
  start: number;
  end: number;
  widthTwips: number;
  segments: RichSegment[];
  maxSizePt: number;
  maxAscTwips: number;
}

export interface TabStop {
  posTwips: number;
  align: 'left' | 'right' | 'center';
  leader?: 'dot';
}

export interface BreakRichOptions {
  /** Largura útil das linhas após a primeira (coluna − indents). */
  availableTwips: number;
  /** Largura útil da primeira linha (difere com firstLine/hanging). */
  firstLineAvailableTwips?: number;
  /** Distância do início desta linha à margem esquerda (p/ grade de tabs). */
  tabOriginOffsetTwips?: number;
  firstLineTabOriginOffsetTwips?: number;
  defaultTabStopTwips?: number;
  /** Tab stops do parágrafo (w:tabs) — têm prioridade sobre a grade default. */
  tabStops?: TabStop[];
  /** Drop cap do parágrafo anterior: recua as primeiras k linhas. */
  indentFirstKLines?: { k: number; indentTwips: number };
}

interface CharInfo {
  ch: string;
  spanIndex: number;
  offsetInSpan: number;
  baseAdvance: number;
  isGap: boolean; // espaço ou tab
  isTab: boolean;
}

export function breakRich(
  spans: StyledSpan[],
  fonts: FontRegistry,
  opts: BreakRichOptions,
): { lines: RichLine[]; charAdvances: number[]; tabLeaders: Map<number, 'dot'> } {
  const tabLeaders = new Map<number, 'dot'>();
  const tabStop = opts.defaultTabStopTwips ?? 708;
  const chars: CharInfo[] = [];
  spans.forEach((span, si) => {
    const font = fonts.resolve(span.family, span.variant);
    const ls = span.letterSpacingTwips ?? 0;
    for (let i = 0; i < span.text.length; i++) {
      const ch = span.text[i]!;
      const isTab = ch === '\t';
      let adv: number;
      if (span.imageWidthTwips !== undefined) adv = span.imageWidthTwips;
      else if (isTab || ch === '\n' || ch === '\f') adv = 0;
      else {
        adv = font.advanceTwips(ch.codePointAt(0)!, span.sizePt) + ls;
        // kerning do par (ch, próximo) — o app de referência aplica 'kern' por padrão
        const next = span.text[i + 1];
        if (next && next !== ' ' && next !== '\t' && ch !== ' ') {
          adv += font.kernTwips(ch.codePointAt(0)!, next.codePointAt(0)!, span.sizePt);
        }
      }
      chars.push({
        ch,
        spanIndex: si,
        offsetInSpan: i,
        baseAdvance: adv,
        isGap: span.imageWidthTwips === undefined && (ch === ' ' || isTab),
        isTab: span.imageWidthTwips === undefined && isTab,
      });
    }
  });
  const charAdvances = new Array<number>(chars.length).fill(0);

  const availOf = (lineIdx: number) => {
    let avail = lineIdx === 0
      ? opts.firstLineAvailableTwips ?? opts.availableTwips
      : opts.availableTwips;
    if (opts.indentFirstKLines && lineIdx < opts.indentFirstKLines.k) {
      avail -= opts.indentFirstKLines.indentTwips;
    }
    return avail;
  };
  const tabOffsetOf = (lineIdx: number) =>
    lineIdx === 0
      ? opts.firstLineTabOriginOffsetTwips ?? opts.tabOriginOffsetTwips ?? 0
      : opts.tabOriginOffsetTwips ?? 0;

  const breaks: { start: number; end: number; widthTwips: number }[] = [];
  let lineStart = 0;
  let width = 0;       // conteúdo sem gaps finais
  let pendingGap = 0;  // gaps desde a última palavra
  let i = 0;

  const lineIdx = () => breaks.length;

  while (i < chars.length) {
    const c = chars[i]!;
    // quebras forçadas: \n (w:br) e \f (w:br type=page) terminam a linha aqui
    if (c.ch === '\n' || c.ch === '\f') {
      charAdvances[i] = 0;
      breaks.push({ start: lineStart, end: i + 1, widthTwips: width + pendingGap });
      lineStart = i + 1;
      width = 0;
      pendingGap = 0;
      i++;
      continue;
    }
    if (c.isGap) {
      const cursor = width + pendingGap;
      let adv: number;
      if (c.isTab) {
        const fromMargin = tabOffsetOf(lineIdx()) + cursor;
        // tab stop customizado (w:tabs) tem prioridade sobre a grade default
        const custom = opts.tabStops?.find((t) => t.posTwips > fromMargin + 1);
        if (custom) {
          if (custom.align === 'right') {
            // mede o texto seguinte (até próximo tab/quebra) p/ ALINHAR à direita
            let w = 0;
            for (let k = i + 1; k < chars.length; k++) {
              const cc = chars[k]!;
              if (cc.isTab || cc.ch === '\n' || cc.ch === '\f') break;
              w += cc.baseAdvance;
            }
            adv = Math.max(80, custom.posTwips - fromMargin - w);
          } else {
            adv = custom.posTwips - fromMargin;
          }
          if (custom.leader) tabLeaders.set(i, custom.leader);
        } else {
          const next = (Math.floor(fromMargin / tabStop + 1e-6) + 1) * tabStop;
          adv = next - fromMargin;
        }
      } else adv = c.baseAdvance;
      charAdvances[i] = adv;
      pendingGap += adv;
      i++;
      continue;
    }
    const wordStart = i;
    let wordWidth = 0;
    // a palavra termina em gap OU em quebra forçada (\n/\f) — senão a quebra
    // de página/linha no meio do texto seria engolida pela palavra
    while (i < chars.length && !chars[i]!.isGap && chars[i]!.ch !== '\n' && chars[i]!.ch !== '\f') {
      charAdvances[i] = chars[i]!.baseAdvance;
      wordWidth += chars[i]!.baseAdvance;
      i++;
    }
    const avail = availOf(lineIdx());
    if (wordStart > lineStart && width + pendingGap + wordWidth > avail) {
      breaks.push({ start: lineStart, end: wordStart, widthTwips: width });
      lineStart = wordStart;
      width = wordWidth;
      pendingGap = 0;
      // re-resolve advances da palavra (não muda: advances fixos) — tabs não.
      // palavra-gigante na nova linha
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => { lineStart = s; }, width);
    } else if (wordStart === lineStart && wordWidth > avail) {
      width = emergency(chars, charAdvances, wordStart, i, availOf, lineIdx, breaks, (s) => { lineStart = s; }, wordWidth);
      pendingGap = 0;
    } else {
      width += pendingGap + wordWidth;
      pendingGap = 0;
    }
  }
  if (lineStart < chars.length || breaks.length === 0) {
    breaks.push({ start: lineStart, end: chars.length, widthTwips: width });
  }

  const lines: RichLine[] = breaks.map((b) => {
    const segments: RichSegment[] = [];
    let x = 0;
    let maxSizePt = 0;
    let maxAscTwips = 0;
    let segStart = b.start;
    for (let k = b.start; k <= b.end; k++) {
      const boundary = k === b.end || chars[k]!.spanIndex !== chars[segStart]!.spanIndex;
      if (boundary && k > segStart) {
        const first = chars[segStart]!;
        let w = 0;
        for (let m = segStart; m < k; m++) w += charAdvances[m]!;
        segments.push({
          spanIndex: first.spanIndex,
          start: first.offsetInSpan,
          end: chars[k - 1]!.offsetInSpan + 1,
          xTwips: x,
          widthTwips: w,
        });
        const span = spans[first.spanIndex]!;
        const font = fonts.resolve(span.family, span.variant);
        maxSizePt = Math.max(maxSizePt, span.sizePt);
        maxAscTwips = Math.max(
          maxAscTwips,
          span.imageHeightTwips ??
            (font.metrics.ascender / font.metrics.unitsPerEm) * span.sizePt * 20,
        );
        x += w;
        segStart = k;
      }
    }
    if (segments.length === 0 && spans.length > 0) {
      maxSizePt = spans[0]!.sizePt;
      const f = fonts.resolve(spans[0]!.family, spans[0]!.variant);
      maxAscTwips = (f.metrics.ascender / f.metrics.unitsPerEm) * maxSizePt * 20;
    }
    return { start: b.start, end: b.end, widthTwips: b.widthTwips, segments, maxSizePt, maxAscTwips };
  });

  return { lines, charAdvances, tabLeaders };
}

function emergency(
  chars: CharInfo[],
  charAdvances: number[],
  wordStart: number,
  wordEnd: number,
  availOf: (li: number) => number,
  lineIdx: () => number,
  breaks: { start: number; end: number; widthTwips: number }[],
  setLineStart: (s: number) => void,
  initialWidth: number,
): number {
  // se a palavra cabe afinal (chamada pós-quebra), nada a fazer
  if (initialWidth <= availOf(lineIdx())) return initialWidth;
  let start = wordStart;
  let w = 0;
  for (let k = wordStart; k < wordEnd; k++) {
    const a = charAdvances[k]!;
    if (w + a > availOf(lineIdx()) && k > start) {
      breaks.push({ start, end: k, widthTwips: w });
      start = k;
      w = a;
    } else w += a;
  }
  setLineStart(start);
  return w;
}
