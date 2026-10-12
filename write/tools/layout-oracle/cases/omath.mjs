// equação de exibição (m:oMathPara) com fração — posições, tamanhos, traço,
// espaço em volta do "=", centralização. Cambria Math (a fonte de matemática do Word).
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const M = 'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
let kern = false;
const mr = (t, sty, sz) => `<m:r>${sty ? `<m:rPr><m:sty m:val="${sty}"/></m:rPr>` : ''}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>${kern ? '<w:kern w:val="2"/>' : ''}${sz ? `<w:sz w:val="${sz * 2}"/><w:szCs w:val="${sz * 2}"/>` : ''}</w:rPr><m:t xml:space="preserve">${t}</m:t></m:r>`;
const frac = (num, den) => `<m:f><m:fPr><m:ctrlPr><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:iCs/></w:rPr></m:ctrlPr></m:fPr><m:num>${num}</m:num><m:den>${den}</m:den></m:f>`;
const para = (inner, ppr = '') => `<w:p><w:pPr>${ppr}</w:pPr><m:oMathPara ${M}><m:oMath>${inner}</m:oMath></m:oMathPara></w:p>`;
const brRun = '<m:r><m:rPr><m:sty m:val="p"/></m:rPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:br/></m:r>';
export const cases = [];
for (const [sz, after, line, br, k] of [[11, 0, 240, false], [12, 0, 240, false], [16, 0, 240, false], [12, 160, 278, false], [12, 160, 278, true], [12, 0, 240, false, true]]) {
  kern = !!k; // w:kern no run: o Word kerneia a equação (corpus)
  let body = p(r('Linha antes da primeira equacao'));
  body += para(frac(mr('ÁREA ÚTIL', 'p', sz), mr('ÁREA TOTAL DO TERRENO', 'p', sz)) + mr('=', null, sz) + mr('TAXA DE OCUPAÇÃO', 'p', sz), '<w:jc w:val="both"/>');
  body += p(r('Linha entre as equacoes do teste'));
  body += para(frac(mr('7,5g', 'p', sz), mr('30,125g', 'p', sz)) + mr('=0,2490', null, sz) + (br ? brRun : ''), '<w:ind w:firstLine="284"/>');
  body += p(r('Linha entre as equacoes do teste'));
  body += para(frac(mr('LARGURA MAIOR AQUI', 'p', sz), mr('AB', 'p', sz)) + mr('=', null, sz) + mr('x', null, sz));
  body += p(r('Linha entre as equacoes do teste'));
  body += para(mr('a', null, sz) + mr('=', null, sz) + mr('b+c', null, sz));
  body += p(r('Linha entre as equacoes do teste'));
  body += para(mr('y', null, sz) + mr('=', null, sz) + mr('2x−1', null, sz));
  body += p(r('Linha entre as equacoes do teste'));
  body += para(frac(mr('VALOR TAXADO', 'p', sz), mr('AVALIAÇÃO', 'p', sz)) + mr('=', null, sz) + mr('LTDA YOTTA', 'p', sz));
  body += p(r('Linha depois da ultima equacao'));
  cases.push({ name: `om-${sz}${after ? '-sp' : ''}${br ? '-br' : ''}${k ? '-kern' : ''}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: sz, after, line }) }) });
}
