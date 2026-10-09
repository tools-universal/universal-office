// Fuzz do conversor: corrompe os .ppt do corpus (bytes trocados, faixas
// zeradas, truncamento e — o que acha os bugs de estrutura — valores u32
// "interessantes" em posições alinhadas: tamanhos de registro/stream,
// offsets, contagens) e confere que a conversão ou termina, ou falha com
// PptFormatError (mensagem para o usuário) — nunca trava nem estoura com erro
// genérico. Cada conversão roda num WORKER com tempo-limite: travar não
// segura o fuzz — o worker é morto, a entrada é guardada em .work/ e segue.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/fuzz.ts [iterações=200] [semente=1] [limite-ms=5000]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { convertPptToPptx, PptFormatError } from '../../../packages/slides-core/src/ppt/index.js';
import { PptxPackage, readPresentation, readSlide } from '../../../packages/slides-core/src/index.js';

type Outcome = { kind: 'ok' } | { kind: 'format' } | { kind: 'unexpected'; key: string };

/** Converte e relê o resultado com o leitor do viewer (XML bem formado etc.). */
function convertAndRead(data: Uint8Array): Outcome {
  try {
    const pptx = convertPptToPptx(data);
    try {
      const pkg = PptxPackage.load(pptx);
      for (const s of readPresentation(pkg).slides) readSlide(pkg, s.target!);
      return { kind: 'ok' };
    } catch (e) {
      return { kind: 'unexpected', key: `SAÍDA ILEGÍVEL: ${(e as Error).message}`.slice(0, 120) };
    }
  } catch (e) {
    if (e instanceof PptFormatError) return { kind: 'format' };
    return { kind: 'unexpected', key: `${(e as Error).name}: ${(e as Error).message}`.slice(0, 120) };
  }
}

if (!isMainThread) {
  parentPort!.on('message', (data: Uint8Array) => parentPort!.postMessage(convertAndRead(data)));
} else {
  const lab = process.env['LAB_DIR']!;
  const work = join(lab, '.work');
  mkdirSync(work, { recursive: true });
  const root = join(lab, '..', '..', '..', 'samples');
  const files = [
    ...readdirSync(join(root, 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => join(root, 'playback', f)),
    ...readdirSync(join(root, 'legacy')).filter((f) => /\.ppt$/i.test(f)).map((f) => join(root, 'legacy', f)),
  ];
  const iters = parseInt(process.argv[2] ?? '200', 10);
  let seed = parseInt(process.argv[3] ?? '1', 10);
  const limitMs = parseInt(process.argv[4] ?? '5000', 10);
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const INTERESTING = [0, 1, 0x7f, 0x80, 0xff, 0x100, 0xfff, 0x1000, 0xffff, 0x10000, 0x7fffffff, 0x80000000, 0xfffffffa, 0xfffffffe, 0xffffffff];

  // worker persistente (recriado se travar)
  const self = new URL(import.meta.url);
  let worker = new Worker(self);
  const run = (data: Uint8Array): Promise<Outcome | 'timeout'> => new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.removeAllListeners('message');
      void worker.terminate();
      worker = new Worker(self);
      resolve('timeout');
    }, limitMs);
    worker.once('message', (o: Outcome) => { clearTimeout(timer); resolve(o); });
    worker.postMessage(data);
  });

  let ok = 0, formatErr = 0, slow = 0, hung = 0;
  const unexpected = new Map<string, number>();
  for (let i = 0; i < iters; i++) {
    const f = files[Math.floor(rnd() * files.length)]!;
    let data = new Uint8Array(readFileSync(f));
    const mode = Math.floor(rnd() * 4);
    if (mode === 0) {
      for (let k = 0; k < 1 + Math.floor(rnd() * 40); k++) data[Math.floor(rnd() * data.length)] = Math.floor(rnd() * 256);
    } else if (mode === 1) {
      const s = Math.floor(rnd() * data.length), n = Math.floor(rnd() * 4096);
      data.fill(Math.floor(rnd() * 256), s, Math.min(data.length, s + n));
    } else if (mode === 2) {
      data = data.subarray(0, Math.floor(rnd() * data.length));
    } else {
      // estrutural: u32 "interessantes" (inclusive o tamanho do arquivo) em offsets alinhados
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      for (let k = 0; k < 1 + Math.floor(rnd() * 6); k++) {
        const off = Math.floor(rnd() * ((data.length - 4) / 4)) * 4;
        const v = rnd() < 0.15 ? data.length + Math.floor(rnd() * 1e6) : INTERESTING[Math.floor(rnd() * INTERESTING.length)]!;
        dv.setUint32(off, v >>> 0, true);
      }
    }
    const t0 = performance.now();
    const o = await run(data);
    const ms = performance.now() - t0;
    const name = `${f.split(/[\\/]/).pop()} modo ${mode}, iteração ${i}`;
    if (o === 'timeout') {
      hung++;
      console.log(`TRAVOU (> ${limitMs} ms): ${name}`);
      writeFileSync(join(work, `fuzz-travou-${i}.ppt`), data);
      continue;
    }
    if (o.kind === 'ok') ok++;
    else if (o.kind === 'format') formatErr++;
    else unexpected.set(o.key, (unexpected.get(o.key) ?? 0) + 1);
    if (ms > 2000) {
      slow++;
      console.log(`LENTO ${ms.toFixed(0)} ms (${name})`);
      writeFileSync(join(work, `fuzz-lento-${i}.ppt`), data);
    }
  }
  await worker.terminate();
  console.log(`fuzz: ${iters} execuções — ok ${ok}, PptFormatError ${formatErr}, lentas ${slow}, TRAVADAS ${hung}, inesperadas ${[...unexpected.values()].reduce((a, b) => a + b, 0)}`);
  for (const [k, n] of unexpected) console.log(`  ${n}× ${k}`);
  process.exit(hung || unexpected.size ? 1 : 0);
}
