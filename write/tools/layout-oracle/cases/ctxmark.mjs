// Espaçamento contextual (w:contextualSpacing) num parágrafo cuja MARCA é maior que o
// texto, seguido de um parágrafo do mesmo estilo SEM contextual e com "antes": quanto
// fica entre os dois? Variações: sem a marca maior, sem o contextual, só a marca.
// Arial 11, entrelinha 1,5, depois 8 pt (como um Normal comum).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const D = (body) => buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11, after: 160, line: 360 }) });
const B240 = '<w:spacing w:before="240"/>';
const MARK26 = '<w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>';
const CTX = '<w:contextualSpacing/>';
const tail = p(r('segundo Hxg'), B240) + p(r('terceiro Hxg'), B240) + p(r('Fim Hxg'));
const head = p(r('Antes Hxg'), B240);

export const cases = [];
cases.push({ name: 'cm-ctx-mark26', docx: D(head + p(r('titulo Hxg'), B240 + CTX + MARK26) + tail) });
cases.push({ name: 'cm-ctx', docx: D(head + p(r('titulo Hxg'), B240 + CTX) + tail) });
cases.push({ name: 'cm-mark26', docx: D(head + p(r('titulo Hxg'), B240 + MARK26) + tail) });
cases.push({ name: 'cm-none', docx: D(head + p(r('titulo Hxg'), B240) + tail) });
// marca menor que o texto
cases.push({ name: 'cm-ctx-mark16', docx: D(head + p(r('titulo Hxg'), B240 + CTX + '<w:rPr><w:sz w:val="16"/></w:rPr>') + tail) });
