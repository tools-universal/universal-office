// Largura mínima (autoajuste) de parágrafo NUMERADO numa célula: a 1ª palavra começa
// depois do número e da sua tabulação (não há quebra entre eles) — a mínima conta
// essa posição + a 1ª palavra, não o recuo da 1ª linha. Tabela com soma dos tcW maior
// que a página: a coluna 1 (número + palavra curta) é interpolada entre a mínima e o tcW.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';

const fill = 'ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr st uv wx yz ab cd ef gh ij kl mn op qr';
const brd = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>';
const numbering = `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>`;
const num = (id) => (id ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr>` : '');
const tc = (w, t, n) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(t), num(n))}</w:tc>`;
const tbl = (cells) => `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${brd}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${cells.map(() => '<w:gridCol w:w="2000"/>').join('')}</w:tblGrid><w:tr>${cells.map((c) => tc(...c)).join('')}</w:tr></w:tbl>${p(r('Separador.'))}`;
export const cases = [
  { name: 'tn-primeira', docx: buildDocx({ numbering, defaults: docDefaults({ font: 'Arial', size: 11 }), body: [
    tbl([[1800, 'abcd ef', 1], [3000, fill], [5000, fill]]),
    tbl([[1800, 'abcdefg hi', 1], [3000, fill], [5000, fill]]),
    tbl([[1800, 'abcd ef', 2], [3000, fill], [5000, fill]]),
    tbl([[1800, 'abcd ef'], [3000, fill], [5000, fill]]),
  ].join('') }) },
];
