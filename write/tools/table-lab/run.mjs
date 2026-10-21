// Oráculo das TABELAS: roda os experimentos de table-oracle.ps1 no Word real
// (COM invisível, pela trava global) e extrai o que interessa de cada .docx.
//
//   node tools/table-lab/run.mjs [--only a,b] [--extract-only]
//
// Saídas:
//   tools/table-lab/.out/<exp>.docx|json   — brutos (fora do git)
//   tools/table-lab/results/<exp>.xml      — w:body do document.xml + estilos
//                                            de tabela do styles.xml, sem rsid
//   tools/table-lab/results/<exp>.json     — seleção depois e passos de desfazer
// Os resultados viram casos de teste (docx-core/test/table-oracle.test.ts).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
  acquireWordLock('table-lab');
  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'table-oracle.ps1'),
      '-OutDir', outDir, ...(only ? ['-Only', only] : [])], { stdio: 'inherit', windowsHide: true });
  } finally { releaseWordLock(); }
}

const wanted = only ? new Set(only.split(',')) : null;
const strip = (xml) => xml
  .replace(/\s(w:rsid\w*|w14:paraId|w14:textId)="[^"]*"/g, '')
  .replace(/<w:proofErr [^>]*\/>/g, '');

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

for (const f of readdirSync(outDir).filter((x) => x.endsWith('.docx'))) {
  const name = f.slice(0, -5);
  if (wanted && !wanted.has(name)) continue;
  const parts = unzipSync(readFileSync(join(outDir, f)));
  const doc = strip(strFromU8(parts['word/document.xml']));
  const body = doc.slice(doc.indexOf('<w:body>'), doc.indexOf('</w:body>') + 9);
  const styles = strip(strFromU8(parts['word/styles.xml'] ?? new Uint8Array()));
  const tblStyles = [...styles.matchAll(/<w:style w:type="table"[\s\S]*?<\/w:style>/g)].map((m) => m[0]);
  const settings = strip(strFromU8(parts['word/settings.xml'] ?? new Uint8Array()));
  const compat = /<w:compatSetting w:name="compatibilityMode"[^>]*w:val="(\d+)"/.exec(settings)?.[1];
  if (name === 'styles-all') {
    // 247 tabelas no corpo: só as definições interessam (gen-builtin-styles.mjs
    // as transforma no módulo do docx-core); o bruto fica fora do git
    writeFileSync(join(outDir, 'styles-all.styles.xml'), tblStyles.join('\n') + '\n');
  } else writeFileSync(join(resDir, `${name}.xml`),
    `<!-- ${name}: document.xml (w:body) + estilos de tabela; compat ${compat ?? '?'} -->\n` +
    pretty(body) + '\n\n' + tblStyles.map(pretty).join('\n\n') + '\n');
  const js = join(outDir, `${name}.json`);
  if (existsSync(js)) writeFileSync(join(resDir, `${name}.json`), readFileSync(js, 'utf8').replace(/^﻿/, ''));
}
console.log('resultados em', resDir);
