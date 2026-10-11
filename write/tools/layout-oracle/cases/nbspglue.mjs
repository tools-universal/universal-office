// Espaço comum encostado num espaço não separável (NBSP): o Word NÃO quebra ali —
// "foo<NBSP><esp>bar", "foo<esp><NBSP>bar", "foo<esp><NBSP><esp>bar" ficam juntos,
// como se o espaço também fosse inseparável (a sequência inteira de espaços que
// toca o NBSP; dois espaços comuns quebram normalmente). Esquerda e justificado,
// largura útil crescendo dentro do token.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const f = prov.face('Arial', false, false).font;
const W = (s) => [...s].reduce((a, ch) => a + (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * 11 * 20) / f.metrics.unitsPerEm, 0);
const NB = '\u00a0';
const TOKS = [`foo${NB} bar`, `foo ${NB}bar`, `foo${NB}  bar`, `foo ${NB} bar`, `foo  ${NB}bar`, 'foo  bar', `foo${NB}bar baz`, `um${NB}dois${NB} tres`];
function doc(jc) {
  let body = '';
  for (const tok of TOKS) {
    const head = Array(20).fill('ab').join(' ') + ' ';
    const w0 = W(head), tw = W(tok);
    for (let k = 1; k <= 8; k++) {
      const A = Math.round(w0 + (tw * k) / 9) + 3;
      body += p(r(head + tok + ' fim da linha'), `<w:jc w:val="${jc}"/><w:spacing w:after="0"/><w:ind w:left="0" w:right="${TEXTW - A}"/>`);
    }
  }
  return buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) });
}
export const cases = [
  { name: 'ng-esquerda', docx: doc('left') },
  { name: 'ng-justificado', docx: doc('both') },
];
