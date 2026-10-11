// Corpus do lab .doc: os .doc binários (Compound File) do manifesto do corpus
// de terceiros. NADA daqui vai para o repositório — só caminhos.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const CORPUS_ROOT = process.env.UW_CORPUS ?? 'E:\\UniversalWriteTest';
export const MANIFEST = join(CORPUS_ROOT, '_lab', 'manifest.json');
export const LAB_DIR = process.env.DOC_LAB_DIR ?? join(CORPUS_ROOT, '_lab', 'doc-lab');

/** Documentos .doc com contêiner CFB (os .doc que são ZIP ficam de fora). */
export function loadDocCorpus() {
  if (!existsSync(MANIFEST)) throw new Error(`manifesto não encontrado: ${MANIFEST}`);
  const all = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  return all.filter((d) => d.container === 'cfb');
}

/** Filtra por --only id,id / --limit N (argv já fatiado). */
export function selectDocs(docs, argv) {
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  let out = docs;
  const only = opt('only');
  if (only) { const set = new Set(only.split(',')); out = out.filter((d) => set.has(d.id)); }
  const limit = opt('limit');
  if (limit) out = out.slice(0, Number(limit));
  return out;
}
