// Gera dotnet/tests/fixtures/input/textboxes.docx — entrada SINTÉTICA de paridade
// JS × .NET das caixas de texto (motor docx-layout): cadeia de 3 caixas vinculadas
// (wps:txbx id + wps:linkedTxbx, parágrafo partido com recuo da 1ª linha e espaço
// antes), texto vertical (vert, vert270 centralizado, mongolianVert, eaVert com ajuste
// automático), caixa e forma ocultas (docPr hidden, com quebra quadrada), preenchimentos
// de padrão (a:pattFill), imagem esticada e em mosaico (a:blipFill + a:tile, alfa,
// alinhamento ctr), Estilos de Forma (fillRef 3 + effectRef 3 + fontRef lt1; fillRef 1
// escuro com fontRef dk1; bgFillStyle 1003 com padrão do tema), degradê "Do Centro"
// (a:path rect), formas predefinidas com texto (roundRect com ajuste, ellipse,
// wedgeRectCallout, hexagon) e Efeitos de Forma (brilho sem preenchimento, bordas suaves,
// sombra interna, reflexo, sombra com perspectiva girada) — página 1; na 2: caixa EM LINHA vertical com padrão,
// grupo em linha com uma cadeia vinculada e uma caixa vertical, e caixas VML
// (mso-next-textbox, layout-flow vertical, v-text-anchor).
// A imagem é gerada aqui (xadrez 24 × 16, sem direitos de terceiros); o texto usa Arial
// por NOME (nenhuma fonte embutida — CLAUDE.md).
//
// Usado por tools/gen-parity-layout.mjs (dump expected/layout-input/textboxes.layout.json).
// Regenerável: `node tools/gen-parity-textboxes.mjs` (os bytes do zip mudam com a data;
// o conteúdo não).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { buildDocx, docDefaults, lorem, p, r } = await import(new URL('../write/tools/layout-oracle/docx-builder.mjs', import.meta.url).href);
const { tbx } = await import(new URL('../write/tools/layout-oracle/cases/_tbx.mjs', import.meta.url).href);
const { png } = await import(new URL('../write/tools/image-lab/test-image.mjs', import.meta.url).href);
const { strToU8 } = await import(new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);

const E = (pt) => Math.round(pt * 12700);
const sc = (val, mods = '') => `<a:schemeClr val="${val}">${mods}</a:schemeClr>`;
const ph = (mods = '') => sc('phClr', mods);

// tema com Estilos de Forma: preenchimentos sólido/degradê, fundos sólido/claro/padrão,
// efeito 3 = sombra externa na cor da referência
const theme = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T"><a:themeElements>'
  + '<a:clrScheme name="C"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'
  + '<a:dk2><a:srgbClr val="1F2A44"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1>'
  + '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>'
  + '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink>'
  + '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>'
  + '<a:fontScheme name="F"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
  + '<a:fmtScheme name="S"><a:fillStyleLst>'
  + `<a:solidFill>${ph()}</a:solidFill>`
  + `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${ph('<a:tint val="60000"/><a:satMod val="110000"/>')}</a:gs><a:gs pos="100000">${ph('<a:tint val="85000"/>')}</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`
  + `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${ph('<a:tint val="95000"/><a:lumMod val="102000"/>')}</a:gs><a:gs pos="50000">${ph('<a:shade val="100000"/>')}</a:gs><a:gs pos="100000">${ph('<a:shade val="75000"/><a:satMod val="120000"/>')}</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`
  + '</a:fillStyleLst>'
  + `<a:lnStyleLst><a:ln w="6350"><a:solidFill>${ph()}</a:solidFill></a:ln><a:ln w="12700"><a:solidFill>${ph()}</a:solidFill></a:ln><a:ln w="19050"><a:solidFill>${ph()}</a:solidFill></a:ln></a:lnStyleLst>`
  + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>'
  + `<a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="25400" dir="5400000" algn="ctr" rotWithShape="0">${ph('<a:shade val="40000"/><a:alpha val="60000"/>')}</a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>`
  + `<a:bgFillStyleLst><a:solidFill>${ph()}</a:solidFill><a:solidFill>${ph('<a:tint val="90000"/>')}</a:solidFill>`
  + `<a:pattFill prst="smGrid"><a:fgClr>${ph()}</a:fgClr><a:bgClr>${ph('<a:tint val="20000"/>')}</a:bgClr></a:pattFill></a:bgFillStyleLst></a:fmtScheme>`
  + '</a:themeElements></a:theme>';

// imagem do preenchimento: xadrez 24 × 16 (4 px) em duas cores
const image = png(24, 16, 3, (x, y) => (((x >> 2) + (y >> 2)) & 1 ? [40, 120, 200] : [250, 220, 90]));

