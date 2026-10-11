// Análise do grupo vmetrics: ascent (1º baseline − margem) e pitch medidos no
// PDF do Word × fórmulas candidatas a partir das tabelas da fonte.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);
const { resolveFonts } = require(join(writeRoot, '..', 'shared', 'fonts', 'node', 'system-fonts.cjs'));
const { SfntFont } = await import(new URL('../../packages/layout/dist/index.js', import.meta.url).href);

const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Segoe UI', 'Aptos', 'Century Gothic', 'Tahoma',
  'Georgia', 'Courier New', 'Calibri Light', 'Cambria', 'Trebuchet MS', 'Open Sans', 'Arial Nova Light', 'Arial Narrow', 'Garamond', 'Lato'];
const SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 36, 72];
const TOP = 1417 / 20;
for (const fam of FONTS) {
  const faces = await resolveFonts([fam]);
  const reg = faces.find((f) => f.style === 'normal' && !f.bold) ?? faces[0];
  if (!reg) { console.log(fam, 'sem fonte'); continue; }
  const f = new SfntFont(new Uint8Array(reg.bytes));
  const m = f.metrics;
  const u = m.unitsPerEm;
  const data = JSON.parse(readFileSync(join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle', 'vmetrics', `vm-${fam.toLowerCase().replace(/\s+/g, '-')}.word.json`), 'utf8'));
  console.log(`\n${fam}: upem ${u} hhea ${m.ascender}/${m.descender}/${m.lineGap} win ${m.usWinAscent}/${m.usWinDescent} typo ${m.sTypoAscender}/${m.sTypoDescender}/${m.sTypoLineGap}`);
  data.pages.forEach((pg, i) => {
    const s = SIZES[i];
    const L = pg.lines;
    const n = L.length - 1;
    const pitch = (L[n].y - L[0].y) / n;
    const asc = L[0].y - TOP;
    const hh = (m.ascender - m.descender + m.lineGap) / u;
    const win = (m.usWinAscent + m.usWinDescent) / u;
    console.log(`  ${String(s).padStart(3)}pt  pitch ${pitch.toFixed(4)} (/s ${(pitch / s).toFixed(5)}; hhea ${hh.toFixed(5)} win ${win.toFixed(5)})  asc ${asc.toFixed(3)} (/s ${(asc / s).toFixed(4)}; hA ${(m.ascender / u).toFixed(4)} hA+gap ${((m.ascender + m.lineGap) / u).toFixed(4)} winA ${(m.usWinAscent / u).toFixed(4)})`);
  });
}
