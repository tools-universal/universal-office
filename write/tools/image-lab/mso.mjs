// Sonda dos idMso pela trava global (ver mso-probe.ps1).
//   node tools/image-lab/mso.mjs --ids a,b,c [--float]
//   node tools/image-lab/mso.mjs --exec a,b [--float] [--pdf]   (salva .out/mso-<id>.docx)
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'mso-probe.ps1'),
  '-OutDir', join(here, '.out'), '-Image', join(here, '.out', 'img', 'pattern.png')];
if (opt('--ids')) args.push('-Ids', opt('--ids'));
if (opt('--exec')) args.push('-Exec', opt('--exec'));
if (opt('--prefix')) args.push('-Prefix', opt('--prefix'));
if (argv.includes('--float')) args.push('-Float');
if (argv.includes('--pdf')) args.push('-Pdf');
acquireWordLock('image-lab mso');
try { execFileSync('powershell', args, { stdio: 'inherit', windowsHide: true }); } finally { releaseWordLock(); }
