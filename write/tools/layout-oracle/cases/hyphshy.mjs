// Hífen opcional (w:softHyphen) e limite de hífens seguidos:
//  - o hífen opcional é um ponto de hifenização (não uma quebra comum): vale a mesma
//    regra de QUANDO hifenizar (vão ≥ ~421 no modo 15) e o pedaço precisa caber com o
//    hífen; com a hifenização automática ligada, SOMA-SE aos pontos automáticos da
//    palavra inteira e não tem os mínimos de letras ("r|esponsabilidade",
//    "administraçã|o");
//  - a palavra com hífen opcional é UMA unidade na compressão do justificado;
//  - w:consecutiveHyphenLimit: no máximo N linhas seguidas terminando em hífen; linha
//    terminada no hífen da própria palavra ("guarda-|chuva") zera a contagem.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';
import { withHyphenation, shyRuns, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const doc = (body, opts, compat = 15) => withHyphenation(buildDocx({ body, sect: NARROW_SECT, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }), opts);

// "12 <palavra> fim": espaço depois de "12 " = W(prefixo até o '|' + '-') + folga —
// com o vão do modo 15 abaixo e acima de 421
const WORDS = ['r|esponsabilidade', 're|sponsabilidade', 'respo|nsabilidade', 'responsabilida|de', 'administraçã|o', 'desenvolvi|mento'];
const shyRows = (jc = 'left') => {
  let b = '';
  for (const w of WORDS) {
    const k = w.indexOf('|');
    for (const extra of [20, 60, 300]) {
      const A = W('12 ') + W(w.slice(0, k) + '-') + extra;
      b += p(r('12 ') + shyRuns(w, '', r) + r(' fim'), `<w:spacing w:after="80"/><w:jc w:val="${jc}"/><w:ind w:left="0" w:right="${NARROW_TEXTW - Math.round(A)}"/>`);
    }
  }
  return b;
};
// justificado: "ab ab … desenvolvi|mento fim" passando da margem
const shyJust = () => {
  let b = '';
  const h = Array(8).fill('ab').join(' ') + ' ';
  for (let over = 20; over <= 400; over += 30) {
    b += p(r(h) + shyRuns('desenvolvi|mento', '', r) + r(' fim fim fim fim fim'), `<w:spacing w:after="80"/><w:jc w:val="both"/><w:ind w:left="0" w:right="${NARROW_TEXTW - Math.round(W(h + 'desenvolvimento') - over)}"/>`);
  }
  return b;
};
// limite de hífens seguidos
const TXT = 'responsabilidade administração desenvolvimento extraordinariamente comunicação internacional '.repeat(3);
const SHY = 'respon|sabilidade adminis|tração desenvol|vimento extraordi|nariamente comuni|cação interna|cional '.repeat(3);
const HARD = 'guarda-chuva guarda-chuva guarda-chuva responsabilidade guarda-chuva administração guarda-chuva desenvolvimento '.repeat(2);
const lim = p(r(TXT), `<w:spacing w:after="160"/><w:ind w:left="0" w:right="${NARROW_TEXTW - 2300}"/>`)
  + p(shyRuns(SHY, '', r), `<w:spacing w:after="160"/><w:ind w:left="0" w:right="${NARROW_TEXTW - 2300}"/>`)
  + p(r(HARD), `<w:spacing w:after="160"/><w:ind w:left="0" w:right="${NARROW_TEXTW - 1500}"/>`);

export const cases = [
  { name: 'hs-auto', docx: doc(shyRows(), { zone: 1 }) },
  { name: 'hs-manual', docx: doc(shyRows(), { auto: false }) },
  { name: 'hs-manual-c14', docx: doc(shyRows(), { auto: false, zone: 360 }, 14) },
  { name: 'hs-auto-c14', docx: doc(shyRows(), { zone: 360 }, 14) },
  { name: 'hs-just', docx: doc(shyJust(), { auto: false }) },
  { name: 'hs-just-auto', docx: doc(shyJust(), {}) },
  { name: 'hs-lim0', docx: doc(lim, {}) },
  { name: 'hs-lim1', docx: doc(lim, { limit: 1 }) },
  { name: 'hs-lim2', docx: doc(lim, { limit: 2 }) },
  { name: 'hs-lim1-manual', docx: doc(lim, { auto: false, limit: 1 }) },
];
