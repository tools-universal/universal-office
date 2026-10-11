// Mostra os detalhes de uma categoria do último relatório do lab.
// Uso: node write/tools/doc-lab/show.mjs <prefixo-da-categoria> [max]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB_DIR } from './corpus.mjs';

const [prefix = '', max = '40'] = process.argv.slice(2);
const r = JSON.parse(readFileSync(join(LAB_DIR, 'report.json'), 'utf8'));
let n = 0;
for (const d of r.porDocumento) {
  for (const x of d.details ?? []) {
    if (!x.startsWith(prefix)) continue;
    console.log(`${d.id}  ${x.slice(0, 260)}`);
    if (++n >= Number(max)) process.exit(0);
  }
}
