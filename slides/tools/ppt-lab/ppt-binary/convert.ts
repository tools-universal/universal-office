// Converte .ppt → .pptx com o conversor de slides-core (src/ppt) e grava em
// tools/ppt-lab/ppt-binary/.work/conv/<nome>.pptx (+ XML indentado em
// .work/conv/<nome>/ para inspeção). Também valida o resultado relendo-o com
// o leitor do viewer (PptxPackage/readPresentation/readSlide).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/convert.ts [arq.ppt…] [--xml]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { convertPptToPptx } from '../../../packages/slides-core/src/ppt/index.js';
import { PptxPackage, readPresentation, readSlide } from '../../../packages/slides-core/src/index.js';

const here = process.env['LAB_DIR'] ?? dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dumpXml = args.includes('--xml');
// --no-roundtrip: só os registros 97-2003 (ignora tema/metroBlob do PowerPoint 2007+) → .work/conv-bin/
const noRoundTrip = args.includes('--no-roundtrip');
// --prefix X: prefixa o nome de saída (ex.: "lo-" para os .ppt gravados pelo LibreOffice)
const pi = args.indexOf('--prefix');
const prefix = pi >= 0 ? args[pi + 1] ?? '' : '';
let files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--prefix');
if (!files.length) {
  const root = join(here, '..', '..', '..', 'samples');
  files = [
    ...readdirSync(join(root, 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => join(root, 'playback', f)),
    ...readdirSync(join(root, 'legacy')).filter((f) => /\.ppt$/i.test(f)).map((f) => join(root, 'legacy', f)),
  ];
}
const outDir = join(here, '.work', noRoundTrip ? 'conv-bin' : 'conv');
mkdirSync(outDir, { recursive: true });

function pretty(xml: string): string {
  let depth = 0;
  return xml.replace(/>\s*</g, '>\n<').split('\n').map((tok) => {
    if (/^<\//.test(tok)) depth--;
    const line = '  '.repeat(Math.max(0, depth)) + tok;
    if (/^<[^!?/][^>]*[^/]>$/.test(tok) && !/^<[^>]+>[^<]*<\//.test(tok)) depth++;
    return line;
  }).join('\n');
}

for (const f of files) {
  const name = prefix + basename(f).replace(/\.ppt$/i, '');
  const t0 = performance.now();
  let pptx: Uint8Array;
  try {
    pptx = convertPptToPptx(new Uint8Array(readFileSync(f)), { useRoundTrip: !noRoundTrip });
  } catch (e) {
    console.log(`${name}: ERRO ${(e as Error).message}`);
    continue;
  }
  const ms = (performance.now() - t0).toFixed(0);
  writeFileSync(join(outDir, `${name}.pptx`), pptx);
  // valida relendo com o leitor do viewer
  const pkg = PptxPackage.load(pptx);
  const pres = readPresentation(pkg);
  let shapes = 0, texts = 0, pics = 0, errors = 0;
  for (const s of pres.slides) {
    try {
      const slide = readSlide(pkg, s.target!);
      shapes += slide.shapes.length;
      texts += slide.shapes.filter((x) => x.txBody).length;
      pics += slide.shapes.filter((x) => x.image).length;
    } catch (e) { errors++; console.log(`  slide ${s.target}: ${(e as Error).message}`); }
  }
  console.log(`${name}: ${ms} ms, ${pptx.length} bytes, ${pres.slides.length} slides, ${shapes} formas (${texts} com texto, ${pics} imagens)${errors ? `, ${errors} ERROS` : ''}`);
  if (dumpXml) {
    const parts = unzipSync(pptx);
    for (const [p, data] of Object.entries(parts)) {
      const dst = join(outDir, name, p);
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, /\.(xml|rels)$/.test(p) ? pretty(strFromU8(data)) : data);
    }
  }
}
