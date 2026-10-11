// Linha horizontal VML (v:rect o:hr="t", "Inserir linha horizontal"): altura da
// linha que ela ocupa, sozinha no parágrafo e depois/antes de texto no mesmo parágrafo.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const hr = (h = '1.5pt', w = '0', extra = '') => `<w:r><w:pict><v:rect id="_x0000_i1025" style="width:${w};height:${h}" o:hralign="center" o:hrstd="t" o:hr="t" fillcolor="#a0a0a0" stroked="f"${extra}/></w:pict></w:r>`;
const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11, after: 160, line: 259 }) });
const T = (t) => r(t);

export const cases = [];
cases.push({ name: 'hr-own', docx: D(p(T('Antes Hxg')) + p(hr()) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-own-10pt', docx: D(p(T('Antes Hxg')) + p(hr('10pt')) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-own-pct', docx: D(p(T('Antes Hxg')) + p(hr('1pt', '400pt', ' o:hrpct="990" o:hrnoshade="t"'), '<w:jc w:val="center"/>') + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-after-text', docx: D(p(T('Antes Hxg')) + p(T('texto antes do traco Hxg') + hr()) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-before-text', docx: D(p(T('Antes Hxg')) + p(hr() + T('texto depois do traco Hxg')) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-middle', docx: D(p(T('Antes Hxg')) + p(T('um lado Hxg') + hr() + T('outro lado Hxg')) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-after-text-10pt', docx: D(p(T('Antes Hxg')) + p(T('texto antes do traco Hxg') + hr('10pt')) + p(T('Depois Hxg'))) });
// altura da linha do traço alto (sozinho no parágrafo): 15 e 20 pt; e com largura em %
cases.push({ name: 'hr-own-15pt', docx: D(p(T('Antes Hxg')) + p(hr('15pt')) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-own-20pt', docx: D(p(T('Antes Hxg')) + p(hr('20pt')) + p(T('Depois Hxg'))) });
cases.push({ name: 'hr-own-pct-10pt', docx: D(p(T('Antes Hxg')) + p(hr('10pt', '400pt', ' o:hrpct="990" o:hrnoshade="t"'), '<w:jc w:val="center"/>') + p(T('Depois Hxg'))) });
