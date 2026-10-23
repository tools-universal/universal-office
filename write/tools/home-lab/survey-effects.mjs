// Levantamento dos EFEITOS DE TEXTO (w14) e da tipografia OpenType no corpus real do Write
// (E:\UniversalWriteTest\Documents, fora do git): quantos documentos usam cada elemento e as
// combinações mais comuns (os modelos da galeria Efeitos de Texto aparecem como as combinações
// repetidas). Só lê os .docx; grava results/effects/survey.json.
//   node tools/home-lab/survey-effects.mjs [pasta]
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? 'E:/UniversalWriteTest/Documents';
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.docx$/i.test(n)) files.push(p); } };
walk(root);
const TAGS = ['textFill', 'textOutline', 'shadow', 'reflection', 'glow', 'props3d', 'scene3d', 'ligatures', 'numForm', 'numSpacing', 'stylisticSets', 'cntxtAlts'];
const docs = Object.fromEntries(TAGS.map((t) => [t, 0]));
const combos = new Map();
const parts = new Map();
let n = 0;
for (const f of files) {
  let z;
  try { z = unzipSync(readFileSync(f), { filter: (e) => /^word\/(document|styles|header\d*|footer\d*)\.xml$/.test(e.name) }); } catch { continue; }
  n++;
  const seen = new Set();
  for (const [name, bytes] of Object.entries(z)) {
    const xml = strFromU8(bytes);
    for (const t of TAGS) if (xml.includes(`<w14:${t}`)) seen.add(t);
    // cada rPr com efeitos (sem os de tipografia): a combinação normalizada
    for (const m of xml.matchAll(/<w:rPr>((?:(?!<\/w:rPr>)[\s\S])*?<w14:(?:textFill|textOutline|shadow|reflection|glow|props3d|scene3d)[\s\S]*?)<\/w:rPr>/g)) {
      const fx = [...m[1].matchAll(/<w14:(textFill|textOutline|shadow|reflection|glow|props3d|scene3d)\b[\s\S]*?(?:\/>(?=<w14:|<w:|$)|<\/w14:\1>)/g)].map((x) => x[0]).join('');
      if (!fx) continue;
      const k = fx.replace(/\s+/g, ' ');
      const c = combos.get(k) ?? { n: 0, docs: new Set(), where: new Set() };
      c.n++; c.docs.add(f); c.where.add(name.replace(/\d+/, ''));
      combos.set(k, c);
    }
    parts.set(name, (parts.get(name) ?? 0) + 1);
  }
  for (const t of seen) docs[t]++;
}
const top = [...combos.entries()].sort((a, b) => b[1].docs.size - a[1].docs.size).slice(0, 60)
  .map(([k, c]) => ({ docs: c.docs.size, runs: c.n, where: [...c.where], xml: k }));
const out = { root, files: files.length, read: n, docsWith: docs, distinctCombos: combos.size, top };
const dir = join(here, 'results', 'effects');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'survey.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ files: files.length, read: n, docsWith: docs, distinctCombos: combos.size }, null, 1));
for (const t of top.slice(0, 25)) console.log(t.docs, t.runs, t.where.join(','), t.xml.slice(0, 260));
