// Bordas de parágrafo em grupo: parágrafos seguidos com as MESMAS bordas
// formam uma caixa — topo só no 1º, base só no último, "between" entre eles.
// O espaço das bordas (space + espessura) só conta nas pontas do grupo.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const b = (side, sz = 4, space = 1) => `<w:${side} w:val="single" w:sz="${sz}" w:space="${space}" w:color="auto"/>`;
const pb = (sides) => `<w:pBdr>${sides}</w:pBdr>`;
const para = (t, bdr, extra = '') => p(r(`${t} Hxg`), bdr + extra);

export const cases = [];
{
  const BOT = pb(b('bottom', 12, 4));
  const BOX = pb(b('top', 8, 2) + b('left', 8, 4) + b('bottom', 8, 2) + b('right', 8, 4));
  const BOXB = pb(b('top', 8, 2) + b('left', 8, 4) + b('bottom', 8, 2) + b('right', 8, 4) + b('between', 4, 3));
  const body = para('Antes', '')
    + para('So base um', BOT) + para('So base dois', BOT) + para('So base tres', BOT)
    + para('Meio', '')
    + para('Caixa um', BOX) + para('Caixa dois', BOX) + para('Caixa tres', BOX)
    + para('Meio dois', '')
    + para('Entre um', BOXB) + para('Entre dois', BOXB) + para('Entre tres', BOXB)
    + para('Meio tres', '')
    // recuo diferente quebra o grupo?
    + para('Recuo um', BOX) + para('Recuo dois', BOX, '<w:ind w:left="720"/>')
    + para('Fim', '');
  for (const after of [0, 120]) {
    cases.push({ name: `pbdr-group-a${after}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after }) }) });
  }
}
