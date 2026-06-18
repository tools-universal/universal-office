import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';

const z = unzipSync(new Uint8Array(readFileSync('D:/Projects/OfficeNext/WordNext/Catalogo-Recursos-Word.docx')));
const dec = new TextDecoder();
const doc = dec.decode(z['word/document.xml']);

// caminho de ancestrais de cada ocorrência
function contexts(xml, tag) {
  const out = [];
  let idx = 0;
  for (;;) {
    idx = xml.indexOf('<' + tag, idx);
    if (idx < 0) break;
    // pega os últimos 3 elementos abertos antes
    const before = xml.slice(Math.max(0, idx - 4000), idx);
    const opens = [...before.matchAll(/<(w:tbl|w:tc|w:p|w:sdt|w:hyperlink|w:r|m:oMath|w:fldSimple)[ >]/g)].map((m) => m[1]);
    const closes = [...before.matchAll(/<\/(w:tbl|w:tc|w:p|w:sdt|w:hyperlink|w:r|m:oMath|w:fldSimple)>/g)].map((m) => m[1]);
    out.push(`abertos≈[${opens.slice(-4).join(',')}] fechados≈[${closes.slice(-4).join(',')}]`);
    idx += 5;
  }
  return out;
}
for (const tag of ['w:fldSimple', 'w:sym', 'w:footnoteReference', 'w:tbl ', 'w:tbl>']) {
  console.log(`\n=== ${tag} (${contexts(doc, tag).length}) ===`);
}
// estrutura de topo do body
const bodyStart = doc.indexOf('<w:body>');
const top = [];
let depth = 0;
const re = /<(\/?)([a-zA-Z0-9:]+)([^>]*?)(\/?)>/g;
re.lastIndex = bodyStart + 8;
let m;
while ((m = re.exec(doc))) {
  const [, close, name, , selfClose] = m;
  if (name === 'w:body' && close) break;
  if (depth === 0 && !close) top.push(name + (selfClose ? '/' : ''));
  if (!close && !selfClose) depth++;
  if (close) depth--;
}
const counts = {};
for (const t of top) counts[t] = (counts[t] ?? 0) + 1;
console.log('\n=== filhos diretos do body ===');
console.log(counts);

// footnotes.xml primeiro k
if (z['word/footnotes.xml']) {
  const fn = dec.decode(z['word/footnotes.xml']);
  console.log('\n=== footnotes.xml ids/types ===');
  for (const mm of fn.matchAll(/<w:footnote ([^>]*)>/g)) console.log(mm[1]);
}
// onde estão fldSimple e sym
console.log('\n=== fldSimple instrs ===');
for (const mm of doc.matchAll(/<w:fldSimple w:instr="([^"]*)"/g)) console.log(JSON.stringify(mm[1]));
console.log('=== sym ===');
for (const mm of doc.matchAll(/<w:sym ([^>]*)>/g)) console.log(mm[1]);
console.log('=== footnoteReference ===');
for (const mm of doc.matchAll(/<w:footnoteReference([^>]*)>/g)) console.log(mm[1]);
