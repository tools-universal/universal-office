// Gera dotnet/tests/fixtures/input/pictures.docx — entrada SINTÉTICA de paridade
// JS × .NET do Formato da Imagem (motor docx-layout + PDF): imagens em linha e
// flutuantes com sombra externa (simples e em perspectiva), sombra interna,
// brilho, bordas suaves, reflexo, Cortar para Forma (elipse, retângulo
// arredondado com ajuste, snip2DiagRect), contornos (cor do tema, tracejado,
// duplo), giro + corte, espelho + corte, transparência, tom duplo, cor
// transparente, cinza + brilho/contraste, chanfro (cruz, círculo; câmera girada
// = sem chanfro) e imagem oculta (docPr hidden).
// A imagem é a pattern.png do lab de imagem (gerada, sem direitos de terceiros);
// o texto usa Arial por NOME (nenhuma fonte embutida — CLAUDE.md).
//
// Usado por tools/gen-parity-layout.mjs (dump expected/layout-input/pictures.layout.json)
// e tools/gen-parity-pdf.mjs (expected/pictures.docx.pdf.meta.json).
// Regenerável: `node tools/gen-parity-pictures.mjs` (os bytes do zip mudam com a data;
// o conteúdo não).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { buildDocx, docDefaults, lorem, p, r } = await import(new URL('../write/tools/layout-oracle/docx-builder.mjs', import.meta.url).href);
const { patternPng } = await import(new URL('../write/tools/image-lab/test-image.mjs', import.meta.url).href);
const { strToU8 } = await import(new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);

const E = 12700;
const theme = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T"><a:themeElements>'
  + '<a:clrScheme name="C"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'
  + '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1>'
  + '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>'
  + '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink>'
  + '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>'
  + '<a:fontScheme name="F"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
  + '<a:fmtScheme name="S"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>'
  + '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>'
  + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
  + '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>'
  + '</a:themeElements></a:theme>';

let id = 10;
/** pic:pic com a formatação dada (EMU). */
const graphic = ({ cx, cy, blipFx = '', src = '', xfrm = '', geom = 'rect', adj = '', ln = '', fx = '', d3 = '' }) =>
  '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'
  + `<pic:nvPicPr><pic:cNvPr id="${id}" name="Imagem ${id}"/><pic:cNvPicPr/></pic:nvPicPr>`
  + `<pic:blipFill><a:blip r:embed="rIdImg1">${blipFx}</a:blip>${src}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
  + `<pic:spPr><a:xfrm${xfrm}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${geom}"><a:avLst>${adj}</a:avLst></a:prstGeom>`
  + `${ln}${fx ? `<a:effectLst>${fx}</a:effectLst>` : ''}${d3}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;

/** Imagem em linha (100 × 75 pt; `ee` = wp:effectExtent em EMU, l t r b). */
function inline(o, ee = [0, 0, 0, 0], hidden = false) {
  id++;
  const cx = o.cx ?? 100 * E, cy = o.cy ?? 75 * E;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>`
    + `<wp:effectExtent l="${ee[0]}" t="${ee[1]}" r="${ee[2]}" b="${ee[3]}"/><wp:docPr id="${id}" name="Imagem ${id}"${hidden ? ' hidden="1"' : ''}/>`
    + `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphic({ ...o, cx, cy })}</wp:inline></w:drawing></w:r>`;
}

/** Imagem flutuante (quadrado), relativa à coluna/parágrafo. */
function anchor(o, { x = 0, y = 0, hidden = false } = {}) {
  id++;
  const cx = o.cx ?? 100 * E, cy = o.cy ?? 75 * E;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">`
    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH>`
    + `<wp:positionV relativeFrom="paragraph"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/>`
    + `<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${id}" name="Imagem ${id}"${hidden ? ' hidden="1"' : ''}/>`
    + `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphic({ ...o, cx, cy })}</wp:anchor></w:drawing></w:r>`;
}

