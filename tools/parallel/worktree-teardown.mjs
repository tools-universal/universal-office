// Desmonta os node_modules montados por worktree-setup.mjs: remove cada junção
// SEM segui-la (o destino fica intacto), apaga os arquivos copiados e as pastas
// vazias. Rodar de dentro do worktree antes de removê-lo:
//   node tools/parallel/worktree-teardown.mjs
// Pasta real (não junção) dentro de node_modules faz o script parar: algo foi
// instalado ali de verdade — conferir à mão.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findNodeModules, EXTRA } from './nm.mjs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const wt = path.resolve(git('rev-parse', '--show-toplevel'));
const main = path.resolve(path.dirname(path.resolve(wt, git('rev-parse', '--git-common-dir'))));
if (main.toLowerCase() === wt.toLowerCase()) {
  console.error('Rode dentro de um worktree (esta é a cópia principal).');
  process.exit(1);
}

const unlink = (p) => { try { fs.unlinkSync(p); } catch { fs.rmdirSync(p); } };
let n = 0;
function clear(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) { unlink(p); n++; }
    else if (st.isDirectory()) {
      if (!e.startsWith('@')) throw new Error(`pasta real em node_modules, conferir à mão: ${p}`);
      clear(p);
      fs.rmdirSync(p);
    } else fs.unlinkSync(p);
  }
}
for (const rel of findNodeModules(wt)) {
  const W = path.join(wt, rel);
  if (fs.lstatSync(W).isSymbolicLink()) { unlink(W); n++; continue; }
  clear(W);
  fs.rmdirSync(W);
  console.log(`removido: ${rel}`);
}
for (const rel of EXTRA) {
  const W = path.join(wt, rel);
  try { if (fs.lstatSync(W).isSymbolicLink()) { unlink(W); n++; } } catch { /* não existe */ }
}
console.log(`${n} junção(ões) removida(s).`);
