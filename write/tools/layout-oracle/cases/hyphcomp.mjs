// Compressão do justificado em volta de hífen/travessão. A regra do jsweep compara
// comprimir × deixar a palavra para a linha seguinte e expandir o resto; numa quebra
// SEM espaço a saída alternativa é quebrar ali mesmo:
//  - pedaço DEPOIS do hífen ("observa-|se"): nenhum vão sai da linha —
//    excesso/S ≤ ½·(W − excesso)/S, ou seja excesso ≤ W/3 (e ≤ ¼·S);
//  - pedaço que TERMINA no hífen ("E-|MAIL", "e–"): como uma palavra comum, com o
//    vão antes dela — excesso ≤ ½·S·(W+g)/(1,5·S − g).
// Linhas "ab ab … <alvo>" com a compressão necessária a 2–4% do limiar previsto.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const g = W(' ');
// [nome, texto antes do alvo (sem espaço final), alvo que precisa caber, resto, tipo]
const VARS = [
  ['depois-hifen', 'observa-', 'se', '', 'depois'],
  ['depois-endash', 'observa–', 'se', '', 'depois'],
  ['depois-hifen-longo', 'observa-', 'documento', '', 'depois'],
  ['termina-hifen', '', 'E-', 'MAIL', 'palavra'],
  ['termina-hifen-min', '', 'e-', 'mail', 'palavra'],
  ['termina-endash', '', 'E–', 'MAIL', 'palavra'],
  ['palavra', '', 'E', ' MAIL', 'palavra'],
];
let body = '';
for (const [, pre, T, rest, kind] of VARS) for (const n of [8, 16]) {
  const head = Array(n).fill('ab').join(' ') + ' ';
  const S = n * g; // espaços da linha (o vão antes de "observa-"/do alvo é o último)
  const wt = W(T);
  const thr = Math.min(0.25 * S, kind === 'depois' ? wt / 3 : (0.5 * S * (wt + g)) / (1.5 * S - g));
  for (const d of [-0.04, -0.02, 0.02, 0.04]) {
    const over = Math.max(1, thr + d * S);
    const first = head + pre + T;
    const A = Math.round(W(first) - over);
    body += p(r(first + rest + ' fim da linha seguinte e mais'), `<w:jc w:val="both"/><w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
  }
}
export const cases = [{ name: 'hc-arial', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) }];
