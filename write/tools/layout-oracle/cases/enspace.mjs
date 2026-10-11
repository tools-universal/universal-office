// Espaços "en", "em" e de quatro por em (U+2002, U+2003, U+2005): o Word os mede pela
// largura do TRAVESSÃO da própria fonte — en dash (U+2013), em dash (U+2014), em dash/4 —,
// não pelo glifo do espaço (Arial: "en" = 0,556 em; Calibri e Tahoma: "em" ≈ 0,91 em). Os
// demais (quads, três e seis por em, fino…) seguem o próprio glifo. Cada parágrafo: "Ab" + 6 espaços + "cd …" com a largura útil ajustada
// para "cd" caber (ou não) por ±8 twips com a largura que o Word usa.
// Quebra (es-quebra): só o espaço comum, o "en", o "em", o de quatro por em e o de largura
// zero (e o ideográfico, medido à parte) são oportunidade de quebra; os demais colam como letras.
import { buildDocx, p, r, docDefaults, font } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const SIZE = 11;
const FONTS = ['Arial', 'Tahoma', 'Calibri', 'Times New Roman', 'Segoe UI'];
const CPS = [0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2000, 0x2009];
export const cases = [];
for (const fam of FONTS) {
  const f = prov.face(fam, false, false).font;
  const u = f.metrics.unitsPerEm;
  const adv = (cp) => (f.advanceWidth(f.glyphId(cp)) * SIZE * 20) / u;
  // largura que o Word dá ao espaço tipográfico
  const sp = (cp) => {
    if (cp === 0x2002 || cp === 0x2003 || cp === 0x2005) return adv(cp === 0x2002 ? 0x2013 : 0x2014) * (cp === 0x2005 ? 1 / 4 : 1);
    return adv(cp);
  };
  const W = (s) => [...s].reduce((a, ch) => a + adv(ch.codePointAt(0)), 0);
  let body = '';
  for (const cp of CPS) for (const d of [-8, 8]) {
    const A = Math.round(W('Ab') + 6 * sp(cp) + W('cd') + d);
    body += p(r('Ab' + String.fromCodePoint(cp).repeat(6) + 'cd efgh ijkl mnop qrst uvwx', font(fam) + `<w:sz w:val="${SIZE * 2}"/>`),
      `<w:spacing w:after="0"/><w:ind w:right="${TEXTW - A}"/>`);
  }
  cases.push({ name: `es-${fam.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font: fam, size: SIZE }) }) });
}
{
  const ALL = [0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x200b, 0x20];
  let body = '';
  for (const cp of ALL) body += p(r('Ab' + String.fromCodePoint(cp).repeat(3) + 'cdefghijklmnopqrstuvwxyzabcdefgh'), '<w:spacing w:after="0"/><w:ind w:right="6000"/>');
  cases.push({ name: 'es-quebra', docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
}
