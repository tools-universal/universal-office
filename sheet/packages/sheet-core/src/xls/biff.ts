/**
 * Registros BIFF ([MS-XLS] 2.1.4): o stream "Workbook" (BIFF8) / "Book"
 * (BIFF5/7) é uma sequência de registros com cabeçalho de 4 bytes
 *
 *   u16  tipo
 *   u16  tamanho dos dados (≤ 8224 no BIFF8, ≤ 2080 no BIFF5)
 *
 * Registros maiores que o limite continuam em registros CONTINUE (0x003C);
 * o cursor junta os dados e guarda onde cada CONTINUE começou — strings do
 * SST/TXO re-leem o byte de opções (fHighByte) em cada fronteira.
 */

/** Tipos de registro usados pelo conversor ([MS-XLS] 2.3). */
export const RT = {
  FORMULA: 0x0006,
  EOF: 0x000a,
  CALCMODE: 0x000d,
  NOTE: 0x001c,
  EXTERNSHEET: 0x0017,
  NAME: 0x0018,
  EXTERNNAME: 0x0023,
  SHRFMLA: 0x04bc,
  ARRAY: 0x0221,
  CONDFMT: 0x01b0,
  CF: 0x01b1,
  AUTOFILTERINFO: 0x009d,
  SUPBOOK: 0x01ae,
  SIINDEX: 0x1065,
  AI: 0x1051,
  DATEMODE: 0x0022,
  FILEPASS: 0x002f,
  FONT: 0x0031,
  CONTINUE: 0x003c,
  WINDOW1: 0x003d,
  PANE: 0x0041,
  CODEPAGE: 0x0042,
  DEFCOLWIDTH: 0x0055,
  OBJ: 0x005d,
  COLINFO: 0x007d,
  BOUNDSHEET: 0x0085,
  PALETTE: 0x0092,
  STANDARDWIDTH: 0x0099,
  SCL: 0x00a0,
  MULRK: 0x00bd,
  MULBLANK: 0x00be,
  RSTRING: 0x00d6,
  XF: 0x00e0,
  MERGECELLS: 0x00e5,
  MSODRAWINGGROUP: 0x00eb,
  MSODRAWING: 0x00ec,
  LABELSST: 0x00fd,
  SST: 0x00fc,
  TXO: 0x01b6,
  HLINK: 0x01b8,
  DIMENSIONS: 0x0200,
  BLANK: 0x0201,
  NUMBER: 0x0203,
  LABEL: 0x0204,
  BOOLERR: 0x0205,
  STRING: 0x0207,
  ROW: 0x0208,
  DEFAULTROWHEIGHT: 0x0225,
  WINDOW2: 0x023e,
  RK: 0x027e,
  STYLE: 0x0293,
  FORMAT: 0x041e,
  HLINKTOOLTIP: 0x0800,
  BOF: 0x0809,
  XFEXT: 0x087d,
  THEME: 0x0896,
} as const;

/** BOF de versões antigas (BIFF2/3/4) — formato não suportado. */
export const OLD_BOFS = new Set([0x0009, 0x0209, 0x0409]);

/** Registro BIFF já lido (dados com os CONTINUE subsequentes concatenados). */
export interface BiffRecord {
  type: number;
  /** Offset do cabeçalho no stream. */
  pos: number;
  data: Uint8Array;
  /** Offsets (em `data`) onde começa cada CONTINUE juntado — vazio se nenhum. */
  conts: number[];
}

/** Limite de registros juntados por CONTINUE (arquivo hostil: um SST "infinito"). */
const MAX_MERGED = 64 * 1024 * 1024;

/**
 * Percorre os registros de [start, end) do stream. Para em cabeçalho truncado.
 * Registros que não cabem no stream são cortados no fim (arquivo truncado).
 */
