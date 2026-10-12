// Layout asiático (modo 11, balanceSingleByteDoubleByteWidth, compressPunctuation, MS PGothic
// declarada no fontTable, idioma eastAsia japonês): a pontuação final pendurada SOMA com a
// compressão dos espaços? Excesso = largura do "." + δ (δ < 0: só pendura; δ > 0: pendura e
// comprime), justificado e à esquerda; também δ sem pontuação (só comprime). Arial 11;
// texto inventado.
import { strToU8 } from 'fflate';
import { buildDocx, p, r, sz, esc } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Arial', false, false).font;
const W = (t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const TEXTW = 11906 - 2 * 1701;
const defaults = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="${esc('MS PGothic')}" w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="pt-BR" w:eastAsia="ja-JP" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const FT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="MS PGothic"><w:charset w:val="80"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>';
const FIRST = 'Cada equipe registra o resultado da semana no painel geral do';
let body = '';
for (const jc of ['both', 'left']) for (const [last, dTw] of [['projeto.', -20], ['projeto.', 10], ['projeto.', 30], ['projeto.', 60], ['projeto', 10], ['projeto', 30], ['projeto', 60]]) {
  const first = `${FIRST} ${last}`;
  const over = (last.endsWith('.') ? W('.') : 0) + dTw;
  const A = Math.round(W(first) - over);
  body += p(r(`${first} Segunda linha que continua.`), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
  // a palavra é a ÚLTIMA do parágrafo (a marca de parágrafo vem logo depois)
  body += p(r(first), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
}
export const cases = [{ name: 'fhc-c11', docx: buildDocx({ body, compat: 11, charSpacing: 'compressPunctuation', extraCompat: '<w:balanceSingleByteDoubleByteWidth/><w:useFELayout/>', defaults, extraParts: { 'word/fontTable.xml': strToU8(FT) } }) }];
