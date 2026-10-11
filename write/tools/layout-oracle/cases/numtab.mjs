// Tab depois do número da lista × doNotUseIndentAsNumberingTabStop ("não usar o
// recuo deslocado como parada de tabulação para numeração"). Normal: o recuo é a
// parada do tab do número e passa à frente das paradas padrão (que só valem
// depois dele). Com a opção, no modo ≤ 14: o recuo é só mais uma parada — o
// texto vai para a mais próxima depois do fim do número, padrão OU recuo (no modo
// 15 a opção é ignorada). Grade: início do número S × recuo L, tab padrão 709;
// o texto (2 linhas) quebra conforme o x em que começa.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const NUMPR = (id) => `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr>`;
function doc(compat, flag) {
  let numbering = '', body = '', id = 0;
  for (const S of [0, 200, 400, 560, 650]) for (let L = S + 150; L <= 1700; L += 150) {
    id++;
    numbering += `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${L}" w:hanging="${L - S}"/></w:pPr></w:lvl></w:abstractNum>`;
    body += p(r(lorem(26, id)), `${NUMPR(id)}<w:spacing w:after="60"/>`);
  }
  // recuo do parágrafo diferente do recuo do nível; tab literal (não é do número)
  id++;
  numbering += `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`;
  for (let k = 0; k < 4; k++) body += p(r('   ' + lorem(26, 50 + k)), `${NUMPR(id)}<w:ind w:left="851" w:hanging="284"/><w:spacing w:after="60"/>`);
  for (const [L, H] of [[1500, 1000], [851, 284]]) body += p(r('a)\t' + lorem(26, 60 + L)), `<w:ind w:left="${L}" w:hanging="${H}"/><w:spacing w:after="60"/>`);
  numbering += Array.from({ length: id }, (_, k) => `<w:num w:numId="${k + 1}"><w:abstractNumId w:val="${k + 1}"/></w:num>`).join('');
  return buildDocx({ body, numbering, compat, defaultTab: 709, extraCompat: flag ? '<w:doNotUseIndentAsNumberingTabStop/>' : '', defaults: docDefaults({ font: 'Calibri', size: 10 }) });
}
export const cases = [];
for (const [compat, flag] of [[11, 1], [14, 1], [15, 1], [11, 0]]) {
  cases.push({ name: `nt-c${compat}-${flag ? 'flag' : 'sem'}`, docx: doc(compat, flag) });
}
