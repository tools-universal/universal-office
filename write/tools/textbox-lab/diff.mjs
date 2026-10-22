// Diferenças de cada resultado do oráculo contra uma base (results/default.xml):
// só as linhas que mudaram, sem ids voláteis (docPr id, anchorId, gfxdata).
//
//   node tools/textbox-lab/diff.mjs [--base default] [prefixo…]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const res = join(here, 'results');
const argv = process.argv.slice(2);
const bi = argv.indexOf('--base');
const base = bi >= 0 ? argv.splice(bi, 2)[1] : 'default';
const norm = (s) => s
  .replace(/o:gfxdata="[^"]*"/g, 'o:gfxdata="…"')
  .replace(/(wp:docPr id=")\d+/g, '$1N')
  .replace(/w14:anchorId="[^"]*"/g, 'w14:anchorId="…"')
  .split('\n')
  // VML: um atributo (e um item do style) por linha
  .flatMap((l) => (/^\s*<v:/.test(l) ? l.replace(/style="([^"]*)"/, (_m, s) => `style=\n${s.split(';').map((x) => `  style:${x}`).join('\n')}\n`).replace(/" /g, '"\n  ').split('\n') : [l]));

/** LCS simples por linhas → linhas só da base (-) e só do caso (+). */
function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; continue; }
    if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) out.push('+ ' + b[j++].trim());
    else out.push('- ' + a[i++].trim());
  }
  return out;
}

const A = norm(readFileSync(join(res, `${base}.xml`), 'utf8'));
const names = readdirSync(res).filter((f) => f.endsWith('.xml')).map((f) => f.slice(0, -4)).sort();
for (const n of names) {
  if (n === base || (argv.length && !argv.some((p) => n.startsWith(p)))) continue;
  const d = diff(A, norm(readFileSync(join(res, `${n}.xml`), 'utf8')));
  console.log(`\n=== ${n} (${d.length})`);
  for (const l of d.slice(0, 80)) console.log(l.length > 400 ? l.slice(0, 400) + '…' : l);
}
