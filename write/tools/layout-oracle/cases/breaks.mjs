// Quebras manuais: w:br no meio e no FIM do parágrafo (linha vazia da marca),
// justificação da linha que termina em quebra (doNotExpandShiftReturn) e
// quebra de página/coluna no fim do parágrafo.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const br = (type) => `<w:r><w:br${type ? ` w:type="${type}"` : ''}/></w:r>`;
const J = '<w:jc w:val="both"/>';

export const cases = [];
{
  const body = p(r('Antes Hxg'))
    + p(r(lorem(25, 3)) + br() + r(lorem(30, 4)), J)
    + p(r('Termina com quebra Hxg') + br())
    + p(r('Seguinte Hxg'))
    + p(r('Duas quebras no fim Hxg') + br() + br())
    + p(r('Depois das duas Hxg'))
    + p(r(lorem(18, 5)) + br(), J)
    + p(r('Fim Hxg'));
  cases.push({ name: 'br-line', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after: 160 }) }) });
  cases.push({ name: 'br-line-noexpand', docx: buildDocx({ body, settings: '', compat: 15, defaults: docDefaults({ font: 'Arial', size: 11, after: 160 }), extraCompat: '<w:doNotExpandShiftReturn/>' }) });
}
{
  const body = p(r('Pagina um Hxg'))
    + p(r('Termina com quebra de pagina Hxg') + br('page'))
    + p(r('Paragrafo seguinte Hxg'))
    + p(br('page'))
    + p(r('Depois de paragrafo so com quebra Hxg'))
    + p(r('Texto') + br('page') + r('continua na outra Hxg'))
    + p(r('Fim Hxg'));
  cases.push({ name: 'br-page', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after: 160 }) }) });
}
