// Parágrafo justificado de formulário: vários campos FORMTEXT vazios (resultado
// "en, espaço, en, en, en" — U+2002) entre palavras. Os espaços "en" entram na
// compressão/expansão da justificação? O recuo direito varia para a quebra cair
// em pontos diferentes.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const EN = ' ';
const fld = (res) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="Texto1"/><w:enabled/><w:calcOnExit w:val="0"/><w:textInput/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMTEXT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${res}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const blank = () => fld(r(EN) + r(' ') + r(EN + EN + EN));
const words = ['Empresa', 'situada na rua', 'numero', 'bairro', 'cidade', 'CNPJ numero'];
export const cases = [];
for (const [name, mk, sep] of [['fj-campo', blank, ', '], ['fj-texto', () => r(EN) + r(' ') + r(EN + EN + EN), ', '], ['fj-campo-espaco', blank, ' ']]) {
  let body = '';
  for (let d = 0; d <= 30; d += 2) {
    let runs = '';
    // (com sep = ' ', o campo é o espaço antes da palavra seguinte: só os espaços
    // comuns contam na compressão — os "en" são de largura fixa)
    for (const w of words) runs += r(w + ' ') + mk() + r(sep);
    runs += r('vem, pelo presente, informar que ' + lorem(30, d));
    body += p(runs, `<w:jc w:val="both"/><w:ind w:right="${d * 20}"/><w:spacing w:after="120"/>`);
  }
  cases.push({ name, docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 12 }) }) });
}
