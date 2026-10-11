// Quebra de coluna no fim de um parágrafo, numa seção contínua de 2 colunas
// desiguais (documento convertido de PDF: número na coluna estreita, texto na
// larga): a marca do parágrafo vai para a coluna seguinte? Onde começa a 2ª coluna?
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const pg = '<w:pgSz w:w="11900" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="0" w:footer="0" w:gutter="0"/>';
const sect1 = `<w:sectPr>${pg}<w:cols w:space="0"/></w:sectPr>`;
const sect2 = `<w:sectPr><w:type w:val="continuous"/>${pg}<w:cols w:num="2" w:space="0" w:equalWidth="0"><w:col w:w="660" w:space="360"/><w:col w:w="8006"/></w:cols></w:sectPr>`;
const exact = (tw, runs = '') => p(runs, `<w:spacing w:line="${tw}" w:lineRule="exact"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr>`);
const cb = '<w:r><w:br w:type="column"/></w:r>';
const text = p(r(lorem(50, 3), '<w:sz w:val="22"/>'), '<w:spacing w:line="282" w:lineRule="auto"/><w:jc w:val="both"/><w:rPr><w:sz w:val="22"/></w:rPr>');
const intro = p(r('Antes da secao Hxg'), `<w:rPr></w:rPr>${sect1}`.replace('<w:rPr></w:rPr>', ''));
const introP = `<w:p><w:pPr>${sect1}</w:pPr>${r('Antes da secao Hxg')}</w:p>`;
const after = `<w:p><w:pPr>${sect2}</w:pPr></w:p>` + p(r('Depois Hxg'));
const defaults = docDefaults({ font: 'Calibri', size: 10 });
void intro;
export const cases = [
  // como no documento: vazio exato, número, vazio exato com a quebra | texto
  { name: 'cb-exact-mark', docx: buildDocx({ body: introP + exact(213) + p(r('IV.'), '<w:spacing w:line="0" w:lineRule="atLeast"/><w:ind w:left="440"/>') + exact(213, cb) + text + after, defaults }) },
  // a quebra num parágrafo normal (sem entrelinha exata)
  { name: 'cb-plain-mark', docx: buildDocx({ body: introP + p(r('IV.')) + p(cb) + text + after, defaults }) },
  // a quebra no fim do parágrafo do número
  { name: 'cb-end-of-num', docx: buildDocx({ body: introP + p(r('IV.') + cb) + text + after, defaults }) },
  // texto depois da quebra no mesmo parágrafo
  { name: 'cb-text-after', docx: buildDocx({ body: introP + p(r('IV.') + cb + r('Texto na coluna larga Hxg')) + text + after, defaults }) },
];
// seção de UMA coluna: a quebra de coluna vira quebra de página — a marca vai junto?
cases.push({ name: 'cb-onecol-end', docx: buildDocx({ body: p(r('Primeira Hxg') + cb) + p(r('Segunda pagina Hxg')) + p(r('Mais Hxg')), defaults }) });
cases.push({ name: 'cb-onecol-alone', docx: buildDocx({ body: p(r('Primeira Hxg')) + p(cb) + p(r('Segunda pagina Hxg')) + p(r('Mais Hxg')), defaults }) });
cases.push({ name: 'pb-onecol-end', docx: buildDocx({ body: p(r('Primeira Hxg') + '<w:r><w:br w:type="page"/></w:r>') + p(r('Segunda pagina Hxg')) + p(r('Mais Hxg')), defaults }) });
// parágrafo VAZIO que carrega a quebra (seção seguinte contínua): ocupa a linha?
const emptySect = (line) => `<w:p><w:pPr><w:spacing w:line="${line}" w:lineRule="auto"/>${sect1}</w:pPr></w:p>`;
const sect2one = `<w:sectPr><w:type w:val="continuous"/>${pg}<w:cols w:space="0"/></w:sectPr>`;
const afterOne = `<w:p><w:pPr>${sect2one}</w:pPr></w:p>` + p(r('Depois Hxg'));
cases.push({ name: 'cb-emptysect-2col', docx: buildDocx({ body: p(r('Antes da secao Hxg')) + emptySect(286) + exact(196) + p(r('IV.'), '<w:spacing w:line="0" w:lineRule="atLeast"/><w:ind w:left="320"/>') + exact(196, cb) + text + after, defaults }) });
cases.push({ name: 'cb-emptysect-1col', docx: buildDocx({ body: p(r('Antes da secao Hxg')) + emptySect(286) + p(r('Proxima secao Hxg')) + text + afterOne, defaults }) });
cases.push({ name: 'cb-textsect-2col', docx: buildDocx({ body: `<w:p><w:pPr><w:spacing w:line="286" w:lineRule="auto"/>${sect1}</w:pPr>${r('Com texto Hxg')}</w:p>` + exact(196) + p(r('IV.'), '<w:spacing w:line="0" w:lineRule="atLeast"/><w:ind w:left="320"/>') + exact(196, cb) + text + after, defaults }) });
// … com espaçamento antes/depois, fonte grande, e com a seção seguinte em nova página
const emptySectP = (ppr) => `<w:p><w:pPr>${ppr}${sect1}</w:pPr></w:p>`;
cases.push({ name: 'cb-emptysect-spacing', docx: buildDocx({ body: p(r('Antes da secao Hxg')) + emptySectP('<w:spacing w:before="240" w:after="480"/>') + p(r('Proxima secao Hxg')) + text + afterOne, defaults }) });
cases.push({ name: 'cb-emptysect-big', docx: buildDocx({ body: p(r('Antes da secao Hxg')) + emptySectP('<w:rPr><w:sz w:val="48"/></w:rPr>') + p(r('Proxima secao Hxg')) + text + afterOne, defaults }) });
cases.push({ name: 'cb-emptysect-after-sp', docx: buildDocx({ body: p(r('Antes da secao Hxg'), '<w:spacing w:after="400"/>') + emptySectP('') + p(r('Proxima secao Hxg'), '<w:spacing w:before="100"/>') + text + afterOne, defaults }) });
// espaçamento através da quebra contínua (parágrafo da quebra COM texto)
cases.push({ name: 'cb-textsect-after-sp', docx: buildDocx({ body: p(r('Antes Hxg')) + `<w:p><w:pPr><w:spacing w:after="400"/>${sect1}</w:pPr>${r('Com texto Hxg')}</w:p>` + p(r('Proxima secao Hxg'), '<w:spacing w:before="100"/>') + text + afterOne, defaults }) });
cases.push({ name: 'cb-textsect-before-big', docx: buildDocx({ body: p(r('Antes Hxg')) + `<w:p><w:pPr><w:spacing w:after="100"/>${sect1}</w:pPr>${r('Com texto Hxg')}</w:p>` + p(r('Proxima secao Hxg'), '<w:spacing w:before="400"/>') + text + afterOne, defaults }) });
// vazio da quebra com o anterior tendo "depois" maior que o "antes" do seguinte
cases.push({ name: 'cb-emptysect-before-big', docx: buildDocx({ body: p(r('Antes da secao Hxg'), '<w:spacing w:after="100"/>') + emptySectP('') + p(r('Proxima secao Hxg'), '<w:spacing w:before="400"/>') + text + afterOne, defaults }) });
// … logo depois de uma TABELA
const tbl1 = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>' + p(r('Celula Hxg')) + '</w:tc></w:tr></w:tbl>';
cases.push({ name: 'cb-emptysect-aftertbl', docx: buildDocx({ body: p(r('Antes Hxg')) + tbl1 + emptySectP('') + p(r('Proxima secao Hxg')) + text + afterOne, defaults }) });
// como no formulário de ata: tabela, vazio da quebra (antes/depois 6), vazio (6/6), texto (6/6)
{
  const sp = '<w:spacing w:before="120" w:after="120"/>';
  const es = `<w:p><w:pPr>${sp}${sect1}</w:pPr></w:p>`;
  cases.push({ name: 'cb-tbl-sp-empty-text', docx: buildDocx({ body: p(r('Antes Hxg')) + tbl1 + es + p('', sp) + p(r('Texto depois Hxg'), sp) + afterOne, defaults }) });
  cases.push({ name: 'cb-tbl-sp-text', docx: buildDocx({ body: p(r('Antes Hxg')) + tbl1 + es + p(r('Texto depois Hxg'), sp) + afterOne, defaults }) });
  cases.push({ name: 'cb-par-sp-empty-text', docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Paragrafo Hxg')) + es + p('', sp) + p(r('Texto depois Hxg'), sp) + afterOne, defaults }) });
}
// parágrafo (depois A) + vazio da quebra + vazio (antes B1, depois A1) + texto (antes B2)
{
  const es = `<w:p><w:pPr>${sect1}</w:pPr></w:p>`;
  const spx = (b, a) => `<w:spacing w:before="${b * 20}" w:after="${a * 20}"/>`;
  for (const [A, B1, A1, B2] of [[0, 0, 0, 6], [0, 6, 0, 0], [0, 0, 6, 0], [10, 6, 6, 6], [0, 6, 6, 0], [10, 0, 0, 0]]) {
    cases.push({ name: `cb-seq-a${A}-e${B1}${A1}-t${B2}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Paragrafo Hxg'), spx(0, A)) + es + p('', spx(B1, A1)) + p(r('Texto depois Hxg'), spx(B2, 0)) + afterOne, defaults }) });
  }
}
// modos de compatibilidade 11 e 14: depois de tabela e depois de parágrafo
{
  const sp = '<w:spacing w:before="120" w:after="120"/>';
  const es = `<w:p><w:pPr>${sp}${sect1}</w:pPr></w:p>`;
  for (const compat of [11, 14]) {
    cases.push({ name: `cb-tbl-sp-empty-text-c${compat}`, docx: buildDocx({ body: p(r('Antes Hxg')) + tbl1 + es + p('', sp) + p(r('Texto depois Hxg'), sp) + afterOne, defaults, compat }) });
    cases.push({ name: `cb-par-sp-empty-text-c${compat}`, docx: buildDocx({ body: p(r('Antes Hxg')) + p(r('Paragrafo Hxg')) + es + p('', sp) + p(r('Texto depois Hxg'), sp) + afterOne, defaults, compat }) });
    cases.push({ name: `cb-emptysect-aftertbl-c${compat}`, docx: buildDocx({ body: p(r('Antes Hxg')) + tbl1 + emptySectP('') + p(r('Proxima secao Hxg')) + text + afterOne, defaults, compat }) });
  }
}
// vazio da quebra antes de seção contínua de DUAS colunas (assinaturas): o 1º
// parágrafo da coluna leva o "antes" inteiro
{
  const sp = '<w:spacing w:before="240" w:after="240"/>';
  const es2 = `<w:p><w:pPr>${sp}${sect1}</w:pPr></w:p>`;
  const after2 = `<w:p><w:pPr>${sp}${sect2.replace('w:w="660" w:space="360"/><w:col w:w="8006"/>', 'w:w="4000" w:space="660"/><w:col w:w="4000"/>')}</w:pPr></w:p>`;
  for (const compat of [11, 15]) {
    cases.push({ name: `cb-sig2col-c${compat}`, docx: buildDocx({ body: p(r('Local e data Hxg'), sp) + p('', sp) + es2 + p(r('Assinatura um Hxg'), sp) + p(r('Empresa Hxg'), sp) + after2 + p(r('Depois Hxg')), defaults, compat }) });
  }
}
