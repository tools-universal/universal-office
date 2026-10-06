// Mostra os estilos-mestre (TextMasterStyleAtom) por instância/nível de um
// mestre e os padrões de texto do documento.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-styles.ts <arq.ppt> [mestre#]
import { readFileSync } from 'node:fs';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';

const [file, mArg] = process.argv.slice(2);
const d = readPptDocument(new Uint8Array(readFileSync(file!)));
console.log('docCF', JSON.stringify(d.docCF));
console.log('docPF', JSON.stringify(d.docPF));
d.docOtherStyle?.forEach((l, i) => console.log(`docOther L${i}`, JSON.stringify(l)));
const m = d.masters[parseInt(mArg ?? '1', 10) - 1]!;
console.log('master', m.name, 'scheme', m.colorScheme?.join(' '));
for (const [inst, levels] of m.masterStyles ?? []) {
  levels.forEach((l, i) => console.log(`inst${inst} L${l.level ?? i}`, JSON.stringify(l.pf), JSON.stringify(l.cf)));
}