const txt = (n, seed, rPr = '') => p(r(lorem(n, seed), rPr));
const noLine = '<a:ln><a:noFill/></a:ln>';
const style = (ln, fill, eff, font) => `<wps:style><a:lnRef idx="${ln[0]}">${ln[1]}</a:lnRef><a:fillRef idx="${fill[0]}">${fill[1]}</a:fillRef><a:effectRef idx="${eff[0]}">${eff[1]}</a:effectRef><a:fontRef idx="minor">${font}</a:fontRef></wps:style>`;

let i = 0;
const box = (o) => tbx({ i: ++i, ...o });

// forma (sem texto) flutuante, relativa à página
const shape = ({ x, y, w, h, fill, hidden = false, wrap = 'wrapSquare' }) => {
  i++;
  const wrapXml = wrap === 'wrapSquare' ? '<wp:wrapSquare wrapText="bothSides"/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + i * 1024}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
    + `<wp:positionH relativeFrom="page"><wp:posOffset>${E(x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${E(y)}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapXml}<wp:docPr id="${100 + i}" name="Forma ${i}"${hidden ? ' hidden="1"' : ''}/><wp:cNvGraphicFramePr/>`
    + '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/>'
    + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}<a:ln w="12700"><a:solidFill><a:srgbClr val="333333"/></a:solidFill></a:ln></wps:spPr>`
    + '<wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
};

// ───────── página 1: caixas flutuantes relativas à página ─────────
const chainContent = p(r(lorem(45, 1)), '<w:ind w:firstLine="360"/>')
  + p(r(lorem(30, 2)), '<w:spacing w:before="120"/>')
  + p(r(lorem(25, 3), '<w:b/>'));
const floats = [
  // cadeia vinculada: o conteúdo da 1ª flui pelas outras duas (larguras e margens diferentes)
  box({ x: 60, y: 90, w: 150, h: 70, id: 1, content: chainContent }),
  box({ x: 225, y: 90, w: 120, h: 62, link: { id: 1, seq: 1 }, ins: [10, 6, 4, 2] }),
  box({ x: 360, y: 90, w: 175, h: 60, link: { id: 1, seq: 2 } }),
  // texto vertical
  box({ x: 60, y: 185, w: 64, h: 150, vert: 'vert', content: txt(14, 4) }),
  box({ x: 140, y: 185, w: 64, h: 150, vert: 'vert270', anchor: 'ctr', content: txt(10, 5) }),
  box({ x: 220, y: 185, w: 70, h: 150, vert: 'mongolianVert', content: txt(16, 6) + txt(6, 7) }),
  box({ x: 305, y: 185, w: 40, h: 150, vert: 'eaVert', autofit: true, ins: [5, 4, 3, 6], content: txt(12, 8) }),
  // oculta (com quebra quadrada: não afasta o texto do corpo) e forma oculta
  box({ x: 380, y: 75, w: 150, h: 60, hidden: true, wrap: 'wrapSquare', content: txt(8, 9) }),
  shape({ x: 380, y: 140, w: 150, h: 40, fill: '<a:solidFill><a:srgbClr val="C00000"/></a:solidFill>', hidden: true }),
  // preenchimentos: padrão, imagem esticada, mosaico (alfa) e mosaico centralizado
  box({ x: 60, y: 360, w: 110, h: 60, fill: `<a:pattFill prst="dkDnDiag"><a:fgClr>${sc('accent2')}</a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr></a:pattFill>`, content: txt(8, 10) }),
  box({ x: 180, y: 360, w: 110, h: 60, fill: '<a:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></a:blipFill>', content: txt(8, 11) }),
  box({ x: 300, y: 360, w: 110, h: 60, fill: '<a:blipFill><a:blip r:embed="rIdImg1"><a:alphaModFix amt="60000"/></a:blip><a:tile tx="25400" ty="12700" sx="50000" sy="50000" flip="none" algn="tl"/></a:blipFill>', content: txt(8, 12) }),
  box({ x: 420, y: 360, w: 110, h: 60, fill: '<a:blipFill><a:blip r:embed="rIdImg1"/><a:tile tx="0" ty="0" sx="100000" sy="100000" flip="none" algn="ctr"/></a:blipFill>', content: txt(8, 13) }),
  // Estilos de Forma: fillRef 3 (degradê do tema) + effectRef 3 + fontRef lt1 (texto branco)
  box({ x: 60, y: 440, w: 110, h: 60, fill: '', line: '<a:ln/>', style: style([2, sc('accent1', '<a:shade val="50000"/>')], [3, sc('accent1')], [3, sc('accent1')], sc('lt1')), content: txt(8, 14) }),
  // fillRef 1 escuro (sólido) com fontRef dk1: a cor do fontRef manda (sem clarear)
  box({ x: 180, y: 440, w: 110, h: 60, fill: '', line: noLine, style: style([0, sc('accent1')], [1, sc('dk2')], [0, sc('accent1')], sc('dk1')), content: txt(8, 15) }),
  // fillRef 1003: o padrão do bgFillStyleLst com a cor da referência
  box({ x: 300, y: 440, w: 110, h: 60, fill: '', line: noLine, style: style([0, sc('accent3')], [1003, sc('accent3')], [0, sc('accent3')], sc('dk1')), content: txt(8, 16) }),
  // degradê "Do Centro" (a:path rect): escuro, mas não clareia o texto
  box({ x: 420, y: 440, w: 110, h: 60, fill: `<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0">${sc('accent1', '<a:shade val="50000"/>')}</a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst><a:path path="rect"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path><a:tileRect/></a:gradFill>`, content: txt(8, 17) }),
  // formas predefinidas com texto: o texto vai no txRect da definição oficial
  box({ x: 60, y: 520, w: 110, h: 70, prst: 'roundRect', content: txt(10, 18) }).replace('<a:prstGeom prst="roundRect"><a:avLst/>', '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 32000"/></a:avLst>'),
  box({ x: 180, y: 520, w: 110, h: 80, prst: 'ellipse', content: txt(10, 19) }),
  box({ x: 300, y: 520, w: 110, h: 70, prst: 'wedgeRectCallout', content: txt(10, 20) }),
  box({ x: 420, y: 520, w: 110, h: 70, prst: 'hexagon', content: txt(10, 21) }),
  // Efeitos de Forma (a:effectLst → ShapeItem.fx): brilho numa caixa SEM preenchimento (a
  // silhueta é o anel do contorno) com uma sombra externa simples (com outro efeito vai para o
  // fx), bordas suaves, sombra interna, reflexo e sombra com perspectiva (sx/sy/kx) numa caixa
  // girada com rotWithShape="0"
  box({ x: 60, y: 625, w: 85, h: 50, line: '<a:ln w="19050"><a:solidFill><a:srgbClr val="C00000"/></a:solidFill></a:ln>'
    + `<a:effectLst><a:glow rad="101600">${sc('accent6', '<a:alpha val="60000"/>')}</a:glow><a:outerShdw blurRad="50800" dist="38100" dir="2700000" algn="tl" rotWithShape="0"><a:prstClr val="black"><a:alpha val="40000"/></a:prstClr></a:outerShdw></a:effectLst>`, content: txt(6, 40) }),
  box({ x: 165, y: 625, w: 85, h: 50, fill: `<a:solidFill>${sc('accent1', '<a:lumMod val="75000"/>')}</a:solidFill>`, line: `${noLine}<a:effectLst><a:softEdge rad="63500"/></a:effectLst>`, content: txt(6, 41, '<w:color w:val="FFFFFF"/>') }),
  box({ x: 270, y: 625, w: 85, h: 50, fill: '<a:solidFill><a:srgbClr val="FFF2CC"/></a:solidFill>', line: '<a:ln w="9525"><a:solidFill><a:srgbClr val="7F6000"/></a:solidFill></a:ln>'
    + '<a:effectLst><a:innerShdw blurRad="63500" dist="50800" dir="13500000"><a:prstClr val="black"><a:alpha val="50000"/></a:prstClr></a:innerShdw></a:effectLst>', content: txt(6, 42) }),
  box({ x: 375, y: 625, w: 85, h: 50, fill: '<a:solidFill><a:srgbClr val="5B9BD5"/></a:solidFill>', line: noLine
    + '<a:effectLst><a:reflection blurRad="6350" stA="52000" endA="300" endPos="35000" dist="12700" dir="5400000" sy="-100000" algn="bl" rotWithShape="0"/></a:effectLst>', content: txt(6, 43) }),
  box({ x: 480, y: 625, w: 85, h: 50, fill: '<a:solidFill><a:srgbClr val="E2F0D9"/></a:solidFill>',
    line: '<a:ln w="9525"><a:solidFill><a:srgbClr val="385723"/></a:solidFill></a:ln>'
    + '<a:effectLst><a:outerShdw blurRad="76200" dist="12700" dir="18900000" sy="23000" kx="-1200000" algn="bl" rotWithShape="0"><a:prstClr val="black"><a:alpha val="20000"/></a:prstClr></a:outerShdw></a:effectLst>', content: txt(6, 44) })
    .replace('<a:xfrm>', '<a:xfrm rot="600000">'),
].join('');

