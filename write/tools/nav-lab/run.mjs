// Oráculo da frente NAVEGAÇÃO (régua, linhas de grade, painel, modos de
// exibição): roda os experimentos de nav-oracle.ps1 no Word real (COM
// invisível, pela trava global) e extrai o que interessa de cada .docx.
//
//   node tools/nav-lab/run.mjs [--only a,b] [--extract-only]
//
// Saídas:
//   tools/nav-lab/.out/<exp>.docx|json   — brutos (fora do git)
//   tools/nav-lab/results/<exp>.xml      — w:body do document.xml, o que mudou
//                                          no settings.xml (× experimento
//                                          "blank") e os w:abstractNum mexidos
//   tools/nav-lab/results/<exp>.json     — padrões e opções lidos por COM
// Os resultados viram casos de teste (editor/src/ruler.test.ts e
// docx-core/test/tabs.test.ts).
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
  acquireWordLock('nav-lab');
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'nav-oracle.ps1'),
      '-OutDir', outDir, ...(only ? ['-Only', only] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
const strip = (xml) => xml
  .replace(/\s(w:rsid\w*|w14:paraId|w14:textId|w15:restartNumberingAfterBreak|w16cid:durableId)="[^"]*"/g, '')
  .replace(/<w:proofErr [^>]*\/>/g, '')
  .replace(/<w:rsids>.*?<\/w:rsids>/s, '')
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
      // fecha no </name> do mesmo nível (sem aninhamento do mesmo nome nos settings)
      const close = `</${name}>`;
      end = inner.indexOf(close, selfEnd) + close.length;
    }
    const k = out.has(name) ? `${name}#${out.size}` : name;
    out.set(k, inner.slice(lt, end));
    i = end;
  }
  return out;
}

const read = (f) => unzipSync(readFileSync(join(outDir, f)));
const baseSettings = existsSync(join(outDir, 'blank.docx')) ? settingsKids(strip(strFromU8(read('blank.docx')['word/settings.xml']))) : new Map();
const baseNumbering = (name) => name.startsWith('ind-list') || name.startsWith('tab-list');

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
  if (baseNumbering(name) && parts['word/numbering.xml']) {
    const num = strip(strFromU8(parts['word/numbering.xml']));
    const abs = num.match(/<w:abstractNum [\s\S]*?<\/w:abstractNum>/g) ?? [];
    out += '\n<!-- numbering.xml: 1º nível de cada abstractNum -->\n' + abs.map((a) => pretty(a.slice(0, a.indexOf('</w:lvl>') + 8))).join('\n') + '\n';
  }
  if (parts['word/styles.xml'] && name.includes('style')) {
    const st = strip(strFromU8(parts['word/styles.xml']));
    const m = st.match(/<w:style [^>]*w:styleId="TabSty"[\s\S]*?<\/w:style>/);
    if (m) out += '\n<!-- styles.xml: TabSty -->\n' + pretty(m[0]) + '\n';
  }
  writeFileSync(join(resDir, `${name}.xml`), out);
  const j = join(outDir, `${name}.json`);
  if (existsSync(j)) copyFileSync(j, join(resDir, `${name}.json`));
}
console.log('resultados em', resDir);
