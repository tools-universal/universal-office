// Executa um script TypeScript do lab (que importa as fontes de slides-core
// direto de src/) empacotando-o com esbuild para .work/ e rodando em seguida.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs <script.ts> [args…]
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [entry, ...args] = process.argv.slice(2);
if (!entry) { console.error('uso: run-ts.mjs <script.ts> [args…]'); process.exit(2); }
const outfile = join(here, '.work', 'bin', basename(entry).replace(/\.ts$/, '.mjs'));
await build({
  entryPoints: [resolve(entry)],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'warning',
  // dependências (fflate, playwright, pngjs…) resolvem em runtime de slides/node_modules
  packages: 'external',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
// LAB_DIR = pasta do script original (o bundle roda de .work/bin)
const r = spawnSync(process.execPath, [outfile, ...args], {
  stdio: 'inherit',
  env: { ...process.env, LAB_DIR: dirname(resolve(entry)) },
});
process.exit(r.status ?? 1);
