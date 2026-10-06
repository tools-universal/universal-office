// Gera .work/lo/wordart-test.pptx: um slide com WordArt (bodyPr prstTxWarp)
// — o LibreOffice importa como Fontwork e, ao gravar .ppt, escreve as
// propriedades gtext* (WordArt clássico), exercitando a conversão do gtext.
//
// Uso: node tools/ppt-lab/ppt-binary/make-wordart-test.mjs
//      soffice --headless --convert-to ppt --outdir tools/ppt-lab/ppt-binary/.work/lo tools/ppt-lab/ppt-binary/.work/lo/wordart-test.pptx
import { unzipSync, zipSync, strFromU8, strToU8 } from '../../../node_modules/fflate/esm/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const parts = unzipSync(readFileSync(join(here, '..', '..', '..', 'samples', 'reference.pptx')));
const wa = `<p:sp><p:nvSpPr><p:cNvPr id="80" name="WordArt 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="1000000" y="1500000"/><a:ext cx="6000000" cy="1500000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
<p:txBody><a:bodyPr wrap="none"><a:prstTxWarp prst="textArchUp"><a:avLst/></a:prstTxWarp><a:normAutofit/></a:bodyPr><a:lstStyle/>
<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="5400" b="1"><a:solidFill><a:srgbClr val="C00000"/></a:solidFill><a:latin typeface="Arial Black"/></a:rPr><a:t>Arte em Texto</a:t></a:r></a:p></p:txBody></p:sp>`;
const p = 'ppt/slides/slide3.xml';
parts[p] = strToU8(strFromU8(parts[p]).replace('</p:spTree>', wa + '</p:spTree>'));
mkdirSync(join(here, '.work', 'lo'), { recursive: true });
writeFileSync(join(here, '.work', 'lo', 'wordart-test.pptx'), zipSync(parts, { level: 6 }));
console.log('ok: .work/lo/wordart-test.pptx');
