// Sonda: uma linha por padrão de sombreamento (w:shd w:val), duas células —
// preto sobre branco e vermelho sobre amarelo — e parágrafos com os mesmos
// padrões; o Word exporta o PDF e shading-probe.py mede como cada um sai.
//   node tools/table-lab/gen-shading-probe.mjs <pasta>
import { writeFileSync, mkdirSync } from 'node:fs';
import { DocxPackage, writeDocument, tableOps as T } from '../../packages/docx-core/dist/index.js';

export const PATTERNS = ['clear', 'solid', 'horzStripe', 'vertStripe', 'reverseDiagStripe', 'diagStripe', 'horzCross', 'diagCross',
  'thinHorzStripe', 'thinVertStripe', 'thinReverseDiagStripe', 'thinDiagStripe', 'thinHorzCross', 'thinDiagCross',
  'pct5', 'pct10', 'pct12', 'pct15', 'pct20', 'pct25', 'pct30', 'pct35', 'pct37', 'pct40', 'pct45', 'pct50',
  'pct55', 'pct60', 'pct62', 'pct65', 'pct70', 'pct75', 'pct80', 'pct85', 'pct87', 'pct90', 'pct95'];
const COLORS = [['000000', 'FFFFFF'], ['C00000', 'FFFF00']];

const out = process.argv[2];
if (out) {
  mkdirSync(out, { recursive: true });
  const t = T.newTable(PATTERNS.length, 2, { availTwips: 4010, styleId: null });
  PATTERNS.forEach((val, r) => {
    T.setRowHeight(t, r, r, 400, 'exact');
    COLORS.forEach(([color, fill], c) => T.setShading(t, { r1: r, c1: c, r2: r, c2: c }, { val, color, fill }));
  });
  const blocks = [t, { type: 'paragraph', paragraph: { runs: [], props: {} } }];
  const pkg = DocxPackage.empty();
  writeDocument(pkg, { paragraphs: [], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 } }, [], { blocks });
  writeFileSync(`${out}/shading.docx`, pkg.save());
  console.log(`${out}/shading.docx`);
}
