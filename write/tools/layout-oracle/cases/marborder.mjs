// Margem de célula superior/inferior × espessura da borda horizontal: a borda é
// somada à margem ou fica dentro dela? Variando de quem é a borda da divisa (só a
// de baixo da célula de cima, só a de cima da de baixo, as duas) e margens
// simétricas/assimétricas.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const B = (side, sz) => (sz ? `<w:${side} w:val="single" w:sz="${sz}" w:space="0" w:color="000000"/>` : `<w:${side} w:val="nil"/>`);
const row = (mt, mb, bt, bb) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:tcBorders>${B('top', bt)}${B('left', 8)}${B('bottom', bb)}${B('right', 8)}</w:tcBorders><w:tcMar><w:top w:w="${mt}" w:type="dxa"/><w:bottom w:w="${mb}" w:type="dxa"/></w:tcMar></w:tcPr>${p(r('Linha da tabela Hxg'))}</w:tc></w:tr>`;
const tbl = (mt, mb, bt, bb) => `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>${row(mt, mb, bt, bb).repeat(6)}</w:tbl>`;
const defaults = docDefaults({ font: 'Arial', size: 10 });
export const cases = [];
const add = (name, mt, mb, bt, bb) => cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + tbl(mt, mb, bt, bb) + p(r('Depois Hxg')), defaults }) });
// só a borda de BAIXO de cada célula (como nos formulários)
for (const mar of [0, 40, 100]) for (const sz of [4, 8, 24]) add(`mb-m${mar}-b${sz}`, mar, mar, 0, sz);
// só a borda de CIMA de cada célula
for (const sz of [8, 24]) add(`mb-top-m100-b${sz}`, 100, 100, sz, 0);
// as duas
for (const sz of [8, 24]) add(`mb-both-m100-b${sz}`, 100, 100, sz, sz);
// margens assimétricas, borda de baixo
add('mb-t0-b100-b24', 0, 100, 0, 24);
add('mb-t100-b0-b24', 100, 0, 0, 24);
add('mb-t0-b100-top24', 0, 100, 24, 0);
add('mb-t100-b0-top24', 100, 0, 24, 0);
