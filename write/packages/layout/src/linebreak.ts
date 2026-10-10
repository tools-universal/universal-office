import type { LayoutFont } from './font/layout-font.js';

/**
 * Quebra de linha estilo app de referência (greedy, primeira-que-couber):
 *  - linhas quebram no início da palavra que não coube;
 *  - espaços ao fim da linha NUNCA causam quebra — podem "pendurar" além da
 *    margem (comportamento clássico do app de referência);
 *  - palavra maior que a linha quebra em granularidade de caractere.
 *
 * Unidades: twips. Validado contra o oráculo word-lab (Information(10)).
 */

export interface LineBox {
  /** Índices [start, end) no texto do parágrafo, incluindo espaços finais. */
  start: number;
  end: number;
  /** Largura do conteúdo sem espaços finais, em twips. */
  widthTwips: number;
}

export interface BreakOptions {
  font: LayoutFont;
  sizePt: number;
  /** Largura útil da página (entre margens), em twips. */
  availableTwips: number;
}

export function breakParagraph(text: string, opts: BreakOptions): LineBox[] {
  const { font, sizePt, availableTwips } = opts;
  const adv = (cp: number) => font.advanceTwips(cp, sizePt);

  const lines: LineBox[] = [];
  let lineStart = 0;
  let width = 0; // largura da linha SEM espaços finais pendentes

  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      // consome o run de espaços — nunca causa quebra
      while (i < text.length && text[i] === ' ') i++;
      continue;
    }
    // mede a próxima palavra
    const wordStart = i;
    let wordWidth = 0;
    while (i < text.length && text[i] !== ' ') {
      wordWidth += adv(text.codePointAt(i)!);
      i++;
    }
    // largura dos espaços entre o fim da linha atual e esta palavra
    let gapWidth = 0;
    for (let s = lineStart === wordStart ? wordStart : findGapStart(text, wordStart); s < wordStart; s++) {
      gapWidth += adv(32);
    }

    if (wordStart > lineStart && width + gapWidth + wordWidth > availableTwips) {
      // palavra não cabe → quebra antes dela (espaços ficam na linha anterior)
      lines.push({ start: lineStart, end: wordStart, widthTwips: width });
      lineStart = wordStart;
      width = wordWidth;
      // palavra-gigante: se sozinha excede a linha, quebra por caractere
      width = emergencyBreak(text, wordStart, i, opts, lines, (s) => { lineStart = s; });
    } else if (wordStart === lineStart && wordWidth > availableTwips) {
      width = emergencyBreak(text, wordStart, i, opts, lines, (s) => { lineStart = s; });
    } else {
      width += gapWidth + wordWidth;
    }
  }
  if (lineStart < text.length || lines.length === 0) {
    lines.push({ start: lineStart, end: text.length, widthTwips: width });
  }
  return lines;
}

function findGapStart(text: string, wordStart: number): number {
  let s = wordStart;
  while (s > 0 && text[s - 1] === ' ') s--;
  return s;
}

/** Quebra palavra maior que a linha em granularidade de caractere. */
function emergencyBreak(
  text: string,
  wordStart: number,
  wordEnd: number,
  opts: BreakOptions,
  lines: LineBox[],
  setLineStart: (s: number) => void,
): number {
  const adv = (cp: number) => opts.font.advanceTwips(cp, opts.sizePt);
  let start = wordStart;
  let w = 0;
  for (let i = wordStart; i < wordEnd; i++) {
    const a = adv(text.codePointAt(i)!);
    if (w + a > opts.availableTwips && i > start) {
      lines.push({ start, end: i, widthTwips: w });
      start = i;
      w = a;
    } else {
      w += a;
    }
  }
  setLineStart(start);
  return w;
}
