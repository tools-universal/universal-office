// Tab depois do número/marcador com w:doNotUseIndentAsNumberingTabStop (compat):
// o recuo deslocado deixa de ser parada — o texto vai para a próxima parada padrão.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const ab = (id, fmt, text) => `<w:abstractNum w:abstractNumId="${id}"><w:nsid w:val="1A2B3C0${id}"/><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1004" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`;
// (todos os abstractNum antes dos num — ordem exigida pelo Word)
const numbering = ab(1, 'bullet', '•') + ab(2, 'decimal', '%1.') + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>';
const item = (num, hanging) => p(r('Os documentos acima devem ser legiveis Hxg'), `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${num}"/></w:numPr>${hanging ? `<w:ind w:hanging="${hanging}"/>` : ''}`);
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const flag of [false, true]) for (const compat of [11, 15]) {
  const extra = flag ? '<w:doNotUseIndentAsNumberingTabStop/>' : '';
  const body = p(r('Antes Hxg')) + item(1, 0) + item(1, 720) + item(2, 0) + item(2, 720) + p(r('Depois Hxg'));
  cases.push({ name: `nti-c${compat}${flag ? '-flag' : ''}`, docx: buildDocx({ body, numbering, defaults, compat, extraCompat: extra }) });
}
