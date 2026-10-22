// Colhe no corpus real (fora do git) as combinações de formatação de imagem
// (pic:spPr sem xfrm + efeitos do a:blip) para identificar os Estilos de Imagem
// e as predefinições de efeito como o Word as grava. Só lê; nada do corpus sai
// daqui além das assinaturas XML (sem conteúdo dos documentos).
//
//   node tools/image-lab/harvest-styles.mjs [raiz] > .out/harvest.json
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const root = process.argv[2] ?? 'E:/UniversalWriteTest/Documents';
const files = [];
const walk = (d) => {
  let ents;
  try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(docx|docm|dotx)$/i.test(e.name)) files.push(p);
  }
};
walk(root);
const sig = new Map();
const blipSig = new Map();
let n = 0;
for (const f of files) {
  let parts;
  try {
    if (statSync(f).size > 60e6) continue;
    parts = unzipSync(readFileSync(f), { filter: (fl) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(fl.name) });
  } catch { continue; }
  n++;
  for (const k of Object.keys(parts)) {
    const xml = strFromU8(parts[k]);
    for (const m of xml.matchAll(/<pic:pic\b[\s\S]*?<\/pic:pic>/g)) {
      const pic = m[0];
      const sp = /<pic:spPr\b[^>]*>([\s\S]*?)<\/pic:spPr>/.exec(pic)?.[1] ?? '';
      const body = sp.replace(/<a:xfrm\b[\s\S]*?<\/a:xfrm>/, '').replace(/<a:xfrm\b[^>]*\/>/, '').replace(/\s+/g, ' ').trim();
      if (/a:ln\b|a:effectLst|a:scene3d|a:sp3d|prst="(?!rect")/.test(body)) {
        const e = sig.get(body) ?? { n: 0, files: new Set() };
        e.n++; e.files.add(f.slice(root.length + 1).slice(0, 80));
        sig.set(body, e);
      }
      const blip = /<a:blip\b[^>]*>([\s\S]*?)<\/a:blip>/.exec(pic)?.[1] ?? '';
      const fx = blip.replace(/<a:extLst>[\s\S]*?<\/a:extLst>/, (x) => (x.includes('imgProps') ? x.replace(/r:embed="[^"]*"/g, '') : '')).trim();
      if (fx) { const b = blipSig.get(fx) ?? 0; blipSig.set(fx, b + 1); }
    }
  }
}
const top = [...sig.entries()].sort((a, b) => b[1].files.size - a[1].files.size).map(([k, v]) => ({ docs: v.files.size, pics: v.n, spPr: k }));
const tb = [...blipSig.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ pics: v, blip: k }));
console.error(`${n} documentos; ${top.length} assinaturas de spPr; ${tb.length} de blip`);
writeFileSync(process.argv[3] ?? 'harvest.json', JSON.stringify({ spPr: top, blip: tb }, null, 1));
