/**
 * Tema do .xls → xl/theme/theme1.xml. O Excel 2007+ grava o tema no registro
 * THEME: "padrão" (sem dados = tema Office 2007) ou personalizado (pacote zip
 * do themeManager, de onde sai o theme1.xml). Pastas do Excel 97–2003 não têm
 * tema — o Excel atual as abre com o tema Office 2007 (as cores das células
 * do BIFF são todas indexadas/RGB, o tema só pesa nas cores de tema do XFEXT).
 */
import { unzipSync } from 'fflate';
import { XML_HEAD } from './xmlw.js';

const scheme = (slots: [string, string][]): string => slots.map(([n, c]) => `<a:${n}>${c}</a:${n}>`).join('');
const srgb = (v: string): string => `<a:srgbClr val="${v}"/>`;
const solid = (inner: string): string => `<a:solidFill><a:schemeClr val="phClr">${inner}</a:schemeClr></a:solidFill>`;

/** Tema Office 2007 (o padrão das pastas .xls). */
export const OFFICE_2007_THEME = `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements>`
  + '<a:clrScheme name="Office">' + scheme([
    ['dk1', '<a:sysClr val="windowText" lastClr="000000"/>'], ['lt1', '<a:sysClr val="window" lastClr="FFFFFF"/>'],
    ['dk2', srgb('1F497D')], ['lt2', srgb('EEECE1')], ['accent1', srgb('4F81BD')], ['accent2', srgb('C0504D')],
    ['accent3', srgb('9BBB59')], ['accent4', srgb('8064A2')], ['accent5', srgb('4BACC6')], ['accent6', srgb('F79646')],
    ['hlink', srgb('0000FF')], ['folHlink', srgb('800080')],
  ]) + '</a:clrScheme>'
  + '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Cambria"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>'
  + '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
  + '<a:fmtScheme name="Office"><a:fillStyleLst>' + solid('') + solid('<a:tint val="50000"/>') + solid('<a:shade val="80000"/>') + '</a:fillStyleLst>'
  + '<a:lnStyleLst>' + [9525, 25400, 38100].map((w) => `<a:ln w="${w}">${solid('')}</a:ln>`).join('') + '</a:lnStyleLst>'
  + '<a:effectStyleLst>' + '<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3) + '</a:effectStyleLst>'
  + '<a:bgFillStyleLst>' + solid('') + solid('<a:tint val="40000"/>') + solid('<a:shade val="80000"/>') + '</a:bgFillStyleLst>'
  + '</a:fmtScheme></a:themeElements></a:theme>';

/** theme1.xml a partir do registro THEME (zip do themeManager) ou o padrão Office 2007. */
export function themeXml(themeZip: Uint8Array | undefined): string {
  if (themeZip && themeZip.length > 4 && themeZip[0] === 0x50 && themeZip[1] === 0x4b) {
    try {
      const files = unzipSync(themeZip, { filter: (f) => /theme\/theme\/theme\d*\.xml$/i.test(f.name) && f.originalSize < 4 * 1024 * 1024 });
      const name = Object.keys(files)[0];
      if (name) {
        const xml = new TextDecoder().decode(files[name]);
        if (xml.includes('clrScheme')) return xml;
      }
    } catch { /* zip inválido: tema padrão */ }
  }
  return OFFICE_2007_THEME;
}
