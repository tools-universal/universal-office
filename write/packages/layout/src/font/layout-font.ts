import type { FontMetrics } from './sfnt.js';

/**
 * O que o layout (e o PDF) precisa de uma fonte. Implementações: SfntFont (lê
 * o arquivo — métricas exatas, embutível no PDF) e CanvasMetricsFont (fonte
 * instalada que o navegador só expõe PELO NOME: mede pelo canvas).
 */
export interface LayoutFont {
  readonly metrics: FontMetrics;
  /** Advance de um code point em TWIPS para um tamanho em pontos. */
  advanceTwips(codePoint: number, sizePt: number): number;
  /** Ajuste de kerning do par (prev → cur) em TWIPS. */
  kernTwips(prevCodePoint: number, codePoint: number, sizePt: number): number;
  glyphId(codePoint: number): number;
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId: number): number;
}
