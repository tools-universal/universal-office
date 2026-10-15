// Gera packages/sheet-core/src/glyph-widths-data.ts: larguras de avanço que o
// Excel usa (GDI, px inteiros a 96 dpi, com hinting) onde diferem de
// round(largura do canvas no mesmo ppem). O Excel decide "####", casas do
// Geral, preenchimento `*x`, quebra/transbordo e o Range.Text com essas
// larguras — o canvas mede sem hinting (Calibri 15 ppem: dígito 7,60 no canvas
// × 7 px no GDI).
//  1. gdi-widths.ps1 mede as famílias INSTALADAS (ppem 8..32, normal/negrito);
//  2. Chromium (Playwright) mede as mesmas famílias pelo canvas, com as fontes
//     do harness (os-fonts.css) — a mesma medida que o app faz em tempo real;
//  3. grava só as diferenças: por ppem, pares (caractere, largura base62).
// Uso: [ASSETS_ROOT=<checkout com node_modules e fontes>] [REUSE=1] node gen-glyph-widths.mjs <dirTemporário>
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sheetRoot = join(here, '..', '..');
const repo = join(sheetRoot, '..');
// node_modules e fontes locais (não versionados) — numa worktree, os do checkout principal
const assets = process.env.ASSETS_ROOT ?? repo;
const [tmp] = process.argv.slice(2);
if (!tmp) { console.error('uso: gen-glyph-widths.mjs <dirTemporário>'); process.exit(2); }
mkdirSync(tmp, { recursive: true });

// famílias comuns no corpus (as demais caem no canvas arredondado)
const FAMILIES = ['Calibri', 'Arial', 'Times New Roman', 'Verdana', 'Tahoma', 'Segoe UI', 'Courier New', 'Cambria',
  'Arial Narrow', 'Century Gothic', 'Georgia', 'Trebuchet MS', 'Calibri Light', 'Lucida Sans Unicode'];
const PMIN = 8, PMAX = 32;
// ASCII + acentos do português + símbolos usados em formatos numéricos
const chars = String.fromCharCode(
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i),
  ...[...'áàâãçéêíóôõúüÁÀÂÃÇÉÊÍÓÔÕÚÜ£¥§°±µ·º'].map((c) => c.charCodeAt(0)),
  0x20ac, 0x2030, 0x2022, 0x2026, 0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014,
);
const gdiFile = join(tmp, 'glyph-gdi.json');
const canvasFile = join(tmp, 'glyph-canvas.json');
if (!process.env.REUSE) await measure();
const gdi = JSON.parse(readFileSync(gdiFile, 'utf8').replace(/^﻿/, ''));
const canvas = JSON.parse(readFileSync(canvasFile, 'utf8'));