export function* records(buf: Uint8Array, start: number, end: number): Generator<BiffRecord> {
  let off = start;
  const lim = Math.min(end, buf.length);
  while (off + 4 <= lim) {
    const type = buf[off]! | (buf[off + 1]! << 8);
    const len = buf[off + 2]! | (buf[off + 3]! << 8);
    const pos = off;
    const dStart = off + 4;
    const dEnd = Math.min(lim, dStart + len);
    off = dStart + len;
    // CONTINUE seguintes (só se houver)
    let next = off;
    let conts: number[] | undefined;
    let total = dEnd - dStart;
    while (next + 4 <= lim && (buf[next]! | (buf[next + 1]! << 8)) === RT.CONTINUE && type !== RT.CONTINUE) {
      const cl = buf[next + 2]! | (buf[next + 3]! << 8);
      (conts ??= []).push(next);
      total += Math.min(cl, lim - next - 4);
      next += 4 + cl;
      if (total > MAX_MERGED) break;
    }
    if (!conts) {
      yield { type, pos, data: buf.subarray(dStart, dEnd), conts: [] };
      continue;
    }
    const data = new Uint8Array(total);
    data.set(buf.subarray(dStart, dEnd), 0);
    let w = dEnd - dStart;
    const marks: number[] = [];
    for (const c of conts) {
      const cl = buf[c + 2]! | (buf[c + 3]! << 8);
      const s = c + 4;
      const e = Math.min(lim, s + cl, s + (total - w));
      marks.push(w);
      data.set(buf.subarray(s, e), w);
      w += e - s;
    }
    off = next;
    yield { type, pos, data: w === total ? data : data.subarray(0, w), conts: marks };
  }
}

/** Leitor little-endian com limites sobre os dados de um registro. */
export class Bytes {
  readonly b: Uint8Array;
  private readonly v: DataView;
  constructor(b: Uint8Array) {
    this.b = b;
    this.v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  get length(): number { return this.b.length; }
  u8(o: number): number { return o >= 0 && o < this.b.length ? this.b[o]! : 0; }
  u16(o: number): number { return o >= 0 && o + 2 <= this.b.length ? this.v.getUint16(o, true) : 0; }
  i16(o: number): number { return o >= 0 && o + 2 <= this.b.length ? this.v.getInt16(o, true) : 0; }
  u32(o: number): number { return o >= 0 && o + 4 <= this.b.length ? this.v.getUint32(o, true) : 0; }
  i32(o: number): number { return o >= 0 && o + 4 <= this.b.length ? this.v.getInt32(o, true) : 0; }
  f64(o: number): number { return o >= 0 && o + 8 <= this.b.length ? this.v.getFloat64(o, true) : 0; }
  sub(s: number, e: number): Uint8Array { return this.b.subarray(Math.max(0, s), Math.min(this.b.length, e)); }
}

// ───────────────────────────── strings ─────────────────────────────

/** Codepage do Windows ([MS-XLS] CodePage) → rótulo do TextDecoder (WHATWG). */
const CODEPAGES: Record<number, string> = {
  367: 'windows-1252', 437: 'windows-1252', 850: 'windows-1252', 852: 'windows-1250', 866: 'ibm866',
  874: 'windows-874', 932: 'shift_jis', 936: 'gbk', 949: 'euc-kr', 950: 'big5',
  1200: 'utf-16le', 1250: 'windows-1250', 1251: 'windows-1251', 1252: 'windows-1252', 1253: 'windows-1253',
  1254: 'windows-1254', 1255: 'windows-1255', 1256: 'windows-1256', 1257: 'windows-1257', 1258: 'windows-1258',
  10000: 'macintosh', 10007: 'x-mac-cyrillic', 20866: 'koi8-r', 21866: 'koi8-u', 28591: 'iso-8859-1',
  28592: 'iso-8859-2', 32768: 'macintosh', 32769: 'windows-1252', 65001: 'utf-8',
};

/** Windows-1252 0x80–0x9F (o resto coincide com o Latin-1). */
const CP1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];

/** Decodificador de strings de 8 bits do BIFF5 (codepage do CODEPAGE). */
export class Codepage {
  private dec: TextDecoder | undefined;
  readonly cp: number;
  constructor(cp = 1252) {
    this.cp = cp;
    const label = CODEPAGES[cp] ?? 'windows-1252';
    // windows-1252 à mão: o TextDecoder do Node a trata como Latin-1 (0x80 ≠ €)
    if (label !== 'windows-1252') {
      try { this.dec = new TextDecoder(label); } catch { this.dec = undefined; }
    }
  }
  decode(b: Uint8Array): string {
    if (this.dec) return this.dec.decode(b);
    let s = '';
    for (let i = 0; i < b.length; i++) {
      const c = b[i]!;
      s += String.fromCharCode(c >= 0x80 && c <= 0x9f ? CP1252_HIGH[c - 0x80]! : c);
    }
    return s;
  }
}

const UTF16 = new TextDecoder('utf-16le');

