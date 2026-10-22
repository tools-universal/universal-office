// Oráculo de layout: gera os .docx sintéticos de um grupo de casos, pede ao
// Word real (COM invisível) o PDF de cada um e extrai as linhas (baseline, x,
// texto) para <caso>.word.json — o ESPERADO dos testes do docx-layout.
//
//   node tools/layout-oracle/run.mjs <grupo> [--force] [--only nome,nome] [--fresh]
//
// Saídas versionadas (sem fontes!): packages/docx-layout/test/oracle/<grupo>/
//   <caso>.docx        — entrada sintética
//   <caso>.word.json   — linhas medidas no PDF do Word
// Os PDFs do Word (que EMBUTEM subconjuntos das fontes da Microsoft) ficam em
// tools/layout-oracle/.out/ — fora do git (ver CLAUDE.md).
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const argv = process.argv.slice(2);
const group = argv[0];
if (!group) { console.error('uso: run.mjs <grupo> [--force] [--only a,b]'); process.exit(1); }
const force = argv.includes('--force');
const onlyIdx = argv.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(argv[onlyIdx + 1].split(',')) : null;

const { cases, vlines } = await import(pathToFileURL(join(here, 'cases', `${group}.mjs`)).href);
const fixDir = join(writeRoot, 'packages', 'docx-layout', 'test', 'oracle', group);
const docxTmp = join(here, '.out', group, 'docx');
const pdfDir = join(here, '.out', group, 'pdf');
mkdirSync(fixDir, { recursive: true });
mkdirSync(docxTmp, { recursive: true });

let n = 0;
for (const c of cases) {
  if (only && !only.has(c.name)) continue;
  const bytes = c.docx;
  const fix = join(fixDir, `${c.name}.docx`);
  const prev = existsSync(fix) ? readFileSync(fix) : null;
  const changed = !prev || Buffer.compare(prev, Buffer.from(bytes)) !== 0;
  if (changed) writeFileSync(fix, bytes);
  if (changed || force || !existsSync(join(fixDir, `${c.name}.word.json`))) {
    writeFileSync(join(docxTmp, `${c.name}.docx`), bytes);
    n++;
  }
}
console.log(`${n} caso(s) para o Word`);
// --fresh: uma sessão do Word POR caso — a substituição de fontes ausentes fica
// memorizada na sessão (um documento com altName muda a dos seguintes)
const fresh = argv.includes('--fresh');
// trava global: sessões paralelas não usam o Word ao mesmo tempo
if (n > 0) acquireWordLock(`layout-oracle ${group}`);
try {
if (n > 0 && !fresh) {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'word-export.ps1'),
    '-InDir', docxTmp, '-OutDir', pdfDir], { stdio: 'inherit', windowsHide: true });
} else if (n > 0) {
  for (const f of readdirSync(docxTmp).filter((x) => x.endsWith('.docx'))) {
    const one = join(here, '.out', group, 'one');
    mkdirSync(one, { recursive: true });
    for (const g of readdirSync(one)) (await import('node:fs')).unlinkSync(join(one, g));
    writeFileSync(join(one, f), readFileSync(join(docxTmp, f)));
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'word-export.ps1'),
      '-InDir', one, '-OutDir', pdfDir], { stdio: 'inherit', windowsHide: true });
  }
}
} finally { if (n > 0) releaseWordLock(); }
// extração (python/pdfium) de todos os PDFs presentes do grupo
const py = join(writeRoot, 'tools', 'corpus-lab', 'oracle_extract.py');
// (grupo com texto girado — caixa vertical: as linhas giradas vão em `vlines`)
execFileSync('python', ['-I', py, pdfDir, fixDir, ...(vlines ? ['--vlines'] : [])], { stdio: 'inherit', windowsHide: true });
// limpa os docx temporários já exportados
for (const f of readdirSync(docxTmp)) {
  if (existsSync(join(pdfDir, f.replace(/\.docx$/, '.pdf')))) {
    try { (await import('node:fs')).unlinkSync(join(docxTmp, f)); } catch { /* segue */ }
  }
}
