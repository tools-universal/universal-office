/**
 * Imagens do .doc:
 *  - em linha: caractere 0x01 com sprmCPicLocation → PICFAndOfficeArtData no
 *    Data stream ([MS-DOC] 2.9.192): PICF (68 bytes: tamanho alvo, escala,
 *    corte) + [nome] + OfficeArtInlineSpContainer (SpContainer + FBSEs com o
 *    BLIP embutido);
 *  - flutuante: forma do OfficeArtDgContainer com pib → BStore → BLIP (embutido
 *    no FBSE ou no WordDocument em BSE.foDelay).
 */
import { ByteReader, OA, readRec, recsIn } from './bytes.js';
import { decodeBlip, readFbse, readSpContainer, type Blip, type OAShape } from './officeart.js';
import type { DocReader } from './reader.js';

export interface PicInfo {
  blip?: Blip;
  /** Tamanho exibido em EMU. */
  cx: number;
  cy: number;
  name?: string;
  /** Corte em frações (0..1) de cada lado. */
  crop?: { l: number; t: number; r: number; b: number };
  /** Linha horizontal (forma "HR" sem imagem): alinhamento, % da largura, cor. */
  hr?: { align: string; pct?: number; fill?: number; noshade: boolean };
}

const EMU_PER_TWIP = 635;

export function readInlinePicture(r: DocReader, fc: number): PicInfo | undefined {
  const data = r.data;
  if (!data || fc < 0 || fc + 0x44 > data.length) return undefined;
  const d = new ByteReader(data);
  const lcb = d.i32(fc);
  const cbHeader = d.u16(fc + 4);
  if (lcb < cbHeader || cbHeader < 0x44) return undefined;
  const end = Math.min(data.length, fc + lcb);
  const mm = d.i16(fc + 6);
  const dxaGoal = d.i16(fc + 28);
  const dyaGoal = d.i16(fc + 30);
  const mx = d.u16(fc + 32) || 1000;
  const my = d.u16(fc + 34) || 1000;
  const cropL = d.i16(fc + 36), cropT = d.i16(fc + 38), cropR = d.i16(fc + 40), cropB = d.i16(fc + 42);
  let o = fc + cbHeader;
  let name: string | undefined;
  if (mm === 0x66) {
    const cch = d.u8(o);
    name = '';
    for (let i = 0; i < cch; i++) name += String.fromCharCode(d.u8(o + 1 + i));
    o += 1 + cch;
  }
  const wTw = ((dxaGoal - cropL - cropR) * mx) / 1000;
  const hTw = ((dyaGoal - cropT - cropB) * my) / 1000;
  const info: PicInfo = { cx: Math.max(1, wTw) * EMU_PER_TWIP, cy: Math.max(1, hTw) * EMU_PER_TWIP, name };
  // OfficeArtInlineSpContainer: SpContainer + FBSEs
  const recs = recsIn(d, o, end);
  let shape: OAShape | undefined;
  const bses: Blip[] = [];
  for (const rec of recs) {
    if (rec.type === OA.SpContainer && !shape) shape = readSpContainer(rec);
    else if (rec.type === OA.FBSE) {
      const bse = readFbse(rec);
      let blip: Blip | undefined;
      if (bse.embedded) blip = decodeBlip(bse.embedded, r.blipBudget);
      else if (bse.foDelay && bse.foDelay !== 0xffffffff) blip = blipAt(r, r.word, bse.foDelay);
      if (blip) bses.push(blip);
    } else if (rec.type >= 0xf018 && rec.type <= 0xf117) {
      const blip = decodeBlip(rec, r.blipBudget);
      if (blip) bses.push(blip);
    }
  }
  const pib = shape?.props.get(0x104)?.value ?? 1;
  info.blip = bses[pib - 1] ?? bses[0];
  if (shape) {
    const f = (id: number): number => ((shape!.props.get(id)?.value ?? 0) | 0) / 65536;
    const c = { t: f(0x100), b: f(0x101), l: f(0x102), r: f(0x103) };
    if (c.t || c.b || c.l || c.r) info.crop = c;
  }
  if (shape && !info.blip && (shape.props.has(0x393) || shape.props.has(0x394) || shape.props.has(0x396))) {
    const pv = (k: number): number | undefined => shape!.props.get(k)?.value;
    const fill = pv(0x181);
    info.hr = {
      align: ['left', 'center', 'right'][pv(0x394) ?? 1] ?? 'center',
      pct: pv(0x393),
      fill: fill !== undefined && (fill >>> 24) === 0 ? ((fill & 0xff) << 16) | (fill & 0xff00) | ((fill >> 16) & 0xff) : undefined,
      noshade: true,
    };
  }
  if (!info.crop && dxaGoal > 0 && dyaGoal > 0 && (cropL || cropT || cropR || cropB)) {
    info.crop = { l: cropL / dxaGoal, r: cropR / dxaGoal, t: cropT / dyaGoal, b: cropB / dyaGoal };
  }
  return info;
}

/** BLIP gravado diretamente num stream (WordDocument em foDelay). */
function blipAt(r: DocReader, stream: Uint8Array, off: number): Blip | undefined {
  if (off + 8 > stream.length) return undefined;
  const rec = readRec(new ByteReader(stream), off);
  if (!rec || rec.type < 0xf018 || rec.type > 0xf117) return undefined;
  return decodeBlip(rec, r.blipBudget);
}

/** Imagem de uma forma flutuante (pib → BStore). */
export function shapeBlip(r: DocReader, shape: OAShape): Blip | undefined {
  const pib = shape.props.get(0x104);
  if (!pib || !pib.value) return undefined;
  const bse = r.bse(pib.value);
  if (!bse) return undefined;
  if (bse.embedded) return decodeBlip(bse.embedded, r.blipBudget);
  if (bse.foDelay !== 0xffffffff) return blipAt(r, r.word, bse.foDelay);
  return undefined;
}
