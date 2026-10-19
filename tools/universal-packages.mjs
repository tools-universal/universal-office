/**
 * Manifesto compartilhado dos pacotes de export "universais" (browser + node)
 * e helper de bundle esbuild — usado por check-universal.mjs e browser-smoke.mjs.
 *
 * Cada entrada aponta o entry `src/index.ts` e os aliases dos pacotes irmãos
 * para o src (mesma convenção dos scripts build:demo), de forma que o bundle
 * inclua o código-fonte atual — não o dist/ possivelmente desatualizado.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raiz do monorepo (este arquivo mora em <raiz>/tools). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Diretório onde os bundles browser gerados são gravados (consumidos pelo smoke). */
export const BUNDLE_DIR = path.join(ROOT, 'tools', 'dist-universal');

const p = (...seg) => path.join(ROOT, ...seg);

/**
 * Pacotes de export auditados. `project` indica de qual projeto usar o esbuild
 * dos node_modules; `aliases` mapeia dependências irmãs para o src delas.
 */
export const PACKAGES = [
  {
    name: '@universal-office/docx-core (export)',
    id: 'write-export',
    project: 'write',
    entry: p('write', 'packages', 'docx-core', 'src', 'export', 'index.ts'),
    aliases: {},
  },
  {
    name: '@universal-office/docx-layout (pdf-writer)',
    id: 'write-pdf',
    project: 'write',
    entry: p('write', 'packages', 'docx-layout', 'src', 'pdf-writer', 'index.ts'),
    aliases: {},
  },
  {
    name: '@universal-office/docx-core (odf)',
    id: 'write-odf',
    project: 'write',
    entry: p('write', 'packages', 'docx-core', 'src', 'odf', 'index.ts'),
    aliases: {},
  },
  {
    name: '@universal-office/sheet-core (export)',
    id: 'sheet-export',
    project: 'sheet',
    entry: p('sheet', 'packages', 'sheet-core', 'src', 'export', 'index.ts'),
    aliases: {},
  },
  {
    name: '@universal-office/slides-core (export)',
    id: 'slides-export',
    project: 'slides',
    entry: p('slides', 'packages', 'slides-core', 'src', 'export', 'index.ts'),
    aliases: {},
  },
  {
    name: '@universal-office/slides-core',
    id: 'slides-core',
    project: 'slides',
    entry: p('slides', 'packages', 'slides-core', 'src', 'index.ts'),
    aliases: {},
  },
];

/** Carrega o esbuild instalado nos node_modules do projeto dono do pacote. */
export function esbuildFor(project) {
  const req = createRequire(path.join(ROOT, project, 'package.json'));
  return req('esbuild');
}

/**
 * Gera o bundle browser (ESM) de um pacote do manifesto.
 * Falha do esbuild = violação de universalidade (import de fs/path/etc,
 * que `platform=browser` se recusa a resolver).
 * Retorna o texto do bundle; com `write: true` também grava em BUNDLE_DIR.
 */
export async function buildBrowserBundle(pkg, { write = false } = {}) {
  const esbuild = esbuildFor(pkg.project);
  const result = await esbuild.build({
    entryPoints: [pkg.entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    alias: pkg.aliases,
    logLevel: 'silent',
    absWorkingDir: path.dirname(pkg.entry),
  });
  const text = result.outputFiles[0].text;
  if (write) {
    mkdirSync(BUNDLE_DIR, { recursive: true });
    writeFileSync(path.join(BUNDLE_DIR, `${pkg.id}.js`), text);
  }
  return text;
}
