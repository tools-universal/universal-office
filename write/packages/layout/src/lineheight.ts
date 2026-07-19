import type { SfntFont } from './font/sfnt.js';

/**
 * Modelo vertical do app de referência (derivado empiricamente — ver word-lab/FINDINGS.md):
 *
 * 1. O app de referência arredonda o em ao pixel de dispositivo de 600 DPI:
 *      deviceEmPt = round(sizePt * 600/72) * 72/600
 *    (11pt → 92 unidades → 11.04pt; o XPS expõe isso em FontRenderingEmSize)
 * 2. Altura "single" da linha = (hheaAscent + |hheaDescent| + lineGap) / upem
 *    * deviceEmPt
 * 3. w:spacing lineRule="auto" multiplica por line/240 (Normal usa 259 → 1.0792).
 *
 * Validação: Aptos 11 → 13.4766 * 259/240 = 14.5435pt; XPS mediu 14.544pt.
 */

export function deviceEmPt(sizePt: number): number {
  return (Math.round((sizePt * 600) / 72) * 72) / 600;
}

export interface LineSpacing {
  /** w:spacing w:line (240 = single). Normal do template atual: 259. */
  line: number;
  lineRule: 'auto' | 'exact' | 'atLeast';
}

export function singleLineHeightPt(font: SfntFont, sizePt: number): number {
  const m = font.metrics;
  const units = m.ascender + Math.abs(m.descender) + m.lineGap;
  return (units / m.unitsPerEm) * deviceEmPt(sizePt);
}

export function lineHeightPt(font: SfntFont, sizePt: number, spacing: LineSpacing): number {
  const single = singleLineHeightPt(font, sizePt);
  switch (spacing.lineRule) {
    case 'auto':
      return (single * spacing.line) / 240;
    case 'exact':
      return spacing.line / 20; // twips
    case 'atLeast':
      return Math.max(single, spacing.line / 20);
  }
}