/** Latin-1 (BIFF8 "comprimido": byte baixo do UTF-16) → string. */
export function latin1(b: Uint8Array): string {
  let s = '';
  const CH = 8192;
  for (let i = 0; i < b.length; i += CH) {
    s += String.fromCharCode.apply(null, b.subarray(i, Math.min(b.length, i + CH)) as unknown as number[]);
  }
  return s;
}

/** UTF-16LE de um trecho de bytes (comprimento par). */
export function utf16(b: Uint8Array): string {
  return UTF16.decode(b.length & 1 ? b.subarray(0, b.length - 1) : b);
}

/** Resultado de leitura de string com a posição seguinte. */
export interface StrRead { text: string; next: number }

/**
 * Lê `cch` caracteres a partir de `off` com o byte de opções já consumido
 * (`high` = fHighByte). Em cada fronteira de CONTINUE (`conts`) dentro do
 * trecho dos caracteres, o CONTINUE começa com um NOVO byte de opções.
 */
export function readChars(r: Bytes, off: number, cch: number, high: boolean, conts: number[]): StrRead {
  let text = '';
  let left = cch;
  let p = off;
  let ci = 0;
  // fronteira EXATAMENTE no início dos caracteres também traz o byte de opções
  // (cabeçalho no fim de um registro, caracteres no CONTINUE seguinte)
  while (ci < conts.length && conts[ci]! < p) ci++;
  while (left > 0 && p < r.length) {
    const bound = ci < conts.length ? conts[ci]! : r.length;
    const avail = high ? (bound - p) >> 1 : bound - p;
    const n = Math.min(left, avail);
    if (n > 0) {
      const bytes = r.sub(p, p + (high ? n * 2 : n));
      text += high ? utf16(bytes) : latin1(bytes);
      p += high ? n * 2 : n;
      left -= n;
    }
    if (left > 0) {
      if (p >= r.length) break;
      if (p >= bound && ci < conts.length) {
        // novo CONTINUE: 1 byte de opções (só fHighByte importa)
        high = (r.u8(p) & 1) !== 0;
        p += 1;
        ci++;
      } else if (n === 0) {
        // caractere UTF-16 partido na fronteira (arquivo malformado): pula o byte
        p += 1;
      }
    }
  }
  return { text, next: p };
}

/**
 * XLUnicodeString (BIFF8: cch u16 + opções u8 + chars) ou string BIFF5
 * (cch u16 + bytes na codepage). `cchSize` = 1 para ShortXLUnicodeString.
 */
export function readXLString(r: Bytes, off: number, biff8: boolean, cp: Codepage, cchSize: 1 | 2 = 2, conts: number[] = []): StrRead {
  const cch = cchSize === 1 ? r.u8(off) : r.u16(off);
  let p = off + cchSize;
  if (!biff8) {
    const bytes = r.sub(p, p + cch);
    return { text: cp.decode(bytes), next: p + cch };
  }
  const flags = r.u8(p);
  p += 1;
  return readChars(r, p, cch, (flags & 1) !== 0, conts);
}

/** Run de formatação de texto rico: a partir do caractere `ich` vale a fonte `ifnt`. */
export interface FormatRun { ich: number; ifnt: number }

/** String com runs de formatação (SST/RSTRING/TXO). */
export interface RichString { text: string; runs?: FormatRun[] }

/**
 * XLUnicodeRichExtendedString (item do SST, [MS-XLS] 2.5.293): cch u16,
 * opções u8 (fHighByte, fExtSt, fRichSt), [cRun u16], [cbExtRst i32], chars,
 * runs (4 bytes cada), ExtRst (fonética — ignorada).
 */
export function readRichExtString(r: Bytes, off: number, conts: number[]): { s: RichString; next: number } {
  const cch = r.u16(off);
  const flags = r.u8(off + 2);
  let p = off + 3;
  let cRun = 0;
  let cbExt = 0;
  if (flags & 0x08) { cRun = r.u16(p); p += 2; }
  if (flags & 0x04) { cbExt = r.i32(p); p += 4; }
  const chars = readChars(r, p, cch, (flags & 1) !== 0, conts);
  p = chars.next;
  const s: RichString = { text: chars.text };
  if (cRun > 0) {
    const runs: FormatRun[] = [];
    for (let i = 0; i < cRun && p + 4 <= r.length; i++, p += 4) runs.push({ ich: r.u16(p), ifnt: r.u16(p + 2) });
    if (cRun > runs.length) p += (cRun - runs.length) * 4;
    s.runs = runs;
  }
  if (cbExt > 0) p += cbExt;
  return { s, next: p };
}
