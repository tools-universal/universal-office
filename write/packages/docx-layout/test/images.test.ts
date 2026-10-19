/**
 * Decodificadores de imagem sem DOM (images.ts) e a exportação PDF com imagens
 * defeituosas: arquivos sintéticos mínimos montados aqui (sem dados de cliente).
 */
import { describe, it, expect } from 'vitest';
import { zlibSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../src/typography/index.js';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { decodeBmp, decodeGif, decodePng, decodeTiff, jpegInfo } from '../src/images.js';
import { layoutDocument, renderPdf, type FontProvider } from '../src/index.js';
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
import { buildDocx, docDefaults, p, r } from '../../../tools/layout-oracle/docx-builder.mjs';

const px = (img: { width: number; data: Uint8Array }, x: number, y: number) => Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

// ── PNG ──
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const chunk = (type: string, data: number[] | Uint8Array) => {
  const td = new Uint8Array([...type].map((c) => c.charCodeAt(0)).concat(Array.from(data)));
  return [...be32(data.length), ...td, ...be32(crc(td))];
};
const png = (w: number, h: number, depth: number, ctype: number, rows: number[][], extra: number[] = []) => {
  const raw = new Uint8Array(rows.flatMap((row) => [0, ...row]));
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [...be32(w), ...be32(h), depth, ctype, 0, 0, 0]), ...extra,
    ...chunk('IDAT', zlibSync(raw)), ...chunk('IEND', [])]);
};

// ── TIFF (little endian, uma faixa) ──
const tiff = (entries: [number, number, number[]][], pixels: number[]) => {
  // cabeçalho (8) + IFD + valores longos + pixels
  const n = entries.length;
  const ifdSize = 2 + n * 12 + 4;
  const extra: number[] = [];
  const dataOff = 8 + ifdSize;
  const ent: number[] = [];
  const le16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
  const le32 = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
  const pixOff = () => dataOff + extra.length;
  const fixups: number[] = [];
  for (const [tag, type, vals] of entries) {
    const size = (type === 3 ? 2 : 4) * vals.length;
    ent.push(...le16(tag), ...le16(type), ...le32(vals.length));
    if (tag === 273) { fixups.push(ent.length); ent.push(0, 0, 0, 0); continue; }
    if (size <= 4) {
      const v = vals.flatMap((x) => (type === 3 ? le16(x) : le32(x)));
      while (v.length < 4) v.push(0);
      ent.push(...v);
    } else {
      ent.push(...le32(dataOff + extra.length));
      extra.push(...vals.flatMap((x) => (type === 3 ? le16(x) : le32(x))));
    }
  }
  const off = pixOff();
  const head = [0x49, 0x49, 42, 0, 8, 0, 0, 0, ...le16(n)];
  const body = [...ent, 0, 0, 0, 0];
  for (const f of fixups) body.splice(f, 4, ...le32(off));
  return new Uint8Array([...head, ...body, ...extra, ...pixels]);
};

