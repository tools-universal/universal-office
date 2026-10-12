// Linha de tabela partida entre páginas logo depois de um parágrafo com borda de BAIXO
// (pBdr, 1,5 pt a 1 pt do texto — a linha de assinatura): a faixa da borda fica com ele na
// página de cima (a continuação começa no 2º parágrafo, sem a faixa) e precisa caber? Um
// espaçador de altura exata deixa sobrar mais que a faixa, menos que ela e quase nada depois
// da linha. (Corpus t191: linha de assinatura no pé, nome na página seguinte.) Rótulos
// inventados; Arial 11.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const BDR = '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="auto"/></w:pBdr>';
const tbl = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/><w:tblInd w:w="1000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(r('Assinatura Hxg'), BDR)}${p(r('Nome inventado Hxg'), '<w:jc w:val="center"/>')}</w:tc></w:tr></w:tbl>`;
const D = (tw) => buildDocx({ body: p(r('Espaco Hxg'), `<w:spacing w:line="${tw}" w:lineRule="exact"/>`) + tbl + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });

// corpo: 14004 tw; linha 253 tw, faixa 50 tw
export const cases = [13600, 13700, 13720, 13748].map((tw) => ({ name: `sb-${tw}`, docx: D(tw) }));
