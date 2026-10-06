// Resumo do modelo intermediário de um .ppt: tamanho, fontes, cabeçalho/
// rodapé, mestres e slides (layout, flags, mestre, transição, nº de formas).
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/show-doc.ts <arq.ppt>
import { readFileSync } from 'node:fs';
import { readPptDocument } from '../../../packages/slides-core/src/ppt/ppt-reader.js';

const d = readPptDocument(new Uint8Array(readFileSync(process.argv[2]!)));
console.log(`slide ${d.slideW}×${d.slideH} mu, tipo ${d.slideSizeType}, 1º nº ${d.firstSlideNumber}, lcid 0x${(d.docLcid ?? 0).toString(16)}, omitTitlePlace=${d.omitTitlePlace}`);
console.log('fontes:', d.fonts.map((f) => f?.name).join(', '));
console.log('HF slides:', JSON.stringify(d.slideHeadersFooters));
for (const m of d.masters) console.log(`mestre ${m.kind} id=0x${m.slideId.toString(16)} "${m.name ?? ''}" formas=${m.drawing.root?.children?.length ?? 0} esquema=${m.colorScheme?.join(' ')}`);
d.slides.forEach((s, i) => console.log(`slide ${i + 1}: geom=${s.geom} flags=${s.flags} mestre=0x${s.masterIdRef.toString(16)} formas=${s.drawing.root?.children?.length ?? 0} outline=${s.outline.length} hf=${JSON.stringify(s.headersFooters ?? null)} trans=${JSON.stringify(s.transition ?? null)}`));
