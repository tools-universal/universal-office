// Mostra as linhas medidas no PDF do Word (<caso>.word.json do oráculo de layout)
// de um grupo, página a página — leitura humana dos fatos das notas.
//   node write/tools/notes-lab/show.mjs <grupo> [filtro]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [group, filter] = process.argv.slice(2);
const dir = join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', group);
for (const f of readdirSync(dir).filter((x) => x.endsWith('.word.json') && (!filter || x.includes(filter))).sort()) {
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  console.log(`## ${f.replace('.word.json', '')}`);
  j.pages.forEach((pg, i) => {
    console.log(` p${i + 1}`);
    for (const l of pg.lines) console.log(`   y=${l.y.toFixed(2).padStart(7)} x=${l.x0.toFixed(2).padStart(7)}..${l.x1.toFixed(2).padStart(7)} sz=${l.size.toFixed(2).padStart(5)} ${l.text}`);
  });
}
