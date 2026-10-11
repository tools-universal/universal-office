/**
 * Listas ([MS-DOC] 2.9: PlfLst/LSTF/LVL + PlfLfo/LFO/LFOData/LFOLVL).
 * PlfLst = cLst (i16) + LSTF[cLst]; logo depois dele, no stream de tabela,
 * vêm os LVLs de cada lista (9, ou 1 se fSimpleList). Cada LVL = LVLF (28
 * bytes) + grpprlPapx + grpprlChpx + xst (texto do número com marcadores de
 * nível). PlfLfo = lfoMac (u32) + LFO[lfoMac] + LFOData[lfoMac] (com LFOLVLs
 * de sobreposição). sprmPIlfo referencia LFO 1-based → numId do OOXML.
 */
import { ByteReader } from './bytes.js';
import { FC, type Fib } from './fib.js';

export interface Lvl {
  start: number;
  nfc: number;
  jc: number;
  legal: boolean;
  noRestart: boolean;
  ilvlRestartLim: number;
  /** 0 tab, 1 espaço, 2 nada. */
  follow: number;
  /** Texto do número: códigos 0-8 = marcador do nível N. */
  xst: string;
  /** Posições 1-based dos marcadores em xst. */
  rgbxchNums: number[];
  grpprlPapx: Uint8Array;
  grpprlChpx: Uint8Array;
  tentative: boolean;
}

export interface Lst {
  lsid: number;
  tplc: number;
  simple: boolean;
  hybrid: boolean;
  /** istd do estilo vinculado a cada nível (0xFFF = nenhum). */
  rgistdPara: number[];
  levels: Lvl[];
}

export interface LfoLvl {
  ilvl: number;
  startAt?: number;
  lvl?: Lvl;
}

export interface Lfo {
  lsid: number;
  overrides: LfoLvl[];
}

export interface Lists {
  lsts: Lst[];
  lfos: Lfo[];
}

function readLvl(r: ByteReader, off: number, end: number): { lvl: Lvl; next: number } {
  const flags = r.u8(off + 5);
  const nums: number[] = [];
  for (let i = 0; i < 9; i++) {
    const v = r.u8(off + 6 + i);
    if (!v) break;
    nums.push(v);
  }
  const cbChpx = r.u8(off + 24);
  const cbPapx = r.u8(off + 25);
  let o = off + 28;
  const grpprlPapx = r.sub(o, Math.min(o + cbPapx, end)); o += cbPapx;
  const grpprlChpx = r.sub(o, Math.min(o + cbChpx, end)); o += cbChpx;
  const cch = r.u16(o);
  const xst = r.utf16(o + 2, Math.min(cch, 0x100));
  o += 2 + cch * 2;
  return {
    lvl: {
      start: r.i32(off),
      nfc: r.u8(off + 4),
      jc: flags & 3,
      legal: (flags & 4) !== 0,
      noRestart: (flags & 8) !== 0,
      tentative: (flags & 0x80) !== 0,
      rgbxchNums: nums,
      follow: r.u8(off + 15),
      ilvlRestartLim: r.u8(off + 26),
      grpprlPapx,
      grpprlChpx,
      xst,
    },
    next: o,
  };
}

export function readLists(fib: Fib, table: Uint8Array): Lists {
  const r = new ByteReader(table);
  const lsts: Lst[] = [];
  const lfos: Lfo[] = [];
  const lst = fib.fcLcb(FC.PlfLst);
  if (lst.lcb && lst.fc + lst.lcb <= table.length) {
    const cLst = r.i16(lst.fc);
    let o = lst.fc + 2;
    for (let i = 0; i < cLst; i++) {
      const rgistd: number[] = [];
      for (let k = 0; k < 9; k++) rgistd.push(r.u16(o + 8 + k * 2));
      const flags = r.u8(o + 26);
      lsts.push({
        lsid: r.i32(o), tplc: r.i32(o + 4), rgistdPara: rgistd,
        simple: (flags & 1) !== 0, hybrid: (flags & 0x10) !== 0, levels: [],
      });
      o += 28;
    }
    // LVLs logo após o PlfLst (fora do lcb declarado)
    let lo = lst.fc + lst.lcb;
    for (const l of lsts) {
      const n = l.simple ? 1 : 9;
      for (let k = 0; k < n && lo + 28 <= table.length; k++) {
        const { lvl, next } = readLvl(r, lo, table.length);
        l.levels.push(lvl);
        lo = next;
      }
    }
  }
  const lfo = fib.fcLcb(FC.PlfLfo);
  if (lfo.lcb && lfo.fc + lfo.lcb <= table.length) {
    const end = lfo.fc + lfo.lcb;
    const mac = r.u32(lfo.fc);
    let o = lfo.fc + 4;
    const counts: number[] = [];
    for (let i = 0; i < mac && o + 16 <= end; i++) {
      lfos.push({ lsid: r.i32(o), overrides: [] });
      counts.push(r.u8(o + 12));
      o += 16;
    }
    // LFOData: cp (u32) + LFOLVL[clfolvl]
    for (let i = 0; i < lfos.length && o + 4 <= end; i++) {
      o += 4;
      for (let k = 0; k < counts[i]!; k++) {
        const iStartAt = r.i32(o);
        const bits = r.u32(o + 4);
        o += 8;
        const ov: LfoLvl = { ilvl: bits & 0xf };
        const fStartAt = (bits & 0x10) !== 0;
        const fFormatting = (bits & 0x20) !== 0;
        if (fStartAt && !fFormatting) ov.startAt = iStartAt;
        if (fFormatting) {
          const { lvl, next } = readLvl(r, o, end);
          ov.lvl = lvl;
          if (fStartAt) ov.startAt = lvl.start;
          o = next;
        }
        lfos[i]!.overrides.push(ov);
      }
    }
  }
  return { lsts, lfos };
}
