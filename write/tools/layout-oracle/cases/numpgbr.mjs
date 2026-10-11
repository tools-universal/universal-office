// Parágrafo NUMERADO com quebra de página manual: onde o Word desenha o número?
//  - only-*: o parágrafo só tem a quebra (corpus t278: o "10." não aparece);
//  - lead-*: a quebra abre o parágrafo e o texto vem depois dela;
//  - trail-*: texto e depois a quebra.
// Modos de compatibilidade 15 e 14. Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const numbering = '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>'
  + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>'
  + '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>';
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
const BR = '<w:r><w:br w:type="page"/></w:r>';
const item = (t) => p(r(t), NUM);
const DEF = docDefaults({ font: 'Arial', size: 11 });

export const cases = [];
for (const compat of [15, 14]) {
  const add = (name, mid) => cases.push({
    name: `${name}-${compat}`,
    docx: buildDocx({ defaults: DEF, compat, numbering, body: item('Primeiro Hxg') + item('Segundo Hxg') + mid + item('Depois Hxg') + p(r('Fim Hxg')) }),
  });
  add('only', p(BR, NUM));
  add('lead', p(BR + r('Texto Hxg'), NUM));
  add('trail', p(r('Texto Hxg') + BR, NUM));
}
