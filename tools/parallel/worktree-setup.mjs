// Monta os node_modules de um WORKTREE a partir da cópia principal, só com
// junções (sem npm install). Rodar de dentro do worktree:
//   node tools/parallel/worktree-setup.mjs [--build | --build-all]
// Para cada pasta node_modules da cópia principal (write, shared/*, slides,
// sheet e os pacotes), cria a mesma pasta no worktree com uma junção por
// entrada:
// - pacote de terceiros → a pasta da cópia principal;
// - link para dentro do repo (@universal-office/*, universal-office → raiz) →
//   o MESMO caminho no worktree, para o build usar o código do worktree; se o
//   caminho não existe no worktree (submódulo do vendor), fica o da principal.
// Pastas locais fora do git de que o código depende (EXTRA, ex.: o lab de
// fontes do Write) também entram por junção. --build compila fonts, charts, ui,
// spell e write (o que os testes e o tsc consomem via dist/); --build-all
// também slides e sheet. Os bundles versionados (demo/, site/assets) NÃO se
// commitam do worktree: quem junta na main recompila.
// NUNCA apagar o worktree com rm -rf: as junções levam à cópia principal.
// Desmontar com tools/parallel/worktree-teardown.mjs.
import { execFileSync, execSync } from 'node:child_process';
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
const inside = (p, root) => {
  const r = path.relative(root, p);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
};

let links = 0, copies = 0;
function mirror(src, dst) {
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink()) {
    const t = path.resolve(path.dirname(src), fs.readlinkSync(src));
    let target = t;
    if (inside(t, main)) {
      const cand = path.join(wt, path.relative(main, t));
      if (fs.existsSync(cand)) target = cand;
    }
    fs.symlinkSync(target, dst, 'junction');
    links++;
  } else if (st.isDirectory()) {
    fs.symlinkSync(src, dst, 'junction');
    links++;
  } else {
    fs.copyFileSync(src, dst);
    copies++;
  }
}

const dirs = findNodeModules(main);
for (const rel of dirs) {
  const M = path.join(main, rel);
  const W = path.join(wt, rel);
  if (!fs.existsSync(path.dirname(W))) continue; // pasta que não existe neste commit
  if (fs.existsSync(W)) { console.log(`já existe: ${rel}`); continue; }
  fs.mkdirSync(W);
  for (const e of fs.readdirSync(M)) {
    const s = path.join(M, e);
    const st = fs.lstatSync(s);
    if (e.startsWith('@') && st.isDirectory() && !st.isSymbolicLink()) {
      fs.mkdirSync(path.join(W, e));
      for (const f of fs.readdirSync(s)) mirror(path.join(s, f), path.join(W, e, f));
    } else {
      mirror(s, path.join(W, e));
    }
  }
  console.log(`ok: ${rel}`);
}
console.log(`${dirs.length} pasta(s) node_modules; ${links} junção(ões), ${copies} arquivo(s) copiado(s).`);

for (const rel of EXTRA) {
  const M = path.join(main, rel);
  const W = path.join(wt, rel);
  if (!fs.existsSync(M) || fs.existsSync(W) || !fs.existsSync(path.dirname(W))) continue;
  fs.symlinkSync(M, W, 'junction');
  console.log(`junção local: ${rel}`);
}

const all = process.argv.includes('--build-all');
if (all || process.argv.includes('--build')) {
  const run = (script) => {
    console.log(`> npm run ${script}`);
    execSync(`npm run ${script}`, { cwd: wt, stdio: 'inherit', windowsHide: true });
  };
  run('fonts:sync');
  for (const p of ['fonts', 'charts', 'drawingml', 'ui', 'spell', 'write']) run(`build:${p}`);
  if (all) for (const p of ['slides', 'sheet']) run(`build:${p}`);
}
