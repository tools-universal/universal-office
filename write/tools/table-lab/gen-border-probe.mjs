// Sonda: uma tabela 1×1 por estilo de borda (as 4 bordas iguais) → o Word
// exporta o PDF e border-probe.py lê como cada estilo é desenhado.
import { writeFileSync } from 'node:fs';
import { DocxPackage, writeDocument, tableOps as T } from '../../packages/docx-core/dist/index.js';
export const STYLES = ['single', 'thick', 'double', 'dotted', 'dashed', 'dotDash', 'dotDotDash', 'triple', 'thinThickSmallGap', 'thickThinSmallGap',
  'thinThickThinSmallGap', 'thinThickMediumGap', 'thickThinMediumGap', 'thinThickThinMediumGap', 'thinThickLargeGap', 'thickThinLargeGap',
  'thinThickThinLargeGap', 'wave', 'doubleWave', 'dashSmallGap', 'dashDotStroked', 'threeDEmboss', 'threeDEngrave', 'outset', 'inset'];
const out = process.argv[2];
for (const st of STYLES) {
  const blocks = [];
  for (const sz of [4, 12, 24]) {
    const t = T.newTable(1, 1, { availTwips: 3010, styleId: null });
    T.setRowHeight(t, 0, 0, 600, 'exact');
    T.setBorders(t, T.wholeRect(t), 'outside', { val: st, sz, space: 0, color: '000000' });
    blocks.push(t, { type: 'paragraph', paragraph: { runs: [], props: {} } }, { type: 'paragraph', paragraph: { runs: [], props: {} } });
  }
  const pkg = DocxPackage.empty();
  writeDocument(pkg, { paragraphs: [], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 } }, [], { blocks });
  writeFileSync(`${out}/${st}.docx`, pkg.save());
}
