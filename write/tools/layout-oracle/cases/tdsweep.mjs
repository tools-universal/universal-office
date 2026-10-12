// Preenchimento de tab (pontos) até um tab à direita: varredura densa da posição do fim do
// texto e do tab, de 1 em 1 twip (w:spacing num caractere; posição do tab), para medir a
// quantização do 1º e do último ponto. Fontes e corpos dos sumários do corpus (Calibri 11,
// Arial 11, Arial Negrito 11 com o tab em Calibri, Times New Roman 12); texto inventado.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';

const tab = (pos) => `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${pos}"/></w:tabs>`;
const PP = (pos) => `${tab(pos)}<w:spacing w:after="0"/>`;
export const cases = [];
for (const [name, tf, tsz, df, bold] of [
  ['cal11', 'Calibri', 11, 'Calibri', false],
  ['ari11', 'Arial', 11, 'Arial', false],
  ['arb11', 'Arial', 11, 'Calibri', true],
  ['tnr12', 'Times New Roman', 12, 'Times New Roman', false],
]) {
  const tr = font(tf) + sz(tsz) + (bold ? '<w:b/>' : '');
  const dr = font(df) + sz(tsz);
  let body = '';
  // fim do texto andando de 1 em 1 twip (espaçamento no último caractere)
  for (let s = 0; s <= 72; s++) body += p(r('Item', tr) + r('x', tr + (s ? `<w:spacing w:val="${s}"/>` : '')) + r('\t', dr) + r('7', dr), PP(8000));
  // tab andando de 1 em 1 twip (texto fixo)
  for (let d = 0; d <= 72; d++) body += p(r('Item', tr) + r('x', tr) + r('\t', dr) + r('7', dr), PP(8000 + d));
  cases.push({ name: `tds-${name}`, docx: buildDocx({ body, defaults: docDefaults({ font: tf, size: tsz }) }) });
}
