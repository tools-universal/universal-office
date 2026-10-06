// Mostra os blocos de texto de um slide (ClientTextbox / outline): texto,
// corridas de parágrafo e caractere, régua e PP9.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-text.ts <arq.ppt> <slide#> [spid]
import { readFileSync } from 'node:fs';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';
import { readClientTextbox } from '../../../packages/slides-core/src/ppt/text.js';
import type { OAShape } from '../../../packages/slides-core/src/ppt/officeart.js';

const [file, slideArg, spidArg] = process.argv.slice(2);
const d = readPptDocument(new Uint8Array(readFileSync(file!)));
const idx = parseInt(slideArg ?? '1', 10);
const slide = idx > 0 ? d.slides[idx - 1]! : d.masters[-idx - 1]!;
const visit = (sh: OAShape): void => {
  if (sh.clientTextbox && (!spidArg || String(sh.spid) === spidArg)) {
    const ct = readClientTextbox(sh.clientTextbox);
    const b = ct.block ?? (ct.outlineRef !== undefined ? slide.outline[ct.outlineRef] : undefined);
    console.log(`== spid ${sh.spid} outlineRef=${ct.outlineRef} type=${b?.textType} text=${JSON.stringify(b?.text)}`);
    if (b) {
      for (const r of b.pfRuns) console.log(`   PF n=${r.count} lvl=${r.indentLevel} ${JSON.stringify(r.pf)}`);
      for (const r of b.cfRuns) console.log(`   CF n=${r.count} ${JSON.stringify(r.cf)}`);
      if (b.ruler) console.log(`   RULER ${JSON.stringify(b.ruler)}`);
      if (b.links) console.log(`   LINKS ${JSON.stringify(b.links)}`);
      if (b.metaChars) console.log(`   META ${JSON.stringify(b.metaChars)}`);
    }
  }
  for (const c of sh.children ?? []) visit(c);
};
for (const c of slide.drawing.root?.children ?? []) visit(c);
