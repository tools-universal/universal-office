// Pontuação pendurada além da margem (w:overflowPunct, ligada por padrão) com layout
// asiático — fonte asiática padrão do documento (docDefaults) do Leste Asiático e
// idioma eastAsia do texto ja/zh/ko:
//  - modo 15: só no JUSTIFICADO, somando-se aos 25% de compressão dos espaços
//    (alinhado à esquerda não pendura); modo 11: também à esquerda;
//  - o conjunto depende do idioma: japonês só "," "." "”" "’"; chinês e coreano
//    também ")" ";" ":" "!" "?" "]" "}" (e "%", menos o chinês tradicional).
// Palavra final + pontuação com excesso = (25% dos espaços, no 15) + largura da
// pontuação ± 10 twips.
import { buildDocx, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const defaults = (ea, eaFont) => `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"${eaFont ? ` w:eastAsia="${eaFont}"` : ''} w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="pt-BR" w:eastAsia="${ea}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const PUN = [',', '.', ')', ';', '?', ']', '%', '”', '.)'];
export const cases = [];
for (const [ea, eaFont, compat, jc] of [['ja-JP', 'MS Mincho', 15, 'both'], ['zh-CN', 'MS Mincho', 15, 'both'], ['ko-KR', 'MS Mincho', 15, 'both'], ['zh-TW', 'MS Mincho', 15, 'both'],
  ['ja-JP', 'MS Mincho', 11, 'left'], ['zh-CN', 'MS Mincho', 11, 'left'], ['zh-CN', 'MS Mincho', 15, 'left'], ['zh-CN', '', 15, 'both'], ['pt-BR', 'MS Mincho', 15, 'both']]) {
  let body = '';
  for (const pc of PUN) for (const d of [-10, 10]) {
    const head = Array(12).fill('ab').join(' ') + ' ';
    const first = head + 'documento' + pc;
    const base = compat >= 15 && jc === 'both' ? 0.25 * 12 * W(' ') : 0;
    const over = base + W(pc.slice(-1)) + d;
    const A = Math.round(W(first) - over);
    body += p(r(first + ' fim da linha seguinte e mais texto'), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
  }
  cases.push({ name: `h15-${ea.toLowerCase()}-${eaFont ? 'cjk' : 'sem'}-c${compat}-${jc}`, docx: buildDocx({ body, compat, defaults: defaults(ea, eaFont) }) });
}
