// Fonte ausente só na MARCA de parágrafos vazios (sem texto): a altura da linha
// vazia usa qual substituta? (Com texto, o oráculo fontsub mediu Calibri para
// família swiss/auto.) Compara com parágrafos com texto na mesma fonte. Com
// assinatura (w:sig) o Word usa o mapeador de fontes do sistema: com o bloco
// árabe → Arial / Sakkal Majalla. (A assinatura idêntica à da Calibri dá Sylfaen
// — não modelado.)
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const fontTable = (entries) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${entries}</w:fonts>`;
const fe = (name, { family, panose, charset = '00', pitch = 'variable', sig } = {}) =>
  `<w:font w:name="${name}">${panose ? `<w:panose1 w:val="${panose}"/>` : ''}<w:charset w:val="${charset}"/>${family ? `<w:family w:val="${family}"/>` : ''}<w:pitch w:val="${pitch}"/>${sig ?? ''}</w:font>`;
const sig = (u0, u1, c0) => `<w:sig w:usb0="${u0}" w:usb1="${u1}" w:usb2="00000000" w:usb3="00000000" w:csb0="${c0}" w:csb1="00000000"/>`;
const SIG = sig('A00020FF', 'C000205B', '000001D3');
const FONTS = [['ZzAuto Zero', { family: 'auto', panose: '00000000000000000000' }], ['ZzSwiss', { family: 'swiss', panose: '020B0502030000000004' }], ['ZzRoman', { family: 'roman' }],
  ['ZzAuto Sig', { family: 'auto', panose: '00000000000000000000', sig: SIG }],
  ['ZzAuto SigLatin', { family: 'auto', panose: '00000000000000000000', sig: sig('00000003', '00000000', '00000001') }],
  ['ZzAuto SigArab', { family: 'auto', panose: '00000000000000000000', sig: sig('00002003', '00000000', '00000041') }],
  ['ZzSwiss Sig', { family: 'swiss', panose: '020B0502030000000004', sig: SIG }],
  ['ZzRoman Sig', { family: 'roman', sig: SIG }]];
const ft = fontTable(FONTS.map(([f, o]) => fe(f, o)).join(''));
export const cases = [];
for (const [dd, size] of [['Calibri', 12], ['Arial', 11]]) {
  let body = p(r('Inicio Hxg'));
  for (const [f] of FONTS) {
    const mark = `<w:rPr>${font(f)}${sz(size)}</w:rPr>`;
    body += p('', mark) + p('', mark) + p('', mark) + p(r('Meio Hxg'));
    body += p(r('Texto Hxg', font(f) + sz(size)), mark) + p(r('Texto Hxg', font(f) + sz(size)), mark) + p(r('Depois Hxg'));
  }
  cases.push({ name: `fsm-${dd.toLowerCase()}`, docx: buildDocx({ body, defaults: docDefaults({ font: dd, size }), extraParts: { 'word/fontTable.xml': strToU8(ft) } }) });
}
