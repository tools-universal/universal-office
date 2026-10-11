// Autoajuste com espaçamento entre células (w:tblCellSpacing, bordas separadas): na
// largura das colunas cada célula conta também 2× o espaçamento — a 1ª e a última
// coluna, mais um (a borda da tabela) — somado à largura pedida (tcW) e ao conteúdo;
// as bordas laterais da própria célula, inteiras, só ao conteúdo. As divisas internas
// das caixas das células ficam na grade. Sem espaçamento, nada disso.
//  - tsp-pref: soma dos tcW maior que a largura disponível (colunas interpoladas entre
//    a mínima e a pedida);
//  - tsp-conteudo: tcW pequenos, cada coluna na largura da sua palavra.
import { buildDocx, p, r, docDefaults, font } from '../docx-builder.mjs';

const filler = ' ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef';
const bdr = (sides, sz) => `<w:tcBorders>${sides.map((s) => `<w:${s} w:val="single" w:color="999999" w:sz="${sz}" w:space="0"/>`).join('')}</w:tcBorders>`;

/** tabela automática de 2 linhas × 4 colunas */
function table({ tcw, words, sp = 0, mar = null, bd = 0, bdAll = false, fill = filler, c1 = '' }) {
  const spx = sp ? `<w:tblCellSpacing w:w="${sp}" w:type="dxa"/>` : '';
  const marx = mar ? `<w:tcMar><w:left w:w="${mar[0]}" w:type="dxa"/><w:right w:w="${mar[1]}" w:type="dxa"/></w:tcMar>` : '';
  let rows = '';
  for (let ri = 0; ri < 2; ri++) {
    let cells = '';
    for (let c = 0; c < 4; c++) {
      const b = bd ? bdr(bdAll ? ['left', 'top', 'bottom', 'right'] : c === 0 ? ['left', 'bottom', 'right'] : ['bottom', 'right'], bd) : '';
      cells += `<w:tc><w:tcPr><w:tcW w:w="${tcw[c]}" w:type="dxa"/>${b}${marx}</w:tcPr>${p(r(words[c] + fill, (c === 0 ? c1 : '') + '<w:sz w:val="20"/>'))}</w:tc>`;
    }
    rows += `<w:tr><w:trPr>${spx}</w:trPr>${cells}</w:tr>`;
  }
  // grade gravada qualquer: no autoajuste o Word a recalcula
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${spx}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${tcw.map(() => '<w:gridCol w:w="2000"/>').join('')}</w:tblGrid>${rows}</w:tbl>` + p(r('Separador.'));
}

const PREF = [2074, 2379, 2479, 2824];
const W1 = ['abcdefghijklmnopqrst', 'abcdefghijklmn', 'abcdefghijklmnopq', 'abcdefghijklmnopqrs'];
const W2 = ['abcdefghijklm', 'abcdefghijklmn', 'abcdefghijklmnopq', 'abcdefghijklmnopqrs'];
const pref = [
  table({ tcw: PREF, words: W1, mar: [180, 120] }),
  table({ tcw: PREF, words: W1, sp: 15, mar: [180, 120] }),
  table({ tcw: PREF, words: W1, sp: 15, mar: [180, 120], bd: 6 }),
  table({ tcw: PREF, words: W1, sp: 15 }),
  table({ tcw: PREF, words: W2, sp: 15, mar: [180, 120] }),
  table({ tcw: PREF, words: W2, sp: 15, mar: [180, 120], bd: 6 }),
  table({ tcw: PREF, words: W2, sp: 40, mar: [180, 120] }),
  table({ tcw: PREF, words: W2, sp: 15, mar: [180, 120], bd: 6, c1: font('Arial Narrow') }),
];
const C = [500, 500, 500, 500];
const content = [
  table({ tcw: C, words: W1, fill: '' }),
  table({ tcw: C, words: W1, fill: '', sp: 15 }),
  table({ tcw: C, words: W1, fill: '', sp: 40 }),
  table({ tcw: C, words: W1, fill: '', sp: 15, bd: 6, bdAll: true }),
  table({ tcw: C, words: W1, fill: '', sp: 40, bd: 12, bdAll: true }),
  table({ tcw: C, words: W1, fill: '', sp: 40, mar: [180, 120] }),
];
export const cases = [
  { name: 'tsp-pref', docx: buildDocx({ body: pref.join(''), defaults: docDefaults({ font: 'Arial', size: 10 }) }) },
  { name: 'tsp-conteudo', docx: buildDocx({ body: content.join(''), defaults: docDefaults({ font: 'Arial', size: 10 }) }) },
];
