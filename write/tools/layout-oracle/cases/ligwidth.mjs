// Ligaduras OpenType (w14:ligatures) na LARGURA da linha: com elas ligadas, o Word mede o
// glifo da ligadura (GSUB 'liga' do script latino), não a soma das letras — no Calibri "tt"
// perde 73/2048 em, "ft" 50, "ti" 15, "fi" 11. Cada parágrafo tem 12 palavras com essas
// ligaduras e termina em "fim"; a área útil é a largura COM as ligaduras + 5 twips: "fim"
// só cabe se o Word as aplicar. Valores: none, standard, contextual, historical,
// discretional, standardContextual, all e sem o atributo. Entre runs também liga, mesmo com
// cor diferente no 2º run.
import { buildDocx, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const PT = 11;
const f = prov.face('Calibri', false, false).font;
const W = (t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * PT * 20) / f.metrics.unitsPerEm, 0);
// encurtamento das ligaduras do Calibri (unidades de 2048), da tabela GSUB
const LIG = { tt: 73, ft: 50, ti: 15, fi: 11 };
const ligDelta = (t) => {
  let d = 0;
  for (let i = 0; i + 1 < t.length; i++) {
    const k = t.slice(i, i + 2);
    if (LIG[k] !== undefined && !(k === 'tt' && t[i + 2] === 'i') && !(k === 'tt' && t[i + 2] === 'f')) { d += LIG[k]; i++; }
  }
  return (d * PT * 20) / f.metrics.unitsPerEm;
};
const words = 'letter often ratio fit batter loft motion fit bottle soft nation fit';
const line = words + ' fim';
const VALS = ['none', 'standard', 'contextual', 'historical', 'discretional', 'standardContextual', 'all', ''];
let body = '';
for (const v of VALS) {
  const A = Math.round(W(line) - ligDelta(line) + 5);
  const rp = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${sz(PT)}${v ? `<w14:ligatures w14:val="${v}"/>` : ''}`;
  body += p(r(line + ' linha seguinte', rp), `<w:ind w:right="${TEXTW - A}"/>`);
}
// ligadura partida entre dois runs ("let|ter", "of|ten"…): runs iguais × cor diferente no 2º
for (const color of ['', '<w:color w:val="C00000"/>']) {
  const A = Math.round(W(line) - ligDelta(line) + 5);
  const rp = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${sz(PT)}<w14:ligatures w14:val="standard"/>`;
  let runs = '';
  for (const w of words.split(' ')) {
    const m = /tt|ft|ti|fi/.exec(w);
    const cut = m ? m.index + 1 : w.length;
    runs += r(w.slice(0, cut), rp) + r(w.slice(cut) + ' ', rp + color);
  }
  body += p(runs + r('fim linha seguinte', rp), `<w:ind w:right="${TEXTW - A}"/>`);
}
const dd = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${sz(PT)}<w:lang w:val="pt-BR" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
export const cases = [{ name: 'lw-calibri', docx: buildDocx({ body, defaults: dd }) }];
