// Roda o motor docx-layout (Node, sem navegador) sobre o corpus e grava o PDF
// em LAB_DIR/<tag>/<id>/js.pdf (+ info.json). É o mesmo layout que o canvas
// do <universal-write> pinta depois da integração.
//
// Uso: node tools/corpus-lab/run-engine.mjs [--tag eng] [--only id,id] [--tenant N] [--limit N] [--force]
//      node tools/corpus-lab/run-engine.mjs --file caminho.docx --out saida.pdf
//      --doc-via word: .doc lidos do .docx que o PRÓPRIO Word gerou (doc-lab) —
//      separa erro do conversor de erro do motor
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifest, selectDocs, LAB_DIR } from './corpus.mjs';
import { createNodeFontProvider } from './node-fonts.mjs';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const layout = await import(new URL('../../packages/layout/dist/index.js', import.meta.url).href);
const odf = await import(new URL('../../packages/odf/dist/index.js', import.meta.url).href);

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
const TAG = opt('tag', 'eng');
const provider = await createNodeFontProvider();
const advanceEm = opt('em', 'nominal');
const advanceRound = opt('round', undefined);

export function convert(bytes) {
  // .doc (Word 97-2003): converte para .docx e segue o caminho normal
  if (core.isWordBinary(bytes)) bytes = core.convertDocToDocx(bytes);
  // .odt com extensão trocada (o Word abre): mesmo caminho do editor
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const isOdt = head.includes('opendocument.text');
  const pkg = isOdt ? null : core.DocxPackage.load(bytes);
  const full = isOdt ? odf.readOdt(bytes) : core.readFullDocument(pkg);
  let embedded = [];
  try { embedded = pkg ? core.readEmbeddedFonts(pkg) : []; } catch { /* sem fontes embutidas legíveis */ }
  const prov = eng.withEmbeddedFonts(provider, embedded, (b) => new layout.SfntFont(b));
  const res = eng.layoutDocument(full, prov, { advanceEm, ...(advanceRound ? { advanceRound } : {}) });
  return { res, pdf: eng.renderPdf(res) };
}

if (opt('file')) {
  const t0 = Date.now();
  const { res, pdf } = convert(new Uint8Array(readFileSync(opt('file'))));
  writeFileSync(opt('out', 'out.pdf'), pdf);
  console.log(`${res.pages.length} páginas em ${Date.now() - t0} ms; avisos: ${res.warnings.join('; ') || '-'}`);
  process.exit(0);
}

const docs = selectDocs(loadManifest(), argv);
let n = 0, errors = 0;
const t0 = Date.now();
for (const d of docs) {
  const dir = join(LAB_DIR, TAG, d.id);
  if (!flag('force') && existsSync(join(dir, 'info.json'))) continue;
  mkdirSync(dir, { recursive: true });
  const info = { id: d.id, rel: d.rel, container: d.container };
  {
    const ts = Date.now();
    try {
      const viaWord = opt('doc-via') === 'word' && d.container === 'cfb' ? join(LAB_DIR, 'doc-lab', 'word', `${d.id}.docx`) : null;
      const { res, pdf } = convert(new Uint8Array(readFileSync(viaWord && existsSync(viaWord) ? viaWord : d.path)));
      writeFileSync(join(dir, 'js.pdf'), pdf);
      info.status = 'ok';
      info.pages = res.pages.length;
      if (res.warnings.length) info.warnings = res.warnings;
    } catch (e) {
      info.status = 'error';
      info.error = String(e?.stack ?? e).slice(0, 1200);
      errors++;
    }
    info.ms = Date.now() - ts;
  }
  writeFileSync(join(dir, 'info.json'), JSON.stringify(info, null, 1));
  n++;
  if (n % 50 === 0) console.log(`${n}/${docs.length} (${((Date.now() - t0) / 1000).toFixed(0)}s, erros ${errors})`);
}
console.log(`fim: ${n} documentos, ${errors} erros, ${((Date.now() - t0) / 1000).toFixed(0)}s → ${join(LAB_DIR, TAG)}`);
