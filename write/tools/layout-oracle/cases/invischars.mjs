// Caracteres invisíveis de largura zero no texto (BOM/ZWNBSP U+FEFF colado de
// sistemas web, ZWSP U+200B, ZWJ/ZWNJ): o Word não busca fonte para eles
// e a linha não cresce; o ZWNBSP também impede a quebra no espaço logo antes.
import { buildDocx, docDefaults, p, r, lorem } from '../docx-builder.mjs';

export const cases = [];
for (const [font, size] of [['Arial', 12], ['Calibri', 11]]) {
  const body = [0xfeff, 0x200b, 0x200d, 0x200c].map((cp) => {
    const z = String.fromCodePoint(cp);
    return p(r('Antes ' + z + lorem(25, cp % 7) + z + ', depois ' + z + lorem(20, 3)) + r(z + ' fim Hxg'));
  }).join('') + p(r('Controle ' + lorem(25, 2)));
  cases.push({ name: `inv-${font.toLowerCase()}`, docx: buildDocx({ body, defaults: docDefaults({ font, size, after: 120 }) }) });
}
