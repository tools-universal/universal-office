// Luz dos chanfros (bevelT) do Word medida numa imagem lisa (200,60,30) cortada
// em ELIPSE — o anel do chanfro cobre todas as direções da normal num documento
// só (lote bvo-2..13 do image-lab, PDF do Word: a imagem com o chanfro sai como
// raster com /SMask). Por pixel do anel, em luz linear c' = c·D + S resolvido nos
// três canais; agrupado por azimute θ (24 × 15°, na tela: 0 = direita, 90 =
// baixo, da normal para fora) e t = distância à borda / largura do chanfro (24
// faixas) + a face. Saída: tabelas base64 (D, S) no formato de light3d.ts.
//
//   node tools/image-lab/bevel-fit.mjs [--show prst] [--write]   (--write grava shared/drawingml/src/bevel-word.ts)
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'package.json'));
const { PNG } = require('pngjs');

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const PRESETS = { 2: 'relaxedInset', 3: 'circle', 4: 'slope', 5: 'cross', 6: 'angle', 7: 'softRound', 8: 'convex', 9: 'coolSlant', 10: 'divot', 11: 'riblet', 12: 'hardEdge', 13: 'artDeco' };
const C = [200, 60, 30].map(lin);
const BW = 6 * (200 / 72); // 6 pt (padrão) a 200 ppp
const NT = 24, NA = 24;
const show = process.argv.includes('--show') ? process.argv[process.argv.indexOf('--show') + 1] : null;
const out = {};
for (const [n, prst] of Object.entries(PRESETS)) {
  const f = join(here, '.out', 'bv', `o${n}-5.png`), fm = join(here, '.out', 'bv', `o${n}-15-mask.png`);
  if (!existsSync(f)) { console.log(prst, 'sem raster'); continue; }
  const img = PNG.sync.read(readFileSync(f)), mask = PNG.sync.read(readFileSync(fm));
  const W = img.width, H = img.height;
  // centro e raios pela máscara (≥ ½)
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask.data[(y * W + x) * 4] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2;
  const acc = Array.from({ length: NA * (NT + 1) }, () => ({ n: 0, sd: 0, ss: 0 }));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mask.data[(y * W + x) * 4] < 250) continue;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const r = Math.hypot(dx, dy);
      const d = (1 - r) * (rx + ry) / 2; // distância (px) à borda, aproximada
      const t = d / BW;
      const th = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const ti = t >= 1 ? NT : Math.floor(t * NT);
      const ai = Math.floor(th / (360 / NA)) % NA;
      // c' = c·D + S nos 3 canais (mínimos quadrados)
      const v = [0, 1, 2].map((k) => lin(img.data[(y * W + x) * 4 + k]));
      const mc = (C[0] + C[1] + C[2]) / 3, mv = (v[0] + v[1] + v[2]) / 3;
      let num = 0, den = 0;
      for (let k = 0; k < 3; k++) { num += (C[k] - mc) * (v[k] - mv); den += (C[k] - mc) ** 2; }
      const D = num / den, S = mv - D * mc;
      const a = acc[ai * (NT + 1) + ti];
      a.n++; a.sd += D; a.ss += S;
    }
  }
  const tab = new Uint8Array(NA * (NT + 1) * 2);
  for (let i = 0; i < acc.length; i++) {
    const a = acc[i];
    const D = a.n ? a.sd / a.n : 1, S = a.n ? a.ss / a.n : 0;
    tab[i * 2] = Math.max(0, Math.min(255, Math.round(D / 0.02)));
    tab[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(Math.max(0, S) * 255)));
  }
  out[prst] = Buffer.from(tab).toString('base64');
  if (show === prst || show === 'all') {
    for (const th of [0, 6, 12, 18]) {
      const row = [];
      for (let ti = 0; ti <= NT; ti++) { const a = acc[th * (NT + 1) + ti]; row.push(a.n ? `${(a.sd / a.n).toFixed(2)}/${(a.ss / a.n).toFixed(3)}` : '-'); }
      console.log(prst, `θ=${th * 15}`, row.join(' '));
    }
  }
}
if (process.argv.includes('--write')) {
  const src = [
    '/**',
    ' * Luz dos chanfros (bevelT) do Word por preset, MEDIDA numa imagem lisa cortada',
    ' * em elipse (write/tools/image-lab/bevel-fit.mjs, lote bvo-2..13: rig threePt,',
    ' * material padrão, largura = altura = 6 pt): por azimute θ da normal (24 × 15°,',
    ' * na tela: 0 = direita, 90 = baixo) × t = distância à borda / largura (24 faixas',
    " * + a face), em luz linear c' = c·D + S. Cada tabela: base64 de 24×25 pares",
    ' * (D em passos de 0,02; S em 1/255). Gerado — não editar à mão.',
    ' */',
    'export const WORD_BEVEL: Record<string, string> = {',
    ...Object.entries(out).map(([k, v]) => `  ${k}: '${v}',`),
    '};',
    '',
  ].join(String.fromCharCode(10));
  writeFileSync(join(here, '..', '..', '..', 'shared', 'drawingml', 'src', 'bevel-word.ts'), src);
  console.log(Object.keys(out).length, 'tabelas gravadas');
} else console.log(JSON.stringify(out, null, 1));
