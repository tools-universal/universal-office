/**
 * Tabela de fontes ([MS-DOC] SttbfFfn): STTB de FFN. Índice = ftc usado pelos
 * sprms de fonte (sprmCRgFtc0/1/2, sprmCFtcBi, sprmCSymbol).
 */
import { ByteReader } from './bytes.js';
import { FC, type Fib } from './fib.js';

export interface DocFont {
  name: string;
  altName?: string;
  /** 0 default, 1 fixed, 2 variable. */
  prq: number;
  trueType: boolean;
  /** 0 auto/dontcare, 1 roman, 2 swiss, 3 modern, 4 script, 5 decorative. */
  ff: number;
  weight: number;
  charset: number;
  panose: Uint8Array;
  /** FONTSIGNATURE: usb0..3, csb0..1. */
  sig: number[];
}

function cstr(r: ByteReader, off: number, end: number): { s: string; next: number } {
  let s = '';
  let o = off;
  while (o + 1 < end) {
    const c = r.u16(o);
    o += 2;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return { s, next: o };
}

export function readFonts(fib: Fib, table: Uint8Array): DocFont[] {
  const { fc, lcb } = fib.fcLcb(FC.SttbfFfn);
  if (!lcb || fc + lcb > table.length) return [];
  const r = new ByteReader(table);
  let off = fc;
  const end = fc + lcb;
  let cData = r.u16(off); off += 2;
  let extended = false;
  if (cData === 0xffff) { extended = true; cData = r.u16(off); off += 2; }
  const cbExtra = r.u16(off); off += 2;
  const fonts: DocFont[] = [];
  for (let i = 0; i < cData && off < end; i++) {
    const cb = extended ? r.u16(off) * 2 : r.u8(off);
    off += extended ? 2 : 1;
    const o = off;
    const ffid = r.u8(o);
    const nameStart = o + 39;
    const lim = Math.min(o + cb, end);
    const { s: name, next } = cstr(r, nameStart, lim);
    const ixAlt = r.u8(o + 4);
    let altName: string | undefined;
    if (ixAlt) {
      const alt = cstr(r, next, lim).s;
      // nome alternativo com lixo de memória (0xFD/0xCD/0xDD do heap de depuração do
      // MSVC, ex.: U+FDFD repetido) ou controle: o Word o descarta
      if (alt && !/[\u0000-\u001f\ufdfd\ucdcd\udddd\ufffd\uffff]/.test(alt)) altName = alt;
    }
    const sig: number[] = [];
    for (let k = 0; k < 6; k++) sig.push(r.u32(o + 15 + k * 4));
    fonts.push({
      name: name || `Font${i}`,
      altName,
      prq: ffid & 3,
      trueType: (ffid & 4) !== 0,
      ff: (ffid >> 4) & 7,
      weight: r.i16(o + 1),
      charset: r.u8(o + 3),
      panose: r.sub(o + 5, o + 15).slice(),
      sig,
    });
    off = o + cb + cbExtra;
  }
  return fonts;
}
