/**
 * Single Property Modifiers ([MS-DOC] 2.2.5.1): cada Prl = sprm (u16) +
 * operando. O sprm codifica
 *   ispmd (9 bits) · fSpec (1) · sgc (3: 1 parágrafo, 2 caractere, 3 imagem,
 *   4 seção, 5 tabela) · spra (3: tamanho do operando)
 * spra: 0/1 → 1 byte, 2/4/5 → 2, 3 → 4, 7 → 3, 6 → variável (1º byte = tamanho;
 * exceções: sprmTDefTable com tamanho u16 "+1" e sprmPChgTabs com cb = 255).
 */
import { ByteReader } from './bytes.js';

export interface Prl {
  sprm: number;
  /** Início do operando (para variáveis: DEPOIS do(s) byte(s) de tamanho). */
  op: number;
  /** Tamanho do operando (sem os bytes de tamanho). */
  len: number;
  r: ByteReader;
}

export const sgcOf = (sprm: number): number => (sprm >> 10) & 7;

/** Percorre os Prl de um grpprl. Para no primeiro que transborda. */
export function* prls(grpprl: Uint8Array): Generator<Prl> {
  const r = new ByteReader(grpprl);
  let off = 0;
  const end = grpprl.length;
  while (off + 2 <= end) {
    const sprm = r.u16(off);
    off += 2;
    const spra = sprm >>> 13;
    let op = off;
    let len: number;
    switch (spra) {
      case 0: case 1: len = 1; break;
      case 2: case 4: case 5: len = 2; break;
      case 3: len = 4; break;
      case 7: len = 3; break;
      default: {
        if (sprm === 0xd608 || sprm === 0xd606) {
          // TDefTableOperand: cb (u16) = bytes restantes + 1
          const cb = r.u16(off);
          op = off + 2;
          len = Math.max(0, cb - 1);
        } else if (sprm === 0xc615) {
          const cb = r.u8(off);
          op = off + 1;
          if (cb === 255) {
            // PChgTabsOperand longo: tamanho calculado pelas contagens
            const cDel = r.u8(op);
            const cAdd = r.u8(op + 1 + cDel * 4);
            len = 1 + cDel * 4 + 1 + cAdd * 3;
          } else len = cb;
        } else {
          len = r.u8(off);
          op = off + 1;
        }
      }
    }
    if (op + len > end) break;
    yield { sprm, op, len, r };
    off = op + len;
  }
}

/** Operando como u8/u16/i16/u32/i32. */
export const opU8 = (p: Prl): number => p.r.u8(p.op);
export const opU16 = (p: Prl): number => p.r.u16(p.op);
export const opI16 = (p: Prl): number => p.r.i16(p.op);
export const opU32 = (p: Prl): number => p.r.u32(p.op);
export const opI32 = (p: Prl): number => p.r.i32(p.op);
