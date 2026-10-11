// Sequência longa de espaços que cruza a margem direita: espaços comuns (U+0020)
// penduram além da margem; e espaços "en" (U+2002) misturados, como no
// resultado de campos FORMTEXT ("     ")? Texto de formulário sem nada.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const EN = ' ';
const head = lorem(9, 2) + ' ';
const fld = (res) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="Texto1"/><w:enabled/><w:calcOnExit w:val="0"/><w:textInput/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMTEXT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${res}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
export const cases = [];
const body = [
  p(r(head + 'x') + r(' '.repeat(80)) + r(', resto do texto Hxg')),
  p(r(head + 'x ') + r(EN.repeat(4)) + r(' '.repeat(80)) + r(EN) + r(', resto do texto Hxg')),
  p(r(head + 'x ') + fld(r(EN.repeat(4)) + r(' '.repeat(80)) + r(EN)) + r(', resto do texto Hxg')),
  p(r(head + 'x ') + r(EN.repeat(30)) + r(', resto do texto Hxg')),
  p(r(head + 'x ') + r(EN.repeat(4)) + r(', resto do texto Hxg ' + lorem(12, 3))),
  p(r(lorem(14, 4) + ' ') + r(EN.repeat(6)) + r(' fim Hxg')),
].join('');
cases.push({ name: 'spacerun', docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
{
  // o mesmo, justificado
  const J = '<w:jc w:val="both"/>';
  const body = [
    p(r(head + 'x') + r(' '.repeat(80)) + r(', resto do texto Hxg'), J),
    p(r(head + 'x ') + r(EN.repeat(4)) + r(' '.repeat(80)) + r(EN) + r(', resto do texto Hxg'), J),
    p(r(head + 'x ') + fld(r(EN.repeat(4)) + r(' '.repeat(80)) + r(EN)) + r(', resto do texto Hxg'), J),
    p(r(head + 'x ') + fld(r(EN.repeat(4)) + r(' '.repeat(80))) + r(', resto do texto Hxg'), J),
    p(r(head + 'x ') + fld(r(' '.repeat(80))) + r(', resto do texto Hxg'), J),
  ].join('');
  cases.push({ name: 'spacerun-just', docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11 }) }) });
}
