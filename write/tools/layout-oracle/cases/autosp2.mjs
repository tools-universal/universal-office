// Espaçamento contextual em volta de tabelas e "depois" do último parágrafo do
// rodapé (complementa autosp): qual parágrafo da tabela conta como vizinho
// (1ª/última célula, 1º/último parágrafo), estilo diferente, espaçamento
// explícito e contextualSpacing direto só de um lado.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const AUTO = '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"/>';
const EXPL = '<w:spacing w:before="280" w:after="280" w:line="240" w:lineRule="auto"/>';
const normal = (ctx, spacing = AUTO) => `<w:pPr>${spacing}${ctx ? '<w:contextualSpacing/>' : ''}</w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr>`;
// mesmo formato do Normal, outro estilo
const OUTRO = '<w:style w:type="paragraph" w:styleId="Outro"><w:name w:val="Outro"/><w:basedOn w:val="Normal"/><w:qFormat/></w:style>';
const bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>';
/** rows: lista de linhas; cada linha, lista de células (xml de parágrafos) */
const tbl = (rows) => {
  const nc = rows[0].length;
  const w = Math.floor(6000 / nc);
  return `<w:tbl><w:tblPr><w:tblW w:w="${w * nc}" w:type="dxa"/>${bd}</w:tblPr><w:tblGrid>${`<w:gridCol w:w="${w}"/>`.repeat(nc)}</w:tblGrid>`
    + rows.map((cells) => `<w:tr>${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${c}</w:tc>`).join('')}</w:tr>`).join('') + '</w:tbl>';
};
const N = (t, ppr = '') => p(r(t), ppr);
const O = (t) => p(r(t), '<w:pStyle w:val="Outro"/>');
const CTX = '<w:contextualSpacing/>';
const antes = N('Antes Hxg');
const depois = N('Depois Hxg');

export const cases = [];
for (const [name, body, norm] of [
  // célula com OUTRO estilo: o espaço volta dos dois lados?
  ['as2-cell-other', antes + tbl([[O('Celula Hxg')]]) + depois, normal(true)],
  // duas células na linha: a 1ª (outro estilo) decide o "antes"? a última (Normal) o "depois"?
  ['as2-row-first-other', antes + tbl([[O('Uma Hxg'), N('Duas Hxg')]]) + depois, normal(true)],
  ['as2-row-last-other', antes + tbl([[N('Uma Hxg'), O('Duas Hxg')]]) + depois, normal(true)],
  // célula com dois parágrafos: o último (outro estilo) decide o "depois"?
  ['as2-cell-two', antes + tbl([[N('Uma Hxg') + O('Duas Hxg')]]) + depois, normal(true)],
  ['as2-cell-two-first-other', antes + tbl([[O('Uma Hxg') + N('Duas Hxg')]]) + depois, normal(true)],
  // duas linhas: a última linha decide o "depois"?
  ['as2-rows-last-other', antes + tbl([[N('Uma Hxg')], [O('Duas Hxg')]]) + depois, normal(true)],
  ['as2-rows-first-other', antes + tbl([[O('Uma Hxg')], [N('Duas Hxg')]]) + depois, normal(true)],
  // espaçamento explícito (14 pt) com contextual
  ['as2-explicit', antes + tbl([[N('Celula Hxg')]]) + depois, normal(true, EXPL)],
  ['as2-explicit-noctx', antes + tbl([[N('Celula Hxg')]]) + depois, normal(false, EXPL)],
  // contextual direto só no parágrafo antes / só no depois / só na célula
  ['as2-direct-prev', N('Antes Hxg', CTX) + tbl([[N('Celula Hxg')]]) + depois, normal(false)],
  ['as2-direct-next', antes + tbl([[N('Celula Hxg')]]) + N('Depois Hxg', CTX), normal(false)],
  ['as2-direct-cell', antes + tbl([[N('Celula Hxg', CTX)]]) + depois, normal(false)],
  ['as2-direct-cell-expl', antes + tbl([[N('Celula Hxg', CTX)]]) + depois, normal(false, EXPL)],
  // tabela no início do documento
  ['as2-tbl-first', tbl([[N('Celula Hxg')]]) + depois, normal(true)],
  // depois da tabela: o estilo de quem vem depois / de quem vem antes importa?
  ['as2-next-other', antes + tbl([[N('Celula Hxg')]]) + O('Depois Hxg'), normal(true)],
  ['as2-all-other', antes + tbl([[O('Celula Hxg')]]) + O('Depois Hxg'), normal(true)],
  ['as2-antes-other', O('Antes Hxg') + tbl([[N('Celula Hxg')]]) + depois, normal(true)],
  // explícito: o antes/depois DENTRO das células some entre linhas/células vizinhas?
  ['as2-expl-rows', antes + tbl([[N('Uma Hxg')], [N('Duas Hxg')]]) + depois, normal(true, EXPL)],
  ['as2-expl-cells', antes + tbl([[N('Uma Hxg'), N('Duas Hxg')]]) + depois, normal(true, EXPL)],
  ['as2-expl-cell-other', antes + tbl([[O('Celula Hxg')]]) + depois, normal(true, EXPL)],
  ['as2-expl-cell-two', antes + tbl([[N('Uma Hxg') + N('Duas Hxg')]]) + depois, normal(true, EXPL)],
]) {
  cases.push({ name, docx: buildDocx({ body, normal: norm, styles: OUTRO, defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
}
// rodapé com espaçamento automático: o "depois" do último parágrafo sobe o rodapé?
for (const [name, ftr, norm] of [
  ['as2-ftr-one', N('Rod Hxg'), normal(true)],
  ['as2-ftr-two', N('Rod 1 Hxg') + N('Rod 2 Hxg'), normal(true)],
  ['as2-ftr-two-noctx', N('Rod 1 Hxg') + N('Rod 2 Hxg'), normal(false)],
  ['as2-ftr-empty', p(''), normal(true)],
  ['as2-ftr-expl', N('Rod Hxg'), normal(true, EXPL)],
  ['as2-hdr-expl', null, normal(true, EXPL)],
  ['as2-hdr-noctx', null, normal(false)],
]) {
  const hf = ftr ? { footers: { default: ftr } } : { headers: { default: N('Cab 1 Hxg') + N('Cab 2 Hxg') } };
  cases.push({ name, docx: buildDocx({
    body: N('Corpo 1 Hxg') + N('Corpo 2 Hxg'), ...hf, normal: norm, styles: OUTRO,
    sect: sectPr({ top: 1134, bottom: 1134, header: 708, footer: 708 }), defaults: docDefaults({ font: 'Calibri', size: 11 }),
  }) });
}
