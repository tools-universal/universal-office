// Tab para uma parada CUSTOM à esquerda muito além da margem direita no FIM do parágrafo
// (nada depois): o tab cria uma linha a mais (desce) ou pendura como espaço? E com texto
// depois, parada pouco além da margem, parada direita além da margem. Mede pela posição
// do parágrafo seguinte. Modos 15 e 14. (corpus t15: parágrafo terminado em tab com
// parada em 13388 tw.) Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const tabs = (...ts) => `<w:tabs>${ts.map(([v, pos]) => `<w:tab w:val="${v}" w:pos="${pos}"/>`).join('')}</w:tabs>`;
const LONG = 'Texto inventado do paragrafo que ocupa a primeira linha inteira e continua um pouco Hxg';
export const cases = [];
for (const compat of [15, 14]) {
  const D = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  const add = (name, body) => cases.push({ name: `tb-${name}-c${compat}`, docx: D(body) });
  // largura do texto: 8504 tw (A4, margens 1701)
  add('end-far', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r>', tabs(['left', 747], ['left', 1506], ['left', 13388])));
  add('end-far-long', p(r(LONG + '. ') + '<w:r><w:tab/></w:r>', tabs(['left', 13388])));
  add('end-near', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r>', tabs(['left', 8800])));
  add('end-default', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r>'));
  add('end-right-far', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r>', tabs(['right', 13388])));
  add('mid-far', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r>' + r('Depois do tab'), tabs(['left', 13388])));
  // linha quase cheia: a próxima parada PADRÃO passa da margem (sem paradas custom) × custom
  const FULL = 'Texto inventado que enche quase a linha inteira ate perto da margem Hxg';
  add('end-def-full', p(r(FULL) + '<w:r><w:tab/></w:r>'));
  add('end-cust-full', p(r(FULL) + '<w:r><w:tab/></w:r>', tabs(['left', 13388])));
  add('start-far', p('<w:r><w:tab/></w:r>' + r('Depois do tab'), tabs(['left', 13388])));
  add('start-far-end', p('<w:r><w:tab/></w:r>', tabs(['left', 13388])));
  add('end-far-2tabs', p(r('Curto Hxg. ') + '<w:r><w:tab/></w:r><w:r><w:tab/></w:r>', tabs(['left', 13388])));
}
