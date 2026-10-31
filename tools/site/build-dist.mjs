#!/usr/bin/env node
/**
 * build-dist — o site publicável (https://universaloffice.org/) em dist/site:
 *
 *   - os arquivos VERSIONADOS de site/ (git ls-files), e não a pasta como está:
 *     as fontes proprietárias que o `npm run fonts:sync` copia para
 *     site/assets/fonts (Aptos, Calibri; no .gitignore) nunca podem ser publicadas;
 *   - as substitutas ABERTAS de shared/fonts/files (Carlito, Caladea, Liberation
 *     Serif/Mono e as licenças), que o fonts:sync também copia para lá fora do git.
 *
 * O site é publicado na RAIZ do domínio (o live.html importa
 * /assets/universal-office.js). O deploy é o .github/workflows/pages.yml.
 *
 * Uso: node tools/site/build-dist.mjs
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'dist', 'site');
const OPEN_FONTS = path.join(ROOT, 'shared', 'fonts', 'files');
const PROPRIETARY = /^(aptos|calibri|cambria|segoe|arial|times|cour)/i;

rmSync(OUT, { recursive: true, force: true });

const copies = execFileSync('git', ['ls-files', '-z', 'site'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean)
  .map((f) => [path.join(ROOT, f), path.join(OUT, path.relative('site', f))]);
for (const f of readdirSync(OPEN_FONTS).filter((n) => /\.ttf$|^LICENSE-/.test(n))) {
  copies.push([path.join(OPEN_FONTS, f), path.join(OUT, 'assets', 'fonts', f)]);
}

let bytes = 0;
for (const [from, to] of copies) {
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
  bytes += statSync(to).size;
}

const fonts = readdirSync(path.join(OUT, 'assets', 'fonts'));
const leaked = fonts.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f) && PROPRIETARY.test(f));
if (leaked.length) throw new Error(`build-dist: fonte proprietária no site: ${leaked.join(', ')}`);

console.log(`build-dist: ${copies.length} arquivo(s), ${(bytes / 1048576).toFixed(1)} MB → ${path.relative(ROOT, OUT)}`);
