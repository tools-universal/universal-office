// Caixa de texto e forma OCULTAS (wp:docPr hidden="1", Painel de Seleção): o Word não
// as desenha nem afasta o texto (quebra Quadrado) — como a imagem oculta (pichidden).
// Caixa visível de controle ao lado. Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

const D = (objs) => buildDocx({
  body: p(objs + r(lorem(80, 1))) + p(r(lorem(60, 2))),
  defaults: docDefaults({ font: 'Arial', size: 11 }),
});
const box = (o) => tbx({ relH: 'column', relV: 'paragraph', x: 0, y: 0, w: 160, h: 80, wrap: 'wrapSquare', content: p(r('Dentro da caixa Hxg')), ...o });

export const cases = [
  { name: 'th-visible', docx: D(box({ i: 1 })) },
  { name: 'th-hidden', docx: D(box({ i: 1, hidden: true })) },
  { name: 'th-two', docx: D(box({ i: 1, hidden: true }) + box({ i: 2, x: 260, y: 40, w: 150, content: p(r('Visivel Hxg')) })) },
];
