/**
 * Referências em fórmulas BIFF8 (rgce) — só o necessário para nomes
 * (_FilterDatabase) e séries de gráficos: ptgRef3d/ptgArea3d (com ixti do
 * EXTERNSHEET) e ptgRef/ptgArea locais; uniões e parênteses atravessados.
 */
import type { Bytes } from './biff.js';

/** Área 0-based inclusiva; `ixti` = índice no EXTERNSHEET (−1 = local). */
export interface Area { ixti: number; r1: number; c1: number; r2: number; c2: number }

/** Áreas de uma fórmula em [off, off + cce). Para no 1º token não suportado. */
export function formulaAreas(r: Bytes, off: number, cce: number): Area[] {
  const out: Area[] = [];
  const end = Math.min(r.length, off + cce);
  let p = off;
  while (p < end) {
    const ptg = r.u8(p);
    const base = (ptg & 0x1f) | 0x20;
    if (ptg === 0x10 || ptg === 0x15) { p += 1; continue; } // união, parênteses
    if (ptg === 0x29 || ptg === 0x49 || ptg === 0x69) { p += 3; continue; } // ptgMemFunc: cce u16
    if (ptg < 0x20) break;
    if (base === 0x3a) { // ptgRef3d: ixti, rw, col
      out.push({ ixti: r.u16(p + 1), r1: r.u16(p + 3), c1: r.u16(p + 5) & 0x3fff, r2: r.u16(p + 3), c2: r.u16(p + 5) & 0x3fff });
      p += 7; continue;
    }
    if (base === 0x3b) { // ptgArea3d: ixti, rwFirst, rwLast, colFirst, colLast
      out.push({ ixti: r.u16(p + 1), r1: r.u16(p + 3), r2: r.u16(p + 5), c1: r.u16(p + 7) & 0x3fff, c2: r.u16(p + 9) & 0x3fff });
      p += 11; continue;
    }
    if (base === 0x24) { // ptgRef local
      out.push({ ixti: -1, r1: r.u16(p + 1), c1: r.u16(p + 3) & 0x3fff, r2: r.u16(p + 1), c2: r.u16(p + 3) & 0x3fff });
      p += 5; continue;
    }
    if (base === 0x25) { // ptgArea local
      out.push({ ixti: -1, r1: r.u16(p + 1), r2: r.u16(p + 3), c1: r.u16(p + 5) & 0x3fff, c2: r.u16(p + 7) & 0x3fff });
      p += 9; continue;
    }
    break; // erros, nomes, operadores: para
  }
  return out;
}
