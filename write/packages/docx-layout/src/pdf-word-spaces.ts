import type { LayoutFont } from './typography/index.js';

/** Fim (twips) do último glifo gravado na página e a baseline dele — o espaço entre corridas de estilos diferentes. */
export interface WordSpaceCursor {
  last: { y: number; xEnd: number } | null;
}

/**
 * O layout não pinta os espaços (só posiciona as palavras): sem eles o texto
 * extraído do PDF sai colado ("conflitodeinteresses"), o que estraga a busca e
 * a cópia. Grava o glifo de espaço onde a distância até o glifo seguinte na
 * mesma baseline passa de meio espaço da fonte — dentro da corrida e entre
 * corridas (estilo que muda depois do espaço). Só o PDF: o layout não muda.
 */
export function withWordSpaces(
  glyphs: readonly { cp: number; x: number }[],
  font: LayoutFont,
  sizePt: number,
  scaleX: number,
  y: number,
  cursor: WordSpaceCursor,
): { cp: number; x: number }[] {
  if (!glyphs.length) return [...glyphs];
  const adv = (cp: number): number => font.advanceTwips(cp, sizePt) * scaleX;
  const last = glyphs[glyphs.length - 1]!;
  const end = { y, xEnd: last.x + adv(last.cp) };
  if (!font.glyphId(32)) {
    cursor.last = end;
    return [...glyphs];
  }
  const min = adv(32) * 0.5;
  const out: { cp: number; x: number }[] = [];
  glyphs.forEach((g, i) => {
    const prev = i > 0 ? glyphs[i - 1]! : null;
    const prevEnd = prev ? prev.x + adv(prev.cp) : cursor.last && Math.abs(cursor.last.y - y) < 1 ? cursor.last.xEnd : null;
    if (prevEnd !== null && g.cp !== 32 && (prev === null || prev.cp !== 32) && g.x - prevEnd > min) out.push({ cp: 32, x: prevEnd });
    out.push(g);
  });
  cursor.last = end;
  return out;
}
