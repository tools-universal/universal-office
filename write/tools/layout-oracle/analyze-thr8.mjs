// Limiar de compressão (casos justify2): para cada recuo, a palavra FIM ficou na linha 1?
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2;
const COMPATS = (process.argv[2] ?? 'c11cp,c15cp,c14cp').split(',');
const configs = [['Arial', 11, 6, 'mmmm'], ['Times New Roman', 11, 12, 'mmmm']];
for (const compat of COMPATS) for (const [font, size, words, w] of configs) {
  const name = `${compat}-thr-${font.toLowerCase().replace(/\s+/g, '-')}-${size}-${words}-${w.length}${w[0]}`;
  const face = prov.face(font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * size * 20) / u, 0);
  const first = Array.from({ length: words - 1 }, () => w).join(' ') + ' FIM';
  const nat = W(first), spaces = words - 1, sp = W(' ');
  const lo = TEXT_W - nat - 0.02 * spaces * sp;
  const steps = Math.ceil((0.42 * spaces * sp) / 4);
  const word = JSON.parse(readFileSync(join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'justify8', `${name}.word.json`), 'utf8'));
  const lines = word.pages.flatMap((p) => p.lines);
  // cada parágrafo: 1ª linha termina com FIM? (texto sem espaços)
  let li = 0, lastFit = null, firstRej = null;
  for (let k = 0; k <= steps; k++) {
    const ind = Math.max(0, Math.round(lo + k * 4));
    const l1 = lines[li]?.text ?? '';
    const fits = l1.endsWith('FIM') || l1.includes('FIMsegunda');
    // conta quantas linhas este parágrafo ocupa: avança até a linha que termina com 'continua'
    while (li < lines.length && !lines[li].text.endsWith('continua')) li++;
    li++;
    const avail = TEXT_W - ind;
    const ratio = (nat - avail) / (spaces * sp);
    if (fits) lastFit = { ind, ratio, ov: nat - avail };
    else if (!firstRej) firstRej = { ind, ratio, ov: nat - avail };
  }
  console.log(`${name.padEnd(30)} space ${(sp / 20).toFixed(3)}pt  último que coube: ${(lastFit?.ratio * 100).toFixed(2)}% (excesso ${(lastFit?.ov / 20).toFixed(3)}pt)  1º rejeitado: ${(firstRej?.ratio * 100).toFixed(2)}% (excesso ${(firstRej?.ov / 20).toFixed(3)}pt)`);
}
