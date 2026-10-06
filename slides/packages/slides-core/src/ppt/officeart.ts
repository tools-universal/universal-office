/**
 * Desenhos OfficeArt ([MS-ODRAW]) embutidos no .ppt: árvore de formas
 * (SpgrContainer/SpContainer), propriedades (FOPT), âncoras, e o armazém de
 * imagens (BStore → BSE → blip no stream "Pictures").
 */
import { unzlibSync, inflateSync } from 'fflate';
import { ByteReader, type Rec, children, OA, readRec } from './records.js';

/** Propriedade de forma (OfficeArtFOPTE): id de 14 bits + valor de 32 bits. */
export interface OAProp {
  id: number;
  value: number;
  /** Dados complexos (fComplex): strings, arrays, blobs. */
  complex?: Uint8Array;
  /** fBid: o valor é um índice de BLIP (1-based no BStore). */
  bid: boolean;
}

export interface Rect { l: number; t: number; r: number; b: number }

/** Forma (ou grupo) OfficeArt. */
export interface OAShape {
  spid: number;
  /** Tipo de forma msosptXXX (FSP.recInstance). */
  type: number;
  /** Flags do FSP (fGroup, fChild, fPatriarch, fDeleted, fOleShape, fHaveMaster, fFlipH, fFlipV, fConnector, fHaveAnchor, fBackground, fHaveSpt). */
  flags: number;
  props: Map<number, OAProp>;
  /** Âncora: ClientAnchor (mestre-unidades do slide) ou ChildAnchor (espaço do grupo). */
  anchor?: Rect;
  anchorKind?: 'client' | 'child';
  /** Sistema de coordenadas filho do grupo (FSPGR). */
  groupRect?: Rect;
  /** Filhos (somente grupos), em ordem de desenho. */
  children?: OAShape[];
  /** OfficeArtClientData (contêiner PPT: placeholder, animação, etc.). */
  clientData?: Rec;
  /** OfficeArtClientTextbox (registros de texto do PPT). */
  clientTextbox?: Rec;
}

export const FSP = {
  group: 0x1, child: 0x2, patriarch: 0x4, deleted: 0x8, oleShape: 0x10, haveMaster: 0x20,
  flipH: 0x40, flipV: 0x80, connector: 0x100, haveAnchor: 0x200, background: 0x400, haveSpt: 0x800,
} as const;

/** Propriedades complexas que são IMsoArray (cabeçalho nElems/nElemsAlloc/cbElem + dados). */
const MSO_ARRAY_PROPS = new Set([0x145, 0x146, 0x151, 0x152, 0x153, 0x154, 0x155, 0x156, 0x157, 0x197, 0x1cf, 0x383, 0x3a0]);

/**
 * Lê as propriedades de um FOPT (ou Secondary/Tertiary FOPT) para dentro de
 * `into`. Para IMsoArray, alguns gravadores (LibreOffice) declaram o tamanho
 * SEM os 6 bytes do cabeçalho do array — o tamanho real sai do cabeçalho.
 */
export function readFopt(rec: Rec, into: Map<number, OAProp>): void {
  const r = rec.r;
  const n = rec.inst;
  let complexOff = rec.start + n * 6;
  for (let i = 0; i < n; i++) {
    const o = rec.start + i * 6;
    if (o + 6 > rec.end) break;
    const opid = r.u16(o);
    const value = r.u32(o + 2);
    const prop: OAProp = { id: opid & 0x3fff, value, bid: (opid & 0x4000) !== 0 };
    if (opid & 0x8000) {
      let size = value;
      if (MSO_ARRAY_PROPS.has(prop.id) && complexOff + 6 <= rec.end) {
        let cb = r.u16(complexOff + 4);
        if (cb === 0xfff0) cb = 4;
        const arrSize = 6 + r.u16(complexOff) * cb;
        if (value === arrSize - 6 && complexOff + arrSize <= rec.end) size = arrSize;
      }
      const len = Math.max(0, Math.min(size, rec.end - complexOff));
      prop.complex = r.sub(complexOff, complexOff + len);
      complexOff += len;
    }
    into.set(prop.id, prop);
  }
}

