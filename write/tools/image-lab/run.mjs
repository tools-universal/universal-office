// Oráculo da IMAGEM: roda os experimentos de experiments.ps1 no Word real (COM
// invisível, pela trava global) e extrai o que interessa de cada .docx.
//
//   node tools/image-lab/run.mjs [--only a,b] [--pdf] [--extract-only]
//
// Saídas:
//   tools/image-lab/.out/<exp>.docx|pdf|json — brutos (fora do git: o PDF embute fontes)
//   tools/image-lab/results/<exp>.xml        — cada w:drawing do document.xml (uma
//                                              tag por linha) + as partes de mídia
//   tools/image-lab/results/<exp>.json       — medidas do Word depois da operação
// Os resultados viram casos de teste (docx-core/test/image-oracle.test.ts).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';
import { patternPng, alphaPng, shapePng } from './test-image.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '.out');
const imgDir = join(outDir, 'img');
const resDir = join(here, 'results');
mkdirSync(imgDir, { recursive: true });
mkdirSync(resDir, { recursive: true });
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const only = opt('--only');
const script = opt('--script') || 'image-oracle.ps1';

writeFileSync(join(imgDir, 'pattern.png'), patternPng());
writeFileSync(join(imgDir, 'alpha.png'), alphaPng());
for (const k of ['star', 'lshape', 'ring', 'solid']) writeFileSync(join(imgDir, `${k}.png`), shapePng(k));

if (!argv.includes('--extract-only')) {
  acquireWordLock('image-lab');
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, script),
      '-OutDir', outDir, '-Image', join(imgDir, 'pattern.png'), '-Image2', join(imgDir, 'alpha.png'),
      ...(only ? ['-Only', only] : []), ...(argv.includes('--pdf') ? ['-Pdf'] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
const strip = (xml) => xml
  .replace(/\s(w:rsid\w*|w14:paraId|w14:textId|wp14:anchorId|wp14:editId)="[^"]*"/g, '');

/** Uma tag por linha, com recuo (texto curto fica na linha da tag). */
export function pretty(xml) {
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  let depth = 0;
  const out = [];
  for (const l of lines) {
    if (l.startsWith('</')) depth = Math.max(0, depth - 1);
    out.push('  '.repeat(depth) + l);
    if (l.startsWith('<') && !l.startsWith('</') && !l.endsWith('/>') && !l.includes('</') && !l.startsWith('<?')) depth++;
  }
  return out.join('\n');
}

for (const f of readdirSync(outDir).filter((x) => x.endsWith('.docx'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  const parts = unzipSync(readFileSync(join(outDir, f)));
  const doc = strip(strFromU8(parts['word/document.xml']));
  const drawings = [...doc.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>|<w:pict>[\s\S]*?<\/w:pict>|<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g)].map((m) => m[0]);
  const rels = strFromU8(parts['word/_rels/document.xml.rels'] ?? new Uint8Array());
  const media = Object.keys(parts).filter((p) => p.startsWith('word/media/')).map((p) => `${p} ${parts[p].length}`);
  const settings = strFromU8(parts['word/settings.xml'] ?? new Uint8Array());
  const dpi = /<w14:defaultImageDpi[^>]*>/.exec(settings)?.[0] ?? '';
  const imgRels = [...rels.matchAll(/<Relationship [^>]*\/>/g)].map((m) => m[0]).filter((r) => /image|hdphoto|media/i.test(r));
  writeFileSync(join(resDir, `${name}.xml`),
    `<!-- media: ${media.join(', ')} -->\n<!-- rels: ${imgRels.join(' ')} -->\n${dpi ? `<!-- settings: ${dpi} -->\n` : ''}` +
    drawings.map(pretty).join('\n\n') + '\n');
  const js = join(outDir, `${name}.json`);
  if (existsSync(js)) copyFileSync(js, join(resDir, `${name}.json`));
}
console.log('resultados em', resDir);
