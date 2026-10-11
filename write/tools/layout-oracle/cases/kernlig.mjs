// Kerning (w:kern) × ligaduras OpenType (w14:ligatures). Sem ligaduras (ou com
// "none") o Word kerneia pelos pares da fonte; com ligaduras ligadas (standard,
// standardContextual, all…) ele passa a moldar o texto como OpenType e só aplica o
// 'kern' registrado no script latino do GPOS: Tahoma e Open Sans (que só registram
// 'kern' em outros scripts) deixam de kernear; Arial e Calibri continuam.
// Linha cheia de pares (AV, Wa, To, Yo…) com a largura útil variando de 1 em 1 pt:
// a palavra final cabe ou desce conforme o kerning.
import { buildDocx, docDefaults, p, r, sz, font } from '../docx-builder.mjs';

const LINE = 'AVAVA Wave Yoyo Tatoo Value Ray Trave Yawn Travy LTA PAVA Wary ToYo AVAVA Wave Yoyo Tatoo Value';
const TEXTW = 11906 - 2 * 1701;
export const cases = [];
for (const [nm, lig] of [['sem', ''], ['std', 'standardContextual'], ['none', 'none'], ['all', 'all']]) {
  let body = '';
  for (const [f, s] of [['Tahoma', 10], ['Open Sans', 9], ['Arial', 10], ['Calibri', 11]]) {
    const ligx = lig ? `<w14:ligatures w14:val="${lig}"/>` : '';
    // largura útil de 330 a 420 pt em passos de 3 pt
    for (let w = 330; w <= 420; w += 3) {
      body += p(r(`${LINE} FIM linha seguinte`, `${font(f)}<w:kern w:val="2"/>${sz(s)}${ligx}`), `<w:spacing w:after="0"/><w:ind w:right="${TEXTW - w * 20}"/>`);
    }
  }
  cases.push({ name: `kl-${nm}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
