// EMF com cópia de bits que mistura origem e destino (SRCAND/SRCPAINT/SRCINVERT — o desenho
// clássico de ícone com máscara, como o rótulo de pacote OLE): o PDF não representa a
// mistura, o Word rasteriza a figura inteira e o texto dela deixa de ser texto no PDF. Com
// SRCCOPY, NOTSRCCOPY, PATCOPY, WHITENESS, sem cópia de bits ou sem bitmap de origem (D puro,
// padrão XOR destino) o texto continua extraível. A figura é montada registro a registro
// (EMF mínimo: cabeçalho, fonte, cor, texto, StretchBlt/BitBlt, fim) — rótulos inventados.
// A figura fica por último (o Word grava o conteúdo dela depois do texto) e o teste é
// estrito: linha só nossa (o rótulo que o Word rasterizou) reprova.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';

const DEV = 1000; // pixels do dispositivo de referência
const MM = 264; // ≈ 96 dpi

function rec(type, body) {
  const size = 8 + body.length;
  const b = new Uint8Array(size);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, type, true); dv.setUint32(4, size, true);
  b.set(body, 8);
  return b;
}
function buf(n) { const b = new Uint8Array(n); return [b, new DataView(b.buffer)]; }

function header(nBytes, nRecords, nHandles) {
  const [b, dv] = buf(100);
  // rclBounds, rclFrame (0,01 mm)
  [0, 0, 400, 140].forEach((v, i) => dv.setInt32(i * 4, v, true));
  [0, 0, Math.round(400 * MM * 100 / DEV), Math.round(140 * MM * 100 / DEV)].forEach((v, i) => dv.setInt32(16 + i * 4, v, true));
  dv.setUint32(32, 0x464d4520, true); dv.setUint32(36, 0x10000, true);
  dv.setUint32(40, nBytes, true); dv.setUint32(44, nRecords, true);
  dv.setUint16(48, nHandles, true);
  dv.setInt32(64, DEV, true); dv.setInt32(68, DEV, true); dv.setInt32(72, MM, true); dv.setInt32(76, MM, true);
  dv.setInt32(92, MM * 1000, true); dv.setInt32(96, MM * 1000, true);
  return rec(1, b);
}
function font(ih, heightPx, face) {
  const [b, dv] = buf(4 + 92);
  dv.setUint32(0, ih, true);
  dv.setInt32(4, -heightPx, true); dv.setInt32(20, 400, true);
  for (let i = 0; i < face.length; i++) dv.setUint16(4 + 28 + i * 2, face.charCodeAt(i), true);
  return rec(82, b);
}
const u32rec = (type, ...vals) => { const [b, dv] = buf(vals.length * 4); vals.forEach((v, i) => dv.setUint32(i * 4, v, true)); return rec(type, b); };
function text(x, y, s, advPx) {
  const n = s.length, strLen = Math.ceil(n * 2 / 4) * 4;
  const [b, dv] = buf(16 + 12 + 40 + strLen + n * 4);
  [x, y - 20, x + n * advPx, y].forEach((v, i) => dv.setInt32(i * 4, v, true));
  dv.setUint32(16, 1, true); dv.setFloat32(20, 1, true); dv.setFloat32(24, 1, true);
  dv.setInt32(28, x, true); dv.setInt32(32, y, true); dv.setUint32(36, n, true);
  const offStr = 8 + 68; dv.setUint32(40, offStr, true); dv.setUint32(44, 0, true);
  [0, 0, -1, -1].forEach((v, i) => dv.setInt32(48 + i * 4, v, true));
  dv.setUint32(64, offStr + strLen, true);
  for (let i = 0; i < n; i++) dv.setUint16(68 + i * 2, s.charCodeAt(i), true);
  for (let i = 0; i < n; i++) dv.setInt32(68 + strLen + i * 4, advPx, true);
  return rec(84, b);
}
function stretchBlt(x, y, w, h, rop, rgb) {
  const bw = 8, bh = 8, row = Math.ceil(bw * 3 / 4) * 4, bits = row * bh;
  const [b, dv] = buf(100 + 40 + bits);
  [x, y, x + w, y + h].forEach((v, i) => dv.setInt32(i * 4, v, true));
  dv.setInt32(16, x, true); dv.setInt32(20, y, true); dv.setInt32(24, w, true); dv.setInt32(28, h, true);
  dv.setUint32(32, rop, true);
  dv.setFloat32(44, 1, true); dv.setFloat32(56, 1, true);
  dv.setUint32(76, 8 + 100, true); dv.setUint32(80, 40, true); dv.setUint32(84, 8 + 100 + 40, true); dv.setUint32(88, bits, true);
  dv.setInt32(92, bw, true); dv.setInt32(96, bh, true);
  const o = 100;
  dv.setUint32(o, 40, true); dv.setInt32(o + 4, bw, true); dv.setInt32(o + 8, bh, true); dv.setUint16(o + 12, 1, true); dv.setUint16(o + 14, 24, true);
  dv.setUint32(o + 20, bits, true);
  for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) { const q = o + 40 + yy * row + xx * 3; b[q] = rgb[2]; b[q + 1] = rgb[1]; b[q + 2] = rgb[0]; }
  return rec(77, b);
}
/** BITBLT sem bitmap de origem (só padrão/destino) */
function bitBlt(x, y, w, h, rop) {
  const [b, dv] = buf(92);
  [x, y, x + w, y + h].forEach((v, i) => dv.setInt32(i * 4, v, true));
  dv.setInt32(16, x, true); dv.setInt32(20, y, true); dv.setInt32(24, w, true); dv.setInt32(28, h, true);
  dv.setUint32(32, rop, true);
  dv.setFloat32(44, 1, true); dv.setFloat32(56, 1, true);
  return rec(76, b);
}
function emf(rops) {
  const body = [font(1, 18, 'Arial'), u32rec(37, 1), u32rec(24, 0), u32rec(18, 1), text(10, 120, 'Rotulo exemplo.txt', 10)];
  for (const [rop, rgb] of rops) body.push(rgb ? stretchBlt(150, 10, 80, 80, rop, rgb) : bitBlt(150, 10, 80, 80, rop));
  body.push(u32rec(14, 0, 16, 20));
  const total = 108 + body.reduce((a, x) => a + x.length, 0);
  const all = [header(total, body.length + 1, 2), ...body];
  const out = new Uint8Array(total); let pos = 0;
  for (const x of all) { out.set(x, pos); pos += x.length; }
  return out;
}
const pic = (k) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1270000" cy="444500"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${k}" name="Figura ${k}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${k}" name="Figura ${k}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1270000" cy="444500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const doc = (rops) => {
  const d = buildDocx({ body: p(r('Antes Hxg')) + p(pic(1)), defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'image1.emf': emf(rops) } });
  // o construtor só declara png/jpeg: acrescenta o tipo do .emf
  const files = unzipSync(d);
  files['[Content_Types].xml'] = strToU8(strFromU8(files['[Content_Types].xml']).replace('<Default Extension="png"', '<Default Extension="emf" ContentType="image/x-emf"/><Default Extension="png"'));
  return zipSync(files);
};
const SRCCOPY = 0x00cc0020, SRCAND = 0x008800c6, SRCINVERT = 0x00660046;
export const cases = [
  { name: 'er-sotexto', docx: doc([]) },
  { name: 'er-srccopy', docx: doc([[SRCCOPY, [40, 120, 40]]]) },
  { name: 'er-mascara', docx: doc([[SRCAND, [255, 255, 255]], [SRCINVERT, [40, 120, 40]]]) },
  { name: 'er-and', docx: doc([[SRCAND, [40, 120, 40]]]) },
  { name: 'er-or', docx: doc([[0x00ee0086, [40, 120, 40]]]) },
  { name: 'er-notcopy', docx: doc([[0x00330008, [40, 120, 40]]]) },
  { name: 'er-pat', docx: doc([[0x00f00021, [40, 120, 40]]]) },
  { name: 'er-white', docx: doc([[0x00ff0062, [40, 120, 40]]]) },
  // sem bitmap de origem: D puro (não altera nada) e padrão XOR destino
  { name: 'er-dnop', docx: doc([[0x00aa0029, null]]) },
  { name: 'er-patinvert', docx: doc([[0x005a0049, null]]) },
];
