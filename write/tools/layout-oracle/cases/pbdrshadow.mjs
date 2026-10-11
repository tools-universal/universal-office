// Borda de parágrafo com sombra (w:shadow) e bordas só laterais: a sombra
// acrescenta espaço vertical (em cima/embaixo) mesmo sem borda superior/inferior?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const b = (side, sz, space = 0, shadow = false) => `<w:${side} w:val="single" w:sz="${sz}" w:space="${space}" w:color="auto"${shadow ? ' w:shadow="1"' : ''}/>`;
const pb = (sides) => `<w:pBdr>${sides}</w:pBdr>`;
const para = (t, bdr) => p(r(`${t} Hxg`), bdr);
export const cases = [];
for (const compat of [11, 15]) {
  const body = para('Antes', '')
    + para('Direita sombra 24', pb(b('right', 24, 0, true))) + para('Meio a', '')
    + para('Direita 24', pb(b('right', 24, 0))) + para('Meio b', '')
    + para('Esquerda sombra 12', pb(b('left', 12, 4, true))) + para('Meio c', '')
    + para('Caixa sombra 8', pb(b('top', 8, 1, true) + b('left', 8, 4, true) + b('bottom', 8, 1, true) + b('right', 8, 4, true))) + para('Meio d', '')
    + para('Base sombra 12', pb(b('bottom', 12, 1, true))) + para('Fim', '');
  cases.push({ name: `pbs-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11, after: 0 }) }) });
}
