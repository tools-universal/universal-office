// Sublinhados com estilo (w:u): os 17 estilos em corpos pequeno/médio/grande, cor
// (direta e do tema), corpos misturados e sub/sobrescrito na linha. As linhas
// medidas garantem que o texto não muda; a geometria do traço é conferida contra
// o Word em docx-layout/test/underline.test.ts (sonda write/tools/home-lab) e
// estes casos alimentam a paridade JS × .NET do desenho.
import { buildDocx, docDefaults, p, r, font, sz } from '../docx-builder.mjs';

const STYLES = ['single', 'words', 'double', 'thick', 'dotted', 'dottedHeavy', 'dash', 'dashedHeavy', 'dashLong',
  'dashLongHeavy', 'dotDash', 'dashDotHeavy', 'dotDotDash', 'dashDotDotHeavy', 'wave', 'wavyHeavy', 'wavyDouble'];
export const cases = [];
for (const st of STYLES) {
  const u = (extra = '') => `<w:u w:val="${st}"${extra}/>`;
  const A = (pt, x = '') => font('Arial') + sz(pt) + x;
  const body = [
    p(r('Antes ', A(10)) + r('sublinhado dez Hxg', A(10, u())) + r(' depois', A(10))),
    p(r('Onze com espacos no fim  ', A(11, u())) + r('x', A(11))),
    p(r('Vinte e quatro Hxg', A(24, u(' w:color="FF0000"')))),
    p(r('Tema ', A(14, u(' w:color="E97132" w:themeColor="accent2" w:themeShade="BF"'))) + r('Times', font('Times New Roman') + sz(14) + u())),
    p(r('Misto ', A(11, u())) + r('GRANDE ', A(24, u())) + r('fim', A(11, u()))),
    p(r('Base ', A(18, u())) + r('sobre', A(18, u() + '<w:vertAlign w:val="superscript"/>')) + r(' meio ', A(18, u())) + r('sub', A(18, u() + '<w:vertAlign w:val="subscript"/>')) + r(' fim', A(18, u()))),
  ].join('');
  cases.push({ name: `ul-${st}`, docx: buildDocx({ defaults: docDefaults({ font: 'Arial', size: 11, after: 120 }), body }) });
}
