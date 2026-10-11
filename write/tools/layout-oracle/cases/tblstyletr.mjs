// trPr vindo do ESTILO da tabela: cantSplit para todas as linhas e tblHeader na
// condicional de 1ª linha — o Word repete o cabeçalho e não parte as linhas.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const styles = `<w:style w:type="table" w:customStyle="1" w:styleId="TabEstilo"><w:name w:val="Tab Estilo"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:trPr><w:cantSplit/></w:trPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr><w:trPr><w:tblHeader/></w:trPr></w:tblStylePr></w:style>`;
const rows = (n) => Array.from({ length: n }, (_, k) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r(`Linha ${k + 1}`))}</w:tc><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${p(r(lorem(18 + (k % 4) * 12, k + 1)))}</w:tc></w:tr>`).join('');
const tbl = (look) => `<w:tbl><w:tblPr><w:tblStyle w:val="TabEstilo"/><w:tblW w:w="8000" w:type="dxa"/><w:tblLook w:val="${look}" w:firstRow="${look === '04A0' ? 1 : 0}" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="6000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r('Sigla'))}</w:tc><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${p(r('Definicao Hxg'))}</w:tc></w:tr>` + rows(40) + '</w:tbl>';
const defaults = docDefaults({ font: 'Arial', size: 10 });
const intro = Array.from({ length: 8 }, (_, k) => p(r(`Introducao ${k + 1} Hxg`))).join('');
export const cases = [
  { name: 'tst-header-cant', docx: buildDocx({ body: intro + tbl('04A0') + p(r('Fim Hxg')), styles, defaults }) },
  { name: 'tst-nofirstrow', docx: buildDocx({ body: intro + tbl('0400') + p(r('Fim Hxg')), styles, defaults }) },
];
