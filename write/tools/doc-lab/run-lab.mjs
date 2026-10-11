// Lab de validação do conversor .doc → .docx (Universal Write).
//
// Para cada .doc (Compound File) do corpus:
//   1. converte com convertDocToDocx (docx-core) → LAB_DIR/ours/<id>.docx
//   2. abre o resultado com DocxPackage.load + readFullDocument (não pode lançar)
//   3. compara estruturalmente com o .docx que o Word salvou do mesmo .doc
//      (LAB_DIR/word/<id>.docx, gerado por run-oracle.mjs)
// Relatório: LAB_DIR/report.json (por documento + totais por categoria) e
// resumo no stdout.
//
// Uso: node write/tools/doc-lab/run-lab.mjs [--only id,id] [--limit N] [--details]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadDocCorpus, selectDocs, LAB_DIR } from './corpus.mjs';
import { loadDocxCore } from './load-ts.mjs';
import { extractDocx, compareDocx } from './compare.mjs';

const argv = process.argv.slice(2);
const showDetails = argv.includes('--details');
const m = await loadDocxCore();
const docs = selectDocs(loadDocCorpus(), argv);
const oursDir = join(LAB_DIR, 'ours');
const wordDir = join(LAB_DIR, 'word');
mkdirSync(oursDir, { recursive: true });

const totals = {};
const docsWithCat = {};
const perDoc = [];
let converted = 0, convertErrors = 0, readErrors = 0, compared = 0, noOracle = 0, totalMs = 0;
let parasOurs = 0, parasWord = 0;

for (const d of docs) {
  const entry = { id: d.id, rel: d.rel };
  perDoc.push(entry);
  let out;
  const t0 = performance.now();
  try {
    out = m.convertDocToDocx(new Uint8Array(readFileSync(d.path)));
    entry.ms = Math.round(performance.now() - t0);
    totalMs += entry.ms;
    converted++;
    writeFileSync(join(oursDir, `${d.id}.docx`), out);
  } catch (e) {
    convertErrors++;
    entry.convertError = String(e.message ?? e);
    console.log(`ERRO conversão ${d.id}: ${entry.convertError}`);
    continue;
  }
  try {
    const pkg = m.DocxPackage.load(out);
    const full = m.readFullDocument(pkg);
    entry.blocks = full.blocks.length;
  } catch (e) {
    readErrors++;
    entry.readError = String(e.message ?? e);
    console.log(`ERRO readFullDocument ${d.id}: ${entry.readError}`);
  }
  const oracle = join(wordDir, `${d.id}.docx`);
  if (!existsSync(oracle)) { noOracle++; continue; }
  try {
    const a = extractDocx(out, m.parseXml);
    const b = extractDocx(new Uint8Array(readFileSync(oracle)), m.parseXml);
    const res = compareDocx(a, b);
    compared++;
    parasOurs += res.paras.ours;
    parasWord += res.paras.word;
    entry.cats = res.cats;
    entry.details = res.details.slice(0, 60);
    for (const [k, v] of Object.entries(res.cats)) {
      totals[k] = (totals[k] ?? 0) + v;
      docsWithCat[k] = (docsWithCat[k] ?? 0) + 1;
    }
    if (showDetails && res.details.length) {
      console.log(`\n${d.id} (${d.rel})`);
      for (const x of res.details.slice(0, 25)) console.log(`  ${x}`);
    }
  } catch (e) {
    entry.compareError = String(e.stack ?? e);
    console.log(`ERRO comparação ${d.id}: ${e.message}`);
  }
}

const report = {
  geradoEm: new Date().toISOString(),
  documentos: docs.length, convertidos: converted, errosConversao: convertErrors, errosLeitura: readErrors,
  comparados: compared, semOraculo: noOracle, msConversaoTotal: Math.round(totalMs),
  paragrafos: { nossos: parasOurs, word: parasWord },
  divergencias: Object.fromEntries(Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, { total: v, documentos: docsWithCat[k] }])),
  porDocumento: perDoc,
};
writeFileSync(join(LAB_DIR, 'report.json'), JSON.stringify(report, null, 1));

console.log(`\n=== lab .doc → .docx (${docs.length} documentos) ===`);
console.log(`convertidos: ${converted}  erros de conversão: ${convertErrors}  erros readFullDocument: ${readErrors}  tempo total: ${Math.round(totalMs)} ms`);
console.log(`comparados com o Word: ${compared}  sem oráculo: ${noOracle}  parágrafos (nossos/Word): ${parasOurs}/${parasWord}`);
console.log('divergências por categoria (total · documentos):');
for (const [k, v] of Object.entries(report.divergencias)) console.log(`  ${k.padEnd(28)} ${String(v.total).padStart(6)} · ${v.documentos}`);
console.log(`relatório: ${join(LAB_DIR, 'report.json')}`);
