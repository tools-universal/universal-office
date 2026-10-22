// Oráculo da frente LAYOUT DO TEXTO (hifenização, números de linha, quebras de
// linha e de página do parágrafo, layout da seção): roda os experimentos de
// textlayout-oracle.ps1 no Word real (COM invisível, pela trava global) e
// extrai o que interessa de cada .docx.
//
//   node tools/textlayout-lab/run.mjs [--only a,b] [--extract-only]
//
// Saídas:
//   tools/textlayout-lab/.out/<exp>.docx|json — brutos (fora do git)
//   tools/textlayout-lab/results/<exp>.xml    — w:body do document.xml, o que
//                                               mudou no settings.xml e no
//                                               styles.xml (× experimento "blank")
//   tools/textlayout-lab/results/<exp>.json   — estado lido por COM depois
// Os resultados viram casos de teste (docx-core/test/text-layout.test.ts e
// editor/src/text-layout.test.ts).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '.out');
const resDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
mkdirSync(resDir, { recursive: true });
const argv = process.argv.slice(2);
const oi = argv.indexOf('--only');
const only = oi >= 0 ? argv[oi + 1] : '';

if (!argv.includes('--extract-only')) {
  acquireWordLock('textlayout-lab');
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'textlayout-oracle.ps1'),
      '-OutDir', outDir, ...(only ? ['-Only', only] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
const strip = (xml) => xml
  .replace(/\s(w:rsid\w*|w14:paraId|w14:textId|w15:restartNumberingAfterBreak|w16cid:durableId)="[^"]*"/g, '')
  .replace(/<w:proofErr [^>]*\/>/g, '')
  .replace(/<w:rsids>.*?<\/w:rsids>/s, '')
  .replace(/<w:rsid w:val="[^"]*"\/>/g, '')
  .replace(/<w15:docId [^>]*\/>|<w14:docId [^>]*\/>|<w16du:[^>]*\/>/g, '');

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

/** Filhos diretos de w:settings como "nome → xml". */
function settingsKids(xml) {
  const s = xml.slice(xml.indexOf('<w:settings'));
  const inner = s.slice(s.indexOf('>') + 1, s.lastIndexOf('</w:settings>'));
  const out = new Map();
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf('<', i);
    if (lt < 0) break;
    const m = /^<([\w:]+)/.exec(inner.slice(lt));
    if (!m) break;
    const name = m[1];
    const selfEnd = inner.indexOf('>', lt);
    let end;
    if (inner[selfEnd - 1] === '/') end = selfEnd + 1;
    else {
      const close = `</${name}>`;
      end = inner.indexOf(close, selfEnd) + close.length;
    }
    const k = out.has(name) ? `${name}#${out.size}` : name;
    out.set(k, inner.slice(lt, end));
    i = end;
  }
  return out;
}

/** Estilos por styleId (w:style completo) e os latentes por nome. */
function styleMap(xml) {
  const out = new Map();
  for (const m of xml.matchAll(/<w:style [^>]*w:styleId="([^"]+)"[\s\S]*?<\/w:style>/g)) out.set(m[1], m[0]);
  for (const m of xml.matchAll(/<w:lsdException [^>]*w:name="([^"]+)"[^>]*\/>/g)) out.set(`lsd:${m[1]}`, m[0]);
  const dd = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.exec(xml);
  if (dd) out.set('docDefaults', dd[0]);
  return out;
}

const read = (f) => unzipSync(readFileSync(join(outDir, f)));
const blank = existsSync(join(outDir, 'blank.docx')) ? read('blank.docx') : null;
const baseSettings = blank ? settingsKids(strip(strFromU8(blank['word/settings.xml']))) : new Map();
const baseStyles = blank ? styleMap(strip(strFromU8(blank['word/styles.xml']))) : new Map();

for (const f of readdirSync(outDir).filter((x) => x.endsWith('.docx'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  const parts = read(f);
  const doc = strip(strFromU8(parts['word/document.xml']));
  const body = doc.slice(doc.indexOf('<w:body>'), doc.indexOf('</w:body>') + 9);
  const settings = settingsKids(strip(strFromU8(parts['word/settings.xml'])));
  const diff = [];
  for (const [k, v] of settings) if (baseSettings.get(k) !== v) diff.push(`+ ${v}`);
  for (const [k, v] of baseSettings) if (!settings.has(k)) diff.push(`- ${v}`);
  let out = pretty(body) + '\n\n<!-- settings.xml × blank -->\n' + (diff.join('\n') || '(igual)') + '\n';
  if (name === 'blank') out += '\n<!-- settings.xml (blank) -->\n' + [...baseSettings.values()].join('\n') + '\n';
  const styles = styleMap(strip(strFromU8(parts['word/styles.xml'])));
  const sd = [];
  // (Título 1/2 aparecem em todo documento depois do 1º da sessão — ruído, fora os de título)
  const noise = (k) => /^Ttulo[12](Char)?$/.test(k) && !name.includes('heading');
  for (const [k, v] of styles) if (baseStyles.get(k) !== v && !noise(k)) sd.push(`+ ${pretty(v)}`);
  for (const [k, v] of baseStyles) if (!styles.has(k)) sd.push(`- ${v}`);
  out += '\n<!-- styles.xml × blank -->\n' + (sd.join('\n') || '(igual)') + '\n';
  writeFileSync(join(resDir, `${name}.xml`), out);
  const j = join(outDir, `${name}.json`);
  if (existsSync(j)) copyFileSync(j, join(resDir, `${name}.json`));
}
console.log('resultados em', resDir);
