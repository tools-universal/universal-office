// O pedaço hifenizado tem de caber COM o hífen (U+002D da fonte) — exato no modo 15;
// nos modos ≤ 14 também a letra seguinte ao ponto (o Word antigo procura o ponto antes
// do caractere que estoura). No justificado (modo 15) a palavra inteira decide antes
// (compressão do jsweep); depois o pedaço pode comprimir os espaços (≤ 25%) desde que
// perca no máximo metade da folga que o ponto anterior deixaria; o último ponto
// compara com a palavra descer. "responsabilidade" = res-pon-sa-bi-li-dade (modo 15),
// …-da-de nos ≤ 14.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';
import { withHyphenation, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const word = 'responsabilidade';
const row = (text, A, jc = 'left') => p(r(text), `<w:spacing w:after="80"/><w:jc w:val="${jc}"/><w:ind w:left="0" w:right="${NARROW_TEXTW - Math.round(A)}"/>`);
const doc = (body, compat = 15) => withHyphenation(buildDocx({ body, sect: NARROW_SECT, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }), { zone: 1 });

// modo 15: espaço depois de "12 " = W(prefixo + '-') ± 3 (vão ≥ 421: hifeniza)
const head = '12 ';
const x0 = W(head);
const fit15 = [3, 6, 8, 10, 12].map((k) => [-3, 3].map((d) => row(head + word + ' fim', x0 + W(word.slice(0, k) + '-') + d)).join('')).join('');
// modo 14: entre W(prefixo + '-') e W(prefixo + letra seguinte) — só a letra seguinte decide
const fit14 = [3, 6, 8, 10, 12, 14].map((k) => {
  const a = W(word.slice(0, k) + '-'), b = W(word.slice(0, k + 1));
  return [Math.max(a, b) - 3, Math.max(a, b) + 3, Math.min(a, b) + 2].map((x) => row(head + word + ' fim', x0 + x)).join('');
}).join('');
// justificado (modo 15): "<n × ab> responsabilidade fim…", a palavra passando da margem
// de "over" twips — varre as transições inteira → li → bi → sa → pon → res → desce
const just = (n) => {
  let b = '';
  const h = Array(n).fill('ab').join(' ') + ' ';
  for (let over = 100; over <= 1300; over += 40) b += row(h + word + ' fim fim fim fim fim fim fim fim', W(h + word) - over, 'both');
  return b;
};

export const cases = [
  { name: 'hf-fit15', docx: doc(fit15) },
  { name: 'hf-fit14', docx: doc(fit14, 14) },
  { name: 'hf-just8', docx: doc(just(8)) },
  { name: 'hf-just16', docx: doc(just(16)) },
  { name: 'hf-just8-c14', docx: doc(just(8), 14) },
];
