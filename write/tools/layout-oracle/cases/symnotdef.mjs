// w:sym com fonte COMUM (Arial, Times…: sem o código F0xx no cmap): o Word não mapeia em
// 0x00xx como faz com fonte de símbolo — desenha o glifo ausente (.notdef) da CALIBRI,
// qualquer que seja a fonte do run ou do tema, e avança ainda um espaço da Calibri depois
// dele (no PDF: o código privado no ToUnicode + um espaço). Cada parágrafo: texto + símbolo
// + palavras; a área útil faz a última palavra caber só se o símbolo medir .notdef + espaço
// da Calibri (± 25 twips). Fonte de símbolo (Wingdings) para referência: o próprio glifo.
import { buildDocx, p, r, sz, docDefaults } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const cal = prov.face('Calibri', false, false).font;
const tw = (f, pt) => (gid) => (f.advanceWidth(gid) * pt * 20) / f.metrics.unitsPerEm;
export const cases = [];
let body = '';
for (const [runFont, symFont, code, pt] of [['Arial', 'Arial', 'F0A0', 11], ['Arial', 'Times New Roman', 'F041', 11], ['Tahoma', 'Arial', 'F0F0', 16], ['Times New Roman', 'Wingdings', 'F0A7', 11]]) {
  const f = prov.face(runFont, false, false).font;
  const W = (t) => [...t].reduce((a, c) => a + tw(f, pt)(f.glyphId(c.codePointAt(0))), 0);
  let symW;
  if (symFont === 'Wingdings') { const wf = prov.face('Wingdings', false, false).font; symW = tw(wf, pt)(wf.glyphId(parseInt(code, 16))); }
  else symW = tw(cal, pt)(0) + tw(cal, pt)(cal.glyphId(0x20));
  const head = 'Entrada';
  const tail = ' nas tabelas de cada lago do vale';
  const rp = `<w:rFonts w:ascii="${runFont}" w:hAnsi="${runFont}" w:cs="${runFont}"/>${sz(pt)}`;
  for (const d of [-25, 25]) {
    const A = Math.round(W(head) + symW + W(tail) + d);
    body += p(r(head, rp) + `<w:r><w:rPr>${rp}</w:rPr><w:sym w:font="${symFont}" w:char="${code}"/></w:r>` + r(tail + ' segue abaixo', rp), `<w:ind w:right="${TEXTW - A}"/>`);
  }
}
cases.push({ name: 'sn-arial', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
