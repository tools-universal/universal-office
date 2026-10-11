// Autoajuste com célula de texto VERTICAL (w:textDirection btLr/tbRl): a largura mínima
// (e máxima) da coluna é a "altura" do conteúdo sem quebrar — cada linha ocupa 37/36 da
// sua altura, em twips inteiros — mais 6 twips e as margens da célula; não a palavra
// mais longa. Coluna 1 com tcW minúsculo e coluna 2 enorme: a 1ª fica na mínima.
// O texto vertical é feito de espaços sem quebra (a extração do PDF ignora brancos, e o
// texto girado não casaria linha a linha): na horizontal, uma "palavra" longa.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const fill = 'ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr';
const brd = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>';
function tbl(dir, w, paras, rpr = '') {
  const tcw = w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : '';
  const td = dir ? `<w:textDirection w:val="${dir}"/>` : '';
  const content = paras.map((t) => p(r(t, rpr))).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${brd}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="2400"/></w:trPr><w:tc><w:tcPr>${tcw}${td}</w:tcPr>${content}</w:tc><w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/></w:tcPr>${p(r(fill))}</w:tc></w:tr></w:tbl>${p(r('Separador.'))}`;
}
const NB = (n) => '\u00a0'.repeat(n);
const T = NB(12);
const doc = (tables) => buildDocx({ body: tables.join(''), defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [
  { name: 'tv-dir', docx: doc([
    tbl('btLr', 100, [NB(30)]),
    tbl('tbRl', 100, [NB(30)]),
    tbl('btLr', 0, [NB(30)]),
    tbl('', 100, [NB(30)]),
  ]) },
  { name: 'tv-linhas', docx: doc([8, 11, 12, 14, 20].flatMap((pt) => [1, 2, 3].map((n) => tbl('btLr', 100, Array(n).fill(T), `<w:sz w:val="${pt * 2}"/>`)))) },
];
