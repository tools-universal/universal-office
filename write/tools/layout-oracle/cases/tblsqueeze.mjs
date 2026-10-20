// Tabela de ajuste automático cujas palavras "inquebráveis" (traços de
// sublinhado para preencher à mão, corpus t44) somam mais que a largura
// disponível: o Word estoura a margem ou parte as palavras dentro das células?
// Largura da tabela 100% (pct) × automática × em twips (abaixo, igual e acima da
// largura útil); grade gravada como no documento.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const U = (n) => '_'.repeat(n);
const GRID = [2840, 1528, 1380, 2053, 2053];
const HEAD = ['Ação / Melhoria', 'Responsável', 'Prazo', 'Necessidade de Mudança', 'Recursos'];
const ROW = [U(40), U(20), '____/____/________', U(28), U(28)];
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
const tbl = (tblW, cells = ROW, grid = GRID) => `<w:tbl><w:tblPr>${tblW}${bd}</w:tblPr><w:tblGrid>${grid.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
  + [HEAD, cells, cells].map((row) => '<w:tr>' + row.map((t) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${p(r(t))}</w:tc>`).join('') + '</w:tr>').join('')
  + '</w:tbl>';
const PCT = '<w:tblW w:w="5000" w:type="pct"/>';
const AUTO = '<w:tblW w:w="0" w:type="auto"/>';
// margens do documento (largura útil 9864 tw)
const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16841"/><w:pgMar w:top="1417" w:right="1021" w:bottom="964" w:left="1021" w:header="624" w:footer="301" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
const D = (body) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 10 }), sect });

export const cases = [
  { name: 'to-pct', docx: D(tbl(PCT)) },
  { name: 'to-auto', docx: D(tbl(AUTO)) },
  // letras em vez de traços (palavra comprida comum)
  { name: 'to-pct-letters', docx: D(tbl(PCT, ROW.map((t) => t.replace(/_/g, 'm')))) },
  // largura em twips: abaixo da útil, igual a ela e acima dela
  { name: 'to-dxa-9000', docx: D(tbl('<w:tblW w:w="9000" w:type="dxa"/>')) },
  { name: 'to-dxa-9864', docx: D(tbl('<w:tblW w:w="9864" w:type="dxa"/>')) },
  { name: 'to-dxa-12000', docx: D(tbl('<w:tblW w:w="12000" w:type="dxa"/>')) },
  // pct abaixo de 100%
  { name: 'to-pct-80', docx: D(tbl('<w:tblW w:w="4000" w:type="pct"/>')) },
  // a mesma tabela com conteúdo que CABE (controle: só a grade/autoajuste)
  { name: 'to-pct-fits', docx: D(tbl(PCT, ROW.map((t) => t.slice(0, 8)))) },
];
