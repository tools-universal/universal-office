// Estilos com o MESMO w:styleId definidos duas vezes no styles.xml (gerador de
// terceiros costuma acrescentar a sua versão no fim). Qual definição o Word usa:
// a primeira, a última, ou uma mistura das duas? Cada caso separa as hipóteses
// pelo alinhamento (x0) e pelo tamanho (size) da linha.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const st = (id, name, ppr = '', rpr = '', extra = '') =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${extra}`
  + (ppr ? `<w:pPr>${ppr}</w:pPr>` : '') + (rpr ? `<w:rPr>${rpr}</w:rPr>` : '') + '</w:style>';
const cst = (id, name, rpr) =>
  `<w:style w:type="character" w:styleId="${id}"><w:name w:val="${name}"/><w:rPr>${rpr}</w:rPr></w:style>`;
const JC = (v) => `<w:jc w:val="${v}"/>`;
const SZ = (hp) => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
const P = (style, text) => p(r(text), `<w:pStyle w:val="${style}"/>`);
const doc = (styles, body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), styles });

export const cases = [
  // 1ª: direita + 20 pt; 2ª: centro sem tamanho.
  // primeira vence → direita 20; última vence → centro 11; mistura → centro 20
  { name: 'sd-jc-size', docx: doc(st('Dup', 'Dup', JC('right'), SZ(40)) + st('Dup', 'Dup', JC('center')), P('Dup', 'Duplicado Hxg')) },
  // 1ª: centro sem tamanho; 2ª: só 20 pt.
  // primeira → centro 11; última → esquerda 20; mistura → centro 20
  { name: 'sd-size-only', docx: doc(st('Dup', 'Dup', JC('center')) + st('Dup', 'Dup', '', SZ(40)), P('Dup', 'Duplicado Hxg')) },
  // o nome do estilo interno (Title / "Title") duplicado, como no Catalogo de Recursos
  { name: 'sd-title', docx: doc(st('Title', 'Title', '', SZ(56), '<w:next w:val="Normal"/><w:qFormat/>') + st('Title', 'Title', JC('center'), '<w:b/>' + SZ(64)), P('Title', 'Titulo Hxg')) },
  // três definições: vale a última, a do meio, ou a primeira?
  { name: 'sd-three', docx: doc(st('Dup', 'Dup', JC('right')) + st('Dup', 'Dup', JC('center')) + st('Dup', 'Dup', JC('left'), SZ(40)), P('Dup', 'Duplicado Hxg')) },
  // basedOn diferente: 1ª herda de Base (centro); 2ª herda de Normal e só muda o tamanho
  { name: 'sd-basedon', docx: doc(st('Base', 'Base', JC('center')) + st('Dup', 'Dup', '', '', '').replace('w:val="Normal"', 'w:val="Base"') + st('Dup', 'Dup', '', SZ(40)), P('Dup', 'Duplicado Hxg')) },
  // estilo de caractere duplicado: 1ª 20 pt; 2ª sem tamanho (só cor)
  { name: 'sd-char', docx: doc(cst('DupC', 'DupC', SZ(40)) + cst('DupC', 'DupC', '<w:color w:val="C00000"/>'), p(r('Antes ') + r('Duplicado', '<w:rStyle w:val="DupC"/>') + r(' Hxg'))) },
];
