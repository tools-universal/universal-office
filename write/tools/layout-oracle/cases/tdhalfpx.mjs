// Preenchimento de tab (pontos): a grade é absoluta, em px de 600 dpi, e as bordas do
// tab são px(quadro) + px(deslocamento) (oráculo tocdots). Quando a borda do quadro
// cai em MEIO pixel (margem esquerda ≡ 6 mod 12 twips: 1122 → 467,5 px, 1134 → 472,5,
// 1146 → 477,5…), o Word arredonda para o PAR — e o 1º ponto, colado ao fim do texto,
// aparece ou não conforme isso. Fim do texto variando de 1 em 1 twip (espaçamento do
// último caractere) em várias margens.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

export const cases = [];
for (const ml of [1122, 1134, 1146, 1158, 1135, 1701]) {
  let body = '';
  for (let s = 0; s < 30; s++) {
    body += p(r('Texto de exemplo ') + r('x', `<w:spacing w:val="${s}"/>`) + r('\t9'), '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8000"/></w:tabs><w:spacing w:after="0"/>');
  }
  cases.push({ name: `th-m${ml}`, docx: buildDocx({ body, sect: sectPr({ left: ml, right: 1134 }), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
