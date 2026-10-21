// Fixtures do controle de alterações: o corpo (w:body sem o sectPr) que o Word
// gravou em cada experimento de revisions-xml.ps1, normalizado — rsids, ids de
// parágrafo, proofErr, w:lang, _GoBack e os VALORES de w:id/w:date/w16du:dateUtc
// saem (o resto fica) — em packages/docx-core/test/fixtures/revisions/word.json.
// Os testes do docx-core refazem cada operação no nosso modelo e comparam.
//
//   node write/tools/revisions-oracle/revisions-fixtures.mjs <pasta com os .docx do Word>
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const { DocxPackage } = await import(pathToFileURL(join(writeRoot, 'packages', 'docx-core', 'dist', 'index.js')).href);

const src = process.argv[2];
if (!src) { console.error('uso: revisions-fixtures.mjs <pasta>'); process.exit(1); }

/** Corpo normalizado (mesma função dos testes: test/revisions.test.ts). */
export function normBody(documentXml) {
  let x = documentXml.slice(documentXml.indexOf('<w:body>') + 8);
  const sect = x.lastIndexOf('<w:sectPr');
  x = x.slice(0, sect >= 0 ? sect : x.lastIndexOf('</w:body>'));
  return x
    .replace(/ w:rsid\w*="[^"]*"/g, '')
    .replace(/ w14:(?:paraId|textId)="[^"]*"/g, '')
    .replace(/<w:proofErr\b[^>]*\/>/g, '')
    .replace(/<w:lang\b[^>]*\/>/g, '')
    .replace(/<w:bookmarkStart\b[^>]*w:name="_GoBack"[^>]*\/>(<w:bookmarkEnd\b[^>]*\/>)?/g, '')
    .replace(/<w:rPr><\/w:rPr>/g, '')
    .replace(/ w:id="-?\d+"/g, ' w:id="#"')
    .replace(/ w:date="[^"]*"/g, ' w:date="D"')
    .replace(/ w16du:dateUtc="[^"]*"/g, ' w16du:dateUtc="U"');
}

const out = {};
for (const f of readdirSync(src).filter((n) => n.endsWith('.docx')).sort()) {
  const pkg = DocxPackage.load(new Uint8Array(readFileSync(join(src, f))));
  const body = normBody(pkg.getPartText('word/document.xml'));
  // imagens: só a presença do desenho (os bytes e os ids do Word não interessam)
  out[f.replace(/\.docx$/, '')] = body.replace(/<w:drawing>[\s\S]*?<\/w:drawing>/g, '<w:drawing/>');
}
const dir = join(writeRoot, 'packages', 'docx-core', 'test', 'fixtures', 'revisions');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'word.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${Object.keys(out).length} casos → ${join(dir, 'word.json')}`);
