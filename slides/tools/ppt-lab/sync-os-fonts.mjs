// Resolve as fontes que um deck usa a partir das fontes DISPONÍVEIS NO SO —
// C:\Windows\Fonts, fontes por usuário e o cache CloudFonts do Office (que o
// queryLocalFonts NÃO enxerga) — copiando os TTFs casados por FAMÍLIA (tabela
// `name`) para demo/fonts/os/ e gerando os @font-face em os-fonts.css.
// É a mesma filosofia do Universal Write (fontes do SO), estendida ao pipeline
// headless que não tem permissão de queryLocalFonts.
//
// Nomes/pesos vêm de `fontInfo` (playback/fonts.mjs): tabela `name` em INGLÊS
// (langID 0x409 — a 1ª entrada do Windows costuma ser catalã: "Negreta",
// "Cursiva", que fazia o negrito/itálico da Arial sair como regular) e peso /
// itálico pela tabela OS/2. Arquivos órfãos de sincronizações antigas são
// removidos.
//
// Uso: node tools/ppt-lab/sync-os-fonts.mjs [deck1.pptx deck2.pptx …]   (default: samples/haunted-mansion.pptx)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { fontInfo } from './playback/fonts.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const { PptxPackage } = require(join(slidesRoot, 'packages/slides-core/dist/package.js'));
const { collectDeckTypefaces } = require(join(slidesRoot, 'packages/slides-core/dist/fonts.js'));

const decks = process.argv.slice(2).length ? process.argv.slice(2) : [join(slidesRoot, 'samples', 'haunted-mansion.pptx')];
const outDir = join(slidesRoot, 'packages', 'slides', 'demo', 'fonts', 'os');
mkdirSync(outDir, { recursive: true });

// 1) famílias que os decks realmente usam
const wanted = new Set();
for (const deckPath of decks) {
  const pkg = PptxPackage.load(readFileSync(deckPath));
  for (const f of collectDeckTypefaces(pkg)) wanted.add(f.toLowerCase());
}
console.log('decks usam:', [...wanted].join(', '));

// 2) varre as fontes do SO (sistema + usuário + CloudFonts do Office)
const roots = [
  'C:/Windows/Fonts',
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/Windows/Fonts'),
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft/FontCache/4/CloudFonts'),
];
const found = [];
for (const root of roots) {
  if (!existsSync(root)) continue;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      try {
        const st = statSync(p);
        if (st.isDirectory()) { stack.push(p); continue; }
        if (!/\.(ttf|otf)$/i.test(f)) continue;
        const info = fontInfo(readFileSync(p));
        if (!info?.family) continue;
        if (wanted.has(info.family.toLowerCase())) found.push({ ...info, path: p });
      } catch { /* arquivo inacessível */ }
    }
  }
}

// 3) copia + gera @font-face (peso/estilo pela tabela OS/2)
const css = [];
const seen = new Set();
const keep = new Set();
for (const f of found) {
  const key = `${f.family.toLowerCase()}|${f.weight}|${f.italic}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const file = `${f.family.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${f.sub.replace(/[^a-z0-9]/gi, '').toLowerCase()}.ttf`;
  copyFileSync(f.path, join(outDir, file));
  keep.add(file);
  css.push(`@font-face { font-family: '${f.family}'; src: url('./os/${file}'); font-weight: ${f.weight}; font-style: ${f.italic ? 'italic' : 'normal'}; }`);
  console.log('OK', f.family, f.sub, f.weight, f.italic ? 'italic' : '', '<-', f.path);
}
writeFileSync(join(slidesRoot, 'packages', 'slides', 'demo', 'fonts', 'os-fonts.css'), css.join('\n') + '\n');
// órfãos de sincronizações anteriores (ex.: nomes catalães) saem da pasta
for (const f of readdirSync(outDir)) if (!keep.has(f)) unlinkSync(join(outDir, f));
const missing = [...wanted].filter((w) => !found.some((f) => f.family.toLowerCase() === w));
console.log(css.length, 'faces sincronizadas;', 'ausentes no SO:', missing.join(', ') || 'nenhuma');
