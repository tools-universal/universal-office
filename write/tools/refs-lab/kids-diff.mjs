// Filhos do w:body que mudaram entre o original e o salvo (depuração do lab):
// imprime o índice e o trecho em volta da 1ª diferença de cada um.
//   node tools/refs-lab/kids-diff.mjs <original.docx> <salvo.docx> [contexto=250]
import { readFileSync } from 'node:fs';
const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const { DocxPackage, parseXml, childElements, firstChild } = core;
const [a, b, c] = process.argv.slice(2);
const ctx = +(c ?? 250);
const kids = (file) => {
  const xml = DocxPackage.load(new Uint8Array(readFileSync(file))).documentXml();
  const root = parseXml(xml, { positions: true });
  return childElements(firstChild(root, 'w:body')).map((k) => xml.slice(k.s, k.e));
};
const ka = kids(a), kb = kids(b);
const setA = new Set(ka);
kb.forEach((k, i) => {
  if (setA.has(k)) return;
  // o original mais parecido: mesmo índice ou o anterior (parágrafo novo antes)
  const o = [ka[i], ka[i - 1], ka[i + 1]].find((x) => x && x.slice(0, 60) === k.slice(0, 60)) ?? '';
  let d = 0;
  while (d < o.length && o[d] === k[d]) d++;
  console.log(`#${i} (${k.length} chars, difere em ${d})`);
  console.log('  ORIG', o.slice(Math.max(0, d - ctx), d + ctx));
  console.log('  NOVO', k.slice(Math.max(0, d - ctx), d + ctx));
});
