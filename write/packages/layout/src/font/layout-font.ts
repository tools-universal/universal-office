import type { FontMetrics } from './sfnt.js';

/**
 * O que o layout (e o PDF) precisa de uma fonte — implementado pelo SfntFont,
 * que lê o ARQUIVO da fonte (o Write sempre mede e embute com o arquivo).
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
  /** Contorno do glifo (unidades da fonte, y para cima) — texto como curvas. */
  glyphOutline?(glyphId: number): import('./sfnt.js').GlyphOutlineCmd[] | null;
  /** Fonte com glifos coloridos (COLR)? — consulta barata antes de colorLayers. */
  hasColorGlyphs?(): boolean;
  /** Camadas de um glifo colorido (COLR v0 + CPAL, paleta 0), na ordem de
   *  pintura; null se o glifo não é colorido. */
  colorLayers?(glyphId: number): import('./sfnt.js').ColorLayer[] | null;
}
