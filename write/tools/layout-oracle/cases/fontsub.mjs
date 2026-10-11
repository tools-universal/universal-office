// Substituição de fonte ausente: o que o Word usa para uma família que não
// existe na máquina, conforme o fontTable (família genérica, PANOSE, altName),
// a fonte padrão do documento e a fonte do tema. As famílias "Zz…" não existem.
// A verificação é pelos nomes de fonte no PDF do Word (ver run.mjs: .fonts.json).
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';
import { strToU8 } from 'fflate';

const fontTable = (entries) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${entries}</w:fonts>`;
const fe = (name, { family, panose, alt, charset = '00', pitch = 'variable' } = {}) =>
  `<w:font w:name="${name}">${alt ? `<w:altName w:val="${alt}"/>` : ''}${panose ? `<w:panose1 w:val="${panose}"/>` : ''}<w:charset w:val="${charset}"/>${family ? `<w:family w:val="${family}"/>` : ''}<w:pitch w:val="${pitch}"/></w:font>`;

const theme = (minor, major) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T"><a:themeElements><a:clrScheme name="T"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="T"><a:majorFont><a:latin typeface="${major}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${minor}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="T"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const FONTS = [
  ['ZzSans Panose', { family: 'swiss', panose: '020B0502030000000004' }],
  ['ZzSans Zero', { family: 'swiss', panose: '00000000000000000000' }],
  ['ZzSerif Panose', { family: 'roman', panose: '02020603050405020304' }],
  ['ZzAuto', { family: 'auto' }],
  ['ZzModern', { family: 'modern', panose: '02070309020205020404', pitch: 'fixed' }],
  ['ZzGeometric', { family: 'swiss', panose: '020B0502020202020204' }],
  ['ZzAlt', { family: 'swiss', alt: 'Verdana' }],
];
// texto com larguras distintivas por fonte
const line = (f) => p(r(`${f} WMwm iIl1 0O Hxg`, font(f) + sz(16)));
const body = FONTS.map(([f]) => line(f)).join('') + line('ZzNaoNaTabela');
const ft = fontTable(FONTS.map(([f, o]) => fe(f, o)).join('') + fe('Arial', { family: 'swiss', panose: '020B0604020202020204' }) + fe('Times New Roman', { family: 'roman', panose: '02020603050405020304' }));

export const cases = [];
for (const [name, dd, th] of [
  ['tnr', 'Times New Roman', null],
  ['arial', 'Arial', null],
  ['georgia-theme', null, ['Georgia', 'Impact']],
  ['verdana', 'Verdana', ['Georgia', 'Impact']],
]) {
  const extraParts = { 'word/fontTable.xml': strToU8(ft) };
  if (th) extraParts['word/theme/theme1.xml'] = strToU8(theme(th[0], th[1]));
  const defaults = dd ? docDefaults({ font: dd, size: 11 })
    : docDefaults({ font: 'X', size: 11 }).replace(/<w:rFonts [^>]*\/>/, '<w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi"/>');
  cases.push({ name: `sub-${name}`, docx: buildDocx({ body, defaults, extraParts }) });
}
