// Linha do traço horizontal VML (o:hr) sozinha no parágrafo: a altura é a da fonte do RUN do
// traço (a marca de parágrafo não conta) e o traço vale como objeto de altura h + 5 pt no pé
// dela; a entrelinha múltipla soma (fator − 1) × a altura da fonte. No cabeçalho (último
// parágrafo) ele define onde o corpo começa (corpus t253). Arial/Calibri, conteúdo inventado.
import { buildDocx, docDefaults, p, r, sz, sectPr } from '../docx-builder.mjs';

const hr = (h, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:pict><v:rect id="_x0000_i1025" style="width:0;height:${h}pt" o:hralign="center" o:hrstd="t" o:hr="t" fillcolor="#a0a0a0" stroked="f"/></w:pict></w:r>`;
const rf = (f) => `<w:rFonts w:ascii="${f}" w:hAnsi="${f}"/>`;
const defaults = docDefaults({ font: 'Arial', size: 11, after: 0, line: 276 });
const all = [];
for (const font of ['Arial', 'Calibri']) {
  // [tamanho da marca, do run do traço] em pt (null: o do estilo, 11)
  for (const [mark, run] of [[12, null], [11, 12], [20, 11], [8, 16]]) for (const h of [1.5, 10]) for (const line of ['auto276', 'auto240']) all.push({ font, mark, run, h, line });
  for (const line of ['exact300', 'atLeast400', 'auto360']) all.push({ font, mark: 12, run: null, h: 1.5, line });
  all.push({ font, mark: 12, run: null, h: 20, line: 'auto276' });
}
const spacing = (c) => {
  const [, rule, v] = c.line.match(/([a-zA-Z]+?)(\d+)$/);
  return `<w:spacing w:before="0" w:after="0" w:line="${v}" w:lineRule="${rule}"/>`;
};
export const cases = [];
for (let k = 0; k * 10 < all.length; k++) {
  let body = '';
  all.slice(k * 10, (k + 1) * 10).forEach((c, j) => {
    const i = k * 10 + j;
    const base = '<w:spacing w:after="0" w:line="276" w:lineRule="auto"/>';
    body += p(r(`Ante${i} Hxg`, rf(c.font) + sz(10)), base);
    body += `<w:p><w:pPr>${spacing(c)}<w:ind w:hanging="30"/><w:jc w:val="center"/><w:rPr>${rf(c.font)}${sz(c.mark)}</w:rPr></w:pPr>${hr(c.h, rf(c.font) + (c.run ? sz(c.run) : ''))}</w:p>`;
    body += p(r(`Depo${i} Hxg`, rf(c.font) + sz(10)), base);
  });
  cases.push({ name: `hrf-body-${k}`, docx: buildDocx({ body, defaults }) });
}
// no cabeçalho: último parágrafo de um cabeçalho alto (empurra o corpo)
for (const [mark, run] of [[12, null], [12, 11], [8, 16]]) {
  const hdr = [1, 2, 3, 4].map((n) => p(r(`Cab linha ${n}`, sz(10)))).join('')
    + `<w:p><w:pPr><w:ind w:hanging="30"/><w:jc w:val="center"/><w:rPr>${sz(mark)}</w:rPr></w:pPr>${hr(1.5, run ? sz(run) : '')}</w:p>`;
  cases.push({ name: `hrf-hdr-${mark}-${run ?? 'n'}`, docx: buildDocx({ body: p(r('Corpo Hxg primeira')) + p(r('Corpo Hxg segunda')), headers: { default: hdr }, defaults, sect: sectPr({ top: 567, header: 0 }) }) });
}
