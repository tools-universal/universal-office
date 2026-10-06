// Fuzz do conversor: corrompe os .ppt do corpus (bytes trocados, faixas
// zeradas, truncamento) e confere que a conversão ou termina, ou falha com
// PptFormatError (mensagem para o usuário) — nunca trava nem estoura com erro
// genérico. Reporta exceções inesperadas e execuções lentas.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/fuzz.ts [iterações=200] [semente=1]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertPptToPptx, PptFormatError } from '../../../packages/slides-core/src/ppt/index.js';
import { PptxPackage, readPresentation, readSlide } from '../../../packages/slides-core/src/index.js';

const lab = process.env['LAB_DIR']!;
const root = join(lab, '..', '..', '..', 'samples');
const files = [
  ...readdirSync(join(root, 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => join(root, 'playback', f)),
  ...readdirSync(join(root, 'legacy')).filter((f) => /\.ppt$/i.test(f)).map((f) => join(root, 'legacy', f)),
];
const iters = parseInt(process.argv[2] ?? '200', 10);
let seed = parseInt(process.argv[3] ?? '1', 10);
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

let ok = 0, formatErr = 0, slow = 0;
const unexpected = new Map<string, number>();
for (let i = 0; i < iters; i++) {
  const f = files[Math.floor(rnd() * files.length)]!;
  const bytes = new Uint8Array(readFileSync(f));
  const mode = Math.floor(rnd() * 3);
  let data = bytes;
  if (mode === 0) {
    for (let k = 0; k < 1 + Math.floor(rnd() * 40); k++) data[Math.floor(rnd() * data.length)] = Math.floor(rnd() * 256);
  } else if (mode === 1) {
    const s = Math.floor(rnd() * data.length), n = Math.floor(rnd() * 4096);
    data.fill(Math.floor(rnd() * 256), s, Math.min(data.length, s + n));
  } else {
    data = data.subarray(0, Math.floor(rnd() * data.length));
  }
  const t0 = performance.now();
  try {
    const pptx = convertPptToPptx(data);
    // o resultado tem de ser legível pelo leitor do viewer (XML bem formado etc.)
    try {
      const pkg = PptxPackage.load(pptx);
      for (const s of readPresentation(pkg).slides) readSlide(pkg, s.target!);
      ok++;
    } catch (e) {
      const key = `SAÍDA ILEGÍVEL: ${(e as Error).message}`.slice(0, 120);
      unexpected.set(key, (unexpected.get(key) ?? 0) + 1);
    }
  } catch (e) {
    if (e instanceof PptFormatError) formatErr++;
    else {
      const key = `${(e as Error).name}: ${(e as Error).message}`.slice(0, 120);
      unexpected.set(key, (unexpected.get(key) ?? 0) + 1);
    }
  }
  const ms = performance.now() - t0;
  if (ms > 2000) {
    slow++;
    console.log(`LENTO ${ms.toFixed(0)} ms (${f.split(/[\\/]/).pop()} modo ${mode}, iteração ${i})`);
    // guarda a entrada para reproduzir
    writeFileSync(join(lab, '.work', `fuzz-lento-${i}.ppt`), data);
  }
}
console.log(`fuzz: ${iters} execuções — ok ${ok}, PptFormatError ${formatErr}, lentas ${slow}, inesperadas ${[...unexpected.values()].reduce((a, b) => a + b, 0)}`);
for (const [k, n] of unexpected) console.log(`  ${n}× ${k}`);
