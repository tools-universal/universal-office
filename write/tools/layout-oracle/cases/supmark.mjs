// Parágrafo VAZIO com a marca em sobrescrito/subscrito: a altura da linha usa o corpo
// reduzido (~65%) ou o corpo normal? Corpo 11 e 14; entrelinha simples e 1,15.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

export const cases = [];
for (const [font, size] of [['Calibri Light', 11], ['Arial', 14]]) {
  const f = font === 'Arial' ? 'ar' : 'cl';
  for (const va of ['superscript', 'subscript']) {
    for (const line of [240, 276]) {
      const mark = `<w:spacing w:after="0" w:line="${line}" w:lineRule="auto"/><w:rPr><w:vertAlign w:val="${va}"/></w:rPr>`;
      const body = p(r('Antes Hxg')) + p('', mark) + p(r('Meio Hxg')) + p('', mark) + p('', mark) + p(r('Depois Hxg'));
      cases.push({ name: `sm-${f}-${va.slice(0, 3)}-l${line}`, docx: buildDocx({ body, defaults: docDefaults({ font, size }) }) });
    }
  }
}
