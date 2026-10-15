/**
 * OfficeArt ([MS-ODRAW]) do .xls: o MSODRAWINGGROUP traz o armazém de imagens
 * (BStore → FBSE com o BLIP embutido) e o MSODRAWING concatenado de cada
 * planilha traz a árvore de formas (DgContainer → SpgrContainer → SpContainer
 * com FSP, FOPT, âncora de célula e ClientData — este liga cada forma, pela
 * ordem, ao registro OBJ que a segue).
 *
 * Mesmo formato de registro lido pelo .ppt do Slides (slides-core/src/ppt/
 * officeart.ts) — aqui imagens, âncoras e a árvore de formas (grupos, FOPT com
 * as propriedades complexas).
 */
import { Unzlib, Inflate } from 'fflate';

/** Registro OfficeArt: cabeçalho de 8 bytes + faixa de dados [start, end). */
export interface OARec {
  ver: number;
  inst: number;
  type: number;
  /** Offset do cabeçalho. */
  hdr: number;
  start: number;
  end: number;
}

export const OA = {
  DggContainer: 0xf000, BStoreContainer: 0xf001, DgContainer: 0xf002, SpgrContainer: 0xf003, SpContainer: 0xf004,
  FBSE: 0xf007, FSPGR: 0xf009, FSP: 0xf00a, FOPT: 0xf00b, ClientTextbox: 0xf00d, ChildAnchor: 0xf00f,
  ClientAnchor: 0xf010, ClientData: 0xf011, SecondaryFOPT: 0xf121, TertiaryFOPT: 0xf122,
  BlipEMF: 0xf01a, BlipWMF: 0xf01b, BlipPICT: 0xf01c, BlipJPEG: 0xf01d, BlipPNG: 0xf01e, BlipDIB: 0xf01f,
  BlipJPEGCMYK: 0xf02a, BlipTIFF: 0xf029,
} as const;

/** Leitor com limites. */
class R {
  readonly b: Uint8Array;
  private readonly v: DataView;
  constructor(b: Uint8Array) { this.b = b; this.v = new DataView(b.buffer, b.byteOffset, b.byteLength); }
  u8(o: number): number { return o >= 0 && o < this.b.length ? this.b[o]! : 0; }
  u16(o: number): number { return o >= 0 && o + 2 <= this.b.length ? this.v.getUint16(o, true) : 0; }
  i16(o: number): number { return o >= 0 && o + 2 <= this.b.length ? this.v.getInt16(o, true) : 0; }
  u32(o: number): number { return o >= 0 && o + 4 <= this.b.length ? this.v.getUint32(o, true) : 0; }
  i32(o: number): number { return o >= 0 && o + 4 <= this.b.length ? this.v.getInt32(o, true) : 0; }
}

function readRec(r: R, off: number, limit: number): OARec | undefined {
  if (off + 8 > limit) return undefined;
  const vi = r.u16(off);
  const len = r.u32(off + 4);
  const start = off + 8;
  return { ver: vi & 0xf, inst: vi >>> 4, type: r.u16(off + 2), hdr: off, start, end: Math.min(limit, start + len) };
}

/** Registros consecutivos em [start, end) (para no primeiro cabeçalho inválido). */
function recsIn(r: R, start: number, end: number): OARec[] {
  const out: OARec[] = [];
  let off = start;
  while (off + 8 <= end) {
    const rec = readRec(r, off, end);
    if (!rec) break;
    out.push(rec);
    if (rec.end - rec.start < r.u32(off + 4)) break; // transborda o pai: corrompido
    off = rec.end;
  }
  return out;
}

// ───────────────────────────── imagens ─────────────────────────────

/** Imagem extraída de um BLIP. */
export interface Blip { ext: string; mime: string; bytes: Uint8Array }

/** Teto por imagem descomprimida (metarquivo real tem poucos MB). */
const MAX_BLIP = 64 * 1024 * 1024;

function uidCount(type: number, inst: number): number {
  switch (type) {
    case OA.BlipEMF: return inst === 0x3d5 ? 2 : 1;
    case OA.BlipWMF: return inst === 0x217 ? 2 : 1;
    case OA.BlipPICT: return inst === 0x543 ? 2 : 1;
    case OA.BlipJPEG: case OA.BlipJPEGCMYK: return inst === 0x46b || inst === 0x6e3 ? 2 : 1;
    case OA.BlipPNG: return inst === 0x6e1 ? 2 : 1;
    case OA.BlipDIB: return inst === 0x7a9 ? 2 : 1;
    case OA.BlipTIFF: return inst === 0x6e5 ? 2 : 1;
    default: return 1;
  }
}

