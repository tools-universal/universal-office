// Compressão do justificado com espaços de LARGURAS diferentes na linha (espaço
// num corpo maior, dois ou três espaços seguidos antes da palavra-alvo). A regra do
// jsweep — comprime se cada espaço perde ≤ 25% e ≤ metade do que ganharia na
// expansão — vale em proporção à largura: excesso/S ≤ ½·folga/(S − g), com S a
// soma dos espaços da linha e g a dos espaços logo antes da palavra (que deixam de
// expandir quando ela desce). A contagem de espaços (n, n−1) erra o limiar.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s, pt = 11) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * pt * 20) / f.metrics.unitsPerEm, 0);
const J = '<w:jc w:val="both"/>';
// [nome, nº de palavras "ab", vão antes do alvo: [qtde de espaços, corpo], espaços de 22 pt no meio]
const VARS = [['ultimo22', 8, [1, 22], 0], ['ultimo33', 8, [1, 33], 0], ['duplo', 8, [2, 11], 0], ['triplo', 8, [3, 11], 0], ['meio22x4', 8, [1, 11], 4], ['meio33x2', 12, [1, 11], 2]];
export const cases = [];
for (const [nm, n, [gc, gpt], nbig] of VARS) {
  let body = '';
  for (const T of ['e', 'que', 'documento']) {
    let runs = '', S = 0;
    for (let k = 0; k < n - 1; k++) {
      runs += r('ab');
      const big = k < nbig;
      runs += r(' ', big ? sz(nm === 'meio33x2' ? 33 : 22) : '');
      S += W(' ', big ? (nm === 'meio33x2' ? 33 : 22) : 11);
    }
    runs += r('ab') + r(' '.repeat(gc), gpt !== 11 ? sz(gpt) : '') + r(T + ' fim da linha seguinte');
    const g = gc * W(' ', gpt);
    S += g;
    const nat = W('ab') * n + S + W(T);
    // limiar previsto: mín(¼·S, ½·S·(W+g)/(1,5·S − g)); de 10 twips antes a 10 depois
    // (sem os 2 twips em volta do limiar: quantização do Word)
    const thr = Math.min(0.25 * S, (0.5 * S * (W(T) + g)) / (1.5 * S - g));
    for (const d of [-10, -6, -3, 3, 6, 10]) {
      const A = Math.round(nat - thr - d);
      body += p(runs, `${J}<w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  cases.push({ name: `jm-${nm}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
