// Fontes de célula medidas e desenhadas como o Excel (GDI): tamanho em ppem
// inteiro (11 pt → 15 px, não 14,67), largura de cada glifo em px inteiros
// (tabela GDI medida — glyph-widths-data — ou o canvas arredondado) e cada
// glifo desenhado na posição inteira acumulada, sem kerning. Escritas com
// shaping (árabe, hebraico, índicas, tailandês…) são medidas e desenhadas como
// string inteira pelo canvas.
import { excelRowPx, gdiGlyphFixes, measuredFamily, ppemOf } from '@universal/sheet-core';
import type { FontMetrics } from './cell-text.js';
import { DESC_PPEM_MAX, DESC_PPEM_MIN, ROW_DESC, ROW_DESC_BOLD } from './row-descent-data.js';

/** Escritas que dependem de shaping/bidi: não dá para medir/desenhar glifo a glifo. */
const COMPLEX = /[\u0590-\u08ff\u0900-\u0dff\u0e00-\u0eff\u0f00-\u109f\u1780-\u18af\ufb1d-\ufdff\ufe70-\ufeff]/;

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
    // linha de base do Excel (oráculo 1:1, lab e12 — 142/153 no topo, 147/153
    // na base, 142/153 no centro): acima da base = R − d (altura de linha da
    // fonte − descent do GDI), abaixo = d; família sem descent → canvas
    const d = rowDescentPx(metricFamily, sizePt * zoom, bold);
    const R = excelRowPx(metricFamily, sizePt * zoom, bold);
    const xlAscent = d !== undefined ? R - d : ascent + 1;
    const xlDescent = d !== undefined ? d : descent + 2;
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

/**
 * Descent (px) que a altura automática da linha usa para a fonte: uma célula
 * com n linhas de texto (quebra) mede n·R(fonte) + máx(0, descent da linha −
 * descent da fonte) — a última linha senta na base compartilhada da linha, que
 * desce até o maior descent (fonte Normal das células vazias, demais células).
 * Ex.: Normal Calibri 11 (4) + célula Arial 10 (3) com 2 linhas = 2·17 + 1.
 * Fonte: tmDescent do GDI (row-descent-data); Aptos* e Segoe UI o Excel não
 * mede pelo GDI — valores medidos (lab e27/e28). Família desconhecida = Arial;
 * undefined = família medida sem descent conhecido (o chamador usa só R).
 * (Com fonte Normal muito grande — Calibri 36 — o modelo erra por 1 px; lab e29.)
 */
export function rowDescentPx(name: string | undefined, sizePt: number, bold: boolean): number | undefined {
  const p = ppemOf(sizePt);
  const fam = (name ?? '').normalize('NFKC').trim().toLowerCase();
  const xl = EXCEL_DESC[fam.startsWith('aptos') ? 'aptos' : fam.startsWith('segoe ui') ? 'segoe ui' : ''];
  if (xl) {
    // medido em ppem esparsos: o mais próximo abaixo (acima de 27: proporcional)
    if (p > 27) return Math.round((xl[27]! * p) / 27);
    for (let q = Math.max(8, p); q >= 8; q--) if (xl[q] !== undefined) return xl[q]!;
    return 2;
  }
  const measured = measuredFamily(name);
  const key = ROW_DESC[fam] !== undefined ? fam : (measured ?? 'arial');
  // família com altura medida no Excel mas sem descent do GDI (CJK sem a fonte
  // nesta máquina: o Excel usa outra por vinculação) → desconhecido
  if (ROW_DESC[key] === undefined) return undefined;
  const s = (bold && ROW_DESC_BOLD[key]) || ROW_DESC[key]!;
  if (p < DESC_PPEM_MIN) return 1;
  if (p > DESC_PPEM_MAX) return Math.round((VM_B62.indexOf(s[s.length - 1]!) * p) / DESC_PPEM_MAX);
  return VM_B62.indexOf(s[p - DESC_PPEM_MIN]!);
}

/** Descent efetivo medido no Excel por ppem (Normal Calibri 26, 6 linhas; lab e28). */
const EXCEL_DESC: Record<string, Record<number, number>> = {
  'aptos': { 8: 2, 9: 2, 11: 3, 12: 3, 13: 4, 15: 4, 16: 4, 17: 5, 19: 5, 20: 5, 21: 6, 24: 7, 27: 7 },
  'segoe ui': { 8: 2, 9: 2, 11: 2, 12: 3, 13: 4, 15: 5, 16: 5, 17: 6, 19: 6, 20: 8, 21: 9, 24: 8, 27: 9 },
};
