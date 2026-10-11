// Fontes do Leste Asiático (MS Gothic, SimSun, Yu Gothic, Malgun…) e símbolos
// (Segoe UI Symbol) numa linha de texto latino: quanto a linha cresce? Caixa de
// seleção "☐" em MS Gothic (w:hint eastAsia) é o caso comum dos formulários.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const fnt = (f, hint = true) => `<w:rFonts w:ascii="${f}" w:eastAsia="${f}" w:hAnsi="${f}"${hint ? ' w:hint="eastAsia"' : ''}/>`;
// (Segoe UI Symbol fica de fora: numa linha mista o Word a mede de outro jeito — a investigar)
const FONTS = ['MS Gothic', 'MS Mincho', 'SimSun', 'Yu Gothic', 'Malgun Gothic', 'Microsoft YaHei', 'MS UI Gothic'];
export const cases = [];
for (const [base, size, line] of [['Calibri', 11, 259], ['Arial', 10, 240], ['Calibri', 12, 240]]) {
  let body = p(r('Inicio Hxg'));
  for (const f of FONTS) {
    body += p(r('☐', fnt(f) + sz(size)) + r(' Caixa ' + f + ' Hxg'));
    body += p(r('Texto Hxg ') + r('Latino', fnt(f, false) + sz(size)) + r(' Hxg'));
    body += p(r('Normal Hxg'));
  }
  cases.push({ name: `ea-${base.toLowerCase()}-${size}-${line}`, docx: buildDocx({ body, defaults: docDefaults({ font: base, size, after: 160, line }) }) });
}
