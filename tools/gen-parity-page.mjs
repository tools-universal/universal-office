// Gera as entradas SINTÉTICAS de paridade JS × .NET da frente Página (motor
// docx-layout + PDF) em dotnet/tests/fixtures/input/:
//   page.docx         — 3 seções com marca-d'água no cabeçalho de cada uma (texto
//                       diagonal automático semitransparente; texto horizontal 72 pt
//                       opaco; imagem desbotada) e Cor da Página em gradiente
//                       (diagonal, −50%) com w:displayBackgroundShape;
//   page-pattern.docx — Cor da Página em padrão (Contorno de losango), sem exibir na tela;
//   page-frame.docx   — imagem esticada ("frame") de fundo, exibida;
//   page-tile.docx    — textura (imagem do usuário) de fundo, exibida.
// O XML é o MESMO que o editor grava (docx-core: watermarkRunXml, pageBackgroundXml,
// patternGif); a imagem é a pattern.png do lab de imagem (gerada, sem direitos de
// terceiros); o texto usa Arial/Calibri por NOME (nenhuma fonte embutida — CLAUDE.md).
//
// Usado por tools/gen-parity-layout.mjs (expected/layout-input/<nome>.layout.json) e
// tools/gen-parity-pdf.mjs (expected/page.docx.pdf.meta.json).
// Regenerável: `node tools/gen-parity-page.mjs` (dist do docx-core já buildado).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { buildDocx, docDefaults, lorem, p, r, sectPr } = await import(new URL('../write/tools/layout-oracle/docx-builder.mjs', import.meta.url).href);
const { patternPng } = await import(new URL('../write/tools/image-lab/test-image.mjs', import.meta.url).href);
const { unzipSync, zipSync, strFromU8, strToU8 } = await import(new URL('../sheet/node_modules/fflate/esm/index.mjs', import.meta.url).href);
const core = await import(new URL('../write/packages/docx-core/dist/index.js', import.meta.url).href);
const { PRESET_PATTERNS } = await import(new URL('../shared/drawingml/dist/index.js', import.meta.url).href);

const outDir = join(root, 'dotnet', 'tests', 'fixtures', 'input');
mkdirSync(outDir, { recursive: true });
const png = patternPng();
const rows = (prst) => PRESET_PATTERNS[prst].match(/../g).map((x) => parseInt(x, 16));
const hdr = (run) => `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr>${run}</w:p>`;
const body3 = (n) => Array.from({ length: n }, (_, i) => p(r(lorem(60, i + 1)))).join('');

/** Põe o w:background no document.xml (antes do w:body). */
function withBackground(docx, bgXml) {
  const files = unzipSync(docx);
  const doc = strFromU8(files['word/document.xml']).replace('<w:body>', `${bgXml}<w:body>`);
  files['word/document.xml'] = strToU8(doc);
  // o construtor do lab só declara png/jpeg: o GIF do padrão precisa do tipo de conteúdo
  const ct = strFromU8(files['[Content_Types].xml']);
  if (Object.keys(files).some((f) => f.endsWith('.gif')) && !ct.includes('Extension="gif"')) files['[Content_Types].xml'] = strToU8(ct.replace('<Default Extension="png"', '<Default Extension="gif" ContentType="image/gif"/><Default Extension="png"'));
  return zipSync(files, { level: 6 });
}

// ── page.docx: três seções, uma marca em cada ──
const wmText = core.watermarkRunXml(
  { kind: 'text', text: 'CONFIDENCIAL', font: 'Calibri', color: 'C0C0C0', semitransparent: true, layout: 'diagonal' },
  core.autoTextBox('CONFIDENCIAL', 'diagonal', 425.2), { n: 101, spid: 1025, anchorId: '0A0B0C01' }, undefined, core.vmlColorAttr);
const wmBig = core.watermarkRunXml(
  { kind: 'text', text: 'RASCUNHO', font: 'Arial', sizePt: 72, color: 'C00000', semitransparent: false, layout: 'horizontal' },
  { widthPt: 371, heightPt: 80 }, { n: 102, spid: 1026, anchorId: '0A0B0C02' }, undefined, core.vmlColorAttr);
const wmPic = core.watermarkRunXml(
  { kind: 'picture', data: png, ext: 'png', title: 'pattern', washout: true },
  core.pictureBox({ w: 360, h: 270 }, undefined, 425.2), { n: 103, spid: 1027, anchorId: '0A0B0C03' }, 'rIdImg1');
const sect = (hdrRid) => sectPr().replace('<w:sectPr>', `<w:sectPr><w:headerReference w:type="default" r:id="${hdrRid}"/>`);
// parágrafos que encerram as seções 1 e 2 (o sectPr no pPr)
const endSec = (rid) => `<w:p><w:pPr>${sect(rid)}</w:pPr></w:p>`;
let docx = buildDocx({
  body: body3(3) + endSec('rId_header_s1') + body3(2) + endSec('rId_header_s2') + body3(2),
  sect: sect('rId_header_s3'),
  defaults: docDefaults({ font: 'Arial', size: 11, after: 160, line: 259 }),
  headers: { s1: hdr(wmText), s2: hdr(wmBig), s3: hdr(wmPic) },
  media: { 'pattern.png': png },
  settings: '<w:displayBackgroundShape/>',
});
docx = withBackground(docx, core.pageBackgroundXml({ color: '1F4E79', fill: { type: 'gradient', color: '1F4E79', color2: '#fff2cc', angle: -135, focus: -50 } }));
writeFileSync(join(outDir, 'page.docx'), docx);

// ── page-pattern.docx ──
const gif = core.patternGif(rows('openDmnd'));
let pat = buildDocx({ body: body3(2), defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'image1.gif': gif } });
pat = withBackground(pat, core.pageBackgroundXml({ color: 'C80000', fill: { type: 'pattern', color: 'C80000', color2: '#ffffc8', title: 'Contorno de losango' } }, 'rIdImg1'));
writeFileSync(join(outDir, 'page-pattern.docx'), pat);

// ── page-frame.docx / page-tile.docx ──
for (const [name, type] of [['page-frame', 'frame'], ['page-tile', 'tile']]) {
  let d = buildDocx({ body: body3(2), defaults: docDefaults({ font: 'Arial', size: 11 }), media: { 'pattern.png': png }, settings: '<w:displayBackgroundShape/>' });
  d = withBackground(d, core.pageBackgroundXml({ fill: { type, title: 'pattern' } }, 'rIdImg1'));
  writeFileSync(join(outDir, `${name}.docx`), d);
}
console.log('input/page*.docx gerados');
