// Sonda: sublinhado sobre corpos/fontes/posições MISTURADOS na mesma linha — um
// trecho contínuo sublinhado tem UMA geometria? Qual? Um .docx por estilo.
//   node gen-ulmix-probe.mjs <pasta>
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildDocx, docDefaults, p, r, font, sz } from '../layout-oracle/docx-builder.mjs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const A = (pt, extra = '') => font('Arial') + sz(pt) + extra;
export const CASES = [
  ['a 11+24', (u) => r('Pequeno ', A(11, u)) + r('GRANDE', A(24, u))],
  ['b 24+11', (u) => r('GRANDE ', A(24, u)) + r('pequeno', A(11, u))],
  ['c 11+18+24', (u) => r('Onze ', A(11, u)) + r('Dezoito ', A(18, u)) + r('Vinte', A(24, u))],
  ['d 11long+24short', (u) => r('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ', A(11, u)) + r('B', A(24, u))],
  ['e 11short+24long', (u) => r('a ', A(11, u)) + r('BBBBBBBBBBBBBBBB', A(24, u))],
  ['f Arial11+Times24', (u) => r('Arial onze ', A(11, u)) + r('Times vinte', font('Times New Roman') + sz(24) + u)],
  ['g 11+11bold', (u) => r('Normal ', A(11, u)) + r('Negrito', A(11, u + '<w:b/>'))],
  ['h 24+sup', (u) => r('Base ', A(24, u)) + r('sobre', A(24, u + '<w:vertAlign w:val="superscript"/>'))],
  ['i 24+sub', (u) => r('Base ', A(24, u)) + r('sub', A(24, u + '<w:vertAlign w:val="subscript"/>'))],
  ['j 24u+11+24u', (u) => r('Vinte ', A(24, u)) + r('onze sem ', A(11)) + r('Vinte', A(24, u))],
  ['k 11u+24+11u', (u) => r('Onze ', A(11, u)) + r('VINTE ', A(24)) + r('Onze', A(11, u))],
  ['l 24+pos', (u) => r('Base ', A(24, u)) + r('elevado', A(24, u + '<w:position w:val="12"/>')) + r(' fim', A(24, u))],
  ['m 24+lowered', (u) => r('Base ', A(24, u)) + r('rebaixado', A(24, u + '<w:position w:val="-12"/>')) + r(' fim', A(24, u))],
  ['n 11+sup11', (u) => r('Base ', A(11, u)) + r('sobre', A(11, u + '<w:vertAlign w:val="superscript"/>')) + r(' fim', A(11, u))],
  ['o 24+11+11', (u) => r('GRANDE ', A(24, u)) + r('pequeno ', A(11, u)) + r('pequeno', A(11, u))],
  ['p 11+24color', (u) => r('Preto ', A(11, u)) + r('Azul', A(24, u.replace('/>', ' w:color="0000FF"/>')))],
  ['q 11+48', (u) => r('Pequeno ', A(11, u)) + r('ENORME', A(48, u))],
  ['r 24+48+11', (u) => r('Vinte ', A(24, u)) + r('XL ', A(48, u)) + r('onze', A(11, u))],
];
for (const st of ['single', 'double', 'dotted', 'wave', 'thick']) {
  const u = `<w:u w:val="${st}"/>`;
  const body = CASES.map(([, f]) => p(f(u))).join('');
  writeFileSync(`${out}/${st}.docx`, buildDocx({ defaults: docDefaults({ font: 'Arial', size: 11, after: 200 }), body }));
}
console.log(`sondas em ${out}`);
