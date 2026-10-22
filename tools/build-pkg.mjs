#!/usr/bin/env node
/**
 * build-pkg — build de PUBLICAÇÃO dos produtos (os web components): cada um sai
 * AUTOSSUFICIENTE em `<pacote>/publish/` (fora do git), sem dependência nenhuma
 * no registro. Publicar = `npm publish` DENTRO dessa pasta. O `dist/` continua
 * sendo a saída do tsc que os pacotes do monorepo consomem entre si.
 *
 *   - index.js: ESM minificado com TUDO dentro — os pacotes internos
 *     (@universal-office/* pelo src) e as dependências npm (Material, fflate…);
 *   - chunks/: o que o código já importa sob demanda (padrões de hifenização,
 *     barra do editor, conversões raras) — baixado só quando usado;
 *   - index.d.ts: tipos num arquivo só (os dos pacotes internos embutidos);
 *   - fonts/: as fontes ABERTAS (Liberation, Carlito, Caladea — OFL) que o
 *     resolvedor usa como substitutas; o host serve a pasta e aponta para ela;
 *   - licenses/<pacote>/: os textos de licença de terceiros que os pacotes
 *     internos EMBUTIDOS no bundle declaram em `licenseFiles` no package.json
 *     (dicionários e Hunspell do spell, por exemplo);
 *   - package.json publicável (sem dependencies) + README.md.
 *
 * Os pacotes internos (fonts, charts, ui, spell, docx-core, docx-layout, sheet-core,
 * sheet-calc, slides-core) são `private` e NUNCA são publicados: só existem
 * dentro desses bundles. O bloco `publish` do package.json de cada produto dá
 * a descrição/palavras-chave/licença do manifesto publicado.
 *
 * Uso: node tools/build-pkg.mjs [produto…]   (sem argumentos: todos)
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(ROOT, ...s);

/** Produtos publicados: pasta → workspace dono (de onde vêm esbuild e node_modules). */
export const PRODUCTS = {
  write: { dir: 'write/packages/editor', project: 'write' },
  'document-viewer': { dir: 'write/packages/viewer', project: 'write' },
  compare: { dir: 'write/packages/compare', project: 'write' },
  sheet: { dir: 'sheet/packages/sheet', project: 'sheet' },
  'presentation-viewer': { dir: 'slides/packages/viewer', project: 'slides' },
  slides: { dir: 'slides/packages/slides', project: 'slides' },
};

/** Pacotes internos → src (embutidos em todo bundle que os usa). */
const INTERNAL = {
  '@universal-office/fonts': 'shared/fonts/src/index.ts',
  '@universal-office/charts': 'shared/charts/src/index.ts',
  '@universal-office/drawingml': 'shared/drawingml/src/index.ts',
  '@universal-office/ui': 'shared/ui/src/index.ts',
  '@universal-office/spell': 'shared/spell/src/index.ts',
  '@universal-office/docx-core': 'write/packages/docx-core/src/index.ts',
  '@universal-office/docx-layout': 'write/packages/docx-layout/src/index.ts',
  '@universal-office/compare': 'write/packages/compare/src/index.ts',
  '@universal-office/sheet-core': 'sheet/packages/sheet-core/src/index.ts',
  '@universal-office/sheet-calc': 'sheet/packages/calc/src/index.ts',
  // só a colação do Windows do sheet-calc (Classificar do Write), sem o motor de cálculo
  '@universal-office/collation': 'sheet/packages/calc/src/collation.ts',
  '@universal-office/slides-core': 'slides/packages/slides-core/src/index.ts',
  '@universal-office/presentation-viewer': 'slides/packages/viewer/src/index.ts',
};

