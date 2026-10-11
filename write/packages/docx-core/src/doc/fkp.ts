/**
 * Formatação direta ([MS-DOC] 2.4.6): PlcBteChpx/PlcBtePapx (stream de tabela)
 * apontam para páginas FKP de 512 bytes no WordDocument. Cada FKP lista faixas
 * de FC (rgfc) e, para cada uma, um CHPX (grpprl de caractere) ou PAPX
 * (istd + grpprl de parágrafo). Aqui tudo vira uma lista plana ordenada de
 * faixas de FC para busca binária.
 */
import { ByteReader } from './bytes.js';
import { FC, type Fib } from './fib.js';
import { prls } from './sprm.js';

export interface FcRun {
  fcStart: number;
  fcEnd: number;
  /** grpprl (sem o istd). */
  grpprl: Uint8Array;
  /** PAPX: estilo de parágrafo. */
  istd: number;
}

const EMPTY: Uint8Array = new Uint8Array(0);

/** PLC genérico: (n+1) u32 + n estruturas de `cbData` bytes. */
export interface Plc {
  cps: number[];
  /** Offset (no buffer) da i-ésima estrutura. */
  dataAt(i: number): number;
  n: number;
  r: ByteReader;
}

export function readPlc(buf: Uint8Array, fc: number, lcb: number, cbData: number): Plc | undefined {
  if (!lcb || fc + lcb > buf.length) return undefined;
  const n = cbData > 0 ? Math.floor((lcb - 4) / (4 + cbData)) : Math.floor(lcb / 4) - 1;
  if (n < 0) return undefined;
  const r = new ByteReader(buf);
  const cps: number[] = [];
  for (let i = 0; i <= n; i++) cps.push(r.u32(fc + i * 4));
  const base = fc + (n + 1) * 4;
  return { cps, n, r, dataAt: (i: number) => base + i * cbData };
}

function sortRuns(runs: FcRun[]): FcRun[] {
  runs.sort((a, b) => a.fcStart - b.fcStart);
  return runs;
}

export function readChpxRuns(fib: Fib, table: Uint8Array, word: Uint8Array): FcRun[] {
  const { fc, lcb } = fib.fcLcb(FC.PlcfBteChpx);
  const plc = readPlc(table, fc, lcb, 4);
  if (!plc) return [];
  const w = new ByteReader(word);
  const runs: FcRun[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < plc.n; i++) {
    const pn = plc.r.u32(plc.dataAt(i)) & 0x3fffff;
    if (seen.has(pn)) continue;
    seen.add(pn);
    const page = pn * 512;
    if (page + 512 > word.length) continue;
    const crun = w.u8(page + 511);
    for (let k = 0; k < crun; k++) {
      const fcStart = w.u32(page + k * 4);
      const fcEnd = w.u32(page + (k + 1) * 4);
      const b = w.u8(page + (crun + 1) * 4 + k);
      let grpprl: Uint8Array = EMPTY;
      if (b) {
        const at = page + b * 2;
        const cb = w.u8(at);
        grpprl = w.sub(at + 1, Math.min(at + 1 + cb, page + 511));
      }
      if (fcEnd > fcStart) runs.push({ fcStart, fcEnd, grpprl, istd: 0 });
    }
  }
  return sortRuns(runs);
}

/** PrcData no Data stream (sprmPHugePapx / sprmPTableProps): cbGrpprl (i16) + grpprl. */
function prcData(data: Uint8Array | undefined, off: number): Uint8Array {
  if (!data || off + 2 > data.length) return EMPTY;
  const r = new ByteReader(data);
  const cb = r.i16(off);
  return r.sub(off + 2, off + 2 + Math.max(0, cb));
}

/** Expande sprmPHugePapx (o grpprl real mora no Data stream). */
export function expandHugePapx(grpprl: Uint8Array, data: Uint8Array | undefined): Uint8Array {
  for (const p of prls(grpprl)) {
    if (p.sprm === 0x6646 && data) {
      const huge = prcData(data, p.r.u32(p.op));
      return huge.length ? huge : grpprl;
    }
    break;
  }
  return grpprl;
}

export function readPapxRuns(fib: Fib, table: Uint8Array, word: Uint8Array, data: Uint8Array | undefined): FcRun[] {
  const { fc, lcb } = fib.fcLcb(FC.PlcfBtePapx);
  const plc = readPlc(table, fc, lcb, 4);
  if (!plc) return [];
  const w = new ByteReader(word);
  const runs: FcRun[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < plc.n; i++) {
    const pn = plc.r.u32(plc.dataAt(i)) & 0x3fffff;
    if (seen.has(pn)) continue;
    seen.add(pn);
    const page = pn * 512;
    if (page + 512 > word.length) continue;
    const cpara = w.u8(page + 511);
    for (let k = 0; k < cpara; k++) {
      const fcStart = w.u32(page + k * 4);
      const fcEnd = w.u32(page + (k + 1) * 4);
      const bOffset = w.u8(page + (cpara + 1) * 4 + k * 13);
      let istd = 0;
      let grpprl: Uint8Array = EMPTY;
      if (bOffset) {
        const at = page + bOffset * 2;
        let cb = w.u8(at);
        let start = at + 1;
        let size: number;
        if (cb === 0) { cb = w.u8(at + 1); start = at + 2; size = cb * 2; } else size = cb * 2 - 1;
        const end = Math.min(start + size, page + 511);
        istd = w.u16(start);
        grpprl = expandHugePapx(w.sub(start + 2, end), data);
      }
      if (fcEnd > fcStart) runs.push({ fcStart, fcEnd, grpprl, istd });
    }
  }
  return sortRuns(runs);
}

/** Faixa que contém o FC (busca binária); undefined se nenhuma. */
export function runAt(runs: FcRun[], fc: number): FcRun | undefined {
  let lo = 0, hi = runs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = runs[mid]!;
    if (fc < r.fcStart) hi = mid - 1;
    else if (fc >= r.fcEnd) lo = mid + 1;
    else return r;
  }
  return undefined;
}

/** Índice da primeira faixa com fcEnd > fc. */
export function runIndexFrom(runs: FcRun[], fc: number): number {
  let lo = 0, hi = runs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (runs[mid]!.fcEnd <= fc) lo = mid + 1; else hi = mid;
  }
  return lo;
}
