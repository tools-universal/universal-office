// Teste de REPRODUÇÃO AUTOMÁTICA ponta a ponta: PowerPoint (oráculo) × nosso.
//   1. corpus   gen-playback.ps1 — decks .pptx + .ppt via COM (só se faltar, ou --gen)
//   2. oráculo  capture-ppt.ps1  — PowerPoint toca com intervalos e grava vídeo a N fps
//   3. nosso    capture-ours.mjs — <universal-presentation-viewer>.play() sob relógio
//               virtual, capturado nos MESMOS instantes
//   4. compara  compare-playback.mjs — métricas estrita/alinhada/tempo + relatórios HTML
//
// Uso: node tools/ppt-lab/playback/run-playback.mjs [--decks pb-tempo,showcase_animado]
//        [--fps 30] [--default-slide 3] [--gen] [--force-ppt] [--skip-ours] [--jobs 2]
// Resultado: tools/ppt-lab/results/playback/index.html
//   (servir com: node tools/ppt-lab/playback/serve.mjs — o vídeo precisa de Range)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const slidesRoot = join(here, '..', '..', '..');
const samples = join(slidesRoot, 'samples');
const corpusDir = join(samples, 'playback');
const outRoot = join(here, '..', 'results', 'playback');

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(`--${f}`);
const opt = (f, d) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : d; };
const fps = Number(opt('fps', '30'));
const defaultSlideSec = Number(opt('default-slide', '3'));
const jobs = opt('jobs', '2');
const only = opt('decks', '').split(',').filter(Boolean);

const win = (p) => p.replace(/\//g, '\\');
function run(cmd, args, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', windowsHide: true });
  if (r.status !== 0) throw new Error(`${label} falhou (${r.status})`);
}
const ps = (script, args) => run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', win(join(here, script)), ...args], script);

// 1) corpus
if (flag('gen') || !existsSync(corpusDir) || !readdirSync(corpusDir).some((f) => f.endsWith('.pptx'))) {
  ps('gen-playback.ps1', []);
}
const corpus = [
  ...readdirSync(corpusDir).filter((f) => /\.pptx?$/i.test(f)).map((f) => join(corpusDir, f)),
  join(samples, 'showcase_animado.pptx'),
].filter((f) => existsSync(f))
  .filter((f) => !only.length || only.includes(basename(f, extname(f))))
  .sort();
console.log(`corpus: ${corpus.length} arquivos (${corpus.map((f) => basename(f)).join(', ')})`);

// 2) oráculo (PowerPoint) — só o que falta, salvo --force-ppt
const needPpt = corpus.filter((f) => flag('force-ppt') ||
  !existsSync(join(outRoot, basename(f, extname(f)), extname(f).slice(1).toLowerCase(), 'ppt.mp4')));
if (needPpt.length) {
  ps('capture-ppt.ps1', ['-OutRoot', win(outRoot), '-Files', needPpt.map(win).join('|'),
    '-Fps', String(fps), '-DefaultSlideSec', String(defaultSlideSec)]);
}

// 3) nosso player
if (!flag('skip-ours')) {
  run(process.execPath, [join(here, 'capture-ours.mjs'), '--out', outRoot, '--fps', String(fps),
    '--default-slide', String(defaultSlideSec * 1000), '--jobs', jobs, ...corpus], 'capture-ours.mjs');
}

// 4) comparação + relatórios
const targets = corpus.map((f) => `${basename(f, extname(f))}/${extname(f).slice(1).toLowerCase()}`)
  .sort((a, b) => (a.endsWith('/pptx') === b.endsWith('/pptx') ? a.localeCompare(b) : a.endsWith('/pptx') ? -1 : 1));
run(process.execPath, [join(here, 'compare-playback.mjs'), '--root', outRoot, ...targets], 'compare-playback.mjs');
console.log(`\nrelatório: ${join(outRoot, 'index.html')}\n  (node tools/ppt-lab/playback/serve.mjs → http://127.0.0.1:8126/tools/ppt-lab/results/playback/index.html)`);
