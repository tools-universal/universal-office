// Caractere que a fonte do run NÃO tem (setas, formas geométricas): o Word cai primeiro na
// fonte "da classe" da fonte do run pelo PANOSE — sem serifa → Arial, serifada → Times New
// Roman, monoespaçada → Courier New — antes da cadeia de símbolos (Segoe UI Symbol). Vale no
// marcador de lista (lvlText sem fonte) e no texto; muda a altura da linha e a largura (corpus
// t265: marcador ● numa fonte sem ele). Fontes do Windows (Corbel, Constantia, Lucida Console),
// conteúdo inventado; as linhas alinhadas à direita medem a largura (x da 1ª letra).
import { buildDocx, docDefaults, r, sz } from '../docx-builder.mjs';

const CHARS = [0x25cf, 0x25a0, 0x25cb, 0x2192, 0x25aa, 0x25e6, 0x25d8, 0x25ba, 0x2190];
const lvl = (cp) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${String.fromCodePoint(cp)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl>`;
const numbering = CHARS.map((cp, i) => `<w:abstractNum w:abstractNumId="${i + 1}">${lvl(cp)}</w:abstractNum>`).join('')
  + CHARS.map((_, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${i + 1}"/></w:num>`).join('');
export const cases = [];
for (const f of ['Corbel', 'Constantia', 'Lucida Console']) {
  const rf = `<w:rFonts w:ascii="${f}" w:cs="${f}" w:eastAsia="${f}" w:hAnsi="${f}"/>${sz(12)}`;
  const sp = '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>';
  let body = '';
  CHARS.forEach((cp, ci) => {
    const ch = String.fromCodePoint(cp);
    body += `<w:p><w:pPr>${sp}<w:rPr>${rf}</w:rPr></w:pPr>${r(`Pre${ci} Hxg`, rf)}</w:p>`;
    body += `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${ci + 1}"/></w:numPr>${sp}<w:ind w:left="720" w:hanging="360"/><w:rPr>${rf}</w:rPr></w:pPr>${r(`Bul${ci} Hxg`, rf)}</w:p>`;
    body += `<w:p><w:pPr>${sp}<w:jc w:val="right"/><w:rPr>${rf}</w:rPr></w:pPr>${r(`Dir${ci} ${ch}${ch} Hxg ${ch}`, rf)}</w:p>`;
  });
  cases.push({ name: `gfb-${f.replace(/ /g, '').toLowerCase()}`, docx: buildDocx({ body, numbering, defaults: docDefaults({ font: 'Arial', size: 11, after: 0, line: 276 }) }) });
}
