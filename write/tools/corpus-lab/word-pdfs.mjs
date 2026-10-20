// Gera as referências do corpus: o PDF que o PRÓPRIO Word exporta de cada
// documento, em CORPUS_ROOT/WordPdf/<tenant>/<nome>.pdf (fora do git).
//
//   node tools/corpus-lab/word-pdfs.mjs [--workers 3] [--per-session 1] [--timeout 180]
//        [--force] [--only id,id] [--tenant N] [--limit N]
//
// - Word invisível (COM), processos sem janela, em segundo plano;
// - uma sessão NOVA do Word por documento (--per-session agrupa): a
//   substituição de fonte ausente fica memorizada na sessão COM;
// - vigia: sem resposta em --timeout s, encerra SÓ a instância do Word que o
//   trabalhador criou (PID informado pelo .ps1) e segue;
// - fontes de NUVEM do Office baixadas durante a exportação (cache CloudFonts)
//   chegam tarde para o documento que as pediu — o Word desenha com a
//   substituta. Ao fim, os documentos exportados perto do download de uma
//   fonte nova são reexportados, até não chegar fonte nova.
// Estado: LAB_DIR/word-pdf/status.json (id → { status, pages, t0, t1 }).
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { buildManifest, selectDocs, LAB_DIR, WORD_PDF_DIR } from './corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const WORKERS = Number(opt('workers', 3));
const PER_SESSION = Number(opt('per-session', 1));
const TIMEOUT = Number(opt('timeout', 180)) * 1000;
const work = join(LAB_DIR, 'word-pdf');
mkdirSync(work, { recursive: true });
const statusFile = join(work, 'status.json');
const status = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, 'utf8')) : {};
const save = () => writeFileSync(statusFile, JSON.stringify(status, null, 1));
const log = (s) => { appendFileSync(join(work, 'run.log'), s + '\n'); };

const pdfOf = (d) => join(WORD_PDF_DIR, d.tenant, `${basename(d.path, extname(d.path))}.pdf`);
const docs = selectDocs(buildManifest(), argv);
const cloudDir = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Microsoft/FontCache/4/CloudFonts');
const cloudFonts = () => {
  const out = new Map();
  const walk = (d) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else out.set(p, statSync(p).mtimeMs); } };
  walk(cloudDir);
  return out;
};

/** Um trabalhador: um PowerShell com a lista; recomeça depois do documento que travou. */
async function runWorker(k, items) {
  let pending = items;
  while (pending.length) {
    const list = join(work, `list-${k}.txt`);
    writeFileSync(list, '﻿' + pending.map((d) => `${d.id}|${d.path}|${pdfOf(d)}`).join('\r\n'), 'utf8');
    const seen = new Set();
    let pid = null, current = pending[0], timedOut = false;
    await new Promise((resolve) => {
      const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', join(here, 'word-pdf.ps1'), '-List', list, '-PerSession', String(PER_SESSION)], { windowsHide: true });
      let timer;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          timedOut = true;
          log(`[${k}] vigia: ${current?.id} sem resposta em ${TIMEOUT / 1000}s — encerrando Word ${pid}`);
          if (pid) try { execFileSync('taskkill', ['/PID', String(pid), '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* já saiu */ }
          ps.kill();
        }, TIMEOUT);
      };
      arm();
      let t0 = Date.now(), buf = '';
      ps.stdout.on('data', (c) => {
        buf += c.toString('utf8');
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          arm();
          log(`[${k}] ${line}`);
          let m;
          if ((m = /^PID (\d+)/.exec(line))) { pid = Number(m[1]); continue; }
          if (line.startsWith('ABORT')) { console.error(line); process.exit(3); }
          if ((m = /^(OK|ERR) (\S+) ?(.*)$/.exec(line))) {
            const id = m[2];
            seen.add(id);
            status[id] = m[1] === 'OK' ? { status: 'ok', pages: Number(m[3]), t0, t1: Date.now() } : { status: 'error', error: m[3], t0, t1: Date.now() };
            save();
            t0 = Date.now();
            current = pending.find((d) => !seen.has(d.id));
            const done = Object.keys(status).length;
            if (done % 25 === 0) console.log(`${done} exportados`);
          }
        }
      });
      ps.stderr.on('data', (c) => log(`[${k}] STDERR ${c.toString('utf8').trim()}`));
      ps.on('close', () => { clearTimeout(timer); resolve(); });
    });
    const rest = pending.filter((d) => !seen.has(d.id));
    if (rest.length && (timedOut || rest.length === pending.length)) {
      status[rest[0].id] = { status: 'timeout', t0: Date.now(), t1: Date.now() };
      save();
      pending = rest.slice(1);
    } else pending = rest;
  }
}

async function exportAll(list) {
  const lanes = Array.from({ length: Math.min(WORKERS, list.length) }, () => []);
  list.forEach((d, i) => lanes[i % lanes.length].push(d));
  await Promise.all(lanes.map((l, k) => runWorker(k, l)));
}

let todo = docs.filter((d) => argv.includes('--force') || !(status[d.id]?.status === 'ok' && existsSync(pdfOf(d))));
console.log(`${todo.length} de ${docs.length} documentos para o Word (${WORKERS} trabalhadores, ${PER_SESSION} doc/sessão)`);
for (let round = 0; todo.length && round < 4; round++) {
  const before = cloudFonts();
  const tStart = Date.now();
  await exportAll(todo);
  const fresh = [...cloudFonts()].filter(([p, t]) => !before.has(p) || before.get(p) !== t).map(([p, t]) => ({ p, t }));
  if (!fresh.length) break;
  for (const f of fresh) log(`fonte de nuvem nova: ${basename(f.p)} ${new Date(f.t).toISOString()}`);
  // documentos em exportação até 2 min antes do download: podem ter saído com a substituta
  const ids = new Set(todo.map((d) => d.id));
  todo = docs.filter((d) => ids.has(d.id) && status[d.id] && fresh.some((f) => status[d.id].t0 - 120_000 <= f.t && f.t <= status[d.id].t1 + 5_000 && f.t >= tStart));
  console.log(`${fresh.length} fonte(s) de nuvem baixada(s) — reexportando ${todo.length} documento(s)`);
}
const by = Object.values(status).reduce((m, s) => (m[s.status] = (m[s.status] ?? 0) + 1, m), {});
console.log('fim:', by, '→', WORD_PDF_DIR);
buildManifest();
