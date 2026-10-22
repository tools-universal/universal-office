// word-open-check -TextLayout sobre a saída do lossless-check --textlayout, em blocos
// de 100 (cada bloco pega e solta a trava global do Word — o corpus inteiro seguraria
// o Word por ~1 h). Junta as linhas TSV e mostra o resumo por status.
//
//   node tools/textlayout-lab/run-open-check.mjs [pasta do --out] [--block 100] [--from N]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? 'E:/UniversalWriteTest/_lab/textlayout-out';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const block = opt('--block', 100);
const first = opt('--from', 0);
const rows = readFileSync(join(dir, 'manifest.tsv'), 'utf8').split('\n').filter(Boolean).length;
const tsv = join(dir, 'word-open-textlayout.tsv');
// (retomável: --from continua um arquivo já começado)
const out = first > 0 && existsSync(tsv) ? readFileSync(tsv, 'utf8').split(/\r?\n/).filter(Boolean) : [];
for (let from = first; from < rows; from += block) {
  acquireWordLock('textlayout-lab word-open-check');
  try {
    const txt = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', join(here, '..', 'corpus-lab', 'word-open-check.ps1'),
      '-Dir', dir, '-TextLayout', '-Skip', String(from), '-Limit', String(block)], { encoding: 'utf8', windowsHide: true, timeout: 60 * 60 * 1000, maxBuffer: 64 << 20 });
    out.push(...txt.split(/\r?\n/).filter(Boolean));
  } finally { releaseWordLock(); }
  writeFileSync(tsv, out.join('\n') + '\n');
  console.log(`… ${Math.min(rows, from + block)}/${rows}`);
}
const by = {};
for (const l of out) { const s = l.split('\t')[1] ?? '?'; by[s] = (by[s] ?? 0) + 1; }
console.log('status:', by);
for (const l of out.filter((x) => !/^(ok|ok-protected)$/.test(x.split('\t')[1] ?? '')).slice(0, 30)) console.log('  ', l.slice(0, 400));
