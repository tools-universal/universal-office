#!/usr/bin/env node
// Fontes PROPRIETÁRIAS que os demos, labs e testes de fidelidade usam (Aptos,
// Aptos Narrow/Display, Calibri, Arial) NÃO ficam no repositório — a licença
// ("Microsoft supplied font") só permite usá-las no produto em que vieram.
// Este script as copia das fontes INSTALADAS nesta máquina (Windows\Fonts,
// fontes do usuário e o cache CloudFonts do Office 365, onde moram as Aptos)
// para os caminhos que os demos/labs esperam — todos ignorados pelo git.
//
//   npm run fonts:sync              # copia o que falta
//   npm run fonts:sync -- --force   # recopia tudo
//
// Sem a fonte na máquina, o caminho fica vazio e o app cai na substituta
// aberta (Liberation Sans) — renderiza, mas sem fidelidade de métricas.
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMeta } from './font-license.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const force = process.argv.includes('--force');

/** Destino (relativo à raiz) → família/peso/itálico. */
const four = (dir, family, name) => [
  [`${dir}/${name}-regular.ttf`, family, 400, false],
  [`${dir}/${name}-bold.ttf`, family, 700, false],
  [`${dir}/${name}-italic.ttf`, family, 400, true],
  [`${dir}/${name}-bolditalic.ttf`, family, 700, true],
];
const MANIFEST = [
  // slides: demo (index.html) e lab de fidelidade (harness.html)
  ...four('slides/packages/slides/demo/fonts', 'Aptos', 'aptos'),
  ...four('slides/tools/ppt-lab/fonts', 'Aptos', 'aptos'),
  ...four('slides/packages/slides/demo/fonts/os', 'Arial', 'arial'),
  ...four('slides/packages/slides/demo/fonts/os', 'Calibri', 'calibri'),
  // sheet: demo, lab do Excel e testes de PDF (sheet/export, dotnet)
  ...four('sheet/packages/sheet/demo/fonts', 'Aptos Narrow', 'aptos-narrow'),
  ...four('sheet/tools/excel-lab/fonts', 'Aptos Narrow', 'aptos-narrow'),
  // site (universal-office.js carrega por nome)
  ...four('site/assets/fonts', 'Aptos', 'aptos'),
  ['site/assets/fonts/aptos-display.ttf', 'Aptos Display', 400, false],
  ['site/assets/fonts/calibri.ttf', 'Calibri', 400, false],
  ['site/assets/fonts/calibrib.ttf', 'Calibri', 700, false],
  ['site/assets/fonts/calibrii.ttf', 'Calibri', 400, true],
  ['site/assets/fonts/calibriz.ttf', 'Calibri', 700, true],
  // write: lab do Word e testes de paridade de PDF do dotnet
  ...four('write/tools/word-lab/fonts', 'Aptos', 'aptos'),
  ['write/tools/word-lab/fonts/aptos-display.ttf', 'Aptos Display', 400, false],
];

const ROOTS = [
  join(process.env.WINDIR ?? 'C:/Windows', 'Fonts'),
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/Windows/Fonts'),
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/FontCache/4/CloudFonts'),
  '/Library/Fonts', join(process.env.HOME ?? '', 'Library/Fonts'), // macOS (Office instala aqui)
  '/usr/share/fonts', join(process.env.HOME ?? '', '.local/share/fonts'),
].filter((p) => p && existsSync(p));

const wanted = new Set(MANIFEST.map(([, fam]) => fam.toLowerCase()));
const index = new Map(); // `${família}|${itálico}` → [{ peso, caminho }]
for (const r of ROOTS) {
  const stack = [r];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!/\.(ttf|otf)$/i.test(e.name)) continue;
      let m;
      try { m = fontMeta(readFileSync(p)); } catch { continue; }
      const fam = m?.[1];
      if (!fam || !wanted.has(fam.toLowerCase())) continue;
      const key = `${fam.toLowerCase()}|${!!m.italic}`;
      const list = index.get(key) ?? [];
      let mtime = 0;
      try { mtime = statSync(p).mtimeMs; } catch { /* segue */ }
      list.push({ weight: m.weight ?? 400, path: p, mtime });
      index.set(key, list);
    }
  }
}

/**
 * Face da família com o peso EXATO (Bold = 700, não SemiBold/ExtraBold); senão
 * a mais próxima. Empate (o cache do Office guarda versões antigas da mesma
 * face): a mais recente.
 */
function pick(fam, weight, italic) {
  const list = index.get(`${fam.toLowerCase()}|${italic}`) ?? [];
  let best;
  for (const f of list) {
    const d = Math.abs(f.weight - weight), bd = best ? Math.abs(best.weight - weight) : Infinity;
    if (d < bd || (d === bd && f.mtime > best.mtime)) best = f;
  }
  return best && Math.abs(best.weight - weight) <= 100 ? best.path : undefined;
}

let copied = 0, kept = 0;
const missing = [];
for (const [dest, fam, weight, italic] of MANIFEST) {
  const abs = join(root, dest);
  if (existsSync(abs) && !force) { kept++; continue; }
  const src = pick(fam, weight, italic);
  if (!src) { missing.push(`${dest} (${fam} ${weight}${italic ? ' itálico' : ''})`); continue; }
  mkdirSync(dirname(abs), { recursive: true });
  copyFileSync(src, abs);
  copied++;
}
console.log(`fonts:sync — ${copied} copiada(s), ${kept} já presente(s), ${missing.length} ausente(s) na máquina`);
if (missing.length) {
  console.log('  Ausentes (instale o Office 365 / a fonte no sistema; o app usa a substituta aberta):');
  for (const m of missing) console.log(`    ${m}`);
}
if (!ROOTS.length) console.log(`  nenhuma pasta de fontes do sistema encontrada (procurei: Windows\\Fonts, CloudFonts, ~/Library/Fonts…)`);