/** Descomprime com teto (bomba de descompressão vira erro). */
function inflateCapped(raw: Uint8Array, zlib: boolean, budget: { left: number }): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const limit = Math.min(MAX_BLIP, budget.left);
  const s = zlib ? new Unzlib() : new Inflate();
  s.ondata = (chunk) => {
    total += chunk.length;
    if (total > limit) throw new Error('imagem descomprimida grande demais');
    chunks.push(chunk);
  };
  s.push(raw, true);
  budget.left -= total;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** DIB (BITMAPINFOHEADER + pixels) → arquivo .bmp. */
function dibToBmp(dib: Uint8Array): Uint8Array {
  const r = new R(dib);
  const hdrSize = r.u32(0) || 40;
  const bitCount = r.u16(14) || 24;
  const compression = r.u32(16);
  let clrUsed = r.u32(32);
  if (clrUsed === 0 && bitCount <= 8) clrUsed = 1 << bitCount;
  const masks = compression === 3 && hdrSize === 40 ? 12 : 0;
  const out = new Uint8Array(14 + dib.length);
  const ov = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  ov.setUint32(2, out.length, true);
  ov.setUint32(10, 14 + hdrSize + masks + clrUsed * 4, true);
  out.set(dib, 14);
  return out;
}

/** WMF do BLIP não traz o cabeçalho "placeable" (Aldus): gera a partir do rcBounds. */
function withPlaceable(wmf: Uint8Array, l: number, t: number, rr: number, b: number): Uint8Array {
  const out = new Uint8Array(22 + wmf.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x9ac6cdd7, true);
  v.setInt16(6, l, true); v.setInt16(8, t, true); v.setInt16(10, rr, true); v.setInt16(12, b, true);
  v.setUint16(14, 1440, true);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum ^= v.getUint16(i * 2, true);
  v.setUint16(20, sum, true);
  out.set(wmf, 22);
  return out;
}

function decodeBlip(r: R, rec: OARec, budget: { left: number }): Blip | undefined {
  const uids = uidCount(rec.type, rec.inst) * 16;
  const data = (off: number): Uint8Array => r.b.slice(rec.start + off, rec.end);
  switch (rec.type) {
    case OA.BlipPNG: return { ext: 'png', mime: 'image/png', bytes: data(uids + 1) };
    case OA.BlipJPEG: case OA.BlipJPEGCMYK: return { ext: 'jpeg', mime: 'image/jpeg', bytes: data(uids + 1) };
    case OA.BlipTIFF: return { ext: 'tiff', mime: 'image/tiff', bytes: data(uids + 1) };
    case OA.BlipDIB: return { ext: 'bmp', mime: 'image/bmp', bytes: dibToBmp(data(uids + 1)) };
    case OA.BlipEMF: case OA.BlipWMF: case OA.BlipPICT: {
      // OfficeArtMetafileHeader (34 bytes): cbSize, rcBounds, ptSize, cbSave, compression, filter
      const h = rec.start + uids;
      const cbSize = r.u32(h);
      const compression = r.u8(h + 32);
      let bytes = r.b.subarray(h + 34, rec.end);
      if (compression === 0) {
        try { bytes = inflateCapped(bytes, true, budget); } catch {
          try { bytes = inflateCapped(bytes, false, budget); } catch { return undefined; }
        }
      }
      bytes = bytes.slice(0, cbSize > 0 && cbSize < bytes.length ? cbSize : bytes.length);
      if (rec.type === OA.BlipEMF) return { ext: 'emf', mime: 'image/x-emf', bytes };
      if (rec.type === OA.BlipWMF) return { ext: 'wmf', mime: 'image/x-wmf', bytes: withPlaceable(bytes, r.i32(h + 4), r.i32(h + 8), r.i32(h + 12), r.i32(h + 16)) };
      return { ext: 'pict', mime: 'image/pict', bytes };
    }
  }
  return undefined;
}

/**
 * Armazém de imagens do MSODRAWINGGROUP: índice pib (1-based) → imagem.
 * Decodificação sob demanda (só as imagens de fato usadas).
 */
export class BlipStore {
  private readonly r: R;
  private readonly entries: (OARec | undefined)[] = [];
  private readonly cache = new Map<number, Blip | undefined>();
  private readonly budget = { left: 512 * 1024 * 1024 };

  constructor(dgg: Uint8Array | undefined) {
    this.r = new R(dgg ?? new Uint8Array(0));
    if (!dgg) return;
    for (const top of recsIn(this.r, 0, dgg.length)) {
      if (top.type !== OA.DggContainer) continue;
      for (const c of recsIn(this.r, top.start, top.end)) {
        if (c.type !== OA.BStoreContainer) continue;
        for (const bse of recsIn(this.r, c.start, c.end)) {
          if (bse.type !== OA.FBSE) { this.entries.push(undefined); continue; }
          const cbName = this.r.u8(bse.start + 33);
          const emb = readRec(this.r, bse.start + 36 + cbName, bse.end);
          this.entries.push(emb && emb.type >= 0xf018 && emb.type <= 0xf117 ? emb : undefined);
        }
      }
    }
  }

