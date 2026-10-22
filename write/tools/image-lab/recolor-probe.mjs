// Recolorir/Transparência no Word: grava .docx com a imagem de teste e cada
// predefinição (o XML que o editor grava), o Word exporta o PDF e comparamos a
// imagem que ele desenhou com o nosso applyBlipFx (mesmo caminho do canvas).
//
//   node tools/image-lab/recolor-probe.mjs write      → .out/rc-*.docx
//   node tools/parallel/word-lock.mjs -- powershell … open-check.ps1 -Files <rc-*.docx> -Pdf
//   node tools/image-lab/recolor-probe.mjs compare    → erro médio por canal
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.out');
const require = createRequire(join(here, '..', '..', 'package.json'));
const { PNG } = require('pngjs');
const core = await import(pathToFileURL(join(here, '..', '..', 'packages', 'docx-core', 'dist', 'index.js')).href);
const layout = await import(pathToFileURL(join(here, '..', '..', 'packages', 'docx-layout', 'dist', 'index.js')).href);
// o editor não emite dist: as predefinições saem do fonte pelo esbuild
const opsFile = join(out, 'picture-ops.mjs');
execFileSync(process.execPath, [require.resolve('esbuild/bin/esbuild'), join(here, '..', '..', 'packages', 'editor', 'src', 'picture-ops.ts'), '--bundle', '--format=esm', `--outfile=${opsFile}`, '--external:@universal-office/*', '--log-level=error']);
const ops = await import(pathToFileURL(opsFile).href);

const CASES = {
  ...Object.fromEntries(ops.RECOLOR_PRESETS.filter((p) => p.id !== 'none').map((p) => [p.id, p.fx])),
  'more-C00000': { duotone: [{ kind: 'prstClr', val: 'black' }, { kind: 'srgbClr', val: 'C00000', mods: [['shade', 45000], ['satMod', 135000]] }] },
  'alpha-50': { alphaModFix: 50000 },
};

if (process.argv[2] === 'write') {
  const src = unzipSync(readFileSync(join(out, 'inline.docx')));
  const doc = strFromU8(src['word/document.xml']);
  const m = /<w:drawing>[\s\S]*?<\/w:drawing>/.exec(doc);
  for (const [id, fx] of Object.entries(CASES)) {
    const xml = core.patchPicture(m[0], { blipFx: fx });
    const parts = { ...src, 'word/document.xml': strToU8(doc.slice(0, m.index) + xml + doc.slice(m.index + m[0].length)) };
    writeFileSync(join(out, `rc-${id}.docx`), zipSync(parts));
  }
  console.log(Object.keys(CASES).map((k) => join(out, `rc-${k}.docx`)).join(','));
} else {
  const theme = core.readTheme(strFromU8(unzipSync(readFileSync(join(out, 'inline.docx')))['word/theme/theme1.xml']));
  const orig = PNG.sync.read(readFileSync(join(out, 'img', 'pattern.png')));
  const dir = join(out, 'rc-img');
  mkdirSync(dir, { recursive: true });
  for (const id of Object.keys(CASES)) {
    const pdf = join(out, `rc-${id}.word.pdf`);
    if (!existsSync(pdf)) { console.log(id, 'sem PDF'); continue; }
    execFileSync('python', [join(here, 'pdf-images.py'), pdf, join(dir, id)]);
    const imgs = readdirSync(dir).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.png'));
    const word = imgs.map((f) => PNG.sync.read(readFileSync(join(dir, f)))).find((p) => p.width === orig.width && p.height === orig.height);
    if (!word) { console.log(id, 'imagem do PDF não tem o tamanho original', imgs.join(' ')); continue; }
    const d = new Uint8ClampedArray(orig.data);
    layout.applyBlipFx(d, CASES[id], theme);
    let sum = 0, max = 0;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const e = Math.abs(d[i + c] - word.data[i + c]); sum += e; max = Math.max(max, e); }
    const at = (x, y) => { const i = (y * orig.width + x) * 4; return `w(${word.data[i]},${word.data[i + 1]},${word.data[i + 2]}) n(${d[i]},${d[i + 1]},${d[i + 2]})`; };
    console.log(`${id.padEnd(16)} erro médio ${(sum / (d.length / 4 * 3)).toFixed(2)} máx ${max} | verm ${at(100, 60)} | cinza128 ${at(240, 330)} | branco ${at(470, 330)}`);
  }
}
