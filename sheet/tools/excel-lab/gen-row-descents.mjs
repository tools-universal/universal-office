// Gera packages/sheet/src/row-descent-data.ts: tmDescent do GDI (px a 96 dpi)
// por família/ppem. A altura automática de uma linha com texto de VÁRIAS linhas
// (quebra) é n·R(fonte) + máx(0, descent(Normal) − descent(fonte)) — o Excel
// alinha a última linha na base compartilhada da linha (medido, lab e20–e28).
//  1. gdi-descent.ps1 mede as famílias INSTALADAS (ppem 4..40, normal/negrito);
//     família substituída pelo GDI (face ≠ pedida) fica de fora;
//  2. grava por família uma string base62 (um caractere por ppem); negrito só
//     onde difere do normal.
// Uso: node gen-row-descents.mjs <dirTemporário>
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sheetRoot = join(here, '..', '..');
const [tmp] = process.argv.slice(2);
if (!tmp) { console.error('uso: gen-row-descents.mjs <dirTemporário>'); process.exit(2); }
mkdirSync(tmp, { recursive: true });

// as famílias da tabela de alturas de linha (excel-metrics-data.ts)
const metrics = readFileSync(join(sheetRoot, 'packages', 'sheet-core', 'src', 'excel-metrics-data.ts'), 'utf8');
const rowPx = metrics.slice(metrics.indexOf('export const ROW_PX:'), metrics.indexOf('};', metrics.indexOf('export const ROW_PX:')));
const FAMILIES = [...rowPx.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]);
const PMIN = 4, PMAX = 40;
const out = join(tmp, 'descent-gdi.json');
const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'gdi-descent.ps1'),
  '-Fonts', FAMILIES.join(','), '-Ppems', `${PMIN}-${PMAX}`, '-Out', out], { encoding: 'utf8', windowsHide: true });
if (r.status) { console.error(r.stdout, r.stderr); process.exit(1); }
const gdi = JSON.parse(readFileSync(out, 'utf8').replace(/^﻿/, ''));
const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const reg = {}, bold = {}, skipped = [];
for (const fam of FAMILIES) {
  const R = gdi[`${fam}|0`], B = gdi[`${fam}|1`];
  if (!R || R.face.toLowerCase() !== fam.toLowerCase()) { skipped.push(`${fam}→${R?.face}`); continue; }
  const enc = (d) => d.map((v) => B62[Math.min(61, v)]).join('');
  reg[fam] = enc(R.d);
  if (B && B.face.toLowerCase() === fam.toLowerCase() && enc(B.d) !== reg[fam]) bold[fam] = enc(B.d);
}
const lines = (o) => Object.entries(o).map(([k, v]) => `  ${JSON.stringify(k)}: '${v}',`).join('\n');
writeFileSync(join(sheetRoot, 'packages', 'sheet', 'src', 'row-descent-data.ts'), `// GERADO por tools/excel-lab/gen-row-descents.mjs — não editar à mão.
// tmDescent do GDI (px a 96 dpi) por família, ppem ${PMIN}..${PMAX}, um caractere base62
// por ppem; ROW_DESC_BOLD só onde o negrito difere.
export const DESC_PPEM_MIN = ${PMIN};
export const DESC_PPEM_MAX = ${PMAX};
export const ROW_DESC: Record<string, string> = {
${lines(reg)}
};
export const ROW_DESC_BOLD: Record<string, string> = {
${lines(bold)}
};
`);
console.log(Object.keys(reg).length, 'famílias; negrito diferente:', Object.keys(bold).length, '; fora (substituídas):', skipped.join(', '));
