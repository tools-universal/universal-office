// Fidelidade de layout de ponta a ponta: o Word pagina o nosso .docx e o .docx
// que ele mesmo salvou do .doc, e comparamos página + posição vertical de cada
// parágrafo (Document.Paragraphs, inclui marcas de célula/linha).
// Saída: LAB_DIR/layout.json + resumo (documentos com layout idêntico).
//
// Uso: node write/tools/doc-lab/run-layout.mjs [--only id,id] [--limit N] [--tol 1.5]
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocCorpus, selectDocs, LAB_DIR } from './corpus.mjs';
import { runWordBatch } from './word-batch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ti = argv.indexOf('--tol');
const tol = ti >= 0 ? Number(argv[ti + 1]) : 1.5;
const docs = selectDocs(loadDocCorpus(), argv);
const items = [];
for (const d of docs) {
  const ours = join(LAB_DIR, 'ours', `${d.id}.docx`);
  const word = join(LAB_DIR, 'word', `${d.id}.docx`);
  if (existsSync(ours) && existsSync(word)) items.push({ id: `ours:${d.id}`, path: ours }, { id: `word:${d.id}`, path: word });
}
const log = join(LAB_DIR, 'word-batch.log');
rmSync(log, { force: true });
console.log(`layout no Word: ${items.length} arquivo(s)`);
await runWordBatch({ script: join(here, 'word-pages.ps1'), items, workDir: LAB_DIR, timeout: 300_000 });
const pos = new Map();
for (const line of readFileSync(log, 'utf8').split('\n')) {
  if (!line.startsWith('P ')) continue;
  const [, id, i, pg, y] = line.trim().split(' ');
  if (!pos.has(id)) pos.set(id, []);
  pos.get(id)[Number(i)] = [Number(pg), Number(y)];
}
const rows = [];
let identical = 0, samePages = 0, n = 0;
for (const d of docs) {
  const a = pos.get(`ours:${d.id}`), b = pos.get(`word:${d.id}`);
  if (!a || !b) continue;
  n++;
  let firstDiff = -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (!x || !y || x[0] !== y[0] || Math.abs(x[1] - y[1]) > tol) { firstDiff = i; break; }
  }
  const pagesA = Math.max(...a.map((p) => p?.[0] ?? 0)), pagesB = Math.max(...b.map((p) => p?.[0] ?? 0));
  if (firstDiff < 0) identical++;
  if (pagesA === pagesB) samePages++;
  rows.push({ id: d.id, paragrafos: [a.length, b.length], paginas: [pagesA, pagesB], primeiraDivergencia: firstDiff });
  if (firstDiff >= 0) console.log(`  ${d.id}: 1ª divergência no parágrafo ${firstDiff} (nosso ${JSON.stringify(a[firstDiff])} × Word ${JSON.stringify(b[firstDiff])}); páginas ${pagesA}/${pagesB}`);
}
writeFileSync(join(LAB_DIR, 'layout.json'), JSON.stringify({ geradoEm: new Date().toISOString(), tolPt: tol, rows }, null, 1));
console.log(`layout idêntico (página + y ±${tol}pt de todos os parágrafos): ${identical}/${n}; mesma contagem de páginas: ${samePages}/${n}`);
