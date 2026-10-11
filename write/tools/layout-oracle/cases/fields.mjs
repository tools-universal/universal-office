// Campos atualizados na exportação: o Word recalcula PAGEREF (sumário) e
// PAGE/NUMPAGES ao gerar o PDF, mesmo com resultado em cache errado? E REF,
// SEQ, DATE ficam com o cache?
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const fld = (instr, cached) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const bm = (id, name, inner) => `<w:bookmarkStart w:id="${id}" w:name="${name}"/>${inner}<w:bookmarkEnd w:id="${id}"/>`;
const pb = '<w:r><w:br w:type="page"/></w:r>';

export const cases = [];
{
  // sumário com cache errado (99): entradas com PAGEREF
  const toc = `<w:p>${'<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'}${r('Capitulo A Hxg')}<w:r><w:tab/></w:r>${fld('PAGEREF _Toc1 \\h', '99')}</w:p>`
    + `<w:p>${r('Capitulo B Hxg')}<w:r><w:tab/></w:r>${fld('PAGEREF _Toc2 \\h', '98')}</w:p>`
    + `<w:p>${r('Capitulo C Hxg')}<w:r><w:tab/></w:r>${fld('PAGEREF _Toc3 \\h', '97')}<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
  const tabs = '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8494"/></w:tabs>';
  const body = toc.replace(/<w:p>/g, `<w:p><w:pPr>${tabs}</w:pPr>`)
    + p(r('Referencia cruzada: pagina ') + fld('PAGEREF _Toc3 \\h', '77') + r(' fim Hxg'))
    + p(r('Total de paginas ') + fld('NUMPAGES', '55') + r(' e esta ') + fld('PAGE', '44') + r(' Hxg'))
    + p(r('REF texto: ') + fld('REF _Toc2 \\h', 'CACHE-REF') + r(' Hxg'))
    + p(r('SEQ: ') + fld('SEQ Tabela \\* ARABIC', '9') + r(' e ') + fld('SEQ Tabela \\* ARABIC', '9') + r(' Hxg'))
    + p(pb)
    + `<w:p>${bm(1, '_Toc1', r('Capitulo A Hxg'))}</w:p>`
    + p(pb) + p(pb)
    + `<w:p>${bm(2, '_Toc2', r('Capitulo B Hxg'))}</w:p>`
    + p(pb)
    + `<w:p>${bm(3, '_Toc3', r('Capitulo C Hxg'))}</w:p>`;
  cases.push({ name: 'fld-pageref', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
