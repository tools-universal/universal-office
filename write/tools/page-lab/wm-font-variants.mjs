// Variantes da marca-d'água horizontal (CONFIDENCIAL 2 do Word, wp-cf2.docx) com
// outras fontes no v:textpath, para medir no PDF do Word como o texto preenche a
// caixa (em × altura, linha de base). Grava E:\UniversalWriteTest\_lab\page\wmf\*.docx.
//   node write/tools/page-lab/wm-font-variants.mjs <wp-cf2.docx>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(join(process.cwd(), 'write/packages/docx-core/package.json'));
const { unzipSync, zipSync, strFromU8, strToU8 } = require('fflate');
const src = process.argv[2];
const out = 'E:/UniversalWriteTest/_lab/page/wmf';
mkdirSync(out, { recursive: true });
const files = unzipSync(readFileSync(src));
for (const [tag, font] of [['arial', 'Arial'], ['times', 'Times New Roman'], ['georgia', 'Georgia'], ['calibri', 'Calibri']]) {
  const copy = { ...files };
  for (const name of Object.keys(copy)) {
    if (!/^word\/header\d*\.xml$/.test(name)) continue;
    copy[name] = strToU8(strFromU8(copy[name]).replace(/font-family:&quot;[^&]*&quot;/g, `font-family:&quot;${font}&quot;`).replace(/string="[^"]*"/g, 'string="HOxg"'));
  }
  writeFileSync(join(out, `wmf-${tag}.docx`), zipSync(copy));
}
console.log('ok', out);