function readRect(r: ByteReader, o: number): Rect {
  return { l: r.i32(o), t: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
}

/**
 * ClientAnchor do PPT: SmallRectStruct (8 bytes: top, left, right, bottom
 * como i16) ou RectStruct (16 bytes: top, left, right, bottom como i32).
 */
function readClientAnchor(rec: Rec): Rect {
  const r = rec.r;
  const o = rec.start;
  if (rec.end - rec.start >= 16) return { t: r.i32(o), l: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
  return { t: r.i16(o), l: r.i16(o + 2), r: r.i16(o + 4), b: r.i16(o + 6) };
}

/** SpContainer → forma folha (ou o "cabeçalho" de um grupo). */
export function readSpContainer(rec: Rec): OAShape {
  const shape: OAShape = { spid: 0, type: 0, flags: 0, props: new Map() };
  for (const c of children(rec)) {
    switch (c.type) {
      case OA.FSP:
        shape.type = c.inst;
        shape.spid = c.r.u32(c.start);
        shape.flags = c.r.u32(c.start + 4);
        break;
      case OA.FSPGR: shape.groupRect = readRect(c.r, c.start); break;
      case OA.FOPT:
      case OA.SecondaryFOPT:
      case OA.TertiaryFOPT:
        readFopt(c, shape.props);
        break;
      case OA.ClientAnchor: shape.anchor = readClientAnchor(c); shape.anchorKind = 'client'; break;
      case OA.ChildAnchor: shape.anchor = readRect(c.r, c.start); shape.anchorKind = 'child'; break;
      case OA.ClientData: shape.clientData = c; break;
      case OA.ClientTextbox: shape.clientTextbox = c; break;
    }
  }
  return shape;
}

/** Aninhamento máximo de grupos (arquivos corrompidos podem aninhar sem fim). */
const MAX_GROUP_DEPTH = 64;

/** SpgrContainer → grupo com filhos (o 1º SpContainer descreve o próprio grupo). */
export function readSpgrContainer(rec: Rec, depth = 0): OAShape {
  const kids = children(rec);
  const first = kids[0];
  const group: OAShape = first && first.type === OA.SpContainer
    ? readSpContainer(first)
    : { spid: 0, type: 0, flags: FSP.group, props: new Map() };
  group.children = [];
  for (const c of kids.slice(first && first.type === OA.SpContainer ? 1 : 0)) {
    if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      if (!(s.flags & FSP.deleted)) group.children.push(s);
    } else if (c.type === OA.SpgrContainer && depth < MAX_GROUP_DEPTH) {
      const g = readSpgrContainer(c, depth + 1);
      if (!(g.flags & FSP.deleted)) group.children.push(g);
    }
  }
  return group;
}

/** Desenho de um slide/mestre: grupo patriarca + forma de fundo. */
export interface OADrawing {
  /** Grupo patriarca (filhos = formas do slide em z-order). */
  root?: OAShape;
  /** Forma de fundo (FSP com fBackground) — propriedades de preenchimento do fundo. */
  background?: OAShape;
}

/** OfficeArtDgContainer → desenho. */
export function readDgContainer(rec: Rec): OADrawing {
  const d: OADrawing = {};
  for (const c of children(rec)) {
    if (c.type === OA.SpgrContainer && !d.root) d.root = readSpgrContainer(c);
    else if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      if (s.flags & FSP.background) d.background = s;
    }
  }
  return d;
}

// ───────────────────────────── imagens (BLIP) ─────────────────────────────

/** Imagem extraída de um BLIP. */
export interface Blip {
  /** Extensão do arquivo de saída (png, jpeg, emf, wmf, pict, bmp, tiff). */
  ext: string;
  mime: string;
  bytes: Uint8Array;
}

/** Entrada do BStore (OfficeArtFBSE): tipo + offset no stream "Pictures". */
export interface BseEntry {
  btWin32: number;
  size: number;
  cRef: number;
  foDelay: number;
  /** Blip embutido no próprio BSE (raro no PPT; comum no Word/Excel). */
  embedded?: Rec;
}

/** OfficeArtBStoreContainer → entradas BSE (índice pib − 1). */
export function readBStore(rec: Rec): (BseEntry | undefined)[] {
  const out: (BseEntry | undefined)[] = [];
  for (const c of children(rec)) {
    if (c.type !== OA.FBSE) { out.push(undefined); continue; }
    const r = c.r;
    const o = c.start;
    const cbName = r.u8(o + 33);
    const e: BseEntry = { btWin32: r.u8(o), size: r.u32(o + 20), cRef: r.u32(o + 24), foDelay: r.u32(o + 28) };
    const embOff = o + 36 + cbName;
    if (embOff + 8 <= c.end) {
      const emb = readRec(r, embOff, c.end);
      if (emb && emb.type >= 0xf018 && emb.type <= 0xf117) e.embedded = emb;
    }
    out.push(e);
  }
  return out;
}

