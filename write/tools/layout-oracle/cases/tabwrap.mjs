// Tab PADRÃO cuja parada passa da margem direita: a linha quebra ANTES dele, venha ou não
// conteúdo depois — parágrafo só de tabs, texto curto + tabs e alinhado à direita, modos 11
// e 15 (corpus t70: parágrafos de tabs no topo da página davam uma linha a menos). Times 12,
// Carta, tab padrão 708: cabem 12 paradas na linha de 8838 tw.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const sect = sectPr({ w: 12240, h: 15840, top: 851, bottom: 851, left: 1701, right: 1701 });
export const cases = [];
for (const compat of [11, 15]) {
  const D = (body) => buildDocx({ body, compat, defaultTab: 708, defaults: docDefaults({ font: 'Times New Roman', size: 12 }), sect });
  let body = '';
  for (const n of [11, 12, 13, 14, 24, 25, 26, 30]) body += p(r('\t'.repeat(n))) + p(r(`Marca ${n} Hxg`));
  cases.push({ name: `tw${compat}-only`, docx: D(body) });
  body = '';
  for (const n of [10, 11, 12, 14, 22]) body += p(r('ab' + '\t'.repeat(n))) + p(r(`Depois texto ${n} Hxg`));
  for (const n of [10, 12, 13, 14]) body += p(r('\t'.repeat(n)), '<w:jc w:val="right"/>') + p(r(`Direita ${n} Hxg`));
  cases.push({ name: `tw${compat}-text`, docx: D(body) });
}
