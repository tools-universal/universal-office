// Depuração: mostra o XML do N-ésimo parágrafo (ordem do documento, incluindo
// células de tabela, excluindo caixas de texto) no nosso .docx e no do Word.
// Uso: node write/tools/doc-lab/para.mjs <id> <n> [quantos=1] [--part word/header1.xml]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { LAB_DIR } from './corpus.mjs';

const [id, nStr, countStr] = process.argv.slice(2);
const partIdx = process.argv.indexOf('--part');
const part = partIdx > 0 ? process.argv[partIdx + 1] : 'word/document.xml';
const n = Number(nStr ?? 0);
const count = Number(countStr ?? 1) || 1;

function paragraphs(xml) {
  // varredura simples por tags w:p de nível de bloco (ignora w:txbxContent)
  const out = [];
  const re = /<(\/?)(w:p|w:txbxContent)(\s[^>]*)?(\/?)>/g;
  let depthTx = 0;
  let start = -1;
  let level = 0;
  let m;
  while ((m = re.exec(xml))) {
    const [tag, close, name] = m;
    const self = tag.endsWith('/>');
    if (name === 'w:txbxContent') { depthTx += close ? -1 : self ? 0 : 1; continue; }
    if (depthTx > 0) continue;
    if (self) { if (level === 0) out.push(tag); continue; }
    if (!close) { if (level === 0) start = m.index; level++; }
    else { level--; if (level === 0 && start >= 0) { out.push(xml.slice(start, m.index + tag.length)); start = -1; } }
  }
  return out;
}

const clean = (s) => s.replace(/ w:rsid\w*="[^"]*"/g, '').replace(/ w14:\w+="[^"]*"/g, '').replace(/<w:proofErr[^>]*\/>/g, '');
for (const [label, dir] of [['NOSSO', 'ours'], ['WORD', 'word']]) {
  const z = unzipSync(readFileSync(join(LAB_DIR, dir, `${id}.docx`)));
  const xml = strFromU8(z[part]);
  const ps = paragraphs(xml);
  console.log(`=== ${label} (${ps.length} parágrafos)`);
  for (let k = n; k < Math.min(ps.length, n + count); k++) console.log(`[${k}] ${clean(ps[k]).slice(0, 4000)}\n`);
}
