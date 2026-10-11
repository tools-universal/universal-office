// Quebra depois de hífen/travessão conforme o caractere SEGUINTE: o Word quebra
// depois de "-", "–" e "—" seguidos de qualquer caractere visível — letra, dígito,
// pontuação ou símbolo ("abc-_def", "abc-(def", "abc–,def"…); só não quebra antes
// de espaço (aí quebra o espaço). Cada token aparece em parágrafos com a largura
// útil crescendo dentro dele, para a 1ª linha terminar em cada ponto possível.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const SYMS = ['_', '(', '"', '.', '/', ',', ';', ':', ')', '!', '?', '%', '+', '&', '=', '#', '$', '§', '°', '«', '“', '’', "'", '[', '*', '²', '•'];
function doc(dash) {
  let body = '';
  for (const s of SYMS) {
    const tok = `abc${dash}${s}def`;
    const head = Array(20).fill('ab').join(' ') + ' ';
    const w0 = W(head), tw = W(tok);
    for (let k = 1; k <= 6; k++) {
      const A = Math.round(w0 + (tw * k) / 7) + 3;
      body += p(r(head + tok + ' fim'), `<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  return buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
}
export const cases = [
  { name: 'ds-hifen', docx: doc('-') },
  { name: 'ds-endash', docx: doc('–') },
  { name: 'ds-emdash', docx: doc('—') },
];
