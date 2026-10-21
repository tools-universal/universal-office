// Sonda: tabela da direita para a esquerda (w:bidiVisual) com larguras
// diferentes por coluna, borda esquerda vermelha grossa e direita azul fina,
// recuo de 720 — o Word exporta o PDF e comparamos a posição do texto de cada
// célula e das bordas com o motor (node … --ours imprime as do motor).
//   node tools/table-lab/gen-bidi-probe.mjs <pasta> [--ours]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { DocxPackage, writeDocument, readFullDocument, blankDocxPackage, tableOps as T } from '../../packages/docx-core/dist/index.js';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
if (process.argv.includes('--ours')) {
  const { layoutDocument } = await import('../../packages/docx-layout/dist/index.js');
  const { createNodeFontProvider } = await import('../corpus-lab/node-fonts.mjs');
  const pkg = DocxPackage.load(readFileSync(`${out}/${process.argv.includes("--ltr") ? "ltr" : "bidi"}.docx`));
  const full = readFullDocument(pkg);
  const res = layoutDocument(full, await createNodeFontProvider(), {});
  const items = res.pages[0].items;
  for (const it of items) {
    if (it.t === 'glyphs') console.log('texto', it.text, Math.round(it.x ?? it.glyphs?.[0]?.x ?? it.g?.[0]?.[1] ?? 0), JSON.stringify(Object.keys(it)));
    if (it.t === 'rect' && it.h > 100 && it.w < 200) console.log('borda vertical', it.fill, Math.round(it.x), Math.round(it.w));
  }
  process.exit(0);
}
const t = T.newTable(2, 3, { availTwips: 8504, styleId: null });
t.gridColsTwips = [1500, 2500, 3500];
t.rows.forEach((row, r) => row.cells.forEach((c, i) => {
  c.tcPr = { ...(c.tcPr ?? {}), tcW: { w: t.gridColsTwips[i], type: 'dxa' } };
  T.setCellContent(c, [{ type: 'paragraph', paragraph: { runs: [{ text: `r${r}c${i + 1}`, props: {} }], props: {} } }]);
}));
T.setTableProps(t, {
  bidiVisual: !process.argv.includes('--ltr'), tblW: { w: 0, type: 'auto' }, tblInd: { w: 720, type: 'dxa' }, tblLayout: 'fixed',
  tblBorders: {
    left: { val: 'single', sz: 24, space: 0, color: 'FF0000' }, right: { val: 'single', sz: 8, space: 0, color: '0000FF' },
    top: { val: 'single', sz: 4, space: 0, color: '000000' }, bottom: { val: 'single', sz: 4, space: 0, color: '000000' },
    insideH: { val: 'single', sz: 4, space: 0, color: '000000' }, insideV: { val: 'single', sz: 4, space: 0, color: '00AA00' },
  },
});
T.syncLegacy(t);
const pkg = blankDocxPackage();
writeDocument(pkg, { paragraphs: [], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 } }, [], { blocks: [t, { type: 'paragraph', paragraph: { runs: [], props: {} } }] });
writeFileSync(`${out}/${process.argv.includes("--ltr") ? "ltr" : "bidi"}.docx`, pkg.save());
console.log(pkg.documentXml().match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/)?.[0]);
