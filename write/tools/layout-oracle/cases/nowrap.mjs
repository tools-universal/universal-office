// w:noWrap na célula (tabela com autoajuste): sem largura pedida em twips (tcW
// automático ou pct) a célula não quebra — a largura mínima da coluna passa a ser a do
// conteúdo numa linha só (em pct as outras colunas em pct cedem por igual); com tcW
// dxa, o texto quebra normalmente, mas o tcW vira piso da célula (nw-piso): pisos que
// não cabem no tblW levam a tabela até a largura disponível (se o tblW já passa da
// página, até a soma dos pisos); acima dela, os pisos encolhem em proporção à área de
// texto (largura − margens). Sem noWrap a tabela encolhe até o tblW. Layout fixo: ignorado.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const PH = 'abc defgh ijklmno pqrs tuv';
const fill = 'ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl';
const half = Array(6).fill('abcde fghij').join(' ');
const brd = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>';
function tbl({ tblW = '<w:tblW w:w="0" w:type="auto"/>', layout = '', tcw, texts, nowrap }) {
  let cells = '';
  for (let c = 0; c < 3; c++) cells += `<w:tc><w:tcPr>${tcw[c] ?? ''}${nowrap === c ? '<w:noWrap/>' : ''}</w:tcPr>${p(r(texts[c]))}</w:tc>`;
  return `<w:tbl><w:tblPr>${tblW}${brd}${layout}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr>${cells}</w:tr><w:tr>${cells}</w:tr></w:tbl>${p(r('Separador.'))}`;
}
const pct = (w) => `<w:tcW w:w="${w}" w:type="pct"/>`, dxa = (w) => `<w:tcW w:w="${w}" w:type="dxa"/>`;
const T100 = '<w:tblW w:w="5000" w:type="pct"/>';
const DX = [dxa(1200), dxa(4000), dxa(1200)];
const doc = (tables) => buildDocx({ body: tables.join(''), defaults: docDefaults({ font: 'Arial', size: 10 }) });
/** tblW (dxa) menor que a soma dos tcW; noWrap em todas as células ou em nenhuma */
function piso(nowrap, tblW = 8000, w3 = 6500, t2 = 'abcdefghijklmn') {
  const tc = (w, t) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${nowrap ? '<w:noWrap/>' : ''}</w:tcPr>${p(r(t))}</w:tc>`;
  const row = `<w:tr>${tc(900, 'abc')}${tc(1120, t2)}${tc(w3, PH + ' ' + PH)}</w:tr>`;
  const tw = tblW ? `<w:tblW w:w="${tblW}" w:type="dxa"/>` : '<w:tblW w:w="0" w:type="auto"/>';
  return `<w:tbl><w:tblPr>${tw}${brd}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>${row}${row}</w:tbl>${p(r('Separador.'))}`;
}
export const cases = [
  // pct: a coluna sem quebra cresce; as outras em pct cedem por igual (com controle sem noWrap)
  { name: 'nw-pct', docx: doc([
    tbl({ tblW: T100, tcw: [pct(1000), pct(3000), pct(1000)], texts: ['abc', fill, PH], nowrap: 2 }),
    tbl({ tblW: T100, tcw: [pct(1000), pct(3000), pct(1000)], texts: ['abc', fill, PH], nowrap: -1 }),
  ]) },
  // sem tcW: a mínima vira a largura sem quebrar
  { name: 'nw-auto', docx: doc([
    tbl({ tcw: [], texts: ['abc', fill, PH], nowrap: 2 }),
    tbl({ tcw: [], texts: ['abc', fill, half], nowrap: 2 }),
  ]) },
  // tcW dxa ou layout fixo: ignorado
  { name: 'nw-dxa', docx: doc([
    tbl({ tcw: DX, texts: ['abc', fill, PH], nowrap: 2 }),
    tbl({ layout: '<w:tblLayout w:type="fixed"/>', tcw: DX, texts: ['abc', fill, PH], nowrap: 2 }),
    tbl({ tcw: DX, texts: ['abc', PH, fill], nowrap: 1 }),
    tbl({ tcw: DX, texts: [PH, fill, PH], nowrap: 0 }),
  ]) },
  { name: 'nw-piso', docx: doc([piso(true), piso(false), piso(true, 0), piso(true, 8000, 6500, 'abc'), piso(true, 9000, 7500), piso(false, 9000, 7500), piso(true, 9000), piso(true, 8000, 5000)]) },
];
