// Caixa de seleção (FORMCHECKBOX) maior que o texto, com entrelinha múltipla: a
// altura de texto da entrelinha conta a caixa?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const sz = (hp) => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
const cb = (size) => `<w:r><w:rPr>${sz(18)}</w:rPr><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="Sel1"/><w:enabled/><w:calcOnExit w:val="0"/><w:checkBox>${size ? `<w:size w:val="${size}"/>` : '<w:sizeAuto/>'}<w:default w:val="0"/></w:checkBox></w:ffData></w:fldChar></w:r><w:r><w:rPr>${sz(18)}</w:rPr><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r><w:rPr>${sz(18)}</w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr>${sz(18)}</w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
const defaults = docDefaults({ font: 'Calibri', size: 11 });
export const cases = [];
for (const line of [240, 360]) for (const size of [0, 22, 36]) {
  const body = p(r('Antes Hxg')) + p(r('Esta opcao corresponde a: ', sz(18)) + cb(size) + r(' Produto', sz(18)), `<w:spacing w:line="${line}" w:lineRule="auto"/>`) + p(r('Depois Hxg'));
  cases.push({ name: `cbl-l${line}-s${size}`, docx: buildDocx({ body, defaults }) });
}
