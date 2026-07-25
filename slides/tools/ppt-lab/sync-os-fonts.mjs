// Resolve as fontes que um deck usa a partir das fontes DISPONÍVEIS NO SO —
// C:\Windows\Fonts, fontes por usuário e o cache CloudFonts do Office (que o
// queryLocalFonts NÃO enxerga) — copiando os TTFs casados por FAMÍLIA (tabela
// `name`) para demo/fonts/os/ e gerando os @font-face em os-fonts.css.
// É a mesma filosofia do Universal Write (fontes do SO), estendida ao pipeline
// headless que não tem permissão de queryLocalFonts.
//
// Uso: node tools/ppt-lab/sync-os-fonts.mjs samples/haunted-mansion.pptx
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..');
const { PptxPackage } = require(join(slidesRoot, 'packages/slides-core/dist/package.js'));
const { collectDeckTypefaces } = require(join(slidesRoot, 'packages/slides-core/dist/fonts.js'));

const deckPath = process.argv[2] ?? join(slidesRoot, 'samples', 'haunted-mansion.pptx');
const outDir = join(slidesRoot, 'packages', 'slides', 'demo', 'fonts', 'os');
mkdirSync(outDir, { recursive: true });

/** Lê família (id 1) e subfamília (id 2) da tabela name de um sfnt. */
function fontNames(buf) {
  try {
    const num = buf.readUInt16BE(4);
    let nameOff = -1;
    for (let i = 0; i < num; i++) {
      const o = 12 + i * 16;
      if (buf.toString('latin1', o, o + 4) === 'name') nameOff = buf.readUInt32BE(o + 8);
    }
    if (nameOff < 0) return null;
    const count = buf.readUInt16BE(nameOff + 2);
    const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
    const get = (id) => {
      for (let i = 0; i < count; i++) {
        const r = nameOff + 6 + i * 12;
        if (buf.readUInt16BE(r) === 3 && buf.readUInt16BE(r + 6) === id) {
          const len = buf.readUInt16BE(r + 8), off = buf.readUInt16BE(r + 10);
          return Buffer.from(buf.subarray(strOff + off, strOff + off + len)).swap16().toString('utf16le');
        }
      }
      return undefined;
    };
    return { family: get(1), sub: get(2) ?? 'Regular' };
  } catch { return null; }
}

// 1) famílias que o deck realmente usa
const pkg = PptxPackage.load(readFileSync(deckPath));
const wanted = new Set(collectDeckTypefaces(pkg).map((f) => f.toLowerCase()));
console.log('deck usa:', [...wanted].join(', '));

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
        const names = fontNames(readFileSync(p));
        if (!names?.family) continue;
        if (wanted.has(names.family.toLowerCase())) found.push({ ...names, path: p });
      } catch { /* arquivo inacessível */ }
    }
  }
}

// 3) copia + gera @font-face (peso/estilo pela subfamília)
const css = [];
const seen = new Set();
for (const f of found) {
  const key = `${f.family}|${f.sub}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const sub = f.sub.toLowerCase();
  const weight = /bold|black|heavy|semibold|demi|medium/.test(sub)
    ? (/medium/.test(sub) ? '500' : '700') : '400';
  const style = /italic|oblique/.test(sub) ? 'italic' : 'normal';
  const file = `${f.family.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${sub.replace(/[^a-z0-9]/gi, '')}.ttf`;
  copyFileSync(f.path, join(outDir, file));
  css.push(`@font-face { font-family: '${f.family}'; src: url('./os/${file}'); font-weight: ${weight}; font-style: ${style}; }`);
  console.log('OK', f.family, f.sub, '<-', f.path);
}
writeFileSync(join(slidesRoot, 'packages', 'slides', 'demo', 'fonts', 'os-fonts.css'), css.join('\n') + '\n');
const missing = [...wanted].filter((w) => !found.some((f) => f.family.toLowerCase() === w));
console.log(css.length, 'faces sincronizadas;', 'ausentes no SO:', missing.join(', ') || 'nenhuma');
