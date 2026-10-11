/**
 * File Information Block ([MS-DOC] 2.5): o índice do .doc. Fica no início do
 * stream WordDocument e aponta (fc/lcb) para as estruturas do stream de
 * tabela (0Table/1Table).
 *
 *   FibBase (32 bytes) · csw + FibRgW97 · cslw + FibRgLw97 ·
 *   cbRgFcLcb + FibRgFcLcb (pares fc/lcb) · cswNew + FibRgCswNew
 *
 * Os tamanhos são lidos dos contadores (csw/cslw/cbRgFcLcb), não presumidos.
 */
import { ByteReader } from './bytes.js';

export class DocFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocFormatError';
  }
}

/** Índices dos pares fc/lcb em FibRgFcLcb97 (e extensões 2000+). */
export const FC = {
  StshfOrig: 0, Stshf: 1, PlcffndRef: 2, PlcffndTxt: 3, PlcfandRef: 4, PlcfandTxt: 5,
  PlcfSed: 6, PlcPad: 7, PlcfPhe: 8, SttbfGlsy: 9, PlcfGlsy: 10, PlcfHdd: 11,
  PlcfBteChpx: 12, PlcfBtePapx: 13, PlcfSea: 14, SttbfFfn: 15, PlcfFldMom: 16, PlcfFldHdr: 17,
  PlcfFldFtn: 18, PlcfFldAtn: 19, PlcfFldMcr: 20, SttbfBkmk: 21, PlcfBkf: 22, PlcfBkl: 23,
  Cmds: 24, Unused1: 25, SttbfMcr: 26, PrDrvr: 27, PrEnvPort: 28, PrEnvLand: 29, Wss: 30,
  Dop: 31, SttbfAssoc: 32, Clx: 33, PlcfPgdFtn: 34, AutosaveSource: 35, GrpXstAtnOwners: 36,
  SttbfAtnBkmk: 37, Unused2: 38, Unused3: 39, PlcSpaMom: 40, PlcSpaHdr: 41, PlcfAtnBkf: 42,
  PlcfAtnBkl: 43, Pms: 44, FormFldSttbs: 45, PlcfendRef: 46, PlcfendTxt: 47, PlcfFldEdn: 48,
  Unused4: 49, DggInfo: 50, SttbfRMark: 51, SttbfCaption: 52, SttbfAutoCaption: 53, PlcfWkb: 54,
  PlcfSpl: 55, PlcftxbxTxt: 56, PlcfFldTxbx: 57, PlcfHdrtxbxTxt: 58, PlcffldHdrTxbx: 59,
  StwUser: 60, SttbTtmbd: 61, CookieData: 62, PgdMotherOldOld: 63, BkdMotherOldOld: 64,
  PgdFtnOldOld: 65, BkdFtnOldOld: 66, PgdEdnOldOld: 67, BkdEdnOldOld: 68, SttbfIntlFld: 69,
  RouteSlip: 70, SttbSavedBy: 71, SttbFnm: 72, PlfLst: 73, PlfLfo: 74, PlcfTxbxBkd: 75,
  PlcfTxbxHdrBkd: 76, DocUndoWord9: 77, RgbUse: 78, Usp: 79, Uskf: 80, PlcupcRgbUse: 81,
  PlcupcUsp: 82, SttbGlsyStyle: 83, Plgosl: 84, Plcocx: 85, PlcfBteLvc: 86, FtModified: 87,
  PlcfLvcPre10: 88, PlcfAsumy: 89, PlcfGram: 90, SttbListNames: 91, SttbfUssr: 92,
} as const;

export interface Fib {
  wIdent: number;
  nFib: number;
  lid: number;
  fDot: boolean;
  fComplex: boolean;
  fEncrypted: boolean;
  fWhichTblStm: boolean;
  fObfuscated: boolean;
  fExtChar: boolean;
  fFarEast: boolean;
  lidFE: number;
  ccpText: number;
  ccpFtn: number;
  ccpHdd: number;
  ccpMcr: number;
  ccpAtn: number;
  ccpEdn: number;
  ccpTxbx: number;
  ccpHdrTxbx: number;
  /** Pares fc/lcb (índice → {fc, lcb}); ausentes = 0. */
  fcLcb(index: number): { fc: number; lcb: number };
}

export function readFib(word: Uint8Array): Fib {
  if (word.length < 0x9a) throw new DocFormatError('Arquivo .doc corrompido: FIB truncado.');
  const r = new ByteReader(word);
  const wIdent = r.u16(0);
  if (wIdent !== 0xa5ec && wIdent !== 0xa5dc) throw new DocFormatError(`Arquivo .doc corrompido: assinatura do FIB inválida (0x${wIdent.toString(16)}).`);
  let nFib = r.u16(2);
  const lid = r.u16(6);
  const flags = r.u16(0x0a);
  // contadores variáveis
  let off = 32;
  const csw = r.u16(off); off += 2;
  const rgW = off; off += csw * 2;
  const cslw = r.u16(off); off += 2;
  const rgLw = off; off += cslw * 4;
  const cbRgFcLcb = r.u16(off); off += 2;
  const rgFcLcb = off; off += cbRgFcLcb * 8;
  const cswNew = off + 2 <= word.length ? r.u16(off) : 0; off += 2;
  if (cswNew > 0 && off + 2 <= word.length) {
    const nFibNew = r.u16(off);
    if (nFibNew) nFib = nFibNew;
  }
  const lw = (i: number): number => (i < cslw ? r.i32(rgLw + i * 4) : 0);
  return {
    wIdent,
    nFib,
    lid,
    fDot: (flags & 0x0001) !== 0,
    fComplex: (flags & 0x0004) !== 0,
    fEncrypted: (flags & 0x0100) !== 0,
    fWhichTblStm: (flags & 0x0200) !== 0,
    fExtChar: (flags & 0x1000) !== 0,
    fFarEast: (flags & 0x4000) !== 0,
    fObfuscated: (flags & 0x8000) !== 0,
    lidFE: csw > 13 ? r.u16(rgW + 26) : 0,
    ccpText: lw(3),
    ccpFtn: lw(4),
    ccpHdd: lw(5),
    ccpMcr: lw(6),
    ccpAtn: lw(7),
    ccpEdn: lw(8),
    ccpTxbx: lw(9),
    ccpHdrTxbx: lw(10),
    fcLcb(index: number) {
      if (index >= cbRgFcLcb) return { fc: 0, lcb: 0 };
      return { fc: r.u32(rgFcLcb + index * 8), lcb: r.u32(rgFcLcb + index * 8 + 4) };
    },
  };
}