const black = (a) => `<a:prstClr val="black"><a:alpha val="${a}"/></a:prstClr>`;
const para = (run, seed) => p(run + r(` ${lorem(30, seed)}`));
const body = [
  p(r('Formato da Imagem — paridade JS × .NET')),
  // sombras
  para(inline({ fx: `<a:outerShdw blurRad="50800" dist="38100" dir="2700000" algn="tl" rotWithShape="0">${black(40000)}</a:outerShdw>` }, [38100, 38100, 95250, 95250]), 1),
  para(inline({ fx: `<a:outerShdw blurRad="76200" dist="12700" dir="5400000" sx="90000" sy="-19000" kx="-800400" algn="bl" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="20000"/></a:srgbClr></a:outerShdw>` }, [0, 0, 19050, 228600]), 2),
  para(inline({ fx: `<a:innerShdw blurRad="63500" dist="50800" dir="13500000">${black(50000)}</a:innerShdw>` }), 3),
  // brilho, bordas suaves, reflexo
  para(inline({ fx: '<a:glow rad="101600"><a:schemeClr val="accent1"><a:satMod val="175000"/><a:alpha val="40000"/></a:schemeClr></a:glow>' }, [114300, 114300, 114300, 114300]), 4),
  para(inline({ fx: '<a:softEdge rad="63500"/>' }), 5),
  para(inline({ fx: '<a:reflection blurRad="6350" stA="50000" endA="300" endPos="55500" dir="5400000" sy="-100000" algn="bl" rotWithShape="0"/>' }, [0, 0, 0, 571500]), 6),
  // Cortar para Forma + contorno, flutuantes
  p(anchor({ geom: 'ellipse', ln: '<a:ln w="28575" cap="rnd"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:ln>' }) + r(lorem(120, 7))),
  p(anchor({ geom: 'roundRect', adj: '<a:gd name="adj" fmla="val 30000"/>', ln: '<a:ln w="38100"><a:solidFill><a:srgbClr val="00B050"/></a:solidFill><a:prstDash val="sysDot"/></a:ln>', fx: '<a:glow rad="63500"><a:srgbClr val="FFC000"><a:alpha val="60000"/></a:srgbClr></a:glow>' }, { x: 2600000 }) + r(lorem(120, 8))),
  // giro + corte, espelho + corte com contorno duplo
  para(inline({ xfrm: ' rot="1800000"', src: '<a:srcRect l="10000"/>' }), 9),
  para(inline({ xfrm: ' flipH="1"', src: '<a:srcRect t="8000" b="5000"/>', ln: '<a:ln w="19050" cmpd="dbl"><a:solidFill><a:srgbClr val="1F3864"/></a:solidFill></a:ln>' }), 10),
  // ajustes do a:blip
  para(inline({ blipFx: '<a:alphaModFix amt="50000"/>' }), 11),
  para(inline({ blipFx: '<a:duotone><a:prstClr val="black"/><a:schemeClr val="accent1"><a:tint val="45000"/><a:satMod val="400000"/></a:schemeClr></a:duotone>' }), 12),
  para(inline({ blipFx: '<a:clrChange><a:clrFrom><a:srgbClr val="28A03C"/></a:clrFrom><a:clrTo><a:srgbClr val="28A03C"><a:alpha val="0"/></a:srgbClr></a:clrTo></a:clrChange>' }), 13),
  para(inline({ geom: 'snip2DiagRect', blipFx: '<a:grayscl/><a:lum bright="20000" contrast="-20000"/>' }), 14),
  // chanfro (câmera de frente): cruz com a luz explícita; círculo padrão numa elipse com
  // bordas suaves; com câmera girada o chanfro não é desenhado (só o bitmap)
  para(inline({ d3: '<a:scene3d><a:camera prst="orthographicFront"/><a:lightRig rig="threePt" dir="t"/></a:scene3d><a:sp3d><a:bevelT w="76200" h="76200" prst="cross"/></a:sp3d>' }), 17),
  para(inline({ geom: 'ellipse', fx: '<a:softEdge rad="31750"/>', d3: '<a:sp3d><a:bevelT/></a:sp3d>' }), 18),
  para(inline({ d3: '<a:scene3d><a:camera prst="perspectiveFront"><a:rot lat="0" lon="1200000" rev="0"/></a:camera><a:lightRig rig="threePt" dir="t"/></a:scene3d><a:sp3d><a:bevelT prst="circle"/></a:sp3d>' }), 19),
  // oculta: a flutuante some (nem afasta o texto); a em linha continua
  p(anchor({ fx: `<a:outerShdw blurRad="50800" dist="38100" dir="2700000">${black(40000)}</a:outerShdw>` }, { hidden: true }) + r(lorem(60, 15))),
  para(inline({ fx: '<a:glow rad="63500"><a:schemeClr val="accent6"/></a:glow>' }, [63500, 63500, 63500, 63500], true), 16),
].join('');

const docx = buildDocx({
  body,
  defaults: docDefaults({ font: 'Arial', size: 11 }),
  media: { 'image1.png': patternPng() },
  extraParts: { 'word/theme/theme1.xml': strToU8(theme) },
});
const out = join(root, 'dotnet', 'tests', 'fixtures', 'input', 'pictures.docx');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, docx);
console.log(`input/pictures.docx (${docx.length} bytes, ${id - 10} imagens)`);
