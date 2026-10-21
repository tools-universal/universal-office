// Trava GLOBAL do oráculo do Office via COM: sessões paralelas não podem usar o
// Word (ou Excel/PowerPoint) ao mesmo tempo — uma fecharia a instância da outra
// ou travaria num aviso do Normal.dotm. Uso:
//   node tools/parallel/word-lock.mjs -- powershell -NoProfile -File x.ps1 ...
// ou, num script Node: import { withWordLock } from '.../word-lock.mjs'.
// A trava é uma pasta em %TEMP% (mkdir é atômico); trava de processo morto é
// descartada sozinha.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCK = path.join(os.tmpdir(), 'officenext-office-com.lock');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

export function acquireWordLock(label = '') {
  let warned = false;
  for (;;) {
    try {
      fs.mkdirSync(LOCK);
      fs.writeFileSync(path.join(LOCK, 'owner.json'), JSON.stringify({ pid: process.pid, label, cwd: process.cwd(), at: new Date().toISOString() }));
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let owner = null;
      try { owner = JSON.parse(fs.readFileSync(path.join(LOCK, 'owner.json'), 'utf8')); } catch { /* sendo escrita */ }
      if (owner && !alive(owner.pid)) { fs.rmSync(LOCK, { recursive: true, force: true }); continue; }
      if (!warned) { console.error(`[word-lock] aguardando ${owner ? `${owner.label || owner.cwd} (pid ${owner.pid})` : 'outra sessão'}…`); warned = true; }
      sleep(2000);
    }
  }
}

export function releaseWordLock() {
  fs.rmSync(LOCK, { recursive: true, force: true });
}

export function withWordLock(fn, label) {
  acquireWordLock(label);
  try { return fn(); } finally { releaseWordLock(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--');
  const cmd = i >= 0 ? process.argv.slice(i + 1) : process.argv.slice(2);
  if (!cmd.length) { console.error('uso: node word-lock.mjs -- <comando> [args…]'); process.exit(2); }
  acquireWordLock(cmd.join(' ').slice(0, 120));
  let code = 1;
  try {
    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', windowsHide: true });
    code = r.status ?? 1;
  } finally { releaseWordLock(); }
  process.exit(code);
}
