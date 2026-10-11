// Paridade JS × .NET do conversor .doc → .docx sobre o corpus (fora do repositório):
// converte cada .doc com o conversor JS (docx-core/dist), grava os .docx em
// LAB_DIR/parity/js/, e roda o teste .NET Corpus_ParidadeParteAParte
// (dotnet/tests/OfficeNext.DocBinary.Tests), que converte o mesmo .doc com o
// OfficeNext.DocBinary e compara parte a parte. Resumo em LAB_DIR/parity/report.json.
//
// Uso: (cd write/packages/docx-core && npx tsc -p .) && node write/tools/doc-lab/parity-net.mjs [--only id,id] [--limit N]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocCorpus, selectDocs, LAB_DIR } from './corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const { convertDocToDocx } = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);

const outDir = join(LAB_DIR, 'parity');
const jsDir = join(outDir, 'js');
mkdirSync(jsDir, { recursive: true });
const docs = selectDocs(loadDocCorpus(), process.argv.slice(2));
const lines = [];
const jsErrors = [];
for (const d of docs) {
  try {
    const out = convertDocToDocx(new Uint8Array(readFileSync(d.path)));
    const p = join(jsDir, `${d.id}.docx`);
    writeFileSync(p, out);
    lines.push(`${d.id}|${d.path}|${p}`);
  } catch (e) {
    jsErrors.push({ id: d.id, error: String(e?.message ?? e) });
  }
}
const list = join(outDir, 'list.txt');
const report = join(outDir, 'report.json');
writeFileSync(list, lines.join('\n') + '\n', 'utf8');
console.log(`JS: ${lines.length} convertidos, ${jsErrors.length} com erro → rodando o .NET`);
execFileSync('dotnet', [
  'test', join(root, 'dotnet', 'tests', 'OfficeNext.DocBinary.Tests', 'OfficeNext.DocBinary.Tests.csproj'),
  '-c', 'Release', '--filter', 'FullyQualifiedName~Corpus_ParidadeParteAParte', '--nologo', '-v', 'q',
], { env: { ...process.env, DOC_PARITY_LIST: list, DOC_PARITY_OUT: report }, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
const rows = JSON.parse(readFileSync(report, 'utf8'));
const same = rows.filter((r) => r.identical);
console.log(`\nparte a parte idênticos (JS × .NET): ${same.length}/${rows.length}` + (jsErrors.length ? ` (+${jsErrors.length} com erro no JS)` : ''));
for (const r of rows.filter((x) => !x.identical).slice(0, 20)) {
  console.log(`  ${r.id}: ${r.error ?? ''}${r.orderSame === false ? ' [ordem das partes difere]' : ''}`);
  for (const d of (r.diff ?? []).slice(0, 3)) console.log(`    ${d.slice(0, 400)}`);
}
