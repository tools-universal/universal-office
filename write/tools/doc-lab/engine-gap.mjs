// Distância entre o motor de layout (docx-layout) sobre a NOSSA conversão do
// .doc e sobre o .docx que o PRÓPRIO Word gerou do mesmo .doc: separa defeito
// do conversor de defeito do motor. Usa as ferramentas do corpus-lab
// (run-engine.mjs + compare.py) e compara pix_f1/line_match das duas tags.
//
// Uso: node write/tools/doc-lab/engine-gap.mjs [--only id,id] [--skip-build] [--skip-word]  (padrão: os 126 .doc)
//        [--tag deng] [--wtag dengw] [--min 0.02]
//   --skip-word: reaproveita a tag do Word (o .docx do Word não muda)
//   --min: só lista documentos cuja diferença (Word − nosso) passe disso
// Pré-requisito: o docx-layout já compilado (dist) e o oráculo do doc-lab (run-oracle).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_DIR, loadDocCorpus } from './corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const write = join(here, '..', '..');
const corpusLab = join(write, 'tools', 'corpus-lab');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
// tags próprias (não as do coordenador do corpus-lab): deng = nossa conversão, dengw = .docx do Word
const tag = opt('tag', 'deng'), wtag = opt('wtag', 'dengw');
const min = Number(opt('min', '0.02'));
const only = opt('only') ?? loadDocCorpus().map((d) => d.id).join(',');
// o laboratório do corpus fica um nível acima do doc-lab
const labRoot = join(LAB_DIR, '..');

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, maxBuffer: 1 << 26 });
const sel = ['--only', only];

if (!flag('skip-build')) run(process.execPath, [join(write, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', '.'], join(write, 'packages', 'docx-core'));
run(process.execPath, [join(corpusLab, 'run-engine.mjs'), '--tag', tag, ...sel, '--force'], write);
if (!flag('skip-word')) run(process.execPath, [join(corpusLab, 'run-engine.mjs'), '--tag', wtag, '--doc-via', 'word', ...sel, '--force'], write);
const py = process.env.PYTHON ?? 'python';
const pyOnly = ['--only', only];
for (const t of flag('skip-word') ? [tag] : [tag, wtag]) run(py, ['-I', 'compare.py', t, '--source', 'js', ...pyOnly], corpusLab);

const load = (t) => new Map(JSON.parse(readFileSync(join(labRoot, 'report', `${t}-js.json`), 'utf8')).map((r) => [r.id, r]));
const A = load(tag), B = load(wtag);
const ids = only.split(',');
const rows = [];
for (const id of ids) {
  const a = A.get(id), b = B.get(id);
  if (!a || !b) continue;
  rows.push({ id, f1: a.pix_f1, f1w: b.pix_f1, lm: a.line_match, lmw: b.line_match, pages: `${a.pages_o}/${b.pages_o}/${a.pages_w}` });
}
rows.sort((x, y) => (y.f1w - y.f1) - (x.f1w - x.f1));
const worse = rows.filter((r) => r.f1w - r.f1 > min || r.lmw - r.lm > min);
console.log(`\n${rows.length} documento(s); nosso pior que o do Word (> ${min} em pix_f1 ou line_match): ${worse.length}`);
console.log('id                   pix_f1 nosso/Word   line_match nosso/Word   páginas nosso/Word/PDF');
for (const r of rows.length <= 12 ? rows : worse) {
  console.log(`${r.id.padEnd(20)} ${r.f1?.toFixed(3)} / ${r.f1w?.toFixed(3)}       ${r.lm?.toFixed(3)} / ${r.lmw?.toFixed(3)}          ${r.pages}`);
}
const sum = (k) => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
console.log(`média pix_f1: nosso ${(sum('f1') / rows.length).toFixed(4)} × Word ${(sum('f1w') / rows.length).toFixed(4)}; line_match: ${(sum('lm') / rows.length).toFixed(4)} × ${(sum('lmw') / rows.length).toFixed(4)}`);
writeFileSync(join(LAB_DIR, 'engine-gap.json'), JSON.stringify({ geradoEm: new Date().toISOString(), rows }, null, 1));
