// Formas "superior e inferior" (wrapTopAndBottom) ancoradas num parágrafo vazio perto
// do pé da página, uma linha delas a 9 pt e outra a 30 pt abaixo do topo dele — a 2ª
// passa da margem inferior. Depois: um parágrafo pequeno e o parágrafo da quebra de
// seção (próxima página). O parágrafo pequeno fica na página (as formas da 2ª linha não
// sobem até a margem) ou desce? Com e sem "atrás do texto" (behindDoc).
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

let id = 0;
const rect = (xpt, offYtw, wpt, hpt, behind) => {
  id++;
  const cx = Math.round(wpt * 12700), cy = Math.round(hpt * 12700);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(xpt * 12700)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${Math.round(offYtw * 635)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapTopAndBottom/><wp:docPr id="${id}" name="r${id}"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="808080"/></a:solidFill></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
};
// margens: topo 500 tw, pé 280 tw (corpo até 827,9 pt); o parágrafo das formas começa
// em ~796 pt (enchimento de altura exata)
const sect1 = sectPr({ top: 500, bottom: 280, extra: '<w:type w:val="continuous"/>' });
const D = (behind, small = p(r('pequeno', '<w:sz w:val="9"/>'), '<w:spacing w:before="4"/>')) => {
  const shapes = [0, 1, 2].map((k) => rect(350 + k * 40, 187, 30, 11.6, behind)).join('') + [0, 1, 2].map((k) => rect(350 + k * 40, 597, 5, 5.4, behind)).join('');
  const body = p(r('topo Hxg'), '<w:spacing w:line="15424" w:lineRule="exact"/>')
    + p(shapes, '<w:rPr><w:sz w:val="11"/></w:rPr>')
    + small
    + `<w:p><w:pPr>${sect1}<w:rPr><w:sz w:val="9"/></w:rPr></w:pPr></w:p>`
    + p(r('Secao dois Hxg'));
  return buildDocx({ body, sect: sectPr({ top: 500, bottom: 280 }), defaults: docDefaults({ font: 'Arial', size: 11 }) });
};
// (com o parágrafo pequeno VAZIO — marca de 4,5 pt — o Word também o leva para a página
// seguinte, mas pelas contas aqui ele caberia: não reproduzido; caso fora do oráculo)
export const cases = [
  { name: 'bf-behind', docx: D(true) },
  { name: 'bf-front', docx: D(false) },
];
