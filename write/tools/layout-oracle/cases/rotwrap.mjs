// Caixa de texto GIRADA com quebra quadrada: entre 45° e 135° (e 225°–315°) o texto contorna a
// caixa com largura e altura trocadas em torno do centro; fora disso, a caixa sem giro (30°).
// A caixa fica dentro do parágrafo âncora (deslocamento de 60 pt). Calibri 11.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

const defaults = docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 });
const withBox = (boxXml) => Array.from({ length: 5 }, (_, j) => p((j === 1 ? boxXml : '') + r(lorem(70, 1 + j)))).join('');
export const cases = [30, 60, 90, 120, 270].map((rot) => ({
  name: `rw-${rot}`,
  docx: buildDocx({
    body: withBox(tbx({ i: 1, x: 150, y: 60, w: 160, h: 70, rot, wrap: 'wrapSquare', relH: 'margin', relV: 'paragraph', fill: '<a:solidFill><a:schemeClr val="lt1"/></a:solidFill>', content: p(r(lorem(10, 77))) })),
    defaults,
  }),
}));
/** texto girado (90°/270°): a extração separa as linhas giradas (vlines) */
export const vlines = true;
