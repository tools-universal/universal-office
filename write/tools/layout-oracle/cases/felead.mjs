// Espaço no INÍCIO do parágrafo com layout asiático (fonte asiática padrão MS PGothic,
// idioma eastAsia japonês, balanceSingleByteDoubleByteWidth, compressPunctuation) nos
// modos 11 e 14: quanto mede o espaço inicial (um, dois) — largura da fonte, meio em? —,
// justificado e à esquerda. O x da 1ª letra mede; texto inventado em Arial 11.
import { strToU8 } from 'fflate';
import { buildDocx, p, r, sz, esc } from '../docx-builder.mjs';

const defaults = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="${esc('MS PGothic')}" w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="en-US" w:eastAsia="ja-JP" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const COMPAT = '<w:balanceSingleByteDoubleByteWidth/><w:useFELayout/><w:doNotLeaveBackslashAlone/><w:spaceForUL/><w:ulTrailSpace/>';
const TXT = 'Texto de exemplo com varias palavras curtas para ocupar mais de uma linha inteira do paragrafo de teste e medir o recuo do espaco inicial.';
export const cases = [];
const FT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="MS PGothic"><w:charset w:val="80"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>';
for (const [compat, bal, nofe, lang, ea, ft] of [[11, true, false, 'en-US', 'ja-JP'], [11, false, false, 'en-US', 'ja-JP'], [14, true, false, 'en-US', 'ja-JP'], [14, false, false, 'en-US', 'ja-JP'], [11, true, true, 'en-US', 'ja-JP'], [11, true, false, 'pt-BR', 'ja-JP'], [11, true, true, 'pt-BR', 'ja-JP'], [11, true, false, 'en-US', 'pt-BR'], [11, true, false, 'en-US', 'ja-JP', true], [11, true, false, 'en-US', 'pt-BR', true]]) {
  let body = '';
  for (const jc of ['both', 'left']) for (const lead of ['', ' ', '  ']) body += p(r(lead + TXT), `<w:jc w:val="${jc}"/>`);
  // sem espaço inicial, a 1ª palavra mais larga ("i": +2,44 pt) — o "do" só cabe comprimindo
  for (const jc of ['both', 'left']) body += p(r(TXT.replace('Texto', 'Textoi')), `<w:jc w:val="${jc}"/>`);
  cases.push({
    name: `fl-c${compat}${bal ? '' : '-nobal'}${nofe ? '-nofe' : ''}${lang === 'pt-BR' ? '-pt' : ''}${ea === 'pt-BR' ? '-eapt' : ''}${ft ? '-ft' : ''}`,
    docx: buildDocx({ body, compat, extraCompat: (bal ? COMPAT : COMPAT.replace('<w:balanceSingleByteDoubleByteWidth/>', '')).replace(nofe ? '<w:useFELayout/>' : '#', ''), charSpacing: 'compressPunctuation', defaults: defaults.replace('w:val="en-US"', `w:val="${lang}"`).replace('w:eastAsia="ja-JP"', `w:eastAsia="${ea}"`), ...(ft ? { extraParts: { 'word/fontTable.xml': strToU8(FT) } } : {}) }),
  });
}
