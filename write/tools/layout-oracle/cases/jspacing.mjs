// Compressão do justificado com espaçamento entre caracteres (w:spacing) e versalete: o
// espaço comprime sobre a largura do glifo ou também sobre o espaçamento? E o versalete?
// n palavras "ab" + alvo, a área útil varre em volta dos limiares previstos (jsweep: ≤ 25%
// dos espaços e ≤ metade do que ganhariam). Arial 11; textos inventados.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const J = '<w:jc w:val="both"/>';
const font = 'Arial', size = 11;
const f = prov.face(font, false, false)?.font;
export const cases = [];
if (f) {
  for (const [S, caps] of [[20, false], [40, false], [-10, false], [0, true], [12, true]]) {
    // versalete: minúsculas (e o espaço) no corpo reduzido, em maiúsculas
    const sc = Math.round(size * 2 * 0.8) / 2;
    const w = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId((caps ? ch.toUpperCase() : ch).codePointAt(0))) * (caps ? sc : size) * 20) / f.metrics.unitsPerEm + S, 0);
    const g = w(' ');
    let body = '';
    for (const n of [8, 16]) for (const T of ['e', 'documento']) {
      const base = n * (w('ab') + g);
      const W = w(T);
      // limiar com o espaço inteiro (g) e só com o glifo (g − S)
      const pred = (sp) => Math.min(0.25 * n * sp, (0.5 * n * (W + g)) / (n - 1 + 0.5 * n));
      const a = pred(g), b = pred(g - S);
      const lo = caps ? 0 : Math.min(a, b) - 8, hi = Math.max(a, b) + 8;
      const step = Math.max(2, (hi - lo) / 14);
      for (let o = lo; o <= hi + 1e-6; o += step) {
        const A = Math.round(base + W - o);
        body += p(r(Array(n).fill('ab').join(' ') + ' ' + T + ' fim da linha seguinte', `${caps ? '<w:smallCaps/>' : ''}${S ? `<w:spacing w:val="${S}"/>` : ''}`), `${J}<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
      }
    }
    cases.push({ name: `jsp-${caps ? 'caps' : ''}${S < 0 ? 'm' : ''}${Math.abs(S)}`, docx: buildDocx({ body, defaults: docDefaults({ font, size }) }) });
  }
}
