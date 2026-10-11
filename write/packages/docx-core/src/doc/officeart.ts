/**
 * Desenhos OfficeArt ([MS-ODRAW]) do .doc: propriedades de forma (FOPT),
 * árvore de formas (SpgrContainer/SpContainer) e imagens (BStore → BSE → BLIP).
 * Adaptado de slides/packages/slides-core/src/ppt/officeart.ts (conversor .ppt):
 * no Word as âncoras vêm do PlcSpa (FSPA), não do ClientAnchor, e os BLIPs dos
 * desenhos flutuantes ficam no stream WordDocument (BSE.foDelay).
 */
import { Unzlib, Inflate } from 'fflate';
import { ByteReader, type Rec, children, OA, readRec } from './bytes.js';

/** Propriedade de forma (OfficeArtFOPTE): id de 14 bits + valor de 32 bits. */
export interface OAProp {
  id: number;
  value: number;
  complex?: Uint8Array;
  bid: boolean;
}

export interface OAShape {
  spid: number;
  /** Tipo msosptXXX (FSP.recInstance). */
  type: number;
  flags: number;
  props: Map<number, OAProp>;
  /** Âncora filha (dentro de grupo). */
  childAnchor?: { l: number; t: number; r: number; b: number };
  groupRect?: { l: number; t: number; r: number; b: number };
  children?: OAShape[];
  /** Posição na ordem de desenho do DgContainer (formas de primeiro nível). */
  z?: number;
}

export const FSP = {
  group: 0x1, child: 0x2, patriarch: 0x4, deleted: 0x8, oleShape: 0x10, haveMaster: 0x20,
  flipH: 0x40, flipV: 0x80, connector: 0x100, haveAnchor: 0x200, background: 0x400, haveSpt: 0x800,
} as const;

const MSO_ARRAY_PROPS = new Set([0x145, 0x146, 0x151, 0x152, 0x153, 0x154, 0x155, 0x156, 0x157, 0x197, 0x1cf, 0x383, 0x3a0]);

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
    const prev = into.get(prop.id);
    // propriedades booleanas (último id de cada grupo: 0x7F, 0xBF, …, 0x1BF, 0x1FF…):
    // FOPT e TertiaryFOPT da mesma forma se somam bit a bit (só valem os bits com fUse*)
    if (prev && !prop.complex && isBooleanProp(prop.id)) prop.value = mergeBooleans(prev.value, value);
    into.set(prop.id, prop);
  }
}

/** Conjunto de booleanos ([MS-ODRAW] 2.3.*.BooleanProperties): id terminado em 0x3F. */
export function isBooleanProp(id: number): boolean {
  return (id & 0x3f) === 0x3f;
}

/** Sobrepõe `over` a `base` só nos bits cujo fUse* (bit + 16) está ligado em `over`. */
export function mergeBooleans(base: number, over: number): number {
  const use = (over >>> 16) & 0xffff;
  const mask = (use | (use << 16)) >>> 0;
  return ((base & ~mask) | (over & mask)) >>> 0;
}

function readRect(r: ByteReader, o: number): { l: number; t: number; r: number; b: number } {
  return { l: r.i32(o), t: r.i32(o + 4), r: r.i32(o + 8), b: r.i32(o + 12) };
}

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
      case OA.ChildAnchor: shape.childAnchor = readRect(c.r, c.start); break;
    }
  }
  return shape;
}

const MAX_GROUP_DEPTH = 64;

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

/**
 * Indexa por spid as formas de primeiro nível (e grupos) de um DgContainer.
 * `z` = ordem no desenho (de trás para a frente), que é a ordem Z do Word.
 */
export function indexDrawing(dg: Rec, into: Map<number, OAShape>): void {
  for (const c of children(dg)) {
    if (c.type === OA.SpgrContainer) {
      const root = readSpgrContainer(c);
      for (const s of root.children ?? []) { s.z = into.size; into.set(s.spid, s); }
    } else if (c.type === OA.SpContainer) {
      const s = readSpContainer(c);
      s.z = into.size;
      into.set(s.spid, s);
    }
  }
}

/**
 * Formas com mestre (hspMaster, 0x301): herdam as propriedades que não têm
 * (booleanos bit a bit) e o mestre não é desenhado — o Word grava o mestre como
 * forma oculta no desenho (ex.: a "shapetype" do WordArt) e o omite no .docx.
 */
export function applyMasters(shapes: Map<number, OAShape>, masters: Set<number>): void {
  for (const s of shapes.values()) {
    const ref = s.props.get(0x301)?.value;
    const m = ref !== undefined ? shapes.get(ref) : undefined;
    if (!m || m === s) continue;
    masters.add(m.spid);
    if (!s.type) s.type = m.type;
    for (const [id, p] of m.props) {
      if (id === 0x301) continue;
      const own = s.props.get(id);
      if (!own) s.props.set(id, p);
      else if (isBooleanProp(id) && !own.complex) s.props.set(id, { ...own, value: mergeBooleans(p.value, own.value) });
    }
  }
}

// ───────────────────────────── imagens (BLIP) ─────────────────────────────