async function measure() {
  // 1. GDI
  const charsFile = join(tmp, 'glyph-chars.txt');
  writeFileSync(charsFile, chars, 'utf8');
  const ps = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'gdi-widths.ps1'),
    '-Fonts', FAMILIES.join(','), '-Ppems', `${PMIN}-${PMAX}`, '-CharsFile', charsFile, '-Out', gdiFile], { windowsHide: true, encoding: 'utf8' });
  if (ps.status !== 0) { console.error(ps.stdout, ps.stderr); process.exit(1); }
  // 2. canvas (mesmas fontes do harness do lab)
  const { chromium } = await import(pathToFileURL(join(assets, 'sheet', 'node_modules', 'playwright', 'index.mjs')).href);
  const slidesFonts = join(assets, 'slides', 'packages', 'slides', 'demo', 'fonts');
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file;
    if (p === '/os-fonts.css') file = join(slidesFonts, 'os-fonts.css');
    else if (p.startsWith('/os/')) file = join(slidesFonts, 'os', p.slice(4));
    else file = normalize(join(assets, 'sheet', p));
    const type = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }[extname(file)] ?? 'font/ttf';
    try { statSync(file); res.writeHead(200, { 'content-type': type }); createReadStream(file).pipe(res); } catch { res.writeHead(404).end(); }
  }).listen(0, '127.0.0.1');
  await new Promise((r) => server.on('listening', r));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**/harness.bundle.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/excel-lab/harness.html`, { waitUntil: 'networkidle' });
  const cv = await page.evaluate(async ({ fams, p0, p1, chars }) => {
    const out = {};
    const ctx = document.createElement('canvas').getContext('2d');
    for (const f of fams) for (const b of [0, 1]) {
      await document.fonts.load(`${b ? 700 : 400} 20px "${f}"`).catch(() => {});
      for (let p = p0; p <= p1; p++) {
        ctx.font = `${b ? 700 : 400} ${p}px "${f}"`;
        out[`${f}|${p}|${b}`] = [...chars].map((ch) => ctx.measureText(ch).width);
      }
    }
    return out;
  }, { fams: FAMILIES, p0: PMIN, p1: PMAX, chars });
  await browser.close();
  server.close();
  writeFileSync(canvasFile, JSON.stringify(cv));
}

// 3. diferenças
const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const table = {};
let pairs = 0;
for (const fam of FAMILIES) {
  for (const b of [0, 1]) {
    const rows = [];
    let ok = true;
    for (let p = PMIN; p <= PMAX; p++) {
      const g = gdi[`${fam}|${p}|${b}`];
      if (!g || g.face.toLowerCase() !== fam.toLowerCase()) { ok = false; break; }
      const cw = canvas[`${fam}|${p}|${b}`];
      let s = '';
      [...chars].forEach((ch, i) => {
        const w = g.w[i];
        if (Math.round(cw[i]) !== w && w < 62) { s += ch + B62[w]; pairs++; }
      });
      rows.push(s);
    }
    if (!ok) { console.warn(`sem a fonte no GDI: ${fam} (${b ? 'negrito' : 'normal'})`); continue; }
    table[`${fam.toLowerCase()}|${b}`] = rows;
  }
}
// 4. larguras EFETIVAS medidas no próprio Excel (preenchimento `@*c` numa coluna
//    larga — lab do Sheet, e7) onde o GDI não serve: Arial 6/7 pt (o Excel não
//    usa as do GDI nesses tamanhos) e Aptos/Aptos Narrow (fonte de nuvem, fora do
//    GDI). JSON { "Família|pt|negrito": { "<c>": px } } via EXCEL_WIDTHS.
if (process.env.EXCEL_WIDTHS) {
  const xl = JSON.parse(readFileSync(process.env.EXCEL_WIDTHS, 'utf8'));
  for (const [k, ws] of Object.entries(xl)) {
    const [fam, pt, b] = k.split('|');
    const ppem = Math.round((+pt * 96) / 72);
    if (ppem < PMIN || ppem > PMAX) continue;
    const key = `${fam.toLowerCase()}|${b}`;
    const rows = (table[key] ??= Array.from({ length: PMAX - PMIN + 1 }, () => ''));
    const map = new Map();
    const old = rows[ppem - PMIN];
    for (let i = 0; i + 1 < old.length; i += 2) map.set(old[i], old[i + 1]);
    for (const [ch, w] of Object.entries(ws)) if (typeof w === 'number' && w < 62) map.set(ch, B62[w]);
    rows[ppem - PMIN] = [...map].map(([c, w]) => c + w).join('');
    pairs += Object.keys(ws).length;
  }
}
const lit = (s) => `'${s.replace(/[\\']/g, (c) => '\\' + c).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}'`;
const out = `// GERADO por tools/excel-lab/gen-glyph-widths.mjs — não editar à mão.
// Larguras de avanço do GDI (px inteiros a 96 dpi, com hinting — as que o Excel
// usa para "####", casas do Geral, preenchimento \`*x\`, quebra e Range.Text) ONDE
// diferem de round(largura do canvas no mesmo ppem). GLYPH_FIX["família|negrito"]
// [ppem − ${PMIN}] = pares (caractere, largura base62). Fora da tabela: canvas arredondado.
export const GLYPH_PPEM_MIN = ${PMIN};
export const GLYPH_PPEM_MAX = ${PMAX};
export const GLYPH_FIX: Record<string, string[]> = {
${Object.entries(table).map(([k, rows]) => `  ${JSON.stringify(k)}: [\n${rows.map((r) => `    ${lit(r)},`).join('\n')}\n  ],`).join('\n')}
};
`;
const dest = join(sheetRoot, 'packages', 'sheet-core', 'src', 'glyph-widths-data.ts');
writeFileSync(dest, out);
console.log(`ok: ${Object.keys(table).length} famílias/estilos, ${pairs} pares, ${out.length} bytes → ${dest}`);
