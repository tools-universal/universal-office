// Largura natural das linhas por fonte × tamanho (alinhado à esquerda, sem
// quebra): o Word usa o tamanho nominal ou o da grade de 600 dpi (10pt → 9,96)?
// Cada parágrafo é uma linha curta o bastante para não quebrar.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const TEXTS = [
  'Lorem ipsum dolor sit amet consectetur adipiscing elit',
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'Ação três vírgulas, pontos; números 0123456789 % ($)',
];
export const FONTS = ['Arial', 'Calibri', 'Calibri Light', 'Times New Roman', 'Verdana', 'Segoe UI', 'Georgia', 'Cambria'];
export const SIZES = [8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 14];
export const cases = [];
for (const font of FONTS) {
  let body = '';
  for (const size of SIZES) for (const t of TEXTS) body += p(r(t, sz(size)), '<w:spacing w:after="0"/>');
  cases.push({ name: `w-${font.toLowerCase().replace(/\s+/g, '-')}`, docx: buildDocx({ body, defaults: docDefaults({ font, size: 11 }) }) });
}
