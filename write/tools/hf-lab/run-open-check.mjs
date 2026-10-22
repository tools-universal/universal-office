// word-open-check -Hf sobre a saída do lossless-check --hf, em blocos de 100
// (cada bloco pega e solta a trava global do Word — o corpus inteiro seguraria
// o Word por ~1 h). Junta as linhas TSV e mostra o resumo por status.
//
//   node tools/hf-lab/run-open-check.mjs [pasta do --out] [--block 100] [--from N]
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? 'E:/UniversalWriteTest/_lab/lossless-hf';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const block = opt('--block', 100);
const start = opt('--from', 0);
const rows = readFileSync(join(dir, 'manifest.tsv'), 'utf8').split('\n').filter(Boolean).length;
const outFile = join(dir, 'word-open-hf.tsv');
if (start === 0) writeFileSync(outFile, '');
for (let from = start; from < rows; from += block) {
  acquireWordLock('hf-lab word-open-check');
  try {
    const txt = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, '..', 'corpus-lab', 'word-open-check.ps1'),
      '-Dir', dir, '-Hf', '-Skip', String(from), '-Limit', String(block)], { encoding: 'utf8', windowsHide: true, timeout: 60 * 60 * 1000, maxBuffer: 64 << 20 });
    appendFileSync(outFile, txt.split(/\r?\n/).filter(Boolean).map((l) => l + '\n').join(''));
  } finally { releaseWordLock(); }
  console.log(`… ${Math.min(rows, from + block)}/${rows}`);
}
const out = readFileSync(outFile, 'utf8').split('\n').filter(Boolean);
const by = {};
for (const l of out) { const s = l.split('\t')[1] ?? '?'; by[s] = (by[s] ?? 0) + 1; }
console.log('status:', by);
for (const l of out.filter((x) => !x.split('\t')[1]?.startsWith('ok')).slice(0, 30)) console.log('  ', l);
