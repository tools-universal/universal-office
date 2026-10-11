// Métricas verticais e quebra de linha por fonte/tamanho/regra de entrelinha.
//  lh-<fonte>     : grupos de 4 parágrafos de 1 linha por tamanho (pitch = altura
//                   de linha "single"); 1º baseline − margem = ascent
//  rule-<fonte>   : 1.15 / 1.5 / duplo / exato / pelo menos, antes/depois
//  wrap-<fonte>   : parágrafos longos (quebras de linha) em 3 tamanhos
//  kern-<fonte>   : mesmo texto com e sem w:kern
import { buildDocx, docDefaults, p, r, font, sz, lorem } from '../docx-builder.mjs';

const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Segoe UI', 'Aptos', 'Century Gothic', 'Tahoma',
  'Georgia', 'Courier New', 'Calibri Light', 'Cambria', 'Trebuchet MS', 'Open Sans', 'Arial Nova Light', 'Arial Narrow', 'Garamond', 'Lato'];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 20, 28];
const slug = (f) => f.toLowerCase().replace(/\s+/g, '-');

export const cases = [];

for (const f of FONTS) {
  let body = '';
  for (const s of SIZES) {
    for (let k = 0; k < 4; k++) body += p(r(`Hxg ${s}pt linha ${k + 1} ÁÇÉ`, sz(s)));
  }
  cases.push({ name: `lh-${slug(f)}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: 11 }) }) });

  const rules = [
    ['<w:spacing w:line="276" w:lineRule="auto"/>', '1.15'],
    ['<w:spacing w:line="360" w:lineRule="auto"/>', '1.5'],
    ['<w:spacing w:line="480" w:lineRule="auto"/>', 'duplo'],
    ['<w:spacing w:line="300" w:lineRule="exact"/>', 'exato 15pt'],
    ['<w:spacing w:line="200" w:lineRule="exact"/>', 'exato 10pt'],
    ['<w:spacing w:line="360" w:lineRule="atLeast"/>', 'min 18pt'],
    ['<w:spacing w:line="120" w:lineRule="atLeast"/>', 'min 6pt'],
    ['<w:spacing w:before="240" w:after="120"/>', 'antes 12 depois 6'],
    ['<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1"/>', 'autospacing'],
  ];
  let rb = '';
  for (const [pPr, label] of rules) {
    for (let k = 0; k < 3; k++) rb += p(r(`${label} — linha ${k + 1} Hxg`), pPr);
  }
  cases.push({ name: `rule-${slug(f)}`, docx: buildDocx({ body: rb, defaults: docDefaults({ font: f, size: 11 }) }) });

  let wb = '';
  for (const s of [9, 11, 12]) {
    for (let k = 0; k < 3; k++) wb += p(r(lorem(70, k + s), sz(s)), '<w:spacing w:after="120"/>');
  }
  cases.push({ name: `wrap-${slug(f)}`, docx: buildDocx({ body: wb, defaults: docDefaults({ font: f, size: 11 }) }) });

  const text = 'AVATAR Tomada WAVE Yo! Ta Te Vo Fe LT AT AY "Wa" P. V. To.';
  let kb = '';
  for (const s of [11, 24]) {
    kb += p(r(text, sz(s)));
    kb += p(r(text, sz(s) + '<w:kern w:val="2"/>'));
    kb += p(r(text, sz(s) + '<w:kern w:val="56"/>'));
  }
  cases.push({ name: `kern-${slug(f)}`, docx: buildDocx({ body: kb, defaults: docDefaults({ font: f, size: 11 }) }) });
}
