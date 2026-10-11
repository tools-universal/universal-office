// Mede a compressão de espaços do Word em parágrafos justificados.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const { lorem } = await import(pathToFileURL(join(here, 'docx-builder.mjs')).href);
const prov = await createNodeFontProvider();
const AVAIL = (11906 - 1701 * 2) / 20;
const rows = [];
for (const font of ['Arial', 'Calibri', 'Times New Roman', 'Aptos', 'Verdana']) {
  for (const kind of ['just', 'left']) {
    const word = JSON.parse(readFileSync(join(here, '..', '..', 'packages', 'docx-layout', 'test', 'oracle', 'justify', `${kind}-${font.toLowerCase().replace(/\s+/g, '-')}.word.json`), 'utf8'));
    const face = prov.face(font, false, false);
    const u = face.font.metrics.unitsPerEm;
    const lines = word.pages.flatMap((pg) => pg.lines);
    let li = 0;
    let maxFit = -Infinity, minNext = Infinity;
    for (const s of [10, 11, 12]) {
      for (let k = 0; k < 4; k++) {
        const words = lorem(90, k * 7 + s).split(' ');
        const em = process.env.DEV ? Math.round(s * 600 / 72) * 72 / 600 : s;
        const W = (t) => [...t].reduce((a, c) => a + face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * em / u, 0);
        const sp = W(' ');
        let wi = 0;
        while (wi < words.length && li < lines.length) {
          const target = lines[li].text;
          let acc = '', n = 0;
          while (wi + n < words.length && acc.length < target.length) { acc += words[wi + n]; n++; }
          if (acc !== target) { console.log('desalinhado', font, kind, target.slice(0, 30), acc.slice(0, 30)); break; }
          const lineWords = words.slice(wi, wi + n);
          const last = wi + n >= words.length;
          if (!last) {
            const text = lineWords.join(' ');
            const nat = W(text), spaces = lineWords.length - 1;
            const rFit = (nat - AVAIL) / (spaces * sp);
            const nextText = text + ' ' + words[wi + n];
            const rNext = (W(nextText) - AVAIL) / ((spaces + 1) * sp);
            maxFit = Math.max(maxFit, rFit);
            minNext = Math.min(minNext, rNext);
            if (process.env.DETAIL && kind === 'just') {
              const ovFit = nat - AVAIL, ovNext = W(nextText) - AVAIL;
              rows.push({ font, s, spaces, sp, ovFit, ovNext, nat, natNext: W(nextText), nwords: lineWords.length, text, next: words[wi + n], nextW: W(words[wi + n]), lastW: W(lineWords[lineWords.length - 1]) });
            }
          }
          wi += n; li++;
        }
      }
    }
    console.log(`${font.padEnd(16)} ${kind}: compressão usada máx ${(maxFit * 100).toFixed(2)}%  próxima palavra exigiria mín ${(minNext * 100).toFixed(2)}%`);
  }
}

if (process.env.DETAIL) {
  for (const r of rows) {
    if (process.env.DETAIL === '2') { if ((r.ovFit > 3 || r.ovNext < 10) && r.font.startsWith(process.env.FONT ?? '')) console.log(r.font.slice(0,8), r.s, r.ovFit > 0 ? 'FIT ' + r.ovFit.toFixed(2) : 'REJ ' + r.ovNext.toFixed(2), 'n', r.spaces, '|', process.env.FULL ? r.text : '...' + r.text.slice(-40), '|', r.next, 'nextW', r.nextW.toFixed(2), 'lastW', r.lastW.toFixed(2)); continue; }
    if (r.ovFit > -2 || r.ovNext < 15) console.log(r.font.slice(0,8).padEnd(8), r.s, 'sp', r.sp.toFixed(2), 'n', r.spaces, 'fit ov', r.ovFit.toFixed(2), '(', (r.ovFit/(r.spaces*r.sp)*100).toFixed(1), '% esp;', (r.ovFit/r.nat*100).toFixed(2), '% linha)', ' next ov', r.ovNext.toFixed(2), '(', (r.ovNext/((r.spaces+1)*r.sp)*100).toFixed(1), '% esp;', (r.ovNext/r.natNext*100).toFixed(2), '% linha)');
  }
}
