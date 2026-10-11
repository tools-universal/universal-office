// Limiar exato do pé do corpo: a última linha cabe se o fundo dela não passa da
// margem inferior (inteira, em twips) ou do topo do rodapé (altura fracionária)?
// O "antes" do 1º parágrafo (s, em twips) desloca as linhas de 1 em 1 twip para
// achar o limiar; Arial 11 (≈ 252,98 tw por linha). A4, margens 1417.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const lines = (n) => Array.from({ length: n }, (_, k) => p(r(`linha ${k + 1} Hxg`))).join('');
const D = (body, extra = {}) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), sect: sectPr(extra.sect ?? {}), ...extra });
const first = (s) => p(r('primeira Hxg'), `<w:spacing w:before="${s}"/>`);
export const cases = [];
// margem inferior: 1 + 54 linhas; corpo de 14004 tw
for (const s of [86, 87, 88, 89, 90, 91, 92, 93]) cases.push({ name: `bf-m-s${s}`, docx: D(first(s) + lines(54)) });
// rodapé de 10 linhas Arial 8 (≈ 183,98 tw cada) acima da margem: topo ≈ 14290,2 tw
const ftr10 = Array.from({ length: 10 }, (_, k) => p(r(`rodape ${k + 1} Hxg`, '<w:sz w:val="16"/>'))).join('');
for (const s of [220, 221, 222, 223, 224, 225, 226, 227, 228]) {
  cases.push({ name: `bf-f-s${s}`, docx: D(first(s) + lines(49), { footers: { default: ftr10 } }) });
}
// fração de twip: 36 linhas (36 × 252,978 = 9107,21 tw) — o fundo passa da margem por
// 0,21 tw com s = 4897 e fica 0,79 tw acima com s = 4896; com o rodapé (topo ≈ 14290,2):
// 1 + 30 linhas (31 × 252,978 = 7842,32) passam por 0,12 tw com s = 5031
for (const s of [4896, 4897]) cases.push({ name: `bf-mf-s${s}`, docx: D(first(s) + lines(35)) });
for (const s of [5030, 5031]) cases.push({ name: `bf-ff-s${s}`, docx: D(first(s) + lines(30), { footers: { default: ftr10 } }) });
// o mesmo dentro de uma célula (tabela sem bordas e sem margens de célula): a linha
// partida no corte da célula também desce com 0,21 tw além da margem?
const cell = (n) => `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${lines(n)}</w:tc></w:tr></w:tbl>`;
for (const s of [4896, 4897]) cases.push({ name: `bf-cf-s${s}`, docx: D(first(s) + cell(35) + p(r('depois Hxg'))) });
