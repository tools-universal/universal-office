// Escritor de BIFF8/BIFF5 mínimo para testes do leitor de .xls: registros
// montados à mão (tipo + bytes), subfluxos com BOUNDSHEET corrigido e o
// stream "Workbook"/"Book" embrulhado num Compound File.
import { buildCfb } from './cfb-writer.js';

export type Bytes = number[];
export interface Rec { type: number; data: Bytes }

export const u8 = (v: number): Bytes => [v & 0xff];
export const u16 = (v: number): Bytes => [v & 0xff, (v >>> 8) & 0xff];
export const u32 = (v: number): Bytes => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
export const i16 = (v: number): Bytes => u16(v < 0 ? v + 0x10000 : v);
export function f64(v: number): Bytes {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v, true);
  return [...b];
}
/** Caracteres de uma string: Latin-1 (comprimido) ou UTF-16LE. */
export function chars(s: string, high: boolean): Bytes {
  const out: Bytes = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (high) out.push(c & 0xff, c >>> 8);
    else out.push(c & 0xff);
  }
  return out;
}
const needsHigh = (s: string): boolean => [...s].some((c) => c.charCodeAt(0) > 0xff);
/** XLUnicodeString (cch u16 + opções + chars). */
export const str16 = (s: string, high = needsHigh(s)): Bytes => [...u16(s.length), high ? 1 : 0, ...chars(s, high)];
/** ShortXLUnicodeString (cch u8 + opções + chars). */
export const str8 = (s: string, high = needsHigh(s)): Bytes => [...u8(s.length), high ? 1 : 0, ...chars(s, high)];
/** String de 8 bits do BIFF5 (cch u8 + bytes). */
export const bstr8 = (s: string): Bytes => [...u8(s.length), ...chars(s, false)];

export const rec = (type: number, data: Bytes = []): Rec => ({ type, data });

export const RT = {
  BOF: 0x0809, EOF: 0x000a, CONTINUE: 0x003c, BOUNDSHEET: 0x0085, FONT: 0x0031, FORMAT: 0x041e, XF: 0x00e0,
  SST: 0x00fc, LABELSST: 0x00fd, NUMBER: 0x0203, RK: 0x027e, MULRK: 0x00bd, LABEL: 0x0204, BOOLERR: 0x0205,
  FORMULA: 0x0006, STRING: 0x0207, BLANK: 0x0201, MULBLANK: 0x00be, ROW: 0x0208, COLINFO: 0x007d,
  DEFCOLWIDTH: 0x0055, DEFAULTROWHEIGHT: 0x0225, MERGECELLS: 0x00e5, WINDOW1: 0x003d, WINDOW2: 0x023e,
  PANE: 0x0041, SCL: 0x00a0, DATEMODE: 0x0022, PALETTE: 0x0092, FILEPASS: 0x002f, CODEPAGE: 0x0042,
  HLINK: 0x01b8, NOTE: 0x001c, OBJ: 0x005d, TXO: 0x01b6, MSODRAWING: 0x00ec, MSODRAWINGGROUP: 0x00eb,
} as const;

/** FONT do BIFF8 (altura em twips). */
export function font(name: string, opts: { height?: number; bold?: boolean; italic?: boolean; color?: number; underline?: number } = {}): Rec {
  const grbit = opts.italic ? 2 : 0;
  return rec(RT.FONT, [...u16(opts.height ?? 200), ...u16(grbit), ...u16(opts.color ?? 0x7fff), ...u16(opts.bold ? 700 : 400),
    ...u16(0), ...u8(opts.underline ?? 0), ...u8(0), ...u8(0), ...u8(0), ...str8(name)]);
}

