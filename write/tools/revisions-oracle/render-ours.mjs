// Nosso PDF de um .docx num modo de exibição de revisões (para comparar com o
// PDF "com marcação" do Word de revisions-render.ps1):
//   node write/tools/revisions-oracle/render-ours.mjs <entrada.docx> <saída.pdf> [all|simple|final|original]
import { readFileSync, writeFileSync } from 'node:fs';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const [input, output, mode = 'all'] = process.argv.slice(2);
if (!input || !output) { console.error('uso: render-ours.mjs <entrada.docx> <saída.pdf> [modo]'); process.exit(1); }
const provider = await createNodeFontProvider({ missing: [] });
const full = core.readFullDocument(core.DocxPackage.load(new Uint8Array(readFileSync(input))));
const res = eng.layoutDocument(full, provider, { revisions: { mode } });
writeFileSync(output, eng.renderPdf(res));
console.log(`${res.pages.length} página(s)`);
