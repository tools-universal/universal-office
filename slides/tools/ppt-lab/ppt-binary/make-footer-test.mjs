// Gera .work/lo/footer-test.pptx: o reference.pptx com placeholders de
// rodapé e número de slide nos slides 2 e 3 — o LibreOffice, ao gravar .ppt,
// transforma isso em HeadersFootersContainer + placeholders do mestre (o
// modelo do PowerPoint 97-2003), exercitando a injeção do conversor.
//
// Uso: node tools/ppt-lab/ppt-binary/make-footer-test.mjs
//      soffice --headless --convert-to ppt --outdir tools/ppt-lab/ppt-binary/.work/lo tools/ppt-lab/ppt-binary/.work/lo/footer-test.pptx
import { unzipSync, zipSync, strFromU8, strToU8 } from '../../../node_modules/fflate/esm/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', '..', 'samples', 'reference.pptx');
const parts = unzipSync(readFileSync(src));
const footer = (id) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Rodapé"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ftr" sz="quarter" idx="11"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR"/><a:t>Rodapé de teste</a:t></a:r></a:p></p:txBody></p:sp>`;
const sldNum = (id) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Número do Slide"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="pt-BR"/><a:t>‹nº›</a:t></a:fld></a:p></p:txBody></p:sp>`;
for (const n of [2, 3]) {
  const p = `ppt/slides/slide${n}.xml`;
  const xml = strFromU8(parts[p]);
  parts[p] = strToU8(xml.replace('</p:spTree>', footer(90) + sldNum(91) + '</p:spTree>'));
}
mkdirSync(join(here, '.work', 'lo'), { recursive: true });
writeFileSync(join(here, '.work', 'lo', 'footer-test.pptx'), zipSync(parts, { level: 6 }));
console.log('ok: .work/lo/footer-test.pptx');
