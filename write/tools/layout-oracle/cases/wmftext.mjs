// Metarquivo WMF (16 bits, como a prévia de um objeto do Equation Editor 3.0) com texto:
// o Word desenha e grava o texto no PDF — fonte, corpo pela janela lógica, alinhamento
// (base/topo), o símbolo da fonte Symbol (área privada) e o traço de fração. (Os avanços
// dos glifos saem da reprodução do Word em resolução de tela — não medidos aqui.)
// Figura montada registro a registro (cabeçalho "placeable", janela, fontes, texto,
// linha) como imagem VML (w:pict) na linha, com e sem w:position. Conteúdo inventado.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';

const words = (...v) => { const b = new Uint8Array(v.length * 2); const dv = new DataView(b.buffer); v.forEach((x, i) => dv.setInt16(i * 2, x, true)); return b; };
function rec(fn, params) {
  const size = 3 + params.length / 2;
  const b = new Uint8Array(size * 2); const dv = new DataView(b.buffer);
  dv.setUint32(0, size, true); dv.setUint16(4, fn, true); b.set(params, 6);
  return b;
}
const cat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };
const str = (s) => { const n = s.length; const b = new Uint8Array(n + (n & 1)); for (let i = 0; i < n; i++) b[i] = s.charCodeAt(i); return b; };
function font(h, weight, italic, charset, face) {
  const b = new Uint8Array(50); const dv = new DataView(b.buffer);
  dv.setInt16(0, h, true); dv.setInt16(8, weight, true); b[10] = italic ? 1 : 0; b[13] = charset;
  for (let i = 0; i < face.length; i++) b[18 + i] = face.charCodeAt(i);
  return rec(0x02fb, b);
}
const extText = (x, y, s) => rec(0x0a32, cat(words(y, x, s.length, 0), str(s)));
const textOut = (x, y, s) => rec(0x0521, cat(words(s.length), str(s), words(y, x)));
const pen = () => rec(0x02fa, cat(words(0, 12, 0), new Uint8Array([0, 0, 0, 0])));
function wmf() {
  const body = [
    rec(0x020b, words(0, 0)), rec(0x020c, words(1000, 2400)), // janela 2400 × 1000
    rec(0x012e, words(24)), // TA_BASELINE
    pen(), rec(0x012d, words(0)),
    rec(0x0214, words(500, 1300)), rec(0x0213, words(500, 2200)), // traço da fração
    font(-384, 400, true, 0, 'Times New Roman'), font(-384, 400, false, 2, 'Symbol'),
    rec(0x012d, words(1)),
    extText(1450, 400, 'abc'), extText(1500, 900, 'de'), extText(60, 620, 'Q'), extText(380, 620, '='), extText(700, 620, 'Rs'),
    rec(0x012d, words(2)), extText(1100, 620, '\xb4'), // × da Symbol: área privada no PDF
    rec(0x01f0, words(1)), font(-240, 700, false, 0, 'Arial'), rec(0x012d, words(1)), rec(0x01f0, words(2)),
    rec(0x012e, words(0)), // TA_TOP | TA_LEFT
    textOut(1600, 30, 'Topo'),
  ];
  const all = cat(...body, rec(0, new Uint8Array(0)));
  const hdr = new Uint8Array(18); const hv = new DataView(hdr.buffer);
  hv.setUint16(0, 1, true); hv.setUint16(2, 9, true); hv.setUint16(4, 0x300, true);
  hv.setUint32(6, (18 + all.length) / 2, true); hv.setUint16(10, 3, true); hv.setUint32(12, 32, true);
  // cabeçalho "placeable": caixa 2400 × 1000, 2400 unidades por polegada
  const pl = new Uint8Array(22); const pv = new DataView(pl.buffer);
  pv.setUint32(0, 0x9ac6cdd7, true); pv.setInt16(10, 2400, true); pv.setInt16(12, 1000, true); pv.setUint16(14, 2400, true);
  let ck = 0; for (let i = 0; i < 20; i += 2) ck ^= pv.getUint16(i, true); pv.setUint16(20, ck, true);
  return cat(pl, hdr, all);
}
const E = 12700;
const vml = () => '<w:r><w:pict><v:shape id="_x0000_i1025" type="#_x0000_t75" style="width:72pt;height:30pt"><v:imagedata r:id="rIdImg1" o:title=""/></v:shape></w:pict></w:r>';
const doc = (pic, pos) => {
  const body = p(r('Antes da figura')) + p(r('Linha', pos ? `<w:position w:val="${pos}"/>` : '') + pic + r(' depois da figura')) + p(r('Fim do teste'));
  const d = buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'image1.wmf': wmf() } });
  // o construtor só declara png/jpeg: acrescenta o tipo do .wmf
  const files = unzipSync(d);
  files['[Content_Types].xml'] = strToU8(strFromU8(files['[Content_Types].xml']).replace('<Default Extension="png"', '<Default Extension="wmf" ContentType="image/x-wmf"/><Default Extension="png"'));
  return zipSync(files);
};
// (em DrawingML — wp:inline — o Word grava o texto da figura depois do texto da página:
// ordem não modelada; o caso do Equation Editor é VML)
export const cases = [
  { name: 'wt-vml', docx: doc(vml(), 0) },
  { name: 'wt-vml-pos', docx: doc(vml(), -12) },
];
