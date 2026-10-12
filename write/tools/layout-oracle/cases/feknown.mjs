// Quais fontes asiáticas PADRÃO (docDefaults w:eastAsia) ligam o layout asiático dos modos
// ≤ 14 SEM o fontTable do documento declarar o conjunto de caracteres? Sonda: a palavra
// que só cabe comprimindo os espaços (compressPunctuation) e dois espaços no início
// (balanceSingleByteDoubleByteWidth: meio em cada). Modo 11; texto inventado em Arial 11.
import { buildDocx, p, r, sz, esc } from '../docx-builder.mjs';

const TXT = 'Texto de exemplo com varias palavras curtas para ocupar mais de uma linha inteira do paragrafo de teste e medir o recuo do espaco inicial.';
export const cases = [];
for (const ea of ['MS Gothic', 'MS PGothic', 'MS Mincho', 'MS PMincho', 'MS UI Gothic', 'Yu Gothic', 'Meiryo', 'SimSun', 'Malgun Gothic']) {
  const defaults = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="${esc(ea)}" w:hAnsi="Arial" w:cs="Arial"/>${sz(11)}<w:lang w:val="pt-BR" w:eastAsia="pt-BR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults>`;
  const body = p(r(TXT.replace('Texto', 'Textoi')), '<w:jc w:val="both"/>') + p(r('  ' + TXT), '<w:jc w:val="left"/>');
  cases.push({ name: `fk-${ea.toLowerCase().replace(/\s+/g, '')}`, docx: buildDocx({ body, compat: 11, charSpacing: 'compressPunctuation', extraCompat: '<w:balanceSingleByteDoubleByteWidth/>', defaults }) });
}
