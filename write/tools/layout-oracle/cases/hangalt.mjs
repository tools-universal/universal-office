// Pontuação pendurada além da margem (w:overflowPunct) com o conjunto ALTERNATIVO de
// regras de quebra do Leste Asiático (w:useAltKinsokuLineBreakRules), que só vale nos
// modos ≤ 14: as aspas de fecho e o % deixam de pendurar e o coreano fica como o
// japonês (só vírgula e ponto); o chinês mantém ) ; : ! ? ] }. No modo 15 a opção
// é ignorada (mesmos conjuntos do grupo hang15). Fonte asiática padrão do documento
// do Leste Asiático, idioma eastAsia ja/zh/ko; palavra final + pontuação com excesso
// = largura da pontuação (+ 25% dos espaços no 15 justificado) ± 10 twips.
import { buildDocx, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const defaults = (ea) => `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="MS Mincho" w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="pt-BR" w:eastAsia="${ea}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const PUN = [',', '.', ')', ';', '?', ']', '%', '”', '’'];
export const cases = [];
for (const [ea, compat, jc] of [['ja-JP', 11, 'left'], ['zh-CN', 11, 'left'], ['ko-KR', 11, 'left'], ['zh-TW', 11, 'left'], ['ko-KR', 15, 'both']]) {
  let body = '';
  for (const pc of PUN) for (const d of [-10, 10]) {
    const head = Array(12).fill('ab').join(' ') + ' ';
    const first = head + 'documento' + pc;
    const base = compat >= 15 && jc === 'both' ? 0.25 * 12 * W(' ') : 0;
    const A = Math.round(W(first) - (base + W(pc) + d));
    body += p(r(first + ' fim da linha seguinte e mais texto'), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
  }
  cases.push({ name: `ha-${ea.toLowerCase()}-c${compat}-${jc}`, docx: buildDocx({ body, compat, defaults: defaults(ea), extraCompat: '<w:useAltKinsokuLineBreakRules/>' }) });
}
