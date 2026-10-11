// Campo de formulário FORMTEXT no meio do texto: o resultado padrão do Word é
// uma sequência de espaços "en" (U+2002); muitos modelos põem também espaços
// comuns. Como o resultado quebra/pendura no fim da linha? O prefixo varia de
// palavra em palavra para o campo cair em pontos diferentes da linha.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

const EN = ' ';
const fld = (res) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="Texto1"/><w:enabled/><w:calcOnExit w:val="0"/><w:textInput/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMTEXT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${res}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const words = lorem(60, 5).split(' ');
const KINDS = {
  en5: () => r(EN.repeat(5)),
  en4sp40en: () => r(EN.repeat(4)) + r(' '.repeat(40)) + r(EN),
  sp40: () => r(' '.repeat(40)),
  nome: () => r('Nome Completo Aqui'),
};
export const cases = [];
for (const [kind, res] of Object.entries(KINDS)) {
  for (const jc of ['left', 'both']) {
    let body = '';
    for (let k = 8; k <= 26; k++) {
      body += p(r(words.slice(0, k).join(' ') + ' ') + fld(res()) + r(', ' + lorem(16, k)), `<w:jc w:val="${jc}"/>`);
    }
    cases.push({ name: `ft-${kind}-${jc}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11, after: 120 }) }) });
  }
}
// campo começando PERTO da margem direita: o recuo direito varia para a borda
// cair antes/no meio/depois dos espaços "en" do resultado
{
  const base = 'Texto inicial da linha que ocupa quase toda a largura útil Hxg';
  // (só espaços "en" no resultado, com o campo cruzando a margem num parágrafo
  // justificado, o Word comprime os "en" bem além de 25% — regra ainda não medida)
  for (const [kind, res, inField] of [['fld-en4sp100en', () => r(EN.repeat(4)) + r(' '.repeat(100)) + r(EN), true],
    ['txt-en4sp100en', () => r(EN.repeat(4)) + r(' '.repeat(100)) + r(EN), false]]) {
    let body = '';
    for (let d = 0; d <= 26; d++) {
      const right = 8504 - 5500 - 20 * d; // área útil de 5500 a 6020 twips
      body += p(r(base + ' ') + (inField ? fld(res()) : res()) + r(', continua o texto Hxg ' + lorem(10, d)),
        `<w:jc w:val="both"/><w:ind w:right="${right}"/>`);
    }
    cases.push({ name: `ft-margem-${kind}`, docx: buildDocx({ body, defaults: docDefaults({ font: 'Calibri', size: 11, after: 120 }) }) });
  }
}
