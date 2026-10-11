/**
 * Texto do .doc ([MS-DOC] 2.4.1): a tabela de peças (Clx → Pcdt → PlcPcd)
 * mapeia posições de caractere (CP) para offsets no stream WordDocument (FC).
 * Cada peça é "comprimida" (1 byte por caractere, cp1252 com o mapeamento
 * especial de 0x80-0x9F) ou UTF-16LE. O Clx começa com Prc's (grpprls
 * referenciados pelo Prm das peças em salvamentos rápidos).
 */
import { ByteReader } from './bytes.js';
import { DocFormatError, FC, type Fib } from './fib.js';

export interface Piece {
  cpStart: number;
  cpEnd: number;
  /** Offset em bytes no WordDocument do 1º caractere. */
  fc: number;
  compressed: boolean;
  /** Prm (u16): sprm único (fComplex=0) ou índice de Prc (fComplex=1). */
  prm: number;
}

export interface PieceTable {
  pieces: Piece[];
  /** grpprls dos Prc do Clx (índice = igrpprl). */
  prcs: Uint8Array[];
}

/** Mapeamento dos bytes "comprimidos" 0x80-0x9F ([MS-DOC] 2.4.1, tabela do FcCompressed). */
const CP1252_HIGH: Record<number, number> = {
  0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9f: 0x0178,
};

/** Byte de peça comprimida → caractere Unicode. */
export function compressedChar(b: number): number {
  return CP1252_HIGH[b] ?? b;
}

export function readPieceTable(fib: Fib, table: Uint8Array): PieceTable {
  const { fc, lcb } = fib.fcLcb(FC.Clx);
  if (!lcb || fc + lcb > table.length) {
    throw new DocFormatError('Arquivo .doc corrompido: tabela de peças (Clx) ausente.');
  }
  const r = new ByteReader(table);
  const end = fc + lcb;
  let off = fc;
  const prcs: Uint8Array[] = [];
  while (off < end && r.u8(off) === 0x01) {
    const cb = r.i16(off + 1);
    prcs.push(r.sub(off + 3, off + 3 + Math.max(0, cb)));
    off += 3 + Math.max(0, cb);
  }
  if (r.u8(off) !== 0x02) throw new DocFormatError('Arquivo .doc corrompido: Pcdt ausente no Clx.');
  const lcbPlc = r.u32(off + 1);
  const plc = off + 5;
  const n = Math.floor((lcbPlc - 4) / 12);
  if (n <= 0) throw new DocFormatError('Arquivo .doc corrompido: tabela de peças vazia.');
  const pieces: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const cpStart = r.u32(plc + i * 4);
    const cpEnd = r.u32(plc + (i + 1) * 4);
    const pcd = plc + (n + 1) * 4 + i * 8;
    const fcRaw = r.u32(pcd + 2);
    const compressed = (fcRaw & 0x40000000) !== 0;
    const fcVal = fcRaw & 0x3fffffff;
    if (cpEnd <= cpStart) continue;
    pieces.push({
      cpStart, cpEnd,
      fc: compressed ? fcVal / 2 : fcVal,
      compressed,
      prm: r.u16(pcd + 6),
    });
  }
  return { pieces, prcs };
}

/** Texto completo (todas as histórias) como string indexada por CP. */
export function decodeText(pt: PieceTable, word: Uint8Array, totalCp: number): string {
  const r = new ByteReader(word);
  const parts: string[] = [];
  let cp = 0;
  const chunk: number[] = [];
  const flush = (): void => {
    if (chunk.length) { parts.push(String.fromCharCode(...chunk)); chunk.length = 0; }
  };
  for (const p of pt.pieces) {
    if (p.cpStart >= totalCp) break;
    // lacunas na tabela de peças (corrompido): preenche com espaço
    while (cp < p.cpStart) { chunk.push(0x20); cp++; if (chunk.length > 8192) flush(); }
    const end = Math.min(p.cpEnd, totalCp);
    for (let c = p.cpStart; c < end; c++) {
      const i = c - p.cpStart;
      chunk.push(p.compressed ? compressedChar(r.u8(p.fc + i)) : r.u16(p.fc + i * 2));
      if (chunk.length > 8192) flush();
    }
    cp = Math.max(cp, end);
  }
  while (cp < totalCp) { chunk.push(0x0d); cp++; if (chunk.length > 8192) flush(); }
  flush();
  return parts.join('');
}

/** Índice da peça que contém o CP (busca binária); -1 se fora. */
export function pieceAt(pieces: Piece[], cp: number): number {
  let lo = 0, hi = pieces.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const p = pieces[mid]!;
    if (cp < p.cpStart) hi = mid - 1;
    else if (cp >= p.cpEnd) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/** FC (byte no WordDocument) do caractere no CP. */
export function fcOfCp(pieces: Piece[], cp: number): number {
  const i = pieceAt(pieces, cp);
  if (i < 0) return -1;
  const p = pieces[i]!;
  return p.fc + (cp - p.cpStart) * (p.compressed ? 1 : 2);
}
