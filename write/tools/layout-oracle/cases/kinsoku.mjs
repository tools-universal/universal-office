// Kinsoku (regras de quebra do Leste Asiático) em texto latino: a linha não pode
// TERMINAR em "$", "(", "“", "£"… — em "R$ 100", "US$ 1", "$ 5" o espaço depois do
// "$" não quebra e o símbolo desce com o número. Vale quando o idioma eastAsia do
// run é japonês/chinês/coreano; no modo 15 com qualquer fonte, no modo 11 só se a
// fonte asiática PADRÃO do documento (docDefaults) também for do Leste Asiático.
// Com idioma latino, nunca; w:kinsoku=0 no parágrafo desliga; a opção
// doNotUseEastAsianBreakRules NÃO desliga.
import { buildDocx, p, r, sz, esc } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const defaults = (ea, eaFont) => `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"${eaFont ? ` w:eastAsia="${esc(eaFont)}"` : ''} w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="pt-BR" w:eastAsia="${ea}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const TOKS = ['R$ 12.345,67', 'US$ 100', '$ 5', '£ 20', 'abc ( def', 'texto “ citado'];
function body(extraPPr = '') {
  let b = '';
  for (const tok of TOKS) {
    const head = Array(20).fill('ab').join(' ') + ' ';
    const w0 = W(head), tw = W(tok);
    for (let k = 1; k <= 5; k++) {
      const A = Math.round(w0 + (tw * k) / 6) + 3;
      b += p(r(head + tok + ' fim'), `${extraPPr}<w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  return b;
}
export const cases = [];
for (const [ea, eaFont, compat] of [['zh-CN', '', 15], ['ko-KR', '', 15], ['ja-JP', 'MS Mincho', 15], ['zh-CN', 'MS Mincho', 11], ['ko-KR', 'Batang', 11], ['zh-CN', '', 11], ['zh-CN', 'Times New Roman', 11], ['pt-BR', 'MS Mincho', 15]]) {
  cases.push({ name: `ks-${ea.toLowerCase()}-${eaFont.replace(/\s/g, '').toLowerCase() || 'sem'}-c${compat}`, docx: buildDocx({ body: body(), compat, defaults: defaults(ea, eaFont) }) });
}
// w:kinsoku desligado no parágrafo (sem kinsoku); a opção doNotUseEastAsianBreakRules (com kinsoku)
cases.push({ name: 'ks-zh-cn-sem-c15-pkinsoku0', docx: buildDocx({ body: body('<w:kinsoku w:val="0"/>'), compat: 15, defaults: defaults('zh-CN', '') }) });
cases.push({ name: 'ks-zh-cn-msmincho-c11-noearules', docx: buildDocx({ body: body(), compat: 11, extraCompat: '<w:doNotUseEastAsianBreakRules/>', defaults: defaults('zh-CN', 'MS Mincho') }) });
