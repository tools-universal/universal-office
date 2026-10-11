/**
 * Leitura binária little-endian com verificação de limites + registros
 * OfficeArt ([MS-ODRAW] 2.1.1). Adaptado de
 * slides/packages/slides-core/src/ppt/records.ts (conversor .ppt).
 *
 * Todo registro OfficeArt começa com um cabeçalho de 8 bytes:
 *   u16  recVer (4 bits baixos) + recInstance (12 bits altos)
 *   u16  recType
 *   u32  recLen   (bytes de dados após o cabeçalho)
 * `recVer = 0xF` marca um CONTÊINER (os dados são outros registros).
 */

/** Leitor little-endian: fora dos limites lê 0 (arquivos truncados não explodem). */
export class ByteReader {
  readonly bytes: Uint8Array;
  private readonly view: DataView;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get length(): number { return this.bytes.length; }
  u8(off: number): number { return off < this.bytes.length && off >= 0 ? this.bytes[off]! : 0; }
  i8(off: number): number { const v = this.u8(off); return v > 127 ? v - 256 : v; }
  u16(off: number): number { return off + 2 <= this.bytes.length && off >= 0 ? this.view.getUint16(off, true) : 0; }
  i16(off: number): number { return off + 2 <= this.bytes.length && off >= 0 ? this.view.getInt16(off, true) : 0; }
  u32(off: number): number { return off + 4 <= this.bytes.length && off >= 0 ? this.view.getUint32(off, true) : 0; }
  i32(off: number): number { return off + 4 <= this.bytes.length && off >= 0 ? this.view.getInt32(off, true) : 0; }
  sub(start: number, end: number): Uint8Array {
    return this.bytes.subarray(Math.max(0, Math.min(start, this.bytes.length)), Math.max(0, Math.min(this.bytes.length, end)));
  }
  /** UTF-16LE de `count` unidades a partir de `off`. */
  utf16(off: number, count: number): string {
    let s = '';
    for (let i = 0; i < count && off + i * 2 + 1 < this.bytes.length; i++) s += String.fromCharCode(this.u16(off + i * 2));
    return s;
  }
}

/** Registro OfficeArt já delimitado: cabeçalho + faixa [start, end) dos dados. */
export interface Rec {
  ver: number;
  inst: number;
  type: number;
  len: number;
  hdr: number;
  start: number;
  end: number;
  r: ByteReader;
}

export function readRec(r: ByteReader, off: number, limit = r.length): Rec | undefined {
  if (off + 8 > limit) return undefined;
  const vi = r.u16(off);
  const len = r.u32(off + 4);
  const start = off + 8;
  return { ver: vi & 0xf, inst: vi >>> 4, type: r.u16(off + 2), len, hdr: off, start, end: Math.min(limit, start + len), r };
}

export function isContainer(rec: Rec): boolean { return rec.ver === 0xf; }

/** Registros consecutivos em [start, end). Para no primeiro cabeçalho inválido. */
export function recsIn(r: ByteReader, start: number, end: number): Rec[] {
  const out: Rec[] = [];
  let off = start;
  while (off + 8 <= end) {
    const rec = readRec(r, off, end);
    if (!rec) break;
    out.push(rec);
    if (rec.start + rec.len > end) break;
    off = rec.start + rec.len;
  }
  return out;
}

export function children(rec: Rec): Rec[] { return recsIn(rec.r, rec.start, rec.end); }

export function child(rec: Rec, type: number): Rec | undefined {
  for (const c of children(rec)) if (c.type === type) return c;
  return undefined;
}

/** Tipos de registro OfficeArt usados aqui ([MS-ODRAW] 2.2). */
export const OA = {
  DggContainer: 0xf000,
  BStoreContainer: 0xf001,
  DgContainer: 0xf002,
  SpgrContainer: 0xf003,
  SpContainer: 0xf004,
  FDGG: 0xf006,
  FBSE: 0xf007,
  FDG: 0xf008,
  FSPGR: 0xf009,
  FSP: 0xf00a,
  FOPT: 0xf00b,
  ChildAnchor: 0xf00f,
  ClientAnchor: 0xf010,
  ClientData: 0xf011,
  ClientTextbox: 0xf00d,
  SecondaryFOPT: 0xf121,
  TertiaryFOPT: 0xf122,
  BlipEMF: 0xf01a,
  BlipWMF: 0xf01b,
  BlipPICT: 0xf01c,
  BlipJPEG: 0xf01d,
  BlipPNG: 0xf01e,
  BlipDIB: 0xf01f,
  BlipTIFF: 0xf029,
  BlipJPEGCMYK: 0xf02a,
} as const;
