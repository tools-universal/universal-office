// Preenchimento de tab (pontos): quanto o fim do texto do Word se afasta da soma exata dos
// avanços conforme o comprimento do texto. Base = glifo repetido (0, 10, 20, 40 "m"; 40 "e";
// 60 "i") + um "x" cujo w:spacing varre 0..60 twips de 1 em 1: a transição do 1º ponto
// localiza o fim do texto do Word ao twip. Fontes e corpos dos sumários do corpus; texto
// inventado.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';

const tab = (pos) => `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${pos}"/></w:tabs>`;
export const cases = [];
for (const [name, f, size, bold] of [['cal11', 'Calibri', 11, false], ['ari11', 'Arial', 11, false], ['arb11', 'Arial', 11, true], ['tnr12', 'Times New Roman', 12, false]]) {
  const rp = font(f) + sz(size) + (bold ? '<w:b/>' : '');
  let body = '';
  for (const base of ['', 'm'.repeat(10), 'm'.repeat(20), 'm'.repeat(40), 'e'.repeat(40), 'i'.repeat(60)]) {
    for (let s = 0; s <= 60; s++) body += p((base ? r(base, rp) : '') + r('x', rp + (s ? `<w:spacing w:val="${s}"/>` : '')) + r('\t', rp) + r('7', rp), `${tab(8400)}<w:spacing w:after="0"/>`);
  }
  cases.push({ name: `tds3-${name}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size }) }) });
}