// ───────── página 2: em linha, grupo e VML ─────────
const WPG = 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup';
const bodyPr = (vert = 'horz') => `<wps:bodyPr rot="0" vert="${vert}" wrap="square" lIns="45720" tIns="45720" rIns="45720" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr>`;
const gsp = (id, x, y, w, h, spFill, story, vert, sty = '') => `<wps:wsp><wps:cNvPr id="${id}" name="g${id}"/><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${spFill}</wps:spPr>${sty}${story}${bodyPr(vert)}</wps:wsp>`;
const content = (xml, id) => `<wps:txbx${id !== undefined ? ` id="${id}"` : ''}><w:txbxContent>${xml}</w:txbxContent></wps:txbx>`;
const group = (w, h, kids) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="300" name="grupo"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${WPG}"><wpg:wgp xmlns:wpg="${WPG}"><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/><a:chOff x="0" y="0"/><a:chExt cx="${E(w)}" cy="${E(h)}"/></a:xfrm></wpg:grpSpPr>${kids}</wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const inlineTb = (w, h, spFill, story, vert) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="301" name="caixa em linha"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${gsp(302, 0, 0, w, h, spFill, story, vert)}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const solid = (hex) => `<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="404040"/></a:solidFill></a:ln>`;

const inlineRun = inlineTb(70, 120, `<a:pattFill prst="pct20"><a:fgClr><a:srgbClr val="2E75B6"/></a:fgClr><a:bgClr>${sc('lt2')}</a:bgClr></a:pattFill><a:ln w="9525"><a:solidFill><a:srgbClr val="404040"/></a:solidFill></a:ln>`, content(p(r(lorem(12, 22)))), 'vert270');
const groupRun = group(300, 130,
  gsp(310, 0, 0, 140, 60, solid('DDEEFF'), content(p(r(lorem(40, 23))), 7), 'horz')
  + gsp(311, 0, 70, 140, 60, solid('FFF2CC'), '<wps:linkedTxbx id="7" seq="1"/>', 'horz')
  + gsp(312, 160, 0, 60, 130, solid('203864'), content(p(r(lorem(10, 24)))), 'vert')
  + gsp(313, 230, 0, 70, 130, '<a:ln><a:noFill/></a:ln>', content(p(r(lorem(10, 25)))), 'horz', style([0, sc('accent1')], [2, sc('accent6')], [3, sc('accent6')], sc('lt1'))));

