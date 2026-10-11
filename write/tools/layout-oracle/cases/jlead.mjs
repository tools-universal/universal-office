// Espaços no INÍCIO de um segmento justificado (depois de tab / no início do
// parágrafo): não entram na compressão (o limiar é o de n espaços, não n+lead)
// nem na expansão (a 1ª palavra fica logo depois deles).
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const J = '<w:jc w:val="both"/>';
const tab = '<w:r><w:tab/></w:r>';
export const cases = [];
{
  const body = p(r('Rótulo:') + tab + r(' ' + lorem(60, 3)), J)
    + p(r('Rótulo:') + tab + r('  ' + lorem(60, 4)), J)
    + p(r('   ' + lorem(60, 5)), J);
  cases.push({ name: 'jlead-pos', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
const f = prov.face('Arial', false, false)?.font;
if (f) {
  const size = 11;
  const w = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * size * 20) / f.metrics.unitsPerEm, 0);
  const g = w(' ');
  let body = '';
  for (const lead of [1, 2]) for (const n of [6, 10]) {
    const base = 1418 + lead * g + n * (w('ab') + g);
    const W = w('de');
    for (let d = -4; d <= 4; d++) {
      const A = Math.round(base + W - (n === 6 ? 92 : 110) - 2 * d);
      body += p(r('Rótulo:') + tab + r(' '.repeat(lead) + Array(n).fill('ab').join(' ') + ' de fim da linha seguinte'),
        `${J}<w:tabs><w:tab w:val="left" w:pos="1418"/></w:tabs><w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  cases.push({ name: 'jlead-sweep', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size }) }) });
}
