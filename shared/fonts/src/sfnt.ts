// Leitura mínima de cabeçalhos sfnt — só o que o resolvedor precisa: licença
// de incorporação (OS/2 fsType) e extrair uma face de coleção `.ttc`.

const tag = (v: DataView, p: number): string =>
  String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));

function tableOf(v: DataView, base: number, want: string): { off: number; len: number } | null {
  const num = v.getUint16(base + 4);
  for (let i = 0; i < num; i++) {
    const p = base + 12 + i * 16;
    if (tag(v, p) === want) return { off: v.getUint32(p + 8), len: v.getUint32(p + 12) };
  }
  return null;
}

const FONT_SIGNATURES = new Set(['\x00\x01\x00\x00', 'true', 'OTTO', 'ttcf', 'wOFF', 'wOF2']);

/** Os bytes são de um arquivo de fonte (TrueType, OpenType, coleção, WOFF)? — um 200
 *  com o HTML de fallback de uma SPA no lugar do .ttf não passa. */
export function isFontFile(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return FONT_SIGNATURES.has(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!));
}

/**
 * A licença permite embutir a fonte em documento/PDF? OS/2 fsType: 0x2 sozinho
 * = "Restricted License"; 0x4/0x8 liberam; 0x200 = só bitmap. Sem OS/2
 * legível: permite (o padrão da especificação é fsType 0).
 */
export function isEmbeddable(bytes: Uint8Array): boolean {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const os2 = tableOf(v, 0, 'OS/2');
    if (!os2 || os2.len < 10) return true;
    const fsType = v.getUint16(os2.off + 8);
    return !((fsType & 0x2) && !(fsType & 0xc)) && !(fsType & 0x200);
  } catch {
    return true;
  }
}

/** A fonte tem contornos TrueType (glyf)? Só essas o subsetter recorta. */
export function hasTrueTypeOutlines(bytes: Uint8Array): boolean {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return !!tableOf(v, 0, 'glyf') && !!tableOf(v, 0, 'loca');
  } catch {
    return false;
  }
}

/**
 * Glyph ids dos code points (cmap formato 4 e 12; Windows Unicode primeiro).
 * Code point sem glifo some do resultado.
 */
export function glyphIdsFor(bytes: Uint8Array, codePoints: Iterable<number>): Set<number> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Set<number>();
  const cmap = tableOf(v, 0, 'cmap');
  if (!cmap) return out;
  const n = v.getUint16(cmap.off + 2);
  let best = -1, score = -1;
  for (let i = 0; i < n; i++) {
    const p = cmap.off + 4 + i * 8;
    const pl = v.getUint16(p), enc = v.getUint16(p + 2);
    const s = pl === 3 && enc === 10 ? 3 : pl === 3 && enc === 1 ? 2 : pl === 0 ? 1 : 0;
    if (s > score) { score = s; best = cmap.off + v.getUint32(p + 4); }
  }
  if (best < 0) return out;
  const format = v.getUint16(best);
  const lookup = (cp: number): number => {
    if (format === 4) {
      if (cp > 0xffff) return 0;
      const segX2 = v.getUint16(best + 6);
      const ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        if (cp > v.getUint16(ends + s)) continue;
        const start = v.getUint16(starts + s);
        if (cp < start) return 0;
        const delta = v.getInt16(deltas + s), ro = v.getUint16(ranges + s);
        if (!ro) return (cp + delta) & 0xffff;
        const g = v.getUint16(ranges + s + ro + (cp - start) * 2);
        return g ? (g + delta) & 0xffff : 0;
      }
      return 0;
    }
    if (format === 12) {
      const groups = v.getUint32(best + 12);
      for (let i = 0; i < groups; i++) {
        const p = best + 16 + i * 12;
        const a = v.getUint32(p), b = v.getUint32(p + 4);
        if (cp >= a && cp <= b) return v.getUint32(p + 8) + (cp - a);
      }
    }
    return 0;
  };
  for (const cp of codePoints) {
    const g = lookup(cp);
    if (g) out.add(g);
  }
  return out;
}

/** Dados da OS/2 e do head que os formatos de incorporação repetem. */
export interface FaceInfo {
  /** PANOSE (10 bytes) em hex maiúsculo — `w:panose1` / `p:font/@panose`. */
  panose: string;
  weight: number;
  italic: boolean;
  fsType: number;
  unicodeRange: [number, number, number, number];
  codePageRange: [number, number];
  checkSumAdjustment: number;
  /** Nomes da tabela `name` (en-US): família (1), estilo (2), versão (5), completo (4). */
  names: { family: string; style: string; version: string; full: string };
}

