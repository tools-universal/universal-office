// Hifenização automática por idioma (w:autoHyphenation): o Word desta máquina só
// hifeniza os idiomas com revisores instalados (PT-BR, EN, ES — MSHY7*.DLL); en-US,
// en-GB e en-AU dão os MESMOS pontos. Sem hifenização: w:noProof, x-none,
// w:suppressAutoHyphens no parágrafo, autoHyphenation desligado. Maiúsculas: com
// w:doNotHyphenateCaps a palavra toda em maiúsculas (inclusive por w:caps/w:smallCaps)
// não hifeniza; a só capitalizada sim.
// Palavras escolhidas onde os padrões (hyph-utf8) e o Word dão os mesmos pontos.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { withHyphenation, NARROW_SECT, NARROW_TEXTW } from '../hyph-settings.mjs';

const PT = 'A organização garante a confidencialidade das telecomunicações e a responsabilidade pela administração do desenvolvimento das transformações.';
const EN = 'The participation of intellectuals in technological qualifications was exceptionally controversial and environmentally irresponsible.';
const ES = 'Las declaraciones del administrador sobre las operaciones y dimensiones fueron precipitadamente consideradas imaginaciones y frustraciones.';
const col = (w, jc = 'left') => `<w:spacing w:after="120"/><w:jc w:val="${jc}"/><w:ind w:left="0" w:right="${NARROW_TEXTW - w}"/>`;
const lang = (l) => `<w:lang w:val="${l}"/>`;
const doc = (body, opts = {}, dd = {}) => withHyphenation(buildDocx({ body, sect: NARROW_SECT, defaults: docDefaults({ font: 'Arial', size: 11, ...dd }) }), opts);

// mesmo texto em larguras diferentes, à esquerda e justificado
const block = (text, rPr) => [2300, 2900, 3700].map((w) => p(r(text, rPr), col(w)) + p(r(text, rPr), col(w, 'both'))).join('');

const caps = ['RESPONSABILIDADE ADMINISTRAÇÃO DESENVOLVIMENTO ORGANIZAÇÃO', 'Responsabilidade Administração Desenvolvimento Organização'];
const capsBody = caps.map((t) => p(r(t), col(2300))).join('')
  + p(r('responsabilidade administração desenvolvimento organização', '<w:caps/>'), col(2300))
  + p(r('responsabilidade administração desenvolvimento organização', '<w:smallCaps/>'), col(2300));

const cell = (w, text, jc) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${p(r(text), `<w:jc w:val="${jc}"/>`)}</w:tc>`;
const cellTbl = `<w:tbl><w:tblPr><w:tblW w:w="5400" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="3000"/></w:tblGrid>`
  + `<w:tr>${cell(2400, PT, 'left')}${cell(3000, PT, 'both')}</w:tr></w:tbl>` + p('');

export const cases = [
  { name: 'hl-pt', docx: doc(block(PT, lang('pt-BR'))) },
  // sem w:lang no run: vale o docDefaults (pt-BR)
  { name: 'hl-pt-default', docx: doc(block(PT, '')) },
  { name: 'hl-en-us', docx: doc(block(EN, lang('en-US'))) },
  { name: 'hl-en-gb', docx: doc(block(EN, lang('en-GB'))) },
  { name: 'hl-es', docx: doc(block(ES, lang('es-ES'))) },
  { name: 'hl-es-mx', docx: doc(block(ES, lang('es-MX'))) },
  // sem hifenização
  { name: 'hl-noproof', docx: doc(block(PT, `<w:noProof/>${lang('pt-BR')}`)) },
  { name: 'hl-xnone', docx: doc(block(EN, lang('x-none'))) },
  { name: 'hl-suppress', docx: doc([2300, 2900].map((w) => p(r(PT), `<w:suppressAutoHyphens/>${col(w)}`) + p(r(PT), col(w))).join('')) },
  { name: 'hl-off', docx: doc(block(PT, ''), { auto: false }) },
  // maiúsculas
  { name: 'hl-caps', docx: doc(capsBody) },
  { name: 'hl-nocaps', docx: doc(capsBody, { noCaps: true }) },
  // célula de tabela: mesma hifenização
  { name: 'hl-cell', docx: doc(cellTbl) },
];
