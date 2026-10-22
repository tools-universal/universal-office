// word-open-check -Nav sobre a saída do lossless-check --nav, em blocos de 100
// (cada bloco pega e solta a trava global do Word — o corpus inteiro seguraria
// o Word por ~1 h). Junta as linhas TSV e mostra o resumo por status.
//
//   node tools/nav-lab/run-open-check.mjs [pasta do --out] [--block 100]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) ?? 'E:/UniversalWriteTest/_lab/lossless-nav';
const bi = args.indexOf('--block');
const block = bi >= 0 ? Number(args[bi + 1]) : 100;
const rows = readFileSync(join(dir, 'manifest.tsv'), 'utf8').split('\n').filter(Boolean).length;
const out = [];
for (let from = 0; from < rows; from += block) {
  acquireWordLock('nav-lab word-open-check');
  try {
    const txt = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, '..', 'corpus-lab', 'word-open-check.ps1'),
      '-Dir', dir, '-Nav', '-Skip', String(from), '-Limit', String(block)], { encoding: 'utf8', windowsHide: true, timeout: 60 * 60 * 1000, maxBuffer: 64 << 20 });
    out.push(...txt.split(/\r?\n/).filter(Boolean));
  } finally { releaseWordLock(); }
  console.log(`… ${Math.min(rows, from + block)}/${rows}`);
}
writeFileSync(join(dir, 'word-open-nav.tsv'), out.join('\n') + '\n');
const by = {};
for (const l of out) { const s = l.split('\t')[1] ?? '?'; by[s] = (by[s] ?? 0) + 1; }
console.log('status:', by);
for (const l of out.filter((x) => x.split('\t')[1] !== 'ok').slice(0, 20)) console.log('  ', l);
