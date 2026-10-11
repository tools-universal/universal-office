// Tabs além da última parada / da margem direita: quebram a linha? Em
// parágrafo centralizado e à esquerda, com paradas custom (center/right) e
// a grade padrão.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const TABS = '<w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs>';
const t = (n) => '<w:r><w:tab/></w:r>'.repeat(n);
export const cases = [];
{
  let body = p(r('Inicio Hxg'));
  for (const jc of ['left', 'center', 'right', 'both']) {
    for (const n of [1, 2, 3, 4, 6]) {
      body += p(r(`${jc}${n}`) + t(n) + r('X Hxg'), `${TABS}<w:jc w:val="${jc}"/>`);
    }
    body += p(t(6) + r('Y Hxg'), `${TABS}<w:jc w:val="${jc}"/>`);
    body += p(r('sem paradas') + t(14) + r('Z Hxg'), `<w:jc w:val="${jc}"/>`);
  }
  for (const compat of [15, 14]) cases.push({ name: `tabs-overflow-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
}
// tabs que passam da borda da célula de tabela: quebram como no corpo?
{
  const cell = (inner) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
  const rows = [
    p(r('celula com texto') + '<w:r><w:tab/></w:r>'.repeat(5) + r('X Hxg')),
    p(r('______________________________') + '<w:r><w:tab/></w:r>' + r('___ Hxg')),
    p(r('custom') + '<w:r><w:tab/></w:r>'.repeat(3) + r('Y Hxg'), '<w:tabs><w:tab w:val="left" w:pos="1500"/></w:tabs>'),
  ].map((pp) => `<w:tr>${cell(pp)}</w:tr>`).join('');
  const body = p(r('Antes Hxg')) + `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>${rows}</w:tbl>` + p(r('Depois Hxg'));
  for (const compat of [15, 11]) cases.push({ name: `tabs-cell-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
}
// parada custom ALÉM da margem direita (sumário com número na margem): vale
{
  const T = '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9100"/></w:tabs>';
  const body = p(r('Inicio Hxg'))
    + p(r('1. Capitulo um') + '<w:r><w:tab/></w:r>' + r('3'), T)
    + p(r('2. Capitulo com titulo comprido Hxg') + '<w:r><w:tab/></w:r>' + r('12'), T)
    + p(r('Fim Hxg'));
  for (const compat of [15, 14]) cases.push({ name: `tabs-beyond-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
