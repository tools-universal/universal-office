// Oráculo da CAIXA DE TEXTO: roda os experimentos de experiments.ps1 no Word real
// (COM invisível, pela trava global) e extrai o que interessa de cada .docx.
//
//   node tools/textbox-lab/run.mjs [--only a,b] [--pdf] [--extract-only]
//
// Saídas:
//   tools/textbox-lab/.out/<exp>.docx|pdf|json — brutos (fora do git: o PDF embute fontes)
//   tools/textbox-lab/results/<exp>.xml        — cada objeto de desenho do document.xml
//                                                (uma tag por linha); def-*: settings e
//                                                tema; bb-*: o corpo inteiro (só a estrutura
//                                                é usada — o conteúdo da galeria do Word
//                                                não entra no código)
//   tools/textbox-lab/results/<exp>.json       — medidas do Word depois da operação
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';
import { patternPng } from '../image-lab/test-image.mjs';

/** Uma tag por linha, com recuo (texto curto fica na linha da tag). */
function pretty(xml) {
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

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '.out');
const imgDir = join(outDir, 'img');
const resDir = join(here, 'results');
mkdirSync(imgDir, { recursive: true });
mkdirSync(resDir, { recursive: true });
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const only = opt('--only');

writeFileSync(join(imgDir, 'pattern.png'), patternPng());

if (!argv.includes('--extract-only')) {
  acquireWordLock('textbox-lab');
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'textbox-oracle.ps1'),
      '-OutDir', outDir, '-Image', join(imgDir, 'pattern.png'),
      ...(only ? ['-Only', only] : []), ...(argv.includes('--pdf') ? ['-Pdf'] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
const strip = (xml) => xml.replace(/\s(w:rsid\w*|w14:paraId|w14:textId|wp14:anchorId|wp14:editId)="[^"]*"/g, '');

for (const f of readdirSync(outDir).filter((x) => x.endsWith('.docx'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  const parts = unzipSync(readFileSync(join(outDir, f)));
  const doc = strip(strFromU8(parts['word/document.xml']));
  const objs = [...doc.matchAll(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>|<w:drawing>[\s\S]*?<\/w:drawing>|<w:pict[^>]*>[\s\S]*?<\/w:pict>/g)].map((m) => m[0]);
  const settings = strFromU8(parts['word/settings.xml'] ?? new Uint8Array());
  const compat = /<w:compatSetting w:name="compatibilityMode"[^>]*>/.exec(settings)?.[0] ?? '';
  const media = Object.keys(parts).filter((p) => p.startsWith('word/media/')).map((p) => `${p} ${parts[p].length}`);
  let out = `<!-- ${compat} -->\n${media.length ? `<!-- media: ${media.join(', ')} -->\n` : ''}`;
  if (name.startsWith('bb-')) {
    out += pretty(/<w:body>[\s\S]*<\/w:body>/.exec(doc)?.[0] ?? '') + '\n';
  } else {
    out += objs.map(pretty).join('\n\n') + '\n';
  }
  // cabeçalhos com desenho
  for (const p of Object.keys(parts).filter((k) => /^word\/header\d+\.xml$/.test(k))) {
    const hx = strip(strFromU8(parts[p]));
    const hobjs = [...hx.matchAll(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>|<w:drawing>[\s\S]*?<\/w:drawing>|<w:pict[^>]*>[\s\S]*?<\/w:pict>/g)].map((m) => m[0]);
    if (hobjs.length) out += `\n<!-- ${p} -->\n` + hobjs.map(pretty).join('\n\n') + '\n';
  }
  if (name.startsWith('def-')) {
    out += `\n<!-- settings.xml -->\n${pretty(strip(settings))}\n`;
    const theme = strFromU8(parts['word/theme/theme1.xml'] ?? new Uint8Array());
    const od = /<a:objectDefaults\/>|<a:objectDefaults>[\s\S]*?<\/a:objectDefaults>/.exec(theme)?.[0] ?? '(sem objectDefaults)';
    out += `\n<!-- theme1.xml objectDefaults -->\n${pretty(od)}\n`;
  }
  writeFileSync(join(resDir, `${name}.xml`), out);
  const js = join(outDir, `${name}.json`);
  if (existsSync(js)) copyFileSync(js, join(resDir, `${name}.json`));
}
// experimentos sem .docx (NoSave): só o json
for (const f of readdirSync(outDir).filter((x) => x.endsWith('.json'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  if (!existsSync(join(outDir, `${name}.docx`))) copyFileSync(join(outDir, f), join(resDir, f));
}
console.log('resultados em', resDir);
