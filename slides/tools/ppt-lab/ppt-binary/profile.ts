// Mede as fases da conversão de um .ppt (CFB → modelo → partes → zip) para
// achar gargalos (ex.: entradas corrompidas lentas encontradas pelo fuzz).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/profile.ts <arq.ppt>
import { readFileSync } from 'node:fs';
import { readCfb } from '../../../packages/slides-core/src/ppt/cfb.js';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';
import { pptToPptxParts } from '../../../packages/slides-core/src/ppt/to-pptx.js';

const bytes = new Uint8Array(readFileSync(process.argv[2]!));
const t = (label: string, fn: () => unknown): unknown => {
  const t0 = performance.now();
  try { const r = fn(); console.log(`${label}: ${(performance.now() - t0).toFixed(0)} ms`); return r; }
  catch (e) { console.log(`${label}: ERRO ${(e as Error).message} (${(performance.now() - t0).toFixed(0)} ms)`); return undefined; }
};
const cfb = t('cfb', () => readCfb(bytes)) as ReturnType<typeof readCfb> | undefined;
if (cfb) for (const e of cfb.entries) console.log(`  ${e.path || '(raiz)'} ${e.type} ${e.size}`);
if (cfb) t('stream PowerPoint Document', () => cfb.getStream('PowerPoint Document'));
const doc = t('readPptDocument', () => readPptDocument(bytes)) as ReturnType<typeof readPptDocument> | undefined;
if (doc) {
  console.log(`  slides=${doc.slides.length} masters=${doc.masters.length} blips=${doc.blips.length}`);
  const parts = t('pptToPptxParts', () => pptToPptxParts(doc)) as Map<string, Uint8Array> | undefined;
  // maiores partes geradas
  if (parts) for (const [p, b] of [...parts].sort((x, y) => y[1].length - x[1].length).slice(0, 5)) console.log(`  ${p}: ${b.length} bytes`);
}
