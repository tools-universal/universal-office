// Parágrafo com QUEBRA DE PÁGINA que não cabe no fim da página: a quebra fica
// nesta página (sem criar página em branco)? Onde vai a marca do parágrafo?
// (página cheia seguida de um parágrafo só com a quebra)
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const filler = (k) => p(r(`Linha ${k} Hxg`));
const fill = (n) => Array.from({ length: n }, (_, k) => filler(k + 1)).join('');
const PB = '<w:r><w:br w:type="page"/></w:r>';
const after = p(r('Depois Hxg')) + p(r('Depois 2'));
const defaults = docDefaults({ font: 'Arial', size: 11 });
export const cases = [];
for (const [name, body] of [
  // 55 linhas enchem a página; o parágrafo só com a quebra não cabe
  ['pf-only-break', fill(55) + p(PB) + after],
  // quebra + texto no mesmo parágrafo
  ['pf-break-text', fill(55) + p(PB + r('Texto Hxg')) + after],
  // texto + quebra (fim do parágrafo)
  ['pf-text-break', fill(55) + p(r('Fim Hxg') + PB) + after],
  // com folga: a quebra cabe (controle)
  ['pf-only-break-fits', fill(50) + p(PB) + after],
  // marca grande (Arial 24) no parágrafo da quebra, rente ao fim
  ['pf-only-break-big', fill(54) + p(PB, '<w:rPr><w:sz w:val="48"/></w:rPr>') + after],
]) cases.push({ name, docx: buildDocx({ body, defaults }) });
// modo 14 (sem splitPgBreakAndParaMark: a marca fica na linha da quebra)
for (const [name, body] of [
  ['pf14-only-break', fill(55) + p(PB) + after],
  ['pf14-break-text', fill(55) + p(PB + r('Texto Hxg')) + after],
  ['pf14-text-break', fill(55) + p(r('Fim Hxg') + PB) + after],
]) cases.push({ name, docx: buildDocx({ body, defaults, compat: 14 }) });
