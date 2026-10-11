// w14:shadow (efeito de texto "sombra") aumenta a altura da linha: quanto, por corpo,
// fonte, desfoque (blurRad) e deslocamento (dist/dir)? Parágrafo de 2+ linhas com a
// sombra em todos os runs (e na marca), entre parágrafos sem efeito.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const shadow = (blurPt, distPt, dirDeg) => `<w14:shadow w14:blurRad="${Math.round(blurPt * 12700)}" w14:dist="${Math.round(distPt * 12700)}" w14:dir="${dirDeg * 60000}" w14:sx="100000" w14:sy="100000" w14:kx="0" w14:ky="0" w14:algn="tl"><w14:schemeClr w14:val="dk1"><w14:alpha w14:val="60000"/></w14:schemeClr></w14:shadow>`;
const txt = 'TEXTO DE EXEMPLO COM SOMBRA PARA QUEBRAR EM VARIAS LINHAS NO MINIMO DUAS OU TRES';
export const cases = [];
const mk = (name, font, size, sh, extra = '') => {
  const rpr = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${extra}<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>${sh}`;
  const body = p(r('Antes Hxg')) + p(r(txt, rpr), `<w:rPr>${rpr}</w:rPr>`) + p(r('Depois Hxg'));
  cases.push({ name, docx: buildDocx({ body, defaults: docDefaults({ font: 'Times New Roman', size: 12 }) }) });
};
for (const [f, font] of [['cb', 'Cambria'], ['ca', 'Calibri'], ['ar', 'Arial']]) {
  for (const size of [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]) {
    mk(`shh-${f}-${size}-b6`, font, size, shadow(6, 0, 0), f === 'cb' ? '<w:b/>' : '');
  }
}
// forma da regra (Calibri 18 e 36): desfoque × deslocamento para cima/baixo
for (const size of [18, 36]) {
  for (const [b, d, a] of [[1, 0, 0], [2, 0, 0], [4, 0, 0], [10, 0, 0], [0, 4, 90], [0, 4, 270], [2, 2, 90], [4, 2, 270], [3, 3, 0]]) {
    mk(`shh-ca-${size}-b${b}-d${d}-a${a}`, 'Calibri', size, shadow(b, d, a));
  }
}
// marca de parágrafo vazio com sombra; entrelinha múltipla/exata; run com sombra
// menor que o maior run da linha
{
  const sh = shadow(6, 0, 0);
  const rp = (size, s = sh) => `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>${s}`;
  const defaults = docDefaults({ font: 'Times New Roman', size: 12 });
  const add = (name, body) => cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), defaults }) });
  add('shh-empty-18', p('', `<w:rPr>${rp(18)}</w:rPr>`) + p(r('Meio Hxg')) + p('', `<w:rPr>${rp(18)}</w:rPr>`));
  add('shh-l259-18', p(r(txt, rp(18)), `<w:spacing w:line="259" w:lineRule="auto"/><w:rPr>${rp(18)}</w:rPr>`));
  add('shh-l360-18', p(r(txt, rp(18)), `<w:spacing w:line="360" w:lineRule="auto"/><w:rPr>${rp(18)}</w:rPr>`));
  add('shh-exact-18', p(r(txt, rp(18)), `<w:spacing w:line="480" w:lineRule="exact"/><w:rPr>${rp(18)}</w:rPr>`));
  add('shh-least-18', p(r(txt, rp(18)), `<w:spacing w:line="400" w:lineRule="atLeast"/><w:rPr>${rp(18)}</w:rPr>`));
  // linha mista: sombra em 12pt, texto comum em 18pt (marca sem sombra)
  add('shh-mix-12in18', p(r('Grande Hxg ', rp(18, '')) + r('sombra pequena Hxg ', rp(12)) + r('Grande de novo Hxg', rp(18, ''))));
  add('shh-mix-18in12', p(r('Pequeno Hxg ', rp(12, '')) + r('SOMBRA GRANDE Hxg ', rp(18)) + r('Pequeno de novo Hxg', rp(12, ''))));
}