describe('decodificadores de imagem', () => {
  it('GIF com tamanho mínimo de código inválido devolve null (sem dicionário de 2^30)', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255,
      0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 30, 2, 0x44, 0x01, 0, 0x3b]);
    expect(decodeGif(gif)).toBeNull();
  });

  it('PNG cinza de 2 bits: o tRNS compara o valor CRU (sem escala)', () => {
    // 2 pixels: valores 1 e 2 (2 bits cada) → chave 1 transparente
    const img = decodePng(png(2, 1, 2, 0, [[0b01100000]], chunk('tRNS', [0, 1])))!;
    expect(px(img, 0, 0)[3]).toBe(0);
    expect(px(img, 1, 0)).toEqual([170, 170, 170, 255]);
  });

  it('PNG RGB: tRNS de 6 bytes torna a cor-chave transparente', () => {
    const img = decodePng(png(2, 1, 8, 2, [[255, 0, 0, 0, 0, 255]], chunk('tRNS', [0, 255, 0, 0, 0, 0])))!;
    expect(px(img, 0, 0)).toEqual([255, 0, 0, 0]);
    expect(px(img, 1, 0)).toEqual([0, 0, 255, 255]);
  });

  const bmp = (bpp: number, comp: number, masks: number[], pixels: number[]) => {
    const hdr = 40 + masks.length * 4;
    const off = 14 + hdr;
    const le32 = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
    const le16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
    return new Uint8Array([0x42, 0x4d, ...le32(off + pixels.length), 0, 0, 0, 0, ...le32(off),
      ...le32(40), ...le32(2), ...le32(1), ...le16(1), ...le16(bpp), ...le32(comp), ...le32(pixels.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ...masks.flatMap(le32), ...pixels]);
  };

  it('BMP de 16 bits (5-5-5) decodifica as cores', () => {
    const img = decodeBmp(bmp(16, 0, [], [0x00, 0x7c, 0x1f, 0x00]))!;
    expect(px(img, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(px(img, 1, 0)).toEqual([0, 0, 255, 255]);
  });

  it('BMP de 32 bits com BITFIELDS segue as máscaras (sem máscara de alfa: opaco)', () => {
    const img = decodeBmp(bmp(32, 3, [0x00ff0000, 0x0000ff00, 0x000000ff], [10, 20, 30, 0, 40, 50, 60, 0]))!;
    expect(px(img, 0, 0)).toEqual([30, 20, 10, 255]);
    expect(px(img, 1, 0)).toEqual([60, 50, 40, 255]);
  });

  it('TIFF YCbCr com subamostragem 2×2 vira RGB', () => {
    const t = tiff([[256, 3, [2]], [257, 3, [2]], [258, 3, [8, 8, 8]], [259, 3, [1]], [262, 3, [6]], [273, 4, [0]],
      [277, 3, [3]], [278, 3, [2]], [279, 4, [6]], [284, 3, [1]], [530, 3, [2, 2]]], [76, 76, 76, 76, 85, 255]);
    const img = decodeTiff(t)!;
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const [R, G, B, A] = px(img, x, y);
      expect(R).toBeGreaterThan(245);
      expect(G).toBeLessThan(10);
      expect(B).toBeLessThan(10);
      expect(A).toBe(255);
    }
  });

  it('TIFF de 16 bits com preditor horizontal desfaz a diferença', () => {
    const t = tiff([[256, 3, [2]], [257, 3, [1]], [258, 3, [16]], [259, 3, [1]], [262, 3, [1]], [273, 4, [0]],
      [277, 3, [1]], [278, 3, [1]], [279, 4, [4]], [284, 3, [1]], [317, 3, [2]]], [0x00, 0x10, 0x00, 0x01]);
    const img = decodeTiff(t)!;
    expect(px(img, 0, 0)[0]).toBe(0x10);
    expect(px(img, 1, 0)[0]).toBe(0x11);
  });

  it('JPEG: bytes de preenchimento 0xFF antes do marcador e SOF truncado', () => {
    expect(jpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xc0, 0, 11, 8, 0, 4, 0, 3, 3, 0, 0, 0, 0]))).toEqual({ width: 3, height: 4, components: 3, adobe: false });
    expect(jpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 4]))).toBeNull();
  });
});

describe('PDF com imagem defeituosa', () => {
  it('o decodificador que falha tira só a imagem; a exportação segue', () => {
    const bad = new Uint8Array([0x42, 0x4d, 1, 2, 3]); // "BM" truncado: o cabeçalho não cabe
    expect(() => decodeBmp(bad)).toThrow();
    const drawing = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="img1"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="img1"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    const bytes: Uint8Array = buildDocx({ body: p(drawing) + p(r('Texto')), defaults: docDefaults({ font: 'Carlito', size: 11 }), media: { 'image1.png': bad } });
    const fb = new Uint8Array(readFileSync(join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files', 'carlito-regular.ttf')));
    const font = new SfntFont(fb);
    const carlito: FontProvider = { face: (family, bold, italic) => ({ key: 'carlito', family: 'Carlito', font, bytes: fb, bold, italic }) };
    const res = layoutDocument(readFullDocument(DocxPackage.load(bytes)), carlito);
    expect(res.pages[0]!.items.some((i) => i.t === 'image')).toBe(true);
    const pdf = renderPdf(res);
    expect(new TextDecoder('latin1').decode(pdf.subarray(0, 8))).toBe('%PDF-1.7');
  });
});
