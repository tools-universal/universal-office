// Auto-verificação dos parsers de texto sobre o corpus: todo StyleTextPropAtom
// deve cobrir text.length + 1 e consumir EXATAMENTE recLen; todo
// TextMasterStyleAtom/TextRulerAtom também. Imprime um resumo por arquivo.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/check-parse.ts [arq.ppt…]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readCfb } from '../../../packages/slides-core/src/ppt/cfb.js';
import { ByteReader, recsIn, isContainer, RT, type Rec } from '../../../packages/slides-core/src/ppt/records.js';
import { readStyleTextProp, readPFFields, readCFFields } from '../../../packages/slides-core/src/ppt/text.js';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';

let files = process.argv.slice(2);
if (!files.length) {
  const dir = join(process.cwd(), 'samples', 'playback');
  files = readdirSync(dir).filter((f) => f.endsWith('.ppt')).map((f) => join(dir, f));
}

function masterStyleConsumed(rec: Rec): number {
  const r = rec.r;
  let o = rec.start;
  const n = r.u16(o); o += 2;
  for (let i = 0; i < n; i++) {
    if (rec.inst >= 5) o += 2;
    const pm = r.u32(o); o += 4; o += readPFFields(r, o, pm).size;
    const cm = r.u32(o); o += 4; o += readCFFields(r, o, cm).size;
  }
  return o - rec.start;
}

for (const f of files) {
  const cfb = readCfb(new Uint8Array(readFileSync(f)));
  const doc = cfb.getStream('PowerPoint Document')!;
  const r = new ByteReader(doc);
  let nStyle = 0, badStyle = 0, nMaster = 0, badMaster = 0;
  const walk = (rs: Rec[]): void => {
    let lastTextLen = -1;
    for (const rec of rs) {
      if (rec.type === RT.TextCharsAtom) lastTextLen = (rec.end - rec.start) / 2;
      else if (rec.type === RT.TextBytesAtom) lastTextLen = rec.end - rec.start;
      else if (rec.type === RT.TextHeaderAtom) lastTextLen = 0;
      else if (rec.type === RT.StyleTextPropAtom) {
        nStyle++;
        const st = readStyleTextProp(rec, Math.max(0, lastTextLen));
        const pfSum = st.pf.reduce((a, b) => a + b.count, 0);
        const cfSum = st.cf.reduce((a, b) => a + b.count, 0);
        if (!st.ok || st.leftover !== 0 || pfSum < lastTextLen + 1 || cfSum < lastTextLen + 1) {
          badStyle++;
          if (badStyle <= 5) console.log(`  STYLE @${rec.hdr} len=${rec.len} text=${lastTextLen} pf=${pfSum} cf=${cfSum} leftover=${st.leftover}`);
        }
      } else if (rec.type === RT.TextMasterStyleAtom) {
        nMaster++;
        const used = masterStyleConsumed(rec);
        if (used !== rec.len) { badMaster++; console.log(`  MASTER inst=${rec.inst} @${rec.hdr} len=${rec.len} used=${used}`); }
      }
      if (isContainer(rec)) walk(recsIn(rec.r, rec.start, rec.end));
    }
  };
  walk(recsIn(r, 0, doc.length));
  const d = readPptDocument(new Uint8Array(readFileSync(f)));
  const nShapes = d.slides.reduce((a, s) => a + (s.drawing.root?.children?.length ?? 0), 0);
  console.log(`${f.split(/[\\/]/).pop()}: slides=${d.slides.length} masters=${d.masters.length} fonts=[${d.fonts.map((x) => x?.name).join(', ')}] blips=${d.blips.map((b) => b?.ext ?? '-').join(',')} shapes=${nShapes} style=${nStyle}/${badStyle}bad master=${nMaster}/${badMaster}bad`);
}
