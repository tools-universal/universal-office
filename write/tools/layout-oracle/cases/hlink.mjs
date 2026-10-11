// Hiperlinks: o w:hyperlink sozinho formata o texto (cor/sublinhado) ou só o estilo
// de caractere Hyperlink? w:u="none" no run do link tira o sublinhado? (cada caso
// numa linha própria; a cor e o sublinhado são lidos do PDF do Word)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const HSTYLE = '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0563C1" w:themeColor="hyperlink"/><w:u w:val="single"/></w:rPr></w:style>';
// link interno (âncora): a formatação é a mesma de um link externo e não precisa de relação
const link = (runs) => `<w:hyperlink w:anchor="alvo">${runs}</w:hyperlink>`;
const alvo = p('<w:bookmarkStart w:id="0" w:name="alvo"/>' + r('Alvo Hxg') + '<w:bookmarkEnd w:id="0"/>');
export const cases = [];
for (const [name, runs, styles] of [
  // estilo Hyperlink no run (como o Word grava)
  ['hl-style', r('Link estilo Hxg', '<w:rStyle w:val="Hyperlink"/>'), HSTYLE],
  // run sem rPr dentro do hiperlink
  ['hl-plain', r('Link simples Hxg'), HSTYLE],
  // estilo Hyperlink + w:u="none" direto
  ['hl-unone', r('Link sem sublinhado Hxg', '<w:rStyle w:val="Hyperlink"/><w:u w:val="none"/>'), HSTYLE],
  // só w:u="none" (sem estilo)
  ['hl-unone-nostyle', r('Link u none Hxg', '<w:u w:val="none"/>'), HSTYLE],
  // só cor direta
  ['hl-color', r('Link vermelho Hxg', '<w:color w:val="FF0000"/>'), HSTYLE],
  // rStyle Hyperlink sem o estilo definido em styles.xml
  ['hl-style-undef', r('Link estilo ausente Hxg', '<w:rStyle w:val="Hyperlink"/>'), ''],
]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + p(link(runs)) + p(r('Depois Hxg')) + alvo, styles, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
