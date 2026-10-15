// Gera packages/sheet-core/src/excel-metrics-data.ts a partir das medidas do
// Excel (lab de corpus, fora do git — ver E:\UniversalSheetTest\_lab\gen-metrics*.mjs):
//  - rowpx-low.json: { família: { "<ppem>": px, "b<ppem>": px } } ppem 4..40 (Normal Calibri 3 pt);
//  - rowpx.json: idem ppem 8..96 (Normal Calibri 11 — vale a partir de ppem 21);
//  - mdw.json: { família: { "<ppem>": { mdw, def, row } } } fonte Normal ppem 8..32.
// Uso: node gen-grid-metrics.mjs <rowpx-low.json> <rowpx.json> <mdw.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [lowF, hiF, mdwF] = process.argv.slice(2);
const low = JSON.parse(readFileSync(lowF, 'utf8'));
const hi = JSON.parse(readFileSync(hiF, 'utf8'));
const mdw = JSON.parse(readFileSync(mdwF, 'utf8'));
const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const enc = (v) => { if (v < 0 || v >= 62) throw new Error(`fora da faixa: ${v}`); return B62[v]; };
const key = (f) => f.toLowerCase();

const PMIN = 4, PMAX = 96;
const rows = {}, bold = {}, mdws = {};
for (const fam of Object.keys(low)) {
  // 1º caractere = px no ppem 4; depois o DELTA para o ppem anterior + 16
  let s = '', sb = '', prev = 0, prevB = 0;
  for (let p = PMIN; p <= PMAX; p++) {
    const v = p >= 21 && hi[fam]?.[p] !== undefined ? hi[fam][p] : low[fam]?.[p] ?? hi[fam]?.[p];
    const vb = p <= 40 ? low[fam]?.['b' + p] ?? v : v;
    s += p === PMIN ? enc(v) : enc(v - prev + 16);
    if (p <= 40) sb += p === PMIN ? enc(vb) : enc(vb - prevB + 16);
    prev = v; prevB = vb;
  }
  rows[key(fam)] = s;
  if (sb !== s.slice(0, sb.length)) bold[key(fam)] = sb;
}
for (const fam of Object.keys(mdw)) {
  let s = '';
  for (let p = 8; p <= 32; p++) s += enc(mdw[fam][p].mdw);
  mdws[key(fam)] = s;
}
const out = `// GERADO por tools/excel-lab/gen-grid-metrics.mjs — não editar à mão.
// Geometria do grid MEDIDA no Excel 365 (Windows, 96 dpi) com pastas sintéticas:
//  ROW_PX[família]: altura (px) de uma linha auto-ajustada cuja maior fonte é a
//    família no ppem 4..96 (ppem = tamanho pt · 4/3 arredondado); um caractere
//    base62 por ppem: o 1º é o px no ppem 4, os demais o delta ao anterior + 16.
//  ROW_PX_BOLD[família]: idem em negrito, ppem 4..40 (só famílias que mudam).
//  MDW[família]: largura do dígito máximo (px) da fonte Normal, ppem 8..32.
export const ROW_PPEM_MIN = ${PMIN};
export const ROW_PPEM_MAX = ${PMAX};
export const MDW_PPEM_MIN = 8;
export const MDW_PPEM_MAX = 32;
export const ROW_PX: Record<string, string> = {
${Object.entries(rows).map(([k, v]) => `  ${JSON.stringify(k)}: '${v}',`).join('\n')}
};
export const ROW_PX_BOLD: Record<string, string> = {
${Object.entries(bold).map(([k, v]) => `  ${JSON.stringify(k)}: '${v}',`).join('\n')}
};
export const MDW: Record<string, string> = {
${Object.entries(mdws).map(([k, v]) => `  ${JSON.stringify(k)}: '${v}',`).join('\n')}
};
`;
const target = join(here, '..', '..', 'packages', 'sheet-core', 'src', 'excel-metrics-data.ts');
writeFileSync(target, out);
console.log(`${Object.keys(rows).length} famílias (negrito diferente: ${Object.keys(bold).length}); MDW: ${Object.keys(mdws).length} → ${target}`);
