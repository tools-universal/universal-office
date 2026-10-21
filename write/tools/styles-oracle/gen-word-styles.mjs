// Gera write/packages/docx-core/src/word-styles.ts a partir das saídas do
// oráculo de estilos (Word 365 pt-BR via COM, fora do git):
//
//   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass \
//        -File write/tools/styles-oracle/probe-a.ps1 -Out <lab>
//   node write/tools/styles-oracle/build-catalog.mjs <lab>
//   node write/tools/styles-oracle/gen-word-styles.mjs <lab>
//
// probe-a grava blank.docx (documento em branco) e all.docx (todos os estilos de
// parágrafo/caractere aplicados — o Word materializa a definição de cada um) +
// catalog.json (NameLocal pt-BR). O que vai para o código: o styles.xml/tema/
// settings/fontTable do documento em branco e as definições dos built-ins
// (sem rsids), como o Word as grava quando o estilo é usado. Nenhuma fonte.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require('fflate');

const lab = process.argv[2];
if (!lab) { console.error('uso: gen-word-styles.mjs <pasta do lab>'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, '..', '..', 'packages', 'docx-core', 'src', 'word-styles.ts');

const part = (f, p) => strFromU8(unzipSync(readFileSync(join(lab, f)))[p]);
const noRsid = (x) => x.replace(/<w:rsid w:val="[^"]*"\/>/g, '').replace(/ w:rsid(?:R|RDefault|P|RPr|Sect)?="[^"]*"/g, '');

const blankStyles = noRsid(part('blank.docx', 'word/styles.xml'));
const theme = part('blank.docx', 'word/theme/theme1.xml');
const settings = part('blank.docx', 'word/settings.xml')
  .replace(/<w:rsids>[\s\S]*?<\/w:rsids>/, '')
  .replace(/<w14:docId [^>]*\/>/, '')
  .replace(/<w15:docId [^>]*\/>/, '');
const fontTable = part('blank.docx', 'word/fontTable.xml');
const sectPr = noRsid(part('blank.docx', 'word/document.xml').match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)[0]);

const all = noRsid(part('all.docx', 'word/styles.xml'));
const byId = new Map([...all.matchAll(/<w:style [^>]*w:styleId="([^"]*)"[^>]*>[\s\S]*?<\/w:style>/g)].map((m) => [m[1], m[0]]));
const builtins = JSON.parse(readFileSync(join(lab, 'builtins.json'), 'utf8'));

const rows = [];
for (const b of builtins) {
  if (!b.xml || !b.en) continue;
  const xml = byId.get(b.styleId);
  if (!xml) continue;
  const link = xml.match(/<w:link w:val="([^"]*)"\/>/)?.[1];
  const twin = link ? byId.get(link) : undefined;
  rows.push([b.en, b.pt, xml, ...(twin ? [twin] : [])]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));

const lines = [
  '// GERADO por write/tools/styles-oracle/gen-word-styles.mjs a partir do oráculo',
  '// (Word 365 pt-BR via COM) — não editar à mão. Sem fontes: só XML de formatação.',
  '',
  '/** styles.xml do documento em branco do Word (docDefaults, latentStyles e os',
  ' *  estilos que o Normal.dotm define), sem rsids. */',
  `export const WORD_BLANK_STYLES = ${JSON.stringify(blankStyles)};`,
  '',
  '/** theme/theme1.xml do documento em branco (Tema do Office). */',
  `export const WORD_BLANK_THEME = ${JSON.stringify(theme)};`,
  '',
  '/** settings.xml do documento em branco (sem rsids nem docId). */',
  `export const WORD_BLANK_SETTINGS = ${JSON.stringify(settings)};`,
  '',
  '/** fontTable.xml do documento em branco (só metadados: nomes, panose, assinaturas). */',
  `export const WORD_BLANK_FONT_TABLE = ${JSON.stringify(fontTable)};`,
  '',
  '/** w:sectPr do documento em branco (A4, margens 3/2,5 cm, cabeçalho/rodapé 1,25 cm). */',
  `export const WORD_BLANK_SECTPR = ${JSON.stringify(sectPr)};`,
  '',
  '/** Built-ins de parágrafo/caractere como o Word grava o w:style quando o estilo',
  ' *  é usado: [nome canônico (w:name), nome pt-BR, w:style, w:style do par Char?]. */',
  'export const WORD_BUILTIN_STYLES: readonly (readonly [string, string, string, string?])[] = [',
  ...rows.map((r) => `  ${JSON.stringify(r)},`),
  '];',
  '',
];
writeFileSync(outFile, lines.join('\n'));
console.log(`${outFile}: ${rows.length} built-ins, ${rows.filter((r) => r[3]).length} com par Char`);