export interface XfOpts {
  font?: number; fmt?: number; style?: boolean; halign?: number; valign?: number; wrap?: boolean; rot?: number; indent?: number;
  bLeft?: number; bRight?: number; bTop?: number; bBottom?: number; cLeft?: number; cRight?: number; cTop?: number; cBottom?: number;
  pattern?: number; fore?: number; back?: number;
}
/** XF do BIFF8 (20 bytes). */
export function xf(o: XfOpts = {}): Rec {
  const flags = (o.style ? 4 : 0) | ((o.style ? 0xfff : 0) << 4);
  const al = (o.halign ?? 0) | (o.wrap ? 8 : 0) | ((o.valign ?? 2) << 4);
  const b1 = (o.bLeft ?? 0) | ((o.bRight ?? 0) << 4) | ((o.bTop ?? 0) << 8) | ((o.bBottom ?? 0) << 12)
    | ((o.cLeft ?? 0) << 16) | ((o.cRight ?? 0) << 23);
  const b2 = (o.cTop ?? 0) | ((o.cBottom ?? 0) << 7) | ((o.pattern ?? 0) << 26);
  const col = (o.fore ?? 64) | ((o.back ?? 65) << 7);
  return rec(RT.XF, [...u16(o.font ?? 0), ...u16(o.fmt ?? 0), ...u16(flags), ...u8(al), ...u8(o.rot ?? 0), ...u8(o.indent ?? 0), ...u8(0),
    ...u32(b1 >>> 0), ...u32(b2 >>> 0), ...u16(col)]);
}

/** Globais padrão: 5 fontes Arial 10 + 15 XFs de estilo + XF 15 de célula. */
export function defaultFormatting(): Rec[] {
  const out: Rec[] = [];
  for (let i = 0; i < 5; i++) out.push(font('Arial'));
  for (let i = 0; i < 15; i++) out.push(xf({ style: true }));
  out.push(xf());
  return out;
}

export interface SheetSpec { name: string; state?: number; type?: number; recs: Rec[] }

function encode(recs: Rec[]): Bytes {
  const out: Bytes = [];
  for (const r of recs) out.push(...u16(r.type), ...u16(r.data.length), ...r.data);
  return out;
}

/**
 * Monta o stream da pasta (globais + planilhas) e o Compound File. `biff`
 * 8 → stream "Workbook" (BOF 0x0600); 5 → "Book" (BOF 0x0500).
 */
export function buildXls(globals: Rec[], sheets: SheetSpec[], biff: 5 | 8 = 8): Uint8Array {
  return buildCfb({ [biff === 8 ? 'Workbook' : 'Book']: new Uint8Array(buildStream(globals, sheets, biff)) });
}

export function buildStream(globals: Rec[], sheets: SheetSpec[], biff: 5 | 8 = 8): Bytes {
  const vers = biff === 8 ? 0x0600 : 0x0500;
  const bof = (dt: number): Rec => rec(RT.BOF, biff === 8 ? [...u16(vers), ...u16(dt), ...u16(0x0dbb), ...u16(0x07cc), ...u32(0), ...u32(0x0006)] : [...u16(vers), ...u16(dt), ...u16(0), ...u16(0)]);
  const bsName = (s: SheetSpec): Bytes => (biff === 8 ? str8(s.name) : bstr8(s.name));
  const head = encode([bof(0x0005), ...globals]);
  const bsLen = sheets.map((s) => 4 + 6 + bsName(s).length);
  let pos = head.length + bsLen.reduce((a, b) => a + b, 0) + 4; // + EOF
  const bodies: Bytes[] = [];
  const bs: Rec[] = [];
  for (const s of sheets) {
    const body = encode([bof(s.type === 2 ? 0x0020 : 0x0010), ...s.recs, rec(RT.EOF)]);
    bs.push(rec(RT.BOUNDSHEET, [...u32(pos), ...u8(s.state ?? 0), ...u8(s.type ?? 0), ...bsName(s)]));
    bodies.push(body);
    pos += body.length;
  }
  return [...head, ...encode(bs), ...encode([rec(RT.EOF)]), ...bodies.flat()];
}

/** Registro OfficeArt (cabeçalho de 8 bytes). */
export function oa(type: number, inst: number, ver: number, data: Bytes): Bytes {
  return [...u16((inst << 4) | ver), ...u16(type), ...u32(data.length), ...data];
}
