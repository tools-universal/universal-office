// Caixas de texto VINCULADAS (wps:txbx id + wps:linkedTxbx id/seq): o texto da 1ª
// caixa continua na seguinte — com outra largura, quebra de novo; o que não cabe na
// última não aparece. Casos: duas caixas de larguras diferentes; três com sobra; a
// vinculada ANTES da 1ª no XML (como o Word grava); a seguinte em outra página;
// parágrafo partido (recuo de 1ª linha, espaço antes/depois, justificado, controle de
// linhas órfãs/viúvas); alinhamento vertical na seguinte; conteúdo que cabe na 1ª.
// Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

const paras = (n, words, pPr = '') => Array.from({ length: n }, (_, k) => p(r(lorem(words, k + 3)), pPr)).join('');
const D = (objs, after = '') => buildDocx({
  body: p(objs + r('Ancora do texto principal.')) + p(r(lorem(30, 1))) + after,
  defaults: docDefaults({ font: 'Arial', size: 11 }),
});
const PB = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const A = (o) => tbx({ i: 1, x: 90, y: 200, w: 200, h: 90, id: 1, ...o });
const B = (o) => tbx({ i: 2, x: 330, y: 200, w: 150, h: 130, link: { id: 1, seq: 1 }, ...o });
const C = (o) => tbx({ i: 3, x: 90, y: 400, w: 260, h: 60, link: { id: 1, seq: 2 }, ...o });

export const cases = [
  { name: 'lk-basic', docx: D(A({ content: paras(3, 30) }) + B()) },
  { name: 'lk-three', docx: D(A({ content: paras(6, 40) }) + B() + C()) },
  { name: 'lk-order', docx: D(B() + A({ content: paras(3, 30) })) },
  { name: 'lk-fits', docx: D(A({ content: paras(1, 12) }) + B()) },
  { name: 'lk-split', docx: D(A({ content: paras(3, 45, '<w:spacing w:before="240" w:after="240"/><w:ind w:firstLine="720"/><w:jc w:val="both"/>') }) + B()) },
  { name: 'lk-widow', docx: D(A({ content: paras(4, 26, '<w:widowControl/>'), h: 100 }) + B()) },
  { name: 'lk-nowidow', docx: D(A({ content: paras(4, 26, '<w:widowControl w:val="0"/>'), h: 100 }) + B()) },
  { name: 'lk-anchor', docx: D(A({ content: paras(3, 30) }) + B({ anchor: 'ctr', h: 200 }) ) },
  { name: 'lk-insets', docx: D(A({ content: paras(3, 30), ins: [20, 12, 4, 2] }) + B({ ins: [0, 0, 0, 0] })) },
  { name: 'lk-page', docx: D(A({ content: paras(4, 40) }), PB + p(tbx({ i: 2, x: 120, y: 150, w: 240, h: 150, link: { id: 1, seq: 1 } }) + r('Ancora na pagina dois.')) + p(r(lorem(20, 2)))) },
  { name: 'lk-keepnext', docx: D(A({ content: p(r(lorem(70, 3))) + p(r('Titulo preso ao proximo'), '<w:keepNext/>') + p(r(lorem(30, 4))) }) + B()) },
];
