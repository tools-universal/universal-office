// Larguras de glifo como o Excel as mede (GDI: px inteiros por glifo no ppem,
// com hinting). O Excel decide "####", as casas do Geral, o preenchimento `*x`,
// a quebra de linha e o transbordo com essas larguras, e desenha cada glifo na
// posição inteira acumulada — o canvas mede sem hinting (Calibri 11 = 15 ppem:
// dígito 7,60 px no canvas × 7 px no GDI; Arial 7 negrito sai ~10% mais largo
// no Excel). Tabela medida: glyph-widths-data.ts (gen-glyph-widths.mjs); fora
// dela, a largura do canvas arredondada.
import { GLYPH_FIX, GLYPH_PPEM_MAX, GLYPH_PPEM_MIN } from './glyph-widths-data.js';

const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const decoded = new Map<string, Map<string, number> | null>();

/**
 * Correções do GDI para a família (nome em minúsculas, como no Excel), negrito
 * e ppem; undefined quando a família/ppem não foi medida.
 */
export function gdiGlyphFixes(family: string, bold: boolean, ppem: number): Map<string, number> | undefined {
  if (ppem < GLYPH_PPEM_MIN || ppem > GLYPH_PPEM_MAX) return undefined;
  const key = `${family.trim().toLowerCase()}|${bold ? 1 : 0}|${ppem}`;
  let m = decoded.get(key);
  if (m === undefined) {
    const rows = GLYPH_FIX[`${family.trim().toLowerCase()}|${bold ? 1 : 0}`];
    const s = rows?.[ppem - GLYPH_PPEM_MIN];
    if (s === undefined) m = null;
    else {
      m = new Map();
      for (let i = 0; i + 1 < s.length; i += 2) m.set(s[i]!, B62.indexOf(s[i + 1]!));
    }
    decoded.set(key, m);
  }
  return m ?? undefined;
}

/** A família tem tabela medida (as demais usam o canvas arredondado). */
export function hasGlyphTable(family: string, bold = false): boolean {
  return GLYPH_FIX[`${family.trim().toLowerCase()}|${bold ? 1 : 0}`] !== undefined;
}
