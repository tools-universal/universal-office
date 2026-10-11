// Kerning na FRONTEIRA de dois runs (w:kern ligado nos dois), na quebra de linha: o par
// ("A"|"V", " "|"A", "A"|" ") kerneia se a face, o corpo, o idioma e o kerning dos dois
// runs batem — cor, sublinhado e estilo de caractere diferentes não impedem; corpo,
// negrito, idioma ou kerning desligado num deles, sim. (No desenho o Word às vezes não
// aplica o par letra|espaço entre runs diferentes — a quebra o aplica.)
// Cada parágrafo repete 6 fronteiras do tipo e termina em "fim"; a área útil é a largura
// COM o kerning das fronteiras + 5 twips: "fim" só cabe se ele for aplicado (as 6
// fronteiras valem ~70 twips).
import { buildDocx, p, r, sz, docDefaults } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const PT = 10.5;
const REG = prov.face('Arial', false, false).font;
const BOLD = prov.face('Arial', true, false).font;
const adv = (f, pt, t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * pt * 20) / f.metrics.unitsPerEm, 0);
// largura de um run com o kerning dos pares internos
const runW = (f, pt, t) => { let k = 0; const cs = [...t]; for (let i = 0; i + 1 < cs.length; i++) k += f.kernTwips(cs[i].codePointAt(0), cs[i + 1].codePointAt(0), pt) ?? 0; return adv(f, pt, t) + k; };
const K = '<w:kern w:val="2"/>';
const AR = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
const base = AR + K;
// [nome, rPr do 1º run, rPr do 2º run, face/corpo do 2º]
const V = [
  ['igual', base, base, REG, PT],
  ['cor', base, base + '<w:color w:val="C00000"/>', REG, PT],
  ['estilo', base, '<w:rStyle w:val="CS1"/>' + base, REG, PT],
  ['sublinhado', base, base + '<w:u w:val="single"/>', REG, PT],
  ['corpo', base, base + sz(11), REG, 11],
  ['negrito', base, base + '<w:b/>', BOLD, PT],
  ['idioma', base, base + '<w:lang w:val="en-US"/>', REG, PT],
  ['semkern', AR, base, REG, PT],
];
// tipos de fronteira: [texto do 1º run, texto do 2º run, par na fronteira]
const T = [['xo ', 'Ao ', ' A'], ['xA', ' xo ', 'A '], ['xA', 'Vo ', 'AV']];
function body() {
  let b = '';
  for (const [, a, c, f2, pt2] of V) for (const [t1, t2, pair] of T) {
    const unit = runW(REG, PT, t1) + runW(f2, pt2, t2);
    const kb = REG.kernTwips(pair.codePointAt(0), pair.codePointAt(1), PT) ?? 0;
    let runs = '';
    for (let i = 0; i < 6; i++) runs += r(t1, a) + r(t2, c);
    const natural = 6 * unit + runW(REG, PT, 'fim');
    const A = Math.round(natural + 6 * kb + 5);
    runs += r('fim', a) + r(' linha seguinte', a);
    b += p(runs, `<w:ind w:right="${TEXTW - A}"/>`);
  }
  return b;
}
const styles = '<w:style w:type="character" w:customStyle="1" w:styleId="CS1"><w:name w:val="cs1"/></w:style>';
export const cases = [{ name: 'kr-arial', docx: buildDocx({ body: body(), styles, defaults: docDefaults({ font: 'Arial', size: PT }) }) }];
