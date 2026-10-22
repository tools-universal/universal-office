// Trechos do document.xml de um .docx em volta de padrões (depuração do lab).
//   node tools/refs-lab/peek.cjs <docx> <regex> [contexto=300] [parte=word/document.xml]
const fs = require('fs');
const { unzipSync, strFromU8 } = require('fflate');
const [file, pat, ctxArg, partArg] = process.argv.slice(2);
const ctx = +(ctxArg ?? 300);
const zip = unzipSync(fs.readFileSync(file));
const xml = strFromU8(zip[partArg ?? 'word/document.xml']);
const re = new RegExp(pat, 'g');
let m, n = 0;
while ((m = re.exec(xml)) && n++ < 6) {
  console.log(`--- @${m.index}`);
  console.log(xml.slice(Math.max(0, m.index - ctx), m.index + m[0].length + ctx));
}
if (!n) console.log('(sem ocorrências)');
