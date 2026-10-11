// Gera o oráculo do lab .doc: o Word real (COM invisível) abre cada .doc do
// corpus e salva como .docx em LAB_DIR/word/<id>.docx. Já existentes são
// pulados (--force refaz). Vigia: sem progresso por --timeout s (padrão 180),
// mata a instância do Word criada pelo script e segue com os restantes.
//
// Uso: node write/tools/doc-lab/run-oracle.mjs [--only id,id] [--limit N] [--force] [--timeout s]
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocCorpus, selectDocs, LAB_DIR } from './corpus.mjs';
import { runWordBatch } from './word-batch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const ti = argv.indexOf('--timeout');
const timeout = (ti >= 0 ? Number(argv[ti + 1]) : 180) * 1000;
const outDir = join(LAB_DIR, 'word');
mkdirSync(outDir, { recursive: true });

const pending = selectDocs(loadDocCorpus(), argv).filter((d) => force || !existsSync(join(outDir, `${d.id}.docx`)));
console.log(`oráculo: ${pending.length} documento(s) a converter no Word`);
const res = await runWordBatch({
  script: join(here, 'word-oracle.ps1'),
  items: pending,
  args: ['-OutDir', outDir],
  workDir: LAB_DIR,
  timeout,
  onLine: (l) => console.log(`  ${l.slice(0, 160)}`),
});
const ok = [...res.values()].filter((v) => v.startsWith('OK')).length;
console.log(`oráculo concluído: ${ok}/${pending.length} ok`);