// VML: cadeia mso-next-textbox (a seguinte vem antes, como o Word grava) e texto vertical
const vml = (id, x, y, w, h, tbStyle, inner, extra = '') => `<w:r><w:pict><v:shape id="${id}" type="#_x0000_t202" style="position:absolute;margin-left:${x}pt;margin-top:${y}pt;width:${w}pt;height:${h}pt;z-index:${251660000 + x};mso-position-horizontal-relative:page;mso-position-vertical-relative:page${extra}" fillcolor="#f2f2f2" strokecolor="#7f7f7f"><v:textbox${tbStyle ? ` style="${tbStyle}"` : ''}>${inner}</v:textbox></v:shape></w:pict></w:r>`;
const vmlRuns = vml('_x0000_s2002', 330, 420, 160, 60, '', '<w:txbxContent/>')
  + vml('_x0000_s2001', 90, 420, 200, 60, 'mso-next-textbox:#_x0000_s2002', `<w:txbxContent>${p(r(lorem(70, 26)))}</w:txbxContent>`)
  + vml('_x0000_s2003', 90, 520, 70, 140, 'layout-flow:vertical;mso-layout-flow-alt:bottom-to-top', `<w:txbxContent>${p(r(lorem(12, 27)))}</w:txbxContent>`, ';v-text-anchor:middle')
  + vml('_x0000_s2004', 180, 520, 70, 140, 'layout-flow:vertical', `<w:txbxContent>${p(r(lorem(12, 28)))}</w:txbxContent>`, ';v-text-anchor:bottom');

const body = [
  p(r('Caixas de texto — paridade JS × .NET') + floats),
  // corpo sob a caixa oculta com quebra quadrada (não afasta o texto)
  txt(120, 30),
  txt(60, 31),
  p('<w:r><w:br w:type="page"/></w:r>'),
  p(r('Em linha: ') + inlineRun + r(' e grupo: ') + groupRun + r(' fim.')),
  p(r(lorem(20, 32)) + vmlRuns),
  txt(40, 33),
].join('');

const docx = buildDocx({
  body,
  defaults: docDefaults({ font: 'Arial', size: 11 }),
  media: { 'image1.png': image },
  extraParts: { 'word/theme/theme1.xml': strToU8(theme) },
});
const out = join(root, 'dotnet', 'tests', 'fixtures', 'input', 'textboxes.docx');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, docx);
console.log(`input/textboxes.docx (${docx.length} bytes, ${i} objetos flutuantes)`);
