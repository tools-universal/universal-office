// Compressão da justificação × TIPO da palavra no fim da linha: o Word comprime
// os espaços para caber um pedaço de palavra que quebra no hífen? Palavras com
// aspas curvas, retas, parênteses, pontuação? Varredura: o mesmo parágrafo com a
// largura útil caindo de 2 em 2 twips; o limiar é o 1º passo em que o alvo
// desce para a 2ª linha.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
// [nome, alvo exibido, trecho que precisa caber na 1ª linha]
export const KINDS = [
  ['plain', 'palavra', 'palavra'],
  ['hyph', 'guarda-chuvaaaaaaaaaaaaaaaa', 'guarda-'],
  ['hyphnum', '12.345-678901234567890', '12.345-'],
  ['curly', '“palavra”', '“palavra”'],
  ['curlyopen', '“palavra', '“palavra'],
  ['curlyclose', 'palavra”', 'palavra”'],
  ['straight', '"palavra"', '"palavra"'],
  ['paren', '(palavra)', '(palavra)'],
  ['comma', 'palavra,', 'palavra,'],
];
// folga inicial (twips) — hífen e aspas curvas precisam começar bem folgados
export const START = { hyph: 400, curly: 400, curlyopen: 400, curlyclose: 400 };
export const sweep = [];
for (const font of ['Arial', 'Calibri']) for (const [kind, word, fit] of KINDS) sweep.push({ font, size: 11, n: 12, kind, word, fit });
export const cases = [];
sweep.forEach((cfg) => {
  const face = prov.face(cfg.font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * cfg.size * 20) / u, 0);
  const lead = Array.from({ length: cfg.n }, () => 'nn').join(' ');
  const first = `${lead} ${cfg.fit}`;
  const nat = W(first);
  const indL = Math.max(0, Math.round(TEXT_W - nat - 600));
  const avail0 = TEXT_W - indL;
  let body = '';
  // de "cabe com folga" até ~50% da largura do trecho a mais
  const slack = START[cfg.kind] ?? 20;
  const steps = Math.ceil((0.5 * W(cfg.fit) + slack + 20) / 4);
  for (let s = 0; s <= steps; s++) {
    const indR = Math.round(avail0 - nat) - slack + s * 4;
    body += p(r(`${lead} ${cfg.word} segunda linha continua`, sz(cfg.size)), `<w:jc w:val="both"/><w:ind w:left="${indL}" w:right="${Math.max(0, indR)}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `jk-${cfg.font.toLowerCase()}-${cfg.kind}`, docx: buildDocx({ body, defaults: docDefaults({ font: cfg.font, size: 11 }) }) });
});