export interface Blip {
  ext: string;
  mime: string;
  bytes: Uint8Array;
}

export interface BseEntry {
  btWin32: number;
  size: number;
  foDelay: number;
  embedded?: Rec;
}

/** OfficeArtFBSE (registro já lido) → entrada. */
export function readFbse(c: Rec): BseEntry {
  const r = c.r;
  const o = c.start;
  const cbName = r.u8(o + 33);
  const e: BseEntry = { btWin32: r.u8(o), size: r.u32(o + 20), foDelay: r.u32(o + 28) };
  const embOff = o + 36 + cbName;
  if (embOff + 8 <= c.end) {
    const emb = readRec(r, embOff, c.end);
    if (emb && emb.type >= 0xf018 && emb.type <= 0xf117) e.embedded = emb;
  }
  return e;
}

export function readBStore(rec: Rec): (BseEntry | undefined)[] {
  return children(rec).map((c) => (c.type === OA.FBSE ? readFbse(c) : undefined));
}

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

const MAX_BLIP = 64 * 1024 * 1024;

function inflateCapped(raw: Uint8Array, zlib: boolean, max: number, budget?: { left: number }): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const limit = Math.min(max, budget ? budget.left : max);
  const s = zlib ? new Unzlib() : new Inflate();
  s.ondata = (chunk) => {
    total += chunk.length;
    if (total > limit) throw new Error('imagem descomprimida grande demais');
    chunks.push(chunk);
  };
  s.push(raw, true);
  if (budget) budget.left -= total;
  if (chunks.length === 1) return chunks[0]!;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** Registro de BLIP → bytes do arquivo de imagem. */
export function decodeBlip(rec: Rec, budget?: { left: number }): Blip | undefined {
  const r = rec.r;
  const uids = blipUidCount(rec.type, rec.inst) * 16;
  const data = (off: number): Uint8Array => r.sub(rec.start + off, rec.end).slice();
  switch (rec.type) {
    case OA.BlipPNG: return { ext: 'png', mime: 'image/png', bytes: data(uids + 1) };
    case OA.BlipJPEG:
    case OA.BlipJPEGCMYK: return { ext: 'jpeg', mime: 'image/jpeg', bytes: data(uids + 1) };
    case OA.BlipTIFF: return { ext: 'tiff', mime: 'image/tiff', bytes: data(uids + 1) };
    case OA.BlipDIB: return { ext: 'bmp', mime: 'image/bmp', bytes: dibToBmp(data(uids + 1)) };
    case OA.BlipEMF:
    case OA.BlipWMF:
    case OA.BlipPICT: {
      const h = rec.start + uids;
      const cbSize = r.u32(h);
      const compression = r.u8(h + 32);
      const raw = r.sub(h + 34, rec.end);
      let bytes: Uint8Array = raw;
      if (compression === 0) {
        try { bytes = inflateCapped(raw, true, MAX_BLIP, budget); } catch {
          try { bytes = inflateCapped(raw, false, MAX_BLIP, budget); } catch { return undefined; }
        }
      }
      bytes = cbSize > 0 && cbSize < bytes.length ? bytes.slice(0, cbSize) : bytes.slice();
      if (rec.type === OA.BlipEMF) return { ext: 'emf', mime: 'image/x-emf', bytes };
      if (rec.type === OA.BlipWMF) {
        const b = { l: r.i32(h + 4), t: r.i32(h + 8), r: r.i32(h + 12), b: r.i32(h + 16) };
        // ptSize (EMU) dá o tamanho físico: unidades lógicas por polegada do cabeçalho placeable
        const ptX = r.i32(h + 20);
        const inch = ptX > 0 && b.r > b.l ? Math.round(((b.r - b.l) * 914400) / ptX) : 1440;
        return { ext: 'wmf', mime: 'image/x-wmf', bytes: withPlaceableHeader(bytes, b, inch) };
      }
      return { ext: 'pict', mime: 'image/pict', bytes };
    }
  }
  return undefined;
}

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
  out[0] = 0x42; out[1] = 0x4d;
  ov.setUint32(2, out.length, true);
  ov.setUint32(10, offBits, true);
  out.set(dib, 14);
  return out;
}

/** WMF do blip não tem o cabeçalho "placeable" (Aldus): gera um a partir do rcBounds. */
function withPlaceableHeader(wmf: Uint8Array, b: { l: number; t: number; r: number; b: number }, inch: number): Uint8Array {
  // já tem cabeçalho placeable?
  if (wmf.length >= 4 && wmf[0] === 0xd7 && wmf[1] === 0xcd && wmf[2] === 0xc6 && wmf[3] === 0x9a) return wmf;
  const out = new Uint8Array(22 + wmf.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x9ac6cdd7, true);
  v.setInt16(6, b.l, true); v.setInt16(8, b.t, true); v.setInt16(10, b.r, true); v.setInt16(12, b.b, true);
  v.setUint16(14, Math.max(1, Math.min(0xffff, inch)), true);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum ^= v.getUint16(i * 2, true);
  v.setUint16(20, sum, true);
  out.set(wmf, 22);
  return out;
}
