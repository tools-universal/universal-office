// Sonda: linhas com w:trHeight w:hRule="auto" (val 1200), "atLeast" (1200),
// sem hRule (1200) e sem trHeight — o Word exporta o PDF e hrule-probe.py
// mede a altura de cada linha pelas bordas.
//   node tools/table-lab/gen-hrule-probe.mjs <pasta>
import { writeFileSync, mkdirSync } from 'node:fs';
import { DocxPackage, writeDocument, tableOps as T } from '../../packages/docx-core/dist/index.js';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const t = T.newTable(5, 1, { availTwips: 3010, styleId: null });
T.setBorders(t, T.wholeRect(t), 'all', { val: 'single', sz: 4, space: 0, color: '000000' });
const rules = ['auto', 'atLeast', 'none', 'exact', 'nothing'];
rules.forEach((rule, r) => {
  T.setCellContent(t.rows[r].cells[0], [{ type: 'paragraph', paragraph: { runs: [{ text: rule, props: {} }], props: {} } }]);
  if (rule === 'nothing') return;
  t.rows[r].trPr = { ...(t.rows[r].trPr ?? {}), trHeight: { val: 1200, hRule: rule === 'none' ? 'atLeast' : rule } };
});
const pkg = DocxPackage.empty();
writeDocument(pkg, { paragraphs: [], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 } }, [], { blocks: [t, { type: 'paragraph', paragraph: { runs: [], props: {} } }] });
let xml = pkg.documentXml();
pkg.setPartText('word/document.xml', xml);
writeFileSync(`${out}/hrule.docx`, pkg.save());
console.log(xml.match(/<w:trHeight[^>]*>/g));
