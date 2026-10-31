#!/usr/bin/env node
/**
 * Gera os módulos SOB DEMANDA do pacote (cada um é o index.js de um pacote
 * publicado à parte — @universal-office/spellcheck e @universal-office/dictionary-*,
 * pelo tools/build-pkg.mjs — e, no desenvolvimento, um chunk por import dinâmico
 * em src/builtin.ts; sem loader especial):
 *
 *   src/dicts/<id>.ts     ← dicionário Hunspell (.aff + .dic VERBATIM, linha a linha,
 *                           para o diff do git comparar com o original)
 *   src/hunspell/wasm.ts  ← Hunspell 1.7.2 em WASM (glue do emscripten + binário base64)
 *
 * Entradas:
 *   dicts-src/<id>/*.aff|*.dic  originais do LibreOffice (fora do git; ver src/dicts/README.md)
 *   node_modules/hunspell-wasm  (devDependency; só o gerador o usa)
 *
 * Uso: npm run gen   (node scripts/gen.mjs)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** Origem fixada: LibreOffice/dictionaries no commit em que os arquivos foram baixados. */
const UPSTREAM_COMMIT = '67032ee957631908098a72edf48dc81cac27e369';
const DICTS = {
  'pt-BR': {
    files: ['pt_BR.aff', 'pt_BR.dic'],
    upstream: 'pt_BR',
    title: 'VERO — Verificador Ortográfico do LibreOffice para o português do Brasil (Raimundo Moura e colaboradores)',
    license: 'LGPLv3 ou MPL 1.1 (à escolha) — usado aqui sob a MPL 1.1 (LICENSE-MPL-1.1.txt); ver README_pt_BR.txt',
  },
  'en-US': {
    files: ['en_US.aff', 'en_US.dic'],
    upstream: 'en',
    title: 'en_US Hunspell dictionary — SCOWL (Kevin Atkinson) / LibreOffice (Marco A.G. Pinto)',
    license: 'licença do SCOWL (estilo MIT/BSD, sem restrição de redistribuição); texto completo em README_en_US.txt',
  },
  // a pasta es/ do LibreOffice só tem dicionários regionais (não há o es_ANY do
  // RLA-ES): o es_ES é o do espanhol geral, usado para todas as variantes
  es: {
    files: ['es_ES.aff', 'es_ES.dic'],
    upstream: 'es',
    title: 'RLA-ES 2.9 — Recursos Lingüísticos Abiertos del Español, variante es_ES (Santiago Bosio e colaboradores)',
    license: 'GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+ (à escolha); textos em LICENSE-GPL-3.0.txt, LICENSE-LGPL-3.0.txt e LICENSE-MPL-1.1.txt; ver LICENSE_es.md e README_es.txt',
  },
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Literal de template que preserva o texto byte a byte (e as quebras de linha). */
function templateLiteral(text) {
  return '`' + text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\uFEFF/g, '\\uFEFF').replace(/\r/g, '\\r') + '`';
}

function genDict(id) {
  const d = DICTS[id];
  const [affName, dicName] = d.files;
  const dir = path.join(PKG, 'dicts-src', id);
  const affPath = path.join(dir, affName);
  const dicPath = path.join(dir, dicName);
  if (!existsSync(affPath) || !existsSync(dicPath)) {
    console.error(`gen: faltam os originais de ${id} em ${path.relative(PKG, dir)}/ — baixar de\n  https://raw.githubusercontent.com/LibreOffice/dictionaries/${UPSTREAM_COMMIT}/${d.upstream}/${affName}\n  https://raw.githubusercontent.com/LibreOffice/dictionaries/${UPSTREAM_COMMIT}/${d.upstream}/${dicName}`);
    process.exitCode = 1;
    return;
  }
  const aff = readFileSync(affPath);
  const dic = readFileSync(dicPath);
  const out = `/*! @license
 * Dicionário Hunspell ${id}: ${d.title}
 * Origem: https://github.com/LibreOffice/dictionaries/tree/${UPSTREAM_COMMIT}/${d.upstream}
 *   ${affName} sha256 ${sha256(aff)}
 *   ${dicName} sha256 ${sha256(dic)}
 * Licença: ${d.license}
 */
// GERADO por scripts/gen.mjs — não editar à mão.
export const aff = ${templateLiteral(aff.toString('utf8'))};
export const dic = ${templateLiteral(dic.toString('utf8'))};
`;
  writeFileSync(path.join(PKG, 'src', 'dicts', `${id}.ts`), out);
  console.log(`gen: src/dicts/${id}.ts (${(out.length / 1024).toFixed(0)} KB)`);
}

function genWasm() {
  const pkgJson = require('hunspell-wasm/package.json');
  const glue = readFileSync(require.resolve('hunspell-wasm/wasm/hunspell.js'), 'utf8');
  const wasm = readFileSync(require.resolve('hunspell-wasm/wasm/hunspell.wasm'));
  const out = `/*! @license
 * Hunspell 1.7.2 compilado para WebAssembly (pacote npm hunspell-wasm ${pkgJson.version}, Rotem Dan —
 * https://github.com/rotemdan/hunspell-wasm; fonte do Hunspell: https://github.com/hunspell/hunspell
 * tag v1.7.2). Hunspell: Copyright (C) 2002-2022 Németh László e colaboradores — licença
 * LGPL-2.0 OR GPL-2.0 OR MPL-1.1, usada aqui sob a MPL 1.1 (COPYING.MPL; os outros textos ao lado).
 * O runtime do emscripten embutido no glue: MIT ou University of Illinois/NCSA, usado sob a MIT
 * (LICENSE-emscripten.txt).
 *   hunspell.js   sha256 ${sha256(Buffer.from(glue))}
 *   hunspell.wasm sha256 ${sha256(wasm)}
 */
// GERADO por scripts/gen.mjs — não editar à mão.
/** Fonte do módulo ES do emscripten (export default = fábrica do módulo). */
export const glue = ${JSON.stringify(glue)};
/** Binário WASM em base64 (entregue ao emscripten como wasmBinary: sem fetch). */
export const wasmBase64 = ${JSON.stringify(wasm.toString('base64'))};
`;
  writeFileSync(path.join(PKG, 'src', 'hunspell', 'wasm.ts'), out);
  console.log(`gen: src/hunspell/wasm.ts (${(out.length / 1024).toFixed(0)} KB)`);
}

const only = process.argv.slice(2);
for (const id of Object.keys(DICTS)) if (!only.length || only.includes(id)) genDict(id);
if (!only.length || only.includes('wasm')) genWasm();
