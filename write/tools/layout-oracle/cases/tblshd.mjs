// Sombreamento da TABELA (w:tblPr/w:shd, direto ou do estilo de tabela) × da
// CÉLULA (w:tcPr/w:shd). Tabelas sem bordas: cada preenchimento que o Word
// pinta é um caminho no PDF (objs do .word.json). Medido no Word 16.0.20430:
// o w:shd da tabela NÃO é pintado (nem direto, nem do estilo, nem em modo de
// compatibilidade 11); só o da célula (direto ou do w:tcPr do estilo).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const SHD = (f) => `<w:shd w:val="clear" w:color="auto" w:fill="${f}"/>`;
const tc = (t, shd = '') => `<w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/>${shd}</w:tcPr>${p(r(t))}</w:tc>`;
const tbl = (tblShd, cells, style = '') => `<w:tbl><w:tblPr>${style}<w:tblW w:w="6000" w:type="dxa"/>${tblShd}</w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>`
  + cells.map((c) => `<w:tr>${c}</w:tr>`).join('') + '</w:tbl>';
const STYLES = '<w:style w:type="table" w:styleId="TShd"><w:name w:val="TShd"/><w:tblPr>' + SHD('00B050') + '</w:tblPr></w:style>'
  + '<w:style w:type="table" w:styleId="TShdCell"><w:name w:val="TShdCell"/><w:tcPr>' + SHD('00B050') + '</w:tcPr></w:style>';
const D = (body, compat = 15) => buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 10 }), styles: STYLES, compat });

export const cases = [
  // linha 1 e 3 com sombreamento próprio; a 2 só herdaria o da tabela
  { name: 'ts-mixed', docx: D(tbl(SHD('002060'), [tc('linha 1', SHD('002060')), tc('linha 2'), tc('linha 3', SHD('FF0000'))])) },
  { name: 'ts-only', docx: D(tbl(SHD('00B050'), [tc('linha 1'), tc('linha 2')])) },
  { name: 'ts-only-c11', docx: D(tbl(SHD('00B050'), [tc('linha 1'), tc('linha 2')]), 11) },
  { name: 'ts-pct', docx: D(tbl('<w:shd w:val="pct25" w:color="000000" w:fill="FFFF00"/>', [tc('linha 1'), tc('linha 2', SHD('00B0F0'))])) },
  { name: 'ts-solid', docx: D(tbl('<w:shd w:val="solid" w:color="FF0000" w:fill="auto"/>', [tc('linha 1')])) },
  { name: 'ts-style', docx: D(tbl('', [tc('linha 1'), tc('linha 2')], '<w:tblStyle w:val="TShd"/>')) },
  { name: 'ts-style-cell', docx: D(tbl('', [tc('linha 1'), tc('linha 2')], '<w:tblStyle w:val="TShdCell"/>')) },
];
