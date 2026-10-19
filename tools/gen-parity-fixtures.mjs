// Gera as fixtures de paridade do projeto .NET (dotnet/tests/fixtures):
//   1. um .docx sintético determinístico via writeDocument (heading, bold/italic,
//      lista 2 níveis, tabela com merge gridSpan, link) em fixtures/input/;
//   2. as saídas ESPERADAS dos exports JS (md/html/csv/tsv/ods→content.xml/xml2003)
//      sobre o sintético + sheet/samples/{showcase,gaps-smoke}.xlsx +
//      slides/samples/{reference,gaps-smoke}.pptx em fixtures/expected/;
//   3. cópia do oráculo de formatação (oracle-format.json).
// Regenerável: `node tools/gen-parity-fixtures.mjs` (dist dos 3 projetos já buildado).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtures = join(root, 'dotnet', 'tests', 'fixtures');
const inputDir = join(fixtures, 'input');
const expectedDir = join(fixtures, 'expected');
mkdirSync(inputDir, { recursive: true });
mkdirSync(expectedDir, { recursive: true });

const { DocxPackage, writeDocument } = await import(
  new URL('../write/packages/docx-core/dist/index.js', import.meta.url).href);
const { docxToMarkdown, docxToHtml } = await import(
  new URL('../write/packages/docx-core/dist/index.js', import.meta.url).href);
const sheetExport = await import(
  new URL('../sheet/packages/sheet-core/dist/index.js', import.meta.url).href);
const slidesExport = await import(
  new URL('../slides/packages/slides-core/dist/index.js', import.meta.url).href);
const { unzipSync } = await import(
  new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);

const write = (name, text) => {
  writeFileSync(join(expectedDir, name), text, 'utf8');
  console.log(`expected/${name} (${text.length} chars)`);
};

// ─────────────────────── 1. synthetic.docx ───────────────────────

const DEF = { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false };
const R = (text, props = {}) => ({ text, props: { ...DEF, ...props } });
const P = (runs, props = {}) => ({ runs, props });
const pb = (p) => ({ type: 'paragraph', paragraph: p });

const paragraphs = [
  P([R('Relatório OfficeNext')], { styleId: 'Heading1' }),
  P([R('Documento sintético determinístico para os testes de paridade '),
     R('JS ↔ .NET', { bold: true }), R(' da fase 1.')]),
  P([R('Texto com '), R('negrito', { bold: true }), R(', '), R('itálico', { italic: true }),
     R(' e '), R('ambos juntos', { bold: true, italic: true }), R('.')]),
  P([R('Visite '), R('OfficeNext.dev'), R(' para saber mais.')]),
  P([R('Seção de listas')], { styleId: 'Heading2' }),
  P([R('Primeiro item')], { numbering: { kind: 'bullet', ilvl: 0 } }),
  P([R('Subitem aninhado A')], { numbering: { kind: 'bullet', ilvl: 1 } }),
  P([R('Subitem aninhado B')], { numbering: { kind: 'bullet', ilvl: 1 } }),
  P([R('Segundo item')], { numbering: { kind: 'bullet', ilvl: 0 } }),
  P([R('Passo um')], { numbering: { kind: 'decimal', ilvl: 0 } }),
  P([R('Passo dois')], { numbering: { kind: 'decimal', ilvl: 0 } }),
  P([R('Tabela de resultados abaixo.')]),
  P([R('Fim do documento.')]),
];

const cell = (text, gridSpan = 1) => ({
  paragraphs: [P([R(text)])], tables: [], gridSpan,
});
const table = {
  type: 'table',
  gridColsTwips: [2400, 2400, 2400],
  rows: [
    { cells: [cell('Métrica'), cell('JS'), cell('.NET')] },
    { cells: [cell('Paridade byte a byte', 2), cell('sim')] },
    { cells: [cell('Formatos'), cell('md/html'), cell('md/html')] },
  ],
};

const blocks = [
  ...paragraphs.slice(0, 12).map(pb),
  table,
  pb(paragraphs[12]),
];

const sectPr = {
  pageWidthTwips: 11906, pageHeightTwips: 16838,
  marginLeftTwips: 1701, marginRightTwips: 1701,
  marginTopTwips: 1417, marginBottomTwips: 1417,
};

const pkg = DocxPackage.empty();
writeDocument(pkg, { paragraphs, sectPr }, [], { blocks });

// injeta o hyperlink (o serializer JS não emite w:hyperlink; cirurgia determinística)
{
  let doc = new TextDecoder().decode(pkg.getPart('word/document.xml'));
  const target = '<w:r><w:t>OfficeNext.dev</w:t></w:r>';
  if (!doc.includes(target)) throw new Error('run do link não encontrado no document.xml');
  doc = doc.replace(target,
    '<w:hyperlink r:id="rIdWnLink1"><w:r><w:rPr><w:color w:val="0563C1"/>' +
    '<w:u w:val="single"/></w:rPr><w:t>OfficeNext.dev</w:t></w:r></w:hyperlink>');
  pkg.setPartText('word/document.xml', doc);
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = pkg.getPartText(relsPath) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  rels = rels.replace('</Relationships>',
    '<Relationship Id="rIdWnLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ' +
    'Target="https://officenext.dev/" TargetMode="External"/></Relationships>');
  pkg.setPartText(relsPath, rels);
}

const syntheticBytes = pkg.save();
writeFileSync(join(inputDir, 'synthetic.docx'), syntheticBytes);
console.log(`input/synthetic.docx (${syntheticBytes.length} bytes)`);

// ─────────────────────── 2. expected: docx ───────────────────────

write('synthetic.docx.md', docxToMarkdown(syntheticBytes));
write('synthetic.docx.html', docxToHtml(syntheticBytes));

// ─────────────────────── 3. expected: xlsx ───────────────────────

for (const name of ['showcase', 'gaps-smoke']) {
  const src = join(root, 'sheet', 'samples', `${name}.xlsx`);
  const bytes = new Uint8Array(readFileSync(src));
  copyFileSync(src, join(inputDir, `${name}.xlsx`));
  write(`${name}.xlsx.csv`, sheetExport.xlsxToCsv(bytes));
  write(`${name}.xlsx.tsv`, sheetExport.xlsxToTsv(bytes));
  write(`${name}.xlsx.md`, sheetExport.xlsxToMarkdown(bytes));
  write(`${name}.xlsx.html`, sheetExport.xlsxToHtml(bytes));
  write(`${name}.xlsx.xml2003.xml`, sheetExport.xlsxToXml2003(bytes));
  // ods é zip: grava o content.xml extraído (paridade textual)
  const ods = sheetExport.xlsxToOds(bytes);
  const contentXml = new TextDecoder().decode(unzipSync(ods)['content.xml']);
  write(`${name}.xlsx.ods.content.xml`, contentXml);
}

// ─────────────────────── 4. expected: pptx ───────────────────────

for (const name of ['reference', 'gaps-smoke']) {
  const src = join(root, 'slides', 'samples', `${name}.pptx`);
  const bytes = new Uint8Array(readFileSync(src));
  copyFileSync(src, join(inputDir, `${name}.pptx`));
  write(`${name}.pptx.md`, slidesExport.pptxToMarkdown(bytes));
  write(`${name}.pptx.html`, slidesExport.pptxToHtml(bytes));
}

// ─────────────────────── 5. oráculo de formatação ───────────────────────

copyFileSync(
  join(root, 'sheet', 'tools', 'excel-lab', 'results', 'oracle-format.json'),
  join(fixtures, 'oracle-format.json'));
console.log('fixtures/oracle-format.json copiado');

console.log('OK — fixtures de paridade geradas.');
