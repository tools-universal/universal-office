// Escritor de .doc (Word 97, [MS-DOC]) MÍNIMO para testes do conversor: um
// documento com uma peça de texto COMPRIMIDA (1 byte por caractere, cp1252),
// um CHPX e um PAPX por parágrafo, folha de estilos só com "Normal", uma fonte
// e uma seção padrão. O Word moderno grava o texto em UTF-16; este escritor
// exercita o caminho das peças comprimidas e do mapeamento 0x80-0x9F.
import { buildCfb } from './cfb-writer.js';

export interface MiniPara {
  /** Bytes do texto (cp1252), SEM a marca de parágrafo. */
  bytes: number[];
  /** grpprl do CHPX de todo o parágrafo (incluindo a marca). */
  chpx?: number[];
  /** grpprl do PAPX (sem o istd). */
  papx?: number[];
}

const u16 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff];
const u32 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
const utf16 = (s: string): number[] => [...s].flatMap((c) => u16(c.charCodeAt(0)));

/** Monta o .doc (Compound File com WordDocument + 1Table). */
export function buildMiniDoc(paras: MiniPara[], nFib = 0x00c1): Uint8Array {
  const TEXT_FC = 1024;
  const CHPX_PAGE = 4; // FKPs em páginas de 512 bytes do WordDocument
  const PAPX_PAGE = 5;
  const text: number[] = [];
  const bounds: number[] = [TEXT_FC];
  for (const p of paras) {
    text.push(...p.bytes, 0x0d);
    bounds.push(TEXT_FC + text.length);
  }
  const ccp = text.length;
  const word = new Uint8Array(512 * (PAPX_PAGE + 1));
  const wv = new DataView(word.buffer);
  // ── FibBase ──
  wv.setUint16(0, 0xa5ec, true);
  wv.setUint16(2, nFib, true);
  wv.setUint16(6, 0x0416, true);
  wv.setUint16(0x0a, 0x0200, true); // fWhichTblStm = 1Table
  wv.setUint16(32, 14, true); // csw
  wv.setUint16(62, 22, true); // cslw
  wv.setInt32(64 + 3 * 4, ccp, true); // ccpText
  wv.setInt32(64, TEXT_FC + ccp, true); // cbMac
  wv.setUint16(152, 0x5d, true); // cbRgFcLcb (Word 97)
  const RGFCLCB = 154;
  wv.setUint16(RGFCLCB + 0x5d * 8, 0, true); // cswNew
  word.set(text, TEXT_FC);
  // ── CHPX FKP: uma faixa por parágrafo ──
  const chp = CHPX_PAGE * 512;
  let off = 510;
  paras.forEach((p, i) => {
    wv.setUint32(chp + i * 4, bounds[i]!, true);
    if (p.chpx?.length) {
      off -= p.chpx.length + 1;
      off &= ~1;
      word[off + chp] = p.chpx.length;
      word.set(p.chpx, chp + off + 1);
      word[chp + (paras.length + 1) * 4 + i] = off / 2;
    }
  });
  wv.setUint32(chp + paras.length * 4, bounds[paras.length]!, true);
  word[chp + 511] = paras.length;
  // ── PAPX FKP ──
  const pap = PAPX_PAGE * 512;
  off = 510;
  paras.forEach((p, i) => {
    wv.setUint32(pap + i * 4, bounds[i]!, true);
    const grp = [...u16(0), ...(p.papx ?? [])]; // istd 0 + sprms
    const padded = grp.length % 2 === 1 ? grp : [...grp, 0];
    const cb = (padded.length + 1) / 2; // tamanho = 2*cb - 1
    const size = 1 + 2 * cb - 1;
    off -= size + 1;
    off &= ~1;
    word[pap + off] = cb;
    word.set(padded.slice(0, 2 * cb - 1), pap + off + 1);
    word[pap + (paras.length + 1) * 4 + i * 13] = off / 2;
  });
  wv.setUint32(pap + paras.length * 4, bounds[paras.length]!, true);
  word[pap + 511] = paras.length;
  // ── stream de tabela ──
  const table: number[] = [];
  const put = (index: number, bytes: number[]): void => {
    const fc = table.length;
    table.push(...bytes);
    wv.setUint32(RGFCLCB + index * 8, fc, true);
    wv.setUint32(RGFCLCB + index * 8 + 4, bytes.length, true);
  };
  // STSH: Stshi (Stshif 18 bytes) + LPStd "Normal"
  const name = 'Normal';
  const std = [
    ...u16(0), // sti 0
    ...u16(1 | (0x0fff << 4)), // stk parágrafo, istdBase nenhum
    ...u16(2 | (0 << 4)), // cupx 2, istdNext 0
    ...u16(0), ...u16(0), // bchUpe, grfstd
    ...u16(name.length), ...utf16(name), ...u16(0),
    ...u16(2), ...u16(0), // UPX papx: istd 0
    ...u16(0), // UPX chpx vazio
  ];
  put(1, [...u16(18), ...u16(1), ...u16(10), ...u16(1), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u16(std.length), ...std]);
  // SttbfFfn: uma fonte
  const ffnName = 'Times New Roman';
  const ffn = [0x16, ...u16(400), 0, 0, ...new Array(10).fill(0), ...new Array(24).fill(0), ...utf16(ffnName), ...u16(0)];
  put(15, [...u16(1), ...u16(0), ffn.length, ...ffn]);
  // PlcfSed: uma seção com SEP padrão
  put(6, [...u32(0), ...u32(ccp), ...u16(0), ...u32(0xffffffff), ...u16(0), ...u32(0)]);
  // PlcBteChpx / PlcBtePapx
  put(12, [...u32(TEXT_FC), ...u32(TEXT_FC + ccp), ...u32(CHPX_PAGE)]);
  put(13, [...u32(TEXT_FC), ...u32(TEXT_FC + ccp), ...u32(PAPX_PAGE)]);
  // Clx: Pcdt com uma peça comprimida (fc*2 | fCompressed)
  const pcd = [...u16(0), ...u32(((TEXT_FC * 2) | 0x40000000) >>> 0), ...u16(0)];
  const plc = [...u32(0), ...u32(ccp), ...pcd];
  put(33, [0x02, ...u32(plc.length), ...plc]);
  return buildCfb({ WordDocument: word, '1Table': new Uint8Array(table) });
}