/** Quantos UIDs (16 bytes) o blip carrega, pela instância. */
function blipUidCount(type: number, inst: number): number {
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

/** Converte um registro de BLIP nos bytes do arquivo de imagem. */
export function decodeBlip(rec: Rec): Blip | undefined {
  const r = rec.r;
  const uids = blipUidCount(rec.type, rec.inst) * 16;
  const data = (off: number): Uint8Array => r.sub(rec.start + off, rec.end);
  switch (rec.type) {
    case OA.BlipPNG: return { ext: 'png', mime: 'image/png', bytes: data(uids + 1) };
    case OA.BlipJPEG:
    case OA.BlipJPEGCMYK: return { ext: 'jpeg', mime: 'image/jpeg', bytes: data(uids + 1) };
    case OA.BlipTIFF: return { ext: 'tiff', mime: 'image/tiff', bytes: data(uids + 1) };
    case OA.BlipDIB: return { ext: 'bmp', mime: 'image/bmp', bytes: dibToBmp(data(uids + 1)) };
    case OA.BlipEMF:
    case OA.BlipWMF:
    case OA.BlipPICT: {
      // OfficeArtMetafileHeader (34 bytes): cbSize, rcBounds, ptSize, cbSave, compression, filter
      const h = rec.start + uids;
      const cbSize = r.u32(h);
      const compression = r.u8(h + 32);
      const raw = r.sub(h + 34, rec.end);
      let bytes: Uint8Array = raw;
      if (compression === 0) {
        try { bytes = unzlibSync(raw); } catch {
          try { bytes = inflateSync(raw); } catch { return undefined; }
        }
      }
      if (cbSize > 0 && cbSize < bytes.length) bytes = bytes.subarray(0, cbSize);
      if (rec.type === OA.BlipEMF) return { ext: 'emf', mime: 'image/x-emf', bytes };
      if (rec.type === OA.BlipWMF) {
        const b = { l: r.i32(h + 4), t: r.i32(h + 8), r: r.i32(h + 12), b: r.i32(h + 16) };
        return { ext: 'wmf', mime: 'image/x-wmf', bytes: withPlaceableHeader(bytes, b) };
      }
      return { ext: 'pict', mime: 'image/pict', bytes };
    }
  }
  return undefined;
}

/** DIB (BITMAPINFOHEADER + pixels) → arquivo .bmp (prefixa BITMAPFILEHEADER). */
function dibToBmp(dib: Uint8Array): Uint8Array {
  const v = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
  const hdrSize = dib.length >= 4 ? v.getUint32(0, true) : 40;
  const bitCount = dib.length >= 16 ? v.getUint16(14, true) : 24;
  const compression = dib.length >= 20 ? v.getUint32(16, true) : 0;
  let clrUsed = dib.length >= 36 ? v.getUint32(32, true) : 0;
  if (clrUsed === 0 && bitCount <= 8) clrUsed = 1 << bitCount;
  const masks = compression === 3 && hdrSize === 40 ? 12 : 0;
  const offBits = 14 + hdrSize + masks + clrUsed * 4;
  const out = new Uint8Array(14 + dib.length);
  const ov = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d; // "BM"
  ov.setUint32(2, out.length, true);
  ov.setUint32(10, offBits, true);
  out.set(dib, 14);
  return out;
}

/** WMF do blip não tem o cabeçalho "placeable" (Aldus) — gera um a partir do rcBounds. */
function withPlaceableHeader(wmf: Uint8Array, b: Rect): Uint8Array {
  const out = new Uint8Array(22 + wmf.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x9ac6cdd7, true);
  v.setInt16(6, b.l, true); v.setInt16(8, b.t, true); v.setInt16(10, b.r, true); v.setInt16(12, b.b, true);
  v.setUint16(14, 1440, true); // unidades por polegada (rcBounds em twips? aproximação comum)
  let sum = 0;
  for (let i = 0; i < 10; i++) sum ^= v.getUint16(i * 2, true);
  v.setUint16(20, sum, true);
  out.set(wmf, 22);
  return out;
}
