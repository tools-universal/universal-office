// Gera dotnet/tests/fixtures/input/texteffects.docx — entrada SINTÉTICA de paridade
// JS × .NET dos Efeitos de Texto e Tipografia (w14 no w:rPr; motor docx-layout + PDF):
// brilho, sombra externa (simples e em perspectiva), reflexo, contorno (sólido, tracejado,
// sem preenchimento do texto), preenchimento em degradê (linear e "do centro"), sólido com
// lumMod/alfa, texto sem preenchimento (invisível), efeitos do ESTILO de caractere somados aos
// diretos (cada w14 é uma propriedade da cascata) e a tipografia OpenType (números estilo
// antigo e tabulares, conjunto estilístico, alternativas contextuais, ligaduras).
// O XML é o que o Word grava (write/tools/home-lab exp-effects.ps1, results/effects); o texto
// usa Arial por NOME (nenhuma fonte embutida — CLAUDE.md).
//
// Usado por tools/gen-parity-layout.mjs (expected/layout-input/texteffects.layout.json) e
// tools/gen-parity-pdf.mjs (expected/texteffects.docx.pdf.meta.json).
// Regenerável: `node tools/gen-parity-texteffects.mjs` (os bytes do zip mudam com a data).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { buildDocx, docDefaults, p, r, sz } = await import(new URL('../write/tools/layout-oracle/docx-builder.mjs', import.meta.url).href);
const { strToU8 } = await import(new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);

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

const scheme = (v, mods = '') => (mods ? `<w14:schemeClr w14:val="${v}">${mods}</w14:schemeClr>` : `<w14:schemeClr w14:val="${v}"/>`);
const rgb = (v, mods = '') => (mods ? `<w14:srgbClr w14:val="${v}">${mods}</w14:srgbClr>` : `<w14:srgbClr w14:val="${v}"/>`);
const alpha = (v) => `<w14:alpha w14:val="${v}"/>`;
const glow = (rad, clr) => `<w14:glow w14:rad="${rad}">${clr}</w14:glow>`;
const shadow = (a, clr) => `<w14:shadow w14:blurRad="${a.blur}" w14:dist="${a.dist}" w14:dir="${a.dir}" w14:sx="${a.sx ?? 100000}" w14:sy="${a.sy ?? 100000}" w14:kx="${a.kx ?? 0}" w14:ky="0" w14:algn="${a.algn ?? 'tl'}">${clr}</w14:shadow>`;
const reflection = (a) => `<w14:reflection w14:blurRad="${a.blur}" w14:stA="${a.stA}" w14:stPos="0" w14:endA="${a.endA}" w14:endPos="${a.endPos}" w14:dist="${a.dist}" w14:dir="5400000" w14:fadeDir="5400000" w14:sx="100000" w14:sy="-100000" w14:kx="0" w14:ky="0" w14:algn="bl"/>`;
const outline = (w, fill, dash = 'solid') => `<w14:textOutline w14:w="${w}" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">${fill}<w14:prstDash w14:val="${dash}"/><w14:round/></w14:textOutline>`;
const solid = (clr) => `<w14:solidFill>${clr}</w14:solidFill>`;
const textFill = (f) => `<w14:textFill>${f}</w14:textFill>`;
const grad = (stops, tail) => `<w14:gradFill><w14:gsLst>${stops.map(([pos, clr]) => `<w14:gs w14:pos="${pos}">${clr}</w14:gs>`).join('')}</w14:gsLst>${tail}</w14:gradFill>`;

const big = sz(28);
const run = (text, fx = '', extra = '') => r(text, `${extra}${big}${fx}`);
const body = [
  p(r('Efeitos de Texto e Tipografia — paridade JS × .NET')),
  // brilho, sombra (simples e em perspectiva), reflexo
  p(run('Brilho', glow(101600, scheme('accent1', alpha(60000)))) + run(' Sombra', shadow({ blur: 50800, dist: 38100, dir: 2700000 }, rgb('000000', alpha(60000))))),
  p(run('Perspectiva', shadow({ blur: 76200, dist: 12700, dir: 5400000, sy: 23000, kx: -1200000, algn: 'bl' }, rgb('000000', alpha(80000)))) + run(' Reflexo', reflection({ blur: 6350, stA: 55000, endA: 300, endPos: 45500, dist: 0 }))),
  // contorno sólido com o texto branco; tracejado sem preenchimento do texto
  p(run('Contorno', outline(12700, solid(scheme('accent2'))) + textFill(solid(scheme('bg1')))) + run(' Tracejado', outline(9525, solid(rgb('C00000')), 'sysDash') + textFill('<w14:noFill/>'))),
  // degradê linear (escalado) e "do centro"
  p(run('Linear', textFill(grad([[0, scheme('accent1', '<w14:lumMod w14:val="50000"/>')], [100000, scheme('accent1')]], '<w14:lin w14:ang="5400000" w14:scaled="0"/>')))
    + run(' Centro', textFill(grad([[0, rgb('FFC000')], [50000, rgb('ED7D31')], [100000, rgb('C00000', alpha(20000))]], '<w14:path w14:path="circle"><w14:fillToRect w14:l="50000" w14:t="50000" w14:r="50000" w14:b="50000"/></w14:path>')))),
  // sólido com modificadores (lumMod/lumOff) e semitransparente; texto invisível (sem preenchimento, sem contorno)
  p(run('Tema', textFill(solid(scheme('accent1', '<w14:lumMod w14:val="75000"/>')))) + run(' Meio', textFill(solid(rgb('2F5597', alpha(50000))))) + run(' oculto', textFill('<w14:noFill/>')) + run(' fim')),
  // estilo de caractere com brilho + sombra direta: os dois
  p(r('Estilo e direto', `<w:rStyle w:val="EfeitoBrilho"/>${big}${shadow({ blur: 38100, dist: 19050, dir: 2700000 }, scheme('tx1', alpha(60000)))}`)),
  // tipografia OpenType
  p(run('0123456789 antigos', '<w14:numForm w14:val="oldStyle"/>') + run(' 1111 tabulares', '<w14:numSpacing w14:val="tabular"/>')),
  p(run('ag Rag ss01', '<w14:stylisticSets><w14:styleSet w14:id="1"/></w14:stylisticSets>') + run(' calt office', '<w14:ligatures w14:val="standard"/><w14:cntxtAlts/>')),
].join('');

const styles = `<w:style w:type="character" w:customStyle="1" w:styleId="EfeitoBrilho"><w:name w:val="Efeito Brilho"/><w:rPr>${glow(63500, scheme('accent6', alpha(40000)))}</w:rPr></w:style>`;

const docx = buildDocx({
  body,
  styles,
  defaults: docDefaults({ font: 'Arial', size: 11 }),
  extraParts: { 'word/theme/theme1.xml': strToU8(theme) },
});
const out = join(root, 'dotnet', 'tests', 'fixtures', 'input', 'texteffects.docx');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, docx);
console.log(`input/texteffects.docx (${docx.length} bytes)`);
