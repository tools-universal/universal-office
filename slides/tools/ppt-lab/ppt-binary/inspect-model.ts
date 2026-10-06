// Mostra o modelo que o LEITOR do viewer extrai de um .pptx (convertido ou
// não): formas do slide com xfrm, geometria, preenchimento, contorno, sombra
// e o início do texto — para conferir o que o renderer recebe.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/inspect-model.ts <arq.pptx> <slide#> [id]
import { readFileSync } from 'node:fs';
import { PptxPackage, readPresentation, readSlide } from '../../../packages/slides-core/src/index.js';

const [file, slideArg, idArg] = process.argv.slice(2);
const pkg = PptxPackage.load(new Uint8Array(readFileSync(file!)));
const pres = readPresentation(pkg);
const slide = readSlide(pkg, pres.slides[parseInt(slideArg ?? '1', 10) - 1]!.target!);
console.log('bg', JSON.stringify(slide.bg), slide.bgImage ? 'bgImage ' + slide.bgImage.part : '');
for (const sh of slide.shapes) {
  if (idArg && sh.id !== idArg) continue;
  const { txBody, image, custGeom, ...rest } = sh;
  console.log(JSON.stringify({ ...rest, image: image?.part, custGeom: custGeom ? `${custGeom.subs.length} subpaths` : undefined,
    text: txBody?.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join(' / ').slice(0, 80) }));
}
