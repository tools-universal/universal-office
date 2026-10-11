// Quebra de página no fim do parágrafo com w:splitPgBreakAndParaMark (compat): a
// marca de parágrafo vai para a página seguinte como linha vazia? Modos 11/14/15.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const pb = '<w:r><w:br w:type="page"/></w:r>';
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const compat of [11, 14, 15]) for (const split of [false, true]) {
  const extra = split ? '<w:splitPgBreakAndParaMark/>' : '';
  const tag = `c${compat}${split ? '-split' : ''}`;
  cases.push({ name: `pbm-alone-${tag}`, docx: buildDocx({ body: p(r('Primeira Hxg')) + p(pb) + p(r('Segunda pagina Hxg')) + p(r('Mais Hxg')), defaults, compat, extraCompat: extra }) });
  cases.push({ name: `pbm-end-${tag}`, docx: buildDocx({ body: p(r('Primeira Hxg') + pb) + p(r('Segunda pagina Hxg')) + p(r('Mais Hxg')), defaults, compat, extraCompat: extra }) });
}
