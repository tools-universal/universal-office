// Extrai (unzip) os .pptx gêmeos das amostras para inspeção do XML que o
// PowerPoint grava — é a "spec" do que o conversor .ppt → .pptx deve produzir.
//
// Uso: node tools/ppt-lab/ppt-binary/unzip-twins.mjs [arquivo.pptx …]
//   default: todos os .pptx de samples/playback + samples/showcase_animado.pptx
// Saída: tools/ppt-lab/ppt-binary/.work/twins/<deck>/… (XML indentado)
import { unzipSync, strFromU8 } from '../../../node_modules/fflate/esm/index.mjs';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');
let files = process.argv.slice(2);
if (!files.length) {
  const pb = join(slidesRoot, 'samples', 'playback');
  files = readdirSync(pb).filter((f) => f.endsWith('.pptx')).map((f) => join(pb, f));
  files.push(join(slidesRoot, 'samples', 'showcase_animado.pptx'));
}

/** Indentação simples de XML (uma tag por linha) para leitura humana. */
function pretty(xml) {
  let depth = 0;
  const out = [];
  for (const tok of xml.replace(/>\s*</g, '>\n<').split('\n')) {
    if (/^<\//.test(tok)) depth--;
    out.push('  '.repeat(Math.max(0, depth)) + tok);
    if (/^<[^!?/][^>]*[^/]>$/.test(tok) && !/^<[^>]+>[^<]+<\//.test(tok)) depth++;
  }
  return out.join('\n');
}

for (const f of files) {
  const deck = basename(f, '.pptx');
  const outDir = join(here, '.work', 'twins', deck);
  const parts = unzipSync(readFileSync(f));
  for (const [name, data] of Object.entries(parts)) {
    const p = join(outDir, name);
    mkdirSync(dirname(p), { recursive: true });
    if (/\.(xml|rels)$/.test(name)) writeFileSync(p, pretty(strFromU8(data)));
    else writeFileSync(p, data);
  }
  console.log(`${deck}: ${Object.keys(parts).length} partes -> ${outDir}`);
}
