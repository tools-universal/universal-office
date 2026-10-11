// Recuo de parágrafo numerado: quem manda entre o w:ind do NÍVEL da numeração e o
// w:ind do ESTILO, conforme a numeração vem do estilo (numPr no estilo) ou direto
// no parágrafo; estilo pai com recuo; recuo direto no parágrafo.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const numbering = `<w:abstractNum w:abstractNumId="0"><w:nsid w:val="2B3C4D5E"/><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Enum"/><w:suff w:val="space"/><w:lvlText w:val="%1)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1776" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`
  + `<w:abstractNum w:abstractNumId="1"><w:nsid w:val="3C4D5E6F"/><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:suff w:val="space"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1776" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`
  + '<w:num w:numId="2"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>';
const styles = '<w:style w:type="paragraph" w:styleId="Base"><w:name w:val="Base Recuo"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="900" w:hanging="300"/></w:pPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="Enum"><w:name w:val="Enum Estilo"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="2"/></w:numPr><w:ind w:left="1321" w:hanging="357"/></w:pPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="EnumSemInd"><w:name w:val="Enum Sem Recuo"/><w:basedOn w:val="Base"/><w:pPr><w:numPr><w:numId w:val="3"/></w:numPr></w:pPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="EnumFilho"><w:name w:val="Enum Filho"/><w:basedOn w:val="Enum"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>';
const defaults = docDefaults({ font: 'Arial', size: 10 });
const item = (t, ppr) => p(r(`${t} Hxg`), ppr);
export const cases = [];
const add = (name, body) => cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + body + p(r('Depois Hxg')), defaults, styles, numbering }) });
add('nsi-style-num-style-ind', item('Um', '<w:pStyle w:val="Enum"/>') + item('Dois', '<w:pStyle w:val="Enum"/>'));
add('nsi-style-num-parent-ind', item('Um', '<w:pStyle w:val="EnumSemInd"/>') + item('Dois', '<w:pStyle w:val="EnumSemInd"/>'));
add('nsi-direct-num-style-ind', item('Um', '<w:pStyle w:val="Base"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr>') + item('Dois', '<w:pStyle w:val="Base"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr>'));
add('nsi-style-num-direct-ind', item('Um', '<w:pStyle w:val="Enum"/><w:ind w:left="500"/>') + item('Dois', '<w:pStyle w:val="Enum"/><w:ind w:left="500"/>'));
add('nsi-child-style', item('Um', '<w:pStyle w:val="EnumFilho"/>') + item('Dois', '<w:pStyle w:val="EnumFilho"/>'));
add('nsi-style-num-direct-numpr', item('Um', '<w:pStyle w:val="Enum"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>') + item('Dois', '<w:pStyle w:val="Enum"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'));