  /** Imagem do índice pib (1-based) ou undefined. */
  get(pib: number): Blip | undefined {
    if (this.cache.has(pib)) return this.cache.get(pib);
    const rec = this.entries[pib - 1];
    let b: Blip | undefined;
    try { b = rec ? decodeBlip(this.r, rec, this.budget) : undefined; } catch { b = undefined; }
    this.cache.set(pib, b);
    return b;
  }
}

// ───────────────────────────── formas ─────────────────────────────

/** Âncora de célula do Excel (OfficeArtClientAnchorSheet). */
export interface CellAnchor {
  c1: number; dx1: number; r1: number; dy1: number;
  c2: number; dx2: number; r2: number; dy2: number;
}

/** Retângulo (FSPGR / ChildAnchor): coordenadas do espaço do grupo. */
export interface OARect { l: number; t: number; r: number; b: number }

/** Forma (ou grupo) do desenho da planilha. */
export interface XlsShape {
  spid: number;
  /** Tipo msospt (FSP.recInstance): 75 = moldura de imagem, 201 = gráfico/controle… */
  type: number;
  /** Flags do FSP (fGroup 0x1, fChild 0x2, fPatriarch 0x4, fDeleted 0x8, fFlipH 0x40, fFlipV 0x80…). */
  flags: number;
  /** Propriedades simples do FOPT (id → valor). */
  props: Map<number, number>;
  /** Propriedades complexas (vértices, segmentos, nomes, metroBlob…): id → dados. */
  complex: Map<number, Uint8Array>;
  /** Âncora de célula (formas de nível superior). */
  anchor?: CellAnchor;
  /** Âncora no espaço do grupo pai (formas dentro de grupo). */
  childAnchor?: OARect;
  /** Espaço de coordenadas dos filhos (FSPGR) — só grupos. */
  groupRect?: OARect;
  /** Offset do ClientData no desenho concatenado (liga ao OBJ). */
  clientDataAt?: number;
  /** Forma é um grupo (`children` = filhos em ordem de desenho). */
  group: boolean;
  children?: XlsShape[];
}

/** Propriedades complexas que são IMsoArray (nElems, nElemsAlloc, cbElem + dados). */
const MSO_ARRAY_PROPS = new Set([0x145, 0x146, 0x151, 0x152, 0x153, 0x154, 0x155, 0x156, 0x157, 0x197, 0x1cf, 0x383, 0x3a0]);

/**
 * Propriedades de um FOPT (ou Secondary/Tertiary) para dentro da forma — como o
 * leitor .ppt do Slides: IMsoArray com o tamanho declarado SEM os 6 bytes do
 * cabeçalho (gravadores de terceiros) usa o tamanho do cabeçalho; conjunto
 * BOOLEANO repetido (FOPT + terciário) só troca os bits com fUse no novo.
 */
function readFopt(r: R, c: OARec, sh: { props: Map<number, number>; complex: Map<number, Uint8Array> }): void {
  const n = c.inst;
  let complexOff = c.start + n * 6;
  for (let i = 0; i < n; i++) {
    const o = c.start + i * 6;
    if (o + 6 > c.end) break;
    const opid = r.u16(o);
    const id = opid & 0x3fff;
    const value = r.u32(o + 2);
    if (opid & 0x8000) {
      let size = value;
      if (MSO_ARRAY_PROPS.has(id) && complexOff + 6 <= c.end) {
        let cb = r.u16(complexOff + 4);
        if (cb === 0xfff0) cb = 4;
        const arrSize = 6 + r.u16(complexOff) * cb;
        if (value === arrSize - 6 && complexOff + arrSize <= c.end) size = arrSize;
      }
      const len = Math.max(0, Math.min(size, c.end - complexOff));
      sh.complex.set(id, r.b.subarray(complexOff, complexOff + len));
      complexOff += len;
      continue;
    }
    const prev = sh.props.get(id);
    if (prev !== undefined && (id & 0x3f) === 0x3f && (value >>> 16) !== 0) {
      const use = value >>> 16;
      let v = prev;
      for (let b = 0; b < 16; b++) if (use & (1 << b)) v = (v & ~(1 << b) & ~(1 << (b + 16))) | (value & (1 << b)) | (1 << (b + 16));
      sh.props.set(id, v >>> 0);
      continue;
    }
    sh.props.set(id, value);
  }
}

/** Aninhamento máximo de grupos (arquivos corrompidos podem aninhar sem fim). */
const MAX_GROUP_DEPTH = 32;

/**
 * Lê as formas do DgContainer (desenho concatenado da planilha): as de nível
 * superior em ordem de desenho, grupos com os filhos (`children`).
 */
