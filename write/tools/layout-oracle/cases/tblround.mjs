// Largura de coluna fracionária (pct): o Word arredonda a coluna para twips inteiros
// antes do teste de quebra W ≤ A? Tabela pct 100% em layout FIXO (sem o autoajuste
// alargar a coluna pelo conteúdo), sem bordas, 2 colunas; na 1ª, uma palavra só de
// letras (Calibri 11) com largura W a ±0,06 twip de round(coluna) − 216 e da largura
// fracionária. Larguras lineares (hmtx × tamanho nominal), como o oráculo fitwidth.
import { buildDocx, docDefaults, p, r, sz, font } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const f = prov.face('Calibri', false, false)?.font;
export const cases = [];
if (f) {
  const SIZE = 11;
  const tw = (ch) => (f.advanceWidth(f.glyphId(ch.codePointAt(0))) * SIZE * 20) / f.metrics.unitsPerEm;
  const fine = 'abcdefghijklmnpqrstuvwxyz'.split('');
  const combos = [];
  (function rec(start, left, acc, s) {
    combos.push({ acc, s });
    if (!left) return;
    for (let k = start; k < fine.length; k++) rec(k, left - 1, acc + tw(fine[k]), s + fine[k]);
  })(0, 4, 0, '');
  /** palavra (o… + até 4 letras) com largura mais próxima do alvo */
  const word = (target) => {
    let best = null;
    for (const c of combos) {
      const n = Math.round((target - c.acc) / tw('o'));
      if (n < 0) continue;
      const w = c.acc + n * tw('o');
      if (!best || Math.abs(w - target) < Math.abs(best.w - target)) best = { w, s: 'o'.repeat(n) + c.s };
    }
    return best.s;
  };
  for (const [compat, base] of [[15, 8504], [11, 8504 + 216]]) {
    let body = p(r('Inicio Hxg'));
    for (const k of [1001, 1002, 1009, 1011, 1013]) {
      const col = (base * k) / 5000, A = col - 216, Ar = Math.round(col) - 216;
      for (const [nm, t] of [['menos', Ar - 0.06], ['mais', Ar + 0.06], ['frac', A]]) {
        body += p(r(`Caso ${k} ${nm}`));
        body += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="1700"/><w:gridCol w:w="6804"/></w:tblGrid><w:tr>`
          + `<w:tc><w:tcPr><w:tcW w:w="${k}" w:type="pct"/></w:tcPr>${p(r(word(t), font('Calibri') + sz(SIZE)))}</w:tc>`
          + `<w:tc><w:tcPr><w:tcW w:w="${5000 - k}" w:type="pct"/></w:tcPr>${p('')}</w:tc></w:tr></w:tbl>`;
      }
    }
    body += p(r('Fim Hxg'));
    cases.push({ name: `tblround-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 9 }) }) });
  }
}
