// Sonda de geometria dos sublinhados por corpo e fonte: um .docx por (fonte, estilo),
// um parágrafo por corpo. pdf-paths.py + fit-ul.mjs tiram a regra do Word.
//   node gen-ulsize-probe.mjs <pasta>
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildDocx, docDefaults, p, r, font, sz } from '../layout-oracle/docx-builder.mjs';

export const SIZES = [6, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72];
export const FONTS = [['Arial', ''], ['Arial', '<w:b/>'], ['Times New Roman', ''], ['Calibri', ''], ['Courier New', ''], ['Verdana', ''], ['Cambria', ''], ['Georgia', ''], ['Arial', '<w:i/>']];
export const STYLES = ['single', 'double', 'thick', 'wave', 'wavyDouble', 'wavyHeavy', 'dotted'];

/** As sondas: [nome "Fonte[-b|-i]__estilo", bytes do .docx]. */
export function ulsizeDocs() {
  const out = [];
  for (const [f, extra] of FONTS) {
    for (const st of STYLES) {
      const body = SIZES.map((pt) => p(r('Hx', font(f) + extra + sz(pt) + `<w:u w:val="${st}"/>`))).join('');
      const tag = `${f.replace(/ /g, '')}${extra === '<w:b/>' ? '-b' : extra === '<w:i/>' ? '-i' : ''}`;
      out.push([`${tag}__${st}`, buildDocx({ defaults: docDefaults({ font: f, size: 11, after: 0 }), body })]);
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2];
  mkdirSync(out, { recursive: true });
  for (const [name, bytes] of ulsizeDocs()) writeFileSync(`${out}/${name}.docx`, bytes);
  console.log(`${FONTS.length * STYLES.length} sondas em ${out}`);
}
