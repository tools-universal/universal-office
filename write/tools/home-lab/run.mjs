// Oráculo da PÁGINA INICIAL: roda um conjunto de experimentos (exp-*.ps1) no Word
// real (COM invisível, pela trava global) e extrai o que interessa de cada .docx.
//
//   node tools/home-lab/run.mjs <conjunto> [--only a,b] [--pdf] [--extract-only] [--styles]
//     conjunto = underline | lists | paste | effects | edit  (arquivo exp-<conjunto>.ps1)
//
// Saídas:
//   tools/home-lab/.out/<conjunto>/<exp>.docx|pdf|json — brutos (fora do git: o PDF embute fontes)
//   tools/home-lab/results/<conjunto>/<exp>.xml          — corpo do document.xml (uma tag por
//        linha, sem rsid/paraId), numbering.xml inteiro e, com --styles, os estilos que o
//        experimento acrescentou ao modelo Normal
//   tools/home-lab/results/<conjunto>/<exp>.json         — medidas do Word depois da operação
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

/** Uma tag por linha, com recuo (texto curto fica na linha da tag). */
export function pretty(xml) {
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  let depth = 0;
  const out = [];
  for (const l of lines) {
    if (l.startsWith('</')) depth = Math.max(0, depth - 1);
    out.push('  '.repeat(depth) + l);
    if (l.startsWith('<') && !l.startsWith('</') && !l.endsWith('/>') && !l.includes('</') && !l.startsWith('<?')) depth++;
  }
  return out.join('\n');
}
export const strip = (xml) => xml.replace(/\s(w:rsid\w*|w14:paraId|w14:textId|wp14:anchorId|wp14:editId|w15:restartNumberingAfterBreak)="[^"]*"/g, '');

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const set = argv[0];
if (!set || set.startsWith('--')) { console.error('uso: run.mjs <conjunto> [--only a,b] [--pdf] [--extract-only] [--styles]'); process.exit(1); }
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const only = opt('--only');
const outDir = join(here, '.out', set);
const resDir = join(here, 'results', set);
mkdirSync(outDir, { recursive: true });
mkdirSync(resDir, { recursive: true });

if (!argv.includes('--extract-only')) {
  acquireWordLock(`home-lab ${set}`);
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'home-oracle.ps1'),
      '-OutDir', outDir, '-Set', `exp-${set}.ps1`,
      ...(only ? ['-Only', only] : []), ...(argv.includes('--pdf') ? ['-Pdf'] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
// estilos do documento em branco (para --styles mostrar só os acrescentados)
let blankStyles = null;
// (o w:rsid de cada estilo muda a cada sessão do Word: fora da comparação)
const styleIds = (xml) => new Map([...xml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<\/w:style>/g)].map((m) => [m[1], m[0].replace(/<w:rsid w:val="[^"]*"\/>/g, '')]));
for (const f of readdirSync(outDir).filter((x) => x.endsWith('.docx'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  const z = unzipSync(readFileSync(join(outDir, f)));
  const part = (p) => (z[p] ? strFromU8(z[p]) : '');
  const doc = part('word/document.xml');
  const body = doc.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? '';
  let out = `<!-- document.xml (corpo) -->\n${pretty(strip(body))}\n`;
  const num = part('word/numbering.xml');
  if (num) out += `\n<!-- numbering.xml -->\n${pretty(strip(num.replace(/^<\?xml[^>]*\?>/, '').replace(/<w:numbering\b[^>]*>/, '<w:numbering>')))}\n`;
  if (argv.includes('--styles')) {
    const st = part('word/styles.xml');
    if (!blankStyles && existsSync(join(here, 'blank-styles.xml'))) blankStyles = styleIds(readFileSync(join(here, 'blank-styles.xml'), 'utf8'));
    const extra = [...styleIds(st)].filter(([id, x]) => !blankStyles || blankStyles.get(id) !== x).map(([, x]) => x);
    if (extra.length) out += `\n<!-- styles.xml (novos ou mudados) -->\n${pretty(strip(extra.join('')))}\n`;
  }
  writeFileSync(join(resDir, `${name}.xml`), out);
  const js = join(outDir, `${name}.json`);
  if (existsSync(js)) writeFileSync(join(resDir, `${name}.json`), readFileSync(js, 'utf8').replace(/^﻿/, ''));
}
console.log(`resultados em ${resDir}`);
