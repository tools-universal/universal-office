// w:useFELayout (compat): a fonte do Leste Asiático do run entra na altura da linha
// mesmo sem caracteres asiáticos? Cambria/Arial 18 e 11; eastAsia ausente, MS Mincho,
// SimSun; com e sem useFELayout.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

export const cases = [];
for (const fe of [false, true]) {
  for (const [font, ea] of [['Cambria', ''], ['Cambria', 'MS Mincho'], ['Arial', ''], ['Arial', 'SimSun'], ['Arial', 'Arial']]) {
    const rf = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"${ea ? ` w:eastAsia="${ea}"` : ''}/>`;
    let body = '';
    for (const s of [11, 18]) body += p(r(lorem(40, s), `${rf}<w:sz w:val="${s * 2}"/>`), `<w:rPr>${rf}<w:sz w:val="${s * 2}"/></w:rPr>`);
    const name = `fe${fe ? 1 : 0}-${font.toLowerCase()}-${ea ? ea.toLowerCase().replace(/\s+/g, '') : 'none'}`;
    cases.push({ name, docx: buildDocx({ body, defaults: docDefaults({ font, size: 11 }), ...(fe ? { extraCompat: '<w:useFELayout/>' } : {}) }) });
  }
}
