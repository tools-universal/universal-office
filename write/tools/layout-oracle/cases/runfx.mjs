// Altura da linha com efeitos de texto do Word 2010 (w14:textOutline), versalete e
// espaçamento de caracteres — Cambria 18 negrito (cabeçalho de POP). A sombra
// (w14:shadow) aumenta a linha numa proporção que depende do corpo — não modelado
// (notas do laboratório).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const outline = '<w14:textOutline w14:w="0" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr"><w14:noFill/><w14:prstDash w14:val="solid"/><w14:round/></w14:textOutline>';
const base = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/>';
const text = 'PROCEDIMENTO OPERACIONAL PADRAO COM TEXTO LONGO PARA QUEBRAR EM DUAS LINHAS NO MINIMO';
export const cases = [];
for (const [name, extra] of [['rf-plain', ''], ['rf-caps', '<w:smallCaps/>'], ['rf-spacing', '<w:spacing w:val="5"/>'], ['rf-outline', outline]]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r(text, base + extra), `<w:jc w:val="center"/><w:rPr>${base}${extra}</w:rPr>`) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Cambria', size: 12 }) }) });
}