async function buildProduct(id) {
  const { dir, project } = PRODUCTS[id];
  const pkgDir = p(dir);
  const src = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const publish = src.publish ?? {};
  const req = createRequire(p(project, 'package.json'));
  const esbuild = req('esbuild');
  const dist = path.join(pkgDir, 'publish');
  rmSync(dist, { recursive: true, force: true }); // publish/ só tem arquivos gerados (sem junções)

  // 1. JS: tudo dentro, partes sob demanda em chunks/
  const alias = Object.fromEntries(Object.entries(INTERNAL).filter(([n]) => n !== src.name).map(([n, f]) => [n, p(f)]));
  const built = await esbuild.build({
    metafile: true,
    entryPoints: { index: path.join(pkgDir, 'src', 'index.ts') },
    outdir: dist, bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    minify: true, splitting: true, chunkNames: 'chunks/[name]-[hash]', legalComments: 'linked',
    alias, absWorkingDir: pkgDir, nodePaths: [p(project, 'node_modules')], logLevel: 'warning',
  });

  // 2. Tipos num arquivo só: tsconfig temporário com os internos pelo src
  const tsconfig = path.join(pkgDir, '.tsconfig.pkg.json');
  const rel = (f) => path.relative(pkgDir, p(f)).replace(/\\/g, '/');
  writeFileSync(tsconfig, JSON.stringify({
    extends: './tsconfig.json',
    // rootDir na raiz: os fontes dos pacotes internos entram no programa
    compilerOptions: { noEmit: false, rootDir: path.relative(pkgDir, ROOT).replace(/\\/g, '/') || '.', baseUrl: '.', paths: Object.fromEntries(Object.entries(INTERNAL).map(([n, f]) => [n, [rel(f)]])) },
    include: ['src'],
  }, null, 2));
  try {
    const dts = req.resolve('dts-bundle-generator/dist/bin/dts-bundle-generator.js', { paths: [p('write')] });
    execFileSync(process.execPath, [dts, '--project', tsconfig, '--no-check', '--silent', '-o', path.join(dist, 'index.d.ts'), path.join(pkgDir, 'src', 'index.ts')], { cwd: pkgDir, stdio: 'inherit' });
  } finally {
    rmSync(tsconfig, { force: true });
  }

  // 3. Fontes ABERTAS (OFL) junto do pacote: o host serve `fonts/` e aponta o
  //    atributo `fonts` / FontResolver.shared().configure({ baseUrl }) para ela.
  //    Baixadas só quando o documento pede. O compare (DOM puro) não precisa.
  const withFonts = id !== 'compare';
  if (withFonts) {
    const fontsDir = path.join(dist, 'fonts');
    mkdirSync(fontsDir, { recursive: true });
    const OPEN = [p('shared/fonts/files'), p('write/packages/editor/demo/fonts')];
    for (const dir of OPEN) {
      for (const f of readdirSync(dir)) {
        const open = /^(liberation(sans|serif|mono)|carlito|caladea)-[a-z]+\.ttf$/.test(f) || /^LICENSE-(liberation|carlito|caladea)\.txt$/.test(f);
        if (open && !existsSync(path.join(fontsDir, f))) copyFileSync(path.join(dir, f), path.join(fontsDir, f));
      }
    }
  }

  // 4. Licenças de terceiros dos pacotes internos que entraram no bundle: cada
  //    um declara os textos em `licenseFiles` (package.json) → licenses/<nome>/
  const inputs = Object.keys(built.metafile.inputs).map((f) => path.resolve(pkgDir, f));
  let withLicenses = false;
  for (const [name, entry] of Object.entries(INTERNAL)) {
    const dir = path.dirname(path.dirname(p(entry))); // <pacote>/src/index.ts → <pacote>
    if (!inputs.some((f) => f.startsWith(dir + path.sep))) continue;
    const files = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).licenseFiles ?? [];
    for (const lf of files) {
      const to = path.join(dist, 'licenses', name.replace(/^@universal-office\//, ''), path.basename(lf));
      mkdirSync(path.dirname(to), { recursive: true });
      copyFileSync(path.join(dir, lf), to);
      withLicenses = true;
    }
  }

  // 5. Manifesto publicável: sem dependências (tudo está no bundle)
  const manifest = {
    name: src.name,
    version: src.version,
    description: publish.description ?? src.description,
    type: 'module',
    main: './index.js',
    module: './index.js',
    types: './index.d.ts',
    exports: { '.': { types: './index.d.ts', import: './index.js' } },
    // o componente se auto-registra (customElements.define) ao importar
    sideEffects: true,
    files: ['index.js', 'index.d.ts', 'chunks', ...(withFonts ? ['fonts'] : []), '*.LEGAL.txt', ...(withLicenses ? ['licenses'] : []), 'media', 'README.md'],
    ...(publish.keywords ? { keywords: publish.keywords } : {}),
    ...(publish.license ? { license: publish.license } : {}),
  };
  writeFileSync(path.join(dist, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  // README: os GIFs moram uma vez só em site/assets/gifs (o link relativo vale no
  // repositório); no pacote eles vão para media/ e os links entre READMEs viram texto
  const readme = path.join(pkgDir, 'README.md');
  if (existsSync(readme)) {
    let md = readFileSync(readme, 'utf8');
    md = md.replace(/\]\((?:\.\.\/)+site\/assets\/gifs\/([\w.-]+\.gif)\)/g, (_, gif) => {
      mkdirSync(path.join(dist, 'media'), { recursive: true });
      copyFileSync(p('site/assets/gifs', gif), path.join(dist, 'media', gif));
      return `](media/${gif})`;
    });
    md = md.replace(/\[([^\]]+)\]\(\.\.\/[^)]*README\.md[^)]*\)/g, '$1');
    writeFileSync(path.join(dist, 'README.md'), md);
  }
  console.log(`build-pkg: ${src.name}@${src.version} → ${path.relative(ROOT, dist)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2);
  for (const id of ids.length ? ids : Object.keys(PRODUCTS)) {
    if (!PRODUCTS[id]) { console.error(`build-pkg: produto desconhecido "${id}" (${Object.keys(PRODUCTS).join(', ')})`); process.exit(1); }
    await buildProduct(id);
  }
}
