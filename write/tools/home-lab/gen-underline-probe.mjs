// Sonda dos sublinhados (w:u): um .docx por estilo, com o mesmo texto em vários
// corpos/fontes, cor de sublinhado, corpos misturados na linha e sobrescrito.
// O Word exporta o PDF (export-pdf.ps1) e pdf-paths.py lê o que ele desenhou.
//   node gen-underline-probe.mjs <pasta>
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildDocx, docDefaults, p, r, font, sz } from '../layout-oracle/docx-builder.mjs';

export const STYLES = ['single', 'words', 'double', 'thick', 'dotted', 'dottedHeavy', 'dash', 'dashedHeavy', 'dashLong',
  'dashLongHeavy', 'dotDash', 'dashDotHeavy', 'dotDotDash', 'dashDotDotHeavy', 'wave', 'wavyHeavy', 'wavyDouble'];

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const TXT = 'Hxg medida do sublinhado com espacos';
for (const st of STYLES) {
  const u = (extra = '') => `<w:u w:val="${st}"${extra}/>`;
  const body = [
    // 1–4: Arial em 4 corpos
    ...[10, 11, 24, 48].map((pt) => p(r(pt >= 48 ? 'Hxg medida' : TXT, font('Arial') + sz(pt) + u()))),
    // 5: Times New Roman 24
    p(r(TXT, font('Times New Roman') + sz(24) + u())),
    // 6: cor do sublinhado (vermelho) com texto azul
    p(r(TXT, font('Arial') + '<w:color w:val="0000FF"/>' + sz(24) + u(' w:color="FF0000"'))),
    // 7: corpos misturados na mesma linha (11 + 24 + 11)
    p(r('Hxg pequeno ', font('Arial') + sz(11) + u()) + r('GRANDE ', font('Arial') + sz(24) + u()) + r('pequeno fim', font('Arial') + sz(11) + u())),
    // 8: sobrescrito e subscrito no meio
    p(r('Base ', font('Arial') + sz(24) + u()) + r('sobre', font('Arial') + sz(24) + u() + '<w:vertAlign w:val="superscript"/>') + r(' meio ', font('Arial') + sz(24) + u()) + r('sub', font('Arial') + sz(24) + u() + '<w:vertAlign w:val="subscript"/>') + r(' fim', font('Arial') + sz(24) + u())),
    // 9: negrito (o Word engrossa o sublinhado do negrito?)
    p(r(TXT, font('Arial') + '<w:b/>' + sz(24) + u())),
    // 10: espaços no fim da linha e tab no meio
    p(r('Fim com espacos   ', font('Arial') + sz(24) + u()) + r('x', font('Arial') + sz(24))),
    p(r('Antes\tdepois do tab', font('Arial') + sz(24) + u())),
    // 12: cor automática sobre texto vermelho (cor do sublinhado segue o texto?)
    p(r(TXT, font('Arial') + '<w:color w:val="C00000"/>' + sz(24) + u())),
  ].join('');
  writeFileSync(`${out}/${st}.docx`, buildDocx({ defaults: docDefaults({ font: 'Arial', size: 11, after: 240 }), body }));
}
console.log(`${STYLES.length} sondas em ${out}`);
