// Linha de tabela que quebra na página: a última linha de texto da página 1 tem
// de caber com a margem inferior da célula E a borda inferior (que fecha a parte
// de cima) — fundo da linha + margem + espessura da borda ≤ fim do corpo.
// Deslocamentos escolhidos dos dois lados do limiar de cada espessura.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

export const cases = [];
const plan = [['none', 0, 0, [80, 90]], ['b4', 4, 0, [70, 80]], ['b12', 12, 0, [30, 40]], ['b24', 24, 0, [30, 40, 230]], ['b4m60', 4, 60, [10, 20]]];
for (const [bname, bsz, mar, offs] of plan) {
  for (const off of offs) {
    const brd = bsz ? `<w:tcBorders>${['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="single" w:sz="${bsz}" w:space="0" w:color="auto"/>`).join('')}</w:tcBorders>` : '';
    const cm = mar ? `<w:tblCellMar><w:bottom w:w="${mar}" w:type="dxa"/></w:tblCellMar>` : '';
    const cell = Array.from({ length: 80 }, (_, k) => p(r(`Linha ${k + 1} Hxg`), '<w:spacing w:after="0"/>')).join('');
    const tbl = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/>${cm}</w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/>${brd}</w:tcPr>${cell}</w:tc></w:tr></w:tbl>`;
    const body = p(r('Topo Hxg'), `<w:spacing w:before="${off}" w:after="0"/>`) + tbl + p(r('Fim Hxg'));
    cases.push({ name: `rs-${bname}-${String(off).padStart(3, '0')}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
  }
}
