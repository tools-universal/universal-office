// Fontes de célula medidas e desenhadas como o Excel (GDI): tamanho em ppem
// inteiro (11 pt → 15 px, não 14,67), largura de cada glifo em px inteiros
// (tabela GDI medida — glyph-widths-data — ou o canvas arredondado) e cada
// glifo desenhado na posição inteira acumulada, sem kerning. Escritas com
// shaping (árabe, hebraico, índicas, tailandês…) são medidas e desenhadas como
// string inteira pelo canvas.
import { gdiGlyphFixes, ppemOf } from '@universal/sheet-core';
import type { FontMetrics } from './cell-text.js';

/** Escritas que dependem de shaping/bidi: não dá para medir/desenhar glifo a glifo. */
const COMPLEX = /[\u0590-\u08ff\u0900-\u0dff\u0e00-\u0eff\u0f00-\u109f\u1780-\u18af\ufb1d-\ufdff\ufe70-\ufeff]/;

/**
 * Linha de base do Excel por família (ppem 8..24): 2 caracteres base62 por ppem —
 * A (alinhado ao topo: linha de base = topo + A + 1) e D (alinhado à base: linha
 * de base = base da célula − D). Medido no Excel 365 ("H" em linhas de 50 px,
 * lab e12); os saltos em ppem altos (Calibri 24, Tahoma 18, Cambria 17…) são do
 * próprio Excel (troca de suavização).
 */
const VMETRICS: Record<string, string> = {
  'calibri': '8494a4b4c5c5d5e5f5g6h6i6j7j8k8l8o6',
  'arial': '8494a4b5b5c5d5e5f5g5h5i6i6j7k7n5o6',
  'times new roman': '84a3a5a5b5c5d5e5f5g5h6h7i7j7m5n6o6',
  'verdana': '849595a5b5c5d5e5f5g6g6h6j7l4m4n5o5',
  'segoe ui': '858595a5b5d5e6f6g7g8i9i8n8o9o8p8q9',
  'aptos narrow': '758595a5b5c5d5e6e6f7g7j5k5l6m6n7n8',
  'tahoma': '758595a5b5c5d6d6e6f6i4j4k4l4m6m6n6',
  'cambria': '758595a5b5c6c6d6e6h4i4j4k4l6l6m6n6',
  'courier new': '758595a5b6b6c6d6g4h5i6i6j6k7l7l8m9',
};
const VM_B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface CellFont extends FontMetrics {
  /** `ctx.font` no ppem. */
  css: string;
  bold: boolean;
  italic: boolean;
  /** Ascendente/descendente da fonte (px, do canvas). */
  ascent: number;
  descent: number;
  /** Linha de base como o Excel: topo + xlAscent (alinhado ao topo); base − xlDescent (à base). */
  xlAscent: number;
  xlDescent: number;
  /** Largura de uma string (soma das inteiras; escrita complexa = canvas). */
  width(s: string, limit?: number): number;
}

/** Cache de fontes de célula (por família/tamanho/estilo/zoom). */
export class CellFonts {
  private ctx: CanvasRenderingContext2D;
  private cache = new Map<string, CellFont>();
  private current = '';

  constructor() {
    const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    this.ctx = cv!.getContext('2d')!;
  }

  /** Esquece as medidas (fontes carregaram/mudaram). */
  clear(): void {
    this.cache.clear();
    this.current = '';
  }

  /**
   * Fonte da célula. `stack`: pilha CSS da família (FontResolver.cssStack);
   * `metricFamily`: família cujas larguras GDI valem (a pedida, ou "arial"
   * quando o navegador caiu na substituta padrão — o Excel também mede família
   * ausente como Arial).
   */
  get(stack: string, metricFamily: string, sizePt: number, bold: boolean, italic: boolean, zoom = 1): CellFont {
    const key = `${stack}|${sizePt}|${bold ? 1 : 0}|${italic ? 1 : 0}|${zoom}|${metricFamily}`;
    let f = this.cache.get(key);
    if (f) return f;
    const ppem = ppemOf(sizePt * zoom);
    const css = `${italic ? 'italic ' : ''}${bold ? '700 ' : '400 '}${ppem}px ${stack}`;
    const fixes = gdiGlyphFixes(metricFamily, bold, ppem);
    const advs = new Map<string, number>();
    const ctx = this.ctx;
    const use = (): void => { if (this.current !== css) { ctx.font = css; this.current = css; } };
    use();
    const m = ctx.measureText('Hg');
    const ascent = Math.round(m.fontBoundingBoxAscent ?? ppem * 0.9);
    const descent = Math.round(m.fontBoundingBoxDescent ?? ppem * 0.22);
    const adv = (ch: string): number => {
      let w = advs.get(ch);
      if (w === undefined) {
        w = fixes?.get(ch);
        if (w === undefined) {
          use();
          w = Math.round(ctx.measureText(ch).width);
        }
        advs.set(ch, w);
      }
      return w;
    };
    const width = (s: string, limit = Infinity): number => {
      if (COMPLEX.test(s)) { use(); return Math.round(ctx.measureText(s).width); }
      let w = 0;
      for (const ch of s) { w += adv(ch); if (w > limit) return w; }
      return w;
    };
    // linha de base do Excel: tabela medida; fora dela, as métricas do canvas
    const vm = VMETRICS[metricFamily.trim().toLowerCase()];
    const vi = (ppem - 8) * 2;
    const inTable = !!vm && ppem >= 8 && vi + 1 < vm.length;
    const xlAscent = inTable ? VM_B62.indexOf(vm[vi]!) + 1 : ascent + 1;
    const xlDescent = inTable ? VM_B62.indexOf(vm[vi + 1]!) : descent + 2;
    f = { css, bold, italic, ppem, ascent, descent, xlAscent, xlDescent, adv, width };
    this.cache.set(key, f);
    return f;
  }
}

/**
 * Desenha `s` com a fonte `f` a partir de x (borda esquerda) na linha de base
 * y, glifo a glifo nas posições inteiras do Excel. `minX`/`maxX`: só desenha os
 * glifos que caem nesse intervalo (texto longo transbordando).
 */
export function drawCellText(ctx: CanvasRenderingContext2D, f: CellFont, s: string, x: number, y: number, minX = -Infinity, maxX = Infinity): number {
  ctx.font = f.css;
  ctx.textAlign = 'left';
  if (ctx.getTransform().a < 0) {
    // aba da direita para a esquerda: a grade é pintada espelhada; o texto não —
    // desenha o pedaço inteiro "desespelhado" na caixa espelhada (ordem de leitura mantida)
    const W = f.width(s);
    ctx.save();
    ctx.translate(x + W, 0);
    ctx.scale(-1, 1);
    if (COMPLEX.test(s)) ctx.fillText(s, 0, y);
    else { let cx = 0; for (const ch of s) { if (ch !== ' ') ctx.fillText(ch, cx, y); cx += f.adv(ch); } }
    ctx.restore();
    return x + W;
  }
  if (COMPLEX.test(s)) {
    ctx.fillText(s, x, y);
    return x + f.width(s);
  }
  let cx = x;
  for (const ch of s) {
    const w = f.adv(ch);
    if (cx > maxX) break;
    if (cx + w >= minX && ch !== ' ') ctx.fillText(ch, cx, y);
    cx += w;
  }
  return cx;
}
