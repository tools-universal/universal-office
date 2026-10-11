// Compressão do justificado × nº de espaços: n palavras "ab" + alvo; a área útil
// varia de 1 em 1 twip em volta do limiar. O Word compara as duas saídas —
// comprimir os n espaços para o alvo caber, ou mandá-lo para a linha seguinte e
// expandir os n−1 espaços que sobram — e comprime se cada espaço perde ≤ 25% E
// ≤ metade do que ganharia: excesso/n ≤ ½·folga/(n−1).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const J = '<w:jc w:val="both"/>';
export const cases = [];
for (const [font, size] of [['Arial', 11], ['Calibri', 11]]) {
  const f = prov.face(font, false, false)?.font;
  if (!f) continue;
  const w = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * size * 20) / f.metrics.unitsPerEm, 0);
  const g = w(' ');
  let body = '';
  for (const n of [4, 8, 12, 16, 24]) for (const T of ['e', 'que', 'documento']) {
    const base = n * (w('ab') + g);
    const W = w(T);
    // limiar previsto: mín(¼·n·g, solução de o/n = ½·(W+g−o)/(n−1))
    const pred = Math.min(0.25 * n * g, (0.5 * n * (W + g)) / (n - 1 + 0.5 * n));
    for (let d = -3; d <= 3; d++) {
      const A = Math.round(base + W - pred) - d;
      body += p(r(Array(n).fill('ab').join(' ') + ' ' + T + ' fim da linha seguinte'), `${J}<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  cases.push({ name: `js-${font.toLowerCase()}-${size}`, docx: buildDocx({ body, defaults: docDefaults({ font, size }) }) });
}
