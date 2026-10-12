// Quando o Word hifeniza a palavra que passa da margem (em vez de descê-la inteira):
//  - modo 15, sem justificar (esquerda/centro/direita): se o VÃO que ficaria na linha
//    (do fim do conteúdo anterior, sem os espaços, até a margem) for ≥ ~421 twips —
//    w:hyphenationZone é ignorada (1, 720 dão o mesmo); espaços/tab antes contam no vão;
//  - modo 15, justificado: se a expansão dos espaços que sobrariam passar de 0,4868 da
//    largura deles (vão grande para expandir) — o vão de 420 não vale;
//  - modos ≤ 14: se o INÍCIO da palavra estiver a ≥ w:hyphenationZone da margem (os
//    espaços antes não contam);
//  - palavra que abre a linha (maior que ela) hifeniza sempre que der.
// Linhas "<cabeça> filhotinho fim" com recuo direito inteiro; o vão/espaço fica a ±5
// twips (ou ±3% da expansão) do limiar — fora da faixa de 1–3 twips em que o limiar
// medido varia com fonte e corpo.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';
import { withHyphenation, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const prov = await createNodeFontProvider();
const widthOf = (family, size) => {
  const f = prov.face(family, false, false).font;
  return (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * size * 20) / f.metrics.unitsPerEm, 0);
};
const W = widthOf('Arial', 11);
const WORD = 'filhotinho fim';
const row = (head, A, jc = 'left', runs) => p(runs ?? r(head + WORD), `<w:spacing w:after="80"/><w:jc w:val="${jc}"/><w:ind w:left="0" w:right="${NARROW_TEXTW - Math.round(A)}"/>`);
const doc = (body, opts, compat = 15, size = 11) => withHyphenation(buildDocx({ body, sect: NARROW_SECT, compat, defaults: docDefaults({ font: 'Arial', size }) }), opts);

// modo 15, sem justificar: vão = A − W(cabeça sem o espaço)
const gapRows = (jc) => {
  let b = '';
  for (const head of ['12 ', 'ab  ', 'WW ']) {
    const content = W(head.trimEnd());
    for (const gap of [300, 380, 416, 426, 470]) b += row(head, content + gap, jc);
  }
  return b;
};
// justificado: n "ab" + palavra; vão se ela descer = A − fim do último "ab"
const justRows = () => {
  let b = '';
  for (const n of [4, 8, 16]) {
    const head = Array(n).fill('ab').join(' ') + ' ';
    const sp = W(' ');
    for (const t of [0.4, 0.46, 0.52, 0.6]) b += row(head, W(head) - sp + t * (n - 1) * sp, 'both');
  }
  return b;
};
// modos ≤ 14: rem = A − x do início da palavra
const zoneRows = (zone) => {
  let b = '';
  for (const head of ['12 ', 'ab  ']) for (const d of [-40, -5, 5, 40]) b += row(head, W(head) + zone + d);
  return b;
};
// palavra maior que a linha, no início dela
const longRows = () => [900, 1300, 1700].map((w) => p(r('extraordinariamente responsabilidade desenvolvimento'), `<w:spacing w:after="80"/><w:ind w:left="0" w:right="${NARROW_TEXTW - w}"/>`)).join('');

export const cases = [
  { name: 'hz-left15', docx: doc(gapRows('left'), { zone: 1 }) },
  { name: 'hz-left15-z720', docx: doc(gapRows('left'), { zone: 720 }) },
  { name: 'hz-center15', docx: doc(gapRows('center'), {}) },
  { name: 'hz-right15', docx: doc(gapRows('right'), {}) },
  { name: 'hz-just15', docx: doc(justRows(), {}) },
  { name: 'hz-zone14-360', docx: doc(zoneRows(360), { zone: 360 }, 14) },
  { name: 'hz-zone14-720', docx: doc(zoneRows(720), { zone: 720 }, 14) },
  { name: 'hz-zone12-default', docx: doc(zoneRows(360), {}, 12) },
  { name: 'hz-long15', docx: doc(longRows(), {}) },
  { name: 'hz-long14', docx: doc(longRows(), { zone: 360 }, 14) },
];
