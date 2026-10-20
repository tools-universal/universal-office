// Gera as referências do corpus: o PDF que o PRÓPRIO Word exporta de cada
// documento, em CORPUS_ROOT/WordPdf/<caminho relativo do documento>.pdf
// (fora do git; ver wordPdfPath em corpus.mjs).
//
//   node tools/corpus-lab/word-pdfs.mjs [--workers 3] [--per-session 1] [--timeout 180]
//        [--force] [--only id,id] [--tenant N] [--limit N]
//
// - Word invisível (COM), processos sem janela, em segundo plano;
// - uma sessão NOVA do Word por documento (--per-session agrupa): a
//   substituição de fonte ausente fica memorizada na sessão COM;
// - vigia: sem resposta em --timeout s, encerra SÓ a instância do Word que o
//   trabalhador criou (PID … PID-END informados pelo .ps1; travou antes de
//   informar o PID: o WINWORD que surgiu depois do BEFORE) e segue;
// - ABORT de um trabalhador (instância do Word não era nova) encerra os
//   PowerShell e os Word de TODOS antes de sair;
// - documentos criptografados (IRM: o Word pede credencial e pode abrir
//   janela; senha) são pulados — status skipped-irm / skipped-password;
// - fontes de NUVEM do Office baixadas durante a exportação (cache CloudFonts)
//   chegam tarde para o documento que as pediu — o Word desenha com a
//   substituta. Ao fim, os documentos exportados perto do download de uma
//   fonte nova são reexportados, até não chegar fonte nova.
// Estado: LAB_DIR/word-pdf/status.json (id → { status, pages, t0, t1 }).
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { buildManifest, selectDocs, wordPdfPath, LAB_DIR, WORD_PDF_DIR } from './corpus.mjs';

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

const pdfOf = (d) => wordPdfPath(d.rel);
const docs = selectDocs(buildManifest(), argv);
const cloudDir = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Microsoft/FontCache/4/CloudFonts');
const cloudFonts = () => {
  const out = new Map();
  const walk = (d) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else out.set(p, statSync(p).mtimeMs); } };
  walk(cloudDir);
  return out;
};

/** Trabalhadores vivos: o PowerShell e o Word de cada um (vigia e ABORT). */
const lanes = new Map();
const killPid = (pid) => { try { execFileSync('taskkill', ['/PID', String(pid), '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* já saiu */ } };
const wordPids = () => {
  try {
    return execFileSync('tasklist', ['/FI', 'IMAGENAME eq WINWORD.EXE', '/FO', 'CSV', '/NH'], { windowsHide: true, encoding: 'utf8' })
      .split(/\r?\n/).map((l) => Number(l.split('","')[1])).filter((n) => n > 0);
  } catch { return []; }
};
function abortAll(why) {
  console.error(why);
  for (const w of lanes.values()) { if (w.pid) killPid(w.pid); w.ps?.kill(); }
  process.exit(3);
}

/** Um trabalhador: um PowerShell com a lista; recomeça depois do documento que travou. */
async function runWorker(k, items) {
  let pending = items;
  while (pending.length) {
    const list = join(work, `list-${k}.txt`);
    writeFileSync(list, '﻿' + pending.map((d) => `${d.id}|${d.path}|${pdfOf(d)}`).join('\r\n'), 'utf8');
    const seen = new Set();
    let current = pending[0], timedOut = false;
    // pid: Word da sessão atual (entre PID e PID-END); before: os WINWORD que já
    // existiam quando a criação começou (o mutex do .ps1 deixa um criando por vez)
    const w = { ps: null, pid: null, before: null };
    lanes.set(k, w);
    await new Promise((resolve) => {
      const ps = w.ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', join(here, 'word-pdf.ps1'), '-List', list, '-PerSession', String(PER_SESSION)], { windowsHide: true });
      let timer;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          timedOut = true;
          let victims = w.pid ? [w.pid] : [];
          if (!w.pid && w.before) {
            // travou na criação, antes de informar o PID: o Word que surgiu depois
            const others = new Set([...lanes.values()].map((o) => o.pid).filter(Boolean));
            victims = wordPids().filter((p) => !w.before.includes(p) && !others.has(p));
          }
          log(`[${k}] vigia: ${current?.id} sem resposta em ${TIMEOUT / 1000}s — encerrando Word ${victims.join(',') || '-'}`);
          for (const p of victims) killPid(p);
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
          if ((m = /^BEFORE ?([\d,]*)/.exec(line))) { w.before = m[1].split(',').filter(Boolean).map(Number); continue; }
          if ((m = /^PID (\d+)/.exec(line))) { w.pid = Number(m[1]); w.before = null; continue; }
          if (line.startsWith('PID-END')) { w.pid = null; continue; }
          if (line.startsWith('ABORT')) abortAll(line);
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
      ps.on('close', () => { clearTimeout(timer); w.ps = null; resolve(); });
    });
    lanes.delete(k);
    const rest = pending.filter((d) => !seen.has(d.id));
    if (rest.length && (timedOut || rest.length === pending.length)) {
      status[rest[0].id] = { status: 'timeout', t0: Date.now(), t1: Date.now() };
      save();
      pending = rest.slice(1);
    } else pending = rest;
  }
}

async function exportAll(list) {
  const groups = Array.from({ length: Math.min(WORKERS, list.length) }, () => []);
  list.forEach((d, i) => groups[i % groups.length].push(d));
  await Promise.all(groups.map((l, k) => runWorker(k, l)));
}

// criptografados: pulados (IRM pede credencial e pode abrir janela; senha, não temos)
for (const d of docs) if (d.encrypted) status[d.id] = { status: `skipped-${d.encrypted}` };
save();
let todo = docs.filter((d) => !d.encrypted && (argv.includes('--force') || !(status[d.id]?.status === 'ok' && existsSync(pdfOf(d)))));
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