export function readShapes(dg: Uint8Array): XlsShape[] {
  const r = new R(dg);
  const out: XlsShape[] = [];
  const top = recsIn(r, 0, dg.length);
  for (const t of top) {
    if (t.type !== OA.DgContainer) continue;
    for (const c of recsIn(r, t.start, t.end)) {
      if (c.type !== OA.SpgrContainer) continue;
      const kids = recsIn(r, c.start, c.end);
      kids.forEach((k, i) => {
        if (i === 0 && k.type === OA.SpContainer) return; // o próprio grupo patriarca
        const s = k.type === OA.SpContainer ? readSp(r, k) : k.type === OA.SpgrContainer ? readGroup(r, k, 0) : undefined;
        if (s) out.push(s);
      });
    }
  }
  return out;
}

/** SpgrContainer → grupo (o 1º SpContainer descreve o próprio grupo). */
function readGroup(r: R, rec: OARec, depth: number): XlsShape | undefined {
  const kids = recsIn(r, rec.start, rec.end);
  const first = kids[0];
  if (!first || first.type !== OA.SpContainer) return undefined;
  const g = readSp(r, first);
  if (!g) return undefined;
  g.group = true;
  g.children = [];
  for (const k of kids.slice(1)) {
    const s = k.type === OA.SpContainer ? readSp(r, k)
      : k.type === OA.SpgrContainer && depth < MAX_GROUP_DEPTH ? readGroup(r, k, depth + 1) : undefined;
    if (s) g.children.push(s);
  }
  return g;
}

function readSp(r: R, rec: OARec): XlsShape | undefined {
  const sh: XlsShape = { spid: 0, type: 0, flags: 0, props: new Map(), complex: new Map(), group: false };
  const rect = (o: number): OARect => ({ l: r.i32(o), t: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) });
  for (const c of recsIn(r, rec.start, rec.end)) {
    switch (c.type) {
      case OA.FSP:
        sh.type = c.inst;
        sh.spid = r.u32(c.start);
        sh.flags = r.u32(c.start + 4);
        break;
      case OA.FSPGR:
        if (c.end - c.start >= 16) sh.groupRect = rect(c.start);
        break;
      case OA.FOPT: case OA.SecondaryFOPT: case OA.TertiaryFOPT:
        readFopt(r, c, sh);
        break;
      case OA.ClientAnchor:
        if (c.end - c.start >= 18) {
          const o = c.start;
          sh.anchor = {
            c1: r.u16(o + 2), dx1: r.u16(o + 4), r1: r.u16(o + 6), dy1: r.u16(o + 8),
            c2: r.u16(o + 10), dx2: r.u16(o + 12), r2: r.u16(o + 14), dy2: r.u16(o + 16),
          };
        }
        break;
      case OA.ChildAnchor:
        if (c.end - c.start >= 16) sh.childAnchor = rect(c.start);
        break;
      case OA.ClientData:
        sh.clientDataAt = c.hdr;
        break;
    }
  }
  return sh.flags & 0x8 ? undefined : sh; // fDeleted
}

/**
 * Propriedades de uma sequência de registros FOPT/TertiaryFOPT soltos (ex.: o
 * GELFRAME dos gráficos — o preenchimento do Office 2007 em OfficeArt).
 */
export function readFoptBlock(b: Uint8Array): { props: Map<number, number>; complex: Map<number, Uint8Array> } {
  const r = new R(b);
  const out = { props: new Map<number, number>(), complex: new Map<number, Uint8Array>() };
  for (const c of recsIn(r, 0, b.length)) {
    if (c.type === OA.FOPT || c.type === OA.SecondaryFOPT || c.type === OA.TertiaryFOPT) readFopt(r, c, out);
  }
  return out;
}

/** Todas as formas da árvore (grupos e filhos) em ordem do documento. */
export function flattenShapes(shapes: readonly XlsShape[], out: XlsShape[] = []): XlsShape[] {
  for (const s of shapes) {
    out.push(s);
    if (s.children) flattenShapes(s.children, out);
  }
  return out;
}

/**
 * Propriedades PADRÃO do documento (FOPT do DggContainer no MSODRAWINGGROUP —
 * o Excel grava fillColor 0x08000041 = fundo da janela e lineColor 0x08000040
 * = texto da janela).
 */
export function readDrawingDefaults(dgg: Uint8Array | undefined): Map<number, number> {
  const out = new Map<number, number>();
  if (!dgg) return out;
  const r = new R(dgg);
  for (const top of recsIn(r, 0, dgg.length)) {
    if (top.type !== OA.DggContainer) continue;
    for (const c of recsIn(r, top.start, top.end)) {
      if (c.type === OA.FOPT) readFopt(r, c, { props: out, complex: new Map() });
    }
  }
  return out;
}
