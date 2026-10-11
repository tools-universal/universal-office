// w:position (texto elevado/rebaixado, em meios-pontos): como entra na altura
// da linha — elevação/rebaixamento de TODOS os runs (inclusive a marca de
// parágrafo) ou só de um run; Times New Roman e Arial.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pos = (hp) => `<w:position w:val="${hp}"/>`;
export const cases = [];
for (const font of ['Times New Roman', 'Arial']) {
  const f = font === 'Arial' ? 'ar' : 'tnr';
  const defaults = docDefaults({ font, size: 11 });
  for (const hp of [4, 10, 20, 40, -4, -10, -20]) {
    const tag = hp > 0 ? `up${hp}` : `dn${-hp}`;
    // tudo deslocado (marca também)
    cases.push({ name: `pos-${f}-all-${tag}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r(lorem(70, 3), pos(hp)), `<w:rPr>${pos(hp)}</w:rPr>`) + p(r('Depois Hxg')) + p(r('Fim Hxg')), defaults }) });
    // só um run deslocado no meio do parágrafo
    cases.push({ name: `pos-${f}-run-${tag}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r(lorem(20, 4) + ' ') + r('DESLOCADO Hxg', pos(hp)) + r(' ' + lorem(50, 5))) + p(r('Depois Hxg')) + p(r('Fim Hxg')), defaults }) });
  }
}
// parágrafo VAZIO com a marca deslocada; entrelinha 1,5 com o texto elevado
for (const hp of [20, -20]) {
  const tag = hp > 0 ? `up${hp}` : `dn${-hp}`;
  cases.push({ name: `pos-empty-${tag}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p('', `<w:rPr>${pos(hp)}<w:sz w:val="16"/></w:rPr>`) + p(r('Depois Hxg')) + p('', `<w:rPr>${pos(hp)}</w:rPr>`) + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Times New Roman', size: 11 }) }) });
  cases.push({ name: `pos-line15-${tag}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r(lorem(70, 6), pos(hp)), `<w:spacing w:line="360" w:lineRule="auto"/><w:rPr>${pos(hp)}</w:rPr>`) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Times New Roman', size: 11 }) }) });
}
// parágrafo vazio / só de espaços com a marca elevada e entrelinha 1,5
{
  const mk = `<w:spacing w:line="360" w:lineRule="auto"/><w:rPr>${pos(20)}<w:sz w:val="20"/></w:rPr>`;
  const sp = r(' '.repeat(60), `${pos(20)}<w:sz w:val="20"/>`);
  const defaults = docDefaults({ font: 'Times New Roman', size: 11 });
  cases.push({ name: 'pos-empty15-up20', docx: buildDocx({ body: p(r('Antes Hxg')) + p('', mk) + p(r('Depois Hxg')), defaults }) });
  cases.push({ name: 'pos-spaces15-up20', docx: buildDocx({ body: p(r('Antes Hxg')) + p(sp, mk) + p(r('Depois Hxg')), defaults }) });
  cases.push({ name: 'pos-spaces-up20', docx: buildDocx({ body: p(r('Antes Hxg')) + p(sp, `<w:rPr>${pos(20)}<w:sz w:val="20"/></w:rPr>`) + p(r('Depois Hxg')), defaults }) });
}
