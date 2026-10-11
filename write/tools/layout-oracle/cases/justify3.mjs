// Reproduz linhas do grupo justify em que o Word REJEITOU a próxima palavra
// com compressão baixa (~15%): varre o recuo direito para achar o limiar.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
export const configs = [
  ['Calibri', 11, 'À período dados contrato procedimento os de é empresa segurança operação não documento', 'o', 'análise serviço área execução processo'],
  ['Calibri', 11, 'Período dados contrato procedimento os de é empresa segurança operação não documento', 'o', 'análise serviço área execução processo'],
  ['Calibri', 11, 'mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm', 'o', 'análise serviço área execução processo'],
  ['Calibri', 11, 'mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm mmmm', 'oooo', 'análise serviço área execução processo'],
  ['Times New Roman', 10, 'à período dados contrato procedimento os', 'de', 'é empresa segurança operação'],
  ['Verdana', 11, 'tório prazo atendimento informação as em', 'à', 'período dados contrato'],
  ['Calibri', 11, 'À período dados contrato procedimento os de é empresa segurança operação não documento', 'o', 'análise serviço área execução processo', 'left'],
  ['Calibri', 11, 'A periodo dados contrato procedimento os de e empresa seguranca operacao nao documento', 'o', 'analise servico area execucao processo'],
  ['Calibri', 11, 'À período dados contrato procedimento os de é empresa segurança operação não documento', 'xo', 'análise serviço área execução processo'],
];
export const cases = [];
configs.forEach(([font, size, head, next, tail, jc = 'both'], ci) => {
  const face = prov.face(font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * size * 20) / u, 0);
  const first = `${head} ${next}`;
  const nat = W(first);
  const spaces = first.split(' ').length - 1;
  const sp = W(' ');
  const lo = TEXT_W - nat - 0.02 * spaces * sp;
  const steps = Math.ceil((0.42 * spaces * sp) / 4);
  let body = '';
  for (let k = 0; k <= steps; k++) {
    const ind = Math.max(0, Math.round(lo + k * 4));
    body += p(r(`${first} ${tail} continua`, sz(size)), `<w:jc w:val="${jc}"/><w:ind w:right="${ind}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `rej-${ci}`, docx: buildDocx({ body, defaults: docDefaults({ font, size: 11 }) }) });
});
