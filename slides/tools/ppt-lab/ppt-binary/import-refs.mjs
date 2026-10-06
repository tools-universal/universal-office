// Importa as REFERÊNCIAS do PowerPoint já capturadas pelo lab de reprodução
// (tools/ppt-lab/playback/capture-ppt.ps1): para cada deck, os PNGs de
// `Slide.Export` (1280×720) do .ppt e do .pptx + o manifesto COM (transição,
// intervalo, efeitos). Copia de um checkout de origem (default: o próprio
// worktree; use --from <raiz-slides> para outro checkout) para
// results/ppt-binary/<deck>/{ppt,pptx}/.
//
// Uso: node tools/ppt-lab/ppt-binary/import-refs.mjs [--from D:/Projects/OfficeNext/slides]
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');
const i = process.argv.indexOf('--from');
const fromRoot = i >= 0 ? process.argv[i + 1] : slidesRoot;
const src = join(fromRoot, 'tools', 'ppt-lab', 'results', 'playback');
const dst = join(here, '..', 'results', 'ppt-binary');
if (!existsSync(src)) { console.error(`sem ${src}`); process.exit(1); }
for (const deck of readdirSync(src)) {
  if (deck.startsWith('_') || deck.includes('.')) continue;
  for (const fmt of ['ppt', 'pptx']) {
    const from = join(src, deck, fmt);
    if (!existsSync(from)) continue;
    const to = join(dst, deck, fmt);
    mkdirSync(to, { recursive: true });
    if (existsSync(join(from, 'ppt-slides'))) cpSync(join(from, 'ppt-slides'), join(to, 'ref'), { recursive: true });
    if (existsSync(join(from, 'ppt-manifest.json'))) cpSync(join(from, 'ppt-manifest.json'), join(to, 'manifest.json'));
  }
  console.log(`${deck}: ok`);
}
// decks de estresse: PNGs do PowerPoint do .pptx ORIGINAL (results/stress/<deck>/ppt)
// viram a referência dos .ppt gravados pelo LibreOffice (decks "lo-<deck>")
const stress = join(fromRoot, 'tools', 'ppt-lab', 'results', 'stress');
if (existsSync(stress)) {
  for (const deck of readdirSync(stress)) {
    const from = join(stress, deck, 'ppt');
    if (!existsSync(from)) continue;
    const to = join(dst, `lo-${deck}`, 'ppt', 'ref');
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
    console.log(`lo-${deck}: ok`);
  }
}
