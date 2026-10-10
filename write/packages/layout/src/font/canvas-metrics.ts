import type { LayoutFont } from './layout-font.js';
import type { FontMetrics } from './sfnt.js';

/** Contexto 2D mínimo (canvas do DOM ou OffscreenCanvas). */
export interface MeasureContext {
  font: string;
  measureText(text: string): {
    width: number;
    fontBoundingBoxAscent?: number;
    fontBoundingBoxDescent?: number;
  };
}

/** Em virtual (px no canvas = unidades da fonte): 2048, como a maioria dos TrueType. */
const UPEM = 2048;

/**
 * Métricas de uma fonte INSTALADA que o navegador só expõe pelo nome (sem os
 * bytes: Firefox, Safari, Chromium sem permissão). Mede no canvas com o em =
 * 2048 px, então "unidades da fonte" = px. Os advances saem da própria fonte
 * (mesmo arquivo que vai desenhar); o kerning é a diferença do par medido
 * junto vs separado. A altura de linha usa a caixa da fonte que o navegador
 * relata (ascent/descent; sem lineGap) — aproximação do hhea que o SfntFont lê.
 * glyphId devolve o próprio code point (não há tabela de glifos): o PDF não
 * pode embutir esta fonte e usa uma substituta.
 */
export class CanvasMetricsFont implements LayoutFont {
  readonly metrics: FontMetrics;
  private advances = new Map<number, number>();
  private kerns = new Map<number, number>();

  constructor(private readonly ctx: MeasureContext, private readonly cssFont: string) {
    ctx.font = `${cssFont.replace('{size}', String(UPEM))}`;
    const m = ctx.measureText('Hxgjpq');
    const asc = Math.round(m.fontBoundingBoxAscent ?? UPEM * 0.9);
    const desc = Math.round(m.fontBoundingBoxDescent ?? UPEM * 0.25);
    this.metrics = {
      unitsPerEm: UPEM,
      ascender: asc,
      descender: -desc,
      lineGap: 0,
      usWinAscent: asc,
      usWinDescent: desc,
      sTypoAscender: asc,
      sTypoDescender: -desc,
      sTypoLineGap: 0,
    };
  }

  private width(text: string): number {
    this.ctx.font = this.cssFont.replace('{size}', String(UPEM));
    return this.ctx.measureText(text).width;
  }

  advanceWidth(codePoint: number): number {
    let w = this.advances.get(codePoint);
    if (w === undefined) this.advances.set(codePoint, (w = this.width(String.fromCodePoint(codePoint))));
    return w;
  }

  glyphId(codePoint: number): number {
    return codePoint;
  }

  advanceTwips(codePoint: number, sizePt: number): number {
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (this.advanceWidth(codePoint) * deviceEmPt * 20) / UPEM;
  }

  kernTwips(prevCodePoint: number, codePoint: number, sizePt: number): number {
    const key = prevCodePoint * 0x110000 + codePoint;
    let units = this.kerns.get(key);
    if (units === undefined) {
      const pair = this.width(String.fromCodePoint(prevCodePoint, codePoint));
      units = Math.round(pair - this.advanceWidth(prevCodePoint) - this.advanceWidth(codePoint));
      this.kerns.set(key, units);
    }
    if (!units) return 0;
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (units * deviceEmPt * 20) / UPEM;
  }
}
