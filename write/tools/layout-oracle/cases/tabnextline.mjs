// Tabulação cujo texto seguinte não cabe na linha (sumário: título longo + tab direito com
// pontilhado + número). Modo 15: a linha quebra ANTES do tab — ele recomeça a linha seguinte
// e o pontilhado vai do início dela até a parada ("……22"); se o título passa da parada,
// idem. Tab centralizado/esquerdo cujo texto cabe até a margem fica (o texto começa no fim
// do título). Modo 14: com tab direito, o número fica na linha mesmo passando da margem
// (a linha não quebra mais); centralizado/esquerdo quebram como no 15.
import { buildDocx, p, r, docDefaults } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
export const cases = [];
for (const compat of [14, 15]) {
  let body = '';
  for (const [val, leader] of [['right', 'dot'], ['right', 'none'], ['center', 'dot'], ['left', 'dot']]) {
    const tabPos = val === 'left' ? TEXTW - 400 : val === 'center' ? TEXTW - 300 : TEXTW;
    for (const [num, gapTw] of [['22', 60], ['22', 200], ['22', -40], ['p. 22', 60], ['22', 400]]) {
      // título que termina gapTw antes da parada (negativo: passa dela), pelo recuo esquerdo
      let t = 'Viagens de Barco pelos Rios e Lagos do Interior com Paradas Longas';
      while (W(t) < tabPos - gapTw - 600) t += ' Noturnas';
      const ind = Math.max(0, Math.round(tabPos - gapTw - W(t)));
      body += p(r(t) + r('\t') + r(num), `<w:tabs><w:tab w:val="${val}" w:leader="${leader}" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${ind}"/>`);
    }
  }
  cases.push({ name: `tnl-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
