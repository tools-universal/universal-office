// Registra em test/oracle/<área>.known.json as divergências SÓ NUMÉRICAS de último
// dígito (nosso e Excel são números e diferem em menos de 1e−11 relativo), com o
// número de dígitos que batem — algoritmos iterativos/séries do Excel não
// reproduzidos bit a bit (distribuições, inversas). Erros, tipos e diferenças maiores
// continuam falhando no teste.
//   node tools/stat-known.mjs <área>   (depois do build)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../dist/index.js';
import { matchesOracle, runCase } from '../dist/testing.js';
import { PT_BR } from '../dist/fn.js';
import { ArrayValue } from '../dist/values.js';

const here = dirname(fileURLToPath(import.meta.url));
const area = process.argv[2];
const dir = join(here, '..', 'test', 'oracle');
const cases = JSON.parse(readFileSync(join(dir, `${area}.cases.json`), 'utf8'));
const xl = new Map(JSON.parse(readFileSync(join(dir, `${area}.excel.json`), 'utf8')).map((r) => [r.id, r]));
const known = {};
const numOf = (v) => (v instanceof ArrayValue ? (v.rows === 1 && v.cols === 1 ? v.get(0, 0) : undefined) : v);
let n = 0;
for (const c of cases) {
  const r = xl.get(c.id);
  if (!r || r.err) continue;
  const ours = runCase(c, PT_BR);
  if (matchesOracle(ours, r)) continue;
  // pares (nosso, Excel) — matriz derramada compara elemento a elemento
  const pairs = [];
  if (r.spill) {
    if (!(ours instanceof ArrayValue) || ours.rows !== r.spill.length || ours.cols !== r.spill[0].length) continue;
    r.spill.forEach((row, i) => row.forEach((v, j) => pairs.push([ours.get(i, j), v])));
  } else pairs.push([numOf(ours), r.v]);
  let rel = 0, ok = true;
  for (const [a, b] of pairs) {
    if (typeof a !== 'number' || typeof b !== 'number') { ok = false; break; }
    if (a === b) continue;
    if (b === 0) { ok = false; break; }
    rel = Math.max(rel, Math.abs(a - b) / Math.abs(b));
  }
  if (!ok || !(rel < 1e-11)) continue;
  const digits = Math.floor(-Math.log10(rel));
  known[c.id] = `último dígito: o Excel usa outra sequência numérica (série/fração contínua/iteração); bate em ${digits} dígitos (dif. rel. ${rel.toExponential(1)})`;
  n++;
}
writeFileSync(join(dir, `${area}.known.json`), JSON.stringify(known, null, 1) + '\n');
console.log(`${area}: ${n} divergências de último dígito → ${area}.known.json`);
