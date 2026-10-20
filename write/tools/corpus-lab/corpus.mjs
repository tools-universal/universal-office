// Corpus de documentos REAIS (fora do repositório) × PDFs exportados pelo Word.
//
// Layout esperado em CORPUS_ROOT (padrão E:\UniversalWriteTest):
//   Documents/<tenant>/word/docx/<nome>.docx|.doc    — documentos (o layout
//                                                      antigo, Extraction/,
//                                                      também vale)
//   WordPdf/<tenant>/word/docx/<nome>.docx.pdf       — o MESMO documento salvo
//                                                      como PDF pelo Word
//                                                      (word-pdfs.mjs gera). A
//                                                      chave é o caminho relativo
//                                                      COM a extensão: x.doc e
//                                                      x.docx não colidem. O
//                                                      antigo WordPdf/<tenant>/<nome>.pdf
//                                                      vale se o nome for único.
// O id (t<tenant>-sha1 do caminho relativo à pasta dos documentos) é o mesmo
// nos dois layouts.
// Os documentos são de terceiros: NADA deles (nem texto extraído, nem imagens
// das páginas) entra no git. Toda saída vai para LAB_DIR (padrão
// CORPUS_ROOT/_lab). Regressões viram fixtures SINTÉTICAS que reproduzem o
// padrão encontrado.
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from 'node:fs';
import { join, extname, basename, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const CORPUS_ROOT = process.env.CORPUS_ROOT ?? 'E:/UniversalWriteTest';
export const LAB_DIR = process.env.LAB_DIR ?? join(CORPUS_ROOT, '_lab');
/** Pasta dos documentos: Documents/ (layout novo) ou Extraction/ (antigo). */
export const DOCS_DIR = process.env.CORPUS_DOCS
  ?? ['Documents', 'Extraction'].map((d) => join(CORPUS_ROOT, d)).find((d) => existsSync(d))
  ?? join(CORPUS_ROOT, 'Documents');
export const WORD_PDF_DIR = join(CORPUS_ROOT, 'WordPdf');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function magic(path) {
  const fd = openSync(path, 'r');
  try {
    const b = Buffer.alloc(8);
    readSync(fd, b, 0, 8, 0);
    if (b[0] === 0x50 && b[1] === 0x4b) return 'zip';
    if (b.readUInt32BE(0) === 0xd0cf11e0) return 'cfb';
    return 'unknown';
  } finally { closeSync(fd); }
}

/** OOXML criptografado dentro de um contêiner CFB: 'irm' (gestão de direitos — o Word
 *  pede credencial e pode abrir janela), 'password' (senha) ou null. */
function encryption(path) {
  const b = readFileSync(path);
  const has = (name) => b.includes(Buffer.from(name, 'utf16le'));
  if (!has('EncryptedPackage')) return null;
  return has('DRMEncryptedDataSpace') || has('DRMEncryptedTransform') ? 'irm' : 'password';
}

/** PDF de referência do Word de um documento (rel: caminho relativo à pasta dos documentos). */
export function wordPdfPath(rel) {
  return join(WORD_PDF_DIR, `${rel}.pdf`);
}

/** Monta (e grava em LAB_DIR/manifest.json) a lista de documentos do corpus. */
export function buildManifest() {
  const extraction = resolve(DOCS_DIR);
  const docs = [];
  for (const tenant of readdirSync(extraction).sort()) {
    const tdir = join(extraction, tenant);
    if (!statSync(tdir).isDirectory()) continue;
    const files = walk(tdir).sort().filter((f) => ['.docx', '.doc'].includes(extname(f).toLowerCase()));
    const stems = files.map((f) => basename(f, extname(f)).toLowerCase());
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      const stem = basename(file, extname(file));
      const rel = relative(extraction, file).split(/[\\/]/).join('/');
      // layout antigo (WordPdf/<tenant>/<nome>.pdf): só se o nome sem extensão for único
      const legacy = join(WORD_PDF_DIR, tenant, `${stem}.pdf`);
      const unique = stems.filter((s) => s === stem.toLowerCase()).length === 1;
      const pdf = existsSync(wordPdfPath(rel)) ? wordPdfPath(rel) : unique && existsSync(legacy) ? legacy : null;
      const id = `t${tenant}-${createHash('sha1').update(rel).digest('hex').slice(0, 8)}`;
      const container = magic(file); // 'zip' = docx (mesmo com extensão .doc), 'cfb' = Word 97-2003
      const enc = container === 'cfb' ? encryption(file) : null;
      docs.push({
        id, tenant, rel, path: file, ext, container,
        bytes: statSync(file).size,
        pdf,
        ...(enc ? { encrypted: enc } : {}),
      });
    }
  }
  mkdirSync(LAB_DIR, { recursive: true });
  writeFileSync(join(LAB_DIR, 'manifest.json'), JSON.stringify(docs, null, 1));
  return docs;
}

export function loadManifest() {
  const p = join(LAB_DIR, 'manifest.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : buildManifest();
}

/** Filtros comuns de linha de comando: --only id1,id2  --container zip|cfb  --tenant 12  --limit N  --from N */
export function selectDocs(docs, argv) {
  const get = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
  let out = docs;
  const only = get('only');
  if (only) { const s = new Set(only.split(',')); out = out.filter((d) => s.has(d.id)); }
  const listFile = get('list');
  if (listFile) { const s = new Set(readFileSync(listFile, 'utf8').split(/\r?\n/).filter(Boolean)); out = out.filter((d) => s.has(d.id)); }
  const container = get('container');
  if (container) out = out.filter((d) => d.container === container);
  const tenant = get('tenant');
  if (tenant) out = out.filter((d) => d.tenant === tenant);
  const from = Number(get('from') ?? 0);
  const limit = Number(get('limit') ?? Infinity);
  return out.slice(from, from + limit);
}

if (process.argv[1] && process.argv[1].endsWith('corpus.mjs')) {
  const docs = buildManifest();
  const by = (k) => docs.reduce((m, d) => (m[d[k]] = (m[d[k]] ?? 0) + 1, m), {});
  console.log(`${docs.length} documentos — container:`, by('container'), '— sem PDF:', docs.filter((d) => !d.pdf).length);
  console.log(`manifesto: ${join(LAB_DIR, 'manifest.json')}`);
}
