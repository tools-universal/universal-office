import { describe, expect, it } from 'vitest';
import { recolorMetafile, metafileReadsDest, symbolToUnicode, isWmf, isEmf } from '../src/metafile.js';

/**
 * Regras do tocador de metarquivos medidas no app de referência (corpus em
 * E:\UniversalSlidesTest, fora do git). Só as partes puras (sem canvas).
 */

/** WMF "placeable" mínimo com os registros dados (cada um: função + palavras de parâmetro). */
function wmf(records: [number, number[]][]): Uint8Array {
  const words: number[] = [];
  for (const [fn, params] of records) {
    const size = 3 + params.length;
    words.push(size & 0xffff, size >>> 16, fn, ...params);
  }
  words.push(3, 0, 0); // EOF
  const b = new Uint8Array(22 + 18 + words.length * 2);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, 0x9ac6cdd7, true);
  dv.setInt16(10, 1000, true); dv.setInt16(12, 1000, true); dv.setUint16(14, 1440, true);
  dv.setUint16(22, 1, true); dv.setUint16(24, 9, true); dv.setUint16(26, 0x300, true);
  words.forEach((w, i) => dv.setUint16(40 + i * 2, w, true));
  return b;
}
const cref = (v: number): number[] => [v & 0xffff, v >>> 16];

/** EMF mínimo: cabeçalho + registros (tipo, palavras de 32 bits) + EOF. */
function emf(records: [number, number[]][]): Uint8Array {
  const body: number[][] = records.map(([t, p]) => [t, 8 + p.length * 4, ...p]);
  body.push([14, 20, 0, 16, 20]);
  const size = 108 + body.reduce((s, r) => s + r.length * 4, 0);
  const b = new Uint8Array(size);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, 1, true); dv.setUint32(4, 108, true);
  dv.setInt32(32, 1000, true); dv.setInt32(36, 1000, true); // quadro 10 × 10 mm
  dv.setUint32(40, 0x464d4520, true); dv.setUint32(48, size, true);
  dv.setInt32(72, 1000, true); dv.setInt32(76, 1000, true); dv.setInt32(80, 100, true); dv.setInt32(84, 100, true);
  let o = 108;
  for (const r of body) for (const v of r) { dv.setUint32(o, v >>> 0, true); o += 4; }
  return b;
}

describe('recolorir imagem do PowerPoint 97 (RecolorInfoAtom → recolorMetafile)', () => {
  it('WMF: troca texto, caneta e pincel; mantém o byte PALETTERGB', () => {
    const src = wmf([
      [0x0209, cref(0x02000000)], // SETTEXTCOLOR PALETTERGB(0,0,0)
      [0x02fa, [0, 0, 0, ...cref(0x00000000)]], // CREATEPENINDIRECT preto
      [0x02fc, [0, ...cref(0x00ffffff), 0]], // CREATEBRUSHINDIRECT branco
    ]);
    expect(isWmf(src)).toBe(true);
    const out = recolorMetafile(src, new Map([[0x000000, 0xffffff], [0xffffff, 0x0000ff]]))!;
    const dv = new DataView(out.buffer, out.byteOffset);
    expect(dv.getUint32(40 + 6, true)).toBe(0x02ffffff);
    expect(dv.getUint32(40 + 10 + 6 + 6, true)).toBe(0x00ffffff);
    expect(dv.getUint32(40 + 10 + 16 + 6 + 2, true)).toBe(0x000000ff);
    expect(src[46]).toBe(0); // original intacto
  });
  it('EMF: CREATEBRUSHINDIRECT e SETBKCOLOR; nada a trocar → undefined', () => {
    const src = emf([[39, [1, 0, 0x00123456, 0]], [25, [0x00123456]]]);
    expect(isEmf(src)).toBe(true);
    const out = recolorMetafile(src, new Map([[0x123456, 0x00ff00]]))!;
    const dv = new DataView(out.buffer, out.byteOffset);
    expect(dv.getUint32(108 + 16, true)).toBe(0x00ff00);
    expect(dv.getUint32(108 + 24 + 8, true)).toBe(0x00ff00);
    expect(recolorMetafile(src, new Map([[0xabcdef, 0]]))).toBeUndefined();
  });
});

describe('fundo do raster', () => {
  it('PATINVERT (pincel XOR destino) rasteriza sobre branco; PATCOPY não', () => {
    expect(metafileReadsDest(wmf([[0x061d, [...cref(0x005a0049), 10, 10, 0, 0]]]))).toBe(true);
    expect(metafileReadsDest(wmf([[0x061d, [...cref(0x00f00021), 10, 10, 0, 0]]]))).toBe(false);
  });
});

describe('fonte Symbol', () => {
  it('peças de delimitadores do Equation Editor', () => {
    expect([0xe6, 0xe8, 0xf6, 0xf8, 0xe9, 0xec].map(symbolToUnicode)).toEqual([0x239b, 0x239d, 0x239e, 0x23a0, 0x23a1, 0x23a7]);
  });
});
