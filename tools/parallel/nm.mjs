// Acha as pastas node_modules de um checkout (sem descer em node_modules,
// .git, .claude, vendor, dist e publish). Devolve caminhos relativos.
import fs from 'node:fs';
import path from 'node:path';

/** Pastas locais (fora do git) que o worktree recebe por junção da principal. */
export const EXTRA = ['write/tools/word-lab'];

const SKIP = new Set(['node_modules', '.git', '.claude', 'vendor', 'dist', 'publish', '.wt', '.out', 'results']);

export function findNodeModules(root, maxDepth = 4) {
  const out = [];
  const walk = (rel, depth) => {
    let ents;
    try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (!e.isDirectory() || e.isSymbolicLink()) continue;
      const r = rel ? path.join(rel, e.name) : e.name;
      if (e.name === 'node_modules') { out.push(r); continue; }
      if (SKIP.has(e.name) || depth >= maxDepth) continue;
      walk(r, depth + 1);
    }
  };
  walk('', 0);
  return out;
}
