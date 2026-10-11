// Margens de cima/baixo da célula (tcMar) só numa célula da linha: as outras células
// da linha também ganham a margem (a maior da linha) ou ficam com a da tabela (0)?
// Célula da esquerda com tcMar 57 tw, da direita sem (duas linhas); a margem explícita 0
// na da direita; a margem padrão da tabela (tblCellMar) com 0 explícito numa célula.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const mar = (t, b) => `<w:tcMar>${t !== undefined ? `<w:top w:w="${t}" w:type="dxa"/>` : ''}${b !== undefined ? `<w:bottom w:w="${b}" w:type="dxa"/>` : ''}</w:tcMar>`;
const tc = (w, xml, m = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${m}</w:tcPr>${xml}</w:tc>`;
const tbl = (rows, tblMar = '') => `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/>${bd}${tblMar}</w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="5000"/></w:tblGrid>${rows.map((x) => `<w:tr>${x}</w:tr>`).join('')}</w:tbl>`;
const two = p(r('direita um Hxg')) + p(r('direita dois Hxg'));
const plain = tc(3000, p(r('seguinte Hxg'))) + tc(5000, p(r('seguinte B Hxg')));
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
export const cases = [];
cases.push({ name: 'rm-left-tb', docx: D(p(r('Antes Hxg')) + tbl([tc(3000, p(r('esquerda Hxg')), mar(57, 57)) + tc(5000, two), plain]) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-left-top', docx: D(p(r('Antes Hxg')) + tbl([tc(3000, p(r('esquerda Hxg')), mar(120)) + tc(5000, two), plain]) + p(r('Fim Hxg'))) });
cases.push({ name: 'rm-right-zero', docx: D(p(r('Antes Hxg')) + tbl([tc(3000, p(r('esquerda Hxg')), mar(120, 120)) + tc(5000, two, mar(0, 0)), plain]) + p(r('Fim Hxg'))) });
const tblMar = '<w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/></w:tblCellMar>';
cases.push({ name: 'rm-tbl-zero', docx: D(p(r('Antes Hxg')) + tbl([tc(3000, p(r('esquerda Hxg')), mar(0, 0)) + tc(5000, two), plain], tblMar) + p(r('Fim Hxg'))) });
