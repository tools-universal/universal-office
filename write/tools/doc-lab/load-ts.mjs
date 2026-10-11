// Empacota (esbuild) os módulos TypeScript do docx-core para os scripts do lab.
// Uso: const m = await loadDocxCore(); m.convertDocToDocx(...), m.readFullDocument(...)
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..', 'packages', 'docx-core');

/** Carrega um entry TS (relativo a packages/docx-core) já empacotado. */
export async function loadTs(entryRel) {
  const outDir = join(tmpdir(), 'doc-lab-build');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, entryRel.replace(/[\\/]/g, '_').replace(/\.ts$/, '') + `-${Date.now()}.mjs`);
  await build({
    entryPoints: [join(pkg, entryRel)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    sourcemap: 'inline',
    logLevel: 'error',
    absWorkingDir: pkg,
  });
  return import(pathToFileURL(out).href);
}

export const loadDocxCore = () => loadTs('src/index.ts');
export const loadDocInternals = () => loadTs('src/doc/internals.ts');
