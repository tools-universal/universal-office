// Preenchimento de tab (pontos): onde começa o 1º ponto em função do fim EXATO do texto.
// (a) sem texto antes do tab: o fim é o recuo esquerdo, varrido de 1 em 1 twip;
// (b) texto de um só glifo repetido (n = 1..40) colado à margem: o fim é n × avanço, para
// medir a largura que o Word usa (por glifo arredondada ou não). Fontes e corpos dos
// sumários do corpus; texto inventado.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';

const tab = (pos) => `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${pos}"/></w:tabs>`;
export const cases = [];
for (const [name, f, size, bold] of [['cal11', 'Calibri', 11, false], ['ari11', 'Arial', 11, false], ['arb11', 'Arial', 11, true], ['tnr12', 'Times New Roman', 12, false]]) {
  const rp = font(f) + sz(size) + (bold ? '<w:b/>' : '');
  let body = '';
  for (let s = 0; s <= 80; s++) body += p(r('\t', rp) + r('7', rp), `${tab(8000)}<w:spacing w:after="0"/><w:ind w:left="${s}"/>`);
  for (const ch of ['i', 'm', 'e']) for (let n = 1; n <= 40; n++) body += p(r(ch.repeat(n), rp) + r('\t', rp) + r('7', rp), `${tab(8000)}<w:spacing w:after="0"/>`);
  cases.push({ name: `tds2-${name}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size }) }) });
}
