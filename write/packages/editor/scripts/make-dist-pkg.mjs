// Gera dist/package.json (publicável) + copia README a partir do pacote.
// O bundle dist/index.js é self-contained (todos os @universal-office/* e o
// @universal-material/web já embutidos), então o manifesto publicado NÃO tem
// dependências de workspace — evita imports que não resolvem no registro.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const src = JSON.parse(readFileSync(new URL('../package.json', here)));

const pkg = {
  name: src.name,
  version: src.version,
  description:
    'Universal Write — the <universal-write> web component: a .docx editor with canvas rendering faithful to Microsoft Word.',
  type: 'module',
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': { types: './index.d.ts', import: './index.js' },
  },
  // o componente se auto-registra (customElements.define) ao importar
  sideEffects: true,
  files: ['index.js', 'index.d.ts', 'README.md'],
  keywords: [
    'docx', 'word', 'ooxml', 'editor', 'web-component',
    'custom-element', 'canvas', 'universal-office',
  ],
  license: 'paid',
};

writeFileSync(new URL('../dist/package.json', here), JSON.stringify(pkg, null, 2) + '\n');

const readme = new URL('../README.md', here);
if (existsSync(readme)) copyFileSync(readme, new URL('../dist/README.md', here));

console.log(`wrote dist/package.json — ${pkg.name}@${pkg.version}`);
