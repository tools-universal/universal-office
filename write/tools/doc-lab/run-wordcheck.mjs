// Abre no Word real (COM invisível) os .docx convertidos (LAB_DIR/ours) e os
// .docx do oráculo (LAB_DIR/word) e compara a paginação (ComputeStatistics) e
// a contagem de parágrafos. Prova que o nosso .docx abre no Word e mede a
// fidelidade de layout de ponta a ponta.
// Saída: LAB_DIR/wordcheck.json + resumo.
//
// Uso: node write/tools/doc-lab/run-wordcheck.mjs [--only id,id] [--limit N]
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocCorpus, selectDocs, LAB_DIR } from './corpus.mjs';
import { runWordBatch } from './word-batch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const docs = selectDocs(loadDocCorpus(), process.argv.slice(2));
const items = [];
for (const d of docs) {
  const ours = join(LAB_DIR, 'ours', `${d.id}.docx`);
  const word = join(LAB_DIR, 'word', `${d.id}.docx`);
  if (existsSync(ours)) items.push({ id: `ours:${d.id}`, path: ours });
  if (existsSync(word)) items.push({ id: `word:${d.id}`, path: word });
}
console.log(`verificação no Word: ${items.length} arquivo(s)`);
const res = await runWordBatch({ script: join(here, 'word-check.ps1'), items, workDir: LAB_DIR, timeout: 180_000 });
const parse = (line) => {
  if (!line || !line.startsWith('OK')) return { error: line ?? 'sem resultado' };
  const pages = Number(/pages=(\d+)/.exec(line)?.[1]);
  const paras = Number(/paras=(\d+)/.exec(line)?.[1]);
  return { pages, paras };
};
const rows = [];
let openErr = 0, samePages = 0, sameParas = 0, compared = 0;
for (const d of docs) {
  const o = parse(res.get(`ours:${d.id}`));
  const w = parse(res.get(`word:${d.id}`));
  rows.push({ id: d.id, ours: o, word: w });
  if (o.error) { openErr++; console.log(`  ERRO ao abrir ${d.id}: ${o.error}`); continue; }
  if (w.error) continue;
  compared++;
  if (o.pages === w.pages) samePages++; else console.log(`  páginas ${d.id}: nosso ${o.pages} × Word ${w.pages}`);
  if (o.paras === w.paras) sameParas++; else console.log(`  parágrafos ${d.id}: nosso ${o.paras} × Word ${w.paras}`);
}
writeFileSync(join(LAB_DIR, 'wordcheck.json'), JSON.stringify({ geradoEm: new Date().toISOString(), rows }, null, 1));
console.log(`abriram no Word: ${docs.length - openErr}/${docs.length}; mesma paginação: ${samePages}/${compared}; mesmos parágrafos: ${sameParas}/${compared}`);
