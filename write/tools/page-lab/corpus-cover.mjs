// Folhas de rosto nos documentos reais: estrutura do w:sdt "Cover Pages" (onde
// fica a quebra de página, o que vem depois, titlePg da 1ª seção). Só estrutura
// no console — o conteúdo é de terceiros e dos blocos do Word.
//   node write/tools/page-lab/corpus-cover.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { LAB_DIR } from '../corpus-lab/corpus.mjs';

const require = createRequire(join(process.cwd(), 'write/packages/docx-core/package.json'));
const { unzipSync, strFromU8 } = require('fflate');
const scan = JSON.parse(readFileSync(join(LAB_DIR, 'page', 'scan.json'), 'utf8'));

for (const d of scan.detail.filter((x) => x.cover)) {
  const doc = strFromU8(unzipSync(readFileSync(d.path), { filter: (f) => f.name === 'word/document.xml' })['word/document.xml']);
  const i = doc.indexOf('<w:docPartGallery w:val="Cover Pages"');
  const sdtStart = doc.lastIndexOf('<w:sdt>', i);
  // fim do sdt (contando aninhados)
  let depth = 0, k = sdtStart, end = -1;
  const re = /<w:sdt>|<\/w:sdt>/g;
  re.lastIndex = sdtStart;
  for (let m; (m = re.exec(doc));) { depth += m[0] === '<w:sdt>' ? 1 : -1; if (depth === 0) { end = m.index + m[0].length; break; } }
  const sdt = doc.slice(sdtStart, end);
  const struct = (x) => x.replace(/<w:t( [^>]*)?>[^<]*<\/w:t>/g, '<w:t/>').replace(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g, '<AC/>')
    .replace(/<w:drawing>[\s\S]*?<\/w:drawing>/g, '<DRAW/>').replace(/<w:pict>[\s\S]*?<\/w:pict>/g, '<PICT/>').replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '').replace(/<w:pPr>[\s\S]*?<\/w:pPr>/g, (m) => (/w:sectPr/.test(m) ? '<pPr+sectPr/>' : '<pPr/>'))
    .replace(/<w:sdtPr>[\s\S]*?<\/w:sdtPr>/g, (m) => `<sdtPr ${(/docPartGallery w:val="([^"]+)"/.exec(m) ?? [])[1] ?? (/<w:alias w:val="([^"]+)"/.exec(m) ?? [])[1] ?? ''}${/dataBinding/.test(m) ? ' bound' : ''}/>`);
  const bodyStart = doc.indexOf('<w:body>') + 8;
  const firstSect = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/.exec(doc.slice(end))?.[0] ?? '';
  console.log(`## ${d.id} sdt at body+${sdtStart - bodyStart} len=${sdt.length} brPage=${(sdt.match(/w:type="page"/g) ?? []).length} sectInSdt=${/w:sectPr/.test(sdt)} titlePg(next sect)=${/<w:titlePg/.test(firstSect)}`);
  console.log(struct(sdt).replace(/(<w:p[ >])/g, '\n  $1').slice(0, 1500));
  console.log('  after:', struct(doc.slice(end, end + 600)).replace(/(<w:p[ >])/g, '\n  $1').slice(0, 300));
}
