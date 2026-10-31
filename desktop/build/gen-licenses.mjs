// Avisos de licença de tudo o que o app desktop embarca, em build/licenses/
// (vai para resources/licenses; o painel "Sobre" e o THIRD-PARTY-NOTICES.txt
// apontam para lá). Rodado antes do electron-builder (predist).
//
// O Electron/Chromium já vem com os seus (LICENSE.electron.txt e
// LICENSES.chromium.html, na pasta do app). Aqui: o próprio app (MIT), o motor
// de revisão (Hunspell em WebAssembly, emscripten), os dicionários, os padrões
// de hifenização, as fontes abertas embarcadas e as bibliotecas JS dentro das
// páginas dos editores. Fonte que não tem arquivo de licença no repositório
// (Poppins, Amatic SC, Material Symbols) recebe o aviso com o texto da licença
// (OFL 1.1 tirado do aviso da Carlito; Apache 2.0 de um pacote instalado).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const repo = join(dir, '..', '..');
const out = join(dir, 'licenses');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const r = (...p) => join(repo, ...p);
const index = [];
const missing = [];
/** Copia `files` (caminhos no repo) para licenses/<sub>/ e registra no índice. */
function notice(component, license, sub, files) {
  const copied = [];
  for (const f of files) {
    const src = r(...f.split('/'));
    if (!existsSync(src)) { missing.push(f); continue; }
    const name = f.split('/').at(-1);
    mkdirSync(join(out, sub), { recursive: true });
    copyFileSync(src, join(out, sub, name));
    copied.push(`${sub}/${name}`);
  }
  index.push({ component, license, files: copied });
}
function written(component, license, sub, name, text) {
  mkdirSync(join(out, sub), { recursive: true });
  writeFileSync(join(out, sub, name), text);
  index.push({ component, license, files: [`${sub}/${name}`] });
}

// texto da OFL 1.1 (do aviso da Carlito, sem o cabeçalho dela) e da Apache 2.0
const carlito = readFileSync(r('shared', 'fonts', 'files', 'LICENSE-carlito.txt'), 'utf8');
const OFL = carlito.slice(carlito.indexOf('SIL OPEN FONT LICENSE Version 1.1'));
const require = createRequire(join(repo, 'write', 'package.json'));
let APACHE = '';
for (const pkg of ['typescript/LICENSE.txt']) {
  try { APACHE = readFileSync(require.resolve(pkg), 'utf8'); break; } catch { /* próximo */ }
}
if (!APACHE) missing.push('Apache-2.0 text (typescript/LICENSE.txt)');

notice('Universal Office', 'MIT', 'universal-office', ['LICENSE']);
notice('Hunspell (spell-checking engine, compiled to WebAssembly)', 'MPL 1.1 / GPL 2.0 / LGPL 2.1 (tri-license)', 'hunspell',
  ['shared/spell/src/hunspell/COPYING', 'shared/spell/src/hunspell/COPYING.LESSER', 'shared/spell/src/hunspell/COPYING.MPL']);
notice('Emscripten runtime (in the Hunspell WebAssembly build)', 'MIT / University of Illinois/NCSA', 'hunspell',
  ['shared/spell/src/hunspell/LICENSE-emscripten.txt']);
notice('Brazilian Portuguese dictionary (VERO)', 'LGPL 3.0 / MPL 1.1 (dual license)', 'dictionaries/pt-BR',
  ['shared/spell/src/dicts/README_pt_BR.txt', 'shared/spell/src/dicts/LICENSE-MPL-1.1.txt']);
notice('US English dictionary (SCOWL / Hunspell en_US)', 'SCOWL, BSD-style and WordNet licenses — see README', 'dictionaries/en-US',
  ['shared/spell/src/dicts/README_en_US.txt']);
notice('Spanish dictionary (RLA-ES)', 'GPL 3.0 / LGPL 3.0 / MPL 1.1 (tri-license)', 'dictionaries/es',
  ['shared/spell/src/dicts/LICENSE_es.md', 'shared/spell/src/dicts/README_es.txt', 'shared/spell/src/dicts/LICENSE-GPL-3.0.txt',
    'shared/spell/src/dicts/LICENSE-LGPL-3.0.txt', 'shared/spell/src/dicts/LICENSE-MPL-1.1.txt']);
notice('Hyphenation patterns (hyph-utf8)', 'per pattern file — see notice', 'hyphenation',
  ['write/packages/docx-layout/src/typography/hyphen/patterns/THIRD-PARTY-NOTICES.md']);
notice('Liberation fonts (Sans, Serif, Mono)', 'SIL Open Font License 1.1', 'fonts', ['shared/fonts/files/LICENSE-liberation.txt']);
notice('Carlito font', 'SIL Open Font License 1.1', 'fonts', ['shared/fonts/files/LICENSE-carlito.txt']);
notice('Caladea font', 'Apache License 2.0', 'fonts', ['shared/fonts/files/LICENSE-caladea.txt']);
written('Poppins font', 'SIL Open Font License 1.1', 'fonts', 'LICENSE-poppins.txt',
  `Poppins (poppins-*.woff2) — interface font of the editors\n\nCopyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\n\n${OFL}`);
written('Amatic SC font', 'SIL Open Font License 1.1', 'fonts', 'LICENSE-amatic-sc.txt',
  `Amatic SC (os/amatic-sc-*.ttf) — font used by the Universal Slides sample decks\n\nCopyright 2015 The Amatic SC Project Authors (https://github.com/googlefonts/AmaticSC)\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\n\n${OFL}`);
if (APACHE) {
  written('Material Symbols (icon font)', 'Apache License 2.0', 'fonts', 'LICENSE-material-symbols.txt',
    `Material Symbols (material-symbols-rounded.woff2) — icons of the editors' bars\n\nCopyright 2022 Google LLC (https://github.com/google/material-design-icons)\n\nLicensed under the Apache License, Version 2.0:\n\n${APACHE}`);
}
notice('@tools-universal/office-converter (Office format conversion, in the editor pages)', 'MIT', 'libraries', ['vendor/office-converter/LICENSE']);
for (const [pkg, file] of [['fflate', 'LICENSE']]) {
  try {
    const src = join(dirname(require.resolve(`${pkg}/package.json`)), file);
    mkdirSync(join(out, 'libraries'), { recursive: true });
    const name = `${pkg.replace('/', '__')}-${file}`;
    copyFileSync(src, join(out, 'libraries', name));
    index.push({ component: `${pkg} (JavaScript library in the editor pages)`, license: 'MIT', files: [`libraries/${name}`] });
  } catch { missing.push(`${pkg}/${file}`); }
}
index.push({ component: '@universal-material/web (JavaScript library in the editor pages)', license: 'MIT (declared in its package.json; the package ships no license file)', files: [] });
index.push({ component: 'Electron, Chromium and their dependencies', license: 'MIT (Electron) and the licenses listed by Chromium', files: ['../LICENSE.electron.txt', '../LICENSES.chromium.html'] });

const text = [
  'Universal Office (Beta) — third-party notices',
  '',
  'The app bundles the components below. Each one\'s license text is in this',
  'folder (resources/licenses), in the file(s) listed.',
  '',
  ...index.flatMap((e) => [`* ${e.component}`, `  License: ${e.license}`, ...e.files.map((f) => `  ${f}`), '']),
].join('\n');
writeFileSync(join(out, 'THIRD-PARTY-NOTICES.txt'), text);
console.log(`wrote build/licenses (${index.length} components)`);
if (missing.length) {
  console.warn(`missing license files: ${missing.join(', ')}`);
  if (process.env.CI) process.exit(1);
}