export function faceInfo(bytes: Uint8Array): FaceInfo {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const os2 = tableOf(v, 0, 'OS/2'), head = tableOf(v, 0, 'head');
  const u32 = (t: { off: number; len: number } | null, o: number) => (t && t.len >= o + 4 ? v.getUint32(t.off + o) : 0);
  const panose = os2 && os2.len >= 42
    ? [...bytes.subarray(os2.off + 32, os2.off + 42)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    : '00000000000000000000';
  return {
    panose,
    weight: os2 ? v.getUint16(os2.off + 4) || 400 : 400,
    italic: os2 ? (v.getUint16(os2.off + 62) & 1) === 1 : false,
    fsType: os2 ? v.getUint16(os2.off + 8) : 0,
    unicodeRange: [u32(os2, 42), u32(os2, 46), u32(os2, 50), u32(os2, 54)],
    codePageRange: os2 && v.getUint16(os2.off) >= 1 ? [u32(os2, 78), u32(os2, 82)] : [0, 0],
    checkSumAdjustment: u32(head, 8),
    names: { family: nameString(v, 1), style: nameString(v, 2), version: nameString(v, 5), full: nameString(v, 4) },
  };
}

/** String da tabela `name` (Windows/Unicode, en-US de preferência). */
function nameString(v: DataView, id: number): string {
  const name = tableOf(v, 0, 'name');
  if (!name) return '';
  const count = v.getUint16(name.off + 2);
  const strOff = name.off + v.getUint16(name.off + 4);
  let any = '';
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (v.getUint16(r) !== 3 || v.getUint16(r + 6) !== id) continue;
    const len = v.getUint16(r + 8), o = strOff + v.getUint16(r + 10);
    let s = '';
    for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(o + k));
    if (v.getUint16(r + 4) === 0x409) return s;
    any ||= s;
  }
  return any;
}

/** Nome PostScript (name ID 6) da face que começa em `base`. */
function postscriptName(v: DataView, base: number): string | null {
  const name = tableOf(v, base, 'name');
  if (!name) return null;
  const count = v.getUint16(name.off + 2);
  const strOff = name.off + v.getUint16(name.off + 4);
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (v.getUint16(r + 6) !== 6) continue;
    const platform = v.getUint16(r), len = v.getUint16(r + 8), o = strOff + v.getUint16(r + 10);
    let s = '';
    if (platform === 3 || platform === 0) for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(o + k));
    else for (let k = 0; k < len; k++) s += String.fromCharCode(v.getUint8(o + k));
    if (s) return s;
  }
  return null;
}

/**
 * Bytes de uma face como sfnt AVULSO. Arquivo comum: devolve o próprio. Coleção
 * `.ttc`: extrai a face cujo nome PostScript bate (ou a 0) — offset table +
 * diretório + tabelas copiadas, alinhadas a 4. O FontFace aceitaria o `.ttc`,
 * mas o parser de métricas e o embutidor de PDF do Write só leem TTF/OTF.
 */
export function standaloneFace(bytes: Uint8Array, wantPostscript?: string): Uint8Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12 || tag(v, 0) !== 'ttcf') return bytes;
  const numFonts = v.getUint32(8);
  let base = v.getUint32(12);
  if (wantPostscript) {
    for (let i = 0; i < numFonts; i++) {
      const b = v.getUint32(12 + i * 4);
      if (postscriptName(v, b) === wantPostscript) { base = b; break; }
    }
  }
  const num = v.getUint16(base + 4);
  const recs: { o: number; off: number; len: number }[] = [];
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    const off = v.getUint32(o + 8), len = v.getUint32(o + 12);
    if (off + len > bytes.length) throw new RangeError('tabela fora do arquivo');
    recs.push({ o, off, len });
  }
  const headerLen = 12 + num * 16;
  const out = new Uint8Array(recs.reduce((n, r) => n + ((r.len + 3) & ~3), headerLen));
  const ov = new DataView(out.buffer);
  out.set(bytes.subarray(base, base + 12), 0);
  let pos = headerLen;
  recs.forEach((r, i) => {
    const d = 12 + i * 16;
    out.set(bytes.subarray(r.o, r.o + 8), d); // tag + checksum
    ov.setUint32(d + 8, pos);
    ov.setUint32(d + 12, r.len);
    out.set(bytes.subarray(r.off, r.off + r.len), pos);
    pos += (r.len + 3) & ~3;
  });
  return out;
}
