import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const z = unzipSync(new Uint8Array(readFileSync(process.argv[2] ?? 'D:/Projects/OfficeNext/WordNext/samples/Catalogo-Recursos-Word.docx')));
const s = new TextDecoder().decode(z['word/styles.xml']);
for (const id of (process.argv[3] ?? 'Title,Heading1,Heading2').split(',')) {
  const i = s.indexOf(`w:styleId="${id}"`);
  if (i >= 0) {
    console.log(`=== ${id} ===`);
    console.log(s.slice(i - 40, s.indexOf('</w:style>', i)).replace(/></g, '>\n<').slice(0, 1000));
  } else console.log(`=== ${id}: AUSENTE ===`);
}
