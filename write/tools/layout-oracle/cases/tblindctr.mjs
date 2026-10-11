// Tabela CENTRALIZADA com autoajuste e recuo (tblInd): nos modos ≤ 14 o recuo não posiciona a
// tabela, mas ainda entra na largura máxima do autoajuste — negativo alarga (a tabela pode
// passar das margens), positivo estreita; no modo 15 é ignorado. (Assim o Word mostra as
// tabelas de .doc antigos: o sprmTWidthIndent fica gravado junto com a centralização.)
// Uma coluna com largura pedida maior que a área de texto e texto longo.
import { buildDocx, p, r, docDefaults, sectPr } from '../docx-builder.mjs';

const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (w, ind, jc) => `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${jc ? `<w:jc w:val="${jc}"/>` : ''}${ind ? `<w:tblInd w:w="${ind}" w:type="dxa"/>` : ''}${bd}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r('Muitas aves pousam nas margens do lago quando a tarde cai devagar e o vento leva as folhas secas para longe da trilha principal do parque'))}</w:tc></w:tr></w:tbl>` + p(r('fim'));
let body = '';
for (const [w, ind, jc] of [[10994, 0, 'center'], [10994, -892, 'center'], [10994, -400, 'center'], [12000, -892, 'center'], [10994, 300, 'center'], [10994, -892, '']]) body += tbl(w, ind, jc);
const sect = sectPr({ w: 11907, h: 16840, left: 1009, right: 1009, top: 567, bottom: 624 });
export const cases = [11, 14, 15].map((compat) => ({ name: `tic-c${compat}`, docx: buildDocx({ body, sect, compat, defaults: docDefaults({ font: 'Arial', size: 10 }) }) }));
