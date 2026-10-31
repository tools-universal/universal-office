// Build da página de teste do viewer: bundle (esbuild, slides-core pelo
// src) + lista das amostras do repositório (samples.json).
// Uso: npm run build:demo -w @universal-office/slides-viewer  (ou node demo/build.mjs)
// Servir a raiz `slides/` (ex.: python -m http.server 8097) e abrir
// http://localhost:8097/packages/viewer/demo/
import { build } from 'esbuild';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');

const alias = {
  '@universal-office/slides-core': join(slidesRoot, 'packages', 'slides-core', 'src', 'index.ts'),
  '@universal-office/fonts': join(slidesRoot, '..', 'shared', 'fonts', 'src', 'index.ts'),
  '@universal-office/charts': join(slidesRoot, '..', 'shared', 'charts', 'src', 'index.ts'),
  '@universal-office/drawingml': join(slidesRoot, '..', 'shared', 'drawingml', 'src', 'index.ts'),
  '@universal-office/ui': join(slidesRoot, '..', 'shared', 'ui', 'src', 'index.ts'),
};
// index.html (página de teste) e controls.html (demo dos controles embutidos)
for (const [entry, out] of [['main.ts', 'bundle.js'], ['controls.ts', 'controls-bundle.js']]) {
  await build({
    entryPoints: [join(here, entry)],
    bundle: true,
    format: 'esm',
    outfile: join(here, out),
    alias,
    logLevel: 'warning',
  });
}

// amostras: servidas pelo mesmo servidor estático (raiz = slides/)
const list = [];
for (const dir of ['samples', 'samples/legacy', 'samples/playback']) {
  const abs = join(slidesRoot, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).sort()) {
    if (/\.pptx?$/i.test(f)) list.push({ name: dir === 'samples' ? f : `${dir.slice('samples/'.length)}/${f}`, url: `../../../${dir}/${f}` });
  }
}
writeFileSync(join(here, 'samples.json'), JSON.stringify(list, null, 1) + '\n');
console.log(`demo/bundle.js + controls-bundle.js + samples.json (${list.length} amostras)`);
